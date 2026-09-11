import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CreditCardIcon,
  DevicePhoneMobileIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
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
          icon: <DevicePhoneMobileIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
          badge: "محفظة كاشير",
        };
      }
      return {
        label: "كاشير — بطاقة بنكية (Visa / Mastercard)",
        icon: <CreditCardIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
        badge: "كارت كاشير",
      };
    }

    if (paymentMethod.includes("wallet")) {
      return {
        label: "محفظة إلكترونية",
        icon: <DevicePhoneMobileIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
        badge: "محفظة",
      };
    }

    if (paymentMethod.includes("credit") || paymentMethod.includes("card") || paymentMethod.includes("visa")) {
      return {
        label: "بطاقة دفع إلكتروني",
        icon: <CreditCardIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
        badge: "بطاقة بنكية",
      };
    }

    return {
      label: "الدفع عند الاستلام (COD)",
      icon: <BanknotesIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
      badge: "دفع عند الاستلام",
    };
  };

  const methodInfo = getMethodInfo();

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 sm:p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700/80 pb-3">
        <div className="flex items-center gap-2">
          <CreditCardIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t("orderDetails.paymentInfo") || "معلومات الدفع"}
          </h2>
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
            isCompleted
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
              : isFailed
              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
          }`}
        >
          {isCompleted && <CheckCircleIcon className="h-3.5 w-3.5" />}
          {isFailed && <XCircleIcon className="h-3.5 w-3.5" />}
          {isPending && <ClockIcon className="h-3.5 w-3.5" />}
          {isCompleted ? "مدفوع بالكامل" : isFailed ? "فشل الدفع" : "بانتظار الدفع"}
        </span>
      </div>

      {/* Basic Payment Info */}
      <div className="space-y-2.5 text-sm">
        {/* Method */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500 dark:text-gray-400">طريقة الدفع</span>
          <div className="flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200">
            {methodInfo.icon}
            <span>{methodInfo.label}</span>
          </div>
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500 dark:text-gray-400">المبلغ المطلوب</span>
          <span className="font-bold text-gray-900 dark:text-gray-100 text-base">
            {Number(order.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {order.currency || "EGP"}
          </span>
        </div>
      </div>

      {/* Kashier Gateway Dedicated Section */}
      {kashier && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/60">
              <span>بوابة الدفع</span>
              <span>•</span>
              <span>Kashier V3</span>
            </span>
            {kashier.transactionResponseMessage && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                {kashier.transactionResponseMessage}
              </span>
            )}
          </div>

          <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 space-y-2 text-xs">
            {/* Transaction ID */}
            {kashier.transactionId && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-500 dark:text-gray-400">رقم المعاملة (Tx ID):</span>
                <div className="flex items-center gap-1">
                  <span dir="ltr" className="font-mono font-bold text-gray-900 dark:text-gray-100">
                    {kashier.transactionId}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(kashier.transactionId || "", "tx")}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition"
                    title="نسخ رقم المعاملة"
                  >
                    {copiedKey === "tx" ? (
                      <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Order Reference */}
            {kashier.orderReference && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-500 dark:text-gray-400">مرجع الطلب (Ref):</span>
                <span dir="ltr" className="font-mono text-gray-700 dark:text-gray-300">
                  {kashier.orderReference}
                </span>
              </div>
            )}

            {/* Kashier Order ID */}
            {kashier.kashierOrderId && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-500 dark:text-gray-400">معرف كاشير:</span>
                <span dir="ltr" className="font-mono text-gray-600 dark:text-gray-400 truncate max-w-[170px]" title={kashier.kashierOrderId}>
                  {kashier.kashierOrderId}
                </span>
              </div>
            )}

            {/* Payer Account (Mobile / Card) */}
            {kashier.payerAccount && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-500 dark:text-gray-400">
                  {kashier.payerType === "Wallet" || String(kashier.method).includes("wallet")
                    ? "رقم محفظة العميل:"
                    : "حساب الدافع:"}
                </span>
                <div className="flex items-center gap-1">
                  <span dir="ltr" className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {kashier.payerAccount}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(kashier.payerAccount || "", "account")}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition"
                    title="نسخ رقم المحفظة"
                  >
                    {copiedKey === "account" ? (
                      <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Fees */}
            {kashier.totalSellingFees != null && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-500 dark:text-gray-400">رسوم المعاملة (كاشير):</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {Number(kashier.totalSellingFees).toFixed(2)} {kashier.currency || "EGP"}
                </span>
              </div>
            )}

            {/* Settled Amount */}
            {kashier.settledAmount != null && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-200/60 dark:border-gray-700/60">
                <span className="font-medium text-gray-700 dark:text-gray-300">صافي التحصيل للتاجر:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {Number(kashier.settledAmount).toFixed(2)} {kashier.currency || "EGP"}
                </span>
              </div>
            )}

            {/* Timestamp */}
            {kashier.confirmedAt && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-200/60 dark:border-gray-700/60 text-[11px] text-gray-400 dark:text-gray-500">
                <span>تاريخ المعاملة:</span>
                <span>{formatDateTime(kashier.confirmedAt)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Status Change Action if allowed */}
      {canUpdatePaymentStatus && onOpenPaymentModal && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onOpenPaymentModal}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            <span>تعديل حالة الدفع يدوياً</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderPaymentCard;
