import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import {
  Search, Package, ChevronLeft, Loader2, Crown,
  Layers3, AlertTriangle, Filter, Zap, X,
  Store, Users, MessageSquare, BarChart3, TrendingUp,
  DollarSign, Sparkles, CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AppCard from "./components/AppCard";
import { useAuth } from "../../hooks/useAuthSimple";
import { tokenManager } from "../../utils/tokenManager";
import { getApiUrl } from "../../config/environment";
import {
  getFeatureAccessKind,
  getFeatureAccessLabel,
} from "./featureCatalog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export interface MarketplaceApp {
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
  _count?: {
    installations: number;
    reviews: number;
  };
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

interface Bundle {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice?: number;
  discount: number;
  isFeatured: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  specialty?: MarketplaceSpecialty | null;
  message?: string;
}

interface InstallResponseData {
  autoInstalledRequiredApps?: Array<{
    slug: string;
    name?: string;
  }>;
}

interface MarketplaceApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
      requiredApps?: Array<{
        name?: string;
        slug?: string;
      }>;
    };
  };
}

// ponytail: UNLIMITED_SUBSCRIPTION_PRICE removed — unlimited plan system deleted

type ToolCollectionId = "ALL" | "CORE" | "ADD_ONS" | "FREE" | "PAID";

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
};

function shouldUseTextIcon(icon?: string) {
  const normalizedIcon = icon?.trim();
  if (!normalizedIcon) return false;

  return Array.from(normalizedIcon).length <= 3 && !/^[a-z0-9_\-\s]+$/i.test(normalizedIcon);
}

function useToolCollections(t: (key: string) => string): Array<{
  id: ToolCollectionId;
  label: string;
  description: string;
  icon: LucideIcon;
}> {
  return [
    {
      id: "ALL",
      label: t('marketplace.allTools'),
      description: t('marketplace.allToolsDesc'),
      icon: Store,
    },
    {
      id: "CORE",
      label: t('marketplace.coreTools'),
      description: t('marketplace.coreToolsDesc'),
      icon: Zap,
    },
    {
      id: "ADD_ONS",
      label: t('marketplace.addOns'),
      description: t('marketplace.addOnsDesc'),
      icon: Sparkles,
    },
    {
      id: "FREE",
      label: t('marketplace.free'),
      description: t('marketplace.freeDesc'),
      icon: CheckCircle2,
    },
    {
      id: "PAID",
      label: t('marketplace.paid'),
      description: t('marketplace.paidDesc'),
      icon: Crown,
    },
  ];
}

function normalizeRequiredApps(requiredApps: MarketplaceApp["requiredApps"]) {
  if (Array.isArray(requiredApps)) {
    return requiredApps
      .map((requiredApp) => String(requiredApp || "").trim())
      .filter(Boolean);
  }

  if (typeof requiredApps === "string") {
    const trimmed = requiredApps.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((requiredApp) => String(requiredApp || "").trim())
          .filter(Boolean);
      }
    } catch {
      return trimmed
        .split(",")
        .map((requiredApp) => requiredApp.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function sortAppsByDependencies(apps: MarketplaceApp[]) {
  const appsBySlug = new Map(apps.map((app) => [app.slug, app]));
  const orderedApps: MarketplaceApp[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (app: MarketplaceApp) => {
    if (visited.has(app.slug)) {
      return;
    }

    if (visiting.has(app.slug)) {
      orderedApps.push(app);
      visited.add(app.slug);
      return;
    }

    visiting.add(app.slug);

    normalizeRequiredApps(app.requiredApps).forEach((requiredSlug) => {
      const dependency = appsBySlug.get(requiredSlug);
      if (dependency) {
        visit(dependency);
      }
    });

    visiting.delete(app.slug);
    visited.add(app.slug);
    orderedApps.push(app);
  };

  apps.forEach(visit);

  return orderedApps.filter(
    (app, index, collection) =>
      collection.findIndex((candidate) => candidate.slug === app.slug) === index,
  );
}

function getDefaultPricingModel(app: MarketplaceApp) {
  if (app.pricingModel === "FREE") {
    return "FREE";
  }

  if (app.pricingModel === "PAY_PER_USE") {
    return "PAY_PER_USE";
  }

  return "SUBSCRIPTION";
}

function isAddOnApp(app: MarketplaceApp) {
  return normalizeRequiredApps(app.requiredApps).length > 0;
}

function isCoreApp(app: MarketplaceApp) {
  return !isAddOnApp(app);
}

function matchesToolCollection(app: MarketplaceApp, collection: ToolCollectionId) {
  switch (collection) {
    case "CORE":
      return isCoreApp(app);
    case "ADD_ONS":
      return isAddOnApp(app);
    case "FREE":
      return app.pricingModel === "FREE";
    case "PAID":
      return app.pricingModel !== "FREE";
    case "ALL":
    default:
      return true;
  }
}

function getToolRoleLabel(app: MarketplaceApp, t: (key: string) => string) {
  return isAddOnApp(app) ? t('marketplace.addOn') : t('marketplace.coreApp');
}

export default function Marketplace() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [activeSpecialty, setActiveSpecialty] = useState<MarketplaceSpecialty | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [selectedCollection, setSelectedCollection] =
    useState<ToolCollectionId>("ALL");
  const [installingApp, setInstallingApp] = useState<string | null>(null);
  const [uninstallingApp, setUninstallingApp] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"APPS" | "BUNDLES" | "INSTALLED">("APPS");
  const [isInstallingAll, setIsInstallingAll] = useState(false);
  const [showPricingDialog, setShowPricingDialog] =
    useState<MarketplaceApp | null>(null);
  const [confirmUninstallApp, setConfirmUninstallApp] =
    useState<MarketplaceApp | null>(null);
  const DISPLAY_INITIAL = 24;
  const DISPLAY_INCREMENT = 16;
  const [displayCount, setDisplayCount] = useState(DISPLAY_INITIAL);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set("category", selectedCategory);
    if (searchQuery) params.set("q", searchQuery);
    if (sortBy && sortBy !== "featured") params.set("sort", sortBy);
    setSearchParams(params, { replace: true });
  }, [selectedCategory, searchQuery, sortBy, setSearchParams]);

  useEffect(() => {
    const qParam = searchParams.get("q");
    if (qParam) setSearchQuery(qParam);
    const sortParam = searchParams.get("sort");
    if (sortParam) setSortBy(sortParam);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        document.getElementById("marketplace-search")?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const fetchData = useCallback(async () => {
    window.scrollTo(0, 0);
    try {
      setLoading(true);

      const params: Record<string, string | number> = {};
      if (selectedCategory) params["category"] = selectedCategory;
      if (searchQuery) params["search"] = searchQuery;
      if (sortBy) params["sort"] = sortBy;
      params["page"] = 1;
      params["limit"] = MARKETPLACE_APPS_FETCH_LIMIT;

      const [appsRes, categoriesRes, bundlesRes] = await Promise.all([
        apiClient.get<ApiEnvelope<MarketplaceApp[]>>("/marketplace/apps", { params }),
        apiClient.get<ApiEnvelope<Category[]>>("/marketplace/categories"),
        apiClient.get<ApiEnvelope<Bundle[]>>("/marketplace/bundles"),
      ]);

      setApps(appsRes.data.data);
      setCategories(categoriesRes.data.data);
      setActiveSpecialty(appsRes.data.specialty || categoriesRes.data.specialty || null);
      setBundles(bundlesRes.data.data);
    } catch (error) {
      console.error("Error fetching marketplace data:", error);
      toast.error(t('marketplace.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, sortBy, t]);

  useEffect(() => {
    fetchData();
    setDisplayCount(DISPLAY_INITIAL);
  }, [fetchData]);

  const markAppsInstalled = (slugs: string[]) => {
    if (slugs.length === 0) return;

    const installedSlugs = new Set(slugs);
    setApps((prevApps) =>
      prevApps.map((app) =>
        installedSlugs.has(app.slug)
          ? {
            ...app,
            isInstalled: true,
            installCount: app.isInstalled ? app.installCount : app.installCount + 1,
          }
          : app,
      ),
    );
  };

  const getRequiredAppNames = (app: MarketplaceApp) =>
    normalizeRequiredApps(app.requiredApps).map(
      (requiredSlug) =>
        apps.find((candidate) => candidate.slug === requiredSlug)?.name || requiredSlug,
    );

  // Install all available apps
  const handleInstallAll = async () => {
    const visibleApps = apps.filter((app) =>
      matchesToolCollection(app, selectedCollection),
    );
    const uninstalledApps = sortAppsByDependencies(visibleApps).filter(
      (app) => !app.isInstalled,
    );

    if (uninstalledApps.length === 0) {
      toast.success(t('marketplace.allActivated'));
      return;
    }

    if (
      !window.confirm(
        t('marketplace.confirmBulkActivate', { count: uninstalledApps.length }),
      )
    ) {
      return;
    }

    setIsInstallingAll(true);
    let successCount = 0;
    let failCount = 0;

    const toastId = toast.loading(t('marketplace.activatingProgress', { name: '', progress: 0 }));

    try {
      // Install sequentially to avoid overloading the server
      for (let i = 0; i < uninstalledApps.length; i++) {
        const app = uninstalledApps[i];

        try {
          if (!app) continue;
          // Update toast process
          const progress = Math.round(((i + 1) / uninstalledApps.length) * 100);
          toast.loading(t('marketplace.activatingProgress', { name: app.name, progress }), {
            id: toastId,
          });

          const response = await apiClient.post<ApiEnvelope<InstallResponseData>>(
            `/marketplace/apps/${app.slug}/install`,
            { pricingModel: getDefaultPricingModel(app) },
          );
          const autoInstalledRequiredApps =
            response.data.data?.autoInstalledRequiredApps ?? [];

          markAppsInstalled([
            app.slug,
            ...autoInstalledRequiredApps.map((requiredApp: { slug: string }) => requiredApp.slug),
          ]);

          successCount++;
        } catch (error) {
          console.error(`Failed to install ${app?.name || "app"}`, error);
          failCount++;
        }
      }

      if (failCount === 0) {
        toast.success(t('marketplace.activatedSuccess', { count: successCount }), {
          id: toastId,
        });
      } else {
        toast.success(t('marketplace.activatedWithErrors', { count: successCount, fail: failCount }), {
          id: toastId,
        });
      }
    } catch (error) {
      toast.error(t('marketplace.bulkActivateError'), { id: toastId });
    } finally {
      setIsInstallingAll(false);
    }
  };

// ponytail: handleSubscribeUnlimited removed — unlimited plan system deleted

  const handleQuickInstall = async (
    e: React.MouseEvent,
    app: MarketplaceApp,
  ) => {
    e.stopPropagation();
    if (app.isInstalled && app.pricingModel !== "PAY_PER_USE") return;

    if (
      app.pricingModel === "FREE" ||
      (app.pricingModel === "SUBSCRIPTION" && app.monthlyPrice === 0)
    ) {
      executeInstall(app, app.pricingModel);
    } else {
      setShowPricingDialog(app);
    }
  };

  const executeInstall = async (app: MarketplaceApp, pricingModel: string) => {
    try {
      setInstallingApp(app.slug);

      const response = await apiClient.post<ApiEnvelope<InstallResponseData>>(`/marketplace/apps/${app.slug}/install`, {
        pricingModel,
      });
      const autoInstalledRequiredApps =
        response.data.data?.autoInstalledRequiredApps ?? [];
      const autoInstalledNames = autoInstalledRequiredApps.map(
        (requiredApp: { name?: string; slug: string }) =>
          requiredApp.name || requiredApp.slug,
      );

      toast.success(
        autoInstalledNames.length > 0
          ? t('marketplace.activatedWithReqs', { name: app.name, reqs: autoInstalledNames.join(", ") })
          : t('marketplace.activatedSingle', { name: app.name }),
      );

      markAppsInstalled([
        app.slug,
        ...autoInstalledRequiredApps.map((requiredApp: { slug: string }) => requiredApp.slug),
      ]);
    } catch (error: unknown) {
      const apiError = error as MarketplaceApiError;

      if (apiError.response?.status === 401) {
        toast.error(t('marketplace.pleaseLogin'));
        navigate("/auth/login");
        return;
      }

      const errorMsg = apiError.response?.data?.message || t('marketplace.activationError');
      toast.error(errorMsg);

      if (apiError.response?.data?.requiredApps) {
        const required = apiError.response.data.requiredApps;
        toast.error(
          t('marketplace.requiresApps', { apps: required.map((requiredApp: { name?: string; slug: string }) => requiredApp.name || requiredApp.slug).join(", ") }),
        );
      } else {
        const requiredNames = getRequiredAppNames(app);
        if (requiredNames.length > 0) {
          toast(t('marketplace.needsApps', { apps: requiredNames.join(", ") }));
        }
      }
    } finally {
      setInstallingApp(null);
    }
  };

  const handleUninstall = async (app: MarketplaceApp) => {
    try {
      setUninstallingApp(app.slug);

      const response = await apiClient.post<ApiEnvelope<InstallResponseData>>(
        `/marketplace/apps/${app.slug}/uninstall`,
      );

      toast.success(response.data.message || t('marketplace.deactivatedSuccess', { name: app.name }));

      setApps((prevApps) =>
        prevApps.map((a) =>
          a.slug === app.slug ? { ...a, isInstalled: false } : a,
        ),
      );

      setConfirmUninstallApp(null);
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error(t('marketplace.pleaseLogin'));
        return;
      }

      const errorMsg =
        error.response?.data?.message || t('marketplace.deactivationError');
      toast.error(errorMsg);
    } finally {
      setUninstallingApp(null);
    }
  };

  const getPriceDisplay = (app: MarketplaceApp) => {
    if (app.pricingModel === "FREE") {
      return t('marketplace.freePrice');
    }
    if (app.pricingModel === "PAY_PER_USE") {
      return app.unitPrice
        ? `${app.unitPrice} ${t('marketplace.currencyUnit')}${t('marketplace.perUnit')}`
        : t('marketplace.payPerUse');
    }
    if (app.monthlyPrice) {
      return `${app.monthlyPrice} ${t('marketplace.currencyUnit')}${t('marketplace.perMonth')}`;
    }
    return t('marketplace.contactUs');
  };

  const collectionApps = apps.filter((app) =>
    matchesToolCollection(app, selectedCollection),
  );
  const visibleApps =
    activeTab === "INSTALLED"
      ? collectionApps.filter((app) => app.isInstalled)
      : collectionApps;
  const displayedApps = visibleApps.slice(0, displayCount);
  const hasMoreApps = visibleApps.length > displayCount;
  const isEnterprise = false; // ponytail: enterprise plan system removed
  const installedAppsCount = apps.filter((app) => app.isInstalled).length;
  const discoverAppsCount = apps.filter((app) => !app.isInstalled).length;
  const isBundlesTab = activeTab === "BUNDLES";
  const showAppFilters = activeTab !== "BUNDLES";
  const getDisplayedPrice = (app: MarketplaceApp) => {
    if (isEnterprise && app.pricingModel !== "FREE") {
      return app.pricingModel === "PAY_PER_USE"
        ? t('marketplace.includedByUsage')
        : t('marketplace.includedInPlan');
    }

    return getPriceDisplay(app);
  };
  const toolCollections = useToolCollections(t);
  const selectedCollectionMeta =
    toolCollections.find((collection) => collection.id === selectedCollection) ||
    {
      id: "ALL" as ToolCollectionId,
      label: t('marketplace.allTools'),
      description: t('marketplace.allToolsDesc'),
      icon: Store,
    };
  const selectedCategoryMeta = categories.find(
    (category) => category.category === selectedCategory,
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1440px] px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-card border border-border/50 p-4 sm:p-6 text-right shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="order-2 lg:order-1">
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:justify-end sm:text-right">
                {/* ponytail: unlimited badge removed — plan system deleted */}
                <span className="whitespace-nowrap text-muted-foreground">{t('marketplace.appCount', { count: apps.length })}</span>
                <span className="whitespace-nowrap text-muted-foreground">{t('marketplace.installedCount', { count: installedAppsCount })}</span>
                {activeSpecialty && (
                  <Badge variant="outline" className="gap-1.5 border px-3 py-1 font-bold">
                    <Layers3 size={14} aria-hidden="true" />
                    {t('marketplace.yourSpecialty', { name: activeSpecialty.nameAr })}
                  </Badge>
                )}
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h1 className="text-2xl font-bold leading-tight text-foreground tracking-tight sm:text-3xl">
                {t('marketplace.pageTitle')}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground">
                {t('marketplace.pageSubtitle')}
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "APPS" | "BUNDLES" | "INSTALLED")} className="mt-4">
            <TabsList className="w-full justify-end">
              <TabsTrigger value="INSTALLED" onClick={() => { setSelectedCategory(""); setSelectedCollection("ALL"); }}>{t('marketplace.installedApps')}</TabsTrigger>
              <TabsTrigger value="APPS" onClick={() => { setSelectedCategory(""); setSelectedCollection("ALL"); }}>{t('marketplace.discoverMore')}</TabsTrigger>
              <TabsTrigger value="BUNDLES" onClick={() => setSelectedCategory("")}>{t('marketplace.savingsBundles')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div
          className={`mt-5 grid grid-cols-1 gap-5 ${
            showAppFilters ? "lg:grid-cols-[240px_minmax(0,1fr)]" : ""
          }`}
        >
          {/* Sidebar */}
          {showAppFilters && (
          <aside className="hidden lg:block lg:self-start">
            <div className="sticky top-5 rounded-2xl bg-card border border-border/50 py-2 text-right shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("");
                  setSelectedCollection("ALL");
                  setActiveTab("APPS");
                }}
                aria-pressed={selectedCategory === "" && selectedCollection === "ALL" && activeTab === "APPS"}
                className={cn(
                  "block w-full px-4 py-2.5 text-right text-sm font-bold transition-colors",
                  selectedCategory === "" && selectedCollection === "ALL" && activeTab === "APPS"
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {t('marketplace.allApps')}
              </button>

              {toolCollections
                .filter((collection) => collection.id !== "ALL")
                .map((collection) => (
                  <button
                    type="button"
                    key={collection.id}
                    onClick={() => {
                      setSelectedCategory("");
                      setSelectedCollection(collection.id);
                      setActiveTab("APPS");
                    }}
                    aria-pressed={selectedCollection === collection.id && activeTab === "APPS"}
                    className={cn(
                      "block w-full px-4 py-2.5 text-right text-sm font-bold transition-colors",
                      selectedCollection === collection.id && activeTab === "APPS"
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {collection.label}
                  </button>
                ))}

              <Separator className="my-2" />

              {categories.map((cat) => {
                const CatIcon = categoryIcons[cat.category];
                return (
                <button
                  type="button"
                  key={cat.category}
                  onClick={() => {
                    setSelectedCategory(cat.category);
                    setSelectedCollection("ALL");
                    setActiveTab("APPS");
                  }}
                  aria-pressed={selectedCategory === cat.category}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-2.5 text-right text-sm font-bold transition-colors",
                    selectedCategory === cat.category
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {CatIcon && <CatIcon size={15} aria-hidden="true" />}
                  {cat.name}
                </button>
                );
              })}

              <Separator className="my-2" />

              <Link
                to="/marketplace/themes"
                className="block px-4 py-2.5 text-right text-sm font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {t('sidebar.storeThemes')}
              </Link>
            </div>
          </aside>
          )}

          {/* Main Content Area */}
          <div role="main" className="min-w-0">
            <div className="mb-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 text-right">
                  <h2 className="text-lg font-bold text-foreground sm:text-xl">
                    {isBundlesTab
                      ? t('marketplace.featuredBundles')
                      : activeTab === "INSTALLED"
                        ? t('marketplace.installedApps')
                      : selectedCategoryMeta
                        ? `${selectedCollectionMeta.label} • ${selectedCategoryMeta.name}`
                        : selectedCollectionMeta.label}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {isBundlesTab
                      ? t('marketplace.bundlesAvailable', { count: bundles.length })
                      : activeTab === "INSTALLED"
                      ? t('marketplace.installedCurrently', { count: installedAppsCount })
                      : t('marketplace.appsAvailable', { count: discoverAppsCount })}
                  </p>
                </div>

                {showAppFilters && (
                <div className="grid gap-2 xl:w-[680px] xl:grid-cols-[1fr_auto_auto]">
                  <div className="relative">
                    <span className="sr-only">{t('marketplace.searchPlaceholder')}</span>
                    <Search
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={17}
                      aria-hidden="true"
                    />
                    <Input
                      id="marketplace-search"
                      name="marketplaceSearch"
                      type="search"
                      inputMode="search"
                      autoComplete="off"
                      placeholder={t('marketplace.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-10 w-full pr-11 text-sm"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={t('marketplace.clearSearch')}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  <div className="flex h-10 items-center gap-3 rounded-xl border bg-background px-4 text-sm text-muted-foreground">
                    <span className="whitespace-nowrap font-bold">{t('marketplace.sortLabel')}</span>
                    <select
                      name="marketplaceSort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="h-full bg-transparent text-sm font-bold text-foreground focus:outline-none"
                    >
                      <option value="featured">{t('marketplace.sortFeatured')}</option>
                      <option value="popular">{t('marketplace.sortPopular')}</option>
                      <option value="newest">{t('marketplace.sortNewest')}</option>
                      <option value="price_low">{t('marketplace.sortPriceLow')}</option>
                    </select>
                  </div>

                  <Button
                    type="button"
                    onClick={handleInstallAll}
                    disabled={
                      isInstallingAll ||
                      visibleApps.length === 0 ||
                      visibleApps.every((app) => app.isInstalled)
                    }
                    className="h-10 gap-2 px-4 text-sm font-bold"
                  >
                    {isInstallingAll ? (
                      <Loader2 data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <Zap data-icon="inline-start" />
                    )}
                    {t('marketplace.activateAll')}
                  </Button>
                </div>
                )}
              </div>

              {showAppFilters && (
              <div className="mt-3 flex items-center gap-2 lg:hidden">
                <div className="flex flex-1 gap-2 overflow-x-auto pb-1 scroll-snap-x">
                  <Badge
                    variant={selectedCategory === "" && selectedCollection === "ALL" && activeTab === "APPS" ? "default" : "outline"}
                    className="cursor-pointer whitespace-nowrap scroll-snap-start text-xs font-bold"
                    onClick={() => { setSelectedCategory(""); setSelectedCollection("ALL"); setActiveTab("APPS"); }}
                  >
                    {t('marketplace.allTools')}
                  </Badge>
                  <Badge
                    variant={activeTab === "BUNDLES" ? "default" : "outline"}
                    className="cursor-pointer whitespace-nowrap scroll-snap-start text-xs font-bold"
                    onClick={() => { setSelectedCategory(""); setActiveTab("BUNDLES"); }}
                  >
                    {t('marketplace.savingsBundles')}
                  </Badge>
                  {toolCollections
                    .filter((collection) => collection.id !== "ALL")
                    .map((collection) => (
                      <Badge
                        key={collection.id}
                        variant={selectedCollection === collection.id ? "default" : "outline"}
                        className="cursor-pointer whitespace-nowrap scroll-snap-start text-xs font-bold"
                        onClick={() => { setSelectedCollection(collection.id); setActiveTab("APPS"); }}
                      >
                        {collection.label}
                      </Badge>
                    ))}
                </div>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="shrink-0 gap-1.5 text-xs font-bold">
                      <Filter size={14} />
                      {t('marketplace.filters')}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[280px] overflow-y-auto text-right">
                    <SheetHeader>
                      <SheetTitle>{t('marketplace.filters')}</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 space-y-1">
                      <button
                        type="button"
                        onClick={() => { setSelectedCategory(""); setSelectedCollection("ALL"); setActiveTab("APPS"); }}
                        className={cn("block w-full rounded-lg px-3 py-2 text-right text-sm font-bold transition-colors", selectedCategory === "" && selectedCollection === "ALL" && activeTab === "APPS" ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                      >
                        {t('marketplace.allApps')}
                      </button>
                      {toolCollections.filter((c) => c.id !== "ALL").map((collection) => (
                        <button
                          key={collection.id}
                          type="button"
                          onClick={() => { setSelectedCategory(""); setSelectedCollection(collection.id); setActiveTab("APPS"); }}
                          className={cn("block w-full rounded-lg px-3 py-2 text-right text-sm font-bold transition-colors", selectedCollection === collection.id && activeTab === "APPS" ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                        >
                          {collection.label}
                        </button>
                      ))}
                      <Separator className="my-2" />
                      {categories.map((cat) => (
                        <button
                          key={cat.category}
                          type="button"
                          onClick={() => { setSelectedCategory(cat.category); setSelectedCollection("ALL"); setActiveTab("APPS"); }}
                          className={cn("block w-full rounded-lg px-3 py-2 text-right text-sm font-bold transition-colors", selectedCategory === cat.category ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                        >
                          {cat.name}
                        </button>
                      ))}
                      <Separator className="my-2" />
                      <Link to="/marketplace/themes" className="block rounded-lg px-3 py-2 text-right text-sm font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                        {t('sidebar.storeThemes')}
                      </Link>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
              )}
            </div>

            {/* Content Switcher */}
            {isBundlesTab ? (
              /* Bundles Grid */
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {bundles.map((bundle) => (
                  <Card key={bundle.id} className="group text-right transition-transform hover:-translate-y-0.5 border-border/50" style={{ boxShadow: "0 28px 72px -48px rgba(7, 17, 32, 0.42)" }}>
                    <CardHeader className="px-5 pt-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base font-bold sm:text-lg group-hover:text-primary">
                            {bundle.name}
                          </CardTitle>
                          <CardDescription className="mt-1.5 line-clamp-2">
                            {bundle.description}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="shrink-0 border px-3 text-xs font-bold">
                          {t('marketplace.savePercent', { percent: bundle.discount })}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardFooter className="justify-between gap-3 px-5 pb-5 pt-4">
                      <div>
                        <span className="text-lg font-bold text-foreground">
                          {t('marketplace.bundlePrice', { price: bundle.monthlyPrice })}
                        </span>
                        <span className="mr-1 text-xs text-muted-foreground">
                          {t('marketplace.perMonth')}
                        </span>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/marketplace/bundle/${bundle.slug}`}>
                          {t('marketplace.bundleDetails')}
                          <ChevronLeft data-icon="inline-end" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                {bundles.length === 0 && (
                  <Card className="col-span-full border-dashed py-10 text-center">
                    <Package size={42} className="mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
                    <p className="text-muted-foreground">{t('marketplace.noBundles')}</p>
                  </Card>
                )}
              </div>
            ) : /* Apps Grid */
              loading ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="px-4 py-3 border-border/50" style={{ boxShadow: "0 28px 72px -48px rgba(7, 17, 32, 0.42)" }}>
                      <div className="flex items-center gap-2.5 animate-pulse">
                        <Skeleton className="size-9 shrink-0 rounded-lg" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-8 w-16 shrink-0 rounded-lg" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : displayedApps.length === 0 && !hasMoreApps ? (
                <Card className="border-dashed py-16 text-center">
                  <Package size={42} className="mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
                  <p className="text-muted-foreground">
                    {searchQuery ? t('marketplace.noSearchResults', { query: searchQuery }) : t('marketplace.noTools')}
                  </p>
                </Card>
              ) : (
                <>
                  {!isBundlesTab && !selectedCategory && displayedApps.filter(a => a.isFeatured).length > 0 && (
                    <div className="mb-6">
                      <div className="mb-3 flex items-center gap-2">
                        <Sparkles size={14} className="text-primary" />
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('marketplace.featured')}</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                        {displayedApps.filter(a => a.isFeatured).slice(0, 4).map((app) => (
                          <AppCard
                            key={app.id}
                            app={app}
                            installingApp={installingApp}
                            uninstallingApp={uninstallingApp}
                            onQuickInstall={handleQuickInstall}
                            onUninstall={(a) => setConfirmUninstallApp(a)}
                            featured
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {displayedApps.filter(a => !a.isFeatured).map((app) => (
                      <AppCard
                        key={app.id}
                        app={app}
                        installingApp={installingApp}
                        uninstallingApp={uninstallingApp}
                        onQuickInstall={handleQuickInstall}
                        onUninstall={(a) => setConfirmUninstallApp(a)}
                      />
                    ))}
                  </div>
                </>
              )}
              {hasMoreApps && activeTab !== "INSTALLED" && (
                <div className="mt-6 text-center">
                  <Button variant="outline" onClick={() => setDisplayCount((prev) => prev + DISPLAY_INCREMENT)} className="gap-2 px-8 font-bold">
                    {t('marketplace.loadMore', { remaining: visibleApps.length - displayCount })}
                  </Button>
                </div>
              )}
          </div>
        </div>
      </div>
      {/* Pricing Choice Dialog */}
      <Dialog open={!!showPricingDialog} onOpenChange={(open) => !open && setShowPricingDialog(null)}>
        {showPricingDialog && (() => {
          const DialogIcon = categoryIcons[showPricingDialog.category] || Package;
          const dialogTextIcon = shouldUseTextIcon(showPricingDialog.icon)
            ? showPricingDialog.icon?.trim()
            : null;
          return (
            <DialogContent className="max-w-md">
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-xl border bg-primary/10 text-2xl text-primary">
                    {dialogTextIcon || <DialogIcon size={24} aria-hidden="true" />}
                  </div>
                  <div>
                    <DialogTitle>{showPricingDialog.name}</DialogTitle>
                    <DialogDescription>{t('marketplace.choosePricing')}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <Button variant="outline" className={cn("relative w-full justify-between p-4 text-right", showPricingDialog.isInstalled && showPricingDialog.activePricingModel === "SUBSCRIPTION" && "border-primary bg-primary/5")} onClick={() => { executeInstall(showPricingDialog, "SUBSCRIPTION"); setShowPricingDialog(null); }} disabled={showPricingDialog.isInstalled && showPricingDialog.activePricingModel === "SUBSCRIPTION"}>
                  {showPricingDialog.isInstalled && showPricingDialog.activePricingModel === "SUBSCRIPTION" && <span className="absolute left-0 top-0 rounded-br-lg bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{t('marketplace.currentlyActive')}</span>}
                  <span className="font-bold">{showPricingDialog.activePricingModel === "PAY_PER_USE" ? t('marketplace.upgradeToMonthly') : t('marketplace.monthlySubscription')}</span>
                  <span className="font-bold text-primary">{(showPricingDialog.monthlyPrice ?? 0) > 0 ? t('marketplace.monthlyPrice', { price: showPricingDialog.monthlyPrice }) : t('marketplace.freePrice')}</span>
                </Button>
                {showPricingDialog.pricingModel === "PAY_PER_USE" && (
                  <Button variant="outline" className={cn("relative w-full justify-between p-4 text-right", showPricingDialog.isInstalled && showPricingDialog.activePricingModel === "PAY_PER_USE" && "border-warning bg-warning/5")} onClick={() => { executeInstall(showPricingDialog, "PAY_PER_USE"); setShowPricingDialog(null); }} disabled={showPricingDialog.isInstalled && showPricingDialog.activePricingModel === "PAY_PER_USE"}>
                    {showPricingDialog.isInstalled && showPricingDialog.activePricingModel === "PAY_PER_USE" && <span className="absolute left-0 top-0 rounded-br-lg bg-warning px-2 py-0.5 text-xs font-bold text-warning-foreground">{t('marketplace.currentlyActive')}</span>}
                    <span className="flex items-center gap-1 font-bold">{t('marketplace.payPerUseLabel')}<Zap size={14} className="fill-current text-warning" aria-hidden="true" /></span>
                    <span className="font-bold text-warning">{showPricingDialog.unitPrice ?? 0} {t('marketplace.currencyUnit')} / {showPricingDialog.unitName || t('marketplace.perUnit')}</span>
                  </Button>
                )}
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>

      {/* Uninstall Confirmation Dialog */}
      <AlertDialog open={!!confirmUninstallApp} onOpenChange={(open) => !open && setConfirmUninstallApp(null)}>
        {confirmUninstallApp && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle size={28} className="text-destructive" />
              </div>
              <AlertDialogTitle className="text-center">{t('marketplace.deactivateTitle', { name: confirmUninstallApp.name })}</AlertDialogTitle>
              <AlertDialogDescription className="text-center">{t('marketplace.deactivateConfirm')}<br />{t('marketplace.deactivateWarning')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3">
              <AlertDialogCancel disabled={uninstallingApp === confirmUninstallApp.slug}>{t('marketplace.goBack')}</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleUninstall(confirmUninstallApp)} disabled={uninstallingApp === confirmUninstallApp.slug} className="bg-destructive hover:bg-destructive/90">
                {uninstallingApp === confirmUninstallApp.slug ? (
                  <span className="inline-flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />{t('marketplace.activating')}</span>
                ) : t('marketplace.confirmDeactivation')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}
