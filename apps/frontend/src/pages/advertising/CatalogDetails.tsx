import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Trash2,
  RotateCcw,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Clock,
  Link2,
  Copy,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  facebookAdsService,
  FacebookProductCatalog,
  FacebookCatalogProduct,
} from "../../services/facebookAdsService";
import { CatalogProductsTable } from "./CatalogProductsTable";

const CatalogDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<FacebookProductCatalog | null>(null);
  const [products, setProducts] = useState<FacebookCatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncAll, setSyncAll] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (id) {
      loadCatalog();
      loadCatalogProducts();
    }
  }, [id]);

  const loadCatalog = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await facebookAdsService.getCatalog(id);
      setCatalog(data);
    } catch (error: any) {
      console.error("Error loading catalog:", error);
      toast.error(error?.response?.data?.error || "فشل في تحميل Catalog");
      navigate("/advertising/facebook-ads/catalogs");
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogProducts = async (page: number = 1) => {
    if (!id) return;

    try {
      setLoadingProducts(true);
      const result = await facebookAdsService.getCatalogProducts(id, page, 50);
      setProducts(result?.data || []);
    } catch (error: any) {
      console.error("Error loading catalog products:", error);
      tToast.error("CatalogDetails.failed_load_53c9");
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSync = async () => {
    if (!id) return;

    try {
      setSyncing(true);
      const result = await facebookAdsService.syncProducts(id, {
        syncAll,
        productIds: syncAll ? undefined : selectedProducts,
      });

      toast.success(`تم مزامنة ${result.successful || 0} منتج بنجاح`);

      await loadCatalog();
      await loadCatalogProducts();

      if (result.failed > 0) {
        toast.error(`فشل في مزامنة ${result.failed} منتج`);
      }
    } catch (error: any) {
      console.error("Error syncing products:", error);
      toast.error(error?.response?.data?.error || "فشل في مزامنة المنتجات");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("هل أنت متأكد من حذف هذا Catalog؟")) return;

    try {
      await facebookAdsService.deleteCatalog(id);
      tToast.success("CatalogDetails.success_delete_6559");
      navigate("/advertising/facebook-ads/catalogs");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "فشل في حذف Catalog");
    }
  };

  const toggleProductSelection = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter((pid) => pid !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  const copyFeedUrl = () => {
    if (catalog?.feedUrl) {
      navigator.clipboard.writeText(catalog.feedUrl);
      toast.success("تم نسخ رابط Feed بنجاح");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <RotateCcw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="text-center py-16 border border-dashed border-border/70 rounded-2xl bg-card p-6">
        <p className="text-xs text-muted-foreground">لم يتم العثور على Catalog</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/advertising/facebook-ads/catalogs")}
            className="p-2 rounded-xl border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40 active:scale-[0.96] transition-all"
            title="رجوع"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <ShoppingBag className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {catalog.name}
              </h1>
            </div>
            {catalog.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{catalog.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || (!syncAll && selectedProducts.length === 0)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all shadow-xs disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "جاري المزامنة…" : "مزامنة المنتجات"}</span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-destructive hover:bg-destructive/10 border border-destructive/20 active:scale-[0.97] transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>حذف</span>
          </button>
        </div>
      </div>

      {/* Info KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <span className="text-xs text-muted-foreground">إجمالي المنتجات</span>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-foreground">
            {catalog.totalProducts || 0}
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <span className="text-xs text-muted-foreground">المنتجات المتزامنة</span>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {catalog.syncedProducts || 0}
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <span className="text-xs text-muted-foreground">حالة المزامنة الأخيرة</span>
          <div className="mt-1 flex items-center gap-2">
            {catalog.lastSyncStatus === "SUCCESS" ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                مكتمل بنجاح
              </span>
            ) : catalog.lastSyncStatus === "FAILED" ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
                <AlertCircle className="w-4 h-4" />
                فشل في المزامنة
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
                قيد المعالجة
              </span>
            )}
          </div>
          {catalog.lastSyncAt && (
            <p className="mt-1 text-[11px] font-mono tabular-nums text-muted-foreground">
              {new Date(catalog.lastSyncAt).toLocaleString("ar-EG")}
            </p>
          )}
        </div>
      </div>

      {/* Feed URL Card */}
      {catalog.feedUrl && (
        <div className="bg-card rounded-2xl border border-border/70 p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground">رابط Product Feed التلقائي</span>
            </div>
            <button
              type="button"
              onClick={copyFeedUrl}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>نسخ الرابط</span>
            </button>
          </div>
          <p className="font-mono text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-xl border border-border/60 break-all select-all" dir="ltr">
            {catalog.feedUrl}
          </p>
        </div>
      )}

      {/* Products Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">المنتجات في الكتالوج</h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted/40 text-muted-foreground border border-border/70 font-mono tabular-nums">
              {products.length} منتج
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer bg-muted/20 px-3 py-1.5 rounded-xl border border-border/70">
              <input
                type="checkbox"
                checked={syncAll}
                onChange={(e) => setSyncAll(e.target.checked)}
                className="rounded border-border/80 text-primary focus:ring-0"
              />
              <span className="font-semibold text-foreground">مزامنة جميع المنتجات</span>
            </label>
          </div>
        </div>

        {loadingProducts ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <RotateCcw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <CatalogProductsTable
            products={products}
            selectedProducts={selectedProducts}
            onToggleProduct={toggleProductSelection}
            syncAll={syncAll}
          />
        )}
      </div>
    </div>
  );
};

export default CatalogDetails;
