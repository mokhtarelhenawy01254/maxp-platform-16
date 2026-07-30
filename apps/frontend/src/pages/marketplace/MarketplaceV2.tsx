import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import { Search, Package, Loader2, Crown, Layers3, Star, CheckCircle2, X, Zap, Store, Users, MessageSquare, BarChart, TrendingUp, DollarSign, Grid3X3, Heart, Bot, Camera, Volume2, ShoppingBag, PackageOpen, Clipboard, Route, Mail, Bell, Calendar, Truck, File, Percent, Clock, CreditCard, Monitor, Image, Server, HeartHandshake, Gift, GitBranch, Webhook, Activity, FileSpreadsheet, Award, Gamepad2 } from 'lucide-react';
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
import { WhatsAppIcon, TelegramIcon, FacebookIcon, InstagramIcon, MessengerIcon } from "../../components/icons/brands";

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

const appIconsBySlug: Record<string, React.ElementType> = {
  // ECOMMERCE
  "store-basic": Store,
  "store-pro": Store,
  "inventory-pro": Package,
  "woocommerce-sync": ShoppingBag,
  "order-core": ShoppingCart,
  "order-shipping-turbo": Truck,
  "order-shipping-reports": FileText,
  "order-invoicing": FileSpreadsheet,

  // HR
  "hr-core": Users,
  "hr-attendance-pro": Clock,
  "hr-payroll": CreditCard,
  "hr-assets": Monitor,
  "hr-recruitment": UserPlus,
  "kudos-recognition": Award,
  "gamification-pro": Gamepad2,

  // AI
  "ai-chat-basic": Bot,
  "ai-chat-pro": Bot,
  "ai-image-studio": Image,
  "ai-rag-knowledge": Database,
  "ai-inbox-bundle": Inbox,

  // COMMUNICATION
  "whatsapp-business": WhatsAppIcon,
  "telegram-business": TelegramIcon,
  "broadcast-pro": Megaphone,
  "messaging-bundle": Inbox,

  // CRM
  "crm-basic": HeartHandshake,
  "crm-loyalty": Gift,
  "opportunities-pipeline": GitBranch,

  // ANALYTICS
  "analytics-basic": BarChart3,
  "turbo-analytics": TrendingUp,

  // INTEGRATION / SCHEDULING
  "appointments-pro": Calendar,
  "smart-scheduler": Clock,
  "webhooks-pro": Webhook,

  // FACEBOOK
  "facebook-pages-connect": FacebookIcon,
  "facebook-pixel-capi": Activity,
  "facebook-ads-pro": FacebookIcon,
  "facebook-catalog-shop": ShoppingBag,

  // FINANCE
  "invoicing-pro": FileSpreadsheet,
  "wallet-system": Wallet,
};

/** CSS class that sets --cat-h/--cat-s/--cat-l/--cat-gradient for each category */
const categoryCssClass: Record<string, string> = {
  ECOMMERCE: "mp-cat-ecommerce",
  HR: "mp-cat-hr",
  COMMUNICATION: "mp-cat-communication",
  CRM: "mp-cat-crm",
  ANALYTICS: "mp-cat-analytics",
  INTEGRATION: "mp-cat-integration",
  PRODUCTIVITY: "mp-cat-productivity",
  FINANCE: "mp-cat-finance",
  MARKETING: "mp-cat-marketing",
  MEDICAL: "mp-cat-medical",
};

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

function getPrice(a: MarketplaceApp, t: (key: string) => string) {
  if (a.pricingModel === "FREE") return t('marketplace.freePrice');
  if (a.pricingModel === "PAY_PER_USE") return a.unitPrice ? `${a.unitPrice} ${t('marketplace.currencyUnit')}${t('marketplace.perUnit')}` : t('marketplace.payPerUse');
  if (a.monthlyPrice) return `${a.monthlyPrice} ${t('marketplace.currencyUnit')}${t('marketplace.perMonth')}`;
  return t('marketplace.contactUs');
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
  const [sortBy, setSortBy] = useState("featured");
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
    <div className="min-h-screen bg-background">
      {/* Sticky filter bar — glassmorphism header */}
      <div className="sticky top-0 z-50 border-b border-border/20 bg-background/75 backdrop-blur-2xl">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2.5 py-3">
            {/* Search row */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={16} />
                <Input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('marketplace.searchPlaceholder')}
                  className="h-11 w-full rounded-2xl border-border/30 bg-muted/30 pl-4 pr-10 text-sm shadow-sm focus:border-primary/40 focus:bg-background focus:shadow-md transition-all duration-200"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    aria-label={t('marketplace.clearSearch')}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <div className="flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-border/30 bg-muted/30 px-3 text-sm shadow-sm">
                <span className="text-xs text-muted-foreground/70 shrink-0">{t('marketplace.sortLabel')}</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="featured">{t('marketplace.sortFeatured')}</option>
                  <option value="popular">{t('marketplace.sortPopular')}</option>
                  <option value="newest">{t('marketplace.sortNewest')}</option>
                  <option value="price_low">{t('marketplace.sortPriceLow')}</option>
                </select>
              </div>
              <Button
                size="sm"
                onClick={() => setConfirmBulkInstall(true)}
                disabled={isInstallingAll || !collectionFiltered.some(a => !a.isInstalled)}
                className="h-11 gap-1.5 rounded-2xl px-4 text-xs font-bold shrink-0 shadow-sm"
              >
                {isInstallingAll ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                {t('marketplace.activateAll')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        {/* Compact header info line */}
        <div className="flex items-center gap-3 py-3.5 text-sm text-muted-foreground flex-wrap border-b border-border/20 mb-4">
          <span className="flex items-center gap-1.5 font-bold text-foreground/80">
            <Package size={13} className="text-primary" />
            {t('marketplace.appCount', { count: apps.length })}
          </span>
          <span className="text-border/50">•</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-success" />
            {t('marketplace.installedCount', { count: installedCount })}
          </span>
          {activeSpecialty && (
            <>
              <span className="text-border/50">•</span>
              <Badge variant="outline" className="gap-1 border px-2 py-0.5 font-bold text-xs">
                <Layers3 size={11} />
                {activeSpecialty.nameAr}
              </Badge>
            </>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-2xl border border-border/15 bg-card/40 p-3.5 backdrop-blur-sm">
                <Skeleton className="size-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-3.5 w-14 rounded-md" />
                    <Skeleton className="h-7 w-14 shrink-0 rounded-lg" />
                  </div>
                </div>
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
            {/* Featured Section — horizontal snap scroll carousel */}
            {featuredApps.length >= 2 && (
              <div className="mp-featured-section">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-primary animate-pulse" />
                    <h2 className="text-sm font-extrabold text-foreground">
                      {t('marketplace.featured')}
                    </h2>
                    <span className="mp-section-count bg-primary/10 text-primary">
                      {featuredApps.length}
                    </span>
                  </div>
                </div>
                <div className="mp-featured-scroll">
                  {featuredApps.map((app, i) => {
                    const catCls = categoryCssClass[app.category] || "";
                    const PricingBrandIcon = app.slug ? appIconsBySlug[app.slug] : undefined;
                    const appIconKey = app.icon?.trim().toLowerCase();
                    const AppIcon = appIconKey ? appIcons[appIconKey] : undefined;
                    const Icon = AppIcon || categoryIcons[app.category] || Package;
                    const textIcon = shouldUseTextIcon(app.icon) ? app.icon?.trim() : null;
                    return (
                      <Link
                        key={app.id}
                        to={`/marketplace/${app.slug}`}
                        className={`mp-featured-card ${catCls} mp-stagger`}
                        style={{ animationDelay: `${(i % 10) * 60}ms`, animationFillMode: "backwards" }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="mp-icon-box">
                            {PricingBrandIcon ? <PricingBrandIcon className="size-[22px]" /> : textIcon ? <span className="text-base font-bold">{textIcon}</span> : <Icon size={22} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3
                              dir="auto"
                              className="text-sm font-extrabold text-foreground truncate group-hover:text-primary transition-colors"
                              style={{ unicodeBidi: 'plaintext' }}
                              title={app.name}
                            >
                              {app.name}
                            </h3>
                            <span className="text-xs font-bold text-muted-foreground/80 block mt-0.5">
                              {categories.find(c => c.category === app.category)?.name}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed h-8">
                          {app.description}
                        </p>
                        <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-border/10">
                          <span className="mp-price-tag">{getPrice(app, t)}</span>
                          {app.isInstalled ? (
                            <span className="text-xs font-bold text-success flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              {t('marketplace.installed')}
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 shrink-0 gap-1 rounded-lg px-2.5 text-xs font-bold"
                              onClick={(e) => handleQuickInstall(e, app)}
                              disabled={installingApp === app.slug}
                            >
                              {installingApp === app.slug ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                              {t('marketplace.activate')}
                            </Button>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Apps Grid */}
            <div className="mp-section-header">
              <h2>
                {selectedCategory
                  ? categories.find(c => c.category === selectedCategory)?.name
                  : t(collections.find(c => c.id === collection)?.labelKey || "marketplace.allTools")}
              </h2>
              <span className="mp-section-count">
                {filteredApps.length}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
              {displayedApps.map((app, i) => {
                const isHighlighted = !!(app.isPopular || app.isFeatured) && i < 6;
                return (
                  <div
                    key={app.id}
                    className={cn("mp-stagger", isHighlighted && "sm:col-span-2")}
                    style={{ animationDelay: `${(i % 20) * 40}ms`, animationFillMode: "backwards" }}
                  >
                    <AppCardV2
                      app={app}
                      installingApp={installingApp}
                      uninstallingApp={uninstallingApp}
                      onQuickInstall={handleQuickInstall}
                      onUninstall={(a) => setConfirmUninstallApp(a)}
                      isHighlighted={isHighlighted}
                    />
                  </div>
                );
              })}
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
          const PricingBrandIcon = showPricingDialog.slug ? appIconsBySlug[showPricingDialog.slug] : undefined;
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
function AppCardV2({ app, installingApp, uninstallingApp, onQuickInstall, onUninstall, isHighlighted = false }: {
  app: MarketplaceApp;
  installingApp: string | null;
  uninstallingApp: string | null;
  onQuickInstall: (e: React.MouseEvent, app: MarketplaceApp) => void;
  onUninstall: (app: MarketplaceApp) => void;
  isHighlighted?: boolean;
}) {
  const { t } = useTranslation();
  const BrandIcon = app.slug ? appIconsBySlug[app.slug] : undefined;
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

  const catCls = categoryCssClass[app.category] || "";

  const iconEl = BrandIcon
    ? <BrandIcon className={isHighlighted ? "size-[24px]" : "size-[20px]"} />
    : textIcon
      ? <span className="text-base font-bold">{textIcon}</span>
      : <Icon size={isHighlighted ? 24 : 20} />;

  return (
    <Popover open={previewOpen} onOpenChange={setPreviewOpen}>
      <div onMouseEnter={showPreview} onMouseLeave={hidePreview} onFocus={showPreview} onBlur={hidePreview} className="h-full">
        <PopoverTrigger asChild>
          <Link
            to={`/marketplace/${app.slug}`}
            aria-haspopup="dialog"
            aria-expanded={previewOpen}
            className={cn(
              "mp-app-card mp-depth",
              catCls,
              app.isInstalled && "mp-installed",
              isHighlighted && "mp-card-highlighted",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            )}
          >
            <div className="mp-icon-box">
              {iconEl}
            </div>

            {isHighlighted ? (
              /* ── Highlighted / Popular layout ── */
              <div className="mp-card-body">
                <div className="flex items-center gap-2">
                  <h3
                    dir="auto"
                    className="text-sm font-extrabold text-foreground truncate"
                    style={{ unicodeBidi: 'plaintext' }}
                    title={app.name}
                  >
                    {app.name}
                  </h3>
                  {app.rating ? (
                    <span className="mp-rating-inline">
                      <Star size={10} className="fill-current" />{app.rating}
                    </span>
                  ) : null}
                </div>
                <p
                  dir="auto"
                  className="text-xs text-muted-foreground line-clamp-1 mt-0.5"
                  style={{ unicodeBidi: 'plaintext' }}
                >
                  {app.description}
                </p>
                {features.length > 0 && (
                  <div className="mp-card-features">
                    {features.slice(0, 4).map(f => (
                      <span key={f.key} className="mp-feature-chip">
                        <CheckCircle2 size={9} />
                        {f.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-auto pt-2 flex items-center justify-between gap-1">
                  <span className="mp-price-tag">{getPrice(app, t)}</span>
                  {app.isInstalled ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 shrink-0 rounded-lg p-0 text-destructive hover:bg-destructive/10"
                      onClick={(e) => { e.preventDefault(); onUninstall(app); }}
                      disabled={uninstallingApp === app.slug}
                    >
                      {uninstallingApp === app.slug ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="h-7 shrink-0 gap-1 rounded-lg px-2.5 text-xs font-bold"
                      onClick={(e) => onQuickInstall(e, app)}
                      disabled={installingApp === app.slug}
                    >
                      {installingApp === app.slug ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                      {installingApp === app.slug ? t('marketplace.activatingNow') : t('marketplace.activate')}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              /* ── Standard compact layout ── */
              <div className="min-w-0 flex-1 flex flex-col justify-between h-full min-h-[44px]">
                <div className="flex items-center gap-1.5">
                  <h3
                    dir="auto"
                    className="text-xs font-extrabold text-foreground truncate"
                    style={{ unicodeBidi: 'plaintext' }}
                    title={app.name}
                  >
                    {app.name}
                  </h3>
                  {app.rating ? (
                    <span className="mp-rating-inline">
                      <Star size={9} className="fill-current" />{app.rating}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <span className="mp-price-tag">{getPrice(app, t)}</span>
                  {app.isInstalled ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 shrink-0 rounded-lg p-0 text-destructive hover:bg-destructive/10"
                      onClick={(e) => { e.preventDefault(); onUninstall(app); }}
                      disabled={uninstallingApp === app.slug}
                    >
                      {uninstallingApp === app.slug ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="h-7 shrink-0 gap-1 rounded-lg px-2 text-xs font-bold"
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
              </div>
            )}
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
              <span className="text-sm font-bold text-primary">{getPrice(app, t)}</span>
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
