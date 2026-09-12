import { z } from "zod";

export const adoptHabitSchema = z.object({
  habitId: z.uuid(),
});

export const reorderHabitsSchema = z.object({
  habitIds: z
    .array(z.uuid())
    .min(1)
    .refine(
      (habitIds) => new Set(habitIds).size === habitIds.length,
      {
        message: "Habit IDs must be unique",
      },
    ),
});

export const habitIdParamSchema = z.string().uuid();