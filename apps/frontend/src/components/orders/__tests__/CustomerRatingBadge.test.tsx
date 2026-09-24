import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CustomerRatingBadge from "../CustomerRatingBadge";

// Mock apiClient
jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("CustomerRatingBadge - Automated Rating UI Guard", () => {
  it("renders automated rating badge with label and percentage without manual selection list", () => {
    render(
      <CustomerRatingBadge
        rating="EXCELLENT"
        deliveryRate={85.5}
        totalDelivered={6}
        totalAttempts={7}
        interactive={true}
      />
    );

    // Should display short label and percentage
    expect(screen.getByText("ممتاز")).toBeInTheDocument();
    expect(screen.getByText("(86%)")).toBeInTheDocument();

    // Verify there is NO manual selection radio/dropdown options initially
    expect(screen.queryByText("تعديل تقييم العميل")).not.toBeInTheDocument();
    expect(screen.queryByText("عميل ضعيف / مخاطرة")).not.toBeInTheDocument();
  });

  it("opens automated telemetry popover upon click with delivered stats and NO manual choice list", () => {
    render(
      <CustomerRatingBadge
        rating="GOOD"
        deliveryRate={75}
        totalDelivered={3}
        totalAttempts={4}
        interactive={true}
        orderNumber="ORD-101"
      />
    );

    const triggerButton = screen.getByRole("button", {
      name: /تقييم العميل الآلي/i,
    });
    fireEvent.click(triggerButton);

    // Popover header should indicate automated delivery rating
    expect(screen.getByText("تقييم استلام العميل الآلي")).toBeInTheDocument();
    expect(screen.getByText("عميل جيد")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("3 من 4 طلب منتهي")).toBeInTheDocument();

    // Verify NO manual selection options exist (the old bug where user can pick rating manually)
    expect(screen.queryByText("تعديل تقييم العميل")).not.toBeInTheDocument();

    // Verify automatic recalculate action exists
    expect(screen.getByText("إعادة احتساب التقييم آلياً")).toBeInTheDocument();
  });

  it("displays UNKNOWN for new customers with 0 completed orders", () => {
    render(
      <CustomerRatingBadge
        rating="UNKNOWN"
        deliveryRate={0}
        totalDelivered={0}
        totalAttempts={0}
        interactive={true}
      />
    );

    expect(screen.getByText("جديد")).toBeInTheDocument();
  });
});
