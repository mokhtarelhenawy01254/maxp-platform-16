import { useTranslation } from "react-i18next";
import { ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { PROBLEM_REASON_OPTIONS } from "../constants";
import { getProblemReasonLabel } from "../helpers";
import type {
  PreparationOrder,
  ProblemHoldDetails,
  ShortageFollowUpVisual,
} from "../types";

interface PreparationProblemHoldPanelProps {
  order: PreparationOrder;
  problemHoldDetails: ProblemHoldDetails;
  shortageFollowUpVisual: ShortageFollowUpVisual | null;
  rowBusy: boolean;
  formatDate: (value: string) => string;
  onProblemFieldChange: (
    orderNumber: string,
    field: keyof ProblemHoldDetails,
    value: string | boolean,
  ) => void;
  onSaveProblemHoldDetails: (
    orderNumber: string,
    overrides?: Partial<ProblemHoldDetails>,
    options?: { successMessage?: string | null },
  ) => Promise<boolean>;
}

const PreparationProblemHoldPanel = ({
  order,
  problemHoldDetails,
  shortageFollowUpVisual,
  rowBusy,
  formatDate,
  onProblemFieldChange,
  onSaveProblemHoldDetails,
}: PreparationProblemHoldPanelProps) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-900/15">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="font-semibold text-amber-900 dark:text-amber-200">
            {t("preparation.problemPanel.title")}
          </h4>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
            {t("preparation.problemPanel.desc")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-amber-200 bg-white px-3 py-1 font-medium text-amber-800 dark:border-amber-700 dark:bg-gray-800 dark:text-amber-300">
            {getProblemReasonLabel(problemHoldDetails.reason)}
          </span>
          {problemHoldDetails.owner ? (
            <span className="rounded-full border border-amber-200 bg-white px-3 py-1 font-medium text-amber-800 dark:border-amber-700 dark:bg-gray-800 dark:text-amber-300">
              {t("preparation.problemPanel.ownerBadge", {
                name: problemHoldDetails.owner,
              })}
            </span>
          ) : null}
          {problemHoldDetails.customerNotified ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
              {t("preparation.problemPanel.customerNotifiedBadge")}
            </span>
          ) : null}
        </div>
      </div>

      {problemHoldDetails.note ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-gray-800 dark:text-amber-200">
          <span className="font-semibold">{t("preparation.problemPanel.reasonBadge")}</span>{" "}
          {problemHoldDetails.note}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="mb-2 block text-xs font-medium text-amber-900 dark:text-amber-200">
            {t("preparation.problemPanel.reasonLabel")}
          </span>
          <select
            value={problemHoldDetails.reason}
            onChange={(event) =>
              onProblemFieldChange(order.orderNumber, "reason", event.target.value)
            }
            className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-300 dark:border-amber-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-amber-400"
          >
            {PROBLEM_REASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-medium text-amber-900 dark:text-amber-200">
            {t("preparation.problemPanel.ownerLabel")}
          </span>
          <input
            type="text"
            value={problemHoldDetails.owner}
            onChange={(event) =>
              onProblemFieldChange(order.orderNumber, "owner", event.target.value)
            }
            placeholder={String(t("preparation.problemPanel.ownerPlaceholder"))}
            className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-300 dark:border-amber-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-amber-400"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-medium text-amber-900 dark:text-amber-200">
            {t("preparation.problemPanel.followUpDate")}
          </span>
          <input
            type="date"
            value={problemHoldDetails.followUpDate}
            onChange={(event) =>
              onProblemFieldChange(
                order.orderNumber,
                "followUpDate",
                event.target.value,
              )
            }
            className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-300 dark:border-amber-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-amber-400"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-gray-700 dark:border-amber-700 dark:bg-gray-800 dark:text-gray-300">
          <input
            type="checkbox"
            checked={problemHoldDetails.customerNotified}
            onChange={(event) =>
              onProblemFieldChange(
                order.orderNumber,
                "customerNotified",
                event.target.checked,
              )
            }
            className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 dark:border-gray-500 dark:text-amber-400"
          />
          {t("preparation.problemPanel.customerNotified")}
        </label>
      </div>

      <label className="mt-3 block">
        <span className="mb-2 block text-xs font-medium text-amber-900 dark:text-amber-200">
          {t("preparation.problemPanel.notesLabel")}
        </span>
        <textarea
          value={problemHoldDetails.note}
          onChange={(event) =>
            onProblemFieldChange(order.orderNumber, "note", event.target.value)
          }
          rows={3}
          placeholder={String(t("preparation.problemPanel.notesPlaceholder"))}
          className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-300 dark:border-amber-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-amber-400"
        />
      </label>

      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3 text-xs text-amber-900 dark:text-amber-200">
          {problemHoldDetails.heldAt ? (
            <span>
              {t("preparation.problemPanel.heldAt", {
                date: formatDate(problemHoldDetails.heldAt),
              })}
              {problemHoldDetails.heldBy
                ? ` — ${t("preparation.problemPanel.heldBy", {
                    name: problemHoldDetails.heldBy,
                  })}`
                : ""}
            </span>
          ) : null}
          {problemHoldDetails.followUpDate ? (
            <span>
              {t("preparation.problemPanel.followUpOn", {
                date: formatDate(problemHoldDetails.followUpDate),
              })}
            </span>
          ) : (
            <span>{t("preparation.problemPanel.noFollowUpDate")}</span>
          )}
          {shortageFollowUpVisual ? (
            <span className={shortageFollowUpVisual.badgeClass}>
              {shortageFollowUpVisual.label}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => void onSaveProblemHoldDetails(order.orderNumber)}
          disabled={rowBusy}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-white px-5 py-3 text-sm font-medium text-amber-800 transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-700 dark:bg-gray-800 dark:text-amber-300 dark:hover:border-amber-600"
        >
          {rowBusy ? (
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircleIcon className="h-4 w-4" />
          )}
          {t("preparation.problemPanel.save")}
        </button>
      </div>
    </div>
  );
};

export default PreparationProblemHoldPanel;
