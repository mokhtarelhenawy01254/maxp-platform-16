import React from "react";
import { Search, Check, Loader2, AlertTriangle } from "lucide-react";
import { WooCommerceProduct } from "./types";
import { WooCommerceProductCard } from "./WooCommerceProductCard";

interface WooCommerceProductsGridProps {
  products: WooCommerceProduct[];
  filteredProducts: WooCommerceProduct[];
  selectedProducts: Set<number>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  toggleProduct: (index: number) => void;
  toggleAll: () => void;
  importProducts: () => void;
  importing: boolean;
  clearData: () => void;
}

export const WooCommerceProductsGrid: React.FC<WooCommerceProductsGridProps> = ({
  products,
  filteredProducts,
  selectedProducts,
  searchTerm,
  setSearchTerm,
  toggleProduct,
  toggleAll,
  importProducts,
  importing,
  clearData,
}) => {
  const allFilteredSelected =
    filteredProducts.length > 0 && selectedProducts.size === filteredProducts.length;

  return (
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
            {allFilteredSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
          </button>
          <button
            onClick={importProducts}
            disabled={importing || selectedProducts.size === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50 font-mono tabular-nums"
          >
            {importing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="font-sans">جاري الاستيراد...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span className="font-sans">استيراد ({selectedProducts.size})</span>
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
          {filteredProducts.map((product) => {
            const productIndex = products.indexOf(product);
            const isSelected = selectedProducts.has(productIndex);

            return (
              <WooCommerceProductCard
                key={productIndex}
                product={product}
                index={productIndex}
                isSelected={isSelected}
                onToggle={toggleProduct}
              />
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
  );
};
