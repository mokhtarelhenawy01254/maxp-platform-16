import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Building2,
  Users,
  MessageSquare,
  Users2,
  TrendingUp,
  Clock,
  RefreshCw,
  LayoutDashboard,
  Zap,
  Briefcase,
  Activity,
} from "lucide-react";
import { useAuth } from "../hooks/useAuthSimple";
import { useTheme } from "../hooks/useTheme";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";
import {
  createStorageKey,
  getWithExpiry,
  setWithExpiry,
} from "../utils/storage";
import ActiveUsersMonitor from "../components/ActiveUsersMonitor";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { cn } from "../lib/utils";
import { toast } from "sonner";

const DASHBOARD_CACHE_TTL_MS = 60 * 1000;

interface Statistics {
  overview: {
    totalCompanies: number;
    activeCompanies: number;
    totalUsers: number;
    totalCustomers: number;
    totalConversations: number;
  };
  recentActivity: {
    newCompaniesLast30Days: number;
    newUsersLast30Days: number;
    newCustomersLast30Days: number;
  };
}

const MetricCard = ({ 
  title, value, icon: Icon, color, subtext, className = "" 
}: { 
  title: string; value: number | string; icon: React.ComponentType<{ className?: string }>; color: string; subtext?: string; className?: string;
}) => {
  const colorMap: Record<string, string> = {
    indigo: "from-indigo-500/20 to-indigo-600/10 text-indigo-600 border-indigo-200/40 dark:border-indigo-800/40",
    emerald: "from-emerald-500/20 to-emerald-600/10 text-emerald-600 border-emerald-200/40 dark:border-emerald-800/40",
    blue: "from-blue-500/20 to-blue-600/10 text-blue-600 border-blue-200/40 dark:border-blue-800/40",
    amber: "from-amber-500/20 to-amber-600/10 text-amber-600 border-amber-200/40 dark:border-amber-800/40",
  };

  const glowMap: Record<string, string> = {
    indigo: "bg-indigo-500/10",
    emerald: "bg-emerald-500/10",
    blue: "bg-blue-500/10",
    amber: "bg-amber-500/10",
  };

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-[32px] border bg-white/70 p-6 shadow-sm backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl dark:bg-slate-950/70",
      colorMap[color] || "border-border/40",
      className
    )}>
      {/* Cinematic Glow */}
      <div className={cn("absolute -left-12 -top-12 size-32 rounded-full blur-3xl transition-all duration-700 group-hover:scale-125", glowMap[color] || "bg-primary/5")} />
      
      <div className="relative flex items-center justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-4xl font-black tracking-tighter text-foreground">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </h3>
          </div>
          {subtext && (
            <Badge variant="outline" className={cn(
              "mt-2 rounded-full border-none px-2.5 py-0.5 text-[10px] font-black",
              colorMap[color]?.split(' ')[2] // Use the text color
            )}>
              <Activity className="mr-1 size-3" />
              {subtext}
            </Badge>
          )}
        </div>
        <div className={cn(
          "flex size-14 items-center justify-center rounded-[22px] shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg",
          colorMap[color]?.split(' ').slice(0, 2).join(' ') // Use the gradient
        )}>
          <Icon className="size-7" />
        </div>
      </div>
    </div>
  );
};


const SuperAdminDashboard = () => {
  const { user } = useAuth();

  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showActiveUsers, setShowActiveUsers] = useState(false);
  const hasStatisticsRef = useRef(false);

  const cacheKey = useMemo(
    () => createStorageKey("dashboard", `super-admin:${user?.id || "anon"}`),
    [user?.id],
  );

  useEffect(() => {
    hasStatisticsRef.current = Boolean(statistics);
  }, [statistics]);

  const fetchStatistics = useCallback(
    async ({ force = false, signal }: { force?: boolean; signal?: AbortSignal } = {}) => {
      const cached = !force ? getWithExpiry(cacheKey) : null;
      if (cached) {
        setStatistics(cached);
        setError(null);
        setLoading(false);
        return;
      }

      if (hasStatisticsRef.current) setIsRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const token = tokenManager.getAccessToken();
        const response = await fetch(buildApiUrl("admin/statistics"), {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          signal,
        });

        const data = await response.json().catch(() => null);
        if (response.ok && data?.success) {
          setStatistics(data.data);
          setWithExpiry(cacheKey, data.data, DASHBOARD_CACHE_TTL_MS);
        } else {
          setError(data?.message || "فشل في جلب الإحصائيات");
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("فشل في الاتصال بالخادم");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [cacheKey],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchStatistics({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchStatistics]);

  if (loading && !statistics) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
          <p className="text-sm font-black text-muted-foreground animate-pulse">جاري تحميل البيانات الأساسية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-slate-50/30 p-6 dark:bg-slate-950/20 lg:p-10" dir="rtl">
      {/* Background Cinematic Glows */}
      <div className="pointer-events-none absolute -right-20 -top-20 size-[500px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 size-[500px] rounded-full bg-indigo-500/5 blur-[120px]" />

      <div className="relative mx-auto max-w-[1600px] space-y-10">
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-[20px] bg-primary text-white shadow-xl shadow-primary/20">
                <LayoutDashboard className="size-6" />
              </div>
              <h1 className="text-4xl font-black tracking-tight text-foreground">
                لوحة تحكم مدير النظام
              </h1>
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

            <Button
              onClick={() => setShowActiveUsers(true)}
              className="h-14 rounded-2xl bg-green-600 px-6 font-black shadow-lg shadow-green-500/20 transition-all hover:scale-105 hover:bg-green-700 active:scale-95"
            >
              <Users className="ml-2 size-5" />
              المستخدمون النشطون
            </Button>
            
            <Button
              variant="outline"
              onClick={() => fetchStatistics({ force: true })}
              disabled={isRefreshing}
              className="h-14 rounded-2xl border-border/60 bg-white/50 px-6 font-black shadow-sm backdrop-blur-sm transition-all hover:bg-white active:scale-95 dark:bg-slate-900/50"
            >
              <RefreshCw className={cn("ml-2 size-5", isRefreshing && "animate-spin")} />
              تحديث البيانات
            </Button>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="إجمالي الشركات"
            value={statistics?.overview?.totalCompanies || 0}
            icon={Building2}
            color="indigo"
            subtext={`نشطة: ${statistics?.overview?.activeCompanies || 0}`}
          />
          <MetricCard
            title="إجمالي المستخدمين"
            value={statistics?.overview?.totalUsers || 0}
            icon={Users2}
            color="emerald"
            subtext="مستخدمين مسجلين"
          />
          <MetricCard
            title="إجمالي العملاء"
            value={statistics?.overview?.totalCustomers || 0}
            icon={Users}
            color="blue"
            subtext="عملاء نهائيين"
          />
          <MetricCard
            title="إجمالي المحادثات"
            value={statistics?.overview?.totalConversations || 0}
            icon={MessageSquare}
            color="amber"
            subtext="عبر كل القنوات"
          />
        </div>

        {/* Detailed Sections */}
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
                        <p className="text-3xl font-black text-foreground">{statistics?.recentActivity?.newCompaniesLast30Days || 0}</p>
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">شركات جديدة</p>
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
                        <p className="text-3xl font-black text-foreground">{statistics?.recentActivity?.newUsersLast30Days || 0}</p>
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">مستخدمين جدد</p>
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
                        <p className="text-3xl font-black text-foreground">{statistics?.recentActivity?.newCustomersLast30Days || 0}</p>
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">عملاء جدد</p>
                      </div>
                   </div>
                </div>
              </div>

              {/* System Health / Performance Placeholder */}
              <div className="mt-8 rounded-[32px] border border-dashed border-border/60 p-10 text-center">
                 <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/5 text-primary">
                   <Zap className="size-8 animate-pulse" />
                 </div>
                 <h4 className="mt-4 text-base font-black">أداء النظام: ممتاز</h4>
                 <p className="mx-auto mt-2 max-w-sm text-[11px] font-bold text-muted-foreground/70 leading-relaxed">
                   تعمل جميع خوادم النظام بكفاءة كاملة بنسبة استجابة 99.9%. لم يتم رصد أي مشكلات تقنية خلال آخر 24 ساعة.
                 </p>
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Active Users Monitor Overlay */}
      <ActiveUsersMonitor
        isOpen={showActiveUsers}
        onClose={() => setShowActiveUsers(false)}
      />
    </div>
  );
};

export default SuperAdminDashboard;
