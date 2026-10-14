import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import {
  Users,
  Search,
  Plus,
  ShoppingBag,
  DollarSign,
  RefreshCw,
  ArrowUpRight,
  UserCheck,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
}

export default function AffiliateCustomers() {
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/affiliates/customers");
      const raw = response.data?.data ?? response.data;
      const list = Array.isArray(raw) ? raw : (raw?.customers || raw?.items || []);
      setCustomers(list);
    } catch (error: unknown) {
      console.error("Error loading customers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const safeCustomers = useMemo(() => (Array.isArray(customers) ? customers : []), [customers]);

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return safeCustomers;
    const q = search.toLowerCase();
    return safeCustomers.filter(
      (c) =>
        `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [safeCustomers, search]);

  const totalOrders = useMemo(
    () => safeCustomers.reduce((acc, c) => acc + (Number(c.totalOrders) || 0), 0),
    [safeCustomers]
  );

  const totalSpent = useMemo(
    () => safeCustomers.reduce((acc, c) => acc + (Number(c.totalSpent) || 0), 0),
    [safeCustomers]
  );

  if (loading && safeCustomers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-2.5 text-muted-foreground">
        <RefreshCw className="size-5 animate-spin text-primary" />
        <span className="text-xs font-mono">جاري تحميل سجل العملاء المرتبطين...</span>
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
              سجل عملاء المسوق
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              {safeCustomers.length} عميل مسجل
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            قائمة العملاء المنسوبين لك عبر روابط الإحالة وتتبع مشترياتهم التراكمية
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadCustomers()}
            className="h-8 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98]"
          >
            <RefreshCw className="size-3.5" />
            <span>تحديث</span>
          </Button>

          <Button
            size="sm"
            onClick={() => navigate("/affiliates/orders/create")}
            className="h-8 px-3 text-xs font-mono gap-1 active:scale-[0.98]"
          >
            <Plus className="size-3.5" />
            <span>إنشاء طلب لعميل</span>
          </Button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono">
        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">العملاء النشطون</p>
            <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">
              {safeCustomers.length}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">مرتبطين برمز الإحالة</p>
          </div>
          <div className="size-7 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
            <UserCheck className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-500">إجمالي الطلبات</p>
            <p className="text-xl font-bold tracking-tight text-emerald-500 font-mono tabular-nums mt-0.5">
              {totalOrders}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">طلب منفذ</p>
          </div>
          <div className="size-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
            <ShoppingBag className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-500">مبيعات العملاء</p>
            <p className="text-lg font-bold tracking-tight text-purple-500 font-mono tabular-nums mt-0.5">
              {Number(totalSpent).toLocaleString("en-US", { minimumFractionDigits: 0 })} ج.م
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">حجم الشراء الإجمالي</p>
          </div>
          <div className="size-7 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
            <DollarSign className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-amber-500">متوسط قيمة العميل</p>
            <p className="text-lg font-bold tracking-tight text-amber-500 font-mono tabular-nums mt-0.5">
              {safeCustomers.length > 0
                ? `${Math.round(totalSpent / safeCustomers.length).toLocaleString("en-US")} ج.م`
                : "0 ج.م"}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">معدل إنفاق العميل</p>
          </div>
          <div className="size-7 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
            <Users className="size-3.5" />
          </div>
        </div>
      </div>

      {/* Main Single-Surface Chassis */}
      <div className="rounded-lg border border-border/70 bg-card shadow-xs overflow-hidden">
        {/* Search Bar */}
        <div className="p-2.5 sm:p-3 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              className="h-8 pr-8 text-xs font-mono bg-background border-border/70"
              placeholder="بحث بالاسم أو الهاتف أو البريد..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {filteredCustomers.length} عميل
          </span>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <div className="size-9 rounded-full bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center">
              <Users className="size-4" />
            </div>
            <h3 className="text-xs font-semibold text-foreground font-mono">لا يوجد عملاء يطابقون البحث</h3>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              شارك رابط الإحالة الخاص بك لجلب عملاء جدد ونسب مبيعاتهم لحسابك
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground font-mono text-[11px]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">اسم العميل</th>
                  <th className="px-4 py-2.5 font-medium">الهاتف</th>
                  <th className="px-4 py-2.5 font-medium">البريد الإلكتروني</th>
                  <th className="px-4 py-2.5 font-medium text-center">عدد الطلبات</th>
                  <th className="px-4 py-2.5 font-medium">إجمالي المشتريات</th>
                  <th className="px-4 py-2.5 font-medium text-left w-24">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {customer.firstName} {customer.lastName}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono text-[11px]" dir="ltr">
                      {customer.phone || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono text-[11px]">
                      {customer.email || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono tabular-nums font-semibold text-foreground">
                      {customer.totalOrders}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums font-bold text-emerald-500">
                      {formatPrice(customer.totalSpent)}
                    </td>
                    <td className="px-4 py-2.5 text-left">
                      <button
                        onClick={() => navigate(`/affiliates/orders/create?customerId=${customer.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline"
                      >
                        <span>إنشاء طلب</span>
                        <ArrowUpRight className="size-3 rtl:rotate-90" />
                      </button>
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
