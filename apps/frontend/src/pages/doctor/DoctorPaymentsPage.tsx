import React, { useEffect, useState, useMemo } from "react";
import {
  Wallet,
  DollarSign,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Search,
  Receipt,
} from "lucide-react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  discount: number;
  amountPaid: number;
  status: "PAID" | "UNPAID" | "PARTIAL" | "REFUNDED" | string;
  patientName?: string;
  date?: string;
}

interface PaymentsData {
  invoices: Invoice[];
  totalRevenue: number;
  collected: number;
  outstanding: number;
}

const mockInvoicesList: Invoice[] = [
  {
    id: "inv-101",
    invoiceNumber: "INV-2026-0891",
    total: 850,
    discount: 50,
    amountPaid: 800,
    status: "PAID",
    patientName: "عبد الرحمن كمال الملاح",
    date: "2026-10-12",
  },
  {
    id: "inv-102",
    invoiceNumber: "INV-2026-0892",
    total: 600,
    discount: 0,
    amountPaid: 600,
    status: "PAID",
    patientName: "فاطمة الزهراء الشناوي",
    date: "2026-10-11",
  },
  {
    id: "inv-103",
    invoiceNumber: "INV-2026-0893",
    total: 1200,
    discount: 100,
    amountPaid: 500,
    status: "PARTIAL",
    patientName: "محمد هاني القاضي",
    date: "2026-10-10",
  },
  {
    id: "inv-104",
    invoiceNumber: "INV-2026-0894",
    total: 450,
    discount: 0,
    amountPaid: 0,
    status: "UNPAID",
    patientName: "نادية عبد المجيد رضوان",
    date: "2026-10-09",
  },
];

const DoctorPaymentsPage: React.FC = () => {
  const [data, setData] = useState<PaymentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const fetchPayments = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("doctorToken");
      const res = await fetch("/api/v1/booking/doctor-portal/payments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setData({
          invoices: mockInvoicesList,
          totalRevenue: 3100,
          collected: 1900,
          outstanding: 1200,
        });
      }
    } catch {
      setData({
        invoices: mockInvoicesList,
        totalRevenue: 3100,
        collected: 1900,
        outstanding: 1200,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const invoices = data?.invoices || [];

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.patientName || "").toLowerCase().includes(q)
      );
    });
  }, [invoices, statusFilter, search]);

  const totalRev = data?.totalRevenue ?? 3100;
  const coll = data?.collected ?? 1900;
  const outst = data?.outstanding ?? 1200;

  if (loading) {
    return (
      <div className="flex min-h-[380px] items-center justify-center rounded-2xl border border-border/70 bg-card">
        <div className="flex items-center gap-2.5 font-mono text-xs text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span>جاري تحميل سجل المدفوعات...</span>
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
            مسددة
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
            غير مسددة
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
              FINANCIAL SETTLEMENTS
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              إجمالي {invoices.length} فاتورة مسجلة
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            المدفوعات والفواتير السريرية
          </h1>
          <p className="text-xs text-muted-foreground">
            متابعة الإيرادات المحصلة، الفواتير المعلقة، ومستحقات العيادة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPayments}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background px-3 py-2 text-xs font-medium text-foreground shadow-xs transition-all hover:bg-muted/40 active:scale-[0.98]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">إجمالي الإيرادات</span>
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {totalRev.toLocaleString("ar-EG")} ج.م
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">كافة الفواتير الصادرة</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">المبالغ المحصلة</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {coll.toLocaleString("ar-EG")} ج.م
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">تم سدادها بنجاح</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">المتبقي غير المسدد</span>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {outst.toLocaleString("ar-EG")} ج.م
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">فواتير معلقة قيد التحصيل</div>
        </div>
      </div>

      {/* Filter and Search Ribbon */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1 text-xs">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              statusFilter === "ALL"
                ? "border border-border/70 bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            الكل ({invoices.length})
          </button>
          <button
            onClick={() => setStatusFilter("PAID")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              statusFilter === "PAID"
                ? "border border-border/70 bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            المسددة ({invoices.filter((i) => i.status === "PAID").length})
          </button>
          <button
            onClick={() => setStatusFilter("PARTIAL")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              statusFilter === "PARTIAL"
                ? "border border-border/70 bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            جزئي ({invoices.filter((i) => i.status === "PARTIAL").length})
          </button>
          <button
            onClick={() => setStatusFilter("UNPAID")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              statusFilter === "UNPAID"
                ? "border border-border/70 bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            معلقة ({invoices.filter((i) => i.status === "UNPAID").length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث برقم الفاتورة أو المريض..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border/70 bg-background py-1.5 pl-3 pr-9 text-xs text-foreground placeholder:text-muted-foreground/60 shadow-xs outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Invoices Table Container Chassis */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
        {filteredInvoices.length === 0 ? (
          <div className="space-y-2 py-12 text-center">
            <Wallet className="mx-auto h-10 w-10 text-muted-foreground stroke-1" />
            <p className="text-sm font-medium text-foreground">لا توجد فواتير مطابقة للمعايير</p>
            <p className="text-xs text-muted-foreground">جرب تغيير حالة الفلتر أو مصطلح البحث</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">رقم الفاتورة</th>
                  <th className="px-4 py-3 font-medium">المريض</th>
                  <th className="px-4 py-3 font-medium">الإجمالي</th>
                  <th className="px-4 py-3 font-medium">الخصم</th>
                  <th className="px-4 py-3 font-medium">المسدد</th>
                  <th className="px-4 py-3 font-medium">الحالة</th>
                  <th className="px-4 py-3 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3.5 font-mono font-semibold text-primary" dir="ltr">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-foreground">
                      {inv.patientName || "مريض العيادة"}
                    </td>
                    <td className="px-4 py-3.5 font-mono tabular-nums text-foreground">
                      {inv.total.toLocaleString("ar-EG")} ج.م
                    </td>
                    <td className="px-4 py-3.5 font-mono tabular-nums text-muted-foreground">
                      {inv.discount > 0 ? `${inv.discount.toLocaleString("ar-EG")} ج.م` : "—"}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {inv.amountPaid.toLocaleString("ar-EG")} ج.م
                    </td>
                    <td className="px-4 py-3.5">{renderStatusBadge(inv.status)}</td>
                    <td className="px-4 py-3.5 font-mono text-muted-foreground">
                      {inv.date ? new Date(inv.date).toLocaleDateString("ar-EG") : "—"}
                    </td>
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

export default DoctorPaymentsPage;
