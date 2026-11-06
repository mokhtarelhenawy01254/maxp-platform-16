import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Users, Clock } from "lucide-react";
import { Button } from "../../../components/ui/button";

export const HRDashboardHero: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/70">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          {t("hrDashboard.pageTitle")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          {t("hrDashboard.overview")}
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/hr/employees")}
          className="gap-2 text-xs font-semibold"
        >
          <Users className="h-4 w-4" />
          {t("hrDashboard.manageEmployees")}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => navigate("/hr/attendance")}
          className="gap-2 text-xs font-semibold shadow-xs"
        >
          <Clock className="h-4 w-4" />
          {t("hrDashboard.attendance")}
        </Button>
      </div>
    </div>
  );
};
