import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Home,
  KeyRound,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Percent,
  RefreshCw,
  AlertOctagon,
  Sparkles,
  Store,
  Timer,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "../../lib/utils";
import i18n from "../../i18n";
import { businessSpecialtyService, type BusinessSpecialty } from "../../services/businessSpecialtyService";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
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
  SectionShell,
} from "./company-details";
import { formatCurrency, getRoleLabel, formatNumber } from "./company-details/helpers";
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

const EMPLOYEE_ROLE_OPTIONS = [
  { value: "COMPANY_ADMIN", label: "مدير شركة" },
  { value: "MANAGER", label: "مدير" },
  { value: "AGENT", label: "موظف" },
];

const SuperAdminCompanyDetails = () => {
  const {
    navigate, isMobile, company, loading, error, review, reviewCurrency, limitEntries,
    reviewAlerts, detailMetrics, financialMetrics, ownerUser,
    refreshCompanyWorkspace, refreshing, openTopUpModal, openEditModal, handleLoginAsAdmin,
    impersonating, unifiedKpiStats,
    bundleAction, appAction, installAllLoading, activationLoading, activationError,
    orderedCatalogApps, resolvedBundles, appNameBySlug,
    handleInstallApp, handleSubscribeBundle, handleActivateAllTools,
    companyUsers, usersLoading, facebookPages, pagesLoading, openAddEmployeeModal, setTransferOpen,
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

  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 space-y-5" dir={i18n.dir()}>
      {/* 1. Modern Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1" aria-label="Breadcrumb">
        <button
          type="button"
          onClick={() => navigate("/super-admin/dashboard")}
          className="hover:text-foreground transition-colors flex items-center gap-1"
        >
          <Home className="size-3.5" />
          <span>السوبر أدمن</span>
        </button>
        <ChevronRight className="size-3.5 opacity-50" />
        <button
          type="button"
          onClick={() => navigate("/super-admin/companies")}
          className="hover:text-foreground transition-colors"
        >
          الشركات
        </button>
        <ChevronRight className="size-3.5 opacity-50" />
        <span className="font-bold text-foreground truncate max-w-[200px] sm:max-w-sm">
          {company?.name || "تفاصيل الشركة"}
        </span>
      </nav>

      {/* 2. Streamlined Company Details Header */}
      <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Back button only — اسم الشركة موجود في الـbreadcrumb وفى كارت الهوية، مش ثلاث مرات */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl gap-1 text-xs"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="size-3.5" /> رجوع
            </Button>
          </div>

          {/* Exactly 3 primary/secondary actions + "More" dropdown menu */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Action 1 (Primary): Top-up Wallet */}
            <Button
              type="button"
              className="h-9 sm:h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs gap-1.5 text-xs sm:text-sm px-3.5"
              onClick={openTopUpModal}
              disabled={!company}
            >
              <Wallet className="size-4" /> شحن المحفظة
            </Button>

            {/* Action 2 (Secondary): Edit Company */}
            <Button
              type="button"
              variant="outline"
              className="h-9 sm:h-10 rounded-xl font-bold gap-1.5 text-xs sm:text-sm px-3.5"
              onClick={openEditModal}
              disabled={!company}
            >
              <Sparkles className="size-4" /> تعديل الشركة
            </Button>

            {/* Action 3 (Impersonation Modal Trigger): Login as Admin */}
            <Button
              type="button"
              variant="outline"
              className="h-9 sm:h-10 rounded-xl border-primary/40 text-primary hover:bg-primary/10 font-bold gap-1.5 text-xs sm:text-sm px-3.5"
              onClick={() => {
                setImpersonateReason("");
                setImpersonateModalOpen(true);
              }}
              disabled={!company || impersonating}
            >
              <KeyRound className="size-4" /> دخول كمسؤول
            </Button>

            {/* "More" Menu for Secondary / Auxiliary Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 sm:size-10 rounded-xl shrink-0"
                  title="المزيد من الخيارات"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl">
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
                    <ExternalLink className="size-3 ml-auto opacity-50" />
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Hero Card & Loading/Error states */}
        {loading ? (
          <Skeleton className="h-64 rounded-2xl" />
        ) : error ? (
          <Alert className="rounded-2xl border-destructive/40 bg-destructive/5 text-right">
            <AlertTriangle className="size-4" />
            <AlertTitle>تعذر تحميل بيانات الشركة</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : company ? (
          <CompanyHeroCard company={company} review={review} ownerUser={ownerUser} />
        ) : null}

        {/* Unified Pulse Bar with single-source metrics */}
        {company ? (
          <CompanyPulse
            review={review}
            reviewCurrency={reviewCurrency}
            openTickets={unifiedKpiStats.openTickets}
            recentActivity={companyActivities[0] || null}
            activeUsers={unifiedKpiStats.users.active}
          />
        ) : null}
      </div>

      {/* 3. Seven Structured Tabs */}
      {!loading && company ? (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="sticky top-2 z-20 w-full sm:w-fit justify-start gap-1 rounded-xl bg-muted/95 p-1 overflow-x-auto shadow-xs backdrop-blur-sm">
            <TabsTrigger value="general" className="rounded-lg px-4 py-2 text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-xs">عام</TabsTrigger>
            <TabsTrigger value="financial" className="rounded-lg px-4 py-2 text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-xs">مالي</TabsTrigger>
            <TabsTrigger value="management" className="rounded-lg px-4 py-2 text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-xs">الإدارة</TabsTrigger>
            <TabsTrigger value="activation" className="rounded-lg px-4 py-2 text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-xs">تفعيل</TabsTrigger>
            <TabsTrigger value="team" className="rounded-lg px-4 py-2 text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-xs">فريق</TabsTrigger>
            <TabsTrigger value="support" className="rounded-lg px-4 py-2 text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-xs">دعم</TabsTrigger>
            <TabsTrigger value="activity" className="rounded-lg px-4 py-2 text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-xs">نشاط</TabsTrigger>
          </TabsList>

          {/* Tab 1: General (Cleaned up, no 3x duplicate metrics) */}
          <TabsContent value="general" hidden={activeTab !== "general"} className="pt-4 space-y-4">
            {reviewAlerts.length ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {reviewAlerts.map((alertItem) => (
                  <Alert key={alertItem.key} className={cn("rounded-xl text-right", alertItem.tone)}>
                    <AlertTriangle className="size-4" />
                    <AlertTitle>{alertItem.title}</AlertTitle>
                    <AlertDescription>{alertItem.description}</AlertDescription>
                  </Alert>
                ))}
              </div>
            ) : null}

            {/* Focused Company Overview Metrics */}
            <div className="grid gap-3 md:grid-cols-3">
              {detailMetrics.map((metric) => (
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
          <TabsContent value="financial" hidden={activeTab !== "financial"} className="pt-4 space-y-4">
            {financialMetrics.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {financialMetrics.slice(0, 3).map((metric) => (
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
          <TabsContent value="management" hidden={activeTab !== "management"} className="pt-4 space-y-6">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <CompanyLimitsSection review={review} limitEntries={limitEntries} />
              <CompanyUsageSection review={review} reviewCurrency={reviewCurrency} />
            </div>

            {/* Distinct Danger Zone Section */}
            <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 space-y-4">
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
                <div className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
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
                    onClick={openEditModal}
                  >
                    {company.isActive ? "إيقاف الشركة" : "تفعيل الشركة"}
                  </Button>
                </div>

                {/* Transfer Ownership */}
                <div className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
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
          <TabsContent value="activation" hidden={activeTab !== "activation"} className="pt-4">
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
          <TabsContent value="team" hidden={activeTab !== "team"} className="pt-4">
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
            />
          </TabsContent>

          {/* Tab 6: Support */}
          <TabsContent value="support" hidden={activeTab !== "support"} className="pt-4 space-y-4">
            <SectionShell
              title="تذاكر الدعم الفني"
              description="التذاكر المرفوعة من مستخدمي هذه الشركة لمتابعتها وحلها."
              actions={
                <Button type="button" variant="outline" size="sm" className="rounded-lg gap-1.5" asChild>
                  <a href="/support/admin/tickets">
                    <MessageSquare className="size-3.5" /> كل التذاكر
                  </a>
                </Button>
              }
            >
              <CompanySupportTickets
                tickets={companyTickets}
                companyId={company?.id || ""}
                loading={ticketsLoading}
              />
            </SectionShell>
          </TabsContent>

          {/* Tab 7: Activity (Natural Arabic Timeline, Zero /api/) */}
          <TabsContent value="activity" hidden={activeTab !== "activity"} className="pt-4 space-y-4">
            <SectionShell
              title="سجل الأنشطة والتدقيق"
              description="سجل العمليات الإدارية وأنشطة المستخدمين بالترتيب الزمني."
            >
              <CompanyRecentActivity activities={companyActivities} loading={activitiesLoading} />
            </SectionShell>
          </TabsContent>
        </Tabs>
      ) : null}

      {/* 4. Impersonation Confirmation Modal with Mandatory Reason */}
      <Dialog open={impersonateModalOpen} onOpenChange={setImpersonateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <KeyRound className="size-5" />
              <DialogTitle className="text-lg font-black">تسجيل الدخول كمسؤول الشركة</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              أنت على وشك الدخول بصلاحيات مدير شركة <span className="font-bold text-foreground">{company?.name}</span>. سيتم تسجيل هذا الإجراء فوراً في سجل التدقيق الأمني.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <Alert className="rounded-xl border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200 text-xs">
              <AlertTriangle className="size-4 shrink-0" />
              <AlertTitle className="font-bold">إجراء إشرافي حساس</AlertTitle>
              <AlertDescription className="text-[11px] mt-0.5">
                أي إجراء يتم تنفيذه داخل حساب الشركة سينعكس على بياناتهم الحية ومحفظتهم.
              </AlertDescription>
            </Alert>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                سبب تسجيل الدخول كمسؤول الشركة <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={impersonateReason}
                onChange={(e) => setImpersonateReason(e.target.value)}
                placeholder="يرجى توضيح سبب الدخول بالتفصيل (مثل: حل مشكلة في إعدادات الطلبات، مراجعة استهلاك المحفظة، دعم فني مباشر...)"
                className="min-h-[85px] rounded-xl text-xs"
                disabled={impersonating}
              />
              <p className="text-[10px] text-muted-foreground">
                كتابة السبب إلزامية لتفعيل زر الدخول ولن تتم العملية بدونه.
              </p>
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
              className="bg-primary text-primary-foreground font-bold shadow-sm gap-1.5"
              disabled={impersonating || !impersonateReason.trim()}
              onClick={async () => {
                await handleLoginAsAdmin(impersonateReason.trim());
              }}
            >
              {impersonating ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              تأكيد الدخول كمدير
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
            onCancel={() => setEditOpen(false)}
            onConfirm={() => void handleSaveCompany()}
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

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-black text-foreground">حالة الشركة</p>
              <p className="text-xs text-muted-foreground">التحكم في تفعيل أو إيقاف الشركة من نفس الشاشة.</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge isActive={editForm.isActive} />
              <Switch
                checked={editForm.isActive}
                onCheckedChange={(checked: boolean) =>
                  setEditForm((current) => ({ ...current, isActive: checked }))
                }
              />
            </div>
          </div>
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
              بدأت {trialStartedAt ? new Date(trialStartedAt).toLocaleDateString("ar-EG-u-nu-latn") : "—"} وتنتهي{" "}
              {trialEndsAt ? new Date(trialEndsAt).toLocaleDateString("ar-EG-u-nu-latn") : "—"} ({formatNumber(trialDaysRemaining)} يوم متبقي).
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
