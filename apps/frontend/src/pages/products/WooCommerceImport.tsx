import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Search,
  ShoppingBag,
  Check,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Globe,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import i18n from "../../i18n";
import { tToast } from "../../utils/i18n-toast";
import tokenManager from "../../utils/tokenManager";

interface Product {
  name: string;
  description: string;
  price: number;
  comparePrice: number | null;
  cost: number | null;
  sku: string | null;
  barcode: string | null;
  stock: number;
  trackInventory: boolean;
  images: string[];
  category?: string;
  tags: string[];
}

const WooCommerceImport: React.FC = () => {
  const navigate = useNavigate();
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProducts = async () => {
    if (!storeUrl.trim() || !consumerKey.trim() || !consumerSecret.trim()) {
      tToast.error("WooCommerceImport.msg_9c80");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/v1/woocommerce/fetch-products", {
        method: "POST",
        headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          storeUrl: storeUrl.trim(),
          consumerKey: consumerKey.trim(),
          consumerSecret: consumerSecret.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        const fetchedProducts: Product[] = data.data?.products ?? [];
        setProducts(fetchedProducts);
        toast.success(data.message || `تم جلب ${fetchedProducts.length} منتج`);
        setSelectedProducts(new Set(fetchedProducts.map((_, i) => i)));
      } else {
        toast.error(data.message || i18n.t("WooCommerceImport.failed_fetch_579a"));
      }
    } catch (error: unknown) {
      console.error("Error fetching products:", error);
      tToast.error("WooCommerceImport.msg_d18b");
    } finally {
      setLoading(false);
    }
  };

  const clearData = () => {
    setProducts([]);
    setSelectedProducts(new Set());
    setSearchTerm("");
  };

  const importProducts = async () => {
    if (selectedProducts.size === 0) {
      tToast.error("WooCommerceImport.msg_7f37");
      return;
    }

    setImporting(true);
    try {
      const selectedProductsList = Array.from(selectedProducts).map((i) => products[i]);
      const response = await fetch("/api/v1/woocommerce/import-selected", {
        method: "POST",
        headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ products: selectedProductsList }),
      });

      const data = await response.json();
      if (data.success) {
        const { imported, failed, skipped } = data.data || {};
        let message = `تم استيراد ${imported || 0} منتج بنجاح`;
        if (skipped > 0) message += ` | تم تخطي ${skipped} منتج موجود`;
        if (failed > 0) message += ` | فشل ${failed} منتج`;
        toast.success(message);
        clearData();
      } else {
        toast.error(data.message || i18n.t("WooCommerceImport.msg_b68b"));
      }
    } catch (error: unknown) {
      console.error("Error importing products:", error);
      tToast.error("WooCommerceImport.msg_c438");
    } finally {
      setImporting(false);
    }
  };

  const toggleProduct = (index: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedProducts(newSelected);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const toggleAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map((p) => products.indexOf(p))));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 p-4 sm:p-6 font-sans text-foreground" dir="rtl">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <button
            onClick={() => navigate("/products")}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            <span>العودة لكتالوج المنتجات</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              استيراد المنتجات من WooCommerce
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            مزامنة واستيراد كتالوج المنتجات والصور والمخزون مباشرة من متجر ووكومرس
          </p>
        </div>
      </header>

      {/* Connection Form */}
      {products.length === 0 && (
        <div className="max-w-2xl mx-auto rounded-xl border border-border/70 bg-card p-5 space-y-4 shadow-xs text-xs">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <Globe className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground text-sm">بيانات الربط مع WooCommerce REST API</h2>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block font-medium text-foreground mb-1">
                رابط متجر ووكومرس <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="https://yourstore.com"
                dir="ltr"
                className="w-full px-3 py-2 rounded-md border border-border/70 bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary font-mono text-left"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1 flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-muted-foreground" />
                Consumer Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={consumerKey}
                onChange={(e) => setConsumerKey(e.target.value)}
                placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                dir="ltr"
                className="w-full px-3 py-2 rounded-md border border-border/70 bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary font-mono text-left"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1 flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-muted-foreground" />
                Consumer Secret <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={consumerSecret}
                onChange={(e) => setConsumerSecret(e.target.value)}
                placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                dir="ltr"
                className="w-full px-3 py-2 rounded-md border border-border/70 bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary font-mono text-left"
                disabled={loading}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                يمكن توليد المفاتيح من: WooCommerce → Settings → Advanced → REST API
              </p>
            </div>

            <button
              onClick={fetchProducts}
              disabled={loading || !storeUrl.trim() || !consumerKey.trim() || !consumerSecret.trim()}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري الاتصال وجلب المنتجات...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>الاتصال وجلب المنتجات</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Products Preview & Selection */}
      {products.length > 0 && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="rounded-lg border border-border/70 bg-card p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="بحث في المنتجات المجلوبة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 rounded-md border border-border/70 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleAll}
                className="rounded-md border border-border/70 bg-background px-3 py-1.5 font-medium text-foreground hover:bg-muted transition-colors"
              >
                {selectedProducts.size === filteredProducts.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
              </button>
              <button
                onClick={importProducts}
                disabled={importing || selectedProducts.size === 0}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>جاري الاستيراد...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>استيراد ({selectedProducts.size})</span>
                  </>
                )}
              </button>
              <button
                onClick={clearData}
                className="rounded-md border border-border/70 bg-background px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>

          {/* Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product: Product) => {
                const productIndex = products.indexOf(product);
                const isSelected = selectedProducts.has(productIndex);

                return (
                  <div
                    key={productIndex}
                    onClick={() => toggleProduct(productIndex)}
                    className={`rounded-lg border p-3 cursor-pointer transition-all flex flex-col justify-between text-xs ${
                      isSelected
                        ? "border-primary/40 bg-primary/5 shadow-xs"
                        : "border-border/70 bg-card hover:border-border"
                    }`}
                  >
                    <div>
                      <div className="relative mb-2.5">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="h-32 w-full object-cover rounded-md border border-border/60"
                          />
                        ) : (
                          <div className="h-32 w-full bg-muted/30 rounded-md border border-border/60 flex items-center justify-center text-muted-foreground">
                            <ShoppingBag className="h-8 w-8" />
                          </div>
                        )}
                        <div className="absolute top-1.5 right-1.5">
                          {isSelected ? (
                            <CheckCircle2 className="h-5 w-5 text-primary fill-primary/20" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border border-border/70 bg-background/80" />
                          )}
                        </div>
                      </div>

                      <h3 className="font-semibold text-foreground line-clamp-2 mb-1.5">
                        {product.name}
                      </h3>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-border/60 font-mono tabular-nums">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-sans">السعر:</span>
                        <span className="font-bold text-foreground">{product.price} ج.م</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-sans">المخزون:</span>
                        <span className="text-foreground">{product.stock} قطعة</span>
                      </div>
                      {product.sku && (
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="font-sans">SKU:</span>
                          <span>{product.sku}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground border border-dashed border-border/70 rounded-xl">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
              <p className="text-xs">لا توجد منتجات مطابقة للبحث</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WooCommerceImport;
