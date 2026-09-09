import { and, eq, max } from "drizzle-orm";

import { db } from "../../db/index.js";
import { habits, userHabits } from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";

export async function listCatalogHabits() {
  return db
    .select()
    .from(habits)
    .where(eq(habits.status, "AVAILABLE"))
    .orderBy(habits.name);
}

export async function getCatalogHabitById(habitId: string) {
  const [habit] = await db
    .select()
    .from(habits)
    .where(
      and(
        eq(habits.id, habitId),
        eq(habits.status, "AVAILABLE"),
      ),
    )
    .limit(1);

  return habit ?? null;
}

export async function adoptHabit(userId: string, habitId: string) {
  const [habit] = await db
    .select()
    .from(habits)
    .where(
      and(
        eq(habits.id, habitId),
        eq(habits.status, "AVAILABLE"),
      ),
    )
    .limit(1);

  if (!habit) {
    throw new AppError(
      404,
      "HABIT_NOT_FOUND",
      "Habit not found",
    );
  }

  const [existingUserHabit] = await db
    .select({
      id: userHabits.id,
    })
    .from(userHabits)
    .where(
      and(
        eq(userHabits.userId, userId),
        eq(userHabits.habitId, habitId),
      ),
    )
    .limit(1);

  if (existingUserHabit) {
    throw new AppError(
      409,
      "HABIT_ALREADY_ADOPTED",
      "Habit has already been adopted",
    );
  }

  const [sortOrderResult] = await db
    .select({
      maxSortOrder: max(userHabits.sortOrder),
    })
    .from(userHabits)
    .where(eq(userHabits.userId, userId));

  const sortOrder = (sortOrderResult?.maxSortOrder ?? -1) + 1;

  const [userHabit] = await db
    .insert(userHabits)
    .values({
      userId,
      habitId,
      status: "ACTIVE",
      sortOrder,
      startDate: new Date(),
    })
    .returning();

  return {
    ...userHabit,
    habit,
  };
}

export async function listUserHabits(userId: string) {
  return db
    .select({
      id: userHabits.id,
      userId: userHabits.userId,
      habitId: userHabits.habitId,
      status: userHabits.status,
      startDate: userHabits.startDate,
      sortOrder: userHabits.sortOrder,
      createdAt: userHabits.createdAt,
      updatedAt: userHabits.updatedAt,
      archivedAt: userHabits.archivedAt,
      habit: habits,
    })
    .from(userHabits)
    .innerJoin(habits, eq(userHabits.habitId, habits.id))
    .where(eq(userHabits.userId, userId))
    .orderBy(userHabits.sortOrder);
}

export async function getUserHabitById(
  userId: string,
  habitId: string,
) {
  const [userHabit] = await db
    .select({
      id: userHabits.id,
      userId: userHabits.userId,
      habitId: userHabits.habitId,
      status: userHabits.status,
      startDate: userHabits.startDate,
      sortOrder: userHabits.sortOrder,
      createdAt: userHabits.createdAt,
      updatedAt: userHabits.updatedAt,
      archivedAt: userHabits.archivedAt,
      habit: habits,
    })
    .from(userHabits)
    .innerJoin(habits, eq(userHabits.habitId, habits.id))
    .where(
      and(
        eq(userHabits.userId, userId),
        eq(userHabits.habitId, habitId),
      ),
    )
    .limit(1);

  return userHabit ?? null;
}

export async function archiveUserHabit(
  userId: string,
  habitId: string,
) {
  const [userHabit] = await db
    .select()
    .from(userHabits)
    .where(
      and(
        eq(userHabits.userId, userId),
        eq(userHabits.habitId, habitId),
      ),
    )
    .limit(1);

  if (!userHabit) {
    throw new AppError(
      404,
      "HABIT_NOT_FOUND",
      "Habit not found",
    );
  }

  if (userHabit.status === "ARCHIVED") {
    throw new AppError(
      409,
      "HABIT_ALREADY_ARCHIVED",
      "Habit has already been archived",
    );
  }

  const now = new Date();

  const [updatedUserHabit] = await db
    .update(userHabits)
    .set({
      status: "ARCHIVED",
      archivedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(userHabits.userId, userId),
        eq(userHabits.habitId, habitId),
      ),
    )
    .returning();

  return updatedUserHabit;
}

export async function restoreUserHabit(
  userId: string,
  habitId: string,
) {
  const [userHabit] = await db
    .select()
    .from(userHabits)
    .where(
      and(
        eq(userHabits.userId, userId),
        eq(userHabits.habitId, habitId),
      ),
    )
    .limit(1);

  if (!userHabit) {
    throw new AppError(
      404,
      "HABIT_NOT_FOUND",
      "Habit not found",
    );
  }

  if (userHabit.status === "ACTIVE") {
    throw new AppError(
      409,
      "HABIT_ALREADY_ACTIVE",
      "Habit is already active",
    );
  }

  const now = new Date();

  const [updatedUserHabit] = await db
    .update(userHabits)
    .set({
      status: "ACTIVE",
      archivedAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(userHabits.userId, userId),
        eq(userHabits.habitId, habitId),
      ),
    )
    .returning();

  return updatedUserHabit;
}

export async function deleteUserHabit(
  userId: string,
  habitId: string,
) {
  const [userHabit] = await db
    .delete(userHabits)
    .where(
      and(
        eq(userHabits.userId, userId),
        eq(userHabits.habitId, habitId),
      ),
    )
    .returning();

  if (!userHabit) {
    throw new AppError(
      404,
      "HABIT_NOT_FOUND",
      "Habit not found",
    );
  }

  return userHabit;
}

export async function reorderUserHabits(
  userId: string,
  habitIds: string[],
) {
  return db.transaction(async (tx) => {
    const userHabitsToReorder = await tx
      .select({
        id: userHabits.id,
        habitId: userHabits.habitId,
        status: userHabits.status,
      })
      .from(userHabits)
      .where(eq(userHabits.userId, userId));

    const activeHabits = userHabitsToReorder.filter(
      (habit) => habit.status === "ACTIVE",
    );

    if (
      habitIds.length !== activeHabits.length ||
      habitIds.some(
        (habitId) =>
          !activeHabits.some(
            (habit) => habit.habitId === habitId,
          ),
      )
    ) {
      throw new AppError(
        400,
        "INVALID_HABIT_ORDER",
        "Habit order must contain exactly all active habits",
      );
    }

    const now = new Date();

    for (const [sortOrder, habitId] of habitIds.entries()) {
      await tx
        .update(userHabits)
        .set({
          sortOrder,
          updatedAt: now,
        })
        .where(
          and(
            eq(userHabits.userId, userId),
            eq(userHabits.habitId, habitId),
          ),
        );
    }

    return tx
      .select({
        id: userHabits.id,
        habitId: userHabits.habitId,
        status: userHabits.status,
        sortOrder: userHabits.sortOrder,
        archivedAt: userHabits.archivedAt,
      })
      .from(userHabits)
      .where(eq(userHabits.userId, userId))
      .orderBy(userHabits.sortOrder);
  });
}