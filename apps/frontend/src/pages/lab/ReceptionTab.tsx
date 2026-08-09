import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { api, fetchJson, LabOrder, LabTest, PATIENT_FLAGS, MODAL_INPUT_CLS } from "./shared";

const GENDER_OPTIONS = [
  { value: "male", label: "ذكر" },
  { value: "female", label: "أنثى" },
];

const DOCTOR_TYPES = [
  { value: "contracted", label: "متعاقد" },
  { value: "variable", label: "متغير" },
];

interface SelectedTest {
  testId: string;
  name: string;
  price: number;
}

const inputCls = MODAL_INPUT_CLS;
const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
const cardCls = "bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5";

export default function ReceptionTab() {
  const [tests, setTests] = useState<LabTest[] | null>(null);
  const [loadingTests, setLoadingTests] = useState(true);
  const [testSearch, setTestSearch] = useState("");
  const [category, setCategory] = useState("");

  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientGender, setPatientGender] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [contract, setContract] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorType, setDoctorType] = useState("");
  const [fastingHours, setFastingHours] = useState("");
  const [collectionDate, setCollectionDate] = useState("");
  const [receiveDate, setReceiveDate] = useState("");
  const [externalSample, setExternalSample] = useState(false);
  const [notes, setNotes] = useState("");

  const [selectedFlags, setSelectedFlags] = useState<string[]>([]);
  const [selected, setSelected] = useState<SelectedTest[]>([]);
  const [discount, setDiscount] = useState("");
  const [paid, setPaid] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingTests(true);
      try {
        const url = new URL(api("tests"));
        url.searchParams.set("limit", "200");
        setTests(await fetchJson<LabTest[]>(url.toString()));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "فشل تحميل الاختبارات");
      } finally {
        setLoadingTests(false);
      }
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    (tests ?? []).forEach(t => { if (t.category) set.add(t.category); });
    return Array.from(set);
  }, [tests]);

  const filteredTests = useMemo(() => {
    const q = testSearch.trim().toLowerCase();
    return (tests ?? []).filter(t => {
      if (category && t.category !== category) return false;
      if (!q) return true;
      return (t.name || "").toLowerCase().includes(q)
        || (t.abbreviation || "").toLowerCase().includes(q)
        || (t.category || "").toLowerCase().includes(q);
    });
  }, [tests, testSearch, category]);

  const subtotal = useMemo(() => selected.reduce((sum, s) => sum + (Number(s.price) || 0), 0), [selected]);
  const discountNum = Number(discount) || 0;
  const total = Math.max(0, subtotal - discountNum);
  const paidNum = Number(paid) || 0;
  const remaining = Math.max(0, total - paidNum);

  const addTest = (t: LabTest) => {
    setSelected(prev => prev.some(s => s.testId === t.id)
      ? prev
      : [...prev, { testId: t.id, name: t.name, price: t.price }]);
  };

  const removeTest = (testId: string) => {
    setSelected(prev => prev.filter(s => s.testId !== testId));
  };

  const toggleFlag = (value: string) => {
    setSelectedFlags(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]);
  };

  const resetForm = () => {
    setPatientName(""); setPatientPhone(""); setPatientGender(""); setPatientAge("");
    setContract(""); setDoctorName(""); setDoctorType(""); setFastingHours("");
    setCollectionDate(""); setReceiveDate(""); setExternalSample(false); setNotes("");
    setSelectedFlags([]); setSelected([]); setDiscount(""); setPaid("");
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!patientName.trim()) { toast.error("اسم المريض مطلوب"); return; }
    if (selected.length === 0) { toast.error("اختر اختباراً واحداً على الأقل"); return; }
    setSubmitting(true);
    try {
      const created = await fetchJson<LabOrder>(api("orders"), {
        method: "POST",
        body: JSON.stringify({
          patientName: patientName.trim(),
          patientPhone: patientPhone.trim() || undefined,
          patientGender: patientGender || undefined,
          patientAge: patientAge.trim() || undefined,
          contractId: contract.trim() || undefined,
          doctorName: doctorName.trim() || undefined,
          doctorType: doctorType || undefined,
          fastingHours: fastingHours !== "" ? Number(fastingHours) : undefined,
          externalSample,
          collectionDate: collectionDate ? new Date(collectionDate).toISOString() : undefined,
          receiveDate: receiveDate ? new Date(receiveDate).toISOString() : undefined,
          patientFlags: Object.fromEntries(selectedFlags.map(f => [f, true])),
          notes: notes.trim() || undefined,
          testIds: selected.map(s => ({ testId: s.testId, price: s.price })),
        }),
      });
      toast.success(created?.orderNumber ? `تم إنشاء الطلب ${created.orderNumber} بنجاح` : "تم إنشاء الطلب بنجاح");
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل إنشاء الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">استقبال طلب تحليل جديد</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">إدخال بيانات المريض واختيار الاختبارات ثم إنشاء الطلب</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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
                <input className={inputCls} value={patientAge} onChange={e => setPatientAge(e.target.value)} placeholder="مثال: 35 سنة" />
              </div>
            </div>
          </div>

          <div className={cardCls}>
            <h3 className="font-bold mb-4 text-gray-800 dark:text-gray-100">بيانات الطلب</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>الطبيب المحيل</label>
                <input className={inputCls} value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="اسم الطبيب" />
              </div>
              <div>
                <label className={labelCls}>نوع الطبيب</label>
                <select className={inputCls} value={doctorType} onChange={e => setDoctorType(e.target.value)}>
                  <option value="">غير محدد</option>
                  {DOCTOR_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>التعاقد</label>
                <input className={inputCls} value={contract} onChange={e => setContract(e.target.value)} placeholder="اسم التعاقد (اختياري)" />
              </div>
              <div>
                <label className={labelCls}>ساعات الصيام</label>
                <input className={inputCls} type="number" min={0} value={fastingHours} onChange={e => setFastingHours(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className={labelCls}>تاريخ أخذ العينة</label>
                <input className={inputCls} type="date" value={collectionDate} onChange={e => setCollectionDate(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>تاريخ الاستلام</label>
                <input className={inputCls} type="date" value={receiveDate} onChange={e => setReceiveDate(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <input type="checkbox" id="externalSample" checked={externalSample} onChange={e => setExternalSample(e.target.checked)} />
              <label htmlFor="externalSample" className="text-sm text-gray-700 dark:text-gray-300">عينة خارجية (من معمل آخر)</label>
            </div>
            <div className="mt-4">
              <label className={labelCls}>ملاحظات</label>
              <textarea className={inputCls} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات إضافية" />
            </div>
          </div>

          <div className={cardCls}>
            <h3 className="font-bold mb-4 text-gray-800 dark:text-gray-100">حالات المريض</h3>
            <div className="flex flex-wrap gap-2">
              {PATIENT_FLAGS.map(f => {
                const active = selectedFlags.includes(f.value);
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => toggleFlag(f.value)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${active
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={cardCls}>
            <h3 className="font-bold mb-4 text-gray-800 dark:text-gray-100">اختيار الاختبارات</h3>
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" />
              <input className={`${inputCls} pr-9`} placeholder="بحث عن اختبار..." value={testSearch} onChange={e => setTestSearch(e.target.value)} />
            </div>
            {categories.length > 0 && (
              <select className={`${inputCls} mb-3`} value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">كل الأقسام</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <div className="max-h-72 overflow-y-auto border dark:border-gray-700 rounded-lg">
              {loadingTests ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
              ) : filteredTests.length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">لا توجد اختبارات مطابقة</p>
              ) : filteredTests.map(t => {
                const added = selected.some(s => s.testId === t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => (added ? removeTest(t.id) : addTest(t))}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border-b dark:border-gray-700 last:border-b-0 text-right ${added
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100"}`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {added ? <Check className="w-4 h-4 text-blue-600 flex-shrink-0" /> : <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                      <span className="min-w-0">
                        <span className="block font-medium truncate">{t.name}</span>
                        {t.abbreviation ? <span className="block text-xs text-gray-400 dark:text-gray-500 truncate">{t.abbreviation}{t.category ? ` · ${t.category}` : ""}</span> : null}
                      </span>
                    </span>
                    <span className="text-xs font-semibold whitespace-nowrap flex-shrink-0">{Number(t.price) || 0} ج.م</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={cardCls}>
            <h3 className="font-bold mb-4 text-gray-800 dark:text-gray-100">الاختبارات المختارة ({selected.length})</h3>
            {selected.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">لم يتم اختيار اختبارات بعد</p>
            ) : (
              <div className="space-y-2 mb-4">
                {selected.map(s => (
                  <div key={s.testId} className="flex items-center justify-between gap-2 text-sm border dark:border-gray-700 rounded-lg px-3 py-2">
                    <span className="truncate">{s.name}</span>
                    <span className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-semibold whitespace-nowrap">{Number(s.price) || 0} ج.م</span>
                      <button onClick={() => removeTest(s.testId)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="إزالة"><Trash2 className="w-4 h-4" /></button>
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t dark:border-gray-700 pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">الإجمالي الفرعي</span>
                <span className="font-semibold">{subtotal} ج.م</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500 dark:text-gray-400">الخصم</span>
                <input type="number" min={0} className={`${inputCls} !w-28 text-left`} value={discount} onChange={e => setDiscount(e.target.value)} />
              </div>
              <div className="flex justify-between font-bold">
                <span>الإجمالي</span>
                <span>{total} ج.م</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500 dark:text-gray-400">المدفوع</span>
                <input type="number" min={0} className={`${inputCls} !w-28 text-left`} value={paid} onChange={e => setPaid(e.target.value)} />
              </div>
              <div className="flex justify-between font-bold text-blue-600 dark:text-blue-400">
                <span>المتبقي</span>
                <span>{remaining} ج.م</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              إنشاء الطلب
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
