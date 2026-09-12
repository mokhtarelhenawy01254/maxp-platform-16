import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Package,
  Search,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import type { MarketingProduct } from "./types";

interface ProductOpportunityRadarProps {
  selectedProduct: MarketingProduct | null;
  onSelectProduct: (product: MarketingProduct) => void;
}

export const ProductOpportunityRadar: React.FC<ProductOpportunityRadarProps> = ({
  selectedProduct,
  onSelectProduct,
}) => {
  const [products, setProducts] = useState<MarketingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "READY" | "ALERT">("ALL");

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
    return products.filter((p) => {
      const matchQuery = search.trim() === "" || p.name.toLowerCase().includes(search.toLowerCase());
      if (!matchQuery) return false;
      if (filterType === "READY") return (p.stock || 0) >= 10;
      if (filterType === "ALERT") return (p.stock || 0) < 10;
      return true;
    });
  }, [products, search, filterType]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                رادار منتجات المتجر
              </h2>
              <p className="text-xs text-slate-500">
                {products.length} صنف متاح في الكتالوج
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadProducts}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="تحديث المنتجات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم..."
            className="w-full pl-3 pr-9 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setFilterType("ALL")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              filterType === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            الكل ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("READY")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium flex items-center gap-1 transition ${
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
            className={`px-2.5 py-1 text-xs rounded-lg font-medium flex items-center gap-1 transition ${
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
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 space-y-1.5">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            جاري فحص كتالوج المتجر والمخزون...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            لم يتم العثور على منتجات مطابقة.
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
                onClick={() => onSelectProduct(product)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectProduct(product);
                  }
                }}
                className={`w-full text-right p-2.5 rounded-xl transition-all border flex items-center gap-3 cursor-pointer ${
                  isSelected
                    ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-sm"
                    : "bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-200"
                }`}
              >
                {/* Thumb */}
                <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  {product.mainImage ? (
                    <img
                      src={product.mainImage}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Package className="w-5 h-5 text-slate-400" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {product.name}
                    </h3>
                    {isSelected && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white font-semibold">
                        نشط
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {product.price} ج.م
                    </span>
                    {margin !== null && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium">
                        هامش {margin}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      {hasStock ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      )}
                      مخزون: {product.stock} قطعة
                    </span>
                    {breakEvenRoas && (
                      <span className="text-slate-400">
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

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> يوصى بالمنتجات ذات الهامش {">"} 40%
        </span>
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
      </div>
    </div>
  );
};
