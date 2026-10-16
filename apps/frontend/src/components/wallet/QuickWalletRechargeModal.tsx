import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Wallet, X, ArrowLeft, Loader2, CreditCard } from "lucide-react";
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

  const presets = [100, 250, 500, 1000];

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
      toast.error(
        err?.response?.data?.message ||
          t("billing.payments.gatewayError") ||
          "حدث خطأ أثناء الاتصال ببوابة الدفع"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const bal = currentBalance !== undefined ? currentBalance : internalBalance;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-recharge-title"
    >
      <div
        className="relative w-full max-w-sm my-auto rounded-2xl border border-border/70 bg-card p-6 shadow-2xl text-foreground"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Wallet className="size-4.5" />
            </div>
            <div>
              <h2 id="wallet-recharge-title" className="text-base font-bold text-foreground">
                {t("billing.payments.rechargeWallet") || "شحن المحفظة"}
              </h2>
              <p className="text-xs text-muted-foreground">شحن الرصيد الفوري عبر بوابة الدفع</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:scale-[0.97]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Current Balance Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 mb-4 rounded-xl border border-border/70 bg-muted/30 text-xs">
          <span className="text-muted-foreground">
            {t("billing.payments.walletBalance") || "الرصيد الحالي"}:
          </span>
          <span className="font-mono text-sm font-bold text-foreground tabular-nums">
            {loadingBalance ? (
              <span className="inline-block w-12 h-3.5 bg-muted animate-pulse rounded" />
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

        {/* Quick Amount Presets */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">مبالغ شائعة</label>
          <div className="grid grid-cols-4 gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset.toString())}
                className={`h-8 rounded-lg border text-xs font-mono font-medium tabular-nums transition-all active:scale-[0.97] ${
                  amount === preset.toString()
                    ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "border-border/70 bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                +{preset}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleRecharge} className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("billing.payments.amountPlaceholder") || "أدخل المبلغ (جنيه)"}
              min="1"
              step="any"
              className="h-11 w-full rounded-xl border border-border/70 bg-background px-3.5 font-mono text-sm text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={submitting}
            />
            <span className="absolute end-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
              {currency === "EGP" ? "ج.م" : currency}
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting || !amount || parseFloat(amount) <= 0}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>{t("billing.payments.recharging") || "جاري التحويل لكاشير..."}</span>
              </>
            ) : (
              <>
                <CreditCard className="size-4" />
                <span>{t("billing.payments.confirmRecharge") || "تأكيد ومتابعة الدفع"}</span>
                <ArrowLeft className="size-3.5 opacity-80" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default QuickWalletRechargeModal;
