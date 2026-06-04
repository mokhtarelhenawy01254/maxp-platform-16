import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  CircleDollarSign,
  Download,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { BusinessMetricsStrip } from "../components/business/BusinessMetrics";
import {
  BusinessPageHero,
  BusinessPageShell,
  BusinessSectionPanel,
} from "../components/business/BusinessSurface";
import { useTheme } from "../hooks/useTheme";
import { cn } from "../lib/utils";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";

type ReportsTabKey = "growth" | "performance" | "revenue";

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type GrowthMetricRecord = {
  current?: number;
  growth?: number | string;
};

type GrowthData = {
  periodGrowth?: Record<string, GrowthMetricRecord>;
  dailyGrowth?: Array<{
    date: string;
    companies?: number;
    users?: number;
    customers?: number;
    conversations?: number;
  }>;
};

type CompanyPerformanceRecord = {
  id: string;
  name: string;
  engagementScore: number;
  totalCustomers: number;
  totalConversations: number;
  plan: string;
};

type RevenuePlanRecord = {
  plan: string;
  totalRevenue: number;
  companies: number;
};

type RevenueData = {
  totalMRR?: number;
  projectedARR?: number;
  averageRevenuePerCompany?: number;
  monthlyRevenue?: Array<{
    month: string;
    revenue: number;
    companies: number;
  }>;
  revenueByPlan?: RevenuePlanRecord[];
};

type SystemHealth = {
  healthScore: number;
  status: string;
  activeCompanies: number;
  totalCompanies: number;
};

const PERIOD_OPTIONS = [
  { value: "7", label: "7 أيام" },
  { value: "30", label: "30 يوم" },
  { value: "90", label: "90 يوم" },
  { value: "365", label: "سنة" },
];

const GROWTH_METRIC_CONFIG: Array<{
  key: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  tone: "primary" | "secondary" | "warning" | "success";
}> = [
  { key: "companies", label: "الشركات", icon: Building2, tone: "primary" },
  { key: "users", label: "المستخدمون", icon: ShieldCheck, tone: "secondary" },
  { key: "customers", label: "العملاء", icon: Activity, tone: "success" },
  { key: "conversations", label: "المحادثات", icon: TrendingUp, tone: "warning" },
  { key: "messages", label: "الرسائل", icon: BarChart3, tone: "primary" },
];

const PLAN_LABELS: Record<string, string> = {
  BASIC: "أساسي",
  PRO: "احترافي",
  ENTERPRISE: "مؤسسي",
};

const formatCompactNumber = (value?: number | string | null) => {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  if (Math.abs(numericValue) >= 1_000_000) {
    return `${(numericValue / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(numericValue) >= 1_000) {
    return `${(numericValue / 1_000).toFixed(1)}K`;
  }
  return numericValue.toLocaleString("en-US");
};

const formatCurrency = (value?: number | string | null) =>
  `$${formatCompactNumber(value)}`;

const toNumericGrowth = (value?: number | string | null) => {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : NaN;
  return Number.isFinite(numeric) ? numeric : 0;
};

const getHealthTone = (
  status?: string,
): "primary" | "secondary" | "warning" | "success" => {
  switch (status) {
    case "excellent":
      return "success";
    case "good":
      return "secondary";
    case "fair":
      return "warning";
    default:
      return "primary";
  }
};

const getHealthLabel = (status?: string) => {
  switch (status) {
    case "excellent":
      return "ممتاز";
    case "good":
      return "جيد";
    case "fair":
      return "متوسط";
    case "poor":
      return "يحتاج تدخل";
    default:
      return "غير محدد";
  }
};

const getHealthBadgeClassName = (status?: string) => {
  switch (status) {
    case "excellent":
      return "border-emerald-200 bg-emerald-500/10 text-emerald-700";
    case "good":
      return "border-sky-200 bg-sky-500/10 text-sky-700";
    case "fair":
      return "border-amber-200 bg-amber-500/10 text-amber-700";
    case "poor":
      return "border-rose-200 bg-rose-500/10 text-rose-700";
    default:
      return "border-border bg-muted text-foreground";
  }
};

const getGrowthBadgeClassName = (growth?: number | string | null) => {
  const value = toNumericGrowth(growth);
  if (value > 0) {
    return "border-emerald-200 bg-emerald-500/10 text-emerald-700";
  }
  if (value < 0) {
    return "border-rose-200 bg-rose-500/10 text-rose-700";
  }
  return "border-slate-200 bg-slate-500/10 text-slate-700";
};

const getAuthHeaders = (): HeadersInit =>
  tokenManager.createAuthHeaders({
    "Content-Type": "application/json",
  });

const EmptyState: React.FC<{
  title: string;
  description: string;
}> = ({ title, description }) => (
  <div className="flex min-h-[16rem] flex-col items-center justify-center rounded-[2rem] border border-dashed border-border/70 bg-background/70 px-6 text-center">
    <BarChart3 className="mb-3 size-10 text-muted-foreground" />
    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
    <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
      {description}
    </p>
  </div>
);

const SuperAdminReports: React.FC = () => {
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";

  const [activeTab, setActiveTab] = useState<ReportsTabKey>("growth");
  const [period, setPeriod] = useState("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [growthData, setGrowthData] = useState<GrowthData | null>(null);
  const [companyPerformance, setCompanyPerformance] = useState<
    CompanyPerformanceRecord[]
  >([]);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [chartsReady, setChartsReady] = useState(false);

  const mountedRef = useRef(true);
  const requestRef = useRef(0);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleUnauthorized = useCallback(() => {
    tokenManager.clearTokens();
    window.location.href = "/auth/login";
  }, []);

  const requestApi = useCallback(
    async <T,>(path: string): Promise<ApiEnvelope<T>> => {
      const response = await fetch(buildApiUrl(path), {
        headers: getAuthHeaders(),
      });

      let payload: ApiEnvelope<T> = {};
      try {
        payload = (await response.json()) as ApiEnvelope<T>;
      } catch {
        payload = {};
      }

      if (response.status === 401) {
        handleUnauthorized();
        throw new Error("انتهت صلاحية الجلسة");
      }

      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      return payload;
    },
    [handleUnauthorized],
  );

  const fetchAllData = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    try {
      setLoading(true);
      setError(null);

      const results = await Promise.allSettled([
        requestApi<GrowthData>(`admin/analytics/growth?period=${period}`),
        requestApi<CompanyPerformanceRecord[]>("admin/analytics/company-performance"),
        requestApi<RevenueData>("admin/analytics/revenue"),
        requestApi<SystemHealth>("admin/analytics/system-health"),
      ]);

      if (!mountedRef.current || requestId !== requestRef.current) {
        return;
      }

      const [growthResult, performanceResult, revenueResult, healthResult] = results;

      if (growthResult.status === "fulfilled" && growthResult.value.success) {
        setGrowthData(growthResult.value.data || null);
      } else {
        setGrowthData(null);
      }

      if (
        performanceResult.status === "fulfilled" &&
        performanceResult.value.success &&
        Array.isArray(performanceResult.value.data)
      ) {
        setCompanyPerformance(performanceResult.value.data);
      } else {
        setCompanyPerformance([]);
      }

      if (revenueResult.status === "fulfilled" && revenueResult.value.success) {
        setRevenueData(revenueResult.value.data || null);
      } else {
        setRevenueData(null);
      }

      if (healthResult.status === "fulfilled" && healthResult.value.success) {
        setSystemHealth(healthResult.value.data || null);
      } else {
        setSystemHealth(null);
      }

      const hasRejectedResult = results.some((result) => result.status === "rejected");
      if (hasRejectedResult) {
        setError("تم تحميل جزء من التقارير، لكن بعض البيانات لم تصل من الخادم.");
      }
    } catch (fetchError) {
      if (!mountedRef.current || requestId !== requestRef.current) {
        return;
      }

      setGrowthData(null);
      setCompanyPerformance([]);
      setRevenueData(null);
      setSystemHealth(null);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "فشل في جلب بيانات التقارير",
      );
    } finally {
      if (mountedRef.current && requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [period, requestApi]);

  useEffect(() => {
    void fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    setChartsReady(false);
    const timeout = window.setTimeout(() => {
      if (mountedRef.current) {
        setChartsReady(true);
      }
    }, 120);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeTab, loading]);

  const chartTheme = useMemo(
    () => ({
      grid: isDark ? "#334155" : "#dbe4f0",
      text: isDark ? "#94a3b8" : "#64748b",
      tooltip: {
        bg: isDark ? "#101a2b" : "#ffffff",
        border: isDark ? "#243348" : "#dbe4f0",
        text: isDark ? "#f1f5f9" : "#1e293b",
      },
      colors: isDark
        ? ["#818cf8", "#34d399", "#fbbf24", "#fb7185", "#a78bfa"]
        : ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
    }),
    [isDark],
  );

  const planDistributionData = useMemo(() => {
    const performancePlans = companyPerformance.reduce<Record<string, number>>(
      (accumulator, company) => {
        const key = company.plan || "OTHER";
        accumulator[key] = (accumulator[key] || 0) + 1;
        return accumulator;
      },
      {},
    );

    return Object.entries(performancePlans).map(([plan, count]) => ({
      name: PLAN_LABELS[plan] || plan,
      value: count,
    }));
  }, [companyPerformance]);

  const revenueByPlanData = useMemo(
    () =>
      (revenueData?.revenueByPlan || []).map((plan) => ({
        name: PLAN_LABELS[plan.plan] || plan.plan,
        value: plan.totalRevenue,
        companies: plan.companies,
      })),
    [revenueData?.revenueByPlan],
  );

  const headlineMetrics = useMemo(() => {
    const activeCompaniesLabel = systemHealth
      ? `${systemHealth.activeCompanies}/${systemHealth.totalCompanies}`
      : "0/0";

    return [
      {
        title: "صحة النظام",
        value: `${systemHealth?.healthScore ?? 0}%`,
        subtitle: getHealthLabel(systemHealth?.status),
        tone: getHealthTone(systemHealth?.status),
        icon: ShieldCheck,
      },
      {
        title: "الشركات النشطة",
        value: activeCompaniesLabel,
        subtitle: "شركات فعّالة من إجمالي الحسابات",
        tone: "secondary" as const,
        icon: Building2,
      },
      {
        title: "MRR",
        value: formatCurrency(revenueData?.totalMRR),
        subtitle: "الإيراد الشهري المتكرر",
        tone: "success" as const,
        icon: CircleDollarSign,
      },
      {
        title: "متوسط الإيراد",
        value: formatCurrency(revenueData?.averageRevenuePerCompany),
        subtitle: `آخر ${period} يوم`,
        tone: "warning" as const,
        icon: TrendingUp,
      },
    ];
  }, [period, revenueData?.averageRevenuePerCompany, revenueData?.totalMRR, systemHealth]);

  const handleExport = () => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      period,
      growthData,
      companyPerformance,
      revenueData,
      systemHealth,
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `super-admin-reports-${period}d.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  };

  const growthCards = GROWTH_METRIC_CONFIG.map((metric) => ({
    ...metric,
    current: growthData?.periodGrowth?.[metric.key]?.current ?? 0,
    growth: growthData?.periodGrowth?.[metric.key]?.growth ?? 0,
  })).filter((metric) => metric.current > 0 || metric.growth !== 0);

  return (
    <BusinessPageShell className="space-y-4" dir="rtl">
      <BusinessPageHero
        eyebrow="SUPER ADMIN • ANALYTICS"
        title="التقارير والتحليلات المتقدمة"
        description="تحليلات موحّدة لأداء النظام والشركات والإيرادات، بتجربة أوضح على الموبايل من غير الاعتماد على MUI."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Select value={period} onValueChange={(value) => setPeriod(value || "30")}>
              <SelectTrigger className="h-11 rounded-2xl min-w-[9rem]">
                <SelectValue placeholder="اختر الفترة" />
              </SelectTrigger>
              <SelectContent align="end">
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl"
              onClick={() => void fetchAllData()}
              disabled={loading}
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              تحديث
            </Button>
            <Button
              type="button"
              className="h-11 rounded-2xl"
              onClick={handleExport}
              disabled={loading}
            >
              <Download className="size-4" />
              تصدير JSON
            </Button>
          </div>
        }
      />

      <BusinessMetricsStrip items={headlineMetrics} />

      {systemHealth ? (
        <Alert className="business-page-panel border-0 shadow-none">
          <ShieldCheck className="size-4 text-primary" />
          <AlertTitle>صحة النظام الآن</AlertTitle>
          <AlertDescription>
            <div className="flex flex-wrap items-center gap-2">
              <span>
                {systemHealth.activeCompanies} من {systemHealth.totalCompanies} شركة
                نشطة حاليًا.
              </span>
              <Badge
                className={cn(
                  "rounded-full border px-3 py-1",
                  getHealthBadgeClassName(systemHealth.status),
                )}
              >
                {systemHealth.healthScore}% • {getHealthLabel(systemHealth.status)}
              </Badge>
            </div>
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => setActiveTab("growth")}>
              راجع النمو
            </Button>
          </AlertAction>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="business-page-panel border-0 shadow-none">
          <Activity className="size-4" />
          <AlertTitle>تعذر تحميل كل التقارير</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => void fetchAllData()}>
              إعادة المحاولة
            </Button>
          </AlertAction>
        </Alert>
      ) : null}

      {loading && !growthData && companyPerformance.length === 0 && !revenueData ? (
        <div className="flex min-h-[18rem] items-center justify-center rounded-[2rem] border border-dashed border-border/70 bg-background/70">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            جاري تحميل التقارير...
          </div>
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(
              value === "performance" || value === "revenue" ? value : "growth",
            )
          }
          className="w-full gap-4"
        >
          <TabsList
            variant="line"
            className="w-full justify-start overflow-x-auto rounded-2xl bg-muted/45 p-1"
          >
            <TabsTrigger value="growth" className="min-w-[8.5rem] rounded-xl">
              <TrendingUp className="size-4" />
              النمو
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              className="min-w-[8.5rem] rounded-xl"
            >
              <Building2 className="size-4" />
              أداء الشركات
            </TabsTrigger>
            <TabsTrigger value="revenue" className="min-w-[8.5rem] rounded-xl">
              <CircleDollarSign className="size-4" />
              الإيرادات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="growth" className="w-full space-y-4">
            {activeTab === "growth" ? (
              <>
                <BusinessSectionPanel
              title="مؤشرات النمو"
              description={`ملخص سريع لآخر ${period} يوم`}
              contentClassName="space-y-4 p-4 md:p-6"
            >
              {growthCards.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {growthCards.map((metric) => {
                    const Icon = metric.icon;
                    return (
                      <div
                        key={metric.key}
                        className="rounded-[2rem] border border-border/70 bg-background/80 p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {metric.label}
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-foreground">
                              {formatCompactNumber(metric.current)}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/70 bg-muted/60 p-2.5">
                            <Icon className="size-5 text-primary" />
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <Badge
                            className={cn(
                              "rounded-full border px-3 py-1",
                              getGrowthBadgeClassName(metric.growth),
                            )}
                          >
                            {toNumericGrowth(metric.growth)}%
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            مقارنة بالفترة السابقة
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="لا توجد مؤشرات نمو متاحة"
                  description="جرّب تحديث الصفحة أو تغيير الفترة الزمنية لتحميل بيانات مختلفة."
                />
              )}
            </BusinessSectionPanel>

                <BusinessSectionPanel
              title="النمو اليومي للنظام"
              description="تغير الشركات والمستخدمين والعملاء والمحادثات عبر الأيام."
              contentClassName="p-4 md:p-6"
            >
              {(growthData?.dailyGrowth || []).length > 0 ? (
                <div className="h-[19rem] min-w-0 md:h-[24rem]">
                  {chartsReady ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <AreaChart data={growthData?.dailyGrowth || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                        <XAxis
                          dataKey="date"
                          stroke={chartTheme.text}
                          tick={{ fill: chartTheme.text, fontSize: 12 }}
                        />
                        <YAxis
                          stroke={chartTheme.text}
                          tick={{ fill: chartTheme.text, fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: chartTheme.tooltip.bg,
                            borderColor: chartTheme.tooltip.border,
                            color: chartTheme.tooltip.text,
                            borderRadius: 16,
                          }}
                          itemStyle={{ color: chartTheme.tooltip.text }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="companies"
                          stackId="1"
                          stroke={chartTheme.colors[0]}
                          fill={chartTheme.colors[0]}
                          fillOpacity={0.55}
                          name="شركات"
                        />
                        <Area
                          type="monotone"
                          dataKey="users"
                          stackId="1"
                          stroke={chartTheme.colors[1]}
                          fill={chartTheme.colors[1]}
                          fillOpacity={0.55}
                          name="مستخدمون"
                        />
                        <Area
                          type="monotone"
                          dataKey="customers"
                          stackId="1"
                          stroke={chartTheme.colors[2]}
                          fill={chartTheme.colors[2]}
                          fillOpacity={0.55}
                          name="عملاء"
                        />
                        <Area
                          type="monotone"
                          dataKey="conversations"
                          stackId="1"
                          stroke={chartTheme.colors[3]}
                          fill={chartTheme.colors[3]}
                          fillOpacity={0.55}
                          name="محادثات"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full animate-pulse rounded-[1.5rem] bg-muted/45" />
                  )}
                </div>
              ) : (
                <EmptyState
                  title="لا توجد بيانات يومية"
                  description="لم تصل بيانات السلسلة الزمنية الخاصة بالنمو اليومي حتى الآن."
                />
              )}
            </BusinessSectionPanel>
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="performance" className="w-full space-y-4">
            {activeTab === "performance" ? (
              <>
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                  <BusinessSectionPanel
                title="أداء الشركات حسب نقاط المشاركة"
                description="أفضل 10 شركات من حيث engagement score."
                contentClassName="p-4 md:p-6"
              >
                {companyPerformance.length > 0 ? (
                  <div className="h-[19rem] min-w-0 md:h-[24rem]">
                    {chartsReady ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart data={companyPerformance.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                          <XAxis
                            dataKey="name"
                            stroke={chartTheme.text}
                            tick={{ fill: chartTheme.text, fontSize: 11 }}
                            tickFormatter={(value) =>
                              typeof value === "string" ? value.slice(0, 8) : ""
                            }
                          />
                          <YAxis
                            stroke={chartTheme.text}
                            tick={{ fill: chartTheme.text, fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: chartTheme.tooltip.bg,
                              borderColor: chartTheme.tooltip.border,
                              color: chartTheme.tooltip.text,
                              borderRadius: 16,
                            }}
                          />
                          <Bar
                            dataKey="engagementScore"
                            fill={chartTheme.colors[0]}
                            name="نقاط المشاركة"
                            radius={[8, 8, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full animate-pulse rounded-[1.5rem] bg-muted/45" />
                    )}
                  </div>
                ) : (
                  <EmptyState
                    title="لا يوجد ترتيب للشركات"
                    description="بيانات أداء الشركات غير متاحة حاليًا."
                />
              )}
            </BusinessSectionPanel>

                  <BusinessSectionPanel
                title="توزيع الخطط"
                description="عدد الشركات في كل خطة اشتراك."
                contentClassName="space-y-4 p-4 md:p-6"
              >
                {planDistributionData.length > 0 ? (
                  <>
                    <div className="h-[17rem] min-w-0">
                      {chartsReady ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <PieChart>
                            <Pie
                              data={planDistributionData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={90}
                              dataKey="value"
                              nameKey="name"
                            >
                              {planDistributionData.map((item, index) => (
                                <Cell
                                  key={`${item.name}-${index}`}
                                  fill={
                                    chartTheme.colors[index % chartTheme.colors.length]
                                  }
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: chartTheme.tooltip.bg,
                                borderColor: chartTheme.tooltip.border,
                                color: chartTheme.tooltip.text,
                                borderRadius: 16,
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full animate-pulse rounded-[1.5rem] bg-muted/45" />
                      )}
                    </div>
                    <div className="space-y-2">
                      {planDistributionData.map((item, index) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="size-3 rounded-full"
                              style={{
                                backgroundColor:
                                  chartTheme.colors[index % chartTheme.colors.length],
                              }}
                            />
                            <span className="text-sm font-medium text-foreground">
                              {item.name}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {item.value} شركة
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState
                    title="لا يوجد توزيع للخطط"
                    description="لم تصل بيانات الخطط من الخادم حتى الآن."
                />
              )}
            </BusinessSectionPanel>
                </div>

                <BusinessSectionPanel
              title="تفاصيل أداء الشركات"
              description="قائمة مرتبة تسهل المراجعة من الموبايل والديسكتوب."
              contentClassName="space-y-3 p-4 md:p-6"
            >
              {companyPerformance.length > 0 ? (
                companyPerformance.map((company, index) => (
                  <div
                    key={company.id}
                    className="flex flex-col gap-3 rounded-[2rem] border border-border/70 bg-background/80 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-full px-3 py-1">
                          #{index + 1}
                        </Badge>
                        <h3 className="truncate text-base font-semibold text-foreground">
                          {company.name}
                        </h3>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {company.totalCustomers} عميل • {company.totalConversations} محادثة
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <Badge
                        className={cn(
                          "rounded-full border px-3 py-1",
                          company.engagementScore >= 70
                            ? "border-emerald-200 bg-emerald-500/10 text-emerald-700"
                            : company.engagementScore >= 40
                              ? "border-amber-200 bg-amber-500/10 text-amber-700"
                              : "border-rose-200 bg-rose-500/10 text-rose-700",
                        )}
                      >
                        {company.engagementScore} نقطة
                      </Badge>
                      <Badge variant="outline" className="rounded-full px-3 py-1">
                        {PLAN_LABELS[company.plan] || company.plan}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="لا توجد شركات للعرض"
                  description="بيانات الأداء التفصيلية للشركات غير متاحة."
                />
              )}
            </BusinessSectionPanel>
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="revenue" className="w-full space-y-4">
            {activeTab === "revenue" ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[2rem] border border-border/70 bg-background/80 p-4 shadow-sm">
                <p className="text-sm text-muted-foreground">الإيرادات الشهرية</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">
                  {formatCurrency(revenueData?.totalMRR)}
                </p>
              </div>
                  <div className="rounded-[2rem] border border-border/70 bg-background/80 p-4 shadow-sm">
                <p className="text-sm text-muted-foreground">الإيرادات السنوية المتوقعة</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">
                  {formatCurrency(revenueData?.projectedARR)}
                </p>
              </div>
                  <div className="rounded-[2rem] border border-border/70 bg-background/80 p-4 shadow-sm">
                <p className="text-sm text-muted-foreground">متوسط الإيراد لكل شركة</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">
                  {formatCurrency(revenueData?.averageRevenuePerCompany)}
                </p>
              </div>
                  <div className="rounded-[2rem] border border-border/70 bg-background/80 p-4 shadow-sm">
                <p className="text-sm text-muted-foreground">إجمالي الشركات النشطة</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">
                  {(revenueData?.revenueByPlan || []).reduce(
                    (sum, plan) => sum + plan.companies,
                    0,
                  )}
                </p>
              </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                  <BusinessSectionPanel
                title="نمو الإيرادات الشهرية"
                description="مقارنة الإيرادات مع عدد الشركات عبر الشهور."
                contentClassName="p-4 md:p-6"
              >
                {(revenueData?.monthlyRevenue || []).length > 0 ? (
                  <div className="h-[19rem] min-w-0 md:h-[24rem]">
                    {chartsReady ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <LineChart data={revenueData?.monthlyRevenue || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                          <XAxis
                            dataKey="month"
                            stroke={chartTheme.text}
                            tick={{ fill: chartTheme.text, fontSize: 12 }}
                          />
                          <YAxis
                            stroke={chartTheme.text}
                            tick={{ fill: chartTheme.text, fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: chartTheme.tooltip.bg,
                              borderColor: chartTheme.tooltip.border,
                              color: chartTheme.tooltip.text,
                              borderRadius: 16,
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke={chartTheme.colors[0]}
                            strokeWidth={2.5}
                            name="الإيرادات ($)"
                          />
                          <Line
                            type="monotone"
                            dataKey="companies"
                            stroke={chartTheme.colors[1]}
                            strokeWidth={2.5}
                            name="عدد الشركات"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full animate-pulse rounded-[1.5rem] bg-muted/45" />
                    )}
                  </div>
                ) : (
                  <EmptyState
                    title="لا توجد بيانات شهرية"
                    description="سلسلة الإيرادات الشهرية غير متاحة حاليًا."
                />
              )}
            </BusinessSectionPanel>

                  <BusinessSectionPanel
                title="الإيرادات حسب الخطة"
                description="كيف تتوزع المساهمة المالية بين الخطط."
                contentClassName="space-y-4 p-4 md:p-6"
              >
                {revenueByPlanData.length > 0 ? (
                  <>
                    <div className="h-[17rem] min-w-0">
                      {chartsReady ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <PieChart>
                            <Pie
                              data={revenueByPlanData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={90}
                              dataKey="value"
                              nameKey="name"
                            >
                              {revenueByPlanData.map((item, index) => (
                                <Cell
                                  key={`${item.name}-${index}`}
                                  fill={
                                    chartTheme.colors[index % chartTheme.colors.length]
                                  }
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: chartTheme.tooltip.bg,
                                borderColor: chartTheme.tooltip.border,
                                color: chartTheme.tooltip.text,
                                borderRadius: 16,
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full animate-pulse rounded-[1.5rem] bg-muted/45" />
                      )}
                    </div>
                    <div className="space-y-2">
                      {revenueByPlanData.map((plan, index) => (
                        <div
                          key={plan.name}
                          className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="size-3 rounded-full"
                              style={{
                                backgroundColor:
                                  chartTheme.colors[index % chartTheme.colors.length],
                              }}
                            />
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {plan.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {plan.companies} شركة
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {formatCurrency(plan.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState
                    title="لا توجد مساهمة حسب الخطة"
                    description="بيانات الإيرادات حسب الخطة غير متوفرة."
                />
              )}
            </BusinessSectionPanel>
                </div>
              </>
            ) : null}
          </TabsContent>
        </Tabs>
      )}
    </BusinessPageShell>
  );
};

export default SuperAdminReports;
