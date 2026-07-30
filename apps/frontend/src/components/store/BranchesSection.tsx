import { Store as BuildingStorefrontIcon, Plus as PlusIcon, Pencil as PencilIcon, Trash2 as TrashIcon, Pin as MapPinIcon, Phone as PhoneIcon, Clock as ClockIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import React from "react";
;
import { Branch } from "../../services/storeSettingsService";

interface BranchesSectionProps {
  branches: Branch[];
  onAdd: () => void;
  onEdit: (branch: Branch) => void;
  onDelete: (id: string) => void;
}

export const BranchesSection: React.FC<BranchesSectionProps> = ({
  branches,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("storeBranches.branches")}
        </h2>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
        >
          <PlusIcon className="h-5 w-5 ml-2" />
          {t("storeBranches.addBranch")}
        </button>
      </div>

      {branches.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-transparent dark:border-gray-700">
          <BuildingStorefrontIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t("storeBranches.noBranches")}</p>
          <button
            onClick={onAdd}
            className="mt-4 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
          >
            {t("storeBranches.addBranch")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {branch.name}
                </h3>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    branch.isActive
                      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                      : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400"
                  }`}
                >
                  {branch.isActive ? t("storeBranches.active") : t("storeBranches.inactive")}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <div className="flex items-start">
                  <MapPinIcon className="h-4 w-4 ml-2 mt-0.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                  <span>
                    {branch.address}, {branch.city}
                  </span>
                </div>
                <div className="flex items-center">
                  <PhoneIcon className="h-4 w-4 ml-2 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                  <span>{branch.phone}</span>
                </div>
                {branch.workingHours && (
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 ml-2 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                    <span>{branch.workingHours}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(branch)}
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                >
                  <PencilIcon className="h-4 w-4 ml-1" />
                  {t("storeBranches.edit")}
                </button>
                <button
                  onClick={() => onDelete(branch.id)}
                  className="flex-1 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center transition-colors"
                >
                  <TrashIcon className="h-4 w-4 ml-1" />
                  {t("storeBranches.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
