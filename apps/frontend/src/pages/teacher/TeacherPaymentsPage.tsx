import React, { useEffect, useState, useMemo } from "react";
import {
  Wallet,
  Calendar,
  Clock,
  DollarSign,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  TrendingUp,
  Download
} from "lucide-react";

interface Payment {
  id: string;
  periodFrom: string;
  periodTo: string;
  totalSessions: number;
  totalHours: number;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  status: "PAID" | "PENDING";
  paidAt: string | null;
}

const mockPaymentsData: Payment[] = [
  {
    id: "pay-101",
    periodFrom: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    periodTo: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    totalSessions: 28,
    totalHours: 35,
    grossAmount: 5250,
    deductions: 250,
    netAmount: 5000,
    status: "PAID",
    paidAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
  },
  {
    id: "pay-102",
    periodFrom: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    periodTo: new Date(Date.now() - 1000 * 60 * 60 * 24 * 31).toISOString(),
    totalSessions: 32,
    totalHours: 40,
    grossAmount: 6000,
    deductions: 0,
    netAmount: 6000,
    status: "PAID",
    paidAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 31).toISOString()
  },
  {
    id: "pay-103",
    periodFrom: new Date().toISOString(),
    periodTo: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    totalSessions: 14,
    totalHours: 18,
    grossAmount: 2700,
    deductions: 100,
    netAmount: 2600,
    status: "PENDING",
    paidAt: null
  }
];

const TeacherPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "PENDING">("ALL");

  const fetchPayments = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("teacherToken");
      const res = await fetch("/api/v1/education/teacher-portal/payments", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setPayments(json.data);
      } else {
        setPayments(mockPaymentsData);
      }
    } catch {
      setPayments(mockPaymentsData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const totalPaid = useMemo(() => {
    return payments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + p.netAmount, 0);
  }, [payments]);

  const totalPending = useMemo(() => {
    return payments
      .filter((p) => p.status === "PENDING")
      .reduce((sum, p) => sum + p.netAmount, 0);
  }, [payments]);

  const totalTeachingHours = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.totalHours, 0);
  }, [payments]);

  const filteredPayments = useMemo(() => {
    if (statusFilter === "ALL") return payments;
    return payments.filter((p) => p.status === statusFilter);
  }, [payments, statusFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] space-y-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-mono text-muted-foreground uppercase">جاري تحميل سجل المرتبات والمستحقات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* Telemetry Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              EARNINGS & SETTLEMENTS
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              سجل الدورات المالية
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">المرتبات والمستحقات المالية</h1>
          <p className="text-xs text-muted-foreground">
            كشف الحساب التفصيلي لساعات التدريس، البدلات، والاستقطاعات المعتمدة
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchPayments}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث السجل</span>
          </button>
        </div>
      </div>

      {/* Financial Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-muted-foreground">إجمالي المبالغ المصروفة</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {totalPaid.toLocaleString("ar-EG")} ج.م
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">تم تحويلها لحسابك بنجاح</div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-muted-foreground">المستحقات المعلقة</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {totalPending.toLocaleString("ar-EG")} ج.م
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">قيد الاعتماد بالدورة القادمة</div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-muted-foreground">إجمالي ساعات التدريس</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {totalTeachingHours} ساعة
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">خلال الفترات المسجلة</div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-muted-foreground">عدد مسيرات الرواتب</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {payments.length} مسيرات
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">كشوفات مالية موثقة</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border/50 text-xs w-fit">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`px-3 py-1.5 rounded-md font-medium transition-all ${
            statusFilter === "ALL"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          كافة الكشوفات ({payments.length})
        </button>
        <button
          onClick={() => setStatusFilter("PAID")}
          className={`px-3 py-1.5 rounded-md font-medium transition-all ${
            statusFilter === "PAID"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          المدفوعة فقط ({payments.filter((p) => p.status === "PAID").length})
        </button>
        <button
          onClick={() => setStatusFilter("PENDING")}
          className={`px-3 py-1.5 rounded-md font-medium transition-all ${
            statusFilter === "PENDING"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          المعلقة ({payments.filter((p) => p.status === "PENDING").length})
        </button>
      </div>

      {/* Payments Single-Surface List */}
      <div className="rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <Wallet className="w-10 h-10 text-muted-foreground mx-auto stroke-1" />
            <p className="text-sm font-medium text-foreground">لا توجد كشوفات مرتبات مطابقة</p>
            <p className="text-xs text-muted-foreground">سيتم إدراج المستحقات الجديدة فور نهاية الدورة المحاسبية</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredPayments.map((p) => {
              const fromStr = new Date(p.periodFrom).toLocaleDateString("ar-EG");
              const toStr = new Date(p.periodTo).toLocaleDateString("ar-EG");
              return (
                <div key={p.id} className="p-5 hover:bg-muted/30 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">
                          الفترة: من {fromStr} إلى {toStr}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-mono tabular-nums">{p.totalSessions} حصة منفذة</span>
                        <span>•</span>
                        <span className="font-mono tabular-nums">{p.totalHours} ساعة تدريس</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-left font-mono">
                        <div className="text-lg font-bold tabular-nums text-foreground">
                          {p.netAmount.toLocaleString("ar-EG")} ج.م
                        </div>
                        <div className="text-[11px] text-muted-foreground">الصافي المستحق</div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          p.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }`}
                      >
                        {p.status === "PAID" ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            مدفوع
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            قيد الاعتماد
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Financial Breakdown strip */}
                  <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border/50 text-xs text-muted-foreground font-mono">
                    <span>الإجمالي المستحق: {p.grossAmount.toLocaleString("ar-EG")} ج.م</span>
                    <span>•</span>
                    <span className={p.deductions > 0 ? "text-destructive" : ""}>
                      الخصومات والاستقطاعات: {p.deductions.toLocaleString("ar-EG")} ج.م
                    </span>
                    {p.paidAt && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600">
                          تاريخ الصرف: {new Date(p.paidAt).toLocaleDateString("ar-EG")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherPaymentsPage;
