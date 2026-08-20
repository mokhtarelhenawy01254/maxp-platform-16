import React, { useCallback, useEffect, useState } from "react";
import { GitBranch, Package, MousePointerClick, Bot, TrendingDown, TrendingUp } from "lucide-react";
import { Sankey, Tooltip, ResponsiveContainer } from "recharts";
import {
  fetchMovement,
  KpiCard,
  StatusPill,
  LoadingState,
  ErrorState,
  EmptyState,
  MovementCard,
  CHART_TOOLTIP_STYLE,
  formatNumber,
  getStatusLabel,
  statusChartColor,
  type MovementFilterProps,
  TruncatedNotice,
} from "../orderMovementShared";

interface SankeyNodeData {
  id: string;
  name: string;
}

interface SankeyLinkData {
  source: number;
  target: number;
  value: number;
  manual: number;
  auto: number;
  revenue: number;
}

interface SankeyData {
  truncated?: boolean;
  totalTransitions: number;
  totalOrders: number;
  modes: { manual: number; auto: number };
  nodes: SankeyNodeData[];
  links: SankeyLinkData[];
  topInflows: { status: string; count: number }[];
  topOutflows: { status: string; count: number }[];
}

function SankeyNodeComponent(props: any) {
  const { x, y, width, height, index, payload } = props;
  const id = String(payload?.id ?? "");
  const fill = id === "START" ? "#6366F1" : statusChartColor(id, index);
  const label = id === "START" ? "╪¿╪»╪º┘è╪⌐" : getStatusLabel(id);
  const nodeHeight = Math.max(height, 2);
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={nodeHeight}
        rx={4}
        fill={fill}
        fillOpacity={0.92}
      />
      <text
        x={x + width + 8}
        y={y + nodeHeight / 2 + 4}
        textAnchor="start"
        fontSize={12}
        fontWeight={600}
        fill="currentColor"
        className="fill-gray-800 dark:fill-gray-100"
      >
        {label}
      </text>
    </g>
  );
}

function SankeyLinkComponent(props: any) {
  const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, payload } = props;
  const manualShare = payload?.value ? (payload.manual ?? 0) / payload.value : 0;
  const color = manualShare > 0.5 ? "#0EA5E9" : "#8B5CF6";
  const path = `M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`;
  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeOpacity={Math.min(1, 0.28 + (payload?.value ?? 1) * 0.0005)}
        strokeWidth={Math.max(2, linkWidth)}
        strokeLinecap="round"
      />
    </g>
  );
}

function FlowList({ title, icon: Icon, rows, color }: { title: string; icon: React.ComponentType<{ className?: string }>; rows: { status: string; count: number }[]; color: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <MovementCard title={title}>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">┘ä╪º ╪¬┘ê╪¼╪» ╪¿┘è╪º┘å╪º╪¬</p>
        ) : (
          rows.slice(0, 8).map((row, i) => (
            <div key={row.status} className="flex items-center gap-3">
              <Icon className="h-4 w-4 shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <StatusPill code={row.status} />
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">{formatNumber(row.count)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700/60">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(row.count / max) * 100}%`, backgroundColor: color }} />
                </div>
              </div>
              <span className="w-6 text-left text-xs text-gray-400">{i + 1}</span>
            </div>
          ))
        )}
      </div>
    </MovementCard>
  );
}

export default function SankeyTab({ startDate, endDate, mode }: MovementFilterProps) {
  const [data, setData] = useState<SankeyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMovement<SankeyData>("sankey", { startDate, endDate, mode });
      setData(result);
    } catch {
      setError("╪¬╪╣╪░╪▒ ╪¬╪¡┘à┘è┘ä ╪«╪▒┘è╪╖╪⌐ ╪º┘ä╪¬╪»┘ü┘é");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data || data.links.length === 0) return <EmptyState />;

  const chartHeight = Math.max(420, Math.min(760, 90 + data.nodes.length * 44));
  const manualShare = data.totalTransitions ? (data.modes.manual / data.totalTransitions) * 100 : 0;

  return (
    <div className="space-y-6">
      <TruncatedNotice truncated={data?.truncated} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪¡╪▒┘â╪º╪¬" value={formatNumber(data.totalTransitions)} icon={GitBranch} hint={`┘à┘å ${formatNumber(data.totalOrders)} ╪╖┘ä╪¿`} />
        <KpiCard label="╪¡╪▒┘â╪º╪¬ ┘è╪»┘ê┘è╪⌐" value={formatNumber(data.modes.manual)} icon={MousePointerClick} gradient="from-sky-500 to-blue-600" hint={`${manualShare.toFixed(1)}%`} />
        <KpiCard label="╪¡╪▒┘â╪º╪¬ ╪¬┘ä┘é╪º╪ª┘è╪⌐" value={formatNumber(data.modes.auto)} icon={Bot} gradient="from-violet-500 to-fuchsia-600" hint={`${(100 - manualShare).toFixed(1)}%`} />
        <KpiCard label="╪╣╪»╪» ╪º┘ä╪¡╪º┘ä╪º╪¬" value={formatNumber(data.nodes.length - 1)} icon={Package} gradient="from-emerald-500 to-teal-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <MovementCard title="╪«╪▒┘è╪╖╪⌐ ╪¬╪»┘ü┘é ╪¡╪▒┘â╪⌐ ╪º┘ä╪╖┘ä╪¿╪º╪¬" subtitle="╪╣╪▒╪╢ ╪¡╪¼┘à ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘à┘å╪¬┘é┘ä╪⌐ ╪¿┘è┘å ╪º┘ä╪¡╪º┘ä╪º╪¬ ΓÇö ╪│┘à╪º┘â╪⌐ ╪º┘ä╪«╪╖ ╪¬╪╣╪¿╪▒ ╪╣┘å ╪º┘ä╪╣╪»╪»">
            <div className="overflow-x-auto">
              <div style={{ height: chartHeight, minWidth: 640 }} dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <Sankey
                    data={{ nodes: data.nodes, links: data.links }}
                    nodeWidth={14}
                    nodePadding={16}
                    linkCurvature={0.6}
                    margin={{ top: 12, bottom: 12, left: 12, right: 170 }}
                    node={<SankeyNodeComponent />}
                    link={<SankeyLinkComponent />}
                  >
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const item = payload[0];
                        if (!item) return null;
                        const link = item.payload as SankeyLinkData | undefined;
                        if (!link || typeof link.source !== "number") return null;
                        const from = data.nodes[link.source];
                        const to = data.nodes[link.target];
                        if (!from || !to) return null;
                        return (
                          <div style={CHART_TOOLTIP_STYLE} className="rounded-xl px-3 py-2">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {from.id === "START" ? "╪¿╪»╪º┘è╪⌐" : getStatusLabel(from.id)} ΓåÉ {to.id === "START" ? "╪¿╪»╪º┘è╪⌐" : getStatusLabel(to.id)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-300">{formatNumber(link.value)} ╪╖┘ä╪¿</div>
                            <div className="text-xs text-gray-600 dark:text-gray-300">
                              ┘è╪»┘ê┘è {formatNumber(link.manual)} ┬╖ ╪¬┘ä┘é╪º╪ª┘è {formatNumber(link.auto)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-300">╪Ñ┘è╪▒╪º╪» {formatNumber(link.revenue)} ╪¼.┘à</div>
                          </div>
                        );
                      }}
                    />
                  </Sankey>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-700/60 dark:text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> ╪«╪╖ ╪ú╪▓╪▒┘é = ╪¡╪▒┘â╪⌐ ┘è╪»┘ê┘è╪⌐ ╪║╪º┘ä╪¿╪º┘ï
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" /> ╪«╪╖ ╪¿┘å┘ü╪│╪¼┘è = ╪¡╪▒┘â╪⌐ ╪¬┘ä┘é╪º╪ª┘è╪⌐ ╪║╪º┘ä╪¿╪º┘ï
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> ╪╣┘é╪»╪⌐ ╪º┘ä╪¿╪»╪º┘è╪⌐
              </span>
            </div>
          </MovementCard>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:col-span-2">
          <FlowList title="╪ú╪╣┘ä┘ë ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪»╪«┘ê┘ä╪º┘ï" icon={TrendingDown} rows={data.topInflows} color="#0EA5E9" />
          <FlowList title="╪ú╪╣┘ä┘ë ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪«╪▒┘ê╪¼╪º┘ï" icon={TrendingUp} rows={data.topOutflows} color="#8B5CF6" />
        </div>
      </div>
    </div>
  );
}
