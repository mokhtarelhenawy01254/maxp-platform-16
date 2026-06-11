import { useTranslation } from "react-i18next";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import type { QuickStartChecklistProps } from "./types";
import { openCompanyStorefront } from "./utils";

export default function QuickStartChecklist({
  activation,
  company,
  counts,
  isRtl,
  onNavigate,
}: QuickStartChecklistProps) {
  const { t } = useTranslation();

  if (activation.completed) {
    return null;
  }

  const isSetupPhase = activation.nextStepId === "setup";
  const title = isSetupPhase
    ? t("companyDashboard.quickStart.title")
    : t("companyDashboard.quickStart.firstLaunchTitle");
  const subtitle = isSetupPhase
    ? t("companyDashboard.quickStart.subtitle")
    : t("companyDashboard.quickStart.firstLaunchSubtitle");

  const handleAction = (stepId: string) => {
    switch (stepId) {
      case "confirmBusiness":
        onNavigate("/company/onboarding");
        return;
      case "setIdentity":
        onNavigate("/company/onboarding");
        return;
      case "addFirstProduct":
        onNavigate("/products/new");
        return;
      case "reviewStore":
        onNavigate("/settings/store");
        return;
      case "decideChannel":
        onNavigate("/whatsapp");
        return;
      case "addSellableProduct":
        onNavigate("/products/new");
        return;
      case "reviewPublicStore":
        openCompanyStorefront(company, onNavigate);
        return;
      case "confirmChannel":
        onNavigate("/whatsapp");
        return;
      case "runTestOrder":
        onNavigate("/orders/manual");
        return;
    }
  };

  if (isSetupPhase) {
    const steps = [
      {
        key: "confirmBusiness",
        done: company?.onboarding?.operationsCompleted ?? false,
      },
      {
        key: "setIdentity",
        done: company?.onboarding?.identityCompleted ?? false,
      },
      {
        key: "addFirstProduct",
        done: (counts.products ?? 0) > 0,
      },
      {
        key: "reviewStore",
        done: !!company?.slug,
      },
      {
        key: "decideChannel",
        done: false,
      },
    ];

    const doneCount = steps.filter((s) => s.done).length;

    return (
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="rounded-sm text-xs">
            {doneCount}/{steps.length} {t("companyDashboard.quickStart.complete")}
          </Badge>
        </div>
        <h4 className="mt-3 text-sm font-medium">{title}</h4>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>

        <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
          {steps.map((step) => (
            <li key={step.key} className="flex items-center gap-2">
              <span className={step.done ? "text-success dark:text-success-foreground" : ""}>
                {step.done ? "✓" : "○"}
              </span>
              <span className="flex-1">
                {t(
                  `companyDashboard.quickStart.steps.${step.key}.label`,
                )}
              </span>
              {!step.done && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => handleAction(step.key)}
                >
                  {t(
                    `companyDashboard.quickStart.actionLabels.${step.key === "confirmBusiness" || step.key === "setIdentity" ? "completeSetup" : step.key === "addFirstProduct" ? "addProduct" : step.key === "reviewStore" ? "openStore" : step.key === "decideChannel" ? "openWhatsapp" : step.key}`,
                  )}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  const steps = [
    {
      key: "addSellableProduct",
      done: activation.completedSteps?.includes("catalog") ?? false,
    },
    {
      key: "reviewPublicStore",
      done: activation.completedSteps?.includes("storefront") ?? false,
    },
    {
      key: "confirmChannel",
      done: activation.completedSteps?.includes("channel") ?? false,
    },
    {
      key: "runTestOrder",
      done: activation.completedSteps?.includes("orders") ?? false,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="rounded-sm text-xs">
          {doneCount}/{steps.length} {t("companyDashboard.quickStart.complete")}
        </Badge>
      </div>
      <h4 className="mt-3 text-sm font-medium">{title}</h4>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>

      <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        {steps.map((step) => (
          <li key={step.key} className="flex items-center gap-2">
             <span className={step.done ? "text-success dark:text-success-foreground" : ""}>
                {step.done ? "✓" : "○"}
              </span>
              <span className="flex-1">
                {t(`companyDashboard.quickStart.steps.${step.key}.label`)}
            </span>
            {!step.done && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => handleAction(step.key)}
              >
                {t(
                  `companyDashboard.quickStart.actionLabels.${step.key === "addSellableProduct" ? "addProduct" : step.key === "reviewPublicStore" ? "openStore" : step.key === "confirmChannel" ? "openWhatsapp" : "createOrder"}`,
                )}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
