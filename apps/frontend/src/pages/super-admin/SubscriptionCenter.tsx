import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "../../components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../components/ui/table";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Separator } from "../../components/ui/separator";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "../../components/ui/tooltip";
import { Progress } from "../../components/ui/progress";
import { Checkbox } from "../../components/ui/checkbox";
import { ScrollArea } from "../../components/ui/scroll-area";
import {
  DeferredResponsiveContainer,
} from "../../components/ui/DeferredResponsiveContainer";
import { appSchema, pricingRuleSchema, enterprisePlanSchema } from "../../../backend/validators/marketplaceManagementValidator";
import { buildApiUrl } from "../../utils/urlHelper";
import axios from "axios";
import { toast } from "sonner";
import type { StorefrontThemeCatalogItem } from "../../services/storefrontThemeCatalogService";
import tokenManager from "../../utils/tokenManager";
import SuperAdminPaymentSettings from "./SuperAdminPaymentSettings";
import AppPricingSheet from "../subscription/AppPricingSheet";
import {
  Check, X, Plus, Pencil, Trash2, Download, Upload, RefreshCw, Save, Search, Eye, Archive, DollarSign, ShoppingBag, Package, Building2, Store, CreditCard,
} from "lucide-react";

type SubscriptionCenterProps = {
  initialTab?: number;
  storefrontThemesOnly?: boolean;
  pageTitle?: string;
  pageDescription?: string;
};

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

type Primitive = string | number | boolean | null;
type CatalogMeta = Record<string, unknown>;
type BillingCycle = "monthly" | "quarterly" | "yearly" | string;
type PricingModel = "FREE" | "SUBSCRIPTION" | "PAY_PER_USE" | string;
type MarketplaceItemType = "app" | "pricing" | "bundle" | "enterprise";

type PlatformPlanStats = {
  activeCompanies?: number;
};

type PlatformPlanFeatures = {
  maxUsers: number;
  maxCustomers: number;
  maxConversations: number;
  maxMessages: number;
  aiResponses: number;
  customBranding: boolean;
  advancedReports: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  customIntegrations: boolean;
  whatsappBusiness: boolean;
  facebookMessenger: boolean;
  webChat: boolean;
  mobileApp: boolean;
  multiLanguage: boolean;
  customFields: number;
  automatedWorkflows: number;
  dataRetention: number;
  storageLimit: number;
  exportData: boolean;
  dedicatedSupport: boolean;
  customDevelopment: boolean;
  onPremiseDeployment: boolean;
  sla: string;
  accountManager?: string;
  [key: string]: string | number | boolean | undefined;
};

type PlatformPlan = {
  id?: string;
  planType: string;
  name: string;
  nameEn?: string;
  price?: number;
  currency?: string;
  billingCycle?: BillingCycle;
  description?: string;
  descriptionEn?: string;
  features?: PlatformPlanFeatures | string | null;
  stats?: PlatformPlanStats;
  isCustom?: boolean;
};

type MarketplaceAppReference = string | { id?: string; name?: string; category?: string };

type MarketplaceInstallCounts = {
  installations?: number;
};

type EnterpriseCompany = {
  name?: string;
  email?: string;
};

type MarketplaceManagementItem = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  trialDays?: number;
  category?: string;
  isActive?: boolean;
  isPublic?: boolean;
  isFeatured?: boolean;
  isPopular?: boolean;
  isAutoInstall?: boolean;
  logo?: string;
  icon?: string;
  coverImage?: string;
  mainRoute?: string;
  adminRoute?: string;
  pricingModel?: PricingModel;
  unitPrice?: number;
  unitName?: string;
  feature?: string;
  price?: number;
  unit?: string;
  discount?: number;
  apps?: MarketplaceAppReference[];
  companyId?: string;
  company?: EnterpriseCompany;
  features?: unknown;
  _count?: MarketplaceInstallCounts;
  installCount?: number;
  rating?: number;
};

type MarketplaceDialogFormData = Omit<
  MarketplaceManagementItem,
  "features" | "apps"
> & {
  features: string[];
  apps: MarketplaceAppReference[];
};

type PlanFormData = {
  planType: string;
  name: string;
  nameEn: string;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  description: string;
  descriptionEn: string;
  features: PlatformPlanFeatures;
};

type NumericPlanFeatureKey =
  | "maxUsers"
  | "maxCustomers"
  | "maxConversations"
  | "maxMessages"
  | "aiResponses"
  | "customFields"
  | "automatedWorkflows"
  | "dataRetention"
  | "storageLimit";

type BooleanPlanFeatureKey =
  | "customBranding"
  | "advancedReports"
  | "apiAccess"
  | "prioritySupport"
  | "customIntegrations"
  | "whatsappBusiness"
  | "facebookMessenger"
  | "webChat"
  | "mobileApp"
  | "multiLanguage"
  | "exportData"
  | "dedicatedSupport"
  | "customDevelopment"
  | "onPremiseDeployment";

type PlanFieldErrorKey =
  | keyof Omit<PlanFormData, "features">
  | keyof PlatformPlanFeatures;

type PlanFieldErrors = Partial<Record<PlanFieldErrorKey, string>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  if (
    isRecord(error) &&
    "response" in error &&
    isRecord(error["response"]) &&
    "data" in error["response"] &&
    isRecord(error["response"]["data"]) &&
    typeof error["response"]["data"]["message"] === "string"
  ) {
    return error["response"]["data"]["message"] as string;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};

const createDefaultPlanFeatures = (): PlatformPlanFeatures => ({
  maxUsers: 5,
  maxCustomers: 1000,
  maxConversations: 5000,
  maxMessages: 50000,
  aiResponses: 1000,
  customBranding: false,
  advancedReports: false,
  apiAccess: false,
  prioritySupport: false,
  customIntegrations: false,
  whatsappBusiness: true,
  facebookMessenger: true,
  webChat: true,
  mobileApp: false,
  multiLanguage: false,
  customFields: 10,
  automatedWorkflows: 5,
  dataRetention: 90,
  storageLimit: 1,
  exportData: false,
  dedicatedSupport: false,
  customDevelopment: false,
  onPremiseDeployment: false,
  sla: "99.9%",
  accountManager: "",
});

const parsePlanFeatures = (value: unknown): PlatformPlanFeatures => {
  const defaults = createDefaultPlanFeatures();

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isRecord(parsed)
        ? { ...defaults, ...(parsed as Partial<PlatformPlanFeatures>) }
        : defaults;
    } catch {
      return defaults;
    }
  }

  if (isRecord(value)) {
    return { ...defaults, ...(value as Partial<PlatformPlanFeatures>) };
  }

  return defaults;
};

const parseStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeBundleApps = (value: unknown): MarketplaceAppReference[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is MarketplaceAppReference =>
      typeof entry === "string" ||
      (isRecord(entry) &&
        (entry.name === undefined || typeof entry.name === "string") &&
        (entry.category === undefined || typeof entry.category === "string") &&
        (entry.id === undefined || typeof entry.id === "string")),
  );
};

const getBundleAppLabel = (app: MarketplaceAppReference): string =>
  typeof app === "string" ? app : app.name || app.id || "تطبيق";

const getBundleAppCategory = (app: MarketplaceAppReference): string =>
  typeof app === "string" ? "" : app.category || "";

const createDefaultMarketplaceFormData = (
  type: MarketplaceItemType,
): MarketplaceDialogFormData => ({
  name: "",
  slug: "",
  description: "",
  monthlyPrice: 0,
  yearlyPrice: 0,
  trialDays: 0,
  category: "ECOMMERCE",
  isActive: true,
  isPublic: true,
  isFeatured: false,
  isPopular: false,
  isAutoInstall: false,
  logo: "",
  icon: "",
  coverImage: "",
  mainRoute: "",
  adminRoute: "",
  pricingModel: "SUBSCRIPTION",
  unitPrice: 0,
  unitName: "",
  feature: type === "pricing" ? "" : undefined,
  price: type === "pricing" ? 0 : undefined,
  unit: type === "pricing" ? "" : undefined,
  discount: type === "bundle" ? 0 : undefined,
  apps: [],
  companyId: "",
  features: [],
});

const createDefaultPlanFormData = (): PlanFormData => ({
  planType: "",
  name: "",
  nameEn: "",
  price: 0,
  currency: "EGP",
  billingCycle: "monthly",
  description: "",
  descriptionEn: "",
  features: createDefaultPlanFeatures(),
});

const SubscriptionCenter: React.FC<SubscriptionCenterProps> = ({
  initialTab = 1,
  storefrontThemesOnly = false,
  pageTitle = "مركز إدارة الاشتراكات والفوترة",
  pageDescription = "إدارة الخطط الأساسية، تطبيقات المتجر، والعروض المخصصة للمؤسسات",
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);






  // Marketplace State
  const [apps, setApps] = useState<MarketplaceManagementItem[]>([]);
  const [pricingRules, setPricingRules] = useState<MarketplaceManagementItem[]>(
    [],
  );
  const [bundles, setBundles] = useState<MarketplaceManagementItem[]>([]);
  const [enterprisePlans, setEnterprisePlans] = useState<
    MarketplaceManagementItem[]
  >([]);
  const [storefrontThemes, setStorefrontThemes] = useState<
    StorefrontThemeCatalogItem[]
  >([]);
  const [catalogDiff, setCatalogDiff] = useState<CatalogDiffPayload | null>(
    null,
  );
  const [catalogDiffLoading, setCatalogDiffLoading] = useState(false);
  const [catalogDiffError, setCatalogDiffError] = useState<string | null>(null);
  const [marketplaceDialog, setMarketplaceDialog] = useState(false);
  const [editingItem, setEditingItem] =
    useState<MarketplaceManagementItem | null>(null);

  const fetchCatalogDiff = useCallback(
    async ({ showToast = false }: { showToast?: boolean } = {}) => {
    setCatalogDiffLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(
        buildApiUrl("super-admin/marketplace-management/catalog/diff"),
        { headers },
      );

      if (response.data?.success) {
        setCatalogDiff(response.data.data as CatalogDiffPayload);
        setCatalogDiffError(null);
        if (showToast) {
          toast.success("تم تحديث تقرير الفرق بين الملفات وقاعدة البيانات");
        }
      } else {
        setCatalogDiff(null);
        setCatalogDiffError("فشل في جلب تقرير الفرق");
        if (showToast) {
          toast.error("فشل في جلب تقرير الفرق");
        }
      }
    } catch (err: unknown) {
      console.error("Catalog diff fetch error:", err);
      setCatalogDiff(null);
      setCatalogDiffError(getErrorMessage(err, "تعذر جلب تقرير الفرق"));
      if (showToast) {
        toast.error("تعذر جلب تقرير الفرق");
      }
    } finally {
      setCatalogDiffLoading(false);
    }
    },
    [],
  );

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      if (storefrontThemesOnly) {
        const themesRes = await axios.get(
          buildApiUrl("super-admin/storefront-theme-catalog"),
          { headers },
        );

        if (themesRes.data?.success) {
          setStorefrontThemes(themesRes.data.data as StorefrontThemeCatalogItem[]);
          setError(null);
        } else {
          setStorefrontThemes([]);
          setError("فشل في جلب كتالوج قوالب المتجر");
        }

        return;
      }

      const [

        appsRes,
        pricingRes,
        bundlesRes,
        enterpriseRes,
        themesRes,
      ] = await Promise.allSettled([

        axios.get(buildApiUrl("super-admin/marketplace-management/apps"), {
          headers,
        }),
        axios.get(
          buildApiUrl("super-admin/marketplace-management/pricing-rules"),
          { headers },
        ),
        axios.get(buildApiUrl("super-admin/marketplace-management/bundles"), {
          headers,
        }),
        axios.get(
          buildApiUrl("super-admin/marketplace-management/enterprise-plans"),
          { headers },
        ),
        axios.get(buildApiUrl("super-admin/storefront-theme-catalog"), {
          headers,
        }),
      ]);




      if (appsRes.status === "fulfilled" && appsRes.value.data.success) {
        setApps(appsRes.value.data.data as MarketplaceManagementItem[]);
      }
      if (pricingRes.status === "fulfilled" && pricingRes.value.data.success) {
        setPricingRules(pricingRes.value.data.data as MarketplaceManagementItem[]);
      }
      if (bundlesRes.status === "fulfilled" && bundlesRes.value.data.success) {
        setBundles(bundlesRes.value.data.data as MarketplaceManagementItem[]);
      }
      if (
        enterpriseRes.status === "fulfilled" &&
        enterpriseRes.value.data.success
      ) {
        setEnterprisePlans(
          enterpriseRes.value.data.data as MarketplaceManagementItem[],
        );
      }
      if (themesRes.status === "fulfilled" && themesRes.value.data.success) {
        setStorefrontThemes(themesRes.value.data.data as StorefrontThemeCatalogItem[]);
      }

      const allFailed = [
        appsRes,
        pricingRes,
        bundlesRes,
        enterpriseRes,
        themesRes,
      ].every((result) => result.status === "rejected");

      setError(allFailed ? "فشل في جلب البيانات الموحدة للاشتراكات" : null);

      // Catalog diff is operational telemetry; keep it separate from base data.
      void fetchCatalogDiff();
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(
        storefrontThemesOnly
          ? "فشل في جلب كتالوج قوالب المتجر"
          : "فشل في جلب البيانات الموحدة للاشتراكات",
      );
    } finally {
      setLoading(false);
    }
  }, [fetchCatalogDiff, storefrontThemesOnly]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا العنصر؟")) return;
    try {
      const headers = getAuthHeaders();
      const typePath =
        activeTab === 1
          ? "apps"
          : editingItem?.feature
            ? "pricing-rules"
            : "bundles";

      await axios.delete(
        buildApiUrl(`super-admin/marketplace-management/${typePath}/${id}`),
        { headers },
      );
      toast.success("تم الحذف بنجاح");
      await fetchAllData();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("خطأ في الحذف");
    }
  }, [activeTab, editingItem, fetchAllData]);

  useEffect(() => {
    void fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (newValue: string) => {
    setActiveTab(Number(newValue));
  };

  if (loading)
    return (
      <div className="flex justify-center p-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );

  return (
    <div className="p-3">
      <div className="mb-4">
        <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
          {pageTitle}
        </h4>
        <p className="text-base leading-7 text-muted-foreground">
          {pageDescription}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-3">
          {error}
        </Alert>
      )}

      {!storefrontThemesOnly ? (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm mb-3 overflow-x-auto">
          <div className="flex gap-1 p-1" role="tablist">
            <Button variant={activeTab === 1 ? "default" : "ghost"} size="sm" onClick={() => setActiveTab(1)} role="tab" aria-selected={activeTab === 1}><ShoppingBag className="h-4 w-4 ml-1" />تطبيقات المتجر</Button>
            <Button variant={activeTab === 2 ? "default" : "ghost"} size="sm" onClick={() => setActiveTab(2)} role="tab" aria-selected={activeTab === 2}><Package className="h-4 w-4 ml-1" />الباقات والأسعار</Button>
            <Button variant={activeTab === 3 ? "default" : "ghost"} size="sm" onClick={() => setActiveTab(3)} role="tab" aria-selected={activeTab === 3}><Building2 className="h-4 w-4 ml-1" />تعاقدات المؤسسات</Button>
            <Button variant={activeTab === 4 ? "default" : "ghost"} size="sm" onClick={() => setActiveTab(4)} role="tab" aria-selected={activeTab === 4}><Store className="h-4 w-4 ml-1" />قوالب المتجر</Button>
            <Button variant={activeTab === 5 ? "default" : "ghost"} size="sm" onClick={() => setActiveTab(5)} role="tab" aria-selected={activeTab === 5}><CreditCard className="h-4 w-4 ml-1" />إعدادات الدفع</Button>
            <Button variant={activeTab === 6 ? "default" : "ghost"} size="sm" onClick={() => setActiveTab(6)} role="tab" aria-selected={activeTab === 6}><DollarSign className="h-4 w-4 ml-1" />أسعار التطبيقات</Button>
          </div>
        </div>
      ) : null}











      {!storefrontThemesOnly && activeTab === 1 && (
        <MarketplaceAppsTab
          apps={apps}
          catalogDiff={catalogDiff}
          catalogDiffLoading={catalogDiffLoading}
          catalogDiffError={catalogDiffError}
          onEdit={(app) => {
            setEditingItem(app);
            setMarketplaceDialog(true);
          }}
          onDelete={handleDelete}
          onRefresh={fetchAllData}
          onRefreshCatalogDiff={() => fetchCatalogDiff({ showToast: true })}
        />
      )}
      {!storefrontThemesOnly && activeTab === 2 && (
        <BundlesAndPricingTab
          pricingRules={pricingRules}
          bundles={bundles}
          onEdit={(item) => {
            setEditingItem(item);
            setMarketplaceDialog(true);
          }}
          onDelete={handleDelete}
          onRefresh={fetchAllData}
        />
      )}
      {!storefrontThemesOnly && activeTab === 3 && (
        <EnterprisePlansTab
          enterprisePlans={enterprisePlans}
          onEdit={(plan) => {
            setEditingItem(plan);
            setMarketplaceDialog(true);
          }}
          onRefresh={fetchAllData}
        />
      )}
      {(storefrontThemesOnly || activeTab === 4) && (
        <StorefrontThemesTab
          themes={storefrontThemes}
          onRefresh={fetchAllData}
        />
      )}
      {!storefrontThemesOnly && activeTab === 5 && (
        <div className="p-3">
          <SuperAdminPaymentSettings />
        </div>
      )}
      {!storefrontThemesOnly && activeTab === 6 && (
        <AppPricingSheet />
      )}

      {/* Marketplace Item Dialog */}
      {marketplaceDialog && (
        <MarketplaceItemDialog
          open={marketplaceDialog}
          onClose={() => {
            setMarketplaceDialog(false);
            setEditingItem(null);
          }}
          item={editingItem}
          type={
            activeTab === 1
              ? "app"
              : activeTab === 3
                ? "enterprise"
                : editingItem?.feature
                  ? "pricing"
                  : "bundle"
          }
          availableApps={apps}
          onSave={async (itemData) => {
            try {
              const headers = getAuthHeaders();
              let typePath = "apps";
              if (activeTab === 1) typePath = "apps";
              else if (activeTab === 2)
                typePath = editingItem?.feature ? "pricing-rules" : "bundles";
              else if (activeTab === 3) typePath = "enterprise-plans";

              const { apps: _apps, ...restData } = itemData;
              const payload =
                typePath === "bundles"
                  ? {
                      ...restData,
                      appIds: _apps.map((app) =>
                        typeof app === "string" ? app : app.slug || app.id || "",
                      ).filter(Boolean),
                    }
                  : restData;

              if (editingItem?.id) {
                await axios.put(
                  buildApiUrl(
                    `super-admin/marketplace-management/${typePath}/${editingItem.id}`,
                  ),
                  payload,
                  { headers },
                );
              } else {
                await axios.post(
                  buildApiUrl(`super-admin/marketplace-management/${typePath}`),
                  payload,
                  { headers },
                );
              }

              toast.success("تم الحفظ بنجاح");
              setMarketplaceDialog(false);
              setEditingItem(null);
              await fetchAllData();
            } catch (err) {
              const axiosErr = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
              const serverMsg = axiosErr?.response?.data?.message || "";
              const serverErrors = axiosErr?.response?.data?.errors;
              console.error("Marketplace save error:", err, "Server response:", axiosErr?.response?.data);
              toast.error(serverMsg || "خطأ في الحفظ");
              if (serverErrors) console.error("Validation errors:", serverErrors);
            }
          }}
        />
      )}


























    </div>
  );
};

// Sub-components for Tabs



















































































































































































































type CatalogDiffFieldChange = {
  field: string;
  catalog: unknown;
  db: unknown;
};

type CatalogDiffEntityDetails = {
  slug: string;
  changes: CatalogDiffFieldChange[];
};

type CatalogDiffSection = {
  missingInDb: string[];
  extraInDb: string[];
  changed: CatalogDiffEntityDetails[];
};

type CatalogDiffPayload = {
  comparedAt: string;
  catalogMeta?: CatalogMeta;
  totals?: {
    catalogApps: number;
    dbApps: number;
    catalogBundles: number;
    dbBundles: number;
    diffEntries: number;
  };
  apps?: CatalogDiffSection;
  bundles?: CatalogDiffSection;
};

const MarketplaceAppsTab = ({
  apps,
  catalogDiff,
  catalogDiffLoading,
  catalogDiffError,
  onEdit,
  onDelete,
  onRefresh,
  onRefreshCatalogDiff,
}: {
  apps: MarketplaceManagementItem[];
  catalogDiff: CatalogDiffPayload | null;
  catalogDiffLoading: boolean;
  catalogDiffError: string | null;
  onEdit: (app: MarketplaceManagementItem) => void;
  onDelete: (id: string) => void;
  onRefresh: () => Promise<void> | void;
  onRefreshCatalogDiff: () => void;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("installations");
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [showCatalogDiffDetails, setShowCatalogDiffDetails] = useState(false);

  const formatDiffValue = (value: unknown) => {
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(", ") : "[]";
    }
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  // Get unique categories
  const categories = [
    "ALL",
    ...new Set(
      apps
        .map((app) => app.category)
        .filter((category): category is string => Boolean(category)),
    ),
  ];

  // Filter and sort apps
  const filteredApps = apps
    .filter((app) => {
      const matchesSearch =
        app.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "ALL" || app.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price":
          return (b.monthlyPrice || 0) - (a.monthlyPrice || 0);
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "installations":
          return (
            (b._count?.installations || b.installCount || 0) -
            (a._count?.installations || a.installCount || 0)
          );
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        default:
          return 0;
      }
    });

  // Calculate statistics
  const totalInstallations = apps.reduce(
    (sum, app) => sum + (app._count?.installations || app.installCount || 0),
    0,
  );
  const totalMonthlyRevenue = apps.reduce((sum, app) => {
    const installs = app._count?.installations || app.installCount || 0;
    return sum + installs * (app.monthlyPrice || 0);
  }, 0);
  const activeApps = apps.filter((app) => app.isActive).length;
  const featuredApps = apps.filter((app) => app.isFeatured).length;
  const appDiffEntries =
    (catalogDiff?.apps?.missingInDb?.length || 0) +
    (catalogDiff?.apps?.extraInDb?.length || 0) +
    (catalogDiff?.apps?.changed?.length || 0);
  const bundleDiffEntries =
    (catalogDiff?.bundles?.missingInDb?.length || 0) +
    (catalogDiff?.bundles?.extraInDb?.length || 0) +
    (catalogDiff?.bundles?.changed?.length || 0);
  const hasDiffData = Boolean(catalogDiff?.totals);
  const comparedAtLabel = catalogDiff?.comparedAt
    ? new Date(catalogDiff.comparedAt).toLocaleString("ar-EG")
    : "غير متاح";

  const categoryLabels: { [key: string]: string } = {
    ALL: "جميع الفئات",
    ECOMMERCE: "التجارة الإلكترونية",
    ["A" + "I"]: "الأتمتة",
    CRM: "إدارة العملاء",
    COMMUNICATION: "التواصل",
    ANALYTICS: "التحليلات",
    MARKETING: "التسويق",
    HR: "الموارد البشرية",
    FINANCE: "المالية",
    INTEGRATION: "التكاملات",
    PRODUCTIVITY: "الإنتاجية",
    GAMIFICATION: "التحفيز",
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      ECOMMERCE: "#3b82f6",
      ["A" + "I"]: "#8b5cf6",
      CRM: "#10b981",
      COMMUNICATION: "#f59e0b",
      ANALYTICS: "#ef4444",
      MARKETING: "#ec4899",
      HR: "#06b6d4",
      FINANCE: "#84cc16",
      INTEGRATION: "#6366f1",
      PRODUCTIVITY: "#14b8a6",
      GAMIFICATION: "#f97316",
    };
    return colors[category] || "#6b7280";
  };

  const calculateAppRevenue = (app: MarketplaceManagementItem) => {
    const installs = app._count?.installations || app.installCount || 0;
    return installs * (app.monthlyPrice || 0);
  };

  const handleQuickToggle = async (
    app: MarketplaceManagementItem,
    field: "isActive" | "isFeatured",
    value: boolean,
  ) => {
    try {
      await axios.put(
        buildApiUrl(`super-admin/marketplace-management/apps/${app.id}`),
        { [field]: value },
        { headers: getAuthHeaders() },
      );
      toast.success(
        `تم ${value ? "تفعيل" : "تعطيل"} ${field === "isActive" ? "التطبيق" : "الميزة"} بنجاح`,
      );
      onRefresh();
    } catch (err) {
      toast.error("خطأ في التحديث");
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(
        buildApiUrl("super-admin/marketplace-management/export"),
        {
          headers: getAuthHeaders(),
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `marketplace-config-${new Date().toISOString().split("T")[0]}.json`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("تم تصدير الإعدادات بنجاح");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("فشل في تصدير الإعدادات");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(
        buildApiUrl("super-admin/marketplace-management/import"),
        formData,
        {
          headers: getAuthHeaders({
            "Content-Type": "multipart/form-data",
          }),
        },
      );
      toast.success("تم استيراد الإعدادات بنجاح");
      onRefresh();
    } catch (err) {
      console.error("Import error:", err);
      toast.error("فشل في استيراد الإعدادات");
    }
  };

  return (
    <div>
      {/* Statistics Dashboard */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-3 mb-3" style={{ backgroundColor: "#f3e8ff", color: "#581c87" }}>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-6 md:col-span-3">
            <h4 className="scroll-m-20 text-xl font-semibold tracking-tight font-bold">
              {apps.length}
            </h4>
            <p className="text-sm leading-6">إجمالي التطبيقات</p>
          </div>
          <div className="col-span-6 md:col-span-3">
            <h4 className="scroll-m-20 text-xl font-semibold tracking-tight font-bold">
              {totalInstallations.toLocaleString()}
            </h4>
            <p className="text-sm leading-6">إجمالي التثبيتات</p>
          </div>
          <div className="col-span-6 md:col-span-3">
            <h4 className="scroll-m-20 text-xl font-semibold tracking-tight font-bold">
              {totalMonthlyRevenue.toLocaleString()} ج.م
            </h4>
            <p className="text-sm leading-6">إيرادات شهرية</p>
          </div>
          <div className="col-span-6 md:col-span-3">
            <h4 className="scroll-m-20 text-xl font-semibold tracking-tight font-bold">
              {activeApps}
            </h4>
            <p className="text-sm leading-6">نشط | {featuredApps} مميز</p>
          </div>
        </div>
      </div>

      {/* Catalog Diff (Files vs DB) */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-2 mb-3" style={{ borderColor: (catalogDiff?.totals?.diffEntries || 0) > 0 ? "#fbbf24" : "#86efac" }}>
        <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-1 mb-1.5">
          <div>
            <h6 className="text-base font-semibold leading-none font-bold">
              فرق الكاتالوج (Files vs DB)
            </h6>
            <span className="text-xs text-muted-foreground">
              آخر مقارنة: {comparedAtLabel}
            </span>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={onRefreshCatalogDiff} disabled={catalogDiffLoading}>
              <RefreshCw className="h-4 w-4 ml-1" />
              {catalogDiffLoading ? "جارٍ التحديث..." : "تحديث"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCatalogDiffDetails((prev) => !prev)} disabled={!hasDiffData}>
              {showCatalogDiffDetails ? "إخفاء التفاصيل" : "عرض التفاصيل"}
            </Button>
          </div>
        </div>

        {catalogDiffError && (
          <Alert variant="default" className="mb-1.5 border-yellow-500/50 text-yellow-700">
            {catalogDiffError}
          </Alert>
        )}

        {hasDiffData ? (
          <div className="grid grid-cols-12 gap-1">
            <div className="col-span-6 md:col-span-4">
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-1.5">
                <span className="text-xs text-muted-foreground">إجمالي الفرق</span>
                <h6 className="text-base font-semibold leading-none font-bold">{catalogDiff?.totals?.diffEntries || 0}</h6>
              </div>
            </div>
            <div className="col-span-6 md:col-span-4">
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-1.5">
                <span className="text-xs text-muted-foreground">Apps (Catalog/DB)</span>
                <h6 className="text-base font-semibold leading-none font-bold">{catalogDiff?.totals?.catalogApps || 0}/{catalogDiff?.totals?.dbApps || 0}</h6>
              </div>
            </div>
            <div className="col-span-6 md:col-span-4">
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-1.5">
                <span className="text-xs text-muted-foreground">Bundles (Catalog/DB)</span>
                <h6 className="text-base font-semibold leading-none font-bold">{catalogDiff?.totals?.catalogBundles || 0}/{catalogDiff?.totals?.dbBundles || 0}</h6>
              </div>
            </div>
            <div className="col-span-6 md:col-span-4">
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-1.5">
                <span className="text-xs text-muted-foreground">فروقات التطبيقات</span>
                <h6 className="text-base font-semibold leading-none font-bold">{appDiffEntries}</h6>
              </div>
            </div>
            <div className="col-span-6 md:col-span-4">
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-1.5">
                <span className="text-xs text-muted-foreground">فروقات الباقات</span>
                <h6 className="text-base font-semibold leading-none font-bold">{bundleDiffEntries}</h6>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">لا توجد بيانات فرق متاحة حالياً.</p>
        )}

        {showCatalogDiffDetails && hasDiffData && (
          <div>
            <Separator className="my-2" />
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-12 md:col-span-6">
                <p className="text-sm font-medium text-muted-foreground font-bold">تطبيقات</p>
                <div className="mb-1">
                  <span className="text-xs text-muted-foreground">موجود بالملفات وغير موجود في DB ({catalogDiff?.apps?.missingInDb?.length || 0})</span>
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {(catalogDiff?.apps?.missingInDb || []).map((slug) => (
                      <Badge key={`app-miss-${slug}`} variant="default" className="bg-amber-500 text-xs">{slug}</Badge>
                    ))}
                  </div>
                </div>
                <div className="mb-1">
                  <span className="text-xs text-muted-foreground">موجود في DB وغير موجود بالملفات ({catalogDiff?.apps?.extraInDb?.length || 0})</span>
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {(catalogDiff?.apps?.extraInDb || []).map((slug) => (
                      <Badge key={`app-extra-${slug}`} variant="default" className="bg-blue-500 text-xs">{slug}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">عناصر مختلفة ({catalogDiff?.apps?.changed?.length || 0})</span>
                  <ul className="space-y-1 mt-0.5" style={{ maxHeight: 220, overflow: "auto" }}>
                    {(catalogDiff?.apps?.changed || []).map((entry) => (
                      <li key={`app-changed-${entry.slug}`} className="block py-0.5">
                        <p className="text-sm leading-6 font-bold">{entry.slug}</p>
                        {(entry.changes || []).slice(0, 3).map((change) => (
                          <span key={`${entry.slug}-${change.field}`} className="text-xs text-muted-foreground block">
                            {change.field}: [{formatDiffValue(change.catalog)}] {"->"} [{formatDiffValue(change.db)}]
                          </span>
                        ))}
                        {(entry.changes || []).length > 3 && (
                          <span className="text-xs text-muted-foreground block">+{entry.changes.length - 3} تغييرات إضافية</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="col-span-12 md:col-span-6">
                <p className="text-sm font-medium text-muted-foreground font-bold">باقات</p>
                <div className="mb-1">
                  <span className="text-xs text-muted-foreground">موجود بالملفات وغير موجود في DB ({catalogDiff?.bundles?.missingInDb?.length || 0})</span>
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {(catalogDiff?.bundles?.missingInDb || []).map((slug) => (
                      <Badge key={`bundle-miss-${slug}`} variant="default" className="bg-amber-500 text-xs">{slug}</Badge>
                    ))}
                  </div>
                </div>
                <div className="mb-1">
                  <span className="text-xs text-muted-foreground">موجود في DB وغير موجود بالملفات ({catalogDiff?.bundles?.extraInDb?.length || 0})</span>
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {(catalogDiff?.bundles?.extraInDb || []).map((slug) => (
                      <Badge key={`bundle-extra-${slug}`} variant="default" className="bg-blue-500 text-xs">{slug}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">عناصر مختلفة ({catalogDiff?.bundles?.changed?.length || 0})</span>
                  <ul className="space-y-1 mt-0.5" style={{ maxHeight: 220, overflow: "auto" }}>
                    {(catalogDiff?.bundles?.changed || []).map((entry) => (
                      <li key={`bundle-changed-${entry.slug}`} className="block py-0.5">
                        <p className="text-sm leading-6 font-bold">{entry.slug}</p>
                        {(entry.changes || []).slice(0, 3).map((change) => (
                          <span key={`${entry.slug}-${change.field}`} className="text-xs text-muted-foreground block">
                            {change.field}: [{formatDiffValue(change.catalog)}] {"->"} [{formatDiffValue(change.db)}]
                          </span>
                        ))}
                        {(entry.changes || []).length > 3 && (
                          <span className="text-xs text-muted-foreground block">+{entry.changes.length - 3} تغييرات إضافية</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-2 mb-3">
        <div className="grid grid-cols-12 gap-2 items-center">
          <div className="col-span-12 md:col-span-4">
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2">🔍</span>
              <Input className="w-full pr-10" placeholder="البحث في التطبيقات..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="col-span-12 md:col-span-3">
            <div className="space-y-2">
              <Label>الترتيب</Label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="installations">الأكثر تثبيتاً</SelectItem>
                  <SelectItem value="price">الأعلى سعراً</SelectItem>
                  <SelectItem value="rating">الأعلى تقييماً</SelectItem>
                  <SelectItem value="name">الاسم</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="col-span-12 md:col-span-5">
            <div className="flex gap-1">
              <Button className="w-full" variant="default" onClick={() => onEdit(null)}>
                <Plus className="h-4 w-4 ml-1" />إضافة
              </Button>
              <Button variant="outline" onClick={handleExport} style={{ minWidth: 100 }}>
                <Download className="h-4 w-4 ml-1" />تصدير
              </Button>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <Button variant="outline" style={{ minWidth: 100 }} asChild>
                  <span>
                    <Upload className="h-4 w-4 ml-1" />استيراد
                  </span>
                </Button>
                <input type="file" hidden accept=".json" onChange={handleImport} />
              </label>
            </div>
          </div>
        </div>
        {filteredApps.length !== apps.length && (
          <span className="text-xs text-muted-foreground block mt-1">عرض {filteredApps.length} من {apps.length} تطبيق</span>
        )}
      </div>

      {/* Category Tabs + Apps Grid Layout */}
      <div className="grid grid-cols-12 gap-2">
        {/* Side Category Tabs */}
        <div className="col-span-12 md:col-span-2">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm" style={{ minHeight: 400 }}>
            <div className="flex flex-col border-l border-border">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`flex items-center gap-1 w-full text-right px-1 py-3 text-sm transition-colors ${categoryFilter === cat ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-accent/50"}`}
                  style={{ borderRight: categoryFilter === cat ? `3px solid ${cat === "ALL" ? "#6b7280" : getCategoryColor(cat)}` : "3px solid transparent" }}
                >
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat === "ALL" ? "#6b7280" : getCategoryColor(cat) }} />
                  <span className="flex-1 text-right text-sm">{categoryLabels[cat] || cat}</span>
                  <Badge variant="secondary" className="h-5 text-[0.7rem]">
                    {cat === "ALL" ? apps.length : apps.filter((a) => a.category === cat).length}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Apps Grid */}
        <div className="col-span-12 md:col-span-10">
          <div className="grid grid-cols-12 gap-4">
            {filteredApps.map((app) => {
              const monthlyRevenue = calculateAppRevenue(app);
              const isExpanded = expandedApp === app.id;

              return (
                <div key={app.id} className="col-span-12 sm:col-span-6 md:col-span-4">
                  <Card className="h-full flex flex-col" style={{ borderTop: `3px solid ${getCategoryColor(app.category)}`, transition: "all 0.2s ease" }}>
                    <CardContent className="flex-grow pb-1">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <h6 className="text-base font-semibold leading-none font-bold truncate">{app.name}</h6>
                          <Badge className="mt-0.5 text-[0.7rem]" style={{ backgroundColor: getCategoryColor(app.category), color: "white" }}>{app.category}</Badge>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          {app.isFeatured && <Badge variant="default" className="bg-amber-500 text-xs"><Star className="h-3 w-3 ml-0.5" />مميز</Badge>}
                          {app.isPopular && <Badge variant="default" className="bg-blue-500 text-xs">شائع</Badge>}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm leading-6 text-muted-foreground mb-2" style={{ height: 36, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", fontSize: "0.8rem" }}>
                        {app.description || "لا يوجد وصف"}
                      </p>

                      {/* Stats Row */}
                      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-1.5 mb-2 bg-muted/50">
                        <div className="grid grid-cols-12 gap-1 text-center">
                          <div className="col-span-4">
                            <h6 className="text-base font-semibold leading-none font-bold text-primary" style={{ fontSize: "1rem" }}>{app._count?.installations || app.installCount || 0}</h6>
                            <span className="text-xs text-muted-foreground block" style={{ fontSize: "0.65rem" }}>تثبيت</span>
                          </div>
                          <div className="col-span-4">
                            <h6 className="text-base font-semibold leading-none font-bold text-green-600" style={{ fontSize: "1rem" }}>⭐ {app.rating?.toFixed(1) || "0.0"}</h6>
                            <span className="text-xs text-muted-foreground block" style={{ fontSize: "0.65rem" }}>({app.reviewCount || 0})</span>
                          </div>
                          <div className="col-span-4">
                            <h6 className="text-base font-semibold leading-none font-bold text-amber-500" style={{ fontSize: "1rem" }}>{monthlyRevenue.toLocaleString()}</h6>
                            <span className="text-xs text-muted-foreground block" style={{ fontSize: "0.65rem" }}>ج.م/شهر</span>
                          </div>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex items-center gap-1 mb-1">
                        <h5 className="scroll-m-18 text-lg font-semibold tracking-tight text-primary font-bold">{app.monthlyPrice?.toLocaleString() || 0} ج</h5>
                        <span className="text-xs text-muted-foreground">/ شهر</span>
                        {app.yearlyPrice > 0 && (
                          <Badge variant="outline" className="border-green-500/50 text-green-700 text-xs">{`${Math.round((1 - app.yearlyPrice / (app.monthlyPrice * 12)) * 100)}% توفير سنوي`}</Badge>
                        )}
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div>
                          <Separator className="my-1.5" />
                          <div className="mb-1.5">
                            <span className="text-xs text-muted-foreground block">أيام التجربة: {app.trialDays || 14} يوم</span>
                            <span className="text-xs text-muted-foreground block">الإيرادات المتوقعة: {(app.monthlyPrice * (app._count?.installations || 0) * 12).toLocaleString()} ج.م/سنة</span>
                            {app.mainRoute && <span className="text-xs text-muted-foreground block">المسار: {app.mainRoute}</span>}
                          </div>
                        </div>
                      )}

                      {/* Toggle Switches */}
                      <div className="flex gap-2 mb-1 flex-wrap">
                        <label className="flex items-center gap-0.5 cursor-pointer">
                          <input type="checkbox" checked={!!app.isActive} onChange={(e) => handleQuickToggle(app, "isActive", e.target.checked)} style={{ cursor: "pointer" }} />
                          <span className="text-xs">نشط</span>
                        </label>
                        <label className="flex items-center gap-0.5 cursor-pointer">
                          <input type="checkbox" checked={!!app.isPublic} onChange={(e) => handleQuickToggle(app, "isPublic", e.target.checked)} style={{ cursor: "pointer" }} />
                          <span className="text-xs">عام</span>
                        </label>
                        <label className="flex items-center gap-0.5 cursor-pointer">
                          <input type="checkbox" checked={!!app.isFeatured} onChange={(e) => handleQuickToggle(app, "isFeatured", e.target.checked)} style={{ cursor: "pointer" }} />
                          <span className="text-xs">مميز</span>
                        </label>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-between items-center">
                        <Button size="sm" onClick={() => setExpandedApp(isExpanded ? null : app.id)} variant="ghost">
                          {isExpanded ? "أقل" : "المزيد"}
                        </Button>
                        <div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => onEdit(app)}><Pencil className="h-4 w-4" /></Button>
                              </TooltipTrigger>
                              <TooltipContent>تعديل</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => onDelete(app.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                              </TooltipTrigger>
                              <TooltipContent>حذف</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          {filteredApps.length === 0 && (
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 text-center">
              <h6 className="text-base font-semibold leading-none text-muted-foreground">لا توجد تطبيقات مطابقة للبحث</h6>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BundlesAndPricingTab = ({
  pricingRules,
  bundles,
  onEdit,
  onDelete,
  onRefresh,
}: {
  pricingRules: MarketplaceManagementItem[];
  bundles: MarketplaceManagementItem[];
  onEdit: (item: MarketplaceManagementItem) => void;
  onDelete: (id: string) => void;
  onRefresh: () => Promise<void> | void;
}) => {
  const [expandedBundle, setExpandedBundle] = useState<string | null>(null);

  const calculateBundleSavings = (bundle: MarketplaceManagementItem) => {
    const bundleApps = normalizeBundleApps(bundle.apps);
    if (bundleApps.length === 0) return bundle.discount || 0;
    return bundle.discount || 0;
  };

  const handleQuickToggle = async (
    bundle: MarketplaceManagementItem,
    field: string,
    value: boolean,
  ) => {
    try {
      await axios.patch(
        buildApiUrl(`super-admin/marketplace-management/bundles/${bundle.id}`),
        { [field]: value },
        { headers: getAuthHeaders() },
      );
      toast.success(`تم ${value ? "تفعيل" : "تعطيل"} الباقة بنجاح`);
      onRefresh();
    } catch (err) {
      toast.error("خطأ في التحديث");
    }
  };

  return (
    <div>
      {/* Pricing Rules Section */}
      <div className="flex justify-between items-center mb-2">
        <h6 className="text-base font-semibold leading-none">قواعد التسعير الإضافية</h6>
        <Button variant="outline" size="sm" onClick={() => onEdit({ feature: "", price: 0, unit: "" })}>
          <Plus className="h-4 w-4 ml-1" />إضافة قاعدة
        </Button>
      </div>
      <div className="mb-4">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>الميزة</TableHead>
              <TableHead>السعر</TableHead>
              <TableHead>الوحدة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pricingRules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>
                  <span className="font-medium">{rule.feature}</span>
                  {rule.description && <span className="text-xs text-muted-foreground block">{rule.description}</span>}
                </TableCell>
                <TableCell>{rule.price} ج</TableCell>
                <TableCell>{rule.unit}</TableCell>
                <TableCell>
                  <Badge variant={rule.isActive ? "default" : "secondary"} className={rule.isActive ? "bg-green-500" : ""}>{rule.isActive ? "نشط" : "معطل"}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(rule)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(rule.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Bundles Section */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h6 className="text-base font-semibold leading-none">باقات العروض (Bundles)</h6>
          <span className="text-xs text-muted-foreground">{bundles.length} باقة | {bundles.filter((b) => b.isActive).length} نشطة</span>
        </div>
        <Button variant="default" size="sm" onClick={() => onEdit({ name: "", price: 0, apps: [] })}>
          <Plus className="h-4 w-4 ml-1" />إضافة باقة
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {bundles.map((bundle) => {
          const isExpanded = expandedBundle === bundle.id;
          const bundleApps = normalizeBundleApps(bundle.apps);
          const appsCount = bundleApps.length;
          const savings = calculateBundleSavings(bundle);

          return (
            <div key={bundle.id} className="col-span-12 md:col-span-6">
              <Card style={{ backgroundColor: bundle.isActive ? "var(--card)" : "rgba(0,0,0,0.05)", border: `2px solid ${bundle.isFeatured ? "#f59e0b" : "var(--border)"}`, transition: "all 0.2s ease" }}>
                <CardContent>
                  {/* Header */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <h6 className="text-base font-semibold leading-none font-bold">{bundle.name}</h6>
                        {bundle.isFeatured && <Badge variant="default" className="bg-amber-500 text-xs"><Star className="h-3 w-3 ml-0.5" />مميزة</Badge>}
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground mt-0.5">{bundle.description || "لا يوجد وصف"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <Badge variant={bundle.isActive ? "default" : "destructive"} className={bundle.isActive ? "bg-green-500" : ""}>{bundle.isActive ? "نشطة" : "معطلة"}</Badge>
                    </div>
                  </div>

                  {/* Pricing Info */}
                  <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-2 mb-2" style={{ backgroundColor: "#f0fdf4" }}>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <span className="text-xs text-muted-foreground block">السعر الحالي</span>
                        <h4 className="scroll-m-20 text-xl font-semibold tracking-tight font-bold text-green-700">{bundle.monthlyPrice?.toLocaleString() || 0} ج</h4>
                        <span className="text-xs text-muted-foreground">/ شهر</span>
                      </div>
                      <div className="col-span-6 text-right">
                        {savings > 0 && (
                          <>
                            <Badge className="bg-green-500 mb-0.5">توفير {savings}%</Badge>
                            <span className="text-xs text-green-600 block">خصم على التطبيقات</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Apps List */}
                  <div className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-medium text-muted-foreground font-bold">التطبيقات المُضمنة ({appsCount})</p>
                    </div>
                    <div className="flex flex-wrap gap-0.5">
                      {appsCount > 0 ? (
                        bundleApps.map((app, idx) => (
                          <TooltipProvider key={idx}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-xs" style={{ maxWidth: 120 }}>{getBundleAppLabel(app)}</Badge>
                              </TooltipTrigger>
                              <TooltipContent>{getBundleAppLabel(app)}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">لا توجد تطبيقات مضمنة</span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div>
                      <Separator className="my-1.5" />
                      {appsCount > 0 && (
                        <ul className="space-y-1 mb-1">
                          <span className="text-xs text-muted-foreground block">تفاصيل التطبيقات:</span>
                          {bundleApps.map((app, idx) => (
                            <li key={idx} className="py-0.5">
                              <div>
                                <span className="font-medium">{getBundleAppLabel(app)}</span>
                                <span className="text-sm text-muted-foreground block">{getBundleAppCategory(app)}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Toggle Switches */}
                  <div className="flex gap-2 mb-1 flex-wrap">
                    <label className="flex items-center gap-0.5 cursor-pointer">
                      <input type="checkbox" checked={!!bundle.isActive} onChange={(e) => handleQuickToggle(bundle, "isActive", e.target.checked)} style={{ cursor: "pointer" }} />
                      <span className="text-xs">نشطة</span>
                    </label>
                    <label className="flex items-center gap-0.5 cursor-pointer">
                      <input type="checkbox" checked={!!bundle.isFeatured} onChange={(e) => handleQuickToggle(bundle, "isFeatured", e.target.checked)} style={{ cursor: "pointer" }} />
                      <span className="text-xs">مميزة</span>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center">
                    <Button size="sm" onClick={() => setExpandedBundle(isExpanded ? null : bundle.id)} variant="ghost">
                      {isExpanded ? "أقل" : "عرض التفاصيل"}
                    </Button>
                    <div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => onEdit(bundle)}><Pencil className="h-4 w-4" /></Button>
                          </TooltipTrigger>
                          <TooltipContent>تعديل</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => onDelete(bundle.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                          </TooltipTrigger>
                          <TooltipContent>حذف</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {bundles.length === 0 && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 text-center">
          <h6 className="text-base font-semibold leading-none text-muted-foreground">لا توجد باقات محددة</h6>
        </div>
      )}
    </div>
  );
};

const EnterprisePlansTab = ({
  enterprisePlans,
  onEdit,
  onRefresh,
}: {
  enterprisePlans: MarketplaceManagementItem[];
  onEdit: (plan: MarketplaceManagementItem) => void;
  onRefresh: () => Promise<void> | void;
}) => {
  return (
    <div>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>الشركة</TableHead>
            <TableHead>الرسوم الشهرية</TableHead>
            <TableHead>مدير الحساب</TableHead>
            <TableHead>دعم مخصص</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enterprisePlans.map((plan) => {
            const features = parsePlanFeatures(plan.features);
            return (
              <TableRow key={plan.id}>
                <TableCell>
                  <p className="text-sm font-medium text-muted-foreground">{plan.company?.name}</p>
                  <span className="text-xs">{plan.company?.email}</span>
                </TableCell>
                <TableCell>{plan.price} ج</TableCell>
                <TableCell>{features.accountManager || "غير محدد"}</TableCell>
                <TableCell>
                  {features.dedicatedSupport ? (
                    <Check className="text-green-500 h-5 w-5" />
                  ) : (
                    <X className="text-red-500 h-5 w-5" />
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="default" className="bg-amber-500">Enterprise</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(plan)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

type ThemeVisibilityFilter =
  | "ALL"
  | "VISIBLE"
  | "HIDDEN"
  | "ACTIVE"
  | "INACTIVE"
  | "ARCHIVED"
  | "FEATURED";

type ThemePricingFilter = "ALL" | "FREE" | "PAID";

const getThemeUsageStats = (theme: StorefrontThemeCatalogItem) => ({
  installations: theme.usageStats?.installations || 0,
  activeInstallations: theme.usageStats?.activeInstallations || 0,
  purchases: theme.usageStats?.purchases || 0,
  currentCompanies: theme.usageStats?.currentCompanies || 0,
  installCount: theme.usageStats?.installCount || 0,
});

const StorefrontThemesTab = ({
  themes,
  onRefresh,
}: {
  themes: StorefrontThemeCatalogItem[];
  onRefresh: () => void;
}) => {
  const [drafts, setDrafts] = useState<
    Record<string, StorefrontThemeCatalogItem>
  >({});
  const [savingThemeId, setSavingThemeId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [themeSearchQuery, setThemeSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] =
    useState<ThemeVisibilityFilter>("ALL");
  const [pricingFilter, setPricingFilter] = useState<ThemePricingFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([]);
  const [bulkPrice, setBulkPrice] = useState("");
  const uniqueThemes = useMemo(
    () =>
      Array.from(
        themes
          .reduce((map, theme) => {
            if (!map.has(theme.themeId)) {
              map.set(theme.themeId, theme);
            }
            return map;
          }, new Map<string, StorefrontThemeCatalogItem>())
          .values(),
      ),
    [themes],
  );

  useEffect(() => {
    const nextDrafts = uniqueThemes.reduce<
      Record<string, StorefrontThemeCatalogItem>
    >((accumulator, theme) => {
      accumulator[theme.themeId] = theme;
      return accumulator;
    }, {});
    setDrafts(nextDrafts);
  }, [uniqueThemes]);

  const draftThemes = useMemo(
    () => uniqueThemes.map((theme) => drafts[theme.themeId] || theme),
    [drafts, uniqueThemes],
  );

  const themeCategoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          draftThemes
            .map((theme) => theme.category?.primary?.label)
            .filter((label): label is string => Boolean(label)),
        ),
      ).sort((left, right) => left.localeCompare(right, "ar")),
    [draftThemes],
  );

  const filteredThemes = useMemo(() => {
    const normalizedQuery = themeSearchQuery.trim().toLowerCase();

    return draftThemes.filter((theme) => {
      if (normalizedQuery) {
        const haystack = [
          theme.name,
          theme.description,
          theme.themeId,
          theme.category?.primary?.label,
          theme.category?.secondary?.label,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }

      if (categoryFilter !== "ALL" && theme.category?.primary?.label !== categoryFilter) {
        return false;
      }

      if (pricingFilter === "FREE" && theme.pricingModel !== "FREE") {
        return false;
      }
      if (pricingFilter === "PAID" && theme.pricingModel !== "ONE_TIME") {
        return false;
      }

      if (visibilityFilter === "VISIBLE") return theme.isPublic;
      if (visibilityFilter === "HIDDEN") return !theme.isPublic;
      if (visibilityFilter === "ACTIVE") return theme.isActive;
      if (visibilityFilter === "INACTIVE") return !theme.isActive;
      if (visibilityFilter === "ARCHIVED") return !theme.isPublic && !theme.isActive;
      if (visibilityFilter === "FEATURED") return theme.isFeatured;

      return true;
    });
  }, [
    categoryFilter,
    draftThemes,
    pricingFilter,
    themeSearchQuery,
    visibilityFilter,
  ]);

  useEffect(() => {
    const visibleThemeIds = new Set(filteredThemes.map((theme) => theme.themeId));
    setSelectedThemeIds((current) =>
      current.filter((themeId) => visibleThemeIds.has(themeId)),
    );
  }, [filteredThemes]);

  const selectedThemeSet = useMemo(
    () => new Set(selectedThemeIds),
    [selectedThemeIds],
  );

  const defaultTheme = useMemo(
    () => draftThemes.find((theme) => theme.isDefaultTheme) || null,
    [draftThemes],
  );


  const selectedThemes = useMemo(
    () => draftThemes.filter((theme) => selectedThemeSet.has(theme.themeId)),
    [draftThemes, selectedThemeSet],
  );

  const allFilteredSelected =
    filteredThemes.length > 0 &&
    filteredThemes.every((theme) => selectedThemeSet.has(theme.themeId));

  const selectedUsageTotals = selectedThemes.reduce(
    (totals, theme) => {
      const usageStats = getThemeUsageStats(theme);
      return {
        currentCompanies: totals.currentCompanies + usageStats.currentCompanies,
        purchases: totals.purchases + usageStats.purchases,
      };
    },
    { currentCompanies: 0, purchases: 0 },
  );

  const handleDraftChange = (
    themeId: string,
    patch: Partial<StorefrontThemeCatalogItem>,
  ) => {
    setDrafts((current) => ({
      ...current,
      [themeId]: {
        ...(current[themeId] ||
          uniqueThemes.find((theme) => theme.themeId === themeId)!),
        ...patch,
      },
      }));
  };

  const toggleThemeSelection = (themeId: string, checked: boolean) => {
    setSelectedThemeIds((current) => {
      if (checked) {
        return current.includes(themeId) ? current : [...current, themeId];
      }

      return current.filter((selectedThemeId) => selectedThemeId !== themeId);
    });
  };

  const toggleFilteredSelection = (checked: boolean) => {
    if (!checked) {
      setSelectedThemeIds([]);
      return;
    }

    setSelectedThemeIds(filteredThemes.map((theme) => theme.themeId));
  };

  const persistThemeDraft = async (
    themeId: string,
    draft: StorefrontThemeCatalogItem,
  ) => {
    await axios.put(
      buildApiUrl(`super-admin/storefront-theme-catalog/${themeId}`),
      {
        description: draft.description,
        pricingModel: draft.pricingModel,
        monthlyPrice: draft.monthlyPrice,
        yearlyPrice: draft.yearlyPrice,
        isActive: draft.isActive,
        isPublic: draft.isPublic,
        isFeatured: draft.isFeatured,
        imageUrl: draft.preview?.imageUrl,
      },
      {
        headers: getAuthHeaders(),
      },
    );
  };

  const persistThemePatch = async (
    themeIds: string[],
    patch: Partial<StorefrontThemeCatalogItem>,
    successMessage: string,
  ) => {
    const uniqueThemeIds = Array.from(new Set(themeIds)).filter(Boolean);
    if (uniqueThemeIds.length === 0 || bulkSaving) return;
    if (
      (patch.isActive === false || patch.isPublic === false) &&
      uniqueThemeIds.some((themeId) => drafts[themeId]?.isDefaultTheme)
    ) {
      toast.error("عيّن قالبًا افتراضيًا آخر قبل تعطيل القالب الحالي");
      return;
    }


    setBulkSaving(true);
    try {
      const nextDrafts = uniqueThemeIds.reduce<
        Record<string, StorefrontThemeCatalogItem>
      >(
        (accumulator, themeId) => {
          const base =
            drafts[themeId] ||
            uniqueThemes.find((theme) => theme.themeId === themeId);
          if (base) {
            accumulator[themeId] = {
              ...base,
              ...patch,
            };
          }
          return accumulator;
        },
        { ...drafts },
      );

      setDrafts(nextDrafts);
      await Promise.all(
        uniqueThemeIds
          .filter((themeId) => Boolean(nextDrafts[themeId]))
          .map((themeId) => persistThemeDraft(themeId, nextDrafts[themeId]!)),
      );
      setSelectedThemeIds([]);
      toast.success(successMessage);
      await onRefresh();
    } catch (error) {
      console.error("Bulk theme update error:", error);
      toast.error("فشل تحديث القوالب المحددة");
    } finally {
      setBulkSaving(false);
    }
  };

  const handleArchiveThemes = async (themeIds: string[]) => {
    const themesToArchive = draftThemes.filter((theme) =>
      themeIds.includes(theme.themeId),
    );
    if (themesToArchive.some((theme) => theme.isDefaultTheme)) {
      toast.error("عيّن قالبًا افتراضيًا آخر قبل أرشفة القالب الحالي");
      return;
    }


    const currentCompanies = themesToArchive.reduce(
      (total, theme) => total + getThemeUsageStats(theme).currentCompanies,
      0,
    );
    const confirmMessage =
      currentCompanies > 0
        ? `سيتم إخفاء وتعطيل ${themeIds.length} قالب. يوجد ${currentCompanies} شركة تستخدم هذه القوالب حاليًا، وستظل الشركات الحالية كما هي لكن لن يظهر القالب للاختيار الجديد. هل تريد المتابعة؟`
        : `سيتم إخفاء وتعطيل ${themeIds.length} قالب من كتالوج الشركات. هل تريد المتابعة؟`;

    if (!window.confirm(confirmMessage)) return;

    await persistThemePatch(
      themeIds,
      { isActive: false, isPublic: false },
      "تمت أرشفة القوالب المحددة",
    );
  };

  const handleApplyBulkPrice = async () => {
    const price = Number(bulkPrice);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("اكتب سعر صحيح أولًا");
      return;
    }

    await persistThemePatch(
      selectedThemeIds,
      {
        pricingModel: price > 0 ? "ONE_TIME" : "FREE",
        monthlyPrice: price > 0 ? price : 0,
        yearlyPrice: 0,
      },
      price > 0 ? "تم تسعير القوالب المحددة" : "تم تحويل القوالب المحددة إلى مجانية",
    );
    setBulkPrice("");
  };

  const handleSetDefaultTheme = async (theme: StorefrontThemeCatalogItem) => {
    const needsActivation = !theme.isActive || !theme.isPublic;
    if (
      needsActivation &&
      !window.confirm(
        "سيتم جعل هذا القالب ظاهرًا ومتاحًا للتفعيل لأنه سيصبح الافتراضي لأي متجر جديد. هل تريد المتابعة؟",
      )
    ) {
      return;
    }

    try {
      setSavingThemeId(theme.themeId);
      await axios.post(
        buildApiUrl(`super-admin/storefront-theme-catalog/${theme.themeId}/default`),
        {},
        {
          headers: getAuthHeaders(),
        },
      );
      setDrafts((current) =>
        Object.fromEntries(
          Object.entries(current).map(([themeId, draft]) => [
            themeId,
            {
              ...draft,
              isDefaultTheme: themeId === theme.themeId,
              ...(themeId === theme.themeId
                ? {
                    isActive: true,
                    isPublic: true,
                  }
                : {}),
            },
          ]),
        ) as Record<string, StorefrontThemeCatalogItem>,
      );
      toast.success("تم تعيين القالب الافتراضي للمتاجر الجديدة");
      await onRefresh();
    } catch (error) {
      console.error("Default storefront theme update error:", error);
      toast.error("فشل تعيين القالب الافتراضي");
    } finally {
      setSavingThemeId(null);
    }
  };


  const handleSave = async (themeId: string) => {
    const draft = drafts[themeId];
    if (!draft || bulkSaving) return;

    try {
      setSavingThemeId(themeId);
      await persistThemeDraft(themeId, draft);
      toast.success("تم تحديث القالب بنجاح");
      onRefresh();
    } catch (error) {
      console.error("Theme catalog save error:", error);
      toast.error("فشل تحديث القالب");
    } finally {
      setSavingThemeId(null);
    }
  };

  const hiddenOrInactiveThemesCount = useMemo(
    () =>
      draftThemes.filter((theme) => !theme.isActive || !theme.isPublic).length,
    [draftThemes],
  );

  const handleEnableAndShowAllThemes = async () => {
    if (uniqueThemes.length === 0 || bulkSaving) return;

    const nextDrafts = uniqueThemes.reduce<
      Record<string, StorefrontThemeCatalogItem>
    >((accumulator, theme) => {
      accumulator[theme.themeId] = {
        ...(drafts[theme.themeId] || theme),
        isActive: true,
        isPublic: true,
      };
      return accumulator;
    }, {});

    setDrafts(nextDrafts);
    setBulkSaving(true);

    try {
      const results = await Promise.allSettled(
        uniqueThemes.map((theme) =>
          persistThemeDraft(theme.themeId, nextDrafts[theme.themeId]),
        ),
      );
      const failedCount = results.filter(
        (result) => result.status === "rejected",
      ).length;

      if (failedCount > 0) {
        toast.error(`تعذر تحديث ${failedCount} قالب. راجع الشبكة ثم أعد المحاولة.`);
      } else {
        toast.success("تم إظهار وتفعيل كل القوالب");
      }

      onRefresh();
    } catch (error) {
      console.error("Bulk theme activation error:", error);
      toast.error("فشل إظهار وتفعيل القوالب");
    } finally {
      setBulkSaving(false);
    }
  };

  const totalCurrentCompanies = draftThemes.reduce(
    (total, theme) => total + getThemeUsageStats(theme).currentCompanies,
    0,
  );

  const totalPurchases = draftThemes.reduce(
    (total, theme) => total + getThemeUsageStats(theme).purchases,
    0,
  );

  return (
    <div>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-3 mb-3" style={{ backgroundColor: "#e0f2fe", color: "#0c4a6e" }}>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-6 md:col-span-3">
            <h4 className="scroll-m-20 text-xl font-semibold tracking-tight font-bold">{draftThemes.length}</h4>
            <p className="text-sm leading-6">إجمالي القوالب</p>
          </div>
          <div className="col-span-6 md:col-span-3">
            <h4 className="scroll-m-20 text-xl font-semibold tracking-tight font-bold">{draftThemes.filter((theme) => theme.isActive).length}</h4>
            <p className="text-sm leading-6">قوالب متاحة للتفعيل</p>
          </div>
          <div className="col-span-6 md:col-span-3">
            <h4 className="scroll-m-20 text-xl font-semibold tracking-tight font-bold">{totalCurrentCompanies}</h4>
            <p className="text-sm leading-6">شركات تستخدم قالبًا</p>
          </div>
          <div className="col-span-6 md:col-span-3">
            <h6 className="text-base font-semibold leading-none font-bold break-all">{defaultTheme ? defaultTheme.name : "غير محدد"}</h6>
            <p className="text-sm leading-6">القالب الافتراضي</p>
          </div>
        </div>
      </div>

      <Alert variant="default" className="mb-3 border-blue-500/50 text-blue-700">
        القالب الافتراضي هو الذي يحصل عليه أي متجر جديد عند إنشاء إعدادات
        المتجر لأول مرة.{" "}
        {defaultTheme
          ? `المحدد حاليًا: ${defaultTheme.name}.`
          : "لم يتم تحديد قالب افتراضي من الكتالوج بعد."}{" "}
        إجمالي عمليات شراء القوالب المسجلة: {totalPurchases}.
      </Alert>

      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-2 mb-3">
        <div>
          <h6 className="text-base font-semibold leading-none">كتالوج قوالب المتجر</h6>
          <p className="text-sm leading-6 text-muted-foreground">
            من هنا يتحكم السوبر أدمن في إتاحة القوالب وتسعيرها للشركات، بينما
            الشراء والتطبيق يتمان من صفحة القوالب داخل متجر التطبيقات.
          </p>
        </div>
        <Button variant="outline" onClick={onRefresh} disabled={bulkSaving}>
          <RefreshCw className="h-4 w-4 ml-1" />تحديث البيانات
        </Button>
        <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={handleEnableAndShowAllThemes} disabled={bulkSaving || uniqueThemes.length === 0}>
          <Check className="h-4 w-4 ml-1" />{bulkSaving ? "جارٍ الإظهار والتفعيل..." : "إظهار وتفعيل كل القوالب"}
        </Button>
      </div>

      {hiddenOrInactiveThemesCount > 0 ? (
        <Alert variant="default" className="mb-3 border-yellow-500/50 text-yellow-700">
          يوجد {hiddenOrInactiveThemesCount} قالب غير ظاهر للشركات أو غير متاح
          للتفعيل حاليًا. الزر الجماعي بالأعلى يعيدها كلها إلى حالة
          <strong> ظاهر + متاح للتفعيل </strong>
          دفعة واحدة.
        </Alert>
      ) : (
        <Alert variant="default" className="mb-3 border-green-500/50 text-green-700">
          جميع القوالب الحالية ظاهرة للشركات ومتاحة للتفعيل.
        </Alert>
      )}

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-2 mb-3">
        <div className="grid grid-cols-12 gap-2 items-center">
          <div className="col-span-12 md:col-span-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="w-full pr-10" placeholder="ابحث بالاسم أو الوصف أو themeId..." value={themeSearchQuery} onChange={(event) => setThemeSearchQuery(event.target.value)} />
            </div>
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select value={visibilityFilter} onValueChange={(v) => setVisibilityFilter(v as ThemeVisibilityFilter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">كل الحالات</SelectItem>
                  <SelectItem value="VISIBLE">ظاهر للشركات</SelectItem>
                  <SelectItem value="HIDDEN">مخفي</SelectItem>
                  <SelectItem value="ACTIVE">متاح للتفعيل</SelectItem>
                  <SelectItem value="INACTIVE">غير متاح</SelectItem>
                  <SelectItem value="ARCHIVED">مؤرشف</SelectItem>
                  <SelectItem value="FEATURED">مميز</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <div className="space-y-2">
              <Label>التسعير</Label>
              <Select value={pricingFilter} onValueChange={(v) => setPricingFilter(v as ThemePricingFilter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">كل الأسعار</SelectItem>
                  <SelectItem value="FREE">مجاني</SelectItem>
                  <SelectItem value="PAID">مدفوع</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <div className="space-y-2">
              <Label>المجال</Label>
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">كل المجالات</SelectItem>
                  {themeCategoryOptions.map((categoryLabel) => (
                    <SelectItem key={categoryLabel} value={categoryLabel}>{categoryLabel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={(checked) => toggleFilteredSelection(checked === true)}
                />
                <span className="text-sm">تحديد المعروض</span>
              </label>
              <Badge variant="secondary" className="text-xs">{filteredThemes.length}/{draftThemes.length}</Badge>
            </div>
          </div>
        </div>

        {selectedThemeIds.length > 0 && (
          <div>
            <Separator className="my-2" />
            <div className="flex items-stretch md:items-center justify-between flex-col md:flex-row gap-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground font-bold">{selectedThemeIds.length} قالب محدد</p>
                <span className="text-xs text-muted-foreground">مستخدم حاليًا لدى {selectedUsageTotals.currentCompanies} شركة • مشتريات مسجلة {selectedUsageTotals.purchases}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" disabled={bulkSaving} onClick={() => persistThemePatch(selectedThemeIds, { isActive: true, isPublic: true }, "تم إظهار وتفعيل القوالب المحددة")}>
                  <Eye className="h-4 w-4 ml-1" />إظهار المحدد
                </Button>
                <Button size="sm" variant="outline" className="text-amber-500 border-amber-500" disabled={bulkSaving} onClick={() => persistThemePatch(selectedThemeIds, { isActive: false }, "تم تعطيل القوالب المحددة")}>
                  تعطيل المحدد
                </Button>
                <Button size="sm" variant="outline" className="text-red-500 border-red-500" disabled={bulkSaving} onClick={() => handleArchiveThemes(selectedThemeIds)}>
                  <Archive className="h-4 w-4 ml-1" />أرشفة المحدد
                </Button>
                <Input className="w-[130px] h-9" type="number" placeholder="سعر موحد" value={bulkPrice} onChange={(event) => setBulkPrice(event.target.value)} />
                <Button size="sm" variant="default" disabled={bulkSaving} onClick={handleApplyBulkPrice}>
                  تطبيق السعر
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {filteredThemes.map((theme) => {
          const draft = theme;
          const isSaving = savingThemeId === theme.themeId || bulkSaving;
          const previewColors = draft.preview?.colors?.length > 0 ? draft.preview.colors : [];
          const usageStats = getThemeUsageStats(draft);
          const isSelected = selectedThemeSet.has(theme.themeId);

          return (
            <div key={theme.themeId} className="col-span-12 lg:col-span-6">
              <Card className="h-full overflow-hidden" style={{ border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`, boxShadow: isSelected ? "0 10px 15px -3px rgba(0,0,0,0.1)" : "0 1px 3px 0 rgba(0,0,0,0.1)" }}>
                {draft.preview?.imageUrl && (
                  <div className="h-[200px] w-full overflow-hidden relative border-b border-border bg-muted/50">
                    <img src={draft.preview.imageUrl} alt={draft.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
                  </div>
                )}
                <CardContent>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="flex items-start gap-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => toggleThemeSelection(theme.themeId, checked === true)}
                        className="mt-[-0.75rem] mr-[-0.5rem]"
                      />
                      <div>
                        <h6 className="text-base font-semibold leading-none font-bold">{draft.name}</h6>
                        <span className="text-xs text-muted-foreground">{draft.themeId}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {draft.isFeatured ? <Badge variant="default" className="bg-amber-500 text-xs">مميز</Badge> : null}
                      {draft.isDefaultTheme ? <Badge variant="default" className="bg-blue-500 text-xs"><Star className="h-3 w-3 ml-0.5" />افتراضي للمتاجر الجديدة</Badge> : null}
                      <Badge variant={draft.isActive ? "default" : "secondary"} className={draft.isActive ? "bg-green-500" : ""}>{draft.isActive ? "نشط" : "موقوف"}</Badge>
                      <Badge variant={draft.isPublic ? "default" : "secondary"} className={draft.isPublic ? "bg-blue-500" : ""}>{draft.isPublic ? "ظاهر" : "مخفي"}</Badge>
                      {!draft.isActive && !draft.isPublic ? <Badge variant="destructive">مؤرشف</Badge> : null}
                    </div>
                  </div>

                  <div className="flex gap-1 mb-2">
                    {previewColors.map((colorValue, colorIndex) => (
                      <div key={`${draft.themeId}-${colorValue}-${colorIndex}`} className="w-7 h-7 rounded-full border border-border" style={{ backgroundColor: `hsl(${colorValue})` }} />
                    ))}
                  </div>

                  <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-2 mb-2 bg-muted/50">
                    <div className="grid grid-cols-12 gap-1">
                      <div className="col-span-6 md:col-span-3">
                        <span className="text-xs text-muted-foreground">مفعل</span>
                        <p className="text-sm font-medium text-muted-foreground">{usageStats.activeInstallations} شركة</p>
                      </div>
                      <div className="col-span-6 md:col-span-3">
                        <span className="text-xs text-muted-foreground">مشتريات</span>
                        <p className="text-sm font-medium text-muted-foreground">{usageStats.purchases}</p>
                      </div>
                      <div className="col-span-6 md:col-span-3">
                        <span className="text-xs text-muted-foreground">مستخدم الآن</span>
                        <p className="text-sm font-medium text-muted-foreground">{usageStats.currentCompanies} شركة</p>
                      </div>
                      <div className="col-span-6 md:col-span-3">
                        <span className="text-xs text-muted-foreground">إجمالي</span>
                        <p className="text-sm font-medium text-muted-foreground">{usageStats.installations || usageStats.installCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-12">
                      <div className="space-y-1">
                        <Label>رابط الصورة المعاينة (imageUrl)</Label>
                        <Input value={draft.preview?.imageUrl || ""} onChange={(event) => handleDraftChange(theme.themeId, { preview: { ...draft.preview, imageUrl: event.target.value } })} />
                        <p className="text-xs text-muted-foreground">يفضل استخدام مسار يبدأ بـ /assets/themes/...</p>
                      </div>
                    </div>
                    <div className="col-span-12">
                      <div className="space-y-1">
                        <Label>وصف القالب</Label>
                        <Textarea value={draft.description} onChange={(event) => handleDraftChange(theme.themeId, { description: event.target.value })} rows={2} />
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <div className="space-y-2">
                        <Label>نموذج التسعير</Label>
                        <Select value={draft.pricingModel} onValueChange={(v) => handleDraftChange(theme.themeId, { pricingModel: v === "ONE_TIME" ? "ONE_TIME" : "FREE", yearlyPrice: v === "ONE_TIME" ? Number(draft.yearlyPrice) || 0 : 0 })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FREE">مجاني</SelectItem>
                            <SelectItem value="ONE_TIME">شراء مرة واحدة</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <div className="space-y-1">
                        <Label>سعر الشراء</Label>
                        <Input type="number" value={draft.monthlyPrice} onChange={(event) => handleDraftChange(theme.themeId, { monthlyPrice: Number(event.target.value) || 0 })} disabled={draft.pricingModel !== "ONE_TIME"} />
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <div className="space-y-1">
                        <Label>السعر السنوي</Label>
                        <Input type="number" value={draft.yearlyPrice} onChange={(event) => handleDraftChange(theme.themeId, { yearlyPrice: Number(event.target.value) || 0 })} disabled />
                        <p className="text-xs text-muted-foreground">غير مستخدم في شراء القوالب</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-1 mb-2">
                    <div className="col-span-12 md:col-span-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Switch checked={draft.isActive} disabled={draft.isDefaultTheme} onCheckedChange={(checked) => handleDraftChange(theme.themeId, { isActive: checked })} />
                        <span className="text-sm">متاح للتفعيل</span>
                      </label>
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Switch checked={draft.isPublic} disabled={draft.isDefaultTheme} onCheckedChange={(checked) => handleDraftChange(theme.themeId, { isPublic: checked })} />
                        <span className="text-sm">ظاهر للشركات</span>
                      </label>
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Switch checked={draft.isFeatured} onCheckedChange={(checked) => handleDraftChange(theme.themeId, { isFeatured: checked })} />
                        <span className="text-sm">شارة مميز</span>
                      </label>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-2 mb-2">
                    <div className="grid grid-cols-12 gap-1">
                      <div className="col-span-6">
                        <span className="text-xs text-muted-foreground">الرئيسية</span>
                        <p className="text-sm font-medium text-muted-foreground">{draft.pageStats.homeSections} sections</p>
                      </div>
                      <div className="col-span-6">
                        <span className="text-xs text-muted-foreground">المتجر</span>
                        <p className="text-sm font-medium text-muted-foreground">{draft.pageStats.shopSections} sections</p>
                      </div>
                      <div className="col-span-6">
                        <span className="text-xs text-muted-foreground">المنتج</span>
                        <p className="text-sm font-medium text-muted-foreground">{draft.pageStats.pdpSections} sections</p>
                      </div>
                      <div className="col-span-6">
                        <span className="text-xs text-muted-foreground">السلة/الدفع</span>
                        <p className="text-sm font-medium text-muted-foreground">{draft.pageStats.cartSections + draft.pageStats.checkoutSections} sections</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between gap-1 flex-wrap">
                    <Button variant="outline" asChild>
                      <a href={`/marketplace/themes?theme=${encodeURIComponent(draft.themeId)}`} target="_blank" rel="noreferrer">
                        <Eye className="h-4 w-4 ml-1" />معاينة
                      </a>
                    </Button>
                    <div className="flex gap-1 flex-wrap">
                      <Button variant={draft.isDefaultTheme ? "default" : "outline"} onClick={() => handleSetDefaultTheme(draft)} disabled={isSaving || draft.isDefaultTheme}>
                        <Star className="h-4 w-4 ml-1" />{draft.isDefaultTheme ? "القالب الافتراضي" : "تعيين كافتراضي"}
                      </Button>
                      <Button variant="outline" className={draft.isActive || draft.isPublic ? "text-red-500 border-red-500" : "text-green-600 border-green-600"} onClick={() => draft.isActive || draft.isPublic ? handleArchiveThemes([theme.themeId]) : persistThemePatch([theme.themeId], { isActive: true, isPublic: true }, "تم إظهار القالب")} disabled={isSaving || draft.isDefaultTheme}>
                        {draft.isActive || draft.isPublic ? <><Archive className="h-4 w-4 ml-1" />أرشفة</> : <><Eye className="h-4 w-4 ml-1" />إظهار</>}
                      </Button>
                      <Button variant="default" onClick={() => handleSave(theme.themeId)} disabled={isSaving}>
                        <Save className="h-4 w-4 ml-1" />{isSaving ? "جاري الحفظ..." : "حفظ القالب"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
        {filteredThemes.length === 0 && (
          <div className="col-span-12">
            <Alert variant="default" className="border-blue-500/50 text-blue-700">
              لا توجد قوالب مطابقة للبحث أو الفلاتر الحالية.
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
};

const MarketplaceItemDialog = ({
  open,
  onClose,
  item,
  type,
  onSave,
  availableApps,
}: {
  open: boolean;
  onClose: () => void;
  item: MarketplaceManagementItem | null;
  type: MarketplaceItemType;
  onSave: (data: MarketplaceDialogFormData) => Promise<void> | void;
  availableApps?: MarketplaceManagementItem[];
}) => {
  const [formData, setFormData] = useState<MarketplaceDialogFormData>(() =>
    createDefaultMarketplaceFormData(type),
  );

  const categoryMap = [
    { id: "ECOMMERCE", name: "التجارة الإلكترونية" },
    { id: "HR", name: "الموارد البشرية" },
    { id: "A" + "I", name: "الأتمتة" },
    { id: "COMMUNICATION", name: "التواصل" },
    { id: "CRM", name: "إدارة العملاء" },
    { id: "ANALYTICS", name: "التحليلات" },
    { id: "INTEGRATION", name: "التكاملات" },
    { id: "PRODUCTIVITY", name: "الإنتاجية" },
    { id: "FINANCE", name: "المالية" },
    { id: "MARKETING", name: "التسويق" },
  ];

  const setFieldValue = useCallback(
    <K extends keyof MarketplaceDialogFormData>(
      name: K,
      value: MarketplaceDialogFormData[K],
    ) => {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    [],
  );

  useEffect(() => {
    const defaultFormData = createDefaultMarketplaceFormData(type);

    if (item) {
      setFormData({
        ...defaultFormData,
        ...item,
        apps: normalizeBundleApps(item.apps),
        features: type === "app" ? parseStringList(item.features) : [],
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [item, open, type]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type: inputType, checked } = e.target;
    const fieldName = name as keyof MarketplaceDialogFormData;
    const nextValue =
      inputType === "checkbox"
        ? checked
        : inputType === "number"
          ? Number(value)
          : value;

    setFieldValue(
      fieldName,
      nextValue as MarketplaceDialogFormData[typeof fieldName],
    );
  };

  const dialogLabel =
    type === "app"
      ? "تطبيق"
      : type === "pricing"
        ? "قاعدة تسعير"
        : type === "enterprise"
          ? "خطة مؤسسة"
          : "باقة";

  const [bundleSearch, setBundleSearch] = useState("");

  const filteredAvailableApps = useMemo(
    () =>
      (availableApps || []).filter((app) => {
        if (!bundleSearch) return true;
        const q = bundleSearch.toLowerCase();
        return (
          (app.name || "").toLowerCase().includes(q) ||
          (app.slug || "").toLowerCase().includes(q)
        );
      }),
    [availableApps, bundleSearch],
  );

  const toggleBundleApp = (app: MarketplaceManagementItem) => {
    const current = formData.apps;
    const exists = current.some(
      (a) =>
        (typeof a === "string" ? a : a.id) === app.id ||
        (typeof a === "string" ? a : a.slug) === app.slug,
    );
    if (exists) {
      setFieldValue(
        "apps",
        current.filter(
          (a) =>
            (typeof a === "string" ? a : a.id) !== app.id &&
            (typeof a === "string" ? a : a.slug) !== app.slug,
        ),
      );
    } else {
      setFieldValue("apps", [
        ...current,
        { id: app.id, name: app.name, slug: app.slug, category: app.category },
      ]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {item ? "تعديل" : "إضافة"} {dialogLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-12 gap-2 mt-1">
          {type === "pricing" ? (
            <>
              <div className="col-span-12">
                <div className="space-y-1">
                  <Label>الميزة</Label>
                  <Input name="feature" value={formData.feature ?? ""} onChange={handleChange} />
                </div>
              </div>
              <div className="col-span-6">
                <div className="space-y-1">
                  <Label>السعر</Label>
                  <Input name="price" type="number" value={formData.price ?? 0} onChange={handleChange} />
                </div>
              </div>
              <div className="col-span-6">
                <div className="space-y-1">
                  <Label>الوحدة</Label>
                  <Input name="unit" value={formData.unit ?? ""} onChange={handleChange} />
                </div>
              </div>
              <div className="col-span-12">
                <div className="flex gap-3">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <span className="text-sm">نشط:</span>
                    <input type="checkbox" name="isActive" checked={!!formData.isActive} onChange={handleChange} />
                  </label>
                </div>
              </div>
            </>
          ) : type === "enterprise" ? (
            <>
              <div className="col-span-12">
                <div className="space-y-1">
                  <Label>معرف الشركة (Company ID)</Label>
                  <Input name="companyId" value={formData.companyId ?? ""} onChange={handleChange} disabled={!!item} />
                </div>
              </div>
              <div className="col-span-12">
                <div className="space-y-1">
                  <Label>اسم الخطة</Label>
                  <Input name="name" value={formData.name ?? ""} onChange={handleChange} />
                </div>
              </div>
              <div className="col-span-12">
                <div className="space-y-1">
                  <Label>السعر</Label>
                  <Input name="price" type="number" value={formData.price ?? 0} onChange={handleChange} />
                </div>
              </div>
              <div className="col-span-12">
                <div className="space-y-1">
                  <Label>الوصف</Label>
                  <Textarea name="description" rows={3} value={formData.description ?? ""} onChange={handleChange} />
                </div>
              </div>
              <div className="col-span-12">
                <div className="flex gap-3">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <span className="text-sm">نشط:</span>
                    <input type="checkbox" name="isActive" checked={!!formData.isActive} onChange={handleChange} />
                  </label>
                </div>
              </div>
            </>
          ) : type === "bundle" ? (
            <>
              <div className="col-span-12 md:col-span-6">
                <div className="space-y-1">
                  <Label>الاسم</Label>
                  <Input name="name" value={formData.name ?? ""} onChange={handleChange} />
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="space-y-1">
                  <Label>Slug</Label>
                  <Input name="slug" value={formData.slug ?? ""} onChange={handleChange} placeholder="اتركه فارغاً للتوليد التلقائي" />
                </div>
              </div>
              <div className="col-span-12">
                <div className="space-y-1">
                  <Label>الوصف</Label>
                  <Textarea name="description" rows={3} value={formData.description ?? ""} onChange={handleChange} />
                </div>
              </div>
              <div className="col-span-6 md:col-span-4">
                <div className="space-y-1">
                  <Label>السعر الشهري</Label>
                  <Input name="monthlyPrice" type="number" value={formData.monthlyPrice ?? 0} onChange={handleChange} />
                </div>
              </div>
              <div className="col-span-6 md:col-span-4">
                <div className="space-y-1">
                  <Label>الخصم %</Label>
                  <Input name="discount" type="number" value={formData.discount ?? 0} onChange={handleChange} />
                </div>
              </div>
              <div className="col-span-12 md:col-span-4">
                <div className="flex gap-2 items-center h-full">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <span className="text-sm">نشط:</span>
                    <input type="checkbox" name="isActive" checked={!!formData.isActive} onChange={handleChange} />
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <span className="text-sm">مميز:</span>
                    <input type="checkbox" name="isFeatured" checked={!!formData.isFeatured} onChange={handleChange} />
                  </label>
                </div>
              </div>
              <div className="col-span-12">
                <div className="space-y-1">
                  <Label>التطبيقات المضمنة</Label>
                  <Input placeholder="ابحث عن تطبيق..." value={bundleSearch} onChange={(e) => setBundleSearch(e.target.value)} />
                  <ScrollArea className="h-40 rounded-md border p-2">
                    {filteredAvailableApps.map((app) => {
                      const isSelected = formData.apps.some(
                        (a) =>
                          (typeof a === "string" ? a : a.id) === app.id ||
                          (typeof a === "string" ? a : a.slug) === app.slug,
                      );
                      return (
                        <label key={app.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-accent rounded px-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleBundleApp(app)}
                          />
                          <span className="text-sm">{app.name || app.slug || app.id}</span>
                        </label>
                      );
                    })}
                    {filteredAvailableApps.length === 0 && (
                      <span className="text-xs text-muted-foreground">لا توجد تطبيقات متاحة</span>
                    )}
                  </ScrollArea>
                  <div className="flex flex-wrap gap-1">
                    {formData.apps.map((app, idx) => {
                      const label = typeof app === "string" ? app : app.name || app.slug || app.id || "";
                      return <Badge key={idx} variant="outline" className="text-xs">{label}</Badge>;
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="col-span-12 md:col-span-6">
                <div className="space-y-1">
                  <Label>الاسم</Label>
                  <Input name="name" value={formData.name ?? ""} onChange={handleChange} />
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="space-y-1">
                  <Label>Slug</Label>
                  <Input name="slug" value={formData.slug ?? ""} onChange={handleChange} placeholder="اتركه فارغاً للتوليد التلقائي" />
                </div>
              </div>
              <div className="col-span-12">
                <div className="space-y-1">
                  <Label>الوصف</Label>
                  <Textarea name="description" rows={2} value={formData.description ?? ""} onChange={handleChange} />
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="space-y-2">
                  <Label>الفئة</Label>
                  <Select value={formData.category ?? "ECOMMERCE"} onValueChange={(v) => setFieldValue("category", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categoryMap.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="col-span-6 md:col-span-3">
                <div className="space-y-1">
                  <Label>السعر الشهري</Label>
                  <Input name="monthlyPrice" type="number" value={formData.monthlyPrice ?? 0} onChange={handleChange} />
                </div>
              </div>
              <div className="col-span-6 md:col-span-3">
                <div className="space-y-1">
                  <Label>أيام التجربة</Label>
                  <Input name="trialDays" type="number" value={formData.trialDays ?? 14} onChange={handleChange} />
                </div>
              </div>

              <div className="col-span-12 md:col-span-4">
                <div className="space-y-1">
                  <Label>الأيقونة (Emoji or Icon Name)</Label>
                  <Input name="icon" value={formData.icon ?? ""} onChange={handleChange} />
                </div>
              </div>
              <div className="col-span-12 md:col-span-2">
                <label className="flex items-center gap-1 h-full cursor-pointer">
                  <span className="text-sm">تثبيت تلقائي:</span>
                  <input type="checkbox" name="isAutoInstall" checked={!!formData.isAutoInstall} onChange={handleChange} />
                </label>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="space-y-1">
                  <Label>رابط اللوجو (URL)</Label>
                  <Input name="logo" value={formData.logo ?? ""} onChange={handleChange} />
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="space-y-1">
                  <Label>رابط الميديا (صورة أو فيديو URL)</Label>
                  <Input name="coverImage" value={formData.coverImage ?? ""} onChange={handleChange} placeholder="رابط مباشر للصورة أو يوتيوب/فيديو" />
                </div>
              </div>

              <div className="col-span-12 md:col-span-4">
                <div className="space-y-2">
                  <Label>نظام التسعير</Label>
                  <Select value={formData.pricingModel ?? "SUBSCRIPTION"} onValueChange={(v) => setFieldValue("pricingModel", v as PricingModel)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FREE">مجاني</SelectItem>
                      <SelectItem value="SUBSCRIPTION">اشتراك شهري/سنوي</SelectItem>
                      <SelectItem value="PAY_PER_USE">حسب الاستخدام (PPU)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="col-span-6 md:col-span-4">
                <div className="space-y-1">
                  <Label>سعر الوحدة (لـ PPU)</Label>
                  <Input name="unitPrice" type="number" value={formData.unitPrice ?? 0} onChange={handleChange} disabled={formData.pricingModel !== "PAY_PER_USE"} />
                </div>
              </div>
              <div className="col-span-6 md:col-span-4">
                <div className="space-y-1">
                  <Label>اسم الوحدة (لـ PPU)</Label>
                  <Input name="unitName" value={formData.unitName ?? ""} onChange={handleChange} disabled={formData.pricingModel !== "PAY_PER_USE"} placeholder="مثال: رسالة، موظف" />
                </div>
              </div>

              <div className="col-span-12 md:col-span-6">
                <div className="space-y-1">
                  <Label>المسار الرئيسي (Main Route)</Label>
                  <Input name="mainRoute" value={formData.mainRoute ?? ""} onChange={handleChange} placeholder="/my-apps/something" />
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="space-y-1">
                  <Label>مسار الإدارة (Admin Route)</Label>
                  <Input name="adminRoute" value={formData.adminRoute ?? ""} onChange={handleChange} placeholder="/settings/something" />
                </div>
              </div>

              <div className="col-span-12">
                <div className="space-y-1">
                  <Label>الأدوات والمميزات (Tools Included)</Label>
                  <Textarea name="features" rows={3} value={formData.features.join(", ")} onChange={(event) => setFieldValue("features", parseStringList(event.target.value))} placeholder="افصل بين كل ميزة بفاصلة (،) .. مثال: نظام تقارير، ربط واتساب، دعم فني" />
                  <p className="text-xs text-muted-foreground">افصل بين الأدوات بفاصلة لكي تظهر كنقاط منفصلة للمستخدم</p>
                </div>
              </div>

              <div className="col-span-12">
                <div className="flex gap-3 flex-wrap">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <span className="text-sm">نشط:</span>
                    <input type="checkbox" name="isActive" checked={!!formData.isActive} onChange={handleChange} />
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <span className="text-sm">عام (Public):</span>
                    <input type="checkbox" name="isPublic" checked={!!formData.isPublic} onChange={handleChange} />
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <span className="text-sm">مميز (Featured):</span>
                    <input type="checkbox" name="isFeatured" checked={!!formData.isFeatured} onChange={handleChange} />
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <span className="text-sm">شائع (Popular):</span>
                    <input type="checkbox" name="isPopular" checked={!!formData.isPopular} onChange={handleChange} />
                  </label>
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button variant="default" onClick={() => onSave(formData)}>حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

















































































































































































































































































































































































































































export default SubscriptionCenter;
