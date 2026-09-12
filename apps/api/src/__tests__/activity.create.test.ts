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

  const email = `activity-create-${crypto.randomUUID()}@example.com`;
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

  return {
    habitId: exerciseId,
    userHabitId: response.body.habit.id as string,
  };
}

describe("POST /api/v1/activities", () => {
  it("requires authentication", async () => {
    const response = await request(app)
      .post("/api/v1/activities")
      .send({
        userHabitId: "00000000-0000-0000-0000-000000000000",
        activityDate: "2026-09-12",
        source: "MANUAL",
        durationSeconds: 1800,
      })
      .expect(401);

    expect(response.body).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      },
    });
  });

  it("creates a manual activity for the user's adopted habit", async () => {
    const agent = await createAuthenticatedAgent();
    const { userHabitId } = await adoptExercise(agent);

    const response = await agent
      .post("/api/v1/activities")
      .send({
        userHabitId,
        activityDate: "2026-09-12",
        source: "MANUAL",
        durationSeconds: 1800,
      })
      .expect(201);

    expect(response.body.data.activity).toMatchObject({
      userHabitId,
      source: "MANUAL",
      activityDate: "2026-09-12",
      durationSeconds: 1800,
    });
  });

  it("creates a timer activity for the user's adopted habit", async () => {
    const agent = await createAuthenticatedAgent();
    const { userHabitId } = await adoptExercise(agent);

    const startedAt = "2026-09-12T10:00:00.000Z";
    const endedAt = "2026-09-12T10:30:00.000Z";

    const response = await agent
      .post("/api/v1/activities")
      .send({
        userHabitId,
        activityDate: "2026-09-12",
        source: "TIMER",
        durationSeconds: 1800,
        startedAt,
        endedAt,
      })
      .expect(201);

    expect(response.body.data.activity).toMatchObject({
      userHabitId,
      source: "TIMER",
      activityDate: "2026-09-12",
      durationSeconds: 1800,
      startedAt,
      endedAt,
    });
  });

  it("allows a partial activity below the habit target", async () => {
    const agent = await createAuthenticatedAgent();
    const { userHabitId } = await adoptExercise(agent);

    const response = await agent
      .post("/api/v1/activities")
      .send({
        userHabitId,
        activityDate: "2026-09-12",
        source: "MANUAL",
        durationSeconds: 600,
      })
      .expect(201);

    expect(response.body.data.activity.durationSeconds).toBe(600);
  });

  it("allows an activity above the habit target without clamping", async () => {
    const agent = await createAuthenticatedAgent();
    const { userHabitId } = await adoptExercise(agent);

    const response = await agent
      .post("/api/v1/activities")
      .send({
        userHabitId,
        activityDate: "2026-09-12",
        source: "MANUAL",
        durationSeconds: 3600,
      })
      .expect(201);

    expect(response.body.data.activity.durationSeconds).toBe(3600);
  });

  it("allows multiple activities for the same habit on the same day", async () => {
    const agent = await createAuthenticatedAgent();
    const { userHabitId } = await adoptExercise(agent);

    const firstResponse = await agent
      .post("/api/v1/activities")
      .send({
        userHabitId,
        activityDate: "2026-09-12",
        source: "MANUAL",
        durationSeconds: 600,
      })
      .expect(201);

    const secondResponse = await agent
      .post("/api/v1/activities")
      .send({
        userHabitId,
        activityDate: "2026-09-12",
        source: "MANUAL",
        durationSeconds: 900,
      })
      .expect(201);

    expect(
      firstResponse.body.data.activity.id,
    ).not.toBe(secondResponse.body.data.activity.id);

    expect(
      firstResponse.body.data.activity.durationSeconds,
    ).toBe(600);

    expect(
      secondResponse.body.data.activity.durationSeconds,
    ).toBe(900);
  });

  it("does not allow a user to record activity against another user's habit", async () => {
    const firstAgent = await createAuthenticatedAgent();
    const secondAgent = await createAuthenticatedAgent();

    const { userHabitId } = await adoptExercise(firstAgent);

    const response = await secondAgent
      .post("/api/v1/activities")
      .send({
        userHabitId,
        activityDate: "2026-09-12",
        source: "MANUAL",
        durationSeconds: 1800,
      })
      .expect(404);

    expect(response.body).toEqual({
      error: {
        code: "HABIT_NOT_FOUND",
        message: "Habit not found",
      },
    });
  });

  it("does not allow activity for an archived habit", async () => {
    const agent = await createAuthenticatedAgent();

    const { habitId, userHabitId } =
      await adoptExercise(agent);

    await agent
      .post(`/api/v1/habits/${habitId}/archive`)
      .expect(200);

    const response = await agent
      .post("/api/v1/activities")
      .send({
        userHabitId,
        activityDate: "2026-09-12",
        source: "MANUAL",
        durationSeconds: 1800,
      })
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: "HABIT_NOT_ACTIVE",
        message: "Cannot record activity for an archived habit",
      },
    });
  });

  it("rejects a duration activity without durationSeconds", async () => {
    const agent = await createAuthenticatedAgent();
    const { userHabitId } = await adoptExercise(agent);

    const response = await agent
      .post("/api/v1/activities")
      .send({
        userHabitId,
        activityDate: "2026-09-12",
        source: "MANUAL",
      })
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: "INVALID_ACTIVITY",
        message: "Duration is required for this habit",
      },
    });
  });

  it("rejects a non-positive duration", async () => {
    const agent = await createAuthenticatedAgent();
    const { userHabitId } = await adoptExercise(agent);

    const response = await agent
      .post("/api/v1/activities")
      .send({
        userHabitId,
        activityDate: "2026-09-12",
        source: "MANUAL",
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

  it("rejects invalid request data", async () => {
    const agent = await createAuthenticatedAgent();

    const response = await agent
      .post("/api/v1/activities")
      .send({
        userHabitId: "not-a-uuid",
        activityDate: "not-a-date",
        source: "INVALID",
        durationSeconds: -10,
      })
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
      },
    });
  });

  it("rejects an invalid end time", async () => {
    const agent = await createAuthenticatedAgent();
    const { userHabitId } = await adoptExercise(agent);

    const response = await agent
      .post("/api/v1/activities")
      .send({
        userHabitId,
        activityDate: "2026-09-12",
        source: "TIMER",
        durationSeconds: 1800,
        startedAt: "2026-09-12T10:30:00.000Z",
        endedAt: "2026-09-12T10:00:00.000Z",
      })
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: "INVALID_ACTIVITY",
        message: "Activity end time must be after start time",
      },
    });
  });

  it("returns the original activity when the same idempotency key is retried", async () => {
  const agent = await createAuthenticatedAgent();
  const { userHabitId } = await adoptExercise(agent);

  const idempotencyKey = crypto.randomUUID();

  const payload = {
    userHabitId,
    activityDate: "2026-09-12",
    source: "MANUAL",
    durationSeconds: 1800,
  };

  const firstResponse = await agent
    .post("/api/v1/activities")
    .set("Idempotency-Key", idempotencyKey)
    .send(payload)
    .expect(201);

  const secondResponse = await agent
    .post("/api/v1/activities")
    .set("Idempotency-Key", idempotencyKey)
    .send(payload)
    .expect(201);

  expect(secondResponse.body.data.activity).toEqual(
    firstResponse.body.data.activity,
  );
});

it("rejects a reused idempotency key with a different payload", async () => {
  const agent = await createAuthenticatedAgent();
  const { userHabitId } = await adoptExercise(agent);

  const idempotencyKey = crypto.randomUUID();

  await agent
    .post("/api/v1/activities")
    .set("Idempotency-Key", idempotencyKey)
    .send({
      userHabitId,
      activityDate: "2026-09-12",
      source: "MANUAL",
      durationSeconds: 1800,
    })
    .expect(201);

  const response = await agent
    .post("/api/v1/activities")
    .set("Idempotency-Key", idempotencyKey)
    .send({
      userHabitId,
      activityDate: "2026-09-12",
      source: "MANUAL",
      durationSeconds: 3600,
    })
    .expect(409);

  expect(response.body).toEqual({
    error: {
      code: "IDEMPOTENCY_KEY_REUSED",
      message: "Idempotency key has already been used for a different request",
    },
  });
});

it("allows the same idempotency key for different users", async () => {
  const firstAgent = await createAuthenticatedAgent();
  const secondAgent = await createAuthenticatedAgent();

  const firstHabit = await adoptExercise(firstAgent);
  const secondHabit = await adoptExercise(secondAgent);

  const idempotencyKey = crypto.randomUUID();

  const firstResponse = await firstAgent
    .post("/api/v1/activities")
    .set("Idempotency-Key", idempotencyKey)
    .send({
      userHabitId: firstHabit.userHabitId,
      activityDate: "2026-09-12",
      source: "MANUAL",
      durationSeconds: 1800,
    })
    .expect(201);

  const secondResponse = await secondAgent
    .post("/api/v1/activities")
    .set("Idempotency-Key", idempotencyKey)
    .send({
      userHabitId: secondHabit.userHabitId,
      activityDate: "2026-09-12",
      source: "MANUAL",
      durationSeconds: 1800,
    })
    .expect(201);

  expect(firstResponse.body.data.activity.id).not.toBe(
    secondResponse.body.data.activity.id,
  );

  expect(firstResponse.body.data.activity.userId).not.toBe(
    secondResponse.body.data.activity.userId,
  );

  expect(firstResponse.body.data.activity.idempotencyKey).toBe(
    idempotencyKey,
  );

  expect(secondResponse.body.data.activity.idempotencyKey).toBe(
    idempotencyKey,
  );
});
});