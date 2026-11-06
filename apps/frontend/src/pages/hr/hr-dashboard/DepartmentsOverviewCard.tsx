import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { DepartmentOverview } from "./types";

interface DepartmentsOverviewCardProps {
  departments?: DepartmentOverview[];
}

export const DepartmentsOverviewCard: React.FC<DepartmentsOverviewCardProps> = ({
  departments = [],
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-3.5 bg-muted/20">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-foreground">
          <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
            <Building2 className="h-4 w-4" />
          </div>
          {t("hrDashboard.departments")}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground text-xs gap-1.5"
          onClick={() => navigate("/hr/departments")}
        >
          {t("hrDashboard.viewAll")}
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Button>
      </CardHeader>
      <CardContent className="p-5">
        {departments.length === 0 ? (
          <p className="text-xs text-center text-muted-foreground py-8">
            لا توجد أقسام مسجلة
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="p-3.5 bg-muted/20 border border-border/60 rounded-xl hover:bg-muted/40 transition-colors flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: dept.color || "#64748b" }}
                  />
                  <p className="text-xs font-bold text-foreground truncate">
                    {dept.name}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono tabular-nums shrink-0">
                  <Users className="h-3.5 w-3.5" />
                  <span>{dept.employeeCount || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
