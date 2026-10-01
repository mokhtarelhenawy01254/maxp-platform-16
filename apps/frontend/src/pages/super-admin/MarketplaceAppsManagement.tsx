import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Alert } from "../../components/ui/alert";
import { Card, CardContent } from "../../components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import {
  Tabs, TabsList, TabsTrigger,
} from "../../components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "../../components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../components/ui/table";
import { Separator } from "../../components/ui/separator";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "../../components/ui/tooltip";
import { Checkbox } from "../../components/ui/checkbox";
import { ScrollArea } from "../../components/ui/scroll-area";
import { buildApiUrl } from "../../utils/urlHelper";
import axios from "axios";
import { toast } from "sonner";
import i18n from "../../i18n";
import { tToast } from "../../utils/i18n-toast";
import type { StorefrontThemeCatalogItem } from "../../services/storefrontThemeCatalogService";
import tokenManager from "../../utils/tokenManager";
import SuperAdminPaymentSettings from "./SuperAdminPaymentSettings";
import AppPricingSheet from "../subscription/AppPricingSheet";
import {
  Check, X, Plus, Pencil, Trash2, Download, Upload, RefreshCw, Save, Search, Eye, Archive, Star, DollarSign, ShoppingBag, Package, Building2, Store, CreditCard, Loader2, ArrowRight, Info, Image as ImageIcon, ListChecks, Route, Tags,
  Boxes, BarChart3, MessageSquare, Megaphone, Users, Shield, Truck, Database, Wrench, Settings2, Layers, Wallet, Heart, Briefcase, Calendar, Headphones, Zap,
  LayoutGrid, Columns3, List, CheckCircle2, XCircle, Copy, ExternalLink, ChevronDown, ChevronUp, Sparkles, Filter,
} from "lucide-react";

type MarketplaceAppsManagementProps = {
  initialTab?: number;
  storefrontThemesOnly?: boolean;
  pageTitle?: string;
  pageDescription?: string;
};

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

// Hide the global site header while the flat app editor is open
if (typeof document !== "undefined") {
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    body.app-editor-open header { display: none !important; }
    body.app-editor-open .business-shell-header { display: none !important; }
    body.app-editor-open main.pt-16 { padding-top: 0 !important; }
  `;
  document.head.appendChild(styleEl);
}

type CatalogMeta = Record<string, unknown>;
type PricingModel = "FREE" | "SUBSCRIPTION" | "PAY_PER_USE" | string;
type MarketplaceItemType = "app" | "pricing" | "bundle";

type MarketplaceAppReference = string | { id?: string; name?: string; category?: string; slug?: string };

type MarketplaceInstallCounts = {
  installations?: number;
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
  images?: string[] | string | null;
  screenshots?: string[];
  mainRoute?: string;
  adminRoute?: string;
  pricingModel?: PricingModel;
  unitPrice?: number;
  unitName?: string;
  ppuBillingMethod?: "PER_ORDER" | "PER_ITEM" | "PERCENTAGE";
  feature?: string;
  price?: number;
  unit?: string;
  discount?: number;
  apps?: MarketplaceAppReference[];
  companyId?: string;
  features?: unknown;
  _count?: MarketplaceInstallCounts;
  installCount?: number;
  rating?: number;
  reviewCount?: number;
};

type MarketplaceDialogFormData = Omit<
  MarketplaceManagementItem,
  "features" | "apps"
> & {
  features: string[];
  screenshots: string[];
  apps: MarketplaceAppReference[];
};

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

const isLikelyImageUrl = (value: string): boolean => {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (/\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)(\?.*)?$/.test(v)) return true;
  return v.startsWith("/uploads/") || v.startsWith("data:image/");
};

const isLikelyVideoUrl = (value: string): boolean => {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (/\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/.test(v)) return true;
  return /youtube|youtu\.be|vimeo|drive\.google/.test(v);
};

const normalizeBundleApps = (value: unknown): MarketplaceAppReference[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is MarketplaceAppReference =>
      typeof entry === "string" ||
      (isRecord(entry) &&
        (entry["name"] === undefined || typeof entry["name"] === "string") &&
        (entry["category"] === undefined || typeof entry["category"] === "string") &&
        (entry["id"] === undefined || typeof entry["id"] === "string")),
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
  ppuBillingMethod: "PER_ORDER",
  feature: type === "pricing" ? "" : undefined,
  price: type === "pricing" ? 0 : undefined,
  unit: type === "pricing" ? "" : undefined,
  discount: type === "bundle" ? 0 : undefined,
  trialDays: type === "bundle" ? 7 : 0,
  apps: [],
  screenshots: [],
  companyId: "",
  features: [],
});

const MarketplaceAppsManagement: React.FC<MarketplaceAppsManagementProps> = ({
  initialTab = 1,
  storefrontThemesOnly = false,
  pageTitle = "إدارة تطبيقات وأدوات المتجر",
  pageDescription = "إدارة تطبيقات المتجر، حزم الأدوات، وقوالب الواجهة",
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
  const [appsEditing, setAppsEditing] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const requestConfirm = useCallback(
    (opts: {
      title: string;
      message: string;
      confirmLabel?: string;
      onConfirm: () => void | Promise<void>;
    }) => setConfirmState(opts),
    [],
  );

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
          tToast.success("subscriptionCenter.success_update_4fdf");
        }
      } else {
        setCatalogDiff(null);
        setCatalogDiffError("فشل في جلب تقرير الفرق");
        if (showToast) {
          tToast.error("subscriptionCenter.failed_fetch_d415");
        }
      }
    } catch (err: unknown) {
      console.error("Catalog diff fetch error:", err);
      setCatalogDiff(null);
      setCatalogDiffError(getErrorMessage(err, "تعذر جلب تقرير الفرق"));
      if (showToast) {
        tToast.error("subscriptionCenter.msg_b558");
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
      if (themesRes.status === "fulfilled" && themesRes.value.data.success) {
        setStorefrontThemes(themesRes.value.data.data as StorefrontThemeCatalogItem[]);
      }

      const allFailed = [
        appsRes,
        pricingRes,
        bundlesRes,
        themesRes,
      ].every((result) => result.status === "rejected");

      setError(allFailed ? "فشل في جلب البيانات" : null);

      // Catalog diff is operational telemetry; keep it separate from base data.
      void fetchCatalogDiff();
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(
        storefrontThemesOnly
          ? "فشل في جلب كتالوج قوالب المتجر"
          : "فشل في جلب البيانات",
      );
    } finally {
      setLoading(false);
    }
  }, [fetchCatalogDiff, storefrontThemesOnly]);

  const handleDelete = useCallback(
    (id: string, typePath: "apps" | "pricing-rules" | "bundles") => {
      setConfirmState({
        title: "تأكيد الحذف",
        message: "هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذه الخطوة.",
        confirmLabel: "حذف",
        onConfirm: async () => {
          try {
            const headers = getAuthHeaders();
            await axios.delete(
              buildApiUrl(`super-admin/marketplace-management/${typePath}/${id}`),
              { headers },
            );
            tToast.success("subscriptionCenter.msg_26af");
            await fetchAllData();
          } catch (err) {
            console.error("Delete error:", err);
            tToast.error("subscriptionCenter.msg_2c0e");
          }
        },
      });
    },
    [fetchAllData],
  );

  const saveMarketplaceItem = useCallback(
    async (
      item: MarketplaceManagementItem | null,
      itemData: MarketplaceDialogFormData,
    ): Promise<boolean> => {
      try {
        const headers = getAuthHeaders();
        let typePath = "apps";
        if (activeTab === 1) typePath = "apps";
        else if (activeTab === 2)
          typePath = item?.feature ? "pricing-rules" : "bundles";

        const { apps: _apps, screenshots, ...restData } = itemData;
        const payload =
          typePath === "bundles"
            ? {
                ...restData,
                appIds: _apps.map((app) =>
                  typeof app === "string" ? app : app.slug || app.id || "",
                ).filter(Boolean),
              }
            : typePath === "apps"
              ? {
                  ...restData,
                  images: (screenshots || []).filter(Boolean),
                }
              : restData;

        if (item?.id) {
          await axios.put(
            buildApiUrl(
              `super-admin/marketplace-management/${typePath}/${item.id}`,
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

        tToast.success("subscriptionCenter.msg_6f39");
        await fetchAllData();
        return true;
      } catch (err) {
        const axiosErr = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
        const serverMsg = axiosErr?.response?.data?.message || "";
        const serverErrors = axiosErr?.response?.data?.errors;
        console.error("Marketplace save error:", err, "Server response:", axiosErr?.response?.data);
        toast.error(serverMsg || i18n.t("subscriptionCenter.saveError"));
        if (serverErrors) console.error("Validation errors:", serverErrors);
        return false;
      }
    },
    [activeTab, fetchAllData],
  );

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
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded-md bg-muted" />
          <div className="h-4 w-80 rounded-md bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-40 rounded-lg bg-muted" />
        <div className="h-56 rounded-lg bg-muted" />
      </div>
    );

  return (
    <div className="space-y-6">
      {!appsEditing && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{pageDescription}</p>
        </div>
      )}

      {error && <Alert variant="destructive">{error}</Alert>}

      {!storefrontThemesOnly && !appsEditing ? (
        <Tabs value={String(activeTab)} onValueChange={handleTabChange}>
          <TabsList variant="line" className="flex h-auto w-full flex-wrap justify-start gap-1 border-b border-border bg-transparent p-0">
            <TabsTrigger value="1" className="h-9 rounded-t-lg border-b-2 border-transparent px-3 text-sm data-active:border-primary data-active:bg-transparent data-active:text-primary">
              <ShoppingBag className="size-4" />تطبيقات المتجر
            </TabsTrigger>
            <TabsTrigger value="2" className="h-9 rounded-t-lg border-b-2 border-transparent px-3 text-sm data-active:border-primary data-active:bg-transparent data-active:text-primary">
              <Package className="size-4" />حزم الأدوات والأسعار
            </TabsTrigger>
            <TabsTrigger value="4" className="h-9 rounded-t-lg border-b-2 border-transparent px-3 text-sm data-active:border-primary data-active:bg-transparent data-active:text-primary">
              <Store className="size-4" />قوالب المتجر
            </TabsTrigger>
            <TabsTrigger value="5" className="h-9 rounded-t-lg border-b-2 border-transparent px-3 text-sm data-active:border-primary data-active:bg-transparent data-active:text-primary">
              <CreditCard className="size-4" />إعدادات الدفع
            </TabsTrigger>
            <TabsTrigger value="6" className="h-9 rounded-t-lg border-b-2 border-transparent px-3 text-sm data-active:border-primary data-active:bg-transparent data-active:text-primary">
              <DollarSign className="size-4" />أسعار التطبيقات
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      {!storefrontThemesOnly && activeTab === 1 && (
        <MarketplaceAppsTab
          apps={apps}
          catalogDiff={catalogDiff}
          catalogDiffLoading={catalogDiffLoading}
          catalogDiffError={catalogDiffError}
          onDelete={handleDelete}
          onRefresh={fetchAllData}
          onRefreshCatalogDiff={() => fetchCatalogDiff({ showToast: true })}
          saveItem={saveMarketplaceItem}
          onEditingChange={setAppsEditing}
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
      {(storefrontThemesOnly || activeTab === 4) && (
        <StorefrontThemesTab
          themes={storefrontThemes}
          onRefresh={fetchAllData}
          onConfirm={requestConfirm}
        />
      )}
      {!storefrontThemesOnly && activeTab === 5 && (
        <SuperAdminPaymentSettings />
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
              : editingItem?.feature
                ? "pricing"
                : "bundle"
          }
          availableApps={apps}
          onSave={async (itemData) => {
            if (await saveMarketplaceItem(editingItem, itemData)) {
              setMarketplaceDialog(false);
              setEditingItem(null);
            }
          }}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmState && (
        <Dialog open onOpenChange={(open) => { if (!open) setConfirmState(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{confirmState.title}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{confirmState.message}</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmState(null)}>
                إلغاء
              </Button>
              <Button
                variant="default"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  const action = confirmState.onConfirm;
                  setConfirmState(null);
                  void action();
                }}
              >
                {confirmState.confirmLabel || "تأكيد"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
  onDelete,
  onRefresh,
  onRefreshCatalogDiff,
  saveItem,
  onEditingChange,
}: {
  apps: MarketplaceManagementItem[];
  catalogDiff: CatalogDiffPayload | null;
  catalogDiffLoading: boolean;
  catalogDiffError: string | null;
  onDelete: (
    id: string,
    typePath: "apps" | "pricing-rules" | "bundles",
  ) => void;
  onRefresh: () => Promise<void> | void;
  onRefreshCatalogDiff: () => void;
  saveItem: (
    item: MarketplaceManagementItem | null,
    data: MarketplaceDialogFormData,
  ) => Promise<boolean>;
  onEditingChange?: (editing: boolean) => void;
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE" | "FEATURED" | "PAID" | "FREE"
  >("ALL");
  const [sortBy, setSortBy] = useState("installations");
  const [viewMode, setViewMode] = useState<
    "grid" | "compact" | "table" | "grouped"
  >(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("super_admin_apps_view_mode");
      if (
        saved === "grid" ||
        saved === "compact" ||
        saved === "table" ||
        saved === "grouped"
      ) {
        return saved;
      }
    }
    return "grid";
  });
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [showCatalogDiffDetails, setShowCatalogDiffDetails] = useState(false);
  const [showCatalogTools, setShowCatalogTools] = useState(false);
  const [editingApp, setEditingApp] = useState<{
    item: MarketplaceManagementItem | null;
  } | null>(null);

  const handleCopySlug = (slug?: string) => {
    if (!slug) return;
    navigator.clipboard.writeText(slug);
    setCopiedSlug(slug);
    toast.success(`تم نسخ المعرف: ${slug}`);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleViewModeChange = (
    mode: "grid" | "compact" | "table" | "grouped",
  ) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("super_admin_apps_view_mode", mode);
    }
  };

  const toggleCategoryCollapse = (category: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("ALL");
    setStatusFilter("ALL");
    setSortBy("installations");
  };

  useEffect(() => {
    const editing = !!editingApp;
    onEditingChange?.(editing);
    document.body.classList.toggle("app-editor-open", editing);
    return () => {
      document.body.classList.remove("app-editor-open");
      onEditingChange?.(false);
    };
  }, [editingApp, onEditingChange]);

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

  // Status counts
  const statusCounts = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let featured = 0;
    let paid = 0;
    let free = 0;
    for (const app of apps) {
      if (app.isActive) active++;
      else inactive++;
      if (app.isFeatured) featured++;
      const isPaid =
        (app.monthlyPrice || 0) > 0 ||
        (app.yearlyPrice || 0) > 0 ||
        app.pricingModel === "PAY_PER_USE";
      if (isPaid) paid++;
      else free++;
    }
    return {
      ALL: apps.length,
      ACTIVE: active,
      INACTIVE: inactive,
      FEATURED: featured,
      PAID: paid,
      FREE: free,
    };
  }, [apps]);

  // Filter and sort apps
  const filteredApps = useMemo(() => {
    return apps
      .filter((app) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          (app.name && app.name.toLowerCase().includes(q)) ||
          (app.slug && app.slug.toLowerCase().includes(q)) ||
          (app.description && app.description.toLowerCase().includes(q)) ||
          (app.category && app.category.toLowerCase().includes(q)) ||
          (app.mainRoute && app.mainRoute.toLowerCase().includes(q));

        const matchesCategory =
          categoryFilter === "ALL" || app.category === categoryFilter;

        let matchesStatus = true;
        if (statusFilter === "ACTIVE") matchesStatus = !!app.isActive;
        else if (statusFilter === "INACTIVE") matchesStatus = !app.isActive;
        else if (statusFilter === "FEATURED") matchesStatus = !!app.isFeatured;
        else if (statusFilter === "PAID") {
          matchesStatus =
            (app.monthlyPrice || 0) > 0 ||
            (app.yearlyPrice || 0) > 0 ||
            app.pricingModel === "PAY_PER_USE";
        } else if (statusFilter === "FREE") {
          matchesStatus =
            (app.monthlyPrice || 0) <= 0 &&
            (app.yearlyPrice || 0) <= 0 &&
            app.pricingModel !== "PAY_PER_USE";
        }

        return matchesSearch && matchesCategory && matchesStatus;
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
  }, [apps, searchQuery, categoryFilter, statusFilter, sortBy]);

  // Group apps by category for grouped view
  const appsByCategory = useMemo(() => {
    const groups: Record<string, MarketplaceManagementItem[]> = {};
    for (const app of filteredApps) {
      const cat = app.category || "OTHER";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(app);
    }
    return groups;
  }, [filteredApps]);

  // Calculate statistics
  const totalInstallations = apps.reduce(
    (sum, app) => sum + (app._count?.installations || app.installCount || 0),
    0,
  );
  const totalMonthlyRevenue = apps.reduce((sum, app) => {
    const price = app.monthlyPrice || 0;
    if (price <= 0) return sum;
    const installs = app._count?.installations || app.installCount || 0;
    return sum + installs * price;
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
    ORDER_OPS: "إدارة الطلبات",
    MEDICAL: "الطبية",
    WAREHOUSE: "المخازن",
    PAYMENTS: "المدفوعات",
    WHOLESALE: "الجملة",
    PROCUREMENT: "المشتريات",
    ACCOUNTING: "المحاسبة",
    SHIPPING: "الشحن",
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
      ORDER_OPS: "#f97316",
      MEDICAL: "#ec4899",
      WAREHOUSE: "#a16207",
      PAYMENTS: "#10b981",
      WHOLESALE: "#6366f1",
      PROCUREMENT: "#0ea5e9",
      ACCOUNTING: "#84cc16",
      SHIPPING: "#0891b2",
    };
    return colors[category] || "#6b7280";
  };

  const getAppGradient = (category?: string) => {
    const gradients: { [key: string]: string } = {
      ECOMMERCE: "bg-gradient-to-br from-blue-500 to-indigo-600",
      ["A" + "I"]: "bg-gradient-to-br from-violet-500 to-purple-600",
      CRM: "bg-gradient-to-br from-emerald-500 to-teal-600",
      COMMUNICATION: "bg-gradient-to-br from-amber-500 to-orange-600",
      ANALYTICS: "bg-gradient-to-br from-rose-500 to-red-600",
      MARKETING: "bg-gradient-to-br from-pink-500 to-rose-600",
      HR: "bg-gradient-to-br from-cyan-500 to-sky-600",
      FINANCE: "bg-gradient-to-br from-lime-500 to-green-600",
      INTEGRATION: "bg-gradient-to-br from-indigo-500 to-blue-600",
      PRODUCTIVITY: "bg-gradient-to-br from-teal-500 to-emerald-600",
      GAMIFICATION: "bg-gradient-to-br from-orange-500 to-amber-600",
      ORDER_OPS: "bg-gradient-to-br from-amber-500 to-yellow-600",
      MEDICAL: "bg-gradient-to-br from-pink-500 to-fuchsia-600",
      WAREHOUSE: "bg-gradient-to-br from-yellow-600 to-amber-700",
      PAYMENTS: "bg-gradient-to-br from-green-500 to-emerald-600",
      WHOLESALE: "bg-gradient-to-br from-indigo-500 to-violet-600",
      PROCUREMENT: "bg-gradient-to-br from-sky-500 to-blue-600",
      ACCOUNTING: "bg-gradient-to-br from-lime-500 to-green-600",
      SHIPPING: "bg-gradient-to-br from-cyan-600 to-sky-700",
    };
    return gradients[category || ""] || "bg-gradient-to-br from-slate-500 to-slate-700";
  };

  const getAppIcon = (app: MarketplaceManagementItem) => {
    if (app.logo) {
      return (
        <img src={app.logo} alt="" className="h-full w-full object-cover" />
      );
    }
    // Known lucide icon names stored in app.icon (e.g. "users", "sparkles", "store")
    const knownIcons: Record<string, React.ComponentType<{ className?: string }>> = {
      users: Users,
      sparkles: Zap,
      store: Store,
      route: Route,
      "shopping-cart": ShoppingBag,
      package: Package,
      box: Boxes,
      chart: BarChart3,
      message: MessageSquare,
      megaphone: Megaphone,
      shield: Shield,
      truck: Truck,
      database: Database,
      wrench: Wrench,
      layers: Layers,
      wallet: Wallet,
      heart: Heart,
      briefcase: Briefcase,
      calendar: Calendar,
      headphones: Headphones,
      settings: Settings2,
      tag: Tags,
      image: ImageIcon,
      credit: CreditCard,
      building: Building2,
    };
    const iconName = (app.icon || "").toLowerCase().trim();
    if (iconName && knownIcons[iconName]) {
      const Icon = knownIcons[iconName];
      return <Icon className="h-6 w-6" />;
    }
    // Category-based fallback for a consistent vector look (2026-style)
    const categoryIcon: Record<string, React.ComponentType<{ className?: string }>> = {
      "التجارة الإلكترونية": ShoppingBag,
      التحليلات: BarChart3,
      التواصل: MessageSquare,
      التسويق: Megaphone,
      "إدارة العملاء": Users,
      "إدارة الطلبات": Package,
      المخازن: Boxes,
      المدفوعات: CreditCard,
      "الإنتاجية": Calendar,
      الجملة: Briefcase,
      المشتريات: ShoppingBag,
      المحاسبة: Wallet,
      الشحن: Truck,
      التحفيز: Heart,
      المالية: DollarSign,
      "الموارد البشرية": Users,
      الأتمتة: Zap,
      التكاملات: Wrench,
      الطبية: Shield,
      CONTENT: ImageIcon,
    };
    const CatIcon = categoryIcon[(app.category || "").trim()];
    if (CatIcon) return <CatIcon className="h-6 w-6" />;
    // Last resort: first letter
    return <span className="text-lg font-black">{(app.name || "؟").charAt(0)}</span>;
  };

  const calculateAppRevenue = (app: MarketplaceManagementItem) => {
    const price = app.monthlyPrice || 0;
    if (price <= 0) return 0;
    const installs = app._count?.installations || app.installCount || 0;
    return installs * price;
  };

  const handleQuickToggle = async (
    app: MarketplaceManagementItem,
    field: "isActive" | "isPublic" | "isFeatured",
    value: boolean,
  ) => {
    try {
      await axios.put(
        buildApiUrl(`super-admin/marketplace-management/apps/${app.id}`),
        { [field]: value },
        { headers: getAuthHeaders() },
      );
      toast.success(
        `تم ${value ? "تفعيل" : "تعطيل"} ${field === "isActive" ? "التطبيق" : field === "isPublic" ? "الظهور" : "الميزة"} بنجاح`,
      );
      onRefresh();
    } catch (err) {
      tToast.error("subscriptionCenter.msg_eb61");
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
      tToast.success("subscriptionCenter.msg_9d6d");
    } catch (err) {
      console.error("Export error:", err);
      tToast.error("subscriptionCenter.msg_1144");
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
      tToast.success("subscriptionCenter.msg_c6b7");
      onRefresh();
    } catch (err) {
      console.error("Import error:", err);
      tToast.error("subscriptionCenter.msg_cc19");
    }
  };

  return (
    <div className="space-y-6">
      {editingApp ? (
        <AppEditScreen
          app={editingApp.item}
          onSave={saveItem}
          onClose={() => setEditingApp(null)}
        />
      ) : (
      <>
      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-5 text-white shadow-lg shadow-blue-900/20 transition-all duration-300 hover:scale-[1.02]">
          <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white opacity-10 blur-2xl" />
          <div className="relative z-10 mb-3 inline-flex rounded-xl bg-white/20 p-2.5 backdrop-blur-md">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <p className="relative z-10 text-sm font-medium text-blue-100">إجمالي التطبيقات</p>
          <p className="relative z-10 mt-0.5 text-2xl font-extrabold">{apps.length}</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-fuchsia-800 p-5 text-white shadow-lg shadow-purple-900/20 transition-all duration-300 hover:scale-[1.02]">
          <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white opacity-10 blur-2xl" />
          <div className="relative z-10 mb-3 inline-flex rounded-xl bg-white/20 p-2.5 backdrop-blur-md">
            <Download className="h-5 w-5" />
          </div>
          <p className="relative z-10 text-sm font-medium text-purple-100">إجمالي التثبيتات</p>
          <p className="relative z-10 mt-0.5 text-2xl font-extrabold">{totalInstallations.toLocaleString("ar-EG")}</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-5 text-white shadow-lg shadow-emerald-900/20 transition-all duration-300 hover:scale-[1.02]">
          <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white opacity-10 blur-2xl" />
          <div className="relative z-10 mb-3 inline-flex rounded-xl bg-white/20 p-2.5 backdrop-blur-md">
            <DollarSign className="h-5 w-5" />
          </div>
          <p className="relative z-10 text-sm font-medium text-emerald-100">إيرادات شهرية</p>
          <p className="relative z-10 mt-0.5 text-2xl font-extrabold">{totalMonthlyRevenue.toLocaleString("ar-EG")} ج.م</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-rose-600 to-red-700 p-5 text-white shadow-lg shadow-rose-900/20 transition-all duration-300 hover:scale-[1.02]">
          <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white opacity-10 blur-2xl" />
          <div className="relative z-10 mb-3 inline-flex rounded-xl bg-white/20 p-2.5 backdrop-blur-md">
            <Star className="h-5 w-5" />
          </div>
          <p className="relative z-10 text-sm font-medium text-rose-100">التطبيقات النشطة</p>
          <p className="relative z-10 mt-0.5 text-2xl font-extrabold">{activeApps}</p>
          <p className="relative z-10 text-xs font-medium text-rose-200/90">{featuredApps} مميز</p>
        </div>
      </div>

      {/* Catalog Diff (Files vs DB) — developer tool, collapsed by default */}
      {showCatalogTools && (
      <div className={`rounded-2xl border bg-card text-card-foreground shadow-sm p-4 ${(catalogDiff?.totals?.diffEntries || 0) > 0 ? "border-yellow-500/60 dark:border-yellow-500/40" : "border-green-500/60 dark:border-green-500/40"}`}>
        <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-2 mb-3">
          <div>
            <h3 className="text-base font-semibold">
              فرق الكاتالوج (الملفات مقابل قاعدة البيانات)
            </h3>
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
          <Alert variant="default" className="mb-3 border-yellow-500/50 text-yellow-700 dark:border-yellow-500/40 dark:text-yellow-400">
            {catalogDiffError}
          </Alert>
        )}

        {hasDiffData ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-xl bg-muted/50 p-2.5">
              <span className="text-xs text-muted-foreground">إجمالي الفرق</span>
              <p className="mt-0.5 text-lg font-bold">{catalogDiff?.totals?.diffEntries || 0}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-2.5">
              <span className="text-xs text-muted-foreground">التطبيقات (الملفات/قاعدة البيانات)</span>
              <p className="mt-0.5 text-lg font-bold">{catalogDiff?.totals?.catalogApps || 0}/{catalogDiff?.totals?.dbApps || 0}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-2.5">
              <span className="text-xs text-muted-foreground">الباقات (الملفات/قاعدة البيانات)</span>
              <p className="mt-0.5 text-lg font-bold">{catalogDiff?.totals?.catalogBundles || 0}/{catalogDiff?.totals?.dbBundles || 0}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-2.5">
              <span className="text-xs text-muted-foreground">فروقات التطبيقات</span>
              <p className="mt-0.5 text-lg font-bold">{appDiffEntries}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">فروقات الباقات</span>
              <p className="mt-0.5 text-lg font-bold">{bundleDiffEntries}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">لا توجد بيانات فرق متاحة حالياً.</p>
        )}

        {showCatalogDiffDetails && hasDiffData && (
          <div>
            <Separator className="my-2" />
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-12 md:col-span-6">
                <p className="text-sm font-semibold text-muted-foreground">تطبيقات</p>
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
                <p className="text-sm font-semibold text-muted-foreground">باقات</p>
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
      )}

      {/* Filters, Search & View Controls */}
      <div className="rounded-2xl border bg-card text-card-foreground shadow-sm p-4 space-y-3.5">
        {/* Row 1: Search, Sort, View Switcher & Actions */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search & Sort */}
          <div className="flex flex-1 flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="apps-search"
                className="w-full pr-9 pl-8"
                placeholder="البحث بالاسم، المعرّف (slug)، الفئة، أو المسار..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="w-full sm:w-[170px] shrink-0">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v ?? "installations")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={sortBy === "installations" ? "الأكثر تثبيتاً" : sortBy === "price" ? "الأعلى سعراً" : sortBy === "rating" ? "الأعلى تقييماً" : "الاسم"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="installations">الأكثر تثبيتاً</SelectItem>
                  <SelectItem value="price">الأعلى سعراً</SelectItem>
                  <SelectItem value="rating">الأعلى تقييماً</SelectItem>
                  <SelectItem value="name">الاسم أبجدياً</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* View Mode Switcher & Actions */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
            {/* View Mode Segmented Control */}
            <div className="inline-flex items-center rounded-xl border border-border bg-muted/60 p-1 shadow-inner">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleViewModeChange("grid")}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                        viewMode === "grid"
                          ? "bg-background text-primary shadow-sm ring-1 ring-border"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                      }`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">مفصلة</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>شبكة بطاقات مفصلة</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleViewModeChange("compact")}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                        viewMode === "compact"
                          ? "bg-background text-primary shadow-sm ring-1 ring-border"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                      }`}
                    >
                      <Columns3 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">مدمجة</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>بطاقات مدمجة خفيفة</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleViewModeChange("table")}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                        viewMode === "table"
                          ? "bg-background text-primary shadow-sm ring-1 ring-border"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                      }`}
                    >
                      <List className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">جدول</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>جدول بيانات إداري متكامل</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleViewModeChange("grouped")}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                        viewMode === "grouped"
                          ? "bg-background text-primary shadow-sm ring-1 ring-border"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">فئات</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>تجميع حسب الفئات</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="default" onClick={() => setEditingApp({ item: null })}>
                <Plus className="h-4 w-4 ml-1" />
                إضافة
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 ml-1" />
                تصدير
              </Button>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <Button variant="outline" size="sm" render={<span />}>
                  <Upload className="h-4 w-4 ml-1" />
                  استيراد
                </Button>
                <input type="file" hidden accept=".json" onChange={handleImport} />
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCatalogTools((prev) => !prev)}
                className="text-muted-foreground hover:bg-muted"
                title="أدوات المطور"
              >
                <Wrench className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Row 2: Status Quick Filters & Counter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs font-medium text-muted-foreground ml-1 hidden sm:inline">الحالة:</span>
            {[
              { id: "ALL", label: "الكل", count: statusCounts.ALL },
              { id: "ACTIVE", label: "النشطة", count: statusCounts.ACTIVE },
              { id: "INACTIVE", label: "المعطلة", count: statusCounts.INACTIVE },
              { id: "FEATURED", label: "المميزة", count: statusCounts.FEATURED },
              { id: "PAID", label: "المدفوعة", count: statusCounts.PAID },
              { id: "FREE", label: "المجانية", count: statusCounts.FREE },
            ].map((st) => {
              const active = statusFilter === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id as typeof statusFilter)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{st.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[0.65rem] font-bold ${
                      active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background/80 text-foreground/70"
                    }`}
                  >
                    {st.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mr-auto sm:mr-0">
            <span>
              عرض <strong className="text-foreground">{filteredApps.length}</strong> من {apps.length} تطبيق
            </span>
            {(searchQuery || categoryFilter !== "ALL" || statusFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-6 px-2 text-xs text-primary hover:bg-primary/10"
              >
                إعادة ضبط
              </Button>
            )}
          </div>
        </div>

        {/* Row 3: Horizontal Scrollable Category Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-none">
          {categories.map((cat) => {
            const count = cat === "ALL" ? apps.length : apps.filter((a) => a.category === cat).length;
            const isSelected = categoryFilter === cat;
            const color = cat === "ALL" ? "var(--muted-foreground)" : getCategoryColor(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all shrink-0 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: isSelected ? "#ffffff" : color }}
                />
                <span>{categoryLabels[cat] || cat}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[0.68rem] ${
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-background/80 text-foreground/70"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Apps View: 4 Display Modes */}
      {filteredApps.length > 0 ? (
        <>
          {/* 1. DETAILED GRID VIEW */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApps.map((app) => {
                const monthlyRevenue = calculateAppRevenue(app);
                const isExpanded = expandedApp === app.id;
                const monthlyPrice = app.monthlyPrice || 0;
                const yearlyPrice = app.yearlyPrice || 0;
                const yearlySavings =
                  monthlyPrice > 0 && yearlyPrice > 0
                    ? Math.max(0, Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100))
                    : 0;
                const installs = app._count?.installations || app.installCount || 0;

                return (
                  <div key={app.id} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
                    {/* Card Header */}
                    <div className="relative overflow-hidden border-b border-border/60 p-4 pb-3">
                      <div
                        className="absolute -left-10 -top-12 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
                        style={{ backgroundColor: getCategoryColor(app.category || "") }}
                      />
                      <div className="relative flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl text-white shadow-md ${getAppGradient(app.category)}`}>
                            {getAppIcon(app)}
                          </div>
                          <div className="min-w-0">
                            <h3
                              onClick={() => app.id && navigate(`/super-admin/apps/${app.id}`)}
                              className="truncate text-base font-bold leading-tight cursor-pointer hover:text-primary transition-colors"
                            >
                              {app.name}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {app.slug && (
                                <button
                                  type="button"
                                  onClick={() => handleCopySlug(app.slug)}
                                  className="inline-flex items-center gap-1 font-mono text-[0.68rem] text-muted-foreground hover:text-foreground bg-muted/60 px-1.5 py-0.5 rounded"
                                  title="نسخ المعرف"
                                >
                                  <span>{app.slug}</span>
                                  <Copy className="h-2.5 w-2.5 opacity-60" />
                                </button>
                              )}
                              {app.category && (
                                <span
                                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold text-white"
                                  style={{ backgroundColor: getCategoryColor(app.category) }}
                                >
                                  {categoryLabels[app.category] || app.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {app.isFeatured && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[0.65rem] font-bold text-white shadow-sm">
                              <Star className="h-3 w-3 fill-current" />
                              مميز
                            </span>
                          )}
                          {app.isPopular && (
                            <span className="inline-flex items-center rounded-full bg-sky-500 px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                              شائع
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <CardContent className="flex flex-grow flex-col gap-3 p-4 pt-3">
                      {/* Description */}
                      <p className="line-clamp-2 text-sm text-muted-foreground min-h-[2.5rem]">
                        {app.description || "لا يوجد وصف متوفر لهذا التطبيق"}
                      </p>

                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-muted/50 p-2 text-center">
                          <p className="text-sm font-bold text-primary">{installs.toLocaleString("ar-EG")}</p>
                          <span className="text-[0.65rem] text-muted-foreground">تثبيت</span>
                        </div>
                        <div className="rounded-xl bg-muted/50 p-2 text-center">
                          <p className="text-sm font-bold text-amber-500 inline-flex items-center justify-center gap-0.5">
                            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            {app.rating?.toFixed(1) || "0.0"}
                          </p>
                          <span className="text-[0.65rem] text-muted-foreground">({app.reviewCount || 0})</span>
                        </div>
                        <div className="rounded-xl bg-muted/50 p-2 text-center">
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{monthlyRevenue.toLocaleString("ar-EG")}</p>
                          <span className="text-[0.65rem] text-muted-foreground">ج.م/شهر</span>
                        </div>
                      </div>

                      {/* Price Pill */}
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-extrabold text-primary">
                            {monthlyPrice ? `${monthlyPrice.toLocaleString("ar-EG")} ج.م` : "مجاني"}
                          </span>
                          {monthlyPrice ? <span className="text-xs text-muted-foreground">/ شهر</span> : null}
                        </div>
                        {yearlySavings > 0 && (
                          <span className="inline-flex items-center rounded-full bg-green-500/15 px-2 py-0.5 text-[0.65rem] font-semibold text-green-700 dark:text-green-400">
                            {`${yearlySavings}% توفير سنوي`}
                          </span>
                        )}
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="rounded-xl bg-muted/30 p-2.5 space-y-1 text-xs text-muted-foreground border border-border/40">
                          <div className="flex justify-between">
                            <span>فترة التجربة:</span>
                            <span className="font-semibold text-foreground">{app.trialDays || 14} يوم</span>
                          </div>
                          <div className="flex justify-between">
                            <span>الإيراد السنوي المتوقع:</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {((app.monthlyPrice || 0) * installs * 12).toLocaleString("ar-EG")} ج.م
                            </span>
                          </div>
                          {app.mainRoute && (
                            <div className="flex justify-between items-center">
                              <span>المسار:</span>
                              <span className="font-mono text-[0.7rem] text-foreground bg-muted px-1.5 py-0.5 rounded">
                                {app.mainRoute}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quick Switches */}
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <Checkbox
                              checked={!!app.isActive}
                              onCheckedChange={(checked) => handleQuickToggle(app, "isActive", checked === true)}
                            />
                            <span>نشط</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <Checkbox
                              checked={!!app.isPublic}
                              onCheckedChange={(checked) => handleQuickToggle(app, "isPublic", checked === true)}
                            />
                            <span>عام</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <Checkbox
                              checked={!!app.isFeatured}
                              onCheckedChange={(checked) => handleQuickToggle(app, "isFeatured", checked === true)}
                            />
                            <span>مميز</span>
                          </label>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-between items-center pt-1">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            onClick={() => app.id && navigate(`/super-admin/apps/${app.id}`)}
                            variant="ghost"
                            className="text-primary hover:bg-primary/10 hover:text-primary font-semibold"
                          >
                            إدارة التطبيق
                            <ArrowRight className="h-3.5 w-3.5 mr-1" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedApp(isExpanded ? null : (app.id ?? null))}
                            className="text-muted-foreground hover:bg-muted text-xs"
                          >
                            {isExpanded ? "أقل" : "المزيد"}
                          </Button>
                        </div>
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="تعديل التطبيق"
                                  onClick={() => setEditingApp({ item: app })}
                                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>تعديل التطبيق</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="حذف التطبيق"
                                  onClick={() => app.id && onDelete(app.id, "apps")}
                                  className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>حذف التطبيق</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </CardContent>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. COMPACT GRID VIEW */}
          {viewMode === "compact" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredApps.map((app) => {
                const monthlyRevenue = calculateAppRevenue(app);
                const installs = app._count?.installations || app.installCount || 0;
                const monthlyPrice = app.monthlyPrice || 0;

                return (
                  <div
                    key={app.id}
                    className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-3.5 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md"
                  >
                    {/* Header */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-white shadow-sm ${getAppGradient(app.category)}`}>
                            {getAppIcon(app)}
                          </div>
                          <div className="min-w-0">
                            <h4
                              onClick={() => app.id && navigate(`/super-admin/apps/${app.id}`)}
                              className="font-bold text-sm truncate cursor-pointer hover:text-primary transition-colors"
                            >
                              {app.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {app.category && (
                                <span
                                  className="inline-block px-1.5 py-0.2 rounded-full text-[0.62rem] font-semibold text-white"
                                  style={{ backgroundColor: getCategoryColor(app.category) }}
                                >
                                  {categoryLabels[app.category] || app.category}
                                </span>
                              )}
                              {app.slug && (
                                <button
                                  type="button"
                                  onClick={() => handleCopySlug(app.slug)}
                                  className="font-mono text-[0.62rem] text-muted-foreground hover:text-foreground truncate max-w-[90px]"
                                  title={`نسخ المعرف: ${app.slug}`}
                                >
                                  {app.slug}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {app.isFeatured && (
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 shrink-0" />
                        )}
                      </div>

                      {/* Performance Bar */}
                      <div className="flex items-center justify-between rounded-xl bg-muted/50 px-2.5 py-1.5 text-xs mb-2.5">
                        <span className="font-semibold text-primary">
                          {monthlyPrice > 0 ? `${monthlyPrice.toLocaleString("ar-EG")} ج/ش` : "مجاني"}
                        </span>
                        <span className="text-muted-foreground">
                          {installs} تثبيت
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {monthlyRevenue > 0 ? `${monthlyRevenue.toLocaleString("ar-EG")} ج` : "-"}
                        </span>
                      </div>
                    </div>

                    {/* Footer Controls */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <Switch
                          checked={!!app.isActive}
                          onCheckedChange={(checked) => handleQuickToggle(app, "isActive", checked)}
                          className="scale-75 origin-right"
                        />
                        <span className={app.isActive ? "text-foreground font-medium" : "text-muted-foreground"}>
                          {app.isActive ? "نشط" : "معطل"}
                        </span>
                      </label>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => app.id && navigate(`/super-admin/apps/${app.id}`)}
                          className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                        >
                          إدارة
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingApp({ item: app })}
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => app.id && onDelete(app.id, "apps")}
                          className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. ADMINISTRATIVE DATA TABLE VIEW */}
          {viewMode === "table" && (
            <div className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/60">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[280px]">التطبيق والمعرّف</TableHead>
                      <TableHead className="w-[140px]">الفئة</TableHead>
                      <TableHead className="w-[140px]">التسعير</TableHead>
                      <TableHead className="w-[170px]">التثبيتات والإيراد</TableHead>
                      <TableHead className="w-[210px]">حالة التشغيل والظهور</TableHead>
                      <TableHead className="w-[150px]">المسار</TableHead>
                      <TableHead className="w-[120px] text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApps.map((app) => {
                      const monthlyRevenue = calculateAppRevenue(app);
                      const installs = app._count?.installations || app.installCount || 0;
                      const monthlyPrice = app.monthlyPrice || 0;

                      return (
                        <TableRow key={app.id} className="hover:bg-muted/40 transition-colors">
                          {/* App & Slug */}
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-white shadow-sm ${getAppGradient(app.category)}`}>
                                {getAppIcon(app)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    onClick={() => app.id && navigate(`/super-admin/apps/${app.id}`)}
                                    className="font-bold text-sm cursor-pointer hover:text-primary transition-colors truncate"
                                  >
                                    {app.name}
                                  </span>
                                  {app.isFeatured && (
                                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 shrink-0" />
                                  )}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {app.slug && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopySlug(app.slug)}
                                      className="font-mono text-[0.7rem] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 bg-muted/60 px-1.5 py-0.2 rounded"
                                      title="نسخ المعرف"
                                    >
                                      <span>{app.slug}</span>
                                      <Copy className="h-2.5 w-2.5 opacity-60" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Category */}
                          <TableCell>
                            {app.category ? (
                              <span
                                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-white whitespace-nowrap"
                                style={{ backgroundColor: getCategoryColor(app.category) }}
                              >
                                {categoryLabels[app.category] || app.category}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>

                          {/* Pricing */}
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="font-bold text-sm text-primary">
                                {monthlyPrice > 0 ? `${monthlyPrice.toLocaleString("ar-EG")} ج/شهر` : "مجاني"}
                              </p>
                              {app.yearlyPrice ? (
                                <p className="text-[0.7rem] text-muted-foreground">
                                  سنوي: {app.yearlyPrice.toLocaleString("ar-EG")} ج
                                </p>
                              ) : null}
                            </div>
                          </TableCell>

                          {/* Stats */}
                          <TableCell>
                            <div className="space-y-0.5 text-xs">
                              <div className="flex items-center gap-1 font-semibold text-foreground">
                                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{installs.toLocaleString("ar-EG")} تثبيت</span>
                              </div>
                              <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                                {monthlyRevenue > 0 ? `${monthlyRevenue.toLocaleString("ar-EG")} ج/ش` : "0 ج/ش"}
                              </div>
                            </div>
                          </TableCell>

                          {/* Status Toggles */}
                          <TableCell>
                            <div className="flex items-center gap-3 text-xs">
                              <label className="flex items-center gap-1 cursor-pointer" title="تفعيل / تعطيل">
                                <Switch
                                  checked={!!app.isActive}
                                  onCheckedChange={(checked) => handleQuickToggle(app, "isActive", checked)}
                                  className="scale-75 origin-right"
                                />
                                <span className={app.isActive ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
                                  نشط
                                </span>
                              </label>

                              <label className="flex items-center gap-1 cursor-pointer" title="الظهور في المتجر">
                                <Switch
                                  checked={!!app.isPublic}
                                  onCheckedChange={(checked) => handleQuickToggle(app, "isPublic", checked)}
                                  className="scale-75 origin-right"
                                />
                                <span className={app.isPublic ? "text-blue-600 dark:text-blue-400 font-medium" : "text-muted-foreground"}>
                                  عام
                                </span>
                              </label>

                              <label className="flex items-center gap-1 cursor-pointer" title="تطبيق مميز">
                                <Switch
                                  checked={!!app.isFeatured}
                                  onCheckedChange={(checked) => handleQuickToggle(app, "isFeatured", checked)}
                                  className="scale-75 origin-right"
                                />
                                <span className={app.isFeatured ? "text-amber-500 font-medium" : "text-muted-foreground"}>
                                  مميز
                                </span>
                              </label>
                            </div>
                          </TableCell>

                          {/* Route */}
                          <TableCell>
                            {app.mainRoute ? (
                              <span className="font-mono text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded truncate max-w-[140px] inline-block" title={app.mainRoute}>
                                {app.mainRoute}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-left">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => app.id && navigate(`/super-admin/apps/${app.id}`)}
                                className="h-8 px-2.5 text-xs text-primary border-primary/20 hover:bg-primary/10 font-semibold"
                              >
                                إدارة
                              </Button>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setEditingApp({ item: app })}
                                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>تعديل</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => app.id && onDelete(app.id, "apps")}
                                      className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>حذف</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* 4. GROUPED BY CATEGORY VIEW */}
          {viewMode === "grouped" && (
            <div className="space-y-4">
              {Object.entries(appsByCategory).map(([catKey, catApps]) => {
                const isCollapsed = collapsedCategories[catKey];
                const catInstalls = catApps.reduce(
                  (sum, a) => sum + (a._count?.installations || a.installCount || 0),
                  0,
                );
                const catRevenue = catApps.reduce((sum, a) => {
                  const p = a.monthlyPrice || 0;
                  const inst = a._count?.installations || a.installCount || 0;
                  return sum + p * inst;
                }, 0);
                const catActiveCount = catApps.filter((a) => a.isActive).length;
                const catColor = getCategoryColor(catKey);

                return (
                  <div key={catKey} className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                    {/* Category Header Banner */}
                    <div
                      onClick={() => toggleCategoryCollapse(catKey)}
                      className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer hover:bg-muted/40 transition-colors border-b border-border/40"
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-4 w-1.5 rounded-full" style={{ backgroundColor: catColor }} />
                        <h3 className="font-bold text-base text-foreground">
                          {categoryLabels[catKey] || catKey}
                        </h3>
                        <Badge variant="secondary" className="text-xs font-semibold">
                          {catApps.length} تطبيق
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="hidden sm:flex items-center gap-3 text-muted-foreground">
                          <span>
                            نشط: <strong className="text-foreground">{catActiveCount}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            التثبيتات: <strong className="text-foreground">{catInstalls.toLocaleString("ar-EG")}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            الإيراد: <strong className="text-emerald-600 dark:text-emerald-400">{catRevenue.toLocaleString("ar-EG")} ج.م</strong>
                          </span>
                        </div>

                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Category Apps */}
                    {!isCollapsed && (
                      <div className="p-4 bg-muted/20">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {catApps.map((app) => {
                            const monthlyRevenue = calculateAppRevenue(app);
                            const installs = app._count?.installations || app.installCount || 0;
                            const monthlyPrice = app.monthlyPrice || 0;

                            return (
                              <div
                                key={app.id}
                                className="flex flex-col justify-between rounded-xl border border-border bg-card p-3 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all"
                              >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg text-white shadow-xs ${getAppGradient(app.category)}`}>
                                      {getAppIcon(app)}
                                    </div>
                                    <div className="min-w-0">
                                      <h4
                                        onClick={() => app.id && navigate(`/super-admin/apps/${app.id}`)}
                                        className="font-bold text-xs truncate cursor-pointer hover:text-primary"
                                      >
                                        {app.name}
                                      </h4>
                                      <p className="font-mono text-[0.62rem] text-muted-foreground truncate">
                                        {app.slug}
                                      </p>
                                    </div>
                                  </div>
                                  {app.isFeatured && (
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-500 shrink-0" />
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-[0.7rem] bg-muted/50 px-2 py-1 rounded-md mb-2">
                                  <span className="font-bold text-primary">
                                    {monthlyPrice > 0 ? `${monthlyPrice} ج` : "مجاني"}
                                  </span>
                                  <span className="text-muted-foreground">{installs} تثبيت</span>
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    {monthlyRevenue > 0 ? `${monthlyRevenue} ج` : "-"}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-xs">
                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <Switch
                                      checked={!!app.isActive}
                                      onCheckedChange={(checked) => handleQuickToggle(app, "isActive", checked)}
                                      className="scale-60 origin-right"
                                    />
                                    <span className="text-[0.65rem] text-muted-foreground">
                                      {app.isActive ? "نشط" : "معطل"}
                                    </span>
                                  </label>

                                  <div className="flex items-center gap-0.5">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => app.id && navigate(`/super-admin/apps/${app.id}`)}
                                      className="h-6 px-1.5 text-[0.65rem] text-primary"
                                    >
                                      إدارة
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setEditingApp({ item: app })}
                                      className="h-6 w-6 text-muted-foreground hover:text-primary"
                                    >
                                      <Pencil className="h-2.5 w-2.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => app.id && onDelete(app.id, "apps")}
                                      className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed bg-card/60 text-card-foreground p-6 sm:p-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
            <Search className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-semibold text-foreground mt-3">لا توجد تطبيقات مطابقة للبحث أو الفلتر المختار</p>
          <p className="text-xs text-muted-foreground mt-1">جرّب تعديل كلمات البحث، الفئة، أو خيارات التصفية السريعة</p>
          <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-3 text-xs">
            <RefreshCw className="h-3.5 w-3.5 ml-1.5" />
            إعادة ضبط الفلاتر
          </Button>
        </div>
      )}
      </>
      )}
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
  onEdit: (item: MarketplaceManagementItem | null) => void;
  onDelete: (
    id: string,
    typePath: "apps" | "pricing-rules" | "bundles",
  ) => void;
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
      await axios.put(
        buildApiUrl(`super-admin/marketplace-management/bundles/${bundle.id}`),
        { [field]: value },
        { headers: getAuthHeaders() },
      );
      toast.success(`تم ${value ? "تفعيل" : "تعطيل"} الباقة بنجاح`);
      onRefresh();
    } catch (err) {
      tToast.error("subscriptionCenter.msg_eb61");
    }
  };

  return (
    <div className="space-y-6">
      {/* Pricing Rules Section */}
      <div>
        <div className="flex justify-between items-center">
          <h3 className="text-base font-semibold">قواعد التسعير الإضافية</h3>
          <Button variant="outline" size="sm" onClick={() => onEdit({ feature: "", price: 0, unit: "" })}>
            <Plus className="h-4 w-4 ml-1" />إضافة قاعدة
          </Button>
        </div>
        <div className="mt-3 rounded-lg border bg-card shadow-sm overflow-x-auto">
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
                    <Button variant="ghost" size="icon" aria-label="تعديل قاعدة التسعير" onClick={() => onEdit(rule)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="حذف قاعدة التسعير" onClick={() => rule.id && onDelete(rule.id, "pricing-rules")}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Bundles Section */}
      <div>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-semibold">باقات العروض (Bundles)</h3>
            <span className="text-xs text-muted-foreground">{bundles.length} باقة | {bundles.filter((b) => b.isActive).length} نشطة</span>
          </div>
          <Button variant="default" size="sm" onClick={() => onEdit({ name: "", price: 0, apps: [] })}>
            <Plus className="h-4 w-4 ml-1" />إضافة باقة
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-12 gap-4">
          {bundles.map((bundle) => {
            const isExpanded = expandedBundle === bundle.id;
            const bundleApps = normalizeBundleApps(bundle.apps);
            const appsCount = bundleApps.length;
            const savings = calculateBundleSavings(bundle);

            return (
              <div key={bundle.id} className="col-span-12 md:col-span-6">
                <Card className={`h-full transition-all ${bundle.isActive ? "" : "opacity-70"} ${bundle.isFeatured ? "border-2 border-amber-500" : ""}`}>
                  <CardContent>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <h4 className="text-base font-semibold">{bundle.name}</h4>
                          {bundle.isFeatured && <Badge variant="default" className="bg-amber-500 text-xs"><Star className="h-3 w-3 ml-0.5" />مميزة</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{bundle.description || "لا يوجد وصف"}</p>
                      </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <Badge variant={bundle.isActive ? "default" : "destructive"} className={bundle.isActive ? "bg-green-500" : ""}>{bundle.isActive ? "نشطة" : "معطلة"}</Badge>
                    </div>
                  </div>

                  {/* Pricing Info */}
                  <div className="rounded-lg border bg-muted/40 p-2 mb-2">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <span className="text-xs text-muted-foreground block">السعر الحالي</span>
                        <p className="text-xl font-bold text-green-700 dark:text-green-400">{bundle.monthlyPrice?.toLocaleString("ar-EG") || 0} ج</p>
                        <span className="text-xs text-muted-foreground">/ شهر</span>
                      </div>
                      <div className="col-span-6 text-right">
                        {savings > 0 && (
                          <>
                            <Badge className="bg-green-500 mb-0.5">توفير {savings}%</Badge>
                            <span className="text-xs text-green-600 dark:text-green-400 block">خصم على التطبيقات</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Apps List */}
                  <div className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-semibold text-muted-foreground">التطبيقات المُضمنة ({appsCount})</p>
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
                  <div className="flex gap-3 mb-1 flex-wrap">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox checked={!!bundle.isActive} onCheckedChange={(checked) => handleQuickToggle(bundle, "isActive", checked === true)} />
                      <span className="text-xs">نشطة</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox checked={!!bundle.isFeatured} onCheckedChange={(checked) => handleQuickToggle(bundle, "isFeatured", checked === true)} />
                      <span className="text-xs">مميزة</span>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center">
                    <Button size="sm" onClick={() => setExpandedBundle(isExpanded ? null : (bundle.id ?? null))} variant="ghost">
                      {isExpanded ? "أقل" : "عرض التفاصيل"}
                    </Button>
                    <div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="تعديل الباقة" onClick={() => onEdit(bundle)}><Pencil className="h-4 w-4" /></Button>
                          </TooltipTrigger>
                          <TooltipContent>تعديل</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="حذف الباقة" onClick={() => bundle.id && onDelete(bundle.id, "bundles")}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
        <div className="rounded-xl border bg-card/60 text-card-foreground shadow-sm p-6 text-center">
          <Package className="mx-auto h-7 w-7 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-muted-foreground mt-2">لا توجد باقات محددة</p>
        </div>
      )}
    </div>
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
  onConfirm,
}: {
  themes: StorefrontThemeCatalogItem[];
  onRefresh: () => void;
  onConfirm: (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  }) => void;
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
      tToast.error("subscriptionCenter.msg_6f63");
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
      tToast.error("subscriptionCenter.failed_update_a0da");
    } finally {
      setBulkSaving(false);
    }
  };

  const handleArchiveThemes = async (themeIds: string[]) => {
    const themesToArchive = draftThemes.filter((theme) =>
      themeIds.includes(theme.themeId),
    );
    if (themesToArchive.some((theme) => theme.isDefaultTheme)) {
      tToast.error("subscriptionCenter.msg_6d79");
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

    onConfirm({
      title: "أرشفة القوالب",
      message: confirmMessage,
      confirmLabel: "أرشفة",
      onConfirm: () =>
        persistThemePatch(
          themeIds,
          { isActive: false, isPublic: false },
          "تمت أرشفة القوالب المحددة",
        ),
    });
  };

  const handleApplyBulkPrice = async () => {
    const price = Number(bulkPrice);
    if (!Number.isFinite(price) || price < 0) {
      tToast.error("subscriptionCenter.msg_94b7");
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
    if (needsActivation) {
      onConfirm({
        title: "تعيين كقالب افتراضي",
        message:
          "سيتم جعل هذا القالب ظاهرًا ومتاحًا للتفعيل لأنه سيصبح الافتراضي لأي متجر جديد. هل تريد المتابعة؟",
        confirmLabel: "تعيين",
        onConfirm: () => doSetDefaultTheme(theme),
      });
      return;
    }

    await doSetDefaultTheme(theme);
  };

  const doSetDefaultTheme = async (theme: StorefrontThemeCatalogItem) => {
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
      tToast.success("subscriptionCenter.msg_4f19");
      await onRefresh();
    } catch (error) {
      console.error("Default storefront theme update error:", error);
      tToast.error("subscriptionCenter.msg_6b19");
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
      tToast.success("subscriptionCenter.success_update_78cf");
      onRefresh();
    } catch (error) {
      console.error("Theme catalog save error:", error);
      tToast.error("subscriptionCenter.failed_update_3eb1");
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
          persistThemeDraft(theme.themeId, nextDrafts[theme.themeId]!),
        ),
      );
      const failedCount = results.filter(
        (result) => result.status === "rejected",
      ).length;

      if (failedCount > 0) {
        toast.error(i18n.t("subscriptionCenter.templateUpdateFailed", { failedCount }));
      } else {
        tToast.success("subscriptionCenter.msg_cae9");
      }

      onRefresh();
    } catch (error) {
      console.error("Bulk theme activation error:", error);
      tToast.error("subscriptionCenter.msg_264a");
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">إجمالي القوالب</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{draftThemes.length}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Store className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">قوالب متاحة للتفعيل</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{draftThemes.filter((theme) => theme.isActive).length}</p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-500">
              <Check className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">شركات تستخدم قالبًا</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{totalCurrentCompanies}</p>
            </div>
            <div className="rounded-lg bg-sky-500/10 p-2.5 text-sky-500">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">القالب الافتراضي</p>
              <p className="mt-1 text-lg font-bold tracking-tight truncate">{defaultTheme ? defaultTheme.name : "غير محدد"}</p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-500">
              <Star className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert variant="default" className="border-blue-500/50 text-blue-700 dark:border-blue-500/40 dark:text-blue-400">
        القالب الافتراضي هو الذي يحصل عليه أي متجر جديد عند إنشاء إعدادات
        المتجر لأول مرة.{" "}
        {defaultTheme
          ? `المحدد حاليًا: ${defaultTheme.name}.`
          : "لم يتم تحديد قالب افتراضي من الكتالوج بعد."}{" "}
        إجمالي عمليات شراء القوالب المسجلة: {totalPurchases}.
      </Alert>

      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-2">
        <div>
          <h2 className="text-base font-semibold">كتالوج قوالب المتجر</h2>
          <p className="text-sm text-muted-foreground">
            من هنا يتحكم السوبر أدمن في إتاحة القوالب وتسعيرها للشركات، بينما
            الشراء والتطبيق يتمان من صفحة القوالب داخل متجر التطبيقات.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={onRefresh} disabled={bulkSaving}>
            <RefreshCw className="h-4 w-4 ml-1" />تحديث البيانات
          </Button>
          <Button variant="default" className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600" onClick={handleEnableAndShowAllThemes} disabled={bulkSaving || uniqueThemes.length === 0}>
            <Check className="h-4 w-4 ml-1" />{bulkSaving ? "جارٍ الإظهار والتفعيل..." : "إظهار وتفعيل كل القوالب"}
          </Button>
        </div>
      </div>

      {hiddenOrInactiveThemesCount > 0 ? (
        <Alert variant="default" className="border-yellow-500/50 text-yellow-700 dark:border-yellow-500/40 dark:text-yellow-400">
          يوجد {hiddenOrInactiveThemesCount} قالب غير ظاهر للشركات أو غير متاح
          للتفعيل حاليًا. الزر الجماعي بالأعلى يعيدها كلها إلى حالة
          <strong> ظاهر + متاح للتفعيل </strong>
          دفعة واحدة.
        </Alert>
      ) : (
        <Alert variant="default" className="border-green-500/50 text-green-700 dark:text-green-400 dark:border-green-500/40 dark:text-green-400">
          جميع القوالب الحالية ظاهرة للشركات ومتاحة للتفعيل.
        </Alert>
      )}

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-3">
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
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "ALL")}>
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
                <p className="text-sm font-semibold text-muted-foreground">{selectedThemeIds.length} قالب محدد</p>
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
                        <h6 className="text-base font-bold leading-none">{draft.name}</h6>
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

                  <div className="rounded-lg border bg-muted/50 p-2 mb-2">
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
                    <Button
                      variant="outline"
                      render={<a href={`/marketplace/themes?theme=${encodeURIComponent(draft.themeId)}`} target="_blank" rel="noreferrer" />}
                    >
                      <Eye className="h-4 w-4 ml-1" />معاينة
                    </Button>
                    <div className="flex gap-1 flex-wrap">
                      <Button variant={draft.isDefaultTheme ? "default" : "outline"} onClick={() => draft && handleSetDefaultTheme(draft)} disabled={isSaving || draft.isDefaultTheme}>
                        <Star className="h-4 w-4 ml-1" />{draft.isDefaultTheme ? "القالب الافتراضي" : "تعيين كافتراضي"}
                      </Button>
                      <Button variant="outline" className={draft.isActive || draft.isPublic ? "text-red-500 border-red-500" : "text-green-600 dark:text-green-400 border-green-600"} onClick={() => draft.isActive || draft.isPublic ? handleArchiveThemes([theme.themeId]) : persistThemePatch([theme.themeId], { isActive: true, isPublic: true }, "تم إظهار القالب")} disabled={isSaving || draft.isDefaultTheme}>
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
            <Alert variant="default" className="border-blue-500/50 text-blue-700 dark:border-blue-500/40 dark:text-blue-400">
              لا توجد قوالب مطابقة للبحث أو الفلاتر الحالية.
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
};

const ImageField = ({
  label,
  value,
  onChange,
  onUpload,
  uploading,
  placeholder,
  hint,
  accept = "image/*",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onUpload: (file: File) => void | Promise<void>;
  uploading: boolean;
  placeholder?: string;
  hint?: string;
  accept?: string;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const showImage = isLikelyImageUrl(value);
  const showVideo = isLikelyVideoUrl(value);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          dir="ltr"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="رفع صورة من الجهاز"
          aria-label="رفع صورة"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange("")}
            title="حذف"
            aria-label="حذف الصورة"
            className="text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onUpload(file);
          event.target.value = "";
        }}
      />
      {(showImage || showVideo) && (
        <div className="relative h-28 w-full overflow-hidden rounded-xl border bg-muted/30">
          {showVideo ? (
            <video
              src={value}
              controls
              className="h-full w-full object-contain"
            />
          ) : (
            <img
              src={value}
              alt={label}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          )}
        </div>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
};

const AppEditScreen = ({
  app,
  onSave,
  onClose,
}: {
  app: MarketplaceManagementItem | null;
  onSave: (
    item: MarketplaceManagementItem | null,
    data: MarketplaceDialogFormData,
  ) => Promise<boolean>;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState<MarketplaceDialogFormData>(() =>
    createDefaultMarketplaceFormData("app"),
  );
  const [activeSection, setActiveSection] = useState("general");
  const [uploadingField, setUploadingField] = useState<
    "logo" | "coverImage" | "screenshots" | null
  >(null);
  const [saving, setSaving] = useState(false);
  const screenshotsInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    setFormData({
      ...createDefaultMarketplaceFormData("app"),
      ...(app || {}),
      features: parseStringList(app?.features),
      screenshots: parseStringList(app?.screenshots ?? app?.images),
    });
  }, [app]);

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const target = e.target;
    const { name, value, type: inputType } = target;
    const checked = "checked" in target ? target.checked : undefined;
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

  const uploadToField = async (
    field: "logo" | "coverImage",
    file: File,
  ) => {
    setUploadingField(field);
    const url = await uploadSingleImage(file);
    if (url) setFieldValue(field, url);
    setUploadingField(null);
  };

  const handleScreenshotsUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingField("screenshots");
    const urls = await uploadMultipleImages(Array.from(files));
    if (urls.length > 0) {
      setFormData((prev) => ({
        ...prev,
        screenshots: [...(prev.screenshots || []), ...urls],
      }));
    }
    setUploadingField(null);
  };

  const removeScreenshot = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      screenshots: (prev.screenshots || []).filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error("اسم التطبيق مطلوب");
      return;
    }
    setSaving(true);
    try {
      if (await onSave(app, formData)) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: "general", label: "عام", icon: Info },
    { id: "pricing", label: "التسعير", icon: DollarSign },
    { id: "media", label: "الوسائط", icon: ImageIcon },
    { id: "features", label: "المميزات", icon: ListChecks },
    { id: "routes", label: "المسارات", icon: Route },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2.5 shadow-sm">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="رجوع للقائمة" onClick={onClose}>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold">
              {app?.id ? `تعديل التطبيق: ${app.name || ""}` : "إضافة تطبيق جديد"}
            </h2>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-1.5">
          <Button variant="outline" size="sm" onClick={onClose}>إلغاء</Button>
          <Button variant="default" size="sm" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </div>
      </div>

      {/* Section Tabs */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl border bg-card p-1 shadow-sm">
          {sections.map((section) => {
            const SectionIcon = section.icon;
            return (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className="h-9 rounded-lg px-3 text-sm data-active:bg-primary data-active:text-primary-foreground"
              >
                <SectionIcon className="size-4" />
                {section.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Content */}
      <div className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
        {activeSection === "general" && (
          <div className="grid grid-cols-12 gap-3">
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
            <div className="col-span-12 md:col-span-4">
              <div className="space-y-2">
                <Label>الفئة</Label>
                <Select value={formData.category ?? "ECOMMERCE"} onValueChange={(v) => setFieldValue("category", v ?? undefined)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoryMap.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="col-span-12 md:col-span-4">
              <div className="space-y-1">
                <Label>الأيقونة (Emoji or Icon Name)</Label>
                <Input name="icon" value={formData.icon ?? ""} onChange={handleChange} />
              </div>
            </div>
            <div className="col-span-6 md:col-span-2">
              <div className="space-y-1">
                <Label>أيام التجربة</Label>
                <Input name="trialDays" type="number" value={formData.trialDays ?? 14} onChange={handleChange} />
              </div>
            </div>
            <div className="col-span-6 md:col-span-2">
              <label className="flex h-full items-center gap-1 cursor-pointer pb-1">
                <input type="checkbox" name="isAutoInstall" checked={!!formData.isAutoInstall} onChange={handleChange} />
                <span className="text-sm">تثبيت تلقائي</span>
              </label>
            </div>
            <div className="col-span-12">
              <div className="flex gap-3 flex-wrap rounded-xl bg-muted/40 p-3">
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
          </div>
        )}

        {activeSection === "pricing" && (
          <div className="grid grid-cols-12 gap-3">
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
                <Label>السعر الشهري</Label>
                <Input name="monthlyPrice" type="number" value={formData.monthlyPrice ?? 0} onChange={handleChange} />
              </div>
            </div>
            <div className="col-span-6 md:col-span-4">
              <div className="space-y-1">
                <Label>السعر السنوي</Label>
                <Input name="yearlyPrice" type="number" value={formData.yearlyPrice ?? 0} onChange={handleChange} />
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
            <div className="col-span-12 md:col-span-4">
              <div className="space-y-1">
                <Label>طريقة احتساب التكلفة (PPU)</Label>
                <Select value={formData.ppuBillingMethod ?? "PER_ORDER"} onValueChange={(v) => setFieldValue("ppuBillingMethod", v as "PER_ORDER" | "PER_ITEM" | "PERCENTAGE")} disabled={formData.pricingModel !== "PAY_PER_USE"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PER_ORDER">ثابت لكل طلب (unitPrice × 1)</SelectItem>
                    <SelectItem value="PER_ITEM">حسب عدد المنتجات (unitPrice × عدد items)</SelectItem>
                    <SelectItem value="PERCENTAGE">نسبة من إجمالي الطلب (unitPrice%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {activeSection === "media" && (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6">
              <ImageField
                label="شعار التطبيق (Logo)"
                value={formData.logo ?? ""}
                onChange={(v) => setFieldValue("logo", v)}
                onUpload={(file) => uploadToField("logo", file)}
                uploading={uploadingField === "logo"}
                placeholder="رابط مباشر أو ارفع صورة"
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <ImageField
                label="صورة الغلاف / الميديا"
                value={formData.coverImage ?? ""}
                onChange={(v) => setFieldValue("coverImage", v)}
                onUpload={(file) => uploadToField("coverImage", file)}
                uploading={uploadingField === "coverImage"}
                placeholder="رابط مباشر للصورة أو يوتيوب/فيديو"
                hint="تُعرض كغلاف في صفحة التطبيق. تدعم صورًا وفيديو."
              />
            </div>
            <div className="col-span-12">
              <div className="space-y-2">
                <Label>لقطات الشاشة (Screenshots)</Label>
                <div className="flex flex-wrap items-start gap-2">
                  {formData.screenshots.map((url, idx) => (
                    <div
                      key={`${url}-${idx}`}
                      className="group relative h-20 w-28 overflow-hidden rounded-lg border bg-muted/30"
                    >
                      <img
                        src={url}
                        alt={`لقطة ${idx + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <button
                        type="button"
                        onClick={() => removeScreenshot(idx)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        title="حذف"
                        aria-label="حذف اللقطة"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => screenshotsInputRef.current?.click()}
                    disabled={uploadingField === "screenshots"}
                    className="flex h-20 w-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    {uploadingField === "screenshots" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    رفع
                  </button>
                  <input
                    ref={screenshotsInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) =>
                      void handleScreenshotsUpload(event.target.files)
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  تُعرض في تبويب «لقطات الشاشة» داخل صفحة التطبيق. يمكنك رفع أكثر من صورة.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSection === "features" && (
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12">
              <div className="space-y-1">
                <Label>الأدوات والمميزات (Tools Included)</Label>
                <Textarea
                  rows={6}
                  value={Array.isArray(formData.features) ? formData.features.join(", ") : ""}
                  onChange={(event) => setFieldValue("features", parseStringList(event.target.value))}
                  placeholder="افصل بين كل ميزة بفاصلة (،) .. مثال: نظام تقارير، ربط واتساب، دعم فني"
                />
                <p className="text-xs text-muted-foreground">افصل بين الأدوات بفاصلة لكي تظهر كنقاط منفصلة للمستخدم</p>
              </div>
            </div>
          </div>
        )}

        {activeSection === "routes" && (
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-6">
              <div className="space-y-1">
                <Label>المسار الرئيسي (Main Route)</Label>
                <Input name="mainRoute" value={formData.mainRoute ?? ""} onChange={handleChange} placeholder="/my-apps/something" dir="ltr" />
              </div>
            </div>
            <div className="col-span-12 md:col-span-6">
              <div className="space-y-1">
                <Label>مسار الإدارة (Admin Route)</Label>
                <Input name="adminRoute" value={formData.adminRoute ?? ""} onChange={handleChange} placeholder="/settings/something" dir="ltr" />
              </div>
            </div>
            <div className="col-span-12">
              <p className="text-xs text-muted-foreground">
                <Tags className="inline h-3.5 w-3.5 ml-1" />
                المسارات تُستخدم لفتح التطبيق من متجر التطبيقات وصفحات الإدارة.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const uploadSingleImage = async (file: File): Promise<string | null> => {
  if (!file.type.startsWith("image/")) {
    toast.error("الملف يجب أن يكون صورة");
    return null;
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.error("حجم الصورة يجب أن يكون أقل من 10MB");
    return null;
  }
  const fd = new FormData();
  fd.append("image", file);
  try {
    const res = await axios.post(buildApiUrl("upload/single"), fd, {
      headers: getAuthHeaders({ "Content-Type": "multipart/form-data" }),
      timeout: 30000,
    });
    if (res.data?.success && res.data?.data?.url) {
      return res.data.data.url as string;
    }
    toast.error(res.data?.error || "فشل رفع الصورة");
    return null;
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } };
    toast.error(e?.response?.data?.error || "فشل رفع الصورة");
    return null;
  }
};

const uploadMultipleImages = async (files: File[]): Promise<string[]> => {
  const valid = files.filter(
    (f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024,
  );
  if (valid.length === 0) {
    toast.error("اختر صورًا صالحة (صور فقط وأقل من 10MB لكل صورة)");
    return [];
  }
  const fd = new FormData();
  valid.forEach((f) => fd.append("images", f));
  try {
    const res = await axios.post(buildApiUrl("upload/multiple"), fd, {
      headers: getAuthHeaders({ "Content-Type": "multipart/form-data" }),
      timeout: 60000,
    });
    if (res.data?.success && Array.isArray(res.data?.data)) {
      const urls = (res.data.data as Array<{ url?: string }>)
        .map((d) => d?.url)
        .filter((url): url is string => Boolean(url));
      if (urls.length === 0) {
        toast.error(res.data?.error || "فشل رفع الصور");
      }
      return urls;
    }
    toast.error(res.data?.error || "فشل رفع الصور");
    return [];
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } };
    toast.error(e?.response?.data?.error || "فشل رفع الصور");
    return [];
  }
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
        screenshots:
          type === "app"
            ? parseStringList(item.screenshots ?? item.images)
            : [],
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [item, open, type]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const target = e.target;
    const { name, value, type: inputType } = target;
    const checked = "checked" in target ? target.checked : undefined;
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
        : "باقة";

  const [bundleSearch, setBundleSearch] = useState("");
  const [uploadingField, setUploadingField] = useState<
    "logo" | "coverImage" | "screenshots" | null
  >(null);
  const screenshotsInputRef = useRef<HTMLInputElement>(null);

  const uploadToField = async (
    field: "logo" | "coverImage",
    file: File,
  ) => {
    setUploadingField(field);
    const url = await uploadSingleImage(file);
    if (url) setFieldValue(field, url);
    setUploadingField(null);
  };

  const handleScreenshotsUpload = async (
    files: FileList | null,
  ) => {
    if (!files || files.length === 0) return;
    setUploadingField("screenshots");
    const urls = await uploadMultipleImages(Array.from(files));
    if (urls.length > 0) {
      setFormData((prev) => ({
        ...prev,
        screenshots: [...(prev.screenshots || []), ...urls],
      }));
    }
    setUploadingField(null);
  };

  const removeScreenshot = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      screenshots: (prev.screenshots || []).filter((_, i) => i !== index),
    }));
  };

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
              <div className="col-span-6 md:col-span-4">
                <div className="space-y-1">
                  <Label>فترة التجربة (أيام)</Label>
                  <Input name="trialDays" type="number" min="0" max="365" value={formData.trialDays ?? 7} onChange={handleChange} />
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
                  <Select value={formData.category ?? "ECOMMERCE"} onValueChange={(v) => setFieldValue("category", v ?? undefined)}>
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
                <ImageField
                  label="شعار التطبيق (Logo)"
                  value={formData.logo ?? ""}
                  onChange={(v) => setFieldValue("logo", v)}
                  onUpload={(file) => uploadToField("logo", file)}
                  uploading={uploadingField === "logo"}
                  placeholder="رابط مباشر أو ارفع صورة"
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <ImageField
                  label="صورة الغلاف / الميديا"
                  value={formData.coverImage ?? ""}
                  onChange={(v) => setFieldValue("coverImage", v)}
                  onUpload={(file) => uploadToField("coverImage", file)}
                  uploading={uploadingField === "coverImage"}
                  placeholder="رابط مباشر للصورة أو يوتيوب/فيديو"
                  hint="تُعرض كغلاف في صفحة التطبيق. تدعم صورًا وفيديو."
                />
              </div>
              <div className="col-span-12">
                <div className="space-y-2">
                  <Label>لقطات الشاشة (Screenshots)</Label>
                  <div className="flex flex-wrap items-start gap-2">
                    {formData.screenshots.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        className="group relative h-20 w-28 overflow-hidden rounded-lg border bg-muted/30"
                      >
                        <img
                          src={url}
                          alt={`لقطة ${idx + 1}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <button
                          type="button"
                          onClick={() => removeScreenshot(idx)}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          title="حذف"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => screenshotsInputRef.current?.click()}
                      disabled={uploadingField === "screenshots"}
                      className="flex h-20 w-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      {uploadingField === "screenshots" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      رفع
                    </button>
                    <input
                      ref={screenshotsInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(event) =>
                        void handleScreenshotsUpload(event.target.files)
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    تُعرض في تبويب «لقطات الشاشة» داخل صفحة التطبيق. يمكنك رفع
                    أكثر من صورة.
                  </p>
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
              <div className="col-span-12 md:col-span-4">
                <div className="space-y-1">
                  <Label>طريقة احتساب التكلفة (PPU)</Label>
                  <Select value={formData.ppuBillingMethod ?? "PER_ORDER"} onValueChange={(v) => setFieldValue("ppuBillingMethod", v as "PER_ORDER" | "PER_ITEM" | "PERCENTAGE")} disabled={formData.pricingModel !== "PAY_PER_USE"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PER_ORDER">ثابت لكل طلب (unitPrice × 1)</SelectItem>
                      <SelectItem value="PER_ITEM">حسب عدد المنتجات (unitPrice × عدد items)</SelectItem>
                      <SelectItem value="PERCENTAGE">نسبة من إجمالي الطلب (unitPrice%)</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Textarea name="features" rows={3} value={Array.isArray(formData.features) ? formData.features.join(", ") : ""} onChange={(event) => setFieldValue("features", parseStringList(event.target.value))} placeholder="افصل بين كل ميزة بفاصلة (،) .. مثال: نظام تقارير، ربط واتساب، دعم فني" />
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
          <Button
            variant="default"
            onClick={() => {
              if (type === "app" && !formData.name?.trim()) {
                toast.error("اسم التطبيق مطلوب");
                return;
              }
              if (type === "bundle" && !formData.name?.trim()) {
                toast.error("اسم الباقة مطلوب");
                return;
              }
              if (type === "pricing" && !formData.feature?.trim()) {
                toast.error("اكتب اسم الميزة أولاً");
                return;
              }
              void onSave(formData);
            }}
          >
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MarketplaceAppsManagement;

