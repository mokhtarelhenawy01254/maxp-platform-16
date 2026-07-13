import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Pencil, Trash2, X, AlertTriangle, Filter } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import i18n from '../../i18n';

interface Feature {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  competitorId: string;
}

const PRIORITIES = ['high', 'medium', 'low'] as const;
const STATUSES = ['pending', 'in_progress', 'completed', 'deferred'] as const;

const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  deferred: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

const CompetitorFeatures: React.FC<Props> = ({ competitorId }) => {
  const { t } = useTranslation();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', priority: 'medium', status: 'pending' });
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchFeatures = useCallback(async () => {
    if (!competitorId) return;
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const res = await apiClient.get(`/competitors/${competitorId}/features`, { params });
      if (res.data.success) setFeatures(res.data.data || []);
    } catch {
      console.error('Failed to fetch features');
    } finally {
      setIsLoading(false);
    }
  }, [competitorId, search, statusFilter, priorityFilter]);

  useEffect(() => { fetchFeatures(); }, [fetchFeatures]);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ title: '', description: '', priority: 'medium', status: 'pending' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (f: Feature) => {
    setEditingId(f.id);
    setFormData({
      title: f.title,
      description: f.description || '',
      priority: f.priority,
      status: f.status,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError(t('competitors.features.titleRequired'));
      return;
    }
    try {
      if (editingId) {
        await apiClient.put(`/competitors/${competitorId}/features/${editingId}`, formData);
      } else {
        await apiClient.post(`/competitors/${competitorId}/features`, formData);
      }
      setShowModal(false);
      fetchFeatures();
    } catch {
      setFormError(editingId ? t('competitors.errors.updateFailed') : t('competitors.errors.createFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/competitors/${competitorId}/features/${id}`);
      setDeleteConfirm(null);
      fetchFeatures();
    } catch {
      console.error('Failed to delete feature');
    }
  };

  const handleStatusChange = async (featureId: string, newStatus: string) => {
    try {
      await apiClient.put(`/competitors/${competitorId}/features/${featureId}`, { status: newStatus });
      fetchFeatures();
    } catch {
      console.error('Failed to update status');
    }
  };

  const statCounts = {
    total: features.length,
    pending: features.filter(f => f.status === 'pending').length,
    in_progress: features.filter(f => f.status === 'in_progress').length,
    completed: features.filter(f => f.status === 'completed').length,
    deferred: features.filter(f => f.status === 'deferred').length,
  };

  const sortedFeatures = [...features].sort((a, b) => {
    const statusOrder = { pending: 0, in_progress: 1, deferred: 2, completed: 3 };
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] || 0) - (statusOrder[b.status as keyof typeof statusOrder] || 0);
    if (statusDiff !== 0) return statusDiff;
    return (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 0);
  });

  return (
    <div dir={i18n.dir()}>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {[
          { label: t('competitors.features.stats.total'), value: statCounts.total, color: 'bg-gray-50 dark:bg-gray-800/50' },
          { label: t('competitors.features.stats.pending'), value: statCounts.pending, color: 'bg-gray-50 dark:bg-gray-800/50' },
          { label: t('competitors.features.stats.inProgress'), value: statCounts.in_progress, color: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: t('competitors.features.stats.completed'), value: statCounts.completed, color: 'bg-green-50 dark:bg-green-900/20' },
          { label: t('competitors.features.stats.deferred'), value: statCounts.deferred, color: 'bg-orange-50 dark:bg-orange-900/20' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.color} rounded-lg p-3 text-center`}>
            <div className="text-xl font-bold">{stat.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('competitors.features.searchFeatures')}
            className="w-full ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 outline-none"
        >
          <option value="">{t('competitors.features.filterAll')} {t('competitors.features.status')}</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{t(`competitors.features.${s}`)}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 outline-none"
        >
          <option value="">{t('competitors.features.filterAll')} {t('competitors.features.priority')}</option>
          {PRIORITIES.map(p => (
            <option key={p} value={p}>{t(`competitors.features.${p}`)}</option>
          ))}
        </select>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap"
        >
          <Plus size={16} />
          {t('competitors.features.addFeature')}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500 py-8">{t('common.loading')}</div>
      ) : sortedFeatures.length === 0 ? (
        <div className="text-center text-gray-500 py-12 border-2 border-dashed rounded-lg dark:border-gray-700">
          <p className="text-lg mb-2">{t('competitors.features.noFeatures')}</p>
          <button onClick={openCreate} className="text-blue-600 hover:underline text-sm">
            {t('competitors.features.addFeature')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedFeatures.map(f => (
            <div
              key={f.id}
              className="border rounded-lg p-4 dark:border-gray-700 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-sm">{f.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[f.priority] || priorityColors.medium}`}>
                      {t(`competitors.features.${f.priority}`)}
                    </span>
                  </div>
                  {f.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap line-clamp-2">
                      {f.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>{t('competitors.features.createdAt')}: {new Date(f.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                    <span>{t('competitors.features.updatedAt')}: {new Date(f.updatedAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={f.status}
                    onChange={e => handleStatusChange(f.id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer outline-none ${statusColors[f.status] || statusColors.pending}`}
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{t(`competitors.features.${s}`)}</option>
                    ))}
                  </select>
                  <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Pencil size={14} className="text-gray-500" />
                  </button>
                  <button onClick={() => setDeleteConfirm(f.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="font-semibold text-lg">
                {editingId ? t('competitors.features.editFeature') : t('competitors.features.addFeature')}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <AlertTriangle size={16} />
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">{t('competitors.features.titleField')}</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('competitors.features.description')}</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('competitors.features.priority')}</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 outline-none"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>{t(`competitors.features.${p}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('competitors.features.status')}</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 outline-none"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{t(`competitors.features.${s}`)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  {editingId ? t('common.save') : t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold">{t('competitors.features.deleteFeature')}</h3>
                <p className="text-sm text-gray-500">{t('competitors.features.confirmDelete')}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitorFeatures;
