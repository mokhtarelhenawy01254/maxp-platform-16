import React from "react";
import { useTranslation } from "react-i18next";
import { ClipboardList } from "lucide-react";

export const PreparationOrdersEmptyState: React.FC = React.memo(() => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center dark:border-gray-600 dark:bg-gray-800/50">
      <ClipboardList className="h-12 w-12 text-gray-300 dark:text-gray-600" />
      <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
        {t("preparation.emptyState.title")}
      </h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400">
        {t("preparation.emptyState.desc")}
      </p>
    </div>
  );
});

PreparationOrdersEmptyState.displayName = "PreparationOrdersEmptyState";
