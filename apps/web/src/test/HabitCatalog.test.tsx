import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import HabitCatalog from "../components/habits/HabitCatalog";
import {
  adoptHabit,
  getCatalogHabits,
} from "../services/habitApi";

vi.mock("../services/habitApi", () => ({
  adoptHabit: vi.fn(),
  getCatalogHabits: vi.fn(),
}));

const mockedGetCatalogHabits = vi.mocked(getCatalogHabits);
const mockedAdoptHabit = vi.mocked(adoptHabit);

const catalogHabit = {
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
};

describe("HabitCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state", () => {
    mockedGetCatalogHabits.mockReturnValue(new Promise(() => {}));

    render(<HabitCatalog />);

    expect(
      screen.getByText("Loading habit catalog..."),
    ).toBeInTheDocument();
  });

  it("renders catalog habits", async () => {
    mockedGetCatalogHabits.mockResolvedValue([catalogHabit]);

    render(<HabitCatalog />);

    expect(
      await screen.findByRole("heading", { name: "Reading" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Read for personal growth"),
    ).toBeInTheDocument();

    expect(screen.getByText(/Every day/)).toBeInTheDocument();
    expect(screen.getByText(/30 minutes/)).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Add to my habits" }),
    ).toBeInTheDocument();
  });

  it("adopts a selected habit", async () => {
    mockedGetCatalogHabits.mockResolvedValue([catalogHabit]);
    mockedAdoptHabit.mockResolvedValue({
      id: "user-habit-1",
      userId: "user-1",
      habitId: "habit-1",
      status: "ACTIVE",
      startDate: "2026-09-08T00:00:00.000Z",
      sortOrder: 0,
      createdAt: "2026-09-08T00:00:00.000Z",
      updatedAt: "2026-09-08T00:00:00.000Z",
      archivedAt: null,
      habit: catalogHabit,
    });

    render(<HabitCatalog />);

    const button = await screen.findByRole("button", {
      name: "Add to my habits",
    });

    fireEvent.click(button);

    expect(mockedAdoptHabit).toHaveBeenCalledWith("habit-1");

    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent("Reading added to your habits.");
  });

  it("shows an empty state when the catalog is empty", async () => {
    mockedGetCatalogHabits.mockResolvedValue([]);

    render(<HabitCatalog />);

    expect(
      await screen.findByText(
        "No habits are currently available.",
      ),
    ).toBeInTheDocument();
  });

  it("shows an error when catalog loading fails", async () => {
    mockedGetCatalogHabits.mockRejectedValue(
      new Error("Unable to connect to the server"),
    );

    render(<HabitCatalog />);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "Unable to connect to the server",
    );
  });
});