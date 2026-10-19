import { renderHook } from "@testing-library/react";
import { usePreparationStatusOptions } from "./usePreparationStatusOptions";
import { SHORTAGE_HOLD_STATUS, PROBLEM_HOLD_STATUS } from "./constants";

describe("usePreparationStatusOptions", () => {
  const sampleParams = {
    statusConfigs: [
      { code: "confirmed", name: "Confirmed Order" },
      { code: "preparing", name: "In Preparation" },
    ],
    preparationStatuses: [
      { code: "PENDING_PREPARATION", name: "Pending Prep" },
      { code: "PREPARING", name: "Preparing Now" },
    ],
    preparationSettings: {
      handoffStatus: "READY_TO_SHIP",
      startingStatus: "CONFIRMED",
      qcChecks: {
        itemCount: true,
        variantMatch: true,
        qualityApproved: false,
      },
    },
    t: (key: string) => key,
  };

  test("builds statusLabelMap correctly with uppercase keys", () => {
    const { result } = renderHook(() => usePreparationStatusOptions(sampleParams));
    expect(result.current.statusLabelMap.get("CONFIRMED")).toBe("Confirmed Order");
    expect(result.current.statusLabelMap.get("PREPARING")).toBe("In Preparation");
  });

  test("builds statusOptions with default stages and deduplication", () => {
    const { result } = renderHook(() => usePreparationStatusOptions(sampleParams));
    const codes = result.current.statusOptions.map((o) => o.code);

    expect(codes).toContain("PENDING_PREPARATION");
    expect(codes).toContain("PREPARING");
    expect(codes).toContain("QUALITY_CHECK");
    expect(codes).toContain("PACKAGED");
    expect(codes).toContain(SHORTAGE_HOLD_STATUS);
    expect(codes).toContain("READY_TO_SHIP");
    expect(codes).toContain(PROBLEM_HOLD_STATUS);

    // Assert uniqueness
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  test("builds filterTabs including forced and special hold stages", () => {
    const { result } = renderHook(() => usePreparationStatusOptions(sampleParams));
    const tabCodes = result.current.filterTabs.map((t) => t.statusCode);

    expect(tabCodes).toContain("PENDING_PREPARATION");
    expect(tabCodes).toContain("PREPARING");
    expect(tabCodes).toContain(SHORTAGE_HOLD_STATUS);
    expect(tabCodes).toContain(PROBLEM_HOLD_STATUS);
  });

  test("extracts enabledQcChecks from preparationSettings", () => {
    const { result } = renderHook(() => usePreparationStatusOptions(sampleParams));
    expect(result.current.enabledQcChecks).toEqual(["itemCount", "variantMatch"]);
    expect(result.current.enabledQcChecks).not.toContain("qualityApproved");
  });
});
