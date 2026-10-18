import React from "react";
import CustomerInfoCard from "./CustomerInfoCard";
import CustomerOrderHistoryCard from "./CustomerOrderHistoryCard";
import OrderPaymentCard from "./OrderPaymentCard";
import OrderSessionDetailsCard from "./OrderSessionDetailsCard";
import OrderSourceCard from "./OrderSourceCard";
import OrderAttributionCard from "./OrderAttributionCard";
import OrderReturnCollectionFeeCard from "./OrderReturnCollectionFeeCard";
import WalletPaymentProofCard from "./WalletPaymentProofCard";
import OrderCancellationReturnBanner from "./OrderCancellationReturnBanner";
import OrderConfirmationDistributionCard from "./OrderConfirmationDistributionCard";
import OrderActivityLog from "./OrderActivityLog";
import OrderScheduledDeliveryCard from "./OrderScheduledDeliveryCard";
import { OrderDetailsType } from "../types";

export interface OrderDetailsSidebarProps {
  order: OrderDetailsType;
  canEditOrderDetails: boolean;
  isEditing: boolean;
  editForm: any;
  setEditForm: React.Dispatch<React.SetStateAction<any>>;
  governments: any[];
  areas: any[];
  loadingGovernments: boolean;
  loadingAreas: boolean;
  selectedGovernmentId: string;
  setSelectedGovernmentId: (id: string) => void;
  handleGovernmentChange: (id: string) => void;
  invoiceSettings: any;
  fetchOrderDetails: () => Promise<void>;
  setOrder: React.Dispatch<React.SetStateAction<OrderDetailsType | null>>;
  canUpdatePaymentStatus: boolean;
  setShowPaymentModal: (show: boolean) => void;
  showOrderSourceCard: boolean;
  showOrderAttributionCard: boolean;
  verifyWalletProof: (status: "APPROVED" | "REJECTED") => Promise<void>;
  effectiveStatus: string;
  latestCancellationReason: string;
  returnDetails: any;
  showConfirmationDistributionCard: boolean;
  formatOptionalDate: (value?: string | null) => string;
  orderNotes: any[];
  addNote: (note: string) => Promise<boolean>;
  updateNote: (id: string, note: string) => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;
  updatingNote: boolean;
  deletingNote: boolean;
  isMerchant: boolean;
  currentUserId?: string;
  statusNameMap: Record<string, string>;
  isCancellationStatus: (status?: string | null) => boolean;
}

export const OrderDetailsSidebar: React.FC<OrderDetailsSidebarProps> = ({
  order,
  canEditOrderDetails,
  isEditing,
  editForm,
  setEditForm,
  governments,
  areas,
  loadingGovernments,
  loadingAreas,
  selectedGovernmentId,
  setSelectedGovernmentId,
  handleGovernmentChange,
  invoiceSettings,
  fetchOrderDetails,
  setOrder,
  canUpdatePaymentStatus,
  setShowPaymentModal,
  showOrderSourceCard,
  showOrderAttributionCard,
  verifyWalletProof,
  effectiveStatus,
  latestCancellationReason,
  returnDetails,
  showConfirmationDistributionCard,
  formatOptionalDate,
  orderNotes,
  addNote,
  updateNote,
  deleteNote,
  updatingNote,
  deletingNote,
  isMerchant,
  currentUserId,
  statusNameMap,
  isCancellationStatus,
}) => {
  return (
    <div className="space-y-6 lg:col-span-1">
      <CustomerInfoCard
        order={order}
        isEditing={canEditOrderDetails && isEditing}
        editForm={editForm}
        setEditForm={setEditForm}
        governments={governments}
        areas={areas}
        loadingGovernments={loadingGovernments}
        loadingAreas={loadingAreas}
        selectedGovernmentId={selectedGovernmentId}
        setSelectedGovernmentId={setSelectedGovernmentId}
        handleGovernmentChange={handleGovernmentChange}
        invoiceSettings={invoiceSettings}
        onOrderUpdated={fetchOrderDetails}
        onCustomerRatingChange={(newRating) => {
          setOrder((prev) =>
            prev
              ? {
                  ...prev,
                  customerRating: newRating,
                  customer: prev.customer
                    ? { ...prev.customer, customerRating: newRating }
                    : prev.customer,
                }
              : prev,
          );
        }}
      />

      <div id="customer-order-history-card">
        <CustomerOrderHistoryCard
          orderNumber={order.orderNumber}
          initialHistory={order.customerHistory}
          customerPhone={order.customerPhone}
          customerEmail={order.customerEmail}
          customerId={order.customerId}
          currency={order.currency}
        />
      </div>

      <OrderPaymentCard
        order={order}
        canUpdatePaymentStatus={canUpdatePaymentStatus}
        onOpenPaymentModal={() => setShowPaymentModal(true)}
      />

      <OrderSessionDetailsCard
        sessionDetails={
          order.sessionDetails || (order.metadata as any)?.sessionDetails
        }
        firstOrderInfo={order.firstOrderInfo}
        orderSource={order.orderSource}
        sourceType={order.sourceType}
        customerPhone={order.customerPhone}
        createdAt={order.createdAt}
        orderGovernorate={
          order.governorate ||
          order.shippingAddress?.governorate ||
          (order.shippingAddress as any)?.government
        }
        orderCity={order.city || order.shippingAddress?.city}
      />

      {showOrderSourceCard && <OrderSourceCard order={order} />}
      {showOrderAttributionCard && <OrderAttributionCard order={order} />}

      <OrderReturnCollectionFeeCard order={order} />

      {(order as any)?.walletPaymentProof ? (
        <WalletPaymentProofCard
          proof={(order as any).walletPaymentProof}
          onVerify={verifyWalletProof}
        />
      ) : null}

      <OrderCancellationReturnBanner
        isCancellation={Boolean(isCancellationStatus(effectiveStatus))}
        latestCancellationReason={latestCancellationReason}
        returnDetails={returnDetails}
      />

      {/* Confirmation & Assignment Info */}
      {showConfirmationDistributionCard && (
        <OrderConfirmationDistributionCard
          order={order}
          effectiveStatus={effectiveStatus}
          formatOptionalDate={formatOptionalDate}
        />
      )}

      {/* Order Activity Log */}
      <OrderActivityLog
        order={{
          ...order,
          statusHistory: order.statusHistory || [],
          orderNotes: orderNotes,
        }}
        onAddNote={addNote}
        onUpdateNote={updateNote}
        onDeleteNote={deleteNote}
        addingNote={false}
        updatingNote={updatingNote}
        deletingNote={deletingNote}
        canAddNote={!isMerchant}
        currentUserId={currentUserId}
        statusNameMap={statusNameMap}
      />

      {/* Scheduled Order Info */}
      {order.isScheduled && order.scheduledDeliveryDate && (
        <OrderScheduledDeliveryCard
          scheduledDeliveryDate={order.scheduledDeliveryDate}
          scheduledNotes={order.scheduledNotes}
          autoTransitionEnabled={order.autoTransitionEnabled}
        />
      )}
    </div>
  );
};

export default OrderDetailsSidebar;
