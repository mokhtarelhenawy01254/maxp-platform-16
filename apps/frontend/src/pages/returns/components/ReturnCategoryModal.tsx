import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReturnReasonCategory } from '../../../services/returnService';

interface ReturnCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCategory: ReturnReasonCategory | null;
  categoryName: string;
  setCategoryName: (val: string) => void;
  defaultRole: 'CUSTOMER' | 'STORE' | 'SHIPPING' | 'OTHER';
  setDefaultRole: (val: 'CUSTOMER' | 'STORE' | 'SHIPPING' | 'OTHER') => void;
  onSave: (e: React.FormEvent) => Promise<void>;
}

export const ReturnCategoryModal: React.FC<ReturnCategoryModalProps> = ({
  isOpen,
  onClose,
  editingCategory,
  categoryName,
  setCategoryName,
  defaultRole,
  setDefaultRole,
  onSave,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/35 backdrop-blur-[2px] flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
          {editingCategory ? t('returns.k_109') : t('returns.k_110')}
        </h3>
        <form onSubmit={onSave}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('returns.k_182')}
              </label>
              <input
                type="text"
                required
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-xs focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('returns.k_183')}
              </label>
              <select
                value={defaultRole}
                onChange={(e) => setDefaultRole(e.target.value as any)}
                className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-xs focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="CUSTOMER">{t('returns.k_184')}</option>
                <option value="STORE">{t('returns.k_111')}</option>
                <option value="SHIPPING">{t('returns.k_185')}</option>
                <option value="OTHER">{t('returns.k_112')}</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              {t('returns.k_158')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('returns.k_186')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
