import { ApiError, apiRequest } from "./api";

export type HabitScheduleType =
  | "DAILY"
  | "WEEKDAYS"
  | "WEEKLY_TARGET";

export type HabitTargetType =
  | "COUNT"
  | "DURATION"
  | "QUANTITY";

export type CatalogHabitStatus =
  | "AVAILABLE"
  | "UNAVAILABLE";

export type UserHabitStatus =
  | "ACTIVE"
  | "ARCHIVED";

export interface HabitScheduleConfig {
  weekdays?: number[];
  occurrences?: number;
}

export interface CatalogHabit {
  id: string;
  key: string;
  name: string;
  description: string;
  scheduleType: HabitScheduleType;
  scheduleConfig: HabitScheduleConfig;
  targetType: HabitTargetType;
  targetValue: string;
  targetUnit: string;
  status: CatalogHabitStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserHabit {
  id: string;
  userId: string;
  habitId: string;
  status: UserHabitStatus;
  startDate: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  habit: CatalogHabit;
}

interface CatalogHabitsResponse {
  habits: CatalogHabit[];
}

interface CatalogHabitResponse {
  habit: CatalogHabit;
}

interface UserHabitsResponse {
  habits: UserHabit[];
}

interface UserHabitResponse {
  habit: UserHabit;
}

interface AdoptHabitInput {
  habitId: string;
}

interface ReorderHabitsInput {
  habitIds: string[];
}

export async function getCatalogHabits() {
  const response = await apiRequest<CatalogHabitsResponse>(
    "/api/v1/habits/catalog",
  );

  return response.habits;
}

export async function getCatalogHabit(habitId: string) {
  const response = await apiRequest<CatalogHabitResponse>(
    `/api/v1/habits/catalog/${habitId}`,
  );

  return response.habit;
}

export async function adoptHabit(habitId: string) {
  const input: AdoptHabitInput = {
    habitId,
  };

  const response = await apiRequest<UserHabitResponse>(
    "/api/v1/habits",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return response.habit;
}

export async function getHabits() {
  const response = await apiRequest<UserHabitsResponse>(
    "/api/v1/habits",
  );

  return response.habits;
}

export async function getHabit(habitId: string) {
  const response = await apiRequest<UserHabitResponse>(
    `/api/v1/habits/${habitId}`,
  );

  return response.habit;
}

export async function archiveHabit(habitId: string) {
  const response = await apiRequest<UserHabitResponse>(
    `/api/v1/habits/${habitId}/archive`,
    {
      method: "POST",
    },
  );

  return response.habit;
}

export async function restoreHabit(habitId: string) {
  const response = await apiRequest<UserHabitResponse>(
    `/api/v1/habits/${habitId}/restore`,
    {
      method: "POST",
    },
  );

  return response.habit;
}

export async function deleteHabit(habitId: string) {
  return apiRequest<void>(
    `/api/v1/habits/${habitId}`,
    {
      method: "DELETE",
    },
  );
}

export async function reorderHabits(habitIds: string[]) {
  const input: ReorderHabitsInput = {
    habitIds,
  };

  const response = await apiRequest<UserHabitsResponse>(
    "/api/v1/habits/reorder",
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return response.habits;
}

export { ApiError };