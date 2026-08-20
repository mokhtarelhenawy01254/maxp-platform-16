import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Gauge, Hourglass, Layers } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
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
  formatDuration,
  formatNumber,
  getStatusLabel,
  statusChartColor,
  type MovementFilterProps,
  TruncatedNotice,
} from "../orderMovementShared";

interface DwellStatusRow {
  status: string;
  entries: number;
  avgHours: number;
  p50Hours: number;
  p90Hours: number;
  maxHours: number;
  manualEntries: number;
  autoEntries: number;
}

interface CycleTimeData {
  avgHours: number;
  p50Hours: number;
  p90Hours: number;
  sampleSize: number;
  manualAvgHours: number;
  autoAvgHours: number;
}

interface DwellResponse {
  truncated?: boolean;
  totalOrders: number;
  statuses: DwellStatusRow[];
  cycleTime: CycleTimeData;
}

export default function DwellTimeTab({ startDate, endDate, mode }: MovementFilterProps) {
  const [data, setData] = useState<DwellResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMovement<DwellResponse>("dwell-time", {
        startDate,
        endDate,
        mode,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل بيانات زمن المكوث");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, mode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statuses = data?.statuses ?? [];
  const cycleTime = data?.cycleTime;
  const slowest = statuses[0];
  const fastest = statuses[statuses.length - 1];
  const totalSamples = statuses.reduce((sum, row) => sum + row.entries, 0);
  const maxAvg = slowest?.avgHours ?? 0;
  const chartData = useMemo(
    () =>
      statuses
        .slice(0, 15)
        .map((row) => ({ ...row, name: getStatusLabel(row.status) })),
    [statuses],
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;
  if (!data || statuses.length === 0) return <EmptyState />;

  return (
    <div className="space-y-6">
      <TruncatedNotice truncated={data?.truncated} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="أبطأ حالة"
          value={slowest ? getStatusLabel(slowest.status) : "-"}
          hint={slowest ? `متوسط ${formatDuration(slowest.avgHours)}` : undefined}
          icon={Hourglass}
          gradient="from-orange-500 to-red-600"
        />
        <KpiCard
          label="أسرع حالة"
          value={fastest ? getStatusLabel(fastest.status) : "-"}
          hint={fastest ? `متوسط ${formatDuration(fastest.avgHours)}` : undefined}
          icon={Gauge}
          gradient="from-emerald-500 to-teal-600"
        />
        <KpiCard
          label="متوسط زمن الدورة"
          value={cycleTime ? formatDuration(cycleTime.avgHours) : "-"}
          hint={
            cycleTime
              ? `يدوي ${formatDuration(cycleTime.manualAvgHours)} · تلقائي ${formatDuration(cycleTime.autoAvgHours)}`
              : undefined
          }
          icon={Clock}
          gradient="from-indigo-500 to-violet-600"
        />
        <KpiCard
          label="العينات"
          value={formatNumber(totalSamples)}
          hint={cycleTime ? `${formatNumber(cycleTime.sampleSize)} طلب اكتمل` : undefined}
          icon={Layers}
          gradient="from-cyan-500 to-blue-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MovementCard title="المكوث لكل حالة" subtitle="متوسط الساعات مع مؤشر P90">
          <div className="space-y-4">
            {statuses.map((row) => {
              const width = maxAvg > 0 ? (row.avgHours / maxAvg) * 100 : 0;
              const p90Pos = maxAvg > 0 ? Math.min(100, (row.p90Hours / maxAvg) * 100) : 0;
              const highP90 = row.p90Hours > 48;
              return (
                <div key={row.status}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StatusPill code={row.status} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatNumber(row.entries)} عينة
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <AutoBadge auto={false} />
                        {formatNumber(row.manualEntries)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <AutoBadge auto={true} />
                        {formatNumber(row.autoEntries)}
                      </span>
                    </div>
                  </div>
                  <div className="relative mt-2 h-3 rounded-full bg-gray-100 dark:bg-gray-800" dir="ltr">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      style={{ width: `${width}%` }}
                    />
                    <div
                      className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-amber-500"
                      style={{ left: `${p90Pos}%` }}
                      title={`P90 ${formatDuration(row.p90Hours)}`}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-gray-500 dark:text-gray-400">
                      المتوسط {formatDuration(row.avgHours)}
                    </span>
                    <span
                      className={
                        highP90
                          ? "font-medium text-amber-600 dark:text-amber-400"
                          : "text-gray-400 dark:text-gray-500"
                      }
                    >
                      P90 {formatDuration(row.p90Hours)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </MovementCard>

        <MovementCard title="متوسط المكوث بالحالة" subtitle="أعلى 15 حالة حسب المتوسط">
          <div className="h-[360px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis
                  dataKey="name"
                  stroke="#9CA3AF"
                  fontSize={11}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                />
                <YAxis stroke="#9CA3AF" fontSize={11} />
                <Tooltip
                  cursor={{ fill: "rgba(99,102,241,0.08)" }}
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value) => formatDuration(Number(value))}
                  labelFormatter={(label) => String(label)}
                />
                <Bar dataKey="avgHours" name="متوسط المكوث" radius={[8, 8, 0, 0]}>
                  {chartData.map((row, index) => (
                    <Cell key={row.status} fill={statusChartColor(row.status, index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </MovementCard>
      </div>
    </div>
  );
}
