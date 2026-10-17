import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import tokenManager from "../../../utils/tokenManager";
import { ShippingCompanyRef } from "./CarrierTabsBar";
import { ShipmentRowItem } from "./ShipmentStatementTable";

export interface ShipmentsSummary {
  totalShipments: number;
  inTransit: number;
  delivered: number;
  returned: number;
  pendingRemittanceAmount: number;
  statusCounts?: Record<string, number>;
  carrierStatusCounts?: Record<string, number>;
}

export function useUnifiedShipmentsData() {
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

  // Synchronize local states when searchParams change
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setLocalDateFrom(dateFrom);
  }, [dateFrom]);

  useEffect(() => {
    setLocalDateTo(dateTo);
  }, [dateTo]);

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
      if (searchQuery) params["search"] = searchQuery;
      if (selectedCompanyId && selectedCompanyId !== "ALL") {
        params["shippingCompanyId"] = selectedCompanyId;
      }
      if (selectedStatus && selectedStatus !== "ALL") {
        params["status"] = selectedStatus;
      }
      if (dateFrom) params["dateFrom"] = dateFrom;
      if (dateTo) params["dateTo"] = dateTo;

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

  return {
    page,
    limit,
    searchQuery,
    selectedCompanyId,
    selectedStatus,
    dateFrom,
    dateTo,
    localSearch,
    setLocalSearch,
    localDateFrom,
    setLocalDateFrom,
    localDateTo,
    setLocalDateTo,
    shipments,
    companies,
    loading,
    syncingId,
    bulkSyncing,
    carrierSyncing,
    selectedIds,
    setSelectedIds,
    chatShipment,
    setChatShipment,
    ticketShipment,
    setTicketShipment,
    showCreateModal,
    setShowCreateModal,
    summary,
    totalPages,
    totalItems,
    activeCompany,
    activeCarrierType,
    updateParams,
    fetchShipments,
    handleSearchSubmit,
    copyTracking,
    handlePrintWaybill,
    handleSyncShipment,
    handleBulkSync,
    handleCarrierLiveSync,
    handleResendShipment,
    handleCancelShipment,
    isAllSelected,
    toggleSelectAll,
    toggleSelectOne,
  };
}
