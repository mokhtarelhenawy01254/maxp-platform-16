import React, { Fragment } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { getStatusDisplay } from "../../../../../utils/statusRegistry";
import {
  SHORTAGE_HOLD_STATUS,
  SOURCE_LABEL_KEYS,
} from "../../constants";
import {
  buildProblemHoldDetails,
  buildShortageHoldDetails,
  getAgeLabel,
  getNextStatus,
  getQuickActionLabel,
  getShortageFollowUpState,
  getShortageFollowUpVisual,
} from "../../helpers";
import PreparationOrdersTableExpandedRow from "./PreparationOrdersTableExpandedRow";
import PreparationOrdersProblemCell from "./PreparationOrdersProblemCell";
import type { PreparationOrdersTableRowProps } from "./tableTypes";

export const PreparationOrdersTableRow: React.FC<PreparationOrdersTableRowProps> = ({
  order,
  index,
  totalCols,
  isExpanded,
  onToggleExpanded,
  selectedSet,
  onToggleSelection,
  visibleColumns,
  statusSelections,
  statusOptions,
  statusLabelMap,
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
  formatPrice,
  formatDate,
  onQuickTransfer,
  onShortageFieldChange,
  onSaveShortageHoldDetails,
  onQcCheckToggle,
  onStatusSelectionChange,
  onSingleStatusUpdate,
  onMarkAsShortageHold,
  onReleaseShortageHold,
  onMarkAsShortageFailed,
  onHoldAsProblem,
  onReleaseProblemHold,
  onEditProblemReason,
  onPrintPreparationSlip,
}) => {
  const { t } = useTranslation();
  const canPrepare = order.merchantFulfillment?.canPrepare !== false;

  const shortageHoldDetails =
    shortageHoldDrafts[order.orderNumber] ||
    buildShortageHoldDetails(order.metadata);
  const shortageFollowUpVisual = getShortageFollowUpVisual(
    getShortageFollowUpState(
      shortageHoldDetails.followUpDate,
      order.stage,
    ),
  );
  const problemHoldDetails =
    problemHoldDrafts[order.orderNumber] ||
    buildProblemHoldDetails(order.metadata);
  const activeFollowUpVisual =
    order.stage === "STOCK_SHORTAGE" ? shortageFollowUpVisual : null;
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
      ? t("preparation.table.applySelectedStage")
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
  const isProblemHeld = order.stage === "ON_HOLD_PREP";
  const isEvenRow = index % 2 === 0;

  return (
    <Fragment key={order.orderNumber}>
      <tr
        className={`border-b border-slate-100 dark:border-slate-800/80 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50 ${
          isEvenRow ? "bg-white dark:bg-slate-900" : "bg-slate-50/40 dark:bg-slate-900/60"
        } ${isExpanded ? "bg-slate-50/90 shadow-xs dark:bg-slate-800/60" : ""}`}
      >
        {/* Checkbox */}
        <td className="px-3 py-2.5">
          <input
            type="checkbox"
            checked={selectedSet.has(order.orderNumber)}
            onChange={() => onToggleSelection(order.orderNumber)}
            disabled={!canPrepare}
            className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-500"
          />
        </td>

        {/* Order number */}
        <td className="px-3 py-2.5">
          {order.merchantFulfillment ? (
            <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
              #{order.orderNumber}
            </span>
          ) : (
            <Link
              to={`/orders/${encodeURIComponent(order.orderNumber)}`}
              className="font-mono text-xs font-semibold text-slate-900 hover:text-blue-600 dark:hover:text-blue-400 transition dark:text-white"
            >
              #{order.orderNumber}
            </Link>
          )}

          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <span className="rounded border border-slate-200/70 bg-slate-50 px-1.5 py-0.2 text-[10px] font-mono font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {t(SOURCE_LABEL_KEYS[
                (order.sourceType || "unknown").toLowerCase()
              ]) || order.sourceType}
            </span>
            {shortageFollowUpVisual ? (
              <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-mono font-semibold text-amber-700 dark:border-amber-700/60 dark:bg-amber-950/60 dark:text-amber-300">
                {shortageFollowUpVisual.label}
              </span>
            ) : null}
          </div>
        </td>

        {/* Customer */}
        {visibleColumns.includes("customer") && (
          <td className="px-3 py-2.5">
            <p className="text-xs font-semibold text-slate-900 dark:text-white">
              {order.customerName}
            </p>
            <p className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
              {order.customerPhone || ""}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-400">
              {getAgeLabel(order.createdAt)}
              {order.governorate || order.city
                ? ` • ${order.governorate || order.city}`
                : ""}
            </p>
          </td>
        )}

        {/* Units */}
        {visibleColumns.includes("units") && (
          <td className="px-3 py-2.5">
            <span className="font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
              {order.totalUnits}
            </span>
          </td>
        )}

        {/* Value */}
        {visibleColumns.includes("value") && (
          <td className="px-3 py-2.5">
            <span className="font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
              {formatPrice(order.totalValue)}
            </span>
          </td>
        )}

        {/* Status */}
        {visibleColumns.includes("status") && (
          <td className="px-3 py-2.5">
            {(() => {
              const statusInfo = getStatusDisplay(order.normalizedStatus);
              return (
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusInfo.colorClass}`} aria-label={statusInfo.labelKey}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                  {t(statusInfo.labelKey) || statusInfo.label}
                </span>
              );
            })()}
          </td>
        )}

        {/* Problem */}
        {visibleColumns.includes("problem") && (
          <PreparationOrdersProblemCell
            orderNumber={order.orderNumber}
            isProblemHeld={isProblemHeld}
            problemHoldDetails={problemHoldDetails}
            rowBusy={rowBusy}
            onEditProblemReason={onEditProblemReason}
          />
        )}

        {/* Warehouse */}
        {visibleColumns.includes("warehouse") && (
          <td className="px-3 py-2.5">
            {order.recommendedWarehouseName ? (
              <span className="max-w-[120px] truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                {order.recommendedWarehouseName}
              </span>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-400">
                {t("preparation.table.notDefined")}
              </span>
            )}
          </td>
        )}

        {/* Ready / shortage indicator */}
        {visibleColumns.includes("readiness") && (
          <td className="px-3 py-2.5">
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono font-semibold ${
                order.isReady
                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-700/60 dark:text-emerald-300"
                  : "border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:bg-rose-950/60 dark:border-rose-700/60 dark:text-rose-300"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${order.isReady ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {order.isReady
                ? t("preparation.table.ready")
                : t("preparation.table.shortage", { count: order.missingItemsCount })}
            </span>
          </td>
        )}

        {/* Print status */}
        {visibleColumns.includes("printStatus") && (
          <td className="px-3 py-2.5">
            {(order.printCount ?? 0) > 0 ? (
              <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-700/60 dark:text-emerald-300" title={order.printedAt ? formatDate(order.printedAt) : ''}>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {order.printCount}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-400 dark:bg-slate-800 dark:text-slate-400">
                —
              </span>
            )}
          </td>
        )}

        {/* Shipping code */}
        {visibleColumns.includes("shippingCode") && (
          <td className="px-3 py-2.5">
            <span className="font-mono tabular-nums text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
              {order.turboTrackingNumber ||
                (order.shipments?.length
                  ? order.shipments
                      .map((s) => s.trackingNumber)
                      .filter(Boolean)
                      .join(", ")
                  : null) || "—"}
            </span>
          </td>
        )}

        {/* Details button */}
        <td className="px-3 py-2.5">
          <button
            type="button"
            onClick={() => onToggleExpanded(order.orderNumber)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {t("preparation.table.details")}
            <ChevronDownIcon
              className={`h-3.5 w-3.5 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </td>
      </tr>

      {/* Expanded details row */}
      {isExpanded && (
        <PreparationOrdersTableExpandedRow
          order={order}
          totalCols={totalCols}
          canPrepare={canPrepare}
          selectedWarehouseId={selectedWarehouseId}
          transferingItemKey={transferingItemKey}
          preparationSettings={preparationSettings}
          activeFollowUpVisual={activeFollowUpVisual}
          hasShortageContext={hasShortageContext}
          shortageHoldDetails={shortageHoldDetails}
          shortageFollowUpVisual={shortageFollowUpVisual}
          rowBusy={rowBusy}
          formatDate={formatDate}
          onShortageFieldChange={onShortageFieldChange}
          onSaveShortageHoldDetails={onSaveShortageHoldDetails}
          isProblemHeld={isProblemHeld}
          problemHoldDetails={problemHoldDetails}
          onEditProblemReason={onEditProblemReason}
          enabledQcChecks={enabledQcChecks}
          qcChecklistState={qcChecklistState}
          qcCompleted={qcCompleted}
          onQcCheckToggle={onQcCheckToggle}
          statusOptions={statusOptions}
          statusLabelMap={statusLabelMap}
          currentSelection={currentSelection}
          actionLabel={actionLabel}
          printingOrderNumber={printingOrderNumber}
          onQuickTransfer={onQuickTransfer}
          onStatusSelectionChange={onStatusSelectionChange}
          onSingleStatusUpdate={onSingleStatusUpdate}
          onMarkAsShortageHold={onMarkAsShortageHold}
          onReleaseShortageHold={onReleaseShortageHold}
          onMarkAsShortageFailed={onMarkAsShortageFailed}
          onHoldAsProblem={onHoldAsProblem}
          onReleaseProblemHold={onReleaseProblemHold}
          onPrintPreparationSlip={onPrintPreparationSlip}
        />
      )}
    </Fragment>
  );
};

export default PreparationOrdersTableRow;
