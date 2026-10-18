import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PreparationSelectionBar } from "./PreparationSelectionBar";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

describe("PreparationSelectionBar Component", () => {
  const defaultProps = {
    allVisibleSelected: false,
    toggleSelectAllVisible: jest.fn(),
    totalVisibleOrders: 42,
    inventoryLoading: false,
    loading: false,
    showFilters: true,
    setShowFilters: jest.fn(),
    columnSettingsOpen: false,
    setColumnSettingsOpen: jest.fn(),
    visibleColumns: [] as any[],
    toggleColumn: jest.fn(),
    visibleFilterSections: [] as any[],
    toggleFilterSection: jest.fn(),
    selectedOrdersCount: 0,
    bulkStatus: "",
    statusOptions: [],
    statusLabelMap: new Map(),
    bulkUpdating: false,
    onBulkStatusChange: jest.fn(),
    onApply: jest.fn(),
    onApplyToAll: jest.fn(),
    onClear: jest.fn(),
    onClearSelection: jest.fn(),
  };

  it("renders select all checkbox and total count", () => {
    render(<PreparationSelectionBar {...defaultProps} />);

    expect(screen.getByText("تحديد كل المعروض")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("calls toggleSelectAllVisible when checkbox is clicked", () => {
    const toggleSpy = jest.fn();
    render(
      <PreparationSelectionBar
        {...defaultProps}
        toggleSelectAllVisible={toggleSpy}
      />
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(toggleSpy).toHaveBeenCalledTimes(1);
  });

  it("shows inventory loading indicator when inventoryLoading is true", () => {
    render(
      <PreparationSelectionBar
        {...defaultProps}
        inventoryLoading={true}
      />
    );

    expect(screen.getByText("جاري فحص المخزون...")).toBeInTheDocument();
  });

  it("renders bulk actions container when selectedOrdersCount > 0", () => {
    render(
      <PreparationSelectionBar
        {...defaultProps}
        selectedOrdersCount={5}
        bulkStatus="PREPARING"
      />
    );

    expect(screen.getByText(/5/)).toBeInTheDocument();
  });
});
