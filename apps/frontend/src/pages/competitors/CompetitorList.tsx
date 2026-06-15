import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Plus, Pencil, Trash2, X, AlertTriangle, ExternalLink, Eye } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

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
  createdAt: string;
  socialProfiles: SocialProfile[];
  _count: { products: number; ads: number; reports: number };
}

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', icon: '📸' },
  { key: 'facebook', label: 'Facebook', icon: '📘' },
  { key: 'twitter', label: 'Twitter / X', icon: '🐦' },
  { key: 'tiktok', label: 'TikTok', icon: '🎵' },
  { key: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { key: 'youtube', label: 'YouTube', icon: '▶️' },
  { key: 'snapchat', label: 'Snapchat', icon: '👻' },
  { key: 'telegram', label: 'Telegram', icon: '✈️' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
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
    const links: Record<string, string> = Object.fromEntries(SOCIAL_PLATFORMS.map(p => [p.key, '']));
    if (c.socialProfiles) {
      c.socialProfiles.forEach(sp => { if (links.hasOwnProperty(sp.platform)) links[sp.platform] = sp.profileUrl || ''; });
    }
    setSocialLinks(links);
    setShowSocialSection(c.socialProfiles?.length > 0);
    setFormError('');
    setShowModal(true);
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
      if (competitorId && formData.devNotes) {
        await apiClient.put(`/competitors/${competitorId}/dev-recommendations`, { notes: formData.devNotes });
      }
      setShowModal(false);
      fetchCompetitors();
    } catch {
      setFormError(editingId ? t('competitors.errors.updateFailed') : t('competitors.errors.createFailed'));
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
    <div className="p-6" dir="auto">
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
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('competitors.searchCompetitors')}
          className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
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
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500'}`}>
                        {c.isActive ? t('competitors.active') : t('competitors.inactive')}
                      </span>
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
                        title={platform.label}
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
                  placeholder="https://example.com"
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
                          <span className="text-xs font-medium w-20 text-gray-500">{sp.label}</span>
                          <input
                            type="url"
                            value={socialLinks[sp.key] || ''}
                            onChange={e => setSocialLinks(prev => ({ ...prev, [sp.key]: e.target.value }))}
                            className="flex-1 px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                            placeholder={`https://${sp.key}.com/...`}
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
                    <p className="text-xs text-gray-400 mt-1">اكتب كل نقطة في سطر منفصل</p>
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
                    <p className="text-xs text-gray-400 mt-1">اكتب كل نقطة في سطر منفصل</p>
                  </div>
                </div>
              </div>

              {/* Dev Recommendations */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-bold mb-3 text-blue-600 dark:text-blue-400">{t('competitors.devRecommendations.title')}</h3>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('competitors.devRecommendations.notes')}</label>
                  <textarea
                    value={formData.devNotes}
                    onChange={e => setFormData(p => ({ ...p, devNotes: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm whitespace-pre-wrap"
                    rows={8}
                    placeholder={t('competitors.devRecommendations.notesPlaceholder')}
                  />
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
