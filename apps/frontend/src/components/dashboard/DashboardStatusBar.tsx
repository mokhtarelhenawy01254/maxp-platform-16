import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { BarChart2 } from "lucide-react";
import type { DashboardData } from "../../pages/dashboard/types";

type Props = {
  dashboard: DashboardData | undefined;
  isRtl: boolean;
  activeApps: string[];
};

export function DashboardStatusBar({ dashboard, isRtl, activeApps }: Props) {
  const { t } = useTranslation();
  const company = dashboard?.company;
  if (!company) return null;

  const users = dashboard?.usage?.users;

  return (
    <div
      className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-xl bg-card border border-border/70 shadow-xs text-xs"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex items-center gap-2 shrink-0">
        <BarChart2 className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="font-semibold text-foreground whitespace-nowrap">{company.name}</span>
      </div>

      {company.plan && (
        <span className="text-[11px] text-muted-foreground shrink-0 px-2 py-0.5 rounded-md bg-muted font-medium">
          {company.plan}
        </span>
      )}

      <span className="h-3 w-px bg-border/60 shrink-0" />

      <span className="text-muted-foreground whitespace-nowrap shrink-0">
        <span className="text-foreground font-semibold font-mono tabular-nums">{activeApps.length}</span>{" "}
        {t("companyDashboard.stats.activeApps")}
      </span>

      {users && (
        <>
          <span className="h-3 w-px bg-border/60 shrink-0" />
          <span
            className={cn(
              "whitespace-nowrap shrink-0 font-mono tabular-nums",
              users.percentage >= 90 ? "text-destructive font-semibold" : "text-muted-foreground"
            )}
          >
            {users.current ?? 0}/{users.limit ?? "∞"}
          </span>
        </>
      )}
    </div>
  );
}
