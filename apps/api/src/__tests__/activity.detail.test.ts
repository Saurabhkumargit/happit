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

  const email = `activity-detail-${crypto.randomUUID()}@example.com`;
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

async function adoptExercise(
  agent: ReturnType<typeof request.agent>,
) {
  const exerciseId = await getExerciseId();

  const response = await agent
    .post("/api/v1/habits")
    .send({
      habitId: exerciseId,
    })
    .expect(201);

  return response.body.habit.id as string;
}

async function createActivity(
  agent: ReturnType<typeof request.agent>,
  userHabitId: string,
) {
  const response = await agent
    .post("/api/v1/activities")
    .send({
      userHabitId,
      activityDate: "2026-09-12",
      source: "MANUAL",
      durationSeconds: 1800,
    })
    .expect(201);

  return response.body.data.activity;
}

describe("GET /api/v1/activities/:activityId", () => {
  it("requires authentication", async () => {
    const response = await request(app)
      .get(
        "/api/v1/activities/00000000-0000-0000-0000-000000000000",
      )
      .expect(401);

    expect(response.body).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      },
    });
  });

  it("returns the authenticated user's activity", async () => {
    const agent = await createAuthenticatedAgent();
    const userHabitId = await adoptExercise(agent);
    const activity = await createActivity(agent, userHabitId);

    const response = await agent
      .get(`/api/v1/activities/${activity.id}`)
      .expect(200);

    expect(response.body.data.activity).toMatchObject({
      id: activity.id,
      userHabitId,
      source: "MANUAL",
      activityDate: "2026-09-12",
      durationSeconds: 1800,
    });
  });

  it("includes the canonical habit information", async () => {
    const agent = await createAuthenticatedAgent();
    const userHabitId = await adoptExercise(agent);
    const activity = await createActivity(agent, userHabitId);

    const response = await agent
      .get(`/api/v1/activities/${activity.id}`)
      .expect(200);

    expect(response.body.data.activity.habit).toMatchObject({
      key: "exercise",
      name: "Exercise",
      targetType: "DURATION",
      targetUnit: "minutes",
    });
  });

  it("returns 404 for a nonexistent activity", async () => {
    const agent = await createAuthenticatedAgent();

    const response = await agent
      .get(
        "/api/v1/activities/00000000-0000-0000-0000-000000000000",
      )
      .expect(404);

    expect(response.body).toEqual({
      error: {
        code: "ACTIVITY_NOT_FOUND",
        message: "Activity not found",
      },
    });
  });

  it("does not allow a user to access another user's activity", async () => {
    const firstAgent = await createAuthenticatedAgent();
    const secondAgent = await createAuthenticatedAgent();

    const firstUserHabitId = await adoptExercise(firstAgent);
    const activity = await createActivity(
      firstAgent,
      firstUserHabitId,
    );

    const response = await secondAgent
      .get(`/api/v1/activities/${activity.id}`)
      .expect(404);

    expect(response.body).toEqual({
      error: {
        code: "ACTIVITY_NOT_FOUND",
        message: "Activity not found",
      },
    });
  });

  it("rejects an invalid activity ID", async () => {
    const agent = await createAuthenticatedAgent();

    const response = await agent
      .get("/api/v1/activities/not-a-uuid")
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
      },
    });
  });
});