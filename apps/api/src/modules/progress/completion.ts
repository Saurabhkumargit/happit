import type {
  ActivityAggregate,
  ProgressOccurrence,
} from "./progress.types.js";

export type TargetDefinition = {
  targetType: "COUNT" | "DURATION" | "QUANTITY";
  targetValue: number;
  targetUnit: string;
};

export function aggregateActivities(
  activities: ActivityAggregate[],
): ActivityAggregate {
  if (activities.length === 0) {
    throw new Error("Cannot aggregate an empty activity list.");
  }

  return {
    date: activities[0].date,
    actualValue: activities.reduce(
      (total, activity) => total + activity.actualValue,
      0,
    ),
  };
}

export function evaluateCompletion(
  target: TargetDefinition,
  activity: ActivityAggregate | undefined,
  date: string,
  state: "UPCOMING" | "INCOMPLETE" | "COMPLETED" | "NOT_SCHEDULED",
): ProgressOccurrence {
  const actualValue = activity
    ? activity.actualValue
    : 0;

  const completionPercentage =
    target.targetValue > 0
      ? (actualValue / target.targetValue) * 100
      : 0;

  if (state === "NOT_SCHEDULED") {
    return {
      date,
      state,
      actualValue,
      targetValue: target.targetValue,
      completionPercentage,
    };
  }

  if (state === "UPCOMING") {
    return {
      date,
      state,
      actualValue,
      targetValue: target.targetValue,
      completionPercentage,
    };
  }

  return {
    date,
    state:
      actualValue >= target.targetValue
        ? "COMPLETED"
        : "INCOMPLETE",
    actualValue,
    targetValue: target.targetValue,
    completionPercentage,
  };
}