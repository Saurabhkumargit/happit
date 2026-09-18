import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HabitList from "../components/habits/HabitList";
import { archiveHabit, getHabits, reorderHabits } from "../services/habitApi";

vi.mock("../services/habitApi", () => ({
  archiveHabit: vi.fn(),
  getHabits: vi.fn(),
  reorderHabits: vi.fn(),
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const mockedGetHabits = vi.mocked(getHabits);
const mockedReorderHabits = vi.mocked(reorderHabits);

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

    renderWithRouter(<HabitList />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders habits returned by the API", async () => {
    mockedGetHabits.mockResolvedValue([baseHabit]);

    renderWithRouter(<HabitList />);

    expect(
      await screen.findByRole("heading", { name: "Read" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Read for personal growth")).toBeInTheDocument();

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

    renderWithRouter(<HabitList />);

    await waitFor(() => {
      expect(screen.getByText("Weekdays: 1, 3, 5")).toBeInTheDocument();
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

    renderWithRouter(<HabitList />);

    await waitFor(() => {
      expect(screen.getByText("3× weekly")).toBeInTheDocument();
    });
  });

  it("shows the empty state when there are no active habits", async () => {
    mockedGetHabits.mockResolvedValue([]);

    renderWithRouter(<HabitList />);

    expect(
      await screen.findByText(/don't have any active habits/i),
    ).toBeInTheDocument();
  });

  it("shows an error when loading habits fails", async () => {
    mockedGetHabits.mockRejectedValue(
      new Error("Unable to connect to the server"),
    );

    renderWithRouter(<HabitList />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
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

    renderWithRouter(<HabitList />);

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

    renderWithRouter(<HabitList />);

    expect(
      await screen.findByRole("heading", { name: "Read" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));

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

    renderWithRouter(<HabitList />);

    await screen.findByRole("heading", { name: "Read" });

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to archive habit",
    );
  });

  it("renders reorder controls", async () => {
    mockedGetHabits.mockResolvedValue([
      baseHabit,
      {
        ...baseHabit,
        id: "user-habit-2",
        habitId: "habit-2",
        habit: {
          ...baseHabit.habit,
          id: "habit-2",
          key: "exercise",
          name: "Exercise",
        },
      },
    ]);

    renderWithRouter(<HabitList />);

    // Open options menu for first habit
    const optionsButtons = await screen.findAllByRole("button", {
      name: /Options for/,
    });

    fireEvent.click(optionsButtons[0]);

    // Check menu items
    expect(
      screen.getByRole("button", {
        name: "Move up",
      }),
    ).toBeDisabled();

    expect(
      screen.getByRole("button", {
        name: "Move down",
      }),
    ).toBeEnabled();
  });

  it("moves a habit up and saves the complete order", async () => {
    const secondHabit = {
      ...baseHabit,
      id: "user-habit-2",
      habitId: "habit-2",
      sortOrder: 1,
      habit: {
        ...baseHabit.habit,
        id: "habit-2",
        key: "exercise",
        name: "Exercise",
      },
    };

    mockedGetHabits.mockResolvedValue([baseHabit, secondHabit]);
    mockedReorderHabits.mockResolvedValue([secondHabit, baseHabit]);

    renderWithRouter(<HabitList />);

    await screen.findByRole("heading", { name: "Exercise" });

    // Open options menu for second habit (Exercise)
    const optionsButtons = screen.getAllByRole("button", {
      name: /Options for/,
    });

    fireEvent.click(optionsButtons[1]);

    // Click "Move up"
    fireEvent.click(screen.getByRole("button", { name: "Move up" }));

    expect(mockedReorderHabits).toHaveBeenCalledWith(["habit-2", "habit-1"]);

    await waitFor(() => {
      const headings = screen.getAllByRole("heading", { level: 3 });
      expect(headings[0]).toHaveTextContent("Exercise");
      expect(headings[1]).toHaveTextContent("Read");
    });
  });

  it("moves a habit down and saves the complete order", async () => {
    const secondHabit = {
      ...baseHabit,
      id: "user-habit-2",
      habitId: "habit-2",
      sortOrder: 1,
      habit: {
        ...baseHabit.habit,
        id: "habit-2",
        key: "exercise",
        name: "Exercise",
      },
    };

    mockedGetHabits.mockResolvedValue([baseHabit, secondHabit]);
    mockedReorderHabits.mockResolvedValue([secondHabit, baseHabit]);

    renderWithRouter(<HabitList />);

    await screen.findByRole("heading", { name: "Read" });

    // Open options menu for first habit (Read)
    const optionsButtons = screen.getAllByRole("button", {
      name: /Options for/,
    });

    fireEvent.click(optionsButtons[0]);

    // Click "Move down"
    fireEvent.click(screen.getByRole("button", { name: "Move down" }));

    expect(mockedReorderHabits).toHaveBeenCalledWith(["habit-2", "habit-1"]);

    await waitFor(() => {
      const headings = screen.getAllByRole("heading", { level: 3 });
      expect(headings[0]).toHaveTextContent("Exercise");
      expect(headings[1]).toHaveTextContent("Read");
    });
  });

  it("reverts the order when reordering fails", async () => {
    const secondHabit = {
      ...baseHabit,
      id: "user-habit-2",
      habitId: "habit-2",
      sortOrder: 1,
      habit: {
        ...baseHabit.habit,
        id: "habit-2",
        key: "exercise",
        name: "Exercise",
      },
    };

    mockedGetHabits.mockResolvedValue([baseHabit, secondHabit]);

    mockedReorderHabits.mockRejectedValue(
      new Error("Unable to reorder habits"),
    );

    renderWithRouter(<HabitList />);

    await screen.findByRole("heading", { name: "Read" });

    // Open options menu for first habit (Read)
    const optionsButtons = screen.getAllByRole("button", {
      name: /Options for/,
    });

    fireEvent.click(optionsButtons[0]);

    // Click "Move down"
    fireEvent.click(screen.getByRole("button", { name: "Move down" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to reorder habits",
    );

    await waitFor(() => {
      const headings = screen.getAllByRole("heading", { level: 3 });
      expect(headings[0]).toHaveTextContent("Read");
      expect(headings[1]).toHaveTextContent("Exercise");
    });
  });
});
