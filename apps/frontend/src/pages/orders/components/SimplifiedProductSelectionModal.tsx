import React from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import OrderModal from "../../../components/common/OrderModal";
import {
  Product,
  ProductVariant,
  SimplifiedProductSelectionModalProps,
} from "./product-modal/productModalTypes";
import { useProductSelectionData } from "./product-modal/useProductSelectionData";
import { ProductCardItem } from "./product-modal/ProductCardItem";
import { ProductVariantSidebar } from "./product-modal/ProductVariantSidebar";

export type { Product, ProductVariant, SimplifiedProductSelectionModalProps };

const SimplifiedProductSelectionModal: React.FC<
  SimplifiedProductSelectionModalProps
> = ({ isOpen, onClose, onProductSelected }) => {
  const {
    searchQuery,
    setSearchQuery,
    products,
    loading,
    selectedProduct,
    selectedAttributes,
    setSelectedAttributes,
    hasMore,
    loadingMore,
    listContainerRef,
    loadMore,
    handleScroll,
    handleProductClick,
    handleVariantSelect,
    productAttributes,
    getAvailableValues,
    allAttributesSelected,
    matchedVariant,
  } = useProductSelectionData(isOpen, onProductSelected);

  return (
    <OrderModal
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="إضافة منتج للطلب"
      icon={PlusIcon}
      tone="primary"
      size="full"
      showCancel={false}
      flushBody
      hideClose
    >
      <div className="flex h-[min(78vh,720px)] flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* Left Side: Product List & Search */}
          <div className="flex flex-1 flex-col border-e border-border/60">
            <div className="border-b border-border/60 bg-background p-4">
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  placeholder="بحث باسم المنتج أو SKU..."
                  className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 pe-11 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <MagnifyingGlassIcon className="pointer-events-none absolute end-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            <div
              ref={listContainerRef}
              onScroll={handleScroll}
              className="custom-scrollbar flex-1 overflow-y-auto p-4"
            >
              {loading ? (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-48 animate-pulse rounded-xl border border-border bg-muted/40"
                    />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-muted-foreground">
                  <ArchiveBoxIcon className="mb-4 h-16 w-16 opacity-30" />
                  <p className="text-lg">لا توجد منتجات مطابقة</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                    {products.map((product) => (
                      <ProductCardItem
                        key={product.id}
                        product={product}
                        isSelected={selectedProduct?.id === product.id}
                        onClick={() => handleProductClick(product)}
                      />
                    ))}
                  </div>

                  {loadingMore && (
                    <div className="flex justify-center py-6">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                  {!loadingMore && hasMore && (
                    <button
                      type="button"
                      onClick={loadMore}
                      className="mt-4 w-full rounded-xl border-2 border-dashed border-border py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary active:scale-[0.99]"
                    >
                      عرض المزيد من المنتجات
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Side: Variant Selection */}
          <ProductVariantSidebar
            selectedProduct={selectedProduct}
            productAttributes={productAttributes}
            selectedAttributes={selectedAttributes}
            setSelectedAttributes={setSelectedAttributes}
            getAvailableValues={getAvailableValues}
            allAttributesSelected={allAttributesSelected}
            matchedVariant={matchedVariant}
            handleVariantSelect={handleVariantSelect}
          />
        </div>
      </div>
    </OrderModal>
  );
};

export default SimplifiedProductSelectionModal;
