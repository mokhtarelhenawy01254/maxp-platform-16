import React from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { RelationBadge } from "./RelationBadge";
import { formatPrice, type ManagedProduct } from "../../types/upsellManualTypes";

interface LinkedProductsReorderListProps {
  currentRelationProducts: ManagedProduct[];
  activeRelation: string;
  moveProduct: (productId: string, direction: "up" | "down") => void;
  removeProductFromRelation: (productId: string) => void;
}

export function LinkedProductsReorderList({
  currentRelationProducts,
  activeRelation,
  moveProduct,
  removeProductFromRelation,
}: LinkedProductsReorderListProps) {
  return (
    <div className="rounded-[24px] border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-950/30">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-lg font-black text-gray-900 dark:text-white">
            ترتيب المنتجات المرتبطة
          </h4>
          <p className="mt-1 text-sm leading-7 text-gray-600 dark:text-gray-400">
            الترتيب هنا مهم لأنه يحدد من سيظهر أولًا عند وجود أكثر من اقتراح.
          </p>
        </div>
        <RelationBadge
          label={`${currentRelationProducts.length} items`}
          tone={currentRelationProducts.length > 0 ? "green" : "neutral"}
        />
      </div>

      {currentRelationProducts.length > 0 ? (
        <div className="mt-4 space-y-3">
          {currentRelationProducts.map((product, index) => (
            <div
              key={`${activeRelation}-${product.id}-selected`}
              className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <RelationBadge label={`#${index + 1}`} tone="neutral" />
                    {product.categoryName ? (
                      <RelationBadge label={product.categoryName} tone="blue" />
                    ) : null}
                  </div>
                  <div className="mt-3 truncate font-bold text-gray-900 dark:text-white">
                    {product.name}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {product.sku ? `SKU: ${product.sku}` : `ID: ${product.id}`}
                    {` · السعر: ${formatPrice(product.price)}`}
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => moveProduct(product.id, "up")}
                    disabled={index === 0}
                    className="rounded-full border border-gray-300 p-2 text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-white"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveProduct(product.id, "down")}
                    disabled={index === currentRelationProducts.length - 1}
                    className="rounded-full border border-gray-300 p-2 text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-white"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeProductFromRelation(product.id)}
                    className="rounded-full border border-rose-200 p-2 text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-950/20"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm leading-7 text-gray-600 dark:border-gray-700 dark:text-gray-400">
          لا توجد منتجات مرتبطة في هذا التبويب بعد. أضف أول منتج من القائمة على
          اليسار.
        </div>
      )}
    </div>
  );
}
