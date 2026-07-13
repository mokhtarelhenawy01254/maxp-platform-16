import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { apiClient } from "../../services/apiClient";

interface IncompleteOrderItem {
  name?: string;
  productName?: string;
  title?: string;
  quantity?: number;
  price?: number;
  total?: number;
  [key: string]: any;
}

interface IncompleteOrderDetailsData {
  cartId: string;
  items: IncompleteOrderItem[];
  itemsCount: number;
  total: number;
  checkoutData?: Record<string, any>;
  checkoutStartedAt?: string;
  checkoutUpdatedAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  status?: "lost" | "incomplete";
}

const IncompleteOrderDetails: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const { cartId } = useParams();
  const decodedCartId = cartId ? decodeURIComponent(cartId) : "";

  const [order, setOrder] = useState<IncompleteOrderDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!decodedCartId) return;
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get(`/orders-new/incomplete/${decodedCartId}`);
        const data = response.data;
        if (data?.success && data?.data) {
          setOrder(data.data);
        } else {
          setOrder(null);
          setError(t("orders.incompleteNoDetails"));
        }
      } catch (err: any) {
        setError(err.response?.data?.message || t("orders.incompleteNoDetails"));
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [decodedCartId, t]);

  const customerInfo = useMemo(() => {
    const data = order?.checkoutData || {};
    return {
      name:
        data.guestName ||
        data.fullName ||
        data.customerName ||
        data.customerFullName ||
        data.name ||
        t("orders.notSpecified"),
      phone:
        data.guestPhone ||
        data.customerPhone ||
        data.phoneNumber ||
        data.mobileNumber ||
        data.phone ||
        data.mobile ||
        "",
      email:
        data.guestEmail ||
        data.customerEmail ||
        data.emailAddress ||
        data.email ||
        "",
    };
  }, [order?.checkoutData, t]);

  const checkoutMetadata = useMemo(() => {
    if (!order?.checkoutData) return [] as Array<[string, any]>;
    const hiddenKeys = [
      "guestName",
      "name",
      "customerName",
      "guestPhone",
      "phone",
      "customerPhone",
      "guestEmail",
      "email",
      "customerEmail",
    ];
    return Object.entries(order.checkoutData).filter(
      ([key]) => !hiddenKeys.includes(key),
    );
  }, [order?.checkoutData]);

  const getStatusLabel = (status?: string) => {
    return status === "lost"
      ? t("orders.incompleteStatusLost")
      : t("orders.incompleteStatusActive");
  };

  const getStatusClasses = (status?: string) => {
    return status === "lost"
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-700";
  };

  const lastActivity =
    order?.checkoutUpdatedAt || order?.updatedAt || order?.checkoutStartedAt || "";

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("orders.incompleteDetailsTitle")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("orders.incompleteDetailsSubtitle")}
          </p>
        </div>
        <Link
          to="/orders/incomplete"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200"
        >
          <ArrowRightIcon className="h-4 w-4" />
          {t("orders.incompleteBack")}
        </Link>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="space-y-4 animate-pulse">
            <div className="h-6 w-1/3 rounded bg-gray-100 dark:bg-gray-700" />
            <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-gray-700" />
            <div className="h-24 w-full rounded bg-gray-100 dark:bg-gray-700" />
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-white p-6 text-center text-red-500 shadow-sm dark:border-red-700/40 dark:bg-gray-800">
          {error}
        </div>
      ) : order ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t("orders.status")}
              </div>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClasses(order.status)}`}
                >
                  {getStatusLabel(order.status)}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t("orders.itemsCount")}
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                {order.itemsCount}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t("orders.amount")}
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                {formatPrice(order.total || 0)}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t("orders.incompleteLastActivity")}
              </div>
              <div className="mt-2 text-sm text-gray-900 dark:text-white">
                {lastActivity ? formatDate(lastActivity) : t("orders.notSpecified")}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t("orders.incompleteCustomerInfo")}
              </h2>
              <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-200">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("orders.incompleteCustomerName")}
                  </div>
                  <div className="mt-1 font-medium">
                    {customerInfo.name}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("orders.incompleteContactPhone")}
                  </div>
                  <div className="mt-1 font-medium">
                    {customerInfo.phone || t("orders.notSpecified")}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("orders.incompleteContactEmail")}
                  </div>
                  <div className="mt-1 font-medium">
                    {customerInfo.email || t("orders.notSpecified")}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("orders.cartId")}
                  </div>
                  <div className="mt-1 font-mono text-xs text-gray-600 dark:text-gray-300">
                    {order.cartId}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t("orders.incompleteItems")}
              </h2>
              <div className="mt-4 space-y-3">
                {order.items?.length ? (
                  order.items.map((item, index) => {
                    const name =
                      item.name || item.productName || item.title || t("orders.notSpecified");
                    const quantity = item.quantity ?? 1;
                    const price = item.price ?? item.total ?? 0;
                    return (
                      <div
                        key={`${order.cartId}-${index}`}
                        className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {t("orders.itemsCount")}:
                            <span className="ml-1 font-medium">{quantity}</span>
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatPrice(price)}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500 dark:border-gray-700">
                    {t("orders.incompleteNoDetails")}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("orders.incompleteCheckoutData")}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("orders.incompleteStartedAt")}
                  </div>
                  <div className="mt-1">
                    {order.checkoutStartedAt
                      ? formatDate(order.checkoutStartedAt)
                      : t("orders.notSpecified")}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("orders.incompleteUpdatedAt")}
                  </div>
                  <div className="mt-1">
                    {order.checkoutUpdatedAt
                      ? formatDate(order.checkoutUpdatedAt)
                      : t("orders.notSpecified")}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("orders.incompleteExpiresAt")}
                  </div>
                  <div className="mt-1">
                    {order.expiresAt ? formatDate(order.expiresAt) : t("orders.notSpecified")}
                  </div>
                </div>
              </div>
              <div className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
                {checkoutMetadata.length ? (
                  checkoutMetadata.map(([key, value]) => (
                    <div key={key}>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {key}
                      </div>
                      <div className="mt-1">
                        {typeof value === "string"
                          ? value
                          : JSON.stringify(value)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500 dark:border-gray-700">
                    {t("orders.incompleteNoDetails")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {t("orders.incompleteNoDetails")}
        </div>
      )}
    </div>
  );
};

export default IncompleteOrderDetails;
