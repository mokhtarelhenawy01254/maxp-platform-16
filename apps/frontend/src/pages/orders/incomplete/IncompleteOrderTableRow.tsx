import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../../hooks/useCurrency";
import type { IncompleteOrder } from "../incompleteUtils";
import {
  formatDateTimeCompact,
  getAbandonReasonLabel,
  getCustomerContact,
  getCustomerName,
  getExpiryStatus,
  getGovernorate,
  getLastUpdated,
  getOrderAttribution,
  getRelativeTime,
  getValueLabel,
  getValueTier,
} from "../incompleteUtils";
import AttributionCell from "./AttributionCell";
import { IncompleteOrderCustomerCell } from "./IncompleteOrderCustomerCell";
import { IncompleteOrderStatusCell } from "./IncompleteOrderStatusCell";
import { IncompleteOrderTableRowActions } from "./IncompleteOrderTableRowActions";

interface IncompleteOrderTableRowProps {
  order: IncompleteOrder;
  idx: number;
  canShowAttribution: boolean;
  convertingCartId: string | null;
  copiedId: string | null;
  onCopyCartId: (e: React.MouseEvent, cartId: string) => void;
  onConfirmConvert: (cartId: string) => void;
  onOpenContactModal: (cartId: string) => void;
  onOpenCancelModal: (order: IncompleteOrder) => void;
}

export const IncompleteOrderTableRow: React.FC<IncompleteOrderTableRowProps> = ({
  order,
  idx,
  canShowAttribution,
  convertingCartId,
  copiedId,
  onCopyCartId,
  onConfirmConvert,
  onOpenContactModal,
  onOpenCancelModal,
}) => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const lang = i18n.language;

  const contact = getCustomerContact(order.checkoutData);
  const lastUpdated = getLastUpdated(order);
  const name = getCustomerName(order.checkoutData);
  const valueTier = getValueTier(order.total || 0);
  const governorate = getGovernorate(order.checkoutData);
  const expiry = getExpiryStatus(order, t);

  const buildWhatsAppUrl = (
    phone: string,
    customerName: string | null,
    total: number
  ) => {
    const digits = phone.replace(/\D/g, "");
    if (!digits) return null;
    const msg = t("orders.incompleteWhatsAppMessage", {
      name: customerName || t("orders.notSpecified"),
      total: formatPrice(total),
    });
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  };

  const whatsappUrl = buildWhatsAppUrl(
    contact.phone,
    name,
    order.total || 0
  );
  const isConverting = convertingCartId === order.cartId;
  const isCopied = copiedId === order.cartId;

  return (
    <tr
      onClick={() =>
        navigate(`/orders/incomplete/${encodeURIComponent(order.cartId)}`)
      }
      className={`group border-b border-border/50 last:border-0 transition-colors cursor-pointer hover:bg-muted/40 ${
        idx % 2 === 0 ? "bg-card" : "bg-muted/15"
      }`}
    >
      {/* Customer */}
      <IncompleteOrderCustomerCell
        name={name}
        cartId={order.cartId}
        governorate={governorate}
      />

      {/* Contact */}
      <td className="px-3 py-2.5">
        <div className="text-xs sm:text-sm text-foreground font-mono tabular-nums font-medium">
          {contact.phone || (
            <span className="text-muted-foreground font-sans text-xs">
              {t("orders.notSpecified")}
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[140px]">
          {contact.email || "—"}
        </div>
      </td>

      {/* Items */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          <span className="text-xs sm:text-sm font-semibold font-mono tabular-nums text-foreground">
            {order.itemsCount || 0}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {t("orders.items")}
          </span>
        </div>
      </td>

      {/* Amount */}
      <td className="px-3 py-2.5">
        <div
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border/60 bg-muted/30 text-xs font-semibold font-mono tabular-nums text-foreground"
          title={getValueLabel(valueTier, t)}
        >
          <span>{formatPrice(order.total || 0)}</span>
        </div>
      </td>

      {/* Attribution */}
      {canShowAttribution && (
        <td className="px-3 py-2.5">
          <AttributionCell attribution={getOrderAttribution(order)} />
        </td>
      )}

      {/* Last Updated */}
      <td className="px-3 py-2.5">
        <div
          className="text-xs text-foreground/90 font-medium"
          title={
            lastUpdated ? formatDateTimeCompact(lastUpdated, lang) : ""
          }
        >
          {lastUpdated
            ? getRelativeTime(lastUpdated, t) ||
              formatDateTimeCompact(lastUpdated, lang)
            : "—"}
        </div>
        {lastUpdated && (
          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono tabular-nums">
            {formatDateTimeCompact(lastUpdated, lang)}
          </div>
        )}
      </td>

      {/* Reason */}
      <td className="px-3 py-2.5">
        {order.abandonReason?.code ? (
          <span
            className="inline-flex w-fit max-w-[210px] items-center rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400"
            title={getAbandonReasonLabel(order.abandonReason, t)}
          >
            <span className="truncate">
              {getAbandonReasonLabel(order.abandonReason, t)}
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/60">—</span>
        )}
      </td>

      {/* Order Status */}
      <IncompleteOrderStatusCell
        status={order.status}
        expiry={expiry}
      />

      {/* Actions */}
      <IncompleteOrderTableRowActions
        order={order}
        phone={contact.phone}
        whatsappUrl={whatsappUrl}
        isConverting={isConverting}
        isCopied={isCopied}
        onCopyCartId={onCopyCartId}
        onConfirmConvert={onConfirmConvert}
        onOpenContactModal={onOpenContactModal}
        onOpenCancelModal={onOpenCancelModal}
      />
    </tr>
  );
};

export default IncompleteOrderTableRow;
