import type {
  ExpectedOccurrence,
  ScheduleDefinition,
} from "./progress.types.js";
import { isValidTimezone } from "./timezone.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

function isWeekdayScheduled(date: Date, scheduleConfig: unknown): boolean {
  if (
    typeof scheduleConfig !== "object" ||
    scheduleConfig === null ||
    !("weekdays" in scheduleConfig)
  ) {
    return false;
  }

  const weekdays = (scheduleConfig as { weekdays?: unknown }).weekdays;

  if (!Array.isArray(weekdays)) {
    return false;
  }

  return weekdays.includes(date.getUTCDay());
}

function isScheduledDate(date: Date, schedule: ScheduleDefinition): boolean {
  switch (schedule.scheduleType) {
    case "DAILY":
      return true;

    case "WEEKDAYS":
      return isWeekdayScheduled(date, schedule.scheduleConfig);

    case "WEEKLY_TARGET":
      throw new Error("WEEKLY_TARGET schedule semantics are not defined yet.");
  }
}

export function generateExpectedOccurrences(
  schedule: ScheduleDefinition,
  from: string,
  to: string,
  startDate: string,
  endDate?: string,
  today?: string,
  timezone = "UTC",
): ExpectedOccurrence[] {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  const rangeStart = parseDate(from);
  const rangeEnd = parseDate(to);
  const adoptionStart = parseDate(startDate);

  const effectiveEnd = endDate ? parseDate(endDate) : rangeEnd;

  const evaluationDate = today ? parseDate(today) : rangeEnd;

  const occurrences: ExpectedOccurrence[] = [];

  let current = rangeStart;

  while (current <= rangeEnd) {
    const date = formatDate(current);

    const insideAdoptionWindow =
      current >= adoptionStart && current <= effectiveEnd;

    if (insideAdoptionWindow) {
      const scheduled = isScheduledDate(current, schedule);

      occurrences.push({
        date,
        state: scheduled
          ? current > evaluationDate
            ? "UPCOMING"
            : "INCOMPLETE"
          : "NOT_SCHEDULED",
      });
    }

    current = addDays(current, 1);
  }

  return occurrences;
}
