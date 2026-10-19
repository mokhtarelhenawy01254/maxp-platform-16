import { useState } from "react";
import { apiClient } from "../../../services/apiClient";
import { toast } from "sonner";
import { tToast } from "../../../utils/i18n-toast";
import { OrderDetailsType } from "../types";
import {
  validateOrderItems,
  validateEgyptianPhone,
  validateCustomerName,
} from "../../../utils/validation";
import { OrderDetailsEditForm } from "./orderDetailsParser";

export interface UseOrderDetailsSaveParams {
  order: OrderDetailsType | null;
  orderNumber: string | undefined;
  encodedOrderNumber: string;
  fetchOrderDetails: () => Promise<void>;
  setUpdating: (updating: boolean) => void;
}

export const useOrderDetailsSave = ({
  order,
  orderNumber,
  encodedOrderNumber,
  fetchOrderDetails,
  setUpdating,
}: UseOrderDetailsSaveParams) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<OrderDetailsEditForm>({
    customerName: "",
    customerPhone: "",
    alternativePhone: "",
    customerAddress: "",
    city: "",
    governorate: "",
    notes: "",
    items: [],
    shipping: 0,
    tax: 0,
    discount: 0,
    discountReason: "",
    customerRating: "UNKNOWN",
  });

  const saveChanges = async () => {
    if (!order) return false;

    // Validation: Check customer name
    const nameValidation = validateCustomerName(editForm.customerName);
    if (!nameValidation.isValid) {
      toast.error(nameValidation.error || "اسم العميل غير صحيح");
      return false;
    }

    // Validation: Check phone number
    if (editForm.customerPhone) {
      const phoneValidation = validateEgyptianPhone(editForm.customerPhone);
      if (!phoneValidation.isValid) {
        toast.error(phoneValidation.error || "رقم الهاتف غير صحيح");
        return false;
      }
    }

    // Validation: Check alternative phone if provided
    if (editForm.alternativePhone && editForm.alternativePhone.trim() !== "") {
      const altPhoneValidation = validateEgyptianPhone(editForm.alternativePhone);
      if (!altPhoneValidation.isValid) {
        toast.error(`الرقم البديل: ${altPhoneValidation.error}`);
        return false;
      }
    }

    // Validation: Check items
    const itemsValidation = validateOrderItems(editForm.items);
    if (!itemsValidation.isValid) {
      toast.error(itemsValidation.error || "يوجد خطأ في المنتجات");
      return false;
    }

    setUpdating(true);
    try {
      // 1. Update Details
      const detailsBody = {
        customerName: editForm.customerName,
        customerPhone: editForm.customerPhone,
        alternativePhone: editForm.alternativePhone,
        shippingAddress: {
          address: editForm.customerAddress,
          city: editForm.city,
          governorate: editForm.governorate,
          country: "Egypt",
        },
        city: editForm.city,
        governorate: editForm.governorate,
        notes: editForm.notes,
      };

      await apiClient.put(`/orders-new/simple/${encodedOrderNumber}`, detailsBody);

      // 1.1 Update Customer Rating if changed
      if (editForm.customerRating && editForm.customerRating !== order?.customerRating) {
        await apiClient
          .put(`/orders-new/simple/${encodedOrderNumber}/customer-rating`, {
            rating: editForm.customerRating,
          })
          .catch((err) => {
            console.warn("Failed to update customer rating during order save:", err.message);
          });
      }

      // 2. Update Items
      const itemsToUpdate = editForm.items || [];

      if (itemsToUpdate && itemsToUpdate.length > 0) {
        const newItems = itemsToUpdate.map((item: any) => {
          const price =
            typeof item.price === "number" && !isNaN(item.price)
              ? item.price
              : parseFloat(item.price) || 0;
          const quantity =
            typeof item.quantity === "number" && !isNaN(item.quantity) && item.quantity > 0
              ? item.quantity
              : 1;
          return {
            productId: item.productId || item.id || "",
            variantId: item.variantId || item.metadata?.variantId || null,
            productName: item.productName || item.name || "",
            productColor: item.productColor ? String(item.productColor) : null,
            productSize: item.productSize != null ? String(item.productSize) : null,
            productSku: item.productSku || item.sku || item.metadata?.sku || null,
            productImage: item.productImage || item.image || item.metadata?.image || null,
            price,
            quantity,
            total: price * quantity,
            metadata: item.metadata || {},
          };
        });

        const newSubtotal = newItems.reduce(
          (sum: number, item: any) => sum + (item.total || 0),
          0,
        );
        const currentShipping =
          typeof editForm.shipping === "number"
            ? editForm.shipping
            : parseFloat(editForm.shipping as any) || 0;
        const currentTax =
          typeof editForm.tax === "number"
            ? editForm.tax
            : parseFloat(editForm.tax as any) || 0;
        const currentDiscount =
          typeof editForm.discount === "number"
            ? editForm.discount
            : parseFloat(editForm.discount as any) || 0;
        const newTotal = Math.max(
          0,
          newSubtotal + currentShipping + currentTax - currentDiscount,
        );

        await apiClient.put(`/orders-new/simple/${encodedOrderNumber}/items`, {
          items: newItems,
          subtotal: newSubtotal,
          total: newTotal,
          tax: currentTax,
          shipping: currentShipping,
          discount: currentDiscount,
          discountReason: editForm.discountReason?.trim() || null,
        });
      }

      await fetchOrderDetails();
      setIsEditing(false);
      tToast.success("orderDetails.success_save_a5c2");
      return true;
    } catch (e: any) {
      console.error("Save error:", e);
      toast.error(e.response?.data?.message || "فشل حفظ التغييرات");
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const handleDiscountApproval = async (
    action: "APPROVE" | "REJECT",
    reason?: string,
  ) => {
    if (!orderNumber) return;
    try {
      setUpdating(true);
      const response = await apiClient.post(
        `/orders-new/simple/${encodedOrderNumber}/discount-approval`,
        { action, reason },
      );
      if (response.data?.success) {
        toast.success(
          action === "APPROVE" ? "تم اعتماد الخصم بنجاح" : "تم رفض وإلغاء الخصم بنجاح",
        );
        await fetchOrderDetails();
      }
    } catch (error: any) {
      console.error("Error in discount approval:", error);
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "فشل في معالجة اعتماد/رفض الخصم";
      toast.error(msg);
    } finally {
      setUpdating(false);
    }
  };

  return {
    isEditing,
    setIsEditing,
    editForm,
    setEditForm,
    saveChanges,
    handleDiscountApproval,
  };
};
