// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ConfirmationQueueFilterBar } from "./ConfirmationQueueFilterBar";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

afterEach(() => {
  cleanup();
});

describe("ConfirmationQueueFilterBar", () => {
  const defaultProps = {
    searchInput: "",
    setSearchInput: vi.fn(),
    statusFilter: "",
    setStatusFilter: vi.fn(),
    sourceFilter: "",
    setSourceFilter: vi.fn(),
    onlyUnassigned: false,
    setOnlyUnassigned: vi.fn(),
    statusOptions: [
      { value: "", label: "كل الحالات" },
      { value: "pending", label: "قيد الانتظار" },
      { value: "confirmed", label: "مؤكد" },
    ],
    sourceOptions: [
      { value: "", label: "كل المصادر" },
      { value: "storefront", label: "المتجر" },
    ],
    activeQueueFilterCount: 0,
    statusFilterLabel: "كل الحالات",
    sourceFilterLabel: "كل المصادر",
    onOpenMobileFilters: vi.fn(),
    setPage: vi.fn(),
  };

  it("renders search bar and filter controls cleanly", () => {
    render(<ConfirmationQueueFilterBar {...defaultProps} />);

    expect(
      screen.getByPlaceholderText(/بحث باسم العميل، الهاتف، أو رقم الطلب/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText("كل الحالات").length).toBeGreaterThan(0);
    expect(screen.getAllByText("كل المصادر").length).toBeGreaterThan(0);
    expect(screen.getByText("غير مخصص")).toBeInTheDocument();
  });

  it("calls setSearchInput when typing in search field", () => {
    const setSearchInput = vi.fn();
    render(<ConfirmationQueueFilterBar {...defaultProps} setSearchInput={setSearchInput} />);

    const input = screen.getByPlaceholderText(/بحث باسم العميل، الهاتف، أو رقم الطلب/i);
    fireEvent.change(input, { target: { value: "ORD-999" } });

    expect(setSearchInput).toHaveBeenCalledWith("ORD-999");
  });

  it("triggers onOpenMobileFilters on mobile button click", () => {
    const onOpenMobileFilters = vi.fn();
    render(
      <ConfirmationQueueFilterBar
        {...defaultProps}
        onOpenMobileFilters={onOpenMobileFilters}
        activeQueueFilterCount={2}
      />,
    );

    const mobileBtn = screen.getByText("تصفية الفلاتر").closest("button");
    expect(mobileBtn).toBeInTheDocument();
    fireEvent.click(mobileBtn!);

    expect(onOpenMobileFilters).toHaveBeenCalledTimes(1);
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
