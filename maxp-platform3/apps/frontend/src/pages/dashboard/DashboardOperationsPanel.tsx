import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import type { DashboardOperationsPanelProps } from "./types";
import DashboardSurfaceCard from "./DashboardSurfaceCard";

export default function DashboardOperationsPanel({
  cancelledLabel,
  conversationsLabel,
  customersLabel,
  formatCount,
  isRtl,
  onNavigate,
  orderHealth,
  recentActivity,
  returnedLabel,
}: DashboardOperationsPanelProps) {
  const { t } = useTranslation();

  const hasOpenOrders =
    orderHealth.openOrders != null && orderHealth.openOrders > 0;

  return (
    <DashboardSurfaceCard>
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-sm font-semibold">
          {t("companyDashboard.operations.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {t("companyDashboard.operations.newActivity")}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {recentActivity.newCustomers != null
                ? `${formatCount(recentActivity.newCustomers)} ${customersLabel}`
                : null}
              {recentActivity.newCustomers != null &&
              recentActivity.newConversations != null
                ? " · "
                : null}
              {recentActivity.newConversations != null
                ? `${formatCount(recentActivity.newConversations)} ${conversationsLabel}`
                : null}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {t("companyDashboard.operations.openOrders")}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {hasOpenOrders
                ? formatCount(orderHealth.openOrders)
                : t("companyDashboard.operations.noOpenOrders")}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {t("companyDashboard.operations.cancelsAndReturns")}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {orderHealth.cancelledOrders != null
                ? `${formatCount(orderHealth.cancelledOrders)} ${cancelledLabel}`
                : null}
              {orderHealth.cancelledOrders != null &&
              orderHealth.returnedOrders != null
                ? " · "
                : null}
              {orderHealth.returnedOrders != null
                ? `${formatCount(orderHealth.returnedOrders)} ${returnedLabel}`
                : null}
            </span>
          </div>

          {hasOpenOrders && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => onNavigate("/orders")}>
              {t("companyDashboard.operations.openOrdersAction")}
            </Button>
          )}
        </div>
      </CardContent>
    </DashboardSurfaceCard>
  );
}
