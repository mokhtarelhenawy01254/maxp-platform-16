import React from "react";
import {
  Clock3,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { InsightCard } from "../controls/SettingFields";
import { AppSettingsTelemetryCards } from "../insights/AppSettingsTelemetryCards";
import { ConversionJourneySnapshot } from "../insights/ConversionJourneySnapshot";
import {
  InstalledCompanyApp,
  AppUsageResponseData,
  ReviewModerationInsights,
  AppUsageByFeatureEntry,
  formatMoney,
  formatDateTime,
} from "../../types/appSettingsTypes";

interface AppSettingsInsightsProps {
  slug: string;
  isUpsellCenter: boolean;
  companyApp: InstalledCompanyApp | null;
  usageInsights: AppUsageResponseData | null;
  topFeature: AppUsageByFeatureEntry | null;
  insightsLoading: boolean;
  billingSummary: {
    costs?: { subscriptions: number; usage: number; total: number };
    wallet?: { balance: number; currency: string };
    heldOrders?: { count: number; amount: number };
  } | null;
  billingSummaryLoading: boolean;
  conversionJourney: {
    checkoutViews: number;
    checkoutClicks: number;
    orderAttempts: number;
    ordersCreated: number;
    thankYouViews: number;
    couponAttempts: number;
    couponSuccesses: number;
    couponOrders: number;
    upsellViews: number;
    upsellClicks: number;
    upsellAdds: number;
    continueShopping: number;
    whatsappSupport: number;
    emailSupport: number;
    trackOrderClicks: number;
    trackOrderSuccesses: number;
    reorderClicks: number;
    reorderCompleted: number;
    postPurchaseActions: number;
  };
  reviewInsights: ReviewModerationInsights | null;
  navigate: (path: string) => void;
}

export const AppSettingsInsights: React.FC<AppSettingsInsightsProps> = ({
  slug,
  isUpsellCenter,
  companyApp,
  usageInsights,
  topFeature,
  insightsLoading,
  billingSummary,
  billingSummaryLoading,
  conversionJourney,
  reviewInsights,
  navigate,
}) => {
  if (isUpsellCenter) {
    return null;
  }

  const recentLogs = Array.isArray(usageInsights?.logs)
    ? usageInsights!.logs.slice(0, 5)
    : [];

  return (
    <div className="mb-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Insights & Maintenance
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            متابعة سريعة لاستخدام التطبيق وروابط الإدارة المرتبطة به من نفس الشاشة.
          </p>
        </div>
        {slug === "ugc-reviews-pro" ? (
          <button
            onClick={() => navigate("/products/reviews")}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          >
            <ExternalLink size={16} />
            فتح إدارة التقييمات
          </button>
        ) : null}
      </div>

      <AppSettingsTelemetryCards
        companyApp={companyApp}
        usageInsights={usageInsights}
        topFeature={topFeature}
        insightsLoading={insightsLoading}
        billingSummary={billingSummary}
        billingSummaryLoading={billingSummaryLoading}
        navigate={navigate}
      />

      {slug === "conversion-suite" && !insightsLoading ? (
        <ConversionJourneySnapshot conversionJourney={conversionJourney} />
      ) : null}

      {slug === "ugc-reviews-pro" ? (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <ShieldCheck size={18} />
              <span className="font-semibold">حالة الـ Moderation</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <InsightCard
                label="إجمالي التقييمات"
                value={`${reviewInsights?.total || 0}`}
                hint="كل التقييمات التي وصلت إلى النظام."
                icon={<MessageSquare size={18} />}
              />
              <InsightCard
                label="بانتظار المراجعة"
                value={`${reviewInsights?.pending || 0}`}
                hint="تقييمات تحتاج موافقة أو رفض من لوحة الإدارة."
                icon={<Clock3 size={18} />}
              />
              <InsightCard
                label="تمت الموافقة"
                value={`${reviewInsights?.approved || 0}`}
                hint="تقييمات أصبحت ظاهرة فعليًا على المتجر."
                icon={<ShieldCheck size={18} />}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <MessageSquare size={18} />
              <span className="font-semibold">أحدث التقييمات المعلقة</span>
            </div>
            {reviewInsights?.latestPending?.length ? (
              <div className="space-y-3">
                {reviewInsights.latestPending.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {review.customerName}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {review.products?.name || review.product?.name || "Product review"}
                        </div>
                      </div>
                      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold tabular-nums font-mono text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                        {review.rating}/5
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {review.title || "بدون عنوان"} • {formatDateTime(review.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
                لا توجد تقييمات معلقة حاليًا.
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <Clock3 size={18} />
          <span className="font-semibold">آخر النشاطات المسجلة</span>
        </div>
        {recentLogs.length > 0 ? (
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-2 rounded-xl border border-gray-200 p-4 dark:border-gray-700 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {log.feature || "General activity"}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-mono tabular-nums">
                    quantity: {Number(log.quantity || 0)} • cost: {formatMoney(log.totalCost)}
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDateTime(log.createdAt)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
            لا توجد usage logs بعد. بمجرد تسجيل أحداث فعلية للتطبيق ستظهر هنا آخر الأنشطة.
          </div>
        )}
      </div>
    </div>
  );
};
