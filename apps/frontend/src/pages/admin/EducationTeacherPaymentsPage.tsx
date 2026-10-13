import { useState, useEffect, useMemo } from "react";
import i18n from "../../i18n";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import {
  Wallet,
  Calculator,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Calendar,
  FileText,
  DollarSign,
  X,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

const getCompanyId = (): string | null => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}").companyId || null;
  } catch {
    return null;
  }
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
  try {
    url = new URL(base);
  } catch {
    url = new URL(base, window.location.origin);
  }
  const cid = getCompanyId();
  if (cid) url.searchParams.set("companyId", cid);
  return url.toString();
};

interface Teacher {
  id: string;
  name: string;
  subjectRates?: { subjectId: string; hourlyRate: number; subject: { name: string } }[];
}

interface Payment {
  id: string;
  teacherId: string;
  teacher?: { name: string };
  periodFrom: string;
  periodTo: string;
  totalSessions: number;
  totalHours: number;
  hourlyRate: number;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  status: string;
  paidAt?: string;
  notes?: string;
}

interface CalcResult {
  teacherId: string;
  periodFrom: string;
  periodTo: string;
  totalSessions: number;
  totalHours: number;
  grossAmount: number;
  hourlyRate: number;
  sessions: { id: string; date: string; subject: string; duration: number }[];
}

export default function EducationTeacherPaymentsPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Calculation modal
  const [calcTeacher, setCalcTeacher] = useState("");
  const [calcFrom, setCalcFrom] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [calcTo, setCalcTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [calcRate, setCalcRate] = useState(0);
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [showCalc, setShowCalc] = useState(false);

  // Create payment from calculation
  const [deductions, setDeductions] = useState(0);
  const [paymentNotes, setPaymentNotes] = useState("");

  useEffect(() => {
    fetchTeachers();
    fetchPayments();
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await fetch(api("teachers"), { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setTeachers(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTeacher) params.append("teacherId", selectedTeacher);
      if (paymentFilter) params.append("status", paymentFilter);
      const res = await fetch(api(`payments?${params}`), { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setPayments(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (!calcTeacher || !calcFrom || !calcTo) return;
    setCalcLoading(true);
    setCalcResult(null);
    try {
      const res = await fetch(api("payments/calculate"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ teacherId: calcTeacher, from: calcFrom, to: calcTo, hourlyRate: calcRate }),
      });
      const data = await res.json();
      if (data.success) {
        setCalcResult(data.data);
      } else {
        alert(data.error || i18n.t("EducationTeacherPaymentsPage.msg_7d6d"));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCalcLoading(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!calcResult) return;
    try {
      const res = await fetch(api("payments"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          teacherId: calcResult.teacherId,
          periodFrom: calcResult.periodFrom,
          periodTo: calcResult.periodTo,
          totalSessions: calcResult.totalSessions,
          totalHours: calcResult.totalHours,
          hourlyRate: calcResult.hourlyRate,
          grossAmount: calcResult.grossAmount,
          deductions,
          notes: paymentNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(i18n.t("EducationTeacherPaymentsPage.success_create_4d53"));
        setShowCalc(false);
        setCalcResult(null);
        fetchPayments();
      } else {
        alert(data.error || i18n.t("EducationTeacherPaymentsPage.failed_create_3a00"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      const res = await fetch(api(`payments/${id}/mark-paid`), { method: "PUT", headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        fetchPayments();
        alert(i18n.t("EducationTeacherPaymentsPage.msg_71a6"));
      } else {
        alert(data.error || i18n.t("EducationTeacherPaymentsPage.msg_88aa"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const statusBadge = (status: string) => {
    const isPaid = status === "PAID";
    const isPending = status === "PENDING";
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
          isPaid
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            : isPending
            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
        }`}
      >
        {isPaid ? "مدفوع" : isPending ? "معلق" : "ملغي"}
      </span>
    );
  };

  const stats = useMemo(() => {
    const totalPayments = payments.length;
    const paidAmount = payments.filter((p) => p.status === "PAID").reduce((acc, p) => acc + (p.netAmount || 0), 0);
    const pendingAmount = payments.filter((p) => p.status === "PENDING").reduce((acc, p) => acc + (p.netAmount || 0), 0);
    const totalHours = payments.reduce((acc, p) => acc + (p.totalHours || 0), 0);
    return { totalPayments, paidAmount, pendingAmount, totalHours };
  }, [payments]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 rtl font-sans" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Wallet className="w-3.5 h-3.5" />
              المستحقات المالية
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {stats.totalPayments} دفعة مسجلة
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            مرتبات ومستحقات المدرسين
          </h1>
          <p className="text-xs text-muted-foreground">
            حساب مستحقات الحصص الأكاديمية المنفذة وصرف المرتبات والخصومات
          </p>
        </div>

        <button
          onClick={() => {
            setShowCalc(true);
            setCalcResult(null);
            setDeductions(0);
            setPaymentNotes("");
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Calculator className="w-4 h-4" />
          حساب مرتب مدرس
        </button>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">المدفوعات المكتملة</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {stats.paidAmount} ج.م
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">المستحقات المعلقة</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
              {stats.pendingAmount} ج.م
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">إجمالي الساعات المصروفة</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
              {stats.totalHours} ساعة
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">المدرس:</span>
            <select
              className="bg-background border border-input rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
            >
              <option value="">كل المدرسين ({teachers.length})</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">الحالة:</span>
            <select
              className="bg-background border border-input rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="">كل الحالات</option>
              <option value="PENDING">معلق</option>
              <option value="PAID">مدفوع</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchPayments}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-xs"
        >
          <Search className="w-3.5 h-3.5" />
          تحديث البحث
        </button>
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">جاري تحميل سجل المدفوعات...</span>
        </div>
      ) : (
        <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground text-xs">
                {["المدرس", "الفترة المحتسبة", "الحصص", "الساعات", "الإجمالي", "الخصومات", "الصافي المستحق", "الحالة", ""].map((h) => (
                  <th key={h} className="text-right py-3 px-4 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors text-xs">
                  <td className="py-3 px-4 font-semibold text-foreground">{p.teacher?.name || "—"}</td>
                  <td className="py-3 px-4 text-muted-foreground font-mono">
                    {new Date(p.periodFrom).toLocaleDateString("ar-EG")} — {new Date(p.periodTo).toLocaleDateString("ar-EG")}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-foreground">{p.totalSessions}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-foreground">{p.totalHours}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-foreground font-medium">{p.grossAmount} ج.م</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-red-600 dark:text-red-400">
                    {p.deductions > 0 ? `-${p.deductions} ج.م` : "—"}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums font-bold text-foreground">{p.netAmount} ج.م</td>
                  <td className="py-3 px-4">{statusBadge(p.status)}</td>
                  <td className="py-3 px-4 text-left">
                    {p.status === "PENDING" && (
                      <button
                        onClick={() => handleMarkPaid(p.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 shadow-xs transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        تأكيد الدفع
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-xs text-muted-foreground">
                    لا توجد مستحقات مسجلة حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Calculate Modal */}
      {showCalc && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => {
            if (!calcLoading) setShowCalc(false);
          }}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Calculator className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-foreground">حساب مستحقات المدرس</h3>
              </div>
              <button
                onClick={() => setShowCalc(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!calcResult ? (
              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">المدرس *</label>
                  <select
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    value={calcTeacher}
                    onChange={(e) => {
                      setCalcTeacher(e.target.value);
                      const t = teachers.find((t) => t.id === e.target.value);
                      if (t?.subjectRates?.length) setCalcRate(t.subjectRates[0].hourlyRate);
                    }}
                  >
                    <option value="">اختر المدرس</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">من تاريخ</label>
                    <input
                      type="date"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      value={calcFrom}
                      onChange={(e) => setCalcFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">إلى تاريخ</label>
                    <input
                      type="date"
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      value={calcTo}
                      onChange={(e) => setCalcTo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">سعر الساعة المعتمد (ج.م)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    value={calcRate}
                    onChange={(e) => setCalcRate(Number(e.target.value))}
                  />
                </div>

                <button
                  onClick={handleCalculate}
                  disabled={calcLoading || !calcTeacher}
                  className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm"
                >
                  {calcLoading ? "جاري احتساب الساعات والحصص..." : "حساب المستحقات الإجمالية"}
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Result Card */}
                <div className="bg-muted/40 border border-border/80 rounded-xl p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="space-y-1">
                      <div className="text-xl font-bold font-mono tabular-nums text-foreground">
                        {calcResult.totalSessions}
                      </div>
                      <div className="text-[11px] text-muted-foreground">إجمالي الحصص</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xl font-bold font-mono tabular-nums text-foreground">
                        {calcResult.totalHours}
                      </div>
                      <div className="text-[11px] text-muted-foreground">عدد الساعات</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xl font-bold font-mono tabular-nums text-foreground">
                        {calcResult.hourlyRate} ج.م
                      </div>
                      <div className="text-[11px] text-muted-foreground">سعر الساعة</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        {calcResult.grossAmount} ج.م
                      </div>
                      <div className="text-[11px] text-muted-foreground">الإجمالي المستحق</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">الخصومات أو الاستقطاعات (ج.م)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    value={deductions}
                    onChange={(e) => setDeductions(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">ملاحظات الصرف والتحويل</label>
                  <textarea
                    rows={2}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2.5 pt-3 border-t border-border/80">
                  <button
                    onClick={handleCreatePayment}
                    className="flex-1 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    اعتماد وإنشاء الدفعة ({calcResult.grossAmount - deductions} ج.م)
                  </button>
                  <button
                    onClick={() => setCalcResult(null)}
                    className="px-4 py-2 bg-muted text-foreground font-medium rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    تعديل المعايير
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
