import { useTranslation } from "react-i18next";

interface TechnicianModalFooterProps {
  saving: boolean;
  nameTrimmed: boolean;
  onSave: () => Promise<void>;
  onClose: () => void;
}

export function TechnicianModalFooter({
  saving,
  nameTrimmed,
  onSave,
  onClose,
}: TechnicianModalFooterProps) {
  const { t } = useTranslation();

  return (
    <div className="flex justify-end gap-3 mt-6 border-t pt-3 dark:border-gray-700">
      <button
        onClick={onClose}
        disabled={saving}
        className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-sm"
      >
        {t("dentalLab.common.cancel")}
      </button>
      <button
        onClick={onSave}
        disabled={saving || !nameTrimmed}
        className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm shadow-sm"
      >
        {saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
      </button>
    </div>
  );
}
