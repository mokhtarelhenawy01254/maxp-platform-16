import type { UninvoicedSummaryResult } from "../../../shared";

export type DentalInvoiceBatchMode = "PER_CASE" | "CONSOLIDATED";

export interface DentalInvoiceBatchModalProps {
  summary: UninvoicedSummaryResult;
  onClose: () => void;
  onSaved: () => void;
}
