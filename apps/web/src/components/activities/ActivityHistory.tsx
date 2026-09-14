import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getActivities,
  type Activity,
} from "../../services/activityApi";

import {
  getHabits,
  type UserHabit,
} from "../../services/habitApi";

interface ActivityHistoryProps {
  onSelectActivity?: (activityId: string) => void;
}

function formatDuration(seconds: number | null) {
  if (seconds === null) {
    return "—";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes} min ${remainingSeconds} sec`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

function ActivityHistory({ onSelectActivity }: ActivityHistoryProps) {
  const navigate = useNavigate();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedHabitId, setSelectedHabitId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeFilters, setActiveFilters] = useState<{
    userHabitId?: string;
    from?: string;
    to?: string;
  }>({});

  // Load user habits for filter options
  useEffect(() => {
    let cancelled = false;

    async function loadHabits() {
      try {
        const userHabits = await getHabits();
        if (!cancelled) {
          setHabits(userHabits);
        }
      } catch {
        // Silently ignore if habits cannot be loaded for filters
      }
    }

    loadHabits();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load activities matching activeFilters
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

  function handleFilterSubmit(e: React.FormEvent<HTMLFormElement>) {
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

  return (
    <section>
      <h2>Activity history</h2>

      <form onSubmit={handleFilterSubmit}>
        <fieldset>
          <legend>Filter history</legend>

          <label htmlFor="filter-habit">Habit</label>
          <select
            id="filter-habit"
            value={selectedHabitId}
            onChange={(e) => setSelectedHabitId(e.target.value)}
          >
            <option value="">All habits</option>
            {habits.map((habit) => (
              <option key={habit.id} value={habit.id}>
                {habit.habit.name}
              </option>
            ))}
          </select>

          <label htmlFor="filter-from-date">From</label>
          <input
            id="filter-from-date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />

          <label htmlFor="filter-to-date">To</label>
          <input
            id="filter-to-date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />

          <button type="submit">Apply filters</button>
          <button type="button" onClick={handleClearFilters}>
            Clear filters
          </button>
        </fieldset>
      </form>

      {isLoading && <p>Loading activity history...</p>}

      {error && <p role="alert">{error}</p>}

      {!isLoading && !error && activities.length === 0 && (
        <p>No activities recorded yet.</p>
      )}

      {!isLoading && !error && activities.length > 0 && (
        <ul>
          {activities.map((activity) => (
            <li key={activity.id}>
              <strong>{activity.habit.name}</strong>
              <div>Date: {activity.activityDate}</div>
              <div>Source: {activity.source}</div>

              {activity.durationSeconds !== null && (
                <div>Duration: {formatDuration(activity.durationSeconds)}</div>
              )}

              {activity.value !== null && (
                <div>
                  Value: {activity.value} {activity.unit ?? ""}
                </div>
              )}

              <div>Started: {formatDateTime(activity.startedAt)}</div>
              <div>Ended: {formatDateTime(activity.endedAt)}</div>

              <button
                type="button"
                onClick={() => handleViewActivity(activity.id)}
              >
                View details
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default ActivityHistory;