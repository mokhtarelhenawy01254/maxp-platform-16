import React from "react";
import { useTranslation } from "react-i18next";
import { ErrorBoundary } from "../../../components/common/ErrorBoundary";
import type { Order, OrderStatusDefinition } from "../Orders";

const EnhancedOrderModal = React.lazy(
  () => import("../../../components/orders/EnhancedOrderModal"),
);
const InvoiceModal = React.lazy(
  () => import("../../../components/orders/InvoiceModal"),
);

export interface OrdersModalsContainerProps {
  selectedOrder: Order | null;
  setSelectedOrder: (order: Order | null) => void;
  showOrderModal: boolean;
  setShowOrderModal: (val: boolean) => void;
  isMerchant: boolean;
  orderStatuses: OrderStatusDefinition[];
  onOrderUpdate: (updatedOrder: Order) => void;
  selectedInvoice: any | null;
  setSelectedInvoice: (invoice: any | null) => void;
}

export const OrdersModalsContainer: React.FC<OrdersModalsContainerProps> = ({
  selectedOrder,
  setSelectedOrder,
  showOrderModal,
  setShowOrderModal,
  isMerchant,
  orderStatuses,
  onOrderUpdate,
  selectedInvoice,
  setSelectedInvoice,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Enhanced Order Modal */}
      {selectedOrder && (
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
              <div className="w-full max-w-sm rounded-2xl border border-border/70 bg-card p-6 text-center shadow-2xl text-card-foreground">
                <p className="text-sm font-semibold text-foreground">
                  {t("orders.modalLoadFailed", { defaultValue: "تعذر تحميل تفاصيل الطلب" })}
                </p>
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 cursor-pointer"
                >
                  {t("orders.close", { defaultValue: "إغلاق" })}
                </button>
              </div>
            </div>
          }
        >
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
              </div>
            }
          >
            <EnhancedOrderModal
              order={selectedOrder}
              isOpen={showOrderModal}
              canManagePaymentStatus={!isMerchant}
              orderStatuses={orderStatuses}
              onClose={() => {
                setShowOrderModal(false);
                setSelectedOrder(null);
              }}
              onOrderUpdate={onOrderUpdate}
            />
          </React.Suspense>
        </ErrorBoundary>
      )}

      {/* Invoice Modal */}
      {selectedInvoice && (
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
              <div className="w-full max-w-sm rounded-2xl border border-border/70 bg-card p-6 text-center shadow-2xl text-card-foreground">
                <p className="text-sm font-semibold text-foreground">
                  {t("orders.modalLoadFailed", { defaultValue: "تعذر تحميل الفاتورة" })}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 cursor-pointer"
                >
                  {t("orders.close", { defaultValue: "إغلاق" })}
                </button>
              </div>
            </div>
          }
        >
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
              </div>
            }
          >
            <InvoiceModal
              invoice={selectedInvoice}
              onClose={() => setSelectedInvoice(null)}
            />
          </React.Suspense>
        </ErrorBoundary>
      )}
    </>
  );
};

export default OrdersModalsContainer;
