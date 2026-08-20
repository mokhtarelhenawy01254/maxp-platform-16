import { useTranslation } from "react-i18next";
import { PencilIcon } from "@heroicons/react/24/outline";
import type { PreparationOrder, ProblemHoldDetails } from "../types";

interface PreparationProblemHoldPanelProps {
  order: PreparationOrder;
  problemHoldDetails: ProblemHoldDetails;
  rowBusy: boolean;
  formatDate: (value: string) => string;
  onEditProblemReason: (orderNumber: string) => void;
}

const PreparationProblemHoldPanel = ({
  order,
  problemHoldDetails,
  rowBusy,
  formatDate,
  onEditProblemReason,
}: PreparationProblemHoldPanelProps) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-900/15">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h4 className="font-semibold text-amber-900 dark:text-amber-200">
            {t("preparation.problemPanel.title")}
          </h4>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
            {t("preparation.problemPanel.desc")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onEditProblemReason(order.orderNumber)}
          disabled={rowBusy}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:border-amber-300 dark:border-amber-700 dark:bg-gray-800 dark:text-amber-300"
        >
          <PencilIcon className="h-3 w-3" />
          {problemHoldDetails.reason
            ? t("preparation.problemPanel.edit")
            : t("preparation.problemPanel.addReason")}
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {problemHoldDetails.reason ? (
          <div className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-amber-700 dark:bg-gray-800 dark:text-gray-100">
            {problemHoldDetails.reason}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-amber-300 bg-white/60 px-3 py-2 text-xs text-amber-700 dark:border-amber-700 dark:bg-gray-800/60 dark:text-amber-300">
            {t("preparation.problemPanel.noReason")}
          </p>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-amber-800 dark:text-amber-300">
          {problemHoldDetails.heldAt ? (
            <span>
              {t("preparation.problemPanel.heldAt", {
                date: formatDate(problemHoldDetails.heldAt),
              })}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PreparationProblemHoldPanel;
