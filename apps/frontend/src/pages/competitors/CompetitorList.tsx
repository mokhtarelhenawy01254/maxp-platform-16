import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Plus, Pencil, Trash2, X, AlertTriangle, ExternalLink, Eye, CheckCircle2, Circle } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import CompetitorStatusBar from './CompetitorStatusBar';
import { updateCompetitorStatus, useCompetitorStatusSync } from './useCompetitorStatus';
import type { CompetitorStatus } from './CompetitorStatusBar';
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



interface DevTask {
  id: string;
  title: string;
  status: string;
  createdAt: string;
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
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', url: '', platform: 'manual', description: '', notes: '',
    activityType: '', location: '', targetMarket: '',
    foundedYear: '', strengths: '', weaknesses: '', devNotes: '',
  });
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(
    Object.fromEntries(SOCIAL_PLATFORMS.map(p => [p.key, '']))
  );
  const [showSocialSection, setShowSocialSection] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [devTasks, setDevTasks] = useState<DevTask[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [pendingTasks, setPendingTasks] = useState<{ title: string; completed: boolean }[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const fetchCompetitors = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const res = await apiClient.get('/competitors', { params });
      if (res.data.success) setCompetitors(res.data.data || []);
    } catch {
      console.error('Failed to fetch competitors');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchCompetitors(); }, [fetchCompetitors]);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: '', url: '', platform: 'manual', description: '', notes: '', activityType: '', location: '', targetMarket: '', foundedYear: '', strengths: '', weaknesses: '', devNotes: '' });
    setSocialLinks(Object.fromEntries(SOCIAL_PLATFORMS.map(p => [p.key, ''])));
    setShowSocialSection(false);
    setFormError('');
    setDevTasks([]);
    setPendingTasks([]);
    setNewTaskText('');
    setEditingTaskId(null);
    setEditingTaskText('');
    setShowModal(true);
  };

  const openEdit = (c: Competitor) => {
    setEditingId(c.id);
    setFormData({
      name: c.name, url: c.url || '', platform: c.platform, description: '', notes: '',
      activityType: c.activityType || '', location: c.location || '',
      targetMarket: c.targetMarket || '', foundedYear: c.foundedYear?.toString() || '',
      strengths: c.strengths || '', weaknesses: c.weaknesses || '', devNotes: '',
    });
    setPendingTasks([]);
    setNewTaskText('');
    setEditingTaskId(null);
    setEditingTaskText('');
    setDevTasks([]);
    apiClient.get(`/competitors/${c.id}/dev-recommendations`).then(res => {
      if (res.data.success && res.data.data?.tasks) {
        setDevTasks(res.data.data.tasks);
      }
    }).catch(() => {});
    const links: Record<string, string> = Object.fromEntries(SOCIAL_PLATFORMS.map(p => [p.key, '']));
    if (c.socialProfiles) {
      c.socialProfiles.forEach(sp => { if (links.hasOwnProperty(sp.platform)) links[sp.platform] = sp.profileUrl || ''; });
    }
    setSocialLinks(links);
    setShowSocialSection(c.socialProfiles?.length > 0);
    setFormError('');
    setShowModal(true);
  };

  const handleAddTask = () => {
    const text = newTaskText.trim();
    if (!text) return;
    if (editingId) {
      apiClient.post(`/competitors/${editingId}/dev-tasks`, { title: text, status: 'not_started' }).then(res => {
        if (res.data.success) {
          setDevTasks(prev => [res.data.data, ...prev]);
          setNewTaskText('');
        }
      }).catch(() => {});
    } else {
      setPendingTasks(prev => [{ title: text, completed: false }, ...prev]);
      setNewTaskText('');
    }
  };

  const handleToggleTask = (task: DevTask) => {
    if (editingId) {
      apiClient.put(`/competitors/${editingId}/dev-tasks/${task.id}/toggle`).then(res => {
        if (res.data.success) {
          setDevTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: res.data.data.status } : t));
        }
      }).catch(() => {});
    }
  };

  const handleTogglePendingTask = (idx: number) => {
    setPendingTasks(prev => prev.map((t, i) => i === idx ? { ...t, completed: !t.completed } : t));
  };

  const handleStartEdit = (task: DevTask) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.title);
  };

  const handleStartEditPending = (idx: number, title: string) => {
    setEditingTaskId(`pending-${idx}`);
    setEditingTaskText(title);
  };

  const handleSaveEdit = () => {
    if (!editingTaskId || !editingTaskText.trim()) return;
    if (editingTaskId.startsWith('pending-')) {
      const idx = parseInt(editingTaskId.replace('pending-', ''), 10);
      setPendingTasks(prev => prev.map((t, i) => i === idx ? { ...t, title: editingTaskText.trim() } : t));
    } else {
      if (!editingId) return;
      apiClient.put(`/competitors/${editingId}/dev-tasks/${editingTaskId}`, { title: editingTaskText.trim() }).then(res => {
        if (res.data.success) {
          setDevTasks(prev => prev.map(t => t.id === editingTaskId ? { ...t, title: editingTaskText.trim() } : t));
        }
      }).catch(() => {});
    }
    setEditingTaskId(null);
    setEditingTaskText('');
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditingTaskText('');
  };

  const handleDeleteSavedTask = (taskId: string) => {
    if (!editingId) return;
    apiClient.delete(`/competitors/${editingId}/dev-tasks/${taskId}`).then(res => {
      if (res.data.success) {
        setDevTasks(prev => prev.filter(t => t.id !== taskId));
      }
    }).catch(() => {});
  };

  const handleDeletePendingTask = (idx: number) => {
    setPendingTasks(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError(t('competitors.errors.nameRequired'));
      return;
    }
    const socialProfiles = Object.entries(socialLinks)
      .filter(([, url]) => url && url.trim())
      .map(([platform, url]) => ({ platform, url: url.trim() }));
    try {
      let competitorId = editingId;
      if (editingId) {
        await apiClient.put(`/competitors/${editingId}`, { ...formData, socialProfiles });
      } else {
        const res = await apiClient.post('/competitors', { ...formData, socialProfiles });
        if (res.data?.data?.id) competitorId = res.data.data.id;
      }
      if (competitorId && pendingTasks.length > 0) {
        for (const { title } of pendingTasks) {
          await apiClient.post(`/competitors/${competitorId}/dev-tasks`, { title, status: 'not_started' });
        }
      }
      setShowModal(false);
      fetchCompetitors();
    } catch {
      setFormError(editingId ? t('competitors.errors.updateFailed') : t('competitors.errors.createFailed'));
    }
  };

  useCompetitorStatusSync((competitorId, status) => {
    setCompetitors(prev => prev.map(c => c.id === competitorId ? { ...c, status } : c));
  });

  const handleStatusChange = async (id: string, newStatus: CompetitorStatus) => {
    const prevStatus = competitors.find(c => c.id === id)?.status;
    setCompetitors(existing => existing.map(c => c.id === id ? { ...c, status: newStatus } : c));
    const ok = await updateCompetitorStatus(id, newStatus);
    if (!ok && prevStatus) {
      setCompetitors(existing => existing.map(c => c.id === id ? { ...c, status: prevStatus } : c));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/competitors/${id}`);
      setDeleteConfirm(null);
      fetchCompetitors();
    } catch {
      console.error('Failed to delete');
    }
  };

  return (
    <div className="p-6" dir={i18n.dir()}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('competitors.title')}</h1>
        <div className="flex gap-2">
          <button onClick={fetchCompetitors} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
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
              <div className="flex gap-4 mt-3 text-sm text-gray-500">
                <span>{c._count.products} {t('competitors.products')}</span>
                <span>{c._count.ads} {t('competitors.ads')}</span>
                <span>{c._count.reports} {t('competitors.reports')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingId ? t('competitors.editCompetitor') : t('competitors.addCompetitor')}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('competitors.competitorName')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('competitors.competitorUrl')}</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={e => setFormData(p => ({ ...p, url: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  placeholder={t('competitors.competitorUrlPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('competitors.platform')}</label>
                <select
                  value={formData.platform}
                  onChange={e => setFormData(p => ({ ...p, platform: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="manual">يدوي</option>
                  <option value="salla">سلة</option>
                  <option value="zid">زد</option>
                  <option value="shopify">Shopify</option>
                  <option value="woocommerce">WooCommerce</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              {/* Business Details */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-bold mb-3 text-gray-600 dark:text-gray-400">{t('competitors.description')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('competitors.activityType')}</label>
                    <select
                      value={formData.activityType}
                      onChange={e => setFormData(p => ({ ...p, activityType: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                    >
                      <option value="">{t('competitors.activityTypePlaceholder')}</option>
                      <option value="ecommerce">{t('competitors.activityTypes.ecommerce')}</option>
                      <option value="services">{t('competitors.activityTypes.services')}</option>
                      <option value="import_export">{t('competitors.activityTypes.import_export')}</option>
                      <option value="manufacturing">{t('competitors.activityTypes.manufacturing')}</option>
                      <option value="software">{t('competitors.activityTypes.software')}</option>
                      <option value="education">{t('competitors.activityTypes.education')}</option>
                      <option value="healthcare">{t('competitors.activityTypes.healthcare')}</option>
                      <option value="realestate">{t('competitors.activityTypes.realestate')}</option>
                      <option value="tourism">{t('competitors.activityTypes.tourism')}</option>
                      <option value="other">{t('competitors.activityTypes.other')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('competitors.location')}</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                      placeholder={t('competitors.locationPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('competitors.targetMarket')}</label>
                    <select
                      value={formData.targetMarket}
                      onChange={e => setFormData(p => ({ ...p, targetMarket: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                    >
                      <option value="">{t('competitors.targetMarketPlaceholder')}</option>
                      <option value="b2b">{t('competitors.targetMarkets.b2b')}</option>
                      <option value="b2c">{t('competitors.targetMarkets.b2c')}</option>
                      <option value="b2b_b2c">{t('competitors.targetMarkets.b2b_b2c')}</option>
                      <option value="government">{t('competitors.targetMarkets.government')}</option>
                      <option value="all">{t('competitors.targetMarkets.all')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('competitors.foundedYear')}</label>
                    <input
                      type="number"
                      value={formData.foundedYear}
                      onChange={e => setFormData(p => ({ ...p, foundedYear: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                      placeholder={t('competitors.foundedYearPlaceholder')}
                      min="1900"
                      max={new Date().getFullYear()}
                    />
                  </div>

                </div>
              </div>

              {/* Social Media Links */}
              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowSocialSection(!showSocialSection)}
                  className="flex items-center justify-between w-full text-sm font-bold mb-3 text-gray-600 dark:text-gray-400"
                >
                  <span>{t('competitors.socialLinks')}</span>
                  <span className="text-xs">{showSocialSection ? '▲' : '▼'}</span>
                </button>
                {showSocialSection && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 mb-2">{t('competitors.socialLinksDesc')}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {SOCIAL_PLATFORMS.map(sp => (
                        <div key={sp.key} className="flex items-center gap-2">
                          <span className="text-base w-6 text-center">{sp.icon}</span>
                          <span className="text-xs font-medium w-20 text-gray-500">{t(`competitors.${sp.labelKey}`)}</span>
                          <input
                            type="url"
                            value={socialLinks[sp.key] || ''}
                            onChange={e => setSocialLinks(prev => ({ ...prev, [sp.key]: e.target.value }))}
                            className="flex-1 px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                            placeholder={`${t('competitors.socialLinksDesc')}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Analysis */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-bold mb-3 text-gray-600 dark:text-gray-400">{t('competitors.notes')}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('competitors.strengths')}</label>
                    <textarea
                      value={formData.strengths}
                      onChange={e => setFormData(p => ({ ...p, strengths: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm whitespace-pre-wrap"
                      rows={5}
                      placeholder={t('competitors.strengthsPlaceholder')}
                    />
                    <p className="text-xs text-gray-400 mt-1">{t('competitors.eachLineHint')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('competitors.weaknesses')}</label>
                    <textarea
                      value={formData.weaknesses}
                      onChange={e => setFormData(p => ({ ...p, weaknesses: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm whitespace-pre-wrap"
                      rows={5}
                      placeholder={t('competitors.weaknessesPlaceholder')}
                    />
                    <p className="text-xs text-gray-400 mt-1">{t('competitors.eachLineHint')}</p>
                  </div>
                </div>
              </div>

              {/* Dev Recommendations — To-Do List */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-bold mb-3 text-blue-600 dark:text-blue-400">{t('competitors.devRecommendations.title')}</h3>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTaskText}
                      onChange={e => setNewTaskText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTask(); } }}
                      className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                      placeholder={t('competitors.devRecommendations.notesPlaceholder')}
                    />
                    <button
                      type="button"
                      onClick={handleAddTask}
                      disabled={!newTaskText.trim()}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {pendingTasks.map(({ title, completed }, idx) => (
                      <div
                        key={`pending-${idx}`}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm bg-blue-50 dark:bg-blue-900/20 ${completed ? 'opacity-60' : ''}`}
                      >
                        {editingTaskId === `pending-${idx}` ? (
                          <>
                            <input
                              type="text"
                              value={editingTaskText}
                              onChange={e => setEditingTaskText(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(); } }}
                              className="flex-1 px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                              autoFocus
                            />
                            <button type="button" onClick={handleSaveEdit} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                              <CheckCircle2 size={14} className="text-green-500" />
                            </button>
                            <button type="button" onClick={handleCancelEdit} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                              <X size={14} className="text-gray-400" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleTogglePendingTask(idx)}
                              className="shrink-0 focus:outline-none"
                            >
                              {completed ? (
                                <CheckCircle2 size={16} className="text-green-500" />
                              ) : (
                                <Circle size={16} className="text-gray-300 dark:text-gray-600" />
                              )}
                            </button>
                            <span className={`flex-1 ${completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>{title}</span>
                            <button
                              type="button"
                              onClick={() => handleStartEditPending(idx, title)}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                              title={t('competitors.devRecommendations.editTask')}
                            >
                              <Pencil size={14} className="text-gray-400" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePendingTask(idx)}
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900"
                              title={t('common.delete')}
                            >
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                    {(editingId ? devTasks : []).map(task => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${task.status === 'completed' ? 'opacity-60' : ''}`}
                      >
                        {editingTaskId === task.id ? (
                          <>
                            <input
                              type="text"
                              value={editingTaskText}
                              onChange={e => setEditingTaskText(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(); } }}
                              className="flex-1 px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                              autoFocus
                            />
                            <button type="button" onClick={handleSaveEdit} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                              <CheckCircle2 size={14} className="text-green-500" />
                            </button>
                            <button type="button" onClick={handleCancelEdit} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                              <X size={14} className="text-gray-400" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleTask(task)}
                              className="shrink-0 focus:outline-none"
                            >
                              {task.status === 'completed' ? (
                                <CheckCircle2 size={16} className="text-green-500" />
                              ) : (
                                <Circle size={16} className="text-gray-300 dark:text-gray-600" />
                              )}
                            </button>
                            <span className={`flex-1 ${task.status === 'completed' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>{task.title}</span>
                            <span className="text-[10px] text-gray-400 hidden sm:inline">
                              {new Date(task.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(task)}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                              title={t('competitors.devRecommendations.editTask')}
                            >
                              <Pencil size={14} className="text-gray-400" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSavedTask(task.id)}
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900"
                              title={t('common.delete')}
                            >
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                    {((editingId ? devTasks : []).length === 0 && pendingTasks.length === 0) && (
                      <p className="text-xs text-gray-400 text-center py-3">{t('competitors.devRecommendations.noTasks')}</p>
                    )}
                  </div>
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertTriangle size={16} />
                  {formError}
                </div>
              )}
              <div className="flex gap-2 justify-end pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  {t('common.cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {editingId ? t('common.save') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
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
            <div className="flex gap-2 justify-end">
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
