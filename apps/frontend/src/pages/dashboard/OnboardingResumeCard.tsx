import { t } from "i18next";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import type { OnboardingResumeCardProps } from "./types";

export default function OnboardingResumeCard({
  company,
  isRtl,
  onNavigate,
}: OnboardingResumeCardProps) {
  const { i18n } = useTranslation();

  if (!company?.onboarding || company.onboarding.completed) {
    return null;
  }

  const steps = [
    {
      key: "welcome",
      done: company.onboarding.welcomeCompleted ?? false,
    },
    {
      key: "operations",
      done: company.onboarding.operationsCompleted ?? false,
    },
    {
      key: "identity",
      done: company.onboarding.identityCompleted ?? false,
    },
    {
      key: "integrations",
      done: company.onboarding.integrationsCompleted ?? false,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="rounded-sm text-xs">
          {t("companyDashboard.onboardingCard.badge")}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {doneCount}/{steps.length}{" "}
          {t("companyDashboard.onboardingCard.stepsComplete")}
        </span>
      </div>
      <h4 className="mt-3 text-sm font-medium">
        {t("companyDashboard.onboardingCard.title")}
      </h4>
      <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
        {steps.map((step) => (
          <li key={step.key} className="flex items-center gap-2">
            <span
              className={
                step.done ? "text-success dark:text-success-foreground" : "text-muted-foreground"
              }
            >
              {step.done ? "✓" : "○"}
            </span>
            <span>{t(`companyDashboard.onboardingSteps.${step.key}.title`)}</span>
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        className="mt-4 w-full"
        onClick={() => onNavigate("/company/onboarding")}
      >
        {t("companyDashboard.onboardingCard.action")}
      </Button>
    </Card>
  );
}
