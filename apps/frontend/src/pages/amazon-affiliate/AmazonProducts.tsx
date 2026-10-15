import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  ShoppingBag,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteAmazonProduct,
  listAmazonProducts,
  syncAmazonProducts,
  type AmazonAffiliateProductRow,
} from "../../services/amazonAffiliateService";

const AmazonProductsPage: React.FC = () => {
  const [rows, setRows] = useState<AmazonAffiliateProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listAmazonProducts();
      setRows(data || []);
    } catch {
      toast.error("تعذر تحميل المنتجات المستوردة من أمازون");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncAmazonProducts();
      toast.success(`تمت المزامنة بنجاح: ${result.succeeded} محدث / ${result.failed} أخطاء`);
      await load();
    } catch {
      toast.error("فشلت عملية مزامنة منتجات أمازون");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (row: AmazonAffiliateProductRow) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${row.product?.name || row.asin}" من المنتجات المستوردة؟`)) return;
    try {
      await deleteAmazonProduct(row.id);
      toast.success("تم حذف المنتج بنجاح");
      await load();
    } catch {
      toast.error("فشل حذف المنتج");
    }
  };

  const inStockCount = rows.filter(r => r.inStock).length;
  const outOfStockCount = rows.length - inStockCount;

  return (
    <div dir="rtl" className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">منتجات أمازون المستوردة</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                إدارة ومتابعة المنتجات التابعة لبرنامج Amazon Associates ومزامنة أسعارها تلقائياً
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/amazon-affiliate/import"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-xs font-semibold text-foreground transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-primary" />
            <span>استيراد منتجات جديدة</span>
          </Link>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || rows.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? "جارِ المزامنة..." : "مزامنة الأسعار والمخزون"}</span>
          </button>
        </div>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm">
          <span className="text-[11px] font-medium text-muted-foreground block">إجمالي المنتجات</span>
          <span className="text-xl font-bold font-mono tabular-nums text-foreground mt-0.5 block">{rows.length}</span>
        </div>
        <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm">
          <span className="text-[11px] font-medium text-muted-foreground block">المتوفر بالمخزن</span>
          <span className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5 block">{inStockCount}</span>
        </div>
        <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm">
          <span className="text-[11px] font-medium text-muted-foreground block">غير متوفر / نفد</span>
          <span className="text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-0.5 block">{outOfStockCount}</span>
        </div>
        <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm">
          <span className="text-[11px] font-medium text-muted-foreground block">السوق المعتمد</span>
          <span className="text-sm font-semibold font-mono text-foreground mt-1 block">Amazon Global</span>
        </div>
      </div>

      {/* Table Surface */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">جارِ تحميل المنتجات المستوردة...</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-card border border-dashed border-border/80 rounded-xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted/40 mx-auto flex items-center justify-center text-muted-foreground">
            <Package className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">لا توجد منتجات مستوردة بعد</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              ابدأ باستيراد روابط المنتجات أو أكواد ASIN لإدراجها في كتالوج متجرك مع احتساب عمولات الإحالة.
            </p>
          </div>
          <Link
            to="/amazon-affiliate/import"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>الانتقال لشاشة الاستيراد</span>
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground font-semibold">
                <tr>
                  <th className="px-4 py-3">المنتج والتفاصيل</th>
                  <th className="px-4 py-3 font-mono">ASIN</th>
                  <th className="px-4 py-3">السعر التقديري</th>
                  <th className="px-4 py-3">حالة التوفر</th>
                  <th className="px-4 py-3">آخر مزامنة</th>
                  <th className="px-4 py-3 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {row.product?.mainImage ? (
                          <img 
                            src={row.product.mainImage} 
                            alt={row.product.name} 
                            className="h-10 w-10 rounded-lg object-contain bg-muted/10 border border-border/40 shrink-0" 
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0 max-w-xs sm:max-w-md">
                          <p className="truncate font-semibold text-foreground text-xs">{row.product?.name || row.asin}</p>
                          <a
                            href={row.amazonUrl || `https://${row.marketplace}/dp/${row.asin}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-mono mt-0.5"
                            dir="ltr"
                          >
                            <span>{row.marketplace}/dp/{row.asin}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground" dir="ltr">
                      {row.asin}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums font-bold text-foreground">
                      {row.lastPrice != null ? `${row.lastPrice} ${row.lastPriceCurrency}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        row.inStock 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      }`}>
                        {row.inStock ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        <span>{row.inStock ? "متوفر بالمخزن" : "نفد من المخزن"}</span>
                      </span>
                      {row.status === "ERROR" && (
                        <span className="mt-1 block text-[10px] text-rose-500 font-medium">
                          {row.syncError || "خطأ أثناء المزامنة"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground font-mono tabular-nums">
                      {row.lastSyncAt ? (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground/60" />
                          <span>{new Date(row.lastSyncAt).toLocaleString("ar-EG")}</span>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-left">
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="حذف المنتج من القائمة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
};

export default AmazonProductsPage;