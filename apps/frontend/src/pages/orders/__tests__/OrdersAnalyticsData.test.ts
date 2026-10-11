import { getPresetRange, isValidPeriodKey, calculateCustomDaysCount } from "../analytics/dateUtils";

describe("Orders Analytics dateUtils", () => {
  test("validates period keys accurately", () => {
    expect(isValidPeriodKey("today")).toBe(true);
    expect(isValidPeriodKey("yesterday")).toBe(true);
    expect(isValidPeriodKey("thisMonth")).toBe(true);
    expect(isValidPeriodKey("30")).toBe(true);
    expect(isValidPeriodKey("all")).toBe(true);
    expect(isValidPeriodKey("invalidKey")).toBe(false);
  });

  test("generates today preset range with 1 day count", () => {
    const fixedNow = new Date("2026-10-11T12:00:00Z");
    const range = getPresetRange("today", fixedNow);
    expect(range.daysCount).toBe(1);
    expect(range.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.end).toBe(range.start);
  });

  test("calculates inclusive days count for custom date range", () => {
    expect(calculateCustomDaysCount("2026-10-01", "2026-10-05")).toBe(5);
    expect(calculateCustomDaysCount("2026-10-01", "2026-10-01")).toBe(1);
  });
});
