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
  CheckCircle2,
  Loader2,
  Phone,
  Package,
  Copy,
  RotateCcw,
  Store,
  Layers,
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

      const MAX_BULK_SEARCH_VALUES = 10000;
      if (values.length > MAX_BULK_SEARCH_VALUES) {
        toast.error(t("bulkSearch.errorMaxValues"));
        setLoading(false);
        return;
      }

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
          "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      },
      processing: {
        label: t("orders.status.processing"),
        color:
          "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      },
      shipped: {
        label: t("orders.status.shipped"),
        color:
          "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      },
      delivered: {
        label: t("orders.status.delivered"),
        color:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      },
      cancelled: {
        label: t("orders.status.cancelled"),
        color:
          "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800",
      },
      completed: {
        label: t("orders.status.completed"),
        color:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      },
    };

    const statusInfo = statusMap[status.toLowerCase()] || {
      label: status,
      color:
        "bg-secondary text-secondary-foreground border-border",
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusInfo.color}`}
      >
        {statusInfo.label}
      </span>
    );
  };

  const parsedCount = bulkSearchService.parseInput(inputText).length;

  return (
    <div className="w-full space-y-4 p-4 md:p-6" dir="rtl">
      {/* Control Bar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Search className="size-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              {t("bulkSearch.title")}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-mono">
              Batch Query
            </span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            {t("bulkSearch.description")}
          </p>
        </div>

        {hasSearched && results.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors"
            >
              <Copy className="size-3.5 text-muted-foreground" />
              {t("bulkSearch.copy")}
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors"
            >
              <Download className="size-3.5 text-muted-foreground" />
              {t("bulkSearch.export")}
            </button>
          </div>
        )}
      </div>

      {/* Search Input Single-Surface Chassis */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Switcher & Meta */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">نوع البحث:</span>
            <div className="inline-flex p-0.5 rounded-lg border border-border bg-background">
              <button
                type="button"
                onClick={() => setSearchType("orderNumber")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  searchType === "orderNumber"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Package className="size-3.5" />
                {t("bulkSearch.orderCodes")}
              </button>
              <button
                type="button"
                onClick={() => setSearchType("phone")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  searchType === "phone"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Phone className="size-3.5" />
                {t("bulkSearch.phoneNumbers")}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">
              {searchType === "orderNumber"
                ? "أدخل أرقام الطلبات مفصولة بأسطر أو مسافات"
                : "أدخل أرقام الهواتف (يدعم الصيغ المصرية والدولية)"}
            </span>
            <span className="font-mono text-muted-foreground font-semibold px-2 py-0.5 rounded bg-muted">
              {parsedCount} عنصر
            </span>
          </div>
        </div>

        {/* Text Area */}
        <div className="p-4">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              searchType === "orderNumber"
                ? t("bulkSearch.orderCodesPlaceholder")
                : t("bulkSearch.phonesPlaceholder")
            }
            rows={5}
            className="w-full p-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono text-xs md:text-sm resize-y leading-relaxed"
            disabled={loading}
          />
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/20">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSearch}
              disabled={loading || !inputText.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs md:text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("bulkSearch.searching")}
                </>
              ) : (
                <>
                  <Search className="size-4" />
                  {t("bulkSearch.search")}
                </>
              )}
            </button>
            <button
              onClick={handleClear}
              disabled={loading || (!inputText && results.length === 0)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs md:text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RotateCcw className="size-3.5 text-muted-foreground" />
              {t("bulkSearch.clear")}
            </button>
          </div>

          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            الحد الأقصى المسموح به: 10,000 قيمة في كل استعلام
          </span>
        </div>
      </div>

      {/* Telemetry Strip */}
      {hasSearched && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 rounded-xl border border-border bg-card overflow-hidden divide-y md:divide-y-0 divide-x md:divide-x-reverse divide-border shadow-xs">
          <div className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("bulkSearch.totalValues")}</span>
              <FileText className="size-3.5" />
            </div>
            <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-foreground">
              {stats.total}
            </p>
          </div>

          <div className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <span>{t("orders.found")}</span>
              <CheckCircle2 className="size-3.5" />
            </div>
            <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {stats.found}
            </p>
          </div>

          <div className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-destructive font-medium">
              <span>{t("orders.notFound")}</span>
              <AlertCircle className="size-3.5" />
            </div>
            <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-destructive">
              {stats.notFound}
            </p>
          </div>

          <div className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-primary font-medium">
              <span>{t("orders.ordersCount")}</span>
              <Package className="size-3.5" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-foreground">
                {stats.ordersCount}
              </p>
              {typeof stats.storefrontCount === "number" && stats.storefrontCount > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
                  {stats.storefrontCount} متجر
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Not Found Values Pill Box */}
      {hasSearched && notFoundValues.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-destructive font-medium text-xs md:text-sm">
            <AlertCircle className="size-4 shrink-0" />
            <span>{t("orders.notFoundValues", { count: notFoundValues.length })}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
            {notFoundValues.map((value, index) => (
              <span
                key={index}
                className="px-2 py-0.5 rounded-md border border-destructive/20 bg-background text-destructive text-xs font-mono"
              >
                {value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Results Table Single-Surface Chassis */}
      {hasSearched && results.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-3 md:p-4 bg-muted/30 border-b border-border/60 flex flex-wrap gap-3 justify-between items-center">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={
                    results.length > 0 &&
                    selectedOrderIds.size === results.length
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-border text-primary focus:ring-primary size-4"
                />
                {t("bulkSearch.selectAll")}
              </label>

              <div className="h-4 w-px bg-border" />

              <span className="text-xs md:text-sm font-semibold text-foreground">
                {t("bulkSearch.results")} (
                <span className="font-mono tabular-nums">{results.length}</span>)
              </span>

              {selectedOrderIds.size > 0 && (
                <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium border border-primary/20">
                  {selectedOrderIds.size} محدد
                </span>
              )}
            </div>

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
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary"
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
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors"
                >
                  <Copy className="size-3.5" />
                  {t("bulkSearch.copy")}
                </button>

                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors"
                >
                  <Download className="size-3.5" />
                  {t("bulkSearch.export")}
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-xs md:text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2.5 text-right w-10">
                    <input
                      type="checkbox"
                      checked={
                        results.length > 0 &&
                        selectedOrderIds.size === results.length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-border text-primary focus:ring-primary size-4"
                    />
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                    {t("bulkSearch.orderNumber")}
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                    {t("bulkSearch.customer")}
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                    {t("bulkSearch.phone")}
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                    {t("bulkSearch.status")}
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                    {t("bulkSearch.total")}
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                    {t("bulkSearch.date")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-card">
                {results.map((order) => (
                  <tr
                    key={order.id}
                    className={`hover:bg-muted/40 transition-colors cursor-pointer ${
                      selectedOrderIds.has(order.orderNumber)
                        ? "bg-primary/5"
                        : ""
                    }`}
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <td
                      className="px-3 py-3 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.has(order.orderNumber)}
                        onChange={() => toggleSelect(order.orderNumber)}
                        className="rounded border-border text-primary focus:ring-primary size-4"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-primary hover:underline">
                          {order.orderNumber}
                        </span>
                        {(order.isStorefront ||
                          order.isGuestOrder ||
                          order.sourceType === "storefront" ||
                          order.orderSource === "STOREFRONT") && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <Store className="size-2.5" />
                            متجر
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-foreground">
                        {order.customer
                          ? `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim() || order.customerName || "-"
                          : order.customerName || "-"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {order.customer?.email || order.customerEmail || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="font-mono text-xs text-foreground"
                        dir="ltr"
                      >
                        {order.customer?.phone || order.customerPhone || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono tabular-nums font-semibold text-foreground">
                        {Number(order.total).toFixed(2)} {order.currency || "ج.م"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs font-mono">
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
        <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card">
          <Layers className="mx-auto text-muted-foreground/60 mb-3 size-10" />
          <h3 className="text-base font-semibold text-foreground mb-1">
            {t("bulkSearch.noResults")}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {t("bulkSearch.searchFirst")}
          </p>
        </div>
      )}
    </div>
  );
};

export default BulkSearchPage;
