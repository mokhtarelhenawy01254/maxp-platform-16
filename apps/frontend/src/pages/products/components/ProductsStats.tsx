import React from "react";
import { useTranslation } from "react-i18next";
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

  const total = totalItems || products.length;
  const publishedRatio = total > 0 ? Math.round((publishedCount / total) * 100) : 0;

  const stats = [
    {
      type: "all" as StatFilterType,
      label: isEn ? "Total Products" : "إجمالي المنتجات",
      value: total,
      meta: isEn ? "Full catalog" : "كامل الكتالوج",
      dotClass: "bg-zinc-400 dark:bg-zinc-500 ring-zinc-400/20",
      isActive: activeStockFilter === "all" && activeStatusFilter === "all",
    },
    {
      type: "published" as StatFilterType,
      label: isEn ? "Published" : "منتجات منشورة",
      value: publishedCount,
      meta: `${publishedRatio}% ${isEn ? "active" : "نشط"}`,
      dotClass: "bg-emerald-500 ring-emerald-500/20",
      isActive: activeStatusFilter === "published",
    },
    {
      type: "low-stock" as StatFilterType,
      label: isEn ? "Low Stock" : "مخزون منخفض",
      value: lowStockCount,
      meta: isEn ? "Requires attention" : "يتطلب انتباه",
      dotClass: lowStockCount > 0 ? "bg-amber-500 ring-amber-500/20 animate-pulse" : "bg-amber-500/60 ring-amber-500/10",
      isActive: activeStockFilter === "low-stock",
    },
    {
      type: "out-of-stock" as StatFilterType,
      label: isEn ? "Out of Stock" : "نفد المخزون",
      value: outOfStockCount,
      meta: isEn ? "Depleted inventory" : "مخزون منتهي",
      dotClass: outOfStockCount > 0 ? "bg-rose-500 ring-rose-500/20 animate-pulse" : "bg-rose-500/60 ring-rose-500/10",
      isActive: activeStockFilter === "out-of-stock",
    },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-zinc-200/60 dark:divide-zinc-800/60 grid grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <button
          key={stat.type}
          type="button"
          onClick={() => onStatClick?.(stat.type)}
          className={`relative p-3.5 sm:p-4 text-start transition-all duration-150 active:scale-[0.99] group ${
            stat.isActive
              ? "bg-zinc-100/70 dark:bg-zinc-800/60"
              : "hover:bg-zinc-50/80 dark:hover:bg-zinc-850/40"
          }`}
          title={isEn ? `Filter by: ${stat.label}` : `تصفية حسب: ${stat.label}`}
        >
          {/* Header row: micro-label + status LED dot */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
              {stat.label}
            </span>
            <span
              className={`h-2 w-2 rounded-full ring-4 shrink-0 transition-transform group-hover:scale-125 ${stat.dotClass}`}
            />
          </div>

          {/* Metric Value */}
          <div className="mt-2.5 flex items-baseline justify-between gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
              {stat.value}
            </span>
            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate">
              {stat.meta}
            </span>
          </div>

          {/* Active bottom hairline indicator */}
          {stat.isActive && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-zinc-900 dark:bg-zinc-100" />
          )}
        </button>
      ))}
    </div>
  );
};

export default ProductsStats;
