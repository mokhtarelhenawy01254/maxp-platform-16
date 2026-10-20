import React, { useEffect, useRef, useState } from "react";
import type { OrderDetailsType } from "../types";
import type { StatusOption } from "./OrderStatusBadgeRail";
import { OrderHeaderTitle } from "./header/OrderHeaderTitle";
import { OrderHeaderActions } from "./header/OrderHeaderActions";

export interface OrderHeaderProps {
  order: OrderDetailsType;
  isEditing: boolean;
  updating: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onPrint: () => void;
  onPrintPreparationSlip: () => void;
  onBack: () => void;
  onOpenTicket?: () => void;
  canEditOrder?: boolean;
  canPrintPreparationSlip?: boolean;
  canUpdateStatus?: boolean;
  currentStatusConfig?: {
    code: string;
    name: string;
    color?: string;
    icon?: string;
  } | null;
  statusOptions?: StatusOption[];
  onStatusSelect?: (statusCode: string) => void;
  whatsappChatUrl?: string | null;
  canUpdatePaymentStatus?: boolean;
  onUpdatePayment?: () => void;
  canPostponeOrder?: boolean;
  onPostponeOrder?: () => void;
  canPartialDelivery?: boolean;
  onPartialDelivery?: () => void;
  showLateCancellationButton?: boolean;
  onCancelRequest?: () => void;
}

export const OrderHeader: React.FC<OrderHeaderProps> = ({
  order,
  isEditing,
  updating,
  onEdit,
  onCancel,
  onSave,
  onPrint,
  onPrintPreparationSlip,
  onBack,
  onOpenTicket,
  canEditOrder = true,
  canPrintPreparationSlip = true,
  canUpdateStatus = true,
  currentStatusConfig,
  statusOptions = [],
  onStatusSelect,
  whatsappChatUrl,
  canUpdatePaymentStatus = false,
  onUpdatePayment,
  canPostponeOrder = false,
  onPostponeOrder,
  canPartialDelivery = false,
  onPartialDelivery,
  showLateCancellationButton = false,
  onCancelRequest,
}) => {
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);

  const statusStyles = {
    backgroundColor: currentStatusConfig?.color
      ? `${currentStatusConfig.color}20`
      : "var(--muted)",
    color: currentStatusConfig?.color || "inherit",
    border: `1px solid ${currentStatusConfig?.color || "var(--border)"}`,
  };

  useEffect(() => {
    if (!isStatusMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        statusMenuRef.current &&
        !statusMenuRef.current.contains(event.target as Node)
      ) {
        setIsStatusMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsStatusMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isStatusMenuOpen]);

  useEffect(() => {
    if (isEditing || updating) {
      setIsStatusMenuOpen(false);
    }
  }, [isEditing, updating]);

  return (
    <div className="mb-4 sm:mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
      <OrderHeaderTitle
        order={order}
        onBack={onBack}
        currentStatusConfig={currentStatusConfig}
        statusOptions={statusOptions}
        onStatusSelect={onStatusSelect}
        canUpdateStatus={canUpdateStatus}
        isEditing={isEditing}
        updating={updating}
        isStatusMenuOpen={isStatusMenuOpen}
        setIsStatusMenuOpen={setIsStatusMenuOpen}
        statusMenuRef={statusMenuRef}
        statusStyles={statusStyles}
      />

      <OrderHeaderActions
        order={order}
        isEditing={isEditing}
        updating={updating}
        onEdit={onEdit}
        onCancel={onCancel}
        onSave={onSave}
        onPrint={onPrint}
        onPrintPreparationSlip={onPrintPreparationSlip}
        onOpenTicket={onOpenTicket}
        canEditOrder={canEditOrder}
        canPrintPreparationSlip={canPrintPreparationSlip}
        whatsappChatUrl={whatsappChatUrl}
        canUpdatePaymentStatus={canUpdatePaymentStatus}
        onUpdatePayment={onUpdatePayment}
        canPostponeOrder={canPostponeOrder}
        onPostponeOrder={onPostponeOrder}
        canPartialDelivery={canPartialDelivery}
        onPartialDelivery={onPartialDelivery}
        showLateCancellationButton={showLateCancellationButton}
        onCancelRequest={onCancelRequest}
      />
    </div>
  );
};

export default OrderHeader;
