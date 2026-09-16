import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import App from "../App";
import * as api from "../services/api";

vi.mock("../services/api");

vi.mock("../services/habitApi", () => ({
  getHabits: vi.fn().mockResolvedValue([]),
  getCatalogHabits: vi.fn().mockResolvedValue([]),
  adoptHabit: vi.fn(),
  archiveHabit: vi.fn(),
  restoreHabit: vi.fn(),
  deleteHabit: vi.fn(),
  reorderHabits: vi.fn(),
  getHabit: vi.fn(),
  getCatalogHabit: vi.fn(),
}));
class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];

  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor() {
    MockBroadcastChannel.instances.push(this);
  }

  postMessage() {}

  close() {}

  static broadcast(message: string) {
    for (const channel of MockBroadcastChannel.instances) {
      channel.onmessage?.(
        new MessageEvent("message", {
          data: message,
        }),
      );
    }
  }
}

vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);

describe("App authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(api.getCurrentUser).mockReset();

    MockBroadcastChannel.instances = [];
  });

  it("shows the login screen when the user is unauthenticated", async () => {
    vi.mocked(api.getCurrentUser).mockRejectedValue(
      new api.ApiError("Authentication required", 401, "UNAUTHENTICATED"),
    );

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Happit" }),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("button", { name: "Log in" }),
    ).toBeInTheDocument();
  });

  it("shows the authenticated user when a session is valid", async () => {
    const user = {
      id: "user-123",
      email: "test@example.com",
      createdAt: "2026-09-07T00:00:00.000Z",
    };

    vi.mocked(api.getCurrentUser).mockResolvedValue({
      user,
    });

    render(<App />);

    const emails = await screen.findAllByText("test@example.com");
    expect(emails.length).toBeGreaterThan(0);

    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Delete account" }),
    ).toBeInTheDocument();
  });

  it("returns to the login screen after logout", async () => {
    const user = {
      id: "user-123",
      email: "test@example.com",
      createdAt: "2026-09-07T00:00:00.000Z",
    };

    vi.mocked(api.getCurrentUser)
      .mockResolvedValueOnce({ user })
      .mockRejectedValueOnce(
        new api.ApiError("Authentication required", 401, "UNAUTHENTICATED"),
      );

    vi.mocked(api.logout).mockResolvedValue(undefined);

    render(<App />);

    const emails = await screen.findAllByText("test@example.com");
    expect(emails.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(
      await screen.findByRole("button", { name: "Log in" }),
    ).toBeInTheDocument();

    expect(api.logout).toHaveBeenCalledTimes(1);
  });

  it("returns to the login screen after account deletion", async () => {
    const user = {
      id: "user-123",
      email: "test@example.com",
      createdAt: "2026-09-07T00:00:00.000Z",
    };

    vi.mocked(api.getCurrentUser).mockResolvedValue({ user });
    vi.mocked(api.deleteAccount).mockResolvedValue(undefined);

    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<App />);

    const emails = await screen.findAllByText("test@example.com");
    expect(emails.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));

    expect(api.deleteAccount).toHaveBeenCalledTimes(1);

    expect(
      await screen.findByRole("button", { name: "Log in" }),
    ).toBeInTheDocument();
  });

  it("does not delete the account when deletion is cancelled", async () => {
    const user = {
      id: "user-123",
      email: "test@example.com",
      createdAt: "2026-09-07T00:00:00.000Z",
    };

    vi.mocked(api.getCurrentUser).mockResolvedValue({ user });
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<App />);

    const emails = await screen.findAllByText("test@example.com");
    expect(emails.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));

    expect(api.deleteAccount).not.toHaveBeenCalled();

    expect(screen.getAllByText("test@example.com").length).toBeGreaterThan(0);
  });

  it("returns to the login screen when another tab logs out", async () => {
    const user = {
      id: "user-123",
      email: "test@example.com",
      createdAt: "2026-09-07T00:00:00.000Z",
    };

    vi.mocked(api.getCurrentUser).mockResolvedValue({ user });

    render(<App />);

    const emails = await screen.findAllByText("test@example.com");
    expect(emails.length).toBeGreaterThan(0);

    act(() => {
      MockBroadcastChannel.broadcast("LOGGED_OUT");
    });

    expect(
      await screen.findByRole("button", { name: "Log in" }),
    ).toBeInTheDocument();
  });

  it("switches between my habits and the habit catalog", async () => {
  vi.mocked(api.getCurrentUser).mockResolvedValue({
    user: {
      id: "user-123",
      email: "test@example.com",
      createdAt: "2026-09-07T00:00:00.000Z",
    },
  });

  render(<App />);

  expect(
    await screen.findByRole("heading", { name: "Your habits" }),
  ).toBeInTheDocument();

  fireEvent.click(
    screen.getByRole("link", { name: "Habit catalog" }),
  );

  expect(
    await screen.findByRole("heading", { name: "Habit catalog" }),
  ).toBeInTheDocument();

  fireEvent.click(
    screen.getAllByRole("link", { name: "Habits" })[0],
  );

  expect(
    await screen.findByRole("heading", { name: "Your habits" }),
  ).toBeInTheDocument();
});

it("switches between my habits, habit catalog, and archived habits", async () => {
  vi.mocked(api.getCurrentUser).mockResolvedValue({
    user: {
      id: "user-123",
      email: "test@example.com",
      createdAt: "2026-09-07T00:00:00.000Z",
    },
  });

  render(<App />);

  expect(
    await screen.findByRole("heading", { name: "Your habits" }),
  ).toBeInTheDocument();

  fireEvent.click(
    screen.getByRole("link", { name: "Habit catalog" }),
  );

  expect(
    await screen.findByRole("heading", { name: "Habit catalog" }),
  ).toBeInTheDocument();

  fireEvent.click(
    screen.getByRole("link", { name: "Archived" }),
  );

  expect(
    await screen.findByRole("heading", { name: "Archived habits" }),
  ).toBeInTheDocument();

  fireEvent.click(
    screen.getAllByRole("link", { name: "Habits" })[0],
  );

  expect(
    await screen.findByRole("heading", { name: "Your habits" }),
  ).toBeInTheDocument();
});
});
