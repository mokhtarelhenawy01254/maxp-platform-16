import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import ProductsFilters, { FiltersState } from "../ProductsFilters";

const initialFilters: FiltersState = {
  searchQuery: "",
  categoryFilter: "all",
  statusFilter: "all",
  stockFilter: "all",
  offersOnly: "",
  priceMin: "",
  priceMax: "",
  dateFrom: "",
  dateTo: "",
  tagsFilter: "",
};

describe("ProductsFilters", () => {
  it("renders quantity offers quick chip with count", () => {
    const onFilterChange = jest.fn();

    render(
      <ProductsFilters
        filters={initialFilters}
        categories={["Electronics", "Apparel"]}
        allTags={["sale", "featured"]}
        offersCount={5}
        showAdvancedFilters={false}
        onFilterChange={onFilterChange}
        onToggleAdvancedFilters={jest.fn()}
        onResetAdvancedFilters={jest.fn()}
      />,
    );

    const chip = screen.getByRole("button", { name: /عروض الكميات \(5\)/i });
    expect(chip).toBeInTheDocument();

    fireEvent.click(chip);
    expect(onFilterChange).toHaveBeenCalledWith("offersOnly", "true");
  });

  it("toggles offersOnly off when already active", () => {
    const onFilterChange = jest.fn();

    render(
      <ProductsFilters
        filters={{ ...initialFilters, offersOnly: "true" }}
        categories={[]}
        allTags={[]}
        offersCount={3}
        showAdvancedFilters={false}
        onFilterChange={onFilterChange}
        onToggleAdvancedFilters={jest.fn()}
        onResetAdvancedFilters={jest.fn()}
      />,
    );

    const chip = screen.getByRole("button", { name: /عروض الكميات \(3\)/i });
    fireEvent.click(chip);
    expect(onFilterChange).toHaveBeenCalledWith("offersOnly", "");
  });

  it("resets offersOnly when clicking All chip", () => {
    const onFilterChange = jest.fn();

    render(
      <ProductsFilters
        filters={{ ...initialFilters, offersOnly: "true" }}
        categories={[]}
        allTags={[]}
        offersCount={2}
        showAdvancedFilters={false}
        onFilterChange={onFilterChange}
        onToggleAdvancedFilters={jest.fn()}
        onResetAdvancedFilters={jest.fn()}
      />,
    );

    const allChip = screen.getByRole("button", { name: /^الكل$/i });
    fireEvent.click(allChip);
    expect(onFilterChange).toHaveBeenCalledWith("statusFilter", "all");
    expect(onFilterChange).toHaveBeenCalledWith("stockFilter", "all");
    expect(onFilterChange).toHaveBeenCalledWith("offersOnly", "");
  });
});
