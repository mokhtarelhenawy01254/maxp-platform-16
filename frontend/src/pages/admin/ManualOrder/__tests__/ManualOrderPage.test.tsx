import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ManualOrderPage from "../ManualOrderPage";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("react-hot-toast", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: { role: "OWNER" },
  }),
}));

jest.mock("../components/CheckoutColumn", () => () => (
  <div data-testid="checkout-column">checkout</div>
));

jest.mock("../components/ProductSearchColumn", () => ({
  __esModule: true,
  default: ({
    onAddToCart,
  }: {
    onAddToCart: (product: any, variant?: any) => void;
  }) => (
    <button
      onClick={() =>
        onAddToCart(
          {
            id: "product-1",
            name: "Luna Knot",
            price: 399,
            image: "https://example.com/luna.jpg",
            stock: 10,
            sku: "LUNA-KNOT",
            baseMarkup: 0,
          },
          {
            id: "variant-1",
            sku: "LUNA-KNOT-38",
            price: 399,
            stock: 10,
            name: "Luna Knot Variant",
            attributeValues: {
              اللون: "أوف وايت",
              المقاس: "38",
            },
          },
        )
      }
    >
      add variant
    </button>
  ),
}));

describe("ManualOrderPage", () => {
  it("renders the compact manual-order workflow controls", () => {
    render(<ManualOrderPage />);

    expect(screen.getByText("manualOrder.title")).toBeInTheDocument();
    expect(screen.getByText("manualOrder.productsStep")).toBeInTheDocument();
    expect(screen.getByText("manualOrder.cartStep")).toBeInTheDocument();
    expect(screen.getByText("manualOrder.checkoutStep")).toBeInTheDocument();
  });

  it("shows color and size in the cart when variant attributes come from attributeValues", () => {
    render(<ManualOrderPage />);

    fireEvent.click(screen.getByRole("button", { name: "add variant" }));

    expect(screen.getByText("Luna Knot")).toBeInTheDocument();
    expect(screen.getByText("اللون: أوف وايت")).toBeInTheDocument();
    expect(screen.getByText("المقاس: 38")).toBeInTheDocument();
  });

  it("renders the mobile workflow controls", () => {
    render(<ManualOrderPage />);

    expect(screen.getByRole("button", { name: /manualOrder.productsStep/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manualOrder.cartStep/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manualOrder.checkoutStep/ })).toBeInTheDocument();
  });
});
