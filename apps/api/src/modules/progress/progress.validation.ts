import { z } from "zod";

export const progressHabitParamsSchema = z.object({
  habitId: z.string().uuid(),
});

export const progressQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
  today: z.string().date().optional(),
});