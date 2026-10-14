import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import {
  Tag,
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Pencil,
  RefreshCw,
  Search,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

interface PriceList {
  id: string;
  name: string;
  nameEn?: string;
  currency: string;
  isActive: boolean;
  customerCount: number;
  discountPct?: number;
  createdAt: string;
}

export default function WholesalePriceLists() {
  const [lists, setLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/wholesale/price-lists");
      const raw = res?.data?.data ?? res?.data;
      const listArray = Array.isArray(raw)
        ? raw
        : (raw?.priceLists || raw?.items || raw?.lists || []);

      const normalized: PriceList[] = listArray.map((l: any) => ({
        id: l.id || String(Math.random()),
        name: l.name || "قائمة تسعير",
        nameEn: l.nameEn,
        currency: l.currency || "EGP",
        isActive: l.isActive !== undefined ? Boolean(l.isActive) : (l.isDefault !== undefined ? true : true),
        customerCount: Number(l.customerCount ?? l.productsCount ?? 0),
        discountPct: l.discountPct ? Number(l.discountPct) : undefined,
        createdAt: l.createdAt || new Date().toISOString(),
      }));

      setLists(normalized);
    } catch (err: any) {
      setError(err?.response?.data?.message || "تعذر تحميل قوائم الأسعار");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف قائمة الأسعار هذه؟")) return;
    try {
      await apiClient.delete(`/wholesale/price-lists/${id}`);
      setLists((prev) => prev.filter((l) => l.id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.message || "فشل حذف قائمة الأسعار");
    }
  };

  const safeLists = useMemo(() => (Array.isArray(lists) ? lists : []), [lists]);

  const filteredLists = useMemo(() => {
    if (!search.trim()) return safeLists;
    const q = search.toLowerCase();
    return safeLists.filter(
      (l) => l.name.toLowerCase().includes(q) || (l.nameEn && l.nameEn.toLowerCase().includes(q))
    );
  }, [safeLists, search]);

  const stats = useMemo(() => {
    const total = safeLists.length;
    const active = safeLists.filter((l) => l.isActive).length;
    const totalAssignedCustomers = safeLists.reduce((acc, l) => acc + (l.customerCount || 0), 0);
    return { total, active, totalAssignedCustomers };
  }, [safeLists]);

  if (loading && safeLists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-2.5 text-muted-foreground">
        <RefreshCw className="size-5 animate-spin text-primary" />
        <span className="text-xs font-mono">جاري تحميل قوائم الأسعار...</span>
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
              <Tag className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              قوائم أسعار الجملة
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              {stats.total} قائمة تسعير
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            تخصيص أسعار وخصومات حصرية لشرائح التجار والموزعين على مستوى الأصناف
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

          <Link to="/wholesale/price-lists/new">
            <Button size="sm" className="h-8 px-3 text-xs font-mono gap-1 active:scale-[0.98]">
              <Plus className="size-3.5" />
              <span>إضافة قائمة أسعار</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">إجمالي قوائم الأسعار</p>
            <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">
              {stats.total}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">هياكل تسعير معرفة</p>
          </div>
          <div className="size-7 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
            <Layers className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-500">القوائم النشطة</p>
            <p className="text-xl font-bold tracking-tight text-emerald-500 font-mono tabular-nums mt-0.5">
              {stats.active}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">سارية المفعول حالياً</p>
          </div>
          <div className="size-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-500">التجار المرتبطين</p>
            <p className="text-xl font-bold tracking-tight text-purple-500 font-mono tabular-nums mt-0.5">
              {stats.totalAssignedCustomers}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">تاجر معين لقوائم</p>
          </div>
          <div className="size-7 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
            <Users className="size-3.5" />
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
        {/* Search Bar */}
        <div className="p-2.5 sm:p-3 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              className="h-8 pr-8 text-xs font-mono bg-background border-border/70"
              placeholder="بحث في قوائم الأسعار..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {filteredLists.length} قائمة
          </span>
        </div>

        {filteredLists.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <div className="size-9 rounded-full bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center">
              <Tag className="size-4" />
            </div>
            <h3 className="text-xs font-semibold text-foreground font-mono">لا توجد قوائم أسعار تطابق البحث</h3>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              قم بإضافة أول قائمة أسعار لتطبيق أسعار خاصة لتجار الجملة والموزعين
            </p>
            <Link to="/wholesale/price-lists/new">
              <Button size="sm" className="h-8 px-3 text-xs font-mono gap-1 active:scale-[0.98] mt-2">
                <Plus className="size-3.5" />
                <span>إضافة قائمة أسعار</span>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground font-mono text-[11px]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">اسم قائمة الأسعار</th>
                  <th className="px-4 py-2.5 font-medium">العملة</th>
                  <th className="px-4 py-2.5 font-medium">الخصم / الأصناف</th>
                  <th className="px-4 py-2.5 font-medium text-center">الحالة</th>
                  <th className="px-4 py-2.5 font-medium">التجار المرتبطين</th>
                  <th className="px-4 py-2.5 font-medium">تاريخ الإنشاء</th>
                  <th className="px-4 py-2.5 font-medium text-left w-16">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredLists.map((list) => (
                  <tr key={list.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      <Link
                        to={`/wholesale/price-lists/${list.id}`}
                        className="hover:text-primary transition-colors inline-flex items-center gap-1.5"
                      >
                        <span>{list.name}</span>
                        {list.nameEn && (
                          <span className="text-muted-foreground font-mono text-[10px]">
                            ({list.nameEn})
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono text-[11px]">{list.currency}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground text-[11px]">
                      {list.discountPct ? `${list.discountPct}% خصم` : "أسعار مخصصة"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${
                          list.isActive
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-muted/60 text-muted-foreground border-border/60"
                        }`}
                      >
                        {list.isActive ? "نشط" : "معطل"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-foreground">
                      {list.customerCount} تاجر
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono text-[11px]">
                      {new Date(list.createdAt).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-4 py-2.5 text-left">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/wholesale/price-lists/${list.id}`}
                          className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                          title="تعديل القائمة"
                        >
                          <Pencil className="size-3.5" />
                        </Link>
                        <button
                          onClick={() => void handleDelete(list.id)}
                          className="size-7 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded transition-colors"
                          title="حذف القائمة"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
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
