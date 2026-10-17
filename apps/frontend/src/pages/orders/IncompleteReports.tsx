import React from "react";
import { useTranslation } from "react-i18next";
import { getDirection } from "../../i18n";
import { RotateCw, AlertTriangle, Loader2 } from "lucide-react";

import { useIncompleteReportsData } from "./reports/useIncompleteReportsData";
import IncompleteReportsHeader from "./reports/IncompleteReportsHeader";
import IncompleteReportsKpis from "./reports/IncompleteReportsKpis";
import IncompleteReportsFlowTable from "./reports/IncompleteReportsFlowTable";
import IncompleteReportsDismissalReasons from "./reports/IncompleteReportsDismissalReasons";
import IncompleteReportsTeamTable from "./reports/IncompleteReportsTeamTable";
import IncompleteReportsSources from "./reports/IncompleteReportsSources";

export const IncompleteReports: React.FC = () => {
  const { t } = useTranslation();
  const {
    period,
    setPeriod,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    data,
    loading,
    error,
    hint,
    summary,
    totalUncompletedCount,
    totalUncompletedValue,
    cohorts,
    dismissalReasons,
    team,
    orderSources,
    handleRetry,
  } = useIncompleteReportsData();

  return (
    <div className="space-y-5" dir={getDirection()}>
      {/* الشريط العلوي وفلتر الفترة الزمنية */}
      <IncompleteReportsHeader
        period={period}
        onPeriodChange={setPeriod}
        customFrom={customFrom}
        onCustomFromChange={setCustomFrom}
        customTo={customTo}
        onCustomToChange={setCustomTo}
        loading={loading}
        onRefresh={handleRetry}
      />

      {hint && !error && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
          {hint}
        </div>
      )}

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center min-h-[320px] gap-2.5">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">جاري تحميل التقارير...</p>
        </div>
      ) : !data && error ? (
        <div className="rounded-xl border border-destructive/30 bg-card p-8 text-center shadow-2xs">
          <div className="flex flex-col items-center gap-2.5">
            <div className="p-3 rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-destructive">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>{t("orders.incompleteRetry", "إعادة المحاولة")}</span>
            </button>
          </div>
        </div>
      ) : data ? (
        <>
          {error && !loading && (
            <div className="flex items-center justify-between flex-wrap gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <span>
                {t(
                  "orders.incompleteReportsStaleError",
                  "تعذر تحديث البيانات، يتم عرض آخر بيانات محملة"
                )}
              </span>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 px-2 py-0.5 text-xs font-semibold hover:bg-amber-500/20 active:scale-[0.98] transition-all"
              >
                <RotateCw className="h-3 w-3" />
                <span>{t("orders.incompleteRetry", "إعادة المحاولة")}</span>
              </button>
            </div>
          )}

          {/* 🎯 كروت الفاقد والمعلق */}
          <IncompleteReportsKpis
            period={period}
            summary={summary}
            totalUncompletedCount={totalUncompletedCount}
            totalUncompletedValue={totalUncompletedValue}
          />

          {/* 📅 جدول كشف حركة السلات غير المكتملة والفاقد اليومي */}
          <IncompleteReportsFlowTable
            cohorts={cohorts}
            summary={summary}
            totalUncompletedCount={totalUncompletedCount}
            totalUncompletedValue={totalUncompletedValue}
          />

          {/* 🔍 أسباب الإلغاء والاستبعاد الموثقة */}
          <IncompleteReportsDismissalReasons
            dismissalReasons={dismissalReasons}
          />

          {/* 👥 جدول تعامل الموظفين مع السلات غير المكتملة */}
          <IncompleteReportsTeamTable team={team} />

          {/* 📡 مصادر السلات غير المكتملة */}
          <IncompleteReportsSources orderSources={orderSources} />
        </>
      ) : null}
    </div>
  );
};

export default IncompleteReports;
