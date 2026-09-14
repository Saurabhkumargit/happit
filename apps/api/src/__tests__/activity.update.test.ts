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

  const email = `activity-update-${crypto.randomUUID()}@example.com`;
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

describe("PATCH /api/v1/activities/:activityId", () => {
  it("requires authentication", async () => {
    const response = await request(app)
      .patch(
        "/api/v1/activities/00000000-0000-0000-0000-000000000000",
      )
      .send({
        durationSeconds: 2400,
      })
      .expect(401);

    expect(response.body).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      },
    });
  });

  it("updates an activity's duration", async () => {
    const agent = await createAuthenticatedAgent();
    const userHabitId = await adoptExercise(agent);
    const activity = await createActivity(agent, userHabitId);

    const response = await agent
      .patch(`/api/v1/activities/${activity.id}`)
      .send({
        durationSeconds: 2400,
      })
      .expect(200);

    expect(response.body.data.activity).toMatchObject({
      id: activity.id,
      userHabitId,
      durationSeconds: 2400,
      activityDate: "2026-09-12",
      source: "MANUAL",
    });
  });

  it("updates an activity's historical date", async () => {
    const agent = await createAuthenticatedAgent();
    const userHabitId = await adoptExercise(agent);
    const activity = await createActivity(agent, userHabitId);

    const response = await agent
      .patch(`/api/v1/activities/${activity.id}`)
      .send({
        activityDate: "2026-09-10",
      })
      .expect(200);

    expect(response.body.data.activity).toMatchObject({
      id: activity.id,
      activityDate: "2026-09-10",
      durationSeconds: 1800,
    });
  });

  it("supports partial updates", async () => {
    const agent = await createAuthenticatedAgent();
    const userHabitId = await adoptExercise(agent);
    const activity = await createActivity(agent, userHabitId);

    const response = await agent
      .patch(`/api/v1/activities/${activity.id}`)
      .send({
        durationSeconds: 2400,
      })
      .expect(200);

    expect(response.body.data.activity.activityDate).toBe(
      "2026-09-12",
    );
    expect(response.body.data.activity.source).toBe("MANUAL");
    expect(response.body.data.activity.durationSeconds).toBe(
      2400,
    );
  });

  it("rejects an empty update", async () => {
    const agent = await createAuthenticatedAgent();
    const userHabitId = await adoptExercise(agent);
    const activity = await createActivity(agent, userHabitId);

    const response = await agent
      .patch(`/api/v1/activities/${activity.id}`)
      .send({})
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
      },
    });
  });

  it("rejects invalid update data", async () => {
    const agent = await createAuthenticatedAgent();
    const userHabitId = await adoptExercise(agent);
    const activity = await createActivity(agent, userHabitId);

    const response = await agent
      .patch(`/api/v1/activities/${activity.id}`)
      .send({
        durationSeconds: 0,
      })
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
      },
    });
  });

  it("rejects an invalid activity ID", async () => {
    const agent = await createAuthenticatedAgent();

    const response = await agent
      .patch("/api/v1/activities/not-a-uuid")
      .send({
        durationSeconds: 2400,
      })
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
      },
    });
  });

  it("returns 404 for a nonexistent activity", async () => {
    const agent = await createAuthenticatedAgent();

    const response = await agent
      .patch(
        "/api/v1/activities/00000000-0000-0000-0000-000000000000",
      )
      .send({
        durationSeconds: 2400,
      })
      .expect(404);

    expect(response.body).toEqual({
      error: {
        code: "ACTIVITY_NOT_FOUND",
        message: "Activity not found",
      },
    });
  });

  it("does not allow editing another user's activity", async () => {
    const firstAgent = await createAuthenticatedAgent();
    const secondAgent = await createAuthenticatedAgent();

    const firstUserHabitId = await adoptExercise(firstAgent);
    const activity = await createActivity(
      firstAgent,
      firstUserHabitId,
    );

    const response = await secondAgent
      .patch(`/api/v1/activities/${activity.id}`)
      .send({
        durationSeconds: 2400,
      })
      .expect(404);

    expect(response.body).toEqual({
      error: {
        code: "ACTIVITY_NOT_FOUND",
        message: "Activity not found",
      },
    });
  });

  it("preserves the activity's adopted habit", async () => {
    const agent = await createAuthenticatedAgent();
    const userHabitId = await adoptExercise(agent);
    const activity = await createActivity(agent, userHabitId);

    const response = await agent
      .patch(`/api/v1/activities/${activity.id}`)
      .send({
        durationSeconds: 2400,
        activityDate: "2026-09-10",
      })
      .expect(200);

    expect(response.body.data.activity.userHabitId).toBe(
      userHabitId,
    );
  });

  it("rejects an invalid resulting timestamp range", async () => {
    const agent = await createAuthenticatedAgent();
    const userHabitId = await adoptExercise(agent);

    const response = await agent
      .post("/api/v1/activities")
      .send({
        userHabitId,
        activityDate: "2026-09-12",
        source: "TIMER",
        durationSeconds: 1800,
        startedAt: "2026-09-12T10:00:00.000Z",
        endedAt: "2026-09-12T10:30:00.000Z",
      })
      .expect(201);

    const activity = response.body.data.activity;

    const updateResponse = await agent
      .patch(`/api/v1/activities/${activity.id}`)
      .send({
        endedAt: "2026-09-12T09:00:00.000Z",
      })
      .expect(400);

    expect(updateResponse.body).toEqual({
      error: {
        code: "INVALID_ACTIVITY",
        message: "Activity end time must be after start time",
      },
    });
  });

  it("does not allow a duration activity to be changed to value/unit fields", async () => {
    const agent = await createAuthenticatedAgent();
    const userHabitId = await adoptExercise(agent);
    const activity = await createActivity(agent, userHabitId);

    const response = await agent
      .patch(`/api/v1/activities/${activity.id}`)
      .send({
        value: 10,
        unit: "MINUTES",
      })
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: "INVALID_ACTIVITY",
        message: "Duration activities must use durationSeconds",
      },
    });
  });
});