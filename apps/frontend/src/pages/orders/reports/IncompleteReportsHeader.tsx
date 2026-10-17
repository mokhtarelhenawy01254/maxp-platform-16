import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, RotateCw, Calendar } from "lucide-react";
import { getDirection } from "../../../i18n";
import { PERIODS, toDateInput } from "./useIncompleteReportsData";

interface IncompleteReportsHeaderProps {
  period: string;
  onPeriodChange: (period: string) => void;
  customFrom: string;
  onCustomFromChange: (val: string) => void;
  customTo: string;
  onCustomToChange: (val: string) => void;
  loading: boolean;
  onRefresh: () => void;
}

export const IncompleteReportsHeader: React.FC<IncompleteReportsHeaderProps> = ({
  period,
  onPeriodChange,
  customFrom,
  onCustomFromChange,
  customTo,
  onCustomToChange,
  loading,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const isRTL = getDirection() === "rtl";
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 pb-1 border-b border-border/50">
      <div>
        <div className="flex items-center gap-2">
          <Link
            to="/orders/incomplete"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.98] transition-all"
            title={t("orders.incompleteBack", "رجوع للسلات") as string}
          >
            <BackIcon className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {t("orders.incompleteReports", "تقارير السلات غير المكتملة")}
          </h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1 sm:text-sm">
          رصد السلات المتروكة التي لم تتحول لطلبات: الملغاة بالتأكيد، المفقودة
          بالتقادم، والفرص المعلقة في الطابور
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <select
            value={period}
            onChange={(e) => {
              const next = e.target.value;
              if (next === "custom") {
                onCustomFromChange(
                  customFrom ||
                    toDateInput(new Date(Date.now() - 29 * 86400000))
                );
                onCustomToChange(customTo || toDateInput(new Date()));
              }
              onPeriodChange(next);
            }}
            className="px-3 py-1.5 border border-border/70 rounded-lg bg-card text-xs font-semibold text-foreground focus:border-border focus:ring-1 focus:ring-ring outline-none transition-all shadow-2xs cursor-pointer"
            aria-label={
              t("orders.incompletePeriodLabel", "الفترة الزمنية") as string
            }
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {p === "today"
                  ? t("orders.incompleteToday", "اليوم")
                  : p === "yesterday"
                  ? t("orders.incompleteYesterday", "أمس")
                  : p === "custom"
                  ? t("orders.incompleteCustomPeriod", "فترة مخصصة")
                  : t("orders.incompleteDays", {
                      count: Number(p),
                      defaultValue: `آخر ${p} يوم`,
                    })}
              </option>
            ))}
          </select>
        </div>

        {period === "custom" && (
          <div className="flex items-center gap-1.5 bg-muted/30 p-0.5 rounded-lg border border-border/60">
            <label htmlFor="incomplete-report-from" className="sr-only">
              {t("orders.incompleteFrom", "من")}
            </label>
            <input
              id="incomplete-report-from"
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className="px-2.5 py-1 border border-border/70 rounded-md bg-card text-xs font-medium text-foreground outline-none transition-all"
            />
            <span className="text-xs text-muted-foreground font-mono">→</span>
            <label htmlFor="incomplete-report-to" className="sr-only">
              {t("orders.incompleteTo", "إلى")}
            </label>
            <input
              id="incomplete-report-to"
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => onCustomToChange(e.target.value)}
              className="px-2.5 py-1 border border-border/70 rounded-md bg-card text-xs font-medium text-foreground outline-none transition-all"
            />
          </div>
        )}

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.98] transition-all shadow-2xs"
          title={t("orders.incompleteRetry", "إعادة التحميل") as string}
          aria-label={t("orders.incompleteRetry", "إعادة التحميل") as string}
        >
          <RotateCw
            className={`h-4 w-4 ${loading ? "animate-spin text-primary" : ""}`}
          />
        </button>

        <Link
          to="/orders/incomplete"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 active:scale-[0.98] transition-all shadow-2xs"
        >
          <BackIcon className="h-3.5 w-3.5" />
          <span>{t("orders.incompleteBack", "رجوع للسلات")}</span>
        </Link>
      </div>
    </div>
  );
};

export default IncompleteReportsHeader;
