import { useTranslation } from "react-i18next";
import React, { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { useAuth } from "../../hooks/useAuthSimple";
import { printPreparationSlip } from "../../utils/printPreparationSlip";
import {
  DEFAULT_SHORTAGE_HOLD_DETAILS,
  PAGE_SIZE_OPTIONS,
  PREPARATION_COLUMN_LABELS,
  PREPARATION_FILTER_SECTION_LABELS,
  PREPARATION_FILTER_SECTIONS,
  PREPARATION_TABLE_COLUMNS,
  SHORTAGE_HOLD_METADATA_KEY,
  SHORTAGE_HOLD_STATUS,
  VISIBLE_COLUMNS_STORAGE_KEY,
  type PageSize,
  type PreparationFilterSection,
  type PreparationTableColumn,
} from "./preparation/constants";
import {
  getApiErrorMessage,
  buildShortageHoldDetails,
  getEffectivePreparationStatus,
  mergePlainObjects,
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
import { usePreparationQueueUiState, type PreparationQueueUiState } from "./preparation/usePreparationQueueUiState";
import PreparationBulkActions from "./preparation/components/PreparationBulkActions";
import PreparationFilters from "./preparation/components/PreparationFilters";
import PreparationOrdersTable from "./preparation/components/PreparationOrdersTable";
import MerchantOperationsSummary from "./preparation/components/MerchantOperationsSummary";

type BulkStatusResult = {
  id?: string | number | null;
  success?: boolean;
};

const PREPARATION_STORAGE_KEY = "preparation:queue:view-state:v1";

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const readStoredPreparationState = (): Partial<PreparationQueueUiState> | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREPARATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const getInitialPreparationState = (searchParams: URLSearchParams): Partial<PreparationQueueUiState> => {
  const hasQueryKeys = ["page", "pageSize", "activeStage", "warehouseId", "stockFilter", "shortageReason", "shortageFollowUp", "shortageOwner", "productFilter", "itemCountFilter", "search", "sortBy", "sortOrder", "notPrinted", "noShippingCode"].some((k) => searchParams.has(k));

  if (hasQueryKeys) {
    const pageSizeRaw = parsePositiveInt(searchParams.get("pageSize"), 12);
    const validPageSize = PAGE_SIZE_OPTIONS.includes(pageSizeRaw as PageSize) ? (pageSizeRaw as PageSize) : 12;
    return {
      page: parsePositiveInt(searchParams.get("page"), 1),
      pageSize: validPageSize,
      activeStage: searchParams.get("activeStage") || "ALL",
      selectedWarehouseId: searchParams.get("warehouseId") || "",
      stockFilter: (searchParams.get("stockFilter") as "all" | "ready" | "shortage") || "all",
      shortageReasonFilter: (searchParams.get("shortageReason") as "all" | "stock_shortage" | "waiting_transfer" | "waiting_restock" | "other") || "all",
      shortageFollowUpFilter: (searchParams.get("shortageFollowUp") as "all" | "today" | "overdue" | "without_date") || "all",
      shortageOwnerFilter: searchParams.get("shortageOwner") || "",
      productFilter: searchParams.get("productFilter") || "",
      itemCountFilter: (searchParams.get("itemCountFilter") as "all" | "single" | "multiple") || "all",
      search: searchParams.get("search") || "",
      sortBy: (searchParams.get("sortBy") as "createdAt" | "totalUnits" | "totalValue") || "createdAt",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
      notPrintedFilter: (searchParams.get("notPrinted") as "all" | "not_printed") || "all",
      noShippingCodeFilter: (searchParams.get("noShippingCode") as "all" | "no_shipping_code") || "all",
    };
  }

  const stored = readStoredPreparationState();
  if (stored) {
    return stored;
  }

  return {};
};

const PreparationQueue: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOverrides = useMemo(() => getInitialPreparationState(searchParams), []);
  const { state: uiState, actions: uiActions } = usePreparationQueueUiState(initialOverrides);
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
    preparationStatuses,
    preparationSettings,
    pagination,
    summary,
    statusCounts,
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
    notPrintedFilter: uiState.notPrintedFilter,
    noShippingCodeFilter: uiState.noShippingCodeFilter,
    search: deferredSearch,
    sortBy: uiState.sortBy,
    sortOrder: uiState.sortOrder,
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
  const [sendingToTurbo, setSendingToTurbo] = useState(false);
  const [printingInvoices, setPrintingInvoices] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<PreparationTableColumn[]>(() => {
    if (typeof window === "undefined") return [...PREPARATION_TABLE_COLUMNS];
    try {
      const raw = window.localStorage.getItem(VISIBLE_COLUMNS_STORAGE_KEY);
      if (!raw) return [...PREPARATION_TABLE_COLUMNS];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((c: string) => PREPARATION_TABLE_COLUMNS.includes(c as PreparationTableColumn))) {
        return parsed as PreparationTableColumn[];
      }
    } catch { /* ignore */ }
    return [...PREPARATION_TABLE_COLUMNS];
  });
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);

  const toggleColumn = (col: PreparationTableColumn) => {
    setVisibleColumns((prev) =>
      prev.includes(col)
        ? prev.filter((c) => c !== col)
        : [...prev, col],
    );
  };

  const [visibleFilterSections, setVisibleFilterSections] = useState<PreparationFilterSection[]>(() => {
    if (typeof window === "undefined") return [...PREPARATION_FILTER_SECTIONS];
    try {
      const raw = window.localStorage.getItem("preparation:queue:visible-filters-v1");
      if (!raw) return [...PREPARATION_FILTER_SECTIONS];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((s: string) => PREPARATION_FILTER_SECTIONS.includes(s as PreparationFilterSection))) {
        return parsed as PreparationFilterSection[];
      }
    } catch { /* ignore */ }
    return [...PREPARATION_FILTER_SECTIONS];
  });
  const [showFilters, setShowFilters] = useState(true);

  const toggleFilterSection = (section: PreparationFilterSection) => {
    setVisibleFilterSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section],
    );
  };

  const {
    activeStage,
    selectedWarehouseId,
    stockFilter,
    shortageReasonFilter,
    shortageFollowUpFilter,
    shortageOwnerFilter,
    productFilter,
    itemCountFilter,
    notPrintedFilter,
    noShippingCodeFilter,
    search,
    sortBy,
    sortOrder,
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

  useEffect(() => {
    const nextState: Record<string, unknown> = {
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
      search: uiState.search,
      sortBy: uiState.sortBy,
      sortOrder: uiState.sortOrder,
      notPrintedFilter: uiState.notPrintedFilter,
      noShippingCodeFilter: uiState.noShippingCodeFilter,
    };

    const params: Record<string, string> = {};
    if (nextState.page !== 1) params.page = String(nextState.page);
    if (nextState.pageSize !== 12) params.pageSize = String(nextState.pageSize);
    if (nextState.activeStage !== "ALL") params.activeStage = String(nextState.activeStage);
    if (nextState.selectedWarehouseId) params.warehouseId = String(nextState.selectedWarehouseId);
    if (nextState.stockFilter !== "all") params.stockFilter = String(nextState.stockFilter);
    if (nextState.shortageReasonFilter !== "all") params.shortageReason = String(nextState.shortageReasonFilter);
    if (nextState.shortageFollowUpFilter !== "all") params.shortageFollowUp = String(nextState.shortageFollowUpFilter);
    if (nextState.shortageOwnerFilter) params.shortageOwner = String(nextState.shortageOwnerFilter);
    if (nextState.productFilter) params.productFilter = String(nextState.productFilter);
    if (nextState.itemCountFilter !== "all") params.itemCountFilter = String(nextState.itemCountFilter);
    if (nextState.notPrintedFilter !== "all") params.notPrinted = String(nextState.notPrintedFilter);
    if (nextState.noShippingCodeFilter !== "all") params.noShippingCode = String(nextState.noShippingCodeFilter);
    if (nextState.search) params.search = String(nextState.search);
    if (nextState.sortBy !== "createdAt") params.sortBy = String(nextState.sortBy);
    if (nextState.sortOrder !== "desc") params.sortOrder = String(nextState.sortOrder);

    setSearchParams(params, { replace: true });

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(PREPARATION_STORAGE_KEY, JSON.stringify(nextState));
      } catch {
        // ignore
      }
    }
  }, [
    uiState.page,
    uiState.pageSize,
    uiState.activeStage,
    uiState.selectedWarehouseId,
    uiState.stockFilter,
    uiState.shortageReasonFilter,
    uiState.shortageFollowUpFilter,
    uiState.shortageOwnerFilter,
    uiState.productFilter,
    uiState.itemCountFilter,
    uiState.search,
    uiState.sortBy,
    uiState.sortOrder,
    uiState.notPrintedFilter,
    uiState.noShippingCodeFilter,
    setSearchParams,
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
        window.localStorage.setItem("preparation:queue:visible-filters-v1", JSON.stringify(visibleFilterSections));
      } catch { /* ignore */ }
    }
  }, [visibleColumns, visibleFilterSections]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (columnSettingsOpen && !target.closest("[data-column-settings]")) {
        setColumnSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [columnSettingsOpen]);

  const statusLabelMap = useMemo(() => {
    const map = new Map<string, string>();

    statusConfigs.forEach((status) => {
      map.set(toUpper(status.code), status.name);
    });

    return map;
  }, [statusConfigs]);

  const statusOptions = useMemo<PreparationStatusOption[]>(() => {
    const dynamicOptions = preparationStatuses.map((s) => ({
      code: toUpper(s.code),
      fallbackName: s.name,
    }));

    const includesStarting = dynamicOptions.some(
      (opt) => opt.code === toUpper(preparationSettings.startingStatus),
    );
    if (!includesStarting && preparationSettings.startingStatus) {
      dynamicOptions.unshift({
        code: toUpper(preparationSettings.startingStatus),
        fallbackName: t('preparation.k_5'),
      });
    }

    const includesHandoff = dynamicOptions.some(
      (opt) => opt.code === toUpper(preparationSettings.handoffStatus),
    );
    if (!includesHandoff && preparationSettings.handoffStatus) {
      dynamicOptions.push({
        code: toUpper(preparationSettings.handoffStatus),
        fallbackName: t('preparation.k_10'),
      });
    }

    const includesShortage = dynamicOptions.some(
      (opt) => opt.code === toUpper(SHORTAGE_HOLD_STATUS),
    );
    if (!includesShortage) {
      dynamicOptions.push({
        code: toUpper(SHORTAGE_HOLD_STATUS),
        fallbackName: t('preparation.k_9'),
      });
    }

    return dynamicOptions;
  }, [preparationStatuses, preparationSettings.handoffStatus, preparationSettings.startingStatus]);

  const filterTabs = useMemo(() => {
    const seen = new Set<string>();
    const tabs: { statusCode: string; name: string }[] = [];

    preparationStatuses.forEach((status) => {
      const code = toUpper(status.code);
      if (!seen.has(code)) {
        seen.add(code);
        tabs.push({ statusCode: code, name: status.name });
      }
    });

    const forcedStatuses: { code: string; name: string }[] = [
      { code: "CONFIRMED", name: t("orders.confirmed") },
    ];

    forcedStatuses.forEach((s) => {
      const code = toUpper(s.code);
      if (!seen.has(code)) {
        seen.add(code);
        tabs.push({ statusCode: code, name: s.name });
      }
    });

    const shortageCode = toUpper(SHORTAGE_HOLD_STATUS);
    if (!seen.has(shortageCode)) {
      seen.add(shortageCode);
      tabs.push({
        statusCode: shortageCode,
        name: statusLabelMap.get(shortageCode) || t('preparation.k_9'),
      });
    }

    return tabs;
  }, [preparationStatuses, statusLabelMap, SHORTAGE_HOLD_STATUS]);

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
            record.products?.name || record.products?.sku || t('preparation.k_11'),
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
        warehouseName: record.warehouses?.name || t('preparation.k_12'),
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
        const stage = normalizedStatus;
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
            displayName: item.productName || item.name || metadataProductName || t('preparation.k_13'),
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

  const productSuggestions = useMemo(() => {
    const seen = new Set<string>();
    return preparationOrders.flatMap((order) =>
      order.itemInsights.map((item) => {
        const key = `${item.displayName}|${item.color || ""}|${item.size || ""}`;
        if (seen.has(key)) return null;
        seen.add(key);
        return {
          displayName: item.displayName,
          color: item.color || "",
          size: item.size || "",
        };
      }),
    ).filter((s): s is NonNullable<typeof s> => s !== null);
  }, [preparationOrders]);

  const stageCounts = summary.stageCounts;
  const totalPages = Math.max(1, pagination.pages);
  const paginatedOrders = preparationOrders;
  const visibleOrdersCount = summary.filteredTotal;
  const currentPageCount = paginatedOrders.length;
  const allOverdueShortageFollowUpCount =
    summary.allOverdueShortageFollowUpCount;

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
        notPrintedFilter,
        noShippingCodeFilter,
        sortBy,
        sortOrder,
      ].join("|"),
    [
      activeStage,
      deferredSearch,
      selectedWarehouseId,
      shortageFollowUpFilter,
      shortageOwnerFilter,
      shortageReasonFilter,
      notPrintedFilter,
      noShippingCodeFilter,
      sortBy,
      sortOrder,
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
          message: t('preparation.k_14'),
        };
      }

      if (
        preparationSettings.requireStockBeforePreparing &&
        !preparationSettings.allowPartialPreparation &&
        !order.isReady &&
        order.stage !== "WAITING" &&
        [
          "QUALITY_CHECK",
          "PACKAGED",
          preparationSettings.handoffStatus,
        ].includes(normalizedNextStatus)
      ) {
        return {
          valid: false,
          message: preparationSettings.allowCrossWarehouseTransfer
            ? t('preparation.k_15')
            : t('preparation.k_16'),
        };
      }

      if (
        order.stage === "QUALITY_CHECK" &&
        ["PACKAGED", preparationSettings.handoffStatus].includes(normalizedNextStatus) &&
        !isQcComplete(order.orderNumber)
      ) {
        return {
          valid: false,
          message: t('preparation.k_17'),
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
      toast.success(t('preparation.k_18'));
    } catch (error: unknown) {
      console.error("Failed to print preparation slip:", error);
      toast.error(getApiErrorMessage(error) || t('preparation.k_19'));
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
        toast.error(t('preparation.k_20'));
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
          toast.success(options?.successMessage || t('preparation.k_21'));
        }

        void fetchAll();
        return true;
      } catch (error: unknown) {
        console.error("Failed to save shortage hold details:", error);
        toast.error(
          getApiErrorMessage(error) || t('preparation.k_22'),
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
        toast.error(t('preparation.k_20'));
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
          getApiErrorMessage(error) || t('preparation.k_23'),
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
      toast.error(t('preparation.k_24'));
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
        getApiErrorMessage(error) || t('preparation.k_25'),
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

  const handleBulkUpdateAll = useCallback(async () => {
    if (!bulkStatus) return;

    const totalMatching = pagination.total;
    if (totalMatching === 0) {
      toast.error(t('preparation.k_26'));
      return;
    }

    const confirmed = window.confirm(
      `تحديث ${totalMatching} طلب إلى مرحلة ${
        statusLabelMap.get(bulkStatus) || bulkStatus
      } (جميع الطلبات المطابقة للفلتر)؟`,
    );

    if (!confirmed) return;

    const filters = {
      stage: activeStage,
      warehouseId: selectedWarehouseId,
      stockFilter,
      shortageReason: shortageReasonFilter,
      shortageFollowUp: shortageFollowUpFilter,
      shortageOwner: shortageOwnerFilter,
      productFilter,
      itemCountFilter,
      notPrinted: notPrintedFilter === "not_printed" ? "true" : undefined,
      noShippingCode: noShippingCodeFilter === "no_shipping_code" ? "true" : undefined,
      search: deferredSearch,
      sortBy,
      sortOrder,
    };

    try {
      setBulkUpdating(true);
      const response = await apiClient.post("/orders-new/bulk/status/by-filters", {
        status: bulkStatus,
        filters,
      });

      const result = response.data?.data;
      const successCount = result?.successCount ?? 0;
      const totalRequested = result?.totalRequested ?? 0;

      if (totalRequested === 0) {
        toast.error(t('preparation.k_26'));
        return;
      }

      toast.success(
        successCount < totalRequested
          ? `تم تحديث ${successCount} طلب وفشل ${totalRequested - successCount} طلب`
          : `تم تحديث ${successCount} طلب بنجاح`,
      );

      uiActions.clearBulkControls();
      void fetchAll();
    } catch (error: unknown) {
      console.error("Failed bulk status update all:", error);
      toast.error(
        getApiErrorMessage(error) || t('preparation.k_27'),
      );
    } finally {
      setBulkUpdating(false);
    }
  }, [
    bulkStatus,
    activeStage,
    selectedWarehouseId,
    stockFilter,
    shortageReasonFilter,
    shortageFollowUpFilter,
    shortageOwnerFilter,
    productFilter,
    itemCountFilter,
    notPrintedFilter,
    noShippingCodeFilter,
    deferredSearch,
    sortBy,
    sortOrder,
    pagination.total,
    statusLabelMap,
    uiActions,
    fetchAll,
  ]);

  const handleQuickTransfer = useCallback(
    async (orderNumber: string, item: ItemInsight) => {
      if (!selectedWarehouseId) {
        toast.error(t('preparation.k_28'));
        return;
      }

      if (!item.productId || item.shortage <= 0) {
        toast.error(t('preparation.k_29'));
        return;
      }

      const productSummary = inventorySummaryByProduct.get(String(item.productId));
      const sourceWarehouse = productSummary?.warehouses.find(
        (warehouse) =>
          warehouse.warehouseId !== selectedWarehouseId &&
          warehouse.available >= item.shortage,
      );

      if (!sourceWarehouse) {
        toast.error(t('preparation.k_30'));
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
          getApiErrorMessage(error) || t('preparation.k_31'),
        );
      } finally {
        setTransferingItemKey(null);
      }
    },
    [fetchInventory, inventorySummaryByProduct, selectedWarehouseId],
  );

  const handleSendToTurbo = useCallback(async () => {
    if (selectedOrders.length === 0) {
      toast.error(t('preparation.k_32'));
      return;
    }

    const confirmed = window.confirm(
      `إرسال ${selectedOrders.length} طلب إلى تربو؟`,
    );
    if (!confirmed) return;

    try {
      setSendingToTurbo(true);
      const response = await apiClient.post("/turbo/bulk/create-shipments", {
        orderIds: selectedOrders,
      });

      if (response.data?.success) {
        const data = response.data.data;
        toast.success(
          `تم إرسال ${data.success || 0} طلب إلى تربو بنجاح` +
            (data.failed > 0 ? `، فشل ${data.failed} طلب` : ""),
        );
        uiActions.clearBulkControls();
        void fetchAll();
      } else {
        toast.error(response.data?.error || t('preparation.k_33'));
      }
    } catch (error: unknown) {
      console.error("Failed to send to Turbo:", error);
      toast.error(getApiErrorMessage(error) || t('preparation.k_34'));
    } finally {
      setSendingToTurbo(false);
    }
  }, [fetchAll, selectedOrders, uiActions]);

  const handlePrintInvoices = useCallback(async () => {
    if (selectedOrders.length === 0) {
      toast.error(t('preparation.k_35'));
      return;
    }

    try {
      setPrintingInvoices(true);
      const response = await apiClient.post("/order-invoices/bulk-generate", {
        orderIds: selectedOrders,
      });

      if (response.data?.success) {
        const invoices: Array<{ id: string }> = response.data.data?.invoices || [];
        if (invoices.length === 0) {
          toast.error(t('preparation.k_36'));
          return;
        }

        const invoiceIds = invoices.map((inv) => inv.id).join(",");
        navigate(`/orders/invoices/print-multiple?ids=${invoiceIds}`);
      } else {
        toast.error(response.data?.message || t('preparation.k_37'));
      }
    } catch (error: unknown) {
      console.error("Failed to print invoices:", error);
      toast.error(getApiErrorMessage(error) || t('preparation.k_38'));
    } finally {
      setPrintingInvoices(false);
    }
  }, [navigate, selectedOrders]);

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
      {isMerchantUser ? (
        <MerchantOperationsSummary
          formatPrice={formatPrice}
          formatDate={formatDate}
        />
      ) : null}

      {!preparationSettings.enabled ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-700" />
          <span className="font-semibold">{t('preparation.k_1')}</span>
          <span className="text-amber-700">{t('preparation.k_2')}</span>
        </div>
      ) : null}

      {allOverdueShortageFollowUpCount > 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm text-orange-900">
          <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-orange-700" />
          <span className="font-semibold">{t('preparation.overdueBanner', { count: allOverdueShortageFollowUpCount })}</span>
          <span className="text-orange-700">{t('preparation.k_3')}</span>
        </div>
      ) : null}

      {showFilters && (
        <PreparationFilters
          activeFilter={activeStage}
          statusCounts={statusCounts}
          stageCounts={summary.stageCounts}
          filterTabs={filterTabs}
          visibleOrdersCount={visibleOrdersCount}
          search={search}
          selectedWarehouseId={selectedWarehouseId}
          stockFilter={stockFilter}
          shortageReasonFilter={shortageReasonFilter}
          shortageOwnerFilter={shortageOwnerFilter}
          shortageOwnerOptions={shortageOwnerOptions}
          shortageFollowUpFilter={shortageFollowUpFilter}
          productFilter={productFilter}
          productColorFilter={uiState.productColorFilter}
          productSizeFilter={uiState.productSizeFilter}
          productSuggestions={productSuggestions}
          itemCountFilter={itemCountFilter}
          notPrintedFilter={notPrintedFilter}
          noShippingCodeFilter={noShippingCodeFilter}
          sortBy={sortBy}
          sortOrder={sortOrder}
          warehouses={warehouses}
          visibleFilterSections={visibleFilterSections}
          onFilterChange={uiActions.setActiveStage}
          onSearchChange={uiActions.setSearch}
          onSelectedWarehouseChange={uiActions.setSelectedWarehouse}
          onStockFilterChange={uiActions.setStockFilter}
          onShortageReasonFilterChange={uiActions.setShortageReasonFilter}
          onShortageOwnerFilterChange={uiActions.setShortageOwnerFilter}
          onShortageFollowUpFilterChange={uiActions.setShortageFollowUpFilter}
          onProductFilterChange={uiActions.setProductFilter}
          onProductColorFilterChange={uiActions.setProductColorFilter}
          onProductSizeFilterChange={uiActions.setProductSizeFilter}
          onItemCountFilterChange={uiActions.setItemCountFilter}
          onNotPrintedFilterChange={uiActions.setNotPrintedFilter}
          onNoShippingCodeFilterChange={uiActions.setNoShippingCodeFilter}
          onSortChange={(sortBy, sortOrder) => uiActions.setSort({ sortBy, sortOrder })}
        />
      )}

      <div className="border-t border-gray-100 px-4 py-3">
          <PreparationBulkActions
            compact
            selectedOrdersCount={selectedOrders.length}
            bulkStatus={bulkStatus}
            statusOptions={statusOptions}
            statusLabelMap={statusLabelMap}
            bulkUpdating={bulkUpdating}
            preparationEnabled={preparationSettings.enabled}
            bulkStatusUpdateEnabled={preparationSettings.enableBulkStatusUpdate}
            allVisibleSelected={allVisibleSelected}
            totalVisibleOrders={pagination.total}
            sendingToTurbo={sendingToTurbo}
            printingInvoices={printingInvoices}
            onBulkStatusChange={uiActions.setBulkStatus}
            onApply={() => void handleBulkUpdate()}
            onApplyToAll={() => void handleBulkUpdateAll()}
            onClear={uiActions.clearBulkControls}
            onSelectAll={toggleSelectAllVisible}
            onClearSelection={() => uiActions.clearBulkControls()}
            onSendToTurbo={() => void handleSendToTurbo()}
            onPrintInvoices={() => void handlePrintInvoices()}
          />
        </div>

      <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-2.5">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
              className="h-3.5 w-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            {t('preparation.selectAllCheckbox')}
          </label>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('preparation.k_4')}</span>
          {inventoryLoading && (
            <div className="mr-auto flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700">
              <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              {t('preparation.checkingInventory')}
            </div>
          )}
          {!inventoryLoading && loading && (
            <div className="mr-auto h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          )}

          <div className="relative" data-column-settings>
            <button
              type="button"
              onClick={() => setColumnSettingsOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
              title="إعدادات الأعمدة"
            >
              <Cog6ToothIcon className="h-3.5 w-3.5" />
            </button>
            {columnSettingsOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                <div className="border-b border-gray-100 px-3 py-1.5 text-[11px] font-semibold text-gray-400">
                  الأعمدة الظاهرة
                </div>
                {PREPARATION_TABLE_COLUMNS.map((col) => (
                  <label
                    key={col}
                    className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-gray-700 transition hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col)}
                      onChange={() => toggleColumn(col)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    {PREPARATION_COLUMN_LABELS[col]}
                  </label>
                ))}

                <div className="mt-1 border-t border-gray-100 px-3 py-1.5 text-[11px] font-semibold text-gray-400">
                  إظهار/إخفاء الفلاتر
                </div>
                <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-gray-700 transition hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={showFilters}
                    onChange={() => setShowFilters((prev) => !prev)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  إظهار شريط الفلاتر
                </label>
                {PREPARATION_FILTER_SECTIONS.map((section) => (
                  <label
                    key={section}
                    className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-gray-50 ${
                      showFilters ? "text-gray-700" : "text-gray-300 pointer-events-none"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={showFilters && visibleFilterSections.includes(section)}
                      onChange={() => toggleFilterSection(section)}
                      disabled={!showFilters}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    {PREPARATION_FILTER_SECTION_LABELS[section]}
                  </label>
                ))}
              </div>
            )}
          </div>
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
              {t('preparation.emptyState.title')}
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
              {t('preparation.emptyState.desc')}
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
              visibleColumns={visibleColumns}
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
              {t('preparation.pagination.pageInfo', { page: pagination.page, totalPages, count: currentPageCount })}
            </p>

            <label className="flex items-center gap-1.5 text-xs text-gray-400">
              {t('preparation.pagination.show')}
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
              {t('preparation.pagination.perPage')}
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={uiActions.goToPreviousPage}
              disabled={pagination.page === 1}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRightIcon className="h-3.5 w-3.5" />
              {t('preparation.pagination.previous')}
            </button>

            <button
              onClick={() => uiActions.goToNextPage(totalPages)}
              disabled={pagination.page === totalPages}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('preparation.pagination.next')}
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PreparationQueue;
