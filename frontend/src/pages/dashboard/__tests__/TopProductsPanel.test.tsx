import React from "react";
import { render, screen } from "@testing-library/react";
import TopProductsPanel from "../TopProductsPanel";

jest.mock("../../../components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
}));

describe("TopProductsPanel", () => {
  const formatCount = (v: number | null | undefined) =>
    v?.toLocaleString("en-US") ?? "";

  it("renders a list of products when items are provided", () => {
    const items = [
      { name: "Widget A", quantity: 42 },
      { name: "Widget B", quantity: 18 },
    ];

    render(
      <TopProductsPanel
        items={items}
        title="Top Sellers"
        emptyLabel="No products"
        itemsUnitLabel="units"
        formatCount={formatCount}
      />,
    );

    expect(screen.getByText("Top Sellers")).toBeInTheDocument();
    expect(screen.getByText("1. Widget A")).toBeInTheDocument();
    expect(screen.getByText("2. Widget B")).toBeInTheDocument();
    expect(screen.getByText("42 units")).toBeInTheDocument();
    expect(screen.getByText("18 units")).toBeInTheDocument();
  });

  it("shows empty label when items array is empty", () => {
    render(
      <TopProductsPanel
        items={[]}
        title="Top Sellers"
        emptyLabel="No products"
        itemsUnitLabel="units"
        formatCount={formatCount}
      />,
    );

    expect(screen.getByText("Top Sellers")).toBeInTheDocument();
    expect(screen.getByText("No products")).toBeInTheDocument();
  });
});
