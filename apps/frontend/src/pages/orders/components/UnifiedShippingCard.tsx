/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  TruckIcon,
  ArrowPathIcon,
  PrinterIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  PhoneIcon,
  UserIcon,
  ChatBubbleBottomCenterTextIcon,
  BoltIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../../services/apiClient";
import tokenManager from "../../../utils/tokenManager";
import { useCurrency } from "../../../hooks/useCurrency";

interface ShippingCompany {
  id: string;
  name: string;
  slug?: string;
  providerKey?: string;
  integrationMode?: string;
  isActive: boolean;
  settings?: any;
}

interface UnifiedShippingCardProps {
  order: any;
  onOrderUpdated?: () => void;
  canManageShipments?: boolean;
  onOpenTicket?: () => void;
}

const UnifiedShippingCard: React.FC<UnifiedShippingCardProps> = ({
  order,
  onOrderUpdated,
  canManageShipments = true,
  onOpenTicket,
}) => {
  const { formatPrice } = useCurrency();

  const [companies, setCompanies] = useState<ShippingCompany[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [courierMode, setCourierMode] = useState<"turbo" | "qp" | "bosta" | "custom" | "manual">("manual");
  const [isManualCourier, setIsManualCourier] = useState(false);
  const [manualTracking, setManualTracking] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [qpNotes, setQpNotes] = useState("المعاينة في وجود المندوب ولا يوجد استرجاع إلا في حالة عيوب الصناعة");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Extract shipment if already linked
  const shipment = order?.shipment || (Array.isArray(order?.shipments) && order.shipments[0]) || null;
  const existingTracking =
    shipment?.trackingNumber ||
    order?.trackingNumber ||
    order?.turboTrackingNumber ||
    order?.metadata?.trackingNumber ||
    null;

  const shipmentMeta = React.useMemo(() => {
    const meta = shipment?.metadata || order?.metadata;
    if (!meta) return {};
    if (typeof meta === "object") return meta;
    try {
      return JSON.parse(meta);
    } catch {
      return {};
    }
  }, [shipment?.metadata, order?.metadata]);

  const liveStatus = shipmentMeta?.liveStatus || shipmentMeta?.qpExpress || null;

  const shippingAutoError = React.useMemo(() => {
    if (shipmentMeta?.shippingAutoError) {
      return shipmentMeta.shippingAutoError;
    }
    // Fallback: detect structured warning from order.notes if present
    const notesStr = String(order?.notes || "");
    if (
      notesStr.includes("فشل إنشاء شحنة تربو تلقائياً") ||
      notesStr.includes("تعذر إنشاء شحنة تربو تلقائياً") ||
      notesStr.includes("تم تخطي الشحن التلقائي لتربو")
    ) {
      const isDataErr = /بيانات العميل|بيانات الشحن|هاتف|phone|محافظة|governorate|عنوان/i.test(notesStr);
      const match = notesStr.match(/\[(فشل إنشاء شحنة تربو تلقائياً|تعذر إنشاء شحنة تربو تلقائياً|تم تخطي الشحن التلقائي لتربو)[^\]]*\]/);
      const rawText = match ? match[0].replace(/[\[\]]/g, "") : notesStr;
      return {
        category: isDataErr ? ("DATA_ERROR" as const) : ("SYSTEM_ERROR" as const),
        code: isDataErr ? "DATA_VALIDATION_ERROR" : "SYSTEM_INTEGRATION_ERROR",
        message: rawText,
        actionHint: isDataErr
          ? "يرجى مراجعة وتعديل بيانات العميل (الهاتف، العنوان، أو المحافظة) من تفاصيل الطلب ثم إعادة المحاولة"
          : "يرجى مراجعة إعدادات الربط ومفتاح الـ API لشركة الشحن",
        provider: "TURBO",
      };
    }
    return null;
  }, [shipmentMeta?.shippingAutoError, order?.notes]);

  const isQpExpress =
    shipment?.carrierType === "QP_EXPRESS" ||
    order?.shippingCarrier === "QP_EXPRESS" ||
    order?.carrierType === "QP_EXPRESS" ||
    shipmentMeta?.shippingCarrier === "QP_EXPRESS" ||
    shipmentMeta?.carrier === "QP_EXPRESS" ||
    Boolean(shipmentMeta?.qpExpress) ||
    Boolean(shipmentMeta?.orderSerial) ||
    Boolean(shipment?.shippingCompany?.providerKey === "QP_EXPRESS") ||
    shipment?.shippingCompany?.name?.toLowerCase().includes("qp") ||
    shipment?.shippingCompany?.name?.includes("كيو بي") ||
    order?.shippingCompany?.name?.toLowerCase().includes("qp") ||
    order?.shippingCompany?.name?.includes("كيو بي");

  const isBosta =
    shipment?.carrierType === "BOSTA" ||
    order?.shippingCarrier === "BOSTA" ||
    order?.carrierType === "BOSTA" ||
    shipmentMeta?.shippingCarrier === "BOSTA" ||
    shipmentMeta?.carrier === "BOSTA" ||
    Boolean(shipmentMeta?.bostaDeliveryId || (shipment?.carrierType === "BOSTA" && shipment?.externalShipmentId)) ||
    Boolean(shipment?.shippingCompany?.providerKey === "BOSTA") ||
    shipment?.shippingCompany?.name?.toLowerCase().includes("bosta") ||
    shipment?.shippingCompany?.name?.includes("بوستا") ||
    order?.shippingCompany?.name?.toLowerCase().includes("bosta") ||
    order?.shippingCompany?.name?.includes("بوستا");

  const isTurbo =
    order?.carrierType === "TURBO" ||
    shipment?.carrierType === "TURBO" ||
    shipmentMeta?.carrier === "TURBO" ||
    Boolean(order?.turboTrackingNumber || order?.turboShipmentId);

  const existingCarrierName =
    shipment?.shippingCompany?.name ||
    order?.shippingCompany?.name ||
    (isQpExpress ? "كيو بي إكسبريس (QP Express)" : null) ||
    (isBosta ? "بوسطة (Bosta)" : null) ||
    (isTurbo ? "تربو (Turbo)" : null) ||
    (order?.carrierType && order.carrierType !== "MANUAL" ? order.carrierType : null) ||
    (shipment?.carrierType && shipment.carrierType !== "MANUAL" ? shipment.carrierType : null) ||
    "شركة الشحن";

  const qpCompany = companies.find(
    (c) => c.providerKey === "QP_EXPRESS" || c.name?.toLowerCase().includes("qp") || c.name?.includes("كيو بي")
  );
  const bostaCompany = companies.find(
    (c) => c.providerKey === "BOSTA" || c.name?.toLowerCase().includes("bosta") || c.name?.includes("بوستا")
  );
  const turboCompany = companies.find(
    (c) => c.providerKey === "TURBO" || c.slug === "turbo" || c.name?.toLowerCase().includes("turbo") || c.name?.includes("تربو")
  );
  const customCompanies = companies.filter(
    (c) => c !== qpCompany && c !== bostaCompany && c !== turboCompany
  );

  const qpSettings = React.useMemo(() => {
    if (!qpCompany?.settings) return {};
    if (typeof qpCompany.settings === "object") return qpCompany.settings;
    try {
      return JSON.parse(qpCompany.settings);
    } catch {
      return {};
    }
  }, [qpCompany?.settings]);

  const shipmentStatus =
    liveStatus?.statusLabel ||
    shipment?.status ||
    order?.shipmentStatus ||
    order?.turboShipmentStatus ||
    "PENDING";

  useEffect(() => {
    let cancelled = false;
    const fetchCompanies = async () => {
      setLoadingCompanies(true);
      try {
        let activeOnes: ShippingCompany[] = [];
        try {
          const res: any = await apiClient.get("/shipping-companies/active-carriers");
          if (res.data?.success && Array.isArray(res.data.data)) {
            activeOnes = res.data.data;
          }
        } catch {
          const fallbackRes: any = await apiClient.get("/shipping-companies?status=active&all=true");
          if (fallbackRes.data?.success && Array.isArray(fallbackRes.data.data)) {
            activeOnes = fallbackRes.data.data.filter((c: ShippingCompany) => c.isActive);
          }
        }

        if (cancelled) return;
        setCompanies(activeOnes);

        if (activeOnes.length > 0) {
          setSelectedCompanyId(activeOnes[0].id);
          const hasTurbo = activeOnes.some((c) => c.providerKey === "TURBO" || c.slug === "turbo" || c.name?.toLowerCase().includes("turbo") || c.name?.includes("تربو"));
          const hasQp = activeOnes.some((c) => c.providerKey === "QP_EXPRESS" || c.name?.toLowerCase().includes("qp") || c.name?.includes("كيو بي"));
          const hasBosta = activeOnes.some((c) => c.providerKey === "BOSTA" || c.name?.toLowerCase().includes("bosta") || c.name?.includes("بوستا"));

          if (hasTurbo) {
            setCourierMode("turbo");
            setIsManualCourier(false);
          } else if (hasQp) {
            setCourierMode("qp");
            setIsManualCourier(false);
          } else if (hasBosta) {
            setCourierMode("bosta");
            setIsManualCourier(false);
          } else {
            setCourierMode("custom");
            setIsManualCourier(false);
          }
        } else {
          setCourierMode("manual");
          setIsManualCourier(true);
        }
      } catch (err) {
        console.error("Error fetching shipping companies:", err);
      } finally {
        if (!cancelled) setLoadingCompanies(false);
      }
    };
    fetchCompanies();
    return () => {
      cancelled = true;
    };
  }, []);

  // Dispatch via Turbo directly
  const handleTurboDirectShipment = async () => {
    if (!canManageShipments) {
      toast.error("ليس لديك صلاحية إدارة الشحن");
      return;
    }

    setLoading(true);
    try {
      const orderIdentifier = order?.orderNumber || order?.id;
      const res: any = await apiClient.post(`/turbo/orders/${orderIdentifier}/shipment`);

      if (res.data?.success) {
        toast.success(res.data.message || "تم إنشاء بوليصة الشحن بنجاح لدى Turbo");
        if (onOrderUpdated) onOrderUpdated();
      } else {
        toast.error(res.data?.error || "تعذر إنشاء الشحنة مع Turbo");
      }
    } catch (err: any) {
      console.error("Turbo dispatch error:", err);
      toast.error(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "حدث خطأ أثناء الشحن عبر Turbo"
      );
    } finally {
      setLoading(false);
    }
  };

  const copyTracking = () => {
    if (existingTracking) {
      navigator.clipboard.writeText(existingTracking);
      toast.success("تم نسخ رقم التتبع");
    }
  };

  // Dispatch via QP Express directly
  const handleQpExpressDirectShipment = async () => {
    if (!canManageShipments) {
      toast.error("ليس لديك صلاحية إدارة الشحن");
      return;
    }

    setLoading(true);
    try {
      const res: any = await apiClient.post(`/qp-express/orders/${order.id}/shipment`, {
        notes: qpNotes || "المعاينة في وجود المندوب ولا يوجد استرجاع إلا في حالة عيوب الصناعة",
      });

      if (res.data?.success) {
        toast.success(res.data.message || "تم إنشاء بوليصة الشحن بنجاح لدى QP Express");
        if (onOrderUpdated) onOrderUpdated();
      } else {
        toast.error(res.data?.error || "تعذر إنشاء الشحنة مع QP Express");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "حدث خطأ أثناء الشحن عبر QP Express");
    } finally {
      setLoading(false);
    }
  };

  // Dispatch via Bosta directly
  const handleBostaDirectShipment = async () => {
    if (!canManageShipments) {
      toast.error("ليس لديك صلاحية إدارة الشحن");
      return;
    }

    setLoading(true);
    try {
      const res: any = await apiClient.post(`/bosta/orders/${order.id}/shipment`);

      if (res.data?.success) {
        toast.success(res.data.message || "تم إنشاء بوليصة الشحن بنجاح لدى Bosta");
        if (onOrderUpdated) onOrderUpdated();
      } else {
        toast.error(res.data?.error || "تعذر إنشاء الشحنة مع Bosta");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "حدث خطأ أثناء الشحن عبر Bosta");
    } finally {
      setLoading(false);
    }
  };

  // Print Bosta AWB
  const handlePrintBostaAWB = async () => {
    const deliveryId =
      shipmentMeta?.bostaDeliveryId ||
      shipment?.externalShipmentId ||
      existingTracking;
    if (!deliveryId) {
      toast.error("لا يوجد رقم تسليم لطباعة بوليصة بوستا");
      return;
    }

    try {
      const res: any = await apiClient.get(`/bosta/awb/${deliveryId}`);
      const awbData = res.data?.data?.data || res.data?.data;
      if (typeof awbData === "string" && awbData.length > 50) {
        const byteCharacters = atob(awbData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
      } else if (res.data?.data?.url) {
        window.open(res.data.data.url, "_blank");
      } else {
        toast.error("تعذر جلب ملف بوليصة بوستا");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "تعذر طباعة بوليصة بوستا");
    }
  };

  // Dispatch / Create Shipment via Registered Carrier
  const handleCreateShipment = async () => {
    if (!canManageShipments) {
      toast.error("ليس لديك صلاحية إدارة الشحن");
      return;
    }

    setLoading(true);
    try {
      const res: any = await apiClient.post("/shipments/create", {
        orderId: order.id,
        shippingCompanyId: isManualCourier ? null : selectedCompanyId || null,
        trackingNumber: isManualCourier ? manualTracking : undefined,
        manualDeliveryNotes: manualNotes || undefined,
      });

      if (res.data?.success) {
        toast.success(res.data.message || "تم إنشاء الشحنة بنجاح");
        if (onOrderUpdated) onOrderUpdated();
      } else {
        toast.error(res.data?.error || "تعذر إنشاء الشحنة");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "حدث خطأ أثناء إنشاء الشحنة");
    } finally {
      setLoading(false);
    }
  };

  // Sync Live Status
  const handleSyncStatus = async () => {
    setSyncing(true);
    try {
      if (isBosta && existingTracking) {
        const res: any = await apiClient.get(`/bosta/track/${existingTracking}`);
        if (res.data?.success) {
          toast.success("تمت مزامنة حالة شحنة بوستا بنجاح");
          if (onOrderUpdated) onOrderUpdated();
          return;
        }
      }
      if (shipment?.id) {
        const res: any = await apiClient.post(`/shipments/${shipment.id}/sync`);
        if (res.data?.success) {
          toast.success(res.data.message || "تمت مزامنة حالة الشحنة بنجاح");
          if (onOrderUpdated) onOrderUpdated();
          return;
        } else {
          toast.error(res.data?.error || "فشلت المزامنة");
        }
      } else if (isQpExpress && existingTracking) {
        const res: any = await apiClient.get(`/qp-express/track/${existingTracking}`);
        if (res.data?.success) {
          toast.success("تمت مزامنة حالة شحنة QP Express بنجاح");
          if (onOrderUpdated) onOrderUpdated();
          return;
        } else {
          toast.error(res.data?.error || "تعذر مزامنة الشحنة");
        }
      } else if (order?.turboTrackingNumber) {
        const res: any = await apiClient.post(`/turbo/sync-status/${order.id}`);
        if (res.data?.success) {
          toast.success("تمت مزامنة حالة شحنة تربو");
          if (onOrderUpdated) onOrderUpdated();
          return;
        }
      }
      toast.error("لا توجد شحنة مسجلة للمزامنة");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "تعذر مزامنة الشحنة");
    } finally {
      setSyncing(false);
    }
  };

  // Cancel Shipment
  const handleCancelShipment = async () => {
    setCancelling(true);
    try {
      if (isBosta) {
        const deliveryId =
          shipmentMeta?.bostaDeliveryId ||
          shipment?.externalShipmentId ||
          existingTracking;
        if (deliveryId) {
          const res: any = await apiClient.post(`/bosta/cancel/${deliveryId}`);
          if (res.data?.success) {
            toast.success("تم إلغاء شحنة بوستا بنجاح");
            setShowCancelModal(false);
            if (onOrderUpdated) onOrderUpdated();
            return;
          }
        }
      }
      if (shipment?.id) {
        const res: any = await apiClient.post(`/shipments/${shipment.id}/cancel`, {
          reason: cancelReason,
        });
        if (res.data?.success) {
          toast.success("تم إلغاء الشحنة بنجاح");
          setShowCancelModal(false);
          if (onOrderUpdated) onOrderUpdated();
          return;
        }
      } else if (order?.turboTrackingNumber) {
        const res: any = await apiClient.post(`/turbo/cancel-shipment/${order.id}`, {
          reason: cancelReason,
        });
        if (res.data?.success) {
          toast.success("تم إلغاء شحنة تربو بنجاح");
          setShowCancelModal(false);
          if (onOrderUpdated) onOrderUpdated();
          return;
        }
      }
      toast.error("تعذر إلغاء الشحنة");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل إلغاء الشحنة");
    } finally {
      setCancelling(false);
    }
  };

  // Re-send / Update Shipment Data with Courier
  const [resending, setResending] = useState(false);
  const handleResendShipment = async () => {
    if (!canManageShipments) {
      toast.error("ليس لديك صلاحية إدارة الشحن");
      return;
    }

    setResending(true);
    try {
      const isTurbo =
        existingCarrierName?.toLowerCase().includes("turbo") ||
        Boolean(order?.turboTrackingNumber || order?.turboShipmentId);

      if (isTurbo) {
        const orderIdentifier = order?.orderNumber || order?.id;
        let success = false;
        let successMessage = "";

        // First attempt: Update existing shipment in Turbo (PUT /api/turbo/orders/:orderId/shipment)
        try {
          const updateRes: any = await apiClient.put(`/turbo/orders/${orderIdentifier}/shipment`);
          if (updateRes.data?.success) {
            success = true;
            successMessage = updateRes.data.message || "تم تحديث وإعادة إرسال بيانات الشحنة لتربو بنجاح";
          }
        } catch (updateErr: any) {
          // If update fails (e.g. shipment was cancelled or needs recreation), try recreate (POST with replaceExisting: true)
          const createRes: any = await apiClient.post(`/turbo/orders/${orderIdentifier}/shipment`, {
            replaceExisting: true,
          });
          if (createRes.data?.success) {
            success = true;
            successMessage = "تم إنشاء وإعادة إرسال الشحنة لتربو بنجاح";
          } else {
            throw new Error(createRes.data?.error || "فشل إعادة إرسال الشحنة");
          }
        }

        if (success) {
          toast.success(successMessage);
          if (onOrderUpdated) onOrderUpdated();
          return;
        }
      } else if (isQpExpress) {
        const res: any = await apiClient.post(`/qp-express/orders/${order.id}/shipment`, {
          notes: qpNotes || "المعاينة في وجود المندوب ولا يوجد استرجاع إلا في حالة عيوب الصناعة",
        });
        if (res.data?.success) {
          toast.success(res.data.message || "تم إنشاء وتوجيه بوليصة الشحن بنجاح لـ QP Express");
          if (onOrderUpdated) onOrderUpdated();
          return;
        } else {
          throw new Error(res.data?.error || "تعذر إعادة إرسال الشحنة لـ QP Express");
        }
      } else if (isBosta) {
        const res: any = await apiClient.post(`/bosta/orders/${order.id}/shipment`);
        if (res.data?.success) {
          toast.success(res.data.message || "تم إنشاء وتوجيه الشحنة لـ Bosta بنجاح");
          if (onOrderUpdated) onOrderUpdated();
          return;
        } else {
          throw new Error(res.data?.error || "تعذر إعادة إرسال الشحنة لـ Bosta");
        }
      } else if (shipment?.id) {
        const res: any = await apiClient.post(`/shipments/${shipment.id}/sync`);
        if (res.data?.success) {
          toast.success(res.data.message || "تم تحديث ومزامنة بيانات الشحنة بنجاح");
          if (onOrderUpdated) onOrderUpdated();
          return;
        }
      }

      toast.error("تعذر إعادة إرسال بيانات الشحنة");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "فشل إعادة إرسال بيانات الشحنة"
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <TruckIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
              إدارة الشحن والتوصيل
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ربط ومتابعة شحنة الطلب مع أي شركة شحن أو مندوب
            </p>
          </div>
        </div>

        {existingTracking && (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              String(shipmentStatus).toLowerCase().includes("return") ||
              String(shipmentStatus).includes("مرتجع") ||
              order?.turboShipmentStatus === "returned_to_company" ||
              order?.turboShipmentStatus === "5"
                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                : String(shipmentStatus).toLowerCase().includes("deliver") ||
                  String(shipmentStatus).includes("تسليم")
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
            }`}
          >
            {shipmentStatus}
          </span>
        )}
      </div>

      {/* Case 1: Order already has a shipment */}
      {existingTracking ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 dark:bg-gray-900/60 rounded-lg border border-gray-100 dark:border-gray-700/60">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">شركة الشحن</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {existingCarrierName}
                </p>
                {isQpExpress && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                    QP API
                  </span>
                )}
                {isBosta && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                    Bosta API
                  </span>
                )}
                {isTurbo && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    Turbo API
                  </span>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">رقم التتبع (AWB)</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {existingTracking}
                </span>
                <button
                  type="button"
                  onClick={copyTracking}
                  className="text-gray-400 hover:text-gray-600 p-0.5"
                  title="نسخ"
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">قيمة التحصيل (COD)</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                {formatPrice(order?.total || 0)}
              </p>
            </div>
          </div>

          {/* Return & Delay Reasons from Carrier */}
          {(order?.turboReturnReason || order?.turboDelayReason || shipmentMeta?.returnReason) && (
            <div className="p-3 rounded-lg bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs space-y-1.5">
              {order?.turboReturnReason && (
                <div className="flex items-start gap-2">
                  <span className="font-bold text-rose-800 dark:text-rose-200 shrink-0">سبب المرتجع:</span>
                  <span className="text-rose-950 dark:text-rose-100 font-semibold">{order.turboReturnReason}</span>
                </div>
              )}
              {order?.turboDelayReason && (
                <div className="flex items-start gap-2 pt-1 border-t border-rose-200/60 dark:border-rose-900/30">
                  <span className="font-medium text-rose-700 dark:text-rose-300 shrink-0">ملاحظة التأخير:</span>
                  <span className="text-gray-800 dark:text-gray-200">{order.turboDelayReason}</span>
                </div>
              )}
              {shipmentMeta?.returnReason && shipmentMeta.returnReason !== order?.turboReturnReason && (
                <div className="flex items-start gap-2 pt-1 border-t border-rose-200/60 dark:border-rose-900/30">
                  <span className="font-medium text-rose-700 dark:text-rose-300 shrink-0">سبب الاسترجاع:</span>
                  <span className="text-gray-800 dark:text-gray-200">{shipmentMeta.returnReason}</span>
                </div>
              )}
            </div>
          )}

          {/* Driver & Delivery Field Details (QP Express / Integrated Couriers) */}
          {(liveStatus?.driverName || liveStatus?.driverPhone || liveStatus?.statusNote) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
              {liveStatus.driverName && (
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="text-xs truncate">
                    <span className="text-gray-500 dark:text-gray-400">المندوب: </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {liveStatus.driverName}
                    </span>
                  </div>
                </div>
              )}

              {liveStatus.driverPhone && (
                <div className="flex items-center gap-2">
                  <PhoneIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="text-xs">
                    <span className="text-gray-500 dark:text-gray-400">هاتف المندوب: </span>
                    <a
                      href={`tel:${liveStatus.driverPhone}`}
                      className="font-mono font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      {liveStatus.driverPhone}
                    </a>
                  </div>
                </div>
              )}

              {liveStatus.statusNote && (
                <div className="sm:col-span-2 flex items-start gap-2 pt-1 border-t border-blue-100/60 dark:border-blue-900/30">
                  <ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-semibold text-amber-800 dark:text-amber-300">
                      ملاحظة المندوب الميدانية:{" "}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {liveStatus.statusNote}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons for active shipment */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleResendShipment}
              disabled={resending || syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition disabled:opacity-50"
              title="إعادة إرسال وتحديث بيانات الشحنة والعنوان لشركة الشحن"
            >
              <PaperAirplaneIcon className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} />
              <span>{resending ? "جاري الإرسال..." : "إعادة إرسال الشحنة"}</span>
            </button>

            <button
              type="button"
              onClick={handleSyncStatus}
              disabled={syncing || resending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span>مزامنة الحالة اللحظية</span>
            </button>

            {onOpenTicket && (
              <button
                type="button"
                onClick={onOpenTicket}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 transition shadow-xs active:scale-97"
                title="فتح تذكرة دعم بخصوص هذه الشحنة في مركز التذاكر"
              >
                <TicketIcon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>فتح تذكرة شحن</span>
              </button>
            )}

            {isQpExpress && (
              <a
                href="https://qpxpress.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 text-indigo-500" />
                <span>بوابة QP Express</span>
              </a>
            )}

            {isBosta && (
              <a
                href="https://business.bosta.co"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 text-orange-500" />
                <span>بوابة بوستا Bosta</span>
              </a>
            )}

            {shipment?.labelUrl && (
              <a
                href={shipment.labelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition"
              >
                <PrinterIcon className="h-3.5 w-3.5" />
                <span>طباعة البوليصة AWB</span>
              </a>
            )}

            {isBosta && (
              <button
                type="button"
                onClick={handlePrintBostaAWB}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-50 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-800 hover:bg-orange-100 transition shadow-sm"
                title="طباعة بوليصة شحن بوستا AWB"
              >
                <PrinterIcon className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                <span>طباعة بوليصة بوستا AWB</span>
              </button>
            )}

            {isQpExpress && existingTracking && (
              <button
                type="button"
                onClick={() => {
                  const token = tokenManager.getAccessToken();
                  const printUrl = `/api/v1/qp-express/waybill/${existingTracking}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
                  const w = window.open(printUrl, "_blank", "width=450,height=400");
                  if (w) w.focus();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 transition shadow-sm"
                title="طباعة ستيكر حراري (80×50 مم) مع الباركود"
              >
                <PrinterIcon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>طباعة ستيكر QP (80×50 مم)</span>
              </button>
            )}

            {isTurbo && (order?.turboTrackingNumber || order?.turboShipmentId || shipment?.trackingNumber) && (
              <a
                href={`/api/v1/turbo/orders/${order.orderNumber || order.id}/waybill`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 hover:bg-blue-100 transition shadow-sm"
                title="طباعة بوليصة شحن تربو الرسمية"
              >
                <PrinterIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>طباعة بوليصة تربو AWB</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 border border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30 transition"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
              <span>إلغاء الشحنة</span>
            </button>
          </div>
        </div>
      ) : (
        /* Case 2: Order NOT shipped yet - Select courier and dispatch */
        <div className="space-y-4">
          {/* 🚚 Auto-Create Shipping Error Banner (DATA_ERROR vs SYSTEM_ERROR) */}
          {shippingAutoError && (
            <div
              className={`p-4 rounded-xl border shadow-xs transition-all ${
                shippingAutoError.category === "DATA_ERROR"
                  ? "border-amber-300 bg-amber-50/90 dark:border-amber-700/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100"
                  : "border-rose-300 bg-rose-50/90 dark:border-rose-700/60 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    shippingAutoError.category === "DATA_ERROR"
                      ? "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300"
                      : "bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {shippingAutoError.category === "DATA_ERROR" ? (
                    <ExclamationTriangleIcon className="h-5 w-5" />
                  ) : (
                    <ExclamationCircleIcon className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                        shippingAutoError.category === "DATA_ERROR"
                          ? "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100"
                          : "bg-rose-200 text-rose-900 dark:bg-rose-800 dark:text-rose-100"
                      }`}
                    >
                      {shippingAutoError.category === "DATA_ERROR"
                        ? "تنبيه بيانات العميل (Customer Data Issue)"
                        : "تنبيه نظام وربط الشحن (Carrier / Integration Issue)"}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        shippingAutoError.category === "DATA_ERROR"
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      تعذر توليد كود الشحن التلقائي
                    </span>
                  </div>

                  <p
                    className={`text-sm font-semibold ${
                      shippingAutoError.category === "DATA_ERROR"
                        ? "text-amber-950 dark:text-amber-50"
                        : "text-rose-950 dark:text-rose-50"
                    }`}
                  >
                    {shippingAutoError.message}
                  </p>

                  {shippingAutoError.actionHint && (
                    <p
                      className={`text-xs ${
                        shippingAutoError.category === "DATA_ERROR"
                          ? "text-amber-800 dark:text-amber-200/90"
                          : "text-rose-800 dark:text-rose-200/90"
                      }`}
                    >
                      {shippingAutoError.actionHint}
                    </p>
                  )}
                </div>

                {shippingAutoError.category === "SYSTEM_ERROR" && (
                  <Link
                    to="/shipping-companies"
                    className="px-2.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition shrink-0 self-center shadow-xs"
                  >
                    إعدادات الشحن
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* If no integrated carriers are active, show alert banner */}
          {companies.length === 0 && !loadingCompanies && (
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200">
                    لا توجد شركات شحن مفعلة حالياً
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    يمكنك تفعيل شركات الشحن (تربو، كيو بي إكسبريس، بوستا) وإدخال بيانات الربط للبدء في الشحن الآلي.
                  </p>
                </div>
              </div>
              <Link
                to="/shipping-companies"
                className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition shrink-0"
              >
                تفعيل شركات الشحن
              </Link>
            </div>
          )}

          {/* Active Carriers Tabs (Only Active Providers are Shown) */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs font-medium">
            {turboCompany && (
              <button
                type="button"
                onClick={() => {
                  setCourierMode("turbo");
                  setIsManualCourier(false);
                }}
                className={`py-2 px-3.5 rounded-md transition flex items-center justify-center gap-1.5 ${
                  courierMode === "turbo"
                    ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-bold shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                <TruckIcon className="h-3.5 w-3.5 text-blue-500" />
                <span>تربو (Turbo)</span>
              </button>
            )}

            {qpCompany && (
              <button
                type="button"
                onClick={() => {
                  setCourierMode("qp");
                  setIsManualCourier(false);
                }}
                className={`py-2 px-3.5 rounded-md transition flex items-center justify-center gap-1.5 ${
                  courierMode === "qp"
                    ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                <BoltIcon className="h-3.5 w-3.5 text-amber-500" />
                <span>كيو بي (QP Express)</span>
              </button>
            )}

            {bostaCompany && (
              <button
                type="button"
                onClick={() => {
                  setCourierMode("bosta");
                  setIsManualCourier(false);
                }}
                className={`py-2 px-3.5 rounded-md transition flex items-center justify-center gap-1.5 ${
                  courierMode === "bosta"
                    ? "bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 font-bold shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                <TruckIcon className="h-3.5 w-3.5 text-orange-500" />
                <span>بوستا (Bosta)</span>
              </button>
            )}

            {customCompanies.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCourierMode("custom");
                  setIsManualCourier(false);
                }}
                className={`py-2 px-3.5 rounded-md transition flex items-center justify-center gap-1.5 ${
                  courierMode === "custom"
                    ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                <TruckIcon className="h-3.5 w-3.5" />
                <span>الشركات المفعلة الأخرى</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setCourierMode("manual");
                setIsManualCourier(true);
              }}
              className={`py-2 px-3.5 rounded-md transition flex items-center justify-center gap-1.5 ${
                courierMode === "manual"
                  ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>شحن يدوي / خاص</span>
            </button>
          </div>

          {/* 1. Turbo Direct Mode */}
          {courierMode === "turbo" && turboCompany && (
            <div className="p-3.5 rounded-lg border border-blue-100 dark:border-blue-950/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <TruckIcon className="h-4 w-4 text-blue-600" />
                  إرسال فوري إلى شركة تربو (Turbo Courier)
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ● الحساب مفعل وجاهز
                </span>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-400">
                سيتم إرسال بيانات العميل والمنتجات ومبلغ التحصيل ({formatPrice(order?.total || 0)}) فوراً إلى حسابك لدى تربو وتوليد رقم التتبع وبوليصة الشحن.
              </p>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleTurboDirectShipment}
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2"
                >
                  <PaperAirplaneIcon className="h-4 w-4 rotate-180" />
                  <span>{loading ? "جاري الإرسال لتربو وتوليد البوليصة..." : "إرسال إلى شركة تربو وتوليد البوليصة"}</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. QP Express Direct Mode */}
          {courierMode === "qp" && qpCompany && (
            <div className="p-3.5 rounded-lg border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-900 dark:text-indigo-300">
                  إرسال فوري إلى شركة كيو بي إكسبريس (QP Express)
                </span>
                {qpSettings?.customerId ? (
                  <span className="text-[11px] text-gray-500 font-mono">
                    عميل رقم: #{qpSettings.customerId}
                  </span>
                ) : (
                  <span className="text-[11px] text-emerald-600 font-mono">
                    ● متصل
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ملاحظات المعاينة والتسليم للمندوب:
                </label>
                <input
                  type="text"
                  value={qpNotes}
                  onChange={(e) => setQpNotes(e.target.value)}
                  placeholder="مثال: المعاينة في وجود المندوب ولا يوجد استرجاع إلا في حالة عيوب الصناعة"
                  className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleQpExpressDirectShipment}
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2"
                >
                  <PaperAirplaneIcon className="h-4 w-4 rotate-180" />
                  <span>{loading ? "جاري الإرسال وتوليد البوليصة..." : "إرسال إلى كيو بي إكسبريس وتوليد البوليصة"}</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. Bosta Direct Mode */}
          {courierMode === "bosta" && bostaCompany && (
            <div className="p-3.5 rounded-lg border border-orange-100 dark:border-orange-950/60 bg-orange-50/30 dark:bg-orange-950/20 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-orange-900 dark:text-orange-300">
                  إرسال فوري إلى شركة بوستا (Bosta)
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ● مفتاح الـ API مسجل
                </span>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-400">
                سيتم إرسال عنوان العميل، المحافظة، والمنتجات، ومبلغ التحصيل فوراً لتوليد بوليصة بوستا الرسمية (AWB).
              </p>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleBostaDirectShipment}
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2"
                >
                  <PaperAirplaneIcon className="h-4 w-4 rotate-180" />
                  <span>{loading ? "جاري الإرسال وتوليد البوليصة..." : "إرسال إلى بوستا وتوليد البوليصة"}</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. Other Active Custom Companies */}
          {courierMode === "custom" && customCompanies.length > 0 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  اختر شركة الشحن
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  {customCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.integrationMode ? `(${c.integrationMode})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCreateShipment}
                  disabled={loading || !selectedCompanyId}
                  className="w-full sm:w-auto px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2"
                >
                  <TruckIcon className="h-4 w-4" />
                  <span>{loading ? "جاري إنشاء الشحنة..." : "إنشاء الشحنة وتسليم للشركة"}</span>
                </button>
              </div>
            </div>
          )}

          {/* 5. Manual Courier */}
          {courierMode === "manual" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    رقم البوليصة أو التتبع (اختياري)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: EXP-982341"
                    value={manualTracking}
                    onChange={(e) => setManualTracking(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    اسم المندوب أو ملاحظات التسليم
                  </label>
                  <input
                    type="text"
                    placeholder="اسم المندوب ورقم هاتفه"
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCreateShipment}
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2"
                >
                  <TruckIcon className="h-4 w-4" />
                  <span>{loading ? "جاري حفظ الشحنة..." : "حفظ بيانات الشحن اليدوي"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <h4 className="text-base font-bold text-gray-900 dark:text-white">
              تأكيد إلغاء الشحنة
            </h4>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              سيتم إرسال طلب إلغاء لشركة الشحن وتغيير حالة الشحنة إلى ملغية.
            </p>
            <input
              type="text"
              placeholder="سبب الإلغاء (اختياري)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                رجوع
              </button>
              <button
                type="button"
                onClick={handleCancelShipment}
                disabled={cancelling}
                className="px-4 py-2 text-xs font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700"
              >
                {cancelling ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedShippingCard;
