import { renderHook, act } from "@testing-library/react";
import { usePreparationTransitions } from "./usePreparationTransitions";
import type { PreparationOrder, QcCheckKey } from "./types";

describe("usePreparationTransitions", () => {
  const defaultSettings = {
    enabled: true,
    requireStockBeforePreparing: true,
    allowPartialPreparation: false,
    allowCrossWarehouseTransfer: false,
    handoffStatus: "READY_TO_SHIP",
    enableQcChecklist: true,
  };

  const mockT = jest.fn((key: string) => key);
  const mockSetQcChecklistState = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns invalid when preparationSettings.enabled is false", () => {
    const { result } = renderHook(() =>
      usePreparationTransitions({
        preparationSettings: { ...defaultSettings, enabled: false },
        enabledQcChecks: ["verifyItems" as QcCheckKey],
        qcChecklistState: {},
        setQcChecklistState: mockSetQcChecklistState,
        userRole: "OPERATOR",
        t: mockT,
      }),
    );

    const order = { orderNumber: "ORD-1", isReady: true, stage: "PROCESSING" } as PreparationOrder;
    const validation = result.current.validateTransition(order, "QUALITY_CHECK");

    expect(validation.valid).toBe(false);
    expect(validation.message).toBe("preparation.page.disabled");
  });

  it("blocks transition when stock is incomplete and partial preparation is false", () => {
    const { result } = renderHook(() =>
      usePreparationTransitions({
        preparationSettings: {
          ...defaultSettings,
          requireStockBeforePreparing: true,
          allowPartialPreparation: false,
        },
        enabledQcChecks: [],
        qcChecklistState: {},
        setQcChecklistState: mockSetQcChecklistState,
        userRole: "OPERATOR",
        t: mockT,
      }),
    );

    const order = { orderNumber: "ORD-1", isReady: false, stage: "PREPARING" } as PreparationOrder;
    const validation = result.current.validateTransition(order, "QUALITY_CHECK");

    expect(validation.valid).toBe(false);
    expect(validation.message).toBe("preparation.page.stockMustBeComplete");
  });

  it("blocks forward move from QUALITY_CHECK when QC checks are incomplete", () => {
    const { result } = renderHook(() =>
      usePreparationTransitions({
        preparationSettings: defaultSettings,
        enabledQcChecks: ["verifyItems" as QcCheckKey, "verifyPackaging" as QcCheckKey],
        qcChecklistState: { "ORD-1": { verifyItems: true } }, // verifyPackaging missing
        setQcChecklistState: mockSetQcChecklistState,
        userRole: "OPERATOR",
        t: mockT,
      }),
    );

    const order = { orderNumber: "ORD-1", isReady: true, stage: "QUALITY_CHECK" } as PreparationOrder;
    const validation = result.current.validateTransition(order, "PACKAGED");

    expect(validation.valid).toBe(false);
    expect(validation.message).toBe("preparation.page.qcChecklistRequired");
  });

  it("blocks forward transition from ON_HOLD_PREP for regular users", () => {
    const { result } = renderHook(() =>
      usePreparationTransitions({
        preparationSettings: defaultSettings,
        enabledQcChecks: [],
        qcChecklistState: {},
        setQcChecklistState: mockSetQcChecklistState,
        userRole: "OPERATOR",
        t: mockT,
      }),
    );

    const order = { orderNumber: "ORD-1", isReady: true, stage: "ON_HOLD_PREP" } as PreparationOrder;
    const validation = result.current.validateTransition(order, "PREPARING");

    expect(validation.valid).toBe(false);
    expect(validation.message).toBe("preparation.page.holdBlocksForward");
  });

  it("allows forward transition from ON_HOLD_PREP for OWNER and ADMIN users", () => {
    const { result } = renderHook(() =>
      usePreparationTransitions({
        preparationSettings: defaultSettings,
        enabledQcChecks: [],
        qcChecklistState: {},
        setQcChecklistState: mockSetQcChecklistState,
        userRole: "OWNER",
        t: mockT,
      }),
    );

    const order = { orderNumber: "ORD-1", isReady: true, stage: "ON_HOLD_PREP" } as PreparationOrder;
    const validation = result.current.validateTransition(order, "PREPARING");

    expect(validation.valid).toBe(true);
    expect(validation.message).toBe("");
  });

  it("toggles QC checklist key state on handleQcCheckToggle", () => {
    const { result } = renderHook(() =>
      usePreparationTransitions({
        preparationSettings: defaultSettings,
        enabledQcChecks: ["verifyItems" as QcCheckKey],
        qcChecklistState: {},
        setQcChecklistState: mockSetQcChecklistState,
        userRole: "OPERATOR",
        t: mockT,
      }),
    );

    act(() => {
      result.current.handleQcCheckToggle("ORD-1", "verifyItems" as QcCheckKey, true);
    });

    expect(mockSetQcChecklistState).toHaveBeenCalled();
  });
});
