import React from "react";
import {
  BarChart3,
  Clock3,
  Package,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { InsightCard } from "../controls/SettingFields";
import {
  InstalledCompanyApp,
  AppUsageResponseData,
  AppUsageByFeatureEntry,
  formatMoney,
} from "../../types/appSettingsTypes";

interface AppSettingsTelemetryCardsProps {
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
  navigate: (path: string) => void;
}

export const AppSettingsTelemetryCards: React.FC<AppSettingsTelemetryCardsProps> = ({
  companyApp,
  usageInsights,
  topFeature,
  insightsLoading,
  billingSummary,
  billingSummaryLoading,
  navigate,
}) => {
  const summary = usageInsights?.summary || {
    totalActions: 0,
    totalCost: Number(companyApp?.monthlyUsage?.totalCost || 0),
    totalQuantity: Number(companyApp?.monthlyUsage?.totalQuantity || 0),
  };

  return (
    <>
      {insightsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`insight-skeleton-${index}`}
              className="h-36 animate-pulse rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-5 h-8 w-20 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-4 h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InsightCard
            label="إجمالي الاستخدام"
            value={`${summary.totalActions || 0}`}
            hint="عدد العمليات المسجلة داخل هذا التطبيق خلال الفترة الحالية."
            icon={<BarChart3 size={18} />}
          />
          <InsightCard
            label="الكمية المحسوبة"
            value={`${summary.totalQuantity || 0}`}
            hint="إجمالي الكميات أو الأحداث التي تم احتسابها من features التطبيق."
            icon={<Clock3 size={18} />}
          />
          <InsightCard
            label="التكلفة الشهرية"
            value={formatMoney(summary.totalCost)}
            hint="إجمالي التكلفة المسجلة في usage logs لهذا التطبيق."
            icon={<Package size={18} />}
          />
          <InsightCard
            label="أكثر Feature نشاطًا"
            value={String(topFeature?.feature || "No activity")}
            hint={
              topFeature
                ? `${Number(topFeature?._count?.id || 0)} actions tracked for this feature.`
                : "لا توجد usage logs مسجلة حتى الآن."
            }
            icon={<Sparkles size={18} />}
          />
        </div>
      )}

      {companyApp?.app?.pricingModel === "PAY_PER_USE" && !billingSummaryLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Package size={18} />
            <span className="font-semibold">المحاسبة المالية — دفع حسب الاستخدام</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/50">
              <div className="text-sm text-gray-500 dark:text-gray-400">رصيد المحفظة</div>
              <div className="mt-1 text-2xl font-bold tabular-nums font-mono text-gray-900 dark:text-white">
                {formatMoney(billingSummary?.wallet?.balance ?? 0)}
                <span className="ml-1 text-sm font-normal text-gray-500">
                  {billingSummary?.wallet?.currency || "EGP"}
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/50">
              <div className="text-sm text-gray-500 dark:text-gray-400">استخدام الشهر الحالي</div>
              <div className="mt-1 text-2xl font-bold tabular-nums font-mono text-gray-900 dark:text-white">
                {formatMoney(billingSummary?.costs?.usage ?? 0)}
              </div>
            </div>
            <div
              className={`rounded-xl p-4 ${
                Number(billingSummary?.heldOrders?.count || 0) > 0
                  ? "bg-amber-50 dark:bg-amber-900/20"
                  : "bg-gray-50 dark:bg-gray-900/50"
              }`}
            >
              <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                {Number(billingSummary?.heldOrders?.count || 0) > 0 && (
                  <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
                )}
                الطلبات المعلّقة بانتظار الشحن
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums font-mono text-gray-900 dark:text-white">
                {billingSummary?.heldOrders?.count ?? 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {Number(billingSummary?.heldOrders?.amount || 0) > 0
                  ? `مستحق: ${formatMoney(billingSummary?.heldOrders?.amount ?? 0)}`
                  : "لا توجد طلبات معلّقة"}
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <button
                onClick={() => navigate("/payments")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                شحن الرصيد
                <ExternalLink size={16} />
              </button>
              {Number(billingSummary?.heldOrders?.count || 0) > 0 ? (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  عند شحن الرصيد يُخصم المبلغ المستحق وتظهر الطلبات تلقائياً.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
