import crypto from "node:crypto";

import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import app from "../app.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

const testEmails: string[] = [];

afterAll(async () => {
  for (const email of testEmails) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user) {
      await db.delete(users).where(eq(users.id, user.id));
    }
  }
});

async function createAuthenticatedAgent() {
  const agent = request.agent(app);

  const email = `progress-e2e-${crypto.randomUUID()}@example.com`;
  const password = "test-password";

  testEmails.push(email);

  await agent
    .post("/api/v1/auth/register")
    .send({
      email,
      password,
    })
    .expect(201);

  return agent;
}

let exerciseId: string | undefined;

async function getExerciseId() {
  if (exerciseId) {
    return exerciseId;
  }

  const response = await request(app).get("/api/v1/habits/catalog").expect(200);

  const exercise = response.body.habits.find(
    (habit: { key: string }) => habit.key === "exercise",
  );

  expect(exercise).toBeDefined();

  exerciseId = exercise.id as string;

  return exerciseId;
}

describe("Progress E2E Flow", () => {
  it("completes full end-to-end progress flow with authentication, adoption, activity creation, progress verification, and cross-user isolation", async () => {
    // Step 1: Register and authenticate
    const agent = await createAuthenticatedAgent();

    const meResponse = await agent.get("/api/v1/auth/me").expect(200);
    const userId = meResponse.body.user.id as string;

    expect(userId).toBeDefined();

    // Step 2: Get canonical Exercise habit
    const exerciseId = await getExerciseId();

    const catalogResponse = await request(app)
      .get("/api/v1/habits/catalog")
      .expect(200);

    const exercise = catalogResponse.body.habits.find(
      (habit: { key: string }) => habit.key === "exercise",
    );

    expect(exercise).toMatchObject({
      key: "exercise",
      name: "Exercise",
      targetType: "DURATION",
      targetValue: "30",
      targetUnit: "minutes",
    });

    // Step 3: Adopt Exercise habit
    const adoptResponse = await agent
      .post("/api/v1/habits")
      .send({
        habitId: exerciseId,
      })
      .expect(201);

    const userHabitId = adoptResponse.body.habit.id as string;

    expect(userHabitId).toBeDefined();

    // Step 4: Request initial progress → INCOMPLETE
    const initialProgress = await agent
      .get(`/api/v1/progress/habits/${exerciseId}`)
      .query({
        from: "2026-09-15",
        to: "2026-09-15",
        today: "2026-09-15",
      })
      .expect(200);

    expect(initialProgress.body.data.progress.occurrences[0]).toMatchObject({
      date: "2026-09-15",
      state: "INCOMPLETE",
      actualValue: 0,
      targetValue: 30,
      completionPercentage: 0,
    });

    expect(initialProgress.body.data.progress.consistency).toEqual({
      completed: 0,
      expected: 1,
      percentage: 0,
    });

    expect(initialProgress.body.data.progress.streaks).toEqual({
      current: 0,
      longest: 0,
    });

    // Step 5: Create 15 min activity → INCOMPLETE 50%
    await agent
      .post("/api/v1/activities")
      .send({
        userHabitId,
        activityDate: "2026-09-15",
        source: "MANUAL",
        durationSeconds: 900,
      })
      .expect(201);

    const afterFirstActivity = await agent
      .get(`/api/v1/progress/habits/${exerciseId}`)
      .query({
        from: "2026-09-15",
        to: "2026-09-15",
        today: "2026-09-15",
      })
      .expect(200);

    expect(afterFirstActivity.body.data.progress.occurrences[0]).toMatchObject({
      date: "2026-09-15",
      state: "INCOMPLETE",
      actualValue: 15,
      targetValue: 30,
      completionPercentage: 50,
    });

    expect(afterFirstActivity.body.data.progress.consistency).toEqual({
      completed: 0,
      expected: 1,
      percentage: 0,
    });

    expect(afterFirstActivity.body.data.progress.streaks).toEqual({
      current: 0,
      longest: 0,
    });

    // Step 6: Create another 15 min → COMPLETED 100%
    await agent
      .post("/api/v1/activities")
      .send({
        userHabitId,
        activityDate: "2026-09-15",
        source: "MANUAL",
        durationSeconds: 900,
      })
      .expect(201);

    const afterSecondActivity = await agent
      .get(`/api/v1/progress/habits/${exerciseId}`)
      .query({
        from: "2026-09-15",
        to: "2026-09-15",
        today: "2026-09-15",
      })
      .expect(200);

    expect(
      afterSecondActivity.body.data.progress.occurrences[0],
    ).toMatchObject({
      date: "2026-09-15",
      state: "COMPLETED",
      actualValue: 30,
      targetValue: 30,
      completionPercentage: 100,
    });

    // Step 7: Verify consistency = 100%
    expect(afterSecondActivity.body.data.progress.consistency).toEqual({
      completed: 1,
      expected: 1,
      percentage: 100,
    });

    // Step 8: Verify streak = 1
    expect(afterSecondActivity.body.data.progress.streaks).toEqual({
      current: 1,
      longest: 1,
    });

    // Step 9: Get all activities to edit one
    const activitiesResponse = await agent
      .get("/api/v1/activities")
      .query({
        from: "2026-09-15",
        to: "2026-09-15",
      })
      .expect(200);

    const activities = activitiesResponse.body.data.activities;
    expect(activities).toHaveLength(2);

    const firstActivityId = activities[0].id as string;

    // Step 10: Edit activity downward → INCOMPLETE
    await agent
      .patch(`/api/v1/activities/${firstActivityId}`)
      .send({
        durationSeconds: 300,
      })
      .expect(200);

    const afterEdit = await agent
      .get(`/api/v1/progress/habits/${exerciseId}`)
      .query({
        from: "2026-09-15",
        to: "2026-09-15",
        today: "2026-09-15",
      })
      .expect(200);

    // Step 11: Verify historical recalculation (300s + 900s = 1200s = 20 min)
    expect(afterEdit.body.data.progress.occurrences[0]).toMatchObject({
      date: "2026-09-15",
      state: "INCOMPLETE",
      actualValue: 20,
      targetValue: 30,
      completionPercentage: expect.closeTo(66.67, 1),
    });

    expect(afterEdit.body.data.progress.consistency).toEqual({
      completed: 0,
      expected: 1,
      percentage: 0,
    });

    expect(afterEdit.body.data.progress.streaks).toEqual({
      current: 0,
      longest: 0,
    });

    // Step 12: Verify another user cannot access it
    const otherAgent = await createAuthenticatedAgent();

    await otherAgent
      .get(`/api/v1/progress/habits/${exerciseId}`)
      .query({
        from: "2026-09-15",
        to: "2026-09-15",
        today: "2026-09-15",
      })
      .expect(404);
  });
});
