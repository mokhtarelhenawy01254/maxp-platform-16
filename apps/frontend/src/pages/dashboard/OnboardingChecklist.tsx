import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Plus,
  Store,
  MessageSquare,
  ShoppingCart,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import type { DashboardData } from "./types";

type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  completed: boolean;
};

// ponytail: deterministic onboarding checklist from existing dashboard signals.
// No backend call — reuses counts/company/activeApps already in the payload.
// Upgrade path: backend returns a dedicated `onboarding` block with per-step state.

export function OnboardingChecklist({
  dashboard,
  activeApps,
  onNavigate,
}: {
  dashboard: DashboardData;
  activeApps: string[];
  onNavigate: (href: string) => void;
}) {
  const { t } = useTranslation();
  const counts = dashboard.counts;
  const company = dashboard.company;
  const hasInbox = activeApps.some((a) => a.toLowerCase() === "unified-inbox");

  const steps: OnboardingStep[] = [
    {
      id: "addProduct",
      label: t("companyDashboard.quickStart.steps.addFirstProduct.label"),
      description: t("companyDashboard.quickStart.steps.addFirstProduct.description"),
      href: "/products/new",
      icon: Plus,
      completed: (counts?.products ?? 0) > 0,
    },
    {
      id: "setupStore",
      label: t("companyDashboard.quickStart.steps.reviewStore.label"),
      description: t("companyDashboard.quickStart.steps.reviewStore.description"),
      href: "/settings/store",
      icon: Store,
      completed: Boolean(company?.slug),
    },
    {
      id: "connectChannel",
      label: t("companyDashboard.quickStart.steps.confirmChannel.label"),
      description: t(
        "companyDashboard.quickStart.steps.confirmChannel.descriptionPending",
      ),
      href: "/whatsapp",
      icon: MessageSquare,
      completed: hasInbox || (counts?.conversations ?? 0) > 0,
    },
    {
      id: "firstOrder",
      label: t("companyDashboard.quickStart.steps.runTestOrder.label"),
      description: t("companyDashboard.quickStart.steps.runTestOrder.description"),
      href: "/orders/manual",
      icon: ShoppingCart,
      completed: (counts?.orders ?? 0) > 0,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-xl bg-card border border-border/70 p-5 sm:p-6 shadow-sm transition-all">
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
            {t("companyDashboard.quickStart.firstLaunchTitle")}
          </h2>
          <span className="text-xs font-mono tabular-nums text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border/40">
            {completedCount}/{steps.length} {t("companyDashboard.quickStart.complete")}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mb-4">
          {t("companyDashboard.quickStart.firstLaunchSubtitle")}
        </p>

        <div className="h-2 rounded-full overflow-hidden mb-5 bg-muted border border-border/40">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out bg-emerald-500 dark:bg-emerald-400"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <ol className="space-y-2.5">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.id}>
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    step.completed
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-border/60 bg-background/50 hover:bg-muted/40"
                  }`}
                >
                  <div
                    className={`p-2 rounded-md shrink-0 border ${
                      step.completed
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-primary/20 bg-primary/10 text-primary"
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground block truncate">
                      {step.label}
                    </span>
                    <span className="text-xs text-muted-foreground block line-clamp-1">
                      {step.description}
                    </span>
                  </div>
                  {!step.completed && (
                    <button
                      type="button"
                      onClick={() => onNavigate(step.href)}
                      className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
                    >
                      <span>{t("companyDashboard.quickStart.actionLabels.completeSetup")}</span>
                      <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export default OnboardingChecklist;