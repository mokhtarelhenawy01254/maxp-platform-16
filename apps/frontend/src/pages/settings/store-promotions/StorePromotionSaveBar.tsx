import React from "react";
import { useTranslation } from "react-i18next";
import { RefreshCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StorePromotionSaveBarProps {
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}

export const StorePromotionSaveBar: React.FC<StorePromotionSaveBarProps> = ({
  saving,
  onSave,
  onReset,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3">
      <Button onClick={onSave} disabled={saving} className="gap-2 font-semibold shadow-sm">
        <Save className="h-4 w-4" />
        {saving ? t("storePromotionSettings.savingPromo") : t("storePromotionSettings.savePromo")}
      </Button>
      <Button
        variant="outline"
        onClick={onReset}
        disabled={saving}
        className="gap-2 border-slate-300 bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800 dark:hover:text-white font-semibold"
      >
        <RefreshCcw className="h-4 w-4" /> {t("storePromotionSettings.cancelPromo")}
      </Button>
    </div>
  );
};
