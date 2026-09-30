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
  const [isJumping, setIsJumping] = React.useState(false);
  const [jumpPageInput, setJumpPageInput] = React.useState("");

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpPageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      onPageChange(target);
      setIsJumping(false);
      setJumpPageInput("");
    }
  };

  if (variant === "mobile") {
    return (
      <div className="mt-2.5 mb-24 rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-xs backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 lg:hidden relative z-20">
        {isJumping ? (
          <form onSubmit={handleJumpSubmit} className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsJumping(false)}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white px-3 text-xs font-bold text-slate-600 transition active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {t("common.cancel", { defaultValue: "إلغاء" })}
            </button>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              <span>{t("orders.pageLabel", { defaultValue: "صفحة" })}</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                autoFocus
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                className="h-9 w-16 rounded-xl border border-blue-500 bg-white px-1 text-center text-sm font-bold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-800 dark:text-white"
              />
              <span className="text-slate-400 dark:text-slate-500 font-mono">
                / {Math.max(totalPages, 1)}
              </span>
            </div>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {t("common.go", { defaultValue: "انتقال" })}
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-1.5">
            {/* Previous Button (Right in RTL) */}
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label={String(t("orders.previous"))}
              className="inline-flex h-9 min-w-[70px] items-center justify-center gap-1 rounded-xl border border-slate-200/80 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs transition active:scale-95 disabled:pointer-events-none disabled:opacity-35 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <ChevronRightIcon className="h-3.5 w-3.5 rtl:rotate-0 ltr:rotate-180" />
              <span>{t("orders.previous")}</span>
            </button>

            {/* Center: Interactive Page Capsule / Direct Jump Trigger */}
            <div className="flex min-w-0 flex-1 items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setIsJumping(true);
                  setJumpPageInput(String(page));
                }}
                title={t("orders.jumpToPage", { defaultValue: "انقر للانتقال السريع لصفحة" })}
                className="flex flex-col items-center justify-center rounded-lg px-2 py-0.5 transition hover:bg-slate-100/80 active:scale-95 dark:hover:bg-slate-800/60"
              >
                <div className="flex items-center gap-1 text-xs font-black font-mono tabular-nums text-slate-800 dark:text-slate-100">
                  <span>{page}</span>
                  <span className="text-slate-400 dark:text-slate-500">/</span>
                  <span>{Math.max(totalPages, 1)}</span>
                </div>
                <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                  {totalOrders.toLocaleString()} {t("orders.ordersCountLabel", { defaultValue: "طلب" })}
                </div>
              </button>
            </div>

            {/* Items Per Page Selector */}
            <div className="relative shrink-0">
              <select
                aria-label={String(t("orders.ordersPerPage"))}
                value={limit}
                onChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
                className="h-9 appearance-none rounded-xl border border-slate-200/80 bg-white pr-2.5 pl-5 text-xs font-semibold tabular-nums text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {LIMIT_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value} / ص
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                ▾
              </span>
            </div>

            {/* Next Button (Left in RTL, primary action!) */}
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label={String(t("orders.next"))}
              className="inline-flex h-9 min-w-[70px] items-center justify-center gap-1 rounded-xl bg-blue-600 px-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95 disabled:pointer-events-none disabled:opacity-35 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <span>{t("orders.next")}</span>
              <ChevronLeftIcon className="h-3.5 w-3.5 rtl:rotate-0 ltr:rotate-180" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 px-3 py-2.5 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 lg:px-4 relative z-20">
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
