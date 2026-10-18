import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { IncompleteOrdersFilterBar } from "./IncompleteOrdersFilterBar";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("IncompleteOrdersFilterBar", () => {
  const defaultProps = {
    searchInput: "",
    onSearchChange: jest.fn(),
    statusFilter: "active",
    onStatusFilterChange: jest.fn(),
    phoneFilter: "all" as const,
    onPhoneFilterChange: jest.fn(),
    sortValue: "recent" as const,
    onSortValueChange: jest.fn(),
    limit: 20,
    onLimitChange: jest.fn(),
    onRefresh: jest.fn(),
    activeCount: 15,
    lostCount: 3,
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders search input, status pills, phone filter, sort, and pagination limit", () => {
    const { getByRole, getByDisplayValue, getByText } = render(
      <IncompleteOrdersFilterBar {...defaultProps} />
    );

    expect(getByRole("textbox")).toBeInTheDocument();
    expect(getByText("(15)")).toBeInTheDocument();
    expect(getByText("(3)")).toBeInTheDocument();
    expect(getByDisplayValue("20")).toBeInTheDocument();
  });

  it("calls onSearchChange when typing in search input", () => {
    const { getByRole } = render(
      <IncompleteOrdersFilterBar {...defaultProps} />
    );

    const input = getByRole("textbox");
    fireEvent.change(input, { target: { value: "0100" } });
    expect(defaultProps.onSearchChange).toHaveBeenCalledWith("0100");
  });

  it("switches status filter between active and lost", () => {
    const { getByText } = render(
      <IncompleteOrdersFilterBar {...defaultProps} />
    );

    const lostButton = getByText("orders.incompleteStatusLost");
    fireEvent.click(lostButton);
    expect(defaultProps.onStatusFilterChange).toHaveBeenCalledWith("lost");
  });

  it("handles phone filter selection change", () => {
    const { container } = render(
      <IncompleteOrdersFilterBar {...defaultProps} />
    );

    const select = container.querySelector("#incomplete-orders-phone") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "with_phone" } });
    expect(defaultProps.onPhoneFilterChange).toHaveBeenCalledWith("with_phone");
  });

  it("handles limit selection change", () => {
    const { container } = render(
      <IncompleteOrdersFilterBar {...defaultProps} />
    );

    const select = container.querySelector("#incomplete-orders-per-page") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "50" } });
    expect(defaultProps.onLimitChange).toHaveBeenCalledWith(50);
  });

  it("triggers onRefresh when refresh button is clicked", () => {
    const { getByTitle } = render(
      <IncompleteOrdersFilterBar {...defaultProps} />
    );

    const refreshBtn = getByTitle("orders.incompleteRetry");
    fireEvent.click(refreshBtn);
    expect(defaultProps.onRefresh).toHaveBeenCalledTimes(1);
  });
});
