import React from "react";
import DentalCaseInspector from "../../DentalCaseInspector";
import type { DentalCase } from "../../shared";

export interface DentalCaseInspectorDrawerProps {
  isOpen: boolean;
  selectedCase: DentalCase | null;
  onClose: () => void;
  onAdvance: (c: DentalCase) => void;
  onAssign: (c: DentalCase) => void;
  onEdit: (c: DentalCase) => void;
  onInvoice: (c: DentalCase) => void;
  onUpload: (caseId: string, files: FileList | File[]) => void;
  onPrintPanLabel: (caseId: string) => void;
  onPrintWorkOrder: (caseId: string) => void;
  onTrash: (c: DentalCase) => void;
  isBusy: boolean;
  uploadingId: string | null;
}

export const DentalCaseInspectorDrawer: React.FC<DentalCaseInspectorDrawerProps> = ({
  isOpen,
  selectedCase,
  onClose,
  onAdvance,
  onAssign,
  onEdit,
  onInvoice,
  onUpload,
  onPrintPanLabel,
  onPrintWorkOrder,
  onTrash,
  isBusy,
  uploadingId,
}) => {
  if (!isOpen || !selectedCase) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:w-[500px] md:w-[540px] bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col border-r dark:border-gray-800 animate-in slide-in-from-left duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <DentalCaseInspector
          caseData={selectedCase}
          onClose={onClose}
          onAdvance={onAdvance}
          onAssign={onAssign}
          onEdit={onEdit}
          onInvoice={onInvoice}
          onUpload={onUpload}
          onPrintPanLabel={onPrintPanLabel}
          onPrintWorkOrder={onPrintWorkOrder}
          onTrash={onTrash}
          isBusy={isBusy}
          uploadingId={uploadingId}
        />
      </div>
    </div>
  );
};

export default DentalCaseInspectorDrawer;
