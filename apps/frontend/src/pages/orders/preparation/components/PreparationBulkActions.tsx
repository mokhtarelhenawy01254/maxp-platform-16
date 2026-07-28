import { useTranslation } from "react-i18next";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  PrinterIcon,
  TruckIcon,
  Squares2X2Icon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import type { PreparationStatusOption } from "../types";

interface PreparationBulkActionsProps {
  selectedOrdersCount: number;
  bulkStatus: string;
  statusOptions: PreparationStatusOption[];
  statusLabelMap: Map<string, string>;
  bulkUpdating: boolean;
  preparationEnabled: boolean;
  bulkStatusUpdateEnabled: boolean;
  allVisibleSelected: boolean;
  totalVisibleOrders: number;
  sendingToTurbo: boolean;
  printingInvoices?: boolean;
  compact?: boolean;
  onBulkStatusChange: (value: string) => void;
  onApply: () => void;
  onApplyToAll: () => void;
  onClear: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onSendToTurbo: () => void;
  onPrintInvoices?: () => void;
}

const PreparationBulkActions = ({
  selectedOrdersCount,
  bulkStatus,
  statusOptions,
  statusLabelMap,
  bulkUpdating,
  preparationEnabled,
  bulkStatusUpdateEnabled,
  allVisibleSelected,
  totalVisibleOrders,
  sendingToTurbo,
  printingInvoices = false,
  compact = false,
  onBulkStatusChange,
  onApply,
  onApplyToAll,
  onClear,
  onSelectAll,
  onClearSelection,
  onSendToTurbo,
  onPrintInvoices,
}: PreparationBulkActionsProps) => {
  const { t } = useTranslation();

  return (
    <><div className="flex flex-wrap items-center gap-2 max-sm:flex-col max-sm:items-stretch">
      {!compact && (
        <>
          <span className="text-sm font-semibold text-gray-700">{t("preparation.bulkActions.title")}</span>

          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
            <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500" />
            {t("preparation.bulkActions.selected", { count: selectedOrdersCount })}
          </span>

          <span className="mx-1 hidden h-5 w-px bg-gray-200 sm:block" />

          <div className="flex items-center gap-1.5 max-sm:w-full max-sm:justify-stretch">
            <button
              onClick={onSelectAll}
              disabled={totalVisibleOrders === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 max-sm:flex-1"
            >
              <Squares2X2Icon className="h-4 w-4" />
              {allVisibleSelected ? t("preparation.bulkActions.deselectAll") : t("preparation.bulkActions.selectAll")}
            </button>
            <button
              onClick={onClearSelection}
              disabled={selectedOrdersCount === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40 max-sm:flex-1"
            >
              <XCircleIcon className="h-4 w-4" />
              {t("preparation.bulkActions.clearSelection")}
            </button>
          </div>

          <span className="mx-1 hidden h-5 w-px bg-gray-200 sm:block" />
        </>
      )}

      {compact && selectedOrdersCount > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
          <CheckCircleIcon className="h-3.5 w-3.5" />
          {selectedOrdersCount} {t("preparation.bulkActions.selected_plural", { count: selectedOrdersCount })}
        </span>
      )}

      <select
          value={bulkStatus}
          onChange={(e) => onBulkStatusChange(e.target.value)}
          disabled={!preparationEnabled || !bulkStatusUpdateEnabled}
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-amber-400 focus:bg-white sm:max-w-xs max-sm:w-full"
        >
          <option value="">{t("preparation.bulkActions.targetStage")}</option>
          {statusOptions.map((status) => (
            <option key={status.code} value={status.code}>
              {statusLabelMap.get(status.code) || status.fallbackName}
            </option>
          ))}
        </select>

        {/* Apply */}
        <button
          onClick={onApply}
          disabled={
            !preparationEnabled ||
            !bulkStatusUpdateEnabled ||
            !bulkStatus ||
            selectedOrdersCount === 0 ||
            bulkUpdating
          }
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 max-sm:flex-1"
        >
          {bulkUpdating ? (
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircleIcon className="h-4 w-4" />
          )}
          {t("preparation.bulkActions.apply")}
        </button>

        {/* Apply to all */}
        <button
          onClick={onApplyToAll}
          disabled={
            !preparationEnabled ||
            !bulkStatusUpdateEnabled ||
            !bulkStatus ||
            totalVisibleOrders === 0 ||
            bulkUpdating
          }
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 max-sm:flex-1"
        >
          {bulkUpdating ? (
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircleIcon className="h-4 w-4" />
          )}
          {t("preparation.bulkActions.applyToAll")}
        </button>

        {/* Clear */}
        <button
          onClick={onClear}
          disabled={selectedOrdersCount === 0 && !bulkStatus}
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40 max-sm:flex-1"
        >
          {t("preparation.bulkActions.clearFilters")}
        </button>

        {/* Print Invoices */}
        {onPrintInvoices ? (
          <button
            onClick={onPrintInvoices}
            disabled={selectedOrdersCount === 0 || printingInvoices}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 max-sm:flex-1"
          >
            {printingInvoices ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <PrinterIcon className="h-4 w-4" />
            )}
            {t("preparation.bulkActions.printInvoices")}
          </button>
        ) : null}

        {/* Send to Turbo */}
        <span className="mx-1 hidden h-5 w-px bg-gray-200 sm:block" />
        <button
          onClick={onSendToTurbo}
          disabled={selectedOrdersCount === 0 || sendingToTurbo}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 max-sm:flex-1"
        >
          {sendingToTurbo ? (
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
          ) : (
            <TruckIcon className="h-4 w-4" />
          )}
          {t("preparation.bulkActions.sendToTurbo")}
        </button>
      </div>

      {!bulkStatusUpdateEnabled ? (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t("preparation.bulkActions.disabledMessage")}
        </div>
      ) : null}
    </>
  );
};

export default PreparationBulkActions;
