import React from "react";
import { Store, MessageSquare } from "lucide-react";
import { useCurrency } from "../../../hooks/useCurrency";
import { CampaignAttributionRow } from "./campaignAttributionTypes";

const trackingTypeLabels: Record<string, string> = {
  campaign: "حملة",
  direct: "مباشر",
  tracked: "متتبع",
  unattributed: "غير منسوب",
};

const trackingTypeBadgeClasses: Record<string, string> = {
  campaign: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  direct: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
  tracked: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  unattributed: "bg-muted text-muted-foreground border border-border/70",
};

const getTrackingBadgeClass = (type: string) =>
  trackingTypeBadgeClasses[type] || trackingTypeBadgeClasses["unattributed"];

const channelBadgeClasses: Record<string, string> = {
  storefront: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
  inbox: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
};

const getChannelBadgeClass = (channel?: string) =>
  channelBadgeClasses[channel || "storefront"] || channelBadgeClasses.storefront;

const formatAttributionValue = (value?: string | null) => (!value ? "-" : value);

interface CampaignAttributionTableProps {
  rows: CampaignAttributionRow[];
}

export const CampaignAttributionTable: React.FC<CampaignAttributionTableProps> = ({ rows }) => {
  const { formatPrice } = useCurrency();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[950px] text-xs">
        <thead>
          <tr className="border-b border-border/70 text-right text-[11px] font-semibold text-muted-foreground">
            <th className="pb-2">المصدر والمنصة</th>
            <th className="pb-2">الحملة</th>
            <th className="pb-2">المعرفات</th>
            <th className="pb-2">الطلبات</th>
            <th className="pb-2">تم التسليم</th>
            <th className="pb-2">ملغي</th>
            <th className="pb-2">مرتجع</th>
            <th className="pb-2">الإيراد</th>
            <th className="pb-2">متوسط الطلب</th>
            <th className="pb-2">نسبة التسليم</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 font-mono tabular-nums">
          {rows.map((row) => (
            <tr
              key={row.key}
              className="align-top transition-colors hover:bg-muted/40 font-sans"
            >
              <td className="py-2.5 pr-0 pl-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${getTrackingBadgeClass(row.trackingType)}`}
                    >
                      {trackingTypeLabels[row.trackingType] || row.trackingType}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${getChannelBadgeClass(row.channel)}`}
                    >
                      {row.channel === "inbox" ? (
                        <>
                          <MessageSquare className="h-2.5 w-2.5" />
                          إنبوكس
                        </>
                      ) : (
                        <>
                          <Store className="h-2.5 w-2.5" />
                          متجر
                        </>
                      )}
                    </span>
                  </div>
                  <div className="font-semibold text-foreground">
                    {formatAttributionValue(row.source)}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    منصة: {formatAttributionValue(row.platform)}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Medium: {formatAttributionValue(row.medium)}
                  </div>
                </div>
              </td>
              <td className="px-2 py-2.5 font-sans">
                <div className="space-y-1">
                  <div className="font-semibold text-foreground">
                    {row.campaignName}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Content: {formatAttributionValue(row.content)}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Term: {formatAttributionValue(row.term)}
                  </div>
                </div>
              </td>
              <td className="px-2 py-2.5">
                <div className="space-y-0.5 font-mono text-[10px] text-muted-foreground">
                  {row.campaignId && <div>Campaign: {row.campaignId}</div>}
                  {row.adSetId && <div>Ad Set: {row.adSetId}</div>}
                  {row.adId && (
                    <div className="font-medium text-purple-600 dark:text-purple-400">
                      Ad ID: {row.adId}
                    </div>
                  )}
                  {row.postId && (
                    <div>
                      Post: {row.postId.length > 18 ? `${row.postId.slice(0, 18)}...` : row.postId}
                    </div>
                  )}
                  {!row.campaignId && !row.adSetId && !row.adId && !row.postId && <div>-</div>}
                </div>
              </td>
              <td className="px-2 py-2.5 font-mono font-bold text-foreground">
                {row.totalOrders.toLocaleString()}
              </td>
              <td className="px-2 py-2.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {row.deliveredOrders.toLocaleString()}
              </td>
              <td className="px-2 py-2.5 font-mono font-semibold text-rose-600 dark:text-rose-400">
                {row.cancelledOrders.toLocaleString()}
              </td>
              <td className="px-2 py-2.5 font-mono font-semibold text-amber-600 dark:text-amber-400">
                {row.returnedOrders.toLocaleString()}
              </td>
              <td className="px-2 py-2.5 font-mono font-medium text-foreground">
                {formatPrice(row.totalRevenue)}
              </td>
              <td className="px-2 py-2.5 font-mono text-muted-foreground">
                {formatPrice(row.averageOrderValue)}
              </td>
              <td className="px-2 py-2.5 font-mono text-foreground font-medium">
                {row.deliveredRate.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <div className="py-8 text-center text-xs text-muted-foreground">
          لا توجد نتائج مطابقة للفلاتر الحالية.
        </div>
      )}
    </div>
  );
};

export default CampaignAttributionTable;
