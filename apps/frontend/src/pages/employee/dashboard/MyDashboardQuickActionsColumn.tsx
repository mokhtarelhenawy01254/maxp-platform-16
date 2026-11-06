import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Target,
} from "lucide-react";
import type { TFunction } from "i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  AdvanceRequest,
  PermissionRequest,
  RecentLeave,
  Warning,
} from "./types";

interface MyDashboardQuickActionsColumnProps {
  t: TFunction;
  canCheckIn: boolean;
  pendingRequestsCount: number;
  recentLeaves: RecentLeave[];
  permissions: PermissionRequest[];
  advances: AdvanceRequest[];
  warnings: Warning[];
  onNavigate: (path: string, options?: { state?: Record<string, unknown> }) => void;
}

export const MyDashboardQuickActionsColumn: React.FC<
  MyDashboardQuickActionsColumnProps
> = ({
  t,
  canCheckIn,
  pendingRequestsCount,
  recentLeaves,
  permissions,
  advances,
  warnings,
  onNavigate,
}) => {
  return (
    <div className="space-y-6 lg:col-span-1">
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {t("employee.dashboard.quickActions")}
          </CardTitle>
          <CardDescription>
            {t("employee.dashboard.quickActionsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Button
            variant="outline"
            className="w-full justify-start h-14 rounded-2xl bg-white dark:bg-gray-900 border-gray-100 hover:border-primary/50 hover:bg-primary/5 shadow-sm transition-all group"
            onClick={() => onNavigate("/my-attendance")}
          >
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl ml-3 group-hover:bg-blue-100 group-hover:scale-110 transition-all">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 text-right">
              <p className="font-bold text-gray-900 dark:text-gray-100">
                {canCheckIn
                  ? t("employee.attendance.checkIn")
                  : t("employee.attendance.checkOut")}
              </p>
              <p className="text-[10px] text-gray-400">
                {t("employee.dashboard.checkInOutDesc")}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 -mr-4 group-hover:mr-0 transition-all" />
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-14 rounded-2xl bg-white dark:bg-gray-900 border-gray-100 hover:border-green-500/50 hover:bg-green-50/50 shadow-sm transition-all group"
            onClick={() =>
              onNavigate("/my-leaves", { state: { createNew: true } })
            }
          >
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-xl ml-3 group-hover:bg-green-100 group-hover:scale-110 transition-all">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 text-right">
              <p className="font-bold text-gray-900 dark:text-gray-100">
                {t("employee.dashboard.requestLeave")}
              </p>
              <p className="text-[10px] text-gray-400">
                {t("employee.dashboard.requestLeaveDesc")}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 -mr-4 group-hover:mr-0 transition-all" />
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-14 rounded-2xl bg-white dark:bg-gray-900 border-gray-100 hover:border-yellow-500/50 hover:bg-yellow-50/50 shadow-sm transition-all group"
            onClick={() =>
              onNavigate("/my-permissions", { state: { createNew: true } })
            }
          >
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl ml-3 group-hover:bg-yellow-100 group-hover:scale-110 transition-all">
              <FileText className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1 text-right">
              <p className="font-bold text-gray-900 dark:text-gray-100">
                {t("employee.dashboard.requestPermission")}
              </p>
              <p className="text-[10px] text-gray-400">
                {t("employee.dashboard.requestPermissionDesc")}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 -mr-4 group-hover:mr-0 transition-all" />
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-14 rounded-2xl bg-white dark:bg-gray-900 border-gray-100 hover:border-purple-500/50 hover:bg-purple-50/50 shadow-sm transition-all group"
            onClick={() =>
              onNavigate("/my-advances", { state: { createNew: true } })
            }
          >
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl ml-3 group-hover:bg-purple-100 group-hover:scale-110 transition-all">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1 text-right">
              <p className="font-bold text-gray-900 dark:text-gray-100">
                {t("employee.dashboard.requestAdvance")}
              </p>
              <p className="text-[10px] text-gray-400">
                {t("employee.dashboard.requestAdvanceDesc")}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 -mr-4 group-hover:mr-0 transition-all" />
          </Button>
        </CardContent>
      </Card>

      {pendingRequestsCount > 0 && (
        <Card className="border-none shadow-md bg-white dark:bg-gray-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-1 w-full bg-yellow-400"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span>{t("employee.dashboard.pendingRequests")}</span>
              <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none rounded-full font-mono tabular-nums">
                {pendingRequestsCount}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-gray-500">
              {t("employee.dashboard.pendingRequestsDesc", {
                count: pendingRequestsCount,
              })}
            </p>
            <div className="flex -space-x-reverse space-x-2">
              {recentLeaves
                .filter((l) => l.status === "PENDING")
                .map((l) => (
                  <div
                    key={l.id}
                    title={t("employee.dashboard.leaveRequest")}
                    className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 border border-green-100 dark:border-green-800"
                  >
                    <Calendar className="h-4 w-4" />
                  </div>
                ))}
              {permissions
                .filter((p) => p.status === "PENDING")
                .map((p) => (
                  <div
                    key={p.id}
                    title={t("employee.dashboard.permissionRequest")}
                    className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-600 border border-yellow-100 dark:border-yellow-800"
                  >
                    <FileText className="h-4 w-4" />
                  </div>
                ))}
              {advances
                .filter((a) => a.status === "PENDING")
                .map((a) => (
                  <div
                    key={a.id}
                    title={t("employee.dashboard.advanceRequest")}
                    className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 border border-purple-100 dark:border-purple-800"
                  >
                    <DollarSign className="h-4 w-4" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {warnings.length > 0 &&
        warnings.some((w) => w.status === "ISSUED" || !w.status) && (
          <Card className="border-none shadow-md bg-red-50 dark:bg-red-900/10 border-r-4 border-r-red-500">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-1" />
              <div className="flex-1">
                <p className="font-bold text-red-900 dark:text-red-400 text-sm">
                  {t("employee.dashboard.adminAlert")}
                </p>
                <p className="text-xs text-red-700 dark:text-red-500/80 mb-2">
                  {t("employee.dashboard.adminAlertDesc")}
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-red-600 font-bold"
                  onClick={() => onNavigate("/my-warnings")}
                >
                  {t("employee.dashboard.viewWarnings")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
};
