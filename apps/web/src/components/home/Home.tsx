import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Clock3, History } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getActivities, type Activity } from "../../services/activityApi";
import { getHabits, type UserHabit } from "../../services/habitApi";
import {
  getOverallProgress,
  type HabitProgress,
  type OverallProgress,
  type Occurrence,
} from "../../services/progressApi";

import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import LoadingSpinner from "../ui/LoadingSpinner";

import "./Home.css";

function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getWeekStart(date = new Date()): Date {
  const result = new Date(date);
  const day = result.getDay();

  const difference = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + difference);
  result.setHours(0, 0, 0, 0);

  return result;
}

function formatDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning.";
  }

  if (hour < 18) {
    return "Good afternoon.";
  }

  return "Good evening.";
}

function formatTarget(targetValue: string, targetUnit: string): string {
  const value = Number(targetValue);

  if (targetUnit === "MINUTES") {
    return `${value} min`;
  }

  if (targetUnit === "SECONDS") {
    return `${value} sec`;
  }

  if (targetUnit === "REPETITIONS") {
    return `${value} reps`;
  }

  if (targetUnit === "PAGES") {
    return `${value} pages`;
  }

  if (targetUnit === "LITERS") {
    return `${value} L`;
  }

  return `${value} ${targetUnit.toLowerCase()}`;
}

function formatActivityValue(activity: Activity): string {
  if (activity.durationSeconds !== null) {
    const minutes = Math.round(activity.durationSeconds / 60);

    if (minutes > 0) {
      return `${minutes} min`;
    }

    return `${activity.durationSeconds} sec`;
  }

  if (activity.value !== null) {
    const value = Number(activity.value);

    switch (activity.unit) {
      case "PAGES":
        return `${value} pages`;
      case "REPETITIONS":
        return `${value} reps`;
      case "LITERS":
        return `${value} L`;
      case "MINUTES":
        return `${value} min`;
      case "SECONDS":
        return `${value} sec`;
      default:
        return String(value);
    }
  }

  return "Completed";
}

function formatActivityTime(activity: Activity): string {
  const date = new Date(
    activity.createdAt || `${activity.activityDate}T00:00:00`,
  );

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getTodayOccurrence(
  habitProgress: HabitProgress,
  today: string,
): Occurrence | undefined {
  return habitProgress.occurrences.find(
    (occurrence) => occurrence.date === today,
  );
}

function formatProgressValue(value: number, unit: string): string {
  if (unit.toLowerCase() === "minutes") {
    if (value < 1) {
      return `${Math.round(value * 60)} sec`;
    }

    const minutes = Number.isInteger(value) ? value : Number(value.toFixed(1));

    return `${minutes} min`;
  }

  if (unit.toLowerCase() === "seconds") {
    return `${Math.round(value)} sec`;
  }

  if (unit.toLowerCase() === "repetitions") {
    return `${value} reps`;
  }

  if (unit.toLowerCase() === "pages") {
    return `${value} pages`;
  }

  if (unit.toLowerCase() === "liters") {
    return `${value} L`;
  }

  return `${value} ${unit.toLowerCase()}`;
}

function getProgressLabel(occurrence: Occurrence, targetUnit: string): string {
  if (occurrence.actualValue !== undefined) {
    return `${formatProgressValue(
      occurrence.actualValue,
      targetUnit,
    )} / ${formatProgressValue(occurrence.targetValue, targetUnit)}`;
  }

  return "Not completed";
}

function getActionLabel(habit: UserHabit): string {
  if (habit.habit.targetType === "DURATION") {
    return "Start";
  }

  return "Log";
}

function Home() {
  const navigate = useNavigate();

  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [progress, setProgress] = useState<OverallProgress | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => getLocalDateString(), []);
  const weekStart = useMemo(() => getLocalDateString(getWeekStart()), []);

  useEffect(() => {
    async function loadHome() {
      try {
        setError(null);
        setIsLoading(true);

        const [habitsResult, progressResult, activitiesResult] =
          await Promise.all([
            getHabits(),
            getOverallProgress({
              from: weekStart,
              to: today,
            }),
            getActivities({
              from: weekStart,
              to: today,
            }),
          ]);

        setHabits(habitsResult);
        setProgress(progressResult);
        setActivities(activitiesResult);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Unable to load your day",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadHome();
  }, [today, weekStart]);

  if (isLoading) {
    return (
      <section className="home-page">
        <div className="home-loading">
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="home-page">
        <div className="home-error">
          <ErrorState message={error} />
        </div>
      </section>
    );
  }

  if (habits.length === 0) {
    return (
      <section className="home-page">
        <header className="home-header">
          <p className="home-eyebrow">{formatDate()}</p>
          <h1>{getGreeting()}</h1>
          <p className="home-description">
            Build your day one habit at a time.
          </p>
        </header>

        <EmptyState
          title="Your day starts here"
          description="Choose a few habits to build your routine."
          action={
            <Button onClick={() => navigate("/app/habits")}>
              Browse habits
            </Button>
          }
        />
      </section>
    );
  }

  const progressByHabitId = new Map(
    progress?.habits.map((habitProgress) => [
      habitProgress.habit.id,
      habitProgress,
    ]) ?? [],
  );

  const todayHabits = habits.map((userHabit) => {
    const habitProgress = progressByHabitId.get(userHabit.habitId);
    const occurrence = habitProgress
      ? getTodayOccurrence(habitProgress, today)
      : undefined;

    return {
      userHabit,
      habitProgress,
      occurrence,
    };
  });

  const expectedToday = todayHabits.filter(
    ({ occurrence }) => occurrence && occurrence.state !== "UNSCHEDULED",
  );

  const completedToday = expectedToday.filter(
    ({ occurrence }) => occurrence?.state === "COMPLETED",
  );

  const recentActivities = [...activities]
    .sort((a, b) => {
      const first = new Date(
        b.createdAt || `${b.activityDate}T00:00:00`,
      ).getTime();

      const second = new Date(
        a.createdAt || `${a.activityDate}T00:00:00`,
      ).getTime();

      return first - second;
    })
    .slice(0, 5);

  return (
    <section className="home-page">
      <header className="home-header">
        <p className="home-eyebrow">{formatDate()}</p>

        <div className="home-header-row">
          <div>
            <h1>{getGreeting()}</h1>
            <p className="home-description">Stay consistent. Keep it simple.</p>
          </div>

          <div className="home-completion">
            <span className="home-completion-value">
              {completedToday.length}
            </span>
            <span className="home-completion-total">
              / {expectedToday.length}
            </span>
            <span className="home-completion-label">today</span>
          </div>
        </div>
      </header>

      <div className="home-content">
        <section className="home-section home-today-section">
          <div className="home-section-header">
            <div>
              <p className="home-section-eyebrow">Today</p>
              <h2>What needs your attention</h2>
            </div>

            <span className="home-section-count">
              {completedToday.length} of {expectedToday.length}
            </span>
          </div>

          <div className="home-habit-list">
            {todayHabits.map(({ userHabit, occurrence }) => {
              const isCompleted = occurrence?.state === "COMPLETED";

              const isUnscheduled = occurrence?.state === "UNSCHEDULED";

              return (
                <article
                  key={userHabit.id}
                  className={`home-habit-row${
                    isCompleted ? " completed" : ""
                  }${isUnscheduled ? " unscheduled" : ""}`}
                >
                  <div className="home-habit-status">
                    {isCompleted ? (
                      <span className="home-habit-check" aria-label="Completed">
                        <Check size={16} aria-hidden="true" />
                      </span>
                    ) : (
                      <span className="home-habit-dot" aria-hidden="true" />
                    )}
                  </div>

                  <div className="home-habit-info">
                    <h3>{userHabit.habit.name}</h3>

                    <p>
                      {formatTarget(
                        userHabit.habit.targetValue,
                        userHabit.habit.targetUnit,
                      )}
                      {" · "}
                      {occurrence
                        ? getProgressLabel(
                            occurrence,
                            userHabit.habit.targetUnit,
                          )
                        : "Not completed"}
                    </p>
                  </div>

                  {!isCompleted && !isUnscheduled && (
                    <button
                      type="button"
                      className="home-habit-action"
                      onClick={() => {
                        if (userHabit.habit.targetType === "DURATION") {
                          navigate(
                            `/app/activities/timer?habitId=${userHabit.id}`,
                          );
                        } else {
                          navigate(
                            `/app/activities/new?habitId=${userHabit.id}`,
                          );
                        }
                      }}
                    >
                      {getActionLabel(userHabit)}
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <div className="home-secondary-grid">
          <section className="home-section home-momentum">
            <div className="home-section-header">
              <div>
                <p className="home-section-eyebrow">This week</p>
                <h2>Momentum</h2>
              </div>

              <button
                type="button"
                className="home-text-action"
                onClick={() => navigate("/app/progress")}
              >
                Progress
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>

            <div className="home-week">
              {Array.from({ length: 7 }).map((_, index) => {
                const date = new Date(getWeekStart());
                date.setDate(date.getDate() + index);

                const dateString = getLocalDateString(date);
                const dayLabel = new Intl.DateTimeFormat("en-US", {
                  weekday: "short",
                }).format(date);

                const completed = progress?.habits.some((habitProgress) =>
                  habitProgress.occurrences.some(
                    (occurrence) =>
                      occurrence.date === dateString &&
                      occurrence.state === "COMPLETED",
                  ),
                );

                const isToday = dateString === today;

                return (
                  <div
                    key={dateString}
                    className={`home-week-day${
                      completed ? " completed" : ""
                    }${isToday ? " today" : ""}`}
                  >
                    <span>{dayLabel.slice(0, 1)}</span>

                    <span className="home-week-dot" aria-hidden="true" />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="home-section home-recent">
            <div className="home-section-header">
              <div>
                <p className="home-section-eyebrow">Recent</p>
                <h2>Activity</h2>
              </div>

              <button
                type="button"
                className="home-text-action"
                onClick={() => navigate("/app/activities")}
              >
                History
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>

            {recentActivities.length === 0 ? (
              <div className="home-recent-empty">
                <Clock3 size={18} aria-hidden="true" />
                <p>Nothing logged yet.</p>
              </div>
            ) : (
              <div className="home-activity-list">
                {recentActivities.map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                    className="home-activity-row"
                    onClick={() => navigate(`/app/activities/${activity.id}`)}
                  >
                    <span className="home-activity-icon">
                      <History size={16} aria-hidden="true" />
                    </span>

                    <span className="home-activity-info">
                      <strong>{activity.habit.name}</strong>
                      <span>
                        {activity.activityDate} · {formatActivityTime(activity)}
                      </span>
                    </span>

                    <span className="home-activity-value">
                      {formatActivityValue(activity)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

export default Home;
