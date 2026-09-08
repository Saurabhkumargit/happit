import crypto from "node:crypto";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import app from "../app.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

const createdUserIds: string[] = [];

async function registerUser() {
  const email = `habit-api-${crypto.randomUUID()}@example.com`;
  const password = "password123";

  const agent = request.agent(app);

  const response = await agent
    .post("/api/v1/auth/register")
    .send({
      email,
      password,
    })
    .expect(201);

  createdUserIds.push(response.body.user.id);

  return agent;
}

afterAll(async () => {
  for (const userId of createdUserIds) {
    await db.delete(users).where(eq(users.id, userId));
  }
});

const validHabit = {
  name: "Read",
  description: "Read every day",
  scheduleType: "DAILY",
  scheduleConfig: {},
  targetType: "COUNT",
  targetValue: 20,
  targetUnit: "pages",
  startDate: "2026-09-08",
};

describe("Habit API", () => {
  it("rejects unauthenticated requests", async () => {
    await request(app)
      .get("/api/v1/habits")
      .expect(401);

    await request(app)
      .post("/api/v1/habits")
      .send(validHabit)
      .expect(401);
  });

  it("creates a habit for the authenticated user", async () => {
    const agent = await registerUser();

    const response = await agent
      .post("/api/v1/habits")
      .send(validHabit)
      .expect(201);

    expect(response.body.habit).toMatchObject({
      name: "Read",
      description: "Read every day",
      scheduleType: "DAILY",
      scheduleConfig: {},
      targetType: "COUNT",
      targetValue: "20",
      targetUnit: "pages",
      status: "ACTIVE",
      sortOrder: 0,
    });

    expect(response.body.habit.userId).toBeDefined();
    expect(response.body.habit.id).toEqual(expect.any(String));
  });

  it("lists only the authenticated user's active habits", async () => {
    const agent = await registerUser();

    await agent
      .post("/api/v1/habits")
      .send(validHabit)
      .expect(201);

    const response = await agent
      .get("/api/v1/habits")
      .expect(200);

    expect(response.body.habits).toHaveLength(1);
    expect(response.body.habits[0]).toMatchObject({
      name: "Read",
      status: "ACTIVE",
    });
  });

  it("gets an owned habit", async () => {
    const agent = await registerUser();

    const createResponse = await agent
      .post("/api/v1/habits")
      .send(validHabit)
      .expect(201);

    const habitId = createResponse.body.habit.id;

    const response = await agent
      .get(`/api/v1/habits/${habitId}`)
      .expect(200);

    expect(response.body.habit.id).toBe(habitId);
    expect(response.body.habit.name).toBe("Read");
  });

  it("returns 404 when another user accesses the habit", async () => {
    const owner = await registerUser();
    const otherUser = await registerUser();

    const createResponse = await owner
      .post("/api/v1/habits")
      .send(validHabit)
      .expect(201);

    const habitId = createResponse.body.habit.id;

    await otherUser
      .get(`/api/v1/habits/${habitId}`)
      .expect(404);
  });

  it("updates an owned habit", async () => {
    const agent = await registerUser();

    const createResponse = await agent
      .post("/api/v1/habits")
      .send(validHabit)
      .expect(201);

    const habitId = createResponse.body.habit.id;

    const response = await agent
      .patch(`/api/v1/habits/${habitId}`)
      .send({
        ...validHabit,
        name: "Read More",
        targetValue: 30,
      })
      .expect(200);

    expect(response.body.habit).toMatchObject({
      id: habitId,
      name: "Read More",
      targetValue: "30",
    });
  });

  it("archives a habit", async () => {
    const agent = await registerUser();

    const createResponse = await agent
      .post("/api/v1/habits")
      .send(validHabit)
      .expect(201);

    const habitId = createResponse.body.habit.id;

    const archiveResponse = await agent
      .post(`/api/v1/habits/${habitId}/archive`)
      .expect(200);

    expect(archiveResponse.body.habit.status).toBe("ARCHIVED");

    const listResponse = await agent
      .get("/api/v1/habits")
      .expect(200);

    expect(listResponse.body.habits).toHaveLength(0);
  });

  it("restores an archived habit", async () => {
    const agent = await registerUser();

    const createResponse = await agent
      .post("/api/v1/habits")
      .send(validHabit)
      .expect(201);

    const habitId = createResponse.body.habit.id;

    await agent
      .post(`/api/v1/habits/${habitId}/archive`)
      .expect(200);

    const restoreResponse = await agent
      .post(`/api/v1/habits/${habitId}/restore`)
      .expect(200);

    expect(restoreResponse.body.habit).toMatchObject({
      id: habitId,
      status: "ACTIVE",
    });

    const listResponse = await agent
      .get("/api/v1/habits")
      .expect(200);

    expect(listResponse.body.habits).toHaveLength(1);
  });

  it("deletes a habit", async () => {
    const agent = await registerUser();

    const createResponse = await agent
      .post("/api/v1/habits")
      .send(validHabit)
      .expect(201);

    const habitId = createResponse.body.habit.id;

    await agent
      .delete(`/api/v1/habits/${habitId}`)
      .expect(204);

    await agent
      .get(`/api/v1/habits/${habitId}`)
      .expect(404);
  });

  it("reorders active habits", async () => {
    const agent = await registerUser();

    const first = await agent
      .post("/api/v1/habits")
      .send({
        ...validHabit,
        name: "First",
      })
      .expect(201);

    const second = await agent
      .post("/api/v1/habits")
      .send({
        ...validHabit,
        name: "Second",
      })
      .expect(201);

    const firstId = first.body.habit.id;
    const secondId = second.body.habit.id;

    const response = await agent
      .patch("/api/v1/habits/reorder")
      .send({
        habitIds: [secondId, firstId],
      })
      .expect(200);

    expect(response.body.habits[0].id).toBe(secondId);
    expect(response.body.habits[0].sortOrder).toBe(0);

    expect(response.body.habits[1].id).toBe(firstId);
    expect(response.body.habits[1].sortOrder).toBe(1);
  });

  it("rejects invalid habit data", async () => {
    const agent = await registerUser();

    const response = await agent
      .post("/api/v1/habits")
      .send({
        ...validHabit,
        name: "   ",
        targetValue: 0,
      })
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
      },
    });
  });

  it("rejects an invalid schedule configuration", async () => {
    const agent = await registerUser();

    await agent
      .post("/api/v1/habits")
      .send({
        ...validHabit,
        scheduleType: "WEEKDAYS",
        scheduleConfig: {},
      })
      .expect(400);
  });

  it("rejects duplicate habit IDs during reorder", async () => {
    const agent = await registerUser();

    const createResponse = await agent
      .post("/api/v1/habits")
      .send(validHabit)
      .expect(201);

    const habitId = createResponse.body.habit.id;

    await agent
      .patch("/api/v1/habits/reorder")
      .send({
        habitIds: [habitId, habitId],
      })
      .expect(400);
  });

  it("does not allow another user to update a habit", async () => {
    const owner = await registerUser();
    const otherUser = await registerUser();

    const createResponse = await owner
      .post("/api/v1/habits")
      .send(validHabit)
      .expect(201);

    const habitId = createResponse.body.habit.id;

    await otherUser
      .patch(`/api/v1/habits/${habitId}`)
      .send({
        ...validHabit,
        name: "Unauthorized",
      })
      .expect(404);

    const ownerResponse = await owner
      .get(`/api/v1/habits/${habitId}`)
      .expect(200);

    expect(ownerResponse.body.habit.name).toBe("Read");
  });

  it("does not allow another user to archive a habit", async () => {
    const owner = await registerUser();
    const otherUser = await registerUser();

    const createResponse = await owner
      .post("/api/v1/habits")
      .send(validHabit)
      .expect(201);

    const habitId = createResponse.body.habit.id;

    await otherUser
      .post(`/api/v1/habits/${habitId}/archive`)
      .expect(404);

    const ownerResponse = await owner
      .get(`/api/v1/habits/${habitId}`)
      .expect(200);

    expect(ownerResponse.body.habit.status).toBe("ACTIVE");
  });

  it("ignores a client-supplied userId", async () => {
    const agent = await registerUser();

    const response = await agent
      .post("/api/v1/habits")
      .send({
        ...validHabit,
        userId: crypto.randomUUID(),
      })
      .expect(201);

    expect(response.body.habit.userId).toBeDefined();
    expect(response.body.habit.userId).not.toBe(
      (await response.request).body.userId,
    );
  });

  it("lists habits by status query parameter (ARCHIVED, ALL)", async () => {
    const agent = await registerUser();

    const habit1 = await agent
      .post("/api/v1/habits")
      .send({ ...validHabit, name: "Habit 1" })
      .expect(201);

    const habit2 = await agent
      .post("/api/v1/habits")
      .send({ ...validHabit, name: "Habit 2" })
      .expect(201);

    // Archive habit1
    await agent
      .post(`/api/v1/habits/${habit1.body.habit.id}/archive`)
      .expect(200);

    // Default GET should only return active habit2
    const defaultResponse = await agent.get("/api/v1/habits").expect(200);
    expect(defaultResponse.body.habits).toHaveLength(1);
    expect(defaultResponse.body.habits[0].id).toBe(habit2.body.habit.id);

    // ARCHIVED query should only return habit1
    const archivedResponse = await agent
      .get("/api/v1/habits?status=ARCHIVED")
      .expect(200);
    expect(archivedResponse.body.habits).toHaveLength(1);
    expect(archivedResponse.body.habits[0].id).toBe(habit1.body.habit.id);

    // ALL query should return both
    const allResponse = await agent
      .get("/api/v1/habits?status=ALL")
      .expect(200);
    expect(allResponse.body.habits).toHaveLength(2);
  });

  it("returns 400 HABIT_ARCHIVED when attempting to update an archived habit", async () => {
    const agent = await registerUser();

    const habit = await agent
      .post("/api/v1/habits")
      .send(validHabit)
      .expect(201);

    const habitId = habit.body.habit.id;

    await agent
      .post(`/api/v1/habits/${habitId}/archive`)
      .expect(200);

    const updateResponse = await agent
      .patch(`/api/v1/habits/${habitId}`)
      .send({
        ...validHabit,
        name: "Try To Update",
      })
      .expect(400);

    expect(updateResponse.body).toEqual({
      error: {
        code: "HABIT_ARCHIVED",
        message: "Cannot update an archived habit",
      },
    });
  });

  it("handles archive and restore idempotently", async () => {
    const agent = await registerUser();

    const habit = await agent
      .post("/api/v1/habits")
      .send(validHabit)
      .expect(201);

    const habitId = habit.body.habit.id;

    // Archive first time
    const arch1 = await agent
      .post(`/api/v1/habits/${habitId}/archive`)
      .expect(200);
    expect(arch1.body.habit.status).toBe("ARCHIVED");

    // Archive second time (idempotent 200)
    const arch2 = await agent
      .post(`/api/v1/habits/${habitId}/archive`)
      .expect(200);
    expect(arch2.body.habit.status).toBe("ARCHIVED");
    expect(arch2.body.habit.archivedAt).toBe(arch1.body.habit.archivedAt);

    // Restore first time
    const rest1 = await agent
      .post(`/api/v1/habits/${habitId}/restore`)
      .expect(200);
    expect(rest1.body.habit.status).toBe("ACTIVE");

    // Restore second time (idempotent 200)
    const rest2 = await agent
      .post(`/api/v1/habits/${habitId}/restore`)
      .expect(200);
    expect(rest2.body.habit.status).toBe("ACTIVE");
    expect(rest2.body.habit.sortOrder).toBe(rest1.body.habit.sortOrder);
  });

  it("returns 400 INVALID_REORDER_LIST when reorder does not include all active habits", async () => {
    const agent = await registerUser();

    const habit1 = await agent
      .post("/api/v1/habits")
      .send({ ...validHabit, name: "Habit 1" })
      .expect(201);

    await agent
      .post("/api/v1/habits")
      .send({ ...validHabit, name: "Habit 2" })
      .expect(201);

    const response = await agent
      .patch("/api/v1/habits/reorder")
      .send({
        habitIds: [habit1.body.habit.id],
      })
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: "INVALID_REORDER_LIST",
        message: "Reorder list must contain all active habits",
      },
    });
  });

  it("rejects QUANTITY habit without targetUnit", async () => {
    const agent = await registerUser();

    const response = await agent
      .post("/api/v1/habits")
      .send({
        ...validHabit,
        targetType: "QUANTITY",
        targetUnit: "   ",
      })
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
      },
    });
  });
});