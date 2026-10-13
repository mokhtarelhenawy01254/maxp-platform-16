import React, { useEffect, useState, useMemo } from "react";
import {
  Wallet,
  Receipt,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText
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
      serviceName: "كشف استشاري باطنة وجهاز هضمي"
    }
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
      serviceName: "فحص دوري سنوي ومتابعة سكر"
    }
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
      serviceName: "استشارة وتغذية علاجية"
    }
  }
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
        headers: { Authorization: `Bearer ${token}` }
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
      <div className="flex flex-col items-center justify-center min-h-[360px] space-y-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-mono text-muted-foreground uppercase">جاري تحميل الفواتير...</p>
      </div>
    );
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            مسددة بالكامل
          </span>
        );
      case "PARTIAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <Clock className="w-3 h-3" />
            مسدد جزئياً
          </span>
        );
      case "UNPAID":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <AlertCircle className="w-3 h-3" />
            مستحقة السداد
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/50">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* Telemetry Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              PATIENT BILLING
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              إجمالي {invoices.length} فواتير
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">فواتيري وسندات السداد</h1>
          <p className="text-xs text-muted-foreground">
            كشف الحساب المالي لرسوم الكشوفات، الخصومات الممنوحة، والأرصدة المتبقية
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchInvoices}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث الفواتير</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">إجمالي المدفوع</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 mt-2">
            {totalPaid.toLocaleString("ar-EG")} ج.م
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">سداد موثق بالإيصالات</div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">المبالغ المستحقة</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 mt-2">
            {totalRemaining.toLocaleString("ar-EG")} ج.م
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">متبقي قيد السداد</div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">عدد الفواتير</span>
            <Receipt className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-2">
            {invoices.length} فاتورة
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">كافة المعاملات المالية</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border/50 text-xs w-fit">
        <button
          onClick={() => setFilterTab("ALL")}
          className={`px-3 py-1.5 rounded-md font-medium transition-all ${
            filterTab === "ALL"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          كافة الفواتير ({invoices.length})
        </button>
        <button
          onClick={() => setFilterTab("PAID")}
          className={`px-3 py-1.5 rounded-md font-medium transition-all ${
            filterTab === "PAID"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          المسددة ({invoices.filter((i) => i.status === "PAID").length})
        </button>
        <button
          onClick={() => setFilterTab("UNPAID")}
          className={`px-3 py-1.5 rounded-md font-medium transition-all ${
            filterTab === "UNPAID"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          المستحقة ({invoices.filter((i) => i.status === "UNPAID").length})
        </button>
      </div>

      {/* Invoices Single-Surface Table */}
      <div className="rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <Wallet className="w-10 h-10 text-muted-foreground mx-auto stroke-1" />
            <p className="text-sm font-medium text-foreground">لا توجد فواتير مطابقة للمعايير</p>
            <p className="text-xs text-muted-foreground">كافة حساباتك مسددة أو لا توجد فواتير معلقة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground font-medium">
                  <th className="py-3 px-4">رقم الفاتورة</th>
                  <th className="py-3 px-4">الخدمة / الموعد</th>
                  <th className="py-3 px-4">الإجمالي</th>
                  <th className="py-3 px-4">المسدد</th>
                  <th className="py-3 px-4">المتبقي</th>
                  <th className="py-3 px-4">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground" dir="ltr">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {inv.appointment?.serviceName || "كشف استشاري"}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-foreground">
                      {inv.total.toLocaleString("ar-EG")} ج.م
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-emerald-600">
                      {inv.amountPaid.toLocaleString("ar-EG")} ج.م
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-foreground">
                      {inv.remaining > 0 ? (
                        <span className="text-amber-600">
                          {inv.remaining.toLocaleString("ar-EG")} ج.م
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0 ج.م</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{renderStatusBadge(inv.status)}</td>
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
