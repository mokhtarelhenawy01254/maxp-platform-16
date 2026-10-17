import React from "react";
import { useTranslation } from "react-i18next";
import { ExclamationTriangleIcon, PencilIcon } from "@heroicons/react/24/outline";
import type { ProblemHoldDetails } from "../../types";

export interface PreparationOrdersProblemCellProps {
  orderNumber: string;
  isProblemHeld: boolean;
  problemHoldDetails: ProblemHoldDetails;
  rowBusy: boolean;
  onEditProblemReason: (orderNumber: string) => void;
}

export const PreparationOrdersProblemCell: React.FC<PreparationOrdersProblemCellProps> = ({
  orderNumber,
  isProblemHeld,
  problemHoldDetails,
  rowBusy,
  onEditProblemReason,
}) => {
  const { t } = useTranslation();

  return (
    <td className="px-3 py-2.5">
      {isProblemHeld ? (
        <div className="flex items-start gap-1">
          <button
            type="button"
            onClick={() => onEditProblemReason(orderNumber)}
            disabled={rowBusy}
            title={String(t("preparation.problemPanel.edit"))}
            className="mt-0.5 shrink-0 rounded border border-slate-200 bg-white p-1 text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <PencilIcon className="h-3 w-3" />
          </button>
          {problemHoldDetails.reason ? (
            <span
              className="line-clamp-2 max-w-[180px] rounded border border-amber-300/80 bg-amber-50/80 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/60 dark:text-amber-300"
              title={problemHoldDetails.reason}
            >
              {problemHoldDetails.reason}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onEditProblemReason(orderNumber)}
              disabled={rowBusy}
              className="inline-flex items-center gap-1 rounded border border-dashed border-amber-400 bg-amber-50/60 px-2 py-0.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
            >
              <ExclamationTriangleIcon className="h-3 w-3" />
              {t("preparation.problemPanel.addReason")}
            </button>
          )}
        </div>
      ) : (
        <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
      )}
    </td>
  );
};

export default PreparationOrdersProblemCell;
