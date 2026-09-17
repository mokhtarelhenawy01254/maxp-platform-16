import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Wallet } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import QuickWalletRechargeModal from "./QuickWalletRechargeModal";

interface HeaderWalletShortcutProps {
  className?: string;
}

export const HeaderWalletShortcut: React.FC<HeaderWalletShortcutProps> = ({
  className = "",
}) => {
  const { t, i18n } = useTranslation();
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>("EGP");
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await apiClient.get("/wallet/balance");
      if (res.data?.success && res.data?.data) {
        const bal = res.data.data.balance;
        const numBal = typeof bal === "number" ? bal : parseFloat(bal);
        if (!isNaN(numBal)) {
          setBalance(numBal);
        }
        if (res.data.data.currency) {
          setCurrency(res.data.data.currency);
        }
      }
    } catch {
      // Graceful non-blocking fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();

    const handleFocus = () => {
      fetchBalance();
    };

    const handleWalletUpdate = () => {
      fetchBalance();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    window.addEventListener("wallet:updated", handleWalletUpdate);
    window.addEventListener("wallet-balance-updated", handleWalletUpdate);

    const interval = setInterval(fetchBalance, 60000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("wallet:updated", handleWalletUpdate);
      window.removeEventListener("wallet-balance-updated", handleWalletUpdate);
      clearInterval(interval);
    };
  }, [fetchBalance]);

  const isAr = i18n.language !== "en";
  const currencySymbol = currency === "EGP" ? (isAr ? "ج.م" : "EGP") : currency;

  const formattedBalance = useMemo(() => {
    if (balance === null) return null;
    const numStr = Number(balance).toLocaleString(isAr ? "ar-EG" : "en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return `${numStr} ${currencySymbol}`;
  }, [balance, isAr, currencySymbol]);

  const tooltipText = useMemo(() => {
    const title = t("billing.payments.rechargeWallet") || "شحن المحفظة";
    if (formattedBalance) {
      return `${title} (${formattedBalance})`;
    }
    return title;
  }, [t, formattedBalance]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center gap-1.5 sm:gap-2 h-9 px-2.5 sm:px-3 rounded-full border border-gray-200/90 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-600/60 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/25 transition-all duration-150 active:scale-[0.97] shadow-sm select-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 focus:outline-none shrink-0 group ${className}`}
        title={tooltipText}
        aria-label={tooltipText}
      >
        <Wallet
          className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0 transition-transform group-hover:scale-105"
          strokeWidth={1.8}
        />
        {loading && balance === null ? (
          <span className="w-8 sm:w-10 h-3 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-full" />
        ) : balance !== null ? (
          <span className="text-[11px] sm:text-xs font-bold tabular-nums text-gray-800 dark:text-gray-100 tracking-tight whitespace-nowrap max-w-[90px] sm:max-w-none truncate">
            {formattedBalance}
          </span>
        ) : null}
      </button>

      <QuickWalletRechargeModal
        isOpen={isModalOpen}
        currentBalance={balance}
        currency={currency}
        onClose={() => {
          setIsModalOpen(false);
          fetchBalance();
        }}
      />
    </>
  );
};

export default HeaderWalletShortcut;
