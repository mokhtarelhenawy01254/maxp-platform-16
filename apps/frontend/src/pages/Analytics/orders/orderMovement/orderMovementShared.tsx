import React from "react";
import { apiClient } from "../../../../services/apiClient";
import { getStatusDisplay } from "../../../../utils/statusRegistry";
import { AlertTriangle, Inbox, RefreshCw, ArrowUpRight, ArrowDownRight } from "lucide-react";

export type MovementMode = "all" | "manual" | "auto";

export interface MovementFilterProps {
  startDate: string;
  endDate: string;
  mode: MovementMode;
  onSwitchToVelocity?: () => void;
}

export interface MovementHistoryEntry {
  status: string;
  oldStatus: string | null;
  changedBy: string | null;
  userName: string | null;
  reason: string | null;
  createdAt: string;
  auto: boolean;
}

export const fetchMovement = async <T,>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  const res = await apiClient.get<{ success: boolean; data: T }>(
    `/analytics/order-movement/${path}?${qs.toString()}`,
  );
  return res.data.data;
};

export const getStatusLabel = (code: string): string => {
  const c = String(code || "").toUpperCase();
  if (!c) return "-";
  return getStatusDisplay(c).label;
};

export const getStatusColorClass = (code: string): string => {
  const c = String(code || "").toUpperCase();
  if (!c) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  return getStatusDisplay(c).colorClass;
};

export const STATUS_CHART_COLORS: Record<string, string> = {
  PENDING: "#F59E0B",
  DRAFT: "#9CA3AF",
  CONFIRMED: "#3B82F6",
  SCHEDULED: "#F97316",
  ON_HOLD: "#FB923C",
  PROCESSING: "#6366F1",
  SHIPPED: "#A855F7",
  DELIVERED: "#10B981",
  CANCELLED: "#EF4444",
  DUPLICATE_ORDER: "#FBBF24",
  REFUNDED: "#6B7280",
  PARTIALLY_REFUNDED: "#9CA3AF",
  RETURNED: "#EC4899",
  PARTIALLY_RETURNED: "#F472B6",
  PARTIALLY_DELIVERED: "#14B8A6",
  EXCHANGED: "#8B5CF6",
  TRASH: "#6B7280",
  READY_TO_SHIP: "#22C55E",
  OUT_FOR_DELIVERY: "#C084FC",
  LOST: "#DC2626",
  PENDING_PREPARATION: "#EAB308",
  PREPARING: "#60A5FA",
  READY: "#34D399",
  QUALITY_CHECK: "#06B6D4",
  PACKAGED: "#2DD4BF",
  ON_HOLD_PREP: "#FACC15",
  NOT_SHIPPED: "#9CA3AF",
  STOCK_SHORTAGE: "#F43F5E",
  SHORTAGE_FAILED: "#7C3AED",
  PENDING_CANCELLATION: "#F472B6",
};

export const CHART_PALETTE = [
  "#6366F1", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981",
  "#3B82F6", "#EF4444", "#14B8A6", "#A855F7", "#F97316",
  "#22C55E", "#06B6D4", "#F43F5E", "#EAB308", "#64748B",
];

export const statusChartColor = (code: string, index = 0): string => {
  const direct = STATUS_CHART_COLORS[String(code || "").toUpperCase()];
  if (direct) return direct;
  return CHART_PALETTE[index % CHART_PALETTE.length] ?? "#6366F1";
};

export const formatNumber = (value: number | null | undefined): string =>
  (Number(value || 0)).toLocaleString("ar-EG");

export const formatCurrency = (value: number | null | undefined): string =>
  `${formatNumber(value)} ج.م`;

export const formatPercent = (value: number | null | undefined, digits = 1): string =>
  `${Number(value || 0).toFixed(digits)}%`;

export const formatDuration = (hours: number | null | undefined): string => {
  const h = Number(hours || 0);
  if (h <= 0) return "0س";
  if (h < 24) return `${Math.round(h)}س`;
  const days = Math.floor(h / 24);
  const rem = Math.round(h % 24);
  if (rem === 0) return `${days}يوم`;
  return `${days}يوم ${rem}س`;
};

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
};

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const CHART_TOOLTIP_STYLE = {
  borderRadius: "12px",
  border: "1px solid rgba(99,102,241,0.15)",
  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.25)",
  background: "rgba(255,255,255,0.96)",
  backdropFilter: "blur(8px)",
} as const;

/* ─── Shared UI Components ─── */

export function MovementCard({
  title,
  subtitle,
  action,
  className = "",
  children,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-800/80 shadow-sm shadow-gray-200/50 dark:shadow-none backdrop-blur-sm ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
          <div>
            {title && <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  gradient = "from-indigo-500 to-violet-600",
  hint,
  trend,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  gradient?: string;
  hint?: string;
  trend?: { direction: "up" | "down"; label: string };
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg shadow-indigo-500/10 transition-transform duration-200 hover:-translate-y-0.5`}>
      <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-white/80 text-xs font-medium">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-white/70 text-[11px]">{hint}</p>}
          {trend && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium">
              {trend.direction === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className="rounded-xl bg-white/15 p-2.5 shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusPill({ code }: { code: string }) {
  const c = String(code || "").toUpperCase();
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColorClass(c)}`}>
      {getStatusLabel(c)}
    </span>
  );
}

export function AutoBadge({ auto }: { auto: boolean }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${
        auto
          ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
          : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
      }`}
    >
      {auto ? "تلقائي" : "يدوي"}
    </span>
  );
}

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-[300px]">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-200 dark:border-indigo-900/40" />
        <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 animate-spin" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">جارٍ تحميل التحليل...</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-[240px] rounded-2xl border border-red-200/60 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <p className="text-sm font-medium text-red-600 dark:text-red-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-red-700"
        >
          <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message = "لا توجد بيانات في هذه الفترة" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-[240px] rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/40 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200/70 dark:bg-gray-700/50">
        <Inbox className="h-6 w-6 text-gray-400 dark:text-gray-500" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

export function ModeToggle({ mode, onChange }: { mode: MovementMode; onChange: (m: MovementMode) => void }) {
  const options: { value: MovementMode; label: string }[] = [
    { value: "all", label: "الكل" },
    { value: "manual", label: "يدوي" },
    { value: "auto", label: "تلقائي" },
  ];
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            mode === o.value
              ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-300"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TruncatedNotice({ truncated }: { truncated?: boolean }) {
  if (!truncated) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-200/70 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        الفترة كبيرة جداً والنتيجة مبنية على أول 50,000 طلب فقط — صغّر فترة التاريخ للحصول على نتائج كاملة.
      </span>
    </div>
  );
}
