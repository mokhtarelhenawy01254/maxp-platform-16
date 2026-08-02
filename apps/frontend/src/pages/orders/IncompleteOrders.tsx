import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDirection } from "../../i18n";
import {
  MagnifyingGlassIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCurrency } from "../../hooks/useCurrency";
import { apiClient } from "../../services/apiClient";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import {
  IncompleteConvertResponse,
  IncompleteListResponse,
  IncompleteOrder,
  IncompleteStats,
  formatDateTimeCompact,
  getCustomerContact,
  getCustomerName,
  getExpiryStatus,
  getGovernorate,
  getLastUpdated,
  getRelativeTime,
  getStatusLabel,
  getValueColor,
  getValueLabel,
  getValueTier,
} from "./incompleteUtils";

type SortValue = "recent" | "value_desc" | "value_asc";

type PhoneFilter = "all" | "with_phone" | "no_phone";

interface IncompleteListParams {
  page: number;
  limit: number;
  hasPhone?: boolean;
  search?: string;
  status?: string;
  sortBy?: string;
  sortDir?: string;
}

const SKELETON_WIDTHS = [72, 55, 30, 45, 60, 35, 50];

const escapeCsv = (value: unknown) => {
  const str = value == null ? "" : String(value);
  return `"${str.replace(/"/g, '""')}"`;
};

const IncompleteOrders: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<IncompleteOrder[]>([]);
  const [serverStats, setServerStats] = useState<IncompleteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [phoneFilter, setPhoneFilter] = useState<PhoneFilter>("with_phone");
  const [sortValue, setSortValue] = useState<SortValue>("recent");
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmConvertCartId, setConfirmConvertCartId] = useState<string | null>(null);
  const [convertingCartId, setConvertingCartId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const isRTL = getDirection() === "rtl";
  const lang = i18n.language;

  const fallbackStats = useMemo(() => {
    const active = orders.filter((o) => o.status !== "lost");
    const lost = orders.filter((o) => o.status === "lost");
    return {
      total: totalOrders,
      active: active.length,
      lost: lost.length,
      totalValue: active.reduce((s, o) => s + (o.total || 0), 0) + lost.reduce((s, o) => s + (o.total || 0), 0),
      activeValue: active.reduce((s, o) => s + (o.total || 0), 0),
      lostValue: lost.reduce((s, o) => s + (o.total || 0), 0),
    };
  }, [orders, totalOrders]);

  const stats = serverStats || fallbackStats;
  const statsAreServer = !!serverStats;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const buildParams = useCallback(
    (pageIndex: number, pageSize: number): IncompleteListParams => {
      const params: IncompleteListParams = {
        page: pageIndex,
        limit: pageSize,
      };
      if (phoneFilter === "with_phone") params.hasPhone = true;
      else if (phoneFilter === "no_phone") params.hasPhone = false;
      if (search) params.search = search;
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (sortValue === "recent") {
        params.sortBy = "checkoutUpdatedAt";
        params.sortDir = "desc";
      } else if (sortValue === "value_desc") {
        params.sortBy = "total";
        params.sortDir = "desc";
      } else if (sortValue === "value_asc") {
        params.sortBy = "total";
        params.sortDir = "asc";
      }
      return params;
    },
    [search, statusFilter, sortValue, phoneFilter],
  );

  useEffect(() => {
    const fetchIncompleteOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.get<IncompleteListResponse>("/orders-new/incomplete", {
          params: buildParams(page, limit),
        });
        const data = response.data;

        if (data?.success) {
          setOrders(Array.isArray(data.data) ? data.data : []);
          setTotalOrders(data.pagination?.total || 0);
          setTotalPages(data.pagination?.pages || 1);
          setServerStats(data.stats || null);
        } else {
          setOrders([]);
          setTotalOrders(0);
          setTotalPages(1);
          setServerStats(null);
        }
      } catch (err) {
        const apiError = err as { response?: { data?: { message?: string } }; message?: string };
        setError(apiError.response?.data?.message || t("orders.loadingOrders"));
      } finally {
        setLoading(false);
      }
    };

    fetchIncompleteOrders();
  }, [page, limit, buildParams, t, refreshKey]);

  const handleRetry = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleCopyCartId = async (cartId: string) => {
    if (!cartId) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(cartId);
      } else {
        const tempInput = document.createElement("input");
        tempInput.value = cartId;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
      }
      toast.success(t("orders.incompleteCopied"));
    } catch (copyError) {
      toast.error(t("orders.incompleteCopyFailed"));
    }
  };

  const handleConvert = async (cartId: string) => {
    if (!cartId) return;
    setConvertingCartId(cartId);
    try {
      const response = await apiClient.post<IncompleteConvertResponse>(
        `/orders-new/incomplete/${encodeURIComponent(cartId)}/convert`,
      );
      const data = response.data;
      if (data?.success) {
        toast.success(t("orders.incompleteConvertSuccess"));
        setConfirmConvertCartId(null);
        handleRetry();
      } else {
        toast.error(data?.message || t("orders.incompleteConvertFailed"));
      }
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(apiError.response?.data?.message || apiError.message || t("orders.incompleteConvertFailed"));
    } finally {
      setConvertingCartId(null);
    }
  };

  const buildWhatsAppUrl = (phone: string, name: string | null, total: number) => {
    const digits = phone.replace(/\D/g, "");
    if (!digits) return null;
    const msg = t("orders.incompleteWhatsAppMessage", {
      name: name || t("orders.notSpecified"),
      total: formatPrice(total),
    });
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const all: IncompleteOrder[] = [];
      const pageSize = 100;
      let pageIndex = 1;
      let total = 1;
      while ((pageIndex - 1) * pageSize < total) {
        const response = await apiClient.get<IncompleteListResponse>("/orders-new/incomplete", {
          params: buildParams(pageIndex, pageSize),
        });
        const data = response.data;
        if (!data?.success) break;
        all.push(...(Array.isArray(data.data) ? data.data : []));
        total = data.pagination?.total || 0;
        pageIndex += 1;
      }

      if (!all.length) {
        toast.error(t("orders.incompleteExportFailed"));
        return;
      }

      const headers = [
        t("orders.cartId"),
        t("orders.customerName"),
        t("orders.phone"),
        t("orders.incompleteContactEmail"),
        t("orders.governorate"),
        t("orders.itemsCount"),
        t("orders.total"),
        t("orders.status"),
        t("orders.lastUpdated"),
      ];
      const rows = all.map((o) => {
        const contact = getCustomerContact(o.checkoutData);
        const name = getCustomerName(o.checkoutData);
        return [
          o.cartId,
          name || "",
          contact.phone,
          contact.email,
          getGovernorate(o.checkoutData),
          o.itemsCount || 0,
          o.total || 0,
          getStatusLabel(o.status, t),
          getLastUpdated(o),
        ];
      });
      const csv = "\uFEFF" + [headers, ...rows]
        .map((row) => row.map(escapeCsv).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `incomplete-orders-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(apiError.response?.data?.message || apiError.message || t("orders.incompleteExportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const statCards = [
    {
      label: t("orders.total"),
      value: stats.total,
      icon: ShoppingCartIcon,
      color: "text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30",
      sub: statsAreServer ? undefined : t("orders.incompletePageStats"),
    },
    {
      label: t("orders.incompleteStatusActive"),
      value: stats.active,
      icon: ClockIcon,
      color: "text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/30",
      sub: statsAreServer
        ? formatPrice(stats.activeValue)
        : `${formatPrice(stats.activeValue)} · ${t("orders.incompletePageStats")}`,
    },
    {
      label: t("orders.incompleteStatusLost"),
      value: stats.lost,
      icon: ExclamationTriangleIcon,
      color: "text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-900/30",
      sub: statsAreServer
        ? formatPrice(stats.lostValue)
        : `${formatPrice(stats.lostValue)} · ${t("orders.incompletePageStats")}`,
    },
    {
      label: t("orders.totalValue"),
      value: formatPrice(stats.totalValue),
      icon: CurrencyDollarIcon,
      color: "text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30",
    },
  ];

  const PrevIcon = isRTL ? ChevronRightIcon : ChevronLeftIcon;
  const NextIcon = isRTL ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <div className="space-y-6" dir={getDirection()}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("orders.incompleteTitle")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {t("orders.incompleteSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/settings/orders?tab=incomplete"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Cog6ToothIcon className="h-4 w-4" />
            {t("orders.incompleteSettings")}
          </Link>
          <Link
            to="/orders/incomplete/reports"
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <ChartBarIcon className="h-4 w-4" />
            {t("orders.incompleteReports")}
          </Link>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowDownTrayIcon className="h-4 w-4" />
            )}
            {exporting ? t("orders.incompleteExporting") : t("orders.incompleteExport")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
            </div>
            {card.sub && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {card.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <label htmlFor="incomplete-orders-search" className="sr-only">
              {t("orders.incompleteSearchLabel")}
            </label>
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="incomplete-orders-search"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("orders.incompleteSearchPlaceholder")}
              className="w-full ps-10 pe-10 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm placeholder-gray-400 focus:bg-white dark:focus:bg-gray-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <FunnelIcon className="h-4 w-4 text-gray-400" />
            <label htmlFor="incomplete-orders-status" className="sr-only">
              {t("orders.incompleteStatusLabel")}
            </label>
            <select
              id="incomplete-orders-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all"
            >
              <option value="all">{t("orders.incompleteStatusAll")}</option>
              <option value="active">{t("orders.incompleteStatusActive")}</option>
              <option value="lost">{t("orders.incompleteStatusLost")}</option>
            </select>
            <label htmlFor="incomplete-orders-phone" className="sr-only">
              {t("orders.incompletePhoneLabel")}
            </label>
            <select
              id="incomplete-orders-phone"
              value={phoneFilter}
              onChange={(e) => {
                setPhoneFilter(e.target.value as PhoneFilter);
                setPage(1);
              }}
              className="px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all"
            >
              <option value="with_phone">{t("orders.incompletePhoneWith")}</option>
              <option value="no_phone">{t("orders.incompletePhoneWithout")}</option>
              <option value="all">{t("orders.incompletePhoneAll")}</option>
            </select>
            <label htmlFor="incomplete-orders-sort" className="sr-only">
              {t("orders.incompleteSort")}
            </label>
            <select
              id="incomplete-orders-sort"
              value={sortValue}
              onChange={(e) => {
                setSortValue(e.target.value as SortValue);
                setPage(1);
              }}
              className="px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all"
            >
              <option value="recent">{t("orders.incompleteSortLastUpdated")}</option>
              <option value="value_desc">{t("orders.incompleteSortValueDesc")}</option>
              <option value="value_asc">{t("orders.incompleteSortValueAsc")}</option>
            </select>
            <label htmlFor="incomplete-orders-per-page" className="sr-only">
              {t("orders.incompletePerPage")}
            </label>
            <select
              id="incomplete-orders-per-page"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <button
              type="button"
              onClick={handleRetry}
              className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title={t("orders.incompleteRetry")}
              aria-label={t("orders.incompleteRetry")}
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start min-w-[1100px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("orders.customer")}
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("orders.contact")}
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("orders.itemsCount")}
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("orders.amount")}
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("orders.lastUpdated")}
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("orders.status")}
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("orders.incompleteActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                    {SKELETON_WIDTHS.map((width, cellIdx) => (
                      <td key={`skeleton-${idx}-${cellIdx}`} className="px-5 py-4">
                        <div
                          className="h-4 rounded-md bg-gray-100 dark:bg-gray-700 animate-pulse"
                          style={{ width: `${width}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 rounded-full bg-red-50 dark:bg-red-900/20">
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                      </div>
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
                      <button
                        type="button"
                        onClick={handleRetry}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                        {t("orders.incompleteRetry")}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700">
                        <ShoppingCartIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {t("orders.incompleteNoOrders")}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {t("orders.incompleteNoOrdersDesc")}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order, idx) => {
                  const contact = getCustomerContact(order.checkoutData);
                  const lastUpdated = getLastUpdated(order);
                  const name = getCustomerName(order.checkoutData);
                  const valueTier = getValueTier(order.total || 0);
                  const governorate = getGovernorate(order.checkoutData);
                  const expiry = getExpiryStatus(order, t);
                  const whatsappUrl = buildWhatsAppUrl(contact.phone, name, order.total || 0);
                  const isConverting = convertingCartId === order.cartId;

                  return (
                    <tr
                      key={order.cartId}
                      onClick={() => navigate(`/orders/incomplete/${encodeURIComponent(order.cartId)}`)}
                      className={`group border-b border-gray-50 dark:border-gray-700/50 last:border-0 transition-all cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-900/10 ${
                        idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50/30 dark:bg-gray-800/50"
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                            {name ? name.charAt(0).toUpperCase() : "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[160px]">
                              {name || (
                                <span className="text-gray-400 dark:text-gray-500 italic">
                                  {t("orders.notSpecified")}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                              <span className="font-mono truncate max-w-[120px]" title={order.cartId}>
                                {order.cartId.slice(0, 12)}...
                              </span>
                              {governorate && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-600">·</span>
                                  <span>{governorate}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-gray-900 dark:text-white font-medium">
                          {contact.phone || (
                            <span className="text-gray-400 dark:text-gray-500">{t("orders.notSpecified")}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {contact.email || "-"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {order.itemsCount || 0}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {t("orders.items")}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-sm font-medium transition-colors group-hover:shadow-sm ${getValueColor(valueTier)}`}
                          title={getValueLabel(valueTier, t)}
                        >
                          <span>{formatPrice(order.total || 0)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-gray-600 dark:text-gray-300" title={lastUpdated ? formatDateTimeCompact(lastUpdated, lang) : ""}>
                          {lastUpdated ? getRelativeTime(lastUpdated, t) || formatDateTimeCompact(lastUpdated, lang) : "-"}
                        </div>
                        {lastUpdated && (
                          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {formatDateTimeCompact(lastUpdated, lang)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border w-fit ${
                              order.status === "lost"
                                ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                order.status === "lost" ? "bg-red-500" : "bg-amber-500"
                              }`}
                            />
                            {getStatusLabel(order.status, t)}
                          </span>
                          {expiry && (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                expiry.urgent
                                  ? "text-red-500 dark:text-red-400"
                                  : "text-gray-400 dark:text-gray-500"
                              }`}
                            >
                              <ClockIcon className="h-3 w-3" />
                              {expiry.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {contact.phone ? (
                            <a
                              href={`tel:${contact.phone.replace(/\D/g, "")}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 dark:hover:border-emerald-800 transition-all"
                              title={t("orders.incompleteCall")}
                              aria-label={t("orders.incompleteCall")}
                            >
                              <PhoneIcon className="h-4 w-4" />
                            </a>
                          ) : (
                            <span
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                              title={t("orders.incompleteNoPhoneToContact")}
                              aria-label={t("orders.incompleteNoPhoneToContact")}
                            >
                              <PhoneIcon className="h-4 w-4" />
                            </span>
                          )}
                          {whatsappUrl ? (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-green-50 hover:text-green-600 hover:border-green-200 dark:hover:bg-green-900/20 dark:hover:text-green-400 dark:hover:border-green-800 transition-all"
                              title={t("orders.incompleteWhatsApp")}
                              aria-label={t("orders.incompleteWhatsApp")}
                            >
                              <ChatBubbleLeftRightIcon className="h-4 w-4" />
                            </a>
                          ) : (
                            <span
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                              title={t("orders.incompleteNoPhoneToContact")}
                              aria-label={t("orders.incompleteNoPhoneToContact")}
                            >
                              <ChatBubbleLeftRightIcon className="h-4 w-4" />
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (contact.phone) {
                                setConfirmConvertCartId(order.cartId);
                              } else {
                                toast.error(t("orders.incompleteConvertNoPhone"));
                              }
                            }}
                            disabled={isConverting}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            title={t("orders.incompleteQuickConvert")}
                            aria-label={t("orders.incompleteQuickConvert")}
                          >
                            {isConverting ? (
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            ) : (
                              <ShoppingBagIcon className="h-4 w-4" />
                            )}
                          </button>
                          <Link
                            to={`/orders/incomplete/${encodeURIComponent(order.cartId)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 dark:hover:border-blue-800 transition-all"
                            title={t("orders.incompleteViewDetails")}
                            aria-label={t("orders.incompleteViewDetails")}
                          >
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCartId(order.cartId);
                            }}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-all"
                            title={t("orders.incompleteCopyId")}
                            aria-label={t("orders.incompleteCopyId")}
                          >
                            <ClipboardDocumentIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && orders.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-4 text-sm">
          <div className="text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {totalOrders}
            </span>{" "}
            {t("orders.orders2")}{" "}
            <span className="text-gray-300 dark:text-gray-600 mx-1">·</span>
            {t("orders.showing")}{" "}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {(page - 1) * limit + 1}
            </span>{" "}
            {t("orders.to")}{" "}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {Math.min(page * limit, totalOrders)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <PrevIcon className="h-4 w-4" />
              {t("orders.previous")}
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const pg = start + i;
                if (pg > totalPages) return null;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
                      pg === page
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t("orders.next")}
              <NextIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmConvertCartId}
        title={t("orders.incompleteConfirmTitle")}
        content={t("orders.incompleteConfirmContent")}
        confirmLabel={t("orders.incompleteQuickConvert")}
        cancelLabel={t("orders.incompleteCancel")}
        confirmColor="success"
        onConfirm={() => confirmConvertCartId && handleConvert(confirmConvertCartId)}
        onCancel={() => setConfirmConvertCartId(null)}
      />
    </div>
  );
};

export default IncompleteOrders;
