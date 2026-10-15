import React from "react";
import {
  BookingBranch, BookingDoctor, BookingAppointment, BookingService, BookingPatient, BookingInvoice,
  BranchFormData, ServiceFormData, ServiceCategory, TabId
} from "./shared";
import BranchesTab from "./BranchesTab";
import DashboardTab from "./DashboardTab";
import DoctorsTab from "./DoctorsTab";
import ServicesTab from "./ServicesTab";
import AppointmentsTab from "./AppointmentsTab";
import CalendarTab from "./CalendarTab";
import PatientsTab from "./PatientsTab";
import InvoicesTab from "./InvoicesTab";
import PriceListsTab from "./PriceListsTab";
import WorkflowPage from "./WorkflowPage";
import BookingReportsTab from "./BookingReportsTab";
import OperationsPage from "./OperationsPage";
import InsuranceCompaniesTab from "./InsuranceCompaniesTab";
import MemberTypesTab from "./MemberTypesTab";
import TabErrorBoundary from "@/pages/admin/OrderWorkflow/TabErrorBoundary";

export interface BookingTabRouterProps {
  activeTab: TabId;
  branches: BookingBranch[];
  doctors: BookingDoctor[];
  services: BookingService[];
  serviceCategories: ServiceCategory[];
  appointments: BookingAppointment[];
  patients: BookingPatient[];
  invoices: BookingInvoice[];
  loading: boolean;
  selectedBranchId: string;
  calDate: Date;
  onCalDateChange: (d: Date) => void;
  selectedDay: string | null;
  onSelectedDayChange: (d: string | null) => void;
  filters: { status: string; branchId: string; dateFrom: string; dateTo: string; search: string };
  onFiltersChange: (f: { status: string; branchId: string; dateFrom: string; dateTo: string; search: string }) => void;
  page: number;
  limit: number;
  total: number;
  onPageChange: (p: number) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (field: string, order: "asc" | "desc") => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onBulkUpdateStatus: (s: string) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  onUpdateStatus: (id: string, s: string) => void;
  onEditAppointment: (a: Partial<BookingAppointment>) => void;
  appointmentModal: Partial<BookingAppointment> | null | undefined;
  onAppointmentModalClose: () => void;
  onSaveAppointment: (d: Partial<BookingAppointment>) => Promise<void>;
  onViewPatient: (id: string) => void;
  // Branch handlers
  onEditBranch: (b: Partial<BookingBranch>) => void;
  onToggleActiveBranch: (id: string, cur: boolean) => void;
  onDeleteBranch: (id: string) => void;
  branchModal: Partial<BookingBranch> | null | undefined;
  onBranchModalClose: () => void;
  onSaveBranch: (d: BranchFormData) => Promise<void>;
  // Doctor handlers
  searchDoctor: string;
  onSearchDoctorChange: (s: string) => void;
  onEditDoctor: (d: Partial<BookingDoctor>) => void;
  onToggleActiveDoctor: (id: string, cur: boolean) => void;
  onDeleteDoctor: (id: string) => void;
  onAvailabilitySaved: () => void;
  doctorModal: Partial<BookingDoctor> | null | undefined;
  onDoctorModalClose: () => void;
  onSaveDoctor: (d: Partial<BookingDoctor>) => Promise<void>;
  // Service handlers
  searchService: string;
  onSearchServiceChange: (s: string) => void;
  serviceFilterStatus: "all" | "active" | "inactive";
  onServiceFilterStatusChange: (s: "all" | "active" | "inactive") => void;
  onEditService: (s: Partial<BookingService>) => void;
  onDetailService: (s: BookingService) => void;
  onToggleActiveService: (id: string, cur: boolean) => void;
  onCloneService: (s: BookingService) => void;
  serviceModal: Partial<BookingService> | null | undefined;
  onServiceModalClose: () => void;
  onSaveService: (d: ServiceFormData) => Promise<void>;
  onSaveCategory: (d: Partial<ServiceCategory>) => Promise<void>;
  onDeleteCategory: (id: string) => void;
  detailService: BookingService | null;
  onDetailServiceClose: () => void;
  // Patient handlers
  searchPatient: string;
  onSearchPatientChange: (s: string) => void;
  onEditPatient: (p: Partial<BookingPatient>) => void;
  onToggleActivePatient: (id: string, cur: boolean) => void;
  onDeletePatient: (id: string) => void;
  patientModal: Partial<BookingPatient> | null | undefined;
  onPatientModalClose: () => void;
  onSavePatient: (d: Partial<BookingPatient>) => Promise<void>;
  // Invoice handlers
  searchInvoice: string;
  onSearchInvoiceChange: (s: string) => void;
  invoiceStatusFilter: string;
  onInvoiceStatusFilterChange: (s: string) => void;
  onNewInvoice: () => void;
  onEditInvoice: (inv: Partial<BookingInvoice>) => void;
  onPayInvoice: (inv: BookingInvoice) => void;
  onDeleteInvoice: (id: string) => void;
  invoiceModal: Partial<BookingInvoice> | null | undefined;
  onInvoiceModalClose: () => void;
  onSaveInvoice: (d: Partial<BookingInvoice> & { initialPayment?: number; method?: string }) => Promise<void>;
  paymentInvoice: BookingInvoice | null;
  onPaymentClose: () => void;
  onPaymentSave: (d: { amount: number; method: string; notes?: string }) => Promise<void>;
}

export const BookingTabRouter: React.FC<BookingTabRouterProps> = (props) => {
  const { activeTab } = props;

  switch (activeTab) {
    case "dashboard":
      return (
        <TabErrorBoundary tabLabel="لوحة التحكم">
          <DashboardTab
            branches={props.branches}
            doctors={props.doctors}
            appointments={props.appointments}
            selectedBranchId={props.selectedBranchId}
          />
        </TabErrorBoundary>
      );
    case "branches":
      return (
        <TabErrorBoundary tabLabel="الفروع">
          <BranchesTab
            branches={props.branches}
            selectedBranchId={props.selectedBranchId || undefined}
            onEdit={props.onEditBranch}
            onToggleActive={props.onToggleActiveBranch}
            onDelete={props.onDeleteBranch}
            modalBranch={props.branchModal}
            onModalClose={props.onBranchModalClose}
            onSave={props.onSaveBranch}
          />
        </TabErrorBoundary>
      );
    case "doctors":
      return (
        <TabErrorBoundary tabLabel="الأطباء">
          <DoctorsTab
            doctors={props.doctors}
            branches={props.branches}
            services={props.services}
            search={props.searchDoctor}
            onSearchChange={props.onSearchDoctorChange}
            onEdit={props.onEditDoctor}
            onToggleActive={props.onToggleActiveDoctor}
            onDelete={props.onDeleteDoctor}
            onAvailabilitySaved={props.onAvailabilitySaved}
            modalDoctor={props.doctorModal}
            onModalClose={props.onDoctorModalClose}
            onSave={props.onSaveDoctor}
          />
        </TabErrorBoundary>
      );
    case "services":
      return (
        <TabErrorBoundary tabLabel="الخدمات">
          <ServicesTab
            services={props.services}
            branches={props.branches}
            doctors={props.doctors}
            categories={props.serviceCategories}
            search={props.searchService}
            onSearchChange={props.onSearchServiceChange}
            filterStatus={props.serviceFilterStatus}
            onFilterStatusChange={props.onServiceFilterStatusChange}
            onEdit={props.onEditService}
            onDetail={props.onDetailService}
            onToggleActive={props.onToggleActiveService}
            onClone={props.onCloneService}
            modalService={props.serviceModal}
            onModalClose={props.onServiceModalClose}
            onSave={props.onSaveService}
            onCategorySave={props.onSaveCategory}
            onCategoryDelete={props.onDeleteCategory}
            detailService={props.detailService}
            onDetailClose={props.onDetailServiceClose}
          />
        </TabErrorBoundary>
      );
    case "appointments":
      return (
        <TabErrorBoundary tabLabel="المواعيد">
          <AppointmentsTab
            loading={props.loading}
            appointments={props.appointments}
            total={props.total}
            page={props.page}
            limit={props.limit}
            branches={props.branches}
            doctors={props.doctors}
            services={props.services}
            patients={props.patients}
            filters={props.filters}
            onFiltersChange={props.onFiltersChange}
            selectedIds={props.selectedIds}
            onToggleSelect={props.onToggleSelect}
            onToggleSelectAll={props.onToggleSelectAll}
            onBulkUpdateStatus={props.onBulkUpdateStatus}
            onBulkDelete={props.onBulkDelete}
            onClearSelection={props.onClearSelection}
            onUpdateStatus={props.onUpdateStatus}
            onEdit={props.onEditAppointment}
            onPageChange={props.onPageChange}
            sortBy={props.sortBy}
            sortOrder={props.sortOrder}
            onSortChange={props.onSortChange}
            modalAppointment={props.appointmentModal}
            onModalClose={props.onAppointmentModalClose}
            onSave={props.onSaveAppointment}
            onViewPatient={props.onViewPatient}
          />
        </TabErrorBoundary>
      );
    case "calendar":
      return (
        <TabErrorBoundary tabLabel="التقويم">
          <CalendarTab
            appointments={props.appointments}
            calDate={props.calDate}
            onCalDateChange={props.onCalDateChange}
            selectedDay={props.selectedDay}
            onSelectedDayChange={props.onSelectedDayChange}
          />
        </TabErrorBoundary>
      );
    case "patients":
      return (
        <TabErrorBoundary tabLabel="المرضى">
          <PatientsTab
            patients={props.patients}
            search={props.searchPatient}
            onSearchChange={props.onSearchPatientChange}
            onView={props.onViewPatient}
            onEdit={props.onEditPatient}
            onToggleActive={props.onToggleActivePatient}
            onDelete={props.onDeletePatient}
            modalPatient={props.patientModal}
            onModalClose={props.onPatientModalClose}
            onSave={props.onSavePatient}
          />
        </TabErrorBoundary>
      );
    case "invoices":
      return (
        <TabErrorBoundary tabLabel="المدفوعات">
          <InvoicesTab
            invoices={props.invoices}
            patients={props.patients}
            search={props.searchInvoice}
            onSearchChange={props.onSearchInvoiceChange}
            statusFilter={props.invoiceStatusFilter}
            onStatusFilterChange={props.onInvoiceStatusFilterChange}
            onNew={props.onNewInvoice}
            onEdit={props.onEditInvoice}
            onPay={props.onPayInvoice}
            onDelete={props.onDeleteInvoice}
            invoiceModal={props.invoiceModal}
            onInvoiceModalClose={props.onInvoiceModalClose}
            onInvoiceSave={props.onSaveInvoice}
            paymentInvoice={props.paymentInvoice}
            onPaymentClose={props.onPaymentClose}
            onPaymentSave={props.onPaymentSave}
          />
        </TabErrorBoundary>
      );
    case "price-lists":
      return (
        <TabErrorBoundary tabLabel="قوائم الأسعار">
          <PriceListsTab />
        </TabErrorBoundary>
      );
    case "workflow":
      return (
        <TabErrorBoundary tabLabel="سير العمل">
          <WorkflowPage />
        </TabErrorBoundary>
      );
    case "reports":
      return (
        <TabErrorBoundary tabLabel="التقارير">
          <BookingReportsTab />
        </TabErrorBoundary>
      );
    case "operations":
      return (
        <TabErrorBoundary tabLabel="العمليات">
          <OperationsPage />
        </TabErrorBoundary>
      );
    case "insurance-companies":
      return (
        <TabErrorBoundary tabLabel="شركات التأمين">
          <InsuranceCompaniesTab />
        </TabErrorBoundary>
      );
    case "member-types":
      return (
        <TabErrorBoundary tabLabel="أنواع الأعضاء">
          <MemberTypesTab />
        </TabErrorBoundary>
      );
    default:
      return null;
  }
};

export default BookingTabRouter;
