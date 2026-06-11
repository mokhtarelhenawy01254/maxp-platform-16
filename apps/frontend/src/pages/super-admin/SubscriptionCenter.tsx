import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Checkbox,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tooltip,
  Collapse,
  InputAdornment,
} from "@mui/material";
import {
  Star as StarIcon,
  ShoppingBag as MarketplaceIcon,
  Storefront as StorefrontIcon,
  Inventory as BundleIcon,
  CorporateFare as EnterpriseIcon,
  Add as AddIcon,
  Edit as EditIcon,
  TrendingUp as TrendingUpIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  FileDownload as DownloadIcon,
  FileUpload as UploadIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Archive as ArchiveIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { buildApiUrl } from "../../utils/urlHelper";
import axios from "axios";
import { toast } from "react-hot-toast";
import type { StorefrontThemeCatalogItem } from "../../services/storefrontThemeCatalogService";
import tokenManager from "../../utils/tokenManager";

type SubscriptionCenterProps = {
  initialTab?: number;
  storefrontThemesOnly?: boolean;
  pageTitle?: string;
  pageDescription?: string;
};

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

type Primitive = string | number | boolean | null;
type JsonValue = Primitive | JsonValue[] | { [key: string]: JsonValue };
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
    isRecord(error.response) &&
    "data" in error.response &&
    isRecord(error.response.data) &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
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
  trialDays: 14,
  category: "ECOMMERCE",
  isActive: true,
  isPublic: true,
  isFeatured: false,
  isPopular: false,
  isAutoInstall: false,
  logo: "",
  icon: "",
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
  initialTab = 0,
  storefrontThemesOnly = false,
  pageTitle = "مركز إدارة الاشتراكات والفوترة",
  pageDescription = "إدارة الخطط الأساسية، تطبيقات المتجر، والعروض المخصصة للمؤسسات",
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Platform Plans State
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [planDialog, setPlanDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlatformPlan | null>(null);

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
        plansRes,
        appsRes,
        pricingRes,
        bundlesRes,
        enterpriseRes,
        themesRes,
      ] = await Promise.allSettled([
        axios.get(buildApiUrl("admin/plans/plans"), { headers }),
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

      if (plansRes.status === "fulfilled" && plansRes.value.data.success) {
        setPlans(plansRes.value.data.data as PlatformPlan[]);
      }
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
        plansRes,
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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading)
    return (
      <Box display="flex" justifyContent="center" p={10}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box p={3}>
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {pageTitle}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {pageDescription}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!storefrontThemesOnly ? (
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<StarIcon />} iconPosition="start" label="خطط المنصة" />
            <Tab
              icon={<MarketplaceIcon />}
              iconPosition="start"
              label="تطبيقات المتجر"
            />
            <Tab
              icon={<BundleIcon />}
              iconPosition="start"
              label="الباقات والأسعار"
            />
            <Tab
              icon={<EnterpriseIcon />}
              iconPosition="start"
              label="تعاقدات المؤسسات"
            />
            <Tab
              icon={<StorefrontIcon />}
              iconPosition="start"
              label="قوالب المتجر"
            />
          </Tabs>
        </Paper>
      ) : null}

      {!storefrontThemesOnly && activeTab === 0 && (
        <PlatformPlansTab
          plans={plans}
          onEdit={(p) => {
            setSelectedPlan(p);
            setPlanDialog(true);
          }}
          onRefresh={fetchAllData}
        />
      )}
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
          onSave={async (itemData) => {
            try {
              const headers = getAuthHeaders();
              let typePath = "apps";
              if (activeTab === 1) typePath = "apps";
              else if (activeTab === 2)
                typePath = editingItem?.feature ? "pricing-rules" : "bundles";
              else if (activeTab === 3) typePath = "enterprise-plans";

              if (editingItem?.id) {
                await axios.put(
                  buildApiUrl(
                    `super-admin/marketplace-management/${typePath}/${editingItem.id}`,
                  ),
                  itemData,
                  { headers },
                );
              } else {
                await axios.post(
                  buildApiUrl(`super-admin/marketplace-management/${typePath}`),
                  itemData,
                  { headers },
                );
              }

              toast.success("تم الحفظ بنجاح");
              setMarketplaceDialog(false);
              setEditingItem(null);
              await fetchAllData();
            } catch (err) {
              console.error("Marketplace save error:", err);
              toast.error("خطأ في الحفظ");
            }
          }}
        />
      )}

      {/* Plan Edit Dialog */}
      <EditPlanDialog
        open={planDialog}
        onClose={() => {
          setPlanDialog(false);
          setSelectedPlan(null);
        }}
        plan={selectedPlan}
        onSave={async (planData) => {
          try {
            const planType = planData.planType || selectedPlan?.planType;
            await axios.put(
              buildApiUrl(`admin/plans/plans/${planType}`),
              planData,
              { headers: getAuthHeaders() },
            );
            toast.success("تم حفظ الخطة بنجاح");
            setPlanDialog(false);
            await fetchAllData();
          } catch (err) {
            console.error("Save error:", err);
            toast.error("خطأ في حفظ الخطة");
          }
        }}
      />
    </Box>
  );
};

// Sub-components for Tabs

const PlatformPlansTab = ({
  plans,
  onEdit,
  onRefresh,
}: {
  plans: PlatformPlan[];
  onEdit: (plan: PlatformPlan | null) => void;
  onRefresh: () => Promise<void> | void;
}) => {
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const getPlanColor = (planType: string) => {
    const colors: { [key: string]: string } = {
      BASIC: "#3b82f6",
      PRO: "#8b5cf6",
      ENTERPRISE: "#f59e0b",
      CUSTOM: "#10b981",
    };
    return colors[planType] || "#6b7280";
  };

  const formatFeatureValue = (value: unknown) => {
    if (value === -1) return "غير محدود";
    if (value === true) return "✓";
    if (value === false || value === undefined || value === null) return "✗";
    return value;
  };

  const calculateTotalRevenue = (plan: PlatformPlan) => {
    return (plan.stats?.activeCompanies || 0) * (plan.price || 0);
  };

  const toggleExpand = (planType: string) => {
    setExpandedPlan(expandedPlan === planType ? null : planType);
  };

  return (
    <Box>
      {/* Summary Stats */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          bgcolor: "primary.light",
          color: "primary.contrastText",
        }}
      >
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="h4" fontWeight="bold">
              {plans.reduce(
                (sum, p) => sum + (p.stats?.activeCompanies || 0),
                0,
              )}
            </Typography>
            <Typography variant="body2">إجمالي الشركات المشتركة</Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="h4" fontWeight="bold">
              {plans
                .reduce((sum, p) => sum + calculateTotalRevenue(p), 0)
                .toLocaleString()}{" "}
              ج.م
            </Typography>
            <Typography variant="body2">إجمالي الإيرادات الشهرية</Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="h4" fontWeight="bold">
              {plans.length}
            </Typography>
            <Typography variant="body2">عدد الخطط المتاحة</Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="h4" fontWeight="bold">
              {plans.filter((p) => p.isCustom).length}
            </Typography>
            <Typography variant="body2">خطط مخصصة</Typography>
          </Grid>
        </Grid>
      </Paper>

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h6">خطط المنصة الأساسية</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => onEdit(null)}
        >
          إنشاء خطة جديدة
        </Button>
      </Box>

      <Grid container spacing={3}>
        {plans.map((plan) => {
          const features = parsePlanFeatures(plan.features);
          const isExpanded = expandedPlan === plan.planType;
          const monthlyRevenue = calculateTotalRevenue(plan);

          return (
            <Grid key={plan.planType} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card
                sx={{
                  height: "100%",
                  borderTop: 4,
                  borderColor: getPlanColor(plan.planType),
                  transition: "all 0.3s ease",
                  "&:hover": { boxShadow: 4 },
                }}
              >
                <CardContent>
                  {/* Plan Header */}
                  <Box textAlign="center" mb={2}>
                    <Typography variant="h5" fontWeight="bold">
                      {plan.name}
                    </Typography>
                    <Chip
                      label={plan.planType}
                      size="small"
                      sx={{
                        mt: 0.5,
                        bgcolor: getPlanColor(plan.planType),
                        color: "white",
                      }}
                    />
                    <Typography variant="h4" color="primary" sx={{ my: 1 }}>
                      {plan.price?.toLocaleString()} {plan.currency || "ج.م"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      /{" "}
                      {plan.billingCycle === "monthly"
                        ? "شهرياً"
                        : plan.billingCycle === "yearly"
                          ? "سنوياً"
                          : "ربع سنوي"}
                    </Typography>
                  </Box>

                  {/* Stats Row */}
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, mb: 2, bgcolor: "action.hover" }}
                  >
                    <Grid container spacing={1} textAlign="center">
                      <Grid size={{ xs: 6 }}>
                        <Typography
                          variant="h6"
                          fontWeight="bold"
                          color="success.main"
                        >
                          {plan.stats?.activeCompanies || 0}
                        </Typography>
                        <Typography variant="caption" display="block">
                          الشركات
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography
                          variant="h6"
                          fontWeight="bold"
                          color="primary.main"
                        >
                          {monthlyRevenue.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" display="block">
                          ج.م/شهر
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Quick Features Preview */}
                  <Box mb={2}>
                    <Typography
                      variant="subtitle2"
                      gutterBottom
                      fontWeight="bold"
                    >
                      أبرز المميزات:
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      <Chip
                        icon={<CheckIcon fontSize="small" />}
                        label={`${formatFeatureValue(features.maxUsers)} مستخدم`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<CheckIcon fontSize="small" />}
                        label={`${formatFeatureValue(features.maxCustomers)} عميل`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<CheckIcon fontSize="small" />}
                        label={`${formatFeatureValue(features.storageLimit)} GB تخزين`}
                        size="small"
                        variant="outlined"
                      />
                      {features.apiAccess && (
                        <Chip
                          icon={<CheckIcon fontSize="small" />}
                          label="API"
                          size="small"
                          color="success"
                        />
                      )}
                      {features.prioritySupport && (
                        <Chip
                          icon={<CheckIcon fontSize="small" />}
                          label="دعم مميز"
                          size="small"
                          color="primary"
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Description */}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, minHeight: 40 }}
                  >
                    {plan.description || "لا يوجد وصف"}
                  </Typography>

                  {/* Expandable Features List */}
                  <Collapse in={isExpanded}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      تفاصيل المميزات:
                    </Typography>
                    <List dense sx={{ mb: 2 }}>
                      <ListItem>
                        <ListItemText
                          primary={`المستخدمين: ${formatFeatureValue(features.maxUsers)}`}
                          secondary={`العملاء: ${formatFeatureValue(features.maxCustomers)}`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary={`المحادثات: ${formatFeatureValue(features.maxConversations)}`}
                          secondary={`الرسائل: ${formatFeatureValue(features.maxMessages)}`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary={`ردود تلقائية: ${formatFeatureValue(features.aiResponses)}`}
                          secondary={`التخزين: ${formatFeatureValue(features.storageLimit)} GB`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary={`سير العمل: ${formatFeatureValue(features.automatedWorkflows)}`}
                          secondary={`الحقول المخصصة: ${formatFeatureValue(features.customFields)}`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary={`الاحتفاظ بالبيانات: ${formatFeatureValue(features.dataRetention)} يوم`}
                          secondary={`SLA: ${features.sla || "غير محدد"}`}
                        />
                      </ListItem>
                    </List>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {features.customBranding && (
                        <Chip label="علامة تجارية" size="small" />
                      )}
                      {features.advancedReports && (
                        <Chip label="تقارير متقدمة" size="small" />
                      )}
                      {features.apiAccess && (
                        <Chip label="API" size="small" color="primary" />
                      )}
                      {features.prioritySupport && (
                        <Chip label="دعم أولوية" size="small" color="primary" />
                      )}
                      {features.customIntegrations && (
                        <Chip label="تكاملات" size="small" />
                      )}
                      {features.facebookMessenger && (
                        <Chip label="ماسنجر" size="small" />
                      )}
                      {features.webChat && <Chip label="دردشة" size="small" />}
                      {features.mobileApp && (
                        <Chip label="تطبيق" size="small" color="success" />
                      )}
                      {features.multiLanguage && (
                        <Chip label="متعدد اللغات" size="small" />
                      )}
                      {features.exportData && (
                        <Chip label="تصدير" size="small" />
                      )}
                      {features.dedicatedSupport && (
                        <Chip label="دعم مخصص" size="small" color="success" />
                      )}
                    </Box>
                  </Collapse>

                  {/* Actions */}
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mt={2}
                  >
                    <Tooltip
                      title={isExpanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                    >
                      <Button
                        size="small"
                        onClick={() => toggleExpand(plan.planType)}
                        variant="text"
                      >
                        {isExpanded ? "إخفاء" : "المزيد"}
                      </Button>
                    </Tooltip>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => onEdit(plan)}
                    >
                      تعديل
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

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
      await axios.patch(
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
    <Box>
      {/* Statistics Dashboard */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          bgcolor: "secondary.light",
          color: "secondary.contrastText",
        }}
      >
        <Grid container spacing={3}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Typography variant="h4" fontWeight="bold">
              {apps.length}
            </Typography>
            <Typography variant="body2">إجمالي التطبيقات</Typography>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Typography variant="h4" fontWeight="bold">
              {totalInstallations.toLocaleString()}
            </Typography>
            <Typography variant="body2">إجمالي التثبيتات</Typography>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Typography variant="h4" fontWeight="bold">
              {totalMonthlyRevenue.toLocaleString()} ج.م
            </Typography>
            <Typography variant="body2">إيرادات شهرية</Typography>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Typography variant="h4" fontWeight="bold">
              {activeApps}
            </Typography>
            <Typography variant="body2">نشط | {featuredApps} مميز</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Catalog Diff (Files vs DB) */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          border: 1,
          borderColor:
            (catalogDiff?.totals?.diffEntries || 0) > 0
              ? "warning.light"
              : "success.light",
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          flexDirection={{ xs: "column", md: "row" }}
          gap={1}
          mb={1.5}
        >
          <Box>
            <Typography variant="h6" fontWeight="bold">
              فرق الكاتالوج (Files vs DB)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              آخر مقارنة: {comparedAtLabel}
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={onRefreshCatalogDiff}
              disabled={catalogDiffLoading}
            >
              {catalogDiffLoading ? "جارٍ التحديث..." : "تحديث"}
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={() => setShowCatalogDiffDetails((prev) => !prev)}
              disabled={!hasDiffData}
            >
              {showCatalogDiffDetails ? "إخفاء التفاصيل" : "عرض التفاصيل"}
            </Button>
          </Box>
        </Box>

        {catalogDiffError && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {catalogDiffError}
          </Alert>
        )}

        {hasDiffData ? (
          <Grid container spacing={1}>
            <Grid size={{ xs: 6, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  إجمالي الفرق
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {catalogDiff?.totals?.diffEntries || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Apps (Catalog/DB)
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {catalogDiff?.totals?.catalogApps || 0}/
                  {catalogDiff?.totals?.dbApps || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Bundles (Catalog/DB)
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {catalogDiff?.totals?.catalogBundles || 0}/
                  {catalogDiff?.totals?.dbBundles || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  فروقات التطبيقات
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {appDiffEntries}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  فروقات الباقات
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {bundleDiffEntries}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        ) : (
          <Typography variant="body2" color="text.secondary">
            لا توجد بيانات فرق متاحة حالياً.
          </Typography>
        )}

        <Collapse in={showCatalogDiffDetails && hasDiffData}>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                تطبيقات
              </Typography>
              <Box mb={1}>
                <Typography variant="caption" color="text.secondary">
                  موجود بالملفات وغير موجود في DB (
                  {catalogDiff?.apps?.missingInDb?.length || 0})
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                  {(catalogDiff?.apps?.missingInDb || []).map((slug) => (
                    <Chip
                      key={`app-miss-${slug}`}
                      size="small"
                      label={slug}
                      color="warning"
                    />
                  ))}
                </Box>
              </Box>
              <Box mb={1}>
                <Typography variant="caption" color="text.secondary">
                  موجود في DB وغير موجود بالملفات (
                  {catalogDiff?.apps?.extraInDb?.length || 0})
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                  {(catalogDiff?.apps?.extraInDb || []).map((slug) => (
                    <Chip
                      key={`app-extra-${slug}`}
                      size="small"
                      label={slug}
                      color="info"
                    />
                  ))}
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  عناصر مختلفة ({catalogDiff?.apps?.changed?.length || 0})
                </Typography>
                <List dense sx={{ maxHeight: 220, overflow: "auto", mt: 0.5 }}>
                  {(catalogDiff?.apps?.changed || []).map((entry) => (
                    <ListItem
                      key={`app-changed-${entry.slug}`}
                      sx={{ display: "block", py: 0.5 }}
                    >
                      <Typography variant="body2" fontWeight="bold">
                        {entry.slug}
                      </Typography>
                      {(entry.changes || []).slice(0, 3).map((change) => (
                        <Typography
                          key={`${entry.slug}-${change.field}`}
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          {change.field}: [{formatDiffValue(change.catalog)}]{" "}
                          {"->"} [{formatDiffValue(change.db)}]
                        </Typography>
                      ))}
                      {(entry.changes || []).length > 3 && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          +{entry.changes.length - 3} تغييرات إضافية
                        </Typography>
                      )}
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                باقات
              </Typography>
              <Box mb={1}>
                <Typography variant="caption" color="text.secondary">
                  موجود بالملفات وغير موجود في DB (
                  {catalogDiff?.bundles?.missingInDb?.length || 0})
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                  {(catalogDiff?.bundles?.missingInDb || []).map((slug) => (
                    <Chip
                      key={`bundle-miss-${slug}`}
                      size="small"
                      label={slug}
                      color="warning"
                    />
                  ))}
                </Box>
              </Box>
              <Box mb={1}>
                <Typography variant="caption" color="text.secondary">
                  موجود في DB وغير موجود بالملفات (
                  {catalogDiff?.bundles?.extraInDb?.length || 0})
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                  {(catalogDiff?.bundles?.extraInDb || []).map((slug) => (
                    <Chip
                      key={`bundle-extra-${slug}`}
                      size="small"
                      label={slug}
                      color="info"
                    />
                  ))}
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  عناصر مختلفة ({catalogDiff?.bundles?.changed?.length || 0})
                </Typography>
                <List dense sx={{ maxHeight: 220, overflow: "auto", mt: 0.5 }}>
                  {(catalogDiff?.bundles?.changed || []).map((entry) => (
                    <ListItem
                      key={`bundle-changed-${entry.slug}`}
                      sx={{ display: "block", py: 0.5 }}
                    >
                      <Typography variant="body2" fontWeight="bold">
                        {entry.slug}
                      </Typography>
                      {(entry.changes || []).slice(0, 3).map((change) => (
                        <Typography
                          key={`${entry.slug}-${change.field}`}
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          {change.field}: [{formatDiffValue(change.catalog)}]{" "}
                          {"->"} [{formatDiffValue(change.db)}]
                        </Typography>
                      ))}
                      {(entry.changes || []).length > 3 && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          +{entry.changes.length - 3} تغييرات إضافية
                        </Typography>
                      )}
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Grid>
          </Grid>
        </Collapse>
      </Paper>

      {/* Filters and Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              placeholder="البحث في التطبيقات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <Box component="span" sx={{ mr: 1 }}>
                    🔍
                  </Box>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>الترتيب</InputLabel>
              <Select
                value={sortBy}
                label="الترتيب"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="installations">الأكثر تثبيتاً</MenuItem>
                <MenuItem value="price">الأعلى سعراً</MenuItem>
                <MenuItem value="rating">الأعلى تقييماً</MenuItem>
                <MenuItem value="name">الاسم</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Box display="flex" gap={1}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => onEdit(null)}
              >
                إضافة
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExport}
                sx={{ minWidth: 100 }}
              >
                تصدير
              </Button>
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
                sx={{ minWidth: 100 }}
              >
                استيراد
                <input
                  type="file"
                  hidden
                  accept=".json"
                  onChange={handleImport}
                />
              </Button>
            </Box>
          </Grid>
        </Grid>
        {filteredApps.length !== apps.length && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block" }}
          >
            عرض {filteredApps.length} من {apps.length} تطبيق
          </Typography>
        )}
      </Paper>

      {/* Category Tabs + Apps Grid Layout */}
      <Grid container spacing={2}>
        {/* Side Category Tabs */}
        <Grid size={{ xs: 12, md: 2 }}>
          <Paper sx={{ height: "100%", minHeight: 400 }}>
            <Tabs
              orientation="vertical"
              variant="scrollable"
              value={categoryFilter}
              onChange={(_, newValue) => setCategoryFilter(newValue)}
              sx={{
                borderLeft: 1,
                borderColor: "divider",
                "& .MuiTabs-flexContainer": { alignItems: "stretch" },
              }}
            >
              {categories.map((cat) => (
                <Tab
                  key={cat}
                  value={cat}
                  label={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        width: "100%",
                      }}
                    >
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          bgcolor:
                            cat === "ALL" ? "#6b7280" : getCategoryColor(cat),
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{ flex: 1, textAlign: "right" }}
                      >
                        {categoryLabels[cat] || cat}
                      </Typography>
                      <Chip
                        label={
                          cat === "ALL"
                            ? apps.length
                            : apps.filter((a) => a.category === cat).length
                        }
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.7rem",
                          bgcolor:
                            categoryFilter === cat
                              ? "primary.main"
                              : "action.hover",
                          color:
                            categoryFilter === cat
                              ? "primary.contrastText"
                              : "text.secondary",
                        }}
                      />
                    </Box>
                  }
                  sx={{
                    alignItems: "flex-start",
                    textAlign: "right",
                    minHeight: 48,
                    px: 1,
                    "&.Mui-selected": {
                      bgcolor: "action.selected",
                      borderLeft: 3,
                      borderColor:
                        cat === "ALL" ? "#6b7280" : getCategoryColor(cat),
                    },
                  }}
                />
              ))}
            </Tabs>
          </Paper>
        </Grid>

        {/* Apps Grid */}
        <Grid size={{ xs: 12, md: 10 }}>
          <Grid container spacing={3}>
            {filteredApps.map((app) => {
              const monthlyRevenue = calculateAppRevenue(app);
              const isExpanded = expandedApp === app.id;

              return (
                <Grid key={app.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      borderTop: 3,
                      borderColor: getCategoryColor(app.category),
                      transition: "all 0.2s ease",
                      "&:hover": {
                        boxShadow: 4,
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                      {/* Header */}
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        mb={1}
                      >
                        <Box flex={1}>
                          <Typography variant="h6" fontWeight="bold" noWrap>
                            {app.name}
                          </Typography>
                          <Chip
                            label={app.category}
                            size="small"
                            sx={{
                              mt: 0.5,
                              bgcolor: getCategoryColor(app.category),
                              color: "white",
                              fontSize: "0.7rem",
                            }}
                          />
                        </Box>
                        <Box
                          display="flex"
                          flexDirection="column"
                          alignItems="flex-end"
                          gap={0.5}
                        >
                          {app.isFeatured && (
                            <Chip
                              label="مميز"
                              color="warning"
                              size="small"
                              icon={<StarIcon fontSize="small" />}
                            />
                          )}
                          {app.isPopular && (
                            <Chip label="شائع" color="info" size="small" />
                          )}
                        </Box>
                      </Box>

                      {/* Description */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          height: 36,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          fontSize: "0.8rem",
                        }}
                      >
                        {app.description || "لا يوجد وصف"}
                      </Typography>

                      {/* Stats Row */}
                      <Paper
                        variant="outlined"
                        sx={{ p: 1.5, mb: 2, bgcolor: "action.hover" }}
                      >
                        <Grid container spacing={1} textAlign="center">
                          <Grid size={{ xs: 4 }}>
                            <Typography
                              variant="h6"
                              fontWeight="bold"
                              color="primary.main"
                              fontSize="1rem"
                            >
                              {app._count?.installations ||
                                app.installCount ||
                                0}
                            </Typography>
                            <Typography
                              variant="caption"
                              display="block"
                              fontSize="0.65rem"
                            >
                              تثبيت
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 4 }}>
                            <Typography
                              variant="h6"
                              fontWeight="bold"
                              color="success.main"
                              fontSize="1rem"
                            >
                              ⭐ {app.rating?.toFixed(1) || "0.0"}
                            </Typography>
                            <Typography
                              variant="caption"
                              display="block"
                              fontSize="0.65rem"
                            >
                              ({app.reviewCount || 0})
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 4 }}>
                            <Typography
                              variant="h6"
                              fontWeight="bold"
                              color="warning.main"
                              fontSize="1rem"
                            >
                              {monthlyRevenue.toLocaleString()}
                            </Typography>
                            <Typography
                              variant="caption"
                              display="block"
                              fontSize="0.65rem"
                            >
                              ج.م/شهر
                            </Typography>
                          </Grid>
                        </Grid>
                      </Paper>

                      {/* Price */}
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography
                          variant="h5"
                          color="primary"
                          fontWeight="bold"
                        >
                          {app.monthlyPrice?.toLocaleString() || 0} ج
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          / شهر
                        </Typography>
                        {app.yearlyPrice > 0 && (
                          <Chip
                            label={`${Math.round((1 - app.yearlyPrice / (app.monthlyPrice * 12)) * 100)}% توفير سنوي`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </Box>

                      {/* Expanded Details */}
                      <Collapse in={isExpanded}>
                        <Divider sx={{ my: 1.5 }} />
                        <Box mb={1.5}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            أيام التجربة: {app.trialDays || 14} يوم
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            الإيرادات المتوقعة:{" "}
                            {(
                              app.monthlyPrice *
                              (app._count?.installations || 0) *
                              12
                            ).toLocaleString()}{" "}
                            ج.م/سنة
                          </Typography>
                          {app.mainRoute && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              المسار: {app.mainRoute}
                            </Typography>
                          )}
                        </Box>
                      </Collapse>

                      {/* Toggle Switches */}
                      <Box display="flex" gap={2} mb={1} flexWrap="wrap">
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <input
                            type="checkbox"
                            checked={!!app.isActive}
                            onChange={(e) =>
                              handleQuickToggle(
                                app,
                                "isActive",
                                e.target.checked,
                              )
                            }
                            style={{ cursor: "pointer" }}
                          />
                          <Typography variant="caption">نشط</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <input
                            type="checkbox"
                            checked={!!app.isPublic}
                            onChange={(e) =>
                              handleQuickToggle(
                                app,
                                "isPublic",
                                e.target.checked,
                              )
                            }
                            style={{ cursor: "pointer" }}
                          />
                          <Typography variant="caption">عام</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <input
                            type="checkbox"
                            checked={!!app.isFeatured}
                            onChange={(e) =>
                              handleQuickToggle(
                                app,
                                "isFeatured",
                                e.target.checked,
                              )
                            }
                            style={{ cursor: "pointer" }}
                          />
                          <Typography variant="caption">مميز</Typography>
                        </Box>
                      </Box>

                      {/* Actions */}
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Button
                          size="small"
                          onClick={() =>
                            setExpandedApp(isExpanded ? null : app.id)
                          }
                          variant="text"
                        >
                          {isExpanded ? "أقل" : "المزيد"}
                        </Button>
                        <Box>
                          <Tooltip title="تعديل">
                            <IconButton
                              size="small"
                              onClick={() => onEdit(app)}
                              color="primary"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => onDelete(app.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {filteredApps.length === 0 && (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="h6" color="text.secondary">
                لا توجد تطبيقات مطابقة للبحث
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
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
    <Box>
      {/* Pricing Rules Section */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">قواعد التسعير الإضافية</Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          size="small"
          onClick={() => onEdit({ feature: "", price: 0, unit: "" })}
        >
          إضافة قاعدة
        </Button>
      </Box>
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "action.hover" }}>
            <TableRow>
              <TableCell>الميزة</TableCell>
              <TableCell>السعر</TableCell>
              <TableCell>الوحدة</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pricingRules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>
                  <Typography fontWeight="bold">{rule.feature}</Typography>
                  {rule.description && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      {rule.description}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{rule.price} ج</TableCell>
                <TableCell>{rule.unit}</TableCell>
                <TableCell>
                  <Chip
                    label={rule.isActive ? "نشط" : "معطل"}
                    color={rule.isActive ? "success" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => onEdit(rule)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDelete(rule.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Bundles Section */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Box>
          <Typography variant="h6">باقات العروض (Bundles)</Typography>
          <Typography variant="caption" color="text.secondary">
            {bundles.length} باقة | {bundles.filter((b) => b.isActive).length}{" "}
            نشطة
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="small"
          onClick={() => onEdit({ name: "", price: 0, apps: [] })}
        >
          إضافة باقة
        </Button>
      </Box>

      <Grid container spacing={3}>
        {bundles.map((bundle) => {
          const isExpanded = expandedBundle === bundle.id;
          const bundleApps = normalizeBundleApps(bundle.apps);
          const appsCount = bundleApps.length;
          const savings = calculateBundleSavings(bundle);

          return (
            <Grid key={bundle.id} size={{ xs: 12, md: 6 }}>
              <Card
                sx={{
                  bgcolor: bundle.isActive
                    ? "background.paper"
                    : "action.disabledBackground",
                  border: 2,
                  borderColor: bundle.isFeatured ? "warning.main" : "divider",
                  transition: "all 0.2s ease",
                  "&:hover": { boxShadow: 3 },
                }}
              >
                <CardContent>
                  {/* Header */}
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    mb={2}
                  >
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="h6" fontWeight="bold">
                          {bundle.name}
                        </Typography>
                        {bundle.isFeatured && (
                          <Chip
                            label="مميزة"
                            color="warning"
                            size="small"
                            icon={<StarIcon fontSize="small" />}
                          />
                        )}
                      </Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        {bundle.description || "لا يوجد وصف"}
                      </Typography>
                    </Box>
                    <Box
                      display="flex"
                      flexDirection="column"
                      alignItems="flex-end"
                      gap={0.5}
                    >
                      <Chip
                        label={bundle.isActive ? "نشطة" : "معطلة"}
                        color={bundle.isActive ? "success" : "error"}
                        size="small"
                      />
                    </Box>
                  </Box>

                  {/* Pricing Info */}
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, mb: 2, bgcolor: "success.light" }}
                  >
                    <Grid container spacing={2} alignItems="center">
                      <Grid size={{ xs: 6 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          السعر الحالي
                        </Typography>
                        <Typography
                          variant="h4"
                          fontWeight="bold"
                          color="success.dark"
                        >
                          {bundle.monthlyPrice?.toLocaleString() || 0} ج
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          / شهر
                        </Typography>
                      </Grid>
                      <Grid textAlign="right" size={{ xs: 6 }}>
                        {savings > 0 && (
                          <>
                            <Chip
                              label={`توفير ${savings}%`}
                              color="success"
                              size="small"
                              sx={{ mb: 0.5 }}
                            />
                            <Typography
                              variant="caption"
                              color="success.main"
                              display="block"
                            >
                              خصم على التطبيقات
                            </Typography>
                          </>
                        )}
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Apps List */}
                  <Box mb={2}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={1}
                    >
                      <Typography variant="subtitle2" fontWeight="bold">
                        التطبيقات المُضمنة ({appsCount})
                      </Typography>
                    </Box>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {appsCount > 0 ? (
                        bundleApps.map((app, idx) => (
                          <Tooltip key={idx} title={getBundleAppLabel(app)}>
                            <Chip
                              label={getBundleAppLabel(app)}
                              size="small"
                              variant="outlined"
                              sx={{ maxWidth: 120 }}
                            />
                          </Tooltip>
                        ))
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          لا توجد تطبيقات مضمنة
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Expanded Details */}
                  <Collapse in={isExpanded}>
                    <Divider sx={{ my: 1.5 }} />
                    {appsCount > 0 && (
                      <List dense sx={{ mb: 1 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          gutterBottom
                          display="block"
                        >
                          تفاصيل التطبيقات:
                        </Typography>
                        {bundleApps.map((app, idx) => (
                          <ListItem key={idx} sx={{ py: 0.5 }}>
                            <ListItemText
                              primary={getBundleAppLabel(app)}
                              secondary={getBundleAppCategory(app)}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Collapse>

                  {/* Toggle Switches */}
                  <Box display="flex" gap={2} mb={1} flexWrap="wrap">
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <input
                        type="checkbox"
                        checked={!!bundle.isActive}
                        onChange={(e) =>
                          handleQuickToggle(
                            bundle,
                            "isActive",
                            e.target.checked,
                          )
                        }
                        style={{ cursor: "pointer" }}
                      />
                      <Typography variant="caption">نشطة</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <input
                        type="checkbox"
                        checked={!!bundle.isFeatured}
                        onChange={(e) =>
                          handleQuickToggle(
                            bundle,
                            "isFeatured",
                            e.target.checked,
                          )
                        }
                        style={{ cursor: "pointer" }}
                      />
                      <Typography variant="caption">مميزة</Typography>
                    </Box>
                  </Box>

                  {/* Actions */}
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Button
                      size="small"
                      onClick={() =>
                        setExpandedBundle(isExpanded ? null : bundle.id)
                      }
                      variant="text"
                    >
                      {isExpanded ? "أقل" : "عرض التفاصيل"}
                    </Button>
                    <Box>
                      <Tooltip title="تعديل">
                        <IconButton
                          size="small"
                          onClick={() => onEdit(bundle)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onDelete(bundle.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {bundles.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary">
            لا توجد باقات محددة
          </Typography>
        </Paper>
      )}
    </Box>
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
    <Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: "action.hover" }}>
            <TableRow>
              <TableCell>الشركة</TableCell>
              <TableCell>الرسوم الشهرية</TableCell>
              <TableCell>مدير الحساب</TableCell>
              <TableCell>دعم مخصص</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {enterprisePlans.map((plan) => {
              const features = parsePlanFeatures(plan.features);
              return (
                <TableRow key={plan.id}>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {plan.company?.name}
                    </Typography>
                    <Typography variant="caption">
                      {plan.company?.email}
                    </Typography>
                  </TableCell>
                  <TableCell>{plan.price} ج</TableCell>
                  <TableCell>{features.accountManager || "غير محدد"}</TableCell>
                  <TableCell>
                    {features.dedicatedSupport ? (
                      <CheckIcon color="success" />
                    ) : (
                      <CloseIcon color="error" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label="Enterprise" color="warning" size="small" />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => onEdit(plan)}
                      aria-label="تعديل"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
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
    <Box>
      <Paper
        sx={{
          p: 3,
          mb: 3,
          bgcolor: "info.light",
          color: "info.contrastText",
        }}
      >
        <Grid container spacing={3}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Typography variant="h4" fontWeight="bold">
              {draftThemes.length}
            </Typography>
            <Typography variant="body2">إجمالي القوالب</Typography>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Typography variant="h4" fontWeight="bold">
              {draftThemes.filter((theme) => theme.isActive).length}
            </Typography>
            <Typography variant="body2">قوالب متاحة للتفعيل</Typography>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Typography variant="h4" fontWeight="bold">
              {totalCurrentCompanies}
            </Typography>
            <Typography variant="body2">شركات تستخدم قالبًا</Typography>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{ wordBreak: "break-word" }}
            >
              {defaultTheme ? defaultTheme.name : "غير محدد"}
            </Typography>
            <Typography variant="body2">القالب الافتراضي</Typography>

          </Grid>
        </Grid>
      </Paper>

      <Alert severity="info" sx={{ mb: 3 }}>
        القالب الافتراضي هو الذي يحصل عليه أي متجر جديد عند إنشاء إعدادات
        المتجر لأول مرة.{" "}
        {defaultTheme
          ? `المحدد حاليًا: ${defaultTheme.name}.`
          : "لم يتم تحديد قالب افتراضي من الكتالوج بعد."}{" "}
        إجمالي عمليات شراء القوالب المسجلة: {totalPurchases}.
      </Alert>

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        flexDirection={{ xs: "column", md: "row" }}
        gap={2}
        mb={3}
      >
        <Box>
          <Typography variant="h6">كتالوج قوالب المتجر</Typography>
          <Typography variant="body2" color="text.secondary">
            من هنا يتحكم السوبر أدمن في إتاحة القوالب وتسعيرها للشركات، بينما
            الشراء والتطبيق يتمان من صفحة القوالب داخل متجر التطبيقات.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
          disabled={bulkSaving}
        >
          تحديث البيانات
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<CheckIcon />}
          onClick={handleEnableAndShowAllThemes}
          disabled={bulkSaving || uniqueThemes.length === 0}
        >
          {bulkSaving ? "جارٍ الإظهار والتفعيل..." : "إظهار وتفعيل كل القوالب"}
        </Button>
      </Box>

      {hiddenOrInactiveThemesCount > 0 ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          يوجد {hiddenOrInactiveThemesCount} قالب غير ظاهر للشركات أو غير متاح
          للتفعيل حاليًا. الزر الجماعي بالأعلى يعيدها كلها إلى حالة
          <strong> ظاهر + متاح للتفعيل </strong>
          دفعة واحدة.
        </Alert>
      ) : (
        <Alert severity="success" sx={{ mb: 3 }}>
          جميع القوالب الحالية ظاهرة للشركات ومتاحة للتفعيل.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="ابحث بالاسم أو الوصف أو themeId..."
              value={themeSearchQuery}
              onChange={(event) => setThemeSearchQuery(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="theme-visibility-filter-label">الحالة</InputLabel>
              <Select
                labelId="theme-visibility-filter-label"
                label="الحالة"
                value={visibilityFilter}
                onChange={(event) =>
                  setVisibilityFilter(event.target.value as ThemeVisibilityFilter)
                }
              >
                <MenuItem value="ALL">كل الحالات</MenuItem>
                <MenuItem value="VISIBLE">ظاهر للشركات</MenuItem>
                <MenuItem value="HIDDEN">مخفي</MenuItem>
                <MenuItem value="ACTIVE">متاح للتفعيل</MenuItem>
                <MenuItem value="INACTIVE">غير متاح</MenuItem>
                <MenuItem value="ARCHIVED">مؤرشف</MenuItem>
                <MenuItem value="FEATURED">مميز</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="theme-pricing-filter-label">التسعير</InputLabel>
              <Select
                labelId="theme-pricing-filter-label"
                label="التسعير"
                value={pricingFilter}
                onChange={(event) =>
                  setPricingFilter(event.target.value as ThemePricingFilter)
                }
              >
                <MenuItem value="ALL">كل الأسعار</MenuItem>
                <MenuItem value="FREE">مجاني</MenuItem>
                <MenuItem value="PAID">مدفوع</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="theme-category-filter-label">المجال</InputLabel>
              <Select
                labelId="theme-category-filter-label"
                label="المجال"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <MenuItem value="ALL">كل المجالات</MenuItem>
                {themeCategoryOptions.map((categoryLabel) => (
                  <MenuItem key={categoryLabel} value={categoryLabel}>
                    {categoryLabel}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allFilteredSelected}
                    indeterminate={
                      selectedThemeIds.length > 0 && !allFilteredSelected
                    }
                    onChange={(event) =>
                      toggleFilteredSelection(event.target.checked)
                    }
                  />
                }
                label="تحديد المعروض"
              />
              <Chip
                size="small"
                label={`${filteredThemes.length}/${draftThemes.length}`}
              />
            </Box>
          </Grid>
        </Grid>

        <Collapse in={selectedThemeIds.length > 0}>
          <Divider sx={{ my: 2 }} />
          <Box
            display="flex"
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
            flexDirection={{ xs: "column", md: "row" }}
            gap={2}
          >
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                {selectedThemeIds.length} قالب محدد
              </Typography>
              <Typography variant="caption" color="text.secondary">
                مستخدم حاليًا لدى {selectedUsageTotals.currentCompanies} شركة •
                مشتريات مسجلة {selectedUsageTotals.purchases}
              </Typography>
            </Box>
            <Box display="flex" flexWrap="wrap" gap={1}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<VisibilityIcon />}
                disabled={bulkSaving}
                onClick={() =>
                  persistThemePatch(
                    selectedThemeIds,
                    { isActive: true, isPublic: true },
                    "تم إظهار وتفعيل القوالب المحددة",
                  )
                }
              >
                إظهار المحدد
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                disabled={bulkSaving}
                onClick={() =>
                  persistThemePatch(
                    selectedThemeIds,
                    { isActive: false },
                    "تم تعطيل القوالب المحددة",
                  )
                }
              >
                تعطيل المحدد
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<ArchiveIcon />}
                disabled={bulkSaving}
                onClick={() => handleArchiveThemes(selectedThemeIds)}
              >
                أرشفة المحدد
              </Button>
              <TextField
                size="small"
                type="number"
                label="سعر موحد"
                value={bulkPrice}
                onChange={(event) => setBulkPrice(event.target.value)}
                sx={{ width: 130 }}
              />
              <Button
                size="small"
                variant="contained"
                disabled={bulkSaving}
                onClick={handleApplyBulkPrice}
              >
                تطبيق السعر
              </Button>
            </Box>
          </Box>
        </Collapse>
      </Paper>

      <Grid container spacing={3}>
        {filteredThemes.map((theme) => {
          const draft = theme;
          const isSaving = savingThemeId === theme.themeId || bulkSaving;
          const previewColors =
            draft.preview?.colors?.length > 0 ? draft.preview.colors : [];
          const usageStats = getThemeUsageStats(draft);
          const isSelected = selectedThemeSet.has(theme.themeId);

          return (
            <Grid key={theme.themeId} size={{ xs: 12, lg: 6 }}>
              <Card
                sx={{
                  height: "100%",
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: isSelected ? "primary.main" : "divider",
                  boxShadow: isSelected ? 4 : 1,
                }}
              >
                {draft.preview?.imageUrl && (
                  <Box
                    sx={{
                      height: 200,
                      width: "100%",
                      overflow: "hidden",
                      position: "relative",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      bgcolor: "action.hover",
                    }}
                  >
                    <img
                      src={draft.preview.imageUrl}
                      alt={draft.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "top center",
                      }}
                    />
                  </Box>
                )}
                <CardContent>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    gap={2}
                    mb={2}
                  >
                    <Box display="flex" alignItems="flex-start" gap={1}>
                      <Checkbox
                        size="small"
                        checked={isSelected}
                        onChange={(event) =>
                          toggleThemeSelection(theme.themeId, event.target.checked)
                        }
                        sx={{ mt: -0.75, mr: -0.5 }}
                      />
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {draft.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {draft.themeId}
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {draft.isFeatured ? (
                        <Chip label="مميز" color="warning" size="small" />
                      ) : null}
                      {draft.isDefaultTheme ? (
                        <Chip
                          label="افتراضي للمتاجر الجديدة"
                          color="primary"
                          size="small"
                          icon={<StarIcon fontSize="small" />}
                        />
                      ) : null}
                      <Chip
                        label={draft.isActive ? "نشط" : "موقوف"}
                        color={draft.isActive ? "success" : "default"}
                        size="small"
                      />
                      <Chip
                        label={draft.isPublic ? "ظاهر" : "مخفي"}
                        color={draft.isPublic ? "info" : "default"}
                        size="small"
                      />
                      {!draft.isActive && !draft.isPublic ? (
                        <Chip label="مؤرشف" color="error" size="small" />
                      ) : null}
                    </Box>
                  </Box>

                  <Box display="flex" gap={1} mb={2}>
                    {previewColors.map((colorValue, colorIndex) => (
                      <Box
                        key={`${draft.themeId}-${colorValue}-${colorIndex}`}
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: "999px",
                          border: "1px solid",
                          borderColor: "divider",
                          backgroundColor: `hsl(${colorValue})`,
                        }}
                      />
                    ))}
                  </Box>

                  <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "action.hover" }}>
                    <Grid container spacing={1}>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Typography variant="caption" color="text.secondary">
                          مفعل
                        </Typography>
                        <Typography variant="subtitle2">
                          {usageStats.activeInstallations} شركة
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Typography variant="caption" color="text.secondary">
                          مشتريات
                        </Typography>
                        <Typography variant="subtitle2">
                          {usageStats.purchases}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Typography variant="caption" color="text.secondary">
                          مستخدم الآن
                        </Typography>
                        <Typography variant="subtitle2">
                          {usageStats.currentCompanies} شركة
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Typography variant="caption" color="text.secondary">
                          إجمالي
                        </Typography>
                        <Typography variant="subtitle2">
                          {usageStats.installations || usageStats.installCount}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="رابط الصورة المعاينة (imageUrl)"
                        value={draft.preview?.imageUrl || ""}
                        onChange={(event) =>
                          handleDraftChange(theme.themeId, {
                            preview: {
                              ...draft.preview,
                              imageUrl: event.target.value,
                            },
                          })
                        }
                        sx={{ mb: 2 }}
                        helperText="يفضل استخدام مسار يبدأ بـ /assets/themes/..."
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="وصف القالب"
                        multiline
                        minRows={2}
                        value={draft.description}
                        onChange={(event) =>
                          handleDraftChange(theme.themeId, {
                            description: event.target.value,
                          })
                        }
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel id={`${theme.themeId}-pricing-model-label`}>
                          نموذج التسعير
                        </InputLabel>
                        <Select
                          labelId={`${theme.themeId}-pricing-model-label`}
                          label="نموذج التسعير"
                          value={draft.pricingModel}
                          onChange={(event) =>
                            handleDraftChange(theme.themeId, {
                              pricingModel:
                                event.target.value === "ONE_TIME"
                                  ? "ONE_TIME"
                                  : "FREE",
                              yearlyPrice:
                                event.target.value === "ONE_TIME"
                                  ? Number(draft.yearlyPrice) || 0
                                  : 0,
                            })
                          }
                        >
                          <MenuItem value="FREE">مجاني</MenuItem>
                          <MenuItem value="ONE_TIME">شراء مرة واحدة</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="سعر الشراء"
                        value={draft.monthlyPrice}
                        onChange={(event) =>
                          handleDraftChange(theme.themeId, {
                            monthlyPrice: Number(event.target.value) || 0,
                          })
                        }
                        disabled={draft.pricingModel !== "ONE_TIME"}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="السعر السنوي"
                        value={draft.yearlyPrice}
                        onChange={(event) =>
                          handleDraftChange(theme.themeId, {
                            yearlyPrice: Number(event.target.value) || 0,
                          })
                        }
                        disabled
                        helperText="غير مستخدم في شراء القوالب"
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={draft.isActive}
                            disabled={draft.isDefaultTheme}
                            onChange={(event) =>
                              handleDraftChange(theme.themeId, {
                                isActive: event.target.checked,
                              })
                            }
                          />
                        }
                        label="متاح للتفعيل"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={draft.isPublic}
                            disabled={draft.isDefaultTheme}
                            onChange={(event) =>
                              handleDraftChange(theme.themeId, {
                                isPublic: event.target.checked,
                              })
                            }
                          />
                        }
                        label="ظاهر للشركات"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={draft.isFeatured}
                            onChange={(event) =>
                              handleDraftChange(theme.themeId, {
                                isFeatured: event.target.checked,
                              })
                            }
                          />
                        }
                        label="شارة مميز"
                      />
                    </Grid>
                  </Grid>

                  <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={1}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                          الرئيسية
                        </Typography>
                        <Typography variant="subtitle2">
                          {draft.pageStats.homeSections} sections
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                          المتجر
                        </Typography>
                        <Typography variant="subtitle2">
                          {draft.pageStats.shopSections} sections
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                          المنتج
                        </Typography>
                        <Typography variant="subtitle2">
                          {draft.pageStats.pdpSections} sections
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                          السلة/الدفع
                        </Typography>
                        <Typography variant="subtitle2">
                          {draft.pageStats.cartSections +
                            draft.pageStats.checkoutSections}{" "}
                          sections
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  <Box display="flex" justifyContent="space-between" gap={1} flexWrap="wrap">
                    <Button
                      component="a"
                      href={`/marketplace/themes?theme=${encodeURIComponent(draft.themeId)}`}
                      target="_blank"
                      rel="noreferrer"
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                    >
                      معاينة
                    </Button>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      <Button
                        variant={draft.isDefaultTheme ? "contained" : "outlined"}
                        color="primary"
                        startIcon={<StarIcon />}
                        onClick={() => handleSetDefaultTheme(draft)}
                        disabled={isSaving || draft.isDefaultTheme}
                      >
                        {draft.isDefaultTheme ? "القالب الافتراضي" : "تعيين كافتراضي"}
                      </Button>
                      <Button

                        variant="outlined"
                        color={draft.isActive || draft.isPublic ? "error" : "success"}
                        startIcon={
                          draft.isActive || draft.isPublic ? (
                            <ArchiveIcon />
                          ) : (
                            <VisibilityIcon />
                          )
                        }
                        onClick={() =>
                          draft.isActive || draft.isPublic
                            ? handleArchiveThemes([theme.themeId])
                            : persistThemePatch(
                                [theme.themeId],
                                { isActive: true, isPublic: true },
                                "تم إظهار القالب",
                              )
                        }
                        disabled={isSaving || draft.isDefaultTheme}

                      >
                        {draft.isActive || draft.isPublic ? "أرشفة" : "إظهار"}
                      </Button>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={() => handleSave(theme.themeId)}
                      disabled={isSaving}
                    >
                      {isSaving ? "جاري الحفظ..." : "حفظ القالب"}
                    </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
        {filteredThemes.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Alert severity="info">
              لا توجد قوالب مطابقة للبحث أو الفلاتر الحالية.
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

const MarketplaceItemDialog = ({
  open,
  onClose,
  item,
  type,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  item: MarketplaceManagementItem | null;
  type: MarketplaceItemType;
  onSave: (data: MarketplaceDialogFormData) => Promise<void> | void;
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {item ? "تعديل" : "إضافة"} {dialogLabel}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {type === "pricing" ? (
            <>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="الميزة"
                  name="feature"
                  value={formData.feature ?? ""}
                  onChange={handleChange}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="السعر"
                  name="price"
                  type="number"
                  value={formData.price ?? 0}
                  onChange={handleChange}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="الوحدة"
                  name="unit"
                  value={formData.unit ?? ""}
                  onChange={handleChange}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box display="flex" gap={3}>
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      نشط:
                    </Typography>
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={!!formData.isActive}
                      onChange={handleChange}
                    />
                  </Box>
                </Box>
              </Grid>
            </>
          ) : type === "enterprise" ? (
            <>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="معرف الشركة (Company ID)"
                  name="companyId"
                  value={formData.companyId ?? ""}
                  onChange={handleChange}
                  disabled={!!item}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="اسم الخطة"
                  name="name"
                  value={formData.name ?? ""}
                  onChange={handleChange}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="السعر"
                  name="price"
                  type="number"
                  value={formData.price ?? 0}
                  onChange={handleChange}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="الوصف"
                  name="description"
                  multiline
                  rows={3}
                  value={formData.description ?? ""}
                  onChange={handleChange}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box display="flex" gap={3}>
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      نشط:
                    </Typography>
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={!!formData.isActive}
                      onChange={handleChange}
                    />
                  </Box>
                </Box>
              </Grid>
            </>
          ) : type === "bundle" ? (
            <>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="الاسم"
                  name="name"
                  value={formData.name ?? ""}
                  onChange={handleChange}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Slug"
                  name="slug"
                  value={formData.slug ?? ""}
                  onChange={handleChange}
                  placeholder="اتركه فارغاً للتوليد التلقائي"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="الوصف"
                  name="description"
                  multiline
                  rows={3}
                  value={formData.description ?? ""}
                  onChange={handleChange}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField
                  fullWidth
                  label="السعر الشهري"
                  name="monthlyPrice"
                  type="number"
                  value={formData.monthlyPrice ?? 0}
                  onChange={handleChange}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField
                  fullWidth
                  label="الخصم %"
                  name="discount"
                  type="number"
                  value={formData.discount ?? 0}
                  onChange={handleChange}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box
                  display="flex"
                  gap={2}
                  sx={{ height: "100%", alignItems: "center" }}
                >
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      نشط:
                    </Typography>
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={!!formData.isActive}
                      onChange={handleChange}
                    />
                  </Box>
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      مميز:
                    </Typography>
                    <input
                      type="checkbox"
                      name="isFeatured"
                      checked={!!formData.isFeatured}
                      onChange={handleChange}
                    />
                  </Box>
                </Box>
              </Grid>
            </>
          ) : (
            <>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="الاسم"
                  name="name"
                  value={formData.name ?? ""}
                  onChange={handleChange}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Slug"
                  name="slug"
                  value={formData.slug ?? ""}
                  onChange={handleChange}
                  placeholder="اتركه فارغاً للتوليد التلقائي"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="الوصف"
                  name="description"
                  multiline
                  rows={2}
                  value={formData.description ?? ""}
                  onChange={handleChange}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id="category-label">الفئة</InputLabel>
                  <Select
                    labelId="category-label"
                    label="الفئة"
                    name="category"
                    value={formData.category ?? "ECOMMERCE"}
                    onChange={(event) =>
                      setFieldValue("category", String(event.target.value))
                    }
                  >
                    {categoryMap.map((cat) => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField
                  fullWidth
                  label="السعر الشهري"
                  name="monthlyPrice"
                  type="number"
                  value={formData.monthlyPrice ?? 0}
                  onChange={handleChange}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField
                  fullWidth
                  label="أيام التجربة"
                  name="trialDays"
                  type="number"
                  value={formData.trialDays ?? 14}
                  onChange={handleChange}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="الأيقونة (Emoji or Icon Name)"
                  name="icon"
                  value={formData.icon ?? ""}
                  onChange={handleChange}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <Box display="flex" alignItems="center" sx={{ height: "100%" }}>
                  <Typography variant="body2" sx={{ mr: 1 }}>
                    تثبيت تلقائي:
                  </Typography>
                  <input
                    type="checkbox"
                    name="isAutoInstall"
                    checked={!!formData.isAutoInstall}
                    onChange={handleChange}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="رابط اللوجو (URL)"
                  name="logo"
                  value={formData.logo ?? ""}
                  onChange={handleChange}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel id="pricing-model-label">نظام التسعير</InputLabel>
                  <Select
                    labelId="pricing-model-label"
                    label="نظام التسعير"
                    name="pricingModel"
                    value={formData.pricingModel ?? "SUBSCRIPTION"}
                    onChange={(event) =>
                      setFieldValue(
                        "pricingModel",
                        String(event.target.value) as PricingModel,
                      )
                    }
                  >
                    <MenuItem value="FREE">مجاني</MenuItem>
                    <MenuItem value="SUBSCRIPTION">اشتراك شهري/سنوي</MenuItem>
                    <MenuItem value="PAY_PER_USE">حسب الاستخدام (PPU)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField
                  fullWidth
                  label="سعر الوحدة (لـ PPU)"
                  name="unitPrice"
                  type="number"
                  value={formData.unitPrice ?? 0}
                  onChange={handleChange}
                  disabled={formData.pricingModel !== "PAY_PER_USE"}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField
                  fullWidth
                  label="اسم الوحدة (لـ PPU)"
                  name="unitName"
                  value={formData.unitName ?? ""}
                  onChange={handleChange}
                  disabled={formData.pricingModel !== "PAY_PER_USE"}
                  placeholder="مثال: رسالة، موظف"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="المسار الرئيسي (Main Route)"
                  name="mainRoute"
                  value={formData.mainRoute ?? ""}
                  onChange={handleChange}
                  placeholder="/my-apps/something"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="مسار الإدارة (Admin Route)"
                  name="adminRoute"
                  value={formData.adminRoute ?? ""}
                  onChange={handleChange}
                  placeholder="/settings/something"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="الأدوات والمميزات (Tools Included)"
                  name="features"
                  multiline
                  rows={3}
                  value={formData.features.join(", ")}
                  onChange={(event) =>
                    setFieldValue("features", parseStringList(event.target.value))
                  }
                  placeholder="افصل بين كل ميزة بفاصلة (،) .. مثال: نظام تقارير، ربط واتساب، دعم فني"
                  helperText="افصل بين الأدوات بفاصلة لكي تظهر كنقاط منفصلة للمستخدم"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Box display="flex" gap={3} flexWrap="wrap">
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      نشط:
                    </Typography>
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={!!formData.isActive}
                      onChange={handleChange}
                    />
                  </Box>
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      عام (Public):
                    </Typography>
                    <input
                      type="checkbox"
                      name="isPublic"
                      checked={!!formData.isPublic}
                      onChange={handleChange}
                    />
                  </Box>
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      مميز (Featured):
                    </Typography>
                    <input
                      type="checkbox"
                      name="isFeatured"
                      checked={!!formData.isFeatured}
                      onChange={handleChange}
                    />
                  </Box>
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      شائع (Popular):
                    </Typography>
                    <input
                      type="checkbox"
                      name="isPopular"
                      checked={!!formData.isPopular}
                      onChange={handleChange}
                    />
                  </Box>
                </Box>
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={() => onSave(formData)}>
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const EditPlanDialog = ({
  open,
  onClose,
  plan,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  plan: PlatformPlan | null;
  onSave: (
    data: Omit<PlanFormData, "features"> & { features: string },
  ) => Promise<void> | void;
}) => {
  const [formData, setFormData] = useState<PlanFormData>(() =>
    createDefaultPlanFormData(),
  );
  const [activeTab, setActiveTab] = useState(0);
  const [errors, setErrors] = useState<PlanFieldErrors>({});

  const billingCycles: Array<{ value: BillingCycle; label: string }> = [
    { value: "monthly", label: "شهري" },
    { value: "quarterly", label: "ربع سنوي" },
    { value: "yearly", label: "سنوي" },
  ];

  const currencies: Array<{ value: string; label: string }> = [
    { value: "EGP", label: "جنيه مصري (EGP)" },
    { value: "USD", label: "دولار أمريكي (USD)" },
    { value: "SAR", label: "ريال سعودي (SAR)" },
    { value: "AED", label: "درهم إماراتي (AED)" },
  ];

  useEffect(() => {
    const defaultFormData = createDefaultPlanFormData();

    if (plan) {
      setFormData({
        ...defaultFormData,
        planType: plan.planType || "",
        name: plan.name || "",
        nameEn: plan.nameEn || "",
        price: plan.price || 0,
        currency: plan.currency || "EGP",
        billingCycle: plan.billingCycle || "monthly",
        description: plan.description || "",
        descriptionEn: plan.descriptionEn || "",
        features: parsePlanFeatures(plan.features),
      });
    } else {
      setFormData(defaultFormData);
    }
    setActiveTab(0);
    setErrors({});
  }, [plan, open]);

  const clearError = useCallback((key: PlanFieldErrorKey) => {
    setErrors((prev) => {
      if (!prev[key]) {
        return prev;
      }

      const nextErrors = { ...prev };
      delete nextErrors[key];
      return nextErrors;
    });
  }, []);

  const updateField = useCallback(
    <K extends keyof Omit<PlanFormData, "features">>(
      name: K,
      value: PlanFormData[K],
    ) => {
      setFormData((prev) => ({ ...prev, [name]: value }));
      clearError(name);
    },
    [clearError],
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    const fieldName = name as keyof Omit<PlanFormData, "features">;
    const nextValue =
      type === "number"
        ? Number(value)
        : (value as PlanFormData[typeof fieldName]);

    updateField(fieldName, nextValue as PlanFormData[typeof fieldName]);
  };

  const handleFeatureChange = <K extends keyof PlatformPlanFeatures>(
    featureKey: K,
    value: PlatformPlanFeatures[K],
  ) => {
    setFormData((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [featureKey]: value,
      },
    }));
    clearError(featureKey);
  };

  const validate = () => {
    const newErrors: PlanFieldErrors = {};

    if (!formData.planType.trim()) {
      newErrors.planType = "نوع الخطة مطلوب";
    }
    if (!formData.name.trim()) {
      newErrors.name = "اسم الخطة مطلوب";
    }
    if (formData.price < 0) {
      newErrors.price = "السعر يجب أن يكون 0 أو أكثر";
    }
    if (formData.features.maxUsers < -1) {
      newErrors.maxUsers = "الحد الأقصى للمستخدمين غير صالح (-1 للغير محدود)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const dataToSave = {
      ...formData,
      features: JSON.stringify(formData.features),
    };
    onSave(dataToSave);
  };

  const formatFeatureValue = (value: unknown) => {
    if (value === -1 || value === true) return "✓";
    if (
      value === false ||
      value === undefined ||
      value === null ||
      value === ""
    )
      return "✗";
    return value;
  };

  const numericFeatures: Array<{
    key: NumericPlanFeatureKey;
    label: string;
    helper: string;
  }> = [
    {
      key: "maxUsers",
      label: "الحد الأقصى للمستخدمين",
      helper: "-1 للغير محدود",
    },
    {
      key: "maxCustomers",
      label: "الحد الأقصى للعملاء",
      helper: "-1 للغير محدود",
    },
    {
      key: "maxConversations",
      label: "الحد الأقصى للمحادثات",
      helper: "-1 للغير محدود",
    },
    {
      key: "maxMessages",
      label: "الحد الأقصى للرسائل",
      helper: "-1 للغير محدود",
    },
    {
      key: "aiResponses",
      label: "الردود التلقائية",
      helper: "-1 للغير محدود",
    },
    { key: "customFields", label: "الحقول المخصصة", helper: "-1 للغير محدود" },
    {
      key: "automatedWorkflows",
      label: "سير العمل التلقائي",
      helper: "-1 للغير محدود",
    },
    {
      key: "dataRetention",
      label: "الاحتفاظ بالبيانات (أيام)",
      helper: "-1 للغير محدود",
    },
    { key: "storageLimit", label: "حد التخزين (GB)", helper: "-1 للغير محدود" },
  ];

  const booleanFeatures: Array<{
    key: BooleanPlanFeatureKey;
    label: string;
  }> = [
    { key: "customBranding", label: "العلامة التجارية المخصصة" },
    { key: "advancedReports", label: "التقارير المتقدمة" },
    { key: "apiAccess", label: "الوصول للـ API" },
    { key: "prioritySupport", label: "الدعم ذو الأولوية" },
    { key: "customIntegrations", label: "التكاملات المخصصة" },

    { key: "facebookMessenger", label: "فيسبوك ماسنجر" },
    { key: "webChat", label: "الدردشة على الموقع" },
    { key: "mobileApp", label: "تطبيق الجوال" },
    { key: "multiLanguage", label: "متعدد اللغات" },
    { key: "exportData", label: "تصدير البيانات" },
    { key: "dedicatedSupport", label: "دعم مخصص" },
    { key: "customDevelopment", label: "تطوير مخصص" },
    { key: "onPremiseDeployment", label: "النشر المحلي" },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={2}>
          {plan ? <EditIcon color="primary" /> : <AddIcon color="success" />}
          <Typography variant="h6">
            {plan ? `تعديل خطة ${plan.name}` : "إنشاء خطة جديدة"}
          </Typography>
        </Box>
      </DialogTitle>

      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        sx={{ px: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="المعلومات الأساسية" />
        <Tab label="الحدود والأرقام" />
        <Tab label="المميزات المتقدمة" />
        <Tab label="معاينة" />
      </Tabs>

      <DialogContent sx={{ pt: 3 }}>
        {/* Tab 1: Basic Info */}
        {activeTab === 0 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="نوع الخطة (Plan Type) *"
                name="planType"
                value={formData.planType}
                onChange={handleChange}
                disabled={!!plan}
                error={!!errors.planType}
                helperText={
                  errors.planType ||
                  (plan
                    ? "لا يمكن تغيير نوع الخطة"
                    : "مثال: BASIC, PRO, ENTERPRISE أو CUSTOM1")
                }
                placeholder="مثال: PRO"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="الاسم (العربية) *"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name}
                placeholder="الخطة الاحترافية"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="الاسم (English)"
                name="nameEn"
                value={formData.nameEn}
                onChange={handleChange}
                placeholder="Professional Plan"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="السعر *"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                error={!!errors.price}
                helperText={errors.price}
                InputProps={{
                  startAdornment: (
                    <Typography sx={{ mr: 1, color: "text.secondary" }}>
                      {formData.currency}
                    </Typography>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>العملة</InputLabel>
                <Select
                  name="currency"
                  value={formData.currency}
                  label="العملة"
                  onChange={(event) =>
                    updateField("currency", String(event.target.value))
                  }
                >
                  {currencies.map((c) => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>دورة الفوترة</InputLabel>
                <Select
                  name="billingCycle"
                  value={formData.billingCycle}
                  label="دورة الفوترة"
                  onChange={(event) =>
                    updateField(
                      "billingCycle",
                      String(event.target.value) as BillingCycle,
                    )
                  }
                >
                  {billingCycles.map((b) => (
                    <MenuItem key={b.value} value={b.value}>
                      {b.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="وصف الخطة (عربي)"
                name="description"
                multiline
                rows={2}
                value={formData.description}
                onChange={handleChange}
                placeholder="وصف مختصر للخطة ومميزاتها الرئيسية"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="الوصف (English)"
                name="descriptionEn"
                multiline
                rows={2}
                value={formData.descriptionEn}
                onChange={handleChange}
                placeholder="Brief description of the plan"
              />
            </Grid>
          </Grid>
        )}

        {/* Tab 2: Numeric Limits */}
        {activeTab === 1 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                أدخل -1 للقيم غير المحدودة. القيم تُحسب بالشهر ما عدا
                dataRetention (أيام).
              </Alert>
            </Grid>
            {numericFeatures.map((feature) => (
              <Grid key={feature.key} size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  fullWidth
                  type="number"
                  label={feature.label}
                  value={formData.features[feature.key]}
                  onChange={(e) =>
                    handleFeatureChange(
                      feature.key,
                      parseInt(e.target.value) || 0,
                    )
                  }
                  helperText={feature.helper}
                  size="small"
                />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Tab 3: Boolean Features */}
        {activeTab === 2 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                مميزات إضافية متوفرة في هذه الخطة.
              </Alert>
            </Grid>
            {booleanFeatures.map((feature) => (
              <Grid key={feature.key} size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper
                  sx={{
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    bgcolor: formData.features[feature.key]
                      ? "success.light"
                      : "background.paper",
                    border: 1,
                    borderColor: formData.features[feature.key]
                      ? "success.main"
                      : "divider",
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={formData.features[feature.key] ? 600 : 400}
                  >
                    {feature.label}
                  </Typography>
                  <input
                    type="checkbox"
                    checked={!!formData.features[feature.key]}
                    onChange={(e) =>
                      handleFeatureChange(feature.key, e.target.checked)
                    }
                    style={{ width: 20, height: 20, cursor: "pointer" }}
                  />
                </Paper>
              </Grid>
            ))}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="اتفاقية مستوى الخدمة (SLA)"
                value={formData.features.sla || ""}
                onChange={(e) => handleFeatureChange("sla", e.target.value)}
                placeholder="99.9%"
                helperText="مثال: 99.9%"
                size="small"
              />
            </Grid>
          </Grid>
        )}

        {/* Tab 4: Preview */}
        {activeTab === 3 && (
          <Box>
            <Paper
              sx={{
                p: 3,
                mb: 3,
                bgcolor: "primary.light",
                color: "primary.contrastText",
              }}
            >
              <Typography variant="h4" fontWeight="bold">
                {formData.name || "اسم الخطة"}
              </Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>
                {formData.price} {formData.currency} /
                {
                  billingCycles.find((b) => b.value === formData.billingCycle)
                    ?.label
                }
              </Typography>
              <Typography variant="body1" sx={{ mt: 1, opacity: 0.9 }}>
                {formData.description || "لا يوجد وصف"}
              </Typography>
            </Paper>

            <Typography variant="h6" gutterBottom>
              ملخص المميزات:
            </Typography>
            <Grid container spacing={1}>
              {numericFeatures.map((f) => (
                <Grid key={f.key} size={{ xs: 12, sm: 6 }}>
                  <Chip
                    label={`${f.label}: ${formatFeatureValue(formData.features[f.key])}`}
                    color={
                      formData.features[f.key] === -1 ? "success" : "default"
                    }
                    size="small"
                    sx={{ width: "100%", justifyContent: "flex-start" }}
                  />
                </Grid>
              ))}
              {booleanFeatures.map((f) => (
                <Grid key={f.key} size={{ xs: 12, sm: 6 }}>
                  <Chip
                    icon={
                      formData.features[f.key] ? <CheckIcon /> : <CloseIcon />
                    }
                    label={f.label}
                    color={formData.features[f.key] ? "success" : "default"}
                    variant={formData.features[f.key] ? "filled" : "outlined"}
                    size="small"
                    sx={{ width: "100%", justifyContent: "flex-start" }}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          startIcon={plan ? <SaveIcon /> : <AddIcon />}
          disabled={Object.keys(errors).length > 0 && activeTab === 0}
        >
          {plan ? "حفظ التغييرات" : "إنشاء الخطة"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SubscriptionCenter;
