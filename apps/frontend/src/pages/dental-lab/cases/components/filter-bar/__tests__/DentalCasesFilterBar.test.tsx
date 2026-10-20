// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { DentalCasesFilterBar } from "../../DentalCasesFilterBar";

// Mock child pills and dropdowns to keep tests focused on the filter bar and its subcomponents
vi.mock("../../DentalCasesQuickPills", () => ({
  DentalCasesQuickPills: () => <div data-testid="dental-cases-quick-pills" />,
}));

vi.mock("../../DentalCasesDropdowns", () => ({
  DentalCasesDropdowns: () => <div data-testid="dental-cases-dropdowns" />,
}));

describe("DentalCasesFilterBar (Batch 366)", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    total: 42,
    trashCount: 3,
    viewMode: "ACTIVE" as const,
    onViewModeChange: vi.fn(),
    layoutMode: "TABLE" as const,
    onLayoutModeChange: vi.fn(),
    searchInput: "",
    onSearchInputChange: vi.fn(),
    onClearSearch: vi.fn(),
    status: "",
    doctorId: "",
    workTypeId: "",
    priority: "",
    paymentStatus: "",
    technicianId: "",
    dateRangePreset: "",
    agendaDate: "",
    agendaField: "receivedDate" as const,
    activeFiltersCount: 0,
    doctors: [],
    workTypes: [],
    technicians: [],
    applyFilter: vi.fn(),
    clearAllFilters: vi.fn(),
    onRefresh: vi.fn(),
    onExportExcel: vi.fn(),
    onOpenKiosk: vi.fn(),
    onOpenQuickOrder: vi.fn(),
    setAgendaDate: vi.fn(),
    setAgendaField: vi.fn(),
    setDateRangePreset: vi.fn(),
    setPriority: vi.fn(),
    setStatus: vi.fn(),
    setTechnicianId: vi.fn(),
    setPage: vi.fn(),
  };

  it("renders title, total count, mode selector tabs, and action buttons", () => {
    render(<DentalCasesFilterBar {...defaultProps} />);

    expect(screen.getByText("حالات معمل الأسنان")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("النشطة")).toBeInTheDocument();
    expect(screen.getByText("المتأخرة")).toBeInTheDocument();
    expect(screen.getByText("سلة المهملات")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    expect(screen.getByPlaceholderText("بحث سريع (رقم الحالة، المريض، الطبيب)...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "طلب سريع" })).toBeInTheDocument();
  });

  it("triggers onViewModeChange and resets page when switching mode tabs", () => {
    const handleViewModeChange = vi.fn();
    const handleSetPage = vi.fn();

    render(
      <DentalCasesFilterBar
        {...defaultProps}
        onViewModeChange={handleViewModeChange}
        setPage={handleSetPage}
      />
    );

    fireEvent.click(screen.getByText("المتأخرة"));
    expect(handleViewModeChange).toHaveBeenCalledWith("OVERDUE");
    expect(handleSetPage).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByText("سلة المهملات"));
    expect(handleViewModeChange).toHaveBeenCalledWith("TRASH");
    expect(handleSetPage).toHaveBeenCalledWith(1);
  });

  it("handles search input typing and clear search button", () => {
    const handleSearch = vi.fn();
    const handleClear = vi.fn();
    const handleSetPage = vi.fn();

    const { rerender } = render(
      <DentalCasesFilterBar
        {...defaultProps}
        searchInput=""
        onSearchInputChange={handleSearch}
        onClearSearch={handleClear}
        setPage={handleSetPage}
      />
    );

    const input = screen.getByPlaceholderText("بحث سريع (رقم الحالة، المريض، الطبيب)...");
    fireEvent.change(input, { target: { value: "أحمد" } });

    expect(handleSearch).toHaveBeenCalledWith("أحمد");
    expect(handleSetPage).toHaveBeenCalledWith(1);

    // Rerender with search value to display clear button
    rerender(
      <DentalCasesFilterBar
        {...defaultProps}
        searchInput="أحمد"
        onSearchInputChange={handleSearch}
        onClearSearch={handleClear}
        setPage={handleSetPage}
      />
    );

    const clearBtn = screen.getByRole("button", { name: "مسح البحث" });
    fireEvent.click(clearBtn);
    expect(handleClear).toHaveBeenCalled();
  });

  it("triggers layout toggle between TABLE and KANBAN", () => {
    const handleLayoutChange = vi.fn();

    render(
      <DentalCasesFilterBar
        {...defaultProps}
        layoutMode="TABLE"
        onLayoutModeChange={handleLayoutChange}
      />
    );

    const kanbanBtn = screen.getByRole("button", { name: "عرض لوحة مراحل التشغيل" });
    fireEvent.click(kanbanBtn);
    expect(handleLayoutChange).toHaveBeenCalledWith("KANBAN");

    const tableBtn = screen.getByRole("button", { name: "عرض جدول الحالات" });
    fireEvent.click(tableBtn);
    expect(handleLayoutChange).toHaveBeenCalledWith("TABLE");
  });

  it("triggers action callbacks: kiosk, refresh, export excel, and quick order", () => {
    const handleOpenKiosk = vi.fn();
    const handleRefresh = vi.fn();
    const handleExportExcel = vi.fn();
    const handleOpenQuickOrder = vi.fn();

    render(
      <DentalCasesFilterBar
        {...defaultProps}
        onOpenKiosk={handleOpenKiosk}
        onRefresh={handleRefresh}
        onExportExcel={handleExportExcel}
        onOpenQuickOrder={handleOpenQuickOrder}
      />
    );

    fireEvent.click(screen.getByTitle("فتح محطة المسح السريع بالباركود"));
    expect(handleOpenKiosk).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "تحديث" }));
    expect(handleRefresh).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "تصدير Excel" }));
    expect(handleExportExcel).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "طلب سريع" }));
    expect(handleOpenQuickOrder).toHaveBeenCalled();
  });
});
