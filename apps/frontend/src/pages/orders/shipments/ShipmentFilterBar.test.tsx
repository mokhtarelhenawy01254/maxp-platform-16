import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShipmentFilterBar } from "./ShipmentFilterBar";

describe("ShipmentFilterBar", () => {
  const defaultProps = {
    localSearch: "",
    setLocalSearch: jest.fn(),
    localDateFrom: "2026-10-01",
    setLocalDateFrom: jest.fn(),
    localDateTo: "2026-10-18",
    setLocalDateTo: jest.fn(),
    onSubmit: jest.fn((e) => e.preventDefault()),
    onClearSearch: jest.fn(),
  };

  it("renders search input, date range pickers, and filter submit button", () => {
    render(<ShipmentFilterBar {...defaultProps} />);

    expect(
      screen.getByPlaceholderText(/ابحث برقم الطلب، كود البوليصة/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("من تاريخ")).toHaveValue("2026-10-01");
    expect(screen.getByLabelText("إلى تاريخ")).toHaveValue("2026-10-18");
    expect(screen.getByText("تصفية البيان")).toBeInTheDocument();
  });

  it("triggers setLocalSearch when typing and clears search when X button is clicked", () => {
    const setLocalSearch = jest.fn();
    const onClearSearch = jest.fn();

    const { rerender } = render(
      <ShipmentFilterBar
        {...defaultProps}
        localSearch=""
        setLocalSearch={setLocalSearch}
        onClearSearch={onClearSearch}
      />,
    );

    const input = screen.getByPlaceholderText(/ابحث برقم الطلب، كود البوليصة/i);
    fireEvent.change(input, { target: { value: "SHP-12345" } });
    expect(setLocalSearch).toHaveBeenCalledWith("SHP-12345");

    rerender(
      <ShipmentFilterBar
        {...defaultProps}
        localSearch="SHP-12345"
        setLocalSearch={setLocalSearch}
        onClearSearch={onClearSearch}
      />,
    );

    const clearBtn = screen.getByLabelText("مسح البحث");
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(onClearSearch).toHaveBeenCalledTimes(1);
  });

  it("submits the filter form when the submit button is clicked", () => {
    const onSubmit = jest.fn((e) => e.preventDefault());
    render(<ShipmentFilterBar {...defaultProps} onSubmit={onSubmit} />);

    const submitBtn = screen.getByRole("button", { name: /تصفية البيان/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalled();
  });
});
