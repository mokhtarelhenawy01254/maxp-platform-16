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
  Download, Trash2, CheckSquare, Square
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  "booking-app": "/appointments",
  "notification-automation": "/notifications/settings",
  "executable-mindmap": "/mindmap",
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
} as const;

type StatusFilter = "ALL" | "ACTIVE" | "TRIAL" | "CANCELLED";
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
  const { refreshUser } = useAuth();

  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
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

  // Extract categories dynamically
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    apps.forEach((a) => {
      if (a.app?.category) cats.add(a.app.category.toUpperCase());
    });
    return Array.from(cats);
  }, [apps]);

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
        if (categoryFilter !== "ALL" && a.app?.category?.toUpperCase() !== categoryFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const name = (a.app?.name || "").toLowerCase();
          const nameEn = (a.app?.nameEn || "").toLowerCase();
          const desc = (a.app?.description || "").toLowerCase();
          const slug = (a.app?.slug || "").toLowerCase();
          if (!name.includes(q) && !nameEn.includes(q) && !desc.includes(q) && !slug.includes(q)) {
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
  }, [apps, statusFilter, categoryFilter, search, sortBy]);

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
    <div className="min-h-full bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/20 bg-card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-11 rounded-2xl" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
              <Skeleton className="h-10 w-full rounded" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-9 flex-1 rounded-xl" />
                <Skeleton className="h-9 w-9 rounded-xl" />
              </div>
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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">

        {/* 1. Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
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
            <Link to="/marketplace" className="flex-1 sm:flex-initial">
              <Button size="sm" className="w-full sm:w-auto h-10 rounded-xl px-4 text-xs font-bold gap-2 shadow-sm">
                <Store className="size-4" />
                <span>تصفح متجر التطبيقات</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 2. Quick Stats KPI Bar (Mobile-first single depth) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-border/40 bg-card/60 p-4 transition-all hover:bg-card">
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

          <div className="rounded-2xl border border-border/40 bg-card/60 p-4 transition-all hover:bg-card">
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

          <div className="rounded-2xl border border-border/40 bg-card/60 p-4 transition-all hover:bg-card">
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

          <div className="rounded-2xl border border-border/40 bg-card/60 p-4 transition-all hover:bg-card">
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

        {/* 3. Search & Control Toolbar */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم، الفئة، أو الوصف..."
                className="h-11 pr-10 pl-10 rounded-2xl bg-card/60 border-border/50 text-xs sm:text-sm focus-visible:ring-primary/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort & View Mode */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-border/50 bg-card/60 text-xs font-bold text-muted-foreground">
                <ArrowUpDown size={14} className="text-muted-foreground shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-foreground font-semibold focus:outline-none cursor-pointer py-1"
                >
                  <option value="newest">الأحدث تثبيتاً</option>
                  <option value="name">أبجدياً (أ-ي)</option>
                  <option value="usage">الأعلى استهلاكاً</option>
                  <option value="trial_ending">أقرب لانتهاء التجربة</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center rounded-2xl border border-border/50 bg-card/60 p-1">
                <button
                  type="button"
                  data-testid="grid-view-btn"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-1.5 rounded-xl transition-all",
                    viewMode === "grid" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="عرض الشبكة"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  data-testid="list-view-btn"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-1.5 rounded-xl transition-all",
                    viewMode === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="عرض القائمة"
                >
                  <List size={16} />
                </button>
              </div>

              {/* Select All Visible */}
              {filteredApps.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAllVisible}
                  data-testid="select-all-btn"
                  className={cn(
                    "h-9 rounded-2xl text-xs font-bold gap-1.5 px-3 border-border/50 transition-all",
                    isAllVisibleSelected
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "text-muted-foreground hover:text-foreground"
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
          </div>

          {/* Status & Category Pills (Horizontal Scroll on Mobile) */}
          <div className="flex flex-col gap-2">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {(["ALL", "ACTIVE", "TRIAL", "CANCELLED"] as StatusFilter[]).map((status) => {
                const count =
                  status === "ALL"
                    ? apps.length
                    : apps.filter((a) => a.status === status).length;
                const active = statusFilter === status;
                const conf = status !== "ALL" ? STATUS_CONFIG[status] : null;

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0",
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card/60 border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                  >
                    <span>
                      {status === "ALL"
                        ? "جميع الحالات"
                        : conf
                        ? t(`marketplace.${conf.labelKey}`, conf.fallbackLabel)
                        : status}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-extrabold",
                        active ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Category Filter Pills (if multiple categories exist) */}
            {availableCategories.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setCategoryFilter("ALL")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0",
                    categoryFilter === "ALL"
                      ? "bg-foreground text-background"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  جميع الفئات
                </button>
                {availableCategories.map((cat) => {
                  const conf = CATEGORY_CONFIG[cat];
                  const label = conf?.labelAr || cat;
                  const active = categoryFilter === cat;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={cn(
                        "flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0",
                        active
                          ? "bg-foreground text-background"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

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
                  setCategoryFilter("ALL");
                }}
              >
                <X size={14} />
                <span>إعادة تعيين الفلاتر</span>
              </Button>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredApps.map((installed) => {
              const statusConf = STATUS_CONFIG[installed.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.ACTIVE;
              const StatusIcon = statusConf.icon;
              const isTrial = installed.status === "TRIAL";
              const trialDays = getDaysRemaining(installed.trialEndsAt);
              const destination = getAppDestination(installed.app);
              const catConf = CATEGORY_CONFIG[installed.app.category?.toUpperCase() || ""];
              const isSelected = selectedIds.has(installed.id);

              return (
                <div
                  key={installed.id}
                  className={cn(
                    "group relative rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden",
                    isSelected
                      ? "border-primary ring-2 ring-primary/20 bg-primary/[0.03] shadow-md"
                      : "border-border/30 bg-card hover:shadow-md hover:border-border/60"
                  )}
                >
                  {/* Status Indicator Bar */}
                  <div className={cn("h-1 w-full shrink-0", statusConf.barClass)} />

                  <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
                    {/* Header */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            onClick={(e) => toggleSelectApp(installed.id, e)}
                            className="cursor-pointer shrink-0 p-0.5 rounded hover:bg-muted/50 transition-colors"
                            title={isSelected ? "إلغاء تحديد الأداة" : "تحديد الأداة"}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectApp(installed.id)}
                              className="size-4 rounded-md cursor-pointer"
                            />
                          </div>
                          <div className={cn("size-11 rounded-2xl flex items-center justify-center shrink-0 border border-border/30 bg-muted/30 overflow-hidden")}>
                            {installed.app.icon && installed.app.icon.startsWith("http") ? (
                              <img src={installed.app.icon} alt="" className="size-7 object-contain rounded" />
                            ) : installed.app.logo && installed.app.logo.startsWith("http") ? (
                              <img src={installed.app.logo} alt="" className="size-7 object-contain rounded" />
                            ) : (
                              <Package className="size-5 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-black text-foreground truncate group-hover:text-primary transition-colors">
                              {installed.app.name}
                            </h3>
                            {catConf && (
                              <span className="text-[10px] font-semibold text-muted-foreground block truncate">
                                {catConf.labelAr}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <Badge
                          variant="outline"
                          className={cn("gap-1 text-[10px] font-bold px-2 py-0.5 shrink-0", statusConf.badgeClass)}
                        >
                          <StatusIcon size={10} />
                          <span>{t(`marketplace.${statusConf.labelKey}`, statusConf.fallbackLabel)}</span>
                        </Badge>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[2.5rem]">
                        {installed.app.description || "لا يوجد وصف متاح لهذا التطبيق."}
                      </p>
                    </div>

                    {/* Metadata & Tags */}
                    <div className="space-y-2 pt-2 border-t border-border/30">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted/60 rounded-md px-2 py-0.5">
                          <CreditCard size={10} />
                          <span>
                            {installed.activePricingModel === "FREE"
                              ? "مجاني"
                              : installed.activePricingModel === "PAY_PER_USE"
                              ? "حسب الاستخدام"
                              : "شهري"}
                          </span>
                        </span>

                        {installed.monthlyUsage && Number(installed.monthlyUsage.totalCost) > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 rounded-md px-2 py-0.5">
                            <Activity size={10} />
                            <span>{Number(installed.monthlyUsage.totalCost).toFixed(2)} ج.م</span>
                          </span>
                        )}

                        {isTrial && trialDays !== null && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-bold rounded-md px-2 py-0.5",
                              trialDays <= 3
                                ? "bg-destructive/10 text-destructive"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            )}
                          >
                            <Clock size={10} />
                            <span>
                              {trialDays === 0
                                ? "تنتهي اليوم"
                                : trialDays === 1
                                ? "متبقي يوم"
                                : trialDays === 2
                                ? "متبقي يومان"
                                : `متبقي ${trialDays} أيام`}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <Button
                          size="sm"
                          className="flex-1 h-9 rounded-xl text-xs font-bold gap-1.5"
                          onClick={() => navigate(destination)}
                        >
                          <ArrowUpRight size={14} />
                          <span>تشغيل الأداة</span>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="size-9 p-0 rounded-xl shrink-0 text-muted-foreground hover:text-foreground inline-flex items-center justify-center border border-border bg-background hover:bg-muted transition-colors cursor-pointer"
                          >
                            <MoreVertical size={15} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48 rounded-xl text-right">
                            <DropdownMenuLabel className="text-xs font-bold text-muted-foreground">
                              خيارات {installed.app.name}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer text-xs font-semibold"
                              onClick={() => navigate(destination)}
                            >
                              <Zap size={14} className="text-primary" />
                              <span>فتح التطبيق</span>
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
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="rounded-2xl border border-border/30 bg-card overflow-hidden divide-y divide-border/20">
            {filteredApps.map((installed) => {
              const statusConf = STATUS_CONFIG[installed.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.ACTIVE;
              const StatusIcon = statusConf.icon;
              const isTrial = installed.status === "TRIAL";
              const trialDays = getDaysRemaining(installed.trialEndsAt);
              const destination = getAppDestination(installed.app);
              const catConf = CATEGORY_CONFIG[installed.app.category?.toUpperCase() || ""];
              const isSelected = selectedIds.has(installed.id);

              return (
                <div
                  key={installed.id}
                  className={cn(
                    "p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors",
                    isSelected ? "bg-primary/[0.04] hover:bg-primary/[0.07]" : "hover:bg-muted/20"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      onClick={(e) => toggleSelectApp(installed.id, e)}
                      className="cursor-pointer shrink-0 p-0.5 rounded hover:bg-muted/50 transition-colors"
                      title={isSelected ? "إلغاء تحديد الأداة" : "تحديد الأداة"}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectApp(installed.id)}
                        className="size-4 rounded-md cursor-pointer"
                      />
                    </div>
                    <div className="size-10 rounded-xl bg-muted/40 border border-border/30 flex items-center justify-center shrink-0">
                      {installed.app.icon && installed.app.icon.startsWith("http") ? (
                        <img src={installed.app.icon} alt="" className="size-6 object-contain rounded" />
                      ) : (
                        <Package className="size-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-sm text-foreground truncate">{installed.app.name}</h4>
                        <Badge
                          variant="outline"
                          className={cn("gap-1 text-[10px] font-bold px-1.5 py-0.2", statusConf.badgeClass)}
                        >
                          <StatusIcon size={9} />
                          <span>{t(`marketplace.${statusConf.labelKey}`, statusConf.fallbackLabel)}</span>
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate max-w-xl">
                        {installed.app.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/20">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      {catConf && (
                        <span className="hidden md:inline-block bg-muted/60 px-2 py-0.5 rounded text-[11px]">
                          {catConf.labelAr}
                        </span>
                      )}
                      {installed.monthlyUsage && Number(installed.monthlyUsage.totalCost) > 0 && (
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          {Number(installed.monthlyUsage.totalCost).toFixed(2)} ج.م
                        </span>
                      )}
                      {isTrial && trialDays !== null && (
                        <span className={cn("text-[11px] font-bold", trialDays <= 3 ? "text-destructive" : "text-amber-600")}>
                          {trialDays <= 3 ? `باقي ${trialDays}ي` : `تجربة (${trialDays}ي)`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        className="h-8 rounded-xl text-xs font-bold gap-1 px-3"
                        onClick={() => navigate(destination)}
                      >
                        <ArrowUpRight size={13} />
                        <span>فتح</span>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground inline-flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
                        >
                          <MoreVertical size={14} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 rounded-xl text-right">
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-xs font-semibold"
                            onClick={() => navigate(destination)}
                          >
                            <Zap size={14} className="text-primary" />
                            <span>فتح التطبيق</span>
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
