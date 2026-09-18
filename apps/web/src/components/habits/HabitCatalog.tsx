import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, CheckCircle2 } from "lucide-react";

import {
  adoptHabit,
  getCatalogHabits,
  type CatalogHabit,
} from "../../services/habitApi";

import PageHeader from "../ui/PageHeader";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import LoadingSpinner from "../ui/LoadingSpinner";
import ErrorState from "../ui/ErrorState";
import EmptyState from "../ui/EmptyState";

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

function HabitCatalog() {
  const navigate = useNavigate();
  const [habits, setHabits] = useState<CatalogHabit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adoptingHabitId, setAdoptingHabitId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successHabitId, setSuccessHabitId] = useState<string | null>(null);

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
      setSuccessHabitId(null);
      setAdoptingHabitId(habit.id);

      await adoptHabit(habit.id);

      setSuccessHabitId(habit.id);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessHabitId(null);
      }, 3000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to add habit",
      );
    } finally {
      setAdoptingHabitId(null);
    }
  }

  if (isLoading) {
    return (
      <section className="habit-catalog-page">
        <PageHeader
          eyebrow="Catalog"
          title="Choose your habits"
          description="Happit provides a curated set of habits designed to help you build a better routine."
        />
        <div className="catalog-loading">
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  if (error && habits.length === 0) {
    return (
      <section className="habit-catalog-page">
        <PageHeader eyebrow="Catalog" title="Habit catalog" />
        <ErrorState message={error} />
      </section>
    );
  }

  if (habits.length === 0) {
    return (
      <section className="habit-catalog-page">
        <PageHeader eyebrow="Catalog" title="Habit catalog" />
        <EmptyState
          title="No habits available"
          description="The habit catalog is currently empty."
          action={
            <Button onClick={() => navigate("/app/habits")}>
              Back to habits
            </Button>
          }
        />
      </section>
    );
  }

  return (
    <section className="habit-catalog-page">
      <PageHeader
        eyebrow="Catalog"
        title="Choose your habits"
        description="Happit provides a curated set of habits designed to help you build a better routine."
      />

      {error && (
        <div className="catalog-alert">
          <ErrorState message={error} />
        </div>
      )}

      <ul className="catalog-list">
        {habits.map((habit) => {
          const isAdopting = adoptingHabitId === habit.id;
          const isAdopted = successHabitId === habit.id;

          return (
            <li key={habit.id}>
              <Card className="catalog-card">
                <div className="catalog-card-header">
                  <h3 className="catalog-card-title">{habit.name}</h3>
                  {habit.status === "UNAVAILABLE" && (
                    <Badge variant="default">Unavailable</Badge>
                  )}
                </div>

                {habit.description && (
                  <p className="catalog-card-description">
                    {habit.description}
                  </p>
                )}

                <div className="catalog-card-meta">
                  <div className="catalog-meta-item">
                    <span className="catalog-meta-label">Schedule</span>
                    <span className="catalog-meta-value">
                      {formatSchedule(habit)}
                    </span>
                  </div>

                  <div className="catalog-meta-item">
                    <span className="catalog-meta-label">Target</span>
                    <span className="catalog-meta-value catalog-meta-target">
                      {formatTarget(habit)}
                    </span>
                  </div>
                </div>

                <div className="catalog-card-actions">
                  {isAdopted ? (
                    <Button variant="secondary" disabled>
                      <CheckCircle2 size={16} aria-hidden="true" />
                      Added to your habits
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => handleAdopt(habit)}
                      disabled={isAdopting || habit.status === "UNAVAILABLE"}
                    >
                      <Plus size={16} aria-hidden="true" />
                      {isAdopting ? "Adding..." : "Add to my habits"}
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default HabitCatalog;