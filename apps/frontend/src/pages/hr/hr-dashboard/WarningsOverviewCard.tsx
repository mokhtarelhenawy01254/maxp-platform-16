import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Progress } from "../../../components/ui/progress";
import { WarningSeveritySummary } from "./types";

interface WarningsOverviewCardProps {
  warnings?: {
    total: number;
    bySeverity: WarningSeveritySummary[];
    acknowledged: number;
  };
}

export const WarningsOverviewCard: React.FC<WarningsOverviewCardProps> = ({
  warnings,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const total = warnings?.total || 0;
  const acknowledged = warnings?.acknowledged || 0;
  const acknowledgmentRate = total > 0 ? Math.round((acknowledged / total) * 100) : 0;

  return (
    <Card className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-3.5 bg-muted/20">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-foreground">
          <div className="p-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg">
            <AlertCircle className="h-4 w-4" />
          </div>
          {t("hrDashboard.warnings")}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground text-xs gap-1.5"
          onClick={() => navigate("/hr/warnings")}
        >
          <span className="hidden sm:inline">{t("hrDashboard.viewAll")}</span>
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Button>
      </CardHeader>
      <CardContent className="p-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <p className="text-2xl font-bold text-foreground font-mono tabular-nums">
              {total}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("hrDashboard.totalWarnings") || "إجمالي الإنذارات"}
            </p>
          </div>
          <div className="text-end">
            <Badge
              variant="outline"
              className="font-mono tabular-nums text-xs border-border/70"
            >
              {acknowledgmentRate}% {t("hrDashboard.acknowledged") || "تم الاستلام"}
            </Badge>
          </div>
        </div>

        <div className="space-y-1.5 mb-5">
          <Progress value={acknowledgmentRate} className="h-2 rounded-full" />
        </div>

        {warnings?.bySeverity && warnings.bySeverity.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60">
            {warnings.bySeverity.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-muted/30 border border-border/60 rounded-xl text-center"
              >
                <p className="text-[11px] font-medium text-muted-foreground truncate mb-0.5">
                  {item.severity === "HIGH"
                    ? "شديد"
                    : item.severity === "MEDIUM"
                      ? "متوسط"
                      : "بسيط"}
                </p>
                <p className="text-sm font-bold text-foreground font-mono tabular-nums">
                  {item._count}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-center text-muted-foreground py-2">
            لا توجد إنذارات نشطة
          </p>
        )}
      </CardContent>
    </Card>
  );
};
