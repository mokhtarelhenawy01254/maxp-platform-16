import { useState } from "react";
import { apiClient } from "../../services/apiClient";
import {
  FileSpreadsheet,
  Search,
  Calendar,
  User,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Building2,
  Printer,
  Sparkles,
} from "lucide-react";

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
      setCustomers((res?.data?.data || []).map((c: any) => ({ id: c.id, name: c.customerName || (c.customer ? `${c.customer.firstName} ${c.customer.lastName}` : "عميل") })));
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
      setStatement(res?.data?.data || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل تحميل كشف الحساب");
    } finally {
      setLoading(false);
    }
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    INVOICE: { label: "فاتورة مبيعات", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
    PAYMENT: { label: "سداد دفعة", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
    CREDIT_NOTE: { label: "إشعار دائن", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
    DEBIT_NOTE: { label: "إشعار مدين", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 rtl font-sans" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              دفتر الحسابات والتدقيق
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              Account Ledger
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            كشوف حسابات عملاء وتجار الجملة
          </h1>
          <p className="text-xs text-muted-foreground">
            استخراج كشوف الحسابات التفصيلية وحركات الفواتير والمدفوعات خلال فترات محددة
          </p>
        </div>

        {statement && (
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-muted text-foreground hover:bg-muted/80 border border-border/80 transition-colors"
          >
            <Printer className="w-4 h-4" />
            طباعة كشف الحساب
          </button>
        )}
      </div>

      {/* Query Filter Box */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1.5 relative">
            <label className="text-xs font-medium text-foreground">بحث واختيار التاجر *</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => searchCustomers(e.target.value)}
                placeholder="اكتب اسم التاجر للبحث..."
                className="w-full bg-background border border-input rounded-lg pr-9 pl-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {customers.length > 0 && (
              <div className="absolute z-20 top-full mt-1 w-full rounded-lg border border-border bg-card shadow-xl overflow-hidden divide-y divide-border/60">
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

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">من تاريخ</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">إلى تاريخ</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            onClick={loadStatement}
            disabled={loading || !selectedCustomerId}
            className="w-full py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm"
          >
            {loading ? "جاري تحميل الحركات..." : "عرض كشف الحساب"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Statement Results View */}
      {statement && (
        <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs space-y-4">
          {/* Header Summary */}
          <div className="p-5 border-b border-border/80 bg-muted/20 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-foreground">{statement.customerName}</h2>
                {statement.customerPhone && (
                  <p className="text-xs text-muted-foreground font-mono">{statement.customerPhone}</p>
                )}
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                الفترة من: {new Date(fromDate).toLocaleDateString("ar-EG")} إلى: {new Date(toDate).toLocaleDateString("ar-EG")}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-background border border-border/60 rounded-lg p-3">
                <span className="text-[11px] text-muted-foreground block">الرصيد الافتتاحي</span>
                <span className="text-sm font-bold font-mono tabular-nums text-foreground">
                  {Number(statement.openingBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                </span>
              </div>
              <div className="bg-background border border-border/60 rounded-lg p-3">
                <span className="text-[11px] text-muted-foreground block">إجمالي المسحوبات (مدين)</span>
                <span className="text-sm font-bold font-mono tabular-nums text-red-600 dark:text-red-400">
                  {statement.lines.reduce((a, l) => a + (Number(l.debit) || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                </span>
              </div>
              <div className="bg-background border border-border/60 rounded-lg p-3">
                <span className="text-[11px] text-muted-foreground block">إجمالي السدادات (دائن)</span>
                <span className="text-sm font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  {statement.lines.reduce((a, l) => a + (Number(l.credit) || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                </span>
              </div>
              <div className="bg-background border border-border/60 rounded-lg p-3">
                <span className="text-[11px] text-muted-foreground block">الرصيد الختامي المستحق</span>
                <span className="text-sm font-bold font-mono tabular-nums text-foreground">
                  {Number(statement.closingBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                </span>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">التاريخ</th>
                  <th className="px-4 py-3 font-semibold">نوع الحركة</th>
                  <th className="px-4 py-3 font-semibold">المرجع</th>
                  <th className="px-4 py-3 font-semibold">البيان والشرح</th>
                  <th className="px-4 py-3 font-semibold">مدين (+)</th>
                  <th className="px-4 py-3 font-semibold">دائن (-)</th>
                  <th className="px-4 py-3 font-semibold">الرصيد التراكمي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {statement.lines.map((line, i) => {
                  const typeInfo = typeLabels[line.type] || { label: line.type, color: "bg-muted text-foreground border-border" };
                  return (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground font-mono">
                        {new Date(line.date).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{line.reference || "—"}</td>
                      <td className="px-4 py-3 text-foreground">{line.description || "—"}</td>
                      <td className="px-4 py-3 font-mono tabular-nums font-semibold text-red-600 dark:text-red-400">
                        {Number(line.debit) > 0 ? Number(line.debit).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                        {Number(line.credit) > 0 ? Number(line.credit).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums font-bold text-foreground">
                        {Number(line.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
                {statement.lines.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-xs text-muted-foreground">
                      لا توجد حركات مالية مسجلة خلال هذه الفترة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
