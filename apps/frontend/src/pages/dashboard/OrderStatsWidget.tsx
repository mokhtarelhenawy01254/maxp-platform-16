import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ShoppingBagIcon, EyeIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import DashboardSurfaceCard from "./DashboardSurfaceCard";
import { cn } from "../../lib/utils";

type OrderStatsWidgetProps = {
  newOrders: number | null | undefined;
  viewedOrders: number | null | undefined;
  totalOrders: number | null | undefined;
  formatCount: (value: number | null | undefined) => string;
  isRtl: boolean;
};

export default function OrderStatsWidget({
  newOrders,
  viewedOrders,
  totalOrders,
  formatCount,
  isRtl,
}: OrderStatsWidgetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const hasNewOrders = newOrders != null && newOrders > 0;

  const items = [
    {
      label: t("companyDashboard.orderStats.newOrders"),
      value: formatCount(newOrders),
      icon: ShoppingBagIcon,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      borderColor: "border-destructive/30",
      onClick: () => navigate("/orders?isViewed=false"),
      highlight: hasNewOrders,
    },
    {
      label: t("companyDashboard.orderStats.viewedOrders"),
      value: formatCount(viewedOrders),
      icon: EyeIcon,
      color: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success/30",
      onClick: () => navigate("/orders"),
    },
    {
      label: t("companyDashboard.orderStats.totalOrders"),
      value: formatCount(totalOrders),
      icon: ClipboardDocumentListIcon,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
      onClick: () => navigate("/orders"),
    },
  ];

  return (
    <DashboardSurfaceCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          {t("companyDashboard.orderStats.title")}
        </h3>
        {hasNewOrders && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-destructive-foreground bg-destructive/10 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
            {t("companyDashboard.orderStats.requiresAttention")}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md",
              item.bgColor,
              item.borderColor,
              item.highlight ? "ring-2 ring-destructive/50" : "",
            )}
          >
            <div className={cn("p-2 rounded-full mb-2", item.bgColor)}>
              <item.icon className={cn("w-6 h-6", item.color)} />
            </div>
            <span className={cn("text-xl font-bold", item.color)}>
              {item.value}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1 text-center leading-tight">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </DashboardSurfaceCard>
  );
}
