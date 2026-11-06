import React from "react";
import { Briefcase, Calendar, Clock, CreditCard, Users } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import type { TFunction } from "i18next";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../components/ui/avatar";
import { EmployeeInfo, LastPayroll, TodayAttendance } from "./types";

interface MyDashboardHeaderAndStatsProps {
  t: TFunction;
  employee: EmployeeInfo;
  todayAttendance: TodayAttendance | null;
  lastPayroll: LastPayroll | null;
  onNavigate: (path: string) => void;
}

export const MyDashboardHeaderAndStats: React.FC<
  MyDashboardHeaderAndStatsProps
> = ({ t, employee, todayAttendance, lastPayroll, onNavigate }) => {
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar className="h-20 w-20 ring-4 ring-white dark:ring-gray-800 shadow-xl border-2 border-primary/20">
              <AvatarImage src={employee.avatar} className="object-cover" />
              <AvatarFallback className="bg-primary/5 text-primary text-2xl font-bold">
                {employee.firstName?.[0]}
                {employee.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 border-4 border-background rounded-full shadow-lg"></div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {t("employee.dashboard.welcome", { name: employee.firstName })}
              </h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
              <span className="bg-primary/10 text-primary px-3 py-0.5 rounded-full text-sm">
                {employee.position?.title || t("employee.dashboard.employee")}
              </span>
              <span>•</span>
              <span className="text-gray-400 dark:text-gray-500">
                {employee.department?.name ||
                  t("employee.dashboard.noDepartment")}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-card px-4 py-2 rounded-xl shadow-xs border border-border/70 flex flex-col items-center min-w-[110px]">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">
              {t("employee.dashboard.employeeNumber")}
            </span>
            <span className="text-lg font-black font-mono tabular-nums text-primary">
              {employee.employeeNumber}
            </span>
          </div>
          <Button
            variant="outline"
            className="rounded-2xl h-14 px-6 border-gray-200 hover:border-primary hover:text-primary transition-all duration-300"
            onClick={() => onNavigate("/profile")}
          >
            <Users className="ml-2 h-5 w-5" />
            {t("employee.dashboard.profile")}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card
          className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden relative group cursor-pointer hover:border-border transition-colors"
          onClick={() => onNavigate("/my-attendance")}
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Clock className="h-24 w-24" />
          </div>
          <CardContent className="p-6 relative">
            <p className="text-muted-foreground text-xs font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />{" "}
              {t("employee.dashboard.todayAttendance")}
            </p>
            <div className="flex flex-col">
              {todayAttendance?.checkIn ? (
                <>
                  <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums mb-1 text-foreground">
                    {new Date(todayAttendance.checkIn).toLocaleTimeString(
                      "ar-EG",
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {t("employee.dashboard.checkedIn")}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums mb-1 text-muted-foreground/60">
                    --:--
                  </span>
                  <span className="text-xs text-blue-100 font-medium">
                    {t("employee.dashboard.notCheckedIn")}
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card
          className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden relative group cursor-pointer hover:border-border transition-colors"
          onClick={() => onNavigate("/my-leaves")}
        >
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform duration-300">
                <Calendar className="h-6 w-6" />
              </div>
              <Badge
                variant="outline"
                className="rounded-lg text-[10px] font-bold text-gray-400 border-gray-100"
              >
                {t("employee.dashboard.annualBalance")}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 font-medium mb-1">
              {t("employee.dashboard.leaveBalance")}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-foreground">
                {employee.annualLeaveBalance}
              </span>
              <span className="text-sm text-gray-400 font-bold">
                {t("employee.dashboard.day")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-none shadow-sm bg-white dark:bg-gray-900 overflow-hidden relative group cursor-pointer"
          onClick={() => onNavigate("/my-payroll")}
        >
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="h-6 w-6" />
              </div>
              <Badge
                variant="outline"
                className="rounded-lg text-[10px] font-bold text-gray-400 border-gray-100"
              >
                {lastPayroll
                  ? format(
                      new Date(lastPayroll.year, lastPayroll.month - 1),
                      "MMMM",
                      { locale: ar },
                    )
                  : "--"}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 font-medium mb-1">
              {t("employee.dashboard.lastNetSalary")}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono tabular-nums text-gray-900 dark:text-white">
                {lastPayroll ? lastPayroll.netSalary.toLocaleString() : "0"}
              </span>
              <span className="text-sm text-gray-400 font-bold">
                {t("employee.dashboard.egp")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-gray-900 overflow-hidden relative group cursor-pointer">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform duration-300">
                <Briefcase className="h-6 w-6" />
              </div>
              <Badge
                variant="outline"
                className="rounded-lg text-[10px] font-bold text-gray-400 border-gray-100"
              >
                {t("employee.dashboard.careerTimeline")}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 font-medium mb-1">
              {t("employee.dashboard.serviceDuration")}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono tabular-nums text-gray-900 dark:text-white">
                {Math.max(
                  0,
                  Math.floor(
                    (new Date().getTime() -
                      new Date(employee.hireDate).getTime()) /
                      (1000 * 60 * 60 * 24 * 365),
                  ),
                )}
              </span>
              <span className="text-sm text-gray-400 font-bold">
                {t("employee.dashboard.year")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
