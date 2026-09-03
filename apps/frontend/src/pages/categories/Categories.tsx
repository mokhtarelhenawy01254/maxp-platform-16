import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  RefreshCw,
  Image as ImageIcon,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Tag
} from 'lucide-react';
import { getDirection } from '../../i18n';
import { apiClient } from '../../services/apiClient';
import { getImageUrl } from '../../utils/imageUrl';
import './Categories.css';
import type { AxiosError } from 'axios';
import { CategoryFormModal } from '../../components/category/CategoryFormModal';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  parentId: string | null;
  _count?: {
    products: number;
  };
}

const getApiErrorMessage = (error: unknown): string | null => {
  const axiosError = error as AxiosError<{ error?: string; message?: string }>;
  return axiosError.response?.data?.error || axiosError.response?.data?.message || null;
};

const Categories: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/products/categories');
      if (response.data.success) {
        setCategories(response.data.data);
      } else {
        setError(t('categories.management.form.errors.fetchFailed'));
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(t('categories.management.form.errors.fetchFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Update document attributes when language changes
  useEffect(() => {
    const dir = getDirection();
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenModal = (category: Category | null = null) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleSaved = () => {
    fetchCategories();
  };

  const handleDelete = async (id: string, productCount: number) => {
    if (productCount > 0) {
      alert(t('categories.management.delete.hasProducts'));
      return;
    }

    if (window.confirm(t('categories.management.delete.confirm'))) {
      try {
        await apiClient.delete(`/products/categories/${id}`);
        fetchCategories();
      } catch (err) {
        console.error('Error deleting category:', err);
        alert(getApiErrorMessage(err) || (t('categories.management.form.errors.actionFailed') as string));
      }
    }
  };

  return (
    <div className="categories-page" dir={getDirection()}>
      {/* Header */}
      <div className="categories-header">
        <div className="header-content">
          <div className="header-info">
            <h1 className="page-title">{t('categories.management.title')}</h1>
            <p className="page-subtitle">{t('categories.management.subtitle')}</p>
          </div>
          <div className="header-actions">
            <button className="add-category-btn" onClick={() => handleOpenModal()}>
              <Plus size={18} />
              <span>{t('categories.management.addCategory')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="search-section">
        <div className="search-container">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              className="search-input"
              placeholder={t('categories.management.searchPlaceholder') as string}
              value={searchQuery}
              onChange={handleSearch}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>
          <button
            className="refresh-btn"
            onClick={fetchCategories}
            disabled={isLoading}
            title={t('common.refresh') as string}
          >
            <RefreshCw className={isLoading ? 'spinning' : ''} size={18} />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="content-area">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>{t('common.loading')}</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <AlertTriangle size={48} color="#ef4444" />
            <p>{error}</p>
            <button onClick={fetchCategories} className="retry-btn">{t('common.refresh')}</button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Tag size={64} />
            </div>
            <h3>{t('categories.management.noCategories')}</h3>
            <p>{t('categories.management.noCategoriesDesc')}</p>
            {!searchQuery && (
              <button className="add-first-btn" onClick={() => handleOpenModal()}>
                <Plus size={18} />
                <span>{t('categories.management.addCategory')}</span>
              </button>
            )}
          </div>
        ) : (
          <React.Fragment>
            <div className="cat-cards-list">
              {filteredCategories.map((cat) => (
                <div key={cat.id} className="cat-card">
                  <div className="cat-card-top">
                    <div className="cat-image-cell">
                      {cat.image ? (
                        <img src={getImageUrl(cat.image) || ""} alt={cat.name} className="cat-thumbnail" />
                      ) : (
                        <div className="cat-placeholder-thumbnail">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </div>
                    <div className="cat-card-info">
                      <span className="cat-name">{cat.name}</span>
                      <code className="cat-card-slug">{cat.slug}</code>
                      {cat.description && (
                        <span className="cat-desc-hint">{cat.description}</span>
                      )}
                    </div>
                  </div>
                  <div className="cat-card-bottom">
                    <div className="cat-card-meta">
                      <span className={`status-badge ${cat.isActive ? 'active' : 'inactive'}`}>
                        {cat.isActive ? t('categories.management.status.active') : t('categories.management.status.inactive')}
                      </span>
                      <span className="product-count">
                        {cat._count?.products || 0} {t('categories.management.table.products')}
                      </span>
                    </div>
                    <div className="action-buttons">
                      <button className="edit-btn" onClick={() => handleOpenModal(cat)} title={t('common.edit') as string}>
                        <Pencil size={16} />
                        <span className="btn-label">{t('common.edit')}</span>
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(cat.id, cat._count?.products || 0)}
                        title={t('common.delete') as string}
                      >
                        <Trash2 size={16} />
                        <span className="btn-label">{t('common.delete')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="table-responsive">
              <table className="categories-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>{t('categories.management.table.image', 'Image')}</th>
                    <th>{t('categories.management.table.name')}</th>
                    <th>{t('categories.management.table.slug')}</th>
                    <th>{t('categories.management.table.status')}</th>
                    <th>{t('categories.management.table.products')}</th>
                    <th>{t('categories.management.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((cat) => (
                    <tr key={cat.id}>
                      <td>
                        <div className="cat-image-cell">
                          {cat.image ? (
                            <img src={getImageUrl(cat.image) || ""} alt={cat.name} className="cat-thumbnail" />
                          ) : (
                            <div className="cat-placeholder-thumbnail">
                              <ImageIcon size={20} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="cat-name-cell">
                          <span className="cat-name">{cat.name}</span>
                          {cat.description && <span className="cat-desc-hint">{cat.description}</span>}
                        </div>
                      </td>
                      <td><code>{cat.slug}</code></td>
                      <td>
                        <span className={`status-badge ${cat.isActive ? 'active' : 'inactive'}`}>
                          {cat.isActive ? t('categories.management.status.active') : t('categories.management.status.inactive')}
                        </span>
                      </td>
                      <td>
                        <span className="product-count">{cat._count?.products || 0}</span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="edit-btn" onClick={() => handleOpenModal(cat)} title={t('common.edit') as string}>
                            <Pencil size={16} />
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(cat.id, cat._count?.products || 0)}
                            title={t('common.delete') as string}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </React.Fragment>
        )}
      </div>

      {/* Modal */}
      <CategoryFormModal
        open={isModalOpen}
        editingCategory={editingCategory}
        onClose={handleCloseModal}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default Categories;

