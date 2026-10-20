import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { useAuth } from "../../../hooks/useAuthSimple";
import type {
  MarketplaceApp,
  Category,
  MarketplaceSpecialty,
  MarketplaceFilters,
  SortOption,
  ToolCollectionId,
} from "@/types/marketplace";
import {
  SYSTEM_HUBS,
  resolveRecommendedSystemHub,
} from "@/utils/marketplaceSystems";
import {
  MARKETPLACE_APPS_FETCH_LIMIT,
  DISPLAY_INCREMENT,
  matchesCollection,
  matchesFilters,
  matchesSearch,
  getCategoryDisplayCategories,
} from "../types/marketplaceV2Types";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  specialty?: MarketplaceSpecialty | null;
  message?: string;
}

interface MarketplaceApiError {
  response?: {
    status?: number;
    data?: { message?: string; requiredApps?: Array<{ name?: string; slug?: string }> };
  };
}

export function useMarketplaceV2Data() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [collection, setCollection] = useState<ToolCollectionId>("ALL");
  const [uninstallingApp, setUninstallingApp] = useState<string | null>(null);
  const [confirmUninstallApp, setConfirmUninstallApp] = useState<MarketplaceApp | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "INSTALLED" | "NOT_INSTALLED">("ALL");
  const [priceFilter, setPriceFilter] = useState<"ALL" | "FREE" | "PAID">("ALL");
  const [filters, setFilters] = useState<MarketplaceFilters>({});
  const [displayCount, setDisplayCount] = useState(DISPLAY_INCREMENT);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const companySpecialtySlug = user?.company?.businessSpecialty?.slug;
  const recommendedHub = resolveRecommendedSystemHub(companySpecialtySlug);
  const [selectedSystemHub, setSelectedSystemHub] = useState<string>("ALL");

  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    try {
      return (localStorage.getItem("mp_marketplace_view_mode") as "grid" | "list") || "grid";
    } catch {
      return "grid";
    }
  });

  const handleSetViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem("mp_marketplace_view_mode", mode);
    } catch {}
  };

  useEffect(() => {
    const q = searchParams.get("q");
    const c = searchParams.get("category");
    const s = searchParams.get("sort");
    const h = searchParams.get("hub");
    if (q) setSearchQuery(q);
    if (c) setSelectedCategory(c);
    if (s) setSortBy(s as SortOption);
    if (h && SYSTEM_HUBS.some((hub) => hub.id === h)) setSelectedSystemHub(h);
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (selectedCategory) p.set("category", selectedCategory);
    if (searchQuery) p.set("q", searchQuery);
    if (sortBy && sortBy !== "featured") p.set("sort", sortBy);
    if (selectedSystemHub && selectedSystemHub !== "ALL") p.set("hub", selectedSystemHub);
    setSearchParams(p, { replace: true });
  }, [selectedCategory, searchQuery, sortBy, selectedSystemHub, setSearchParams]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {};
      if (sortBy) params.sort = sortBy;
      params.page = 1;
      params.limit = MARKETPLACE_APPS_FETCH_LIMIT;

      const [appsRes, categoriesRes] = await Promise.all([
        apiClient.get<ApiEnvelope<MarketplaceApp[]>>("/marketplace/apps", { params }),
        apiClient.get<ApiEnvelope<Category[]>>("/marketplace/categories"),
      ]);

      setApps(appsRes.data.data || []);
      setCategories(categoriesRes.data.data || []);
    } catch {
      toast.error(t("marketplace.fetchError"));
    } finally {
      setLoading(false);
    }
  }, [sortBy, t]);

  useEffect(() => {
    fetchData();
    setDisplayCount(DISPLAY_INCREMENT);
  }, [fetchData]);

  const activeHubDef = SYSTEM_HUBS.find((h) => h.id === selectedSystemHub);

  const hubFiltered = useMemo(
    () =>
      apps.filter((a) => {
        if (selectedSystemHub === "ALL") return true;
        if (!activeHubDef || activeHubDef.categories.length === 0) return true;
        return activeHubDef.categories.includes((a.category || "").toUpperCase());
      }),
    [apps, selectedSystemHub, activeHubDef],
  );

  const categoryFiltered = useMemo(
    () =>
      hubFiltered.filter((a) => {
        if (!selectedCategory) return true;
        return (a.category || "").toUpperCase() === selectedCategory.toUpperCase();
      }),
    [hubFiltered, selectedCategory],
  );

  const collectionFiltered = useMemo(
    () => categoryFiltered.filter((a) => matchesCollection(a, collection)),
    [categoryFiltered, collection],
  );

  const searchFiltered = useMemo(
    () => collectionFiltered.filter((a) => matchesSearch(a, searchQuery)),
    [collectionFiltered, searchQuery],
  );

  const filterFiltered = useMemo(
    () =>
      searchFiltered.filter((a) => {
        if (priceFilter === "FREE" && a.pricingModel !== "FREE") return false;
        if (priceFilter === "PAID" && a.pricingModel === "FREE") return false;
        return matchesFilters(a, filters);
      }),
    [searchFiltered, priceFilter, filters],
  );

  const filteredApps = useMemo(
    () =>
      filterFiltered.filter((a) => {
        if (statusFilter === "INSTALLED") return a.isInstalled;
        if (statusFilter === "NOT_INSTALLED") return !a.isInstalled;
        return true;
      }),
    [filterFiltered, statusFilter],
  );

  const displayedApps = filteredApps.slice(0, displayCount);
  const hasMoreApps = filteredApps.length > displayCount;

  useEffect(() => {
    if (!hasMoreApps) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setDisplayCount((p) => p + DISPLAY_INCREMENT);
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreApps]);

  const handleUninstall = async (app: MarketplaceApp) => {
    try {
      setUninstallingApp(app.slug);
      const res = await apiClient.post(`/marketplace/apps/${app.slug}/uninstall`);
      toast.success(res.data.message || t("marketplace.deactivatedSuccess", { name: app.name }));
      setApps((prev) => prev.map((a) => (a.slug === app.slug ? { ...a, isInstalled: false } : a)));
      setConfirmUninstallApp(null);
      await refreshUser?.();
    } catch (error: unknown) {
      const e = error as MarketplaceApiError;
      if (e.response?.status === 401) {
        toast.error(t("marketplace.pleaseLogin"));
        return;
      }
      toast.error(e.response?.data?.message || t("marketplace.deactivationError"));
    } finally {
      setUninstallingApp(null);
    }
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const app of hubFiltered) {
      const cat = (app.category || "").toUpperCase();
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [hubFiltered]);

  const availableCategories = useMemo(() => {
    const base =
      selectedSystemHub === "ALL" || !activeHubDef || activeHubDef.categories.length === 0
        ? categories
        : categories.filter((c) => activeHubDef.categories.includes((c.category || "").toUpperCase()));
    return base
      .map((c) => ({
        ...c,
        count: categoryCounts[(c.category || "").toUpperCase()] ?? 0,
      }))
      .filter((c) => c.count > 0);
  }, [selectedSystemHub, activeHubDef, categories, categoryCounts]);

  const categoryDisplay = useMemo(
    () => getCategoryDisplayCategories(availableCategories, categoryCounts),
    [availableCategories, categoryCounts],
  );

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category === selectedCategory ? "" : category);
    setDisplayCount(DISPLAY_INCREMENT);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedSystemHub("ALL");
    setStatusFilter("ALL");
    setPriceFilter("ALL");
    setFilters({});
    setDisplayCount(DISPLAY_INCREMENT);
  };

  return {
    t,
    apps,
    categories,
    loading,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    collection,
    setCollection,
    uninstallingApp,
    confirmUninstallApp,
    setConfirmUninstallApp,
    statusFilter,
    setStatusFilter,
    priceFilter,
    setPriceFilter,
    filters,
    setFilters,
    displayCount,
    setDisplayCount,
    selectedSystemHub,
    setSelectedSystemHub,
    viewMode,
    handleSetViewMode,
    recommendedHub,
    activeHubDef,
    hubFiltered,
    filteredApps,
    displayedApps,
    hasMoreApps,
    availableCategories,
    categoryDisplay,
    sentinelRef,
    handleUninstall,
    handleCategorySelect,
    resetFilters,
  };
}
