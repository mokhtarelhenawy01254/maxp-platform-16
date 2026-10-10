import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDirection } from "../../i18n";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ClockIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { useAuth } from "../../hooks/useAuthSimple";
import { useCompany } from "../../contexts/CompanyContext";
import { apiClient } from "../../services/apiClient";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import IncompleteCancelModal from "./components/IncompleteCancelModal";
import OrderAttributionCard from "./components/OrderAttributionCard";
import OrderSessionDetailsCard from "./components/OrderSessionDetailsCard";
import {
  ORDER_CAMPAIGN_ATTRIBUTION_APP_SLUGS,
  getCurrentCompanyActiveApps,
  hasAnyCompanyAppSlug,
  normalizeCompanyAppSlug,
} from "../../utils/companyApps";
import {
  AbandonReason,
  IncompleteConvertResponse,
  IncompleteDetailsResponse,
  IncompleteOrderDetailsData,
  formatDateTimeCompact,
  getAbandonReasonLabel,
  getCustomerContact,
  getCustomerName,
  getExpiryStatus,
  getRelativeTime,
  getStatusBadgeClasses,
  getStatusLabel,
} from "./incompleteUtils";

const CHECKOUT_FIELD_LABELS: Record<string, string> = {
  governorate: "orders.governorate",
  city: "orders.city",
  address: "orders.address",
  street: "orders.address",
  addressLine1: "orders.address",
  notes: "orders.notes",
  orderNotes: "orders.notes",
  paymentMethod: "orders.paymentMethod",
  shippingAddress: "orders.shippingAddress",
};

const CHECKOUT_HIDDEN_KEYS = new Set([
  "guestName", "name", "customerName", "customerFullName", "fullName",
  "guestPhone", "phone", "customerPhone", "phoneNumber", "mobileNumber", "mobile",
  "guestEmail", "email", "customerEmail", "emailAddress",
  "attribution", "campaignAttribution", "orderAttribution",
]);

const humanizeKey = (key: string) => {
  const words = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const getFieldLabel = (key: string, t: TFunction) => {
  const labelKey = CHECKOUT_FIELD_LABELS[key];
  if (labelKey) {
    const translated = t(labelKey);
    if (translated && translated !== labelKey) return translated;
  }
  return humanizeKey(key);
};

const IncompleteReasonCard: React.FC<{
  reason: AbandonReason;
  t: TFunction;
}> = ({ reason, t }) => {
  // "حقول ناقصة" تظهر فقط مع partial_shipping — evidence فيها أسماء الحقول
  const missingFields =
    reason.code === "partial_shipping" ? reason.evidence ?? [] : [];
  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-5 shadow-sm dark:border-amber-800/60 dark:bg-amber-900/10">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        <QuestionMarkCircleIcon className="h-4 w-4 text-amber-500 dark:text-amber-400" />
        {t("orders.incompleteReasonTitle")}
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          {getAbandonReasonLabel(reason, t)}
        </span>
        {missingFields.length > 0 && (
          <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
            <span className="font-medium text-gray-500 dark:text-gray-400">
              {t("orders.incompleteReasonMissingFields")}
            </span>
            {missingFields.map((key) => (
              <span
                key={key}
                className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                {getFieldLabel(key, t)}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
};

const IncompleteOrderDetails: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const { cartId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company } = useCompany();
  const decodedCartId = cartId ? decodeURIComponent(cartId) : "";

  const [order, setOrder] = useState<IncompleteOrderDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const isRTL = getDirection() === "rtl";
  const lang = i18n.language;

  const isMerchant = user?.role === "MERCHANT";
  const activeCompanyAppSlugSet = useMemo(
    () =>
      new Set(
        getCurrentCompanyActiveApps(user, company)
          .map(normalizeCompanyAppSlug)
          .filter(Boolean),
      ),
    [company, user],
  );
  const hasCampaignAttributionApp = hasAnyCompanyAppSlug(
    activeCompanyAppSlugSet,
    ORDER_CAMPAIGN_ATTRIBUTION_APP_SLUGS,
  );
  const canShowAttribution = !isMerchant && hasCampaignAttributionApp;

  useEffect(() => {
    const fetchDetails = async () => {
      if (!decodedCartId) return;
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get<IncompleteDetailsResponse>(`/orders-new/incomplete/${decodedCartId}`);
        const data = response.data;
        if (data?.success && data?.data) {
          setOrder(data.data);
        } else {
          setOrder(null);
          setError(t("orders.incompleteNoDetails"));
        }
      } catch (err) {
        const apiError = err as { response?: { data?: { message?: string } }; message?: string };
        setError(apiError.response?.data?.message || t("orders.incompleteNoDetails"));
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [decodedCartId, t, retryKey]);

  const customerInfo = useMemo(() => {
    const contact = getCustomerContact(order?.checkoutData);
    return {
      name: getCustomerName(order?.checkoutData) || t("orders.notSpecified"),
      phone: contact.phone,
      email: contact.email,
    };
  }, [order?.checkoutData, t]);

  const checkoutMetadata = useMemo(() => {
    if (!order?.checkoutData) return [] as Array<[string, unknown]>;
    return Object.entries(order.checkoutData).filter(
      ([key]) => !CHECKOUT_HIDDEN_KEYS.has(key),
    );
  }, [order?.checkoutData]);

  const lastActivity =
    order?.checkoutUpdatedAt || order?.updatedAt || order?.checkoutStartedAt || "";

  const expiry = order ? getExpiryStatus(order, t) : null;

  const buildWhatsAppUrl = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (!digits) return null;
    const msg = t("orders.incompleteWhatsAppMessage", {
      name: customerInfo.name,
      total: formatPrice(order?.total || 0),
    });
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  };

  const whatsappUrl = customerInfo.phone ? buildWhatsAppUrl(customerInfo.phone) : null;

  const handleConvertToOrder = async () => {
    if (!decodedCartId) return;
    setConverting(true);
    try {
      const response = await apiClient.post<IncompleteConvertResponse>(
        `/orders-new/incomplete/${encodeURIComponent(decodedCartId)}/convert`,
      );
      const data = response.data;
      if (data?.success) {
        toast.success(t("orders.incompleteConvertSuccess"));
        if (data?.conversionLogFailed) {
          toast.warning(t("orders.incompleteConvertLogFailed"), { duration: 8000 });
        }
        const orderNumber = data.data?.orderNumber || data.data?.id;
        if (orderNumber) {
          navigate(`/orders/${encodeURIComponent(String(orderNumber))}`);
        } else {
          navigate("/orders/incomplete");
        }
      } else {
        toast.error(data?.message || t("orders.incompleteConvertFailed"));
      }
    } catch (err: any) {
      const respData = err?.response?.data;
      if (respData?.code === 'EXISTING_CUSTOMER_ORDER') {
        const proceed = window.confirm(
          `${respData.message}\n\nهل تريد بالتأكيد إنشاء طلب إضافي لهذا العميل؟`
        );
        if (proceed) {
          try {
            const forceResponse = await apiClient.post<IncompleteConvertResponse>(
              `/orders-new/incomplete/${encodeURIComponent(decodedCartId)}/convert`,
              { force: true },
            );
            const forceData = forceResponse.data;
            if (forceData?.success) {
              toast.success(t("orders.incompleteConvertSuccess"));
              if (forceData?.conversionLogFailed) {
                toast.warning(t("orders.incompleteConvertLogFailed"), { duration: 8000 });
              }
              const orderNumber = forceData.data?.orderNumber || forceData.data?.id;
              if (orderNumber) {
                navigate(`/orders/${encodeURIComponent(String(orderNumber))}`);
              } else {
                navigate("/orders/incomplete");
              }
              return;
            }
          } catch (forceErr: any) {
            toast.error(forceErr?.response?.data?.message || forceErr?.message || t("orders.incompleteConvertFailed"));
            return;
          }
        } else {
          return;
        }
      }
      const apiError = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(apiError.response?.data?.message || apiError.message || t("orders.incompleteConvertFailed"));
    } finally {
      setConverting(false);
      setShowConfirm(false);
    }
  };

  const BackIcon = isRTL ? ArrowRightIcon : ArrowLeftIcon;

  return (
    <div className="space-y-6" dir={getDirection()}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("orders.incompleteDetailsTitle")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("orders.incompleteDetailsSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {order && (
            <>
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                disabled={converting || !customerInfo.phone}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30 transition-colors"
                title={!customerInfo.phone ? t("orders.incompleteConvertNoPhone") : ""}
              >
                {converting ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRightIcon className="h-4 w-4" />
                )}
                {converting ? t("orders.incompleteConverting") : t("orders.incompleteConvertToOrder")}
              </button>
              <button
                type="button"
                onClick={() => setCancelModalOpen(true)}
                disabled={converting}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30 transition-colors"
                title={t("orders.incompleteCancelOrder")}
              >
                <NoSymbolIcon className="h-4 w-4" />
                {t("orders.incompleteCancelOrder")}
              </button>
            </>
          )}
          <Link
            to="/orders/incomplete"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200"
          >
            <BackIcon className="h-4 w-4" />
            {t("orders.incompleteBack")}
          </Link>
        </div>
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
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-700/40 dark:bg-gray-800">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => setRetryKey((prev) => prev + 1)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
            {t("orders.incompleteRetry")}
          </button>
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
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClasses(order.status)}`}
                >
                  {getStatusLabel(order.status, t)}
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
              {lastActivity && (
                <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {getRelativeTime(lastActivity, t) || formatDateTimeCompact(lastActivity, lang)}
                </div>
              )}
            </div>
          </div>

          {order.abandonReason?.code && (
            <IncompleteReasonCard reason={order.abandonReason} t={t} />
          )}

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
                {customerInfo.phone && (
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`tel:${customerInfo.phone.replace(/\D/g, "")}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30 transition-colors"
                    >
                      <PhoneIcon className="h-3.5 w-3.5" />
                      {t("orders.incompleteCall")}
                    </a>
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30 transition-colors"
                      >
                        <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
                        {t("orders.incompleteWhatsApp")}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t("orders.incompleteItems")}
              </h2>
              <div className="mt-4 space-y-3">
                {order.items?.length ? (
                  <>
                    {order.items.map((item, index) => {
                      const name =
                        item.name || item.productName || item.title || t("orders.notSpecified");
                      const quantity = item.quantity ?? 1;
                      const price = Number(item.price ?? item.total ?? 0) || 0;
                      const lineTotal = quantity * price;
                      return (
                        <div
                          key={`${order.cartId}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {quantity} × {formatPrice(price)}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white shrink-0">
                            {formatPrice(lineTotal)}
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:text-white">
                      <span>{t("orders.total")}</span>
                      <span>{formatPrice(order.total || 0)}</span>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500 dark:border-gray-700">
                    {t("orders.incompleteNoDetails")}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:max-w-3xl">
            <OrderSessionDetailsCard
              sessionDetails={order.sessionDetails || order.checkoutData?.sessionDetails}
              firstOrderInfo={order.firstOrderInfo}
              customerPhone={customerInfo.phone}
              createdAt={order.checkoutStartedAt || order.updatedAt}
              orderGovernorate={order.checkoutData?.governorate}
              orderCity={order.checkoutData?.city}
            />
          </div>

          {canShowAttribution && order.attribution && (
            <div className="lg:max-w-3xl">
              <OrderAttributionCard
                order={{ metadata: { attribution: order.attribution } }}
              />
            </div>
          )}

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
                  {order.checkoutStartedAt && (
                    <div className="text-[11px] text-gray-400 dark:text-gray-500">
                      {formatDateTimeCompact(order.checkoutStartedAt, lang)}
                    </div>
                  )}
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
                  {order.checkoutUpdatedAt && (
                    <div className="text-[11px] text-gray-400 dark:text-gray-500">
                      {getRelativeTime(order.checkoutUpdatedAt, t) || formatDateTimeCompact(order.checkoutUpdatedAt, lang)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("orders.incompleteExpiresAt")}
                  </div>
                  <div className="mt-1">
                    {order.expiresAt ? formatDate(order.expiresAt) : t("orders.notSpecified")}
                  </div>
                  {expiry && (
                    <div
                      className={`inline-flex items-center gap-1 text-[11px] font-medium mt-1 ${
                        expiry.urgent
                          ? "text-red-500 dark:text-red-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      <ClockIcon className="h-3 w-3" />
                      {expiry.label}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
                {checkoutMetadata.length ? (
                  checkoutMetadata.map(([key, value]) => (
                    <div key={key}>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {getFieldLabel(key, t)}
                      </div>
                      <div className="mt-1 break-words">
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

      <ConfirmDialog
        open={showConfirm}
        title={t("orders.incompleteConfirmTitle")}
        content={t("orders.incompleteConfirmContent")}
        confirmLabel={t("orders.incompleteQuickConvert")}
        cancelLabel={t("orders.incompleteCancel")}
        confirmColor="success"
        onConfirm={handleConvertToOrder}
        onCancel={() => setShowConfirm(false)}
      />

      <IncompleteCancelModal
        open={cancelModalOpen}
        cartId={decodedCartId || null}
        customerName={customerInfo.name || null}
        customerPhone={customerInfo.phone || null}
        cartTotal={order?.total}
        onClose={() => setCancelModalOpen(false)}
        onSuccess={() => {
          navigate("/orders/incomplete");
        }}
      />
    </div>
  );
};

export default IncompleteOrderDetails;
