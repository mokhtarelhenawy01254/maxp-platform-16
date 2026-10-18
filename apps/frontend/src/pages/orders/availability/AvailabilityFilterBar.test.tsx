import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { AvailabilityFilterBar } from "./AvailabilityFilterBar";

describe("AvailabilityFilterBar", () => {
  const defaultProps = {
    search: "",
    setSearch: jest.fn(),
    categoryFilter: "all",
    setCategoryFilter: jest.fn(),
    preOrderFilter: "all",
    setPreOrderFilter: jest.fn(),
    trackFilter: "all",
    setTrackFilter: jest.fn(),
    stockFilter: "all",
    setStockFilter: jest.fn(),
    categories: ["Men", "Women", "Shoes"],
    onResetPage: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders search input with placeholder and category trigger", () => {
    const { getByPlaceholderText, getByText } = render(
      <AvailabilityFilterBar {...defaultProps} />
    );

    expect(getByPlaceholderText("بحث باسم المنتج أو SKU...")).toBeInTheDocument();
    expect(getByText("كل الأقسام")).toBeInTheDocument();
  });

  it("handles search input change and calls onResetPage", () => {
    const { getByPlaceholderText } = render(
      <AvailabilityFilterBar {...defaultProps} />
    );

    const input = getByPlaceholderText("بحث باسم المنتج أو SKU...");
    fireEvent.change(input, { target: { value: "T-Shirt" } });

    expect(defaultProps.setSearch).toHaveBeenCalledWith("T-Shirt");
    expect(defaultProps.onResetPage).toHaveBeenCalledTimes(1);
  });

  it("displays active category when not 'all'", () => {
    const { getByText } = render(
      <AvailabilityFilterBar {...defaultProps} categoryFilter="Shoes" />
    );

    expect(getByText("Shoes")).toBeInTheDocument();
  });

  it("displays active pre-order filter text", () => {
    const { getByText } = render(
      <AvailabilityFilterBar {...defaultProps} preOrderFilter="on" />
    );

    expect(getByText("طلب مسبق: مفعل")).toBeInTheDocument();
  });
});
