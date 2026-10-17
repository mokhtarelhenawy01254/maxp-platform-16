import React from "react";
import { useTranslation } from "react-i18next";
import { ShoppingCart, Clock, AlertTriangle, DollarSign } from "lucide-react";
import { useCurrency } from "../../../hooks/useCurrency";
import type { IncompleteStats } from "../incompleteUtils";

interface IncompleteOrdersStatsBarProps {
  stats: IncompleteStats | {
    total: number;
    active: number;
    lost: number;
    totalValue: number;
    activeValue: number;
    lostValue: number;
  };
  statsAreServer: boolean;
}

export const IncompleteOrdersStatsBar: React.FC<IncompleteOrdersStatsBarProps> = ({
  stats,
  statsAreServer,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  const statCards = [
    {
      label: t("orders.total"),
      value: stats.total,
      icon: ShoppingCart,
      color: "text-blue-500",
      dotBg: "bg-blue-500",
      sub: statsAreServer ? undefined : t("orders.incompletePageStats"),
    },
    {
      label: t("orders.incompleteStatusActive"),
      value: stats.active,
      icon: Clock,
      color: "text-amber-500",
      dotBg: "bg-amber-500",
      sub: statsAreServer
        ? formatPrice(stats.activeValue)
        : `${formatPrice(stats.activeValue)} · ${t("orders.incompletePageStats")}`,
    },
    {
      label: t("orders.incompleteStatusLost"),
      value: stats.lost,
      icon: AlertTriangle,
      color: "text-rose-500",
      dotBg: "bg-rose-500",
      sub: statsAreServer
        ? formatPrice(stats.lostValue)
        : `${formatPrice(stats.lostValue)} · ${t("orders.incompletePageStats")}`,
    },
    {
      label: t("orders.totalValue"),
      value: formatPrice(stats.totalValue),
      icon: DollarSign,
      color: "text-emerald-500",
      dotBg: "bg-emerald-500",
    },
  ];

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden">
      <div className="grid grid-cols-2 divide-y divide-border/50 sm:grid-cols-4 sm:divide-y-0 sm:divide-x sm:divide-x-reverse rtl:sm:divide-x-reverse">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="p-3 sm:p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${card.color}`} />
                  <span>{card.label}</span>
                </div>
                <span className={`h-1.5 w-1.5 rounded-full ${card.dotBg}`} />
              </div>
              <div className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                {typeof card.value === "number"
                  ? card.value.toLocaleString()
                  : card.value}
              </div>
              {card.sub && (
                <div className="text-[11px] text-muted-foreground mt-1 truncate font-mono tabular-nums">
                  {card.sub}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IncompleteOrdersStatsBar;
