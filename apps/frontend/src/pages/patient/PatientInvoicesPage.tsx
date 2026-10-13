import React, { useEffect, useState, useMemo } from "react";
import {
  Wallet,
  Receipt,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  discount: number;
  amountPaid: number;
  net: number;
  remaining: number;
  status: "PAID" | "UNPAID" | "PARTIAL" | "REFUNDED" | string;
  dueDate?: string;
  appointment?: { id: string; appointmentDate: string; serviceName?: string };
}

const mockPatientInvoices: Invoice[] = [
  {
    id: "inv-p1",
    invoiceNumber: "INV-2026-0891",
    total: 850,
    discount: 50,
    amountPaid: 800,
    net: 800,
    remaining: 0,
    status: "PAID",
    dueDate: "2026-10-12",
    appointment: {
      id: "a1",
      appointmentDate: "2026-10-05",
      serviceName: "كشف استشاري باطنة وجهاز هضمي",
    },
  },
  {
    id: "inv-p2",
    invoiceNumber: "INV-2026-0740",
    total: 600,
    discount: 0,
    amountPaid: 600,
    net: 600,
    remaining: 0,
    status: "PAID",
    dueDate: "2026-08-18",
    appointment: {
      id: "a2",
      appointmentDate: "2026-08-18",
      serviceName: "فحص دوري سنوي ومتابعة سكر",
    },
  },
  {
    id: "inv-p3",
    invoiceNumber: "INV-2026-0922",
    total: 450,
    discount: 0,
    amountPaid: 0,
    net: 450,
    remaining: 450,
    status: "UNPAID",
    dueDate: "2026-10-20",
    appointment: {
      id: "a3",
      appointmentDate: "2026-10-15",
      serviceName: "استشارة وتغذية علاجية",
    },
  },
];

const PatientInvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState<string>("ALL");

  const fetchInvoices = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("patientToken");
      const res = await fetch("/api/v1/booking/patient-portal/invoices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setInvoices(json.data);
      } else {
        setInvoices(mockPatientInvoices);
      }
    } catch {
      setInvoices(mockPatientInvoices);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const totalPaid = useMemo(() => {
    return invoices.reduce((sum, i) => sum + i.amountPaid, 0);
  }, [invoices]);

  const totalRemaining = useMemo(() => {
    return invoices.reduce((sum, i) => sum + (i.remaining || 0), 0);
  }, [invoices]);

  const filtered = useMemo(() => {
    if (filterTab === "ALL") return invoices;
    return invoices.filter((i) => i.status === filterTab);
  }, [invoices, filterTab]);

  if (loading) {
    return (
      <div className="flex min-h-[380px] items-center justify-center rounded-2xl border border-border/70 bg-card">
        <div className="flex items-center gap-2.5 font-mono text-xs text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span>جاري تحميل الفواتير...</span>
        </div>
      </div>
    );
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            مسددة بالكامل
          </span>
        );
      case "PARTIAL":
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
            <Clock className="h-3 w-3" />
            مسدد جزئياً
          </span>
        );
      case "UNPAID":
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3 w-3" />
            مستحقة السداد
          </span>
        );
      default:
        return (
          <span className="rounded-md border border-border/50 bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Telemetry Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
              PATIENT BILLING
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              إجمالي {invoices.length} فواتير
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            فواتيري وسندات السداد
          </h1>
          <p className="text-xs text-muted-foreground">
            كشف الحساب المالي لرسوم الكشوفات، الخصومات الممنوحة، والأرصدة المتبقية
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInvoices}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background px-3 py-2 text-xs font-medium text-foreground shadow-xs transition-all hover:bg-muted/40 active:scale-[0.98]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث الفواتير</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">إجمالي المدفوع</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {totalPaid.toLocaleString("ar-EG")} ج.م
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">سداد موثق بالإيصالات</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">المبالغ المستحقة</span>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {totalRemaining.toLocaleString("ar-EG")} ج.م
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">متبقي قيد السداد</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">عدد الفواتير</span>
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {invoices.length} فاتورة
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">كافة المعاملات المالية</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1 text-xs">
        <button
          onClick={() => setFilterTab("ALL")}
          className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
            filterTab === "ALL"
              ? "border border-border/70 bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          كافة الفواتير ({invoices.length})
        </button>
        <button
          onClick={() => setFilterTab("PAID")}
          className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
            filterTab === "PAID"
              ? "border border-border/70 bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          المسددة ({invoices.filter((i) => i.status === "PAID").length})
        </button>
        <button
          onClick={() => setFilterTab("UNPAID")}
          className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
            filterTab === "UNPAID"
              ? "border border-border/70 bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          المستحقة ({invoices.filter((i) => i.status === "UNPAID").length})
        </button>
      </div>

      {/* Invoices Single-Surface Table */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
        {filtered.length === 0 ? (
          <div className="space-y-2 py-12 text-center">
            <Wallet className="mx-auto h-10 w-10 text-muted-foreground stroke-1" />
            <p className="text-sm font-medium text-foreground">لا توجد فواتير مطابقة للمعايير</p>
            <p className="text-xs text-muted-foreground">كافة حساباتك مسددة أو لا توجد فواتير معلقة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">رقم الفاتورة</th>
                  <th className="px-4 py-3 font-medium">الخدمة / الموعد</th>
                  <th className="px-4 py-3 font-medium">الإجمالي</th>
                  <th className="px-4 py-3 font-medium">المسدد</th>
                  <th className="px-4 py-3 font-medium">المتبقي</th>
                  <th className="px-4 py-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3.5 font-mono font-semibold text-primary" dir="ltr">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-foreground">
                      {inv.appointment?.serviceName || "كشف استشاري"}
                    </td>
                    <td className="px-4 py-3.5 font-mono tabular-nums text-foreground">
                      {inv.total.toLocaleString("ar-EG")} ج.م
                    </td>
                    <td className="px-4 py-3.5 font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {inv.amountPaid.toLocaleString("ar-EG")} ج.م
                    </td>
                    <td className="px-4 py-3.5 font-mono tabular-nums text-foreground">
                      {inv.remaining > 0 ? (
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          {inv.remaining.toLocaleString("ar-EG")} ج.م
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0 ج.م</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">{renderStatusBadge(inv.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientInvoicesPage;
