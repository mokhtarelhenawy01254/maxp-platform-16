import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { TrendingUp, ChevronRight, UserPlus, Users, CalendarCheck, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

interface RecruitmentOverviewCardProps {
  recruitment?: {
    activeJobs: number;
    totalApplicants: number;
    scheduledInterviews: number;
    pendingReviews: number;
    hiredThisMonth: number;
  };
}

export const RecruitmentOverviewCard: React.FC<RecruitmentOverviewCardProps> = ({
  recruitment,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const metrics = [
    {
      label: t("hrDashboard.activeJobs"),
      value: recruitment?.activeJobs || 0,
      icon: UserPlus,
    },
    {
      label: t("hrDashboard.totalApplicants"),
      value: recruitment?.totalApplicants || 0,
      icon: Users,
    },
    {
      label: t("hrDashboard.interviews"),
      value: recruitment?.scheduledInterviews || 0,
      icon: CalendarCheck,
    },
    {
      label: t("hrDashboard.hiredThisMonth"),
      value: recruitment?.hiredThisMonth || 0,
      icon: CheckCircle2,
    },
  ];

  return (
    <Card className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-3.5 bg-muted/20">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-foreground">
          <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
            <TrendingUp className="h-4 w-4" />
          </div>
          {t("hrDashboard.recruitmentOverview")}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground text-xs gap-1.5"
          onClick={() => navigate("/hr/recruitment")}
        >
          <span className="hidden sm:inline">
            {t("hrDashboard.manageRecruitment")}
          </span>
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Button>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {metrics.map((metric, idx) => (
            <div
              key={idx}
              className="p-4 bg-muted/30 border border-border/60 rounded-xl flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate mb-1">
                  {metric.label}
                </p>
                <p className="text-2xl font-bold text-foreground font-mono tabular-nums tracking-tight">
                  {metric.value}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted text-muted-foreground shrink-0">
                <metric.icon className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
