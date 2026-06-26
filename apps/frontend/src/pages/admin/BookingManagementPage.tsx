import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  specialty: string; phone: string; isActive: boolean; createdAt: string;
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
  pending: { label: "قيد الانتظار", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  confirmed: { label: "مؤكد", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  completed: { label: "مكتمل", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  cancelled: { label: "ملغي", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  no_show: { label: "لم يحضر", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" },
};

const fetchJson = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, { headers: getAuthHeaders(), ...options });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || data.message || "فشل العملية");
  return data.data;
};

const MODAL_CONTENT_CLS = "bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-xl mx-4";
const MODAL_INPUT_CLS = "w-full border rounded-lg px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";

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
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{branch?.id ? "تعديل فرع" : "إضافة فرع"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم</label><input className={MODAL_INPUT_CLS} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان</label><input className={MODAL_INPUT_CLS} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الهاتف</label><input className={MODAL_INPUT_CLS} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">أيام العمل</label>
            <div className="flex flex-wrap gap-2">
              {days.map(d => (
                <button key={d.value} onClick={() => toggleDay(d.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border dark:border-gray-600 ${(form.workingDays || "").split(",").includes(d.value) ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"}`}>{d.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">بداية العمل</label><input type="time" className={MODAL_INPUT_CLS} value={form.workStart} onChange={e => setForm({ ...form, workStart: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نهاية العمل</label><input type="time" className={MODAL_INPUT_CLS} value={form.workEnd} onChange={e => setForm({ ...form, workEnd: e.target.value })} /></div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
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
  const [form, setForm] = useState({ name: "", branchId: "", specialty: "", phone: "", isActive: true, ...doctor });
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{doctor?.id ? "تعديل طبيب" : "إضافة طبيب"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم</label><input className={MODAL_INPUT_CLS} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الفرع</label>
            <select className={MODAL_INPUT_CLS} value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })}>
              <option value="">اختر الفرع</option>
              {branches.filter(b => b.isActive).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">التخصص</label><input className={MODAL_INPUT_CLS} value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الهاتف</label><input className={MODAL_INPUT_CLS} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
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
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{service?.id ? "تعديل خدمة" : "إضافة خدمة"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم</label><input className={MODAL_INPUT_CLS} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف</label><textarea className={MODAL_INPUT_CLS} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المدة (دقائق)</label><input type="number" min={5} className={MODAL_INPUT_CLS} value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">السعر الافتراضي (ج.م)</label><input type="number" min={0} className={MODAL_INPUT_CLS} value={form.defaultPrice} onChange={e => setForm({ ...form, defaultPrice: Number(e.target.value) })} /></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الباقات</label>
              <button onClick={addPackage} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium">+ إضافة باقة</button>
            </div>
            {(form.packages || []).length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500">لا توجد باقات</p>}
            {(form.packages || []).map((pkg, i) => (
              <div key={i} className="flex items-center gap-3 mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1"><label className="text-xs text-gray-500 dark:text-gray-400">الجلسات</label><input type="number" min={1} className="w-full border dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100" value={pkg.sessions} onChange={e => updatePackage(i, "sessions", Number(e.target.value))} /></div>
                <div className="flex-1"><label className="text-xs text-gray-500 dark:text-gray-400">السعر</label><input type="number" min={0} className="w-full border dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100" value={pkg.price} onChange={e => updatePackage(i, "price", Number(e.target.value))} /></div>
                <button onClick={() => removePackage(i)} className="mt-5 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><TrashIcon className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
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
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{appointment?.id ? "تفاصيل الموعد" : "حجز موعد"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم العميل</label><input className={MODAL_INPUT_CLS} value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الهاتف</label><input className={MODAL_INPUT_CLS} value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الجنس</label>
            <select className={MODAL_INPUT_CLS} value={form.customerGender} onChange={e => setForm({ ...form, customerGender: e.target.value })}>
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الفرع</label>
            <select className={MODAL_INPUT_CLS} value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value, doctorId: "" })}>
              <option value="">اختر الفرع</option>
              {branches.filter(b => b.isActive).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الخدمة</label>
              <select className={MODAL_INPUT_CLS} value={form.serviceId} onChange={e => setForm({ ...form, serviceId: e.target.value })}>
                <option value="">اختر الخدمة</option>
                {services.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الطبيب</label>
              <select className={MODAL_INPUT_CLS} value={form.doctorId || ""} onChange={e => setForm({ ...form, doctorId: e.target.value })}>
                <option value="">أي طبيب</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">التاريخ</label><input type="date" className={MODAL_INPUT_CLS} value={form.appointmentDate} onChange={e => setForm({ ...form, appointmentDate: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوقت</label>
              <select className={MODAL_INPUT_CLS} value={form.startTime || ""} onChange={e => setForm({ ...form, startTime: e.target.value })}>
                <option value="">اختر الوقت</option>
                {loadingSlots && <option disabled>جاري تحميل الأوقات...</option>}
                {!loadingSlots && slots.length === 0 && <option disabled>لا توجد أوقات متاحة</option>}
                {slots.filter(s => s.available).map(s => <option key={s.startTime} value={s.startTime}>{s.startTime}</option>)}
              </select>
            </div>
          </div>
          {appointment?.id && (
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label><textarea className={MODAL_INPUT_CLS} rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
          {!appointment?.id && <button onClick={() => onSave(form)} disabled={!form.customerName || !form.branchId || !form.appointmentDate || !form.startTime} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">حجز</button>}
        </div>
      </div>
    </div>
  );
};

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
    const body: Record<string, unknown> = { name: d.name, address: d.address, phone: d.phone, isActive: d.isActive };
    if ((d as any).workingDays && (d as any).workStart) {
      const days = (d as any).workingDays.split(",").filter(Boolean);
      const wd: Record<string, string> = {};
      days.forEach((day: string) => { wd[day] = `${(d as any).workStart}-${(d as any).workEnd}`; });
      body.workingDays = wd;
    }
    await fetch(url, { method: isEdit ? "PUT" : "POST", headers: getAuthHeaders(), body: JSON.stringify(body) });
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
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">لوحة التحكم</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "مواعيد اليوم", value: stats.todayAppointments.length, icon: CalendarDaysIcon, color: "bg-blue-500" },
          { label: "بانتظار التأكيد", value: stats.pendingCount, icon: ClockIcon, color: "bg-yellow-500" },
          { label: "مؤكدة", value: stats.confirmedCount, icon: CheckIcon, color: "bg-green-500" },
          { label: "الأطباء", value: stats.totalDoctors, icon: UserGroupIcon, color: "bg-purple-500" },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 flex items-center gap-4">
            <div className={`${c.color} p-3 rounded-lg`}><c.icon className="w-6 h-6 text-white" /></div>
            <div><p className="text-2xl font-bold">{c.value}</p><p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">المواعيد اليوم</p>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span><span className="text-sm">ذكور: {stats.maleCount}</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-pink-500"></span><span className="text-sm">إناث: {stats.femaleCount}</span></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الفروع النشطة</p>
          <p className="text-2xl font-bold">{stats.totalBranches}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">إجمالي الحجوزات</p>
          <p className="text-2xl font-bold">{branchAppointments.length}</p>
        </div>
      </div>
      {(selectedBranchId ? branches.filter(b => b.id === selectedBranchId) : branches).map(branch => {
        const branchAppts = branchAppointments.filter(a => a.branchId === branch.id).slice(0, 10);
        return (
          <div key={branch.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 mb-4">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><BuildingOffice2Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />{branch.name}</h3>
            {branchAppts.length === 0 ? (
              <p className="text-center py-12 text-gray-400 dark:text-gray-500">لا توجد مواعيد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">{["العميل", "التاريخ", "الوقت", "الحالة"].map(h => <th key={h} className="text-right py-3 px-4">{h}</th>)}</tr></thead>
                  <tbody>{branchAppts.map(a => (
                    <tr key={a.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-3 px-4">{a.customerName}</td>
                      <td className="py-3 px-4">{a.appointmentDate}</td>
                      <td className="py-3 px-4">{a.startTime}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_MAP[a.status]?.color || ""}`}>{STATUS_MAP[a.status]?.label || a.status}</span></td>
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
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">إدارة الفروع</h2>
        <button onClick={() => setBranchModal({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />إضافة فرع</button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">{["الاسم", "العنوان", "الهاتف", "أيام العمل", "الحالة", ""].map(h => <th key={h} className="text-right py-3 px-4">{h}</th>)}</tr></thead>
          <tbody>{branches.map(b => (
            <tr key={b.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
              <td className="py-3 px-4 font-medium">{b.name}</td>
              <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{b.address || "—"}</td>
              <td className="py-3 px-4">{b.phone || "—"}</td>
                            <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">{
                (() => {
                  try {
                    const wd = typeof b.workingDays === 'string' ? JSON.parse(b.workingDays) : b.workingDays;
                    if (!wd || typeof wd !== 'object') return "—";
                    const dayNames = {sat:"سبت",sun:"أحد",mon:"اثنين",tue:"ثلاثاء",wed:"أربعاء",thu:"خميس",fri:"جمعة"};
                    const days = Object.entries(wd).filter(([k,v]) => v).map(([k,v]) => `${dayNames[k]||k} (${v})`);
                    return days.join(" / ") || "—";
                  } catch(e) { return "—"; }
                })()
              }</td>
              <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${b.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>{b.isActive ? "نشط" : "غير نشط"}</span></td>
              <td className="py-3 px-4">
                <div className="flex gap-1">
                  <button onClick={() => setBranchModal(b)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="تعديل"><PencilIcon className="w-4 h-4" /></button>
                  <button onClick={() => toggleActive("branches", b.id, b.isActive)} className={`p-1.5 rounded ${b.isActive ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" : "text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30"}`} title={b.isActive ? "تعطيل" : "تفعيل"}><CheckIcon className="w-4 h-4" /></button>
                  <button onClick={() => deleteItem("branches", b.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="حذف"><TrashIcon className="w-4 h-4" /></button>
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
    const filtered = doctors.filter(d => !searchDoctor || (d.name || '').includes(searchDoctor) || (d.specialty || '').includes(searchDoctor));
    return (
      <div>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h2 className="text-xl font-bold">إدارة الأطباء</h2>
          <div className="flex gap-3">
            <div className="relative"><MagnifyingGlassIcon className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" /><input className="border dark:border-gray-600 rounded-lg pr-9 pl-3 py-2 text-sm w-48 dark:bg-gray-800 dark:text-gray-100" placeholder="بحث..." value={searchDoctor} onChange={e => setSearchDoctor(e.target.value)} /></div>
            <button onClick={() => setDoctorModal({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />إضافة طبيب</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => {
            const branch = branches.find(b => b.id === d.branchId);
            return (
              <div key={d.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 ${!d.isActive ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between mb-2">
                  <div><h3 className="font-bold">{d.name}</h3><p className="text-sm text-gray-500 dark:text-gray-400">{d.specialty}</p></div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${d.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>{d.isActive ? "نشط" : "غير نشط"}</span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{branch?.name || "—"}</p>
                <div className="flex gap-2">
                  <button onClick={() => setDoctorModal(d)} className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"><PencilIcon className="w-3.5 h-3.5 inline ml-1" />تعديل</button>
                  <button onClick={() => toggleActive("doctors", d.id, d.isActive)} className={`text-xs px-3 py-1.5 rounded-lg ${d.isActive ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50" : "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50"}`}>{d.isActive ? "تعطيل" : "تفعيل"}</button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="col-span-full text-gray-400 dark:text-gray-500 text-center py-12">لا يوجد أطباء</p>}
        </div>
        {doctorModal !== undefined && <DoctorModal doctor={doctorModal} branches={branches} onClose={() => setDoctorModal(undefined)} onSave={saveDoctor} />}
      </div>
    );
  };

  const renderServices = () => {
    const filtered = services.filter(s => !searchService || s.name.includes(searchService));
    return (
      <div>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h2 className="text-xl font-bold">إدارة الخدمات</h2>
          <div className="flex gap-3">
            <div className="relative"><MagnifyingGlassIcon className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" /><input className="border dark:border-gray-600 rounded-lg pr-9 pl-3 py-2 text-sm w-48 dark:bg-gray-800 dark:text-gray-100" placeholder="بحث..." value={searchService} onChange={e => setSearchService(e.target.value)} /></div>
            <button onClick={() => setServiceModal({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />إضافة خدمة</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => {
            const totalPkg = (s.packages || []).reduce((acc, p) => acc + p.sessions, 0);
            return (
              <div key={s.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 ${!s.isActive ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between mb-2">
                  <div><h3 className="font-bold">{s.name}</h3><p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{s.description || "—"}</p></div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${s.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>{s.isActive ? "نشط" : "غير نشط"}</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <span>{s.duration} دقيقة</span>
                  <span>{s.defaultPrice} ج.م</span>
                  {totalPkg > 0 && <span>باقة: {totalPkg} جلسة</span>}
                </div>
                {(s.packages || []).length > 0 && (
                  <div className="mb-3">
                    {s.packages!.map((pkg, i) => (
                      <div key={i} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 inline-block px-2 py-0.5 rounded ml-1 mb-1">{pkg.sessions} جلسات - {pkg.price} ج.م</div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setServiceModal(s)} className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"><PencilIcon className="w-3.5 h-3.5 inline ml-1" />تعديل</button>
                  <button onClick={() => toggleActive("services", s.id, s.isActive)} className={`text-xs px-3 py-1.5 rounded-lg ${s.isActive ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50" : "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50"}`}>{s.isActive ? "تعطيل" : "تفعيل"}</button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="col-span-full text-gray-400 dark:text-gray-500 text-center py-12">لا توجد خدمات</p>}
        </div>
        {serviceModal !== undefined && <ServiceModal service={serviceModal} onClose={() => setServiceModal(undefined)} onSave={saveService} />}
      </div>
    );
  };

  const renderAppointments = () => (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">المواعيد</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <select className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={filters.branchId} onChange={e => setFilters({ ...filters, branchId: e.target.value })}>
            <option value="">كل الفروع</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input type="date" className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} />
          <input type="date" className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} />
          <button onClick={() => setAppointmentModal({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />حجز موعد</button>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">{["العميل", "الهاتف", "الفرع", "التاريخ", "الوقت", "الحالة", ""].map(h => <th key={h} className="text-right py-3 px-4">{h}</th>)}</tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400 dark:text-gray-500">جاري التحميل...</td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400 dark:text-gray-500">لا توجد مواعيد</td></tr>
            ) : appointments.map(a => (
              <tr key={a.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                <td className="py-3 px-4 font-medium">{a.customerName}</td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{a.customerPhone}</td>
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
                        <button onClick={() => updateAppointmentStatus(a.id, "confirmed")} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded" title="تأكيد"><CheckIcon className="w-4 h-4" /></button>
                        <button onClick={() => updateAppointmentStatus(a.id, "cancelled")} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="إلغاء"><XMarkIcon className="w-4 h-4" /></button>
                      </>
                    )}
                    {a.status === "confirmed" && (
                      <button onClick={() => updateAppointmentStatus(a.id, "completed")} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="إتمام"><CheckIcon className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => setAppointmentModal(a)} className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded" title="عرض"><EyeIcon className="w-4 h-4" /></button>
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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-xl font-bold">{monthNames[month]} {year}</h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><ChevronRightIcon className="w-5 h-5" /></button>
            <button onClick={() => setCalDate(new Date())} className="px-3 py-1.5 text-sm border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300">اليوم</button>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><ChevronLeftIcon className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <div className="grid grid-cols-7 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            {dayNamesShort.map(d => <div key={d} className="text-center py-3 text-sm font-medium text-gray-500 dark:text-gray-400">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d, i) => (
              <div key={i} onClick={() => d.date && setSelectedDay(d.date === selectedDay ? null : d.date)}
                className={`min-h-[80px] p-2 border-b dark:border-gray-700 border-l cursor-pointer transition-colors
                  ${d.isToday ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                  ${d.date === selectedDay ? "ring-2 ring-blue-500 ring-inset" : ""}
                  ${!d.date ? "bg-gray-50 dark:bg-gray-800" : "hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                {d.date && (
                  <>
                    <span className={`text-sm font-medium ${d.isToday ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-200"}`}>{d.day}</span>
                    {d.hasAppts && (
                      <div className="mt-1 space-y-0.5">
                        {d.male > 0 && <div className="text-xs px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">{d.male} ذكر</div>}
                        {d.female > 0 && <div className="text-xs px-1 py-0.5 rounded bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300">{d.female} أنثى</div>}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        {selectedDay && (
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
            <h3 className="font-bold mb-3">مواعيد {selectedDay}</h3>
            {dayAppts.length === 0 ? (
              <p className="text-center py-12 text-gray-400 dark:text-gray-500">لا توجد مواعيد</p>
            ) : (
              <div className="space-y-2">
                {dayAppts.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${a.customerGender === "female" ? "bg-pink-500" : "bg-blue-500"}`}></span>
                      <div>
                        <p className="font-medium text-sm">{a.customerName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{a.startTime} - {a.serviceName || a.branchName}</p>
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
    <div className="p-4 md:p-6 lg:p-8 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">إدارة النظام الطبي</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-2xl">نظام إدارة المواعيد والخدمات الطبية</p>
      </div>
      <div className="mb-4">
        <select className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm w-64 dark:bg-gray-800 dark:text-gray-100" value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}>
          <option value="">كل الفروع</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {selectedBranchId && (
          <button onClick={() => setSelectedBranchId("")} className="mr-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700">إزالة الفلتر</button>
        )}
      </div>
      <div className="flex gap-2 mb-8 border-b dark:border-gray-700 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>
      {loading && activeTab !== "appointments" && activeTab !== "calendar" ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">جاري التحميل...</div>
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
