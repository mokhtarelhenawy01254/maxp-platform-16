import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { DollarSign, ChevronRight } from "lucide-react";
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
import { AdvanceRequest } from "./types";

interface PendingAdvancesCardProps {
  pendingAdvances?: AdvanceRequest[];
  onAction: (id: string, action: "approve" | "reject") => void;
}

export const PendingAdvancesCard: React.FC<PendingAdvancesCardProps> = ({
  pendingAdvances = [],
  onAction,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-3.5 bg-muted/20">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-foreground">
          <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <DollarSign className="h-4 w-4" />
          </div>
          {t("hrDashboard.pendingAdvances")}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground text-xs gap-1.5"
          onClick={() => navigate("/hr/advances")}
        >
          <span className="hidden sm:inline">{t("hrDashboard.viewAll")}</span>
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Button>
      </CardHeader>
      <CardContent className="p-5">
        {pendingAdvances.length === 0 ? (
          <div className="text-center py-8 flex flex-col items-center">
            <div className="w-10 h-10 bg-muted/40 rounded-xl flex items-center justify-center mb-2 text-muted-foreground">
              <DollarSign className="h-5 w-5" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              {t("hrDashboard.noPendingAdvances")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingAdvances.map((adv) => (
              <div
                key={adv.id}
                className="p-3.5 bg-card border border-border/70 rounded-xl hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={adv.employee?.avatar} />
                      <AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-xs font-bold">
                        {adv.employee?.firstName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-foreground truncate">
                        {adv.employee?.firstName} {adv.employee?.lastName}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono tabular-nums truncate">
                        {new Date(adv.createdAt).toLocaleDateString(
                          i18n.language === "ar" ? "ar-EG" : "en-US",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-start shrink-0">
                    <p className="text-sm font-bold text-foreground font-mono tabular-nums">
                      {adv.amount?.toLocaleString()}{" "}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {t("common.currency") || "ج.م"}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onAction(adv.id, "approve")}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-semibold shadow-xs"
                  >
                    {t("hrDashboard.approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAction(adv.id, "reject")}
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
