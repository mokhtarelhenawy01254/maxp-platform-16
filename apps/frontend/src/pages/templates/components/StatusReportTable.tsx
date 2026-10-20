import React, { Fragment } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

export interface StatusSummaryRow {
  eventType: string;
  total: number;
  meta: number;
  regular: number;
  delivered: number;
  failed: number;
}

export interface StatusReportTableProps {
  visibleRows: StatusSummaryRow[];
  statusNameMap: Map<string, string>;
  humanizeEventType: (code: string) => string;
  expanded: Set<string>;
  toggleExpand: (eventType: string) => void;
  detailByEvent: Record<string, { loading: boolean; items: any[] }>;
  renderProviderBadge: (provider: string | null) => React.ReactNode;
  renderStatusBadge: (status: string) => React.ReactNode;
}

export default function StatusReportTable({
  visibleRows,
  statusNameMap,
  humanizeEventType,
  expanded,
  toggleExpand,
  detailByEvent,
  renderProviderBadge,
  renderStatusBadge,
}: StatusReportTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white dark:border-white/10 dark:bg-slate-900/50">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="border-b border-slate-200/70 bg-slate-50 text-[11px] text-slate-500 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-400">
              <th className="px-3 py-2.5 font-medium">الحالة</th>
              <th className="px-3 py-2.5 text-center font-medium">إجمالي</th>
              <th className="px-3 py-2.5 text-center font-medium">ميتا</th>
              <th className="px-3 py-2.5 text-center font-medium">عادي</th>
              <th className="px-3 py-2.5 text-center font-medium">تم التسليم</th>
              <th className="px-3 py-2.5 text-center font-medium">فشل</th>
              <th className="px-3 py-2.5 text-center font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                  لا توجد إرسالات لهذه الفترة
                </td>
              </tr>
            )}
            {visibleRows.map((row) => {
              const isOpen = expanded.has(row.eventType);
              const detail = detailByEvent[row.eventType];
              return (
                <Fragment key={row.eventType}>
                  <tr
                    className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    onClick={() => toggleExpand(row.eventType)}
                  >
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {statusNameMap.get(row.eventType) || humanizeEventType(row.eventType)}
                      </span>
                      {!statusNameMap.has(row.eventType) && (
                        <span className="ms-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {row.eventType}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold tabular-nums font-mono text-slate-900 dark:text-white">
                      {row.total}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums font-mono text-blue-600 dark:text-blue-400">
                      {row.meta}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums font-mono text-emerald-600 dark:text-emerald-400">
                      {row.regular}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums font-mono text-green-600 dark:text-green-400">
                      {row.delivered}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums font-mono text-red-600 dark:text-red-400">
                      {row.failed}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <ChevronDownIcon
                        className={`inline h-4 w-4 text-slate-400 transition ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={7} className="bg-slate-50/60 px-3 pb-3 dark:bg-slate-800/30">
                        {detail?.loading ? (
                          <div className="flex justify-center py-4">
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-500/20 border-t-indigo-500" />
                          </div>
                        ) : !detail || detail.items.length === 0 ? (
                          <p className="py-4 text-center text-xs text-slate-400">
                            لا توجد رسائل تفصيلية في هذه الفترة
                          </p>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-slate-200/70 bg-white dark:border-white/10 dark:bg-slate-900/50">
                            <table className="w-full text-right text-[11px]">
                              <thead>
                                <tr className="border-b border-slate-200/70 bg-slate-50 text-[10px] text-slate-500 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-400">
                                  <th className="px-3 py-2 font-medium">رقم الطلب</th>
                                  <th className="px-3 py-2 font-medium">العميل</th>
                                  <th className="px-3 py-2 font-medium">الهاتف</th>
                                  <th className="px-3 py-2 font-medium">النوع</th>
                                  <th className="px-3 py-2 font-medium">الحالة</th>
                                  <th className="px-3 py-2 font-medium">التاريخ</th>
                                  <th className="px-3 py-2 font-medium">الخطأ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {detail.items.map((m: any) => (
                                  <tr
                                    key={m.id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                  >
                                    <td className="px-3 py-2 font-mono text-[10px]">
                                      {m.orderNumber || "—"}
                                    </td>
                                    <td className="px-3 py-2">{m.customerName || "—"}</td>
                                    <td
                                      className="px-3 py-2 font-mono text-[10px]"
                                      dir="ltr"
                                    >
                                      {m.customerPhone || "—"}
                                    </td>
                                    <td className="px-3 py-2">
                                      {renderProviderBadge(m.provider)}
                                    </td>
                                    <td className="px-3 py-2">
                                      {renderStatusBadge(m.status)}
                                    </td>
                                    <td className="px-3 py-2 text-slate-400">
                                      {new Date(m.createdAt).toLocaleTimeString("ar-EG", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        day: "numeric",
                                        month: "numeric",
                                      })}
                                    </td>
                                    <td
                                      className="max-w-[160px] truncate px-3 py-2 text-red-500"
                                      title={m.errorMessage || ""}
                                    >
                                      {m.errorMessage || "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
