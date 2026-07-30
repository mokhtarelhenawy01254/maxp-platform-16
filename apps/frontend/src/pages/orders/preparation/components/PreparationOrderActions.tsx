import { RefreshCw as ArrowPathIcon, Check as CheckCircleIcon, AlertTriangle as ExclamationTriangleIcon, Printer as PrinterIcon, Truck as TruckIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
;
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
  onPrintPreparationSlip,
}: PreparationOrderActionsProps) => {
  const { t } = useTranslation();
  const merchantFulfillment = order.merchantFulfillment;
  const canPrepare = merchantFulfillment?.canPrepare !== false;
  const isPrinting = printingOrderNumber === order.orderNumber;

  if (!canPrepare) {
    return (
      <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-500">
          {t("preparation.actionLabels.viewOnlyDesc")}
        </p>
        <span className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600">
          {t("preparation.actionLabels.viewOnly")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
      {/* Status select */}
      <select
        value={currentSelection}
        onChange={(e) => onStatusSelectionChange(order.orderNumber, e.target.value)}
        disabled={!preparationSettings.enabled}
        className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 outline-none transition focus:border-amber-400 focus:bg-white sm:max-w-[180px]"
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
        className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
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
          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 transition hover:border-rose-300 disabled:opacity-50"
        >
          <ExclamationTriangleIcon className="h-3.5 w-3.5" />
          {t("preparation.actionLabels.holdShortage")}
        </button>
      ) : null}

      {/* Release hold */}
      {order.stage === "STOCK_SHORTAGE" ? (
        <button
          type="button"
          onClick={() => onReleaseShortageHold(order.orderNumber)}
          disabled={rowBusy}
          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 transition hover:border-indigo-300 disabled:opacity-50"
        >
          <ArrowPathIcon className="h-3.5 w-3.5" />
          {t("preparation.actionLabels.returnToPreparation")}
        </button>
      ) : null}

      {/* Ready to ship badge */}
      {order.normalizedStatus === preparationSettings.handoffStatus ||
      order.stage === "READY_TO_SHIP" ? (
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          <TruckIcon className="h-3.5 w-3.5" />
          {t("preparation.k_10")}
        </span>
      ) : null}

      {/* Print */}
      <button
        type="button"
        onClick={() => onPrintPreparationSlip(order.orderNumber)}
        disabled={isPrinting}
        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition hover:border-amber-300 disabled:opacity-50"
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
          className="inline-flex items-center rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-300"
        >
          {t("preparation.actionLabels.openOrder")}
        </Link>
      ) : null}
    </div>
  );
};

export default PreparationOrderActions;
