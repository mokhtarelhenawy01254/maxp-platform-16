import React from "react";
import { useTranslation } from "react-i18next";
import { getDirection } from "../../i18n";
import { useParams, useNavigate } from "react-router-dom";
import { RotateCw, AlertCircle } from "lucide-react";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import IncompleteCancelModal from "./components/IncompleteCancelModal";
import OrderAttributionCard from "./components/OrderAttributionCard";
import OrderSessionDetailsCard from "./components/OrderSessionDetailsCard";
import { IncompleteActionBar } from "./incomplete/IncompleteActionBar";
import { IncompleteKpisGrid } from "./incomplete/IncompleteKpisGrid";
import { IncompleteCustomerCard } from "./incomplete/IncompleteCustomerCard";
import { IncompleteCartItemsCard } from "./incomplete/IncompleteCartItemsCard";
import { IncompleteReasonCard } from "./incomplete/IncompleteReasonCard";
import { IncompleteCheckoutMetadataCard } from "./incomplete/IncompleteCheckoutMetadataCard";
import { useIncompleteOrderDetailsData } from "./incomplete/useIncompleteOrderDetailsData";

export const IncompleteOrderDetails: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const { cartId } = useParams();
  const navigate = useNavigate();
  const decodedCartId = cartId ? decodeURIComponent(cartId) : "";

  const {
    order,
    loading,
    error,
    converting,
    showConfirm,
    setShowConfirm,
    cancelModalOpen,
    setCancelModalOpen,
    canShowAttribution,
    customerInfo,
    checkoutMetadata,
    lastActivity,
    expiry,
    whatsappUrl,
    handleConvertToOrder,
    retry,
    lang,
  } = useIncompleteOrderDetailsData(decodedCartId);

  const isRTL = getDirection() === "rtl";

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
          <p className="text-xs text-muted-foreground font-mono">
            جاري تحميل تفاصيل السلة المتروكة...
          </p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-xs">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-xs font-semibold text-destructive">{error}</p>
          <button
            type="button"
            onClick={retry}
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
              sessionDetails={
                order.sessionDetails || order.checkoutData?.sessionDetails
              }
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
          <IncompleteCheckoutMetadataCard
            order={order}
            checkoutMetadata={checkoutMetadata}
            expiry={expiry}
            formatDate={formatDate}
          />
        </>
      ) : (
        <div className="rounded-xl border border-border/70 bg-card p-8 text-center text-xs text-muted-foreground shadow-xs">
          {t("orders.incompleteNoDetails") || "لا توجد تفاصيل متاحة"}
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        title={t("orders.incompleteConfirmTitle") || "تحويل السلة لطلب"}
        content={
          t("orders.incompleteConfirmContent") ||
          "هل أنت متأكد من رغبتك في تحويل هذه السلة إلى طلب حقيقي ومؤكد؟"
        }
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
