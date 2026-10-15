import { useEffect, useState } from "react";
import { User, X, Camera, ShieldCheck, HeartPulse } from "lucide-react";
import { BookingPatient, ReferringPhysician, PriceList, InsuranceCompany, InsuranceMemberType, PATIENT_STATUS_MAP, tryParseJSON, api, fetchJson } from "./shared";
import MedicalHistoryChecklist, { MedicalHistoryValue } from "./MedicalHistoryChecklist";
import { toast } from "sonner";

interface Props {
  patient?: Partial<BookingPatient> | null;
  onClose: () => void;
  onSave: (d: Partial<BookingPatient>) => Promise<void>;
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const MARITAL_STATUS = [
  { value: "", label: "غير محدد" },
  { value: "SINGLE", label: "أعزب/عزباء" },
  { value: "MARRIED", label: "متزوج/متزوجة" },
  { value: "DIVORCED", label: "مطلق/مطلقة" },
  { value: "WIDOW", label: "أرمل/أرملة" },
];
const SOURCES = [
  { value: "", label: "غير محدد" },
  { value: "whatsapp", label: "واتساب" },
  { value: "facebook", label: "فيسبوك" },
  { value: "web", label: "موقع إلكتروني" },
  { value: "dashboard", label: "لوحة التحكم" },
  { value: "physician", label: "طبيب محوّل" },
  { value: "walkin", label: "زيارة مباشرة" },
];

const toList = (v: unknown): string => {
  const arr = tryParseJSON<string[]>(v) || (Array.isArray(v) ? v : null);
  return arr ? arr.join("، ") : "";
};
const fromList = (s: string): string[] | undefined => {
  const items = s.split(/[،,;]/).map(x => x.trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
};
const toDateInput = (d?: string): string => (!d ? "" : d.split("T")[0] || d);
const parseMedicalHistory = (v: unknown): MedicalHistoryValue | null => {
  const parsed = tryParseJSON<MedicalHistoryValue>(v);
  return parsed && parsed.conditions && Array.isArray(parsed.conditions) ? parsed : null;
};

export default function PatientModal({ patient, onClose, onSave }: Props) {
  const [form, setForm] = useState<{
    firstName: string; lastName: string; phone: string; email: string;
    gender: string; birthDate: string; bloodType: string;
    nationalId: string; nationalIdImage: string; address: string;
    allergies: string; chronicDiseases: string; medications: string;
    notes: string; isActive: boolean; password: string;
    status: string; source: string; maritalStatus: string; occupation: string; city: string;
    referringPhysicianId: string; priceListId: string;
    title: string; insuranceNumber: string; insuranceCompanyId: string; memberTypeId: string;
    homePhone: string; workPhone: string; fax: string; postalCode: string;
    medicalHistory: MedicalHistoryValue | null;
  }>({
    firstName: patient?.firstName || "", lastName: patient?.lastName || "",
    phone: patient?.phone || "", email: patient?.email || "",
    gender: patient?.gender || "", birthDate: toDateInput(patient?.birthDate),
    bloodType: patient?.bloodType || "", nationalId: patient?.nationalId || "",
    nationalIdImage: patient?.nationalIdImage || "", address: patient?.address || "",
    allergies: toList(patient?.allergies), chronicDiseases: toList(patient?.chronicDiseases),
    medications: toList(patient?.medications), notes: patient?.notes || "",
    isActive: patient?.isActive ?? true, password: "", status: (patient?.status || "ACTIVE") as string,
    source: patient?.source || "", maritalStatus: patient?.maritalStatus || "",
    occupation: patient?.occupation || "", city: patient?.city || "",
    referringPhysicianId: patient?.referringPhysicianId || "", priceListId: patient?.priceListId || "",
    title: patient?.title || "", insuranceNumber: patient?.insuranceNumber || "",
    insuranceCompanyId: patient?.insuranceCompanyId || "", memberTypeId: patient?.memberTypeId || "",
    homePhone: patient?.homePhone || "", workPhone: patient?.workPhone || "",
    fax: patient?.fax || "", postalCode: patient?.postalCode || "",
    medicalHistory: parseMedicalHistory(patient?.medicalHistory),
  });

  const [referringPhysicians, setReferringPhysicians] = useState<ReferringPhysician[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
  const [memberTypes, setMemberTypes] = useState<InsuranceMemberType[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      fetchJson<ReferringPhysician[]>(api("referring-physicians")),
      fetchJson<PriceList[]>(api("price-lists")),
      fetchJson<InsuranceCompany[]>(api("insurance-companies")),
      fetchJson<InsuranceMemberType[]>(api("insurance-member-types")),
    ]).then(([physicians, lists, companies, types]) => {
      if (physicians.status === "fulfilled") setReferringPhysicians(physicians.value);
      if (lists.status === "fulfilled") setPriceLists(lists.value);
      if (companies.status === "fulfilled") setInsuranceCompanies(companies.value);
      if (types.status === "fulfilled") setMemberTypes(types.value);
    }).catch(() => { /* keep empty */ });
  }, []);

  const valid = form.firstName.trim() !== "";

  const handleNationalIdImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, nationalIdImage: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (saving || !valid) return;
    setSaving(true);
    try {
      await onSave({
        ...patient,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        gender: form.gender || undefined,
        birthDate: form.birthDate || undefined,
        bloodType: form.bloodType || undefined,
        nationalId: form.nationalId.trim() || undefined,
        nationalIdImage: form.nationalIdImage || undefined,
        address: form.address.trim() || undefined,
        allergies: fromList(form.allergies),
        chronicDiseases: fromList(form.chronicDiseases),
        medications: fromList(form.medications),
        notes: form.notes.trim() || undefined,
        isActive: form.isActive,
        password: form.password || undefined,
        status: form.status || undefined,
        source: form.source || undefined,
        maritalStatus: form.maritalStatus || undefined,
        occupation: form.occupation.trim() || undefined,
        city: form.city.trim() || undefined,
        referringPhysicianId: form.referringPhysicianId || undefined,
        priceListId: form.priceListId || undefined,
        title: form.title.trim() || undefined,
        insuranceNumber: form.insuranceNumber.trim() || undefined,
        insuranceCompanyId: form.insuranceCompanyId || undefined,
        memberTypeId: form.memberTypeId || undefined,
        homePhone: form.homePhone.trim() || undefined,
        workPhone: form.workPhone.trim() || undefined,
        fax: form.fax.trim() || undefined,
        postalCode: form.postalCode.trim() || undefined,
        medicalHistory: form.medicalHistory
          ? { conditions: form.medicalHistory.conditions, allergies: form.medicalHistory.allergies }
          : undefined,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل حفظ بيانات المريض");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-background border border-border/70 rounded-xl px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-card-foreground animate-in fade-in-0 zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground tracking-tight">{patient?.id ? "تعديل ملف المريض" : "إضافة مريض جديد"}</h3>
              <p className="text-xs text-muted-foreground">البيانات الشخصية، الطبية، والتأمين الصحي</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">الاسم الأول *</label>
              <input className={inputCls} value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">الاسم الأخير</label>
              <input className={inputCls} value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">الهاتف</label>
              <input className={`${inputCls} font-mono`} dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">البريد الإلكتروني</label>
              <input className={`${inputCls} font-mono`} dir="ltr" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">الرقم القومي (اختياري)</label>
              <input className={`${inputCls} font-mono`} dir="ltr" value={form.nationalId} onChange={e => setForm({ ...form, nationalId: e.target.value })} placeholder="14 رقماً" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">العنوان</label>
              <input className={inputCls} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="العنوان الكامل" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">صورة البطاقة الشخصية (اختياري)</label>
            <div className="flex items-center gap-3">
              <label className="flex-1 cursor-pointer border border-border/80 rounded-xl px-3.5 py-2.5 text-xs text-muted-foreground hover:bg-muted/30 transition-all flex items-center justify-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                <span>{form.nationalIdImage ? "تغيير الصورة المرفوعة" : "رفع صورة البطاقة"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleNationalIdImage(f); }} />
              </label>
              {form.nationalIdImage && (
                <div className="relative shrink-0">
                  <img src={form.nationalIdImage} alt="بطاقة" className="w-16 h-12 object-cover rounded-lg border border-border" />
                  <button type="button" onClick={() => setForm({ ...form, nationalIdImage: "" })} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] leading-4 flex items-center justify-center shadow">×</button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">الجنس</label>
              <select className={inputCls} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="">غير محدد</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">تاريخ الميلاد</label>
              <input type="date" className={`${inputCls} font-mono`} value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">فصيلة الدم</label>
              <select className={inputCls} value={form.bloodType} onChange={e => setForm({ ...form, bloodType: e.target.value })}>
                <option value="">غير محدد</option>
                {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">الحالة</label>
              <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {Object.entries(PATIENT_STATUS_MAP).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">الحالة الاجتماعية</label>
              <select className={inputCls} value={form.maritalStatus} onChange={e => setForm({ ...form, maritalStatus: e.target.value })}>
                {MARITAL_STATUS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">مصدر الإحالة</label>
              <select className={inputCls} value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">المهنة</label>
              <input className={inputCls} value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">المدينة</label>
              <input className={inputCls} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">الطبيب المحوّل</label>
              <select className={inputCls} value={form.referringPhysicianId} onChange={e => setForm({ ...form, referringPhysicianId: e.target.value })}>
                <option value="">بدون</option>
                {referringPhysicians.map(r => <option key={r.id} value={r.id}>{r.name}{r.specialty ? ` (${r.specialty})` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">قائمة الأسعار المخصصة</label>
              <select className={inputCls} value={form.priceListId} onChange={e => setForm({ ...form, priceListId: e.target.value })}>
                <option value="">الافتراضية</option>
                {priceLists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="p-3.5 bg-muted/20 border border-border/60 rounded-xl space-y-3">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" /> بيانات التأمين الطبي
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">اللقب (دكتور، مهندس...)</label>
                <input className={inputCls} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">رقم بطاقة التأمين</label>
                <input className={`${inputCls} font-mono`} dir="ltr" value={form.insuranceNumber} onChange={e => setForm({ ...form, insuranceNumber: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">شركة التأمين</label>
                <select className={inputCls} value={form.insuranceCompanyId} onChange={e => setForm({ ...form, insuranceCompanyId: e.target.value })}>
                  <option value="">بدون</option>
                  {insuranceCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">نوع العضوية / الفئة</label>
                <select className={inputCls} value={form.memberTypeId} onChange={e => setForm({ ...form, memberTypeId: e.target.value })}>
                  <option value="">بدون</option>
                  {memberTypes.map(m => <option key={m.id} value={m.id}>{m.name}{m.coveragePercent ? ` (تغطية ${m.coveragePercent}٪)` : ""}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">الحساسية (افصل بفاصلة)</label>
              <input className={inputCls} placeholder="مثال: البنسلين، الأسبرين" value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">أمراض مزمنة (افصل بفاصلة)</label>
              <input className={inputCls} placeholder="مثال: الضغط، السكري" value={form.chronicDiseases} onChange={e => setForm({ ...form, chronicDiseases: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">أدوية حالية (افصل بفاصلة)</label>
            <input className={inputCls} placeholder="أدوية يتم تناولها بانتظام..." value={form.medications} onChange={e => setForm({ ...form, medications: e.target.value })} />
          </div>

          <div className="border-t border-border/60 pt-3">
            <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-primary" /> التاريخ الطبي وقائمة الفحص
            </p>
            <MedicalHistoryChecklist value={form.medicalHistory} onChange={v => setForm({ ...form, medicalHistory: v })} />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">ملاحظات إضافية</label>
            <textarea className={inputCls} rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              {patient?.id ? "كلمة مرور بوابة المريض (اتركها فارغة للاحتفاظ)" : "كلمة مرور بوابة المريض (اختياري)"}
            </label>
            <input type="password" className={`${inputCls} font-mono`} dir="ltr" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>

          {patient?.id && (
            <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer pt-1">
              <input type="checkbox" className="rounded border-border text-primary focus:ring-primary/20" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
              حساب مريض نشط
            </label>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-border/60 bg-muted/20 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-foreground border border-border/70 rounded-xl hover:bg-muted/50 transition-colors">
            إلغاء
          </button>
          <button onClick={handleSave} disabled={!valid || saving} className="px-5 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 shadow-xs transition-colors disabled:opacity-50">
            {saving ? "جارٍ الحفظ..." : "حفظ المريض"}
          </button>
        </div>
      </div>
    </div>
  );
}
