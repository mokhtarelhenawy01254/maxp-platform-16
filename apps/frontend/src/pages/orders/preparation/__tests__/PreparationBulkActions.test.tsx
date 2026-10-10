import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PreparationBulkActions from "../components/PreparationBulkActions";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options?.count !== undefined ? `${key}_${options.count}` : key,
  }),
}));

describe("PreparationBulkActions Component", () => {
  const defaultProps = {
    selectedOrdersCount: 3,
    bulkStatus: "",
    statusOptions: [
      { code: "IN_PREPARATION", fallbackName: "تجهيز" },
      { code: "PREPARED", fallbackName: "تم التجهيز" },
    ],
    statusLabelMap: new Map([
      ["IN_PREPARATION", "تجهيز"],
      ["PREPARED", "تم التجهيز"],
    ]),
    bulkUpdating: false,
    preparationEnabled: true,
    bulkStatusUpdateEnabled: true,
    allVisibleSelected: false,
    totalVisibleOrders: 10,
    sendingToTurbo: false,
    printingInvoices: false,
    onBulkStatusChange: jest.fn(),
    onApply: jest.fn(),
    onApplyToAll: jest.fn(),
    onClear: jest.fn(),
    onSelectAll: jest.fn(),
    onClearSelection: jest.fn(),
    onSendToTurbo: jest.fn(),
    onSendToShipping: jest.fn(),
    onPrintInvoices: jest.fn(),
  };

  it("renders selection count with tabular-nums", () => {
    render(<PreparationBulkActions {...defaultProps} />);
    expect(screen.getAllByText(/preparation\.bulkActions\.selected_3/i).length).toBeGreaterThan(0);
  });

  it("triggers onSelectAll when select-all button is clicked", () => {
    render(<PreparationBulkActions {...defaultProps} />);
    const selectAllBtns = screen.getAllByText("preparation.bulkActions.selectAll");
    fireEvent.click(selectAllBtns[0]);
    expect(defaultProps.onSelectAll).toHaveBeenCalled();
  });

  it("triggers onClearSelection when clear-selection button is clicked", () => {
    render(<PreparationBulkActions {...defaultProps} />);
    const clearBtns = screen.getAllByText("preparation.bulkActions.clearSelection");
    fireEvent.click(clearBtns[0]);
    expect(defaultProps.onClearSelection).toHaveBeenCalled();
  });

  it("handles status select change", () => {
    render(<PreparationBulkActions {...defaultProps} />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "IN_PREPARATION" } });
    expect(defaultProps.onBulkStatusChange).toHaveBeenCalledWith("IN_PREPARATION");
  });
});
