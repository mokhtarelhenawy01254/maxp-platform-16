import type { FacebookCampaignPerformanceBreakdown } from "../../../services/facebookAdsService";
import { formatCurrency, formatNumber } from "../../../utils/facebookAdsHelpers";

export default function CampaignBreakdownInline({
  title,
  campaign,
  currency,
}: {
  title: string;
  campaign?: FacebookCampaignPerformanceBreakdown | null;
  currency: string;
}) {
  if (!campaign || campaign.rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 px-2 py-1.5 text-[11px] font-bold text-slate-400 dark:border-slate-800">
        {title}: لا توجد بيانات كافية
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 px-2 py-1.5 dark:border-slate-800">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] font-black text-slate-400">{title}</span>
        <span className="whitespace-nowrap text-[10px] font-black text-slate-500">
          {formatCurrency(campaign.metrics.spend, currency)}
        </span>
      </div>
      {campaign.rows.slice(0, 2).map((row) => (
        <div
          key={row.key}
          className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300"
        >
          <span className="truncate">{row.label}</span>
          <span className="whitespace-nowrap">
            {formatNumber(row.metrics.roas, 2)}x / {formatNumber(row.metrics.purchases)}
          </span>
        </div>
      ))}
    </div>
  );
}
