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
import type { ConfirmationOrder, OrderConfirmationUser } from "./types";

export interface ConfirmationOrderRowActionsProps {
  order: ConfirmationOrder;
  isCancelled: boolean;
  callBlocked: boolean;
  callingId: string | null;
  cancellingId: string | null;
  waitingForNextCall: boolean;
  nextCallAllowedAt: Date | null;
  callsLimitReached: boolean;
  settingsEnabled: boolean;
  assignValue: string;
  eligibleUsers: OrderConfirmationUser[];
  assigningId: string | null;
  onAssignChange: (orderId: string, value: string) => void;
  onAssign: (orderId: string, userId: string) => void;
  onPrintSlip?: (order: ConfirmationOrder) => void;
  onPrintInvoice?: (order: ConfirmationOrder) => void;
  onConfirm: (orderId: string) => void;
  onCancel: (order: ConfirmationOrder) => void;
  onLogCall: (order: ConfirmationOrder, result?: string) => void;
  onPostpone: (order: ConfirmationOrder) => void;
}

export const ConfirmationOrderRowActions: React.FC<ConfirmationOrderRowActionsProps> = React.memo(
  ({
    order,
    isCancelled,
    callBlocked,
    callingId,
    cancellingId,
    waitingForNextCall,
    nextCallAllowedAt,
    callsLimitReached,
    settingsEnabled,
    assignValue,
    eligibleUsers,
    assigningId,
    onAssignChange,
    onAssign,
    onPrintSlip,
    onPrintInvoice,
    onConfirm,
    onCancel,
    onLogCall,
    onPostpone,
  }) => {
    const { t } = useTranslation();

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {settingsEnabled && (
          <>
            <select
              value={assignValue}
              onChange={(e) => onAssignChange(order.id, e.target.value)}
              className="h-9 px-2.5 border border-border/70 rounded-xl bg-background text-foreground text-xs min-w-[140px] focus:border-primary focus:outline-none transition-colors"
              disabled={eligibleUsers.length === 0}
            >
              <option value="">
                {t("orders.selectEmployeeToAssign", { defaultValue: "اختر موظفاً" })}
              </option>
              {eligibleUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {`${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                    user.email ||
                    user.id}
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
          title={
            waitingForNextCall && nextCallAllowedAt
              ? `${t("orders.nextCallAfter", { defaultValue: "اتصل بعد" })}: ${new Intl.DateTimeFormat(
                  "ar-EG",
                  { hour: "2-digit", minute: "2-digit" }
                ).format(nextCallAllowedAt)}`
              : callsLimitReached
              ? String(
                  t("orders.callsLimitReached", {
                    defaultValue: "وصلت لأقصى محاولات الاتصال",
                  })
                )
              : undefined
          }
          className="inline-flex h-9 items-center gap-1 px-2.5 sm:px-3 rounded-xl border border-amber-300/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
        >
          <PhoneIcon className="w-4 h-4" />
          <span>
            {callingId === order.id
              ? t("orders.loggingCall", { defaultValue: "تسجيل..." })
              : t("orders.noAnswer", { defaultValue: "لا رد" })}
          </span>
        </button>

        <button
          onClick={() => onPostpone(order)}
          disabled={isCancelled}
          className="inline-flex h-9 items-center gap-1 px-2.5 sm:px-3 rounded-xl border border-border/70 bg-background text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
        >
          <CalendarDaysIcon className="w-4 h-4" />
          <span className="hidden sm:inline">
            {t("orders.postponeOrderTitle", { defaultValue: "تأجيل" })}
          </span>
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
          <XCircleIcon
            className={`w-4 h-4 ${cancellingId === order.id ? "animate-pulse" : ""}`}
          />
          <span className="hidden sm:inline">
            {cancellingId === order.id
              ? t("orders.cancellingOrder", { defaultValue: "جاري الإلغاء..." })
              : t("orders.cancelOrder", { defaultValue: "إلغاء" })}
          </span>
        </button>
      </div>
    );
  }
);

ConfirmationOrderRowActions.displayName = "ConfirmationOrderRowActions";
