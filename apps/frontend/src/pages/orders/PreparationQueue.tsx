import { useTranslation } from "react-i18next";
import React, { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { useAuth } from "../../hooks/useAuthSimple";
import { useInvoiceSettings } from "../../hooks/useInvoiceSettings";
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
import PreparationFilters from "./preparation/components/PreparationFilters";
import { PreparationOrdersContainer } from "./preparation/components/PreparationOrdersContainer";
import MerchantOperationsSummary from "./preparation/components/MerchantOperationsSummary";
import type { ActiveCarrier } from "./preparation/components/DispatchCarrierModal";
import PreparationAlertBanners from "./preparation/components/PreparationAlertBanners";
import PreparationColumnSettingsDropdown from "./preparation/components/PreparationColumnSettingsDropdown";
import PreparationQueueDialogsContainer from "./preparation/components/PreparationQueueDialogsContainer";
import PreparationSelectionBar from "./preparation/components/PreparationSelectionBar";
import { usePreparationCarrierDispatch } from "./preparation/usePreparationCarrierDispatch";
import { usePreparationInvoicePrinting } from "./preparation/usePreparationInvoicePrinting";
import { usePreparationShortageOperations } from "./preparation/usePreparationShortageOperations";
import { usePreparationProblemOperations } from "./preparation/usePreparationProblemOperations";
import { usePreparationBulkStatusOperations } from "./preparation/usePreparationBulkStatusOperations";
import { usePreparationSingleStatusOperations } from "./preparation/usePreparationSingleStatusOperations";
import { usePreparationOrderSelection } from "./preparation/usePreparationOrderSelection";
import { usePreparationTransitions } from "./preparation/usePreparationTransitions";
import { usePreparationQuickTransfer } from "./preparation/usePreparationQuickTransfer";
import { usePreparationSlipPrint } from "./preparation/usePreparationSlipPrint";

type BulkStatusResult = {
  id?: string | number | null;
  success?: boolean;
  orderType?: string;
  workflowStatus?: string;
  error?: string;
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

  const isInternalCourierAppActive = useMemo(() => {
    if (user?.role === 'SUPER_ADMIN') return true;
    const currentCompany = user?.companies?.find((c) => c.isCurrent) || user?.company;
    const activeApps = Array.isArray(currentCompany?.activeApps)
      ? currentCompany.activeApps
      : Array.isArray(user?.company?.activeApps)
        ? user.company.activeApps
        : Array.isArray(user?.activeApps)
          ? user.activeApps
          : [];

    const allowedSlugs = ['internal-courier-fleet'];
    return allowedSlugs.some((slug) => {
      const target = slug.toLowerCase();
      return activeApps.some((a) => {
        if (typeof a === 'string') return a.trim().toLowerCase() === target;
        if (a && typeof a === 'object') {
          const obj = a as { slug?: string; app?: { slug?: string } };
          if (obj.slug?.trim().toLowerCase() === target) return true;
          if (obj.app?.slug?.trim().toLowerCase() === target) return true;
        }
        return false;
      });
    });
  }, [user]);

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
    companyId: user?.companyId || undefined,
  });

  // إلغاء تحديد طلبات الشركة السابقة عند تبديل الشركة
  const currentCompanyId = user?.companyId;
  useEffect(() => {
    uiActions.clearBulkControls();
  }, [currentCompanyId, uiActions]);

  // rowUpdatingId provided by usePreparationSingleStatusOperations
  // bulkUpdating provided by usePreparationBulkStatusOperations
  const [qcChecklistState, setQcChecklistState] = useState<
    Record<string, Partial<Record<QcCheckKey, boolean>>>
  >({});
  const handleSingleStatusUpdateRef = useRef<(orderNumber: string, status: string) => Promise<boolean | void>>(async () => {});
  const updateLocalMetadataRef = useRef<(orderNumber: string, patch: Record<string, unknown>) => void>(() => {});

  const {
    shortageHoldDrafts,
    setShortageHoldDrafts,
    shortageSavingOrderId,
    handleShortageFieldChange,
    saveShortageHoldDetails,
    handleMarkAsShortageHold,
    handleReleaseShortageHold,
    handleMarkAsShortageFailed,
  } = usePreparationShortageOperations({
    orders,
    startingStatus: preparationSettings.startingStatus,
    updateLocalMetadata: (orderNumber, patch) => updateLocalMetadataRef.current(orderNumber, patch),
    fetchAll,
    handleSingleStatusUpdate: (orderNumber, status) => handleSingleStatusUpdateRef.current(orderNumber, status),
    getApiErrorMessage,
    t,
  });

  const getOrderByNumberRef = useRef<(orderNumber: string) => PreparationOrder | null>(() => null);
  const updateLocalStatusesRef = useRef<(orderNumbers: string[], status: string) => void>(() => {});

  // transferingItemKey provided by usePreparationQuickTransfer
  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    orderNumber: string;
    targetStatus: string;
    isHold?: boolean;
  } | null>(null);

  const {
    problemHoldDrafts,
    setProblemHoldDrafts,
    problemHoldSavingOrderId,
    setProblemHoldSavingOrderId,
    editReasonOrder,
    setEditReasonOrder,
    editReasonOrderOrder,
    saveProblemHoldDetails,
    handleHoldAsProblem,
    handleEditProblemReason,
    handleConfirmEditReason,
    handleReleaseProblemHold,
  } = usePreparationProblemOperations({
    orders,
    user,
    startingStatus: preparationSettings.startingStatus,
    getOrderByNumber: (orderNumber) => getOrderByNumberRef.current(orderNumber),
    updateLocalMetadata: (orderNumber, patch) => updateLocalMetadataRef.current(orderNumber, patch),
    updateLocalStatuses: (orderNumbers, status) => updateLocalStatusesRef.current(orderNumbers, status),
    fetchAll,
    setStatusChangeDialog,
    getApiErrorMessage,
    t,
  });
  // bulkHoldDialog provided by usePreparationBulkStatusOperations
  const [showInternalCourierModal, setShowInternalCourierModal] = useState(false);
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

    const problemHoldCode = toUpper(PROBLEM_HOLD_STATUS);
    addOption(
      problemHoldCode,
      statusLabelMap.get(problemHoldCode) || t('orders.onHoldPrep') || 'تجهيز معلق'
    );

    return dynamicOptions;
  }, [
    preparationStatuses,
    preparationSettings.handoffStatus,
    preparationSettings.startingStatus,
    statusLabelMap,
    t,
  ]);

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
      if (!seen.has(code) && !seen.has("PENDING_PREPARATION")) {
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

  const {
    selectedSet,
    allVisibleSelected,
    toggleOrderSelection,
    toggleSelectAllVisible,
  } = usePreparationOrderSelection({
    selectedOrders,
    enrichedOrders,
    uiActions,
  });

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
  updateLocalStatusesRef.current = updateLocalStatuses;

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
  updateLocalMetadataRef.current = updateLocalMetadata;

  const getOrderByNumber = useCallback(
    (orderNumber: string) =>
      preparationOrders.find((order) => order.orderNumber === orderNumber) || null,
    [preparationOrders],
  );
  getOrderByNumberRef.current = getOrderByNumber;

  const {
    isQcComplete,
    validateTransition,
    handleQcCheckToggle,
  } = usePreparationTransitions({
    preparationSettings,
    enabledQcChecks,
    qcChecklistState,
    setQcChecklistState,
    userRole: user?.role,
    t,
  });

  // handleShortageFieldChange provided by usePreparationShortageOperations

  const { printingOrderNumber, handlePrintPreparationSlip } = usePreparationSlipPrint({
    orders,
    user,
    invoiceSettings,
    t,
  });

  // saveShortageHoldDetails provided by usePreparationShortageOperations
  const {
    rowUpdatingId,
    performStatusUpdate,
    handleSingleStatusUpdate,
    handleRequestStatusChange,
    handleConfirmStatusChange,
  } = usePreparationSingleStatusOperations({
    getOrderByNumber,
    validateTransition,
    problemHoldDrafts,
    setProblemHoldDrafts,
    setProblemHoldSavingOrderId,
    updateLocalMetadata,
    updateLocalStatuses,
    statusLabelMap,
    preparationSettings,
    user,
    fetchAll,
    statusChangeDialog,
    setStatusChangeDialog,
    getApiErrorMessage,
    t,
  });
  handleSingleStatusUpdateRef.current = handleSingleStatusUpdate;

  // Problem hold handlers provided by usePreparationProblemOperations
  const {
    bulkUpdating,
    setBulkUpdating,
    bulkHoldDialog,
    setBulkHoldDialog,
    executeBulkUpdateSelected,
    handleBulkUpdate,
    executeBulkUpdateAll,
    handleBulkUpdateAll,
  } = usePreparationBulkStatusOperations({
    bulkStatus,
    selectedOrders,
    enrichedOrders,
    getOrderByNumber,
    validateTransition,
    updateLocalStatuses,
    fetchAll,
    clearBulkControls: uiActions.clearBulkControls,
    statusLabelMap,
    paginationTotal: pagination.total,
    getFiltersPayload: () => ({
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
    }),
    getApiErrorMessage,
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
    clearBulkControls: uiActions.clearBulkControls,
  });

  const { printingInvoices, handlePrintInvoices } = usePreparationInvoicePrinting({
    selectedOrders,
    navigate,
    user,
  });

  // handleMarkAsShortageHold, handleReleaseShortageHold, handleMarkAsShortageFailed provided by usePreparationShortageOperations
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
  // handleConfirmStatusChange provided by usePreparationSingleStatusOperations



  return (
    <div className="space-y-3">
      {isMerchantUser ? (
        <MerchantOperationsSummary
          formatPrice={formatPrice}
          formatDate={formatDate}
        />
      ) : null}

      <PreparationAlertBanners
        preparationSettingsEnabled={Boolean(preparationSettings.enabled)}
        allOverdueShortageFollowUpCount={allOverdueShortageFollowUpCount}
        allOverdueProblemFollowUpCount={allOverdueProblemFollowUpCount}
      />

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

      <section className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <PreparationSelectionBar
          allVisibleSelected={allVisibleSelected}
          toggleSelectAllVisible={toggleSelectAllVisible}
          totalVisibleOrders={pagination.total}
          inventoryLoading={inventoryLoading}
          loading={loading}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          columnSettingsOpen={columnSettingsOpen}
          setColumnSettingsOpen={setColumnSettingsOpen}
          visibleColumns={visibleColumns}
          toggleColumn={toggleColumn}
          visibleFilterSections={visibleFilterSections}
          toggleFilterSection={toggleFilterSection}
          selectedOrdersCount={selectedOrders.length}
          bulkStatus={bulkStatus}
          statusOptions={statusOptions}
          statusLabelMap={statusLabelMap}
          bulkUpdating={bulkUpdating}
          preparationEnabled={preparationSettings.enabled}
          bulkStatusUpdateEnabled={preparationSettings.enableBulkStatusUpdate}
          sendingToTurbo={sendingToTurbo}
          printingInvoices={printingInvoices}
          onBulkStatusChange={uiActions.setBulkStatus}
          onApply={() => void handleBulkUpdate()}
          onApplyToAll={() => void handleBulkUpdateAll()}
          onClear={uiActions.clearBulkControls}
          onClearSelection={() => uiActions.clearBulkControls()}
          onSendToTurbo={() => void handleOpenDispatchModal()}
          onSendToShipping={() => void handleOpenDispatchModal()}
          onSendToInternalCourier={isInternalCourierAppActive ? () => setShowInternalCourierModal(true) : undefined}
          onPrintInvoices={() => void handlePrintInvoices()}
        />

        <PreparationOrdersContainer
          loading={loading}
          enrichedOrders={enrichedOrders}
          pagination={pagination}
          totalPages={totalPages}
          currentPageCount={currentPageCount}
          pageSize={uiState.pageSize}
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
          toggleOrderSelection={toggleOrderSelection}
          handleQuickTransfer={handleQuickTransfer}
          handleShortageFieldChange={handleShortageFieldChange}
          saveShortageHoldDetails={saveShortageHoldDetails}
          handleQcCheckToggle={handleQcCheckToggle}
          onStatusSelectionChange={uiActions.setStatusSelection}
          handleRequestStatusChange={handleRequestStatusChange}
          handleMarkAsShortageHold={handleMarkAsShortageHold}
          handleReleaseShortageHold={handleReleaseShortageHold}
          handleMarkAsShortageFailed={handleMarkAsShortageFailed}
          handleHoldAsProblem={handleHoldAsProblem}
          handleReleaseProblemHold={handleReleaseProblemHold}
          handleEditProblemReason={handleEditProblemReason}
          handlePrintPreparationSlip={handlePrintPreparationSlip}
          onPageSizeChange={uiActions.setPageSize}
          onPreviousPage={uiActions.goToPreviousPage}
          onNextPage={() => uiActions.goToNextPage(totalPages)}
        />
      </section>

      <PreparationQueueDialogsContainer
        statusChangeDialog={statusChangeDialog}
        setStatusChangeDialog={setStatusChangeDialog}
        dialogOrder={dialogOrder}
        statusLabelMap={statusLabelMap}
        dialogHoldReason={dialogHoldReason}
        rowUpdatingId={rowUpdatingId}
        problemHoldSavingOrderId={problemHoldSavingOrderId}
        handleConfirmStatusChange={handleConfirmStatusChange}

        bulkHoldDialog={bulkHoldDialog}
        setBulkHoldDialog={setBulkHoldDialog}
        bulkUpdating={bulkUpdating}
        executeBulkUpdateSelected={executeBulkUpdateSelected}
        executeBulkUpdateAll={executeBulkUpdateAll}

        editReasonOrder={editReasonOrder}
        setEditReasonOrder={setEditReasonOrder}
        editReasonOrderOrder={editReasonOrderOrder}
        handleConfirmEditReason={handleConfirmEditReason}

        showDispatchModal={showDispatchModal}
        setShowDispatchModal={setShowDispatchModal}
        selectedOrdersCount={selectedOrders.length}
        activeCarriers={activeCarriers}
        handleDispatchToCarrier={handleDispatchToCarrier}
        sendingToTurbo={sendingToTurbo}

        showInternalCourierModal={showInternalCourierModal}
        setShowInternalCourierModal={setShowInternalCourierModal}
        internalCourierOrderIds={selectedOrders
          .map((orderNumber) => getOrderByNumber(orderNumber)?.id)
          .filter((id): id is string | number => id !== undefined && id !== null)
          .map(String)}
        onInternalCourierSuccess={(runId, runNumber) => {
          setShowInternalCourierModal(false);
          toast.success(`تم إنشاء مأمورية التوزيع ${runNumber} وتكليف المندوب بنجاح`);
          uiActions.clearBulkControls();
          void fetchAll();
          navigate('/shipping/delivery-runs');
        }}
      />
    </div>
  );
};

export default PreparationQueue;
