import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

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
  const email = `habit-adoption-${crypto.randomUUID()}@example.com`;
  testEmails.push(email);

  const agent = request.agent(app);

  await agent
    .post("/api/v1/auth/register")
    .send({
      email,
      password: "password123",
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

describe("POST /api/v1/habits", () => {
  it("requires authentication", async () => {
    const habitId = await getExerciseId();

    const response = await request(app)
      .post("/api/v1/habits")
      .send({ habitId })
      .expect(401);

    expect(response.body).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      },
    });
  });

  it("adopts an available canonical habit", async () => {
    const agent = await createAuthenticatedAgent();
    const habitId = await getExerciseId();

    const response = await agent
      .post("/api/v1/habits")
      .send({ habitId })
      .expect(201);

    expect(response.body.habit).toMatchObject({
      habitId,
      status: "ACTIVE",
      sortOrder: 0,
    });

    expect(response.body.habit.habit).toMatchObject({
      id: habitId,
      key: "exercise",
      name: "Exercise",
      scheduleType: "DAILY",
      targetType: "DURATION",
      targetValue: "30",
      targetUnit: "minutes",
      status: "AVAILABLE",
    });
  });

  it("assigns the next sort order when adopting another habit", async () => {
    const agent = await createAuthenticatedAgent();

    const catalogResponse = await request(app)
      .get("/api/v1/habits/catalog")
      .expect(200);

    const [exercise, reading] = catalogResponse.body.habits.filter(
      (habit: { key: string }) =>
        habit.key === "exercise" || habit.key === "reading",
    );

    await agent
      .post("/api/v1/habits")
      .send({ habitId: exercise.id })
      .expect(201);

    const secondResponse = await agent
      .post("/api/v1/habits")
      .send({ habitId: reading.id })
      .expect(201);

    expect(secondResponse.body.habit.sortOrder).toBe(1);
  });

  it("rejects duplicate adoption", async () => {
    const agent = await createAuthenticatedAgent();
    const habitId = await getExerciseId();

    await agent
      .post("/api/v1/habits")
      .send({ habitId })
      .expect(201);

    const response = await agent
      .post("/api/v1/habits")
      .send({ habitId })
      .expect(409);

    expect(response.body).toEqual({
      error: {
        code: "HABIT_ALREADY_ADOPTED",
        message: "Habit has already been adopted",
      },
    });
  });

  it("rejects invalid request data", async () => {
    const agent = await createAuthenticatedAgent();

    const response = await agent
      .post("/api/v1/habits")
      .send({
        habitId: "not-a-uuid",
      })
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
      },
    });
  });

  it("does not allow client fields to override the canonical habit", async () => {
    const agent = await createAuthenticatedAgent();
    const habitId = await getExerciseId();

    const response = await agent
      .post("/api/v1/habits")
      .send({
        habitId,
        name: "My Custom Habit",
        description: "Custom description",
        scheduleType: "WEEKLY_TARGET",
        targetType: "COUNT",
        targetValue: 999,
        targetUnit: "times",
      })
      .expect(201);

    expect(response.body.habit.habit).toMatchObject({
      id: habitId,
      name: "Exercise",
      description: "Move your body and stay physically active.",
      scheduleType: "DAILY",
      targetType: "DURATION",
      targetValue: "30",
      targetUnit: "minutes",
    });
  });

  it("rejects a nonexistent canonical habit", async () => {
    const agent = await createAuthenticatedAgent();

    const response = await agent
      .post("/api/v1/habits")
      .send({
        habitId: "00000000-0000-0000-0000-000000000000",
      })
      .expect(404);

    expect(response.body).toEqual({
      error: {
        code: "HABIT_NOT_FOUND",
        message: "Habit not found",
      },
    });
  });
});