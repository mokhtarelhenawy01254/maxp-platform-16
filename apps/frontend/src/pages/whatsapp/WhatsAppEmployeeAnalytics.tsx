import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Clock,
  Inbox,
  MessageSquare,
  Send,
  UserCheck,
  UserX,
  Users,
  RefreshCw,
  Calendar,
  Trophy,
  ArrowDown,
  Activity,
  Zap,
  Target,
  Layers,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useMotionValue,
  animate as fmAnimate,
  useTransform,
} from "framer-motion";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  LineChart,
  Line,
  Brush,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WhatsAppPageShell,
} from "./components/WhatsAppPageShell";
import { apiClient, type ApiRequestConfig } from "../../services/apiClient";

interface EmployeeStat {
  userId: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
  assignedConversations: number;
  repliedConversations: number;
  unrepliedConversations: number;
  incomingMessages: number;
  outgoingMessages: number;
  responseRate: number;
  avgResponseTimeMs: number | null;
  avgResponseTimeMin: number | null;
}

interface AnalyticsSummary {
  totalIncomingConversations: number;
  totalAssigned: number;
  totalReplied: number;
  totalUnreplied: number;
  totalIncomingMessages: number;
  totalOutgoingMessages: number;
  overallResponseRate: number;
  overallAvgResponseTimeMs: number | null;
  overallAvgResponseTimeMin: number | null;
  activeEmployees: number;
}

interface AnalyticsResponse {
  success: boolean;
  period: { start: string; end: string };
  summary: AnalyticsSummary;
  employees: EmployeeStat[];
}

// ─── Animation Variants ─────────────────────────────────────────────
const containerStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
} as const;

const itemSlide = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 280, damping: 24 },
  },
} as const;

const noMotion = {
  hidden: { opacity: 1 },
  show: { opacity: 1 },
} as const;

// ─── CountUp: animated number ────────────────────────────────────────
const CountUp: React.FC<{
  value: number;
  duration?: number;
  reducedMotion?: boolean;
  format?: (v: number) => string;
}> = ({ value, duration = 0.8, reducedMotion = false, format }) => {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) =>
    format ? format(v) : Math.round(v).toLocaleString("en-US"),
  );
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reducedMotion) {
      mv.set(value);
      if (ref.current) ref.current.textContent = format ? format(value) : Math.round(value).toLocaleString("en-US");
      return;
    }
    const controls = fmAnimate(mv, value, { duration, ease: "easeOut" });
    const unsub = rounded.on("change", (text) => {
      if (ref.current) ref.current.textContent = text;
    });
    return () => { controls.stop(); unsub(); };
  }, [value, duration, reducedMotion, mv, rounded, format]);

  return <span ref={ref}>{format ? format(0) : "0"}</span>;
};

// ─── DeltaChip: shows % change vs previous period ─────────────────────
const DeltaChip: React.FC<{ delta: number | null }> = ({ delta }) => {
  if (delta == null) return null;
  const isUp = delta > 0;
  const isFlat = delta === 0;
  const Icon = isUp ? TrendingUp : isFlat ? Minus : TrendingDown;
  const colorClass = isUp
    ? "text-[color:var(--color-success)] bg-success/10"
    : isFlat
      ? "text-muted-foreground bg-muted/50"
      : "text-[color:var(--color-destructive)] bg-destructive/10";

  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${colorClass}`}>
      <Icon className="size-2.5" />
      {isUp ? "+" : ""}{delta.toFixed(1)}%
    </span>
  );
};

// ─── Sparkline: tiny inline trend line ────────────────────────────────
const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (!data.length) return null;
  const chartData = data.map((v, i) => ({ x: i, y: v }));
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={chartData} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <Line
          type="monotone"
          dataKey="y"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={true}
          animationDuration={400}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// ─── Glass Metric Card ──────────────────────────────────────────────
const GlassMetric: React.FC<{
  label: string;
  value: number;
  hint?: string;
  icon: React.ElementType;
  gradient: string;
  delay?: number;
  delta?: number | null;
  sparkData?: number[];
  sparkColor?: string;
  reducedMotion?: boolean;
}> = ({ label, value, hint, icon: Icon, gradient, delay = 0, delta = null, sparkData, sparkColor = "#6366f1", reducedMotion = false }) => (
  <motion.div
    variants={itemSlide}
    whileHover={reducedMotion ? undefined : { y: -3 }}
    transition={{ type: "spring", stiffness: 400, damping: 17 }}
    className="relative overflow-hidden rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/80 p-4 shadow-sm backdrop-blur-xl sm:rounded-3xl sm:p-5"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div
      className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full opacity-[0.07] blur-2xl"
      style={{ background: gradient }}
    />
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground sm:text-[11px]">
            {label}
          </p>
          <DeltaChip delta={delta} />
        </div>
        <p className="text-2xl font-bold tracking-tight sm:text-3xl">
          <CountUp value={value} reducedMotion={reducedMotion} />
        </p>
        {hint && (
          <p className="text-[11px] text-muted-foreground sm:text-xs">{hint}</p>
        )}
        {sparkData && sparkData.length > 1 && (
          <div className="mt-1 -mb-1">
            <Sparkline data={sparkData} color={sparkColor} />
          </div>
        )}
      </div>
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] sm:size-11 sm:rounded-2xl"
        style={{ background: gradient }}
      >
        <Icon className="size-5 text-white sm:size-5.5" />
      </div>
    </div>
  </motion.div>
);

// ─── Radial Progress Ring ───────────────────────────────────────────
const RadialProgress: React.FC<{
  value: number;
  label: string;
  size?: number;
}> = ({ value, label, size = 120 }) => {
  const data = [{ name: label, value: Math.min(100, value), fill: "url(#gradRing)" }];
  return (
    <div className="relative flex flex-col items-center">
      <ResponsiveContainer width={size} height={size}>
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <defs>
            <linearGradient id="gradRing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            background={{ fill: "var(--color-muted)" }}
            dataKey="value"
            cornerRadius={12}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold sm:text-2xl">{value}%</span>
        <span className="text-[10px] text-muted-foreground sm:text-xs">{label}</span>
      </div>
    </div>
  );
};

// ─── Ranking Row with Progress Bar ──────────────────────────────────
const RankingRow: React.FC<{
  emp: EmployeeStat;
  idx: number;
  max: number;
  variant: "top" | "low";
  reducedMotion?: boolean;
}> = ({ emp, idx, max, variant, reducedMotion = false }) => {
  const isTop = variant === "top";
  const medalColors = isTop
    ? ["bg-amber-500/20 text-amber-600", "bg-slate-400/20 text-slate-600", "bg-orange-700/20 text-orange-700"]
    : [];
  const barColor = isTop
    ? "from-indigo-500 to-violet-500"
    : "from-rose-400 to-rose-500/60";
  const barWidth = Math.max(4, (emp.outgoingMessages / max) * 100);

  return (
    <motion.div
      variants={reducedMotion ? noMotion : itemSlide}
      className="flex items-center gap-3"
    >
      <div
        className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          isTop && idx < 3 ? medalColors[idx] : "bg-muted text-muted-foreground"
        }`}
      >
        {isTop && idx < 3 ? (
          <Trophy className="size-3.5" />
        ) : (
          idx + 1
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{emp.userName}</span>
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
            {emp.outgoingMessages} رسالة
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted/60">
          <motion.div
            initial={reducedMotion ? { width: `${barWidth}%` } : { width: 0 }}
            animate={{ width: `${barWidth}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 18, delay: reducedMotion ? 0 : 0.1 * idx }}
            className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
          />
        </div>
      </div>
    </motion.div>
  );
};

type DatePreset = "today" | "yesterday" | "7days" | "30days" | "thisMonth" | "custom";

const presetLabels: Record<DatePreset, string> = {
  today: "اليوم",
  yesterday: "أمس",
  "7days": "آخر ٧ أيام",
  "30days": "آخر ٣٠ يوم",
  thisMonth: "هذا الشهر",
  custom: "نطاق مخصص",
};

const presetOrder: DatePreset[] = ["today", "yesterday", "7days", "30days", "thisMonth", "custom"];

function getPresetRange(preset: DatePreset): { start: string; end: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fmt = (d: Date) => d.toISOString().substring(0, 10);
  switch (preset) {
    case "today":
      return { start: fmt(today), end: fmt(today) };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { start: fmt(y), end: fmt(y) };
    }
    case "7days": {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      return { start: fmt(s), end: fmt(today) };
    }
    case "30days": {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      return { start: fmt(s), end: fmt(today) };
    }
    case "thisMonth": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: fmt(s), end: fmt(today) };
    }
    default:
      return { start: "", end: "" };
  }
}

const WhatsAppEmployeeAnalytics: React.FC<{
  companyId?: string;
}> = ({ companyId }) => {
  const reduceMotion = useReducedMotion() ?? false;
  const withCompanyConfig = useCallback(
    (config: ApiRequestConfig = {}) =>
      companyId ? { ...config, _companyId: companyId } : config,
    [companyId],
  );

  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [prevData, setPrevData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [preset, setPreset] = useState<DatePreset>("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const activeRange = useMemo(() => {
    if (preset === "custom") return { start: startDate, end: endDate };
    return getPresetRange(preset);
  }, [preset, startDate, endDate]);

  // Compute previous period range (same length, shifted back)
  const prevRange = useMemo(() => {
    const s = new Date(activeRange.start);
    const e = new Date(activeRange.end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
    const diffMs = e.getTime() - s.getTime();
    const oneDay = 86400000;
    const prevEnd = new Date(s.getTime() - oneDay);
    const prevStart = new Date(prevEnd.getTime() - diffMs);
    return { start: prevStart.toISOString().substring(0, 10), end: prevEnd.toISOString().substring(0, 10) };
  }, [activeRange.start, activeRange.end]);

  const loadData = async (silent = false) => {
    if (!activeRange.start || !activeRange.end) return;
    if (new Date(activeRange.end) < new Date(activeRange.start)) {
      tToast.error("WhatsAppEmployeeAnalytics.msg_2f97");
      return;
    }
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const params: Record<string, string> = {
        startDate: activeRange.start,
        endDate: activeRange.end,
      };
      const [currRes, prevRes] = await Promise.all([
        apiClient.get("/whatsapp-inbox/employee-analytics", withCompanyConfig({ params })),
        prevRange
          ? apiClient.get("/whatsapp-inbox/employee-analytics", withCompanyConfig({ params: { startDate: prevRange.start, endDate: prevRange.end } }))
          : Promise.resolve(null),
      ]);
      setData(currRes.data as AnalyticsResponse);
      setPrevData(prevRes ? (prevRes as unknown as AnalyticsResponse) : null);
    } catch {
      tToast.error("WhatsAppEmployeeAnalytics.failed_load_61c5");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRange.start, activeRange.end]);

  const summary = data?.summary;
  const employees = data?.employees || [];
  const prevSummary = prevData?.summary;

  // Compute delta percentages
  const computeDelta = (curr: number | null | undefined, prev: number | null | undefined): number | null => {
    if (curr == null || prev == null || prev === 0) return null;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  const deltas = useMemo(() => {
    if (!summary || !prevSummary) return null;
    return {
      incoming: computeDelta(summary.totalIncomingConversations, prevSummary.totalIncomingConversations),
      replied: computeDelta(summary.totalReplied, prevSummary.totalReplied),
      unreplied: computeDelta(summary.totalUnreplied, prevSummary.totalUnreplied),
      outgoing: computeDelta(summary.totalOutgoingMessages, prevSummary.totalOutgoingMessages),
    };
  }, [summary, prevSummary]);

  // Build sparkline data from prev+current per-employee aggregated metrics
  const sparkData = useMemo(() => {
    if (!summary || !prevSummary) return null;
    return {
      incoming: [prevSummary.totalIncomingConversations, summary.totalIncomingConversations],
      replied: [prevSummary.totalReplied, summary.totalReplied],
      unreplied: [prevSummary.totalUnreplied, summary.totalUnreplied],
      outgoing: [prevSummary.totalOutgoingMessages, summary.totalOutgoingMessages],
    };
  }, [summary, prevSummary]);

  const sortedEmployees = useMemo(() =>
    [...employees].sort((a, b) => b.assignedConversations - a.assignedConversations),
    [employees],
  );

  const topActive = useMemo(() =>
    [...employees].sort((a, b) => b.outgoingMessages - a.outgoingMessages).slice(0, 5),
    [employees],
  );

  const leastActive = useMemo(() =>
    [...employees].sort((a, b) => a.outgoingMessages - b.outgoingMessages).slice(0, 5),
    [employees],
  );

  const maxMessages = topActive[0]?.outgoingMessages || 1;
  const avgAssignedConv = useMemo(
    () => employees.reduce((s, e) => s + e.assignedConversations, 0) / Math.max(1, employees.length),
    [employees],
  );

  // Chart data for per-employee bars
  const chartData = useMemo(() =>
    employees
      .sort((a, b) => b.outgoingMessages - a.outgoingMessages)
      .slice(0, 10)
      .map((e) => ({
        name: e.userName?.split(" ")[0] || "?",
        صادرة: e.outgoingMessages,
        واردة: e.incomingMessages,
        محادثات: e.assignedConversations,
      })),
    [employees],
  );

  return (
    <WhatsAppPageShell
      title="تحليل أداء الموظفين"
      description="متابعة إحصائيات المحادثات والرسائل وأوقات الرد لكل موظف"
      icon={BarChart3}
      eyebrow="WhatsApp Analytics"
      actions={
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {presetOrder.map((p) => (
              <Button
                key={p}
                variant={preset === p ? "default" : "outline"}
                size="sm"
                className="h-7 px-2.5 text-[11px]"
                onClick={() => {
                  setPreset(p);
                  if (p !== "custom") {
                    const r = getPresetRange(p);
                    setStartDate(r.start);
                    setEndDate(r.end);
                  }
                }}
              >
                {presetLabels[p]}
              </Button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Calendar className="size-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 w-auto text-xs"
                />
              </div>
              <span className="text-xs text-muted-foreground">إلى</span>
              <Input
                type="date"
                value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                className="h-8 w-auto text-xs"
              />
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} />
            تحديث
          </Button>
        </>
      }
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl sm:rounded-3xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Skeleton className="h-72 rounded-2xl sm:rounded-3xl" />
              <Skeleton className="h-72 rounded-2xl sm:rounded-3xl lg:col-span-2" />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Skeleton className="h-56 rounded-2xl sm:rounded-3xl" />
              <Skeleton className="h-56 rounded-2xl sm:rounded-3xl" />
            </div>
            <Skeleton className="h-96 rounded-2xl sm:rounded-3xl" />
          </motion.div>
        ) : summary ? (
          <motion.div
            key="content"
            initial="hidden"
            animate="show"
            variants={reduceMotion ? noMotion : containerStagger}
            className="space-y-4 sm:space-y-6"
          >
            {/* ─── Row 1: Hero Metrics (4 cards) ─────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <GlassMetric
                label="محادثات واردة"
                value={summary.totalIncomingConversations}
                hint="العميل بدأها"
                icon={Inbox}
                gradient="linear-gradient(135deg, #6366f1, #4f46e5)"
                delay={0}
                delta={deltas?.incoming ?? null}
                sparkData={sparkData?.incoming}
                sparkColor="#6366f1"
                reducedMotion={reduceMotion}
              />
              <GlassMetric
                label="مردود عليها"
                value={summary.totalReplied}
                hint={`من ${summary.totalIncomingConversations} واردة`}
                icon={MessageSquare}
                gradient="linear-gradient(135deg, #10b981, #059669)"
                delay={60}
                delta={deltas?.replied ?? null}
                sparkData={sparkData?.replied}
                sparkColor="#10b981"
                reducedMotion={reduceMotion}
              />
              <GlassMetric
                label="غير مردود عليها"
                value={summary.totalUnreplied}
                hint="بحاجة لمتابعة"
                icon={UserX}
                gradient="linear-gradient(135deg, #f43f5e, #e11d48)"
                delay={120}
                delta={deltas?.unreplied ?? null}
                sparkData={sparkData?.unreplied}
                sparkColor="#f43f5e"
                reducedMotion={reduceMotion}
              />
              <GlassMetric
                label="رسائل صادرة"
                value={summary.totalOutgoingMessages}
                hint="من الموظفين"
                icon={Send}
                gradient="linear-gradient(135deg, #06b6d4, #0891b2)"
                delay={180}
                delta={deltas?.outgoing ?? null}
                sparkData={sparkData?.outgoing}
                sparkColor="#06b6d4"
                reducedMotion={reduceMotion}
              />
            </div>

            {/* ─── Row 2: Radial Progress + Bar Chart ────────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Response Rate Radial */}
              <motion.div
                variants={reduceMotion ? noMotion : itemSlide}
                className="relative overflow-hidden rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/80 p-5 shadow-sm backdrop-blur-xl sm:rounded-3xl"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Target className="size-4 text-primary" />
                      <h3 className="text-sm font-semibold">نسبة الرد الكلية</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      من المحادثات الواردة
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-center pb-2">
                  <RadialProgress
                    value={Math.round(summary.overallResponseRate)}
                    label="نسبة الرد"
                    size={140}
                  />
                  <div className="mt-3 grid w-full grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-[color:var(--color-success)]">
                        {summary.totalReplied}
                      </p>
                      <p className="text-[10px] text-muted-foreground">مردود</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[color:var(--color-destructive)]">
                        {summary.totalUnreplied}
                      </p>
                      <p className="text-[10px] text-muted-foreground">غير مردود</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-primary">
                        {summary.overallAvgResponseTimeMin ?? "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">دقيقة رد</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Per-Employee Bar Chart */}
              <motion.div
                variants={reduceMotion ? noMotion : itemSlide}
                className="relative overflow-hidden rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/80 p-5 shadow-sm backdrop-blur-xl sm:rounded-3xl lg:col-span-2"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold">
                      مقارنة الرسائل والمحادثات (أعلى 10)
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1">
                      <span className="size-2.5 rounded-full bg-indigo-500" />
                      صادرة
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2.5 rounded-full bg-cyan-400" />
                      واردة
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2.5 rounded-full bg-violet-400" />
                      محادثات
                    </span>
                  </div>
                </div>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData} barGap={4}>
                      <defs>
                        <linearGradient id="barOutgoing" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.7} />
                        </linearGradient>
                        <linearGradient id="barIncoming" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22d3ee" />
                          <stop offset="100%" stopColor="#0891b2" stopOpacity={0.7} />
                        </linearGradient>
                        <linearGradient id="barConvos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a78bfa" />
                          <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.7} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-muted)" opacity={0.3} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <RechartsTooltip
                        cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid var(--color-border)",
                          background: "var(--color-card)",
                          fontSize: 12,
                          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                        }}
                      />
                      <Bar dataKey="محادثات" fill="url(#barConvos)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="واردة" fill="url(#barIncoming)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="صادرة" fill="url(#barOutgoing)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                      <Brush
                        dataKey="name"
                        height={20}
                        stroke="var(--color-primary)"
                        fill="var(--color-muted)"
                        travellerWidth={8}
                        className="mt-2"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[240px] flex-col items-center justify-center text-center">
                    <Activity className="mb-2 size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      لا توجد بيانات للعرض
                    </p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* ─── Row 3: Most / Least Active ─────────────────────────── */}
            {employees.length > 0 && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Most Active */}
                <motion.div
                  variants={reduceMotion ? noMotion : itemSlide}
                  className="relative overflow-hidden rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/80 p-5 shadow-sm backdrop-blur-xl sm:rounded-3xl"
                >
                  <div className="pointer-events-none absolute -left-8 -top-8 size-32 rounded-full bg-emerald-500/5 blur-3xl" />
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                        <Trophy className="size-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">الأكثر نشاطاً</h3>
                        <p className="text-[11px] text-muted-foreground">
                          أعلى رسائل صادرة
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-success/15 text-[color:var(--color-success)]">
                      <Zap className="size-3" />
                      Top {topActive.length}
                    </Badge>
                  </div>
                  <motion.div
                    initial="hidden"
                    animate="show"
                    variants={reduceMotion ? noMotion : containerStagger}
                    className="space-y-3"
                  >
                    {topActive.map((emp, idx) => (
                      <RankingRow
                        key={emp.userId}
                        emp={emp}
                        idx={idx}
                        max={maxMessages}
                        variant="top"
                        reducedMotion={reduceMotion}
                      />
                    ))}
                  </motion.div>
                </motion.div>

                {/* Least Active */}
                <motion.div
                  variants={reduceMotion ? noMotion : itemSlide}
                  className="relative overflow-hidden rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/80 p-5 shadow-sm backdrop-blur-xl sm:rounded-3xl"
                >
                  <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-rose-500/5 blur-3xl" />
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 to-rose-600 shadow-sm">
                        <ArrowDown className="size-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">الأقل نشاطاً</h3>
                        <p className="text-[11px] text-muted-foreground">
                          أقل رسائل صادرة
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-destructive/15 text-[color:var(--color-destructive)]">
                      <Activity className="size-3" />
                      Low {leastActive.length}
                    </Badge>
                  </div>
                  <motion.div
                    initial="hidden"
                    animate="show"
                    variants={reduceMotion ? noMotion : containerStagger}
                    className="space-y-3"
                  >
                    {leastActive.map((emp, idx) => (
                      <RankingRow
                        key={emp.userId}
                        emp={emp}
                        idx={idx}
                        max={maxMessages}
                        variant="low"
                        reducedMotion={reduceMotion}
                      />
                    ))}
                  </motion.div>
                </motion.div>
              </div>
            )}

            {/* ─── Row 4: Detailed Table ──────────────────────────────── */}
            <motion.div
              variants={reduceMotion ? noMotion : itemSlide}
              className="relative overflow-hidden rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/80 shadow-sm backdrop-blur-xl sm:rounded-3xl"
            >
              <div className="flex items-center justify-between border-b border-[color:var(--shell-control-border)] px-5 py-4">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <div>
                    <h3 className="text-sm font-semibold">جدول الأداء التفصيلي</h3>
                    <p className="text-[11px] text-muted-foreground">
                      إحصائيات لكل موظف
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  <Users className="size-3.5" />
                  {summary.activeEmployees} موظف
                </Badge>
              </div>

              {sortedEmployees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="mb-3 size-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    لا توجد بيانات للموظفين في هذه الفترة
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">الموظف</TableHead>
                        <TableHead className="text-center text-xs">معينة</TableHead>
                        <TableHead className="text-center text-xs">رُدّ عليها</TableHead>
                        <TableHead className="text-center text-xs">لم تُردّ</TableHead>
                        <TableHead className="text-center text-xs">رسائل صادرة</TableHead>
                        <TableHead className="text-center text-xs">نسبة الرد</TableHead>
                        <TableHead className="text-center text-xs">متوسط الرد</TableHead>
                        <TableHead className="text-center text-xs">الأداء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedEmployees.map((emp, idx) => {
                        const perfScore =
                          emp.responseRate * 0.7 + Math.min(100, emp.assignedConversations / Math.max(1, avgAssignedConv) * 100) * 0.3;
                        const perfColor =
                          perfScore >= 70
                            ? "text-[color:var(--color-success)]"
                            : perfScore >= 40
                              ? "text-amber-500"
                              : "text-[color:var(--color-destructive)]";
                        return (
                          <motion.tr
                            key={emp.userId}
                            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={reduceMotion ? { duration: 0 } : { delay: idx * 0.04, type: "spring", stiffness: 200, damping: 20 }}
                            className="group"
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-sm font-semibold text-primary">
                                    {emp.userName?.charAt(0) || "?"}
                                  </div>
                                  {idx === 0 && (
                                    <div className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-amber-500 shadow-sm">
                                      <Trophy className="size-2.5 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{emp.userName}</p>
                                  {emp.userEmail && (
                                    <p className="text-[11px] text-muted-foreground">
                                      {emp.userEmail}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="font-mono">
                                {emp.assignedConversations}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-success/15 text-[color:var(--color-success)]">
                                <UserCheck className="size-3" />
                                {emp.repliedConversations}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {emp.unrepliedConversations > 0 ? (
                                <Badge className="bg-destructive/15 text-[color:var(--color-destructive)]">
                                  <UserX className="size-3" />
                                  {emp.unrepliedConversations}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm font-medium">
                                {emp.outgoingMessages}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={`h-full rounded-full ${
                                      emp.responseRate >= 70
                                        ? "bg-success"
                                        : emp.responseRate >= 40
                                          ? "bg-amber-500"
                                          : "bg-destructive"
                                    }`}
                                    style={{ width: `${Math.min(100, emp.responseRate)}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-medium ${perfColor}`}>
                                  {emp.responseRate}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {emp.avgResponseTimeMin != null ? (
                                <span className="flex items-center justify-center gap-1 text-sm">
                                  <Clock className="size-3 text-muted-foreground" />
                                  {emp.avgResponseTimeMin} د
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className={`text-sm font-bold ${perfColor}`}>
                                  {Math.round(perfScore)}
                                </span>
                                <ChevronRight className="size-3 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </WhatsAppPageShell>
  );
};

export default WhatsAppEmployeeAnalytics;