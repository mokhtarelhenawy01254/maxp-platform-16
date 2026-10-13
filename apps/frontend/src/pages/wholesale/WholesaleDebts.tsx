import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import {
  Wallet,
  AlertTriangle,
  Users,
  Clock,
  ArrowUpRight,
  TrendingDown,
  Building2,
  Calendar,
  FileSpreadsheet,
} from "lucide-react";

interface AgingBucket {
  label: string;
  amount: number;
  count: number;
}

interface DebtCustomer {
  id: string;
  customerName: string;
  customerPhone?: string;
  currentBalance: number;
  creditLimit: number;
  daysOverdue: number;
  lastPaymentDate?: string;
}

interface DebtReport {
  totalOutstanding: number;
  totalOverdue: number;
  agingBuckets: AgingBucket[];
  customers: DebtCustomer[];
}

export default function WholesaleDebts() {
  const [report, setReport] = useState<DebtReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.get("/wholesale/debts/aging");
        setReport(res?.data?.data || null);
      } catch (err: any) {
        setError(err?.response?.data?.message || "تعذر تحميل تقرير المديونية");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">جاري تحميل تقرير أعمار الديون...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-3 rtl font-sans" dir="rtl">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center border border-red-500/20">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">تعذر تحميل تقرير المديونية</h2>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 rtl font-sans" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Wallet className="w-3.5 h-3.5" />
              الرقابة المالية والائتمان
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              Debt Aging Matrix
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            إدارة مديونيات تجار الجملة وأعمار الديون
          </h1>
          <p className="text-xs text-muted-foreground">
            متابعة الأرصدة المستحقة، فئات التقادم الزمني، والحدود الائتمانية لشبكة الموزعين
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/wholesale/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-primary" />
            لوحة الجملة
          </Link>
          <Link
            to="/wholesale/statements"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
            كشوف الحسابات
          </Link>
        </div>
      </div>

      {report && (
        <>
          {/* Telemetry Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">إجمالي المديونية القائمة</div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                  {report.totalOutstanding.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">إجمالي المتأخرات الحرجة</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400 font-mono tabular-nums">
                  {report.totalOverdue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">التجار المدينين حالياً</div>
                <div className="text-2xl font-bold text-foreground font-mono tabular-nums">
                  {report.customers.length}
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Aging Buckets Grid */}
          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  توزيع التقادم الائتماني (Aging Buckets)
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                تصنيف الديون حسب فترات التأخير الزمني
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {report.agingBuckets.map((bucket) => (
                <div
                  key={bucket.label}
                  className="bg-muted/30 border border-border/60 rounded-xl p-3.5 text-center space-y-1 hover:border-primary/40 transition-colors"
                >
                  <p className="text-xs text-muted-foreground font-medium">{bucket.label}</p>
                  <p className="text-base font-bold font-mono tabular-nums text-foreground">
                    {bucket.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
                    {bucket.count} تاجر
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Debt Customers Table */}
          <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
            <div className="px-5 py-3 border-b border-border/80 bg-muted/20 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground">
                كشف أرصدة العملاء والتجار المستحقة
              </h3>
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                {report.customers.length} سجل
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">اسم التاجر / العميل</th>
                    <th className="px-4 py-3 font-semibold">الهاتف</th>
                    <th className="px-4 py-3 font-semibold">الحد الائتماني</th>
                    <th className="px-4 py-3 font-semibold">الرصيد المستحق</th>
                    <th className="px-4 py-3 font-semibold">أيام التأخير</th>
                    <th className="px-4 py-3 font-semibold">تاريخ آخر سداد</th>
                    <th className="px-4 py-3 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {report.customers.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">{c.customerName}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">{c.customerPhone || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono tabular-nums">
                        {Number(c.creditLimit).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums font-bold text-red-600 dark:text-red-400">
                        {Number(c.currentBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            c.daysOverdue > 30
                              ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                              : c.daysOverdue > 7
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {c.daysOverdue} يوم
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">
                        {c.lastPaymentDate ? new Date(c.lastPaymentDate).toLocaleDateString("ar-EG") : "—"}
                      </td>
                      <td className="px-4 py-3 text-left">
                        <Link
                          to={`/wholesale/customers/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          كشف الحساب
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {report.customers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-xs text-muted-foreground">
                        لا توجد مديونيات قائمة على أي تاجر حالياً
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
