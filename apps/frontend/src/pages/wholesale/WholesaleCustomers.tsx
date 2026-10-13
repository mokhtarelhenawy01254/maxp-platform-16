import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import {
  Users,
  Search,
  Plus,
  Tag,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Clock,
} from "lucide-react";

interface WholesaleCustomer {
  id: string;
  customerId: string;
  customer: { firstName: string; lastName: string; phone?: string };
  creditLimit: number;
  currentBalance: number;
  paymentTermsDays: number;
  priceListId?: string;
  priceListName?: string;
  isActive: boolean;
}

export default function WholesaleCustomers() {
  const [customers, setCustomers] = useState<WholesaleCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.get("/wholesale/customers");
        setCustomers(res?.data?.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || "تعذر تحميل عملاء الجملة");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const name = c.customer ? `${c.customer.firstName} ${c.customer.lastName}` : "";
      const phone = c.customer?.phone || "";
      const matchesSearch = !search || name.includes(search) || phone.includes(search);
      const matchesActive =
        filterActive === "all" ||
        (filterActive === "active" && c.isActive) ||
        (filterActive === "inactive" && !c.isActive);
      return matchesSearch && matchesActive;
    });
  }, [customers, search, filterActive]);

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.isActive).length;
    const totalLimit = customers.reduce((acc, c) => acc + (Number(c.creditLimit) || 0), 0);
    const totalBalance = customers.reduce((acc, c) => acc + (Number(c.currentBalance) || 0), 0);
    return { total, active, totalLimit, totalBalance };
  }, [customers]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">جاري تحميل سجل عملاء الجملة...</span>
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
              <Users className="w-3.5 h-3.5" />
              شبكة الموزعين والتجار
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {stats.total} تاجر مسجل
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            عملاء وتجار الجملة
          </h1>
          <p className="text-xs text-muted-foreground">
            إدارة حسابات التجار، الحدود الائتمانية، فترات السداد، وقوائم الأسعار المعينة
          </p>
        </div>

        <Link
          to="/wholesale/customers/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Plus className="w-4 h-4" />
          إضافة تاجر جملة
        </Link>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">إجمالي التجار</div>
            <div className="text-2xl font-bold text-foreground font-mono tabular-nums">
              {stats.total}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">الحسابات النشطة</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {stats.active}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">الحدود الائتمانية الممنوحة</div>
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums">
              {stats.totalLimit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">إجمالي الأرصدة القائمة</div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
              {stats.totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            className="w-full bg-background border border-input rounded-lg pr-9 pl-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="بحث بالاسم أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterActive("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterActive === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/80"
            }`}
          >
            الكل ({customers.length})
          </button>
          <button
            onClick={() => setFilterActive("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterActive === "active"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/80"
            }`}
          >
            نشط ({stats.active})
          </button>
          <button
            onClick={() => setFilterActive("inactive")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterActive === "inactive"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/80"
            }`}
          >
            موقوف ({stats.total - stats.active})
          </button>
        </div>
      </div>

      {/* Customers Table */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-card border border-border/80 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">لا يوجد تجار جملة يطابقون البحث</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            قم بإضافة تاجر جديد أو تعديل معايير البحث المعروضة
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">اسم التاجر / العميل</th>
                  <th className="px-4 py-3 font-semibold">الهاتف</th>
                  <th className="px-4 py-3 font-semibold">الحد الائتماني</th>
                  <th className="px-4 py-3 font-semibold">الرصيد المستحق</th>
                  <th className="px-4 py-3 font-semibold">فترة السداد</th>
                  <th className="px-4 py-3 font-semibold">قائمة الأسعار</th>
                  <th className="px-4 py-3 font-semibold">الحالة</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      <Link
                        to={`/wholesale/customers/${c.id}`}
                        className="hover:text-primary transition-colors inline-flex items-center gap-1"
                      >
                        {c.customer ? `${c.customer.firstName} ${c.customer.lastName}` : "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono">{c.customer?.phone || "—"}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-foreground">
                      {Number(c.creditLimit).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums font-bold">
                      <span className={Number(c.currentBalance) > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}>
                        {Number(c.currentBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono">
                      {c.paymentTermsDays} يوم
                    </td>
                    <td className="px-4 py-3">
                      {c.priceListName ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-foreground text-[11px]">
                          <Tag className="w-3 h-3 text-primary" />
                          {c.priceListName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">الافتراضية</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          c.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-muted/60 text-muted-foreground border-border"
                        }`}
                      >
                        {c.isActive ? "نشط" : "موقوف"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <Link
                        to={`/wholesale/customers/${c.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        الملف
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
