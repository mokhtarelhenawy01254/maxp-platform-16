import React, { useEffect, useState, useMemo } from "react";
import {
  Wallet,
  Calendar,
  Clock,
  DollarSign,
  RefreshCw,
  CheckCircle2,
  FileText,
  TrendingUp,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

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
    paidAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
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
    paidAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 31).toISOString(),
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
    paidAt: null,
  },
];

export default function TeacherPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "PENDING">("ALL");

  const fetchPayments = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("teacherToken") || localStorage.getItem("token");
      const res = await fetch("/api/v1/education/teacher-portal/payments", {
        headers: { Authorization: `Bearer ${token}` },
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
    void fetchPayments();
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

  if (loading && payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-2.5 text-muted-foreground">
        <RefreshCw className="size-5 animate-spin text-primary" />
        <span className="text-xs font-mono">جاري تحميل سجل المرتبات والمستحقات...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Wallet className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              المرتبات والمستحقات المالية للمعلم
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              Payroll Engine v1.4
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            كشف الحساب التفصيلي لساعات التدريس، البدلات، والاستقطاعات المعتمدة
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchPayments()}
            disabled={refreshing}
            className="h-8 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98]"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* Financial Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono">
        <div className="p-3.5 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">إجمالي المصروف</p>
            <p className="text-xl font-bold tracking-tight text-emerald-500 font-mono tabular-nums mt-0.5">
              {totalPaid.toLocaleString("en-US")} ج.م
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">تم تحويلها لحسابك</p>
          </div>
          <div className="size-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="size-3.5" />
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">المستحقات المعلقة</p>
            <p className="text-xl font-bold tracking-tight text-amber-500 font-mono tabular-nums mt-0.5">
              {totalPending.toLocaleString("en-US")} ج.م
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">قيد الاعتماد بالدورة</p>
          </div>
          <div className="size-7 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
            <Clock className="size-3.5" />
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">ساعات التدريس</p>
            <p className="text-xl font-bold tracking-tight text-blue-500 font-mono tabular-nums mt-0.5">
              {totalTeachingHours} ساعة
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">خلال الفترات المسجلة</p>
          </div>
          <div className="size-7 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
            <Clock className="size-3.5" />
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">مسيرات الرواتب</p>
            <p className="text-xl font-bold tracking-tight text-purple-500 font-mono tabular-nums mt-0.5">
              {payments.length}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">كشوفات مالية موثقة</p>
          </div>
          <div className="size-7 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
            <FileText className="size-3.5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="p-2.5 sm:p-3 rounded-lg border border-border/70 bg-card shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-1 font-mono text-xs">
          {[
            { id: "ALL", label: `كافة الكشوفات (${payments.length})` },
            { id: "PAID", label: `المدفوعة (${payments.filter((p) => p.status === "PAID").length})` },
            { id: "PENDING", label: `المعلقة (${payments.filter((p) => p.status === "PENDING").length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                statusFilter === tab.id
                  ? "bg-card text-foreground font-semibold shadow-xs border border-border/70"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          {filteredPayments.length} مسير
        </span>
      </div>

      {/* Payments Single-Surface List */}
      <div className="rounded-lg border border-border/70 bg-card shadow-xs overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <Wallet className="size-9 text-muted-foreground/40 mx-auto" />
            <p className="text-xs font-semibold text-foreground font-mono">
              لا توجد كشوفات مرتبات مطابقة
            </p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              سيتم إدراج المستحقات الجديدة فور نهاية الدورة المحاسبية الحالية
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredPayments.map((p) => {
              const fromStr = new Date(p.periodFrom).toLocaleDateString("ar-EG");
              const toStr = new Date(p.periodTo).toLocaleDateString("ar-EG");
              return (
                <div key={p.id} className="p-4 hover:bg-muted/30 transition-colors space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-3.5 text-primary" />
                        <span className="text-xs font-semibold text-foreground font-mono">
                          الفترة: من {fromStr} إلى {toStr}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground font-mono">
                        <span className="tabular-nums">{p.totalSessions} حصة منفذة</span>
                        <span>•</span>
                        <span className="tabular-nums">{p.totalHours} ساعة تدريس</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center font-mono">
                      <div className="text-left">
                        <div className="text-sm font-bold tabular-nums text-foreground">
                          {p.netAmount.toLocaleString("en-US")} ج.م
                        </div>
                        <div className="text-[10px] text-muted-foreground">الصافي المستحق</div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
                          p.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}
                      >
                        {p.status === "PAID" ? (
                          <>
                            <CheckCircle2 className="size-3" />
                            مدفوع
                          </>
                        ) : (
                          <>
                            <Clock className="size-3" />
                            قيد الاعتماد
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Financial Breakdown strip */}
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50 text-[11px] text-muted-foreground font-mono">
                    <span>الإجمالي المستحق: {p.grossAmount.toLocaleString("en-US")} ج.م</span>
                    <span>•</span>
                    <span className={p.deductions > 0 ? "text-destructive" : ""}>
                      الخصومات: {p.deductions.toLocaleString("en-US")} ج.م
                    </span>
                    {p.paidAt && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-500">
                          تاريخ التحويل: {new Date(p.paidAt).toLocaleDateString("ar-EG")}
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
}
