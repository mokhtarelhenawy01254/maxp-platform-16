import { useMemo } from "react";
import { useUnsavedChanges } from "../../../hooks/useUnsavedChanges";
import type { OrderDetailsType } from "../types";

export interface CalculatedTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
}

export interface UseOrderEditCalculationParams {
  order: OrderDetailsType | null;
  editForm: {
    customerName?: string;
    customerPhone?: string;
    alternativePhone?: string;
    customerAddress?: string;
    city?: string;
    notes?: string;
    shipping?: number | string;
    tax?: number | string;
    discount?: number | string;
    discountReason?: string;
    items?: any[];
  };
  isEditing: boolean;
  canEditOrderDetails: boolean;
  t: (key: string, options?: any) => string;
}

export interface UseOrderEditCalculationReturn {
  hasUnsavedChanges: boolean;
  calculatedTotals: CalculatedTotals;
}

export function useOrderEditCalculation({
  order,
  editForm,
  isEditing,
  canEditOrderDetails,
  t,
}: UseOrderEditCalculationParams): UseOrderEditCalculationReturn {
  const hasUnsavedChanges = useMemo(() => {
    if (!canEditOrderDetails) return false;
    if (!isEditing || !order) return false;

    const hasChanges =
      editForm.customerName !== order.customerName ||
      editForm.customerPhone !== (order.customerPhone || "") ||
      editForm.alternativePhone !== (order.alternativePhone || "") ||
      editForm.customerAddress !== (order.customerAddress || "") ||
      editForm.city !== (order.city || "") ||
      editForm.notes !== (order.notes || "") ||
      editForm.shipping !== (order.shipping || 0) ||
      editForm.tax !== (order.tax || 0) ||
      editForm.discount !== (order.discount || 0) ||
      editForm.discountReason !== (order.discountReason || "") ||
      JSON.stringify(editForm.items) !== JSON.stringify(order.items);

    return hasChanges;
  }, [canEditOrderDetails, isEditing, order, editForm]);

  useUnsavedChanges({
    hasUnsavedChanges,
    message: t("orderDetails.unsavedChangesMessage"),
  });

  const calculatedTotals = useMemo<CalculatedTotals>(() => {
    if (!isEditing || !order) {
      const subtotal = order?.subtotal || 0;
      const shipping = order?.shipping || 0;
      const tax = order?.tax || 0;
      const discount = order?.discount || 0;
      return {
        subtotal,
        shipping,
        tax,
        discount,
        total: Math.max(0, subtotal + shipping + tax - discount),
      };
    }

    const subtotal = (editForm.items || []).reduce((sum: number, item: any) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return sum + price * quantity;
    }, 0);

    const shipping =
      typeof editForm.shipping === "number" && !isNaN(editForm.shipping)
        ? editForm.shipping
        : parseFloat(String(editForm.shipping || 0)) || 0;

    const tax =
      typeof editForm.tax === "number" && !isNaN(editForm.tax)
        ? editForm.tax
        : parseFloat(String(editForm.tax || 0)) || 0;

    const discount =
      typeof editForm.discount === "number" && !isNaN(editForm.discount)
        ? editForm.discount
        : parseFloat(String(editForm.discount || 0)) || 0;

    const total = Math.max(0, subtotal + shipping + tax - discount);

    return { subtotal, shipping, tax, discount, total };
  }, [
    isEditing,
    editForm.items,
    editForm.shipping,
    editForm.tax,
    editForm.discount,
    order,
  ]);

  return {
    hasUnsavedChanges,
    calculatedTotals,
  };
}
