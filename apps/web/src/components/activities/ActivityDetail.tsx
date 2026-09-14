import { useEffect, useState } from "react";

import {
  getActivity,
  updateActivity,
  deleteActivity,
  type Activity,
  type ActivityUnit,
  type UpdateActivityInput,
} from "../../services/activityApi";

interface ActivityDetailProps {
  activityId: string;
  onDeleted?: () => void;
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

function formatTarget(habit: Activity["habit"]) {
  const unit = habit.targetUnit ? ` ${habit.targetUnit}` : "";
  return `${habit.targetValue}${unit}`;
}

function ActivityDetail({ activityId, onDeleted }: ActivityDetailProps) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form fields
  const [editDate, setEditDate] = useState("");
  const [editDurationMinutes, setEditDurationMinutes] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editUnit, setEditUnit] = useState<ActivityUnit | "">("");

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      try {
        setIsLoading(true);
        setError(null);

        const result = await getActivity(activityId);

        if (!cancelled) {
          setActivity(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load activity",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadActivity();

    return () => {
      cancelled = true;
    };
  }, [activityId]);

  function startEditing() {
    if (!activity) return;

    setEditDate(activity.activityDate);
    setEditDurationMinutes(
      activity.durationSeconds !== null
        ? String(Math.round(activity.durationSeconds / 60))
        : "",
    );
    setEditValue(activity.value ?? "");
    setEditUnit(
      activity.unit ?? (activity.habit.targetUnit as ActivityUnit) ?? "",
    );
    setValidationError(null);
    setSaveError(null);
    setIsReviewing(false);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setIsReviewing(false);
    setValidationError(null);
    setSaveError(null);
  }

  function handleReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setValidationError(null);

    if (!editDate) {
      setValidationError("Activity date is required.");
      return;
    }

    if (activity?.habit.targetType === "DURATION") {
      const minutes = Number(editDurationMinutes);
      if (!Number.isFinite(minutes) || minutes <= 0) {
        setValidationError("Duration must be greater than 0 minutes.");
        return;
      }
    } else {
      const val = Number(editValue);
      if (!Number.isFinite(val) || val <= 0) {
        setValidationError("Value must be greater than 0.");
        return;
      }
    }

    setIsReviewing(true);
  }

  async function handleSaveUpdate() {
    if (!activity) return;

    setIsSaving(true);
    setSaveError(null);

    const payload: UpdateActivityInput = {
      activityDate: editDate,
    };

    if (activity.habit.targetType === "DURATION") {
      payload.durationSeconds = Number(editDurationMinutes) * 60;
    } else {
      payload.value = Number(editValue);
      if (editUnit) {
        payload.unit = editUnit as ActivityUnit;
      }
    }

    try {
      const updated = await updateActivity(activity.id, payload);

      setActivity((prev) =>
        prev ? { ...prev, ...updated, habit: prev.habit } : null,
      );
      setIsEditing(false);
      setIsReviewing(false);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Unable to update activity",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!activity) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteActivity(activity.id);
      onDeleted?.();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Unable to delete activity",
      );
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <p>Loading activity...</p>;
  }

  if (error || !activity) {
    return (
      <section>
        <h2>Activity detail</h2>
        <p role="alert">{error ?? "Activity not found"}</p>
      </section>
    );
  }

  // 1. Edit Review Sub-flow
  if (isEditing && isReviewing) {
    return (
      <section>
        <h2>Review updated activity</h2>

        <p>
          <strong>Habit:</strong> {activity.habit.name}
        </p>

        <p>
          <strong>Habit target:</strong> {formatTarget(activity.habit)}
        </p>

        <p>
          <strong>New date:</strong> {editDate}
        </p>

        {activity.habit.targetType === "DURATION" ? (
          <p>
            <strong>New duration:</strong> {editDurationMinutes} minutes
          </p>
        ) : (
          <p>
            <strong>New value:</strong> {editValue} {editUnit}
          </p>
        )}

        <p>
          <strong>Source:</strong> {activity.source}
        </p>

        {saveError && <p role="alert">{saveError}</p>}

        <button type="button" onClick={() => setIsReviewing(false)}>
          Back to editing
        </button>

        <button
          type="button"
          onClick={handleSaveUpdate}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </section>
    );
  }

  // 2. Edit Form Sub-flow
  if (isEditing) {
    return (
      <section>
        <h2>Edit activity</h2>

        <p>
          <strong>Habit:</strong> {activity.habit.name}
        </p>

        <p>
          <strong>Habit target:</strong> {formatTarget(activity.habit)}
        </p>

        {validationError && <p role="alert">{validationError}</p>}

        <form onSubmit={handleReview}>
          <label htmlFor="edit-activity-date">Date</label>
          <input
            id="edit-activity-date"
            type="date"
            value={editDate}
            onChange={(e) => {
              setEditDate(e.target.value);
              setValidationError(null);
            }}
          />

          {activity.habit.targetType === "DURATION" ? (
            <>
              <label htmlFor="edit-activity-duration">
                Actual duration (minutes)
              </label>
              <input
                id="edit-activity-duration"
                type="number"
                min="1"
                step="1"
                value={editDurationMinutes}
                onChange={(e) => {
                  setEditDurationMinutes(e.target.value);
                  setValidationError(null);
                }}
              />
            </>
          ) : (
            <>
              <label htmlFor="edit-activity-value">Actual value</label>
              <input
                id="edit-activity-value"
                type="number"
                min="0.01"
                step="any"
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  setValidationError(null);
                }}
              />

              <label htmlFor="edit-activity-unit">Unit</label>
              <input
                id="edit-activity-unit"
                type="text"
                value={editUnit}
                readOnly
                disabled
              />
            </>
          )}

          <button type="submit">Review changes</button>

          <button type="button" onClick={cancelEditing}>
            Cancel
          </button>
        </form>
      </section>
    );
  }

  // 3. Normal Detail View
  return (
    <section>
      <h2>Activity detail</h2>

      <p>
        <strong>Habit:</strong> {activity.habit.name}
      </p>

      {activity.habit.description && (
        <p>
          <strong>Description:</strong> {activity.habit.description}
        </p>
      )}

      <p>
        <strong>Habit target:</strong> {formatTarget(activity.habit)}
      </p>

      <p>
        <strong>Date:</strong> {activity.activityDate}
      </p>

      <p>
        <strong>Source:</strong> {activity.source}
      </p>

      {activity.durationSeconds !== null && (
        <p>
          <strong>Duration:</strong> {formatDuration(activity.durationSeconds)}
        </p>
      )}

      {activity.value !== null && (
        <p>
          <strong>Value:</strong> {activity.value} {activity.unit ?? ""}
        </p>
      )}

      <p>
        <strong>Started:</strong> {formatDateTime(activity.startedAt)}
      </p>

      <p>
        <strong>Ended:</strong> {formatDateTime(activity.endedAt)}
      </p>

      {!showDeleteConfirm ? (
        <div>
          <button type="button" onClick={startEditing}>
            Edit
          </button>

          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setShowDeleteConfirm(true);
            }}
          >
            Delete
          </button>
        </div>
      ) : (
        <div>
          <p>Are you sure you want to delete this activity?</p>

          {deleteError && <p role="alert">{deleteError}</p>}

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Confirm delete"}
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(false)}
            disabled={isDeleting}
          >
            Cancel
          </button>
        </div>
      )}
    </section>
  );
}

export default ActivityDetail;
