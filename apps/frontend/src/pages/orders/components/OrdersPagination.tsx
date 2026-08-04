import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface OrdersPaginationProps {
  variant: "desktop" | "mobile";
  page: number;
  totalPages: number;
  totalOrders: number;
  limit: number;
  density: "comfortable" | "compact";
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onDensityChange: (density: "comfortable" | "compact") => void;
}

const LIMIT_OPTIONS = [10, 20, 50, 100, 200];

export const OrdersPagination: React.FC<OrdersPaginationProps> = ({
  variant,
  page,
  totalPages,
  totalOrders,
  limit,
  density,
  onPageChange,
  onLimitChange,
  onDensityChange,
}) => {
  const { t } = useTranslation();

  if (variant === "mobile") {
    return (
      <div className="rounded-[26px] border border-slate-200/70 bg-white/88 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/72 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("orders.currentPage")}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
              {page} / {Math.max(totalPages, 1)}
            </p>
          </div>
          <div className="text-left">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("orders.currentlyShown")}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
              {Math.min(page * limit, totalOrders)} / {totalOrders}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {t("orders.previous")}
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {t("orders.next")}
          </button>
          <select
            aria-label={String(t("orders.ordersPerPage"))}
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value))}
            className="theme-native-control w-full rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700/80 dark:bg-slate-800/85 dark:text-slate-100 w-auto min-w-[88px] px-3"
          >
            {LIMIT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              onDensityChange(density === "compact" ? "comfortable" : "compact")
            }
            aria-pressed={density === "compact"}
            title={
              density === "compact"
                ? t("orders.comfortableDensity")
                : t("orders.compactDensity")
            }
            className={`inline-flex min-h-[44px] items-center justify-center rounded-2xl border px-3 py-2 text-xs font-semibold transition ${density === "compact"
              ? "border-blue-500 bg-blue-600 text-white"
              : "border-slate-200/80 bg-white/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
          >
            {density === "compact"
              ? t("orders.compactDensity")
              : t("orders.comfortableDensity")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 px-3 py-2.5 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 lg:px-4">
      <div className="flex items-center gap-4">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {t("orders.showing")} {(page - 1) * limit + 1} {t("orders.to")}{" "}
          {Math.min(page * limit, totalOrders)} {t("orders.of")}{" "}
          {totalOrders} {t("orders.orders2")}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 dark:text-slate-400">
            {t("orders.show")}
          </label>
          <select
            aria-label={String(t("orders.ordersPerPage"))}
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value))}
            className="theme-native-control px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 dark:text-slate-100 text-sm transition-colors"
          >
            {LIMIT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div
          role="group"
          aria-label={String(t("orders.tableDensity"))}
          className="flex items-center gap-0.5 rounded-lg border border-slate-300 dark:border-slate-600 p-0.5"
        >
          <button
            type="button"
            onClick={() => onDensityChange("compact")}
            aria-pressed={density === "compact"}
            title={t("orders.compactDensity")}
            className={`rounded-md px-2 py-1 text-xs font-semibold transition ${density === "compact"
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
          >
            {t("orders.compactDensity")}
          </button>
          <button
            type="button"
            onClick={() => onDensityChange("comfortable")}
            aria-pressed={density === "comfortable"}
            title={t("orders.comfortableDensity")}
            className={`rounded-md px-2 py-1 text-xs font-semibold transition ${density === "comfortable"
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
          >
            {t("orders.comfortableDensity")}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-700 dark:text-slate-300"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let p = i + 1;
            if (totalPages > 5 && page > 3) {
              p = page - 2 + i;
            }
            if (p > totalPages) return null;

            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${page === p
                  ? "bg-blue-600 dark:bg-blue-500 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-700 dark:text-slate-300"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default OrdersPagination;
