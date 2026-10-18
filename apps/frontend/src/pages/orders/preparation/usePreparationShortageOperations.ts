import { useCallback, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import {
  DEFAULT_SHORTAGE_HOLD_DETAILS,
  SHORTAGE_FAILED_STATUS,
  SHORTAGE_HOLD_METADATA_KEY,
  SHORTAGE_HOLD_STATUS,
} from "./constants";
import { buildShortageHoldDetails } from "./helpers";
import type { ShortageHoldDetails, SimpleOrder } from "./types";

export interface UsePreparationShortageOperationsParams {
  orders: SimpleOrder[];
  startingStatus: string;
  updateLocalMetadata: (orderNumber: string, patch: Record<string, unknown>) => void;
  fetchAll: () => Promise<void> | void;
  handleSingleStatusUpdate: (orderNumber: string, status: string) => Promise<boolean | void>;
  getApiErrorMessage: (error: unknown) => string;
  t: (key: string) => string;
}

export interface UsePreparationShortageOperationsReturn {
  shortageHoldDrafts: Record<string, ShortageHoldDetails>;
  setShortageHoldDrafts: React.Dispatch<React.SetStateAction<Record<string, ShortageHoldDetails>>>;
  shortageSavingOrderId: string | null;
  handleShortageFieldChange: (
    orderNumber: string,
    field: keyof ShortageHoldDetails,
    value: string | boolean,
  ) => void;
  saveShortageHoldDetails: (
    orderNumber: string,
    overrides?: Partial<ShortageHoldDetails>,
    options?: { successMessage?: string | null; skipRefresh?: boolean },
  ) => Promise<boolean>;
  handleMarkAsShortageHold: (orderNumber: string) => Promise<void>;
  handleReleaseShortageHold: (orderNumber: string) => Promise<void>;
  handleMarkAsShortageFailed: (orderNumber: string) => Promise<void>;
}

export const usePreparationShortageOperations = ({
  orders,
  startingStatus,
  updateLocalMetadata,
  fetchAll,
  handleSingleStatusUpdate,
  getApiErrorMessage,
  t,
}: UsePreparationShortageOperationsParams): UsePreparationShortageOperationsReturn => {
  const [shortageHoldDrafts, setShortageHoldDrafts] = useState<
    Record<string, ShortageHoldDetails>
  >({});
  const [shortageSavingOrderId, setShortageSavingOrderId] = useState<string | null>(null);

  const handleShortageFieldChange = useCallback(
    (
      orderNumber: string,
      field: keyof ShortageHoldDetails,
      value: string | boolean,
    ) => {
      setShortageHoldDrafts((previous) => ({
        ...previous,
        [orderNumber]: {
          ...DEFAULT_SHORTAGE_HOLD_DETAILS,
          ...(previous[orderNumber] || {}),
          [field]: value,
        },
      }));
    },
    [],
  );

  const saveShortageHoldDetails = useCallback(
    async (
      orderNumber: string,
      overrides: Partial<ShortageHoldDetails> = {},
      options?: { successMessage?: string | null; skipRefresh?: boolean },
    ) => {
      const order = orders.find((item) => item.orderNumber === orderNumber);
      if (!order) {
        toast.error(t("preparation.page.orderNotFound"));
        return false;
      }

      const currentDraft =
        shortageHoldDrafts[orderNumber] || buildShortageHoldDetails(order.metadata);
      const nextDraft: ShortageHoldDetails = {
        ...DEFAULT_SHORTAGE_HOLD_DETAILS,
        ...currentDraft,
        ...overrides,
      };
      const metadataPatch = {
        [SHORTAGE_HOLD_METADATA_KEY]: nextDraft,
      };

      try {
        setShortageSavingOrderId(orderNumber);
        await apiClient.put(`/orders-new/simple/${encodeURIComponent(orderNumber)}`, {
          metadataPatch,
        });
        updateLocalMetadata(orderNumber, metadataPatch);
        setShortageHoldDrafts((previous) => ({
          ...previous,
          [orderNumber]: nextDraft,
        }));

        if (options?.successMessage !== null) {
          toast.success(options?.successMessage || t("preparation.page.shortageHoldSaved"));
        }

        // Skip refresh when the caller (e.g. handleMarkAsShortageHold /
        // handleReleaseShortageHold) will trigger handleSingleStatusUpdate,
        // which already calls fetchAll — avoids a double network round-trip.
        if (!options?.skipRefresh) {
          void fetchAll();
        }

        return true;
      } catch (error: unknown) {
        console.error("Failed to save shortage hold details:", error);
        toast.error(
          getApiErrorMessage(error) || t("preparation.page.shortageHoldFailed"),
        );
        return false;
      } finally {
        setShortageSavingOrderId(null);
      }
    },
    [fetchAll, getApiErrorMessage, orders, shortageHoldDrafts, t, updateLocalMetadata],
  );

  const handleMarkAsShortageHold = useCallback(
    async (orderNumber: string) => {
      const order = orders.find((item) => item.orderNumber === orderNumber);
      const currentDraft =
        shortageHoldDrafts[orderNumber] || buildShortageHoldDetails(order?.metadata);
      // skipRefresh=true: handleSingleStatusUpdate below already calls fetchAll
      const saved = await saveShortageHoldDetails(
        orderNumber,
        {
          ...currentDraft,
          heldAt: currentDraft.heldAt || new Date().toISOString(),
          releasedAt: "",
          state: "held",
        },
        { successMessage: null, skipRefresh: true },
      );
      if (!saved) return;

      await handleSingleStatusUpdate(orderNumber, SHORTAGE_HOLD_STATUS);
    },
    [handleSingleStatusUpdate, orders, saveShortageHoldDetails, shortageHoldDrafts],
  );

  const handleReleaseShortageHold = useCallback(
    async (orderNumber: string) => {
      const order = orders.find((item) => item.orderNumber === orderNumber);
      const currentDraft =
        shortageHoldDrafts[orderNumber] || buildShortageHoldDetails(order?.metadata);
      // skipRefresh=true: handleSingleStatusUpdate below already calls fetchAll
      const saved = await saveShortageHoldDetails(
        orderNumber,
        {
          ...currentDraft,
          releasedAt: new Date().toISOString(),
          state: "released",
        },
        { successMessage: null, skipRefresh: true },
      );
      if (!saved) return;

      await handleSingleStatusUpdate(
        orderNumber,
        startingStatus,
      );
    },
    [
      handleSingleStatusUpdate,
      orders,
      saveShortageHoldDetails,
      shortageHoldDrafts,
      startingStatus,
    ],
  );

  const handleMarkAsShortageFailed = useCallback(
    async (orderNumber: string) => {
      const order = orders.find((item) => item.orderNumber === orderNumber);
      const currentDraft =
        shortageHoldDrafts[orderNumber] || buildShortageHoldDetails(order?.metadata);
      const confirmed = window.confirm(
        t("preparation.shortagePanel.confirmShortageFailed"),
      );
      if (!confirmed) return;
      // skipRefresh=true: handleSingleStatusUpdate below already calls fetchAll
      const saved = await saveShortageHoldDetails(
        orderNumber,
        {
          ...currentDraft,
          heldAt: currentDraft.heldAt || new Date().toISOString(),
          releasedAt: new Date().toISOString(),
          state: "released",
        },
        { successMessage: null, skipRefresh: true },
      );
      if (!saved) return;

      await handleSingleStatusUpdate(orderNumber, SHORTAGE_FAILED_STATUS);
    },
    [handleSingleStatusUpdate, orders, saveShortageHoldDetails, shortageHoldDrafts, t],
  );

  return {
    shortageHoldDrafts,
    setShortageHoldDrafts,
    shortageSavingOrderId,
    handleShortageFieldChange,
    saveShortageHoldDetails,
    handleMarkAsShortageHold,
    handleReleaseShortageHold,
    handleMarkAsShortageFailed,
  };
};

export default usePreparationShortageOperations;
