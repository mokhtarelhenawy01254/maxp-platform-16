import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  ExternalLink,
  Facebook,
  HeartPulse,
  Home,
  KeyRound,
  Loader2,
  MessageSquare,
  Package,
  Percent,
  Receipt,
  RefreshCw,
  AlertOctagon,
  Sparkles,
  Store,
  Ticket,
  Timer,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "../../lib/utils";
import i18n from "../../i18n";
import { businessSpecialtyService, type BusinessSpecialty } from "../../services/businessSpecialtyService";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button, buttonVariants } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { Switch } from "../../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  CompanyHeroCard, StatusBadge, MiniStat, MetricCard, FormField, ResponsiveOverlay, ModalFooter,
  CompanyBillingSection, CompanyTeamSection, CompanyWalletSection,
  CompanyLimitsSection, CompanyUsageSection,
  CompanyActivationCenter, CompanyPulse, CompanySupportTickets, CompanyRecentActivity,
  SectionShell, UsageBar,
} from "./company-details";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatRelativeDateLabel,
  getCompanyPlanUsagePercentage,
  getCount,
  getDaysUntil,
  getRoleLabel,
  getStatusMeta,
  getUnifiedUsersCount,
  isSystemAccount,
  isUserDormant,
} from "./company-details/helpers";
import { useCompanyDetails } from "./company-details/useCompanyDetails";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";

const CURRENCY_OPTIONS = [
  { value: "EGP", label: "جنيه مصري" },
  { value: "USD", label: "دولار أمريكي" },
  { value: "EUR", label: "يورو" },
];
const CURRENCY_ITEMS: Record<string, string> = Object.fromEntries(
  CURRENCY_OPTIONS.map((o) => [o.value, o.label]),
);

const EMPLOYEE_ROLE_OPTIONS = [
  { value: "COMPANY_ADMIN", label: "مدير شركة" },
  { value: "MANAGER", label: "مدير" },
  { value: "AGENT", label: "موظف" },
];
const EMPLOYEE_ROLE_ITEMS: Record<string, string> = Object.fromEntries(
  EMPLOYEE_ROLE_OPTIONS.map((o) => [o.value, o.label]),
);

const SuperAdminCompanyDetails = () => {
  const {
    navigate, isMobile, company, loading, error, review, reviewCurrency, limitEntries,
    reviewAlerts, ownerUser, nextBillingDate,
    refreshCompanyWorkspace, refreshing, openTopUpModal, openEditModal, handleLoginAsAdmin,
    impersonating, statusSaving, handleToggleCompanyStatus, unifiedKpiStats,
    bundleAction, appAction, installAllLoading, activationLoading, activationError,
    orderedCatalogApps, resolvedBundles,
    handleInstallApp, handleSubscribeBundle, handleActivateAllTools,
    companyUsers, usersLoading, usersPagination, loadingMoreUsers, handleLoadMoreUsers,
    facebookPages, pagesLoading, openAddEmployeeModal, setTransferOpen,
    handleUpdateUserRole, handleToggleUserStatus, handleDeleteUser,
    deleteConfirmUserId, setDeleteConfirmUserId, deleteUserLoading,
    companyTickets, ticketsLoading,
    companyActivities, activitiesLoading,
    toggleFeatureLoading, handleToggleFeature,
    editOpen, setEditOpen, editSaving, editForm, setEditForm, editErrors, handleSaveCompany,
    transferOpen, transferLoading, changeOwnerTargetUserId, setChangeOwnerTargetUserId, handleTransferOwnership,
    addEmployeeOpen, setAddEmployeeOpen, employeeLoading, addEmployeeForm, setAddEmployeeForm,
    addEmployeeErrors, handleAddEmployee, topUpOpen, setTopUpOpen, topUpLoading, topUpForm, setTopUpForm, topUpErrors,
    topUpAmountPreview, topUpBonusPreview, handleTopUpWallet,
    trialOpen, setTrialOpen, trialDuration, setTrialDuration, trialSaving, trialDeactivating,
    openTrialModal, handleActivateTrial, handleDeactivateTrial,
    trialActive, trialEndsAt, trialStartedAt, trialDaysRemaining,
  } = useCompanyDetails();

  const [searchParams, setSearchParams] = useSearchParams();
  const TAB_IDS = ["general", "financial", "management", "activation", "team", "support", "activity"] as const;
  const initialTab = TAB_IDS.find((id) => id === searchParams.get("tab")) ?? "general";
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const handleTabChange = useCallback((next: string) => {
    setActiveTab(next);
    const params = new URLSearchParams(window.location.search);
    if (next === "general") params.delete("tab");
    else params.set("tab", next);
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [partnerCodeInput, setPartnerCodeInput] = useState("");
  const [linking, setLinking] = useState(false);
  const [specialties, setSpecialties] = useState<BusinessSpecialty[]>([]);

  // Impersonation Modal State
  const [impersonateModalOpen, setImpersonateModalOpen] = useState(false);
  const [impersonateReason, setImpersonateReason] = useState("");

  // Suspend / Activate Confirmation Modal State
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [statusReason, setStatusReason] = useState("");
  const [editStatusReason, setEditStatusReason] = useState("");

  const handleOpenEditModal = useCallback(() => {
    setEditStatusReason("");
    openEditModal();
  }, [openEditModal]);

  const openStatusConfirmModal = useCallback(() => {
    if (!company) return;
    setStatusReason("");
    setStatusConfirmOpen(true);
  }, [company]);

  useEffect(() => {
    businessSpecialtyService
      .listSpecialties()
      .then((list) => setSpecialties(list.filter((s) => s.isActive)))
      .catch(() => setSpecialties([]));
  }, []);

  const openLinkDialog = useCallback(() => {
    setPartnerCodeInput("");
    setLinkOpen(true);
  }, []);

  const handleLinkPartner = useCallback(async () => {
    if (!company?.id) return;
    if (!partnerCodeInput.trim()) {
      toast.error("يرجى إدخال كود الوكيل");
      return;
    }
    try {
      setLinking(true);
      const res = await apiClient.post(`/platform-partners/admin/companies/${company.id}/link-partner`, {
        partnerCode: partnerCodeInput.trim(),
      });
      if (res.data?.status === "success") {
        toast.success("تم ربط الشركة بالوكيل بنجاح");
        setLinkOpen(false);
        void refreshCompanyWorkspace({ background: true });
      } else {
        toast.error(res.data?.message || "تعذر ربط الشركة بالوكيل");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "تعذر ربط الشركة بالوكيل");
    } finally {
      setLinking(false);
    }
  }, [company?.id, partnerCodeInput, refreshCompanyWorkspace]);

  const liveStoreUrl = company?.customDomain
    ? `https://${company.customDomain}`
    : company?.slug
    ? `https://${company.slug}.maxp.online`
    : null;

  const unifiedUsersCount = useMemo(
    () => getUnifiedUsersCount(review, company),
    [review, company],
  );

  const planUsage = useMemo(
    () => getCompanyPlanUsagePercentage(review),
    [review],
  );

  const dormantUsersCount = useMemo(
    () => companyUsers.filter((user) => !isSystemAccount(user) && isUserDormant(user, 30)).length,
    [companyUsers],
  );

  const openTicketsCount = useMemo(
    () =>
      companyTickets.filter((ticket) => {
        const normalized = String(ticket.status || "")
          .trim()
          .toUpperCase()
          .replace(/[\s-]+/g, "_");
        return normalized !== "CLOSED" && normalized !== "RESOLVED";
      }).length,
    [companyTickets],
  );

  const daysUntilRenewal = useMemo(
    () => getDaysUntil(nextBillingDate),
    [nextBillingDate],
  );

  const renewalBadgeMeta = useMemo(() => {
    if (daysUntilRenewal === null) {
      return {
        label: "غير محدد",
        className: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300",
      };
    }
    if (daysUntilRenewal < 0) {
      return {
        label: "التجديد متأخر",
        className: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300",
      };
    }
    if (daysUntilRenewal <= 7) {
      return {
        label: "التجديد قريب",
        className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300",
      };
    }
    return {
      label: formatRelativeDateLabel(nextBillingDate),
      className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300",
    };
  }, [daysUntilRenewal, nextBillingDate]);

  // إزالة بانر «التجديد قريب» المكرر من تبويب عام (موجود مرة واحدة في عمود صحة الشركة)، وتجنب تكرار أرقام الرصيد
  const generalAlerts = useMemo(
    () =>
      reviewAlerts
        .filter((item) => item.key !== "renewal-soon")
        .map((item) =>
          item.key === "wallet-balance"
            ? {
                ...item,
                description: "رصيد المحفظة الحالي أقل من رسوم الاشتراك الشهرية، يرجى مراجعة المحفظة والشحن.",
              }
            : item,
        ),
    [reviewAlerts],
  );

  const generalOverviewMetrics = useMemo(
    () =>
      company
        ? [
            {
              icon: Package,
              label: "المنتجات",
              value: formatNumber(unifiedKpiStats.products),
              hint: "إجمالي المنتجات المسجلة",
            },
            {
              icon: Facebook,
              label: "صفحات فيسبوك",
              value: formatNumber(unifiedKpiStats.facebookPages),
              hint: pagesLoading ? "جاري التحميل..." : "قنوات الربط الحالية",
            },
            {
              icon: MessageSquare,
              label: "المحادثات",
              value: formatNumber(getCount(company, "conversations")),
              hint: "إجمالي المحادثات المسجلة",
            },
          ]
        : [],
    [company, unifiedKpiStats.products, unifiedKpiStats.facebookPages, pagesLoading],
  );

  const financialSummaryCards = useMemo(() => {
    if (!review) return [];
    const subStatusMeta = getStatusMeta("subscription", review.subscription?.status || "ACTIVE");
    return [
      {
        icon: CreditCard,
        label: "الاشتراك الشهري",
        value: formatCurrency(review.subscription?.monthlyFee, reviewCurrency),
        hint: `حالة الاشتراك: ${subStatusMeta.label}`,
        tone: "border-emerald-200/80 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(209,250,229,0.78))] text-emerald-900 dark:border-emerald-900/60 dark:bg-[linear-gradient(135deg,rgba(6,78,59,0.52),rgba(4,120,87,0.22))] dark:text-emerald-100",
      },
      {
        icon: BarChart3,
        label: "إجمالي تكلفة الشهر",
        value: formatCurrency(review.usage?.costs?.total, reviewCurrency),
        hint: `${formatNumber(review.usage?.totalActions)} عملية / ${formatNumber(review.usage?.totalQuantity)} وحدة`,
        tone: "border-sky-200/80 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(219,234,254,0.82))] text-sky-900 dark:border-sky-900/60 dark:bg-[linear-gradient(135deg,rgba(7,89,133,0.48),rgba(2,132,199,0.22))] dark:text-sky-100",
      },
      {
        icon: Receipt,
        label: "إيصالات قيد المراجعة",
        value: formatNumber(review.billing?.stats?.pendingReceipts || 0),
        hint: "بانتظار اعتماد السوبر أدمن",
        tone: "border-rose-200/80 bg-[linear-gradient(135deg,rgba(255,241,242,0.96),rgba(254,205,211,0.82))] text-rose-900 dark:border-rose-900/60 dark:bg-[linear-gradient(135deg,rgba(127,29,29,0.42),rgba(190,24,93,0.18))] dark:text-rose-100",
      },
    ];
  }, [review, reviewCurrency]);

  const headerActions = company ? (
    <>
      {/* Action 1 (Sole Primary): Edit */}
      <Button
        type="button"
        variant="default"
        className="h-9 rounded-xl font-bold shadow-xs gap-1.5 text-xs sm:text-sm px-3.5"
        onClick={handleOpenEditModal}
        disabled={!company}
      >
        <Sparkles className="size-4" />
        <span>تعديل</span>
      </Button>

      {/* Action 2 (Warning): Verified Support Login */}
      <Button
        type="button"
        variant="outline"
        data-variant="warning"
        className="h-9 rounded-xl border-amber-500/60 bg-amber-50/80 text-amber-800 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-700/70 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50 font-bold gap-1.5 text-xs sm:text-sm px-3.5"
        onClick={() => {
          setImpersonateReason("");
          setImpersonateModalOpen(true);
        }}
        disabled={!company || impersonating}
      >
        {impersonating ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        <span>دخول بدعم موثّق</span>
      </Button>

      {/* Action 3: More Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl font-bold gap-1.5 text-xs sm:text-sm px-3"
          >
            <span>المزيد</span>
            <ChevronDown className="size-3.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl">
          <DropdownMenuItem
            className="rounded-lg gap-2 text-xs"
            onClick={openTopUpModal}
            disabled={!company}
          >
            <Wallet className="size-3.5 text-emerald-600" />
            <span>شحن المحفظة</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="rounded-lg gap-2 text-xs"
            onClick={() => void refreshCompanyWorkspace({ background: true })}
            disabled={refreshing || loading}
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
            <span>تحديث البيانات</span>
          </DropdownMenuItem>

          {liveStoreUrl ? (
            <DropdownMenuItem
              className="rounded-lg gap-2 text-xs"
              onClick={() => window.open(liveStoreUrl, "_blank")}
            >
              <Store className="size-3.5 text-primary" />
              <span>معاينة المتجر الحي</span>
              <ExternalLink className="size-3 mr-auto opacity-50" />
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuItem
            className="rounded-lg gap-2 text-xs"
            onClick={openLinkDialog}
            disabled={!company}
          >
            <Percent className="size-3.5" />
            <span>ربط الشركة بوكيل</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="rounded-lg gap-2 text-xs"
            onClick={openTrialModal}
            disabled={!company}
          >
            <Timer className="size-3.5" />
            <span>{trialActive ? "إدارة الفترة التجريبية" : "تفعيل فترة تجريبية"}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="rounded-lg gap-2 text-xs font-semibold text-amber-700 focus:text-amber-700 dark:text-amber-400"
            onClick={() => setTransferOpen(true)}
            disabled={!company}
          >
            <ArrowLeftRight className="size-3.5" />
            <span>نقل ملكية الشركة</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            variant={company.isActive ? "destructive" : "default"}
            className={cn(
              "rounded-lg gap-2 text-xs font-semibold",
              company.isActive
                ? "text-destructive focus:text-destructive"
                : "text-emerald-700 focus:text-emerald-700 dark:text-emerald-400",
            )}
            onClick={openStatusConfirmModal}
            disabled={!company}
          >
            <AlertOctagon className="size-3.5" />
            <span>{company.isActive ? "إيقاف نشاط الشركة" : "تفعيل نشاط الشركة"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  ) : null;

  return (
    <div className="max-w-[1440px] mx-auto w-full px-3 sm:px-5 lg:px-6 space-y-4" dir={i18n.dir()}>
      {/* 1. Breadcrumb & Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <button
            type="button"
            onClick={() => navigate("/super-admin/companies")}
            className="hover:text-foreground transition-colors flex items-center gap-1 font-medium"
          >
            <Home className="size-3.5" />
            <span>إدارة الشركات</span>
          </button>
          <span aria-hidden="true" className="opacity-50">/</span>
          <span className="font-bold text-foreground truncate max-w-[200px] sm:max-w-sm">
            {company?.name || "تفاصيل الشركة"}
          </span>
        </nav>
        <span className="text-xs font-semibold text-muted-foreground">لوحة تفاصيل الشركة</span>
      </div>

      {/* 2. Streamlined Company Details Header + Unified 4-KPI Bar */}
      <header className="rounded-2xl border bg-card p-3.5 sm:p-4 shadow-xs space-y-3.5">
        {loading ? (
          <Skeleton className="h-52 rounded-2xl" />
        ) : error ? (
          <Alert className="rounded-2xl border-destructive/40 bg-destructive/5 text-right">
            <AlertTriangle className="size-4" />
            <AlertTitle>تعذر تحميل بيانات الشركة</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : company ? (
          <CompanyHeroCard
            company={company}
            review={review}
            ownerUser={ownerUser}
            actions={headerActions}
          />
        ) : null}

        {/* Unified 4-KPI Bar */}
        {company ? (
          <CompanyPulse
            review={review}
            company={company}
            customersCount={unifiedKpiStats.customers}
            ordersThisMonth={unifiedKpiStats.ordersThisMonth}
            activeApps={unifiedKpiStats.activeApps}
          />
        ) : null}
      </header>

      {/* 3. Main Content + Company Health Column */}
      {!loading && company ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] items-start">
          <div className="min-w-0">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="sticky top-2 z-20 w-full sm:w-fit justify-start gap-1 rounded-xl bg-muted/95 p-1 overflow-x-auto shadow-xs backdrop-blur-sm">
                <TabsTrigger value="general" className="rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-xs">عام</TabsTrigger>
                <TabsTrigger value="financial" className="rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-xs">مالي</TabsTrigger>
                <TabsTrigger value="management" className="rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-xs">الإدارة</TabsTrigger>
                <TabsTrigger value="activation" className="rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-xs">تفعيل</TabsTrigger>
                <TabsTrigger value="team" className="rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-xs">فريق</TabsTrigger>
                <TabsTrigger value="support" className="rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-xs">دعم</TabsTrigger>
                <TabsTrigger value="activity" className="rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-xs">نشاط</TabsTrigger>
              </TabsList>

              {/* Tab 1: General */}
              <TabsContent value="general" hidden={activeTab !== "general"} className="pt-3.5 space-y-4">
                {generalAlerts.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {generalAlerts.map((alertItem) => (
                      <Alert key={alertItem.key} className={cn("rounded-xl text-right", alertItem.tone)}>
                        <AlertTriangle className="size-4" />
                        <AlertTitle>{alertItem.title}</AlertTitle>
                        <AlertDescription>{alertItem.description}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : null}

                {trialActive ? (
                  <Alert className="rounded-xl border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-800/70 dark:bg-emerald-950/30 dark:text-emerald-100">
                    <Timer className="size-4" />
                    <AlertTitle>الفترة التجريبية مفعّلة</AlertTitle>
                    <AlertDescription>
                      تاريخ البدء: {formatDate(trialStartedAt)} • تاريخ الانتهاء: {formatDate(trialEndsAt)} ({formatNumber(trialDaysRemaining)} يوم متبقي).
                    </AlertDescription>
                  </Alert>
                ) : null}

                {/* Company Overview Metrics (Non-duplicated with KPI bar) */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {generalOverviewMetrics.map((metric) => (
                    <MetricCard
                      key={metric.label}
                      icon={metric.icon}
                      label={metric.label}
                      value={metric.value}
                      hint={metric.hint}
                    />
                  ))}
                </div>
              </TabsContent>

              {/* Tab 2: Financial */}
              <TabsContent value="financial" hidden={activeTab !== "financial"} className="pt-3.5 space-y-4">
                {financialSummaryCards.length ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    {financialSummaryCards.map((metric) => (
                      <MetricCard
                        key={metric.label}
                        icon={metric.icon}
                        label={metric.label}
                        value={metric.value}
                        hint={metric.hint}
                        tone={metric.tone}
                      />
                    ))}
                  </div>
                ) : null}
                <CompanyWalletSection
                  review={review}
                  reviewCurrency={reviewCurrency}
                  openTopUpModal={openTopUpModal}
                  navigate={navigate}
                />
                <CompanyBillingSection
                  review={review}
                  reviewCurrency={reviewCurrency}
                  navigate={navigate}
                />
              </TabsContent>

              {/* Tab 3: Management (Limits + Usage + Distinct Danger Zone) */}
              <TabsContent value="management" hidden={activeTab !== "management"} className="pt-3.5 space-y-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <CompanyLimitsSection review={review} limitEntries={limitEntries} />
                  <CompanyUsageSection review={review} reviewCurrency={reviewCurrency} />
                </div>

                {/* Distinct Danger Zone Section */}
                <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 space-y-3">
                  <div className="flex items-center gap-2.5 text-destructive">
                    <AlertOctagon className="size-5" />
                    <div>
                      <h3 className="text-base font-black">منطقة الخطر (إجراءات حساسة)</h3>
                      <p className="text-xs text-muted-foreground">
                        هذه العمليات تؤثر جذرياً على حالة الشركة وصلاحيات الوصول والتشغيل.
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-destructive/15 pt-1">
                    {/* Suspend / Reactivate */}
                    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-foreground">
                          {company.isActive ? "إيقاف نشاط الشركة" : "تفعيل نشاط الشركة"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {company.isActive
                            ? "تعطيل دخول المستخدمين والعمليات الحية مؤقتاً."
                            : "إعادة تنشيط حساب الشركة وتمكين الأعضاء من الدخول."}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant={company.isActive ? "destructive" : "default"}
                        className="h-10 rounded-xl px-4 font-bold shrink-0"
                        onClick={openStatusConfirmModal}
                      >
                        {company.isActive ? "إيقاف الشركة" : "تفعيل الشركة"}
                      </Button>
                    </div>

                    {/* Transfer Ownership */}
                    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-foreground">نقل ملكية الشركة</p>
                        <p className="text-xs text-muted-foreground">
                          المالك الحالي: {ownerUser ? `${ownerUser.firstName} ${ownerUser.lastName} (${ownerUser.email})` : "غير محدد"}.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-xl px-4 font-bold border-destructive/40 text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => setTransferOpen(true)}
                      >
                        نقل الملكية
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 4: Activation Center */}
              <TabsContent value="activation" hidden={activeTab !== "activation"} className="pt-3.5">
                <CompanyActivationCenter
                  orderedCatalogApps={orderedCatalogApps}
                  resolvedBundles={resolvedBundles}
                  appAction={appAction}
                  bundleAction={bundleAction}
                  installAllLoading={installAllLoading}
                  activationLoading={activationLoading}
                  activationError={activationError}
                  handleInstallApp={handleInstallApp}
                  handleSubscribeBundle={handleSubscribeBundle}
                  handleActivateAllTools={handleActivateAllTools}
                  company={company}
                  handleToggleFeature={handleToggleFeature}
                  toggleFeatureLoading={toggleFeatureLoading}
                />
              </TabsContent>

              {/* Tab 5: Team */}
              <TabsContent value="team" hidden={activeTab !== "team"} className="pt-3.5">
                <CompanyTeamSection
                  companyUsers={companyUsers}
                  usersLoading={usersLoading}
                  company={company}
                  facebookPages={facebookPages}
                  pagesLoading={pagesLoading}
                  openAddEmployeeModal={openAddEmployeeModal}
                  handleUpdateUserRole={handleUpdateUserRole}
                  handleToggleUserStatus={handleToggleUserStatus}
                  handleDeleteUser={handleDeleteUser}
                  deleteConfirmUserId={deleteConfirmUserId}
                  setDeleteConfirmUserId={setDeleteConfirmUserId}
                  deleteUserLoading={deleteUserLoading}
                  unifiedUsersCount={unifiedUsersCount}
                  usersHasMore={usersPagination.hasNext}
                  loadingMoreUsers={loadingMoreUsers}
                  onLoadMoreUsers={handleLoadMoreUsers}
                />
              </TabsContent>

              {/* Tab 6: Support */}
              <TabsContent value="support" hidden={activeTab !== "support"} className="pt-3.5 space-y-4">
                <SectionShell
                  title="تذاكر الدعم الفني"
                  description="التذاكر المرفوعة من مستخدمي هذه الشركة لمتابعتها وحلها."
                  actions={
                    <a
                      href="/support/admin/tickets"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-lg gap-1.5")}
                    >
                      <MessageSquare className="size-3.5" /> كل التذاكر
                    </a>
                  }
                >
                  <CompanySupportTickets
                    tickets={companyTickets}
                    companyId={company?.id || ""}
                    loading={ticketsLoading}
                  />
                </SectionShell>
              </TabsContent>

              {/* Tab 7: Activity */}
              <TabsContent value="activity" hidden={activeTab !== "activity"} className="pt-3.5 space-y-4">
                <SectionShell
                  title="سجل الأنشطة والتدقيق"
                  description="سجل العمليات الإدارية وأنشطة المستخدمين بالترتيب الزمني."
                >
                  <CompanyRecentActivity activities={companyActivities} loading={activitiesLoading} />
                </SectionShell>
              </TabsContent>
            </Tabs>
          </div>

          {/* Company Health Side Column */}
          <aside
            aria-label="صحة الشركة"
            data-testid="company-health-column"
            className="min-w-0 rounded-2xl border bg-card p-3.5 space-y-3 shadow-xs xl:sticky xl:top-3"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
              <div className="flex items-center gap-2">
                <HeartPulse className="size-4 text-primary" />
                <h2 className="text-sm font-black text-foreground">صحة الشركة</h2>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">مؤشرات المتابعة</span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
              {/* 1. Renewal Proximity (Single Location on Page) */}
              <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <CalendarClock className="size-3.5" /> قرب التجديد
                  </span>
                  <Badge variant="outline" className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", renewalBadgeMeta.className)}>
                    {renewalBadgeMeta.label}
                  </Badge>
                </div>
                <p className="text-xs font-bold text-foreground">
                  تاريخ التجديد: {nextBillingDate ? formatDate(nextBillingDate) : "غير محدد"}
                </p>
              </div>

              {/* 2. Plan Usage Percentage */}
              <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">نسبة استهلاك الخطة</span>
                  <span className="text-xs font-black text-foreground">
                    {planUsage.hasFiniteLimit && planUsage.percentage !== null
                      ? `${formatNumber(planUsage.percentage)}%`
                      : "بدون حدود"}
                  </span>
                </div>
                {planUsage.hasFiniteLimit && planUsage.percentage !== null ? (
                  <>
                    <UsageBar percentage={planUsage.percentage} />
                    <p className="text-[11px] text-muted-foreground">أعلى استهلاك: {planUsage.label}</p>
                  </>
                ) : (
                  <p className="text-[11px] text-muted-foreground">كل مقاييس الخطة غير محدودة</p>
                )}
              </div>

              {/* 3. Dormant Accounts (> 30 days) */}
              <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Users className="size-3.5" /> حسابات خاملة (&gt; {formatNumber(30)} يوم)
                  </span>
                  <span
                    className={cn(
                      "text-sm font-black",
                      dormantUsersCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground",
                    )}
                  >
                    {formatNumber(dormantUsersCount)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange("team")}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  مراجعة الفريق
                </button>
              </div>

              {/* 4. Open Support Tickets */}
              <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Ticket className="size-3.5" /> تذاكر مفتوحة
                  </span>
                  <span
                    data-testid="health-open-tickets-count"
                    className={cn(
                      "text-sm font-black",
                      openTicketsCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground",
                    )}
                  >
                    {formatNumber(openTicketsCount)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange("support")}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  عرض تذاكر الدعم
                </button>
              </div>
            </div>

            <div className="border-t border-border/40 pt-2 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
              <span>تاريخ آخر نشاط:</span>
              <span className="font-semibold text-foreground">
                {companyActivities[0] ? formatRelativeDateLabel(companyActivities[0].createdAt) : "لا يوجد"}
              </span>
            </div>
          </aside>
        </div>
      ) : null}

      {/* 4. Impersonation Confirmation Modal (Warning Style + Mandatory Reason) */}
      <Dialog
        open={impersonateModalOpen}
        onOpenChange={(open) => {
          if (!impersonating) setImpersonateModalOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <KeyRound className="size-5" />
              <DialogTitle className="text-lg font-black">دخول بدعم موثّق كأدمن الشركة</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              أنت على وشك الدخول بصلاحيات مدير شركة <span className="font-bold text-foreground">{company?.name}</span>. يُسجّل هذا الإجراء في سجل النشاط.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="impersonate-reason-input" className="text-xs font-bold text-foreground">
                سبب الدخول <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="impersonate-reason-input"
                value={impersonateReason}
                onChange={(e) => setImpersonateReason(e.target.value)}
                placeholder="اكتب السبب الإلزامي للدخول (مثال: متابعة تذكرة دعم رقم 124 أو فحص إعدادات الشحن)..."
                className="min-h-[85px] rounded-xl text-xs"
                disabled={impersonating}
              />
              {!impersonateReason.trim() ? (
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  يجب كتابة سبب الدخول لتفعيل زر التأكيد وتوثيق العملية في سجل النشاط.
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setImpersonateModalOpen(false)}
              disabled={impersonating}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-sm gap-1.5"
              disabled={impersonating || !impersonateReason.trim()}
              onClick={async () => {
                if (!impersonateReason.trim()) return;
                await handleLoginAsAdmin(impersonateReason.trim());
              }}
            >
              {impersonating ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              تأكيد الدخول كمدير
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Company Suspend / Reactivate Warning Confirmation Modal (Mandatory Reason) */}
      <Dialog
        open={statusConfirmOpen}
        onOpenChange={(open) => {
          if (!statusSaving) setStatusConfirmOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md" data-testid="company-status-confirm-dialog">
          <DialogHeader>
            <div
              className={cn(
                "flex items-center gap-2",
                company?.isActive
                  ? "text-destructive"
                  : "text-amber-700 dark:text-amber-400",
              )}
            >
              <AlertTriangle className="size-5" />
              <DialogTitle className="text-lg font-black">
                {company?.isActive ? "تحذير: إيقاف نشاط الشركة" : "تحذير: إعادة تفعيل نشاط الشركة"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              {company?.isActive
                ? `أنت على وشك إيقاف شركة «${company?.name}». سيُمنع جميع الأعضاء من تسجيل الدخول وتُعلّق العمليات الفورية حتى إعادة التفعيل.`
                : `أنت على وشك إعادة تفعيل شركة «${company?.name}». سيتمكن الأعضاء من تسجيل الدخول والوصول إلى جميع الأدوات المفعّلة.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div
              className={cn(
                "flex items-start gap-2 rounded-xl border p-3 text-xs",
                company?.isActive
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200",
              )}
            >
              <AlertOctagon className="size-4 shrink-0 mt-0.5" />
              <p>
                {company?.isActive
                  ? "إجراء حساس يوقف التشغيل المباشر للشركة ويُسجّل مع السبب في سجل النشاط."
                  : "سيُفتح الحساب للتشغيل فوراً ويُسجّل هذا الإجراء مع السبب في سجل النشاط."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company-status-reason-input" className="text-xs font-bold text-foreground">
                {company?.isActive ? "سبب إيقاف الشركة" : "سبب تفعيل الشركة"}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="company-status-reason-input"
                value={statusReason}
                onChange={(event) => setStatusReason(event.target.value)}
                placeholder={
                  company?.isActive
                    ? "اكتب السبب الإلزامي لإيقاف الشركة (مثال: تأخر سداد الفواتير المستحقة بتاريخ 2026/11/01)..."
                    : "اكتب السبب الإلزامي لإعادة تفعيل الشركة (مثال: تم تأكيد سداد الفواتير وتوثيق الإيصال)..."
                }
                className="min-h-[85px] rounded-xl text-xs"
                disabled={statusSaving}
              />
              {!statusReason.trim() ? (
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  يجب كتابة سبب واضح لتفعيل زر التأكيد وتوثيق العملية في سجل النشاط.
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusConfirmOpen(false)}
              disabled={statusSaving}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant={company?.isActive ? "destructive" : "default"}
              className="font-bold shadow-sm gap-1.5"
              disabled={statusSaving || !statusReason.trim()}
              onClick={async () => {
                if (!company || !statusReason.trim()) return;
                const ok = await handleToggleCompanyStatus(!company.isActive, statusReason.trim());
                if (ok) {
                  setStatusReason("");
                  setStatusConfirmOpen(false);
                }
              }}
            >
              {statusSaving ? <Loader2 className="size-4 animate-spin" /> : <AlertOctagon className="size-4" />}
              {company?.isActive ? "تأكيد إيقاف الشركة" : "تأكيد تفعيل الشركة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Company Modal */}
      <ResponsiveOverlay
        mobile={isMobile}
        open={editOpen}
        onOpenChange={setEditOpen}
        title={`تعديل ${company?.name || "الشركة"}`}
        description="حدّث بيانات الشركة الأساسية من صفحة التفاصيل نفسها."
        bodyClassName="space-y-4"
        footer={
          <ModalFooter
            loading={editSaving}
            disabled={Boolean(company && editForm.isActive !== company.isActive && !editStatusReason.trim())}
            onCancel={() => setEditOpen(false)}
            onConfirm={() => void handleSaveCompany(editStatusReason)}
            confirmLabel="حفظ التعديلات"
            confirmIcon={CheckCircle2}
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="اسم الشركة" error={editErrors["name"]} required>
            <Input
              value={editForm["name"]}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setEditForm((current) => ({ ...current, name: event.target.value }))
              }
              className="h-11 rounded-2xl"
            />
          </FormField>
          <FormField label="البريد الإلكتروني" error={editErrors["email"]} required>
            <Input
              type="email"
              value={editForm["email"]}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setEditForm((current) => ({ ...current, email: event.target.value }))
              }
              className="h-11 rounded-2xl"
            />
          </FormField>
          <FormField label="الهاتف">
            <Input
              value={editForm.phone}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setEditForm((current) => ({ ...current, phone: event.target.value }))
              }
              className="h-11 rounded-2xl"
            />
          </FormField>
          <FormField label="الموقع الإلكتروني">
            <Input
              value={editForm.website}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setEditForm((current) => ({ ...current, website: event.target.value }))
              }
              className="h-11 rounded-2xl"
            />
          </FormField>

          <FormField label="العملة" error={editErrors["currency"]} required>
            <Select
              value={editForm["currency"]}
              items={CURRENCY_ITEMS}
              onValueChange={(value: string | null) =>
                setEditForm((current) => ({ ...current, currency: value ?? "" }))
              }
            >
              <SelectTrigger className="h-11 min-w-0 rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="نوع الشركة (تخصص النشاط)">
            <Select
              value={editForm.businessSpecialtyId || "none"}
              items={{
                none: "بدون تخصص محدد (تخصيص عام)",
                ...Object.fromEntries(specialties.map((s) => [s.id, s.nameAr || s.nameEn])),
              }}
              onValueChange={(value: string | null) =>
                setEditForm((current) => ({ ...current, businessSpecialtyId: value ?? "none" }))
              }
            >
              <SelectTrigger className="h-11 min-w-0 rounded-2xl">
                <SelectValue placeholder="اختر تخصص الشركة..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون تخصص محدد (تخصيص عام)</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nameAr || s.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-black text-foreground">حالة الشركة</p>
              <p className="text-xs text-muted-foreground">التحكم في تفعيل أو إيقاف الشركة من نفس الشاشة.</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge isActive={editForm.isActive} />
              <Switch
                checked={editForm.isActive}
                onCheckedChange={(checked: boolean) => {
                  setEditForm((current) => ({ ...current, isActive: checked }));
                  if (company && checked === company.isActive) {
                    setEditStatusReason("");
                  }
                }}
              />
            </div>
          </div>
          {company && editForm.isActive !== company.isActive ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3 space-y-2 dark:border-amber-800/70 dark:bg-amber-950/30">
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span>
                  {editForm.isActive
                    ? "تحذير: أنت على وشك تفعيل نشاط الشركة."
                    : "تحذير: أنت على وشك إيقاف نشاط الشركة ومنع دخول الأعضاء."}
                </span>
              </p>
              <Textarea
                id="edit-company-status-reason-input"
                value={editStatusReason}
                onChange={(event) => setEditStatusReason(event.target.value)}
                placeholder="اكتب السبب الإلزامي لتغيير حالة الشركة (يُسجّل في سجل النشاط)..."
                className="min-h-[70px] rounded-xl text-xs bg-background"
              />
            </div>
          ) : null}
        </div>

        <FormField label="ملاحظات">
          <Textarea
            value={editForm.notes}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setEditForm((current) => ({ ...current, notes: event.target.value }))
            }
            className="h-24 rounded-2xl"
            placeholder="أي ملاحظات عن الشركة..."
          />
        </FormField>
      </ResponsiveOverlay>

      {/* Transfer Ownership Modal */}
      <ResponsiveOverlay
        mobile={isMobile}
        open={transferOpen}
        onOpenChange={setTransferOpen}
        title={`نقل ملكية ${company?.name || "الشركة"}`}
        description="اختر العضو الذي سيحصل على صلاحيات المالك بالكامل."
        bodyClassName="space-y-4"
        footer={
          <ModalFooter
            loading={transferLoading}
            onCancel={() => setTransferOpen(false)}
            onConfirm={() => void handleTransferOwnership()}
            confirmLabel="تأكيد النقل"
            confirmIcon={ArrowLeftRight}
            disabled={!changeOwnerTargetUserId}
          />
        }
      >
        <Alert className="rounded-xl border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="size-4" />
          <AlertTitle>خطوة حساسة</AlertTitle>
          <AlertDescription>النقل يبدّل المالك الحالي ويمنح المستخدم المختار صلاحيات كاملة.</AlertDescription>
        </Alert>
        <FormField label="المالك الجديد" required>
          <Select
            value={changeOwnerTargetUserId}
            items={Object.fromEntries(
              companyUsers.map((user) => [
                user.id,
                `${user.firstName} ${user.lastName} - ${getRoleLabel(user.role)}`,
              ]),
            )}
            onValueChange={(value: string | null) => setChangeOwnerTargetUserId(value ?? "")}
          >
            <SelectTrigger className="h-12 min-w-0 rounded-xl">
              <SelectValue placeholder="اختر المستخدم" />
            </SelectTrigger>
            <SelectContent>
              {companyUsers.length ? (
                companyUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} - {getRoleLabel(user.role)}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="__empty" disabled>
                  {usersLoading ? "جاري التحميل..." : "لا يوجد أعضاء مؤهلون"}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </FormField>
      </ResponsiveOverlay>

      {/* Add Employee Modal */}
      <ResponsiveOverlay
        mobile={isMobile}
        open={addEmployeeOpen}
        onOpenChange={setAddEmployeeOpen}
        title={`إضافة عضو إلى ${company?.name || "الشركة"}`}
        description="أضف مديرًا أو موظفًا جديدًا بدون مغادرة صفحة الشركة."
        bodyClassName="space-y-4"
        footer={
          <ModalFooter
            loading={employeeLoading}
            onCancel={() => setAddEmployeeOpen(false)}
            onConfirm={() => void handleAddEmployee()}
            confirmLabel="إضافة العضو"
            confirmIcon={UserPlus}
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="الاسم الأول" error={addEmployeeErrors["firstName"]} required>
            <Input
              value={addEmployeeForm["firstName"]}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setAddEmployeeForm((current) => ({ ...current, firstName: event.target.value }))
              }
              className="h-11 rounded-2xl"
            />
          </FormField>
          <FormField label="الاسم الأخير" error={addEmployeeErrors["lastName"]} required>
            <Input
              value={addEmployeeForm["lastName"]}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setAddEmployeeForm((current) => ({ ...current, lastName: event.target.value }))
              }
              className="h-11 rounded-2xl"
            />
          </FormField>
          <FormField label="البريد الإلكتروني" error={addEmployeeErrors["email"]} required>
            <Input
              type="email"
              value={addEmployeeForm["email"]}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setAddEmployeeForm((current) => ({ ...current, email: event.target.value }))
              }
              className="h-11 rounded-2xl md:col-span-2"
            />
          </FormField>
          <FormField label="كلمة المرور" error={addEmployeeErrors["password"]} required>
            <Input
              type="password"
              value={addEmployeeForm["password"]}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setAddEmployeeForm((current) => ({ ...current, password: event.target.value }))
              }
              className="h-11 rounded-2xl"
            />
          </FormField>
          <FormField label="الصلاحية" required>
            <Select
              value={addEmployeeForm.role}
              items={EMPLOYEE_ROLE_ITEMS}
              onValueChange={(value: string | null) =>
                setAddEmployeeForm((current) => ({ ...current, role: value ?? "" }))
              }
            >
              <SelectTrigger className="h-11 min-w-0 rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYEE_ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </ResponsiveOverlay>

      {/* Top-up Wallet Modal */}
      <ResponsiveOverlay
        mobile={isMobile}
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        title={`شحن محفظة ${company?.name || "الشركة"}`}
        description="أضف رصيدًا مباشرًا أو بونصًا للمحفظة من شاشة المراجعة."
        bodyClassName="space-y-4"
        footer={
          <ModalFooter
            loading={topUpLoading}
            onCancel={() => setTopUpOpen(false)}
            onConfirm={() => void handleTopUpWallet()}
            confirmLabel="تنفيذ الشحن"
            confirmIcon={Wallet}
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="قيمة الشحن" error={topUpErrors["amount"]} required>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={topUpForm["amount"]}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setTopUpForm((current) => ({ ...current, amount: event.target.value }))
              }
              className="h-11 rounded-2xl"
            />
          </FormField>
          <FormField label="بونص إضافي" error={topUpErrors["bonus"]} required>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={topUpForm["bonus"]}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setTopUpForm((current) => ({ ...current, bonus: event.target.value }))
              }
              className="h-11 rounded-2xl"
            />
          </FormField>
          <FormField label="ملاحظات">
            <Input
              value={topUpForm.notes}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setTopUpForm((current) => ({ ...current, notes: event.target.value }))
              }
              className="h-11 rounded-2xl md:col-span-2"
              placeholder="مثال: شحن يدوي بعد مراجعة الحساب"
            />
          </FormField>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniStat
            label="الرصيد الحالي"
            value={formatCurrency(review?.wallet?.balance, reviewCurrency)}
            helper="قبل تنفيذ العملية"
          />
          <MiniStat
            label="إجمالي الإيداعات"
            value={formatCurrency(review?.wallet?.totalDeposited, reviewCurrency)}
            helper="قبل الشحن الجديد"
          />
          <MiniStat
            label="القيمة النهائية"
            value={formatCurrency(
              (review?.wallet?.balance || 0) + topUpAmountPreview + topUpBonusPreview,
              reviewCurrency
            )}
            helper="رصيد تقديري بعد الشحن"
            valueClassName="text-emerald-700 dark:text-emerald-300"
          />
        </div>
      </ResponsiveOverlay>

      {/* Trial Modal */}
      <ResponsiveOverlay
        mobile={isMobile}
        open={trialOpen}
        onOpenChange={setTrialOpen}
        title={`الفترة التجريبية ${company?.name || "الشركة"}`}
        description="افتح فترة مجانية للشركة تثبّت فيها أي أداة من الماركت بلس بلا خصم من المحفظة."
        bodyClassName="space-y-4"
        footer={
          trialActive ? (
            <div className="flex w-full justify-between gap-3">
              <Button
                type="button"
                variant="destructive"
                className="h-11 rounded-2xl"
                onClick={() => void handleDeactivateTrial()}
                disabled={trialDeactivating}
              >
                {trialDeactivating ? <Loader2 className="size-4 animate-spin" /> : <Timer className="size-4" />}
                إيقاف التجربة وتجميد الأدوات
              </Button>
              <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={() => setTrialOpen(false)}>
                إغلاق
              </Button>
            </div>
          ) : (
            <div className="flex w-full justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl"
                onClick={() => setTrialOpen(false)}
                disabled={trialSaving}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                className="h-11 rounded-2xl"
                onClick={() => void handleActivateTrial()}
                disabled={trialSaving}
              >
                {trialSaving ? <Loader2 className="size-4 animate-spin" /> : <Timer className="size-4" />}
                تفعيل التجربة
              </Button>
            </div>
          )
        }
      >
        {trialActive ? (
          <Alert className="rounded-xl border-emerald-200 bg-emerald-50/90 text-emerald-900 dark:border-emerald-800/70 dark:bg-emerald-950/30 dark:text-emerald-100">
            <CheckCircle2 className="size-4" />
            <AlertTitle>الفترة التجريبية مفعّلة</AlertTitle>
            <AlertDescription>
              تاريخ البدء: {trialStartedAt ? formatDate(trialStartedAt) : "—"} • تاريخ الانتهاء:{" "}
              {trialEndsAt ? formatDate(trialEndsAt) : "—"} ({formatNumber(trialDaysRemaining)} يوم متبقي).
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert className="rounded-xl border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
              <AlertTriangle className="size-4" />
              <AlertTitle>فترة مجانية (تفعيل تجريبي)</AlertTitle>
              <AlertDescription>
                خلالها تستطيع الشركة تثبيت أي أداة من الماركت بلس مجانًا. عند انتهاء المدة تُجمَّد الأدوات تلقائيًا ويُحصَّل الاستهلاك حسب الاستخدام من المحفظة.
              </AlertDescription>
            </Alert>
            <div className="space-y-3">
              <FormField label="مدة التجربة (أيام)" required>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={trialDuration}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setTrialDuration(event.target.value)}
                  className="h-11 rounded-2xl"
                  placeholder="مثال: 14"
                />
              </FormField>
              <div className="flex flex-wrap gap-2">
                {[7, 14, 30, 60, 90].map((days) => (
                  <Button
                    key={days}
                    type="button"
                    variant={trialDuration === String(days) ? "default" : "outline"}
                    size="sm"
                    className="h-9 rounded-lg px-4 text-xs font-black"
                    onClick={() => setTrialDuration(String(days))}
                  >
                    {formatNumber(days)} يوم
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
      </ResponsiveOverlay>

      {/* Link Partner Dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>اربط الشركة بوكيل</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Alert>
              <AlertDescription>
                أدخل كود الوكيل (Partner Code) لربط هذه الشركة به يدوياً. سيظهر العميل ضمن شبكة الوكيل ويحتسب له العمولة على الاشتراكات الجديدة.
              </AlertDescription>
            </Alert>
            <div className="space-y-1.5">
              <Label>كود الوكيل</Label>
              <Input
                value={partnerCodeInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPartnerCodeInput(e.target.value)}
                placeholder="مثال: SWA-DC918226"
                className="h-11 rounded-2xl"
                disabled={linking}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLinkOpen(false)} disabled={linking}>
              إلغاء
            </Button>
            <Button type="button" onClick={handleLinkPartner} disabled={linking || !partnerCodeInput.trim()}>
              {linking ? <Loader2 className="size-4 animate-spin" /> : <Percent className="size-4" />}
              ربط بالوكيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminCompanyDetails;
