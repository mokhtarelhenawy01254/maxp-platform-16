import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Globe2, ArrowLeft, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFacebookAdsAccountContext } from "../../hooks/useFacebookAdsAccountContext";
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
  const isEn =
    i18n.language === "en" ||
    (typeof window !== "undefined" &&
      (localStorage.getItem("language") === "en" ||
        localStorage.getItem("i18nextLng")?.startsWith("en")));

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
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6" dir={isEn ? "ltr" : "rtl"}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Link
              to="/advertising/facebook-ads"
              className="hover:text-blue-600 transition flex items-center gap-1"
            >
              <ArrowLeft className={`h-3.5 w-3.5 ${isEn ? "" : "rotate-180"}`} />
              {isEn ? "Facebook Ads Cockpit" : "لوحة إعلانات فيسبوك"}
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-black">
              {isEn ? "Geographic Performance" : "الأداء الجغرافي والمحافظات"}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Globe2 className="h-6 w-6 text-blue-600" />
            {isEn ? "Geographic Performance & Governorates" : "الأداء الجغرافي وتوزيع المحافظات"}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {isEn
              ? "Analyze sales, spend, CPA, and ROAS across Egyptian governorates and international regions."
              : "تحليل المبيعات، والإنفاق، وتكلفة الاكتساب CPA، والعائد الإعلاني ROAS عبر المحافظات المصرية والدول."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Breakdown selector */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-black dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setGeoBreakdown("region")}
              className={`rounded-lg px-3 py-1.5 transition ${
                geoBreakdown === "region"
                  ? "bg-white text-slate-950 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              {isEn ? "Governorates / Regions" : "المحافظات / المناطق"}
            </button>
            <button
              type="button"
              onClick={() => setGeoBreakdown("country")}
              className={`rounded-lg px-3 py-1.5 transition ${
                geoBreakdown === "country"
                  ? "bg-white text-slate-950 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              {isEn ? "Countries" : "الدول"}
            </button>
          </div>

          <button
            type="button"
            onClick={loadGeoData}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{isEn ? "Refresh" : "تحديث"}</span>
          </button>
        </div>
      </div>

      {/* Account indicator */}
      {selectedAdAccount && (
        <div className="flex items-center gap-2 rounded-xl bg-blue-50/70 px-4 py-2.5 text-xs font-bold text-blue-800 dark:bg-blue-950/30 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/40">
          <span>{isEn ? "Active Account:" : "الحساب النشط:"}</span>
          <span className="font-black">{selectedAdAccount.name || selectedAdAccountId}</span>
          <span className="text-blue-500">({selectedCurrency})</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-xs font-bold text-slate-500">
              {isEn ? "Loading geo breakdown from Meta..." : "جاري تحميل بيانات المحافظات من Meta..."}
            </span>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Globe2 className="h-10 w-10 text-slate-400 mb-3" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            {isEn ? "No Geographic Breakdown Available Yet" : "لا توجد بيانات جغرافية كافية بعد"}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
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
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">
                    {row.label}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500">
                    {row.campaignsCount || row.campaigns.length} {isEn ? "campaigns" : "حملة"}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/50">
                  {formatCurrency(row.metrics.spend, selectedCurrency)}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500">
                    {isEn ? "Purchases:" : "المشتريات:"}
                  </span>
                  <p className="font-black text-slate-950 dark:text-white">
                    {formatNumber(row.metrics.purchases)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500">
                    CPA:
                  </span>
                  <p className="font-black text-slate-950 dark:text-white">
                    {row.metrics.purchases > 0
                      ? formatCurrency(row.metrics.cpa, selectedCurrency)
                      : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500">
                    ROAS:
                  </span>
                  <p className="font-black text-slate-950 dark:text-white">
                    {formatNumber(row.metrics.roas, 2)}x
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500">
                    CTR:
                  </span>
                  <p className="font-black text-slate-950 dark:text-white">
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
