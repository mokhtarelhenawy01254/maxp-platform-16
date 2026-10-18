import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BulkOrdersFilterBar } from "./BulkOrdersFilterBar";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

describe("BulkOrdersFilterBar", () => {
  const defaultProps = {
    search: "",
    setSearch: jest.fn(),
    statusFilter: "",
    setStatusFilter: jest.fn(),
    dateFrom: "2026-10-01",
    setDateFrom: jest.fn(),
    dateTo: "2026-10-18",
    setDateTo: jest.fn(),
    statusOptions: ["PENDING", "COMPLETED", "FAILED"],
  };

  it("renders search input, status options and date pickers", () => {
    render(<BulkOrdersFilterBar {...defaultProps} />);

    expect(screen.getByPlaceholderText(/بحث برقم العملية أو الاسم/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByLabelText(/من تاريخ/i)).toHaveValue("2026-10-01");
    expect(screen.getByLabelText(/إلى تاريخ/i)).toHaveValue("2026-10-18");
  });

  it("calls setSearch when typing in search input", () => {
    const setSearch = jest.fn();
    render(<BulkOrdersFilterBar {...defaultProps} setSearch={setSearch} />);

    const input = screen.getByPlaceholderText(/بحث برقم العملية أو الاسم/i);
    fireEvent.change(input, { target: { value: "BATCH-10" } });

    expect(setSearch).toHaveBeenCalledWith("BATCH-10");
  });

  it("calls setStatusFilter when selecting a new status", () => {
    const setStatusFilter = jest.fn();
    render(<BulkOrdersFilterBar {...defaultProps} setStatusFilter={setStatusFilter} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "COMPLETED" } });

    expect(setStatusFilter).toHaveBeenCalledWith("COMPLETED");
  });
});
