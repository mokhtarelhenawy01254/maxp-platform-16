import React from "react";
import { ExternalLink, Loader2, Package, Search, ShoppingCart, Mail, X } from "lucide-react";
import { RelationBadge } from "./RelationBadge";
import {
  formatPrice,
  RELATION_ORDER,
  RELATION_CONFIG_DATA,
  type ManagedProduct,
  type ManagedRelationType,
  type RelationBuckets,
} from "../../types/upsellManualTypes";

interface BaseProductSelectorProps {
  productQuery: string;
  setProductQuery: (query: string) => void;
  catalogLoading: boolean;
  catalogError: string;
  selectedProduct: ManagedProduct | null;
  filteredProducts: ManagedProduct[];
  relationBuckets: RelationBuckets;
  loadProductRelations: (productId: string) => Promise<void>;
  resetSelectedProduct: () => void;
  onNavigateToProductEdit: (productId: string) => void;
}

const getRelationIcon = (type: ManagedRelationType) => {
  switch (type) {
    case "related":
      return <Package size={16} />;
    case "crossSell":
      return <ShoppingCart size={16} />;
    case "upsell":
      return <Mail size={16} />;
  }
};

export function BaseProductSelector({
  productQuery,
  setProductQuery,
  catalogLoading,
  catalogError,
  selectedProduct,
  filteredProducts,
  relationBuckets,
  loadProductRelations,
  resetSelectedProduct,
  onNavigateToProductEdit,
}: BaseProductSelectorProps) {
  return (
    <div className="rounded-[24px] border border-gray-200 bg-gray-50/80 p-5 dark:border-gray-700 dark:bg-gray-900/60">
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          ابحث عن المنتج الأساسي
        </span>
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={productQuery}
            onChange={(event) => setProductQuery(event.target.value)}
            placeholder="ابحث بالاسم أو SKU أو الفئة"
            autoComplete="off"
            className="w-full rounded-2xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus-visible:ring-blue-900/40"
          />
        </div>
      </label>

      {catalogError ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-200">
          {catalogError}
        </div>
      ) : null}

      {catalogLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          جارٍ تحميل المنتجات...
        </div>
      ) : null}

      {!selectedProduct ? (
        <div className="mt-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
            منتجات جاهزة للاختيار
          </div>
          <div className="grid gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => void loadProductRelations(product.id)}
                className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50 dark:border-gray-700 dark:bg-gray-950/40 dark:hover:border-blue-900/50 dark:hover:bg-blue-950/20"
              >
                <div className="min-w-0">
                  <div className="truncate font-bold text-gray-900 dark:text-white">
                    {product.name}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {product.sku ? `SKU: ${product.sku}` : `ID: ${product.id}`}
                    {product.categoryName ? ` · ${product.categoryName}` : ""}
                  </div>
                </div>
                <RelationBadge
                  label={product.isActive ? "Active" : "Hidden"}
                  tone={product.isActive ? "green" : "neutral"}
                />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-[24px] border border-blue-200 bg-blue-50/80 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <RelationBadge label="Base product" />
                <RelationBadge
                  label={selectedProduct.isActive ? "Published" : "Hidden"}
                  tone={selectedProduct.isActive ? "green" : "neutral"}
                />
              </div>
              <h3 className="mt-3 text-xl font-black text-gray-900 dark:text-white">
                {selectedProduct.name}
              </h3>
              <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-400">
                {selectedProduct.sku
                  ? `SKU: ${selectedProduct.sku}`
                  : `ID: ${selectedProduct.id}`}
                {selectedProduct.categoryName
                  ? ` · الفئة: ${selectedProduct.categoryName}`
                  : ""}
                {` · السعر: ${formatPrice(selectedProduct.price)}`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigateToProductEdit(selectedProduct.id)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:text-white"
              >
                <ExternalLink size={16} />
                فتح صفحة المنتج
              </button>
              <button
                type="button"
                onClick={resetSelectedProduct}
                className="inline-flex items-center gap-2 rounded-full border border-transparent bg-white/70 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-white dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950/60"
              >
                <X size={16} />
                تغيير المنتج
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {RELATION_ORDER.map((relationType) => (
              <div
                key={relationType}
                className="rounded-2xl border border-white/70 bg-white/80 p-4 dark:border-gray-800 dark:bg-gray-950/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                    {getRelationIcon(relationType)}
                    {RELATION_CONFIG_DATA[relationType].title}
                  </div>
                  <RelationBadge
                    label={`${relationBuckets[relationType].length}`}
                    tone={relationType === "upsell" ? "amber" : "blue"}
                  />
                </div>
                <p className="mt-2 text-xs leading-6 text-gray-600 dark:text-gray-400">
                  {RELATION_CONFIG_DATA[relationType].placementNote}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
