import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../../../hooks/useAuthSimple";
import { apiClient } from "../../../../services/apiClient";
import {
  CheckoutColumnProps,
  getApiErrorMessage,
  useCheckoutCustomer,
  useCheckoutOrderState,
  CheckoutCustomerSection,
  CheckoutShippingSection,
  CheckoutDiscountsSection,
  CheckoutOrderSettingsSection,
  CheckoutScheduledSection,
  CheckoutOrderSummary,
  CheckoutConfirmModal,
  CheckoutSuccessModal,
} from "./checkout-column";

const CheckoutColumn: React.FC<CheckoutColumnProps> = ({
  cartItems,
  onClearCart,
  initialWholesaleCustomer,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAffiliate = user?.role === "AFFILIATE";
  const [searchParams] = useSearchParams();

  const searchParamExchange = searchParams.get("exchangeOrderNumber");
  const searchParamReturn = searchParams.get("returnOrderNumber");
  const searchParamPhone = searchParams.get("phone");

  const [loading, setLoading] = useState(false);

  // Order State Hook
  const orderState = useCheckoutOrderState({
    cartItems,
    isAffiliate,
    governorate: "", // temporary; will connect with customer governorate below
    phone: "",
    searchParamExchangeOrder: searchParamExchange,
    searchParamReturnOrder: searchParamReturn,
  });

  // Customer State Hook
  const customer = useCheckoutCustomer({
    userRole: user?.role,
    paymentMethod: orderState.paymentMethod,
    onSetEligiblePreviousOrders: orderState.setEligiblePreviousOrders,
    onSetExchangeReturnPolicy: orderState.setExchangeReturnPolicy,
    onSelectPreviousOrder: orderState.setSelectedPreviousOrder,
    searchParamExchangeOrder: searchParamExchange,
    searchParamReturnOrder: searchParamReturn,
    searchParamPhone: searchParamPhone,
    initialWholesaleCustomer,
  });

  const blockPreventsOrder =
    Boolean(customer.customerBlock?.blocked) &&
    !(customer.canOverrideBlockedCustomer && customer.allowBlockedCustomerOverride);

  const resetAll = () => {
    customer.resetCustomerForm();
    orderState.resetOrderState();
    onClearCart?.();
  };

  const handleCreateOrder = () => {
    if (cartItems.length === 0) {
      toast.error(t("manualOrder.k_57"));
      return;
    }
    if (!customer.phone || !customer.firstName) {
      toast.error(t("manualOrder.k_58"));
      return;
    }
    if (orderState.previousOrderMissing) {
      toast.error(
        `لا يمكن إنشاء طلب ${orderState.requestType === "return" ? "مرتجع" : "استبدال"}: يتطلب وجود طلب سابق مؤهل لهذا العميل وفقاً لسياسة المتجر.`,
      );
      return;
    }
    if (orderState.explicitOrderLinkMissing) {
      toast.error("يرجى اختيار الطلب السابق المرتبط بالاستبدال أو المرتجع.");
      return;
    }
    if (customer.governorate && orderState.loadingShipping) {
      toast.error(t("manualOrder.k_59"));
      return;
    }
    if (
      customer.customerBlock?.blocked &&
      !(customer.canOverrideBlockedCustomer && customer.allowBlockedCustomerOverride)
    ) {
      toast.error(customer.customerBlock.message || t("manualOrder.k_60"));
      return;
    }

    // Wholesale Credit Limit Validation
    if (customer.wholesaleCustomer && customer.wholesaleCustomer.creditLimit > 0) {
      const curBal = Number(customer.wholesaleCustomer.currentBalance || 0);
      const credLim = Number(customer.wholesaleCustomer.creditLimit || 0);
      const orderTot = Number(orderState.grandTotal || 0);
      if (curBal + orderTot > credLim && !customer.allowWholesaleOverdraft) {
        toast.error(`تجاوز الحد الائتماني للموزع (${credLim.toLocaleString()} ج.م). الرصيد الحالي: ${curBal.toLocaleString()} ج.م. يرجى تفعيل الموافقة على التجاوز.`);
        return;
      }
    }

    orderState.setShowConfirmModal(true);
  };

  const confirmCreateOrder = async () => {
    orderState.setShowConfirmModal(false);

    try {
      setLoading(true);

      const scheduledDateTime =
        orderState.isScheduledOrder && orderState.scheduledDeliveryDate
          ? new Date(
              `${orderState.scheduledDeliveryDate}${
                orderState.scheduledDeliveryTime
                  ? "T" + orderState.scheduledDeliveryTime
                  : "T00:00:00"
              }`,
            ).toISOString()
          : null;

      const payload = {
        products: cartItems.map((item) => ({
          productId: item.productId,
          productName: item.name,
          price: item.price,
          quantity: item.quantity,
          variantId: item.variantId,
          sku: item.sku,
          productColor: item.color ? String(item.color) : null,
          productSize: item.size != null ? String(item.size) : null,
          productImage: item.image,
        })),
        customerPhone: customer.phone,
        customerName: `${customer.firstName} ${customer.lastName}`.trim(),
        customerAddress: customer.address,
        governorate: customer.governorate,
        city: customer.area,
        area: customer.area,
        notes: customer.notes,
        status: orderState.isScheduledOrder ? "SCHEDULED" : orderState.status,
        paymentMethod: orderState.paymentMethod,
        extractionMethod: isAffiliate ? "affiliate_manual" : "manual_admin",
        conversationId: "manual",
        platform: isAffiliate ? "affiliate" : "manual",
        source: isAffiliate ? "affiliate_direct" : "manual_entry",
        orderSource: isAffiliate ? "AFFILIATE_DIRECT" : (customer.wholesaleCustomer ? "WHOLESALE" : "manual"),
        ...(customer.wholesaleCustomer ? {
          wholesaleCustomerId: customer.wholesaleCustomer.id,
          ...(customer.wholesaleCustomer.customerId ? { customerId: customer.wholesaleCustomer.customerId } : {}),
          allowWholesaleOverdraft: customer.allowWholesaleOverdraft,
        } : {}),
        createAsAffiliate: isAffiliate,
        requestType: orderState.requestType,
        returnAmount: orderState.returnAmount
          ? parseFloat(orderState.returnAmount)
          : undefined,
        ...(orderState.isExchangeOrReturn
          ? {
              originalOrderId:
                orderState.selectedPreviousOrder ||
                orderState.eligiblePreviousOrders[0]?.id ||
                undefined,
              originalOrderNumber:
                orderState.selectedOrderObj?.orderNumber ||
                orderState.eligiblePreviousOrders[0]?.orderNumber ||
                undefined,
            }
          : {}),
        couponId: orderState.appliedCoupon?.id,
        couponCode: orderState.appliedCoupon?.code,
        couponDiscount: orderState.couponDiscount,
        manualDiscount: orderState.manualDiscount,
        subtotal: orderState.subtotal,
        totalAmount: orderState.grandTotal,
        isScheduled: orderState.isScheduledOrder,
        scheduledDeliveryDate: scheduledDateTime,
        scheduledNotes: orderState.isScheduledOrder
          ? orderState.scheduledNotes
          : undefined,
        allowBlockedCustomerOverride:
          customer.canOverrideBlockedCustomer &&
          customer.allowBlockedCustomerOverride,
        ...(customer.governorate
          ? {
              shippingCost: orderState.shippingCost,
              ...(orderState.shippingInfo?.zoneId
                ? {
                    shippingZoneId: orderState.shippingInfo.zoneId,
                  }
                : {}),
            }
          : {}),
      };

      const response = await apiClient.post("/orders-enhanced", payload);

      if (response.data.success) {
        toast.success(t("manualOrder.k_61"));
        const orderId = response.data.order?.id || response.data.data?.id;
        orderState.setCreatedOrderId(orderId);
        orderState.setShowSuccessModal(true);
      } else {
        toast.error(
          t("manualOrder.k_62") + (response.data.error || t("manualOrder.k_63")),
        );
      }
    } catch (error: unknown) {
      console.error("Create order error:", error);
      toast.error(getApiErrorMessage(error, t("manualOrder.k_64")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-2xs border border-gray-200/80 dark:border-gray-800 overflow-hidden"
      style={{ height: "100%", maxHeight: "100%" }}
    >
      <div className="px-4 py-3 border-b border-gray-200/80 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40">
        <h2 className="text-xs sm:text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
          {t("manualOrder.k_89")}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 space-y-5 manual-order-scroll manual-order-column">
        {/* Customer Info */}
        <CheckoutCustomerSection
          phone={customer.phone}
          setPhone={customer.setPhone}
          firstName={customer.firstName}
          setFirstName={customer.setFirstName}
          lastName={customer.lastName}
          setLastName={customer.setLastName}
          address={customer.address}
          setAddress={customer.setAddress}
          governorate={customer.governorate}
          setGovernorate={customer.setGovernorate}
          area={customer.area}
          setArea={customer.setArea}
          searching={customer.searching}
          checkingBlock={customer.checkingBlock}
          customerBlock={customer.customerBlock}
          allowBlockedCustomerOverride={customer.allowBlockedCustomerOverride}
          setAllowBlockedCustomerOverride={customer.setAllowBlockedCustomerOverride}
          canOverrideBlockedCustomer={customer.canOverrideBlockedCustomer}
          canUseTurboLocationLookups={customer.canUseTurboLocationLookups}
          governments={customer.governments}
          availableAreas={customer.availableAreas}
          loadingGovernments={customer.loadingGovernments}
          loadingAreas={customer.loadingAreas}
          t={t}
        />

        {customer.wholesaleCustomer && (
          <div className="rounded-xl border border-purple-200/80 bg-purple-50/60 p-3 text-xs dark:border-purple-800/60 dark:bg-purple-950/20">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                <span>🏷️</span>
                <span>عميل جملة معتمد</span>
              </span>
              <span className="text-[10px] bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-mono px-2 py-0.5 rounded-full">
                طلب موزع
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] mb-2">
              <div>
                <span className="text-muted-foreground block text-[10px]">الرصيد الحالي:</span>
                <span className="font-bold text-foreground">
                  {Number(customer.wholesaleCustomer.currentBalance || 0).toLocaleString()} ج.م
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">الحد الائتماني:</span>
                <span className="font-bold text-foreground">
                  {Number(customer.wholesaleCustomer.creditLimit || 0).toLocaleString()} ج.م
                </span>
              </div>
            </div>
            {customer.wholesaleCustomer.creditLimit > 0 &&
              Number(customer.wholesaleCustomer.currentBalance || 0) + Number(orderState.grandTotal || 0) >
                Number(customer.wholesaleCustomer.creditLimit || 0) && (
                <div className="mt-2 pt-2 border-t border-purple-200/60 dark:border-purple-800/60 space-y-1">
                  <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                    ⚠️ إجمالي الطلب يتجاوز الحد الائتماني المتبقي
                  </div>
                  {['OWNER', 'ADMIN', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '') && (
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-purple-900 dark:text-purple-200">
                      <input
                        type="checkbox"
                        checked={customer.allowWholesaleOverdraft}
                        onChange={(e) => customer.setAllowWholesaleOverdraft(e.target.checked)}
                        className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 size-3.5"
                      />
                      <span>الموافقة كمسؤول على تجاوز الحد الائتماني</span>
                    </label>
                  )}
                </div>
              )}
          </div>
        )}

        <hr className="border-gray-100 dark:border-gray-700" />

        {/* Shipping Info */}
        <CheckoutShippingSection
          loadingShipping={orderState.loadingShipping}
          shippingInfo={orderState.shippingInfo}
          governorate={customer.governorate}
          t={t}
        />

        <hr className="border-gray-100 dark:border-gray-700" />

        {/* Coupon & Discount */}
        <CheckoutDiscountsSection
          couponCode={orderState.couponCode}
          setCouponCode={orderState.setCouponCode}
          appliedCoupon={orderState.appliedCoupon}
          loadingCoupon={orderState.loadingCoupon}
          manualDiscount={orderState.manualDiscount}
          setManualDiscount={orderState.setManualDiscount}
          onApplyCoupon={orderState.handleApplyCoupon}
          onRemoveCoupon={orderState.handleRemoveCoupon}
          t={t}
        />

        <hr className="border-gray-100 dark:border-gray-700" />

        {/* Order Settings */}
        <CheckoutOrderSettingsSection
          paymentMethod={orderState.paymentMethod}
          setPaymentMethod={orderState.setPaymentMethod}
          status={orderState.status}
          setStatus={orderState.setStatus}
          requestType={orderState.requestType}
          setRequestType={orderState.setRequestType}
          returnAmount={orderState.returnAmount}
          setReturnAmount={orderState.setReturnAmount}
          shippingInfo={orderState.shippingInfo}
          notes={customer.notes}
          setNotes={customer.setNotes}
          isEn={isEn}
          isExchangeOrReturn={orderState.isExchangeOrReturn}
          phoneDigitsCount={orderState.phoneDigitsCount}
          previousOrderMissing={orderState.previousOrderMissing}
          eligiblePreviousOrders={orderState.eligiblePreviousOrders}
          exchangeReturnPolicy={orderState.exchangeReturnPolicy}
          selectedPreviousOrder={orderState.selectedPreviousOrder}
          setSelectedPreviousOrder={orderState.setSelectedPreviousOrder}
          selectedOrderObj={orderState.selectedOrderObj}
          t={t}
        />

        <hr className="border-gray-100 dark:border-gray-700" />

        {/* Scheduled Order Section */}
        <CheckoutScheduledSection
          isScheduledOrder={orderState.isScheduledOrder}
          setIsScheduledOrder={orderState.setIsScheduledOrder}
          scheduledDeliveryDate={orderState.scheduledDeliveryDate}
          setScheduledDeliveryDate={orderState.setScheduledDeliveryDate}
          scheduledDeliveryTime={orderState.scheduledDeliveryTime}
          setScheduledDeliveryTime={orderState.setScheduledDeliveryTime}
          scheduledNotes={orderState.scheduledNotes}
          setScheduledNotes={orderState.setScheduledNotes}
          t={t}
        />
      </div>

      {/* Order Summary & Actions */}
      <CheckoutOrderSummary
        cartItems={cartItems}
        subtotal={orderState.subtotal}
        totalDiscount={orderState.totalDiscount}
        shippingCost={orderState.shippingCost}
        grandTotal={orderState.grandTotal}
        loading={loading}
        loadingShipping={orderState.loadingShipping}
        governorate={customer.governorate}
        blockPreventsOrder={blockPreventsOrder}
        previousOrderMissing={orderState.previousOrderMissing}
        explicitOrderLinkMissing={orderState.explicitOrderLinkMissing}
        previousOrderPreventsOrder={orderState.previousOrderPreventsOrder}
        stockWarnings={orderState.stockWarnings}
        onCreateOrder={handleCreateOrder}
        t={t}
      />

      {/* Confirmation Modal */}
      <CheckoutConfirmModal
        show={orderState.showConfirmModal}
        onClose={() => orderState.setShowConfirmModal(false)}
        onConfirm={confirmCreateOrder}
        firstName={customer.firstName}
        lastName={customer.lastName}
        phone={customer.phone}
        cartItems={cartItems}
        grandTotal={orderState.grandTotal}
        t={t}
      />

      {/* Success Modal */}
      <CheckoutSuccessModal
        show={orderState.showSuccessModal}
        onClose={() => orderState.setShowSuccessModal(false)}
        createdOrderId={orderState.createdOrderId}
        isAffiliate={isAffiliate}
        onViewOrder={() => {
          orderState.setShowSuccessModal(false);
          if (orderState.createdOrderId) {
            navigate(
              isAffiliate
                ? "/affiliates/orders"
                : `/orders/${encodeURIComponent(String(orderState.createdOrderId))}`,
            );
          }
        }}
        onPrintInvoice={() => {
          if (orderState.createdOrderId) {
            window.open(
              isAffiliate
                ? "/affiliates/orders"
                : `/orders/${encodeURIComponent(String(orderState.createdOrderId))}?print=true`,
              "_blank",
            );
          }
        }}
        onCreateAnother={() => {
          orderState.setShowSuccessModal(false);
          orderState.setCreatedOrderId(null);
          resetAll();
        }}
        t={t}
      />
    </div>
  );
};

export default CheckoutColumn;
