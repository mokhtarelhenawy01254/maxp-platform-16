import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useDateFormat } from "../../../hooks/useDateFormat";
import orderConfirmationService, {
  OrderConfirmationSettings,
  OrderConfirmationUser,
} from "../../../services/orderConfirmationService";
import type {
  ConfirmationOrder,
  ConfirmationStats,
  FilterOption,
} from "./types";
import { useConfirmationQueueActions } from "./useConfirmationQueueActions";

export interface AppliedFiltersData {
  statuses?: string[];
  sources?: string[];
  matchMode?: string;
  excludeConfirmStatus?: string | null;
  requireConfirmedAtNull?: boolean;
  hasDateFilter?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  includeGuestOrders?: boolean;
  guestTwinReconciliation?: string;
}

export function useConfirmationQueueData() {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();

  const [settings, setSettings] = useState<OrderConfirmationSettings | null>(null);
  const [isQueueDisabled, setIsQueueDisabled] = useState(false);
  const isConfirmationDisabled = isQueueDisabled || (settings !== null && !settings.enabled);
  const [orders, setOrders] = useState<ConfirmationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [stats, setStats] = useState<ConfirmationStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsStartDate, setStatsStartDate] = useState("");
  const [statsEndDate, setStatsEndDate] = useState("");
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [statsStrategy, setStatsStrategy] = useState("");

  const [eligibleUsers, setEligibleUsers] = useState<OrderConfirmationUser[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFiltersData | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const sourceOptions: FilterOption[] = useMemo(
    () => [
      { value: "", label: t("orders.allSources", { defaultValue: "كل المصادر" }) },
      { value: "ai_conversation", label: t("orders.sourceAutoConversation", { defaultValue: "محادثة ذكية" }) },
      { value: "manual", label: t("orders.sourceManual", { defaultValue: "يدوي" }) },
      { value: "storefront", label: t("orders.sourceStorefront", { defaultValue: "المتجر" }) },
      { value: "woocommerce", label: t("orders.sourceWooCommerce", { defaultValue: "ووكومرس" }) },
      { value: "pos", label: t("orders.sourcePOS", { defaultValue: "نقطة بيع" }) },
      { value: "api", label: t("orders.sourceAPI", { defaultValue: "API" }) },
      { value: "import", label: t("orders.sourceImport", { defaultValue: "استيراد" }) },
      { value: "unknown", label: t("orders.sourceUnknown", { defaultValue: "غير معروف" }) },
    ],
    [t],
  );

  const statusOptions: FilterOption[] = useMemo(
    () => [
      { value: "", label: t("orders.allStatuses", { defaultValue: "كل الحالات" }) },
      { value: "pending", label: t("orders.pendingNew", { defaultValue: "قيد الانتظار" }) },
      { value: "confirmed", label: t("orders.confirmed", { defaultValue: "مؤكد" }) },
      { value: "processing", label: t("orders.processing", { defaultValue: "قيد التجهيز" }) },
      { value: "shipped", label: t("orders.shipped", { defaultValue: "تم الشحن" }) },
      { value: "delivered", label: t("orders.delivered", { defaultValue: "تم التوصيل" }) },
      { value: "cancelled", label: t("orders.cancelled", { defaultValue: "ملغي" }) },
    ],
    [t],
  );

  const strategyOptions: FilterOption[] = useMemo(
    () => [
      { value: "", label: t("orders.allStrategies", { defaultValue: "كل الاستراتيجيات" }) },
      { value: "round_robin", label: t("orders.strategyRoundRobin", { defaultValue: "دائري (بالتساوي)" }) },
      { value: "by_region", label: t("orders.strategyByRegion", { defaultValue: "حسب المنطقة" }) },
      { value: "by_specialty", label: t("orders.strategyBySpecialty", { defaultValue: "حسب التخصص" }) },
      { value: "by_order_value", label: t("orders.strategyByOrderValue", { defaultValue: "حسب قيمة الطلب" }) },
      { value: "by_workload", label: t("orders.strategyByWorkload", { defaultValue: "حسب ضغط العمل" }) },
      { value: "manual", label: t("orders.strategyManualAssign", { defaultValue: "تخصيص يدوي" }) },
    ],
    [t],
  );

  const strategyLabelMap = useMemo(() => {
    return strategyOptions.reduce<Record<string, string>>((acc, opt) => {
      if (opt.value) acc[opt.value] = opt.label;
      return acc;
    }, {});
  }, [strategyOptions]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await orderConfirmationService.getSettings();
      setSettings(res.data);
      if (res.data && typeof res.data.enabled === "boolean") {
        setIsQueueDisabled(!res.data.enabled);
      }
    } catch (error: any) {
      toast.error(error?.message || t("orders.failedToLoadSettings", { defaultValue: "تعذر تحميل إعدادات التأكيد" }));
    }
  }, [t]);

  const fetchEligibleUsers = useCallback(async () => {
    try {
      const res = await orderConfirmationService.getEligibleUsers();
      setEligibleUsers(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      toast.error(error?.message || t("orders.failedToLoadDistributionTeam", { defaultValue: "تعذر تحميل فريق التوزيع" }));
    }
  }, [t]);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page,
        limit,
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (sourceFilter) params.sourceType = sourceFilter;
      if (onlyUnassigned) params.onlyUnassigned = true;

      const res = await orderConfirmationService.getQueue(params);
      if (res?.disabled) {
        setIsQueueDisabled(true);
      } else if (res?.success) {
        setIsQueueDisabled(false);
      }
      if (res?.appliedFilters) {
        setAppliedFilters(res.appliedFilters);
      }
      setOrders(Array.isArray(res.data) ? res.data : []);
      setTotalOrders(res.pagination?.total || 0);
      setTotalPages(res.pagination?.pages || 1);
    } catch (error: any) {
      toast.error(error?.message || t("orders.failedToLoadOrders", { defaultValue: "تعذر تحميل الطلبات" }));
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, sourceFilter, onlyUnassigned, t]);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const params: Record<string, any> = {};
      if (statsStartDate) params.startDate = statsStartDate;
      if (statsEndDate) params.endDate = statsEndDate;
      if (statsStrategy) params.strategy = statsStrategy;
      const res = await orderConfirmationService.getStats(params);
      setStats(res.data || null);
    } catch (error: any) {
      toast.error(error?.message || t("orders.failedToLoadTeamReport", { defaultValue: "تعذر تحميل تقرير الفريق" }));
    } finally {
      setStatsLoading(false);
    }
  }, [statsStartDate, statsEndDate, statsStrategy, t]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const handleSettingsUpdated = () => {
      fetchSettings();
      fetchQueue();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchSettings();
        fetchQueue();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "order-confirmation-settings-updated-at") {
        fetchSettings();
        fetchQueue();
      }
    };

    window.addEventListener("order-confirmation-settings-updated", handleSettingsUpdated);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("order-confirmation-settings-updated", handleSettingsUpdated);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchSettings, fetchQueue]);

  useEffect(() => {
    if (settings?.enabled) {
      setIsQueueDisabled(false);
      fetchEligibleUsers();
      fetchQueue();
      fetchStats();
    } else if (settings && !settings.enabled) {
      setIsQueueDisabled(true);
    }
  }, [settings?.enabled, fetchEligibleUsers, fetchQueue, fetchStats, settings]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue, refreshKey]);

  useEffect(() => {
    if (settings?.enabled) {
      fetchStats();
    }
  }, [settings?.enabled, fetchStats, refreshKey, statsRefreshKey]);

  const statsSummaryLabel = useMemo(() => {
    if (statsStartDate || statsEndDate) {
      const fromLabel = statsStartDate ? formatDate(statsStartDate) : "—";
      const toLabel = statsEndDate ? formatDate(statsEndDate) : "—";
      return t("orders.summaryFromTo", { from: fromLabel, to: toLabel, defaultValue: `من ${fromLabel} إلى ${toLabel}` });
    }
    return t("orders.summaryLast30Days", { defaultValue: "ملخص آخر 30 يوماً" });
  }, [statsStartDate, statsEndDate, formatDate, t]);

  const activeQueueFilterCount = useMemo(
    () => [statusFilter, sourceFilter, onlyUnassigned].filter(Boolean).length,
    [statusFilter, sourceFilter, onlyUnassigned],
  );

  const statusFilterLabel = useMemo(
    () => statusOptions.find((opt) => opt.value === statusFilter)?.label || t("orders.allStatuses", { defaultValue: "كل الحالات" }),
    [statusFilter, statusOptions, t],
  );

  const sourceFilterLabel = useMemo(
    () => sourceOptions.find((opt) => opt.value === sourceFilter)?.label || t("orders.allSources", { defaultValue: "كل المصادر" }),
    [sourceFilter, sourceOptions, t],
  );

  const resetQueueFilters = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("");
    setSourceFilter("");
    setOnlyUnassigned(false);
    setPage(1);
  }, []);

  const actions = useConfirmationQueueActions({
    orders,
    setOrders,
    setRefreshKey,
  });

  return {
    settings,
    isConfirmationDisabled,
    orders,
    loading,
    page,
    setPage,
    totalPages,
    totalOrders,
    searchInput,
    setSearchInput,
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    onlyUnassigned,
    setOnlyUnassigned,
    stats,
    statsLoading,
    statsStartDate,
    setStatsStartDate,
    statsEndDate,
    setStatsEndDate,
    statsStrategy,
    setStatsStrategy,
    strategyOptions,
    strategyLabelMap,
    statsSummaryLabel,
    setStatsRefreshKey,
    eligibleUsers,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    sourceOptions,
    statusOptions,
    activeQueueFilterCount,
    statusFilterLabel,
    sourceFilterLabel,
    appliedFilters,
    resetQueueFilters,
    ...actions,
  };
}
