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

  return (
    <div
      className="flex items-center gap-4 px-5 py-3 rounded-2xl bg-card border border-border/50 shadow-sm overflow-x-auto"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex items-center gap-2 shrink-0">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <ChartBarIcon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <span className="text-sm font-semibold text-foreground">{company.name}</span>
          {company.plan && (
            <span className="text-[11px] text-muted-foreground block">{company.plan}</span>
          )}
        </div>
      </div>

      <div className="h-6 w-px bg-border/50" />

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{t("companyDashboard.stats.activeApps")}: <strong className="text-foreground">{activeApps.length}</strong></span>
        {dashboard?.usage?.users && (
          <span>
            <span className={cn(dashboard.usage.users.percentage != null && dashboard.usage.users.percentage >= 90 ? "text-rose-500" : "")}>
              👥 {dashboard.usage.users.current ?? 0}/{dashboard.usage.users.limit ?? "∞"}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
