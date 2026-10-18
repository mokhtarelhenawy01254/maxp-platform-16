import React from "react";
import { useTranslation } from "react-i18next";
import { ClipboardList } from "lucide-react";
import PreparationOrderCard from "./PreparationOrderCard";
import PreparationOrdersTable from "./PreparationOrdersTable";
import PreparationPaginationBar from "./PreparationPaginationBar";
import {
  buildProblemHoldDetails,
  buildShortageHoldDetails,
  getNextStatus,
  getQuickActionLabel,
  getShortageFollowUpState,
  getShortageFollowUpVisual,
} from "../helpers";
import { SHORTAGE_HOLD_STATUS } from "../constants";
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
  const { t } = useTranslation();

  return (
    <>
      {loading ? (
        <div className="space-y-0">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="flex animate-pulse items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700"
            >
              <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mr-auto h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      ) : enrichedOrders.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center dark:border-gray-600 dark:bg-gray-800/50">
          <ClipboardList className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("preparation.emptyState.title")}
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            {t("preparation.emptyState.desc")}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="space-y-2.5 p-2.5 sm:p-3 md:hidden">
            {enrichedOrders.map((order) => {
              const shortageHoldDetails =
                shortageHoldDrafts[order.orderNumber] ||
                buildShortageHoldDetails(order.metadata);
              const shortageFollowUpState = getShortageFollowUpState(
                shortageHoldDetails.followUpDate,
                order.stage,
              );
              const shortageFollowUpVisual = getShortageFollowUpVisual(
                shortageFollowUpState,
              );
              const problemHoldDetails =
                problemHoldDrafts[order.orderNumber] ||
                buildProblemHoldDetails(order.metadata);
              const nextStatus = getNextStatus(
                order.stage,
                preparationSettings.handoffStatus,
                preparationSettings.startingStatus,
              );
              const currentStageStatus =
                order.stage === "WAITING"
                  ? preparationSettings.startingStatus
                  : order.stage === "PREPARING"
                    ? "PREPARING"
                    : order.stage === "QUALITY_CHECK"
                      ? "QUALITY_CHECK"
                      : order.stage === "PACKAGED"
                        ? "PACKAGED"
                        : order.stage === "STOCK_SHORTAGE"
                          ? SHORTAGE_HOLD_STATUS
                          : order.stage === "ON_HOLD_PREP"
                            ? preparationSettings.startingStatus
                            : preparationSettings.handoffStatus;
              const defaultTargetStatus = nextStatus || currentStageStatus;
              const currentSelection =
                statusSelections[order.orderNumber] || defaultTargetStatus;
              const actionLabel =
                statusSelections[order.orderNumber] &&
                statusSelections[order.orderNumber] !== defaultTargetStatus
                  ? "تطبيق المرحلة المختارة"
                  : getQuickActionLabel(order.stage);
              const qcCompleted = enabledQcChecks.every(
                (key) => qcChecklistState[order.orderNumber]?.[key] === true,
              );
              const rowBusy =
                rowUpdatingId === order.orderNumber ||
                shortageSavingOrderId === order.orderNumber ||
                problemHoldSavingOrderId === order.orderNumber;
              const hasShortageContext =
                order.missingItemsCount > 0 || order.stage === "STOCK_SHORTAGE";

              return (
                <PreparationOrderCard
                  key={order.orderNumber}
                  order={order}
                  selected={selectedSet.has(order.orderNumber)}
                  statusOptions={statusOptions}
                  statusLabelMap={statusLabelMap}
                  currentSelection={currentSelection}
                  actionLabel={actionLabel}
                  qcCompleted={qcCompleted}
                  rowBusy={rowBusy}
                  hasShortageContext={hasShortageContext}
                  selectedWarehouseId={selectedWarehouseId}
                  enabledQcChecks={enabledQcChecks}
                  qcChecklist={qcChecklistState[order.orderNumber]}
                  shortageHoldDetails={shortageHoldDetails}
                  shortageFollowUpVisual={shortageFollowUpVisual}
                  problemHoldDetails={problemHoldDetails}
                  transferingItemKey={transferingItemKey}
                  printingOrderNumber={printingOrderNumber}
                  preparationSettings={preparationSettings}
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
              );
            })}
          </div>

          {/* Desktop table view */}
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
