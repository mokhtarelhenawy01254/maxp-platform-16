import React from "react";
import { useTranslation } from "react-i18next";
import { DollarSign } from "lucide-react";
import type { OrderDetailsType } from "../types";

export interface OrderReturnCollectionFeeCardProps {
  order: OrderDetailsType;
}

export const OrderReturnCollectionFeeCard: React.FC<OrderReturnCollectionFeeCardProps> = ({
  order,
}) => {
  const { t } = useTranslation();

  const meta =
    typeof order.metadata === "string"
      ? (() => {
          try {
            return JSON.parse(order.metadata);
          } catch {
            return {};
          }
        })()
      : order.metadata || {};

  const returnAmt = meta.returnAmount || null;
  const shippingCost = parseFloat(order.shipping || order.shippingCost || "0");
  const displayAmount = returnAmt ? parseFloat(returnAmt) : shippingCost;

  if (displayAmount <= 0) return null;

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground">
          <DollarSign className="h-4 w-4 text-amber-500 shrink-0" />
          <span>{t("orderDetails.returnCollectionLabel", { defaultValue: "مبلغ تحصيل المرتجع" })}</span>
        </span>
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-mono tabular-nums">
          {t("orderDetails.returnAmount", {
            amount: displayAmount.toFixed(2),
            defaultValue: `${displayAmount.toFixed(2)} ج.م`,
          })}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
        {returnAmt
          ? t("orderDetails.returnCustomValue", { defaultValue: "قيمة مخصصة للمرتجع" })
          : t("orderDetails.returnDefaultValue", { defaultValue: "القيمة الافتراضية للشحن" })}{" "}
        — {t("orderDetails.returnDescription", { defaultValue: "المبلغ المستحق تحصيله من العميل أو شركة الشحن عند استلام المرتجع" })}
      </p>
    </div>
  );
};

export default OrderReturnCollectionFeeCard;
