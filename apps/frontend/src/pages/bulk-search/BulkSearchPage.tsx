import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  bulkSearchService,
  Order,
  BulkSearchStats,
} from "../../services/bulkSearchService";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import {
  Search,
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  Phone,
  Package,
  Copy,
} from "lucide-react";

const ORDER_STATUSES = [
  { code: "PENDING", name: "قيد الانتظار", nameEn: "Pending" },
  { code: "CONFIRMED", name: "تم التأكيد", nameEn: "Confirmed" },
  { code: "PROCESSING", name: "قيد التجهيز", nameEn: "Processing" },
  { code: "SHIPPED", name: "تم الشحن", nameEn: "Shipped" },
  { code: "DELIVERED", name: "تم التوصيل", nameEn: "Delivered" },
  { code: "CANCELLED", name: "ملغي", nameEn: "Cancelled" },
  { code: "REFUNDED", name: "مسترد", nameEn: "Refunded" },
  { code: "RETURNED", name: "مرتجع", nameEn: "Returned" },
  { code: "ON_HOLD", name: "معلق", nameEn: "On Hold" },
  { code: "TRASH", name: "مهملة", nameEn: "Trash" },
];

const normalizeStatusCode = (value: string | null | undefined) =>
  String(value || "").trim().toUpperCase();

const isCancellationStatus = (value: string | null | undefined) => {
  const normalizedStatus = normalizeStatusCode(value);
  return normalizedStatus === "CANCELLED" || normalizedStatus === "CANCELED";
};

const BulkSearchPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState<"orderNumber" | "phone">(
    "orderNumber",
  );
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Order[]>([]);
  const [notFoundValues, setNotFoundValues] = useState<string[]>([]);
  const [stats, setStats] = useState<BulkSearchStats | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
    new Set(),
  );
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const toggleSelect = useCallback((orderNumber: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderNumber)) {
        next.delete(orderNumber);
      } else {
        next.add(orderNumber);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedOrderIds((prev) => {
      if (prev.size === results.length) {
        return new Set();
      }
      return new Set(results.map((o) => o.orderNumber));
    });
  }, [results]);

  const handleBulkStatusUpdate = useCallback(
    async (newStatus: string) => {
      if (!newStatus) return;
      const normalizedStatus = normalizeStatusCode(newStatus);
      let notes = "";

      if (isCancellationStatus(normalizedStatus)) {
        const cancellationReason = window.prompt(
          t("bulkSearch.cancellationReasonPrompt") ||
            t("orders.cancellationReasonPrompt"),
        );
        if (cancellationReason === null) return;
        notes = cancellationReason.trim();
        if (!notes) {
          toast.error(
            t("bulkSearch.cancellationReasonRequired") ||
              t("orders.cancellationReasonRequired"),
          );
          return;
        }
      }

      if (
        !window.confirm(
          t("bulkSearch.confirmBulkUpdate", {
            count: selectedOrderIds.size,
            status:
              ORDER_STATUSES.find(
                (s) => normalizeStatusCode(s.code) === normalizedStatus,
              )?.name || newStatus,
          }),
        )
      )
        return;

      try {
        setUpdatingStatus(true);
        const response = await apiClient.post("/orders-new/bulk/status", {
          orderIds: Array.from(selectedOrderIds),
          status: normalizedStatus,
          notes,
        });

        const data = response.data as {
          data?: {
            results?: Array<Record<string, unknown>>;
            successCount?: number;
          };
        };
        const results_arr = data?.data?.results ?? [];
        const failedResults = results_arr.filter(
          (r: Record<string, unknown>) => !r.success,
        );
        const failedCount = failedResults.length;
        const successCount = data?.data?.successCount ?? 0;

        if (successCount > 0) {
          if (failedCount === 0) {
            toast.success(t("bulkSearch.bulkUpdateSuccess", { count: successCount }));
          } else {
            toast.warning(
              t("bulkSearch.bulkUpdatePartial", {
                success: successCount,
                failed: failedCount,
              }),
            );
          }
          setSelectedOrderIds(new Set());
        } else {
          toast.error(
            failedResults
              .map((r: Record<string, unknown>) => String(r.error ?? ""))
              .join("\n") || t("bulkSearch.bulkUpdateFailed"),
          );
        }
      } catch (error: unknown) {
        console.error("Bulk status update error:", error);
        const err = error as { response?: { data?: { message?: string } }; message?: string };
        toast.error(
          err.response?.data?.message ||
            err.message ||
            t("bulkSearch.bulkUpdateError"),
        );
      } finally {
        setUpdatingStatus(false);
      }
    },
    [selectedOrderIds, t],
  );

  const handleSearch = async () => {
    if (!inputText.trim()) {
      toast.error(t("bulkSearch.errorEnterValues"));
      return;
    }

    setLoading(true);
    setHasSearched(false);
    setSelectedOrderIds(new Set());

    try {
      const values = bulkSearchService.parseInput(inputText);

      if (values.length === 0) {
        toast.error(t("bulkSearch.errorNoValidValues"));
        setLoading(false);
        return;
      }

      if (values.length > 100) {
        toast.error(t("bulkSearch.errorMaxValues"));
        setLoading(false);
        return;
      }

      // Phone validation for phone search type
      if (searchType === "phone") {
        const invalidPhones = values.filter(
          (v) => !bulkSearchService.validatePhone(v),
        );
        if (invalidPhones.length > 0) {
          toast.error(
            t("bulkSearch.errorInvalidPhones", { count: invalidPhones.length }),
            { duration: 4000 },
          );
        }
      }

      const response = await bulkSearchService.bulkSearch(searchType, values);

      if (response.success) {
        setResults(response.data.orders);
        setNotFoundValues(response.data.notFoundValues);
        setStats(response.data.stats);
        setHasSearched(true);

        if (response.data.orders.length === 0) {
          toast.error(t("bulkSearch.errorNoResults"));
        } else {
          const message =
            searchType === "phone"
              ? t("bulkSearch.successFoundCustomers", {
                  customers: response.data.stats.found,
                  orders: response.data.orders.length,
                })
              : t("bulkSearch.successFoundOrders", {
                  count: response.data.orders.length,
                });
          toast.success(message);
        }
      }
    } catch (error: unknown) {
      console.error("Bulk search error:", error);
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        t("bulkSearch.errorSearch");
      const statusCode = (error as { response?: { status?: number } }).response?.status;

      if (statusCode === 403) {
        toast.error(t("bulkSearch.errorUnauthorized"));
      } else if (statusCode === 400) {
        toast.error(t("bulkSearch.errorBadRequest", { message: errorMessage }));
      } else if (statusCode === 500) {
        toast.error(t("bulkSearch.errorServer"));
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (results.length === 0) {
      toast.error(t("bulkSearch.errorNoExport"));
      return;
    }

    try {
      bulkSearchService.exportToCSV(results, searchType);
      toast.success(t("bulkSearch.successExport"));
    } catch (error) {
      toast.error(t("bulkSearch.errorExport"));
    }
  };

  const handleCopy = async () => {
    if (results.length === 0) {
      toast.error(t("bulkSearch.errorNoCopy"));
      return;
    }

    const success = await bulkSearchService.copyToClipboard(results);
    if (success) {
      toast.success(t("bulkSearch.successCopy"));
    } else {
      toast.error(t("bulkSearch.errorCopy"));
    }
  };

  const handleClear = () => {
    setInputText("");
    setResults([]);
    setNotFoundValues([]);
    setStats(null);
    setHasSearched(false);
    setSelectedOrderIds(new Set());
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: {
        label: t("orders.status.pending"),
        color:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      },
      processing: {
        label: t("orders.status.processing"),
        color:
          "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      },
      shipped: {
        label: t("orders.status.shipped"),
        color:
          "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      },
      delivered: {
        label: t("orders.status.delivered"),
        color:
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      },
      cancelled: {
        label: t("orders.status.cancelled"),
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      },
      completed: {
        label: t("orders.status.completed"),
        color:
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      },
    };

    const statusInfo = statusMap[status.toLowerCase()] || {
      label: status,
      color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
      >
        {statusInfo.label}
      </span>
    );
  };

  return (
    <div className="p-6 w-full" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Search className="text-blue-600 dark:text-blue-400" size={32} />
          {t("bulkSearch.title")}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t("bulkSearch.description")}
        </p>
      </div>

      {/* Search Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("bulkSearch.searchType")}
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setSearchType("orderNumber")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                searchType === "orderNumber"
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
              }`}
            >
              <Package size={20} />
              <span className="font-medium">{t("bulkSearch.orderCodes")}</span>
            </button>
            <button
              onClick={() => setSearchType("phone")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                searchType === "phone"
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
              }`}
            >
              <Phone size={20} />
              <span className="font-medium">
                {t("bulkSearch.phoneNumbers")}
              </span>
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {searchType === "orderNumber"
              ? t("bulkSearch.orderCodes")
              : t("bulkSearch.phoneNumbers")}
            <span className="text-gray-500 dark:text-gray-400 text-xs mr-2">
              ({t("bulkSearch.inputLabel")})
            </span>
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              searchType === "orderNumber"
                ? t("bulkSearch.orderCodesPlaceholder")
                : t("bulkSearch.phonesPlaceholder")
            }
            className="w-full h-48 p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            disabled={loading}
          />
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t("bulkSearch.valueCount", {
              count: bulkSearchService.parseInput(inputText).length,
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSearch}
            disabled={loading || !inputText.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                {t("bulkSearch.searching")}
              </>
            ) : (
              <>
                <Search size={20} />
                {t("bulkSearch.search")}
              </>
            )}
          </button>
          <button
            onClick={handleClear}
            disabled={loading}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {t("bulkSearch.clear")}
          </button>
        </div>
      </div>

      {/* Statistics */}
      {hasSearched && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("bulkSearch.totalValues")}
                </p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {stats.total}
                </p>
              </div>
              <FileText
                className="text-gray-400 dark:text-gray-500"
                size={32}
              />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("orders.found")}
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.found}
                </p>
              </div>
              <CheckCircle
                className="text-green-400 dark:text-green-500"
                size={32}
              />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("orders.notFound")}
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.notFound}
                </p>
              </div>
              <AlertCircle
                className="text-red-400 dark:text-red-500"
                size={32}
              />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("orders.ordersCount")}
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.ordersCount}
                </p>
                {typeof stats.storefrontCount === "number" && stats.storefrontCount > 0 && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium block mt-1">
                    ({stats.storefrontCount} من المتجر)
                  </span>
                )}
              </div>
              <Package className="text-blue-400 dark:text-blue-500" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Not Found Values */}
      {hasSearched && notFoundValues.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <AlertCircle
              className="text-red-600 dark:text-red-400 mt-1"
              size={20}
            />
            <div className="flex-1">
              <h3 className="font-bold text-red-800 dark:text-red-300 mb-2">
                {t("orders.notFoundValues", { count: notFoundValues.length })}
              </h3>
              <div className="flex flex-wrap gap-2">
                {notFoundValues.map((value, index) => (
                  <span
                    key={index}
                    className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 px-2 py-1 rounded text-sm font-mono"
                  >
                    {value}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {hasSearched && results.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex flex-wrap gap-3 justify-between items-center">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    results.length > 0 &&
                    selectedOrderIds.size === results.length
                  }
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {t("bulkSearch.selectAll")}
              </label>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                {t("bulkSearch.results")} ({results.length})
                {selectedOrderIds.size > 0 && (
                  <span className="text-sm font-normal text-blue-600 dark:text-blue-400 mr-2">
                    ({selectedOrderIds.size} {" "}
                    {t("bulkSearch.selected")})
                  </span>
                )}
              </h2>
            </div>
            <div className="flex gap-2">
              {selectedOrderIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        handleBulkStatusUpdate(val);
                        e.target.value = "";
                      }
                    }}
                    disabled={updatingStatus}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">
                      {updatingStatus
                        ? t("bulkSearch.updating")
                        : t("bulkSearch.updateStatus")}
                    </option>
                    {ORDER_STATUSES.filter(
                      (s) =>
                        normalizeStatusCode(s.code) !== "TRASH" &&
                        normalizeStatusCode(s.code) !== "DRAFT",
                    ).map((status) => (
                      <option key={status.code} value={status.code}>
                        {status.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={results.length === 0}
                  >
                    <Copy size={18} />
                    {t("bulkSearch.copy")}
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={results.length === 0}
                  >
                    <Download size={18} />
                    {t("bulkSearch.export")}
                  </button>
                </div>
              )}
              {selectedOrderIds.size === 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={results.length === 0}
                  >
                    <Copy size={18} />
                    {t("bulkSearch.copy")}
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={results.length === 0}
                  >
                    <Download size={18} />
                    {t("bulkSearch.export")}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-right" style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={
                        results.length > 0 &&
                        selectedOrderIds.size === results.length
                      }
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t("bulkSearch.orderNumber")}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t("bulkSearch.customer")}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t("bulkSearch.phone")}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t("bulkSearch.status")}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t("bulkSearch.total")}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t("bulkSearch.date")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {results.map((order) => (
                  <tr
                    key={order.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                      selectedOrderIds.has(order.orderNumber)
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : ""
                    }`}
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <td
                      className="px-4 py-4 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.has(order.orderNumber)}
                        onChange={() => toggleSelect(order.orderNumber)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                          {order.orderNumber}
                        </span>
                        {(order.isStorefront || order.isGuestOrder || order.sourceType === "storefront" || order.orderSource === "STOREFRONT") && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            متجر
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {order.customer
                          ? `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim() || order.customerName || "-"
                          : order.customerName || "-"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {order.customer?.email || order.customerEmail || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="text-sm text-gray-900 dark:text-gray-100 font-mono"
                        dir="ltr"
                      >
                        {order.customer?.phone || order.customerPhone || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {Number(order.total).toFixed(2)} {order.currency || "ج.م"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString("ar-EG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {hasSearched && results.length === 0 && notFoundValues.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <Search
            className="mx-auto text-gray-400 dark:text-gray-500 mb-4"
            size={64}
          />
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            {t("bulkSearch.noResults")}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t("bulkSearch.searchFirst")}
          </p>
        </div>
      )}
    </div>
  );
};

export default BulkSearchPage;
