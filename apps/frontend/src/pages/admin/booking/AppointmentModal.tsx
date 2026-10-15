import { useState, useEffect, useMemo } from "react";
import { X, Search, ArrowRight, Calendar, User, Phone, Building2, Stethoscope, Edit3 } from "lucide-react";
import { BookingAppointment, BookingBranch, BookingDoctor, BookingService, BookingPatient, STATUS_MAP, fetchJson, api } from "./shared";

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
    <label className="block text-[11px] font-medium text-muted-foreground mb-0.5">{label}</label>
    <p className={`text-xs font-semibold text-foreground ${dir === "ltr" ? "dir-ltr text-left font-mono" : ""}`}>{value}</p>
  </div>
);

export default function AppointmentModal({ appointment, branches, branchDoctors, services, patients, onClose, onSave, onViewPatient }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<BookingAppointment>>({
    customerName: "", customerPhone: "", customerGender: "male",
    branchId: "", doctorId: "", serviceId: "", appointmentDate: "",
    startTime: "", notes: "", room: "", preparationNote: "", ...appointment,
  });
  const [slots, setSlots] = useState<{ startTime: string; endTime: string; available: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [showPatientResults, setShowPatientResults] = useState(false);

  const patientResults = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return patients.filter(p =>
      (p.firstName + " " + (p.lastName || "")).toLowerCase().includes(q) || (p.phone || "").includes(q)
    ).slice(0, 6);
  }, [patientSearch, patients]);

  const selectPatient = (p: BookingPatient) => {
    setForm(f => ({ ...f, patientId: p.id, customerName: `${p.firstName} ${p.lastName || ""}`.trim(), customerPhone: p.phone || f.customerPhone, customerGender: (p.gender as any) || f.customerGender, customerEmail: p.email || f.customerEmail, nationalId: p.nationalId, address: p.address }));
    setPatientSearch(""); setShowPatientResults(false);
  };

  const [phoneLookup, setPhoneLookup] = useState<BookingPatient | null>(null);
  const [phoneLookupChecked, setPhoneLookupChecked] = useState(false);
  const [phoneLookupIgnored, setPhoneLookupIgnored] = useState(false);

  useEffect(() => {
    const phone = (form.customerPhone || "").trim().replace(/[\s()-]/g, "");
    if (phone.length < 6) { setPhoneLookup(null); setPhoneLookupChecked(false); setPhoneLookupIgnored(false); return; }
    const found = patients.find(p => (p.phone || "").replace(/[\s()-]/g, "") === phone) || null;
    setPhoneLookup(found); setPhoneLookupChecked(true); setPhoneLookupIgnored(false);
  }, [form.customerPhone, patients]);

  const applyPhoneLookup = (p: BookingPatient) => {
    setForm(f => ({ ...f, patientId: p.id, customerName: `${p.firstName} ${p.lastName || ""}`.trim(), customerGender: (p.gender as any) || f.customerGender, customerEmail: p.email || f.customerEmail, nationalId: p.nationalId, address: p.address }));
    setPhoneLookupIgnored(true);
  };

  useEffect(() => {
    if (form.branchId && form.appointmentDate && form.serviceId) fetchSlots();
  }, [form.branchId, form.appointmentDate, form.serviceId]);

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
    ? services.filter(s => s.isActive && (s.branchServices?.some(bs => bs.branchId === form.branchId && bs.isActive) ?? true))
    : [];

  const selectedService = services.find(s => s.id === form.serviceId);
  const serviceDoctorIds = selectedService?.doctorServices?.map(ds => ds.doctorId) || [];
  let serviceDoctors = serviceDoctorIds.length > 0 ? doctors.filter(d => serviceDoctorIds.includes(d.id)) : doctors;
  if (form.doctorId && !serviceDoctors.some(d => d.id === form.doctorId)) {
    const current = branchDoctors.find(d => d.id === form.doctorId);
    if (current) serviceDoctors = [current, ...serviceDoctors];
  }

  const branchName = appointment?.branchName || branches.find(b => b.id === (appointment?.branchId || form.branchId))?.name || "";
  const serviceName = appointment?.serviceName || services.find(s => s.id === (appointment?.serviceId || form.serviceId))?.name || "";
  const doctorName = appointment?.doctorName || branchDoctors.find(d => d.id === (appointment?.doctorId || form.doctorId))?.name || "";

  const inputCls = "w-full bg-background border border-border/70 rounded-xl px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  if (appointment?.id && !isEditing) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
        <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-card-foreground animate-in fade-in-0 zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20"><Calendar className="w-5 h-5" /></div>
              <div>
                <h3 className="text-base font-semibold text-foreground tracking-tight">تفاصيل الموعد</h3>
                <p className="text-xs text-muted-foreground font-mono tabular-nums">#{appointment.id.slice(0, 8)}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-5 overflow-y-auto space-y-4 flex-1 text-sm">
            <div className="flex justify-center mb-1">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_MAP[appointment.status || ""]?.color || "bg-muted text-foreground"}`}>
                {STATUS_MAP[appointment.status || ""]?.label || appointment.status}
              </span>
            </div>
            <div className="p-3.5 bg-muted/20 border border-border/60 rounded-xl grid grid-cols-2 gap-3">
              <InfoBlock label="اسم العميل" value={appointment.customerName || "—"} />
              <InfoBlock label="رقم الهاتف" value={appointment.customerPhone || "—"} dir="ltr" />
              <InfoBlock label="النوع" value={appointment.customerGender === "female" ? "أنثى" : "ذكر"} />
              <InfoBlock label="المصدر" value={appointment.source || "dashboard"} />
            </div>
            <div className="p-3.5 bg-muted/20 border border-border/60 rounded-xl grid grid-cols-2 gap-3">
              <InfoBlock label="الفرع" value={branchName || "—"} />
              <InfoBlock label="الخدمة" value={serviceName || "—"} />
              <InfoBlock label="الطبيب المعالج" value={doctorName || "أي طبيب متاح"} />
              <InfoBlock label="مدة الكشف" value={`${appointment.duration || 30} دقيقة`} />
              <InfoBlock label="تاريخ الموعد" value={appointment.appointmentDate || "—"} />
              <InfoBlock label="توقيت الحجز" value={`${appointment.startTime} - ${appointment.endTime || "—"}`} />
            </div>
            {(appointment.paymentRequired || appointment.paymentStatus) && (
              <div className="p-3.5 bg-muted/20 border border-border/60 rounded-xl grid grid-cols-2 gap-3">
                <InfoBlock label="مطلوب دفع" value={appointment.paymentRequired ? "نعم" : "لا"} />
                <InfoBlock label="حالة الدفع" value={appointment.paymentStatus || "—"} />
              </div>
            )}
            {appointment.room && <InfoBlock label="الغرفة" value={appointment.room} />}
            {appointment.preparationNote && <InfoBlock label="ملاحظة التحضير" value={appointment.preparationNote} fullWidth />}
            {appointment.notes && <InfoBlock label="ملاحظات" value={appointment.notes} fullWidth />}
            {appointment.diagnosis && <InfoBlock label="التشخيص" value={appointment.diagnosis} fullWidth />}
            {appointment.treatmentPlan && <InfoBlock label="خطة العلاج" value={appointment.treatmentPlan} fullWidth />}
            {appointment.prescription && <InfoBlock label="الوصفة الطبية" value={appointment.prescription} fullWidth />}
            {appointment.followUpDate && <InfoBlock label="موعد المتابعة" value={String(appointment.followUpDate).split("T")[0] ?? ""} fullWidth />}
            <InfoBlock label="تاريخ الإنشاء" value={appointment.createdAt ? new Date(appointment.createdAt).toLocaleString("ar-EG") : "—"} fullWidth />
          </div>

          <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-border/60 bg-muted/20 shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-foreground border border-border/70 rounded-xl hover:bg-muted/50 transition-colors">إغلاق</button>
            <button onClick={() => { setIsEditing(true); setForm({ ...appointment }); }} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 shadow-xs transition-colors">
              <Edit3 className="w-3.5 h-3.5" /> تعديل الموعد
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isEditMode = isEditing || !appointment?.id;
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-card-foreground animate-in fade-in-0 zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20"><Calendar className="w-5 h-5" /></div>
            <div>
              <h3 className="text-base font-semibold text-foreground tracking-tight">{appointment?.id ? "تعديل الموعد" : "حجز موعد جديد"}</h3>
              <p className="text-xs text-muted-foreground">تسجيل موعد مريض واختيار الطبيب والوقت المتاح</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-sm">
          <div className="relative">
            <label className="block text-xs font-medium text-foreground mb-1">البحث عن مريض مسجل (اختياري)</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-muted-foreground" />
              <input className={`${inputCls} pr-9`} placeholder="ابحث بالاسم أو رقم الهاتف..." value={patientSearch} onChange={e => { setPatientSearch(e.target.value); setShowPatientResults(true); }} onFocus={() => setShowPatientResults(true)} />
            </div>
            {showPatientResults && patientResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-xl max-h-52 overflow-y-auto p-1 divide-y divide-border/40">
                {patientResults.map(p => (
                  <button key={p.id} type="button" onClick={() => selectPatient(p)} className="w-full text-right px-3 py-2 hover:bg-muted/50 rounded-lg flex items-center justify-between transition-colors">
                    <span className="text-xs font-medium text-foreground">{p.firstName} {p.lastName}</span>
                    <span className="text-xs font-mono text-muted-foreground" dir="ltr">{p.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">اسم العميل *</label>
              <input className={inputCls} value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">رقم الهاتف *</label>
              <input className={`${inputCls} font-mono`} dir="ltr" value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} />
            </div>
          </div>

          {phoneLookup && phoneLookupChecked && !phoneLookupIgnored && (
            <div className="flex items-center justify-between gap-3 bg-primary/10 border border-primary/20 rounded-xl p-3">
              <div className="text-xs">
                <span className="text-primary font-medium">تم العثور على مريض مسجل: {phoneLookup.firstName} {phoneLookup.lastName}</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">هل ترغب في استخدام بياناته المسجلة تلقائياً؟</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {onViewPatient && (
                  <button type="button" onClick={() => { onViewPatient(phoneLookup.id); }} className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted text-foreground border border-border/70 text-xs rounded-lg hover:bg-muted/80 transition-colors">
                    <ArrowRight className="w-3 h-3" /> ملفه
                  </button>
                )}
                <button type="button" onClick={() => applyPhoneLookup(phoneLookup)} className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded-lg hover:bg-primary/90 transition-colors">استخدام</button>
                <button type="button" onClick={() => setPhoneLookupIgnored(true)} className="px-2.5 py-1 border border-border/70 text-muted-foreground text-xs rounded-lg hover:bg-muted/40 transition-colors">تجاهل</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">البريد الإلكتروني</label>
              <input className={`${inputCls} font-mono`} dir="ltr" value={form.customerEmail || ""} onChange={e => setForm({ ...form, customerEmail: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">النوع</label>
              <select className={inputCls} value={form.customerGender} onChange={e => setForm({ ...form, customerGender: e.target.value as any })}>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">الرقم القومي (اختياري)</label>
              <input className={`${inputCls} font-mono`} dir="ltr" value={form.nationalId || ""} onChange={e => setForm({ ...form, nationalId: e.target.value })} placeholder="14 رقماً" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">العنوان</label>
              <input className={inputCls} value={form.address || ""} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="العنوان الكامل" />
            </div>
          </div>

          {branches.filter(b => b.isActive).length > 1 && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">الفرع *</label>
              <select className={inputCls} value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value, doctorId: "", serviceId: "" })}>
                <option value="">اختر الفرع</option>
                {branches.filter(b => b.isActive).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">الخدمة المطلوبة *</label>
              <select className={inputCls} value={form.serviceId} onChange={e => setForm({ ...form, serviceId: e.target.value, doctorId: "" })}>
                <option value="">اختر الخدمة</option>
                {branchServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">الطبيب المفضل</label>
              <select className={inputCls} value={form.doctorId || ""} onChange={e => setForm({ ...form, doctorId: e.target.value })}>
                <option value="">أي طبيب متاح</option>
                {serviceDoctors.map(d => <option key={d.id} value={d.id}>{d.title} {d.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">تاريخ الموعد *</label>
              <input type="date" className={`${inputCls} font-mono`} value={form.appointmentDate} onChange={e => setForm({ ...form, appointmentDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">مدة الكشف المتوقعة</label>
              <div className="border border-border/70 rounded-xl px-3 py-2 text-xs bg-muted/20 text-foreground font-mono tabular-nums">
                {(() => { const sel = services.find(s => s.id === form.serviceId); return sel?.durationMinutes ? `${sel.durationMinutes} دقيقة` : "—"; })()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">الغرفة (اختياري)</label>
              <input className={inputCls} value={form.room || ""} onChange={e => setForm({ ...form, room: e.target.value })} placeholder="مثال: غرفة 3" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">ملاحظة التحضير (اختياري)</label>
              <input className={inputCls} value={form.preparationNote || ""} onChange={e => setForm({ ...form, preparationNote: e.target.value })} placeholder="مثال: صيام 6 ساعات" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">الوقت والموعد المتاح *</label>
            {loadingSlots ? (
              <p className="text-xs text-muted-foreground py-2">جارٍ تحميل المواعيد المتاحة...</p>
            ) : !form.appointmentDate || !form.branchId || !form.serviceId ? (
              <p className="text-xs text-muted-foreground py-2">يرجى تحديد الفرع والخدمة والتاريخ أولاً لعرض الأوقات المتاحة.</p>
            ) : slots.length === 0 ? (
              <p className="text-xs text-destructive py-2">لا توجد أوقات متاحة لهذا اليوم.</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-36 overflow-y-auto p-2 border border-border/70 rounded-xl bg-muted/20 font-mono tabular-nums">
                {slots.map(s => (
                  <button
                    key={s.startTime}
                    type="button"
                    disabled={!s.available}
                    onClick={() => setForm({ ...form, startTime: s.startTime })}
                    className={`px-2 py-1.5 text-xs font-medium rounded-lg border text-center transition-all ${
                      !s.available
                        ? "bg-muted/40 text-muted-foreground/40 border-border/40 cursor-not-allowed line-through"
                        : form.startTime === s.startTime
                        ? "bg-primary border-primary text-primary-foreground shadow-xs"
                        : "bg-background border-border/70 text-foreground hover:border-primary/60 hover:bg-muted/30"
                    }`}
                  >
                    {s.startTime}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isEditMode && (
            <div className="space-y-3 border-t border-border/60 pt-3.5">
              <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-primary" /> السجل الطبي للكشف
              </h4>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">التشخيص</label>
                <textarea className={inputCls} rows={2} value={form.diagnosis || ""} onChange={e => setForm({ ...form, diagnosis: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">خطة العلاج</label>
                <textarea className={inputCls} rows={2} value={form.treatmentPlan || ""} onChange={e => setForm({ ...form, treatmentPlan: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">الوصفة الطبية</label>
                <textarea className={inputCls} rows={2} value={form.prescription || ""} onChange={e => setForm({ ...form, prescription: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">موعد المتابعة القادم</label>
                <input type="date" className={`${inputCls} font-mono`} value={form.followUpDate ? String(form.followUpDate).split("T")[0] : ""} onChange={e => setForm({ ...form, followUpDate: e.target.value })} />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">ملاحظات إضافية</label>
            <textarea className={inputCls} rows={2} placeholder="ملاحظات إضافية عن المريض أو الموعد..." value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-border/60 bg-muted/20 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-foreground border border-border/70 rounded-xl hover:bg-muted/50 transition-colors">إلغاء</button>
          <button onClick={() => onSave(form)} disabled={!form.customerName || !form.branchId || !form.appointmentDate || !form.startTime} className="px-5 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 shadow-xs transition-colors disabled:opacity-50">
            {appointment?.id ? "حفظ التعديلات" : "تأكيد الحجز"}
          </button>
        </div>
      </div>
    </div>
  );
}
