import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { OrdersLogisticsPerformance } from "./OrdersLogisticsPerformance";

describe("OrdersLogisticsPerformance Suite", () => {
  const baseProps = {
    loading: false,
    shippingList: [
      {
        name: "بوسطة",
        totalOrders: 150,
        deliveredOrders: 120,
        deliveryRate: 80,
        returnedOrders: 15,
        inTransitOrders: 15,
        codCollected: 45000,
        avgDeliveryDays: 2.5,
      },
    ],
    branchList: [
      {
        name: "مستودع القاهرة",
        totalOrders: 200,
        dispatchedOrders: 180,
        deliveredOrders: 160,
        deliveryRate: 88,
        pendingDispatch: 20,
      },
    ],
    statusDist: {
      DELIVERED: 120,
      PENDING: 30,
    },
    statusPieces: {
      DELIVERED: 240,
      PENDING: 60,
    },
    totalOrders: 150,
    paymentStats: {
      COD: 110,
      INSTAPAY: 40,
    },
    codOrdersCount: 110,
    codDeliveredRevenue: 38000,
    codCollectionRate: 85,
    formatPrice: (amount: number) => `${amount} ج.م`,
    onFilterStatus: jest.fn(),
    translate: (k: string) => k,
  };

  it("renders 3 columns with status lifecycle, logistics carriers, and payment methods", () => {
    render(<OrdersLogisticsPerformance {...baseProps} />);

    expect(screen.getByText("دورة حياة الحالات والقطع")).toBeInTheDocument();
    expect(screen.getByText("كفاءة الشحن والتوزيع")).toBeInTheDocument();
    expect(screen.getByText("طرق الدفع والتسوية")).toBeInTheDocument();

    // Carrier name
    expect(screen.getByText("بوسطة")).toBeInTheDocument();
    // Payment method
    expect(screen.getAllByText("الدفع عند الاستلام (COD)")[0]).toBeInTheDocument();
  });

  it("switches to branch warehouses view when clicked", () => {
    render(<OrdersLogisticsPerformance {...baseProps} />);

    const branchBtn = screen.getByText("مستودعات التجهيز");
    fireEvent.click(branchBtn);

    expect(screen.getByText("مستودع القاهرة")).toBeInTheDocument();
  });

  it("triggers onFilterStatus when a status row is clicked", () => {
    const onFilterStatus = jest.fn();
    render(<OrdersLogisticsPerformance {...baseProps} onFilterStatus={onFilterStatus} />);

    const statusRows = screen.getAllByTitle("انقر لتصفية هذه الحالة");
    // Row 0 is PENDING, Row 1 is DELIVERED
    fireEvent.click(statusRows[0]);
    expect(onFilterStatus).toHaveBeenCalledWith("PENDING");

    fireEvent.click(statusRows[1]);
    expect(onFilterStatus).toHaveBeenCalledWith("DELIVERED");
  });
});
