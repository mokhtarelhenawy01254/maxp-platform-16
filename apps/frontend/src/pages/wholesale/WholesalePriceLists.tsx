import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import {
  Tag,
  Plus,
  Trash2,
  Users,
  Calendar,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Pencil,
} from "lucide-react";

interface PriceList {
  id: string;
  name: string;
  nameEn?: string;
  currency: string;
  isActive: boolean;
  customerCount: number;
  createdAt: string;
}

export default function WholesalePriceLists() {
  const [lists, setLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.get("/wholesale/price-lists");
        setLists(res?.data?.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || "تعذر تحميل قوائم الأسعار");
      } finally {
        setLoading(false);
      }
    };
    load();
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

  const stats = useMemo(() => {
    const total = lists.length;
    const active = lists.filter((l) => l.isActive).length;
    const totalAssignedCustomers = lists.reduce((acc, l) => acc + (l.customerCount || 0), 0);
    return { total, active, totalAssignedCustomers };
  }, [lists]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">جاري تحميل قوائم الأسعار...</span>
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
              <Tag className="w-3.5 h-3.5" />
              هياكل التسعير المخصصة
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {stats.total} قائمة تسعير
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            قوائم أسعار الجملة
          </h1>
          <p className="text-xs text-muted-foreground">
            تخصيص أسعار وخصومات حصرية لشرائح التجار والموزعين على مستوى الأصناف
          </p>
        </div>

        <Link
          to="/wholesale/price-lists/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Plus className="w-4 h-4" />
          إضافة قائمة أسعار جديدة
        </Link>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">إجمالي قوائم الأسعار</div>
            <div className="text-2xl font-bold text-foreground font-mono tabular-nums">
              {stats.total}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">القوائم النشطة</div>
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
            <div className="text-xs text-muted-foreground">التجار المرتبطين بالقوائم</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums">
              {stats.totalAssignedCustomers}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Price Lists Table */}
      {lists.length === 0 ? (
        <div className="bg-card border border-border/80 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center">
            <Tag className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">لا توجد قوائم أسعار بعد</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            قم بإضافة أول قائمة أسعار لتطبيق أسعار خاصة لتجار الجملة والموزعين
          </p>
          <Link
            to="/wholesale/price-lists/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة قائمة أسعار
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">اسم قائمة الأسعار</th>
                  <th className="px-4 py-3 font-semibold">العملة</th>
                  <th className="px-4 py-3 font-semibold">الحالة</th>
                  <th className="px-4 py-3 font-semibold">التجار المرتبطين</th>
                  <th className="px-4 py-3 font-semibold">تاريخ الإنشاء</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {lists.map((list) => (
                  <tr key={list.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      <Link
                        to={`/wholesale/price-lists/${list.id}`}
                        className="hover:text-primary transition-colors inline-flex items-center gap-1"
                      >
                        {list.name}
                        {list.nameEn && (
                          <span className="text-muted-foreground font-normal text-[11px]">
                            ({list.nameEn})
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono">{list.currency}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          list.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-muted/60 text-muted-foreground border-border"
                        }`}
                      >
                        {list.isActive ? "نشط" : "معطل"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-foreground">
                      {list.customerCount} تاجر
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono">
                      {new Date(list.createdAt).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-4 py-3 text-left">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/wholesale/price-lists/${list.id}`}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                          title="تعديل القائمة"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(list.id)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                          title="حذف القائمة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
