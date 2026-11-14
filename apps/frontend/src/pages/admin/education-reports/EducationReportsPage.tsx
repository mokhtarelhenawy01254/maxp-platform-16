import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Target,
  GitCommit,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  Users,
  ExternalLink,
} from "lucide-react";
import { fetchAttributionAnalytics, fetchFunnelMetrics } from "./api";
import { EducationCampaignsTab } from "./EducationCampaignsTab";
import { EducationFunnelTab } from "./EducationFunnelTab";
import {
  EducationAttributionData,
  EducationFunnelData,
  ReportPeriod,
  ReportTab,
} from "./types";

export default function EducationReportsPage() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<ReportTab>(
    tabParam === "funnel" ? "funnel" : "campaigns"
  );
  const [period, setPeriod] = useState<ReportPeriod>("all");

  const [attribution, setAttribution] = useState<EducationAttributionData | null>(null);
  const [funnel, setFunnel] = useState<EducationFunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (isInitial = false) => {
      if (isInitial) setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const [attrData, funnelData] = await Promise.all([
          fetchAttributionAnalytics(period),
          fetchFunnelMetrics(period),
        ]);
        setAttribution(attrData);
        setFunnel(funnelData);
      } catch (err: any) {
        setError(err.message || (isEn ? "Failed to load reports" : "فشل تحميل بيانات التقارير"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period, isEn]
  );

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const handleTabChange = (tab: ReportTab) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tab);
    setSearchParams(newParams, { replace: true });
  };

  const periodLabels: Record<ReportPeriod, string> = {
    all: isEn ? "All" : "الكل (تراكمي)",
    "30d": isEn ? "30 Days" : "آخر 30 يوم",
    "7d": isEn ? "7 Days" : "آخر 7 أيام",
    today: isEn ? "Today" : "اليوم",
  };

  return (
    <div
      className="w-full h-full min-h-0 flex-1 overflow-y-auto overflow-x-hidden font-sans"
      dir={isEn ? "ltr" : "rtl"}
    >
      <div className="w-full max-w-[1600px] mx-auto p-3.5 sm:p-5 lg:p-6 pb-28 sm:pb-20 space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <BarChart3 className="w-3.5 h-3.5" />
                {isEn ? "Academy Reports & Analytics" : "تقارير الأكاديمية وتحليل الحملات"}
              </span>
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                {isEn ? "Unified Attribution & Funnel Pipeline" : "محرك التتبع وقمع التحويل المتناغم"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {isEn ? "Education Reports & Attribution" : "تقارير الأكاديمية ومصادر الحملات"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isEn
                ? "Unified performance telemetry connecting Meta Ads, Click-to-WhatsApp, Demo Day attendance, and package conversions"
                : "لوحة موحدة لربط إعلانات ميتا ورسائل الواتساب بحضور اليوم التجريبي والاشتراكات في الباقات والحصص"}
            </p>
          </div>

          {/* Period selector & Refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center rounded-lg border border-border/80 bg-muted/40 p-1 text-xs">
              {(["all", "30d", "7d", "today"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    period === p
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>

            <button
              onClick={() => loadData(false)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-background text-foreground text-xs font-medium hover:bg-muted/50 transition-colors disabled:opacity-50 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>{isEn ? "Refresh" : "تحديث"}</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs Bar */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/60 border border-border/80 w-fit flex-wrap">
          <button
            type="button"
            onClick={() => handleTabChange("campaigns")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "campaigns"
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>{isEn ? "Campaign Attribution" : "تتبع مصادر الحملات والإعلانات"}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-bold">
              {attribution?.summary?.totalLeads ?? 0} {isEn ? "leads" : "ليد"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("funnel")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "funnel"
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GitCommit className="w-4 h-4 text-primary" />
            <span>{isEn ? "Conversion Funnel" : "مسار التحويل وقمع الأكاديمية"}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-mono font-bold">
              {funnel?.registeredStudents ?? 0} {isEn ? "students" : "طالب"}
            </span>
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadData(false)}
              className="px-2.5 py-1 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors shrink-0"
            >
              {isEn ? "Retry" : "إعادة المحاولة"}
            </button>
          </div>
        )}

        {/* Tab 1: Campaigns Attribution */}
        {activeTab === "campaigns" && (
          <EducationCampaignsTab
            attribution={attribution}
            loading={loading}
            isEn={isEn}
          />
        )}

        {/* Tab 2: Funnel Pipeline */}
        {activeTab === "funnel" && (
          <EducationFunnelTab
            funnel={funnel}
            loading={loading}
            isEn={isEn}
          />
        )}

        {/* Cross-linking Shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <a
            href="/admin/education/demo-day"
            className="p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors flex items-center justify-between text-xs group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-foreground">
                  {isEn ? "Demo Day Attendees Bench" : "جدول وقائمة حضور الديمو داي"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {isEn ? "View attendees and convert leads directly" : "متابعة الحاضرين وتحويلهم لطلاب مقيدين"}
                </div>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>

          <a
            href="/admin/education/funnel"
            className="p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors flex items-center justify-between text-xs group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-foreground">
                  {isEn ? "WhatsApp Notification Templates" : "مركز قوالب رسائل الواتساب"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {isEn ? "Configure triggers and approved Meta Cloud templates" : "تخصيص رسائل الطلاب والمعلمين والتذكيرات"}
                </div>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>
        </div>
      </div>
    </div>
  );
}
