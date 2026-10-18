import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmationQueueFilterBar } from "./ConfirmationQueueFilterBar";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

describe("ConfirmationQueueFilterBar", () => {
  const defaultProps = {
    searchInput: "",
    setSearchInput: jest.fn(),
    statusFilter: "",
    setStatusFilter: jest.fn(),
    sourceFilter: "",
    setSourceFilter: jest.fn(),
    onlyUnassigned: false,
    setOnlyUnassigned: jest.fn(),
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
    onOpenMobileFilters: jest.fn(),
    setPage: jest.fn(),
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
    const setSearchInput = jest.fn();
    render(<ConfirmationQueueFilterBar {...defaultProps} setSearchInput={setSearchInput} />);

    const input = screen.getByPlaceholderText(/بحث باسم العميل، الهاتف، أو رقم الطلب/i);
    fireEvent.change(input, { target: { value: "ORD-999" } });

    expect(setSearchInput).toHaveBeenCalledWith("ORD-999");
  });

  it("triggers onOpenMobileFilters on mobile button click", () => {
    const onOpenMobileFilters = jest.fn();
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
