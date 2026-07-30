import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, LogIn, MessageSquare, RefreshCw, Star, Users, CreditCard } from 'lucide-react';
import { useCallback, useState, type ChangeEvent } from "react";
import { cn } from "../../lib/utils";
import i18n from "../../i18n";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { Switch } from "../../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  CompanyHeroCard, StatusBadge, MiniStat, MetricCard, FormField, ResponsiveOverlay, ModalFooter,
  CompanyBillingSection, CompanyTeamSection, CompanyWalletSection,
  CompanySubscriptionSection, CompanyLimitsSection, CompanyUsageSection,
  CompanyActivationCenter, CompanyPulse, CompanySupportTickets, CompanyRecentActivity,
  SectionShell,
} from "./company-details";
import { formatCurrency, getRoleLabel } from "./company-details/helpers";
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
    handleInstallApp, handleSubscribeBundle, handleActivateAllTools,
    companyUsers, usersLoading, facebookPages, pagesLoading, openAddEmployeeModal, setTransferOpen,
    handleUpdateUserRole, handleToggleUserStatus, handleDeleteUser,
    deleteConfirmUserId, setDeleteConfirmUserId, deleteUserLoading,
    handleCancelSubscription, handleRetryPayment,
    companyTickets, ticketsLoading,
    companyActivities, activitiesLoading,
    toggleFeatureLoading, handleToggleFeature,
    editOpen, setEditOpen, editSaving, editForm, setEditForm, editErrors, handleSaveCompany,
    transferOpen, transferLoading, changeOwnerTargetUserId, setChangeOwnerTargetUserId, handleTransferOwnership,
    addEmployeeOpen, setAddEmployeeOpen, employeeLoading, addEmployeeForm, setAddEmployeeForm,
    addEmployeeErrors, handleAddEmployee, topUpOpen, setTopUpOpen, topUpLoading, topUpForm, setTopUpForm, topUpErrors,
    topUpAmountPreview, topUpBonusPreview, handleTopUpWallet,
  } = useCompanyDetails();
  const [activeTab, setActiveTab] = useState("general");
  const handleScrollToActivation = useCallback(() => {
    setActiveTab("activation");
    setTimeout(() => scrollToActivationSection(), 50);
  }, [scrollToActivationSection]);

  return (
    <div className="space-y-4" dir={i18n.dir()}>
      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={() => navigate(-1)}>
                  <ArrowLeft className="size-4" /> رجوع
                </Button>
                <Button type="button" variant="outline" className="h-11 rounded-2xl"
                  onClick={() => void refreshCompanyWorkspace({ background: true })} disabled={refreshing || loading}
                >
                  {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  تحديث
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={openEditModal} disabled={!company}>
                  <Sparkles className="size-4" /> تعديل الشركة
                </Button>
                <Button type="button" className="h-11 rounded-2xl" onClick={openTopUpModal} disabled={!company}>
                  <Wallet className="size-4" /> شحن المحفظة
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg text-xs font-bold text-muted-foreground hover:text-primary"
                onClick={() => void handleLoginAsAdmin()} disabled={!company}
              >
                <LogIn className="ml-1 size-3.5" /> دخول كأدمن
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
          {company ? (
            <CompanyPulse review={review} reviewCurrency={reviewCurrency}
              openTickets={companyTickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length}
              recentActivity={companyActivities[0] || null}
              activeUsers={companyUsers.filter((u) => u.isActive).length}
            />
          ) : null}
        </div>
      </div>

      {!loading && company ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-fit justify-start gap-1 rounded-xl bg-muted p-1">
            <TabsTrigger value="general" className="rounded-lg px-4 py-2 text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-sm">عام</TabsTrigger>
            <TabsTrigger value="financial" className="rounded-lg px-4 py-2 text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-sm">مالي</TabsTrigger>
            <TabsTrigger value="management" className="rounded-lg px-4 py-2 text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-sm">الإدارة</TabsTrigger>
            <TabsTrigger value="activation" className="rounded-lg px-4 py-2 text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-sm">تفعيل</TabsTrigger>
            <TabsTrigger value="team" className="rounded-lg px-4 py-2 text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-sm">فريق</TabsTrigger>
            <TabsTrigger value="support" className="rounded-lg px-4 py-2 text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-sm">دعم</TabsTrigger>
            <TabsTrigger value="activity" className="rounded-lg px-4 py-2 text-sm font-bold data-active:bg-background data-active:text-foreground data-active:shadow-sm">نشاط</TabsTrigger>

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
                <CompanySubscriptionSection review={review} reviewCurrency={reviewCurrency} company={company} nextBillingDate={nextBillingDate} scrollToActivationSection={handleScrollToActivation} handleCancelSubscription={handleCancelSubscription} handleRetryPayment={handleRetryPayment} />
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

          <TabsContent value="activation" className="pt-4">
            <CompanyActivationCenter
              orderedCatalogApps={orderedCatalogApps} resolvedBundles={resolvedBundles}
              appAction={appAction} bundleAction={bundleAction}
              installAllLoading={installAllLoading} activationLoading={activationLoading} activationError={activationError}
              handleInstallApp={handleInstallApp} handleSubscribeBundle={handleSubscribeBundle}
              handleActivateAllTools={handleActivateAllTools} appNameBySlug={appNameBySlug}
              company={company} handleToggleFeature={handleToggleFeature} toggleFeatureLoading={toggleFeatureLoading}
            />
          </TabsContent>

          <TabsContent value="team" className="pt-4">
            <CompanyTeamSection
              companyUsers={companyUsers} usersLoading={usersLoading} company={company}
              facebookPages={facebookPages} pagesLoading={pagesLoading}
              openAddEmployeeModal={openAddEmployeeModal}
              handleUpdateUserRole={handleUpdateUserRole} handleToggleUserStatus={handleToggleUserStatus}
              handleDeleteUser={handleDeleteUser}
              deleteConfirmUserId={deleteConfirmUserId} setDeleteConfirmUserId={setDeleteConfirmUserId}
              deleteUserLoading={deleteUserLoading}
            />
          </TabsContent>

          <TabsContent value="support" className="pt-4">
            <div className="space-y-4">
              <SectionShell title="تذاكر الدعم" description="التذاكر المرفوعة من مستخدمي هذه الشركة." actions={
                <Button type="button" variant="outline" size="sm" className="rounded-lg" asChild>
                  <a href="/support/admin/tickets"><MessageSquare className="size-3.5" /> كل التذاكر</a>
                </Button>
              }>
                <CompanySupportTickets tickets={companyTickets} companyId={company?.id || ""} loading={ticketsLoading} />
              </SectionShell>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="pt-4">
            <div className="space-y-4">
              <SectionShell title="النشاطات الأخيرة" description="آخر الأنشطة المسجلة في هذه الشركة.">
                <CompanyRecentActivity activities={companyActivities} loading={activitiesLoading} />
              </SectionShell>
            </div>
          </TabsContent>

        </Tabs>
      ) : null}

      <ResponsiveOverlay mobile={isMobile} open={editOpen} onOpenChange={setEditOpen}
        title={`تعديل ${company?.name || "الشركة"}`} description="حدّث بيانات الشركة الأساسية من صفحة التفاصيل نفسها."
        bodyClassName="space-y-4"
        footer={<ModalFooter loading={editSaving} onCancel={() => setEditOpen(false)} onConfirm={() => void handleSaveCompany()} confirmLabel="حفظ التعديلات" confirmIcon={CheckCircle2} />}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="اسم الشركة" error={editErrors["name"]} required>
            <Input value={editForm["name"]} onChange={(event: ChangeEvent<HTMLInputElement>) => setEditForm((current) => ({ ...current, name: event.target.value }))} className="h-11 rounded-2xl" />
          </FormField>
          <FormField label="البريد الإلكتروني" error={editErrors["email"]} required>
            <Input type="email" value={editForm["email"]} onChange={(event: ChangeEvent<HTMLInputElement>) => setEditForm((current) => ({ ...current, email: event.target.value }))} className="h-11 rounded-2xl" />
          </FormField>
          <FormField label="الهاتف">
            <Input value={editForm.phone} onChange={(event: ChangeEvent<HTMLInputElement>) => setEditForm((current) => ({ ...current, phone: event.target.value }))} className="h-11 rounded-2xl" />
          </FormField>
          <FormField label="الموقع الإلكتروني">
            <Input value={editForm.website} onChange={(event: ChangeEvent<HTMLInputElement>) => setEditForm((current) => ({ ...current, website: event.target.value }))} className="h-11 rounded-2xl" />
          </FormField>

          <FormField label="العملة" error={editErrors["currency"]} required>
            <Select value={editForm["currency"]} onValueChange={(value: string | null) => setEditForm((current) => ({ ...current, currency: value ?? "" }))}>
              <SelectTrigger className="h-11 min-w-0 rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((option) => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
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
              <Switch checked={editForm.isActive} onCheckedChange={(checked: boolean) => setEditForm((current) => ({ ...current, isActive: checked }))} />
            </div>
          </div>
        </div>
        <FormField label="ملاحظات">
          <Textarea value={editForm.notes} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setEditForm((current) => ({ ...current, notes: event.target.value }))} className="h-24 rounded-2xl" placeholder="أي ملاحظات عن الشركة..." />
        </FormField>
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
          <Select value={changeOwnerTargetUserId} onValueChange={(value: string | null) => setChangeOwnerTargetUserId(value ?? "")}>
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
          <FormField label="الاسم الأول" error={addEmployeeErrors["firstName"]} required>
            <Input value={addEmployeeForm["firstName"]} onChange={(event: ChangeEvent<HTMLInputElement>) => setAddEmployeeForm((current) => ({ ...current, firstName: event.target.value }))} className="h-11 rounded-2xl" />
          </FormField>
          <FormField label="الاسم الأخير" error={addEmployeeErrors["lastName"]} required>
            <Input value={addEmployeeForm["lastName"]} onChange={(event: ChangeEvent<HTMLInputElement>) => setAddEmployeeForm((current) => ({ ...current, lastName: event.target.value }))} className="h-11 rounded-2xl" />
          </FormField>
          <FormField label="البريد الإلكتروني" error={addEmployeeErrors["email"]} required>
            <Input type="email" value={addEmployeeForm["email"]} onChange={(event: ChangeEvent<HTMLInputElement>) => setAddEmployeeForm((current) => ({ ...current, email: event.target.value }))} className="h-11 rounded-2xl md:col-span-2" />
          </FormField>
          <FormField label="كلمة المرور" error={addEmployeeErrors["password"]} required>
            <Input type="password" value={addEmployeeForm["password"]} onChange={(event: ChangeEvent<HTMLInputElement>) => setAddEmployeeForm((current) => ({ ...current, password: event.target.value }))} className="h-11 rounded-2xl" />
          </FormField>
          <FormField label="الصلاحية" required>
            <Select value={addEmployeeForm.role} onValueChange={(value: string | null) => setAddEmployeeForm((current) => ({ ...current, role: value ?? "" }))}>
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
          <FormField label="قيمة الشحن" error={topUpErrors["amount"]} required>
            <Input type="number" min="0" step="0.01" value={topUpForm["amount"]} onChange={(event: ChangeEvent<HTMLInputElement>) => setTopUpForm((current) => ({ ...current, amount: event.target.value }))} className="h-11 rounded-2xl" />
          </FormField>
          <FormField label="بونص إضافي" error={topUpErrors["bonus"]} required>
            <Input type="number" min="0" step="0.01" value={topUpForm["bonus"]} onChange={(event: ChangeEvent<HTMLInputElement>) => setTopUpForm((current) => ({ ...current, bonus: event.target.value }))} className="h-11 rounded-2xl" />
          </FormField>
          <FormField label="ملاحظات">
            <Input value={topUpForm.notes} onChange={(event: ChangeEvent<HTMLInputElement>) => setTopUpForm((current) => ({ ...current, notes: event.target.value }))} className="h-11 rounded-2xl md:col-span-2" placeholder="مثال: شحن يدوي بعد مراجعة الحساب" />
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
