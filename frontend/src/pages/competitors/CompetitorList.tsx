import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Plus, Pencil, Trash2, X, AlertTriangle, ExternalLink, Eye } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface Competitor {
  id: string;
  name: string;
  url: string | null;
  platform: string;
  logo: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { products: number; ads: number; reports: number };
}

const CompetitorList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', url: '', platform: 'manual', description: '', notes: '' });
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
    setFormData({ name: '', url: '', platform: 'manual', description: '', notes: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (c: Competitor) => {
    setEditingId(c.id);
    setFormData({ name: c.name, url: c.url || '', platform: c.platform, description: '', notes: '' });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError(t('competitors.errors.nameRequired'));
      return;
    }
    try {
      if (editingId) {
        await apiClient.put(`/competitors/${editingId}`, formData);
      } else {
        await apiClient.post('/competitors', formData);
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
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500'}`}>
                      {c.isActive ? t('competitors.active') : t('competitors.inactive')}
                    </span>
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
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingId ? t('competitors.editCompetitor') : t('competitors.addCompetitor')}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              {formError && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertTriangle size={16} />
                  {formError}
                </div>
              )}
              <div className="flex gap-2 justify-end">
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
