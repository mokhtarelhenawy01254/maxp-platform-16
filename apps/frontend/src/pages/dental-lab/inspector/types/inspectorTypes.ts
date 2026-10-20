import { type ChangeEvent } from "react";
import { type DentalLabCase } from "../../shared";

export interface DentalCaseInspectorProps {
  caseData: DentalLabCase;
  onClose: () => void;
  onAdvance: (c: DentalLabCase) => void;
  onAssign: (c: DentalLabCase) => void;
  onEdit: (c: DentalLabCase) => void;
  onInvoice: (c: DentalLabCase) => void;
  onUpload: (c: DentalLabCase, e: ChangeEvent<HTMLInputElement>) => void;
  onPrintPanLabel: (c: DentalLabCase) => void;
  onPrintWorkOrder: (c: DentalLabCase) => void;
  onTrash: (c: DentalLabCase) => void;
  isBusy: boolean;
  uploadingId: string | null;
}
