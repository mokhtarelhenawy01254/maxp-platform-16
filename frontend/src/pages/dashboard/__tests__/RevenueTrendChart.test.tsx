import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "@jest/globals";
import RevenueTrendChart from "../RevenueTrendChart";

const defaultProps = {
  title: "Revenue Trend",
  revenueLabel: "Revenue",
  ordersLabel: "Orders",
  emptyLabel: "No revenue data for the selected period",
  formatRevenue: (v: number) => `$${v.toFixed(2)}`,
};

describe("RevenueTrendChart", () => {
  it("renders empty state when data is empty", () => {
    render(<RevenueTrendChart {...defaultProps} data={[]} />);
    expect(
      screen.getByText("No revenue data for the selected period")
    ).toBeInTheDocument();
  });

  it("renders empty state when data is null", () => {
    render(<RevenueTrendChart {...defaultProps} data={null as unknown as []} />);
    expect(
      screen.getByText("No revenue data for the selected period")
    ).toBeInTheDocument();
  });

  it("renders the title", () => {
    render(
      <RevenueTrendChart
        {...defaultProps}
        data={[{ date: "2024-01-01", revenue: 1000 }]}
      />
    );
    expect(screen.getByText("Revenue Trend")).toBeInTheDocument();
  });

  it("renders chart with revenue data", () => {
    render(
      <RevenueTrendChart
        {...defaultProps}
        data={[
          { date: "2024-01-01", revenue: 1000 },
          { date: "2024-01-02", revenue: 1500 },
        ]}
      />
    );
    expect(screen.getByText("Revenue Trend")).toBeInTheDocument();
  });

  it("renders chart with orders data when present", () => {
    render(
      <RevenueTrendChart
        {...defaultProps}
        data={[
          { date: "2024-01-01", revenue: 1000, orders: 10 },
          { date: "2024-01-02", revenue: 1500, orders: 12 },
        ]}
      />
    );
    expect(screen.getByText("Revenue Trend")).toBeInTheDocument();
  });
});
