import { useTranslation } from "react-i18next";
import { ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { SHORTAGE_REASON_OPTIONS } from "../constants";
import {
  getDateInputValueWithOffset,
  getShortageReasonLabel,
} from "../helpers";
import type {
  PreparationOrder,
  ShortageFollowUpVisual,
  ShortageHoldDetails,
} from "../types";

interface PreparationOrderShortagePanelProps {
  order: PreparationOrder;
  shortageHoldDetails: ShortageHoldDetails;
  shortageFollowUpVisual: ShortageFollowUpVisual | null;
  rowBusy: boolean;
  formatDate: (value: string) => string;
  onShortageFieldChange: (
    orderNumber: string,
    field: keyof ShortageHoldDetails,
    value: string | boolean,
  ) => void;
  onSaveShortageHoldDetails: (
    orderNumber: string,
    overrides?: Partial<ShortageHoldDetails>,
    options?: { successMessage?: string | null },
  ) => Promise<boolean>;
}

const PreparationOrderShortagePanel = ({
  order,
  shortageHoldDetails,
  shortageFollowUpVisual,
  rowBusy,
  formatDate,
  onShortageFieldChange,
  onSaveShortageHoldDetails,
}: PreparationOrderShortagePanelProps) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-800 dark:bg-rose-900/15">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="font-semibold text-rose-900 dark:text-rose-200">{t("preparation.shortagePanel.title")}</h4>
          <p className="mt-1 text-xs text-rose-800 dark:text-rose-300">
            {t("preparation.shortagePanel.desc")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-rose-200 bg-white px-3 py-1 font-medium text-rose-800">
            {getShortageReasonLabel(shortageHoldDetails.reason)}
          </span>
          {shortageHoldDetails.owner ? (
          <span className="rounded-full border border-rose-200 bg-white px-3 py-1 font-medium text-rose-800 dark:border-rose-700 dark:bg-gray-800 dark:text-rose-300">
              {t("preparation.shortagePanel.ownerBadge", { name: shortageHoldDetails.owner })}
            </span>
          ) : null}
          {shortageHoldDetails.customerNotified ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
              {t("preparation.shortagePanel.customerNotifiedBadge")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="mb-2 block text-xs font-medium text-rose-900 dark:text-rose-200">
            {t("preparation.shortagePanel.reasonLabel")}
          </span>
          <select
            value={shortageHoldDetails.reason}
            onChange={(event) =>
              onShortageFieldChange(order.orderNumber, "reason", event.target.value)
            }
            className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-rose-300 dark:border-rose-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-rose-400"
          >
            {SHORTAGE_REASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-medium text-rose-900 dark:text-rose-200">
            {t("preparation.shortagePanel.ownerLabel")}
          </span>
          <input
            type="text"
            value={shortageHoldDetails.owner}
            onChange={(event) =>
              onShortageFieldChange(order.orderNumber, "owner", event.target.value)
            }
            placeholder={t("preparation.shortagePanel.ownerPlaceholder")}
            className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-rose-300 dark:border-rose-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-rose-400"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-medium text-rose-900 dark:text-rose-200">
            {t("preparation.shortagePanel.followUpDate")}
          </span>
          <input
            type="date"
            value={shortageHoldDetails.followUpDate}
            onChange={(event) =>
              onShortageFieldChange(
                order.orderNumber,
                "followUpDate",
                event.target.value,
              )
            }
            className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-rose-300 dark:border-rose-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-rose-400"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-gray-700 dark:border-rose-700 dark:bg-gray-800 dark:text-gray-300">
          <input
            type="checkbox"
            checked={shortageHoldDetails.customerNotified}
            onChange={(event) =>
              onShortageFieldChange(
                order.orderNumber,
                "customerNotified",
                event.target.checked,
              )
            }
            className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 dark:border-gray-500 dark:text-rose-400"
          />
          {t("preparation.shortagePanel.customerNotified")}
        </label>
      </div>

      <label className="mt-3 block">
          <span className="mb-2 block text-xs font-medium text-rose-900 dark:text-rose-200">
            {t("preparation.shortagePanel.notesLabel")}
          </span>
          <textarea
            value={shortageHoldDetails.note}
            onChange={(event) =>
              onShortageFieldChange(order.orderNumber, "note", event.target.value)
            }
            rows={3}
            placeholder={t("preparation.shortagePanel.notesPlaceholder")}
            className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-rose-300 dark:border-rose-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-rose-400"
        />
      </label>

      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3 text-xs text-rose-900 dark:text-rose-200">
            {shortageHoldDetails.heldAt ? (
              <span>{t("preparation.shortagePanel.heldAt", { date: formatDate(shortageHoldDetails.heldAt) })}</span>
            ) : null}
            {shortageHoldDetails.followUpDate ? (
              <span>{t("preparation.shortagePanel.followUpOn", { date: formatDate(shortageHoldDetails.followUpDate) })}</span>
            ) : (
              <span>{t("preparation.shortagePanel.noFollowUpDate")}</span>
            )}
            {shortageFollowUpVisual ? (
              <span className={shortageFollowUpVisual.badgeClass}>
                {shortageFollowUpVisual.label}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void onSaveShortageHoldDetails(
                  order.orderNumber,
                  {
                    ...shortageHoldDetails,
                    followUpDate: getDateInputValueWithOffset(0),
                  },
                  { successMessage: t("preparation.shortagePanel.todaySuccess") },
                )
              }
              disabled={rowBusy}
              className="inline-flex items-center justify-center rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-medium text-sky-800 transition hover:border-sky-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-800 dark:bg-gray-800 dark:text-sky-300 dark:hover:border-sky-700"
            >
              {t("preparation.shortagePanel.setToday")}
            </button>

            <button
              type="button"
              onClick={() =>
                void onSaveShortageHoldDetails(
                  order.orderNumber,
                  {
                    ...shortageHoldDetails,
                    followUpDate: getDateInputValueWithOffset(1),
                  },
                  { successMessage: t("preparation.shortagePanel.tomorrowSuccess") },
                )
              }
              disabled={rowBusy}
              className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-medium text-indigo-800 transition hover:border-indigo-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-800 dark:bg-gray-800 dark:text-indigo-300 dark:hover:border-indigo-700"
            >
              {t("preparation.shortagePanel.setTomorrow")}
            </button>

            <button
              type="button"
              onClick={() =>
                void onSaveShortageHoldDetails(
                  order.orderNumber,
                  {
                    ...shortageHoldDetails,
                    followUpDate: "",
                  },
                  { successMessage: t("preparation.shortagePanel.clearDateSuccess") },
                )
              }
              disabled={rowBusy || !shortageHoldDetails.followUpDate}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500"
            >
              {t("preparation.shortagePanel.clearDate")}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void onSaveShortageHoldDetails(order.orderNumber)}
          disabled={rowBusy}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-medium text-rose-800 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-700 dark:bg-gray-800 dark:text-rose-300 dark:hover:border-rose-600"
        >
          {rowBusy ? (
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircleIcon className="h-4 w-4" />
          )}
          {t("preparation.shortagePanel.save")}
        </button>
      </div>
    </div>
  );
};

export default PreparationOrderShortagePanel;
