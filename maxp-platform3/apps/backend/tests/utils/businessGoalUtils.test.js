const {
  DEFAULT_WORK_DAYS,
  buildWorkdayDates,
  computeProgress,
  deriveGoalStatus,
  distributeTargetAcrossDates,
  parseWorkDays,
} = require("../../services/businessGoalUtils");

describe("businessGoalUtils", () => {
  test("falls back to default work days and normalizes valid work days", () => {
    expect(parseWorkDays(null)).toEqual(DEFAULT_WORK_DAYS);
    expect(parseWorkDays("not-json")).toEqual(DEFAULT_WORK_DAYS);
    expect(parseWorkDays([5, 1, "2", 2, 1, 9])).toEqual([1, 2, 5]);
  });

  test("builds dates only for configured work days", () => {
    const workdayDates = buildWorkdayDates(
      "2026-04-27T00:00:00.000Z",
      "2026-05-03T00:00:00.000Z",
      [1, 2, 3, 4, 5],
    );

    expect(workdayDates).toHaveLength(5);
    expect(workdayDates.map((date) => date.toISOString().split("T")[0])).toEqual([
      "2026-04-27",
      "2026-04-28",
      "2026-04-29",
      "2026-04-30",
      "2026-05-01",
    ]);
  });

  test("distributes targets across dates without losing precision", () => {
    const distribution = distributeTargetAcrossDates(100, [
      new Date("2026-04-27T00:00:00.000Z"),
      new Date("2026-04-28T00:00:00.000Z"),
      new Date("2026-04-29T00:00:00.000Z"),
    ]);

    expect(distribution).toHaveLength(3);
    expect(distribution.map((item) => item.targetValue)).toEqual([
      33.34,
      33.33,
      33.33,
    ]);
    expect(
      distribution.reduce((sum, item) => sum + item.targetValue, 0),
    ).toBeCloseTo(100, 2);
  });

  test("computes progress safely and clamps overflow", () => {
    expect(computeProgress(50, 100)).toBe(50);
    expect(computeProgress(150, 100)).toBe(100);
    expect(computeProgress(10, 0)).toBe(0);
  });

  test("derives status from direct progress and child activity", () => {
    expect(
      deriveGoalStatus({
        currentValue: 100,
        targetValue: 100,
      }),
    ).toBe("COMPLETED");

    expect(
      deriveGoalStatus({
        currentValue: 0,
        targetValue: 100,
        hasChildren: true,
        children: [{ status: "IN_PROGRESS" }],
      }),
    ).toBe("IN_PROGRESS");

    expect(
      deriveGoalStatus({
        currentValue: 0,
        targetValue: 100,
        children: [],
      }),
    ).toBe("PENDING");
  });
});
