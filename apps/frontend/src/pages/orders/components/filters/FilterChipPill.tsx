import React from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { ChipTone, ChipDescriptor } from "./useFilterChipsList";

export interface FilterChipPillProps {
  chip: ChipDescriptor;
}

const toneClasses: Record<ChipTone, string> = {
  primary:
    "border-primary/25 bg-primary/10 text-primary hover:border-primary/40 hover:bg-primary/15",
  info: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:border-sky-500/40 hover:bg-sky-500/15",
  success:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/15",
  warning:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:border-amber-500/40 hover:bg-amber-500/15",
  destructive:
    "border-destructive/25 bg-destructive/10 text-destructive hover:border-destructive/40 hover:bg-destructive/15",
  neutral:
    "border-border/70 bg-muted/40 text-foreground/80 hover:border-foreground/30 hover:bg-muted/70",
};

const xClasses: Record<ChipTone, string> = {
  primary: "hover:bg-primary/20 text-primary/80",
  info: "hover:bg-sky-500/20 text-sky-700/80 dark:text-sky-300/80",
  success: "hover:bg-emerald-500/20 text-emerald-700/80 dark:text-emerald-300/80",
  warning: "hover:bg-amber-500/20 text-amber-700/80 dark:text-amber-300/80",
  destructive: "hover:bg-destructive/20 text-destructive/80",
  neutral: "hover:bg-foreground/15 text-muted-foreground",
};

export const FilterChipPill: React.FC<FilterChipPillProps> = ({ chip }) => {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium transition ${toneClasses[chip.tone]}`}
    >
      <span className="opacity-60">{chip.key}</span>
      <span className="font-semibold">{chip.value}</span>
      <button
        type="button"
        onClick={chip.remove}
        aria-label={`${t("orders.removeFilter", { defaultValue: "إزالة فلتر" })}: ${chip.key} ${chip.value}`}
        className={`-me-0.5 flex h-4 w-4 items-center justify-center rounded-sm transition ${xClasses[chip.tone]}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
};

export default FilterChipPill;
