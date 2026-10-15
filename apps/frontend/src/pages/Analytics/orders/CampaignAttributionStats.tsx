import React from "react";
import { useCurrency } from "../../../hooks/useCurrency";
import { CampaignAttributionAnalyticsData } from "./campaignAttributionTypes";

interface CampaignAttributionStatsProps {
  data: CampaignAttributionAnalyticsData;
}

export const CampaignAttributionStats: React.FC<CampaignAttributionStatsProps> = ({ data }) => {
  const { formatPrice } = useCurrency();
  const s = data.summary;

  const cells = [
    {
      label: "إجمالي الطلبات",
      value: s.totalOrders.toLocaleString(),
      detail:
        s.storefrontOrders !== undefined && s.inboxOrders !== undefined
          ? `${s.storefrontOrders.toLocaleString()} متجر · ${s.inboxOrders.toLocaleString()} إنبوكس`
          : `${s.deliveryRate.toFixed(1)}% نسبة التسليم`,
      accent: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "طلبات متتبعة",
      value: s.trackedOrders.toLocaleString(),
      detail: `${s.trackingCoverage.toFixed(1)}% تغطية التتبع`,
      accent: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "طلبات بحملة",
      value: s.campaignTaggedOrders.toLocaleString(),
      detail: `${s.directOrders.toLocaleString()} طلب مباشر`,
      accent: "text-violet-600 dark:text-violet-400",
    },
    {
      label: "غير منسوبة",
      value: s.unattributedOrders.toLocaleString(),
      detail: `${s.cancelledOrders.toLocaleString()} ملغي · ${s.returnedOrders.toLocaleString()} مرتجع`,
      accent: "text-muted-foreground",
    },
    {
      label: "إجمالي الإيراد",
      value: formatPrice(s.totalRevenue),
      detail:
        s.inboxRevenue !== undefined && s.inboxRevenue > 0
          ? `${formatPrice(s.storefrontRevenue || 0)} متجر · ${formatPrice(s.inboxRevenue)} إنبوكس`
          : `${formatPrice(s.deliveredRevenue)} إيراد المسلّم`,
      accent: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "متوسط قيمة الطلب",
      value: formatPrice(s.averageOrderValue),
      detail: `${s.deliveredOrders.toLocaleString()} طلب مسلّم`,
      accent: "text-cyan-600 dark:text-cyan-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="rounded-lg border border-border/70 bg-card p-3 shadow-none transition-colors"
        >
          <p className="text-[11px] font-medium text-muted-foreground truncate">
            {cell.label}
          </p>
          <p className={`mt-1 font-mono text-lg font-bold tabular-nums ${cell.accent}`}>
            {cell.value}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground/80 font-mono tabular-nums">
            {cell.detail}
          </p>
        </div>
      ))}
    </div>
  );
};

export default CampaignAttributionStats;
