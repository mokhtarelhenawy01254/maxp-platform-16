import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { toast } from "react-hot-toast";
import {
  Store,
  Users,
  MessageSquare,
  BarChart3,
  Zap,
  DollarSign,
  TrendingUp,
  Search,
  Package,
  Check,
  ChevronLeft,
  Sparkles,
  Loader2,
  Crown,
  CheckCircle2,
  Settings,
  Layers3,
  AlertTriangle,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";
import { tokenManager } from "../../utils/tokenManager";
import { getApiUrl } from "../../config/environment";
import {
  getFeatureAccessKind,
  getFeatureAccessLabel,
} from "./featureCatalog";

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

const UNLIMITED_SUBSCRIPTION_PRICE = 999;

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

  const fetchData = useCallback(async () => {
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

  const handleSubscribeUnlimited = async () => {
    if (
      !window.confirm(
        t('marketplace.unlimitedConfirm', { price: UNLIMITED_SUBSCRIPTION_PRICE }),
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${getApiUrl()}/marketplace/unlimited/subscribe`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenManager.getAccessToken()}`,
          "Content-Type": "application/json",
        },
      });
      const res = await response.json();
      if (res.success) {
        toast.success(res.message);
        window.location.reload();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(t('marketplace.processError'));
    }
  };

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
          ? t('marketplace.activatedWithReqs', { name: app.name, reqs: autoInstalledNames.join("، ") })
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
          t('marketplace.requiresApps', { apps: required.map((requiredApp: { name?: string; slug: string }) => requiredApp.name || requiredApp.slug).join("، ") }),
        );
      } else {
        const requiredNames = getRequiredAppNames(app);
        if (requiredNames.length > 0) {
          toast(t('marketplace.needsApps', { apps: requiredNames.join("، ") }));
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
  const isEnterprise = user?.company?.plan === "ENTERPRISE";
  const installedAppsCount = apps.filter((app) => app.isInstalled).length;
  const discoverAppsCount = apps.filter((app) => !app.isInstalled).length;
  const isBundlesTab = activeTab === "BUNDLES";
  const showAppFilters = !isBundlesTab;
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
    <div className="marketplace-page min-h-screen overflow-x-hidden">
      <div className="marketplace-shell mx-auto max-w-[1440px] px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <header className="marketplace-hero marketplace-divider border-b pb-4 text-right">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="order-2 lg:order-1">
              <div className="marketplace-summary-row marketplace-muted flex flex-wrap items-center gap-2 text-xs">
                {isEnterprise ? (
                  <span className="marketplace-soft-success inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-bold">
                    <Crown size={14} aria-hidden="true" />
                    {t('marketplace.unlimitedActive')}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubscribeUnlimited}
                    className="marketplace-soft-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  >
                    <Crown size={14} aria-hidden="true" />
                    {t('marketplace.unlimitedAccess')}
                  </button>
                )}
                <span className="whitespace-nowrap">{t('marketplace.appCount', { count: apps.length })}</span>
                <span className="whitespace-nowrap">{t('marketplace.installedCount', { count: installedAppsCount })}</span>
                {activeSpecialty && (
                  <span className="marketplace-soft-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-bold">
                    <Layers3 size={14} aria-hidden="true" />
                    {t('marketplace.yourSpecialty', { name: activeSpecialty.nameAr })}
                  </span>
                )}
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h1 className="marketplace-strong text-3xl font-black leading-tight sm:text-4xl">
                {t('marketplace.pageTitle')}
              </h1>
              <p className="marketplace-muted mt-2 max-w-2xl text-sm font-semibold leading-6">
                {t('marketplace.pageSubtitle')}
              </p>
            </div>
          </div>

          <div className="marketplace-top-tabs mt-4 text-base font-black sm:text-lg">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("");
                setSelectedCollection("ALL");
                setActiveTab("INSTALLED");
              }}
              aria-pressed={activeTab === "INSTALLED"}
              className={`marketplace-top-tab border-b-2 pb-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                activeTab === "INSTALLED"
                  ? "marketplace-tab-active"
                  : "marketplace-tab-idle"
              }`}
            >
              {t('marketplace.installedApps')}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("");
                setSelectedCollection("ALL");
                setActiveTab("APPS");
              }}
              aria-pressed={activeTab === "APPS"}
              className={`marketplace-top-tab border-b-2 pb-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                activeTab === "APPS"
                  ? "marketplace-tab-active"
                  : "marketplace-tab-idle"
              }`}
            >
              {t('marketplace.discoverMore')}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("");
                setActiveTab("BUNDLES");
              }}
              aria-pressed={activeTab === "BUNDLES"}
              className={`marketplace-top-tab border-b-2 pb-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                activeTab === "BUNDLES"
                  ? "marketplace-tab-active"
                  : "marketplace-tab-idle"
              }`}
            >
              {t('marketplace.savingsBundles')}
            </button>
          </div>
        </header>

        <div
          className={`mt-5 grid grid-cols-1 gap-5 ${
            showAppFilters ? "lg:grid-cols-[220px_minmax(0,1fr)]" : ""
          }`}
        >
          {/* Sidebar */}
          {showAppFilters && (
          <aside className="hidden lg:block lg:self-start">
            <div className="marketplace-panel sticky top-5 overflow-hidden rounded-2xl py-2 text-right">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("");
                  setSelectedCollection("ALL");
                  setActiveTab("APPS");
                }}
                aria-pressed={selectedCategory === "" && selectedCollection === "ALL" && activeTab === "APPS"}
                className={`block w-full border-r-2 px-4 py-2.5 text-right text-sm font-black transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                  selectedCategory === "" && selectedCollection === "ALL" && activeTab === "APPS"
                    ? "marketplace-filter-active"
                    : "marketplace-filter-idle"
                }`}
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
                    className={`block w-full border-r-2 px-4 py-2.5 text-right text-sm font-black transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                      selectedCollection === collection.id && activeTab === "APPS"
                        ? "marketplace-filter-active"
                        : "marketplace-filter-idle"
                    }`}
                  >
                    {collection.label}
                  </button>
                ))}

              <div className="my-2 h-px bg-[var(--color-border)] opacity-60" />

              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat.category}
                  onClick={() => {
                    setSelectedCategory(cat.category);
                    setSelectedCollection("ALL");
                    setActiveTab("APPS");
                  }}
                  aria-pressed={selectedCategory === cat.category}
                  className={`block w-full border-r-2 px-4 py-2.5 text-right text-sm font-black transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                    selectedCategory === cat.category
                      ? "marketplace-filter-active"
                      : "marketplace-filter-idle"
                  }`}
                >
                  {cat.name}
                </button>
              ))}

              <div className="my-2 h-px bg-[var(--color-border)] opacity-60" />

              <Link
                to="/marketplace/themes"
                className="marketplace-filter-idle block px-4 py-2.5 text-right text-sm font-black transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                {t('sidebar.storeThemes')}
              </Link>
            </div>
          </aside>
          )}

          {/* Main Content Area */}
          <main className="min-w-0">
            <div className="mb-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 text-right">
                  <h2 className="marketplace-strong text-lg font-black sm:text-xl">
                    {isBundlesTab
                      ? t('marketplace.featuredBundles')
                      : activeTab === "INSTALLED"
                        ? t('marketplace.installedApps')
                      : selectedCategoryMeta
                        ? `${selectedCollectionMeta.label} • ${selectedCategoryMeta.name}`
                        : selectedCollectionMeta.label}
                  </h2>
                  <p className="marketplace-muted mt-1 text-sm leading-6">
                    {isBundlesTab
                      ? t('marketplace.bundlesAvailable', { count: bundles.length })
                      : activeTab === "INSTALLED"
                      ? t('marketplace.installedCurrently', { count: installedAppsCount })
                      : t('marketplace.appsAvailable', { count: discoverAppsCount })}
                  </p>
                </div>

                {showAppFilters && (
                <div className="marketplace-toolbar grid gap-2 xl:w-[680px]">
                  <label className="marketplace-toolbar-search relative block">
                    <span className="sr-only">{t('marketplace.searchPlaceholder')}</span>
                    <Search
                      className="marketplace-muted pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
                      size={17}
                      aria-hidden="true"
                    />
                    <input
                      id="marketplace-search"
                      name="marketplaceSearch"
                      type="search"
                      inputMode="search"
                      autoComplete="off"
                      placeholder={t('marketplace.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="marketplace-control marketplace-search-input h-10 w-full rounded-xl pr-11 pl-4 text-sm placeholder:text-[var(--color-muted-foreground)] transition-[border-color,box-shadow,background-color] duration-200 focus:outline-none"
                    />
                  </label>

                  <label className="marketplace-control marketplace-sort-pill marketplace-muted flex h-10 items-center gap-3 rounded-xl px-4 text-sm">
                    <span className="whitespace-nowrap font-bold">{t('marketplace.sortLabel')}</span>
                    <select
                      name="marketplaceSort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="theme-native-control h-full bg-transparent text-sm font-bold text-[var(--color-foreground)] focus:outline-none"
                    >
                      <option value="featured">{t('marketplace.sortFeatured')}</option>
                      <option value="popular">{t('marketplace.sortPopular')}</option>
                      <option value="newest">{t('marketplace.sortNewest')}</option>
                      <option value="price_low">{t('marketplace.sortPriceLow')}</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={handleInstallAll}
                    disabled={
                      isInstallingAll ||
                      visibleApps.length === 0 ||
                      visibleApps.every((app) => app.isInstalled)
                    }
                    className="marketplace-primary-action marketplace-toolbar-action inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition-[background-color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  >
                    {isInstallingAll ? (
                      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Zap size={16} className="fill-current" aria-hidden="true" />
                    )}
                    {t('marketplace.activateAll')}
                  </button>
                </div>
                )}
              </div>

              {showAppFilters && (
              <div className="mt-3 lg:hidden">
                <div className="marketplace-mobile-chip-row">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("");
                      setSelectedCollection("ALL");
                      setActiveTab("APPS");
                    }}
                    aria-pressed={selectedCategory === "" && selectedCollection === "ALL" && activeTab === "APPS"}
                    className={`marketplace-mobile-chip rounded-full border px-3 py-1.5 text-xs font-black transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                      selectedCategory === "" && selectedCollection === "ALL" && activeTab === "APPS"
                        ? "marketplace-chip-active"
                        : "marketplace-chip"
                    }`}
                  >
                    {t('marketplace.allTools')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("");
                      setActiveTab("BUNDLES");
                    }}
                    aria-pressed={activeTab === "BUNDLES"}
                    className={`marketplace-mobile-chip rounded-full border px-3 py-1.5 text-xs font-black transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                      activeTab === "BUNDLES"
                        ? "marketplace-chip-active"
                        : "marketplace-chip"
                    }`}
                  >
                    {t('marketplace.savingsBundles')}
                  </button>
                  {toolCollections
                    .filter((collection) => collection.id !== "ALL")
                    .map((collection) => (
                      <button
                        type="button"
                        key={collection.id}
                        onClick={() => {
                          setSelectedCollection(collection.id);
                          setActiveTab("APPS");
                        }}
                        aria-pressed={selectedCollection === collection.id}
                        className={`marketplace-mobile-chip rounded-full border px-3 py-1.5 text-xs font-black transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                          selectedCollection === collection.id && activeTab === "APPS"
                            ? "marketplace-chip-active"
                            : "marketplace-chip"
                        }`}
                      >
                        {collection.label}
                      </button>
                    ))}
                </div>
                {categories.length > 0 && (
                <div className="marketplace-mobile-chip-row marketplace-mobile-chip-row-secondary mt-2">
                  {categories.map((cat) => (
                    <button
                      type="button"
                      key={cat.category}
                      onClick={() => {
                        setSelectedCategory(cat.category);
                        setActiveTab("APPS");
                      }}
                      aria-pressed={selectedCategory === cat.category}
                      className={`marketplace-mobile-chip rounded-full border px-3 py-1.5 text-xs font-black transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                        selectedCategory === cat.category
                          ? "marketplace-chip-active"
                          : "marketplace-chip"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                )}
              </div>
              )}
            </div>

            {/* Content Switcher */}
            {isBundlesTab ? (
              /* Bundles Grid */
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {bundles.map((bundle) => (
                  <article
                    key={bundle.id}
                    className="marketplace-card group relative overflow-hidden rounded-2xl p-4 text-right transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 text-right">
                        <h3 className="marketplace-strong mb-1.5 text-base font-black transition-colors duration-200 group-hover:text-[var(--color-primary)] sm:text-lg">
                          {bundle.name}
                        </h3>
                        <p className="marketplace-muted line-clamp-2 text-sm leading-6">
                          {bundle.description}
                        </p>
                      </div>
                      <div className="marketplace-soft-success shrink-0 rounded-full border px-3 py-1 text-xs font-black">
                        {t('marketplace.savePercent', { percent: bundle.discount })}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-right">
                        <span className="marketplace-strong text-lg font-black">
                          {t('marketplace.bundlePrice', { price: bundle.monthlyPrice })}
                        </span>
                        <span className="marketplace-muted mr-1 text-xs">
                          {t('marketplace.perMonth')}
                        </span>
                      </div>
                      <Link
                        to={`/marketplace/bundle/${bundle.slug}`}
                        className="marketplace-control inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                      >
                        {t('marketplace.bundleDetails')}
                        <ChevronLeft size={16} aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                ))}
                {bundles.length === 0 && (
                  <div className="marketplace-card col-span-full rounded-2xl border-dashed py-10 text-center">
                    <Package size={42} className="marketplace-muted mx-auto mb-4" aria-hidden="true" />
                    <p className="marketplace-muted">{t('marketplace.noBundles')}</p>
                  </div>
                )}
              </div>
            ) : /* Apps Grid */
              loading ? (
                <div className="marketplace-card rounded-2xl py-16 text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-[var(--color-primary)]"></div>
                    <p className="marketplace-muted mt-4">
                    {t('marketplace.loadingTools')}
                  </p>
                </div>
              ) : visibleApps.length === 0 ? (
                <div className="marketplace-card rounded-2xl border-dashed py-16 text-center">
                  <Package size={42} className="marketplace-muted mx-auto mb-4" aria-hidden="true" />
                  <p className="marketplace-muted">
                    {t('marketplace.noTools')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleApps.map((app) => {
                    const Icon = categoryIcons[app.category] || Package;
                    const textIcon = shouldUseTextIcon(app.icon) ? app.icon?.trim() : null;
                    const accessKind = getFeatureAccessKind(app.pricingModel);
                    return (
                      <article
                        key={app.id}
                        className={`marketplace-card group flex min-h-[198px] flex-col rounded-2xl p-4 text-right transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 ${
                          app.isInstalled
                            ? "marketplace-card-active"
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            to={`/marketplace/${app.slug}`}
                            aria-label={t('marketplace.details') + ' ' + app.name}
                            className="marketplace-muted rounded-lg p-1 transition-colors duration-200 hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                          >
                            <Settings size={17} aria-hidden="true" />
                          </Link>

                          <div className="flex min-w-0 flex-1 items-start justify-end gap-3">
                            <div className="min-w-0">
                              <h3 className="marketplace-strong truncate text-base font-black sm:text-lg">
                                {app.name}
                              </h3>
                              <div className="marketplace-muted mt-1 text-xs font-bold">
                                {getDisplayedPrice(app)}
                              </div>
                            </div>
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${app.isInstalled
                                ? "marketplace-soft-success"
                                : "marketplace-soft-primary"
                                }`}
                            >
                              {textIcon || <Icon size={24} aria-hidden="true" />}
                            </div>
                          </div>
                        </div>

                        <p className="marketplace-muted mt-3 line-clamp-3 text-sm font-semibold leading-6">
                          {app.description}
                        </p>

                        <div className="mt-3 flex flex-wrap justify-end gap-1.5">
                          {app.isFeatured && (
                            <span className="marketplace-soft-warning rounded-full border px-2.5 py-1 text-[10px] font-black">
                              {t('marketplace.featured')}
                            </span>
                          )}
                          {app.isInstalled && (
                            <span className="marketplace-soft-success inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black">
                              <Check size={10} strokeWidth={3} aria-hidden="true" />
                              {t('marketplace.installed')}
                            </span>
                          )}
                          <span className="marketplace-chip rounded-full px-2.5 py-1 text-[10px] font-black">
                            {getFeatureAccessLabel(accessKind)}
                          </span>
                          <span className="marketplace-chip rounded-full px-2.5 py-1 text-[10px] font-black">
                            {getToolRoleLabel(app, t)}
                          </span>
                        </div>

                        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                          <Link
                            to={`/marketplace/${app.slug}`}
                            className="marketplace-muted text-xs font-black transition-colors duration-200 hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                          >
                            {t('marketplace.details')}
                          </Link>
                          {app.isInstalled ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-xs font-black text-[var(--color-success)]">
                                <Check size={10} strokeWidth={3} />
                                {t('marketplace.active')}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmUninstallApp(app);
                                }}
                                disabled={uninstallingApp === app.slug}
                                className="inline-flex items-center justify-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-black text-red-500 transition-colors duration-200 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                              >
                                {uninstallingApp === app.slug ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <X size={12} strokeWidth={3} />
                                )}
                                {t('marketplace.deactivate')}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="marketplace-primary-action inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-black transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                              onClick={(e) => handleQuickInstall(e, app)}
                              disabled={installingApp === app.slug}
                            >
                              {installingApp === app.slug ? (
                                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                              ) : (
                                <Zap size={14} className="fill-current" aria-hidden="true" />
                              )}
                              {installingApp === app.slug ? t('marketplace.activatingNow') : t('marketplace.activate')}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
          </main>
        </div>
      </div>
      {/* Pricing Choice Dialog */}
      {showPricingDialog && (() => {
        const DialogIcon = categoryIcons[showPricingDialog.category] || Package;
        const dialogTextIcon = shouldUseTextIcon(showPricingDialog.icon)
          ? showPricingDialog.icon?.trim()
          : null;

        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center overscroll-contain bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
            onClick={() => setShowPricingDialog(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="pricing-dialog-title"
              className="marketplace-panel w-full max-w-md overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200 motion-reduce:animate-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="marketplace-soft-primary flex h-12 w-12 items-center justify-center rounded-xl border text-2xl">
                    {dialogTextIcon || <DialogIcon size={24} aria-hidden="true" />}
                  </div>
                  <div>
                    <h2 id="pricing-dialog-title" className="marketplace-strong text-xl font-bold">
                      {showPricingDialog.name}
                    </h2>
                    <p className="marketplace-muted text-sm">
                      {t('marketplace.choosePricing')}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Subscription Option */}
                  <button
                    type="button"
                    onClick={() => {
                      executeInstall(showPricingDialog, "SUBSCRIPTION");
                      setShowPricingDialog(null);
                    }}
                    disabled={
                      showPricingDialog.isInstalled &&
                      showPricingDialog.activePricingModel === "SUBSCRIPTION"
                    }
                    className={`group relative w-full overflow-hidden rounded-xl border-2 p-4 text-right transition-[background-color,border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${showPricingDialog.isInstalled &&
                      showPricingDialog.activePricingModel === "SUBSCRIPTION"
                      ? "marketplace-filter-active cursor-default"
                      : "marketplace-card hover:border-[var(--color-primary)]"
                      }`}
                  >
                    {showPricingDialog.isInstalled &&
                      showPricingDialog.activePricingModel === "SUBSCRIPTION" && (
                        <div className="marketplace-primary-action absolute top-0 left-0 text-[10px] px-2 py-0.5 rounded-br-lg font-bold">
                          {t('marketplace.currentlyActive')}
                        </div>
                      )}
                    <div className="flex items-center justify-between mb-1">
                      <span className="marketplace-strong font-bold">
                        {showPricingDialog.activePricingModel === "PAY_PER_USE"
                          ? t('marketplace.upgradeToMonthly')
                          : t('marketplace.monthlySubscription')}
                      </span>
                      <span className="font-bold text-[var(--color-primary)]">
                        {(showPricingDialog.monthlyPrice ?? 0) > 0
                          ? t('marketplace.monthlyPrice', { price: showPricingDialog.monthlyPrice })
                          : t('marketplace.freePrice')}
                      </span>
                    </div>
                    <p className="marketplace-muted text-xs">
                      {t('marketplace.subscriptionDesc')}
                    </p>
                  </button>

                {/* Pay Per Use Option */}
                <button
                  type="button"
                  onClick={() => {
                    executeInstall(showPricingDialog, "PAY_PER_USE");
                    setShowPricingDialog(null);
                  }}
                  disabled={
                    showPricingDialog.isInstalled &&
                    showPricingDialog.activePricingModel === "PAY_PER_USE"
                  }
                  className={`group relative w-full overflow-hidden rounded-xl border-2 p-4 text-right transition-[background-color,border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-warning)] ${showPricingDialog.isInstalled &&
                    showPricingDialog.activePricingModel === "PAY_PER_USE"
                    ? "marketplace-soft-warning cursor-default"
                    : "marketplace-card hover:border-[var(--color-warning)]"
                    }`}
                >
                    {showPricingDialog.isInstalled &&
                      showPricingDialog.activePricingModel === "PAY_PER_USE" && (
                        <div className="absolute top-0 left-0 rounded-br-lg bg-[var(--color-warning)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-warning-foreground)]">
                          {t('marketplace.currentlyActive')}
                        </div>
                      )}
                  <div className="flex items-center justify-between mb-1">
                    <span className="marketplace-strong flex items-center gap-1 font-bold">
                      {t('marketplace.payPerUseLabel')}
                      <Zap size={14} className="fill-current text-[var(--color-warning)]" aria-hidden="true" />
                    </span>
                    <span className="font-bold text-[var(--color-warning)]">
                      {showPricingDialog.unitPrice || 0} {t('marketplace.currencyUnit')} /{" "}
                      {showPricingDialog.unitName || t('marketplace.perUnit')}
                    </span>
                  </div>
                  <p className="marketplace-muted text-xs">
                    {t('marketplace.payPerUseDesc')}
                  </p>
                </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPricingDialog(null)}
                  className="marketplace-control marketplace-muted mt-6 w-full rounded-xl py-3 text-sm font-medium transition-colors duration-200 hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  {t('marketplace.cancel')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Uninstall Confirmation Dialog */}
      {confirmUninstallApp && (() => {
        const app = confirmUninstallApp;
        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center overscroll-contain bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
            onClick={() => setConfirmUninstallApp(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="uninstall-dialog-title"
              className="marketplace-panel w-full max-w-md overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200 motion-reduce:animate-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle size={28} className="text-red-600" />
                </div>

                <h2
                  id="uninstall-dialog-title"
                  className="text-center text-xl font-black"
                >
                  {t('marketplace.deactivateTitle', { name: app.name })}
                </h2>

                <p className="mt-3 text-center text-sm leading-6 text-[var(--color-muted-foreground)]">
                  {t('marketplace.deactivateConfirm')}
                  <br />
                  {t('marketplace.deactivateWarning')}
                </p>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmUninstallApp(null)}
                    disabled={uninstallingApp === app.slug}
                    className="flex-1 rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-black transition-colors duration-200 hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  >
                    {t('marketplace.goBack')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUninstall(app)}
                    disabled={uninstallingApp === app.slug}
                    className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white transition-colors duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    {uninstallingApp === app.slug ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        {t('marketplace.activating')}
                      </span>
                    ) : (
                      t('marketplace.confirmDeactivation')
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
