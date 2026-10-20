import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import {
  fetchRemakesAnalysis,
  type RemakesAnalysisReport,
  fmtDate,
} from "../../shared";
import {
  todayISO,
  monthStartISO,
  dateCls,
  tableWrap,
  thCls,
  tdCls,
  Skeleton,
  EmptyState,
} from "../types/reportsTypes";

const categoryLabels: Record<string, string> = {
  DOCTOR_IMPRESSION: "طبعة / مقاس الطبيب",
  DOCTOR_PREPARATION: "تحضير وبرد السن",
  LAB_CAD_DESIGN: "تصميم CAD بالمعمل",
  LAB_FIT_MARGIN: "مطابقة وحواف المعمل",
  LAB_SHADE_COLOR: "اختلاف اللون والجماليات",
  MATERIAL_FAILURE: "عيب أو كسر في الخامة",
  PATIENT_CHANGE: "تغيير رغبة المريض",
  OTHER: "أخرى / غير محدد",
};

export function RemakesAnalysisView() {
  const { t } = useTranslation();
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState<RemakesAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchRemakesAnalysis({ from, to }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  }, [from, to, t]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary;
  const categories = data?.categories ?? [];
  const topDoctors = data?.topDoctors ?? [];
  const topWorkTypes = data?.topWorkTypes ?? [];
  const list = data?.list ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              {t("dentalLab.reports.from")}
            </label>
            <input
              className={dateCls}
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              {t("dentalLab.reports.to")}
            </label>
            <input
              className={dateCls}
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            تحديث التقرير
          </button>
        </div>
      </div>

      {loading && <Skeleton rows={6} />}

      {!loading && !data && <EmptyState message={t("dentalLab.common.noData")} />}

      {!loading && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
              <span className="text-xs text-gray-500">
                إجمالي حالات الإعادة (Remakes)
              </span>
              <p className="text-2xl font-bold text-rose-600 mt-1 font-mono tabular-nums">
                {summary?.totalRemakes ?? 0}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
              <span className="text-xs text-gray-500">
                إعادات مجانية على المعمل (Lab Warranty)
              </span>
              <p className="text-2xl font-bold text-amber-600 mt-1 font-mono tabular-nums">
                {summary?.freeRemakes ?? 0}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
              <span className="text-xs text-gray-500">
                إعادات مدفوعة على الطبيب (Billable)
              </span>
              <p className="text-2xl font-bold text-blue-600 mt-1 font-mono tabular-nums">
                {summary?.billableRemakes ?? 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
              <h3 className="font-bold text-sm mb-4">
                توزيع الأسباب الجذرية للإعادة (Root Causes)
              </h3>
              {categories.length === 0 ? (
                <p className="text-xs text-gray-400 py-8 text-center">
                  لا توجد إعادات مسجلة في هذه الفترة
                </p>
              ) : (
                <div className="space-y-3">
                  {categories.map((c) => {
                    const pct = summary?.totalRemakes
                      ? Math.round((c.count / summary.totalRemakes) * 100)
                      : 0;
                    return (
                      <div key={c.category} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {categoryLabels[c.category] || c.category}
                          </span>
                          <span className="text-gray-500 font-mono tabular-nums">
                            {c.count} حالات ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 space-y-4">
              <div>
                <h3 className="font-bold text-sm mb-2">أكثر الأطباء تسجيلاً للإعادات</h3>
                {topDoctors.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">لا توجد بيانات</p>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    {topDoctors.map((d) => (
                      <div
                        key={d.doctorId || d.doctorName}
                        className="flex justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                      >
                        <span className="font-medium">{d.doctorName}</span>
                        <span className="font-bold text-rose-600 font-mono tabular-nums">
                          {d.count} حالات
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t dark:border-gray-700">
                <h3 className="font-bold text-sm mb-2">
                  أكثر التركيبات والأعمال تعرضاً للإعادة
                </h3>
                {topWorkTypes.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">لا توجد بيانات</p>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    {topWorkTypes.map((w) => (
                      <div
                        key={w.workTypeName}
                        className="flex justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                      >
                        <span className="font-medium">{w.workTypeName}</span>
                        <span className="font-bold text-rose-600 font-mono tabular-nums">
                          {w.count} حالات
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
            <h3 className="font-bold text-sm mb-3">
              سجل طلبات الإعادة التفصيلي ({list.length})
            </h3>
            {list.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">لا توجد حالات إعادة</p>
            ) : (
              <div className={tableWrap}>
                <table className="w-full text-right">
                  <thead>
                    <tr>
                      <th className={thCls}>رقم الحالة</th>
                      <th className={thCls}>الطبيب</th>
                      <th className={thCls}>المريض</th>
                      <th className={thCls}>نوع الشغل</th>
                      <th className={thCls}>السبب الجذري</th>
                      <th className={thCls}>الملاحظات</th>
                      <th className={thCls}>التكلفة</th>
                      <th className={thCls}>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                    {list.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className={`${tdCls} font-mono font-semibold`}>
                          {r.case?.caseNumber || r.caseId.slice(0, 8)}
                        </td>
                        <td className={tdCls}>{r.case?.doctor?.name || "—"}</td>
                        <td className={tdCls}>{r.case?.patientName || "—"}</td>
                        <td className={tdCls}>
                          {r.case?.workType?.name || r.case?.workTypeName || "—"}
                        </td>
                        <td className={tdCls}>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">
                            {categoryLabels[r.rootCauseCategory || ""] ||
                              r.rootCauseCategory ||
                              "غير محدد"}
                          </span>
                        </td>
                        <td
                          className={`${tdCls} max-w-xs truncate`}
                          title={r.reason}
                        >
                          {r.reason}
                        </td>
                        <td className={tdCls}>
                          {r.isBillable ? (
                            <span className="text-blue-600 font-bold">
                              مدفوعة (على الطبيب)
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-bold">
                              مجانية (ضمان المعمل)
                            </span>
                          )}
                        </td>
                        <td className={`${tdCls} font-mono tabular-nums`}>
                          {fmtDate(r.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default RemakesAnalysisView;
