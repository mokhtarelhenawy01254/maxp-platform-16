import { useEffect, useRef, useState } from "react";
import { apiClient } from "../../../../services/apiClient";
import type { WorkspaceOrder, WorkspaceOrderItem } from "../types";
import {
  matchVariantByAttributes,
  getItemOptions,
} from "../workspaceItemVariantHelpers";

export interface UseWorkspaceItemsEditorControllerProps {
  order: WorkspaceOrder;
  onSave: (
    orderId: string,
    items: WorkspaceOrderItem[],
    financials: { shipping: number; discount: number; notes?: string }
  ) => Promise<void>;
}

export const useWorkspaceItemsEditorController = ({
  order,
  onSave,
}: UseWorkspaceItemsEditorControllerProps) => {
  const toEditableItems = (
    source: WorkspaceOrderItem[] | undefined
  ): WorkspaceOrderItem[] =>
    (source || []).map((it, idx) => ({
      ...it,
      id: it.id || `item-${idx}-${Date.now()}`,
      quantity: Number(it.quantity) || 1,
      price: Number(it.price) || 0,
      total:
        Number(it.total) ||
        (Number(it.price) || 0) * (Number(it.quantity) || 1),
    }));

  const [items, setItems] = useState<WorkspaceOrderItem[]>(() =>
    toEditableItems(order.items)
  );
  const [shipping, setShipping] = useState<number>(Number(order.shipping) || 0);
  const [discount, setDiscount] = useState<number>(Number(order.discount) || 0);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [customColorMode, setCustomColorMode] = useState<
    Record<number, boolean>
  >({});
  const [customSizeMode, setCustomSizeMode] = useState<Record<number, boolean>>(
    {}
  );
  const [productVariantsMap, setProductVariantsMap] = useState<
    Record<string, unknown[]>
  >({});
  const inFlightRef = useRef<Set<string>>(new Set());

  // إعادة التهيئة عند تبديل الطلب
  useEffect(() => {
    setItems(toEditableItems(order.items));
    setShipping(Number(order.shipping) || 0);
    setDiscount(Number(order.discount) || 0);
    setCustomColorMode({});
    setCustomSizeMode({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleVariantAttributeChange = (
    index: number,
    newColor: string,
    newSize: string
  ) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const { variants: vars } = getItemOptions(
          item,
          productVariantsMap as Record<string, Record<string, unknown>[]>
        );
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
        const updatedPrice = matched?.price
          ? Number(matched.price)
          : item.price;

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
      })
    );
  };

  const subtotal = items.reduce(
    (sum, item) =>
      sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
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
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleProductSelected = (
    product: { id: string; name: string; price?: number; image?: string; sku?: string; variants?: unknown[] },
    variant?: { id: string; price?: number; color?: string; size?: string; image?: string; sku?: string }
  ) => {
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
      product: product as unknown as WorkspaceOrderItem["product"],
      variants: product.variants as unknown as WorkspaceOrderItem["variants"],
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

  return {
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
    subtotal,
    finalTotal,
    handleUpdateQuantity,
    handleRemoveItem,
    handleProductSelected,
    handleSave,
  };
};
