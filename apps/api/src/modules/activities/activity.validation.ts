import { z } from "zod";

export const createActivitySchema = z.object({
  userHabitId: z.uuid(),
  activityDate: z.iso.date(),
  source: z.enum(["TIMER", "MANUAL"]),
  durationSeconds: z.number().int().positive().optional(),
  value: z.number().positive().optional(),
  unit: z
    .enum([
      "MINUTES",
      "SECONDS",
      "REPETITIONS",
      "PAGES",
      "LITERS",
    ])
    .optional(),
  startedAt: z.iso.datetime().optional(),
  endedAt: z.iso.datetime().optional(),
});

export const activityIdParamSchema = z.string().uuid();