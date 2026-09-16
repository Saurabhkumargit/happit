import { useEffect, useState } from "react";
import { Archive, ChevronDown, ChevronUp } from "lucide-react";

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
      await reorderHabits(reorderedHabits.map((habit) => habit.habitId));
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
    return (
      <section className="habit-list-page" aria-busy="true">
        <div className="page-header">
          <p className="eyebrow">Habits</p>
          <h2>Your habits</h2>
        </div>

        <p className="sr-only">Loading habits...</p>
        <div className="habit-list">
          {[1, 2, 3].map((item) => (
            <div className="habit-card habit-card-skeleton" key={item}>
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-meta" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="habit-list-page">
        <div className="page-header">
          <p className="eyebrow">Habits</p>
          <h2>Your habits</h2>
        </div>

        <div className="state-card state-card-error" role="alert">
          <p className="state-label">Something went wrong</p>
          <p>{loadError}</p>
        </div>
      </section>
    );
  }

  if (habits.length === 0) {
    return (
      <section className="habit-list-page">
        <div className="page-header">
          <p className="eyebrow">Habits</p>
          <h2>Your habits</h2>
        </div>

        <div className="state-card">
          <p className="state-label">No habits yet</p>

          <p>You don't have any active habits yet.</p>

          <p>Choose a habit from the catalog to get started.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="habit-list-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Habits</p>
          <h2>Your habits</h2>
        </div>

        <p className="page-description">
          Your active habits and their current targets.
        </p>
      </div>

      {error && (
        <div className="state-card state-card-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      <ul className="habit-list">
        {habits.map((userHabit, currentIndex) => {
          const habit = userHabit.habit;
          const isReordering = reorderingHabitId !== null;
          const isArchiving = archivingHabitId === userHabit.habitId;

          return (
            <li className="habit-card" key={userHabit.id}>
              <div className="habit-card-main">
                <div className="habit-card-heading">
                  <h3>
                    <button
                      type="button"
                      className="habit-name-button"
                      onClick={() => onSelectHabit?.(userHabit.habitId)}
                    >
                      {habit.name}
                    </button>
                  </h3>
                </div>

                {habit.description && (
                  <p className="habit-description">{habit.description}</p>
                )}

                <div className="habit-meta">
                  <div className="habit-meta-item">
                    <span className="habit-meta-label">Schedule</span>
                    <span>{formatSchedule(habit)}</span>
                  </div>

                  <div className="habit-meta-item">
                    <span className="habit-meta-label">Target</span>
                    <span className="habit-target">{formatTarget(habit)}</span>
                  </div>
                </div>
              </div>

              <div className="habit-card-actions">
                <div className="habit-order-actions">
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => handleReorder(userHabit.id, "up")}
                    disabled={currentIndex === 0 || isReordering}
                    aria-label={`Move ${userHabit.habit.name} up`}
                    title="Move up"
                  >
                    <ChevronUp aria-hidden="true" size={17} />
                  </button>

                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => handleReorder(userHabit.id, "down")}
                    disabled={
                      currentIndex === habits.length - 1 || isReordering
                    }
                    aria-label={`Move ${userHabit.habit.name} down`}
                    title="Move down"
                  >
                    <ChevronDown aria-hidden="true" size={17} />
                  </button>
                </div>

                <button
                  type="button"
                  className="archive-button"
                  onClick={() => handleArchive(userHabit.habitId)}
                  disabled={isArchiving}
                >
                  <Archive aria-hidden="true" size={16} />
                  <span>{isArchiving ? "Archiving..." : "Archive"}</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default HabitList;
