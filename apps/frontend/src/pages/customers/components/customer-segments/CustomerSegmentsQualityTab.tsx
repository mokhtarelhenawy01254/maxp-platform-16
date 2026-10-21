import React from "react";
import {
  CustomerSegmentsStats,
  QualityAnalytics,
  QUALITY_TIER_ORDER,
  TIER_COLORS,
} from "./types";
import { QualityTierBadge } from "./CustomerSegmentsBadges";
import { useCurrency } from "../../../../hooks/useCurrency";

interface CustomerSegmentsQualityTabProps {
  stats: CustomerSegmentsStats;
  qualityData: QualityAnalytics | null;
  filterQuality: string;
}

export const CustomerSegmentsQualityTab: React.FC<CustomerSegmentsQualityTabProps> = ({
  stats,
  qualityData,
  filterQuality,
}) => {
  const { formatPrice } = useCurrency();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {QUALITY_TIER_ORDER.map((tier) => {
          const count = stats[
            tier === "VIP"
              ? "vipCount"
              : tier === "عالي"
              ? "highCount"
              : tier === "متوسط"
              ? "medCount"
              : "lowCount"
          ];
          const color = TIER_COLORS[tier];
          const percentage = ((count / Math.max(stats.total, 1)) * 100).toFixed(1);

          return (
            <div
              key={tier}
              className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-2">
                <QualityTierBadge tier={tier} />
                <span className="text-xs text-gray-400 font-mono tabular-nums">{percentage}%</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white font-mono tabular-nums">{count}</p>
              <p className="text-sm text-gray-500">عميل</p>
              <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${percentage}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">توزيع مستويات الجودة</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">العميل</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">المستوى</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">الدرجة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">الطلبات</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">إجمالي الإنفاق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {(qualityData?.customers || [])
                .filter((c) => filterQuality === "ALL" || c.tier === filterQuality)
                .sort((a, b) => b.score - a.score)
                .slice(0, 100)
                .map((c) => (
                  <tr key={c.customerId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{c.customerName}</td>
                    <td className="py-3 px-4">
                      <QualityTierBadge tier={c.tier} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${c.score}%`,
                              backgroundColor: TIER_COLORS[c.tier] || "#6B7280",
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white font-mono tabular-nums">
                          {c.score}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 font-mono tabular-nums">
                      {c.totalOrders}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white font-mono tabular-nums">
                      {formatPrice(c.totalSpent)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
