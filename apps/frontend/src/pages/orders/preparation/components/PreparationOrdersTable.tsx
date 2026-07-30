import { ChevronDown as ChevronDownIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/utils/formatters';
import { Fragment, memo, useMemo, useState } from "react";
import { Link } from "react-router-dom";
;
import { getStatusDisplay } from "../../../../utils/statusRegistry";
import {
  SHORTAGE_HOLD_STATUS,
  SOURCE_LABELS,
} from "../constants";
import {
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
  QcCheckKey,
  ShortageHoldDetails,
} from "../types";
import PreparationOrderItemsList from "./PreparationOrderItemsList";
import PreparationOrderNotices from "./PreparationOrderNotices";
import PreparationOrderShortagePanel from "./PreparationOrderShortagePanel";
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
  selectedWarehouseId: string;
  enabledQcChecks: QcCheckKey[];
  qcChecklistState: Record<string, Partial<Record<QcCheckKey, boolean>>>;
  shortageHoldDrafts: Record<string, ShortageHoldDetails>;
  transferingItemKey: string | null;
  printingOrderNumber: string | null;
  preparationSettings: PreparationQueueSettings;
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
  selectedWarehouseId,
  enabledQcChecks,
  qcChecklistState,
  shortageHoldDrafts,
  transferingItemKey,
  printingOrderNumber,
  preparationSettings,
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

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full table-auto text-right text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="w-10 px-3 py-2.5">
              <span className="sr-only">تحديد</span>
            </th>
            <th className="px-3 py-2.5">رقم الطلب</th>
            <th className="px-3 py-2.5">العميل</th>
            <th className="px-3 py-2.5">القطع</th>
            <th className="px-3 py-2.5">القيمة</th>
            <th className="px-3 py-2.5">الحالة</th>
            <th className="px-3 py-2.5">المخزن</th>
            <th className="px-3 py-2.5">التجهيز</th>
            <th className="px-3 py-2.5">الطباعة</th>
            <th className="px-3 py-2.5">كود الشحن</th>
            <th className="w-20 px-3 py-2.5">
              <span className="sr-only">التفاصيل</span>
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
              shortageSavingOrderId === order.orderNumber;
            const hasShortageContext =
              order.missingItemsCount > 0 || order.stage === "STOCK_SHORTAGE";
            const isEvenRow = index % 2 === 0;

            return (
              <Fragment key={order.orderNumber}>
                <tr
                  className={`border-b border-gray-100 transition hover:bg-gray-100/60 ${
                    isEvenRow ? "bg-white" : "bg-gray-50/40"
                  } ${isExpanded ? "bg-amber-50/40 shadow-inner" : ""}`}
                >
                  {/* Checkbox */}
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(order.orderNumber)}
                      onChange={() => onToggleSelection(order.orderNumber)}
                      disabled={!canPrepare}
                      className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                  </td>

                  {/* Order number */}
                  <td className="px-3 py-2.5">
                    {order.merchantFulfillment ? (
                      <span className="text-sm font-bold text-gray-900">
                        #{order.orderNumber}
                      </span>
                    ) : (
                      <Link
                        to={`/orders/${encodeURIComponent(order.orderNumber)}`}
                        className="text-sm font-bold text-gray-900 hover:text-amber-700"
                      >
                        #{order.orderNumber}
                      </Link>
                    )}

                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        {SOURCE_LABELS[
                          (order.sourceType || "unknown").toLowerCase()
                        ] || order.sourceType}
                      </span>
                      {shortageFollowUpVisual ? (
                        <span className="rounded-full border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800">
                          {shortageFollowUpVisual.label}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="px-3 py-2.5">
                    <p className="text-xs font-medium text-gray-800">
                      {order.customerName}
                    </p>
<p className="text-[11px] text-gray-400">
                      {order.customerPhone || ""}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {getAgeLabel(order.createdAt)}
                      {order.governorate || order.city
                        ? ` • ${order.governorate || order.city}`
                        : ""}
                    </p>
                  </td>

                  {/* Units */}
                  <td className="px-3 py-2.5">
                    <span className="text-sm font-bold text-gray-800">
                      {order.totalUnits}
                    </span>
                  </td>

                  {/* Value */}
                  <td className="px-3 py-2.5">
                    <span className="text-sm font-bold text-gray-800">
                      {formatPrice(order.totalValue)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2.5">
                    {(() => {
                      const statusInfo = getStatusDisplay(order.normalizedStatus);
                      return (
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusInfo.colorClass}`} aria-label={statusInfo.labelKey}>
                          {t(statusInfo.labelKey) || statusInfo.label}
                        </span>
                      );
                    })()}
                  </td>

                  {/* Warehouse */}
                  <td className="px-3 py-2.5">
                    <span className="max-w-[100px] truncate text-xs font-semibold text-gray-700">
                      {order.recommendedWarehouseName || "غير محدد"}
                    </span>
                  </td>

                  {/* Ready / shortage indicator */}
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-block rounded-lg px-2 py-1 text-[11px] font-semibold ${
                        order.isReady
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {order.isReady
                        ? "جاهز ✓"
                        : `${order.missingItemsCount} نقص`}
                    </span>
                  </td>

                  {/* Print status */}
                  <td className="px-3 py-2.5">
                    {(order.printCount ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700" title={order.printedAt ? formatDate(order.printedAt) : ''}>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {order.printCount}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-400">
                        —
                      </span>
                    )}
                  </td>

                  {/* Shipping code */}
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-medium text-gray-700">
                      {order.turboTrackingNumber ||
                        (order.shipments?.length
                          ? order.shipments
                              .map((s) => s.trackingNumber)
                              .filter(Boolean)
                              .join(", ")
                          : null) || "—"}
                    </span>
                  </td>

                  {/* Details button */}
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(order.orderNumber)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
                    >
                      التفاصيل
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
                  <tr className="bg-gray-50/80">
                    <td colSpan={11} className="border-b border-gray-100 px-4 py-4">
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
                          shortageFollowUpVisual={shortageFollowUpVisual}
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
