import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resolveFacebookAdsDateRange,
  toFacebookAdsDateInput,
} from "../facebookAdsReportFilters";

describe("facebookAdsReportFilters", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats date input values from the requested reporting timezone", () => {
    const cairoAfterMidnight = new Date("2026-05-04T22:30:00.000Z");

    expect(toFacebookAdsDateInput(cairoAfterMidnight, "Africa/Cairo")).toBe(
      "2026-05-05",
    );
    expect(toFacebookAdsDateInput(cairoAfterMidnight, "UTC")).toBe(
      "2026-05-04",
    );
  });

  it("resolves today without shifting the ad account timezone to UTC", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T22:30:00.000Z"));

    expect(
      resolveFacebookAdsDateRange({ preset: "today" }, "Africa/Cairo"),
    ).toEqual({
      startDate: "2026-05-05",
      endDate: "2026-05-05",
    });
  });
});
