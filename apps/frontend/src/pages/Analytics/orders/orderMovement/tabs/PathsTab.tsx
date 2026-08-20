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
      setError("┘ü╪┤┘ä ╪¬╪¡┘à┘è┘ä ╪¬╪¡┘ä┘è┘ä ╪º┘ä┘à╪│╪º╪▒╪º╪¬");
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
    { name: "┘å╪º╪¼╪¡", value: stats?.successPathCount || 0, color: "#10B981" },
    { name: "┘ü╪º╪┤┘ä", value: stats?.failedPathCount || 0, color: "#EF4444" },
    { name: "┘é┘è╪» ╪º┘ä╪¬┘å┘ü┘è╪░", value: stats?.pendingPathCount || 0, color: "#F59E0B" },
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
        <KpiCard label="╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘à╪¡╪▒┘â╪⌐" value={formatNumber(data?.totalOrders)} icon={Package} gradient="from-indigo-500 to-violet-600" hint={`${formatNumber(data?.uniquePaths)} ┘à╪│╪º╪▒ ┘à╪«╪¬┘ä┘ü`} />
        <KpiCard label="╪╣╪»╪» ╪º┘ä┘à╪│╪º╪▒╪º╪¬" value={formatNumber(data?.uniquePaths)} icon={GitFork} gradient="from-violet-500 to-purple-600" hint={`${mode === "all" ? "┘â┘ä ╪º┘ä╪¡╪▒┘â╪º╪¬" : mode === "manual" ? "╪¡╪▒┘â╪º╪¬ ┘è╪»┘ê┘è╪⌐ ┘ü┘é╪╖" : "╪¡╪▒┘â╪º╪¬ ╪¬┘ä┘é╪º╪ª┘è╪⌐ ┘ü┘é╪╖"}`} />
        <KpiCard label="╪ú╪╖┘ê┘ä ┘à╪│╪º╪▒" value={`${stats?.maxPathLength || 0} ╪¡╪º┘ä╪⌐`} icon={Route} gradient="from-fuchsia-500 to-pink-600" />
        <KpiCard label="┘à╪¬┘ê╪│╪╖ ╪╖┘ê┘ä ╪º┘ä┘à╪│╪º╪▒" value={`${stats?.avgPathLength || 0} ╪¡╪º┘ä╪⌐`} icon={Gauge} gradient="from-sky-500 to-indigo-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <MovementCard title="╪¡╪╡┘è┘ä╪⌐ ╪º┘ä┘å╪¬╪º╪ª╪¼" subtitle="╪¡╪│╪¿ ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä╪ú╪«┘è╪▒╪⌐ ┘ä┘ä┘à╪│╪º╪▒">
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
            <EmptyState message="┘ä╪º ╪¬┘ê╪¼╪» ╪¿┘è╪º┘å╪º╪¬ ┘ä┘ä╪╣╪▒╪╢" />
          )}
        </MovementCard>

        <MovementCard title="┘à┘ä╪«╪╡ ╪º┘ä╪Ñ╪¡╪╡╪º╪ª┘è╪º╪¬" className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatBox label="┘à╪│╪º╪▒╪º╪¬ ┘å╪º╪¼╪¡╪⌐" value={formatNumber(stats?.successPathCount)} color="text-emerald-600 dark:text-emerald-400" />
            <StatBox label="┘à╪│╪º╪▒╪º╪¬ ┘ü╪º╪┤┘ä╪⌐" value={formatNumber(stats?.failedPathCount)} color="text-red-600 dark:text-red-400" />
            <StatBox label="┘à╪│╪º╪▒╪º╪¬ ┘à╪╣┘ä┘é╪⌐" value={formatNumber(stats?.pendingPathCount)} color="text-amber-600 dark:text-amber-400" />
            <StatBox label="┘à╪¬┘ê╪│╪╖ ╪▓┘à┘å ╪º┘ä┘à╪│╪º╪▒╪º╪¬" value={formatDuration(avgPathHours)} color="text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            ╪º┘ä┘à╪│╪º╪▒ = ╪¬╪│┘ä╪│┘ä ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä╪¬┘è ┘à╪▒ ╪¿┘ç╪º ╪º┘ä╪╖┘ä╪¿. ╪¬┘Å╪¡╪¬╪│╪¿ ╪º┘ä┘à╪│╪º╪▒╪º╪¬ ╪º┘ä╪ú┘â╪½╪▒ ╪¬┘â╪▒╪º╪▒╪º┘ï ┘à╪╣ ┘à╪¬┘ê╪│╪╖ ╪▓┘à┘å┘ç╪º ┘ê┘é┘è┘à╪¬┘ç╪º.
          </p>
        </MovementCard>
      </div>

      <MovementCard
        title="╪ú┘â╪½╪▒ ╪º┘ä┘à╪│╪º╪▒╪º╪¬ ╪¬┘â╪▒╪º╪▒╪º┘ï"
        subtitle={`╪ú╪╣┘ä┘ë ${paths.length} ┘à╪│╪º╪▒ ╪¡╪│╪¿ ╪╣╪»╪» ╪º┘ä╪╖┘ä╪¿╪º╪¬`}
        action={<span className="text-xs text-gray-400">┘à╪▒╪¬╪¿╪⌐ ╪¬┘å╪º╪▓┘ä┘è╪º┘ï ╪¡╪│╪¿ ╪╣╪»╪» ╪º┘ä╪╖┘ä╪¿╪º╪¬</span>}
      >
        {paths.length === 0 ? (
          <EmptyState message="┘ä╪º ╪¬┘ê╪¼╪» ┘à╪│╪º╪▒╪º╪¬ ┘ü┘è ┘ç╪░┘ç ╪º┘ä┘ü╪¬╪▒╪⌐" />
        ) : (
          <div className="space-y-4">
            {paths.map((p, idx) => (
              <div key={p.path} className="rounded-xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-900/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 w-8">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[11px]">{idx + 1}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
                    {p.path.split("ΓåÆ").map((status, i) => (
                      <React.Fragment key={`${status}-${i}`}>
                        {i > 0 && <ArrowLeft className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 shrink-0" />}
                        <StatusPill code={status} />
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-bold text-gray-900 dark:text-white text-sm">{formatNumber(p.orderCount)} ╪╖┘ä╪¿</span>
                    <span className="text-gray-400">{formatPercent(p.percent)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs mt-2">
                  <Meta label="┘à╪¬┘ê╪│╪╖ ╪º┘ä╪▓┘à┘å" value={formatDuration(p.avgHours)} />
                  <Meta label="┘à╪¬┘ê╪│╪╖ ┘é┘è┘à╪⌐ ╪º┘ä╪╖┘ä╪¿" value={formatCurrency(p.avgOrderValue)} />
                  <Meta label="╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪Ñ┘è╪▒╪º╪»╪º╪¬" value={formatCurrency(p.totalRevenue)} />
                  <Meta label="┘è╪»┘ê┘è / ╪¬┘ä┘é╪º╪ª┘è" value={`${p.manualTransitions} / ${p.autoTransitions}`} />
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
