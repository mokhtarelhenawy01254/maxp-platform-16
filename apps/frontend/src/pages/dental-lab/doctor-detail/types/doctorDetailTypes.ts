import type {
  DentalInvoice,
  DentalLabCase,
  DentalLabDoctorDetail,
  DentalWorkType,
  DoctorStatement,
} from "../../shared";

export type DetailTab = "cases" | "invoices" | "statement" | "pricing" | "portal";

export interface EditDoctorModalProps {
  doctor: DentalLabDoctorDetail;
  onClose: () => void;
  onSaved: (updated: DentalLabDoctorDetail) => void;
}

export interface PortalPinDialogProps {
  doctor: DentalLabDoctorDetail;
  onClose: () => void;
  onSaved: (updated: DentalLabDoctorDetail) => void;
}

export interface BulkPaymentModalProps {
  doctor: DentalLabDoctorDetail;
  onClose: () => void;
  onSaved: () => void;
}

export interface SingleInvoicePaymentModalProps {
  invoice: DentalInvoice;
  onClose: () => void;
  onSaved: () => void;
}

export interface DoctorCasesTabProps {
  cases: DentalLabCase[];
  loading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onOpenQuickOrder: () => void;
}

export interface DoctorInvoicesTabProps {
  invoices: DentalInvoice[];
  loading: boolean;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onPayInvoice: (inv: DentalInvoice) => void;
  onDownloadPdf: (invId: string, invNum?: string) => void;
  onCopyPaymentLink: (invId: string) => void;
}

export interface DoctorStatementTabProps {
  doctor: DentalLabDoctorDetail;
  statementData: DoctorStatement | null;
  invoices: DentalInvoice[];
  loading: boolean;
  from: string;
  to: string;
  onFromChange: (val: string) => void;
  onToChange: (val: string) => void;
  onRefresh: () => void;
}

export interface DoctorPricingTabProps {
  workTypes: DentalWorkType[];
  pricingMap: Record<string, string>;
  onPricingChange: (workTypeId: string, val: string) => void;
  loading: boolean;
  saving: boolean;
  onSave: () => void;
}

export interface DoctorPortalTabProps {
  doctor: DentalLabDoctorDetail;
  onOpenPinDialog: () => void;
  onOpenEditModal: () => void;
}
