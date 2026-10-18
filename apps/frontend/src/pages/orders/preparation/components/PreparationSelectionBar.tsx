import React from "react";
import { useTranslation } from "react-i18next";
import { PreparationColumnSettingsDropdown } from "./PreparationColumnSettingsDropdown";
import { PreparationBulkActions } from "./PreparationBulkActions";
import type { PreparationColumnKey, PreparationFilterSection } from "../constants";
import type { PreparationStatusOption } from "../types";

export interface PreparationSelectionBarProps {
  allVisibleSelected: boolean;
  toggleSelectAllVisible: () => void;
  totalVisibleOrders: number;
  inventoryLoading: boolean;
  loading: boolean;
  // Column settings
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  columnSettingsOpen: boolean;
  setColumnSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  visibleColumns: PreparationColumnKey[];
  toggleColumn: (col: PreparationColumnKey) => void;
  visibleFilterSections: PreparationFilterSection[];
  toggleFilterSection: (sec: PreparationFilterSection) => void;
  // Bulk Actions
  selectedOrdersCount: number;
  bulkStatus: string;
  statusOptions: PreparationStatusOption[];
  statusLabelMap: Map<string, string>;
  bulkUpdating: boolean;
  preparationEnabled?: boolean;
  bulkStatusUpdateEnabled?: boolean;
  sendingToTurbo?: boolean;
  printingInvoices?: boolean;
  onBulkStatusChange: (status: string) => void;
  onApply: () => void;
  onApplyToAll: () => void;
  onClear: () => void;
  onClearSelection: () => void;
  onSendToTurbo?: () => void;
  onSendToShipping?: () => void;
  onSendToInternalCourier?: () => void;
  onPrintInvoices?: () => void;
}

export const PreparationSelectionBar: React.FC<PreparationSelectionBarProps> = ({
  allVisibleSelected,
  toggleSelectAllVisible,
  totalVisibleOrders,
  inventoryLoading,
  loading,
  showFilters,
  setShowFilters,
  columnSettingsOpen,
  setColumnSettingsOpen,
  visibleColumns,
  toggleColumn,
  visibleFilterSections,
  toggleFilterSection,
  selectedOrdersCount,
  bulkStatus,
  statusOptions,
  statusLabelMap,
  bulkUpdating,
  preparationEnabled,
  bulkStatusUpdateEnabled,
  sendingToTurbo,
  printingInvoices,
  onBulkStatusChange,
  onApply,
  onApplyToAll,
  onClear,
  onClearSelection,
  onSendToTurbo,
  onSendToShipping,
  onSendToInternalCourier,
  onPrintInvoices,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border/70 px-3 py-2 sm:px-3 sm:py-2 bg-card/60">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border/70 bg-background px-2.5 py-1 text-xs font-mono text-foreground transition hover:bg-muted select-none">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={toggleSelectAllVisible}
            className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
          />
          {t("preparation.selectAllCheckbox", { defaultValue: "تحديد كل المعروض" })}
        </label>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            {t("preparation.k_4", { defaultValue: "الإجمالي" })}
          </span>
          <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono font-bold tabular-nums text-foreground">
            {totalVisibleOrders}
          </span>
        </div>
        {inventoryLoading && (
          <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-mono text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <div className="h-2 w-2 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            {t("preparation.checkingInventory", { defaultValue: "جاري فحص المخزون..." })}
          </div>
        )}
        {!inventoryLoading && loading && (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        )}

        <div className="ms-auto" data-column-settings>
          <PreparationColumnSettingsDropdown
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            columnSettingsOpen={columnSettingsOpen}
            setColumnSettingsOpen={setColumnSettingsOpen}
            visibleColumns={visibleColumns}
            toggleColumn={toggleColumn}
            visibleFilterSections={visibleFilterSections}
            toggleFilterSection={toggleFilterSection}
          />
        </div>
      </div>

      {selectedOrdersCount > 0 && (
        <div className="animate-in fade-in-0 slide-in-from-top-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2.5 duration-200 sm:px-4 sm:py-3">
          <PreparationBulkActions
            compact
            selectedOrdersCount={selectedOrdersCount}
            bulkStatus={bulkStatus}
            statusOptions={statusOptions}
            statusLabelMap={statusLabelMap}
            bulkUpdating={bulkUpdating}
            preparationEnabled={preparationEnabled}
            bulkStatusUpdateEnabled={bulkStatusUpdateEnabled}
            allVisibleSelected={allVisibleSelected}
            totalVisibleOrders={totalVisibleOrders}
            sendingToTurbo={sendingToTurbo}
            printingInvoices={printingInvoices}
            onBulkStatusChange={onBulkStatusChange}
            onApply={onApply}
            onApplyToAll={onApplyToAll}
            onClear={onClear}
            onSelectAll={toggleSelectAllVisible}
            onClearSelection={onClearSelection}
            onSendToTurbo={onSendToTurbo}
            onSendToShipping={onSendToShipping}
            onSendToInternalCourier={onSendToInternalCourier}
            onPrintInvoices={onPrintInvoices}
          />
        </div>
      )}
    </>
  );
};

export default PreparationSelectionBar;
