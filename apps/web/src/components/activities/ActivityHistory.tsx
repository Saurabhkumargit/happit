import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  getActivities,
  type Activity,
} from "../../services/activityApi";

import {
  getHabits,
  type UserHabit,
} from "../../services/habitApi";

import "./ActivityHistory.css";

interface ActivityHistoryProps {
  onSelectActivity?: (activityId: string) => void;
}

function formatDuration(seconds: number | null) {
  if (seconds === null) {
    return "—";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds} sec`;
  }

  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes} min ${remainingSeconds} sec`;
}

function formatActivityValue(activity: Activity) {
  if (activity.durationSeconds !== null) {
    return formatDuration(activity.durationSeconds);
  }

  if (activity.value !== null) {
    return `${activity.value} ${formatUnit(activity.unit)}`;
  }

  return "Activity recorded";
}

function formatUnit(unit: Activity["unit"]) {
  if (!unit) {
    return "";
  }

  switch (unit) {
    case "MINUTES":
      return "min";
    case "SECONDS":
      return "sec";
    case "REPETITIONS":
      return "reps";
    case "PAGES":
      return "pages";
    case "LITERS":
      return "L";
  }
}

function formatSource(source: Activity["source"]) {
  return source === "TIMER" ? "Timer" : "Manual";
}

function getDateKey(value: string) {
  return value.slice(0, 10);
}

function formatDateHeading(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  if (dateKey === todayKey) {
    return "Today";
  }

  if (dateKey === yesterdayKey) {
    return "Yesterday";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ActivityHistory({
  onSelectActivity,
}: ActivityHistoryProps) {
  const navigate = useNavigate();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedHabitId, setSelectedHabitId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [activeFilters, setActiveFilters] = useState<{
    userHabitId?: string;
    from?: string;
    to?: string;
  }>({});

  useEffect(() => {
    let cancelled = false;

    async function loadHabits() {
      try {
        const userHabits = await getHabits();

        if (!cancelled) {
          setHabits(userHabits);
        }
      } catch {
        // Habit loading is only required for the filter UI.
      }
    }

    loadHabits();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadActivities() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getActivities(activeFilters);

        if (!cancelled) {
          setActivities(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load activity history",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadActivities();

    return () => {
      cancelled = true;
    };
  }, [activeFilters]);

  function handleFilterSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    setActiveFilters({
      userHabitId: selectedHabitId || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
    });
  }

  function handleClearFilters() {
    setSelectedHabitId("");
    setFromDate("");
    setToDate("");
    setActiveFilters({});
  }

  function handleViewActivity(activityId: string) {
    if (onSelectActivity) {
      onSelectActivity(activityId);
    } else {
      navigate(`/app/activities/${activityId}`);
    }
  }

  const groupedActivities = useMemo(() => {
    const groups = new Map<string, Activity[]>();

    for (const activity of activities) {
      const dateKey = getDateKey(activity.activityDate);

      const existing = groups.get(dateKey);

      if (existing) {
        existing.push(activity);
      } else {
        groups.set(dateKey, [activity]);
      }
    }

    return Array.from(groups.entries()).sort(
      ([dateA], [dateB]) =>
        new Date(dateB).getTime() -
        new Date(dateA).getTime(),
    );
  }, [activities]);

  return (
    <section className="activity-history-page">
      <header className="activity-history-header">
        <div>
          <span className="activity-history-eyebrow">
            HISTORY
          </span>

          <h1 className="activity-history-title">
            Activity
          </h1>

          <p className="activity-history-description">
            Your recorded work, over time.
          </p>
        </div>
      </header>

      <form
        className="activity-history-filters"
        onSubmit={handleFilterSubmit}
      >
        <div className="activity-history-filter-heading">
          <Filter size={16} aria-hidden="true" />

          <span>Filter history</span>
        </div>

        <div className="activity-history-filter-grid">
          <div className="activity-history-field">
            <label htmlFor="filter-habit">
              Habit
            </label>

            <select
              id="filter-habit"
              value={selectedHabitId}
              onChange={(e) =>
                setSelectedHabitId(e.target.value)
              }
            >
              <option value="">All habits</option>

              {habits.map((habit) => (
                <option
                  key={habit.id}
                  value={habit.id}
                >
                  {habit.habit.name}
                </option>
              ))}
            </select>
          </div>

          <div className="activity-history-field">
            <label htmlFor="filter-from-date">
              From
            </label>

            <div className="activity-history-input">
              <CalendarDays
                size={15}
                aria-hidden="true"
              />

              <input
                key={`from-${fromDate}`}
                id="filter-from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
          </div>

          <div className="activity-history-field">
            <label htmlFor="filter-to-date">
              To
            </label>

            <div className="activity-history-input">
              <CalendarDays
                size={15}
                aria-hidden="true"
              />

              <input
                key={`to-${toDate}`}
                id="filter-to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          <div className="activity-history-filter-actions">
            <button
              className="activity-history-apply"
              type="submit"
            >
              Apply
            </button>

            <button
              className="activity-history-clear"
              type="button"
              onClick={handleClearFilters}
            >
              Clear
            </button>
          </div>
        </div>
      </form>

      {isLoading && (
        <div
          className="activity-history-state"
          aria-live="polite"
        >
          <div className="activity-history-skeleton" />
          <div className="activity-history-skeleton" />
          <div className="activity-history-skeleton" />
        </div>
      )}

      {error && (
        <div
          className="activity-history-error"
          role="alert"
        >
          <strong>Couldn't load activity</strong>
          <span>{error}</span>
        </div>
      )}

      {!isLoading &&
        !error &&
        activities.length === 0 && (
          <div className="activity-history-empty">
            <span className="activity-history-empty-mark">
              —
            </span>

            <h2>Nothing recorded yet</h2>

            <p>
              Your completed sessions will appear here.
            </p>
          </div>
        )}

      {!isLoading &&
        !error &&
        activities.length > 0 && (
          <div className="activity-history-list">
            {groupedActivities.map(
              ([dateKey, dateActivities]) => (
                <section
                  className="activity-history-day"
                  key={dateKey}
                >
                  <div className="activity-history-day-heading">
                    <h2>
                      {formatDateHeading(dateKey)}
                    </h2>

                    <span>
                      {dateActivities.length}{" "}
                      {dateActivities.length === 1
                        ? "activity"
                        : "activities"}
                    </span>
                  </div>

                  <div className="activity-history-rows">
                    {dateActivities.map((activity) => (
                      <button
                        className="activity-history-row"
                        key={activity.id}
                        type="button"
                        onClick={() =>
                          handleViewActivity(
                            activity.id,
                          )
                        }
                      >
                        <span className="activity-history-row-main">
                          <span className="activity-history-row-name">
                            {activity.habit.name}
                          </span>

                          <span className="activity-history-row-meta">
                            {formatSource(activity.source)}
                            <span aria-hidden="true">
                              ·
                            </span>
                            {activity.activityDate}
                          </span>
                        </span>

                        <span className="activity-history-row-value">
                          <span>
                            {formatActivityValue(
                              activity,
                            )}
                          </span>

                          <ArrowRight
                            size={16}
                            aria-hidden="true"
                          />
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ),
            )}
          </div>
        )}
    </section>
  );
}

export default ActivityHistory;