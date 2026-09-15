export type OccurrenceState =
  | "UPCOMING"
  | "COMPLETED"
  | "INCOMPLETE"
  | "NOT_SCHEDULED";

export interface ScheduleDefinition {
  scheduleType: "DAILY" | "WEEKDAYS" | "WEEKLY_TARGET";
  scheduleConfig: unknown;
}

export interface ExpectedOccurrence {
  date: string;
  state: OccurrenceState;
}

export interface ActivityAggregate {
  date: string;
  actualValue: number;
}

export interface ProgressOccurrence {
  date: string;
  state: OccurrenceState;
  actualValue: number;
  targetValue: number;
  completionPercentage: number;
}

export interface ConsistencyResult {
  completed: number;
  expected: number;
  percentage: number;
}

export interface StreakResult {
  current: number;
  longest: number;
}