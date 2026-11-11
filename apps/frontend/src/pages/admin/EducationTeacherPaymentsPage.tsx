import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  X,
  Filter,
} from "lucide-react";
import { DateInput } from '../../components/ui/DateInput';

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
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

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
  const [calcError, setCalcError] = useState("");
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
      if (data.success && Array.isArray(data.data)) {
        setTeachers(data.data);
      } else {
        setTeachers([]);
      }
    } catch {
      setTeachers([]);
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
      if (data.success && Array.isArray(data.data)) {
        setPayments(data.data);
      } else {
        setPayments([]);
      }
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (!calcTeacher || !calcFrom || !calcTo) return;
    setCalcLoading(true);
    setCalcResult(null);
    setCalcError("");
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
        setCalcError(data.error || (isEn ? "Failed to calculate dues" : "فشل احتساب المستحقات"));
      }
    } catch {
      setCalcError(isEn ? "Failed to connect to server. Please try again" : "تعذر الاتصال بالخادم لاحتساب المستحقات. حاول مرة أخرى");
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
        setShowCalc(false);
        setCalcResult(null);
        fetchPayments();
      } else {
        alert(data.error || (isEn ? "Failed to record payment" : "فشل تسجيل الدفعة"));
      }
    } catch {
      alert(isEn ? "Failed to connect to server. Please try again" : "تعذر الاتصال بالخادم لتسجيل الدفعة. حاول مرة أخرى");
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      const res = await fetch(api(`payments/${id}/mark-paid`), { method: "PUT", headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        fetchPayments();
      } else {
        alert(data.error || (isEn ? "Failed to confirm payment" : "فشل تأكيد الدفع"));
      }
    } catch {
      alert(isEn ? "Failed to connect to server. Please try again" : "تعذر الاتصال بالخادم لتأكيد الدفع. حاول مرة أخرى");
    }
  };

  const stats = useMemo(() => {
    const totalPayments = payments.length;
    const paidAmount = payments.filter((p) => p.status === "PAID").reduce((acc, p) => acc + (p.netAmount || 0), 0);
    const pendingAmount = payments.filter((p) => p.status === "PENDING").reduce((acc, p) => acc + (p.netAmount || 0), 0);
    const totalHours = payments.reduce((acc, p) => acc + (p.totalHours || 0), 0);
    return { totalPayments, paidAmount, pendingAmount, totalHours };
  }, [payments]);

  return (
    <div
      className="w-full h-full min-h-0 flex-1 overflow-y-auto max-w-[1600px] mx-auto p-3.5 sm:p-5 lg:p-6 pb-24 sm:pb-12 space-y-4 sm:space-y-5 font-sans"
      dir={isEn ? "ltr" : "rtl"}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Wallet className="w-3.5 h-3.5" />
              {t("education.payments.badge", isEn ? "Financial Dues" : "المستحقات المالية")}
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {stats.totalPayments} {t("education.payments.recordsCount", isEn ? "records" : "مسير دفع مسجل")}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {t("education.payments.title", isEn ? "Instructor Salaries & Dues" : "مرتبات ومستحقات المهندسين")}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t(
              "education.payments.subtitle",
              isEn
                ? "Calculate completed session dues, process payroll, and apply academic deductions"
                : "احتساب مستحقات الحصص المنفذة وصرف المرتبات والخصومات الأكاديمية"
            )}
          </p>
        </div>

        <button
          onClick={() => {
            setShowCalc(true);
            setCalcResult(null);
            setCalcError("");
            setDeductions(0);
            setPaymentNotes("");
          }}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-all"
        >
          <Calculator className="w-4 h-4" />
          {t("education.payments.calcButton", isEn ? "Calculate Teacher Payroll" : "حساب مرتب مدرس")}
        </button>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border/80 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              {t("education.payments.completedPayments", isEn ? "Completed Payments" : "المدفوعات المكتملة")}
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {stats.paidAmount.toLocaleString()} {t("education.common.egp", isEn ? "EGP" : "ج.م")}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              {t("education.payments.pendingDues", isEn ? "Pending Dues" : "المستحقات المعلقة")}
            </div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
              {stats.pendingAmount.toLocaleString()} {t("education.common.egp", isEn ? "EGP" : "ج.م")}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              {t("education.payments.totalHoursDisbursed", isEn ? "Total Disbursed Hours" : "إجمالي الساعات المصروفة")}
            </div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
              {stats.totalHours.toLocaleString()} {t("education.common.hour", isEn ? "hrs" : "ساعة")}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Users className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border border-border/80 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              className="bg-background border border-input rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-w-[180px]"
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
            >
              <option value="">
                {t("education.payments.allTeachers", isEn ? "All Instructors" : "كل المهندسين")} ({teachers.length})
              </option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              className="bg-background border border-input rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="">{t("education.payments.allStatuses", isEn ? "All Statuses" : "كل الحالات")}</option>
              <option value="PENDING">{t("education.payments.pending", isEn ? "Pending" : "معلق")}</option>
              <option value="PAID">{t("education.payments.paid", isEn ? "Paid" : "مدفوع")}</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchPayments}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-xs"
        >
          <Search className="w-3.5 h-3.5" />
          {t("education.payments.updateLog", isEn ? "Refresh Log" : "تحديث السجل")}
        </button>
      </div>

      {/* Payments Table */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                <th className={`py-3 px-4 font-semibold ${isEn ? "text-left" : "text-right"}`}>
                  {t("education.payments.colTeacher", isEn ? "Instructor" : "المهندس")}
                </th>
                <th className={`py-3 px-4 font-semibold ${isEn ? "text-left" : "text-right"}`}>
                  {t("education.payments.colPeriod", isEn ? "Period" : "الفترة المحتسبة")}
                </th>
                <th className={`py-3 px-4 font-semibold ${isEn ? "text-left" : "text-right"}`}>
                  {t("education.payments.colSessions", isEn ? "Sessions" : "الحصص")}
                </th>
                <th className={`py-3 px-4 font-semibold ${isEn ? "text-left" : "text-right"}`}>
                  {t("education.payments.colHours", isEn ? "Hours" : "الساعات")}
                </th>
                <th className={`py-3 px-4 font-semibold ${isEn ? "text-left" : "text-right"}`}>
                  {t("education.payments.colGross", isEn ? "Gross" : "الإجمالي")}
                </th>
                <th className={`py-3 px-4 font-semibold ${isEn ? "text-left" : "text-right"}`}>
                  {t("education.payments.colDeductions", isEn ? "Deductions" : "الخصومات")}
                </th>
                <th className={`py-3 px-4 font-semibold ${isEn ? "text-left" : "text-right"}`}>
                  {t("education.payments.colNet", isEn ? "Net Due" : "الصافي المستحق")}
                </th>
                <th className={`py-3 px-4 font-semibold ${isEn ? "text-left" : "text-right"}`}>
                  {t("education.payments.colStatus", isEn ? "Status" : "الحالة")}
                </th>
                <th className={`py-3 px-4 font-semibold ${isEn ? "text-right" : "text-left"}`}>
                  {t("education.payments.colAction", isEn ? "Action" : "الإجراء")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {payments.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 px-4 text-center text-xs text-muted-foreground">
                    {loading
                      ? t("education.common.loading", isEn ? "Loading..." : "جاري التحميل...")
                      : t("education.payments.noData", isEn ? "No records found" : "لا توجد بيانات بعد")}
                  </td>
                </tr>
              )}
              {payments.map((p) => {
                const isPaid = p.status === "PAID";
                const isPending = p.status === "PENDING";
                const locale = isEn ? "en-US" : "ar-EG";
                return (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-semibold text-foreground">{p.teacher?.name || "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground font-mono tabular-nums">
                      {new Date(p.periodFrom).toLocaleDateString(locale)} — {new Date(p.periodTo).toLocaleDateString(locale)}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-foreground">{p.totalSessions}</td>
                    <td className="py-3 px-4 font-mono tabular-nums text-foreground">{p.totalHours}</td>
                    <td className="py-3 px-4 font-mono tabular-nums text-foreground font-medium">
                      {p.grossAmount} {t("education.common.egp", isEn ? "EGP" : "ج.م")}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-red-600 dark:text-red-400">
                      {p.deductions > 0 ? `-${p.deductions} ${t("education.common.egp", isEn ? "EGP" : "ج.م")}` : "—"}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums font-bold text-foreground">
                      {p.netAmount} {t("education.common.egp", isEn ? "EGP" : "ج.م")}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          isPaid
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : isPending
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                        }`}
                      >
                        {isPaid ? <CheckCircle2 className="w-3 h-3" /> : isPending ? <Clock className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {isPaid
                          ? t("education.payments.paid", isEn ? "Paid" : "مدفوع")
                          : isPending
                          ? t("education.payments.pending", isEn ? "Pending" : "معلق")
                          : t("education.payments.cancelled", isEn ? "Cancelled" : "ملغي")}
                      </span>
                    </td>
                    <td className={`py-3 px-4 ${isEn ? "text-right" : "text-left"}`}>
                      {p.status === "PENDING" && (
                        <button
                          onClick={() => handleMarkPaid(p.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-medium hover:bg-emerald-700 shadow-xs transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {t("education.payments.confirmPayment", isEn ? "Confirm Payment" : "تأكيد الدفع")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calculate Modal */}
      {showCalc && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => {
            if (!calcLoading) setShowCalc(false);
          }}
          dir={isEn ? "ltr" : "rtl"}
        >
          <div
            className="bg-card border border-border/80 rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-lg mx-auto space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Calculator className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  {t("education.payments.modalTitle", isEn ? "Calculate Instructor Dues" : "حساب مستحقات المهندس")}
                </h3>
              </div>
              <button
                onClick={() => setShowCalc(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!calcResult ? (
              <div className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">
                    {t("education.payments.fieldTeacher", isEn ? "Instructor" : "المهندس")}
                  </label>
                  <select
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                    value={calcTeacher}
                    onChange={(e) => {
                      setCalcTeacher(e.target.value);
                      const tObj = teachers.find((t) => t.id === e.target.value);
                      if (tObj?.subjectRates?.length) setCalcRate(tObj.subjectRates[0].hourlyRate);
                    }}
                  >
                    <option value="">
                      {t("education.payments.selectTeacher", isEn ? "Select Instructor" : "اختر المهندس")}
                    </option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      {t("education.payments.fromDate", isEn ? "From Date" : "من تاريخ")}
                    </label>
                    <DateInput
                      className="w-full bg-background border border-input rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs font-mono"
                      value={calcFrom}
                      onChange={(e) => setCalcFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      {t("education.payments.toDate", isEn ? "To Date" : "إلى تاريخ")}
                    </label>
                    <DateInput
                      className="w-full bg-background border border-input rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs font-mono"
                      value={calcTo}
                      onChange={(e) => setCalcTo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">
                    {t("education.payments.hourlyRate", isEn ? "Approved Hourly Rate (EGP)" : "سعر الساعة المعتمد (ج.م)")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full bg-background border border-input rounded-lg px-3 py-1.5 text-foreground font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                    value={calcRate}
                    onChange={(e) => setCalcRate(Number(e.target.value))}
                  />
                </div>

                <button
                  onClick={handleCalculate}
                  disabled={calcLoading || !calcTeacher}
                  className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all text-xs shadow-xs"
                >
                  {calcLoading
                    ? t("education.payments.calculating", isEn ? "Calculating hours and sessions..." : "جاري احتساب الساعات والحصص...")
                    : t("education.payments.calcGross", isEn ? "Calculate Total Dues" : "حساب المستحقات الإجمالية")}
                </button>

                {calcError && (
                  <div className="flex items-start gap-1.5 text-[11px] text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{calcError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3.5 text-xs">
                <div className="bg-muted/40 border border-border/80 rounded-xl p-3">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-lg font-bold font-mono tabular-nums text-foreground">
                        {calcResult.totalSessions}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {t("education.payments.sessions", isEn ? "Sessions" : "الحصص")}
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold font-mono tabular-nums text-foreground">
                        {calcResult.totalHours}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {t("education.payments.hours", isEn ? "Hours" : "الساعات")}
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold font-mono tabular-nums text-foreground">
                        {calcResult.hourlyRate}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {t("education.payments.ratePerHr", isEn ? "Rate/hr" : "السعر/س")}
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        {calcResult.grossAmount} {t("education.common.egp", isEn ? "EGP" : "ج.م")}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {t("education.payments.grossTotal", isEn ? "Total" : "الإجمالي")}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">
                    {t("education.payments.deductionsField", isEn ? "Deductions or Penalties (EGP)" : "الخصومات أو الاستقطاعات (ج.م)")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full bg-background border border-input rounded-lg px-3 py-1.5 text-foreground font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                    value={deductions}
                    onChange={(e) => setDeductions(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">
                    {t("education.payments.notesField", isEn ? "Payment & Transfer Notes" : "ملاحظات الصرف والتحويل")}
                  </label>
                  <textarea
                    rows={2}
                    className="w-full bg-background border border-input rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border/80">
                  <button
                    onClick={handleCreatePayment}
                    className="flex-1 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors text-xs shadow-xs"
                  >
                    {t("education.payments.approveAndCreate", isEn ? "Approve & Create Payment" : "اعتماد وإنشاء الدفعة")} (
                    {(calcResult.grossAmount - deductions).toLocaleString()} {t("education.common.egp", isEn ? "EGP" : "ج.م")})
                  </button>
                  <button
                    onClick={() => setCalcResult(null)}
                    className="px-3 py-2 bg-muted text-foreground font-medium rounded-lg hover:bg-muted/80 transition-colors text-xs"
                  >
                    {t("education.common.edit", isEn ? "Edit" : "تعديل")}
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