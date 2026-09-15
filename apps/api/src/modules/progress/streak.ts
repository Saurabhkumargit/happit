import type {
  ProgressOccurrence,
  StreakResult,
} from "./progress.types.js";

export function calculateStreaks(
  occurrences: ProgressOccurrence[],
): StreakResult {
  const eligibleOccurrences = occurrences
    .filter(
      (occurrence) =>
        occurrence.state === "COMPLETED" ||
        occurrence.state === "INCOMPLETE",
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  if (eligibleOccurrences.length === 0) {
    return {
      current: 0,
      longest: 0,
    };
  }

  let longest = 0;
  let running = 0;

  for (const occurrence of eligibleOccurrences) {
    if (occurrence.state === "COMPLETED") {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  let current = 0;

  for (let index = eligibleOccurrences.length - 1; index >= 0; index -= 1) {
    if (eligibleOccurrences[index].state !== "COMPLETED") {
      break;
    }

    current += 1;
  }

  return {
    current,
    longest,
  };
}