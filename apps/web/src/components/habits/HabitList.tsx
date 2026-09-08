import { useEffect, useState } from "react";

import {
  getHabits,
  type Habit,
} from "../../services/habitApi";

function formatSchedule(habit: Habit) {
  switch (habit.scheduleType) {
    case "DAILY":
      return "Every day";

    case "WEEKDAYS":
      return `Weekdays: ${(
        habit.scheduleConfig.weekdays as number[]
      ).join(", ")}`;

    case "WEEKLY_TARGET":
      return `${habit.scheduleConfig.occurrences} times per week`;
  }
}

function formatTarget(habit: Habit) {
  const unit = habit.targetUnit
    ? ` ${habit.targetUnit}`
    : "";

  return `${habit.targetValue}${unit}`;
}

function HabitList() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        {habits.map((habit) => (
          <li key={habit.id}>
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
          </li>
        ))}
      </ul>
    </section>
  );
}

export default HabitList;