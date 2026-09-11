import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Gauge, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  type FacebookAdsDecisionSummary,
  type FacebookAdsPerformanceSummary,
  facebookAdsService,
} from "../../../services/facebookAdsService";
import {
  formatCurrency,
  formatNumber,
  getDecisionClass,
} from "../../../utils/facebookAdsHelpers";

interface DecisionSummarySectionProps {
  decisionSummary: FacebookAdsDecisionSummary | null;
  performanceSummary: FacebookAdsPerformanceSummary | null;
  selectedCurrency: string;
}

const DecisionSummarySection: React.FC<DecisionSummarySectionProps> = ({
  decisionSummary,
  performanceSummary,
  selectedCurrency,
}) => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en") || localStorage.getItem("language") === "en";

  const [executedActions, setExecutedActions] = useState<Record<string, boolean>>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [dismissedRecs, setDismissedRecs] = useState<Record<string, boolean>>({});

  const topDecisionRows = useMemo(
    () => (decisionSummary?.rows || []).slice(0, 4),
    [decisionSummary?.rows],
  );

  const activeRecs = useMemo(
    () =>
      (performanceSummary?.recommendations || []).filter(
        (rec) => !dismissedRecs[rec.title],
      ),
    [dismissedRecs, performanceSummary?.recommendations],
  );

  const handleExecuteDecision = async (
    e: React.MouseEvent,
    row: (typeof topDecisionRows)[number],
  ) => {
    e.stopPropagation();
    const isDanger = row.decision.tone === "danger" || row.decision.tone === "warning";
    const campaignId = row.campaign?.id;
    if (!campaignId) {
      toast.error(isEn ? "No campaign linked" : "لا توجد حملة مرتبطة بهذا الإعلان");
      return;
    }

    setActionLoadingId(row.ad.id);
    try {
      if (isDanger) {
        await facebookAdsService.pauseCampaign(campaignId);
        setExecutedActions((prev) => ({ ...prev, [row.ad.id]: true }));
        toast.success(
          isEn
            ? `Campaign paused for "${row.ad.name}"`
            : `تم إيقاف حملة "${row.ad.name}" بنجاح`,
        );
      } else {
        const nextBudget = Math.round((row.campaign.budgetAmount || 100) * 1.2);
        await facebookAdsService.updateCampaign(campaignId, { budgetAmount: nextBudget });
        setExecutedActions((prev) => ({ ...prev, [row.ad.id]: true }));
        toast.success(
          isEn
            ? `Budget scaled to ${formatCurrency(nextBudget, selectedCurrency)}`
            : `تم زيادة الميزانية إلى ${formatCurrency(nextBudget, selectedCurrency)}`,
        );
      }
    } catch {
      toast.error(isEn ? "Action failed" : "تعذر تنفيذ الإجراء على Meta");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <>
      {topDecisionRows.length > 0 ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-3.5 shadow-xs backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                <Gauge className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-sm font-black text-slate-950 dark:text-white">
                {isEn ? "Quick Media Buying Decisions" : "قرارات Media Buying السريعة"}
              </h2>
              <span className="rounded-full bg-slate-100/90 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800/90 dark:text-slate-300">
                {formatNumber(decisionSummary?.totals.ads || 0)} {isEn ? "ad" : "إعلان"}
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {isEn ? "Actionable recommendations with instant execution" : "توصيات قابلة للتنفيذ المباشر بنقرة واحدة"}
            </span>
          </div>
          <div className="grid gap-2.5 xl:grid-cols-4">
            {topDecisionRows.map((row) => {
              const isDanger = row.decision.tone === "danger" || row.decision.tone === "warning";
              const isExecuted = executedActions[row.ad.id];
              const isLoading = actionLoadingId === row.ad.id;

              return (
                <div
                  key={row.ad.id}
                  onClick={() =>
                    navigate(`/advertising/facebook-ads/ads/${row.ad.id}`)
                  }
                  className={`min-w-0 cursor-pointer rounded-xl border p-3 text-start transition-all hover:-translate-y-0.5 hover:shadow-md ${getDecisionClass(
                    row.decision.tone,
                  )}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-black">
                      {row.decision.label}
                    </span>
                    <span className="shrink-0 rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] font-black dark:bg-white/10">
                      {formatNumber(row.decision.confidence.score)}% {isEn ? "conf." : "ثقة"}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-[11px] font-bold opacity-90">
                    {row.ad.name}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-1 border-t border-current/10 pt-2 text-[10px] font-black" dir="ltr">
                    <span>CPA: {formatCurrency(row.decision.metrics.cpa || 0, selectedCurrency)}</span>
                    <span>ROAS: {formatNumber(row.decision.metrics.roas || 0, 2)}x</span>
                    <span>{isEn ? "Profit" : "ربح"}: {formatCurrency(row.decision.metrics.estimatedProfit || 0, selectedCurrency)}</span>
                  </div>

                  {/* Direct Action Execution Button */}
                  <div className="mt-2.5 pt-2 border-t border-current/10">
                    {isExecuted ? (
                      <span className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-600/10 py-1 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        {isEn ? "Action Executed" : "تم التنفيذ بنجاح"}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={(e) => handleExecuteDecision(e, row)}
                        className={`inline-flex w-full items-center justify-center gap-1 rounded-lg py-1 px-2 text-[10px] font-black text-white shadow-xs transition-all ${
                          isDanger
                            ? "bg-rose-600 hover:bg-rose-700"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        } disabled:opacity-50`}
                      >
                        {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                        {isDanger
                          ? (isEn ? "⛔ Pause Campaign Now" : "⛔ إيقاف الحملة فوراً")
                          : (isEn ? "🚀 Scale Budget +20%" : "🚀 زيادة الميزانية 20%")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeRecs.length > 0 ? (
        <div className="space-y-2">
          {activeRecs.slice(0, 2).map((item) => (
            <div
              key={`${item.title}-${item.priority}`}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-amber-50/40 to-white p-2.5 sm:px-3.5 shadow-xs dark:border-amber-900/50 dark:from-amber-950/30 dark:to-slate-900"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-amber-200/70 dark:bg-amber-900/50 px-1.5 py-0.5 text-[10px] font-black text-amber-900 dark:text-amber-200">
                      {item.priority === "HIGH" ? (isEn ? "High Priority" : "أولوية عالية") : item.priority}
                    </span>
                    <h3 className="truncate text-xs font-black text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 line-clamp-1">
                    {item.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {item.title.toLowerCase().includes("pixel") && (
                  <button
                    type="button"
                    onClick={() => navigate("/advertising/facebook-pixel")}
                    className="inline-flex h-7 items-center gap-1 rounded-lg bg-amber-600 px-2.5 text-[11px] font-bold text-white shadow-xs hover:bg-amber-700 transition-all"
                  >
                    <span>{isEn ? "Diagnose & Connect" : "فحص وربط البيكسل"}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDismissedRecs((prev) => ({ ...prev, [item.title]: true }))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-amber-100/60 hover:text-slate-600 dark:hover:bg-amber-950/60 transition-colors"
                  title={isEn ? "Dismiss" : "إخفاء"}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
};

export default DecisionSummarySection;
