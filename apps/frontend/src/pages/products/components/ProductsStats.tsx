import React from "react";
import { useTranslation } from "react-i18next";
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
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));

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
      label: isEn ? "Total Products" : "إجمالي المنتجات",
      value: totalItems || products.length,
      icon: PhotoIcon,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      valueClass: "text-gray-900 dark:text-gray-100",
      isActive: activeStockFilter === "all" && activeStatusFilter === "all",
    },
    {
      type: "published",
      label: isEn ? "Published Products" : "منتجات منشورة",
      value: publishedCount,
      icon: CheckCircleIcon,
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      valueClass: "text-gray-900 dark:text-gray-100",
      isActive: activeStatusFilter === "published",
    },
    {
      type: "low-stock",
      label: isEn ? "Low Stock" : "مخزون منخفض",
      value: lowStockCount,
      icon: ExclamationTriangleIcon,
      iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      valueClass: "text-gray-900 dark:text-gray-100",
      isActive: activeStockFilter === "low-stock",
    },
    {
      type: "out-of-stock",
      label: isEn ? "Out of Stock" : "نفد المخزون",
      value: outOfStockCount,
      icon: XCircleIcon,
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      valueClass: "text-gray-900 dark:text-gray-100",
      isActive: activeStockFilter === "out-of-stock",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {cards.map((card) => (
        <button
          key={card.type}
          type="button"
          onClick={() => onStatClick?.(card.type)}
          className={`${isEn ? "text-left" : "text-right"} group relative w-full rounded-xl border p-3 sm:p-4 transition-all duration-150 ease-out active:scale-[0.97] ${
            card.isActive
              ? "border-primary/60 bg-primary/[0.04] dark:bg-primary/[0.08] shadow-sm ring-1 ring-primary/30"
              : "border-border/60 bg-card hover:border-border hover:bg-accent/40 shadow-xs"
          }`}
          title={isEn ? `Filter by: ${card.label}` : `تصفية حسب: ${card.label}`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className={`p-2 sm:p-2.5 ${card.iconBg} rounded-lg shrink-0 transition-transform group-hover:scale-105`}>
              <card.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-muted-foreground truncate tracking-wide">
                {card.label}
              </p>
              <p className={`text-lg sm:text-2xl font-black ${card.valueClass} leading-tight mt-0.5 tabular-nums font-mono`}>
                {card.value}
              </p>
            </div>
          </div>
          {card.isActive && (
            <span className="absolute bottom-0 inset-x-4 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
};

export default ProductsStats;

