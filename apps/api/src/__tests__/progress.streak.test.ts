import { describe, expect, it } from "vitest";
import { calculateStreaks } from "../modules/progress/streak.js";
import type { ProgressOccurrence } from "../modules/progress/progress.types.js";

function occurrence(
  date: string,
  state: ProgressOccurrence["state"],
): ProgressOccurrence {
  return {
    date,
    state,
    actualValue: state === "COMPLETED" ? 30 : 0,
    targetValue: 30,
    completionPercentage: state === "COMPLETED" ? 100 : 0,
  };
}

describe("progress streaks", () => {
  it("calculates the current and longest completed streak", () => {
    const result = calculateStreaks([
      occurrence("2026-09-01", "COMPLETED"),
      occurrence("2026-09-02", "COMPLETED"),
      occurrence("2026-09-03", "INCOMPLETE"),
      occurrence("2026-09-04", "COMPLETED"),
      occurrence("2026-09-05", "COMPLETED"),
      occurrence("2026-09-06", "COMPLETED"),
    ]);

    expect(result).toEqual({
      current: 3,
      longest: 3,
    });
  });

  it("breaks a streak when a scheduled occurrence is incomplete", () => {
    const result = calculateStreaks([
      occurrence("2026-09-01", "COMPLETED"),
      occurrence("2026-09-02", "INCOMPLETE"),
      occurrence("2026-09-03", "COMPLETED"),
    ]);

    expect(result).toEqual({
      current: 1,
      longest: 1,
    });
  });

  it("ignores unscheduled days", () => {
    const result = calculateStreaks([
      occurrence("2026-09-04", "COMPLETED"),
      occurrence("2026-09-05", "NOT_SCHEDULED"),
      occurrence("2026-09-06", "COMPLETED"),
    ]);

    expect(result).toEqual({
      current: 2,
      longest: 2,
    });
  });

  it("does not allow UPCOMING occurrences to contribute to a streak", () => {
    const result = calculateStreaks([
      occurrence("2026-09-01", "COMPLETED"),
      occurrence("2026-09-02", "UPCOMING"),
    ]);

    expect(result).toEqual({
      current: 1,
      longest: 1,
    });
  });

  it("returns zero when there are no completed occurrences", () => {
    const result = calculateStreaks([
      occurrence("2026-09-01", "INCOMPLETE"),
      occurrence("2026-09-02", "NOT_SCHEDULED"),
      occurrence("2026-09-03", "UPCOMING"),
    ]);

    expect(result).toEqual({
      current: 0,
      longest: 0,
    });
  });

  it("does not depend on calendar-day adjacency", () => {
    const result = calculateStreaks([
      occurrence("2026-09-04", "COMPLETED"),
      occurrence("2026-09-07", "COMPLETED"),
      occurrence("2026-09-08", "COMPLETED"),
    ]);

    expect(result).toEqual({
      current: 3,
      longest: 3,
    });
  });
});