import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { UserCheck, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../components/ui/avatar";
import { DashboardEmployee } from "./types";

interface RecentHiresCardProps {
  recentHires?: DashboardEmployee[];
}

export const RecentHiresCard: React.FC<RecentHiresCardProps> = ({
  recentHires = [],
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-3.5 bg-muted/20">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-foreground">
          <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
            <UserCheck className="h-4 w-4" />
          </div>
          {t("hrDashboard.recentHires")}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground text-xs gap-1.5"
          onClick={() => navigate("/hr/employees")}
        >
          {t("hrDashboard.viewAll")}
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Button>
      </CardHeader>
      <CardContent className="p-5">
        {recentHires.length === 0 ? (
          <p className="text-xs text-center text-muted-foreground py-8">
            لا توجد تعيينات حديثة مسجلة
          </p>
        ) : (
          <div className="space-y-2.5">
            {recentHires.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center justify-between p-3 bg-muted/20 border border-border/60 rounded-xl hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={employee.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {employee.firstName?.[0]}
                      {employee.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {employee.firstName} {employee.lastName}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {typeof employee.position === "object"
                        ? employee.position?.title
                        : (employee.position || "موظف جديد")}
                    </p>
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <span className="text-[11px] font-medium text-muted-foreground font-mono tabular-nums">
                    {employee.hireDate
                      ? new Date(employee.hireDate).toLocaleDateString("ar-EG")
                      : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
