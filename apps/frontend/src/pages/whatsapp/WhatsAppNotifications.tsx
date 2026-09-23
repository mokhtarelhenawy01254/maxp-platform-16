import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bell,
  Briefcase,
  CheckCircle,
  Edit,
  FileText,
  Megaphone,
  Plus,
  RefreshCw,
  Save,
  Send,
  Settings,
  ShoppingCart,
  Smartphone,
  TestTube,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
// Separator removed (unused)
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { apiClient, type ApiRequestConfig } from "../../services/apiClient";
import {
  WhatsAppMetricCard,
  WhatsAppPageShell,
  WhatsAppSurfaceCard,
} from "./components/WhatsAppPageShell";
import { WhatsAppScheduledReportsTab } from "./scheduled-reports/WhatsAppScheduledReportsTab";

interface NotificationSettings {
  id: string;
  companyId: string;
  isEnabled: boolean;
  defaultSessionId: string | null;
  stickySessionEnabled: boolean;
  orderNotificationsEnabled: boolean;
  orderCreatedEnabled: boolean;
  orderConfirmedEnabled: boolean;
  orderProcessingEnabled: boolean;
  orderShippedEnabled: boolean;
  orderDeliveredEnabled: boolean;
  orderCancelledEnabled: boolean;
  paymentReminderEnabled: boolean;
  paymentReminderHours: number;
  productNotificationsEnabled: boolean;
  backInStockEnabled: boolean;
  priceDropEnabled: boolean;
  newProductEnabled: boolean;
  abandonedCartEnabled: boolean;
  abandonedCartFirstReminder: number;
  abandonedCartSecondReminder: number;
  abandonedCartThirdReminder: number;
  abandonedCartDiscountEnabled: boolean;
  abandonedCartDiscountPercent: number;
  marketingNotificationsEnabled: boolean;
  promotionalEnabled: boolean;
  couponEnabled: boolean;
  birthdayEnabled: boolean;
  loyaltyEnabled: boolean;
  companyLifecycleNotificationsEnabled: boolean;
  newSignupWelcomeEnabled: boolean;
  newSignupAdminAlertEnabled: boolean;
  companyLifecycleAdminPhones: string | null;
  companyLifecycleAdminRoutingMode: string;
  subscriptionCreatedEnabled: boolean;
  subscriptionRenewedEnabled: boolean;
  subscriptionCancelledEnabled: boolean;
  newsletterSubscribedEnabled: boolean;
  benefitGrantedEnabled: boolean;
  hrNotificationsEnabled: boolean;
  attendanceReminderEnabled: boolean;
  attendanceConfirmedEnabled: boolean;
  checkoutConfirmedEnabled: boolean;
  leaveApprovalEnabled: boolean;
  permissionApprovalEnabled: boolean;
  manualDeductionEnabled: boolean;
  payrollEnabled: boolean;
  birthdayWishEnabled: boolean;
  warningNotificationEnabled: boolean;
  taskNotificationsEnabled: boolean;
  taskCreatedEnabled: boolean;
  taskUpdatedEnabled: boolean;
  taskStatusChangedEnabled: boolean;
  taskCommentedEnabled: boolean;
  taskAttachmentAddedEnabled: boolean;
  taskDeletedEnabled: boolean;
  taskWatcherAddedEnabled: boolean;
  taskExecutionCheckEnabled: boolean;
  taskDeadlineReminderEnabled: boolean;
  taskOverdueEnabled: boolean;
  taskSubtaskCreatedEnabled: boolean;
  taskChecklistItemCompletedEnabled: boolean;
  taskTimeEntryAddedEnabled: boolean;
  rateLimitPerMinute: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

interface Session {
  id: string;
  name: string;
  phoneNumber: string;
  status?: string;
}

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
}

type NoticeTone = "success" | "error" | "warning" | "info";

type NoticeState = {
  tone: NoticeTone;
  message: string;
} | null;

type TemplateFormState = {
  name: string;
  category: string;
  eventType: string;
  content: string;
  isActive: boolean;
};

type TabId =
  | "general"
  | "products"
  | "marketing"
  | "company"
  | "hr"
  | "tasks"
  | "reports";

const _categoryBadgeClasses: Record<string, string> = {
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
void _categoryBadgeClasses;

const sessionStatusClasses: Record<string, string> = {
  CONNECTED:
    "border-emerald-300/70 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-200",
  QR_PENDING:
    "border-amber-300/70 bg-amber-500/10 text-amber-800 dark:border-amber-500/40 dark:text-amber-200",
  DISCONNECTED:
    "border-slate-300/70 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:text-slate-200",
};

const noticeStyles: Record<NoticeTone, string> = {
  success:
    "border-emerald-300/70 bg-emerald-500/10 text-emerald-900 dark:border-emerald-500/40 dark:text-emerald-100",
  error:
    "border-rose-300/70 bg-rose-500/10 text-rose-900 dark:border-rose-500/40 dark:text-rose-100",
  warning:
    "border-amber-300/70 bg-amber-500/10 text-amber-900 dark:border-amber-500/40 dark:text-amber-100",
  info: "border-sky-300/70 bg-sky-500/10 text-sky-900 dark:border-sky-500/40 dark:text-sky-100",
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

function parseInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function FeatureToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[color:var(--color-foreground)]">
            {label}
          </p>
          {description ? (
            <p className="text-sm leading-6 text-[color:var(--color-muted-foreground)]">
              {description}
            </p>
          ) : null}
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
  toneClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  toneClass: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-5 shadow-md sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", toneClass)}>
          <Icon className="size-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-[color:var(--color-foreground)]">
            {title}
          </h3>
          <p className="max-w-2xl text-sm leading-6 text-[color:var(--color-muted-foreground)]">
            {description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className={cn(
            "rounded-full px-2.5",
            checked
              ? "border-emerald-300/70 bg-emerald-500/10 text-emerald-800"
              : "border-slate-300/70 bg-slate-500/10 text-slate-700",
          )}
        >
          {checked ? "Active" : "Paused"}
        </Badge>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}

function _TemplateMetric({
  icon: Icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
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
void _TemplateMetric;

interface WhatsAppNotificationsProps {
  companyId?: string;
  companyName?: string;
  superAdminMode?: boolean;
}

const WhatsAppNotifications: React.FC<WhatsAppNotificationsProps> = ({
  companyId,
  companyName,
  superAdminMode = false,
}) => {
  const { t, i18n } = useTranslation();
  const ts = (key: string, opts?: Record<string, unknown>) => (t(key, opts as any) as unknown) as string;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageTitle = companyName
    ? `${t("whatsappNotifications.title")} · ${companyName}`
    : t("whatsappNotifications.title");
  const settingsHref =
    superAdminMode && companyId
      ? `/super-admin/whatsapp/companies/${companyId}/settings`
      : "/whatsapp/settings";
  const automationsHref =
    superAdminMode
      ? companyId
        ? `/super-admin/whatsapp/automations?companyId=${companyId}`
        : "/super-admin/whatsapp/automations"
      : "/whatsapp/customer-journey";
  const eyebrow =
    superAdminMode && companyName
      ? i18n.language === "ar"
        ? `شركة: ${companyName}`
        : `Company: ${companyName}`
      : undefined;

  const pageDescription =
    superAdminMode
      ? i18n.language === "ar"
        ? "أدر رسائل تسجيل الشركات والاشتراك التي تخص السوبر أدمن من مساحة واحدة، بدون خلط مع إشعارات الطلبات أو العملاء."
        : "Manage platform-owned company signup and subscription WhatsApp messages without mixing them with store order or customer automations."
      : i18n.language === "ar"
        ? "تحكم في الإشعارات الآلية، قوالب الرسائل، وسلوك الإرسال عبر واتساب من مساحة واحدة."
        : "Control automation, message templates, and operational WhatsApp notification behavior from one workspace.";

  const TABS = useMemo(
    () => {
      if (superAdminMode) {
        return [
          {
            id: "company",
            label: i18n.language === "ar" ? "تسجيل الشركات" : "Company signup",
            icon: Bell,
          },
        ] satisfies Array<{
          id: TabId;
          label: string;
          icon: React.ComponentType<{ className?: string }>;
        }>;
      }

      return [
        { id: "general", label: t("whatsappNotifications.tabs.general"), icon: Settings },
        { id: "products", label: t("whatsappNotifications.tabs.products"), icon: ShoppingCart },
        { id: "marketing", label: t("whatsappNotifications.tabs.marketing"), icon: Megaphone },
        {
          id: "company",
          label: i18n.language === "ar" ? "رحلة الشركة" : "Company journey",
          icon: Bell,
        },
        { id: "hr", label: t("whatsappNotifications.tabs.hr"), icon: Briefcase },
        { id: "tasks", label: "المهام", icon: Briefcase },
        {
          id: "reports",
          label: t("whatsappNotifications.tabs.reports", i18n.language === "ar" ? "التقارير المجدولة" : "Scheduled Reports"),
          icon: BarChart3,
        },
      ] satisfies Array<{
        id: TabId;
        label: string;
        icon: React.ComponentType<{ className?: string }>;
      }>;
    },
    [i18n.language, superAdminMode, t],
  );

  const activeTabParam = searchParams.get("tab");
  const activeTab = TABS.some((tab) => tab.id === activeTabParam)
    ? (activeTabParam as TabId)
    : superAdminMode
      ? "company"
      : "general";

  const STATUS_LABELS = useMemo(
    () => ({
      CONNECTED: i18n.language === "ar" ? "متصل" : "Connected",
      QR_PENDING: i18n.language === "ar" ? "في انتظار الربط" : "Pending QR",
      DISCONNECTED: i18n.language === "ar" ? "غير متصل" : "Disconnected",
    }),
    [i18n.language],
  );

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
        TASKS: "المهام",
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
      LOYALTY_POINTS_AWARDED:
        i18n.language === "ar" ? "إشعار كسب نقاط ولاء" : "Loyalty points awarded",
      LOYALTY_TIER_UPGRADED:
        i18n.language === "ar" ? "الترقية لمستوى أعلى" : "Loyalty tier upgrade",
      LOYALTY_TIER_DOWNGRADED:
        i18n.language === "ar" ? "انخفاض مستوى الولاء" : "Loyalty tier downgrade",
      LOYALTY_POINTS_EXPIRY_WARNING:
        i18n.language === "ar" ? "تنبيه قرب انتهاء النقاط" : "Points expiry warning",
      LOYALTY_POINTS_EXPIRED:
        i18n.language === "ar" ? "انتهاء صلاحية النقاط" : "Loyalty points expired",
      LOYALTY_POINTS_REDEEMED:
        i18n.language === "ar" ? "استبدال النقاط" : "Loyalty points redeemed",
      CASHBACK_CREDITED:
        i18n.language === "ar" ? "ايداع كاش باك" : "Cashback credited",
      CASHBACK_REVERSED:
        i18n.language === "ar" ? "خصم كاش باك" : "Cashback reversed",
      CUSTOMER_QUALITY_UPGRADED:
        i18n.language === "ar" ? "ارتفاع تصنيف الجودة" : "Customer quality upgrade",
      CUSTOMER_QUALITY_DOWNGRADED:
        i18n.language === "ar" ? "انخفاض تصنيف الجودة" : "Customer quality downgrade",
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
      // أحداث المهام
      TASK_CREATED: "إنشاء مهمة جديدة",
      TASK_UPDATED: "تحديث مهمة",
      TASK_STATUS_CHANGED: "تغيير حالة مهمة",
      TASK_COMMENTED: "تعليق على مهمة",
      TASK_ATTACHMENT_ADDED: "مرفق جديد",
      TASK_DELETED: "حذف مهمة",
      TASK_WATCHER_ADDED: "إضافة مراقب",
      TASK_EXECUTION_CHECK: "سؤال تنفيذ مهمة",
      TASK_EXECUTION_CHECK_SENT: "تم إرسال سؤال تنفيذ",
      TASK_EXECUTION_RESPONSE: "رد المنفذ",
      TASK_DEADLINE_REMINDER: "تذكير باقتراب الموعد",
      TASK_OVERDUE: "مهمة متأخرة",
      TASK_SUBTASK_CREATED: "مهمة فرعية جديدة",
      TASK_TIME_ENTRY_ADDED: "تسجيل وقت",
      TASK_CHECKLIST_ITEM_COMPLETED: "إتمام عنصر قائمة",
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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [notice, setNotice] = useState<NoticeState>(null);

  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testEventType, setTestEventType] = useState(
    superAdminMode ? "NEW_SIGNUP_WELCOME" : "BACK_IN_STOCK",
  );
  const [sendingTest, setSendingTest] = useState(false);

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateSearch, _setTemplateSearch] = useState("");
  const [templateCategory, setTemplateCategory] = useState("ALL");
  const [templateForm, setTemplateForm] =
    useState<TemplateFormState>(() => createEmptyTemplateForm(superAdminMode));
  const withCompanyConfig = useCallback(
    (config: ApiRequestConfig = {}) =>
      companyId ? { ...config, _companyId: companyId } : config,
    [companyId],
  );

  const showNotice = useCallback((tone: NoticeTone, message: string) => {
    setNotice({ tone, message });
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timeoutId = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const fetchSettings = useCallback(async () => {
    const response = await apiClient.get(
      "/whatsapp-notifications/settings",
      withCompanyConfig(),
    );
    setSettings((response as any).data.settings);
    setSessions((response as any).data.sessions || []);
  }, [withCompanyConfig]);

  const fetchTemplates = useCallback(async () => {
    const response = await apiClient.get(
      "/whatsapp-notifications/templates",
      withCompanyConfig(),
    );
    setTemplates((response as any).data.templates || []);
  }, [withCompanyConfig]);

  const refreshPageData = useCallback(async () => {
    try {
      setRefreshing(true);
      setNotice(null);
      await Promise.all([fetchSettings(), fetchTemplates()]);
    } catch (error) {
      console.error("Error refreshing WhatsApp notifications:", error);
      showNotice(
        "error",
        i18n.language === "ar"
          ? "تعذر تحديث بيانات الإشعارات حالياً."
          : "Unable to refresh notification data right now.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [fetchSettings, fetchTemplates, i18n.language, showNotice]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        if (mounted) {
          setLoading(true);
          setNotice(null);
        }

        await Promise.all([fetchSettings(), fetchTemplates()]);
      } catch (error) {
        console.error("Error loading WhatsApp notifications:", error);
        if (mounted) {
          showNotice(
            "error",
            i18n.language === "ar"
              ? "فشل في تحميل إعدادات إشعارات واتساب."
              : "Failed to load WhatsApp notification settings.",
          );
        }
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
  }, [fetchSettings, fetchTemplates, i18n.language, showNotice]);

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
    const defaultEventType = superAdminMode ? "NEW_SIGNUP_WELCOME" : "BACK_IN_STOCK";
    const allowedEvents = new Set(availableEventEntries.map(([key]) => key));

    if (!allowedEvents.has(testEventType)) {
      setTestEventType(defaultEventType);
    }
  }, [availableEventEntries, superAdminMode, testEventType]);

  useEffect(() => {
    if (
      superAdminMode &&
      templateCategory !== "ALL" &&
      !SUPER_ADMIN_CATEGORY_SET.has(templateCategory)
    ) {
      setTemplateCategory("ALL");
    }
  }, [superAdminMode, templateCategory]);

  const updateSetting = useCallback(
    <K extends keyof NotificationSettings>(
      key: K,
      value: NotificationSettings[K],
    ) => {
      setSettings((current) => (current ? { ...current, [key]: value } : current));
    },
    [],
  );

  const saveSettings = useCallback(async () => {
    if (!settings) return;

    try {
      setSaving(true);
      await apiClient.put(
        "/whatsapp-notifications/settings",
        settings,
        withCompanyConfig(),
      );
      showNotice(
        "success",
        i18n.language === "ar"
          ? "تم حفظ إعدادات الإشعارات بنجاح."
          : "Notification settings saved successfully.",
      );
    } catch (error) {
      console.error("Error saving notification settings:", error);
      showNotice(
        "error",
        i18n.language === "ar"
          ? "فشل في حفظ إعدادات الإشعارات."
          : "Failed to save notification settings.",
      );
    } finally {
      setSaving(false);
    }
  }, [i18n.language, settings, showNotice, withCompanyConfig]);

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

  const sendTestNotification = useCallback(async () => {
    if (!testPhone.trim()) {
      showNotice(
        "error",
        i18n.language === "ar" ? "يرجى إدخال رقم الهاتف." : "Please enter a phone number.",
      );
      return;
    }

    try {
      setSendingTest(true);
      const response = await apiClient.post(
        "/whatsapp-notifications/test",
        {
          phone: testPhone,
          eventType: testEventType,
        },
        withCompanyConfig(),
      );
      showNotice(
        "success",
        (response as any).data?.message ||
          (i18n.language === "ar"
            ? "تم إرسال الإشعار الاختباري بنجاح."
            : "Test notification sent successfully."),
      );
      setTestDialogOpen(false);
    } catch (error: unknown) {
      console.error("Error sending test notification:", error);
      const responseData =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: unknown }).response === "object" &&
        (error as { response?: { data?: unknown } }).response !== null
          ? (error as { response?: { data?: { message?: string; error?: string } } })
              .response?.data
          : undefined;
      showNotice(
        "error",
        responseData?.message ||
          responseData?.error ||
          (i18n.language === "ar"
            ? "فشل في إرسال الإشعار الاختباري."
            : "Failed to send the test notification."),
      );
    } finally {
      setSendingTest(false);
    }
  }, [i18n.language, showNotice, testEventType, testPhone, withCompanyConfig]);

  const filteredTemplates = useMemo(() => {
    const allowedEvents = new Set(availableEventEntries.map(([key]) => key));

    return templates.filter((template) => {
      if (template.category === "ORDERS") return false;

      if (superAdminMode && !allowedEvents.has(template.eventType)) {
        return false;
      }

      const name = template.name || EVENT_LABELS[template.eventType as keyof typeof EVENT_LABELS] || template.eventType;
      const matchesSearch =
        name.toLowerCase().includes(templateSearch.toLowerCase()) ||
        template.content.toLowerCase().includes(templateSearch.toLowerCase());
      const matchesCategory =
        templateCategory === "ALL" || template.category === templateCategory;
      return matchesSearch && matchesCategory;
    });
  }, [
    EVENT_LABELS,
    availableEventEntries,
    superAdminMode,
    templateCategory,
    templateSearch,
    templates,
  ]);

  const connectedSessions = sessions.filter(
    (session) => session.status === "CONNECTED",
  ).length;
  const enabledModules = (
    superAdminMode
      ? [settings?.companyLifecycleNotificationsEnabled]
      : [
          settings?.orderNotificationsEnabled,
          settings?.productNotificationsEnabled,
          settings?.abandonedCartEnabled,
          settings?.marketingNotificationsEnabled,
          settings?.companyLifecycleNotificationsEnabled,
          settings?.hrNotificationsEnabled,
        ]
  ).filter(Boolean).length;
  const activeTemplates = filteredTemplates.filter(
    (template) => template.isActive !== false,
  ).length;
  const currentSession = sessions.find(
    (session) => session.id === settings?.defaultSessionId,
  );

  const productOptions = useMemo(
    () => [
      {
        key: "backInStockEnabled" as const,
        label: t("whatsappNotifications.products.backInStock"),
        description: t("whatsappNotifications.products.backInStockHelp"),
      },
      {
        key: "priceDropEnabled" as const,
        label: t("whatsappNotifications.products.priceDrop"),
        description: t("whatsappNotifications.products.priceDropHelp"),
      },
      {
        key: "newProductEnabled" as const,
        label: t("whatsappNotifications.products.newProduct"),
        description: t("whatsappNotifications.products.newProductHelp"),
      },
    ],
    [t],
  );

  const marketingOptions = useMemo(
    () => [
      {
        key: "promotionalEnabled" as const,
        label: t("whatsappNotifications.marketing.promotional"),
      },
      {
        key: "couponEnabled" as const,
        label: t("whatsappNotifications.marketing.coupons"),
      },
      {
        key: "birthdayEnabled" as const,
        label: t("whatsappNotifications.marketing.birthday"),
      },
    ],
    [t],
  );

  const companyOptions = useMemo(
    () => {
      const baseOptions = [
        {
          key: "newSignupWelcomeEnabled" as const,
          label:
            i18n.language === "ar"
              ? "رسالة الترحيب بعد التسجيل"
              : "Welcome message after signup",
          description:
            i18n.language === "ar"
              ? "ترحيب تلقائي لصاحب الشركة أو العميل عند اكتمال التسجيل في المسارات الداعمة."
              : "Automatic welcome message after supported signup flows complete.",
        },
        {
          key: "newSignupAdminAlertEnabled" as const,
          label:
            i18n.language === "ar"
              ? "تنبيه الإدارة أو صاحب الشركة"
              : "Leadership signup alert",
          description:
            i18n.language === "ar"
              ? "تنبيه داخلي عند وجود تسجيل عميل أو Lead أو عضو جديد."
              : "Internal alert when a new customer, lead, or member signs up.",
        },
        {
          key: "subscriptionCreatedEnabled" as const,
          label:
            i18n.language === "ar"
              ? "تأكيد إنشاء الاشتراك"
              : "Subscription created",
        },
        {
          key: "subscriptionRenewedEnabled" as const,
          label:
            i18n.language === "ar"
              ? "تنبيه تجديد الاشتراك"
              : "Subscription renewed",
        },
        {
          key: "subscriptionCancelledEnabled" as const,
          label:
            i18n.language === "ar"
              ? "تنبيه إلغاء الاشتراك"
              : "Subscription cancelled",
        },
      ];

      if (superAdminMode) {
        return baseOptions;
      }

      return [
        ...baseOptions,
        {
          key: "newsletterSubscribedEnabled" as const,
          label:
            i18n.language === "ar"
              ? "اشتراك النشرة الإخبارية"
              : "Newsletter signup",
          description:
            i18n.language === "ar"
              ? "يشمل رسالة التأكيد والتنبيه الداخلي عند الاشتراك في النشرة."
              : "Covers both the confirmation and the internal newsletter alert.",
        },
        {
          key: "benefitGrantedEnabled" as const,
          label:
            i18n.language === "ar"
              ? "إشعار المزايا والكوبونات"
              : "Benefits and coupons",
        },
      ];
    },
    [i18n.language, superAdminMode],
  );

  const hrOptions = useMemo(
    () => [
      {
        key: "attendanceReminderEnabled" as const,
        label: t("whatsappNotifications.hr.attendance"),
      },
      {
        key: "attendanceConfirmedEnabled" as const,
        label: t("whatsappNotifications.hr.attendanceConfirmed"),
      },
      {
        key: "checkoutConfirmedEnabled" as const,
        label: t("whatsappNotifications.hr.checkoutConfirmed"),
      },
      {
        key: "leaveApprovalEnabled" as const,
        label: t("whatsappNotifications.hr.leave"),
      },
      {
        key: "permissionApprovalEnabled" as const,
        label: t("whatsappNotifications.hr.permission"),
      },
      {
        key: "payrollEnabled" as const,
        label: t("whatsappNotifications.hr.payroll"),
      },
      {
        key: "birthdayWishEnabled" as const,
        label: t("whatsappNotifications.hr.birthday"),
      },
      {
        key: "warningNotificationEnabled" as const,
        label: t("whatsappNotifications.hr.warnings"),
      },
    ],
    [t],
  );

  const taskOptions = useMemo(
    () => [
      {
        key: "taskCreatedEnabled" as const,
        label: "إنشاء مهمة جديدة",
      },
      {
        key: "taskUpdatedEnabled" as const,
        label: "تحديث مهمة",
      },
      {
        key: "taskStatusChangedEnabled" as const,
        label: "تغيير حالة مهمة",
      },
      {
        key: "taskCommentedEnabled" as const,
        label: "تعليق على مهمة",
      },
      {
        key: "taskAttachmentAddedEnabled" as const,
        label: "مرفق جديد",
      },
      {
        key: "taskDeletedEnabled" as const,
        label: "حذف مهمة",
      },
      {
        key: "taskWatcherAddedEnabled" as const,
        label: "إضافة مراقب",
      },
      {
        key: "taskExecutionCheckEnabled" as const,
        label: "سؤال تنفيذ مهمة",
      },
      {
        key: "taskDeadlineReminderEnabled" as const,
        label: "تذكير باقتراب الموعد",
      },
      {
        key: "taskOverdueEnabled" as const,
        label: "مهمة متأخرة",
      },
      {
        key: "taskSubtaskCreatedEnabled" as const,
        label: "مهمة فرعية جديدة",
      },
      {
        key: "taskChecklistItemCompletedEnabled" as const,
        label: "إتمام عنصر قائمة",
      },
      {
        key: "taskTimeEntryAddedEnabled" as const,
        label: "تسجيل وقت",
      },
    ],
    [],
  );

  const manualAdminRecipientCount = useMemo(() => {
    if (!settings?.companyLifecycleAdminPhones) {
      return 0;
    }

    return settings.companyLifecycleAdminPhones
      .split(/[\r\n,;،]+/)
      .map((value) => value.trim())
      .filter(Boolean).length;
  }, [settings?.companyLifecycleAdminPhones]);

  const _openCreateTemplateDialog = () => {
    setEditingTemplate(null);
    setTemplateForm(createEmptyTemplateForm(superAdminMode));
    setTemplateDialogOpen(true);
  };
  void _openCreateTemplateDialog;

  if (loading) {
    return (
      <WhatsAppPageShell
        title={pageTitle}
        description={pageDescription}
        icon={Bell}
        backHref={settingsHref}
        backLabel={ts("common.back") as string}
        eyebrow={eyebrow}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-16 rounded-3xl" />
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-80 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      </WhatsAppPageShell>
    );
  }

  if (!settings) {
    return (
      <WhatsAppPageShell
        title={pageTitle}
        description={pageDescription}
        icon={Bell}
        backHref={settingsHref}
        backLabel={ts("common.back") as string}
        eyebrow={eyebrow}
        actions={
          <Button
            variant="outline"
            className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:brightness-95"
            onClick={() => void refreshPageData()}
          >
            <RefreshCw className="size-4" />
            {t("common.refresh")}
          </Button>
        }
      >
        <Alert className="rounded-3xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
          <AlertTriangle className="size-4 text-[color:var(--color-warning)]" />
          <AlertTitle>{t("whatsappNotifications.title")}</AlertTitle>
          <AlertDescription>
            {i18n.language === "ar"
              ? "لم نتمكن من تحميل الإعدادات الحالية. جرّب التحديث ثم أكمل."
              : "We couldn't load the current notification settings. Refresh and try again."}
          </AlertDescription>
        </Alert>
      </WhatsAppPageShell>
    );
  }

  return (
    <WhatsAppPageShell
      title={pageTitle}
      description={pageDescription}
      icon={Bell}
      backHref={settingsHref}
      backLabel={ts("common.back") as string}
      eyebrow={eyebrow}
      actions={
        <>
          <Button
            variant="outline"
            className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:brightness-95"
            onClick={() => {
              if (superAdminMode) {
                setTestEventType("NEW_SIGNUP_WELCOME");
              }
              setTestDialogOpen(true);
            }}
          >
            <TestTube className="size-4" />
            {t("whatsappNotifications.test.sendTest")}
          </Button>
          <Button
            variant="outline"
            className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:brightness-95"
            onClick={() => void refreshPageData()}
            disabled={refreshing}
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            {t("common.refresh")}
          </Button>
          <Button
            className="rounded-full bg-[color:var(--color-primary)] text-white hover:brightness-90"
            onClick={() => void saveSettings()}
            disabled={saving}
          >
            <Save className="size-4" />
            {t("common.save")}
          </Button>
        </>
      }
    >
      {notice ? (
        <Alert className={cn("rounded-3xl", noticeStyles[notice.tone])}>
          {notice.tone === "success" ? (
            <CheckCircle className="size-4" />
          ) : notice.tone === "error" ? (
            <XCircle className="size-4" />
          ) : (
            <AlertCircle className="size-4" />
          )}
          <AlertTitle>{t("whatsappNotifications.title")}</AlertTitle>
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WhatsAppMetricCard
          label={
            superAdminMode
              ? i18n.language === "ar"
                ? "حالة onboarding"
                : "Onboarding status"
              : t("whatsappNotifications.tabs.general")
          }
          value={settings.isEnabled ? (i18n.language === "ar" ? "مفعّل" : "Enabled") : (i18n.language === "ar" ? "متوقف" : "Paused")}
          hint={currentSession?.name || ts("whatsappNotifications.general.selectSession")}
          icon={Bell}
          tone={settings.isEnabled ? "success" : "danger"}
        />
        <WhatsAppMetricCard
          label={t("whatsappNotifications.general.defaultSession")}
          value={connectedSessions}
          hint={i18n.language === "ar" ? "جلسات متصلة جاهزة للإرسال" : "Connected sessions ready for delivery"}
          icon={Smartphone}
          tone="primary"
        />
        <WhatsAppMetricCard
          label={t("whatsappNotifications.tabs.templates")}
          value={activeTemplates}
          hint={
            superAdminMode
              ? i18n.language === "ar"
                ? "قوالب تسجيل واشتراك نشطة"
                : "Active signup and subscription templates"
              : i18n.language === "ar"
                ? "قوالب نشطة حاليًا"
                : "Templates currently active"
          }
          icon={FileText}
          tone="info"
        />
        <WhatsAppMetricCard
          label={
            superAdminMode
              ? i18n.language === "ar"
                ? "مسار التسجيل"
                : "Signup scope"
              : i18n.language === "ar"
                ? "الوحدات المفعلة"
                : "Enabled domains"
          }
          value={enabledModules}
          hint={
            superAdminMode
              ? i18n.language === "ar"
                ? "يقتصر على رسائل تسجيل الشركات والاشتراك"
                : "Limited to company signup and subscription messages"
              : i18n.language === "ar"
                ? "أقسام تعمل حاليًا"
                : "Automation areas currently running"
          }
          icon={Settings}
          tone="primary"
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setSearchParams({ tab: value })}
        className="gap-4"
      >
        <div className="overflow-hidden rounded-3xl border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] px-3 py-3 shadow-md">
          <TabsList variant="line" className="flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="rounded-full border border-transparent px-4 py-2 text-sm text-[color:var(--color-muted-foreground)] data-active:border-[color:var(--shell-control-border)] data-active:bg-[color:var(--color-card)] data-active:text-[color:var(--color-foreground)]"
                >
                  <Icon className="size-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="general" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <WhatsAppSurfaceCard
                title={ts("whatsappNotifications.general.enableNotifications")}
                description={pageDescription}
                action={<Switch checked={settings.isEnabled} onCheckedChange={(checked) => updateSetting("isEnabled", checked)} />}
              >
                <div className="space-y-4">
                  {!settings.isEnabled ? (
                    <Alert className="rounded-xl border-amber-300/70 bg-amber-500/10 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/[0.08] dark:text-amber-200">
                      <AlertTriangle className="size-4" />
                      <AlertTitle>{t("whatsappNotifications.title")}</AlertTitle>
                      <AlertDescription>
                        {t("whatsappNotifications.general.notificationsDisabledWarning")}
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-2">
                      <Label htmlFor="default-session">
                        {t("whatsappNotifications.general.defaultSession")}
                      </Label>
                      <Select
                        value={settings.defaultSessionId ?? "__none__"}
                        onValueChange={(value) =>
                          updateSetting(
                            "defaultSessionId",
                            value === "__none__" ? null : value,
                          )
                        }
                      >
                        <SelectTrigger
                          id="default-session"
                          className="h-11 bg-[color:var(--color-card)]"
                        >
                          <SelectValue placeholder={ts("whatsappNotifications.general.selectSession")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            {t("whatsappNotifications.general.selectSession")}
                          </SelectItem>
                          {sessions.map((session) => (
                            <SelectItem key={session.id} value={session.id}>
                              {session.name} ({session.phoneNumber})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-4 py-4">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                        {i18n.language === "ar" ? "الجلسة الحالية" : "Current session"}
                      </p>
                      {currentSession ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                            {currentSession.name}
                          </p>
                          <p className="text-sm text-[color:var(--color-muted-foreground)]">
                            {currentSession.phoneNumber}
                          </p>
                          <Badge
                            variant="outline"
                            className={sessionStatusClasses[currentSession.status || "DISCONNECTED"] || sessionStatusClasses['DISCONNECTED']}
                          >
                            {(STATUS_LABELS as Record<string, string>)[currentSession.status || "DISCONNECTED"] || (STATUS_LABELS as Record<string, string>)['DISCONNECTED']}
                          </Badge>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-[color:var(--color-muted-foreground)]">
                          {t("whatsappNotifications.general.selectSession")}
                        </p>
                      )}
                    </div>
                  </div>

                  <FeatureToggle
                    label={i18n.language === "ar" ? "تثبيت الجلسة لكل عميل" : "Sticky session per customer"}
                    description={
                      i18n.language === "ar"
                        ? "استخدم نفس رقم واتساب للعميل نفسه للحفاظ على استمرارية المحادثة."
                        : "Keep each customer on the same sending session for consistent conversation history."
                    }
                    checked={settings.stickySessionEnabled ?? true}
                    onCheckedChange={(checked) =>
                      updateSetting("stickySessionEnabled", checked)
                    }
                  />

                  {sessions.length === 0 ? (
                    <Alert className="rounded-xl border-sky-300/70 bg-sky-500/10 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/[0.08] dark:text-sky-200">
                      <AlertCircle className="size-4" />
                      <AlertTitle>{t("whatsappNotifications.general.noSessionsWarning")}</AlertTitle>
                      <AlertDescription>
                        <Link
                          to={settingsHref}
                          className="font-medium underline underline-offset-4"
                        >
                          {t("header.settings")} WhatsApp
                        </Link>
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>
              </WhatsAppSurfaceCard>

              <WhatsAppSurfaceCard
                title={i18n.language === "ar" ? "إدارة الإرسال" : "Delivery safeguards"}
                description={
                  i18n.language === "ar"
                    ? "اضبط الساعات الهادئة وحدود الإرسال لتقليل الإزعاج وتحسين الاعتمادية."
                    : "Tune quiet hours and throughput limits to reduce noise and improve delivery reliability."
                }
              >
                <div className="space-y-5">
                  <FeatureToggle
                    label={t("whatsappNotifications.general.quietHours")}
                    description={ts("whatsappNotifications.general.quietHoursDesc")}
                    checked={settings.quietHoursEnabled}
                    onCheckedChange={(checked) =>
                      updateSetting("quietHoursEnabled", checked)
                    }
                  />

                  {settings.quietHoursEnabled ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="quiet-hours-start">
                          {t("whatsappNotifications.general.fromTime")}
                        </Label>
                        <Input
                          id="quiet-hours-start"
                          type="time"
                          value={settings.quietHoursStart || "22:00"}
                          onChange={(event) =>
                            updateSetting("quietHoursStart", event.target.value)
                          }
                          className="h-11 bg-[color:var(--color-card)]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quiet-hours-end">
                          {t("whatsappNotifications.general.toTime")}
                        </Label>
                        <Input
                          id="quiet-hours-end"
                          type="time"
                          value={settings.quietHoursEnd || "08:00"}
                          onChange={(event) =>
                            updateSetting("quietHoursEnd", event.target.value)
                          }
                          className="h-11 bg-[color:var(--color-card)]"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="rate-limit">
                      {t("whatsappNotifications.general.maxMessagesPerMinute")}
                    </Label>
                    <Input
                      id="rate-limit"
                      type="number"
                      min={1}
                      max={60}
                      value={settings.rateLimitPerMinute || 30}
                      onChange={(event) =>
                        updateSetting(
                          "rateLimitPerMinute",
                          parseInteger(event.target.value, 30),
                        )
                      }
                      className="h-11 bg-[color:var(--color-card)]"
                    />
                    <p className="text-sm text-[color:var(--color-muted-foreground)]">
                      {t("whatsappNotifications.general.antiBanHelp")}
                    </p>
                  </div>
                </div>
              </WhatsAppSurfaceCard>
            </div>

            <div className="space-y-4">
              <WhatsAppSurfaceCard
                title={ts("whatsappJourney.title")}
                description={ts("whatsappJourney.subtitle")}
                action={
                  <Button
                    variant="outline"
                    className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:brightness-95"
                    onClick={() => navigate(automationsHref)}
                  >
                    {t("common.actions")}
                  </Button>
                }
              >
                <div className="rounded-2xl border border-emerald-300/70 bg-emerald-500/10 p-5 dark:border-emerald-500/40 dark:bg-emerald-500/[0.08]">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                      <TrendingUp className="size-5" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-base font-semibold text-emerald-900 dark:text-emerald-100">
                        {t("whatsappJourney.title")}
                      </p>
                      <p className="text-sm leading-6 text-emerald-800 dark:text-emerald-200">
                        {i18n.language === "ar"
                          ? "راجع سلاسل ما بعد الشراء وعدّل الرسائل المؤتمتة من شاشة مخصّصة للتجارب المتتابعة."
                          : "Review post-purchase flows and tune sequenced customer journeys from a dedicated workspace."}
                      </p>
                    </div>
                  </div>
                </div>
              </WhatsAppSurfaceCard>

              <WhatsAppSurfaceCard
                title={i18n.language === "ar" ? "حالة الجلسات" : "Session health"}
                description={
                  i18n.language === "ar"
                    ? "نظرة سريعة على الجلسات المتاحة للإرسال."
                    : "A quick view of the sessions currently available for delivery."
                }
              >
                <div className="space-y-3">
                  {sessions.length > 0 ? (
                    sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-4 py-3"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                            {session.name}
                          </p>
                          <p className="text-sm text-[color:var(--color-muted-foreground)]">
                            {session.phoneNumber}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={sessionStatusClasses[session.status || "DISCONNECTED"] || sessionStatusClasses['DISCONNECTED']}
                        >
                          {(STATUS_LABELS as Record<string, string>)[session.status || "DISCONNECTED"] || (STATUS_LABELS as Record<string, string>)['DISCONNECTED']}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[color:var(--color-muted-foreground)]">
                      {t("whatsappNotifications.general.noSessionsWarning")}
                    </p>
                  )}
                </div>
              </WhatsAppSurfaceCard>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <WhatsAppSurfaceCard
            title={ts("whatsappNotifications.products.title")}
            description={
              i18n.language === "ar"
                ? "فعّل التنبيهات المرتبطة بتوافر المنتجات، انخفاض السعر، ووصول الجديد."
                : "Enable alerts for stock returns, price drops, and new product announcements."
            }
          >
            <div className="space-y-4">
              <SectionHeader
                icon={ShoppingCart}
                title={ts("whatsappNotifications.products.title")}
                description={pageDescription}
                checked={settings.productNotificationsEnabled}
                onCheckedChange={(checked) =>
                  updateSetting("productNotificationsEnabled", checked)
                }
                toneClass="bg-violet-500/10 text-violet-700"
              />

              {settings.productNotificationsEnabled ? (
                <div className="grid gap-3">
                  {productOptions.map((item) => (
                    <FeatureToggle
                      key={item.key}
                      label={item.label}
                      description={item.description}
                      checked={Boolean(settings[item.key])}
                      onCheckedChange={(checked) =>
                        updateSetting(item.key, checked)
                      }
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </WhatsAppSurfaceCard>
        </TabsContent>

        <TabsContent value="marketing" className="space-y-4">
          <WhatsAppSurfaceCard
            title={ts("whatsappNotifications.marketing.title")}
            description={
              i18n.language === "ar"
                ? "أدِر رسائل التسويق الموسمية والحملات المباشرة من نفس المساحة."
                : "Manage promotional, coupon, and loyalty messaging from one operational surface."
            }
          >
            <div className="space-y-4">
              <SectionHeader
                icon={Megaphone}
                title={ts("whatsappNotifications.marketing.title")}
                description={ts("whatsappNotifications.marketing.complianceWarning")}
                checked={settings.marketingNotificationsEnabled}
                onCheckedChange={(checked) =>
                  updateSetting("marketingNotificationsEnabled", checked)
                }
                toneClass="bg-pink-500/10 text-pink-700"
              />

              {settings.marketingNotificationsEnabled ? (
                <>
                  <Alert className="rounded-xl border-amber-300/70 bg-amber-500/10 text-amber-900">
                    <AlertTriangle className="size-4" />
                    <AlertTitle>{t("whatsappNotifications.marketing.title")}</AlertTitle>
                    <AlertDescription>
                      {t("whatsappNotifications.marketing.complianceWarning")}
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-3 md:grid-cols-2">
                    {marketingOptions.map((item) => (
                      <FeatureToggle
                        key={item.key}
                        label={item.label}
                        checked={Boolean(settings[item.key])}
                        onCheckedChange={(checked) =>
                          updateSetting(item.key, checked)
                        }
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </WhatsAppSurfaceCard>
        </TabsContent>

        <TabsContent value="company" className="space-y-4">
          <WhatsAppSurfaceCard
            title={
              superAdminMode
                ? i18n.language === "ar"
                  ? "تسجيل الشركة والاشتراك"
                  : "Company signup and subscription"
                : i18n.language === "ar"
                  ? "رحلة الشركة والاشتراك"
                  : "Company journey and subscription"
            }
            description={
              superAdminMode
                ? i18n.language === "ar"
                  ? "أدر فقط الرسائل التي تخص تسجيل الشركات الجديدة وحالة اشتراكها من منظور السوبر أدمن."
                  : "Manage only the messages related to new company signup and subscription state from the super-admin perspective."
                : i18n.language === "ar"
                  ? "أدر الرسائل التي تصل إلى أصحاب الشركات أو فرق القيادة بخصوص التسجيلات والاشتراكات والمزايا."
                  : "Manage the messages sent to company owners and leadership around signups, subscriptions, and benefits."
            }
          >
            <div className="space-y-4">
              <SectionHeader
                icon={Bell}
                title={i18n.language === "ar" ? "إشعارات أصحاب الشركات" : "Owner-facing notifications"}
                description={
                  i18n.language === "ar"
                    ? "هذه المجموعة تتحكم في الرسائل التشغيلية التي تخص رحلة الشركة نفسها، ويمكن أن تستخدم مرسل المنصة عند الحاجة."
                    : "This group governs company-owner operational notifications and can use the platform sender when needed."
                }
                checked={settings.companyLifecycleNotificationsEnabled}
                onCheckedChange={(checked) =>
                  updateSetting("companyLifecycleNotificationsEnabled", checked)
                }
                toneClass="bg-indigo-500/10 text-indigo-700"
              />

              {settings.companyLifecycleNotificationsEnabled ? (
                <>
                  <Alert className="rounded-xl border-indigo-300/70 bg-indigo-500/10 text-indigo-950 dark:border-indigo-500/40 dark:bg-indigo-500/[0.08] dark:text-indigo-200">
                    <AlertCircle className="size-4" />
                    <AlertTitle>
                      {i18n.language === "ar" ? "مناسبة للتعامل مع أصحاب الشركات" : "Owner-ready controls"}
                    </AlertTitle>
                    <AlertDescription>
                      {i18n.language === "ar"
                        ? "إشعارات الاشتراك والتسجيل تُدار هنا بشكل مستقل، مع استهداف أدق لقيادة الشركة ودعم مرسل المنصة إذا لم توجد جلسة شركة صالحة."
                        : "Signup and subscription notifications are governed here with tighter leadership targeting and platform-sender support when a tenant session is unavailable."}
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-3 md:grid-cols-2">
                    {companyOptions.map((item) => (
                      <FeatureToggle
                        key={item.key}
                        label={item.label}
                        description={item.description}
                        checked={Boolean(settings[item.key])}
                        onCheckedChange={(checked) =>
                          updateSetting(item.key, checked)
                        }
                        />
                      ))}
                    </div>

                  <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="company-lifecycle-admin-phones">
                          {i18n.language === "ar"
                            ? "أرقام واتساب مستلمي تنبيه الإدارة"
                            : "Admin alert WhatsApp recipients"}
                        </Label>
                        <Badge
                          variant="outline"
                          className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]"
                        >
                          {manualAdminRecipientCount}
                          {i18n.language === "ar" ? " رقم" : " recipients"}
                        </Badge>
                      </div>
                      <Textarea
                        id="company-lifecycle-admin-phones"
                        value={settings.companyLifecycleAdminPhones || ""}
                        onChange={(event) =>
                          updateSetting(
                            "companyLifecycleAdminPhones",
                            event.target.value,
                          )
                        }
                        rows={6}
                        placeholder={
                          i18n.language === "ar"
                            ? "01123087745\n01000000000"
                            : "15551234567\n15557654321"
                        }
                        className="min-h-[148px] resize-y bg-[color:var(--color-card)]"
                      />
                      <p className="text-sm leading-6 text-[color:var(--color-muted-foreground)]">
                        {superAdminMode
                          ? i18n.language === "ar"
                            ? "هذه الأرقام تستقبل تنبيهات المنصة مثل تسجيل شركة جديدة أو Lead مهتم بالشحن. اكتب رقمًا في كل سطر أو افصل بفاصلة."
                            : "These numbers receive platform alerts such as new company signups or shipping-interest leads. Enter one number per line or separate with commas."
                          : i18n.language === "ar"
                            ? "هذه الأرقام تستقبل تنبيهات الإدارة الداخلية الخاصة بالتسجيلات وطلبات الاشتراك والـ leads. اكتب رقمًا في كل سطر أو افصل بفاصلة."
                            : "These numbers receive internal leadership alerts for signups, subscription requests, and leads. Enter one number per line or separate with commas."}
                      </p>
                    </div>

                    <div className="space-y-4 rounded-3xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] p-5">
                      <div className="space-y-2">
                        <Label htmlFor="company-lifecycle-admin-routing-mode">
                          {i18n.language === "ar"
                            ? "طريقة توجيه تنبيه الإدارة"
                            : "Admin alert routing"}
                        </Label>
                        <Select
                          value={settings.companyLifecycleAdminRoutingMode || "AUTO"}
                          onValueChange={(value) =>
                            updateSetting(
                              "companyLifecycleAdminRoutingMode",
                              value ?? "AUTO",
                            )
                          }
                        >
                          <SelectTrigger
                            id="company-lifecycle-admin-routing-mode"
                            className="h-11 bg-[color:var(--color-card)]"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AUTO">
                              {i18n.language === "ar"
                                ? "الأرقام المكتوبة فقط، وإن لم توجد نستخدم المستخدمين"
                                : "Configured numbers first, otherwise system users"}
                            </SelectItem>
                            <SelectItem value="MANUAL_ONLY">
                              {i18n.language === "ar"
                                ? "الأرقام المكتوبة فقط"
                                : "Configured numbers only"}
                            </SelectItem>
                            <SelectItem value="MANUAL_PLUS_AUTO">
                              {i18n.language === "ar"
                                ? "الأرقام المكتوبة + المستخدمون"
                                : "Configured numbers + system users"}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="rounded-xl border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-4">
                        <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                          {i18n.language === "ar"
                            ? "ما الذي سيحدث عند الإرسال؟"
                            : "What happens on send?"}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted-foreground)]">
                          {settings.companyLifecycleAdminRoutingMode ===
                          "MANUAL_ONLY"
                            ? i18n.language === "ar"
                              ? "سيتم الإرسال فقط إلى الأرقام المكتوبة هنا، ولن نعتمد على حسابات المستخدمين."
                              : "Alerts will go only to the numbers entered here, without relying on user accounts."
                            : settings.companyLifecycleAdminRoutingMode ===
                                "MANUAL_PLUS_AUTO"
                              ? i18n.language === "ar"
                                ? "سيتم الدمج بين الأرقام المكتوبة هنا وبين مستخدمي النظام المناسبين، مع حذف التكرار تلقائيًا."
                                : "Configured numbers are merged with eligible system users and deduplicated automatically."
                              : i18n.language === "ar"
                                ? "إذا وُجدت أرقام مكتوبة هنا فستُستخدم أولًا، وإذا تُركت فارغة سنرجع تلقائيًا إلى حسابات المستخدمين."
                                : "Configured numbers are used first; if left empty, delivery falls back to eligible user accounts."}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </WhatsAppSurfaceCard>
        </TabsContent>

        <TabsContent value="hr" className="space-y-4">
          <WhatsAppSurfaceCard
            title={ts("whatsappNotifications.hr.title")}
            description={
              i18n.language === "ar"
                ? "اضبط التنبيهات الموجهة للموظفين والعمليات البشرية اليومية."
                : "Configure employee-facing and HR operations notifications from a single control surface."
            }
          >
            <div className="space-y-4">
              <SectionHeader
                icon={Users}
                title={ts("whatsappNotifications.hr.title")}
                description={pageDescription}
                checked={settings.hrNotificationsEnabled}
                onCheckedChange={(checked) =>
                  updateSetting("hrNotificationsEnabled", checked)
                }
                toneClass="bg-teal-500/10 text-teal-700"
              />

              {settings.hrNotificationsEnabled ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {hrOptions.map((item) => (
                    <FeatureToggle
                      key={item.key}
                      label={item.label}
                      checked={Boolean(settings[item.key])}
                      onCheckedChange={(checked) =>
                        updateSetting(item.key, checked)
                      }
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </WhatsAppSurfaceCard>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <WhatsAppSurfaceCard
            title="إشعارات المهام"
            description={
              i18n.language === "ar"
                ? "اضبط إشعارات المهام المرسلة عبر واتساب للمنفذين والمراقبين."
                : "Configure WhatsApp task notifications for assignees and watchers."
            }
          >
            <div className="space-y-4">
              <SectionHeader
                icon={Briefcase}
                title="المهام"
                description={pageDescription}
                checked={settings.taskNotificationsEnabled}
                onCheckedChange={(checked) =>
                  updateSetting("taskNotificationsEnabled", checked)
                }
                toneClass="bg-amber-500/10 text-amber-700"
              />

              {settings.taskNotificationsEnabled ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {taskOptions.map((item) => (
                    <FeatureToggle
                      key={item.key}
                      label={item.label}
                      checked={Boolean(settings[item.key])}
                      onCheckedChange={(checked) =>
                        updateSetting(item.key, checked)
                      }
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </WhatsAppSurfaceCard>
        </TabsContent>

        {!superAdminMode && (
          <TabsContent value="reports" className="space-y-4">
            <WhatsAppScheduledReportsTab companyId={companyId} />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>{t("whatsappNotifications.test.sendTest")}</DialogTitle>
            <DialogDescription>
              {superAdminMode
                ? i18n.language === "ar"
                  ? "اختبر رسالة تسجيل شركة أو اشتراك من الأحداث الخاصة بالسوبر أدمن فقط."
                  : "Test a company-signup or subscription message from the super-admin event scope only."
                : i18n.language === "ar"
                  ? "أرسل إشعارًا تجريبيًا للتأكد من القالب والجلسة المختارة."
                  : "Send a test notification to validate the selected event and current session setup."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-phone">{t("common.phone")}</Label>
              <Input
                id="test-phone"
                value={testPhone}
                onChange={(event) => setTestPhone(event.target.value)}
                placeholder="01xxxxxxxxx"
                className="h-11 bg-[color:var(--color-card)]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-event">
                {t("whatsappNotifications.test.eventLabel")}
              </Label>
              <Select value={testEventType} onValueChange={(v) => setTestEventType(v ?? '')}>
                <SelectTrigger id="test-event" className="h-11 bg-[color:var(--color-card)]">
                  <SelectValue />
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTestDialogOpen(false)}
              className="rounded-full"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => void sendTestNotification()}
              disabled={sendingTest}
              className="rounded-full"
            >
              <Send className={cn("size-4", sendingTest && "animate-pulse")} />
              {t("common.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent
          className="max-h-[88vh] overflow-y-auto rounded-3xl sm:max-w-4xl"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingTemplate ? <Edit className="size-5" /> : <Plus className="size-5" />}
              {editingTemplate
                ? i18n.language === "ar"
                  ? "تعديل قالب الإشعار"
                  : "Edit notification template"
                : i18n.language === "ar"
                  ? "إضافة قالب جديد"
                  : "Create notification template"}
            </DialogTitle>
            <DialogDescription>
              {superAdminMode
                ? i18n.language === "ar"
                  ? "عدّل اسم القالب، حدث التسجيل أو الاشتراك، ومحتوى الرسالة قبل حفظه في مساحة السوبر أدمن."
                  : "Adjust the template name, signup/subscription event, and message content before saving it into the super-admin workspace."
                : i18n.language === "ar"
                  ? "عدّل اسم القالب، الحدث، ومحتوى الرسالة قبل حفظه في نظام الإشعارات."
                  : "Adjust the template name, trigger event, and message content before saving it into the notification system."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">
                  {i18n.language === "ar"
                    ? "اسم القالب (اختياري)"
                    : "Template name (optional)"}
                </Label>
                <Input
                  id="template-name"
                  value={templateForm.name}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder={
                    superAdminMode
                      ? i18n.language === "ar"
                        ? "مثلاً: رسالة ترحيب بتسجيل الشركة"
                        : "Example: Company signup welcome message"
                      : i18n.language === "ar"
                        ? "مثلاً: قالب تأكيد الطلب"
                        : "Example: Custom order confirmation"
                  }
                  className="h-11 bg-[color:var(--color-card)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-category">
                  {i18n.language === "ar" ? "تصنيف القالب" : "Template category"}
                </Label>
                <Select
                  value={templateForm.category}
                  onValueChange={(value) =>
                    setTemplateForm((current) => ({
                      ...current,
                      category: value ?? '',
                    }))
                  }
                >
                  <SelectTrigger id="template-category" className="h-11 bg-[color:var(--color-card)]">
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

              <div className="space-y-2">
                <Label htmlFor="template-event">
                  {i18n.language === "ar" ? "حدث التشغيل" : "Trigger event"}
                </Label>
                <Select
                  value={templateForm.eventType || "__none__"}
                  onValueChange={(value) =>
                    setTemplateForm((current) => ({
                      ...current,
                      eventType: value === "__none__" ? "" : (value ?? ''),
                    }))
                  }
                  disabled={Boolean(editingTemplate)}
                >
                  <SelectTrigger id="template-event" className="h-11 bg-[color:var(--color-card)]">
                    <SelectValue
                      placeholder={
                        i18n.language === "ar"
                          ? "اختر الحدث"
                          : "Choose an event"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      {i18n.language === "ar" ? "اختر الحدث" : "Choose an event"}
                    </SelectItem>
                    {availableEventEntries.map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  {i18n.language === "ar"
                    ? "اختر الحدث الذي سيُرسل هذا القالب عند وقوعه."
                    : "Select the event that should trigger this template."}
                </p>
              </div>

              <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                      {i18n.language === "ar" ? "تفعيل القالب" : "Enable template"}
                    </p>
                    <p className="text-sm text-[color:var(--color-muted-foreground)]">
                      {i18n.language === "ar"
                        ? "يمكنك حفظ القالب معطلاً ثم تشغيله لاحقًا."
                        : "You can save the template disabled and activate it later."}
                    </p>
                  </div>
                  <Switch
                    checked={templateForm.isActive}
                    onCheckedChange={(checked) =>
                      setTemplateForm((current) => ({
                        ...current,
                        isActive: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-content">
                  {i18n.language === "ar" ? "محتوى القالب" : "Template content"}
                </Label>
                <Textarea
                  id="template-content"
                  rows={12}
                  value={templateForm.content}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  className="min-h-[18rem] rounded-2xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] font-mono text-sm leading-7"
                  placeholder={
                    superAdminMode
                      ? i18n.language === "ar"
                        ? "مرحبًا {{customer_name}}، تم تفعيل حساب شركتك على {{company_name}}..."
                        : "Hello {{customer_name}}, your company account on {{company_name}} is now active..."
                      : i18n.language === "ar"
                        ? "مرحبًا {{customer_name}}، تم تأكيد طلبك رقم {{order_id}}..."
                        : "Hello {{customer_name}}, your order {{order_id}} has been confirmed..."
                  }
                />
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  {i18n.language === "ar"
                    ? "يمكنك استخدام متغيرات مثل {{customer_name}} و {{order_id}} و {{store_name}}."
                    : "You can use variables such as {{customer_name}}, {{order_id}}, and {{store_name}}."}
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-200/80 bg-emerald-500/10 p-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-emerald-800">
                  {i18n.language === "ar" ? "معاينة سريعة" : "Quick preview"}
                </p>
                <div className="rounded-xl border border-emerald-200 bg-[color:var(--color-card)] px-4 py-4 shadow-[0_10px_25px_rgba(16,185,129,0.08)]">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-[color:var(--color-foreground)]">
                    {templateForm.content ||
                      (i18n.language === "ar"
                        ? "اكتب محتوى الرسالة هنا لتظهر المعاينة."
                        : "Type the message content here to preview it.")}
                  </p>
                </div>
              </div>

              <Alert className="rounded-2xl border-sky-300/70 bg-sky-500/10 text-sky-900">
                <AlertCircle className="size-4" />
                <AlertTitle>
                  {i18n.language === "ar" ? "تلميح للمتغيرات" : "Variable tip"}
                </AlertTitle>
                <AlertDescription>
                  {i18n.language === "ar"
                    ? "المتغيرات المتاحة تختلف حسب نوع الحدث. غالبًا ستستخدم: {{customer_name}}، {{order_id}}، {{total_amount}}، {{store_name}}."
                    : "Available variables vary by event type. Common examples: {{customer_name}}, {{order_id}}, {{total_amount}}, and {{store_name}}."}
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTemplateDialogOpen(false)}
              className="rounded-full"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => void saveTemplate()}
              disabled={saving}
              className="rounded-full"
            >
              <Save className="size-4" />
              {i18n.language === "ar" ? "حفظ القالب" : "Save template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WhatsAppPageShell>
  );
};

export default WhatsAppNotifications;
