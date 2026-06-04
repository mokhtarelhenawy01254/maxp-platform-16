import { t } from "i18next";
import { Button } from "../../components/ui/button";
import type { DashboardIntroBandProps } from "./types";
import { DashboardStatusStrip } from "./index";

export default function DashboardIntroBand({
  activation,
  company,
  currentRangeLabel,
  currentRangeMeta,
  productCountLabel,
  isRtl,
  onNavigate,
}: DashboardIntroBandProps) {
  if (!company) {
    return null;
  }

  const onboardingActive =
    company.onboarding && !company.onboarding.completed;
  const activationActive =
    !activation.completed && activation.nextStepId !== "setup";

  if (!onboardingActive && !activationActive) {
    const productCount = productCountLabel;
    return (
      <DashboardStatusStrip
        badge={t("companyDashboard.hero.readyBadge")}
        countLabel={currentRangeLabel}
        description={t("companyDashboard.hero.readySummary")}
        details={
          <>
            <span>{productCount}</span>
            <span>{currentRangeMeta}</span>
            <span>{t("companyDashboard.hero.readyMeta")}</span>
          </>
        }
        title={company.name}
        tone="success"
        actions={
          <Button
            size="sm"
            onClick={() => onNavigate("/orders")}
          >
            {t("companyDashboard.hero.primaryViewOrders")}
          </Button>
        }
      />
    );
  }

  if (onboardingActive) {
    return (
      <DashboardStatusStrip
        badge={t("companyDashboard.hero.setupBadge")}
        countLabel={currentRangeLabel}
        description={t("companyDashboard.hero.setupSummary")}
        details={
          <>
            <span>{t("companyDashboard.hero.setupMeta")}</span>
          </>
        }
        title={company.name}
        tone="warning"
        actions={
          <Button
            size="sm"
            onClick={() => onNavigate("/company/onboarding")}
          >
            {t("companyDashboard.hero.primaryCompleteSetup")}
          </Button>
        }
      />
    );
  }

  return null;
}
