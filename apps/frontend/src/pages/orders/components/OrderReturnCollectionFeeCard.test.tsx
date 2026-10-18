import React from "react";
import { render, screen } from "@testing-library/react";
import { OrderReturnCollectionFeeCard } from "./OrderReturnCollectionFeeCard";
import type { OrderDetailsType } from "../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) =>
      opts && opts.defaultValue ? opts.defaultValue : opts?.amount ? `${opts.amount} ج.م` : key,
  }),
}));

describe("OrderReturnCollectionFeeCard", () => {
  it("renders return fee with custom returnAmount from metadata", () => {
    const mockOrder: Partial<OrderDetailsType> = {
      metadata: JSON.stringify({ returnAmount: "45.00" }),
      shipping: "30",
    };

    render(<OrderReturnCollectionFeeCard order={mockOrder as OrderDetailsType} />);

    expect(screen.getByText("مبلغ تحصيل المرتجع")).toBeInTheDocument();
    expect(screen.getByText("45.00 ج.م")).toBeInTheDocument();
    expect(screen.getByText(/قيمة مخصصة للمرتجع/i)).toBeInTheDocument();
  });

  it("falls back to shipping cost when returnAmount is not present", () => {
    const mockOrder: Partial<OrderDetailsType> = {
      metadata: {},
      shipping: "50",
    };

    render(<OrderReturnCollectionFeeCard order={mockOrder as OrderDetailsType} />);

    expect(screen.getByText("50.00 ج.م")).toBeInTheDocument();
    expect(screen.getByText(/القيمة الافتراضية للشحن/i)).toBeInTheDocument();
  });

  it("returns null when displayAmount is 0", () => {
    const mockOrder: Partial<OrderDetailsType> = {
      metadata: {},
      shipping: "0",
      shippingCost: "0",
    };

    const { container } = render(
      <OrderReturnCollectionFeeCard order={mockOrder as OrderDetailsType} />
    );

    expect(container.firstChild).toBeNull();
  });
});
