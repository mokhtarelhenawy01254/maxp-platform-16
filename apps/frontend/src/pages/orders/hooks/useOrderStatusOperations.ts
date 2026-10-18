import { useEffect, useState } from "react";
import { isReturnStatusCode } from "../utils/returnHelper";
import { cancellationService } from "../../../services/cancellationService";
import type { CancellationReason } from "../../../services/cancellationService";
import type { OrderDetailsType } from "../types";

export const isCancellationStatus = (status?: string | null): boolean => {
  const normalizedStatus = String(status || "").trim().toUpperCase();
  return normalizedStatus === "CANCELLED" || normalizedStatus === "CANCELED";
};

export interface UseOrderStatusOperationsParams {
  order: OrderDetailsType | null;
  canUpdateOrderStatus: boolean;
  updateStatus: (newStatus: string, notes?: string, isOverride?: boolean) => Promise<boolean>;
}

export interface UseOrderStatusOperationsReturn {
  showStatusModal: boolean;
  setShowStatusModal: (show: boolean) => void;
  newStatus: string;
  setNewStatus: (status: string) => void;
  statusNotes: string;
  setStatusNotes: (notes: string) => void;
  returnReason: string;
  setReturnReason: (reason: string) => void;
  returnAdditionalNotes: string;
  setReturnAdditionalNotes: (notes: string) => void;
  isOverride: boolean;
  setIsOverride: (override: boolean) => void;
  cancellationReasonOptions: CancellationReason[];
  cancellationReasonOptionsLoading: boolean;
  cancellationAdditionalNotes: string;
  setCancellationAdditionalNotes: (notes: string) => void;
  isModalCancellationStatus: boolean;
  isModalReturnStatus: boolean;
  onUpdateStatus: () => Promise<void>;
  handleQuickStatusSelect: (statusCode: string) => Promise<void>;
}

export function useOrderStatusOperations({
  order,
  canUpdateOrderStatus,
  updateStatus,
}: UseOrderStatusOperationsParams): UseOrderStatusOperationsReturn {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnAdditionalNotes, setReturnAdditionalNotes] = useState("");
  const [isOverride, setIsOverride] = useState(false);
  const [cancellationReasonOptions, setCancellationReasonOptions] = useState<CancellationReason[]>([]);
  const [cancellationReasonOptionsLoading, setCancellationReasonOptionsLoading] = useState(false);
  const [cancellationAdditionalNotes, setCancellationAdditionalNotes] = useState("");

  const isModalCancellationStatus = isCancellationStatus(newStatus);
  const isModalReturnStatus = isReturnStatusCode(newStatus);

  useEffect(() => {
    if (!showStatusModal || !isModalCancellationStatus) {
      return;
    }

    let isMounted = true;
    setCancellationReasonOptionsLoading(true);

    void cancellationService
      .getReasons()
      .then((res) => {
        if (isMounted) {
          setCancellationReasonOptions(res.data);
        }
      })
      .catch((error) => {
        console.error("Failed to load cancellation reasons:", error);
        if (isMounted) {
          setCancellationReasonOptions([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setCancellationReasonOptionsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [showStatusModal, isModalCancellationStatus]);

  const onUpdateStatus = async () => {
    const trimmedReason = statusNotes.trim();
    if (isCancellationStatus(newStatus) && !trimmedReason) return;
    if (isModalReturnStatus && !returnReason.trim() && !trimmedReason) return;

    let notesToSend = statusNotes.trim();
    if (isCancellationStatus(newStatus)) {
      notesToSend = cancellationAdditionalNotes.trim()
        ? trimmedReason + "\n" + cancellationAdditionalNotes.trim()
        : trimmedReason;
    } else if (isModalReturnStatus) {
      const primary = returnReason.trim() && returnReason !== "other" ? returnReason.trim() : trimmedReason;
      notesToSend = returnAdditionalNotes.trim()
        ? primary + (primary ? "\n" : "") + returnAdditionalNotes.trim()
        : primary;
    }

    const success = await updateStatus(newStatus, notesToSend, isOverride);
    if (success) {
      setShowStatusModal(false);
      setNewStatus("");
      setStatusNotes("");
      setReturnReason("");
      setReturnAdditionalNotes("");
      setCancellationAdditionalNotes("");
      setIsOverride(false);
    }
  };

  const handleQuickStatusSelect = async (statusCode: string) => {
    if (!canUpdateOrderStatus) return;
    const normalizedStatusCode = statusCode.toUpperCase();
    if (
      !order ||
      !normalizedStatusCode ||
      normalizedStatusCode === (order.status || "").toUpperCase()
    )
      return;

    if (isCancellationStatus(normalizedStatusCode) || isReturnStatusCode(normalizedStatusCode)) {
      setNewStatus(normalizedStatusCode);
      setStatusNotes("");
      setReturnReason("");
      setReturnAdditionalNotes("");
      setShowStatusModal(true);
      return;
    }

    const success = await updateStatus(normalizedStatusCode, "", isOverride);
    if (success) {
      setNewStatus("");
      setStatusNotes("");
      setReturnReason("");
      setReturnAdditionalNotes("");
    }
  };

  return {
    showStatusModal,
    setShowStatusModal,
    newStatus,
    setNewStatus,
    statusNotes,
    setStatusNotes,
    returnReason,
    setReturnReason,
    returnAdditionalNotes,
    setReturnAdditionalNotes,
    isOverride,
    setIsOverride,
    cancellationReasonOptions,
    cancellationReasonOptionsLoading,
    cancellationAdditionalNotes,
    setCancellationAdditionalNotes,
    isModalCancellationStatus,
    isModalReturnStatus,
    onUpdateStatus,
    handleQuickStatusSelect,
  };
}
