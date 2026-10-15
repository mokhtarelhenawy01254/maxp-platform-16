import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Search,
  ShoppingBag,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { useAuth } from "../../../hooks/useAuthSimple";

export interface SelectedStoreProduct {
  id: string;
  name: string;
  price: number;
  slug?: string;
  imageUrl?: string;
  description?: string;
  landingUrl?: string;
}

interface StoreProductPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: SelectedStoreProduct) => void;
  isEn?: boolean;
}

export const StoreProductPickerModal: React.FC<StoreProductPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  isEn = false,
}) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async (query: string = "") => {
    try {
      setLoading(true);
      const res = await apiClient.get("/products", {
        params: { limit: 30, search: query.trim() || undefined },
      });
      const payload = res.data?.data ?? res.data;
      const list = Array.isArray(payload) ? payload : (payload?.items || payload?.products || payload?.data || []);
      setProducts(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to fetch store products for ad:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      fetchProducts("");
    }
  }, [isOpen, fetchProducts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(searchQuery);
  };

  const getProductImageUrl = (p: any): string | undefined => {
    if (p.imageUrl) return p.imageUrl;
    if (Array.isArray(p.images) && p.images.length > 0) {
      const img = p.images[0];
      return typeof img === "string" ? img : img.url || img.imageUrl;
    }
    return undefined;
  };

  const handleSelectProduct = (p: any) => {
    const rawImg = getProductImageUrl(p);
    let fullImg = rawImg;
    if (fullImg && fullImg.startsWith("/")) {
      fullImg = `https://${window.location.hostname}${fullImg}`;
    }

    const companySlug = user?.company?.slug || "swan";
    const productSlug = p.slug || p.id;
    const landingUrl = `https://${companySlug}.maxp.online/product/${productSlug}`;

    const rawDesc = p.description || p.shortDescription || "";
    const cleanDesc = rawDesc
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    onSelect({
      id: p.id,
      name: p.name,
      price: Number(p.price || 0),
      slug: productSlug,
      imageUrl: fullImg,
      description: cleanDesc,
      landingUrl,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl bg-card shadow-2xl border border-border/70 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {isEn ? "Select Store Product for Ad" : "اختيار منتج من المتجر للإعلان"}
              </h3>
              <p className="text-[11px] text-muted-foreground font-normal">
                {isEn
                  ? "Auto-populates image, landing page link, title, and price"
                  : "تعبئة الصورة، ورابط صفحة الشراء، والعنوان الترويجي والسعر تلقائياً"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-border/60 bg-card">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? "Search by product name..." : "ابحث باسم المنتج..."}
              className="w-full rounded-lg border border-border/70 bg-muted/20 pr-10 pl-4 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:bg-card focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </form>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-border/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mb-2 text-primary" />
              <p className="text-xs font-semibold">{isEn ? "Loading products..." : "جاري جلب المنتجات..."}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-xs font-semibold text-muted-foreground">
                {isEn ? "No products found" : "لم يتم العثور على منتجات"}
              </p>
            </div>
          ) : (
            products.map((product) => {
              const imgUrl = getProductImageUrl(product);
              return (
                <div
                  key={product.id}
                  className="flex items-center justify-between py-3 px-2 hover:bg-muted/30 rounded-lg transition group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="h-12 w-12 rounded-lg border border-border/60 bg-muted/30 overflow-hidden shrink-0 flex items-center justify-center">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                          {Number(product.price || 0).toLocaleString()} {isEn ? "EGP" : "ج.م"}
                        </span>
                        {product.category && (
                          <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/40">
                            {product.category.name || product.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectProduct(product)}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition shrink-0"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{isEn ? "Select" : "اختيار للإعلان"}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
