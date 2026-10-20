import React from "react";
import { useTranslation } from "react-i18next";
import { ShoppingBagIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useCurrency } from "../../../hooks/useCurrency";
import type { WorkspaceOrder, WorkspaceOrderItem } from "./types";
import { WorkspaceEditorItemRow } from "./WorkspaceEditorItemRow";
import { WorkspaceEditorFinancials } from "./components/WorkspaceEditorFinancials";
import { useWorkspaceItemsEditorController } from "./hooks/useWorkspaceItemsEditorController";

const SimplifiedProductSelectionModal = React.lazy(
  () => import("../components/SimplifiedProductSelectionModal")
);

export interface WorkspaceItemsEditorProps {
  order: WorkspaceOrder;
  onSave: (
    orderId: string,
    items: WorkspaceOrderItem[],
    financials: { shipping: number; discount: number; notes?: string }
  ) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export const WorkspaceItemsEditor: React.FC<WorkspaceItemsEditorProps> = ({
  order,
  onSave,
  onCancel,
  isSaving,
}) => {
  const { i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const isArabic = i18n.language.toLowerCase().startsWith("ar");

  const {
    items,
    shipping,
    setShipping,
    discount,
    setDiscount,
    isCatalogOpen,
    setIsCatalogOpen,
    customColorMode,
    setCustomColorMode,
    customSizeMode,
    setCustomSizeMode,
    productVariantsMap,
    handleVariantAttributeChange,
    finalTotal,
    handleUpdateQuantity,
    handleRemoveItem,
    handleProductSelected,
    handleSave,
  } = useWorkspaceItemsEditorController({
    order,
    onSave,
  });

  return (
    <div className="rounded-lg border border-primary/30 bg-card p-3 shadow-sm">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <ShoppingBagIcon className="h-4 w-4 text-primary" />
          <span>
            {isArabic ? "تعديل بنود وعروض الطلب" : "Edit Order Items & Upsell"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsCatalogOpen(true)}
          className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
        >
          <SparklesIcon className="h-3.5 w-3.5" />
          <span>
            {isArabic
              ? "+ إضافة عرض إضافي (Upsell)"
              : "+ Add Upsell Item"}
          </span>
        </button>
      </div>

      {/* Items list */}
      <div className="max-h-72 space-y-2 overflow-y-auto pe-1">
        {items.map((item, idx) => (
          <WorkspaceEditorItemRow
            key={item.id || idx}
            item={item}
            index={idx}
            itemsCount={items.length}
            isArabic={isArabic}
            formatPrice={formatPrice}
            customColorMode={customColorMode}
            customSizeMode={customSizeMode}
            productVariantsMap={
              productVariantsMap as Record<string, Record<string, unknown>[]>
            }
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onVariantAttributeChange={handleVariantAttributeChange}
            setCustomColorMode={setCustomColorMode}
            setCustomSizeMode={setCustomSizeMode}
          />
        ))}
      </div>

      {/* Financials Controls, Totals Preview & Action Buttons */}
      <WorkspaceEditorFinancials
        shipping={shipping}
        setShipping={setShipping}
        discount={discount}
        setDiscount={setDiscount}
        finalTotal={finalTotal}
        formatPrice={formatPrice}
        isArabic={isArabic}
        isSaving={isSaving}
        onCancel={onCancel}
        onSave={() => void handleSave()}
      />

      {/* Simplified Product Selection Modal for Upsells */}
      {isCatalogOpen && (
        <React.Suspense fallback={null}>
          <SimplifiedProductSelectionModal
            isOpen={isCatalogOpen}
            onClose={() => setIsCatalogOpen(false)}
            onProductSelected={handleProductSelected}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export default WorkspaceItemsEditor;
