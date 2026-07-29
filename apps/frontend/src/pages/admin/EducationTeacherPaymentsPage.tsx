import { useState, useEffect } from "react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";

const getCompanyId = (): string | null => {
  try { return JSON.parse(localStorage.getItem("user") || "{}").companyId || null; } catch { return null; }
};
const getAuthHeaders = () => {
  const headers = tokenManager.createAuthHeaders({ "Content-Type": "application/json" });
  const cid = getCompanyId();
  if (cid) headers["X-Company-Id"] = cid;
  return headers;
};
const api = (path: string) => {
  const base = buildApiUrl(`education/${path}`);
  let url: URL;
  try { url = new URL(base); } catch { url = new URL(base, window.location.origin); }
  const cid = getCompanyId();
  if (cid) url.searchParams.set("companyId", cid);
  return url.toString();
};

interface Teacher { id: string; name: string; subjectRates?: { subjectId: string; hourlyRate: number; subject: { name: string } }[]; }
interface Payment { id: string; teacherId: string; teacher?: { name: string }; periodFrom: string; periodTo: string; totalSessions: number; totalHours: number; hourlyRate: number; grossAmount: number; deductions: number; netAmount: number; status: string; paidAt?: string; notes?: string; }
interface CalcResult { teacherId: string; periodFrom: string; periodTo: string; totalSessions: number; totalHours: number; grossAmount: number; hourlyRate: number; sessions: { id: string; date: string; subject: string; duration: number }[]; }

export default function EducationTeacherPaymentsPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Calculation modal
  const [calcTeacher, setCalcTeacher] = useState("");
  const [calcFrom, setCalcFrom] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]);
  const [calcTo, setCalcTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [calcRate, setCalcRate] = useState(0);
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [showCalc, setShowCalc] = useState(false);

  // Create payment from calculation
  const [deductions, setDeductions] = useState(0);
  const [paymentNotes, setPaymentNotes] = useState("");

  useEffect(() => { fetchTeachers(); fetchPayments(); }, []);

  const fetchTeachers = async () => {
    try {
      const res = await fetch(api("teachers"), { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setTeachers(data.data);
    } catch (e) { console.error(e); }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTeacher) params.append("teacherId", selectedTeacher);
      if (paymentFilter) params.append("status", paymentFilter);
      const res = await fetch(api(`payments?${params}`), { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setPayments(data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleCalculate = async () => {
    if (!calcTeacher || !calcFrom || !calcTo) return;
    setCalcLoading(true);
    setCalcResult(null);
    try {
      const res = await fetch(api("payments/calculate"), {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ teacherId: calcTeacher, from: calcFrom, to: calcTo, hourlyRate: calcRate })
      });
      const data = await res.json();
      if (data.success) setCalcResult(data.data);
      else alert(data.error || i18n.t("admin_EducationTeacherPaymentsPage.msg_7d6d"));
    } catch (e) { console.error(e); }
    setCalcLoading(false);
  };

  const handleCreatePayment = async () => {
    if (!calcResult) return;
    try {
      const res = await fetch(api("payments"), {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({
          teacherId: calcResult.teacherId,
          periodFrom: calcResult.periodFrom,
          periodTo: calcResult.periodTo,
          totalSessions: calcResult.totalSessions,
          totalHours: calcResult.totalHours,
          hourlyRate: calcResult.hourlyRate,
          grossAmount: calcResult.grossAmount,
          deductions,
          notes: paymentNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(i18n.t("admin_EducationTeacherPaymentsPage.success_create_4d53"));
        setShowCalc(false);
        setCalcResult(null);
        fetchPayments();
      } else alert(data.error || i18n.t("admin_EducationTeacherPaymentsPage.failed_create_3a00"));
    } catch (e) { console.error(e); }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      const res = await fetch(api(`payments/${id}/mark-paid`), { method: "PUT", headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) { fetchPayments(); alert(i18n.t("admin_EducationTeacherPaymentsPage.msg_71a6")); }
      else alert(data.error || i18n.t("admin_EducationTeacherPaymentsPage.msg_88aa"));
    } catch (e) { console.error(e); }
  };

  const statusBadge = (status: string) => {
    const cls = status === "PAID" ? "bg-green-100 text-green-700" : status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
    const label = status === "PAID" ? "مدفوع" : status === "PENDING" ? "معلق" : "ملغي";
    return <span className={`px-2 py-0.5 rounded-full text-xs ${cls}`}>{label}</span>;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">مرتبات المدرسين</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">حساب وإدارة مستحقات المدرسين</p>
        </div>
        <button onClick={() => { setShowCalc(true); setCalcResult(null); setDeductions(0); setPaymentNotes(""); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">حساب مرتب</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center mb-6">
        <div>
          <label className="block text-xs font-medium mb-1">المدرس</label>
          <select className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600" value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}>
            <option value="">الكل</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">الحالة</label>
          <select className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
            <option value="">الكل</option>
            <option value="PENDING">معلق</option>
            <option value="PAID">مدفوع</option>
          </select>
        </div>
        <button onClick={fetchPayments} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 mt-4">بحث</button>
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">جاري التحميل...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
                {["المدرس", "الفترة", "حصص", "ساعات", "الإجمالي", "خصم", "الصافي", "الحالة", ""].map(h => <th key={h} className="text-right py-3 px-4">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                  <td className="py-3 px-4 font-medium">{p.teacher?.name || "—"}</td>
                  <td className="py-3 px-4">{new Date(p.periodFrom).toLocaleDateString("ar-EG")} - {new Date(p.periodTo).toLocaleDateString("ar-EG")}</td>
                  <td className="py-3 px-4">{p.totalSessions}</td>
                  <td className="py-3 px-4">{p.totalHours}</td>
                  <td className="py-3 px-4 font-medium">{p.grossAmount} ج.م</td>
                  <td className="py-3 px-4 text-red-500">{p.deductions > 0 ? `${p.deductions} ج.م` : "—"}</td>
                  <td className="py-3 px-4 font-bold">{p.netAmount} ج.م</td>
                  <td className="py-3 px-4">{statusBadge(p.status)}</td>
                  <td className="py-3 px-4">
                    {p.status === "PENDING" && (
                      <button onClick={() => handleMarkPaid(p.id)} className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">تأكيد الدفع</button>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">لا توجد مدفوعات</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Calculate Modal */}
      {showCalc && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => { if (!calcLoading) setShowCalc(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-6">حساب مرتب المدرس</h3>

            {!calcResult ? (
              <div className="space-y-4">
                <div><label className="block text-sm font-medium mb-1">المدرس</label>
                  <select className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600" value={calcTeacher} onChange={e => {
                    setCalcTeacher(e.target.value);
                    const t = teachers.find(t => t.id === e.target.value);
                    if (t?.subjectRates?.length) setCalcRate(t.subjectRates[0].hourlyRate);
                  }}>
                    <option value="">اختر المدرس</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">من تاريخ</label><input type="date" className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600" value={calcFrom} onChange={e => setCalcFrom(e.target.value)} /></div>
                  <div><label className="block text-sm font-medium mb-1">إلى تاريخ</label><input type="date" className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600" value={calcTo} onChange={e => setCalcTo(e.target.value)} /></div>
                </div>
                <div><label className="block text-sm font-medium mb-1">سعر الساعة (ج.م)</label><input type="number" min={0} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600" value={calcRate} onChange={e => setCalcRate(Number(e.target.value))} /></div>
                <button onClick={handleCalculate} disabled={calcLoading || !calcTeacher} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {calcLoading ? "جاري الحساب..." : "حساب المستحقات"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div><div className="text-2xl font-bold">{calcResult.totalSessions}</div><div className="text-xs text-gray-500">حصص</div></div>
                    <div><div className="text-2xl font-bold">{calcResult.totalHours}</div><div className="text-xs text-gray-500">ساعات</div></div>
                    <div><div className="text-2xl font-bold">{calcResult.hourlyRate} ج.م</div><div className="text-xs text-gray-500">سعر الساعة</div></div>
                    <div><div className="text-2xl font-bold text-green-600">{calcResult.grossAmount} ج.م</div><div className="text-xs text-gray-500">الإجمالي</div></div>
                  </div>
                </div>
                <div><label className="block text-sm font-medium mb-1">الخصم</label><input type="number" min={0} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600" value={deductions} onChange={e => setDeductions(Number(e.target.value))} /></div>
                <div><label className="block text-sm font-medium mb-1">ملاحظات</label><textarea className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600" rows={2} value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} /></div>
                <div className="flex gap-3">
                  <button onClick={handleCreatePayment} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">إنشاء الدفعة ({calcResult.grossAmount - deductions} ج.م)</button>
                  <button onClick={() => setCalcResult(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">تعديل</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
