import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../services/apiClient";
import { OrderDetailsType, Government, Area } from "../types";
import orderWorkflowService from "../../../services/orderWorkflowService";

export interface UseOrderDetailsLookupsParams {
  order: OrderDetailsType | null;
  isEditing: boolean;
  authLoading: boolean;
  isAuthenticated: boolean;
  onGovernmentSelect?: (governmentName: string) => void;
}

export const useOrderDetailsLookups = ({
  order,
  isEditing,
  authLoading,
  isAuthenticated,
  onGovernmentSelect,
}: UseOrderDetailsLookupsParams) => {
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
  const [selectedGovernmentId, setSelectedGovernmentId] = useState<number | null>(null);

  const fetchOrderStatuses = useCallback(async () => {
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
      if (response.data.success) {
        const apiStatuses = response.data.data || [];
        setOrderStatuses(apiStatuses.length > 0 ? apiStatuses : fallbackStatuses);
      }
    } catch {
      setOrderStatuses(fallbackStatuses);
    }
  }, []);

  const fetchPaymentStatuses = useCallback(async () => {
    try {
      const response = await apiClient.get("/order-status?statusType=payment");
      if (response.data.success) {
        setPaymentStatuses(response.data.data || []);
      }
    } catch {
      setPaymentStatuses([
        { code: "PENDING", name: "في انتظار الدفع" },
        { code: "COMPLETED", name: "مدفوع" },
        { code: "FAILED", name: "فشل الدفع" },
      ]);
    }
  }, []);

  const fetchAllowedTransitions = useCallback(async (currentStatusCode: string) => {
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
    } catch {
      setWorkflowStatusDefs([]);
      setAllowedTransitions([]);
    }
  }, []);

  const fetchGovernments = useCallback(async () => {
    try {
      setLoadingGovernments(true);
      const response = await apiClient.get("/turbo/governments");
      if (response.data.success && response.data.data?.governments) {
        setGovernments(response.data.data.governments);
      }
    } catch {
      // Ignored
    } finally {
      setLoadingGovernments(false);
    }
  }, []);

  const fetchAreas = useCallback(async (governmentId: number) => {
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
    } catch {
      setAreas([]);
    } finally {
      setLoadingAreas(false);
    }
  }, []);

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
  }, [isEditing, authLoading, isAuthenticated, loadingGovernments, governments.length, fetchGovernments]);

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
        order.governorate || shippingAddr.governorate || order.city || "";
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
  }, [governments, order, selectedGovernmentId, fetchAreas]);

  const handleGovernmentChange = useCallback((governmentId: number, governmentName: string) => {
    setSelectedGovernmentId(governmentId);
    if (onGovernmentSelect) {
      onGovernmentSelect(governmentName);
    }
    fetchAreas(governmentId);
  }, [onGovernmentSelect, fetchAreas]);

  return {
    allowedTransitions,
    workflowStatusDefs,
    orderStatuses,
    paymentStatuses,
    governments,
    areas,
    loadingGovernments,
    loadingAreas,
    selectedGovernmentId,
    setSelectedGovernmentId,
    fetchOrderStatuses,
    fetchPaymentStatuses,
    fetchAllowedTransitions,
    fetchGovernments,
    fetchAreas,
    handleGovernmentChange,
  };
};
