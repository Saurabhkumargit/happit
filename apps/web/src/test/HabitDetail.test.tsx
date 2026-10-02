import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import HabitDetail from "../components/habits/HabitDetail";
import {
  archiveHabit,
  getHabit,
} from "../services/habitApi";
import { getHabitProgress } from "../services/progressApi";
import { getActivities } from "../services/activityApi";

vi.mock("../services/habitApi", () => ({
  archiveHabit: vi.fn(),
  getHabit: vi.fn(),
}));

vi.mock("../services/progressApi", () => ({
  getHabitProgress: vi.fn(),
}));

vi.mock("../services/activityApi", () => ({
  getActivities: vi.fn(),
}));

const mockedGetHabit = vi.mocked(getHabit);
const mockedArchiveHabit = vi.mocked(archiveHabit);
const mockedGetHabitProgress = vi.mocked(getHabitProgress);
const mockedGetActivities = vi.mocked(getActivities);

function renderHabitDetail(props: { habitId?: string; onArchived?: () => void } = {}) {
  const { habitId = "user-habit-1", onArchived } = props;
  return render(
    <MemoryRouter>
      <HabitDetail habitId={habitId} onArchived={onArchived} />
    </MemoryRouter>,
  );
}

const baseHabit = {
  id: "user-habit-1",
  userId: "user-1",
  habitId: "habit-1",
  status: "ACTIVE" as const,
  startDate: "2026-09-08",
  sortOrder: 0,
  createdAt: "2026-09-08T00:00:00.000Z",
  updatedAt: "2026-09-08T00:00:00.000Z",
  archivedAt: null,
  habit: {
    id: "habit-1",
    key: "reading",
    name: "Read",
    description: "Read for personal growth",
    scheduleType: "DAILY" as const,
    scheduleConfig: {},
    targetType: "DURATION" as const,
    targetValue: "30",
    targetUnit: "minutes",
    status: "AVAILABLE" as const,
    createdAt: "2026-09-08T00:00:00.000Z",
    updatedAt: "2026-09-08T00:00:00.000Z",
  },
};

const defaultProgress = {
  habit: {
    id: "habit-1",
    key: "reading",
    name: "Read",
    targetType: "DURATION" as const,
    targetValue: 30,
    targetUnit: "minutes",
    scheduleType: "DAILY" as const,
    scheduleConfig: {},
  },
  range: { from: "2026-09-01", to: "2026-10-01", timezone: "UTC" },
  consistency: { completed: 0, expected: 0, percentage: 0 },
  streaks: { current: 0, longest: 0 },
  occurrences: [],
  heatmap: [],
};

describe("HabitDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetHabitProgress.mockResolvedValue(defaultProgress);
    mockedGetActivities.mockResolvedValue([]);
  });

  it("shows a loading state", () => {
    mockedGetHabit.mockReturnValue(new Promise(() => {}));

    renderHabitDetail();

    expect(screen.getByText("Loading habit...")).toBeInTheDocument();
  });

  it("renders habit details", async () => {
    mockedGetHabit.mockResolvedValue(baseHabit);

    renderHabitDetail();

    expect(
      await screen.findByRole("heading", { name: "Read" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Read for personal growth"),
    ).toBeInTheDocument();

    expect(screen.getByText(/Every day/)).toBeInTheDocument();
    expect(screen.getByText(/30 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/ACTIVE/)).toBeInTheDocument();
  });

  it("shows an error when loading fails", async () => {
    mockedGetHabit.mockRejectedValue(
      new Error("Unable to load habit"),
    );

    renderHabitDetail();

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Unable to load habit");
  });

  it("archives the habit", async () => {
    mockedGetHabit.mockResolvedValue(baseHabit);

    const archivedHabit = {
      ...baseHabit,
      status: "ARCHIVED" as const,
      archivedAt: "2026-09-10T00:00:00.000Z",
    };

    mockedArchiveHabit.mockResolvedValue(archivedHabit);

    const onArchived = vi.fn();

    renderHabitDetail({ onArchived });

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Archive",
      }),
    );

    await waitFor(() => {
      expect(mockedArchiveHabit).toHaveBeenCalledWith(
        "user-habit-1",
      );
    });

    expect(onArchived).toHaveBeenCalled();
  });

  it("shows an error when archiving fails", async () => {
    mockedGetHabit.mockResolvedValue(baseHabit);

    mockedArchiveHabit.mockRejectedValue(
      new Error("Unable to archive habit"),
    );

    renderHabitDetail();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Archive",
      }),
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Unable to archive habit");
  });
});