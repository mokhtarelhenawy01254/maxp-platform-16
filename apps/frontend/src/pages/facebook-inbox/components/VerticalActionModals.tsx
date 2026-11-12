import React, { Suspense, lazy } from "react";
import CreateServiceOrderModal from "@/components/facebook-inbox/Modals/CreateServiceOrderModal";
import QuickCreateTaskModal from "@/components/facebook-inbox/Modals/QuickCreateTaskModal";
import QuickAppointmentDialog from "./QuickAppointmentDialog";
import type { InboxConversation } from "@/types/inbox.types";

const DentalQuickOrderModal = lazy(
  () => import("@/pages/dental-lab/QuickOrderModal"),
);

interface VerticalActionModalsProps {
  selectedConversation: InboxConversation | null;
  showServiceOrderModal: boolean;
  onCloseServiceOrderModal: () => void;
  showQuickTaskModal: boolean;
  onCloseQuickTaskModal: () => void;
  showDentalCaseModal: boolean;
  onCloseDentalCaseModal: () => void;
  showAppointmentModal: boolean;
  onCloseAppointmentModal: () => void;
  onVerticalRecordCreated?: () => void;
}

export const VerticalActionModals: React.FC<VerticalActionModalsProps> = ({
  selectedConversation,
  showServiceOrderModal,
  onCloseServiceOrderModal,
  showQuickTaskModal,
  onCloseQuickTaskModal,
  showDentalCaseModal,
  onCloseDentalCaseModal,
  showAppointmentModal,
  onCloseAppointmentModal,
  onVerticalRecordCreated,
}) => {
  return (
    <>
      <CreateServiceOrderModal
        isOpen={showServiceOrderModal}
        onClose={onCloseServiceOrderModal}
        customerName={selectedConversation?.customerName || ""}
        customerPhone={selectedConversation?.customerPhone || ""}
        sessionId={selectedConversation?.id || ""}
        onOrderCreated={() => {
          onVerticalRecordCreated?.();
        }}
      />

      <QuickCreateTaskModal
        isOpen={showQuickTaskModal}
        onClose={onCloseQuickTaskModal}
        onCreated={() => {
          onVerticalRecordCreated?.();
        }}
      />

      <QuickAppointmentDialog
        isOpen={showAppointmentModal}
        onClose={onCloseAppointmentModal}
        conversation={selectedConversation}
        onCreated={() => {
          onVerticalRecordCreated?.();
        }}
      />

      {showDentalCaseModal && (
        <Suspense fallback={null}>
          <DentalQuickOrderModal
            onClose={onCloseDentalCaseModal}
            onSaved={() => {
              onCloseDentalCaseModal();
              onVerticalRecordCreated?.();
            }}
          />
        </Suspense>
      )}
    </>
  );
};

export default VerticalActionModals;
