import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Scale, CheckCircle2, AlertCircle, Minus, RefreshCw, ArrowUpRight, ArrowDownRight, Layers, Sparkles } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import CompetitorStatusBar, { type CompetitorStatus } from './CompetitorStatusBar';
import { updateCompetitorStatus } from './useCompetitorStatus';
import i18n from '../../i18n';

interface ComparisonItem {
  competitorProduct: {
    id: string;
    name: string;
    price: number | null;
    currency: string;
    sku: string | null;
  };
  yourProduct: {
    id: string;
    name: string;
    price: number | null;
    sku: string | null;
  } | null;
  status: 'cheaper' | 'expensive' | 'equal' | 'missing';
  priceDiff: number | null;
  priceDiffPercent: number | null;
}

const Comparison: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [competitorId, setCompetitorId] = useState('');
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [comparisons, setComparisons] = useState<ComparisonItem[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetchCompetitors();
  }, []);

  const fetchCompetisons = async () => {
    if (!competitorId) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/competitors/${competitorId}/price-compare`);
      if (res.data.success) {
        const data = res.data.data;
        const prods = data.products || [];
        const yours = data.yourProducts || [];

        const comps: ComparisonItem[] = prods.map((cp: any) => {
          const match = yours.find((yp: any) =>
            yp.sku === cp.sku ||
            yp.name.toLowerCase().includes(cp.name.toLowerCase().slice(0, 10))
          );
          let status: ComparisonItem['status'] = 'missing';
          let priceDiff = null;
          let priceDiffPercent = null;

          if (match) {
            const cpPrice = Number(cp.price) || 0;
            const ypPrice = Number(match.price) || 0;
            if (cpPrice < ypPrice) {
              status = 'expensive';
              priceDiff = ypPrice - cpPrice;
            } else if (cpPrice > ypPrice) {
              status = 'cheaper';
              priceDiff = cpPrice - ypPrice;
            } else {
              status = 'equal';
            }
            priceDiffPercent = ypPrice ? ((priceDiff / ypPrice) * 100).toFixed(1) : null;
          }

          return {
            competitorProduct: cp,
            yourProduct: match,
            status,
            priceDiff,
            priceDiffPercent: priceDiffPercent ? Number(priceDiffPercent) : null,
          };
        });

        setComparisons(comps);
        setSummary({
          total: comps.length,
          cheaper: comps.filter(c => c.status === 'cheaper').length,
          expensive: comps.filter(c => c.status === 'expensive').length,
          equal: comps.filter(c => c.status === 'equal').length,
          missing: comps.filter(c => c.status === 'missing').length,
        });
      }
    } catch {
      console.error('Failed to compare');
    }
    setIsLoading(false);
  };

  const fetchCompetitors = async () => {
    try {
      const res = await apiClient.get('/competitors', { params: { isActive: 'true' } });
      if (res.data.success) setCompetitors(res.data.data || []);
    } catch {
      console.error('Failed to fetch competitors');
    }
  };

  const selectedCompetitor = competitors.find(c => c.id === competitorId);

  return (
    <div className="w-full min-h-screen bg-background text-foreground" dir={i18n.dir()}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Top Command Bar */}
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
                <h1 className="text-xl font-bold tracking-tight">{t('competitors.comparison')}</h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  HEAD-TO-HEAD
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Benchmark competitor catalog pricing directly against your store offerings
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px] sm:min-w-[240px]">
              <select
                value={competitorId}
                onChange={e => setCompetitorId(e.target.value)}
                className="w-full text-xs h-9 px-3 pr-8 rounded-lg border border-border/70 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="">{t('competitors.selectCompetitorCompare')}...</option>
                {competitors.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchCompetisons}
              disabled={!competitorId || isLoading}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Scale size={14} />
              )}
              <span>{t('competitors.compare')}</span>
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

        {/* Telemetry Summary Ribbon */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 bg-card border border-border/70 rounded-xl p-3 shadow-xs">
            <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t('competitors.totalProducts')}
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {summary.total}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Matched items checked</div>
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t('competitors.cheaper')}
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                {summary.cheaper}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Your price is lower</div>
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t('competitors.yourPriceHigher')}
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-1">
                {summary.expensive}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Your price is higher</div>
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t('competitors.equal')}
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-muted-foreground mt-1">
                {summary.equal}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Identical retail price</div>
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border/40 col-span-2 sm:col-span-1">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t('competitors.gaps')}
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
                {summary.missing}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Catalog gaps found</div>
            </div>
          </div>
        )}

        {/* Head-to-Head Comparison Matrix */}
        {comparisons.length > 0 && (
          <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
            <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-muted/30 border-b border-border/70 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-5">{t('competitors.competitorProduct')}</div>
              <div className="col-span-2 text-center">{t('competitors.status')}</div>
              <div className="col-span-5 text-end">{t('competitors.yourProduct')} &amp; {t('competitors.diff')}</div>
            </div>

            <div className="divide-y divide-border/60">
              {comparisons.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-muted/10 transition-colors">
                  {/* Competitor Product Info */}
                  <div className="col-span-5 min-w-0">
                    <div className="font-semibold text-xs text-foreground truncate">
                      {item.competitorProduct.name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {item.competitorProduct.sku && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          SKU: {item.competitorProduct.sku}
                        </span>
                      )}
                      {item.competitorProduct.price !== null && (
                        <span className="text-xs font-bold font-mono tabular-nums text-foreground">
                          {Number(item.competitorProduct.price).toFixed(2)} {item.competitorProduct.currency}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="col-span-2 flex justify-center">
                    {item.status === 'cheaper' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <ArrowDownRight size={12} />
                        CHEAPER
                      </span>
                    )}
                    {item.status === 'expensive' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        <ArrowUpRight size={12} />
                        HIGHER
                      </span>
                    )}
                    {item.status === 'equal' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/60">
                        <Minus size={12} />
                        EQUAL
                      </span>
                    )}
                    {item.status === 'missing' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <AlertCircle size={12} />
                        GAP
                      </span>
                    )}
                  </div>

                  {/* Your Product & Variance */}
                  <div className="col-span-5 text-end min-w-0">
                    {item.yourProduct ? (
                      <div>
                        <div className="font-semibold text-xs text-foreground truncate">
                          {item.yourProduct.name}
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          {item.yourProduct.sku && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {item.yourProduct.sku}
                            </span>
                          )}
                          {item.yourProduct.price !== null && (
                            <span className="text-xs font-bold font-mono tabular-nums text-foreground">
                              {Number(item.yourProduct.price).toFixed(2)} {item.competitorProduct.currency}
                            </span>
                          )}
                          {item.priceDiff !== null && (
                            <span className={`text-[11px] font-mono tabular-nums font-semibold ${
                              item.status === 'cheaper'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : item.status === 'expensive'
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-muted-foreground'
                            }`}>
                              ({item.status === 'cheaper' ? '-' : '+'}{item.priceDiff.toFixed(2)})
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                        <AlertCircle size={13} />
                        <span>{t('competitors.notInYourCatalog')}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {comparisons.length === 0 && !isLoading && (
          <div className="py-16 text-center border border-dashed border-border/70 rounded-xl bg-card/40">
            <Layers size={36} className="mx-auto text-muted-foreground/60 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">
              {t('competitors.selectCompetitorCompare')}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Select a competitor above and run comparison to generate side-by-side pricing intelligence.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Comparison;
