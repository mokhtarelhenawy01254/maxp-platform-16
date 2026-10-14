import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, TrendingUp, TrendingDown, Minus, ShieldAlert, BarChart3, AlertTriangle, Sparkles, ExternalLink, RefreshCw } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { apiClient } from "../../services/apiClient";
import CompetitorStatusBar, { type CompetitorStatus } from './CompetitorStatusBar';
import { updateCompetitorStatus } from './useCompetitorStatus';
import i18n from "../../i18n";

interface PriceComparisonRow {
  competitorProduct: string;
  competitorPrice: number | null;
  yourProduct: string | null;
  yourPrice: number | null;
  priceDiff: string | null;
}

interface BattlecardData {
  competitor: {
    id: string;
    name: string;
    platform: string;
    url: string;
    status: CompetitorStatus;
  };
  metrics: {
    theirProducts: number;
    theirAds: number;
    yourProducts: number;
    priceComparisonCount: number;
  };
  lastReportDate: string | null;
  reportInsights: Record<string, unknown>;
  priceComparison: PriceComparisonRow[];
  gaps: { name: string; price: number }[];
}

const DiffBadge = ({ value }: { value: string | null }) => {
  if (value === null) {
    return <span className="font-mono text-muted-foreground text-xs">--</span>;
  }
  const num = parseFloat(value);
  if (num > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
        <TrendingUp size={12} />
        <span>+{value}%</span>
      </span>
    );
  }
  if (num < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <TrendingDown size={12} />
        <span>{value}%</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/60">
      <Minus size={12} />
      <span>0.0%</span>
    </span>
  );
};

const BattlecardViewer: React.FC = () => {
  const { t } = useTranslation();
  const { competitorId } = useParams<{ competitorId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BattlecardData | null>(null);

  const fetchBattlecard = () => {
    if (!competitorId) return;
    setLoading(true);
    apiClient
      .get<{ success: boolean; data: BattlecardData }>(
        `/api/v1/competitors/${competitorId}/battlecard?format=structured`
      )
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          setData(res.data.data);
        } else {
          setData(null);
        }
      })
      .catch(() => {
        setData(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBattlecard();
  }, [competitorId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-background text-foreground">
        <LoadingSpinner size="lg" />
        <span className="text-xs text-muted-foreground mt-3 font-mono">LOADING BATTLECARD DOSSIER...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-muted-foreground bg-background min-h-[60vh] flex flex-col items-center justify-center">
        <ShieldAlert size={36} className="text-muted-foreground/60 mb-2" />
        <p className="text-sm font-semibold">{t("competitors.battlecard.noBattlecardData")}</p>
        <button
          onClick={() => navigate('/competitors')}
          className="mt-3 text-xs text-primary hover:underline font-mono"
        >
          Return to Competitors Overview
        </button>
      </div>
    );
  }

  const hasInsights = data.reportInsights && Object.keys(data.reportInsights).length > 0;

  return (
    <div dir={i18n.dir()} className="w-full min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Header Command Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg border border-border/60 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
              title={t('common.back')}
            >
              {i18n.dir() === 'rtl' ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">
                  {t("competitors.battlecard.title")}: {data.competitor.name}
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  WAR ROOM
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Competitive intelligence briefing, pricing parity, and catalogue gaps
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono px-2 py-1 rounded bg-muted/30 border border-border/60 text-muted-foreground">
              {data.competitor.platform || "Direct Web"}
            </span>
            <CompetitorStatusBar
              currentStatus={data.competitor.status}
              competitorId={data.competitor.id}
              onChange={(newStatus) => updateCompetitorStatus(data.competitor.id, newStatus)}
              size="md"
            />
          </div>
        </div>

        {/* Telemetry Stats Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-card border border-border/70 rounded-xl p-3 shadow-xs">
          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {t("competitors.products")}
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
              {data.metrics.theirProducts}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Their active catalogue</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Their Live Ads
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400 mt-1">
              {data.metrics.theirAds}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Tracked creative campaigns</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {t("competitors.battlecard.yourProduct")}
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
              {data.metrics.yourProducts}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Your store portfolio</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {t("competitors.battlecard.priceComparison")}
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-primary mt-1">
              {data.metrics.priceComparisonCount}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Compared SKU pairs</div>
          </div>
        </div>

        {/* Head-to-Head Price Parity Matrix */}
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-muted/30 border-b border-border/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={15} className="text-primary" />
              <h2 className="text-xs font-bold text-foreground">
                {t("competitors.battlecard.priceComparison")}
              </h2>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              {data.priceComparison.length} Matched Pairs
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/15 border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">{t("competitors.battlecard.yourProduct")}</th>
                  <th className="py-2.5 px-4">{t("competitors.battlecard.yourPrice")}</th>
                  <th className="py-2.5 px-4">{t("competitors.battlecard.theirProduct")}</th>
                  <th className="py-2.5 px-4">{t("competitors.battlecard.theirPrice")}</th>
                  <th className="py-2.5 px-4 text-end">{t("competitors.battlecard.diffPercent")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {data.priceComparison.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/10 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-foreground max-w-xs truncate">
                      {row.yourProduct || "--"}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-muted-foreground">
                      {row.yourPrice != null ? Number(row.yourPrice).toFixed(2) : "--"}
                    </td>
                    <td className="py-2.5 px-4 text-foreground max-w-xs truncate">
                      {row.competitorProduct}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-muted-foreground">
                      {row.competitorPrice != null ? Number(row.competitorPrice).toFixed(2) : "--"}
                    </td>
                    <td className="py-2.5 px-4 text-end">
                      <DiffBadge value={row.priceDiff} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Market Gaps & Insights Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Market Gaps */}
          <div className="bg-card border border-border/70 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border/60">
              <AlertTriangle size={15} className="text-amber-500" />
              <h3 className="text-xs font-bold text-foreground">
                {t("competitors.battlecard.marketGaps")}
              </h3>
            </div>

            {data.gaps.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-xs">
                {t("competitors.noGaps")}
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {data.gaps.map((gap, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/40 text-xs"
                  >
                    <span className="font-medium text-foreground truncate pr-2">{gap.name}</span>
                    <span className="font-mono tabular-nums font-bold text-amber-600 dark:text-amber-400 shrink-0">
                      {gap.price != null ? Number(gap.price).toFixed(2) : "--"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Report Insights */}
          <div className="bg-card border border-border/70 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border/60">
              <Sparkles size={15} className="text-primary" />
              <h3 className="text-xs font-bold text-foreground">
                {t("competitors.insights")}
              </h3>
            </div>

            {hasInsights ? (
              <div className="grid grid-cols-2 gap-3 pt-1">
                {(data.reportInsights as any).newProducts != null && (
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                    <div className="text-[10px] text-muted-foreground uppercase font-mono">
                      {t("competitors.newProducts")}
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-primary mt-1">
                      {(data.reportInsights as any).newProducts}
                    </div>
                  </div>
                )}
                {(data.reportInsights as any).priceChanges != null && (
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                    <div className="text-[10px] text-muted-foreground uppercase font-mono">
                      {t("competitors.priceChanges")}
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
                      {(data.reportInsights as any).priceChanges}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8 text-xs">
                No active anomaly insights logged.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default BattlecardViewer;
