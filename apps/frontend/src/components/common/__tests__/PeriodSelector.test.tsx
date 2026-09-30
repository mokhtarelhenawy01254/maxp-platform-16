import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PeriodSelector, {
  computePeriodRange,
  getPeriodLabel,
  formatPeriodDisplay,
} from "../PeriodSelector";

// Mock i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const translations: Record<string, string> = {
        "periodSelector.today": "اليوم",
        "periodSelector.yesterday": "أمس",
        "periodSelector.last7Days": "آخر 7 أيام",
        "periodSelector.last30Days": "آخر 30 يوم",
        "periodSelector.last90Days": "آخر 90 يوم",
        "periodSelector.last6Months": "آخر 6 شهور",
        "periodSelector.lastYear": "آخر سنة",
        "periodSelector.custom": "فترة مخصصة",
        "periodSelector.from": "من",
        "periodSelector.to": "إلى",
        "periodSelector.selectBothDatesPrompt": "يرجى تحديد تاريخ البداية وتاريخ النهاية",
        "periodSelector.selectBothDatesWarning": "يرجى اختيار التاريخين معاً لتطبيق الفلتر",
        "periodSelector.startDateAfterEndDate": "تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية",
        "periodSelector.appliedPeriod": "الفترة المطبقة",
      };
      return translations[key] || fallback || key;
    },
  }),
}));

describe("PeriodSelector", () => {
  it("defaults to '30' when initialPeriod is omitted for backwards compatibility", () => {
    const handleRangeChange = jest.fn();
    render(<PeriodSelector onRangeChange={handleRangeChange} />);

    expect(handleRangeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        period: "30",
        startDate: expect.any(String),
        endDate: expect.any(String),
      }),
    );
  });

  it("respects initialPeriod='today' and highlights the today button", () => {
    const handleRangeChange = jest.fn();
    render(
      <PeriodSelector initialPeriod="today" onRangeChange={handleRangeChange} />,
    );

    expect(handleRangeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        period: "today",
      }),
    );
    const todayBtn = screen.getByRole("button", { name: "اليوم" });
    expect(todayBtn.className).toContain("bg-blue-600");
  });

  it("notifies preset change when a preset button is clicked", () => {
    const handleRangeChange = jest.fn();
    render(
      <PeriodSelector initialPeriod="today" onRangeChange={handleRangeChange} />,
    );

    const sevenDaysBtn = screen.getByRole("button", { name: "آخر 7 أيام" });
    fireEvent.click(sevenDaysBtn);

    expect(handleRangeChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        period: "7",
      }),
    );
  });

  it("does not call onRangeChange when only one custom date is entered, and displays warning", () => {
    const handleRangeChange = jest.fn();
    render(
      <PeriodSelector initialPeriod="today" onRangeChange={handleRangeChange} />,
    );
    handleRangeChange.mockClear();

    // Click custom period button
    const customBtn = screen.getByRole("button", { name: "فترة مخصصة" });
    fireEvent.click(customBtn);

    // Initial custom without dates shows prompt and doesn't call API
    expect(screen.getByRole("alert")).toHaveTextContent(
      "يرجى تحديد تاريخ البداية وتاريخ النهاية",
    );
    expect(handleRangeChange).not.toHaveBeenCalled();

    // Set only start date
    const startInput = screen.getByLabelText("من");
    fireEvent.change(startInput, { target: { value: "2026-09-01" } });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "يرجى اختيار التاريخين معاً لتطبيق الفلتر",
    );
    expect(handleRangeChange).not.toHaveBeenCalled();
  });

  it("shows error and prevents onRangeChange when startDate > endDate", () => {
    const handleRangeChange = jest.fn();
    render(
      <PeriodSelector initialPeriod="today" onRangeChange={handleRangeChange} />,
    );
    handleRangeChange.mockClear();

    const customBtn = screen.getByRole("button", { name: "فترة مخصصة" });
    fireEvent.click(customBtn);

    const startInput = screen.getByLabelText("من");
    const endInput = screen.getByLabelText("إلى");

    // Inverted range
    fireEvent.change(startInput, { target: { value: "2026-09-20" } });
    fireEvent.change(endInput, { target: { value: "2026-09-10" } });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية",
    );
    expect(handleRangeChange).not.toHaveBeenCalled();
  });

  it("calls onRangeChange when valid custom dates (start <= end) are entered", () => {
    const handleRangeChange = jest.fn();
    render(
      <PeriodSelector initialPeriod="today" onRangeChange={handleRangeChange} />,
    );
    handleRangeChange.mockClear();

    const customBtn = screen.getByRole("button", { name: "فترة مخصصة" });
    fireEvent.click(customBtn);

    const startInput = screen.getByLabelText("من");
    const endInput = screen.getByLabelText("إلى");

    fireEvent.change(startInput, { target: { value: "2026-09-01" } });
    fireEvent.change(endInput, { target: { value: "2026-09-15" } });

    // Warning alert is gone
    expect(screen.queryByRole("alert")).toBeNull();
    expect(handleRangeChange).toHaveBeenCalledWith({
      period: "custom",
      startDate: "2026-09-01",
      endDate: "2026-09-15",
    });
  });

  it("switches back from custom to preset cleanly", () => {
    const handleRangeChange = jest.fn();
    render(
      <PeriodSelector initialPeriod="today" onRangeChange={handleRangeChange} />,
    );

    const customBtn = screen.getByRole("button", { name: "فترة مخصصة" });
    fireEvent.click(customBtn);

    const todayBtn = screen.getByRole("button", { name: "اليوم" });
    fireEvent.click(todayBtn);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(handleRangeChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        period: "today",
      }),
    );
  });

  it("helpers computePeriodRange, getPeriodLabel, formatPeriodDisplay work accurately", () => {
    const todayRange = computePeriodRange("today");
    expect(todayRange.startDate).toBe(todayRange.endDate);

    const fakeT = (k: string, f?: string) => f || k;
    expect(getPeriodLabel("today", fakeT)).toBe("اليوم");
    expect(getPeriodLabel("custom", fakeT)).toBe("فترة مخصصة");

    const formattedSingle = formatPeriodDisplay(
      { period: "today", startDate: "2026-09-30", endDate: "2026-09-30" },
      fakeT,
    );
    expect(formattedSingle.label).toBe("اليوم");
    expect(formattedSingle.dateRangeText).toBe("2026-09-30");

    const formattedRange = formatPeriodDisplay(
      { period: "custom", startDate: "2026-09-01", endDate: "2026-09-15" },
      fakeT,
    );
    expect(formattedRange.label).toBe("فترة مخصصة");
    expect(formattedRange.dateRangeText).toBe("2026-09-01 → 2026-09-15");
  });
});
