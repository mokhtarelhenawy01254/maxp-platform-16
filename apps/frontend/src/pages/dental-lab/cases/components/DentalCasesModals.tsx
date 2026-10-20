import React from "react";
import QuickOrderModal from "../../QuickOrderModal";
import { DentalCaseCreateModal } from "../modals/DentalCaseCreateModal";
import { DentalCaseAdvanceModal } from "../modals/DentalCaseAdvanceModal";
import { DentalCaseAssignModal } from "../modals/DentalCaseAssignModal";
import { DentalCaseInvoiceModal } from "../modals/DentalCaseInvoiceModal";
import { DentalCaseKioskScannerModal } from "../modals/DentalCaseKioskScannerModal";
import type { DentalCase, DentalDoctor, DentalTechnician, DentalWorkType } from "../../shared";

export interface DentalCasesModalsProps {
  createOpen: boolean;
  editingCase: DentalCase | null;
  doctors: DentalDoctor[];
  workTypes: DentalWorkType[];
  technicians: DentalTechnician[];
  onCloseCreate: () => void;
  onSavedCase: () => void;

  kioskOpen: boolean;
  onCloseKiosk: () => void;
  onScannedKiosk: () => void;

  quickOrderOpen: boolean;
  onCloseQuickOrder: () => void;
  onSavedQuickOrder: () => void;

  advanceCaseData: DentalCase | null;
  onCloseAdvance: () => void;
  onSavedAdvance: () => void;

  assignCaseData: DentalCase | null;
  onCloseAssign: () => void;
  onSavedAssign: () => void;

  invoiceCase: DentalCase | null;
  onCloseInvoice: () => void;
  onSavedInvoice: () => void;
}

export const DentalCasesModals: React.FC<DentalCasesModalsProps> = ({
  createOpen,
  editingCase,
  doctors,
  workTypes,
  technicians,
  onCloseCreate,
  onSavedCase,
  kioskOpen,
  onCloseKiosk,
  onScannedKiosk,
  quickOrderOpen,
  onCloseQuickOrder,
  onSavedQuickOrder,
  advanceCaseData,
  onCloseAdvance,
  onSavedAdvance,
  assignCaseData,
  onCloseAssign,
  onSavedAssign,
  invoiceCase,
  onCloseInvoice,
  onSavedInvoice,
}) => {
  return (
    <>
      {createOpen && (
        <DentalCaseCreateModal
          initial={editingCase}
          doctors={doctors}
          workTypes={workTypes}
          technicians={technicians}
          onClose={onCloseCreate}
          onSaved={onSavedCase}
        />
      )}

      {kioskOpen && (
        <DentalCaseKioskScannerModal
          technicians={technicians}
          onClose={onCloseKiosk}
          onScanned={onScannedKiosk}
        />
      )}

      {quickOrderOpen && (
        <QuickOrderModal
          onClose={onCloseQuickOrder}
          onSaved={onSavedQuickOrder}
        />
      )}

      {advanceCaseData && (
        <DentalCaseAdvanceModal
          caseData={advanceCaseData}
          technicians={technicians}
          onClose={onCloseAdvance}
          onSaved={onSavedAdvance}
        />
      )}

      {assignCaseData && (
        <DentalCaseAssignModal
          caseData={assignCaseData}
          technicians={technicians}
          onClose={onCloseAssign}
          onSaved={onSavedAssign}
        />
      )}

      {invoiceCase && (
        <DentalCaseInvoiceModal
          caseData={invoiceCase}
          onClose={onCloseInvoice}
          onSaved={onSavedInvoice}
        />
      )}
    </>
  );
};

export default DentalCasesModals;
