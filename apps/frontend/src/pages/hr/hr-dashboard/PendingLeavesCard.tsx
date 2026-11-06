import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, ChevronRight } from "lucide-react";
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
import { LeaveRequest } from "./types";

interface PendingLeavesCardProps {
  pendingLeaves?: LeaveRequest[];
  onAction: (id: string, action: "approve" | "reject") => void;
}

export const PendingLeavesCard: React.FC<PendingLeavesCardProps> = ({
  pendingLeaves = [],
  onAction,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-3.5 bg-muted/20">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-foreground">
          <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400">
            <Calendar className="h-4 w-4" />
          </div>
          {t("hrDashboard.leavesRequests")}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground text-xs gap-1.5"
          onClick={() => navigate("/hr/leaves")}
        >
          {t("hrDashboard.viewAll")}
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Button>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        {pendingLeaves.length === 0 ? (
          <div className="text-center py-10 flex flex-col items-center">
            <div className="w-12 h-12 bg-muted/40 rounded-xl flex items-center justify-center mb-3">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              {t("hrDashboard.noPendingRequests")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingLeaves.map((leave) => (
              <div
                key={leave.id}
                className="p-3.5 bg-card border border-border/70 rounded-xl hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={leave.employee?.avatar} />
                    <AvatarFallback className="bg-amber-500/10 text-amber-600 text-xs font-bold uppercase">
                      {leave.employee?.firstName?.[0]}
                      {leave.employee?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {leave.employee?.firstName} {leave.employee?.lastName}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground truncate">
                      {leave.employee?.department?.name || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-medium gap-2 mb-3">
                  <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/50">
                    <span className="text-foreground text-[11px]">
                      {leave.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-lg font-mono tabular-nums text-[11px] font-bold">
                    <Clock className="h-3 w-3" />
                    <span>
                      {leave.totalDays} {t("common.days") || "أيام"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onAction(leave.id, "approve")}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8 shadow-xs"
                  >
                    {t("hrDashboard.approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAction(leave.id, "reject")}
                    className="flex-1 text-xs font-semibold h-8 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  >
                    {t("hrDashboard.reject")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
