import { AlertTriangle, ArrowLeft, ArrowLeftRight, CheckCircle2, Loader2, LogIn, MessageSquare, RefreshCw, Sparkles, Timer, UserPlus, Wallet, KeyRound, Store, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
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
  CompanyHeroCard, StatusBadge, MiniStat, MetricCard, FormField, ResponsiveOverlay, ModalFooter,
  CompanyBillingSection, CompanyTeamSection, CompanyWalletSection,
  CompanyLimitsSection, CompanyUsageSection,
  CompanyActivationCenter, CompanyPulse, CompanySupportTickets, CompanyRecentActivity,
  SectionShell,
} from "./company-details";
import { formatCurrency, getRoleLabel } from "./company-details/helpers";
import { useCompanyDetails } from "./company-details/useCompanyDetails";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import { Percent } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
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
  const [activeTab, setActiveTab] = useState("general");
  const [linkOpen, setLinkOpen] = useState(false);
  const [partnerCodeInput, setPartnerCodeInput] = useState("");
  const [linking, setLinking] = useState(false);
  const [specialties, setSpecialties] = useState<BusinessSpecialty[]>([]);

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

  return (
    <div className="space-y-4" dir={i18n.dir()}>
      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => navigate(-1)}>
                  <ArrowLeft className="size-4" /> رجوع
                </Button>
                <Button type="button" variant="outline" className="h-10 rounded-xl"
                  onClick={() => void refreshCompanyWorkspace({ background: true })} disabled={refreshing || loading}
                >
                  {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  تحديث
                </Button>
                {company?.slug || company?.customDomain ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl gap-1.5 text-primary border-primary/30 hover:bg-primary/5 font-bold"
                    onClick={() => {
                      const url = company.customDomain ? `https://${company.customDomain}` : `https://${company.slug}.maxp.online`;
                      window.open(url, "_blank");
                    }}
                  >
                    <Store className="size-4" /> المتجر الحي
                    <ExternalLink className="size-3 opacity-60" />
                  </Button>
                ) : null}
                <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={openLinkDialog} disabled={!company}>
                  <Percent className="size-4" /> اربط بوكيل
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* High-priority Impersonation button */}
                <Button
                  type="button"
                  className="h-10 rounded-xl bg-primary text-primary-foreground font-black shadow-2xs gap-1.5 px-4"
                  onClick={() => void handleLoginAsAdmin()}
                  disabled={!company}
                >
                  <KeyRound className="size-4" /> دخول كأدمن
                </Button>
                <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={openEditModal} disabled={!company}>
                  <Sparkles className="size-4" /> تعديل الشركة
                </Button>
                <Button type="button" variant={trialActive ? "outline" : "default"} className="h-10 rounded-xl" onClick={openTrialModal} disabled={!company}>
                  <Timer className="size-4" /> {trialActive ? "الفترة التجريبية" : "تفعيل تجريبي"}
                </Button>
                <Button type="button" variant="outline" className="h-10 rounded-xl border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold" onClick={openTopUpModal} disabled={!company}>
                  <Wallet className="size-4" /> شحن المحفظة
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
              <CompanyWalletSection review={review} reviewCurrency={reviewCurrency} openTopUpModal={openTopUpModal} navigate={navigate} />
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

          <FormField label="نوع الشركة (تخصص النشاط)">
            <Select
              value={editForm.businessSpecialtyId || "none"}
              onValueChange={(value: string | null) => setEditForm((current) => ({ ...current, businessSpecialtyId: value ?? "none" }))}
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
      <ResponsiveOverlay mobile={isMobile} open={trialOpen} onOpenChange={setTrialOpen}
        title={`الفترة التجريبية ${company?.name || "الشركة"}`} description="افتح فترة مجانية للشركة تثبّت فيها أي أداة من الماركت بلس بلا خصم من المحفظة، ثم تُجمَّد الأدوات بعد انتهائها ويُحصَّل الاستهلاك حسب الاستخدام."
        bodyClassName="space-y-4"
        footer={
          trialActive ? (
            <div className="flex w-full justify-between gap-3">
              <Button type="button" variant="destructive" className="h-11 rounded-2xl" onClick={() => void handleDeactivateTrial()} disabled={trialDeactivating}>
                {trialDeactivating ? <Loader2 className="size-4 animate-spin" /> : <Timer className="size-4" />}
                إيقاف التجربة وتجميد الأدوات
              </Button>
              <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={() => setTrialOpen(false)}>إغلاق</Button>
            </div>
          ) : (
            <div className="flex w-full justify-end gap-3">
              <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={() => setTrialOpen(false)} disabled={trialSaving}>إلغاء</Button>
              <Button type="button" className="h-11 rounded-2xl" onClick={() => void handleActivateTrial()} disabled={trialSaving}>
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
            <AlertDescription>بدأت {trialStartedAt ? new Date(trialStartedAt).toLocaleDateString("ar-EG") : "—"} وتنتهي {trialEndsAt ? new Date(trialEndsAt).toLocaleDateString("ar-EG") : "—"} ({trialDaysRemaining} يوم متبقي). كل أدوات الماركت بلس متاحة مجانًا الآن.</AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert className="rounded-xl border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
              <AlertTriangle className="size-4" />
              <AlertTitle>فترة مجانية (تفعيل تجريبي)</AlertTitle>
              <AlertDescription>خلالها تستطيع الشركة تثبيت أي أداة من الماركت بلس مجانًا. عند انتهاء المدة تُجمَّد الأدوات تلقائيًا ويُحصَّل الاستهلاك حسب الاستخدام من المحفظة.</AlertDescription>
            </Alert>
            <div className="space-y-3">
              <FormField label="مدة التجربة (أيام)" required>
                <Input type="number" min="1" step="1" value={trialDuration} onChange={(event: ChangeEvent<HTMLInputElement>) => setTrialDuration(event.target.value)} className="h-11 rounded-2xl" placeholder="مثال: 14" />
              </FormField>
              <div className="flex flex-wrap gap-2">
                {[7, 14, 30, 60, 90].map((days) => (
                  <Button key={days} type="button" variant={trialDuration === String(days) ? "default" : "outline"} size="sm" className="h-9 rounded-lg px-4 text-xs font-black"
                    onClick={() => setTrialDuration(String(days))}>
                    {days} يوم
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
      </ResponsiveOverlay>

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
            <Button type="button" variant="outline" onClick={() => setLinkOpen(false)} disabled={linking}>إلغاء</Button>
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
