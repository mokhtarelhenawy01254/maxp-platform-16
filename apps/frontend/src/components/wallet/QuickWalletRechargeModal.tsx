import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { XMarkIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";

interface QuickWalletRechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AMOUNTS = [100, 200, 500, 1000];

export const QuickWalletRechargeModal: React.FC<QuickWalletRechargeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<string>("");
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      fetchBalance();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

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

  const fetchBalance = async () => {
    try {
      setLoadingBalance(true);
      const res = await apiClient.get("/wallet/balance");
      if (res.data?.success && res.data?.data) {
        const bal = res.data.data.balance;
        setBalance(typeof bal === "number" ? bal : parseFloat(bal) || 0);
      }
    } catch {
      // Graceful fallback - non-blocking
    } finally {
      setLoadingBalance(false);
    }
  };

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-recharge-title"
    >
      <div
        className="relative w-full max-w-sm bg-white dark:bg-[#121214] rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-white/10 text-gray-900 dark:text-gray-100 transition-all transform animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id="wallet-recharge-title" className="text-xl font-bold tracking-tight">
            {t("billing.payments.rechargeWallet") || "شحن المحفظة"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 mb-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 text-xs text-muted-foreground">
          <span className="text-gray-600 dark:text-gray-400">
            {t("billing.payments.walletBalance") || "الرصيد الحالي"}:
          </span>
          <span className="font-bold text-gray-900 dark:text-white tabular-nums">
            {loadingBalance ? (
              <span className="inline-block w-12 h-3.5 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
            ) : balance !== null ? (
              `${balance.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`
            ) : (
              "—"
            )}
          </span>
        </div>

        {/* Recharge Form */}
        <form onSubmit={handleRecharge} className="space-y-4">
          <div>
            <label htmlFor="recharge-amount-input" className="sr-only">
              {t("billing.payments.amountPlaceholder") || "المبلغ (جنيه)"}
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="recharge-amount-input"
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t("billing.payments.amountPlaceholder") || "المبلغ (جنيه)"}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-[#18181b] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent tabular-nums text-base transition-all"
                disabled={submitting}
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 dark:text-gray-500 pointer-events-none">
                ج.م
              </span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {PRESET_AMOUNTS.map((preset) => {
              const isSelected = amount === String(preset);
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all active:scale-95 tabular-nums ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10"
                  }`}
                >
                  +{preset}
                </button>
              );
            })}
          </div>

          {/* Confirm Button */}
          <button
            type="submit"
            disabled={submitting || !amount || parseFloat(amount) <= 0}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-stone-900 hover:bg-stone-800 dark:bg-primary dark:hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
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

        {/* View Details / Payments Link */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10 text-center">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate("/payments");
            }}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <span>{t("billing.payments.title") || "عرض سجل المدفوعات والعمليات"}</span>
            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickWalletRechargeModal;
