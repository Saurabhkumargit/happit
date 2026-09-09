import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../app.js";
import { db } from "../db/index.js";
import { habits } from "../db/schema.js";
import { eq } from "drizzle-orm";

describe("GET /api/v1/habits/catalog", () => {
  it("returns the available canonical habits", async () => {
    const response = await request(app)
      .get("/api/v1/habits/catalog")
      .expect(200);

    expect(response.body.habits).toHaveLength(6);

    expect(response.body.habits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "exercise",
          name: "Exercise",
          scheduleType: "DAILY",
          targetType: "DURATION",
          targetValue: "30",
          targetUnit: "minutes",
          status: "AVAILABLE",
        }),
        expect.objectContaining({
          key: "coding",
          name: "Coding",
          scheduleType: "WEEKDAYS",
          targetType: "DURATION",
          targetValue: "60",
          targetUnit: "minutes",
          status: "AVAILABLE",
        }),
      ]),
    );
  });

  it("does not return unavailable habits", async () => {
    const [habit] = await db
      .insert(habits)
      .values({
        key: "test-unavailable-catalog-habit",
        name: "Test Unavailable Habit",
        description: "Used to test unavailable catalog habits.",
        scheduleType: "DAILY",
        scheduleConfig: {},
        targetType: "DURATION",
        targetValue: "10",
        targetUnit: "minutes",
        status: "UNAVAILABLE",
      })
      .returning();

    try {
      const response = await request(app)
        .get("/api/v1/habits/catalog")
        .expect(200);

      expect(response.body.habits).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: habit.id,
          }),
        ]),
      );
    } finally {
      await db.delete(habits).where(eq(habits.id, habit.id));
    }
  });
});

describe("GET /api/v1/habits/catalog/:habitId", () => {
  it("returns an available habit by id", async () => {
    const catalogResponse = await request(app)
      .get("/api/v1/habits/catalog")
      .expect(200);

    const exercise = catalogResponse.body.habits.find(
      (habit: { key: string }) => habit.key === "exercise",
    );

    expect(exercise).toBeDefined();

    const response = await request(app)
      .get(`/api/v1/habits/catalog/${exercise.id}`)
      .expect(200);

    expect(response.body.habit).toMatchObject({
      id: exercise.id,
      key: "exercise",
      name: "Exercise",
      scheduleType: "DAILY",
      targetType: "DURATION",
      targetValue: "30",
      targetUnit: "minutes",
      status: "AVAILABLE",
    });
  });

  it("returns 404 for a nonexistent habit", async () => {
    const response = await request(app)
      .get("/api/v1/habits/catalog/00000000-0000-0000-0000-000000000000")
      .expect(404);

    expect(response.body).toEqual({
      error: {
        code: "HABIT_NOT_FOUND",
        message: "Habit not found",
      },
    });
  });

  it("does not return an unavailable habit by id", async () => {
    const [habit] = await db
      .insert(habits)
      .values({
        key: "test-unavailable-by-id",
        name: "Test Unavailable By ID",
        description: "Used to test unavailable habit lookup.",
        scheduleType: "DAILY",
        scheduleConfig: {},
        targetType: "DURATION",
        targetValue: "10",
        targetUnit: "minutes",
        status: "UNAVAILABLE",
      })
      .returning();

    try {
      const response = await request(app).get(
        `/api/v1/habits/catalog/${habit.id}`,
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: {
          code: "HABIT_NOT_FOUND",
          message: "Habit not found",
        },
      });
    } finally {
      await db.delete(habits).where(eq(habits.id, habit.id));
    }
  });
});