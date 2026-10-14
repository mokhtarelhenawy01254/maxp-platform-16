import React, { useState, useEffect, useMemo } from "react";
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
  RefreshCw,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

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

  const loadData = async () => {
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

  useEffect(() => {
    void loadData();
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

  if (loading && customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-2.5 text-muted-foreground">
        <RefreshCw className="size-5 animate-spin text-primary" />
        <span className="text-xs font-mono">جاري تحميل سجل عملاء وتجار الجملة...</span>
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
              <Users className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              عملاء وتجار الجملة
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              {stats.total} تاجر مسجل
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            إدارة حسابات التجار، الحدود الائتمانية، فترات السداد، وقوائم الأسعار المعينة
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            className="h-8 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98]"
          >
            <RefreshCw className="size-3.5" />
            <span>تحديث</span>
          </Button>

          <Link to="/wholesale/customers/new">
            <Button size="sm" className="h-8 px-3 text-xs font-mono gap-1 active:scale-[0.98]">
              <Plus className="size-3.5" />
              <span>إضافة تاجر جملة</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">إجمالي التجار</p>
            <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">
              {stats.total}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">في قاعدة البيانات</p>
          </div>
          <div className="size-7 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-600">
            <Users className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">الحسابات النشطة</p>
            <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-0.5">
              {stats.active}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">حساب مؤهل للطلب</p>
          </div>
          <div className="size-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-600 dark:text-purple-400">الحدود الائتمانية</p>
            <p className="text-lg font-bold tracking-tight text-purple-600 dark:text-purple-400 font-mono tabular-nums mt-0.5">
              {stats.totalLimit.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ج.م
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">تسهيلات سحب ممنوحة</p>
          </div>
          <div className="size-7 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-600">
            <ShieldCheck className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400">الأرصدة القائمة</p>
            <p className="text-lg font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-0.5">
              {stats.totalBalance.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ج.م
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">مبالغ واجبة التحصيل</p>
          </div>
          <div className="size-7 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-600">
            <Wallet className="size-3.5" />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2 font-mono">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Single-Surface Chassis */}
      <div className="rounded-lg border border-border/70 bg-card shadow-xs overflow-hidden">
        {/* Controls Bar */}
        <div className="p-2.5 sm:p-3 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              className="h-8 pr-8 text-xs font-mono bg-background border-border/70"
              placeholder="بحث بالاسم أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 font-mono text-xs">
            {[
              { id: "all", label: `الكل (${customers.length})` },
              { id: "active", label: `نشط (${stats.active})` },
              { id: "inactive", label: `موقوف (${stats.total - stats.active})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterActive(tab.id)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  filterActive === tab.id
                    ? "bg-card text-foreground font-semibold shadow-xs border border-border/70"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {filteredCustomers.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <div className="size-9 rounded-full bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center">
              <Users className="size-4" />
            </div>
            <h3 className="text-xs font-semibold text-foreground font-mono">لا يوجد تجار جملة يطابقون البحث</h3>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              قم بإضافة تاجر جديد أو تعديل معايير البحث المعروضة
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground font-mono text-[11px]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">اسم التاجر / العميل</th>
                  <th className="px-4 py-2.5 font-medium">الهاتف</th>
                  <th className="px-4 py-2.5 font-medium">الحد الائتماني</th>
                  <th className="px-4 py-2.5 font-medium">الرصيد المستحق</th>
                  <th className="px-4 py-2.5 font-medium">فترة السداد</th>
                  <th className="px-4 py-2.5 font-medium">قائمة الأسعار</th>
                  <th className="px-4 py-2.5 font-medium text-center">الحالة</th>
                  <th className="px-4 py-2.5 font-medium text-left w-16">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      <Link
                        to={`/wholesale/customers/${c.id}`}
                        className="hover:text-primary transition-colors inline-flex items-center gap-1"
                      >
                        {c.customer ? `${c.customer.firstName} ${c.customer.lastName}` : "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono text-[11px]" dir="ltr">
                      {c.customer?.phone || "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-foreground">
                      {Number(c.creditLimit).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums font-bold">
                      <span className={Number(c.currentBalance) > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}>
                        {Number(c.currentBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono">
                      {c.paymentTermsDays} يوم
                    </td>
                    <td className="px-4 py-2.5">
                      {c.priceListName ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60 text-foreground text-[10px] font-mono border border-border/40">
                          <Tag className="size-3 text-primary" />
                          {c.priceListName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px] font-mono">الافتراضية</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${
                          c.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-muted/60 text-muted-foreground border-border/60"
                        }`}
                      >
                        {c.isActive ? "نشط" : "موقوف"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-left">
                      <Link
                        to={`/wholesale/customers/${c.id}`}
                        className="inline-flex items-center gap-0.5 text-xs font-mono text-primary hover:underline"
                      >
                        <span>الملف</span>
                        <ArrowUpRight className="size-3 rtl:rotate-90" />
                      </Link>
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
}
