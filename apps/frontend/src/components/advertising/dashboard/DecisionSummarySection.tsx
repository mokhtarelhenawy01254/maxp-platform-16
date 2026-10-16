import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Gauge,
  Loader2,
  X,
  PauseCircle,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  type FacebookAdsDecisionSummary,
  type FacebookAdsPerformanceSummary,
  facebookAdsService,
} from "../../../services/facebookAdsService";
import {
  formatCurrency,
  formatNumber,
} from "../../../utils/facebookAdsHelpers";

interface DecisionSummarySectionProps {
  decisionSummary: FacebookAdsDecisionSummary | null;
  performanceSummary: FacebookAdsPerformanceSummary | null;
  selectedCurrency: string;
  selectedAdAccountId?: string;
}

const DecisionSummarySection: React.FC<DecisionSummarySectionProps> = ({
  decisionSummary,
  performanceSummary,
  selectedCurrency,
  selectedAdAccountId,
}) => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isEn = Boolean(
    i18n.language?.startsWith("en") ||
      (typeof window !== "undefined" && localStorage.getItem("language") === "en"),
  );

  const [executedActions, setExecutedActions] = useState<Record<string, boolean>>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [dismissedRecs, setDismissedRecs] = useState<Record<string, boolean>>({});

  // Separate truly actionable decisions (Scale or Kill with data) from neutral/no-data ones
  const { actionableRows } = useMemo(() => {
    const allRows = decisionSummary?.rows || [];
    const actionable: typeof allRows = [];
    const informational: typeof allRows = [];

    allRows.forEach((row) => {
      const spend = Number(row.decision.metrics.spend ?? row.summary?.spend ?? 0);
      const purchases = Number(row.decision.metrics.purchases ?? row.summary?.purchases ?? 0);
      const roas = Number(row.decision.metrics.roas ?? row.summary?.roas ?? 0);
      const tone = row.decision.tone;
      const label = row.decision.label || "";

      const isNoData =
        label.includes("لا توجد بيانات") ||
        label.toLowerCase().includes("no data") ||
        (spend === 0 && purchases === 0);

      const isScale =
        !isNoData &&
        (tone === "green" ||
          label.includes("وسّع") ||
          label.toLowerCase().includes("scale") ||
          (purchases >= 2 && roas >= 2.0));

      const isKill =
        !isNoData &&
        (tone === "danger" ||
          tone === "warning" ||
          tone === "red" ||
          label.includes("إيقاف") ||
          label.toLowerCase().includes("kill"));

      if (isScale || isKill) {
        actionable.push(row);
      } else {
        informational.push(row);
      }
    });

    return {
      actionableRows: actionable.slice(0, 4),
      informationalRows: informational.slice(0, 4),
    };
  }, [decisionSummary?.rows]);

  const activeRecs = useMemo(
    () =>
      (performanceSummary?.recommendations || []).filter(
        (rec) => {
          if (dismissedRecs[rec.title]) return false;
          if (rec.priority !== "HIGH") return false;
          // Filter out false pixel warnings if purchases are actively tracked
          if (
            rec.title.includes("Pixel") &&
            (performanceSummary?.totals?.purchases || 0) > 0
          ) {
            return false;
          }
          return true;
        },
      ),
    [dismissedRecs, performanceSummary?.recommendations, performanceSummary?.totals?.purchases],
  );

  const handleExecuteDecision = async (
    e: React.MouseEvent,
    row: (typeof actionableRows)[number],
    actionType: "scale" | "kill",
  ) => {
    e.stopPropagation();
    const campaignId = row.campaign?.id;
    if (!campaignId) {
      toast.error(isEn ? "No campaign linked to this ad" : "لا توجد حملة مرتبطة بهذا الإعلان");
      return;
    }

    setActionLoadingId(row.ad.id);
    try {
      if (actionType === "kill") {
        if (row.ad?.id) {
          await facebookAdsService.pauseAd(row.ad.id);
          toast.success(
            isEn
              ? `Ad paused: "${row.ad.name}"`
              : `تم إيقاف الإعلان الخاسر: "${row.ad.name}"`,
          );
        } else {
          await facebookAdsService.pauseCampaign(campaignId);
          toast.success(
            isEn
              ? `Campaign paused for "${row.ad?.name || campaignId}"`
              : `تم إيقاف الحملة بنجاح`,
          );
        }
        setExecutedActions((prev) => ({ ...prev, [row.ad.id]: true }));
      } else {
        const currentBudget = row.campaign.budgetAmount || 100;
        const nextBudget = Math.round(currentBudget * 1.2);
        await facebookAdsService.updateCampaign(campaignId, { budgetAmount: nextBudget });
        setExecutedActions((prev) => ({ ...prev, [row.ad.id]: true }));
        toast.success(
          isEn
            ? `Budget scaled to ${formatCurrency(nextBudget, selectedCurrency)}`
            : `تم زيادة الميزانية إلى ${formatCurrency(nextBudget, selectedCurrency)}`,
        );
      }
    } catch {
      toast.error(isEn ? "Action failed on Meta" : "تعذر تنفيذ الإجراء على Meta");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Actionable Decisions Hub */}
      <section className="rounded-xl border border-border/70 bg-card p-3.5 sm:p-4 shadow-xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Gauge className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  {isEn ? "AI Media Buying Decisions" : "قرارات Media Buying الذكية"}
                </h2>
                {actionableRows.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary font-mono tabular-nums">
                    {actionableRows.length} {isEn ? "ready to execute" : "مطلوب إجراء فوري"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {isEn
              ? "Automated signals based on real profit margins and Meta telemetry"
              : "توصيات فورية مبنية على هوامش الربح الحقيقية وقراءات Meta"}
          </span>
        </div>

        {actionableRows.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {actionableRows.map((row) => {
              const tone = row.decision.tone;
              const label = row.decision.label || "";
              const purchases = Number(row.decision.metrics.purchases ?? row.summary?.purchases ?? 0);
              const roas = Number(row.decision.metrics.roas ?? row.summary?.roas ?? 0);
              const cpa = Number(row.decision.metrics.cpa ?? row.summary?.cpa ?? 0);

              const isKill =
                tone === "danger" ||
                tone === "warning" ||
                tone === "red" ||
                label.includes("إيقاف");
              const isScale = !isKill;

              const isExecuted = executedActions[row.ad.id];
              const isLoading = actionLoadingId === row.ad.id;

              return (
                <div
                  key={row.ad.id}
                  onClick={() => navigate(`/advertising/facebook-ads/ads/${row.ad.id}`)}
                  className={`group relative flex flex-col justify-between rounded-xl border p-3 text-start transition-all hover:shadow-md cursor-pointer ${
                    isKill
                      ? "border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40"
                      : "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                          isKill
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {row.decision.label}
                      </span>
                      <span className="shrink-0 rounded-md bg-muted/60 px-1.5 py-0.5 text-xs font-semibold font-mono tabular-nums text-muted-foreground border border-border/50">
                        {formatNumber(row.decision.confidence.score)}% {isEn ? "conf." : "ثقة"}
                      </span>
                    </div>

                    <h3 className="mt-2 truncate text-xs font-semibold text-foreground" title={row.ad.name}>
                      {row.ad.name}
                    </h3>

                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                      {row.decision.reason || (isScale ? "أداء ممتاز أعلى من أهداف الربحية." : "تجاوز حد الأمان المالي.")}
                    </p>
                  </div>

                  <div className="mt-3 border-t border-border/60 pt-2.5">
                    <div className="grid grid-cols-3 gap-1 text-xs font-semibold text-foreground font-mono tabular-nums" dir="ltr">
                      <div>
                        <span className="block text-[11px] font-normal text-muted-foreground">ROAS</span>
                        <span className={roas >= 2 ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""}>{formatNumber(roas, 2)}x</span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-normal text-muted-foreground">CPA</span>
                        <span>{formatCurrency(cpa, selectedCurrency)}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-normal text-muted-foreground">{isEn ? "Purchases" : "المبيعات"}</span>
                        <span>{formatNumber(purchases)}</span>
                      </div>
                    </div>

                    <div className="mt-2.5">
                      {isExecuted ? (
                        <span className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-500/10 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {isEn ? "Action Executed" : "تم تنفيذ القرار بنجاح"}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={(e) => handleExecuteDecision(e, row, isKill ? "kill" : "scale")}
                          className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer ${
                            isKill
                              ? "bg-rose-600 hover:bg-rose-700 active:scale-[0.98]"
                              : "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]"
                          } disabled:opacity-50`}
                        >
                          {isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isKill ? (
                            <PauseCircle className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingUp className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {isKill
                              ? (isEn ? "Pause Campaign Now" : "إيقاف الحملة فوراً")
                              : (isEn ? "Scale Budget +20%" : "زيادة الميزانية 20%")}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5 sm:px-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs font-semibold text-foreground">
                  {isEn
                    ? "Campaigns are stable — no urgent interventions required"
                    : "حالة الحملات مستقرة — لا توجد تدخلات فورية مطلوبة حالياً"}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {isEn
                    ? "Active ads are running within safety thresholds or collecting telemetry (Learning Phase). Scaling and budget protection decisions trigger automatically when statistical confidence is reached."
                    : "الإعلانات النشطة تعمل ضمن الحدود الآمنة أو لا تزال في مرحلة تجميع البيانات (Learning Phase). ستظهر قرارات التوسيع أو الإيقاف هنا تلقائياً عند اكتمال الدقة الإحصائية."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/advertising/facebook-ads/decision-reports${
                    selectedAdAccountId ? `?adAccountId=${selectedAdAccountId}` : ""
                  }`,
                )
              }
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-all cursor-pointer"
            >
              <span>{isEn ? "Deep Decision Analysis" : "عرض سجل القرارات والتقارير"}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* High-Impact Alert Banners */}
      {activeRecs.length > 0 && (
        <div className="space-y-2">
          {activeRecs.slice(0, 2).map((item) => (
            <div
              key={`${item.title}-${item.priority}`}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 sm:px-4 shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {item.priority === "HIGH" ? (isEn ? "High Priority" : "أولوية عالية") : item.priority}
                    </span>
                    <h3 className="truncate text-xs font-semibold text-foreground">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                    {item.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {item.title.toLowerCase().includes("pixel") && (
                  <button
                    type="button"
                    onClick={() => navigate("/advertising/facebook-pixel")}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition-all cursor-pointer"
                  >
                    <span>{isEn ? "Diagnose & Connect" : "فحص وربط البيكسل"}</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDismissedRecs((prev) => ({ ...prev, [item.title]: true }))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  title={isEn ? "Dismiss" : "إخفاء"}
                  aria-label={isEn ? "Dismiss" : "إخفاء التنبيه"}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DecisionSummarySection;
