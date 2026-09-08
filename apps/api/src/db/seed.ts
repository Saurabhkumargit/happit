import { db } from "./index.js";
import { habits } from "./schema.js";

const catalogHabits = [
  {
    key: "exercise",
    name: "Exercise",
    description: "Move your body and stay physically active.",
    scheduleType: "DAILY" as const,
    scheduleConfig: {},
    targetType: "DURATION" as const,
    targetValue: "30",
    targetUnit: "minutes",
  },
  {
    key: "reading",
    name: "Reading",
    description: "Spend time reading for learning or enjoyment.",
    scheduleType: "DAILY" as const,
    scheduleConfig: {},
    targetType: "DURATION" as const,
    targetValue: "30",
    targetUnit: "minutes",
  },
  {
    key: "meditation",
    name: "Meditation",
    description: "Practice focused mindfulness and reflection.",
    scheduleType: "DAILY" as const,
    scheduleConfig: {},
    targetType: "DURATION" as const,
    targetValue: "10",
    targetUnit: "minutes",
  },
  {
    key: "walking",
    name: "Walking",
    description: "Take a walk to build regular physical activity.",
    scheduleType: "DAILY" as const,
    scheduleConfig: {},
    targetType: "DURATION" as const,
    targetValue: "30",
    targetUnit: "minutes",
  },
  {
    key: "coding",
    name: "Coding",
    description: "Spend focused time practicing or building with code.",
    scheduleType: "WEEKDAYS" as const,
    scheduleConfig: {
      weekdays: [1, 2, 3, 4, 5],
    },
    targetType: "DURATION" as const,
    targetValue: "60",
    targetUnit: "minutes",
  },
  {
    key: "journaling",
    name: "Journaling",
    description: "Write down thoughts, reflections, or observations.",
    scheduleType: "DAILY" as const,
    scheduleConfig: {},
    targetType: "DURATION" as const,
    targetValue: "10",
    targetUnit: "minutes",
  },
];

async function seed() {
  for (const habit of catalogHabits) {
    await db
      .insert(habits)
      .values({
        ...habit,
        status: "AVAILABLE",
      })
      .onConflictDoUpdate({
        target: habits.key,
        set: {
          name: habit.name,
          description: habit.description,
          scheduleType: habit.scheduleType,
          scheduleConfig: habit.scheduleConfig,
          targetType: habit.targetType,
          targetValue: habit.targetValue,
          targetUnit: habit.targetUnit,
          status: "AVAILABLE",
          updatedAt: new Date(),
        },
      });
  }

  console.log("Habit catalog seeded successfully.");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});