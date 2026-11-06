import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Building2,
  Clock,
  Calendar,
  DollarSign,
  BarChart3,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

export const HRQuickActionsCard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const actions = [
    {
      label: t("hrDashboard.employees"),
      icon: Users,
      path: "/hr/employees",
    },
    {
      label: t("hrDashboard.rewards") || "المكافآت",
      icon: DollarSign,
      path: "/hr/rewards",
    },
    {
      label: t("hrDashboard.departments"),
      icon: Building2,
      path: "/hr/departments",
    },
    {
      label: t("hrDashboard.attendanceLabel"),
      icon: Clock,
      path: "/hr/attendance",
    },
    {
      label: t("hrDashboard.leaves"),
      icon: Calendar,
      path: "/hr/leaves",
    },
    {
      label: t("hrDashboard.payroll"),
      icon: DollarSign,
      path: "/hr/payroll",
    },
    {
      label: t("hrDashboard.reports"),
      icon: BarChart3,
      path: "/hr/reports-hub",
    },
  ];

  return (
    <Card className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
      <CardHeader className="border-b border-border/70 px-5 py-3.5 bg-muted/20">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
            <Sparkles className="h-4 w-4" />
          </div>
          {t("hrDashboard.quickActions")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {actions.map((action, i) => (
            <Button
              key={i}
              variant="outline"
              className="h-auto py-3.5 px-3 flex-col gap-2 rounded-xl border-border/70 hover:bg-muted/50 hover:border-border transition-colors group"
              onClick={() => navigate(action.path)}
            >
              <div className="p-2.5 rounded-lg bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <action.icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-foreground tracking-tight text-center truncate w-full">
                {action.label}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
