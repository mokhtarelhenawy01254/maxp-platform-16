import { OrderDetailsType } from "../types";

export interface OrderReturnDetails {
  isReturned: boolean;
  isPartial: boolean;
  returnTypeLabel: string;
  reason: string;
  primaryReason: string;
  secondaryReason?: string;
  source?: string;
  returnedAt?: string;
  reportedBy?: string;
  notes?: string;
  trackingNumber?: string;
  carrier?: string;
  turboBranchName?: string;
  turboCaptainName?: string;
  turboCaptainPhone?: string;
  adminNotes?: string;
  customerNotes?: string;
}

export const isReturnStatusCode = (status?: string | null): boolean => {
  if (!status) return false;
  const s = String(status).trim().toUpperCase();
  return (
    RETURN_STATUS_KEYWORDS.includes(s) ||
    s === "RETURNED" ||
    s === "PARTIALLY_RETURNED" ||
    s === "RETURN_REQUESTED" ||
    s === "RETURNED_TO_COMPANY" ||
    s === "RETURN_RECEIVED" ||
    s === "RETURNED_RESENT" ||
    s === "RETURNED_MISSING" ||
    s === "RETURNED_DESTROYED" ||
    s.includes("RETURN") ||
    s.includes("مرتجع")
  );
};

const RETURN_STATUS_KEYWORDS = [
  "RETURNED",
  "PARTIALLY_RETURNED",
  "RETURNED_TO_COMPANY",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "RETURN_REQUESTED",
  "RETURN_IN_PROGRESS",
  "RETURN_COMPLETED",
];

const TURBO_RETURN_CODES = [
  "5",
  "10",
  "11",
  "12",
  "20",
  "returned_to_company",
  "returned_resent",
  "returned_missing",
  "returned_destroyed",
  "returned_received",
  "returned_to_customer",
];

export const isOrderReturned = (order?: OrderDetailsType | any | null): boolean => {
  if (!order) return false;

  const rawStatus = String(order.status || "").trim().toUpperCase();
  const effectiveStatus = String((order as any).effectiveStatus || "").trim().toUpperCase();
  const customStatus = String((order as any).customStatusCode || "").trim().toUpperCase();

  // 1. Direct status checks
  if (RETURN_STATUS_KEYWORDS.includes(rawStatus) || rawStatus.includes("RETURN") || rawStatus.includes("مرتجع")) {
    return true;
  }
  if (effectiveStatus && (RETURN_STATUS_KEYWORDS.includes(effectiveStatus) || effectiveStatus.includes("RETURN") || effectiveStatus.includes("مرتجع"))) {
    return true;
  }
  if (customStatus && (RETURN_STATUS_KEYWORDS.includes(customStatus) || customStatus.includes("RETURN") || customStatus.includes("مرتجع"))) {
    return true;
  }

  // 2. Turbo Shipping Status
  const turboStatus = String(order.turboShipmentStatus || "").trim().toLowerCase();
  if (turboStatus && (TURBO_RETURN_CODES.includes(turboStatus) || turboStatus.includes("return") || turboStatus.includes("مرتجع"))) {
    return true;
  }

  // 3. Direct turboReturnReason exists
  if (typeof order.turboReturnReason === "string" && order.turboReturnReason.trim()) {
    return true;
  }

  // 4. Shipments array
  const shipments = (order as any).shipments;
  if (Array.isArray(shipments) && shipments.length > 0) {
    const hasReturnedShipment = shipments.some((s: any) => {
      const sStatus = String(s?.status || "").toUpperCase();
      return sStatus === "RETURNED" || sStatus === "PARTIALLY_RETURNED" || sStatus.includes("RETURN");
    });
    if (hasReturnedShipment) return true;
  }

  // 5. Active Return Requests
  const returnRequests = (order as any).returnRequests;
  if (Array.isArray(returnRequests) && returnRequests.length > 0) {
    const hasActiveReturn = returnRequests.some((r: any) => {
      const rStatus = String(r?.status || "").toUpperCase();
      return rStatus !== "REJECTED" && rStatus !== "CANCELLED";
    });
    if (hasActiveReturn) return true;
  }

  return false;
};

export const getOrderReturnDetails = (order?: OrderDetailsType | any | null): OrderReturnDetails | null => {
  if (!order || !isOrderReturned(order)) return null;

  const rawStatus = String(order.status || "").trim().toUpperCase();
  const effectiveStatus = String((order as any).effectiveStatus || "").trim().toUpperCase();
  const customStatus = String((order as any).customStatusCode || "").trim().toUpperCase();
  const turboStatus = String(order.turboShipmentStatus || "").trim().toLowerCase();

  const isPartial =
    rawStatus === "PARTIALLY_RETURNED" ||
    rawStatus === "PARTIALLY_REFUNDED" ||
    effectiveStatus === "PARTIALLY_RETURNED" ||
    customStatus === "PARTIALLY_RETURNED";

  // Determine return label
  let returnTypeLabel = isPartial ? "مرتجع جزئي" : "طلب مرتجع";
  if (turboStatus === "returned_to_company" || turboStatus === "5") {
    returnTypeLabel = "مرتجع بالشركة (تربو)";
  } else if (turboStatus === "returned_received" || turboStatus === "20") {
    returnTypeLabel = "مرتجع مستلم بالمخزن";
  } else if (turboStatus === "returned_resent" || turboStatus === "10") {
    returnTypeLabel = "مرتجع معاد إرساله";
  } else if (turboStatus === "returned_missing" || turboStatus === "11") {
    returnTypeLabel = "مرتجع مفقود";
  } else if (turboStatus === "returned_destroyed" || turboStatus === "12") {
    returnTypeLabel = "مرتجع تالف / معدوم";
  } else if (turboStatus === "returned_to_customer") {
    returnTypeLabel = "مرتجع للعميل";
  } else if (rawStatus === "REFUNDED" || effectiveStatus === "REFUNDED") {
    returnTypeLabel = "طلب مسترد / مرتجع";
  }

  // --- Reason Extraction in prioritized order ---
  let reason = "";
  let source = "";
  let returnedAt: string | undefined;
  let reportedBy: string | undefined;

  // 1. Direct turboReturnReason
  if (typeof order.turboReturnReason === "string" && order.turboReturnReason.trim()) {
    reason = order.turboReturnReason.trim();
    source = "شركة الشحن (تربو)";
  }

  // 2. Return requests relation
  const returnRequests = (order as any).returnRequests;
  let reqAdminNotes: string | undefined;
  let reqCustomerNotes: string | undefined;

  if (Array.isArray(returnRequests) && returnRequests.length > 0) {
    const validReq = returnRequests.find((r: any) => String(r?.status || "").toUpperCase() !== "REJECTED") || returnRequests[0];
    if (validReq) {
      reqAdminNotes = validReq.adminNotes?.trim() || undefined;
      reqCustomerNotes = validReq.customerNotes?.trim() || undefined;

      const reqReason =
        validReq.returnReason?.reason ||
        validReq.returnReason?.returnReasonCategory?.name ||
        validReq.customerNotes ||
        validReq.adminNotes ||
        validReq.rejectionReason;

      if (!reason && reqReason && typeof reqReason === "string" && reqReason.trim()) {
        reason = reqReason.trim();
        source = validReq.returnType?.name
          ? `طلب استرجاع (${validReq.returnType.name})`
          : "طلب استرجاع (Return Request)";
      }

      if (!returnedAt && validReq.createdAt) {
        returnedAt = validReq.createdAt;
      }
    }
  }

  // 3. Status History
  if (Array.isArray(order.statusHistory)) {
    const returnHistoryEntry = order.statusHistory.find((entry: any) => {
      const s = String(entry.status || "").trim().toUpperCase();
      return (
        (s === "RETURNED" || s === "PARTIALLY_RETURNED" || s.includes("RETURN") || s.includes("مرتجع")) &&
        typeof entry.reason === "string" &&
        entry.reason.trim()
      );
    });

    if (returnHistoryEntry) {
      if (!reason) {
        reason = returnHistoryEntry.reason!.trim();
        source = returnHistoryEntry.userName
          ? `سجل الحالات (${returnHistoryEntry.userName})`
          : "سجل تغيير الحالات";
      }
      if (!returnedAt) {
        returnedAt = returnHistoryEntry.createdAt;
      }
      if (!reportedBy && returnHistoryEntry.userName) {
        reportedBy = returnHistoryEntry.userName;
      }
    }
  }

  // 4. Secondary reason (e.g. Turbo delay reason or courier exception note)
  const secondaryReason =
    typeof order.turboDelayReason === "string" && order.turboDelayReason.trim()
      ? order.turboDelayReason.trim()
      : undefined;

  if (!reason && secondaryReason) {
    reason = secondaryReason;
    source = "شركة الشحن (ملاحظة التأخير / التعذر)";
  }

  // 5. Notes fallback
  if (!reason && typeof order.notes === "string" && order.notes.trim()) {
    const trimmedNotes = order.notes.trim();
    if (
      trimmedNotes.includes("مرتجع") ||
      trimmedNotes.includes("رفض") ||
      trimmedNotes.includes("لا يرد") ||
      trimmedNotes.includes("مغلق") ||
      trimmedNotes.includes("غير مطابق") ||
      trimmedNotes.includes("تحديث تلقائي")
    ) {
      reason = trimmedNotes;
      source = "ملاحظات الطلب";
    }
  }

  // 6. Metadata fallback
  const meta =
    typeof order.metadata === "string"
      ? (() => {
          try {
            return JSON.parse(order.metadata);
          } catch {
            return {};
          }
        })()
      : order.metadata || {};

  if (!reason && meta) {
    const metaReason = meta.returnReason || meta.return_reason || meta.cancellationReason;
    if (typeof metaReason === "string" && metaReason.trim()) {
      reason = metaReason.trim();
      source = "بيانات الطلب الإضافية";
    }
  }

  if (!returnedAt) {
    returnedAt = order.updatedAt;
  }

  return {
    isReturned: true,
    isPartial,
    returnTypeLabel,
    reason,
    primaryReason: reason,
    secondaryReason: secondaryReason && secondaryReason !== reason ? secondaryReason : undefined,
    source,
    returnedAt,
    reportedBy,
    notes: typeof order.notes === "string" ? order.notes.trim() : undefined,
    trackingNumber: order.trackingNumber || order.turboTrackingNumber || undefined,
    carrier: order.carrierType || (order.turboTrackingNumber ? "TURBO" : undefined),
    turboBranchName: order.turboBranchName || undefined,
    turboCaptainName: order.turboCaptainName || undefined,
    turboCaptainPhone: order.turboCaptainPhone || undefined,
    adminNotes: reqAdminNotes,
    customerNotes: reqCustomerNotes,
  };
};

export const COMMON_RETURN_REASONS = [
  "العميل رفض الاستلام لعدم توفر المبلغ",
  "العميل رفض الاستلام لوجود عيب أو تلف في المنتج",
  "العميل رفض الاستلام لأن المقاس أو اللون غير مطابق",
  "العميل لا يرد على الهاتف / مغلق نهائياً",
  "العميل ألغى الطلب بعد خروج الشحنة للتسليم",
  "تأخر شركة الشحن في موعد التوصيل",
  "عنوان العميل غير صحيح أو خارج نطاق التوصيل",
  "العميل مسافر أو غير متواجد بالمنطقة",
  "العميل طلب معاينة المنتج ورفض الاستلام",
  "الطلب مكرر من العميل واستلم طلباً آخر",
];
