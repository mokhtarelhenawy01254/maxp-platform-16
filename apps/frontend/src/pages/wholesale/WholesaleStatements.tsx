import React, { useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import {
  FileSpreadsheet,
  Search,
  Calendar,
  Wallet,
  Building2,
  Printer,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

interface StatementLine {
  date: string;
  type: "INVOICE" | "PAYMENT" | "CREDIT_NOTE" | "DEBIT_NOTE";
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface StatementData {
  customerName: string;
  customerPhone?: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  closingBalance: number;
  lines: StatementLine[];
}

export default function WholesaleStatements() {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCustomers = async (q: string) => {
    setCustomerSearch(q);
    if (q.length < 2) {
      setCustomers([]);
      return;
    }
    try {
      const res = await apiClient.get(`/wholesale/customers?search=${encodeURIComponent(q)}&limit=10`);
      const raw = res?.data?.data || [];
      const list = Array.isArray(raw) ? raw : (raw?.customers || raw?.items || []);
      setCustomers(
        list.map((c: any) => ({
          id: c.id,
          name: c.customerName || (c.customer ? `${c.customer.firstName} ${c.customer.lastName}` : c.name || "عميل"),
        }))
      );
    } catch {
      /* ignore */
    }
  };

  const loadStatement = async () => {
    if (!selectedCustomerId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/wholesale/customers/${selectedCustomerId}/statement`, {
        params: { fromDate, toDate },
      });
      const raw = res?.data?.data || null;
      if (raw) {
        setStatement({
          customerName: raw.customerName || customerSearch || "تاجر معتمد",
          customerPhone: raw.customerPhone || raw.phone,
          fromDate: raw.fromDate || fromDate,
          toDate: raw.toDate || toDate,
          openingBalance: Number(raw.openingBalance) || 0,
          closingBalance: Number(raw.closingBalance) || 0,
          lines: Array.isArray(raw.lines) ? raw.lines : [],
        });
      } else {
        setStatement(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل تحميل كشف الحساب");
    } finally {
      setLoading(false);
    }
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    INVOICE: { label: "فاتورة مبيعات", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    PAYMENT: { label: "سداد دفعة", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    CREDIT_NOTE: { label: "إشعار دائن", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
    DEBIT_NOTE: { label: "إشعار مدين", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  };

  const safeLines = Array.isArray(statement?.lines) ? statement.lines : [];
  const totalDebits = safeLines.reduce((a, l) => a + (Number(l.debit) || 0), 0);
  const totalCredits = safeLines.reduce((a, l) => a + (Number(l.credit) || 0), 0);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <FileSpreadsheet className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              كشوف حسابات عملاء وتجار الجملة
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              Ledger Engine v2.0
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            استخراج حركة الحساب التفصيلية، قيود الفواتير وسندات القبض ومطابقة الأرصدة
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
          {statement && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-8 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98]"
            >
              <Printer className="size-3.5" />
              <span>طباعة الكشف</span>
            </Button>
          )}
        </div>
      </div>

      {/* Query Filter Box */}
      <div className="rounded-lg border border-border/70 bg-card p-3.5 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1 relative">
            <label className="text-[11px] font-medium text-foreground">بحث واختيار التاجر</label>
            <div className="relative">
              <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => void searchCustomers(e.target.value)}
                placeholder="ابحث بالاسم أو السجل..."
                className="w-full bg-background border border-border/80 rounded-md pr-8 pl-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
            {customers.length > 0 && (
              <div className="absolute z-20 top-full mt-1 w-full rounded-md border border-border bg-card shadow-lg overflow-hidden divide-y divide-border/60">
                {customers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setCustomerSearch(c.name);
                      setCustomers([]);
                    }}
                    className="block w-full px-3 py-2 text-right text-xs text-foreground hover:bg-muted/40 transition-colors"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-foreground">من تاريخ</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-foreground">إلى تاريخ</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
          </div>

          <Button
            onClick={() => void loadStatement()}
            disabled={loading || !selectedCustomerId}
            className="w-full h-8 text-xs font-mono active:scale-[0.98]"
          >
            {loading ? <RefreshCw className="size-3.5 animate-spin" /> : "عرض كشف الحساب"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2 font-mono">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Statement Results View */}
      {statement ? (
        <div className="border border-border/70 bg-card rounded-lg overflow-hidden space-y-0 shadow-xs">
          {/* Customer Summary Bar */}
          <div className="p-3.5 border-b border-border/70 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h2 className="text-sm font-semibold text-foreground font-mono">{statement.customerName}</h2>
              {statement.customerPhone && (
                <p className="text-xs text-muted-foreground font-mono">{statement.customerPhone}</p>
              )}
            </div>
            <div className="text-xs text-muted-foreground font-mono tabular-nums">
              الفترة المحاسبية: {fromDate} إلى {toDate}
            </div>
          </div>

          {/* KPI 4-Card Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border/60 border-b border-border/70 rtl:divide-x-reverse font-mono">
            <div className="p-3 bg-card">
              <span className="text-[10px] text-muted-foreground block">الرصيد الافتتاحي</span>
              <span className="text-sm font-semibold tabular-nums text-foreground mt-0.5 block">
                {Number(statement.openingBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
              </span>
            </div>
            <div className="p-3 bg-card">
              <span className="text-[10px] text-muted-foreground block">إجمالي المسحوبات (مدين)</span>
              <span className="text-sm font-semibold tabular-nums text-rose-500 mt-0.5 block">
                {totalDebits.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
              </span>
            </div>
            <div className="p-3 bg-card">
              <span className="text-[10px] text-muted-foreground block">إجمالي السدادات (دائن)</span>
              <span className="text-sm font-semibold tabular-nums text-emerald-500 mt-0.5 block">
                {totalCredits.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
              </span>
            </div>
            <div className="p-3 bg-card">
              <span className="text-[10px] text-muted-foreground block">الرصيد الختامي المستحق</span>
              <span className="text-sm font-semibold tabular-nums text-foreground mt-0.5 block">
                {Number(statement.closingBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
              </span>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="border-b border-border/70 bg-muted/30 text-muted-foreground text-[11px] font-medium font-mono">
                <tr>
                  <th className="px-4 py-2.5">التاريخ</th>
                  <th className="px-4 py-2.5">نوع الحركة</th>
                  <th className="px-4 py-2.5">المرجع</th>
                  <th className="px-4 py-2.5">البيان والشرح</th>
                  <th className="px-4 py-2.5">مدين (+)</th>
                  <th className="px-4 py-2.5">دائن (-)</th>
                  <th className="px-4 py-2.5">الرصيد التراكمي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {safeLines.map((line, i) => {
                  const typeInfo = typeLabels[line.type] || {
                    label: line.type,
                    color: "bg-muted text-foreground border-border/70",
                  };
                  return (
                    <tr key={i} className="hover:bg-muted/25 transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground font-mono">
                        {line.date ? new Date(line.date).toISOString().split("T")[0] : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">{line.reference || "—"}</td>
                      <td className="px-4 py-2.5 text-foreground">{line.description || "—"}</td>
                      <td className="px-4 py-2.5 font-mono tabular-nums font-semibold text-rose-500">
                        {Number(line.debit) > 0 ? Number(line.debit).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                      </td>
                      <td className="px-4 py-2.5 font-mono tabular-nums font-semibold text-emerald-500">
                        {Number(line.credit) > 0 ? Number(line.credit).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                      </td>
                      <td className="px-4 py-2.5 font-mono tabular-nums font-semibold text-foreground">
                        {Number(line.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
                {safeLines.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-xs text-muted-foreground font-mono">
                      لا توجد حركات مالية مسجلة خلال الفترة المحددة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border/70 bg-card p-10 text-center space-y-2 shadow-xs">
          <div className="size-9 rounded-full bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center">
            <FileSpreadsheet className="size-4" />
          </div>
          <h3 className="text-xs font-semibold text-foreground font-mono">حدد التاجر والفترة لعرض كشف الحساب</h3>
          <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
            قم بالبحث عن اسم تاجر الجملة وتحديد نطاق التاريخ ثم اضغط عرض كشف الحساب لمراجعة قيود اليومية
          </p>
        </div>
      )}
    </div>
  );
}
