import crypto from "node:crypto";

import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";

import app from "../app.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

async function createAuthenticatedAgent() {
  const agent = request.agent(app);

  const email = `habit-delete-${crypto.randomUUID()}@example.com`;
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

async function getExerciseId(
  agent: ReturnType<typeof request.agent>,
) {
  const response = await agent
    .get("/api/v1/habits/catalog")
    .expect(200);

  const exercise = response.body.habits.find(
    (habit: { key: string }) => habit.key === "exercise",
  );

  return exercise.id;
}

describe("DELETE /api/v1/habits/:habitId", () => {
  afterAll(async () => {
    await db.delete(users);
  });

  it("requires authentication", async () => {
    await request(app)
      .delete(
        "/api/v1/habits/00000000-0000-0000-0000-000000000000",
      )
      .expect(401);
  });

  it("deletes the user's adopted habit", async () => {
    const agent = await createAuthenticatedAgent();
    const exerciseId = await getExerciseId(agent);

    await agent
      .post("/api/v1/habits")
      .send({ habitId: exerciseId })
      .expect(201);

    await agent
      .delete(`/api/v1/habits/${exerciseId}`)
      .expect(204);

    await agent
      .get(`/api/v1/habits/${exerciseId}`)
      .expect(404);

    const response = await agent
      .get("/api/v1/habits")
      .expect(200);

    expect(response.body.habits).toEqual([]);
  });

  it("returns 404 when the user has not adopted the habit", async () => {
    const agent = await createAuthenticatedAgent();
    const exerciseId = await getExerciseId(agent);

    await agent
      .delete(`/api/v1/habits/${exerciseId}`)
      .expect(404);
  });

  it("does not allow a user to delete another user's habit", async () => {
    const firstAgent = await createAuthenticatedAgent();
    const secondAgent = await createAuthenticatedAgent();

    const exerciseId = await getExerciseId(firstAgent);

    await firstAgent
      .post("/api/v1/habits")
      .send({ habitId: exerciseId })
      .expect(201);

    await secondAgent
      .delete(`/api/v1/habits/${exerciseId}`)
      .expect(404);

    const firstResponse = await firstAgent
      .get(`/api/v1/habits/${exerciseId}`)
      .expect(200);

    expect(firstResponse.body.habit.status).toBe("ACTIVE");
  });

  it("does not delete the canonical habit from the catalog", async () => {
    const agent = await createAuthenticatedAgent();
    const exerciseId = await getExerciseId(agent);

    await agent
      .post("/api/v1/habits")
      .send({ habitId: exerciseId })
      .expect(201);

    await agent
      .delete(`/api/v1/habits/${exerciseId}`)
      .expect(204);

    const response = await agent
      .get("/api/v1/habits/catalog")
      .expect(200);

    const exercise = response.body.habits.find(
      (habit: { id: string }) => habit.id === exerciseId,
    );

    expect(exercise).toBeDefined();
    expect(exercise.key).toBe("exercise");
    expect(exercise.name).toBe("Exercise");
  });

  it("allows the same user to adopt the canonical habit again after deletion", async () => {
    const agent = await createAuthenticatedAgent();
    const exerciseId = await getExerciseId(agent);

    await agent
      .post("/api/v1/habits")
      .send({ habitId: exerciseId })
      .expect(201);

    await agent
      .delete(`/api/v1/habits/${exerciseId}`)
      .expect(204);

    const response = await agent
      .post("/api/v1/habits")
      .send({ habitId: exerciseId })
      .expect(201);

    expect(response.body.habit).toMatchObject({
      habitId: exerciseId,
      status: "ACTIVE",
    });
  });
});