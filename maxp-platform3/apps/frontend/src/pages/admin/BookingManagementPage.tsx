import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel
} from "@/components/ui/alert-dialog";
import {
  BookingBranch, BookingDoctor, BookingAppointment, BookingService,
  BranchFormData, ServiceFormData,
  TabId, fetchJson, api, getAuthHeaders, normalizeBranch, MODAL_INPUT_CLS
} from "./booking/shared";
import BranchesTab from "./booking/BranchesTab";
import DashboardTab from "./booking/DashboardTab";
import DoctorsTab from "./booking/DoctorsTab";
import ServicesTab from "./booking/ServicesTab";
import AppointmentsTab from "./booking/AppointmentsTab";
import CalendarTab from "./booking/CalendarTab";
import { Skeleton } from "@/components/ui/skeleton";
import TabErrorBoundary from "@/pages/admin/OrderWorkflow/TabErrorBoundary";

export default function BookingManagementPage() {
  const { "*": path } = useParams();
  const urlTab = (path || "").split("/")[0] || "";
  const activeTab = (["dashboard", "appointments", "calendar", "branches", "doctors", "services"].includes(urlTab) ? urlTab : "dashboard") as TabId;

  const [branches, setBranches] = useState<BookingBranch[]>([]);
  const [doctors, setDoctors] = useState<BookingDoctor[]>([]);
  const [services, setServices] = useState<BookingService[]>([]);
  const [appointments, setAppointments] = useState<BookingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [branchModal, setBranchModal] = useState<Partial<BookingBranch> | null | undefined>(undefined);
  const [doctorModal, setDoctorModal] = useState<Partial<BookingDoctor> | null | undefined>(undefined);
  const [serviceModal, setServiceModal] = useState<Partial<BookingService> | null | undefined>(undefined);
  const [serviceDetail, setServiceDetail] = useState<BookingService | null>(null);
  const [appointmentModal, setAppointmentModal] = useState<Partial<BookingAppointment> | null | undefined>(undefined);

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
  const [serviceFilterStatus, setServiceFilterStatus] = useState<"all" | "active" | "inactive">("active");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [cloneTarget, setCloneTarget] = useState<BookingService | null>(null);
  const [cloneNameInput, setCloneNameInput] = useState("");

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

  const fetchAll = async () => {
    setLoading(true); setError(null);
    const results = await Promise.allSettled([fetchBranches(), fetchDoctors(), fetchServices(), fetchAppointments()]);
    const rejected = results.filter(r => r.status === 'rejected');
    if (rejected.length > 0) setError(`فشل تحميل بعض البيانات (${rejected.length}/${results.length})`);
    setLoading(false);
  };

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

  const apiCall = async (url: string, method: string, body?: Record<string, unknown>) => {
    const res = await fetch(url, { method, headers: getAuthHeaders(), body: body ? JSON.stringify(body) : undefined });
    const data = await res.json();
    if (!data.success) { toast.error(data.error || "فشل العملية"); return false; }
    return data.data;
  };

  const saveBranch = async (d: BranchFormData) => {
    const isEdit = !!d.id;
    const url = isEdit ? api(`branches/${d.id}`) : api("branches");
    const phones = d.phones.map(p => String(p).trim()).filter(Boolean);
    const body: Record<string, unknown> = { name: d.name, address: d.address, phone: phones[0] || d.phone || "", phones, isActive: d.isActive };
    if (d.workingDays) {
      const days = d.workingDays.split(",").filter(Boolean);
      if (days.length > 0) {
        const wd: Record<string, string> = {};
        days.forEach(day => { wd[day] = `${d.workStart || "09:00"}-${d.workEnd || "22:00"}`; });
        body["workingDays"] = wd;
      }
    }
    const maleDays = d.maleDays.sort();
    const femaleDays = d.femaleDays.sort();
    body["genderDays"] = { male: maleDays, female: femaleDays };
    if (d.maxBookingsPerSlot !== undefined) body["maxBookingsPerSlot"] = d.maxBookingsPerSlot;
    if (d.location !== undefined) body["location"] = d.location;
    if (d.landmarkImage !== undefined) body["landmarkImage"] = d.landmarkImage;
    const data = await apiCall(url, isEdit ? "PUT" : "POST", body);
    if (data !== false) { setBranchModal(undefined); fetchBranches(); }
  };

  const saveDoctor = async (d: Partial<BookingDoctor>) => {
    const data = await apiCall(api(`doctors/${d.id ? d.id : ""}`), d.id ? "PUT" : "POST", d);
    if (data !== false) { setDoctorModal(undefined); fetchDoctors(); }
  };

  const saveService = async (d: ServiceFormData) => {
    const isEdit = !!d.id;
    if (isEdit) {
      const data = await apiCall(api(`services/${d.id}`), "PUT", { name: d.name, description: d.description });
      if (data === false) return;
      if (d.branches) {
        const oldService = services.find(s => s.id === d.id);
        const oldBranchIds = new Set(oldService?.branchServices?.map(bs => bs.branchId) || []);
        const newBranchIds = new Set(d.branches.map(b => b.branchId));
        for (const branchId of oldBranchIds) {
          if (!newBranchIds.has(branchId)) await fetch(api(`services/${d.id}/branches/${branchId}`), { method: "DELETE", headers: getAuthHeaders() });
        }
        for (const b of d.branches) {
          await fetch(api(`services/${d.id}/branches`), {
            method: "POST", headers: getAuthHeaders(),
            body: JSON.stringify({ branchId: b.branchId, packages: b.packages?.filter(p => p.count > 0) || null })
          });
        }
      }
    } else {
      const payload: Record<string, unknown> = { name: d.name, description: d.description };
      if (d.branches?.length) payload["branches"] = d.branches.map(b => ({ branchId: b.branchId, packages: b.packages?.filter(p => p.count > 0) || null }));
      const data = await apiCall(api("services"), "POST", payload);
      if (data === false) return;
    }
    setServiceModal(undefined); fetchServices();
  };

  const cloneService = async (s: BookingService) => {
    setCloneTarget(s);
    setCloneNameInput(`نسخة من ${s.name}`);
  };

  const saveAppointment = async (d: Partial<BookingAppointment>) => {
    const isEdit = !!d.id;
    const data = await apiCall(api(`appointments${isEdit ? `/${d.id}` : ""}`), isEdit ? "PUT" : "POST", d);
    if (data !== false) { setAppointmentModal(undefined); setLoading(true); fetchAppointments().finally(() => setLoading(false)); }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    const data = await apiCall(api(`appointments/${id}/status`), "PUT", { status });
    if (data !== false) { setLoading(true); fetchAppointments().finally(() => setLoading(false)); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === appointments.length && appointments.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(appointments.map(a => a.id)));
  };

  const bulkUpdateStatus = async (status: string) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setConfirmDialog({
      message: `تأكيد تغيير حالة (${ids.length}) موعد إلى "${status}"؟`,
      onConfirm: async () => {
        const data = await apiCall(api("appointments/bulk-status"), "PUT", { ids, status });
        if (data !== false) { setSelectedIds(new Set()); setLoading(true); fetchAppointments().finally(() => setLoading(false)); }
      }
    });
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setConfirmDialog({
      message: `تأكيد حذف (${ids.length}) موعد بشكل نهائي؟`,
      onConfirm: async () => {
        const data = await apiCall(api("appointments/bulk-delete"), "POST", { ids });
        if (data !== false) { setSelectedIds(new Set()); setLoading(true); fetchAppointments().finally(() => setLoading(false)); }
      }
    });
  };

  const toggleActive = async (type: string, id: string, current: boolean) => {
    const data = await apiCall(api(`${type}/${id}`), "PUT", { isActive: !current });
    if (data !== false) {
      if (type === "branches") fetchBranches();
      else if (type === "doctors") fetchDoctors();
      else fetchServices();
    }
  };

  const deleteItem = async (type: string, id: string) => {
    setConfirmDialog({
      message: "تأكيد الحذف؟",
      onConfirm: async () => {
        const data = await apiCall(api(`${type}/${id}`), "DELETE");
        if (data !== false) {
          if (type === "branches") fetchBranches();
          else if (type === "doctors") fetchDoctors();
          else fetchServices();
        }
      }
    });
  };

  // branchAppointments is not used as filtering is now reactive through the global branch selector

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full h-full overflow-y-auto">
      {/* Global page header with unified branch filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">نظام إدارة الحجوزات</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">تحكم متكامل في المواعيد، الفروع، الأطباء والخدمات</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">الفرع الحالي:</label>
          <select
            value={selectedBranchId}
            onChange={e => setSelectedBranchId(e.target.value)}
            className="border dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-w-[200px]"
          >
            <option value="">جميع الفروع</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="text-center py-16">
          <div className="text-red-500 dark:text-red-400 text-lg mb-2">⚠️ فشل تحميل البيانات</div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button onClick={fetchAll} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">إعادة المحاولة</button>
        </div>
      ) : loading && activeTab !== "appointments" && activeTab !== "calendar" ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
      ) : (
        <>
          {activeTab === "dashboard" && <TabErrorBoundary tabLabel="لوحة التحكم"><DashboardTab branches={branches} doctors={doctors} appointments={appointments} selectedBranchId={selectedBranchId} /></TabErrorBoundary>}
          {activeTab === "branches" && (
            <TabErrorBoundary tabLabel="الفروع">
              <BranchesTab
                branches={branches}
                selectedBranchId={selectedBranchId || undefined}
                onEdit={b => setBranchModal(b)}
                onToggleActive={(id, cur) => toggleActive("branches", id, cur)}
                onDelete={id => deleteItem("branches", id)}
                modalBranch={branchModal}
                onModalClose={() => setBranchModal(undefined)}
                onSave={saveBranch}
              />
            </TabErrorBoundary>
          )}
          {activeTab === "doctors" && (
            <TabErrorBoundary tabLabel="الأطباء">
              <DoctorsTab
                doctors={doctors} branches={branches}
                search={searchDoctor} onSearchChange={setSearchDoctor}
                onEdit={d => setDoctorModal(d)}
                onToggleActive={(id, cur) => toggleActive("doctors", id, cur)}
                onDelete={id => deleteItem("doctors", id)}
                modalDoctor={doctorModal}
                onModalClose={() => setDoctorModal(undefined)}
                onSave={saveDoctor}
              />
            </TabErrorBoundary>
          )}
          {activeTab === "services" && (
            <TabErrorBoundary tabLabel="الخدمات">
              <ServicesTab
                services={services} branches={branches}
                search={searchService} onSearchChange={setSearchService}
                filterStatus={serviceFilterStatus} onFilterStatusChange={setServiceFilterStatus}
                onEdit={s => setServiceModal(s)}
                onDetail={s => setServiceDetail(s)}
                onToggleActive={(id, cur) => toggleActive("services", id, cur)}
                onClone={cloneService}
                modalService={serviceModal}
                onModalClose={() => setServiceModal(undefined)}
                onSave={saveService}
                detailService={serviceDetail}
                onDetailClose={() => setServiceDetail(null)}
              />
            </TabErrorBoundary>
          )}
          {activeTab === "appointments" && (
            <TabErrorBoundary tabLabel="المواعيد">
              <AppointmentsTab
                loading={loading}
                appointments={appointments} total={total} page={page} limit={limit}
                branches={branches} doctors={doctors} services={services}
                filters={filters} onFiltersChange={f => { setFilters(f); setPage(1); }}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                onBulkUpdateStatus={bulkUpdateStatus}
                onBulkDelete={bulkDelete}
                onClearSelection={() => setSelectedIds(new Set())}
                onUpdateStatus={updateAppointmentStatus}
                onEdit={a => setAppointmentModal(a)}
                onPageChange={setPage}
                sortBy={sortBy} sortOrder={sortOrder}
                onSortChange={(field, order) => { setSortBy(field); setSortOrder(order); }}
                modalAppointment={appointmentModal}
                onModalClose={() => setAppointmentModal(undefined)}
                onSave={saveAppointment}
              />
            </TabErrorBoundary>
          )}
          {activeTab === "calendar" && (
            <TabErrorBoundary tabLabel="التقويم">
              <CalendarTab
                appointments={appointments}
                calDate={calDate} onCalDateChange={setCalDate}
                selectedDay={selectedDay} onSelectedDayChange={setSelectedDay}
              />
            </TabErrorBoundary>
          )}
        </>
      )}
      <AlertDialog open={!!confirmDialog} onOpenChange={(open) => { if (!open) setConfirmDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirmDialog?.onConfirm(); setConfirmDialog(null); }}>تأكيد</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!cloneTarget} onOpenChange={(open) => { if (!open) setCloneTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>استنساخ خدمة</AlertDialogTitle>
            <AlertDialogDescription>أدخل اسم الخدمة الجديدة:</AlertDialogDescription>
          </AlertDialogHeader>
          <input className={MODAL_INPUT_CLS + " mx-4"} autoFocus value={cloneNameInput} onChange={e => setCloneNameInput(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!cloneTarget || !cloneNameInput) return;
              setCloneTarget(null);
              const data = await apiCall(api(`services/${cloneTarget.id}/clone`), "POST", { newName: cloneNameInput });
              if (data !== false) fetchServices();
            }}>تأكيد</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
