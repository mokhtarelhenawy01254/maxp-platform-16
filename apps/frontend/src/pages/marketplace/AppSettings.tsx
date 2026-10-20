import React from "react";
import {
  AlertCircle,
  ArrowLeft,
  Package,
  Save,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useMarketplaceAppSettingsData } from "./hooks/useMarketplaceAppSettingsData";
import { AppSettingsInsights } from "./components/settings/AppSettingsInsights";
import { InternalCourierFleetSettingsTab } from "./components/settings/InternalCourierFleetSettingsTab";
import { ConversionSuiteSettingsTab } from "./components/settings/ConversionSuiteSettingsTab";
import { UpsellCenterTab } from "./components/upsell/UpsellCenterTab";
import { UgcReviewsSettingsTab } from "./components/settings/UgcReviewsSettingsTab";
import { CommerceAdvancedSettingsTab } from "./components/settings/CommerceAdvancedSettingsTab";

export default function AppSettings() {
  const {
    slug,
    navigate,
    companyApp,
    loading,
    saving,
    normalizedSettings,
    generalSettings,
    modulesSettings,
    uiSettings,
    thresholdsSettings,
    countdownSettings,
    copySettings,
    isUpsellCenter,
    activeUpsellSection,
    supported,
    pageTitle,
    pageDescription,
    backDestination,
    backLabel,
    topFeature,
    usageInsights,
    conversionJourney,
    upsellCenterMetrics,
    activeUpsellPlacements,
    cartPlacementEnabled,
    upsellFallbackSummary,
    reviewInsights,
    insightsLoading,
    billingSummary,
    billingSummaryLoading,
    treasuryAccounts,
    updateAtPath,
    applyPreset,
    handleSave,
    setUpsellSection,
  } = useMarketplaceAppSettingsData();

  const renderForm = () => {
    switch (slug) {
      case "internal-courier-fleet":
        return (
          <InternalCourierFleetSettingsTab
            normalizedSettings={normalizedSettings}
            treasuryAccounts={treasuryAccounts}
            updateAtPath={updateAtPath}
            navigate={navigate}
          />
        );
      case "conversion-suite":
        return isUpsellCenter ? (
          <UpsellCenterTab
            activeUpsellSection={activeUpsellSection}
            setUpsellSection={setUpsellSection}
            generalSettings={generalSettings}
            modulesSettings={modulesSettings}
            uiSettings={uiSettings}
            thresholdsSettings={thresholdsSettings}
            copySettings={copySettings}
            activeUpsellPlacements={activeUpsellPlacements}
            cartPlacementEnabled={cartPlacementEnabled}
            upsellFallbackSummary={upsellFallbackSummary}
            upsellCenterMetrics={upsellCenterMetrics}
            updateAtPath={updateAtPath}
            applyPreset={applyPreset}
            navigate={navigate}
          />
        ) : (
          <ConversionSuiteSettingsTab
            generalSettings={generalSettings}
            modulesSettings={modulesSettings}
            uiSettings={uiSettings}
            thresholdsSettings={thresholdsSettings}
            countdownSettings={countdownSettings}
            copySettings={copySettings}
            updateAtPath={updateAtPath}
            applyPreset={applyPreset}
          />
        );
      case "ugc-reviews-pro":
        return (
          <UgcReviewsSettingsTab
            generalSettings={generalSettings}
            modulesSettings={modulesSettings}
            uiSettings={uiSettings}
            updateAtPath={updateAtPath}
          />
        );
      case "commerce-advanced":
        return (
          <CommerceAdvancedSettingsTab
            modulesSettings={modulesSettings}
            uiSettings={uiSettings}
            copySettings={copySettings}
            updateAtPath={updateAtPath}
          />
        );
      default:
        return (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-gray-600 dark:text-gray-400">
            لا توجد شاشة إعدادات مخصصة لهذا التطبيق حتى الآن.
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!companyApp) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-yellow-500" size={40} />
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            التطبيق غير مفعّل
          </h1>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            فعّل التطبيق أولًا من Marketplace حتى تبدأ ربطه مع القوالب والثيم.
          </p>
          <button
            onClick={() => navigate(`/marketplace/${slug}`)}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            فتح صفحة التطبيق
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-7xl flex-col sm:flex-row sm:items-center justify-between gap-4 px-3 py-4 sm:px-6 sm:py-6">
          <div className="space-y-3">
            <button
              onClick={() => navigate(backDestination)}
              className="flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <ArrowLeft size={18} />
              {backLabel}
            </button>
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-2xl sm:text-3xl dark:bg-blue-900/30">
                {companyApp.app.icon ? (
                  <span>{companyApp.app.icon}</span>
                ) : (
                  <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <div className="mb-1 sm:mb-2 flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    {pageTitle}
                  </h1>
                  {supported && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      <Sparkles size={14} />
                      {slug === "internal-courier-fleet" ? "Fleet Operations" : isUpsellCenter ? "Unified" : "Template Ready"}
                    </span>
                  )}
                </div>
                <p className="max-w-3xl text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {pageDescription}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Save size={18} />
            {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl 2xl:max-w-7xl px-0 py-4 sm:px-6 sm:py-8">
        {!isUpsellCenter && slug !== "internal-courier-fleet" ? (
          <div className="mb-4 sm:mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5 dark:border-blue-900/40 dark:bg-blue-900/10">
            <div className="mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Settings2 size={18} />
              <span className="font-semibold">منطق التنفيذ الحالي</span>
            </div>
            <p className="text-xs sm:text-sm leading-6 sm:leading-7 text-blue-800 dark:text-blue-200">
              الإعدادات هنا مصممة لتخدم 3 طبقات معًا: الظهور في Marketplace، والربط مع الـ
              storefront العام، والإدراج داخل القوالب والثيمات كـ components وvariants.
            </p>
          </div>
        ) : null}

        <AppSettingsInsights
          slug={slug}
          isUpsellCenter={isUpsellCenter}
          companyApp={companyApp}
          usageInsights={usageInsights}
          topFeature={topFeature}
          insightsLoading={insightsLoading}
          billingSummary={billingSummary}
          billingSummaryLoading={billingSummaryLoading}
          conversionJourney={conversionJourney}
          reviewInsights={reviewInsights}
          navigate={navigate}
        />

        {renderForm()}

        {!isUpsellCenter ? (
          <div className="mt-6 sm:mt-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
              <Package size={18} />
              <span className="font-semibold">معاينة بنية الإعدادات</span>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-gray-950 p-3 sm:p-4 text-xs leading-6 text-green-200">
              {JSON.stringify(normalizedSettings, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
