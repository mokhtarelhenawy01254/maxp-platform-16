import React from "react";
import { render, screen } from "@testing-library/react";
import OrderItemsCard from "../components/OrderItemsCard";
import { OrderItem } from "../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: "EGP",
    formatPrice: (amount: number) => `EGP ${amount}`,
    isLoading: false,
    error: null,
  }),
}));

jest.mock("../../../utils/validation", () => ({
  validatePrice: () => ({ isValid: true }),
  validateQuantity: () => ({ isValid: true }),
}));

jest.mock("../components/DeleteItemConfirmModal", () => () => null);

describe("OrderItemsCard", () => {
  it("shows persisted variant details and product image from order item fields", () => {
    const items = [
      {
        id: "item-1",
        productId: "product-1",
        productName: "Pleated Chiffon Gown",
        productColor: "Emerald",
        productSize: "S",
        productImage: {
          url: "https://example.com/products/pleated-chiffon-gown.jpg",
        },
        price: 450,
        quantity: 1,
        total: 450,
        metadata: {
          image: {
            url: "https://example.com/products/pleated-chiffon-gown.jpg",
          },
        },
      },
    ] as unknown as OrderItem[];

    render(
      <OrderItemsCard
        isEditing={false}
        items={items}
        currency="EGP"
        totals={{ subtotal: 450, shipping: 0, tax: 0, total: 450 }}
        onAddItem={jest.fn()}
        onItemChange={jest.fn()}
        onRemoveItem={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("img", { name: "Pleated Chiffon Gown" }),
    ).toHaveAttribute(
      "src",
      "https://example.com/products/pleated-chiffon-gown.jpg",
    );
    expect(screen.getByText(/Emerald/)).toBeInTheDocument();
    expect(screen.getByText(/S/)).toBeInTheDocument();
  });

  it("does not repeat the same variant label as both color and size", () => {
    const items = [
      {
        id: "item-2",
        productId: "product-2",
        productName: "Platform Sneakers",
        productColor: "ابيض x جملي",
        productSize: "ابيض x جملي",
        price: 499,
        quantity: 1,
        total: 499,
        metadata: {},
      },
    ] as unknown as OrderItem[];

    const { container } = render(
      <OrderItemsCard
        isEditing={false}
        items={items}
        currency="EGP"
        totals={{ subtotal: 499, shipping: 0, tax: 0, total: 499 }}
        onAddItem={jest.fn()}
        onItemChange={jest.fn()}
        onRemoveItem={jest.fn()}
      />,
    );

    const matchingBadges = Array.from(container.querySelectorAll("span")).filter(
      (node) => node.textContent?.includes("ابيض x جملي"),
    );

    expect(matchingBadges).toHaveLength(1);
  });

  it("groups quantity offer items into a single bundle summary in read-only mode", () => {
    const items = [
      {
        id: "item-qo-1",
        productId: "shoe-1",
        productName: "Platform Sneakers",
        productColor: "أبيض",
        productSize: "40",
        price: 305,
        quantity: 1,
        total: 305,
        metadata: {
          quantityOffer: {
            groupId: "offer-group-1",
            offerLabel: "اشتري القطعتين بدل 800",
            offerQuantity: 2,
            slotIndex: 1,
            freeShipping: true,
          },
        },
      },
      {
        id: "item-qo-2",
        productId: "shoe-1",
        productName: "Platform Sneakers",
        productColor: "أسود",
        productSize: "41",
        price: 305,
        quantity: 1,
        total: 305,
        metadata: {
          quantityOffer: {
            groupId: "offer-group-1",
            offerLabel: "اشتري القطعتين بدل 800",
            offerQuantity: 2,
            slotIndex: 2,
            freeShipping: true,
          },
        },
      },
    ] as unknown as OrderItem[];

    render(
      <OrderItemsCard
        isEditing={false}
        items={items}
        currency="EGP"
        totals={{ subtotal: 610, shipping: 0, tax: 0, total: 610 }}
        onAddItem={jest.fn()}
        onItemChange={jest.fn()}
        onRemoveItem={jest.fn()}
      />,
    );

    expect(screen.getByText("اشتري القطعتين بدل 800")).toBeInTheDocument();
    expect(screen.getByText("2/2 قطع مختارة")).toBeInTheDocument();
    expect(screen.getByText("القطعة 1")).toBeInTheDocument();
    expect(screen.getByText("القطعة 2")).toBeInTheDocument();
    expect(screen.getByText("شحن مجاني")).toBeInTheDocument();
    expect(screen.getByText(/إجمالي العرض:/)).toBeInTheDocument();
    expect(screen.getAllByText("EGP 610").length).toBeGreaterThan(0);
  });
});
