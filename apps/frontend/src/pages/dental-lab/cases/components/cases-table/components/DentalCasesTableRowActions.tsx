import React from "react";
import {
  ArrowRightCircle,
  Eye,
  Pencil,
  Printer,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { DentalLabCase } from "../../../../shared";
import { CASE_STATUS_MAP, nextStatusOf } from "../../../../shared";
import type { DentalCasesTableViewMode } from "../types";

export interface DentalCasesTableRowActionsProps {
  dentalCase: DentalLabCase;
  viewMode: DentalCasesTableViewMode;
  isBusy: boolean;
  onInspectCase: (c: DentalLabCase) => void;
  onAdvanceCase: (c: DentalLabCase) => void;
  onEditCase: (c: DentalLabCase) => void;
  onPrintPanLabel: (c: DentalLabCase) => void;
  onTrashCase: (c: DentalLabCase) => void;
  onRestoreCase: (c: DentalLabCase) => void;
  onPermanentDelete: (c: DentalLabCase) => void;
}

export const DentalCasesTableRowActions: React.FC<DentalCasesTableRowActionsProps> = ({
  dentalCase,
  viewMode,
  isBusy,
  onInspectCase,
  onAdvanceCase,
  onEditCase,
  onPrintPanLabel,
  onTrashCase,
  onRestoreCase,
  onPermanentDelete,
}) => {
  const next = nextStatusOf(dentalCase.status);

  if (viewMode === "TRASH") {
    return (
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => onRestoreCase(dentalCase)}
          disabled={isBusy}
          className="p-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
          title="استعادة"
          aria-label="استعادة"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onPermanentDelete(dentalCase)}
          disabled={isBusy}
          className="p-1 text-xs font-semibold bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
          title="حذف نهائي"
          aria-label="حذف نهائي"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-0.5">
      <button
        type="button"
        onClick={() => onInspectCase(dentalCase)}
        className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
        title="معاينة سريعة منبثقة (درج فحص)"
        aria-label="معاينة فحص"
      >
        <Eye className="w-3.5 h-3.5" />
      </button>

      {next && (
        <button
          type="button"
          onClick={() => onAdvanceCase(dentalCase)}
          className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors"
          title={`نقل إلى: ${CASE_STATUS_MAP[next]?.label || next}`}
          aria-label="ترقية المرحلة"
        >
          <ArrowRightCircle className="w-3.5 h-3.5 rtl:rotate-180" />
        </button>
      )}

      <button
        type="button"
        onClick={() => onEditCase(dentalCase)}
        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 rounded-lg transition-colors"
        title="تعديل سريع"
        aria-label="تعديل سريع"
      >
        <Pencil className="w-3.5 h-3.5 text-blue-500" />
      </button>

      <button
        type="button"
        onClick={() => onPrintPanLabel(dentalCase)}
        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 rounded-lg transition-colors"
        title="طباعة تيكت صينية"
        aria-label="طباعة تيكت صينية"
      >
        <Printer className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => onTrashCase(dentalCase)}
        disabled={isBusy}
        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 rounded-lg transition-colors disabled:opacity-50"
        title="نقل إلى سلة المهملات"
        aria-label="نقل للمهملات"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
