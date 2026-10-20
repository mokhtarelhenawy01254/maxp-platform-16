import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReturnReason, ReturnReasonCategory } from '../../../services/returnService';

interface ReturnReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingReason: ReturnReason | null;
  reasonText: string;
  setReasonText: (val: string) => void;
  reasonDesc: string;
  setReasonDesc: (val: string) => void;
  selectedCategoryId: string;
  setSelectedCategoryId: (val: string) => void;
  categories: ReturnReasonCategory[];
  onSave: (e: React.FormEvent) => Promise<void>;
}

export const ReturnReasonModal: React.FC<ReturnReasonModalProps> = ({
  isOpen,
  onClose,
  editingReason,
  reasonText,
  setReasonText,
  reasonDesc,
  setReasonDesc,
  selectedCategoryId,
  setSelectedCategoryId,
  categories,
  onSave,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/35 backdrop-blur-[2px] flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
          {editingReason ? t('returns.k_113') : t('returns.k_114')}
        </h3>
        <form onSubmit={onSave}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('returns.k_187')}
              </label>
              <input
                type="text"
                required
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-xs focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('returns.k_178')}
              </label>
              <select
                required
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-xs focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">{t('returns.k_115')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('returns.k_188')}
              </label>
              <textarea
                value={reasonDesc}
                onChange={(e) => setReasonDesc(e.target.value)}
                className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-xs focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
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
