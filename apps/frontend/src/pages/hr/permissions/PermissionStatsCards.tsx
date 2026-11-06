import React from "react";
import { Clock, AlertCircle, Timer, Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { PermissionStats } from "./types";

interface PermissionStatsCardsProps {
  stats: PermissionStats | null;
}

export const PermissionStatsCards: React.FC<PermissionStatsCardsProps> = ({
  stats,
}) => {
  const { t } = useTranslation();
  const pendingCount = stats?.pendingCount || 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Pending Card */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-medium">
                {t("employee.permissions.pendingApproval")}
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <h3 className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
                  {pendingCount}
                </h3>
                <span className="text-muted-foreground text-xs">
                  {t("employee.permissions.request")}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          {pendingCount > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md w-fit">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span className="truncate">{t("employee.permissions.respondQuickly")}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Hours Card */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-medium">
                {t("employee.permissions.totalHours")}
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <h3 className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
                  {stats?.totalHours || 0}
                </h3>
                <span className="text-muted-foreground text-xs">
                  {t("employee.permissions.hour")}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
              <Timer className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            إجمالي ساعات الاستئذان المستهلكة
          </p>
        </CardContent>
      </Card>

      {/* Deducted Permissions Card */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-medium">
                {t("employee.permissions.deductedPermissions")}
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <h3 className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-destructive">
                  {stats?.byType?.DEDUCTIBLE || 0}
                </h3>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 truncate">
            {t("employee.permissions.deductedFromSalary")}
          </p>
        </CardContent>
      </Card>

      {/* Official Work Hours Card */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-medium">
                {t("employee.permissions.officialWorkHours")}
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <h3 className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
                  {stats?.byType?.FIXED_HOURS || 0}
                </h3>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
              <Timer className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 truncate">
            {t("employee.permissions.assignments")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
