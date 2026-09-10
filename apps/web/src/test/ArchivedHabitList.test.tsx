import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import ArchivedHabitList from "../components/habits/ArchivedHabitList";
import {
  deleteHabit,
  getHabits,
  restoreHabit,
} from "../services/habitApi";

vi.mock("../services/habitApi", () => ({
  deleteHabit: vi.fn(),
  getHabits: vi.fn(),
  restoreHabit: vi.fn(),
}));

const mockedGetHabits = vi.mocked(getHabits);
const mockedRestoreHabit = vi.mocked(restoreHabit);
const mockedDeleteHabit = vi.mocked(deleteHabit);

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
      expect(mockedRestoreHabit).toHaveBeenCalledWith("user-habit-1");
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

  it("shows a confirmation before deleting a habit", async () => {
  mockedGetHabits.mockResolvedValue([archivedHabit]);

  const confirmSpy = vi
    .spyOn(window, "confirm")
    .mockReturnValue(false);

  render(<ArchivedHabitList />);

  fireEvent.click(
    await screen.findByRole("button", { name: "Delete" }),
  );

  expect(confirmSpy).toHaveBeenCalledWith(
    "Are you sure you want to permanently delete this habit?",
  );

  expect(mockedDeleteHabit).not.toHaveBeenCalled();

  confirmSpy.mockRestore();
});

it("does not delete when confirmation is cancelled", async () => {
  mockedGetHabits.mockResolvedValue([archivedHabit]);

  const confirmSpy = vi
    .spyOn(window, "confirm")
    .mockReturnValue(false);

  render(<ArchivedHabitList />);

  fireEvent.click(
    await screen.findByRole("button", { name: "Delete" }),
  );

  expect(mockedDeleteHabit).not.toHaveBeenCalled();
  expect(screen.getByRole("heading", { name: "Reading" })).toBeInTheDocument();

  confirmSpy.mockRestore();
});

it("deletes a habit after confirmation", async () => {
  mockedGetHabits.mockResolvedValue([archivedHabit]);
  mockedDeleteHabit.mockResolvedValue();

  const confirmSpy = vi
    .spyOn(window, "confirm")
    .mockReturnValue(true);

  render(<ArchivedHabitList />);

  fireEvent.click(
    await screen.findByRole("button", { name: "Delete" }),
  );

  await waitFor(() => {
    expect(mockedDeleteHabit).toHaveBeenCalledWith("user-habit-1");
  });

  await waitFor(() => {
    expect(
      screen.getByText("You don't have any archived habits."),
    ).toBeInTheDocument();
  });

  confirmSpy.mockRestore();
});

it("shows an error when deletion fails", async () => {
  mockedGetHabits.mockResolvedValue([archivedHabit]);
  mockedDeleteHabit.mockRejectedValue(
    new Error("Unable to delete habit"),
  );

  const confirmSpy = vi
    .spyOn(window, "confirm")
    .mockReturnValue(true);

  render(<ArchivedHabitList />);

  fireEvent.click(
    await screen.findByRole("button", { name: "Delete" }),
  );

  expect(
    await screen.findByRole("alert"),
  ).toHaveTextContent("Unable to delete habit");

  confirmSpy.mockRestore();
});
});