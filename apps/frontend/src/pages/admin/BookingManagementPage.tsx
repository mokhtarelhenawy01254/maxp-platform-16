import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  BookingBranch, BookingDoctor, BookingAppointment, BookingService,
  TabId, TABS, fetchJson, api, getAuthHeaders
} from "./booking/shared";
import BranchesTab from "./booking/BranchesTab";
import DashboardTab from "./booking/DashboardTab";
import DoctorsTab from "./booking/DoctorsTab";
import ServicesTab from "./booking/ServicesTab";
import AppointmentsTab from "./booking/AppointmentsTab";
import CalendarTab from "./booking/CalendarTab";

export default function BookingManagementPage() {
  const { "*": path } = useParams();
  const navigate = useNavigate();
  const urlTab = (path || "").split("/")[0];
  const activeTab = (["dashboard", "appointments", "calendar", "branches", "doctors", "services"].includes(urlTab) ? urlTab : "dashboard") as TabId;
  const setActiveTab = (tab: TabId) => navigate(`/admin/booking/${tab === "dashboard" ? "" : tab}`);

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
  const [filters, setFilters] = useState({ status: "", branchId: "", dateFrom: "", dateTo: "" });
  const [searchDoctor, setSearchDoctor] = useState("");
  const [searchService, setSearchService] = useState("");
  const [serviceFilterStatus, setServiceFilterStatus] = useState<"all" | "active" | "inactive">("active");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    if (activeTab === "appointments") { setLoading(true); fetchAppointments().finally(() => setLoading(false)); }
    if (activeTab === "dashboard" || activeTab === "calendar") { fetchAll(); }
  }, [activeTab]);

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
    try { await Promise.all([fetchBranches(), fetchDoctors(), fetchServices(), fetchAppointments()]); }
    catch (e: any) { setError(e.message || "فشل تحميل البيانات"); }
    setLoading(false);
  };

  const fetchBranches = async () => { try { setBranches(await fetchJson(api("branches"))); } catch (e: any) { console.error("fetchBranches", e); throw e; } };
  const fetchDoctors = async (branchId?: string) => {
    try { setDoctors(await fetchJson(api(`doctors${branchId ? `?branchId=${branchId}` : ""}`))); } catch (e: any) { console.error("fetchDoctors", e); throw e; }
  };
  const fetchServices = async (branchId?: string) => {
    try { setServices(await fetchJson(api(`services${branchId ? `?branchId=${branchId}` : ""}`)) || []); } catch (e: any) { console.error("fetchServices", e); throw e; }
  };
  const fetchAppointments = async () => {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.branchId) params.append("branchId", filters.branchId);
    if (!filters.branchId && selectedBranchId) params.append("branchId", selectedBranchId);
    if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.append("dateTo", filters.dateTo);
    try { setAppointments(await fetchJson(api(`appointments?${params}`))); } catch (e: any) { console.error("fetchAppointments", e); setAppointments([]); throw e; }
  };

  const apiCall = async (url: string, method: string, body?: any) => {
    const res = await fetch(url, { method, headers: getAuthHeaders(), body: body ? JSON.stringify(body) : undefined });
    const data = await res.json();
    if (!data.success) { toast.error(data.error || "فشل العملية"); return false; }
    return data.data;
  };

  const saveBranch = async (d: any) => {
    const isEdit = !!d.id;
    const url = isEdit ? api(`branches/${d.id}`) : api("branches");
    const phones = (d.phones || []).map((p: string) => String(p).trim()).filter(Boolean);
    const body: Record<string, unknown> = { name: d.name, address: d.address, phone: phones[0] || d.phone || "", phones, isActive: d.isActive };
    if (d.workingDays) {
      const days = d.workingDays.split(",").filter(Boolean);
      if (days.length > 0) {
        const wd: Record<string, string> = {};
        days.forEach((day: string) => { wd[day] = `${d.workStart || "09:00"}-${d.workEnd || "22:00"}`; });
        body.workingDays = wd;
      }
    }
    const maleDays = (d.maleDays || []).sort();
    const femaleDays = (d.femaleDays || []).sort();
    body.genderDays = { male: maleDays, female: femaleDays };
    if (d.maxBookingsPerSlot !== undefined) body.maxBookingsPerSlot = d.maxBookingsPerSlot;
    if (d.location !== undefined) body.location = d.location;
    if (d.landmarkImage !== undefined) body.landmarkImage = d.landmarkImage;
    const data = await apiCall(url, isEdit ? "PUT" : "POST", body);
    if (data !== false) { setBranchModal(undefined); fetchBranches(); }
  };

  const saveDoctor = async (d: Partial<BookingDoctor>) => {
    const data = await apiCall(api(`doctors/${d.id ? d.id : ""}`), d.id ? "PUT" : "POST", d);
    if (data !== false) { setDoctorModal(undefined); fetchDoctors(); }
  };

  const saveService = async (d: any) => {
    const isEdit = !!d.id;
    if (isEdit) {
      const data = await apiCall(api(`services/${d.id}`), "PUT", { name: d.name, description: d.description });
      if (data === false) return;
      if (d.branches) {
        const oldService = services.find(s => s.id === d.id);
        const oldBranchIds = new Set(oldService?.branchServices?.map((bs: any) => bs.branchId) || []);
        const newBranchIds = new Set(d.branches.map((b: any) => b.branchId));
        for (const branchId of oldBranchIds) {
          if (!newBranchIds.has(branchId)) await fetch(api(`services/${d.id}/branches/${branchId}`), { method: "DELETE", headers: getAuthHeaders() });
        }
        for (const b of d.branches) {
          await fetch(api(`services/${d.id}/branches`), {
            method: "POST", headers: getAuthHeaders(),
            body: JSON.stringify({ branchId: b.branchId, packages: b.packages?.filter((p: any) => p.count > 0) || null })
          });
        }
      }
    } else {
      const payload: any = { name: d.name, description: d.description };
      if (d.branches?.length) payload.branches = d.branches.map((b: any) => ({ branchId: b.branchId, packages: b.packages?.filter((p: any) => p.count > 0) || null }));
      const data = await apiCall(api("services"), "POST", payload);
      if (data === false) return;
    }
    setServiceModal(undefined); fetchServices();
  };

  const cloneService = async (s: BookingService) => {
    const newName = prompt("اسم الخدمة الجديدة:", `نسخة من ${s.name}`);
    if (!newName) return;
    const data = await apiCall(api(`services/${s.id}/clone`), "POST", { newName });
    if (data !== false) fetchServices();
  };

  const saveAppointment = async (d: Partial<BookingAppointment>) => {
    const data = await apiCall(api("appointments"), "POST", d);
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
    if (!confirm(`تأكيد تغيير حالة (${selectedIds.size}) موعد إلى "${status}"؟`)) return;
    const data = await apiCall(api("appointments/bulk-status"), "PUT", { ids: Array.from(selectedIds), status });
    if (data !== false) { setSelectedIds(new Set()); setLoading(true); fetchAppointments().finally(() => setLoading(false)); }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`تأكيد حذف (${selectedIds.size}) موعد بشكل نهائي؟`)) return;
    const data = await apiCall(api("appointments/bulk-delete"), "POST", { ids: Array.from(selectedIds) });
    if (data !== false) { setSelectedIds(new Set()); setLoading(true); fetchAppointments().finally(() => setLoading(false)); }
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
    if (!confirm("تأكيد الحذف؟")) return;
    const data = await apiCall(api(`${type}/${id}`), "DELETE");
    if (data !== false) {
      if (type === "branches") fetchBranches();
      else if (type === "doctors") fetchDoctors();
      else fetchServices();
    }
  };

  const branchAppointments = useMemo(() =>
    selectedBranchId ? appointments.filter(a => a.branchId === selectedBranchId) : appointments,
    [appointments, selectedBranchId]
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">إدارة النظام الطبي</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-2xl">نظام إدارة المواعيد والخدمات الطبية</p>
      </div>
      <div className="mb-4">
        <select className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm w-full sm:w-64 dark:bg-gray-800 dark:text-gray-100" value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}>
          <option value="">كل الفروع</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {selectedBranchId && (
          <button onClick={() => setSelectedBranchId("")} className="mr-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700">إزالة الفلتر</button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mb-8 md:flex-nowrap md:border-b md:dark:border-gray-700 md:overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 text-sm font-medium rounded-xl md:rounded-none transition-colors whitespace-nowrap ${activeTab === tab.id ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 md:bg-transparent md:text-blue-600 md:dark:text-blue-400 md:border-b-2 md:border-blue-600" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 md:bg-transparent md:text-gray-500 md:dark:text-gray-400 md:border-transparent hover:bg-gray-200 dark:hover:bg-gray-700 md:hover:border-gray-300 md:dark:hover:border-gray-600"}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>
      {error ? (
        <div className="text-center py-16">
          <div className="text-red-500 dark:text-red-400 text-lg mb-2">⚠️ فشل تحميل البيانات</div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button onClick={fetchAll} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">إعادة المحاولة</button>
        </div>
      ) : loading && activeTab !== "appointments" && activeTab !== "calendar" ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">جاري التحميل...</div>
      ) : (
        <>
          {activeTab === "dashboard" && <DashboardTab branches={branches} doctors={doctors} appointments={appointments} selectedBranchId={selectedBranchId} />}
          {activeTab === "branches" && (
            <BranchesTab
              branches={branches}
              onEdit={b => setBranchModal(b)}
              onToggleActive={(id, cur) => toggleActive("branches", id, cur)}
              onDelete={id => deleteItem("branches", id)}
              modalBranch={branchModal}
              onModalClose={() => setBranchModal(undefined)}
              onSave={saveBranch}
            />
          )}
          {activeTab === "doctors" && (
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
          )}
          {activeTab === "services" && (
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
          )}
          {activeTab === "appointments" && (
            <AppointmentsTab
              loading={loading}
              appointments={appointments} branches={branches} doctors={doctors} services={services}
              filters={filters} onFiltersChange={setFilters}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onBulkUpdateStatus={bulkUpdateStatus}
              onBulkDelete={bulkDelete}
              onClearSelection={() => setSelectedIds(new Set())}
              onUpdateStatus={updateAppointmentStatus}
              onEdit={a => setAppointmentModal(a)}
              modalAppointment={appointmentModal}
              onModalClose={() => setAppointmentModal(undefined)}
              onSave={saveAppointment}
            />
          )}
          {activeTab === "calendar" && (
            <CalendarTab
              appointments={appointments}
              calDate={calDate} onCalDateChange={setCalDate}
              selectedDay={selectedDay} onSelectedDayChange={setSelectedDay}
            />
          )}
        </>
      )}
    </div>
  );
}
