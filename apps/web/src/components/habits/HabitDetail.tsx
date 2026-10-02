import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Clock3, Flame, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  archiveHabit,
  getHabit,
  type UserHabit,
} from "../../services/habitApi";
import {
  getHabitProgress,
  type HabitProgress,
  type Occurrence,
} from "../../services/progressApi";
import {
  getActivities,
  type Activity,
} from "../../services/activityApi";

import "./HabitDetail.css";

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

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatActivityValue(activity: Activity) {
  if (activity.durationSeconds !== null) {
    const totalMinutes = activity.durationSeconds / 60;

    if (totalMinutes < 1) {
      return `${Math.round(activity.durationSeconds)} sec`;
    }

    if (totalMinutes < 60) {
      const rounded = Math.round(totalMinutes * 10) / 10;
      return `${rounded} min`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

    return minutes === 0
      ? `${hours}h`
      : `${hours}h ${minutes}m`;
  }

  if (activity.value !== null) {
    return `${activity.value}${activity.unit ? ` ${activity.unit.toLowerCase()}` : ""}`;
  }

  return "Completed";
}

function formatTotalActivity(activities: Activity[], targetType: string) {
  if (targetType === "DURATION") {
    const totalSeconds = activities.reduce(
      (sum, activity) => sum + (activity.durationSeconds ?? 0),
      0,
    );

    if (totalSeconds < 60) {
      return `${Math.round(totalSeconds)} sec`;
    }

    const totalMinutes = totalSeconds / 60;

    if (totalMinutes < 60) {
      return `${Math.round(totalMinutes)} min`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

    return minutes === 0
      ? `${hours}h`
      : `${hours}h ${minutes}m`;
  }

  const totalValue = activities.reduce(
    (sum, activity) => sum + Number(activity.value ?? 0),
    0,
  );

  return `${totalValue} ${
    activities[0]?.unit?.toLowerCase() ?? "units"
  }`;
}

function getGuidance(habit: UserHabit["habit"]) {
  const key = habit.key.toLowerCase();
  const name = habit.name.toLowerCase();

  if (key.includes("read") || name.includes("read")) {
    return {
      approach:
        "Make reading easy to start. Pick a time you can repeat consistently, remove distractions, and focus on showing up rather than making every session perfect.",
      benefits: [
        "Creates dedicated time for focused reading",
        "Builds a repeatable learning routine",
        "Makes progress easier to see over time",
      ],
    };
  }

  if (
    key.includes("exercise") ||
    key.includes("workout") ||
    name.includes("exercise") ||
    name.includes("workout")
  ) {
    return {
      approach:
        "Keep the barrier to starting low. Choose a realistic time, begin with the planned target, and focus on maintaining the routine rather than maximizing every session.",
      benefits: [
        "Creates a consistent movement routine",
        "Makes regular activity easier to maintain",
        "Turns exercise into a repeatable part of your day",
      ],
    };
  }

  if (key.includes("meditat") || name.includes("meditat")) {
    return {
      approach:
        "Choose a quiet, repeatable time and keep the practice simple. The goal is to return to the habit consistently, not to make every session feel perfect.",
      benefits: [
        "Creates dedicated time for a mindful pause",
        "Builds a repeatable daily practice",
        "Makes consistency easier to observe over time",
      ],
    };
  }

  if (key.includes("water") || name.includes("water")) {
    return {
      approach:
        "Make the habit visible throughout the day. Keep water accessible and connect drinking it with routines you already follow.",
      benefits: [
        "Creates a more deliberate hydration routine",
        "Makes daily intake easier to track",
        "Turns the behavior into a repeatable routine",
      ],
    };
  }

  if (key.includes("sleep") || name.includes("sleep")) {
    return {
      approach:
        "Keep your routine predictable and make your target realistic. Consistency matters more than trying to compensate for an occasional missed day.",
      benefits: [
        "Creates a more consistent daily rhythm",
        "Makes your routine easier to observe",
        "Encourages sustainable behavior over time",
      ],
    };
  }

  return {
    approach:
      "Keep the habit simple enough to repeat. Focus on showing up consistently and treat each completed session as progress rather than trying to make every day perfect.",
    benefits: [
      "Builds a repeatable routine",
      "Makes progress visible over time",
      "Encourages consistency over perfection",
    ],
  };
}

function getMonthRange() {
  const today = new Date();

  const to = new Date(today);
  const from = new Date(today);

  from.setDate(from.getDate() - 29);

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function getOccurrenceSummary(occurrences: Occurrence[]) {
  return occurrences.reduce(
    (summary, occurrence) => {
      if (occurrence.state === "COMPLETED") {
        summary.completed += 1;
      }

      if (occurrence.state === "INCOMPLETE") {
        summary.incomplete += 1;
      }

      if (occurrence.state === "UNSCHEDULED") {
        summary.unscheduled += 1;
      }

      return summary;
    },
    {
      completed: 0,
      incomplete: 0,
      unscheduled: 0,
    },
  );
}

interface HabitDetailProps {
  habitId: string;
  onArchived?: () => void;
}

function HabitDetail({ habitId, onArchived }: HabitDetailProps) {
  const navigate = useNavigate();

  const [habit, setHabit] = useState<UserHabit | null>(null);
  const [progress, setProgress] = useState<HabitProgress | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isArchiving, setIsArchiving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHabit() {
      try {
        setError(null);
        setIsLoading(true);

        const range = getMonthRange();

        const habitResult = await getHabit(habitId);

        const [progressResult, activityResult] = await Promise.all([
          getHabitProgress(habitId, range),
          getActivities({
            userHabitId: habitResult.id,
            ...range,
          }),
        ]);

        setHabit(habitResult);
        setProgress(progressResult);
        setActivities(activityResult);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load habit",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadHabit();
  }, [habitId]);

  async function handleArchive() {
    if (!habit) {
      return;
    }

    try {
      setError(null);
      setIsArchiving(true);

      const archivedHabit = await archiveHabit(habit.id);

      setHabit(archivedHabit);

      onArchived?.();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to archive habit",
      );
    } finally {
      setIsArchiving(false);
    }
  }

  const guidance = useMemo(
    () => (habit ? getGuidance(habit.habit) : null),
    [habit],
  );

  const occurrenceSummary = useMemo(
    () =>
      progress
        ? getOccurrenceSummary(progress.occurrences)
        : null,
    [progress],
  );

  const totalActivity = useMemo(
    () =>
      habit
        ? formatTotalActivity(
            activities,
            habit.habit.targetType,
          )
        : null,
    [activities, habit],
  );

  if (isLoading) {
    return (
      <section className="habit-detail-page" aria-busy="true">
        <div
          className="habit-detail-loading"
          role="status"
          aria-live="polite"
        >
          <div className="habit-detail-loading-line" />
          <span>Loading habit...</span>
        </div>
      </section>
    );
  }

  if (error && !habit) {
    return (
      <section className="habit-detail-page">
        <div className="habit-detail-state" role="alert">
          {error}
        </div>
      </section>
    );
  }

  if (!habit) {
    return (
      <section className="habit-detail-page">
        <div className="habit-detail-state" role="alert">
          Habit not found.
        </div>
      </section>
    );
  }

  return (
    <section className="habit-detail-page">
      <header className="habit-detail-header">
        <div className="habit-detail-heading">
          <span className="habit-detail-eyebrow">HABIT</span>

          <h1 className="habit-detail-title">
            {habit.habit.name}
          </h1>

          {habit.habit.description && (
            <p className="habit-detail-description">
              {habit.habit.description}
            </p>
          )}

          <div className="habit-detail-target-line">
            <span>{formatTarget(habit.habit)}</span>
            <span aria-hidden="true">·</span>
            <span>{formatSchedule(habit.habit)}</span>
          </div>
        </div>

        <div
          className={`habit-detail-status ${
            habit.status === "ACTIVE" ? "is-active" : ""
          }`}
        >
          <span
            className="habit-detail-status-dot"
            aria-hidden="true"
          />

          {habit.status}
        </div>
      </header>

      {habit.status === "ACTIVE" &&
        habit.habit.targetType === "DURATION" && (
          <div className="habit-detail-primary-action">
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/app/activities/timer?habitId=${habit.habitId}`,
                )
              }
            >
              Start habit
              <ArrowRight size={16} />
            </button>
          </div>
        )}

      {progress && (
        <>
          <section className="habit-detail-section">
            <div className="habit-detail-section-header">
              <div>
                <span className="habit-detail-section-eyebrow">
                  YOUR PROGRESS
                </span>
                <h2>How you're doing</h2>
              </div>

              <span className="habit-detail-range">
                Last 30 days
              </span>
            </div>

            <div className="habit-detail-stats">
              <div className="habit-detail-stat">
                <span className="habit-detail-stat-value">
                  {Math.round(progress.consistency.percentage)}%
                </span>

                <span className="habit-detail-stat-label">
                  Consistency
                </span>
              </div>

              <div className="habit-detail-stat">
                <span className="habit-detail-stat-icon">
                  <Flame size={16} />
                </span>

                <span className="habit-detail-stat-value">
                  {progress.streaks.current}
                </span>

                <span className="habit-detail-stat-label">
                  Current streak
                </span>
              </div>

              <div className="habit-detail-stat">
                <span className="habit-detail-stat-icon">
                  <Trophy size={16} />
                </span>

                <span className="habit-detail-stat-value">
                  {progress.streaks.longest}
                </span>

                <span className="habit-detail-stat-label">
                  Best streak
                </span>
              </div>

              <div className="habit-detail-stat">
                <span className="habit-detail-stat-icon">
                  <Clock3 size={16} />
                </span>

                <span className="habit-detail-stat-value">
                  {totalActivity ?? "—"}
                </span>

                <span className="habit-detail-stat-label">
                  Recorded
                </span>
              </div>
            </div>

            <div className="habit-detail-consistency">
              <div className="habit-detail-consistency-header">
                <span>
                  {progress.consistency.completed} /{" "}
                  {progress.consistency.expected}
                </span>

                <span>scheduled occurrences completed</span>
              </div>

              <div
                className="habit-detail-progress-bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(
                  progress.consistency.percentage,
                )}
                aria-label="Habit consistency"
              >
                <span
                  style={{
                    width: `${Math.min(
                      Math.max(progress.consistency.percentage, 0),
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          </section>

          <section className="habit-detail-section">
            <div className="habit-detail-section-header">
              <div>
                <span className="habit-detail-section-eyebrow">
                  ACTIVITY
                </span>
                <h2>Last 30 days</h2>
              </div>
            </div>

            <div className="habit-detail-heatmap">
              {progress.occurrences.map((occurrence) => {
                const stateLabel =
                  occurrence.state === "COMPLETED"
                    ? "completed"
                    : occurrence.state === "INCOMPLETE"
                      ? "not completed"
                      : occurrence.state === "UPCOMING"
                        ? "upcoming"
                        : "not scheduled";

                return (
                  <div
                    key={occurrence.date}
                    className={`habit-detail-day is-${occurrence.state.toLowerCase()}`}
                    title={`${formatDate(
                      occurrence.date,
                    )}: ${stateLabel}`}
                    aria-label={`${formatDate(
                      occurrence.date,
                    )}: ${stateLabel}`}
                  >
                    {occurrence.state === "COMPLETED" && (
                      <Check size={11} aria-hidden="true" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="habit-detail-activity-summary">
              <span>
                {occurrenceSummary?.completed ?? 0} completed
              </span>

              <span>
                {occurrenceSummary?.incomplete ?? 0} missed
              </span>

              <span>
                {occurrenceSummary?.unscheduled ?? 0} not scheduled
              </span>
            </div>
          </section>
        </>
      )}

      {guidance && (
        <section className="habit-detail-guidance">
          <div className="habit-detail-guidance-block">
            <span className="habit-detail-section-eyebrow">
              HOW TO APPROACH IT
            </span>

            <p>{guidance.approach}</p>
          </div>

          <div className="habit-detail-guidance-block">
            <span className="habit-detail-section-eyebrow">
              WHY IT MATTERS
            </span>

            <ul>
              {guidance.benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="habit-detail-section">
        <div className="habit-detail-section-header">
          <div>
            <span className="habit-detail-section-eyebrow">
              RECENT ACTIVITY
            </span>
            <h2>What you've recorded</h2>
          </div>

          <button
            type="button"
            className="habit-detail-text-action"
            onClick={() =>
              navigate(
                `/app/activities?userHabitId=${habit.id}`,
              )
            }
          >
            View all
            <ArrowRight size={14} />
          </button>
        </div>

        {activities.length === 0 ? (
          <div className="habit-detail-empty">
            <p>No activity recorded in the last 30 days.</p>

            {habit.status === "ACTIVE" && (
              <span>
                Complete your first session to start building
                your history.
              </span>
            )}
          </div>
        ) : (
          <div className="habit-detail-activity-list">
            {activities.slice(0, 5).map((activity) => (
              <button
                key={activity.id}
                type="button"
                className="habit-detail-activity-row"
                onClick={() =>
                  navigate(
                    `/app/activities/${activity.id}`,
                  )
                }
              >
                <div>
                  <strong>
                    {formatDate(activity.activityDate)}
                  </strong>

                  <span>
                    {activity.source === "TIMER"
                      ? "Timer"
                      : "Manual"}
                  </span>
                </div>

                <span className="habit-detail-activity-value">
                  {formatActivityValue(activity)}
                </span>

                <ArrowRight size={14} />
              </button>
            ))}
          </div>
        )}
      </section>

      {error && (
        <div className="habit-detail-error" role="alert">
          {error}
        </div>
      )}

      {habit.status === "ACTIVE" && (
        <div className="habit-detail-actions">
          <p className="habit-detail-action-note">
            Archiving removes this habit from your active routine.
            Your activity history will remain preserved.
          </p>

          <button
            type="button"
            className="habit-detail-archive-button"
            onClick={handleArchive}
            disabled={isArchiving}
          >
            {isArchiving ? "Archiving..." : "Archive"}
          </button>
        </div>
      )}
    </section>
  );
}

export default HabitDetail;