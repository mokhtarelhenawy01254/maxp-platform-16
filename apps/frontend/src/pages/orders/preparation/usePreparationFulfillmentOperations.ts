import type { Dispatch, SetStateAction } from "react";
import type { PreparationOrder } from "./types";
import type { ActiveCarrier } from "./components/DispatchCarrierModal";
import { usePreparationSlipPrint } from "./usePreparationSlipPrint";
import { usePreparationQuickTransfer } from "./usePreparationQuickTransfer";
import { usePreparationCarrierDispatch } from "./usePreparationCarrierDispatch";
import { usePreparationInvoicePrinting } from "./usePreparationInvoicePrinting";

export interface UsePreparationFulfillmentOperationsParams {
  orders: any[];
  user: any;
  invoiceSettings: any;
  selectedWarehouseId: string;
  inventorySummaryByProduct: Map<string, any>;
  fetchInventory: (warehouseId?: string) => Promise<void>;
  selectedOrders: string[];
  activeStage: string;
  getOrderByNumber: (orderNumber: string) => PreparationOrder | null;
  fetchAll: (options?: any) => Promise<void>;
  clearBulkControls: () => void;
  navigate: (to: string | number, options?: any) => void;
  getApiErrorMessage: (error: any, fallback: string) => string;
  t: (key: string, options?: any) => string;
}

export interface UsePreparationFulfillmentOperationsReturn {
  printingOrderNumber: string | null;
  handlePrintPreparationSlip: (order: PreparationOrder) => Promise<void>;
  transferingItemKey: string | null;
  handleQuickTransfer: (item: any) => Promise<void>;
  activeCarriers: ActiveCarrier[];
  showDispatchModal: boolean;
  setShowDispatchModal: Dispatch<SetStateAction<boolean>>;
  sendingToTurbo: boolean;
  handleOpenDispatchModal: () => void;
  handleDispatchToCarrier: (carrierType: string) => Promise<void>;
  printingInvoices: boolean;
  handlePrintInvoices: () => Promise<void>;
}

export function usePreparationFulfillmentOperations({
  orders,
  user,
  invoiceSettings,
  selectedWarehouseId,
  inventorySummaryByProduct,
  fetchInventory,
  selectedOrders,
  activeStage,
  getOrderByNumber,
  fetchAll,
  clearBulkControls,
  navigate,
  getApiErrorMessage,
  t,
}: UsePreparationFulfillmentOperationsParams): UsePreparationFulfillmentOperationsReturn {
  const { printingOrderNumber, handlePrintPreparationSlip } = usePreparationSlipPrint({
    orders,
    user,
    invoiceSettings,
    t,
  });

  const { transferingItemKey, handleQuickTransfer } = usePreparationQuickTransfer({
    selectedWarehouseId,
    inventorySummaryByProduct,
    fetchInventory,
    getApiErrorMessage,
    t,
  });

  const {
    activeCarriers,
    showDispatchModal,
    setShowDispatchModal,
    sendingToTurbo,
    handleOpenDispatchModal,
    handleDispatchToCarrier,
  } = usePreparationCarrierDispatch({
    selectedOrders,
    activeStage,
    getOrderByNumber,
    fetchAll,
    clearBulkControls,
  });

  const { printingInvoices, handlePrintInvoices } = usePreparationInvoicePrinting({
    selectedOrders,
    navigate,
    user,
  });

  return {
    printingOrderNumber,
    handlePrintPreparationSlip,
    transferingItemKey,
    handleQuickTransfer,
    activeCarriers,
    showDispatchModal,
    setShowDispatchModal,
    sendingToTurbo,
    handleOpenDispatchModal,
    handleDispatchToCarrier,
    printingInvoices,
    handlePrintInvoices,
  };
}
