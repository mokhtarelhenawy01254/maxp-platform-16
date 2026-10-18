jest.mock("../../../../i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

import {
  buildProblemHoldDetails,
  getActiveHoldDetails,
  getDateInputValueWithOffset,
  getShortageFollowUpState,
  isProblemHoldStage,
  isShortageFollowUpOverdue,
  isShortageFollowUpToday,
} from "../helpers";

describe("preparation problem hold helpers", () => {
  test("buildProblemHoldDetails defaults to empty reason when none set", () => {
    const details = buildProblemHoldDetails({});
    expect(details.reason).toBe("");
    expect(details.state).toBe("held");
  });

  test("buildProblemHoldDetails reads preparationHold metadata", () => {
    const details = buildProblemHoldDetails({
      preparationHold: {
        reason: "العميل لم يرد على العنوان",
        heldAt: "2026-08-04T10:00:00.000Z",
        releasedAt: "",
        heldBy: "علي",
        state: "held",
      },
    });
    expect(details.reason).toBe("العميل لم يرد على العنوان");
    expect(details.heldBy).toBe("علي");
  });

  test("buildProblemHoldDetails reads released state", () => {
    const details = buildProblemHoldDetails({
      preparationHold: {
        reason: "بانتظار المورد",
        heldAt: "2026-08-04T10:00:00.000Z",
        releasedAt: "2026-08-05T10:00:00.000Z",
        releasedBy: "سارة",
        state: "released",
      },
    });
    expect(details.reason).toBe("بانتظار المورد");
    expect(details.releasedBy).toBe("سارة");
    expect(details.state).toBe("released");
  });

  test("getActiveHoldDetails picks problem hold for ON_HOLD_PREP stage", () => {
    const details = getActiveHoldDetails({
      stage: "ON_HOLD_PREP",
      metadata: {
        preparationHold: { reason: "مشكلة في العنوان" },
      },
    });
    expect(details.reason).toBe("مشكلة في العنوان");
  });

  test("getActiveHoldDetails picks shortage hold for STOCK_SHORTAGE stage", () => {
    const details = getActiveHoldDetails({
      stage: "STOCK_SHORTAGE",
      metadata: {
        preparationShortageHold: { reason: "waiting_transfer", owner: "خالد" },
      },
    });
    expect(details.reason).toBe("waiting_transfer");
    expect(details.owner).toBe("خالد");
  });

  test("isProblemHoldStage recognizes both hold stages", () => {
    expect(isProblemHoldStage("ON_HOLD_PREP")).toBe(true);
    expect(isProblemHoldStage("STOCK_SHORTAGE")).toBe(true);
    expect(isProblemHoldStage("PREPARING")).toBe(false);
  });

  test("follow-up state works for ON_HOLD_PREP orders", () => {
    const today = getDateInputValueWithOffset(0);
    expect(getShortageFollowUpState(today, "ON_HOLD_PREP")).toBe("today");
    expect(getShortageFollowUpState("2020-01-01", "ON_HOLD_PREP")).toBe("overdue");
    expect(getShortageFollowUpState("", "ON_HOLD_PREP")).toBe("without_date");
    expect(getShortageFollowUpState(today, "PACKAGED")).toBe("none");
  });

  test("overdue/today guards ignore non-hold stages", () => {
    expect(isShortageFollowUpOverdue("2020-01-01", "PACKAGED")).toBe(false);
    expect(isShortageFollowUpToday("2020-01-01", "PACKAGED")).toBe(false);
  });
});
