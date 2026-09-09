import { z } from "zod";

export const adoptHabitSchema = z.object({
  habitId: z.uuid(),
});