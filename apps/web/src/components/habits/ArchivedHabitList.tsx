import { useEffect, useState } from "react";

import {
  deleteHabit,
  getHabits,
  restoreHabit,
  type UserHabit,
} from "../../services/habitApi";

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

function ArchivedHabitList() {
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoringHabitId, setRestoringHabitId] = useState<string | null>(null);
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHabits() {
      try {
        setError(null);

        const result = await getHabits();

        setHabits(result.filter((habit) => habit.status === "ARCHIVED"));
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load archived habits",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadHabits();
  }, []);

  async function handleRestore(habitId: string) {
    try {
      setError(null);
      setRestoringHabitId(habitId);

      await restoreHabit(habitId);

      setHabits((current) => current.filter((habit) => habit.id !== habitId));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to restore habit",
      );
    } finally {
      setRestoringHabitId(null);
    }
  }

  async function handleDelete(habitId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this habit?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setDeletingHabitId(habitId);

      await deleteHabit(habitId);

      setHabits((current) => current.filter((habit) => habit.id !== habitId));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to delete habit",
      );
    } finally {
      setDeletingHabitId(null);
    }
  }

  if (isLoading) {
    return <p>Loading archived habits...</p>;
  }

  if (error) {
    return (
      <section>
        <h2>Archived habits</h2>
        <p role="alert">{error}</p>
      </section>
    );
  }

  if (habits.length === 0) {
    return (
      <section>
        <h2>Archived habits</h2>
        <p>You don't have any archived habits.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Archived habits</h2>

      <ul>
        {habits.map((userHabit) => (
          <li key={userHabit.id}>
            <h3>{userHabit.habit.name}</h3>

            {userHabit.habit.description && (
              <p>{userHabit.habit.description}</p>
            )}

            <p>
              <strong>Schedule:</strong> {formatSchedule(userHabit.habit)}
            </p>

            <p>
              <strong>Target:</strong> {formatTarget(userHabit.habit)}
            </p>

            <button
              type="button"
              onClick={() => handleRestore(userHabit.id)}
              disabled={restoringHabitId === userHabit.id}
            >
              {restoringHabitId === userHabit.id ? "Restoring..." : "Restore"}
            </button>

            <button
              type="button"
              onClick={() => handleDelete(userHabit.id)}
              disabled={deletingHabitId === userHabit.id}
            >
              {deletingHabitId === userHabit.id ? "Deleting..." : "Delete"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default ArchivedHabitList;
