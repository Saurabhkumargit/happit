// Timer state persistence to survive page refreshes

export interface TimerState {
  habitId: string;
  habitName: string;
  startedAt: string;
  accumulatedSeconds: number;
  runningSince: number | null;
  state: "RUNNING" | "PAUSED";
}

const TIMER_STORAGE_KEY = "happit_timer_state";

export function saveTimerState(state: TimerState): void {
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save timer state:", error);
  }
}

export function loadTimerState(): TimerState | null {
  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const state = JSON.parse(stored) as TimerState;

    // Validate the state structure
    if (
      !state.habitId ||
      !state.startedAt ||
      typeof state.accumulatedSeconds !== "number"
    ) {
      clearTimerState();
      return null;
    }

    return state;
  } catch (error) {
    console.error("Failed to load timer state:", error);
    clearTimerState();
    return null;
  }
}

export function clearTimerState(): void {
  try {
    localStorage.removeItem(TIMER_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear timer state:", error);
  }
}
