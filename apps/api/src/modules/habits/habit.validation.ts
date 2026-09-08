import { z } from "zod";

const weekdaySchema = z.number().int().min(0).max(6);

const scheduleSchema = z.discriminatedUnion("scheduleType", [
  z.object({
    scheduleType: z.literal("DAILY"),
    scheduleConfig: z.object({}).strict(),
  }),

  z.object({
    scheduleType: z.literal("WEEKDAYS"),
    scheduleConfig: z
      .object({
        weekdays: z.array(weekdaySchema).min(1),
      })
      .strict(),
  }),

  z.object({
    scheduleType: z.literal("WEEKLY_TARGET"),
    scheduleConfig: z
      .object({
        occurrences: z.number().int().positive(),
      })
      .strict(),
  }),
]);

export const habitSchema = z
  .object({
    name: z.string().trim().min(1).max(100),

    description: z
      .string()
      .trim()
      .max(1000)
      .optional(),

    targetType: z.enum([
      "COUNT",
      "DURATION",
      "QUANTITY",
    ]),

    targetValue: z.number().finite().positive(),

    targetUnit: z
      .string()
      .trim()
      .max(50)
      .optional()
      .transform((val) => (val === "" ? undefined : val)),

    startDate: z.coerce.date(),
  })
  .and(scheduleSchema)
  .superRefine((data, ctx) => {
    if (
      data.targetType === "QUANTITY" &&
      (!data.targetUnit || data.targetUnit.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "targetUnit is required for QUANTITY target type",
        path: ["targetUnit"],
      });
    }
  });

export type HabitInput = z.infer<typeof habitSchema>;

export const listHabitsQuerySchema = z.object({
  status: z.enum(["ACTIVE", "ARCHIVED", "ALL"]).default("ACTIVE"),
});

export type ListHabitsQuery = z.infer<typeof listHabitsQuerySchema>;

export const reorderHabitsSchema = z.object({
  habitIds: z
    .array(z.string().uuid())
    .min(1)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      {
        message: "Habit IDs must be unique",
      },
    ),
});

export type ReorderHabitsInput = z.infer<
  typeof reorderHabitsSchema
>;