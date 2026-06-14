import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, RefreshCw, BarChart2, TrendingUp, Scale, History, Settings, Instagram, Share2, Crosshair, Lightbulb } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import CompetitorFeatures from './CompetitorFeatures';

interface CompetitorProduct {
  id: string;
  name: string;
  price: number | null;
  comparePrice: number | null;
  currency: string;
  image: string | null;
  url: string | null;
  sku: string | null;
  isAvailable: boolean;
  category: string | null;
  lastSeen: string;
}

interface CompetitorAd {
  id: string;
  platform: string;
  copy: string | null;
  headline: string | null;
  cta: string | null;
  creativeUrl: string | null;
  status: string;
  lastSeen: string;
}

interface CompetitorReport {
  id: string;
  type: string;
  title: string;
  summary: string;
  generatedAt: string;
}

const CompetitorDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<string>('overview');
  const [competitor, setCompetitor] = useState<any>(null);
  const [products, setProducts] = useState<CompetitorProduct[]>([]);
  const [ads, setAds] = useState<CompetitorAd[]>([]);
  const [reports, setReports] = useState<CompetitorReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/competitors/${id}`);
      if (res.data.success) {
        setCompetitor(res.data.data);
        setProducts(res.data.data.products || []);
        setAds(res.data.data.ads || []);
        setReports(res.data.data.reports || []);
      }
    } catch {
      console.error('Failed to fetch competitor');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const generateReport = async (type: string) => {
    if (!id) return;
    try {
      await apiClient.post(`/competitors/${id}/reports/generate`, { type });
      fetchData();
    } catch {
      console.error('Failed to generate report');
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">{t('common.loading')}</div>;
  }

  if (!competitor) {
    return <div className="p-6 text-center text-gray-500">{t('common.no_data')}</div>;
  }

  const tabs = [
    { key: 'overview', label: t('competitors.overview') },
    { key: 'products', label: t('competitors.productsTab') },
    { key: 'social', label: t('competitors.social.overview'), icon: <Instagram size={14} /> },
    { key: 'ads', label: t('competitors.ads.overview'), icon: <Share2 size={14} /> },
    { key: 'features', label: t('competitors.features.title'), icon: <Lightbulb size={14} /> },
    { key: 'platforms', label: t('competitors.platforms.techStack'), icon: <TrendingUp size={14} /> },
    { key: 'reports', label: t('competitors.reportsTab') },
  ] as const;

  return (
    <div className="p-6" dir="auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/competitors')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">{competitor.name}</h1>
        {competitor.url && (
          <a href={competitor.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1 text-sm">
            <ExternalLink size={14} />
            {competitor.url.replace(/^https?:\/\//, '').slice(0, 40)}
          </a>
        )}
        <button onClick={fetchData} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ml-auto">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {competitor._count && (
          <div className="flex gap-6 text-sm text-gray-500">
            <span className="bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
              {competitor._count.products} {t('competitors.products')}
            </span>
            <span className="bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full">
              {competitor._count.ads} {t('competitors.ads')}
            </span>
            <span className="bg-purple-50 dark:bg-purple-900/30 px-3 py-1 rounded-full">
              {competitor._count.reports} {t('competitors.reports')}
            </span>
          </div>
        )}
        <div className="flex gap-2 mr-auto">
          <button
            onClick={() => navigate(`/competitors/${id}/price-compare`)}
            className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            title={t('competitors.comparison')}
          >
            <Scale size={14} />
            {t('competitors.comparison')}
          </button>
          <button
            onClick={() => navigate('/competitors/gap-analysis')}
            className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            title={t('competitors.gapAnalysis')}
          >
            <BarChart2 size={14} />
            {t('competitors.gapAnalysis')}
          </button>
          <button
            onClick={() => navigate(`/competitors/${id}/products/${competitor.products?.[0]?.id}/price-history`)}
            className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            title={t('competitors.priceHistory')}
            disabled={!competitor.products?.length}
          >
            <History size={14} />
            {t('competitors.priceHistory')}
          </button>
          <button
            onClick={() => navigate('/competitors/settings')}
            className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            title={t('competitors.settings')}
          >
            <Settings size={14} />
          </button>
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
          <button
            onClick={() => navigate(`/competitors/${id}/social`)}
            className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-pink-600 border-pink-200"
            title={t('competitors.social.overview')}
          >
            <Instagram size={14} />
            {t('competitors.social.overview')}
          </button>
          <button
            onClick={() => navigate(`/competitors/${id}/ads`)}
            className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-blue-600 border-blue-200"
            title={t('competitors.ads.overview')}
          >
            <Share2 size={14} />
            {t('competitors.ads.overview')}
          </button>
          <button
            onClick={() => navigate(`/competitors/${id}/platforms`)}
            className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-green-600 border-green-200"
            title={t('competitors.platforms.techStack')}
          >
            <TrendingUp size={14} />
            {t('competitors.platforms.techStack')}
          </button>
          <button
            onClick={() => navigate(`/competitors/${id}/battlecard`)}
            className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-purple-600 border-purple-200"
            title={t('competitors.battlecard.title')}
          >
            <BarChart2 size={14} />
            {t('competitors.battlecard.title')}
          </button>
          <button
            onClick={() => navigate('/competitors/auto-discover')}
            className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-yellow-600 border-yellow-200"
            title={t('competitors.autoDiscover.title')}
          >
            <Crosshair size={14} />
            {t('competitors.autoDiscover.title')}
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b mb-6">
        {tabs.map(tabItem => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === tabItem.key
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          {competitor.description && (
            <div className="border rounded-lg p-4 dark:border-gray-700">
              <h3 className="font-semibold mb-2">{t('competitors.description')}</h3>
              <p className="text-gray-600 dark:text-gray-400">{competitor.description}</p>
            </div>
          )}
          {competitor.notes && (
            <div className="border rounded-lg p-4 dark:border-gray-700">
              <h3 className="font-semibold mb-2">{t('competitors.notes')}</h3>
              <p className="text-gray-600 dark:text-gray-400">{competitor.notes}</p>
            </div>
          )}
          {competitor.strengths && (
            <div className="border rounded-lg p-4 dark:border-gray-700">
              <h3 className="font-semibold mb-2">{t('competitors.strengths')}</h3>
              <div className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {competitor.strengths.split('\n').map((line: string, i: number) => (
                  <p key={i} className={line.startsWith('-') || line.startsWith('•') ? 'mr-2' : ''}>{line}</p>
                ))}
              </div>
            </div>
          )}
          {competitor.weaknesses && (
            <div className="border rounded-lg p-4 dark:border-gray-700">
              <h3 className="font-semibold mb-2">{t('competitors.weaknesses')}</h3>
              <div className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {competitor.weaknesses.split('\n').map((line: string, i: number) => (
                  <p key={i} className={line.startsWith('-') || line.startsWith('•') ? 'mr-2' : ''}>{line}</p>
                ))}
              </div>
            </div>
          )}
          <div className="border rounded-lg p-4 dark:border-gray-700">
            <h3 className="font-semibold mb-2">{t('competitors.priceComparison')}</h3>
            {products.length > 0 ? (
              <div className="space-y-2">
                {products.slice(0, 10).map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1 border-b last:border-0 dark:border-gray-700">
                    <span className="text-sm">{p.name}</span>
                    <span className="text-sm font-medium">
                      {p.price ? `${Number(p.price).toFixed(2)} ${p.currency}` : '-'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">{t('competitors.noProducts')}</p>
            )}
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div>
          {products.length === 0 ? (
            <p className="text-gray-500">{t('competitors.noProducts')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.map(p => (
                <div key={p.id} className="border rounded-lg p-3 dark:border-gray-700">
                  <div className="flex gap-3">
                    {p.image && (
                      <img src={p.image} alt={p.name} className="w-16 h-16 rounded object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{p.name}</h4>
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {p.price ? `${Number(p.price).toFixed(2)} ${p.currency}` : '-'}
                      </p>
                      {p.sku && <p className="text-xs text-gray-500">{p.sku}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${p.isAvailable ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
                          {p.isAvailable ? t('competitors.available') : t('competitors.unavailable')}
                        </span>
                        {p.url && (
                          <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'ads' && (
        <div>
          {ads.length === 0 ? (
            <p className="text-gray-500">{t('competitors.noAds')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ads.map(a => (
                <div key={a.id} className="border rounded-lg p-3 dark:border-gray-700">
                  {a.creativeUrl && (
                    <img src={a.creativeUrl} alt="Ad" className="w-full h-40 object-cover rounded mb-2" />
                  )}
                  {a.headline && <h4 className="font-semibold text-sm">{a.headline}</h4>}
                  {a.copy && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">{a.copy}</p>}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{a.platform}</span>
                    <span>{a.status}</span>
                    {a.destinationUrl && (
                      <a href={a.destinationUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 flex items-center gap-1">
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'social' && (
        <div className="text-center py-12 text-gray-500">
          <p>{t('competitors.social.noSocialProfiles')}</p>
          <button
            onClick={() => navigate(`/competitors/${id}/social`)}
            className="mt-2 text-blue-500 hover:underline text-sm"
          >
            {t('competitors.social.overview')}
          </button>
        </div>
      )}

      {tab === 'features' && (
        <div>
          <p className="text-xs text-gray-500 mb-3">{t('competitors.features.derivedFrom')}</p>
          <CompetitorFeatures competitorId={id || ''} />
        </div>
      )}

      {tab === 'platforms' && (
        <div className="text-center py-12 text-gray-500">
          <p>{t('competitors.platforms.noPlatformData')}</p>
          <button
            onClick={() => navigate(`/competitors/${id}/platforms`)}
            className="mt-2 text-blue-500 hover:underline text-sm"
          >
            {t('competitors.platforms.techStack')}
          </button>
        </div>
      )}

      {tab === 'reports' && (
        <div>
          <div className="flex gap-2 mb-4">
            <button onClick={() => generateReport('weekly')} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              {t('competitors.generateReport')} ({t('competitors.weeklyReport')})
            </button>
            <button onClick={() => generateReport('comprehensive')} className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
              {t('competitors.generateReport')} ({t('competitors.comprehensiveReport')})
            </button>
          </div>
          {reports.length === 0 ? (
            <p className="text-gray-500">{t('competitors.noReports')}</p>
          ) : (
            <div className="space-y-3">
              {reports.map(r => (
                <div key={r.id} className="border rounded-lg p-4 dark:border-gray-700">
                  <h4 className="font-semibold">{r.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{r.summary}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                      {r.type === 'weekly' ? t('competitors.weeklyReport') : t('competitors.comprehensiveReport')}
                    </span>
                    <span>{new Date(r.generatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompetitorDetail;
