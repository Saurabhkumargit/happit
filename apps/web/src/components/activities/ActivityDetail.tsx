import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, CalendarDays, Clock3, Pencil, Trash2, Activity as ActivityIcon, Save, X } from "lucide-react";
import { getActivity, updateActivity, deleteActivity, type Activity, type ActivityUnit, type UpdateActivityInput } from "../../services/activityApi";
import "./ActivityDetail.css";

interface ActivityDetailProps {
  activityId: string;
  onDeleted?: () => void;
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds === 0 ? `${minutes} min` : `${minutes} min ${remainingSeconds} sec`;
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function formatTarget(habit: Activity["habit"]) {
  const unit = habit.targetUnit ? ` ${habit.targetUnit}` : "";
  return `${habit.targetValue}${unit}`;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function ActivityDetail({ activityId, onDeleted }: ActivityDetailProps) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

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
        if (!cancelled) setActivity(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load activity");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadActivity();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  function startEditing() {
    if (!activity) return;
    setEditDate(activity.activityDate);
    setEditDurationMinutes(
      activity.durationSeconds !== null ? String(Math.round(activity.durationSeconds / 60)) : "",
    );
    setEditValue(activity.value ?? "");
    setEditUnit(activity.unit ?? (activity.habit.targetUnit as ActivityUnit) ?? "");
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

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      const value = Number(editValue);
      if (!Number.isFinite(value) || value <= 0) {
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
    const payload: UpdateActivityInput = { activityDate: editDate };

    if (activity.habit.targetType === "DURATION") {
      payload.durationSeconds = Number(editDurationMinutes) * 60;
    } else {
      payload.value = Number(editValue);
      if (editUnit) payload.unit = editUnit as ActivityUnit;
    }

    try {
      const updated = await updateActivity(activity.id, payload);
      setActivity((previous) => previous ? { ...previous, ...updated, habit: previous.habit } : null);
      setIsEditing(false);
      setIsReviewing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to update activity");
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
      setDeleteError(err instanceof Error ? err.message : "Unable to delete activity");
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <section className="activity-detail-page">
        <div className="activity-detail-state" role="status">
          <span className="activity-detail-spinner" />
          <p>Loading activity...</p>
        </div>
      </section>
    );
  }

  if (error || !activity) {
    return (
      <section className="activity-detail-page">
        <div className="activity-detail-error" role="alert">
          <ActivityIcon size={22} aria-hidden="true" />
          <div>
            <h1>Activity unavailable</h1>
            <p>{error ?? "Activity not found"}</p>
          </div>
        </div>
      </section>
    );
  }

  if (isEditing && isReviewing) {
    return (
      <section className="activity-detail-page">
        <header className="activity-detail-header">
          <p className="activity-detail-eyebrow">HISTORY / REVIEW</p>
          <h1>Review changes</h1>
          <p className="activity-detail-subtitle">Check the updated details before saving.</p>
        </header>

        <div className="activity-detail-panel">
          <div className="activity-detail-panel-heading">
            <span className="activity-detail-icon"><ActivityIcon size={21} /></span>
            <div>
              <h2>{activity.habit.name}</h2>
              <p>Target · {formatTarget(activity.habit)}</p>
            </div>
          </div>
          <dl className="activity-detail-metadata">
            <div><dt>New date</dt><dd>{formatDate(editDate)}</dd></div>
            {activity.habit.targetType === "DURATION"
              ? <div><dt>New duration</dt><dd>{editDurationMinutes} minutes</dd></div>
              : <div><dt>New value</dt><dd>{editValue} {editUnit}</dd></div>}
            <div><dt>Source</dt><dd>{activity.source}</dd></div>
          </dl>
          {saveError && <p className="activity-form-error" role="alert">{saveError}</p>}
          <div className="activity-detail-actions">
            <button type="button" className="activity-button activity-button-secondary" onClick={() => setIsReviewing(false)} disabled={isSaving}>
              <ArrowLeft size={16} /> Back to editing
            </button>
            <button type="button" className="activity-button activity-button-primary" onClick={() => void handleSaveUpdate()} disabled={isSaving}>
              <Save size={16} /> {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (isEditing) {
    return (
      <section className="activity-detail-page">
        <header className="activity-detail-header">
          <p className="activity-detail-eyebrow">HISTORY / EDIT ACTIVITY</p>
          <h1>Edit activity</h1>
          <p className="activity-detail-subtitle">Make a correction to your activity record.</p>
        </header>

        <div className="activity-detail-panel">
          <div className="activity-detail-panel-heading">
            <span className="activity-detail-icon"><ActivityIcon size={21} /></span>
            <div>
              <h2>{activity.habit.name}</h2>
              <p>Target · {formatTarget(activity.habit)}</p>
            </div>
          </div>

          {validationError && <p className="activity-form-error" role="alert">{validationError}</p>}

          <form className="activity-edit-form" onSubmit={handleReview}>
            <div className="activity-form-field">
              <label htmlFor="edit-activity-date">Activity date</label>
              <input id="edit-activity-date" type="date" value={editDate} onChange={(event) => { setEditDate(event.target.value); setValidationError(null); }} required />
            </div>

            {activity.habit.targetType === "DURATION" ? (
              <div className="activity-form-field">
                <label htmlFor="edit-activity-duration">Actual duration (minutes)</label>
                <input id="edit-activity-duration" type="number" min="1" step="1" value={editDurationMinutes} onChange={(event) => { setEditDurationMinutes(event.target.value); setValidationError(null); }} required />
              </div>
            ) : (
              <>
                <div className="activity-form-field">
                  <label htmlFor="edit-activity-value">Actual value</label>
                  <input id="edit-activity-value" type="number" min="0.01" step="any" value={editValue} onChange={(event) => { setEditValue(event.target.value); setValidationError(null); }} required />
                </div>
                <div className="activity-form-field">
                  <label htmlFor="edit-activity-unit">Unit</label>
                  <input id="edit-activity-unit" type="text" value={editUnit} readOnly disabled />
                </div>
              </>
            )}

            <div className="activity-detail-actions">
              <button type="submit" className="activity-button activity-button-primary"><Pencil size={16} /> Review changes</button>
              <button type="button" className="activity-button activity-button-secondary" onClick={cancelEditing}><X size={16} /> Cancel</button>
            </div>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="activity-detail-page">
      <header className="activity-detail-header">
        <p className="activity-detail-eyebrow">YOUR HISTORY</p>
        <h1>Activity details</h1>
        <p className="activity-detail-subtitle">A record of the work you put in, one session at a time.</p>
      </header>

      <article className="activity-detail-panel">
        <div className="activity-detail-panel-heading">
          <span className="activity-detail-icon"><ActivityIcon size={21} aria-hidden="true" /></span>
          <div className="activity-detail-habit-heading">
            <p className="activity-detail-kicker">HABIT</p>
            <h2>{activity.habit.name}</h2>
            {activity.habit.description && <p className="activity-detail-description">{activity.habit.description}</p>}
          </div>
          <span className="activity-source-badge">{activity.source === "MANUAL" ? "Manual entry" : "Timer session"}</span>
        </div>

        <div className="activity-detail-target">
          <span>Habit target</span>
          <strong>{formatTarget(activity.habit)}</strong>
        </div>

        <dl className="activity-detail-metadata">
          <div>
            <dt><CalendarDays size={15} aria-hidden="true" /> Date</dt>
            <dd>{formatDate(activity.activityDate)}</dd>
          </div>
          {activity.durationSeconds !== null && (
            <div>
              <dt><Clock3 size={15} aria-hidden="true" /> Duration</dt>
              <dd>{formatDuration(activity.durationSeconds)}</dd>
            </div>
          )}
          {activity.value !== null && (
            <div>
              <dt>Actual value</dt>
              <dd>{activity.value} {activity.unit ?? ""}</dd>
            </div>
          )}
          <div><dt>Started</dt><dd>{formatDateTime(activity.startedAt)}</dd></div>
          <div><dt>Ended</dt><dd>{formatDateTime(activity.endedAt)}</dd></div>
        </dl>

        {showDeleteConfirm ? (
          <div className="activity-delete-confirm" role="group" aria-label="Confirm activity deletion">
            <div>
              <h3>Delete this activity?</h3>
              <p>This removes this activity record. This action cannot be undone.</p>
            </div>
            {deleteError && <p className="activity-form-error" role="alert">{deleteError}</p>}
            <div className="activity-detail-actions">
              <button type="button" className="activity-button activity-button-danger" onClick={() => void handleDelete()} disabled={isDeleting}>
                <Trash2 size={16} /> {isDeleting ? "Deleting..." : "Confirm delete"}
              </button>
              <button type="button" className="activity-button activity-button-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="activity-detail-actions activity-detail-footer">
            <button type="button" className="activity-button activity-button-secondary" onClick={startEditing}>
              <Pencil size={16} /> Edit activity
            </button>
            <button type="button" className="activity-button activity-button-danger-ghost" onClick={() => { setDeleteError(null); setShowDeleteConfirm(true); }}>
              <Trash2 size={16} /> Delete
            </button>
          </div>
        )}
      </article>
    </section>
  );
}

export default ActivityDetail;
