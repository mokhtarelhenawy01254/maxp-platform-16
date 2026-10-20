import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  BarChart as ReBarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Check, RefreshCw } from "lucide-react";
import {
  fetchTechnicianProductivity,
  type TechnicianProductivity,
  ROLE_CONFIG,
  fmtMoney,
} from "../../shared";
import {
  todayISO,
  monthStartISO,
  dateCls,
  tableWrap,
  thCls,
  tdCls,
  chartText,
  Skeleton,
  EmptyState,
} from "../types/reportsTypes";

export function TechnicianProductivityView() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<TechnicianProductivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchTechnicianProductivity({ from, to }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  }, [from, to, t]);

  useEffect(() => {
    load();
  }, [load]);

  const totalStages = useMemo(
    () => rows.reduce((s, r) => s + (r.completedStages ?? 0), 0),
    [rows]
  );
  const totalUnits = useMemo(
    () => rows.reduce((s, r) => s + (r.completedUnits ?? 0), 0),
    [rows]
  );
  const totalWages = useMemo(
    () => rows.reduce((s, r) => s + (r.earnedWages ?? 0), 0),
    [rows]
  );
  const totalRemakes = useMemo(
    () => rows.reduce((s, r) => s + (r.remakesCount ?? 0), 0),
    [rows]
  );

  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        name: r.name || "—",
        stages: r.completedStages ?? 0,
        units: r.completedUnits ?? 0,
        wages: r.earnedWages ?? 0,
      })),
    [rows]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
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
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
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
            className="flex items-center gap-1.5 px-3 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            {t("dentalLab.common.refresh")}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            إجمالي المراحل المكتملة
          </p>
          <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400 tabular-nums font-mono">
            {totalStages} <span className="text-xs font-normal text-gray-400">مرحلة</span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            إجمالي الوحدات المنجزة
          </p>
          <p className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400 tabular-nums font-mono">
            {totalUnits} <span className="text-xs font-normal text-gray-400">وحدة</span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            إجمالي مستحقات وأجور الفريق
          </p>
          <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
            {fmtMoney(totalWages)}{" "}
            <span className="text-xs font-normal text-gray-400">ج.م</span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            إجمالي الإعادات المرتبطة
          </p>
          <p
            className={`text-2xl font-bold mt-1 tabular-nums font-mono ${
              totalRemakes > 0 ? "text-amber-600" : "text-gray-600"
            }`}
          >
            {totalRemakes} <span className="text-xs font-normal text-gray-400">حالة</span>
          </p>
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <EmptyState message={t("dentalLab.common.noData")} />
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
              مقارنة إنتاجية مراحل ووحدات فريق العمل
            </h4>
            <ResponsiveContainer width="100%" height={240}>
              <ReBarChart
                data={chartData}
                margin={{ top: 4, right: 8, bottom: 0, left: -18 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="currentColor"
                  opacity={0.08}
                />
                <XAxis
                  dataKey="name"
                  tick={chartText}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={chartText}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v, name) => [
                    String(v),
                    name === "stages"
                      ? "المراحل"
                      : name === "units"
                      ? "الوحدات"
                      : "الأجر (ج.م)",
                  ]}
                  cursor={{ fill: "rgba(0,0,0,0.03)" }}
                />
                <Bar
                  dataKey="stages"
                  name="المراحل"
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                  barSize={20}
                />
                <Bar
                  dataKey="units"
                  name="الوحدات"
                  fill="#a855f7"
                  radius={[6, 6, 0, 0]}
                  barSize={20}
                />
              </ReBarChart>
            </ResponsiveContainer>
          </div>

          <div className={tableWrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-300">
                  <th className={thCls}>عضو الفريق</th>
                  <th className={thCls}>التخصص / المحطة</th>
                  <th className={thCls}>الحالات المسندة</th>
                  <th className={thCls}>المراحل المنجزة</th>
                  <th className={thCls}>الوحدات المنجزة</th>
                  <th className={thCls}>متوسط سرعة الإنجاز</th>
                  <th className={thCls}>أجر المرحلة</th>
                  <th className={thCls}>إجمالي المستحقات</th>
                  <th className={thCls}>الإعادات المرتبطة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const roleMeta = ROLE_CONFIG[r.role || ""];
                  return (
                    <tr
                      key={r.technicianId ?? r.name ?? "—"}
                      className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <td
                        className={`${tdCls} font-semibold text-gray-900 dark:text-gray-100`}
                      >
                        {r.name || "—"}
                      </td>
                      <td className={tdCls}>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            roleMeta?.color ||
                            "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {roleMeta?.label || r.role || "فني"}
                        </span>
                      </td>
                      <td className={`${tdCls} font-mono tabular-nums`}>
                        {r.assignedCases ?? 0}
                      </td>
                      <td
                        className={`${tdCls} font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums`}
                      >
                        {r.completedStages ?? 0}
                      </td>
                      <td
                        className={`${tdCls} font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums`}
                      >
                        {r.completedUnits ?? 0}
                      </td>
                      <td className={tdCls}>
                        {r.avgHoursPerStage ? (
                          <span className="text-xs text-gray-600 dark:text-gray-300 font-mono tabular-nums">
                            {r.avgHoursPerStage} ساعة (~{r.avgDaysPerStage} يوم)
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={`${tdCls} font-mono tabular-nums`}>
                        {r.wagePerStage ? `${fmtMoney(r.wagePerStage)} ج.م` : "—"}
                      </td>
                      <td
                        className={`${tdCls} font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums`}
                      >
                        {fmtMoney(r.earnedWages ?? 0)} ج.م
                      </td>
                      <td className={tdCls}>
                        {(r.remakesCount ?? 0) > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-mono tabular-nums">
                            {r.remakesCount} إعادات
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            <Check className="w-3.5 h-3.5" />
                            ممتاز (0)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default TechnicianProductivityView;
