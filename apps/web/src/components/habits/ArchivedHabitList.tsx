import { useEffect, useState } from "react";
import { Archive, ArrowLeft, RotateCcw, X } from "lucide-react";

import {
  removeHabit,
  getHabits,
  restoreHabit,
  type UserHabit,
} from "../../services/habitApi";

import "./ArchivedHabitList.css";

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
  const [removingHabitId, setRemovingHabitId] = useState<string | null>(null);
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

    void loadHabits();
  }, []);

  async function handleRestore(habitId: string) {
    try {
      setError(null);
      setRestoringHabitId(habitId);

      await restoreHabit(habitId);

      setHabits((current) =>
        current.filter((habit) => habit.habitId !== habitId),
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to restore habit",
      );
    } finally {
      setRestoringHabitId(null);
    }
  }

  async function handleRemove(habitId: string) {
    try {
      setError(null);
      setRemovingHabitId(habitId);

      await removeHabit(habitId);

      setHabits((current) =>
        current.filter((habit) => habit.habitId !== habitId),
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to remove habit",
      );
    } finally {
      setRemovingHabitId(null);
    }
  }

  return (
    <section className="archived-habits-page">
      <header className="archived-habits-header">
        <div>
          <div className="archived-habits-eyebrow">
            <Archive size={14} aria-hidden="true" />
            <span>YOUR LIBRARY</span>
          </div>

          <h1>Archived habits</h1>

          <p>
            Habits you’ve put on hold. Restore one whenever you’re ready to
            continue.
          </p>
        </div>

        {!isLoading && !error && habits.length > 0 && (
          <span className="archived-habits-count">
            {habits.length} {habits.length === 1 ? "habit" : "habits"}
          </span>
        )}
      </header>

      {error && (
        <div className="archived-habits-error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="archived-retry-button"
          >
            Try again
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="archived-habits-status" role="status">
          <span className="archived-loading-indicator" />
          <p>Loading archived habits...</p>
        </div>
      ) : !error && habits.length === 0 ? (
        <div className="archived-habits-empty">
          <div className="archived-empty-icon">
            <Archive size={25} strokeWidth={1.5} aria-hidden="true" />
          </div>

          <h2>Nothing on the sidelines.</h2>
          <p>You don't have any archived habits.</p>
          <p>
            Your archived habits will appear here. For now, keep building your
            routine one day at a time.
          </p>

          <a href="/app/habits" className="archived-empty-link">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to habits
          </a>
        </div>
      ) : !error ? (
        <div className="archived-habits-list">
          {habits.map((userHabit) => {
            const isRestoring = restoringHabitId === userHabit.habitId;
            const isRemoving = removingHabitId === userHabit.habitId;
            const isBusy = isRestoring || isRemoving;

            return (
              <article
                className="archived-habit-card"
                key={userHabit.id}
              >
                <div className="archived-habit-main">
                  <div className="archived-habit-icon">
                    <Archive size={19} strokeWidth={1.6} aria-hidden="true" />
                  </div>

                  <div className="archived-habit-content">
                    <div className="archived-habit-title-row">
                      <h2>{userHabit.habit.name}</h2>
                      <span className="archived-status-label">Archived</span>
                    </div>

                    {userHabit.habit.description && (
                      <p className="archived-habit-description">
                        {userHabit.habit.description}
                      </p>
                    )}

                    <div className="archived-habit-metadata">
                      <div className="archived-metadata-item">
                        <span>Schedule</span>
                        <strong>{formatSchedule(userHabit.habit)}</strong>
                      </div>

                      <div className="archived-metadata-divider" />

                      <div className="archived-metadata-item">
                        <span>Target</span>
                        <strong>{formatTarget(userHabit.habit)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="archived-habit-actions">
                  <button
                    type="button"
                    className="archived-restore-button"
                    onClick={() => void handleRestore(userHabit.habitId)}
                    disabled={isBusy}
                  >
                    <RotateCcw size={15} aria-hidden="true" />
                    {isRestoring ? "Restoring..." : "Restore"}
                  </button>

                  <button
                    type="button"
                    className="archived-remove-button"
                    onClick={() => void handleRemove(userHabit.habitId)}
                    disabled={isBusy}
                  >
                    <X size={15} aria-hidden="true" />
                    {isRemoving ? "Removing..." : "Remove"}
                  </button>
                </div>

                {isRestoring && (
                  <span className="sr-only" role="status">
                    Restoring {userHabit.habit.name}
                  </span>
                )}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export default ArchivedHabitList;
