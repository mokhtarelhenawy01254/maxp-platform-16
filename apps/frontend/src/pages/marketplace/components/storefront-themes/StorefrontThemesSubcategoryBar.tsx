import React from "react";
import { cn } from "@/lib/utils";
import { ThemeCategoryGroup } from "../../types/storefrontThemesTypes";

interface StorefrontThemesSubcategoryBarProps {
  selectedPrimaryCategory: ThemeCategoryGroup | null;
  selectedSecondaryCategoryId: string;
  onPrimaryCategorySelect: (id: string) => void;
  onSecondaryCategorySelect: (primaryId: string, subId: string) => void;
  t: (key: string) => string;
}

export const StorefrontThemesSubcategoryBar: React.FC<StorefrontThemesSubcategoryBarProps> = ({
  selectedPrimaryCategory,
  selectedSecondaryCategoryId,
  onPrimaryCategorySelect,
  onSecondaryCategorySelect,
  t,
}) => {
  if (!selectedPrimaryCategory) return null;

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2 flex items-center gap-4 overflow-x-auto no-scrollbar touch-pan-x">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
        {t("storefrontThemes.subMatrix")}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPrimaryCategorySelect(selectedPrimaryCategory.id)}
          className={cn(
            "px-3 h-7 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
            selectedSecondaryCategoryId === "all"
              ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          {t("storefrontThemes.allPrefix")} {selectedPrimaryCategory.label}
        </button>
        {selectedPrimaryCategory.subcategories.map((sub) => (
          <button
            key={sub.id}
            onClick={() =>
              onSecondaryCategorySelect(selectedPrimaryCategory.id, sub.id)
            }
            className={cn(
              "px-3 h-7 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
              selectedSecondaryCategoryId === sub.id
                ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            {sub.label}{" "}
            <span className="font-mono tabular-nums">({sub.count})</span>
          </button>
        ))}
      </div>
    </div>
  );
};
