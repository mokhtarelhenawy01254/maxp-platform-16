import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircle,
  Clock,
  Cloud,
  Edit,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Layers,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Smartphone,
  Sparkles,
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
import MetaTemplatesModal from "../customers/components/MetaTemplatesModal";
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
  channel?: "AUTO" | "BAILEYS" | "META_CLOUD" | string;
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
  channel: "AUTO" | "BAILEYS" | "META_CLOUD";
  metaTemplateName?: string;
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

const EVENT_TRIGGERS: Record<string, string> = {
  LOYALTY_POINTS_AWARDED: "عند تسليم الطلب (احتساب النقاط المكتسبة)",
  LOYALTY_TIER_UPGRADED: "عند ترقية تصنيف العميل لمستوى أعلى",
  LOYALTY_TIER_DOWNGRADED: "عند تراجع مستوى العميل",
  LOYALTY_POINTS_EXPIRY_WARNING: "قبل انتهاء صلاحية النقاط بأيام محددة",
  LOYALTY_POINTS_EXPIRED: "عند انتهاء صلاحية النقاط (مهمة يومية)",
  LOYALTY_POINTS_REDEEMED: "عند استبدال النقاط في طلب جديد",
  CASHBACK_CREDITED: "عند تسليم الطلب واحتساب رصيد الكاش باك",
  CASHBACK_REVERSED: "عند إرجاع الطلب أو إلغائه (استرداد الكاش باك)",
  CUSTOMER_QUALITY_UPGRADED: "عند ارتفاع تصنيف جودة العميل (VIP)",
  CUSTOMER_QUALITY_DOWNGRADED: "عند انخفاض تصنيف جودة العميل",
  AUTO_DISCOUNT_COUPON_GRANTED: "عند تسليم الطلب وإصدار كوبون الخصم التلقائي",
  AUTO_DISCOUNT_COUPON_EXPIRING: "قبل انتهاء صلاحية كوبون الخصم بـ 3 أيام",
  AUTO_DISCOUNT_CASHBACK_CONVERTED: "عند انتهاء صلاحية الكوبون وتحويله لكاش باك",
  BIRTHDAY_WISH: "يومياً الساعة 12:00 ظهراً (تلقائي بحسب تاريخ الميلاد)",
  REVIEW_REQUEST: "بعد 7 أيام من تسليم الطلب للعميل (طلب تقييم التجربة)",
  CADENCE_PRODUCT: "كل 10 أيام للعملاء غير المتفاعلين (ترشيح منتج جديد)",
  CADENCE_BALANCE: "كل 15 يوماً لتذكير العميل برصيد محفظته والنقاط",
  CADENCE_REFERRAL: "كل 30 يوماً لدعوة الأصدقاء ومشاركة كود الإحالة",
  CADENCE_TIER: "كل 30 يوماً لتذكير العميل بمزايا مستواه الحالي",
  CART_ABANDONED_1H: "بعد ساعة واحدة من ترك السلة دون إتمام الشراء",
  CART_ABANDONED_24H: "بعد 24 ساعة من ترك السلة (تذكير ثانٍ)",
  CART_ABANDONED_72H: "بعد 72 ساعة من ترك السلة (تذكير نهائي)",
  CART_ABANDONED_WITH_DISCOUNT: "تذكير سلة متروكة مع كود خصم تحفيزي خاص",
  BACK_IN_STOCK: "عند توفر كمية جديدة من منتج بعد نفاد المخزون",
  PRICE_DROP: "عند تخفيض سعر منتج في قائمة رغبات العميل",
  NEW_PRODUCT: "عند نشر منتج جديد بالمتجر",
  NEW_SIGNUP_WELCOME: "فور تسجيل الشركة بالمنصة (رسالة ترحيبية)",
  NEW_SIGNUP_ADMIN_ALERT: "تنبيه للإدارة فور إنشاء حساب جديد",
  SUBSCRIPTION_CREATED: "عند تأكيد تفعيل اشتراك المتجر",
  SUBSCRIPTION_RENEWED: "عند تجديد الاشتراك الشهري أو السنوي",
  SUBSCRIPTION_CANCELLED: "عند إلغاء أو انتهاء الاشتراك",
};

const CATEGORY_EVENT_MAP: Record<string, string[]> = {
  CUSTOMER: [
    "LOYALTY_POINTS_AWARDED",
    "LOYALTY_TIER_UPGRADED",
    "LOYALTY_TIER_DOWNGRADED",
    "LOYALTY_POINTS_EXPIRY_WARNING",
    "LOYALTY_POINTS_EXPIRED",
    "LOYALTY_POINTS_REDEEMED",
    "CASHBACK_CREDITED",
    "CASHBACK_REVERSED",
    "CUSTOMER_QUALITY_UPGRADED",
    "CUSTOMER_QUALITY_DOWNGRADED",
    "AUTO_DISCOUNT_COUPON_GRANTED",
    "AUTO_DISCOUNT_COUPON_EXPIRING",
    "AUTO_DISCOUNT_CASHBACK_CONVERTED",
    "BIRTHDAY_WISH",
    "REVIEW_REQUEST",
    "CADENCE_PRODUCT",
    "CADENCE_BALANCE",
    "CADENCE_REFERRAL",
    "CADENCE_TIER",
  ],
  PRODUCTS: ["BACK_IN_STOCK", "PRICE_DROP", "NEW_PRODUCT"],
  ABANDONED_CART: [
    "CART_ABANDONED_1H",
    "CART_ABANDONED_24H",
    "CART_ABANDONED_72H",
    "CART_ABANDONED_WITH_DISCOUNT",
  ],
  MARKETING: ["PROMOTIONAL", "COUPON_SENT", "BIRTHDAY_WISH", "ANNOUNCEMENT"],
  HR: [
    "ATTENDANCE_REMINDER",
    "ATTENDANCE_CONFIRMED",
    "CHECKOUT_CONFIRMED",
    "LEAVE_APPROVED",
    "LEAVE_REJECTED",
    "PERMISSION_APPROVED",
    "PERMISSION_REJECTED",
    "MANUAL_DEDUCTION",
    "PAYROLL_READY",
    "BIRTHDAY_EMPLOYEE",
    "WARNING_ISSUED",
  ],
  SYSTEM: [
    "NEW_SIGNUP_WELCOME",
    "NEW_SIGNUP_ADMIN_ALERT",
    "SUBSCRIPTION_CREATED",
    "SUBSCRIPTION_RENEWED",
    "SUBSCRIPTION_CANCELLED",
    "NEWSLETTER_SUBSCRIBED",
    "BENEFIT_GRANTED",
    "OTP",
  ],
};

const CATEGORY_VARIABLES: Record<string, { var: string; label: string; desc: string }[]> = {
  CUSTOMER: [
    { var: "{customerName}", label: "اسم العميل", desc: "اسم العميل المسجل" },
    { var: "{points}", label: "النقاط", desc: "عدد النقاط المكتسبة أو المستبدلة" },
    { var: "{currentPoints}", label: "الرصيد الكلي", desc: "إجمالي رصيد النقاط الحالي" },
    { var: "{cashAmount}", label: "قيمة الكاش باك", desc: "المبلغ المالي المضاف أو المخصوم" },
    { var: "{currency}", label: "العملة", desc: "العملة الرسمية (ج.م / ر.س)" },
    { var: "{balance}", label: "رصيد المحفظة", desc: "إجمالي الرصيد النقدي للمحفظة" },
    { var: "{tierName}", label: "اسم المستوى", desc: "اسم مستوى الولاء الجديد" },
    { var: "{expiryDate}", label: "تاريخ الانتهاء", desc: "تاريخ انتهاء صلاحية النقاط أو الكوبون" },
    { var: "{orderNumber}", label: "رقم الطلب", desc: "رقم الطلب المرتبط بالعملية" },
    { var: "{reason}", label: "السبب", desc: "سبب المعاملة أو الإشعار" },
    { var: "{programName}", label: "برنامج الولاء", desc: "اسم برنامج الولاء للشركة" },
    { var: "{qualityTier}", label: "درجة الجودة", desc: "تصنيف العميل (VIP / عالي / متوسط)" },
    { var: "{discountPercent}", label: "نسبة الخصم", desc: "نسبة خصم الكوبون" },
    { var: "{voucherAmount}", label: "قيمة الكوبون", desc: "قيمة كوبون الخصم بالعملة" },
    { var: "{validityDays}", label: "أيام الصلاحية", desc: "عدد أيام صلاحية الكوبون" },
  ],
  PRODUCTS: [
    { var: "{customerName}", label: "اسم العميل", desc: "اسم العميل" },
    { var: "{productName}", label: "اسم المنتج", desc: "اسم المنتج المستهدف" },
    { var: "{price}", label: "السعر الحالي", desc: "سعر المنتج الحالي" },
    { var: "{oldPrice}", label: "السعر السابق", desc: "السعر قبل الخصم" },
    { var: "{discountPercent}", label: "نسبة الخصم", desc: "النسبة المئوية للتخفيض" },
    { var: "{productUrl}", label: "رابط المنتج", desc: "رابط مباشر لصفحة الشراء" },
  ],
  ABANDONED_CART: [
    { var: "{customerName}", label: "اسم العميل", desc: "اسم العميل صاحب السلة" },
    { var: "{cartTotal}", label: "إجمالي السلة", desc: "قيمة المنتجات في السلة" },
    { var: "{itemsCount}", label: "عدد العناصر", desc: "عدد المنتجات المتروكة" },
    { var: "{cartUrl}", label: "رابط السلة", desc: "رابط استرجاع وإكمال الطلب" },
    { var: "{discountCode}", label: "كود الخصم", desc: "كوبون تحفيزي مخصص" },
  ],
  MARKETING: [
    { var: "{customerName}", label: "اسم العميل", desc: "اسم العميل" },
    { var: "{promoTitle}", label: "عنوان العرض", desc: "اسم أو عنوان الحملة الترويجية" },
    { var: "{couponCode}", label: "كود الكوبون", desc: "كود الخصم الترويجي" },
    { var: "{discountPercent}", label: "نسبة الخصم", desc: "نسبة التخفيض" },
    { var: "{validUntil}", label: "تاريخ الانتهاء", desc: "آخر موعد للاستفادة" },
    { var: "{storeUrl}", label: "رابط المتجر", desc: "رابط المتجر الإلكتروني" },
  ],
  HR: [
    { var: "{employeeName}", label: "اسم الموظف", desc: "اسم الموظف" },
    { var: "{date}", label: "التاريخ", desc: "تاريخ المعاملة" },
    { var: "{time}", label: "الوقت", desc: "وقت الحضور أو الانصراف" },
    { var: "{status}", label: "الحالة", desc: "حالة الطلب أو السجل" },
    { var: "{amount}", label: "المبلغ", desc: "قيمة الخصم أو المكافأة أو الراتب" },
  ],
  SYSTEM: [
    { var: "{companyName}", label: "اسم الشركة", desc: "اسم الشركة المسجلة" },
    { var: "{adminName}", label: "اسم المسؤول", desc: "اسم صاحب الحساب" },
    { var: "{planName}", label: "اسم الباقة", desc: "نوع الاشتراك" },
    { var: "{expiryDate}", label: "تاريخ الانتهاء", desc: "تاريخ انتهاء صلاحية الاشتراك" },
    { var: "{loginUrl}", label: "رابط الدخول", desc: "رابط منصة MaxP" },
  ],
};

const createEmptyTemplateForm = (
  superAdminMode = false,
): TemplateFormState => ({
  name: "",
  category: superAdminMode ? "CUSTOMER" : "PRODUCTS",
  eventType: superAdminMode ? "NEW_SIGNUP_WELCOME" : "",
  content: "",
  isActive: true,
  channel: "AUTO",
  metaTemplateName: "",
});

function ChannelBadge({
  channel,
  isArabic,
}: {
  channel?: string | null;
  isArabic: boolean;
}) {
  const norm = (channel || "AUTO").toUpperCase();
  if (norm === "META_CLOUD") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-sky-300/80 bg-sky-500/10 text-sky-800 dark:border-sky-500/40 dark:text-sky-200"
      >
        <Cloud className="size-3" />
        {isArabic ? "ميتا كلاود (Meta Cloud)" : "Meta Cloud"}
      </Badge>
    );
  }
  if (norm === "BAILEYS") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-emerald-300/80 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-200"
      >
        <Smartphone className="size-3" />
        {isArabic ? "واتساب ويب (Baileys)" : "Baileys"}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-slate-300/80 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:text-slate-300"
    >
      <Layers className="size-3" />
      {isArabic ? "توجيه ذكي (Auto)" : "Smart Auto"}
    </Badge>
  );
}

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [metaPickerOpen, setMetaPickerOpen] = useState(false);

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
      REVIEW_REQUEST:
        i18n.language === "ar" ? "طلب تقييم بعد الاستلام" : "Post-delivery review request",
      AUTO_DISCOUNT_COUPON_GRANTED:
        i18n.language === "ar" ? "منح كوبون الخصم التلقائي" : "Auto-discount coupon granted",
      AUTO_DISCOUNT_COUPON_EXPIRING:
        i18n.language === "ar" ? "تنبيه قرب انتهاء كوبون الخصم" : "Auto-discount coupon expiring",
      AUTO_DISCOUNT_CASHBACK_CONVERTED:
        i18n.language === "ar" ? "تحويل الكوبون المنتهي إلى كاش باك" : "Expired coupon converted to cashback",
      CADENCE_PRODUCT:
        i18n.language === "ar" ? "دورية: ترشيح منتج جديد (كل 10 أيام)" : "Cadence: New product (every 10 days)",
      CADENCE_BALANCE:
        i18n.language === "ar" ? "دورية: تحديث الرصيد (كل 15 يوم)" : "Cadence: Balance update (every 15 days)",
      CADENCE_REFERRAL:
        i18n.language === "ar" ? "دورية: تذكير الإحالة (كل 30 يوم)" : "Cadence: Referral reminder (every 30 days)",
      CADENCE_TIER:
        i18n.language === "ar" ? "دورية: تذكير المستوى (كل 30 يوم)" : "Cadence: Tier reminder (every 30 days)",
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

  const dialogEventEntries = useMemo(() => {
    const allowed = templateForm.category ? CATEGORY_EVENT_MAP[templateForm.category] : null;
    if (!allowed || allowed.length === 0) return availableEventEntries;
    const allowedSet = new Set(allowed);
    return availableEventEntries.filter(([key]) => allowedSet.has(key));
  }, [availableEventEntries, templateForm.category]);

  const activeCategoryVars = useMemo(() => {
    return CATEGORY_VARIABLES[templateForm.category] || CATEGORY_VARIABLES.CUSTOMER || [];
  }, [templateForm.category]);

  const insertVariable = useCallback((varText: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setTemplateForm((prev) => ({
        ...prev,
        content: (prev.content || "") + " " + varText,
      }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = templateForm.content || "";
    const nextVal = val.substring(0, start) + varText + val.substring(end);
    setTemplateForm((prev) => ({ ...prev, content: nextVal }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + varText.length, start + varText.length);
    }, 0);
  }, []);

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
        channel: (editingTemplate.channel as "AUTO" | "BAILEYS" | "META_CLOUD") || "AUTO",
        metaTemplateName: editingTemplate.metaTemplateName || "",
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
    const initialCategory =
      templateCategory !== "ALL"
        ? templateCategory
        : superAdminMode
          ? "CUSTOMER"
          : "PRODUCTS";
    const initialEvent = CATEGORY_EVENT_MAP[initialCategory]?.[0] || "";
    setTemplateForm({
      name: "",
      category: initialCategory,
      eventType: initialEvent,
      content: "",
      isActive: true,
      channel: "AUTO",
      metaTemplateName: "",
    });
    setTemplateDialogOpen(true);
  }, [superAdminMode, templateCategory]);

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

              {/* Customer Lifecycle & Automation Synergy Banner */}
              {templateCategory === "CUSTOMER" && (
                <div className="flex flex-col gap-3 rounded-2xl border border-sky-300/50 bg-sky-500/5 p-4 dark:border-sky-500/30 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-sky-600 dark:text-sky-400" />
                      <h4 className="text-sm font-semibold text-[color:var(--color-foreground)]">
                        {i18n.language === "ar"
                          ? "محرك أتمتة رحلات العملاء والولاء (Customer Retention Engine)"
                          : "Customer Retention & Loyalty Automation Engine"}
                      </h4>
                    </div>
                    <p className="text-xs text-[color:var(--color-muted-foreground)]">
                      {i18n.language === "ar"
                        ? "تُرسل قوالب العملاء آلياً عند تسليم الطلبات، إيداع الكاش باك، انتهاء النقاط، أو رسائل المتابعة الدورية. يمكنك التحكم في مسار القنوات (Meta vs Baileys) وتأخير الإرسال في مركز إشعارات العملاء."
                        : "Customer templates are dispatched automatically on order delivery, cashback credit, points expiry, or periodic cadences. Manage dual-slot channels and dispatch delays in Customer Notifications Center."}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 rounded-full border-sky-300/80 bg-[color:var(--color-card)] text-sky-700 hover:bg-sky-500/10 dark:border-sky-500/40 dark:text-sky-300"
                    onClick={() => navigate("/customers/customer-notifications")}
                  >
                    <ExternalLink className="size-3.5" />
                    {i18n.language === "ar" ? "إعدادات الجدولة والقنوات" : "Automation & Delays"}
                  </Button>
                </div>
              )}
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
                          <ChannelBadge channel={template.channel} isArabic={i18n.language === "ar"} />
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
                        {EVENT_TRIGGERS[template.eventType] ? (
                          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-[color:var(--color-muted)] px-2.5 py-1 text-xs text-[color:var(--color-muted-foreground)]">
                            <Clock className="size-3.5 shrink-0 text-amber-500" />
                            <span className="font-medium text-[color:var(--color-foreground)]">
                              {i18n.language === "ar" ? "التشغيل:" : "Trigger:"}
                            </span>
                            <span className="truncate">{EVENT_TRIGGERS[template.eventType]}</span>
                          </div>
                        ) : null}
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

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      {i18n.language === "ar" ? "التصنيف" : "Category"}
                    </Label>
                    <Select
                      value={templateForm.category}
                      onValueChange={(val) => {
                        const newCat = val ?? '';
                        const defaultEv = CATEGORY_EVENT_MAP[newCat]?.[0] || '';
                        setTemplateForm((prev) => ({
                          ...prev,
                          category: newCat,
                          eventType: defaultEv || prev.eventType,
                        }));
                      }}
                      disabled={superAdminMode}
                    >
                      <SelectTrigger className="h-11 bg-[color:var(--color-muted)]">
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
                    <Label className="text-sm font-semibold">
                      {i18n.language === "ar" ? "الحدث (Event)" : "Event type"}
                    </Label>
                    <Select
                      value={templateForm.eventType}
                      onValueChange={(val) =>
                        setTemplateForm((prev) => ({ ...prev, eventType: val ?? '' }))
                      }
                    >
                      <SelectTrigger className="h-11 bg-[color:var(--color-muted)]">
                        <SelectValue
                          placeholder={
                            i18n.language === "ar" ? "اختر الحدث..." : "Select event..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {dialogEventEntries.map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      {i18n.language === "ar" ? "مسار القناة" : "Channel"}
                    </Label>
                    <Select
                      value={templateForm.channel}
                      onValueChange={(val) =>
                        setTemplateForm((prev) => ({
                          ...prev,
                          channel: (val as "AUTO" | "BAILEYS" | "META_CLOUD") || "AUTO",
                        }))
                      }
                    >
                      <SelectTrigger className="h-11 bg-[color:var(--color-muted)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AUTO">
                          {i18n.language === "ar" ? "توجيه ذكي (AUTO)" : "Auto"}
                        </SelectItem>
                        <SelectItem value="BAILEYS">
                          {i18n.language === "ar" ? "واتساب ويب (Baileys)" : "Baileys"}
                        </SelectItem>
                        <SelectItem value="META_CLOUD">
                          {i18n.language === "ar" ? "ميتا كلاود (Meta Cloud)" : "Meta Cloud"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {EVENT_TRIGGERS[templateForm.eventType] ? (
                  <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                    <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="font-semibold">
                      {i18n.language === "ar" ? "طبيعة التشغيل التلقائي:" : "Automation trigger:"}
                    </span>
                    <span>{EVENT_TRIGGERS[templateForm.eventType]}</span>
                  </div>
                ) : null}

                {templateForm.metaTemplateName ? (
                  <div className="flex items-center justify-between rounded-xl border border-sky-300/60 bg-sky-500/10 px-3 py-2 text-xs text-sky-800 dark:border-sky-500/40 dark:text-sky-200">
                    <div className="flex items-center gap-2">
                      <Cloud className="size-4" />
                      <span>
                        {i18n.language === "ar" ? "مرتبط بقالب ميتا معتمد:" : "Linked to Meta Template:"}{" "}
                        <strong>{templateForm.metaTemplateName}</strong>
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-sky-700 hover:text-sky-900 dark:text-sky-300"
                      onClick={() => setTemplateForm((p) => ({ ...p, metaTemplateName: "" }))}
                    >
                      {i18n.language === "ar" ? "إلغاء الربط" : "Unlink"}
                    </Button>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-sm font-semibold">
                      {i18n.language === "ar" ? "محتوى الرسالة" : "Message content"}
                    </Label>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 rounded-full border-sky-300/80 bg-sky-500/5 text-xs text-sky-700 hover:bg-sky-500/10 dark:border-sky-500/40 dark:text-sky-300"
                        onClick={() => setMetaPickerOpen(true)}
                      >
                        <Cloud className="size-3" />
                        {i18n.language === "ar"
                          ? "استيراد من قوالب ميتا المعتمدة"
                          : "Import from Meta"}
                      </Button>
                      <div className="flex items-center gap-2 text-sm text-[color:var(--color-muted-foreground)]">
                        <span>{i18n.language === "ar" ? "تفعيل" : "Active"}</span>
                        <Switch
                          checked={templateForm.isActive}
                          onCheckedChange={(checked) =>
                            setTemplateForm((prev) => ({ ...prev, isActive: checked }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Clickable Variable Chips */}
                  {activeCategoryVars.length > 0 && (
                    <div className="space-y-1.5 rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-3">
                      <p className="text-xs font-medium text-[color:var(--color-muted-foreground)]">
                        {i18n.language === "ar"
                          ? "المتغيرات المتاحة لهذا الحدث (اضغط للإدراج عند المؤشر):"
                          : "Available variables (click to insert at cursor):"}
                      </p>
                      <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                        {activeCategoryVars.map((v) => (
                          <button
                            key={v.var}
                            type="button"
                            onClick={() => insertVariable(v.var)}
                            title={v.desc}
                            className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] px-2 py-1 text-xs font-medium text-[color:var(--color-foreground)] transition hover:border-[color:var(--color-primary)] hover:bg-primary/5 active:scale-95"
                          >
                            <span className="font-mono font-semibold text-[color:var(--color-primary)]">
                              {v.var}
                            </span>
                            <span className="text-[10px] text-[color:var(--color-muted-foreground)]">
                              ({v.label})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Textarea
                    ref={textareaRef}
                    value={templateForm.content}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({ ...prev, content: e.target.value }))
                    }
                    placeholder={
                      i18n.language === "ar"
                        ? "اكتب رسالتك هنا...\nيمكنك استخدام المتغيرات مثل {customerName}"
                        : "Type your message here...\nYou can use variables like {customerName}"
                    }
                    className="min-h-[180px] resize-y bg-[color:var(--color-muted)] p-4 leading-7"
                    dir="auto"
                  />
                  <p className="text-xs text-[color:var(--color-muted-foreground)]">
                    {i18n.language === "ar"
                      ? "المتغيرات بين الأقواس المعقوفة {variable} سيتم استبدالها تلقائياً ببيانات العميل أو الطلب الحقيقية عند الإرسال."
                      : "Variables in brackets {variable} will be automatically substituted with real customer/order data on dispatch."}
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

        <MetaTemplatesModal
          open={metaPickerOpen}
          onClose={() => setMetaPickerOpen(false)}
          onPick={(content, picked) => {
            setTemplateForm((prev) => ({
              ...prev,
              content,
              name: prev.name || picked.name || picked.metaTemplateName || "",
              channel: "META_CLOUD",
              metaTemplateName: picked.metaTemplateName || picked.name || "",
            }));
            showNotice(
              "success",
              i18n.language === "ar"
                ? "تم استيراد محتوى قالب ميتا المعتمد بنجاح"
                : "Approved Meta template imported successfully",
            );
          }}
          title={
            i18n.language === "ar"
              ? "اختيار من قوالب ميتا المعتمدة للمتجر"
              : "Select Approved Meta Template"
          }
        />
      </div>
    </WhatsAppPageShell>
  );
};

export default WhatsAppTemplates;
