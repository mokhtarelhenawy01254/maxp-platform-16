import { Search as MagnifyingGlassIcon, Clipboard as ClipboardDocumentIcon, ExternalLink as ArrowTopRightOnSquareIcon, RefreshCw as ArrowPathIcon, ShoppingBag as ShoppingCartIcon, DollarSign as CurrencyDollarIcon, Clock as ClockIcon, AlertTriangle as ExclamationTriangleIcon, Filter as FunnelIcon, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/utils/formatters';
import React, { useEffect, useMemo, useState } from "react";
import { getDirection } from "../../i18n";
;
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { apiClient } from "../../services/apiClient";

interface IncompleteOrder {
  cartId: string;
  itemsCount: number;
  total: number;
  checkoutData?: Record<string, any>;
  checkoutStartedAt?: string;
  checkoutUpdatedAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  status?: "lost" | "incomplete";
}

const getValueTier = (total: number) => {
  if (total >= 1000) return "high";
  if (total >= 300) return "medium";
  return "low";
};

const getValueColor = (tier: string) => {
  switch (tier) {
    case "high": return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800";
    case "medium": return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800";
    default: return "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
  }
};

const getValueLabel = (tier: string, t: any) => {
  switch (tier) {
    case "high": return t("orders.valueHigh");
    case "medium": return t("orders.valueMedium");
    default: return t("orders.valueLow");
  }
};

const IncompleteOrders: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  const [orders, setOrders] = useState<IncompleteOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const getGovernorate = (order: IncompleteOrder) => {
    const data = order.checkoutData || {};
    return data.governorate || data.city || data.gov || "";
  };

  const getExpiresIn = (order: IncompleteOrder) => {
    if (!order.expiresAt) return null;
    const now = new Date();
    const expires = new Date(order.expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    if (diffMs <= 0) return null;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    if (diffHours >= 24) return `${Math.round(diffHours / 24)}d`;
    return `${diffHours}h`;
  };

  const lostValue = useMemo(() => {
    return orders
      .filter((o) => o.status === "lost")
      .reduce((sum, o) => sum + (o.total || 0), 0);
  }, [orders]);

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== "lost").length;
    const lost = orders.filter((o) => o.status === "lost").length;
    const activeValue = orders
      .filter((o) => o.status !== "lost")
      .reduce((s, o) => s + (o.total || 0), 0);
    const lostV = orders
      .filter((o) => o.status === "lost")
      .reduce((s, o) => s + (o.total || 0), 0);
    return { active, lost, activeValue, lostValue: lostV };
  }, [orders]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const fetchIncompleteOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const params: Record<string, string | number> = { page, limit };
        if (search) params.search = search;
        if (statusFilter && statusFilter !== "all") params.status = statusFilter;
        params.hasPhone = true;

        const response = await apiClient.get("/orders-new/incomplete", { params });
        const data = response.data;

        if (data?.success) {
          setOrders(Array.isArray(data.data) ? data.data : []);
          setTotalOrders(data.pagination?.total || 0);
          setTotalPages(data.pagination?.pages || 1);
        } else {
          setOrders([]);
          setTotalOrders(0);
          setTotalPages(1);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || t("orders.loadingOrders"));
      } finally {
        setLoading(false);
      }
    };

    fetchIncompleteOrders();
  }, [page, limit, search, statusFilter, t, refreshKey]);

  const getCustomerName = (order: IncompleteOrder) => {
    const data = order.checkoutData || {};
    return (
      data.guestName ||
      data.fullName ||
      data.customerName ||
      data.customerFullName ||
      data.name ||
      null
    );
  };

  const getCustomerContact = (order: IncompleteOrder) => {
    const data = order.checkoutData || {};
    const phone =
      data.guestPhone ||
      data.customerPhone ||
      data.phoneNumber ||
      data.mobileNumber ||
      data.phone ||
      data.mobile ||
      "";
    const email =
      data.guestEmail ||
      data.customerEmail ||
      data.emailAddress ||
      data.email ||
      "";
    return { phone, email };
  };

  const getLastUpdated = (order: IncompleteOrder) => {
    return order.checkoutUpdatedAt || order.updatedAt || order.checkoutStartedAt || "";
  };

  const getRelativeTime = (dateStr: string) => {
    if (!dateStr) return "";
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return "";
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return t("orders.justNow");
    if (minutes < 60) return t("orders.minutesAgo", { count: minutes });
    if (hours < 24) return t("orders.hoursAgo", { count: hours });
    if (days < 7) return t("orders.daysAgo", { count: days });
    return formatDate(dateStr);
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const d = date.toLocaleDateString("en-CA");
      const t = date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return `${d} ${t}`;
    } catch {
      return dateStr;
    }
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

  const handleRetry = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const statCards = [
    {
      label: t("orders.total"),
      value: totalOrders,
      icon: ShoppingCartIcon,
      color: "text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30",
    },
    {
      label: t("orders.incompleteStatusActive"),
      value: stats.active,
      sub: formatPrice(stats.activeValue),
      icon: ClockIcon,
      color: "text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/30",
    },
    {
      label: t("orders.incompleteStatusLost"),
      value: stats.lost,
      sub: formatPrice(stats.lostValue),
      icon: ExclamationTriangleIcon,
      color: "text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-900/30",
    },
    {
      label: t("orders.totalValue"),
      value: formatPrice(lostValue + stats.activeValue),
      icon: CurrencyDollarIcon,
      color: "text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30",
    },
  ];

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
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="incomplete-orders-search"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("orders.incompleteSearchPlaceholder")}
              className="w-full pr-10 pl-10 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm placeholder-gray-400 focus:bg-white dark:focus:bg-gray-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
            <button
              type="button"
              onClick={handleRetry}
              className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title={t("orders.incompleteRetry")}
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right min-w-[1020px]">
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
                    {Array.from({ length: 7 }).map((__, cellIdx) => (
                      <td key={`skeleton-${idx}-${cellIdx}`} className="px-5 py-4">
                        <div
                          className="h-4 rounded-md bg-gray-100 dark:bg-gray-700 animate-pulse"
                          style={{ width: `${60 + Math.random() * 30}%` }}
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
                  const contact = getCustomerContact(order);
                  const lastUpdated = getLastUpdated(order);
                  const name = getCustomerName(order);
                  const valueTier = getValueTier(order.total || 0);
                  const governorate = getGovernorate(order);
                  const expiresIn = getExpiresIn(order);

                  return (
                    <tr
                      key={order.cartId}
                      className={`group border-b border-gray-50 dark:border-gray-700/50 last:border-0 transition-all hover:bg-blue-50/40 dark:hover:bg-blue-900/10 ${
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
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-sm font-medium transition-colors group-hover:shadow-sm ${getValueColor(valueTier)}">
                          <span>{formatPrice(order.total || 0)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-gray-600 dark:text-gray-300" title={lastUpdated ? formatDateTime(lastUpdated) : ""}>
                          {lastUpdated ? getRelativeTime(lastUpdated) : "-"}
                        </div>
                        {lastUpdated && (
                          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {formatDateTime(lastUpdated)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
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
                          {order.status === "lost"
                            ? t("orders.incompleteStatusLost")
                            : t("orders.incompleteStatusActive")}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                          <Link
                            to={`/orders/incomplete/${encodeURIComponent(order.cartId)}`}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 dark:hover:border-blue-800 transition-all"
                            title={t("orders.incompleteViewDetails")}
                          >
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleCopyCartId(order.cartId)}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-all"
                            title={t("orders.incompleteCopyId")}
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
              <ChevronRightIcon className="h-4 w-4" />
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
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncompleteOrders;
