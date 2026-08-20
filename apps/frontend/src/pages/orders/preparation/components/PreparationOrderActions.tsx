import { useTranslation } from "react-i18next";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PauseIcon,
  PrinterIcon,
  TruckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import type {
  PreparationOrder,
  PreparationQueueSettings,
  PreparationStatusOption,
} from "../types";

interface PreparationOrderActionsProps {
  order: PreparationOrder;
  statusOptions: PreparationStatusOption[];
  statusLabelMap: Map<string, string>;
  currentSelection: string;
  actionLabel: string;
  rowBusy: boolean;
  printingOrderNumber: string | null;
  preparationSettings: PreparationQueueSettings;
  onStatusSelectionChange: (orderNumber: string, nextStatus: string) => void;
  onSingleStatusUpdate: (orderNumber: string, nextStatus: string) => void;
  onMarkAsShortageHold: (orderNumber: string) => void;
  onReleaseShortageHold: (orderNumber: string) => void;
  onMarkAsShortageFailed: (orderNumber: string) => void;
  onHoldAsProblem: (orderNumber: string) => void;
  onReleaseProblemHold: (orderNumber: string) => void;
  onPrintPreparationSlip: (orderNumber: string) => void;
}

const PreparationOrderActions = ({
  order,
  statusOptions,
  statusLabelMap,
  currentSelection,
  actionLabel,
  rowBusy,
  printingOrderNumber,
  preparationSettings,
  onStatusSelectionChange,
  onSingleStatusUpdate,
  onMarkAsShortageHold,
  onReleaseShortageHold,
  onMarkAsShortageFailed,
  onHoldAsProblem,
  onReleaseProblemHold,
  onPrintPreparationSlip,
}: PreparationOrderActionsProps) => {
  const { t } = useTranslation();
  const merchantFulfillment = order.merchantFulfillment;
  const canPrepare = merchantFulfillment?.canPrepare !== false;
  const isPrinting = printingOrderNumber === order.orderNumber;
  const isProblemHeld = order.stage === "ON_HOLD_PREP";
  const canHoldAsProblem =
    !isProblemHeld &&
    order.stage !== "READY_TO_SHIP" &&
    order.normalizedStatus !== preparationSettings.handoffStatus;

  if (!canPrepare) {
    return (
      <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("preparation.actionLabels.viewOnlyDesc")}
        </p>
        <span className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {t("preparation.actionLabels.viewOnly")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
      {/* Status select */}
      <select
        value={currentSelection}
        onChange={(e) => onStatusSelectionChange(order.orderNumber, e.target.value)}
        disabled={!preparationSettings.enabled}
        className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-800 outline-none transition focus:border-amber-400 focus:bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:focus:bg-gray-700 dark:focus:border-amber-500 sm:max-w-[180px] max-sm:min-h-[40px]"
      >
        {statusOptions.map((status) => (
          <option key={status.code} value={status.code}>
            {statusLabelMap.get(status.code) || status.fallbackName}
          </option>
        ))}
      </select>

      {/* Apply action */}
      <button
        onClick={() => onSingleStatusUpdate(order.orderNumber, currentSelection)}
        disabled={!preparationSettings.enabled || rowBusy}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-medium text-white transition active:scale-95 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600 max-sm:min-h-[40px] max-sm:flex-1"
      >
        {rowBusy ? (
          <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCircleIcon className="h-3.5 w-3.5" />
        )}
        {actionLabel}
      </button>

      {/* Shortage hold */}
      {order.missingItemsCount > 0 && order.stage !== "STOCK_SHORTAGE" ? (
        <button
          type="button"
          onClick={() => onMarkAsShortageHold(order.orderNumber)}
          disabled={rowBusy}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700 transition active:scale-95 hover:border-rose-300 disabled:opacity-50 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300 dark:hover:border-rose-700 max-sm:min-h-[40px] max-sm:flex-1"
        >
          <ExclamationTriangleIcon className="h-3.5 w-3.5" />
          {t("preparation.actionLabels.holdShortage")}
        </button>
      ) : null}

      {/* Release shortage hold */}
      {order.stage === "STOCK_SHORTAGE" ? (
        <button
          type="button"
          onClick={() => onReleaseShortageHold(order.orderNumber)}
          disabled={rowBusy}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-xs font-medium text-indigo-700 transition active:scale-95 hover:border-indigo-300 disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:border-indigo-700 max-sm:min-h-[40px] max-sm:flex-1"
        >
          <ArrowPathIcon className="h-3.5 w-3.5" />
          {t("preparation.actionLabels.returnToPreparation")}
        </button>
      ) : null}

      {/* Mark as final shortage (SHORTAGE_FAILED) */}
      {order.stage === "STOCK_SHORTAGE" ? (
        <button
          type="button"
          onClick={() => onMarkAsShortageFailed(order.orderNumber)}
          disabled={rowBusy}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-purple-300 bg-purple-50 px-3 py-2.5 text-xs font-medium text-purple-700 transition active:scale-95 hover:border-purple-400 disabled:opacity-50 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:border-purple-700 max-sm:min-h-[40px] max-sm:flex-1"
        >
          <XCircleIcon className="h-3.5 w-3.5" />
          {t("preparation.shortagePanel.markAsShortageFailed")}
        </button>
      ) : null}

      {/* Hold as problem */}
      {canHoldAsProblem ? (
        <button
          type="button"
          onClick={() => onHoldAsProblem(order.orderNumber)}
          disabled={rowBusy}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700 transition active:scale-95 hover:border-amber-400 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:border-amber-700 max-sm:min-h-[40px] max-sm:flex-1"
        >
          <PauseIcon className="h-3.5 w-3.5" />
          {t("preparation.actionLabels.holdProblem")}
        </button>
      ) : null}

      {/* Release problem hold */}
      {isProblemHeld ? (
        <button
          type="button"
          onClick={() => onReleaseProblemHold(order.orderNumber)}
          disabled={rowBusy}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-xs font-medium text-indigo-700 transition active:scale-95 hover:border-indigo-300 disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:border-indigo-700 max-sm:min-h-[40px] max-sm:flex-1"
        >
          <ArrowPathIcon className="h-3.5 w-3.5" />
          {t("preparation.actionLabels.releaseProblem")}
        </button>
      ) : null}

      {/* Ready to ship badge */}
      {order.normalizedStatus === preparationSettings.handoffStatus ||
      order.stage === "READY_TO_SHIP" ? (
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          <TruckIcon className="h-3.5 w-3.5" />
          {t("preparation.k_10")}
        </span>
      ) : null}

      {/* Print */}
      <button
        type="button"
        onClick={() => onPrintPreparationSlip(order.orderNumber)}
        disabled={isPrinting}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700 transition active:scale-95 hover:border-amber-300 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:border-amber-700 max-sm:min-h-[40px] max-sm:flex-1"
      >
        {isPrinting ? (
          <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <PrinterIcon className="h-3.5 w-3.5" />
        )}
        {t("preparation.actionLabels.print")}
      </button>

      {/* Open order */}
      {!merchantFulfillment ? (
        <Link
          to={`/orders/${encodeURIComponent(order.orderNumber)}`}
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-medium text-gray-600 transition active:scale-95 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 max-sm:min-h-[40px] max-sm:flex-1"
        >
          {t("preparation.actionLabels.openOrder")}
        </Link>
      ) : null}
    </div>
  );
};

export default PreparationOrderActions;
