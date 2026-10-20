import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { useAuth } from "../../../hooks/useAuthSimple";
import { getAppSystemHub, SYSTEM_HUBS, resolveRecommendedSystemHub } from "@/utils/marketplaceSystems";
import type { InstalledApp } from "@/types/marketplace";
import {
  ApiResponse,
  StatusFilter,
  SortOption,
  getDaysRemaining,
  MyAppsStats,
} from "../types/myAppsTypes";

export function useMyAppsData() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();

  const companySpecialtySlug = user?.company?.businessSpecialty?.slug;
  const recommendedHub = resolveRecommendedSystemHub(companySpecialtySlug);

  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedHub, setSelectedHub] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [uninstallingId, setUninstallingId] = useState<string | null>(null);
  const [confirmUninstall, setConfirmUninstall] = useState<InstalledApp | null>(null);
  const [selectedAppForDrawer, setSelectedAppForDrawer] = useState<InstalledApp | null>(null);

  // Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkUninstall, setConfirmBulkUninstall] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const fetchApps = useCallback(async (showRefreshingSpinner = false) => {
    if (showRefreshingSpinner) setIsRefreshing(true);
    else setLoading(true);
    try {
      const res = await apiClient.get<ApiResponse>("/my-apps");
      if (res.data.success) {
        setApps(res.data.data || []);
      }
    } catch {
      toast.error(t("marketplace.fetchError", "تعذر جلب التطبيقات المفعلة"));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const handleUninstall = async () => {
    if (!confirmUninstall) return;
    setUninstallingId(confirmUninstall.id);
    try {
      await apiClient.post(`/marketplace/apps/${confirmUninstall.app.slug}/uninstall`);
      toast.success(
        t("marketplace.deactivatedSuccess", {
          name: confirmUninstall.app.name,
          defaultValue: `تم إلغاء تفعيل ${confirmUninstall.app.name}`,
        })
      );
      setApps((prev) => prev.filter((a) => a.id !== confirmUninstall.id));
      if (selectedAppForDrawer?.id === confirmUninstall.id) {
        setSelectedAppForDrawer(null);
      }
      await refreshUser?.();
    } catch {
      toast.error(
        t("marketplace.deactivationError", "حدث خطأ أثناء إلغاء التفعيل، يرجى المحاولة لاحقاً")
      );
    } finally {
      setUninstallingId(null);
      setConfirmUninstall(null);
    }
  };

  const toggleSelectApp = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkUninstall = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    const selectedApps = apps.filter((a) => selectedIds.has(a.id));
    let successCount = 0;

    await Promise.allSettled(
      selectedApps.map(async (installed) => {
        try {
          await apiClient.post(`/marketplace/apps/${installed.app.slug}/uninstall`);
          successCount++;
        } catch (e) {
          console.error("Failed to uninstall", installed.app.slug, e);
        }
      })
    );

    toast.success(`تم إلغاء تفعيل ${successCount} أداة بنجاح`);
    setApps((prev) => prev.filter((a) => !selectedIds.has(a.id)));
    setSelectedIds(new Set());
    setIsBulkDeleting(false);
    setConfirmBulkUninstall(false);
    await refreshUser?.();
  };

  const handleExportSelected = () => {
    const selectedApps = apps.filter((a) => selectedIds.has(a.id));
    if (selectedApps.length === 0) return;
    const headers = "اسم الأداة,الفئة,الحالة,نموذج التسعير,استهلاك الشهر (ج.م)\n";
    const rows = selectedApps.map((a) => {
      const name = `"${(a.app.name || "").replace(/"/g, '""')}"`;
      const category = `"${a.app.category || ""}"`;
      const status = a.status === "ACTIVE" ? "نشط" : a.status === "TRIAL" ? "تجريبي" : "متوقف";
      const pricing = a.activePricingModel === "FREE" ? "مجاني" : a.activePricingModel === "PAY_PER_USE" ? "حسب الاستخدام" : "شهري";
      const cost = Number(a.monthlyUsage?.totalCost || 0).toFixed(2);
      return `${name},${category},${status},${pricing},${cost}`;
    }).join("\n");

    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `selected_apps_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("تم تصدير ملخص الأدوات المحددة بنجاح");
  };

  // Hub counts & available hubs
  const hubCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: apps.length };
    for (const hub of SYSTEM_HUBS) {
      if (hub.id === "ALL") continue;
      counts[hub.id] = 0;
    }
    for (const a of apps) {
      if (!a.app) continue;
      const hub = getAppSystemHub(a.app as any);
      if (counts[hub.id] !== undefined) {
        counts[hub.id]++;
      }
    }
    return counts;
  }, [apps]);

  const availableHubs = useMemo(() => {
    return SYSTEM_HUBS.filter(
      (hub) => hub.id === "ALL" || (hubCounts[hub.id] && hubCounts[hub.id] > 0)
    );
  }, [hubCounts]);

  // Extract categories dynamically
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    apps.forEach((a) => {
      if (a.app?.category) {
        if (selectedHub !== "ALL") {
          const hub = getAppSystemHub(a.app as any);
          if (hub.id !== selectedHub) return;
        }
        cats.add(a.app.category.toUpperCase());
      }
    });
    return Array.from(cats);
  }, [apps, selectedHub]);

  // Statistics
  const stats: MyAppsStats = useMemo(() => {
    const active = apps.filter((a) => a.status === "ACTIVE").length;
    const trial = apps.filter((a) => a.status === "TRIAL").length;
    const expiringSoon = apps.filter((a) => {
      if (a.status !== "TRIAL") return false;
      const days = getDaysRemaining(a.trialEndsAt);
      return days !== null && days <= 3;
    }).length;
    const monthlyTotalCost = apps.reduce((acc, a) => {
      return acc + (Number(a.monthlyUsage?.totalCost) || 0);
    }, 0);

    return {
      total: apps.length,
      active,
      trial,
      expiringSoon,
      monthlyTotalCost,
    };
  }, [apps]);

  // Filtered & Sorted Apps
  const filteredApps = useMemo(() => {
    return apps
      .filter((a) => {
        if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
        if (selectedHub !== "ALL") {
          const hub = getAppSystemHub(a.app as any);
          if (hub.id !== selectedHub) return false;
        }
        if (categoryFilter !== "ALL" && a.app?.category?.toUpperCase() !== categoryFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const name = (a.app?.name || "").toLowerCase();
          const nameEn = (a.app?.nameEn || "").toLowerCase();
          const desc = (a.app?.description || "").toLowerCase();
          const slug = (a.app?.slug || "").toLowerCase();
          const hub = getAppSystemHub(a.app as any);
          const hubName = (hub.nameAr || "").toLowerCase();
          if (
            !name.includes(q) &&
            !nameEn.includes(q) &&
            !desc.includes(q) &&
            !slug.includes(q) &&
            !hubName.includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return (a.app?.name || "").localeCompare(b.app?.name || "", "ar");
        }
        if (sortBy === "usage") {
          const costA = Number(a.monthlyUsage?.totalCost) || 0;
          const costB = Number(b.monthlyUsage?.totalCost) || 0;
          return costB - costA;
        }
        if (sortBy === "trial_ending") {
          const daysA = getDaysRemaining(a.trialEndsAt) ?? 999;
          const daysB = getDaysRemaining(b.trialEndsAt) ?? 999;
          return daysA - daysB;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [apps, statusFilter, selectedHub, categoryFilter, search, sortBy]);

  const isAllVisibleSelected = useMemo(() => {
    if (filteredApps.length === 0) return false;
    return filteredApps.every((a) => selectedIds.has(a.id));
  }, [filteredApps, selectedIds]);

  const toggleSelectAllVisible = useCallback(() => {
    const visibleIds = filteredApps.map((a) => a.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [filteredApps, selectedIds]);

  const resetFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("ALL");
    setSelectedHub("ALL");
    setCategoryFilter("ALL");
  }, []);

  return {
    t,
    user,
    recommendedHub,
    apps,
    loading,
    isRefreshing,
    fetchApps,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    selectedHub,
    setSelectedHub,
    categoryFilter,
    setCategoryFilter,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    uninstallingId,
    confirmUninstall,
    setConfirmUninstall,
    handleUninstall,
    selectedAppForDrawer,
    setSelectedAppForDrawer,
    selectedIds,
    toggleSelectApp,
    clearSelection,
    isAllVisibleSelected,
    toggleSelectAllVisible,
    confirmBulkUninstall,
    setConfirmBulkUninstall,
    isBulkDeleting,
    handleBulkUninstall,
    handleExportSelected,
    hubCounts,
    availableHubs,
    availableCategories,
    stats,
    filteredApps,
    resetFilters,
  };
}
