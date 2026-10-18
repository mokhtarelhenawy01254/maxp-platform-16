import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

export interface PreparationAlertBannersProps {
  preparationSettingsEnabled: boolean;
  allOverdueShortageFollowUpCount: number;
  allOverdueProblemFollowUpCount: number;
}

export const PreparationAlertBanners: React.FC<PreparationAlertBannersProps> = ({
  preparationSettingsEnabled,
  allOverdueShortageFollowUpCount,
  allOverdueProblemFollowUpCount,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {!preparationSettingsEnabled && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs sm:text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-200 shadow-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="font-semibold">{t("preparation.k_1", { defaultValue: "إعدادات التجهيز غير مفعلة" })}</span>
          <span className="text-amber-700 dark:text-amber-300">{t("preparation.k_2", { defaultValue: "يرجى مراجعة إعدادات المستودع" })}</span>
        </div>
      )}

      {allOverdueShortageFollowUpCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-xs sm:text-sm text-orange-900 dark:border-orange-800/60 dark:bg-orange-950/20 dark:text-orange-200 shadow-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
          <span className="font-semibold">
            {t("preparation.overdueBanner", {
              count: allOverdueShortageFollowUpCount,
              defaultValue: `يوجد ${allOverdueShortageFollowUpCount} طلب متأخر في متابعة النواقص`,
            })}
          </span>
          <span className="text-orange-700 dark:text-orange-300">{t("preparation.k_3", { defaultValue: "يرجى اتخاذ إجراء سريع" })}</span>
        </div>
      )}

      {allOverdueProblemFollowUpCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs sm:text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-200 shadow-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="font-semibold">
            {t("preparation.problemOverdueBanner", {
              count: allOverdueProblemFollowUpCount,
              defaultValue: `يوجد ${allOverdueProblemFollowUpCount} طلب متأخر في حل المشكلات`,
            })}
          </span>
        </div>
      )}
    </>
  );
};

export default PreparationAlertBanners;
