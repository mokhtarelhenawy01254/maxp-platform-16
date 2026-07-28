import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import {
  returnService,
  ReturnRequest,
  ReviewDisplayConfig,
} from "../../services/returnService";
import { toast } from "sonner";
import {
  Filter,
  RefreshCw,
  Clock,
  Eye,
  CalendarDays,
  Package,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import ReturnDetailsModal from "./ReturnDetailsModal";

const ReturnManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(
    null,
  );

  // Display Config
  const [displayConfig, setDisplayConfig] =
    useState<ReviewDisplayConfig | null>(null);

  // Filters & Search
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Order statuses for secondary filter
  const [orderStatuses, setOrderStatuses] = useState<{ code: string; label: string }[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Review Tab: "pending" = unreviewed (default), "reviewed" = completed
  const [reviewTab, setReviewTab] = useState<"pending" | "reviewed">("pending");

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 20 };
      params.isReviewed = reviewTab === "reviewed" ? "true" : "false";
      if (orderStatusFilter) params.orderStatus = orderStatusFilter;
      if (searchTerm) params.search = searchTerm;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (displayConfig?.ordersStartDate) params.startDate = displayConfig.ordersStartDate;
      const reqRes = await returnService.getRequests(params);
      setRequests(reqRes.data.data);
      setTotal(reqRes.data.total);
      setTotalPages(reqRes.data.totalPages);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [searchTerm, orderStatusFilter, dateFrom, dateTo, reviewTab]);

  useEffect(() => {
    fetchData();
  }, [searchTerm, orderStatusFilter, dateFrom, dateTo, page, displayConfig, reviewTab]);

  // Load order statuses for secondary filter
  useEffect(() => {
    apiClient.get("/order-status", { _skipErrorToast: true })
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          const fetched = res.data.data
            .filter((s: any) => s.statusType !== "payment")
            .map((s: any) => ({ code: s.code, label: s.name || s.code }));
          if (fetched.length > 0) setOrderStatuses(fetched);
        }
      })
      .catch(() => {});
  }, []);

  // Load display settings
  useEffect(() => {
    returnService
      .getSettings()
      .then((res) => {
        const config = res.data?.reviewDisplayConfig;
        if (config) setDisplayConfig(config);
      })
      .catch(() => {});
  }, []);

  const getRatingBadge = (rating: string | undefined) => {
    if (!rating) return null;
    switch (rating) {
      case "EXCELLENT":
        return (
          <span className="mr-2 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
            {t('returns.k_136')}
          </span>
        );
      case "GOOD":
        return (
          <span className="mr-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
            {t('returns.k_137')}
          </span>
        );
      case "AVERAGE":
        return (
          <span className="mr-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
            {t('returns.k_138')}
          </span>
        );
      case "BAD":
        return (
          <span className="mr-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
            {t('returns.k_139')}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 dark:bg-gray-900 min-h-screen" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            {t('returns.k_140')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {reviewTab === "pending" ? "طلبات الإرجاع التي لم تراجع بعد" : "طلبات الإرجاع التي تمت مراجعتها"}
            {!loading && ` (${total})`}
          </p>
        </div>
      </div>

      {/* Review Tabs */}
      <div className="flex gap-1 mb-4 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700 w-full sm:w-fit">
        <button
          onClick={() => setReviewTab("pending")}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
            reviewTab === "pending"
              ? "bg-orange-600 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          ⏳ بانتظار المراجعة
        </button>
        <button
          onClick={() => setReviewTab("reviewed")}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
            reviewTab === "reviewed"
              ? "bg-green-600 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          ✅ تمت المراجعة
        </button>
      </div>

      {/* Filters */}
      {displayConfig?.showFilterBar !== false && (
      <div className="flex flex-wrap gap-4 mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 items-center">

        {/* Order status filter */}
        {orderStatuses.length > 0 && (
          <>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Package size={16} />
              <span className="text-xs font-medium whitespace-nowrap">{t('returns.k_18')}</span>
            </div>
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
            >
              <option value="">{t('returns.k_13')}</option>
              {orderStatuses.map((s) => (
                <option key={s.code} value={s.code}>{s.label}</option>
              ))}
            </select>
          </>
        )}

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <CalendarDays size={16} />
          <span className="text-xs font-medium whitespace-nowrap">{t('returns.k_65')}</span>
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
          title={t('returns.k_150')}
        />
        <span className="text-gray-400 text-xs">-</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
          title={t('returns.k_151')}
        />

        <div className="flex-1" />

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('returns.k_19')}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg max-w-xs"
        />
        <button
          onClick={fetchData}
          className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          title={t('returns.k_20')}
        >
          <RefreshCw size={18} />
        </button>
      </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              {displayConfig?.showOrderColumn !== false && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('returns.k_143')}
                </th>
              )}
              {displayConfig?.showCustomerColumn !== false && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('returns.k_49')}
                </th>
              )}
              {displayConfig?.showReasonColumn !== false && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('returns.k_57')}
                </th>
              )}
              {displayConfig?.showResponsiblePartyColumn !== false && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('returns.k_59')}
                </th>
              )}
              {displayConfig?.showTrackingColumn !== false && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  رقم التتبع
                </th>
              )}
              {displayConfig?.showDateColumn !== false && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('returns.k_65')}
                </th>
              )}
              {displayConfig?.showActionsColumn !== false && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-6">
                  {t('returns.k_67')}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td
                  colSpan={99}
                  className="text-center py-8 text-gray-500 dark:text-gray-400"
                >
                  {t('returns.k_144')}
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td
                  colSpan={99}
                  className="text-center py-8 text-gray-500 dark:text-gray-400"
                >
                  {t('returns.k_145')}
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <tr
                  key={request.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  {displayConfig?.showOrderColumn !== false && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {request.order?.orderNumber || t('returns.k_21')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {request.refundAmount
                          ? `${request.refundAmount} ${request.order?.currency || t('returns.k_22')}`
                          : "-"}
                      </div>
                    </td>
                  )}
                  {displayConfig?.showCustomerColumn !== false && (
                    <td className="px-6 py-4 w-1/3">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                            {request.customer?.firstName}{" "}
                            {request.customer?.lastName}
                            {displayConfig?.showCustomerRating !== false &&
                              getRatingBadge(
                                request.customer?.customerRating,
                              )}
                          </div>
                          {displayConfig?.showCustomerPhone !== false && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {request.customer?.phone}
                            </div>
                          )}
                          {displayConfig?.showCustomerSuccessScore !==
                            false && (
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {t('returns.k_146')}{" "}
                              {request.customer?.successScore?.toFixed(1)}%
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  )}
                  {displayConfig?.showReasonColumn !== false && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {request.reason ? (
                        <>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {request.reason.reason}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {request.reason.category?.name}
                          </div>
                        </>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 flex items-center gap-1 w-fit">
                          <Clock size={12} /> {t('returns.k_11')}
                        </span>
                      )}
                    </td>
                  )}
                  {displayConfig?.showResponsiblePartyColumn !== false && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          request.responsibleParty === "CUSTOMER"
                            ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                            : request.responsibleParty === "STORE"
                              ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                              : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {request.responsibleParty}
                      </span>
                    </td>
                  )}
                  {displayConfig?.showTrackingColumn !== false && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400" dir="ltr">
                      {request.trackingNumber || "-"}
                    </td>
                  )}
                  {displayConfig?.showDateColumn !== false && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                  )}
                  {displayConfig?.showActionsColumn !== false && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium pl-6">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 flex items-center gap-1"
                          title={t('returns.k_24')}
                        >
                          <Eye size={18} />
                          <span className="text-xs">{t('returns.k_24')}</span>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('returns.k_149')} {total}{t('returns.k_28')}{page}{t('returns.k_29')}{totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
            >
              {t('returns.k_150')}
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center gap-1">
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="px-1 text-gray-400">...</span>
                  )}
                  <button
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      page === p
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                    }`}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
            >
              {t('returns.k_151')}
            </button>
          </div>
        </div>
      )}

      {/* Modal Integration */}
      {selectedRequest && (
        <ReturnDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
};

export default ReturnManagementPage;
