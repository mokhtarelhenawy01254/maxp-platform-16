import React from "react";
import { Palette, Wallet, Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/currency";
import { WalletBalance } from "../../types/storefrontThemesTypes";

interface StorefrontThemesHeaderProps {
  wallet: WalletBalance | null;
  onNavigateWallet: () => void;
  onNavigateAgents: () => void;
  onNavigateCustomize: () => void;
  t: (key: string) => string;
}

export const StorefrontThemesHeader: React.FC<StorefrontThemesHeaderProps> = ({
  wallet,
  onNavigateWallet,
  onNavigateAgents,
  onNavigateCustomize,
  t,
}) => {
  return (
    <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <div className="size-9 sm:size-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
          <Palette className="size-5 sm:size-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2 truncate">
            <span>{t("storefrontThemes.title")}</span>
            <span className="text-[9px] sm:text-[10px] bg-indigo-600/10 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold shrink-0">
              {t("storefrontThemes.version")}
            </span>
          </h1>
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate hidden sm:block">
            {t("storefrontThemes.subtitle")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* WALLET MINI NODE */}
        <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-right">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">
              {t("storefrontThemes.walletBalance")}
            </span>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 tabular-nums font-mono">
              {wallet ? formatCurrency(wallet.balance, wallet.currency) : "0.00 EGP"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg hover:bg-indigo-500/10 hover:text-indigo-500"
            onClick={onNavigateWallet}
            aria-label="المحفظة"
          >
            <Wallet className="size-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          className="h-9 sm:h-10 rounded-xl px-3 sm:px-4 text-[10px] sm:text-[11px] font-bold shrink-0 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 active:scale-[0.97] transition-all"
          onClick={onNavigateAgents}
        >
          <Bot className="size-3.5 sm:size-4 ltr:mr-1.5 rtl:ml-1.5 text-indigo-500" />
          <span className="whitespace-nowrap">سوق الإيجنت (Workforce)</span>
        </Button>

        <Button
          className="h-9 sm:h-10 rounded-xl px-3 sm:px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-[10px] sm:text-[11px] uppercase tracking-widest hover:opacity-90 transition-all shadow-sm shrink-0"
          onClick={onNavigateCustomize}
        >
          <Sparkles className="size-3.5 sm:size-4 ltr:mr-1.5 rtl:ml-1.5" />
          <span className="whitespace-nowrap">{t("storefrontThemes.customizeCurrent")}</span>
        </Button>
      </div>
    </header>
  );
};
