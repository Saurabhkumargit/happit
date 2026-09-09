import { useEffect, useState } from "react";

import {
  archiveHabit,
  getHabits,
  type UserHabit,
} from "../../services/habitApi";

function formatSchedule(habit: UserHabit["habit"]) {
  switch (habit.scheduleType) {
    case "DAILY":
      return "Every day";

    case "WEEKDAYS":
      return `Weekdays: ${(
        habit.scheduleConfig.weekdays ?? []
      ).join(", ")}`;

    case "WEEKLY_TARGET":
      return `${habit.scheduleConfig.occurrences ?? 0} times per week`;
  }
}

function formatTarget(habit: UserHabit["habit"]) {
  const unit = habit.targetUnit
    ? ` ${habit.targetUnit}`
    : "";

  return `${habit.targetValue}${unit}`;
}

function HabitList() {
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archivingHabitId, setArchivingHabitId] = useState<string | null>(null);

  useEffect(() => {
    async function loadHabits() {
      try {
        setError(null);

        const result = await getHabits();

        setHabits(result);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load habits",
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
        error instanceof Error
          ? error.message
          : "Unable to archive habit",
      );
    } finally {
      setArchivingHabitId(null);
    }
  }

  if (isLoading) {
    return <p>Loading habits...</p>;
  }

  if (error) {
    return (
      <p role="alert">
        {error}
      </p>
    );
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

      <ul>
        {habits.map((userHabit) => {
          const habit = userHabit.habit;

          return (
            <li key={userHabit.id}>
              <h3>{habit.name}</h3>

              {habit.description && (
                <p>{habit.description}</p>
              )}

              <p>
                <strong>Schedule:</strong>{" "}
                {formatSchedule(habit)}
              </p>

              <p>
                <strong>Target:</strong>{" "}
                {formatTarget(habit)}
              </p>

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