import { and, eq, gte, lte } from "drizzle-orm";
import { getLocalDate } from "./timezone.js";

import { db } from "../../db/index.js";
import { activities, habits, userHabits, users } from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";
import { aggregateActivities, evaluateCompletion } from "./completion.js";
import { calculateConsistency } from "./consistency.js";
import { buildHeatmapData } from "./heatmap.js";
import { generateExpectedOccurrences } from "./schedule.js";
import { calculateStreaks } from "./streak.js";
import { listUserHabits } from "../habits/habit.service.js";

interface ProgressDateRange {
  from: string;
  to: string;
  today?: string;
}

// function formatDate(date: Date): string {
//   return date.toISOString().slice(0, 10);
// }

function getActivityValue(
  activity: typeof activities.$inferSelect,
  targetType: "COUNT" | "DURATION" | "QUANTITY",
  targetUnit: string,
): number {
  if (targetType === "DURATION") {
    const durationSeconds = activity.durationSeconds ?? 0;

    if (targetUnit === "seconds") {
      return durationSeconds;
    }

    if (targetUnit === "minutes") {
      return durationSeconds / 60;
    }

    throw new Error(`Unsupported duration target unit: ${targetUnit}`);
  }

  return activity.value ? Number(activity.value) : 0;
}

export async function getHabitProgress(
  userId: string,
  habitId: string,
  range: ProgressDateRange,
) {
  const [result] = await db
    .select({
      userHabit: userHabits,
      habit: habits,
      timezone: users.timezone,
    })
    .from(userHabits)
    .innerJoin(habits, eq(userHabits.habitId, habits.id))
    .innerJoin(users, eq(userHabits.userId, users.id))
    .where(and(eq(userHabits.userId, userId), eq(userHabits.habitId, habitId)))
    .limit(1);

  if (!result) {
    throw new AppError(404, "HABIT_NOT_FOUND", "Habit not found");
  }

  const { userHabit, habit, timezone } = result;

  const startDate = getLocalDate(userHabit.startDate, timezone);

  const endDate = userHabit.archivedAt
    ? getLocalDate(userHabit.archivedAt, timezone)
    : undefined;

  const evaluationDate = range.today ?? getLocalDate(new Date(), timezone);

  const expectedOccurrences = generateExpectedOccurrences(
    { scheduleType: habit.scheduleType, scheduleConfig: habit.scheduleConfig },
    range.from,
    range.to,
    startDate,
    endDate,
    evaluationDate,
    timezone,
  );

  const activityRows = await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.userId, userId),
        eq(activities.userHabitId, userHabit.id),
        gte(activities.activityDate, range.from),
        lte(activities.activityDate, range.to),
      ),
    );

  const activitiesByDate = new Map<
    string,
    {
      date: string;
      actualValue: number;
    }[]
  >();

  for (const activity of activityRows) {
    const value = getActivityValue(
      activity,
      habit.targetType,
      habit.targetUnit,
    );

    const existing = activitiesByDate.get(activity.activityDate);

    if (existing) {
      existing.push({
        date: activity.activityDate,
        actualValue: value,
      });
    } else {
      activitiesByDate.set(activity.activityDate, [
        {
          date: activity.activityDate,
          actualValue: value,
        },
      ]);
    }
  }

  const occurrences = expectedOccurrences.map((occurrence) => {
    const activitiesForDate = activitiesByDate.get(occurrence.date) ?? [];

    const aggregate =
      activitiesForDate.length > 0
        ? aggregateActivities(activitiesForDate)
        : undefined;

    return evaluateCompletion(
      {
        targetType: habit.targetType,
        targetValue: Number(habit.targetValue),
        targetUnit: habit.targetUnit,
      },
      aggregate,
      occurrence.date,
      occurrence.state,
    );
  });

  const consistency = calculateConsistency(occurrences);
  const streaks = calculateStreaks(occurrences);
  const heatmap = buildHeatmapData(occurrences);

  return {
    habit: {
      id: habit.id,
      key: habit.key,
      name: habit.name,
      targetType: habit.targetType,
      targetValue: Number(habit.targetValue),
      targetUnit: habit.targetUnit,
      scheduleType: habit.scheduleType,
      scheduleConfig: habit.scheduleConfig,
    },
    range: {
      from: range.from,
      to: range.to,
      timezone,
    },
    consistency,
    streaks,
    occurrences,
    heatmap,
  };
}

export async function getOverallProgress(
  userId: string,
  range: ProgressDateRange,
) {
  const userHabits = await listUserHabits(userId);

  const progress = await Promise.all(
    userHabits
      .filter((userHabit) => userHabit.status === "ACTIVE")
      .map((userHabit) => getHabitProgress(userId, userHabit.habitId, range)),
  );

  const completed = progress.reduce(
    (total, habitProgress) => total + habitProgress.consistency.completed,
    0,
  );

  const expected = progress.reduce(
    (total, habitProgress) => total + habitProgress.consistency.expected,
    0,
  );

  const percentage = expected === 0 ? 0 : (completed / expected) * 100;

  return {
    range: progress[0]?.range ?? {
      from: range.from,
      to: range.to,
    },
    consistency: {
      completed,
      expected,
      percentage,
    },
    habits: progress,
  };
}
