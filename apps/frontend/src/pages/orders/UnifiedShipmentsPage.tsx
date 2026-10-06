import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  TruckIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import tokenManager from "../../utils/tokenManager";
import { CarrierTabsBar, ShippingCompanyRef } from "./shipments/CarrierTabsBar";
import { CarrierStagesBar } from "./shipments/CarrierStagesBar";
import { ShipmentStatementTable, ShipmentRowItem } from "./shipments/ShipmentStatementTable";
import { ShipmentStatementCards } from "./shipments/ShipmentStatementCards";
import { ShipmentStatsBar } from "./shipments/ShipmentStatsBar";
import { TurboShipmentChatModal } from "./shipments/TurboShipmentChatModal";
import { CreateShipmentModal } from "./shipments/CreateShipmentModal";
import { CreateTicketModal } from "./shipments/CreateTicketModal";

interface ShipmentsSummary {
  totalShipments: number;
  inTransit: number;
  delivered: number;
  returned: number;
  pendingRemittanceAmount: number;
  statusCounts?: Record<string, number>;
  carrierStatusCounts?: Record<string, number>;
}

// Safe date formatter
const formatSafeDate = (dateVal: string | Date | null | undefined): string => {
  if (!dateVal) return "-";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "-";
    return format(d, "yyyy-MM-dd HH:mm");
  } catch {
    return "-";
  }
};

const UnifiedShipmentsPage: React.FC = () => {
  const { t: tVal } = useTranslation();
  const t = tVal as any;

  const [searchParams, setSearchParams] = useSearchParams();

  const [shipments, setShipments] = useState<ShipmentRowItem[]>([]);
  const [companies, setCompanies] = useState<ShippingCompanyRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [carrierSyncing, setCarrierSyncing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [chatShipment, setChatShipment] = useState<ShipmentRowItem | null>(null);
  const [ticketShipment, setTicketShipment] = useState<ShipmentRowItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [summary, setSummary] = useState<ShipmentsSummary>({
    totalShipments: 0,
    inTransit: 0,
    delivered: 0,
    returned: 0,
    pendingRemittanceAmount: 0,
    carrierStatusCounts: {},
  });

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const searchQuery = searchParams.get("search") || "";
  const selectedCompanyId = searchParams.get("company") || "ALL";
  const selectedStatus = searchParams.get("status") || "ALL";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [localDateFrom, setLocalDateFrom] = useState(dateFrom);
  const [localDateTo, setLocalDateTo] = useState(dateTo);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Active shipping company object
  const activeCompany = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId);
  }, [companies, selectedCompanyId]);

  const activeCarrierType = activeCompany?.providerKey || (selectedCompanyId === "ALL" ? undefined : "MANUAL");

  // Update query params in URL
  const updateParams = useCallback(
    (newParams: Record<string, string | number | undefined>) => {
      const current = Object.fromEntries(searchParams.entries());
      Object.entries(newParams).forEach(([k, v]) => {
        if (v === undefined || v === "" || v === "ALL") {
          delete current[k];
        } else {
          current[k] = String(v);
        }
      });
      setSearchParams(current, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Fetch all active shipping companies for filter tabs
  const fetchCompanies = async () => {
    try {
      const res = await apiClient.get<any>("/shipping-companies?all=true");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setCompanies(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching companies:", err);
    }
  };

  // Fetch shipments statement list
  const fetchShipments = useCallback(async () => {
    setLoading(true);
    setSelectedIds([]);
    try {
      const params: Record<string, any> = {
        page,
        limit,
      };
      if (searchQuery) params['search'] = searchQuery;
      if (selectedCompanyId && selectedCompanyId !== "ALL") {
        params['shippingCompanyId'] = selectedCompanyId;
      }
      if (selectedStatus && selectedStatus !== "ALL") {
        params['status'] = selectedStatus;
      }
      if (dateFrom) params['dateFrom'] = dateFrom;
      if (dateTo) params['dateTo'] = dateTo;

      const res = await apiClient.get<any>("/shipments", { params });
      if (res.data?.success) {
        setShipments(res.data.data || []);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalItems(res.data.pagination.total || 0);
        }
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error("Error loading shipments:", err);
      toast.error(t("orders.fetchError", "تعذر تحميل بيان الشحنات"));
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, selectedCompanyId, selectedStatus, dateFrom, dateTo, t]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({
      search: localSearch.trim() || undefined,
      dateFrom: localDateFrom || undefined,
      dateTo: localDateTo || undefined,
      page: 1,
    });
  };

  // Copy tracking number
  const copyTracking = (tracking: string) => {
    navigator.clipboard.writeText(tracking);
    toast.success("تم نسخ رقم التتبع");
  };

  // Universal waybill print
  const handlePrintWaybill = (s: ShipmentRowItem) => {
    const token = tokenManager.getAccessToken();
    const carrier = (s.shippingCompany?.providerKey || s.carrierType || "").toUpperCase();

    if (s.labelUrl) {
      window.open(s.labelUrl, "_blank");
      return;
    }

    if (carrier === "QP_EXPRESS" || carrier === "QPEXPRESS") {
      if (s.trackingNumber) {
        const url = `/api/v1/qp-express/waybill/${s.trackingNumber}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
        const w = window.open(url, "_blank", "width=450,height=400");
        if (w) w.focus();
        return;
      }
    }

    if (carrier === "TURBO" && (s.orderId || s.order?.id)) {
      const ordId = s.orderId || s.order?.id;
      const url = `/api/v1/turbo/orders/${ordId}/label${token ? `?token=${encodeURIComponent(token)}` : ""}`;
      const w = window.open(url, "_blank");
      if (w) w.focus();
      return;
    }

    if (carrier === "BOSTA" && (s.externalShipmentId || s.trackingNumber)) {
      const bId = s.externalShipmentId || s.trackingNumber;
      const url = `/api/v1/bosta/awb/${bId}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
      const w = window.open(url, "_blank");
      if (w) w.focus();
      return;
    }

    toast.info("لا يتوفر ملف بوليصة جاهز لهذه الشحنة");
  };

  // Sync single shipment
  const handleSyncShipment = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await apiClient.post<any>(`/shipments/${id}/sync`);
      if (res.data?.success) {
        toast.success(res.data.message || "تمت مزامنة حالة الشحنة مع الشركة");
        fetchShipments();
      } else {
        toast.error(res.data?.error || "فشلت المزامنة");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "حدث خطأ أثناء المزامنة");
    } finally {
      setSyncingId(null);
    }
  };

  // Bulk sync selected shipments
  const handleBulkSync = async () => {
    if (selectedIds.length === 0) return;
    setBulkSyncing(true);
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        const res = await apiClient.post<any>(`/shipments/${id}/sync`);
        if (res.data?.success) successCount++;
      } catch (_) {}
    }
    toast.success(`تمت مزامنة ${successCount} شحنة بنجاح`);
    setBulkSyncing(false);
    fetchShipments();
  };

  // Live sync directly from shipping company API
  const handleCarrierLiveSync = async () => {
    setCarrierSyncing(true);
    try {
      const carrierType = activeCarrierType || "TURBO";
      const res = await apiClient.post<any>("/shipments/sync-carrier", {
        carrierType,
        companyId: selectedCompanyId !== "ALL" ? selectedCompanyId : undefined,
      });
      if (res.data?.success) {
        toast.success(res.data.message || "تمت مزامنة الحالات مباشرة من شركة الشحن وتحديث البيان");
        await fetchShipments();
      } else {
        toast.error(res.data?.error || "فشل التحديث من شركة الشحن");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "حدث خطأ أثناء الاتصال بشركة الشحن");
    } finally {
      setCarrierSyncing(false);
    }
  };

  // Resend shipment request (Turbo)
  const handleResendShipment = async (s: ShipmentRowItem) => {
    if (!window.confirm(`هل أنت متأكد من إرسال طلب إعادة شحن الشحنة #${s.trackingNumber || s.externalShipmentId}؟`)) return;
    try {
      const res = await apiClient.post<any>(`/shipments/${s.id}/resend`);
      if (res.data?.success) {
        toast.success(res.data.message || "تم طلب إعادة الإرسال بنجاح");
        fetchShipments();
      } else {
        toast.error(res.data?.message || "تعذر إعادة الإرسال");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "حدث خطأ أثناء إرسال طلب إعادة الشحن");
    }
  };

  // Cancel shipment request
  const handleCancelShipment = async (s: ShipmentRowItem) => {
    const reason = window.prompt("يرجى كتابة سبب إلغاء الشحنة:", "إلغاء بناءً على طلب العميل");
    if (reason === null) return;
    try {
      const res = await apiClient.post<any>(`/shipments/${s.id}/cancel-request`, { reason });
      if (res.data?.success) {
        toast.success(res.data.message || "تم إلغاء الشحنة بنجاح");
        fetchShipments();
      } else {
        toast.error(res.data?.message || "تعذر إلغاء الشحنة");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "حدث خطأ أثناء إلغاء الشحنة");
    }
  };

  // Export full detailed shipping manifest
  const handleExportCsv = () => {
    if (shipments.length === 0) {
      toast.error("لا توجد شحنات في العرض الحالي لتصديرها");
      return;
    }
    const headers = [
      "رقم الشحنة",
      "رقم الطلب",
      "تاريخ الطلب",
      "اسم العميل",
      "هاتف العميل",
      "المحافظة",
      "المدينة",
      "العنوان التفصيلي",
      "شركة الشحن",
      "نوع الربط",
      "رقم البوليصة والتتبع (AWB)",
      "مندوب التوصيل",
      "هاتف المندوب",
      "فرع الشحن",
      "هاتف الفرع",
      "الفرع المتوقع",
      "سبب التأجيل",
      "سبب الإرجاع",
      "قيمة التحصيل COD",
      "المبلغ المستلم",
      "الحالة",
    ];

    const rows = shipments.map((s) => [
      s.id,
      s.order?.orderNumber || s.orderId || "",
      formatSafeDate(s.createdAt),
      s.order?.customerName || s.order?.customer?.name || "",
      s.order?.customerPhone || s.order?.customer?.phone || "",
      s.destinationGovernorate || s.order?.governorate || "",
      s.destinationCity || s.order?.city || "",
      s.destinationAddress || "",
      s.shippingCompany?.name || s.carrierType || "يدوي",
      s.shippingCompany?.integrationMode || "MANUAL",
      s.trackingNumber || s.externalShipmentId || "",
      s.captainName || "",
      s.captainPhone || "",
      s.branchName || "",
      s.branchPhone || "",
      s.expectedBranch || "",
      s.delayReason || "",
      s.returnReason || "",
      s.order?.total || s.cost || 0,
      s.receivedAmount || 0,
      getStatusBadge(s.status, s).label,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers, ...rows]
        .map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
        .join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `shipment_statement_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير بيان تفاصيل الشحنات بنجاح");
  };

  // Status text & style mapping (with exact Turbo labels)
  const getStatusBadge = (status: string, shipment?: ShipmentRowItem) => {
    const s = String(shipment?.order?.turboShipmentStatus || status || "").toLowerCase().trim();

    if (["incomplete", "turbo_saved", "created", "status_1", "status_18", "1", "18"].includes(s)) {
      return {
        label: "غير مكتملة",
        className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      };
    }
    if (["turbo_sent", "sent", "waiting", "pending", "status_2", "2"].includes(s) || s.includes("انتظار")) {
      return {
        label: "قيد الإنتظار",
        className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      };
    }
    if (["processing", "underway", "accepted", "status_3", "3"].includes(s) || s.includes("تنفيذ")) {
      return {
        label: "قيد التنفيذ",
        className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
      };
    }
    if (["out_for_delivery", "under delivery", "with captain", "in transit", "shipped", "status_4", "4"].includes(s) || s.includes("مسلمة للمندوب")) {
      return {
        label: "مسلمة للمندوب",
        className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
      };
    }
    if (["delayed", "on hold", "status_13", "13"].includes(s) || s.includes("مؤجل")) {
      return {
        label: "مؤجلة مع المندوب",
        className: "bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800 font-bold",
      };
    }
    if (["delivered", "completed", "status_7", "7"].includes(s) || s.includes("تسليم")) {
      return {
        label: "تم التسليم",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-semibold",
      };
    }
    if (["returned_to_company", "returned with company", "returned", "status_5", "status_14", "5", "14"].includes(s)) {
      return {
        label: "مرتجعات في الشركة",
        className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 font-semibold",
      };
    }
    if (["returned_destroyed", "status_12", "status_17", "12", "17"].includes(s) || s.includes("معدوم")) {
      return {
        label: "مرتجعات معدومة",
        className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
      };
    }
    if (["returned_missing", "lost", "status_11", "status_16", "11", "16"].includes(s) || s.includes("مفقود")) {
      return {
        label: "مرتجعات مفقودة",
        className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
      };
    }
    if (["returned_resent", "status_10", "status_15", "10", "15"].includes(s) || s.includes("ارسال")) {
      return {
        label: "معاد ارسالها",
        className: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
      };
    }
    if (["remitted", "supplied", "status_8", "status_19", "8", "19"].includes(s) || s.includes("توريد")) {
      return {
        label: "تم التوريد",
        className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800 font-bold",
      };
    }
    if (["returned_received", "status_20", "20"].includes(s) || s.includes("وصلتني")) {
      return {
        label: "مرتجعات وصلتني",
        className: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 font-semibold",
      };
    }
    if (["cancelled", "status_6", "6"].includes(s) || s.includes("ملغي")) {
      return {
        label: "ملغي",
        className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
      };
    }

    return {
      label: status || "غير محدد",
      className: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300",
    };
  };

  // Selection helpers
  const isAllSelected = useMemo(() => {
    return shipments.length > 0 && selectedIds.length === shipments.length;
  }, [shipments, selectedIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(shipments.map((s) => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-2.5 sm:p-5 space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TruckIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span>بيان تفاصيل الأوردرات في شركات الشحن</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            متابعة دقيقة لبيانات المناديب والفروع وأسباب التأجيل والارتجاع لكل شركة شحن على حدة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition shadow-xs"
          >
            <ArrowDownTrayIcon className="h-4 w-4 text-gray-500" />
            <span>تصدير بيان الشحنات</span>
          </button>
          <Link
            to="/tickets"
            className="px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl hover:bg-amber-100 transition flex items-center gap-1"
          >
            <span>تذاكر وشات الشحن</span>
          </Link>
          <Link
            to="/shipping-companies"
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition"
          >
            إدارة الشركات
          </Link>
          <Link
            to="/shipping-settlement"
            className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 transition"
          >
            التسويات المالية
          </Link>
          <button
            type="button"
            onClick={() => fetchShipments()}
            disabled={loading}
            className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
            title="تحديث البيانات"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Seamless Cockpit Chassis Container */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-3.5 sm:p-4 space-y-3.5">
        {/* 1. Carrier Selector Tabs */}
        <CarrierTabsBar
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          onSelectCompany={(companyId) => updateParams({ company: companyId, status: "ALL", page: 1 })}
          totalShipmentsCount={summary.totalShipments}
        />

        {/* 2. Operational Stages Board (واضح ومتشاف وفوق مش تحت لجميع الحالات) */}
        <div className="pt-0.5 pb-1 border-b border-gray-100 dark:border-gray-750">
          <CarrierStagesBar
            carrierType={activeCarrierType}
            selectedStage={selectedStatus}
            onSelectStage={(stageKey) => updateParams({ status: stageKey, page: 1 })}
            stageCounts={summary.carrierStatusCounts || {}}
            onOpenCreateShipment={() => setShowCreateModal(true)}
            onLiveSync={handleCarrierLiveSync}
            isLiveSyncing={carrierSyncing}
          />
        </div>

        {/* 3. KPI Stats Strip */}
        <ShipmentStatsBar
          totalShipments={summary.totalShipments}
          inTransit={summary.inTransit}
          delivered={summary.delivered}
          returned={summary.returned}
          pendingRemittanceAmount={summary.pendingRemittanceAmount}
        />

        {/* 4. Search & Date Filter Bar */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
          <div className="relative sm:col-span-6">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث برقم الطلب، كود البوليصة، اسم العميل، هاتف العميل، المندوب، أو الفرع..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-8 pr-9 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50/70 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch("");
                  updateParams({ search: undefined, page: 1 });
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="relative sm:col-span-2">
            <input
              type="date"
              value={localDateFrom}
              onChange={(e) => setLocalDateFrom(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              title="من تاريخ"
            />
          </div>

          <div className="relative sm:col-span-2">
            <input
              type="date"
              value={localDateTo}
              onChange={(e) => setLocalDateTo(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              title="إلى تاريخ"
            />
          </div>

          <div className="sm:col-span-2 flex items-center">
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              تصفية البيان
            </button>
          </div>
        </form>

        {/* 4. Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl p-2.5 px-3 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] flex items-center justify-center font-bold">
                {selectedIds.length}
              </span>
              <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                تم تحديد {selectedIds.length} شحنة في البيان
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkSync}
                disabled={bulkSyncing}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-200 bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 transition shadow-2xs"
              >
                <ArrowPathIcon className={`h-3.5 w-3.5 ${bulkSyncing ? "animate-spin" : ""}`} />
                <span>مزامنة الحالات المحددة</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                إلغاء التحديد
              </button>
            </div>
          </div>
        )}

        {/* 5. Statement Table & Mobile Cards */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden mt-2">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
              <p className="mt-3 text-xs text-gray-500">جاري تحميل بيان تفاصيل الأوردرات...</p>
            </div>
          ) : shipments.length === 0 ? (
            <div className="p-12 text-center">
              <TruckIcon className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                لا توجد أوردرات مسجلة في هذا البيان
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                لم يتم العثور على أي شحنات وفق الشركة أو الحالة المحددة
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block">
                <ShipmentStatementTable
                  shipments={shipments}
                  selectedIds={selectedIds}
                  onToggleSelectOne={toggleSelectOne}
                  onToggleSelectAll={toggleSelectAll}
                  isAllSelected={isAllSelected}
                  syncingId={syncingId}
                  onSyncShipment={handleSyncShipment}
                  onPrintWaybill={handlePrintWaybill}
                  onOpenChat={(s) => setChatShipment(s)}
                  onOpenTicket={(s) => setTicketShipment(s)}
                  onResendShipment={handleResendShipment}
                  onCancelShipment={handleCancelShipment}
                  onCopyTracking={copyTracking}
                  getStatusBadge={getStatusBadge}
                  formatDate={formatSafeDate}
                />
              </div>

              {/* Mobile Responsive Cards */}
              <div className="sm:hidden">
                <ShipmentStatementCards
                  shipments={shipments}
                  selectedIds={selectedIds}
                  onToggleSelectOne={toggleSelectOne}
                  syncingId={syncingId}
                  onSyncShipment={handleSyncShipment}
                  onPrintWaybill={handlePrintWaybill}
                  onOpenChat={(s) => setChatShipment(s)}
                  onOpenTicket={(s) => setTicketShipment(s)}
                  onResendShipment={handleResendShipment}
                  onCancelShipment={handleCancelShipment}
                  onCopyTracking={copyTracking}
                  getStatusBadge={getStatusBadge}
                  formatDate={formatSafeDate}
                />
              </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs">
              <p className="text-gray-500 font-mono tabular-nums">
                إجمالي {totalItems} شحنة — صفحة {page} من {totalPages}
              </p>

              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => updateParams({ page: page - 1 })}
                  className="p-1 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-100"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => updateParams({ page: page + 1 })}
                  className="p-1 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-100"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Turbo Chat Modal */}
      {chatShipment && (
        <TurboShipmentChatModal
          shipmentId={chatShipment.id}
          trackingCode={chatShipment.trackingNumber || chatShipment.externalShipmentId || ""}
          orderNumber={chatShipment.order?.orderNumber}
          onClose={() => setChatShipment(null)}
        />
      )}

      {/* Turbo Ticket Modal */}
      {ticketShipment && (
        <CreateTicketModal
          shipment={ticketShipment}
          onClose={() => setTicketShipment(null)}
          onSuccess={() => {
            fetchShipments();
          }}
        />
      )}

      {/* Create Shipment Modal */}
      {showCreateModal && (
        <CreateShipmentModal
          companies={companies}
          defaultCompanyId={selectedCompanyId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => fetchShipments()}
        />
      )}
    </div>
  );
};

export default UnifiedShipmentsPage;
