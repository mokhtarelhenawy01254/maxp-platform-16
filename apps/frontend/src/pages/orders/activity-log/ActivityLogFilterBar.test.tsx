import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActivityLogFilterBar, type ActorOption } from "./ActivityLogFilterBar";

describe("ActivityLogFilterBar", () => {
  const mockActors: ActorOption[] = [
    { id: "user-1", name: "أحمد علي" },
    { id: "user-2", name: "سارة محمد" },
  ];

  const defaultProps = {
    orderNumber: "",
    setOrderNumber: jest.fn(),
    onSearchSubmit: jest.fn((e) => e.preventDefault()),
    onClearOrderSearch: jest.fn(),
    selectedActorId: "",
    setSelectedActorId: jest.fn(),
    actors: mockActors,
    changeType: "ALL",
    setChangeType: jest.fn(),
    datePreset: "ALL" as const,
    setDatePreset: jest.fn(),
    isFilterActive: false,
    onResetFilters: jest.fn(),
  };

  it("renders search input, actors dropdown, change type, and date presets", () => {
    render(<ActivityLogFilterBar {...defaultProps} />);

    expect(screen.getByPlaceholderText(/ابحث برقم الطلب/i)).toBeInTheDocument();
    expect(screen.getByText("جميع الموظفين والأنظمة (2)")).toBeInTheDocument();
    expect(screen.getByText("جميع أنواع الحركات")).toBeInTheDocument();
    expect(screen.getByText("كل الأوقات")).toBeInTheDocument();
    expect(screen.getByText("اليوم")).toBeInTheDocument();
    expect(screen.getByText("7 أيام")).toBeInTheDocument();
    expect(screen.getByText("30 يوماً")).toBeInTheDocument();
  });

  it("calls setOrderNumber when typing in search input", () => {
    const setOrderNumber = jest.fn();
    render(<ActivityLogFilterBar {...defaultProps} setOrderNumber={setOrderNumber} />);

    const input = screen.getByPlaceholderText(/ابحث برقم الطلب/i);
    fireEvent.change(input, { target: { value: "ORD-500" } });

    expect(setOrderNumber).toHaveBeenCalledWith("ORD-500");
  });

  it("triggers date preset selection when clicking date buttons", () => {
    const setDatePreset = jest.fn();
    render(<ActivityLogFilterBar {...defaultProps} setDatePreset={setDatePreset} />);

    const todayBtn = screen.getByText("اليوم");
    fireEvent.click(todayBtn);

    expect(setDatePreset).toHaveBeenCalledWith("TODAY");
  });

  it("shows reset button when isFilterActive is true and calls onResetFilters", () => {
    const onResetFilters = jest.fn();
    render(
      <ActivityLogFilterBar
        {...defaultProps}
        isFilterActive={true}
        onResetFilters={onResetFilters}
      />,
    );

    const resetBtn = screen.getByText("إعادة ضبط");
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);

    expect(onResetFilters).toHaveBeenCalledTimes(1);
  });
});
