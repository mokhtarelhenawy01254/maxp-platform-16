import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BarChart3, Facebook, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InsightsKpiRow, type KpiItem } from "./InsightsKpiRow";
import { InsightsTrendChart, type ChartPoint } from "./InsightsTrendChart";
import { PostInsightsTable, type PostInsightsRow } from "./PostInsightsTable";

interface InsightsPageOption {
  pageId: string;
  pageName: string;
  followersCount: number | null;
  fanCount?: number | null;
}

interface MetricRow {
  name: string;
  title: string;
  description: string;
  period: string;
  aggregate?: string;
  values: Array<{ endTime: string | null; value: number }>;
}

interface PageInsightsPayload {
  page: {
    name: string;
    fanCount: number | null;
    followersCount: number | null;
    picture: string | null;
  };
  range: { since: string; until: string; days: number };
  period: string;
  metrics: MetricRow[];
  totals: Record<string, number | null>;
}

const PERIOD_OPTIONS = [
  { value: "day", label: "يومي" },
  { value: "week", label: "أسبوعي" },
  { value: "days_28", label: "28 يوم" },
];

const KPI_DEFS = [
  { name: "page_impressions", label: "مرات الظهور" },
  { name: "page_impressions_unique", label: "ظهور فريد" },
  { name: "page_engaged_users", label: "مستخدمون متفاعلون" },
  { name: "page_fans", label: "إجمالي المعجبين" },
  { name: "page_post_engagements", label: "تفاعلات المنشورات" },
  { name: "page_views_total", label: "مشاهدات الصفحة" },
];

const formatShortDate = (iso: string | null): string => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const candidate = error as {
    response?: { data?: { error?: unknown; message?: string; hint?: string } };
    message?: string;
  };
  const payload = candidate?.response?.data;

  if (payload) {
    if (typeof payload.error === "string" && payload.error.trim()) {
      const hint =
        typeof payload.hint === "string" && payload.hint.trim() ? ` — ${payload.hint}` : "";
      return `${payload.error}${hint}`;
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
  }
  if (typeof candidate?.message === "string" && candidate.message.trim()) {
    return candidate.message;
  }
  return fallback;
};

export default function PageInsights() {
  const [pages, setPages] = useState<InsightsPageOption[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [period, setPeriod] = useState<string>("day");
  const [insights, setInsights] = useState<PageInsightsPayload | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostInsightsRow[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestRef = useRef(0);

  const loadPages = useCallback(async () => {
    setPagesLoading(true);
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { pages: InsightsPageOption[]; total: number };
      }>("/pages/insights", { _skipErrorToast: true });

      const list = response.data?.data?.pages ?? [];
      setPages(list);
      setSelectedPageId((current) => current || list[0]?.pageId || "");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "تعذر تحميل قائمة الصفحات المتصلة"));
      setPages([]);
    } finally {
      setPagesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  const loadInsights = useCallback(async (pageId: string, selectedPeriod: string) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const isStale = () => requestRef.current !== requestId;

    setInsightsLoading(true);
    setPostsLoading(true);
    setInsightsError(null);

    try {
      const response = await apiClient.get<{ success: boolean; data: PageInsightsPayload }>(
        `/pages/insights/${pageId}`,
        {
          params: { period: selectedPeriod, days: 28 },
          _skipErrorToast: true,
          timeout: 45000,
        },
      );
      if (isStale()) return;
      setInsights(response.data?.data ?? null);
    } catch (error) {
      if (isStale()) return;
      const message = getApiErrorMessage(error, "تعذر جلب إحصائيات الصفحة");
      setInsights(null);
      setInsightsError(message);
      toast.error(message);
    } finally {
      if (!isStale()) setInsightsLoading(false);
    }

    try {
      const postsResponse = await apiClient.get<{
        success: boolean;
        data: { posts: PostInsightsRow[] };
      }>(`/pages/insights/${pageId}/posts`, {
        _skipErrorToast: true,
        timeout: 60000,
      });
      if (isStale()) return;
      setPosts(postsResponse.data?.data?.posts ?? []);
    } catch (error) {
      if (isStale()) return;
      console.error("[PAGE-INSIGHTS] posts request failed", error);
      setPosts([]);
    } finally {
      if (!isStale()) setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedPageId) {
      setInsights(null);
      setPosts([]);
      return;
    }
    void loadInsights(selectedPageId, period);
  }, [selectedPageId, period, loadInsights]);

  const handleRefresh = async () => {
    if (!selectedPageId) {
      await loadPages();
      return;
    }
    setRefreshing(true);
    try {
      await loadInsights(selectedPageId, period);
    } finally {
      setRefreshing(false);
    }
  };

  const selectedPage = useMemo(
    () => pages.find((page) => page.pageId === selectedPageId) || null,
    [pages, selectedPageId],
  );

  const pageName = insights?.page?.name || selectedPage?.pageName || selectedPageId || "—";

  const kpiItems: KpiItem[] = useMemo(() => {
    const totals = insights?.totals ?? {};
    const titles = new Map((insights?.metrics ?? []).map((m) => [m.name, m.title]));

    return KPI_DEFS.map((def) => ({
      key: def.name,
      label: titles.get(def.name) || def.label,
      value: insights ? totals[def.name] ?? null : null,
      hint:
        def.name === "page_fans"
          ? "آخر قيمة في الفترة"
          : insights
            ? "إجمالي الفترة"
            : undefined,
      tone: def.name === "page_impressions" ? ("accent" as const) : ("default" as const),
    }));
  }, [insights]);

  const chartMetric = useMemo(() => {
    const metrics = insights?.metrics ?? [];
    if (!metrics.length) return null;
    return (
      metrics.find((m) => m.name === "page_impressions" && m.values.length) ||
      metrics.find((m) => m.values.length) ||
      metrics[0]
    );
  }, [insights]);

  const chartPoints: ChartPoint[] = useMemo(
    () =>
      (chartMetric?.values ?? []).map((entry) => ({
        label: entry.endTime || "",
        value: entry.value,
      })),
    [chartMetric],
  );

  const rangeLabel = insights
    ? `${formatShortDate(insights.range.since)} — ${formatShortDate(insights.range.until)}`
    : "—";

  return (
    <div className="space-y-4 p-4 md:p-6" dir="rtl">
      <div className="flex flex-col gap-3 border-b border-border/70 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <BarChart3 className="h-5 w-5 shrink-0 text-primary" />
          <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
            إحصائيات الصفحة (Page Insights)
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedPageId}
            onValueChange={(value) => setSelectedPageId(value ? String(value) : "")}
            disabled={pagesLoading || pages.length === 0}
          >
            <SelectTrigger className="h-9 w-[240px] text-xs" size="sm">
              <SelectValue placeholder="اختر الصفحة بالاسم" />
            </SelectTrigger>
            <SelectContent>
              {pages.map((page) => (
                <SelectItem key={page.pageId} value={page.pageId}>
                  {page.pageName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={(value) => setPeriod(value ? String(value) : "day")}>
            <SelectTrigger className="h-9 w-[130px] text-xs" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 text-xs"
            onClick={handleRefresh}
            disabled={refreshing || pagesLoading || !selectedPageId}
            data-testid="insights-refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {pagesLoading ? (
        <div className="h-16 animate-pulse rounded-lg border border-border/70 bg-muted/40" />
      ) : pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-card px-4 py-14 text-center">
          <Facebook className="h-8 w-8 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            لا توجد صفحة Facebook متصلة بهذه الشركة
          </h2>
          <p className="max-w-md text-xs text-muted-foreground">
            اربط صفحة Facebook واحدة على الأقل من إعدادات فيسبوك ليظهر اسمها هنا ويمكن
            جلب إحصائياتها عبر صلاحية read_insights.
          </p>
        </div>
      ) : (
        <>
          {/* اسم الصفحة المحددة — مطلوب لعرض الأصل في مراجعة Meta */}
          <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              {insights?.page?.picture ? (
                <img
                  src={insights.page.picture}
                  alt={pageName}
                  className="h-8 w-8 shrink-0 rounded-full border border-border/60 object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted">
                  <Facebook className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  الصفحة المحددة
                </div>
                <h2
                  className="truncate text-base font-semibold text-foreground"
                  data-testid="insights-page-name"
                >
                  {pageName}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span>الفترة: <span className="tabular-nums text-foreground">{rangeLabel}</span></span>
              <span>المتابعون: <span className="tabular-nums text-foreground">{insights?.page?.followersCount ?? selectedPage?.followersCount ?? "—"}</span></span>
              <span>المعجبون: <span className="tabular-nums text-foreground">{insights?.page?.fanCount ?? selectedPage?.fanCount ?? "—"}</span></span>
            </div>
          </div>

          <InsightsKpiRow items={kpiItems} loading={insightsLoading} />

          {insightsError ? (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-destructive">تعذر جلب الإحصائيات من Meta</div>
                <div className="mt-0.5 break-words text-[11px] text-destructive/90">{insightsError}</div>
              </div>
              <Button type="button" size="sm" variant="ghost" className="h-7 shrink-0 text-[11px]" onClick={handleRefresh}>
                إعادة المحاولة
              </Button>
            </div>
          ) : (
            <InsightsTrendChart
              title={chartMetric ? `تطور ${chartMetric.title}` : "تطور مرات الظهور"}
              points={chartPoints}
              period={period}
              loading={insightsLoading}
            />
          )}

          <PostInsightsTable posts={posts} loading={postsLoading} />

          <p className="text-[10px] text-muted-foreground">
            البيانات من Meta Graph API عبر صلاحية read_insights — الصفحة: {selectedPageId}
          </p>
        </>
      )}
    </div>
  );
}
