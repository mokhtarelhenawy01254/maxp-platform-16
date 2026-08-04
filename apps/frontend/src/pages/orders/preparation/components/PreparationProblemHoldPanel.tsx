import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowPathIcon, CheckCircleIcon, PencilIcon } from "@heroicons/react/24/outline";
import type { PreparationOrder, ProblemHoldDetails } from "../types";

interface PreparationProblemHoldPanelProps {
  order: PreparationOrder;
  problemHoldDetails: ProblemHoldDetails;
  rowBusy: boolean;
  formatDate: (value: string) => string;
  onSaveProblemHoldDetails: (
    orderNumber: string,
    overrides?: Partial<ProblemHoldDetails>,
    options?: { successMessage?: string | null },
  ) => Promise<boolean>;
}

const PreparationProblemHoldPanel = ({
  order,
  problemHoldDetails,
  rowBusy,
  formatDate,
  onSaveProblemHoldDetails,
}: PreparationProblemHoldPanelProps) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [reason, setReason] = useState(problemHoldDetails.reason);

  const handleSave = async () => {
    const success = await onSaveProblemHoldDetails(order.orderNumber, { reason: reason.trim() });
    if (success) setIsEditing(false);
  };

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
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={rowBusy}
            className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:border-amber-300 dark:border-amber-700 dark:bg-gray-800 dark:text-amber-300"
          >
            <PencilIcon className="h-3 w-3" />
            {t("preparation.problemPanel.edit")}
          </button>
        ) : null}
      </div>

      {isEditing ? (
        <div className="mt-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-amber-900 dark:text-amber-200">
              {t("preparation.holdDialog.reasonLabel")}
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={String(t("preparation.holdDialog.reasonPlaceholder"))}
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-amber-300 dark:border-amber-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setReason(problemHoldDetails.reason);
              }}
              disabled={rowBusy}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              {t("preparation.holdDialog.cancel")}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={rowBusy || !reason.trim()}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-amber-300 bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {rowBusy ? (
                <ArrowPathIcon className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircleIcon className="h-3 w-3" />
              )}
              {t("preparation.problemPanel.save")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-amber-700 dark:bg-gray-800 dark:text-gray-100">
            {problemHoldDetails.reason || (
              <span className="italic text-gray-400">{t("preparation.problemPanel.noReason")}</span>
            )}
          </div>
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
      )}
    </div>
  );
};

export default PreparationProblemHoldPanel;
