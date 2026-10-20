import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CreditCardIcon } from "@heroicons/react/24/outline";
import type { ConfirmationOrder } from "./types";

export interface ConfirmationOrderCustomerInfoProps {
  order: ConfirmationOrder;
  selectionEnabled: boolean;
  isSelected: boolean;
  isPrepaid: boolean;
  paymentBadge: {
    label: string;
    className: string;
  };
  strategyLabelMap: Record<string, string>;
  formatDate: (value: string) => string;
  onToggleSelect: (orderId: string) => void;
}

export const ConfirmationOrderCustomerInfo: React.FC<ConfirmationOrderCustomerInfoProps> = React.memo(
  ({
    order,
    selectionEnabled,
    isSelected,
    isPrepaid,
    paymentBadge,
    strategyLabelMap,
    formatDate,
    onToggleSelect,
  }) => {
    const { t } = useTranslation();

    return (
      <div className="flex-1 flex items-start gap-3">
        {selectionEnabled && (
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/20 transition-all cursor-pointer"
            checked={isSelected}
            onChange={() => onToggleSelect(order.id)}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/orders/${encodeURIComponent(order.orderNumber)}`}
              className="font-bold font-mono text-sm sm:text-base text-foreground hover:text-primary transition-colors"
            >
              {order.orderNumber}
            </Link>
            {order.isGuestOrder && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                {t("orders.guest", { defaultValue: "زائر" })}
              </span>
            )}
            <span
              className={`text-[11px] px-2 py-0.5 rounded-md border font-semibold inline-flex items-center gap-1 ${paymentBadge.className}`}
            >
              <CreditCardIcon className="w-3 h-3" />
              {paymentBadge.label}
            </span>
            {isPrepaid && (
              <span className="text-[11px] px-2 py-0.5 rounded-md border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 font-semibold">
                قيد المراجعة والمطابقة
              </span>
            )}
          </div>

          <div className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-foreground">{order.customerName}</span>
            <span>•</span>
            <span dir="ltr" className="font-mono tabular-nums">
              {order.customerPhone || t("orders.noPhone", { defaultValue: "بدون هاتف" })}
            </span>
            {order.governorate && <span>• {order.governorate}</span>}
          </div>

          {order.items && order.items.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {order.items.map((item, idx) => (
                <span
                  key={item.id || idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background text-foreground text-xs border border-border/70 font-medium"
                >
                  <span className="font-bold text-primary font-mono tabular-nums">
                    {item.quantity}×
                  </span>
                  <span className="truncate max-w-[180px]">
                    {item.productName || item.name}
                  </span>
                  {(item.color || item.size) && (
                    <span className="text-[11px] text-muted-foreground">
                      ({[item.color, item.size].filter(Boolean).join(" - ")})
                    </span>
                  )}
                  {item.sku && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      [{item.sku}]
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="font-mono tabular-nums">{formatDate(order.createdAt)}</span>
            <span>•</span>
            <span>{order.sourceType}</span>
            <span>
              • {t("orders.distributedTo", { defaultValue: "موزع إلى" })}{" "}
              {order.assignedToName ||
                order.assignedTo ||
                t("orders.unassigned", { defaultValue: "غير مخصص" })}
            </span>
            {order.assignmentStrategy && (
              <span>
                • {strategyLabelMap[order.assignmentStrategy] || order.assignmentStrategy}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ConfirmationOrderCustomerInfo.displayName = "ConfirmationOrderCustomerInfo";
