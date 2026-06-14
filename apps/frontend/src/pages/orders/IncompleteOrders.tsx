import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  MagnifyingGlassIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
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

        const params: Record<string, string | number> = {
          page,
          limit,
        };

        if (search) params.search = search;
        if (statusFilter && statusFilter !== "all") params.status = statusFilter;

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
      t("orders.notSpecified")
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

  const getStatusLabel = (order: IncompleteOrder) => {
    return order.status === "lost"
      ? t("orders.incompleteStatusLost")
      : t("orders.incompleteStatusActive");
  };

  const getStatusClasses = (order: IncompleteOrder) => {
    return order.status === "lost"
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-700";
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

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("orders.incompleteTitle")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("orders.incompleteSubtitle")}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <label htmlFor="incomplete-orders-search" className="sr-only">
              {t("orders.incompleteSearchLabel")}
            </label>
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              id="incomplete-orders-search"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("orders.incompleteSearchPlaceholder")}
              className="w-full pr-10 pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
            />
          </div>
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
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
          >
            <option value="all">{t("orders.incompleteStatusAll")}</option>
            <option value="active">{t("orders.incompleteStatusActive")}</option>
            <option value="lost">{t("orders.incompleteStatusLost")}</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right min-w-[920px]">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300">
                  {t("orders.customer")}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300">
                  {t("orders.contact")}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300">
                  {t("orders.itemsCount")}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300">
                  {t("orders.amount")}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300">
                  {t("orders.lastUpdated")}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300">
                  {t("orders.status")}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300">
                  {t("orders.incompleteActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="border-t border-gray-100 dark:border-gray-700">
                    {Array.from({ length: 7 }).map((__, cellIdx) => (
                      <td key={`skeleton-${idx}-${cellIdx}`} className="px-4 py-4">
                        <div className="h-4 w-full rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-red-500 space-y-3">
                    <div>{error}</div>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:border-red-700/40 dark:text-red-300"
                    >
                      {t("orders.incompleteRetry")}
                    </button>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    <p className="font-medium">{t("orders.incompleteNoOrders")}</p>
                    <p className="text-sm mt-1">{t("orders.incompleteNoOrdersDesc")}</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const contact = getCustomerContact(order);
                  const lastUpdated = getLastUpdated(order);
                  return (
                    <tr
                      key={order.cartId}
                      className="border-t border-gray-100 dark:border-gray-700"
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {getCustomerName(order)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t("orders.cartId")}:{" "}
                          <span className="font-mono" title={order.cartId}>
                            {order.cartId}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {contact.phone || t("orders.notSpecified")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {contact.email || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {order.itemsCount || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {formatPrice(order.total || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                        {lastUpdated ? formatDate(lastUpdated) : t("orders.notSpecified")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(order)}`}
                        >
                          {getStatusLabel(order)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/orders/incomplete/${encodeURIComponent(order.cartId)}`}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200"
                          >
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                            {t("orders.incompleteViewDetails")}
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleCopyCartId(order.cartId)}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200"
                          >
                            <ClipboardDocumentIcon className="h-4 w-4" />
                            {t("orders.incompleteCopyId")}
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
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div>
            {t("orders.showing")} {(page - 1) * limit + 1} {t("orders.to")} {Math.min(page * limit, totalOrders)} {t("orders.of")} {totalOrders} {t("orders.orders2")}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-50"
            >
              {t("orders.previous")}
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-50"
            >
              {t("orders.next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncompleteOrders;
