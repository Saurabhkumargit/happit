import { describe, expect, it } from "vitest";
import { buildHeatmapData } from "../modules/progress/heatmap.js";
import type { ProgressOccurrence } from "../modules/progress/progress.types.js";

function occurrence(
  date: string,
  state: ProgressOccurrence["state"],
  actualValue: number,
): ProgressOccurrence {
  return {
    date,
    state,
    actualValue,
    targetValue: 30,
    completionPercentage:
      (actualValue / 30) * 100,
  };
}

describe("progress heatmap", () => {
  it("builds semantic heatmap data from progress occurrences", () => {
    const result = buildHeatmapData([
      occurrence("2026-09-01", "COMPLETED", 30),
      occurrence("2026-09-02", "INCOMPLETE", 15),
      occurrence("2026-09-03", "UPCOMING", 0),
    ]);

    expect(result).toEqual([
      {
        date: "2026-09-01",
        state: "COMPLETED",
        actualValue: 30,
        targetValue: 30,
        completionPercentage: 100,
      },
      {
        date: "2026-09-02",
        state: "INCOMPLETE",
        actualValue: 15,
        targetValue: 30,
        completionPercentage: 50,
      },
      {
        date: "2026-09-03",
        state: "UPCOMING",
        actualValue: 0,
        targetValue: 30,
        completionPercentage: 0,
      },
    ]);
  });

  it("preserves over-target values for the heatmap", () => {
    const result = buildHeatmapData([
      occurrence("2026-09-01", "COMPLETED", 45),
    ]);

    expect(result[0]).toEqual({
      date: "2026-09-01",
      state: "COMPLETED",
      actualValue: 45,
      targetValue: 30,
      completionPercentage: 150,
    });
  });

  it("returns an empty array when there are no occurrences", () => {
    expect(buildHeatmapData([])).toEqual([]);
  });
});