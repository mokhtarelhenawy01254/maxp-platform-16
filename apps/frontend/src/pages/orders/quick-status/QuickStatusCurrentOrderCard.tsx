import React from "react";
import { useTranslation } from "react-i18next";
import { Package } from "lucide-react";

interface OrderData {
  id: string;
  orderNumber: string;
  status: string;
  customerName?: string;
  customerPhone?: string;
  total?: number;
  currency?: string;
}

interface QuickStatusCurrentOrderCardProps {
  currentOrder: OrderData;
  getStatusDisplayName: (statusValue: string) => string;
  renderStatusBadge: (status: string, label?: string) => React.ReactNode;
}

export const QuickStatusCurrentOrderCard: React.FC<QuickStatusCurrentOrderCardProps> = ({
  currentOrder,
  getStatusDisplayName,
  renderStatusBadge,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-card rounded-2xl border border-border/70 border-r-4 border-r-primary shadow-xs p-4 sm:p-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Package className="text-primary" size={20} />
          <div>
            <span className="text-base sm:text-lg font-bold text-foreground font-mono tabular-nums">
              {currentOrder.orderNumber}
            </span>
            {currentOrder.customerName && (
              <span className="text-xs text-muted-foreground mr-3">
                {currentOrder.customerName}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground mb-1">
              {t("quickStatus.currentStatus")}
            </p>
            {renderStatusBadge(currentOrder.status, getStatusDisplayName(currentOrder.status))}
          </div>
          {currentOrder.total != null && (
            <div className="text-center">
              <p className="text-[11px] text-muted-foreground mb-1">
                {t("quickStatus.total")}
              </p>
              <span className="text-sm font-bold font-mono tabular-nums text-foreground">
                {Number(currentOrder.total).toFixed(2)} {currentOrder.currency || "ج.م"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
