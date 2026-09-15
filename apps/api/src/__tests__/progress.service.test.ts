import crypto from "node:crypto";

import { and, eq } from "drizzle-orm";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { db } from "../db/index.js";
import { activities, habits, userHabits, users } from "../db/schema.js";
import { getHabitProgress } from "../modules/progress/progress.service.js";
import {
  createActivity,
  updateActivity,
} from "../modules/activities/activity.service.js";

describe("progress service", () => {
  let userId: string;
  let habitId: string;
  let otherUserId: string | undefined;
  let otherHabitId: string | undefined;
  let extraUserHabitIds: string[] = [];
  let extraHabitIds: string[] = [];

  beforeEach(async () => {
    const [user] = await db
      .insert(users)
      .values({
        email: `progress-${crypto.randomUUID()}@example.com`,
        passwordHash: "test-password-hash",
        timezone: "UTC",
      })
      .returning();

    userId = user.id;

    const [habit] = await db
      .insert(habits)
      .values({
        key: `progress-${crypto.randomUUID()}`,
        name: "Progress Test Habit",
        description: "Habit used for progress tests.",
        scheduleType: "DAILY",
        scheduleConfig: {},
        targetType: "DURATION",
        targetValue: "30",
        targetUnit: "minutes",
        status: "AVAILABLE",
      })
      .returning();

    habitId = habit.id;

    await db.insert(userHabits).values({
      userId,
      habitId,
      status: "ACTIVE",
      startDate: new Date("2026-09-01T00:00:00Z"),
      sortOrder: 0,
    });
  });

  afterEach(async () => {
    for (const extraUserHabitId of extraUserHabitIds) {
      await db
        .delete(activities)
        .where(eq(activities.userHabitId, extraUserHabitId));

      await db
        .delete(userHabits)
        .where(eq(userHabits.id, extraUserHabitId));
    }

    for (const extraHabitId of extraHabitIds) {
      await db
        .delete(habits)
        .where(eq(habits.id, extraHabitId));
    }

    extraUserHabitIds = [];
    extraHabitIds = [];

    if (otherHabitId) {
      await db
        .delete(userHabits)
        .where(eq(userHabits.habitId, otherHabitId));

      await db
        .delete(habits)
        .where(eq(habits.id, otherHabitId));
    }

    if (otherUserId) {
      await db
        .delete(users)
        .where(eq(users.id, otherUserId));
    }

    await db
      .delete(activities)
      .where(eq(activities.userId, userId));

    await db
      .delete(userHabits)
      .where(eq(userHabits.userId, userId));

    await db
      .delete(habits)
      .where(eq(habits.id, habitId));

    await db
      .delete(users)
      .where(eq(users.id, userId));

    otherUserId = undefined;
    otherHabitId = undefined;
  });

  it("returns progress for an adopted daily habit", async () => {
    const result = await getHabitProgress(userId, habitId, {
      from: "2026-09-01",
      to: "2026-09-03",
      today: "2026-09-03",
    });

    expect(result.habit.id).toBe(habitId);
    expect(result.range).toEqual({
      from: "2026-09-01",
      to: "2026-09-03",
      timezone: "UTC",
    });

    expect(result.occurrences).toHaveLength(3);

    expect(
      result.occurrences.every(
        (occurrence) => occurrence.state === "INCOMPLETE",
      ),
    ).toBe(true);

    expect(result.consistency).toEqual({
      completed: 0,
      expected: 3,
      percentage: 0,
    });

    expect(result.streaks).toEqual({
      current: 0,
      longest: 0,
    });

    expect(result.heatmap).toHaveLength(3);
  });

  it("marks an occurrence complete when activity reaches the target", async () => {
    await createActivity(userId, {
      userHabitId: (
        await db
          .select({ id: userHabits.id })
          .from(userHabits)
          .where(
            and(eq(userHabits.userId, userId), eq(userHabits.habitId, habitId)),
          )
          .limit(1)
      )[0].id,
      activityDate: "2026-09-01",
      source: "MANUAL",
      durationSeconds: 1800,
    });

    const result = await getHabitProgress(userId, habitId, {
      from: "2026-09-01",
      to: "2026-09-03",
      today: "2026-09-03",
    });

    expect(result.occurrences[0]).toMatchObject({
      date: "2026-09-01",
      state: "COMPLETED",
      actualValue: 30,
      targetValue: 30,
      completionPercentage: 100,
    });

    expect(result.consistency).toEqual({
      completed: 1,
      expected: 3,
      percentage: 33.33333333333333,
    });

    expect(result.streaks).toEqual({
      current: 0,
      longest: 1,
    });
  });

  it("aggregates multiple activities on the same day", async () => {
    const [adoptedHabit] = await db
      .select({ id: userHabits.id })
      .from(userHabits)
      .where(
        and(eq(userHabits.userId, userId), eq(userHabits.habitId, habitId)),
      )
      .limit(1);

    await createActivity(userId, {
      userHabitId: adoptedHabit.id,
      activityDate: "2026-09-01",
      source: "MANUAL",
      durationSeconds: 900,
    });

    await createActivity(userId, {
      userHabitId: adoptedHabit.id,
      activityDate: "2026-09-01",
      source: "MANUAL",
      durationSeconds: 900,
    });

    const result = await getHabitProgress(userId, habitId, {
      from: "2026-09-01",
      to: "2026-09-03",
      today: "2026-09-03",
    });

    expect(result.occurrences[0]).toMatchObject({
      date: "2026-09-01",
      state: "COMPLETED",
      actualValue: 30,
      targetValue: 30,
      completionPercentage: 100,
    });

    expect(result.consistency).toEqual({
      completed: 1,
      expected: 3,
      percentage: 33.33333333333333,
    });

    expect(result.streaks).toEqual({
      current: 0,
      longest: 1,
    });
  });

  it("recalculates progress after a historical activity edit", async () => {
    const [adoptedHabit] = await db
      .select({ id: userHabits.id })
      .from(userHabits)
      .where(
        and(eq(userHabits.userId, userId), eq(userHabits.habitId, habitId)),
      )
      .limit(1);

    const activity = await createActivity(userId, {
      userHabitId: adoptedHabit.id,
      activityDate: "2026-09-01",
      source: "MANUAL",
      durationSeconds: 1800,
    });

    const beforeEdit = await getHabitProgress(userId, habitId, {
      from: "2026-09-01",
      to: "2026-09-03",
      today: "2026-09-03",
    });

    expect(beforeEdit.occurrences[0]).toMatchObject({
      date: "2026-09-01",
      state: "COMPLETED",
      actualValue: 30,
    });

    await updateActivity(userId, activity.id, {
      durationSeconds: 900,
    });

    const afterEdit = await getHabitProgress(userId, habitId, {
      from: "2026-09-01",
      to: "2026-09-03",
      today: "2026-09-03",
    });

    expect(afterEdit.occurrences[0]).toMatchObject({
      date: "2026-09-01",
      state: "INCOMPLETE",
      actualValue: 15,
      targetValue: 30,
      completionPercentage: 50,
    });

    expect(afterEdit.consistency).toEqual({
      completed: 0,
      expected: 3,
      percentage: 0,
    });

    expect(afterEdit.streaks).toEqual({
      current: 0,
      longest: 0,
    });
  });

  it("does not allow progress access to another user's habit", async () => {
    const [otherUser] = await db
      .insert(users)
      .values({
        email: `other-progress-${crypto.randomUUID()}@example.com`,
        passwordHash: "test-password-hash",
        timezone: "UTC",
      })
      .returning();

    otherUserId = otherUser.id;

    const [otherHabit] = await db
      .insert(habits)
      .values({
        key: `other-progress-${crypto.randomUUID()}`,
        name: "Other User Habit",
        description: "Habit belonging to another user.",
        scheduleType: "DAILY",
        scheduleConfig: {},
        targetType: "DURATION",
        targetValue: "30",
        targetUnit: "minutes",
        status: "AVAILABLE",
      })
      .returning();

    otherHabitId = otherHabit.id;

    await db.insert(userHabits).values({
      userId: otherUser.id,
      habitId: otherHabit.id,
      status: "ACTIVE",
      startDate: new Date("2026-09-01T00:00:00Z"),
      sortOrder: 0,
    });

    await expect(
      getHabitProgress(userId, otherHabit.id, {
        from: "2026-09-01",
        to: "2026-09-03",
        today: "2026-09-03",
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "HABIT_NOT_FOUND",
    });
  });

  it("uses the user's timezone when determining the adoption start date", async () => {
  await db
    .update(users)
    .set({
      timezone: "Asia/Kolkata",
    })
    .where(eq(users.id, userId));

  await db
    .update(userHabits)
    .set({
      startDate: new Date("2026-09-14T23:30:00Z"),
    })
    .where(
      and(
        eq(userHabits.userId, userId),
        eq(userHabits.habitId, habitId),
      ),
    );

  const result = await getHabitProgress(userId, habitId, {
    from: "2026-09-14",
    to: "2026-09-15",
    today: "2026-09-15",
  });

  expect(result.occurrences.map((occurrence) => occurrence.date)).toEqual([
    "2026-09-15",
  ]);
});

it("uses the current local date when today is not provided", async () => {
  const result = await getHabitProgress(userId, habitId, {
    from: "2026-09-01",
    to: "2026-09-03",
  });

  expect(result.occurrences).toHaveLength(3);
  expect(result.occurrences[0].state).toBe("INCOMPLETE");
  expect(result.occurrences[1].state).toBe("INCOMPLETE");
  expect(result.occurrences[2].state).toBe("INCOMPLETE");
});

it("preserves NOT_SCHEDULED days for a weekday habit", async () => {
  const [weekdayHabit] = await db
    .insert(habits)
    .values({
      key: `progress-weekday-${crypto.randomUUID()}`,
      name: "Weekday Progress Test Habit",
      description: "Weekday habit used for progress tests.",
      scheduleType: "WEEKDAYS",
      scheduleConfig: {
        weekdays: [1, 2, 3, 4, 5],
      },
      targetType: "DURATION",
      targetValue: "30",
      targetUnit: "minutes",
      status: "AVAILABLE",
    })
    .returning();

  const [weekdayUserHabit] = await db
    .insert(userHabits)
    .values({
      userId,
      habitId: weekdayHabit.id,
      status: "ACTIVE",
      startDate: new Date("2026-09-07T00:00:00Z"),
      sortOrder: 1,
    })
    .returning();

  const result = await getHabitProgress(userId, weekdayHabit.id, {
    from: "2026-09-07",
    to: "2026-09-13",
    today: "2026-09-13",
  });

  expect(result.occurrences).toEqual([
    expect.objectContaining({
      date: "2026-09-07",
      state: "INCOMPLETE",
    }),
    expect.objectContaining({
      date: "2026-09-08",
      state: "INCOMPLETE",
    }),
    expect.objectContaining({
      date: "2026-09-09",
      state: "INCOMPLETE",
    }),
    expect.objectContaining({
      date: "2026-09-10",
      state: "INCOMPLETE",
    }),
    expect.objectContaining({
      date: "2026-09-11",
      state: "INCOMPLETE",
    }),
    expect.objectContaining({
      date: "2026-09-12",
      state: "NOT_SCHEDULED",
    }),
    expect.objectContaining({
      date: "2026-09-13",
      state: "NOT_SCHEDULED",
    }),
  ]);

  expect(result.consistency).toEqual({
    completed: 0,
    expected: 5,
    percentage: 0,
  });

  expect(result.streaks).toEqual({
    current: 0,
    longest: 0,
  });

  expect(result.heatmap).toHaveLength(7);

  await db
    .delete(userHabits)
    .where(eq(userHabits.id, weekdayUserHabit.id));

  await db
    .delete(habits)
    .where(eq(habits.id, weekdayHabit.id));
});

it("evaluates duration targets in seconds using the canonical target unit", async () => {
  const [secondsHabit] = await db
    .insert(habits)
    .values({
      key: `progress-seconds-${crypto.randomUUID()}`,
      name: "Seconds Progress Test Habit",
      description: "Seconds-based duration habit.",
      scheduleType: "DAILY",
      scheduleConfig: {},
      targetType: "DURATION",
      targetValue: "60",
      targetUnit: "seconds",
      status: "AVAILABLE",
    })
    .returning();

  extraHabitIds.push(secondsHabit.id);

  const [secondsUserHabit] = await db
    .insert(userHabits)
    .values({
      userId,
      habitId: secondsHabit.id,
      status: "ACTIVE",
      startDate: new Date("2026-09-01T00:00:00Z"),
      sortOrder: 1,
    })
    .returning();

  extraUserHabitIds.push(secondsUserHabit.id);

  await createActivity(userId, {
    userHabitId: secondsUserHabit.id,
    activityDate: "2026-09-01",
    source: "MANUAL",
    durationSeconds: 60,
  });

  const result = await getHabitProgress(userId, secondsHabit.id, {
    from: "2026-09-01",
    to: "2026-09-01",
    today: "2026-09-01",
  });

  expect(result.occurrences[0]).toMatchObject({
    date: "2026-09-01",
    state: "COMPLETED",
    actualValue: 60,
    targetValue: 60,
    completionPercentage: 100,
  });
});
});
