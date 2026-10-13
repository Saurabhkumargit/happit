import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import ArchivedHabitList from "../components/habits/ArchivedHabitList";
import {
  removeHabit,
  getHabits,
  restoreHabit,
} from "../services/habitApi";

vi.mock("../services/habitApi", () => ({
  removeHabit: vi.fn(),
  getHabits: vi.fn(),
  restoreHabit: vi.fn(),
}));

const mockedGetHabits = vi.mocked(getHabits);
const mockedRestoreHabit = vi.mocked(restoreHabit);
const mockedRemoveHabit = vi.mocked(removeHabit);

const archivedHabit = {
  id: "user-habit-1",
  userId: "user-1",
  habitId: "habit-1",
  status: "ARCHIVED" as const,
  startDate: "2026-09-08",
  sortOrder: 0,
  createdAt: "2026-09-08T00:00:00.000Z",
  updatedAt: "2026-09-08T00:00:00.000Z",
  archivedAt: "2026-09-09T00:00:00.000Z",
  habit: {
    id: "habit-1",
    key: "reading",
    name: "Reading",
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

describe("ArchivedHabitList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders archived habits", async () => {
    mockedGetHabits.mockResolvedValue([archivedHabit]);

    render(<ArchivedHabitList />);

    expect(
      await screen.findByRole("heading", { name: "Reading" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Read for personal growth"),
    ).toBeInTheDocument();

    expect(screen.getByText(/Every day/)).toBeInTheDocument();
    expect(screen.getByText(/30 minutes/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Restore" }),
    ).toBeInTheDocument();
  });

  it("restores a habit and removes it from the archived list", async () => {
    mockedGetHabits.mockResolvedValue([archivedHabit]);
    mockedRestoreHabit.mockResolvedValue({
      ...archivedHabit,
      status: "ACTIVE",
      archivedAt: null,
    });

    render(<ArchivedHabitList />);

    const restoreButton = await screen.findByRole("button", {
      name: "Restore",
    });

    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(mockedRestoreHabit).toHaveBeenCalledWith("habit-1");
    });

    await waitFor(() => {
      expect(
        screen.getByText("You don't have any archived habits."),
      ).toBeInTheDocument();
    });
  });

  it("shows an error when restoring fails", async () => {
    mockedGetHabits.mockResolvedValue([archivedHabit]);
    mockedRestoreHabit.mockRejectedValue(
      new Error("Unable to restore habit"),
    );

    render(<ArchivedHabitList />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Restore" }),
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Unable to restore habit");
  });

  it("removes a habit without confirmation", async () => {
    mockedGetHabits.mockResolvedValue([archivedHabit]);
    mockedRemoveHabit.mockResolvedValue();

    render(<ArchivedHabitList />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Remove" }),
    );

    await waitFor(() => {
      expect(mockedRemoveHabit).toHaveBeenCalledWith("habit-1");
    });

    await waitFor(() => {
      expect(
        screen.getByText("You don't have any archived habits."),
      ).toBeInTheDocument();
    });
  });

  it("shows an error when removal fails", async () => {
    mockedGetHabits.mockResolvedValue([archivedHabit]);
    mockedRemoveHabit.mockRejectedValue(
      new Error("Unable to remove habit"),
    );

    render(<ArchivedHabitList />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Remove" }),
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Unable to remove habit");
  });
});