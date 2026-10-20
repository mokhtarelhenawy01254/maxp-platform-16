import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MarketplaceApp as MPA } from "@/types/marketplace";
import { getAppDestination } from "@/utils/marketplace";
import {
  PlanOption,
  planTitles,
  getPlanPrices,
  formatMoney,
} from "../../types/appDetailsTypes";

interface AppDetailsPricingSidebarProps {
  app: MPA;
  isInstalled: boolean;
  installing: boolean;
  isExpired: boolean;
  selectedPlan: PlanOption;
  onSelectPlan: (plan: PlanOption) => void;
  onInstall: (plan: PlanOption) => void;
  onUninstall: () => void;
}

export const AppDetailsPricingSidebar: React.FC<AppDetailsPricingSidebarProps> = ({
  app,
  isInstalled,
  installing,
  isExpired,
  selectedPlan,
  onSelectPlan,
  onInstall,
  onUninstall,
}) => {
  const navigate = useNavigate();

  const hasPpu = Boolean(
    (app.unitPrice && Number(app.unitPrice) > 0) || app.pricingModel === "PAY_PER_USE"
  );
  const hasMonthly = Boolean(
    (app.monthlyPrice && Number(app.monthlyPrice) > 0) || app.pricingModel === "SUBSCRIPTION"
  );
  const hasYearly = Boolean(app.yearlyPrice && Number(app.yearlyPrice) > 0);
  const isFree = app.pricingModel === "FREE" && !hasPpu && !hasMonthly;
  const hasMultiplePlans = !isFree && [hasPpu, hasMonthly, hasYearly].filter(Boolean).length > 1;

  const yearlySavingsPercent =
    hasMonthly && hasYearly && Number(app.monthlyPrice) > 0
      ? Math.max(0, Math.round((1 - Number(app.yearlyPrice) / (Number(app.monthlyPrice) * 12)) * 100))
      : 0;

  const appSettings = (app.settings || {}) as Record<string, any>;
  const activeCycle = appSettings?.billing?.cycle;
  const currentActivePlan: PlanOption | null = isInstalled
    ? app.activePricingModel === "PAY_PER_USE"
      ? "PAY_PER_USE"
      : activeCycle === "yearly"
      ? "YEARLY"
      : "MONTHLY"
    : null;

  const isCurrentPlanActive = isInstalled && currentActivePlan === selectedPlan;
  const planPrices = getPlanPrices(app);

  return (
    <aside className="rounded-2xl border bg-card p-4 text-right lg:sticky lg:top-5 lg:self-start space-y-4">
      {/* Header Summary Box */}
      <div className="rounded-xl border bg-background p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-foreground text-sm font-bold">
              {isFree ? "مجاني" : planTitles[selectedPlan]}
            </div>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              {isFree
                ? "يمكن تفعيلها مباشرة من غير اشتراك."
                : selectedPlan === "PAY_PER_USE"
                ? "ادفع فقط مقابل الاستهلاك الفعلي مع كل طلب."
                : selectedPlan === "YEARLY"
                ? "اشتراك سنوي مستمر مع توفير أكبر."
                : "وصول كامل لجميع مميزات الأداة مع تجديد شهري."}
            </p>
          </div>
          <div className="text-left">
            <div className="text-lg font-extrabold text-primary tabular-nums font-mono">
              {isFree ? "بدون تكلفة" : planPrices[selectedPlan]}
            </div>
          </div>
        </div>
      </div>

      {/* Plan Options Selector (when multiple plans available) */}
      {!isFree && hasMultiplePlans && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-muted-foreground flex items-center justify-between px-1">
            <span>اختر نظام الاشتراك:</span>
            {isInstalled && currentActivePlan && (
              <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <Check size={12} /> مفعل: {planTitles[currentActivePlan]}
              </span>
            )}
          </div>

          {/* Pay-per-use Option */}
          {hasPpu && (
            <div
              onClick={() => onSelectPlan("PAY_PER_USE")}
              className={cn(
                "relative cursor-pointer rounded-xl border p-3 transition-all text-right",
                selectedPlan === "PAY_PER_USE"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border/60 bg-background hover:border-border hover:bg-muted/30",
                currentActivePlan === "PAY_PER_USE" && "ring-1 ring-emerald-500/50"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full border text-[10px]",
                      selectedPlan === "PAY_PER_USE"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    )}
                  >
                    {selectedPlan === "PAY_PER_USE" && <Check size={10} strokeWidth={3} />}
                  </span>
                  <span className="text-sm font-bold text-foreground">حسب الاستخدام</span>
                </div>
                <div className="text-left font-extrabold text-primary text-sm tabular-nums font-mono">
                  {formatMoney(app.unitPrice || 1)}
                  <span className="text-xs font-normal text-muted-foreground font-sans">
                    {" "}
                    / {app.unitName || "طلب"}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground pr-6 leading-relaxed">
                ادفع فقط مع كل طلب يتم تسجيله، بدون أي اشتراك شهري ثابت.
              </p>
            </div>
          )}

          {/* Monthly Option */}
          {hasMonthly && (
            <div
              onClick={() => onSelectPlan("MONTHLY")}
              className={cn(
                "relative cursor-pointer rounded-xl border p-3 transition-all text-right",
                selectedPlan === "MONTHLY"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border/60 bg-background hover:border-border hover:bg-muted/30",
                currentActivePlan === "MONTHLY" && "ring-1 ring-emerald-500/50"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full border text-[10px]",
                      selectedPlan === "MONTHLY"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    )}
                  >
                    {selectedPlan === "MONTHLY" && <Check size={10} strokeWidth={3} />}
                  </span>
                  <span className="text-sm font-bold text-foreground">اشتراك شهري</span>
                </div>
                <div className="text-left font-extrabold text-primary text-sm tabular-nums font-mono">
                  {formatMoney(app.monthlyPrice)}
                  <span className="text-xs font-normal text-muted-foreground font-sans"> / شهر</span>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground pr-6 leading-relaxed">
                وصول كامل غير محدود لإدارة المتجر مع تجديد شهري.
              </p>
            </div>
          )}

          {/* Yearly Option */}
          {hasYearly && (
            <div
              onClick={() => onSelectPlan("YEARLY")}
              className={cn(
                "relative cursor-pointer rounded-xl border p-3 transition-all text-right",
                selectedPlan === "YEARLY"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border/60 bg-background hover:border-border hover:bg-muted/30",
                currentActivePlan === "YEARLY" && "ring-1 ring-emerald-500/50"
              )}
            >
              {yearlySavingsPercent > 0 && (
                <span className="absolute -top-2 left-3 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 shadow-sm">
                  وفر {yearlySavingsPercent}%
                </span>
              )}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full border text-[10px]",
                      selectedPlan === "YEARLY"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    )}
                  >
                    {selectedPlan === "YEARLY" && <Check size={10} strokeWidth={3} />}
                  </span>
                  <span className="text-sm font-bold text-foreground">اشتراك سنوي</span>
                </div>
                <div className="text-left font-extrabold text-primary text-sm tabular-nums font-mono">
                  {formatMoney(app.yearlyPrice)}
                  <span className="text-xs font-normal text-muted-foreground font-sans"> / سنة</span>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground pr-6 leading-relaxed">
                صلاحية سنة كاملة (365 يوم) مع أفضل قيمة واستقرار للمتجر.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-1 space-y-2">
        {isInstalled ? (
          <>
            <Button
              onClick={() => {
                const dest = app.mainRoute || getAppDestination(app);
                if (dest) {
                  if (dest.startsWith("http://") || dest.startsWith("https://")) {
                    window.location.href = dest;
                  } else {
                    navigate(dest);
                  }
                }
              }}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              size="sm"
            >
              <ExternalLink size={14} /> فتح التطبيق
            </Button>

            {isCurrentPlanActive ? (
              <Button disabled variant="outline" className="w-full gap-2 text-xs" size="sm">
                <Check size={14} /> مفعل حالياً ({planTitles[selectedPlan]})
              </Button>
            ) : (
              <Button
                className="w-full gap-2 bg-primary hover:bg-primary/90 font-bold text-xs"
                size="sm"
                disabled={installing}
                onClick={() => onInstall(selectedPlan)}
              >
                {installing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                تغيير الاشتراك إلى {planTitles[selectedPlan]}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-xs text-destructive hover:bg-destructive/10"
              disabled={installing}
              onClick={onUninstall}
            >
              {installing ? <Loader2 size={14} className="animate-spin" /> : null}
              تعطيل التطبيق
            </Button>
          </>
        ) : (
          <>
            {!isInstalled && isExpired && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>اشتراكك منتهي — جدّدي للوصول</span>
                </div>
                <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
                  يتطلب هذا التطبيق اشتراكاً سارياً للوصول واستخدام جميع المميزات التشغيلية.
                </p>
              </div>
            )}

            <Button
              className="w-full gap-2 font-bold"
              size="sm"
              disabled={installing}
              onClick={() => onInstall(selectedPlan)}
            >
              {installing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {isExpired
                ? `تجديد الاشتراك (${planTitles[selectedPlan]} - ${planPrices[selectedPlan]})`
                : `تفعيل ${isFree ? "التطبيق" : `${planTitles[selectedPlan]} (${planPrices[selectedPlan]})`}`}
            </Button>
          </>
        )}
      </div>
    </aside>
  );
};
