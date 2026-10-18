import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CreditCardIcon,
  PhoneIcon,
  CalendarDaysIcon,
  PrinterIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { OrderCallButton } from "../../../components/telephony/OrderCallButton";
import type {
  ConfirmationOrder,
  OrderConfirmationUser,
} from "./types";

export interface ConfirmationOrderRowProps {
  order: ConfirmationOrder;
  assignValue: string;
  eligibleUsers: OrderConfirmationUser[];
  assigningId: string | null;
  cancellingId: string | null;
  callingId: string | null;
  maxCallsNoAnswer: number;
  intervalMinutes: number;
  settingsEnabled: boolean;
  selectionEnabled: boolean;
  isSelected: boolean;
  formatDate: (value: string) => string;
  formatPrice: (value: number) => string;
  strategyLabelMap: Record<string, string>;
  onAssignChange: (orderId: string, value: string) => void;
  onAssign: (orderId: string, userId: string) => void;
  onConfirm: (orderId: string) => void;
  onCancel: (order: ConfirmationOrder) => void;
  onLogCall: (order: ConfirmationOrder, result?: string) => void;
  onPostpone: (order: ConfirmationOrder) => void;
  onToggleSelect: (orderId: string) => void;
  onPrintSlip?: (order: ConfirmationOrder) => void;
  onPrintInvoice?: (order: ConfirmationOrder) => void;
}

export const ConfirmationOrderRow: React.FC<ConfirmationOrderRowProps> = React.memo(({
  order,
  assignValue,
  eligibleUsers,
  assigningId,
  cancellingId,
  callingId,
  maxCallsNoAnswer,
  intervalMinutes,
  settingsEnabled,
  selectionEnabled,
  isSelected,
  formatDate,
  formatPrice,
  strategyLabelMap,
  onAssignChange,
  onAssign,
  onConfirm,
  onCancel,
  onLogCall,
  onPostpone,
  onToggleSelect,
  onPrintSlip,
  onPrintInvoice,
}) => {
  const { t } = useTranslation();
  const isCancelled = String(order.status || "").toUpperCase() === "CANCELLED";
  const callAttempts = order.callAttempts || 0;
  const deposit = Number(order.codDepositAmount) || 0;
  const shipping = Number(order.shipping) || 0;
  const amountDue = (Number(order.total) || 0) + shipping - deposit;
  const callsLimitReached = maxCallsNoAnswer > 0 && callAttempts >= maxCallsNoAnswer;
  const lastCallAt = order.lastCallAttemptAt ? new Date(order.lastCallAttemptAt) : null;
  const nextCallAllowedAt = lastCallAt && intervalMinutes > 0
    ? new Date(lastCallAt.getTime() + intervalMinutes * 60 * 1000)
    : null;
  const waitingForNextCall = Boolean(nextCallAllowedAt && nextCallAllowedAt.getTime() > Date.now());
  const callBlocked = callsLimitReached || waitingForNextCall;

  const paymentMethodUpper = String(order.paymentMethod || "").toUpperCase();
  const paymentStatusUpper = String(order.paymentStatus || "").toUpperCase();
  const isPaid = paymentStatusUpper === "COMPLETED" || paymentStatusUpper === "PAID";
  const isPrepaid = isPaid || ["CREDIT_CARD", "WALLET", "INSTAPAY", "VISA", "MASTERCARD", "VODAFONE_CASH"].includes(paymentMethodUpper);

  const getPaymentBadge = () => {
    if (paymentMethodUpper.includes("WALLET") || paymentMethodUpper.includes("VODAFONE")) {
      return {
        label: isPaid ? "محفظة إلكترونية — مدفوع" : "محفظة إلكترونية — مراجعة الدفع",
        className: isPaid
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      };
    }
    if (paymentMethodUpper.includes("INSTAPAY")) {
      return {
        label: isPaid ? "إنستاباي — مدفوع" : "إنستاباي — مراجعة الدفع",
        className: isPaid
          ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      };
    }
    if (paymentMethodUpper.includes("CARD") || paymentMethodUpper.includes("VISA") || paymentMethodUpper.includes("MASTERCARD")) {
      return {
        label: isPaid ? "بطاقة بنكية — مدفوع أونلاين" : "بطاقة بنكية — مراجعة الدفع",
        className: isPaid
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
          : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      };
    }
    if (isPaid) {
      return {
        label: "مدفوع مسبقاً",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      };
    }
    return {
      label: "دفع عند الاستلام",
      className: "bg-muted text-muted-foreground border-border/70",
    };
  };

  const paymentBadge = getPaymentBadge();

  return (
    <div className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center gap-3.5 sm:gap-4 hover:bg-muted/40 transition-colors bg-card">
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
            <span className={`text-[11px] px-2 py-0.5 rounded-md border font-semibold inline-flex items-center gap-1 ${paymentBadge.className}`}>
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
            <span dir="ltr" className="font-mono tabular-nums">{order.customerPhone || t("orders.noPhone", { defaultValue: "بدون هاتف" })}</span>
            {order.governorate && <span>• {order.governorate}</span>}
          </div>

          {/* Order Items */}
          {order.items && order.items.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {order.items.map((item, idx) => (
                <span
                  key={item.id || idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background text-foreground text-xs border border-border/70 font-medium"
                >
                  <span className="font-bold text-primary font-mono tabular-nums">{item.quantity}×</span>
                  <span className="truncate max-w-[180px]">{item.productName || item.name}</span>
                  {(item.color || item.size) && (
                    <span className="text-[11px] text-muted-foreground">
                      ({[item.color, item.size].filter(Boolean).join(" - ")})
                    </span>
                  )}
                  {item.sku && (
                    <span className="text-[10px] text-muted-foreground font-mono">[{item.sku}]</span>
                  )}
                </span>
              ))}
            </div>
          )}

          <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="font-mono tabular-nums">{formatDate(order.createdAt)}</span>
            <span>•</span>
            <span>{order.sourceType}</span>
            <span>• {t("orders.distributedTo", { defaultValue: "موزع إلى" })} {order.assignedToName || order.assignedTo || t("orders.unassigned", { defaultValue: "غير مخصص" })}</span>
            {order.assignmentStrategy && (
              <span>• {strategyLabelMap[order.assignmentStrategy] || order.assignmentStrategy}</span>
            )}
          </div>
        </div>
      </div>

      {/* Due Amount and Call Attempts */}
      <div className="flex flex-col items-start gap-1 text-xs sm:text-sm min-w-[130px]">
        <span className="font-bold text-foreground font-mono tabular-nums">
          {t("orders.amountDue", { defaultValue: "المستحق" })}: {formatPrice(amountDue)}
        </span>
        <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
          {formatPrice(Number(order.total) || 0)}
          {shipping > 0 && ` + ${formatPrice(shipping)} ${t("orders.shippingShort", { defaultValue: "شحن" })}`}
          {deposit > 0 && ` - ${formatPrice(deposit)} ${t("orders.depositShort", { defaultValue: "عربون" })}`}
        </span>
        {callAttempts > 0 && (
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono tabular-nums font-semibold ${
            callBlocked ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-muted text-muted-foreground border border-border/70"
          }`}>
            {t("orders.callAttemptsCount", { defaultValue: "محاولات الاتصال" })}: {callAttempts}/{maxCallsNoAnswer > 0 ? maxCallsNoAnswer : "∞"}
          </span>
        )}
      </div>

      {/* Order Status Badge */}
      <div className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold self-start lg:self-center">
        {order.status}
      </div>

      {/* Actions Strip */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {settingsEnabled && (
          <>
            <select
              value={assignValue}
              onChange={(e) => onAssignChange(order.id, e.target.value)}
              className="h-9 px-2.5 border border-border/70 rounded-xl bg-background text-foreground text-xs min-w-[140px] focus:border-primary focus:outline-none transition-colors"
              disabled={eligibleUsers.length === 0}
            >
              <option value="">{t("orders.selectEmployeeToAssign", { defaultValue: "اختر موظفاً" })}</option>
              {eligibleUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {`${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || user.id}
                </option>
              ))}
            </select>
            <button
              onClick={() => onAssign(order.id, assignValue)}
              disabled={assigningId === order.id || !assignValue}
              className="inline-flex h-9 items-center gap-1 px-3 bg-primary text-primary-foreground rounded-xl text-xs font-semibold disabled:opacity-50 active:scale-95 transition-all"
            >
              {t("orders.assign", { defaultValue: "تخصيص" })}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => onPrintSlip?.(order)}
          disabled={isCancelled}
          title="طباعة قسيمة التجهيز وتفاصيل المنتجات"
          className="inline-flex h-9 items-center gap-1.5 px-2.5 sm:px-3 rounded-xl border border-border/70 bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors disabled:opacity-50 active:scale-95"
        >
          <PrinterIcon className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline">الأصناف</span>
        </button>

        <button
          type="button"
          onClick={() => onPrintInvoice?.(order)}
          disabled={isCancelled}
          title="طباعة الفاتورة"
          className="inline-flex h-9 items-center gap-1 px-2.5 rounded-xl border border-border/70 bg-background text-muted-foreground hover:text-foreground text-xs font-semibold hover:bg-muted transition-colors disabled:opacity-50 active:scale-95"
        >
          <DocumentTextIcon className="w-4 h-4" />
          <span className="hidden sm:inline">فاتورة</span>
        </button>

        <Link
          to={`/orders/${encodeURIComponent(order.orderNumber)}?edit=1`}
          className="inline-flex h-9 items-center gap-1.5 px-2.5 sm:px-3 rounded-xl border border-primary/20 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors active:scale-95"
          title="تعديل بنود وكميات وبيانات الطلب"
        >
          <PencilSquareIcon className="w-4 h-4" />
          <span>تعديل</span>
        </Link>

        <Link
          to={`/orders/${encodeURIComponent(order.orderNumber)}`}
          className="inline-flex h-9 items-center gap-1.5 px-2.5 rounded-xl border border-border/70 bg-background text-muted-foreground hover:text-foreground text-xs font-semibold hover:bg-muted transition-colors active:scale-95"
          title="خيارات وحالة الدفع والمطابقة"
        >
          <CreditCardIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">الدفع</span>
        </Link>

        {/* Real phone calling button via paired device */}
        <OrderCallButton
          orderId={order.id}
          orderNumber={order.orderNumber}
          customerName={order.customerName}
          customerPhone={order.customerPhone}
          compact
          onConfirm={() => onConfirm(order.id)}
          onNoAnswer={() => onLogCall(order, "unreached")}
          onPostpone={() => onPostpone(order)}
          onCancel={() => onCancel(order)}
        />

        <button
          onClick={() => onLogCall(order, "unreached")}
          disabled={isCancelled || callBlocked || callingId === order.id}
          title={waitingForNextCall && nextCallAllowedAt
            ? `${t("orders.nextCallAfter", { defaultValue: "اتصل بعد" })}: ${new Intl.DateTimeFormat("ar-EG", { hour: "2-digit", minute: "2-digit" }).format(nextCallAllowedAt)}`
            : callsLimitReached ? String(t("orders.callsLimitReached", { defaultValue: "وصلت لأقصى محاولات الاتصال" })) : undefined}
          className="inline-flex h-9 items-center gap-1 px-2.5 sm:px-3 rounded-xl border border-amber-300/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
        >
          <PhoneIcon className="w-4 h-4" />
          <span>{callingId === order.id ? t("orders.loggingCall", { defaultValue: "تسجيل..." }) : t("orders.noAnswer", { defaultValue: "لا رد" })}</span>
        </button>

        <button
          onClick={() => onPostpone(order)}
          disabled={isCancelled}
          className="inline-flex h-9 items-center gap-1 px-2.5 sm:px-3 rounded-xl border border-border/70 bg-background text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
        >
          <CalendarDaysIcon className="w-4 h-4" />
          <span className="hidden sm:inline">{t("orders.postponeOrderTitle", { defaultValue: "تأجيل" })}</span>
        </button>

        <button
          onClick={() => onConfirm(order.id)}
          disabled={isCancelled}
          className="inline-flex h-9 items-center gap-1 px-3 sm:px-3.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50 shadow-xs active:scale-95"
        >
          <CheckCircleIcon className="w-4 h-4" />
          <span>{t("orders.confirmOrder", { defaultValue: "تأكيد" })}</span>
        </button>

        <button
          onClick={() => onCancel(order)}
          disabled={isCancelled || cancellingId === order.id}
          className="inline-flex h-9 items-center gap-1 px-2.5 sm:px-3 rounded-xl border border-destructive/30 bg-destructive/10 text-xs font-bold text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
        >
          <XCircleIcon className={`w-4 h-4 ${cancellingId === order.id ? "animate-pulse" : ""}`} />
          <span className="hidden sm:inline">{cancellingId === order.id ? t("orders.cancellingOrder", { defaultValue: "جاري الإلغاء..." }) : t("orders.cancelOrder", { defaultValue: "إلغاء" })}</span>
        </button>
      </div>
    </div>
  );
});

ConfirmationOrderRow.displayName = "ConfirmationOrderRow";

export default ConfirmationOrderRow;
