import React from "react";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import {
  getStatusBadgeClasses,
  getStatusLabel,
  getRelativeTime,
  formatDateTimeCompact,
} from "../incompleteUtils";

interface IncompleteKpisGridProps {
  status: string;
  itemsCount: number;
  total: number;
  lastActivity: string;
  formatPrice: (price: number) => string;
  formatDate: (date: string) => string;
  lang: string;
}

export const IncompleteKpisGrid: React.FC<IncompleteKpisGridProps> = ({
  status,
  itemsCount,
  total,
  lastActivity,
  formatPrice,
  formatDate,
  lang,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Status Card */}
      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
        <div className="text-[11px] font-medium text-muted-foreground">
          {t("orders.orderStatus") || "حالة الطلب"}
        </div>
        <div className="mt-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClasses(status)}`}
          >
            {getStatusLabel(status, t)}
          </span>
        </div>
      </div>

      {/* Items Count */}
      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
        <div className="text-[11px] font-medium text-muted-foreground">
          {t("orders.itemsCount") || "عدد المنتجات"}
        </div>
        <div className="mt-2 text-base sm:text-lg font-bold font-mono tabular-nums text-foreground">
          {itemsCount}
        </div>
      </div>

      {/* Amount */}
      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
        <div className="text-[11px] font-medium text-muted-foreground">
          {t("orders.amount") || "إجمالي المبلغ"}
        </div>
        <div className="mt-2 text-base sm:text-lg font-bold font-mono tabular-nums text-foreground">
          {formatPrice(total || 0)}
        </div>
      </div>

      {/* Last Activity */}
      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
        <div className="text-[11px] font-medium text-muted-foreground">
          {t("orders.incompleteLastActivity") || "آخر نشاط"}
        </div>
        <div className="mt-2 text-xs font-mono tabular-nums font-semibold text-foreground">
          {lastActivity ? formatDate(lastActivity) : t("orders.notSpecified") || "غير محدد"}
        </div>
        {lastActivity && (
          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
            {getRelativeTime(lastActivity, t) || formatDateTimeCompact(lastActivity, lang)}
          </div>
        )}
      </div>
    </div>
  );
};
