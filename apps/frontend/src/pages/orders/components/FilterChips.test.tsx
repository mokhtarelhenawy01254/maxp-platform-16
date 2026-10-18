import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FilterChips } from "./FilterChips";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue || key,
  }),
}));

describe("FilterChips Suite", () => {
  const baseFilters = {
    status: [],
    paymentStatus: [],
    sourceType: [],
    merchantId: [],
    affiliateId: [],
    fulfillmentSource: [],
    merchantOperationStatus: [],
    merchantSettlementStatus: [],
    extractionMethod: "",
    minConfidence: "",
    onlyUnseen: false,
    timeRange: "",
    startDate: "",
    endDate: "",
    search: "",
  };

  it("returns null when no filters are active", () => {
    const { container } = render(
      <FilterChips
        filters={baseFilters}
        onFilterChange={jest.fn()}
        onClearAdvancedFilters={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders active chips with count and calls remove handler when X is clicked", () => {
    const onFilterChange = jest.fn();
    const onClearAdvancedFilters = jest.fn();

    render(
      <FilterChips
        filters={{
          ...baseFilters,
          status: ["DELIVERED"],
          search: "Cairo",
        }}
        filterableOrderStatuses={[{ code: "DELIVERED", name: "تم التوصيل" }]}
        onFilterChange={onFilterChange}
        onClearAdvancedFilters={onClearAdvancedFilters}
      />
    );

    // Active filter badge
    expect(screen.getByText("فلاتر نشطة")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    // Delivered status chip
    expect(screen.getByText("تم التوصيل")).toBeInTheDocument();
    // Search chip
    expect(screen.getByText("Cairo")).toBeInTheDocument();

    // Click remove on search chip
    const removeButtons = screen.getAllByRole("button");
    fireEvent.click(removeButtons[1]); // search remove button
    expect(onFilterChange).toHaveBeenCalledWith("search", "");

    // Clear all button should be visible with >1 chips
    const clearAllBtn = screen.getByText("مسح الكل");
    expect(clearAllBtn).toBeInTheDocument();
    fireEvent.click(clearAllBtn);
    expect(onClearAdvancedFilters).toHaveBeenCalled();
  });
});
