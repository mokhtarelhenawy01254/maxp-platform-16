import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDirection } from "../../i18n";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, RotateCw, AlertCircle, HelpCircle } from "lucide-react";
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
import { IncompleteActionBar } from "./incomplete/IncompleteActionBar";
import { IncompleteKpisGrid } from "./incomplete/IncompleteKpisGrid";
import { IncompleteCustomerCard } from "./incomplete/IncompleteCustomerCard";
import { IncompleteCartItemsCard } from "./incomplete/IncompleteCartItemsCard";
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
} from "./incompleteUtils";
import {
  IncompleteReasonCard,
  CHECKOUT_HIDDEN_KEYS,
  getFieldLabel,
} from "./incomplete/IncompleteReasonCard";

export const IncompleteOrderDetails: React.FC = () => {
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
          .filter(Boolean)
      ),
    [company, user]
  );
  const hasCampaignAttributionApp = hasAnyCompanyAppSlug(
    activeCompanyAppSlugSet,
    ORDER_CAMPAIGN_ATTRIBUTION_APP_SLUGS
  );
  const canShowAttribution = !isMerchant && hasCampaignAttributionApp;

  useEffect(() => {
    const fetchDetails = async () => {
      if (!decodedCartId) return;
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get<IncompleteDetailsResponse>(
          `/orders-new/incomplete/${decodedCartId}`
        );
        const data = response.data;
        if (data?.success && data?.data) {
          setOrder(data.data);
        } else {
          setOrder(null);
          setError(t("orders.incompleteNoDetails") || "No details found");
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || t("orders.incompleteNoDetails") || "Failed to load");
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
      name: getCustomerName(order?.checkoutData) || t("orders.notSpecified") || "غير محدد",
      phone: contact.phone,
      email: contact.email,
    };
  }, [order?.checkoutData, t]);

  const checkoutMetadata = useMemo(() => {
    if (!order?.checkoutData) return [] as Array<[string, unknown]>;
    return Object.entries(order.checkoutData).filter(
      ([key]) => !CHECKOUT_HIDDEN_KEYS.has(key)
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
        `/orders-new/incomplete/${encodeURIComponent(decodedCartId)}/convert`
      );
      const data = response.data;
      if (data?.success) {
        toast.success(t("orders.incompleteConvertSuccess") || "Converted successfully");
        const orderNumber = data.data?.orderNumber || data.data?.id;
        if (orderNumber) {
          navigate(`/orders/${encodeURIComponent(String(orderNumber))}`);
        } else {
          navigate("/orders/incomplete");
        }
      } else {
        toast.error(data?.message || t("orders.incompleteConvertFailed") || "Conversion failed");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || t("orders.incompleteConvertFailed") || "Conversion failed");
    } finally {
      setConverting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-6xl mx-auto" dir={getDirection()}>
      {/* Top Action Bar */}
      <IncompleteActionBar
        hasOrder={Boolean(order)}
        converting={converting}
        hasCustomerPhone={Boolean(customerInfo.phone)}
        isRTL={isRTL}
        onConvertToOrder={() => setShowConfirm(true)}
        onOpenCancelModal={() => setCancelModalOpen(true)}
      />

      {loading ? (
        <div className="rounded-xl border border-border/70 bg-card p-8 shadow-xs text-center">
          <RotateCw className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-xs text-muted-foreground font-mono">جاري تحميل تفاصيل السلة المتروكة...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-xs">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-xs font-semibold text-destructive">{error}</p>
          <button
            type="button"
            onClick={() => setRetryKey((prev) => prev + 1)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-card px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>{t("orders.incompleteRetry") || "إعادة المحاولة"}</span>
          </button>
        </div>
      ) : order ? (
        <>
          {/* KPI Summary Grid */}
          <IncompleteKpisGrid
            status={order.status}
            itemsCount={order.itemsCount}
            total={order.total || 0}
            lastActivity={lastActivity}
            formatPrice={formatPrice}
            formatDate={formatDate}
            lang={lang}
          />

          {/* Reason Card */}
          {order.abandonReason?.code && (
            <IncompleteReasonCard reason={order.abandonReason} t={t} />
          )}

          {/* Customer & Items Grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <IncompleteCustomerCard
              customerInfo={customerInfo}
              cartId={order.cartId}
              whatsappUrl={whatsappUrl}
            />

            <IncompleteCartItemsCard
              items={order.items}
              cartId={order.cartId}
              total={order.total || 0}
              formatPrice={formatPrice}
            />
          </div>

          {/* Session Details */}
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

          {/* Attribution Card */}
          {canShowAttribution && order.attribution && (
            <div className="lg:max-w-3xl">
              <OrderAttributionCard
                order={{ metadata: { attribution: order.attribution } }}
              />
            </div>
          )}

          {/* Checkout Metadata */}
          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs">
            <h2 className="text-sm font-bold text-foreground">
              {t("orders.incompleteCheckoutData") || "بيانات جلسة الدفع الإضافية"}
            </h2>
            <div className="mt-3.5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium">
                    {t("orders.incompleteStartedAt") || "وقت البدء"}
                  </div>
                  <div className="mt-1 font-mono tabular-nums text-foreground">
                    {order.checkoutStartedAt
                      ? formatDate(order.checkoutStartedAt)
                      : t("orders.notSpecified") || "غير محدد"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium">
                    {t("orders.incompleteExpiresAt") || "وقت الانتهاء"}
                  </div>
                  <div className="mt-1 font-mono tabular-nums text-foreground">
                    {order.expiresAt ? formatDate(order.expiresAt) : t("orders.notSpecified") || "غير محدد"}
                  </div>
                  {expiry && (
                    <div
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold mt-1 ${
                        expiry.urgent ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {expiry.label}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3 text-xs">
                {checkoutMetadata.length ? (
                  checkoutMetadata.map(([key, value]) => (
                    <div key={key}>
                      <div className="text-[11px] text-muted-foreground font-medium">
                        {getFieldLabel(key, t)}
                      </div>
                      <div className="mt-1 break-words font-mono text-foreground">
                        {typeof value === "string" ? value : JSON.stringify(value)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                    {t("orders.incompleteNoDetails") || "لا توجد حقول إضافية مسجلة"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-border/70 bg-card p-8 text-center text-xs text-muted-foreground shadow-xs">
          {t("orders.incompleteNoDetails") || "لا توجد تفاصيل متاحة"}
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        title={t("orders.incompleteConfirmTitle") || "تحويل السلة لطلب"}
        content={t("orders.incompleteConfirmContent") || "هل أنت متأكد من رغبتك في تحويل هذه السلة إلى طلب حقيقي ومؤكد؟"}
        confirmLabel={t("orders.incompleteQuickConvert") || "تحويل الآن"}
        cancelLabel={t("orders.incompleteCancel") || "إلغاء"}
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
