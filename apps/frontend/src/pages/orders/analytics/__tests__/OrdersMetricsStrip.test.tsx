// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { OrdersMetricsStrip } from "../OrdersMetricsStrip";

afterEach(() => {
  cleanup();
});

describe("OrdersMetricsStrip", () => {
  const defaultProps = {
    loading: false,
    totalOrders: 1000,
    totalRevenue: 500000,
    totalPieces: 2500,
    deliveredOrders: 600,
    deliveredPct: 60,
    deliveredPieces: 1500,
    inTransitOrders: 150,
    inTransitPct: 15,
    inTransitPieces: 350,
    warehouseOrders: 100,
    warehousePct: 10,
    warehousePieces: 250,
    unprocessedOrders: 50,
    unprocessedPct: 5,
    unprocessedPieces: 120,
    cancelledOrders: 70,
    cancelledPct: 7,
    cancelledPieces: 180,
    returnedOrders: 30,
    returnedPct: 3,
    returnedPieces: 100,
    formatPrice: (amount: number) => `${amount} EGP`,
    onFilterStatus: vi.fn(),
  };

  it("renders north star metrics and total figures cleanly", () => {
    render(<OrdersMetricsStrip {...defaultProps} />);

    expect(screen.getByText("إجمالي الطلبات المسجلة")).toBeInTheDocument();
    expect(screen.getByText("1,000")).toBeInTheDocument();
    expect(screen.getByText("500000 EGP")).toBeInTheDocument();
    expect(screen.getByText("2,500")).toBeInTheDocument();
  });

  it("renders all 6 operational funnel stage cards", () => {
    render(<OrdersMetricsStrip {...defaultProps} />);

    expect(screen.getByText("تم التسليم")).toBeInTheDocument();
    expect(screen.getByText("معلق بالشحن")).toBeInTheDocument();
    expect(screen.getByText("معلق بالمخزن")).toBeInTheDocument();
    expect(screen.getByText("معلق هنا (جديد)")).toBeInTheDocument();
    expect(screen.getByText("ملغي")).toBeInTheDocument();
    expect(screen.getByText("مرتجع")).toBeInTheDocument();
  });

  it("calls onFilterStatus with DELIVERED when delivered card is clicked", () => {
    render(<OrdersMetricsStrip {...defaultProps} />);

    const deliveredCard = screen.getByText("تم التسليم").closest("div");
    if (deliveredCard) {
      fireEvent.click(deliveredCard);
    }
    expect(defaultProps.onFilterStatus).toHaveBeenCalledWith("DELIVERED");
  });

  it("calls onFilterStatus with SHIPPED when in transit card is clicked", () => {
    render(<OrdersMetricsStrip {...defaultProps} />);

    const shippedCard = screen.getByText("معلق بالشحن").closest("div");
    if (shippedCard) {
      fireEvent.click(shippedCard);
    }
    expect(defaultProps.onFilterStatus).toHaveBeenCalledWith("SHIPPED");
  });
});
