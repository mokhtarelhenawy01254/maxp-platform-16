import React from "react";
import { useTranslation } from "react-i18next";

interface WorkTypeModalFooterProps {
  saving: boolean;
  canSave: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const WorkTypeModalFooter: React.FC<WorkTypeModalFooterProps> = ({
  saving,
  canSave,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 shrink-0">
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 text-sm"
      >
        {t("dentalLab.common.cancel")}
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || !canSave}
        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm shadow-xs"
      >
        {saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
      </button>
    </div>
  );
};

export default WorkTypeModalFooter;
