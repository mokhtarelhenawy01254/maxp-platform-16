import React from "react";
import { Search, X } from "lucide-react";
import {
  CustomerSegmentsStats,
  UnifiedCustomer,
  QualityAnalytics,
  LoyaltyTier,
  QUALITY_TIER_ORDER,
} from "./types";
import { QualityTierBadge, RatingBadge } from "./CustomerSegmentsBadges";
import { useCurrency } from "../../../../hooks/useCurrency";
import { CustomerSegmentsTab } from "./useCustomerSegmentsController";

interface CustomerSegmentsOverviewTabProps {
  stats: CustomerSegmentsStats;
  qualityData: QualityAnalytics | null;
  loyaltyTiers: LoyaltyTier[];
  filteredCustomers: UnifiedCustomer[];
  selectedCustomer: UnifiedCustomer | null;
  selectedCustomerId: string | null;
  onSelectCustomer: (id: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterQuality: string;
  onFilterQualityChange: (q: string) => void;
  filterLoyalty: string;
  onFilterLoyaltyChange: (l: string) => void;
  filterRating: string;
  onFilterRatingChange: (r: string) => void;
  onTabChange: (tab: CustomerSegmentsTab) => void;
}

export const CustomerSegmentsOverviewTab: React.FC<CustomerSegmentsOverviewTabProps> = ({
  stats,
  qualityData,
  loyaltyTiers,
  filteredCustomers,
  selectedCustomer,
  selectedCustomerId,
  onSelectCustomer,
  searchQuery,
  onSearchChange,
  filterQuality,
  onFilterQualityChange,
  filterLoyalty,
  onFilterLoyaltyChange,
  filterRating,
  onFilterRatingChange,
  onTabChange,
}) => {
  const { formatPrice } = useCurrency();

  const hasActiveFilters =
    Boolean(searchQuery) ||
    filterQuality !== "ALL" ||
    filterLoyalty !== "ALL" ||
    filterRating !== "ALL";

  const clearFilters = () => {
    onSearchChange("");
    onFilterQualityChange("ALL");
    onFilterLoyaltyChange("ALL");
    onFilterRatingChange("ALL");
  };

  return (
    <div className="space-y-4">
      {/* Telemetry Strip - Linear Single Chassis */}
      <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 divide-y divide-gray-100 dark:divide-gray-800 sm:grid-cols-4 sm:divide-y-0 sm:divide-x sm:divide-x-reverse rtl:sm:divide-x-reverse">
          <div className="p-3 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
              <span>إجمالي العملاء</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 dark:text-white font-mono tabular-nums">
              {stats.total.toLocaleString("ar-EG")}
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-mono tabular-nums">
              المتوسط: {qualityData?.avgCustomerScore || 0}
            </div>
          </div>
          <div
            className="p-3 sm:p-4 flex flex-col justify-between cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
            onClick={() => {
              onFilterQualityChange("VIP");
              onTabChange("quality");
            }}
          >
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
              <span>VIP / عالي</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-purple-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 dark:text-white font-mono tabular-nums">
              {(stats.vipCount + stats.highCount).toLocaleString("ar-EG")}
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-mono tabular-nums">
              VIP: {stats.vipCount} · عالي: {stats.highCount}
            </div>
          </div>
          <div
            className="p-3 sm:p-4 flex flex-col justify-between cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
            onClick={() => onTabChange("loyalty")}
          >
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
              <span>أعضاء الولاء</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 dark:text-white font-mono tabular-nums">
              {stats.loyaltyMembers.toLocaleString("ar-EG")}
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-mono tabular-nums">
              النقاط: {stats.totalPoints.toLocaleString("ar-EG")}
            </div>
          </div>
          <div className="p-3 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
              <span>عملاء ممتازون</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {stats.excellentCount.toLocaleString("ar-EG")}
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              تقييم مرتفع
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-2.5 sm:p-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                onSelectCustomer(null);
              }}
              placeholder="ابحث باسم العميل، إيميل، رقم الهاتف..."
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-1.5 pl-3 pr-9 text-right text-xs sm:text-sm text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-gray-800 focus:border-gray-400 transition-all"
            />
          </div>
          <select
            value={filterQuality}
            onChange={(e) => onFilterQualityChange(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-900 dark:text-white outline-none cursor-pointer"
          >
            <option value="ALL">كل المستويات (Quality)</option>
            {QUALITY_TIER_ORDER.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={filterLoyalty}
            onChange={(e) => onFilterLoyaltyChange(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-900 dark:text-white outline-none cursor-pointer"
          >
            <option value="ALL">كل مستويات الولاء</option>
            <option value="NONE">بدون مستوى</option>
            {loyaltyTiers.map((t) => (
              <option key={t.id} value={t.nameAr || t.name}>
                {t.nameAr || t.name}
              </option>
            ))}
          </select>
          <select
            value={filterRating}
            onChange={(e) => onFilterRatingChange(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-900 dark:text-white outline-none cursor-pointer"
          >
            <option value="ALL">كل التقييمات</option>
            <option value="EXCELLENT">ممتاز</option>
            <option value="GOOD">جيد</option>
            <option value="AVERAGE">متوسط</option>
            <option value="BAD">سيء</option>
          </select>
        </div>
        {hasActiveFilters && (
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 tabular-nums font-mono">
              النتائج: {filteredCustomers.length} عميل
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 cursor-pointer"
            >
              إلغاء الفلاتر
            </button>
          </div>
        )}
      </div>

      {/* Unified Table */}
      <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead className="bg-gray-50/70 dark:bg-gray-800/40 border-b border-gray-200/80 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">العميل</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">مستوى الجودة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">مستوى الولاء</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">التقييم</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">النقاط</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">الوسوم</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm text-gray-500">
                    {hasActiveFilters
                      ? "لا يوجد عملاء مطابقون للبحث والتصفية."
                      : "لا يوجد عملاء بعد."}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const isSelected = selectedCustomerId === c.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectCustomer(isSelected ? null : c.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-slate-100/80 dark:bg-slate-800/80"
                          : "hover:bg-gray-50/70 dark:hover:bg-gray-800/40"
                      } border-b border-gray-100 dark:border-gray-800/80 last:border-0`}
                    >
                      <td className="py-2.5 px-4">
                        <p className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">{c.name}</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono tabular-nums" dir="ltr">
                          {c.phone || c.email || "-"}
                        </p>
                      </td>
                      <td className="py-2.5 px-4">
                        <QualityTierBadge tier={c.qualityTier} />
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className="text-xs font-semibold"
                          style={{ color: c.loyaltyTier ? "#8B5CF6" : "#9CA3AF" }}
                        >
                          {c.loyaltyTier || "-"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <RatingBadge rating={c.rating} />
                      </td>
                      <td className="py-2.5 px-4 text-xs sm:text-sm font-bold font-mono tabular-nums text-gray-900 dark:text-white" dir="ltr">
                        {c.loyaltyPoints > 0 ? c.loyaltyPoints.toLocaleString("ar-EG") : "-"}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex gap-1 flex-wrap">
                          {c.tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700"
                            >
                              {t}
                            </span>
                          ))}
                          {c.tags.length > 3 && (
                            <span className="text-[10px] text-gray-400 font-mono">+{c.tags.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            c.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300"
                              : c.status === "VIP"
                              ? "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/30 dark:border-purple-900/50 dark:text-purple-300"
                              : c.status === "LEAD"
                              ? "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-300"
                              : c.status === "BLOCKED"
                              ? "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300"
                              : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              c.status === "ACTIVE"
                                ? "bg-emerald-500"
                                : c.status === "VIP"
                                ? "bg-purple-500"
                                : c.status === "LEAD"
                                ? "bg-blue-500"
                                : c.status === "BLOCKED"
                                ? "bg-rose-500"
                                : "bg-gray-400"
                            }`}
                          />
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Side/Bottom Panel */}
      {selectedCustomer && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-indigo-100 dark:border-indigo-900/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedCustomer.name}</h3>
            <button
              type="button"
              onClick={() => onSelectCustomer(null)}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">مستوى الجودة</p>
              <QualityTierBadge tier={selectedCustomer.qualityTier} />
              <p className="text-xs text-gray-400 mt-1 font-mono tabular-nums">Score: {selectedCustomer.qualityScore}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">مستوى الولاء</p>
              <p className="text-sm font-bold text-purple-600">{selectedCustomer.loyaltyTier || "-"}</p>
              <p className="text-xs text-gray-400 mt-1 font-mono tabular-nums">
                {selectedCustomer.loyaltyPoints.toLocaleString("ar-EG")} نقطة
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">التقييم</p>
              <RatingBadge rating={selectedCustomer.rating} />
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">إجمالي المشتريات</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {formatPrice(selectedCustomer.totalSpent)}
              </p>
              <p className="text-xs text-gray-400 mt-1 font-mono tabular-nums">
                {selectedCustomer.totalOrders} طلب
              </p>
            </div>
          </div>
          {selectedCustomer.tags.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {selectedCustomer.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
