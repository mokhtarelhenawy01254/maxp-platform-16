jest.mock("../../../../i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

import { normalizeStatusToStage } from "../helpers";

describe("Preparation tab count aggregation", () => {
  const computeTabCounts = (
    filterTabs: { statusCode: string; name: string }[],
    statusCounts: Record<string, number>,
    stageCounts: Record<string, number> = {}
  ) => {
    const tabCodes = new Set(filterTabs.map((t) => t.statusCode));

    const primaryTabByStage = new Map<string, string>();
    filterTabs.forEach((tab) => {
      const stage = normalizeStatusToStage(tab.statusCode);
      if (stage && !primaryTabByStage.has(stage)) {
        primaryTabByStage.set(stage, tab.statusCode);
      }
    });

    const unrepresentedCountsByStage: Record<string, number> = {};
    Object.entries(statusCounts).forEach(([statusCode, count]) => {
      if (!tabCodes.has(statusCode)) {
        const stage = normalizeStatusToStage(statusCode);
        if (stage) {
          unrepresentedCountsByStage[stage] =
            (unrepresentedCountsByStage[stage] || 0) + Number(count || 0);
        }
      }
    });

    return filterTabs.map((tab) => {
      const mappedStage = normalizeStatusToStage(tab.statusCode);
      const hasDirectCount = statusCounts[tab.statusCode] !== undefined;
      const isPrimary = mappedStage
        ? primaryTabByStage.get(mappedStage) === tab.statusCode
        : false;
      const unrepresentedCount =
        hasDirectCount && isPrimary && mappedStage
          ? unrepresentedCountsByStage[mappedStage] || 0
          : 0;
      const count =
        (hasDirectCount
          ? statusCounts[tab.statusCode]
          : mappedStage && stageCounts[mappedStage] !== undefined
          ? stageCounts[mappedStage]
          : 0) + unrepresentedCount;

      return { statusCode: tab.statusCode, count };
    });
  };

  test("aggregates unrepresented CONFIRMED order into PENDING_PREPARATION tab count", () => {
    const filterTabs = [
      { statusCode: "BDONKODTERBO", name: "بدون كود تيربو" },
      { statusCode: "PENDING_PREPARATION", name: "في انتظار التجهيز" },
      { statusCode: "PREPARING", name: "قيد التجهيز" },
    ];

    const statusCounts = {
      BDONKODTERBO: 0,
      PENDING_PREPARATION: 2,
      CONFIRMED: 1, // Order ORD-666664-718 with status CONFIRMED
      PREPARING: 31,
    };

    const result = computeTabCounts(filterTabs, statusCounts);

    expect(result.find((r) => r.statusCode === "BDONKODTERBO")?.count).toBe(0);
    // 2 (PENDING_PREPARATION) + 1 (CONFIRMED) = 3
    expect(result.find((r) => r.statusCode === "PENDING_PREPARATION")?.count).toBe(3);
    expect(result.find((r) => r.statusCode === "PREPARING")?.count).toBe(31);
  });

  test("keeps distinct counts when CONFIRMED has its own tab", () => {
    const filterTabs = [
      { statusCode: "CONFIRMED", name: "مؤكد" },
      { statusCode: "PENDING_PREPARATION", name: "في انتظار التجهيز" },
    ];

    const statusCounts = {
      CONFIRMED: 1,
      PENDING_PREPARATION: 2,
    };

    const result = computeTabCounts(filterTabs, statusCounts);

    expect(result.find((r) => r.statusCode === "CONFIRMED")?.count).toBe(1);
    expect(result.find((r) => r.statusCode === "PENDING_PREPARATION")?.count).toBe(2);
  });

  test("falls back to stageCounts when statusCounts has no entry for tab", () => {
    const filterTabs = [
      { statusCode: "PENDING_PREPARATION", name: "في انتظار التجهيز" },
    ];

    const statusCounts = {};
    const stageCounts = { WAITING: 3 };

    const result = computeTabCounts(filterTabs, statusCounts, stageCounts);

    expect(result.find((r) => r.statusCode === "PENDING_PREPARATION")?.count).toBe(3);
  });
});
