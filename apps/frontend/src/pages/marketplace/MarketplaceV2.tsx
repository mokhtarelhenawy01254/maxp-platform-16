import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuthSimple";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Package, Loader2,
  Layers3, PackageX, X, Zap,
  Store, Users, MessageSquare, BarChart3, TrendingUp,
  DollarSign, Heart, CheckCircle2,
  ShoppingBag, Brain,
  LayoutGrid, List,
  Truck, Sparkles,
  CreditCard, Gamepad2, Palette, ClipboardList, Percent,
  ChevronDown, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AppCard,
  SearchBar,
  CategorySidebar,
  SectionSkeleton,
} from "@/components/marketplace";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { MarketplaceApp, Category, MarketplaceSpecialty, MarketplaceFilters, SortOption, ToolCollectionId } from "@/types/marketplace";
import {
  categoryGroups,
  OTHER_CATEGORY_GROUP_ID,
} from "@/utils/marketplace";
import {
  SYSTEM_HUBS,
  resolveRecommendedSystemHub,
} from "@/utils/marketplaceSystems";

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

const MARKETPLACE_APPS_FETCH_LIMIT = 200;
const DISPLAY_INCREMENT = 20;

function matchesCollection(app: MarketplaceApp, col: ToolCollectionId) {
  if (col === "ALL") return true;
  if (col === "FEATURED") return app.isFeatured;
  return true;
}

function matchesFilters(app: MarketplaceApp, filters: MarketplaceFilters) {
  if (app.isPublic === false || app.isActive === false || app.slug === 'multi-warehouse-pro') return false;
  if (filters.priceModel && filters.priceModel !== "ALL") {
    if (filters.priceModel === "FREE" && app.pricingModel !== "FREE") return false;
    if (filters.priceModel === "PAID" && app.pricingModel === "FREE") return false;
  }
  if (filters.minRating && (app.rating ?? 0) < filters.minRating) return false;
  if (filters.isAiPowered && !app.isAiPowered) return false;
  if (filters.isOfficial && !app.isOfficial) return false;
  if (filters.isNew && !app.isNew) return false;
  if (filters.isRecentlyUpdated && !app.isRecentlyUpdated) return false;
  return true;
}

function matchesSearch(app: MarketplaceApp, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    app.name,
    app.nameEn,
    app.description,
    app.descriptionEn,
    app.category,
    app.slug,
    ...(app.tags || []),
    app.developer?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

interface AppGroupSection {
  id: string;
  labelKey: string;
  apps: MarketplaceApp[];
}

function groupAppsBySidebarSections(apps: MarketplaceApp[]): AppGroupSection[] {
  const byGroup = new Map<string, MarketplaceApp[]>();
  const other: MarketplaceApp[] = [];
  for (const app of apps) {
    if (app.isPublic === false || app.isActive === false || app.slug === 'multi-warehouse-pro') continue;
    const group = categoryGroups.find((g) => g.categories.includes(app.category));
    if (group) {
      const list = byGroup.get(group.id) || [];
      list.push(app);
      byGroup.set(group.id, list);
    } else {
      other.push(app);
    }
  }
  const result: AppGroupSection[] = [];
  for (const g of categoryGroups) {
    const items = byGroup.get(g.id);
    if (items && items.length) result.push({ id: g.id, labelKey: g.labelKey, apps: items });
  }
  if (other.length) result.push({ id: OTHER_CATEGORY_GROUP_ID, labelKey: "marketplace.categories.groups.other", apps: other });
  return result;
}

function getCategoryDisplayCategories(categories: Category[], categoryCounts: Record<string, number> = {}) {
  const categoryIconsMap: Record<string, typeof Package> = {
    AI: Brain, MARKETING: Sparkles, SALES: ShoppingBag, CRM: BarChart3,
    ACCOUNTING: DollarSign, FINANCE: DollarSign, ANALYTICS: TrendingUp,
    HR: Users, WAREHOUSE: Package, SHIPPING: Truck,
    SUPPORT: MessageSquare, WHATSAPP: MessageSquare,
    SEO: TrendingUp, INTEGRATION: Zap, THEMES: LayoutGrid,
    ECOMMERCE: Store, MEDICAL: Heart,
    ORDER_OPS: ClipboardList, PAYMENTS: CreditCard,
    PROCUREMENT: ShoppingBag, WHOLESALE: Percent,
    PRODUCTIVITY: Package, COMMUNICATION: MessageSquare,
    GAMIFICATION: Gamepad2, DESIGN: Palette,
  };
  return categories.map(c => {
    const catUpper = (c.category || "").toUpperCase();
    return {
      id: c.category,
      name: c.name,
      icon: categoryIconsMap[catUpper] || Package,
      count: categoryCounts[catUpper] ?? c.count ?? 0,
    };
  });
}

export default function MarketplaceV2() {
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
    const q = searchParams.get("q"); const c = searchParams.get("category"); const s = searchParams.get("sort"); const h = searchParams.get("hub");
    if (q) setSearchQuery(q); if (c) setSelectedCategory(c); if (s) setSortBy(s as SortOption);
    if (h && SYSTEM_HUBS.some(hub => hub.id === h)) setSelectedSystemHub(h);
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
      toast.error(t('marketplace.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [sortBy, t]);

  useEffect(() => { fetchData(); setDisplayCount(DISPLAY_INCREMENT); }, [fetchData]);

  const activeHubDef = SYSTEM_HUBS.find(h => h.id === selectedSystemHub);
  const hubFiltered = useMemo(() => apps.filter(a => {
    if (selectedSystemHub === "ALL") return true;
    if (!activeHubDef || activeHubDef.categories.length === 0) return true;
    return activeHubDef.categories.includes((a.category || "").toUpperCase());
  }), [apps, selectedSystemHub, activeHubDef]);

  const categoryFiltered = useMemo(() => hubFiltered.filter(a => {
    if (!selectedCategory) return true;
    return (a.category || "").toUpperCase() === selectedCategory.toUpperCase();
  }), [hubFiltered, selectedCategory]);

  const collectionFiltered = useMemo(() => categoryFiltered.filter(a => matchesCollection(a, collection)), [categoryFiltered, collection]);
  const searchFiltered = useMemo(() => collectionFiltered.filter(a => matchesSearch(a, searchQuery)), [collectionFiltered, searchQuery]);
  const filterFiltered = useMemo(() => searchFiltered.filter(a => {
    if (priceFilter === "FREE" && a.pricingModel !== "FREE") return false;
    if (priceFilter === "PAID" && a.pricingModel === "FREE") return false;
    return matchesFilters(a, filters);
  }), [searchFiltered, priceFilter, filters]);
  const filteredApps = useMemo(() => filterFiltered.filter(a => {
    if (statusFilter === "INSTALLED") return a.isInstalled;
    if (statusFilter === "NOT_INSTALLED") return !a.isInstalled;
    return true;
  }), [filterFiltered, statusFilter]);
  const displayedApps = filteredApps.slice(0, displayCount);

  const hasMoreApps = filteredApps.length > displayCount;
  useEffect(() => {
    if (!hasMoreApps) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setDisplayCount(p => p + DISPLAY_INCREMENT);
    }, { rootMargin: "400px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreApps]);

  const handleUninstall = async (app: MarketplaceApp) => {
    try {
      setUninstallingApp(app.slug);
      const res = await apiClient.post(`/marketplace/apps/${app.slug}/uninstall`);
      toast.success(res.data.message || t('marketplace.deactivatedSuccess', { name: app.name }));
      setApps(prev => prev.map(a => a.slug === app.slug ? { ...a, isInstalled: false } : a));
      setConfirmUninstallApp(null);
      await refreshUser?.();
    } catch (error: unknown) {
      const e = error as MarketplaceApiError;
      if (e.response?.status === 401) { toast.error(t('marketplace.pleaseLogin')); return; }
      toast.error(e.response?.data?.message || t('marketplace.deactivationError'));
    } finally { setUninstallingApp(null); }
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
    const base = selectedSystemHub === "ALL" || !activeHubDef || activeHubDef.categories.length === 0
      ? categories
      : categories.filter(c => activeHubDef.categories.includes((c.category || "").toUpperCase()));
    return base
      .map(c => ({
        ...c,
        count: categoryCounts[(c.category || "").toUpperCase()] ?? 0,
      }))
      .filter(c => c.count > 0);
  }, [selectedSystemHub, activeHubDef, categories, categoryCounts]);

  const categoryDisplay = useMemo(
    () => getCategoryDisplayCategories(availableCategories, categoryCounts),
    [availableCategories, categoryCounts]
  );

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category === selectedCategory ? "" : category);
    setDisplayCount(DISPLAY_INCREMENT);
  };

  return (
    <div className="min-h-screen bg-background">
      {loading ? (
        <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-8 pt-6 pb-16">
          <div className="mt-8 space-y-6">
            <SectionSkeleton count={4} />
            <SectionSkeleton count={4} />
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-8 pb-16">
          {/* ── Top Header & Omni Filter Bar ── */}
          <div className="pt-4 pb-2">
            {/* 1. System Hubs Switcher (Multi-System Solution Selector) */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 mb-3 border-b border-border/20 pe-1">
              {SYSTEM_HUBS.map(hub => {
                const Icon = hub.icon;
                const active = hub.id === selectedSystemHub;
                const isRecommended = recommendedHub?.id === hub.id;
                const hubAppCount = hub.id === "ALL"
                  ? apps.length
                  : apps.filter(a => hub.categories.includes((a.category || "").toUpperCase())).length;

                return (
                  <button
                    key={hub.id}
                    type="button"
                    onClick={() => {
                      setSelectedSystemHub(hub.id);
                      setSelectedCategory("");
                      setDisplayCount(DISPLAY_INCREMENT);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30"
                    )}
                  >
                    <Icon size={14} className={active ? "text-primary-foreground" : "text-primary"} />
                    <span>{hub.nameAr}</span>
                    <span className={cn(
                      "text-[10px] tabular-nums px-1.5 py-0.2 rounded-full",
                      active ? "bg-primary-foreground/20 text-primary-foreground font-semibold" : "bg-muted text-muted-foreground"
                    )}>
                      {hubAppCount}
                    </span>
                    {isRecommended && !active && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        موصى به
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Row 1: Search, Status Segmented Controls, Category Picker, and View Switcher */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {/* Search Bar — sticky on mobile so search stays reachable while browsing apps */}
              <div className="flex-1 min-w-[240px] sticky top-14 z-30 bg-background py-1.5 sm:py-0 sm:static sm:z-auto">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={t('marketplace.searchPlaceholder', 'ابحث عن التطبيقات، المميزات، أو الفئات...')}
                />
              </div>

              {/* Status Segmented Buttons */}
              <div className="flex items-center p-1 rounded-xl bg-muted/50 border border-border/30 shrink-0 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setStatusFilter("ALL"); setDisplayCount(DISPLAY_INCREMENT); }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all",
                    statusFilter === "ALL" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  الكل ({apps.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter("INSTALLED"); setDisplayCount(DISPLAY_INCREMENT); }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1",
                    statusFilter === "INSTALLED" ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <CheckCircle2 size={12} />
                  المثبتة ({apps.filter(a => a.isInstalled).length})
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter("NOT_INSTALLED"); setDisplayCount(DISPLAY_INCREMENT); }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all",
                    statusFilter === "NOT_INSTALLED" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  غير مثبتة
                </button>
              </div>

              {/* Category dropdown (desktop) — scoped to the selected system hub */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "hidden sm:flex items-center gap-1.5 h-10 px-3 rounded-xl text-xs font-bold shrink-0 border transition-all",
                      selectedCategory
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background border-border/40 hover:border-primary/40 text-foreground"
                    )}
                  >
                    <Layers3 size={14} />
                    <span>
                      {selectedCategory
                        ? categories.find(c => (c.category || "").toUpperCase() === selectedCategory.toUpperCase())?.name || selectedCategory
                        : "التصنيفات"}
                    </span>
                    {selectedCategory && (
                      <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-full bg-primary-foreground/20">
                        {filteredApps.length}
                      </span>
                    )}
                    <ChevronDown size={13} className={cn("opacity-70", selectedCategory && "text-primary-foreground")} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto w-56 rounded-xl">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {activeHubDef && selectedSystemHub !== "ALL" ? `تصنيفات ${activeHubDef.nameAr}` : "كل التصنيفات"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleCategorySelect(selectedCategory)}
                    className={cn("text-xs font-bold gap-2", !selectedCategory && "bg-muted/60")}
                  >
                    <Package size={13} className="text-primary" />
                    <span className="flex-1">كل التصنيفات</span>
                    <span className="text-[10px] tabular-nums text-muted-foreground">{hubFiltered.length}</span>
                    {!selectedCategory && <Check size={13} className="text-primary" />}
                  </DropdownMenuItem>
                  {categoryDisplay.map(cat => {
                    const Icon = cat.icon;
                    const active = cat.id === selectedCategory;
                    return (
                      <DropdownMenuItem
                        key={cat.id}
                        onClick={() => handleCategorySelect(active ? "" : cat.id)}
                        className={cn("text-xs font-bold gap-2", active && "bg-muted/60")}
                      >
                        <Icon size={13} className="text-primary" />
                        <span className="flex-1 truncate">{cat.name}</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground">{cat.count}</span>
                        {active && <Check size={13} className="text-primary" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* All Categories Drawer Sheet Trigger (mobile only) */}
              <CategorySidebar
                isMobile
                categories={categoryDisplay}
                selectedCategory={selectedCategory}
                onSelect={handleCategorySelect}
                className="sm:hidden h-10 px-3 rounded-xl border-border/40 font-bold shrink-0"
              />

              {/* Grid / List View Switcher */}
              <div className="hidden sm:flex items-center p-1 rounded-xl bg-muted/50 border border-border/30 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSetViewMode("grid")}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    viewMode === "grid" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="عرض شبكي (Grid View)"
                  aria-label="Grid View"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewMode("list")}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    viewMode === "list" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="عرض قائمة (List View)"
                  aria-label="List View"
                >
                  <List size={16} />
                </button>
              </div>
            </div>

            {/* Active Filter summary if any filter is on */}
            {(selectedSystemHub !== "ALL" || selectedCategory || searchQuery || statusFilter !== "ALL" || priceFilter !== "ALL") && (
              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-xl border border-border/25 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>النتائج: <strong className="text-foreground font-bold">{filteredApps.length}</strong> تطبيق</span>
                  {selectedSystemHub !== "ALL" && activeHubDef && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-foreground text-background font-bold">
                      {activeHubDef.nameAr}
                      <X size={12} className="cursor-pointer hover:opacity-75" onClick={() => setSelectedSystemHub("ALL")} />
                    </span>
                  )}
                  {selectedCategory && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
                      {categories.find(c => c.category === selectedCategory)?.name || selectedCategory}
                      <X size={12} className="cursor-pointer hover:opacity-75" onClick={() => setSelectedCategory("")} />
                    </span>
                  )}
                  {statusFilter !== "ALL" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background text-foreground border border-border/40 font-semibold">
                      {statusFilter === "INSTALLED" ? "المثبتة فقط" : "غير المثبتة"}
                      <X size={12} className="cursor-pointer hover:opacity-75" onClick={() => setStatusFilter("ALL")} />
                    </span>
                  )}
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background text-foreground border border-border/40 font-semibold">
                      بحث: &ldquo;{searchQuery}&rdquo;
                      <X size={12} className="cursor-pointer hover:opacity-75" onClick={() => setSearchQuery("")} />
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("");
                    setSelectedSystemHub("ALL");
                    setStatusFilter("ALL");
                    setPriceFilter("ALL");
                    setFilters({});
                    setDisplayCount(DISPLAY_INCREMENT);
                  }}
                  className="text-primary hover:underline font-bold shrink-0 text-xs"
                >
                  إعادة ضبط الفلاتر
                </button>
              </div>
            )}
          </div>

          {/* ── Apps Content Area ── */}
          <div className="mt-4">
            {displayedApps.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-border/50 my-6 bg-card/40">
                <div className="mx-auto size-14 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground/60 mb-3">
                  <Package size={28} />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">
                  {searchQuery ? t('marketplace.noSearchResults', { query: searchQuery }) : t('marketplace.emptySearchTitle')}
                </h3>
                <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
                  {t('marketplace.emptyHint')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-xl text-xs font-bold"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("");
                    setStatusFilter("ALL");
                    setPriceFilter("ALL");
                    setFilters({});
                    setDisplayCount(DISPLAY_INCREMENT);
                  }}
                >
                  <X size={13} />
                  {t('marketplace.clearAllFilters')}
                </Button>
              </div>
            ) : selectedCategory ? (
              /* Flat layout when a specific category is selected */
              <div className="mt-4">
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
                    {displayedApps.map((app) => (
                      <AppCard
                        key={app.id}
                        app={app}
                        variant="default"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {displayedApps.map((app) => (
                      <AppCard
                        key={app.id}
                        app={app}
                        variant="horizontal"
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Grouped layout when viewing all categories */
              <div className="space-y-7 mt-4">
                {groupAppsBySidebarSections(displayedApps).map((section) => (
                  <div key={section.id}>
                    <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-border/25">
                      <div className="flex items-center gap-2">
                        <Layers3 size={15} className="text-primary" />
                        <h3 className="text-sm font-bold text-foreground">{t(section.labelKey)}</h3>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground tabular-nums">
                          {section.apps.length}
                        </span>
                      </div>
                    </div>

                    {viewMode === "grid" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
                        {section.apps.map((app) => (
                          <AppCard
                            key={app.id}
                            app={app}
                            variant="default"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {section.apps.map((app) => (
                          <AppCard
                            key={app.id}
                            app={app}
                            variant="horizontal"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div ref={sentinelRef} className={hasMoreApps ? "h-6" : "hidden"} />
            {!hasMoreApps && displayedApps.length > 0 && (
              <p className="mt-10 text-center text-xs text-muted-foreground/60">{t('marketplace.allLoaded')}</p>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={!!confirmUninstallApp} onOpenChange={(o) => !o && setConfirmUninstallApp(null)}>
        {confirmUninstallApp && (
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-destructive/10">
                <svg className="size-7 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
              </div>
              <AlertDialogTitle className="text-center">{t('marketplace.deactivateTitle', { name: confirmUninstallApp.name })}</AlertDialogTitle>
              <AlertDialogDescription className="text-center">{t('marketplace.deactivateConfirm')}<br />{t('marketplace.deactivateWarning')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3">
              <AlertDialogCancel className="rounded-xl" disabled={uninstallingApp === confirmUninstallApp.slug}>{t('marketplace.goBack')}</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleUninstall(confirmUninstallApp)} disabled={uninstallingApp === confirmUninstallApp.slug} className="rounded-xl bg-destructive hover:bg-destructive/90">
                {uninstallingApp === confirmUninstallApp.slug ? (
                  <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" />{t('marketplace.activating')}</span>
                ) : t('marketplace.confirmDeactivation')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}
