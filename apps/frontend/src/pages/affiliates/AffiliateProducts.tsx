import React, { useState, useEffect, useMemo } from "react";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import {
  Package,
  Search,
  Link as LinkIcon,
  Trash2,
  ExternalLink,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Tag,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  buildAffiliateProductUrl,
  type AffiliateStoreProfile,
} from "./affiliateStoreLinks";
import { copyAffiliateText } from "./affiliateClipboard";

interface AffiliateProduct {
  id: string;
  productId: string;
  basePrice: number;
  markup: number;
  finalPrice: number;
  isActive: boolean;
  product: {
    id: string;
    name: string;
    images?: string;
  };
}

interface ApiSuccess<T> {
  success: boolean;
  data: T;
  message?: string;
}

export default function AffiliateProducts() {
  const { formatPrice } = useCurrency();
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [affiliate, setAffiliate] = useState<AffiliateStoreProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const parseProductImages = (images?: string) => {
    if (!images) return [];
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const [productsRes, affiliateRes] = await Promise.all([
        apiClient.get<ApiSuccess<AffiliateProduct[]>>("/affiliates/products"),
        apiClient.get<ApiSuccess<AffiliateStoreProfile>>("/affiliates/me"),
      ]);
      const rawProducts = productsRes.data?.data ?? productsRes.data;
      const list = Array.isArray(rawProducts) ? rawProducts : [];
      setProducts(list);

      if (affiliateRes.data?.success) {
        setAffiliate(affiliateRes.data.data);
      }
    } catch {
      tToast.error("AffiliateProducts.error_error_ad12");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const handleUpdateMarkup = async (productId: string, markup: number) => {
    try {
      if (!Number.isFinite(markup) || markup < 0) {
        tToast.error("AffiliateProducts.msg_f09a");
        return;
      }

      const product = products.find((p) => p.productId === productId);
      if (!product) return;

      const response = await apiClient.put<ApiSuccess<unknown>, { markup: number }>(
        `/affiliates/products/${product.id}`,
        { markup }
      );
      if (response.data.success) {
        tToast.success("AffiliateProducts.success_update_c846");
        void loadProducts();
      }
    } catch {
      tToast.error("AffiliateProducts.error_error_59e1");
    }
  };

  const handleRemoveProduct = async (affiliateProductId: string) => {
    if (!confirm("هل أنت متأكد من إزالة هذا المنتج من كتالوجك؟")) return;
    try {
      const response = await apiClient.delete<ApiSuccess<unknown>>(
        `/affiliates/products/${affiliateProductId}`
      );
      if (response.data.success) {
        tToast.success("AffiliateProducts.msg_46fb");
        void loadProducts();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء إزالة المنتج");
    }
  };

  const safeProducts = useMemo(() => (Array.isArray(products) ? products : []), [products]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return safeProducts;
    const q = search.toLowerCase();
    return safeProducts.filter((p) => p.product?.name?.toLowerCase().includes(q));
  }, [safeProducts, search]);

  const avgMarkup = useMemo(() => {
    if (safeProducts.length === 0) return 0;
    const sum = safeProducts.reduce((acc, p) => acc + (Number(p.markup) || 0), 0);
    return Math.round(sum / safeProducts.length);
  }, [safeProducts]);

  const avgFinalPrice = useMemo(() => {
    if (safeProducts.length === 0) return 0;
    const sum = safeProducts.reduce((acc, p) => acc + (Number(p.finalPrice) || 0), 0);
    return Math.round(sum / safeProducts.length);
  }, [safeProducts]);

  if (loading && safeProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-2.5 text-muted-foreground">
        <RefreshCw className="size-5 animate-spin text-primary" />
        <span className="text-xs font-mono">جاري تحميل كتالوج منتجات المسوق...</span>
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
              <Package className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              كتالوج منتجات المسوق
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              {safeProducts.length} منتج مسوق
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            إدارة منتجاتك المختارة وتحديد هوامش الربح ونسخ روابط البيع بالعمولة
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadProducts()}
            className="h-8 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98]"
          >
            <RefreshCw className="size-3.5" />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono">
        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">المنتجات المختارة</p>
            <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">
              {safeProducts.length}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">في كتالوجك الخاص</p>
          </div>
          <div className="size-7 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
            <Package className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-500">متوسط هامش الربح</p>
            <p className="text-xl font-bold tracking-tight text-emerald-500 font-mono tabular-nums mt-0.5">
              +{avgMarkup.toLocaleString("en-US")} ج.م
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">ربح القطعة الواحدة</p>
          </div>
          <div className="size-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
            <TrendingUp className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-500">متوسط سعر البيع</p>
            <p className="text-lg font-bold tracking-tight text-purple-500 font-mono tabular-nums mt-0.5">
              {avgFinalPrice.toLocaleString("en-US")} ج.م
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">السعر المعروض للعميل</p>
          </div>
          <div className="size-7 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
            <DollarSign className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-amber-500">حالة التتبع</p>
            <p className="text-sm font-bold tracking-tight text-emerald-500 mt-0.5 font-mono inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              روابط نشطة
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">ربط فوري للعمولات</p>
          </div>
          <div className="size-7 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
            <Tag className="size-3.5" />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-2.5 sm:p-3 rounded-lg border border-border/70 bg-card shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            className="h-8 pr-8 text-xs font-mono bg-background border-border/70"
            placeholder="بحث في كتالوج المنتجات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          {filteredProducts.length} منتج
        </span>
      </div>

      {/* Product Cards Grid */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center rounded-lg border border-border/70 bg-card space-y-2 shadow-xs">
          <Package className="size-8 mx-auto text-muted-foreground/40" />
          <h3 className="text-xs font-semibold text-foreground font-mono">كتالوج منتجاتك فارغ</h3>
          <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
            قم بتصفح المنتجات المتاحة في المتجر وإضافتها لكتالوجك لتحديد أرباحك ومشاركتها
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProducts.map((p) => {
            const images = parseProductImages(p.product?.images);
            const mainImage = images[0] || "/placeholder-product.png";
            const storefrontUrl = buildAffiliateProductUrl(affiliate, p.productId);

            return (
              <div
                key={p.id}
                className="bg-card border border-border/70 rounded-lg overflow-hidden shadow-xs hover:border-border/90 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-40 bg-muted/30 overflow-hidden border-b border-border/60">
                    <img
                      src={mainImage}
                      alt={p.product?.name || "منتج"}
                      className="w-full h-full object-cover"
                    />
                    <Badge className="absolute top-2 left-2 text-[10px] font-mono bg-primary/90 text-primary-foreground">
                      كتالوجي
                    </Badge>
                  </div>

                  <div className="p-3.5 space-y-3">
                    <h3 className="text-xs font-semibold text-foreground truncate">
                      {p.product?.name || "منتج أفليت"}
                    </h3>

                    <div className="grid grid-cols-3 gap-1.5 p-2 bg-muted/20 border border-border/50 rounded-md font-mono text-center">
                      <div>
                        <span className="text-[9px] text-muted-foreground block">سعر التكلفة</span>
                        <span className="text-[11px] font-semibold text-foreground tabular-nums block mt-0.5">
                          {formatPrice(p.basePrice)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-emerald-500 block">هامش ربحك</span>
                        <span className="text-[11px] font-bold text-emerald-500 tabular-nums block mt-0.5">
                          +{formatPrice(p.markup)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-primary block">سعر البيع</span>
                        <span className="text-[11px] font-bold text-primary tabular-nums block mt-0.5">
                          {formatPrice(p.finalPrice)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                        تعديل الربح:
                      </span>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        defaultValue={p.markup}
                        onBlur={(e) => {
                          const newMarkup = parseFloat(e.target.value);
                          if (newMarkup !== p.markup) {
                            void handleUpdateMarkup(p.productId, newMarkup);
                          }
                        }}
                        className="h-7 text-xs font-mono tabular-nums bg-background border-border/70"
                        placeholder="هامش الربح"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 pt-0 border-t border-border/50 mt-2 flex items-center gap-1.5 pt-2.5">
                  <Button
                    size="sm"
                    onClick={async () => {
                      const link = buildAffiliateProductUrl(affiliate, p.productId);
                      const copied = await copyAffiliateText(link);
                      if (copied) {
                        tToast.success("AffiliateProducts.msg_0153");
                      } else {
                        tToast.error("AffiliateProducts.msg_ccdb");
                      }
                    }}
                    className="flex-1 h-7 text-xs font-mono gap-1 active:scale-[0.98]"
                  >
                    <LinkIcon className="size-3" />
                    <span>نسخ الرابط</span>
                  </Button>

                  <a
                    href={storefrontUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex size-7 items-center justify-center rounded-md border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="عرض في المتجر"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => void handleRemoveProduct(p.id)}
                    className="inline-flex size-7 items-center justify-center rounded-md border border-border/70 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="إزالة المنتج"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
