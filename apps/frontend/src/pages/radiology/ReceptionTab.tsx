import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { api, bookingApi, fetchJson, RadiologyExamType, RadiologyExamAddition, MODAL_INPUT_CLS } from "./shared";

const GENDER_OPTIONS = [
  { value: "male", label: "ذكر" },
  { value: "female", label: "أنثى" },
];

const inputCls = MODAL_INPUT_CLS;
const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
const cardCls = "bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5";

export default function ReceptionTab() {
  const [examTypes, setExamTypes] = useState<RadiologyExamType[]>([]);
  const [additions, setAdditions] = useState<RadiologyExamAddition[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<{ id: string; name: string }[]>([]);
  const [loadingExamTypes, setLoadingExamTypes] = useState(true);

  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientGender, setPatientGender] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [insuranceNumber, setInsuranceNumber] = useState("");
  const [examTypeId, setExamTypeId] = useState("");
  const [insuranceCompanyId, setInsuranceCompanyId] = useState("");
  const [selectedAdditions, setSelectedAdditions] = useState<string[]>([]);
  const [emergency, setEmergency] = useState(false);
  const [withContrast, setWithContrast] = useState(false);
  const [referralDoctor, setReferralDoctor] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<{ id: string; firstName: string; lastName?: string; phone?: string; gender?: string; nationalId?: string; insuranceNumber?: string; birthDate?: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [entityPrice, setEntityPrice] = useState<number | null>(null);

  const [referringPhysicianId, setReferringPhysicianId] = useState("");
  const [physicianSearch, setPhysicianSearch] = useState("");
  const [physicianResults, setPhysicianResults] = useState<{ id: string; name: string; specialty?: string }[]>([]);
  const [searchingPhysicians, setSearchingPhysicians] = useState(false);

  const examPrice = (() => {
    const et = examTypes.find(t => t.id === examTypeId);
    return et ? Number(et.price) || 0 : 0;
  })();
  const additionsTotal = additions.filter(a => selectedAdditions.includes(a.id)).reduce((s, a) => s + a.price, 0);
  const displayPrice = entityPrice !== null ? entityPrice : examPrice;

  useEffect(() => {
    (async () => {
      setLoadingExamTypes(true);
      try {
        const [ets, adds, ins] = await Promise.all([
          fetchJson<RadiologyExamType[]>(`${api("exam-types")}&limit=500`),
          fetchJson<RadiologyExamType[]>(`${api("exam-types")}&isAddition=true&limit=100`).catch(() => []),
          fetchJson<{ id: string; name: string }[]>(bookingApi("insurance-companies")).catch(() => []),
        ]);
        setExamTypes(Array.isArray(ets) ? ets : []);
        setAdditions(Array.isArray(adds) ? adds : []);
        setInsuranceCompanies(Array.isArray(ins) ? ins : []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "فشل تحميل أنواع الفحوصات");
      } finally {
        setLoadingExamTypes(false);
      }
    })();
  }, []);

  // Entity price lookup when exam + insurance selected
  useEffect(() => {
    if (!examTypeId || !insuranceCompanyId) { setEntityPrice(null); return; }
    (async () => {
      try {
        const url = new URL(api("entity-prices"));
        url.searchParams.set("insuranceCompanyId", insuranceCompanyId);
        url.searchParams.set("examTypeId", examTypeId);
        const rows = await fetchJson<{ price: number }[]>(url.toString());
        setEntityPrice(rows && rows.length ? Number(rows[0]?.price) : null);
      } catch { setEntityPrice(null); }
    })();
  }, [examTypeId, insuranceCompanyId]);

  // Patient search
  useEffect(() => {
    if (!patientSearch.trim()) { setPatientResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const url = new URL(bookingApi("patients"));
        url.searchParams.set("search", patientSearch.trim());
        url.searchParams.set("limit", "10");
        const rows = await fetchJson<{ id: string; firstName: string; lastName?: string; phone?: string; gender?: string; nationalId?: string; insuranceNumber?: string; birthDate?: string }[]>(url.toString());
        setPatientResults(Array.isArray(rows) ? rows : []);
      } catch { setPatientResults([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [patientSearch]);

  // Referring-physician search (searchable dropdown)
  useEffect(() => {
    if (!physicianSearch.trim()) { setPhysicianResults([]); return; }
    const t = setTimeout(async () => {
      setSearchingPhysicians(true);
      try {
        const url = new URL(api("referring-physicians"));
        url.searchParams.set("search", physicianSearch.trim());
        url.searchParams.set("limit", "20");
        const rows = await fetchJson<{ id: string; name: string; specialty?: string }[]>(url.toString());
        setPhysicianResults(Array.isArray(rows) ? rows : []);
      } catch { setPhysicianResults([]); }
      finally { setSearchingPhysicians(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [physicianSearch]);

  const pickPatient = (p: { id: string; firstName: string; lastName?: string; phone?: string; gender?: string; nationalId?: string; insuranceNumber?: string; birthDate?: string }) => {
    setPatientId(p.id);
    setPatientName(`${p.firstName}${p.lastName ? ' ' + p.lastName : ''}`);
    setPatientPhone(p.phone || "");
    if (p.gender) setPatientGender(p.gender === "male" || p.gender === "M" ? "male" : "female");
    if (p.nationalId) setNationalId(p.nationalId);
    if (p.insuranceNumber) setInsuranceNumber(p.insuranceNumber);
    if (p.birthDate) {
      const dob = new Date(p.birthDate);
      if (!Number.isNaN(dob.getTime())) {
        const age = Math.max(0, Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)));
        if (age > 0) setPatientAge(String(age));
      }
    }
    setPatientSearch("");
    setPatientResults([]);
  };

  const pickPhysician = (p: { id: string; name: string }) => {
    setReferringPhysicianId(p.id);
    setReferralDoctor(p.name);
    setPhysicianSearch("");
    setPhysicianResults([]);
  };

  const resetForm = () => {
    setPatientId(""); setPatientName(""); setPatientPhone(""); setPatientGender(""); setPatientAge("");
    setNationalId(""); setInsuranceNumber("");
    setExamTypeId(""); setInsuranceCompanyId(""); setSelectedAdditions([]); setEmergency(false); setWithContrast(false);
    setReferralDoctor(""); setReferringPhysicianId(""); setPhysicianSearch(""); setPhysicianResults([]); setNotes(""); setEntityPrice(null);
  };

  const toggleAddition = (id: string) => {
    setSelectedAdditions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!patientName.trim()) { toast.error("اسم المريض مطلوب"); return; }
    if (!examTypeId) { toast.error("اختر نوع الفحص"); return; }
    setSubmitting(true);
    try {
      await fetchJson(api("studies"), {
        method: "POST",
        body: JSON.stringify({
          patientId: patientId || undefined,
          patientName: patientName.trim(),
          patientPhone: patientPhone.trim() || undefined,
          patientGender: patientGender || undefined,
          patientAge: patientAge.trim() || undefined,
          nationalId: nationalId.trim() || undefined,
          insuranceNumber: insuranceNumber.trim() || undefined,
          examTypeId,
          insuranceCompanyId: insuranceCompanyId || undefined,
          additionIds: selectedAdditions,
          emergency,
          withContrast,
          referringPhysicianId: referringPhysicianId || undefined,
          referralDoctor: referralDoctor.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      toast.success("تم إنشاء الدراسة بنجاح");
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل إنشاء الدراسة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">استقبال دراسة جديدة</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">إدخال بيانات المريض واختيار نوع الفحص ثم إنشاء الدراسة</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardCls}>
          <h3 className="font-bold mb-4 text-gray-800 dark:text-gray-100">بيانات المريض</h3>
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute right-3 top-3 text-gray-400 dark:text-gray-500" />
            <input className={`${inputCls} pr-9`} placeholder="بحث عن مريض موجود (اسم أو هاتف)..." value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
            {searching && <Loader2 className="w-4 h-4 absolute left-3 top-3 animate-spin text-gray-400" />}
            {patientResults.length > 0 ? (
              <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {patientResults.map(p => (
                  <button key={p.id} type="button" onClick={() => pickPatient(p)} className="w-full text-right px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm flex justify-between">
                    <span>{p.firstName}{p.lastName ? ' ' + p.lastName : ''}</span>
                    <span className="text-gray-400 dark:text-gray-500" dir="ltr">{p.phone}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {patientId ? (
            <p className="text-xs text-green-600 mb-3">تم الربط بمريض موجود ✓</p>
          ) : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>اسم المريض *</label>
              <input className={inputCls} value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="الاسم الكامل" />
            </div>
            <div>
              <label className={labelCls}>رقم الهاتف</label>
              <input className={inputCls} value={patientPhone} onChange={e => setPatientPhone(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" />
            </div>
            <div>
              <label className={labelCls}>الجنس</label>
              <select className={inputCls} value={patientGender} onChange={e => setPatientGender(e.target.value)}>
                <option value="">غير محدد</option>
                {GENDER_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>العمر</label>
              <input className={inputCls} value={patientAge} onChange={e => setPatientAge(e.target.value)} placeholder="مثال: 45 سنة" />
            </div>
            <div>
              <label className={labelCls}>الرقم القومي</label>
              <input className={inputCls} dir="ltr" value={nationalId} onChange={e => setNationalId(e.target.value)} placeholder="14 رقم" />
            </div>
            <div>
              <label className={labelCls}>رقم التأمين</label>
              <input className={inputCls} dir="ltr" value={insuranceNumber} onChange={e => setInsuranceNumber(e.target.value)} />
            </div>
          </div>
        </div>

        <div className={cardCls}>
          <h3 className="font-bold mb-4 text-gray-800 dark:text-gray-100">بيانات الفحص</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>نوع الفحص *</label>
              <select className={inputCls} value={examTypeId} onChange={e => setExamTypeId(e.target.value)} disabled={loadingExamTypes}>
                <option value="">{loadingExamTypes ? "جاري تحميل الفحوصات..." : "اختر نوع الفحص..."}</option>
                {examTypes.filter(t => t.isActive !== false).map(t => (
                  <option key={t.id} value={t.id}>{t.name}{t.category ? ` (${t.category})` : ""}</option>
                ))}
              </select>
            </div>
            {insuranceCompanies.length > 0 ? (
              <div className="sm:col-span-2">
                <label className={labelCls}>جهة التأمين (اختياري)</label>
                <select className={inputCls} value={insuranceCompanyId} onChange={e => setInsuranceCompanyId(e.target.value)}>
                  <option value="">دفع مباشر من المريض</option>
                  {insuranceCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            ) : null}
            {examTypeId ? (
              <div className="sm:col-span-2 rounded-lg border dark:border-gray-700 px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">الإجمالي (فحص + إضافات)</span>
                <b className="text-lg text-blue-600">{(displayPrice + additionsTotal).toFixed(0)} ج</b>
              </div>
            ) : null}
            <div className="sm:col-span-2 relative">
              <label className={labelCls}>الطبيب المحيل</label>
              <input
                className={inputCls}
                value={physicianSearch || referralDoctor}
                onChange={e => { setPhysicianSearch(e.target.value); if (!e.target.value) { setReferringPhysicianId(""); setReferralDoctor(""); } }}
                placeholder="ابحث عن طبيب محيل..."
              />
              {physicianSearch.trim() && (
                <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-xl">
                  {searchingPhysicians ? (
                    <div className="px-3 py-2 text-sm text-gray-500">جارٍ البحث...</div>
                  ) : physicianResults.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">لا توجد نتائج</div>
                  ) : (
                    physicianResults.map(p => (
                      <button key={p.id} type="button" onClick={() => pickPhysician(p)} className="block w-full text-right px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                        <span className="font-medium">{p.name}</span>
                        {p.specialty ? <span className="text-xs text-gray-500 dark:text-gray-400"> — {p.specialty}</span> : null}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {additions.length > 0 ? (
              <div className="sm:col-span-2">
                <label className={labelCls}>إضافات الفحص</label>
                <div className="flex flex-wrap gap-2">
                  {additions.map(a => (
                    <label key={a.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-600 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input type="checkbox" checked={selectedAdditions.includes(a.id)} onChange={() => toggleAddition(a.id)} className="rounded border-gray-300 dark:border-gray-600" />
                      {a.name} ({Number(a.price).toFixed(0)} ج)
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="sm:col-span-2 flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={emergency} onChange={e => setEmergency(e.target.checked)} className="rounded border-gray-300 dark:border-gray-600" />
                حالة طارئة
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={withContrast} onChange={e => setWithContrast(e.target.checked)} className="rounded border-gray-300 dark:border-gray-600" />
                بصبغة (مع التباين)
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>ملاحظات</label>
              <textarea className={inputCls} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات إضافية" />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full mt-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            إنشاء الدراسة
          </button>
        </div>
      </div>
    </div>
  );
}
