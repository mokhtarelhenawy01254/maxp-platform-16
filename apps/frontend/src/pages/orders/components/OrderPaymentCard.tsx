import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CreditCard,
  Smartphone,
  Banknote,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { OrderDetailsType } from "../types";
import { useDateFormat } from "../../../hooks/useDateFormat";

interface OrderPaymentCardProps {
  order: OrderDetailsType;
  canUpdatePaymentStatus?: boolean;
  onOpenPaymentModal?: () => void;
}

export const OrderPaymentCard: React.FC<OrderPaymentCardProps> = ({
  order,
  canUpdatePaymentStatus = false,
  onOpenPaymentModal,
}) => {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const kashier = order.kashierPayment || (order.metadata as any)?.kashierPayment || null;
  const paymentStatus = String(order.paymentStatus || "PENDING").toUpperCase();
  const paymentMethod = String(order.paymentMethod || "CASH").toLowerCase();

  const isCompleted = paymentStatus === "COMPLETED";
  const isFailed = paymentStatus === "FAILED";
  const isPending = !isCompleted && !isFailed;

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("تم النسخ بنجاح");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Determine method label and icon
  const getMethodInfo = () => {
    if (kashier) {
      const kMethod = String(kashier.method || "").toLowerCase();
      if (kMethod.includes("wallet") || paymentMethod.includes("wallet")) {
        return {
          label: "كاشير — محفظة إلكترونية (Kashier Wallet)",
          icon: <Smartphone className="h-4 w-4 text-indigo-500" />,
          badge: "محفظة كاشير",
        };
      }
      return {
        label: "كاشير — بطاقة بنكية (Visa / Mastercard)",
        icon: <CreditCard className="h-4 w-4 text-blue-500" />,
        badge: "كارت كاشير",
      };
    }

    if (paymentMethod.includes("wallet")) {
      return {
        label: "محفظة إلكترونية",
        icon: <Smartphone className="h-4 w-4 text-indigo-500" />,
        badge: "محفظة",
      };
    }

    if (paymentMethod.includes("credit") || paymentMethod.includes("card") || paymentMethod.includes("visa")) {
      return {
        label: "بطاقة دفع إلكتروني",
        icon: <CreditCard className="h-4 w-4 text-blue-500" />,
        badge: "بطاقة بنكية",
      };
    }

    return {
      label: "الدفع عند الاستلام (COD)",
      icon: <Banknote className="h-4 w-4 text-emerald-500" />,
      badge: "دفع عند الاستلام",
    };
  };

  const methodInfo = getMethodInfo();

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 text-card-foreground shadow-none space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            {t("orderDetails.paymentInfo") || "معلومات الدفع"}
          </h2>
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 font-mono text-[11px] font-medium tabular-nums ${
            isCompleted
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : isFailed
              ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
              : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          }`}
        >
          {isCompleted && <CheckCircle2 className="h-3 w-3" />}
          {isFailed && <XCircle className="h-3 w-3" />}
          {isPending && <Clock className="h-3 w-3" />}
          {isCompleted ? "مدفوع بالكامل" : isFailed ? "فشل الدفع" : "بانتظار الدفع"}
        </span>
      </div>

      {/* Basic Payment Info */}
      <div className="space-y-2 text-xs">
        {/* Method */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">طريقة الدفع</span>
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            {methodInfo.icon}
            <span>{methodInfo.label}</span>
          </div>
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">المبلغ المطلوب</span>
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {Number(order.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {order.currency || "EGP"}
          </span>
        </div>
      </div>

      {/* Kashier Gateway Dedicated Section */}
      {kashier && (
        <div className="mt-3 pt-3 border-t border-border/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              <span>بوابة الدفع</span>
              <span>•</span>
              <span>Kashier V3</span>
            </span>
            {kashier.transactionResponseMessage && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {kashier.transactionResponseMessage}
              </span>
            )}
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2 text-xs">
            {/* Transaction ID */}
            {kashier.transactionId && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">رقم المعاملة (Tx ID):</span>
                <div className="flex items-center gap-1">
                  <span dir="ltr" className="font-mono font-semibold tabular-nums text-foreground">
                    {kashier.transactionId}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(kashier.transactionId || "", "tx")}
                    className="p-1 text-muted-foreground hover:text-foreground rounded transition"
                    title="نسخ رقم المعاملة"
                  >
                    {copiedKey === "tx" ? (
                      <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Order Reference */}
            {kashier.orderReference && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">مرجع الطلب (Ref):</span>
                <span dir="ltr" className="font-mono font-medium tabular-nums text-foreground">
                  {kashier.orderReference}
                </span>
              </div>
            )}

            {/* Kashier Order ID */}
            {kashier.kashierOrderId && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">معرف كاشير:</span>
                <span dir="ltr" className="font-mono text-muted-foreground truncate max-w-[170px]" title={kashier.kashierOrderId}>
                  {kashier.kashierOrderId}
                </span>
              </div>
            )}

            {/* Payer Account (Mobile / Card) */}
            {kashier.payerAccount && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  {kashier.payerType === "Wallet" || String(kashier.method).includes("wallet")
                    ? "رقم محفظة العميل:"
                    : "حساب الدافع:"}
                </span>
                <div className="flex items-center gap-1">
                  <span dir="ltr" className="font-mono font-semibold tabular-nums text-primary">
                    {kashier.payerAccount}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(kashier.payerAccount || "", "account")}
                    className="p-1 text-muted-foreground hover:text-foreground rounded transition"
                    title="نسخ رقم المحفظة"
                  >
                    {copiedKey === "account" ? (
                      <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Fees */}
            {kashier.totalSellingFees != null && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">رسوم المعاملة (كاشير):</span>
                <span className="font-mono tabular-nums text-foreground">
                  {Number(kashier.totalSellingFees).toFixed(2)} {kashier.currency || "EGP"}
                </span>
              </div>
            )}

            {/* Settled Amount */}
            {kashier.settledAmount != null && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
                <span className="font-medium text-foreground">صافي التحصيل للتاجر:</span>
                <span className="font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {Number(kashier.settledAmount).toFixed(2)} {kashier.currency || "EGP"}
                </span>
              </div>
            )}

            {/* Timestamp */}
            {kashier.confirmedAt && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60 font-mono text-[11px] tabular-nums text-muted-foreground">
                <span>تاريخ المعاملة:</span>
                <span>{formatDateTime(kashier.confirmedAt)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Status Change Action if allowed */}
      {canUpdatePaymentStatus && onOpenPaymentModal && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onOpenPaymentModal}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-lg border border-border/70 bg-card text-foreground hover:bg-muted/50 transition-all active:scale-[0.98]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>تعديل حالة الدفع يدوياً</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderPaymentCard;
