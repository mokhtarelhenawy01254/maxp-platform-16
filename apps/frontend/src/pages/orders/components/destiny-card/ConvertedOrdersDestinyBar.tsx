import React from "react";
import { useTranslation } from "react-i18next";
import type { ConvertedOrdersDestiny } from "./types";

export interface ConvertedOrdersDestinyBarProps {
  delivered: ConvertedOrdersDestiny["delivered"];
  inProgress: ConvertedOrdersDestiny["inProgress"];
  returned: ConvertedOrdersDestiny["returned"];
  cancelled: ConvertedOrdersDestiny["cancelled"];
}

export const ConvertedOrdersDestinyBar: React.FC<ConvertedOrdersDestinyBarProps> = React.memo(
  ({ delivered, inProgress, returned, cancelled }) => {
    const { t } = useTranslation();

    return (
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
              title={`${t("incompleteDestinyDelivered", "تم التسليم")}: ${
                delivered.count
              } (${delivered.rate.toFixed(1)}%)`}
            />
          )}
          {inProgress.count > 0 && (
            <div
              className="bg-primary h-full transition-all"
              style={{ width: `${inProgress.rate}%` }}
              title={`${t("incompleteDestinyInProgress", "قيد الشحن والتنفيذ")}: ${
                inProgress.count
              } (${inProgress.rate.toFixed(1)}%)`}
            />
          )}
          {returned.count > 0 && (
            <div
              className="bg-amber-500 h-full transition-all"
              style={{ width: `${returned.rate}%` }}
              title={`${t("incompleteDestinyReturned", "مرتجع")}: ${
                returned.count
              } (${returned.rate.toFixed(1)}%)`}
            />
          )}
          {cancelled.count > 0 && (
            <div
              className="bg-destructive h-full transition-all"
              style={{ width: `${cancelled.rate}%` }}
              title={`${t("incompleteDestinyCancelled", "ملغي")}: ${
                cancelled.count
              } (${cancelled.rate.toFixed(1)}%)`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2 pt-0.5 font-mono tabular-nums">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            {t("incompleteDestinyDelivered", "تم التسليم")}: {delivered.count} (
            {delivered.rate.toFixed(0)}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
            {t("incompleteDestinyInProgress", "قيد الشحن")}: {inProgress.count} (
            {inProgress.rate.toFixed(0)}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            {t("incompleteDestinyReturned", "مرتجع")}: {returned.count} (
            {returned.rate.toFixed(0)}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
            {t("incompleteDestinyCancelled", "ملغي")}: {cancelled.count} (
            {cancelled.rate.toFixed(0)}%)
          </span>
        </div>
      </div>
    );
  }
);

ConvertedOrdersDestinyBar.displayName = "ConvertedOrdersDestinyBar";
