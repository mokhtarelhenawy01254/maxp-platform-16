import { useState, useCallback } from "react";
import { toast } from "sonner";
import { FetchedStatus, Settings } from "../types";
import tokenManager from "../../../utils/tokenManager";

const STATUS_TYPE_LABELS: Record<string, { label: string; name: string }> = {
  order: { label: "طلب", name: "حالات الطلبات" },
  payment: { label: "دفع", name: "حالات الدفع" },
  shipping: { label: "شحن", name: "حالات الشحن" },
  preparation: { label: "تجهيز", name: "حالات التجهيز" },
};

export const useWooCommerceStatus = (
  settings: Settings | null,
  settingsForm: any,
  setSettingsForm: React.Dispatch<React.SetStateAction<any>>,
) => {
  const [wooStatuses, setWooStatuses] = useState<FetchedStatus[]>([]);
  const [fetchingStatuses, setFetchingStatuses] = useState(false);
  const [statusSearch, setStatusSearch] = useState("");

  const [localStatuses, setLocalStatuses] = useState<
    { value: string; label: string; color?: string }[]
  >([
    { value: "PENDING", label: "معلق (Pending)", color: "#F59E0B" },
    { value: "CONFIRMED", label: "مؤكد (Confirmed)", color: "#3B82F6" },
    { value: "PROCESSING", label: "قيد التجهيز (Processing)", color: "#8B5CF6" },
    { value: "SHIPPED", label: "تم الشحن (Shipped)", color: "#06B6D4" },
    { value: "DELIVERED", label: "تم التوصيل (Delivered)", color: "#10B981" },
    { value: "CANCELLED", label: "ملغي (Cancelled)", color: "#EF4444" },
    { value: "REFUNDED", label: "مسترجع (Refunded)", color: "#6B7280" },
  ]);

  const [localStatusesByType, setLocalStatusesByType] = useState<
    Record<string, { value: string; label: string; color?: string }[]>
  >({
    order: [],
    payment: [],
    shipping: [],
    preparation: [],
  });

  const [statusColors, setStatusColors] = useState<Record<string, string>>({});
  const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
    tokenManager.createAuthHeaders(additionalHeaders);

  const defaultStatusMapping = {
    pending: "PENDING",
    processing: "PROCESSING",
    "on-hold": "PENDING",
    completed: "DELIVERED",
    cancelled: "CANCELLED",
    refunded: "CANCELLED",
    failed: "CANCELLED",
    trash: "CANCELLED",
  };

  const fetchLocalStatuses = useCallback(async () => {
    try {
      const types = ["order", "payment", "shipping", "preparation"];
      const responses = await Promise.all(
        types.map((type) =>
          fetch(`/api/v1/order-status?type=${type}`, {
            headers: getAuthHeaders(),
          }).then((res) => res.json()),
        ),
      );

      const allLocalStatuses: { value: string; label: string; color?: string }[] = [];
      const grouped: Record<string, { value: string; label: string; color?: string }[]> = {
        order: [],
        payment: [],
        shipping: [],
        preparation: [],
      };
      const colors: Record<string, string> = {};
      const seenCodes = new Set<string>();

      responses.forEach((res, index) => {
        if (res.success && res.data) {
          const type = types[index];
          if (!type) return;
          const typeInfo = STATUS_TYPE_LABELS[type];
          if (!typeInfo) return;

          res.data.forEach((s: any) => {
            const code = s.code;
            const item = {
              value: code,
              label: `${s.name} (${s.nameEn || code})`,
              color: s.color || undefined,
            };

            grouped[type]?.push(item);

            if (code && s.color && !colors[code]) {
              colors[code] = s.color;
            }

            if (!seenCodes.has(code)) {
              seenCodes.add(code);
              allLocalStatuses.push(item);
            }
          });
        }
      });

      if (allLocalStatuses.length > 0) {
        setLocalStatuses(allLocalStatuses);
      }
      setLocalStatusesByType(grouped);
      setStatusColors(colors);
    } catch (error) {
      console.error("Error fetching local statuses:", error);
    }
  }, []);

  const fetchWooStatuses = async () => {
    if (!settings?.hasCredentials) {
      toast.error("يرجى إعداد بيانات الاتصال أولاً");
      return;
    }

    setFetchingStatuses(true);
    try {
      const query = settings?.id
        ? `?id=${encodeURIComponent(settings.id)}`
        : "";
      const response = await fetch(`/api/v1/woocommerce/orders/statuses${query}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setWooStatuses(data.data);
        toast.success(`تم جلب ${data.data.length} حالة من المتجر`);
      } else {
        toast.error("فشل جلب الحالات");
      }
    } catch (error) {
      toast.error("خطأ في الاتصال");
    } finally {
      setFetchingStatuses(false);
    }
  };

  const autoMapStatuses = () => {
    const newMapping = { ...settingsForm.statusMapping };

    wooStatuses.forEach((status) => {
      if (!newMapping[status.slug]) {
        const lowerName = (status.name || "").toLowerCase();
        const lowerSlug = status.slug.toLowerCase();

        if (
          lowerName.includes("complet") ||
          lowerName.includes("deliver") ||
          lowerName.includes("success") ||
          lowerSlug.includes("complet") ||
          lowerSlug.includes("deliver") ||
          lowerSlug.includes("success")
        ) {
          newMapping[status.slug] = "DELIVERED";
        } else if (
          lowerName.includes("process") ||
          lowerName.includes("confirm") ||
          lowerName.includes("prepar") ||
          lowerSlug.includes("process") ||
          lowerSlug.includes("confirm") ||
          lowerSlug.includes("prepar")
        ) {
          newMapping[status.slug] = "PROCESSING";
        } else if (
          lowerName.includes("cancel") ||
          lowerName.includes("refund") ||
          lowerName.includes("reject") ||
          lowerSlug.includes("cancel") ||
          lowerSlug.includes("refund") ||
          lowerSlug.includes("reject")
        ) {
          newMapping[status.slug] = "CANCELLED";
        } else if (
          lowerName.includes("hold") ||
          lowerName.includes("wait") ||
          lowerName.includes("pend") ||
          lowerSlug.includes("hold") ||
          lowerSlug.includes("wait") ||
          lowerSlug.includes("pend")
        ) {
          newMapping[status.slug] = "PENDING";
        } else if (
          lowerName.includes("ship") ||
          lowerName.includes("dispatch") ||
          lowerName.includes("rout") ||
          lowerSlug.includes("ship") ||
          lowerSlug.includes("dispatch") ||
          lowerSlug.includes("rout")
        ) {
          newMapping[status.slug] = "SHIPPED";
        }
      }
    });

    setSettingsForm((prev: any) => ({ ...prev, statusMapping: newMapping }));
    toast.success("🤖 تمت محاولة الربط التلقائي بنجاح");
  };

  return {
    wooStatuses,
    fetchingStatuses,
    localStatuses,
    localStatusesByType,
    statusColors,
    statusSearch,
    setStatusSearch,
    fetchLocalStatuses,
    fetchWooStatuses,
    autoMapStatuses,
    defaultStatusMapping,
  };
};