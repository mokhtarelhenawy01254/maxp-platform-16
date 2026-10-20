import React from "react";
import type { ConfirmationOrder, OrderConfirmationUser } from "./types";
import { useConfirmationRowDerivedState } from "./useConfirmationRowDerivedState";
import { ConfirmationOrderCustomerInfo } from "./ConfirmationOrderCustomerInfo";
import { ConfirmationOrderDueCell } from "./ConfirmationOrderDueCell";
import { ConfirmationOrderRowActions } from "./ConfirmationOrderRowActions";

export interface ConfirmationOrderRowProps {
  order: ConfirmationOrder;
  assignValue: string;
  eligibleUsers: OrderConfirmationUser[];
  assigningId: string | null;
  cancellingId: string | null;
  callingId: string | null;
  maxCallsNoAnswer: number;
  intervalMinutes: number;
  settingsEnabled: boolean;
  selectionEnabled: boolean;
  isSelected: boolean;
  formatDate: (value: string) => string;
  formatPrice: (value: number) => string;
  strategyLabelMap: Record<string, string>;
  onAssignChange: (orderId: string, value: string) => void;
  onAssign: (orderId: string, userId: string) => void;
  onConfirm: (orderId: string) => void;
  onCancel: (order: ConfirmationOrder) => void;
  onLogCall: (order: ConfirmationOrder, result?: string) => void;
  onPostpone: (order: ConfirmationOrder) => void;
  onToggleSelect: (orderId: string) => void;
  onPrintSlip?: (order: ConfirmationOrder) => void;
  onPrintInvoice?: (order: ConfirmationOrder) => void;
}

export const ConfirmationOrderRow: React.FC<ConfirmationOrderRowProps> = React.memo(
  ({
    order,
    assignValue,
    eligibleUsers,
    assigningId,
    cancellingId,
    callingId,
    maxCallsNoAnswer,
    intervalMinutes,
    settingsEnabled,
    selectionEnabled,
    isSelected,
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
    const {
      isCancelled,
      callAttempts,
      deposit,
      shipping,
      amountDue,
      callsLimitReached,
      nextCallAllowedAt,
      waitingForNextCall,
      callBlocked,
      isPrepaid,
      paymentBadge,
    } = useConfirmationRowDerivedState(order, maxCallsNoAnswer, intervalMinutes);

    return (
      <div className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center gap-3.5 sm:gap-4 hover:bg-muted/40 transition-colors bg-card">
        <ConfirmationOrderCustomerInfo
          order={order}
          selectionEnabled={selectionEnabled}
          isSelected={isSelected}
          isPrepaid={isPrepaid}
          paymentBadge={paymentBadge}
          strategyLabelMap={strategyLabelMap}
          formatDate={formatDate}
          onToggleSelect={onToggleSelect}
        />

        <ConfirmationOrderDueCell
          amountDue={amountDue}
          orderTotal={Number(order.total) || 0}
          shipping={shipping}
          deposit={deposit}
          callAttempts={callAttempts}
          maxCallsNoAnswer={maxCallsNoAnswer}
          callBlocked={callBlocked}
          formatPrice={formatPrice}
        />

        <div className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold self-start lg:self-center">
          {order.status}
        </div>

        <ConfirmationOrderRowActions
          order={order}
          isCancelled={isCancelled}
          callBlocked={callBlocked}
          callingId={callingId}
          cancellingId={cancellingId}
          waitingForNextCall={waitingForNextCall}
          nextCallAllowedAt={nextCallAllowedAt}
          callsLimitReached={callsLimitReached}
          settingsEnabled={settingsEnabled}
          assignValue={assignValue}
          eligibleUsers={eligibleUsers}
          assigningId={assigningId}
          onAssignChange={onAssignChange}
          onAssign={onAssign}
          onPrintSlip={onPrintSlip}
          onPrintInvoice={onPrintInvoice}
          onConfirm={onConfirm}
          onCancel={onCancel}
          onLogCall={onLogCall}
          onPostpone={onPostpone}
        />
      </div>
    );
  }
);

ConfirmationOrderRow.displayName = "ConfirmationOrderRow";

export default ConfirmationOrderRow;
