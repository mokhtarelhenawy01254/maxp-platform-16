import React from "react";
import { useNavigate } from "react-router-dom";
import { Link2, Loader2, Sparkles } from "lucide-react";
import { RelationBadge } from "./components/upsell-manual/RelationBadge";
import { BaseProductSelector } from "./components/upsell-manual/BaseProductSelector";
import { RelationImpactMap } from "./components/upsell-manual/RelationImpactMap";
import { RelationTabSelector } from "./components/upsell-manual/RelationTabSelector";
import { CandidateProductPicker } from "./components/upsell-manual/CandidateProductPicker";
import { LinkedProductsReorderList } from "./components/upsell-manual/LinkedProductsReorderList";
import { useUpsellManualManagerData } from "./hooks/useUpsellManualManagerData";
import type { UpsellManualManagerProps } from "./types/upsellManualTypes";

export default function UpsellManualManager({ active }: UpsellManualManagerProps) {
  const navigate = useNavigate();
  const {
    catalogLoading,
    catalogError,
    productQuery,
    setProductQuery,
    candidateQuery,
    setCandidateQuery,
    selectedProduct,
    relationBuckets,
    activeRelation,
    setActiveRelation,
    productLoading,
    saving,
    isDirty,
    filteredProducts,
    candidateProducts,
    currentRelationProducts,
    currentRelationConfig,
    loadProductRelations,
    resetSelectedProduct,
    addProductToRelation,
    removeProductFromRelation,
    moveProduct,
    saveRelations,
  } = useUpsellManualManagerData(active);

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
              <Link2 size={14} />
              Manual Links
            </div>
            <h2 className="mt-3 text-2xl font-black text-gray-900 dark:text-white">
              مدير ربط المنتجات
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-400">
              اختر المنتج الأساسي، ثم اربط له المنتجات المشابهة أو المكملة أو الأعلى قيمة
              من نفس الشاشة بدل الدخول لكل منتج يدويًا.
            </p>
          </div>

          <RelationBadge
            label={isDirty ? "Unsaved changes" : "Saved"}
            tone={isDirty ? "amber" : "green"}
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <BaseProductSelector
            productQuery={productQuery}
            setProductQuery={setProductQuery}
            catalogLoading={catalogLoading}
            catalogError={catalogError}
            selectedProduct={selectedProduct}
            filteredProducts={filteredProducts}
            relationBuckets={relationBuckets}
            loadProductRelations={loadProductRelations}
            resetSelectedProduct={resetSelectedProduct}
            onNavigateToProductEdit={(productId) => navigate(`/products/${productId}/edit`)}
          />

          <RelationImpactMap />
        </div>
      </div>

      <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">
              Link Builder
            </div>
            <h3 className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
              اختر نوع الربط الذي تريد إدارته
            </h3>
            <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-400">
              كل تبويب هنا يغيّر مجموعة مختلفة من العلاقات للمنتج المحدد.
            </p>
          </div>

          {productLoading ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 dark:bg-gray-900 dark:text-gray-300">
              <Loader2 size={16} className="animate-spin" />
              جارٍ تحميل المنتج...
            </div>
          ) : null}
        </div>

        <RelationTabSelector
          activeRelation={activeRelation}
          setActiveRelation={setActiveRelation}
          relationBuckets={relationBuckets}
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
          <CandidateProductPicker
            selectedProduct={selectedProduct}
            candidateQuery={candidateQuery}
            setCandidateQuery={setCandidateQuery}
            candidateProducts={candidateProducts}
            activeRelation={activeRelation}
            currentRelationConfig={currentRelationConfig}
            addProductToRelation={addProductToRelation}
          />

          <LinkedProductsReorderList
            currentRelationProducts={currentRelationProducts}
            activeRelation={activeRelation}
            moveProduct={moveProduct}
            removeProductFromRelation={removeProductFromRelation}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-blue-200 bg-blue-50/80 px-5 py-4 dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="text-sm leading-7 text-blue-900 dark:text-blue-100">
            <span className="font-bold">مهم:</span> الحفظ هنا يحدّث
            {" `relatedProducts` و`crossSellProducts` و`upsellProducts` "}
            داخل Metadata المنتج المحدد فقط.
          </div>

          <button
            type="button"
            onClick={saveRelations}
            disabled={!selectedProduct || saving || productLoading}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {saving ? "جارٍ الحفظ..." : "حفظ روابط المنتج"}
          </button>
        </div>
      </div>
    </section>
  );
}
