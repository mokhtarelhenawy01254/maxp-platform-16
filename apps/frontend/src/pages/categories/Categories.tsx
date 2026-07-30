import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Image as ImageIcon, Plus, Pencil, Trash2, X, AlertTriangle, ChevronRight, Tag } from 'lucide-react';
import { getDirection } from '../../i18n';
import { apiClient } from '../../services/apiClient';
import { getImageUrl } from '../../utils/imageUrl';
import './Categories.css';
import type { AxiosError } from 'axios';

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

const arabicToFranco: Record<string, string> = {
  ا: 'a',
  أ: 'a',
  إ: 'e',
  آ: 'a',
  ء: 'a',
  ب: 'b',
  ت: 't',
  ث: 'th',
  ج: 'g',
  ح: '7',
  خ: 'kh',
  د: 'd',
  ذ: 'dh',
  ر: 'r',
  ز: 'z',
  س: 's',
  ش: 'sh',
  ص: 's',
  ض: 'd',
  ط: 't',
  ظ: 'z',
  ع: '3',
  غ: 'gh',
  ف: 'f',
  ق: 'q',
  ك: 'k',
  ل: 'l',
  م: 'm',
  ن: 'n',
  ه: 'h',
  ة: 'a',
  و: 'o',
  ؤ: 'o',
  ي: 'y',
  ى: 'a',
  ئ: 'e'
};

const transliterateArabicToFranco = (text: string): string =>
  text
    .split('')
    .map((char) => arabicToFranco[char] || char)
    .join('');

const buildSuggestedSlug = (value: string): string => {
  const transliterated = transliterateArabicToFranco(value);
  const normalized = transliterated
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized;
};

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
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    isActive: true
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        isActive: category.isActive
      });
      setImageFile(null);
      setImagePreview(getImageUrl(category.image));
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        isActive: true
      });
      setImageFile(null);
      setImagePreview(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));

    // Auto-generate slug from name if creating new and slug is empty or matches previous name slug
    if (name === 'name' && !editingCategory) {
      const suggestedSlug = buildSuggestedSlug(value);
      setFormData(prev => ({ ...prev, slug: suggestedSlug }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert(t('categories.management.form.errors.nameRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append('name', formData.name);
      const resolvedSlug = buildSuggestedSlug(formData.slug || formData.name);
      submitData.append('slug', resolvedSlug);
      submitData.append('description', formData.description);
      submitData.append('isActive', String(formData.isActive));

      if (imageFile) {
        submitData.append('image', imageFile);
      }

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };

      if (editingCategory) {
        await apiClient.put(`/products/categories/${editingCategory.id}`, submitData, config);
      } else {
        await apiClient.post('/products/categories', submitData, config);
      }
      fetchCategories();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving category:', err);
      alert(getApiErrorMessage(err) || (t('categories.management.form.errors.actionFailed') as string));
    } finally {
      setIsSubmitting(false);
    }
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
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingCategory ? t('categories.management.form.editTitle') : t('categories.management.form.addTitle')}</h3>
              <button className="close-modal-btn" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t('categories.management.form.name')}</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('categories.management.form.slug')}</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  placeholder="e.g. skin-care-products"
                />
              </div>
              <div className="form-group">
                <label>{t('categories.management.form.description')}</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                ></textarea>
              </div>
              <div className="form-group">
                <label>{t('categories.management.form.image', 'Category Image')}</label>
                <div className="image-upload-wrapper">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="image-file-input"
                    id="category-image-upload"
                  />
                  <label htmlFor="category-image-upload" className="image-upload-label">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="image-preview" />
                    ) : (
                      <div className="image-upload-placeholder">
                        <ImageIcon size={24} />
                        <span>{t('categories.management.form.uploadImage', 'Upload Image')}</span>
                      </div>
                    )}
                  </label>
                  {imagePreview && (
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="form-group checkbox">
                <label className="switch">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                  <span className="slider round"></span>
                </label>
                <span>{t('categories.management.form.status')}</span>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                  {t('categories.management.form.cancel')}
                </button>
                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <RefreshCw className="spinning" size={16} />
                  ) : (
                    t('categories.management.form.save')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;

