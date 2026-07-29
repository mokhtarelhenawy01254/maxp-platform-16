import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  MessageSquare,
  Inbox,
  Send,
  Clock,
  Calendar,
  RefreshCw,
  Tag,
  MessageCircle,
  TrendingUp,
  User,
  Megaphone,
  Bot,
} from "lucide-react";
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
  AreaChart,
  Area,
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
  WhatsAppSurfaceCard,
  WhatsAppMetricCard,
} from "./components/WhatsAppPageShell";
import { apiClient, type ApiRequestConfig } from "../../services/apiClient";

interface ConversationSummary {
  totalConversations: number;
  totalMessages: number;
  incomingMessages: number;
  outgoingMessages: number;
  manualOutgoing: number;
  broadcastOutgoing: number;
  autoOutgoing: number;
  avgMessagesPerConversation: number;
  assignedCount: number;
  unassignedCount: number;
  waitingForReply: number;
  awaitingCustomer: number;
  totalUnread: number;
  conversationsWithUnread: number;
  avgResponseTimeMs: number | null;
  avgResponseTimeMin: number | null;
}

interface DailyEntry {
  date: string;
  incoming: number;
  outgoing: number;
  conversations: number;
}

interface RecentConversation {
  id: string;
  status: string;
  assignedUserId: string | null;
  lastMessageAt: string | null;
  lastMessageIsFromCustomer: boolean;
  unreadCount: number;
  messageCount: number;
}

interface AnalyticsResponse {
  success: boolean;
  period: { start: string; end: string };
  summary: ConversationSummary;
  statusDistribution: Record<string, number>;
  hourlyDistribution: number[];
  dailyDistribution: DailyEntry[];
  tagDistribution: { tag: string; count: number }[];
  recentConversations: RecentConversation[];
  userMap: Record<string, string>;
}

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
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const fmt = (d: Date) => d.toISOString().substring(0, 10);
  switch (preset) {
    case "today":
      return { start: fmt(today), end: fmt(today) };
    case "yesterday": {
      const y = new Date(today);
      y.setUTCDate(y.getUTCDate() - 1);
      return { start: fmt(y), end: fmt(y) };
    }
    case "7days": {
      const s = new Date(today);
      s.setUTCDate(s.getUTCDate() - 6);
      return { start: fmt(s), end: fmt(today) };
    }
    case "30days": {
      const s = new Date(today);
      s.setUTCDate(s.getUTCDate() - 29);
      return { start: fmt(s), end: fmt(today) };
    }
    case "thisMonth": {
      const s = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      return { start: fmt(s), end: fmt(today) };
    }
    default:
      return { start: "", end: "" };
  }
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "جديد",
  ASSIGNED: "معيّن",
  PENDING: "قيد الانتظار",
  CLOSED: "مغلق",
  ARCHIVED: "مؤرشفة",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500",
  ASSIGNED: "bg-indigo-500",
  PENDING: "bg-amber-500",
  CLOSED: "bg-emerald-500",
  ARCHIVED: "bg-slate-400",
};

const WhatsAppConversationAnalytics: React.FC<{ companyId?: string }> = ({ companyId }) => {
  const withCompanyConfig = useCallback(
    (config: ApiRequestConfig = {}) =>
      companyId ? { ...config, _companyId: companyId } : config,
    [companyId],
  );

  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [preset, setPreset] = useState<DatePreset>("30days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const activeRange = useMemo(() => {
    if (preset === "custom") return { start: startDate, end: endDate };
    return getPresetRange(preset);
  }, [preset, startDate, endDate]);

  const loadData = async (silent = false) => {
    if (!activeRange.start || !activeRange.end) return;
    if (new Date(activeRange.end) < new Date(activeRange.start)) {
      tToast.error("whatsapp_WhatsAppConversationAnalytics.msg_6297");
      return;
    }
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await apiClient.get(
        "/whatsapp-inbox/conversation-analytics",
        withCompanyConfig({
          params: { startDate: activeRange.start, endDate: activeRange.end },
        }),
      );
      setData(res.data as AnalyticsResponse);
    } catch {
      tToast.error("whatsapp_WhatsAppConversationAnalytics.failed_load_eab0");
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
  const statusDist = data?.statusDistribution || {};
  const hourlyDist = data?.hourlyDistribution || [];
  const dailyDist = data?.dailyDistribution || [];
  const tagDist = data?.tagDistribution || [];
  const recentConvs = data?.recentConversations || [];
  const userMap = data?.userMap || {};

  const totalStatusCount = useMemo(
    () => Object.values(statusDist).reduce((s, v) => s + v, 0) || 1,
    [statusDist],
  );

  const hourlyChartData = useMemo(
    () =>
      hourlyDist.map((count, hour) => ({
        hour: `${hour}:00`,
        رسائل: count,
      })),
    [hourlyDist],
  );

  const statusChartData = useMemo(
    () =>
      Object.entries(statusDist)
        .sort(([, a], [, b]) => b - a)
        .map(([status, count]) => ({
          name: STATUS_LABELS[status] || status,
          count,
          pct: ((count / totalStatusCount) * 100).toFixed(1),
        })),
    [statusDist, totalStatusCount],
  );

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("ar-EG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <WhatsAppPageShell
        title="تحليل المحادثات"
        description="نظرة شاملة على حركة المحادثات وتوزيعها وأوقات الذروة"
        icon={BarChart3}
        backHref="/whatsapp/employee-analytics"
        backLabel="رجوع"
        eyebrow="WhatsApp Analytics"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl sm:rounded-3xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl sm:rounded-3xl" />
          <Skeleton className="h-72 rounded-2xl sm:rounded-3xl" />
        </div>
        <Skeleton className="h-80 rounded-2xl sm:rounded-3xl" />
        <Skeleton className="h-96 rounded-2xl sm:rounded-3xl" />
      </WhatsAppPageShell>
    );
  }

  return (
    <WhatsAppPageShell
      title="تحليل المحادثات"
      description="نظرة شاملة على حركة المحادثات وتوزيعها وأوقات الذروة"
      icon={BarChart3}
      backHref="/whatsapp/employee-analytics"
      backLabel="رجوع"
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
      {/* Hero Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <WhatsAppMetricCard
          label="إجمالي المحادثات"
          value={summary?.totalConversations ?? 0}
          hint={`${summary?.totalMessages ?? 0} رسالة`}
          icon={MessageCircle}
          tone="primary"
        />
        <WhatsAppMetricCard
          label="رسائل واردة"
          value={summary?.incomingMessages ?? 0}
          hint={`من العميل`}
          icon={Inbox}
          tone="info"
        />
        <WhatsAppMetricCard
          label="رسائل صادرة"
          value={summary?.outgoingMessages ?? 0}
          hint={`يدوي ${summary?.manualOutgoing ?? 0} · برودكاست ${summary?.broadcastOutgoing ?? 0} · تلقائي ${summary?.autoOutgoing ?? 0}`}
          icon={Send}
          tone="success"
        />
        <WhatsAppMetricCard
          label="متوسط الرد"
          value={summary?.avgResponseTimeMin != null ? `${summary.avgResponseTimeMin} د` : "—"}
          hint={`${summary?.avgMessagesPerConversation ?? 0} رسالة/محادثة`}
          icon={Clock}
          tone="primary"
        />
      </div>

      {/* Outgoing Message Breakdown + Note */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <WhatsAppSurfaceCard
          title="تفصيل الرسائل الصادرة"
          description="يدوي (ردود المودريترز) vs تلقائي (برود كاست + فلو متابعة)"
          className="lg:col-span-1"
        >
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Send className="size-3.5 text-indigo-500" />
                  <span className="text-xs text-muted-foreground">يدوي (ردود)</span>
                </div>
                <span className="text-sm font-bold">{summary?.manualOutgoing ?? 0}</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted">
                <div
                  className="h-2.5 rounded-full bg-indigo-500 transition-[width]"
                  style={{ width: `${((summary?.manualOutgoing ?? 0) / Math.max(1, summary?.outgoingMessages ?? 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Megaphone className="size-3.5 text-amber-500" />
                  <span className="text-xs text-muted-foreground">برودكاست</span>
                </div>
                <span className="text-sm font-bold">{summary?.broadcastOutgoing ?? 0}</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted">
                <div
                  className="h-2.5 rounded-full bg-amber-500 transition-[width]"
                  style={{ width: `${((summary?.broadcastOutgoing ?? 0) / Math.max(1, summary?.outgoingMessages ?? 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Bot className="size-3.5 text-violet-400" />
                  <span className="text-xs text-muted-foreground">تلقائي (فلو + AI)</span>
                </div>
                <span className="text-sm font-bold">{summary?.autoOutgoing ?? 0}</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted">
                <div
                  className="h-2.5 rounded-full bg-violet-400 transition-[width]"
                  style={{ width: `${((summary?.autoOutgoing ?? 0) / Math.max(1, summary?.outgoingMessages ?? 1)) * 100}%` }}
                />
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
              <strong className="font-semibold text-amber-600">تنبيه:</strong> الأرقام أعلاه تشمل <strong>كل</strong> الرسائل الصادرة. تم التمييز عن طريق فحص حقل metadata لكل رسالة:
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li><strong>يدوي</strong> = رسائل المودريترز اليدوية (senderId + بدون isBroadcast)</li>
                <li><strong>برودكاست</strong> = حملات البريد الجماعي (metadata.isBroadcast = true)</li>
                <li><strong>تلقائي</strong> = فلو المتابعة + ردود AI (بدون senderId)</li>
              </ul>
            </div>
            <div className="border-t border-dashed border-[color:var(--shell-control-border)] pt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">بانتظار رد الفريق</span>
                <span className="font-semibold text-info">{summary?.waitingForReply ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">بانتظار رد العميل</span>
                <span className="font-semibold text-success">{summary?.awaitingCustomer ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">غير معين</span>
                <span className="font-medium">{summary?.unassignedCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">غير مقروءة</span>
                <span className="font-medium">{summary?.conversationsWithUnread ?? 0}</span>
              </div>
            </div>
          </div>
        </WhatsAppSurfaceCard>

        <WhatsAppSurfaceCard
          title="حركة الرسائل اليومية"
          description="الرسائل الواردة والصادرة يومياً"
          className="lg:col-span-3"
        >
          {dailyDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyDist} margin={{ top: 8, bottom: 0, left: -10, right: 0 }}>
                <defs>
                  <linearGradient id="gradIncoming" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradOutgoing" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-muted)" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) => v.substring(5)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <RechartsTooltip
                  cursor={{ stroke: "var(--color-muted)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 12,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="incoming"
                  name="واردة"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  fill="url(#gradIncoming)"
                  animationDuration={600}
                />
                <Area
                  type="monotone"
                  dataKey="outgoing"
                  name="صادرة"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#gradOutgoing)"
                  animationDuration={600}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] flex-col items-center justify-center text-center">
              <TrendingUp className="mb-2 size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">لا توجد بيانات</p>
            </div>
          )}
        </WhatsAppSurfaceCard>
      </div>

      {/* Row 2: Status Distribution + Hourly Distribution */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WhatsAppSurfaceCard
          title="توزيع الحالات"
          description="حالة المحادثات في الفترة المحددة"
        >
          {statusChartData.length > 0 ? (
            <div className="space-y-4">
              {statusChartData.map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-[color:var(--color-foreground)]">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)]"
                      >
                        {item.pct}%
                      </Badge>
                      <span className="text-sm font-medium text-[color:var(--color-foreground)]">
                        {item.count}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-primary/10">
                    <div
                      className={`h-2 rounded-full transition-[width] ${
                        STATUS_COLORS[Object.keys(statusDist).find(
                          (k) => (STATUS_LABELS[k] || k) === item.name,
                        ) || ""] || "bg-primary"
                      }`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] px-6 py-12 text-center">
              <BarChart3 className="mb-3 size-8 text-[color:var(--color-muted-foreground)]" />
              <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                لا توجد بيانات
              </p>
            </div>
          )}
        </WhatsAppSurfaceCard>

        <WhatsAppSurfaceCard
          title="التوزيع حسب الساعة"
          description="حركة الرسائل خلال ساعات اليوم"
        >
          {hourlyDist.some((h) => h > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hourlyChartData} margin={{ top: 8, bottom: 0, left: -10, right: 0 }}>
                <defs>
                  <linearGradient id="gradHourly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-muted)" opacity={0.3} />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
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
                <Bar dataKey="رسائل" fill="url(#gradHourly)" radius={[4, 4, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] flex-col items-center justify-center text-center">
              <Clock className="mb-2 size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">لا توجد بيانات</p>
            </div>
          )}
        </WhatsAppSurfaceCard>
      </div>

      {/* Row 3: Tags + Recent Conversations */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {tagDist.length > 0 && (
          <WhatsAppSurfaceCard
            title="الوسوم الأكثر استخداماً"
            description="توزيع المحادثات حسب الوسوم"
            className="lg:col-span-1"
          >
            <div className="space-y-3">
              {tagDist.map((item) => {
                const pct = ((item.count / (summary?.totalConversations || 1)) * 100).toFixed(1);
                return (
                  <div key={item.tag} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Tag className="size-3 text-muted-foreground" />
                        <span className="text-sm">{item.tag}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] text-[10px]"
                        >
                          {pct}%
                        </Badge>
                        <span className="text-xs font-medium">{item.count}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-primary/10">
                      <div
                        className="h-1.5 rounded-full bg-primary transition-[width]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </WhatsAppSurfaceCard>
        )}

        <WhatsAppSurfaceCard
          title="آخر المحادثات"
          description="المحادثات الأحدث نشاطاً"
          className={tagDist.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}
        >
          <div className="overflow-hidden rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">الحالة</TableHead>
                  <TableHead className="text-xs">آخر رسالة</TableHead>
                  <TableHead className="text-center text-xs">الرسائل</TableHead>
                  <TableHead className="text-center text-xs">غير مقروءة</TableHead>
                  <TableHead className="text-xs">المُعيّن</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentConvs.length > 0 ? (
                  recentConvs.map((conv) => (
                    <TableRow key={conv.id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`rounded-full text-[10px] text-white ${
                            STATUS_COLORS[conv.status] || "bg-slate-400"
                          }`}
                        >
                          {STATUS_LABELS[conv.status] || conv.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {conv.lastMessageIsFromCustomer ? (
                            <Inbox className="size-3 text-info" />
                          ) : (
                            <Send className="size-3 text-success" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatTime(conv.lastMessageAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-medium">{conv.messageCount}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {conv.unreadCount > 0 ? (
                          <Badge className="bg-destructive/15 text-[color:var(--color-destructive)] text-[10px]">
                            {conv.unreadCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {conv.assignedUserId && userMap[conv.assignedUserId] ? (
                          <div className="flex items-center gap-1">
                            <User className="size-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {userMap[conv.assignedUserId]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center">
                      <div className="space-y-2">
                        <MessageSquare className="mx-auto size-8 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">
                          لا توجد محادثات في هذه الفترة
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </WhatsAppSurfaceCard>
      </div>
    </WhatsAppPageShell>
  );
};

export default WhatsAppConversationAnalytics;
