import { renderHook } from "@testing-library/react";
import { useOrderEditCalculation } from "./useOrderEditCalculation";
import type { OrderDetailsType } from "../types";

jest.mock("../../../hooks/useUnsavedChanges", () => ({
  useUnsavedChanges: jest.fn(),
}));

describe("useOrderEditCalculation", () => {
  const mockT = jest.fn((key: string) => key);

  const baseOrder: OrderDetailsType = {
    id: "ord-1",
    customerName: "Ahmed Ali",
    customerPhone: "01000000000",
    alternativePhone: "",
    customerAddress: "Downtown, Cairo",
    city: "Cairo",
    notes: "Deliver after 5 PM",
    shipping: 40,
    tax: 10,
    discount: 20,
    discountReason: "Promotion",
    subtotal: 200,
    total: 230,
    items: [
      { id: "item-1", price: 100, quantity: 2, name: "Product A" },
    ],
  } as any;

  it("returns base totals and hasUnsavedChanges=false when not editing", () => {
    const { result } = renderHook(() =>
      useOrderEditCalculation({
        order: baseOrder,
        editForm: { ...baseOrder },
        isEditing: false,
        canEditOrderDetails: true,
        t: mockT,
      }),
    );

    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.calculatedTotals).toEqual({
      subtotal: 200,
      shipping: 40,
      tax: 10,
      discount: 20,
      total: 230,
    });
  });

  it("detects unsaved changes when customer name or items change during editing", () => {
    const { result, rerender } = renderHook(
      (props) => useOrderEditCalculation(props),
      {
        initialProps: {
          order: baseOrder,
          editForm: {
            customerName: "Ahmed Ali",
            customerPhone: "01000000000",
            alternativePhone: "",
            customerAddress: "Downtown, Cairo",
            city: "Cairo",
            notes: "Deliver after 5 PM",
            shipping: 40,
            tax: 10,
            discount: 20,
            discountReason: "Promotion",
            items: [{ id: "item-1", price: 100, quantity: 2, name: "Product A" }],
          },
          isEditing: true,
          canEditOrderDetails: true,
          t: mockT,
        },
      },
    );

    expect(result.current.hasUnsavedChanges).toBe(false);

    // Modify customerName
    rerender({
      order: baseOrder,
      editForm: {
        customerName: "Ahmed Mohamed Ali",
        customerPhone: "01000000000",
        alternativePhone: "",
        customerAddress: "Downtown, Cairo",
        city: "Cairo",
        notes: "Deliver after 5 PM",
        shipping: 40,
        tax: 10,
        discount: 20,
        discountReason: "Promotion",
        items: [{ id: "item-1", price: 100, quantity: 2, name: "Product A" }],
      },
      isEditing: true,
      canEditOrderDetails: true,
      t: mockT,
    });

    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it("calculates real-time totals dynamically based on items and charges", () => {
    const { result } = renderHook(() =>
      useOrderEditCalculation({
        order: baseOrder,
        editForm: {
          items: [
            { price: "150", quantity: "2" }, // 300
            { price: 50, quantity: 1 },      // 50 => subtotal 350
          ],
          shipping: "50",
          tax: "25",
          discount: "75",
        },
        isEditing: true,
        canEditOrderDetails: true,
        t: mockT,
      }),
    );

    // subtotal = 350, shipping = 50, tax = 25, discount = 75 => total = 350
    expect(result.current.calculatedTotals).toEqual({
      subtotal: 350,
      shipping: 50,
      tax: 25,
      discount: 75,
      total: 350,
    });
  });

  it("clamps total to 0 when discount exceeds sum of subtotal, shipping, and tax", () => {
    const { result } = renderHook(() =>
      useOrderEditCalculation({
        order: baseOrder,
        editForm: {
          items: [{ price: 50, quantity: 1 }],
          shipping: 10,
          tax: 0,
          discount: 200, // exceeds 60
        },
        isEditing: true,
        canEditOrderDetails: true,
        t: mockT,
      }),
    );

    expect(result.current.calculatedTotals.total).toBe(0);
  });
});
