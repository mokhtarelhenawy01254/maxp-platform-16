import type { DentalLabDoctor, UninvoicedSummaryResult } from "../../../shared";

export interface ActiveDoctorStats {
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  invoicesCount: number;
  uninvoicedCases: number;
  uninvoicedAmount: number;
  creditLimit: number;
  creditExceeded: boolean;
}

export type InvoicesDatePreset = "ALL" | "THIS_MONTH" | "LAST_MONTH";

export interface DentalInvoicesFilterBarProps {
  selectedDoctorId: string;
  onSelectDoctorId: (id: string) => void;
  doctors: DentalLabDoctor[];
  activeDoctor: DentalLabDoctor | null;
  activeDoctorStats: ActiveDoctorStats | null;
  uninvoicedSummary: UninvoicedSummaryResult | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  datePreset: InvoicesDatePreset;
  onDatePresetChange: (p: InvoicesDatePreset) => void;
  fetchedCount: number | null;
  onCreateInvoice: () => void;
  onExportExcel: () => void;
  onBatchInvoice: () => void;
  onOpenSettlement: (doctorId?: string) => void;
  onRefresh: () => void;
  onOpenStatement: (doctor: DentalLabDoctor) => void;
  onBulkPayment: (doctor: DentalLabDoctor) => void;
}
