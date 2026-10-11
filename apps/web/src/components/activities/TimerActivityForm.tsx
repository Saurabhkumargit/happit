import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Clock3,
  Pause,
  Play,
  RotateCcw,
  Square,
} from "lucide-react";

import {
  getHabits,
  type UserHabit,
} from "../../services/habitApi";

import {
  createActivity,
  type Activity,
} from "../../services/activityApi";

import {
  saveTimerState,
  loadTimerState,
  clearTimerState,
} from "../../lib/timerStorage";

import "./TimerActivityForm.css";

interface TimerActivityFormProps {
  onSaved?: (activity: Activity) => void;
  initialHabitId?: string;
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

function getTargetSeconds(habit: UserHabit["habit"]) {
  const target = Number(habit.targetValue);

  if (!Number.isFinite(target) || target <= 0) {
    return null;
  }

  if (habit.targetUnit === "MINUTES") {
    return target * 60;
  }

  if (habit.targetUnit === "SECONDS") {
    return target;
  }

  return null;
}

function formatProgressPercentage(
  elapsedSeconds: number,
  habit: UserHabit["habit"],
) {
  const targetSeconds = getTargetSeconds(habit);

  if (!targetSeconds) {
    return null;
  }

  return Math.min(
    100,
    Math.round((elapsedSeconds / targetSeconds) * 100),
  );
}

function TimerActivityForm({
  onSaved,
  initialHabitId,
}: TimerActivityFormProps) {
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [selectedHabitId, setSelectedHabitId] = useState("");
  const [timerState, setTimerState] =
    useState<TimerState>("IDLE");

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] =
    useState<string | null>(null);

  const startedAtRef = useRef<string | null>(null);
  const runningSinceRef = useRef<number | null>(null);
  const accumulatedSecondsRef = useRef(0);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] =
    useState<string | null>(null);

  const [idempotencyKey, setIdempotencyKey] =
    useState<string | null>(null);

  const [endedAt, setEndedAt] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadHabits() {
      try {
        setLoadError(null);

        const result = await getHabits();
        setHabits(result);

        const savedState = loadTimerState();

        if (savedState && result.length > 0) {
          const habit = result.find(
            (h) => h.id === savedState.habitId,
          );

          if (habit) {
            setSelectedHabitId(savedState.habitId);

            startedAtRef.current =
              savedState.startedAt;

            accumulatedSecondsRef.current =
              savedState.accumulatedSeconds;

            if (
              savedState.state === "RUNNING" &&
              savedState.runningSince
            ) {
              const now = Date.now();

              const additionalSeconds = Math.floor(
                (now - savedState.runningSince) / 1000,
              );

              accumulatedSecondsRef.current +=
                additionalSeconds;

              runningSinceRef.current = now;

              setTimerState("RUNNING");
            } else {
              setTimerState("PAUSED");
            }

            setElapsedSeconds(
              accumulatedSecondsRef.current,
            );
          } else {
            clearTimerState();
          }
        } else if (result.length > 0) {
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
          (Date.now() - runningSinceRef.current) /
            1000,
        );

      setElapsedSeconds(currentElapsed);

      if (
        currentElapsed % 10 === 0 &&
        selectedHabitId &&
        startedAtRef.current
      ) {
        const habit = habits.find(
          (h) => h.id === selectedHabitId,
        );

        if (habit) {
          saveTimerState({
            habitId: selectedHabitId,
            habitName: habit.habit.name,
            startedAt: startedAtRef.current,
            accumulatedSeconds: currentElapsed,
            runningSince: runningSinceRef.current,
            state: "RUNNING",
          });
        }
      }
    }, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [timerState, selectedHabitId, habits]);

  const selectedHabit = habits.find(
    (habit) => habit.id === selectedHabitId,
  );

  function handleStart() {
    if (!selectedHabit) {
      return;
    }

    if (timerState === "IDLE") {
      startedAtRef.current =
        new Date().toISOString();

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
      (Date.now() - runningSinceRef.current) /
        1000,
    );

    runningSinceRef.current = null;

    setElapsedSeconds(
      accumulatedSecondsRef.current,
    );

    setTimerState("PAUSED");

    if (
      selectedHabitId &&
      startedAtRef.current
    ) {
      const habit = habits.find(
        (h) => h.id === selectedHabitId,
      );

      if (habit) {
        saveTimerState({
          habitId: selectedHabitId,
          habitName: habit.habit.name,
          startedAt: startedAtRef.current,
          accumulatedSeconds:
            accumulatedSecondsRef.current,
          runningSince: null,
          state: "PAUSED",
        });
      }
    }
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
        (Date.now() - runningSinceRef.current) /
          1000,
      );

      runningSinceRef.current = null;
    }

    setElapsedSeconds(
      accumulatedSecondsRef.current,
    );

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

    clearTimerState();
  }

  function createIdempotencyKey() {
    return crypto.randomUUID();
  }

  async function handleSave() {
    if (
      !selectedHabit ||
      !startedAtRef.current ||
      !endedAt
    ) {
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
          source: "TIMER",
          durationSeconds: elapsedSeconds,
          startedAt: startedAtRef.current,
          endedAt,
        },
        key,
      );

      clearTimerState();

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
    return (
      <section className="timer-page">
        <div className="timer-loading">
          <div className="timer-loading-line" />
          <div className="timer-loading-circle" />
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="timer-page">
        <div
          className="timer-error"
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
      <section className="timer-page">
        <div className="timer-empty">
          <Clock3 size={22} aria-hidden="true" />

          <span className="timer-eyebrow">
            TIMER
          </span>

          <h1>No active habits</h1>

          <p>
            Adopt a habit before recording a timed
            activity.
          </p>
        </div>
      </section>
    );
  }

  if (
    timerState === "REVIEW" &&
    selectedHabit
  ) {
    const progress = formatProgressPercentage(
      elapsedSeconds,
      selectedHabit.habit,
    );

    return (
      <section className="timer-page">
        <div className="timer-review">
          <div className="timer-review-header">
            <span className="timer-eyebrow">
              ACTIVITY COMPLETE
            </span>

            <div className="timer-review-icon">
              <Check
                size={20}
                aria-hidden="true"
              />
            </div>
          </div>

          <h1 className="timer-review-title">
            {selectedHabit.habit.name}
          </h1>

          <div className="timer-review-duration">
            {formatElapsed(elapsedSeconds)}
          </div>

          <div className="timer-review-stats">
            <div>
              <span>Target</span>
              <strong>
                {formatTarget(
                  selectedHabit.habit,
                )}
              </strong>
            </div>

            <div>
              <span>Recorded</span>
              <strong>
                {formatElapsed(elapsedSeconds)}
              </strong>
            </div>

            {progress !== null && (
              <div>
                <span>Progress</span>
                <strong>{progress}%</strong>
              </div>
            )}
          </div>

          <p className="timer-review-note">
            This session will be recorded as a
            timer activity.
          </p>

          {saveError && (
            <div
              className="timer-save-error"
              role="alert"
            >
              <strong>
                Couldn't save this activity
              </strong>

              <span>{saveError}</span>

              <span>
                Your recorded duration is still
                preserved. Try saving again.
              </span>
            </div>
          )}

          <div className="timer-review-actions">
            <button
              className="timer-primary-button"
              type="button"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving
                ? "Saving..."
                : "Save activity"}
            </button>

            <button
              className="timer-secondary-button"
              type="button"
              onClick={() => {
                setIdempotencyKey(null);
                setSaveError(null);
                setTimerState("PAUSED");
              }}
              disabled={isSaving}
            >
              Edit
            </button>
          </div>
        </div>
      </section>
    );
  }

  const progress =
    selectedHabit
      ? formatProgressPercentage(
          elapsedSeconds,
          selectedHabit.habit,
        )
      : null;

  return (
    <section className="timer-page">
      <div className="timer-workspace">
        <header className="timer-header">
          <span className="timer-eyebrow">
            TIMER
          </span>

          <div className="timer-habit-selector">
            <label htmlFor="timer-habit">
              Habit
            </label>

            <div className="timer-select-wrap">
              <select
                id="timer-habit"
                value={selectedHabitId}
                onChange={(event) => {
                  if (timerState !== "IDLE") {
                    return;
                  }

                  setSelectedHabitId(
                    event.target.value,
                  );
                }}
                disabled={
                  timerState !== "IDLE"
                }
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
        </header>

        {selectedHabit && (
          <div className="timer-focus">
            <div className="timer-habit-name">
              {selectedHabit.habit.name}
            </div>

            <div className="timer-target">
              Target ·{" "}
              {formatTarget(
                selectedHabit.habit,
              )}
            </div>

            <div
              className="timer-display"
              aria-live="polite"
              aria-label={`Elapsed time ${formatElapsed(
                elapsedSeconds,
              )}`}
            >
              {formatElapsed(elapsedSeconds)}
            </div>

            {timerState === "PAUSED" && (
              <div className="timer-status">
                <span className="timer-status-dot" />
                Paused
              </div>
            )}

            {progress !== null &&
              elapsedSeconds > 0 && (
                <div className="timer-progress">
                  <div className="timer-progress-header">
                    <span>Target progress</span>
                    <span>{progress}%</span>
                  </div>

                  <div className="timer-progress-track">
                    <div
                      className="timer-progress-fill"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                </div>
              )}

            <div className="timer-actions">
              {timerState === "IDLE" && (
                <button
                  className="timer-primary-button timer-start-button"
                  type="button"
                  onClick={handleStart}
                >
                  <Play
                    size={17}
                    fill="currentColor"
                    aria-hidden="true"
                  />
                  Start
                </button>
              )}

              {timerState === "RUNNING" && (
                <>
                  <button
                    className="timer-secondary-button"
                    type="button"
                    onClick={handlePause}
                  >
                    <Pause
                      size={16}
                      aria-hidden="true"
                    />
                    Pause
                  </button>

                  <button
                    className="timer-primary-button"
                    type="button"
                    onClick={handleStop}
                  >
                    <Square
                      size={15}
                      fill="currentColor"
                      aria-hidden="true"
                    />
                    Finish
                  </button>
                </>
              )}

              {timerState === "PAUSED" && (
                <>
                  <button
                    className="timer-primary-button"
                    type="button"
                    onClick={handleResume}
                  >
                    <Play
                      size={17}
                      fill="currentColor"
                      aria-hidden="true"
                    />
                    Resume
                  </button>

                  <button
                    className="timer-secondary-button"
                    type="button"
                    onClick={handleStop}
                  >
                    <Check
                      size={16}
                      aria-hidden="true"
                    />
                    Finish
                  </button>

                  <button
                    className="timer-text-button"
                    type="button"
                    onClick={handleCancel}
                  >
                    <RotateCcw
                      size={14}
                      aria-hidden="true"
                    />
                    Cancel session
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default TimerActivityForm;