import React from 'react';
import { FolderPlus, Edit2 } from 'lucide-react';
import type { CancellationReasonCategory } from '../../../services/cancellationService';

export interface CancellationCategoriesCardProps {
  loading: boolean;
  categories: CancellationReasonCategory[];
  onAddCategory: () => void;
  onEditCategory: (cat: CancellationReasonCategory) => void;
  t: (key: string) => string;
}

export const CancellationCategoriesCard: React.FC<CancellationCategoriesCardProps> = ({
  loading,
  categories,
  onAddCategory,
  onEditCategory,
  t,
}) => {
  return (
    <div className="lg:col-span-1">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <FolderPlus size={20} className="text-blue-500" /> {t('cancellations.k_46')}
        </h2>
        <button
          type="button"
          onClick={onAddCategory}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium transition active:scale-[0.98]"
        >
          {t('cancellations.k_47')}
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        {loading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">{t('cancellations.k_30')}</div>
        ) : categories.length === 0 ? (
          <div className="p-4 text-center text-gray-400">{t('cancellations.k_31')}</div>
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors"
            >
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{cat.name}</div>
              </div>
              <button
                type="button"
                onClick={() => onEditCategory(cat)}
                className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
