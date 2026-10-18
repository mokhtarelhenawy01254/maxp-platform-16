import { renderHook } from "@testing-library/react";
import { useOrderStatusOptions } from "./useOrderStatusOptions";

describe("useOrderStatusOptions", () => {
  const mockOrderStatuses = [
    { code: "PENDING", name: "قيد الانتظار", color: "#F59E0B" },
    { code: "CONFIRMED", name: "مؤكد", color: "#10B981" },
    { code: "SHIPPED", name: "تم الشحن", color: "#3B82F6" },
    { code: "DELIVERED", name: "تم التوصيل", color: "#059669" },
    { code: "CANCELLED", name: "ملغي", color: "#EF4444" },
  ];

  const mockOrder = {
    id: "ord-1",
    status: "CONFIRMED",
  } as any;

  it("builds statusNameMap and resolves currentStatusConfig correctly", () => {
    const { result } = renderHook(() =>
      useOrderStatusOptions({
        order: mockOrder,
        orderStatuses: mockOrderStatuses,
        allowedTransitions: [],
        workflowStatusDefs: [],
        isOverride: false,
      }),
    );

    expect(result.current.statusNameMap["CONFIRMED"]).toBe("مؤكد");
    expect(result.current.statusNameMap["PENDING"]).toBe("قيد الانتظار");
    expect(result.current.effectiveStatus).toBe("CONFIRMED");
    expect(result.current.currentStatusConfig.name).toBe("مؤكد");
    expect(result.current.hasWorkflowRestrictions).toBe(false);
    expect(result.current.filteredStatusOptions.length).toBe(5);
  });

  it("filters allowed transitions according to workflow rules", () => {
    const { result } = renderHook(() =>
      useOrderStatusOptions({
        order: mockOrder,
        orderStatuses: mockOrderStatuses,
        allowedTransitions: ["SHIPPED", "CANCELLED"],
        workflowStatusDefs: [
          { code: "CANCELLED", name: "ملغي", requiresOverride: true },
        ],
        isOverride: false, // Override not active
      }),
    );

    expect(result.current.hasWorkflowRestrictions).toBe(true);
    // Should include current status (CONFIRMED) + SHIPPED, but CANCELLED requires override
    const codes = result.current.filteredStatusOptions.map((s) => s.code);
    expect(codes).toContain("CONFIRMED");
    expect(codes).toContain("SHIPPED");
    expect(codes).not.toContain("CANCELLED");
  });

  it("allows restricted status transition when isOverride is true", () => {
    const { result } = renderHook(() =>
      useOrderStatusOptions({
        order: mockOrder,
        orderStatuses: mockOrderStatuses,
        allowedTransitions: ["SHIPPED", "CANCELLED"],
        workflowStatusDefs: [
          { code: "CANCELLED", name: "ملغي", requiresOverride: true },
        ],
        isOverride: true, // Override active
      }),
    );

    const codes = result.current.filteredStatusOptions.map((s) => s.code);
    expect(codes).toContain("CANCELLED");
  });

  it("provides fallback currentStatusConfig for unknown or empty status", () => {
    const { result } = renderHook(() =>
      useOrderStatusOptions({
        order: { id: "ord-2", status: "CUSTOM_UNKNOWN" } as any,
        orderStatuses: mockOrderStatuses,
        allowedTransitions: [],
        workflowStatusDefs: [],
        isOverride: false,
      }),
    );

    expect(result.current.currentStatusConfig.code).toBe("CUSTOM_UNKNOWN");
    expect(result.current.currentStatusConfig.name).toBe("CUSTOM UNKNOWN");
    expect(result.current.currentStatusConfig.color).toBe("#6B7280");
  });
});
