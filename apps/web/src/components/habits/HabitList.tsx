import { useEffect, useState, useRef, useCallback } from "react";
import { Archive, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  getHabits,
  archiveHabit,
  reorderHabits,
  type UserHabit,
} from "../../services/habitApi";

import PageHeader from "../ui/PageHeader";
import Button from "../ui/Button";
import LoadingSpinner from "../ui/LoadingSpinner";
import ErrorState from "../ui/ErrorState";
import EmptyState from "../ui/EmptyState";

import "./HabitList.css";

interface HabitListProps {
  onSelectHabit?: (habitId: string) => void;
}

function formatSchedule(habit: UserHabit["habit"]) {
  switch (habit.scheduleType) {
    case "DAILY":
      return "Every day";
    case "WEEKDAYS":
      return `Weekdays: ${(habit.scheduleConfig.weekdays ?? []).join(", ")}`;
    case "WEEKLY_TARGET":
      return `${habit.scheduleConfig.occurrences ?? 0}× weekly`;
  }
}

function formatTarget(habit: UserHabit["habit"]) {
  const unit = habit.targetUnit ? ` ${habit.targetUnit}` : "";
  return `${habit.targetValue}${unit}`;
}

function HabitList({ onSelectHabit }: HabitListProps) {
  const navigate = useNavigate();
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archivingHabitId, setArchivingHabitId] = useState<string | null>(null);

  // Long-press drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [showReorderMenu, setShowReorderMenu] = useState<number | null>(null);

  const longPressTimerRef = useRef<number | null>(null);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  useEffect(() => {
    async function loadHabits() {
      try {
        setError(null);
        const result = await getHabits();
        setHabits(result.filter((habit) => habit.status === "ACTIVE"));
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Unable to load habits",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadHabits();
  }, []);

  async function handleArchive(habitId: string) {
    try {
      setError(null);
      setArchivingHabitId(habitId);

      await archiveHabit(habitId);

      setHabits((currentHabits) =>
        currentHabits.filter((habit) => habit.habitId !== habitId),
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to archive habit",
      );
    } finally {
      setArchivingHabitId(null);
    }
  }

  const commitReorder = useCallback(
    async (newHabits: UserHabit[]) => {
      const previousHabits = habits;
      setHabits(newHabits);
      setError(null);
      setIsReordering(true);

      try {
        // Send canonical habit IDs in the new order
        await reorderHabits(newHabits.map((habit) => habit.habitId));
      } catch (error) {
        setHabits(previousHabits);
        setError(
          error instanceof Error ? error.message : "Unable to reorder habits",
        );
      } finally {
        setIsReordering(false);
      }
    },
    [habits],
  );

  // Long-press drag handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, index: number) => {
      if (isReordering) return;

      e.preventDefault();
      dragStartPosRef.current = { x: e.clientX, y: e.clientY };

      longPressTimerRef.current = window.setTimeout(() => {
        isDraggingRef.current = true;
        setDraggedIndex(index);
        document.body.style.userSelect = "none";
      }, 400); // 400ms long-press threshold
    },
    [isReordering],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isDraggingRef.current && draggedIndex !== null) {
        // Find which card we're over
        const cards = document.querySelectorAll(".habit-card");
        let newOverIndex: number | null = null;

        cards.forEach((card, idx) => {
          const rect = card.getBoundingClientRect();
          if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
            newOverIndex = idx;
          }
        });

        if (newOverIndex !== null && newOverIndex !== draggedIndex) {
          setDragOverIndex(newOverIndex);
        }
      } else if (longPressTimerRef.current) {
        // Cancel long-press if moved too much
        const dx = e.clientX - dragStartPosRef.current.x;
        const dy = e.clientY - dragStartPosRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 10) {
          window.clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    },
    [draggedIndex],
  );

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (
      isDraggingRef.current &&
      draggedIndex !== null &&
      dragOverIndex !== null &&
      draggedIndex !== dragOverIndex
    ) {
      // Commit reorder
      const reorderedHabits = [...habits];
      const [draggedItem] = reorderedHabits.splice(draggedIndex, 1);
      reorderedHabits.splice(dragOverIndex, 0, draggedItem);

      commitReorder(reorderedHabits);
    }

    isDraggingRef.current = false;
    setDraggedIndex(null);
    setDragOverIndex(null);
    document.body.style.userSelect = "";
  }, [draggedIndex, dragOverIndex, habits, commitReorder]);

  // Keyboard accessible reorder
  const handleKeyboardReorder = useCallback(
    (index: number, direction: "up" | "down") => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= habits.length) {
        return;
      }

      const reorderedHabits = [...habits];
      [reorderedHabits[index], reorderedHabits[targetIndex]] = [
        reorderedHabits[targetIndex],
        reorderedHabits[index],
      ];

      commitReorder(reorderedHabits);

      // Announce change
      const habitName = reorderedHabits[targetIndex].habit.name;
      const position = targetIndex + 1;
      const announcement = `${habitName} moved to position ${position}`;

      const liveRegion = document.getElementById("reorder-announcer");
      if (liveRegion) {
        liveRegion.textContent = announcement;
      }
    },
    [habits, commitReorder],
  );

  if (isLoading) {
    return (
      <section className="habit-list-page" aria-busy="true">
        <PageHeader eyebrow="Habits" title="Your habits" />
        <div className="habit-list-loading">
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="habit-list-page">
        <PageHeader eyebrow="Habits" title="Your habits" />
        <ErrorState message={loadError} />
      </section>
    );
  }

  if (habits.length === 0) {
    return (
      <section className="habit-list-page">
        <PageHeader eyebrow="Habits" title="Your habits" />
        <EmptyState
          title="No habits yet"
          description="You don't have any active habits. Choose a habit from the catalog to get started."
          action={
            <Button onClick={() => navigate("/app/habits/catalog")}>
              Browse catalog
            </Button>
          }
        />
      </section>
    );
  }

  return (
    <section className="habit-list-page">
      <PageHeader
        eyebrow="Habits"
        title="Your habits"
        description="Long-press to reorder"
      />

      <div
        id="reorder-announcer"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      {error && (
        <div className="habit-list-error">
          <ErrorState message={error} />
        </div>
      )}

      <ul className="habit-list">
        {habits.map((userHabit, index) => {
          const habit = userHabit.habit;
          const isArchiving = archivingHabitId === userHabit.habitId;
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index && draggedIndex !== index;

          return (
            <li
              key={userHabit.id}
              className={`habit-card ${isDragging ? "habit-card-dragging" : ""} ${isDragOver ? "habit-card-drag-over" : ""}`}
              onPointerDown={(e) => handlePointerDown(e, index)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div className="habit-card-content">
                <button
                  type="button"
                  className="habit-name-button"
                  onClick={() => onSelectHabit?.(userHabit.habitId)}
                  disabled={isDragging}
                >
                  <h3 className="habit-name">{habit.name}</h3>
                  {habit.description && (
                    <p className="habit-description">{habit.description}</p>
                  )}
                </button>

                <div className="habit-meta">
                  <div className="habit-meta-item">
                    <span className="habit-meta-label">Target</span>
                    <span className="habit-meta-value">
                      {formatTarget(habit)}
                    </span>
                  </div>
                  <div className="habit-meta-item">
                    <span className="habit-meta-label">Schedule</span>
                    <span className="habit-meta-value">
                      {formatSchedule(habit)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="habit-card-actions">
                <button
                  type="button"
                  className="habit-menu-button"
                  onClick={() =>
                    setShowReorderMenu(showReorderMenu === index ? null : index)
                  }
                  aria-label={`Options for ${habit.name}`}
                  aria-expanded={showReorderMenu === index}
                  aria-haspopup="true"
                >
                  <MoreVertical size={18} aria-hidden="true" />
                </button>

                {showReorderMenu === index && (
                  <div className="habit-menu">
                    <button
                      type="button"
                      onClick={() => {
                        handleKeyboardReorder(index, "up");
                        setShowReorderMenu(null);
                      }}
                      disabled={index === 0 || isReordering}
                      className="habit-menu-item"
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleKeyboardReorder(index, "down");
                        setShowReorderMenu(null);
                      }}
                      disabled={index === habits.length - 1 || isReordering}
                      className="habit-menu-item"
                    >
                      Move down
                    </button>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleArchive(userHabit.habitId)}
                  disabled={isArchiving}
                  className="habit-archive-button"
                >
                  <Archive aria-hidden="true" size={16} />
                  <span className="habit-archive-text">
                    {isArchiving ? "Archiving..." : "Archive"}
                  </span>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default HabitList;
