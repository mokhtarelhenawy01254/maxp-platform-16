import { useTranslation } from "react-i18next";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface PreparationPageHeaderProps {
  refreshing: boolean;
  onRefresh: () => void;
}

const PreparationPageHeader = ({
  refreshing,
  onRefresh,
}: PreparationPageHeaderProps) => {
  const { t } = useTranslation();

  return (
    <section className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm sm:px-5 dark:border-gray-700 dark:bg-gray-800">
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500">{t("preparation.pageHeader.title")}</p>
      </div>

      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition active:scale-95 hover:border-gray-300 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-500"
      >
        <ArrowPathIcon className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        {t("preparation.pageHeader.refresh")}
      </button>
    </section>
  );
};

export default PreparationPageHeader;
