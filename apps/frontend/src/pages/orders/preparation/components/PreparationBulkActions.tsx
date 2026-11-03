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
  onSendToTurbo?: () => void;
  onSendToShipping?: () => void;
  onSendToInternalCourier?: () => void;
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
  onSendToShipping,
  onSendToInternalCourier,
  onPrintInvoices,
}: PreparationBulkActionsProps) => {
  const { t } = useTranslation();

  return (
    <><div className="flex flex-wrap items-center gap-2 max-sm:flex-col max-sm:items-stretch">
      {!compact && (
        <>
          <span className="text-sm font-semibold text-foreground">{t("preparation.bulkActions.title")}</span>

          <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
            <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500" />
            {t("preparation.bulkActions.selected", { count: selectedOrdersCount })}
          </span>

          <span className="mx-1 hidden h-5 w-px bg-border sm:block" />

          <div className="flex items-center gap-1.5 max-sm:w-full max-sm:justify-stretch">
            <button
              onClick={onSelectAll}
              disabled={totalVisibleOrders === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border/70 px-3 py-1.5 text-xs font-medium text-foreground transition active:scale-[0.98] hover:border-border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 max-sm:flex-1"
            >
              <Squares2X2Icon className="h-4 w-4" />
              {allVisibleSelected ? t("preparation.bulkActions.deselectAll") : t("preparation.bulkActions.selectAll")}
            </button>
            <button
              onClick={onClearSelection}
              disabled={selectedOrdersCount === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition active:scale-[0.98] hover:border-border hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 max-sm:flex-1"
            >
              <XCircleIcon className="h-4 w-4" />
              {t("preparation.bulkActions.clearSelection")}
            </button>
          </div>

          <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
        </>
      )}

      {compact && selectedOrdersCount > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-100/80 px-2.5 py-1 text-xs font-bold tabular-nums text-amber-900 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
          <CheckCircleIcon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          {selectedOrdersCount} {t("preparation.bulkActions.selected_plural", { count: selectedOrdersCount })}
        </span>
      )}

      <select
          value={bulkStatus}
          onChange={(e) => onBulkStatusChange(e.target.value)}
          disabled={!preparationEnabled || !bulkStatusUpdateEnabled}
          className="flex-1 rounded-xl border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground outline-none transition focus:border-primary sm:max-w-xs max-sm:w-full"
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
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition active:scale-[0.98] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 max-sm:flex-1"
        >
          {bulkUpdating ? (
            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircleIcon className="h-3.5 w-3.5" />
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
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-secondary px-3.5 py-1.5 text-xs font-medium text-secondary-foreground transition active:scale-[0.98] hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-50 max-sm:flex-1"
        >
          {bulkUpdating ? (
            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircleIcon className="h-3.5 w-3.5" />
          )}
          {t("preparation.bulkActions.applyToAll")}
        </button>

        {/* Clear selection */}
        <button
          onClick={onClearSelection || onClear}
          disabled={selectedOrdersCount === 0 && !bulkStatus}
          className="inline-flex items-center justify-center rounded-xl border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition active:scale-[0.98] hover:border-border hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 max-sm:flex-1"
        >
          {t("preparation.bulkActions.clearSelection", "إلغاء التحديد")}
        </button>

        {/* Print Invoices */}
        {onPrintInvoices ? (
          <button
            onClick={onPrintInvoices}
            disabled={selectedOrdersCount === 0 || printingInvoices}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white transition active:scale-[0.98] hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600 max-sm:flex-1"
          >
            {printingInvoices ? (
              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PrinterIcon className="h-3.5 w-3.5" />
            )}
            {t("preparation.bulkActions.printInvoices")}
          </button>
        ) : null}

        {/* Send to Shipping */}
        <span className="mx-0.5 hidden h-4 w-px bg-border sm:block" />
        <button
          onClick={onSendToShipping || onSendToTurbo}
          disabled={selectedOrdersCount === 0 || sendingToTurbo}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white transition active:scale-[0.98] hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600 max-sm:flex-1"
        >
          {sendingToTurbo ? (
            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <TruckIcon className="h-3.5 w-3.5" />
          )}
          {t("preparation.bulkActions.sendToShipping", "شحن الطلبات المحددة")}
        </button>

        {onSendToInternalCourier ? (
          <button
            onClick={onSendToInternalCourier}
            disabled={selectedOrdersCount === 0 || sendingToTurbo}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-background text-foreground px-3 py-1.5 text-xs font-medium transition active:scale-[0.98] hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 max-sm:flex-1"
          >
            <TruckIcon className="h-3.5 w-3.5 text-emerald-600" />
            <span>مندوب داخلي</span>
          </button>
        ) : null}
      </div>

      {!bulkStatusUpdateEnabled ? (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          {t("preparation.bulkActions.disabledMessage")}
        </div>
      ) : null}
    </>
  );
};

export { PreparationBulkActions };
export default PreparationBulkActions;
