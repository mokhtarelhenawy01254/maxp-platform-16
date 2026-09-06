import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuthSimple";
import { toast } from "sonner";
import {
  Package, Loader2,
  Layers3, Sparkles, PackageX, X, Zap,
  Store, Users, MessageSquare, BarChart3, TrendingUp,
  DollarSign, Heart,
  ShoppingBag, Brain,
  LayoutGrid,
  Truck,
  CreditCard, Gamepad2, Palette, ClipboardList, Percent,
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
  CategoryBar,
  SectionSkeleton,
} from "@/components/marketplace";
import type { MarketplaceApp, Category, MarketplaceSpecialty, MarketplaceFilters, SortOption, ToolCollectionId } from "@/types/marketplace";
import {
  categoryGroups,
  OTHER_CATEGORY_GROUP_ID,
} from "@/utils/marketplace";

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

export default function MarketplaceV2() {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [collection, setCollection] = useState<ToolCollectionId>("ALL");
  const [uninstallingApp, setUninstallingApp] = useState<string | null>(null);
  const [confirmUninstallApp, setConfirmUninstallApp] = useState<MarketplaceApp | null>(null);
  const [showNotInstalled, setShowNotInstalled] = useState(false);
  const [filters, setFilters] = useState<MarketplaceFilters>({});
  const [displayCount, setDisplayCount] = useState(DISPLAY_INCREMENT);
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {};
      if (selectedCategory) params.category = selectedCategory;
      if (sortBy) params.sort = sortBy;
      params.page = 1;
      params.limit = MARKETPLACE_APPS_FETCH_LIMIT;

      const [appsRes, categoriesRes] = await Promise.all([
        apiClient.get<ApiEnvelope<MarketplaceApp[]>>("/marketplace/apps", { params }),
        apiClient.get<ApiEnvelope<Category[]>>("/marketplace/categories"),
      ]);

      setApps(appsRes.data.data);
      setCategories(categoriesRes.data.data);
    } catch {
      toast.error(t('marketplace.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, sortBy, t]);

  useEffect(() => { fetchData(); setDisplayCount(DISPLAY_INCREMENT); }, [fetchData]);

  const collectionFiltered = apps.filter(a => matchesCollection(a, collection));
  const searchFiltered = collectionFiltered.filter(a => matchesSearch(a, searchQuery));
  const filterFiltered = searchFiltered.filter(a => matchesFilters(a, filters));
  const filteredApps = showNotInstalled ? filterFiltered.filter(a => !a.isInstalled) : filterFiltered;
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

  const categoryDisplay = getCategoryDisplayCategories(categories);

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
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/30 bg-muted/30 px-3 py-1.5 text-[11px] font-bold text-foreground whitespace-nowrap">
                    <Package size={13} className="text-primary" />
                    <span className="tabular-nums">{apps.length}</span>
                    <span className="text-muted-foreground">{t('marketplace.totalApps')}</span>
                  </span>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={t('marketplace.searchPlaceholder')}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <CategorySidebar
                    isMobile
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelect={handleCategorySelect}
                    className="lg:hidden"
                  />
                  <Button
                    variant={showNotInstalled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowNotInstalled(!showNotInstalled)}
                    className="h-9 gap-1.5 rounded-xl text-xs font-bold"
                  >
                    <PackageX size={13} />
                    {t('marketplace.notInstalled')}
                  </Button>
                </div>
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
                  {(searchQuery || selectedCategory || filters || showNotInstalled) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 rounded-xl"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("");
                        setCollection("ALL");
                        setShowNotInstalled(false);
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
