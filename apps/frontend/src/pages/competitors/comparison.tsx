import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Scale, CheckCircle, XCircle, Minus, RefreshCw } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
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

  useEffect(() => { fetchCompetitors(); }, []);

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
          const match = yours.find((yp: any) => yp.sku === cp.sku || yp.name.toLowerCase().includes(cp.name.toLowerCase().slice(0, 10)));
          let status: ComparisonItem['status'] = 'missing';
          let priceDiff = null, priceDiffPercent = null;

          if (match) {
            const cpPrice = Number(cp.price) || 0;
            const ypPrice = Number(match.price) || 0;
            if (cpPrice < ypPrice) { status = 'expensive'; priceDiff = ypPrice - cpPrice; }
            else if (cpPrice > ypPrice) { status = 'cheaper'; priceDiff = cpPrice - ypPrice; }
            else { status = 'equal'; }
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
    } catch { console.error('Failed to compare'); }
    setIsLoading(false);
  };

  const fetchCompetitors = async () => {
    try {
      const res = await apiClient.get('/competitors', { params: { isActive: 'true' } });
      if (res.data.success) setCompetitors(res.data.data || []);
    } catch { console.error('Failed to fetch competitors'); }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'cheaper': return <ArrowRight size={16} className="text-green-500" />;
      case 'expensive': return <ArrowRight size={16} className="text-red-500" />;
      case 'equal': return <Minus size={16} className="text-gray-400" />;
      case 'missing': return <XCircle size={16} className="text-orange-400" />;
      default: return null;
    }
  };

  return (
    <div className="p-6" dir={i18n.dir()}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/competitors')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          {i18n.dir() === 'rtl' ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
        </button>
        <h1 className="text-2xl font-bold">{t('competitors.comparison')}</h1>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{t('competitors.selectCompetitorCompare')}</h2>
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
            onClick={fetchCompetisons}
            disabled={!competitorId || isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <Scale size={18} />}
            {t('competitors.compare')}
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border text-center">
            <div className="text-2xl font-bold text-gray-700">{summary.total}</div>
            <div className="text-xs text-gray-500">{t('competitors.totalProducts')}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border text-center">
            <div className="text-2xl font-bold text-green-600">{summary.cheaper}</div>
            <div className="text-xs text-green-700 dark:text-green-400">{t('competitors.cheaper')}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border text-center">
            <div className="text-2xl font-bold text-red-600">{summary.expensive}</div>
            <div className="text-xs text-red-700 dark:text-red-400">{t('competitors.yourPriceHigher')}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border text-center">
            <div className="text-2xl font-bold text-gray-600">{summary.equal}</div>
            <div className="text-xs text-gray-500">{t('competitors.equal')}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border text-center">
            <div className="text-2xl font-bold text-orange-600">{summary.missing}</div>
            <div className="text-xs text-orange-700 dark:text-orange-400">{t('competitors.gaps')}</div>
          </div>
        </div>
      )}

      {comparisons.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-semibold border-b">
            <div className="col-span-4">{t('competitors.competitorProduct')}</div>
            <div className="col-span-1 text-center">{t('competitors.status')}</div>
            <div className="col-span-4">{t('competitors.yourProduct')}</div>
            <div className="col-span-3 text-right">{t('competitors.diff')}</div>
          </div>
          <div className="divide-y dark:divide-gray-700">
            {comparisons.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-4 px-4 py-3 items-center">
                <div className="col-span-4">
                  <div className="font-medium text-sm">{item.competitorProduct.name}</div>
                  {item.competitorProduct.sku && <div className="text-xs text-gray-500">SKU: {item.competitorProduct.sku}</div>}
                  {item.competitorProduct.price && (
                    <div className="text-lg font-bold text-red-600">
                      {Number(item.competitorProduct.price).toFixed(2)} {item.competitorProduct.currency}
                    </div>
                  )}
                </div>
                <div className="col-span-1 flex justify-center">
                  <StatusIcon status={item.status} />
                </div>
                <div className="col-span-4">
                  {item.yourProduct ? (
                    <>
                      <div className="font-medium text-sm">{item.yourProduct.name}</div>
                      {item.yourProduct.sku && <div className="text-xs text-gray-500">SKU: {item.yourProduct.sku}</div>}
                      {item.yourProduct.price && (
                        <div className="text-lg font-bold text-green-600">
                          {Number(item.yourProduct.price).toFixed(2)} EGP
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-orange-500 flex items-center gap-1">
                      <XCircle size={14} />
                      {t('competitors.notInYourCatalog')}
                    </div>
                  )}
                </div>
                <div className="col-span-3 text-right">
                  {item.priceDiff !== null && item.status !== 'missing' && (
                    <div className={`text-sm font-medium ${item.status === 'cheaper' ? 'text-green-600' : item.status === 'expensive' ? 'text-red-600' : 'text-gray-500'}`}>
                      {item.status === 'cheaper' ? '+' : item.status === 'expensive' ? '-' : ''}{item.priceDiff.toFixed(2)} EGP
                      {item.priceDiffPercent !== null && ` (${item.priceDiffPercent}%)`}
                    </div>
                  )}
                  {item.status === 'missing' && (
                    <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded">
                      {t('competitors.opportunity')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Comparison;
