import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import HabitList from "../components/habits/HabitList";
import {
  archiveHabit,
  getHabits,
} from "../services/habitApi";

vi.mock("../services/habitApi", () => ({
  getHabits: vi.fn(),
  archiveHabit: vi.fn(),
}));

const mockedGetHabits = vi.mocked(getHabits);

const baseHabit = {
  id: "user-habit-1",
  userId: "user-1",
  habitId: "habit-1",
  status: "ACTIVE" as const,
  startDate: "2026-09-08T00:00:00.000Z",
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

describe("HabitList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state while habits are being fetched", () => {
    mockedGetHabits.mockReturnValue(new Promise(() => {}));

    render(<HabitList />);

    expect(screen.getByText("Loading habits...")).toBeInTheDocument();
  });

  it("renders habits returned by the API", async () => {
    mockedGetHabits.mockResolvedValue([baseHabit]);

    render(<HabitList />);

    expect(
      await screen.findByRole("heading", { name: "Read" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Read for personal growth"),
    ).toBeInTheDocument();

    expect(screen.getByText(/Every day/)).toBeInTheDocument();
    expect(screen.getByText(/30 minutes/)).toBeInTheDocument();
  });

  it("renders a weekday schedule correctly", async () => {
    mockedGetHabits.mockResolvedValue([
      {
        ...baseHabit,
        habit: {
          ...baseHabit.habit,
          scheduleType: "WEEKDAYS",
          scheduleConfig: {
            weekdays: [1, 3, 5],
          },
        },
      },
    ]);

    render(<HabitList />);

    await waitFor(() => {
      expect(
        screen.getByText("Weekdays: 1, 3, 5"),
      ).toBeInTheDocument();
    });
  });

  it("renders a weekly target schedule correctly", async () => {
    mockedGetHabits.mockResolvedValue([
      {
        ...baseHabit,
        habit: {
          ...baseHabit.habit,
          scheduleType: "WEEKLY_TARGET",
          scheduleConfig: {
            occurrences: 3,
          },
        },
      },
    ]);

    render(<HabitList />);

    await waitFor(() => {
      expect(
        screen.getByText("3 times per week"),
      ).toBeInTheDocument();
    });
  });

  it("shows the empty state when there are no active habits", async () => {
    mockedGetHabits.mockResolvedValue([]);

    render(<HabitList />);

    expect(
      await screen.findByText(
        "You don't have any active habits yet.",
      ),
    ).toBeInTheDocument();
  });

  it("shows an error when loading habits fails", async () => {
    mockedGetHabits.mockRejectedValue(
      new Error("Unable to connect to the server"),
    );

    render(<HabitList />);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "Unable to connect to the server",
    );
  });

  it("renders multiple habits in sort order", async () => {
    mockedGetHabits.mockResolvedValue([
      {
        ...baseHabit,
        id: "user-habit-1",
        habitId: "habit-1",
        sortOrder: 0,
        habit: {
          ...baseHabit.habit,
          id: "habit-1",
          key: "reading",
          name: "Read",
        },
      },
      {
        ...baseHabit,
        id: "user-habit-2",
        habitId: "habit-2",
        sortOrder: 1,
        habit: {
          ...baseHabit.habit,
          id: "habit-2",
          key: "exercise",
          name: "Exercise",
          description: "",
        },
      },
    ]);

    render(<HabitList />);

    await screen.findByRole("heading", { name: "Read" });

    const headings = screen.getAllByRole("heading", { level: 3 });

    expect(headings).toHaveLength(2);
    expect(headings[0]).toHaveTextContent("Read");
    expect(headings[1]).toHaveTextContent("Exercise");
  });

  it("archives a habit and removes it from the active list", async () => {
  mockedGetHabits.mockResolvedValue([baseHabit]);
  vi.mocked(archiveHabit).mockResolvedValue({
    ...baseHabit,
    status: "ARCHIVED",
    archivedAt: "2026-09-09T00:00:00.000Z",
  });

  render(<HabitList />);

  expect(
    await screen.findByRole("heading", { name: "Read" }),
  ).toBeInTheDocument();

  fireEvent.click(
    screen.getByRole("button", { name: "Archive" }),
  );

  expect(archiveHabit).toHaveBeenCalledWith("habit-1");

  await waitFor(() => {
    expect(
      screen.queryByRole("heading", { name: "Read" }),
    ).not.toBeInTheDocument();
  });
});

it("shows an error when archiving fails", async () => {
  mockedGetHabits.mockResolvedValue([baseHabit]);

  vi.mocked(archiveHabit).mockRejectedValue(
    new Error("Unable to archive habit"),
  );

  render(<HabitList />);

  await screen.findByRole("heading", { name: "Read" });

  fireEvent.click(
    screen.getByRole("button", { name: "Archive" }),
  );

  expect(
    await screen.findByRole("alert"),
  ).toHaveTextContent("Unable to archive habit");
});
});