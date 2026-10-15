import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  BookingBranch, BookingDoctor, BookingAppointment, BookingService, BookingPatient, BookingInvoice,
  ServiceCategory, TabId, fetchJson, api, getAuthHeaders, normalizeBranch
} from "./booking/shared";
import PatientDetailPage from "./booking/PatientDetailPage";
import DoctorDetailPage from "./booking/DoctorDetailPage";
import BookingManagementHeader from "./booking/BookingManagementHeader";
import BookingConfirmModals from "./booking/BookingConfirmModals";
import BookingTabRouter from "./booking/BookingTabRouter";
import useBookingOperations from "./booking/useBookingOperations";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookingManagementPage() {
  const { "*": path } = useParams();
  const urlTab = (path || "").split("/")[0] || "";
  const activeTab = (["dashboard", "appointments", "calendar", "branches", "doctors", "services", "patients", "invoices", "price-lists", "workflow", "reports", "operations", "insurance-companies", "member-types"].includes(urlTab) ? urlTab : "dashboard") as TabId;
  const patientUrlId = urlTab === "patients" && (path || "").split("/")[1] ? (path || "").split("/")[1] : null;
  const doctorUrlId = urlTab === "doctors" && (path || "").split("/")[1] ? (path || "").split("/")[1] : null;

  const [branches, setBranches] = useState<BookingBranch[]>([]);
  const [doctors, setDoctors] = useState<BookingDoctor[]>([]);
  const [services, setServices] = useState<BookingService[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [appointments, setAppointments] = useState<BookingAppointment[]>([]);
  const [patients, setPatients] = useState<BookingPatient[]>([]);
  const [invoices, setInvoices] = useState<BookingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [branchModal, setBranchModal] = useState<Partial<BookingBranch> | null | undefined>(undefined);
  const [doctorModal, setDoctorModal] = useState<Partial<BookingDoctor> | null | undefined>(undefined);
  const [serviceModal, setServiceModal] = useState<Partial<BookingService> | null | undefined>(undefined);
  const [serviceDetail, setServiceDetail] = useState<BookingService | null>(null);
  const [appointmentModal, setAppointmentModal] = useState<Partial<BookingAppointment> | null | undefined>(undefined);
  const [patientModal, setPatientModal] = useState<Partial<BookingPatient> | null | undefined>(undefined);
  const [patientDetailId, setPatientDetailId] = useState<string | null>(null);
  const [invoiceModal, setInvoiceModal] = useState<Partial<BookingInvoice> | null | undefined>(undefined);
  const [paymentInvoice, setPaymentInvoice] = useState<BookingInvoice | null>(null);

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filters, setFilters] = useState(() => {
    const sp = new URLSearchParams(window.location.search);
    return {
      status: sp.get("status") || "",
      branchId: sp.get("branchId") || "",
      dateFrom: sp.get("dateFrom") || "",
      dateTo: sp.get("dateTo") || "",
      search: sp.get("search") || "",
    };
  });
  const [page, setPage] = useState(() => parseInt(new URLSearchParams(window.location.search).get("page") || "1"));
  const [total, setTotal] = useState(0);
  const limit = 20;
  const [sortBy, setSortBy] = useState("appointmentDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchDoctor, setSearchDoctor] = useState("");
  const [searchService, setSearchService] = useState("");
  const [searchPatient, setSearchPatient] = useState("");
  const [searchInvoice, setSearchInvoice] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("");
  const [serviceFilterStatus, setServiceFilterStatus] = useState<"all" | "active" | "inactive">("active");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [cloneTarget, setCloneTarget] = useState<BookingService | null>(null);
  const [cloneNameInput, setCloneNameInput] = useState("");

  const fetchBranches = async () => {
    try { setBranches((await fetchJson<BookingBranch[]>(api("branches"))).map(normalizeBranch)); }
    catch (e: unknown) { console.error("fetchBranches", e); throw e; }
  };
  const fetchDoctors = async (branchId?: string) => {
    try { setDoctors(await fetchJson<BookingDoctor[]>(api(`doctors${branchId ? `?branchId=${branchId}` : ""}`))); } catch (e: unknown) { console.error("fetchDoctors", e); throw e; }
  };
  const fetchServices = async (branchId?: string) => {
    try { setServices(await fetchJson<BookingService[]>(api(`services${branchId ? `?branchId=${branchId}` : ""}`)) || []); } catch (e: unknown) { console.error("fetchServices", e); throw e; }
  };
  const fetchServiceCategories = async () => {
    try { setServiceCategories(await fetchJson<ServiceCategory[]>(api("services/categories")) || []); } catch (e: unknown) { console.error("fetchServiceCategories", e); throw e; }
  };
  const fetchPatients = async () => {
    try { setPatients(await fetchJson<BookingPatient[]>(api("patients?includeInactive=true")) || []); } catch (e: unknown) { console.error("fetchPatients", e); throw e; }
  };
  const fetchInvoices = async () => {
    try { setInvoices(await fetchJson<BookingInvoice[]>(api("invoices")) || []); } catch (e: unknown) { console.error("fetchInvoices", e); throw e; }
  };
  const fetchAppointments = async () => {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.branchId) params.append("branchId", filters.branchId);
    if (!filters.branchId && selectedBranchId) params.append("branchId", selectedBranchId);
    if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.append("dateTo", filters.dateTo);
    if (filters.search) params.append("search", filters.search);
    params.append("sortBy", sortBy);
    params.append("sortOrder", sortOrder);
    params.append("page", String(page));
    params.append("limit", String(limit));
    try {
      const res = await fetch(api(`appointments?${params}`), { headers: getAuthHeaders() });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل");
      setAppointments(json.data || []);
      setTotal(json.total || 0);
    } catch (e: unknown) { console.error("fetchAppointments", e); setAppointments([]); throw e; }
  };

  const fetchAll = async () => {
    setLoading(true); setError(null);
    const results = await Promise.allSettled([fetchBranches(), fetchDoctors(), fetchServices(), fetchServiceCategories(), fetchAppointments(), fetchPatients(), fetchInvoices()]);
    const rejected = results.filter(r => r.status === 'rejected');
    if (rejected.length > 0) setError(`فشل تحميل بعض البيانات (${rejected.length}/${results.length})`);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    if (activeTab === "appointments") { setLoading(true); fetchAppointments().finally(() => setLoading(false)); }
    if (activeTab === "calendar") { fetchAll(); }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "appointments") {
      const sp = new URLSearchParams();
      if (filters.status) sp.set("status", filters.status);
      if (filters.branchId) sp.set("branchId", filters.branchId);
      else if (selectedBranchId) sp.set("branchId", selectedBranchId);
      if (filters.dateFrom) sp.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) sp.set("dateTo", filters.dateTo);
      if (filters.search) sp.set("search", filters.search);
      if (page > 1) sp.set("page", String(page));
      const qs = sp.toString();
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
      fetchAppointments();
    } else if (activeTab === "calendar" || activeTab === "dashboard") {
      fetchAppointments();
    }
  }, [filters, page, activeTab, selectedBranchId]);

  useEffect(() => {
    if (selectedBranchId) {
      fetchDoctors(selectedBranchId);
      fetchServices(selectedBranchId);
    } else {
      fetchDoctors();
      fetchServices();
    }
  }, [selectedBranchId]);

  const ops = useBookingOperations({
    services,
    appointments,
    fetchBranches,
    fetchDoctors,
    fetchServices,
    fetchServiceCategories,
    fetchAppointments,
    fetchPatients,
    fetchInvoices,
    setLoading,
    setBranchModal,
    setDoctorModal,
    setServiceModal,
    setAppointmentModal,
    setPatientModal,
    setInvoiceModal,
    paymentInvoice,
    setPaymentInvoice,
    selectedIds,
    setSelectedIds,
    setConfirmDialog,
    setCloneTarget,
    setCloneNameInput,
  });

  if (patientUrlId) {
    return <PatientDetailPage patientId={patientUrlId} />;
  }

  if (doctorUrlId) {
    return <DoctorDetailPage doctorId={doctorUrlId} />;
  }

  return (
    <div className="w-full h-full p-4 md:p-6 bg-background text-foreground overflow-y-auto">
      <BookingManagementHeader
        branches={branches}
        selectedBranchId={selectedBranchId}
        onBranchChange={setSelectedBranchId}
      />

      {error ? (
        <div className="text-center py-16 bg-card border border-border/70 rounded-xl p-8 max-w-md mx-auto shadow-sm">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">فشل تحميل البيانات</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={fetchAll}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs sm:text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            إعادة المحاولة
          </button>
        </div>
      ) : loading && activeTab !== "appointments" && activeTab !== "calendar" ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
      ) : (
        <BookingTabRouter
          activeTab={activeTab}
          branches={branches}
          doctors={doctors}
          services={services}
          serviceCategories={serviceCategories}
          appointments={appointments}
          patients={patients}
          invoices={invoices}
          loading={loading}
          selectedBranchId={selectedBranchId}
          calDate={calDate}
          onCalDateChange={setCalDate}
          selectedDay={selectedDay}
          onSelectedDayChange={setSelectedDay}
          filters={filters}
          onFiltersChange={(f) => { setFilters(f); setPage(1); }}
          page={page}
          limit={limit}
          total={total}
          onPageChange={setPage}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(field, order) => { setSortBy(field); setSortOrder(order); }}
          selectedIds={selectedIds}
          onToggleSelect={ops.toggleSelect}
          onToggleSelectAll={ops.toggleSelectAll}
          onBulkUpdateStatus={ops.bulkUpdateStatus}
          onBulkDelete={ops.bulkDelete}
          onClearSelection={() => setSelectedIds(new Set())}
          onUpdateStatus={ops.updateAppointmentStatus}
          onEditAppointment={(a) => setAppointmentModal(a)}
          appointmentModal={appointmentModal}
          onAppointmentModalClose={() => setAppointmentModal(undefined)}
          onSaveAppointment={ops.saveAppointment}
          onViewPatient={setPatientDetailId}
          onEditBranch={(b) => setBranchModal(b)}
          onToggleActiveBranch={(id, cur) => ops.toggleActive("branches", id, cur)}
          onDeleteBranch={(id) => ops.deleteItem("branches", id)}
          branchModal={branchModal}
          onBranchModalClose={() => setBranchModal(undefined)}
          onSaveBranch={ops.saveBranch}
          searchDoctor={searchDoctor}
          onSearchDoctorChange={setSearchDoctor}
          onEditDoctor={(d) => setDoctorModal(d)}
          onToggleActiveDoctor={(id, cur) => ops.toggleActive("doctors", id, cur)}
          onDeleteDoctor={(id) => ops.deleteItem("doctors", id)}
          onAvailabilitySaved={() => fetchDoctors()}
          doctorModal={doctorModal}
          onDoctorModalClose={() => setDoctorModal(undefined)}
          onSaveDoctor={ops.saveDoctor}
          searchService={searchService}
          onSearchServiceChange={setSearchService}
          serviceFilterStatus={serviceFilterStatus}
          onServiceFilterStatusChange={setServiceFilterStatus}
          onEditService={(s) => setServiceModal(s)}
          onDetailService={(s) => setServiceDetail(s)}
          onToggleActiveService={(id, cur) => ops.toggleActive("services", id, cur)}
          onCloneService={ops.cloneService}
          serviceModal={serviceModal}
          onServiceModalClose={() => setServiceModal(undefined)}
          onSaveService={ops.saveService}
          onSaveCategory={ops.saveServiceCategory}
          onDeleteCategory={ops.deleteServiceCategory}
          detailService={serviceDetail}
          onDetailServiceClose={() => setServiceDetail(null)}
          searchPatient={searchPatient}
          onSearchPatientChange={setSearchPatient}
          onEditPatient={(p) => setPatientModal(p)}
          onToggleActivePatient={(id, cur) => ops.toggleActive("patients", id, cur)}
          onDeletePatient={(id) => ops.deleteItem("patients", id)}
          patientModal={patientModal}
          onPatientModalClose={() => setPatientModal(undefined)}
          onSavePatient={ops.savePatient}
          searchInvoice={searchInvoice}
          onSearchInvoiceChange={setSearchInvoice}
          invoiceStatusFilter={invoiceStatusFilter}
          onInvoiceStatusFilterChange={setInvoiceStatusFilter}
          onNewInvoice={() => setInvoiceModal({})}
          onEditInvoice={(inv) => setInvoiceModal(inv)}
          onPayInvoice={setPaymentInvoice}
          onDeleteInvoice={(id) => ops.deleteItem("invoices", id)}
          invoiceModal={invoiceModal}
          onInvoiceModalClose={() => setInvoiceModal(undefined)}
          onInvoiceSave={ops.saveInvoice}
          paymentInvoice={paymentInvoice}
          onPaymentClose={() => setPaymentInvoice(null)}
          onPaymentSave={ops.payInvoice}
        />
      )}

      <BookingConfirmModals
        confirmDialog={confirmDialog}
        onConfirmDialogClose={() => setConfirmDialog(null)}
        cloneTarget={cloneTarget}
        cloneNameInput={cloneNameInput}
        onCloneNameInputChange={setCloneNameInput}
        onCloneCancel={() => setCloneTarget(null)}
        onCloneConfirm={async () => {
          if (!cloneTarget || !cloneNameInput) return;
          const target = cloneTarget;
          setCloneTarget(null);
          const data = await ops.apiCall(api(`services/${target.id}/clone`), "POST", { newName: cloneNameInput });
          if (data !== false) fetchServices();
        }}
        patientDetailId={patientDetailId}
        onPatientDetailClose={() => setPatientDetailId(null)}
      />
    </div>
  );
}
