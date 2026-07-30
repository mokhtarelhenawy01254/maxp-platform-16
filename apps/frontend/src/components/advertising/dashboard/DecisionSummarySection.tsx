import { formatCurrency } from '@/utils/formatters';
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Gauge } from 'lucide-react';
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
        <section className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              <h2 className="text-sm font-black text-slate-950 dark:text-white">
                قرارات مختصرة
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {formatNumber(decisionSummary?.totals.ads || 0)} إعلان
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              read-only: لا يتم إيقاف أو توسيع أي إعلان تلقائياً
            </span>
          </div>
          <div className="grid gap-2 xl:grid-cols-4">
            {topDecisionRows.map((row) => (
              <button
                key={row.ad.id}
                type="button"
                onClick={() =>
                  navigate(`/advertising/facebook-ads/ads/${row.ad.id}`)
                }
                className={`min-w-0 rounded-lg border px-2.5 py-2 text-right transition hover:shadow-sm ${getDecisionClass(
                  row.decision.tone,
                )}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-black">
                    {row.decision.label}
                  </span>
                  <span className="shrink-0 text-[10px] font-black">
                    {formatNumber(row.decision.confidence.score)}%
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] font-bold opacity-90">
                  {row.ad.name}
                </p>
                <div className="mt-1 grid grid-cols-3 gap-1 text-[10px] font-black">
                  <span>CPA {formatCurrency(row.decision.metrics.cpa || 0, selectedCurrency)}</span>
                  <span>ROAS {formatNumber(row.decision.metrics.roas || 0, 2)}x</span>
                  <span>ربح {formatCurrency(row.decision.metrics.estimatedProfit || 0, selectedCurrency)}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {performanceSummary?.recommendations?.length ? (
        <section className="grid gap-2 lg:grid-cols-3">
          {performanceSummary.recommendations.slice(0, 3).map((item) => (
            <div
              key={`${item.title}-${item.priority}`}
              className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-black">
                <AlertTriangle className="h-3.5 w-3.5" />
                {item.priority}
              </div>
              <h3 className="mt-1 text-xs font-black">{item.title}</h3>
              <p className="mt-1 line-clamp-2 text-[11px] leading-4 opacity-80">
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
