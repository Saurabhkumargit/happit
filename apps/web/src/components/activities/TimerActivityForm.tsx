import { useEffect, useRef, useState } from "react";

import {
  getHabits,
  type UserHabit,
} from "../../services/habitApi";

import {
  createActivity,
  type Activity,
} from "../../services/activityApi";

interface TimerActivityFormProps {
  onSaved?: (activity: Activity) => void;
}

type TimerState = "IDLE" | "RUNNING" | "PAUSED" | "REVIEW";

function formatTarget(habit: UserHabit["habit"]) {
  const unit = habit.targetUnit ? ` ${habit.targetUnit}` : "";
  return `${habit.targetValue}${unit}`;
}

function formatElapsed(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [
    hours > 0 ? String(hours).padStart(2, "0") : null,
    String(minutes).padStart(2, "0"),
    String(remainingSeconds).padStart(2, "0"),
  ]
    .filter((part) => part !== null)
    .join(":");
}

function TimerActivityForm({ onSaved }: TimerActivityFormProps) {
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [selectedHabitId, setSelectedHabitId] = useState("");
  const [timerState, setTimerState] = useState<TimerState>("IDLE");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const startedAtRef = useRef<string | null>(null);
  const runningSinceRef = useRef<number | null>(null);
  const accumulatedSecondsRef = useRef(0);
  const [isSaving, setIsSaving] = useState(false);
const [saveError, setSaveError] = useState<string | null>(null);
const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
const [endedAt, setEndedAt] = useState<string | null>(null);

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

  useEffect(() => {
    if (timerState !== "RUNNING") {
      return;
    }

    const interval = window.setInterval(() => {
      if (runningSinceRef.current === null) {
        return;
      }

      const currentElapsed =
        accumulatedSecondsRef.current +
        Math.floor(
          (Date.now() - runningSinceRef.current) / 1000,
        );

      setElapsedSeconds(currentElapsed);
    }, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [timerState]);

  const selectedHabit = habits.find(
    (habit) => habit.id === selectedHabitId,
  );

  function handleStart() {
    if (!selectedHabit) {
      return;
    }

    if (timerState === "IDLE") {
      startedAtRef.current = new Date().toISOString();
      accumulatedSecondsRef.current = 0;

      setElapsedSeconds(0);
      setEndedAt(null);
      setSaveError(null);
      setIdempotencyKey(null);
    }

    runningSinceRef.current = Date.now();
    setTimerState("RUNNING");
  }

  function handlePause() {
    if (
      timerState !== "RUNNING" ||
      runningSinceRef.current === null
    ) {
      return;
    }

    accumulatedSecondsRef.current += Math.floor(
      (Date.now() - runningSinceRef.current) / 1000,
    );

    runningSinceRef.current = null;

    setElapsedSeconds(accumulatedSecondsRef.current);
    setTimerState("PAUSED");
  }

  function handleResume() {
    if (timerState !== "PAUSED") {
      return;
    }

    runningSinceRef.current = Date.now();
    setTimerState("RUNNING");
  }

  function handleStop() {
    if (
      timerState !== "RUNNING" &&
      timerState !== "PAUSED"
    ) {
      return;
    }

    if (
      timerState === "RUNNING" &&
      runningSinceRef.current !== null
    ) {
      accumulatedSecondsRef.current += Math.floor(
        (Date.now() - runningSinceRef.current) / 1000,
      );

      runningSinceRef.current = null;
    }

    setElapsedSeconds(accumulatedSecondsRef.current);
    setEndedAt(new Date().toISOString());
    setTimerState("REVIEW");
  }

  function handleCancel() {
    startedAtRef.current = null;
    runningSinceRef.current = null;
    accumulatedSecondsRef.current = 0;

    setElapsedSeconds(0);
    setEndedAt(null);
    setSaveError(null);
    setIdempotencyKey(null);
    setTimerState("IDLE");
  }

  function createIdempotencyKey() {
    return crypto.randomUUID();
  }

  async function handleSave() {
    if (!selectedHabit || !startedAtRef.current || !endedAt) {
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
          source: "TIMER",
          durationSeconds: elapsedSeconds,
          startedAt: startedAtRef.current,
          endedAt,
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

  if (isLoading) {
    return <p>Loading habits...</p>;
  }

  if (loadError) {
    return <p role="alert">{loadError}</p>;
  }

  if (habits.length === 0) {
    return (
      <section>
        <h2>Timer</h2>
        <p>
          You don't have any active habits to record activity
          against.
        </p>
      </section>
    );
  }

  if (timerState === "REVIEW" && selectedHabit) {
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
          {formatElapsed(elapsedSeconds)}
        </p>

        <p>
          This activity will be recorded as a timer activity.
        </p>

        <button type="button" onClick={() => setTimerState("PAUSED")}>
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
      <h2>Timer</h2>

      <label htmlFor="timer-habit">
        Habit
      </label>

      <select
        id="timer-habit"
        value={selectedHabitId}
        onChange={(event) => {
          if (timerState !== "IDLE") {
            return;
          }

          setSelectedHabitId(event.target.value);
        }}
        disabled={timerState !== "IDLE"}
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

      <p aria-live="polite">
        <strong>{formatElapsed(elapsedSeconds)}</strong>
      </p>

      {timerState === "IDLE" && (
        <button
          type="button"
          onClick={handleStart}
        >
          Start
        </button>
      )}

      {timerState === "RUNNING" && (
        <>
          <button
            type="button"
            onClick={handlePause}
          >
            Pause
          </button>

          <button
            type="button"
            onClick={handleStop}
          >
            Stop
          </button>
        </>
      )}

      {timerState === "PAUSED" && (
        <>
          <button
            type="button"
            onClick={handleResume}
          >
            Resume
          </button>

          <button
            type="button"
            onClick={handleStop}
          >
            Stop
          </button>

          <button
            type="button"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </>
      )}
    </section>
  );
}

export default TimerActivityForm;