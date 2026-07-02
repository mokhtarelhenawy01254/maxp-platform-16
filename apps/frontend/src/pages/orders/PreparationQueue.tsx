import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { useAuth } from "../../hooks/useAuthSimple";
import { printPreparationSlip } from "../../utils/printPreparationSlip";
import {
  DEFAULT_SHORTAGE_HOLD_DETAILS,
  FALLBACK_STATUS_LABELS,
  SHORTAGE_HOLD_METADATA_KEY,
  SHORTAGE_HOLD_STATUS,
} from "./preparation/constants";
import {
  getApiErrorMessage,
  buildShortageHoldDetails,
  getEffectivePreparationStatus,
  getNextStatus,
  getQuickActionLabel,
  getShortageFollowUpState,
  getShortageFollowUpVisual,
  mergePlainObjects,
  normalizeStage,
  parseMaybeJsonObject,
  toNumber,
  toUpper,
} from "./preparation/helpers";
import type {
  InventoryProductSummary,
  ItemInsight,
  PreparationOrder,
  PreparationStatusOption,
  QcCheckKey,
  ShortageHoldDetails,
} from "./preparation/types";
import { usePreparationQueueData } from "./preparation/usePreparationQueueData";
import { usePreparationQueueUiState } from "./preparation/usePreparationQueueUiState";
import PreparationBulkActions from "./preparation/components/PreparationBulkActions";
import PreparationFilters from "./preparation/components/PreparationFilters";
import PreparationOrderCard from "./preparation/components/PreparationOrderCard";
import PreparationPageHeader from "./preparation/components/PreparationPageHeader";
import PreparationStats from "./preparation/components/PreparationStats";
import MerchantOperationsSummary from "./preparation/components/MerchantOperationsSummary";

type BulkStatusResult = {
  id?: string | number | null;
  success?: boolean;
};

const PreparationQueue: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const { user } = useAuth();
  const { state: uiState, actions: uiActions } = usePreparationQueueUiState();
  const isMerchantUser = user?.role === "MERCHANT";

  const {
    orders,
    setOrders,
    inventory,
    warehouses,
    statusConfigs,
    preparationSettings,
    pagination,
    summary,
    shortageOwnerOptions: serverShortageOwnerOptions,
    loading,
    refreshing,
    fetchInventory,
    fetchAll,
  } = usePreparationQueueData({
    page: uiState.page,
    activeStage: uiState.activeStage,
    selectedWarehouseId: uiState.selectedWarehouseId,
    stockFilter: uiState.stockFilter,
    shortageReasonFilter: uiState.shortageReasonFilter,
    shortageFollowUpFilter: uiState.shortageFollowUpFilter,
    shortageOwnerFilter: uiState.shortageOwnerFilter,
    search: uiState.search,
  });
  const [rowUpdatingId, setRowUpdatingId] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [qcChecklistState, setQcChecklistState] = useState<
    Record<string, Partial<Record<QcCheckKey, boolean>>>
  >({});
  const [shortageHoldDrafts, setShortageHoldDrafts] = useState<
    Record<string, ShortageHoldDetails>
  >({});
  const [transferingItemKey, setTransferingItemKey] = useState<string | null>(null);
  const [printingOrderNumber, setPrintingOrderNumber] = useState<string | null>(
    null,
  );
  const [shortageSavingOrderId, setShortageSavingOrderId] = useState<
    string | null
  >(null);

  const {
    activeStage,
    selectedWarehouseId,
    stockFilter,
    shortageReasonFilter,
    shortageFollowUpFilter,
    shortageOwnerFilter,
    search,
    selectedOrders,
    statusSelections,
    bulkStatus,
  } = uiState;

  useEffect(() => {
    if (preparationSettings.defaultWarehouseId) {
      uiActions.applyDefaultWarehouse(preparationSettings.defaultWarehouseId);
    }
  }, [preparationSettings.defaultWarehouseId, uiActions]);

  useEffect(() => {
    setShortageHoldDrafts((previous) => {
      const nextDrafts = { ...previous };

      orders.forEach((order) => {
        if (!nextDrafts[order.orderNumber]) {
          nextDrafts[order.orderNumber] = buildShortageHoldDetails(order.metadata);
        }
      });

      return nextDrafts;
    });
  }, [orders]);

  const statusLabelMap = useMemo(() => {
    const map = new Map<string, string>();

    Object.entries(FALLBACK_STATUS_LABELS).forEach(([code, label]) => {
      map.set(code, label);
    });

    statusConfigs.forEach((status) => {
      map.set(toUpper(status.code), status.name);
    });

    return map;
  }, [statusConfigs]);

  const statusOptions = useMemo<PreparationStatusOption[]>(() => {
    const dynamicOptions = [
      { code: preparationSettings.startingStatus, fallbackName: "في انتظار التجهيز" },
      { code: "PREPARING", fallbackName: "قيد التجهيز" },
      { code: "QUALITY_CHECK", fallbackName: "فحص الجودة" },
      { code: "PACKAGED", fallbackName: "تم التغليف" },
      { code: SHORTAGE_HOLD_STATUS, fallbackName: "مؤجل بسبب العجز" },
      {
        code: preparationSettings.handoffStatus || "READY_TO_SHIP",
        fallbackName: "جاهز للشحن",
      },
    ];

    const deduped = new Map<string, PreparationStatusOption>();
    dynamicOptions.forEach((option) => {
      deduped.set(toUpper(option.code), {
        code: toUpper(option.code),
        fallbackName: option.fallbackName,
      });
    });

    return [...deduped.values()];
  }, [preparationSettings.handoffStatus, preparationSettings.startingStatus]);

  const enabledQcChecks = useMemo(
    () =>
      (
        Object.keys(preparationSettings.qcChecks) as QcCheckKey[]
      ).filter((key) => preparationSettings.qcChecks[key]),
    [preparationSettings.qcChecks],
  );

  const inventorySummaryByProduct = useMemo(() => {
    const map = new Map<string, InventoryProductSummary>();

    inventory.forEach((record) => {
      const productId = String(record.productId || "");
      if (!productId) return;

      if (!map.has(productId)) {
        map.set(productId, {
          productId,
          productName:
            record.products?.name || record.products?.sku || "منتج غير مسمى",
          sku: record.products?.sku || null,
          totalQuantity: 0,
          totalAvailable: 0,
          totalReserved: 0,
          warehouses: [],
        });
      }

      const entry = map.get(productId)!;
      entry.totalQuantity += toNumber(record.quantity);
      entry.totalAvailable += toNumber(record.available);
      entry.totalReserved += toNumber(record.reserved);
      entry.warehouses.push({
        warehouseId: String(record.warehouseId || ""),
        warehouseName: record.warehouses?.name || "مخزن غير محدد",
        quantity: toNumber(record.quantity),
        available: toNumber(record.available),
        reserved: toNumber(record.reserved),
      });
    });

    map.forEach((entry) => {
      entry.warehouses.sort((a, b) => b.available - a.available);
    });

    return map;
  }, [inventory]);

  const preparationOrders = useMemo(() => {
    const dedupeWarehouseName = (names: Array<string | null>) => {
      const counter = new Map<string, number>();
      names
        .filter((name): name is string => Boolean(name))
        .forEach((name) => {
          counter.set(name, (counter.get(name) || 0) + 1);
        });

      const winner = [...counter.entries()].sort((a, b) => b[1] - a[1])[0];
      return winner?.[0] || null;
    };

    return orders.reduce<PreparationOrder[]>((result, order) => {
        const normalizedStatus = getEffectivePreparationStatus(
          order.status,
          order.metadata,
        );
        const stage = normalizeStage(normalizedStatus);
        const totalValue = toNumber(order.total);
        const shortageHoldDetails = buildShortageHoldDetails(order.metadata);

        if (!stage) {
          return result;
        }

        const itemInsights: ItemInsight[] = order.items.map((item) => {
          const summary = inventorySummaryByProduct.get(String(item.productId || ""));
          const scopedWarehouses = selectedWarehouseId
            ? summary?.warehouses.filter(
                (warehouse) => warehouse.warehouseId === selectedWarehouseId,
              ) || []
            : summary?.warehouses || [];

          const availableInScope = scopedWarehouses.reduce(
            (sum, warehouse) => sum + warehouse.available,
            0,
          );
          const reservedInScope = scopedWarehouses.reduce(
            (sum, warehouse) => sum + warehouse.reserved,
            0,
          );
          const quantityNumber = Math.max(1, toNumber(item.quantity));
          const bestWarehouseName = scopedWarehouses[0]?.warehouseName || null;
          const metadataProductName =
            typeof item.metadata === "object" &&
            item.metadata &&
            !Array.isArray(item.metadata) &&
            typeof item.metadata["productName"] === "string"
              ? item.metadata["productName"]
              : "";

          return {
            ...item,
            displayName: item.productName || item.name || metadataProductName || "منتج غير محدد",
            quantityNumber,
            availableInScope,
            reservedInScope,
            shortage: Math.max(0, quantityNumber - availableInScope),
            bestWarehouseName,
            warehouseCount: scopedWarehouses.length,
          };
        });

        const missingItemsCount = itemInsights.filter(
          (item) => item.shortage > 0,
        ).length;
        const warehouseMatch = selectedWarehouseId
          ? itemInsights.length > 0
          : true;

        result.push({
          ...order,
          normalizedStatus,
          stage,
          totalValue,
          totalUnits: itemInsights.reduce(
            (sum, item) => sum + item.quantityNumber,
            0,
          ),
          itemInsights,
          missingItemsCount,
          isReady: itemInsights.length > 0 && missingItemsCount === 0,
          warehouseMatch,
          recommendedWarehouseName: dedupeWarehouseName(
            itemInsights.map((item) => item.bestWarehouseName),
          ),
          shortageHoldDetails,
        });

        return result;
      }, []);
  }, [inventorySummaryByProduct, orders, selectedWarehouseId]);

  const shortageOwnerOptions = useMemo(() => {
    const uniqueOwners = new Set<string>();

    serverShortageOwnerOptions.forEach((owner) => {
      const normalizedOwner = owner.trim();
      if (normalizedOwner) {
        uniqueOwners.add(normalizedOwner);
      }
    });

    preparationOrders.forEach((order) => {
      const effectiveShortageDetails =
        shortageHoldDrafts[order.orderNumber] || order.shortageHoldDetails;
      const owner = effectiveShortageDetails?.owner?.trim();
      if (owner) {
        uniqueOwners.add(owner);
      }
    });

    return [...uniqueOwners].sort((left, right) => left.localeCompare(right, "ar"));
  }, [preparationOrders, serverShortageOwnerOptions, shortageHoldDrafts]);

  const stageCounts = summary.stageCounts;
  const totalPages = Math.max(1, pagination.pages);
  const paginatedOrders = preparationOrders;
  const visibleOrdersCount = summary.visibleTotal;
  const searchedOrdersCount = summary.filteredTotal;
  const readyCount = summary.readyCount;
  const shortageCount = summary.shortageCount;
  const shortageHoldCount = summary.shortageHoldCount;
  const overdueShortageFollowUpCount = summary.overdueShortageFollowUpCount;
  const allOverdueShortageFollowUpCount =
    summary.allOverdueShortageFollowUpCount;
  const readyToShipCount = summary.readyToShipCount;

  useEffect(() => {
    uiActions.clampPage(totalPages);
  }, [totalPages, uiActions]);

  const selectionResetKey = useMemo(
    () =>
      [
        activeStage,
        selectedWarehouseId,
        stockFilter,
        shortageReasonFilter,
        shortageFollowUpFilter,
        shortageOwnerFilter.trim().toLowerCase(),
        search.trim().toLowerCase(),
      ].join("|"),
    [
      activeStage,
      search,
      selectedWarehouseId,
      shortageFollowUpFilter,
      shortageOwnerFilter,
      shortageReasonFilter,
      stockFilter,
    ],
  );
  const didInitSelectionReset = useRef(false);

  useEffect(() => {
    if (!didInitSelectionReset.current) {
      didInitSelectionReset.current = true;
      return;
    }

    uiActions.clearBulkControls();
  }, [selectionResetKey, uiActions]);

  const selectedSet = useMemo(() => new Set(selectedOrders), [selectedOrders]);
  const allVisibleSelected =
    paginatedOrders.length > 0 &&
    paginatedOrders.every((order) => selectedSet.has(order.orderNumber));

  const updateLocalStatuses = useCallback(
    (orderNumbers: string[], nextStatus: string) => {
      const normalized = toUpper(nextStatus);
      setOrders((previous) =>
        previous.map((order) =>
          orderNumbers.includes(order.orderNumber)
            ? { ...order, status: normalized, updatedAt: new Date().toISOString() }
            : order,
        ),
      );
    },
    [setOrders],
  );

  const updateLocalMetadata = useCallback(
    (orderNumber: string, metadataPatch: Record<string, unknown>) => {
      setOrders((previous) =>
        previous.map((order) => {
          if (order.orderNumber !== orderNumber) return order;

          const currentMetadata = parseMaybeJsonObject(order.metadata);
          return {
            ...order,
            metadata: mergePlainObjects(currentMetadata, metadataPatch),
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [setOrders],
  );

  const getOrderByNumber = useCallback(
    (orderNumber: string) =>
      preparationOrders.find((order) => order.orderNumber === orderNumber) || null,
    [preparationOrders],
  );

  const isQcComplete = useCallback(
    (orderNumber: string) => {
      if (!preparationSettings.enableQcChecklist || enabledQcChecks.length === 0) {
        return true;
      }

      return enabledQcChecks.every(
        (key) => qcChecklistState[orderNumber]?.[key] === true,
      );
    },
    [enabledQcChecks, preparationSettings.enableQcChecklist, qcChecklistState],
  );

  const validateTransition = useCallback(
    (order: PreparationOrder, nextStatus: string) => {
      const normalizedNextStatus = toUpper(nextStatus);

      if (!preparationSettings.enabled) {
        return {
          valid: false,
          message: "تم إيقاف مسار التجهيز من الإعدادات الحالية",
        };
      }

      if (
        preparationSettings.requireStockBeforePreparing &&
        !preparationSettings.allowPartialPreparation &&
        !order.isReady &&
        [
          "PREPARING",
          "QUALITY_CHECK",
          "PACKAGED",
          preparationSettings.handoffStatus,
        ].includes(normalizedNextStatus)
      ) {
        return {
          valid: false,
          message: preparationSettings.allowCrossWarehouseTransfer
            ? "لا يمكن متابعة الطلب مع وجود نواقص. يمكنك تحديد مخزن الوجهة ثم استخدام النقل السريع من العناصر الناقصة."
            : "لا يمكن متابعة الطلب مع وجود نواقص لأن الإعدادات تشترط اكتمال المخزون أولًا.",
        };
      }

      if (
        order.stage === "QUALITY_CHECK" &&
        ["PACKAGED", preparationSettings.handoffStatus].includes(normalizedNextStatus) &&
        !isQcComplete(order.orderNumber)
      ) {
        return {
          valid: false,
          message: "يجب استكمال checklist فحص الجودة قبل اعتماد التغليف.",
        };
      }

      return { valid: true, message: "" };
    },
    [
      isQcComplete,
      preparationSettings.allowCrossWarehouseTransfer,
      preparationSettings.allowPartialPreparation,
      preparationSettings.enabled,
      preparationSettings.handoffStatus,
      preparationSettings.requireStockBeforePreparing,
    ],
  );

  const handleQcCheckToggle = useCallback(
    (orderNumber: string, key: QcCheckKey, checked: boolean) => {
      setQcChecklistState((previous) => ({
        ...previous,
        [orderNumber]: {
          ...previous[orderNumber],
          [key]: checked,
        },
      }));
    },
    [],
  );

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

  const handlePrintPreparationSlip = useCallback(async (orderNumber: string) => {
    try {
      setPrintingOrderNumber(orderNumber);
      await printPreparationSlip(orderNumber);
      toast.success("تم فتح ورقة التجهيز للطباعة");
    } catch (error: unknown) {
      console.error("Failed to print preparation slip:", error);
      toast.error(getApiErrorMessage(error) || "فشل في فتح ورقة التجهيز");
    } finally {
      setPrintingOrderNumber(null);
    }
  }, []);

  const saveShortageHoldDetails = useCallback(
    async (
      orderNumber: string,
      overrides: Partial<ShortageHoldDetails> = {},
      options?: { successMessage?: string | null },
    ) => {
      const order = orders.find((item) => item.orderNumber === orderNumber);
      if (!order) {
        toast.error("تعذر العثور على الطلب المحدد");
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
          toast.success(options?.successMessage || "تم حفظ بيانات تعليق العجز");
        }

        void fetchAll();
        return true;
      } catch (error: unknown) {
        console.error("Failed to save shortage hold details:", error);
        toast.error(
          getApiErrorMessage(error) || "تعذر حفظ بيانات تعليق العجز",
        );
        return false;
      } finally {
        setShortageSavingOrderId(null);
      }
    },
    [fetchAll, orders, shortageHoldDrafts, updateLocalMetadata],
  );

  const handleSingleStatusUpdate = useCallback(
    async (orderNumber: string, nextStatus: string) => {
      const order = getOrderByNumber(orderNumber);
      if (!order) {
        toast.error("تعذر العثور على الطلب المحدد");
        return;
      }

      const validation = validateTransition(order, nextStatus);
      if (!validation.valid) {
        toast.error(validation.message);
        return;
      }

      try {
        setRowUpdatingId(orderNumber);
        await apiClient.post(
          `/orders-new/simple/${encodeURIComponent(orderNumber)}/status`,
          {
            status: nextStatus,
            notes:
              order.stage === "QUALITY_CHECK" &&
              ["PACKAGED", preparationSettings.handoffStatus].includes(
                toUpper(nextStatus),
              )
                ? "QC completed from preparation queue"
                : "Updated from preparation queue",
          },
        );

        updateLocalStatuses([orderNumber], nextStatus);
        toast.success(
          `تم تحديث ${orderNumber} إلى ${statusLabelMap.get(nextStatus) || nextStatus}`,
        );
        void fetchAll();
      } catch (error: unknown) {
        console.error("Failed to update order status:", error);
        toast.error(
          getApiErrorMessage(error) || "تعذر تحديث مرحلة التجهيز",
        );
      } finally {
        setRowUpdatingId(null);
      }
    },
    [
      getOrderByNumber,
      fetchAll,
      preparationSettings.handoffStatus,
      statusLabelMap,
      updateLocalStatuses,
      validateTransition,
    ],
  );

  const handleBulkUpdate = useCallback(async () => {
    if (!bulkStatus || selectedOrders.length === 0) return;

    const selectedOrderObjects = selectedOrders
      .map((orderNumber) => getOrderByNumber(orderNumber))
      .filter((order): order is PreparationOrder => Boolean(order));
    const validOrders: PreparationOrder[] = [];
    const invalidOrders: PreparationOrder[] = [];

    selectedOrderObjects.forEach((order) => {
      const validation = validateTransition(order, bulkStatus);
      if (validation.valid) {
        validOrders.push(order);
      } else {
        invalidOrders.push(order);
      }
    });

    if (validOrders.length === 0) {
      toast.error("كل الطلبات المحددة مخالفة لقواعد التجهيز الحالية");
      return;
    }

    const confirmed = window.confirm(
      `تحديث ${validOrders.length} طلب إلى مرحلة ${
        statusLabelMap.get(bulkStatus) || bulkStatus
      }${invalidOrders.length > 0 ? ` مع استبعاد ${invalidOrders.length} طلب غير مطابق` : ""}؟`,
    );

    if (!confirmed) return;

    try {
      setBulkUpdating(true);
      const response = await apiClient.post("/orders-new/bulk/status", {
        orderIds: validOrders.map((order) => order.orderNumber),
        status: bulkStatus,
      });

      const results: BulkStatusResult[] = Array.isArray(response.data?.data?.results)
        ? response.data.data.results
        : [];
      const successIds = results
        .filter((result) => result.success)
        .map((result) => String(result.id));

      if (successIds.length > 0) {
        updateLocalStatuses(successIds, bulkStatus);
      }

      const failedCount = results.filter((result) => !result.success).length;
      toast.success(
        failedCount > 0
          ? `تم تحديث ${successIds.length} طلب وفشل ${failedCount} طلب`
          : `تم تحديث ${successIds.length} طلب بنجاح`,
      );

      uiActions.clearBulkControls();
      void fetchAll();
    } catch (error: unknown) {
      console.error("Failed bulk status update:", error);
      toast.error(
        getApiErrorMessage(error) || "تعذر تحديث الطلبات المحددة",
      );
    } finally {
      setBulkUpdating(false);
    }
  }, [
    bulkStatus,
    fetchAll,
    getOrderByNumber,
    selectedOrders,
    statusLabelMap,
    updateLocalStatuses,
    uiActions,
    validateTransition,
  ]);

  const handleQuickTransfer = useCallback(
    async (orderNumber: string, item: ItemInsight) => {
      if (!selectedWarehouseId) {
        toast.error("حدد مخزن الوجهة أولًا لتفعيل النقل السريع");
        return;
      }

      if (!item.productId || item.shortage <= 0) {
        toast.error("لا يوجد عجز صالح للنقل في هذا العنصر");
        return;
      }

      const productSummary = inventorySummaryByProduct.get(String(item.productId));
      const sourceWarehouse = productSummary?.warehouses.find(
        (warehouse) =>
          warehouse.warehouseId !== selectedWarehouseId &&
          warehouse.available >= item.shortage,
      );

      if (!sourceWarehouse) {
        toast.error("لم يتم العثور على مخزن مصدر يملك كمية كافية للنقل");
        return;
      }

      const transferKey = `${orderNumber}-${item.productId}`;

      try {
        setTransferingItemKey(transferKey);
        await apiClient.post("/inventory/transfer", {
          productId: item.productId,
          fromWarehouseId: sourceWarehouse.warehouseId,
          toWarehouseId: selectedWarehouseId,
          quantity: item.shortage,
          notes: `Preparation transfer for order ${orderNumber}`,
        });

        toast.success(
          `تم نقل ${item.shortage} قطعة من ${sourceWarehouse.warehouseName} إلى المخزن المحدد`,
        );
        await fetchInventory();
      } catch (error: unknown) {
        console.error("Failed quick transfer:", error);
        toast.error(
          getApiErrorMessage(error) || "تعذر تنفيذ النقل السريع",
        );
      } finally {
        setTransferingItemKey(null);
      }
    },
    [fetchInventory, inventorySummaryByProduct, selectedWarehouseId],
  );

  const handleMarkAsShortageHold = useCallback(
    async (orderNumber: string) => {
      const order = orders.find((item) => item.orderNumber === orderNumber);
      const currentDraft =
        shortageHoldDrafts[orderNumber] || buildShortageHoldDetails(order?.metadata);
      const saved = await saveShortageHoldDetails(
        orderNumber,
        {
          ...currentDraft,
          heldAt: currentDraft.heldAt || new Date().toISOString(),
          releasedAt: "",
          state: "held",
        },
        { successMessage: null },
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
      const saved = await saveShortageHoldDetails(
        orderNumber,
        {
          ...currentDraft,
          releasedAt: new Date().toISOString(),
          state: "released",
        },
        { successMessage: null },
      );
      if (!saved) return;

      await handleSingleStatusUpdate(
        orderNumber,
        preparationSettings.startingStatus,
      );
    },
    [
      handleSingleStatusUpdate,
      orders,
      preparationSettings.startingStatus,
      saveShortageHoldDetails,
      shortageHoldDrafts,
    ],
  );

  const toggleOrderSelection = (orderNumber: string) => {
    uiActions.toggleOrderSelection(orderNumber);
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      uiActions.clearVisibleSelection(
        paginatedOrders.map((order) => order.orderNumber),
      );
      return;
    }

    const visibleIds = paginatedOrders.map((order) => order.orderNumber);
    uiActions.selectVisibleOrders(visibleIds);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
          <p className="mt-4 text-sm text-gray-500">
            جاري تحميل قائمة تجهيز الطلبات...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PreparationPageHeader
        refreshing={refreshing}
        onRefresh={() => void fetchAll(true)}
      />

      <PreparationStats
        searchedOrdersCount={searchedOrdersCount}
        readyCount={readyCount}
        shortageCount={shortageCount}
        readyToShipCount={readyToShipCount}
        shortageHoldCount={shortageHoldCount}
        overdueShortageFollowUpCount={overdueShortageFollowUpCount}
      />

      {isMerchantUser ? (
        <MerchantOperationsSummary
          formatPrice={formatPrice}
          formatDate={formatDate}
        />
      ) : null}

      {!preparationSettings.enabled ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <h2 className="font-semibold text-amber-900">
                صفحة التجهيز معطلة من الإعدادات
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                التبويب ما زال ظاهرًا للإدارة، لكن الإعدادات الحالية تشير إلى أن
                workflow التجهيز متوقف. يمكنك إعادة تفعيله من إعدادات الطلبات ثم
                تبويب تجهيز الطلبات.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {allOverdueShortageFollowUpCount > 0 ? (
        <section className="rounded-3xl border border-orange-200 bg-orange-50 px-5 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" />
            <div>
              <h2 className="font-semibold text-orange-900">
                توجد طلبات مؤجلة تجاوزت موعد المتابعة
              </h2>
              <p className="mt-1 text-sm text-orange-800">
                يوجد حاليًا {allOverdueShortageFollowUpCount} طلب في `مؤجل للعجز`
                مرّ عليه تاريخ المتابعة. استخدم فلتر السبب أو المسؤول للوصول
                السريع لها ومراجعتها.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <PreparationFilters
        activeStage={activeStage}
        stageCounts={stageCounts}
        visibleOrdersCount={visibleOrdersCount}
        search={search}
        selectedWarehouseId={selectedWarehouseId}
        stockFilter={stockFilter}
        shortageReasonFilter={shortageReasonFilter}
        shortageOwnerFilter={shortageOwnerFilter}
        shortageOwnerOptions={shortageOwnerOptions}
        shortageFollowUpFilter={shortageFollowUpFilter}
        warehouses={warehouses}
        onActiveStageChange={uiActions.setActiveStage}
        onSearchChange={uiActions.setSearch}
        onSelectedWarehouseChange={uiActions.setSelectedWarehouse}
        onStockFilterChange={uiActions.setStockFilter}
        onShortageReasonFilterChange={uiActions.setShortageReasonFilter}
        onShortageOwnerFilterChange={uiActions.setShortageOwnerFilter}
        onShortageFollowUpFilterChange={uiActions.setShortageFollowUpFilter}
      />

      <PreparationBulkActions
        selectedOrdersCount={selectedOrders.length}
        bulkStatus={bulkStatus}
        statusOptions={statusOptions}
        statusLabelMap={statusLabelMap}
        bulkUpdating={bulkUpdating}
        preparationEnabled={preparationSettings.enabled}
        bulkStatusUpdateEnabled={preparationSettings.enableBulkStatusUpdate}
        onBulkStatusChange={uiActions.setBulkStatus}
        onApply={() => void handleBulkUpdate()}
        onClear={uiActions.clearBulkControls}
      />

      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              قائمة التنفيذ اليومي
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              الطلبات المعروضة هنا مرتبة بحسب الفلاتر الحالية، ويمكن فتح الطلب
              أو تحريك مرحلته مباشرة من البطاقة.
            </p>
          </div>

          <label className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
              className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            تحديد كل الطلبات في الصفحة الحالية
          </label>
        </div>

        {paginatedOrders.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
            <ClipboardDocumentListIcon className="h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              لا توجد طلبات مطابقة الآن
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
              جرّب تغيير الفلاتر أو إزالة فلتر المخزن، أو حدّث الصفحة إذا كنت
              تتوقع وجود طلبات جديدة في مسار التجهيز.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-5 2xl:grid-cols-2">
            {paginatedOrders.map((order) => {
              const shortageHoldDetails =
                shortageHoldDrafts[order.orderNumber] ||
                buildShortageHoldDetails(order.metadata);
              const shortageFollowUpVisual =
                getShortageFollowUpVisual(
                  getShortageFollowUpState(
                    shortageHoldDetails.followUpDate,
                    order.stage,
                  ),
                );
              const nextStatus = getNextStatus(
                order.stage,
                preparationSettings.handoffStatus,
                preparationSettings.startingStatus,
              );
              const currentStageStatus =
                order.stage === "WAITING"
                  ? preparationSettings.startingStatus
                  : order.stage === "PREPARING"
                    ? "PREPARING"
                    : order.stage === "QUALITY_CHECK"
                      ? "QUALITY_CHECK"
                      : order.stage === "PACKAGED"
                        ? "PACKAGED"
                        : order.stage === "STOCK_SHORTAGE"
                          ? SHORTAGE_HOLD_STATUS
                          : preparationSettings.handoffStatus;
              const defaultTargetStatus = nextStatus || currentStageStatus;
              const currentSelection =
                statusSelections[order.orderNumber] || defaultTargetStatus;
              const actionLabel =
                statusSelections[order.orderNumber] &&
                statusSelections[order.orderNumber] !== defaultTargetStatus
                  ? "تطبيق المرحلة المختارة"
                  : getQuickActionLabel(order.stage);
              const qcCompleted = isQcComplete(order.orderNumber);
              const rowBusy =
                rowUpdatingId === order.orderNumber ||
                shortageSavingOrderId === order.orderNumber;
              const hasShortageContext =
                order.missingItemsCount > 0 || order.stage === "STOCK_SHORTAGE";

              return (
                <PreparationOrderCard
                  key={order.orderNumber}
                  order={order}
                  selected={selectedSet.has(order.orderNumber)}
                  statusOptions={statusOptions}
                  statusLabelMap={statusLabelMap}
                  currentSelection={currentSelection}
                  actionLabel={actionLabel}
                  qcCompleted={qcCompleted}
                  rowBusy={rowBusy}
                  hasShortageContext={hasShortageContext}
                  selectedWarehouseId={selectedWarehouseId}
                  enabledQcChecks={enabledQcChecks}
                  qcChecklist={qcChecklistState[order.orderNumber]}
                  shortageHoldDetails={shortageHoldDetails}
                  shortageFollowUpVisual={shortageFollowUpVisual}
                  transferingItemKey={transferingItemKey}
                  printingOrderNumber={printingOrderNumber}
                  preparationSettings={preparationSettings}
                  formatPrice={formatPrice}
                  formatDate={formatDate}
                  onToggleSelection={toggleOrderSelection}
                  onQuickTransfer={(orderNumber, item) =>
                    void handleQuickTransfer(orderNumber, item)
                  }
                  onShortageFieldChange={handleShortageFieldChange}
                  onSaveShortageHoldDetails={saveShortageHoldDetails}
                  onQcCheckToggle={handleQcCheckToggle}
                  onStatusSelectionChange={uiActions.setStatusSelection}
                  onSingleStatusUpdate={(orderNumber, nextStatus) =>
                    void handleSingleStatusUpdate(orderNumber, nextStatus)
                  }
                  onMarkAsShortageHold={(orderNumber) =>
                    void handleMarkAsShortageHold(orderNumber)
                  }
                  onReleaseShortageHold={(orderNumber) =>
                    void handleReleaseShortageHold(orderNumber)
                  }
                  onPrintPreparationSlip={(orderNumber) =>
                    void handlePrintPreparationSlip(orderNumber)
                  }
                />
              );
            })}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-gray-500">
            صفحة {pagination.page} من {totalPages} • إجمالي {visibleOrdersCount} طلب
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={uiActions.goToPreviousPage}
              disabled={pagination.page === 1}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRightIcon className="h-4 w-4" />
              السابق
            </button>

            <button
              onClick={() => uiActions.goToNextPage(totalPages)}
              disabled={pagination.page === totalPages}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              التالي
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PreparationQueue;
