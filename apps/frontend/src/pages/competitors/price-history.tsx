import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, TrendingDown, TrendingUp, Minus, RefreshCw, Calendar, Clock, BarChart3, Package } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CompetitorStatusBar, { type CompetitorStatus } from './CompetitorStatusBar';
import { updateCompetitorStatus } from './useCompetitorStatus';
import i18n from '../../i18n';

interface PricePoint {
  id: string;
  price: number;
  currency: string;
  recordedAt: string;
  notes: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number | null;
  currency: string;
  image: string | null;
  sku: string | null;
  lastSeen: string;
}

const PriceHistory: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { competitorId, productId } = useParams<{ competitorId: string; productId?: string }>();
  const [competitor, setCompetitor] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>(productId || '');
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (competitorId) {
      fetchCompetitor();
      fetchProducts();
    }
  }, [competitorId]);

  useEffect(() => {
    if (selectedProduct) {
      fetchPriceHistory();
    }
  }, [selectedProduct]);

  const fetchCompetitor = async () => {
    try {
      const res = await apiClient.get(`/competitors/${competitorId}`);
      if (res.data.success) setCompetitor(res.data.data);
    } catch {
      console.error('Failed to fetch competitor');
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get(`/competitors/${competitorId}/products`);
      if (res.data.success) setProducts(res.data.data || []);
    } catch {
      console.error('Failed to fetch products');
    }
  };

  const fetchPriceHistory = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/competitors/${competitorId}/products/${selectedProduct}/price-history`);
      if (res.data.success) setPriceHistory(res.data.data || []);
    } catch {
      console.error('Failed to fetch price history');
    }
    setIsLoading(false);
  };

  const chartData = priceHistory.map(p => ({
    date: new Date(p.recordedAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' }),
    price: Number(p.price),
    fullDate: p.recordedAt,
  }));

  const currentPrice = priceHistory[priceHistory.length - 1]?.price;
  const firstPrice = priceHistory[0]?.price;
  const priceDiff = currentPrice && firstPrice ? currentPrice - firstPrice : 0;
  const priceDiffPercent = firstPrice ? ((priceDiff / firstPrice) * 100).toFixed(1) : '0.0';

  const trend = priceDiff > 0 ? 'up' : priceDiff < 0 ? 'down' : 'stable';

  return (
    <div className="w-full min-h-screen bg-background text-foreground" dir={i18n.dir()}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Top Command Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/competitors/${competitorId || ''}`)}
              className="p-2 rounded-lg border border-border/60 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
              title={t('common.back')}
            >
              {i18n.dir() === 'rtl' ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{t('competitors.priceHistory')}</h1>
                {competitor && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted/40 border border-border/60 text-muted-foreground">
                    {competitor.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track historical price shifts, discounts, and margin pressures over time
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Product Selector */}
            <div className="relative min-w-[220px] sm:min-w-[280px]">
              <select
                value={selectedProduct}
                onChange={e => setSelectedProduct(e.target.value)}
                className="w-full text-xs h-9 px-3 pr-8 rounded-lg border border-border/70 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="">{t('competitors.selectProduct')}...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.price ? `(${Number(p.price).toFixed(2)})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {competitor && (
              <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-border/60">
                <CompetitorStatusBar
                  currentStatus={competitor.status || 'NEW'}
                  competitorId={competitor.id}
                  onChange={(newStatus) => updateCompetitorStatus(competitor.id, newStatus)}
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Telemetry Stats Ribbon */}
        {selectedProduct && priceHistory.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-card border border-border/70 rounded-xl p-3 shadow-xs">
            <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t('competitors.currentPrice')}
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {currentPrice?.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">{priceHistory[0]?.currency}</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Most recent recorded price</div>
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t('competitors.startPrice')}
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {firstPrice?.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">{priceHistory[0]?.currency}</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Initial catalog baseline</div>
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t('competitors.priceChange')}
              </div>
              <div className={`text-2xl font-bold font-mono tabular-nums flex items-center gap-1 mt-1 ${
                trend === 'up'
                  ? 'text-rose-600 dark:text-rose-400'
                  : trend === 'down'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground'
              }`}>
                {trend === 'up' ? <TrendingUp size={18} /> : trend === 'down' ? <TrendingDown size={18} /> : <Minus size={18} />}
                <span>{priceDiff > 0 ? '+' : ''}{priceDiff?.toFixed(2)}</span>
                <span className="text-xs font-normal">({priceDiffPercent}%)</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Net baseline variance</div>
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t('competitors.dataPoints')}
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-primary mt-1">
                {priceHistory.length}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Historical observations</div>
            </div>
          </div>
        )}

        {/* Price History Chart */}
        {selectedProduct && priceHistory.length > 0 && (
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-primary" />
                <h3 className="text-sm font-bold tracking-tight text-foreground">
                  {t('competitors.priceChart')}
                </h3>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                TIMELINE CURVE
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderColor: 'rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    }}
                    labelFormatter={(label, payload) =>
                      payload?.[0]?.payload?.fullDate
                        ? new Date(payload[0].payload.fullDate).toLocaleString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')
                        : label
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={trend === 'up' ? '#f43f5e' : trend === 'down' ? '#10b981' : '#6366f1'}
                    strokeWidth={2.5}
                    dot={{ fill: '#6366f1', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 6, fill: trend === 'up' ? '#f43f5e' : trend === 'down' ? '#10b981' : '#6366f1' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Price History Timeline Log */}
        {selectedProduct && priceHistory.length > 0 && (
          <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-border/70 bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-muted-foreground" />
                <span className="text-xs font-bold text-foreground">
                  {t('competitors.priceTimeline')}
                </span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                {priceHistory.length} logs
              </span>
            </div>

            <div className="divide-y divide-border/60">
              {priceHistory.slice().reverse().map((point, idx) => (
                <div key={point.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-primary ring-2 ring-primary/20' : 'bg-muted-foreground/40'}`} />
                    <span className="text-xs text-foreground font-mono">
                      {new Date(point.recordedAt).toLocaleString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold font-mono tabular-nums text-foreground">
                      {Number(point.price).toFixed(2)} {point.currency}
                    </span>
                    {point.notes && (
                      <span className="text-[11px] text-muted-foreground max-w-xs truncate hidden sm:inline">
                        {point.notes}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty States */}
        {!selectedProduct && (
          <div className="py-16 text-center border border-dashed border-border/70 rounded-xl bg-card/40">
            <Package size={36} className="mx-auto text-muted-foreground/60 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">
              {t('competitors.selectProduct')}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Choose a monitored competitor item from the dropdown above to inspect price trends and audit logs.
            </p>
          </div>
        )}

        {selectedProduct && priceHistory.length === 0 && !isLoading && (
          <div className="py-16 text-center border border-dashed border-border/70 rounded-xl bg-card/40">
            <Calendar size={36} className="mx-auto text-muted-foreground/60 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">
              {t('competitors.noPriceHistory')}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              No historical price revisions recorded yet for this product.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default PriceHistory;
