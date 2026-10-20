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
import { RefreshCw } from "lucide-react";
import { fetchWorkTypeRevenue, type WorkTypeRevenue, fmtMoney } from "../../shared";
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

export function WorkTypeRevenueView() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<WorkTypeRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchWorkTypeRevenue({ from, to }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  }, [from, to, t]);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        name: r.workType || "—",
        paid: r.paid ?? 0,
        remaining: r.remaining ?? 0,
      })),
    [rows]
  );

  return (
    <div className="space-y-5">
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

      {loading ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <EmptyState message={t("dentalLab.common.noData")} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
              {t("dentalLab.reports.revenueByTypeChart")}
            </h4>
            <ResponsiveContainer
              width="100%"
              height={Math.max(220, chartData.length * 44)}
            >
              <ReBarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="currentColor"
                  opacity={0.08}
                />
                <XAxis
                  type="number"
                  tickFormatter={(v) => Number(v).toLocaleString("en-US")}
                  tick={chartText}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={chartText}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => fmtMoney(Number(v))}
                  cursor={{ fill: "rgba(0,0,0,0.03)" }}
                />
                <Bar
                  dataKey="paid"
                  name={String(t("dentalLab.common.paid"))}
                  fill="#10b981"
                  radius={[0, 6, 6, 0]}
                  barSize={16}
                />
              </ReBarChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-3">
            <div className={tableWrap}>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={thCls}>{t("dentalLab.reports.workType")}</th>
                    <th className={thCls}>{t("dentalLab.reports.cases")}</th>
                    <th className={thCls}>{t("dentalLab.common.total")}</th>
                    <th className={thCls}>{t("dentalLab.common.paid")}</th>
                    <th className={thCls}>{t("dentalLab.common.remaining")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.workType ?? "—"}
                      className="border-b dark:border-gray-700 last:border-b-0"
                    >
                      <td className={`${tdCls} font-medium`}>{r.workType || "—"}</td>
                      <td className={`${tdCls} font-mono tabular-nums`}>
                        {r.cases ?? 0}
                      </td>
                      <td className={`${tdCls} font-mono tabular-nums`}>
                        {fmtMoney(r.total)}
                      </td>
                      <td
                        className={`${tdCls} text-emerald-600 dark:text-emerald-400 font-mono tabular-nums`}
                      >
                        {fmtMoney(r.paid)}
                      </td>
                      <td
                        className={`${tdCls} text-rose-600 dark:text-rose-400 font-mono tabular-nums`}
                      >
                        {fmtMoney(r.remaining)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkTypeRevenueView;
