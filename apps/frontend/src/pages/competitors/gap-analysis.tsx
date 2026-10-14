import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, AlertTriangle, CheckCircle2, ArrowLeft, ArrowRight, ExternalLink, RefreshCw, Filter, Sparkles, ShoppingBag } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import CompetitorStatusBar, { type CompetitorStatus } from './CompetitorStatusBar';
import { updateCompetitorStatus } from './useCompetitorStatus';
import i18n from '../../i18n';

interface GapProduct {
  id: string;
  name: string;
  price: number | null;
  currency: string;
  sku: string | null;
  competitorName: string;
  competitorId: string;
  image: string | null;
  url: string | null;
}

interface YourProduct {
  id: string;
  name: string;
  price: number | null;
  sku: string | null;
}

const GapAnalysis: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [competitorId, setCompetitorId] = useState<string>('');
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [gaps, setGaps] = useState<GapProduct[]>([]);
  const [yourProducts, setYourProducts] = useState<YourProduct[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    fetchCompetitors();
  }, []);

  const fetchCompetitors = async () => {
    try {
      const res = await apiClient.get('/competitors', { params: { isActive: 'true' } });
      if (res.data.success) setCompetitors(res.data.data || []);
    } catch {
      console.error('Failed to fetch competitors');
    }
  };

  const runAnalysis = async () => {
    if (!competitorId) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/competitors/${competitorId}/price-compare`);
      if (res.data.success) {
        setGaps(res.data.data.products || []);
        setYourProducts(res.data.data.yourProducts || []);
        setAnalysis(res.data.data.analysis || null);
      }
    } catch {
      console.error('Failed to analyze');
    }
    setIsLoading(false);
  };

  const selectedCompetitor = competitors.find(c => c.id === competitorId);

  return (
    <div className="w-full min-h-screen bg-background text-foreground" dir={i18n.dir()}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Header Command Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/competitors')}
              className="p-2 rounded-lg border border-border/60 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
              title={t('common.back')}
            >
              {i18n.dir() === 'rtl' ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{t('competitors.gapAnalysis')}</h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  MARKET INTEL
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('competitors.gapExplanation')}
              </p>
            </div>
          </div>

          {/* Competitor Selector & Action */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px] sm:min-w-[240px]">
              <select
                value={competitorId}
                onChange={e => setCompetitorId(e.target.value)}
                className="w-full text-xs h-9 px-3 pr-8 rounded-lg border border-border/70 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="">{t('competitors.selectCompetitor')}...</option>
                {competitors.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={runAnalysis}
              disabled={!competitorId || isLoading}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <TrendingUp size={14} />
              )}
              <span>{t('competitors.analyzeGaps')}</span>
            </button>

            {selectedCompetitor && (
              <div className="hidden md:flex items-center gap-1.5 pl-2 border-l border-border/60">
                <CompetitorStatusBar
                  currentStatus={selectedCompetitor.status || 'NEW'}
                  competitorId={selectedCompetitor.id}
                  onChange={(newStatus) => updateCompetitorStatus(selectedCompetitor.id, newStatus)}
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Telemetry Stats Ribbon */}
        {analysis && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-card border border-border/70 rounded-xl p-3 shadow-xs">
            <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t('competitors.opportunities')}
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-primary mt-1">
                {analysis.gapCount ?? gaps.length}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Missing from your catalog</div>
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t('competitors.overlapping')}
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                {analysis.catchCount ?? yourProducts.length}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Directly matched items</div>
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t('competitors.coverageRate')}
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400 mt-1">
                {analysis.coverage ?? 0}%
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Catalog overlap depth</div>
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t('competitors.avgPriceDiff')}
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
                {analysis.avgPriceDiff ?? 0}%
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Price difference spread</div>
            </div>
          </div>
        )}

        {/* Market Gaps (Opportunities) Grid */}
        {gaps.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  {t('competitors.marketGaps')}
                </h2>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {gaps.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {gaps.map((product, idx) => (
                <div
                  key={product.id || idx}
                  className="bg-card border border-border/70 rounded-xl p-3.5 hover:border-primary/40 transition-all flex flex-col justify-between group shadow-xs"
                >
                  <div className="flex gap-3">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-16 h-16 rounded-lg object-cover border border-border/50 shrink-0 bg-muted/30"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-center shrink-0 text-muted-foreground">
                        <ShoppingBag size={20} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-xs leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                      {product.price !== null && (
                        <p className="text-sm font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                          {Number(product.price).toFixed(2)} {product.currency}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="px-1.5 py-0.5 bg-muted/40 text-[10px] font-mono rounded text-muted-foreground border border-border/40">
                          {product.competitorName}
                        </span>
                        {product.sku && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            SKU: {product.sku}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {product.url && (
                    <div className="mt-3 pt-2.5 border-t border-border/50 flex justify-end">
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                      >
                        <span>{t('competitors.viewProduct')}</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Your Products Catalog Overview */}
        {yourProducts.length > 0 && analysis && (
          <div className="space-y-3 pt-4 border-t border-border/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  {t('competitors.yourProducts')}
                </h2>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {yourProducts.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {yourProducts.slice(0, 12).map(p => (
                <div key={p.id} className="bg-card border border-border/60 rounded-lg p-2.5 hover:border-border transition-colors">
                  <h4 className="font-medium text-xs truncate text-foreground">{p.name}</h4>
                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    {p.price !== null && (
                      <span className="font-mono tabular-nums font-semibold text-muted-foreground">
                        {Number(p.price).toFixed(2)} {t('competitors.currency')}
                      </span>
                    )}
                    {p.sku && (
                      <span className="font-mono text-muted-foreground/80 text-[10px]">
                        {p.sku}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty / Initial State */}
        {!analysis && !isLoading && (
          <div className="py-16 text-center border border-dashed border-border/70 rounded-xl bg-card/40">
            <Filter size={36} className="mx-auto text-muted-foreground/60 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">
              {t('competitors.selectCompetitor')}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Select an active competitor from the top bar and click Analyze to uncover untracked catalog gaps.
            </p>
          </div>
        )}

        {gaps.length === 0 && analysis && !isLoading && (
          <div className="py-16 text-center border border-dashed border-border/70 rounded-xl bg-card/40">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">{t('competitors.noGaps')}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t('competitors.noGapsDesc')}</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default GapAnalysis;
