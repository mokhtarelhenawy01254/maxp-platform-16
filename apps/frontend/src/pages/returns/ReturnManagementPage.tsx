import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useMemo } from "react";
import {
  returnService,
  ReturnRequest,
  ReviewDisplayConfig,
} from "../../services/returnService";
import { toast } from "sonner";
import {
  Filter,
  RefreshCw,
  XCircle,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  Package,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import ReturnDetailsModal from "./ReturnDetailsModal";

const getFallbackOrderStatuses = (t: any) => [
  { code: "PENDING", label: t('returns.k_1') },
  { code: "CONFIRMED", label: t('returns.k_2') },
  { code: "SCHEDULED", label: t('returns.k_3') },
  { code: "PROCESSING", label: t('returns.k_4') },
  { code: "SHIPPED", label: t('returns.k_5') },
  { code: "DELIVERED", label: t('returns.k_6') },
  { code: "CANCELLED", label: t('returns.k_7') },
  { code: "RETURNED", label: t('returns.k_8') },
  { code: "REFUNDED", label: t('returns.k_9') },
  { code: "DUPLICATE_ORDER", label: t('returns.k_10') },
  { code: "ON_HOLD", label: t('returns.k_11') },
  { code: "PARTIALLY_DELIVERED", label: t('returns.k_12') },
];

const ReturnManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const FALLBACK_ORDER_STATUSES = React.useMemo(() => getFallbackOrderStatuses(t), [t]);
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
  const [orderStatuses, setOrderStatuses] = useState(FALLBACK_ORDER_STATUSES);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [categories, setCategories] = useState<any[]>([]);
  const [reasons, setReasons] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  // Edit Reason Modal State
  const [showEditReasonModal, setShowEditReasonModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ReturnRequest | null>(
    null,
  );
  const [editForm, setEditForm] = useState({
    reasonId: "",
    responsibleParty: "OTHER" as "CUSTOMER" | "STORE" | "SHIPPING" | "OTHER",
    customerNotes: "",
    adminNotes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 20 };
      if (orderStatusFilter) params.orderStatus = orderStatusFilter;
      if (searchTerm) params.search = searchTerm;
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

  const fetchCategoriesAndReasons = async () => {
    try {
      const [catRes, reasonRes] = await Promise.all([
        returnService.getCategories(),
        returnService.getReasons(),
      ]);
      setCategories(catRes.data);
      setReasons(reasonRes.data);
    } catch (error) {
      console.error("Failed to load categories/reasons:", error);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [searchTerm, orderStatusFilter]);

  useEffect(() => {
    fetchData();
  }, [searchTerm, orderStatusFilter, page, displayConfig]);

  useEffect(() => {
    fetchCategoriesAndReasons();
  }, []);

  // Load order statuses
  useEffect(() => {
    apiClient.get("/order-status", { _skipErrorToast: true })
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          const fetched = res.data.data
            .filter((s: any) => s.statusType !== "payment")
            .map((s: any) => ({
              code: s.code,
              label: s.name || s.code,
            }));
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
            {t('returns.k_141')}
          </p>
        </div>
      </div>

      {/* Filters */}
      {displayConfig?.showFilterBar !== false && (
      <div className="flex flex-wrap gap-4 mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 items-center">
        {(() => {
            const visibleOs = orderStatuses.filter((s) => {
              if (!displayConfig?.visibleOrderStatuses) return true;
              return displayConfig.visibleOrderStatuses.includes(s.code);
            });
            if (visibleOs.length === 0) return null;
            return (
              <>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Package size={16} />
                  <span className="text-xs font-medium whitespace-nowrap">{t('returns.k_18')}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setOrderStatusFilter("")}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      orderStatusFilter === ""
                        ? "bg-blue-600 dark:bg-blue-500 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {t('returns.k_13')}
                  </button>
                  {visibleOs.map((status) => (
                    <button
                      key={status.code}
                      onClick={() => setOrderStatusFilter(status.code)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        orderStatusFilter === status.code
                          ? "bg-blue-600 dark:bg-blue-500 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </>
            );
          })()}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('returns.k_19')}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg max-w-xs mr-auto"
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
                              responsibleParty:
                                request.responsibleParty || "OTHER",
                              customerNotes: request.customerNotes || "",
                              adminNotes: request.adminNotes || "",
                            });
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

      {/* Edit Reason Modal */}
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
              {/* Return Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('returns.k_154')}
                </label>
                <select
                  value={editForm.reasonId}
                  onChange={(e) => {
                    const selectedReason = reasons.find(
                      (r) => r.id === e.target.value,
                    );
                    setEditForm({
                      ...editForm,
                      reasonId: e.target.value,
                      responsibleParty:
                        selectedReason?.category?.defaultRole ||
                        editForm.responsibleParty,
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t('returns.k_30')}</option>
                  {categories.map((cat) => (
                    <optgroup key={cat.id} label={cat.name}>
                      {reasons
                        .filter((r) => r.categoryId === cat.id)
                        .map((reason) => (
                          <option key={reason.id} value={reason.id}>
                            {reason.reason}{" "}
                            {reason.description && `- ${reason.description}`}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                  {/* Reasons without category */}
                  {reasons.filter((r) => !r.categoryId).length > 0 && (
                    <optgroup label={t('returns.k_31')}>
                      {reasons
                        .filter((r) => !r.categoryId)
                        .map((reason) => (
                          <option key={reason.id} value={reason.id}>
                            {reason.reason}{" "}
                            {reason.description && `- ${reason.description}`}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Responsible Party */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('returns.k_59')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["CUSTOMER", "STORE", "SHIPPING", "OTHER"].map((party) => (
                    <button
                      key={party}
                      type="button"
                      onClick={() =>
                        setEditForm({
                          ...editForm,
                          responsibleParty: party as any,
                        })
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        editForm.responsibleParty === party
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {party === "CUSTOMER"
                        ? t('returns.k_32')
                        : party === "STORE"
                          ? t('returns.k_33')
                          : party === "SHIPPING"
                            ? t('returns.k_34')
                            : t('returns.k_31')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('returns.k_156')}
                </label>
                <textarea
                  value={editForm.customerNotes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, customerNotes: e.target.value })
                  }
                  rows={3}
                  placeholder={t('returns.k_35')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('returns.k_157')}
                </label>
                <textarea
                  value={editForm.adminNotes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, adminNotes: e.target.value })
                  }
                  rows={3}
                  placeholder={t('returns.k_36')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  onClick={() => setShowEditReasonModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  {t('returns.k_158')}
                </button>
                <button
                  onClick={async () => {
                    if (!editForm.reasonId) {
                      toast.error(t('returns.k_42'));
                      return;
                    }
                    setCreating(true);
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
                      console.error(error);
                      toast.error(
                        error.response?.data?.error || t('returns.k_44'),
                      );
                    } finally {
                      setCreating(false);
                    }
                  }}
                  disabled={creating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? t('returns.k_45') : t('returns.k_46')}
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
