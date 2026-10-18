import { useState, useEffect, useCallback } from "react";
import {
  PREPARATION_TABLE_COLUMNS,
  PREPARATION_FILTER_SECTIONS,
  VISIBLE_COLUMNS_STORAGE_KEY,
  type PreparationTableColumn,
  type PreparationFilterSection,
} from "./constants";

export const PREPARATION_VISIBLE_FILTERS_STORAGE_KEY = "preparation:queue:visible-filters-v1";
export const PREPARATION_SHOW_FILTERS_STORAGE_KEY = "preparation:queue:show-filters-v1";

export function usePreparationPreferences() {
  const [visibleColumns, setVisibleColumns] = useState<PreparationTableColumn[]>(() => {
    if (typeof window === "undefined") return [...PREPARATION_TABLE_COLUMNS];
    try {
      const raw = window.localStorage.getItem(VISIBLE_COLUMNS_STORAGE_KEY);
      if (!raw) return [...PREPARATION_TABLE_COLUMNS];
      const parsed = JSON.parse(raw);
      if (
        Array.isArray(parsed) &&
        parsed.every((c: string) => PREPARATION_TABLE_COLUMNS.includes(c as PreparationTableColumn))
      ) {
        return parsed as PreparationTableColumn[];
      }
    } catch {
      // ignore storage errors
    }
    return [...PREPARATION_TABLE_COLUMNS];
  });

  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);

  const toggleColumn = useCallback((col: PreparationTableColumn) => {
    setVisibleColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    );
  }, []);

  const [visibleFilterSections, setVisibleFilterSections] = useState<PreparationFilterSection[]>(() => {
    const defaults = [...PREPARATION_FILTER_SECTIONS];
    if (typeof window === "undefined") return defaults;
    try {
      const raw = window.localStorage.getItem(PREPARATION_VISIBLE_FILTERS_STORAGE_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const stored = parsed.filter((s): s is PreparationFilterSection =>
          PREPARATION_FILTER_SECTIONS.includes(s as PreparationFilterSection),
        );
        return [...new Set([...defaults, ...stored])];
      }
    } catch {
      // ignore storage errors
    }
    return defaults;
  });

  const [showFilters, setShowFilters] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const raw = window.localStorage.getItem(PREPARATION_SHOW_FILTERS_STORAGE_KEY);
      if (raw === null) return true;
      return JSON.parse(raw) === true;
    } catch {
      return true;
    }
  });

  const toggleFilterSection = useCallback((section: PreparationFilterSection) => {
    setVisibleFilterSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section],
    );
  }, []);

  // Sync preferences to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
        window.localStorage.setItem(PREPARATION_VISIBLE_FILTERS_STORAGE_KEY, JSON.stringify(visibleFilterSections));
        window.localStorage.setItem(PREPARATION_SHOW_FILTERS_STORAGE_KEY, JSON.stringify(showFilters));
      } catch {
        // ignore storage errors
      }
    }
  }, [visibleColumns, visibleFilterSections, showFilters]);

  // Click outside listener for column settings dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (columnSettingsOpen && !target.closest("[data-column-settings]")) {
        setColumnSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [columnSettingsOpen]);

  return {
    visibleColumns,
    setVisibleColumns,
    toggleColumn,
    columnSettingsOpen,
    setColumnSettingsOpen,
    visibleFilterSections,
    setVisibleFilterSections,
    toggleFilterSection,
    showFilters,
    setShowFilters,
  };
}
