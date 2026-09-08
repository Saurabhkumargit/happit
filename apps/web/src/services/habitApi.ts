import { ApiError, apiRequest } from "./api";

export type HabitScheduleType =
  | "DAILY"
  | "WEEKDAYS"
  | "WEEKLY_TARGET";

export type HabitTargetType =
  | "COUNT"
  | "DURATION"
  | "QUANTITY";

export type HabitStatus =
  | "ACTIVE"
  | "ARCHIVED";

export interface DailyScheduleConfig {
  scheduleType: "DAILY";
  scheduleConfig: Record<string, never>;
}

export interface WeekdaysScheduleConfig {
  scheduleType: "WEEKDAYS";
  scheduleConfig: {
    weekdays: number[];
  };
}

export interface WeeklyTargetScheduleConfig {
  scheduleType: "WEEKLY_TARGET";
  scheduleConfig: {
    occurrences: number;
  };
}

export type HabitSchedule =
  | DailyScheduleConfig
  | WeekdaysScheduleConfig
  | WeeklyTargetScheduleConfig;

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  scheduleType: HabitScheduleType;
  scheduleConfig: Record<string, unknown>;
  targetType: HabitTargetType;
  targetValue: string;
  targetUnit: string | null;
  startDate: string;
  status: HabitStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface CreateHabitInput {
  name: string;
  description?: string;
  scheduleType: HabitScheduleType;
  scheduleConfig: Record<string, unknown>;
  targetType: HabitTargetType;
  targetValue: number;
  targetUnit?: string;
  startDate: string;
}

export type UpdateHabitInput = CreateHabitInput;

interface HabitResponse {
  habit: Habit;
}

interface HabitsResponse {
  habits: Habit[];
}

interface ReorderHabitsInput {
  habitIds: string[];
}

export async function createHabit(input: CreateHabitInput) {
  const response = await apiRequest<HabitResponse>(
    "/api/v1/habits",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return response.habit;
}

export async function getHabits() {
  const response = await apiRequest<HabitsResponse>(
    "/api/v1/habits",
  );

  return response.habits;
}

export async function getHabit(habitId: string) {
  const response = await apiRequest<HabitResponse>(
    `/api/v1/habits/${habitId}`,
  );

  return response.habit;
}

export async function updateHabit(
  habitId: string,
  input: UpdateHabitInput,
) {
  const response = await apiRequest<HabitResponse>(
    `/api/v1/habits/${habitId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return response.habit;
}

export async function archiveHabit(habitId: string) {
  const response = await apiRequest<HabitResponse>(
    `/api/v1/habits/${habitId}/archive`,
    {
      method: "POST",
    },
  );

  return response.habit;
}

export async function restoreHabit(habitId: string) {
  const response = await apiRequest<HabitResponse>(
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

  const response = await apiRequest<HabitsResponse>(
    "/api/v1/habits/reorder",
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return response.habits;
}

export { ApiError };