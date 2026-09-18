import { apiRequest } from "./api";

export type OccurrenceState =
  | "COMPLETED"
  | "INCOMPLETE"
  | "UPCOMING"
  | "UNSCHEDULED";

export interface Occurrence {
  date: string;
  state: OccurrenceState;
  expected: boolean;
  actualValue?: number;
  targetValue: number;
  targetUnit: string;
}

export interface Consistency {
  completed: number;
  expected: number;
  percentage: number;
}

export interface Streaks {
  current: number;
  longest: number;
}

export interface HeatmapDay {
  date: string;
  intensity: number;
  state: OccurrenceState;
}

export interface HabitProgress {
  habit: {
    id: string;
    key: string;
    name: string;
    targetType: "COUNT" | "DURATION" | "QUANTITY";
    targetValue: number;
    targetUnit: string;
    scheduleType: "DAILY" | "WEEKDAYS" | "WEEKLY_TARGET";
    scheduleConfig: {
      weekdays?: number[];
      occurrences?: number;
    };
  };
  range: {
    from: string;
    to: string;
    timezone: string;
  };
  consistency: Consistency;
  streaks: Streaks;
  occurrences: Occurrence[];
  heatmap: HeatmapDay[];
}

export interface OverallProgress {
  range: {
    from: string;
    to: string;
    timezone?: string;
  };
  consistency: Consistency;
  habits: HabitProgress[];
}

export interface ProgressQuery {
  from?: string;
  to?: string;
  today?: string;
}

interface OverallProgressResponse {
  data: {
    progress: OverallProgress;
  };
}

interface HabitProgressResponse {
  data: {
    progress: HabitProgress;
  };
}

interface HabitHeatmapResponse {
  data: {
    heatmap: HeatmapDay[];
  };
}

export async function getOverallProgress(query: ProgressQuery = {}) {
  const params = new URLSearchParams();

  if (query.from) {
    params.set("from", query.from);
  }

  if (query.to) {
    params.set("to", query.to);
  }

  if (query.today) {
    params.set("today", query.today);
  }

  const queryString = params.toString();

  const response = await apiRequest<OverallProgressResponse>(
    `/api/v1/progress${queryString ? `?${queryString}` : ""}`,
  );

  return response.data.progress;
}

export async function getHabitProgress(habitId: string, query: ProgressQuery = {}) {
  const params = new URLSearchParams();

  if (query.from) {
    params.set("from", query.from);
  }

  if (query.to) {
    params.set("to", query.to);
  }

  if (query.today) {
    params.set("today", query.today);
  }

  const queryString = params.toString();

  const response = await apiRequest<HabitProgressResponse>(
    `/api/v1/progress/habits/${habitId}${queryString ? `?${queryString}` : ""}`,
  );

  return response.data.progress;
}

export async function getHabitHeatmap(habitId: string, query: ProgressQuery = {}) {
  const params = new URLSearchParams();

  if (query.from) {
    params.set("from", query.from);
  }

  if (query.to) {
    params.set("to", query.to);
  }

  if (query.today) {
    params.set("today", query.today);
  }

  const queryString = params.toString();

  const response = await apiRequest<HabitHeatmapResponse>(
    `/api/v1/progress/habits/${habitId}/heatmap${queryString ? `?${queryString}` : ""}`,
  );

  return response.data.heatmap;
}
