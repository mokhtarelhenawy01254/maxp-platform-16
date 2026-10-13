import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  returnService,
  ReturnRequest,
  ReviewDisplayConfig,
} from "../../services/returnService";
import { toast } from "sonner";
import { RefreshCw, Clock, Eye, Package, CalendarDays, Copy } from "lucide-react";
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

  // Categories for responsible party names
  const [categories, setCategories] = useState<any[]>([]);
  const responsiblePartyLabel = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach((cat: any) => {
      if (!m[cat.defaultRole]) m[cat.defaultRole] = cat.name;
    });
    return (role?: string | null) => (role ? m[role] || role : "-");
  }, [categories]);

  // Filters & Search
  const [searchParams, setSearchParams] = useSearchParams();
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") ?? "");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Order statuses for secondary filter
  const [orderStatuses, setOrderStatuses] = useState<{ code: string; label: string }[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Review Tab: "pending" = unreviewed (default), "reviewed" = completed
  const [reviewTab, setReviewTab] = useState<"pending" | "reviewed">(
    searchParams.get("tab") === "reviewed" ? "reviewed" : "pending",
  );
  // ?preview=1 -> auto-open the details modal (عرض التفاصيل) for the first loaded request
  const previewRequested = searchParams.get("preview") === "1";
  const previewAppliedRef = useRef(false);

  const handleReviewTabChange = (tab: "pending" | "reviewed") => {
    setReviewTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === "pending") next.delete("tab");
    else next.set("tab", "reviewed");
    setSearchParams(next, { replace: true });
  };

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
      if (previewRequested && !previewAppliedRef.current && reqRes.data.data.length > 0) {
        previewAppliedRef.current = true;
        setSelectedRequest(reqRes.data.data[0]);
      }
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

  // Load categories for responsible party names
  useEffect(() => {
    returnService.getCategories().then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  const copyTracking = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('returns.k_225'));
    } catch {
      toast.error(t('returns.k_226'));
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
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      {/* Unified Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-border/80 bg-muted/40 text-foreground">
            <Package className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {t('returns.k_140')}
              </h1>
              <span className="font-mono text-xs tabular-nums px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground bg-muted/30">
                {total}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {reviewTab === "pending" ? "طلبات الإرجاع التي لم تراجع بعد" : "طلبات الإرجاع التي تمت مراجعتها"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/80 bg-background/80 hover:bg-muted text-foreground transition active:scale-[0.98]"
            title={t('returns.k_20')}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {/* Single-Surface Telemetry Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 dark:border-border/60 bg-card/60 backdrop-blur-xs divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-border/60 overflow-hidden shadow-2xs">
        <div className="p-3.5 sm:p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>إجمالي المرتجعات</span>
            <Package className="size-3.5 text-primary" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
            {total}
          </p>
          <p className="text-[11px] text-muted-foreground">
            كافة طلبات المرتجعات المسجلة
          </p>
        </div>

        <div className="p-3.5 sm:p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-amber-500" />
              بانتظار المراجعة
            </span>
            <Clock className="size-3.5 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
            {reviewTab === "pending" ? total : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            تحتاج اتخاذ قرار مالي أو إداري
          </p>
        </div>

        <div className="p-3.5 sm:p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              تمت المراجعة
            </span>
            <Package className="size-3.5 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
            {reviewTab === "reviewed" ? total : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            تم فحصها واعتماد التسوية
          </p>
        </div>

        <div className="p-3.5 sm:p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>الصفحة الحالية</span>
            <CalendarDays className="size-3.5 text-blue-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
            {page} / {totalPages}
          </p>
          <p className="text-[11px] text-muted-foreground">
            20 طلب في الصفحة
          </p>
        </div>
      </div>

      {/* Main Single Chassis: Integrated Ribbon + Table + Pagination */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card/40 backdrop-blur-xs overflow-hidden shadow-2xs">
        {/* Integrated Ribbon */}
        <div className="border-b border-border/70 p-3 sm:p-3.5 bg-muted/20 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            {/* Review Segmented Control */}
            <div className="inline-flex items-center gap-1 p-1 bg-background/80 border border-border/80 rounded-lg">
              <button
                type="button"
                onClick={() => handleReviewTabChange("pending")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition active:scale-[0.98] ${
                  reviewTab === "pending"
                    ? "bg-muted text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="size-1.5 rounded-full bg-amber-500" />
                <span>بانتظار المراجعة</span>
              </button>
              <button
                type="button"
                onClick={() => handleReviewTabChange("reviewed")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition active:scale-[0.98] ${
                  reviewTab === "reviewed"
                    ? "bg-muted text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>تمت المراجعة</span>
              </button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {orderStatuses.length > 0 && (
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="h-8 px-2 text-xs border border-border/80 rounded-lg bg-background/80 text-foreground"
                >
                  <option value="">{t('returns.k_13')}</option>
                  {orderStatuses.map((s) => (
                    <option key={s.code} value={s.code}>{s.label}</option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 w-28 px-2 text-xs border border-border/80 rounded-lg bg-background/80 text-foreground font-mono"
                  title={t('returns.k_150')}
                />
                <span>-</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 w-28 px-2 text-xs border border-border/80 rounded-lg bg-background/80 text-foreground font-mono"
                  title={t('returns.k_151')}
                />
              </div>

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('returns.k_19')}
                className="h-8 px-3 text-xs border border-border/80 rounded-lg bg-background/80 text-foreground placeholder-muted-foreground max-w-xs flex-1"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/60 text-right">
            <thead className="bg-muted/30 text-xs font-semibold text-muted-foreground">
              <tr>
                {displayConfig?.showOrderColumn !== false && (
                  <th className="px-4 py-2.5">
                    {t('returns.k_143')}
                  </th>
                )}
                {displayConfig?.showCustomerColumn !== false && (
                  <th className="px-4 py-2.5">
                    {t('returns.k_49')}
                  </th>
                )}
                {displayConfig?.showReasonColumn !== false && (
                  <th className="px-4 py-2.5">
                    {t('returns.k_57')}
                  </th>
                )}
                {displayConfig?.showResponsiblePartyColumn !== false && (
                  <th className="px-4 py-2.5">
                    {t('returns.k_59')}
                  </th>
                )}
                {displayConfig?.showTrackingColumn !== false && (
                  <th className="px-4 py-2.5">
                    {t('returns.k_221')}
                  </th>
                )}
                {displayConfig?.showFinancialColumn !== false && (
                  <th className="px-4 py-2.5">
                    {t('returns.k_227')}
                  </th>
                )}
                {displayConfig?.showDateColumn !== false && (
                  <th className="px-4 py-2.5">
                    {t('returns.k_65')}
                  </th>
                )}
                {displayConfig?.showActionsColumn !== false && (
                  <th className="px-4 py-2.5 text-center">
                    {t('returns.k_67')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={99} className="text-center py-12 text-muted-foreground space-y-2">
                    <RefreshCw className="size-5 animate-spin mx-auto text-primary" />
                    <p>{t('returns.k_144')}</p>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={99} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package size={32} className="opacity-40" />
                      <span className="text-xs">{t('returns.k_145')}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="hover:bg-muted/20 transition-colors">
                    {displayConfig?.showOrderColumn !== false && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-foreground">
                          {request.order?.orderNumber || t('returns.k_21')}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
                          {request.refundAmount
                            ? `${request.refundAmount} ${request.order?.currency || t('returns.k_22')}`
                            : "—"}
                        </div>
                      </td>
                    )}
                    {displayConfig?.showCustomerColumn !== false && (
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground flex items-center gap-1.5">
                          <span>{request.customer?.firstName} {request.customer?.lastName}</span>
                          {displayConfig?.showCustomerRating !== false && getRatingBadge(request.customer?.customerRating)}
                        </div>
                        {displayConfig?.showCustomerPhone !== false && (
                          <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
                            {request.customer?.phone}
                          </div>
                        )}
                        {displayConfig?.showCustomerSuccessScore !== false && (
                          <div className="font-mono text-[10px] text-muted-foreground tabular-nums">
                            نسبة النجاح: {request.customer?.successScore?.toFixed(1)}%
                          </div>
                        )}
                      </td>
                    )}
                    {displayConfig?.showReasonColumn !== false && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        {request.reason ? (
                          <>
                            <div className="text-foreground">{request.reason.reason}</div>
                            <div className="text-[11px] text-muted-foreground">{request.reason.category?.name}</div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                    {displayConfig?.showResponsiblePartyColumn !== false && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        {request.responsibleParty ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                              request.responsibleParty === "CUSTOMER"
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                                : request.responsibleParty === "STORE"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                  : "bg-muted text-muted-foreground border-border/60"
                            }`}
                          >
                            {responsiblePartyLabel(request.responsibleParty)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                    {displayConfig?.showTrackingColumn !== false && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        {request.trackingNumber ? (
                          <div className="flex items-center gap-1.5" dir="ltr">
                            <span className="font-mono text-xs text-muted-foreground" title={t('returns.k_223')}>
                              {request.trackingNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyTracking(request.trackingNumber!)}
                              className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                              title={t('returns.k_224')}
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                    {displayConfig?.showFinancialColumn !== false && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        {request.returnType && (
                          <div className="mb-1 flex items-center gap-1">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border/60 bg-muted/40 text-foreground">
                              {request.returnType.name}
                            </span>
                            {request.shippingCompany?.name && (
                              <span className="text-[10px] text-muted-foreground">
                                {request.shippingCompany.name}
                              </span>
                            )}
                          </div>
                        )}
                        {(request.shippingReturnCost !== undefined && request.shippingReturnCost !== null) ||
                        (request.settlementAmount !== undefined && request.settlementAmount !== null) ? (
                          <div className="font-mono text-[11px] tabular-nums space-y-0.5">
                            {request.shippingReturnCost !== undefined && request.shippingReturnCost !== null && (
                              <div className="text-rose-600 dark:text-rose-400">
                                {t('returns.k_228')}: {request.shippingReturnCost} {request.order?.currency || t('returns.k_22')}
                              </div>
                            )}
                            {request.settlementAmount !== undefined && request.settlementAmount !== null && (
                              <div className={request.settlementAmount >= 0 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-rose-600 dark:text-rose-400 font-bold"}>
                                {t('returns.k_229')}: {request.settlementAmount} {request.order?.currency || t('returns.k_22')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                    {displayConfig?.showDateColumn !== false && (
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-muted-foreground" title={t('returns.k_222')}>
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                    )}
                    {displayConfig?.showActionsColumn !== false && (
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(request)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-border/80 bg-background/80 hover:bg-muted text-foreground transition active:scale-[0.98]"
                          title={t('returns.k_24')}
                        >
                          <Eye size={13} className="text-muted-foreground" />
                          <span>عرض</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Unified Pagination Bar */}
        {totalPages > 1 && (
          <div className="border-t border-border/70 p-3 bg-muted/10 flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">
              {t('returns.k_149')} {total} · صفحة {page} من {totalPages}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 px-2.5 text-xs font-medium rounded border border-border/80 bg-background/80 hover:bg-muted text-foreground disabled:opacity-40 transition active:scale-[0.98]"
              >
                السابق
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center gap-1">
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-xs text-muted-foreground">…</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPage(p)}
                      className={`h-7 min-w-7 px-2 text-xs font-mono tabular-nums rounded transition ${
                        page === p
                          ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                          : "border border-border/80 bg-background/80 hover:bg-muted text-foreground"
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-7 px-2.5 text-xs font-medium rounded border border-border/80 bg-background/80 hover:bg-muted text-foreground disabled:opacity-40 transition active:scale-[0.98]"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

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
