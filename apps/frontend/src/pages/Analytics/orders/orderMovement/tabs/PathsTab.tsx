import React, { useCallback, useEffect, useState } from "react";
import { Route, Package, GitFork, Gauge, ArrowLeft } from "lucide-react";
import {
  fetchMovement,
  MovementCard,
  KpiCard,
  StatusPill,
  LoadingState,
  ErrorState,
  EmptyState,
  formatNumber,
  formatCurrency,
  formatDuration,
  formatPercent,
  CHART_TOOLTIP_STYLE,
  type MovementFilterProps,
  TruncatedNotice,
} from "../orderMovementShared";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface PathRow {
  path: string;
  orderCount: number;
  percent: number;
  avgHours: number;
  medianHours: number;
  avgOrderValue: number;
  totalRevenue: number;
  terminalStatus: string;
  manualTransitions: number;
  autoTransitions: number;
}

interface PathsData {
  truncated?: boolean;
  totalOrders: number;
  uniquePaths: number;
  stats: {
    maxPathLength: number;
    avgPathLength: number;
    avgPathHours: number;
    successPathCount: number;
    failedPathCount: number;
    pendingPathCount: number;
  };
  topPaths: PathRow[];
}

export default function PathsTab({ startDate, endDate, mode }: MovementFilterProps) {
  const [data, setData] = useState<PathsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchMovement<PathsData>("paths", { startDate, endDate, mode });
      setData(result);
    } catch {
      setError("فشل تحميل تحليل المسارات");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, mode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={fetchData} />;

  const stats = data?.stats;
  const paths = data?.topPaths || [];

  const donutData = [
    { name: "ناجح", value: stats?.successPathCount || 0, color: "#10B981" },
    { name: "فاشل", value: stats?.failedPathCount || 0, color: "#EF4444" },
    { name: "قيد التنفيذ", value: stats?.pendingPathCount || 0, color: "#F59E0B" },
  ].filter((d) => d.value > 0);

  const totalPathOrders = paths.reduce((acc, p) => acc + p.orderCount, 0);
  const weightedAvgHours = totalPathOrders
    ? paths.reduce((acc, p) => acc + p.avgHours * p.orderCount, 0) / totalPathOrders
    : 0;
  const avgPathHours = stats?.avgPathHours ?? weightedAvgHours;

  return (
    <div className="space-y-6">
      <TruncatedNotice truncated={data?.truncated} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="إجمالي الطلبات المحركة" value={formatNumber(data?.totalOrders)} icon={Package} gradient="from-indigo-500 to-violet-600" hint={`${formatNumber(data?.uniquePaths)} مسار مختلف`} />
        <KpiCard label="عدد المسارات" value={formatNumber(data?.uniquePaths)} icon={GitFork} gradient="from-violet-500 to-purple-600" hint={`${mode === "all" ? "كل الحركات" : mode === "manual" ? "حركات يدوية فقط" : "حركات تلقائية فقط"}`} />
        <KpiCard label="أطول مسار" value={`${stats?.maxPathLength || 0} حالة`} icon={Route} gradient="from-fuchsia-500 to-pink-600" />
        <KpiCard label="متوسط طول المسار" value={`${stats?.avgPathLength || 0} حالة`} icon={Gauge} gradient="from-sky-500 to-indigo-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <MovementCard title="حصيلة النتائج" subtitle="حسب الحالة الأخيرة للمسار">
          {donutData.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={55} paddingAngle={3}>
                    {donutData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="لا توجد بيانات للعرض" />
          )}
        </MovementCard>

        <MovementCard title="ملخص الإحصائيات" className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatBox label="مسارات ناجحة" value={formatNumber(stats?.successPathCount)} color="text-emerald-600 dark:text-emerald-400" />
            <StatBox label="مسارات فاشلة" value={formatNumber(stats?.failedPathCount)} color="text-red-600 dark:text-red-400" />
            <StatBox label="مسارات معلقة" value={formatNumber(stats?.pendingPathCount)} color="text-amber-600 dark:text-amber-400" />
            <StatBox label="متوسط زمن المسارات" value={formatDuration(avgPathHours)} color="text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            المسار = تسلسل الحالات التي مر بها الطلب. تُحتسب المسارات الأكثر تكراراً مع متوسط زمنها وقيمتها.
          </p>
        </MovementCard>
      </div>

      <MovementCard
        title="أكثر المسارات تكراراً"
        subtitle={`أعلى ${paths.length} مسار حسب عدد الطلبات`}
        action={<span className="text-xs text-gray-400">مرتبة تنازلياً حسب عدد الطلبات</span>}
      >
        {paths.length === 0 ? (
          <EmptyState message="لا توجد مسارات في هذه الفترة" />
        ) : (
          <div className="space-y-4">
            {paths.map((p, idx) => (
              <div key={p.path} className="rounded-xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-900/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 w-8">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[11px]">{idx + 1}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
                    {p.path.split("→").map((status, i) => (
                      <React.Fragment key={`${status}-${i}`}>
                        {i > 0 && <ArrowLeft className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 shrink-0" />}
                        <StatusPill code={status} />
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-bold text-gray-900 dark:text-white text-sm">{formatNumber(p.orderCount)} طلب</span>
                    <span className="text-gray-400">{formatPercent(p.percent)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs mt-2">
                  <Meta label="متوسط الزمن" value={formatDuration(p.avgHours)} />
                  <Meta label="متوسط قيمة الطلب" value={formatCurrency(p.avgOrderValue)} />
                  <Meta label="إجمالي الإيرادات" value={formatCurrency(p.totalRevenue)} />
                  <Meta label="يدوي / تلقائي" value={`${p.manualTransitions} / ${p.autoTransitions}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </MovementCard>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-400 dark:text-gray-500">{label}</p>
      <p className="mt-0.5 font-semibold text-gray-800 dark:text-gray-200">{value}</p>
    </div>
  );
}
