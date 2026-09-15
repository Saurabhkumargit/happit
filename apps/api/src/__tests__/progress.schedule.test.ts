import { describe, expect, it } from "vitest";
import { generateExpectedOccurrences } from "../modules/progress/schedule.js";

describe("progress schedule engine", () => {
  it("generates every day for a DAILY schedule", () => {
    const result = generateExpectedOccurrences(
      {
        scheduleType: "DAILY",
        scheduleConfig: {},
      },
      "2026-09-01",
      "2026-09-05",
      "2026-09-01",
      undefined,
      "2026-09-05",
    );

    expect(result).toEqual([
      { date: "2026-09-01", state: "INCOMPLETE" },
      { date: "2026-09-02", state: "INCOMPLETE" },
      { date: "2026-09-03", state: "INCOMPLETE" },
      { date: "2026-09-04", state: "INCOMPLETE" },
      { date: "2026-09-05", state: "INCOMPLETE" },
    ]);
  });

  it("generates only configured weekdays", () => {
    const result = generateExpectedOccurrences(
      {
        scheduleType: "WEEKDAYS",
        scheduleConfig: {
          weekdays: [1, 2, 3, 4, 5],
        },
      },
      "2026-09-07",
      "2026-09-13",
      "2026-09-07",
      undefined,
      "2026-09-13",
    );

    expect(result.map((occurrence) => occurrence.date)).toEqual([
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
      "2026-09-13",
    ]);

    expect(result.map((occurrence) => occurrence.state)).toEqual([
      "INCOMPLETE",
      "INCOMPLETE",
      "INCOMPLETE",
      "INCOMPLETE",
      "INCOMPLETE",
      "NOT_SCHEDULED",
      "NOT_SCHEDULED",
    ]);
  });

  it("marks non-configured weekdays as NOT_SCHEDULED", () => {
    const result = generateExpectedOccurrences(
      {
        scheduleType: "WEEKDAYS",
        scheduleConfig: {
          weekdays: [1, 2, 3, 4, 5],
        },
      },
      "2026-09-07",
      "2026-09-13",
      "2026-09-07",
      undefined,
      "2026-09-13",
    );

    expect(result).toEqual([
      { date: "2026-09-07", state: "INCOMPLETE" },
      { date: "2026-09-08", state: "INCOMPLETE" },
      { date: "2026-09-09", state: "INCOMPLETE" },
      { date: "2026-09-10", state: "INCOMPLETE" },
      { date: "2026-09-11", state: "INCOMPLETE" },
      { date: "2026-09-12", state: "NOT_SCHEDULED" },
      { date: "2026-09-13", state: "NOT_SCHEDULED" },
    ]);
  });

  it("marks future scheduled dates as UPCOMING", () => {
    const result = generateExpectedOccurrences(
      {
        scheduleType: "DAILY",
        scheduleConfig: {},
      },
      "2026-09-10",
      "2026-09-12",
      "2026-09-10",
      undefined,
      "2026-09-10",
    );

    expect(result).toEqual([
      { date: "2026-09-10", state: "INCOMPLETE" },
      { date: "2026-09-11", state: "UPCOMING" },
      { date: "2026-09-12", state: "UPCOMING" },
    ]);
  });

  it("does not generate occurrences before habit adoption", () => {
    const result = generateExpectedOccurrences(
      {
        scheduleType: "DAILY",
        scheduleConfig: {},
      },
      "2026-09-01",
      "2026-09-05",
      "2026-09-03",
      undefined,
      "2026-09-05",
    );

    expect(result.map((occurrence) => occurrence.date)).toEqual([
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
    ]);
  });

  it("does not generate occurrences after the effective end date", () => {
    const result = generateExpectedOccurrences(
      {
        scheduleType: "DAILY",
        scheduleConfig: {},
      },
      "2026-09-01",
      "2026-09-07",
      "2026-09-01",
      "2026-09-05",
      "2026-09-07",
    );

    expect(result.map((occurrence) => occurrence.date)).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
    ]);
  });

  it("includes the adoption start date and effective end date", () => {
    const result = generateExpectedOccurrences(
      {
        scheduleType: "DAILY",
        scheduleConfig: {},
      },
      "2026-09-03",
      "2026-09-05",
      "2026-09-03",
      "2026-09-05",
      "2026-09-05",
    );

    expect(result.map((occurrence) => occurrence.date)).toEqual([
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
    ]);
  });

  it("rejects unsupported WEEKLY_TARGET semantics", () => {
    expect(() =>
      generateExpectedOccurrences(
        {
          scheduleType: "WEEKLY_TARGET",
          scheduleConfig: {},
        },
        "2026-09-01",
        "2026-09-07",
        "2026-09-01",
        undefined,
        "2026-09-07",
      ),
    ).toThrow("WEEKLY_TARGET schedule semantics are not defined yet.");
  });

  it("rejects an invalid timezone", () => {
    expect(() =>
      generateExpectedOccurrences(
        {
          scheduleType: "DAILY",
          scheduleConfig: {},
        },
        "2026-09-01",
        "2026-09-03",
        "2026-09-01",
        undefined,
        "2026-09-03",
        "Not/A_Timezone",
      ),
    ).toThrow("Invalid timezone");
  });
});
