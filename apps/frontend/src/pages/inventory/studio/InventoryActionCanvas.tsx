import React, { useState } from "react";
import { Boxes, Package } from "lucide-react";
import type { StudioEntity, StudioDraftAction } from "../../../components/agent-studio/types";
import { applyInventoryStudioAction } from "../../../services/inventoryAiService";
import { ProductEconomicsTile } from "./components/ProductEconomicsTile";
import { ProductEconomicsBento } from "./components/ProductEconomicsBento";
import { StudioDraftActionCard } from "./components/StudioDraftActionCard";
import { StudioQuickStrategyTriggers } from "./components/StudioQuickStrategyTriggers";

interface InventoryActionCanvasProps {
  selectedProduct: StudioEntity | null;
  activeDraft: StudioDraftAction | null;
  onDraftResolved?: () => void;
  onRequestAction?: (actionPrompt: string) => void;
  onProductUpdated?: (updatedProduct: Partial<StudioEntity>) => void;
}

export const InventoryActionCanvas: React.FC<InventoryActionCanvasProps> = ({
  selectedProduct,
  activeDraft,
  onDraftResolved,
  onRequestAction,
  onProductUpdated,
}) => {
  const [isApplying, setIsApplying] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Calculate Product Economics
  const price = selectedProduct?.price || 0;
  const cost = selectedProduct?.cost || 0;
  const stock = selectedProduct?.stock || 0;
  const profit = price > cost ? price - cost : 0;
  const marginPercent = price > 0 ? Math.round((profit / price) * 100) : 0;

  const isLowStock = stock < 10;
  const isOutOfStock = stock <= 0;

  const handleApplyDraft = async () => {
    if (!activeDraft || !selectedProduct?.id || isApplying) return;

    setIsApplying(true);
    setActionSuccessMessage(null);
    setActionErrorMessage(null);

    try {
      const res = await applyInventoryStudioAction({
        type: activeDraft.type === "GENERAL_DRAFT" ? "PRICE_CHANGE" : activeDraft.type,
        productId: selectedProduct.id,
        newValue: activeDraft.proposedValue || 0,
        reason: activeDraft.reason,
      });

      if (res.success) {
        setActionSuccessMessage(res.message || "تم تنفيذ الإجراء بنجاح");
        if (activeDraft.type === "PRICE_CHANGE" && onProductUpdated) {
          onProductUpdated({ price: Number(activeDraft.proposedValue) });
        } else if (activeDraft.type === "STOCK_ADJUSTMENT" && onProductUpdated) {
          onProductUpdated({ stock: Number(activeDraft.proposedValue) });
        }
        if (onDraftResolved) {
          setTimeout(() => onDraftResolved(), 1200);
        }
      } else {
        setActionErrorMessage(res.error || "تعذر تطبيق التعديل");
      }
    } catch (err: any) {
      setActionErrorMessage(err.message || "حدث خطأ غير متوقع أثناء تطبيق التعديل");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 sm:p-5 space-y-4 select-none">
      {/* Canvas Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
              لوحة اقتصاديات المنتج والمخزون
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              مؤشرات الأرباح والكميات المتاحة والتوصيات المعتمدة
            </p>
          </div>
        </div>

        {selectedProduct && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold tabular-nums font-mono ${
              isOutOfStock
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300"
                : isLowStock
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
            }`}
          >
            {isOutOfStock ? "نفذ المخزون" : isLowStock ? "مخزون حرج" : "مخزون آمن"}
          </span>
        )}
      </div>

      {/* Selected Product Card */}
      {selectedProduct ? (
        <div className="space-y-4">
          <ProductEconomicsTile
            product={selectedProduct}
            price={price}
            cost={cost}
            stock={stock}
            isLowStock={isLowStock}
          />

          <ProductEconomicsBento
            marginPercent={marginPercent}
            profit={profit}
            stock={stock}
            reorderThreshold={10}
          />

          {activeDraft && (
            <StudioDraftActionCard
              draft={activeDraft}
              currentPriceFallback={price}
              isApplying={isApplying}
              actionSuccessMessage={actionSuccessMessage}
              actionErrorMessage={actionErrorMessage}
              onApplyDraft={handleApplyDraft}
              onDismissDraft={onDraftResolved}
            />
          )}

          <StudioQuickStrategyTriggers
            productName={selectedProduct.name}
            cost={cost}
            stock={stock}
            onRequestAction={onRequestAction}
          />
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <Package className="w-8 h-8 mb-2 opacity-40 text-indigo-500" />
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            لم يتم تحديد منتج بعد
          </h3>
          <p className="text-[11px] text-slate-500 max-w-xs">
            اختر منتجاً من الشريط العلوي أو رادار المنتجات لعرض مؤشرات الهامش والكميات والمسودات التفاعلية.
          </p>
        </div>
      )}
    </div>
  );
};
