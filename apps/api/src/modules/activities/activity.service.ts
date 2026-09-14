import { and, desc, eq, gte, lte } from "drizzle-orm";
import { DatabaseError } from "pg";

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

interface UpdateActivityInput {
  activityDate?: string;
  source?: "TIMER" | "MANUAL";
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

  try {
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
        startedAt: input.startedAt
          ? new Date(input.startedAt)
          : null,
        endedAt: input.endedAt
          ? new Date(input.endedAt)
          : null,
      })
      .returning();

    return activity;
  } catch (error) {
    if (
      idempotencyKey &&
      error instanceof DatabaseError &&
      error.code === "23505"
    ) {
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
          existingActivity.durationSeconds ===
            (input.durationSeconds ?? null) &&
          existingActivity.value ===
            (input.value !== undefined
              ? input.value.toString()
              : null) &&
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

    throw error;
  }
}

interface ActivityHistoryFilters {
  userHabitId?: string;
  from?: string;
  to?: string;
}

export async function listActivities(
  userId: string,
  filters: ActivityHistoryFilters,
) {
  const conditions = [eq(activities.userId, userId)];

  if (filters.userHabitId) {
    conditions.push(eq(activities.userHabitId, filters.userHabitId));
  }

  if (filters.from) {
    conditions.push(gte(activities.activityDate, filters.from));
  }

  if (filters.to) {
    conditions.push(lte(activities.activityDate, filters.to));
  }

  return db
    .select({
      id: activities.id,
      userId: activities.userId,
      userHabitId: activities.userHabitId,
      source: activities.source,
      activityDate: activities.activityDate,
      durationSeconds: activities.durationSeconds,
      value: activities.value,
      unit: activities.unit,
      idempotencyKey: activities.idempotencyKey,
      startedAt: activities.startedAt,
      endedAt: activities.endedAt,
      createdAt: activities.createdAt,
      updatedAt: activities.updatedAt,
      habit: {
        id: habits.id,
        key: habits.key,
        name: habits.name,
        description: habits.description,
        scheduleType: habits.scheduleType,
        scheduleConfig: habits.scheduleConfig,
        targetType: habits.targetType,
        targetValue: habits.targetValue,
        targetUnit: habits.targetUnit,
        status: habits.status,
      },
    })
    .from(activities)
    .innerJoin(userHabits, eq(activities.userHabitId, userHabits.id))
    .innerJoin(habits, eq(userHabits.habitId, habits.id))
    .where(and(...conditions))
    .orderBy(desc(activities.activityDate), desc(activities.createdAt));
}

export async function getActivityById(userId: string, activityId: string) {
  const [result] = await db
    .select({
      id: activities.id,
      userId: activities.userId,
      userHabitId: activities.userHabitId,
      source: activities.source,
      activityDate: activities.activityDate,
      durationSeconds: activities.durationSeconds,
      value: activities.value,
      unit: activities.unit,
      idempotencyKey: activities.idempotencyKey,
      startedAt: activities.startedAt,
      endedAt: activities.endedAt,
      createdAt: activities.createdAt,
      updatedAt: activities.updatedAt,
      habit: {
        id: habits.id,
        key: habits.key,
        name: habits.name,
        description: habits.description,
        scheduleType: habits.scheduleType,
        scheduleConfig: habits.scheduleConfig,
        targetType: habits.targetType,
        targetValue: habits.targetValue,
        targetUnit: habits.targetUnit,
        status: habits.status,
      },
    })
    .from(activities)
    .innerJoin(userHabits, eq(activities.userHabitId, userHabits.id))
    .innerJoin(habits, eq(userHabits.habitId, habits.id))
    .where(and(eq(activities.id, activityId), eq(activities.userId, userId)))
    .limit(1);

  if (!result) {
    throw new AppError(404, "ACTIVITY_NOT_FOUND", "Activity not found");
  }

  return result;
}

export async function updateActivity(
  userId: string,
  activityId: string,
  input: UpdateActivityInput,
) {
  const [existingActivity] = await db
    .select({
      activity: activities,
      userHabit: {
        id: userHabits.id,
        status: userHabits.status,
      },
      habit: habits,
    })
    .from(activities)
    .innerJoin(userHabits, eq(activities.userHabitId, userHabits.id))
    .innerJoin(habits, eq(userHabits.habitId, habits.id))
    .where(and(eq(activities.id, activityId), eq(activities.userId, userId)))
    .limit(1);

  if (!existingActivity) {
    throw new AppError(404, "ACTIVITY_NOT_FOUND", "Activity not found");
  }

  const current = existingActivity.activity;

  const activityDate = input.activityDate ?? current.activityDate;

  const source = input.source ?? current.source;

  const durationSeconds = input.durationSeconds ?? current.durationSeconds;

  const value =
    input.value !== undefined ? input.value.toString() : current.value;

  const unit = input.unit ?? current.unit;

  const startedAt =
    input.startedAt !== undefined
      ? new Date(input.startedAt)
      : current.startedAt;

  const endedAt =
    input.endedAt !== undefined ? new Date(input.endedAt) : current.endedAt;

  const { habit } = existingActivity;

  if (habit.targetType === "DURATION") {
    if (durationSeconds === null || durationSeconds === undefined) {
      throw new AppError(
        400,
        "INVALID_ACTIVITY",
        "Duration is required for this habit",
      );
    }

    if (value !== null || unit !== null) {
      throw new AppError(
        400,
        "INVALID_ACTIVITY",
        "Duration activities must use durationSeconds",
      );
    }
  } else {
    if (value === null || unit === null) {
      throw new AppError(
        400,
        "INVALID_ACTIVITY",
        "Value and unit are required for this habit",
      );
    }

    if (durationSeconds !== null) {
      throw new AppError(
        400,
        "INVALID_ACTIVITY",
        "Non-duration activities cannot use durationSeconds",
      );
    }

    const expectedUnit = habit.targetUnit.trim().toLowerCase();
    const submittedUnit = unit.trim().toLowerCase();

    if (expectedUnit !== submittedUnit) {
      throw new AppError(
        400,
        "INVALID_ACTIVITY",
        "Activity unit does not match the habit target unit",
      );
    }
  }

  if (startedAt && endedAt && endedAt <= startedAt) {
    throw new AppError(
      400,
      "INVALID_ACTIVITY",
      "Activity end time must be after start time",
    );
  }

  const [updatedActivity] = await db
    .update(activities)
    .set({
      activityDate,
      source,
      durationSeconds,
      value,
      unit,
      startedAt,
      endedAt,
      updatedAt: new Date(),
    })
    .where(and(eq(activities.id, activityId), eq(activities.userId, userId)))
    .returning();

  return updatedActivity;
}

export async function deleteActivity(userId: string, activityId: string) {
  const [deletedActivity] = await db
    .delete(activities)
    .where(and(eq(activities.id, activityId), eq(activities.userId, userId)))
    .returning({
      id: activities.id,
    });

  if (!deletedActivity) {
    throw new AppError(404, "ACTIVITY_NOT_FOUND", "Activity not found");
  }

  return deletedActivity;
}
