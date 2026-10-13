import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Building2, Users, MessageSquare, Users2, TrendingUp, Clock, RefreshCw,
  LayoutDashboard, Zap, Briefcase, Activity, Server, Wifi, Database,
  HardDrive, AlertTriangle, CheckCircle, XCircle, ArrowUp, ArrowDown,
  Layers, Power, PowerOff, Cpu,
} from "lucide-react";
import { useAuth } from "../hooks/useAuthSimple";
import { useTheme } from "../hooks/useTheme";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";
import ActiveUsersMonitor from "../components/ActiveUsersMonitor";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";
import { PlatformOperationsPulse } from "./super-admin/dashboard/PlatformOperationsPulse";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface DashboardData {
  overview: {
    totalCompanies: number; activeCompanies: number; totalUsers: number;
    totalCustomers: number; totalConversations: number;
  };
  comparison: { companiesGrowth: number; usersGrowth: number; customersGrowth: number };
  recentActivity: { newCompaniesLast30Days: number; newUsersLast30Days: number; newCustomersLast30Days: number };
  trends: { date: string; companies: number; users: number; customers: number }[];
  health: {
    status: string; uptime: number; database: string;
    dbStats: { queryCount: number; latency: number; queue: number; active: number };
    environment: string; timestamp: string;
  };
  systems: { systemName: string; displayName: string; category: string; isEnabled: boolean; resourceUsage: string }[];
  alerts: { id: string; type: string; message: string; category: string; action: string; timestamp: string }[];
}

const colorMap: Record<string, string> = {
  indigo: "from-indigo-500/20 to-indigo-600/10 text-indigo-600 border-indigo-200/40 dark:border-indigo-800/40",
  emerald: "from-emerald-500/20 to-emerald-600/10 text-emerald-600 border-emerald-200/40 dark:border-emerald-800/40",
  blue: "from-blue-500/20 to-blue-600/10 text-blue-600 border-blue-200/40 dark:border-blue-800/40",
  amber: "from-amber-500/20 to-amber-600/10 text-amber-600 border-amber-200/40 dark:border-amber-800/40",
  rose: "from-rose-500/20 to-rose-600/10 text-rose-600 border-rose-200/40 dark:border-rose-800/40",
};
const glowMap: Record<string, string> = {
  indigo: "bg-indigo-500/10", emerald: "bg-emerald-500/10", blue: "bg-blue-500/10",
  amber: "bg-amber-500/10", rose: "bg-rose-500/10",
};

const MetricCard = ({ title, value, icon: Icon, color, growth, subtext, className = "" }: {
  title: string; value: number | string; icon: React.ComponentType<{ className?: string }>;
  color: string; growth?: number; subtext?: string; className?: string;
}) => {
  const isPositive = growth !== undefined && growth > 0;
  const isNegative = growth !== undefined && growth < 0;
  return (
    <div className={cn("rounded-xl border border-border/80 dark:border-border/60 bg-card p-4 shadow-2xs transition-all duration-150 hover:border-border select-none", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("size-1.5 rounded-full shrink-0", color === "indigo" ? "bg-indigo-500" : color === "emerald" ? "bg-emerald-500" : color === "blue" ? "bg-sky-500" : "bg-amber-500")} />
            <span className="font-medium text-[11px]">{title}</span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {subtext && (
              <span className="text-[11px] text-muted-foreground font-medium">
                {subtext}
              </span>
            )}
            {growth !== undefined && (
              <span className={cn("text-[11px] font-mono font-semibold tabular-nums", isPositive ? "text-emerald-600 dark:text-emerald-400" : isNegative ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
                {isPositive ? "+" : ""}{growth?.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-muted/60 text-muted-foreground shrink-0">
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
};

const SystemHealthBar = ({ health }: { health: DashboardData['health'] }) => {
  const statusColor = health.status === 'healthy' ? 'bg-emerald-500' : health.status === 'degraded' ? 'bg-amber-500' : 'bg-rose-500';
  const statusText = health.status === 'healthy' ? 'ممتاز' : health.status === 'degraded' ? 'منخفض' : 'عطل';
  const dbColor = health.database === 'connected' ? 'text-emerald-500' : 'text-rose-500';
  const uptimeStr = Math.floor(health.uptime / 86400) + 'd ' + Math.floor((health.uptime % 86400) / 3600) + 'h';
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/50 bg-card/60 px-5 py-3.5 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <div className={cn("size-2 rounded-full animate-pulse", statusColor)} />
        <span className="text-xs font-medium text-muted-foreground">حالة النظام:</span>
        <span className={cn("text-xs font-semibold", health.status === 'healthy' ? 'text-emerald-600' : health.status === 'degraded' ? 'text-amber-600' : 'text-rose-600')}>
          {statusText}
        </span>
      </div>
      <div className="h-4 w-px bg-border/40" />
      <div className="flex items-center gap-2 text-muted-foreground">
        <Server className="size-4" />
        <span className="text-xs font-medium tabular-nums">{uptimeStr}</span>
      </div>
      <div className="h-4 w-px bg-border/40" />
      <div className="flex items-center gap-2">
        <Database className={cn("size-4", dbColor)} />
        <span className={cn("text-xs font-medium", dbColor)}>{health.database === 'connected' ? 'DB متصل' : 'DB منفصل'}</span>
        {health.dbStats && (
          <span className="text-[11px] text-muted-foreground/80 tabular-nums">
            ({health.dbStats.active}/{health.dbStats.queryCount} اتصال)
          </span>
        )}
      </div>
      <div className="h-6 w-px bg-border/40" />
      <div className="flex items-center gap-2 text-muted-foreground/70">
        <Wifi className="size-4" />
        <span className="text-[11px] font-black">{health.environment === 'production' ? 'إنتاج' : 'تطوير'}</span>
      </div>
      {health.dbStats && (
        <>
          <div className="h-6 w-px bg-border/40" />
          <div className="flex items-center gap-2 text-muted-foreground/70">
            <HardDrive className="size-4" />
            <span className="text-[11px] font-black">{health.dbStats.latency}ms</span>
          </div>
        </>
      )}
    </div>
  );
};

const TrendChart = ({ data }: { data: DashboardData['trends'] }) => {
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';
  const chartColors = { companies: "#6366f1", users: "#10b981", customers: "#3b82f6" };

  if (!data || data.length === 0) return null;

  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const date = new Date(label + 'T00:00:00');
    return (
      <div className="rounded-2xl border border-border/40 bg-white/90 p-4 shadow-xl backdrop-blur-xl dark:bg-slate-900/90">
        <p className="mb-2 text-[11px] font-black text-muted-foreground/70">
          {date.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-2 py-0.5">
            <div className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-xs font-black text-foreground">
              {entry.name === 'companies' ? 'شركات' : entry.name === 'users' ? 'مستخدمين' : 'عملاء'}: {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="rounded-[32px] border border-border/40 bg-white/70 p-6 shadow-lg backdrop-blur-xl dark:bg-slate-900/70">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 shadow-inner">
          <TrendingUp className="size-6" />
        </div>
        <div>
          <h3 className="text-lg font-black">النمو اليومي (آخر 30 يوم)</h3>
          <p className="text-[11px] font-bold text-muted-foreground/70">الشركات - المستخدمين - العملاء</p>
        </div>
      </div>
      <div className="h-[320px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {Object.entries(chartColors).map(([key, color]) => (
                <linearGradient key={key} id={`gradient_${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fontWeight: 700 }} stroke={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} />
            <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => ({ companies: 'شركات', users: 'مستخدمين', customers: 'عملاء' }[value] || value)}
              wrapperStyle={{ fontSize: '11px', fontWeight: 700 }}
            />
            <Area type="monotone" dataKey="companies" stroke={chartColors.companies} fill="url(#gradient_companies)" strokeWidth={2.5} name="companies" />
            <Area type="monotone" dataKey="users" stroke={chartColors.users} fill="url(#gradient_users)" strokeWidth={2.5} name="users" />
            <Area type="monotone" dataKey="customers" stroke={chartColors.customers} fill="url(#gradient_customers)" strokeWidth={2.5} name="customers" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const SystemServicesGrid = ({ systems }: { systems: DashboardData['systems'] }) => {
  if (!systems || systems.length === 0) return null;
  const usageColor = (u: string) => u === 'high' ? 'text-rose-500 bg-rose-500/10' : u === 'medium' ? 'text-amber-500 bg-amber-500/10' : 'text-emerald-500 bg-emerald-500/10';

  return (
    <div className="rounded-2xl border border-border/50 bg-card/75 p-5 shadow-sm backdrop-blur-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 shadow-inner">
          <Layers className="size-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">خدمات النظام</h3>
          <p className="text-xs text-muted-foreground">حالة تشغيل الأنظمة والخدمات</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {systems.map((s) => (
          <div key={s.systemName} className="group relative overflow-hidden rounded-xl border border-border/50 bg-background/50 p-3.5 transition-all hover:bg-background hover:shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={cn("flex size-8 items-center justify-center rounded-lg", s.isEnabled ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground")}>
                  {s.isEnabled ? <Power className="size-3.5" /> : <PowerOff className="size-3.5" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{s.displayName}</p>
                  <p className="text-[10px] text-muted-foreground">{s.category === 'api_keys' ? 'مفاتيح API' : s.category === 'monitoring' ? 'مراقبة' : s.category === 'general' ? 'عام' : s.category}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className={cn("size-2 rounded-full", s.isEnabled ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-muted-foreground/40")} />
                <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-medium", usageColor(s.resourceUsage))}>{s.resourceUsage === 'high' ? 'عال' : s.resourceUsage === 'medium' ? 'متوسط' : 'خفيف'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AlertsPanel = ({ alerts }: { alerts: DashboardData['alerts'] }) => {
  if (!alerts || alerts.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border/50 bg-card/75 p-5 shadow-sm backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 shadow-inner">
          <AlertTriangle className="size-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">التنبيهات</h3>
          <p className="text-xs text-muted-foreground">آخر الأحداث الهامة في النظام</p>
        </div>
      </div>
      <div className="space-y-2">
        {alerts.map((a) => (
          <div key={a.id} className={cn("flex items-start gap-3 rounded-xl p-3", a.type === 'error' ? "bg-rose-500/5 border border-rose-500/10" : "bg-amber-500/5 border border-amber-500/10")}>
            {a.type === 'error' ? <XCircle className="mt-0.5 size-4 shrink-0 text-rose-500" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{a.message}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                {a.category} · {new Date(a.timestamp).toLocaleDateString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showActiveUsers, setShowActiveUsers] = useState(false);
  const hasDataRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => { hasDataRef.current = Boolean(data); }, [data]);

  const fetchDashboard = useCallback(async (force = false) => {
    if (hasDataRef.current) setIsRefreshing(true);
    else setLoading(true);

    if (force && hasDataRef.current) {
      try {
        const token = tokenManager.getAccessToken();
        const response = await fetch(buildApiUrl("admin/dashboard/aggregated"), {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        const res = await response.json().catch(() => null);
        if (res?.success) setData(res.data);
      } catch {}
      setIsRefreshing(false);
      setLoading(false);
      return;
    }

    if (hasDataRef.current) return;

    try {
      const token = tokenManager.getAccessToken();
      const response = await fetch(buildApiUrl("admin/dashboard/aggregated"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const res = await response.json().catch(() => null);
      if (res?.success) setData(res.data);
    } catch {} finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    intervalRef.current = setInterval(() => fetchDashboard(true), 60000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchDashboard(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchDashboard]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
          <p className="text-sm font-black text-muted-foreground animate-pulse">جاري تحميل البيانات الأساسية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full space-y-5" dir="rtl">
      <div className="pointer-events-none absolute -right-20 -top-20 size-[400px] rounded-full bg-primary/5 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 size-[400px] rounded-full bg-indigo-500/5 blur-[100px]" />

      <div className="relative w-full space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/20">
                <LayoutDashboard className="size-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">لوحة تحكم مدير النظام</h1>
            </div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              مرحباً {user?.firstName} {user?.lastName}، إليك نظرة شاملة على نبض النظام اليوم.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-xl bg-card/60 px-3 py-1.5 border border-border/40 shadow-sm">
              <div className="flex size-7 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                <Clock className="size-4" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-medium text-muted-foreground">تاريخ اليوم</p>
                <p className="text-xs font-semibold text-foreground">
                  {new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              </div>
            </div>

            <Button onClick={() => setShowActiveUsers(true)}
              className="h-9 sm:h-10 rounded-xl bg-green-600 px-4 font-semibold text-xs sm:text-sm shadow-sm transition-all hover:bg-green-700 active:scale-95">
              <Users className="ml-1.5 size-4" />
              المستخدمون النشطون
            </Button>

            <Button variant="outline" onClick={() => fetchDashboard(true)} disabled={isRefreshing}
              className="h-9 sm:h-10 rounded-xl border-border/60 bg-card/60 px-4 font-semibold text-xs sm:text-sm shadow-sm backdrop-blur-sm transition-all hover:bg-card active:scale-95">
              <RefreshCw className={cn("ml-1.5 size-4", isRefreshing && "animate-spin")} />
              {isRefreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
            </Button>
          </div>
        </div>

        {/* 💓 Platform Live Operations & Merchant Health Pulse */}
        <PlatformOperationsPulse />

        {/* System Health */}
        {data?.health && <SystemHealthBar health={data.health} />}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="إجمالي الشركات" value={data?.overview?.totalCompanies || 0} icon={Building2} color="indigo"
            subtext={`نشطة: ${data?.overview?.activeCompanies || 0}`} growth={data?.comparison?.companiesGrowth} />
          <MetricCard title="إجمالي المستخدمين" value={data?.overview?.totalUsers || 0} icon={Users2} color="emerald"
            growth={data?.comparison?.usersGrowth} />
          <MetricCard title="إجمالي العملاء" value={data?.overview?.totalCustomers || 0} icon={Users} color="blue"
            growth={data?.comparison?.customersGrowth} />
          <MetricCard title="إجمالي المحادثات" value={data?.overview?.totalConversations || 0} icon={MessageSquare} color="amber"
            subtext="عبر كل القنوات" />
        </div>

        {/* Recent Activity + Growth Chassis */}
        <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
          <div className="p-3.5 border-b border-border/60 flex items-center justify-between gap-3 bg-muted/20">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-foreground">النشاط ومعدل النمو الأخير</span>
              <span className="text-[11px] text-muted-foreground">(آخر 30 يوماً)</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              نمو إيجابي
            </span>
          </div>

          <div className="p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="text-[11px] font-medium">شركات جديدة</span>
                  <Briefcase className="size-3.5 text-indigo-500" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums mb-1">
                  {data?.recentActivity?.newCompaniesLast30Days || 0}
                </div>
                {data?.comparison?.companiesGrowth !== undefined && (
                  <p className={cn("text-[11px] font-mono font-semibold tabular-nums", data.comparison.companiesGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                    {data.comparison.companiesGrowth >= 0 ? '↑' : '↓'} {Math.abs(data.comparison.companiesGrowth).toFixed(1)}% عن الشهر الماضي
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="text-[11px] font-medium">مستخدمون جدد</span>
                  <Users2 className="size-3.5 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums mb-1">
                  {data?.recentActivity?.newUsersLast30Days || 0}
                </div>
                {data?.comparison?.usersGrowth !== undefined && (
                  <p className={cn("text-[11px] font-mono font-semibold tabular-nums", data.comparison.usersGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                    {data.comparison.usersGrowth >= 0 ? '↑' : '↓'} {Math.abs(data.comparison.usersGrowth).toFixed(1)}% عن الشهر الماضي
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="text-[11px] font-medium">عملاء جدد</span>
                  <Users className="size-3.5 text-sky-500" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums mb-1">
                  {data?.recentActivity?.newCustomersLast30Days || 0}
                </div>
                {data?.comparison?.customersGrowth !== undefined && (
                  <p className={cn("text-[11px] font-mono font-semibold tabular-nums", data.comparison.customersGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                    {data.comparison.customersGrowth >= 0 ? '↑' : '↓'} {Math.abs(data.comparison.customersGrowth).toFixed(1)}% عن الشهر الماضي
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        {data?.trends && data.trends.length > 0 && <TrendChart data={data.trends} />}

        {/* Bottom Grid: Systems + Alerts */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {data?.systems && data.systems.length > 0 && <SystemServicesGrid systems={data.systems} />}
          </div>
          <div>
            {data?.alerts && data.alerts.length > 0 && <AlertsPanel alerts={data.alerts} />}
          </div>
        </div>
      </div>

      <ActiveUsersMonitor isOpen={showActiveUsers} onClose={() => setShowActiveUsers(false)} />
    </div>
  );
};

export default SuperAdminDashboard;
