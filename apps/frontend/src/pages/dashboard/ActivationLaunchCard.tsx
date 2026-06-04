import { t } from "i18next";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import type { ActivationLaunchCardProps } from "./types";
import { runActivationNextAction } from "./utils";

const activationStepIds: string[] = ["catalog", "storefront", "channel", "orders"];

export default function ActivationLaunchCard({
  activation,
  company,
  isRtl,
  onNavigate,
}: ActivationLaunchCardProps) {
  const { i18n } = useTranslation();

  if (activation.completed || activation.nextStepId === "setup") {
    return null;
  }

  const steps = activationStepIds.map((id) => ({
    id,
    label: t(`companyDashboard.activationSteps.${id}.title`),
    description: t(`companyDashboard.activationSteps.${id}.description`),
    actionLabel: t(`companyDashboard.activationSteps.${id}.actionLabel`),
    done: activation.completedSteps?.includes(id) ?? false,
  }));

  const doneCount = steps.filter((s) => s.done).length;

  const handleAction = () => {
    runActivationNextAction(activation.nextStepId, company, onNavigate);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <Badge
          variant="secondary"
          className="rounded-sm text-xs"
        >
          {t("companyDashboard.activationCard.badge")}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {doneCount}/{steps.length}{" "}
          {t("companyDashboard.activationCard.stepsComplete")}
        </span>
      </div>
      <h4 className="mt-3 text-sm font-medium">
        {t("companyDashboard.activationCard.title")}
      </h4>
      <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
        {steps.map((step) => (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={
                step.done ? "text-green-600" : "text-muted-foreground"
              }
            >
              {step.done ? "✓" : "○"}
            </span>
            <span>{step.label}</span>
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        className="mt-4 w-full"
        onClick={handleAction}
      >
        {steps.find((s) => s.id === activation.nextStepId)?.actionLabel ??
          t("companyDashboard.activationCard.title")}
      </Button>
    </Card>
  );
}
