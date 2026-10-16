import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Pencil, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
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
  high: 'bg-destructive/10 text-destructive border border-destructive/20',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  low: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
};

const statusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground border border-border/60',
  in_progress: 'bg-primary/10 text-primary border border-primary/20',
  completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  deferred: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
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
      if (res.data?.success) setFeatures(res.data.data || []);
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
    <div dir={i18n.dir()} className="space-y-4 text-foreground">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {[
          { label: t('competitors.features.stats.total'), value: statCounts.total },
          { label: t('competitors.features.stats.pending'), value: statCounts.pending },
          { label: t('competitors.features.stats.inProgress'), value: statCounts.in_progress },
          { label: t('competitors.features.stats.completed'), value: statCounts.completed },
          { label: t('competitors.features.stats.deferred'), value: statCounts.deferred },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border/70 rounded-xl p-3 text-center shadow-xs">
            <div className="text-xl font-bold font-mono tabular-nums text-foreground">{stat.value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('competitors.features.searchFeatures')}
            className="w-full ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 py-2 border border-border/70 rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-border/70 rounded-lg text-xs bg-background text-foreground outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">{t('competitors.features.filterAll')} {t('competitors.features.status')}</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{t(`competitors.features.${s}`)}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border border-border/70 rounded-lg text-xs bg-background text-foreground outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">{t('competitors.features.filterAll')} {t('competitors.features.priority')}</option>
          {PRIORITIES.map(p => (
            <option key={p} value={p}>{t(`competitors.features.${p}`)}</option>
          ))}
        </select>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-xs whitespace-nowrap shadow-xs transition active:scale-[0.98]"
        >
          <Plus size={15} />
          <span>{t('competitors.features.addFeature')}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12 bg-card border border-border/70 rounded-2xl p-8 space-y-2">
          <Loader2 className="animate-spin size-6 mx-auto text-primary" />
          <p className="text-xs">{t('common.loading')}</p>
        </div>
      ) : sortedFeatures.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 border border-dashed border-border/80 rounded-2xl bg-card p-8 space-y-2">
          <p className="text-sm font-semibold text-foreground">{t('competitors.features.noFeatures')}</p>
          <button onClick={openCreate} className="text-primary hover:underline text-xs font-bold">
            {t('competitors.features.addFeature')}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedFeatures.map(f => (
            <div
              key={f.id}
              className="border border-border/70 rounded-xl p-4 bg-card hover:border-border transition-colors shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-xs sm:text-sm text-foreground">{f.title}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${priorityColors[f.priority] || priorityColors.medium}`}>
                      {t(`competitors.features.${f.priority}`)}
                    </span>
                  </div>
                  {f.description && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-2 leading-relaxed">
                      {f.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono tabular-nums pt-1">
                    <span>{t('competitors.features.createdAt')}: {new Date(f.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                    <span>{t('competitors.features.updatedAt')}: {new Date(f.updatedAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={f.status}
                    onChange={e => handleStatusChange(f.id, e.target.value)}
                    className={`text-[11px] px-2.5 py-1 rounded-md font-semibold border cursor-pointer outline-none ${statusColors[f.status] || statusColors.pending}`}
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{t(`competitors.features.${s}`)}</option>
                    ))}
                  </select>
                  <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition active:scale-[0.98]">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeleteConfirm(f.id)} className="p-1.5 rounded-lg border border-destructive/20 hover:bg-destructive/10 text-destructive transition active:scale-[0.98]">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border/70 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto text-foreground">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/60">
              <h3 className="font-bold text-sm sm:text-base text-foreground">
                {editingId ? t('competitors.features.editFeature') : t('competitors.features.addFeature')}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
              {formError && (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
                  <AlertTriangle size={15} />
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="block font-medium mb-1 text-foreground">{t('competitors.features.titleField')}</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-border/70 rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block font-medium mb-1 text-foreground">{t('competitors.features.description')}</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-border/70 rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary outline-none resize-none leading-relaxed"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-foreground">{t('competitors.features.priority')}</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-border/70 rounded-lg text-xs bg-background text-foreground outline-none focus:ring-1 focus:ring-primary"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>{t(`competitors.features.${p}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1 text-foreground">{t('competitors.features.status')}</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-border/70 rounded-lg text-xs bg-background text-foreground outline-none focus:ring-1 focus:ring-primary"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{t(`competitors.features.${s}`)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 border border-border/70 rounded-lg text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-xs shadow-xs transition active:scale-[0.98]"
                >
                  {editingId ? t('common.save') : t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border/70 rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 text-foreground">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">{t('competitors.features.deleteFeature')}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t('competitors.features.confirmDelete')}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3.5 py-1.5 border border-border/70 rounded-lg text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold rounded-lg text-xs shadow-xs transition active:scale-[0.98]"
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
