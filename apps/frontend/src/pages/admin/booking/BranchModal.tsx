import { useState } from "react";
import { X, Trash2, Camera, Building2, MapPin, Phone, Calendar, Clock, Plus } from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../../utils/i18n-toast";
import { BookingBranch, BranchFormData, DAYS, DAY_NAMES, FACILITY_TYPES } from "./shared";

const compressImage = (file: File, maxW = 1200, quality = 0.8): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxW) { height = (height * maxW) / width; width = maxW; }
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error("فشل تحميل الصورة")); };
    img.src = URL.createObjectURL(file);
  });

interface Props {
  branch?: Partial<BookingBranch> | null;
  onClose: () => void;
  onSave: (d: BranchFormData) => Promise<void>;
}

const tryParseGenderDays = (v: unknown): { male: string[]; female: string[] } | null => {
  if (!v) return null;
  const obj = typeof v === "string" ? (() => { try { return JSON.parse(v); } catch { return null; } })() : v;
  if (!obj || typeof obj !== "object") return null;
  return { male: (obj as any).male || [], female: (obj as any).female || [] };
};

export default function BranchModal({ branch, onClose, onSave }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const parseBranchWorkingDays = (): { list: string[]; hours: Record<string, { start: string; end: string }> } => {
    const wd = branch?.workingDays;
    if (wd && typeof wd === "object") {
      const obj = wd as Record<string, string>;
      const dayKeys = Object.keys(obj).filter(k => obj[k]);
      const hours: Record<string, { start: string; end: string }> = {};
      dayKeys.forEach(k => {
        const [s, e] = (obj[k] || "").split("-");
        hours[k] = { start: s || "09:00", end: e || "22:00" };
      });
      return { list: dayKeys, hours };
    }
    return { list: [], hours: {} };
  };

  const initForm = () => {
    const { list: savedDays, hours } = parseBranchWorkingDays();
    const defaults = {
      name: "", address: "", phones: [] as string[], workingDays: "sat,mon,wed",
      workStart: "09:00", workEnd: "22:00", dayHours: {} as Record<string, { start: string; end: string }>,
      maleDays: [] as string[], femaleDays: [] as string[], isActive: true,
      maxBookingsPerSlot: 1, facilityType: "clinic"
    };
    let initialPhones = (branch?.phones || []).filter(Boolean);
    if (initialPhones.length === 0 && branch?.phone) initialPhones = [branch.phone];
    const workingDays = savedDays.length > 0 ? savedDays.join(",") : defaults.workingDays;
    const dayHours: Record<string, { start: string; end: string }> = { ...hours };
    workingDays.split(",").filter(Boolean).forEach(d => { if (!dayHours[d]) dayHours[d] = { start: "09:00", end: "22:00" }; });
    const gd = tryParseGenderDays(branch?.genderDays);
    return {
      ...defaults, ...branch,
      workingDays, dayHours, phones: initialPhones,
      maleDays: gd?.male || [], femaleDays: gd?.female || [],
      facilityType: branch?.facilityType || defaults.facilityType,
    };
  };

  const [form, setForm] = useState<BranchFormData>(() => initForm() as unknown as BranchFormData);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "الاسم مطلوب";
    if (!form.address.trim()) e.address = "العنوان مطلوب";
    if (!(form.workingDays || "").split(",").filter(Boolean).length) e.workingDays = "اختر يوم عمل على الأقل";
    for (const day of (form.workingDays || "").split(",").filter(Boolean)) {
      const h = form.dayHours[day];
      if (!h || !h.start || !h.end) { e.workingDays = `حدد وقت العمل ليوم ${DAY_NAMES[day] || day}`; break; }
      if (h.start >= h.end) { e.workingDays = `وقت النهاية يجب أن يكون بعد البداية ليوم ${DAY_NAMES[day] || day}`; break; }
    }
    const validPhones = (form.phones || []).map(p => p.trim()).filter(Boolean);
    const phoneRegex = /^[0-9+\-\s]+$/;
    for (const p of validPhones) {
      if (!phoneRegex.test(p)) {
        e.phones = "يرجى إدخال أرقام هواتف صالحة فقط (أرقام، مسافات، علامة + أو -)";
        break;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const toggleWorkingDay = (d: string) => {
    const current = ((form.workingDays as string) || "").split(",").filter(Boolean);
    const dayHours = { ...form.dayHours };
    const next = current.includes(d) ? current.filter((x: string) => x !== d) : [...current, d];
    if (!next.includes(d)) delete dayHours[d];
    else dayHours[d] = { start: form.workStart, end: form.workEnd };
    setForm({ ...form, workingDays: next.join(","), dayHours });
  };

  const applyToAllDays = () => {
    const dayHours = { ...form.dayHours };
    ((form.workingDays as string) || "").split(",").filter(Boolean).forEach(d => { dayHours[d] = { start: form.workStart, end: form.workEnd }; });
    setForm({ ...form, dayHours });
  };

  const setDayHour = (d: string, field: "start" | "end", value: string) => {
    setForm({ ...form, dayHours: { ...form.dayHours, [d]: { ...(form.dayHours[d] || { start: "09:00", end: "22:00" }), [field]: value } } });
  };

  const toggleGenderDay = (type: "male" | "female", d: string) => {
    const key = type === "male" ? "maleDays" : "femaleDays";
    const current = form[key] || [];
    const next = current.includes(d) ? current.filter((x: string) => x !== d) : [...current, d];
    setForm({ ...form, [key]: next });
  };

  const inputCls = "w-full bg-background border border-border/70 rounded-xl px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-card-foreground animate-in fade-in-0 zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground tracking-tight">{branch?.id ? "تعديل بيانات الفرع" : "إضافة فرع جديد"}</h3>
              <p className="text-xs text-muted-foreground">إدارة العنوان، المواعيد، وتفاصيل العمل بالفرع</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-sm">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">اسم الفرع *</label>
            <input className={inputCls} placeholder="مثال: فرع التجمع الخامس" value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); if (errors.name) setErrors({ ...errors, name: "" }); }} />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">نوع المنشأة</label>
            <select className={inputCls} value={form.facilityType} onChange={e => setForm({ ...form, facilityType: e.target.value })}>
              {FACILITY_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">العنوان بالتفصيل *</label>
            <textarea className={inputCls} rows={2} placeholder="مثال: ١٢ شارع النيل، الدور الثالث، بجوار الصيدلية" value={form.address || ""} onChange={e => { setForm({ ...form, address: e.target.value }); if (errors.address) setErrors({ ...errors, address: "" }); }} />
            {errors.address && <p className="text-xs text-destructive mt-1">{errors.address}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">رابط الموقع الجغرافي (خرائط Google)</label>
            <input className={inputCls} placeholder="رابط الخريطة أو الإحداثيات" value={form.location || ""} onChange={e => setForm({ ...form, location: e.target.value })} />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">صورة علامة مميزة للفرع</label>
            <div className="relative border-2 border-dashed border-border/80 rounded-xl p-4 text-center hover:bg-muted/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 group">
              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) { tToast.error("BranchModal.msg_d137"); return; }
                if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { tToast.error("BranchModal.msg_b798"); return; }
                try { setForm({ ...form, landmarkImage: await compressImage(file) }); }
                catch { tToast.error("BranchModal.msg_6f5e"); }
              }} />
              <div className="p-2.5 rounded-full bg-muted text-muted-foreground group-hover:text-primary transition-colors">
                <Camera className="w-5 h-5 stroke-[1.75]" />
              </div>
              <span className="text-xs font-medium text-primary">انقر هنا لاختيار صورة</span>
              <span className="text-[11px] text-muted-foreground font-mono tabular-nums">الحد الأقصى 2MB (JPG / PNG / WEBP)</span>
            </div>
            {form.landmarkImage && (
              <div className="mt-3 relative inline-block">
                <img src={form.landmarkImage} className="h-20 w-20 object-cover rounded-xl border border-border shadow-xs" alt="علامة مميزة" />
                <button type="button" onClick={() => setForm({ ...form, landmarkImage: undefined })} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center shadow hover:opacity-90 transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">أرقام هواتف الفرع</label>
            <div className="space-y-2">
              {(form.phones || []).map((p: string, i: number) => (
                <div key={i} className="flex gap-2">
                  <input className={`${inputCls} flex-1 font-mono`} dir="ltr" placeholder="010xxxxxxxx" value={p} onChange={e => {
                    const next = [...(form.phones || [])];
                    next[i] = e.target.value;
                    setForm({ ...form, phones: next });
                    if (errors.phones) setErrors({ ...errors, phones: "" });
                  }} />
                  <button type="button" onClick={() => setForm({ ...form, phones: (form.phones || []).filter((_, idx) => idx !== i) })} className="p-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors" title="حذف الرقم">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setForm({ ...form, phones: [...(form.phones || []), ""] })} className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
                <Plus className="w-3.5 h-3.5" /> إضافة رقم هاتف آخر
              </button>
              {errors.phones && <p className="text-xs text-destructive mt-1">{errors.phones}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">أيام العمل المتاحة</label>
            {errors.workingDays && <p className="text-xs text-destructive mb-1.5">{errors.workingDays}</p>}
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map(d => {
                const isSelected = (form.workingDays || "").split(",").includes(d.value);
                return (
                  <button type="button" key={d.value} onClick={() => toggleWorkingDay(d.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 bg-muted/20 border border-border/60 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">ساعات العمل الافتراضية</label>
              <button type="button" onClick={applyToAllDays} className="text-xs text-primary font-medium hover:underline">
                تطبيق على كل الأيام
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">بداية العمل</label>
                <input type="time" className={`${inputCls} font-mono`} value={form.workStart} onChange={e => setForm({ ...form, workStart: e.target.value })} />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">نهاية العمل</label>
                <input type="time" className={`${inputCls} font-mono`} value={form.workEnd} onChange={e => setForm({ ...form, workEnd: e.target.value })} />
              </div>
            </div>
          </div>

          {(form.workingDays || "").split(",").filter(Boolean).length > 0 && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">توقيت مخصص لكل يوم عمل</label>
              <div className="space-y-1.5">
                {(form.workingDays || "").split(",").filter(Boolean).map(day => (
                  <div key={day} className="flex items-center gap-2 p-2 rounded-xl bg-muted/10 border border-border/50">
                    <span className="w-20 text-xs font-medium text-foreground">{DAY_NAMES[day] || day}</span>
                    <input type="time" className={`${inputCls} flex-1 py-1 font-mono text-xs`} value={form.dayHours[day]?.start || form.workStart} onChange={e => setDayHour(day, "start", e.target.value)} />
                    <span className="text-muted-foreground text-xs">—</span>
                    <input type="time" className={`${inputCls} flex-1 py-1 font-mono text-xs`} value={form.dayHours[day]?.end || form.workEnd} onChange={e => setDayHour(day, "end", e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-border/60 pt-3.5 space-y-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-0.5">فصل الحجز حسب الجنس (اختياري)</label>
              <p className="text-[11px] text-muted-foreground mb-2">اترك الحقول بدون اختيار إذا كان الفرع يستقبل الجميع في كافة الأوقات.</p>
            </div>
            <div>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1.5 block">أيام الرجال</span>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map(d => {
                  const isWorkingDay = (form.workingDays || "").split(",").includes(d.value);
                  const isSelected = (form.maleDays || []).includes(d.value);
                  return (
                    <button type="button" key={d.value} disabled={!isWorkingDay} onClick={() => toggleGenderDay("male", d.value)}
                      title={!isWorkingDay ? "يجب اختيار هذا اليوم كأحد أيام العمل أولاً" : ""}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-background border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}>{d.label}</button>
                  );
                })}
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-pink-600 dark:text-pink-400 mb-1.5 block">أيام السيدات</span>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map(d => {
                  const isWorkingDay = (form.workingDays || "").split(",").includes(d.value);
                  const isSelected = (form.femaleDays || []).includes(d.value);
                  return (
                    <button type="button" key={d.value} disabled={!isWorkingDay} onClick={() => toggleGenderDay("female", d.value)}
                      title={!isWorkingDay ? "يجب اختيار هذا اليوم كأحد أيام العمل أولاً" : ""}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                        isSelected
                          ? "bg-pink-600 text-white border-pink-600 shadow-xs"
                          : "bg-background border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}>{d.label}</button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-border/60 pt-3.5">
            <label className="block text-xs font-medium text-foreground mb-1">الحد الأقصى للحجوزات لكل وقت</label>
            <p className="text-[11px] text-muted-foreground mb-2">عدد الحجوزات المسموح بها في نفس الساعة (الافتراضي: ١)</p>
            <input type="number" min={1} max={99} className={`${inputCls} font-mono w-32`} value={form.maxBookingsPerSlot ?? 1} onChange={e => setForm({ ...form, maxBookingsPerSlot: Math.max(1, Number(e.target.value)) })} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-border/60 bg-muted/20 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-foreground border border-border/70 rounded-xl hover:bg-muted/50 transition-colors">
            إلغاء
          </button>
          <button onClick={() => { if (validate()) onSave(form); }} className="px-5 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 shadow-xs transition-colors">
            حفظ الفرع
          </button>
        </div>
      </div>
    </div>
  );
}
