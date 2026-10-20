import React from "react";
import { useTranslation } from "react-i18next";
import type { ConvertedOrdersDestinyCardProps } from "./destiny-card/types";
import { ConvertedOrdersDestinyBar } from "./destiny-card/ConvertedOrdersDestinyBar";
import { ConvertedOrdersDestinyStatGrid } from "./destiny-card/ConvertedOrdersDestinyStatGrid";
import { ConvertedOrdersBreakdownTable } from "./destiny-card/ConvertedOrdersBreakdownTable";

export const ConvertedOrdersDestinyCard: React.FC<ConvertedOrdersDestinyCardProps> = ({
  destiny,
}) => {
  const { t } = useTranslation();

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
        color:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
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
      color:
        "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  };

  const qualityBadge = getQualityBadge(effectiveDeliveryRate || deliveryRate);

  return (
    <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 text-card-foreground shadow-sm space-y-4">
      {/* Header with Title & Quality Rating */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              {t("incompleteDestinyTitle", "مصير الطلبات المحولة وجودتها")}
            </h2>
            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-md font-semibold border ${qualityBadge.color}`}
            >
              {qualityBadge.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono tabular-nums">
            {t(
              "incompleteDestinySubtitle",
              "تتبع الحالات الفعلية للطلبات بعد تحويلها وقياس معدلات التسليم والمرتجع"
            )}{" "}
            ({totalConverted.toLocaleString()}{" "}
            {t("orders.incompleteRecovered", "طلبات متحولة")})
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
                {t(
                  "incompleteEffectiveDeliveryRate",
                  "نسبة التسليم من الطلبات المنتهية"
                )}
              </div>
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-primary">
                {effectiveDeliveryRate.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Multi-Segment Stacked Visual Distribution Bar */}
      <ConvertedOrdersDestinyBar
        delivered={delivered}
        inProgress={inProgress}
        returned={returned}
        cancelled={cancelled}
      />

      {/* 4 Main KPI Cards */}
      <ConvertedOrdersDestinyStatGrid
        delivered={delivered}
        inProgress={inProgress}
        returned={returned}
        cancelled={cancelled}
      />

      {/* Toggle Details for Granular Statuses */}
      <ConvertedOrdersBreakdownTable statusBreakdown={statusBreakdown} />
    </section>
  );
};

export default ConvertedOrdersDestinyCard;
