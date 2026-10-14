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
  ChevronDown,
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
      setCustomers((res?.data?.data || []).map((c: any) => ({
        id: c.id,
        name: c.customerName || (c.customer ? `${c.customer.firstName} ${c.customer.lastName}` : "عميل"),
      })));
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
    INVOICE: { label: "فاتورة مبيعات", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    PAYMENT: { label: "سداد دفعة", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    CREDIT_NOTE: { label: "إشعار دائن", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
    DEBIT_NOTE: { label: "إشعار مدين", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  };

  const totalDebits = statement?.lines.reduce((a, l) => a + (Number(l.debit) || 0), 0) || 0;
  const totalCredits = statement?.lines.reduce((a, l) => a + (Number(l.credit) || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-card text-foreground font-sans rtl" dir="rtl">
      {/* Telemetry Status Ribbon */}
      <div className="border-b border-border/70 bg-muted/20 px-4 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              دفتر أستاذ الجملة الموحد
            </span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground">
              العميل النشط: <strong className="text-foreground">{statement ? statement.customerName : "لم يحدد"}</strong>
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono tabular-nums text-muted-foreground">
            <span>الافتتاحي: <strong className="text-foreground">{Number(statement?.openingBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong> ج.م</span>
            <span className="text-border">|</span>
            <span>المدين: <strong className="text-red-500">{totalDebits.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong> ج.م</span>
            <span className="text-border">|</span>
            <span>الدائن: <strong className="text-emerald-500">{totalCredits.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong> ج.م</span>
            <span className="text-border">|</span>
            <span>المستحق: <strong className="text-foreground">{Number(statement?.closingBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong> ج.م</span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-muted/40 text-foreground border border-border/70">
                <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />
                محرك المطابقات المالية
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                wholesale.ledger.v2
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              كشوف حسابات عملاء وتجار الجملة
            </h1>
            <p className="text-xs text-muted-foreground">
              استخراج حركة الحساب التفصيلية، قيود الفواتير وسندات القبض ومطابقة الأرصدة
            </p>
          </div>

          {statement && (
            <button
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md bg-muted/50 text-foreground hover:bg-muted/80 border border-border/70 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-muted-foreground" />
              طباعة كشف الحساب
            </button>
          )}
        </div>

        {/* Query Filter Box */}
        <div className="bg-muted/10 border border-border/70 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1.5 relative">
              <label className="text-xs font-medium text-foreground">بحث واختيار التاجر *</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => searchCustomers(e.target.value)}
                  placeholder="ابحث بالاسم أو السجل..."
                  className="w-full bg-background border border-border/80 rounded-md pr-9 pl-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">من تاريخ</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">إلى تاريخ</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>

            <button
              onClick={loadStatement}
              disabled={loading || !selectedCustomerId}
              className="w-full py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "جاري تحميل البيانات..." : "عرض كشف الحساب"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Statement Results View */}
        {statement && (
          <div className="border border-border/70 bg-card rounded-lg overflow-hidden space-y-0">
            {/* Customer Summary Bar */}
            <div className="p-4 border-b border-border/70 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{statement.customerName}</h2>
                {statement.customerPhone && (
                  <p className="text-xs text-muted-foreground font-mono">{statement.customerPhone}</p>
                )}
              </div>
              <div className="text-xs text-muted-foreground font-mono tabular-nums">
                الفترة المحاسبية: {fromDate} إلى {toDate}
              </div>
            </div>

            {/* KPI 4-Card Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border/60 border-b border-border/70 rtl:divide-x-reverse">
              <div className="p-3.5 bg-card">
                <span className="text-[11px] text-muted-foreground block">الرصيد الافتتاحي</span>
                <span className="text-sm font-semibold font-mono tabular-nums text-foreground mt-0.5 block">
                  {Number(statement.openingBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                </span>
              </div>
              <div className="p-3.5 bg-card">
                <span className="text-[11px] text-muted-foreground block">إجمالي المسحوبات (مدين)</span>
                <span className="text-sm font-semibold font-mono tabular-nums text-red-500 mt-0.5 block">
                  {totalDebits.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                </span>
              </div>
              <div className="p-3.5 bg-card">
                <span className="text-[11px] text-muted-foreground block">إجمالي السدادات (دائن)</span>
                <span className="text-sm font-semibold font-mono tabular-nums text-emerald-500 mt-0.5 block">
                  {totalCredits.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                </span>
              </div>
              <div className="p-3.5 bg-card">
                <span className="text-[11px] text-muted-foreground block">الرصيد الختامي المستحق</span>
                <span className="text-sm font-semibold font-mono tabular-nums text-foreground mt-0.5 block">
                  {Number(statement.closingBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                </span>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/30 text-muted-foreground text-[11px] font-medium">
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
                  {statement.lines.map((line, i) => {
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
                        <td className="px-4 py-2.5 font-mono tabular-nums font-semibold text-red-500">
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
                  {statement.lines.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                        لا توجد حركات مالية مسجلة خلال الفترة المحددة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
