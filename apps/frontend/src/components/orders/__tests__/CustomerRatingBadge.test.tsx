import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CustomerRatingBadge from "../CustomerRatingBadge";

describe("CustomerRatingBadge - 2026 Customer Health Score Standards", () => {
  it("renders 8px dot indicator for orders table with single-line tooltip when variant is dot", () => {
    const { container } = render(
      <CustomerRatingBadge
        rating="EXCELLENT"
        deliveryRate={92.5}
        totalDelivered={10}
        totalAttempts={11}
        variant="dot"
        interactive={false}
      />
    );

    // Should render dot indicator with accessible title
    const dot = container.querySelector(".rounded-full");
    expect(dot).toBeInTheDocument();
    expect(dot?.parentElement).toHaveAttribute(
      "title",
      expect.stringContaining("تقييم العميل: عميل ممتاز (نسبة الاستلام: 93%) — 10 من 11 طلب")
    );

    // Verify there are NO popovers or recalculate buttons
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders modern numeric health score pill badge (Screenshot 2 design) by default", () => {
    render(
      <CustomerRatingBadge
        rating="GOOD"
        deliveryRate={80}
        totalDelivered={4}
        totalAttempts={5}
        variant="badge"
        interactive={false}
      />
    );

    // Renders continuous health score with 1 decimal place (e.g. 7.5)
    expect(screen.getByText("7.5")).toBeInTheDocument();
  });

  it("renders legacy chip when legacyChip prop is true", () => {
    render(
      <CustomerRatingBadge
        rating="GOOD"
        deliveryRate={80}
        totalDelivered={4}
        totalAttempts={5}
        legacyChip={true}
        interactive={false}
      />
    );

    expect(screen.getByText("جيد")).toBeInTheDocument();
    expect(screen.getByText("(80%)")).toBeInTheDocument();
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

    // Zero manual override buttons in detailed view
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("displays neutral trust score (7.5) for new customers with 0 completed orders", () => {
    render(
      <CustomerRatingBadge
        rating="UNKNOWN"
        deliveryRate={0}
        totalDelivered={0}
        totalAttempts={0}
        variant="badge"
        interactive={false}
      />
    );

    // Renders neutral baseline 7.5
    expect(screen.getByText("7.5")).toBeInTheDocument();
  });

  it("renders interactive badge button and allows editing customer rating in popover", () => {
    const handleRatingChange = jest.fn();

    render(
      <CustomerRatingBadge
        rating="AVERAGE"
        deliveryRate={65}
        totalDelivered={3}
        totalAttempts={5}
        variant="badge"
        size="sm"
        interactive={true}
        onRatingChange={handleRatingChange}
      />
    );

    // Badge button should be clickable
    const trigger = screen.getByRole("button", { name: /تقييم العميل/i });
    expect(trigger).toBeInTheDocument();

    // Open popover menu
    fireEvent.click(trigger);

    // Health Score modal header and telemetry should be displayed
    expect(screen.getByText("مؤشر صحة العميل")).toBeInTheDocument();
    expect(screen.getByText("HEALTH SCORE")).toBeInTheDocument();
    expect(screen.getByText("ممتاز")).toBeInTheDocument();
    expect(screen.getByText("جيد")).toBeInTheDocument();

    // Select excellent
    const excellentOption = screen.getByText("ممتاز");
    fireEvent.click(excellentOption);

    expect(handleRatingChange).toHaveBeenCalledWith("EXCELLENT");
  });

  it("renders recalculate option when orderNumber is provided", () => {
    render(
      <CustomerRatingBadge
        rating="POOR"
        orderNumber="ORD-1001"
        interactive={true}
        variant="badge"
      />
    );

    const trigger = screen.getByRole("button", { name: /تقييم العميل/i });
    fireEvent.click(trigger);

    expect(screen.getByText(/إعادة احتساب آلي/i)).toBeInTheDocument();
  });
});
