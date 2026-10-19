import React from "react";
import { useTranslation } from "react-i18next";

export interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => Promise<void>;
  isEditing: boolean;
  categoryName: string;
  setCategoryName: (name: string) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isEditing,
  categoryName,
  setCategoryName,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/5 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
          {isEditing ? t("cancellations.k_38") : t("cancellations.k_39")}
        </h3>
        <form onSubmit={onSave}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("cancellations.k_52")}
              </label>
              <input
                type="text"
                required
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              {t("cancellations.k_53")}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t("cancellations.k_54")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
