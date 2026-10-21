import React from "react";
import { RotateCcw } from "lucide-react";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { TrashProductCard } from "./TrashProductCard";
import { useProductsTrashController } from "./hooks/useProductsTrashController";
import { ProductsTrashHeader } from "./components/trash/ProductsTrashHeader";
import { ProductsTrashEmptyState } from "./components/trash/ProductsTrashEmptyState";

export const ProductsTrash: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  const {
    products,
    loading,
    selectedProducts,
    restoring,
    deleting,
    fetchDeletedProducts,
    handleRestore,
    handlePermanentDelete,
    handleRestoreAll,
    handlePermanentDeleteAll,
    toggleSelect,
    toggleSelectAll,
  } = useProductsTrashController();

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12" dir="rtl">
      {/* Header */}
      <ProductsTrashHeader
        productsCount={products.length}
        selectedCount={selectedProducts.size}
        loading={loading}
        onRestoreAll={handleRestoreAll}
        onPermanentDeleteAll={handlePermanentDeleteAll}
        onRefresh={fetchDeletedProducts}
      />

      {/* Content */}
      <div>
        {loading && products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <RotateCcw className="h-6 w-6 text-muted-foreground animate-spin mb-2" />
            <p className="text-xs font-medium">جاري جلب سلة المحذوفات...</p>
          </div>
        ) : products.length === 0 ? (
          <ProductsTrashEmptyState />
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
              {products.map((product) => (
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
