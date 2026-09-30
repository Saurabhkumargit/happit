import { useEffect, useState } from "react";
import {
  Activity,
  BookOpen,
  Brain,
  Check,
  Circle,
  Dumbbell,
  Droplets,
  Moon,
  Sparkles,
} from "lucide-react";

import {
  adoptHabit,
  getCatalogHabits,
  type CatalogHabit,
} from "../../services/habitApi";

import "./HabitCatalog.css";

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

function getHabitIcon(habit: CatalogHabit) {
  const key = habit.key.toLowerCase();
  const name = habit.name.toLowerCase();

  if (
    key.includes("exercise") ||
    key.includes("workout") ||
    name.includes("exercise") ||
    name.includes("workout")
  ) {
    return <Dumbbell size={25} strokeWidth={1.8} />;
  }

  if (
    key.includes("read") ||
    name.includes("read")
  ) {
    return <BookOpen size={25} strokeWidth={1.8} />;
  }

  if (
    key.includes("water") ||
    name.includes("water")
  ) {
    return <Droplets size={25} strokeWidth={1.8} />;
  }

  if (
    key.includes("sleep") ||
    name.includes("sleep")
  ) {
    return <Moon size={25} strokeWidth={1.8} />;
  }

  if (
    key.includes("meditat") ||
    name.includes("meditat")
  ) {
    return <Brain size={25} strokeWidth={1.8} />;
  }

  if (
    key.includes("activity") ||
    name.includes("activity")
  ) {
    return <Activity size={25} strokeWidth={1.8} />;
  }

  return <Sparkles size={25} strokeWidth={1.8} />;
}

function HabitCatalog() {
  const [habits, setHabits] = useState<CatalogHabit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adoptingHabitId, setAdoptingHabitId] = useState<string | null>(
    null,
  );
  const [addedHabitIds, setAddedHabitIds] = useState<Set<string>>(
    new Set(),
  );
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

    void loadCatalog();
  }, []);

  async function handleAdopt(habit: CatalogHabit) {
    if (addedHabitIds.has(habit.id)) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setAdoptingHabitId(habit.id);

      await adoptHabit(habit.id);

      setAddedHabitIds((current) => {
        const next = new Set(current);
        next.add(habit.id);
        return next;
      });

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
    return (
      <section className="habit-catalog">
        <div
          className="habit-catalog-loading"
          role="status"
          aria-live="polite"
        >
          <div className="habit-catalog-spinner" />
          <span>Loading habit catalog...</span>
        </div>
      </section>
    );
  }

  if (error && habits.length === 0) {
    return (
      <section className="habit-catalog">
        <div className="habit-catalog-header">
          <div>
            <span className="habit-catalog-eyebrow">
              HABIT CATALOG
            </span>

            <h1>Habit catalog</h1>

            <p>
              Explore predefined habits designed to help you
              build consistency.
            </p>
          </div>
        </div>

        <div className="habit-catalog-state" role="alert">
          <Circle size={20} />
          <span>{error}</span>
        </div>
      </section>
    );
  }

  if (habits.length === 0) {
    return (
      <section className="habit-catalog">
        <div className="habit-catalog-header">
          <div>
            <span className="habit-catalog-eyebrow">
              HABIT CATALOG
            </span>

            <h1>Habit catalog</h1>

            <p>
              Explore predefined habits designed to help you
              build consistency.
            </p>
          </div>
        </div>

        <div className="habit-catalog-state">
          <Sparkles size={22} />
          <div>
            <strong>The habit catalog is currently empty.</strong>
            <p>
              New predefined habits will appear here when they
              become available.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="habit-catalog">
      <header className="habit-catalog-header">
        <div className="habit-catalog-heading">
          <span className="habit-catalog-eyebrow">
            HABIT CATALOG
          </span>

          <h1>Habit catalog</h1>

          <p>
            Choose from predefined habits and build a routine
            that lasts.
          </p>
        </div>

        <div className="habit-catalog-count">
          <span>{habits.length}</span>
          <small>
            {habits.length === 1 ? "habit available" : "habits available"}
          </small>
        </div>
      </header>

      {error && (
        <div className="habit-catalog-message error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="habit-catalog-message success" role="status">
          <Check size={16} />
          <span>{success}</span>
        </div>
      )}

      <div className="habit-catalog-grid">
        {habits.map((habit) => {
          const isAdding = adoptingHabitId === habit.id;
          const isAdded = addedHabitIds.has(habit.id);

          return (
            <article
              key={habit.id}
              className={`habit-catalog-card ${
                isAdded ? "is-added" : ""
              }`}
            >
              <div className="habit-catalog-card-glow" />

              <div className="habit-catalog-card-content">
                <div className="habit-catalog-card-top">
                  <div className="habit-catalog-icon">
                    {getHabitIcon(habit)}
                  </div>

                  <div className="habit-catalog-card-badge">
                    <Sparkles size={12} />
                    Curated
                  </div>
                </div>

                <div className="habit-catalog-card-title">
                  <h2>{habit.name}</h2>

                  {habit.description && (
                    <p>{habit.description}</p>
                  )}
                </div>

                <div className="habit-catalog-card-meta">
                  <div className="habit-catalog-meta-item">
                    <span className="habit-catalog-meta-label">
                      TARGET
                    </span>

                    <strong>
                      {formatTarget(habit)}
                    </strong>
                  </div>

                  <div className="habit-catalog-meta-divider" />

                  <div className="habit-catalog-meta-item">
                    <span className="habit-catalog-meta-label">
                      SCHEDULE
                    </span>

                    <strong>
                      {formatSchedule(habit)}
                    </strong>
                  </div>
                </div>

                <div className="habit-catalog-card-footer">
                  <button
                    type="button"
                    className={`habit-catalog-add-button ${
                      isAdded ? "added" : ""
                    }`}
                    onClick={() => void handleAdopt(habit)}
                    disabled={isAdding || isAdded}
                    aria-label={
                      isAdded
                        ? "Added to your habits"
                        : "Add to my habits"
                    }
                  >
                    {isAdded ? (
                      <>
                        <Check size={17} />
                        Added to your habits
                      </>
                    ) : isAdding ? (
                      <>
                        <span className="habit-catalog-button-spinner" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <span className="habit-catalog-plus">+</span>
                        Add to my habits
                      </>
                    )}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default HabitCatalog;