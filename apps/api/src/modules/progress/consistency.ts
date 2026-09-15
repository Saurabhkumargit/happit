import type {
  ConsistencyResult,
  ProgressOccurrence,
} from "./progress.types.js";

export function calculateConsistency(
  occurrences: ProgressOccurrence[],
): ConsistencyResult {
  const eligibleOccurrences = occurrences.filter(
    (occurrence) =>
      occurrence.state === "COMPLETED" ||
      occurrence.state === "INCOMPLETE",
  );

  const completed = eligibleOccurrences.filter(
    (occurrence) => occurrence.state === "COMPLETED",
  ).length;

  const expected = eligibleOccurrences.length;

  const percentage =
    expected === 0
      ? 0
      : (completed / expected) * 100;

  return {
    completed,
    expected,
    percentage,
  };
}