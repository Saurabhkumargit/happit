import { describe, expect, it } from "vitest";
import {
  aggregateActivities,
  evaluateCompletion,
} from "../modules/progress/completion.js";

const target = {
  targetType: "DURATION" as const,
  targetValue: 30,
  targetUnit: "minutes",
};

describe("progress completion evaluation", () => {
  it("marks an occurrence incomplete when there is no activity", () => {
    const result = evaluateCompletion(
      target,
      undefined,
      "2026-09-14",
      "INCOMPLETE",
    );

    expect(result).toEqual({
      date: "2026-09-14",
      state: "INCOMPLETE",
      actualValue: 0,
      targetValue: 30,
      completionPercentage: 0,
    });
  });

  it("marks an occurrence incomplete when activity is below target", () => {
    const result = evaluateCompletion(
      target,
      {
        date: "2026-09-14",
        actualValue: 15,
      },
      "2026-09-14",
      "INCOMPLETE",
    );

    expect(result.state).toBe("INCOMPLETE");
    expect(result.actualValue).toBe(15);
    expect(result.completionPercentage).toBe(50);
  });

  it("marks an occurrence complete when activity exactly reaches target", () => {
    const result = evaluateCompletion(
      target,
      {
        date: "2026-09-14",
        actualValue: 30,
      },
      "2026-09-14",
      "INCOMPLETE",
    );

    expect(result.state).toBe("COMPLETED");
    expect(result.completionPercentage).toBe(100);
  });

  it("keeps over-target activity uncapped", () => {
    const result = evaluateCompletion(
      target,
      {
        date: "2026-09-14",
        actualValue: 45,
      },
      "2026-09-14",
      "INCOMPLETE",
    );

    expect(result.state).toBe("COMPLETED");
    expect(result.actualValue).toBe(45);
    expect(result.completionPercentage).toBe(150);
  });

  it("preserves UPCOMING state even when activity is present", () => {
    const result = evaluateCompletion(
      target,
      {
        date: "2026-09-15",
        actualValue: 30,
      },
      "2026-09-15",
      "UPCOMING",
    );

    expect(result.state).toBe("UPCOMING");
    expect(result.actualValue).toBe(30);
  });

  it("preserves NOT_SCHEDULED state", () => {
    const result = evaluateCompletion(
      target,
      undefined,
      "2026-09-13",
      "NOT_SCHEDULED",
    );

    expect(result.state).toBe("NOT_SCHEDULED");
    expect(result.actualValue).toBe(0);
  });
});

describe("activity aggregation", () => {
  it("aggregates multiple activities on the same day", () => {
    const result = aggregateActivities([
      {
        date: "2026-09-14",
        actualValue: 10,
      },
      {
        date: "2026-09-14",
        actualValue: 15,
      },
      {
        date: "2026-09-14",
        actualValue: 10,
      },
    ]);

    expect(result).toEqual({
      date: "2026-09-14",
      actualValue: 35,
    });
  });

  it("allows multiple activities to collectively complete the target", () => {
    const aggregated = aggregateActivities([
      {
        date: "2026-09-14",
        actualValue: 15,
      },
      {
        date: "2026-09-14",
        actualValue: 15,
      },
    ]);

    const result = evaluateCompletion(
      target,
      aggregated,
      "2026-09-14",
      "INCOMPLETE",
    );

    expect(result.state).toBe("COMPLETED");
    expect(result.actualValue).toBe(30);
    expect(result.completionPercentage).toBe(100);
  });

  it("rejects aggregation of an empty activity list", () => {
    expect(() => aggregateActivities([])).toThrow(
      "Cannot aggregate an empty activity list.",
    );
  });
});

describe("target evaluation edge cases", () => {
  it("marks an occurrence with zero activity as incomplete", () => {
    const result = evaluateCompletion(
      target,
      {
        date: "2026-09-14",
        actualValue: 0,
      },
      "2026-09-14",
      "INCOMPLETE",
    );

    expect(result.state).toBe("INCOMPLETE");
    expect(result.actualValue).toBe(0);
    expect(result.completionPercentage).toBe(0);
  });

  it("preserves NOT_SCHEDULED state even when activity is present", () => {
    const result = evaluateCompletion(
      target,
      {
        date: "2026-09-13",
        actualValue: 30,
      },
      "2026-09-13",
      "NOT_SCHEDULED",
    );

    expect(result.state).toBe("NOT_SCHEDULED");
    expect(result.actualValue).toBe(30);
  });
});