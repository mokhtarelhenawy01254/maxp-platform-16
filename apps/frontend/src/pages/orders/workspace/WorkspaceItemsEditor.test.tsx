import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkspaceItemsEditor } from "./WorkspaceItemsEditor";
import { WorkspaceOrder } from "./types";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: { success: true, data: { variants: [] } } }),
    post: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

jest.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (amount: number) => `${amount} ج.م`,
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "ar" },
    t: (key: string) => key,
  }),
}));

describe("WorkspaceItemsEditor", () => {
  const mockOrder: WorkspaceOrder = {
    id: "ord-test-1",
    orderNumber: "ORD-101",
    shipping: 50,
    discount: 10,
    items: [
      {
        id: "it-1",
        name: "تيشيرت كلاسيك",
        price: 200,
        quantity: 1,
        total: 200,
        productColor: "أبيض",
        productSize: "L",
      },
    ],
  } as unknown as WorkspaceOrder;

  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders order items and computed totals without throwing", () => {
    render(
      <WorkspaceItemsEditor
        order={mockOrder}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isSaving={false}
      />,
    );

    expect(screen.getByText("تعديل بنود وعروض الطلب")).toBeInTheDocument();
    expect(screen.getByText("تيشيرت كلاسيك")).toBeInTheDocument();
    // 200 + 50 (shipping) - 10 (discount) = 240
    expect(screen.getByText("240 ج.م")).toBeInTheDocument();
  });

  it("handles quantity increase and updates computed total", () => {
    render(
      <WorkspaceItemsEditor
        order={mockOrder}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isSaving={false}
      />,
    );

    const increaseBtn = screen.getByTitle("زيادة");
    fireEvent.click(increaseBtn);

    // Quantity becomes 2, subtotal 400 + 50 - 10 = 440
    expect(screen.getByText("440 ج.م")).toBeInTheDocument();
  });

  it("calls onSave when save button is clicked", async () => {
    render(
      <WorkspaceItemsEditor
        order={mockOrder}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isSaving={false}
      />,
    );

    const saveBtn = screen.getByRole("button", { name: /حفظ التعديلات/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith("ord-test-1", expect.any(Array), {
        shipping: 50,
        discount: 10,
      });
    });
  });

  it("calls onCancel when cancel button is clicked", () => {
    render(
      <WorkspaceItemsEditor
        order={mockOrder}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isSaving={false}
      />,
    );

    const cancelBtn = screen.getByRole("button", { name: /إلغاء/i });
    fireEvent.click(cancelBtn);

    expect(mockOnCancel).toHaveBeenCalled();
  });
});
