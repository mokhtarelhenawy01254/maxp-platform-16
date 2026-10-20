import React from "react";
import { Link } from "react-router-dom";
import { ArrowRightCircle, Eye, Pencil, Printer } from "lucide-react";
import type { DentalLabCase } from "../../../../shared";
import { CASE_STATUS_MAP, nextStatusOf } from "../../../../shared";

export interface DentalCasesKanbanCardActionsProps {
  dentalCase: DentalLabCase;
  onAdvanceCase: (c: DentalLabCase) => void;
  onPrintPanLabel: (c: DentalLabCase) => void;
  onEditCase: (c: DentalLabCase) => void;
}

export const DentalCasesKanbanCardActions: React.FC<DentalCasesKanbanCardActionsProps> = ({
  dentalCase,
  onAdvanceCase,
  onPrintPanLabel,
  onEditCase,
}) => {
  const next = nextStatusOf(dentalCase.status);

  return (
    <div className="flex items-center gap-1.5 pt-1">
      {next && (
        <button
          type="button"
          onClick={() => onAdvanceCase(dentalCase)}
          className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors shadow-xs"
          title={`ترقية إلى ${CASE_STATUS_MAP[next]?.label || next}`}
        >
          <span>ترقية للمرحلة التالية</span>
          <ArrowRightCircle className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={() => onPrintPanLabel(dentalCase)}
        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
        title="طباعة تيكت الصينية (Pan Label)"
        aria-label="طباعة تيكت الصينية"
      >
        <Printer className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onEditCase(dentalCase)}
        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
        title="تعديل سريع بالدرج الجانبي"
        aria-label="تعديل سريع"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <Link
        to={`/dental-lab/cases/${dentalCase.id}`}
        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
        title="فتح صفحة تفاصيل الحالة"
        aria-label="فتح صفحة الحالة"
      >
        <Eye className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
};
