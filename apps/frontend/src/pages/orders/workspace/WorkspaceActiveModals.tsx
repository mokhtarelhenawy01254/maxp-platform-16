import React from "react";
import { WorkspaceCancelModal } from "./WorkspaceCancelModal";
import { WorkspaceFollowUpModal } from "./WorkspaceFollowUpModal";
import type { WorkspaceOrder } from "./types";

const EnhancedOrderModal = React.lazy(
  () => import("../../../components/orders/EnhancedOrderModal")
);

interface WorkspaceActiveModalsProps {
  cancellingOrder: WorkspaceOrder | null;
  cancelReasonText: string;
  onCancelReasonTextChange: (text: string) => void;
  onConfirmCancel: () => void;
  onCloseCancel: () => void;
  isCancelSubmitting: boolean;
  followUpOrder: WorkspaceOrder | null;
  followUpDateValue: string;
  onFollowUpDateChange: (val: string) => void;
  onSaveFollowUp: () => void;
  onCloseFollowUp: () => void;
  isFollowUpSubmitting: boolean;
  activeModalOrder: any;
  isModalOpen: boolean;
  onCloseModal: () => void;
  onOrderUpdate: (updated: any) => void;
}

export const WorkspaceActiveModals: React.FC<WorkspaceActiveModalsProps> = ({
  cancellingOrder,
  cancelReasonText,
  onCancelReasonTextChange,
  onConfirmCancel,
  onCloseCancel,
  isCancelSubmitting,
  followUpOrder,
  followUpDateValue,
  onFollowUpDateChange,
  onSaveFollowUp,
  onCloseFollowUp,
  isFollowUpSubmitting,
  activeModalOrder,
  isModalOpen,
  onCloseModal,
  onOrderUpdate,
}) => {
  return (
    <>
      <WorkspaceCancelModal
        order={cancellingOrder}
        reasonText={cancelReasonText}
        onReasonTextChange={onCancelReasonTextChange}
        onConfirm={onConfirmCancel}
        onClose={onCloseCancel}
        isSubmitting={isCancelSubmitting}
      />

      <WorkspaceFollowUpModal
        order={followUpOrder}
        dateValue={followUpDateValue}
        onDateChange={onFollowUpDateChange}
        onSave={onSaveFollowUp}
        onClose={onCloseFollowUp}
        isSubmitting={isFollowUpSubmitting}
      />

      {activeModalOrder && (
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            </div>
          }
        >
          <EnhancedOrderModal
            isOpen={isModalOpen}
            onClose={onCloseModal}
            order={activeModalOrder}
            onOrderUpdate={onOrderUpdate}
          />
        </React.Suspense>
      )}
    </>
  );
};

export default WorkspaceActiveModals;
