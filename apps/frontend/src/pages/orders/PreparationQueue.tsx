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
import { printSingleShippingLabel } from "../../utils/printShippingLabel";
import { useInvoiceSettings } from "../../hooks/useInvoiceSettings";
import type { OrderDetailsType } from "./types";
import {
  DEFAULT_PROBLEM_HOLD_DETAILS,
  DEFAULT_SHORTAGE_HOLD_DETAILS,
  PAGE_SIZE_OPTIONS,
  PREPARATION_COLUMN_LABELS,
  PREPARATION_COLUMN_LABEL_KEYS,
  PREPARATION_FILTER_SECTION_LABELS,
  PREPARATION_FILTER_SECTION_LABEL_KEYS,
  PREPARATION_FILTER_SECTIONS,
  PREPARATION_TABLE_COLUMNS,
  PROBLEM_HOLD_METADATA_KEY,
  PROBLEM_HOLD_STATUS,
  SHORTAGE_HOLD_METADATA_KEY,
  SHORTAGE_HOLD_STATUS,
  SHORTAGE_FAILED_STATUS,
  VISIBLE_COLUMNS_STORAGE_KEY,
  type PageSize,
  type PreparationFilterSection,
  type PreparationTableColumn,
} from "./preparation/constants";
import {
  buildProblemHoldDetails,
  getApiErrorMessage,
  buildShortageHoldDetails,
  getEffectivePreparationStatus,
  getNextStatus,
  getQuickActionLabel,
  getShortageFollowUpState,
  getShortageFollowUpVisual,
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
  ProblemHoldDetails,
  QcCheckKey,
  ShortageHoldDetails,
} from "./preparation/types";
import { usePreparationQueueData } from "./preparation/usePreparationQueueData";
import { usePreparationQueueUiState, type PreparationQueueUiState } from "./preparation/usePreparationQueueUiState";
import PreparationBulkActions from "./preparation/components/PreparationBulkActions";
import PreparationFilters from "./preparation/components/PreparationFilters";
import PreparationOrderCard from "./preparation/components/PreparationOrderCard";
import PreparationOrdersTable from "./preparation/components/PreparationOrdersTable";
import PreparationStatusChangeDialog from "./preparation/components/PreparationStatusChangeDialog";
import ProblemHoldReasonDialog from "./preparation/components/ProblemHoldReasonDialog";
import MerchantOperationsSummary from "./preparation/components/MerchantOperationsSummary";
import DispatchCarrierModal, { type ActiveCarrier } from "./preparation/components/DispatchCarrierModal";
import DispatchInternalCourierModal from "./preparation/components/DispatchInternalCourierModal";

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
  const hasQueryKeys = ["page", "pageSize", "activeStage", "warehouseId", "stockFilter", "shortageReason", "shortageFollowUp", "shortageOwner", "productFilter", "productId", "variantId", "itemCountFilter", "search", "sortBy", "sortOrder", "notPrinted", "noShippingCode"].some((k) => searchParams.has(k));

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
      productIdFilter: searchParams.get("productId") || "",
      variantIdFilter: searchParams.get("variantId") || "",
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
  const { settings: invoiceSettings } = useInvoiceSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOverrides = useMemo(() => getInitialPreparationState(searchParams), []);
  const { state: uiState, actions: uiActions } = usePreparationQueueUiState(initialOverrides);
  const isMerchantUser = user?.role === "MERCHANT";

  // Synchronize incoming searchParams when URL changes externally (e.g. from app/sidebar links)
  const isSyncingFromUrlRef = useRef(false);
  const lastObservedSearchRef = useRef(searchParams.toString());

  useEffect(() => {
    const currentSearch = searchParams.toString();
    if (currentSearch === lastObservedSearchRef.current) return;
    lastObservedSearchRef.current = currentSearch;

    const parsed = getInitialPreparationState(searchParams);
    isSyncingFromUrlRef.current = true;
    if (parsed.activeStage && parsed.activeStage !== uiState.activeStage) {
      uiActions.setActiveStage(parsed.activeStage);
    }
    if (parsed.pageSize && parsed.pageSize !== uiState.pageSize) {
      uiActions.setPageSize(parsed.pageSize);
    }
    if (parsed.page && parsed.page !== uiState.page) {
      uiActions.resetPage();
    }
    const timer = setTimeout(() => {
      isSyncingFromUrlRef.current = false;
    }, 150);
    return () => clearTimeout(timer);
  }, [searchParams, uiActions, uiState.activeStage, uiState.pageSize, uiState.page]);

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
    products,
    productsLoading,
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
    productColorFilter: uiState.productColorFilter,
    productSizeFilter: uiState.productSizeFilter,
    productIdFilter: uiState.productIdFilter,
    variantIdFilter: uiState.variantIdFilter,
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
  const [problemHoldDrafts, setProblemHoldDrafts] = useState<
    Record<string, ProblemHoldDetails>
  >({});
  const [transferingItemKey, setTransferingItemKey] = useState<string | null>(null);
  const [printingOrderNumber, setPrintingOrderNumber] = useState<string | null>(
    null,
  );
  const [shortageSavingOrderId, setShortageSavingOrderId] = useState<
    string | null
  >(null);
  const [problemHoldSavingOrderId, setProblemHoldSavingOrderId] = useState<
    string | null
  >(null);
  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    orderNumber: string;
    targetStatus: string;
    isHold: boolean;
  } | null>(null);
  const [editReasonOrder, setEditReasonOrder] = useState<{
    orderNumber: string;
    reason: string;
  } | null>(null);
  const [sendingToTurbo, setSendingToTurbo] = useState(false);
  const [activeCarriers, setActiveCarriers] = useState<ActiveCarrier[]>([]);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showInternalCourierModal, setShowInternalCourierModal] = useState(false);
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
    const defaults = [...PREPARATION_FILTER_SECTIONS];
    if (typeof window === "undefined") return defaults;
    try {
      const raw = window.localStorage.getItem("preparation:queue:visible-filters-v1");
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const stored = parsed.filter((s): s is PreparationFilterSection =>
          PREPARATION_FILTER_SECTIONS.includes(s as PreparationFilterSection),
        );
        const merged = [...new Set([...defaults, ...stored])];
        return merged;
      }
    } catch { /* ignore */ }
    return defaults;
  });
  const [showFilters, setShowFilters] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const raw = window.localStorage.getItem("preparation:queue:show-filters-v1");
      if (raw === null) return true;
      return JSON.parse(raw) === true;
    } catch {
      return true;
    }
  });

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
    setProblemHoldDrafts((previous) => {
      const nextDrafts = { ...previous };

      orders.forEach((order) => {
        if (!nextDrafts[order.orderNumber]) {
          nextDrafts[order.orderNumber] = buildProblemHoldDetails(order.metadata);
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
      productIdFilter: uiState.productIdFilter,
      variantIdFilter: uiState.variantIdFilter,
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
    if (nextState.productIdFilter) params.productId = String(nextState.productIdFilter);
    if (nextState.variantIdFilter) params.variantId = String(nextState.variantIdFilter);
    if (nextState.itemCountFilter !== "all") params.itemCountFilter = String(nextState.itemCountFilter);
    if (nextState.notPrintedFilter !== "all") params.notPrinted = String(nextState.notPrintedFilter);
    if (nextState.noShippingCodeFilter !== "all") params.noShippingCode = String(nextState.noShippingCodeFilter);
    if (nextState.search) params.search = String(nextState.search);
    if (nextState.sortBy !== "createdAt") params.sortBy = String(nextState.sortBy);
    if (!isSyncingFromUrlRef.current) {
      lastObservedSearchRef.current = new URLSearchParams(params).toString();
      setSearchParams(params, { replace: true });
    }

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
    uiState.productIdFilter,
    uiState.variantIdFilter,
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
        window.localStorage.setItem("preparation:queue:show-filters-v1", JSON.stringify(showFilters));
      } catch { /* ignore */ }
    }
  }, [visibleColumns, visibleFilterSections, showFilters]);

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
    const seen = new Set<string>();
    const dynamicOptions: PreparationStatusOption[] = [];

    const addOption = (code: string, fallbackName: string) => {
      const upper = toUpper(code);
      if (!upper || seen.has(upper)) return;
      seen.add(upper);
      dynamicOptions.push({ code: upper, fallbackName });
    };

    preparationStatuses.forEach((status) => {
      addOption(status.code, status.name);
    });

    addOption("PREPARING", t('preparation.page.stages.PREPARING'));
    addOption("QUALITY_CHECK", t('preparation.page.stages.QUALITY_CHECK'));
    addOption("PACKAGED", t('preparation.page.stages.PACKAGED'));
    addOption(SHORTAGE_HOLD_STATUS, t('preparation.page.stages.STOCK_SHORTAGE'));
    addOption(preparationSettings.handoffStatus || "READY_TO_SHIP", t('preparation.page.stages.READY_TO_SHIP'));

    if (preparationSettings.startingStatus) {
      addOption(preparationSettings.startingStatus, t('preparation.page.stages.WAITING'));
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

    const problemHoldCode = toUpper(PROBLEM_HOLD_STATUS);
    if (!seen.has(problemHoldCode)) {
      seen.add(problemHoldCode);
      tabs.push({
        statusCode: problemHoldCode,
        name: statusLabelMap.get(problemHoldCode) || t('orders.onHoldPrep') || 'تجهيز معلق',
      });
    }

    return tabs;
  }, [preparationStatuses, statusLabelMap]);

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
            record.products?.name || record.products?.sku || t('preparation.page.unnamedProduct'),
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
        warehouseName: record.warehouses?.name || t('preparation.page.unnamedWarehouse'),
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
            displayName: item.productName || item.name || metadataProductName || t('preparation.page.unnamedProduct'),
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
      const normalizedOwner = (owner || "").trim();
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
  // NOTE: server-side pagination already ran; this is just the inventory-enriched
  // version of the current page's orders — not a client-side slice.
  const enrichedOrders = preparationOrders;
  const visibleOrdersCount = summary.filteredTotal;
  const currentPageCount = enrichedOrders.length;
  const allOverdueShortageFollowUpCount =
    summary.allOverdueShortageFollowUpCount;
  const allOverdueProblemFollowUpCount =
    summary.allOverdueProblemFollowUpCount;

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
        (shortageOwnerFilter || "").trim().toLowerCase(),
        (deferredSearch || "").trim().toLowerCase(),
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
    enrichedOrders.length > 0 &&
    enrichedOrders.every((order) => selectedSet.has(order.orderNumber));

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
          message: t('preparation.page.disabled'),
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
            ? t('preparation.page.transferNoSource')
            : t('preparation.page.stockMustBeComplete'),
        };
      }

      if (
        order.stage === "QUALITY_CHECK" &&
        ["PACKAGED", preparationSettings.handoffStatus].includes(normalizedNextStatus) &&
        !isQcComplete(order.orderNumber)
      ) {
        return {
          valid: false,
          message: t('preparation.page.qcChecklistRequired'),
        };
      }

      // A held-for-problem order (ON_HOLD_PREP) cannot move directly to a
      // forward preparation stage — it must be released first.
      const forwardStages = new Set([
        "PREPARING",
        "PROCESSING",
        "QUALITY_CHECK",
        "PACKAGED",
        "PACKED",
        "READY",
        "READY_TO_SHIP",
        toUpper(preparationSettings.handoffStatus),
      ]);
      if (
        order.stage === "ON_HOLD_PREP" &&
        forwardStages.has(normalizedNextStatus) &&
        !["OWNER", "SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"].includes(
          user?.role || "",
        )
      ) {
        return {
          valid: false,
          message: t("preparation.page.holdBlocksForward"),
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
      user?.role,
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
      const order = orders.find((item) => item.orderNumber === orderNumber);
      if (!order) {
        toast.error(t('preparation.page.orderNotFound'));
        return;
      }
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error(t('preparation.page.printWindowBlocked'));
        return;
      }
      const { toOrderDetailsType } = await import("../../utils/printShippingLabel");
      await printSingleShippingLabel({
        order: toOrderDetailsType(order),
        companyName: user?.company?.name,
        companyLogoUrl: user?.company?.logo || null,
        printWindow,
        settings: invoiceSettings,
      });
      toast.success(t('preparation.page.slipOpened'));
    } catch (error: unknown) {
      console.error("Failed to print preparation slip:", error);
      toast.error(getApiErrorMessage(error) || t('preparation.page.slipFailed'));
    } finally {
      setPrintingOrderNumber(null);
    }
  }, [orders, user?.company?.name, user?.company?.logo, invoiceSettings, t]);

  const saveShortageHoldDetails = useCallback(
    async (
      orderNumber: string,
      overrides: Partial<ShortageHoldDetails> = {},
      options?: { successMessage?: string | null; skipRefresh?: boolean },
    ) => {
      const order = orders.find((item) => item.orderNumber === orderNumber);
      if (!order) {
        toast.error(t('preparation.page.orderNotFound'));
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
          toast.success(options?.successMessage || t('preparation.page.shortageHoldSaved'));
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
          getApiErrorMessage(error) || t('preparation.page.shortageHoldFailed'),
        );
        return false;
      } finally {
        setShortageSavingOrderId(null);
      }
    },
    [fetchAll, orders, shortageHoldDrafts, updateLocalMetadata],
  );

  const saveProblemHoldDetails = useCallback(
    async (
      orderNumber: string,
      overrides: Partial<ProblemHoldDetails> = {},
      options?: { successMessage?: string | null },
    ) => {
      const order = orders.find((item) => item.orderNumber === orderNumber);
      if (!order) {
        toast.error(t('preparation.page.orderNotFound'));
        return false;
      }

      const currentDraft =
        problemHoldDrafts[orderNumber] || buildProblemHoldDetails(order.metadata);
      const nextDraft: ProblemHoldDetails = {
        ...DEFAULT_PROBLEM_HOLD_DETAILS,
        ...currentDraft,
        ...overrides,
      };
      const metadataPatch = {
        [PROBLEM_HOLD_METADATA_KEY]: nextDraft,
      };

      try {
        setProblemHoldSavingOrderId(orderNumber);
        await apiClient.put(`/orders-new/simple/${encodeURIComponent(orderNumber)}`, {
          metadataPatch,
        });
        updateLocalMetadata(orderNumber, metadataPatch);
        setProblemHoldDrafts((previous) => ({
          ...previous,
          [orderNumber]: nextDraft,
        }));

        if (options?.successMessage !== null) {
          toast.success(options?.successMessage || t('preparation.page.problemHoldSaved'));
        }

        if (!options?.skipRefresh) {
          void fetchAll();
        }

        return true;
      } catch (error: unknown) {
        console.error("Failed to save problem hold details:", error);
        toast.error(
          getApiErrorMessage(error) || t('preparation.page.problemHoldFailed'),
        );
        return false;
      } finally {
        setProblemHoldSavingOrderId(null);
      }
    },
    [fetchAll, orders, problemHoldDrafts, t, updateLocalMetadata],
  );

  const performStatusUpdate = useCallback(
    async (
      orderNumber: string,
      nextStatus: string,
      note: string,
      holdDetails?: Partial<ProblemHoldDetails>,
    ) => {
      const order = getOrderByNumber(orderNumber);
      if (!order) {
        toast.error(t('preparation.k_20'));
        return false;
      }

      const normalizedNextStatus = toUpper(nextStatus);
      const isHoldTarget = normalizedNextStatus === PROBLEM_HOLD_STATUS;
      const isReleasingProblemHold =
        order.stage === "ON_HOLD_PREP" && !isHoldTarget;

      if (isHoldTarget) {
        const currentDraft =
          problemHoldDrafts[orderNumber] ||
          buildProblemHoldDetails(order.metadata);
        const nextDraft: ProblemHoldDetails = {
          ...DEFAULT_PROBLEM_HOLD_DETAILS,
          ...currentDraft,
          ...holdDetails,
          heldAt: currentDraft.heldAt || new Date().toISOString(),
          releasedAt: "",
          state: "held",
        };
        if (currentDraft.heldAt) {
          nextDraft.heldAt = currentDraft.heldAt;
        }
        if (user?.firstName || user?.lastName) {
          nextDraft.heldBy =
            `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
            nextDraft.heldBy;
        }

        try {
          setProblemHoldSavingOrderId(orderNumber);
          await apiClient.put(
            `/orders-new/simple/${encodeURIComponent(orderNumber)}`,
            { metadataPatch: { [PROBLEM_HOLD_METADATA_KEY]: nextDraft } },
          );
          updateLocalMetadata(orderNumber, {
            [PROBLEM_HOLD_METADATA_KEY]: nextDraft,
          });
          setProblemHoldDrafts((previous) => ({
            ...previous,
            [orderNumber]: nextDraft,
          }));
        } catch (error: unknown) {
          console.error("Failed to save problem hold details:", error);
          toast.error(
            getApiErrorMessage(error) || t('preparation.page.shortageHoldFailed'),
          );
          return false;
        } finally {
          setProblemHoldSavingOrderId(null);
        }
      } else if (isReleasingProblemHold) {
        const currentDraft =
          problemHoldDrafts[orderNumber] ||
          buildProblemHoldDetails(order.metadata);
        const nextDraft: ProblemHoldDetails = {
          ...currentDraft,
          releasedAt: new Date().toISOString(),
          state: "released",
        };
        if (user?.firstName || user?.lastName) {
          nextDraft.releasedBy =
            `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
            nextDraft.releasedBy;
        }

        try {
          setProblemHoldSavingOrderId(orderNumber);
          await apiClient.put(
            `/orders-new/simple/${encodeURIComponent(orderNumber)}`,
            { metadataPatch: { [PROBLEM_HOLD_METADATA_KEY]: nextDraft } },
          );
          updateLocalMetadata(orderNumber, {
            [PROBLEM_HOLD_METADATA_KEY]: nextDraft,
          });
          setProblemHoldDrafts((previous) => ({
            ...previous,
            [orderNumber]: nextDraft,
          }));
        } catch (error: unknown) {
          console.error("Failed to release problem hold metadata:", error);
        } finally {
          setProblemHoldSavingOrderId(null);
        }
      }

      if (isHoldTarget && !(holdDetails?.reason || "").trim()) {
        toast.error(t("preparation.holdDialog.reasonRequired"));
        return false;
      }

      try {
        setRowUpdatingId(orderNumber);
        const canOverride = ["OWNER", "SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"].includes(user?.role || "");
        await apiClient.post(
          `/orders-new/simple/${encodeURIComponent(orderNumber)}/status`,
          {
            status: normalizedNextStatus,
            notes:
              (isHoldTarget && (holdDetails?.reason || "").trim()) ||
              note ||
              (order.stage === "QUALITY_CHECK" &&
              ["PACKAGED", preparationSettings.handoffStatus].includes(
                normalizedNextStatus,
              )
                ? "QC completed from preparation queue"
                : "Updated from preparation queue"),
            isOverride: canOverride,
          },
        );

        updateLocalStatuses([orderNumber], normalizedNextStatus);
        toast.success(
          t("preparation.toasts.statusUpdated", { orderId: orderNumber, status: statusLabelMap.get(normalizedNextStatus) || normalizedNextStatus }),
        );
        void fetchAll();
        return true;
      } catch (error: unknown) {
        console.error("Failed to update order status:", error);
        toast.error(
          getApiErrorMessage(error) || t('preparation.page.stageUpdateError'),
        );
        return false;
      } finally {
        setRowUpdatingId(null);
      }
    },
    [
      getOrderByNumber,
      fetchAll,
      preparationSettings.handoffStatus,
      problemHoldDrafts,
      statusLabelMap,
      t,
      updateLocalMetadata,
      updateLocalStatuses,
      user,
    ],
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

      await performStatusUpdate(orderNumber, toUpper(nextStatus), "");
    },
    [getOrderByNumber, performStatusUpdate, t, validateTransition],
  );

  const handleRequestStatusChange = useCallback(
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

      setStatusChangeDialog({
        orderNumber,
        targetStatus: toUpper(nextStatus),
        isHold: toUpper(nextStatus) === PROBLEM_HOLD_STATUS,
      });
    },
    [getOrderByNumber, t, validateTransition],
  );

  const handleHoldAsProblem = useCallback(
    async (orderNumber: string) => {
      const order = getOrderByNumber(orderNumber);
      if (!order) return;
      setStatusChangeDialog({
        orderNumber,
        targetStatus: PROBLEM_HOLD_STATUS,
        isHold: true,
      });
    },
    [getOrderByNumber],
  );

  const handleEditProblemReason = useCallback(
    (orderNumber: string) => {
      const order = getOrderByNumber(orderNumber);
      if (!order) return;
      const details =
        problemHoldDrafts[orderNumber] ||
        buildProblemHoldDetails(order.metadata);
      setEditReasonOrder({ orderNumber, reason: details.reason });
    },
    [getOrderByNumber, problemHoldDrafts],
  );

  const editReasonOrderOrder = useMemo(
    () =>
      editReasonOrder ? getOrderByNumber(editReasonOrder.orderNumber) : null,
    [editReasonOrder, getOrderByNumber],
  );

  const handleConfirmEditReason = useCallback(
    async (reason: string) => {
      if (!editReasonOrder) return;
      const ok = await saveProblemHoldDetails(editReasonOrder.orderNumber, {
        reason,
      });
      if (ok) setEditReasonOrder(null);
    },
    [editReasonOrder, saveProblemHoldDetails],
  );

  const handleReleaseProblemHold = useCallback(
    async (orderNumber: string) => {
      const order = getOrderByNumber(orderNumber);
      const currentDraft =
        problemHoldDrafts[orderNumber] || buildProblemHoldDetails(order?.metadata);
      const nextDraft: ProblemHoldDetails = {
        ...currentDraft,
        releasedAt: new Date().toISOString(),
        state: "released",
      };
      if (user?.firstName || user?.lastName) {
        nextDraft.releasedBy =
          `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
          nextDraft.releasedBy;
      }

      try {
        setProblemHoldSavingOrderId(orderNumber);
        await apiClient.put(
          `/orders-new/simple/${encodeURIComponent(orderNumber)}`,
          { metadataPatch: { [PROBLEM_HOLD_METADATA_KEY]: nextDraft } },
        );
        updateLocalMetadata(orderNumber, {
          [PROBLEM_HOLD_METADATA_KEY]: nextDraft,
        });
        setProblemHoldDrafts((previous) => ({
          ...previous,
          [orderNumber]: nextDraft,
        }));

        await apiClient.post(
          `/orders-new/simple/${encodeURIComponent(orderNumber)}/status`,
          {
            status: preparationSettings.startingStatus,
            notes: t("preparation.problemPanel.releasedNote"),
            isOverride: ["OWNER", "SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"].includes(
              user?.role || "",
            ),
          },
        );

        updateLocalStatuses([orderNumber], preparationSettings.startingStatus);
        toast.success(t("preparation.problemPanel.releasedSuccess"));
        void fetchAll();
      } catch (error: unknown) {
        console.error("Failed to release problem hold:", error);
        toast.error(
          getApiErrorMessage(error) || t("preparation.problemPanel.releasedError"),
        );
      } finally {
        setProblemHoldSavingOrderId(null);
      }
    },
    [
      fetchAll,
      getOrderByNumber,
      preparationSettings.startingStatus,
      problemHoldDrafts,
      t,
      updateLocalMetadata,
      updateLocalStatuses,
      user,
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
      toast.error(t('preparation.toasts.bulkNoValidOrders'));
      return;
    }

    const confirmed = window.confirm(
      t("preparation.confirm.bulkUpdate", {
        count: validOrders.length,
        stage: statusLabelMap.get(bulkStatus) || bulkStatus,
        extra: invalidOrders.length > 0 ? t("preparation.confirm.withExclusions", { count: invalidOrders.length }) : "",
      }),
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
          ? t("preparation.toasts.bulkUpdatePartial", { success: successIds.length, failed: failedCount })
          : t("preparation.toasts.bulkUpdateSuccess", { count: successIds.length }),
      );

      uiActions.clearBulkControls();
      void fetchAll();
    } catch (error: unknown) {
      console.error("Failed bulk status update:", error);
      toast.error(
        getApiErrorMessage(error) || t('preparation.page.stageUpdateFailed'),
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

    const validOrders: PreparationOrder[] = [];
    const invalidOrders: PreparationOrder[] = [];

    enrichedOrders.forEach((order) => {
      const validation = validateTransition(order, bulkStatus);
      if (validation.valid) {
        validOrders.push(order);
      } else {
        invalidOrders.push(order);
      }
    });

    if (validOrders.length === 0) {
      toast.error(t('preparation.toasts.bulkNoValidOrders'));
      return;
    }

    const confirmed = window.confirm(
      t("preparation.confirm.bulkUpdateAll", {
        count: pagination.total,
        stage: statusLabelMap.get(bulkStatus) || bulkStatus,
      }),
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
      colorFilter: uiState.productColorFilter || undefined,
      sizeFilter: uiState.productSizeFilter || undefined,
      productId: uiState.productIdFilter || undefined,
      variantId: uiState.variantIdFilter || undefined,
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
          ? t("preparation.toasts.bulkUpdatePartial", { success: successCount, failed: totalRequested - successCount })
          : t("preparation.toasts.bulkUpdateSuccess", { count: successCount }),
      );

      uiActions.clearBulkControls();
      void fetchAll();
    } catch (error: unknown) {
      console.error("Failed bulk status update all:", error);
      toast.error(
        getApiErrorMessage(error) || t('preparation.page.stageUpdateFailed'),
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
    uiState.productColorFilter,
    uiState.productSizeFilter,
    uiState.productIdFilter,
    uiState.variantIdFilter,
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
        toast.error(t('preparation.page.selectWarehouseFirst'));
        return;
      }

      if (!item.productId || item.shortage <= 0) {
        toast.error(t('preparation.page.transferNoShortage'));
        return;
      }

      const productSummary = inventorySummaryByProduct.get(String(item.productId));
      const sourceWarehouse = productSummary?.warehouses.find(
        (warehouse) =>
          warehouse.warehouseId !== selectedWarehouseId &&
          warehouse.available >= item.shortage,
      );

      if (!sourceWarehouse) {
        toast.error(t('preparation.page.transferNoSource'));
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
          t("preparation.toasts.transferSuccess", { qty: item.shortage, source: sourceWarehouse.warehouseName }),
        );
        await fetchInventory();
      } catch (error: unknown) {
        console.error("Failed quick transfer:", error);
        toast.error(
          getApiErrorMessage(error) || t('preparation.page.transferFailed'),
        );
      } finally {
        setTransferingItemKey(null);
      }
    },
    [fetchInventory, inventorySummaryByProduct, selectedWarehouseId],
  );

  const fetchActiveCarriers = useCallback(async () => {
    try {
      const res = await apiClient.get('/shipping-companies/active-carriers');
      if (res.data?.success) {
        setActiveCarriers(res.data.data || []);
      }
    } catch (e) {
      console.warn('Failed to fetch active shipping carriers:', e);
    }
  }, []);

  useEffect(() => {
    void fetchActiveCarriers();
  }, [fetchActiveCarriers]);

  const handleOpenDispatchModal = useCallback(async () => {
    if (selectedOrders.length === 0) {
      toast.error(t('preparation.page.selectOrderFirst'));
      return;
    }

    const onHoldSelected = selectedOrders.some((orderNumber) => {
      const o = getOrderByNumber(orderNumber);
      return o?.stage === 'ON_HOLD_PREP' || o?.normalizedStatus === 'ON_HOLD_PREP';
    }) || activeStage === 'ON_HOLD_PREP';

    if (onHoldSelected) {
      const confirmed = window.confirm(
        '⚠️ تنبيه: لقد حددت طلبات معلقة لوجود مشكلة (ON_HOLD_PREP).\n\nهل أنت متأكد من رغبتك في إرسالها لشركة الشحن واستخراج بوالص شحن رسمية لها الآن؟'
      );
      if (!confirmed) return;
    }

    await fetchActiveCarriers();
    setShowDispatchModal(true);
  }, [activeStage, fetchActiveCarriers, getOrderByNumber, selectedOrders, t]);

  const handleDispatchToCarrier = useCallback(
    async (carrier: ActiveCarrier) => {
      if (selectedOrders.length === 0) {
        toast.error(t('preparation.page.selectOrderFirst'));
        return;
      }

      try {
        setSendingToTurbo(true);
        let response: {
          data?: {
            success?: boolean;
            data?: {
              success?: number;
              failed?: number;
              results?: {
                failed?: Array<{ orderNumber: string; error?: string; reason?: string }>;
                skipped?: Array<{ orderNumber: string; reason?: string }>;
              };
            };
            error?: string;
          };
        };

        if (carrier.providerKey === 'QP_EXPRESS') {
          response = await apiClient.post('/qp-express/bulk/create-shipments', {
            orderIds: selectedOrders,
          });
        } else if (carrier.providerKey === 'BOSTA') {
          response = await apiClient.post('/bosta/bulk/create-shipments', {
            orderIds: selectedOrders,
          });
        } else if (carrier.providerKey === 'TURBO') {
          response = await apiClient.post('/turbo/bulk/create-shipments', {
            orderIds: selectedOrders,
          });
        } else {
          let successCount = 0;
          for (const orderId of selectedOrders) {
            try {
              await apiClient.post('/shipments/create', {
                orderId,
                shippingCompanyId: carrier.id,
              });
              successCount++;
            } catch (err) {
              console.warn(`Failed to create shipment for order ${orderId}:`, err);
            }
          }
          response = {
            data: {
              success: true,
              data: { success: successCount, failed: selectedOrders.length - successCount },
            },
          };
        }

        if (response.data?.success) {
          const data = response.data.data || {};
          const successCount = data.success ?? selectedOrders.length;
          const failedCount = data.failed ?? 0;
          const failedList = data.results?.failed || [];

          toast.success(
            `تم بنجاح إرسال ${successCount} طلب إلى ${carrier.name}` +
              (failedCount > 0 ? ` (فشل ${failedCount})` : '')
          );

          if (failedList.length > 0) {
            const preview = failedList
              .slice(0, 5)
              .map((item) => `• طلب #${item.orderNumber}: ${item.error || item.reason || 'تعذر الإنشاء'}`)
              .join('\n');
            const remainder = failedList.length > 5 ? `\n... و ${failedList.length - 5} طلبات أخرى` : '';
            toast.error(
              `تعذر إرسال ${failedList.length} طلب إلى ${carrier.name}:\n${preview}${remainder}`,
              { duration: 10000 }
            );
          }

          setShowDispatchModal(false);
          uiActions.clearBulkControls();
          void fetchAll();
        } else {
          toast.error(response.data?.error || `فشل إرسال الشحنات إلى ${carrier.name}`);
        }
      } catch (error: unknown) {
        console.error('Failed to dispatch shipments:', error);
        toast.error(getApiErrorMessage(error) || `فشل إرسال الشحنات إلى ${carrier.name}`);
      } finally {
        setSendingToTurbo(false);
      }
    },
    [fetchAll, selectedOrders, uiActions],
  );

  const handlePrintInvoices = useCallback(async () => {
    if (selectedOrders.length === 0) {
      toast.error(t('preparation.page.selectOrderFirst'));
      return;
    }

    try {
      setPrintingInvoices(true);
      const response = await apiClient.post("/order-invoices/bulk-generate", {
        orderIds: selectedOrders,
      });

      if (response.data?.success) {
        const data = response.data.data || {};
        const invoices: Array<{ id: string }> = data.invoices || [];
        const guestOrders: Array<{ orderId: string; order: OrderDetailsType }> = data.guestOrders || [];
        const failed: Array<{ orderId: string; error?: string }> = data.failed || [];

        if (invoices.length === 0 && guestOrders.length === 0) {
          toast.error(t('preparation.page.invoiceNotFound'));
          return;
        }

        // ابنِ URL صفحة الطباعة: فواتير DB عبر ids، وطلبات الضيف عبر sessionStorage
        // (كلا النوعين يُعرض في نفس الصفحة بنفس شريط التقسيم ومكوّن الفاتورة)
        const params = new URLSearchParams();
        if (invoices.length > 0) {
          params.set("ids", invoices.map((inv) => inv.id).join(","));
        }
        if (guestOrders.length > 0) {
          const { storeGuestPrintPayload } = await import("./PrintMultipleInvoices");
          const guestKey = storeGuestPrintPayload({
            company: {
              companyName: user?.company?.name || "",
              companyPhone: user?.company?.phone || null,
              companyLogo: user?.company?.logo || null,
            },
            orders: guestOrders.map((entry) => entry.order as unknown as Parameters<typeof storeGuestPrintPayload>[0]["orders"][number]),
          });
          params.set("guestKey", guestKey);
        }
        const printUrl = `/orders/invoices/print-multiple${params.toString() ? `?${params.toString()}` : ""}`;
        navigate(printUrl);

        // رسالة واضحة بالأعداد (فواتير + بوليصات ضيف)، مع تنبيه منفصل للطلبات المتعثرة
        toast.success(
          t('preparation.page.bulkPrintSummary', {
            invoiceCount: invoices.length,
            guestCount: guestOrders.length,
          }),
        );
        if (failed.length > 0) {
          toast.warning(
            t('preparation.page.bulkPrintFailed', { failedCount: failed.length }),
          );
        }
      } else {
        toast.error(response.data?.message || t('preparation.page.invoicePrintFailed'));
      }
    } catch (error: unknown) {
      console.error("Failed to print invoices:", error);
      toast.error(getApiErrorMessage(error) || t('preparation.page.invoicePrintError'));
    } finally {
      setPrintingInvoices(false);
    }
  }, [navigate, selectedOrders, user]);

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

  const dialogOrder = useMemo(
    () =>
      statusChangeDialog
        ? getOrderByNumber(statusChangeDialog.orderNumber)
        : null,
    [getOrderByNumber, statusChangeDialog],
  );

  const dialogHoldDetails = useMemo(
    () =>
      statusChangeDialog && dialogOrder
        ? problemHoldDrafts[statusChangeDialog.orderNumber] ||
          buildProblemHoldDetails(dialogOrder.metadata)
        : DEFAULT_PROBLEM_HOLD_DETAILS,
    [dialogOrder, problemHoldDrafts, statusChangeDialog],
  );

  const dialogHoldReason = dialogHoldDetails.reason || "";

  const handleConfirmStatusChange = useCallback(
    async (payload: {
      note: string;
      holdReason?: string;
    }) => {
      if (!statusChangeDialog) return;
      const holdDetails = payload.holdReason ? { reason: payload.holdReason } : undefined;
      const ok = await performStatusUpdate(
        statusChangeDialog.orderNumber,
        statusChangeDialog.targetStatus,
        payload.note,
        holdDetails,
      );
      if (ok) {
        setStatusChangeDialog(null);
      }
    },
    [performStatusUpdate, statusChangeDialog],
  );

  const toggleOrderSelection = (orderNumber: string) => {
    uiActions.toggleOrderSelection(orderNumber);
  };
  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      uiActions.clearVisibleSelection(
        enrichedOrders.map((order) => order.orderNumber),
      );
      return;
    }

    const visibleIds = enrichedOrders.map((order) => order.orderNumber);
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
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <span className="font-semibold">{t('preparation.k_1')}</span>
          <span className="text-amber-700">{t('preparation.k_2')}</span>
        </div>
      ) : null}

      {allOverdueShortageFollowUpCount > 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm text-orange-900 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-200">
          <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-orange-700 dark:text-orange-400" />
          <span className="font-semibold">{t('preparation.overdueBanner', { count: allOverdueShortageFollowUpCount })}</span>
          <span className="text-orange-700">{t('preparation.k_3')}</span>
        </div>
      ) : null}

      {allOverdueProblemFollowUpCount > 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <span className="font-semibold">{t('preparation.problemOverdueBanner', { count: allOverdueProblemFollowUpCount })}</span>
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
          productIdFilter={uiState.productIdFilter}
          variantIdFilter={uiState.variantIdFilter}
          productSuggestions={productSuggestions}
          products={products}
          productsLoading={productsLoading}
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
          onProductIdFilterChange={uiActions.setProductIdFilter}
          onVariantIdFilterChange={uiActions.setVariantIdFilter}
          onItemCountFilterChange={uiActions.setItemCountFilter}
          onNotPrintedFilterChange={uiActions.setNotPrintedFilter}
          onNoShippingCodeFilterChange={uiActions.setNoShippingCodeFilter}
          onSortChange={(sortBy, sortOrder) => uiActions.setSort({ sortBy, sortOrder })}
        />
      )}

      <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-700">
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
            onSendToTurbo={() => void handleOpenDispatchModal()}
            onSendToShipping={() => void handleOpenDispatchModal()}
            onSendToInternalCourier={() => setShowInternalCourierModal(true)}
            onPrintInvoices={() => void handlePrintInvoices()}
          />
        </div>

      <section className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-gray-900/30">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-100 px-3 py-2 sm:px-4 sm:py-2.5 dark:border-gray-700">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600 transition hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
              className="h-3.5 w-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 dark:border-gray-500 dark:text-amber-400"
            />
            {t('preparation.selectAllCheckbox')}
          </label>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{t('preparation.k_4')}</span>
          {inventoryLoading && (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              {t('preparation.checkingInventory')}
            </div>
          )}
          {!inventoryLoading && loading && (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          )}

          <div className="mr-auto hidden sm:block" />

          <div className="relative flex items-center gap-2" data-column-settings>
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                showFilters
                  ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-200"
              }`}
              title={showFilters ? 'إخفاء الفلاتر' : 'إظهار الفلاتر'}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setColumnSettingsOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-500 transition hover:border-gray-300 hover:text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-200"
              title={t("preparation.table.columnSettings")}
            >
              <Cog6ToothIcon className="h-3.5 w-3.5" />
            </button>
            {columnSettingsOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                <div className="border-b border-gray-100 px-3 py-1.5 text-[11px] font-semibold text-gray-400 dark:border-gray-700 dark:text-gray-500">
                  {t("preparation.table.visibleColumns")}
                </div>
                {PREPARATION_TABLE_COLUMNS.map((col) => (
                  <label
                    key={col}
                    className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col)}
                      onChange={() => toggleColumn(col)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 dark:border-gray-500 dark:text-amber-400"
                    />
                    {t(PREPARATION_COLUMN_LABEL_KEYS[col])}
                  </label>
                ))}

                <div className="mt-1 border-t border-gray-100 px-3 py-1.5 text-[11px] font-semibold text-gray-400 dark:border-gray-700 dark:text-gray-500">
                  {t("preparation.table.showHideFilters")}
                </div>
                <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50">
                  <input
                    type="checkbox"
                    checked={showFilters}
                    onChange={() => setShowFilters((prev) => !prev)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  {t("preparation.table.showFilterBar")}
                </label>
                {PREPARATION_FILTER_SECTIONS.map((section) => (
                  <label
                    key={section}
                    className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      showFilters ? "text-gray-700 dark:text-gray-300" : "text-gray-300 dark:text-gray-600 pointer-events-none"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={showFilters && visibleFilterSections.includes(section)}
                      onChange={() => toggleFilterSection(section)}
                      disabled={!showFilters}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 dark:border-gray-500 dark:text-amber-400"
                    />
                    {t(PREPARATION_FILTER_SECTION_LABEL_KEYS[section])}
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
                className="flex animate-pulse items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700"
              >
                <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mr-auto h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        ) : enrichedOrders.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center dark:border-gray-600 dark:bg-gray-800/50">
            <ClipboardDocumentListIcon className="h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('preparation.emptyState.title')}
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              {t('preparation.emptyState.desc')}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="space-y-3 md:hidden">
              {enrichedOrders.map((order) => {
                const shortageHoldDetails =
                  shortageHoldDrafts[order.orderNumber] ||
                  buildShortageHoldDetails(order.metadata);
                const shortageFollowUpState = getShortageFollowUpState(
                  shortageHoldDetails.followUpDate,
                  order.stage,
                );
                const shortageFollowUpVisual = getShortageFollowUpVisual(
                  shortageFollowUpState,
                );
                const problemHoldDetails =
                  problemHoldDrafts[order.orderNumber] ||
                  buildProblemHoldDetails(order.metadata);
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
                            : order.stage === "ON_HOLD_PREP"
                              ? preparationSettings.startingStatus
                              : preparationSettings.handoffStatus;
                const defaultTargetStatus = nextStatus || currentStageStatus;
                const currentSelection =
                  statusSelections[order.orderNumber] || defaultTargetStatus;
                const actionLabel =
                  statusSelections[order.orderNumber] &&
                  statusSelections[order.orderNumber] !== defaultTargetStatus
                    ? "تطبيق المرحلة المختارة"
                    : getQuickActionLabel(order.stage);
                const qcCompleted = enabledQcChecks.every(
                  (key) => qcChecklistState[order.orderNumber]?.[key] === true,
                );
                const rowBusy =
                  rowUpdatingId === order.orderNumber ||
                  shortageSavingOrderId === order.orderNumber ||
                  problemHoldSavingOrderId === order.orderNumber;
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
                    problemHoldDetails={problemHoldDetails}
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
                      void handleRequestStatusChange(orderNumber, nextStatus)
                    }
                    onMarkAsShortageHold={(orderNumber) =>
                      void handleMarkAsShortageHold(orderNumber)
                    }
                    onReleaseShortageHold={(orderNumber) =>
                      void handleReleaseShortageHold(orderNumber)
                    }
                    onMarkAsShortageFailed={(orderNumber) =>
                      void handleMarkAsShortageFailed(orderNumber)
                    }
                    onHoldAsProblem={(orderNumber) =>
                      void handleHoldAsProblem(orderNumber)
                    }
                    onReleaseProblemHold={(orderNumber) =>
                      void handleReleaseProblemHold(orderNumber)
                    }
                    onEditProblemReason={handleEditProblemReason}
                    onPrintPreparationSlip={(orderNumber) =>
                      void handlePrintPreparationSlip(orderNumber)
                    }
                  />
                );
              })}
            </div>

            {/* Desktop table view */}
            <div className="mt-3 hidden md:block">
              <PreparationOrdersTable
                orders={enrichedOrders}
                statusSelections={statusSelections}
                statusOptions={statusOptions}
                statusLabelMap={statusLabelMap}
                selectedSet={selectedSet}
                rowUpdatingId={rowUpdatingId}
                shortageSavingOrderId={shortageSavingOrderId}
                problemHoldSavingOrderId={problemHoldSavingOrderId}
                selectedWarehouseId={selectedWarehouseId}
                enabledQcChecks={enabledQcChecks}
                qcChecklistState={qcChecklistState}
                shortageHoldDrafts={shortageHoldDrafts}
                problemHoldDrafts={problemHoldDrafts}
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
                  void handleRequestStatusChange(orderNumber, nextStatus)
                }
                onMarkAsShortageHold={(orderNumber) =>
                  void handleMarkAsShortageHold(orderNumber)
                }
                onReleaseShortageHold={(orderNumber) =>
                  void handleReleaseShortageHold(orderNumber)
                }
                onMarkAsShortageFailed={(orderNumber) =>
                  void handleMarkAsShortageFailed(orderNumber)
                }
                onHoldAsProblem={(orderNumber) =>
                  void handleHoldAsProblem(orderNumber)
                }
                onReleaseProblemHold={(orderNumber) =>
                  void handleReleaseProblemHold(orderNumber)
                }
                onEditProblemReason={handleEditProblemReason}
                onPrintPreparationSlip={(orderNumber) =>
                  void handlePrintPreparationSlip(orderNumber)
                }
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-3 border-t border-gray-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-2.5 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-3 max-sm:justify-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t('preparation.pagination.pageInfo', { page: pagination.page, totalPages, count: currentPageCount })}
            </p>

            <label className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              {t('preparation.pagination.show')}
              <select
                value={uiState.pageSize}
                onChange={(e) =>
                  uiActions.setPageSize(Number(e.target.value) as PageSize)
                }
                className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 outline-none transition focus:border-amber-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:focus:border-amber-500"
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

          <div className="flex items-center justify-center gap-2 max-sm:w-full">
            <button
              onClick={uiActions.goToPreviousPage}
              disabled={pagination.page === 1}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500"
            >
              <ChevronRightIcon className="h-3.5 w-3.5" />
              {t('preparation.pagination.previous')}
            </button>

            <button
              onClick={() => uiActions.goToNextPage(totalPages)}
              disabled={pagination.page === totalPages}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500"
            >
              {t('preparation.pagination.next')}
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      <PreparationStatusChangeDialog
        isOpen={Boolean(statusChangeDialog)}
        order={dialogOrder}
        targetStatus={statusChangeDialog?.targetStatus || ""}
        targetStatusLabel={
          statusChangeDialog
            ? statusLabelMap.get(statusChangeDialog.targetStatus) ||
              statusChangeDialog.targetStatus
            : ""
        }
        isHold={statusChangeDialog?.isHold || false}
        initialHoldReason={dialogHoldReason}
        busy={Boolean(
          dialogOrder &&
            (rowUpdatingId === dialogOrder.orderNumber ||
              problemHoldSavingOrderId === dialogOrder.orderNumber),
        )}
        onClose={() => setStatusChangeDialog(null)}
        onConfirm={(payload) => void handleConfirmStatusChange(payload)}
      />

      <ProblemHoldReasonDialog
        isOpen={Boolean(editReasonOrder)}
        order={editReasonOrderOrder}
        initialReason={editReasonOrder?.reason || ""}
        busy={Boolean(
          editReasonOrderOrder &&
            problemHoldSavingOrderId === editReasonOrderOrder.orderNumber,
        )}
        onClose={() => setEditReasonOrder(null)}
        onConfirm={(reason) => void handleConfirmEditReason(reason)}
      />

      <DispatchCarrierModal
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        ordersCount={selectedOrders.length}
        carriers={activeCarriers}
        onConfirm={(carrier) => void handleDispatchToCarrier(carrier)}
        loading={sendingToTurbo}
      />

      <DispatchInternalCourierModal
        isOpen={showInternalCourierModal}
        onClose={() => setShowInternalCourierModal(false)}
        orderIds={selectedOrders.map((o) => String(o.id))}
        onSuccess={(runId, runNumber) => {
          setShowInternalCourierModal(false);
          toast.success(`تم إنشاء مأمورية التوزيع ${runNumber} وتكليف المندوب بنجاح`);
          uiActions.clearBulkControls();
          void fetchOrders();
          navigate('/shipping/delivery-runs');
        }}
      />
    </div>
  );
};

export default PreparationQueue;
