import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Clock, ChevronRight } from "lucide-react";
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
import { PermissionRequest } from "./types";

interface PendingPermissionsCardProps {
  pendingPermissions?: PermissionRequest[];
  onAction: (id: string, action: "approve" | "reject") => void;
}

export const PendingPermissionsCard: React.FC<PendingPermissionsCardProps> = ({
  pendingPermissions = [],
  onAction,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-3.5 bg-muted/20">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-foreground">
          <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
            <Clock className="h-4 w-4" />
          </div>
          {t("hrDashboard.pendingPermissions")}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground text-xs gap-1.5"
          onClick={() => navigate("/hr/permissions")}
        >
          <span className="hidden sm:inline">{t("hrDashboard.viewAll")}</span>
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Button>
      </CardHeader>
      <CardContent className="p-5">
        {pendingPermissions.length === 0 ? (
          <div className="text-center py-8 flex flex-col items-center">
            <div className="w-10 h-10 bg-muted/40 rounded-xl flex items-center justify-center mb-2 text-muted-foreground">
              <Clock className="h-5 w-5" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              {t("hrDashboard.noPendingPermissions")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingPermissions.map((perm) => (
              <div
                key={perm.id}
                className="p-3.5 bg-card border border-border/70 rounded-xl hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={perm.employee?.avatar} />
                      <AvatarFallback className="bg-blue-500/10 text-blue-600 text-xs font-bold">
                        {perm.employee?.firstName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-foreground truncate">
                        {perm.employee?.firstName} {perm.employee?.lastName}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase truncate">
                        {perm.type}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-muted text-foreground text-[10px] font-bold font-mono tabular-nums shrink-0"
                  >
                    {perm.duration} {t("dashboard.minutes")}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onAction(perm.id, "approve")}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-semibold shadow-xs"
                  >
                    {t("hrDashboard.approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAction(perm.id, "reject")}
                    className="flex-1 h-8 text-xs font-semibold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
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
