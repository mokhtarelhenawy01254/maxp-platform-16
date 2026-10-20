import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, RotateCcw, XCircle, Truck } from "lucide-react";
import { useCurrency } from "../../../../hooks/useCurrency";
import type { ConvertedOrdersDestiny } from "./types";

export interface ConvertedOrdersDestinyStatGridProps {
  delivered: ConvertedOrdersDestiny["delivered"];
  inProgress: ConvertedOrdersDestiny["inProgress"];
  returned: ConvertedOrdersDestiny["returned"];
  cancelled: ConvertedOrdersDestiny["cancelled"];
}

export const ConvertedOrdersDestinyStatGrid: React.FC<ConvertedOrdersDestinyStatGridProps> = React.memo(
  ({ delivered, inProgress, returned, cancelled }) => {
    const { t } = useTranslation();
    const { formatPrice } = useCurrency();

    const statCards = [
      {
        title: t("incompleteDestinyDelivered", "تم التسليم"),
        count: delivered.count,
        value: delivered.value,
        rate: delivered.rate,
        icon: CheckCircle2,
        accentColor: "text-emerald-600 dark:text-emerald-400",
        bgBadge:
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
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
        bgBadge:
          "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
        border: "border-amber-500/20",
      },
      {
        title: t("incompleteDestinyCancelled", "ملغي"),
        count: cancelled.count,
        value: cancelled.value,
        rate: cancelled.rate,
        icon: XCircle,
        accentColor: "text-destructive",
        bgBadge:
          "bg-destructive/10 text-destructive border border-destructive/20",
        border: "border-destructive/20",
      },
    ];

    return (
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
              <span
                className={`text-xs font-semibold font-mono tabular-nums ${card.accentColor}`}
              >
                {card.rate.toFixed(1)}%
              </span>
            </div>

            <div className="text-xs text-muted-foreground mt-1 font-medium font-mono tabular-nums">
              {formatPrice(card.value)}
            </div>
          </div>
        ))}
      </div>
    );
  }
);

ConvertedOrdersDestinyStatGrid.displayName = "ConvertedOrdersDestinyStatGrid";
