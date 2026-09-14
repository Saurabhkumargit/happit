import { useEffect, useState } from "react";

import {
  getHabits,
  type UserHabit,
} from "../../services/habitApi";

import {
  createActivity,
  type Activity,
} from "../../services/activityApi";

interface ManualActivityFormProps {
  onSaved?: (activity: Activity) => void;
}

function formatTarget(habit: UserHabit["habit"]) {
  const unit = habit.targetUnit ? ` ${habit.targetUnit}` : "";
  return `${habit.targetValue}${unit}`;
}

function ManualActivityForm({ onSaved }: ManualActivityFormProps) {
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [selectedHabitId, setSelectedHabitId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  useEffect(() => {
    async function loadHabits() {
      try {
        setLoadError(null);
        const result = await getHabits();
        setHabits(result);

        if (result.length > 0) {
          setSelectedHabitId(result[0].id);
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
  }, []);

  const selectedHabit = habits.find(
    (habit) => habit.id === selectedHabitId,
  );

  function handleReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    const minutes = Number(durationMinutes);

    if (!selectedHabitId) {
      setValidationError("Please select a habit.");
      return;
    }

    if (!Number.isFinite(minutes) || minutes <= 0) {
      setValidationError("Duration must be greater than 0 minutes.");
      return;
    }

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

  const key = idempotencyKey ?? createIdempotencyKey();

  if (!idempotencyKey) {
    setIdempotencyKey(key);
  }

  try {
    const activity = await createActivity(
      {
        userHabitId: selectedHabit.id,
        activityDate: new Date().toISOString().slice(0, 10),
        source: "MANUAL",
        durationSeconds: Number(durationMinutes) * 60,
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
    setIsReviewing(false);
  }

  if (isLoading) {
    return <p>Loading habits...</p>;
  }

  if (loadError) {
    return <p role="alert">{loadError}</p>;
  }

  if (habits.length === 0) {
    return (
      <section>
        <h2>Log activity</h2>
        <p>You don't have any active habits to record activity against.</p>
      </section>
    );
  }

  if (isReviewing && selectedHabit) {
    return (
      <section>
        <h2>Review activity</h2>

        <p>
          <strong>Habit:</strong> {selectedHabit.habit.name}
        </p>

        <p>
          <strong>Habit target:</strong>{" "}
          {formatTarget(selectedHabit.habit)}
        </p>

        <p>
          <strong>Actual duration:</strong>{" "}
          {durationMinutes} minutes
        </p>

        <p>
          This activity will be recorded as a manual activity.
        </p>

        <button type="button" onClick={handleEdit}>
          Edit
        </button>

        {saveError && (
          <p role="alert">{saveError}</p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save activity"}
        </button>
      </section>
    );
  }

  return (
    <section>
      <h2>Log activity</h2>

      {validationError && (
        <p role="alert">{validationError}</p>
      )}

      <form onSubmit={handleReview}>
        <label htmlFor="activity-habit">
          Habit
        </label>

        <select
          id="activity-habit"
          value={selectedHabitId}
          onChange={(event) => {
            setSelectedHabitId(event.target.value);
            setValidationError(null);
          }}
        >
          {habits.map((habit) => (
            <option key={habit.id} value={habit.id}>
              {habit.habit.name}
            </option>
          ))}
        </select>

        {selectedHabit && (
          <p>
            <strong>Target:</strong>{" "}
            {formatTarget(selectedHabit.habit)}
          </p>
        )}

        <label htmlFor="activity-duration">
          Actual duration (minutes)
        </label>

        <input
          id="activity-duration"
          type="number"
          min="0"
          step="1"
          value={durationMinutes}
          onChange={(event) => {
            setDurationMinutes(event.target.value);
            setValidationError(null);
          }}
        />

        <button type="submit">
          Review activity
        </button>
      </form>
    </section>
  );
}

export default ManualActivityForm;
