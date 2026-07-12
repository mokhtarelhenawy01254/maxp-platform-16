import React, { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { toast } from "sonner";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { useAuth } from "../../hooks/useAuthSimple";
import { printPreparationSlip } from "../../utils/printPreparationSlip";
import {
  DEFAULT_SHORTAGE_HOLD_DETAILS,
  FALLBACK_STATUS_LABELS,
  PAGE_SIZE_OPTIONS,
  SHORTAGE_HOLD_METADATA_KEY,
  SHORTAGE_HOLD_STATUS,
  type PageSize,
} from "./preparation/constants";
import {
  getApiErrorMessage,
  buildShortageHoldDetails,
  getEffectivePreparationStatus,
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
import PreparationOrdersTable from "./preparation/components/PreparationOrdersTable";
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

  const deferredSearch = useDeferredValue(uiState.search);

  const {
    orders,
    setOrders,
    inventory,
    inventoryLoading,
    ensureInventory,
    warehouses,
    statusConfigs,
    preparationSettings,
    pagination,
    summary,
    shortageOwnerOptions: serverShortageOwnerOptions,
    loading,
    fetchInventory,
    fetchAll,
  } = usePreparationQueueData({
    page: uiState.page,
    pageSize: uiState.pageSize,
    activeStage: uiState.activeStage,
    selectedWarehouseId: uiState.selectedWarehouseId,
    stockFilter: uiState.stockFilter,
    shortageReasonFilter: uiState.shortageReasonFilter,
    shortageFollowUpFilter: uiState.shortageFollowUpFilter,
    shortageOwnerFilter: uiState.shortageOwnerFilter,
    productFilter: uiState.productFilter,
    itemCountFilter: uiState.itemCountFilter,
    search: deferredSearch,
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
  const [showStats, setShowStats] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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
    productFilter,
    itemCountFilter,
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
    if (orders.length > 0 && inventory.length === 0 && !inventoryLoading) {
      ensureInventory();
    }
  }, [orders.length, inventory.length, inventoryLoading, ensureInventory]);

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
          let availableInScope = 0;
          let reservedInScope = 0;
          let bestWarehouseName: string | null = null;
          let warehouseCount = 0;
          if (summary?.warehouses) {
            for (const w of summary.warehouses) {
              if (!selectedWarehouseId || w.warehouseId === selectedWarehouseId) {
                availableInScope += w.available;
                reservedInScope += w.reserved;
                if (!bestWarehouseName) bestWarehouseName = w.warehouseName;
                warehouseCount++;
              }
            }
          }
          const quantityNumber = Math.max(1, toNumber(item.quantity));
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
            warehouseCount,
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
        deferredSearch.trim().toLowerCase(),
      ].join("|"),
    [
      activeStage,
      deferredSearch,
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
            isOverride: true,
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

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setShowStats((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          <span>الإحصائيات</span>
          <ChevronDownIcon
            className={`h-4 w-4 text-gray-400 transition-transform ${
              showStats ? "rotate-180" : ""
            }`}
          />
        </button>
        {showStats && (
          <div className="border-t border-gray-100 px-4 pb-4 pt-3">
            <PreparationStats
              searchedOrdersCount={searchedOrdersCount}
              readyCount={readyCount}
              shortageCount={shortageCount}
              readyToShipCount={readyToShipCount}
              shortageHoldCount={shortageHoldCount}
              overdueShortageFollowUpCount={overdueShortageFollowUpCount}
            />
          </div>
        )}
      </div>

      {isMerchantUser ? (
        <MerchantOperationsSummary
          formatPrice={formatPrice}
          formatDate={formatDate}
        />
      ) : null}

      {!preparationSettings.enabled ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-700" />
          <span className="font-semibold">صفحة التجهيز معطلة</span>
          <span className="text-amber-700">— يمكن إعادة تفعيلها من إعدادات الطلبات.</span>
        </div>
      ) : null}

      {allOverdueShortageFollowUpCount > 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm text-orange-900">
          <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-orange-700" />
          <span className="font-semibold">{allOverdueShortageFollowUpCount} طلب تجاوز موعد المتابعة</span>
          <span className="text-orange-700">— استخدم فلتر السبب أو المسؤول للوصول السريع.</span>
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          <span className="flex items-center gap-2">
            <FunnelIcon className="h-4 w-4 text-gray-400" />
            فلترة التجهيز
          </span>
          <ChevronDownIcon
            className={`h-4 w-4 text-gray-400 transition-transform ${
              showFilters ? "rotate-180" : ""
            }`}
          />
        </button>
        {showFilters && (
          <div className="border-t border-gray-100">
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
              productFilter={productFilter}
              itemCountFilter={itemCountFilter}
              warehouses={warehouses}
              onActiveStageChange={uiActions.setActiveStage}
              onSearchChange={uiActions.setSearch}
              onSelectedWarehouseChange={uiActions.setSelectedWarehouse}
              onStockFilterChange={uiActions.setStockFilter}
              onShortageReasonFilterChange={uiActions.setShortageReasonFilter}
              onShortageOwnerFilterChange={uiActions.setShortageOwnerFilter}
              onShortageFollowUpFilterChange={uiActions.setShortageFollowUpFilter}
              onProductFilterChange={uiActions.setProductFilter}
              onItemCountFilterChange={uiActions.setItemCountFilter}
            />
          </div>
        )}
      </div>

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

      <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-2.5">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
              className="h-3.5 w-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            تحديد الكل
          </label>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">قائمة التنفيذ</span>
          {inventoryLoading && (
            <div className="mr-auto flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700">
              <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              جاري التحقق من المتاح
            </div>
          )}
          {!inventoryLoading && loading && (
            <div className="mr-auto h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          )}
        </div>

        {loading ? (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map((row) => (
              <div
                key={row}
                className="flex animate-pulse items-center gap-3 border-b border-gray-100 px-4 py-3"
              >
                <div className="h-4 w-4 rounded bg-gray-200" />
                <div className="h-4 w-16 rounded bg-gray-200" />
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="mr-auto h-4 w-20 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : paginatedOrders.length === 0 ? (
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
          <div className="mt-3">
            <PreparationOrdersTable
              orders={paginatedOrders}
              statusSelections={statusSelections}
              statusOptions={statusOptions}
              statusLabelMap={statusLabelMap}
              selectedSet={selectedSet}
              rowUpdatingId={rowUpdatingId}
              shortageSavingOrderId={shortageSavingOrderId}
              selectedWarehouseId={selectedWarehouseId}
              enabledQcChecks={enabledQcChecks}
              qcChecklistState={qcChecklistState}
              shortageHoldDrafts={shortageHoldDrafts}
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
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-gray-400">
              صفحة {pagination.page} من {totalPages} • {visibleOrdersCount} طلب
            </p>

            <label className="flex items-center gap-1.5 text-xs text-gray-400">
              عرض
              <select
                value={uiState.pageSize}
                onChange={(e) =>
                  uiActions.setPageSize(Number(e.target.value) as PageSize)
                }
                className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 outline-none transition focus:border-amber-400"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              لكل صفحة
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={uiActions.goToPreviousPage}
              disabled={pagination.page === 1}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRightIcon className="h-3.5 w-3.5" />
              السابق
            </button>

            <button
              onClick={() => uiActions.goToNextPage(totalPages)}
              disabled={pagination.page === totalPages}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              التالي
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PreparationQueue;
