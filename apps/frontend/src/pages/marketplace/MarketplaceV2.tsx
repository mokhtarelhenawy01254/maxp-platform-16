import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import {
  Search, Package, Loader2, Crown,
  Layers3, Sparkles, CheckCircle2, X, Zap,
  Store, Users, MessageSquare, BarChart3, TrendingUp,
  DollarSign, Grid3X3, Star, Heart,
  Bot, Camera, Megaphone, ShoppingCart, PackageOpen,
  ClipboardList, Route, ClipboardCheck, Inbox, Bell,
  Calendar, Truck, FileText, Percent,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";
import { tokenManager } from "../../utils/tokenManager";
import { getApiUrl } from "../../config/environment";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getMarketplaceFeatureItems } from "./featureCatalog";
import { FacebookIcon } from "../../components/icons/brands";

interface MarketplaceApp {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  category: string;
  description: string;
  icon?: string;
  coverImage?: string;
  pricingModel: string;
  unitPrice?: number;
  unitName?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  trialDays: number;
  features: Record<string, unknown> | unknown[];
  positioning?: Record<string, unknown> | null;
  isActive: boolean;
  isInstalled?: boolean;
  activePricingModel?: string;
  isFeatured: boolean;
  isPopular: boolean;
  installCount: number;
  rating?: number;
  reviewCount: number;
  requiredApps?: string[] | string | null;
  _count?: { installations: number; reviews: number };
}

interface Category {
  category: string;
  name: string;
  nameEn: string;
  icon: string;
  count: number;
}

interface MarketplaceSpecialty {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  icon?: string | null;
}

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

// ponytail: UNLIMITED_SUBSCRIPTION_PRICE removed — unlimited plan system deleted
const MARKETPLACE_APPS_FETCH_LIMIT = 200;

const categoryIcons: Record<string, LucideIcon> = {
  ECOMMERCE: Store,
  HR: Users,
  COMMUNICATION: MessageSquare,
  CRM: BarChart3,
  ANALYTICS: TrendingUp,
  INTEGRATION: Zap,
  PRODUCTIVITY: Package,
  FINANCE: DollarSign,
  MARKETING: Sparkles,
  MEDICAL: Heart,
};

const appIcons: Record<string, LucideIcon> = {
  megaphone: Megaphone,
  "chart-bar": BarChart3,
  bot: Bot,
  store: Store,
  users: Users,
  sparkles: Sparkles,
  "shopping-cart": ShoppingCart,
  camera: Camera,
  "package-open": PackageOpen,
  "clipboard-list": ClipboardList,
  route: Route,
  "clipboard-check": ClipboardCheck,
  inbox: Inbox,
  bell: Bell,
  calendar: Calendar,
  heart: Heart,
  package: Package,
  truck: Truck,
  "file-text": FileText,
  percent: Percent,
};

const brandIconsBySlug: Record<string, React.ElementType> = {
  "facebook-ads-pro": FacebookIcon,
};

type ViewMode = "grid" | "compact";
type ToolCollectionId = "ALL" | "CORE" | "ADD_ONS" | "FREE" | "PAID";

function shouldUseTextIcon(icon?: string) {
  const n = icon?.trim();
  if (!n) return false;
  return Array.from(n).length <= 3 && !/^[a-z0-9_\-\s]+$/i.test(n);
}

function isAddOnApp(app: MarketplaceApp) {
  const r = app.requiredApps;
  if (Array.isArray(r)) return r.filter(Boolean).length > 0;
  if (typeof r === "string") {
    try { return JSON.parse(r).filter(Boolean).length > 0; } catch { return r.split(",").filter(Boolean).length > 0; }
  }
  return false;
}

function matchesCollection(app: MarketplaceApp, col: ToolCollectionId) {
  if (col === "ALL") return true;
  if (col === "CORE") return !isAddOnApp(app);
  if (col === "ADD_ONS") return isAddOnApp(app);
  if (col === "FREE") return app.pricingModel === "FREE";
  if (col === "PAID") return app.pricingModel !== "FREE";
  return true;
}

function normalizeRequiredApps(requiredApps: MarketplaceApp["requiredApps"]) {
  if (Array.isArray(requiredApps)) return requiredApps.map(a => String(a || "").trim()).filter(Boolean);
  if (typeof requiredApps === "string") {
    try { return JSON.parse(requiredApps).filter(Boolean); } catch { return requiredApps.split(",").map(a => a.trim()).filter(Boolean); }
  }
  return [];
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

function getDefaultPricingModel(app: MarketplaceApp) {
  if (app.pricingModel === "FREE") return "FREE";
  if (app.pricingModel === "PAY_PER_USE") return "PAY_PER_USE";
  return "SUBSCRIPTION";
}

const collections = [
  { id: "ALL" as ToolCollectionId, labelKey: "marketplace.allTools", icon: Grid3X3 },
  { id: "CORE" as ToolCollectionId, labelKey: "marketplace.coreTools", icon: Zap },
  { id: "ADD_ONS" as ToolCollectionId, labelKey: "marketplace.addOns", icon: Sparkles },
  { id: "FREE" as ToolCollectionId, labelKey: "marketplace.free", icon: CheckCircle2 },
  { id: "PAID" as ToolCollectionId, labelKey: "marketplace.paid", icon: Crown },
];

export default function MarketplaceV2() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [collection, setCollection] = useState<ToolCollectionId>("ALL");
  const [installingApp, setInstallingApp] = useState<string | null>(null);
  const [uninstallingApp, setUninstallingApp] = useState<string | null>(null);
  const [showPricingDialog, setShowPricingDialog] = useState<MarketplaceApp | null>(null);
  const [confirmUninstallApp, setConfirmUninstallApp] = useState<MarketplaceApp | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeSpecialty, setActiveSpecialty] = useState<MarketplaceSpecialty | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showInstalled, setShowInstalled] = useState(false);
  const [isInstallingAll, setIsInstallingAll] = useState(false);
  const [confirmBulkInstall, setConfirmBulkInstall] = useState(false);

  const DISPLAY_INCREMENT = 16;
  const [displayCount, setDisplayCount] = useState(DISPLAY_INCREMENT);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const q = searchParams.get("q"); const c = searchParams.get("category"); const s = searchParams.get("sort");
    if (q) setSearchQuery(q); if (c) setSelectedCategory(c); if (s) setSortBy(s);
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (selectedCategory) p.set("category", selectedCategory);
    if (searchQuery) p.set("q", searchQuery);
    if (sortBy && sortBy !== "featured") p.set("sort", sortBy);
    setSearchParams(p, { replace: true });
  }, [selectedCategory, searchQuery, sortBy, setSearchParams]);

  const collectionFiltered = apps.filter(a => matchesCollection(a, collection));
  const filteredApps = showInstalled ? collectionFiltered.filter(a => a.isInstalled) : collectionFiltered;
  const displayedApps = filteredApps.slice(0, displayCount);
  const installedCount = apps.filter(a => a.isInstalled).length;
  const featuredApps = useMemo(
    () => (!selectedCategory && !showInstalled ? filteredApps.filter(a => a.isFeatured) : []),
    [filteredApps, selectedCategory, showInstalled],
  );


  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const hasMoreApps = useMemo(() => filteredApps.length > displayCount, [filteredApps.length, displayCount]);
  useEffect(() => {
    if (!hasMoreApps) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setDisplayCount(p => p + DISPLAY_INCREMENT); }, { rootMargin: "400px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreApps]);

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

  const getRequiredAppNames = (app: MarketplaceApp) =>
    normalizeRequiredApps(app.requiredApps).map(slug => apps.find(a => a.slug === slug)?.name || slug);

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

// ponytail: handleSubscribeUnlimited removed — unlimited plan system deleted

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95">
      {/* Sticky filter bar — backdrop-blur, stays on scroll */}
      <div className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          {/* Search + Sort Toolbar */}
          <div className="relative flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                ref={searchRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('marketplace.searchPlaceholder')}
                className="h-11 w-full rounded-xl border-border/60 bg-background/80 pl-3 pr-10 text-sm backdrop-blur-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label={t('marketplace.clearSearch')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-3 text-sm backdrop-blur-sm shrink-0">
              <span className="text-xs text-muted-foreground shrink-0">{t('marketplace.sortLabel')}</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-transparent text-sm font-bold text-foreground focus:outline-none cursor-pointer"
              >
                <option value="featured">{t('marketplace.sortFeatured')}</option>
                <option value="popular">{t('marketplace.sortPopular')}</option>
                <option value="newest">{t('marketplace.sortNewest')}</option>
                <option value="price_low">{t('marketplace.sortPriceLow')}</option>
              </select>
            </div>
            {/* Activate All CTA */}
            <Button
              size="sm"
              onClick={() => setConfirmBulkInstall(true)}
              disabled={isInstallingAll || !collectionFiltered.some(a => !a.isInstalled)}
              className="h-11 gap-1.5 rounded-xl px-4 text-sm font-bold shrink-0 shadow-sm"
            >
              {isInstallingAll ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {t('marketplace.activateAll')}
            </Button>
          </div>

          {/* Filter Pills — collections + categories merged */}
          <div className="relative flex gap-2 overflow-x-auto pb-3 scrollbar-none" style={{ scrollbarWidth: "none" }}>
            {collections.map(c => (
              <button
                key={c.id}
                onClick={() => { setCollection(c.id); setSelectedCategory(""); setDisplayCount(DISPLAY_INCREMENT); }}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 border",
                  collection === c.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background/60 text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground hover:bg-accent/50"
                )}
              >
                <c.icon size={13} />
                {t(c.labelKey)}
              </button>
            ))}
            <button
              onClick={() => { setShowInstalled(!showInstalled); setDisplayCount(DISPLAY_INCREMENT); }}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 border",
                showInstalled
                  ? "bg-success/10 text-success border-success/30 shadow-sm"
                  : "bg-background/60 text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground hover:bg-accent/50"
              )}
            >
              <CheckCircle2 size={13} />
              {t('marketplace.installedApps')}
            </button>
            <span className="mx-1 h-6 w-px bg-border/50 self-center" />
            <button
              onClick={() => { setSelectedCategory(""); setCollection("ALL"); }}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 border",
                selectedCategory === "" && collection === "ALL" ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground hover:bg-accent/50"
              )}
            >
              {t('marketplace.allTools')}
            </button>
            {categories.map(cat => {
              const CatIcon = categoryIcons[cat.category];
              return (
                <button
                  key={cat.category}
                  onClick={() => { setSelectedCategory(cat.category); setCollection("ALL"); setDisplayCount(DISPLAY_INCREMENT); }}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 border",
                    selectedCategory === cat.category ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  {CatIcon && <CatIcon size={12} />}
                  {cat.name}
                </button>
              );
            })}
            <span className="mx-1 h-6 w-px bg-border/50 self-center" />
            <Link
              to="/marketplace/themes"
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold text-muted-foreground border border-border/50 hover:border-primary/30 hover:text-foreground hover:bg-accent/50 transition-all duration-200"
            >
              <Package size={13} />
              {t('sidebar.storeThemes')}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        {/* Header Hero */}
        <div className="relative mb-6 overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-card via-card to-primary/[0.04] p-5 sm:p-6 shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(120,120,255,0.08),transparent_50%),radial-gradient(ellipse_at_80%_100%,rgba(255,120,200,0.05),transparent_50%)]" />
          <div className="relative">
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2 flex-wrap">
              <span className="flex items-center gap-1.5 font-bold text-foreground/80">
                <Package size={14} className="text-primary" />
                {t('marketplace.appCount', { count: apps.length })}
              </span>
              <span className="text-border">•</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-success" />
                {t('marketplace.installedCount', { count: installedCount })}
              </span>
              {activeSpecialty && (
                <>
                  <span className="text-border">•</span>
                  <Badge variant="outline" className="gap-1 border px-2 py-0.5 font-bold text-xs">
                    <Layers3 size={12} />
                    {activeSpecialty.nameAr}
                  </Badge>
                </>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t('marketplace.pageTitle')}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground leading-relaxed">
              {t('marketplace.pageSubtitle')}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card px-3.5 py-3 shadow-sm">
                <Skeleton className="size-10 shrink-0 rounded-xl" />
                <Skeleton className="h-4 flex-1 rounded-md" />
                <Skeleton className="h-7 w-16 shrink-0 rounded-lg" />
              </div>
            ))}
          </div>
        ) : displayedApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-muted">
              <Package size={40} className="text-muted-foreground" />
            </div>
            <p className="text-lg font-bold text-foreground">
              {searchQuery ? t('marketplace.noSearchResults', { query: searchQuery }) : t('marketplace.noTools')}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{t('marketplace.emptyHint')}</p>
            {(searchQuery || selectedCategory || collection !== "ALL" || showInstalled) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-1.5 rounded-xl"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("");
                  setCollection("ALL");
                  setShowInstalled(false);
                  setDisplayCount(DISPLAY_INCREMENT);
                }}
              >
                <X size={14} />
                {t('marketplace.clearFilters')}
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Featured Section — uniform grid, no bento gaps */}
            {featuredApps.length >= 2 && (
              <div className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" />
                    <h2 className="text-base font-bold text-foreground">
                      {t('marketplace.featured')}
                    </h2>
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 font-bold border-primary/30 text-primary">
                      {featuredApps.length}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                  {featuredApps.slice(0, 4).map((app, i) => (
                    <div
                      key={app.id}
                      className="flex h-full motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 duration-500"
                      style={{ animationDelay: `${(i % 20) * 40}ms`, animationFillMode: "backwards" }}
                    >
                      <AppCardV2
                        app={app}
                        installingApp={installingApp}
                        uninstallingApp={uninstallingApp}
                        onQuickInstall={handleQuickInstall}
                        onUninstall={(a) => setConfirmUninstallApp(a)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Apps Grid */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">
                {selectedCategory
                  ? categories.find(c => c.category === selectedCategory)?.name
                  : t(collections.find(c => c.id === collection)?.labelKey || "marketplace.allTools")}
                <span className="mr-1.5 text-sm font-normal text-muted-foreground/60">
                  ({displayedApps.filter(a => !a.isFeatured || !!selectedCategory).length})
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {displayedApps.filter(a => !a.isFeatured || !!selectedCategory).map((app, i) => (
                <div key={app.id} className="flex h-full motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 duration-500" style={{ animationDelay: `${(i % 20) * 40}ms`, animationFillMode: "backwards" }}>
                  <AppCardV2
                    app={app}
                    installingApp={installingApp}
                    uninstallingApp={uninstallingApp}
                    onQuickInstall={handleQuickInstall}
                    onUninstall={(a) => setConfirmUninstallApp(a)}
                  />
                </div>
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className={hasMoreApps ? "h-4" : "hidden"} />

            {!hasMoreApps && displayedApps.length > 0 && (
              <div className="mt-8 text-center text-xs text-muted-foreground">{t('marketplace.allLoaded')}</div>
            )}
          </>
        )}
      </div>

      {/* Pricing Dialog */}
      <Dialog open={!!showPricingDialog} onOpenChange={(o) => !o && setShowPricingDialog(null)}>
        {showPricingDialog && (() => {
          const PricingBrandIcon = showPricingDialog.slug ? brandIconsBySlug[showPricingDialog.slug] : undefined;
          const pricingIconKey = showPricingDialog.icon?.trim().toLowerCase();
          const PricingIcon = pricingIconKey ? appIcons[pricingIconKey] : undefined;
          const Icon = PricingIcon || categoryIcons[showPricingDialog.category] || Package;
          return (
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-2xl border bg-primary/10 text-primary shadow-sm">
                    {PricingBrandIcon ? <PricingBrandIcon className="size-7" /> : <Icon size={26} />}
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

      {/* Uninstall Confirmation */}
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

      {/* Bulk Install Confirmation */}
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

/* ─── App Card (compact) ─── */
function AppCardV2({ app, installingApp, uninstallingApp, onQuickInstall, onUninstall }: {
  app: MarketplaceApp;
  installingApp: string | null;
  uninstallingApp: string | null;
  onQuickInstall: (e: React.MouseEvent, app: MarketplaceApp) => void;
  onUninstall: (app: MarketplaceApp) => void;
}) {
  const { t } = useTranslation();
  const BrandIcon = app.slug ? brandIconsBySlug[app.slug] : undefined;
  const appIconKey = app.icon?.trim().toLowerCase();
  const AppIcon = appIconKey ? appIcons[appIconKey] : undefined;
  const Icon = AppIcon || categoryIcons[app.category] || Package;
  const textIcon = shouldUseTextIcon(app.icon) ? app.icon?.trim() : null;

  const [previewOpen, setPreviewOpen] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>();

  const features = useMemo(() => getMarketplaceFeatureItems(app), [app]);
  const requiredApps = useMemo(() => normalizeRequiredApps(app.requiredApps), [app.requiredApps]);

  const showPreview = useCallback(() => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setPreviewOpen(true), 350);
  }, []);
  const hidePreview = useCallback(() => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setPreviewOpen(false), 150);
  }, []);

  const getPrice = (a: MarketplaceApp) => {
    if (a.pricingModel === "FREE") return t('marketplace.freePrice');
    if (a.pricingModel === "PAY_PER_USE") return a.unitPrice ? `${a.unitPrice} ${t('marketplace.currencyUnit')}${t('marketplace.perUnit')}` : t('marketplace.payPerUse');
    if (a.monthlyPrice) return `${a.monthlyPrice} ${t('marketplace.currencyUnit')}${t('marketplace.perMonth')}`;
    return t('marketplace.contactUs');
  };

  return (
    <Popover open={previewOpen} onOpenChange={setPreviewOpen}>
      <div onMouseEnter={showPreview} onMouseLeave={hidePreview} onFocus={showPreview} onBlur={hidePreview} className="h-full">
        <PopoverTrigger asChild>
          <Link
            to={`/marketplace/${app.slug}`}
            aria-haspopup="dialog"
            aria-expanded={previewOpen}
            className="group relative flex h-full items-center gap-3 overflow-hidden rounded-2xl border border-border/40 bg-card px-3.5 py-3 shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {app.isInstalled && (
              <span className="absolute right-2.5 top-2.5 flex size-2 rounded-full bg-success ring-2 ring-background" />
            )}
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {BrandIcon ? <BrandIcon className="size-5" /> : textIcon ? <span className="text-lg">{textIcon}</span> : <Icon size={20} />}
            </div>
            <h3
              dir="auto"
              className="min-w-0 flex-1 text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors"
              style={{ unicodeBidi: 'plaintext' }}
              title={app.name}
            >
              {app.name}
            </h3>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs font-bold text-primary">{getPrice(app)}</span>
              {app.isInstalled ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 rounded-lg p-0 text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.preventDefault(); onUninstall(app); }}
                  disabled={uninstallingApp === app.slug}
                >
                  {uninstallingApp === app.slug ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-7 gap-1 rounded-lg px-2.5 text-xs font-bold"
                  onClick={(e) => onQuickInstall(e, app)}
                  disabled={installingApp === app.slug}
                >
                  {installingApp === app.slug ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Zap size={11} />
                  )}
                  {installingApp === app.slug ? t('marketplace.activatingNow') : t('marketplace.activate')}
                </Button>
              )}
            </div>
          </Link>
        </PopoverTrigger>

        <PopoverContent
          side="right"
          align="start"
          sideOffset={12}
          className="w-80 overflow-hidden rounded-xl border border-border bg-card p-0 shadow-xl"
          onMouseEnter={showPreview}
          onMouseLeave={hidePreview}
        >
          <div className="border-b border-border/40 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {BrandIcon ? <BrandIcon className="size-5" /> : textIcon || <Icon size={20} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4
                    dir="auto"
                    className="text-sm font-bold"
                    style={{ unicodeBidi: 'plaintext' }}
                    title={app.name}
                  >
                    {app.name}
                  </h4>
                  {app.rating ? (
                    <span className="flex shrink-0 items-center gap-0.5 text-xs text-amber-500">
                      <Star size={11} className="fill-current" />{app.rating}
                    </span>
                  ) : null}
                </div>
                <p
                  dir="auto"
                  className="mt-0.5 line-clamp-2 text-xs text-muted-foreground"
                  style={{ unicodeBidi: 'plaintext' }}
                  title={app.description}
                >
                  {app.description}
                </p>
              </div>
            </div>
          </div>

          {features.length > 0 && (
            <div className="border-b border-border/40 px-4 py-3">
              <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('marketplace.features')}</h5>
              <div className="space-y-1.5">
                {features.slice(0, 6).map(f => (
                  <div key={f.key} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-primary" />
                    <span>{f.name}</span>
                  </div>
                ))}
                {features.length > 6 && (
                  <p className="pt-1 text-xs text-muted-foreground">{t('marketplace.moreFeatures', { count: features.length - 6 })}</p>
                )}
              </div>
            </div>
          )}

          {requiredApps.length > 0 && (
            <div className="border-b border-border/40 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{t('marketplace.requires')}:</span>
                {requiredApps.map(slug => (
                  <Badge key={slug} variant="outline" className="px-1.5 py-0.5 text-xs">
                    {slug}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-4 pt-3">
            <div>
              <span className="text-sm font-bold text-primary">{getPrice(app)}</span>
              {app.trialDays > 0 && (
                <span className="mr-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">{t('marketplace.trialDays', { count: app.trialDays })}</span>
              )}
            </div>
            {app.isInstalled ? (
              <Badge variant="secondary" className="gap-1 text-xs">
                <CheckCircle2 size={10} />
                {t('marketplace.installed')}
              </Badge>
            ) : (
              <Button
                size="sm"
                className="h-8 gap-1 rounded-lg text-xs font-bold"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickInstall(e, app); }}
                disabled={installingApp === app.slug}
              >
                {installingApp === app.slug ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Zap size={11} />
                )}
                {installingApp === app.slug ? t('marketplace.activatingNow') : t('marketplace.activate')}
              </Button>
            )}
          </div>
        </PopoverContent>
      </div>
    </Popover>
  );
}
