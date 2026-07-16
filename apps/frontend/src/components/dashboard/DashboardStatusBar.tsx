import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { ChartBarIcon } from "@heroicons/react/24/outline";
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
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border border-border/50 shadow-sm overflow-x-auto text-xs"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex items-center gap-2 shrink-0">
        <ChartBarIcon className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="font-semibold text-foreground whitespace-nowrap">{company.name}</span>
      </div>

      {company.plan && (
        <span className="text-[11px] text-muted-foreground shrink-0 px-2 py-0.5 rounded-full bg-border/30">
          {company.plan}
        </span>
      )}

      <span className="h-3 w-px bg-border/50 shrink-0" />

      <span className="text-muted-foreground whitespace-nowrap shrink-0">
        <span className="text-foreground font-medium">{activeApps.length}</span> {t("companyDashboard.stats.activeApps")}
      </span>

      {users && (
        <>
          <span className="h-3 w-px bg-border/50 shrink-0" />
          <span className={cn("whitespace-nowrap shrink-0", users.percentage >= 90 ? "text-rose-500 font-medium" : "text-muted-foreground")}>
            {users.current ?? 0}/{users.limit ?? "∞"}
          </span>
        </>
      )}
    </div>
  );
}
