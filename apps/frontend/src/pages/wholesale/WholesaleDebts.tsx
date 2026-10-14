import React, { useState, useEffect } from "react";
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
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

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

  const loadData = async () => {
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

  useEffect(() => {
    void loadData();
  }, []);

  if (loading && !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-2.5 text-muted-foreground">
        <RefreshCw className="size-5 animate-spin text-primary" />
        <span className="text-xs font-mono">جاري تحميل تقرير أعمار الديون والرقابة المالية...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-3" dir="rtl">
        <div className="size-10 rounded-lg bg-destructive/10 text-destructive mx-auto flex items-center justify-center border border-destructive/20">
          <AlertTriangle className="size-5" />
        </div>
        <h2 className="text-sm font-semibold text-foreground font-mono">تعذر تحميل تقرير المديونية</h2>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button size="sm" variant="outline" onClick={() => void loadData()} className="h-8 text-xs font-mono">
          إعادة المحاولة
        </Button>
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
              مديونيات تجار الجملة وأعمار الديون
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              Debt Aging Matrix
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            متابعة الأرصدة المستحقة، فئات التقادم الزمني، والحدود الائتمانية لشبكة الموزعين
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap font-mono text-xs self-end sm:self-auto">
          <Link
            to="/wholesale/dashboard"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border/70 bg-card hover:bg-muted/40 text-foreground transition-colors active:scale-[0.98]"
          >
            <Building2 className="size-3.5 text-primary" />
            <span>لوحة الجملة</span>
          </Link>
          <Link
            to="/wholesale/statements"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border/70 bg-card hover:bg-muted/40 text-foreground transition-colors active:scale-[0.98]"
          >
            <FileSpreadsheet className="size-3.5 text-primary" />
            <span>كشوف الحسابات</span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            className="h-8 px-2 text-xs font-mono border-border/70 active:scale-[0.98]"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>

      {report && (
        <>
          {/* Telemetry Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-amber-600 dark:text-amber-400">إجمالي المديونية القائمة</p>
                <p className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-0.5">
                  {report.totalOutstanding.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                </p>
                <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">مستحقات قيد التحصيل</p>
              </div>
              <div className="size-7 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Wallet className="size-3.5" />
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-rose-600 dark:text-rose-400">المتأخرات الحرجة</p>
                <p className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono tabular-nums mt-0.5">
                  {report.totalOverdue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                </p>
                <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">تجاوزت فترة السداد</p>
              </div>
              <div className="size-7 rounded-md bg-rose-500/10 flex items-center justify-center text-rose-600">
                <TrendingDown className="size-3.5" />
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-blue-600 dark:text-blue-400">التجار المدينين حالياً</p>
                <p className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums mt-0.5">
                  {report.customers.length}
                </p>
                <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">تاجر عليه رصيد</p>
              </div>
              <div className="size-7 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Users className="size-3.5" />
              </div>
            </div>
          </div>

          {/* Aging Buckets Chassis */}
          <div className="bg-card border border-border/70 rounded-lg p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <h2 className="text-xs font-semibold text-foreground font-mono">
                  توزيع التقادم الائتماني (Aging Buckets)
                </h2>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                تصنيف الديون حسب فترات التأخير الزمني
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
              {report.agingBuckets.map((bucket) => (
                <div
                  key={bucket.label}
                  className="bg-muted/20 border border-border/60 rounded-md p-2.5 text-center space-y-0.5 hover:border-border/90 transition-colors"
                >
                  <p className="text-[11px] text-muted-foreground font-mono">{bucket.label}</p>
                  <p className="text-sm font-bold font-mono tabular-nums text-foreground">
                    {bucket.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono tabular-nums">
                    {bucket.count} تاجر
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Debt Customers Table */}
          <div className="bg-card border border-border/70 rounded-lg overflow-hidden shadow-xs">
            <div className="px-4 py-2.5 border-b border-border/70 bg-muted/20 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground font-mono">
                كشف أرصدة العملاء والتجار المستحقة
              </h3>
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                {report.customers.length} سجل
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground font-mono text-[11px]">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">اسم التاجر / العميل</th>
                    <th className="px-4 py-2.5 font-medium">الهاتف</th>
                    <th className="px-4 py-2.5 font-medium">الحد الائتماني</th>
                    <th className="px-4 py-2.5 font-medium">الرصيد المستحق</th>
                    <th className="px-4 py-2.5 font-medium text-center">أيام التأخير</th>
                    <th className="px-4 py-2.5 font-medium">تاريخ آخر سداد</th>
                    <th className="px-4 py-2.5 font-medium text-left w-24">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {report.customers.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-foreground">{c.customerName}</td>
                      <td className="px-4 py-2.5 text-muted-foreground font-mono text-[11px]" dir="ltr">
                        {c.customerPhone || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground font-mono tabular-nums">
                        {Number(c.creditLimit).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                      </td>
                      <td className="px-4 py-2.5 font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400">
                        {Number(c.currentBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${
                            c.daysOverdue > 30
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                              : c.daysOverdue > 7
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {c.daysOverdue} يوم
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground font-mono text-[11px]">
                        {c.lastPaymentDate ? new Date(c.lastPaymentDate).toLocaleDateString("ar-EG") : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-left">
                        <Link
                          to={`/wholesale/customers/${c.id}`}
                          className="inline-flex items-center gap-0.5 text-xs font-mono text-primary hover:underline"
                        >
                          <span>كشف الحساب</span>
                          <ArrowUpRight className="size-3 rtl:rotate-90" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {report.customers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-xs font-mono text-muted-foreground">
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
