/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import PreparationOrdersTable from "./PreparationOrdersTable";
import PreparationPaginationBar from "./PreparationPaginationBar";
import { PreparationOrdersLoadingState } from "./PreparationOrdersLoadingState";
import { PreparationOrdersEmptyState } from "./PreparationOrdersEmptyState";
import { PreparationOrdersMobileList } from "./PreparationOrdersMobileList";
import type {
  PreparationOrder,
  PreparationSettings,
  ProblemHoldDetails,
  QcCheckType,
  ShortageHoldDetails,
} from "../types";

export interface PreparationOrdersContainerProps {
  loading: boolean;
  enrichedOrders: PreparationOrder[];
  pagination: { page: number; limit: number; total: number };
  totalPages: number;
  currentPageCount: number;
  pageSize: number;
  statusSelections: Record<string, string>;
  statusOptions: Array<{ value: string; label: string }>;
  statusLabelMap: Record<string, string>;
  selectedSet: Set<string>;
  rowUpdatingId: string | null;
  shortageSavingOrderId: string | null;
  problemHoldSavingOrderId: string | null;
  selectedWarehouseId: string;
  enabledQcChecks: QcCheckType[];
  qcChecklistState: Record<string, Record<string, boolean>>;
  shortageHoldDrafts: Record<string, ShortageHoldDetails>;
  problemHoldDrafts: Record<string, ProblemHoldDetails>;
  transferingItemKey: string | null;
  printingOrderNumber: string | null;
  preparationSettings: PreparationSettings;
  visibleColumns: Record<string, boolean>;
  formatPrice: (amount: number) => string;
  formatDate: (date: string) => string;
  toggleOrderSelection: (orderNumber: string) => void;
  handleQuickTransfer: (orderNumber: string, item: any) => Promise<void> | void;
  handleShortageFieldChange: (orderNumber: string, field: string, value: any) => void;
  saveShortageHoldDetails: (orderNumber: string) => Promise<void> | void;
  handleQcCheckToggle: (orderNumber: string, checkKey: string) => void;
  onStatusSelectionChange: (orderNumber: string, status: string) => void;
  handleRequestStatusChange: (orderNumber: string, targetStatus: string) => Promise<void> | void;
  handleMarkAsShortageHold: (orderNumber: string) => Promise<void> | void;
  handleReleaseShortageHold: (orderNumber: string) => Promise<void> | void;
  handleMarkAsShortageFailed: (orderNumber: string) => Promise<void> | void;
  handleHoldAsProblem: (orderNumber: string) => Promise<void> | void;
  handleReleaseProblemHold: (orderNumber: string) => Promise<void> | void;
  handleEditProblemReason: (orderNumber: string) => void;
  handlePrintPreparationSlip: (orderNumber: string) => Promise<void> | void;
  onPageSizeChange: (size: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export const PreparationOrdersContainer: React.FC<PreparationOrdersContainerProps> = ({
  loading,
  enrichedOrders,
  pagination,
  totalPages,
  currentPageCount,
  pageSize,
  statusSelections,
  statusOptions,
  statusLabelMap,
  selectedSet,
  rowUpdatingId,
  shortageSavingOrderId,
  problemHoldSavingOrderId,
  selectedWarehouseId,
  enabledQcChecks,
  qcChecklistState,
  shortageHoldDrafts,
  problemHoldDrafts,
  transferingItemKey,
  printingOrderNumber,
  preparationSettings,
  visibleColumns,
  formatPrice,
  formatDate,
  toggleOrderSelection,
  handleQuickTransfer,
  handleShortageFieldChange,
  saveShortageHoldDetails,
  handleQcCheckToggle,
  onStatusSelectionChange,
  handleRequestStatusChange,
  handleMarkAsShortageHold,
  handleReleaseShortageHold,
  handleMarkAsShortageFailed,
  handleHoldAsProblem,
  handleReleaseProblemHold,
  handleEditProblemReason,
  handlePrintPreparationSlip,
  onPageSizeChange,
  onPreviousPage,
  onNextPage,
}) => {
  return (
    <>
      {loading ? (
        <PreparationOrdersLoadingState />
      ) : enrichedOrders.length === 0 ? (
        <PreparationOrdersEmptyState />
      ) : (
        <>
          <PreparationOrdersMobileList
            enrichedOrders={enrichedOrders}
            selectedSet={selectedSet}
            statusSelections={statusSelections}
            statusOptions={statusOptions}
            statusLabelMap={statusLabelMap}
            rowUpdatingId={rowUpdatingId}
            shortageSavingOrderId={shortageSavingOrderId}
            problemHoldSavingOrderId={problemHoldSavingOrderId}
            selectedWarehouseId={selectedWarehouseId}
            enabledQcChecks={enabledQcChecks}
            qcChecklistState={qcChecklistState}
            shortageHoldDrafts={shortageHoldDrafts}
            problemHoldDrafts={problemHoldDrafts}
            transferingItemKey={transferingItemKey}
            printingOrderNumber={printingOrderNumber}
            preparationSettings={preparationSettings}
            formatPrice={formatPrice}
            formatDate={formatDate}
            toggleOrderSelection={toggleOrderSelection}
            handleQuickTransfer={handleQuickTransfer}
            handleShortageFieldChange={handleShortageFieldChange}
            saveShortageHoldDetails={saveShortageHoldDetails}
            handleQcCheckToggle={handleQcCheckToggle}
            onStatusSelectionChange={onStatusSelectionChange}
            handleRequestStatusChange={handleRequestStatusChange}
            handleMarkAsShortageHold={handleMarkAsShortageHold}
            handleReleaseShortageHold={handleReleaseShortageHold}
            handleMarkAsShortageFailed={handleMarkAsShortageFailed}
            handleHoldAsProblem={handleHoldAsProblem}
            handleReleaseProblemHold={handleReleaseProblemHold}
            handleEditProblemReason={handleEditProblemReason}
            handlePrintPreparationSlip={handlePrintPreparationSlip}
          />

          <div className="hidden md:block">
            <PreparationOrdersTable
              orders={enrichedOrders}
              statusSelections={statusSelections}
              statusOptions={statusOptions}
              statusLabelMap={statusLabelMap}
              selectedSet={selectedSet}
              rowUpdatingId={rowUpdatingId}
              shortageSavingOrderId={shortageSavingOrderId}
              problemHoldSavingOrderId={problemHoldSavingOrderId}
              selectedWarehouseId={selectedWarehouseId}
              enabledQcChecks={enabledQcChecks}
              qcChecklistState={qcChecklistState}
              shortageHoldDrafts={shortageHoldDrafts}
              problemHoldDrafts={problemHoldDrafts}
              transferingItemKey={transferingItemKey}
              printingOrderNumber={printingOrderNumber}
              preparationSettings={preparationSettings}
              visibleColumns={visibleColumns}
              formatPrice={formatPrice}
              formatDate={formatDate}
              onToggleSelection={toggleOrderSelection}
              onQuickTransfer={(orderNumber, item) =>
                void handleQuickTransfer(orderNumber, item)
              }
              onShortageFieldChange={handleShortageFieldChange}
              onSaveShortageHoldDetails={saveShortageHoldDetails}
              onQcCheckToggle={handleQcCheckToggle}
              onStatusSelectionChange={onStatusSelectionChange}
              onSingleStatusUpdate={(orderNumber, nextStatus) =>
                void handleRequestStatusChange(orderNumber, nextStatus)
              }
              onMarkAsShortageHold={(orderNumber) =>
                void handleMarkAsShortageHold(orderNumber)
              }
              onReleaseShortageHold={(orderNumber) =>
                void handleReleaseShortageHold(orderNumber)
              }
              onMarkAsShortageFailed={(orderNumber) =>
                void handleMarkAsShortageFailed(orderNumber)
              }
              onHoldAsProblem={(orderNumber) =>
                void handleHoldAsProblem(orderNumber)
              }
              onReleaseProblemHold={(orderNumber) =>
                void handleReleaseProblemHold(orderNumber)
              }
              onEditProblemReason={handleEditProblemReason}
              onPrintPreparationSlip={(orderNumber) =>
                void handlePrintPreparationSlip(orderNumber)
              }
            />
          </div>
        </>
      )}

      <PreparationPaginationBar
        page={pagination.page}
        totalPages={totalPages}
        currentPageCount={currentPageCount}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
      />
    </>
  );
};

export default PreparationOrdersContainer;
