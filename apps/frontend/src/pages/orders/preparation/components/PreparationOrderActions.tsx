import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
  TruckIcon,
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
  const merchantFulfillment = order.merchantFulfillment;
  const canPrepare = merchantFulfillment?.canPrepare !== false;

  if (!canPrepare) {
    return (
      <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">الشركة هتجهز الطلب</p>
          <p className="mt-1 text-xs text-gray-500">
            التاجر يرى اسم العميل والمنتجات فقط، وأدوات التجهيز والطباعة غير مفعلة لهذا الطلب.
          </p>
        </div>
        <span className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
          عرض فقط
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-1 flex-col gap-3 md:flex-row">
        <select
          value={currentSelection}
          onChange={(event) =>
            onStatusSelectionChange(order.orderNumber, event.target.value)
          }
          disabled={!preparationSettings.enabled}
          className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:bg-white md:max-w-xs"
        >
          {statusOptions.map((status) => (
            <option key={status.code} value={status.code}>
              {statusLabelMap.get(status.code) || status.fallbackName}
            </option>
          ))}
        </select>

        <button
          onClick={() => onSingleStatusUpdate(order.orderNumber, currentSelection)}
          disabled={!preparationSettings.enabled || rowBusy}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {rowBusy ? (
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircleIcon className="h-4 w-4" />
          )}
          {actionLabel}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {order.missingItemsCount > 0 && order.stage !== "STOCK_SHORTAGE" ? (
          <button
            type="button"
            onClick={() => onMarkAsShortageHold(order.orderNumber)}
            disabled={rowBusy}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-800 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ExclamationTriangleIcon className="h-4 w-4" />
            تعليق بسبب العجز
          </button>
        ) : null}

        {order.stage === "STOCK_SHORTAGE" ? (
          <button
            type="button"
            onClick={() => onReleaseShortageHold(order.orderNumber)}
            disabled={rowBusy}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-medium text-indigo-800 transition hover:border-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowPathIcon className="h-4 w-4" />
            إرجاع للتجهيز
          </button>
        ) : null}

        {(order.normalizedStatus === preparationSettings.handoffStatus ||
          order.stage === "READY_TO_SHIP") ? (
          <span className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <TruckIcon className="h-4 w-4" />
            جاهز للتسليم للشحن
          </span>
        ) : null}

        <button
          type="button"
          onClick={() => onPrintPreparationSlip(order.orderNumber)}
          disabled={printingOrderNumber === order.orderNumber}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-800 transition hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {printingOrderNumber === order.orderNumber ? (
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
          ) : (
            <PrinterIcon className="h-4 w-4" />
          )}
          طباعة ورقة التجهيز
        </button>

        {!merchantFulfillment ? (
          <Link
            to={`/orders/${encodeURIComponent(order.orderNumber)}`}
            className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-300"
          >
            فتح الطلب
          </Link>
        ) : null}
      </div>
    </div>
  );
};

export default PreparationOrderActions;
