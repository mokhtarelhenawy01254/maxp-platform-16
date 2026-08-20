import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Package,
  Target,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DeferredResponsiveContainer from "../../../../../components/ui/DeferredResponsiveContainer";
import {
  AutoBadge,
  CHART_TOOLTIP_STYLE,
  EmptyState,
  ErrorState,
  KpiCard,
  LoadingState,
  MovementCard,
  StatusPill,
  fetchMovement,
  formatCurrency,
  formatNumber,
  formatPercent,
  getStatusLabel,
  statusChartColor,
  type MovementFilterProps,
  TruncatedNotice,
} from "../orderMovementShared";

interface OutcomesSummary {
  totalOrders: number;
  delivered: number;
  failed: number;
  pending: number;
  successRate: number;
  deliveredRevenue: number;
  lostRevenue: number;
  failedRevenue: number;
}

interface OutcomeRow {
  status: string;
  count: number;
  percent: number;
  revenue: number;
  avgOrderValue: number;
  isTerminal: boolean;
}

interface ReasonRow {
  reason: string;
  count: number;
  revenue: number;
  status: string;
}

interface OutcomesData {
  truncated?: boolean;
  summary: OutcomesSummary;
  outcomes: OutcomeRow[];
  reasons: ReasonRow[];
  modeSplit: { manual: number; auto: number };
}

export default function OutcomesTab({ startDate, endDate, mode }: MovementFilterProps) {
  const [data, setData] = useState<OutcomesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchMovement<OutcomesData>("outcomes", {
        startDate,
        endDate,
        mode,
      });
      setData(payload);
    } catch {
      setError("╪¬╪╣╪░╪▒ ╪¬╪¡┘à┘è┘ä ╪º┘ä┘å╪¬╪º╪ª╪¼ ╪º┘ä┘å┘ç╪º╪ª┘è╪⌐");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  const pieData = useMemo(
    () =>
      data?.outcomes.map((row) => ({ status: row.status, count: row.count })) ??
      [],
    [data],
  );

  const barData = useMemo(
    () =>
      data?.outcomes.map((row) => ({
        status: row.status,
        label: getStatusLabel(row.status),
        revenue: row.revenue,
      })) ?? [],
    [data],
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data || data.summary.totalOrders === 0) return <EmptyState />;

  const { summary } = data;
  const manualPct = summary.totalOrders
    ? (data.modeSplit.manual / summary.totalOrders) * 100
    : 0;
  const autoPct = summary.totalOrders
    ? (data.modeSplit.auto / summary.totalOrders) * 100
    : 0;

  return (
    <div className="space-y-6">
      <TruncatedNotice truncated={data?.truncated} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪╖┘ä╪¿╪º╪¬"
          value={formatNumber(summary.totalOrders)}
          icon={Package}
        />
        <KpiCard
          label="┘à┘Å╪│┘ä┘Ä┘æ┘à"
          value={formatNumber(summary.delivered)}
          icon={CheckCircle2}
          gradient="from-emerald-500 to-teal-600"
          hint={formatCurrency(summary.deliveredRevenue)}
        />
        <KpiCard
          label="┘ü╪º╪┤┘ä"
          value={formatNumber(summary.failed)}
          icon={XCircle}
          gradient="from-rose-500 to-red-600"
          hint={formatCurrency(summary.failedRevenue)}
        />
        <KpiCard
          label="┘å╪│╪¿╪⌐ ╪º┘ä┘å╪¼╪º╪¡"
          value={formatPercent(summary.successRate)}
          icon={Target}
          gradient="from-sky-500 to-indigo-600"
        />
        <KpiCard
          label="╪º┘ä╪Ñ┘è╪▒╪º╪» ╪º┘ä╪╢╪º╪ª╪╣"
          value={formatCurrency(summary.lostRevenue)}
          icon={Banknote}
          gradient="from-amber-500 to-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MovementCard
          title="╪¬┘ê╪▓┘è╪╣ ╪º┘ä┘å╪¬╪º╪ª╪¼"
          subtitle="╪╣╪»╪» ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪¡╪│╪¿ ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä┘å┘ç╪º╪ª┘è╪⌐"
        >
          <div className="h-[280px]">
            <DeferredResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="count"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={95}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.status}`}
                      fill={statusChartColor(entry.status, index)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const item = payload[0];
                    if (!item) return null;
                    const status = (
                      item.payload as { status?: string } | undefined
                    )?.status;
                    return (
                      <div
                        style={CHART_TOOLTIP_STYLE}
                        className="rounded-xl px-3 py-2"
                      >
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {status ? getStatusLabel(status) : "-"}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {formatNumber(Number(item.value ?? 0))} ╪╖┘ä╪¿
                        </div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </DeferredResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {data.outcomes.map((row) => (
              <div
                key={row.status}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: statusChartColor(row.status) }}
                  />
                  <span className="truncate text-gray-700 dark:text-gray-200">
                    {getStatusLabel(row.status)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatNumber(row.count)}
                  </span>
                  <span className="w-12 text-left">
                    {formatPercent(row.percent)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </MovementCard>

        <MovementCard
          title="╪º┘ä╪Ñ┘è╪▒╪º╪» ╪¡╪│╪¿ ╪º┘ä┘å╪¬┘è╪¼╪⌐"
          subtitle="╪Ñ╪¼┘à╪º┘ä┘è ┘é┘è┘à╪⌐ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ┘ä┘â┘ä ╪¡╪º┘ä╪⌐ ┘å┘ç╪º╪ª┘è╪⌐"
        >
          <div className="h-[320px]">
            <DeferredResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={barData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  opacity={0.12}
                />
                <XAxis
                  dataKey="label"
                  stroke="#9CA3AF"
                  fontSize={12}
                  interval={0}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  cursor={{ fill: "rgba(99,102,241,0.06)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const item = payload[0];
                    if (!item) return null;
                    const status = (
                      item.payload as { status?: string } | undefined
                    )?.status;
                    return (
                      <div
                        style={CHART_TOOLTIP_STYLE}
                        className="rounded-xl px-3 py-2"
                      >
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {status ? getStatusLabel(status) : "-"}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {formatCurrency(Number(item.value ?? 0))}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell
                      key={`bar-${entry.status}`}
                      fill={statusChartColor(entry.status, index)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </DeferredResponsiveContainer>
          </div>
        </MovementCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <MovementCard
          title="╪ú╪│╪¿╪º╪¿ ╪º┘ä┘ü╪┤┘ä"
          subtitle="╪ó╪«╪▒ ╪│╪¿╪¿ ┘à╪│╪¼┘ä ┘ä┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘ü╪º╪┤┘ä╪⌐"
          className="xl:col-span-2"
        >
          {data.reasons.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 dark:border-gray-700/60 dark:text-gray-400">
                    <th className="px-4 py-3">╪º┘ä╪│╪¿╪¿</th>
                    <th className="px-4 py-3">╪º┘ä╪¡╪º┘ä╪⌐</th>
                    <th className="px-4 py-3 text-center">╪º┘ä╪╣╪»╪»</th>
                    <th className="px-4 py-3 text-left">╪º┘ä╪Ñ┘è╪▒╪º╪»</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {data.reasons.map((row) => (
                    <tr
                      key={row.reason}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <td className="max-w-[320px] truncate px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                        {row.reason}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill code={row.status} />
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                        {formatNumber(row.count)}
                      </td>
                      <td className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              ┘ä╪º ╪¬┘ê╪¼╪» ╪ú╪│╪¿╪º╪¿ ┘à╪│╪¼┘ä╪⌐ ┘ä┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘ü╪º╪┤┘ä╪⌐
            </div>
          )}
        </MovementCard>

        <MovementCard
          title="╪º┘ä╪¡╪▒┘â╪º╪¬ ╪º┘ä┘è╪»┘ê┘è╪⌐ ┘ê╪º┘ä╪¬┘ä┘é╪º╪ª┘è╪⌐"
          subtitle="╪¬╪╡┘å┘è┘ü ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪¡╪│╪¿ ╪ó╪«╪▒ ╪¡╪▒┘â╪⌐"
        >
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AutoBadge auto={false} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    ┘è╪»┘ê┘è
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatNumber(data.modeSplit.manual)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatPercent(manualPct)}
                  </span>
                </div>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-sky-500 to-sky-400"
                  style={{ width: `${manualPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AutoBadge auto />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    ╪¬┘ä┘é╪º╪ª┘è
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatNumber(data.modeSplit.auto)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatPercent(autoPct)}
                  </span>
                </div>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-violet-500 to-fuchsia-500"
                  style={{ width: `${autoPct}%` }}
                />
              </div>
            </div>
            <p className="pt-1 text-xs text-gray-500 dark:text-gray-400">
              ┘à┘å ╪Ñ╪¼┘à╪º┘ä┘è {formatNumber(summary.totalOrders)} ╪╖┘ä╪¿ ┘ü┘è ╪º┘ä┘ü╪¬╪▒╪⌐ ╪º┘ä┘à╪¡╪»╪»╪⌐
            </p>
          </div>
        </MovementCard>
      </div>
    </div>
  );
}
