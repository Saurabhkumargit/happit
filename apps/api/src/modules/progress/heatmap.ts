import type { ProgressOccurrence } from "./progress.types.js";

export interface HeatmapEntry {
  date: string;
  state: ProgressOccurrence["state"];
  actualValue: number;
  targetValue: number;
  completionPercentage: number;
}

export function buildHeatmapData(
  occurrences: ProgressOccurrence[],
): HeatmapEntry[] {
  return occurrences.map((occurrence) => ({
    date: occurrence.date,
    state: occurrence.state,
    actualValue: occurrence.actualValue,
    targetValue: occurrence.targetValue,
    completionPercentage: occurrence.completionPercentage,
  }));
}