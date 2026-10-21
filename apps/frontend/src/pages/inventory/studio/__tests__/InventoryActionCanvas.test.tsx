/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
import { InventoryActionCanvas } from "../InventoryActionCanvas";
import type { StudioEntity, StudioDraftAction } from "../../../../components/agent-studio/types";

// Mock the API service
vi.mock("../../../../services/inventoryAiService", () => ({
  applyInventoryStudioAction: vi.fn().mockResolvedValue({
    success: true,
    message: "تم تطبيق التعديل بنجاح",
  }),
}));

describe("InventoryActionCanvas Component", () => {
  const mockProduct: StudioEntity = {
    id: "prod_001",
    name: "تيشيرت رياضي كلاسيك",
    price: 350,
    cost: 175,
    stock: 25,
    category: "ملابس رياضية",
  };

  it("renders empty state placeholder when no product is selected", () => {
    render(
      <InventoryActionCanvas
        selectedProduct={null}
        activeDraft={null}
      />
    );

    expect(screen.getByText("لم يتم تحديد منتج بعد")).toBeInTheDocument();
  });

  it("renders product economics tile and bento when product is selected", () => {
    render(
      <InventoryActionCanvas
        selectedProduct={mockProduct}
        activeDraft={null}
      />
    );

    expect(screen.getByText("تيشيرت رياضي كلاسيك")).toBeInTheDocument();
    expect(screen.getByText("ملابس رياضية")).toBeInTheDocument();
    expect(screen.getByText("مخزون آمن")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument(); // 50% margin
    expect(screen.getByText("25")).toBeInTheDocument(); // stock units
  });

  it("renders active draft proposal card and allows applying", async () => {
    const onDraftResolved = vi.fn();
    const onProductUpdated = vi.fn();

    const mockDraft: StudioDraftAction = {
      id: "draft_01",
      type: "PRICE_CHANGE",
      title: "اقتراح تعديل السعر",
      entityId: "prod_001",
      entityName: "تيشيرت رياضي كلاسيك",
      currentValue: 350,
      proposedValue: 390,
      reason: "زيادة الهامش بنسبة 5%",
      status: "DRAFT",
    };

    render(
      <InventoryActionCanvas
        selectedProduct={mockProduct}
        activeDraft={mockDraft}
        onDraftResolved={onDraftResolved}
        onProductUpdated={onProductUpdated}
      />
    );

    expect(screen.getByText("اقتراح تعديل السعر")).toBeInTheDocument();
    expect(screen.getByText("زيادة الهامش بنسبة 5%")).toBeInTheDocument();
    expect(screen.getByText("390")).toBeInTheDocument();

    const applyButton = screen.getByRole("button", { name: /اعتماد وتطبيق الإجراء/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText("تم تطبيق التعديل بنجاح")).toBeInTheDocument();
      expect(onProductUpdated).toHaveBeenCalledWith({ price: 390 });
    });
  });

  it("triggers quick strategy actions when clicked", () => {
    const onRequestAction = vi.fn();

    render(
      <InventoryActionCanvas
        selectedProduct={mockProduct}
        activeDraft={null}
        onRequestAction={onRequestAction}
      />
    );

    const priceReviewBtn = screen.getByText("مراجعة الهامش والتسعير");
    fireEvent.click(priceReviewBtn);

    expect(onRequestAction).toHaveBeenCalledWith(
      expect.stringContaining('افحص هامش الربح لمنتج "تيشيرت رياضي كلاسيك"')
    );
  });
});
