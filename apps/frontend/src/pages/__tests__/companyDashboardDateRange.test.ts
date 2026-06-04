import {
  findMatchingPresetRange,
  getDateRangeDisplayLabel,
  getInitialDateRange,
  getPresetRanges,
} from "../companyDashboardDateRange";

describe("companyDashboardDateRange", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-04-27T10:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("defaults to today for the initial dashboard range", () => {
    expect(getInitialDateRange()).toEqual({
      start: "2026-04-27",
      end: "2026-04-27",
    });
  });

  test("resolves the matching preset label when the range is predefined", () => {
    const presets = getPresetRanges((key) => {
      const labels: Record<string, string> = {
        "companyDashboard.presets.today": "Today",
        "companyDashboard.presets.yesterday": "Yesterday",
        "companyDashboard.presets.last7Days": "Last 7 days",
        "companyDashboard.presets.last30Days": "Last 30 days",
        "companyDashboard.presets.thisMonth": "This month",
        "companyDashboard.presets.lastMonth": "Last month",
      };

      return labels[key] ?? key;
    });

    const matchingPreset = findMatchingPresetRange(
      { start: "2026-04-27", end: "2026-04-27" },
      presets,
    );

    expect(matchingPreset?.id).toBe("today");
    expect(
      getDateRangeDisplayLabel(
        { start: "2026-04-27", end: "2026-04-27" },
        presets,
        "en-US",
      ),
    ).toBe("Today");
  });

  test("keeps custom ranges outside the preset list", () => {
    const presets = getPresetRanges((key) => key);

    expect(
      findMatchingPresetRange(
        { start: "2026-04-03", end: "2026-04-11" },
        presets,
      ),
    ).toBeNull();
  });
});
