import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, TrendingDown, TrendingUp, Minus, RefreshCw, Calendar } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
    } catch { console.error('Failed to fetch competitor'); }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get(`/competitors/${competitorId}/products`);
      if (res.data.success) setProducts(res.data.data || []);
    } catch { console.error('Failed to fetch products'); }
  };

  const fetchPriceHistory = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/competitors/${competitorId}/products/${selectedProduct}/price-history`);
      if (res.data.success) setPriceHistory(res.data.data || []);
    } catch { console.error('Failed to fetch price history'); }
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
  const priceDiffPercent = firstPrice ? ((priceDiff / firstPrice) * 100).toFixed(1) : 0;

  const trend = priceDiff > 0 ? 'up' : priceDiff < 0 ? 'down' : 'stable';

  return (
    <div className="p-6" dir={i18n.dir()}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/competitors/${competitorId}`)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          {i18n.dir() === 'rtl' ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
        </button>
        <h1 className="text-2xl font-bold">{t('competitors.priceHistory')}</h1>
        {competitor && <span className="text-gray-500">— {competitor.name}</span>}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">{t('competitors.selectProduct')}</label>
        <select
          value={selectedProduct}
          onChange={e => setSelectedProduct(e.target.value)}
          className="w-full max-w-md px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">{t('common.select')}...</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name} {p.price ? `(${Number(p.price).toFixed(2)})` : ''}</option>
          ))}
        </select>
      </div>

      {selectedProduct && priceHistory.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border">
              <div className="text-sm text-gray-500 mb-1">{t('competitors.currentPrice')}</div>
              <div className="text-2xl font-bold">{currentPrice?.toFixed(2)} {priceHistory[0]?.currency}</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border">
              <div className="text-sm text-gray-500 mb-1">{t('competitors.startPrice')}</div>
              <div className="text-2xl font-bold">{firstPrice?.toFixed(2)} {priceHistory[0]?.currency}</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border">
              <div className="text-sm text-gray-500 mb-1">{t('competitors.priceChange')}</div>
              <div className={`text-2xl font-bold flex items-center gap-1 ${trend === 'up' ? 'text-red-600' : trend === 'down' ? 'text-green-600' : 'text-gray-500'}`}>
                {trend === 'up' ? <TrendingUp size={20} /> : trend === 'down' ? <TrendingDown size={20} /> : <Minus size={20} />}
                {priceDiff > 0 ? '+' : ''}{priceDiff?.toFixed(2)} ({priceDiffPercent}%)
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border">
              <div className="text-sm text-gray-500 mb-1">{t('competitors.dataPoints')}</div>
              <div className="text-2xl font-bold">{priceHistory.length}</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar size={18} />
              {t('competitors.priceChart')}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={v => `${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate ? new Date(payload[0].payload.fullDate).toLocaleString(i18n.language === 'ar' ? 'ar-SA' : 'en-US') : label}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={trend === 'up' ? '#EF4444' : trend === 'down' ? '#22C55E' : '#6B7280'}
                    strokeWidth={2}
                    dot={{ fill: '#6B7280', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: trend === 'up' ? '#EF4444' : trend === 'down' ? '#22C55E' : '#6B7280' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b dark:border-gray-700 font-semibold">{t('competitors.priceTimeline')}</div>
            <div className="divide-y dark:divide-gray-700">
              {priceHistory.slice().reverse().map((point, idx) => (
                <div key={point.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-sm">
                      {new Date(point.recordedAt).toLocaleString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold">{Number(point.price).toFixed(2)} {point.currency}</span>
                    {point.notes && <span className="text-xs text-gray-500">{point.notes}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {selectedProduct && priceHistory.length === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-500">
          <p>{t('competitors.noPriceHistory')}</p>
        </div>
      )}
    </div>
  );
};

export default PriceHistory;
