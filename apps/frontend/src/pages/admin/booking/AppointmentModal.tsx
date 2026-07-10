import { useState, useEffect } from "react";
import { XMarkIcon, EyeIcon, CheckIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  BookingAppointment, BookingBranch, BookingDoctor, BookingService,
  STATUS_MAP, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, fetchJson, api
} from "./shared";

interface Props {
  appointment?: Partial<BookingAppointment> | null;
  branches: BookingBranch[];
  branchDoctors: BookingDoctor[];
  services: BookingService[];
  onClose: () => void;
  onSave: (d: Partial<BookingAppointment>) => Promise<void>;
}

const InfoBlock = ({ label, value, dir, fullWidth }: { label: string; value: string; dir?: string; fullWidth?: boolean }) => (
  <div className={fullWidth ? "col-span-2" : ""}>
    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">{label}</label>
    <p className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${dir === "ltr" ? "dir-ltr text-left" : ""}`}>{value}</p>
  </div>
);

export default function AppointmentModal({ appointment, branches, branchDoctors, services, onClose, onSave }: Props) {
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
    const params = new URLSearchParams({
      branchId: form.branchId!, date: form.appointmentDate!,
      serviceId: form.serviceId!, duration: "30",
    });
    try {
      const data = await fetchJson(api(`appointments/available-slots?${params}`));
      setSlots(Array.isArray(data) ? data : []);
    } catch (e) { console.error("fetchSlots", e); setSlots([]); } finally { setLoadingSlots(false); }
  };

  const doctors = branchDoctors.filter(d => d.branchId === form.branchId && d.isActive);

  const branchName = appointment?.branchName || branches.find(b => b.id === (appointment?.branchId || form.branchId))?.name || "";
  const serviceName = appointment?.serviceName || services.find(s => s.id === (appointment?.serviceId || form.serviceId))?.name || "";
  const doctorName = appointment?.doctorName || branchDoctors.find(d => d.id === (appointment?.doctorId || form.doctorId))?.name || "";

  // Detail view for existing appointments
  if (appointment?.id) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
            {appointment.notes && <InfoBlock label="ملاحظات" value={appointment.notes} fullWidth />}
            <InfoBlock label="تاريخ الإنشاء" value={appointment.createdAt ? new Date(appointment.createdAt).toLocaleString("ar-EG") : "—"} fullWidth />
          </div>
          <div className="flex justify-end mt-6">
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">إغلاق</button>
          </div>
        </div>
      </div>
    );
  }

  // Create form
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">حجز موعد</h3>
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
            <>
              {appointment.createdByName && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">المسجل: </span>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${appointment.createdByType === 'ai_service' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                    <span>{appointment.createdByType === 'ai_service' ? 'أجنت' : 'موظف'}</span>
                    <span>{appointment.createdByName}</span>
                  </span>
                </div>
              )}
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label><textarea className={MODAL_INPUT_CLS} rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
          <button onClick={() => onSave(form)} disabled={!form.customerName || !form.branchId || !form.appointmentDate || !form.startTime} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">حجز</button>
        </div>
      </div>
    </div>
  );
}
