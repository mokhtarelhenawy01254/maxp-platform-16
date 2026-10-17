import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Globe2, ArrowLeft, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFacebookAdsAccountContext } from "../../hooks/useFacebookAdsAccountContext";
import FacebookAdsModuleNav from "../../components/advertising/FacebookAdsModuleNav";
import {
  facebookAdsService,
  type FacebookGeoPerformanceBreakdown,
  type FacebookGeoPerformanceReport,
} from "../../services/facebookAdsService";
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
} from "../../utils/facebookAdsHelpers";

const FacebookAdsGeoPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isEn = Boolean(
    i18n.language?.startsWith("en") ||
      (typeof window !== "undefined" &&
        localStorage.getItem("language") === "en" &&
        document.documentElement.lang !== "ar")
  );

  const accountContext = useFacebookAdsAccountContext();
  const { selectedAdAccountId, selectedAdAccount } = accountContext;
  const selectedCurrency = selectedAdAccount?.currency || "EGP";

  const [geoBreakdown, setGeoBreakdown] =
    useState<FacebookGeoPerformanceBreakdown>("region");
  const [geoPerformance, setGeoPerformance] =
    useState<FacebookGeoPerformanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGeoData = async () => {
    if (!selectedAdAccountId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await facebookAdsService.getGeoPerformanceBreakdown(
        selectedAdAccountId,
        { breakdown: geoBreakdown }
      );
      setGeoPerformance(res);
    } catch (err: unknown) {
      console.error("Failed to load geo report:", err);
      setError(
        isEn
          ? "Failed to load geographic performance data from Meta."
          : "فشل تحميل بيانات الأداء الجغرافي من Meta."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGeoData();
  }, [selectedAdAccountId, geoBreakdown]);

  const rows = geoPerformance?.breakdowns || [];

  return (
    <div className="w-full space-y-3.5" dir={isEn ? "ltr" : "rtl"}>
      <FacebookAdsModuleNav selectedAdAccountId={selectedAdAccountId} />

      {/* Linear Single Chassis Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-center text-foreground shrink-0 shadow-xs">
            <Globe2 className="size-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                {isEn ? "Geographic Performance & Governorates" : "الأداء الجغرافي وتوزيع المحافظات"}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] font-mono tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-blue-500" />
                {rows.length} {isEn ? "regions" : "منطقة"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isEn
                ? "Analyze sales, spend, CPA, and ROAS across Egyptian governorates and international regions."
                : "تحليل المبيعات، والإنفاق، وتكلفة الاكتساب CPA، والعائد الإعلاني ROAS عبر المحافظات."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Breakdown selector */}
          <div className="flex rounded-lg bg-muted/40 p-0.5 text-xs font-mono border border-border/60">
            <button
              type="button"
              onClick={() => setGeoBreakdown("region")}
              className={`rounded-md px-2.5 py-1 transition-all cursor-pointer text-xs active:scale-[0.98] ${
                geoBreakdown === "region"
                  ? "bg-card text-foreground font-semibold shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isEn ? "Governorates" : "المحافظات"}
            </button>
            <button
              type="button"
              onClick={() => setGeoBreakdown("country")}
              className={`rounded-md px-2.5 py-1 transition-all cursor-pointer text-xs active:scale-[0.98] ${
                geoBreakdown === "country"
                  ? "bg-card text-foreground font-semibold shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isEn ? "Countries" : "الدول"}
            </button>
          </div>

          <button
            type="button"
            onClick={loadGeoData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-background text-xs font-mono text-foreground hover:bg-muted/50 transition-colors shadow-xs active:scale-[0.98]"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{isEn ? "Refresh" : "تحديث"}</span>
          </button>
        </div>
      </div>

      {/* Account indicator Ribbon */}
      {selectedAdAccount && (
        <div className="flex items-center justify-between rounded-xl bg-card border border-border/70 px-3.5 py-2 text-xs font-mono shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{isEn ? "Active Account:" : "الحساب الإعلاني النشط:"}</span>
            <span className="font-bold text-foreground">{selectedAdAccount.name || selectedAdAccountId}</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            {selectedCurrency}
          </span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="size-5 animate-spin text-primary" />
            <span className="text-xs font-mono text-muted-foreground">
              {isEn ? "Loading geo breakdown from Meta..." : "جاري تحميل بيانات المحافظات من Meta..."}
            </span>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-mono">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 p-10 text-center">
          <Globe2 className="size-8 text-muted-foreground mb-2" />
          <h3 className="text-xs sm:text-sm font-bold text-foreground">
            {isEn ? "No Geographic Breakdown Available Yet" : "لا توجد بيانات جغرافية كافية بعد"}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {isEn
              ? "Meta requires active campaigns delivering impressions to compile geographical analytics."
              : "تتطلب Meta وجود حملات نشطة تستهلك ميزانية لتوفير التحليلات الجغرافية."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <div
              key={row.key}
              className="rounded-xl border border-border/70 bg-card p-3.5 shadow-xs transition hover:border-border space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    {row.label}
                  </h3>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    {row.campaignsCount || row.campaigns.length} {isEn ? "campaigns" : "حملة"}
                  </p>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono tabular-nums font-bold bg-muted/60 text-foreground border border-border/70">
                  {formatCurrency(row.metrics.spend, selectedCurrency)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-muted/20 border border-border/50">
                  <span className="text-[10px] font-mono text-muted-foreground block">
                    {isEn ? "Purchases:" : "المشتريات:"}
                  </span>
                  <p className="font-bold font-mono tabular-nums text-foreground mt-0.5">
                    {formatNumber(row.metrics.purchases)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-muted/20 border border-border/50">
                  <span className="text-[10px] font-mono text-muted-foreground block">
                    CPA:
                  </span>
                  <p className="font-bold font-mono tabular-nums text-foreground mt-0.5">
                    {row.metrics.purchases > 0
                      ? formatCurrency(row.metrics.cpa, selectedCurrency)
                      : "—"}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-muted/20 border border-border/50">
                  <span className="text-[10px] font-mono text-muted-foreground block">
                    ROAS:
                  </span>
                  <p className="font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatNumber(row.metrics.roas, 2)}x
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-muted/20 border border-border/50">
                  <span className="text-[10px] font-mono text-muted-foreground block">
                    CTR:
                  </span>
                  <p className="font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">
                    {formatPercentage(row.metrics.ctr)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FacebookAdsGeoPage;
