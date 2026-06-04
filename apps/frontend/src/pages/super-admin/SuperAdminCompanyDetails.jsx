import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpCircle,
  BarChart3,
  Boxes,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Facebook,
  Globe,
  History,
  Loader2,
  LogIn,
  Mail,
  MessageSquare,
  Package,
  Phone,
  RefreshCw,
  Receipt,
  ShieldCheck,
  Sparkles,
  Wallet,
  UserPlus,
  Users,
} from "lucide-react";

import { apiClient } from "../../services/apiClient";
import { tokenManager } from "../../utils/tokenManager";
import {
  getCompanyFunnelAnalytics,
  getCompanyFunnelSummary,
  getFunnelEventLabel,
} from "../../utils/companyFunnelAnalytics";
import { cn } from "../../lib/utils";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Separator } from "../../components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import { Skeleton } from "../../components/ui/skeleton";
import { Switch } from "../../components/ui/switch";

const PLAN_OPTIONS = [
  { value: "BASIC", label: "أساسي" },
  { value: "PRO", label: "احترافي" },
  { value: "ENTERPRISE", label: "مؤسسي" },
];

const DEFAULT_PLAN_COPY = {
  BASIC: {
    description: "بداية مناسبة للشركات الجديدة مع الأدوات الأساسية والتشغيل اليومي.",
    highlights: ["تشغيل أساسي", "عدد محدود من الأعضاء", "انطلاقة سريعة"],
  },
  PRO: {
    description: "خطة تشغيل موسعة للشركات التي بدأت تنمو وتحتاج أدوات أقوى.",
    highlights: ["تقارير متقدمة", "دعم أدوات أكثر", "سعة تشغيل أعلى"],
  },
  ENTERPRISE: {
    description: "خطة مرنة للشركات الكبيرة مع حدود أعلى وتجهيزات أوسع.",
    highlights: ["حدود موسعة", "API Access", "تشغيل مؤسسي"],
  },
};

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

const INITIAL_EMPLOYEE_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "COMPANY_ADMIN",
};

const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false,
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}

function extractErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function normalizeRequiredApps(requiredApps) {
  if (Array.isArray(requiredApps)) {
    return requiredApps
      .map((requiredApp) => String(requiredApp || "").trim())
      .filter(Boolean);
  }

  if (typeof requiredApps === "string") {
    const trimmed = requiredApps.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((requiredApp) => String(requiredApp || "").trim())
          .filter(Boolean);
      }
    } catch (error) {
      return trimmed
        .split(",")
        .map((requiredApp) => requiredApp.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function sortAppsByDependencies(apps) {
  const appsBySlug = new Map(apps.map((app) => [app.slug, app]));
  const orderedApps = [];
  const visiting = new Set();
  const visited = new Set();

  const visit = (app) => {
    if (!app?.slug || visited.has(app.slug)) {
      return;
    }

    if (visiting.has(app.slug)) {
      orderedApps.push(app);
      visited.add(app.slug);
      return;
    }

    visiting.add(app.slug);

    normalizeRequiredApps(app.requiredApps).forEach((requiredSlug) => {
      const dependency = appsBySlug.get(requiredSlug);
      if (dependency) {
        visit(dependency);
      }
    });

    visiting.delete(app.slug);
    visited.add(app.slug);
    orderedApps.push(app);
  };

  apps.forEach(visit);

  return orderedApps.filter(
    (app, index, collection) =>
      collection.findIndex((candidate) => candidate.slug === app.slug) === index,
  );
}

function getDefaultPricingModel(app) {
  if (app?.pricingModel === "FREE") {
    return "FREE";
  }

  if (app?.pricingModel === "PAY_PER_USE") {
    return "PAY_PER_USE";
  }

  return "SUBSCRIPTION";
}

function formatDate(dateValue) {
  if (!dateValue) return "غير متوفر";

  try {
    return new Date(dateValue).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return "غير متوفر";
  }
}

function formatDateTime(dateValue) {
  if (!dateValue) return "غير متوفر";

  try {
    return new Date(dateValue).toLocaleString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch (error) {
    return "غير متوفر";
  }
}

function formatNumber(value) {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue)) return "0";

  return new Intl.NumberFormat("ar-EG").format(numericValue);
}

function formatCurrency(value, currency = "EGP") {
  const numericValue = Number(value || 0);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;

  try {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: currency || "EGP",
      maximumFractionDigits: 2,
    }).format(safeValue);
  } catch (error) {
    return `${formatNumber(safeValue)} ${currency || "EGP"}`;
  }
}

function getDaysUntil(dateValue) {
  if (!dateValue) return null;

  const targetDate = new Date(dateValue);
  if (Number.isNaN(targetDate.getTime())) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  );

  return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86400000);
}

function formatRelativeDateLabel(dateValue) {
  const days = getDaysUntil(dateValue);
  if (days === null) return "غير متوفر";
  if (days === 0) return "اليوم";
  if (days === 1) return "غدًا";
  if (days > 1) return `بعد ${formatNumber(days)} يوم`;
  if (days === -1) return "أمس";
  return `منذ ${formatNumber(Math.abs(days))} يوم`;
}

function formatLimit(limit) {
  if (limit === null || limit === undefined) return "غير متوفر";
  if (Number(limit) === -1) return "غير محدود";
  return formatNumber(limit);
}

function clampPercentage(value) {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.max(0, Math.min(numericValue, 100));
}

function getUsageTone(percentage) {
  if (percentage >= 100) {
    return {
      bar: "bg-rose-500",
      text: "text-rose-700 dark:text-rose-300",
      track: "bg-rose-100 dark:bg-rose-950/40",
    };
  }

  if (percentage >= 80) {
    return {
      bar: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-300",
      track: "bg-amber-100 dark:bg-amber-950/40",
    };
  }

  return {
    bar: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    track: "bg-emerald-100 dark:bg-emerald-950/40",
  };
}

function getSubscriptionStatusMeta(status) {
  switch (status) {
    case "CANCELLED":
      return {
        label: "ملغي",
        className:
          "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300",
      };
    case "PAUSED":
      return {
        label: "متوقف مؤقتًا",
        className:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300",
      };
    case "TRIAL":
      return {
        label: "تجريبي",
        className:
          "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/70 dark:bg-sky-950/40 dark:text-sky-300",
      };
    case "ACTIVE":
    default:
      return {
        label: "نشط",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300",
      };
  }
}

function getInvoiceStatusMeta(status) {
  switch (status) {
    case "PAID":
      return {
        label: "مدفوعة",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300",
      };
    case "OVERDUE":
      return {
        label: "متأخرة",
        className:
          "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300",
      };
    case "SENT":
      return {
        label: "مرسلة",
        className:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300",
      };
    case "DRAFT":
      return {
        label: "مسودة",
        className:
          "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300",
      };
    case "CANCELLED":
      return {
        label: "ملغية",
        className:
          "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300",
      };
    default:
      return {
        label: status || "غير معروف",
        className:
          "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300",
      };
  }
}

function getPaymentStatusMeta(status) {
  switch (status) {
    case "COMPLETED":
      return {
        label: "مكتمل",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300",
      };
    case "FAILED":
      return {
        label: "فاشل",
        className:
          "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300",
      };
    case "PENDING":
      return {
        label: "معلق",
        className:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300",
      };
    default:
      return {
        label: status || "غير معروف",
        className:
          "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300",
      };
  }
}

function getReceiptStatusMeta(status) {
  switch (status) {
    case "APPROVED":
      return {
        label: "مقبول",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300",
      };
    case "REJECTED":
      return {
        label: "مرفوض",
        className:
          "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300",
      };
    case "PENDING":
    default:
      return {
        label: "قيد المراجعة",
        className:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300",
      };
  }
}

function getAppStatusMeta(status) {
  switch (status) {
    case "TRIAL":
      return {
        label: "تجريبي",
        className:
          "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/70 dark:bg-sky-950/40 dark:text-sky-300",
      };
    case "CANCELLED":
      return {
        label: "ملغي",
        className:
          "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300",
      };
    case "ACTIVE":
    default:
      return {
        label: "نشط",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300",
      };
  }
}

function getTransactionTypeLabel(type) {
  switch (type) {
    case "DEPOSIT":
      return "شحن";
    case "PURCHASE":
      return "شراء";
    case "USAGE":
      return "استهلاك";
    case "WITHDRAW":
      return "سحب";
    case "REFUND":
      return "استرداد";
    case "CHARGE":
      return "خصم";
    default:
      return type || "معاملة";
  }
}

function getBillingTypeLabel(type) {
  switch (type) {
    case "PLATFORM_FEE":
      return "رسوم منصة";
    case "APP_SUBSCRIPTION":
    case "SUBSCRIPTION":
      return "اشتراك أداة";
    case "APP_USAGE":
    case "USAGE":
      return "استهلاك";
    case "MARKETPLACE_PURCHASE":
      return "شراء من المتجر";
    case "TOP_UP":
      return "شحن محفظة";
    default:
      return type || "حركة";
  }
}

function getPaymentMethodLabel(method) {
  switch (method) {
    case "WALLET":
      return "خصم من المحفظة";
    case "BANK_TRANSFER":
      return "تحويل بنكي";
    case "ONLINE":
      return "دفع إلكتروني";
    case "CASH":
      return "دفع نقدي";
    default:
      return method || "طريقة غير محددة";
  }
}

function getPricingModelLabel(model) {
  switch (model) {
    case "FREE":
      return "مجاني";
    case "SUBSCRIPTION":
      return "اشتراك شهري";
    case "PAY_PER_USE":
      return "حسب الاستخدام";
    case "HYBRID":
      return "اشتراك + استخدام";
    default:
      return model || "غير محدد";
  }
}

function formatUsageFeatureLabel(feature) {
  const normalizedFeature = String(feature || "").trim();
  if (!normalizedFeature) return "غير مصنف";

  const labels = {
    outbound_messages: "الرسائل الصادرة",
    pdf_exports: "تصدير PDF",
    scheduled_reports: "التقارير المجدولة",
  };

  if (labels[normalizedFeature]) {
    return labels[normalizedFeature];
  }

  return normalizedFeature.replace(/[_-]+/g, " ");
}

function getInvoiceDisplayTitle(invoice) {
  const note = invoice?.notes?.trim();
  if (note) return note;
  return invoice?.invoiceNumber || "فاتورة بدون رقم";
}

function getInvoiceReferenceLabel(invoice) {
  if (!invoice?.invoiceNumber) return null;
  if (invoice?.notes?.trim() && invoice.notes.trim() !== invoice.invoiceNumber) {
    return `رقم الفاتورة: ${invoice.invoiceNumber}`;
  }
  return null;
}

function getPaymentDisplayTitle(payment) {
  const invoiceNote = payment?.invoice?.notes?.trim();
  if (invoiceNote) return invoiceNote;
  return payment?.paymentNumber || "دفعة بدون رقم";
}

function getPaymentReferenceLabel(payment) {
  const details = [];

  if (payment?.paymentNumber) {
    details.push(`رقم العملية: ${payment.paymentNumber}`);
  }

  if (payment?.invoice?.invoiceNumber) {
    details.push(`الفاتورة: ${payment.invoice.invoiceNumber}`);
  }

  if (payment?.method) {
    details.push(getPaymentMethodLabel(payment.method));
  }

  return details.join(" • ");
}

function getReceiptDisplayTitle(receipt) {
  const receiptNote = receipt?.notes?.trim();
  if (receiptNote) return receiptNote;

  const invoiceNote = receipt?.invoice?.notes?.trim();
  if (invoiceNote) return invoiceNote;

  return receipt?.invoice?.invoiceNumber || "إيصال بدون فاتورة";
}

function getReceiptReferenceLabel(receipt) {
  const details = [];

  if (receipt?.invoice?.invoiceNumber) {
    details.push(`الفاتورة: ${receipt.invoice.invoiceNumber}`);
  }

  if (receipt?.walletNumber?.name) {
    details.push(`المحفظة: ${receipt.walletNumber.name}`);
  }

  return details.join(" • ");
}

function normalizeWebsite(website) {
  if (!website) return null;
  if (/^https?:\/\//i.test(website)) return website;
  return `https://${website}`;
}

function getCount(company, key) {
  return company?._count?.[key] || 0;
}

function getPlanMeta(plan) {
  switch (plan) {
    case "ENTERPRISE":
      return {
        label: "مؤسسي",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300",
      };
    case "PRO":
      return {
        label: "احترافي",
        className:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300",
      };
    case "BASIC":
    default:
      return {
        label: "أساسي",
        className:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-300",
      };
  }
}

function buildPlanHighlights(plan) {
  const fallback =
    DEFAULT_PLAN_COPY[plan?.planType || plan?.value || "BASIC"]?.highlights || [];
  const features = plan?.features;

  if (!features || typeof features !== "object" || Array.isArray(features)) {
    return fallback;
  }

  const highlights = [];

  if (Number.isFinite(Number(features.maxUsers)) && Number(features.maxUsers) > 0) {
    highlights.push(`${formatNumber(features.maxUsers)} مستخدم`);
  } else if (Number(features.maxUsers) === -1) {
    highlights.push("مستخدمون غير محدودين");
  }

  if (features.advancedReports) {
    highlights.push("تقارير متقدمة");
  }

  if (features.apiAccess) {
    highlights.push("API Access");
  }

  if (features.prioritySupport || features.dedicatedSupport) {
    highlights.push("دعم مميز");
  }

  return highlights.length ? highlights.slice(0, 3) : fallback;
}

function getBundleAppSlugs(bundle) {
  if (Array.isArray(bundle?.appSlugs)) {
    return bundle.appSlugs
      .map((slug) => String(slug || "").trim())
      .filter(Boolean);
  }

  if (Array.isArray(bundle?.apps)) {
    return bundle.apps
      .map((app) => String(app?.slug || "").trim())
      .filter(Boolean);
  }

  return [];
}

function getRoleLabel(role) {
  if (role === "OWNER") return "مالك";
  if (role === "COMPANY_ADMIN") return "مدير شركة";
  if (role === "MANAGER") return "مدير";
  return "موظف";
}

function FormField({ label, error, required, children }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function StatusBadge({ isActive }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-bold",
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300",
      )}
    >
      {isActive ? "نشطة" : "متوقفة"}
    </Badge>
  );
}

function MetricCard({ icon: Icon, label, value, hint, tone }) {
  return (
    <div
      className={cn(
        "min-w-[170px] rounded-[24px] border px-4 py-3 shadow-[0_20px_50px_-35px_rgba(15,27,45,0.55)]",
        tone ||
          "border-white/70 bg-white/85 text-slate-900 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="text-2xl font-black tracking-tight">{value}</p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-white/70 text-primary shadow-sm dark:bg-white/10">
          <Icon className="size-5" />
        </div>
      </div>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function FunnelStageBadge({ summary }) {
  if (!summary) {
    return null;
  }

  return (
    <div className="rounded-[22px] border border-border/70 bg-muted/20 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <Badge
          variant="outline"
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold",
            summary.badgeClassName,
          )}
        >
          {summary.label}
        </Badge>
        <span className="text-sm font-black text-foreground">
          {summary.progressLabel}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {summary.hint}
      </p>
    </div>
  );
}

function InfoLine({ icon: Icon, children, asLink, href }) {
  const content = (
    <span className="inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
      <Icon className="size-4 shrink-0 text-primary/80" />
      <span className="truncate">{children}</span>
      {asLink ? <ExternalLink className="size-3.5 shrink-0 opacity-70" /> : null}
    </span>
  );

  if (asLink && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-w-0 hover:text-primary"
      >
        {content}
      </a>
    );
  }

  return content;
}

function SectionShell({ title, description, actions, children, className }) {
  return (
    <Card
      className={cn(
        "rounded-[30px] border-white/70 bg-white/85 dark:border-white/10 dark:bg-slate-950/55",
        className,
      )}
    >
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl font-black">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function MiniStat({ label, value, helper, valueClassName }) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-muted/20 p-4">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-lg font-black text-foreground", valueClassName)}>
        {value}
      </p>
      {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function UsageBar({ percentage }) {
  const clamped = clampPercentage(percentage);
  const tone = getUsageTone(clamped);

  return (
    <div className={cn("mt-3 h-2.5 overflow-hidden rounded-full", tone.track)}>
      <div
        className={cn("h-full rounded-full transition-all", tone.bar)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function ResponsiveOverlay({
  mobile,
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName,
  bodyClassName,
}) {
  if (mobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={cn(
            "max-h-[94vh] rounded-t-[2rem] border-t border-white/60 bg-white/95 px-0 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-0 shadow-[0_-30px_80px_-35px_rgba(15,27,45,0.6)] dark:border-white/10 dark:bg-slate-950/96",
            contentClassName,
          )}
          dir="rtl"
        >
          <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-muted" />
          <SheetHeader className="border-b border-border/60 px-4 pb-4 pt-4 text-right">
            <SheetTitle className="text-right text-lg font-black">{title}</SheetTitle>
            {description ? (
              <SheetDescription className="text-right">
                {description}
              </SheetDescription>
            ) : null}
          </SheetHeader>
          <div className={cn("overflow-y-auto px-4 py-4", bodyClassName)}>{children}</div>
          {footer ? (
            <SheetFooter className="mt-0 gap-2 border-t border-border/60 bg-muted/30 px-4 pb-0 pt-4">
              {footer}
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-3xl gap-0 overflow-hidden rounded-[28px] border border-white/70 bg-white/96 p-0 shadow-[0_45px_140px_-55px_rgba(15,27,45,0.65)] dark:border-white/10 dark:bg-slate-950/95",
          contentClassName,
        )}
        dir="rtl"
      >
        <DialogHeader className="border-b border-border/60 px-6 pb-4 pt-6 text-right">
          <DialogTitle className="text-right text-xl font-black">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-right">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className={cn("max-h-[75vh] overflow-y-auto px-6 py-5", bodyClassName)}>
          {children}
        </div>
        {footer ? (
          <DialogFooter className="border-t border-border/60 bg-muted/30 px-6 py-4 sm:justify-start">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function normalizeCompanyData(rawCompany, fallback = null) {
  if (!rawCompany) return fallback;

  return {
    ...(fallback || {}),
    ...rawCompany,
    _count: {
      ...(fallback?._count || {}),
      ...(rawCompany._count || {}),
    },
  };
}

const SuperAdminCompanyDetails = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [company, setCompany] = useState(null);
  const [review, setReview] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [facebookPages, setFacebookPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [error, setError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    plan: "BASIC",
    currency: "EGP",
    isActive: true,
  });
  const [editErrors, setEditErrors] = useState({});

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [changeOwnerTargetUserId, setChangeOwnerTargetUserId] = useState("");

  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [addEmployeeForm, setAddEmployeeForm] = useState(INITIAL_EMPLOYEE_FORM);
  const [addEmployeeErrors, setAddEmployeeErrors] = useState({});

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpForm, setTopUpForm] = useState({
    amount: "",
    bonus: "",
    notes: "",
  });
  const [topUpErrors, setTopUpErrors] = useState({});

  const [activationLoading, setActivationLoading] = useState(true);
  const [activationError, setActivationError] = useState("");
  const [catalogPlans, setCatalogPlans] = useState([]);
  const [catalogApps, setCatalogApps] = useState([]);
  const [catalogBundles, setCatalogBundles] = useState([]);
  const [planAction, setPlanAction] = useState("");
  const [bundleAction, setBundleAction] = useState("");
  const [appAction, setAppAction] = useState("");
  const [installAllLoading, setInstallAllLoading] = useState(false);

  const ownerUser = useMemo(
    () =>
      companyUsers.find((user) => user.role === "OWNER") ||
      companyUsers.find((user) => user.role === "COMPANY_ADMIN") ||
      null,
    [companyUsers],
  );

  const activeUsersCount = useMemo(
    () => companyUsers.filter((user) => user.isActive).length,
    [companyUsers],
  );

  const inactiveUsersCount = useMemo(
    () => companyUsers.filter((user) => !user.isActive).length,
    [companyUsers],
  );

  const syncEditForm = (nextCompany) => {
    if (!nextCompany) return;

    setEditForm({
      name: nextCompany.name || "",
      email: nextCompany.email || "",
      phone: nextCompany.phone || "",
      website: nextCompany.website || "",
      plan: nextCompany.plan || "BASIC",
      currency: nextCompany.currency || "EGP",
      isActive: nextCompany.isActive ?? true,
    });
  };

  const getCompanyScopedRequestConfig = (config = {}) => ({
    ...config,
    headers: {
      ...(config.headers || {}),
      "X-Company-Id": companyId,
    },
  });

  const refreshCompanyWorkspace = async ({ background = false } = {}) => {
    if (!companyId) {
      setError("معرف الشركة غير متوفر");
      setReview(null);
      setLoading(false);
      return;
    }

    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setUsersLoading(true);
    setPagesLoading(true);
    setError("");

    try {
      const [detailResult, usersResult, pagesResult] = await Promise.allSettled([
        apiClient.get(`/admin/companies/${companyId}`),
        apiClient.get(`/admin/companies/${companyId}/users`, {
          params: { limit: 100, sortBy: "createdAt", sortOrder: "desc" },
        }),
        apiClient.get(`/admin/companies/${companyId}/facebook-pages`),
      ]);

      if (detailResult.status !== "fulfilled" || !detailResult.value.data?.success) {
        setCompany(null);
        setReview(null);
        setCompanyUsers([]);
        setFacebookPages([]);
        setError("تعذر تحميل بيانات الشركة");
        return;
      }

      let nextCompany = normalizeCompanyData(detailResult.value.data.data?.company);
      const nextReview = detailResult.value.data.data?.review || null;

      if (usersResult.status === "fulfilled" && usersResult.value.data?.success) {
        setCompanyUsers(usersResult.value.data.data?.users || []);
      } else {
        setCompanyUsers([]);
        toast.error("تعذر تحميل أعضاء الشركة");
      }

      if (pagesResult.status === "fulfilled" && pagesResult.value.data?.success) {
        const nextPages = pagesResult.value.data.data || [];
        setFacebookPages(nextPages);
        nextCompany = normalizeCompanyData(nextCompany, {
          _count: { facebookPages: nextPages.length },
        });
      } else {
        setFacebookPages([]);
        toast.error("تعذر تحميل صفحات فيسبوك");
      }

      setCompany(nextCompany);
      setReview(nextReview);
      syncEditForm(nextCompany);
    } catch (nextError) {
      setCompany(null);
      setReview(null);
      setCompanyUsers([]);
      setFacebookPages([]);
      setError(extractErrorMessage(nextError, "تعذر تحميل مساحة الشركة"));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setUsersLoading(false);
      setPagesLoading(false);
    }
  };

  const refreshActivationCatalog = async () => {
    if (!companyId) {
      setCatalogPlans([]);
      setCatalogApps([]);
      setCatalogBundles([]);
      setActivationLoading(false);
      setActivationError("");
      return;
    }

    setActivationLoading(true);
    setActivationError("");

    try {
      const [plansResult, appsResult, bundlesResult] = await Promise.allSettled([
        apiClient.get("/admin/plans/plans"),
        apiClient.get(
          "/marketplace/apps",
          getCompanyScopedRequestConfig({
            params: { sort: "featured" },
            _skipTransientRetry: true,
          }),
        ),
        apiClient.get(
          "/marketplace/bundles",
          getCompanyScopedRequestConfig({
            _skipTransientRetry: true,
          }),
        ),
      ]);

      if (plansResult.status === "fulfilled" && plansResult.value.data?.success) {
        setCatalogPlans(Array.isArray(plansResult.value.data.data) ? plansResult.value.data.data : []);
      } else {
        setCatalogPlans([]);
      }

      if (appsResult.status === "fulfilled" && appsResult.value.data?.success) {
        setCatalogApps(Array.isArray(appsResult.value.data.data) ? appsResult.value.data.data : []);
      } else {
        setCatalogApps([]);
      }

      if (bundlesResult.status === "fulfilled" && bundlesResult.value.data?.success) {
        setCatalogBundles(Array.isArray(bundlesResult.value.data.data) ? bundlesResult.value.data.data : []);
      } else {
        setCatalogBundles([]);
      }

      const activationSourcesFailed =
        (appsResult.status !== "fulfilled" || !appsResult.value.data?.success) &&
        (bundlesResult.status !== "fulfilled" || !bundlesResult.value.data?.success);

      if (activationSourcesFailed) {
        setActivationError("تعذر تحميل خيارات التفعيل والاشتراكات لهذه الشركة.");
      }
    } catch (nextError) {
      setCatalogPlans([]);
      setCatalogApps([]);
      setCatalogBundles([]);
      setActivationError(
        extractErrorMessage(nextError, "تعذر تحميل خيارات التفعيل والاشتراكات"),
      );
    } finally {
      setActivationLoading(false);
    }
  };

  useEffect(() => {
    void refreshCompanyWorkspace();
    void refreshActivationCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const validateEditForm = () => {
    const nextErrors = {};

    if (!editForm.name.trim()) {
      nextErrors.name = "اسم الشركة مطلوب";
    }

    if (!editForm.email.trim()) {
      nextErrors.email = "البريد الإلكتروني مطلوب";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      nextErrors.email = "صيغة البريد الإلكتروني غير صحيحة";
    }

    if (!editForm.plan) {
      nextErrors.plan = "الخطة مطلوبة";
    }

    if (!editForm.currency) {
      nextErrors.currency = "العملة مطلوبة";
    }

    setEditErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveCompany = async () => {
    if (!companyId || !validateEditForm()) return;

    try {
      setEditSaving(true);

      const response = await apiClient.put(`/admin/companies/${companyId}`, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        website: editForm.website.trim(),
        plan: editForm.plan,
        currency: editForm.currency,
        isActive: editForm.isActive,
      });

      if (response.data?.success) {
        toast.success("تم تحديث بيانات الشركة");
        setEditOpen(false);
        await refreshCompanyWorkspace({ background: true });
      } else {
        toast.error(response.data?.message || "فشل في تحديث الشركة");
      }
    } catch (nextError) {
      toast.error(extractErrorMessage(nextError, "فشل في تحديث الشركة"));
    } finally {
      setEditSaving(false);
    }
  };

  const validateEmployeeForm = () => {
    const nextErrors = {};

    if (!addEmployeeForm.firstName.trim()) {
      nextErrors.firstName = "الاسم الأول مطلوب";
    }

    if (!addEmployeeForm.lastName.trim()) {
      nextErrors.lastName = "الاسم الأخير مطلوب";
    }

    if (!addEmployeeForm.email.trim()) {
      nextErrors.email = "البريد الإلكتروني مطلوب";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addEmployeeForm.email)) {
      nextErrors.email = "صيغة البريد الإلكتروني غير صحيحة";
    }

    if (!addEmployeeForm.password.trim()) {
      nextErrors.password = "كلمة المرور مطلوبة";
    }

    setAddEmployeeErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleAddEmployee = async () => {
    if (!companyId || !validateEmployeeForm()) return;

    try {
      setEmployeeLoading(true);

      const response = await apiClient.post(`/admin/companies/${companyId}/employees`, {
        firstName: addEmployeeForm.firstName.trim(),
        lastName: addEmployeeForm.lastName.trim(),
        email: addEmployeeForm.email.trim(),
        password: addEmployeeForm.password,
        role: addEmployeeForm.role,
      });

      if (response.data?.success) {
        toast.success("تمت إضافة العضو بنجاح");
        setAddEmployeeOpen(false);
        setAddEmployeeForm(INITIAL_EMPLOYEE_FORM);
        await refreshCompanyWorkspace({ background: true });
      } else {
        toast.error(response.data?.message || "فشل في إضافة العضو");
      }
    } catch (nextError) {
      toast.error(extractErrorMessage(nextError, "فشل في إضافة العضو"));
    } finally {
      setEmployeeLoading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!companyId || !changeOwnerTargetUserId) return;

    try {
      setTransferLoading(true);

      const response = await apiClient.post(
        `/admin/companies/${companyId}/transfer-ownership`,
        { targetUserId: changeOwnerTargetUserId },
      );

      if (response.data?.success) {
        toast.success("تم نقل ملكية الشركة بنجاح");
        setTransferOpen(false);
        setChangeOwnerTargetUserId("");
        await refreshCompanyWorkspace({ background: true });
      } else {
        toast.error(response.data?.message || "فشل في نقل الملكية");
      }
    } catch (nextError) {
      toast.error(extractErrorMessage(nextError, "فشل في نقل الملكية"));
    } finally {
      setTransferLoading(false);
    }
  };

  const handleLoginAsAdmin = async () => {
    if (!companyId) return;

    try {
      const response = await apiClient.post(`/admin/companies/${companyId}/login-as-admin`);

      if (response.data?.success) {
        const currentSuperToken = tokenManager.getAccessToken();
        if (currentSuperToken) {
          localStorage.setItem("superAuth", currentSuperToken);
        }

        const currentUser = localStorage.getItem("user");
        if (currentUser) {
          localStorage.setItem("superUser", currentUser);
        }

        tokenManager.setAccessToken(response.data.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.data.user));
        window.location.href = "/company-dashboard";
        return;
      }

      toast.error(response.data?.message || "فشل في تسجيل الدخول كمدير الشركة");
    } catch (nextError) {
      toast.error(extractErrorMessage(nextError, "فشل في تسجيل الدخول كمدير الشركة"));
    }
  };

  const openEditModal = () => {
    if (!company) return;
    syncEditForm(company);
    setEditErrors({});
    setEditOpen(true);
  };

  const openAddEmployeeModal = () => {
    setAddEmployeeErrors({});
    setAddEmployeeForm(INITIAL_EMPLOYEE_FORM);
    setAddEmployeeOpen(true);
  };

  const openTopUpModal = () => {
    setTopUpErrors({});
    setTopUpForm({
      amount: "",
      bonus: "",
      notes: "",
    });
    setTopUpOpen(true);
  };

  const validateTopUpForm = () => {
    const nextErrors = {};
    const amount = Number(topUpForm.amount);
    const bonus = topUpForm.bonus === "" ? 0 : Number(topUpForm.bonus);

    if (!Number.isFinite(amount) || amount <= 0) {
      nextErrors.amount = "أدخل قيمة شحن صحيحة أكبر من صفر";
    }

    if (!Number.isFinite(bonus) || bonus < 0) {
      nextErrors.bonus = "البونص يجب أن يكون رقمًا موجبًا أو صفرًا";
    }

    setTopUpErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleTopUpWallet = async () => {
    if (!companyId || !validateTopUpForm()) return;

    try {
      setTopUpLoading(true);

      const response = await apiClient.post("/admin/wallet/add-funds", {
        companyId,
        amount: Number(topUpForm.amount),
        bonus: topUpForm.bonus === "" ? 0 : Number(topUpForm.bonus),
        notes: topUpForm.notes.trim(),
      });

      if (response.data?.success) {
        toast.success("تم شحن محفظة الشركة بنجاح");
        setTopUpOpen(false);
        await refreshCompanyWorkspace({ background: true });
      } else {
        toast.error(response.data?.message || "فشل في شحن محفظة الشركة");
      }
    } catch (nextError) {
      toast.error(extractErrorMessage(nextError, "فشل في شحن محفظة الشركة"));
    } finally {
      setTopUpLoading(false);
    }
  };

  const scrollToActivationSection = () => {
    if (typeof document === "undefined") return;
    document
      .getElementById("company-activation-center")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const refreshReviewAndCatalog = async () => {
    await Promise.all([
      refreshCompanyWorkspace({ background: true }),
      refreshActivationCatalog(),
    ]);
  };

  const resolvedPlanCatalog = useMemo(() => {
    return PLAN_OPTIONS.map((option) => {
      const matchedPlan = catalogPlans.find((plan) => plan.planType === option.value);
      return {
        planType: option.value,
        name: matchedPlan?.name || getPlanMeta(option.value).label,
        description:
          matchedPlan?.description || DEFAULT_PLAN_COPY[option.value]?.description || "",
        highlights: buildPlanHighlights(matchedPlan || option),
      };
    });
  }, [catalogPlans]);

  const companyInstalledAppsBySlug = useMemo(() => {
    const entries = (review?.usage?.installedApps || []).filter((companyApp) =>
      ["ACTIVE", "TRIAL"].includes(companyApp.status),
    );

    return new Map(
      entries
        .filter((companyApp) => companyApp?.app?.slug)
        .map((companyApp) => [companyApp.app.slug, companyApp]),
    );
  }, [review?.usage?.installedApps]);

  const orderedCatalogApps = useMemo(() => {
    const withCompanyState = catalogApps
      .filter((app) => app?.isActive !== false)
      .map((app) => {
        const installedApp = companyInstalledAppsBySlug.get(app.slug);

        return {
          ...app,
          isInstalled: Boolean(installedApp),
          activePricingModel:
            installedApp?.activePricingModel || installedApp?.app?.pricingModel || null,
        };
      });

    return sortAppsByDependencies(withCompanyState);
  }, [catalogApps, companyInstalledAppsBySlug]);

  const appNameBySlug = useMemo(
    () => new Map(orderedCatalogApps.map((app) => [app.slug, app.name])),
    [orderedCatalogApps],
  );

  const installedCatalogAppSlugs = useMemo(
    () => new Set(Array.from(companyInstalledAppsBySlug.keys())),
    [companyInstalledAppsBySlug],
  );

  const resolvedBundles = useMemo(() => {
    return catalogBundles.map((bundle) => {
      const appSlugs = getBundleAppSlugs(bundle);
      const installedCount = appSlugs.filter((slug) =>
        installedCatalogAppSlugs.has(slug),
      ).length;

      return {
        ...bundle,
        appSlugs,
        installedCount,
        totalApps: appSlugs.length,
        isComplete: appSlugs.length > 0 && installedCount === appSlugs.length,
      };
    });
  }, [catalogBundles, installedCatalogAppSlugs]);

  const currentPlanType = review?.subscription?.plan || company?.plan || "BASIC";

  const handleAssignPlatformPlan = async (planType) => {
    if (!companyId || !planType) return;

    try {
      setPlanAction(planType);

      const response = await apiClient.post(
        "/platform-subscription/upgrade",
        { newPlan: planType },
        getCompanyScopedRequestConfig(),
      );

      if (response.data?.success) {
        toast.success(
          `تم تفعيل خطة ${getPlanMeta(planType).label} للشركة بنجاح`,
        );
        await refreshReviewAndCatalog();
      } else {
        toast.error(response.data?.message || "فشل في تفعيل الخطة");
      }
    } catch (nextError) {
      toast.error(extractErrorMessage(nextError, "فشل في تفعيل الخطة"));
    } finally {
      setPlanAction("");
    }
  };

  const handleInstallApp = async (app) => {
    if (!companyId || !app?.slug) return;

    try {
      setAppAction(app.slug);

      const response = await apiClient.post(
        `/marketplace/apps/${app.slug}/install`,
        { pricingModel: getDefaultPricingModel(app) },
        getCompanyScopedRequestConfig(),
      );

      const autoInstalledRequiredApps =
        response.data?.data?.autoInstalledRequiredApps ?? [];
      const autoInstalledNames = autoInstalledRequiredApps.map(
        (requiredApp) => requiredApp?.name || requiredApp?.slug,
      );

      toast.success(
        autoInstalledNames.length > 0
          ? `تم تفعيل ${app.name} مع المتطلبات: ${autoInstalledNames.join("، ")}`
          : `تم تفعيل ${app.name} بنجاح`,
      );

      await refreshReviewAndCatalog();
    } catch (nextError) {
      toast.error(extractErrorMessage(nextError, "فشل في تفعيل الأداة"));
    } finally {
      setAppAction("");
    }
  };

  const handleSubscribeBundle = async (bundleSlug) => {
    if (!companyId || !bundleSlug) return;

    try {
      setBundleAction(bundleSlug);

      const response = await apiClient.post(
        `/marketplace/bundles/${bundleSlug}/subscribe`,
        {},
        getCompanyScopedRequestConfig(),
      );

      if (response.data?.success) {
        toast.success(response.data.message || "تم الاشتراك في الباقة بنجاح");
        await refreshReviewAndCatalog();
      } else {
        toast.error(response.data?.message || "فشل في الاشتراك في الباقة");
      }
    } catch (nextError) {
      toast.error(extractErrorMessage(nextError, "فشل في الاشتراك في الباقة"));
    } finally {
      setBundleAction("");
    }
  };

  const handleActivateAllTools = async () => {
    if (!companyId) return;

    const uninstalledApps = orderedCatalogApps.filter((app) => !app.isInstalled);

    if (!uninstalledApps.length) {
      toast.success("كل الأدوات المتاحة مفعلة بالفعل على هذه الشركة");
      return;
    }

    setInstallAllLoading(true);
    let successCount = 0;
    let failCount = 0;
    const toastId = toast.loading("جاري تفعيل أدوات الشركة...");

    try {
      for (let index = 0; index < uninstalledApps.length; index += 1) {
        const app = uninstalledApps[index];
        const progress = Math.round(((index + 1) / uninstalledApps.length) * 100);

        toast.loading(`جاري تفعيل ${app.name}... ${progress}%`, {
          id: toastId,
        });

        try {
          await apiClient.post(
            `/marketplace/apps/${app.slug}/install`,
            { pricingModel: getDefaultPricingModel(app) },
            getCompanyScopedRequestConfig(),
          );
          successCount += 1;
        } catch (nextError) {
          console.error(`Failed to activate ${app.slug}:`, nextError);
          failCount += 1;
        }
      }

      if (failCount === 0) {
        toast.success(`تم تفعيل ${successCount} أداة للشركة بنجاح`, { id: toastId });
      } else {
        toast.success(
          `تم تفعيل ${successCount} أداة، وتعذر تفعيل ${failCount} أداة`,
          { id: toastId },
        );
      }

      await refreshReviewAndCatalog();
    } catch (nextError) {
      toast.error(extractErrorMessage(nextError, "حدث خطأ أثناء التفعيل الجماعي"), {
        id: toastId,
      });
    } finally {
      setInstallAllLoading(false);
    }
  };

  const topUpAmountPreview = Number.isFinite(Number(topUpForm.amount))
    ? Number(topUpForm.amount)
    : 0;
  const topUpBonusPreview = Number.isFinite(Number(topUpForm.bonus))
    ? Number(topUpForm.bonus)
    : 0;
  const reviewCurrency = review?.wallet?.currency || company?.currency || "EGP";
  const limitEntries = review?.limits?.entries || [];
  const highUsageItems = limitEntries.filter((entry) => entry.percentage >= 80);
  const nextBillingDate = review?.subscription?.nextBillingDate || null;
  const daysUntilBilling = getDaysUntil(nextBillingDate);

  const reviewAlerts = useMemo(() => {
    if (!review) return [];

    const alerts = [];

    if (review.subscription?.failedAttempts > 0) {
      alerts.push({
        key: "failed-attempts",
        title: "محاولات دفع فاشلة",
        description: `يوجد ${formatNumber(review.subscription.failedAttempts)} محاولة فاشلة على اشتراك الشركة وتحتاج مراجعة.`,
        tone:
          "border-rose-200 bg-rose-50/90 text-rose-900 dark:border-rose-800/70 dark:bg-rose-950/30 dark:text-rose-100",
      });
    }

    if (daysUntilBilling !== null && daysUntilBilling <= 7) {
      alerts.push({
        key: "renewal-soon",
        title: daysUntilBilling < 0 ? "التجديد متأخر" : "التجديد قريب",
        description: nextBillingDate
          ? `تاريخ التجديد ${formatDate(nextBillingDate)} (${formatRelativeDateLabel(nextBillingDate)}).`
          : "لا يوجد تاريخ تجديد محدد حاليًا.",
        tone:
          daysUntilBilling < 0
            ? "border-rose-200 bg-rose-50/90 text-rose-900 dark:border-rose-800/70 dark:bg-rose-950/30 dark:text-rose-100"
            : "border-amber-200 bg-amber-50/90 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-100",
      });
    }

    if ((review.wallet?.balance || 0) < (review.subscription?.monthlyFee || 0)) {
      alerts.push({
        key: "wallet-balance",
        title: "رصيد المحفظة أقل من رسوم الاشتراك",
        description: `الرصيد الحالي ${formatCurrency(review.wallet?.balance, reviewCurrency)} بينما الرسوم ${formatCurrency(review.subscription?.monthlyFee, reviewCurrency)}.`,
        tone:
          "border-amber-200 bg-amber-50/90 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-100",
      });
    }

    if ((review.billing?.stats?.overdueInvoices || 0) > 0) {
      alerts.push({
        key: "overdue-invoices",
        title: "فواتير متأخرة",
        description: `هناك ${formatNumber(review.billing.stats.overdueInvoices)} فاتورة متأخرة لهذه الشركة.`,
        tone:
          "border-rose-200 bg-rose-50/90 text-rose-900 dark:border-rose-800/70 dark:bg-rose-950/30 dark:text-rose-100",
      });
    }

    if ((review.billing?.stats?.pendingReceipts || 0) > 0) {
      alerts.push({
        key: "pending-receipts",
        title: "إيصالات بانتظار المراجعة",
        description: `يوجد ${formatNumber(review.billing.stats.pendingReceipts)} إيصال يحتاج اعتمادًا من السوبر أدمن.`,
        tone:
          "border-sky-200 bg-sky-50/90 text-sky-900 dark:border-sky-800/70 dark:bg-sky-950/30 dark:text-sky-100",
      });
    }

    if (highUsageItems.length) {
      alerts.push({
        key: "limit-usage",
        title: "حدود استخدام مرتفعة",
        description: `هناك ${formatNumber(highUsageItems.length)} مؤشر اقترب من الحد المسموح أو تجاوزه.`,
        tone:
          "border-amber-200 bg-amber-50/90 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-100",
      });
    }

    return alerts.slice(0, 4);
  }, [daysUntilBilling, highUsageItems.length, nextBillingDate, review, reviewCurrency]);

  const financialMetrics = review
    ? [
        {
          icon: Wallet,
          label: "رصيد المحفظة",
          value: formatCurrency(review.wallet?.balance, reviewCurrency),
          hint: `إجمالي الإيداعات ${formatCurrency(review.wallet?.totalDeposited, reviewCurrency)}`,
          tone:
            "border-emerald-200/80 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(209,250,229,0.78))] text-emerald-900 dark:border-emerald-900/60 dark:bg-[linear-gradient(135deg,rgba(6,78,59,0.52),rgba(4,120,87,0.22))] dark:text-emerald-100",
        },
        {
          icon: CalendarClock,
          label: "التجديد القادم",
          value: nextBillingDate ? formatDate(nextBillingDate) : "غير متوفر",
          hint: nextBillingDate ? formatRelativeDateLabel(nextBillingDate) : "لا يوجد موعد محدد",
          tone:
            "border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(254,243,199,0.82))] text-amber-900 dark:border-amber-900/60 dark:bg-[linear-gradient(135deg,rgba(120,53,15,0.45),rgba(146,64,14,0.22))] dark:text-amber-100",
        },
        {
          icon: BarChart3,
          label: "استهلاك الشهر",
          value: formatCurrency(review.usage?.costs?.total, reviewCurrency),
          hint: `${formatNumber(review.usage?.totalActions)} عملية / ${formatNumber(review.usage?.totalQuantity)} وحدة`,
          tone:
            "border-sky-200/80 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(219,234,254,0.82))] text-sky-900 dark:border-sky-900/60 dark:bg-[linear-gradient(135deg,rgba(7,89,133,0.48),rgba(2,132,199,0.22))] dark:text-sky-100",
        },
        {
          icon: Receipt,
          label: "الفواتير المفتوحة",
          value: formatNumber(review.billing?.stats?.unpaidInvoices || 0),
          hint: `المتأخرة ${formatNumber(review.billing?.stats?.overdueInvoices || 0)}`,
          tone:
            "border-rose-200/80 bg-[linear-gradient(135deg,rgba(255,241,242,0.96),rgba(254,205,211,0.82))] text-rose-900 dark:border-rose-900/60 dark:bg-[linear-gradient(135deg,rgba(127,29,29,0.42),rgba(190,24,93,0.18))] dark:text-rose-100",
        },
        {
          icon: Boxes,
          label: "الأدوات النشطة",
          value: formatNumber(review.usage?.activeApps || 0),
          hint: `فشل مدفوعات ${formatNumber(review.billing?.stats?.failedPayments || 0)}`,
          tone:
            "border-violet-200/80 bg-[linear-gradient(135deg,rgba(245,243,255,0.96),rgba(233,213,255,0.8))] text-violet-900 dark:border-violet-900/60 dark:bg-[linear-gradient(135deg,rgba(76,29,149,0.42),rgba(109,40,217,0.2))] dark:text-violet-100",
        },
      ]
    : [];

  const detailMetrics = company
    ? [
        {
          icon: Users,
          label: "المستخدمين",
          value: getCount(company, "users"),
          hint: `${activeUsersCount} نشط / ${inactiveUsersCount} غير نشط`,
        },
        {
          icon: Building2,
          label: "العملاء",
          value: getCount(company, "customers"),
          hint: "قاعدة العملاء الحالية",
        },
        {
          icon: Package,
          label: "المنتجات",
          value: getCount(company, "products"),
          hint: "المتاح على النظام",
        },
        {
          icon: MessageSquare,
          label: "المحادثات",
          value: getCount(company, "conversations"),
          hint: "الأنشطة التفاعلية",
        },
        {
          icon: Facebook,
          label: "صفحات فيسبوك",
          value: getCount(company, "facebookPages") || facebookPages.length,
          hint: pagesLoading ? "جاري التحميل..." : "قنوات الربط الحالية",
        },
      ]
    : [];

  const funnelSummary = company ? getCompanyFunnelSummary(company) : null;
  const funnelAnalytics = company ? getCompanyFunnelAnalytics(company) : null;
  const recentFunnelEvents = funnelAnalytics?.recentEvents?.length
    ? [...funnelAnalytics.recentEvents]
        .filter((event) => event?.occurredAt)
        .slice(-6)
        .reverse()
    : [];
  const funnelMetrics = funnelAnalytics
    ? [
        {
          icon: UserPlus,
          label: "التسجيل",
          value: funnelAnalytics.register.firstCompletedAt ? "مكتمل" : "غير متتبع",
          hint: funnelAnalytics.register.source
            ? `المصدر ${funnelAnalytics.register.source}`
            : "بداية الرحلة",
          tone:
            "border-slate-200/80 bg-slate-50 text-slate-900 dark:border-slate-700/70 dark:bg-slate-950/50 dark:text-slate-100",
        },
        {
          icon: ArrowLeftRight,
          label: "Onboarding",
          value: `${funnelAnalytics.onboarding.completedCount}/${funnelAnalytics.onboarding.totalSteps}`,
          hint:
            funnelAnalytics.onboarding.status === "completed"
              ? "اكتمل الإعداد الأساسي"
              : funnelAnalytics.onboarding.status === "in_progress"
                ? "ما زال العميل داخل الإعداد"
                : "لم يبدأ بعد",
          tone:
            "border-sky-200/80 bg-sky-50 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-100",
        },
        {
          icon: Sparkles,
          label: "التفعيل",
          value: `${funnelAnalytics.activation.completedCount}/${funnelAnalytics.activation.totalSteps}`,
          hint:
            funnelAnalytics.activation.status === "completed"
              ? "اكتملت أول قيمة فعلية"
              : funnelAnalytics.activation.status === "in_progress"
                ? "جارٍ الوصول لأول قيمة"
                : "لم يبدأ التفعيل بعد",
          tone:
            "border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100",
        },
        {
          icon: CheckCircle2,
          label: "الحالة الحالية",
          value: funnelSummary?.shortLabel || "غير متوفر",
          hint: funnelSummary?.hint || "لا توجد بيانات كافية",
          tone:
            funnelSummary?.stageKey === "activated"
              ? "border-emerald-200/80 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-100"
              : "border-violet-200/80 bg-violet-50 text-violet-900 dark:border-violet-900/60 dark:bg-violet-950/35 dark:text-violet-100",
        },
      ]
    : [];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(246,250,255,0.9),rgba(255,248,240,0.92))] p-5 shadow-[0_35px_120px_-55px_rgba(15,27,45,0.55)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.92),rgba(30,41,59,0.92))] sm:p-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-16 top-0 size-48 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-400/10" />
          <div className="absolute left-0 top-12 size-56 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-400/10" />
          <div className="absolute bottom-0 right-1/3 size-40 rounded-full bg-emerald-300/10 blur-3xl dark:bg-emerald-400/10" />
        </div>

        <div className="relative space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl border-white/70 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/5"
                onClick={() => navigate("/super-admin/companies")}
              >
                <ArrowLeft className="size-4" />
                رجوع لإدارة الشركات
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl border-white/70 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/5"
                onClick={() => void refreshCompanyWorkspace({ background: true })}
                disabled={refreshing || loading}
              >
                {refreshing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                تحديث البيانات
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl border-white/70 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/5"
                onClick={scrollToActivationSection}
                disabled={loading}
              >
                <Boxes className="size-4" />
                إدارة التفعيل
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl"
                onClick={openTopUpModal}
                disabled={!company}
              >
                <Wallet className="size-4" />
                شحن المحفظة
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl"
                onClick={openEditModal}
                disabled={!company}
              >
                <Sparkles className="size-4" />
                تعديل الشركة
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl"
                onClick={openAddEmployeeModal}
                disabled={!company}
              >
                <UserPlus className="size-4" />
                إضافة عضو
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl"
                onClick={() => setTransferOpen(true)}
                disabled={!company || usersLoading || companyUsers.length === 0}
              >
                <ArrowLeftRight className="size-4" />
                نقل الملكية
              </Button>
              <Button
                type="button"
                className="h-11 rounded-2xl"
                onClick={() => void handleLoginAsAdmin()}
                disabled={!company}
              >
                <LogIn className="size-4" />
                دخول كأدمن
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
              <Skeleton className="h-72 rounded-[30px]" />
              <Skeleton className="h-72 rounded-[30px]" />
            </div>
          ) : error ? (
            <Alert className="rounded-[28px] border-destructive/40 bg-destructive/5 text-right">
              <AlertTriangle className="size-4" />
              <AlertTitle>تعذر تحميل الصفحة</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : company ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
              <Card className="rounded-[30px] border-white/70 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/50">
                <CardContent className="space-y-5 p-5 sm:p-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <div className="flex size-20 shrink-0 items-center justify-center rounded-[28px] bg-gradient-to-br from-primary/15 via-primary/10 to-amber-200/60 text-3xl font-black text-primary dark:to-amber-500/20">
                      {company.name?.charAt(0) || "ش"}
                    </div>

                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                            {company.name}
                          </h1>
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[11px] font-bold",
                              getPlanMeta(company.plan).className,
                            )}
                          >
                            {getPlanMeta(company.plan).label}
                          </Badge>
                          <StatusBadge isActive={company.isActive} />
                        </div>

                        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                          لوحة مراجعة موحدة تجمع هوية الشركة، الاشتراك، المحفظة،
                          الاستهلاك، التحصيل، وأدوات الإدارة الحساسة في شاشة واحدة.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <InfoLine icon={Mail}>{company.email || "غير متوفر"}</InfoLine>
                        {company.phone ? (
                          <InfoLine icon={Phone}>{company.phone}</InfoLine>
                        ) : null}
                        {company.website ? (
                          <InfoLine
                            icon={Globe}
                            asLink
                            href={normalizeWebsite(company.website)}
                          >
                            {company.website}
                          </InfoLine>
                        ) : null}
                        <InfoLine icon={ShieldCheck}>
                          {ownerUser
                            ? `${ownerUser.firstName} ${ownerUser.lastName}`
                            : "لا يوجد مالك محدد"}
                        </InfoLine>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className="rounded-full border-white/70 bg-white/75 px-3 py-1.5 text-xs dark:border-white/10 dark:bg-white/5"
                        >
                          العملة: {company.currency || "EGP"}
                        </Badge>
                        {company.slug ? (
                          <Badge
                            variant="outline"
                            className="rounded-full border-white/70 bg-white/75 px-3 py-1.5 text-xs dark:border-white/10 dark:bg-white/5"
                          >
                            slug: {company.slug}
                          </Badge>
                        ) : null}
                        {review?.limits?.coupon?.appliedCode ? (
                          <Badge
                            variant="outline"
                            className="rounded-full border-sky-200 bg-sky-50 px-3 py-1.5 text-xs text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-300"
                          >
                            كوبون: {review.limits.coupon.appliedCode}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[30px] border-slate-900/10 bg-slate-950 text-slate-50 shadow-[0_35px_120px_-70px_rgba(15,27,45,0.8)] dark:border-white/10">
                <CardHeader className="space-y-3">
                  <Badge
                    variant="outline"
                    className="w-fit rounded-full border-white/15 bg-white/5 px-3 py-1 text-[11px] text-slate-200"
                  >
                    مركز المراجعة
                  </Badge>
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-black">
                      جاهزية الشركة الآن
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                      أهم ما يحتاجه السوبر أدمن قبل اتخاذ قرار مالي أو إداري.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        التجديد
                      </p>
                      <p className="mt-2 text-lg font-black">
                        {nextBillingDate ? formatDate(nextBillingDate) : "غير متوفر"}
                      </p>
                      <p className="mt-1 text-xs text-slate-300">
                        {nextBillingDate
                          ? formatRelativeDateLabel(nextBillingDate)
                          : "لا يوجد موعد مجدول"}
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        المحفظة
                      </p>
                      <p className="mt-2 text-lg font-black">
                        {formatCurrency(review?.wallet?.balance, reviewCurrency)}
                      </p>
                      <p className="mt-1 text-xs text-slate-300">
                        آخر تحديث {formatDate(review?.wallet?.updatedAt || company.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                      <span className="text-sm text-slate-300">رسوم الاشتراك</span>
                      <span className="text-sm font-bold text-slate-50">
                        {formatCurrency(review?.subscription?.monthlyFee, reviewCurrency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                      <span className="text-sm text-slate-300">فواتير مفتوحة</span>
                      <span className="text-sm font-bold text-amber-300">
                        {formatNumber(review?.billing?.stats?.unpaidInvoices || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                      <span className="text-sm text-slate-300">محاولات فاشلة</span>
                      <span className="text-sm font-bold text-rose-300">
                        {formatNumber(review?.subscription?.failedAttempts || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                      <span className="text-sm text-slate-300">إيصالات معلقة</span>
                      <span className="text-sm font-bold text-sky-300">
                        {formatNumber(review?.billing?.stats?.pendingReceipts || 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </div>

      {!loading && company ? (
        <>
          {reviewAlerts.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {reviewAlerts.map((alertItem) => (
                <Alert
                  key={alertItem.key}
                  className={cn("rounded-[26px] text-right", alertItem.tone)}
                >
                  <AlertTriangle className="size-4" />
                  <AlertTitle>{alertItem.title}</AlertTitle>
                  <AlertDescription>{alertItem.description}</AlertDescription>
                </Alert>
              ))}
            </div>
          ) : null}

          {financialMetrics.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {financialMetrics.map((metric) => (
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

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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

          {funnelSummary ? (
            <SectionShell
              title="رحلة العميل الجديد"
              description="قراءة سريعة لمسار الشركة من التسجيل حتى الوصول لأول قيمة فعلية."
            >
              <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="space-y-3">
                  <FunnelStageBadge summary={funnelSummary} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MiniStat
                      label="آخر تفاعل"
                      value={
                        funnelAnalytics?.activation?.lastEventAt ||
                        funnelAnalytics?.onboarding?.lastEventAt
                          ? formatDateTime(
                              funnelAnalytics?.activation?.lastEventAt ||
                                funnelAnalytics?.onboarding?.lastEventAt,
                            )
                          : "غير متوفر"
                      }
                      helper="أحدث حدث محفوظ على الرحلة"
                    />
                    <MiniStat
                      label="قناة التسجيل"
                      value={funnelAnalytics?.register?.source || "غير متوفر"}
                      helper="مصدر دخول العميل الجديد"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {funnelMetrics.map((metric) => (
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

                  <div className="rounded-[24px] border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-center gap-2">
                      <History className="size-4 text-primary" />
                      <p className="text-sm font-black text-foreground">
                        آخر أحداث الـ Funnel
                      </p>
                    </div>

                    {recentFunnelEvents.length ? (
                      <div className="mt-4 space-y-2">
                        {recentFunnelEvents.map((event, index) => (
                          <div
                            key={`${event.type}-${event.occurredAt || index}-${index}`}
                            className="flex items-start justify-between gap-3 rounded-[18px] border border-border/60 bg-background/75 px-3 py-2"
                          >
                            <div className="space-y-1 text-right">
                              <p className="text-sm font-semibold text-foreground">
                                {getFunnelEventLabel(event)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {event.source || "system"}
                              </p>
                            </div>
                            <p className="shrink-0 text-xs text-muted-foreground">
                              {event.occurredAt
                                ? formatDateTime(event.occurredAt)
                                : "غير متوفر"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-muted-foreground">
                        لا توجد أحداث محفوظة لهذه الشركة بعد.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </SectionShell>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
            <SectionShell
              title="المحفظة والشحن"
              description="رصيد الشركة، حركة الشحن، وآخر العمليات المالية على المحفظة."
              actions={
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => navigate("/super-admin/wallet-management")}
                  >
                    <Wallet className="size-4" />
                    إدارة المحافظ
                  </Button>
                  <Button type="button" className="rounded-2xl" onClick={openTopUpModal}>
                    <ArrowUpCircle className="size-4" />
                    شحن المحفظة
                  </Button>
                </>
              }
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <MiniStat
                  label="الرصيد الحالي"
                  value={formatCurrency(review?.wallet?.balance, reviewCurrency)}
                  helper="المتاح الآن للتغطية والدفع"
                  valueClassName="text-emerald-700 dark:text-emerald-300"
                />
                <MiniStat
                  label="إجمالي الإيداعات"
                  value={formatCurrency(review?.wallet?.totalDeposited, reviewCurrency)}
                  helper="كل ما تم شحنه تاريخيًا"
                />
                <MiniStat
                  label="إجمالي المصروف"
                  value={formatCurrency(review?.wallet?.totalSpent, reviewCurrency)}
                  helper="خصومات ورسوم واستخدام"
                />
              </div>

              <div className="rounded-[24px] border border-border/70 bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-black text-foreground">آخر حركات المحفظة</p>
                    <p className="text-xs text-muted-foreground">
                      آخر الشحنات أو الخصومات المسجلة على محفظة الشركة.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-full border-white/70 bg-white/75 px-3 py-1 text-xs dark:border-white/10 dark:bg-white/5"
                  >
                    آخر تحديث {formatDate(review?.wallet?.updatedAt)}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2">
                  {review?.wallet?.recentTransactions?.length ? (
                    review.wallet.recentTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex flex-col gap-3 rounded-[20px] border border-border/70 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className="rounded-full px-2.5 py-1 text-[11px]"
                            >
                              {getTransactionTypeLabel(transaction.type)}
                            </Badge>
                            <span className="text-sm font-bold text-foreground">
                              {formatCurrency(transaction.amount, reviewCurrency)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {transaction.description || "بدون وصف"}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground sm:text-left">
                          {formatDateTime(transaction.createdAt)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-border/70 bg-background/40 p-4 text-center text-sm text-muted-foreground">
                      لا توجد حركات محفظة مسجلة بعد.
                    </div>
                  )}
                </div>
              </div>
            </SectionShell>

            <SectionShell
              title="الاشتراك والتجديد"
              description="الخطة الحالية، رسوم المنصة، ومؤشرات التجديد القادمة."
              actions={
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={scrollToActivationSection}
                >
                  <CalendarDays className="size-4" />
                  إدارة التفعيل
                </Button>
              }
              className="border-slate-900/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.97),rgba(30,41,59,0.96))] text-slate-50 dark:border-white/10"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniStat
                  label="رسوم المنصة"
                  value={formatCurrency(review?.subscription?.monthlyFee, reviewCurrency)}
                  helper={`الخطة ${getPlanMeta(review?.subscription?.plan || company.plan).label}`}
                  valueClassName="text-slate-50"
                />
                <MiniStat
                  label="التجديد القادم"
                  value={nextBillingDate ? formatDate(nextBillingDate) : "غير متوفر"}
                  helper={nextBillingDate ? formatRelativeDateLabel(nextBillingDate) : "بدون موعد"}
                  valueClassName="text-slate-50"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-black">حالة الاشتراك</p>
                      <p className="text-xs text-slate-300">
                        تشمل رسوم المنصة فقط وليس التطبيقات المضافة.
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full px-3 py-1 text-xs",
                        getSubscriptionStatusMeta(review?.subscription?.status).className,
                      )}
                    >
                      {getSubscriptionStatusMeta(review?.subscription?.status).label}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-black">تغطية المحفظة</p>
                      <p className="text-xs text-slate-300">
                        مقارنة الرصيد الحالي مع رسوم المنصة القادمة.
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full px-3 py-1 text-xs",
                        (review?.wallet?.balance || 0) >= (review?.subscription?.monthlyFee || 0)
                          ? "border-emerald-300 bg-emerald-500/10 text-emerald-200"
                          : "border-amber-300 bg-amber-500/10 text-amber-100",
                      )}
                    >
                      {(review?.wallet?.balance || 0) >= (review?.subscription?.monthlyFee || 0)
                        ? "كافٍ"
                        : "بحاجة شحن"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm text-slate-300">آخر فوترة</span>
                  <span className="text-sm font-bold text-slate-50">
                    {formatDate(review?.subscription?.lastBillingDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm text-slate-300">يوم التحصيل</span>
                  <span className="text-sm font-bold text-slate-50">
                    {formatNumber(review?.subscription?.billingDay || 1)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm text-slate-300">محاولات الفشل</span>
                  <span className="text-sm font-bold text-rose-300">
                    {formatNumber(review?.subscription?.failedAttempts || 0)}
                  </span>
                </div>
                {review?.subscription?.hasEnterpriseOverrides ? (
                  <div className="rounded-[22px] border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
                    هذه الشركة لديها تخصيصات مؤسسية على الرسوم أو الحدود.
                  </div>
                ) : null}
              </div>
            </SectionShell>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <SectionShell
              title="الحدود والمزايا"
              description="استهلاك الشركة الحالي مقابل حدود الخطة والبونصات المطبقة."
              actions={
                review?.limits?.coupon ? (
                  <Badge
                    variant="outline"
                    className="rounded-full border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-300"
                  >
                    {review.limits.coupon.name || review.limits.coupon.appliedCode}
                  </Badge>
                ) : null
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniStat
                  label="مزايا متقدمة"
                  value={review?.limits?.features?.advancedReports ? "مفعلة" : "غير مفعلة"}
                  helper="تقارير متقدمة على مستوى الخطة"
                />
                <MiniStat
                  label="API Access"
                  value={review?.limits?.features?.apiAccess ? "مفعل" : "غير مفعل"}
                  helper="صلاحية الربط البرمجي"
                />
              </div>

              <div className="space-y-3">
                {limitEntries.map((entry) => {
                  const tone = getUsageTone(entry.percentage);

                  return (
                    <div
                      key={entry.key}
                      className="rounded-[24px] border border-border/70 bg-muted/20 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-foreground">{entry.label}</p>
                            {entry.bonus ? (
                              <Badge
                                variant="outline"
                                className="rounded-full border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-300"
                              >
                                +{formatNumber(entry.bonus)} بونص
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            المستخدم {formatNumber(entry.current)} من أصل {formatLimit(entry.limit)}
                          </p>
                        </div>

                        <div className={cn("text-sm font-bold", tone.text)}>
                          {entry.isUnlimited
                            ? "بدون حد"
                            : `${Math.round(entry.percentage)}% مستخدم`}
                        </div>
                      </div>

                      <UsageBar percentage={entry.percentage} />

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>
                          المتبقي{" "}
                          {entry.isUnlimited
                            ? "غير محدود"
                            : formatNumber(entry.remaining)}
                        </span>
                        <span>
                          الحد النهائي {formatLimit(entry.limit)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {review?.limits?.coupon?.benefitSummary?.length ? (
                <div className="rounded-[24px] border border-sky-200/70 bg-sky-50/80 p-4 dark:border-sky-800/50 dark:bg-sky-950/20">
                  <p className="text-sm font-black text-sky-900 dark:text-sky-100">
                    مزايا الكوبون المطبق
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {review.limits.coupon.benefitSummary.map((benefit) => (
                      <Badge
                        key={benefit}
                        variant="outline"
                        className="rounded-full border-sky-300 bg-white/75 px-3 py-1 text-xs text-sky-700 dark:border-sky-700/60 dark:bg-slate-950/40 dark:text-sky-300"
                      >
                        {benefit}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </SectionShell>

            <div className="space-y-4">
              <SectionShell
                title="الاستهلاك هذا الشهر"
                description="إجمالي التكلفة، تقسيم الاستخدام، ومؤشرات الحمل الحالية."
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <MiniStat
                    label="رسوم التطبيقات"
                    value={formatCurrency(review?.usage?.costs?.subscriptions, reviewCurrency)}
                    helper="اشتراكات الأدوات المفعلة"
                  />
                  <MiniStat
                    label="تكلفة الاستخدام"
                    value={formatCurrency(review?.usage?.costs?.usage, reviewCurrency)}
                    helper="استهلاك فعلي حسب العمليات"
                  />
                  <MiniStat
                    label="عدد العمليات"
                    value={formatNumber(review?.usage?.totalActions || 0)}
                    helper={`${formatNumber(review?.usage?.totalQuantity || 0)} وحدة`}
                  />
                </div>

                <div className="space-y-2">
                  {review?.usage?.usageBreakdown?.length ? (
                    review.usage.usageBreakdown.slice(0, 5).map((entry) => (
                      <div
                        key={entry.feature}
                        className="flex flex-col gap-3 rounded-[20px] border border-border/70 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-foreground">
                            {formatUsageFeatureLabel(entry.feature)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(entry.totalActions)} عملية / {formatNumber(entry.totalQuantity)} وحدة
                          </p>
                        </div>
                        <div className="text-sm font-bold text-foreground">
                          {formatCurrency(entry.totalCost, reviewCurrency)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-border/70 bg-background/40 p-4 text-center text-sm text-muted-foreground">
                      لا يوجد استهلاك مسجل خلال الفترة الحالية.
                    </div>
                  )}
                </div>
              </SectionShell>

              <SectionShell
                title="الأدوات المثبتة"
                description="حالة كل أداة، تاريخها القادم، واستهلاكها الشهري."
              >
                <div className="space-y-2">
                  {review?.usage?.installedApps?.length ? (
                    review.usage.installedApps.map((companyApp) => (
                      <div
                        key={companyApp.id}
                        className="rounded-[22px] border border-border/70 bg-muted/20 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-black text-foreground">
                                {companyApp.app?.name || "أداة بدون اسم"}
                              </p>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-[11px]",
                                  getAppStatusMeta(companyApp.status).className,
                                )}
                              >
                                {getAppStatusMeta(companyApp.status).label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {getPricingModelLabel(companyApp.app?.pricingModel)} •{" "}
                              {formatCurrency(companyApp.app?.monthlyPrice, reviewCurrency)} / شهر
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {companyApp.trialEndsAt
                                ? `نهاية التجربة ${formatDate(companyApp.trialEndsAt)}`
                                : companyApp.validUntil
                                  ? `ساري حتى ${formatDate(companyApp.validUntil)}`
                                  : companyApp.nextBillingAt
                                    ? `التحصيل القادم ${formatDate(companyApp.nextBillingAt)}`
                                    : "بدون موعد محدد"}
                            </p>
                          </div>

                          <div className="grid min-w-[180px] gap-2 text-xs text-muted-foreground sm:text-left">
                            <span>
                              شهر حالي: {formatCurrency(companyApp.monthlyUsage?.totalCost, reviewCurrency)}
                            </span>
                            <span>
                              {formatNumber(companyApp.monthlyUsage?.totalActions || 0)} عملية
                            </span>
                            <span>
                              إجمالي مصروف {formatCurrency(companyApp.totalSpent, reviewCurrency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-border/70 bg-background/40 p-4 text-center text-sm text-muted-foreground">
                      لا توجد أدوات مثبتة على هذه الشركة حاليًا.
                    </div>
                  )}
                </div>
              </SectionShell>
            </div>
          </div>

          <div id="company-activation-center">
            <SectionShell
              title="التفعيل والاشتراكات"
              description="من هنا تقدر تختار الخطة، تشغل باقة جاهزة، أو تفعل كل أدوات المنصة للشركة الجديدة بدون مغادرة صفحة المراجعة."
              actions={
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={openTopUpModal}
                  >
                    <Wallet className="size-4" />
                    شحن المحفظة
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => void refreshActivationCatalog()}
                    disabled={activationLoading}
                  >
                    {activationLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    تحديث الخيارات
                  </Button>
                </>
              }
            >
              {activationError ? (
                <Alert className="rounded-[22px] border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>تعذر تحميل جزء من مركز التفعيل</AlertTitle>
                  <AlertDescription>{activationError}</AlertDescription>
                </Alert>
              ) : null}

              {activationLoading ? (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                  <Skeleton className="h-[420px] rounded-[28px]" />
                  <Skeleton className="h-[420px] rounded-[28px]" />
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MiniStat
                      label="الخطة الحالية"
                      value={getPlanMeta(currentPlanType).label}
                      helper="يمكن تغييرها فورًا من هذه الصفحة"
                    />
                    <MiniStat
                      label="الأدوات المتاحة"
                      value={formatNumber(orderedCatalogApps.length)}
                      helper={`المفعلة ${formatNumber(orderedCatalogApps.filter((app) => app.isInstalled).length)}`}
                    />
                    <MiniStat
                      label="الباقات الجاهزة"
                      value={formatNumber(resolvedBundles.length)}
                      helper={`المكتملة ${formatNumber(resolvedBundles.filter((bundle) => bundle.isComplete).length)}`}
                    />
                    <MiniStat
                      label="رصيد المحفظة"
                      value={formatCurrency(review?.wallet?.balance, reviewCurrency)}
                      helper="جاهز للباقات أو أي شحن إضافي"
                    />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                    <div className="space-y-4">
                      <div className="rounded-[26px] border border-border/70 bg-muted/20 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-base font-black text-foreground">
                              اختيار الخطة
                            </p>
                            <p className="text-sm text-muted-foreground">
                              الخطة تغيّر السعة التشغيلية والمزايا العامة للشركة.
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full px-3 py-1.5 text-xs",
                              getPlanMeta(currentPlanType).className,
                            )}
                          >
                            الحالية: {getPlanMeta(currentPlanType).label}
                          </Badge>
                        </div>

                        <div className="mt-4 space-y-3">
                          {resolvedPlanCatalog.map((plan) => {
                            const isCurrentPlan = currentPlanType === plan.planType;

                            return (
                              <div
                                key={plan.planType}
                                className="rounded-[22px] border border-border/70 bg-background/70 p-4"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-black text-foreground">
                                        {plan.name}
                                      </p>
                                      {isCurrentPlan ? (
                                        <Badge
                                          variant="outline"
                                          className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                                        >
                                          الخطة الحالية
                                        </Badge>
                                      ) : null}
                                    </div>
                                    <p className="text-xs leading-6 text-muted-foreground">
                                      {plan.description}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {plan.highlights.map((highlight) => (
                                        <Badge
                                          key={`${plan.planType}-${highlight}`}
                                          variant="outline"
                                          className="rounded-full px-2.5 py-1 text-[11px]"
                                        >
                                          {highlight}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>

                                  <Button
                                    type="button"
                                    variant={isCurrentPlan ? "outline" : "default"}
                                    className="rounded-2xl"
                                    onClick={() =>
                                      void handleAssignPlatformPlan(plan.planType)
                                    }
                                    disabled={isCurrentPlan || planAction === plan.planType}
                                  >
                                    {planAction === plan.planType ? (
                                      <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                      <CalendarClock className="size-4" />
                                    )}
                                    {isCurrentPlan ? "مفعلة حاليًا" : "تفعيل الخطة"}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-[26px] border border-border/70 bg-muted/20 p-4">
                        <div className="space-y-1">
                          <p className="text-base font-black text-foreground">
                            الباقات الجاهزة
                          </p>
                          <p className="text-sm text-muted-foreground">
                            حل سريع للشركات الجديدة بدل تفعيل كل أداة بشكل يدوي.
                          </p>
                        </div>

                        <div className="mt-4 space-y-3">
                          {resolvedBundles.length ? (
                            resolvedBundles.map((bundle) => {
                              const bundlePrice = Number(
                                bundle.price || bundle.monthlyPrice || 0,
                              );
                              const walletShortage =
                                bundlePrice > Number(review?.wallet?.balance || 0);

                              return (
                                <div
                                  key={bundle.id || bundle.slug}
                                  className="rounded-[22px] border border-border/70 bg-background/70 p-4"
                                >
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-black text-foreground">
                                          {bundle.name}
                                        </p>
                                        {bundle.isFeatured ? (
                                          <Badge
                                            variant="outline"
                                            className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300"
                                          >
                                            باقة مميزة
                                          </Badge>
                                        ) : null}
                                        {bundle.isComplete ? (
                                          <Badge
                                            variant="outline"
                                            className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                                          >
                                            مكتملة على الشركة
                                          </Badge>
                                        ) : null}
                                      </div>
                                      <p className="text-xs leading-6 text-muted-foreground">
                                        {bundle.description}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        تضم {formatNumber(bundle.totalApps)} أداة، والمفعل منها
                                        الآن {formatNumber(bundle.installedCount)}.
                                      </p>
                                      {bundle.appSlugs.length ? (
                                        <p className="text-[11px] text-muted-foreground">
                                          تشمل:{" "}
                                          {bundle.appSlugs
                                            .map(
                                              (slug) =>
                                                appNameBySlug.get(slug) || slug,
                                            )
                                            .slice(0, 4)
                                            .join("، ")}
                                          {bundle.appSlugs.length > 4 ? "..." : ""}
                                        </p>
                                      ) : null}
                                      <p className="text-sm font-bold text-foreground">
                                        {formatCurrency(bundlePrice, reviewCurrency)} / شهر
                                      </p>
                                      {walletShortage ? (
                                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                                          الرصيد الحالي لا يكفي لهذه الباقة. يمكنك شحن
                                          المحفظة أولًا من نفس الصفحة.
                                        </p>
                                      ) : null}
                                    </div>

                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="rounded-2xl"
                                      onClick={() =>
                                        walletShortage
                                          ? openTopUpModal()
                                          : void handleSubscribeBundle(bundle.slug)
                                      }
                                      disabled={
                                        bundle.isComplete || bundleAction === bundle.slug
                                      }
                                    >
                                      {bundleAction === bundle.slug ? (
                                        <Loader2 className="size-4 animate-spin" />
                                      ) : (
                                        <Package className="size-4" />
                                      )}
                                      {bundle.isComplete
                                        ? "مفعلة بالكامل"
                                        : walletShortage
                                          ? "اشحن المحفظة أولًا"
                                          : "تشغيل الباقة"}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="rounded-[20px] border border-dashed border-border/70 bg-background/40 p-4 text-center text-sm text-muted-foreground">
                              لا توجد باقات جاهزة متاحة حاليًا.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[26px] border border-border/70 bg-muted/20 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-base font-black text-foreground">
                            الأدوات المتاحة للتفعيل
                          </p>
                          <p className="text-sm text-muted-foreground">
                            كل أداة في المتجر مع حالة التفعيل الحالية على هذه الشركة.
                          </p>
                        </div>
                        <Button
                          type="button"
                          className="rounded-2xl"
                          onClick={() => void handleActivateAllTools()}
                          disabled={
                            installAllLoading ||
                            !orderedCatalogApps.some((app) => !app.isInstalled)
                          }
                        >
                          {installAllLoading ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Sparkles className="size-4" />
                          )}
                          تفعيل كل الأدوات
                        </Button>
                      </div>

                      <div className="mt-4 max-h-[680px] space-y-2 overflow-y-auto pr-1">
                        {orderedCatalogApps.length ? (
                          orderedCatalogApps.map((app) => {
                            const requiredApps = normalizeRequiredApps(app.requiredApps);

                            return (
                              <div
                                key={app.id || app.slug}
                                className="rounded-[22px] border border-border/70 bg-background/70 p-4"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-black text-foreground">
                                        {app.name}
                                      </p>
                                      <Badge
                                        variant="outline"
                                        className="rounded-full px-2.5 py-1 text-[11px]"
                                      >
                                        {app.category || "أداة"}
                                      </Badge>
                                      {app.isInstalled ? (
                                        <Badge
                                          variant="outline"
                                          className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                                        >
                                          مفعلة
                                        </Badge>
                                      ) : null}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {getPricingModelLabel(app.pricingModel)}
                                      {Number(app.monthlyPrice) > 0
                                        ? ` • ${formatCurrency(app.monthlyPrice, reviewCurrency)} / شهر`
                                        : ""}
                                    </p>
                                    <p className="text-xs leading-6 text-muted-foreground">
                                      {app.description}
                                    </p>
                                    {requiredApps.length ? (
                                      <p className="text-[11px] text-muted-foreground">
                                        يتطلب:{" "}
                                        {requiredApps
                                          .map(
                                            (slug) => appNameBySlug.get(slug) || slug,
                                          )
                                          .join("، ")}
                                      </p>
                                    ) : null}
                                    {app.isInstalled && app.activePricingModel ? (
                                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                                        مفعلة حاليًا بنظام{" "}
                                        {getPricingModelLabel(app.activePricingModel)}
                                      </p>
                                    ) : null}
                                  </div>

                                  <Button
                                    type="button"
                                    variant={app.isInstalled ? "outline" : "default"}
                                    className="rounded-2xl"
                                    onClick={() => void handleInstallApp(app)}
                                    disabled={app.isInstalled || appAction === app.slug}
                                  >
                                    {appAction === app.slug ? (
                                      <Loader2 className="size-4 animate-spin" />
                                    ) : app.isInstalled ? (
                                      <CheckCircle2 className="size-4" />
                                    ) : (
                                      <Boxes className="size-4" />
                                    )}
                                    {app.isInstalled ? "مفعلة بالفعل" : "تفعيل الأداة"}
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-[20px] border border-dashed border-border/70 bg-background/40 p-4 text-center text-sm text-muted-foreground">
                            لا توجد أدوات متاحة للعرض حاليًا.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </SectionShell>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <SectionShell
              title="الفواتير والمدفوعات"
              description="آخر الفواتير والمدفوعات لمراجعة التحصيل بشكل سريع."
              actions={
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => navigate("/super-admin/invoices")}
                  >
                    <Receipt className="size-4" />
                    الفواتير
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => navigate("/super-admin/payments")}
                  >
                    <CreditCard className="size-4" />
                    المدفوعات
                  </Button>
                </>
              }
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <MiniStat
                  label="فواتير غير مسددة"
                  value={formatNumber(review?.billing?.stats?.unpaidInvoices || 0)}
                  helper={`المتأخرة ${formatNumber(review?.billing?.stats?.overdueInvoices || 0)}`}
                />
                <MiniStat
                  label="مدفوعات فاشلة"
                  value={formatNumber(review?.billing?.stats?.failedPayments || 0)}
                  helper={`المعلقة ${formatNumber(review?.billing?.stats?.pendingPayments || 0)}`}
                />
                <MiniStat
                  label="فواتير مدفوعة"
                  value={formatNumber(review?.billing?.stats?.paidInvoices || 0)}
                  helper={`الإجمالي ${formatNumber(review?.billing?.stats?.totalInvoices || 0)}`}
                />
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-black text-foreground">آخر الفواتير</p>
                  {review?.billing?.recentInvoices?.length ? (
                    review.billing.recentInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="rounded-[20px] border border-border/70 bg-muted/20 p-3"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-foreground">
                                {getInvoiceDisplayTitle(invoice)}
                              </p>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-[11px]",
                                  getInvoiceStatusMeta(invoice.status).className,
                                )}
                              >
                                {getInvoiceStatusMeta(invoice.status).label}
                              </Badge>
                            </div>
                            {getInvoiceReferenceLabel(invoice) ? (
                              <p className="text-[11px] text-muted-foreground">
                                {getInvoiceReferenceLabel(invoice)}
                              </p>
                            ) : null}
                            <p className="text-xs text-muted-foreground">
                              إصدار {formatDate(invoice.issueDate)} • استحقاق {formatDate(invoice.dueDate)}
                            </p>
                          </div>
                          <div className="text-sm font-bold text-foreground">
                            {formatCurrency(invoice.totalAmount, invoice.currency || reviewCurrency)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-border/70 bg-background/40 p-4 text-center text-sm text-muted-foreground">
                      لا توجد فواتير مسجلة.
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-black text-foreground">آخر المدفوعات</p>
                  {review?.billing?.recentPayments?.length ? (
                    review.billing.recentPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="rounded-[20px] border border-border/70 bg-muted/20 p-3"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-foreground">
                                {getPaymentDisplayTitle(payment)}
                              </p>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-[11px]",
                                  getPaymentStatusMeta(payment.status).className,
                                )}
                              >
                                {getPaymentStatusMeta(payment.status).label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {getPaymentReferenceLabel(payment) || "بدون مرجع دفع إضافي"}
                            </p>
                            {payment.failureReason ? (
                              <p className="text-[11px] text-rose-600 dark:text-rose-300">
                                {payment.failureReason}
                              </p>
                            ) : null}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-foreground">
                              {formatCurrency(payment.amount, payment.currency || reviewCurrency)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(payment.paidAt || payment.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-border/70 bg-background/40 p-4 text-center text-sm text-muted-foreground">
                      لا توجد مدفوعات مسجلة.
                    </div>
                  )}
                </div>
              </div>
            </SectionShell>

            <div className="space-y-4">
              <SectionShell
                title="الإيصالات وسجل الفوترة"
                description="الإيصالات المعلقة وآخر الحركات المالية المرتبطة بالشركة."
                actions={
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => navigate("/super-admin/pending-receipts")}
                  >
                    <History className="size-4" />
                    مراجعة الإيصالات
                  </Button>
                }
              >
                <div className="space-y-2">
                  {review?.billing?.recentReceipts?.length ? (
                    review.billing.recentReceipts.map((receipt) => (
                      <div
                        key={receipt.id}
                        className="rounded-[20px] border border-border/70 bg-muted/20 p-3"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-foreground">
                                {getReceiptDisplayTitle(receipt)}
                              </p>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-[11px]",
                                  getReceiptStatusMeta(receipt.status).className,
                                )}
                              >
                                {getReceiptStatusMeta(receipt.status).label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              قدم في {formatDateTime(receipt.submittedAt)}
                            </p>
                            {getReceiptReferenceLabel(receipt) ? (
                              <p className="text-[11px] text-muted-foreground">
                                {getReceiptReferenceLabel(receipt)}
                              </p>
                            ) : null}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-foreground">
                              {formatCurrency(
                                receipt.invoice?.totalAmount,
                                receipt.invoice?.currency || reviewCurrency,
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {receipt.walletNumber?.name || "محفظة غير محددة"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-border/70 bg-background/40 p-4 text-center text-sm text-muted-foreground">
                      لا توجد إيصالات مسجلة لهذه الشركة.
                    </div>
                  )}
                </div>
              </SectionShell>

              <SectionShell
                title="سجل الفوترة"
                description="آخر الرسوم والحركات المسجلة على مستوى المنصة."
              >
                <div className="space-y-2">
                  {review?.billing?.recentHistory?.length ? (
                    review.billing.recentHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-col gap-3 rounded-[20px] border border-border/70 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className="rounded-full px-2.5 py-1 text-[11px]"
                            >
                              {getBillingTypeLabel(entry.type)}
                            </Badge>
                            <p className="text-sm font-bold text-foreground">
                              {entry.description}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(entry.createdAt)}
                          </p>
                        </div>
                        <div className="text-sm font-bold text-foreground">
                          {formatCurrency(entry.amount, reviewCurrency)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-border/70 bg-background/40 p-4 text-center text-sm text-muted-foreground">
                      لا توجد حركات فوترة حديثة.
                    </div>
                  )}
                </div>
              </SectionShell>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
            <Card className="rounded-[30px] border-white/70 bg-white/85 dark:border-white/10 dark:bg-slate-950/55">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-black">فريق الشركة</CardTitle>
                  <CardDescription>
                    الأعضاء الحاليون مع الحالة، الدور، ومؤشرات النشاط.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={openAddEmployeeModal}
                >
                  <UserPlus className="size-4" />
                  إضافة عضو
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {usersLoading ? (
                  [...Array(4)].map((_, index) => (
                    <Skeleton key={index} className="h-28 rounded-[24px]" />
                  ))
                ) : companyUsers.length ? (
                  <>
                    {companyUsers.map((user) => (
                      <div
                        key={user.id}
                        className="rounded-[24px] border border-border/70 bg-muted/20 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-black text-foreground">
                                {user.firstName} {user.lastName}
                              </p>
                              <Badge
                                variant="outline"
                                className="rounded-full px-2.5 py-1 text-[11px]"
                              >
                                {getRoleLabel(user.role)}
                              </Badge>
                              <StatusBadge isActive={user.isActive} />
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                              <InfoLine icon={Mail}>{user.email}</InfoLine>
                              {user.phone ? (
                                <InfoLine icon={Phone}>{user.phone}</InfoLine>
                              ) : null}
                            </div>
                          </div>

                          <div className="space-y-1 text-xs text-muted-foreground sm:text-left">
                            <p>أضيف في {formatDate(user.createdAt)}</p>
                            <p>آخر دخول {formatDate(user.lastLoginAt)}</p>
                            {user.employee?.employeeNumber ? (
                              <p>رقم الموظف: {user.employee.employeeNumber}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}

                    {getCount(company, "users") > companyUsers.length ? (
                      <p className="text-xs text-muted-foreground">
                        المعروض حاليًا أول {companyUsers.length} عضو من إجمالي{" "}
                        {getCount(company, "users")}.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                    لا يوجد أعضاء مضافون لهذه الشركة حتى الآن.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="rounded-[30px] border-white/70 bg-white/85 dark:border-white/10 dark:bg-slate-950/55">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl font-black">الربط والقنوات</CardTitle>
                  <CardDescription>
                    صفحات فيسبوك وحالة القنوات داخل الشركة.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-[24px] border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-black text-foreground">
                          صفحات فيسبوك المرتبطة
                        </p>
                        <p className="text-xs text-muted-foreground">
                          كل الصفحات المتصلة بهذه الشركة.
                        </p>
                      </div>
                      <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                        {getCount(company, "facebookPages") || facebookPages.length}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-2">
                      {pagesLoading ? (
                        [...Array(3)].map((_, index) => (
                          <Skeleton key={index} className="h-20 rounded-[20px]" />
                        ))
                      ) : facebookPages.length ? (
                        facebookPages.map((page) => (
                          <div
                            key={page.id}
                            className="rounded-[20px] border border-border/70 bg-background/70 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-foreground">
                                  {page.pageName || page.pageId}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  معرف الصفحة: {page.pageId}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  متصلة منذ {formatDate(page.connectedAt || page.createdAt)}
                                </p>
                              </div>
                              <StatusBadge isActive={page.status !== "DISCONNECTED"} />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[20px] border border-dashed border-border/70 bg-background/40 p-4 text-center text-sm text-muted-foreground">
                          لا توجد صفحات فيسبوك مربوطة بهذه الشركة.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[30px] border-slate-900/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.97),rgba(30,41,59,0.96))] text-slate-50 shadow-[0_35px_120px_-70px_rgba(15,27,45,0.8)] dark:border-white/10">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl font-black">إجراءات سريعة</CardTitle>
                  <CardDescription className="text-slate-300">
                    انتقالات وإجراءات مباشرة بدون مغادرة صفحة المراجعة.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-right transition hover:bg-white/10"
                    onClick={openTopUpModal}
                  >
                    <span className="space-y-1">
                      <span className="block text-sm font-black">شحن المحفظة</span>
                      <span className="block text-xs text-slate-300">
                        إضافة رصيد أو بونص للشركة من نفس الصفحة.
                      </span>
                    </span>
                    <Wallet className="size-4 shrink-0" />
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-right transition hover:bg-white/10"
                    onClick={scrollToActivationSection}
                  >
                    <span className="space-y-1">
                      <span className="block text-sm font-black">
                        إدارة التفعيل والاشتراكات
                      </span>
                      <span className="block text-xs text-slate-300">
                        اختيار خطة، تشغيل باقة، أو تفعيل كل الأدوات من نفس الصفحة.
                      </span>
                    </span>
                    <Boxes className="size-4 shrink-0" />
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-right transition hover:bg-white/10"
                    onClick={() => navigate("/super-admin/invoices")}
                  >
                    <span className="space-y-1">
                      <span className="block text-sm font-black">الفواتير والمدفوعات</span>
                      <span className="block text-xs text-slate-300">
                        متابعة التحصيل وسجل الدفع للشركة.
                      </span>
                    </span>
                    <CreditCard className="size-4 shrink-0" />
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-right transition hover:bg-white/10"
                    onClick={openEditModal}
                  >
                    <span className="space-y-1">
                      <span className="block text-sm font-black">تحديث بيانات الشركة</span>
                      <span className="block text-xs text-slate-300">
                        الاسم، الخطة، العملة، والحالة التشغيلية.
                      </span>
                    </span>
                    <Sparkles className="size-4 shrink-0" />
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-right transition hover:bg-white/10"
                    onClick={() => setTransferOpen(true)}
                  >
                    <span className="space-y-1">
                      <span className="block text-sm font-black">نقل الملكية</span>
                      <span className="block text-xs text-slate-300">
                        تحويل صلاحيات المالك لمستخدم آخر داخل الشركة.
                      </span>
                    </span>
                    <ArrowLeftRight className="size-4 shrink-0" />
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-right transition hover:bg-white/10"
                    onClick={() => void handleLoginAsAdmin()}
                  >
                    <span className="space-y-1">
                      <span className="block text-sm font-black">الدخول كأدمن</span>
                      <span className="block text-xs text-slate-300">
                        فتح تجربة الشركة نفسها من منظور المدير.
                      </span>
                    </span>
                    <LogIn className="size-4 shrink-0" />
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : null}

      <ResponsiveOverlay
        mobile={isMobile}
        open={editOpen}
        onOpenChange={setEditOpen}
        title={`تعديل ${company?.name || "الشركة"}`}
        description="حدّث بيانات الشركة الأساسية من صفحة التفاصيل نفسها."
        bodyClassName="space-y-4"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl"
              onClick={() => setEditOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              className="h-11 rounded-2xl"
              onClick={() => void handleSaveCompany()}
              disabled={editSaving}
            >
              {editSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              حفظ التعديلات
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="اسم الشركة" error={editErrors.name} required>
            <Input
              value={editForm.name}
              onChange={(event) =>
                setEditForm((current) => ({ ...current, name: event.target.value }))
              }
              className="h-11 rounded-2xl"
            />
          </FormField>

          <FormField label="البريد الإلكتروني" error={editErrors.email} required>
            <Input
              type="email"
              value={editForm.email}
              onChange={(event) =>
                setEditForm((current) => ({ ...current, email: event.target.value }))
              }
              className="h-11 rounded-2xl"
            />
          </FormField>

          <FormField label="الهاتف">
            <Input
              value={editForm.phone}
              onChange={(event) =>
                setEditForm((current) => ({ ...current, phone: event.target.value }))
              }
              className="h-11 rounded-2xl"
            />
          </FormField>

          <FormField label="الموقع الإلكتروني">
            <Input
              value={editForm.website}
              onChange={(event) =>
                setEditForm((current) => ({ ...current, website: event.target.value }))
              }
              className="h-11 rounded-2xl"
            />
          </FormField>

          <FormField label="الخطة" error={editErrors.plan} required>
            <Select
              value={editForm.plan}
              onValueChange={(value) =>
                setEditForm((current) => ({ ...current, plan: value }))
              }
            >
              <SelectTrigger className="h-11 min-w-0 rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="العملة" error={editErrors.currency} required>
            <Select
              value={editForm.currency}
              onValueChange={(value) =>
                setEditForm((current) => ({ ...current, currency: value }))
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
        </div>

        <div className="rounded-[24px] border border-border/70 bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-black text-foreground">حالة الشركة</p>
              <p className="text-xs text-muted-foreground">
                التحكم في تفعيل أو إيقاف الشركة من نفس الشاشة.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge isActive={editForm.isActive} />
              <Switch
                checked={editForm.isActive}
                onCheckedChange={(checked) =>
                  setEditForm((current) => ({ ...current, isActive: checked }))
                }
              />
            </div>
          </div>
        </div>
      </ResponsiveOverlay>

      <ResponsiveOverlay
        mobile={isMobile}
        open={transferOpen}
        onOpenChange={setTransferOpen}
        title={`نقل ملكية ${company?.name || "الشركة"}`}
        description="اختر العضو الذي سيحصل على صلاحيات المالك بالكامل."
        bodyClassName="space-y-4"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl"
              onClick={() => setTransferOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              className="h-11 rounded-2xl"
              onClick={() => void handleTransferOwnership()}
              disabled={transferLoading || !changeOwnerTargetUserId}
            >
              {transferLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowLeftRight className="size-4" />
              )}
              تأكيد النقل
            </Button>
          </>
        }
      >
        <Alert className="rounded-[22px] border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="size-4" />
          <AlertTitle>خطوة حساسة</AlertTitle>
          <AlertDescription>
            النقل يبدّل المالك الحالي ويمنح المستخدم المختار صلاحيات كاملة.
          </AlertDescription>
        </Alert>

        <FormField label="المالك الجديد" required>
          <Select value={changeOwnerTargetUserId} onValueChange={setChangeOwnerTargetUserId}>
            <SelectTrigger className="h-12 min-w-0 rounded-[22px]">
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

      <ResponsiveOverlay
        mobile={isMobile}
        open={addEmployeeOpen}
        onOpenChange={setAddEmployeeOpen}
        title={`إضافة عضو إلى ${company?.name || "الشركة"}`}
        description="أضف مديرًا أو موظفًا جديدًا بدون مغادرة صفحة الشركة."
        bodyClassName="space-y-4"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl"
              onClick={() => setAddEmployeeOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              className="h-11 rounded-2xl"
              onClick={() => void handleAddEmployee()}
              disabled={employeeLoading}
            >
              {employeeLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              إضافة العضو
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="الاسم الأول" error={addEmployeeErrors.firstName} required>
            <Input
              value={addEmployeeForm.firstName}
              onChange={(event) =>
                setAddEmployeeForm((current) => ({
                  ...current,
                  firstName: event.target.value,
                }))
              }
              className="h-11 rounded-2xl"
            />
          </FormField>

          <FormField label="الاسم الأخير" error={addEmployeeErrors.lastName} required>
            <Input
              value={addEmployeeForm.lastName}
              onChange={(event) =>
                setAddEmployeeForm((current) => ({
                  ...current,
                  lastName: event.target.value,
                }))
              }
              className="h-11 rounded-2xl"
            />
          </FormField>

          <FormField label="البريد الإلكتروني" error={addEmployeeErrors.email} required>
            <Input
              type="email"
              value={addEmployeeForm.email}
              onChange={(event) =>
                setAddEmployeeForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              className="h-11 rounded-2xl md:col-span-2"
            />
          </FormField>

          <FormField label="كلمة المرور" error={addEmployeeErrors.password} required>
            <Input
              type="password"
              value={addEmployeeForm.password}
              onChange={(event) =>
                setAddEmployeeForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              className="h-11 rounded-2xl"
            />
          </FormField>

          <FormField label="الصلاحية" required>
            <Select
              value={addEmployeeForm.role}
              onValueChange={(value) =>
                setAddEmployeeForm((current) => ({ ...current, role: value }))
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

      <ResponsiveOverlay
        mobile={isMobile}
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        title={`شحن محفظة ${company?.name || "الشركة"}`}
        description="أضف رصيدًا مباشرًا أو بونصًا للمحفظة من شاشة المراجعة."
        bodyClassName="space-y-4"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl"
              onClick={() => setTopUpOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              className="h-11 rounded-2xl"
              onClick={() => void handleTopUpWallet()}
              disabled={topUpLoading}
            >
              {topUpLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wallet className="size-4" />
              )}
              تنفيذ الشحن
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="قيمة الشحن" error={topUpErrors.amount} required>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={topUpForm.amount}
              onChange={(event) =>
                setTopUpForm((current) => ({ ...current, amount: event.target.value }))
              }
              className="h-11 rounded-2xl"
            />
          </FormField>

          <FormField label="بونص إضافي" error={topUpErrors.bonus}>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={topUpForm.bonus}
              onChange={(event) =>
                setTopUpForm((current) => ({ ...current, bonus: event.target.value }))
              }
              className="h-11 rounded-2xl"
            />
          </FormField>

          <FormField label="ملاحظات">
            <Input
              value={topUpForm.notes}
              onChange={(event) =>
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
              (review?.wallet?.balance || 0) +
                topUpAmountPreview +
                topUpBonusPreview,
              reviewCurrency,
            )}
            helper="رصيد تقديري بعد الشحن"
            valueClassName="text-emerald-700 dark:text-emerald-300"
          />
        </div>
      </ResponsiveOverlay>
    </div>
  );
};

export default SuperAdminCompanyDetails;
