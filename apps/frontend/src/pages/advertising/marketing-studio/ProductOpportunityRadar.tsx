import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Package,
  Search,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  X,
} from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import type { MarketingProduct } from "./types";

interface ProductOpportunityRadarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProduct: MarketingProduct | null;
  onSelectProduct: (product: MarketingProduct) => void;
}

export const ProductOpportunityRadar: React.FC<ProductOpportunityRadarProps> = ({
  isOpen,
  onClose,
  selectedProduct,
  onSelectProduct,
}) => {
  const [products, setProducts] = useState<MarketingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "TOP_MARGIN" | "READY" | "ALERT">("ALL");

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<{ success?: boolean; data?: any[] }>("/products", {
        params: { limit: 50 },
      });
      const rawData = res.data?.data;
      if (Array.isArray(rawData)) {
        const mapped: MarketingProduct[] = rawData.map((p) => {
          const price = Number(p.price) || 0;
          const cost = Number(p.cost || p.costPrice || 0);
          const stock = typeof p.inventory === "number" ? p.inventory : (Number(p.stock) || 25);
          return {
            id: String(p.id),
            name: String(p.name || "منتج بدون اسم"),
            slug: typeof p.slug === "string" ? p.slug : undefined,
            price,
            cost,
            stock,
            mainImage: typeof p.mainImage === "string" ? p.mainImage : null,
            category: typeof p.category?.name === "string" ? p.category.name : undefined,
          };
        });
        setProducts(mapped);
        if (mapped.length > 0 && !selectedProduct) {
          onSelectProduct(mapped[0]);
        }
      }
    } catch (err) {
      console.warn("[ProductOpportunityRadar] Failed to load store products:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedProduct, onSelectProduct]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      const matchQuery = search.trim() === "" || p.name.toLowerCase().includes(search.toLowerCase());
      if (!matchQuery) return false;
      if (filterType === "READY") return (p.stock || 0) >= 10;
      if (filterType === "ALERT") return (p.stock || 0) < 10;
      return true;
    });

    if (filterType === "TOP_MARGIN") {
      result = [...result].sort((a, b) => {
        const marginA = a.cost && a.cost > 0 ? (a.price - a.cost) / a.price : 0;
        const marginB = b.cost && b.cost > 0 ? (b.price - b.cost) / b.price : 0;
        return marginB - marginA;
      });
    }

    return result;
  }, [products, search, filterType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="flex-1 cursor-pointer" onClick={onClose} aria-hidden="true" />

      {/* Slide-over Drawer */}
      <aside
        aria-label="كتالوج رادار منتجات المتجر"
        className="w-full sm:w-[420px] max-w-full h-full bg-white dark:bg-slate-900 border-r sm:border-r-0 sm:border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                اختر منتج الحملة
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {products.length} منتج
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={loadProducts}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Smart Marketing Filters */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو التصنيف..."
              className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setFilterType("ALL")}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition ${
                filterType === "ALL"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              الكل
            </button>

            <button
              type="button"
              onClick={() => setFilterType("TOP_MARGIN")}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition ${
                filterType === "TOP_MARGIN"
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
              }`}
            >
              <TrendingUp className="w-3 h-3" /> الأعلى هامش ربح
            </button>

            <button
              type="button"
              onClick={() => setFilterType("READY")}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition ${
                filterType === "READY"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" /> جاهز للحملة
            </button>

            <button
              type="button"
              onClick={() => setFilterType("ALERT")}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition ${
                filterType === "ALERT"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              }`}
            >
              <AlertTriangle className="w-3 h-3" /> تنبيه مخزون
            </button>
          </div>
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-blue-600" />
              جاري فحص المنتجات ومعدلات الأرباح...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              لم يتم العثور على منتجات مطابقة للبحث.
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isSelected = selectedProduct?.id === product.id;
              const hasStock = (product.stock || 0) > 10;
              const margin =
                product.cost && product.cost > 0
                  ? Math.round(((product.price - product.cost) / product.price) * 100)
                  : null;
              const breakEvenRoas =
                product.cost && product.cost > 0 && product.price > product.cost
                  ? (product.price / (product.price - product.cost)).toFixed(1)
                  : null;

              return (
                <div
                  key={product.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onSelectProduct(product);
                    onClose();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectProduct(product);
                      onClose();
                    }
                  }}
                  className={`w-full text-right p-3 rounded-xl transition-all border flex items-center gap-3 cursor-pointer group ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 shadow-sm ring-1 ring-blue-400"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    {product.mainImage ? (
                      <img
                        src={product.mainImage}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {product.name}
                      </h3>
                      {isSelected && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold flex-shrink-0">
                          المحدد
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {product.price} ج.م
                      </span>
                      {margin !== null && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                          ربح {margin}%
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            hasStock ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                        المخزون: {product.stock}
                      </span>
                      {breakEvenRoas && (
                        <span className="text-slate-400 font-mono">
                          B.E ROAS: {breakEvenRoas}x
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
};
