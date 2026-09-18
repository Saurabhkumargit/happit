import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, TrendingUp } from "lucide-react";

import {
  getOverallProgress,
  type OverallProgress,
} from "../../services/progressApi";

import PageHeader from "../ui/PageHeader";
import Card from "../ui/Card";
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

    loadProgress();
  }, []);

  if (isLoading) {
    return (
      <section className="progress-page">
        <PageHeader eyebrow="Progress" title="Your progress" />
        <div className="progress-loading">
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="progress-page">
        <PageHeader eyebrow="Progress" title="Your progress" />
        <ErrorState message={error} />
      </section>
    );
  }

  if (!progress || progress.habits.length === 0) {
    return (
      <section className="progress-page">
        <PageHeader eyebrow="Progress" title="Your progress" />
        <EmptyState
          title="No progress data yet"
          description="Start tracking your habits to see your progress here."
          action={
            <Button onClick={() => navigate("/app/habits")}>
              View habits
            </Button>
          }
        />
      </section>
    );
  }

  return (
    <section className="progress-page">
      <PageHeader
        eyebrow="Progress"
        title="Your progress"
        description="Track your consistency and streaks over time."
      />

      <div className="progress-summary">
        <Card className="progress-summary-card">
          <div className="progress-summary-icon">
            <TrendingUp size={20} aria-hidden="true" />
          </div>
          <div className="progress-summary-content">
            <p className="progress-summary-label">Overall consistency</p>
            <p className="progress-summary-value">
              {formatPercentage(progress.consistency.percentage)}
            </p>
            <p className="progress-summary-meta">
              {progress.consistency.completed} of {progress.consistency.expected}{" "}
              completed
            </p>
          </div>
        </Card>

        <Card className="progress-summary-card">
          <div className="progress-summary-icon">
            <Activity size={20} aria-hidden="true" />
          </div>
          <div className="progress-summary-content">
            <p className="progress-summary-label">Active habits</p>
            <p className="progress-summary-value">{progress.habits.length}</p>
            <p className="progress-summary-meta">Last 30 days</p>
          </div>
        </Card>
      </div>

      <div className="progress-habits">
        <h3 className="progress-section-title">Habit breakdown</h3>

        <div className="progress-habits-list">
          {progress.habits.map((habitProgress) => (
            <Card key={habitProgress.habit.id} className="progress-habit-card">
              <div className="progress-habit-header">
                <h4 className="progress-habit-name">
                  {habitProgress.habit.name}
                </h4>
                <p className="progress-habit-consistency">
                  {formatPercentage(habitProgress.consistency.percentage)}
                </p>
              </div>

              <div className="progress-habit-stats">
                <div className="progress-habit-stat">
                  <span className="progress-habit-stat-label">Completed</span>
                  <span className="progress-habit-stat-value">
                    {habitProgress.consistency.completed} /{" "}
                    {habitProgress.consistency.expected}
                  </span>
                </div>

                <div className="progress-habit-stat">
                  <span className="progress-habit-stat-label">
                    Current streak
                  </span>
                  <span className="progress-habit-stat-value">
                    {habitProgress.streaks.current} days
                  </span>
                </div>

                <div className="progress-habit-stat">
                  <span className="progress-habit-stat-label">
                    Longest streak
                  </span>
                  <span className="progress-habit-stat-value">
                    {habitProgress.streaks.longest} days
                  </span>
                </div>
              </div>

              <div className="progress-habit-heatmap">
                <Heatmap
                  data={habitProgress.heatmap}
                  startDate={habitProgress.range.from}
                  endDate={habitProgress.range.to}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Progress;
