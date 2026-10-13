import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuthSimple";
import { toast } from "sonner";
import {
  Package, Settings2, X, Loader2, CheckCircle2,
  Clock, CreditCard, Search, AppWindow, Store,
  Zap, ArrowUpRight, Shield, AlertCircle,
  LayoutGrid, List, RefreshCw, MoreVertical,
  ExternalLink, Sparkles, TrendingUp,
  SlidersHorizontal, Users, MessageSquare,
  Bot, DollarSign, Layers, Truck, Activity,
  ChevronLeft, ArrowUpDown, Plus,
  Download, Trash2, CheckSquare, Square, History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAppSystemHub, SYSTEM_HUBS, resolveRecommendedSystemHub } from "@/utils/marketplaceSystems";
import {
  categoryIcons,
  appIcons,
  appIconsBySlug,
  shouldUseTextIcon,
} from "@/utils/marketplace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { InstalledApp } from "@/types/marketplace";

interface ApiResponse {
  success: boolean;
  data: InstalledApp[];
}

export const APP_ROUTE_MAP: Record<string, string> = {
  "quantity-offers-pro": "/products",
  "conversion-suite": "/my-apps/conversion-suite/settings",
  "ugc-reviews-pro": "/my-apps/ugc-reviews-pro/settings",
  "commerce-advanced": "/my-apps/commerce-advanced/settings",
  "whatsapp-business": "/whatsapp",
  "whatsapp-cloud-api": "/whatsapp",
  "telegram-business": "/telegram",
  "telegram-integration": "/telegram",
  "instagram-business": "/instagram-inbox",
  "tiktok-integrations": "/tiktok-inbox",
  "facebook-ads-pro": "/advertising/facebook-ads",
  "facebook-pages-connect": "/marketing/facebook",
  "facebook-post": "/marketing/facebook-post",
  "ai-chat-basic": "/admin/ai-hub",
  "ai-chat-pro": "/admin/ai-hub",
  "orders-analytics": "/analytics/orders",
  "analytics-basic": "/analytics/orders",
  "inventory-pro": "/inventory",
  "pos-pro": "/pos",
  "coupons-pro": "/coupons",
  "wholesale-pro": "/wholesale",
  "affiliate-pro": "/affiliates/dashboard",
  "amazon-affiliate-pro": "/amazon-affiliate",
  "blog-pro": "/articles",
  "order-shipping-turbo": "/shipping",
  "procurement-pro": "/procurement",
  "hr-basic": "/hr",
  "unified-inbox": "/unified-inbox",
  "abandoned-cart-recovery": "/orders",
  "order-automation": "/orders/automation",
  "bulk-search": "/bulk-search",
  "customer-blocks": "/settings/customer-blocks",
  "customer-loyalty-pro": "/customers",
  "crm-lite": "/customers",
  "crm-basic": "/customers",
  "medical-system": "/doctor/dashboard",
  "dental-lab-app": "/dental-lab",
  "dental-materials-pro": "/dental-lab/materials",
  "booking-app": "/appointments",
  "notification-automation": "/notifications/settings",
  "executable-mindmap": "/mindmap",
  "order-preparation": "/orders/preparation",
  "order-preparation-hold": "/orders/preparation?pageSize=96&activeStage=ON_HOLD_PREP",
  "treasury-expenses-pro": "/treasury-expenses",
};

export function getAppDestination(app: { slug: string; mainRoute?: string | null }): string {
  if (app.mainRoute && typeof app.mainRoute === "string" && app.mainRoute.trim()) {
    return app.mainRoute.trim();
  }
  if (APP_ROUTE_MAP[app.slug]) {
    return APP_ROUTE_MAP[app.slug];
  }
  return `/my-apps/${app.slug}/settings`;
}

const CATEGORY_CONFIG: Record<string, { labelAr: string; icon: typeof Package }> = {
  ECOMMERCE: { labelAr: "المتجر والمنتجات", icon: Store },
  ORDER_OPS: { labelAr: "الطلبات والتنفيذ", icon: Package },
  MARKETING: { labelAr: "التسويق والإعلانات", icon: Sparkles },
  COMMUNICATION: { labelAr: "المحادثات والتواصل", icon: MessageSquare },
  AI: { labelAr: "الذكاء الاصطناعي", icon: Bot },
  ANALYTICS: { labelAr: "التحليلات والتقارير", icon: TrendingUp },
  WAREHOUSE: { labelAr: "المخزون والمستودعات", icon: Layers },
  SHIPPING: { labelAr: "الشحن والتوصيل", icon: Truck },
  FINANCE: { labelAr: "المالية والفواتير", icon: DollarSign },
  HR: { labelAr: "الموارد البشرية", icon: Users },
  SUPPORT: { labelAr: "خدمة العملاء", icon: Shield },
  CRM: { labelAr: "إدارة العملاء", icon: Users },
  INTEGRATION: { labelAr: "التكاملات والربط", icon: Zap },
  THEMES: { labelAr: "القوالب والمظهر", icon: AppWindow },
};

const STATUS_CONFIG = {
  ACTIVE: {
    labelKey: "active",
    fallbackLabel: "نشط",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    barClass: "bg-emerald-500",
    icon: CheckCircle2,
  },
  TRIAL: {
    labelKey: "trial",
    fallbackLabel: "فترة تجريبية",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    barClass: "bg-amber-500",
    icon: Clock,
  },
  CANCELLED: {
    labelKey: "cancelled",
    fallbackLabel: "متوقف",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    barClass: "bg-destructive/60",
    icon: X,
  },
  EXPIRED: {
    labelKey: "expired",
    fallbackLabel: "انتهى الاشتراك",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    barClass: "bg-destructive",
    icon: X,
  },
} as const;

type StatusFilter = "ALL" | "ACTIVE" | "TRIAL" | "CANCELLED" | "EXPIRED";
type SortOption = "newest" | "name" | "usage" | "trial_ending";

function getDaysRemaining(trialEndsAt?: string): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const STARTER_APPS = [
  {
    slug: "whatsapp-business",
    name: "واتساب للأعمال والرد الآلي",
    desc: "أتمتة إشعارات الطلبات والشحن والرد على استفسارات العملاء فوراً.",
    icon: MessageSquare,
    badge: "الأكثر طلباً",
    category: "COMMUNICATION",
  },
  {
    slug: "quantity-offers-pro",
    name: "عروض الكميات المتقدمة",
    desc: "زيادة متوسط قيمة السلة بحزم وتخفيضات الكميات التلقائية.",
    icon: Store,
    badge: "مضاعفة المبيعات",
    category: "ECOMMERCE",
  },
  {
    slug: "orders-analytics",
    name: "تحليلات الطلبات الذكية",
    desc: "لوحة مؤشرات تفاعلية لمتابعة حالات الطلبات والمدفوعات والإلغاءات.",
    icon: TrendingUp,
    badge: "رؤية حية",
    category: "ANALYTICS",
  },
  {
    slug: "conversion-suite",
    name: "حزمة تعزيز التحويلات",
    desc: "أشرطة التخفيض، وعدادات الطوارئ، وتنبيهات الشراء المباشر للزوار.",
    icon: Zap,
    badge: "رفع التحويل",
    category: "MARKETING",
  },
];

export function MyApps() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const companySpecialtySlug = user?.company?.businessSpecialty?.slug;
  const recommendedHub = resolveRecommendedSystemHub(companySpecialtySlug);

  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedHub, setSelectedHub] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [uninstallingId, setUninstallingId] = useState<string | null>(null);
  const [confirmUninstall, setConfirmUninstall] = useState<InstalledApp | null>(null);
  const [selectedAppForDrawer, setSelectedAppForDrawer] = useState<InstalledApp | null>(null);

  // Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkUninstall, setConfirmBulkUninstall] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const fetchApps = useCallback(async (showRefreshingSpinner = false) => {
    if (showRefreshingSpinner) setIsRefreshing(true);
    else setLoading(true);
    try {
      const res = await apiClient.get<ApiResponse>("/my-apps");
      if (res.data.success) {
        setApps(res.data.data || []);
      }
    } catch {
      toast.error(t("marketplace.fetchError", "تعذر جلب التطبيقات المفعلة"));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []); // Stable dependency

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const handleUninstall = async () => {
    if (!confirmUninstall) return;
    setUninstallingId(confirmUninstall.id);
    try {
      await apiClient.post(`/marketplace/apps/${confirmUninstall.app.slug}/uninstall`);
      toast.success(
        t("marketplace.deactivatedSuccess", {
          name: confirmUninstall.app.name,
          defaultValue: `تم إلغاء تفعيل ${confirmUninstall.app.name}`,
        })
      );
      setApps((prev) => prev.filter((a) => a.id !== confirmUninstall.id));
      if (selectedAppForDrawer?.id === confirmUninstall.id) {
        setSelectedAppForDrawer(null);
      }
      await refreshUser?.();
    } catch {
      toast.error(
        t("marketplace.deactivationError", "حدث خطأ أثناء إلغاء التفعيل، يرجى المحاولة لاحقاً")
      );
    } finally {
      setUninstallingId(null);
      setConfirmUninstall(null);
    }
  };

  const toggleSelectApp = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkUninstall = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    const selectedApps = apps.filter((a) => selectedIds.has(a.id));
    let successCount = 0;

    await Promise.allSettled(
      selectedApps.map(async (installed) => {
        try {
          await apiClient.post(`/marketplace/apps/${installed.app.slug}/uninstall`);
          successCount++;
        } catch (e) {
          console.error("Failed to uninstall", installed.app.slug, e);
        }
      })
    );

    toast.success(`تم إلغاء تفعيل ${successCount} أداة بنجاح`);
    setApps((prev) => prev.filter((a) => !selectedIds.has(a.id)));
    setSelectedIds(new Set());
    setIsBulkDeleting(false);
    setConfirmBulkUninstall(false);
    await refreshUser?.();
  };

  const handleExportSelected = () => {
    const selectedApps = apps.filter((a) => selectedIds.has(a.id));
    if (selectedApps.length === 0) return;
    const headers = "اسم الأداة,الفئة,الحالة,نموذج التسعير,استهلاك الشهر (ج.م)\n";
    const rows = selectedApps.map((a) => {
      const name = `"${(a.app.name || "").replace(/"/g, '""')}"`;
      const category = `"${a.app.category || ""}"`;
      const status = a.status === "ACTIVE" ? "نشط" : a.status === "TRIAL" ? "تجريبي" : "متوقف";
      const pricing = a.activePricingModel === "FREE" ? "مجاني" : a.activePricingModel === "PAY_PER_USE" ? "حسب الاستخدام" : "شهري";
      const cost = Number(a.monthlyUsage?.totalCost || 0).toFixed(2);
      return `${name},${category},${status},${pricing},${cost}`;
    }).join("\n");

    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `selected_apps_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("تم تصدير ملخص الأدوات المحددة بنجاح");
  };

  // Hub counts & available hubs
  const hubCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: apps.length };
    for (const hub of SYSTEM_HUBS) {
      if (hub.id === "ALL") continue;
      counts[hub.id] = 0;
    }
    for (const a of apps) {
      if (!a.app) continue;
      const hub = getAppSystemHub(a.app as any);
      if (counts[hub.id] !== undefined) {
        counts[hub.id]++;
      }
    }
    return counts;
  }, [apps]);

  const availableHubs = useMemo(() => {
    return SYSTEM_HUBS.filter(
      (hub) => hub.id === "ALL" || (hubCounts[hub.id] && hubCounts[hub.id] > 0)
    );
  }, [hubCounts]);

  // Extract categories dynamically
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    apps.forEach((a) => {
      if (a.app?.category) {
        if (selectedHub !== "ALL") {
          const hub = getAppSystemHub(a.app as any);
          if (hub.id !== selectedHub) return;
        }
        cats.add(a.app.category.toUpperCase());
      }
    });
    return Array.from(cats);
  }, [apps, selectedHub]);

  // Statistics
  const stats = useMemo(() => {
    const active = apps.filter((a) => a.status === "ACTIVE").length;
    const trial = apps.filter((a) => a.status === "TRIAL").length;
    const expiringSoon = apps.filter((a) => {
      if (a.status !== "TRIAL") return false;
      const days = getDaysRemaining(a.trialEndsAt);
      return days !== null && days <= 3;
    }).length;
    const monthlyTotalCost = apps.reduce((acc, a) => {
      return acc + (Number(a.monthlyUsage?.totalCost) || 0);
    }, 0);

    return {
      total: apps.length,
      active,
      trial,
      expiringSoon,
      monthlyTotalCost,
    };
  }, [apps]);

  // Filtered & Sorted Apps
  const filteredApps = useMemo(() => {
    return apps
      .filter((a) => {
        if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
        if (selectedHub !== "ALL") {
          const hub = getAppSystemHub(a.app as any);
          if (hub.id !== selectedHub) return false;
        }
        if (categoryFilter !== "ALL" && a.app?.category?.toUpperCase() !== categoryFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const name = (a.app?.name || "").toLowerCase();
          const nameEn = (a.app?.nameEn || "").toLowerCase();
          const desc = (a.app?.description || "").toLowerCase();
          const slug = (a.app?.slug || "").toLowerCase();
          const hub = getAppSystemHub(a.app as any);
          const hubName = (hub.nameAr || "").toLowerCase();
          if (
            !name.includes(q) &&
            !nameEn.includes(q) &&
            !desc.includes(q) &&
            !slug.includes(q) &&
            !hubName.includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return (a.app?.name || "").localeCompare(b.app?.name || "", "ar");
        }
        if (sortBy === "usage") {
          const costA = Number(a.monthlyUsage?.totalCost) || 0;
          const costB = Number(b.monthlyUsage?.totalCost) || 0;
          return costB - costA;
        }
        if (sortBy === "trial_ending") {
          const daysA = getDaysRemaining(a.trialEndsAt) ?? 999;
          const daysB = getDaysRemaining(b.trialEndsAt) ?? 999;
          return daysA - daysB;
        }
        // default "newest"
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [apps, statusFilter, selectedHub, categoryFilter, search, sortBy]);

  const isAllVisibleSelected = useMemo(() => {
    if (filteredApps.length === 0) return false;
    return filteredApps.every((a) => selectedIds.has(a.id));
  }, [filteredApps, selectedIds]);

  const toggleSelectAllVisible = useCallback(() => {
    const visibleIds = filteredApps.map((a) => a.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [filteredApps, selectedIds]);

  const renderSkeleton = () => (
    <div className="min-h-full bg-background" dir="rtl">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-xl" />
            <Skeleton className="h-4 w-72 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="h-11 rounded-2xl bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-11 rounded-2xl" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
              <Skeleton className="h-10 w-full rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return renderSkeleton();
  }

  return (
    <div className="min-h-full bg-background" dir="rtl">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">

        {/* 1. Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/40">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Package className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  {t("marketplace.installedApps", "تطبيقاتي وأدواتي المفعلة")}
                </h1>
                <Badge variant="secondary" className="font-bold text-xs px-2.5 py-0.5 rounded-full">
                  {apps.length} {t("marketplace.coreApp", "أداة")}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                إدارة وتشغيل جميع الأنظمة والإضافات المرتبطة بمتجرك ولوحة تحكمك.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchApps(true)}
              disabled={isRefreshing}
              title="تحديث البيانات"
              className="h-10 rounded-xl px-3 text-xs font-semibold gap-1.5"
            >
              <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin text-primary")} />
              <span className="hidden sm:inline">تحديث</span>
            </Button>
            <Link to="/marketplace/history">
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl px-3 text-xs font-semibold gap-1.5 border-border/60 hover:bg-muted"
                title="سجل حركات وتثبيت التطبيقات (من قام بالتثبيت أو الإلغاء)"
              >
                <History className="size-3.5 text-primary" />
                <span>سجل التطبيقات</span>
              </Button>
            </Link>
            <Link to="/marketplace/downloads" className="hidden sm:inline-flex">
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl px-3 text-xs font-semibold gap-1.5 border-border/60 hover:bg-muted"
                title="تحميل تطبيقات الأجهزة والموبايل"
              >
                <Download className="size-3.5 text-primary" />
                <span>تحميل التطبيقات</span>
              </Button>
            </Link>
            <Link to="/marketplace" className="flex-1 sm:flex-initial">
              <Button size="sm" className="w-full sm:w-auto h-10 rounded-xl px-4 text-xs font-bold gap-2 shadow-sm">
                <Store className="size-4" />
                <span>تصفح متجر التطبيقات</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 2. Recommended Specialty Hub Callout (if company has specialty) */}
        {recommendedHub && (
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-primary/20 bg-primary/[0.03] text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="font-bold text-foreground">
                  منظومة مخصصة لنشاط حسابك: <span className="text-primary">{user?.company?.businessSpecialty?.nameAr || recommendedHub.nameAr}</span>
                </p>
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {recommendedHub.descriptionAr}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedHub(selectedHub === recommendedHub.id ? "ALL" : recommendedHub.id);
                setCategoryFilter("ALL");
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-xl font-bold shrink-0 transition-colors text-xs",
                selectedHub === recommendedHub.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-background border border-border/40 hover:border-primary/40 text-foreground"
              )}
            >
              {selectedHub === recommendedHub.id ? "معروضة حالياً ✓" : `عرض أدوات ${recommendedHub.nameAr}`}
            </button>
          </div>
        )}

        {/* 3. Quick Stats KPI Bar (Interactive Filter Triggers) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div
            onClick={() => setStatusFilter("ALL")}
            className={cn(
              "rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer select-none",
              statusFilter === "ALL"
                ? "border-primary/50 bg-primary/[0.04] ring-1 ring-primary/20 shadow-sm"
                : "border-border/40 bg-card/60 hover:bg-card hover:border-border/70"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">إجمالي الأدوات</span>
              <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Package className="size-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-foreground">{stats.total}</span>
              <span className="text-[11px] text-muted-foreground font-medium">أداة مثبتة</span>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === "ACTIVE" ? "ALL" : "ACTIVE")}
            className={cn(
              "rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer select-none",
              statusFilter === "ACTIVE"
                ? "border-emerald-500/50 bg-emerald-500/[0.04] ring-1 ring-emerald-500/20 shadow-sm"
                : "border-border/40 bg-card/60 hover:bg-card hover:border-border/70"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">الاشتراكات النشطة</span>
              <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats.active}</span>
              <span className="text-[11px] text-muted-foreground font-medium">اشتراك فعال</span>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === "TRIAL" ? "ALL" : "TRIAL")}
            className={cn(
              "rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer select-none",
              statusFilter === "TRIAL"
                ? "border-amber-500/50 bg-amber-500/[0.04] ring-1 ring-amber-500/20 shadow-sm"
                : "border-border/40 bg-card/60 hover:bg-card hover:border-border/70"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">فترات تجريبية</span>
              <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Clock className="size-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{stats.trial}</span>
              {stats.expiringSoon > 0 ? (
                <span className="text-[11px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md">
                  {stats.expiringSoon} تنتهي قريباً
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground font-medium">تجربة مجانية</span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card/60 p-3.5 sm:p-4 transition-all hover:bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">استهلاك الشهر</span>
              <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Activity className="size-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-foreground">
                {stats.monthlyTotalCost.toFixed(2)}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">ج.م استهلاك</span>
            </div>
          </div>
        </div>

        {/* 4. System Hubs Switcher (Multi-System Solution Selector) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 border-b border-border/20">
          {SYSTEM_HUBS.map((hub) => {
            const HubIcon = hub.icon;
            const active = selectedHub === hub.id;
            const isRecommended = recommendedHub?.id === hub.id;
            const count = hubCounts[hub.id] ?? 0;

            return (
              <button
                key={hub.id}
                type="button"
                onClick={() => {
                  setSelectedHub(hub.id);
                  setCategoryFilter("ALL");
                }}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0",
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30"
                )}
              >
                <HubIcon size={14} className={active ? "text-background" : "text-primary"} />
                <span>{hub.nameAr}</span>
                <span
                  className={cn(
                    "text-[10px] tabular-nums px-1.5 py-0.2 rounded-full",
                    active ? "bg-background/20 text-background font-semibold" : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
                {isRecommended && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    موصى به
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 5. Search, Status Segmented Controls, Sort & View Mode */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم، الفئة، أو الوصف..."
              className="h-10 pr-10 pl-10 rounded-xl bg-card border-border/40 text-xs sm:text-sm focus-visible:ring-primary/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status Segmented Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-muted/50 border border-border/30 shrink-0 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                statusFilter === "ALL" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              الكل ({apps.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ACTIVE")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1",
                statusFilter === "ACTIVE" ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CheckCircle2 size={12} />
              النشطة ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("TRIAL")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1",
                statusFilter === "TRIAL" ? "bg-background text-amber-600 dark:text-amber-400 shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock size={12} />
              تجريبية ({stats.trial})
            </button>
            {apps.some((a) => a.status === "CANCELLED") && (
              <button
                type="button"
                onClick={() => setStatusFilter("CANCELLED")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all",
                  statusFilter === "CANCELLED" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                ملغاة ({apps.filter((a) => a.status === "CANCELLED").length})
              </button>
            )}
            {apps.some((a) => a.status === "EXPIRED") && (
              <button
                type="button"
                onClick={() => setStatusFilter("EXPIRED")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all",
                  statusFilter === "EXPIRED" ? "bg-background text-destructive shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                منتهية ({apps.filter((a) => a.status === "EXPIRED").length})
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/40 bg-card text-xs font-bold text-muted-foreground shrink-0">
            <ArrowUpDown size={13} className="text-muted-foreground shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-foreground font-semibold focus:outline-none cursor-pointer"
            >
              <option value="newest">الأحدث تثبيتاً</option>
              <option value="name">أبجدياً (أ-ي)</option>
              <option value="usage">الأعلى استهلاكاً</option>
              <option value="trial_ending">أقرب لانتهاء التجربة</option>
            </select>
          </div>

          {/* View Mode Switcher */}
          <div className="hidden sm:flex items-center p-1 rounded-xl bg-muted/50 border border-border/30 shrink-0">
            <button
              type="button"
              data-testid="grid-view-btn"
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === "grid" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              title="عرض شبكي (Grid View)"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              data-testid="list-view-btn"
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === "list" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              title="عرض قائمة (List View)"
            >
              <List size={15} />
            </button>
          </div>

          {/* Bulk Select Visible */}
          {filteredApps.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleSelectAllVisible}
              data-testid="select-all-btn"
              className={cn(
                "h-10 rounded-xl text-xs font-bold gap-1.5 px-3 border-border/40 transition-all shrink-0",
                isAllVisibleSelected
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-muted-foreground hover:text-foreground bg-card"
              )}
              title={isAllVisibleSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
            >
              {isAllVisibleSelected ? (
                <CheckSquare size={14} className="text-primary" />
              ) : (
                <Square size={14} />
              )}
              <span className="hidden sm:inline">
                {isAllVisibleSelected ? "إلغاء التحديد" : "تحديد الكل"}
              </span>
            </Button>
          )}
        </div>

        {/* 6. Subcategory Filter Pills */}
        {availableCategories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            <button
              type="button"
              onClick={() => setCategoryFilter("ALL")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0",
                categoryFilter === "ALL"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30"
              )}
            >
              <span>كل الأقسام</span>
              <span
                className={cn(
                  "text-[10px] tabular-nums px-1.5 py-0.2 rounded-full",
                  categoryFilter === "ALL" ? "bg-primary-foreground/20 text-primary-foreground font-semibold" : "bg-muted text-muted-foreground"
                )}
              >
                {selectedHub === "ALL" ? apps.length : hubCounts[selectedHub] ?? 0}
              </span>
            </button>

            {availableCategories.map((cat) => {
              const conf = CATEGORY_CONFIG[cat];
              const label = conf?.labelAr || cat;
              const active = categoryFilter === cat;
              const Icon = categoryIcons[cat] || Package;
              const count = apps.filter((a) => {
                if ((a.app?.category || "").toUpperCase() !== cat) return false;
                if (selectedHub !== "ALL") {
                  const hub = getAppSystemHub(a.app as any);
                  if (hub.id !== selectedHub) return false;
                }
                return true;
              }).length;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(active ? "ALL" : cat)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30"
                  )}
                >
                  <Icon size={13} className="shrink-0" />
                  <span>{label}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        "text-[10px] tabular-nums px-1.5 py-0.2 rounded-full",
                        active ? "bg-primary-foreground/20 text-primary-foreground font-semibold" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* 4. Main Content: Empty States or Grid/List */}
        {apps.length === 0 ? (
          /* Zero Installed Apps Onboarding Showcase */
          <div className="rounded-3xl border border-dashed border-border/80 bg-card/40 p-6 sm:p-10 text-center space-y-6">
            <div className="max-w-md mx-auto space-y-2">
              <div className="size-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <AppWindow size={32} />
              </div>
              <h2 className="text-xl font-black text-foreground">لم يتم تفعيل أي تطبيقات بعد</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                متجرك جاهز للتوسع. قم بتفعيل الأدوات التي تحتاجها لأتمتة الرسائل، وزيادة المبيعات، ومتابعة الطلبات.
              </p>
              <div className="pt-2">
                <Link to="/marketplace">
                  <Button className="rounded-xl font-bold gap-2 px-6">
                    <Store size={16} />
                    <span>تصفح متجر التطبيقات الآن</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* Recommended Starters */}
            <div className="pt-6 border-t border-border/40 text-right">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-primary" />
                <h3 className="text-sm font-black text-foreground">أدوات أساسية موصى بها لبدء النمو:</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {STARTER_APPS.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <div
                      key={item.slug}
                      className="rounded-2xl border border-border/40 bg-card p-4 flex flex-col justify-between text-right hover:border-primary/40 transition-all group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <ItemIcon size={20} />
                          </div>
                          <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/20">
                            {item.badge}
                          </Badge>
                        </div>
                        <h4 className="font-extrabold text-sm text-foreground group-hover:text-primary transition-colors">
                          {item.name}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                      <div className="pt-4">
                        <Link to={`/marketplace/apps/${item.slug}`}>
                          <Button variant="outline" size="sm" className="w-full text-xs font-bold rounded-xl gap-1">
                            <span>استكشاف الأداة</span>
                            <ChevronLeft size={14} />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : filteredApps.length === 0 ? (
          /* Filter/Search Zero Results */
          <div className="text-center py-16 px-4 rounded-3xl border border-border/40 bg-card/30 space-y-3">
            <div className="size-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-2">
              <Search size={24} />
            </div>
            {selectedHub !== "ALL" && (!hubCounts[selectedHub] || hubCounts[selectedHub] === 0) ? (
              <>
                <h3 className="text-base font-bold text-foreground">
                  لم تقم بتفعيل أي أدوات في {SYSTEM_HUBS.find((h) => h.id === selectedHub)?.nameAr} بعد
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  تصفح متجر التطبيقات لاكتشاف الأدوات والأنظمة المخصصة لهذا القطاع وتفعيلها لمتجرك.
                </p>
                <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    className="gap-1.5 rounded-xl font-bold text-xs shadow-sm"
                    onClick={() => navigate(`/marketplace?hub=${selectedHub}`)}
                  >
                    <Store size={14} />
                    <span>استعراض حلول {SYSTEM_HUBS.find((h) => h.id === selectedHub)?.nameAr} في المتجر</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-xl font-bold text-xs"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("ALL");
                      setSelectedHub("ALL");
                      setCategoryFilter("ALL");
                    }}
                  >
                    <span>عرض كل أدواتي</span>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold text-foreground">لا توجد تطبيقات مطابقة لبحثك</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  لم نعثر على أي أدوات مطابقة لمعايير البحث الحالية. جرّب مسح البحث أو تغيير الفلتر.
                </p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-xl font-bold text-xs"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("ALL");
                      setSelectedHub("ALL");
                      setCategoryFilter("ALL");
                    }}
                  >
                    <X size={14} />
                    <span>إعادة تعيين الفلاتر</span>
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View - High-Density SaaS App Tiles */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
            {filteredApps.map((installed) => {
              const statusConf = STATUS_CONFIG[installed.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.ACTIVE;
              const StatusIcon = statusConf.icon;
              const isTrial = installed.status === "TRIAL";
              const trialDays = getDaysRemaining(installed.trialEndsAt);
              const isExpired = installed.status === "EXPIRED" || installed.status === "CANCELLED" || (installed.status === "TRIAL" && trialDays !== null && trialDays < 0);
              const destination = isExpired ? `/marketplace/${installed.app.slug}` : getAppDestination(installed.app);
              const isSelected = selectedIds.has(installed.id);

              const BrandIcon = installed.app.slug ? appIconsBySlug[installed.app.slug] : undefined;
              const appIconKey = installed.app.icon?.trim().toLowerCase();
              const AppIcon = appIconKey ? appIcons[appIconKey] : undefined;
              const Icon = AppIcon || categoryIcons[installed.app.category] || Package;
              const textIcon = shouldUseTextIcon(installed.app.icon) ? installed.app.icon?.trim() : null;
              const systemHub = getAppSystemHub(installed.app as any);
              const SystemIcon = systemHub.icon;

              return (
                <div
                  key={installed.id}
                  onClick={() => navigate(destination)}
                  className={cn(
                    "group relative flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all duration-150 select-none cursor-pointer",
                    "bg-card hover:bg-accent/[0.04] hover:shadow-sm",
                    isSelected
                      ? "border-primary ring-2 ring-primary/20 bg-primary/[0.03]"
                      : installed.status === "ACTIVE"
                      ? "border-emerald-500/25 hover:border-emerald-500/50 bg-emerald-500/[0.015]"
                      : installed.status === "TRIAL"
                      ? "border-amber-500/25 hover:border-amber-500/50 bg-amber-500/[0.015]"
                      : "border-border/40 hover:border-primary/50"
                  )}
                >
                  {/* Right: Checkbox + Icon + Name + System Hub */}
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div
                      onClick={(e) => toggleSelectApp(installed.id, e)}
                      className="cursor-pointer shrink-0 p-1 rounded-md hover:bg-muted/60 transition-colors"
                      title={isSelected ? "إلغاء تحديد الأداة" : "تحديد الأداة"}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectApp(installed.id)}
                        className="size-4 rounded-md cursor-pointer"
                      />
                    </div>

                    <div className="size-11 sm:size-12 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/30 flex items-center justify-center shrink-0 overflow-hidden transition-transform duration-150 group-hover:scale-105">
                      {installed.app.logo && installed.app.logo.startsWith("http") ? (
                        <img src={installed.app.logo} alt={installed.app.name} className="size-full object-cover" loading="lazy" />
                      ) : installed.app.icon && installed.app.icon.startsWith("http") ? (
                        <img src={installed.app.icon} alt={installed.app.name} className="size-full object-cover" loading="lazy" />
                      ) : BrandIcon ? (
                        <BrandIcon className="size-5 sm:size-6 text-foreground" />
                      ) : textIcon ? (
                        <span className="text-base sm:text-lg font-bold">{textIcon}</span>
                      ) : (
                        <Icon size={22} className="text-foreground/80" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 dir="auto" className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate" title={installed.app.name}>
                          {installed.app.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground truncate">
                          <SystemIcon size={11} className="shrink-0 text-primary/70" />
                          <span className="truncate">{systemHub.nameAr}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Left: Status + Pricing/Usage + More Menu */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-end justify-center text-left rtl:text-right gap-1">
                      <Badge
                        variant="outline"
                        className={cn("gap-1 text-[10px] font-bold px-2 py-0.5 shrink-0", statusConf.badgeClass)}
                      >
                        <StatusIcon size={10} />
                        <span>
                          {isTrial && trialDays !== null
                            ? (trialDays === 0 ? "تنتهي اليوم" : trialDays === 1 ? "متبقي يوم" : `متبقي ${trialDays} أيام`)
                            : t(`marketplace.${statusConf.labelKey}`, statusConf.fallbackLabel)}
                        </span>
                      </Badge>

                      <span className="text-xs font-bold text-foreground/80 tabular-nums">
                        {installed.monthlyUsage && Number(installed.monthlyUsage.totalCost) > 0
                          ? `${Number(installed.monthlyUsage.totalCost).toFixed(2)} ج.م`
                          : installed.activePricingModel === "FREE"
                          ? "مجاني"
                          : installed.activePricingModel === "PAY_PER_USE"
                          ? "حسب الاستخدام"
                          : "شهري"}
                      </span>
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="size-8 rounded-xl text-muted-foreground hover:text-foreground inline-flex items-center justify-center hover:bg-muted/80 transition-colors cursor-pointer border border-transparent hover:border-border/50"
                        >
                          <MoreVertical size={15} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl text-right" dir="rtl">
                          <DropdownMenuLabel className="text-xs font-bold text-muted-foreground truncate">
                            {installed.app.name}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-xs font-semibold"
                            onClick={() => navigate(destination)}
                          >
                            {isExpired ? <Sparkles size={14} className="text-amber-500" /> : <Zap size={14} className="text-primary" />}
                            <span>{isExpired ? "تجديد الاشتراك" : "فتح التطبيق"}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-xs font-semibold"
                            onClick={() => navigate(`/my-apps/${installed.app.slug}/settings`)}
                          >
                            <Settings2 size={14} />
                            <span>إعدادات الأداة</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-xs font-semibold"
                            onClick={() => setSelectedAppForDrawer(installed)}
                          >
                            <Activity size={14} />
                            <span>تفاصيل وسجل الاستهلاك</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-xs font-semibold"
                            onClick={() => navigate(`/marketplace/apps/${installed.app.slug}`)}
                          >
                            <ExternalLink size={14} />
                            <span>عرض في المتجر</span>
                          </DropdownMenuItem>
                          {installed.status === "TRIAL" && (
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer text-xs font-semibold text-primary"
                              onClick={() => navigate(`/my-apps/${installed.app.slug}/upgrade`)}
                            >
                              <Sparkles size={14} />
                              <span>ترقية الاشتراك</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-xs font-semibold text-destructive focus:text-destructive"
                            onClick={() => setConfirmUninstall(installed)}
                            disabled={uninstallingId === installed.id}
                          >
                            <X size={14} />
                            <span>إلغاء التفعيل</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View - High-Density Rows */
          <div className="rounded-2xl border border-border/30 bg-card overflow-hidden divide-y divide-border/20">
            {filteredApps.map((installed) => {
              const statusConf = STATUS_CONFIG[installed.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.ACTIVE;
              const StatusIcon = statusConf.icon;
              const isTrial = installed.status === "TRIAL";
              const trialDays = getDaysRemaining(installed.trialEndsAt);
              const isExpired = installed.status === "EXPIRED" || installed.status === "CANCELLED" || (installed.status === "TRIAL" && trialDays !== null && trialDays < 0);
              const destination = isExpired ? `/marketplace/${installed.app.slug}` : getAppDestination(installed.app);
              const isSelected = selectedIds.has(installed.id);

              const BrandIcon = installed.app.slug ? appIconsBySlug[installed.app.slug] : undefined;
              const appIconKey = installed.app.icon?.trim().toLowerCase();
              const AppIcon = appIconKey ? appIcons[appIconKey] : undefined;
              const Icon = AppIcon || categoryIcons[installed.app.category] || Package;
              const textIcon = shouldUseTextIcon(installed.app.icon) ? installed.app.icon?.trim() : null;
              const systemHub = getAppSystemHub(installed.app as any);
              const SystemIcon = systemHub.icon;

              return (
                <div
                  key={installed.id}
                  onClick={() => navigate(destination)}
                  className={cn(
                    "p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors select-none cursor-pointer",
                    isSelected ? "bg-primary/[0.04] hover:bg-primary/[0.07]" : "hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      onClick={(e) => toggleSelectApp(installed.id, e)}
                      className="cursor-pointer shrink-0 p-1 rounded-md hover:bg-muted/50 transition-colors"
                      title={isSelected ? "إلغاء تحديد الأداة" : "تحديد الأداة"}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectApp(installed.id)}
                        className="size-4 rounded-md cursor-pointer"
                      />
                    </div>
                    <div className="size-10 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/30 flex items-center justify-center shrink-0 overflow-hidden">
                      {installed.app.logo && installed.app.logo.startsWith("http") ? (
                        <img src={installed.app.logo} alt={installed.app.name} className="size-full object-cover" loading="lazy" />
                      ) : installed.app.icon && installed.app.icon.startsWith("http") ? (
                        <img src={installed.app.icon} alt={installed.app.name} className="size-full object-cover" loading="lazy" />
                      ) : BrandIcon ? (
                        <BrandIcon className="size-5 text-foreground" />
                      ) : textIcon ? (
                        <span className="text-sm font-bold">{textIcon}</span>
                      ) : (
                        <Icon size={18} className="text-foreground/80" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-foreground truncate group-hover:text-primary">{installed.app.name}</h4>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                          <SystemIcon size={10} className="text-primary/70" />
                          <span>{systemHub.nameAr}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/20">
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-muted-foreground">
                      <Badge
                        variant="outline"
                        className={cn("gap-1 text-[10px] font-bold px-1.5 py-0.5", statusConf.badgeClass)}
                      >
                        <StatusIcon size={9} />
                        <span>{t(`marketplace.${statusConf.labelKey}`, statusConf.fallbackLabel)}</span>
                      </Badge>

                      <span className="text-xs font-bold text-foreground/80 tabular-nums">
                        {installed.monthlyUsage && Number(installed.monthlyUsage.totalCost) > 0
                          ? `${Number(installed.monthlyUsage.totalCost).toFixed(2)} ج.م`
                          : installed.activePricingModel === "FREE"
                          ? "مجاني"
                          : installed.activePricingModel === "PAY_PER_USE"
                          ? "حسب الاستخدام"
                          : "شهري"}
                      </span>

                      {isTrial && trialDays !== null && (
                        <span className={cn("text-[11px] font-bold", trialDays <= 3 ? "text-destructive" : "text-amber-600")}>
                          {trialDays <= 3 ? `باقي ${trialDays}ي` : `تجربة (${trialDays}ي)`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant={isExpired ? "outline" : "default"}
                        className={cn("h-8 rounded-xl text-xs font-bold gap-1 px-3", isExpired && "border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10")}
                        onClick={() => navigate(destination)}
                      >
                        {isExpired ? <Sparkles size={13} /> : <ArrowUpRight size={13} />}
                        <span>{isExpired ? "تجديد" : "فتح"}</span>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground inline-flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
                        >
                          <MoreVertical size={14} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl text-right" dir="rtl">
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-xs font-semibold"
                            onClick={() => navigate(destination)}
                          >
                            {isExpired ? <Sparkles size={14} className="text-amber-500" /> : <Zap size={14} className="text-primary" />}
                            <span>{isExpired ? "تجديد الاشتراك" : "فتح التطبيق"}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-xs font-semibold"
                            onClick={() => navigate(`/my-apps/${installed.app.slug}/settings`)}
                          >
                            <Settings2 size={14} />
                            <span>إعدادات الأداة</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-xs font-semibold"
                            onClick={() => setSelectedAppForDrawer(installed)}
                          >
                            <Activity size={14} />
                            <span>تفاصيل وسجل الاستهلاك</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-xs font-semibold"
                            onClick={() => navigate(`/marketplace/apps/${installed.app.slug}`)}
                          >
                            <ExternalLink size={14} />
                            <span>عرض في المتجر</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-xs font-semibold text-destructive focus:text-destructive"
                            onClick={() => setConfirmUninstall(installed)}
                          >
                            <X size={14} />
                            <span>إلغاء التفعيل</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* App Details & Usage Drawer / Sheet */}
      <Sheet open={!!selectedAppForDrawer} onOpenChange={(open) => !open && setSelectedAppForDrawer(null)}>
        <SheetContent side="left" className="w-full sm:max-w-lg p-0 overflow-y-auto" dir="rtl">
          {selectedAppForDrawer && (
            <div className="p-6 space-y-6">
              <SheetHeader className="text-right space-y-3">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                    {selectedAppForDrawer.app.icon && selectedAppForDrawer.app.icon.startsWith("http") ? (
                      <img src={selectedAppForDrawer.app.icon} alt="" className="size-7 object-contain rounded" />
                    ) : (
                      <Package className="size-6" />
                    )}
                  </div>
                  <div>
                    <SheetTitle className="text-lg font-black text-foreground">
                      {selectedAppForDrawer.app.name}
                    </SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground">
                      {selectedAppForDrawer.app.category} • مسار التشغيل: {getAppDestination(selectedAppForDrawer.app)}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {/* Overview & Pricing */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-right">
                  <span className="text-[11px] font-semibold text-muted-foreground block">نموذج التسعير</span>
                  <span className="text-sm font-bold text-foreground">
                    {selectedAppForDrawer.activePricingModel === "FREE"
                      ? "مجاني"
                      : selectedAppForDrawer.activePricingModel === "PAY_PER_USE"
                      ? "حسب الاستهلاك"
                      : "اشتراك شهري"}
                  </span>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-right">
                  <span className="text-[11px] font-semibold text-muted-foreground block">تاريخ التفعيل</span>
                  <span className="text-sm font-bold text-foreground">
                    {new Date(selectedAppForDrawer.createdAt).toLocaleDateString("ar-EG")}
                  </span>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-right">
                  <span className="text-[11px] font-semibold text-muted-foreground block">استهلاك هذا الشهر</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {Number(selectedAppForDrawer.monthlyUsage?.totalCost || 0).toFixed(2)} ج.م
                  </span>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-right">
                  <span className="text-[11px] font-semibold text-muted-foreground block">حالة التطبيق</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedAppForDrawer.status === "ACTIVE"
                      ? "نشط"
                      : selectedAppForDrawer.status === "TRIAL"
                      ? "فترة تجريبية"
                      : "متوقف"}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 text-right">
                <h4 className="text-xs font-bold text-foreground">عن الأداة</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {selectedAppForDrawer.app.description}
                </p>
              </div>

              {/* Usage Logs */}
              <div className="space-y-2 text-right">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground">آخر سجلات الاستهلاك</h4>
                  <span className="text-[10px] text-muted-foreground font-medium">آخر 10 عمليات</span>
                </div>

                {selectedAppForDrawer.usageLogs && selectedAppForDrawer.usageLogs.length > 0 ? (
                  <div className="rounded-xl border border-border/40 overflow-hidden divide-y divide-border/20 text-xs">
                    {selectedAppForDrawer.usageLogs.map((log) => (
                      <div key={log.id} className="p-2.5 flex items-center justify-between hover:bg-muted/20">
                        <div>
                          <span className="font-semibold text-foreground block">{log.feature || "عملية نظام"}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString("ar-EG")}
                          </span>
                        </div>
                        <div className="text-left font-bold text-blue-600 dark:text-blue-400">
                          {Number(log.totalCost).toFixed(2)} ج.م
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                    لا توجد عمليات استهلاك مسجلة مؤخراً لهذه الأداة.
                  </div>
                )}
              </div>

              {/* Drawer Action Buttons */}
              <div className="pt-4 border-t border-border/40 space-y-2">
                <Button
                  className="w-full rounded-xl font-bold gap-2"
                  onClick={() => {
                    const dest = getAppDestination(selectedAppForDrawer.app);
                    setSelectedAppForDrawer(null);
                    navigate(dest);
                  }}
                >
                  <ArrowUpRight size={16} />
                  <span>فتح وتشغيل الأداة</span>
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl text-xs font-semibold gap-1.5"
                    onClick={() => {
                      const slug = selectedAppForDrawer.app.slug;
                      setSelectedAppForDrawer(null);
                      navigate(`/my-apps/${slug}/settings`);
                    }}
                  >
                    <Settings2 size={14} />
                    <span>الإعدادات</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl text-xs font-semibold gap-1.5 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      const app = selectedAppForDrawer;
                      setSelectedAppForDrawer(null);
                      setConfirmUninstall(app);
                    }}
                  >
                    <X size={14} />
                    <span>إلغاء التفعيل</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog for Uninstall */}
      <AlertDialog open={!!confirmUninstall} onOpenChange={() => setConfirmUninstall(null)}>
        <AlertDialogContent className="rounded-2xl text-right" dir="rtl">
          <AlertDialogHeader>
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle size={28} className="text-destructive" />
            </div>
            <AlertDialogTitle className="text-center font-black">
              {t("marketplace.deactivateTitle", {
                name: confirmUninstall?.app.name || "",
                defaultValue: `إلغاء تفعيل ${confirmUninstall?.app.name || ""}`,
              })}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {t("marketplace.deactivateConfirm", "هل أنت متأكد من رغبتك في إلغاء تفعيل هذه الأداة؟")}<br />
              {t("marketplace.deactivateWarning", "قد تتوقف الميزات والربط المرتبط بها حتى تعيد تفعيلها مرة أخرى.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-3 flex-row justify-center">
            <AlertDialogCancel className="rounded-xl font-semibold text-xs flex-1">
              {t("marketplace.cancel", "إلغاء")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUninstall}
              className="rounded-xl bg-destructive hover:bg-destructive/90 font-bold text-xs flex-1"
            >
              {t("marketplace.confirmDeactivation", "تأكيد إلغاء التفعيل")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div
          data-testid="bulk-actions-bar"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-card/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl p-3 px-4 sm:px-5 flex items-center gap-2.5 sm:gap-4 max-w-[95vw] sm:max-w-2xl animate-in fade-in slide-in-from-bottom-5"
          dir="rtl"
        >
          <div className="flex items-center gap-2 shrink-0">
            <Badge className="bg-primary text-primary-foreground font-black px-2.5 py-1 text-xs rounded-lg">
              {selectedIds.size}
            </Badge>
            <span className="text-xs font-bold text-foreground hidden sm:inline">أدوات محددة</span>
          </div>

          <div className="h-4 w-px bg-border/80 hidden sm:block shrink-0" />

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-xl text-xs font-bold gap-1.5 px-3"
              onClick={handleExportSelected}
              data-testid="bulk-export-btn"
            >
              <Download size={13} />
              <span>تصدير CSV</span>
            </Button>

            <Button
              size="sm"
              variant="destructive"
              className="h-8 rounded-xl text-xs font-bold gap-1.5 px-3 bg-destructive hover:bg-destructive/90"
              onClick={() => setConfirmBulkUninstall(true)}
              data-testid="bulk-uninstall-btn"
            >
              <Trash2 size={13} />
              <span>إلغاء التفعيل للمحددة</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-xl text-xs text-muted-foreground hover:text-foreground px-2"
              onClick={clearSelection}
              data-testid="bulk-clear-btn"
            >
              <X size={13} />
              <span className="hidden sm:inline">إلغاء التحديد</span>
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Bulk Uninstall */}
      <AlertDialog open={confirmBulkUninstall} onOpenChange={setConfirmBulkUninstall}>
        <AlertDialogContent className="rounded-2xl text-right max-w-md" dir="rtl">
          <AlertDialogHeader>
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 size={28} className="text-destructive" />
            </div>
            <AlertDialogTitle className="text-center font-black text-base sm:text-lg">
              إلغاء تفعيل {selectedIds.size} أداة دفعة واحدة؟
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-xs text-muted-foreground leading-relaxed">
              سيتم إيقاف التطبيقات المحددة وإلغاء تفعيلها من متجرك. يمكنك دائماً إعادة تفعيلها من المتجر في أي وقت.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-44 overflow-y-auto rounded-xl bg-muted/40 p-2.5 space-y-1.5 text-xs">
            {apps
              .filter((a) => selectedIds.has(a.id))
              .map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-muted-foreground font-semibold px-2.5 py-1.5 bg-card rounded-lg border border-border/30"
                >
                  <span className="text-foreground font-bold">{a.app.name}</span>
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {a.app.category || "عام"}
                  </Badge>
                </div>
              ))}
          </div>

          <AlertDialogFooter className="gap-2 sm:gap-3 flex-row justify-center pt-2">
            <AlertDialogCancel className="rounded-xl font-semibold text-xs flex-1" disabled={isBulkDeleting}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkUninstall}
              disabled={isBulkDeleting}
              className="rounded-xl bg-destructive hover:bg-destructive/90 font-bold text-xs flex-1 gap-1.5"
            >
              {isBulkDeleting && <Loader2 size={13} className="animate-spin" />}
              <span>تأكيد الإلغاء الجماعي</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MyApps;
