import { Fragment, memo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon, ExclamationTriangleIcon, PencilIcon } from "@heroicons/react/24/outline";
import { getStatusDisplay } from "../../../../utils/statusRegistry";
import {
  PREPARATION_COLUMN_LABEL_KEYS,
  SHORTAGE_HOLD_STATUS,
  SOURCE_LABEL_KEYS,
  type PreparationTableColumn,
} from "../constants";
import {
  buildProblemHoldDetails,
  buildShortageHoldDetails,
  getAgeLabel,
  getNextStatus,
  getQuickActionLabel,
  getShortageFollowUpState,
  getShortageFollowUpVisual,
} from "../helpers";
import type {
  ItemInsight,
  PreparationOrder,
  PreparationQueueSettings,
  PreparationStatusOption,
  ProblemHoldDetails,
  QcCheckKey,
  ShortageHoldDetails,
} from "../types";
import PreparationOrderItemsList from "./PreparationOrderItemsList";
import PreparationOrderNotices from "./PreparationOrderNotices";
import PreparationOrderShortagePanel from "./PreparationOrderShortagePanel";
import PreparationProblemHoldPanel from "./PreparationProblemHoldPanel";
import PreparationOrderQcChecklist from "./PreparationOrderQcChecklist";
import PreparationOrderActions from "./PreparationOrderActions";

interface PreparationOrdersTableProps {
  orders: PreparationOrder[];
  statusSelections: Record<string, string>;
  statusOptions: PreparationStatusOption[];
  statusLabelMap: Map<string, string>;
  selectedSet: Set<string>;
  rowUpdatingId: string | null;
  shortageSavingOrderId: string | null;
  problemHoldSavingOrderId: string | null;
  selectedWarehouseId: string;
  enabledQcChecks: QcCheckKey[];
  qcChecklistState: Record<string, Partial<Record<QcCheckKey, boolean>>>;
  shortageHoldDrafts: Record<string, ShortageHoldDetails>;
  problemHoldDrafts: Record<string, ProblemHoldDetails>;
  transferingItemKey: string | null;
  printingOrderNumber: string | null;
  preparationSettings: PreparationQueueSettings;
  visibleColumns: PreparationTableColumn[];
  formatPrice: (value: number) => string;
  formatDate: (value: string) => string;
  onToggleSelection: (orderNumber: string) => void;
  onQuickTransfer: (orderNumber: string, item: ItemInsight) => void;
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
  onQcCheckToggle: (
    orderNumber: string,
    key: QcCheckKey,
    checked: boolean,
  ) => void;
  onStatusSelectionChange: (orderNumber: string, nextStatus: string) => void;
  onSingleStatusUpdate: (orderNumber: string, nextStatus: string) => void;
  onMarkAsShortageHold: (orderNumber: string) => void;
  onReleaseShortageHold: (orderNumber: string) => void;
  onMarkAsShortageFailed: (orderNumber: string) => void;
  onHoldAsProblem: (orderNumber: string) => void;
  onReleaseProblemHold: (orderNumber: string) => void;
  onEditProblemReason: (orderNumber: string) => void;
  onPrintPreparationSlip: (orderNumber: string) => void;
}

const PreparationOrdersTable = ({
  orders,
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
  onToggleSelection,
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
}: PreparationOrdersTableProps) => {
  const { t } = useTranslation();
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleExpanded = (orderNumber: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderNumber)) {
        next.delete(orderNumber);
      } else {
        next.add(orderNumber);
      }
      return next;
    });
  };

  if (orders.length === 0) return null;

  const totalCols = visibleColumns.length + 3;

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto text-right text-sm">
        <thead>
          <tr className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
            <th className="w-10 px-3 py-2">
              <span className="sr-only">{t("preparation.table.selectColumn")}</span>
            </th>
            <th className="px-3 py-2">{t("preparation.table.orderNumber")}</th>
            {visibleColumns.includes("customer") && (
              <th className="px-3 py-2">{t(PREPARATION_COLUMN_LABEL_KEYS.customer)}</th>
            )}
            {visibleColumns.includes("units") && (
              <th className="px-3 py-2">{t(PREPARATION_COLUMN_LABEL_KEYS.units)}</th>
            )}
            {visibleColumns.includes("value") && (
              <th className="px-3 py-2">{t(PREPARATION_COLUMN_LABEL_KEYS.value)}</th>
            )}
            {visibleColumns.includes("status") && (
              <th className="px-3 py-2">{t(PREPARATION_COLUMN_LABEL_KEYS.status)}</th>
            )}
            {visibleColumns.includes("problem") && (
              <th className="px-3 py-2">{t(PREPARATION_COLUMN_LABEL_KEYS.problem)}</th>
            )}
            {visibleColumns.includes("warehouse") && (
              <th className="px-3 py-2">{t(PREPARATION_COLUMN_LABEL_KEYS.warehouse)}</th>
            )}
            {visibleColumns.includes("readiness") && (
              <th className="px-3 py-2">{t(PREPARATION_COLUMN_LABEL_KEYS.readiness)}</th>
            )}
            {visibleColumns.includes("printStatus") && (
              <th className="px-3 py-2">{t(PREPARATION_COLUMN_LABEL_KEYS.printStatus)}</th>
            )}
            {visibleColumns.includes("shippingCode") && (
              <th className="px-3 py-2">{t(PREPARATION_COLUMN_LABEL_KEYS.shippingCode)}</th>
            )}
            <th className="w-20 px-3 py-2">
              <span className="sr-only">{t("preparation.table.detailsColumn")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => {
            const canPrepare = order.merchantFulfillment?.canPrepare !== false;
            const isExpanded = expandedOrders.has(order.orderNumber);

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
                  className={`border-b border-slate-100 dark:border-zinc-800/80 transition-colors hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 ${
                    isEvenRow ? "bg-white dark:bg-zinc-900" : "bg-slate-50/30 dark:bg-zinc-900/50"
                  } ${isExpanded ? "bg-slate-50/90 shadow-inner dark:bg-zinc-800/60" : ""}`}
                >
                  {/* Checkbox */}
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(order.orderNumber)}
                      onChange={() => onToggleSelection(order.orderNumber)}
                      disabled={!canPrepare}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </td>

                  {/* Order number */}
                  <td className="px-3 py-2">
                    {order.merchantFulfillment ? (
                      <span className="font-mono text-xs font-semibold text-slate-900 dark:text-zinc-100">
                        #{order.orderNumber}
                      </span>
                    ) : (
                      <Link
                        to={`/orders/${encodeURIComponent(order.orderNumber)}`}
                        className="font-mono text-xs font-semibold text-slate-900 hover:text-primary transition dark:text-zinc-100"
                      >
                        #{order.orderNumber}
                      </Link>
                    )}

                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                      <span className="rounded border border-slate-200/70 bg-slate-50 px-1.5 py-0.2 text-[10px] font-mono font-medium text-slate-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                        {t(SOURCE_LABEL_KEYS[
                          (order.sourceType || "unknown").toLowerCase()
                        ]) || order.sourceType}
                      </span>
                      {shortageFollowUpVisual ? (
                        <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-mono font-semibold text-amber-700 dark:text-amber-400">
                          {shortageFollowUpVisual.label}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Customer */}
                  {visibleColumns.includes("customer") && (
                    <td className="px-3 py-2">
                      <p className="text-xs font-medium text-slate-900 dark:text-zinc-100">
                        {order.customerName}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                        {order.customerPhone || ""}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                        {getAgeLabel(order.createdAt)}
                        {order.governorate || order.city
                          ? ` • ${order.governorate || order.city}`
                          : ""}
                      </p>
                    </td>
                  )}

                  {/* Units */}
                  {visibleColumns.includes("units") && (
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
                        {order.totalUnits}
                      </span>
                    </td>
                  )}

                  {/* Value */}
                  {visibleColumns.includes("value") && (
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
                        {formatPrice(order.totalValue)}
                      </span>
                    </td>
                  )}

                  {/* Status */}
                  {visibleColumns.includes("status") && (
                    <td className="px-3 py-2">
                      {(() => {
                        const statusInfo = getStatusDisplay(order.normalizedStatus);
                        return (
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusInfo.colorClass}`} aria-label={statusInfo.labelKey}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                            {t(statusInfo.labelKey) || statusInfo.label}
                          </span>
                        );
                      })()}
                    </td>
                  )}

                  {/* Problem */}
                  {visibleColumns.includes("problem") && (
                    <td className="px-3 py-2">
                      {isProblemHeld ? (
                        <div className="flex items-start gap-1">
                          <button
                            type="button"
                            onClick={() => onEditProblemReason(order.orderNumber)}
                            disabled={rowBusy}
                            title={String(t("preparation.problemPanel.edit"))}
                            className="mt-0.5 shrink-0 rounded border border-slate-200 bg-white p-1 text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          >
                            <PencilIcon className="h-3 w-3" />
                          </button>
                          {problemHoldDetails.reason ? (
                            <span
                              className="line-clamp-2 max-w-[180px] rounded border border-amber-300/80 bg-amber-50/80 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                              title={problemHoldDetails.reason}
                            >
                              {problemHoldDetails.reason}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onEditProblemReason(order.orderNumber)}
                              disabled={rowBusy}
                              className="inline-flex items-center gap-1 rounded border border-dashed border-amber-400 bg-amber-50/60 px-2 py-0.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                            >
                              <ExclamationTriangleIcon className="h-3 w-3" />
                              {t("preparation.problemPanel.addReason")}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 dark:text-zinc-600">—</span>
                      )}
                    </td>
                  )}

                  {/* Warehouse */}
                  {visibleColumns.includes("warehouse") && (
                    <td className="px-3 py-2">
                      <span className="max-w-[100px] truncate text-xs font-medium text-slate-700 dark:text-zinc-300">
                        {order.recommendedWarehouseName || t("preparation.table.notDefined")}
                      </span>
                    </td>
                  )}

                  {/* Ready / shortage indicator */}
                  {visibleColumns.includes("readiness") && (
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold ${
                          order.isReady
                            ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400"
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
                    <td className="px-3 py-2">
                      {(order.printCount ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-400" title={order.printedAt ? formatDate(order.printedAt) : ''}>
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {order.printCount}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-400 dark:bg-zinc-800 dark:text-zinc-500">
                          —
                        </span>
                      )}
                    </td>
                  )}

                  {/* Shipping code */}
                  {visibleColumns.includes("shippingCode") && (
                    <td className="px-3 py-2">
                      <span className="font-mono text-[11px] font-medium text-slate-700 dark:text-zinc-300 bg-slate-100/80 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-zinc-700">
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
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(order.orderNumber)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
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
                  <tr className="bg-gray-50/80 dark:bg-gray-800/60">
                    <td colSpan={totalCols} className="border-b border-gray-100 px-4 py-4 dark:border-gray-700">
                      <div className="space-y-2.5">
                        <PreparationOrderItemsList
                          order={order}
                          selectedWarehouseId={selectedWarehouseId}
                          transferingItemKey={transferingItemKey}
                          preparationSettings={preparationSettings}
                          onQuickTransfer={onQuickTransfer}
                        />

                        <PreparationOrderNotices
                          order={order}
                          shortageFollowUpVisual={activeFollowUpVisual}
                        />

                        {canPrepare && hasShortageContext ? (
                          <PreparationOrderShortagePanel
                            order={order}
                            shortageHoldDetails={shortageHoldDetails}
                            shortageFollowUpVisual={shortageFollowUpVisual}
                            rowBusy={rowBusy}
                            formatDate={formatDate}
                            onShortageFieldChange={onShortageFieldChange}
                            onSaveShortageHoldDetails={
                              onSaveShortageHoldDetails
                            }
                          />
                        ) : null}

                        {canPrepare && isProblemHeld ? (
                          <PreparationProblemHoldPanel
                            order={order}
                            problemHoldDetails={problemHoldDetails}
                            rowBusy={rowBusy}
                            formatDate={formatDate}
                            onEditProblemReason={onEditProblemReason}
                          />
                        ) : null}

                        {canPrepare &&
                        order.stage === "QUALITY_CHECK" &&
                        preparationSettings.enableQcChecklist &&
                        enabledQcChecks.length > 0 ? (
                          <PreparationOrderQcChecklist
                            orderNumber={order.orderNumber}
                            enabledQcChecks={enabledQcChecks}
                            qcChecklist={
                              qcChecklistState[order.orderNumber]
                            }
                            qcCompleted={qcCompleted}
                            onQcCheckToggle={onQcCheckToggle}
                          />
                        ) : null}

                        <PreparationOrderActions
                          order={order}
                          statusOptions={statusOptions}
                          statusLabelMap={statusLabelMap}
                          currentSelection={currentSelection}
                          actionLabel={actionLabel}
                          rowBusy={rowBusy}
                          printingOrderNumber={printingOrderNumber}
                          preparationSettings={preparationSettings}
                          onStatusSelectionChange={onStatusSelectionChange}
                          onSingleStatusUpdate={onSingleStatusUpdate}
                          onMarkAsShortageHold={onMarkAsShortageHold}
                          onReleaseShortageHold={onReleaseShortageHold}
                          onMarkAsShortageFailed={onMarkAsShortageFailed}
                          onHoldAsProblem={onHoldAsProblem}
                          onReleaseProblemHold={onReleaseProblemHold}
                          onPrintPreparationSlip={onPrintPreparationSlip}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const MemoizedPreparationOrdersTable = memo(PreparationOrdersTable);
export default MemoizedPreparationOrdersTable;
