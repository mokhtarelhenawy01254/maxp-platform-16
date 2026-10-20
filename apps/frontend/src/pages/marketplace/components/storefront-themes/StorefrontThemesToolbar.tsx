import React from "react";
import { Search, X, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ThemeFilterType,
  ThemeCategoryGroup,
  THEME_FILTER_TYPES,
} from "../../types/storefrontThemesTypes";

interface StorefrontThemesToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  filterType: ThemeFilterType;
  onFilterTypeChange: (val: ThemeFilterType) => void;
  displayCategoryGroups: ThemeCategoryGroup[];
  selectedPrimaryCategoryId: string;
  onPrimaryCategorySelect: (id: string) => void;
  onRemoveCategory: (id: string) => void;
  addingCategory: boolean;
  onStartAddCategory: () => void;
  onCancelAddCategory: () => void;
  newCategoryName: string;
  onNewCategoryNameChange: (val: string) => void;
  onConfirmAddCategory: () => void;
  t: (key: string, opts?: any) => string;
}

export const StorefrontThemesToolbar: React.FC<StorefrontThemesToolbarProps> = ({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  displayCategoryGroups,
  selectedPrimaryCategoryId,
  onPrimaryCategorySelect,
  onRemoveCategory,
  addingCategory,
  onStartAddCategory,
  onCancelAddCategory,
  newCategoryName,
  onNewCategoryNameChange,
  onConfirmAddCategory,
  t,
}) => {
  return (
    <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("storefrontThemes.searchPlaceholder")}
            className="w-full h-9 pl-4 pr-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full pb-1 sm:pb-0">
          {THEME_FILTER_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => onFilterTypeChange(type)}
              className={cn(
                "px-3 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap shrink-0",
                filterType === type
                  ? "bg-indigo-700 border-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                  : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-indigo-500/50"
              )}
            >
              {t("storefrontThemes.filter" + type.charAt(0).toUpperCase() + type.slice(1))}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-w-0">
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2 lg:pb-0 touch-pan-x">
          <div className="flex items-center gap-1 whitespace-nowrap">
            <button
              onClick={() => onPrimaryCategorySelect("all")}
              className={cn(
                "px-3 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                selectedPrimaryCategoryId === "all"
                  ? "text-indigo-700 bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300"
                  : "text-slate-500 dark:text-slate-400 hover:text-indigo-500"
              )}
            >
              {t("storefrontThemes.allDomains")}
            </button>

            {displayCategoryGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => onPrimaryCategorySelect(group.id)}
                className={cn(
                  "px-3 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  selectedPrimaryCategoryId === group.id
                    ? "text-indigo-700 bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300"
                    : "text-slate-500 dark:text-slate-400 hover:text-indigo-500"
                )}
              >
                {group.label}
                {group.count > 0 && (
                  <span className="text-[9px] px-1 py-0.5 rounded-md border border-current font-mono">
                    {group.count}
                  </span>
                )}
                {group.id.startsWith("custom-") && (
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={t("storefrontThemes.removeCategory", {
                      name: group.label,
                    })}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveCategory(group.id);
                    }}
                    className="flex items-center justify-center size-4 rounded-full bg-slate-200/70 dark:bg-slate-700/70 text-slate-500 dark:text-slate-300 hover:bg-red-100 dark:hover:bg-red-500/30 hover:text-red-500 transition-colors"
                  >
                    <X className="size-2.5" />
                  </span>
                )}
              </button>
            ))}

            {addingCategory ? (
              <span className="inline-flex items-center gap-1.5 h-8 pr-1">
                <input
                  autoFocus
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => onNewCategoryNameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onConfirmAddCategory();
                    if (e.key === "Escape") onCancelAddCategory();
                  }}
                  placeholder={t("storefrontThemes.newCategoryPlaceholder")}
                  className="h-8 w-36 rounded-lg border border-indigo-400 bg-white dark:bg-slate-950 px-2.5 text-[11px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={onConfirmAddCategory}
                  aria-label={t("storefrontThemes.confirmAddCategory")}
                  className="flex items-center justify-center size-7 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  <Check className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onCancelAddCategory}
                  aria-label={t("storefrontThemes.cancelAddCategory")}
                  className="flex items-center justify-center size-7 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={onStartAddCategory}
                aria-label={t("storefrontThemes.addCategory")}
                className="flex items-center gap-1 h-8 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-500/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
              >
                <Plus className="size-3.5" />
                {t("storefrontThemes.addCategory")}
              </button>
            )}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white dark:from-slate-950 to-transparent lg:hidden" />
      </div>
    </div>
  );
};
