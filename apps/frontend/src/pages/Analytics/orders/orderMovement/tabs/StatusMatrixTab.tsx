import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, ArrowUpRight, ArrowDownRight, Shuffle, Ban, Info, Zap } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  type MovementFilterProps,
  type MovementMode,
  fetchMovement,
  KpiCard,
  StatusPill,
  LoadingState,
  ErrorState,
  EmptyState,
  MovementCard,
  CHART_TOOLTIP_STYLE,
  formatNumber,
  formatCurrency,
  formatPercent,
  TruncatedNotice,
} from "../orderMovementShared";

type MatrixKind = "invalid" | "backward" | "skip" | "forward" | "start" | "same" | "other";

interface MatrixRow {
  fromStatus: string;
  toStatus: string;
  count: number;
  revenue: number;
  manualCount: number;
  autoCount: number;
  kind: MatrixKind;
}

interface MatrixData {
  truncated?: boolean;
  totalTransitions: number;
  totalOrders: number;
  forwardCount: number;
  backwardCount: number;
  skipCount: number;
  invalidCount: number;
  startCount: number;
  sameCount: number;
  otherCount: number;
  rows: MatrixRow[];
  statuses: string[];
  modes: { manual: number; auto: number };
}

const KIND_META: { [K in MatrixKind]: { label: string; cell: string; dot: string; color: string } } = {
  invalid: {
    label: "غير مسموح",
    cell: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60 dark:hover:bg-red-900/30",
    dot: "bg-red-500",
    color: "#EF4444",
  },
  backward: {
    label: "تراجع",
    cell: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60 dark:hover:bg-orange-900/30",
    dot: "bg-orange-500",
    color: "#F97316",
  },
  skip: {
    label: "قفزة",
    cell: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60 dark:hover:bg-amber-900/30",
    dot: "bg-amber-500",
    color: "#F59E0B",
  },
  forward: {
    label: "تقدم",
    cell: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900/60 dark:hover:bg-green-900/30",
    dot: "bg-green-500",
    color: "#10B981",
  },
  start: {
    label: "بداية",
    cell: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60 dark:hover:bg-blue-900/30",
    dot: "bg-blue-500",
    color: "#3B82F6",
  },
  same: {
    label: "ثابت",
    cell: "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800",
    dot: "bg-gray-400",
    color: "#9CA3AF",
  },
  other: {
    label: "أخرى",
    cell: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-900/60",
    dot: "bg-slate-400",
    color: "#64748B",
  },
};

const KIND_ORDER: MatrixKind[] = ["forward", "backward", "skip", "invalid", "start", "same", "other"];

const modeLabel = (mode: MovementMode): string =>
  mode === "all" ? "جميع الحركات (يدوي + تلقائي)" : mode === "manual" ? "الحركات اليدوية فقط" : "الحركات التلقائية فقط";

const cellTitle = (row: MatrixRow): string =>
  `${KIND_META[row.kind].label} — الإجمالي: ${formatNumber(row.count)} · يدوي: ${formatNumber(row.manualCount)} · تلقائي: ${formatNumber(row.autoCount)} · الإيراد: ${formatCurrency(row.revenue)}`;

const chartDataFor = (data: MatrixData) =>
  KIND_ORDER.map((kind) => ({
    name: KIND_META[kind].label,
    value: data[`${kind}Count` as const],
    color: KIND_META[kind].color,
  })).filter((entry) => entry.value > 0);

function StartBadge() {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
      بداية
    </span>
  );
}

export default function StatusMatrixTab({ startDate, endDate, mode, onSwitchToVelocity }: MovementFilterProps) {
  const [data, setData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMovement<MatrixData>("matrix", { startDate, endDate, mode });
      setData(result);
    } catch {
      setError("تعذر تحميل مصفوفة الانتقالات");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={load} />;
  }

  if (!data || data.totalTransitions === 0) {
    return <EmptyState />;
  }

  const fromStatuses: string[] = [];
  for (const row of data.rows) {
    if (!fromStatuses.includes(row.fromStatus)) fromStatuses.push(row.fromStatus);
  }

  const cellMap = new Map<string, MatrixRow>();
  for (const row of data.rows) {
    cellMap.set(`${row.fromStatus}|${row.toStatus}`, row);
  }

  const chartData = chartDataFor(data);
  const invalidPercent = data.totalTransitions > 0 ? (data.invalidCount / data.totalTransitions) * 100 : 0;

  return (
    <div className="space-y-6">
      <TruncatedNotice truncated={data?.truncated} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="إجمالي الحركات"
          value={formatNumber(data.totalTransitions)}
          icon={ArrowRightLeft}
          gradient="from-indigo-500 to-violet-600"
          hint={`من ${formatNumber(data.totalOrders)} طلب`}
        />
        <KpiCard
          label="تقدم"
          value={formatNumber(data.forwardCount)}
          icon={ArrowUpRight}
          gradient="from-emerald-500 to-teal-600"
        />
        <KpiCard
          label="تراجع"
          value={formatNumber(data.backwardCount)}
          icon={ArrowDownRight}
          gradient="from-orange-500 to-amber-600"
        />
        <KpiCard
          label="قفزة"
          value={formatNumber(data.skipCount)}
          icon={Shuffle}
          gradient="from-amber-500 to-yellow-600"
        />
        <KpiCard
          label="غير مسموح"
          value={formatNumber(data.invalidCount)}
          icon={Ban}
          gradient="from-red-500 to-rose-600"
          hint={`نسبة ${formatPercent(invalidPercent)}`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/20 px-4 py-3 text-xs text-indigo-700 dark:text-indigo-300">
        <Info className="h-4 w-4 shrink-0" />
        <span>
          تعرض المصفوفة الانتقالات من حالة إلى أخرى ({modeLabel(mode)}) — الأخضر تقدم، البرتقالي تراجع، الكهرماني قفزة،
          الأزرق بداية، الرمادي ثابت، الأحمر انتقال غير مسموح (مخالف لقواعد الحالات).
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-white dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-slate-900 p-3.5 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-blue-950 dark:text-blue-100">
              تريد معرفة عدد الأوردرات التي تم شحنها وتوزيعها بحسب تاريخ ورود كل طلب (Order Vintage)؟
            </div>
            <div className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
              شاهد كم أوردر خرج شحن اليوم، وكم منها من نفس اليوم، أمس، قبل يومين، أو متأخر، مع إمكانية تصدير وفحص الطلبات.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSwitchToVelocity?.()}
          className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-95"
        >
          <span>عرض سرعة الإنجاز وشحن اليوم</span>
          <span aria-hidden="true">←</span>
        </button>
      </div>

      <MovementCard
        title="مصفوفة الانتقالات"
        subtitle="عدد الحركات من كل حالة إلى أخرى — الشريط داخل الخلية يقسم اليدوي (أزرق) والتلقائي (بنفسجي)"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="rounded-xl bg-gray-100 px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  من \ إلى
                </th>
                {data.statuses.map((toStatus) => (
                  <th key={toStatus} className="px-1 py-1 text-center">
                    <StatusPill code={toStatus} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fromStatuses.map((fromStatus) => (
                <tr key={fromStatus}>
                  <td className="rounded-xl bg-gray-100 px-3 py-2 dark:bg-gray-800">
                    {fromStatus === "__start__" ? <StartBadge /> : <StatusPill code={fromStatus} />}
                  </td>
                  {data.statuses.map((toStatus) => {
                    const cell = cellMap.get(`${fromStatus}|${toStatus}`);
                    if (!cell) {
                      return (
                        <td key={toStatus}>
                          <div className="py-3 text-center text-xs text-gray-300 dark:text-gray-600">-</div>
                        </td>
                      );
                    }
                    const autoPct = cell.count > 0 ? (cell.autoCount / cell.count) * 100 : 0;
                    const manualPct = cell.count > 0 ? (cell.manualCount / cell.count) * 100 : 0;
                    return (
                      <td key={toStatus}>
                        <div
                          title={cellTitle(cell)}
                          className={`rounded-xl border px-2 py-2 text-center transition-colors ${KIND_META[cell.kind].cell}`}
                        >
                          <p className="text-sm font-bold leading-none">{formatNumber(cell.count)}</p>
                          <p className="mt-0.5 text-[10px] leading-none opacity-75">{formatCurrency(cell.revenue)}</p>
                          <div className="mt-1.5 flex h-1 w-full overflow-hidden rounded-full bg-gray-200/70 dark:bg-gray-700/50">
                            <div className="bg-sky-500" style={{ width: `${manualPct}%` }} />
                            <div className="bg-violet-500" style={{ width: `${autoPct}%` }} />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-gray-100 pt-4 dark:border-gray-700/60">
          {KIND_ORDER.map((kind) => (
            <span key={kind} className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className={`h-2.5 w-2.5 rounded-full ${KIND_META[kind].dot}`} />
              {KIND_META[kind].label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            يدوي
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
            تلقائي
          </span>
        </div>
      </MovementCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <MovementCard
          title="توزيع أنواع الانتقالات"
          subtitle="حصة كل نوع من إجمالي الحركات في هذه الفترة"
          className="lg:col-span-2"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </MovementCard>

        <MovementCard title="ملخص الوضع" subtitle="إحصاءات سريعة لمصفوفة الانتقالات">
          <ul className="space-y-3">
            {KIND_ORDER.map((kind) => {
              const count = data[`${kind}Count` as const];
              return (
                <li key={kind} className="flex items-center justify-between gap-2 text-sm">
                  <span className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <span className={`h-2.5 w-2.5 rounded-full ${KIND_META[kind].dot}`} />
                    {KIND_META[kind].label}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(count)}</span>
                </li>
              );
            })}
            <li className="flex items-center justify-between gap-2 border-t border-gray-100 pt-3 text-sm dark:border-gray-700/60">
              <span className="text-gray-500 dark:text-gray-400">حركات يدوية / تلقائية</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatNumber(data.modes.manual)} / {formatNumber(data.modes.auto)}
              </span>
            </li>
          </ul>
        </MovementCard>
      </div>
    </div>
  );
}
