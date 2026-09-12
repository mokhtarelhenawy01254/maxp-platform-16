import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircleIcon,
  ArrowUturnLeftIcon,
  XCircleIcon,
  TruckIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { useCurrency } from "../../../hooks/useCurrency";
import { getOrderStatusDisplay } from "../../../utils/statusRegistry";

export interface ConvertedOrdersDestiny {
  totalConverted: number;
  delivered: { count: number; value: number; rate: number };
  returned: { count: number; value: number; rate: number };
  cancelled: { count: number; value: number; rate: number };
  inProgress: { count: number; value: number; rate: number };
  deliveryRate: number;
  effectiveDeliveryRate: number;
  statusBreakdown: Array<{
    status: string;
    count: number;
    value: number;
    rate: number;
  }>;
}

interface Props {
  destiny?: ConvertedOrdersDestiny;
}

export const ConvertedOrdersDestinyCard: React.FC<Props> = ({ destiny }) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [showDetails, setShowDetails] = useState(false);

  if (!destiny || destiny.totalConverted === 0) {
    return null;
  }

  const {
    totalConverted,
    delivered,
    returned,
    cancelled,
    inProgress,
    deliveryRate,
    effectiveDeliveryRate,
    statusBreakdown,
  } = destiny;

  // تقييم الجودة بناءً على نسبة نجاح التسليم
  const getQualityBadge = (rate: number) => {
    if (rate >= 75) {
      return {
        label: t("incompleteQualityExcellent", "جودة ممتازة"),
        color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      };
    }
    if (rate >= 50) {
      return {
        label: t("incompleteQualityGood", "جودة جيدة"),
        color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      };
    }
    return {
      label: t("incompleteQualityNeedsAttention", "تحتاج متابعة"),
      color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    };
  };

  const qualityBadge = getQualityBadge(effectiveDeliveryRate || deliveryRate);

  const statCards = [
    {
      title: t("incompleteDestinyDelivered", "تم التسليم"),
      count: delivered.count,
      value: delivered.value,
      rate: delivered.rate,
      icon: CheckCircleIcon,
      accentColor: "text-emerald-600 dark:text-emerald-400",
      bgBadge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
      progressBg: "bg-emerald-500",
      border: "border-emerald-100 dark:border-emerald-900/30",
    },
    {
      title: t("incompleteDestinyInProgress", "قيد الشحن والتنفيذ"),
      count: inProgress.count,
      value: inProgress.value,
      rate: inProgress.rate,
      icon: TruckIcon,
      accentColor: "text-blue-600 dark:text-blue-400",
      bgBadge: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      progressBg: "bg-blue-500",
      border: "border-blue-100 dark:border-blue-900/30",
    },
    {
      title: t("incompleteDestinyReturned", "مرتجع"),
      count: returned.count,
      value: returned.value,
      rate: returned.rate,
      icon: ArrowUturnLeftIcon,
      accentColor: "text-amber-600 dark:text-amber-400",
      bgBadge: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      progressBg: "bg-amber-500",
      border: "border-amber-100 dark:border-amber-900/30",
    },
    {
      title: t("incompleteDestinyCancelled", "ملغي"),
      count: cancelled.count,
      value: cancelled.value,
      rate: cancelled.rate,
      icon: XCircleIcon,
      accentColor: "text-rose-600 dark:text-rose-400",
      bgBadge: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
      progressBg: "bg-rose-500",
      border: "border-rose-100 dark:border-rose-900/30",
    },
  ];

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 space-y-5">
      {/* Header with Title & Quality Rating */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {t("incompleteDestinyTitle", "مصير الطلبات المحولة وجودتها")}
            </h2>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${qualityBadge.color}`}>
              {qualityBadge.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t(
              "incompleteDestinySubtitle",
              "تتبع الحالات الفعلية للطلبات بعد تحويلها وقياس معدلات التسليم والمرتجع",
            )}{" "}
            ({totalConverted.toLocaleString()} {t("orders.incompleteRecovered", "طلبات متحولة")})
          </p>
        </div>

        {/* Success Rate Highlights */}
        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/40 px-3.5 py-2 rounded-lg border border-gray-100 dark:border-gray-700">
          <div className="text-start">
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              {t("incompleteDeliverySuccessRate", "معدل نجاح التسليم")}
            </div>
            <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {deliveryRate.toFixed(1)}%
            </div>
          </div>
          {effectiveDeliveryRate > 0 && effectiveDeliveryRate !== deliveryRate && (
            <div className="text-start border-s border-gray-200 dark:border-gray-600 ps-4">
              <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {t("incompleteEffectiveDeliveryRate", "نسبة التسليم من الطلبات المنتهية")}
              </div>
              <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                {effectiveDeliveryRate.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Multi-Segment Stacked Visual Distribution Bar */}
      <div className="space-y-1.5">
        <div
          className="flex h-3.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"
          dir="ltr"
          role="progressbar"
          aria-label="Order Status Distribution"
        >
          {delivered.count > 0 && (
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${delivered.rate}%` }}
              title={`${t("incompleteDestinyDelivered", "تم التسليم")}: ${delivered.count} (${delivered.rate.toFixed(1)}%)`}
            />
          )}
          {inProgress.count > 0 && (
            <div
              className="bg-blue-500 h-full transition-all"
              style={{ width: `${inProgress.rate}%` }}
              title={`${t("incompleteDestinyInProgress", "قيد الشحن والتنفيذ")}: ${inProgress.count} (${inProgress.rate.toFixed(1)}%)`}
            />
          )}
          {returned.count > 0 && (
            <div
              className="bg-amber-500 h-full transition-all"
              style={{ width: `${returned.rate}%` }}
              title={`${t("incompleteDestinyReturned", "مرتجع")}: ${returned.count} (${returned.rate.toFixed(1)}%)`}
            />
          )}
          {cancelled.count > 0 && (
            <div
              className="bg-rose-500 h-full transition-all"
              style={{ width: `${cancelled.rate}%` }}
              title={`${t("incompleteDestinyCancelled", "ملغي")}: ${cancelled.count} (${cancelled.rate.toFixed(1)}%)`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 flex-wrap gap-2 pt-0.5">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            {t("incompleteDestinyDelivered", "تم التسليم")}: {delivered.count} ({delivered.rate.toFixed(0)}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
            {t("incompleteDestinyInProgress", "قيد الشحن")}: {inProgress.count} ({inProgress.rate.toFixed(0)}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            {t("incompleteDestinyReturned", "مرتجع")}: {returned.count} ({returned.rate.toFixed(0)}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
            {t("incompleteDestinyCancelled", "ملغي")}: {cancelled.count} ({cancelled.rate.toFixed(0)}%)
          </span>
        </div>
      </div>

      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {statCards.map((card, idx) => (
          <div
            key={idx}
            className={`rounded-xl p-3.5 border bg-white dark:bg-gray-800/80 shadow-xs ${card.border}`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
                {card.title}
              </span>
              <div className={`p-1.5 rounded-lg ${card.bgBadge}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {card.count.toLocaleString()}
              </span>
              <span className={`text-xs font-semibold ${card.accentColor}`}>
                {card.rate.toFixed(1)}%
              </span>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
              {formatPrice(card.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Toggle Details for Granular Statuses */}
      {statusBreakdown && statusBreakdown.length > 0 && (
        <div className="pt-1 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="w-full flex items-center justify-between text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white py-1.5 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <SparklesIcon className="h-3.5 w-3.5 text-blue-500" />
              {t("incompleteStatusBreakdown", "تفصيل الحالات الفعلية")} ({statusBreakdown.length})
            </span>
            {showDetails ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </button>

          {showDetails && (
            <div className="mt-2.5 overflow-hidden rounded-lg border border-gray-100 dark:border-gray-700">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="bg-gray-50/75 dark:bg-gray-700/40 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="px-3 py-2 text-start font-semibold">الحالة</th>
                    <th className="px-3 py-2 text-start font-semibold">العدد</th>
                    <th className="px-3 py-2 text-start font-semibold">النسبة</th>
                    <th className="px-3 py-2 text-end font-semibold">القيمة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {statusBreakdown.map((row) => {
                    const statusInfo = getOrderStatusDisplay({ status: row.status });
                    return (
                      <tr key={row.status} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${statusInfo.primary.colorClass}`}
                          >
                            {statusInfo.primary.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                          {row.count.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                          {row.rate.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 text-end font-medium text-gray-800 dark:text-gray-200">
                          {formatPrice(row.value)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default ConvertedOrdersDestinyCard;
