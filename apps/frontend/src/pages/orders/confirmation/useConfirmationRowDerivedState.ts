import { useMemo } from "react";
import type { ConfirmationOrder } from "./types";

export interface ConfirmationRowDerivedState {
  isCancelled: boolean;
  callAttempts: number;
  deposit: number;
  shipping: number;
  amountDue: number;
  callsLimitReached: boolean;
  lastCallAt: Date | null;
  nextCallAllowedAt: Date | null;
  waitingForNextCall: boolean;
  callBlocked: boolean;
  isPaid: boolean;
  isPrepaid: boolean;
  paymentBadge: {
    label: string;
    className: string;
  };
}

export function useConfirmationRowDerivedState(
  order: ConfirmationOrder,
  maxCallsNoAnswer: number,
  intervalMinutes: number
): ConfirmationRowDerivedState {
  return useMemo(() => {
    const isCancelled = String(order.status || "").toUpperCase() === "CANCELLED";
    const callAttempts = order.callAttempts || 0;
    const deposit = Number(order.codDepositAmount) || 0;
    const shipping = Number(order.shipping) || 0;
    const amountDue = (Number(order.total) || 0) + shipping - deposit;
    const callsLimitReached = maxCallsNoAnswer > 0 && callAttempts >= maxCallsNoAnswer;
    const lastCallAt = order.lastCallAttemptAt ? new Date(order.lastCallAttemptAt) : null;
    const nextCallAllowedAt =
      lastCallAt && intervalMinutes > 0
        ? new Date(lastCallAt.getTime() + intervalMinutes * 60 * 1000)
        : null;
    const waitingForNextCall = Boolean(
      nextCallAllowedAt && nextCallAllowedAt.getTime() > Date.now()
    );
    const callBlocked = callsLimitReached || waitingForNextCall;

    const paymentMethodUpper = String(order.paymentMethod || "").toUpperCase();
    const paymentStatusUpper = String(order.paymentStatus || "").toUpperCase();
    const isPaid = paymentStatusUpper === "COMPLETED" || paymentStatusUpper === "PAID";
    const isPrepaid =
      isPaid ||
      [
        "CREDIT_CARD",
        "WALLET",
        "INSTAPAY",
        "VISA",
        "MASTERCARD",
        "VODAFONE_CASH",
      ].includes(paymentMethodUpper);

    let paymentBadge = {
      label: "دفع عند الاستلام",
      className: "bg-muted text-muted-foreground border-border/70",
    };

    if (paymentMethodUpper.includes("WALLET") || paymentMethodUpper.includes("VODAFONE")) {
      paymentBadge = {
        label: isPaid ? "محفظة إلكترونية — مدفوع" : "محفظة إلكترونية — مراجعة الدفع",
        className: isPaid
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      };
    } else if (paymentMethodUpper.includes("INSTAPAY")) {
      paymentBadge = {
        label: isPaid ? "إنستاباي — مدفوع" : "إنستاباي — مراجعة الدفع",
        className: isPaid
          ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      };
    } else if (
      paymentMethodUpper.includes("CARD") ||
      paymentMethodUpper.includes("VISA") ||
      paymentMethodUpper.includes("MASTERCARD")
    ) {
      paymentBadge = {
        label: isPaid ? "بطاقة بنكية — مدفوع أونلاين" : "بطاقة بنكية — مراجعة الدفع",
        className: isPaid
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
          : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      };
    } else if (isPaid) {
      paymentBadge = {
        label: "مدفوع مسبقاً",
        className:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      };
    }

    return {
      isCancelled,
      callAttempts,
      deposit,
      shipping,
      amountDue,
      callsLimitReached,
      lastCallAt,
      nextCallAllowedAt,
      waitingForNextCall,
      callBlocked,
      isPaid,
      isPrepaid,
      paymentBadge,
    };
  }, [order, maxCallsNoAnswer, intervalMinutes]);
}
