import { useEffect, useState } from "react";

import {
  adoptHabit,
  getCatalogHabits,
  type CatalogHabit,
} from "../../services/habitApi";

function formatSchedule(habit: CatalogHabit) {
  switch (habit.scheduleType) {
    case "DAILY":
      return "Every day";

    case "WEEKDAYS":
      return `Weekdays: ${(habit.scheduleConfig.weekdays ?? []).join(", ")}`;

    case "WEEKLY_TARGET":
      return `${habit.scheduleConfig.occurrences ?? 0} times per week`;
  }
}

function formatTarget(habit: CatalogHabit) {
  return `${habit.targetValue} ${habit.targetUnit}`;
}

function HabitCatalog() {
  const [habits, setHabits] = useState<CatalogHabit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adoptingHabitId, setAdoptingHabitId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        setError(null);

        const result = await getCatalogHabits();

        setHabits(result);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load habit catalog",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadCatalog();
  }, []);

  async function handleAdopt(habit: CatalogHabit) {
    try {
      setError(null);
      setSuccess(null);
      setAdoptingHabitId(habit.id);

      await adoptHabit(habit.id);

      setSuccess(`${habit.name} added to your habits.`);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to add habit",
      );
    } finally {
      setAdoptingHabitId(null);
    }
  }

  if (isLoading) {
    return <p>Loading habit catalog...</p>;
  }

  if (error && habits.length === 0) {
    return (
      <section>
        <h2>Habit catalog</h2>
        <p role="alert">{error}</p>
      </section>
    );
  }

  if (habits.length === 0) {
    return (
      <section>
        <h2>Habit catalog</h2>
        <p>No habits are currently available.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Choose your habits</h2>

      <p>
        Happit provides a predefined set of habits. Choose the ones you want
        to add to your routine.
      </p>

      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}

      <ul>
        {habits.map((habit) => (
          <li key={habit.id}>
            <h3>{habit.name}</h3>

            <p>{habit.description}</p>

            <p>
              <strong>Schedule:</strong> {formatSchedule(habit)}
            </p>

            <p>
              <strong>Target:</strong> {formatTarget(habit)}
            </p>

            <button
              type="button"
              onClick={() => handleAdopt(habit)}
              disabled={adoptingHabitId === habit.id}
            >
              {adoptingHabitId === habit.id
                ? "Adding..."
                : "Add to my habits"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default HabitCatalog;