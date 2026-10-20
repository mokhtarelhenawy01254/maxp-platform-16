import React from "react";
import { Link } from "react-router-dom";
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
  Loader2,
} from "lucide-react";
import type { IncompleteOrder } from "../incompleteUtils";

export interface IncompleteOrderTableRowActionsProps {
  order: IncompleteOrder;
  phone?: string;
  whatsappUrl: string | null;
  isConverting: boolean;
  isCopied: boolean;
  onCopyCartId: (e: React.MouseEvent, cartId: string) => void;
  onConfirmConvert: (cartId: string) => void;
  onOpenContactModal: (cartId: string) => void;
  onOpenCancelModal: (order: IncompleteOrder) => void;
}

export const IncompleteOrderTableRowActions: React.FC<IncompleteOrderTableRowActionsProps> = ({
  order,
  phone,
  whatsappUrl,
  isConverting,
  isCopied,
  onCopyCartId,
  onConfirmConvert,
  onOpenContactModal,
  onOpenCancelModal,
}) => {
  const { t } = useTranslation();

  return (
    <td className="px-3 py-2.5">
      <div className="flex items-center gap-1">
        {/* Call */}
        {phone ? (
          <a
            href={`tel:${phone.replace(/\D/g, "")}`}
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
  );
};
