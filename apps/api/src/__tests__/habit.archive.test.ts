import crypto from "node:crypto";

import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";

import app from "../app.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

async function createAuthenticatedAgent() {
  const agent = request.agent(app);

  const email = `habit-archive-${crypto.randomUUID()}@example.com`;
  const password = "test-password";

  await agent
    .post("/api/v1/auth/register")
    .send({
      email,
      password,
    })
    .expect(201);

  return agent;
}

async function getExerciseId(agent: ReturnType<typeof request.agent>) {
  const response = await agent
    .get("/api/v1/habits/catalog")
    .expect(200);

  const exercise = response.body.habits.find(
    (habit: { key: string }) => habit.key === "exercise",
  );

  return exercise.id;
}

describe("POST /api/v1/habits/:habitId/archive", () => {
  afterAll(async () => {
    await db.delete(users);
  });

  it("requires authentication", async () => {
    await request(app)
      .post(
        "/api/v1/habits/00000000-0000-0000-0000-000000000000/archive",
      )
      .expect(401);
  });

  it("archives the user's adopted habit", async () => {
    const agent = await createAuthenticatedAgent();
    const exerciseId = await getExerciseId(agent);

    const adoptionResponse = await agent
      .post("/api/v1/habits")
      .send({ habitId: exerciseId })
      .expect(201);

    const userHabitId = adoptionResponse.body.habit.id;

    const response = await agent
      .post(`/api/v1/habits/${exerciseId}/archive`)
      .expect(200);

    expect(response.body.habit).toMatchObject({
      id: userHabitId,
      habitId: exerciseId,
      status: "ARCHIVED",
    });

    expect(response.body.habit.archivedAt).not.toBeNull();
  });

  it("returns 404 when the user has not adopted the habit", async () => {
    const agent = await createAuthenticatedAgent();
    const exerciseId = await getExerciseId(agent);

    await agent
      .post(`/api/v1/habits/${exerciseId}/archive`)
      .expect(404);
  });

  it("does not allow a user to archive another user's habit", async () => {
    const firstAgent = await createAuthenticatedAgent();
    const secondAgent = await createAuthenticatedAgent();

    const exerciseId = await getExerciseId(firstAgent);

    const adoptionResponse = await firstAgent
      .post("/api/v1/habits")
      .send({ habitId: exerciseId })
      .expect(201);

    const userHabitId = adoptionResponse.body.habit.id;

    await secondAgent
      .post(`/api/v1/habits/${exerciseId}/archive`)
      .expect(404);

    const firstResponse = await firstAgent
      .get(`/api/v1/habits/${exerciseId}`)
      .expect(200);

    expect(firstResponse.body.habit).toMatchObject({
      id: userHabitId,
      status: "ACTIVE",
    });
  });

  it("rejects archiving an already archived habit", async () => {
    const agent = await createAuthenticatedAgent();
    const exerciseId = await getExerciseId(agent);

    await agent
      .post("/api/v1/habits")
      .send({ habitId: exerciseId })
      .expect(201);

    await agent
      .post(`/api/v1/habits/${exerciseId}/archive`)
      .expect(200);

    const response = await agent
      .post(`/api/v1/habits/${exerciseId}/archive`)
      .expect(409);

    expect(response.body.error).toMatchObject({
      code: "HABIT_ALREADY_ARCHIVED",
    });
  });
});