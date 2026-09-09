import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { habits } from "../../db/schema.js";

export async function listCatalogHabits() {
  return db
    .select()
    .from(habits)
    .where(eq(habits.status, "AVAILABLE"))
    .orderBy(habits.name);
}

export async function getCatalogHabitById(habitId: string) {
  const [habit] = await db
    .select()
    .from(habits)
    .where(
      and(
        eq(habits.id, habitId),
        eq(habits.status, "AVAILABLE"),
      ),
    )
    .limit(1);

  return habit ?? null;
}