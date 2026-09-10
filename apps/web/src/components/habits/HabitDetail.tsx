import { useEffect, useState } from "react";

import {
  archiveHabit,
  getHabit,
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

interface HabitDetailProps {
  habitId: string;
  onArchived?: () => void;
}

function HabitDetail({ habitId, onArchived }: HabitDetailProps) {
  const [habit, setHabit] = useState<UserHabit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHabit() {
      try {
        setError(null);
        const result = await getHabit(habitId);
        setHabit(result);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load habit",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadHabit();
  }, [habitId]);

  async function handleArchive() {
    if (!habit) {
      return;
    }

    try {
      setError(null);
      setIsArchiving(true);

      const archivedHabit = await archiveHabit(habit.id);
      setHabit(archivedHabit);

      onArchived?.();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to archive habit",
      );
    } finally {
      setIsArchiving(false);
    }
  }

  if (isLoading) {
    return <p>Loading habit...</p>;
  }

  if (error && !habit) {
    return <p role="alert">{error}</p>;
  }

  if (!habit) {
    return <p role="alert">Habit not found.</p>;
  }

  return (
    <section>
      <h2>{habit.habit.name}</h2>

      {habit.habit.description && (
        <p>{habit.habit.description}</p>
      )}

      <p>
        <strong>Schedule:</strong>{" "}
        {formatSchedule(habit.habit)}
      </p>

      <p>
        <strong>Target:</strong>{" "}
        {formatTarget(habit.habit)}
      </p>

      <p>
        <strong>Status:</strong> {habit.status}
      </p>

      {error && <p role="alert">{error}</p>}

      {habit.status === "ACTIVE" && (
        <button
          type="button"
          onClick={handleArchive}
          disabled={isArchiving}
        >
          {isArchiving ? "Archiving..." : "Archive"}
        </button>
      )}
    </section>
  );
}

export default HabitDetail;