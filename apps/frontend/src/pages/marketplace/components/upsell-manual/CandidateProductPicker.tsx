import React from "react";
import { Search } from "lucide-react";
import { RelationBadge } from "./RelationBadge";
import type { ManagedProduct, RelationConfigItem } from "../../types/upsellManualTypes";

interface CandidateProductPickerProps {
  selectedProduct: ManagedProduct | null;
  candidateQuery: string;
  setCandidateQuery: (query: string) => void;
  candidateProducts: ManagedProduct[];
  activeRelation: string;
  currentRelationConfig: RelationConfigItem;
  addProductToRelation: (productId: string) => void;
}

export function CandidateProductPicker({
  selectedProduct,
  candidateQuery,
  setCandidateQuery,
  candidateProducts,
  activeRelation,
  currentRelationConfig,
  addProductToRelation,
}: CandidateProductPickerProps) {
  return (
    <div className="rounded-[24px] border border-gray-200 bg-gray-50/80 p-5 dark:border-gray-700 dark:bg-gray-900/60">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-lg font-black text-gray-900 dark:text-white">
            إضافة منتجات إلى {currentRelationConfig.title}
          </h4>
          <p className="mt-1 text-sm leading-7 text-gray-600 dark:text-gray-400">
            {currentRelationConfig.help}
          </p>
        </div>
        <RelationBadge label={currentRelationConfig.placementLabel} tone="blue" />
      </div>

      {!selectedProduct ? (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm leading-7 text-gray-600 dark:border-gray-700 dark:text-gray-400">
          اختر المنتج الأساسي أولًا من الجزء العلوي، ثم ابدأ في ربط المنتجات له.
        </div>
      ) : (
        <>
          <label className="mt-5 block space-y-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              ابحث عن منتج لإضافته
            </span>
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={candidateQuery}
                onChange={(event) => setCandidateQuery(event.target.value)}
                placeholder="ابحث بالاسم أو SKU أو الفئة"
                autoComplete="off"
                className="w-full rounded-2xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus-visible:ring-blue-900/40"
              />
            </div>
          </label>

          <div className="mt-4 grid gap-3">
            {candidateProducts.length > 0 ? (
              candidateProducts.map((product) => (
                <div
                  key={`${activeRelation}-${product.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950/50"
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
                  <button
                    type="button"
                    onClick={() => addProductToRelation(product.id)}
                    className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
                  >
                    إضافة
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm leading-7 text-gray-600 dark:border-gray-700 dark:text-gray-400">
                لا توجد منتجات مناسبة للبحث الحالي. جرّب كلمة أخرى أو ابدأ بدون بحث.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
