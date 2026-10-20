import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Layers, Stethoscope } from "lucide-react";
import type { DentalLabCase } from "../../../../shared";
import {
  CASE_STATUS_MAP,
  fmtDate,
  fmtMoney,
  PRIORITY_CONFIG,
} from "../../../../shared";
import { statusBadge } from "../../../types/dentalCasesTypes";
import type { DentalCasesTableViewMode } from "../types";
import { DentalCasesTableRowActions } from "./DentalCasesTableRowActions";

export interface DentalCasesTableRowProps {
  dentalCase: DentalLabCase;
  viewMode: DentalCasesTableViewMode;
  isSelected: boolean;
  isOverdue: boolean;
  daysOverdue: number;
  isBusy: boolean;
  toggleSelect: (id: string) => void;
  onInspectCase: (c: DentalLabCase) => void;
  onAdvanceCase: (c: DentalLabCase) => void;
  onEditCase: (c: DentalLabCase) => void;
  onPrintPanLabel: (c: DentalLabCase) => void;
  onTrashCase: (c: DentalLabCase) => void;
  onRestoreCase: (c: DentalLabCase) => void;
  onPermanentDelete: (c: DentalLabCase) => void;
}

export const DentalCasesTableRow: React.FC<DentalCasesTableRowProps> = ({
  dentalCase,
  viewMode,
  isSelected,
  isOverdue,
  daysOverdue,
  isBusy,
  toggleSelect,
  onInspectCase,
  onAdvanceCase,
  onEditCase,
  onPrintPanLabel,
  onTrashCase,
  onRestoreCase,
  onPermanentDelete,
}) => {
  return (
    <tr
      onClick={() => onInspectCase(dentalCase)}
      className={`border-b border-slate-100 dark:border-gray-700/60 cursor-pointer transition-colors ${
        isSelected
          ? "bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70"
          : isOverdue
          ? "bg-rose-50/30 dark:bg-rose-950/15 hover:bg-rose-50/60"
          : "hover:bg-slate-50/80 dark:hover:bg-gray-750"
      }`}
    >
      <td
        className="w-8 py-2 px-2 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          className="rounded border-slate-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer align-middle"
          checked={isSelected}
          onChange={() => toggleSelect(dentalCase.id)}
          aria-label={`تحديد حالة ${dentalCase.caseNumber || dentalCase.id}`}
        />
      </td>
      <td
        className="py-2 px-3 font-mono font-bold text-xs whitespace-nowrap text-blue-600 dark:text-blue-400"
        dir="ltr"
      >
        <Link
          to={`/dental-lab/cases/${dentalCase.id}`}
          onClick={(e) => e.stopPropagation()}
          className="hover:underline flex items-center gap-1"
          title="فتح صفحة الحالة"
        >
          <span>{dentalCase.caseNumber || dentalCase.id.slice(0, 8)}</span>
        </Link>
      </td>
      <td className="py-2 px-3">
        <div className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[130px]">
          {dentalCase.patientName}
        </div>
        {dentalCase.patientPhone && (
          <div
            className="text-[10px] text-slate-400 dark:text-slate-500 font-mono"
            dir="ltr"
          >
            {dentalCase.patientPhone}
          </div>
        )}
      </td>
      <td className="py-2 px-3">
        <div className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[130px] flex items-center gap-1">
          <Stethoscope className="w-3 h-3 text-blue-500 shrink-0 opacity-70" />
          <span>{dentalCase.doctorName ? `د. ${dentalCase.doctorName}` : "—"}</span>
        </div>
      </td>
      <td className="py-2 px-3 whitespace-nowrap">
        {dentalCase.workTypeName ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/40">
            <Layers className="w-3 h-3 text-indigo-500 shrink-0" />
            <span className="truncate max-w-[120px]">{dentalCase.workTypeName}</span>
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="py-2 px-3 whitespace-nowrap">
        {dentalCase.priority !== "NORMAL" ? (
          statusBadge(PRIORITY_CONFIG, dentalCase.priority)
        ) : (
          <span className="text-slate-400 dark:text-slate-500 text-[11px]">عادي</span>
        )}
      </td>
      <td className="py-2 px-3">
        {dentalCase.assignments && dentalCase.assignments.length > 0 ? (
          <div className="flex items-center gap-1 text-[11px] text-purple-700 dark:text-purple-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
            <span className="truncate max-w-[100px]">
              {dentalCase.assignments[0]?.technician?.name || dentalCase.assignments[0]?.technicianId}
            </span>
            {dentalCase.assignments.length > 1 && (
              <span className="text-[10px] px-1 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-600 font-bold font-mono">
                +{dentalCase.assignments.length - 1}
              </span>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">غير مسند</span>
        )}
      </td>
      <td className="py-2 px-3 whitespace-nowrap">
        <div className="flex items-center gap-1">
          {statusBadge(CASE_STATUS_MAP, dentalCase.status)}
          {isOverdue && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse font-mono"
              title={`متأخر ${daysOverdue} يوم`}
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>{daysOverdue}ي</span>
            </span>
          )}
        </div>
      </td>
      <td
        className="py-2 px-3 whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-400 font-mono"
        dir="ltr"
      >
        {fmtDate(dentalCase.receivedDate)}
      </td>
      <td className="py-2 px-3 whitespace-nowrap text-[11px] font-mono" dir="ltr">
        <span
          className={
            isOverdue
              ? "text-rose-600 dark:text-rose-400 font-bold"
              : "text-slate-600 dark:text-slate-300"
          }
        >
          {fmtDate(dentalCase.dueDate)}
        </span>
      </td>
      <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px]" dir="ltr">
        <div className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
          {fmtMoney(dentalCase.total)}
        </div>
        {Number(dentalCase.remaining) > 0 ? (
          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium tabular-nums">
            باقي {fmtMoney(dentalCase.remaining)}
          </div>
        ) : (
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            خالص
          </div>
        )}
      </td>
      <td
        className="py-2 px-3 whitespace-nowrap text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <DentalCasesTableRowActions
          dentalCase={dentalCase}
          viewMode={viewMode}
          isBusy={isBusy}
          onInspectCase={onInspectCase}
          onAdvanceCase={onAdvanceCase}
          onEditCase={onEditCase}
          onPrintPanLabel={onPrintPanLabel}
          onTrashCase={onTrashCase}
          onRestoreCase={onRestoreCase}
          onPermanentDelete={onPermanentDelete}
        />
      </td>
    </tr>
  );
};
