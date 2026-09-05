import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  TruckIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PrinterIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import tokenManager from "../../utils/tokenManager";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";

interface ShippingCompanyRef {
  id: string;
  name: string;
  slug?: string;
  providerKey?: string;
  integrationMode?: string;
  phone?: string;
  website?: string;
}

interface ShipmentItem {
  id: string;
  orderId?: string | null;
  trackingNumber?: string | null;
  externalShipmentId?: string | null;
  status: string;
  carrierType: string;
  serviceLevel?: string | null;
  cost?: number | null;
  currency?: string;
  settlementStatus?: string | null;
  destinationGovernorate?: string | null;
  destinationCity?: string | null;
  labelUrl?: string | null;
  createdAt: string;
  shippingCompany?: ShippingCompanyRef | null;
  order?: {
    id: string;
    orderNumber: string;
    total: number;
    currency: string;
    status: string;
    governorate?: string;
    city?: string;
    customer?: {
      id: string;
      name: string;
      phone: string;
    } | null;
  } | null;
}

interface ShipmentsSummary {
  totalShipments: number;
  inTransit: number;
  delivered: number;
  returned: number;
  pendingRemittanceAmount: number;
  statusCounts?: Record<string, number>;
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  CREATED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  SHIPPED: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
  IN_TRANSIT: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
  OUT_FOR_DELIVERY: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  RETURNED: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  CANCELLED: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
  FAILED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
};

const UnifiedShipmentsPage: React.FC = () => {
  const { t: tVal } = useTranslation();
  const t = tVal as any;
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  const [searchParams, setSearchParams] = useSearchParams();

  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [companies, setCompanies] = useState<ShippingCompanyRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const [summary, setSummary] = useState<ShipmentsSummary>({
    totalShipments: 0,
    inTransit: 0,
    delivered: 0,
    returned: 0,
    pendingRemittanceAmount: 0,
  });

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const searchQuery = searchParams.get("search") || "";
  const selectedCompanyId = searchParams.get("company") || "ALL";
  const selectedStatus = searchParams.get("status") || "ALL";

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Update query params in URL
  const updateParams = useCallback((newParams: Record<string, string | number | undefined>) => {
    const current = Object.fromEntries(searchParams.entries());
    Object.entries(newParams).forEach(([k, v]) => {
      if (v === undefined || v === "" || v === "ALL") {
        delete current[k];
      } else {
        current[k] = String(v);
      }
    });
    setSearchParams(current, { replace: true });
  }, [searchParams, setSearchParams]);

  // Fetch all active shipping companies for filter tabs/dropdown
  const fetchCompanies = async () => {
    try {
      const res = await apiClient.get("/shipping-companies?all=true");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setCompanies(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching companies:", err);
    }
  };

  // Fetch shipments list
  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
      };
      if (searchQuery) params.search = searchQuery;
      if (selectedCompanyId && selectedCompanyId !== "ALL") {
        params.shippingCompanyId = selectedCompanyId;
      }
      if (selectedStatus && selectedStatus !== "ALL") {
        params.status = selectedStatus;
      }

      const res = await apiClient.get("/shipments", { params });
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
      toast.error(t("orders.fetchError", "تعذر تحميل سجلات الشحنات"));
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, selectedCompanyId, selectedStatus, t]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: localSearch.trim() || undefined, page: 1 });
  };

  // Copy tracking number
  const copyTracking = (tracking: string) => {
    navigator.clipboard.writeText(tracking);
    toast.success("تم نسخ رقم التتبع");
  };

  // Sync single shipment
  const handleSyncShipment = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await apiClient.post(`/shipments/${id}/sync`);
      if (res.data?.success) {
        toast.success(res.data.message || "تمت مزامنة حالة الشحنة");
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

  // Status text translation
  const getStatusLabel = (status: string) => {
    const s = String(status || "").toUpperCase();
    switch (s) {
      case "PENDING":
        return "بانتظار الشحن";
      case "CREATED":
        return "تم إنشاء الشحنة";
      case "SHIPPED":
        return "تم الشحن";
      case "IN_TRANSIT":
      case "DELIVERING":
        return "في الطريق للعميل";
      case "OUT_FOR_DELIVERY":
        return "خرج للتوصيل";
      case "DELIVERED":
      case "COMPLETED":
        return "تم التسليم بنجاح";
      case "RETURNED":
        return "مرتجع";
      case "CANCELLED":
        return "ملغي";
      case "FAILED":
        return "فشل التوصيل";
      default:
        return status || "غير محدد";
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TruckIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            <span>سجلات الشحنات والتوصيل</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            متابعة وإدارة شحنات جميع الشركات والمناديب من شاشة موحدة واحدة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/shipping-companies"
            className="px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            إدارة شركات الشحن
          </Link>
          <Link
            to="/shipping-settlement"
            className="px-3.5 py-2 text-xs sm:text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition"
          >
            التسويات المالية
          </Link>
          <button
            onClick={() => fetchShipments()}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
            title="تحديث البيانات"
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards (Single-depth, responsive) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
            <TruckIcon className="h-4 w-4 text-blue-500" />
            <span>إجمالي الشحنات</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {summary.totalShipments}
          </p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
            <ClockIcon className="h-4 w-4 text-indigo-500" />
            <span>قيد التوصيل</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {summary.inTransit}
          </p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
            <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
            <span>تم التسليم</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {summary.delivered}
          </p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
            <ExclamationCircleIcon className="h-4 w-4 text-rose-500" />
            <span>مرتجع / ملغي</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {summary.returned}
          </p>
        </div>

        <div className="col-span-2 sm:col-span-4 lg:col-span-1 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
            <BanknotesIcon className="h-4 w-4 text-amber-500" />
            <span>معلق التحصيل</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatPrice(summary.pendingRemittanceAmount)}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 space-y-3 shadow-sm">
        {/* Dynamic Carrier Tabs (Horizontal scroll on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={() => updateParams({ company: "ALL", page: 1 })}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
              selectedCompanyId === "ALL"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            جميع الشركات
          </button>
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => updateParams({ company: c.id, page: 1 })}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedCompanyId === c.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <span>{c.name}</span>
              {c.integrationMode === "LIVE" && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              )}
            </button>
          ))}
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث برقم الطلب، اسم العميل، الهاتف، أو رقم البوليصة..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-3 pr-9 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch("");
                  updateParams({ search: undefined, page: 1 });
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </form>

          {/* Status Dropdown */}
          <div className="w-full sm:w-48">
            <select
              value={selectedStatus}
              onChange={(e) => updateParams({ status: e.target.value, page: 1 })}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">كل الحالات</option>
              <option value="PENDING">بانتظار الشحن</option>
              <option value="CREATED">تم إنشاء الشحنة</option>
              <option value="IN_TRANSIT">قيد التوصيل</option>
              <option value="DELIVERED">تم التسليم</option>
              <option value="RETURNED">مرتجع</option>
              <option value="CANCELLED">ملغي</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Shipments Table / Mobile Cards */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              جاري تحميل سجلات الشحنات...
            </p>
          </div>
        ) : shipments.length === 0 ? (
          <div className="p-12 text-center">
            <TruckIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              لا توجد شحنات مطابقة
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              لم يتم العثور على أي شحنات وفق معايير البحث أو التصفية الحالية
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
              <thead className="bg-gray-50 dark:bg-gray-900/60 text-xs font-semibold text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">الطلب</th>
                  <th className="px-4 py-3">العميل والوجهة</th>
                  <th className="px-4 py-3">شركة الشحن</th>
                  <th className="px-4 py-3">رقم التتبع (AWB)</th>
                  <th className="px-4 py-3">قيمة التحصيل</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">تاريخ الإنشاء</th>
                  <th className="px-4 py-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-xs sm:text-sm">
                {shipments.map((s) => {
                  const companyName = s.shippingCompany?.name || s.carrierType || "يدوي";
                  const badgeStyle =
                    STATUS_BADGE_STYLES[s.status] ||
                    "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300";

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-750 transition"
                    >
                      {/* Order Number */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {s.order?.id ? (
                          <Link
                            to={`/orders/${encodeURIComponent(String(s.order.id))}`}
                            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            #{s.order.orderNumber || s.order.id.slice(0, 8)}
                          </Link>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Customer & Destination */}
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {s.order?.customer?.name || "عميل غير محدد"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {s.destinationGovernorate || s.order?.governorate || ""}{" "}
                          {s.destinationCity || s.order?.city || ""}
                        </p>
                      </td>

                      {/* Courier Name & Mode */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {companyName}
                        </span>
                        {s.shippingCompany?.integrationMode && (
                          <span className="mr-1.5 text-[10px] text-gray-400">
                            ({s.shippingCompany.integrationMode})
                          </span>
                        )}
                      </td>

                      {/* Tracking / Waybill */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {s.trackingNumber ? (
                          <div className="flex items-center gap-1 font-mono text-xs">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              {s.trackingNumber}
                            </span>
                            <button
                              onClick={() => copyTracking(s.trackingNumber!)}
                              className="text-gray-400 hover:text-gray-600 p-0.5"
                              title="نسخ رقم التتبع"
                            >
                              <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">لا يوجد كود</span>
                        )}
                      </td>

                      {/* COD Total */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                        {formatPrice(s.order?.total || 0)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeStyle}`}
                        >
                          {getStatusLabel(s.status)}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                        {s.createdAt ? format(new Date(s.createdAt), "yyyy-MM-dd HH:mm") : "-"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Sync */}
                          <button
                            onClick={() => handleSyncShipment(s.id)}
                            disabled={syncingId === s.id}
                            className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            title="مزامنة الحالة مع شركة الشحن"
                          >
                            <ArrowPathIcon
                              className={`h-4 w-4 ${syncingId === s.id ? "animate-spin text-indigo-600" : ""}`}
                            />
                          </button>

                          {/* Print Waybill */}
                          {s.labelUrl ? (
                            <a
                              href={s.labelUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                              title="طباعة البوليصة"
                            >
                              <PrinterIcon className="h-4 w-4" />
                            </a>
                          ) : (s.carrierType === "QP_EXPRESS" && s.trackingNumber) ? (
                            <button
                              type="button"
                              onClick={() => {
                                const token = tokenManager.getAccessToken();
                                const url = `/api/v1/qp-express/waybill/${s.trackingNumber}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
                                const w = window.open(url, "_blank", "width=450,height=400");
                                if (w) w.focus();
                              }}
                              className="p-1.5 text-amber-600 hover:text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition"
                              title="طباعة ستيكر QP (80×50 مم)"
                            >
                              <PrinterIcon className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              إجمالي {totalItems} شحنة — صفحة {page} من {totalPages}
            </p>

            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => updateParams({ page: page - 1 })}
                className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: page + 1 })}
                className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedShipmentsPage;
