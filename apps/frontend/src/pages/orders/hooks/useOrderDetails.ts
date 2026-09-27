import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../services/apiClient";
import { useAuth } from "../../../hooks/useAuthSimple";
import { toast } from "sonner";
import i18n from "../../../i18n";
import { tToast } from "../../../utils/i18n-toast";
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
    discount: 0,
    discountReason: "",
    customerRating: "UNKNOWN",
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
      { code: "STOCK_SHORTAGE", name: "عجز مخزون", color: "#E11D48" },
      { code: "SHORTAGE_FAILED", name: "عجز نهائي", color: "#7C3AED" },
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

        // 🛡️ (deleted-status-dropdowns): رد الـ API هو مصدر الحقيقة — الدمج مع
        // fallbackStatuses كان بيرجّع حالات التاجر حذفها + حالات تربو وهمية
        // مخلوطة (turbo_saved/delayed...) مش قابلة للتطبيق كحالة طلب أصلًا.
        // الـ fallback rescue فقط لو الرد فاضي.
        setOrderStatuses(
          apiStatuses.length > 0 ? apiStatuses : fallbackStatuses,
        );
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

        const kashierPaymentData =
          simpleOrder.kashierPayment ||
          (simpleOrder.metadata as any)?.kashierPayment ||
          null;

        const enhancedOrder: OrderDetailsType = {
          ...simpleOrder,
          status: (simpleOrder.status || "").toUpperCase(),
          kashierPayment: kashierPaymentData,
          paymentStatus: (() => {
            const rawStatus = String(
              simpleOrder.paymentStatus ||
                (simpleOrder.metadata?.isGuestOrder ? "UNAVAILABLE" : "PENDING"),
            ).toUpperCase();

            // Kashier confirmed payment
            if (
              kashierPaymentData &&
              (String(kashierPaymentData.status).toUpperCase() === "SUCCESS" ||
                String(kashierPaymentData.status).toUpperCase() === "CAPTURED")
            ) {
              return "COMPLETED";
            }

            if (
              (rawStatus === "PENDING" ||
                rawStatus === "UNAVAILABLE" ||
                rawStatus === "UNKNOWN" ||
                rawStatus === "") &&
              String(simpleOrder.paymentMethod || "").toLowerCase() === "wallet"
            ) {
              const walletProof = (simpleOrder.metadata as any)
                ?.walletPaymentProof;
              const hasScreenshot = Boolean(walletProof?.imageUrl);
              const isRejected =
                String(walletProof?.status || "").toUpperCase() === "REJECTED";
              if (hasScreenshot && !isRejected) {
                return "COMPLETED";
              }
            }
            return rawStatus;
          })() as any,
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
            const vObj = item.variant || item.productVariant;
            let variantMetadata: any = {};
            if (vObj && vObj.metadata) {
              try {
                variantMetadata =
                  typeof vObj.metadata === "string"
                    ? JSON.parse(vObj.metadata)
                    : vObj.metadata;
              } catch (e) {
                variantMetadata = {};
              }
            }

            const extractedProductColor = (() => {
              // 1. Direct fields
              if (item.productColor) return item.productColor;
              if (item.color) return item.color;

              // 2. Metadata
              if (itemMetadata.productColor) return itemMetadata.productColor;
              if (itemMetadata.color) return itemMetadata.color;
              if (itemMetadata.Color) return itemMetadata.Color;
              const itemAttrs =
                itemMetadata.attributeValues ||
                (typeof itemMetadata.attributes === "object" && !Array.isArray(itemMetadata.attributes)
                  ? itemMetadata.attributes
                  : null);
              if (itemAttrs) {
                if (itemAttrs["اللون"]) return itemAttrs["اللون"];
                if (itemAttrs["لون"]) return itemAttrs["لون"];
                if (itemAttrs["Color"]) return itemAttrs["Color"];
                if (itemAttrs["color"]) return itemAttrs["color"];
              }

              // 3. Variant Relation
              if (vObj) {
                const vAttrs =
                  variantMetadata.attributeValues ||
                  (typeof variantMetadata.attributes === "object" && !Array.isArray(variantMetadata.attributes)
                    ? variantMetadata.attributes
                    : null) ||
                  variantMetadata;
                if (vAttrs) {
                  if (vAttrs["اللون"]) return vAttrs["اللون"];
                  if (vAttrs["لون"]) return vAttrs["لون"];
                  if (vAttrs["Color"]) return vAttrs["Color"];
                  if (vAttrs["color"]) return vAttrs["color"];
                }
                if (vObj.color) return vObj.color;

                if (vObj.name) {
                  const parts = vObj.name.split(/\s*[-–|\/]\s*/);
                  if (parts.length >= 2 && isNaN(Number(parts[0]))) return parts[0];
                  if (vObj.type === "color") return vObj.name;
                }
              }

              return "";
            })();

            const toStr = (v: unknown): string =>
              v != null ? String(v).trim() : "";

            const extractedProductSize = (() => {
              // 1. Direct fields
              if (item.productSize != null && item.productSize !== "") return toStr(item.productSize);
              if (item.size != null && item.size !== "") return toStr(item.size);

              // 2. Metadata
              if (itemMetadata.productSize != null && itemMetadata.productSize !== "") return toStr(itemMetadata.productSize);
              if (itemMetadata.size != null && itemMetadata.size !== "") return toStr(itemMetadata.size);
              if (itemMetadata.Size != null && itemMetadata.Size !== "") return toStr(itemMetadata.Size);
              const itemAttrs =
                itemMetadata.attributeValues ||
                (typeof itemMetadata.attributes === "object" && !Array.isArray(itemMetadata.attributes)
                  ? itemMetadata.attributes
                  : null);
              if (itemAttrs) {
                if (itemAttrs["المقاس"] != null) return toStr(itemAttrs["المقاس"]);
                if (itemAttrs["مقاس"] != null) return toStr(itemAttrs["مقاس"]);
                if (itemAttrs["Size"] != null) return toStr(itemAttrs["Size"]);
                if (itemAttrs["size"] != null) return toStr(itemAttrs["size"]);
              }

              // 3. Variant Relation
              if (vObj) {
                const vAttrs =
                  variantMetadata.attributeValues ||
                  (typeof variantMetadata.attributes === "object" && !Array.isArray(variantMetadata.attributes)
                    ? variantMetadata.attributes
                    : null) ||
                  variantMetadata;
                if (vAttrs) {
                  if (vAttrs["المقاس"] != null) return toStr(vAttrs["المقاس"]);
                  if (vAttrs["مقاس"] != null) return toStr(vAttrs["مقاس"]);
                  if (vAttrs["Size"] != null) return toStr(vAttrs["Size"]);
                  if (vAttrs["size"] != null) return toStr(vAttrs["size"]);
                }
                if (vObj.size != null) return toStr(vObj.size);

                if (vObj.name) {
                  const parts = vObj.name
                    .split(/\s*[-–|\/]\s*/)
                    .map((s: any) => s.trim());
                  const sizePart = parts.find((part: string) =>
                    looksLikeSizeValue(part),
                  );
                  if (sizePart) return sizePart;
                  if (parts.length >= 2) return parts[parts.length - 1];
                  if (vObj.type === "size") return parts[0];
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
              variantId: item.variantId || item.variant?.id || itemMetadata.variantId || null,
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
          discountReason:
            simpleOrder.discountReason ||
            (simpleOrder.metadata as any)?.discountReason ||
            null,
          needsDiscountApproval: Boolean(
            simpleOrder.needsDiscountApproval ??
            (simpleOrder.metadata as any)?.needsDiscountApproval
          ),
          discountApprovalStatus:
            simpleOrder.discountApprovalStatus ||
            (simpleOrder.metadata as any)?.discountApprovalStatus ||
            null,
          discountApprovedBy:
            simpleOrder.discountApprovedBy ||
            (simpleOrder.metadata as any)?.discountApprovedBy ||
            null,
          discountApprovedAt:
            simpleOrder.discountApprovedAt ||
            (simpleOrder.metadata as any)?.discountApprovedAt ||
            null,
          discountRejectedBy:
            simpleOrder.discountRejectedBy ||
            (simpleOrder.metadata as any)?.discountRejectedBy ||
            null,
          discountRejectedAt:
            simpleOrder.discountRejectedAt ||
            (simpleOrder.metadata as any)?.discountRejectedAt ||
            null,
          discountRejectionReason:
            simpleOrder.discountRejectionReason ||
            (simpleOrder.metadata as any)?.discountRejectionReason ||
            null,
          tax: parsedTax,
          shipping: resolvedShipping,
          total: resolvedTotal,
          trackingNumber:
            simpleOrder.trackingNumber ||
            simpleOrder.shipments?.[0]?.trackingNumber ||
            simpleOrder.turboTrackingNumber ||
            (simpleOrder.metadata as any)?.trackingNumber ||
            null,
          carrierType:
            simpleOrder.carrierType ||
            simpleOrder.shipments?.[0]?.carrierType ||
            (simpleOrder.metadata as any)?.shippingCarrier ||
            null,
          shipments: simpleOrder.shipments || [],
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
          discount: enhancedOrder.discount || 0,
          discountReason: enhancedOrder.discountReason || "",
          customerRating:
            enhancedOrder.customerRating ||
            enhancedOrder.customer?.customerRating ||
            "UNKNOWN",
        });

        // Logic to set selectedGovernmentId moved to separate useEffect
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      tToast.error("orderDetails.failed_load_1612");
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
      tToast.error("orderDetails.msg_2c62");
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
            response.data.message || i18n.t("orderDetails.msg_911a"),
          );
          return true;
        }

        await fetchOrderDetails();
        await fetchAllowedTransitions(normalizedStatus);
        toast.success(response.data.message || i18n.t("orderDetails.success_update_status_5c48"));
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
      tToast.error("orderDetails.msg_ce95");
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
        tToast.success("orderDetails.success_update_status_4792");
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

  const verifyWalletProof = async (action: "VERIFY" | "REJECT", rejectReason?: string) => {
    if (!order?.walletPaymentProof && !order?.metadata?.walletPaymentProof) return false;
    try {
      setUpdating(true);
      const response = await apiClient.post(
        `/orders-new/simple/${encodedOrderNumber}/wallet-proof/verify`,
        { action, ...(rejectReason ? { rejectReason } : {}) },
      );
      if (response.data.success) {
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                walletPaymentProof: response.data.data?.walletPaymentProof || prev.walletPaymentProof,
                paymentStatus:
                  action === "VERIFY"
                    ? ("COMPLETED" as any)
                    : prev.paymentStatus,
              }
            : null,
        );
        toast.success(response.data.message || "تم تحديث إثبات الدفع");
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "فشل التحقق من إثبات الدفع");
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
        tToast.success("orderDetails.success_add_477c");
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
        tToast.success("orderDetails.msg_a504");
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
        tToast.success("orderDetails.success_delete_42f8");
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

      // 1.1 Update Customer Rating if changed
      if (editForm.customerRating && editForm.customerRating !== order?.customerRating) {
        await apiClient.put(
          `/orders-new/simple/${encodedOrderNumber}/customer-rating`,
          { rating: editForm.customerRating }
        ).catch((err) => {
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
            typeof item.quantity === "number" &&
            !isNaN(item.quantity) &&
            item.quantity > 0
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
            : parseFloat(editForm.shipping) || 0;
        const currentTax =
          typeof editForm.tax === "number"
            ? editForm.tax
            : parseFloat(editForm.tax) || 0;
        const currentDiscount =
          typeof editForm.discount === "number"
            ? editForm.discount
            : parseFloat(editForm.discount) || 0;
        const newTotal = Math.max(0, newSubtotal + currentShipping + currentTax - currentDiscount);

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
        {
          action,
          reason,
        },
      );
      if (response.data?.success) {
        toast.success(
          action === "APPROVE"
            ? "تم اعتماد الخصم بنجاح"
            : "تم رفض وإلغاء الخصم بنجاح",
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
    verifyWalletProof,
    handleDiscountApproval,
    addNote,
    updateNote,
    deleteNote,
    saveChanges,
  };
};
