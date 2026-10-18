import React from "react";
import { useTranslation } from "react-i18next";
import { Users, RotateCcw } from "lucide-react";
import type { ConfirmationStats, FilterOption } from "./types";

export interface ConfirmationTeamReportRibbonProps {
  stats: ConfirmationStats | null;
  statsLoading: boolean;
  statsStartDate: string;
  setStatsStartDate: (val: string) => void;
  statsEndDate: string;
  setStatsEndDate: (val: string) => void;
  statsStrategy: string;
  setStatsStrategy: (val: string) => void;
  strategyOptions: FilterOption[];
  statsSummaryLabel: string;
  setStatsRefreshKey: React.Dispatch<React.SetStateAction<number>>;
}

export const ConfirmationTeamReportRibbon: React.FC<ConfirmationTeamReportRibbonProps> = ({
  stats,
  statsLoading,
  statsStartDate,
  setStatsStartDate,
  statsEndDate,
  setStatsEndDate,
  statsStrategy,
  setStatsStrategy,
  strategyOptions,
  statsSummaryLabel,
  setStatsRefreshKey,
}) => {
  const { t } = useTranslation();

  const handleReset = () => {
    setStatsStartDate("");
    setStatsEndDate("");
    setStatsStrategy("");
    setStatsRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              {t("orders.teamReport", { defaultValue: "تقرير فريق التأكيد" })}
            </h2>
            <p className="text-[11px] font-medium text-muted-foreground sm:hidden">
              {t("orders.teamReportShort", { defaultValue: "إحصائيات إنجاز الموظفين" })}
            </p>
          </div>
        </div>

        <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-bold text-primary font-mono tabular-nums sm:hidden">
          {stats?.totals.totalAssigned ?? 0} {t("orders.totalAssigned", { defaultValue: "مخصص" })}
        </span>
      </div>

      <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
        {statsSummaryLabel}
      </p>

      {/* Mobile Collapsible Details */}
      <details className="mt-3 rounded-2xl border border-border/70 bg-muted/30 p-3 sm:hidden">
        <summary className="cursor-pointer text-xs font-bold text-foreground select-none">
          {t("orders.customizeReport", { defaultValue: "تخصيص التقرير والتاريخ" })}
        </summary>
        <div className="mt-3 space-y-2.5 text-xs text-foreground">
          <label className="block">
            <span className="mb-1 block text-[11px] text-muted-foreground">{t("orders.from", { defaultValue: "من" })}</span>
            <input
              type="date"
              value={statsStartDate}
              onChange={(e) => setStatsStartDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-muted-foreground">{t("orders.to", { defaultValue: "إلى" })}</span>
            <input
              type="date"
              value={statsEndDate}
              onChange={(e) => setStatsEndDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-muted-foreground">{t("orders.strategy", { defaultValue: "استراتيجية التوزيع" })}</span>
            <select
              value={statsStrategy}
              onChange={(e) => setStatsStrategy(e.target.value)}
              className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              {strategyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStatsRefreshKey((prev) => prev + 1)}
              className="h-10 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-xs active:scale-95"
            >
              {t("orders.updateReport", { defaultValue: "تحديث" })}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="h-10 rounded-xl border border-border/70 bg-background text-xs font-bold text-foreground active:scale-95"
            >
              {t("orders.reset", { defaultValue: "إعادة ضبط" })}
            </button>
          </div>
        </div>
      </details>

      {/* Desktop Filter Row */}
      <div className="mt-3 hidden flex-col gap-2.5 text-xs text-foreground sm:flex lg:flex-row lg:items-center">
        <div className="flex items-center gap-1.5">
          <label className="text-muted-foreground shrink-0">{t("orders.from", { defaultValue: "من" })}</label>
          <input
            type="date"
            value={statsStartDate}
            onChange={(e) => setStatsStartDate(e.target.value)}
            className="h-9 px-2.5 border border-border/70 rounded-xl bg-background text-foreground text-xs focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-muted-foreground shrink-0">{t("orders.to", { defaultValue: "إلى" })}</label>
          <input
            type="date"
            value={statsEndDate}
            onChange={(e) => setStatsEndDate(e.target.value)}
            className="h-9 px-2.5 border border-border/70 rounded-xl bg-background text-foreground text-xs focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-muted-foreground shrink-0">{t("orders.strategy", { defaultValue: "الاستراتيجية" })}</label>
          <select
            value={statsStrategy}
            onChange={(e) => setStatsStrategy(e.target.value)}
            className="h-9 px-2.5 border border-border/70 rounded-xl bg-background text-foreground text-xs focus:border-primary focus:outline-none"
          >
            {strategyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatsRefreshKey((prev) => prev + 1)}
            className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:bg-primary/90 active:scale-95 transition-all"
          >
            {t("orders.updateReport", { defaultValue: "تحديث التقرير" })}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="h-9 px-3 rounded-xl border border-border/70 bg-background text-muted-foreground hover:text-foreground text-xs font-semibold hover:bg-muted active:scale-95 transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {statsLoading ? (
        <div className="p-4 text-center text-xs text-muted-foreground">{t("orders.loadingReport", { defaultValue: "جاري تحميل التقرير..." })}</div>
      ) : !stats ? (
        <div className="p-4 text-center text-xs text-muted-foreground">{t("orders.notEnoughData", { defaultValue: "لا توجد بيانات كافية" })}</div>
      ) : (
        <div className="mt-3.5 space-y-3.5">
          <div className="grid grid-cols-2 gap-2 text-xs sm:gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-background/60 p-3 shadow-xs">
              <div className="text-[11px] text-muted-foreground font-medium">{t("orders.totalConfirmed", { defaultValue: "إجمالي المؤكد" })}</div>
              <div className="mt-1 text-lg sm:text-xl font-bold font-mono tabular-nums text-foreground">
                {stats.totals.totalConfirmed}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/60 p-3 shadow-xs">
              <div className="text-[11px] text-muted-foreground font-medium">{t("orders.systemConfirmations", { defaultValue: "مؤكد يدوي/عادي" })}</div>
              <div className="mt-1 text-lg sm:text-xl font-bold font-mono tabular-nums text-foreground">
                {stats.totals.confirmedRegular}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/60 p-3 shadow-xs">
              <div className="text-[11px] text-muted-foreground font-medium">{t("orders.guestConfirmations", { defaultValue: "مؤكد زوار" })}</div>
              <div className="mt-1 text-lg sm:text-xl font-bold font-mono tabular-nums text-foreground">
                {stats.totals.confirmedGuest}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/60 p-3 shadow-xs">
              <div className="text-[11px] text-muted-foreground font-medium">{t("orders.totalAssigned", { defaultValue: "إجمالي الموزع" })}</div>
              <div className="mt-1 text-lg sm:text-xl font-bold font-mono tabular-nums text-primary">
                {stats.totals.totalAssigned}
              </div>
            </div>
          </div>

          {/* User distribution breakdown */}
          <div className="overflow-hidden rounded-xl border border-border/70 bg-background/60">
            <div className="bg-muted/40 px-3 py-2 text-xs font-bold text-foreground">
              {t("orders.distributionByTeam", { defaultValue: "توزيع الحالات على الموظفين" })}
            </div>
            {stats.assignmentsByUser.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground">{t("orders.noDistributions", { defaultValue: "لا توجد توزيعات مسجلة" })}</div>
            ) : (
              <div className="divide-y divide-border/50">
                {stats.assignmentsByUser.map((entry) => (
                  <div key={entry.userId} className="flex items-center justify-between px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate">{entry.name || entry.userId}</div>
                      {entry.email && (
                        <div className="truncate text-[11px] text-muted-foreground font-mono">{entry.email}</div>
                      )}
                    </div>
                    <div className="ms-3 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-bold font-mono tabular-nums text-primary">
                      {entry.count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfirmationTeamReportRibbon;
