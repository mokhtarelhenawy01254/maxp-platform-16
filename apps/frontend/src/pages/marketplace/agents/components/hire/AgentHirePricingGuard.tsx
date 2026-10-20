import React from "react";
import { Wallet, AlertCircle, ExternalLink, Check } from "lucide-react";
import { AgentListing } from "../../agentMarketplaceData";

interface AgentHirePricingGuardProps {
  agent: AgentListing;
  isPro: boolean;
  walletBalance: number | null;
  walletLoading: boolean;
  hasEnoughBalance: boolean;
  onNavigateToRecharge: () => void;
}

export const AgentHirePricingGuard: React.FC<AgentHirePricingGuardProps> = ({
  agent,
  isPro,
  walletBalance,
  walletLoading,
  hasEnoughBalance,
  onNavigateToRecharge,
}) => {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-2.5 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-muted-foreground">فئة التعيين:</span>
          <span className="font-semibold ms-1.5 text-foreground">
            {isPro ? "اشتراك تخصصي Pro" : "كوادر أساسية Core"}
          </span>
        </div>
        <div className="font-semibold text-foreground tabular-nums">
          {isPro ? `${agent.priceMonthly} ${agent.currency || "ج.م"}/شهر` : "متضمن مجاناً بالباقة"}
        </div>
      </div>

      {isPro && (
        <div className="pt-2 border-t border-border/40 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Wallet className="size-3.5 text-primary stroke-[1.5]" />
              <span>رصيد محفظة الشركة المتاح:</span>
            </span>
            <span className="font-bold tabular-nums text-foreground">
              {walletLoading ? (
                <span className="animate-pulse">جاري التحقق…</span>
              ) : (
                `${(walletBalance ?? 0).toLocaleString("ar-EG")} ${agent.currency || "ج.م"}`
              )}
            </span>
          </div>

          {!hasEnoughBalance && !walletLoading && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-red-700 dark:text-red-400 flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-semibold flex items-center gap-1">
                  <AlertCircle className="size-3.5 stroke-[1.5]" />
                  <span>رصيد المحفظة غير كافٍ</span>
                </div>
                <p className="text-[11px] opacity-90">
                  يلزم توفر {agent.priceMonthly} ج.م على الأقل لتفعيل هذا الإيجنت.
                </p>
              </div>
              <button
                type="button"
                onClick={onNavigateToRecharge}
                className="shrink-0 inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-700 transition-colors"
              >
                <span>شحن المحفظة</span>
                <ExternalLink className="size-3" />
              </button>
            </div>
          )}

          {hasEnoughBalance && !walletLoading && (
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="size-3 stroke-[2]" />
              <span>الرصيد يغطي الاشتراك، وسيتم خصم المبلغ وتجديده تلقائياً كل شهر.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
