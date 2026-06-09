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
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-900/20",
      borderColor: "border-red-200 dark:border-red-800",
      onClick: () => navigate("/orders?isViewed=false"),
      highlight: hasNewOrders,
    },
    {
      label: t("companyDashboard.orderStats.viewedOrders"),
      value: formatCount(viewedOrders),
      icon: EyeIcon,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      borderColor: "border-emerald-200 dark:border-emerald-800",
      onClick: () => navigate("/orders"),
    },
    {
      label: t("companyDashboard.orderStats.totalOrders"),
      value: formatCount(totalOrders),
      icon: ClipboardDocumentListIcon,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
      borderColor: "border-indigo-200 dark:border-indigo-800",
      onClick: () => navigate("/orders"),
    },
  ];

  return (
    <DashboardSurfaceCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {t("companyDashboard.orderStats.title")}
        </h3>
        {hasNewOrders && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
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
              item.highlight ? "ring-2 ring-red-300 dark:ring-red-700" : "",
            )}
          >
            <div className={cn("p-2 rounded-full mb-2", item.bgColor)}>
              <item.icon className={cn("w-6 h-6", item.color)} />
            </div>
            <span className={cn("text-xl font-bold", item.color)}>
              {item.value}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 text-center leading-tight">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </DashboardSurfaceCard>
  );
}
