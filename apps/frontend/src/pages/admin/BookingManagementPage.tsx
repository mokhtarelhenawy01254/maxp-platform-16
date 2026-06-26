import React, { useState, useEffect, useMemo } from "react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import {
  BuildingOffice2Icon, UserGroupIcon, WrenchScrewdriverIcon,
  CalendarDaysIcon, ChartBarSquareIcon, PlusIcon,
  PencilIcon, TrashIcon, EyeIcon, XMarkIcon, CheckIcon,
  ClockIcon, FunnelIcon, MagnifyingGlassIcon,
  ChevronLeftIcon, ChevronRightIcon
} from "@heroicons/react/24/outline";

const getAuthHeaders = () => tokenManager.createAuthHeaders({ "Content-Type": "application/json" });
const api = (path: string) => buildApiUrl(`booking/${path}`);

interface BookingBranch {
  id: string; name: string; address: string; phone: string;
  workingDays: string; workStart: string; workEnd: string;
  isActive: boolean; createdAt: string;
}

interface BookingDoctor {
  id: string; name: string; branchId: string; branchName?: string;
  specialization: string; phone: string; isActive: boolean; createdAt: string;
}

interface BookingService {
  id: string; name: string; description: string; duration: number;
  defaultPrice: number; packages: { sessions: number; price: number; }[];
  isActive: boolean; createdAt: string;
}

interface BookingAppointment {
  id: string; customerName: string; customerPhone: string;
  customerGender?: string;
  branchId: string; branchName?: string;
  doctorId?: string; doctorName?: string;
  serviceId?: string; serviceName?: string;
  appointmentDate: string; startTime: string; endTime: string;
  duration: number; status: string; source?: string;
  paymentRequired: boolean; paymentStatus?: string;
  notes: string; confirmedAt?: string; createdAt: string;
}

type TabId = "dashboard" | "branches" | "doctors" | "services" | "appointments" | "calendar";
const TABS: { id: TabId; label: string; icon: typeof ChartBarSquareIcon }[] = [
  { id: "dashboard", label: "لوحة التحكم", icon: ChartBarSquareIcon },
  { id: "appointments", label: "المواعيد", icon: CalendarDaysIcon },
  { id: "calendar", label: "التقويم", icon: CalendarDaysIcon },
  { id: "branches", label: "الفروع", icon: BuildingOffice2Icon },
  { id: "doctors", label: "الأطباء", icon: UserGroupIcon },
  { id: "services", label: "الخدمات", icon: WrenchScrewdriverIcon },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد الانتظار", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "مؤكد", color: "bg-green-100 text-green-800" },
  completed: { label: "مكتمل", color: "bg-blue-100 text-blue-800" },
  cancelled: { label: "ملغي", color: "bg-red-100 text-red-800" },
  no_show: { label: "لم يحضر", color: "bg-gray-100 text-gray-800" },
};

const fetchJson = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, { headers: getAuthHeaders(), ...options });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || data.message || "فشل العملية");
  return data.data;
};

const BranchModal = ({ branch, onClose, onSave }: {
  branch?: Partial<BookingBranch> | null;
  onClose: () => void;
  onSave: (d: Partial<BookingBranch>) => Promise<void>;
}) => {
  const [form, setForm] = useState({ name: "", address: "", phone: "", workingDays: "sat,mon,wed", workStart: "09:00", workEnd: "22:00", isActive: true, ...branch });
  const days = [
    { value: "sat", label: "السبت" }, { value: "sun", label: "الأحد" },
    { value: "mon", label: "الإثنين" }, { value: "tue", label: "الثلاثاء" },
    { value: "wed", label: "الأربعاء" }, { value: "thu", label: "الخميس" },
    { value: "fri", label: "الجمعة" },
  ];
  const toggleDay = (d: string) => {
    const current = (form.workingDays || "").split(",").filter(Boolean);
    const next = current.includes(d) ? current.filter(x => x !== d) : [...current, d];
    setForm({ ...form, workingDays: next.join(",") });
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{branch?.id ? "تعديل فرع" : "إضافة فرع"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label><input className="w-full border rounded-lg px-3 py-2" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label><input className="w-full border rounded-lg px-3 py-2" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label><input className="w-full border rounded-lg px-3 py-2" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">أيام العمل</label>
            <div className="flex flex-wrap gap-2">
              {days.map(d => (
                <button key={d.value} onClick={() => toggleDay(d.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${(form.workingDays || "").split(",").includes(d.value) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"}`}>{d.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">بداية العمل</label><input type="time" className="w-full border rounded-lg px-3 py-2" value={form.workStart} onChange={e => setForm({ ...form, workStart: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">نهاية العمل</label><input type="time" className="w-full border rounded-lg px-3 py-2" value={form.workEnd} onChange={e => setForm({ ...form, workEnd: e.target.value })} /></div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50">إلغاء</button>
          <button onClick={() => onSave(form)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">حفظ</button>
        </div>
      </div>
    </div>
  );
};

const DoctorModal = ({ doctor, branches, onClose, onSave }: {
  doctor?: Partial<BookingDoctor> | null;
  branches: BookingBranch[];
  onClose: () => void;
  onSave: (d: Partial<BookingDoctor>) => Promise<void>;
}) => {
  const [form, setForm] = useState({ name: "", branchId: "", specialization: "", phone: "", isActive: true, ...doctor });
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{doctor?.id ? "تعديل طبيب" : "إضافة طبيب"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label><input className="w-full border rounded-lg px-3 py-2" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">الفرع</label>
            <select className="w-full border rounded-lg px-3 py-2" value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })}>
              <option value="">اختر الفرع</option>
              {branches.filter(b => b.isActive).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">التخصص</label><input className="w-full border rounded-lg px-3 py-2" value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label><input className="w-full border rounded-lg px-3 py-2" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50">إلغاء</button>
          <button onClick={() => onSave(form)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">حفظ</button>
        </div>
      </div>
    </div>
  );
};

const ServiceModal = ({ service, onClose, onSave }: {
  service?: Partial<BookingService> | null;
  onClose: () => void;
  onSave: (d: Partial<BookingService>) => Promise<void>;
}) => {
  const [form, setForm] = useState<Partial<BookingService>>({ name: "", description: "", duration: 30, defaultPrice: 0, packages: [], isActive: true, ...service });
  const addPackage = () => setForm({ ...form, packages: [...(form.packages || []), { sessions: 1, price: 0 }] });
  const updatePackage = (i: number, k: string, v: number) => {
    const p = [...(form.packages || [])];
    p[i] = { ...p[i], [k]: v };
    setForm({ ...form, packages: p });
  };
  const removePackage = (i: number) => setForm({ ...form, packages: (form.packages || []).filter((_, idx) => idx !== i) });
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xl mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{service?.id ? "تعديل خدمة" : "إضافة خدمة"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label><input className="w-full border rounded-lg px-3 py-2" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label><textarea className="w-full border rounded-lg px-3 py-2" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">المدة (دقائق)</label><input type="number" min={5} className="w-full border rounded-lg px-3 py-2" value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">السعر الافتراضي (ج.م)</label><input type="number" min={0} className="w-full border rounded-lg px-3 py-2" value={form.defaultPrice} onChange={e => setForm({ ...form, defaultPrice: Number(e.target.value) })} /></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">الباقات</label>
              <button onClick={addPackage} className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ إضافة باقة</button>
            </div>
            {(form.packages || []).length === 0 && <p className="text-sm text-gray-400">لا توجد باقات</p>}
            {(form.packages || []).map((pkg, i) => (
              <div key={i} className="flex items-center gap-3 mb-2 p-2 bg-gray-50 rounded-lg">
                <div className="flex-1"><label className="text-xs text-gray-500">الجلسات</label><input type="number" min={1} className="w-full border rounded px-2 py-1 text-sm" value={pkg.sessions} onChange={e => updatePackage(i, "sessions", Number(e.target.value))} /></div>
                <div className="flex-1"><label className="text-xs text-gray-500">السعر</label><input type="number" min={0} className="w-full border rounded px-2 py-1 text-sm" value={pkg.price} onChange={e => updatePackage(i, "price", Number(e.target.value))} /></div>
                <button onClick={() => removePackage(i)} className="mt-5 p-1 text-red-500 hover:bg-red-50 rounded"><TrashIcon className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50">إلغاء</button>
          <button onClick={() => onSave({ ...form, packages: form.packages?.filter(p => p.sessions > 0 && p.price > 0) })} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">حفظ</button>
        </div>
      </div>
    </div>
  );
};

const AppointmentModal = ({ appointment, branches, branchDoctors, services, onClose, onSave }: {
  appointment?: Partial<BookingAppointment> | null;
  branches: BookingBranch[];
  branchDoctors: BookingDoctor[];
  services: BookingService[];
  onClose: () => void;
  onSave: (d: Partial<BookingAppointment>) => Promise<void>;
}) => {
  const [form, setForm] = useState<Partial<BookingAppointment>>({
    customerName: "", customerPhone: "", customerGender: "male",
    branchId: "", doctorId: "", serviceId: "",
    appointmentDate: "", startTime: "", notes: "",
    ...appointment,
  });
  const [slots, setSlots] = useState<{ startTime: string; endTime: string; available: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (form.branchId && form.appointmentDate && form.serviceId) {
      fetchSlots();
    }
  }, [form.branchId, form.appointmentDate, form.serviceId]);

  const fetchSlots = async () => {
    setLoadingSlots(true);
    const service = services.find(s => s.id === form.serviceId);
    const params = new URLSearchParams({
      branchId: form.branchId!, date: form.appointmentDate!,
      serviceId: form.serviceId!, duration: String(service?.duration || 30),
    });
    try {
      const data = await fetchJson(api(`appointments/available-slots?${params}`));
      setSlots(Array.isArray(data) ? data : []);
    } catch { setSlots([]); } finally { setLoadingSlots(false); }
  };

  const doctors = branchDoctors.filter(d => d.branchId === form.branchId && d.isActive);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{appointment?.id ? "تفاصيل الموعد" : "حجز موعد"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">اسم العميل</label><input className="w-full border rounded-lg px-3 py-2" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label><input className="w-full border rounded-lg px-3 py-2" value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">الجنس</label>
            <select className="w-full border rounded-lg px-3 py-2" value={form.customerGender} onChange={e => setForm({ ...form, customerGender: e.target.value })}>
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">الفرع</label>
            <select className="w-full border rounded-lg px-3 py-2" value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value, doctorId: "" })}>
              <option value="">اختر الفرع</option>
              {branches.filter(b => b.isActive).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">الخدمة</label>
              <select className="w-full border rounded-lg px-3 py-2" value={form.serviceId} onChange={e => setForm({ ...form, serviceId: e.target.value })}>
                <option value="">اختر الخدمة</option>
                {services.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">الطبيب</label>
              <select className="w-full border rounded-lg px-3 py-2" value={form.doctorId || ""} onChange={e => setForm({ ...form, doctorId: e.target.value })}>
                <option value="">أي طبيب</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label><input type="date" className="w-full border rounded-lg px-3 py-2" value={form.appointmentDate} onChange={e => setForm({ ...form, appointmentDate: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">الوقت</label>
              <select className="w-full border rounded-lg px-3 py-2" value={form.startTime || ""} onChange={e => setForm({ ...form, startTime: e.target.value })}>
                <option value="">اختر الوقت</option>
                {loadingSlots && <option disabled>جاري تحميل الأوقات...</option>}
                {!loadingSlots && slots.length === 0 && <option disabled>لا توجد أوقات متاحة</option>}
                {slots.filter(s => s.available).map(s => <option key={s.startTime} value={s.startTime}>{s.startTime}</option>)}
              </select>
            </div>
          </div>
          {appointment?.id && (
            <div><label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label><textarea className="w-full border rounded-lg px-3 py-2" rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50">إلغاء</button>
          {!appointment?.id && <button onClick={() => onSave(form)} disabled={!form.customerName || !form.branchId || !form.appointmentDate || !form.startTime} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">حجز</button>}
        </div>
      </div>
    </div>
  );
};

export default function BookingManagementPage() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  const [branches, setBranches] = useState<BookingBranch[]>([]);
  const [doctors, setDoctors] = useState<BookingDoctor[]>([]);
  const [services, setServices] = useState<BookingService[]>([]);
  const [appointments, setAppointments] = useState<BookingAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  const [branchModal, setBranchModal] = useState<Partial<BookingBranch> | null | undefined>(undefined);
  const [doctorModal, setDoctorModal] = useState<Partial<BookingDoctor> | null | undefined>(undefined);
  const [serviceModal, setServiceModal] = useState<Partial<BookingService> | null | undefined>(undefined);
  const [appointmentModal, setAppointmentModal] = useState<Partial<BookingAppointment> | null | undefined>(undefined);

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filters, setFilters] = useState({ status: "", branchId: "", dateFrom: "", dateTo: "" });
  const [searchDoctor, setSearchDoctor] = useState("");
  const [searchService, setSearchService] = useState("");

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    if (activeTab === "appointments") fetchAppointments();
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
    setLoading(true);
    await Promise.all([fetchBranches(), fetchDoctors(), fetchServices()]);
    setLoading(false);
  };

  const fetchBranches = async () => { try { setBranches(await fetchJson(api("branches"))); } catch {} };
  const fetchDoctors = async (branchId?: string) => {
    try { setDoctors(await fetchJson(api(`doctors${branchId ? `?branchId=${branchId}` : ""}`))); } catch {}
  };
  const fetchServices = async (branchId?: string) => {
    try { setServices(await fetchJson(api(`services${branchId ? `?branchId=${branchId}` : ""}`))); } catch {}
  };
  const fetchAppointments = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.branchId) params.append("branchId", filters.branchId);
    if (!filters.branchId && selectedBranchId) params.append("branchId", selectedBranchId);
    if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.append("dateTo", filters.dateTo);
    try { setAppointments(await fetchJson(api(`appointments?${params}`))); } catch { setAppointments([]); } finally { setLoading(false); }
  };

  const saveBranch = async (d: Partial<BookingBranch>) => {
    const isEdit = !!d.id;
    const url = isEdit ? api(`branches/${d.id}`) : api("branches");
    await fetch(url, { method: isEdit ? "PUT" : "POST", headers: getAuthHeaders(), body: JSON.stringify(d) });
    setBranchModal(undefined); fetchBranches();
  };

  const saveDoctor = async (d: Partial<BookingDoctor>) => {
    const isEdit = !!d.id;
    const url = isEdit ? api(`doctors/${d.id}`) : api("doctors");
    await fetch(url, { method: isEdit ? "PUT" : "POST", headers: getAuthHeaders(), body: JSON.stringify(d) });
    setDoctorModal(undefined); fetchDoctors();
  };

  const saveService = async (d: Partial<BookingService>) => {
    const isEdit = !!d.id;
    const url = isEdit ? api(`services/${d.id}`) : api("services");
    await fetch(url, { method: isEdit ? "PUT" : "POST", headers: getAuthHeaders(), body: JSON.stringify(d) });
    setServiceModal(undefined); fetchServices();
  };

  const saveAppointment = async (d: Partial<BookingAppointment>) => {
    await fetch(api("appointments"), { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(d) });
    setAppointmentModal(undefined); fetchAppointments();
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    await fetch(api(`appointments/${id}/status`), { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ status }) });
    fetchAppointments();
  };

  const toggleActive = async (type: string, id: string, current: boolean) => {
    await fetch(api(`${type}/${id}`), { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ isActive: !current }) });
    if (type === "branches") fetchBranches();
    else if (type === "doctors") fetchDoctors();
    else fetchServices();
  };

  const deleteItem = async (type: string, id: string) => {
    if (!confirm("تأكيد الحذف؟")) return;
    await fetch(api(`${type}/${id}`), { method: "DELETE", headers: getAuthHeaders() });
    if (type === "branches") fetchBranches();
    else if (type === "doctors") fetchDoctors();
    else fetchServices();
  };

  const branchAppointments = useMemo(() =>
    selectedBranchId ? appointments.filter(a => a.branchId === selectedBranchId) : appointments,
    [appointments, selectedBranchId]
  );
  const today = new Date().toISOString().split("T")[0];
  const stats = {
    todayAppointments: branchAppointments.filter(a => a.appointmentDate === today),
    pendingCount: branchAppointments.filter(a => a.status === "pending").length,
    confirmedCount: branchAppointments.filter(a => a.status === "confirmed").length,
    totalBranches: selectedBranchId ? 1 : branches.length,
    totalDoctors: selectedBranchId ? doctors.length : doctors.filter(d => d.isActive).length,
    maleCount: branchAppointments.filter(a => a.customerGender === "male").length,
    femaleCount: branchAppointments.filter(a => a.customerGender === "female").length,
    revenue: branchAppointments.reduce((sum, a) => sum + (a.serviceId ? 1 : 0), 0) * 100,
  };

  const renderDashboard = () => (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "مواعيد اليوم", value: stats.todayAppointments.length, icon: CalendarDaysIcon, color: "bg-blue-500" },
          { label: "بانتظار التأكيد", value: stats.pendingCount, icon: ClockIcon, color: "bg-yellow-500" },
          { label: "مؤكدة", value: stats.confirmedCount, icon: CheckIcon, color: "bg-green-500" },
          { label: "الأطباء", value: stats.totalDoctors, icon: UserGroupIcon, color: "bg-purple-500" },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4">
            <div className={`${c.color} p-3 rounded-lg`}><c.icon className="w-6 h-6 text-white" /></div>
            <div><p className="text-2xl font-bold">{c.value}</p><p className="text-sm text-gray-500">{c.label}</p></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500 mb-1">المواعيد اليوم</p>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span><span className="text-sm">ذكور: {stats.maleCount}</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-pink-500"></span><span className="text-sm">إناث: {stats.femaleCount}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500 mb-1">الفروع النشطة</p>
          <p className="text-2xl font-bold">{stats.totalBranches}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500 mb-1">إجمالي الحجوزات</p>
          <p className="text-2xl font-bold">{branchAppointments.length}</p>
        </div>
      </div>
      {(selectedBranchId ? branches.filter(b => b.id === selectedBranchId) : branches).map(branch => {
        const branchAppts = branchAppointments.filter(a => a.branchId === branch.id).slice(0, 10);
        return (
          <div key={branch.id} className="bg-white rounded-xl shadow-sm border p-4 mb-4">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><BuildingOffice2Icon className="w-5 h-5 text-gray-500" />{branch.name}</h3>
            {branchAppts.length === 0 ? (
              <p className="text-sm text-gray-400">لا توجد مواعيد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-gray-500">{["العميل", "التاريخ", "الوقت", "الحالة"].map(h => <th key={h} className="text-right py-2 px-3">{h}</th>)}</tr></thead>
                  <tbody>{branchAppts.map(a => (
                    <tr key={a.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3">{a.customerName}</td>
                      <td className="py-2 px-3">{a.appointmentDate}</td>
                      <td className="py-2 px-3">{a.startTime}</td>
                      <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_MAP[a.status]?.color || ""}`}>{STATUS_MAP[a.status]?.label || a.status}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderBranches = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">إدارة الفروع</h2>
        <button onClick={() => setBranchModal({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />إضافة فرع</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b bg-gray-50 text-gray-500 text-sm">{["الاسم", "العنوان", "الهاتف", "أيام العمل", "الحالة", ""].map(h => <th key={h} className="text-right py-3 px-4">{h}</th>)}</tr></thead>
          <tbody>{branches.map(b => (
            <tr key={b.id} className="border-b hover:bg-gray-50 text-sm">
              <td className="py-3 px-4 font-medium">{b.name}</td>
              <td className="py-3 px-4 text-gray-500">{b.address || "—"}</td>
              <td className="py-3 px-4">{b.phone || "—"}</td>
              <td className="py-3 px-4 text-xs text-gray-500">{b.workStart} - {b.workEnd}</td>
              <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${b.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{b.isActive ? "نشط" : "غير نشط"}</span></td>
              <td className="py-3 px-4">
                <div className="flex gap-2">
                  <button onClick={() => setBranchModal(b)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><PencilIcon className="w-4 h-4" /></button>
                  <button onClick={() => toggleActive("branches", b.id, b.isActive)} className={`p-1 rounded ${b.isActive ? "text-red-500 hover:bg-red-50" : "text-green-500 hover:bg-green-50"}`}><CheckIcon className="w-4 h-4" /></button>
                  <button onClick={() => deleteItem("branches", b.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><TrashIcon className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {branchModal !== undefined && <BranchModal branch={branchModal} onClose={() => setBranchModal(undefined)} onSave={saveBranch} />}
    </div>
  );

  const renderDoctors = () => {
    const filtered = doctors.filter(d => (!searchDoctor || d.name.includes(searchDoctor) || d.specialization.includes(searchDoctor)));
    return (
      <div>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h2 className="text-xl font-bold">إدارة الأطباء</h2>
          <div className="flex gap-3">
            <div className="relative"><MagnifyingGlassIcon className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" /><input className="border rounded-lg pr-9 pl-3 py-2 text-sm w-48" placeholder="بحث..." value={searchDoctor} onChange={e => setSearchDoctor(e.target.value)} /></div>
            <button onClick={() => setDoctorModal({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />إضافة طبيب</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => {
            const branch = branches.find(b => b.id === d.branchId);
            return (
              <div key={d.id} className={`bg-white rounded-xl shadow-sm border p-4 ${!d.isActive ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between mb-2">
                  <div><h3 className="font-bold">{d.name}</h3><p className="text-sm text-gray-500">{d.specialization}</p></div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${d.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{d.isActive ? "نشط" : "غير نشط"}</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">{branch?.name || "—"}</p>
                <div className="flex gap-2">
                  <button onClick={() => setDoctorModal(d)} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><PencilIcon className="w-3.5 h-3.5 inline ml-1" />تعديل</button>
                  <button onClick={() => toggleActive("doctors", d.id, d.isActive)} className={`text-xs px-3 py-1.5 rounded-lg ${d.isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>{d.isActive ? "تعطيل" : "تفعيل"}</button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="col-span-full text-gray-400 text-center py-8">لا يوجد أطباء</p>}
        </div>
        {doctorModal !== undefined && <DoctorModal doctor={doctorModal} branches={branches} onClose={() => setDoctorModal(undefined)} onSave={saveDoctor} />}
      </div>
    );
  };

  const renderServices = () => {
    const filtered = services.filter(s => !searchService || s.name.includes(searchService));
    return (
      <div>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h2 className="text-xl font-bold">إدارة الخدمات</h2>
          <div className="flex gap-3">
            <div className="relative"><MagnifyingGlassIcon className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" /><input className="border rounded-lg pr-9 pl-3 py-2 text-sm w-48" placeholder="بحث..." value={searchService} onChange={e => setSearchService(e.target.value)} /></div>
            <button onClick={() => setServiceModal({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />إضافة خدمة</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => {
            const totalPkg = (s.packages || []).reduce((acc, p) => acc + p.sessions, 0);
            return (
              <div key={s.id} className={`bg-white rounded-xl shadow-sm border p-4 ${!s.isActive ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between mb-2">
                  <div><h3 className="font-bold">{s.name}</h3><p className="text-xs text-gray-500 line-clamp-2">{s.description || "—"}</p></div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${s.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{s.isActive ? "نشط" : "غير نشط"}</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-500 mb-2">
                  <span>{s.duration} دقيقة</span>
                  <span>{s.defaultPrice} ج.م</span>
                  {totalPkg > 0 && <span>باقة: {totalPkg} جلسة</span>}
                </div>
                {(s.packages || []).length > 0 && (
                  <div className="mb-3">
                    {s.packages!.map((pkg, i) => (
                      <div key={i} className="text-xs bg-blue-50 text-blue-700 inline-block px-2 py-0.5 rounded ml-1 mb-1">{pkg.sessions} جلسات - {pkg.price} ج.م</div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setServiceModal(s)} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><PencilIcon className="w-3.5 h-3.5 inline ml-1" />تعديل</button>
                  <button onClick={() => toggleActive("services", s.id, s.isActive)} className={`text-xs px-3 py-1.5 rounded-lg ${s.isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>{s.isActive ? "تعطيل" : "تفعيل"}</button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="col-span-full text-gray-400 text-center py-8">لا توجد خدمات</p>}
        </div>
        {serviceModal !== undefined && <ServiceModal service={serviceModal} onClose={() => setServiceModal(undefined)} onSave={saveService} />}
      </div>
    );
  };

  const renderAppointments = () => (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="text-xl font-bold">المواعيد</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <select className="border rounded-lg px-3 py-2 text-sm" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="border rounded-lg px-3 py-2 text-sm" value={filters.branchId} onChange={e => setFilters({ ...filters, branchId: e.target.value })}>
            <option value="">كل الفروع</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} />
          <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} />
          <button onClick={() => setAppointmentModal({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />حجز موعد</button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b bg-gray-50 text-gray-500 text-sm">{["العميل", "الهاتف", "الفرع", "التاريخ", "الوقت", "الحالة", ""].map(h => <th key={h} className="text-right py-3 px-4">{h}</th>)}</tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">جاري التحميل...</td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">لا توجد مواعيد</td></tr>
            ) : appointments.map(a => (
              <tr key={a.id} className="border-b hover:bg-gray-50 text-sm">
                <td className="py-3 px-4 font-medium">{a.customerName}</td>
                <td className="py-3 px-4 text-gray-500">{a.customerPhone}</td>
                <td className="py-3 px-4">{a.branchName || "—"}</td>
                <td className="py-3 px-4">{a.appointmentDate}</td>
                <td className="py-3 px-4">{a.startTime}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_MAP[a.status]?.color || ""}`}>{STATUS_MAP[a.status]?.label || a.status}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">
                    {a.status === "pending" && (
                      <>
                        <button onClick={() => updateAppointmentStatus(a.id, "confirmed")} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="تأكيد"><CheckIcon className="w-4 h-4" /></button>
                        <button onClick={() => updateAppointmentStatus(a.id, "cancelled")} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="إلغاء"><XMarkIcon className="w-4 h-4" /></button>
                      </>
                    )}
                    {a.status === "confirmed" && (
                      <button onClick={() => updateAppointmentStatus(a.id, "completed")} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="إتمام"><CheckIcon className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => setAppointmentModal(a)} className="p-1.5 text-gray-600 hover:bg-gray-50 rounded" title="عرض"><EyeIcon className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {appointmentModal !== undefined && <AppointmentModal appointment={appointmentModal} branches={branches} branchDoctors={doctors} services={services} onClose={() => setAppointmentModal(undefined)} onSave={saveAppointment} />}
    </div>
  );

  const renderCalendar = () => {
    const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
    const dayNamesShort = ["ح","ن","ث","ر","خ","ج","س"];

    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date().toISOString().split("T")[0];

    const apptsByDate: Record<string, typeof appointments> = {};
    appointments.forEach(a => {
      if (!apptsByDate[a.appointmentDate]) apptsByDate[a.appointmentDate] = [];
      apptsByDate[a.appointmentDate].push(a);
    });

    const dayAppts = selectedDay ? apptsByDate[selectedDay] || [] : [];

    const prevMonth = () => setCalDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCalDate(new Date(year, month + 1, 1));

    const days: { date: string; day: number; isToday: boolean; hasAppts: boolean; male: number; female: number }[] = [];
    for (let i = 0; i < firstDay; i++) days.push({ date: "", day: 0, isToday: false, hasAppts: false, male: 0, female: 0 });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const ad = apptsByDate[dateStr] || [];
      days.push({
        date: dateStr, day: d, isToday: dateStr === today,
        hasAppts: ad.length > 0,
        male: ad.filter(a => a.customerGender === "male").length,
        female: ad.filter(a => a.customerGender === "female").length,
      });
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{monthNames[month]} {year}</h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRightIcon className="w-5 h-5" /></button>
            <button onClick={() => setCalDate(new Date())} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">اليوم</button>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeftIcon className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="grid grid-cols-7 border-b bg-gray-50">
            {dayNamesShort.map(d => <div key={d} className="text-center py-3 text-sm font-medium text-gray-500">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d, i) => (
              <div key={i} onClick={() => d.date && setSelectedDay(d.date === selectedDay ? null : d.date)}
                className={`min-h-[80px] p-2 border-b border-l cursor-pointer transition-colors
                  ${d.isToday ? "bg-blue-50" : ""}
                  ${d.date === selectedDay ? "ring-2 ring-blue-500 ring-inset" : ""}
                  ${!d.date ? "bg-gray-50" : "hover:bg-gray-50"}`}>
                {d.date && (
                  <>
                    <span className={`text-sm font-medium ${d.isToday ? "text-blue-600" : "text-gray-700"}`}>{d.day}</span>
                    {d.hasAppts && (
                      <div className="mt-1 space-y-0.5">
                        {d.male > 0 && <div className="text-xs px-1 py-0.5 rounded bg-blue-100 text-blue-700">{d.male} ذكر</div>}
                        {d.female > 0 && <div className="text-xs px-1 py-0.5 rounded bg-pink-100 text-pink-700">{d.female} أنثى</div>}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        {selectedDay && (
          <div className="mt-4 bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-bold mb-3">مواعيد {selectedDay}</h3>
            {dayAppts.length === 0 ? (
              <p className="text-sm text-gray-400">لا توجد مواعيد</p>
            ) : (
              <div className="space-y-2">
                {dayAppts.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${a.customerGender === "female" ? "bg-pink-500" : "bg-blue-500"}`}></span>
                      <div>
                        <p className="font-medium text-sm">{a.customerName}</p>
                        <p className="text-xs text-gray-500">{a.startTime} - {a.serviceName || a.branchName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_MAP[a.status]?.color || ""}`}>{STATUS_MAP[a.status]?.label || a.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">إدارة المركز الطبي</h1>
        <p className="text-gray-500 text-sm">نظام إدارة المواعيد والخدمات الطبية</p>
      </div>
      <div className="mb-4">
        <select className="border rounded-lg px-3 py-2 text-sm w-64" value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}>
          <option value="">كل الفروع</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {selectedBranchId && (
          <button onClick={() => setSelectedBranchId("")} className="mr-2 text-sm text-blue-600 hover:text-blue-700">إزالة الفلتر</button>
        )}
      </div>
      <div className="flex gap-1 mb-6 border-b overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>
      {loading && activeTab !== "appointments" && activeTab !== "calendar" ? (
        <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
      ) : (
        <>
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "branches" && renderBranches()}
          {activeTab === "doctors" && renderDoctors()}
          {activeTab === "services" && renderServices()}
          {activeTab === "appointments" && renderAppointments()}
          {activeTab === "calendar" && renderCalendar()}
        </>
      )}
    </div>
  );
}
