import React from "react";
import { useTranslation } from "react-i18next";
import { Gift, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SettingsHeroSummaryItem,
  SettingsPageHero,
} from "../components/SettingsPagePrimitives";

interface StorePromotionHeaderProps {
  summaryItems?: SettingsHeroSummaryItem[];
  onFillDefaults: () => void;
}

export const StorePromotionHeader: React.FC<StorePromotionHeaderProps> = ({
  summaryItems,
  onFillDefaults,
}) => {
  const { t } = useTranslation();

  return (
    <SettingsPageHero
      badgeIcon={Gift}
      badgeLabel={t("storePromotionSettings.badgeLabel")}
      title={t("storePromotionSettings.pageTitle")}
      description={t("storePromotionSettings.pageDescription")}
      summaryItems={summaryItems}
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={onFillDefaults}
          className="border-slate-300 bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800 dark:hover:text-white font-medium"
        >
          <Plus className="h-4 w-4 ml-1" /> {t("storePromotionSettings.readyExamples")}
        </Button>
      }
    />
  );
};
