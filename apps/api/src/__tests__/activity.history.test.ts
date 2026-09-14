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

  const email = `activity-history-${crypto.randomUUID()}@example.com`;
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

async function getExerciseId() {
  const response = await request(app)
    .get("/api/v1/habits/catalog")
    .expect(200);

  const exercise = response.body.habits.find(
    (habit: { key: string }) => habit.key === "exercise",
  );

  expect(exercise).toBeDefined();

  return exercise.id as string;
}

async function getReadingId() {
  const response = await request(app)
    .get("/api/v1/habits/catalog")
    .expect(200);

  const reading = response.body.habits.find(
    (habit: { key: string }) => habit.key === "reading",
  );

  expect(reading).toBeDefined();

  return reading.id as string;
}

async function adoptHabit(
  agent: ReturnType<typeof request.agent>,
  habitId: string,
) {
  const response = await agent
    .post("/api/v1/habits")
    .send({ habitId })
    .expect(201);

  return response.body.habit.id as string;
}

async function createActivity(
  agent: ReturnType<typeof request.agent>,
  userHabitId: string,
  activityDate: string,
  durationSeconds: number,
) {
  const response = await agent
    .post("/api/v1/activities")
    .send({
      userHabitId,
      activityDate,
      source: "MANUAL",
      durationSeconds,
    })
    .expect(201);

  return response.body.data.activity;
}

describe("GET /api/v1/activities", () => {
  it("requires authentication", async () => {
    const response = await request(app)
      .get("/api/v1/activities")
      .expect(401);

    expect(response.body).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      },
    });
  });

  it("returns the authenticated user's activities", async () => {
    const agent = await createAuthenticatedAgent();
    const exerciseId = await getExerciseId();
    const userHabitId = await adoptHabit(agent, exerciseId);

    await createActivity(
      agent,
      userHabitId,
      "2026-09-10",
      1800,
    );

    const response = await agent
      .get("/api/v1/activities")
      .expect(200);

    expect(response.body.data.activities).toHaveLength(1);

    expect(response.body.data.activities[0]).toMatchObject({
      userHabitId,
      activityDate: "2026-09-10",
      durationSeconds: 1800,
      source: "MANUAL",
    });
  });

  it("returns an empty list when the user has no activities", async () => {
    const agent = await createAuthenticatedAgent();

    const response = await agent
      .get("/api/v1/activities")
      .expect(200);

    expect(response.body).toEqual({
      data: {
        activities: [],
      },
    });
  });

  it("returns recent activity first", async () => {
    const agent = await createAuthenticatedAgent();
    const exerciseId = await getExerciseId();
    const userHabitId = await adoptHabit(agent, exerciseId);

    await createActivity(
      agent,
      userHabitId,
      "2026-09-08",
      600,
    );

    await createActivity(
      agent,
      userHabitId,
      "2026-09-12",
      1800,
    );

    await createActivity(
      agent,
      userHabitId,
      "2026-09-10",
      1200,
    );

    const response = await agent
      .get("/api/v1/activities")
      .expect(200);

    const activities = response.body.data.activities;

    expect(activities).toHaveLength(3);

    expect(activities.map(
      (activity: { activityDate: string }) =>
        activity.activityDate,
    )).toEqual([
      "2026-09-12",
      "2026-09-10",
      "2026-09-08",
    ]);
  });

  it("returns multiple activities for the same habit and day", async () => {
    const agent = await createAuthenticatedAgent();
    const exerciseId = await getExerciseId();
    const userHabitId = await adoptHabit(agent, exerciseId);

    await createActivity(
      agent,
      userHabitId,
      "2026-09-12",
      600,
    );

    await createActivity(
      agent,
      userHabitId,
      "2026-09-12",
      900,
    );

    const response = await agent
      .get("/api/v1/activities")
      .expect(200);

    expect(response.body.data.activities).toHaveLength(2);

    expect(
      response.body.data.activities.map(
        (activity: { durationSeconds: number }) =>
          activity.durationSeconds,
      ),
    ).toEqual(expect.arrayContaining([600, 900]));
  });

  it("does not return another user's activities", async () => {
    const firstAgent = await createAuthenticatedAgent();
    const secondAgent = await createAuthenticatedAgent();

    const exerciseId = await getExerciseId();

    const firstHabit = await adoptHabit(
      firstAgent,
      exerciseId,
    );

    const secondHabit = await adoptHabit(
      secondAgent,
      exerciseId,
    );

    await createActivity(
      firstAgent,
      firstHabit,
      "2026-09-12",
      1800,
    );

    await createActivity(
      secondAgent,
      secondHabit,
      "2026-09-12",
      900,
    );

    const firstResponse = await firstAgent
      .get("/api/v1/activities")
      .expect(200);

    expect(firstResponse.body.data.activities).toHaveLength(1);

    expect(
      firstResponse.body.data.activities[0].userHabitId,
    ).toBe(firstHabit);

    const secondResponse = await secondAgent
      .get("/api/v1/activities")
      .expect(200);

    expect(secondResponse.body.data.activities).toHaveLength(1);

    expect(
      secondResponse.body.data.activities[0].userHabitId,
    ).toBe(secondHabit);
  });

  it("filters activities by habit", async () => {
    const agent = await createAuthenticatedAgent();

    const exerciseId = await getExerciseId();
    const readingId = await getReadingId();

    const exerciseHabit = await adoptHabit(
      agent,
      exerciseId,
    );

    const readingHabit = await adoptHabit(
      agent,
      readingId,
    );

    await createActivity(
      agent,
      exerciseHabit,
      "2026-09-12",
      1800,
    );

    await createActivity(
      agent,
      readingHabit,
      "2026-09-12",
      1200,
    );

    const response = await agent
      .get(
        `/api/v1/activities?userHabitId=${exerciseHabit}`,
      )
      .expect(200);

    expect(response.body.data.activities).toHaveLength(1);

    expect(
      response.body.data.activities[0].userHabitId,
    ).toBe(exerciseHabit);
  });

  it("filters activities by date range", async () => {
    const agent = await createAuthenticatedAgent();
    const exerciseId = await getExerciseId();
    const userHabitId = await adoptHabit(agent, exerciseId);

    await createActivity(
      agent,
      userHabitId,
      "2026-09-05",
      600,
    );

    await createActivity(
      agent,
      userHabitId,
      "2026-09-10",
      1200,
    );

    await createActivity(
      agent,
      userHabitId,
      "2026-09-15",
      1800,
    );

    const response = await agent
      .get(
        "/api/v1/activities?from=2026-09-08&to=2026-09-12",
      )
      .expect(200);

    expect(response.body.data.activities).toHaveLength(1);

    expect(
      response.body.data.activities[0].activityDate,
    ).toBe("2026-09-10");
  });

  it("supports combining habit and date filters", async () => {
    const agent = await createAuthenticatedAgent();

    const exerciseId = await getExerciseId();
    const readingId = await getReadingId();

    const exerciseHabit = await adoptHabit(
      agent,
      exerciseId,
    );

    const readingHabit = await adoptHabit(
      agent,
      readingId,
    );

    await createActivity(
      agent,
      exerciseHabit,
      "2026-09-10",
      600,
    );

    await createActivity(
      agent,
      exerciseHabit,
      "2026-09-15",
      1200,
    );

    await createActivity(
      agent,
      readingHabit,
      "2026-09-10",
      900,
    );

    const response = await agent
      .get(
        `/api/v1/activities?userHabitId=${exerciseHabit}&from=2026-09-09&to=2026-09-11`,
      )
      .expect(200);

    expect(response.body.data.activities).toHaveLength(1);

    expect(
      response.body.data.activities[0],
    ).toMatchObject({
      userHabitId: exerciseHabit,
      activityDate: "2026-09-10",
      durationSeconds: 600,
    });
  });

  it("rejects an invalid habit filter", async () => {
    const agent = await createAuthenticatedAgent();

    const response = await agent
      .get(
        "/api/v1/activities?userHabitId=not-a-uuid",
      )
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
      },
    });
  });

  it("rejects invalid date filters", async () => {
    const agent = await createAuthenticatedAgent();

    const response = await agent
      .get(
        "/api/v1/activities?from=not-a-date&to=also-not-a-date",
      )
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
      },
    });
  });
});