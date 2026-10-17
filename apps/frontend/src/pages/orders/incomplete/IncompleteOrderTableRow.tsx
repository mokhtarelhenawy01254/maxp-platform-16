import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Phone,
  MessageCircle,
  ShoppingBag,
  FileText,
  Ban,
  ExternalLink,
  Copy,
  Check,
  Clock,
  Loader2,
} from "lucide-react";
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
  getStatusLabel,
  getValueLabel,
  getValueTier,
} from "../incompleteUtils";
import type { OrderAttributionData } from "../types";

import AttributionCell from "./AttributionCell";

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
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-muted/80 flex items-center justify-center text-xs font-semibold text-foreground shrink-0 border border-border/50">
            {name ? name.charAt(0).toUpperCase() : "?"}
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[160px]">
              {name || (
                <span className="text-muted-foreground italic">
                  {t("orders.notSpecified")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
              <span
                className="font-mono tabular-nums truncate max-w-[120px]"
                title={order.cartId}
              >
                {order.cartId.slice(0, 12)}...
              </span>
              {governorate && (
                <>
                  <span className="text-border">·</span>
                  <span>{governorate}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </td>

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
      <td className="px-3 py-2.5">
        <div className="flex flex-col gap-1">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border w-fit ${
              order.status === "lost"
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                order.status === "lost" ? "bg-rose-500" : "bg-amber-500"
              }`}
            />
            <span>{getStatusLabel(order.status, t)}</span>
          </span>
          {expiry && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                expiry.urgent ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>{expiry.label}</span>
            </span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          {/* Call */}
          {contact.phone ? (
            <a
              href={`tel:${contact.phone.replace(/\D/g, "")}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-border/70 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30 transition-all"
              title={t("orders.incompleteCall")}
              aria-label={t("orders.incompleteCall")}
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span
              className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-border/40 text-muted-foreground/40 cursor-not-allowed"
              title={t("orders.incompleteNoPhoneToContact")}
              aria-label={t("orders.incompleteNoPhoneToContact")}
            >
              <Phone className="h-3.5 w-3.5" />
            </span>
          )}

          {/* WhatsApp */}
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-border/70 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30 transition-all"
              title={t("orders.incompleteWhatsApp")}
              aria-label={t("orders.incompleteWhatsApp")}
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span
              className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-border/40 text-muted-foreground/40 cursor-not-allowed"
              title={t("orders.incompleteNoPhoneToContact")}
              aria-label={t("orders.incompleteNoPhoneToContact")}
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </span>
          )}

          {/* Quick Convert */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onConfirmConvert(order.cartId);
            }}
            disabled={isConverting}
            className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title={t("orders.incompleteQuickConvert")}
            aria-label={t("orders.incompleteQuickConvert")}
          >
            {isConverting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShoppingBag className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Log Contact */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenContactModal(order.cartId);
            }}
            className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-border/70 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
            title={t("orders.incompleteLogContact") as string}
            aria-label={t("orders.incompleteLogContact") as string}
          >
            <FileText className="h-3.5 w-3.5" />
          </button>

          {/* Cancel Order */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenCancelModal(order);
            }}
            className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all"
            title={t("orders.incompleteCancelOrder") as string}
            aria-label={t("orders.incompleteCancelOrder") as string}
          >
            <Ban className="h-3.5 w-3.5" />
          </button>

          {/* View Details */}
          <Link
            to={`/orders/incomplete/${encodeURIComponent(order.cartId)}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-border/70 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
            title={t("orders.incompleteViewDetails")}
            aria-label={t("orders.incompleteViewDetails")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          {/* Copy ID */}
          <button
            type="button"
            onClick={(e) => onCopyCartId(e, order.cartId)}
            className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-border/70 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all"
            title={t("orders.incompleteCopyId")}
            aria-label={t("orders.incompleteCopyId")}
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
};

export default IncompleteOrderTableRow;
