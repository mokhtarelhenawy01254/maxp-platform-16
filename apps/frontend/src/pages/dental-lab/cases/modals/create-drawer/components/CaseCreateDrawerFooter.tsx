import React from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

interface CaseCreateDrawerFooterProps {
  initialExists: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const CaseCreateDrawerFooter: React.FC<CaseCreateDrawerFooterProps> = ({
  initialExists,
  saving,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();

  return (
    <div className="px-6 py-4 border-t dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800 flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        {t("dentalLab.common.cancel")}
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t("dentalLab.common.saving")}</span>
          </>
        ) : (
          <span>{initialExists ? "حفظ التعديلات" : t("dentalLab.common.save")}</span>
        )}
      </button>
    </div>
  );
};

export default CaseCreateDrawerFooter;
