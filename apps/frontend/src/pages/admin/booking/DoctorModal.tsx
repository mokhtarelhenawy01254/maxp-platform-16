import { useState } from "react";
import { X, UserCheck, Stethoscope, Building2, Phone, Mail, DollarSign, Percent, Check } from "lucide-react";
import { BookingDoctor, BookingBranch, BookingService } from "./shared";

interface Props {
  doctor?: Partial<BookingDoctor> | null;
  branches: BookingBranch[];
  services?: BookingService[];
  onClose: () => void;
  onSave: (d: Partial<BookingDoctor>) => Promise<void>;
}

export default function DoctorModal({ doctor, branches, services = [], onClose, onSave }: Props) {
  const [form, setForm] = useState({
    title: "دكتور", name: "", branchId: "", specialty: "",
    phone: "", email: "", password: "", consultationFee: "",
    commissionRate: "", isActive: true, ...doctor
  });
  const [serviceIds, setServiceIds] = useState<string[]>(doctor?.serviceIds || []);

  const toggleService = (serviceId: string) => {
    setServiceIds(prev => prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]);
  };

  const inputCls = "w-full bg-background border border-border/70 rounded-xl px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden text-card-foreground animate-in fade-in-0 zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground tracking-tight">{doctor?.id ? "تعديل بيانات الطبيب" : "إضافة طبيب جديد"}</h3>
              <p className="text-xs text-muted-foreground">التخصص، الفرع التابع، الرسوم، والخدمات المقدمة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-sm">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">اللقب</label>
              <input className={inputCls} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-foreground mb-1">اسم الطبيب *</label>
              <input className={inputCls} placeholder="مثال: أحمد محمود" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">الفرع التابع له *</label>
            <select className={inputCls} value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })}>
              <option value="">اختر الفرع</option>
              {branches.filter(b => b.isActive).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">التخصص الدقيق</label>
              <input className={inputCls} placeholder="مثال: زراعة وتقويم أسنان" value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">رقم الهاتف</label>
              <input className={`${inputCls} font-mono`} dir="ltr" placeholder="010xxxxxxxx" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">رسوم الكشف الافتراضية</label>
              <input type="number" className={`${inputCls} font-mono tabular-nums`} placeholder="0" value={form.consultationFee} onChange={e => setForm({ ...form, consultationFee: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">نسبة عمولة الطبيب %</label>
              <input type="number" className={`${inputCls} font-mono tabular-nums`} placeholder="مثال: 15" value={form.commissionRate} onChange={e => setForm({ ...form, commissionRate: e.target.value })} />
            </div>
          </div>

          <div className="p-3.5 bg-muted/20 border border-border/60 rounded-xl space-y-3">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-primary" /> بيانات تسجيل دخول بوابة الطبيب
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">البريد الإلكتروني</label>
                <input className={`${inputCls} font-mono`} dir="ltr" placeholder="doctor@clinic.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">
                  {doctor?.id ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"}
                </label>
                <input type="password" className={`${inputCls} font-mono`} dir="ltr" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">الخدمات والإجراءات التي يقدمها</label>
              <span className="text-[11px] text-muted-foreground font-mono tabular-nums">{serviceIds.length} محددة</span>
            </div>
            {services.filter(s => s.isActive).length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">لا توجد خدمات متاحة حالياً. أضف الخدمات أولاً من تبويب الخدمات.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto border border-border/60 rounded-xl p-2.5 bg-muted/10">
                {services.filter(s => s.isActive).map(s => {
                  const checked = serviceIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleService(s.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                        checked
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-background border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      <span>{s.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-border/60 bg-muted/20 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-foreground border border-border/70 rounded-xl hover:bg-muted/50 transition-colors">
            إلغاء
          </button>
          <button
            onClick={() => {
              if (!form.name?.trim() || !form.branchId) return;
              onSave({
                ...form,
                consultationFee: form.consultationFee ? Number(form.consultationFee) : undefined,
                commissionRate: form.commissionRate ? Number(form.commissionRate) : undefined,
                password: form.password || undefined,
                serviceIds,
              });
            }}
            disabled={!form.name?.trim() || !form.branchId}
            className="px-5 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 shadow-xs transition-colors disabled:opacity-50"
          >
            {doctor?.id ? "حفظ التعديلات" : "إضافة الطبيب"}
          </button>
        </div>
      </div>
    </div>
  );
}
