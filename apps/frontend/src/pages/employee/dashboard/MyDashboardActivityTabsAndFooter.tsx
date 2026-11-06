import React from "react";
import {
  Award,
  Calendar,
  DollarSign,
  FileText,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import type { TFunction } from "i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import {
  AdvanceRequest,
  PermissionRequest,
  RecentLeave,
  Reward,
} from "./types";
import {
  MyDashboardFinancialTabContent,
  MyDashboardGoalsAndFooterSection,
} from "./MyDashboardFinancialAndGoalsSection";

interface MyDashboardActivityTabsAndFooterProps {
  t: TFunction;
  recentLeaves: RecentLeave[];
  permissions: PermissionRequest[];
  advances: AdvanceRequest[];
  rewards: Reward[];
  onTabChange: (tab: string) => void;
  onNavigate: (path: string) => void;
}

export const MyDashboardActivityTabsAndFooter: React.FC<
  MyDashboardActivityTabsAndFooterProps
> = ({
  t,
  recentLeaves,
  permissions,
  advances,
  rewards,
  onTabChange,
  onNavigate,
}) => {
  const combinedMovements = [
    ...recentLeaves.slice(0, 2).map((l) => ({
      ...l,
      category: "LEAVE" as const,
      icon: Calendar,
      color: "green",
      title: `${t("employee.dashboard.leaveRequest")} ${l.type}`,
      date: l.createdAt || l.startDate,
    })),
    ...permissions.slice(0, 2).map((p) => ({
      ...p,
      category: "PERMISSION" as const,
      icon: FileText,
      color: "yellow",
      title:
        p.type === "OUT"
          ? t("employee.dashboard.exitPermission")
          : t("employee.dashboard.delayPermission"),
      date: p.createdAt || p.date,
    })),
    ...advances.slice(0, 2).map((a) => ({
      ...a,
      category: "ADVANCE" as const,
      icon: DollarSign,
      color: "blue",
      title: t("employee.dashboard.advanceRequest"),
      date: a.createdAt,
    })),
    ...rewards.slice(0, 2).map((r) => ({
      ...r,
      category: "REWARD" as const,
      icon: Award,
      color: "purple",
      title: r.rewardName || t("employee.dashboard.additionalReward"),
      date: r.appliedAt || r.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <>
      <div className="lg:col-span-2">
        <Tabs
          defaultValue="activity"
          className="w-full"
          onValueChange={onTabChange}
        >
          <div className="flex items-center justify-between mb-4 bg-card p-1.5 rounded-xl border border-border/70 shadow-xs">
            <TabsList className="bg-transparent gap-2 h-auto p-0">
              <TabsTrigger
                value="activity"
                className="rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all font-bold"
              >
                {t("employee.dashboard.recentActivity")}
              </TabsTrigger>
              <TabsTrigger
                value="requests"
                className="rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all font-bold"
              >
                {t("employee.dashboard.requests")}
              </TabsTrigger>
              <TabsTrigger
                value="financial"
                className="rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all font-bold"
              >
                {t("sidebar.rewards.title")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="activity" className="mt-0">
            <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
              <CardContent className="p-6">
                <div className="space-y-6">
                  {combinedMovements.map((item: any, idx) => (
                    <div
                      key={`${item.category}-${item.date}-${idx}`}
                      className="flex gap-4 relative"
                    >
                      {idx !== 4 && (
                        <div className="absolute top-10 bottom-0 right-[22px] w-[2px] bg-gray-100 dark:bg-gray-800"></div>
                      )}
                      <div
                        className={[
                          "h-11 w-11 rounded-full flex items-center justify-center shrink-0",
                          item.color === "green"
                            ? "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800"
                            : item.color === "yellow"
                              ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800"
                              : item.color === "blue"
                                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800"
                                : "bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800",
                        ].join(" ")}
                      >
                        <item.icon
                          className={[
                            "h-5 w-5",
                            item.color === "green"
                              ? "text-green-600 dark:text-green-400"
                              : item.color === "yellow"
                                ? "text-yellow-600 dark:text-yellow-400"
                                : item.color === "blue"
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-purple-600 dark:text-purple-400",
                          ].join(" ")}
                        />
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-gray-900 dark:text-gray-100">
                            {item.title}
                          </h4>
                          <span className="text-[10px] font-bold text-gray-400">
                            {format(new Date(item.date), "d MMMM yyyy", {
                              locale: ar,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={
                              item.status === "APPROVED" ||
                              item.status === "COMPLETED"
                                ? "bg-green-100/50 text-green-700 border-none"
                                : item.status === "PENDING"
                                  ? "bg-yellow-100/50 text-yellow-700 border-none"
                                  : item.status === "REJECTED"
                                    ? "bg-red-100/50 text-red-700 border-none"
                                    : "bg-blue-100/50 text-blue-700 border-none"
                            }
                          >
                            {item.status === "APPROVED" ||
                            item.status === "COMPLETED"
                              ? t("employee.dashboard.completed")
                              : item.status === "PENDING"
                                ? t("employee.dashboard.underReview")
                                : item.status === "REJECTED"
                                  ? t("employee.dashboard.rejected")
                                  : t("employee.dashboard.active")}
                          </Badge>
                          <span className="text-xs font-mono tabular-nums text-gray-400">
                            {item.category === "LEAVE"
                              ? t("employee.dashboard.days", {
                                  count: item.totalDays,
                                })
                              : item.category === "REWARD"
                                ? t("employee.dashboard.value", {
                                    amount: item.calculatedValue,
                                  })
                                : item.category === "ADVANCE"
                                  ? t("employee.dashboard.value", {
                                      amount: item.amount,
                                    })
                                  : `${item.startTime} - ${item.endTime}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {recentLeaves.length === 0 &&
                    permissions.length === 0 &&
                    rewards.length === 0 && (
                      <div className="text-center py-12">
                        <div className="bg-gray-50 dark:bg-gray-800/10 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="text-gray-400 font-medium">
                          {t("employee.dashboard.noRecentActivity")}
                        </p>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="mt-0">
            <div className="grid gap-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-md font-bold">
                    {t("employee.dashboard.recentPermissions")}
                  </CardTitle>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onNavigate("/my-permissions")}
                  >
                    {t("employee.dashboard.viewAll")}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {permissions.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border border-gray-100 dark:border-gray-800"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center">
                            <FileText className="h-5 w-5 text-yellow-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-gray-100">
                              {p.type === "OUT"
                                ? t("employee.dashboard.exitPermission")
                                : t("employee.dashboard.delayPermission")}
                            </p>
                            <p className="text-xs font-mono tabular-nums text-gray-400">
                              {format(new Date(p.date), "dd/MM/yyyy")} •{" "}
                              {p.startTime} - {p.endTime}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={
                            p.status === "APPROVED"
                              ? "bg-green-500"
                              : p.status === "PENDING"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }
                        >
                          {p.status === "APPROVED"
                            ? t("employee.dashboard.approved")
                            : p.status === "PENDING"
                              ? t("employee.dashboard.pending")
                              : t("employee.dashboard.rejected")}
                        </Badge>
                      </div>
                    ))}
                    {permissions.length === 0 && (
                      <p className="text-center text-gray-400 py-4 text-sm">
                        {t("employee.dashboard.noPermissions")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-md font-bold">
                    {t("employee.dashboard.recentLeaves")}
                  </CardTitle>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onNavigate("/my-leaves")}
                  >
                    {t("employee.dashboard.viewAll")}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentLeaves.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center gap-4 p-3 bg-white dark:bg-gray-900 border border-gray-50 dark:border-gray-800 shadow-sm rounded-xl"
                      >
                        <div className="h-10 w-10 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg flex items-center justify-center shrink-0">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-0.5">
                            <p className="font-bold text-sm">{l.type}</p>
                            <span className="text-[10px] font-mono tabular-nums text-gray-400">
                              {t("employee.dashboard.days", {
                                count: l.totalDays,
                              })}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono tabular-nums text-gray-400">
                            {format(new Date(l.startDate), "dd/MM")} -{" "}
                            {format(new Date(l.endDate), "dd/MM")}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            l.status === "APPROVED"
                              ? "text-green-600 border-green-200"
                              : "text-yellow-600 border-yellow-200"
                          }
                        >
                          {l.status === "APPROVED"
                            ? t("employee.dashboard.approved")
                            : t("employee.dashboard.pending")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="mt-0">
            <MyDashboardFinancialTabContent
              t={t}
              advances={advances}
              rewards={rewards}
              onNavigate={onNavigate}
            />
          </TabsContent>
        </Tabs>
      </div>

      <MyDashboardGoalsAndFooterSection t={t} />
    </>
  );
};
