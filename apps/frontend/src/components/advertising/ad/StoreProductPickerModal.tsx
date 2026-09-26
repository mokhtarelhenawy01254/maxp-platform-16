import React, { useState, useEffect, useCallback } from "react";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <ShoppingBagIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                {isEn ? "Select Store Product for Ad" : "اختيار منتج من المتجر للإعلان"}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {isEn
                  ? "Auto-populates image, landing page link, title, and price"
                  : "يملأ الصورة، رابط صفحة الشراء، العنوان الترويجي والسعر تلقائياً بنقرة واحدة"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <form onSubmit={handleSearchSubmit} className="relative">
            <MagnifyingGlassIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? "Search by product name..." : "ابحث باسم المنتج..."}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pr-10 pl-4 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </form>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <ArrowPathIcon className="h-6 w-6 animate-spin mb-2 text-indigo-600" />
              <p className="text-xs font-bold">{isEn ? "Loading products..." : "جاري جلب المنتجات..."}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBagIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">
                {isEn ? "No products found" : "لم يتم العثور على منتجات"}
              </p>
            </div>
          ) : (
            products.map((product) => {
              const imgUrl = getProductImageUrl(product);
              return (
                <div
                  key={product.id}
                  className="flex items-center justify-between py-3 px-2 hover:bg-slate-50 rounded-xl transition group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ShoppingBagIcon className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-black text-emerald-600 font-mono">
                          {Number(product.price || 0).toLocaleString()} {isEn ? "EGP" : "ج.م"}
                        </span>
                        {product.category && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {product.category.name || product.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectProduct(product)}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition shrink-0"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
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
