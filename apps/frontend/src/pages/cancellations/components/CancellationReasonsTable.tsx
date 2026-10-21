import React from 'react';
import { Tag, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import type { CancellationReason } from '../../../services/cancellationService';

export interface CancellationReasonsTableProps {
  loading: boolean;
  reasons: CancellationReason[];
  onAddReason: () => void;
  onEditReason: (reason: CancellationReason) => void;
  onDeleteReason: (id: string) => void;
  t: (key: string) => string;
}

export const CancellationReasonsTable: React.FC<CancellationReasonsTableProps> = ({
  loading,
  reasons,
  onAddReason,
  onEditReason,
  onDeleteReason,
  t,
}) => {
  return (
    <div className="lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <Tag size={20} className="text-green-500" /> {t('cancellations.k_48')}
        </h2>
        <button
          type="button"
          onClick={onAddReason}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium transition active:scale-[0.98]"
        >
          {t('cancellations.k_49')}
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                {t('cancellations.k_32')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                {t('cancellations.k_33')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                {t('cancellations.k_34')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase pl-6">
                {t('cancellations.k_35')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500 dark:text-gray-400">
                  {t('cancellations.k_30')}
                </td>
              </tr>
            ) : reasons.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-400">
                  {t('cancellations.k_36')}
                </td>
              </tr>
            ) : (
              reasons.map((reason) => (
                <tr key={reason.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">{reason.reason}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{reason.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-900/30">
                      {reason.category?.name || t('cancellations.k_37')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {reason.isActive ? (
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-1 text-xs">
                        <CheckCircle size={14} /> {t('cancellations.k_50')}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 flex items-center gap-1 text-xs">
                        <XCircle size={14} /> {t('cancellations.k_51')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-left pl-6">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => onEditReason(reason)}
                        className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteReason(reason.id)}
                        className="text-red-400 hover:text-red-600 transition"
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
  );
};
