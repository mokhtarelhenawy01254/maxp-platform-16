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
  CheckCircle,
  Clock,
  Eye,
  Edit,
  CalendarDays,
  CheckSquare,
  Square,
  Package,
  XCircle,
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

  // Batch Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Edit Reason Modal State
  const [showEditReasonModal, setShowEditReasonModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ReturnRequest | null>(null);
  const [editForm, setEditForm] = useState({
    reasonId: "",
    responsibleParty: "OTHER" as "CUSTOMER" | "STORE" | "SHIPPING" | "OTHER",
    customerNotes: "",
    adminNotes: "",
  });
  const [editCategories, setEditCategories] = useState<any[]>([]);
  const [editReasons, setEditReasons] = useState<any[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 20 };
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
  }, [searchTerm, orderStatusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [searchTerm, orderStatusFilter, dateFrom, dateTo, page, displayConfig]);

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

  // Load categories/reasons for Edit Modal
  const fetchEditReasons = async () => {
    try {
      const [catRes, reasonRes] = await Promise.all([
        returnService.getCategories(),
        returnService.getReasons(),
      ]);
      setEditCategories(catRes.data);
      setEditReasons(reasonRes.data);
    } catch { /* ignore */ }
  };

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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === requests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(requests.map((r) => r.id)));
    }
  };

  const handleBatchReceive = async () => {
    if (!selectedIds.size) return;
    if (!confirm(`تأكيد استلام ${selectedIds.size} شحنة في المخزن؟`)) return;
    setBatchLoading(true);
    try {
      await returnService.batchReceive(Array.from(selectedIds));
      toast.success(`تم تأكيد استلام ${selectedIds.size} شحنة`);
      setSelectedIds(new Set());
      fetchData();
    } catch {
      toast.error("فشل في تأكيد الاستلام");
    } finally {
      setBatchLoading(false);
    }
  };

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
            {t('returns.k_141')}
          </p>
        </div>
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

      {/* Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-3 flex items-center gap-4">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            تم اختيار {selectedIds.size} شحنة
          </span>
          <button
            onClick={handleBatchReceive}
            disabled={batchLoading}
            className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {batchLoading ? "جاري..." : "📦 تأكيد استلام الكل"}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
          >
            إلغاء التحديد
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-right w-10">
                <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {selectedIds.size === requests.length ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>
              </th>
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
              {displayConfig?.showReceivedStatusColumn !== false && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  حالة الاستلام
                </th>
              )}
              {displayConfig?.showReviewColumn !== false && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('returns.k_63')}
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
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedIds.has(request.id) ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}
                >
                  <td className="px-4 py-4">
                    <button onClick={() => toggleSelect(request.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      {selectedIds.has(request.id) ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                    </button>
                  </td>
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
                  {displayConfig?.showReceivedStatusColumn !== false && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const rs = request.receivedStatus;
                        if (rs === "RECEIVED" || rs === "INSPECTED" || rs === "RESTOCKED") {
                          return <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full text-xs">📦 وصل</span>;
                        }
                        if (rs === "IN_TRANSIT") {
                          return <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs">🚚 في الطريق</span>;
                        }
                        return <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full text-xs">⏳ قيد الانتظار</span>;
                      })()}
                    </td>
                  )}
                  {displayConfig?.showReviewColumn !== false && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {request.isReviewed ? (
                        <span className="text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
                          <CheckCircle size={14} /> {t('returns.k_147')}
                        </span>
                      ) : (
                        <span className="text-orange-500 dark:text-orange-400 text-xs flex items-center gap-1">
                          <Clock size={14} /> {t('returns.k_148')}
                        </span>
                      )}
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
                          onClick={() => {
                            setEditingRequest(request);
                            setEditForm({
                              reasonId: request.reasonId || "",
                              responsibleParty: request.responsibleParty || "OTHER",
                              customerNotes: request.customerNotes || "",
                              adminNotes: request.adminNotes || "",
                            });
                            fetchEditReasons();
                            setShowEditReasonModal(true);
                          }}
                          className="text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300"
                          title={t('returns.k_23')}
                        >
                          <Edit size={18} />
                        </button>

                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          title={t('returns.k_24')}
                        >
                          <Eye size={18} />
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

      {/* Edit Reason Modal (Quick Edit) */}
      {showEditReasonModal && editingRequest && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowEditReasonModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('returns.k_159')}
              </h2>
              <button
                onClick={() => setShowEditReasonModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <XCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* المسؤول أولاً */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('returns.k_59')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["CUSTOMER", "STORE", "SHIPPING", "OTHER"].map((party) => (
                    <button
                      key={party}
                      type="button"
                      onClick={() => {
                        setEditForm({ ...editForm, responsibleParty: party as any, reasonId: "" });
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        editForm.responsibleParty === party
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {party === "CUSTOMER" ? t('returns.k_32') : party === "STORE" ? t('returns.k_33') : party === "SHIPPING" ? t('returns.k_34') : t('returns.k_31')}
                    </button>
                  ))}
                </div>
              </div>

              {/* الأسباب بعد تحديد المسؤول — مفلترة حسب defaultRole */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('returns.k_154')}
                </label>
                <select
                  value={editForm.reasonId}
                  onChange={(e) => {
                    const selectedReason = editReasons.find((r) => r.id === e.target.value);
                    setEditForm({
                      ...editForm,
                      reasonId: e.target.value,
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t('returns.k_30')}</option>
                  {editCategories
                    .filter((cat: any) => cat.defaultRole === editForm.responsibleParty)
                    .map((cat: any) => (
                      <optgroup key={cat.id} label={cat.name}>
                        {editReasons.filter((r: any) => r.categoryId === cat.id).map((reason: any) => (
                          <option key={reason.id} value={reason.id}>
                            {reason.reason}{reason.description && ` - ${reason.description}`}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  {/* أسباب بدون تصنيف أو بتصنيف OTHER تظهر دايماً */}
                  {editReasons.filter((r: any) => {
                    const cat = editCategories.find((c: any) => c.id === r.categoryId);
                    return !cat || cat.defaultRole === 'OTHER';
                  }).length > 0 && (
                    <optgroup label={t('returns.k_31')}>
                      {editReasons.filter((r: any) => {
                        const cat = editCategories.find((c: any) => c.id === r.categoryId);
                        return !cat || cat.defaultRole === 'OTHER';
                      }).map((reason: any) => (
                        <option key={reason.id} value={reason.id}>
                          {reason.reason}{reason.description && ` - ${reason.description}`}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('returns.k_156')}
                </label>
                <textarea
                  value={editForm.customerNotes}
                  onChange={(e) => setEditForm({ ...editForm, customerNotes: e.target.value })}
                  rows={3}
                  placeholder={t('returns.k_35')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('returns.k_157')}
                </label>
                <textarea
                  value={editForm.adminNotes}
                  onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
                  rows={3}
                  placeholder={t('returns.k_36')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  onClick={() => setShowEditReasonModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  {t('returns.k_158')}
                </button>
                <button
                  onClick={async () => {
                    if (!editForm.reasonId) { toast.error(t('returns.k_42')); return; }
                    setEditSaving(true);
                    try {
                      await returnService.updateRequest(editingRequest.id, {
                        reasonId: editForm.reasonId,
                        responsibleParty: editForm.responsibleParty,
                        customerNotes: editForm.customerNotes,
                        adminNotes: editForm.adminNotes,
                      });
                      toast.success(t('returns.k_43'));
                      setShowEditReasonModal(false);
                      setEditingRequest(null);
                      fetchData();
                    } catch (error: any) {
                      toast.error(error.response?.data?.error || t('returns.k_44'));
                    } finally { setEditSaving(false); }
                  }}
                  disabled={editSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {editSaving ? t('returns.k_45') : t('returns.k_46')}
                </button>
              </div>
            </div>
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
