import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Gauge } from "lucide-react";
import {
  type FacebookAdsDecisionSummary,
  type FacebookAdsPerformanceSummary,
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

  const topDecisionRows = useMemo(
    () => (decisionSummary?.rows || []).slice(0, 4),
    [decisionSummary?.rows],
  );

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
                قرارات Media Buying السريعة
              </h2>
              <span className="rounded-full bg-slate-100/90 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800/90 dark:text-slate-300">
                {formatNumber(decisionSummary?.totals.ads || 0)} إعلان
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              استرشادية: لا يتم إيقاف أو توسيع أي إعلان تلقائياً
            </span>
          </div>
          <div className="grid gap-2.5 xl:grid-cols-4">
            {topDecisionRows.map((row) => (
              <button
                key={row.ad.id}
                type="button"
                onClick={() =>
                  navigate(`/advertising/facebook-ads/ads/${row.ad.id}`)
                }
                className={`min-w-0 rounded-xl border p-3 text-right transition-all hover:-translate-y-0.5 hover:shadow-md ${getDecisionClass(
                  row.decision.tone,
                )}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-black">
                    {row.decision.label}
                  </span>
                  <span className="shrink-0 rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] font-black dark:bg-white/10">
                    {formatNumber(row.decision.confidence.score)}% ثقة
                  </span>
                </div>
                <p className="mt-1.5 truncate text-[11px] font-bold opacity-90">
                  {row.ad.name}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-1 border-t border-current/10 pt-2 text-[10px] font-black">
                  <span>CPA: {formatCurrency(row.decision.metrics.cpa || 0, selectedCurrency)}</span>
                  <span>ROAS: {formatNumber(row.decision.metrics.roas || 0, 2)}x</span>
                  <span>ربح: {formatCurrency(row.decision.metrics.estimatedProfit || 0, selectedCurrency)}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {performanceSummary?.recommendations?.length ? (
        <section className="grid gap-2.5 lg:grid-cols-3">
          {performanceSummary.recommendations.slice(0, 3).map((item) => (
            <div
              key={`${item.title}-${item.priority}`}
              className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/60 via-white to-white p-3.5 shadow-xs dark:border-amber-900/40 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 text-amber-900 dark:text-amber-200"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-black">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                {item.priority}
              </div>
              <h3 className="mt-1 text-xs font-black text-slate-950 dark:text-white">{item.title}</h3>
              <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-600 dark:text-slate-300">
                {item.message}
              </p>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
};

export default DecisionSummarySection;
