import React from "react";
import { useProductConsolidatorController } from "./components/consolidator/useProductConsolidatorController";
import { ConsolidatorGroupStep } from "./components/consolidator/ConsolidatorGroupStep";
import { ConsolidatorItemsSelectStep } from "./components/consolidator/ConsolidatorItemsSelectStep";
import { ConsolidatorNewProductStep } from "./components/consolidator/ConsolidatorNewProductStep";
import { ConsolidatorVariantsStep } from "./components/consolidator/ConsolidatorVariantsStep";
import { ConsolidatorOriginalsActionStep } from "./components/consolidator/ConsolidatorOriginalsActionStep";

export const ProductConsolidatorPage: React.FC = () => {
  const {
    groups,
    loading,
    error,
    selectedGroup,
    setSelectedGroup,
    selectedItems,
    setSelectedItems,
    newName,
    setNewName,
    newDescription,
    setNewDescription,
    newSlug,
    setNewSlug,
    originalsAction,
    setOriginalsAction,
    variantEdits,
    setVariantEdits,
    executing,
    result,
    activeGroup,
    selectedItemsList,
    canExecute,
    loadGroups,
    selectAllInGroup,
    toggleItem,
    setVariantEdit,
    handleExecute,
  } = useProductConsolidatorController();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium px-3 py-1 rounded-full">
                  أداة دمج المنتجات
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                دمج المنتجات المكررة
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                ادمج منتجات متعددة في منتج واحد جديد مع الاحتفاظ بـ SKU لكل منتج كمتغير مستقل
              </p>
            </div>
            <button
              type="button"
              onClick={loadGroups}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              disabled={loading}
            >
              تحديث القائمة
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border-r-4 border-red-500 p-3 rounded-l-md text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {result && (
            <div className="mb-4 bg-emerald-50 dark:bg-emerald-900/20 border-r-4 border-emerald-500 p-3 rounded-l-md text-sm text-emerald-700 dark:text-emerald-300">
              {result.message}
              {result.productId && (
                <a href={`/products/${result.productId}/edit`} className="underline ml-2">
                  عرض المنتج الجديد
                </a>
              )}
            </div>
          )}

          {/* Step 1: Group selection */}
          <ConsolidatorGroupStep
            groups={groups}
            selectedGroup={selectedGroup}
            onSelectGroup={(groupName) => {
              setSelectedGroup(groupName);
              setSelectedItems({});
              setVariantEdits({});
            }}
          />

          {/* Step 2: Select products */}
          {activeGroup && (
            <ConsolidatorItemsSelectStep
              activeGroup={activeGroup}
              selectedCount={selectedItemsList.length}
              selectedItems={selectedItems}
              onSelectAll={selectAllInGroup}
              onToggleItem={toggleItem}
            />
          )}

          {/* Step 3: New product details */}
          {activeGroup && (
            <ConsolidatorNewProductStep
              newName={newName}
              onNewNameChange={setNewName}
              newSlug={newSlug}
              onNewSlugChange={setNewSlug}
              newDescription={newDescription}
              onNewDescriptionChange={setNewDescription}
            />
          )}

          {/* Step 4: Variant details */}
          <ConsolidatorVariantsStep
            selectedItemsList={selectedItemsList}
            variantEdits={variantEdits}
            onSetVariantEdit={setVariantEdit}
          />

          {/* Step 5: Originals action */}
          {activeGroup && (
            <ConsolidatorOriginalsActionStep
              originalsAction={originalsAction}
              onSetOriginalsAction={setOriginalsAction}
            />
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={handleExecute}
              disabled={!canExecute || executing}
              className="px-6 py-2.5 bg-gradient-to-l from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {executing ? "جاري الدمج..." : "تنفيذ الدمج"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductConsolidatorPage;
