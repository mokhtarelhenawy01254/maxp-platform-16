import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../services/apiClient";
import { useAuth } from "../../../hooks/useAuthSimple";
import { toast } from "sonner";
import { OrderDetailsType, Government, Area } from "../types";
import {
  validateOrderItems,
  validateEgyptianPhone,
  validateCustomerName,
} from "../../../utils/validation";
import orderWorkflowService from "../../../services/orderWorkflowService";

const resolveOrderImageSrc = (value: any): string => {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return resolveOrderImageSrc(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }

    return trimmed;
  }

  if (Array.isArray(value)) {
    return resolveOrderImageSrc(value[0]);
  }

  if (typeof value === "object") {
    if (typeof value.url === "string") return value.url;
    if (typeof value.src === "string") return value.src;
  }

  return "";
};

const looksLikeSizeValue = (value: unknown): boolean => {
  if (value == null) return false;
  const str = String(value).trim();
  return /^(?:xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|5xl|free|one size|onesize|universal|small|medium|large|extra large|\d{1,3}(?:\.\d+)?)$/i.test(
    str,
  );
};

const normalizeVariantDisplayValues = (color: unknown, size: unknown) => {
  const normalizedColor = typeof color === "string" ? color.trim() : (color != null ? String(color).trim() : "");
  let normalizedSize = size != null ? String(size).trim() : "";

  if (
    normalizedColor &&
    normalizedSize &&
    normalizedColor.toLowerCase() === normalizedSize.toLowerCase()
  ) {
    normalizedSize = "";
  }

  if (normalizedSize && !looksLikeSizeValue(normalizedSize)) {
    if (
      normalizedColor &&
      (normalizedColor.includes(normalizedSize) ||
        normalizedSize.includes(normalizedColor))
    ) {
      normalizedSize = "";
    }
  }

  return {
    color: normalizedColor,
    size: normalizedSize,
  };
};

const isCancellationStatus = (status: string) => {
  const normalizedStatus = String(status || "").trim().toUpperCase();
  return normalizedStatus === "CANCELLED" || normalizedStatus === "CANCELED";
};

export const useOrderDetails = (orderNumber: string | undefined) => {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const encodedOrderNumber = orderNumber
    ? encodeURIComponent(String(orderNumber))
    : "";

  // Data State
  const [order, setOrder] = useState<OrderDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [updatingNote, setUpdatingNote] = useState(false);
  const [deletingNote, setDeletingNote] = useState(false);

  // Workflow State
  const [allowedTransitions, setAllowedTransitions] = useState<string[]>([]);
  const [workflowStatusDefs, setWorkflowStatusDefs] = useState<
    Array<{ code: string; name: string; color?: string; requiresOverride?: boolean }>
  >([]);

  // Lookups State
  const [orderStatuses, setOrderStatuses] = useState<
    Array<{ code: string; name: string; nameEn?: string }>
  >([]);
  const [paymentStatuses, setPaymentStatuses] = useState<
    Array<{ code: string; name: string; nameEn?: string }>
  >([]);
  const [governments, setGovernments] = useState<Government[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loadingGovernments, setLoadingGovernments] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);

  // Edit Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    customerName: "",
    customerPhone: "",
    alternativePhone: "",
    customerAddress: "",
    city: "",
    governorate: "",
    notes: "",
    items: [] as any[],
    shipping: 0,
    tax: 0,
  });
  const [selectedGovernmentId, setSelectedGovernmentId] = useState<
    number | null
  >(null);
  const [orderNotes, setOrderNotes] = useState<any[]>([]);

  // --- Fetching Logic ---

  const fetchOrderStatuses = async () => {
    const fallbackStatuses = [
      { code: "PENDING", name: "قيد الانتظار", color: "#F59E0B" },
      { code: "DRAFT", name: "مسودة", color: "#9CA3AF" },
      { code: "CONFIRMED", name: "مؤكد", color: "#3B82F6" },
      { code: "ON_HOLD", name: "معلق", color: "#F97316" },
      { code: "PROCESSING", name: "قيد التجهيز", color: "#8B5CF6" },
      { code: "SHIPPED", name: "تم الشحن", color: "#06B6D4" },
      { code: "DELIVERED", name: "تم التسليم", color: "#10B981" },
      { code: "CANCELLED", name: "ملغي", color: "#EF4444" },
      { code: "DUPLICATE_ORDER", name: "طلب مكرر", color: "#F59E0B" },
      { code: "REFUNDED", name: "مسترد", color: "#6B7280" },
      { code: "PARTIALLY_REFUNDED", name: "مسترد جزئياً", color: "#9CA3AF" },
      { code: "RETURNED", name: "مرتجع", color: "#DC2626" },
      { code: "PARTIALLY_RETURNED", name: "مرتجع جزئي", color: "#F87171" },
      { code: "PARTIALLY_DELIVERED", name: "تسليم جزئي", color: "#FBBF24" },
      { code: "EXCHANGED", name: "استبدال", color: "#7C3AED" },
      // 🚀 حالات شحن تربو (Turbo Shipping Statuses 1..13)
      { code: "turbo_saved", name: "تربو: محفوظة قبل الشحن (كود 1)", color: "#6366F1" },
      { code: "turbo_sent", name: "تربو: مرسلة لشركة تربو (كود 2)", color: "#3B82F6" },
      { code: "processing", name: "تربو: قيد التنفيذ بالفرع (كود 3)", color: "#8B5CF6" },
      { code: "out_for_delivery", name: "تربو: مسلمة للمندوب (كود 4)", color: "#06B6D4" },
      { code: "returned_to_company", name: "تربو: مرتجعات بالشركة (كود 5)", color: "#991B1B" },
      { code: "cancelled", name: "تربو: ملغي من الشحن (كود 6)", color: "#DC2626" },
      { code: "delivered", name: "تربو: تم التسليم (كود 7)", color: "#10B981" },
      { code: "remitted", name: "تربو: تم التوريد وتحصيل المبلغ (كود 8)", color: "#047857" },
      { code: "archived", name: "تربو: شحنة محذوفة (كود 9)", color: "#78716C" },
      { code: "returned_resent", name: "تربو: معاد إرسالها (كود 10)", color: "#2563EB" },
      { code: "returned_missing", name: "تربو: مرتجع مفقود (كود 11)", color: "#7F1D1D" },
      { code: "returned_destroyed", name: "تربو: مرتجع معدوم (كود 12)", color: "#451A03" },
      { code: "delayed", name: "تربو: مؤجلة مع المندوب (كود 13)", color: "#F97316" },
    ];

    try {
      const response = await apiClient.get("/order-status");
      console.log("📊 Order Statuses API Response:", response.data);
      if (response.data.success) {
        const apiStatuses = response.data.data || [];
        console.log("📊 Loaded statuses from API:", apiStatuses);

        // دمج الحالات من API مع الحالات الافتراضية
        const statusMap = new Map();

        // أضف الحالات الافتراضية أولاً
        fallbackStatuses.forEach((status: any) => {
          statusMap.set(status.code, status);
        });

        // اكتب فوقها بالحالات من API
        apiStatuses.forEach((status: any) => {
          statusMap.set(status.code, status);
        });

        const mergedStatuses = Array.from(statusMap.values());
        console.log("📊 Merged statuses:", mergedStatuses.length, "statuses");
        setOrderStatuses(mergedStatuses);
      }
    } catch (error) {
      console.error("Error fetching order statuses:", error);
      setOrderStatuses(fallbackStatuses);
    }
  };

  const fetchPaymentStatuses = async () => {
    try {
      const response = await apiClient.get("/order-status?statusType=payment");
      if (response.data.success) {
        setPaymentStatuses(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching payment statuses:", error);
      setPaymentStatuses([
        { code: "PENDING", name: "في انتظار الدفع" },
        { code: "COMPLETED", name: "مدفوع" },
        { code: "FAILED", name: "فشل الدفع" },
      ]);
    }
  };

  const fetchAllowedTransitions = async (currentStatusCode: string) => {
    try {
      const response = await orderWorkflowService.getAllowedTransitions(currentStatusCode);
      const responseData = response as any;
      if (responseData.success && Array.isArray(responseData.data)) {
        setWorkflowStatusDefs(responseData.data);
        setAllowedTransitions(responseData.data.map((s: any) => s.code));
      } else {
        setWorkflowStatusDefs([]);
        setAllowedTransitions([]);
      }
    } catch (error) {
      console.warn("[WORKFLOW] Could not fetch allowed transitions:", error);
      setWorkflowStatusDefs([]);
      setAllowedTransitions([]);
    }
  };

  const fetchGovernments = async () => {
    try {
      setLoadingGovernments(true);
      const response = await apiClient.get("/turbo/governments");
      if (response.data.success && response.data.data?.governments) {
        setGovernments(response.data.data.governments);
      }
    } catch (error) {
      console.error("Failed to fetch governments:", error);
    } finally {
      setLoadingGovernments(false);
    }
  };

  const fetchAreas = async (governmentId: number) => {
    if (!governmentId) {
      setAreas([]);
      return;
    }
    try {
      setLoadingAreas(true);
      const response = await apiClient.get(`/turbo/areas/${governmentId}`);
      if (response.data.success && response.data.data.areas) {
        setAreas(response.data.data.areas);
      } else {
        setAreas([]);
      }
    } catch (error) {
      console.error("Failed to fetch areas:", error);
      setAreas([]);
    } finally {
      setLoadingAreas(false);
    }
  };

  const fetchOrderDetails = useCallback(async () => {
    if (!orderNumber) return;
    try {
      setLoading(true);
      let response;
      let data;

      console.log("🔍 [FRONTEND] Fetching order:", orderNumber);

      try {
        response = await apiClient.get(
          `/orders-new/simple/${encodedOrderNumber}`,
        );
        data = response.data;
        console.log("✅ [FRONTEND] Got response from /orders-new/simple");
      } catch (error: any) {
        console.log(
          "❌ [FRONTEND] Failed to fetch from /orders-new/simple:",
          error.response?.status,
        );
        if (error.response?.status === 404) {
          try {
            console.log("🔄 [FRONTEND] Trying /orders-enhanced endpoint...");
            response = await apiClient.get(
              `/orders-enhanced/${encodedOrderNumber}`,
            );
            data = response.data;
            console.log("✅ [FRONTEND] Got response from /orders-enhanced");
          } catch (error2) {
            console.log("❌ [FRONTEND] Failed to fetch from /orders-enhanced");
            // Error from enhanced endpoint, let it fall through to the outer catch
            throw error;
          }
        } else {
          // Other error from simple endpoint, let it fall through to the outer catch
          throw error;
        }
      }

      console.log("📦 [FRONTEND] API Response data:", data);

      if (data.success) {
        const simpleOrder = data.data;
        const wasViewed = Boolean(simpleOrder.isViewed);
        console.log("🔍 [FRONTEND] Order data received:", {
          orderNumber: simpleOrder.orderNumber,
          turboShipmentId: simpleOrder.turboShipmentId,
          turboTrackingNumber: simpleOrder.turboTrackingNumber,
          turboShipmentStatus: simpleOrder.turboShipmentStatus,
          turboLabelUrl: simpleOrder.turboLabelUrl,
          turboMetadata: simpleOrder.turboMetadata ? "exists" : "null",
        });

        if (!wasViewed) {
          try {
            await apiClient.post(`/orders-new/simple/${encodedOrderNumber}/viewed`);
          } catch (e) {
            console.error("Failed to mark order as viewed:", e);
          }
        }
        const shippingAddr =
          typeof simpleOrder.shippingAddress === "string"
            ? (() => {
                try {
                  return JSON.parse(simpleOrder.shippingAddress);
                } catch {
                  return {};
                }
              })()
            : simpleOrder.shippingAddress || {};

        const parsedSubtotal =
          parseFloat(simpleOrder.subtotal ?? simpleOrder.baseTotal ?? simpleOrder.total) || 0;
        const parsedTax = parseFloat(simpleOrder.tax) || 0;
        const parsedDiscount = parseFloat(simpleOrder.discount) || 0;
        const parsedFinalTotal =
          parseFloat(simpleOrder.finalTotal ?? simpleOrder.total) || 0;
        const directShipping =
          parseFloat(simpleOrder.shipping ?? simpleOrder.shippingCost) || 0;
        const resolvedShipping =
          directShipping > 0
            ? directShipping
            : Math.max(0, parsedFinalTotal - parsedSubtotal - parsedTax);
        const resolvedTotal =
          parsedFinalTotal > 0
            ? parsedFinalTotal
            : Math.max(0, parsedSubtotal + resolvedShipping + parsedTax - parsedDiscount);

        const enhancedOrder: OrderDetailsType = {
          ...simpleOrder,
          status: (simpleOrder.status || "").toUpperCase(),
          paymentStatus: (
            simpleOrder.paymentStatus ||
            (simpleOrder.metadata?.isGuestOrder ? "UNAVAILABLE" : "PENDING")
          ).toUpperCase() as any,
          items: (Array.isArray(simpleOrder.items)
            ? simpleOrder.items
            : []
          ).map((item: any) => {
            const price = parseFloat(item.price);
            const quantity = parseInt(item.quantity);
            const validPrice = !isNaN(price) && price >= 0 ? price : 0;
            const validQuantity =
              !isNaN(quantity) && quantity > 0 ? quantity : 1;

            // Parse Item Metadata
            let itemMetadata: any = {};
            try {
              itemMetadata =
                typeof item.metadata === "string"
                  ? JSON.parse(item.metadata)
                  : item.metadata || {};
            } catch (e) {
              console.warn("Failed to parse item metadata", e);
              itemMetadata = {};
            }

            // Parse Variant Metadata
            let variantMetadata: any = {};
            if (item.variant && item.variant.metadata) {
              try {
                variantMetadata =
                  typeof item.variant.metadata === "string"
                    ? JSON.parse(item.variant.metadata)
                    : item.variant.metadata;
              } catch (e) {
                variantMetadata = {};
              }
            }

            const extractedProductColor = (() => {
              // 1. Direct fields
              if (item.productColor) return item.productColor;
              if (item.color) return item.color;

              // 2. Metadata
              if (itemMetadata.color) return itemMetadata.color;
              if (itemMetadata.attributeValues?.["اللون"])
                return itemMetadata.attributeValues["اللون"];
              if (itemMetadata.attributeValues?.["color"])
                return itemMetadata.attributeValues["color"];

              // 3. Variant Relation
              if (item.variant) {
                if (variantMetadata.attributeValues?.["اللون"])
                  return variantMetadata.attributeValues["اللون"];
                if (variantMetadata.attributeValues?.["color"])
                  return variantMetadata.attributeValues["color"];

                if (item.variant.name) {
                  const name = item.variant.name;
                  if (item.variant.type === "color" && !name.includes("-"))
                    return name;
                }
              }

              return "";
            })();

            const toStr = (v: unknown): string =>
              v != null ? String(v).trim() : "";

            const extractedProductSize = (() => {
              // 1. Direct fields
              if (item.productSize != null) return toStr(item.productSize);
              if (item.size != null) return toStr(item.size);

              // 2. Metadata
              if (itemMetadata.size != null) return toStr(itemMetadata.size);
              if (itemMetadata.attributeValues?.["المقاس"] != null)
                return toStr(itemMetadata.attributeValues["المقاس"]);
              if (itemMetadata.attributeValues?.["size"] != null)
                return toStr(itemMetadata.attributeValues["size"]);

              // 3. Variant Relation
              if (item.variant) {
                if (variantMetadata.attributeValues?.["المقاس"] != null)
                  return toStr(variantMetadata.attributeValues["المقاس"]);
                if (variantMetadata.attributeValues?.["size"] != null)
                  return toStr(variantMetadata.attributeValues["size"]);

                if (item.variant.name) {
                  const parts = item.variant.name
                    .split(/[-/|xX]/)
                    .map((s: any) => s.trim());
                  const sizePart = parts.find((part: string) =>
                    looksLikeSizeValue(part),
                  );
                  if (sizePart) return sizePart;
                }
              }

              return "";
            })();

            const normalizedVariantValues = normalizeVariantDisplayValues(
              extractedProductColor,
              extractedProductSize,
            );

            return {
              id: item.id || Math.random().toString(),
              productId: item.productId || "",
              productName:
                item.name ||
                item.productName ||
                (item as any).local_product_id ||
                "منتج غير محدد",
              productColor: normalizedVariantValues.color,
              productSize: normalizedVariantValues.size,
              productImage:
                resolveOrderImageSrc(item.productImage) ||
                resolveOrderImageSrc(item.image) ||
                resolveOrderImageSrc(itemMetadata.image) ||
                resolveOrderImageSrc(itemMetadata.images) ||
                resolveOrderImageSrc(item.product?.images) ||
                "",
              productSku: item.productSku || "",
              price: validPrice,
              quantity: validQuantity,
              total: parseFloat(item.total) || validPrice * validQuantity,
              metadata: itemMetadata,
            };
          }),
          subtotal: parsedSubtotal,
          discount: parsedDiscount,
          tax: parsedTax,
          shipping: resolvedShipping,
          total: resolvedTotal,
          currency: "EGP",
          isViewed: true,
        };

        setOrder(enhancedOrder);
        setOrderNotes(enhancedOrder.orderNotes || []);

        fetchAllowedTransitions(enhancedOrder.status);

        console.log("✅ [FRONTEND] Order set in state:", {
          orderNumber: enhancedOrder.orderNumber,
          turboShipmentId: enhancedOrder.turboShipmentId,
          turboTrackingNumber: enhancedOrder.turboTrackingNumber,
          turboShipmentStatus: enhancedOrder.turboShipmentStatus,
          turboLabelUrl: enhancedOrder.turboLabelUrl,
          turboMetadata: enhancedOrder.turboMetadata ? "exists" : "null",
        });

        // Initialize Edit Form
        setEditForm({
          customerName: enhancedOrder.customerName,
          customerPhone: enhancedOrder.customerPhone || "",
          alternativePhone: enhancedOrder.alternativePhone || "",
          customerAddress: enhancedOrder.customerAddress || "",
          city: enhancedOrder.city || "",
          governorate:
            enhancedOrder.governorate || shippingAddr.governorate || "",
          notes: enhancedOrder.notes || "",
          items: JSON.parse(JSON.stringify(enhancedOrder.items)),
          shipping: enhancedOrder.shipping || 0,
          tax: enhancedOrder.tax || 0,
        });

        // Logic to set selectedGovernmentId moved to separate useEffect
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error("فشل تحميل تفاصيل الطلب");
    } finally {
      setLoading(false);
    }
  }, [orderNumber, encodedOrderNumber]);

  useEffect(() => {
    if (!orderNumber || authLoading || !isAuthenticated) return;
    fetchOrderDetails();
    fetchOrderStatuses();
    fetchPaymentStatuses();
  }, [orderNumber, authLoading, isAuthenticated, fetchOrderDetails]);

  useEffect(() => {
    if (
      !isEditing ||
      authLoading ||
      !isAuthenticated ||
      loadingGovernments ||
      governments.length > 0
    ) {
      return;
    }

    fetchGovernments();
  }, [
    isEditing,
    authLoading,
    isAuthenticated,
    loadingGovernments,
    governments.length,
  ]);

  // Re-run gov check when governments load if order is already loaded
  useEffect(() => {
    if (order && governments.length > 0 && !selectedGovernmentId) {
      const shippingAddr =
        typeof order.shippingAddress === "string"
          ? (() => {
              try {
                return JSON.parse(order.shippingAddress);
              } catch {
                return {};
              }
            })()
          : order.shippingAddress || {};
      const initialGovernorate =
        order.governorate || shippingAddr.governorate || order.city || ""; // Prioritize top-level governorate
      const foundGov = governments.find(
        (g) =>
          g.name === initialGovernorate ||
          g.id === parseInt(initialGovernorate) ||
          g.name === String(initialGovernorate).replace(/^\d+:/, "").trim(),
      );
      if (foundGov) {
        setSelectedGovernmentId(foundGov.id);
        fetchAreas(foundGov.id);
      }
    }
  }, [governments, order, selectedGovernmentId]);

  // --- Actions ---

  const handleGovernmentChange = (
    governmentId: number,
    governmentName: string,
  ) => {
    setSelectedGovernmentId(governmentId);
    setEditForm({ ...editForm, governorate: governmentName, city: "" });
    fetchAreas(governmentId);
  };

  const updateStatus = async (newStatus: string, notes: string, isOverride: boolean = false) => {
    const normalizedStatus = String(newStatus || "").trim().toUpperCase();
    const trimmedNotes = String(notes || "").trim();

    if (isCancellationStatus(normalizedStatus) && !trimmedNotes) {
      toast.error("سبب إلغاء الطلب مطلوب");
      return false;
    }

    try {
      setUpdating(true);
      const response = await apiClient.post(
        `/orders-new/simple/${encodedOrderNumber}/status`,
        {
          status: normalizedStatus,
          notes: trimmedNotes,
          isOverride,
        },
      );
      if (response.data.success) {
        if (response.data.data?.workflowStatus === "pending") {
          toast.success(
            response.data.message || "تم تقديم طلب تغيير الحالة للمراجعة",
          );
          return true;
        }

        await fetchOrderDetails();
        await fetchAllowedTransitions(normalizedStatus);
        toast.success(response.data.message || "تم تحديث حالة الطلب بنجاح");
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "فشل تحديث الحالة");
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const updatePaymentStatus = async (
    newPaymentStatus: string,
    notes: string,
  ) => {
    if (order?.metadata?.isGuestOrder) {
      toast.error("حالة الدفع غير متاحة حالياً لطلبات الضيوف");
      return false;
    }

    try {
      setUpdating(true);
      const response = await apiClient.post(
        `/orders-new/simple/${encodedOrderNumber}/payment-status`,
        {
          paymentStatus: newPaymentStatus.toUpperCase(),
          notes: notes,
        },
      );
      if (response.data.success) {
        setOrder((prev) =>
          prev
            ? { ...prev, paymentStatus: newPaymentStatus.toUpperCase() as any }
            : null,
        );
        toast.success("تم تحديث حالة الدفع بنجاح");
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "فشل تحديث حالة الدفع");
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const addNote = async (content: string) => {
    if (!content.trim()) return false;
    try {
      setAddingNote(true);
      const response = await apiClient.post(
        `/orders-new/simple/${encodedOrderNumber}/notes`,
        {
          content,
        },
      );
      if (response.data.success) {
        setOrderNotes((prev) => [response.data.data, ...prev]);
        toast.success("تم إضافة الملاحظة بنجاح");
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "فشل إضافة الملاحظة");
      return false;
    } finally {
      setAddingNote(false);
    }
  };

  const updateNote = async (noteId: string, content: string) => {
    if (!content.trim()) return false;
    try {
      setUpdatingNote(true);
      const response = await apiClient.patch(
        `/orders-new/simple/notes/${noteId}`,
        { content },
      );
      if (response.data.success) {
        setOrderNotes((prev) =>
          prev.map((n) => (n.id === noteId ? response.data.data : n)),
        );
        toast.success("تم تعديل الملاحظة بنجاح");
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "فشل تعديل الملاحظة");
      return false;
    } finally {
      setUpdatingNote(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      setDeletingNote(true);
      const response = await apiClient.delete(
        `/orders-new/simple/notes/${noteId}`,
      );
      if (response.data.success) {
        setOrderNotes((prev) => prev.filter((n) => n.id !== noteId));
        toast.success("تم حذف الملاحظة بنجاح");
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "فشل حذف الملاحظة");
      return false;
    } finally {
      setDeletingNote(false);
    }
  };

  const saveChanges = async () => {
    if (!order) return false;

    // ✅ Validation: Check customer name
    const nameValidation = validateCustomerName(editForm.customerName);
    if (!nameValidation.isValid) {
      toast.error(nameValidation.error || "اسم العميل غير صحيح");
      return false;
    }

    // ✅ Validation: Check phone number
    if (editForm.customerPhone) {
      const phoneValidation = validateEgyptianPhone(editForm.customerPhone);
      if (!phoneValidation.isValid) {
        toast.error(phoneValidation.error || "رقم الهاتف غير صحيح");
        return false;
      }
    }

    // ✅ Validation: Check alternative phone if provided
    if (editForm.alternativePhone && editForm.alternativePhone.trim() !== "") {
      const altPhoneValidation = validateEgyptianPhone(
        editForm.alternativePhone,
      );
      if (!altPhoneValidation.isValid) {
        toast.error(`الرقم البديل: ${altPhoneValidation.error}`);
        return false;
      }
    }

    // ✅ Validation: Check items
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

      await apiClient.put(
        `/orders-new/simple/${encodedOrderNumber}`,
        detailsBody,
      );

      // 2. Update Items
      const itemsToUpdate = editForm.items || [];

      if (itemsToUpdate && itemsToUpdate.length > 0) {
        const newItems = itemsToUpdate.map((item: any) => {
          const price =
            typeof item.price === "number" && !isNaN(item.price)
              ? item.price
              : parseFloat(item.price) || 0;
          const quantity =
            typeof item.quantity === "number" &&
            !isNaN(item.quantity) &&
            item.quantity > 0
              ? item.quantity
              : 1;
          return {
            productId: item.productId || item.id || "",
            productName: item.productName || item.name || "",
            productColor: item.productColor ? String(item.productColor) : null,
            productSize: item.productSize != null ? String(item.productSize) : null,
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
            : parseFloat(editForm.shipping) || 0;
        const currentTax =
          typeof editForm.tax === "number"
            ? editForm.tax
            : parseFloat(editForm.tax) || 0;
        const newTotal = newSubtotal + currentShipping + currentTax;

        await apiClient.put(`/orders-new/simple/${encodedOrderNumber}/items`, {
          items: newItems,
          subtotal: newSubtotal,
          total: newTotal,
          tax: currentTax,
          shipping: currentShipping,
        });
      }

      await fetchOrderDetails();
      setIsEditing(false);
      toast.success("تم حفظ التغييرات بنجاح");
      return true;
    } catch (e: any) {
      console.error("Save error:", e);
      toast.error(e.response?.data?.message || "فشل حفظ التغييرات");
      return false;
    } finally {
      setUpdating(false);
    }
  };

  return {
    order,
    setOrder, // Exposed for real-time updates
    loading,
    updating,
    addingNote,
    updatingNote,
    deletingNote,
    // Workflow
    allowedTransitions,
    workflowStatusDefs,
    // Lookups
    orderStatuses,
    paymentStatuses,
    governments,
    areas,
    loadingGovernments,
    loadingAreas,
    // Forms
    isEditing,
    setIsEditing,
    editForm,
    setEditForm,
    selectedGovernmentId,
    setSelectedGovernmentId,
    orderNotes,
    // Actions
    fetchOrderDetails,
    handleGovernmentChange,
    updateStatus,
    updatePaymentStatus,
    addNote,
    updateNote,
    deleteNote,
    saveChanges,
  };
};
