import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Plus, Pencil, Trash2, AlertTriangle, ExternalLink, Eye, Calendar } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import CompetitorStatusBar from './CompetitorStatusBar';
import GlobalCompetitorStatusBar, { type StatusFilter } from './GlobalCompetitorStatusBar';
import { updateCompetitorStatus, useCompetitorStatusSync } from './useCompetitorStatus';
import type { CompetitorStatus } from './CompetitorStatusBar';
import { getLocalizedDateTime } from '../../utils/localization';
import i18n from '../../i18n';

interface SocialProfile {
  id: string;
  platform: string;
  profileUrl: string;
}

interface Competitor {
  id: string;
  name: string;
  url: string | null;
  platform: string;
  logo: string | null;
  activityType: string | null;
  location: string | null;
  targetMarket: string | null;
  foundedYear: number | null;
  strengths: string | null;
  weaknesses: string | null;
  isActive: boolean;
  status: string;
  createdAt: string;
  socialProfiles: SocialProfile[];
  _count: { products: number; ads: number; reports: number };
}

interface StatusCounts {
  total: number;
  NEW: number;
  FOLLOWING: number;
  COMPLETED: number;
}

const SOCIAL_PLATFORMS = [
  { key: 'instagram', labelKey: 'social.instagram', icon: '📸' },
  { key: 'facebook', labelKey: 'social.facebook', icon: '📘' },
  { key: 'twitter', labelKey: 'social.twitter', icon: '🐦' },
  { key: 'tiktok', labelKey: 'social.tiktok', icon: '🎵' },
  { key: 'linkedin', labelKey: 'social.linkedin', icon: '💼' },
  { key: 'youtube', labelKey: 'social.youtube', icon: '▶️' },
  { key: 'snapchat', labelKey: 'social.snapchat', icon: '👻' },
  { key: 'telegram', labelKey: 'social.telegram', icon: '✈️' },
  { key: 'whatsapp', labelKey: 'social.whatsapp', icon: '💬' },
];

const CompetitorList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ total: 0, NEW: 0, FOLLOWING: 0, COMPLETED: 0 });
  const [countsLoading, setCountsLoading] = useState(false);

  const fetchStatusCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const res = await apiClient.get('/competitors/status-counts');
      if (res.data.success) setStatusCounts(res.data.data);
    } catch {
      console.error('Failed to fetch status counts');
    } finally {
      setCountsLoading(false);
    }
  }, []);

  const fetchCompetitors = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await apiClient.get('/competitors', { params });
      if (res.data.success) setCompetitors(res.data.data || []);
    } catch {
      console.error('Failed to fetch competitors');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchCompetitors(); }, [fetchCompetitors]);
  useEffect(() => { fetchStatusCounts(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useCompetitorStatusSync((competitorId, status) => {
    setCompetitors(prev => prev.map(c => c.id === competitorId ? { ...c, status } : c));
    fetchStatusCounts();
  });

  const handleStatusChange = async (id: string, newStatus: CompetitorStatus) => {
    const prevStatus = competitors.find(c => c.id === id)?.status;
    setCompetitors(existing => existing.map(c => c.id === id ? { ...c, status: newStatus } : c));
    setStatusCounts(prev => {
      const next = { ...prev };
      if (prevStatus && prevStatus in next) next[prevStatus as keyof StatusCounts] = Math.max(0, next[prevStatus as keyof StatusCounts] - 1);
      next[newStatus] = (next[newStatus] || 0) + 1;
      return next;
    });
    const ok = await updateCompetitorStatus(id, newStatus);
    if (!ok && prevStatus) {
      setCompetitors(existing => existing.map(c => c.id === id ? { ...c, status: prevStatus } : c));
      setStatusCounts(prev => {
        const next = { ...prev };
        next[newStatus] = Math.max(0, (next[newStatus] || 0) - 1);
        if (prevStatus in next) next[prevStatus as keyof StatusCounts] = (next[prevStatus as keyof StatusCounts] || 0) + 1;
        return next;
      });
    }
    fetchStatusCounts();
  };

  const handleStatusFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/competitors/${id}`);
      setDeleteConfirm(null);
      fetchCompetitors();
      fetchStatusCounts();
    } catch {
      console.error('Failed to delete');
    }
  };

  return (
    <div className="p-6" dir={i18n.dir()}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('competitors.title')}</h1>
        <div className="flex gap-2">
          <button onClick={() => { fetchCompetitors(); fetchStatusCounts(); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => navigate('/competitors/add')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={18} />
            {t('competitors.addCompetitor')}
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('competitors.searchCompetitors')}
          className="w-full ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
        />
      </div>

      <div className="mb-6">
        <GlobalCompetitorStatusBar
          selectedFilter={statusFilter}
          onFilterChange={handleStatusFilterChange}
          counts={statusCounts}
          isLoading={countsLoading}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : competitors.length === 0 ? (
        <div className="text-center py-12 text-gray-500">{t('competitors.noCompetitors')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {competitors.map(c => (
            <div key={c.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {c.logo ? (
                    <img src={c.logo} alt={c.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 font-bold text-lg">
                      {c.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">{c.name}</h3>
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      <CompetitorStatusBar
                        currentStatus={c.status}
                        competitorId={c.id}
                        onChange={(newStatus) => handleStatusChange(c.id, newStatus)}
                        size="sm"
                      />
                      {c.activityType && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          {t(`competitors.activityTypes.${c.activityType}`)}
                        </span>
                      )}
                      {c.location && (
                        <span className="text-xs text-gray-400">📍 {c.location}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => navigate(`/competitors/${c.id}`)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Eye size={16} />
                  </button>
                  <button onClick={() => navigate(`/competitors/${c.id}/edit`)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setDeleteConfirm(c.id)} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {c.url && (
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-2 text-sm text-blue-500 hover:underline">
                  <ExternalLink size={14} />
                  {c.url.replace(/^https?:\/\//, '').slice(0, 40)}
                </a>
              )}
              {c.socialProfiles && c.socialProfiles.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  {c.socialProfiles.map(sp => {
                    const platform = SOCIAL_PLATFORMS.find(p => p.key === sp.platform);
                    if (!platform) return null;
                    return (
                      <a
                        key={sp.id || sp.platform}
                        href={sp.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t(`competitors.${platform.labelKey}`)}
                        className="text-sm hover:opacity-70 transition-opacity"
                      >
                        {platform.icon}
                      </a>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                <Calendar size={11} className="shrink-0" />
                <span dir="ltr" className="whitespace-nowrap">{getLocalizedDateTime(c.createdAt)}</span>
              </div>
              <div className="flex gap-4 mt-2 text-sm text-gray-500">
                <span>{c._count.products} {t('competitors.products')}</span>
                <span>{c._count.ads} {t('competitors.adsTab')}</span>
                <span>{c._count.reports} {t('competitors.reports')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-red-500 mb-4">
              <AlertTriangle size={20} />
              <h2 className="text-lg font-bold">{t('common.confirm')}</h2>
            </div>
            <p className="mb-4">{t('competitors.deleteConfirm')}</p>
            <div className="flex gap-2 ltr:justify-end rtl:justify-start">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                {t('common.cancel')}
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitorList;
