import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import HabitDetail from "../components/habits/HabitDetail";
import {
  archiveHabit,
  getHabit,
} from "../services/habitApi";

vi.mock("../services/habitApi", () => ({
  archiveHabit: vi.fn(),
  getHabit: vi.fn(),
}));

const mockedGetHabit = vi.mocked(getHabit);
const mockedArchiveHabit = vi.mocked(archiveHabit);

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

describe("HabitDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state", () => {
    mockedGetHabit.mockReturnValue(new Promise(() => {}));

    render(<HabitDetail habitId="user-habit-1" />);

    expect(screen.getByText("Loading habit...")).toBeInTheDocument();
  });

  it("renders habit details", async () => {
    mockedGetHabit.mockResolvedValue(baseHabit);

    render(<HabitDetail habitId="user-habit-1" />);

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

    render(<HabitDetail habitId="user-habit-1" />);

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

    render(
      <HabitDetail
        habitId="user-habit-1"
        onArchived={onArchived}
      />,
    );

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

    render(<HabitDetail habitId="user-habit-1" />);

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