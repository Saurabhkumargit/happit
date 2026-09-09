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