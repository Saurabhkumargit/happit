import { and, eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { activities, habits, userHabits } from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";

interface CreateActivityInput {
  userHabitId: string;
  activityDate: string;
  source: "TIMER" | "MANUAL";
  durationSeconds?: number;
  value?: number;
  unit?: "MINUTES" | "SECONDS" | "REPETITIONS" | "PAGES" | "LITERS";
  startedAt?: string;
  endedAt?: string;
}

export async function createActivity(
  userId: string,
  input: CreateActivityInput,
  idempotencyKey?: string,
) {
  if (idempotencyKey) {
    const [existingActivity] = await db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.userId, userId),
          eq(activities.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);

    if (existingActivity) {
      const existingStartedAt =
        existingActivity.startedAt?.toISOString() ?? undefined;

      const existingEndedAt =
        existingActivity.endedAt?.toISOString() ?? undefined;

      const sameRequest =
        existingActivity.userHabitId === input.userHabitId &&
        existingActivity.activityDate === input.activityDate &&
        existingActivity.source === input.source &&
        existingActivity.durationSeconds === (input.durationSeconds ?? null) &&
        existingActivity.value ===
          (input.value !== undefined ? input.value.toString() : null) &&
        existingActivity.unit === (input.unit ?? null) &&
        existingStartedAt === input.startedAt &&
        existingEndedAt === input.endedAt;

      if (!sameRequest) {
        throw new AppError(
          409,
          "IDEMPOTENCY_KEY_REUSED",
          "Idempotency key has already been used for a different request",
        );
      }

      return existingActivity;
    }
  }

  const [userHabit] = await db
    .select({
      userHabitId: userHabits.id,
      status: userHabits.status,
      habit: habits,
    })
    .from(userHabits)
    .innerJoin(habits, eq(userHabits.habitId, habits.id))
    .where(
      and(eq(userHabits.id, input.userHabitId), eq(userHabits.userId, userId)),
    )
    .limit(1);

  if (!userHabit) {
    throw new AppError(404, "HABIT_NOT_FOUND", "Habit not found");
  }

  if (userHabit.status !== "ACTIVE") {
    throw new AppError(
      400,
      "HABIT_NOT_ACTIVE",
      "Cannot record activity for an archived habit",
    );
  }

  const { habit } = userHabit;

  if (habit.targetType === "DURATION") {
    if (input.durationSeconds === undefined) {
      throw new AppError(
        400,
        "INVALID_ACTIVITY",
        "Duration is required for this habit",
      );
    }

    if (input.value !== undefined || input.unit !== undefined) {
      throw new AppError(
        400,
        "INVALID_ACTIVITY",
        "Duration activities must use durationSeconds",
      );
    }
  } else {
    if (input.value === undefined || input.unit === undefined) {
      throw new AppError(
        400,
        "INVALID_ACTIVITY",
        "Value and unit are required for this habit",
      );
    }

    if (input.durationSeconds !== undefined) {
      throw new AppError(
        400,
        "INVALID_ACTIVITY",
        "Non-duration activities cannot use durationSeconds",
      );
    }

    const expectedUnit = habit.targetUnit.trim().toLowerCase();

    const submittedUnit = input.unit.trim().toLowerCase();

    if (expectedUnit !== submittedUnit) {
      throw new AppError(
        400,
        "INVALID_ACTIVITY",
        "Activity unit does not match the habit target unit",
      );
    }
  }

  if (
    input.startedAt &&
    input.endedAt &&
    new Date(input.endedAt) <= new Date(input.startedAt)
  ) {
    throw new AppError(
      400,
      "INVALID_ACTIVITY",
      "Activity end time must be after start time",
    );
  }

  const [activity] = await db
    .insert(activities)
    .values({
      userId,
      userHabitId: input.userHabitId,
      source: input.source,
      activityDate: input.activityDate,
      durationSeconds: input.durationSeconds,
      value: input.value?.toString(),
      unit: input.unit,
      idempotencyKey,
      startedAt: input.startedAt ? new Date(input.startedAt) : null,
      endedAt: input.endedAt ? new Date(input.endedAt) : null,
    })
    .returning();

  return activity;
}
