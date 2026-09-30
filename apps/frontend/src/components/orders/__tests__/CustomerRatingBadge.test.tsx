import React from "react";
import { render, screen } from "@testing-library/react";
import CustomerRatingBadge from "../CustomerRatingBadge";

describe("CustomerRatingBadge - 2026 Ergonomic Automated Rating Standards", () => {
  it("renders 8px dot indicator for orders table with single-line tooltip, no popover, no buttons", () => {
    const { container } = render(
      <CustomerRatingBadge
        rating="EXCELLENT"
        deliveryRate={92.5}
        totalDelivered={10}
        totalAttempts={11}
        variant="dot"
      />
    );

    // Should render dot indicator with accessible title
    const dot = container.querySelector(".rounded-full");
    expect(dot).toBeInTheDocument();
    expect(dot?.parentElement).toHaveAttribute(
      "title",
      expect.stringContaining("تقييم العميل: عميل ممتاز (نسبة الاستلام: 93%) — 10 من 11 طلب")
    );

    // Verify there are NO popovers, explanations, or recalculate buttons
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/إعادة احتساب/i)).not.toBeInTheDocument();
  });

  it("renders compact badge chip with label and percentage for customer header", () => {
    render(
      <CustomerRatingBadge
        rating="GOOD"
        deliveryRate={80}
        totalDelivered={4}
        totalAttempts={5}
        variant="badge"
      />
    );

    expect(screen.getByText("جيد")).toBeInTheDocument();
    expect(screen.getByText("(80%)")).toBeInTheDocument();
    expect(screen.queryByText(/إعادة احتساب/i)).not.toBeInTheDocument();
  });

  it("renders detailed telemetry card for customer details page without any manual buttons", () => {
    render(
      <CustomerRatingBadge
        rating="AVERAGE"
        deliveryRate={60}
        totalDelivered={3}
        totalAttempts={5}
        variant="detailed"
      />
    );

    expect(screen.getByText("تصنيف العميل الآلي")).toBeInTheDocument();
    expect(screen.getByText("عميل متوسط")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("3 من 5 طلب مكتمل")).toBeInTheDocument();

    // Zero manual override or recalculate buttons
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/إعادة احتساب/i)).not.toBeInTheDocument();
  });

  it("displays UNKNOWN for new customers with 0 completed orders", () => {
    render(
      <CustomerRatingBadge
        rating="UNKNOWN"
        deliveryRate={0}
        totalDelivered={0}
        totalAttempts={0}
        variant="badge"
      />
    );

    expect(screen.getByText("جديد")).toBeInTheDocument();
  });
});
