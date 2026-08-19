import React, { useState, useEffect, useCallback, useRef } from "react";
import { Activity, AlertTriangle, ArrowDown, ArrowUp, Briefcase, Building, Building2, Check, Clock, Database, Folder, Grid, HardDrive, Layers, LayoutDashboard, MessageSquare, Power, PowerOff, RefreshCw, Server, TrendingUp, Users, Users2, Wifi, X, XCircle, Zap } from 'lucide-react';
import { useAuth } from "../hooks/useAuthSimple";
import { useTheme } from "../hooks/useTheme";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";
import ActiveUsersMonitor from "../components/ActiveUsersMonitor";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";
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
    <div className={cn("group relative overflow-hidden rounded-[32px] border bg-white/70 p-6 shadow-sm backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl dark:bg-slate-950/70", colorMap[color] || "border-border/40", className)}>
      <div className={cn("absolute -left-12 -top-12 size-32 rounded-full blur-3xl transition-all duration-700 group-hover:scale-125", glowMap[color] || "bg-primary/5")} />
      <div className="relative flex items-center justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-4xl font-black tracking-tighter text-foreground">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {subtext && (
              <Badge variant="outline" className={cn("mt-0.5 rounded-full border-none px-2.5 py-0.5 text-[10px] font-black", colorMap[color]?.split(' ')[2])}>
                <Activity className="ml-0.5 size-3" />{subtext}
              </Badge>
            )}
            {growth !== undefined && (
              <Badge variant="outline" className={cn("mt-0.5 rounded-full border-none px-2 py-0.5 text-[10px] font-black", isPositive ? "bg-emerald-500/10 text-emerald-600" : isNegative ? "bg-rose-500/10 text-rose-600" : "bg-gray-500/10 text-gray-500")}>
                {isPositive ? <ArrowUp className="ml-0.5 size-3" /> : isNegative ? <ArrowDown className="ml-0.5 size-3" /> : null}
                {isPositive ? "+" : ""}{growth?.toFixed(1)}%
              </Badge>
            )}
          </div>
        </div>
        <div className={cn("flex size-14 items-center justify-center rounded-[22px] shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg", colorMap[color]?.split(' ').slice(0, 2).join(' '))}>
          <Icon className="size-7" />
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
    <div className="flex flex-wrap items-center gap-4 rounded-[20px] border border-border/40 bg-white/60 px-6 py-4 backdrop-blur-xl dark:bg-slate-900/60">
      <div className="flex items-center gap-2.5">
        <div className={cn("size-2.5 rounded-full animate-pulse", statusColor)} />
        <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">حالة النظام:</span>
        <span className={cn("text-sm font-black", health.status === 'healthy' ? 'text-emerald-600' : health.status === 'degraded' ? 'text-amber-600' : 'text-rose-600')}>
          {statusText}
        </span>
      </div>
      <div className="h-6 w-px bg-border/40" />
      <div className="flex items-center gap-2 text-muted-foreground/70">
        <Server className="size-4" />
        <span className="text-[11px] font-black">{uptimeStr}</span>
      </div>
      <div className="h-6 w-px bg-border/40" />
      <div className="flex items-center gap-2">
        <Database className={cn("size-4", dbColor)} />
        <span className={cn("text-[11px] font-black", dbColor)}>{health.database === 'connected' ? 'DB متصل' : 'DB منفصل'}</span>
        {health.dbStats && (
          <span className="text-[10px] text-muted-foreground/60 font-black">
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
    <div className="rounded-[32px] border border-border/40 bg-white/70 p-6 shadow-lg backdrop-blur-xl dark:bg-slate-900/70">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 shadow-inner">
          <Layers className="size-6" />
        </div>
        <div>
          <h3 className="text-lg font-black">خدمات النظام</h3>
          <p className="text-[11px] font-bold text-muted-foreground/70">حالة تشغيل الأنظمة والخدمات</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {systems.map((s) => (
          <div key={s.systemName} className="group relative overflow-hidden rounded-[20px] border border-border/40 bg-white/50 p-4 transition-all hover:bg-white hover:shadow-md dark:bg-slate-950/50 dark:hover:bg-slate-950/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("flex size-9 items-center justify-center rounded-xl", s.isEnabled ? "bg-emerald-500/10 text-emerald-600" : "bg-gray-200/50 text-gray-400 dark:bg-gray-800/50")}>
                  {s.isEnabled ? <Power className="size-4" /> : <PowerOff className="size-4" />}
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">{s.displayName}</p>
                  <p className="text-[10px] font-bold text-muted-foreground/60">{s.category === 'api_keys' ? 'مفاتيح API' : s.category === 'monitoring' ? 'مراقبة' : s.category === 'general' ? 'عام' : s.category}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className={cn("size-2 rounded-full", s.isEnabled ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-gray-400 dark:bg-gray-600")} />
                <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-black", usageColor(s.resourceUsage))}>{s.resourceUsage === 'high' ? 'عال' : s.resourceUsage === 'medium' ? 'متوسط' : 'خفيف'}</span>
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
    <div className="rounded-[32px] border border-border/40 bg-white/70 p-6 shadow-lg backdrop-blur-xl dark:bg-slate-900/70">
      <div className="mb-5 flex items-center gap-4">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 shadow-inner">
          <AlertTriangle className="size-6" />
        </div>
        <div>
          <h3 className="text-lg font-black">التنبيهات</h3>
          <p className="text-[11px] font-bold text-muted-foreground/70">آخر الأحداث الهامة في النظام</p>
        </div>
      </div>
      <div className="space-y-2">
        {alerts.map((a) => (
          <div key={a.id} className={cn("flex items-start gap-3 rounded-2xl p-3.5", a.type === 'error' ? "bg-rose-500/5 border border-rose-500/10" : "bg-amber-500/5 border border-amber-500/10")}>
            {a.type === 'error' ? <XCircle className="mt-0.5 size-4 shrink-0 text-rose-500" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-foreground truncate">{a.message}</p>
              <p className="text-[10px] font-bold text-muted-foreground/60 mt-0.5">
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
    <div className="relative w-full bg-slate-50/30 p-6 dark:bg-slate-950/20 lg:p-10" dir="rtl">
      <div className="pointer-events-none absolute -right-20 -top-20 size-[500px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 size-[500px] rounded-full bg-indigo-500/5 blur-[120px]" />

      <div className="relative w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-[20px] bg-primary text-white shadow-xl shadow-primary/20">
                <LayoutDashboard className="size-6" />
              </div>
              <h1 className="text-4xl font-black tracking-tight text-foreground">لوحة تحكم مدير النظام</h1>
            </div>
            <p className="text-lg font-bold text-muted-foreground/70">
              مرحباً {user?.firstName} {user?.lastName}، إليك نظرة شاملة على نبض النظام اليوم.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white/50 p-2.5 shadow-sm dark:bg-slate-900/50">
              <div className="flex size-9 items-center justify-center rounded-xl bg-green-500/10 text-green-600">
                <Clock className="size-5" />
              </div>
              <div className="pl-3 text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">تاريخ اليوم</p>
                <p className="text-sm font-black text-foreground">
                  {new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              </div>
            </div>

            <Button onClick={() => setShowActiveUsers(true)}
              className="h-14 rounded-2xl bg-green-600 px-6 font-black shadow-lg shadow-green-500/20 transition-all hover:scale-105 hover:bg-green-700 active:scale-95">
              <Users className="ml-2 size-5" />
              المستخدمون النشطون
            </Button>

            <Button variant="outline" onClick={() => fetchDashboard(true)} disabled={isRefreshing}
              className="h-14 rounded-2xl border-border/60 bg-white/50 px-6 font-black shadow-sm backdrop-blur-sm transition-all hover:bg-white active:scale-95 dark:bg-slate-900/50">
              <RefreshCw className={cn("ml-2 size-5", isRefreshing && "animate-spin")} />
              {isRefreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
            </Button>
          </div>
        </div>

        {/* System Health */}
        {data?.health && <SystemHealthBar health={data.health} />}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="إجمالي الشركات" value={data?.overview?.totalCompanies || 0} icon={Building2} color="indigo"
            subtext={`نشطة: ${data?.overview?.activeCompanies || 0}`} growth={data?.comparison?.companiesGrowth} />
          <MetricCard title="إجمالي المستخدمين" value={data?.overview?.totalUsers || 0} icon={Users2} color="emerald"
            growth={data?.comparison?.usersGrowth} />
          <MetricCard title="إجمالي العملاء" value={data?.overview?.totalCustomers || 0} icon={Users} color="blue"
            growth={data?.comparison?.customersGrowth} />
          <MetricCard title="إجمالي المحادثات" value={data?.overview?.totalConversations || 0} icon={MessageSquare} color="amber"
            subtext="عبر كل القنوات" />
        </div>

        {/* Recent Activity + Growth */}
        <Card className="rounded-[40px] border-border/40 bg-white/70 shadow-lg backdrop-blur-xl dark:bg-slate-900/70">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 shadow-inner">
                  <TrendingUp className="size-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black">النشاط الأخير</CardTitle>
                  <CardDescription className="text-[11px] font-bold">معدل النمو خلال آخر 30 يوماً</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="rounded-full border-emerald-500/20 bg-emerald-500/5 px-4 py-1 text-[11px] font-black text-emerald-600">
                + نمو إيجابي
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="group relative overflow-hidden rounded-[32px] border border-border/40 bg-white/50 p-6 transition-all hover:bg-white dark:bg-slate-950/50">
                <div className="absolute -left-6 -top-6 size-20 rounded-full bg-indigo-500/5 blur-2xl" />
                <div className="relative space-y-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                    <Briefcase className="size-5" />
                  </div>
                  <div>
                    <p className="text-3xl font-black text-foreground">{data?.recentActivity?.newCompaniesLast30Days || 0}</p>
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">شركات جديدة</p>
                    {data?.comparison?.companiesGrowth !== undefined && (
                      <p className={cn("mt-1 text-[10px] font-black", data.comparison.companiesGrowth >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {data.comparison.companiesGrowth >= 0 ? '↑' : '↓'} {Math.abs(data.comparison.companiesGrowth).toFixed(1)}% عن الشهر الماضي
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-[32px] border border-border/40 bg-white/50 p-6 transition-all hover:bg-white dark:bg-slate-950/50">
                <div className="absolute -left-6 -top-6 size-20 rounded-full bg-emerald-500/5 blur-2xl" />
                <div className="relative space-y-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <Users2 className="size-5" />
                  </div>
                  <div>
                    <p className="text-3xl font-black text-foreground">{data?.recentActivity?.newUsersLast30Days || 0}</p>
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">مستخدمين جدد</p>
                    {data?.comparison?.usersGrowth !== undefined && (
                      <p className={cn("mt-1 text-[10px] font-black", data.comparison.usersGrowth >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {data.comparison.usersGrowth >= 0 ? '↑' : '↓'} {Math.abs(data.comparison.usersGrowth).toFixed(1)}% عن الشهر الماضي
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-[32px] border border-border/40 bg-white/50 p-6 transition-all hover:bg-white dark:bg-slate-950/50">
                <div className="absolute -left-6 -top-6 size-20 rounded-full bg-blue-500/5 blur-2xl" />
                <div className="relative space-y-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <p className="text-3xl font-black text-foreground">{data?.recentActivity?.newCustomersLast30Days || 0}</p>
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">عملاء جدد</p>
                    {data?.comparison?.customersGrowth !== undefined && (
                      <p className={cn("mt-1 text-[10px] font-black", data.comparison.customersGrowth >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {data.comparison.customersGrowth >= 0 ? '↑' : '↓'} {Math.abs(data.comparison.customersGrowth).toFixed(1)}% عن الشهر الماضي
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
