import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

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
      <div className="mt-2.5 mb-24 rounded-xl border border-border/70 bg-card/95 p-2 shadow-xs backdrop-blur-md lg:hidden relative z-20">
        {isJumping ? (
          <form onSubmit={handleJumpSubmit} className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsJumping(false)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border/70 bg-background px-3 text-xs font-semibold text-foreground transition active:scale-[0.97]"
            >
              {t("common.cancel", { defaultValue: "إلغاء" })}
            </button>
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <span>{t("orders.pageLabel", { defaultValue: "صفحة" })}</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                autoFocus
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                className="h-9 w-16 rounded-lg border border-primary bg-background px-1 text-center text-sm font-bold font-mono tabular-nums text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-muted-foreground font-mono tabular-nums">
                / {Math.max(totalPages, 1)}
              </span>
            </div>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 active:scale-[0.97]"
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
              className="inline-flex h-9 min-w-[70px] items-center justify-center gap-1 rounded-lg border border-border/70 bg-background px-2.5 text-xs font-semibold text-foreground shadow-2xs transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35"
            >
              <ChevronRight className="h-3.5 w-3.5 rtl:rotate-0 ltr:rotate-180" />
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
                className="flex flex-col items-center justify-center rounded-lg px-2 py-0.5 transition hover:bg-muted/60 active:scale-[0.97]"
              >
                <div className="flex items-center gap-1 text-xs font-bold font-mono tabular-nums text-foreground">
                  <span>{page}</span>
                  <span className="text-muted-foreground">/</span>
                  <span>{Math.max(totalPages, 1)}</span>
                </div>
                <div className="text-[10px] font-medium text-muted-foreground font-mono tabular-nums">
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
                className="h-9 appearance-none rounded-lg border border-border/70 bg-background pr-2.5 pl-6 text-xs font-semibold font-mono tabular-nums text-foreground shadow-2xs focus:border-primary focus:outline-hidden"
              >
                {LIMIT_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value} / ص
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>

            {/* Next Button (Left in RTL, primary action!) */}
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label={String(t("orders.next"))}
              className="inline-flex h-9 min-w-[70px] items-center justify-center gap-1 rounded-lg bg-primary px-2.5 text-xs font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35"
            >
              <span>{t("orders.next")}</span>
              <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-0 ltr:rotate-180" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card/90 px-3 py-2.5 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 lg:px-4 relative z-20">
      <div className="flex items-center gap-4">
        <div className="text-xs sm:text-sm text-muted-foreground font-mono tabular-nums">
          {t("orders.showing")} {(page - 1) * limit + 1} {t("orders.to")}{" "}
          {Math.min(page * limit, totalOrders)} {t("orders.of")}{" "}
          {totalOrders} {t("orders.orders2")}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs sm:text-sm text-muted-foreground">
            {t("orders.show")}
          </label>
          <select
            aria-label={String(t("orders.ordersPerPage"))}
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value))}
            className="theme-native-control px-2.5 py-1.5 border border-border/70 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background text-foreground text-xs sm:text-sm font-mono tabular-nums transition-colors"
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
          className="flex items-center gap-0.5 rounded-lg border border-border/70 bg-muted/20 p-0.5"
        >
          <button
            type="button"
            onClick={() => onDensityChange("compact")}
            aria-pressed={density === "compact"}
            title={t("orders.compactDensity")}
            className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
              density === "compact"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {t("orders.compactDensity")}
          </button>
          <button
            type="button"
            onClick={() => onDensityChange("comfortable")}
            aria-pressed={density === "comfortable"}
            title={t("orders.comfortableDensity")}
            className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
              density === "comfortable"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {t("orders.comfortableDensity")}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 sm:p-2 border border-border/70 bg-background rounded-lg hover:bg-muted disabled:opacity-35 disabled:cursor-not-allowed transition-colors text-foreground"
        >
          <ChevronRight className="w-4 h-4" />
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
                className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-xs sm:text-sm font-semibold font-mono tabular-nums transition-colors ${
                  page === p
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
          className="p-1.5 sm:p-2 border border-border/70 bg-background rounded-lg hover:bg-muted disabled:opacity-35 disabled:cursor-not-allowed transition-colors text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default OrdersPagination;
