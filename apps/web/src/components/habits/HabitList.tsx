import { useEffect, useState } from "react";

import {
  getHabits,
  archiveHabit,
  reorderHabits,
  type UserHabit,
} from "../../services/habitApi";

interface HabitListProps {
  onSelectHabit?: (habitId: string) => void;
}

function formatSchedule(habit: UserHabit["habit"]) {
  switch (habit.scheduleType) {
    case "DAILY":
      return "Every day";

    case "WEEKDAYS":
      return `Weekdays: ${(habit.scheduleConfig.weekdays ?? []).join(", ")}`;

    case "WEEKLY_TARGET":
      return `${habit.scheduleConfig.occurrences ?? 0} times per week`;
  }
}

function formatTarget(habit: UserHabit["habit"]) {
  const unit = habit.targetUnit ? ` ${habit.targetUnit}` : "";

  return `${habit.targetValue}${unit}`;
}

function HabitList({ onSelectHabit }: HabitListProps) {
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archivingHabitId, setArchivingHabitId] = useState<string | null>(null);
  const [reorderingHabitId, setReorderingHabitId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    async function loadHabits() {
      try {
        setError(null);

        const result = await getHabits();

        setHabits(result);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Unable to load habits",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadHabits();
  }, []);

  async function handleArchive(habitId: string) {
    try {
      setError(null);
      setArchivingHabitId(habitId);

      await archiveHabit(habitId);

      setHabits((currentHabits) =>
        currentHabits.filter((habit) => habit.habitId !== habitId),
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to archive habit",
      );
    } finally {
      setArchivingHabitId(null);
    }
  }

  async function handleReorder(habitId: string, direction: "up" | "down") {
    const currentIndex = habits.findIndex((habit) => habit.id === habitId);

    if (currentIndex === -1) {
      return;
    }

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= habits.length) {
      return;
    }

    const previousHabits = habits;

    const reorderedHabits = [...habits];
    [reorderedHabits[currentIndex], reorderedHabits[targetIndex]] = [
      reorderedHabits[targetIndex],
      reorderedHabits[currentIndex],
    ];

    setHabits(reorderedHabits);
    setError(null);
    setReorderingHabitId(habitId);

    try {
      await reorderHabits(reorderedHabits.map((habit) => habit.id));
    } catch (error) {
      setHabits(previousHabits);

      setError(
        error instanceof Error ? error.message : "Unable to reorder habits",
      );
    } finally {
      setReorderingHabitId(null);
    }
  }

  if (isLoading) {
    return <p>Loading habits...</p>;
  }

  if (loadError) {
    return <p role="alert">{loadError}</p>;
  }

  if (habits.length === 0) {
    return (
      <section>
        <h2>Your habits</h2>
        <p>You don't have any active habits yet.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Your habits</h2>

      {error && <p role="alert">{error}</p>}

      <ul>
        {habits.map((userHabit, currentIndex) => {
          const habit = userHabit.habit;

          return (
            <li key={userHabit.id}>
              <h3>
                <button
                  type="button"
                  onClick={() => onSelectHabit?.(userHabit.habitId)}
                >
                  {habit.name}
                </button>
              </h3>

              {habit.description && <p>{habit.description}</p>}

              <p>
                <strong>Schedule:</strong> {formatSchedule(habit)}
              </p>

              <p>
                <strong>Target:</strong> {formatTarget(habit)}
              </p>

              <div>
                <button
                  type="button"
                  onClick={() => handleReorder(userHabit.id, "up")}
                  disabled={currentIndex === 0 || reorderingHabitId !== null}
                  aria-label={`Move ${userHabit.habit.name} up`}
                >
                  ↑
                </button>

                <button
                  type="button"
                  onClick={() => handleReorder(userHabit.id, "down")}
                  disabled={
                    currentIndex === habits.length - 1 ||
                    reorderingHabitId !== null
                  }
                  aria-label={`Move ${userHabit.habit.name} down`}
                >
                  ↓
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleArchive(userHabit.habitId)}
                disabled={archivingHabitId === userHabit.habitId}
              >
                {archivingHabitId === userHabit.habitId
                  ? "Archiving..."
                  : "Archive"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default HabitList;
