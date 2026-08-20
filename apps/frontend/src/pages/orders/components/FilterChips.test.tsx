import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterChips } from "./FilterChips";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const baseFilters = {
  status: [] as string[],
  paymentStatus: [] as string[],
  sourceType: [] as string[],
  merchantId: [] as string[],
  affiliateId: [] as string[],
  fulfillmentSource: [] as string[],
  merchantOperationStatus: [] as string[],
  merchantSettlementStatus: [] as string[],
  extractionMethod: "",
  minConfidence: "",
  onlyUnseen: false,
  timeRange: "",
  startDate: "",
  endDate: "",
  search: "",
};

describe("FilterChips", () => {
  it("renders one chip per selected status", () => {
    render(
      <FilterChips
        filters={{ ...baseFilters, status: ["pending", "shipped"] }}
        filterableOrderStatuses={[
          { code: "PENDING", name: "┘é┘è╪» ╪º┘ä╪º┘å╪¬╪╕╪º╪▒" },
          { code: "SHIPPED", name: "╪¬┘à ╪º┘ä╪┤╪¡┘å" },
        ]}
        onFilterChange={jest.fn()}
        onClearAdvancedFilters={jest.fn()}
      />,
    );

    expect(screen.getAllByText("┘é┘è╪» ╪º┘ä╪º┘å╪¬╪╕╪º╪▒").length).toBeGreaterThan(0);
    expect(screen.getAllByText("╪¬┘à ╪º┘ä╪┤╪¡┘å").length).toBeGreaterThan(0);
  });

  it("removes a single status without clearing the others", () => {
    const onFilterChange = jest.fn();
    render(
      <FilterChips
        filters={{ ...baseFilters, status: ["pending", "shipped"] }}
        filterableOrderStatuses={[
          { code: "PENDING", name: "┘é┘è╪» ╪º┘ä╪º┘å╪¬╪╕╪º╪▒" },
          { code: "SHIPPED", name: "╪¬┘à ╪º┘ä╪┤╪¡┘å" },
        ]}
        onFilterChange={onFilterChange}
        onClearAdvancedFilters={jest.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(onFilterChange).toHaveBeenCalledWith("status", ["shipped"]);
  });

  it("renders one chip per payment status and removes only the clicked one", () => {
    const onFilterChange = jest.fn();
    render(
      <FilterChips
        filters={{ ...baseFilters, paymentStatus: ["completed", "failed"] }}
        filterablePaymentStatuses={[
          { code: "COMPLETED", name: "┘à╪»┘ü┘ê╪╣" },
          { code: "FAILED", name: "┘ü╪┤┘ä ╪º┘ä╪»┘ü╪╣" },
        ]}
        onFilterChange={onFilterChange}
        onClearAdvancedFilters={jest.fn()}
      />,
    );

    expect(screen.getAllByText("┘à╪»┘ü┘ê╪╣").length).toBeGreaterThan(0);
    expect(screen.getAllByText("┘ü╪┤┘ä ╪º┘ä╪»┘ü╪╣").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(onFilterChange).toHaveBeenCalledWith("paymentStatus", ["failed"]);
  });

  it("renders one chip per merchant operation status", () => {
    render(
      <FilterChips
        filters={{ ...baseFilters, merchantOperationStatus: ["PREPARATION", "DELIVERED"] }}
        onFilterChange={jest.fn()}
        onClearAdvancedFilters={jest.fn()}
      />,
    );

    expect(screen.getAllByText("orders.preparation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("orders.delivered").length).toBeGreaterThan(0);
  });
});
