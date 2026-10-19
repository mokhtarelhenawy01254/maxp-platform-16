import {
  getDateInputValueWithOffset,
  isShortageFollowUpToday,
  isShortageFollowUpOverdue,
  getShortageFollowUpState,
  getShortageFollowUpVisual,
  getShortageReasonLabel,
} from "./shortageFollowUpHelpers";

describe("shortageFollowUpHelpers", () => {
  it("computes date offset correctly", () => {
    const today = getDateInputValueWithOffset(0);
    expect(/^\d{4}-\d{2}-\d{2}$/.test(today)).toBe(true);
  });

  it("identifies shortage follow up date states", () => {
    const today = getDateInputValueWithOffset(0);
    const yesterday = getDateInputValueWithOffset(-1);
    const tomorrow = getDateInputValueWithOffset(1);

    expect(isShortageFollowUpToday(today, "STOCK_SHORTAGE")).toBe(true);
    expect(isShortageFollowUpOverdue(yesterday, "STOCK_SHORTAGE")).toBe(true);
    expect(isShortageFollowUpOverdue(tomorrow, "STOCK_SHORTAGE")).toBe(false);

    expect(getShortageFollowUpState(today, "STOCK_SHORTAGE")).toBe("today");
    expect(getShortageFollowUpState(yesterday, "STOCK_SHORTAGE")).toBe("overdue");
    expect(getShortageFollowUpState(tomorrow, "STOCK_SHORTAGE")).toBe("scheduled");
    expect(getShortageFollowUpState("", "STOCK_SHORTAGE")).toBe("without_date");
    expect(getShortageFollowUpState(today, "READY_TO_SHIP")).toBe("none");
  });

  it("returns visual badges and classes", () => {
    const overdueVisual = getShortageFollowUpVisual("overdue");
    expect(overdueVisual).not.toBeNull();
    expect(overdueVisual?.badgeClass).toContain("orange");

    const noneVisual = getShortageFollowUpVisual("none");
    expect(noneVisual).toBeNull();
  });

  it("gets shortage reason label", () => {
    const label = getShortageReasonLabel("supplier_delayed");
    expect(typeof label).toBe("string");
  });
});
