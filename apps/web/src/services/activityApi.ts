import { apiRequest } from "./api";

export type ActivitySource = "TIMER" | "MANUAL";

export type ActivityUnit =
  | "MINUTES"
  | "SECONDS"
  | "REPETITIONS"
  | "PAGES"
  | "LITERS";

export interface ActivityHabit {
  id: string;
  key: string;
  name: string;
  description: string;
  scheduleType: "DAILY" | "WEEKDAYS" | "WEEKLY_TARGET";
  scheduleConfig: {
    weekdays?: number[];
    occurrences?: number;
  };
  targetType: "COUNT" | "DURATION" | "QUANTITY";
  targetValue: string;
  targetUnit: string;
  status: "AVAILABLE" | "UNAVAILABLE";
}

export interface Activity {
  id: string;
  userId: string;
  userHabitId: string;
  source: ActivitySource;
  activityDate: string;
  durationSeconds: number | null;
  value: string | null;
  unit: ActivityUnit | null;
  idempotencyKey: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  habit: ActivityHabit;
}

export interface CreateActivityInput {
  userHabitId: string;
  activityDate: string;
  source: ActivitySource;
  durationSeconds?: number;
  value?: number;
  unit?: ActivityUnit;
  startedAt?: string;
  endedAt?: string;
}

export interface UpdateActivityInput {
  activityDate?: string;
  source?: ActivitySource;
  durationSeconds?: number;
  value?: number;
  unit?: ActivityUnit;
  startedAt?: string;
  endedAt?: string;
}

export interface ActivityHistoryFilters {
  userHabitId?: string;
  from?: string;
  to?: string;
}

interface ActivityResponse {
  data: {
    activity: Activity;
  };
}

interface ActivitiesResponse {
  data: {
    activities: Activity[];
  };
}

export async function getActivities(
  filters: ActivityHistoryFilters = {},
) {
  const params = new URLSearchParams();

  if (filters.userHabitId) {
    params.set("userHabitId", filters.userHabitId);
  }

  if (filters.from) {
    params.set("from", filters.from);
  }

  if (filters.to) {
    params.set("to", filters.to);
  }

  const query = params.toString();

  const response = await apiRequest<ActivitiesResponse>(
    `/api/v1/activities${query ? `?${query}` : ""}`,
  );

  return response.data.activities;
}

export async function getActivity(activityId: string) {
  const response = await apiRequest<ActivityResponse>(
    `/api/v1/activities/${activityId}`,
  );

  return response.data.activity;
}

export async function createActivity(
  input: CreateActivityInput,
  idempotencyKey?: string,
) {
  const response = await apiRequest<ActivityResponse>(
    "/api/v1/activities",
    {
      method: "POST",
      headers: idempotencyKey
        ? {
            "Idempotency-Key": idempotencyKey,
          }
        : undefined,
      body: JSON.stringify(input),
    },
  );

  return response.data.activity;
}

export async function updateActivity(
  activityId: string,
  input: UpdateActivityInput,
) {
  const response = await apiRequest<ActivityResponse>(
    `/api/v1/activities/${activityId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return response.data.activity;
}

export async function deleteActivity(activityId: string) {
  return apiRequest<void>(`/api/v1/activities/${activityId}`, {
    method: "DELETE",
  });
}