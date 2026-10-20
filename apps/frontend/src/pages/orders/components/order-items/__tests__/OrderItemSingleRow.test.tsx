// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { OrderItemSingleRow } from "../OrderItemSingleRow";
import { OrderItemVariantBadges } from "../OrderItemVariantBadges";
import { OrderItemPriceQtyFields } from "../OrderItemPriceQtyFields";
import type { OrderItem } from "../../types";

vi.mock("../../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (p: number) => `${p} EGP`,
  }),
}));

afterEach(() => {
  cleanup();
});

const mockItem: OrderItem = {
  id: "item-1",
  productId: "prod-1",
  productName: "قميص قطني أبيض",
  productSku: "SHIRT-WHT-L",
  productColor: "أبيض",
  productSize: "L",
  price: 250,
  quantity: 2,
};

describe("OrderItemVariantBadges", () => {
  it("renders color and size badges in view mode", () => {
    render(
      <OrderItemVariantBadges
        item={mockItem}
        itemMetadata={{}}
        index={0}
        isEditing={false}
        onItemChange={vi.fn()}
      />,
    );

    expect(screen.getByText("اللون: أبيض")).toBeInTheDocument();
    expect(screen.getByText("المقاس: L")).toBeInTheDocument();
  });

  it("renders editable inputs in edit mode and triggers onItemChange", () => {
    const onItemChange = vi.fn();
    render(
      <OrderItemVariantBadges
        item={mockItem}
        itemMetadata={{}}
        index={0}
        isEditing={true}
        onItemChange={onItemChange}
      />,
    );

    const colorInput = screen.getByPlaceholderText("اللون...");
    fireEvent.change(colorInput, { target: { value: "أسود" } });
    expect(onItemChange).toHaveBeenCalledWith(0, "productColor", "أسود");

    const sizeInput = screen.getByPlaceholderText("المقاس...");
    fireEvent.change(sizeInput, { target: { value: "XL" } });
    expect(onItemChange).toHaveBeenCalledWith(0, "productSize", "XL");
  });
});

describe("OrderItemPriceQtyFields", () => {
  it("renders formatted price, quantity and total in view mode", () => {
    render(
      <OrderItemPriceQtyFields
        item={mockItem}
        index={0}
        isEditing={false}
        validationErrors={{}}
        handlePriceChange={vi.fn()}
        handleQuantityChange={vi.fn()}
        incrementQuantity={vi.fn()}
        decrementQuantity={vi.fn()}
        formatPrice={(p) => `${p} EGP`}
      />,
    );

    expect(screen.getByText("250 EGP")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("500 EGP")).toBeInTheDocument();
  });

  it("handles increment and decrement clicks in edit mode", () => {
    const incrementQuantity = vi.fn();
    const decrementQuantity = vi.fn();

    render(
      <OrderItemPriceQtyFields
        item={mockItem}
        index={0}
        isEditing={true}
        validationErrors={{}}
        handlePriceChange={vi.fn()}
        handleQuantityChange={vi.fn()}
        incrementQuantity={incrementQuantity}
        decrementQuantity={decrementQuantity}
        formatPrice={(p) => `${p} EGP`}
      />,
    );

    const buttons = screen.getAllByRole("button");
    const decrementBtn = buttons[0];
    const incrementBtn = buttons[1];

    fireEvent.click(decrementBtn);
    expect(decrementQuantity).toHaveBeenCalledWith(0, 2);

    fireEvent.click(incrementBtn);
    expect(incrementQuantity).toHaveBeenCalledWith(0, 2);
  });
});

describe("OrderItemSingleRow", () => {
  it("renders item name, SKU and calculated total cleanly", () => {
    render(
      <OrderItemSingleRow
        item={mockItem}
        index={0}
        isEditing={false}
        openMenuIndex={null}
        setOpenMenuIndex={vi.fn()}
        validationErrors={{}}
        onItemChange={vi.fn()}
        handlePriceChange={vi.fn()}
        handleQuantityChange={vi.fn()}
        incrementQuantity={vi.fn()}
        decrementQuantity={vi.fn()}
        handleDeleteClick={vi.fn()}
      />,
    );

    expect(screen.getByText("قميص قطني أبيض")).toBeInTheDocument();
    expect(screen.getByText("SHIRT-WHT-L")).toBeInTheDocument();
    expect(screen.getByText(/٥٠٠|500/)).toBeInTheDocument();
  });
});
