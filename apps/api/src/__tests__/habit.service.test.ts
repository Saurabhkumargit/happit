import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { AppError } from "../lib/AppError.js";
import {
  createHabit,
  getHabit,
  listActiveHabits,
  listHabits,
  updateHabit,
  archiveHabit,
  restoreHabit,
  deleteHabit,
  reorderHabits,
} from "../modules/habits/habit.service.js";

async function createTestUser() {
  const [user] = await db
    .insert(users)
    .values({
      email: `habit-test-${crypto.randomUUID()}@example.com`,
      passwordHash: "test-password-hash",
    })
    .returning();

  return user;
}

async function createTestHabit(userId: string, name = "Test Habit") {
  return createHabit(userId, {
    name,
    description: "Test habit",
    scheduleType: "DAILY",
    scheduleConfig: {},
    targetType: "COUNT",
    targetValue: 1,
    targetUnit: "time",
    startDate: new Date("2026-09-08"),
  });
}

describe("Habit service", () => {
  it("creates an active habit for the authenticated user", async () => {
    const user = await createTestUser();

    const habit = await createTestHabit(user.id, "Read");

    expect(habit).toMatchObject({
      userId: user.id,
      name: "Read",
      status: "ACTIVE",
      sortOrder: 0,
    });

    expect(habit.id).toEqual(expect.any(String));

    await db.delete(users).where(eq(users.id, user.id));
  });

  it("lists only the user's active habits", async () => {
    const user = await createTestUser();

    await createTestHabit(user.id, "Read");

    const habits = await listActiveHabits(user.id);

    expect(habits).toHaveLength(1);
    expect(habits[0]).toMatchObject({
      userId: user.id,
      name: "Read",
      status: "ACTIVE",
    });

    await db.delete(users).where(eq(users.id, user.id));
  });

  it("assigns the next sort order when creating another active habit", async () => {
    const user = await createTestUser();

    await createTestHabit(user.id, "Read");

    const secondHabit = await createTestHabit(
      user.id,
      "Exercise",
    );

    expect(secondHabit.sortOrder).toBe(1);

    await db.delete(users).where(eq(users.id, user.id));
  });

  it("gets a habit only when it belongs to the user", async () => {
    const user = await createTestUser();

    const habit = await createTestHabit(user.id);

    const result = await getHabit(user.id, habit.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(habit.id);
    expect(result!.userId).toBe(user.id);

    await db.delete(users).where(eq(users.id, user.id));
  });

  it("does not return a habit to another user", async () => {
    const user = await createTestUser();
    const otherUser = await createTestUser();

    const habit = await createTestHabit(user.id);

    const result = await getHabit(otherUser.id, habit.id);

    expect(result).toBeNull();

    await db.delete(users).where(eq(users.id, user.id));
    await db.delete(users).where(eq(users.id, otherUser.id));
  });

  it("updates an owned habit", async () => {
    const user = await createTestUser();

    const habit = await createTestHabit(user.id);

    const updated = await updateHabit(user.id, habit.id, {
      name: "Read More",
      description: "Read more pages every day",
      scheduleType: "DAILY",
      scheduleConfig: {},
      targetType: "COUNT",
      targetValue: 30,
      targetUnit: "pages",
      startDate: new Date("2026-09-08"),
    });

    expect(updated).toMatchObject({
      id: habit.id,
      userId: user.id,
      name: "Read More",
      description: "Read more pages every day",
      targetValue: "30",
    });

    await db.delete(users).where(eq(users.id, user.id));
  });

  it("archives a habit and removes it from the active list", async () => {
    const user = await createTestUser();

    const habit = await createTestHabit(user.id);

    const archived = await archiveHabit(user.id, habit.id);

    expect(archived).toMatchObject({
      id: habit.id,
      status: "ARCHIVED",
    });

    expect(archived!.archivedAt).not.toBeNull();

    const activeHabits = await listActiveHabits(user.id);

    expect(activeHabits).toHaveLength(0);

    await db.delete(users).where(eq(users.id, user.id));
  });

  it("restores an archived habit as active", async () => {
    const user = await createTestUser();

    const firstHabit = await createTestHabit(
      user.id,
      "First Habit",
    );

    const secondHabit = await createTestHabit(
      user.id,
      "Second Habit",
    );

    await archiveHabit(user.id, firstHabit.id);

    const restored = await restoreHabit(
      user.id,
      firstHabit.id,
    );

    expect(restored).toMatchObject({
      id: firstHabit.id,
      userId: user.id,
      status: "ACTIVE",
    });

    expect(restored!.archivedAt).toBeNull();
    expect(restored!.sortOrder).toBe(2);

    expect(secondHabit.sortOrder).toBe(1);

    await db.delete(users).where(eq(users.id, user.id));
  });

  it("reorders active habits", async () => {
    const user = await createTestUser();

    const firstHabit = await createTestHabit(
      user.id,
      "First Habit",
    );

    const secondHabit = await createTestHabit(
      user.id,
      "Second Habit",
    );

    const reordered = await reorderHabits(user.id, [
      secondHabit.id,
      firstHabit.id,
    ]);

    expect(reordered).not.toBeNull();
    expect(reordered![0]!.id).toBe(secondHabit.id);
    expect(reordered![0]!.sortOrder).toBe(0);
    expect(reordered![1]!.id).toBe(firstHabit.id);
    expect(reordered![1]!.sortOrder).toBe(1);

    await db.delete(users).where(eq(users.id, user.id));
  });

  it("rejects reorder when a habit does not belong to the user", async () => {
    const user = await createTestUser();
    const otherUser = await createTestUser();

    const habit = await createTestHabit(user.id);

    const result = await reorderHabits(user.id, [
      habit.id,
      crypto.randomUUID(),
    ]);

    expect(result).toBeNull();

    await db.delete(users).where(eq(users.id, user.id));
    await db.delete(users).where(eq(users.id, otherUser.id));
  });

  it("does not allow another user to update a habit", async () => {
    const user = await createTestUser();
    const otherUser = await createTestUser();

    const habit = await createTestHabit(user.id);

    const result = await updateHabit(
      otherUser.id,
      habit.id,
      {
        name: "Unauthorized",
        description: undefined,
        scheduleType: "DAILY",
        scheduleConfig: {},
        targetType: "COUNT",
        targetValue: 1,
        targetUnit: "time",
        startDate: new Date("2026-09-08"),
      },
    );

    expect(result).toBeNull();

    const unchanged = await getHabit(user.id, habit.id);

    expect(unchanged!.name).toBe("Test Habit");

    await db.delete(users).where(eq(users.id, user.id));
    await db.delete(users).where(eq(users.id, otherUser.id));
  });

  it("does not allow another user to archive a habit", async () => {
    const user = await createTestUser();
    const otherUser = await createTestUser();

    const habit = await createTestHabit(user.id);

    const result = await archiveHabit(
      otherUser.id,
      habit.id,
    );

    expect(result).toBeNull();

    const unchanged = await getHabit(user.id, habit.id);

    expect(unchanged!.status).toBe("ACTIVE");

    await db.delete(users).where(eq(users.id, user.id));
    await db.delete(users).where(eq(users.id, otherUser.id));
  });

  it("deletes an owned habit", async () => {
    const user = await createTestUser();

    const habit = await createTestHabit(user.id);

    const deleted = await deleteHabit(
      user.id,
      habit.id,
    );

    expect(deleted).not.toBeNull();
    expect(deleted!.id).toBe(habit.id);

    const result = await getHabit(user.id, habit.id);

    expect(result).toBeNull();

    await db.delete(users).where(eq(users.id, user.id));
  });

  it("archives an already-archived habit idempotently without updating archivedAt", async () => {
    const user = await createTestUser();

    const habit = await createTestHabit(user.id);
    const firstArchive = await archiveHabit(user.id, habit.id);

    expect(firstArchive!.status).toBe("ARCHIVED");
    const originalArchivedAt = firstArchive!.archivedAt;

    // Call archive again
    const secondArchive = await archiveHabit(user.id, habit.id);

    expect(secondArchive!.status).toBe("ARCHIVED");
    expect(secondArchive!.archivedAt?.toISOString()).toBe(
      originalArchivedAt?.toISOString(),
    );

    await db.delete(users).where(eq(users.id, user.id));
  });

  it("restores an already-active habit idempotently without changing sortOrder", async () => {
    const user = await createTestUser();

    const habit = await createTestHabit(user.id);
    expect(habit.status).toBe("ACTIVE");
    expect(habit.sortOrder).toBe(0);

    // Call restore on already-active habit
    const restored = await restoreHabit(user.id, habit.id);

    expect(restored!.status).toBe("ACTIVE");
    expect(restored!.sortOrder).toBe(0);

    await db.delete(users).where(eq(users.id, user.id));
  });

  it("prevents updating an archived habit and throws AppError(400, HABIT_ARCHIVED)", async () => {
    const user = await createTestUser();

    const habit = await createTestHabit(user.id);
    await archiveHabit(user.id, habit.id);

    await expect(
      updateHabit(user.id, habit.id, {
        name: "Updated Name",
        description: "Updated description",
        scheduleType: "DAILY",
        scheduleConfig: {},
        targetType: "COUNT",
        targetValue: 10,
        targetUnit: "times",
        startDate: new Date("2026-09-08"),
      }),
    ).rejects.toThrow(AppError);

    try {
      await updateHabit(user.id, habit.id, {
        name: "Updated Name",
        description: "Updated description",
        scheduleType: "DAILY",
        scheduleConfig: {},
        targetType: "COUNT",
        targetValue: 10,
        targetUnit: "times",
        startDate: new Date("2026-09-08"),
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appErr = error as AppError;
      expect(appErr.statusCode).toBe(400);
      expect(appErr.code).toBe("HABIT_ARCHIVED");
    }

    await db.delete(users).where(eq(users.id, user.id));
  });

  it("rejects reorder when list does not contain all active habits", async () => {
    const user = await createTestUser();

    const habit1 = await createTestHabit(user.id, "Habit 1");
    await createTestHabit(user.id, "Habit 2");

    // Only providing 1 out of 2 active habits
    await expect(
      reorderHabits(user.id, [habit1.id]),
    ).rejects.toThrow(AppError);

    try {
      await reorderHabits(user.id, [habit1.id]);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appErr = error as AppError;
      expect(appErr.statusCode).toBe(400);
      expect(appErr.code).toBe("INVALID_REORDER_LIST");
    }

    await db.delete(users).where(eq(users.id, user.id));
  });

  it("lists habits filtered by status (ACTIVE, ARCHIVED, ALL)", async () => {
    const user = await createTestUser();

    const activeHabit = await createTestHabit(user.id, "Active One");
    const habitToArchive = await createTestHabit(user.id, "Archive One");

    await archiveHabit(user.id, habitToArchive.id);

    const activeList = await listHabits(user.id, "ACTIVE");
    expect(activeList).toHaveLength(1);
    expect(activeList[0]!.id).toBe(activeHabit.id);

    const archivedList = await listHabits(user.id, "ARCHIVED");
    expect(archivedList).toHaveLength(1);
    expect(archivedList[0]!.id).toBe(habitToArchive.id);

    const allList = await listHabits(user.id, "ALL");
    expect(allList).toHaveLength(2);

    await db.delete(users).where(eq(users.id, user.id));
  });
});