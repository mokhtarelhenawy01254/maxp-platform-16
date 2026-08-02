import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle,
  Cloud,
  Edit,
  Eye,
  FileText,
  Globe,
  Plus,
  Search,
  Send,
  Save,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { apiClient, type ApiRequestConfig } from "../../services/apiClient";
import {
  WhatsAppPageShell,
  WhatsAppSurfaceCard,
} from "./components/WhatsAppPageShell";

interface Template {
  id: string | null;
  name: string;
  category: string;
  eventType: string;
  content: string;
  isActive: boolean;
  isDefault: boolean;
  sentCount?: number;
  deliveredCount?: number;
  readCount?: number;
  metaTemplateName?: string | null;
  metaTemplateStatus?: string | null;
}

type NoticeTone = "success" | "error" | "warning" | "info";



type TemplateFormState = {
  name: string;
  category: string;
  eventType: string;
  content: string;
  isActive: boolean;
};

const categoryBadgeClasses: Record<string, string> = {
  ORDERS:
    "border-blue-300/70 bg-blue-500/10 text-blue-800 dark:border-blue-500/40 dark:text-blue-200",
  PRODUCTS:
    "border-violet-300/70 bg-violet-500/10 text-violet-800 dark:border-violet-500/40 dark:text-violet-200",
  MARKETING:
    "border-pink-300/70 bg-pink-500/10 text-pink-800 dark:border-pink-500/40 dark:text-pink-200",
  CUSTOMER:
    "border-sky-300/70 bg-sky-500/10 text-sky-800 dark:border-sky-500/40 dark:text-sky-200",
  ABANDONED_CART:
    "border-orange-300/70 bg-orange-500/10 text-orange-800 dark:border-orange-500/40 dark:text-orange-200",
  HR: "border-teal-300/70 bg-teal-500/10 text-teal-800 dark:border-teal-500/40 dark:text-teal-200",
  SYSTEM:
    "border-slate-300/70 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:text-slate-200",
};

const SUPER_ADMIN_EVENT_TYPES = [
  "NEW_SIGNUP_WELCOME",
  "NEW_SIGNUP_ADMIN_ALERT",
  "SUBSCRIPTION_CREATED",
  "SUBSCRIPTION_RENEWED",
  "SUBSCRIPTION_CANCELLED",
] as const;

const SUPER_ADMIN_EVENT_TYPE_SET = new Set<string>(SUPER_ADMIN_EVENT_TYPES);
const SUPER_ADMIN_CATEGORY_SET = new Set<string>(["CUSTOMER", "SYSTEM"]);

const createEmptyTemplateForm = (
  superAdminMode = false,
): TemplateFormState => ({
  name: "",
  category: superAdminMode ? "CUSTOMER" : "PRODUCTS",
  eventType: superAdminMode ? "NEW_SIGNUP_WELCOME" : "",
  content: "",
  isActive: true,
});

function TemplateMetric({
  icon: Icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  colorClass: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2 py-1.5">
      <Icon className={cn("size-4", colorClass)} />
      <div className="space-y-0.5 text-center">
        <p className={cn("text-sm font-semibold", colorClass)}>{value}</p>
        <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
          {label}
        </p>
      </div>
    </div>
  );
}

interface WhatsAppTemplatesProps {
  companyId?: string;
  companyName?: string;
  superAdminMode?: boolean;
}

const WhatsAppTemplates: React.FC<WhatsAppTemplatesProps> = ({
  companyId,
  companyName,
  superAdminMode = false,
}) => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const CATEGORY_LABELS = useMemo(
    () => {
      const translatedSystemLabel = t("common.system");
      const systemLabel =
        translatedSystemLabel && translatedSystemLabel !== "common.system"
          ? translatedSystemLabel
          : i18n.language === "ar"
            ? "النظام"
            : "System";

      return {
        PRODUCTS: t("whatsappNotifications.tabs.products"),
        CUSTOMER: i18n.language === "ar" ? "العملاء" : "Customers",
        MARKETING: t("whatsappNotifications.tabs.marketing"),
        ABANDONED_CART: t("whatsappNotifications.tabs.abandonedCart"),
        HR: t("whatsappNotifications.tabs.hr"),
        SYSTEM: systemLabel,
      };
    },
    [i18n.language, t],
  );

  const EVENT_LABELS = useMemo(
    () => ({
      BACK_IN_STOCK: t("whatsappNotifications.products.backInStock"),
      PRICE_DROP: t("whatsappNotifications.products.priceDrop"),
      NEW_PRODUCT: t("whatsappNotifications.products.newProduct"),
      CART_ABANDONED_1H: t("whatsappNotifications.abandonedCart.firstReminder"),
      CART_ABANDONED_24H: t("whatsappNotifications.abandonedCart.secondReminder"),
      CART_ABANDONED_72H: t("whatsappNotifications.abandonedCart.thirdReminder"),
      CART_ABANDONED_WITH_DISCOUNT: t("whatsappNotifications.abandonedCart.incentiveDiscount"),
      PROMOTIONAL: t("whatsappNotifications.marketing.promotional"),
      COUPON_SENT: t("whatsappNotifications.marketing.coupons"),
      BIRTHDAY_WISH: t("whatsappNotifications.marketing.birthday"),
      REVIEW_REQUEST: t("whatsappNotifications.products.priceDrop"),
      NEW_SIGNUP_WELCOME:
        i18n.language === "ar" ? "رسالة ترحيب بعد التسجيل" : "Welcome after signup",
      NEW_SIGNUP_ADMIN_ALERT:
        i18n.language === "ar" ? "تنبيه الإدارة بتسجيل جديد" : "Admin alert for new signup",
      SUBSCRIPTION_CREATED:
        i18n.language === "ar" ? "تأكيد إنشاء الاشتراك" : "Subscription created",
      SUBSCRIPTION_RENEWED:
        i18n.language === "ar" ? "تجديد الاشتراك" : "Subscription renewed",
      SUBSCRIPTION_CANCELLED:
        i18n.language === "ar" ? "إلغاء الاشتراك" : "Subscription cancelled",
      NEWSLETTER_SUBSCRIBED:
        i18n.language === "ar" ? "تأكيد الاشتراك في النشرة" : "Newsletter subscribed",
      BENEFIT_GRANTED:
        i18n.language === "ar" ? "إشعار المزايا" : "Benefit granted",
      ATTENDANCE_REMINDER: t("whatsappNotifications.hr.attendance"),
      ATTENDANCE_CONFIRMED: t("whatsappNotifications.hr.attendanceConfirmed"),
      CHECKOUT_CONFIRMED: t("whatsappNotifications.hr.checkoutConfirmed"),
      LEAVE_APPROVED: t("whatsappNotifications.hr.leave"),
      LEAVE_REJECTED: t("whatsappNotifications.hr.leave"),
      PERMISSION_APPROVED: t("whatsappNotifications.hr.permission"),
      PERMISSION_REJECTED: t("whatsappNotifications.hr.permission"),
      MANUAL_DEDUCTION: t("whatsappNotifications.hr.deduction"),
      PAYROLL_READY: t("whatsappNotifications.hr.payroll"),
      BIRTHDAY_EMPLOYEE: t("whatsappNotifications.hr.birthday"),
      WARNING_ISSUED: t("whatsappNotifications.hr.warnings"),
      ANNOUNCEMENT: t("whatsappNotifications.marketing.promotional"),
      OTP: i18n.language === "ar" ? "كود تسجيل الدخول عبر واتساب" : "WhatsApp login code",
    }),
    [i18n.language, t],
  );

  const availableCategoryEntries = useMemo(
    () =>
      Object.entries(CATEGORY_LABELS).filter(
        ([key]) => !superAdminMode || SUPER_ADMIN_CATEGORY_SET.has(key),
      ),
    [CATEGORY_LABELS, superAdminMode],
  );

  const availableEventEntries = useMemo(
    () =>
      Object.entries(EVENT_LABELS).filter(
        ([key]) => !superAdminMode || SUPER_ADMIN_EVENT_TYPE_SET.has(key),
      ),
    [EVENT_LABELS, superAdminMode],
  );

  const defaultCategory = (() => {
    const param = searchParams.get("category");
    if (param && param !== "ORDERS") return param;
    return "ALL";
  })();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategory, setTemplateCategory] = useState(defaultCategory);
  const [templateForm, setTemplateForm] =
    useState<TemplateFormState>(() => createEmptyTemplateForm(superAdminMode));

  const [metaSessions, setMetaSessions] = useState<{ id: string; name: string; metaDisplayPhoneNumber?: string }[]>([]);
  const [selectedMetaSession, setSelectedMetaSession] = useState("");
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const pageTitle = companyName
    ? `${t("whatsappNotifications.tabs.templates")} · ${companyName}`
    : t("whatsappNotifications.tabs.templates");

  const pageDescription =
    superAdminMode
      ? i18n.language === "ar"
        ? "أدر قوالب رسائل تسجيل الشركات والاشتراك التي تخص السوبر أدمن من مساحة واحدة."
        : "Manage platform-owned company signup and subscription WhatsApp message templates."
      : i18n.language === "ar"
        ? "تحكم في قوالب الرسائل الآلية وسلوك الإرسال عبر واتساب من مساحة واحدة."
        : "Control automation message templates and operational WhatsApp notification behavior from one workspace.";

  const withCompanyConfig = useCallback(
    (config: ApiRequestConfig = {}) =>
      companyId ? { ...config, _companyId: companyId } : config,
    [companyId],
  );

  const showNotice = useCallback((tone: NoticeTone, message: string) => {
    if (tone === "success") toast.success(message);
    else if (tone === "error") toast.error(message);
    else if (tone === "warning") toast.warning(message);
    else toast(message);
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await apiClient.get(
        "/whatsapp-notifications/templates",
        withCompanyConfig(),
      );
      setTemplates((response as any).data.templates || []);
    } catch (error) {
      console.error("Error loading WhatsApp templates:", error);
      showNotice(
        "error",
        i18n.language === "ar"
          ? "فشل في تحميل القوالب."
          : "Failed to load templates.",
      );
    }
  }, [withCompanyConfig, i18n.language, showNotice]);

  const fetchMetaSessions = useCallback(async () => {
    try {
      const res = await apiClient.get("/whatsapp/sessions", withCompanyConfig());
      const list: { id: string; name: string; provider: string; metaDisplayPhoneNumber?: string }[] = (res as any).data?.sessions || [];
      const cloudSessions = list.filter(s => s.provider === 'META_CLOUD');
      setMetaSessions(cloudSessions);
      if (cloudSessions.length > 0 && cloudSessions[0] && !selectedMetaSession) {
        setSelectedMetaSession(cloudSessions[0].id);
      }
    } catch { /* ignore */ }
  }, [withCompanyConfig, selectedMetaSession]);

  const publishToMeta = useCallback(async (templateId: string) => {
    if (!selectedMetaSession) {
      showNotice("warning", i18n.language === "ar" ? "اختر جلسة ميتا أولاً" : "Select a Meta session first");
      return;
    }
    setPublishingId(templateId);
    try {
      void apiClient.post(
        `/whatsapp-notifications/templates/${templateId}/publish`,
        { sessionId: selectedMetaSession },
        withCompanyConfig(),
      );
      showNotice("success",
        i18n.language === "ar"
          ? "تم إرسال القالب لميتا للمراجعة"
          : "Template sent to Meta for review");
      await fetchTemplates();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showNotice("error",
        i18n.language === "ar"
          ? `فشل النشر: ${err.response?.data?.error || err.message}`
          : `Publish failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setPublishingId(null);
    }
  }, [selectedMetaSession, withCompanyConfig, i18n.language, showNotice, fetchTemplates]);

  const refreshPageData = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchTemplates();
      await fetchMetaSessions();
    } catch (error) {
      console.error("Error refreshing WhatsApp templates:", error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchTemplates, fetchMetaSessions]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        if (mounted) {
          setLoading(true);
        }

        await fetchTemplates();
        await fetchMetaSessions();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      mounted = false;
    };
  }, [fetchTemplates, fetchMetaSessions]);

  // Sync category state with searchParams
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam && categoryParam !== "ORDERS" && categoryParam !== templateCategory) {
      setTemplateCategory(categoryParam);
    }
  }, [searchParams]);

  const handleCategoryChange = (val: string) => {
    setTemplateCategory(val);
    setSearchParams(prev => {
      if (val === "ALL") prev.delete("category");
      else prev.set("category", val);
      return prev;
    });
  };

  useEffect(() => {
    if (editingTemplate) {
      setTemplateForm({
        name: editingTemplate.name || "",
        category: editingTemplate.category || (superAdminMode ? "CUSTOMER" : "PRODUCTS"),
        eventType: editingTemplate.eventType || "",
        content: editingTemplate.content || "",
        isActive: editingTemplate.isActive ?? true,
      });
      return;
    }

    setTemplateForm(createEmptyTemplateForm(superAdminMode));
  }, [editingTemplate, superAdminMode, templateDialogOpen]);

  useEffect(() => {
    if (
      superAdminMode &&
      templateCategory !== "ALL" &&
      !SUPER_ADMIN_CATEGORY_SET.has(templateCategory)
    ) {
      handleCategoryChange("ALL");
    }
  }, [superAdminMode, templateCategory]);

  const saveTemplate = useCallback(async () => {
    if (!templateForm.content || !templateForm.eventType) {
      showNotice(
        "error",
        i18n.language === "ar"
          ? "يرجى ملء كل الحقول المطلوبة قبل حفظ القالب."
          : "Please complete all required template fields before saving.",
      );
      return;
    }

    try {
      setSaving(true);

      if (editingTemplate?.id) {
        await apiClient.put(
          `/whatsapp-notifications/templates/${editingTemplate.id}`,
          templateForm,
          withCompanyConfig(),
        );
      } else {
        await apiClient.post(
          "/whatsapp-notifications/templates",
          templateForm,
          withCompanyConfig(),
        );
      }

      showNotice(
        "success",
        i18n.language === "ar"
          ? "تم حفظ القالب بنجاح."
          : "Template saved successfully.",
      );
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      await fetchTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      showNotice(
        "error",
        i18n.language === "ar" ? "فشل في حفظ القالب." : "Failed to save template.",
      );
    } finally {
      setSaving(false);
    }
  }, [editingTemplate?.id, fetchTemplates, i18n.language, showNotice, templateForm, withCompanyConfig]);

  const openCreateTemplateDialog = useCallback(() => {
    setEditingTemplate(null);
    setTemplateForm(createEmptyTemplateForm(superAdminMode));
    setTemplateDialogOpen(true);
  }, [superAdminMode]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      if (template.category === "ORDERS") return false;

      const matchSearch =
        templateSearch.trim() === "" ||
        (template.name &&
          template.name.toLowerCase().includes(templateSearch.toLowerCase())) ||
        (template.eventType &&
          template.eventType.toLowerCase().includes(templateSearch.toLowerCase())) ||
        (template.content &&
          template.content.toLowerCase().includes(templateSearch.toLowerCase()));

      const matchCategory =
        templateCategory === "ALL" || template.category === templateCategory;

      return matchSearch && matchCategory;
    });
  }, [templates, templateSearch, templateCategory]);

  if (loading) {
    return (
      <WhatsAppPageShell
        title={pageTitle}
        description={pageDescription}
        icon={FileText}
      >
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[280px] rounded-3xl" />
          ))}
        </div>
      </WhatsAppPageShell>
    );
  }

  return (
    <WhatsAppPageShell
      title={pageTitle}
      description={pageDescription}
      icon={FileText}
      actions={
        <div className="flex items-center gap-2">
          {metaSessions.length > 0 ? (
            <Select value={selectedMetaSession} onValueChange={(v) => setSelectedMetaSession(v ?? '')}>
              <SelectTrigger className="h-9 w-auto min-w-[140px] rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] text-xs">
                <Globe className="size-3 me-1" />
                <SelectValue placeholder={i18n.language === 'ar' ? 'جلسة ميتا' : 'Meta session'} />
              </SelectTrigger>
              <SelectContent>
                {metaSessions.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.metaDisplayPhoneNumber || s.name || s.id.substring(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button
            variant="outline"
            onClick={refreshPageData}
            disabled={refreshing}
            className="rounded-full bg-[color:var(--color-muted)]"
          >
            {refreshing ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {i18n.language === "ar" ? "جاري التحديث..." : "Refreshing..."}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <RefreshCw className="size-4" />
                {i18n.language === "ar" ? "تحديث" : "Refresh"}
              </span>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <WhatsAppSurfaceCard
          title={
            superAdminMode
              ? i18n.language === "ar"
                ? "قوالب تسجيل الشركات"
                : "Company signup templates"
              : (t("whatsappNotifications.tabs.templates") as unknown as string)
          }
          description={
            superAdminMode
              ? i18n.language === "ar"
                ? "عدّل فقط القوالب الخاصة بتسجيل الشركات والاشتراك التي يستخدمها السوبر أدمن."
                : "Edit only the company-signup and subscription templates used by the super-admin workspace."
              : i18n.language === "ar"
                ? "ابحث داخل القوالب وعدّل المحتوى الذي يُرسل تلقائيًا لكل حدث."
                : "Search templates and edit the message content used by each automation event."
          }
          action={
            <Button
              className="rounded-full bg-[color:var(--color-primary)] text-white hover:brightness-90"
              onClick={openCreateTemplateDialog}
            >
              <Plus className="size-4" />
              {superAdminMode
                ? i18n.language === "ar"
                  ? "إضافة قالب تسجيل"
                  : "New signup template"
                : i18n.language === "ar"
                  ? "إضافة قالب جديد"
                  : "New template"}
            </Button>
          }
        >
          <div className="space-y-5">
            <div className="flex flex-col gap-4">
              {/* Search bar */}
              <div className="relative w-full">
                <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
                <Input
                  value={templateSearch}
                  onChange={(event) => setTemplateSearch(event.target.value)}
                  placeholder={String(t("common.search"))}
                  className="h-11 rounded-full bg-[color:var(--color-muted)] ps-10"
                />
              </div>

              {/* Category filter tabs */}
              <Tabs
                value={templateCategory}
                onValueChange={handleCategoryChange}
                className="w-full"
              >
                <TabsList className="flex h-auto flex-wrap justify-start gap-1.5 bg-transparent p-0">
                  <TabsTrigger
                    value="ALL"
                    className="rounded-full px-4 py-2 data-[state=active]:bg-[color:var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-md"
                  >
                    {i18n.language === "ar" ? "جميع التصنيفات" : "All categories"}
                  </TabsTrigger>
                  {availableCategoryEntries.map(([key, label]) => (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="rounded-full px-4 py-2 data-[state=active]:bg-[color:var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-md"
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {filteredTemplates.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] px-6 py-12 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-[color:var(--color-primary)]">
                  <FileText className="size-7" />
                </div>
                <div className="mt-4 space-y-2">
                  <h3 className="text-lg font-semibold text-[color:var(--color-foreground)]">
                    {i18n.language === "ar" ? "لا توجد قوالب مطابقة" : "No matching templates"}
                  </h3>
                  <p className="text-sm text-[color:var(--color-muted-foreground)]">
                    {i18n.language === "ar"
                      ? "جرّب تغيير كلمة البحث أو إعادة ضبط التصنيف الحالي."
                      : "Try adjusting the search term or clearing the active category filter."}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-2 rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:brightness-95"
                    onClick={() => {
                      setTemplateSearch("");
                      handleCategoryChange("ALL");
                    }}
                  >
                    {i18n.language === "ar" ? "إعادة ضبط الفلاتر" : "Reset filters"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id ?? template.eventType}
                    className="flex h-full flex-col rounded-3xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-5 shadow-md transition-transform duration-200 hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <h3 className="text-base font-semibold leading-7 text-[color:var(--color-foreground)]">
                          {template.name ||
                            EVENT_LABELS[
                              template.eventType as keyof typeof EVENT_LABELS
                            ] ||
                            template.eventType}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className={
                              categoryBadgeClasses[template.category as keyof typeof categoryBadgeClasses] ||
                              categoryBadgeClasses['SYSTEM']
                            }
                          >
                            {CATEGORY_LABELS[
                              template.category as keyof typeof CATEGORY_LABELS
                            ] || template.category}
                          </Badge>
                          {template.isDefault && !template.id ? (
                            <Badge
                              variant="outline"
                              className="rounded-full border-dashed border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] text-[color:var(--color-muted-foreground)]"
                            >
                              {i18n.language === "ar" ? "نظامي" : "System"}
                            </Badge>
                          ) : null}
                          <Badge
                            variant="outline"
                            className={
                              template.isActive !== false
                                ? "border-emerald-300/70 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/[0.08] dark:text-emerald-200"
                                : "border-slate-300/70 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:bg-slate-500/[0.08] dark:text-slate-300"
                            }
                          >
                            {template.isActive !== false
                              ? i18n.language === "ar"
                                ? "نشط"
                                : "Active"
                              : i18n.language === "ar"
                                ? "معطل"
                                : "Disabled"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {template.metaTemplateName ? (
                          <Badge
                            variant="outline"
                            className={
                              template.metaTemplateStatus === 'APPROVED'
                                ? 'border-emerald-300/70 bg-emerald-500/10 text-emerald-800'
                                : template.metaTemplateStatus === 'REJECTED'
                                  ? 'border-red-300/70 bg-red-500/10 text-red-800'
                                  : 'border-amber-300/70 bg-amber-500/10 text-amber-800'
                            }
                          >
                            <Cloud className="size-3 me-1" />
                            {template.metaTemplateStatus === 'APPROVED'
                              ? (i18n.language === 'ar' ? 'على ميتا' : 'On Meta')
                              : template.metaTemplateStatus === 'REJECTED'
                                ? (i18n.language === 'ar' ? 'مرفوض' : 'Rejected')
                                : template.metaTemplateStatus === 'PENDING'
                                  ? (i18n.language === 'ar' ? 'قيد المراجعة' : 'Pending')
                                  : template.metaTemplateStatus || (i18n.language === 'ar' ? 'منشور' : 'Published')}
                          </Badge>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-full bg-primary/6 text-[color:var(--color-primary)] hover:bg-primary/12"
                          onClick={() => {
                            setEditingTemplate(template);
                            setTemplateDialogOpen(true);
                          }}
                        >
                          <Edit className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {template.metaTemplateName && template.metaTemplateStatus !== 'APPROVED' ? null : (
                      <div className="mt-3 flex items-center gap-2">
                        {!selectedMetaSession ? (
                          <p className="text-xs text-muted-foreground">
                            {i18n.language === 'ar' ? 'لا توجد جلسة ميتا متاحة' : 'No Meta session available'}
                          </p>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            disabled={publishingId === template.id}
                            onClick={() => publishToMeta(template.id!)}
                          >
                            <Cloud className="size-3" />
                            {publishingId === template.id
                              ? (i18n.language === 'ar' ? 'جاري النشر...' : 'Publishing...')
                              : template.metaTemplateName
                                ? (i18n.language === 'ar' ? 'إعادة النشر' : 'Re-publish')
                                : (i18n.language === 'ar' ? 'نشر على ميتا' : 'Publish to Meta')}
                          </Button>
                        )}
                      </div>
                    )}

                    <div className="mt-4 rounded-2xl border border-emerald-200/80 bg-emerald-500/10 px-4 py-4 dark:border-emerald-500/40 dark:bg-emerald-500/[0.08]">
                      <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-800 dark:text-emerald-200">
                        {i18n.language === "ar" ? "محتوى الرسالة" : "Message preview"}
                      </p>
                      <p className="line-clamp-5 whitespace-pre-wrap text-sm leading-7 text-emerald-950 dark:text-emerald-100">
                        {template.content}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center rounded-xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--color-background)_86%,white)] px-2 py-2">
                      <TemplateMetric
                        icon={Send}
                        label={i18n.language === "ar" ? "مرسل" : "Sent"}
                        value={template.sentCount != null && template.sentCount > 0 ? template.sentCount : "—"}
                        colorClass="text-[color:var(--color-muted-foreground)]"
                      />
                      <Separator orientation="vertical" className="mx-1" />
                      <TemplateMetric
                        icon={CheckCircle}
                        label={i18n.language === "ar" ? "مستلم" : "Delivered"}
                        value={template.deliveredCount != null && template.deliveredCount > 0 ? template.deliveredCount : "—"}
                        colorClass="text-emerald-600 dark:text-emerald-400"
                      />
                      <Separator orientation="vertical" className="mx-1" />
                      <TemplateMetric
                        icon={Eye}
                        label={i18n.language === "ar" ? "مقروء" : "Read"}
                        value={template.readCount != null && template.readCount > 0 ? template.readCount : "—"}
                        colorClass="text-sky-600 dark:text-sky-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </WhatsAppSurfaceCard>

        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent className="max-w-2xl gap-0 p-0 sm:rounded-3xl">
            <div className="px-6 pb-4 pt-8 sm:px-8">
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-[color:var(--color-primary)]">
                    <Edit className="size-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">
                      {editingTemplate?.id
                        ? i18n.language === "ar"
                          ? "تعديل القالب"
                          : "Edit Template"
                        : i18n.language === "ar"
                          ? "قالب جديد"
                          : "New Template"}
                    </DialogTitle>
                    <DialogDescription className="mt-1.5 text-base">
                      {i18n.language === "ar"
                        ? "قم بتخصيص محتوى الرسالة التي سيتم إرسالها للعملاء."
                        : "Customize the message content that will be sent to customers."}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-6 py-6 sm:px-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">
                    {i18n.language === "ar" ? "اسم القالب (اختياري)" : "Template name (Optional)"}
                  </Label>
                  <Input
                    value={templateForm.name}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder={
                      i18n.language === "ar"
                        ? "مثال: ترحيب بالعملاء الجدد"
                        : "e.g., New customer welcome"
                    }
                    className="h-12 bg-[color:var(--color-muted)]"
                  />
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">
                      {i18n.language === "ar" ? "التصنيف" : "Category"}
                    </Label>
                    <Select
                      value={templateForm.category}
                      onValueChange={(val) =>
                        setTemplateForm((prev) => ({ ...prev, category: val ?? '' }))
                      }
                      disabled={superAdminMode}
                    >
                      <SelectTrigger className="h-12 bg-[color:var(--color-muted)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCategoryEntries.map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">
                      {i18n.language === "ar" ? "الحدث (Event)" : "Event type"}
                    </Label>
                    <Select
                      value={templateForm.eventType}
                      onValueChange={(val) =>
                        setTemplateForm((prev) => ({ ...prev, eventType: val ?? '' }))
                      }
                    >
                      <SelectTrigger className="h-12 bg-[color:var(--color-muted)]">
                        <SelectValue
                          placeholder={
                            i18n.language === "ar" ? "اختر الحدث..." : "Select event..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableEventEntries.map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">
                      {i18n.language === "ar" ? "محتوى الرسالة" : "Message content"}
                    </Label>
                    <div className="flex items-center gap-2 text-sm text-[color:var(--color-muted-foreground)]">
                      <span>{i18n.language === "ar" ? "تفعيل القالب" : "Enable template"}</span>
                      <Switch
                        checked={templateForm.isActive}
                        onCheckedChange={(checked) =>
                          setTemplateForm((prev) => ({ ...prev, isActive: checked }))
                        }
                      />
                    </div>
                  </div>
                  <Textarea
                    value={templateForm.content}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({ ...prev, content: e.target.value }))
                    }
                    placeholder={
                      i18n.language === "ar"
                        ? "اكتب رسالتك هنا...\nيمكنك استخدام المتغيرات مثل {{customer_name}}"
                        : "Type your message here...\nYou can use variables like {{customer_name}}"
                    }
                    className="min-h-[200px] resize-y bg-[color:var(--color-muted)] p-4 leading-7"
                    dir="auto"
                  />
                  <p className="text-sm text-[color:var(--color-muted-foreground)]">
                    {i18n.language === "ar"
                      ? "استخدم المتغيرات المتوفرة بناءً على نوع الحدث لتخصيص الرسالة."
                      : "Use available variables based on the event type to personalize the message."}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-6 py-5 sm:rounded-b-3xl sm:px-8">
              <DialogFooter className="gap-3 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setTemplateDialogOpen(false)}
                  className="rounded-full"
                >
                  {i18n.language === "ar" ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  onClick={saveTemplate}
                  disabled={saving}
                  className="rounded-full"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {i18n.language === "ar" ? "جاري الحفظ..." : "Saving..."}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="size-4" />
                      {i18n.language === "ar" ? "حفظ القالب" : "Save template"}
                    </span>
                  )}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </WhatsAppPageShell>
  );
};

export default WhatsAppTemplates;
