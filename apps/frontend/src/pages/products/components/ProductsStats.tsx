import React from "react";
import {
  PhotoIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { Product, getStockStatus } from "./ProductsTypes";
import { PRODUCT_WORKFLOW_STATUSES } from "../utils/workflow";

interface ProductsStatsProps {
  products: Product[];
  totalItems: number;
  publishedCount?: number;
}

const ProductsStats: React.FC<ProductsStatsProps> = ({
  products,
  totalItems,
  publishedCount: apiPublishedCount,
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

  const cards = [
    {
      label: "إجمالي المنتجات",
      value: totalItems || products.length,
      icon: PhotoIcon,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      valueClass: "text-gray-900 dark:text-gray-100",
    },
    {
      label: "منتجات منشورة",
      value: publishedCount,
      icon: CheckCircleIcon,
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      valueClass: "text-gray-900 dark:text-gray-100",
    },
    {
      label: "مخزون منخفض",
      value: lowStockCount,
      icon: ExclamationTriangleIcon,
      iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      valueClass: "text-gray-900 dark:text-gray-100",
    },
    {
      label: "نفد المخزون",
      value: outOfStockCount,
      icon: XCircleIcon,
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      valueClass: "text-gray-900 dark:text-gray-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-slide-up">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-md border border-gray-100 dark:border-gray-700/50 p-5 hover:shadow-lg transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center">
            <div className={`p-3 ${card.iconBg} rounded-xl`}>
              <card.icon className={`h-6 w-6 ${card.iconColor}`} />
            </div>
            <div className="mr-4">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {card.label}
              </p>
              <p className={`text-2xl font-black ${card.valueClass}`}>
                {card.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductsStats;
