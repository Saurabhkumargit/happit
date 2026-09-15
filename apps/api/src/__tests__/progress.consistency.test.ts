import { describe, expect, it } from "vitest";
import { calculateConsistency } from "../modules/progress/consistency.js";
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

describe("progress consistency", () => {
  it("calculates consistency from completed and incomplete occurrences", () => {
    const result = calculateConsistency([
      occurrence("2026-09-01", "COMPLETED"),
      occurrence("2026-09-02", "COMPLETED"),
      occurrence("2026-09-03", "INCOMPLETE"),
      occurrence("2026-09-04", "COMPLETED"),
    ]);

    expect(result).toEqual({
      completed: 3,
      expected: 4,
      percentage: 75,
    });
  });

  it("excludes UPCOMING occurrences", () => {
    const result = calculateConsistency([
      occurrence("2026-09-01", "COMPLETED"),
      occurrence("2026-09-02", "INCOMPLETE"),
      occurrence("2026-09-03", "UPCOMING"),
    ]);

    expect(result).toEqual({
      completed: 1,
      expected: 2,
      percentage: 50,
    });
  });

  it("excludes NOT_SCHEDULED occurrences", () => {
    const result = calculateConsistency([
      occurrence("2026-09-01", "COMPLETED"),
      occurrence("2026-09-02", "NOT_SCHEDULED"),
      occurrence("2026-09-03", "INCOMPLETE"),
    ]);

    expect(result).toEqual({
      completed: 1,
      expected: 2,
      percentage: 50,
    });
  });

  it("returns zero when there are no eligible occurrences", () => {
    const result = calculateConsistency([
      occurrence("2026-09-01", "UPCOMING"),
      occurrence("2026-09-02", "NOT_SCHEDULED"),
    ]);

    expect(result).toEqual({
      completed: 0,
      expected: 0,
      percentage: 0,
    });
  });

  it("returns 100 when every eligible occurrence is complete", () => {
    const result = calculateConsistency([
      occurrence("2026-09-01", "COMPLETED"),
      occurrence("2026-09-02", "COMPLETED"),
      occurrence("2026-09-03", "COMPLETED"),
    ]);

    expect(result).toEqual({
      completed: 3,
      expected: 3,
      percentage: 100,
    });
  });
});