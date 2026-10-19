import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ShoppingBagIcon,
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useCurrency } from "../../../hooks/useCurrency";
import { apiClient } from "../../../services/apiClient";
import { WorkspaceOrder, WorkspaceOrderItem } from "./types";
import {
  matchVariantByAttributes,
  getItemOptions,
} from "./workspaceItemVariantHelpers";
import { WorkspaceEditorItemRow } from "./WorkspaceEditorItemRow";

const SimplifiedProductSelectionModal = React.lazy(
  () => import("../components/SimplifiedProductSelectionModal"),
);

export interface WorkspaceItemsEditorProps {
  order: WorkspaceOrder;
  onSave: (
    orderId: string,
    items: WorkspaceOrderItem[],
    financials: { shipping: number; discount: number; notes?: string },
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

  const toEditableItems = (source: WorkspaceOrderItem[] | undefined): WorkspaceOrderItem[] =>
    (source || []).map((it, idx) => ({
      ...it,
      id: it.id || `item-${idx}-${Date.now()}`,
      quantity: Number(it.quantity) || 1,
      price: Number(it.price) || 0,
      total: Number(it.total) || (Number(it.price) || 0) * (Number(it.quantity) || 1),
    }));

  const [items, setItems] = useState<WorkspaceOrderItem[]>(() => toEditableItems(order.items));
  const [shipping, setShipping] = useState<number>(Number(order.shipping) || 0);
  const [discount, setDiscount] = useState<number>(Number(order.discount) || 0);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [customColorMode, setCustomColorMode] = useState<Record<number, boolean>>({});
  const [customSizeMode, setCustomSizeMode] = useState<Record<number, boolean>>({});
  const [productVariantsMap, setProductVariantsMap] = useState<Record<string, any[]>>({});
  const inFlightRef = useRef<Set<string>>(new Set());

  // إعادة التهيئة عند تبديل الطلب — بدونها يستمر المحرر ببنود الطلب السابق
  useEffect(() => {
    setItems(toEditableItems(order.items));
    setShipping(Number(order.shipping) || 0);
    setDiscount(Number(order.discount) || 0);
    setCustomColorMode({});
    setCustomSizeMode({});
  }, [order.id]);

  // جلب متغيرات المنتجات إذا لم تكن محملة مسبقاً
  useEffect(() => {
    items.forEach((item) => {
      const pId = item.productId;
      if (
        pId &&
        (!item.variants || item.variants.length === 0) &&
        !productVariantsMap[pId] &&
        !inFlightRef.current.has(pId)
      ) {
        inFlightRef.current.add(pId);
        apiClient
          .get(`/agent-workspace/products/${pId}/variants`)
          .then((res) => {
            if (res.data?.success && res.data?.data?.variants) {
              setProductVariantsMap((prev) => ({
                ...prev,
                [pId]: res.data.data.variants,
              }));
            }
          })
          .catch(() => {
            setProductVariantsMap((prev) => ({
              ...prev,
              [pId]: [],
            }));
          })
          .finally(() => {
            inFlightRef.current.delete(pId);
          });
      }
    });
  }, [items, productVariantsMap]);

  const handleVariantAttributeChange = (index: number, newColor: string, newSize: string) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const { variants: vars } = getItemOptions(item, productVariantsMap);
        const matched = matchVariantByAttributes(vars, newColor, newSize);

        const updatedImage =
          matched?.image ||
          (matched?.images
            ? Array.isArray(matched.images)
              ? matched.images[0]
              : typeof matched.images === "string"
                ? (() => {
                    try {
                      const arr = JSON.parse(matched.images);
                      return Array.isArray(arr) ? arr[0] : arr;
                    } catch {
                      return matched.images;
                    }
                  })()
                : null
            : null);

        const updatedSku = matched?.sku || item.productSku || item.sku;
        const updatedPrice = matched?.price ? Number(matched.price) : item.price;

        return {
          ...item,
          productColor: newColor,
          productSize: newSize,
          variantId: matched ? matched.id : null,
          productSku: updatedSku,
          sku: updatedSku,
          productImage: updatedImage || item.productImage,
          price: updatedPrice,
          total: updatedPrice * item.quantity,
        };
      }),
    );
  };

  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0,
  );
  const finalTotal = Math.max(0, subtotal + shipping - discount);

  const handleUpdateQuantity = (index: number, delta: number) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const newQty = Math.max(1, item.quantity + delta);
        return {
          ...item,
          quantity: newQty,
          total: newQty * item.price,
        };
      }),
    );
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleProductSelected = (product: any, variant?: any) => {
    const unitPrice = Number(variant?.price || product.price || 0);
    const newItem: WorkspaceOrderItem = {
      id: `new-${Date.now()}`,
      productId: product.id,
      variantId: variant?.id,
      productName: product.name,
      name: product.name,
      quantity: 1,
      price: unitPrice,
      total: unitPrice,
      productColor: variant?.color,
      productSize: variant?.size,
      productImage: variant?.image || product.image,
      sku: variant?.sku || product.sku,
      product: product,
      variants: product.variants,
    };

    setItems((prev) => [...prev, newItem]);
    setIsCatalogOpen(false);
  };

  const handleSave = async () => {
    await onSave(order.id, items, {
      shipping,
      discount,
    });
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-card p-3 shadow-sm">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <ShoppingBagIcon className="h-4 w-4 text-primary" />
          <span>{isArabic ? "تعديل بنود وعروض الطلب" : "Edit Order Items & Upsell"}</span>
        </div>
        <button
          type="button"
          onClick={() => setIsCatalogOpen(true)}
          className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
        >
          <SparklesIcon className="h-3.5 w-3.5" />
          <span>{isArabic ? "+ إضافة عرض إضافي (Upsell)" : "+ Add Upsell Item"}</span>
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
            productVariantsMap={productVariantsMap}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onVariantAttributeChange={handleVariantAttributeChange}
            setCustomColorMode={setCustomColorMode}
            setCustomSizeMode={setCustomSizeMode}
          />
        ))}
      </div>

      {/* Financials Controls */}
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/30 pt-2 text-xs">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">
            {isArabic ? "الشحن" : "Shipping"}
          </label>
          <input
            type="number"
            min="0"
            value={shipping}
            onChange={(e) => setShipping(Math.max(0, parseFloat(e.target.value) || 0))}
            className="mt-0.5 h-7 w-full rounded border border-border/60 bg-background px-2 font-mono text-xs font-bold tabular-nums text-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">
            {isArabic ? "الخصم" : "Discount"}
          </label>
          <input
            type="number"
            min="0"
            value={discount}
            onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
            className="mt-0.5 h-7 w-full rounded border border-border/60 bg-background px-2 font-mono text-xs font-bold tabular-nums text-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Totals Preview */}
      <div className="mt-2.5 flex items-center justify-between rounded bg-muted/40 px-2.5 py-1.5 text-xs">
        <span className="font-bold text-foreground">
          {isArabic ? "الإجمالي الجديد المحسوب:" : "New Computed Total:"}
        </span>
        <span className="font-mono text-sm font-black tabular-nums text-primary">
          {formatPrice(finalTotal)}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
          <span>{isArabic ? "إلغاء" : "Cancel"}</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          <CheckIcon className="h-3.5 w-3.5" />
          <span>
            {isSaving
              ? isArabic
                ? "جارٍ الحفظ…"
                : "Saving…"
              : isArabic
                ? "حفظ التعديلات"
                : "Save Changes"}
          </span>
        </button>
      </div>

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
