import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { DashboardData } from "./types";

export function SetupProgressBanner({ dashboard }: { dashboard: DashboardData }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const counts = dashboard.counts;
  const company = dashboard.company;

  const steps = [
    { done: (counts?.products ?? 0) > 0, label: t("companyDashboard.quickStart.steps.addFirstProduct.label"), href: "/products/new" },
    { done: Boolean(company?.slug), label: t("companyDashboard.quickStart.steps.reviewStore.label"), href: "/settings/store" },
    { done: (counts?.conversations ?? 0) > 0, label: t("companyDashboard.quickStart.steps.confirmChannel.label"), href: "/whatsapp" },
    { done: (counts?.orders ?? 0) > 0, label: t("companyDashboard.quickStart.steps.runTestOrder.label"), href: "/orders/manual" },
  ];

  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/company-dashboard?onboarding=1")}
      className="flex items-center gap-3 w-full p-3 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 hover:from-primary/10 hover:to-primary/15 transition-all text-right"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-semibold text-foreground">{done}/{steps.length} {t("companyDashboard.quickStart.complete")}</span>
          <span className="text-[11px] text-muted-foreground">{t("companyDashboard.quickStart.firstLaunchSubtitle")}</span>
        </div>
        <div className="h-1.5 rounded-full bg-border/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(done / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <span className="text-[11px] font-medium text-primary shrink-0">{t("companyDashboard.quickStart.actionLabels.completeSetup")} →</span>
    </button>
  );
}
