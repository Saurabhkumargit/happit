import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Pencil,
} from "lucide-react";

import {
  getHabits,
  type UserHabit,
} from "../../services/habitApi";

import {
  createActivity,
  type Activity,
} from "../../services/activityApi";

import "./ManualActivityForm.css";

interface ManualActivityFormProps {
  onSaved?: (activity: Activity) => void;
  initialHabitId?: string;
}

function formatTarget(habit: UserHabit["habit"]) {
  const unit = habit.targetUnit ? ` ${habit.targetUnit}` : "";
  return `${habit.targetValue}${unit}`;
}

function formatDuration(minutes: string) {
  const value = Number(minutes);

  if (!Number.isFinite(value)) {
    return "—";
  }

  if (value < 1) {
    return `${Math.round(value * 60)} sec`;
  }

  if (Number.isInteger(value)) {
    return `${value} min`;
  }

  return `${value.toFixed(1)} min`;
}

function ManualActivityForm({
  onSaved,
  initialHabitId,
}: ManualActivityFormProps) {
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [selectedHabitId, setSelectedHabitId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [validationError, setValidationError] =
    useState<string | null>(null);

  const [isReviewing, setIsReviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [saveError, setSaveError] =
    useState<string | null>(null);

  const [idempotencyKey, setIdempotencyKey] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadHabits() {
      try {
        setLoadError(null);

        const result = await getHabits();
        setHabits(result);

        if (result.length > 0) {
          const initialHabit = initialHabitId
            ? result.find(
                (habit) => habit.id === initialHabitId,
              )
            : undefined;

          setSelectedHabitId(
            initialHabit?.id ?? result[0].id,
          );
        }
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load habits",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadHabits();
  }, [initialHabitId]);

  const selectedHabit = habits.find(
    (habit) => habit.id === selectedHabitId,
  );

  function handleReview(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setValidationError(null);

    const minutes = Number(durationMinutes);

    if (!selectedHabitId) {
      setValidationError("Please select a habit.");
      return;
    }

    if (!Number.isFinite(minutes) || minutes <= 0) {
      setValidationError(
        "Duration must be greater than 0 minutes.",
      );
      return;
    }

    setSaveError(null);
    setIsReviewing(true);
  }

  function createIdempotencyKey() {
    return crypto.randomUUID();
  }

  async function handleSave() {
    if (!selectedHabit) {
      return;
    }

    setSaveError(null);
    setIsSaving(true);

    const key =
      idempotencyKey ?? createIdempotencyKey();

    if (!idempotencyKey) {
      setIdempotencyKey(key);
    }

    try {
      const activity = await createActivity(
        {
          userHabitId: selectedHabit.id,
          activityDate: new Date()
            .toISOString()
            .slice(0, 10),
          source: "MANUAL",
          durationSeconds:
            Number(durationMinutes) * 60,
        },
        key,
      );

      onSaved?.(activity);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to save activity",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit() {
    setIdempotencyKey(null);
    setSaveError(null);
    setIsReviewing(false);
  }

  if (isLoading) {
    return (
      <section className="manual-activity-page">
        <div className="manual-activity-loading">
          <div className="manual-activity-loading-line" />
          <div className="manual-activity-loading-line short" />
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="manual-activity-page">
        <div
          className="manual-activity-error"
          role="alert"
        >
          <strong>Couldn't load your habits</strong>
          <span>{loadError}</span>
        </div>
      </section>
    );
  }

  if (habits.length === 0) {
    return (
      <section className="manual-activity-page">
        <div className="manual-activity-empty">
          <Clock3 size={22} aria-hidden="true" />

          <span className="manual-activity-eyebrow">
            LOG ACTIVITY
          </span>

          <h1>No active habits</h1>

          <p>
            Adopt a habit before recording an activity.
          </p>
        </div>
      </section>
    );
  }

  if (isReviewing && selectedHabit) {
    return (
      <section className="manual-activity-page">
        <div className="manual-activity-review">
          <header className="manual-activity-review-header">
            <div>
              <span className="manual-activity-eyebrow">
                ACTIVITY REVIEW
              </span>

              <h1>
                {selectedHabit.habit.name}
              </h1>
            </div>

            <div className="manual-activity-review-icon">
              <Check
                size={19}
                aria-hidden="true"
              />
            </div>
          </header>

          <div className="manual-activity-review-duration">
            {formatDuration(durationMinutes)}
          </div>

          <div className="manual-activity-review-meta">
            <div>
              <span>Target</span>

              <strong>
                {formatTarget(
                  selectedHabit.habit,
                )}
              </strong>
            </div>

            <div>
              <span>Source</span>

              <strong>Manual</strong>
            </div>

            <div>
              <span>Date</span>

              <strong>
                {new Date().toLocaleDateString(
                  undefined,
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
              </strong>
            </div>
          </div>

          <p className="manual-activity-review-note">
            This activity will be added to your
            activity history.
          </p>

          {saveError && (
            <div
              className="manual-activity-save-error"
              role="alert"
            >
              <strong>
                Couldn't save this activity
              </strong>

              <span>{saveError}</span>

              <span>
                Your entry is still here. Try saving
                again.
              </span>
            </div>
          )}

          <div className="manual-activity-review-actions">
            <button
              className="manual-activity-primary"
              type="button"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving
                ? "Saving..."
                : "Save activity"}
            </button>

            <button
              className="manual-activity-secondary"
              type="button"
              onClick={handleEdit}
              disabled={isSaving}
            >
              <Pencil
                size={14}
                aria-hidden="true"
              />
              Edit
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="manual-activity-page">
      <div className="manual-activity-form-page">
        <header className="manual-activity-header">
          <span className="manual-activity-eyebrow">
            LOG ACTIVITY
          </span>

          <h1>Record what you did.</h1>

          <p>
            Add an activity you completed outside the
            timer.
          </p>
        </header>

        <form
          className="manual-activity-form"
          onSubmit={handleReview}
        >
          <div className="manual-activity-field">
            <label htmlFor="activity-habit">
              Habit
            </label>

            <div className="manual-activity-select">
              <select
                id="activity-habit"
                value={selectedHabitId}
                onChange={(event) => {
                  setSelectedHabitId(
                    event.target.value,
                  );
                  setValidationError(null);
                }}
              >
                {habits.map((habit) => (
                  <option
                    key={habit.id}
                    value={habit.id}
                  >
                    {habit.habit.name}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={16}
                aria-hidden="true"
              />
            </div>
          </div>

          {selectedHabit && (
            <div className="manual-activity-target">
              <span>Target</span>

              <strong>
                {formatTarget(
                  selectedHabit.habit,
                )}
              </strong>
            </div>
          )}

          <div className="manual-activity-field">
            <label htmlFor="activity-duration">
              Duration
            </label>

            <div className="manual-activity-duration-input">
              <input
                id="activity-duration"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="0"
                value={durationMinutes}
                onChange={(event) => {
                  setDurationMinutes(
                    event.target.value,
                  );
                  setValidationError(null);
                }}
              />

              <span>minutes</span>
            </div>
          </div>

          <div className="manual-activity-date">
            <CalendarDays
              size={15}
              aria-hidden="true"
            />

            <span>
              Recording for{" "}
              <strong>
                {new Date().toLocaleDateString(
                  undefined,
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
              </strong>
            </span>
          </div>

          {validationError && (
            <div
              className="manual-activity-validation"
              role="alert"
            >
              {validationError}
            </div>
          )}

          <button
            className="manual-activity-primary manual-activity-submit"
            type="submit"
          >
            Review activity
          </button>
        </form>
      </div>
    </section>
  );
}

export default ManualActivityForm;