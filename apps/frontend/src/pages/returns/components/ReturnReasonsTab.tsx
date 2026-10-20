import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FolderPlus,
  Tag,
  Shield,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Sparkles,
} from 'lucide-react';
import {
  ReturnReason,
  ReturnReasonCategory,
} from '../../../services/returnService';
import { ReturnCategoryModal } from './ReturnCategoryModal';
import { ReturnReasonModal } from './ReturnReasonModal';

interface ReturnReasonsTabProps {
  categories: ReturnReasonCategory[];
  reasons: ReturnReason[];
  loading: boolean;
  addDefaults: () => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  deleteReason: (id: string) => Promise<void>;
  isCategoryModalOpen: boolean;
  setIsCategoryModalOpen: (val: boolean) => void;
  editingCategory: ReturnReasonCategory | null;
  setEditingCategory: (val: ReturnReasonCategory | null) => void;
  categoryName: string;
  setCategoryName: (val: string) => void;
  defaultRole: 'CUSTOMER' | 'STORE' | 'SHIPPING' | 'OTHER';
  setDefaultRole: (val: 'CUSTOMER' | 'STORE' | 'SHIPPING' | 'OTHER') => void;
  handleSaveCategory: (e: React.FormEvent) => Promise<void>;
  isReasonModalOpen: boolean;
  setIsReasonModalOpen: (val: boolean) => void;
  editingReason: ReturnReason | null;
  setEditingReason: (val: ReturnReason | null) => void;
  reasonText: string;
  setReasonText: (val: string) => void;
  reasonDesc: string;
  setReasonDesc: (val: string) => void;
  selectedCategoryId: string;
  setSelectedCategoryId: (val: string) => void;
  handleSaveReason: (e: React.FormEvent) => Promise<void>;
}

export const ReturnReasonsTab: React.FC<ReturnReasonsTabProps> = ({
  categories,
  reasons,
  loading,
  addDefaults,
  deleteCategory,
  deleteReason,
  isCategoryModalOpen,
  setIsCategoryModalOpen,
  editingCategory,
  setEditingCategory,
  categoryName,
  setCategoryName,
  defaultRole,
  setDefaultRole,
  handleSaveCategory,
  isReasonModalOpen,
  setIsReasonModalOpen,
  editingReason,
  setEditingReason,
  reasonText,
  setReasonText,
  reasonDesc,
  setReasonDesc,
  selectedCategoryId,
  setSelectedCategoryId,
  handleSaveReason,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={addDefaults}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors shadow-xs"
        >
          <Sparkles size={18} /> {t('returns.k_172')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories List */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <FolderPlus size={20} className="text-blue-500" /> {t('returns.k_173')}
            </h2>
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryName('');
                setDefaultRole('OTHER');
                setIsCategoryModalOpen(true);
              }}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {t('returns.k_174')}
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xs border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                {t('returns.k_144')}
              </div>
            ) : categories.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                {t('returns.k_175')}
              </div>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {cat.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                      <Shield size={12} />
                      {t('returns.k_107')} {cat.defaultRole}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setEditingCategory(cat);
                        setCategoryName(cat.name);
                        setDefaultRole(cat.defaultRole);
                        setIsCategoryModalOpen(true);
                      }}
                      className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Reasons List */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Tag size={20} className="text-green-500" /> {t('returns.k_176')}
            </h2>
            <button
              onClick={() => {
                setEditingReason(null);
                setReasonText('');
                setReasonDesc('');
                setSelectedCategoryId(categories[0]?.id || '');
                setIsReasonModalOpen(true);
              }}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {t('returns.k_177')}
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xs border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('returns.k_57')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('returns.k_178')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('returns.k_61')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase pl-6">
                    {t('returns.k_67')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-4 text-center text-gray-500 dark:text-gray-400"
                    >
                      {t('returns.k_144')}
                    </td>
                  </tr>
                ) : reasons.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-400">
                      {t('returns.k_179')}
                    </td>
                  </tr>
                ) : (
                  reasons.map((reason) => (
                    <tr
                      key={reason.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {reason.reason}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {reason.description}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-900/30">
                          {reason.category?.name || t('returns.k_108')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {reason.isActive ? (
                          <span className="text-green-600 dark:text-green-400 flex items-center gap-1 text-xs">
                            <CheckCircle size={14} /> {t('returns.k_180')}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 flex items-center gap-1 text-xs">
                            <XCircle size={14} /> {t('returns.k_181')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-left pl-6">
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setEditingReason(reason);
                              setReasonText(reason.reason);
                              setReasonDesc(reason.description || '');
                              setSelectedCategoryId(reason.categoryId || '');
                              setIsReasonModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-500 dark:text-blue-400"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => deleteReason(reason.id)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ReturnCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        editingCategory={editingCategory}
        categoryName={categoryName}
        setCategoryName={setCategoryName}
        defaultRole={defaultRole}
        setDefaultRole={setDefaultRole}
        onSave={handleSaveCategory}
      />

      <ReturnReasonModal
        isOpen={isReasonModalOpen}
        onClose={() => setIsReasonModalOpen(false)}
        editingReason={editingReason}
        reasonText={reasonText}
        setReasonText={setReasonText}
        reasonDesc={reasonDesc}
        setReasonDesc={setReasonDesc}
        selectedCategoryId={selectedCategoryId}
        setSelectedCategoryId={setSelectedCategoryId}
        categories={categories}
        onSave={handleSaveReason}
      />
    </>
  );
};
