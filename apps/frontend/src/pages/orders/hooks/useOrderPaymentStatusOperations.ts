import { useState } from "react";

export interface UseOrderPaymentStatusOperationsParams {
  isMerchant: boolean;
  isGuestOrder: boolean;
  updatePaymentStatus: (newStatus: string, notes?: string) => Promise<boolean>;
  setShowPaymentModal: (show: boolean) => void;
}

export interface UseOrderPaymentStatusOperationsReturn {
  canUpdatePaymentStatus: boolean;
  newPaymentStatus: string;
  setNewPaymentStatus: (status: string) => void;
  paymentNotes: string;
  setPaymentNotes: (notes: string) => void;
  onUpdatePaymentStatus: () => Promise<void>;
}

export function useOrderPaymentStatusOperations({
  isMerchant,
  isGuestOrder,
  updatePaymentStatus,
  setShowPaymentModal,
}: UseOrderPaymentStatusOperationsParams): UseOrderPaymentStatusOperationsReturn {
  const [newPaymentStatus, setNewPaymentStatus] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const canUpdatePaymentStatus = !isMerchant && !isGuestOrder;

  const onUpdatePaymentStatus = async () => {
    if (isGuestOrder) {
      setShowPaymentModal(false);
      return;
    }

    const success = await updatePaymentStatus(newPaymentStatus, paymentNotes);
    if (success) {
      setShowPaymentModal(false);
      setNewPaymentStatus("");
      setPaymentNotes("");
    }
  };

  return {
    canUpdatePaymentStatus,
    newPaymentStatus,
    setNewPaymentStatus,
    paymentNotes,
    setPaymentNotes,
    onUpdatePaymentStatus,
  };
}
