import { useCallback, useEffect, useState } from "react";
import { AlertOctagon, Banknote, Clock, Hourglass } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";
import DeferredResponsiveContainer from "../../../../../components/ui/DeferredResponsiveContainer";
import {
  AutoBadge,
  CHART_PALETTE,
  CHART_TOOLTIP_STYLE,
  EmptyState,
  ErrorState,
  KpiCard,
  LoadingState,
  MovementCard,
  StatusPill,
  fetchMovement,
  formatCurrency,
  formatDateTime,
  formatDuration,
  formatNumber,
  type MovementFilterProps,
  TruncatedNotice,
} from "../orderMovementShared";

interface AgingBucket {
  key: string;
  label: string;
  count: number;
  revenue: number;
}

interface AgingOrder {
  orderId: string;
  orderNumber: string;
  status: string;
  ageHours: number;
  total: number;
  customerName: string | null;
  governorate: string | null;
  lastTransitionAt: string | null;
  lastTransitionBy: string | null;
  lastTransitionAuto: boolean;
  updatedAt: string | null;
}

interface AgingData {
  truncated?: boolean;
  summary: {
    totalAged: number;
    oldestHours: number;
    totalRevenue: number;
    stuckOver7d: number;
  };
  buckets: AgingBucket[];
  orders: AgingOrder[];
}

export default function AgingTab({ startDate, endDate, mode }: MovementFilterProps) {
  const [data, setData] = useState<AgingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchMovement<AgingData>("aging", {
        startDate,
        endDate,
        mode,
        minAgeHours: 24,
      });
      setData(payload);
    } catch {
      setError("╪¬╪╣╪░╪▒ ╪¬╪¡┘à┘è┘ä ╪¬╪¡┘ä┘è┘ä ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘à╪╣┘ä┘é╪⌐");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data || data.summary.totalAged === 0) return <EmptyState />;

  const { summary } = data;

  return (
    <div className="space-y-6">
      <TruncatedNotice truncated={data?.truncated} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä┘à╪╣┘ä┘æ┘é"
          value={formatNumber(summary.totalAged)}
          icon={Hourglass}
        />
        <KpiCard
          label="╪º┘ä╪ú┘é╪»┘à"
          value={formatDuration(summary.oldestHours)}
          icon={Clock}
          gradient="from-amber-500 to-orange-600"
        />
        <KpiCard
          label="┘é┘è┘à╪⌐ ╪º┘ä┘ü┘ä┘ê╪│ ╪º┘ä┘à╪¡╪¿┘ê╪│╪⌐"
          value={formatCurrency(summary.totalRevenue)}
          icon={Banknote}
          gradient="from-rose-500 to-red-600"
        />
        <KpiCard
          label="╪ú┘â╪½╪▒ ┘à┘å ╪ú╪│╪¿┘ê╪╣"
          value={formatNumber(summary.stuckOver7d)}
          icon={AlertOctagon}
          gradient="from-sky-500 to-indigo-600"
          hint="╪╖┘ä╪¿╪º╪¬ ┘à╪╣┘ä┘é╪⌐ ┘à┘å╪░ ╪ú┘â╪½╪▒ ┘à┘å 7 ╪ú┘è╪º┘à"
        />
      </div>

      <MovementCard
        title="╪º┘ä╪¬┘ê╪▓┘è╪╣ ╪¡╪│╪¿ ╪º┘ä╪╣┘à╪▒"
        subtitle="╪╣╪»╪» ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘à╪╣┘ä┘é╪⌐ ┘ü┘è ┘â┘ä ┘ü╪¬╪▒╪⌐ ╪▓┘à┘å┘è╪⌐"
      >
        <div className="h-[280px]">
          <DeferredResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={data.buckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.12} />
              <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} interval={0} />
              <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "rgba(99,102,241,0.06)" }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const item = payload[0];
                  if (!item) return null;
                  const bucket = item.payload as AgingBucket | undefined;
                  if (!bucket) return null;
                  return (
                    <div
                      style={CHART_TOOLTIP_STYLE}
                      className="rounded-xl px-3 py-2"
                    >
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {bucket.label}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        {formatNumber(bucket.count)} ╪╖┘ä╪¿
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        ╪Ñ┘è╪▒╪º╪» {formatCurrency(bucket.revenue)}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {data.buckets.map((bucket, index) => (
                  <Cell
                    key={bucket.key}
                    fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </DeferredResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
          {data.buckets.map((bucket, index) => (
            <div
              key={bucket.key}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: CHART_PALETTE[index % CHART_PALETTE.length],
                  }}
                />
                <span className="truncate text-gray-700 dark:text-gray-200">
                  {bucket.label}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatNumber(bucket.count)}
                </span>
                <span className="w-20 text-left">
                  {formatCurrency(bucket.revenue)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </MovementCard>

      <MovementCard
        title="┘é╪º╪ª┘à╪⌐ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘à╪╣┘ä┘é╪⌐"
        subtitle="╪ú┘é╪»┘à ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘à╪╣┘ä┘é╪⌐ ╪ú┘ê┘ä╪º┘ï"
      >
        {data.orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 dark:border-gray-700/60 dark:text-gray-400">
                  <th className="px-4 py-3">╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿</th>
                  <th className="px-4 py-3">╪º┘ä╪¡╪º┘ä╪⌐</th>
                  <th className="px-4 py-3">╪º┘ä╪╣┘à╪▒</th>
                  <th className="px-4 py-3 text-left">╪º┘ä╪Ñ╪¼┘à╪º┘ä┘è</th>
                  <th className="px-4 py-3">╪º┘ä╪╣┘à┘è┘ä</th>
                  <th className="px-4 py-3">╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐</th>
                  <th className="px-4 py-3">╪ó╪«╪▒ ╪¡╪▒┘â╪⌐</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {data.orders.map((order) => (
                  <tr
                    key={order.orderId}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill code={order.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {formatDuration(order.ageHours)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {order.customerName || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {order.governorate || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          {formatDateTime(order.lastTransitionAt)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">
                            {order.lastTransitionBy || "-"}
                          </span>
                          <AutoBadge auto={order.lastTransitionAuto} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            ┘ä╪º ╪¬┘ê╪¼╪» ╪╖┘ä╪¿╪º╪¬ ┘à╪╣┘ä┘é╪⌐ ┘ü┘è ┘ç╪░┘ç ╪º┘ä┘ü╪¬╪▒╪⌐
          </div>
        )}
      </MovementCard>
    </div>
  );
}
