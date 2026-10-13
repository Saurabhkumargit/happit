
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowUpRight, Flame, Target, TrendingUp } from "lucide-react";

import {
  getOverallProgress,
  type OverallProgress,
} from "../../services/progressApi";

import Button from "../ui/Button";
import LoadingSpinner from "../ui/LoadingSpinner";
import ErrorState from "../ui/ErrorState";
import EmptyState from "../ui/EmptyState";
import Heatmap from "./Heatmap";

import "./Progress.css";

function formatPercentage(percentage: number): string {
  return `${Math.round(percentage)}%`;
}

function getDateRange() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  return {
    from: thirtyDaysAgo.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
  };
}

function Progress() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<OverallProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProgress() {
      try {
        setError(null);
        const range = getDateRange();
        const result = await getOverallProgress(range);
        setProgress(result);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load progress data",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadProgress();
  }, []);

  if (isLoading) {
    return (
      <section className="progress-page">
        <div className="progress-page-heading">
          <p className="progress-eyebrow">YOUR JOURNEY</p>
          <h1>Your progress</h1>
          <p className="progress-intro">
            Small steps, repeated over time.
          </p>
        </div>
        <div className="progress-loading">
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="progress-page">
        <div className="progress-page-heading">
          <p className="progress-eyebrow">YOUR JOURNEY</p>
          <h1>Your progress</h1>
          <p className="progress-intro">
            Small steps, repeated over time.
          </p>
        </div>
        <ErrorState message={error} />
      </section>
    );
  }

  if (!progress || progress.habits.length === 0) {
    return (
      <section className="progress-page">
        <div className="progress-page-heading">
          <p className="progress-eyebrow">YOUR JOURNEY</p>
          <h1>Your progress</h1>
          <p className="progress-intro">
            Small steps, repeated over time.
          </p>
        </div>
        <EmptyState
          title="Your story starts here"
          description="Adopt a habit and begin building a routine. Your consistency and activity will show up here as you go."
          action={
            <Button onClick={() => navigate("/app/habits")}>
              Explore habits
            </Button>
          }
        />
      </section>
    );
  }

  const consistency = progress.consistency.percentage;
  const consistencyWidth = Math.min(100, Math.max(0, consistency));

  return (
    <section className="progress-page">
      <header className="progress-page-heading">
        <div>
          <p className="progress-eyebrow">YOUR JOURNEY</p>
          <h1>Your progress</h1>
          <p className="progress-intro">
            Every small effort counts. Keep showing up for yourself.
          </p>
        </div>
        <span className="progress-period">
          <Activity size={14} aria-hidden="true" />
          Last 31 days
        </span>
      </header>

      <section className="progress-overview" aria-label="Progress overview">
        <div className="progress-overview-main">
          <div className="progress-overview-topline">
            <span className="progress-overview-label">
              <TrendingUp size={15} aria-hidden="true" />
              OVERALL CONSISTENCY
            </span>
            <span className="progress-overview-period">30-day view</span>
          </div>

          <div className="progress-overview-value">
            {formatPercentage(consistency)}
          </div>

          <p className="progress-overview-caption">
            {progress.consistency.completed} of{" "}
            {progress.consistency.expected} scheduled completions
          </p>

          <div
            className="progress-overview-track"
            role="progressbar"
            aria-label="Overall consistency"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(consistencyWidth)}
          >
            <span style={{ width: `${consistencyWidth}%` }} />
          </div>

          <p className="progress-overview-note">
            Consistency is built one day at a time.
          </p>
        </div>

        <div className="progress-overview-side">
          <div className="progress-mini-stat">
            <div className="progress-mini-icon">
              <Target size={17} aria-hidden="true" />
            </div>
            <div>
              <span>Active habits</span>
              <strong>{progress.habits.length}</strong>
            </div>
          </div>

          <div className="progress-mini-divider" />

          <div className="progress-mini-stat">
            <div className="progress-mini-icon">
              <Flame size={17} aria-hidden="true" />
            </div>
            <div>
              <span>Completed</span>
              <strong>{progress.consistency.completed}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="progress-habits">
        <header className="progress-section-header">
          <div>
            <p className="progress-eyebrow">THE DETAILS</p>
            <h2>Your habits, over time</h2>
            <p>Look for the patterns, not perfection.</p>
          </div>
          <span className="progress-habit-count">
            {progress.habits.length}{" "}
            {progress.habits.length === 1 ? "habit" : "habits"}
          </span>
        </header>

        <div className="progress-habits-list">
          {progress.habits.map((habitProgress) => {
            const percentage = habitProgress.consistency.percentage;
            const width = Math.min(100, Math.max(0, percentage));

            return (
              <article
                key={habitProgress.habit.id}
                className="progress-habit-card"
              >
                <header className="progress-habit-header">
                  <div>
                    <h3 className="progress-habit-name">
                      {habitProgress.habit.name}
                    </h3>
                    <p className="progress-habit-completed">
                      {habitProgress.consistency.completed} of{" "}
                      {habitProgress.consistency.expected} completed
                    </p>
                  </div>

                  <span className="progress-habit-consistency">
                    {formatPercentage(percentage)}
                  </span>
                </header>

                <div
                  className="progress-habit-track"
                  role="progressbar"
                  aria-label={`${habitProgress.habit.name} consistency`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(width)}
                >
                  <span style={{ width: `${width}%` }} />
                </div>

                <div className="progress-habit-stats">
                  <div className="progress-habit-stat">
                    <span className="progress-habit-stat-label">
                      Current streak
                    </span>
                    <strong>{habitProgress.streaks.current} days</strong>
                  </div>

                  <div className="progress-habit-stat">
                    <span className="progress-habit-stat-label">
                      Best streak
                    </span>
                    <strong>{habitProgress.streaks.longest} days</strong>
                  </div>
                </div>

                <div className="progress-habit-heatmap">
                  <div className="progress-heatmap-heading">
                    <span>Daily activity</span>
                    <span>
                      {habitProgress.range.from} — {habitProgress.range.to}
                    </span>
                  </div>

                  <Heatmap
                    data={habitProgress.heatmap}
                    startDate={habitProgress.range.from}
                    endDate={habitProgress.range.to}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <p className="progress-footer-note">
        Progress isn't about being perfect. It's about returning to what matters.
        <ArrowUpRight size={14} aria-hidden="true" />
      </p>
    </section>
  );
}

export default Progress;
