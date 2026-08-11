import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api, fetchJson, RadiologyExamType, RadiologyExamAddition, MODAL_INPUT_CLS } from "./shared";

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
  const [loadingExamTypes, setLoadingExamTypes] = useState(true);

  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientGender, setPatientGender] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [insuranceNumber, setInsuranceNumber] = useState("");
  const [examTypeId, setExamTypeId] = useState("");
  const [selectedAdditions, setSelectedAdditions] = useState<string[]>([]);
  const [emergency, setEmergency] = useState(false);
  const [withContrast, setWithContrast] = useState(false);
  const [referralDoctor, setReferralDoctor] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingExamTypes(true);
      try {
        const [ets, adds] = await Promise.all([
          fetchJson<RadiologyExamType[]>(api("exam-types")),
          fetchJson<RadiologyExamAddition[]>(api("exam-additions")).catch(() => []),
        ]);
        setExamTypes(Array.isArray(ets) ? ets : []);
        setAdditions(Array.isArray(adds) ? adds : []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "فشل تحميل أنواع الفحوصات");
      } finally {
        setLoadingExamTypes(false);
      }
    })();
  }, []);

  const resetForm = () => {
    setPatientName(""); setPatientPhone(""); setPatientGender(""); setPatientAge("");
    setNationalId(""); setInsuranceNumber("");
    setExamTypeId(""); setSelectedAdditions([]); setEmergency(false); setWithContrast(false);
    setReferralDoctor(""); setNotes("");
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
          patientName: patientName.trim(),
          patientPhone: patientPhone.trim() || undefined,
          patientGender: patientGender || undefined,
          patientAge: patientAge.trim() || undefined,
          nationalId: nationalId.trim() || undefined,
          insuranceNumber: insuranceNumber.trim() || undefined,
          examTypeId,
          additionIds: selectedAdditions,
          emergency,
          withContrast,
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
            <div className="sm:col-span-2">
              <label className={labelCls}>الطبيب المحيل</label>
              <input className={inputCls} value={referralDoctor} onChange={e => setReferralDoctor(e.target.value)} placeholder="اسم الطبيب" />
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
