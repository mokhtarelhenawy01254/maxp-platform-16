import { renderHook, act } from "@testing-library/react";
import { usePreparationPreferences } from "./usePreparationPreferences";
import {
  PREPARATION_TABLE_COLUMNS,
  PREPARATION_FILTER_SECTIONS,
  VISIBLE_COLUMNS_STORAGE_KEY,
} from "./constants";

describe("usePreparationPreferences", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes with default table columns and filter sections", () => {
    const { result } = renderHook(() => usePreparationPreferences());

    expect(result.current.visibleColumns).toEqual(PREPARATION_TABLE_COLUMNS);
    expect(result.current.visibleFilterSections).toEqual(PREPARATION_FILTER_SECTIONS);
    expect(result.current.showFilters).toBe(true);
    expect(result.current.columnSettingsOpen).toBe(false);
  });

  it("toggles table columns correctly", () => {
    const { result } = renderHook(() => usePreparationPreferences());

    const targetColumn = PREPARATION_TABLE_COLUMNS[0];
    act(() => {
      result.current.toggleColumn(targetColumn);
    });

    expect(result.current.visibleColumns).not.toContain(targetColumn);

    act(() => {
      result.current.toggleColumn(targetColumn);
    });

    expect(result.current.visibleColumns).toContain(targetColumn);
  });

  it("toggles filter sections correctly", () => {
    const { result } = renderHook(() => usePreparationPreferences());

    const targetSection = PREPARATION_FILTER_SECTIONS[0];
    act(() => {
      result.current.toggleFilterSection(targetSection);
    });

    expect(result.current.visibleFilterSections).not.toContain(targetSection);

    act(() => {
      result.current.toggleFilterSection(targetSection);
    });

    expect(result.current.visibleFilterSections).toContain(targetSection);
  });

  it("toggles showFilters state", () => {
    const { result } = renderHook(() => usePreparationPreferences());

    act(() => {
      result.current.setShowFilters(false);
    });

    expect(result.current.showFilters).toBe(false);
  });

  it("syncs updated values to window.localStorage", () => {
    const { result } = renderHook(() => usePreparationPreferences());

    act(() => {
      result.current.setShowFilters(false);
    });

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "preparation:queue:show-filters-v1",
      JSON.stringify(false),
    );
  });
});
