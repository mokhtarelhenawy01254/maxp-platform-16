import { Check as CheckCircleIcon, Plus as PlusIcon, Store as BuildingStorefrontIcon, MessageSquare as ChatBubbleLeftRightIcon, ShoppingBag as ShoppingCartIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
;
import type { DashboardData } from "./types";

type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
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
      icon: PlusIcon,
      completed: (counts?.products ?? 0) > 0,
    },
    {
      id: "setupStore",
      label: t("companyDashboard.quickStart.steps.reviewStore.label"),
      description: t("companyDashboard.quickStart.steps.reviewStore.description"),
      href: "/settings/store",
      icon: BuildingStorefrontIcon,
      completed: Boolean(company?.slug),
    },
    {
      id: "connectChannel",
      label: t("companyDashboard.quickStart.steps.confirmChannel.label"),
      description: t(
        "companyDashboard.quickStart.steps.confirmChannel.descriptionPending",
      ),
      href: "/whatsapp",
      icon: ChatBubbleLeftRightIcon,
      completed: hasInbox || (counts?.conversations ?? 0) > 0,
    },
    {
      id: "firstOrder",
      label: t("companyDashboard.quickStart.steps.runTestOrder.label"),
      description: t("companyDashboard.quickStart.steps.runTestOrder.description"),
      href: "/orders/manual",
      icon: ShoppingCartIcon,
      completed: (counts?.orders ?? 0) > 0,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm"
        style={{ boxShadow: "0 28px 72px -48px rgba(7, 17, 32, 0.42)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-foreground">
            {t("companyDashboard.quickStart.firstLaunchTitle")}
          </h2>
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {completedCount}/{steps.length} {t("companyDashboard.quickStart.complete")}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {t("companyDashboard.quickStart.firstLaunchSubtitle")}
        </p>

        <div className="h-1.5 rounded-full overflow-hidden mb-5" style={{ background: "color-mix(in srgb, var(--color-border) 38%, transparent)" }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{ width: `${progressPct}%`, background: "var(--color-success)" }}
          />
        </div>

        <ol className="space-y-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.id}>
                <div
                  className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                  style={{
                    background: step.completed
                      ? "color-mix(in srgb, var(--color-success) 8%, transparent)"
                      : "color-mix(in srgb, var(--color-border) 24%, transparent)",
                  }}
                >
                  <div
                    className="p-2 rounded-lg shrink-0"
                    style={{
                      background: step.completed
                        ? "color-mix(in srgb, var(--color-success) 18%, transparent)"
                        : "color-mix(in srgb, var(--color-primary) 14%, transparent)",
                    }}
                  >
                    {step.completed ? (
                      <CheckCircleIcon className="w-5 h-5" style={{ color: "var(--color-success)" }} />
                    ) : (
                      <Icon className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground block">
                      {step.label}
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      {step.description}
                    </span>
                  </div>
                  {!step.completed && (
                    <button
                      type="button"
                      onClick={() => onNavigate(step.href)}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      {t("companyDashboard.quickStart.actionLabels.completeSetup")}
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