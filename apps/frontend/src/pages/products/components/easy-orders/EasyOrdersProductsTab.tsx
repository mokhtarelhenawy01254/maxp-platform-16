import React from "react";
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { EasyOrdersProduct } from "./types";

interface EasyOrdersProductsTabProps {
  products: EasyOrdersProduct[];
  filteredProducts: EasyOrdersProduct[];
  selectedProducts: Set<number>;
  apiKey: string;
  setApiKey: (key: string) => void;
  loading: boolean;
  importing: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  fetchProducts: () => void;
  importProducts: () => void;
  toggleProduct: (index: number) => void;
  toggleAll: () => void;
}

export const EasyOrdersProductsTab: React.FC<EasyOrdersProductsTabProps> = ({
  products,
  filteredProducts,
  selectedProducts,
  apiKey,
  setApiKey,
  loading,
  importing,
  searchTerm,
  setSearchTerm,
  fetchProducts,
  importProducts,
  toggleProduct,
  toggleAll,
}) => {
  if (products.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border/70 shadow-xs p-6 mb-6 max-w-2xl mx-auto">
        <h2 className="text-base font-semibold text-foreground mb-4">
          استيراد المنتجات من Easy Orders
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              مفتاح الـ API الخاص بـ Easy Orders <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="أدخل مفتاح الـ API هنا..."
              className="w-full px-3.5 py-2.5 border border-border/70 rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none font-mono"
            />
          </div>

          <button
            onClick={fetchProducts}
            disabled={loading || !apiKey.trim()}
            className="w-full px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <MagnifyingGlassIcon className="h-4 w-4" />
            )}
            <span>جلب المنتجات</span>
          </button>
        </div>
      </div>
    );
  }

  const allFilteredSelected =
    filteredProducts.length > 0 && selectedProducts.size === filteredProducts.length;

  return (
    <div className="bg-card rounded-xl border border-border/70 shadow-xs p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-4 border-b border-border/60">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            المنتجات المتاحة <span className="font-mono tabular-nums">({filteredProducts.length})</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono tabular-nums">
            تم تحديد <span className="font-bold text-foreground">{selectedProducts.size}</span> منتج
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleAll}
            className="px-3.5 py-1.5 text-xs border border-border/70 rounded-lg hover:bg-muted transition-colors font-medium text-foreground"
          >
            {allFilteredSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
          </button>
          <button
            onClick={importProducts}
            className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 font-mono tabular-nums"
            disabled={importing || selectedProducts.size === 0}
          >
            {importing && (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
            )}
            <ArrowDownTrayIcon className="h-3.5 w-3.5" />
            <span className="font-sans">استيراد المحدد ({selectedProducts.size})</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducts.map((product) => {
          const originalIndex = products.indexOf(product);
          const isSelected = selectedProducts.has(originalIndex);

          return (
            <div
              key={originalIndex}
              onClick={() => toggleProduct(originalIndex)}
              className={`border rounded-xl p-3.5 cursor-pointer transition-all flex flex-col justify-between text-xs ${
                isSelected
                  ? "border-primary/50 bg-primary/5 shadow-xs"
                  : "border-border/70 bg-card hover:border-border"
              }`}
            >
              <div>
                {product.images?.[0] ? (
                  <img
                    src={`/api/proxy-image?url=${encodeURIComponent(product.images[0])}`}
                    className="w-full h-36 object-cover rounded-lg mb-2.5 border border-border/60"
                    alt={product.name}
                  />
                ) : (
                  <div className="w-full h-36 bg-muted/40 rounded-lg mb-2.5 border border-border/60 flex items-center justify-center text-muted-foreground text-xs">
                    لا توجد صورة
                  </div>
                )}
                <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
                  {product.name}
                </h3>
              </div>

              <div className="pt-2 border-t border-border/60 space-y-1 font-mono tabular-nums">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-sans">السعر:</span>
                  <span className="text-primary font-bold">{product.price} ج.م</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                  <span className="font-sans">الكمية:</span>
                  <span>{product.stock} قطعة</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
