import React from "react";
import { render, screen } from "@testing-library/react";
import FinancialSquare from "../FinancialSquare";
import DashboardSkeleton from "../DashboardSkeleton";
import DashboardEmptyState from "../DashboardEmptyState";
import DashboardSurfaceCard from "../DashboardSurfaceCard";

jest.mock("../../../components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
}));

jest.mock("../../../components/ui/skeleton", () => ({
  Skeleton: ({ className }: any) => (
    <div className={className} data-testid="skeleton" />
  ),
}));

describe("FinancialSquare", () => {
  it("renders label and formatted value", () => {
    render(
      <FinancialSquare
        label="Revenue"
        formattedValue="12,000"
        isRtl={false}
      />,
    );
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("12,000")).toBeInTheDocument();
  });

  it("renders with RTL", () => {
    const { container } = render(
      <FinancialSquare
        label="الإيرادات"
        formattedValue="١٢٬٠٠٠"
        isRtl={true}
      />,
    );
    expect(screen.getByText("الإيرادات")).toBeInTheDocument();
    expect(screen.getByText("١٢٬٠٠٠")).toBeInTheDocument();
  });
});

describe("DashboardSkeleton", () => {
  it("renders skeleton placeholders", () => {
    const { container } = render(<DashboardSkeleton />);
    const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("DashboardEmptyState", () => {
  it("renders title and message", () => {
    render(
      <DashboardEmptyState title="No data" message="Nothing to show yet" />,
    );
    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(screen.getByText("Nothing to show yet")).toBeInTheDocument();
  });
});

describe("DashboardSurfaceCard", () => {
  it("renders children", () => {
    render(<DashboardSurfaceCard>Hello</DashboardSurfaceCard>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("applies bordered class when bordered prop is true", () => {
    const { container } = render(
      <DashboardSurfaceCard bordered>Content</DashboardSurfaceCard>,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("border");
  });
});
