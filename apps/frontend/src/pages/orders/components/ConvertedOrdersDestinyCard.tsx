import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  RotateCcw,
  XCircle,
  Truck,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
        color: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      };
    }
    if (rate >= 50) {
      return {
        label: t("incompleteQualityGood", "جودة جيدة"),
        color: "border-primary/20 bg-primary/10 text-primary",
      };
    }
    return {
      label: t("incompleteQualityNeedsAttention", "تحتاج متابعة"),
      color: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  };

  const qualityBadge = getQualityBadge(effectiveDeliveryRate || deliveryRate);

  const statCards = [
    {
      title: t("incompleteDestinyDelivered", "تم التسليم"),
      count: delivered.count,
      value: delivered.value,
      rate: delivered.rate,
      icon: CheckCircle2,
      accentColor: "text-emerald-600 dark:text-emerald-400",
      bgBadge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
      border: "border-emerald-500/20",
    },
    {
      title: t("incompleteDestinyInProgress", "قيد الشحن والتنفيذ"),
      count: inProgress.count,
      value: inProgress.value,
      rate: inProgress.rate,
      icon: Truck,
      accentColor: "text-primary",
      bgBadge: "bg-primary/10 text-primary border border-primary/20",
      border: "border-primary/20",
    },
    {
      title: t("incompleteDestinyReturned", "مرتجع"),
      count: returned.count,
      value: returned.value,
      rate: returned.rate,
      icon: RotateCcw,
      accentColor: "text-amber-600 dark:text-amber-400",
      bgBadge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
      border: "border-amber-500/20",
    },
    {
      title: t("incompleteDestinyCancelled", "ملغي"),
      count: cancelled.count,
      value: cancelled.value,
      rate: cancelled.rate,
      icon: XCircle,
      accentColor: "text-destructive",
      bgBadge: "bg-destructive/10 text-destructive border border-destructive/20",
      border: "border-destructive/20",
    },
  ];

  return (
    <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 text-card-foreground shadow-sm space-y-4">
      {/* Header with Title & Quality Rating */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              {t("incompleteDestinyTitle", "مصير الطلبات المحولة وجودتها")}
            </h2>
            <span className={`text-[11px] px-2.5 py-0.5 rounded-md font-semibold border ${qualityBadge.color}`}>
              {qualityBadge.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono tabular-nums">
            {t(
              "incompleteDestinySubtitle",
              "تتبع الحالات الفعلية للطلبات بعد تحويلها وقياس معدلات التسليم والمرتجع",
            )}{" "}
            ({totalConverted.toLocaleString()} {t("orders.incompleteRecovered", "طلبات متحولة")})
          </p>
        </div>

        {/* Success Rate Highlights */}
        <div className="flex items-center gap-3.5 bg-muted/20 px-3.5 py-2 rounded-lg border border-border/60">
          <div className="text-start">
            <div className="text-[11px] font-medium text-muted-foreground">
              {t("incompleteDeliverySuccessRate", "معدل نجاح التسليم")}
            </div>
            <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {deliveryRate.toFixed(1)}%
            </div>
          </div>
          {effectiveDeliveryRate > 0 && effectiveDeliveryRate !== deliveryRate && (
            <div className="text-start border-s border-border/60 ps-3.5">
              <div className="text-[11px] font-medium text-muted-foreground">
                {t("incompleteEffectiveDeliveryRate", "نسبة التسليم من الطلبات المنتهية")}
              </div>
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-primary">
                {effectiveDeliveryRate.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Multi-Segment Stacked Visual Distribution Bar */}
      <div className="space-y-1.5">
        <div
          className="flex h-3 w-full overflow-hidden rounded-full bg-muted/40"
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
              className="bg-primary h-full transition-all"
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
              className="bg-destructive h-full transition-all"
              style={{ width: `${cancelled.rate}%` }}
              title={`${t("incompleteDestinyCancelled", "ملغي")}: ${cancelled.count} (${cancelled.rate.toFixed(1)}%)`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2 pt-0.5 font-mono tabular-nums">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            {t("incompleteDestinyDelivered", "تم التسليم")}: {delivered.count} ({delivered.rate.toFixed(0)}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
            {t("incompleteDestinyInProgress", "قيد الشحن")}: {inProgress.count} ({inProgress.rate.toFixed(0)}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            {t("incompleteDestinyReturned", "مرتجع")}: {returned.count} ({returned.rate.toFixed(0)}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
            {t("incompleteDestinyCancelled", "ملغي")}: {cancelled.count} ({cancelled.rate.toFixed(0)}%)
          </span>
        </div>
      </div>

      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {statCards.map((card, idx) => (
          <div
            key={idx}
            className={`rounded-lg p-3 border bg-muted/15 shadow-2xs ${card.border}`}
          >
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <span className="text-xs font-semibold text-foreground truncate">
                {card.title}
              </span>
              <div className={`p-1 rounded-md ${card.bgBadge}`}>
                <card.icon className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <span className="text-lg font-bold font-mono tabular-nums text-foreground">
                {card.count.toLocaleString()}
              </span>
              <span className={`text-xs font-semibold font-mono tabular-nums ${card.accentColor}`}>
                {card.rate.toFixed(1)}%
              </span>
            </div>

            <div className="text-xs text-muted-foreground mt-1 font-medium font-mono tabular-nums">
              {formatPrice(card.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Toggle Details for Granular Statuses */}
      {statusBreakdown && statusBreakdown.length > 0 && (
        <div className="pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground py-1 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("incompleteStatusBreakdown", "تفصيل الحالات الفعلية")} ({statusBreakdown.length})
            </span>
            {showDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showDetails && (
            <div className="mt-2.5 overflow-hidden rounded-lg border border-border/70">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground border-b border-border/60">
                    <th className="px-3 py-2 text-start font-semibold">الحالة</th>
                    <th className="px-3 py-2 text-start font-semibold">العدد</th>
                    <th className="px-3 py-2 text-start font-semibold">النسبة</th>
                    <th className="px-3 py-2 text-end font-semibold">القيمة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {statusBreakdown.map((row) => {
                    const statusInfo = getOrderStatusDisplay({ status: row.status });
                    return (
                      <tr key={row.status} className="hover:bg-muted/20">
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${statusInfo.primary.colorClass}`}
                          >
                            {statusInfo.primary.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-semibold font-mono tabular-nums text-foreground">
                          {row.count.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground font-mono tabular-nums">
                          {row.rate.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 text-end font-semibold font-mono tabular-nums text-foreground">
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
