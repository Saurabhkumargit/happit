import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { habits } from "../../db/schema.js";
import { AppError } from "../../lib/AppError.js";
import type { HabitInput } from "./habit.validation.js";

export async function createHabit(
  userId: string,
  input: HabitInput,
) {
  return db.transaction(async (tx) => {
    const existingHabits = await tx
      .select({
        sortOrder: habits.sortOrder,
      })
      .from(habits)
      .where(
        and(
          eq(habits.userId, userId),
          eq(habits.status, "ACTIVE"),
        ),
      )
      .orderBy(asc(habits.sortOrder));

    const nextSortOrder =
      existingHabits.length === 0
        ? 0
        : existingHabits[existingHabits.length - 1]!.sortOrder + 1;

    const [habit] = await tx
      .insert(habits)
      .values({
        userId,
        name: input.name,
        description: input.description ?? null,
        scheduleType: input.scheduleType,
        scheduleConfig: input.scheduleConfig,
        targetType: input.targetType,
        targetValue: input.targetValue.toString(),
        targetUnit: input.targetUnit ?? null,
        startDate: input.startDate,
        status: "ACTIVE",
        sortOrder: nextSortOrder,
      })
      .returning();

    return habit;
  });
}

export async function listHabits(
  userId: string,
  status: "ACTIVE" | "ARCHIVED" | "ALL" = "ACTIVE",
) {
  if (status === "ALL") {
    return db
      .select()
      .from(habits)
      .where(eq(habits.userId, userId))
      .orderBy(asc(habits.sortOrder), desc(habits.createdAt));
  }

  if (status === "ARCHIVED") {
    return db
      .select()
      .from(habits)
      .where(
        and(
          eq(habits.userId, userId),
          eq(habits.status, "ARCHIVED"),
        ),
      )
      .orderBy(desc(habits.archivedAt));
  }

  return db
    .select()
    .from(habits)
    .where(
      and(
        eq(habits.userId, userId),
        eq(habits.status, "ACTIVE"),
      ),
    )
    .orderBy(asc(habits.sortOrder));
}

export async function listActiveHabits(userId: string) {
  return listHabits(userId, "ACTIVE");
}

export async function getHabit(
  userId: string,
  habitId: string,
) {
  const [habit] = await db
    .select()
    .from(habits)
    .where(
      and(
        eq(habits.id, habitId),
        eq(habits.userId, userId),
      ),
    )
    .limit(1);

  return habit ?? null;
}

export async function updateHabit(
  userId: string,
  habitId: string,
  input: HabitInput,
) {
  const existingHabit = await getHabit(userId, habitId);

  if (!existingHabit) {
    return null;
  }

  if (existingHabit.status === "ARCHIVED") {
    throw new AppError(
      400,
      "HABIT_ARCHIVED",
      "Cannot update an archived habit",
    );
  }

  const [habit] = await db
    .update(habits)
    .set({
      name: input.name,
      description: input.description ?? null,
      scheduleType: input.scheduleType,
      scheduleConfig: input.scheduleConfig,
      targetType: input.targetType,
      targetValue: input.targetValue.toString(),
      targetUnit: input.targetUnit ?? null,
      startDate: input.startDate,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(habits.id, habitId),
        eq(habits.userId, userId),
      ),
    )
    .returning();

  return habit ?? null;
}

export async function archiveHabit(
  userId: string,
  habitId: string,
) {
  const existingHabit = await getHabit(userId, habitId);

  if (!existingHabit) {
    return null;
  }

  // Idempotency: if already archived, return as-is without altering archivedAt
  if (existingHabit.status === "ARCHIVED") {
    return existingHabit;
  }

  const [habit] = await db
    .update(habits)
    .set({
      status: "ARCHIVED",
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(habits.id, habitId),
        eq(habits.userId, userId),
      ),
    )
    .returning();

  return habit ?? null;
}

export async function restoreHabit(
  userId: string,
  habitId: string,
) {
  const existingHabit = await getHabit(userId, habitId);

  if (!existingHabit) {
    return null;
  }

  // Idempotency: if already active, return as-is without assigning a new sortOrder
  if (existingHabit.status === "ACTIVE") {
    return existingHabit;
  }

  return db.transaction(async (tx) => {
    const activeHabits = await tx
      .select({
        sortOrder: habits.sortOrder,
      })
      .from(habits)
      .where(
        and(
          eq(habits.userId, userId),
          eq(habits.status, "ACTIVE"),
        ),
      )
      .orderBy(asc(habits.sortOrder));

    const nextSortOrder =
      activeHabits.length === 0
        ? 0
        : activeHabits[activeHabits.length - 1]!.sortOrder + 1;

    const [habit] = await tx
      .update(habits)
      .set({
        status: "ACTIVE",
        archivedAt: null,
        sortOrder: nextSortOrder,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(habits.id, habitId),
          eq(habits.userId, userId),
          eq(habits.status, "ARCHIVED"),
        ),
      )
      .returning();

    return habit ?? null;
  });
}

export async function deleteHabit(
  userId: string,
  habitId: string,
) {
  const [habit] = await db
    .delete(habits)
    .where(
      and(
        eq(habits.id, habitId),
        eq(habits.userId, userId),
      ),
    )
    .returning();

  return habit ?? null;
}

export async function reorderHabits(
  userId: string,
  habitIds: string[],
) {
  if (habitIds.length === 0) {
    return [];
  }

  return db.transaction(async (tx) => {
    const allActiveHabits = await tx
      .select({
        id: habits.id,
      })
      .from(habits)
      .where(
        and(
          eq(habits.userId, userId),
          eq(habits.status, "ACTIVE"),
        ),
      );

    const activeIdsSet = new Set(allActiveHabits.map((h) => h.id));

    // Reject if any provided habitId does not belong to active habits of this user
    const hasUnownedOrInactive = habitIds.some((id) => !activeIdsSet.has(id));
    if (hasUnownedOrInactive) {
      return null;
    }

    // Reject if not all active habits are provided in the reorder list
    if (habitIds.length !== allActiveHabits.length) {
      throw new AppError(
        400,
        "INVALID_REORDER_LIST",
        "Reorder list must contain all active habits",
      );
    }

    for (const [index, habitId] of habitIds.entries()) {
      await tx
        .update(habits)
        .set({
          sortOrder: index,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(habits.id, habitId),
            eq(habits.userId, userId),
            eq(habits.status, "ACTIVE"),
          ),
        );
    }

    return tx
      .select()
      .from(habits)
      .where(
        and(
          eq(habits.userId, userId),
          eq(habits.status, "ACTIVE"),
        ),
      )
      .orderBy(asc(habits.sortOrder));
  });
}