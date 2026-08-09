import { useState, useEffect, useMemo } from "react";
import { XMarkIcon, MagnifyingGlassIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import {
  BookingAppointment, BookingBranch, BookingDoctor, BookingService, BookingPatient,
  STATUS_MAP, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, fetchJson, api
} from "./shared";

interface Props {
  appointment?: Partial<BookingAppointment> | null;
  branches: BookingBranch[];
  branchDoctors: BookingDoctor[];
  services: BookingService[];
  patients: BookingPatient[];
  onClose: () => void;
  onSave: (d: Partial<BookingAppointment>) => Promise<void>;
  onViewPatient?: (patientId: string) => void;
}

const InfoBlock = ({ label, value, dir, fullWidth }: { label: string; value: string; dir?: string; fullWidth?: boolean }) => (
  <div className={fullWidth ? "col-span-2" : ""}>
    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">{label}</label>
    <p className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${dir === "ltr" ? "dir-ltr text-left" : ""}`}>{value}</p>
  </div>
);

export default function AppointmentModal({ appointment, branches, branchDoctors, services, patients, onClose, onSave, onViewPatient }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<BookingAppointment>>({
    customerName: "", customerPhone: "", customerGender: "male",
    branchId: "", doctorId: "", serviceId: "",
    appointmentDate: "", startTime: "", notes: "",
    room: "", preparationNote: "",
    ...appointment,
  });
  const [slots, setSlots] = useState<{ startTime: string; endTime: string; available: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [showPatientResults, setShowPatientResults] = useState(false);

  const patientResults = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return patients.filter(p =>
      (p.firstName + " " + (p.lastName || "")).toLowerCase().includes(q) ||
      (p.phone || "").includes(q)
    ).slice(0, 6);
  }, [patientSearch, patients]);

  const selectPatient = (p: BookingPatient) => {
    setForm(f => ({ ...f, patientId: p.id, customerName: `${p.firstName} ${p.lastName || ""}`.trim(), customerPhone: p.phone || f.customerPhone, customerGender: (p.gender as any) || f.customerGender, customerEmail: p.email || f.customerEmail, nationalId: p.nationalId, address: p.address }));
    setPatientSearch("");
    setShowPatientResults(false);
  };

  // Auto-lookup: when the user types a phone number in the phone field, find a matching existing patient and offer autofill
  const [phoneLookup, setPhoneLookup] = useState<BookingPatient | null>(null);
  const [phoneLookupChecked, setPhoneLookupChecked] = useState(false);
  const [phoneLookupIgnored, setPhoneLookupIgnored] = useState(false);

  useEffect(() => {
    const phone = (form.customerPhone || "").trim().replace(/[\s()-]/g, "");
    if (phone.length < 6) { setPhoneLookup(null); setPhoneLookupChecked(false); setPhoneLookupIgnored(false); return; }
    const found = patients.find(p => (p.phone || "").replace(/[\s()-]/g, "") === phone) || null;
    setPhoneLookup(found);
    setPhoneLookupChecked(true);
    setPhoneLookupIgnored(false);
  }, [form.customerPhone, patients]);

  const applyPhoneLookup = (p: BookingPatient) => {
    setForm(f => ({ ...f, patientId: p.id, customerName: `${p.firstName} ${p.lastName || ""}`.trim(), customerGender: (p.gender as any) || f.customerGender, customerEmail: p.email || f.customerEmail, nationalId: p.nationalId, address: p.address }));
    setPhoneLookupIgnored(true);
  };

  useEffect(() => {
    if (form.branchId && form.appointmentDate && form.serviceId) {
      fetchSlots();
    }
  }, [form.branchId, form.appointmentDate, form.serviceId]);

  // Auto-select the branch when only one active branch exists
  useEffect(() => {
    const active = branches.filter((b): b is BookingBranch => b.isActive);
    if (active.length === 1 && !form.branchId) {
      const single = active[0];
      if (single) setForm(f => ({ ...f, branchId: single.id }));
    }
  }, [branches, form.branchId]);

  const fetchSlots = async () => {
    setLoadingSlots(true);
    const sel = services.find(s => s.id === form.serviceId);
    const duration = sel?.durationMinutes || 30;
    const params = new URLSearchParams({
      branchId: form.branchId!, date: form.appointmentDate!,
      serviceId: form.serviceId!, duration: String(duration),
    });
    try {
      const data = await fetchJson<{ startTime: string; endTime: string; available: boolean }[]>(api(`appointments/available-slots?${params}`));
      setSlots(Array.isArray(data) ? data : []);
    } catch (e) { console.error("fetchSlots", e); setSlots([]); } finally { setLoadingSlots(false); }
  };

  const doctors = branchDoctors.filter(d => d.branchId === form.branchId && d.isActive);

  const branchServices = form.branchId
    ? services.filter(s => s.isActive && s.branchServices.some(bs => bs.branchId === form.branchId && bs.isActive))
    : [];

  const selectedService = services.find(s => s.id === form.serviceId);
  const serviceDoctorIds = selectedService?.doctorServices?.map(ds => ds.doctorId) || [];
  let serviceDoctors = serviceDoctorIds.length > 0
    ? doctors.filter(d => serviceDoctorIds.includes(d.id))
    : doctors;
  // Always include the currently-assigned doctor when editing (legacy appointments may have an unlinked doctor)
  if (form.doctorId && !serviceDoctors.some(d => d.id === form.doctorId)) {
    const current = branchDoctors.find(d => d.id === form.doctorId);
    if (current) serviceDoctors = [current, ...serviceDoctors];
  }

  const branchName = appointment?.branchName || branches.find(b => b.id === (appointment?.branchId || form.branchId))?.name || "";
  const serviceName = appointment?.serviceName || services.find(s => s.id === (appointment?.serviceId || form.serviceId))?.name || "";
  const doctorName = appointment?.doctorName || branchDoctors.find(d => d.id === (appointment?.doctorId || form.doctorId))?.name || "";

  // Detail view for existing appointments (not editing)
  if (appointment?.id && !isEditing) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
        <div className={`${MODAL_CONTENT_CLS} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">تفاصيل الموعد</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
          </div>
          <div className="space-y-4">
            <div className="flex justify-center mb-2">
              <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${STATUS_MAP[appointment.status || ""]?.color || ""}`}>
                {STATUS_MAP[appointment.status || ""]?.label || appointment.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InfoBlock label="العميل" value={appointment.customerName} />
              <InfoBlock label="الهاتف" value={appointment.customerPhone || "—"} dir="ltr" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InfoBlock label="الجنس" value={appointment.customerGender === "female" ? "أنثى" : "ذكر"} />
              <InfoBlock label="المصدر" value={appointment.source || "dashboard"} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InfoBlock label="الفرع" value={branchName} />
              <InfoBlock label="الخدمة" value={serviceName || "—"} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InfoBlock label="الطبيب" value={doctorName || "أي طبيب"} />
              <InfoBlock label="المدة" value={`${appointment.duration || 30} دقيقة`} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InfoBlock label="التاريخ" value={appointment.appointmentDate} />
              <InfoBlock label="الوقت" value={`${appointment.startTime} - ${appointment.endTime || "—"}`} />
            </div>
            {(appointment.paymentRequired || appointment.paymentStatus) && (
              <div className="grid grid-cols-2 gap-4">
                <InfoBlock label="مطلوب دفع" value={appointment.paymentRequired ? "نعم" : "لا"} />
                <InfoBlock label="حالة الدفع" value={appointment.paymentStatus || "—"} />
              </div>
            )}
            {appointment.room && <InfoBlock label="الغرفة" value={appointment.room} />}
            {appointment.preparationNote && <InfoBlock label="ملاحظة التحضير" value={appointment.preparationNote} fullWidth />}
            {appointment.notes && <InfoBlock label="ملاحظات" value={appointment.notes} fullWidth />}
            {appointment.diagnosis && <InfoBlock label="التشخيص" value={appointment.diagnosis} fullWidth />}
            {appointment.treatmentPlan && <InfoBlock label="خطة العلاج" value={appointment.treatmentPlan} fullWidth />}
            {appointment.prescription && <InfoBlock label="الوصفة" value={appointment.prescription} fullWidth />}
            {appointment.followUpDate && <InfoBlock label="موعد المتابعة" value={(String(appointment.followUpDate).split("T")[0] ?? "")} fullWidth />}
            <InfoBlock label="تاريخ الإنشاء" value={appointment.createdAt ? new Date(appointment.createdAt).toLocaleString("ar-EG") : "—"} fullWidth />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => { setIsEditing(true); setForm({ ...appointment }); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">تعديل</button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">إغلاق</button>
          </div>
        </div>
      </div>
    );
  }

  // Create / Edit form
  const isEditMode = isEditing || !appointment?.id;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className={`${MODAL_CONTENT_CLS} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">حجز موعد</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">البحث عن مريض (اختياري)</label>
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" />
              <input className={`${MODAL_INPUT_CLS} pr-9`} placeholder="ابحث بالاسم أو رقم الهاتف..." value={patientSearch} onChange={e => { setPatientSearch(e.target.value); setShowPatientResults(true); }} onFocus={() => setShowPatientResults(true)} />
            </div>
            {showPatientResults && patientResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                {patientResults.map(p => (
                  <button key={p.id} type="button" onClick={() => selectPatient(p)} className="w-full text-right px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between">
                    <span className="text-sm">{p.firstName} {p.lastName}</span>
                    <span className="text-xs text-gray-400" dir="ltr">{p.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم العميل</label><input className={MODAL_INPUT_CLS} value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الهاتف</label><input className={MODAL_INPUT_CLS} dir="ltr" value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} /></div>
          </div>
          {phoneLookup && phoneLookupChecked && !phoneLookupIgnored && (
            <div className="flex items-center justify-between gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
              <div className="text-sm">
                <span className="text-blue-700 dark:text-blue-300 font-medium">تم العثور على عميل: {phoneLookup.firstName} {phoneLookup.lastName}</span>
                <div className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">استخدام بياناته المسجلة تلقائياً؟</div>
              </div>
              <div className="flex gap-2 shrink-0">
                {onViewPatient && (
                  <button type="button" onClick={() => { onViewPatient(phoneLookup.id); }} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50"><ArrowRightIcon className="w-3 h-3 inline ml-1" />فتح ملفه</button>
                )}
                <button type="button" onClick={() => applyPhoneLookup(phoneLookup)} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">استخدام</button>
                <button type="button" onClick={() => setPhoneLookupIgnored(true)} className="px-3 py-1.5 border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-300 text-xs rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30">إلغاء</button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني</label><input className={MODAL_INPUT_CLS} dir="ltr" value={form.customerEmail || ""} onChange={e => setForm({ ...form, customerEmail: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الجنس</label>
            <select className={MODAL_INPUT_CLS} value={form.customerGender} onChange={e => setForm({ ...form, customerGender: e.target.value })}>
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الرقم القومي (اختياري)</label><input className={MODAL_INPUT_CLS} dir="ltr" value={form.nationalId || ""} onChange={e => setForm({ ...form, nationalId: e.target.value })} placeholder="14 رقماً" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان</label><input className={MODAL_INPUT_CLS} value={form.address || ""} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="العنوان الكامل" /></div>
          </div>
          {branches.filter(b => b.isActive).length > 1 && (
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الفرع</label>
              <select className={MODAL_INPUT_CLS} value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value, doctorId: "", serviceId: "" })}>
                <option value="">اختر الفرع</option>
                {branches.filter(b => b.isActive).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الخدمة</label>
              <select className={MODAL_INPUT_CLS} value={form.serviceId} onChange={e => setForm({ ...form, serviceId: e.target.value, doctorId: "" })}>
                <option value="">اختر الخدمة</option>
                {branchServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الطبيب</label>
              <select className={MODAL_INPUT_CLS} value={form.doctorId || ""} onChange={e => setForm({ ...form, doctorId: e.target.value })}>
                <option value="">أي طبيب</option>
                {serviceDoctors.map(d => <option key={d.id} value={d.id}>{d.title} {d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">التاريخ</label><input type="date" className={MODAL_INPUT_CLS} value={form.appointmentDate} onChange={e => setForm({ ...form, appointmentDate: e.target.value })} /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مدة الموعد</label>
              <div className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                {(() => { const sel = services.find(s => s.id === form.serviceId); return sel?.durationMinutes ? `${sel.durationMinutes} دقيقة` : "—"; })()}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الغرفة (اختياري)</label><input className={MODAL_INPUT_CLS} value={form.room || ""} onChange={e => setForm({ ...form, room: e.target.value })} placeholder="مثال: غرفة 3" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظة التحضير (اختياري)</label><input className={MODAL_INPUT_CLS} value={form.preparationNote || ""} onChange={e => setForm({ ...form, preparationNote: e.target.value })} placeholder="مثال: صيام 6 ساعات" /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الوقت المتاح</label>
            {loadingSlots ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-2">جاري تحميل الأوقات المتاحة...</p>
            ) : !form.appointmentDate || !form.branchId || !form.serviceId ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-2">يرجى تحديد الفرع والخدمة والتاريخ أولاً لعرض الأوقات المتاحة.</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-red-500 dark:text-red-400 py-2">لا توجد أوقات متاحة لهذا اليوم.</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-36 overflow-y-auto p-2 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/40">
                {slots.map(s => (
                  <button
                    key={s.startTime}
                    type="button"
                    disabled={!s.available}
                    onClick={() => setForm({ ...form, startTime: s.startTime })}
                    className={`px-2 py-1.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                      !s.available
                        ? "bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed line-through"
                        : form.startTime === s.startTime
                        ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-gray-200 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/30"
                    }`}
                  >
                    {s.startTime}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isEditMode && (
            <div className="space-y-4 border-t dark:border-gray-700 pt-4">
              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">السجل الطبي</h4>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">التشخيص</label><textarea className={MODAL_INPUT_CLS} rows={2} value={form.diagnosis || ""} onChange={e => setForm({ ...form, diagnosis: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">خطة العلاج</label><textarea className={MODAL_INPUT_CLS} rows={2} value={form.treatmentPlan || ""} onChange={e => setForm({ ...form, treatmentPlan: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصفة</label><textarea className={MODAL_INPUT_CLS} rows={2} value={form.prescription || ""} onChange={e => setForm({ ...form, prescription: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">موعد المتابعة</label><input type="date" className={MODAL_INPUT_CLS} value={form.followUpDate ? String(form.followUpDate).split("T")[0] : ""} onChange={e => setForm({ ...form, followUpDate: e.target.value })} /></div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
            <textarea className={MODAL_INPUT_CLS} rows={2} placeholder="ملاحظات إضافية عن المريض أو الموعد..." value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>

        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
          <button onClick={() => onSave(form)} disabled={!form.customerName || !form.branchId || !form.appointmentDate || !form.startTime} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">حجز</button>
        </div>
      </div>
    </div>
  );
}
