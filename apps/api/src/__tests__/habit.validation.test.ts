import { describe, expect, it } from "vitest";

import {
  habitSchema,
  listHabitsQuerySchema,
} from "../modules/habits/habit.validation.js";

const validBaseHabit = {
  name: "Read",
  description: "Read every day",
  targetType: "COUNT" as const,
  targetValue: 20,
  targetUnit: "pages",
  startDate: "2026-09-08",
};

describe("habit validation", () => {
  it("accepts a DAILY habit", () => {
    const result = habitSchema.safeParse({
      ...validBaseHabit,
      scheduleType: "DAILY",
      scheduleConfig: {},
    });

    expect(result.success).toBe(true);
  });

  it("accepts a WEEKDAYS habit with weekdays", () => {
    const result = habitSchema.safeParse({
      ...validBaseHabit,
      scheduleType: "WEEKDAYS",
      scheduleConfig: {
        weekdays: [1, 3, 5],
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts a WEEKLY_TARGET habit", () => {
    const result = habitSchema.safeParse({
      ...validBaseHabit,
      scheduleType: "WEEKLY_TARGET",
      scheduleConfig: {
        occurrences: 3,
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty habit name", () => {
    const result = habitSchema.safeParse({
      ...validBaseHabit,
      name: "   ",
      scheduleType: "DAILY",
      scheduleConfig: {},
    });

    expect(result.success).toBe(false);
  });

  it("rejects a non-positive target", () => {
    const result = habitSchema.safeParse({
      ...validBaseHabit,
      targetValue: 0,
      scheduleType: "DAILY",
      scheduleConfig: {},
    });

    expect(result.success).toBe(false);
  });

  it("rejects a negative target", () => {
    const result = habitSchema.safeParse({
      ...validBaseHabit,
      targetValue: -5,
      scheduleType: "DAILY",
      scheduleConfig: {},
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty WEEKDAYS selection", () => {
    const result = habitSchema.safeParse({
      ...validBaseHabit,
      scheduleType: "WEEKDAYS",
      scheduleConfig: {
        weekdays: [],
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid weekday", () => {
    const result = habitSchema.safeParse({
      ...validBaseHabit,
      scheduleType: "WEEKDAYS",
      scheduleConfig: {
        weekdays: [7],
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects a non-positive weekly occurrence count", () => {
    const result = habitSchema.safeParse({
      ...validBaseHabit,
      scheduleType: "WEEKLY_TARGET",
      scheduleConfig: {
        occurrences: 0,
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects DAILY with WEEKDAYS configuration", () => {
    const result = habitSchema.safeParse({
      ...validBaseHabit,
      scheduleType: "DAILY",
      scheduleConfig: {
        weekdays: [1, 3, 5],
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects WEEKDAYS without weekdays configuration", () => {
    const result = habitSchema.safeParse({
      ...validBaseHabit,
      scheduleType: "WEEKDAYS",
      scheduleConfig: {},
    });

    expect(result.success).toBe(false);
  });

  it("rejects WEEKLY_TARGET without occurrences", () => {
    const result = habitSchema.safeParse({
      ...validBaseHabit,
      scheduleType: "WEEKLY_TARGET",
      scheduleConfig: {},
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown schedule types", () => {
    const result = habitSchema.safeParse({
      ...validBaseHabit,
      scheduleType: "MONTHLY",
      scheduleConfig: {},
    });

    expect(result.success).toBe(false);
  });

  it("rejects unexpected schedule configuration fields", () => {
    const result = habitSchema.safeParse({
      ...validBaseHabit,
      scheduleType: "DAILY",
      scheduleConfig: {
        weekdays: [1, 3, 5],
      },
    });

    expect(result.success).toBe(false);
  });

  it("requires targetUnit when targetType is QUANTITY", () => {
    const withoutUnit = habitSchema.safeParse({
      ...validBaseHabit,
      targetType: "QUANTITY",
      targetUnit: undefined,
      scheduleType: "DAILY",
      scheduleConfig: {},
    });

    expect(withoutUnit.success).toBe(false);

    const emptyUnit = habitSchema.safeParse({
      ...validBaseHabit,
      targetType: "QUANTITY",
      targetUnit: "   ",
      scheduleType: "DAILY",
      scheduleConfig: {},
    });

    expect(emptyUnit.success).toBe(false);

    const validQuantity = habitSchema.safeParse({
      ...validBaseHabit,
      targetType: "QUANTITY",
      targetUnit: "pages",
      scheduleType: "DAILY",
      scheduleConfig: {},
    });

    expect(validQuantity.success).toBe(true);
  });

  it("normalizes empty string targetUnit to undefined for non-QUANTITY", () => {
    const result = habitSchema.safeParse({
      ...validBaseHabit,
      targetType: "COUNT",
      targetUnit: "   ",
      scheduleType: "DAILY",
      scheduleConfig: {},
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetUnit).toBeUndefined();
    }
  });

  describe("listHabitsQuerySchema", () => {
    it("defaults to ACTIVE status", () => {
      const result = listHabitsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("ACTIVE");
      }
    });

    it("accepts valid status values", () => {
      expect(listHabitsQuerySchema.safeParse({ status: "ACTIVE" }).success).toBe(true);
      expect(listHabitsQuerySchema.safeParse({ status: "ARCHIVED" }).success).toBe(true);
      expect(listHabitsQuerySchema.safeParse({ status: "ALL" }).success).toBe(true);
    });

    it("rejects invalid status values", () => {
      expect(listHabitsQuerySchema.safeParse({ status: "DELETED" }).success).toBe(false);
    });
  });
});