import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Clock, UserCheck, UserX, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../components/ui/avatar";
import { Progress } from "../../../components/ui/progress";
import { AttendanceRecord, DashboardData } from "./types";

interface AttendanceOverviewCardProps {
  data: DashboardData | null;
  attendanceRate: number;
}

export const AttendanceOverviewCard: React.FC<AttendanceOverviewCardProps> = ({
  data,
  attendanceRate,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card className="lg:col-span-2 rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-3.5 bg-muted/20">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-foreground">
          <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
            <Clock className="h-4 w-4" />
          </div>
          {t("hrDashboard.todaysAttendanceTitle")}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground text-xs gap-1.5"
          onClick={() => navigate("/hr/attendance")}
        >
          {t("hrDashboard.viewAll")}
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Button>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
          <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl text-center">
            <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center mx-auto mb-2 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-foreground mb-0.5 leading-none font-mono tabular-nums">
              {data?.attendance.present || 0}
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              {t("hrDashboard.present")}
            </p>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl text-center">
            <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center mx-auto mb-2 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-foreground mb-0.5 leading-none font-mono tabular-nums">
              {data?.attendance.late || 0}
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              {t("hrDashboard.late")}
            </p>
          </div>

          <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-xl text-center">
            <div className="w-9 h-9 bg-rose-500/10 rounded-lg flex items-center justify-center mx-auto mb-2 text-rose-600 dark:text-rose-400">
              <UserX className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-foreground mb-0.5 leading-none font-mono tabular-nums">
              {data?.attendance.absent || 0}
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              {t("hrDashboard.absent")}
            </p>
          </div>
        </div>

        <div className="space-y-2.5 bg-muted/30 p-4 rounded-xl border border-border/60">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {t("hrDashboard.attendanceRate")}
            </span>
            <span className="text-primary font-mono tabular-nums">
              {attendanceRate}%
            </span>
          </div>
          <Progress
            value={attendanceRate}
            className="h-2 rounded-full"
          />
        </div>

        {/* Recent Check-ins */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-foreground">
              {t("hrDashboard.recentCheckins")}
            </h4>
            <div className="h-px flex-1 bg-border/60 mx-3" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {data?.attendance.records
              ?.slice(0, 6)
              .map((record: AttendanceRecord, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-card border border-border/70 rounded-xl hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={record.employee?.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {record.employee?.firstName?.[0]}
                          {record.employee?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-card ${
                          record.checkIn ? "bg-emerald-500" : "bg-muted-foreground"
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {record.employee?.firstName} {record.employee?.lastName}
                      </p>
                      <p className="text-[11px] font-medium text-muted-foreground truncate">
                        {record.employee?.department?.name || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <Badge
                      variant="outline"
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold font-mono tabular-nums ${
                        record.status === "PRESENT"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                          : record.status === "LATE"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {record.checkIn
                        ? new Date(record.checkIn).toLocaleTimeString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "-"}
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
