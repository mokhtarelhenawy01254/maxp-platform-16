import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { ConfirmationOrderRow } from "./ConfirmationOrderRow";
import type { ConfirmationOrder, OrderConfirmationUser } from "./types";

export interface ConfirmationOrdersVirtualListProps {
  orders: ConfirmationOrder[];
  loading: boolean;
  settings?: {
    enabled?: boolean;
    maxCallsNoAnswer?: number;
    intervalMinutes?: number;
  } | null;
  assignSelections: Record<string, string>;
  eligibleUsers: OrderConfirmationUser[];
  assigningId: string | null;
  cancellingId: string | null;
  callingId: string | null;
  selectedOrderIds: string[];
  formatDate: (date: string | Date | undefined, opts?: Record<string, unknown>) => string;
  formatPrice: (amount: number) => string;
  strategyLabelMap: Record<string, string>;
  onAssignChange: (orderId: string, userId: string) => void;
  onAssign: (order: ConfirmationOrder) => void;
  onConfirm: (order: ConfirmationOrder) => void;
  onCancel: (order: ConfirmationOrder) => void;
  onLogCall: (order: ConfirmationOrder) => void;
  onPostpone: (order: ConfirmationOrder) => void;
  onToggleSelect: (orderId: string) => void;
  onPrintSlip: (order: ConfirmationOrder) => void;
  onPrintInvoice: (order: ConfirmationOrder) => void;
}

export const ConfirmationOrdersVirtualList: React.FC<ConfirmationOrdersVirtualListProps> = ({
  orders,
  loading,
  settings,
  assignSelections,
  eligibleUsers,
  assigningId,
  cancellingId,
  callingId,
  selectedOrderIds,
  formatDate,
  formatPrice,
  strategyLabelMap,
  onAssignChange,
  onAssign,
  onConfirm,
  onCancel,
  onLogCall,
  onPostpone,
  onToggleSelect,
  onPrintSlip,
  onPrintInvoice,
}) => {
  const { t } = useTranslation();
  const listParentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 170,
    overscan: 6,
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
      {loading ? (
        <div className="p-8 text-center text-xs sm:text-sm text-muted-foreground sm:p-10">
          {t("orders.loadingOrders", { defaultValue: "جاري تحميل قائمة الطلبات..." })}
        </div>
      ) : orders.length === 0 ? (
        <div className="p-6 text-center sm:p-10">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircleIcon className="h-6 w-6" />
          </div>
          <div className="font-bold text-foreground text-sm sm:text-base">
            {t("orders.everythingUnderControl", { defaultValue: "كل شيء تحت السيطرة" })}
          </div>
          <div className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {t("orders.noOrdersNeedConfirmation", { defaultValue: "لا توجد طلبات تحتاج إلى تأكيد حالياً" })}
          </div>
        </div>
      ) : (
        <div ref={listParentRef} className="max-h-[70vh] overflow-auto">
          <div
            className="relative w-full"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const order = orders[virtualRow.index];
              if (!order) return null;
              return (
                <div
                  key={order.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className="border-b border-border/60 last:border-b-0"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <ConfirmationOrderRow
                    order={order}
                    assignValue={assignSelections[order.id] || ""}
                    eligibleUsers={eligibleUsers}
                    assigningId={assigningId}
                    cancellingId={cancellingId}
                    callingId={callingId}
                    maxCallsNoAnswer={settings?.maxCallsNoAnswer ?? 3}
                    intervalMinutes={settings?.intervalMinutes ?? 30}
                    settingsEnabled={Boolean(settings?.enabled)}
                    selectionEnabled={Boolean(settings?.enabled)}
                    isSelected={selectedOrderIds.includes(order.id)}
                    formatDate={formatDate}
                    formatPrice={formatPrice}
                    strategyLabelMap={strategyLabelMap}
                    onAssignChange={onAssignChange}
                    onAssign={onAssign}
                    onConfirm={onConfirm}
                    onCancel={onCancel}
                    onLogCall={onLogCall}
                    onPostpone={onPostpone}
                    onToggleSelect={onToggleSelect}
                    onPrintSlip={onPrintSlip}
                    onPrintInvoice={onPrintInvoice}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
