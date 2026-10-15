import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Trash2,
  RotateCcw,
  ArchiveX,
  ArrowRight,
  Package,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { TrashProductCard, DeletedProduct } from "./TrashProductCard";

const ProductsTrash: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  const [products, setProducts] = useState<DeletedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchDeletedProducts = async () => {
    setLoading(true);
    try {
      const { apiClient } = await import("../../services/apiClient");
      const response = await apiClient.get("/products/trash/all");
      if (response.data?.success) {
        setProducts(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching deleted products:", error);
      tToast.error("productsTrash.failed_fetch_bddf");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedProducts();
  }, []);

  const handleRestore = async (productId: string) => {
    setRestoring(productId);
    try {
      const { apiClient } = await import("../../services/apiClient");
      const response = await apiClient.post(`/products/${productId}/restore`);
      if (response.data?.success) {
        tToast.success("productsTrash.msg_b52a");
        setProducts((prev) => (prev || []).filter((p) => p.id !== productId));
        setSelectedProducts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Error restoring product:", error);
      tToast.error("productsTrash.msg_9da5");
    } finally {
      setRestoring(null);
    }
  };

  const handlePermanentDelete = async (productId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المنتج نهائياً؟ لا يمكن التراجع عن هذا الإجراء.")) {
      return;
    }

    setDeleting(productId);
    try {
      const { apiClient } = await import("../../services/apiClient");
      const response = await apiClient.delete(`/products/${productId}/permanent`);
      if (response.data?.success) {
        tToast.success("productsTrash.success_delete_4f2e");
        setProducts((prev) => (prev || []).filter((p) => p.id !== productId));
        setSelectedProducts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Error permanently deleting product:", error);
      tToast.error("productsTrash.failed_delete_c5b3");
    } finally {
      setDeleting(null);
    }
  };

  const handleRestoreAll = async () => {
    if (selectedProducts.size === 0) {
      tToast.error("productsTrash.msg_d600");
      return;
    }

    setLoading(true);
    try {
      const { apiClient } = await import("../../services/apiClient");
      let successCount = 0;
      for (const productId of selectedProducts) {
        try {
          const response = await apiClient.post(`/products/${productId}/restore`);
          if (response.data?.success) {
            successCount++;
          }
        } catch (e) {
          console.error(`Error restoring product ${productId}:`, e);
        }
      }

      if (successCount > 0) {
        toast.success(`تم استعادة ${successCount} منتج بنجاح`);
        fetchDeletedProducts();
        setSelectedProducts(new Set());
      }
    } catch (error) {
      console.error("Error restoring all products:", error);
      tToast.error("productsTrash.failed_restore_ea6a");
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDeleteAll = async () => {
    if (selectedProducts.size === 0) {
      tToast.error("productsTrash.msg_1884");
      return;
    }

    if (!window.confirm(`هل أنت متأكد من حذف ${selectedProducts.size} منتج نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`)) {
      return;
    }

    setLoading(true);
    try {
      const { apiClient } = await import("../../services/apiClient");
      let successCount = 0;
      for (const productId of selectedProducts) {
        try {
          const response = await apiClient.delete(`/products/${productId}/permanent`);
          if (response.data?.success) {
            successCount++;
          }
        } catch (e) {
          console.error(`Error permanently deleting product ${productId}:`, e);
        }
      }

      if (successCount > 0) {
        toast.success(`تم حذف ${successCount} منتج نهائياً`);
        fetchDeletedProducts();
        setSelectedProducts(new Set());
      }
    } catch (error) {
      console.error("Error deleting all products:", error);
      tToast.error("productsTrash.failed_delete_c5b3");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (productId: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set((products || []).map((p) => p.id)));
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div className="flex items-center gap-3">
          <Link
            to="/products"
            className="p-2 rounded-xl border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40 active:scale-[0.96] transition-all"
            title="العودة إلى المنتجات"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                سلة المحذوفات
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted/40 text-muted-foreground border border-border/70 font-mono tabular-nums">
                <ArchiveX className="h-3.5 w-3.5 text-muted-foreground" />
                {products.length} منتج
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              المنتجات المحذوفة مؤقتاً يمكنك استعادتها أو تفريغها نهائياً
            </p>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center gap-2">
          {selectedProducts.size > 0 && (
            <>
              <button
                type="button"
                onClick={handleRestoreAll}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 active:scale-[0.97] transition-all shadow-2xs disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>استعادة ({selectedProducts.size})</span>
              </button>
              <button
                type="button"
                onClick={handlePermanentDeleteAll}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 active:scale-[0.97] transition-all disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>حذف نهائي ({selectedProducts.size})</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={fetchDeletedProducts}
            disabled={loading}
            className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40 active:scale-[0.94] transition-all disabled:opacity-50"
            title="تحديث"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
        {loading && products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <RotateCcw className="h-6 w-6 text-muted-foreground animate-spin mb-2" />
            <p className="text-xs font-medium">جاري جلب سلة المحذوفات...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-card border border-border/70 rounded-2xl p-12 text-center shadow-2xs">
            <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground mx-auto mb-3 border border-border/60">
              <ArchiveX className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-1">
              سلة المحذوفات فارغة
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              لا توجد أي منتجات محذوفة حالياً. المنتجات التي تحذفها مؤقتاً تظهر هنا.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all shadow-2xs"
            >
              <Package className="h-3.5 w-3.5" />
              <span>العودة للمنتجات</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Control Strip */}
            <div className="bg-card border border-border/70 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs shadow-2xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedProducts.size === products.length && products.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-border/80 text-primary focus:ring-0 cursor-pointer"
                />
                <span className="font-semibold text-foreground">
                  تحديد الكل ({products.length})
                </span>
              </label>

              <span className="font-mono tabular-nums text-[11px] text-muted-foreground">
                {selectedProducts.size} محدد
              </span>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(products || []).map((product) => (
                <TrashProductCard
                  key={product.id}
                  product={product}
                  isSelected={selectedProducts.has(product.id)}
                  isRestoring={restoring === product.id}
                  isDeleting={deleting === product.id}
                  onToggleSelect={toggleSelect}
                  onRestore={handleRestore}
                  onPermanentDelete={handlePermanentDelete}
                  formatPrice={formatPrice}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsTrash;
