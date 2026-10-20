import React from "react";
import { useTranslation } from "react-i18next";

export interface ConfirmationOrderDueCellProps {
  amountDue: number;
  orderTotal: number;
  shipping: number;
  deposit: number;
  callAttempts: number;
  maxCallsNoAnswer: number;
  callBlocked: boolean;
  formatPrice: (val: number) => string;
}

export const ConfirmationOrderDueCell: React.FC<ConfirmationOrderDueCellProps> = React.memo(
  ({
    amountDue,
    orderTotal,
    shipping,
    deposit,
    callAttempts,
    maxCallsNoAnswer,
    callBlocked,
    formatPrice,
  }) => {
    const { t } = useTranslation();

    return (
      <div className="flex flex-col items-start gap-1 text-xs sm:text-sm min-w-[130px]">
        <span className="font-bold text-foreground font-mono tabular-nums">
          {t("orders.amountDue", { defaultValue: "المستحق" })}: {formatPrice(amountDue)}
        </span>
        <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
          {formatPrice(orderTotal)}
          {shipping > 0 &&
            ` + ${formatPrice(shipping)} ${t("orders.shippingShort", { defaultValue: "شحن" })}`}
          {deposit > 0 &&
            ` - ${formatPrice(deposit)} ${t("orders.depositShort", { defaultValue: "عربون" })}`}
        </span>
        {callAttempts > 0 && (
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-mono tabular-nums font-semibold ${
              callBlocked
                ? "bg-destructive/10 text-destructive border border-destructive/20"
                : "bg-muted text-muted-foreground border border-border/70"
            }`}
          >
            {t("orders.callAttemptsCount", { defaultValue: "محاولات الاتصال" })}:{" "}
            {callAttempts}/{maxCallsNoAnswer > 0 ? maxCallsNoAnswer : "∞"}
          </span>
        )}
      </div>
    );
  }
);

ConfirmationOrderDueCell.displayName = "ConfirmationOrderDueCell";
