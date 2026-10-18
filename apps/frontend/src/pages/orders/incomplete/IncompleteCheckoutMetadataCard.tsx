import React from "react";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import type { IncompleteOrderDetailsData } from "../incompleteUtils";
import { getFieldLabel } from "./IncompleteReasonCard";

interface IncompleteCheckoutMetadataCardProps {
  order: IncompleteOrderDetailsData;
  checkoutMetadata: Array<[string, unknown]>;
  expiry: { label: string; urgent: boolean } | null;
  formatDate: (date: string | Date) => string;
}

export const IncompleteCheckoutMetadataCard: React.FC<
  IncompleteCheckoutMetadataCardProps
> = ({ order, checkoutMetadata, expiry, formatDate }) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs">
      <h2 className="text-sm font-bold text-foreground">
        {t("orders.incompleteCheckoutData") || "بيانات جلسة الدفع الإضافية"}
      </h2>
      <div className="mt-3.5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3 text-xs">
          <div>
            <div className="text-[11px] text-muted-foreground font-medium">
              {t("orders.incompleteStartedAt") || "وقت البدء"}
            </div>
            <div className="mt-1 font-mono tabular-nums text-foreground">
              {order.checkoutStartedAt
                ? formatDate(order.checkoutStartedAt)
                : t("orders.notSpecified") || "غير محدد"}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground font-medium">
              {t("orders.incompleteExpiresAt") || "وقت الانتهاء"}
            </div>
            <div className="mt-1 font-mono tabular-nums text-foreground">
              {order.expiresAt
                ? formatDate(order.expiresAt)
                : t("orders.notSpecified") || "غير محدد"}
            </div>
            {expiry && (
              <div
                className={`inline-flex items-center gap-1 text-[11px] font-semibold mt-1 ${
                  expiry.urgent ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                <Clock className="h-3 w-3" />
                {expiry.label}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-3 text-xs">
          {checkoutMetadata.length ? (
            checkoutMetadata.map(([key, value]) => (
              <div key={key}>
                <div className="text-[11px] text-muted-foreground font-medium">
                  {getFieldLabel(key, t)}
                </div>
                <div className="mt-1 break-words font-mono text-foreground">
                  {typeof value === "string" ? value : JSON.stringify(value)}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
              {t("orders.incompleteNoDetails") || "لا توجد حقول إضافية مسجلة"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncompleteCheckoutMetadataCard;
