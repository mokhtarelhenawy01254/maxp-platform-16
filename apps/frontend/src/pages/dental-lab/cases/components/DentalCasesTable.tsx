import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowRightCircle,
  Eye,
  Layers,
  Pencil,
  Printer,
  RotateCcw,
  Stethoscope,
  Trash2,
} from "lucide-react";
import type { DentalLabCase } from "../../shared";
import {
  CASE_STATUS_MAP,
  fmtDate,
  fmtMoney,
  nextStatusOf,
  PRIORITY_CONFIG,
} from "../../shared";
import { statusBadge } from "../types/dentalCasesTypes";

export interface DentalCasesTableProps {
  cases: DentalLabCase[];
  viewMode: "ACTIVE" | "OVERDUE" | "TRASH";
  selectedCaseIds: Set<string>;
  toggleSelect: (id: string) => void;
  toggleSelectAllPage: () => void;
  actionBusyId: string | null;
  isCaseOverdue: (c: DentalLabCase) => boolean;
  getDaysOverdue: (c: DentalLabCase) => number;
  onInspectCase: (c: DentalLabCase) => void;
  onAdvanceCase: (c: DentalLabCase) => void;
  onEditCase: (c: DentalLabCase) => void;
  onPrintPanLabel: (c: DentalLabCase) => void;
  onTrashCase: (c: DentalLabCase) => void;
  onRestoreCase: (c: DentalLabCase) => void;
  onPermanentDelete: (c: DentalLabCase) => void;
  page: number;
  totalPages: number;
  setPage: (p: number | ((prev: number) => number)) => void;
}

export function DentalCasesTable({
  cases,
  viewMode,
  selectedCaseIds,
  toggleSelect,
  toggleSelectAllPage,
  actionBusyId,
  isCaseOverdue,
  getDaysOverdue,
  onInspectCase,
  onAdvanceCase,
  onEditCase,
  onPrintPanLabel,
  onTrashCase,
  onRestoreCase,
  onPermanentDelete,
  page,
  totalPages,
  setPage,
}: DentalCasesTableProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xs border border-slate-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="border-b border-slate-200 dark:border-gray-700 bg-slate-50/90 dark:bg-gray-800/90 text-slate-600 dark:text-slate-300 font-semibold">
                <th className="w-8 py-2.5 px-2 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer align-middle"
                    checked={cases.length > 0 && cases.every((c) => selectedCaseIds.has(c.id))}
                    onChange={toggleSelectAllPage}
                    title="تحديد كل الحالات في هذه الصفحة"
                    aria-label="تحديد كل الحالات"
                  />
                </th>
                <th className="text-right py-2.5 px-3 whitespace-nowrap">رقم الحالة</th>
                <th className="text-right py-2.5 px-3 whitespace-nowrap">المريض</th>
                <th className="text-right py-2.5 px-3 whitespace-nowrap">الطبيب / العيادة</th>
                <th className="text-right py-2.5 px-3 whitespace-nowrap">نوع الشغل</th>
                <th className="text-right py-2.5 px-3 whitespace-nowrap">الأولوية</th>
                <th className="text-right py-2.5 px-3 whitespace-nowrap">الفني</th>
                <th className="text-right py-2.5 px-3 whitespace-nowrap">الحالة</th>
                <th className="text-right py-2.5 px-3 whitespace-nowrap">تاريخ الدخول</th>
                <th className="text-right py-2.5 px-3 whitespace-nowrap">تاريخ الاستحقاق</th>
                <th className="text-right py-2.5 px-3 whitespace-nowrap">المستحقات</th>
                <th className="text-center py-2.5 px-3 whitespace-nowrap">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const next = nextStatusOf(c.status);
                const overdue = isCaseOverdue(c);
                const daysOverdue = overdue ? getDaysOverdue(c) : 0;
                const isBusy = actionBusyId === c.id;
                const isSelected = selectedCaseIds.has(c.id);

                return (
                  <tr
                    key={c.id}
                    onClick={() => onInspectCase(c)}
                    className={`border-b border-slate-100 dark:border-gray-700/60 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70"
                        : overdue
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
                        onChange={() => toggleSelect(c.id)}
                        aria-label={`تحديد حالة ${c.caseNumber || c.id}`}
                      />
                    </td>
                    <td
                      className="py-2 px-3 font-mono font-bold text-xs whitespace-nowrap text-blue-600 dark:text-blue-400"
                      dir="ltr"
                    >
                      <Link
                        to={`/dental-lab/cases/${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline flex items-center gap-1"
                        title="فتح صفحة الحالة"
                      >
                        <span>{c.caseNumber || c.id.slice(0, 8)}</span>
                      </Link>
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[130px]">
                        {c.patientName}
                      </div>
                      {c.patientPhone && (
                        <div
                          className="text-[10px] text-slate-400 dark:text-slate-500 font-mono"
                          dir="ltr"
                        >
                          {c.patientPhone}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[130px] flex items-center gap-1">
                        <Stethoscope className="w-3 h-3 text-blue-500 shrink-0 opacity-70" />
                        <span>{c.doctorName ? `د. ${c.doctorName}` : "—"}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {c.workTypeName ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/40">
                          <Layers className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span className="truncate max-w-[120px]">{c.workTypeName}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {c.priority !== "NORMAL" ? (
                        statusBadge(PRIORITY_CONFIG, c.priority)
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-[11px]">عادي</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {c.assignments && c.assignments.length > 0 ? (
                        <div className="flex items-center gap-1 text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                          <span className="truncate max-w-[100px]">
                            {c.assignments[0]?.technician?.name || c.assignments[0]?.technicianId}
                          </span>
                          {c.assignments.length > 1 && (
                            <span className="text-[10px] px-1 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-600 font-bold font-mono">
                              +{c.assignments.length - 1}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">غير مسند</span>
                      )}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {statusBadge(CASE_STATUS_MAP, c.status)}
                        {overdue && (
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
                      {fmtDate(c.receivedDate)}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-[11px] font-mono" dir="ltr">
                      <span
                        className={
                          overdue
                            ? "text-rose-600 dark:text-rose-400 font-bold"
                            : "text-slate-600 dark:text-slate-300"
                        }
                      >
                        {fmtDate(c.dueDate)}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px]" dir="ltr">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        {fmtMoney(c.total)}
                      </div>
                      {Number(c.remaining) > 0 ? (
                        <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium tabular-nums">
                          باقي {fmtMoney(c.remaining)}
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
                      {viewMode === "TRASH" ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onRestoreCase(c)}
                            disabled={isBusy}
                            className="p-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                            title="استعادة"
                            aria-label="استعادة"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onPermanentDelete(c)}
                            disabled={isBusy}
                            className="p-1 text-xs font-semibold bg-red-50 text-red-700 rounded hover:bg-red-100"
                            title="حذف نهائي"
                            aria-label="حذف نهائي"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => onInspectCase(c)}
                            className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                            title="معاينة سريعة منبثقة (درج فحص)"
                            aria-label="معاينة فحص"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {next && (
                            <button
                              type="button"
                              onClick={() => onAdvanceCase(c)}
                              className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors"
                              title={`نقل إلى: ${CASE_STATUS_MAP[next]?.label || next}`}
                              aria-label="ترقية المرحلة"
                            >
                              <ArrowRightCircle className="w-3.5 h-3.5 rtl:rotate-180" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onEditCase(c)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 rounded-lg transition-colors"
                            title="تعديل سريع"
                            aria-label="تعديل سريع"
                          >
                            <Pencil className="w-3.5 h-3.5 text-blue-500" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onPrintPanLabel(c)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 rounded-lg transition-colors"
                            title="طباعة تيكت صينية"
                            aria-label="طباعة تيكت صينية"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onTrashCase(c)}
                            disabled={isBusy}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 rounded-lg transition-colors disabled:opacity-50"
                            title="نقل إلى سلة المهملات"
                            aria-label="نقل للمهملات"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 border dark:border-gray-600 rounded-lg disabled:opacity-40 text-xs font-semibold"
          >
            {t("dentalLab.common.prev")}
          </button>
          <span className="text-gray-500 dark:text-gray-400 text-xs font-mono">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 border dark:border-gray-600 rounded-lg disabled:opacity-40 text-xs font-semibold"
          >
            {t("dentalLab.common.next")}
          </button>
        </div>
      )}
    </div>
  );
}

export default DentalCasesTable;
