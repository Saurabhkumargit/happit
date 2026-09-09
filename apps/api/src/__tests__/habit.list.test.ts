import request from "supertest";
import crypto from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

import app from "../app.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

async function createAuthenticatedAgent() {
  const agent = request.agent(app);

  const email = `habit-list-${crypto.randomUUID()}@example.com`;
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

describe("GET /api/v1/habits", () => {
  afterAll(async () => {
    await db.delete(users);
  });

  it("requires authentication", async () => {
    await request(app).get("/api/v1/habits").expect(401);
  });

  it("returns an empty list when the user has no adopted habits", async () => {
    const agent = await createAuthenticatedAgent();

    const response = await agent.get("/api/v1/habits").expect(200);

    expect(response.body).toEqual({
      habits: [],
    });
  });

  it("returns the user's adopted canonical habits", async () => {
    const agent = await createAuthenticatedAgent();

    const catalogResponse = await agent
      .get("/api/v1/habits/catalog")
      .expect(200);

    const exercise = catalogResponse.body.habits.find(
      (habit: { key: string }) => habit.key === "exercise",
    );

    const reading = catalogResponse.body.habits.find(
      (habit: { key: string }) => habit.key === "reading",
    );

    await agent
      .post("/api/v1/habits")
      .send({ habitId: exercise.id })
      .expect(201);

    await agent
      .post("/api/v1/habits")
      .send({ habitId: reading.id })
      .expect(201);

    const response = await agent.get("/api/v1/habits").expect(200);

    expect(response.body.habits).toHaveLength(2);

    expect(response.body.habits[0]).toMatchObject({
      habitId: exercise.id,
      status: "ACTIVE",
      sortOrder: 0,
      habit: {
        id: exercise.id,
        key: "exercise",
        name: "Exercise",
      },
    });

    expect(response.body.habits[1]).toMatchObject({
      habitId: reading.id,
      status: "ACTIVE",
      sortOrder: 1,
      habit: {
        id: reading.id,
        key: "reading",
        name: "Reading",
      },
    });
  });

  it("does not return another user's adopted habits", async () => {
    const firstAgent = await createAuthenticatedAgent();
    const secondAgent = await createAuthenticatedAgent();

    const catalogResponse = await firstAgent
      .get("/api/v1/habits/catalog")
      .expect(200);

    const exercise = catalogResponse.body.habits.find(
      (habit: { key: string }) => habit.key === "exercise",
    );

    await firstAgent
      .post("/api/v1/habits")
      .send({ habitId: exercise.id })
      .expect(201);

    const firstResponse = await firstAgent.get("/api/v1/habits").expect(200);

    const secondResponse = await secondAgent.get("/api/v1/habits").expect(200);

    expect(firstResponse.body.habits).toHaveLength(1);
    expect(secondResponse.body.habits).toEqual([]);
  });

  it("returns the user's adopted habit by id", async () => {
    const agent = await createAuthenticatedAgent();

    const catalogResponse = await agent
      .get("/api/v1/habits/catalog")
      .expect(200);

    const exercise = catalogResponse.body.habits.find(
      (habit: { key: string }) => habit.key === "exercise",
    );

    await agent
      .post("/api/v1/habits")
      .send({ habitId: exercise.id })
      .expect(201);

    const response = await agent
      .get(`/api/v1/habits/${exercise.id}`)
      .expect(200);

    expect(response.body.habit).toMatchObject({
      habitId: exercise.id,
      status: "ACTIVE",
      sortOrder: 0,
      habit: {
        id: exercise.id,
        key: "exercise",
        name: "Exercise",
      },
    });
  });

  it("returns 404 when the user has not adopted the habit", async () => {
    const agent = await createAuthenticatedAgent();

    const catalogResponse = await agent
      .get("/api/v1/habits/catalog")
      .expect(200);

    const exercise = catalogResponse.body.habits.find(
      (habit: { key: string }) => habit.key === "exercise",
    );

    await agent.get(`/api/v1/habits/${exercise.id}`).expect(404);
  });

  it("does not allow access to another user's adopted habit", async () => {
    const firstAgent = await createAuthenticatedAgent();
    const secondAgent = await createAuthenticatedAgent();

    const catalogResponse = await firstAgent
      .get("/api/v1/habits/catalog")
      .expect(200);

    const exercise = catalogResponse.body.habits.find(
      (habit: { key: string }) => habit.key === "exercise",
    );

    const adoptionResponse = await firstAgent
      .post("/api/v1/habits")
      .send({ habitId: exercise.id })
      .expect(201);

    const adoptedHabitId = adoptionResponse.body.habit.id;

    await secondAgent.get(`/api/v1/habits/${adoptedHabitId}`).expect(404);
  });

  it("requires authentication for habit details", async () => {
    await request(app)
      .get("/api/v1/habits/00000000-0000-0000-0000-000000000000")
      .expect(401);
  });
});
