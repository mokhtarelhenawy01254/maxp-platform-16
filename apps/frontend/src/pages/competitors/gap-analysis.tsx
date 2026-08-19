import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle, ExternalLink, RefreshCw, TrendingUp } from 'lucide-react';
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
    } catch { console.error('Failed to fetch competitors'); }
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
    } catch { console.error('Failed to analyze'); }
    setIsLoading(false);
  };

  const opportunityScore = gaps.length === 0 ? 0 : Math.max(0, 100 - (gaps.length * 5));

  return (
    <div className="p-6" dir={i18n.dir()}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/competitors')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          {i18n.dir() === 'rtl' ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
        </button>
        <h1 className="text-2xl font-bold">{t('competitors.gapAnalysis')}</h1>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{t('competitors.selectCompetitor')}</h2>
          <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">{t('competitors.competitor')}</label>
            <select
              value={competitorId}
              onChange={e => setCompetitorId(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">{t('common.select')}...</option>
              {competitors.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={runAnalysis}
            disabled={!competitorId || isLoading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <TrendingUp size={18} />}
            {t('competitors.analyzeGaps')}
          </button>
        </div>
        {competitorId && (() => {
          const sel = competitors.find(c => c.id === competitorId);
          if (!sel) return null;
          return (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm font-medium">{sel.name}</span>
              <CompetitorStatusBar
                currentStatus={sel.status || 'NEW'}
                competitorId={sel.id}
                onChange={(newStatus) => updateCompetitorStatus(sel.id, newStatus)}
                size="sm"
              />
            </div>
          );
        })()}
      </div>

      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border">
            <div className="text-3xl font-bold text-purple-600">{analysis.gapCount || 0}</div>
            <div className="text-sm text-gray-500">{t('competitors.opportunities')}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border">
            <div className="text-3xl font-bold text-green-600">{analysis.catchCount || 0}</div>
            <div className="text-sm text-gray-500">{t('competitors.overlapping')}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border">
            <div className="text-3xl font-bold text-blue-600">{analysis.coverage || 0}%</div>
            <div className="text-sm text-gray-500">{t('competitors.coverageRate')}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border">
            <div className="text-3xl font-bold text-orange-600">{analysis.avgPriceDiff || 0}%</div>
            <div className="text-sm text-gray-500">{t('competitors.avgPriceDiff')}</div>
          </div>
        </div>
      )}

      {gaps.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-orange-500" />
            {t('competitors.marketGaps')} ({gaps.length})
          </h2>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-4">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              {t('competitors.gapExplanation')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gaps.map((product, idx) => (
              <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow dark:border-gray-700">
                <div className="flex gap-3">
                  {product.image && (
                    <img src={product.image} alt={product.name} className="w-20 h-20 rounded-lg object-cover" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                    {product.price && (
                      <p className="text-lg font-bold text-green-600 mt-1">
                        {Number(product.price).toFixed(2)} {product.currency}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{product.competitorName}</span>
                      {product.sku && <span>{t('competitors.skuLabel')} {product.sku}</span>}
                    </div>
                  </div>
                </div>
                {product.url && (
                  <a href={product.url} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-1 mt-3 text-sm text-blue-500 hover:underline">
                    <ExternalLink size={14} />
                    {t('competitors.viewProduct')}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {yourProducts.length > 0 && analysis && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle size={20} className="text-green-500" />
            {t('competitors.yourProducts')} ({yourProducts.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {yourProducts.slice(0, 12).map(p => (
              <div key={p.id} className="border rounded-lg p-3 dark:border-gray-700">
                <h4 className="font-medium text-sm truncate">{p.name}</h4>
                {p.price && <p className="text-sm text-gray-500">{Number(p.price).toFixed(2)} {t('competitors.currency')}</p>}
                {p.sku && <p className="text-xs text-gray-400">{t('competitors.skuLabel')} {p.sku}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {gaps.length === 0 && analysis && (
        <div className="text-center py-12">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-semibold">{t('competitors.noGaps')}</h3>
          <p className="text-gray-500 mt-2">{t('competitors.noGapsDesc')}</p>
        </div>
      )}
    </div>
  );
};

export default GapAnalysis;
