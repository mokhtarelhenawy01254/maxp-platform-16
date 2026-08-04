jest.mock("../../../../i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

import {
  buildProblemHoldDetails,
  getActiveHoldDetails,
  getShortageFollowUpState,
  isProblemHoldStage,
  isShortageFollowUpOverdue,
  isShortageFollowUpToday,
} from "../helpers";

describe("preparation problem hold helpers", () => {
  test("buildProblemHoldDetails defaults to 'other' reason when none set", () => {
    const details = buildProblemHoldDetails({});
    expect(details.reason).toBe("waiting_customer");
    expect(details.state).toBe("held");
    expect(details.owner).toBe("");
    expect(details.followUpDate).toBe("");
  });

  test("buildProblemHoldDetails reads preparationHold metadata", () => {
    const details = buildProblemHoldDetails({
      preparationHold: {
        reason: "payment_issue",
        owner: "محمود",
        followUpDate: "2026-08-05",
        customerNotified: true,
        note: "الدفع لم يتم",
        heldAt: "2026-08-04T10:00:00.000Z",
        releasedAt: "",
        heldBy: "علي",
        state: "held",
      },
    });
    expect(details.reason).toBe("payment_issue");
    expect(details.owner).toBe("محمود");
    expect(details.followUpDate).toBe("2026-08-05");
    expect(details.customerNotified).toBe(true);
    expect(details.note).toBe("الدفع لم يتم");
    expect(details.heldBy).toBe("علي");
  });

  test("getActiveHoldDetails picks problem hold for ON_HOLD_PREP stage", () => {
    const details = getActiveHoldDetails({
      stage: "ON_HOLD_PREP",
      metadata: {
        preparationHold: { reason: "address_issue", owner: "عماد" },
      },
    });
    expect(details.reason).toBe("address_issue");
    expect(details.owner).toBe("عماد");
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
    const today = new Date().toISOString().slice(0, 10);
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
