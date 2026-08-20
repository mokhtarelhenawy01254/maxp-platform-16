import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  MousePointerClick,
  PackageCheck,
  Trophy,
  Users,
  Wallet,
  XCircle
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import ResponsiveContainer from "../../../../../components/ui/DeferredResponsiveContainer";
import {
  AutoBadge,
  CHART_TOOLTIP_STYLE,
  EmptyState,
  ErrorState,
  KpiCard,
  LoadingState,
  MovementCard,
  fetchMovement,
  formatCurrency,
  formatDuration,
  formatNumber,
  type MovementFilterProps,
  TruncatedNotice,
} from "../orderMovementShared";

interface TeamMember {
  name: string;
  changedBy: string;
  transitions: number;
  manualTransitions: number;
  autoTransitions: number;
  confirms: number;
  cancels: number;
  deliveries: number;
  invalidTransitions: number;
  avgHoursToConfirm: number;
  avgHoursToCancel: number;
  revenue: number;
  isSystem: boolean;
}

interface TeamData {
  truncated?: boolean;
  summary: {
    totalTransitions: number;
    manualTransitions: number;
    autoTransitions: number;
    activeMembers: number;
  };
  members: TeamMember[];
}

export default function TeamTab({ startDate, endDate, mode }: MovementFilterProps) {
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMovement<TeamData>("team", { startDate, endDate, mode });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "╪¡╪»╪½ ╪«╪╖╪ú ╪ú╪½┘å╪º╪í ╪¬╪¡┘à┘è┘ä ╪º┘ä╪¿┘è╪º┘å╪º╪¬");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, mode]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data || data.members.length === 0) return <EmptyState />;

  const chartData = data.members.map((member) => ({
    name: member.name,
    manual: member.manualTransitions,
    auto: member.autoTransitions
  }));

  return (
    <div className="space-y-6" dir="rtl">
      <TruncatedNotice truncated={data?.truncated} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="╪¡╪▒┘â╪º╪¬ ┘è╪»┘ê┘è╪⌐"
          value={formatNumber(data.summary.manualTransitions)}
          icon={MousePointerClick}
          gradient="from-indigo-500 to-violet-600"
          hint={`${formatNumber(data.summary.totalTransitions)} ╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪¡╪▒┘â╪º╪¬`}
        />
        <KpiCard
          label="╪¡╪▒┘â╪º╪¬ ╪¬┘ä┘é╪º╪ª┘è╪⌐"
          value={formatNumber(data.summary.autoTransitions)}
          icon={Bot}
          gradient="from-violet-500 to-fuchsia-600"
        />
        <KpiCard
          label="╪ú╪╣╪╢╪º╪í ┘å╪┤╪╖┘ê┘å"
          value={formatNumber(data.summary.activeMembers)}
          icon={Users}
          gradient="from-sky-500 to-indigo-600"
        />
      </div>

      <MovementCard
        title="╪º┘ä╪¡╪▒┘â╪º╪¬ ╪¡╪│╪¿ ╪º┘ä╪╣╪╢┘ê"
        subtitle="╪º┘ä╪¡╪▒┘â╪º╪¬ ╪º┘ä┘è╪»┘ê┘è╪⌐ ┘ê╪º┘ä╪¬┘ä┘é╪º╪ª┘è╪⌐ ┘ä┘â┘ä ╪╣╪╢┘ê"
        action={
          <div className="flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" /> ┘è╪»┘ê┘è
            </span>
            <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-violet-500" /> ╪¬┘ä┘é╪º╪ª┘è
            </span>
          </div>
        }
      >
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.12} />
              <XAxis type="number" stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
              <YAxis type="category" dataKey="name" stroke="#9CA3AF" fontSize={12} width={150} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
              <Bar dataKey="manual" name="┘è╪»┘ê┘è" fill="#6366F1" stackId="transitions" />
              <Bar dataKey="auto" name="╪¬┘ä┘é╪º╪ª┘è" fill="#8B5CF6" stackId="transitions" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </MovementCard>

      <MovementCard
        title="╪¬╪▒╪¬┘è╪¿ ╪º┘ä┘ü╪▒┘è┘é"
        subtitle="╪ú╪»╪º╪í ┘â┘ä ╪╣╪╢┘ê ╪¡╪│╪¿ ╪º┘ä╪¡╪▒┘â╪º╪¬ ┘ê╪º┘ä╪Ñ┘è╪▒╪º╪»"
        action={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-900/20 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-3 w-3" /> ╪¬╪ú┘â┘è╪»
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-900/20 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300">
              <XCircle className="h-3 w-3" /> ╪Ñ┘ä╪║╪º╪í
            </span>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-3 pr-4 pl-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5" /> ╪º┘ä╪¬╪▒╪¬┘è╪¿
                  </span>
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> ╪º┘ä╪╣╪╢┘ê
                  </span>
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1.5">
                    <PackageCheck className="h-3.5 w-3.5" /> ╪º┘ä╪¡╪▒┘â╪º╪¬
                  </span>
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> ╪¬╪ú┘â┘è╪»
                  </span>
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5" /> ╪Ñ┘ä╪║╪º╪í
                  </span>
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">╪¬╪│┘ä┘è┘à</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> ╪║┘è╪▒ ╪╡╪º┘ä╪¡╪⌐
                  </span>
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" /> ┘à╪¬┘ê╪│╪╖ ╪º┘ä╪¬╪ú┘â┘è╪»
                  </span>
                </th>
                <th className="py-3 pl-4 pr-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5" /> ╪º┘ä╪Ñ┘è╪▒╪º╪»
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((member, index) => (
                <tr
                  key={member.changedBy}
                  className="border-b border-gray-100 dark:border-gray-700/60 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
                >
                  <td className="py-3 pr-4 pl-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        index < 3
                          ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">{member.name}</span>
                      {member.isSystem && <AutoBadge auto />}
                    </div>
                  </td>
                  <td className="px-3 py-3 font-semibold text-gray-900 dark:text-white">
                    {formatNumber(member.transitions)}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-900/20 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300">
                      {formatNumber(member.confirms)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-900/20 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">
                      {formatNumber(member.cancels)}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-medium text-emerald-600 dark:text-emerald-400">
                    {formatNumber(member.deliveries)}
                  </td>
                  <td className="px-3 py-3 font-medium text-amber-600 dark:text-amber-400">
                    {formatNumber(member.invalidTransitions)}
                  </td>
                  <td className="px-3 py-3 text-gray-600 dark:text-gray-300">
                    {formatDuration(member.avgHoursToConfirm)}
                  </td>
                  <td className="py-3 pl-4 pr-3 font-medium text-indigo-600 dark:text-indigo-300">
                    {formatCurrency(member.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MovementCard>
    </div>
  );
}
