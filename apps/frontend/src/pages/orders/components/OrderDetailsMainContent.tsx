import React from "react";
import OrderDiscountApprovalBanner from "./OrderDiscountApprovalBanner";
import OrderItemsCard from "./OrderItemsCard";
import OrderPartnerOperationsCard from "../../../components/orders/OrderPartnerOperationsCard";
import UnifiedShippingCard from "./UnifiedShippingCard";
import type { OrderDetailsType } from "../types";

export interface OrderDetailsMainContentProps {
  order: OrderDetailsType;
  canEditOrderDetails: boolean;
  isEditing: boolean;
  editForm: any;
  setEditForm: React.Dispatch<React.SetStateAction<any>>;
  calculatedTotals: any;
  updating: boolean;
  handleDiscountApproval: (decision: "APPROVE" | "REJECT", reason?: string) => Promise<void> | void;
  handleItemChange: (index: number, field: string, value: any) => void;
  handleRemoveItem: (index: number) => void;
  setShowAddProductModal: (show: boolean) => void;
  showPartnerOperationsCard: boolean;
  merchantOrderScope: any;
  fetchOrderDetails: () => Promise<void> | void;
  canManageTurboShipping: boolean;
  setShowTicketModal: (show: boolean) => void;
}

export const OrderDetailsMainContent: React.FC<OrderDetailsMainContentProps> = ({
  order,
  canEditOrderDetails,
  isEditing,
  editForm,
  setEditForm,
  calculatedTotals,
  updating,
  handleDiscountApproval,
  handleItemChange,
  handleRemoveItem,
  setShowAddProductModal,
  showPartnerOperationsCard,
  merchantOrderScope,
  fetchOrderDetails,
  canManageTurboShipping,
  setShowTicketModal,
}) => {
  return (
    <div className="space-y-6 lg:col-span-2">
      {/* Discount Approval Banner */}
      <OrderDiscountApprovalBanner
        order={order}
        onApprove={() => handleDiscountApproval("APPROVE")}
        onReject={(reason) => handleDiscountApproval("REJECT", reason)}
        loading={updating}
      />

      {/* Items Card */}
      <OrderItemsCard
        isEditing={canEditOrderDetails && isEditing}
        items={canEditOrderDetails && isEditing ? editForm.items : order.items}
        currency={order.currency}
        totals={calculatedTotals}
        discountReason={order.discountReason}
        editDiscountReason={editForm.discountReason}
        onDiscountChange={(val) =>
          setEditForm((prev: any) => ({ ...prev, discount: val }))
        }
        onDiscountReasonChange={(val) =>
          setEditForm((prev: any) => ({ ...prev, discountReason: val }))
        }
        onAddItem={() => {
          if (canEditOrderDetails) setShowAddProductModal(true);
        }}
        onItemChange={handleItemChange}
        onRemoveItem={handleRemoveItem}
        onShippingChange={(val) =>
          setEditForm((prev: any) => ({ ...prev, shipping: val }))
        }
        onTaxChange={(val) =>
          setEditForm((prev: any) => ({ ...prev, tax: val }))
        }
      />

      {showPartnerOperationsCard && (
        <OrderPartnerOperationsCard
          affiliate={order.affiliate}
          merchantOrder={merchantOrderScope}
        />
      )}

      {/* Unified Multi-Carrier Shipping Panel */}
      <UnifiedShippingCard
        order={order}
        onOrderUpdated={fetchOrderDetails}
        canManageShipments={canManageTurboShipping}
        onOpenTicket={() => setShowTicketModal(true)}
      />
    </div>
  );
};

export default OrderDetailsMainContent;
