import React from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, Settings2 } from "lucide-react";
import {
  PREPARATION_COLUMN_LABEL_KEYS,
  PREPARATION_FILTER_SECTION_LABEL_KEYS,
  PREPARATION_FILTER_SECTIONS,
  PREPARATION_TABLE_COLUMNS,
} from "../constants";
import type { PreparationTableColumn } from "../types";
import type { PreparationFilterSection } from "../constants";

export interface PreparationColumnSettingsDropdownProps {
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  columnSettingsOpen: boolean;
  setColumnSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  visibleColumns: PreparationTableColumn[];
  toggleColumn: (col: PreparationTableColumn) => void;
  visibleFilterSections: PreparationFilterSection[];
  toggleFilterSection: (section: PreparationFilterSection) => void;
}

export const PreparationColumnSettingsDropdown: React.FC<PreparationColumnSettingsDropdownProps> = ({
  showFilters,
  setShowFilters,
  columnSettingsOpen,
  setColumnSettingsOpen,
  visibleColumns,
  toggleColumn,
  visibleFilterSections,
  toggleFilterSection,
}) => {
  const { t } = useTranslation();

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowFilters((prev) => !prev)}
          className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition active:scale-[0.98] cursor-pointer ${
            showFilters
              ? "border-transparent bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
              : "border-border/70 bg-card text-foreground hover:bg-muted"
          }`}
          title={showFilters ? t("preparation.hideFilters", { defaultValue: "إخفاء الفلاتر" }) : t("preparation.showFilters", { defaultValue: "إظهار الفلاتر" })}
          aria-label={showFilters ? t("preparation.hideFilters", { defaultValue: "إخفاء الفلاتر" }) : t("preparation.showFilters", { defaultValue: "إظهار الفلاتر" })}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {showFilters ? t("preparation.hideFilters", { defaultValue: "إخفاء الفلاتر" }) : t("preparation.showFilters", { defaultValue: "الفلاتر" })}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setColumnSettingsOpen((prev) => !prev)}
          className={`inline-flex items-center gap-1 rounded-xl border border-border/70 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted active:scale-[0.97] cursor-pointer ${
            columnSettingsOpen ? "ring-2 ring-primary/20 border-primary" : ""
          }`}
          title={t("preparation.table.columnSettings", { defaultValue: "إعدادات الأعمدة" })}
          aria-label={t("preparation.table.columnSettings", { defaultValue: "إعدادات الأعمدة" })}
          aria-expanded={columnSettingsOpen}
        >
          <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">
            {t("preparation.table.columnSettings", { defaultValue: "الأعمدة" })}
          </span>
        </button>
      </div>

      {columnSettingsOpen && (
        <div
          className="absolute start-0 top-full z-50 mt-1.5 w-52 rounded-2xl border border-border/70 bg-card p-1.5 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150"
          style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}
        >
          <div className="border-b border-border/50 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("preparation.table.visibleColumns", { defaultValue: "الأعمدة الظاهرة" })}
          </div>
          <div className="py-1 space-y-0.5">
            {PREPARATION_TABLE_COLUMNS.map((col) => (
              <label
                key={col}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition hover:bg-muted select-none"
              >
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(col)}
                  onChange={() => toggleColumn(col)}
                  className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                />
                <span className="truncate">{t(PREPARATION_COLUMN_LABEL_KEYS[col])}</span>
              </label>
            ))}
          </div>

          <div className="mt-1 border-t border-border/50 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("preparation.table.showHideFilters", { defaultValue: "أقسام شريط الفلاتر" })}
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition hover:bg-muted select-none">
            <input
              type="checkbox"
              checked={showFilters}
              onChange={() => setShowFilters((prev) => !prev)}
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
            />
            <span className="font-semibold">{t("preparation.table.showFilterBar", { defaultValue: "شريط الفلاتر بالكامل" })}</span>
          </label>
          <div className="space-y-0.5">
            {PREPARATION_FILTER_SECTIONS.map((section) => (
              <label
                key={section}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition select-none ${
                  showFilters ? "text-foreground hover:bg-muted" : "text-muted-foreground/40 pointer-events-none"
                }`}
              >
                <input
                  type="checkbox"
                  checked={showFilters && visibleFilterSections.includes(section)}
                  onChange={() => toggleFilterSection(section)}
                  disabled={!showFilters}
                  className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                />
                <span className="truncate">{t(PREPARATION_FILTER_SECTION_LABEL_KEYS[section])}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PreparationColumnSettingsDropdown;
