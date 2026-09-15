import { describe, expect, it } from "vitest";
import {
  getLocalDate,
  isValidTimezone,
} from "../modules/progress/timezone.js";

describe("timezone validation", () => {
  it("accepts valid IANA timezones", () => {
    expect(isValidTimezone("UTC")).toBe(true);
    expect(isValidTimezone("Asia/Kolkata")).toBe(true);
    expect(isValidTimezone("America/New_York")).toBe(true);
  });

  it("rejects invalid timezones", () => {
    expect(isValidTimezone("Not/A_Timezone")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
  });
});

describe("local date conversion", () => {
  it("converts a UTC timestamp to the user's local date", () => {
    expect(
      getLocalDate(
        "2026-09-14T23:30:00Z",
        "Asia/Kolkata",
      ),
    ).toBe("2026-09-15");
  });

  it("keeps the previous date when the timezone is behind UTC", () => {
    expect(
      getLocalDate(
        "2026-09-15T02:00:00Z",
        "America/New_York",
      ),
    ).toBe("2026-09-14");
  });

  it("does not change the date when UTC is the timezone", () => {
    expect(
      getLocalDate(
        "2026-09-14T23:30:00Z",
        "UTC",
      ),
    ).toBe("2026-09-14");
  });

  it("rejects an invalid timezone", () => {
    expect(() =>
      getLocalDate(
        "2026-09-14T12:00:00Z",
        "Not/A_Timezone",
      ),
    ).toThrow("Invalid timezone");
  });
});

describe("adoption date conversion", () => {
  it("uses the user's local date for an adoption timestamp", () => {
    expect(
      getLocalDate(
        "2026-09-14T23:30:00Z",
        "Asia/Kolkata",
      ),
    ).toBe("2026-09-15");

    expect(
      getLocalDate(
        "2026-09-15T02:00:00Z",
        "America/New_York",
      ),
    ).toBe("2026-09-14");
  });
});