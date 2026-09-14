import { useEffect, useState } from "react";

import {
  getActivities,
  type Activity,
} from "../../services/activityApi";

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

function ActivityHistory() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadActivities() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getActivities();

        if (!cancelled) {
          setActivities(result);
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
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
  }, []);

  if (isLoading) {
    return <p>Loading activity history...</p>;
  }

  if (error) {
    return (
      <section>
        <h2>Activity history</h2>
        <p role="alert">{error}</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Activity history</h2>

      {activities.length === 0 ? (
        <p>No activities recorded yet.</p>
      ) : (
        <ul>
          {activities.map((activity) => (
            <li key={activity.id}>
              <strong>{activity.habit.name}</strong>
              <div>Date: {activity.activityDate}</div>
              <div>Source: {activity.source}</div>

              {activity.durationSeconds !== null && (
                <div>
                  Duration: {formatDuration(activity.durationSeconds)}
                </div>
              )}

              {activity.value !== null && (
                <div>
                  Value: {activity.value} {activity.unit ?? ""}
                </div>
              )}

              <div>
                Started: {formatDateTime(activity.startedAt)}
              </div>

              <div>
                Ended: {formatDateTime(activity.endedAt)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default ActivityHistory;