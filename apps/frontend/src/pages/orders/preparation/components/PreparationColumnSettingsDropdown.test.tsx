import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PreparationColumnSettingsDropdown } from "./PreparationColumnSettingsDropdown";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

describe("PreparationColumnSettingsDropdown", () => {
  const defaultProps = {
    showFilters: true,
    setShowFilters: jest.fn(),
    columnSettingsOpen: false,
    setColumnSettingsOpen: jest.fn(),
    visibleColumns: ["orderNumber", "customer", "items"] as any[],
    toggleColumn: jest.fn(),
    visibleFilterSections: ["tabs", "search"] as any[],
    toggleFilterSection: jest.fn(),
  };

  it("renders trigger buttons and toggles filters", () => {
    const setShowFilters = jest.fn();
    render(
      <PreparationColumnSettingsDropdown
        {...defaultProps}
        setShowFilters={setShowFilters}
      />
    );

    const filterBtn = screen.getByTitle("إخفاء الفلاتر");
    fireEvent.click(filterBtn);
    expect(setShowFilters).toHaveBeenCalled();
  });

  it("renders columns and sections when columnSettingsOpen is true", () => {
    render(
      <PreparationColumnSettingsDropdown
        {...defaultProps}
        columnSettingsOpen={true}
      />
    );

    expect(screen.getByText("الأعمدة الظاهرة")).toBeInTheDocument();
    expect(screen.getByText("أقسام شريط الفلاتر")).toBeInTheDocument();
  });
});
