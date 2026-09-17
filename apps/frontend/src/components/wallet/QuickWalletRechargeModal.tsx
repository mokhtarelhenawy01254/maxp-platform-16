import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";

interface QuickWalletRechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance?: number | null;
  currency?: string;
}

export const QuickWalletRechargeModal: React.FC<QuickWalletRechargeModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  currency = "EGP",
}) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [internalBalance, setInternalBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      if (currentBalance === undefined) {
        setLoadingBalance(true);
        apiClient
          .get("/wallet/balance")
          .then((res) => {
            if (res.data?.success && res.data?.data) {
              const bal = res.data.data.balance;
              const numBal = typeof bal === "number" ? bal : parseFloat(bal);
              if (!isNaN(numBal)) {
                setInternalBalance(numBal);
              }
            }
          })
          .catch(() => {})
          .finally(() => setLoadingBalance(false));
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
    }
  }, [isOpen, currentBalance]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleRecharge = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error(t("billing.payments.enterValidAmount") || "يرجى إدخال مبلغ صحيح أكبر من صفر");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post("/wallet/kashier/create-session", { amount: numAmount });
      if (res.data?.success && res.data?.data?.sessionUrl) {
        window.location.href = res.data.data.sessionUrl;
      } else {
        toast.error(res.data?.message || t("billing.payments.sessionFailed") || "تعذر بدء جلسة الدفع");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("billing.payments.gatewayError") || "حدث خطأ أثناء الاتصال ببوابة الدفع");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 overflow-y-auto transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-recharge-title"
    >
      <div
        className="relative w-full max-w-sm my-auto bg-white dark:bg-[#18181b] rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-white/10 text-gray-900 dark:text-gray-100"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="wallet-recharge-title" className="text-lg font-bold">
            {t("billing.payments.rechargeWallet") || "شحن المحفظة"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none font-normal cursor-pointer"
          >
            &times;
          </button>
        </div>

        {(() => {
          const bal = currentBalance !== undefined ? currentBalance : internalBalance;
          return (
            <div className="flex items-center justify-between px-3.5 py-2.5 mb-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                {t("billing.payments.walletBalance") || "الرصيد الحالي"}:
              </span>
              <span className="font-bold text-gray-900 dark:text-white tabular-nums text-sm">
                {loadingBalance ? (
                  <span className="inline-block w-12 h-3.5 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                ) : bal !== null ? (
                  `${Number(bal).toLocaleString("ar-EG", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })} ${currency === "EGP" ? "ج.م" : currency}`
                ) : (
                  "—"
                )}
              </span>
            </div>
          );
        })()}

        <form onSubmit={handleRecharge} className="space-y-4">
          <input
            ref={inputRef}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t("billing.payments.amountPlaceholder") || "المبلغ (جنيه)"}
            min="1"
            step="any"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#121214] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white/30 text-base"
            disabled={submitting}
          />

          <button
            type="submit"
            disabled={submitting || !amount || parseFloat(amount) <= 0}
            className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 dark:disabled:bg-stone-800 text-white px-4 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{t("billing.payments.recharging") || "جاري التحويل لكاشير..."}</span>
              </>
            ) : (
              <span>{t("billing.payments.confirmRecharge") || "تأكيد الشحن"}</span>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default QuickWalletRechargeModal;
