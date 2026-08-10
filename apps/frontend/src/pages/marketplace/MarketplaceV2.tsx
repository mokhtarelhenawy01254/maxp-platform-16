import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import {
  Package, Loader2,
  Layers3, Sparkles, CheckCircle2, X, Zap,
  Store, Users, MessageSquare, BarChart3, TrendingUp,
  DollarSign, Grid3X3, Star, Heart,
  ShoppingBag, Brain,
  LayoutGrid,
  Truck,
  CreditCard, Gamepad2, Palette, ClipboardList, Percent,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  FilterSidebar,
  CategorySidebar,
  CategoryBar,
  SectionSkeleton,
} from "@/components/marketplace";
import type { MarketplaceApp, Category, MarketplaceSpecialty, MarketplaceFilters, SortOption, ToolCollectionId } from "@/types/marketplace";
import {
  appIconsBySlug, categoryIcons, appIcons,
  normalizeRequiredApps,
  categoryGroups,
  OTHER_CATEGORY_GROUP_ID,
} from "@/utils/marketplace";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  specialty?: MarketplaceSpecialty | null;
  message?: string;
}

interface InstallResponseData {
  autoInstalledRequiredApps?: Array<{ slug: string; name?: string }>;
}

interface MarketplaceApiError {
  response?: {
    status?: number;
    data?: { message?: string; requiredApps?: Array<{ name?: string; slug?: string }> };
  };
}

const MARKETPLACE_APPS_FETCH_LIMIT = 200;
const DISPLAY_INCREMENT = 20;

const collections = [
  { id: "ALL" as ToolCollectionId, labelKey: "marketplace.allTools", icon: Grid3X3 },
  { id: "FEATURED" as ToolCollectionId, labelKey: "marketplace.featured", icon: Sparkles },
];

const sortOptions: Array<{ value: SortOption; labelKey: string }> = [
  { value: "featured", labelKey: "marketplace.sortFeatured" },
  { value: "newest", labelKey: "marketplace.sortNewest" },
  { value: "price_low", labelKey: "marketplace.sortPriceLow" },
  { value: "price_high", labelKey: "marketplace.sortPriceHigh" },
  { value: "rating", labelKey: "marketplace.sortRating" },
  { value: "installs", labelKey: "marketplace.sortInstalls" },
  { value: "updated", labelKey: "marketplace.sortUpdated" },
];

function getDefaultPricingModel(app: MarketplaceApp) {
  if (app.pricingModel === "FREE") return "FREE";
  if (app.pricingModel === "PAY_PER_USE") return "PAY_PER_USE";
  return "SUBSCRIPTION";
}

function matchesCollection(app: MarketplaceApp, col: ToolCollectionId) {
  if (col === "ALL") return true;
  if (col === "FEATURED") return app.isFeatured;
  return true;
}

function matchesFilters(app: MarketplaceApp, filters: MarketplaceFilters) {
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

interface AppGroupSection {
  id: string;
  labelKey: string;
  apps: MarketplaceApp[];
}

function groupAppsBySidebarSections(apps: MarketplaceApp[]): AppGroupSection[] {
  const byGroup = new Map<string, MarketplaceApp[]>();
  const other: MarketplaceApp[] = [];
  for (const app of apps) {
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

function getCategoryDisplayCategories(categories: Category[]) {
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
  return categories.map(c => ({
    id: c.category,
    name: c.name,
    icon: categoryIconsMap[c.category] || Package,
  }));
}

function sortAppsByDependencies(apps: MarketplaceApp[]) {
  const bySlug = new Map(apps.map(a => [a.slug, a]));
  const ordered: MarketplaceApp[] = [];
  const visiting = new Set<string>(), visited = new Set<string>();
  const visit = (app: MarketplaceApp) => {
    if (visited.has(app.slug)) return;
    if (visiting.has(app.slug)) { ordered.push(app); visited.add(app.slug); return; }
    visiting.add(app.slug);
    normalizeRequiredApps(app.requiredApps).forEach(slug => { const d = bySlug.get(slug); if (d) visit(d); });
    visiting.delete(app.slug); visited.add(app.slug); ordered.push(app);
  };
  apps.forEach(visit);
  return ordered.filter((a, i, c) => c.findIndex(x => x.slug === a.slug) === i);
}

export default function MarketplaceV2() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [collection, setCollection] = useState<ToolCollectionId>("ALL");
  const [installingApp, setInstallingApp] = useState<string | null>(null);
  const [uninstallingApp, setUninstallingApp] = useState<string | null>(null);
  const [showPricingDialog, setShowPricingDialog] = useState<MarketplaceApp | null>(null);
  const [confirmUninstallApp, setConfirmUninstallApp] = useState<MarketplaceApp | null>(null);
  const [activeSpecialty, setActiveSpecialty] = useState<MarketplaceSpecialty | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showInstalled, setShowInstalled] = useState(false);
  const [isInstallingAll, setIsInstallingAll] = useState(false);
  const [confirmBulkInstall, setConfirmBulkInstall] = useState(false);
  const [filters, setFilters] = useState<MarketplaceFilters>({});
  const [displayCount, setDisplayCount] = useState(DISPLAY_INCREMENT);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [compareList, setCompareList] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const q = searchParams.get("q"); const c = searchParams.get("category"); const s = searchParams.get("sort");
    if (q) setSearchQuery(q); if (c) setSelectedCategory(c); if (s) setSortBy(s as SortOption);
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (selectedCategory) p.set("category", selectedCategory);
    if (searchQuery) p.set("q", searchQuery);
    if (sortBy && sortBy !== "featured") p.set("sort", sortBy);
    setSearchParams(p, { replace: true });
  }, [selectedCategory, searchQuery, sortBy, setSearchParams]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {};
      if (selectedCategory) params.category = selectedCategory;
      if (debouncedSearch) params.search = debouncedSearch;
      if (sortBy) params.sort = sortBy;
      params.page = 1;
      params.limit = MARKETPLACE_APPS_FETCH_LIMIT;

      const [appsRes, categoriesRes] = await Promise.all([
        apiClient.get<ApiEnvelope<MarketplaceApp[]>>("/marketplace/apps", { params }),
        apiClient.get<ApiEnvelope<Category[]>>("/marketplace/categories"),
      ]);

      setApps(appsRes.data.data);
      setCategories(categoriesRes.data.data);
      setActiveSpecialty(appsRes.data.specialty || categoriesRes.data.specialty || null);
    } catch {
      toast.error(t('marketplace.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, sortBy, t]);

  useEffect(() => { fetchData(); setDisplayCount(DISPLAY_INCREMENT); }, [fetchData]);

  const collectionFiltered = apps.filter(a => matchesCollection(a, collection));
  const filterFiltered = collectionFiltered.filter(a => matchesFilters(a, filters));
  const filteredApps = showInstalled ? filterFiltered.filter(a => a.isInstalled) : filterFiltered;
  const displayedApps = filteredApps.slice(0, displayCount);
  const installedCount = apps.filter(a => a.isInstalled).length;

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

  const markInstalled = (slugs: string[]) => {
    if (!slugs.length) return;
    const s = new Set(slugs);
    setApps(prev => prev.map(a => s.has(a.slug) ? { ...a, isInstalled: true, installCount: a.isInstalled ? a.installCount : a.installCount + 1 } : a));
  };

  const executeInstall = async (app: MarketplaceApp, pricingModel: string) => {
    try {
      setInstallingApp(app.slug);
      const res = await apiClient.post<ApiEnvelope<InstallResponseData>>(`/marketplace/apps/${app.slug}/install`, { pricingModel });
      const auto = res.data.data?.autoInstalledRequiredApps ?? [];
      const names = auto.map((a: { name?: string; slug: string }) => a.name || a.slug);
      toast.success(names.length > 0 ? t('marketplace.activatedWithReqs', { name: app.name, reqs: names.join(", ") }) : t('marketplace.activatedSingle', { name: app.name }));
      markInstalled([app.slug, ...auto.map((a: { slug: string }) => a.slug)]);
    } catch (error: unknown) {
      const e = error as MarketplaceApiError;
      if (e.response?.status === 401) { toast.error(t('marketplace.pleaseLogin')); navigate("/auth/login"); return; }
      toast.error(e.response?.data?.message || t('marketplace.activationError'));
    } finally { setInstallingApp(null); }
  };

  const handleUninstall = async (app: MarketplaceApp) => {
    try {
      setUninstallingApp(app.slug);
      const res = await apiClient.post(`/marketplace/apps/${app.slug}/uninstall`);
      toast.success(res.data.message || t('marketplace.deactivatedSuccess', { name: app.name }));
      setApps(prev => prev.map(a => a.slug === app.slug ? { ...a, isInstalled: false } : a));
      setConfirmUninstallApp(null);
    } catch (error: unknown) {
      const e = error as MarketplaceApiError;
      if (e.response?.status === 401) { toast.error(t('marketplace.pleaseLogin')); return; }
      toast.error(e.response?.data?.message || t('marketplace.deactivationError'));
    } finally { setUninstallingApp(null); }
  };

  const handleQuickInstall = (e: React.MouseEvent, app: MarketplaceApp) => {
    e.stopPropagation();
    e.preventDefault();
    if (app.isInstalled && app.pricingModel !== "PAY_PER_USE") return;
    if (app.pricingModel === "FREE" || (app.pricingModel === "SUBSCRIPTION" && app.monthlyPrice === 0)) {
      executeInstall(app, app.pricingModel);
    } else {
      setShowPricingDialog(app);
    }
  };

  const handleInstallAll = async () => {
    const uninstalled = sortAppsByDependencies(collectionFiltered).filter(a => !a.isInstalled);
    if (!uninstalled.length) { toast.success(t('marketplace.allActivated')); setConfirmBulkInstall(false); return; }
    setIsInstallingAll(true);
    let ok = 0, fail = 0;
    const tid = toast.loading(t('marketplace.activatingProgress', { name: "", progress: 0 }));
    for (let i = 0; i < uninstalled.length; i++) {
      const app = uninstalled[i];
      try {
        toast.loading(t('marketplace.activatingProgress', { name: app?.name, progress: Math.round(((i + 1) / uninstalled.length) * 100) }), { id: tid });
        const res = await apiClient.post<ApiEnvelope<InstallResponseData>>(`/marketplace/apps/${app.slug}/install`, { pricingModel: getDefaultPricingModel(app) });
        const auto = res.data.data?.autoInstalledRequiredApps ?? [];
        markInstalled([app.slug, ...auto.map((a: { slug: string }) => a.slug)]);
        ok++;
      } catch { fail++; }
    }
    toast.success(fail === 0 ? t('marketplace.activatedSuccess', { count: ok }) : t('marketplace.activatedWithErrors', { count: ok, fail }), { id: tid });
    setIsInstallingAll(false);
    setConfirmBulkInstall(false);
  };

  const toggleWishlist = (app: MarketplaceApp) => {
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(app.slug)) next.delete(app.slug);
      else next.add(app.slug);
      return next;
    });
  };

  const toggleCompare = (app: MarketplaceApp) => {
    setCompareList(prev => {
      const next = new Set(prev);
      if (next.has(app.slug)) next.delete(app.slug);
      else if (next.size >= 4) { toast.error(t('marketplace.maxCompareReached')); return prev; }
      else next.add(app.slug);
      return next;
    });
  };

  const categoryDisplay = getCategoryDisplayCategories(categories);
  const currentSortLabel = sortOptions.find(o => o.value === sortBy)?.labelKey || "marketplace.sortFeatured";

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category === selectedCategory ? "" : category);
    setDisplayCount(DISPLAY_INCREMENT);
  };

  return (
    <div className="min-h-screen bg-background">
      {loading ? (
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-6 pb-16">
          <div className="mt-8">
            <SectionSkeleton count={4} />
            <SectionSkeleton count={4} />
          </div>
        </div>
      ) : (
        <>
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pb-16">
            <div className="mp-stats-bar">
              <div className="mp-stat-item">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <Package size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('marketplace.totalApps')}</p>
                  <p className="text-lg font-extrabold text-foreground">{apps.length}</p>
                </div>
              </div>
              <div className="mp-stat-item">
                <div className="flex size-9 items-center justify-center rounded-xl bg-success/10 text-success shrink-0">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('marketplace.installedApps')}</p>
                  <p className="text-lg font-extrabold text-foreground">{installedCount}</p>
                </div>
              </div>
              <div className="mp-stat-item">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
                  <Star size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('marketplace.averageRating')}</p>
                  <p className="text-lg font-extrabold text-foreground">
                    {apps.filter(a => a.rating).length > 0
                      ? (apps.reduce((s, a) => s + (a.rating || 0), 0) / apps.filter(a => a.rating).length).toFixed(1)
                      : '--'}
                  </p>
                </div>
              </div>
              {activeSpecialty && (
                <div className="mp-stat-item">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-600 shrink-0">
                    <Layers3 size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('marketplace.specialtyLabel')}</p>
                    <p className="text-sm font-extrabold text-foreground truncate">{activeSpecialty.nameAr}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-start gap-5">
              <CategorySidebar
                categories={categories}
                selectedCategory={selectedCategory}
                onSelect={handleCategorySelect}
                className="sticky top-2 hidden lg:block w-64 shrink-0 max-h-[calc(100vh-1rem)] overflow-y-auto scrollbar-none"
              />
              <div className="flex-1 min-w-0">
            <div className="sticky top-0 z-40 py-3 bg-background/80 backdrop-blur-xl border-b border-border/10 mb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={t('marketplace.searchPlaceholder')}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as SortOption)}
                    className="h-9 rounded-xl border border-border/30 bg-muted/30 px-3 text-xs font-bold text-foreground focus:outline-none focus:border-primary/40 cursor-pointer"
                  >
                    {sortOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                    ))}
                  </select>
                  <CategorySidebar
                    isMobile
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelect={handleCategorySelect}
                    className="lg:hidden"
                  />
                  <Button
                    variant={showInstalled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowInstalled(!showInstalled)}
                    className="h-9 gap-1.5 rounded-xl text-xs font-bold"
                  >
                    <CheckCircle2 size={13} />
                    {t('marketplace.installed')}
                  </Button>
                  <FilterSidebar
                    isMobile
                    filters={filters}
                    onFiltersChange={setFilters}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2.5 overflow-x-auto scrollbar-none pb-0.5">
                {collections.map(c => {
                  const ColIcon = c.icon;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setCollection(c.id); setDisplayCount(DISPLAY_INCREMENT); }}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold whitespace-nowrap transition-all duration-200 shrink-0",
                        collection === c.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <ColIcon size={12} />
                      {t(c.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 lg:hidden overflow-x-auto scrollbar-none pb-1">
              <CategoryBar categories={categoryDisplay} selectedCategory={selectedCategory} onSelect={handleCategorySelect} />
            </div>

            <div className="mt-4 space-y-1">
              {displayedApps.length === 0 ? (
                <div className="mp-empty-state">
                  <div className="mp-empty-ilustration">
                    <Package size={36} className="text-muted-foreground/40" />
                  </div>
                  <h3 className="text-lg font-extrabold text-foreground mb-1">
                    {searchQuery ? t('marketplace.noSearchResults', { query: searchQuery }) : t('marketplace.emptySearchTitle')}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md">
                    {t('marketplace.emptyHint')}
                  </p>
                  {(searchQuery || selectedCategory || filters) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 rounded-xl"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("");
                        setCollection("ALL");
                        setShowInstalled(false);
                        setFilters({});
                        setDisplayCount(DISPLAY_INCREMENT);
                      }}
                    >
                      <X size={14} />
                      {t('marketplace.clearAllFilters')}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="mp-section-header-v2 mt-2">
                    <div className="flex items-center gap-2">
                      <LayoutGrid size={17} className="text-primary" />
                      <h2 className="text-base font-extrabold text-foreground tracking-tight">
                        {selectedCategory
                          ? categories.find(c => c.category === selectedCategory)?.name
                          : debouncedSearch
                            ? t('marketplace.noSearchResults', { query: debouncedSearch })
                            : t('marketplace.allTools')}
                      </h2>
                      <span className="mp-section-count-v2">{filteredApps.length}</span>
                    </div>
                    {compareList.size > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 rounded-lg text-xs font-bold"
                        onClick={() => navigate(`/marketplace/compare?apps=${[...compareList].join(',')}`)}
                      >
                        <BarChart3 size={12} />
                        {t('marketplace.compareApps')} ({compareList.size})
                      </Button>
                    )}
                  </div>

                  {groupAppsBySidebarSections(displayedApps).map((section) => (
                    <div key={section.id} className="mt-6">
                      <div className="mp-section-header-v2 mb-3">
                        <div className="flex items-center gap-2">
                          <Layers3 size={16} className="text-primary" />
                          <h3 className="text-sm font-extrabold text-foreground tracking-tight">{t(section.labelKey)}</h3>
                          <span className="mp-section-count-v2">{section.apps.length}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {section.apps.map((app, i) => (
                          <div
                            key={app.id}
                            className="mp-stagger"
                            style={{ animationDelay: `${(i % 20) * 40}ms`, animationFillMode: "backwards" }}
                          >
                            <AppCard
                              app={app}
                              variant="default"
                              installingApp={installingApp}
                              uninstallingApp={uninstallingApp}
                              onQuickInstall={handleQuickInstall}
                              onUninstall={(a) => setConfirmUninstallApp(a)}
                              onAddToWishlist={toggleWishlist}
                              onCompare={toggleCompare}
                              isInWishlist={wishlist.has(app.slug)}
                              isInCompare={compareList.has(app.slug)}
                              showBadges
                          showRating
                          showInstalls
                          showDescription
                          showTags
                          animationDelay={i * 40}
                        />
                      </div>
                    ))}
                      </div>
                    </div>
                  ))}

                  <div ref={sentinelRef} className={hasMoreApps ? "h-4" : "hidden"} />
                  {!hasMoreApps && displayedApps.length > 0 && (
                    <p className="mt-8 text-center text-xs text-muted-foreground">{t('marketplace.allLoaded')}</p>
                  )}
                </>
              )}
            </div>
              </div>
            </div>
          </div>
        </>
      )}

      <Dialog open={!!showPricingDialog} onOpenChange={(o) => !o && setShowPricingDialog(null)}>
        {showPricingDialog && (() => {
          const PricingBrandIcon = showPricingDialog.slug ? appIconsBySlug[showPricingDialog.slug] : undefined;
          const pricingIconKey = showPricingDialog.icon?.trim().toLowerCase();
          const PricingIcon = pricingIconKey ? appIcons[pricingIconKey] : undefined;
          const Icon = PricingIcon || categoryIcons[showPricingDialog.category] || Package;
          return (
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl border bg-primary/10 text-primary shadow-sm">
                    {showPricingDialog.logo ? (
                      <img src={showPricingDialog.logo} alt={showPricingDialog.name} className="size-full object-cover" loading="lazy" />
                    ) : PricingBrandIcon ? <PricingBrandIcon className="size-7" /> : <Icon size={26} />}
                  </div>
                  <div>
                    <DialogTitle className="text-lg">{showPricingDialog.name}</DialogTitle>
                    <DialogDescription>{t('marketplace.choosePricing')}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className={cn("relative w-full justify-between rounded-xl p-4 text-right h-auto border-border/60", showPricingDialog.isInstalled && showPricingDialog.activePricingModel === "SUBSCRIPTION" && "border-primary bg-primary/5")}
                  onClick={() => { executeInstall(showPricingDialog, "SUBSCRIPTION"); setShowPricingDialog(null); }}
                  disabled={showPricingDialog.isInstalled && showPricingDialog.activePricingModel === "SUBSCRIPTION"}
                >
                  <span className="font-bold text-sm">{t('marketplace.monthlySubscription')}</span>
                  <span className="font-bold text-primary">{(showPricingDialog.monthlyPrice ?? 0) > 0 ? t('marketplace.monthlyPrice', { price: showPricingDialog.monthlyPrice }) : t('marketplace.freePrice')}</span>
                </Button>
                {showPricingDialog.pricingModel === "PAY_PER_USE" && (
                  <Button
                    variant="outline"
                    className={cn("relative w-full justify-between rounded-xl p-4 text-right h-auto border-border/60", showPricingDialog.isInstalled && showPricingDialog.activePricingModel === "PAY_PER_USE" && "border-warning bg-warning/5")}
                    onClick={() => { executeInstall(showPricingDialog, "PAY_PER_USE"); setShowPricingDialog(null); }}
                    disabled={showPricingDialog.isInstalled && showPricingDialog.activePricingModel === "PAY_PER_USE"}
                  >
                    <span className="flex items-center gap-1 font-bold text-sm">{t('marketplace.payPerUseLabel')}<Zap size={14} className="fill-current text-warning" /></span>
                    <span className="font-bold text-warning">{showPricingDialog.unitPrice ?? 0} {t('marketplace.currencyUnit')} / {showPricingDialog.unitName || t('marketplace.perUnit')}</span>
                  </Button>
                )}
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>

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

      <AlertDialog open={confirmBulkInstall} onOpenChange={setConfirmBulkInstall}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10">
              <Zap className="size-7 text-primary" />
            </div>
            <AlertDialogTitle className="text-center">
              {t('marketplace.bulkActivateTitle', { count: collectionFiltered.filter(a => !a.isInstalled).length })}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {t('marketplace.bulkActivateConfirm', { count: collectionFiltered.filter(a => !a.isInstalled).length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl" disabled={isInstallingAll}>{t('marketplace.goBack')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleInstallAll(); }}
              disabled={isInstallingAll}
              className="rounded-xl"
            >
              {isInstallingAll ? (
                <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" />{t('marketplace.activatingNow')}</span>
              ) : t('marketplace.activateAll')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
