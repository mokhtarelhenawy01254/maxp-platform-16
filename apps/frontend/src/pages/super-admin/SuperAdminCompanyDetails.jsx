import { AlertTriangle, ArrowLeft, ArrowLeftRight, CheckCircle2, Loader2, LogIn, RefreshCw, Sparkles, UserPlus, Wallet } from "lucide-react";
import { cn } from "../../lib/utils";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { Switch } from "../../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  CompanyHeroCard, StatusBadge, MiniStat, MetricCard, FormField, EmptyState, ResponsiveOverlay, ModalFooter,
  CompanyBillingSection, CompanyTeamSection, CompanyWalletSection,
  CompanySubscriptionSection, CompanyLimitsSection, CompanyUsageSection,
} from "./company-details";
import { formatDate, formatCurrency, getRoleLabel } from "./company-details/helpers";
import { useCompanyDetails } from "./company-details/useCompanyDetails";

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
    navigate, isMobile, company, loading, error, review, reviewCurrency, limitEntries, nextBillingDate,
    scrollToActivationSection, reviewAlerts, detailMetrics, financialMetrics, ownerUser,
    refreshCompanyWorkspace, refreshing, openTopUpModal, openEditModal, handleLoginAsAdmin,
    planAction, bundleAction, appAction, installAllLoading, activationLoading, activationError,
    orderedCatalogApps, resolvedBundles, appNameBySlug,
    handleInstallApp, handleSubscribeBundle, handleActivateAllTools, refreshActivationCatalog,
    companyUsers, usersLoading, facebookPages, pagesLoading, openAddEmployeeModal, setTransferOpen,
    editOpen, setEditOpen, editSaving, editForm, setEditForm, editErrors, handleSaveCompany,
    transferOpen, transferLoading, changeOwnerTargetUserId, setChangeOwnerTargetUserId, handleTransferOwnership,
    addEmployeeOpen, setAddEmployeeOpen, employeeLoading, addEmployeeForm, setAddEmployeeForm,
    addEmployeeErrors, handleAddEmployee, topUpOpen, setTopUpOpen, topUpLoading, topUpForm, setTopUpForm, topUpErrors,
    topUpAmountPreview, topUpBonusPreview, handleTopUpWallet,
  } = useCompanyDetails();

  return (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={() => navigate("/super-admin/companies")}>
                <ArrowLeft className="size-4" /> رجوع لإدارة الشركات
              </Button>
              <Button type="button" variant="outline" className="h-11 rounded-2xl"
                onClick={() => void refreshCompanyWorkspace({ background: true })} disabled={refreshing || loading}
              >
                {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                تحديث البيانات
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={openTopUpModal} disabled={!company}>
                <Wallet className="size-4" /> شحن المحفظة
              </Button>
              <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={openEditModal} disabled={!company}>
                <Sparkles className="size-4" /> تعديل الشركة
              </Button>
              <Button type="button" className="h-11 rounded-2xl" onClick={() => void handleLoginAsAdmin()} disabled={!company}>
                <LogIn className="size-4" /> دخول كأدمن
              </Button>
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-72 rounded-2xl" />
          ) : error ? (
            <Alert className="rounded-2xl border-destructive/40 bg-destructive/5 text-right">
              <AlertTriangle className="size-4" />
              <AlertTitle>تعذر تحميل الصفحة</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : company ? (
            <CompanyHeroCard company={company} review={review} ownerUser={ownerUser} />
          ) : null}
        </div>
      </div>

      {!loading && company ? (
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="w-fit justify-start gap-1 rounded-xl bg-muted p-1">
            <TabsTrigger value="general" className="rounded-lg px-4 py-2 text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-sm">عام</TabsTrigger>
            <TabsTrigger value="financial" className="rounded-lg px-4 py-2 text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-sm">مالي</TabsTrigger>
            <TabsTrigger value="management" className="rounded-lg px-4 py-2 text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-sm">الإدارة</TabsTrigger>
            <TabsTrigger value="team" className="rounded-lg px-4 py-2 text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-sm">فريق</TabsTrigger>

          </TabsList>

          <TabsContent value="general" className="pt-4">
            <div className="space-y-4">
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
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {detailMetrics.map((metric) => (
                  <MetricCard key={metric.label} icon={metric.icon} label={metric.label} value={metric.value} hint={metric.hint} />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="pt-4">
            <div className="space-y-4">
              {financialMetrics.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {financialMetrics.slice(0, 3).map((metric) => (
                    <MetricCard key={metric.label} icon={metric.icon} label={metric.label} value={metric.value} hint={metric.hint} tone={metric.tone} />
                  ))}
                </div>
              ) : null}
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
                <CompanyWalletSection review={review} reviewCurrency={reviewCurrency} openTopUpModal={openTopUpModal} navigate={navigate} />
                <CompanySubscriptionSection review={review} reviewCurrency={reviewCurrency} company={company} nextBillingDate={nextBillingDate} scrollToActivationSection={scrollToActivationSection} />
              </div>
              <CompanyBillingSection review={review} reviewCurrency={reviewCurrency} navigate={navigate} />
            </div>
          </TabsContent>

          <TabsContent value="management" className="pt-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <CompanyLimitsSection review={review} limitEntries={limitEntries} />
              <CompanyUsageSection review={review} reviewCurrency={reviewCurrency} />
            </div>
          </TabsContent>

          <TabsContent value="team" className="pt-4">
            <CompanyTeamSection
              companyUsers={companyUsers} usersLoading={usersLoading} company={company}
              facebookPages={facebookPages} pagesLoading={pagesLoading}
              openAddEmployeeModal={openAddEmployeeModal}
            />
          </TabsContent>


        </Tabs>
      ) : null}

      <ResponsiveOverlay mobile={isMobile} open={editOpen} onOpenChange={setEditOpen}
        title={`تعديل ${company?.name || "الشركة"}`} description="حدّث بيانات الشركة الأساسية من صفحة التفاصيل نفسها."
        bodyClassName="space-y-4"
        footer={<ModalFooter loading={editSaving} onCancel={() => setEditOpen(false)} onConfirm={() => void handleSaveCompany()} confirmLabel="حفظ التعديلات" confirmIcon={CheckCircle2} />}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="اسم الشركة" error={editErrors.name} required>
            <Input value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} className="h-11 rounded-2xl" />
          </FormField>
          <FormField label="البريد الإلكتروني" error={editErrors.email} required>
            <Input type="email" value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} className="h-11 rounded-2xl" />
          </FormField>
          <FormField label="الهاتف">
            <Input value={editForm.phone} onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))} className="h-11 rounded-2xl" />
          </FormField>
          <FormField label="الموقع الإلكتروني">
            <Input value={editForm.website} onChange={(event) => setEditForm((current) => ({ ...current, website: event.target.value }))} className="h-11 rounded-2xl" />
          </FormField>
          <FormField label="الخطة" error={editErrors.plan} required>
            <Select value={editForm.plan} onValueChange={(value) => setEditForm((current) => ({ ...current, plan: value }))}>
              <SelectTrigger className="h-11 min-w-0 rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[{ value: "BASIC", label: "أساسي" }, { value: "PRO", label: "احترافي" }, { value: "ENTERPRISE", label: "مؤسسي" }].map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="العملة" error={editErrors.currency} required>
            <Select value={editForm.currency} onValueChange={(value) => setEditForm((current) => ({ ...current, currency: value }))}>
              <SelectTrigger className="h-11 min-w-0 rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((option) => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <div className="py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-black text-foreground">حالة الشركة</p>
              <p className="text-xs text-muted-foreground">التحكم في تفعيل أو إيقاف الشركة من نفس الشاشة.</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge isActive={editForm.isActive} />
              <Switch checked={editForm.isActive} onCheckedChange={(checked) => setEditForm((current) => ({ ...current, isActive: checked }))} />
            </div>
          </div>
        </div>
      </ResponsiveOverlay>

      <ResponsiveOverlay mobile={isMobile} open={transferOpen} onOpenChange={setTransferOpen}
        title={`نقل ملكية ${company?.name || "الشركة"}`} description="اختر العضو الذي سيحصل على صلاحيات المالك بالكامل."
        bodyClassName="space-y-4"
        footer={<ModalFooter loading={transferLoading} onCancel={() => setTransferOpen(false)} onConfirm={() => void handleTransferOwnership()} confirmLabel="تأكيد النقل" confirmIcon={ArrowLeftRight} disabled={!changeOwnerTargetUserId} />}
      >
        <Alert className="rounded-xl border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="size-4" />
          <AlertTitle>خطوة حساسة</AlertTitle>
          <AlertDescription>النقل يبدّل المالك الحالي ويمنح المستخدم المختار صلاحيات كاملة.</AlertDescription>
        </Alert>
        <FormField label="المالك الجديد" required>
          <Select value={changeOwnerTargetUserId} onValueChange={setChangeOwnerTargetUserId}>
            <SelectTrigger className="h-12 min-w-0 rounded-xl"><SelectValue placeholder="اختر المستخدم" /></SelectTrigger>
            <SelectContent>
              {companyUsers.length ? companyUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>{user.firstName} {user.lastName} - {getRoleLabel(user.role)}</SelectItem>
              )) : (
                <SelectItem value="__empty" disabled>{usersLoading ? "جاري التحميل..." : "لا يوجد أعضاء مؤهلون"}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </FormField>
      </ResponsiveOverlay>

      <ResponsiveOverlay mobile={isMobile} open={addEmployeeOpen} onOpenChange={setAddEmployeeOpen}
        title={`إضافة عضو إلى ${company?.name || "الشركة"}`} description="أضف مديرًا أو موظفًا جديدًا بدون مغادرة صفحة الشركة."
        bodyClassName="space-y-4"
        footer={<ModalFooter loading={employeeLoading} onCancel={() => setAddEmployeeOpen(false)} onConfirm={() => void handleAddEmployee()} confirmLabel="إضافة العضو" confirmIcon={UserPlus} />}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="الاسم الأول" error={addEmployeeErrors.firstName} required>
            <Input value={addEmployeeForm.firstName} onChange={(event) => setAddEmployeeForm((current) => ({ ...current, firstName: event.target.value }))} className="h-11 rounded-2xl" />
          </FormField>
          <FormField label="الاسم الأخير" error={addEmployeeErrors.lastName} required>
            <Input value={addEmployeeForm.lastName} onChange={(event) => setAddEmployeeForm((current) => ({ ...current, lastName: event.target.value }))} className="h-11 rounded-2xl" />
          </FormField>
          <FormField label="البريد الإلكتروني" error={addEmployeeErrors.email} required>
            <Input type="email" value={addEmployeeForm.email} onChange={(event) => setAddEmployeeForm((current) => ({ ...current, email: event.target.value }))} className="h-11 rounded-2xl md:col-span-2" />
          </FormField>
          <FormField label="كلمة المرور" error={addEmployeeErrors.password} required>
            <Input type="password" value={addEmployeeForm.password} onChange={(event) => setAddEmployeeForm((current) => ({ ...current, password: event.target.value }))} className="h-11 rounded-2xl" />
          </FormField>
          <FormField label="الصلاحية" required>
            <Select value={addEmployeeForm.role} onValueChange={(value) => setAddEmployeeForm((current) => ({ ...current, role: value }))}>
              <SelectTrigger className="h-11 min-w-0 rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EMPLOYEE_ROLE_OPTIONS.map((option) => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </ResponsiveOverlay>

      <ResponsiveOverlay mobile={isMobile} open={topUpOpen} onOpenChange={setTopUpOpen}
        title={`شحن محفظة ${company?.name || "الشركة"}`} description="أضف رصيدًا مباشرًا أو بونصًا للمحفظة من شاشة المراجعة."
        bodyClassName="space-y-4"
        footer={<ModalFooter loading={topUpLoading} onCancel={() => setTopUpOpen(false)} onConfirm={() => void handleTopUpWallet()} confirmLabel="تنفيذ الشحن" confirmIcon={Wallet} />}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="قيمة الشحن" error={topUpErrors.amount} required>
            <Input type="number" min="0" step="0.01" value={topUpForm.amount} onChange={(event) => setTopUpForm((current) => ({ ...current, amount: event.target.value }))} className="h-11 rounded-2xl" />
          </FormField>
          <FormField label="بونص إضافي" error={topUpErrors.bonus}>
            <Input type="number" min="0" step="0.01" value={topUpForm.bonus} onChange={(event) => setTopUpForm((current) => ({ ...current, bonus: event.target.value }))} className="h-11 rounded-2xl" />
          </FormField>
          <FormField label="ملاحظات">
            <Input value={topUpForm.notes} onChange={(event) => setTopUpForm((current) => ({ ...current, notes: event.target.value }))} className="h-11 rounded-2xl md:col-span-2" placeholder="مثال: شحن يدوي بعد مراجعة الحساب" />
          </FormField>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniStat label="الرصيد الحالي" value={formatCurrency(review?.wallet?.balance, reviewCurrency)} helper="قبل تنفيذ العملية" />
          <MiniStat label="إجمالي الإيداعات" value={formatCurrency(review?.wallet?.totalDeposited, reviewCurrency)} helper="قبل الشحن الجديد" />
          <MiniStat label="القيمة النهائية" value={formatCurrency((review?.wallet?.balance || 0) + topUpAmountPreview + topUpBonusPreview, reviewCurrency)} helper="رصيد تقديري بعد الشحن" valueClassName="text-emerald-700 dark:text-emerald-300" />
        </div>
      </ResponsiveOverlay>
    </div>
  );
};

export default SuperAdminCompanyDetails;
