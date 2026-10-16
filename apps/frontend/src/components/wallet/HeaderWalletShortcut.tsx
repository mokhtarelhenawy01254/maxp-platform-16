import React, { useState, useEffect, useCallback } from "react";
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
  const { t } = useTranslation();
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>("EGP");
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

  const buttonTitle = t("billing.payments.rechargeWallet") || "شحن المحفظة";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`relative inline-flex h-9 items-center justify-center rounded-xl border border-border/70 bg-card p-2 text-muted-foreground transition-all duration-150 hover:bg-muted/60 hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
        title={buttonTitle}
        aria-label={buttonTitle}
      >
        <Wallet className="size-4.5 transition-transform group-hover:scale-105" strokeWidth={1.8} />
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
