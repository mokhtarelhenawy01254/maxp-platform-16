import React, { useDeferredValue, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, XCircle, Search } from "lucide-react";
import analyticsService from "../../../services/analyticsService";
import PeriodSelector, { PeriodRange } from "../../../components/common/PeriodSelector";
import { CampaignAttributionAnalyticsData } from "./campaignAttributionTypes";
import CampaignAttributionStats from "./CampaignAttributionStats";
import CampaignAttributionCharts, { SectionCard } from "./CampaignAttributionCharts";
import CampaignAttributionTable from "./CampaignAttributionTable";

const trackingTypeLabels: Record<string, string> = {
  campaign: "حملة",
  direct: "مباشر",
  tracked: "متتبع",
  unattributed: "غير منسوب",
};

const CampaignAttributionAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appAccessState, setAppAccessState] = useState<{
    needsActivation: boolean;
    message?: string;
    appSlug?: string;
    appName?: string;
  } | null>(null);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [channel, setChannel] = useState("all");
  const [source, setSource] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [trackingType, setTrackingType] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput.trim());
  const [data, setData] = useState<CampaignAttributionAnalyticsData | null>(null);

  useEffect(() => {
    if (!range) return;
    const controller = new AbortController();

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        setAppAccessState(null);

        const response = await analyticsService.getCampaignAttributionAnalytics({
          period: range?.period,
          startDate: range?.startDate,
          endDate: range?.endDate,
          source,
          platform,
          trackingType,
          channel,
          search: deferredSearch || undefined,
          signal: controller.signal,
        });

        const result = response as
          | { success?: boolean; data?: CampaignAttributionAnalyticsData; message?: string }
          | null
          | undefined;

        if (!result?.success || !result.data) {
          throw new Error(result?.message || "تعذر تحميل تحليل الحملات");
        }
        setData(result.data);
      } catch (err: any) {
        if (err?.name === "AbortError" || err?.name === "CanceledError") return;
        if (err?.response?.status === 403 || err?.response?.data?.needsActivation) {
          setAppAccessState({
            needsActivation: true,
            message:
              err?.response?.data?.message ||
              "هذه الميزة تتطلب تفعيل تطبيق: Campaign Attribution",
            appSlug: err?.response?.data?.app?.slug || "campaign-attribution",
            appName: err?.response?.data?.app?.name || "Campaign Attribution",
          });
          return;
        }
        setError(err?.response?.data?.message || err?.message || "حدث خطأ أثناء تحميل تحليل الحملات");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchAnalytics();
    return () => controller.abort();
  }, [deferredSearch, range, platform, source, trackingType, channel]);

  const rows = data?.rows || [];

  const header = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          تحليل الحملات ومصدر الطلبات
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          ربط الطلبات بالمصدر والمنصة ورقم الحملة من بيانات التتبع المنسوبة للطلب
        </p>
      </div>
      <PeriodSelector onRangeChange={setRange} />
    </div>
  );

  if (loading && !data && !appAccessState?.needsActivation) {
    return (
      <div className="space-y-4" dir="rtl">
        {header}
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            <p className="text-xs text-muted-foreground">جارٍ تحليل الحملات ومصادر الطلبات…</p>
          </div>
        </div>
      </div>
    );
  }

  if (appAccessState?.needsActivation && !data) {
    return (
      <div className="space-y-4" dir="rtl">
        {header}
        <div className="flex min-h-[50vh] items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border border-border/70 bg-card p-6 text-center shadow-none">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
              <Lock className="h-6 w-6" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-2">
              تطبيق إضافي مطلوب
            </div>
            <h2 className="text-base font-semibold text-foreground">
              {appAccessState.appName || "Campaign Attribution"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {appAccessState.message ||
                "هذه الميزة تتطلب تفعيل تطبيق Campaign Attribution لربط وتحليل نتائج الحملات ومصادر الطلبات."}
            </p>
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2">
              <Link
                to={`/marketplace/apps/${appAccessState.appSlug || "campaign-attribution"}`}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                تفعيل التطبيق من المتجر
              </Link>
              <Link
                to="/company-dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-border/70 bg-muted/30 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                العودة للوحة التحكم
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4" dir="rtl">
        {header}
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="w-full max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
            <XCircle className="mx-auto h-8 w-8 text-destructive" />
            <p className="mt-3 text-xs font-semibold text-destructive">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {header}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-card p-2 shadow-none">
        <select
          value={channel}
          onChange={(event) => setChannel(event.target.value)}
          className="rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="القناة"
        >
          <option value="all">كل القنوات (متجر + إنبوكس)</option>
          <option value="storefront">المتجر الإلكتروني فقط</option>
          <option value="inbox">رسائل الإنبوكس فقط</option>
        </select>

        <select
          value={source}
          onChange={(event) => setSource(event.target.value)}
          className="rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="المصدر"
        >
          <option value="all">كل المصادر</option>
          {data?.availableFilters.sources.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={platform}
          onChange={(event) => setPlatform(event.target.value)}
          className="rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="المنصة"
        >
          <option value="all">كل المنصات</option>
          {data?.availableFilters.platforms.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={trackingType}
          onChange={(event) => setTrackingType(event.target.value)}
          className="rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="نوع التتبع"
        >
          <option value="all">كل أنواع التتبع</option>
          {data?.availableFilters.trackingTypes.map((item) => (
            <option key={item} value={item}>
              {trackingTypeLabels[item] || item}
            </option>
          ))}
        </select>

        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="بحث بالحملة أو المعرفات..."
            className="w-full rounded-md border border-border/70 bg-background pr-8 pl-2.5 py-1.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <span className="mr-auto font-mono text-[11px] text-muted-foreground tabular-nums">
          {rows.length.toLocaleString()} صف
        </span>
      </div>

      {/* Merged stats bar */}
      {data && <CampaignAttributionStats data={data} />}

      {/* Footnote */}
      <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        يجمع هذا التقرير طلبات المتجر الإلكتروني (روابط UTM) وطلبات رسائل وإنبوكس فيسبوك الناتجة عن إعلانات الرسائل (Click-to-Messenger)، مع إمكانية الفلترة السريعة بالقناة والمصدر بالأعلى.
      </div>

      {/* Charts + side panel */}
      {data && (
        <CampaignAttributionCharts
          trend={data.trend || []}
          sourceBreakdown={data.sourceBreakdown || []}
          platformBreakdown={data.platformBreakdown || []}
        />
      )}

      {/* Table full width */}
      <SectionCard
        title="جدول الحملات والمصادر"
        subtitle="كل صف تجميع حسب المصدر والمنصة والحملة ومعرفات الإعلان"
        collapsible
      >
        <CampaignAttributionTable rows={rows} />
      </SectionCard>

      {error && data && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
          آخر محاولة تحديث أعادت خطأ: {error}
        </div>
      )}
    </div>
  );
};

export default CampaignAttributionAnalytics;
