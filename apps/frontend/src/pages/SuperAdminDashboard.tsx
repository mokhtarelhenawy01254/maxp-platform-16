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
    <div className={cn("p-4 flex flex-col justify-between hover:bg-muted/10 transition-colors select-none", className)}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn("size-1.5 rounded-full shrink-0", color === "indigo" ? "bg-indigo-500" : color === "emerald" ? "bg-emerald-500" : color === "blue" ? "bg-sky-500" : "bg-amber-500")} />
          <span className="font-medium text-[11px]">{title}</span>
        </div>
        <div className="size-7 rounded-md border border-border/70 bg-muted/30 flex items-center justify-center text-muted-foreground shrink-0">
          <Icon className="size-3.5" />
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {subtext && (
            <span className="text-[10px] text-muted-foreground font-medium">
              {subtext}
            </span>
          )}
          {growth !== undefined && (
            <span className={cn("text-[10px] font-mono font-semibold tabular-nums", isPositive ? "text-emerald-600 dark:text-emerald-400" : isNegative ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
              {isPositive ? "+" : ""}{growth?.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const SystemHealthBar = ({ health }: { health: DashboardData['health'] }) => {
  const statusColor = health.status === 'healthy' ? 'bg-emerald-500' : health.status === 'degraded' ? 'bg-amber-500' : 'bg-rose-500';
  const statusText = health.status === 'healthy' ? 'ممتاز' : health.status === 'degraded' ? 'منخفض' : 'عطل';
  const dbColor = health.database === 'connected' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  const uptimeStr = Math.floor(health.uptime / 86400) + 'd ' + Math.floor((health.uptime % 86400) / 3600) + 'h';
  return (
    <div className="flex flex-wrap items-center gap-3.5 rounded-xl border border-border/80 bg-card/40 px-4 py-2.5 shadow-xs text-xs">
      <div className="flex items-center gap-2">
        <div className={cn("size-2 rounded-full", statusColor)} />
        <span className="font-medium text-muted-foreground text-[11px]">حالة النظام:</span>
        <span className={cn("font-semibold text-xs", health.status === 'healthy' ? 'text-emerald-600 dark:text-emerald-400' : health.status === 'degraded' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400')}>
          {statusText}
        </span>
      </div>
      <div className="h-3.5 w-px bg-border/60" />
      <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[11px]">
        <Server className="size-3.5" />
        <span className="tabular-nums">{uptimeStr}</span>
      </div>
      <div className="h-3.5 w-px bg-border/60" />
      <div className="flex items-center gap-1.5 font-mono text-[11px]">
        <Database className={cn("size-3.5", dbColor)} />
        <span className={cn("font-medium", dbColor)}>{health.database === 'connected' ? 'قاعدة البيانات متصلة' : 'قاعدة البيانات منفصلة'}</span>
        {health.dbStats && (
          <span className="text-muted-foreground tabular-nums">
            ({health.dbStats.active}/{health.dbStats.queryCount} اتصال)
          </span>
        )}
      </div>
      <div className="h-3.5 w-px bg-border/60" />
      <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[11px]">
        <Wifi className="size-3.5" />
        <span>{health.environment === 'production' ? 'إنتاج' : 'تطوير'}</span>
      </div>
      {health.dbStats && (
        <>
          <div className="h-3.5 w-px bg-border/60" />
          <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[11px]">
            <HardDrive className="size-3.5" />
            <span className="tabular-nums">{health.dbStats.latency}ms</span>
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
      <div className="rounded-xl border border-border/80 bg-card p-3 shadow-md text-xs">
        <p className="mb-1.5 text-[10px] font-mono text-muted-foreground">
          {date.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-2 py-0.5">
            <div className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-[11px] font-medium text-foreground">
              {entry.name === 'companies' ? 'شركات' : entry.name === 'users' ? 'مستخدمين' : 'عملاء'}: {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs">
      <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center text-primary">
            <TrendingUp className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">النمو اليومي لمنظومة المنصة</h3>
            <p className="text-[10px] text-muted-foreground">الشركات · المستخدمين · العملاء (آخر 30 يوم)</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          معدل تصاعدي
        </span>
      </div>
      <div className="h-[280px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {Object.entries(chartColors).map(([key, color]) => (
                <linearGradient key={key} id={`gradient_${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.01} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10 }} stroke={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} />
            <YAxis tick={{ fontSize: 10 }} stroke={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => ({ companies: 'شركات', users: 'مستخدمين', customers: 'عملاء' }[value] || value)}
              wrapperStyle={{ fontSize: '11px' }}
            />
            <Area type="monotone" dataKey="companies" stroke={chartColors.companies} fill="url(#gradient_companies)" strokeWidth={2} name="companies" />
            <Area type="monotone" dataKey="users" stroke={chartColors.users} fill="url(#gradient_users)" strokeWidth={2} name="users" />
            <Area type="monotone" dataKey="customers" stroke={chartColors.customers} fill="url(#gradient_customers)" strokeWidth={2} name="customers" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const SystemServicesGrid = ({ systems }: { systems: DashboardData['systems'] }) => {
  if (!systems || systems.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs">
      <div className="mb-3.5 flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center text-primary">
            <Layers className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">خدمات النظام الأساسية</h3>
            <p className="text-[10px] text-muted-foreground">حالة تشغيل البوابات والخدمات السحابية</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono">{systems.length} خدمة</Badge>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {systems.map((s) => (
          <div key={s.systemName} className="flex items-center justify-between rounded-lg border border-border/70 bg-card/60 p-2.5 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={cn("size-7 rounded-md border flex items-center justify-center shrink-0", s.isEnabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-border/80 bg-muted text-muted-foreground")}>
                {s.isEnabled ? <Power className="size-3.5" /> : <PowerOff className="size-3.5" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{s.displayName}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{s.category === 'api_keys' ? 'مفاتيح API' : s.category === 'monitoring' ? 'مراقبة' : s.category === 'general' ? 'عام' : s.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono text-muted-foreground">{s.resourceUsage}</span>
              <div className={cn("size-1.5 rounded-full", s.isEnabled ? "bg-emerald-500" : "bg-muted-foreground/40")} />
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
    <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs">
      <div className="mb-3.5 flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center text-amber-500">
            <AlertTriangle className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">تنبيهات المنظومة</h3>
            <p className="text-[10px] text-muted-foreground">أحدث الأحداث الأمنية والتشغيلية</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono">{alerts.length} تنبيه</Badge>
      </div>
      <div className="space-y-2">
        {alerts.map((a) => (
          <div key={a.id} className={cn("flex items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors", a.type === 'error' ? "border-rose-500/20 bg-rose-500/5" : "border-amber-500/20 bg-amber-500/5")}>
            {a.type === 'error' ? <XCircle className="mt-0.5 size-3.5 shrink-0 text-rose-500" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{a.message}</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5 tabular-nums">
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
    <div className="w-full space-y-4" dir="rtl">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <LayoutDashboard className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">لوحة تحكم مدير النظام</h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border border-border/80 bg-muted/30">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                متصل
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              مرحباً {user?.firstName} {user?.lastName} · نظرة موحدة على النبض التشغيلي لمنصة MaxP
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/20 px-3 py-1 text-xs">
            <Clock className="size-3.5 text-muted-foreground" />
            <span className="text-[11px] font-mono text-muted-foreground">
              {new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>

          <Button
            onClick={() => setShowActiveUsers(true)}
            variant="outline"
            size="sm"
            className="h-8 rounded-lg text-xs font-mono active:scale-[0.98] transition-transform"
          >
            <Users className="ml-1.5 size-3.5" />
            المستخدمون النشطون
          </Button>

          <Button
            onClick={() => fetchDashboard(true)}
            disabled={isRefreshing}
            size="sm"
            className="h-8 rounded-lg text-xs font-mono active:scale-[0.98] transition-transform"
          >
            <RefreshCw className={cn("ml-1.5 size-3.5", isRefreshing && "animate-spin")} />
            {isRefreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
          </Button>
        </div>
      </div>

      {/* Platform Live Operations Pulse */}
      <PlatformOperationsPulse />

      {/* System Health Strip */}
      {data?.health && <SystemHealthBar health={data.health} />}

      {/* Unified Telemetry Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
        <MetricCard title="إجمالي الشركات" value={data?.overview?.totalCompanies || 0} icon={Building2} color="indigo"
          subtext={`نشطة: ${data?.overview?.activeCompanies || 0}`} growth={data?.comparison?.companiesGrowth} />
        <MetricCard title="إجمالي المستخدمين" value={data?.overview?.totalUsers || 0} icon={Users2} color="emerald"
          growth={data?.comparison?.usersGrowth} />
        <MetricCard title="إجمالي العملاء" value={data?.overview?.totalCustomers || 0} icon={Users} color="blue"
          growth={data?.comparison?.customersGrowth} />
        <MetricCard title="إجمالي المحادثات" value={data?.overview?.totalConversations || 0} icon={MessageSquare} color="amber"
          subtext="عبر كل القنوات" />
      </div>

      {/* Recent Activity Chassis */}
      <div className="rounded-xl border border-border/80 bg-card/40 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-border/60 flex items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-foreground">النشاط ومعدل النمو الأخير</span>
            <span className="text-[10px] font-mono text-muted-foreground">(آخر 30 يوماً)</span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            نمو إيجابي
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60">
          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="text-[11px] font-medium">شركات جديدة</span>
              <Briefcase className="size-3.5 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums mb-1">
              {data?.recentActivity?.newCompaniesLast30Days || 0}
            </div>
            {data?.comparison?.companiesGrowth !== undefined && (
              <p className={cn("text-[10px] font-mono font-semibold tabular-nums", data.comparison.companiesGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                {data.comparison.companiesGrowth >= 0 ? '↑' : '↓'} {Math.abs(data.comparison.companiesGrowth).toFixed(1)}% عن الشهر الماضي
              </p>
            )}
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="text-[11px] font-medium">مستخدمون جدد</span>
              <Users2 className="size-3.5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums mb-1">
              {data?.recentActivity?.newUsersLast30Days || 0}
            </div>
            {data?.comparison?.usersGrowth !== undefined && (
              <p className={cn("text-[10px] font-mono font-semibold tabular-nums", data.comparison.usersGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                {data.comparison.usersGrowth >= 0 ? '↑' : '↓'} {Math.abs(data.comparison.usersGrowth).toFixed(1)}% عن الشهر الماضي
              </p>
            )}
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="text-[11px] font-medium">عملاء جدد</span>
              <Users className="size-3.5 text-sky-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums mb-1">
              {data?.recentActivity?.newCustomersLast30Days || 0}
            </div>
            {data?.comparison?.customersGrowth !== undefined && (
              <p className={cn("text-[10px] font-mono font-semibold tabular-nums", data.comparison.customersGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                {data.comparison.customersGrowth >= 0 ? '↑' : '↓'} {Math.abs(data.comparison.customersGrowth).toFixed(1)}% عن الشهر الماضي
              </p>
            )}
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

      <ActiveUsersMonitor isOpen={showActiveUsers} onClose={() => setShowActiveUsers(false)} />
    </div>
  );
};

export default SuperAdminDashboard;
