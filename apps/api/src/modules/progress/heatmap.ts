import type { ProgressOccurrence } from "./progress.types.js";

export interface HeatmapEntry {
  date: string;
  state: ProgressOccurrence["state"];
  actualValue: number;
  targetValue: number;
  completionPercentage: number;
  intensity: number;
}

export function buildHeatmapData(
  occurrences: ProgressOccurrence[],
): HeatmapEntry[] {
  return occurrences.map((occurrence) => {
    const completionPercentage = occurrence.completionPercentage;

    const intensity = Math.min(
      1,
      Math.max(0, completionPercentage / 100),
    );

    return {
      date: occurrence.date,
      state: occurrence.state,
      actualValue: occurrence.actualValue,
      targetValue: occurrence.targetValue,
      completionPercentage,
      intensity,
    };
  });
}