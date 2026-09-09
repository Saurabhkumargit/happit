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

  const email = `habit-reorder-${crypto.randomUUID()}@example.com`;
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

async function getCatalog(agent: ReturnType<typeof request.agent>) {
  const response = await agent
    .get("/api/v1/habits/catalog")
    .expect(200);

  return response.body.habits;
}

describe("PATCH /api/v1/habits/reorder", () => {

  it("requires authentication", async () => {
    await request(app)
      .patch("/api/v1/habits/reorder")
      .send({
        habitIds: [],
      })
      .expect(401);
  });

  it("reorders the user's active habits", async () => {
    const agent = await createAuthenticatedAgent();
    const catalog = await getCatalog(agent);

    const exercise = catalog.find(
      (habit: { key: string }) => habit.key === "exercise",
    );
    const reading = catalog.find(
      (habit: { key: string }) => habit.key === "reading",
    );
    const walking = catalog.find(
      (habit: { key: string }) => habit.key === "walking",
    );

    await agent
      .post("/api/v1/habits")
      .send({ habitId: exercise.id })
      .expect(201);

    await agent
      .post("/api/v1/habits")
      .send({ habitId: reading.id })
      .expect(201);

    await agent
      .post("/api/v1/habits")
      .send({ habitId: walking.id })
      .expect(201);

    const response = await agent
      .patch("/api/v1/habits/reorder")
      .send({
        habitIds: [
          walking.id,
          exercise.id,
          reading.id,
        ],
      })
      .expect(200);

    expect(
      response.body.habits.map(
        (habit: { habitId: string }) => habit.habitId,
      ),
    ).toEqual([
      walking.id,
      exercise.id,
      reading.id,
    ]);

    expect(
      response.body.habits.map(
        (habit: { sortOrder: number }) => habit.sortOrder,
      ),
    ).toEqual([0, 1, 2]);
  });

  it("rejects duplicate habit IDs", async () => {
    const agent = await createAuthenticatedAgent();
    const catalog = await getCatalog(agent);

    const exercise = catalog.find(
      (habit: { key: string }) => habit.key === "exercise",
    );
    const reading = catalog.find(
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

    await agent
      .patch("/api/v1/habits/reorder")
      .send({
        habitIds: [exercise.id, exercise.id],
      })
      .expect(400);
  });

  it("rejects an incomplete active habit order", async () => {
    const agent = await createAuthenticatedAgent();
    const catalog = await getCatalog(agent);

    const exercise = catalog.find(
      (habit: { key: string }) => habit.key === "exercise",
    );
    const reading = catalog.find(
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

    await agent
      .patch("/api/v1/habits/reorder")
      .send({
        habitIds: [exercise.id],
      })
      .expect(400);
  });

  it("rejects a habit that does not belong to the user", async () => {
    const firstAgent = await createAuthenticatedAgent();
    const secondAgent = await createAuthenticatedAgent();

    const catalog = await getCatalog(firstAgent);

    const exercise = catalog.find(
      (habit: { key: string }) => habit.key === "exercise",
    );
    const reading = catalog.find(
      (habit: { key: string }) => habit.key === "reading",
    );

    await firstAgent
      .post("/api/v1/habits")
      .send({ habitId: exercise.id })
      .expect(201);

    await secondAgent
      .post("/api/v1/habits")
      .send({ habitId: reading.id })
      .expect(201);

    await firstAgent
      .patch("/api/v1/habits/reorder")
      .send({
        habitIds: [exercise.id, reading.id],
      })
      .expect(400);
  });

  it("excludes archived habits from the active ordering", async () => {
    const agent = await createAuthenticatedAgent();
    const catalog = await getCatalog(agent);

    const exercise = catalog.find(
      (habit: { key: string }) => habit.key === "exercise",
    );
    const reading = catalog.find(
      (habit: { key: string }) => habit.key === "reading",
    );
    const walking = catalog.find(
      (habit: { key: string }) => habit.key === "walking",
    );

    await agent
      .post("/api/v1/habits")
      .send({ habitId: exercise.id })
      .expect(201);

    await agent
      .post("/api/v1/habits")
      .send({ habitId: reading.id })
      .expect(201);

    await agent
      .post("/api/v1/habits")
      .send({ habitId: walking.id })
      .expect(201);

    await agent
      .post(`/api/v1/habits/${reading.id}/archive`)
      .expect(200);

    const response = await agent
      .patch("/api/v1/habits/reorder")
      .send({
        habitIds: [walking.id, exercise.id],
      })
      .expect(200);

    expect(
      response.body.habits
        .filter(
          (habit: { status: string }) =>
            habit.status === "ACTIVE",
        )
        .map(
          (habit: { habitId: string }) =>
            habit.habitId,
        ),
    ).toEqual([
      walking.id,
      exercise.id,
    ]);
  });

  it("does not modify another user's ordering", async () => {
    const firstAgent = await createAuthenticatedAgent();
    const secondAgent = await createAuthenticatedAgent();

    const catalog = await getCatalog(firstAgent);

    const exercise = catalog.find(
      (habit: { key: string }) => habit.key === "exercise",
    );
    const reading = catalog.find(
      (habit: { key: string }) => habit.key === "reading",
    );

    await firstAgent
      .post("/api/v1/habits")
      .send({ habitId: exercise.id })
      .expect(201);

    await firstAgent
      .post("/api/v1/habits")
      .send({ habitId: reading.id })
      .expect(201);

    await secondAgent
      .post("/api/v1/habits")
      .send({ habitId: exercise.id })
      .expect(201);

    await secondAgent
      .post("/api/v1/habits")
      .send({ habitId: reading.id })
      .expect(201);

    await firstAgent
      .patch("/api/v1/habits/reorder")
      .send({
        habitIds: [reading.id, exercise.id],
      })
      .expect(200);

    const secondResponse = await secondAgent
      .get("/api/v1/habits")
      .expect(200);

    expect(
      secondResponse.body.habits.map(
        (habit: { habitId: string }) => habit.habitId,
      ),
    ).toEqual([
      exercise.id,
      reading.id,
    ]);
  });
});