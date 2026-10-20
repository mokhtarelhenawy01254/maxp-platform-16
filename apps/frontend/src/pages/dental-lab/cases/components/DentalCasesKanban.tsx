import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRightCircle,
  ExternalLink,
  Eye,
  Flame,
  Layers,
  Pencil,
  Printer,
  Stethoscope,
  UserPlus,
} from "lucide-react";
import type { DentalLabCase } from "../../shared";
import {
  CASE_STATUS_MAP,
  CASE_STATUSES,
  fmtDate,
  nextStatusOf,
  PRIORITY_CONFIG,
} from "../../shared";
import { statusBadge } from "../types/dentalCasesTypes";

export interface DentalCasesKanbanProps {
  cases: DentalLabCase[];
  selectedCaseIds: Set<string>;
  toggleSelect: (id: string) => void;
  isCaseOverdue: (c: DentalLabCase) => boolean;
  getDaysOverdue: (c: DentalLabCase) => number;
  applyFilter: (key: string, value: string, resetOthers?: boolean) => void;
  onAdvanceCase: (c: DentalLabCase) => void;
  onAssignCase: (c: DentalLabCase) => void;
  onPrintPanLabel: (c: DentalLabCase) => void;
  onEditCase: (c: DentalLabCase) => void;
}

export function DentalCasesKanban({
  cases,
  selectedCaseIds,
  toggleSelect,
  isCaseOverdue,
  getDaysOverdue,
  applyFilter,
  onAdvanceCase,
  onAssignCase,
  onPrintPanLabel,
  onEditCase,
}: DentalCasesKanbanProps) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-4">
        <div className="flex items-start gap-4 min-w-[1280px]">
          {CASE_STATUSES.filter((s) => s.id !== "CLOSED").map((st) => {
            const stageCases = (cases || []).filter((c) => c.status === st.id);
            return (
              <div
                key={st.id}
                className="w-80 shrink-0 flex flex-col bg-gray-50/70 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/70 shadow-xs max-h-[calc(100vh-300px)]"
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800 rounded-t-2xl">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${st.dotColor}`} />
                    <Link
                      to={`/dental-lab/cases?status=${st.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        applyFilter("status", st.id, true);
                      }}
                      className="font-bold text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
                      title={`عرض كل حالات مرحلة "${st.label}" فقط`}
                    >
                      {st.label}
                    </Link>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-mono">
                    {stageCases.length}
                  </span>
                </div>

                {/* Cards Scrollable Container */}
                <div className="p-3 space-y-3 overflow-y-auto flex-1">
                  {stageCases.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700/60 rounded-xl text-xs text-gray-400">
                      لا توجد حالات حالياً
                    </div>
                  ) : (
                    stageCases.map((c) => {
                      const next = nextStatusOf(c.status);
                      const overdue = isCaseOverdue(c);
                      const daysOverdue = overdue ? getDaysOverdue(c) : 0;
                      const isSelected = selectedCaseIds.has(c.id);

                      return (
                        <div
                          key={c.id}
                          className={`p-3.5 rounded-xl bg-white dark:bg-gray-850 border shadow-xs hover:shadow-md transition-all flex flex-col gap-2.5 ${
                            isSelected
                              ? "ring-2 ring-blue-500 border-blue-400 dark:border-blue-500"
                              : overdue
                              ? "border-rose-300 dark:border-rose-900/80 bg-rose-50/20"
                              : "border-gray-200 dark:border-gray-700/80"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                checked={isSelected}
                                onChange={() => toggleSelect(c.id)}
                                aria-label={`تحديد حالة ${c.caseNumber || c.id}`}
                              />
                              <Link
                                to={`/dental-lab/cases/${c.id}`}
                                className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                title="فتح تفاصيل الأوردر"
                              >
                                <span>{c.caseNumber || c.id.slice(0, 8)}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </Link>
                            </div>
                            <Link
                              to={`/dental-lab/cases?status=${c.status}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                applyFilter("status", c.status, true);
                              }}
                              title={`عرض كل حالات مرحلة: ${
                                CASE_STATUS_MAP[c.status]?.label || c.status
                              } فقط`}
                            >
                              {statusBadge(PRIORITY_CONFIG, c.priority)}
                            </Link>
                          </div>

                          <div>
                            <div className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                              {c.patientName}
                            </div>
                            {c.doctorName ? (
                              <div className="flex items-center gap-1 group/doc mt-0.5">
                                <Link
                                  to={
                                    c.doctorId
                                      ? `/dental-lab/cases?doctorId=${c.doctorId}`
                                      : `/dental-lab/cases?search=${encodeURIComponent(
                                          c.doctorName
                                        )}`
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (c.doctorId) applyFilter("doctorId", c.doctorId, true);
                                    else applyFilter("search", c.doctorName || "", true);
                                  }}
                                  className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline truncate flex items-center gap-1"
                                  title={`عرض كل حالات د. ${c.doctorName} فقط`}
                                >
                                  <Stethoscope className="w-3 h-3 text-blue-500 shrink-0 opacity-70 group-hover/doc:opacity-100" />
                                  <span>د. {c.doctorName}</span>
                                </Link>
                                {c.doctorId && (
                                  <Link
                                    to={`/dental-lab/doctors/${c.doctorId}`}
                                    className="opacity-0 group-hover/doc:opacity-100 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-opacity p-0.5"
                                    title="الملف الشامل للطبيب"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </Link>
                                )}
                              </div>
                            ) : (
                              <div className="text-[11px] text-gray-400 truncate mt-0.5">
                                د. طبيب غير محدد
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 text-[11px] bg-gray-50 dark:bg-gray-800/80 p-2 rounded-lg border border-gray-100 dark:border-gray-700/50">
                            {c.workTypeName ? (
                              <Link
                                to={
                                  c.workTypeId
                                    ? `/dental-lab/cases?workTypeId=${c.workTypeId}`
                                    : `/dental-lab/cases?search=${encodeURIComponent(
                                        c.workTypeName
                                      )}`
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (c.workTypeId) applyFilter("workTypeId", c.workTypeId, true);
                                  else applyFilter("search", c.workTypeName || "", true);
                                }}
                                className="font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline truncate flex items-center gap-1"
                                title={`عرض كل حالات نوع الشغل: ${c.workTypeName} فقط`}
                              >
                                <Layers className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span className="truncate max-w-[120px]">{c.workTypeName}</span>
                              </Link>
                            ) : (
                              <span className="font-medium text-gray-500 truncate">
                                نوع الشغل غير محدد
                              </span>
                            )}
                            {c.teeth && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-[10px] font-bold font-mono">
                                {c.teeth}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-1 text-[11px]">
                            <span className="text-gray-400 text-[10px]">الفني:</span>
                            {c.assignments && c.assignments.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-end max-w-[170px] items-center">
                                {c.assignments.map((a) => {
                                  const techName = a.technician?.name || a.technicianId;
                                  const targetTechId = a.technicianId;
                                  return (
                                    <Link
                                      key={a.id}
                                      to={`/dental-lab/cases?technicianId=${targetTechId}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        applyFilter("technicianId", targetTechId, true);
                                      }}
                                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 truncate max-w-[100px] cursor-pointer"
                                      title={`عرض كل حالات الفني: ${techName} فقط`}
                                    >
                                      {techName}
                                    </Link>
                                  );
                                })}
                                <button
                                  onClick={() => onAssignCase(c)}
                                  className="p-0.5 text-purple-600 hover:text-purple-800 hover:bg-purple-100 dark:hover:bg-purple-950/40 rounded transition"
                                  title="تعديل أو إضافة فني"
                                  aria-label="إسناد فني"
                                >
                                  <UserPlus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => onAssignCase(c)}
                                className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5 font-medium"
                              >
                                <UserPlus className="w-3 h-3" />
                                <span>إسناد فني</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1 border-t dark:border-gray-800">
                            <span className="text-gray-400 text-[10px]">دخول:</span>
                            <span className="text-gray-600 dark:text-gray-300 font-medium font-mono">
                              {fmtDate(c.receivedDate)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-400 text-[10px]">تسليم:</span>
                            {overdue ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 animate-pulse font-mono">
                                <Flame className="w-3 h-3" /> متأخر {daysOverdue} يوم
                              </span>
                            ) : (
                              <span className="text-gray-600 dark:text-gray-300 font-medium font-mono">
                                {fmtDate(c.dueDate)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 pt-1">
                            {next && (
                              <button
                                onClick={() => onAdvanceCase(c)}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors shadow-xs"
                                title={`ترقية إلى ${CASE_STATUS_MAP[next]?.label || next}`}
                              >
                                <span>ترقية للمرحلة التالية</span>
                                <ArrowRightCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => onPrintPanLabel(c)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
                              title="طباعة تيكت الصينية (Pan Label)"
                              aria-label="طباعة تيكت الصينية"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onEditCase(c)}
                              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
                              title="تعديل سريع بالدرج الجانبي"
                              aria-label="تعديل سريع"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <Link
                              to={`/dental-lab/cases/${c.id}`}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
                              title="فتح صفحة تفاصيل الحالة"
                              aria-label="فتح صفحة الحالة"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 px-1">
        <span>عرض خط الإنتاج (Kanban Pipeline) — إجمالي {cases?.length || 0} حالة</span>
        <span>يمكنك ترقية الحالة إلى المرحلة التالية بضغطة زر واحدة مباشرة</span>
      </div>
    </div>
  );
}

export default DentalCasesKanban;
