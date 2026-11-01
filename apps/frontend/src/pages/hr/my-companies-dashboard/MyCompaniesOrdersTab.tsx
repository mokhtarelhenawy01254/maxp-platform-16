import React, { useState, useEffect, useCallback, useTransition, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  FunnelIcon,
  BuildingOfficeIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { useAuth } from "../../../hooks/useAuthSimple";
import { MyCompaniesOrder, TotalsByCompany } from "./types";

interface MyCompaniesOrdersTabProps {
  companies: Array<{
    company: {
      id: string;
      name: string;
      logo: string | null;
    };
  }>;
}

const ORDER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "قيد الانتظار", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  CONFIRMED: { label: "مؤكد", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  PROCESSING: { label: "جاري التجهيز", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300" },
  PREPARING: { label: "جاري التجهيز", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300" },
  READY: { label: "جاهز للشحن", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300" },
  READY_TO_SHIP: { label: "جاهز للشحن", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300" },
  SHIPPED: { label: "تم الشحن", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
  DELIVERED: { label: "تم التوصيل", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  CANCELLED: { label: "ملغي", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  RETURNED: { label: "مرتجع", color: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" },
};

export const MyCompaniesOrdersTab: React.FC<MyCompaniesOrdersTabProps> = ({ companies }) => {
  const navigate = useNavigate();
  const { switchCompany } = useAuth();
  const [isPendingTransition, startTransition] = useTransition();

  // Orders State
  const [orders, setOrders] = useState<MyCompaniesOrder[]>([]);
  const [totalsByCompany, setTotalsByCompany] = useState<TotalsByCompany[]>([]);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);

  // Filters State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Modal State for Status Change
  const [statusModalOrder, setStatusModalOrder] = useState<MyCompaniesOrder | null>(null);
  const [modalTargetStatus, setModalTargetStatus] = useState<string>("CONFIRMED");
  const [modalNotes, setModalNotes] = useState<string>("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Modal State for Cancel
  const [cancelModalOrder, setCancelModalOrder] = useState<MyCompaniesOrder | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // Build company filter list from all active memberships (totalsByCompany or companies prop)
  const activeCompanyOptions = useMemo(() => {
    if (totalsByCompany && totalsByCompany.length > 0) {
      return totalsByCompany.map((tc) => ({
        id: tc.companyId,
        name: tc.companyName,
      }));
    }
    return (companies || []).map((c) => ({
      id: c.company?.id || (c as any).id,
      name: c.company?.name || (c as any).name,
    }));
  }, [totalsByCompany, companies]);

  // Fetch Orders from API
  const fetchOrders = useCallback(
    async (reset: boolean = false, cursor: string | null = null) => {
      try {
        if (reset) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        const params: Record<string, string | number> = {
          limit: 25,
        };

        if (selectedCompanyId && selectedCompanyId !== "ALL") {
          params.companyIds = selectedCompanyId;
        }

        if (selectedStatus && selectedStatus !== "ALL") {
          params.status = selectedStatus;
        }

        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }

        if (startDate) {
          params.startDate = startDate;
        }

        if (endDate) {
          params.endDate = endDate;
        }

        if (cursor) {
          params.cursor = cursor;
        }

        const response = await apiClient.get<{
          success: boolean;
          data: {
            totalsByCompany: TotalsByCompany[];
            totalOrders: number;
            orders: MyCompaniesOrder[];
            pageInfo: {
              hasNextPage: boolean;
              nextCursor: string | null;
              limit: number;
            };
          };
        }>("/my-companies/orders", { params });

        if (response.data && response.data.success && response.data.data) {
          const { orders: newOrders, totalsByCompany: newTotals, totalOrders: newTotal, pageInfo } =
            response.data.data;

          if (reset) {
            setOrders(newOrders || []);
          } else {
            setOrders((prev) => [...prev, ...(newOrders || [])]);
          }

          setTotalsByCompany(newTotals || []);
          setTotalOrders(newTotal || 0);
          setHasNextPage(Boolean(pageInfo?.hasNextPage));
          setNextCursor(pageInfo?.nextCursor || null);
        }
      } catch (err: any) {
        console.error("Failed to fetch my-companies orders:", err);
        const errorMsg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "حدث خطأ أثناء تحميل الطلبات المشتركة";
        toast.error(errorMsg);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [selectedCompanyId, selectedStatus, searchQuery, startDate, endDate],
  );

  // Trigger initial & filter fetches
  useEffect(() => {
    fetchOrders(true);
  }, [fetchOrders]);

  // Handle Load More (Keyset Pagination)
  const handleLoadMore = () => {
    if (hasNextPage && nextCursor && !isLoadingMore) {
      fetchOrders(false, nextCursor);
    }
  };

  // Switch context and open order in its original company screen
  const handleOpenOrder = async (order: MyCompaniesOrder) => {
    try {
      toast.info(`جاري التبديل إلى شركة ${order.companyName}...`);
      await switchCompany(order.companyId);
      startTransition(() => {
        navigate(`/orders?search=${encodeURIComponent(order.orderNumber)}`);
      });
    } catch (err) {
      console.error("Failed to switch company:", err);
      toast.error("فشل التبديل إلى شركة الطلب");
    }
  };

  // Submit Status Change
  const handleSubmitStatusChange = async () => {
    if (!statusModalOrder) return;
    try {
      setIsUpdatingStatus(true);
      const payload = {
        companyId: statusModalOrder.companyId,
        status: modalTargetStatus,
        notes: modalNotes || undefined,
      };

      const response = await apiClient.post(
        `/orders/${statusModalOrder.id}/status`,
        payload,
      );

      if (response.data && response.data.success) {
        toast.success(`تم تغيير حالة الطلب ${statusModalOrder.orderNumber} بنجاح`);
        // Update order in state locally
        setOrders((prev) =>
          prev.map((o) =>
            o.id === statusModalOrder.id ? { ...o, status: modalTargetStatus } : o,
          ),
        );
        setStatusModalOrder(null);
        setModalNotes("");
      } else {
        throw new Error(response.data?.error || "فشل تغيير الحالة");
      }
    } catch (err: any) {
      console.error("Error updating order status:", err);
      const msg = err?.response?.data?.error || err?.message || "فشل تغيير حالة الطلب";
      toast.error(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Submit Cancel Order
  const handleSubmitCancel = async () => {
    if (!cancelModalOrder) return;
    try {
      setIsCancelling(true);
      const payload = {
        companyId: cancelModalOrder.companyId,
        status: "CANCELLED",
        notes: cancelReason || "إلغاء من مساحة العمل المشتركة",
      };

      const response = await apiClient.post(
        `/orders/${cancelModalOrder.id}/status`,
        payload,
      );

      if (response.data && response.data.success) {
        toast.success(`تم إلغاء الطلب ${cancelModalOrder.orderNumber} بنجاح`);
        setOrders((prev) =>
          prev.map((o) =>
            o.id === cancelModalOrder.id ? { ...o, status: "CANCELLED" } : o,
          ),
        );
        setCancelModalOrder(null);
        setCancelReason("");
      } else {
        throw new Error(response.data?.error || "فشل إلغاء الطلب");
      }
    } catch (err: any) {
      console.error("Error cancelling order:", err);
      const msg = err?.response?.data?.error || err?.message || "فشل إلغاء الطلب";
      toast.error(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── 1. عدادات كل شركة + الإجمالي ── */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BuildingOfficeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-gray-800 dark:text-white">
              إحصائيات الطلبات عبر شركاتك
            </h2>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {totalsByCompany.length} شركات مسجلة
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {/* إجمالي كل الشركات */}
          <button
            onClick={() => setSelectedCompanyId("ALL")}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all border flex items-center gap-2 shadow-2xs ${
              selectedCompanyId === "ALL"
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <span>جميع الشركات</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                selectedCompanyId === "ALL"
                  ? "bg-white/20 text-white"
                  : "bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
              }`}
            >
              {totalOrders}
            </span>
          </button>

          {/* عداد لكل شركة */}
          {totalsByCompany.map((tc) => {
            const isSelected = selectedCompanyId === tc.companyId;
            return (
              <button
                key={tc.companyId}
                onClick={() => setSelectedCompanyId(isSelected ? "ALL" : tc.companyId)}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all border flex items-center gap-2 shadow-2xs ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
                }`}
              >
                <span className="truncate max-w-[140px]">{tc.companyName}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 dark:bg-gray-600 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {tc.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. شريط الفلاتر والبحث ── */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* بحث */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم الأوردر، اسم العميل، أو رقم الهاتف..."
              className="w-full pr-10 pl-4 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* فلتر الشركة */}
          <div className="w-full md:w-52">
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">كل الشركات</option>
              {activeCompanyOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* فلتر الحالة */}
          <div className="w-full md:w-48">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="PENDING">قيد الانتظار</option>
              <option value="CONFIRMED">مؤكد</option>
              <option value="PROCESSING">جاري التجهيز</option>
              <option value="SHIPPED">تم الشحن</option>
              <option value="DELIVERED">تم التوصيل</option>
              <option value="CANCELLED">ملغي</option>
            </select>
          </div>
        </div>

        {/* فلاتر التاريخ وإعادة الضبط */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-gray-100 dark:border-gray-700 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">من تاريخ:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">إلى تاريخ:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {(searchQuery || selectedCompanyId !== "ALL" || selectedStatus !== "ALL" || startDate || endDate) && (
            <button
              onClick={() => {
                setSelectedCompanyId("ALL");
                setSelectedStatus("ALL");
                setSearchQuery("");
                setStartDate("");
                setEndDate("");
              }}
              className="mr-auto px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md font-medium transition-colors"
            >
              مسح الفلاتر
            </button>
          )}

          <button
            onClick={() => fetchOrders(true)}
            className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md font-medium flex items-center gap-1.5 mr-auto sm:mr-0 transition-colors"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* ── 3. الجدول الموحد للطلبات ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">جاري جلب الطلبات من جميع الشركات...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FunnelIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-1">
              لا توجد طلبات مطابقة
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              لم نتمكن من العثور على أي طلبات تطابق الفلاتر المحددة عبر شركاتك.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-gray-50/80 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-3 sm:px-4 font-semibold">رقم الأوردر</th>
                  <th className="py-3 px-3 sm:px-4 font-semibold">الشركة</th>
                  <th className="py-3 px-3 sm:px-4 font-semibold">العميل</th>
                  <th className="py-3 px-3 sm:px-4 font-semibold">الحالة</th>
                  <th className="py-3 px-3 sm:px-4 font-semibold">الإجمالي</th>
                  <th className="py-3 px-3 sm:px-4 font-semibold">التاريخ</th>
                  <th className="py-3 px-3 sm:px-4 font-semibold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {orders.map((order) => {
                  const statusInfo = ORDER_STATUS_LABELS[order.status] || {
                    label: order.status,
                    color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
                  };
                  const perms = order.permissions;

                  return (
                    <tr
                      key={`${order.companyId}_${order.id}`}
                      className="hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors"
                    >
                      {/* رقم الأوردر */}
                      <td className="py-3 px-3 sm:px-4 font-mono font-bold text-gray-900 dark:text-white">
                        {order.orderNumber}
                      </td>

                      {/* الشركة كشارة */}
                      <td className="py-3 px-3 sm:px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <BuildingOfficeIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[130px]">{order.companyName}</span>
                        </span>
                      </td>

                      {/* العميل */}
                      <td className="py-3 px-3 sm:px-4">
                        <div className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                          {order.customerName}
                        </div>
                        {order.customerPhone && (
                          <div className="text-xs text-gray-400 font-mono" dir="ltr">
                            {order.customerPhone}
                          </div>
                        )}
                      </td>

                      {/* الحالة */}
                      <td className="py-3 px-3 sm:px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* الإجمالي */}
                      <td className="py-3 px-3 sm:px-4 font-mono font-semibold text-gray-900 dark:text-white">
                        {order.total.toLocaleString("ar-EG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        <span className="text-xs text-gray-500 font-sans">{order.currency}</span>
                      </td>

                      {/* التاريخ */}
                      <td className="py-3 px-3 sm:px-4 text-xs text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString("ar-EG") : "-"}
                      </td>

                      {/* الإجراءات مع التحقق والصلاحية لكل شركة */}
                      <td className="py-3 px-3 sm:px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* زر تغيير الحالة */}
                          <div className="relative group inline-block">
                            <button
                              type="button"
                              onClick={() => {
                                if (perms.canChangeStatus) {
                                  setStatusModalOrder(order);
                                  setModalTargetStatus("CONFIRMED");
                                  setModalNotes("");
                                }
                              }}
                              disabled={!perms.canChangeStatus}
                              className={`p-1.5 rounded-md transition-colors ${
                                perms.canChangeStatus
                                  ? "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                  : "text-gray-300 dark:text-gray-600 opacity-40 cursor-not-allowed"
                              }`}
                              title={!perms.canChangeStatus ? `مالكش صلاحية في شركة ${order.companyName}` : "تغيير الحالة"}
                            >
                              <CheckCircleIcon className="w-5 h-5" />
                            </button>
                            {!perms.canChangeStatus && (
                              <div className="hidden group-hover:block absolute bottom-full mb-1 z-30 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-black rounded shadow-md whitespace-nowrap pointer-events-none">
                                مالكش صلاحية في شركة {order.companyName}
                              </div>
                            )}
                          </div>

                          {/* زر إلغاء */}
                          <div className="relative group inline-block">
                            <button
                              type="button"
                              onClick={() => {
                                if (perms.canCancel) {
                                  setCancelModalOrder(order);
                                  setCancelReason("");
                                }
                              }}
                              disabled={!perms.canCancel || order.status === "CANCELLED"}
                              className={`p-1.5 rounded-md transition-colors ${
                                perms.canCancel && order.status !== "CANCELLED"
                                  ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                                  : "text-gray-300 dark:text-gray-600 opacity-40 cursor-not-allowed"
                              }`}
                              title={!perms.canCancel ? `مالكش صلاحية في شركة ${order.companyName}` : "إلغاء الطلب"}
                            >
                              <XCircleIcon className="w-5 h-5" />
                            </button>
                            {!perms.canCancel && (
                              <div className="hidden group-hover:block absolute bottom-full mb-1 z-30 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-black rounded shadow-md whitespace-nowrap pointer-events-none">
                                مالكش صلاحية في شركة {order.companyName}
                              </div>
                            )}
                          </div>

                          {/* زر «افتح» — يبدل السياق ويفتح الأوردر في شاشته الأصلية */}
                          <button
                            type="button"
                            onClick={() => handleOpenOrder(order)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-md transition-colors flex items-center gap-1 text-xs font-medium"
                            title={`فتح الطلب داخل سياق شركة ${order.companyName}`}
                          >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">افتح</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── 4. الترقيم عبر Keyset Pagination ── */}
        {!isLoading && orders.length > 0 && (
          <div className="p-3.5 bg-gray-50/80 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              تم عرض <strong className="font-mono text-gray-800 dark:text-white">{orders.length}</strong> من إجمالي{" "}
              <strong className="font-mono text-gray-800 dark:text-white">{totalOrders}</strong> طلب
            </span>

            {hasNextPage && (
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-xs"
              >
                {isLoadingMore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري التحميل...</span>
                  </>
                ) : (
                  <>
                    <span>تحميل المزيد من الطلبات</span>
                    <ClockIcon className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 5. Modal تغيير الحالة ── */}
      {statusModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 w-full max-w-md p-5 space-y-4 text-right">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                تغيير حالة الطلب #{statusModalOrder.orderNumber}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                الشركة: <strong className="text-blue-600 dark:text-blue-400">{statusModalOrder.companyName}</strong>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  الحالة الجديدة
                </label>
                <select
                  value={modalTargetStatus}
                  onChange={(e) => setModalTargetStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CONFIRMED">مؤكد</option>
                  <option value="PROCESSING">جاري التجهيز</option>
                  <option value="SHIPPED">تم الشحن</option>
                  <option value="DELIVERED">تم التوصيل</option>
                  <option value="CANCELLED">ملغي</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  rows={2}
                  placeholder="أدخل أي ملاحظات على تغيير الحالة..."
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setStatusModalOrder(null)}
                disabled={isUpdatingStatus}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSubmitStatusChange}
                disabled={isUpdatingStatus}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium flex items-center gap-1.5"
              >
                {isUpdatingStatus ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <span>حفظ التغيير</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Modal تأكيد الإلغاء ── */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 w-full max-w-md p-5 space-y-4 text-right">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircleIcon className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold">
                إلغاء الطلب #{cancelModalOrder.orderNumber}
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              الشركة: <strong>{cancelModalOrder.companyName}</strong> — هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                سبب الإلغاء (إلزامي)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                placeholder="أدخل سبب إلغاء الطلب..."
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                disabled={isCancelling}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleSubmitCancel}
                disabled={isCancelling || !cancelReason.trim()}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium flex items-center gap-1.5"
              >
                {isCancelling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري الإلغاء...</span>
                  </>
                ) : (
                  <span>تأكيد الإلغاء</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCompaniesOrdersTab;
