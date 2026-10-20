import type { DentalInvoice } from "../../../shared";

export interface DentalInvoiceDetailModalProps {
  invoice: DentalInvoice;
  onClose: () => void;
  onAddPayment: () => void;
  onPdf: () => void;
  onPaymentLink: () => void;
}

export interface ConsolidatedItem {
  caseId?: string;
  caseNumber?: string;
  patientName?: string;
  doctorName?: string;
  workTypeName?: string;
  unitsCount?: number;
  unitPrice?: number;
  total?: number;
}

export interface ConsolidatedData {
  title?: string;
  note?: string;
  isConsolidated?: boolean;
  casesCount?: number;
  totalUnits?: number;
  summary?: {
    casesCount?: number;
    totalUnits?: number;
  };
  items?: ConsolidatedItem[];
}
