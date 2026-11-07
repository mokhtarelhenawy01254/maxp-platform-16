import React from "react";
import { useTranslation } from "react-i18next";
import { DocumentDuplicateIcon, GiftIcon } from "@heroicons/react/24/outline";
import { summarizeOrderDocumentItems } from "../../../../../utils/orderDocumentQuantityOffers";
import { hasPostPurchaseOffer } from "../../../../../utils/postPurchaseOfferBadge";
import type { Order } from "../../../Orders";

interface OrdersTableOrderNumberCellProps {
  order: Order;
  displayOrderNumber: string;
  cellPadding: string;
}

export const OrdersTableOrderNumberCell: React.FC<OrdersTableOrderNumberCellProps> = ({
  order,
  displayOrderNumber,
  cellPadding,
}) => {
  const { t } = useTranslation();
  const orderItemsSummary = summarizeOrderDocumentItems(order.items);

  const isAffiliateDirect =
    order.orderSource === "AFFILIATE_DIRECT" ||
    (typeof order.orderNumber === "string" && order.orderNumber.includes("-AFF-")) ||
    (typeof displayOrderNumber === "string" && displayOrderNumber.includes("-AFF-"));
  const affiliateCompanyName =
    order.affiliate?.user?.company?.name ||
    (order.affiliate as any)?.company?.name ||
    null;

  return (
    <td className={cellPadding}>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            dir="ltr"
            className="inline-block whitespace-nowrap font-mono text-xs sm:text-[13px] font-bold tabular-nums text-foreground tracking-tight"
          >
            #{displayOrderNumber}
          </span>
          {isAffiliateDirect && (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300 border border-purple-500/20"
              title={affiliateCompanyName ? `أوردر من شركة مرتبطة: ${affiliateCompanyName}` : "أوردر من شركة مرتبطة"}
            >
              <span>{affiliateCompanyName ? `مرتبط — ${affiliateCompanyName}` : "مرتبط"}</span>
            </span>
          )}
          {(Boolean(order.isWholesale) || order.orderSource === "WHOLESALE" || Boolean(order.wholesaleCustomerId)) && (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300 border border-purple-500/20"
              title="طلب موزع جملة"
            >
              <span>موزع</span>
            </span>
          )}
          {hasPostPurchaseOffer(order) && (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/20"
              title="يحتوي على عرض خاص بعد الشراء (Post-Purchase Upsell)"
            >
              <GiftIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">عرض بعد الشراء</span>
            </span>
          )}
          {order.metadata?.isGuestOrder && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/50">
              {t("orders.guest")}
            </span>
          )}
          {(order.status === "DUPLICATE_ORDER" || Boolean(order.metadata?.duplicate)) && (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/20"
              title={
                order.metadata?.duplicate?.duplicateOfOrderNumber
                  ? `طلب مكرر من #${order.metadata.duplicate.duplicateOfOrderNumber}`
                  : "طلب مكرر"
              }
            >
              <DocumentDuplicateIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>مكرر</span>
              {order.metadata?.duplicate?.duplicateOfOrderNumber && (
                <span className="font-mono text-[10px] opacity-80" dir="ltr">
                  (#{order.metadata.duplicate.duplicateOfOrderNumber})
                </span>
              )}
            </span>
          )}
          {!order.isViewed && (
            <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-400 border border-rose-500/20">
              {t("orders.newLabel")}
            </span>
          )}
        </div>
        {orderItemsSummary.hasQuantityOffers && (
          <div className="inline-flex items-center gap-1 max-w-[220px] truncate rounded border border-amber-200/80 bg-amber-50/80 px-1.5 py-0.5 text-[11px] font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
            <span>{orderItemsSummary.primaryLabel}</span>
          </div>
        )}
        {order.notes && (
          <div
            className="inline-flex items-center gap-1 max-w-[240px] truncate rounded border border-indigo-200/80 bg-indigo-50/80 px-1.5 py-0.5 text-[11px] font-medium text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200"
            title={order.notes}
          >
            <span className="truncate">{order.notes}</span>
          </div>
        )}
      </div>
    </td>
  );
};

export default OrdersTableOrderNumberCell;
