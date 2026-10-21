import React from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { StockAlert } from "./types";

interface InventoryStockAlertsBannerProps {
  alerts: StockAlert[];
}

export const InventoryStockAlertsBanner: React.FC<InventoryStockAlertsBannerProps> = ({
  alerts,
}) => {
  if (alerts.length === 0) return null;

  const getAlertPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900/60";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60";
    }
  };

  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center">
        <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 mr-2" />
        تنبيهات المخزون ({alerts.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {alerts.slice(0, 6).map((alert) => (
          <div
            key={alert.id}
            className={`border rounded-xl p-3.5 shadow-2xs ${getAlertPriorityColor(alert.priority)}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-sm dark:text-gray-100">
                  {alert.productName}
                </h3>
                <p className="text-xs mt-1 dark:text-gray-300">
                  {alert.message}
                </p>
                <p className="text-xs mt-2 dark:text-gray-400 tabular-nums font-mono">
                  المخزون الحالي: {alert.currentStock} | نقطة الطلب: {alert.reorderPoint}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/60 dark:bg-black/30">
                {alert.priority === "critical"
                  ? "حرج"
                  : alert.priority === "high"
                  ? "عالي"
                  : alert.priority === "medium"
                  ? "متوسط"
                  : "منخفض"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
