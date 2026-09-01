import React from "react";
import {
  PhotoIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { Product, getStockStatus } from "./ProductsTypes";
import { PRODUCT_WORKFLOW_STATUSES } from "../utils/workflow";

export type StatFilterType = "all" | "published" | "low-stock" | "out-of-stock";

interface ProductsStatsProps {
  products: Product[];
  totalItems: number;
  publishedCount?: number;
  activeStockFilter?: string;
  activeStatusFilter?: string;
  onStatClick?: (filterType: StatFilterType) => void;
}

const ProductsStats: React.FC<ProductsStatsProps> = ({
  products,
  totalItems,
  publishedCount: apiPublishedCount,
  activeStockFilter = "all",
  activeStatusFilter = "all",
  onStatClick,
}) => {
  const lowStockCount = products.filter(
    (p) => getStockStatus(p) === "low-stock",
  ).length;
  const outOfStockCount = products.filter(
    (p) => getStockStatus(p) === "out-of-stock",
  ).length;
  const publishedCount = apiPublishedCount ?? products.filter(
    (p) => p.workflow.status === PRODUCT_WORKFLOW_STATUSES.PUBLISHED,
  ).length;

  const cards: Array<{
    type: StatFilterType;
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
    valueClass: string;
    isActive: boolean;
  }> = [
    {
      type: "all",
      label: "إجمالي المنتجات",
      value: totalItems || products.length,
      icon: PhotoIcon,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      valueClass: "text-gray-900 dark:text-gray-100",
      isActive: activeStockFilter === "all" && activeStatusFilter === "all",
    },
    {
      type: "published",
      label: "منتجات منشورة",
      value: publishedCount,
      icon: CheckCircleIcon,
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      valueClass: "text-gray-900 dark:text-gray-100",
      isActive: activeStatusFilter === "published",
    },
    {
      type: "low-stock",
      label: "مخزون منخفض",
      value: lowStockCount,
      icon: ExclamationTriangleIcon,
      iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      valueClass: "text-gray-900 dark:text-gray-100",
      isActive: activeStockFilter === "low-stock",
    },
    {
      type: "out-of-stock",
      label: "نفد المخزون",
      value: outOfStockCount,
      icon: XCircleIcon,
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      valueClass: "text-gray-900 dark:text-gray-100",
      isActive: activeStockFilter === "out-of-stock",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5 animate-slide-up">
      {cards.map((card) => (
        <button
          key={card.label}
          type="button"
          onClick={() => onStatClick?.(card.type)}
          className={`text-right w-full backdrop-blur-sm rounded-xl border p-2.5 sm:p-4 transition-all duration-200 active:scale-[0.98] ${
            card.isActive
              ? "border-indigo-500/80 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm ring-2 ring-indigo-500/20"
              : "border-gray-200/80 dark:border-gray-700/60 bg-white/90 dark:bg-gray-800/90 hover:border-gray-300 dark:hover:border-gray-600 shadow-xs hover:shadow-sm"
          }`}
          title={`تصفية حسب: ${card.label}`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className={`p-2 sm:p-2.5 ${card.iconBg} rounded-lg sm:rounded-xl shrink-0`}>
              <card.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">
                {card.label}
              </p>
              <p className={`text-base sm:text-2xl font-black ${card.valueClass} leading-tight mt-0.5`}>
                {card.value}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default ProductsStats;

