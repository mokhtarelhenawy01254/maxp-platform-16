import React from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MarketplaceApp as MPA } from "@/types/marketplace";
import { getAppDestination } from "@/utils/marketplace";
import {
  PlanOption,
  planTitles,
  getPlanPrices,
} from "../../types/appDetailsTypes";

interface AppDetailsMobileStickyBarProps {
  app: MPA;
  isInstalled: boolean;
  installing: boolean;
  isExpired: boolean;
  selectedPlan: PlanOption;
  onInstall: (plan: PlanOption) => void;
}

export const AppDetailsMobileStickyBar: React.FC<AppDetailsMobileStickyBarProps> = ({
  app,
  isInstalled,
  installing,
  isExpired,
  selectedPlan,
  onInstall,
}) => {
  const navigate = useNavigate();

  const hasPpu = Boolean(
    (app.unitPrice && Number(app.unitPrice) > 0) || app.pricingModel === "PAY_PER_USE"
  );
  const hasMonthly = Boolean(
    (app.monthlyPrice && Number(app.monthlyPrice) > 0) || app.pricingModel === "SUBSCRIPTION"
  );
  const isFree = app.pricingModel === "FREE" && !hasPpu && !hasMonthly;
  const planPrices = getPlanPrices(app);

  return (
    <div
      className="fixed inset-x-0 bottom-[66px] z-40 border-t border-border/40 bg-background/95 backdrop-blur px-4 pt-3 lg:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 text-right">
          <div className="text-sm font-extrabold text-foreground tabular-nums font-mono truncate">
            {isFree ? "مجاني" : planPrices[selectedPlan]}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {isInstalled ? "مفعل — جاهز للاستخدام" : planTitles[selectedPlan]}
          </div>
        </div>
        <div className="flex-1" />
        {isInstalled ? (
          <Button
            onClick={() => {
              const dest = app.mainRoute || getAppDestination(app);
              if (!dest) return;
              if (dest.startsWith("http://") || dest.startsWith("https://")) {
                window.location.href = dest;
              } else {
                navigate(dest);
              }
            }}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            size="sm"
          >
            <ExternalLink size={14} /> فتح التطبيق
          </Button>
        ) : (
          <Button
            className="gap-2 font-bold"
            size="sm"
            disabled={installing}
            onClick={() => onInstall(selectedPlan)}
          >
            {installing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Zap size={14} />
            )}
            {isExpired
              ? "تجديد الاشتراك"
              : isFree
              ? "تفعيل مجاني"
              : `تفعيل ${planTitles[selectedPlan]}`}
          </Button>
        )}
      </div>
    </div>
  );
};
