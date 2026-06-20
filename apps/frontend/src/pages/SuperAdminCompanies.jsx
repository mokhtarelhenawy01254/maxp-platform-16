import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowLeftRight,
  BadgeCheck,
  Bot,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  Download,
  Eye,
  Facebook,
  Filter,
  Globe,
  Loader2,
  LogIn,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import { apiClient } from "../services/apiClient";
import { tokenManager } from "../utils/tokenManager";
import {
  getCompaniesFunnelStats,
  getCompaniesFunnelFollowUpStats,
  getCompanyFunnelAttentionScore,
  getCompanyFunnelLastActivity,
  getCompanyFunnelSummary,
  getCompanyFunnelStaleStatus,
  getCompanyInterventionAction,
} from "../utils/companyFunnelAnalytics";
import { cn } from "../lib/utils";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import { Skeleton } from "../components/ui/skeleton";
import { Switch } from "../components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { Textarea } from "../components/ui/textarea";
import {
  FOLLOW_UP_STATUS_OPTIONS,
  getCompaniesFollowUpAutomationStats,
  getCompanyFollowUpState,
  getCompanyFollowUpAutomationState,
  getCompanyFollowUpReminderState,
  getCompaniesFollowUpReminderStats,
} from "../utils/companyFollowUp";

const STATUS_FILTERS = [
  { value: "ALL", label: "الكل" },
  { value: "ACTIVE", label: "نشطة" },
  { value: "INACTIVE", label: "متوقفة" },
];

const PLAN_FILTERS = [
  { value: "ALL", label: "كل الخطط" },
  { value: "BASIC", label: "أساسي" },
  { value: "PRO", label: "احترافي" },
  { value: "ENTERPRISE", label: "مؤسسي" },
];

const FUNNEL_STAGE_FILTERS = [
  { value: "ALL", label: "الكل" },
];

const FOLLOW_UP_SAVED_VIEWS = [
  { value: "ALL", label: "كل الشركات" },
  { value: "FOLLOW_UP_NOW", label: "تحتاج متابعة الآن" },
  { value: "MY_TODAY", label: "متابعتي اليوم" },
  { value: "ESCALATION_DUE", label: "تصعيد مطلوب" },
  { value: "STALE_72H", label: "متوقف 72 ساعة+" },
];

const PLAN_OPTIONS = PLAN_FILTERS.filter((option) => option.value !== "ALL");

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

const SORT_OPTIONS = [
  { value: "attention:desc", label: "الأكثر احتياجًا للمتابعة" },
  { value: "lastActivity:asc", label: "الأقدم نشاطًا أولًا" },
  { value: "lastActivity:desc", label: "الأحدث نشاطًا أولًا" },
  { value: "createdAt:desc", label: "الأحدث أولًا" },
  { value: "createdAt:asc", label: "الأقدم أولًا" },
  { value: "name:asc", label: "الاسم من أ إلى ي" },
  { value: "name:desc", label: "الاسم من ي إلى أ" },
  { value: "users:desc", label: "الأكثر مستخدمين" },
  { value: "facebookPages:desc", label: "الأكثر صفحات فيسبوك" },
];

const PAGE_SIZE_OPTIONS = ["6", "10", "20", "40"];

const INITIAL_COMPANY_FORM = {
  name: "",
  email: "",
  phone: "",
  website: "",
  plan: "BASIC",
  currency: "EGP",
  adminFirstName: "",
  adminLastName: "",
  adminEmail: "",
  adminPassword: "",
};

const INITIAL_EMPLOYEE_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "COMPANY_ADMIN",
};

const INITIAL_FOLLOW_UP_FORM = {
  assignedOwnerId: "",
  status: "pending",
  nextActionAt: "",
  note: "",
};

const MOBILE_BREAKPOINT = 768;
const DEFAULT_SORT = "createdAt:desc";

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

function toDateTimeLocalValue(dateValue) {
  if (!dateValue) return "";

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const pad = (value) => String(value).padStart(2, "0");

  return `${parsedDate.getFullYear()}-${pad(parsedDate.getMonth() + 1)}-${pad(
    parsedDate.getDate(),
  )}T${pad(parsedDate.getHours())}:${pad(parsedDate.getMinutes())}`;
}

function addHoursToLocalDateTimeValue(hours) {
  const nextDate = new Date();
  nextDate.setHours(nextDate.getHours() + hours);
  return toDateTimeLocalValue(nextDate.toISOString());
}

function fromDateTimeLocalValue(value) {
  if (!value) return null;

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
}

function getDefaultFollowUpScheduleValue(status) {
  return addHoursToLocalDateTimeValue(status === "waiting" ? 72 : 24);
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

function getRoleLabel(role) {
  if (role === "OWNER") return "مالك";
  if (role === "COMPANY_ADMIN") return "مدير شركة";
  if (role === "MANAGER") return "مدير";
  return "موظف";
}

function compareValues(aValue, bValue, direction) {
  if (aValue == null && bValue == null) return 0;
  if (aValue == null) return 1;
  if (bValue == null) return -1;

  let left = aValue;
  let right = bValue;

  if (typeof left === "string" && typeof right === "string") {
    left = left.toLowerCase();
    right = right.toLowerCase();
  }

  if (left instanceof Date) {
    left = left.getTime();
  }

  if (right instanceof Date) {
    right = right.getTime();
  }

  if (left > right) {
    return direction === "asc" ? 1 : -1;
  }

  if (left < right) {
    return direction === "asc" ? -1 : 1;
  }

  return 0;
}

function sortCompanies(companies, sortValue) {
  const [sortKey, sortDirection = "asc"] = sortValue.split(":");

  return [...companies].sort((a, b) => {
    switch (sortKey) {
      case "attention":
        return compareValues(
          a.funnelAttentionScore ?? getCompanyFunnelAttentionScore(a),
          b.funnelAttentionScore ?? getCompanyFunnelAttentionScore(b),
          sortDirection,
        );
      case "lastActivity":
        return compareValues(
          a.funnelLastActivity?.sortValue ?? getCompanyFunnelLastActivity(a).sortValue,
          b.funnelLastActivity?.sortValue ?? getCompanyFunnelLastActivity(b).sortValue,
          sortDirection,
        );
      case "name":
        return compareValues(a.name, b.name, sortDirection);
      case "email":
        return compareValues(a.email, b.email, sortDirection);
      case "users":
        return compareValues(getCount(a, "users"), getCount(b, "users"), sortDirection);
      case "customers":
        return compareValues(
          getCount(a, "customers"),
          getCount(b, "customers"),
          sortDirection,
        );
      case "facebookPages":
        return compareValues(
          getCount(a, "facebookPages"),
          getCount(b, "facebookPages"),
          sortDirection,
        );
      case "isActive":
        return compareValues(Number(a.isActive), Number(b.isActive), sortDirection);
      case "createdAt":
      default:
        return compareValues(
          new Date(a.createdAt || 0),
          new Date(b.createdAt || 0),
          sortDirection,
        );
    }
  });
}

function downloadCompaniesCsv(companies) {
  const headers = [
    "ID",
    "Name",
    "Email",
    "Phone",
    "Website",
    "Plan",
    "Is Active",
    "Users",
    "Customers",
    "Facebook Pages",
    "Created At",
  ];

  const lines = companies.map((company) =>
    [
      company.id,
      `"${company.name || ""}"`,
      company.email || "",
      company.phone || "",
      company.website || "",
      company.plan || "",
      company.isActive ? "Active" : "Inactive",
      getCount(company, "users"),
      getCount(company, "customers"),
      getCount(company, "facebookPages"),
      company.createdAt ? new Date(company.createdAt).toISOString() : "",
    ].join(","),
  );

  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `companies_export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

          function MetricCard({ icon: Icon, label, value, hint, tone, className = "" }) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border px-4 py-3 shadow-sm",
        tone ||
          "border-border/70 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-xl bg-muted/50 text-primary">
          <Icon className="size-5" />
        </div>
      </div>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/80 bg-white/75 text-muted-foreground hover:border-primary/35 hover:text-foreground dark:bg-slate-950/40",
      )}
    >
      {children}
    </button>
  );
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

function FunnelStageBadge({ summary, className = "" }) {
  if (!summary) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-[20px] border border-border/70 bg-muted/20 px-3 py-2 text-right",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Badge
          variant="outline"
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-bold",
            summary.badgeClassName,
          )}
        >
          {summary.label}
        </Badge>
        <span className="text-xs font-bold text-foreground">
          {summary.progressLabel}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
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
            "max-h-[94vh] rounded-t-2xl border-t border-border/60 bg-white px-0 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-0 shadow-lg dark:border-white/10 dark:bg-slate-950",
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
          "max-w-3xl gap-0 overflow-hidden rounded-2xl border-border/70 bg-white p-0 shadow-lg dark:border-white/10 dark:bg-slate-950/95",
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

function CompanyFormFields({
  mode,
  formData,
  formErrors,
  setFormData,
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="اسم الشركة" error={formErrors.name} required>
          <Input
            value={formData.name}
            onChange={(event) =>
              setFormData((current) => ({ ...current, name: event.target.value }))
            }
            className="h-11 rounded-2xl"
            placeholder="شركة التقنية المتقدمة"
          />
        </FormField>

        <FormField label="البريد الإلكتروني" error={formErrors.email} required>
          <Input
            type="email"
            value={formData.email}
            onChange={(event) =>
              setFormData((current) => ({ ...current, email: event.target.value }))
            }
            className="h-11 rounded-2xl"
            placeholder="company@example.com"
          />
        </FormField>

        <FormField label="الهاتف" error={formErrors.phone}>
          <Input
            value={formData.phone}
            onChange={(event) =>
              setFormData((current) => ({ ...current, phone: event.target.value }))
            }
            className="h-11 rounded-2xl"
            placeholder="01000000000"
          />
        </FormField>

        <FormField label="الموقع الإلكتروني" error={formErrors.website}>
          <Input
            value={formData.website}
            onChange={(event) =>
              setFormData((current) => ({ ...current, website: event.target.value }))
            }
            className="h-11 rounded-2xl"
            placeholder="company.com"
          />
        </FormField>

        <FormField label="الخطة" error={formErrors.plan} required>
          <Select
            value={formData.plan}
            onValueChange={(value) =>
              setFormData((current) => ({ ...current, plan: value }))
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

        <FormField label="العملة" error={formErrors.currency} required>
          <Select
            value={formData.currency}
            onValueChange={(value) =>
              setFormData((current) => ({ ...current, currency: value }))
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

      {mode === "create" ? (
        <div className="space-y-4 rounded-[26px] border border-border/70 bg-muted/35 p-4">
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">بيانات مدير الشركة</p>
            <p className="text-xs text-muted-foreground">
              هننشئ الشركة والحساب الرئيسي في نفس الخطوة.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="الاسم الأول" error={formErrors.adminFirstName} required>
              <Input
                value={formData.adminFirstName}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    adminFirstName: event.target.value,
                  }))
                }
                className="h-11 rounded-2xl"
              />
            </FormField>

            <FormField label="الاسم الأخير" error={formErrors.adminLastName} required>
              <Input
                value={formData.adminLastName}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    adminLastName: event.target.value,
                  }))
                }
                className="h-11 rounded-2xl"
              />
            </FormField>

            <FormField label="بريد المدير" error={formErrors.adminEmail} required>
              <Input
                type="email"
                value={formData.adminEmail}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    adminEmail: event.target.value,
                  }))
                }
                className="h-11 rounded-2xl"
              />
            </FormField>

            <FormField
              label="كلمة مرور المدير"
              error={formErrors.adminPassword}
              required
            >
              <Input
                type="password"
                value={formData.adminPassword}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    adminPassword: event.target.value,
                  }))
                }
                className="h-11 rounded-2xl"
              />
            </FormField>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CompanyCard({
  company,
  selected,
  onToggleSelect,
  onOpenDetails,
  onOpenActions,
  onOpenIntervention,
}) {
  const planMeta = getPlanMeta(company.plan);
  const funnelSummary = company.funnelSummary || getCompanyFunnelSummary(company);
  const funnelLastActivity =
    company.funnelLastActivity || getCompanyFunnelLastActivity(company);
  const funnelStaleStatus =
    company.funnelStaleStatus || getCompanyFunnelStaleStatus(company);
  const followUp = company.followUp || getCompanyFollowUpState(company);
  const followUpReminder =
    company.followUpReminder || getCompanyFollowUpReminderState(company);
  const followUpAutomation =
    company.followUpAutomation || getCompanyFollowUpAutomationState(company);
  const interventionAction =
    company.funnelIntervention || getCompanyInterventionAction(company);
  const interventionUsesDetails = interventionAction.mode === "details";

  return (
    <Card
      className="rounded-xl border-border/70 bg-white shadow-sm dark:bg-slate-950/75"
      size="sm"
    >
      <CardContent className="p-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => onOpenDetails(company)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpenDetails(company);
            }
          }}
          className="space-y-4 text-right"
        >
          <div className="flex items-start gap-3">
            <div
              className="pt-1"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <Checkbox
                checked={selected}
                onCheckedChange={() => onToggleSelect(company.id)}
              />
            </div>

            <div className="flex size-13 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 via-primary/10 to-secondary/10 text-lg font-bold text-primary">
              {company.name?.charAt(0) || "ش"}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                      <h3 className="truncate text-base font-bold text-foreground">
                    {company.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-bold",
                        planMeta.className,
                      )}
                    >
                      {planMeta.label}
                    </Badge>
                    <StatusBadge isActive={company.isActive} />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-2xl"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenActions(company);
                  }}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <InfoLine icon={Mail}>{company.email}</InfoLine>
                {company.phone ? <InfoLine icon={Phone}>{company.phone}</InfoLine> : null}
                {company.website ? (
                  <InfoLine
                    icon={Globe}
                    asLink
                    href={normalizeWebsite(company.website)}
                  >
                    {company.website}
                  </InfoLine>
                ) : null}
              </div>

              <FunnelStageBadge summary={funnelSummary} />

              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-bold",
                    followUp.statusMeta.className,
                  )}
                >
                  {followUp.statusMeta.label}
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                >
                  {followUp.assignedOwner.label || "بدون مسؤول"}
                </Badge>
                {followUpReminder.isActionable ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-bold",
                      followUpReminder.badgeClassName,
                    )}
                  >
                    {followUpReminder.nextActionLabel}
                  </Badge>
                ) : null}
                {followUpAutomation.level !== "idle" ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-bold",
                      followUpAutomation.badgeClassName,
                    )}
                  >
                    {followUpAutomation.label}
                  </Badge>
                ) : null}
              </div>

              <div                     className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-bold text-muted-foreground">
                    آخر نشاط
                  </p>
                  <p className="text-xs font-bold text-foreground">
                    {funnelLastActivity.relativeLabel}
                  </p>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                  {funnelLastActivity.label}
                </p>
                {funnelStaleStatus.isPending ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "mt-2 rounded-full px-2.5 py-1 text-[10px] font-bold",
                      funnelStaleStatus.badgeClassName,
                    )}
                  >
                    {funnelStaleStatus.label}
                  </Badge>
                ) : null}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-muted/55 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-foreground">
                    {getCount(company, "users")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">مستخدمين</p>
                </div>
                <div className="rounded-2xl bg-muted/55 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-foreground">
                    {getCount(company, "customers")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">عملاء</p>
                </div>
                <div className="rounded-2xl bg-muted/55 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-foreground">
                    {getCount(company, "facebookPages")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">صفحات</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  تم الإنشاء {formatDate(company.createdAt)}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={interventionUsesDetails ? "outline" : "default"}
                    size="sm"
                    className="rounded-full"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenIntervention(company);
                    }}
                    title={interventionAction.hint}
                  >
                    {interventionUsesDetails ? (
                      <Eye className="size-4" />
                    ) : (
                      <LogIn className="size-4" />
                    )}
                    {interventionAction.label}
                  </Button>
                  <Button
                    type="button"
                    variant={interventionUsesDetails ? "default" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenDetails(company);
                    }}
                  >
                    <Eye className="size-4" />
                    التفاصيل
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FacebookLookupWorkspace({
  query,
  onQueryChange,
  onSearch,
  onClear,
  loading,
  error,
  searched,
  results,
}) {
  const [expanded, setExpanded] = useState(false);
  const showResults = loading || Boolean(error) || searched;
  const showCount = searched && !loading && !error;

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/25 p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-right"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-[20px] bg-[#1877F2]/12 text-[#1877F2]">
            <Facebook className="size-5" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-foreground">فحص صفحة فيسبوك</p>
              {showCount ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-border/70 bg-background px-2.5 py-1 text-[11px]"
                >
                  {results.length} {results.length === 1 ? "نتيجة" : "نتائج"}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              ابحث باسم الصفحة أو الـ ID واعرف إذا كانت مرتبطة بشركة داخل المنصة.
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Facebook className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#1877F2]" />
              <Input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void onSearch();
                  }
                }}
                placeholder="اسم الصفحة أو الـ ID..."
                className="h-11 rounded-[20px] border-border/70 bg-white/85 pr-11 dark:bg-slate-950/55"
              />
            </div>

            <Button
              type="button"
              className="h-11 rounded-[20px] px-4 sm:min-w-[7.75rem]"
              onClick={() => void onSearch()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              {loading ? "جاري الفحص..." : "افحص الآن"}
            </Button>

            {(query || showResults) && (
              <Button
                type="button"
                variant="ghost"
                className="h-11 rounded-[20px] px-4 text-xs"
                onClick={onClear}
              >
                مسح
              </Button>
            )}
          </div>

          {showResults ? (
            <div className="space-y-3 border-t border-border/60 pt-3">
              {error ? (
                <Alert variant="destructive" className="rounded-[22px]">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>تعذر تنفيذ الفحص</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              {loading ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {[...Array(2)].map((_, index) => (
                    <div
                      key={index}
                      className="rounded-[22px] border border-border/70 bg-white/85 p-4 dark:bg-slate-950/60"
                    >
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="mt-3 h-3 w-40" />
                      <Skeleton className="mt-2 h-3 w-32" />
                    </div>
                  ))}
                </div>
              ) : searched && results.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-border/90 bg-background/70 px-4 py-8 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-[18px] bg-muted/80 text-muted-foreground">
                    <Search className="size-4" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">لا توجد نتائج مطابقة</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    غالبًا الصفحة غير مربوطة حاليًا بأي شركة.
                  </p>
                </div>
              ) : results.length ? (
                <div className="max-h-[22rem] space-y-3 overflow-y-auto pl-1">
                  {results.map((page) => (
                    <div
                      key={page.id}
                      className="rounded-[22px] border border-border/70 bg-white/82 p-4 shadow-[0_20px_60px_-42px_rgba(15,27,45,0.55)] dark:bg-slate-950/65"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-foreground">{page.pageName}</h3>
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full px-2.5 py-1 text-[11px] font-bold",
                                page.isRegistered
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300",
                              )}
                            >
                              {page.isRegistered ? "مسجلة" : "غير مسجلة"}
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground">
                            معرف الصفحة: {page.pageId}
                          </p>

                          {page.company ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px]">
                                <Building2 className="size-3.5" />
                                {page.company.name}
                              </Badge>
                              {page.company.plan ? (
                                <Badge
                                  variant="outline"
                                  className="rounded-full px-2.5 py-1 text-[11px]"
                                >
                                  {getPlanMeta(page.company.plan).label}
                                </Badge>
                              ) : null}
                            </div>
                          ) : (
                            <p className="text-xs font-semibold text-muted-foreground">
                              غير مرتبطة بأي شركة
                            </p>
                          )}
                        </div>

                        <div className="flex size-11 items-center justify-center rounded-[20px] bg-[#1877F2]/10 text-[#1877F2]">
                          {page.isRegistered ? (
                            <BadgeCheck className="size-5" />
                          ) : (
                            <AlertTriangle className="size-5" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

const SuperAdminCompanies = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [savedView, setSavedView] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterPlan, setFilterPlan] = useState("ALL");
  const [filterFunnelStage, setFilterFunnelStage] = useState("ALL");
  const [sortValue, setSortValue] = useState(DEFAULT_SORT);
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  const [activeCompany, setActiveCompany] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedCompanyPages, setSelectedCompanyPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);

  const [companyModal, setCompanyModal] = useState({
    open: false,
    mode: "create",
  });
  const [companyForm, setCompanyForm] = useState(INITIAL_COMPANY_FORM);
  const [companyFormErrors, setCompanyFormErrors] = useState({});
  const [savingCompany, setSavingCompany] = useState(false);

  const [facebookPagesOpen, setFacebookPagesOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [changeOwnerOpen, setChangeOwnerOpen] = useState(false);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [actionsSheetOpen, setActionsSheetOpen] = useState(false);

  const [deleteState, setDeleteState] = useState({
    open: false,
    mode: "single",
    ids: [],
    companyName: "",
  });
  const [deleting, setDeleting] = useState(false);

  const [changeOwnerTargetUserId, setChangeOwnerTargetUserId] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  const [addEmployeeForm, setAddEmployeeForm] = useState(INITIAL_EMPLOYEE_FORM);
  const [addEmployeeErrors, setAddEmployeeErrors] = useState({});
  const [employeeLoading, setEmployeeLoading] = useState(false);

  const [followUpOwners, setFollowUpOwners] = useState([]);
  const [loadingFollowUpOwners, setLoadingFollowUpOwners] = useState(false);
  const [followUpForm, setFollowUpForm] = useState(INITIAL_FOLLOW_UP_FORM);
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  const [userDeleteTarget, setUserDeleteTarget] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const [facebookLookupQuery, setFacebookLookupQuery] = useState("");
  const [facebookLookupResults, setFacebookLookupResults] = useState([]);
  const [facebookLookupLoading, setFacebookLookupLoading] = useState(false);
  const [facebookLookupError, setFacebookLookupError] = useState("");
  const [facebookLookupSearched, setFacebookLookupSearched] = useState(false);

  const currentAdmin = useMemo(() => {
    if (typeof window === "undefined") return null;

    try {
      const rawUser = localStorage.getItem("user");
      return rawUser ? JSON.parse(rawUser) : null;
    } catch (_error) {
      return null;
    }
  }, []);

  const loadCompanies = async ({ background = false } = {}) => {
    try {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setPageError("");

      const response = await apiClient.get("/admin/companies");
      if (response.data?.success) {
        setCompanies(response.data.data?.companies || []);
      } else {
        setPageError(response.data?.message || "فشل في تحميل الشركات");
      }
    } catch (error) {
      setPageError(extractErrorMessage(error, "فشل في تحميل الشركات"));
    } finally {
      if (background) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadCompanies();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    savedView,
    filterStatus,
    filterPlan,
    filterFunnelStage,
    sortValue,
    rowsPerPage,
  ]);

  const applySavedView = (nextView) => {
    setSavedView(nextView);

    if (nextView === "ALL") {
      return;
    }

    setSortValue("attention:desc");
  };

  const openSavedView = (nextView) => {
    setSearchTerm("");
    setFilterStatus("ALL");
    setFilterPlan("ALL");
    setFilterFunnelStage("ALL");
    applySavedView(nextView);
  };

  const companiesWithFunnel = useMemo(
    () =>
      companies.map((company) => {
        const funnelSummary = getCompanyFunnelSummary(company);
        const followUp = getCompanyFollowUpState(company);
        const funnelStaleStatus = getCompanyFunnelStaleStatus(funnelSummary);
        return {
          ...company,
          funnelSummary,
          funnelLastActivity: getCompanyFunnelLastActivity(funnelSummary),
          funnelStaleStatus,
          funnelAttentionScore: getCompanyFunnelAttentionScore(funnelSummary),
          funnelIntervention: getCompanyInterventionAction(funnelSummary),
          followUp,
          followUpReminder: getCompanyFollowUpReminderState(followUp, {
            currentAdminId: currentAdmin?.id || null,
            staleStatus: funnelStaleStatus,
          }),
          followUpAutomation: getCompanyFollowUpAutomationState(followUp, {
            staleStatus: funnelStaleStatus,
          }),
        };
      }),
    [companies, currentAdmin?.id],
  );

  const activeCompanyFollowUp = useMemo(
    () => (activeCompany ? getCompanyFollowUpState(activeCompany) : null),
    [activeCompany],
  );
  const activeCompanyReminder = useMemo(
    () =>
      activeCompany
        ? getCompanyFollowUpReminderState(activeCompany, {
            currentAdminId: currentAdmin?.id || null,
            staleStatus:
              activeCompany.funnelStaleStatus ||
              getCompanyFunnelStaleStatus(activeCompany),
          })
        : null,
    [activeCompany, currentAdmin?.id],
  );
  const activeCompanyAutomation = useMemo(
    () =>
      activeCompany
        ? getCompanyFollowUpAutomationState(activeCompany, {
            staleStatus:
              activeCompany.funnelStaleStatus ||
              getCompanyFunnelStaleStatus(activeCompany),
          })
        : null,
    [activeCompany],
  );

  const filteredCompanies = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return companiesWithFunnel.filter((company) => {
      const matchesSearch =
        !normalizedSearch ||
        company.name?.toLowerCase().includes(normalizedSearch) ||
        company.email?.toLowerCase().includes(normalizedSearch) ||
        company.phone?.toLowerCase().includes(normalizedSearch) ||
        company.website?.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        filterStatus === "ALL" ||
        (filterStatus === "ACTIVE" ? company.isActive : !company.isActive);

      const matchesPlan =
        filterPlan === "ALL" || String(company.plan) === String(filterPlan);
      const matchesFunnelStage =
        filterFunnelStage === "ALL" ||
        company.funnelSummary?.stageKey === filterFunnelStage;
      const matchesSavedView =
        savedView === "ALL" ||
        (savedView === "FOLLOW_UP_NOW"
          ? company.funnelStaleStatus?.needsFollowUpNow
          : savedView === "MY_TODAY"
            ? company.followUpReminder?.isMine &&
              company.followUpReminder?.needsFollowUpToday
            : savedView === "ESCALATION_DUE"
              ? company.followUpAutomation?.needsEscalation ||
                company.followUpAutomation?.needsUrgentEscalation
            : company.funnelStaleStatus?.isStale72h);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPlan &&
        matchesFunnelStage &&
        matchesSavedView
      );
    });
  }, [
    companiesWithFunnel,
    searchTerm,
    savedView,
    filterStatus,
    filterPlan,
    filterFunnelStage,
  ]);

  const sortedCompanies = useMemo(
    () => sortCompanies(filteredCompanies, sortValue),
    [filteredCompanies, sortValue],
  );

  const pageSize = Number(rowsPerPage) || 10;
  const totalPages = Math.max(1, Math.ceil(sortedCompanies.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCompanies = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedCompanies.slice(start, start + pageSize);
  }, [pageSize, safeCurrentPage, sortedCompanies]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const visibleIds = paginatedCompanies.map((company) => company.id);
  const isAllVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isSomeVisibleSelected =
    visibleIds.some((id) => selectedIds.includes(id)) && !isAllVisibleSelected;

  const filterCount = [
    savedView !== "ALL",
    filterStatus !== "ALL",
    filterPlan !== "ALL",
    filterFunnelStage !== "ALL",
  ].filter(Boolean).length;

  const quickStats = useMemo(() => {
    const activeCompanies = companiesWithFunnel.filter((company) => company.isActive).length;
    const enterpriseCompanies = companiesWithFunnel.filter(
      (company) => company.plan === "ENTERPRISE",
    ).length;
    const connectedFacebookPages = companiesWithFunnel.reduce(
      (sum, company) => sum + getCount(company, "facebookPages"),
      0,
    );
    const funnelStats = getCompaniesFunnelStats(companiesWithFunnel);
    const followUpStats = getCompaniesFunnelFollowUpStats(companiesWithFunnel);
    const reminderStats = getCompaniesFollowUpReminderStats(
      companiesWithFunnel,
      currentAdmin?.id || null,
    );
    const automationStats = getCompaniesFollowUpAutomationStats(
      companiesWithFunnel,
    );

    return {
      totalCompanies: companiesWithFunnel.length,
      activeCompanies,
      enterpriseCompanies,
      connectedFacebookPages,
      ...funnelStats,
      ...followUpStats,
      ...reminderStats,
      ...automationStats,
    };
  }, [companiesWithFunnel, currentAdmin?.id]);

  const openCreateCompany = () => {
    setActiveCompany(null);
    setCompanyForm(INITIAL_COMPANY_FORM);
    setCompanyFormErrors({});
    setCompanyModal({ open: true, mode: "create" });
  };

  const openEditCompany = (company) => {
    setActiveCompany(company);
    setCompanyFormErrors({});
    setCompanyForm({
      name: company.name || "",
      email: company.email || "",
      phone: company.phone || "",
      website: company.website || "",
      plan: company.plan || "BASIC",
      currency: company.currency || "EGP",
      adminFirstName: "",
      adminLastName: "",
      adminEmail: "",
      adminPassword: "",
    });
    setCompanyModal({ open: true, mode: "edit" });
    setActionsSheetOpen(false);
  };

  const validateCompanyForm = () => {
    const errors = {};

    if (!companyForm.name.trim()) {
      errors.name = "اسم الشركة مطلوب";
    }

    if (!companyForm.email.trim()) {
      errors.email = "البريد الإلكتروني مطلوب";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.email)) {
      errors.email = "صيغة البريد الإلكتروني غير صحيحة";
    }

    if (companyModal.mode === "create") {
      if (!companyForm.adminFirstName.trim()) {
        errors.adminFirstName = "الاسم الأول مطلوب";
      }
      if (!companyForm.adminLastName.trim()) {
        errors.adminLastName = "الاسم الأخير مطلوب";
      }
      if (!companyForm.adminEmail.trim()) {
        errors.adminEmail = "بريد المدير مطلوب";
      } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.adminEmail)
      ) {
        errors.adminEmail = "بريد المدير غير صحيح";
      }
      if (!companyForm.adminPassword.trim()) {
        errors.adminPassword = "كلمة المرور مطلوبة";
      }
    }

    setCompanyFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCompany = async () => {
    if (!validateCompanyForm()) return;

    try {
      setSavingCompany(true);

      const payload =
        companyModal.mode === "create"
          ? {
              name: companyForm.name.trim(),
              email: companyForm.email.trim(),
              phone: companyForm.phone.trim() || undefined,
              website: companyForm.website.trim() || undefined,
              plan: companyForm.plan,
              currency: companyForm.currency,
              adminFirstName: companyForm.adminFirstName.trim(),
              adminLastName: companyForm.adminLastName.trim(),
              adminEmail: companyForm.adminEmail.trim(),
              adminPassword: companyForm.adminPassword,
            }
          : {
              name: companyForm.name.trim(),
              email: companyForm.email.trim(),
              phone: companyForm.phone.trim() || "",
              website: companyForm.website.trim() || "",
              plan: companyForm.plan,
              currency: companyForm.currency,
            };

      const response =
        companyModal.mode === "create"
          ? await apiClient.post("/admin/companies", payload)
          : await apiClient.put(`/admin/companies/${activeCompany.id}`, payload);

      if (response.data?.success) {
        toast.success(
          companyModal.mode === "create"
            ? "تم إنشاء الشركة بنجاح"
            : "تم تحديث الشركة بنجاح",
        );
        setCompanyModal((current) => ({ ...current, open: false }));
        setCompanyForm(INITIAL_COMPANY_FORM);
        await loadCompanies({ background: true });
      } else {
        toast.error(response.data?.message || "فشل في حفظ الشركة");
      }
    } catch (error) {
      toast.error(extractErrorMessage(error, "فشل في حفظ الشركة"));
    } finally {
      setSavingCompany(false);
    }
  };

  const handleToggleSelect = (companyId) => {
    setSelectedIds((current) =>
      current.includes(companyId)
        ? current.filter((id) => id !== companyId)
        : [...current, companyId],
    );
  };

  const handleToggleSelectAllVisible = (checked) => {
    if (checked) {
      setSelectedIds((current) => {
        const next = new Set(current);
        visibleIds.forEach((id) => next.add(id));
        return Array.from(next);
      });
      return;
    }

    setSelectedIds((current) => current.filter((id) => !visibleIds.includes(id)));
  };

  const openDeleteDialog = ({ mode, ids, companyName }) => {
    setDeleteState({
      open: true,
      mode,
      ids,
      companyName: companyName || "",
    });
    setActionsSheetOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteState.ids.length) return;

    try {
      setDeleting(true);

      const response =
        deleteState.mode === "single"
          ? await apiClient.delete(`/admin/companies/${deleteState.ids[0]}`)
          : await apiClient.post("/admin/companies/bulk-delete", {
              companyIds: deleteState.ids,
            });

      if (response.data?.success) {
        toast.success(
          deleteState.mode === "single"
            ? "تم حذف الشركة بنجاح"
            : `تم حذف ${deleteState.ids.length} شركة بنجاح`,
        );
        setDeleteState({ open: false, mode: "single", ids: [], companyName: "" });
        setSelectedIds((current) =>
          current.filter((id) => !deleteState.ids.includes(id)),
        );
        await loadCompanies({ background: true });
      } else {
        toast.error(response.data?.message || "فشل في حذف الشركة");
      }
    } catch (error) {
      toast.error(extractErrorMessage(error, "فشل في حذف الشركة"));
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkStatus = async (isActive) => {
    if (!selectedIds.length) return;

    try {
      const response = await apiClient.put("/admin/companies/bulk-status", {
        companyIds: selectedIds,
        isActive,
      });

      if (response.data?.success) {
        toast.success(
          isActive ? "تم تفعيل الشركات المحددة" : "تم تعطيل الشركات المحددة",
        );
        setSelectedIds([]);
        await loadCompanies({ background: true });
      } else {
        toast.error(response.data?.message || "فشل في تنفيذ العملية");
      }
    } catch (error) {
      toast.error(extractErrorMessage(error, "فشل في تنفيذ العملية"));
    }
  };

  const handleOpenDetails = (company) => {
    if (!company?.id) return;
    navigate(`/super-admin/companies/${company.id}`);
  };

  const loadCompanyUsers = async (companyId, { openUsersModal = false } = {}) => {
    try {
      setLoadingUsers(true);
      const response = await apiClient.get(`/admin/companies/${companyId}/users`);
      if (response.data?.success) {
        setCompanyUsers(response.data.data?.users || []);
        if (openUsersModal) {
          setUsersOpen(true);
        }
      } else {
        toast.error(response.data?.message || "فشل في تحميل الأعضاء");
      }
    } catch (error) {
      toast.error(extractErrorMessage(error, "فشل في تحميل الأعضاء"));
    } finally {
      setLoadingUsers(false);
    }
  };

  const openUsersModal = async (company) => {
    setActiveCompany(company);
    setActionsSheetOpen(false);
    await loadCompanyUsers(company.id, { openUsersModal: true });
  };

  const openChangeOwnerModal = async (company) => {
    setActiveCompany(company);
    setChangeOwnerTargetUserId("");
    setActionsSheetOpen(false);
    setChangeOwnerOpen(true);
    await loadCompanyUsers(company.id);
  };

  const handleTransferOwnership = async () => {
    if (!activeCompany || !changeOwnerTargetUserId) return;

    try {
      setTransferLoading(true);
      const response = await apiClient.post(
        `/admin/companies/${activeCompany.id}/transfer-ownership`,
        { targetUserId: changeOwnerTargetUserId },
      );

      if (response.data?.success) {
        toast.success("تم نقل ملكية الشركة بنجاح");
        setChangeOwnerOpen(false);
        await loadCompanies({ background: true });
        await loadCompanyUsers(activeCompany.id);
      } else {
        toast.error(response.data?.message || "فشل في نقل الملكية");
      }
    } catch (error) {
      toast.error(extractErrorMessage(error, "فشل في نقل الملكية"));
    } finally {
      setTransferLoading(false);
    }
  };

  const openAddEmployeeModal = (company) => {
    setActiveCompany(company);
    setActionsSheetOpen(false);
    setAddEmployeeForm(INITIAL_EMPLOYEE_FORM);
    setAddEmployeeErrors({});
    setAddEmployeeOpen(true);
  };

  const validateEmployeeForm = () => {
    const errors = {};

    if (!addEmployeeForm.firstName.trim()) {
      errors.firstName = "الاسم الأول مطلوب";
    }
    if (!addEmployeeForm.lastName.trim()) {
      errors.lastName = "الاسم الأخير مطلوب";
    }
    if (!addEmployeeForm.email.trim()) {
      errors.email = "البريد الإلكتروني مطلوب";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addEmployeeForm.email)
    ) {
      errors.email = "صيغة البريد الإلكتروني غير صحيحة";
    }
    if (!addEmployeeForm.password.trim()) {
      errors.password = "كلمة المرور مطلوبة";
    }

    setAddEmployeeErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddEmployee = async () => {
    if (!activeCompany || !validateEmployeeForm()) return;

    try {
      setEmployeeLoading(true);
      const response = await apiClient.post(
        `/admin/companies/${activeCompany.id}/employees`,
        {
          firstName: addEmployeeForm.firstName.trim(),
          lastName: addEmployeeForm.lastName.trim(),
          email: addEmployeeForm.email.trim(),
          password: addEmployeeForm.password,
          role: addEmployeeForm.role,
        },
      );

      if (response.data?.success) {
        toast.success("تمت إضافة الموظف بنجاح");
        setAddEmployeeOpen(false);
        await loadCompanies({ background: true });
        await loadCompanyUsers(activeCompany.id);
      } else {
        toast.error(response.data?.message || "فشل في إضافة الموظف");
      }
    } catch (error) {
      toast.error(extractErrorMessage(error, "فشل في إضافة الموظف"));
    } finally {
      setEmployeeLoading(false);
    }
  };

  const openFollowUpModal = async (company) => {
    if (!company?.id) return;

    const followUp = getCompanyFollowUpState(company);
    setActiveCompany(company);
    setActionsSheetOpen(false);
    setFollowUpForm({
      assignedOwnerId: followUp.assignedOwner.id || "",
      status: followUp.status === "unassigned" ? "pending" : followUp.status,
      nextActionAt:
        toDateTimeLocalValue(followUp.nextActionAt) ||
        (followUp.assignedOwner.id && followUp.status !== "resolved"
          ? getDefaultFollowUpScheduleValue(followUp.status)
          : ""),
      note: "",
    });
    setFollowUpOpen(true);
    await loadFollowUpOwners();
  };

  const assignFollowUpToCurrentAdmin = () => {
    if (!currentAdmin?.id) return;

    setFollowUpForm((current) => ({
      ...current,
      assignedOwnerId: currentAdmin.id,
      status: current.status === "unassigned" ? "pending" : current.status,
      nextActionAt:
        current.nextActionAt || getDefaultFollowUpScheduleValue(current.status),
    }));
  };

  const applyFollowUpStatePatch = (companyId, nextFollowUp) => {
    setCompanies((current) =>
      current.map((company) =>
        company.id === companyId
          ? {
              ...company,
              followUp: nextFollowUp,
            }
          : company,
      ),
    );
    setActiveCompany((current) =>
      current?.id === companyId
        ? {
            ...current,
            followUp: nextFollowUp,
          }
        : current,
    );
  };

  const runFollowUpAutomationAction = async (
    company,
    payload,
    successMessage,
  ) => {
    if (!company?.id) return false;

    try {
      setSavingFollowUp(true);
      const response = await apiClient.put(
        `/admin/companies/${company.id}/follow-up`,
        payload,
      );

      if (response.data?.success) {
        const nextFollowUp = getCompanyFollowUpState(
          response.data.data?.followUp || {},
        );
        applyFollowUpStatePatch(company.id, nextFollowUp);
        toast.success(successMessage);
        await loadCompanies({ background: true });
        return true;
      }

      toast.error(response.data?.message || "فشل في تنفيذ الإجراء");
      return false;
    } catch (error) {
      toast.error(extractErrorMessage(error, "فشل في تنفيذ الإجراء"));
      return false;
    } finally {
      setSavingFollowUp(false);
    }
  };

  const handleSaveFollowUp = async () => {
    if (!activeCompany?.id) return;

    try {
      setSavingFollowUp(true);

      const payload = {
        status: followUpForm.assignedOwnerId
          ? followUpForm.status
          : "unassigned",
        note: followUpForm.note.trim() || undefined,
        clearOwner: !followUpForm.assignedOwnerId,
        clearNextAction: !followUpForm.assignedOwnerId || !followUpForm.nextActionAt,
      };

      if (followUpForm.assignedOwnerId) {
        payload.assignedOwnerId = followUpForm.assignedOwnerId;
      }
      if (followUpForm.assignedOwnerId && followUpForm.nextActionAt) {
        payload.nextActionAt = fromDateTimeLocalValue(followUpForm.nextActionAt);
      }

      const response = await apiClient.put(
        `/admin/companies/${activeCompany.id}/follow-up`,
        payload,
      );

      if (response.data?.success) {
        const nextFollowUp = getCompanyFollowUpState(response.data.data?.followUp || {});
        applyFollowUpStatePatch(activeCompany.id, nextFollowUp);
        setFollowUpOpen(false);
        setFollowUpForm(INITIAL_FOLLOW_UP_FORM);
        toast.success("تم تحديث متابعة الشركة");
        await loadCompanies({ background: true });
      } else {
        toast.error(response.data?.message || "فشل في تحديث المتابعة");
      }
    } catch (error) {
      toast.error(extractErrorMessage(error, "فشل في تحديث المتابعة"));
    } finally {
      setSavingFollowUp(false);
    }
  };

  const handleLogFollowUpReminder = async () => {
    if (!activeCompany?.id) return;

    await runFollowUpAutomationAction(
      activeCompany,
      {
        markReminderSent: true,
      },
      "تم تسجيل إرسال التذكير",
    );
  };

  const handleLogFollowUpEscalation = async () => {
    if (!activeCompany?.id) return;

    await runFollowUpAutomationAction(
      activeCompany,
      {
        markEscalated: true,
      },
      "تم تسجيل التصعيد",
    );
  };

  const openFacebookPagesModal = async (company) => {
    setActiveCompany(company);
    setActionsSheetOpen(false);
    setFacebookPagesOpen(true);
    setSelectedCompanyPages([]);

    try {
      setLoadingPages(true);
      const response = await apiClient.get(
        `/admin/companies/${company.id}/facebook-pages`,
      );

      if (response.data?.success) {
        setSelectedCompanyPages(response.data.data || []);
      } else {
        toast.error(response.data?.message || "فشل في جلب صفحات فيسبوك");
      }
    } catch (error) {
      toast.error(extractErrorMessage(error, "فشل في جلب صفحات فيسبوك"));
    } finally {
      setLoadingPages(false);
    }
  };

  const handleSearchFacebookPages = async () => {
    const query = facebookLookupQuery.trim();
    if (!query) {
      setFacebookLookupError("اكتب اسم الصفحة أو الـ ID للبحث");
      setFacebookLookupResults([]);
      setFacebookLookupSearched(false);
      return;
    }

    try {
      setFacebookLookupLoading(true);
      setFacebookLookupError("");
      setFacebookLookupResults([]);
      setFacebookLookupSearched(true);

      const response = await apiClient.get(
        `/admin/companies/facebook-pages/search?query=${encodeURIComponent(query)}`,
      );

      if (response.data?.success) {
        setFacebookLookupResults(response.data.data?.results || []);
      } else {
        setFacebookLookupError(response.data?.message || "فشل في البحث");
      }
    } catch (error) {
      setFacebookLookupError(extractErrorMessage(error, "فشل في البحث"));
    } finally {
      setFacebookLookupLoading(false);
    }
  };

  const handleResetFacebookLookup = () => {
    setFacebookLookupQuery("");
    setFacebookLookupResults([]);
    setFacebookLookupError("");
    setFacebookLookupSearched(false);
  };

  const handleLoginAsAdmin = async (
    company,
    redirectPath = "/company-dashboard",
  ) => {
    if (!company?.id) return;

    try {
      const response = await apiClient.post(
        `/admin/companies/${company.id}/login-as-admin`,
      );

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
        window.location.href = redirectPath || "/company-dashboard";
        return;
      }

      toast.error(response.data?.message || "فشل في تسجيل الدخول كمدير الشركة");
    } catch (error) {
      toast.error(extractErrorMessage(error, "فشل في تسجيل الدخول كمدير الشركة"));
    }
  };

  const loadFollowUpOwners = async ({ force = false } = {}) => {
    if (!force && followUpOwners.length > 0) {
      return followUpOwners;
    }

    try {
      setLoadingFollowUpOwners(true);
      const response = await apiClient.get("/admin/companies/follow-up-owners");

      if (response.data?.success) {
        const owners = response.data.data?.owners || [];
        setFollowUpOwners(owners);
        return owners;
      }

      toast.error(response.data?.message || "فشل في تحميل مسؤولي المتابعة");
      return [];
    } catch (error) {
      toast.error(extractErrorMessage(error, "فشل في تحميل مسؤولي المتابعة"));
      return [];
    } finally {
      setLoadingFollowUpOwners(false);
    }
  };

  const handleOpenIntervention = async (company) => {
    if (!company?.id) {
      return;
    }

    const interventionAction =
      company.funnelIntervention || getCompanyInterventionAction(company);

    if (interventionAction.mode === "details" || !interventionAction.path) {
      handleOpenDetails(company);
      return;
    }

    await handleLoginAsAdmin(company, interventionAction.path);
  };

  const handleDeleteUser = async () => {
    if (!activeCompany || !userDeleteTarget?.id) return;

    try {
      setDeletingUser(true);
      const response = await apiClient.delete(
        `/admin/companies/${activeCompany.id}/users/${userDeleteTarget.id}`,
      );

      if (response.data?.success) {
        toast.success("تم حذف العضو بنجاح");
        setUserDeleteTarget(null);
        await loadCompanyUsers(activeCompany.id);
        await loadCompanies({ background: true });
      } else {
        toast.error(response.data?.message || "فشل في حذف العضو");
      }
    } catch (error) {
      toast.error(extractErrorMessage(error, "فشل في حذف العضو"));
    } finally {
      setDeletingUser(false);
    }
  };

  const activeFilterLabels = [
    savedView !== "ALL"
      ? FOLLOW_UP_SAVED_VIEWS.find((option) => option.value === savedView)?.label
      : null,
    filterStatus !== "ALL"
      ? STATUS_FILTERS.find((option) => option.value === filterStatus)?.label
      : null,
    filterPlan !== "ALL"
      ? PLAN_FILTERS.find((option) => option.value === filterPlan)?.label
      : null,
    filterFunnelStage !== "ALL"
      ? FUNNEL_STAGE_FILTERS.find((option) => option.value === filterFunnelStage)
          ?.label
      : null,
  ].filter(Boolean);
  const showLegacyFacebookPanel = false;

  const renderCompanyActions = (company, mobileList = false) => {
    const interventionAction =
      company.funnelIntervention || getCompanyInterventionAction(company);
    const followUp = company.followUp || getCompanyFollowUpState(company);
    const followUpAutomation =
      company.followUpAutomation || getCompanyFollowUpAutomationState(company);
    const actions = [
      ...(interventionAction.mode !== "details"
        ? [
            {
              key: "intervention",
              icon: LogIn,
              label: interventionAction.label,
              action: () => void handleOpenIntervention(company),
              tone: "text-primary",
            },
          ]
        : []),
      {
        key: "details",
        icon: Eye,
        label: "عرض التفاصيل",
        action: () => void handleOpenDetails(company),
      },
      {
        key: "followup",
        icon: CheckCircle2,
        label:
          followUp.statusMeta?.label === "بدون مسؤول"
            ? "إسناد المتابعة"
            : "إدارة المتابعة",
        action: () => void openFollowUpModal(company),
      },
      ...(followUpAutomation.needsUrgentEscalation ||
      followUpAutomation.needsEscalation
        ? [
            {
              key: "escalate-followup",
              icon: AlertTriangle,
              label: "تسجيل التصعيد",
              action: () =>
                void runFollowUpAutomationAction(
                  company,
                  { markEscalated: true },
                  "تم تسجيل التصعيد",
                ),
              tone: "text-rose-600 dark:text-rose-300",
            },
          ]
        : followUpAutomation.needsReminder
          ? [
              {
                key: "remind-followup",
                icon: RefreshCw,
                label: "تسجيل التذكير",
                action: () =>
                  void runFollowUpAutomationAction(
                    company,
                    { markReminderSent: true },
                    "تم تسجيل إرسال التذكير",
                  ),
                tone: "text-amber-600 dark:text-amber-300",
              },
            ]
          : []),
      {
        key: "edit",
        icon: Pencil,
        label: "تعديل",
        action: () => openEditCompany(company),
      },
      {
        key: "users",
        icon: Users,
        label: "مشاهدة الأعضاء",
        action: () => void openUsersModal(company),
      },
      {
        key: "pages",
        icon: Facebook,
        label: "صفحات فيسبوك",
        action: () => void openFacebookPagesModal(company),
      },
      {
        key: "owner",
        icon: ArrowLeftRight,
        label: "نقل الملكية",
        action: () => void openChangeOwnerModal(company),
      },
      {
        key: "employee",
        icon: UserPlus,
        label: "إضافة موظف",
        action: () => openAddEmployeeModal(company),
      },
      {
        key: "login",
        icon: LogIn,
        label: "دخول كأدمن",
        action: () => void handleLoginAsAdmin(company),
        tone: "text-primary",
      },
      {
        key: "delete",
        icon: Trash2,
        label: "حذف الشركة",
        action: () =>
          openDeleteDialog({
            mode: "single",
            ids: [company.id],
            companyName: company.name,
          }),
        tone: "text-destructive",
      },
    ];

    if (mobileList) {
      return (
        <div className="grid gap-2">
          {actions.map((item) => (
            <Button
              key={item.key}
              type="button"
              variant="outline"
              className={cn(
                "h-12 justify-start rounded-2xl border-border/70 bg-white/80 text-sm font-semibold dark:bg-slate-950/60",
                item.tone,
              )}
              onClick={item.action}
            >
              <item.icon className="size-4" />
              {item.label}
            </Button>
          ))}
        </div>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon-sm" className="rounded-2xl">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-60 min-w-60 rounded-[22px] p-2"
        >
          {actions.map((item, index) => (
            <React.Fragment key={item.key}>
              {index === actions.length - 2 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem onClick={item.action} className={item.tone}>
                <item.icon className="size-4" />
                {item.label}
              </DropdownMenuItem>
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <TooltipProvider delay={100}>
      <div
        dir="rtl"
        className="min-h-full bg-[var(--app-bg-gradient)] [background-image:var(--app-bg-glow),var(--app-bg-gradient)] pb-28"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-4 sm:px-5 md:gap-5 md:px-6 md:py-6">
          <section className="relative overflow-hidden rounded-2xl border-border/70 bg-white p-5 shadow-md dark:bg-slate-950/90">
            <div className="absolute inset-y-0 left-0 hidden w-52 bg-gradient-to-r from-primary/10 via-secondary/10 to-transparent md:block" />

            <div className="relative flex flex-col gap-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <Badge
                    variant="outline"
                    className="rounded-full border-primary/25 bg-primary/5 px-3 py-1 text-[11px] font-black text-primary"
                  >
                    <Sparkles className="size-3.5" />
                    مساحة إدارة الشركات
                  </Badge>

                  <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
                      إدارة الشركات
                    </h1>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                      واجهة أخف وأوضح لإدارة الشركات، بتجربة أقرب لتطبيقات الموبايل
                      مع cards سريعة، actions منظمة، وفلاتر أسهل.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-2xl"
                    onClick={() => downloadCompaniesCsv(sortedCompanies)}
                    disabled={!sortedCompanies.length}
                  >
                    <Download className="size-4" />
                    تصدير
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-2xl"
                    onClick={() => void loadCompanies({ background: true })}
                    disabled={refreshing}
                  >
                    {refreshing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    تحديث
                  </Button>

                  <Button
                    type="button"
                    className="hidden h-11 rounded-2xl md:inline-flex"
                    onClick={openCreateCompany}
                  >
                    <Plus className="size-4" />
                    شركة جديدة
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  icon={Building2}
                  label="إجمالي الشركات"
                  value={quickStats.totalCompanies}
                  hint={`${quickStats.activeCompanies} نشطة`}
                />
                <MetricCard
                  icon={CheckCircle2}
                  label="مفعلة بالكامل"
                  value={quickStats.activated}
                  hint="وصلت إلى الإطلاق الأول"
                  tone="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-100"
                />
                <MetricCard
                  icon={AlertTriangle}
                  label="محتاجة متابعة أو تصعيد"
                  value={quickStats.followUpNow + quickStats.escalationDue + quickStats.urgentEscalationDue}
                  hint="حسابات توقفت في الرحلة وتحتاج تدخل"
                  tone="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100"
                />
                <MetricCard
                  icon={AlertTriangle}
                  label="متوقفة 72 ساعة+"
                  value={quickStats.stale72h}
                  hint="حرجة: تحتاج تدخلًا فوريًا"
                  tone="border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-100"
                />
              </div>

              {(quickStats.urgentEscalationDue > 0 || quickStats.myDueToday > 0) ? (
                <Alert
                  className={cn(
                    "rounded-2xl border",
                    quickStats.urgentEscalationDue > 0
                      ? "border-rose-200/80 bg-rose-50/90 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100"
                      : "border-sky-200/80 bg-sky-50/90 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100",
                  )}
                >
                  <AlertTriangle className="size-4" />
                  <AlertTitle>
                    {quickStats.urgentEscalationDue > 0
                      ? `${quickStats.urgentEscalationDue} حالة تحتاج تصعيدًا عاجلًا`
                      : `${quickStats.myDueToday} متابعة مستحقة اليوم`}
                  </AlertTitle>
                  <AlertDescription className="flex flex-wrap items-center gap-2">
                    <Button type="button" size="sm" className="rounded-full" onClick={() => openSavedView(quickStats.urgentEscalationDue > 0 ? "ESCALATION_DUE" : "MY_TODAY")}>
                      {quickStats.urgentEscalationDue > 0 ? "فتح التصعيد" : "فتح متابعتي اليوم"}
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          </section>

          {pageError ? (
            <Alert variant="destructive" className="rounded-xl border-destructive/30 bg-white dark:bg-slate-950/90">
              <AlertTriangle className="size-4" />
              <AlertTitle>تعذر تحميل الصفحة</AlertTitle>
              <AlertDescription>{pageError}</AlertDescription>
            </Alert>
          ) : null}

          <section className="space-y-4">
              <Card className="rounded-2xl border-border/70 bg-white shadow-sm dark:bg-slate-950/90">
              <CardHeader className="gap-3 pb-1">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold">لوحة الشركات</CardTitle>
                    <CardDescription>
                      بحث سريع، فلترة فورية، وواجهة هجينة بين cards وtable.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Filter className="size-4" />
                    {sortedCompanies.length} نتيجة
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="ابحث باسم الشركة أو البريد أو الهاتف..."
                      className="h-12 rounded-xl border-border/80 bg-white/90 pr-11 dark:bg-slate-950/60"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center">
                    <Select value={sortValue} onValueChange={setSortValue}>
                      <SelectTrigger className="h-12 min-w-0 rounded-xl lg:min-w-[12rem]">
                        <ArrowDownUp className="size-4 text-muted-foreground" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={rowsPerPage} onValueChange={setRowsPerPage}>
                      <SelectTrigger className="h-12 min-w-0 rounded-xl lg:min-w-[8rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option} / صفحة
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
                    {FOLLOW_UP_SAVED_VIEWS.map((option) => {
                      const countByView = {
                        ALL: quickStats.totalCompanies,
                        FOLLOW_UP_NOW: quickStats.followUpNow,
                        MY_TODAY: quickStats.myDueToday,
                        ESCALATION_DUE:
                          quickStats.escalationDue + quickStats.urgentEscalationDue,
                        STALE_72H: quickStats.stale72h,
                      };

                      return (
                        <FilterChip
                          key={option.value}
                          active={savedView === option.value}
                          onClick={() => applySavedView(option.value)}
                        >
                          {option.label} ({countByView[option.value] ?? 0})
                        </FilterChip>
                      );
                    })}
                  </div>

                  <Separator orientation="vertical" className="hidden h-5 md:block" />

                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
                    {STATUS_FILTERS.map((option) => (
                      <FilterChip
                        key={option.value}
                        active={filterStatus === option.value}
                        onClick={() => setFilterStatus(option.value)}
                      >
                        {option.label}
                      </FilterChip>
                    ))}
                  </div>

                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
                    {PLAN_FILTERS.map((option) => (
                      <FilterChip
                        key={option.value}
                        active={filterPlan === option.value}
                        onClick={() => setFilterPlan(option.value)}
                      >
                        {option.label}
                      </FilterChip>
                    ))}
                  </div>

                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
                    {FUNNEL_STAGE_FILTERS.map((option) => {
                      const countByStage = {
                        ALL: quickStats.totalCompanies,
                      };

                      return (
                        <FilterChip
                          key={option.value}
                          active={filterFunnelStage === option.value}
                          onClick={() => setFilterFunnelStage(option.value)}
                        >
                          {option.label} ({countByStage[option.value] ?? 0})
                        </FilterChip>
                      );
                    })}
                  </div>

                  {(activeFilterLabels.length > 0 || searchTerm.trim()) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {searchTerm.trim() ? (
                        <Badge
                          variant="outline"
                          className="rounded-full border-border/80 bg-muted/40 px-3 py-1 text-[11px]"
                        >
                          البحث: {searchTerm}
                        </Badge>
                      ) : null}

                      {activeFilterLabels.map((label) => (
                        <Badge
                          key={label}
                          variant="outline"
                          className="rounded-full border-border/80 bg-muted/40 px-3 py-1 text-[11px]"
                        >
                          {label}
                        </Badge>
                      ))}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-xs"
                        onClick={() => {
                          setSearchTerm("");
                          setSavedView("ALL");
                          setFilterStatus("ALL");
                          setFilterPlan("ALL");
                          setFilterFunnelStage("ALL");
                          setSortValue(DEFAULT_SORT);
                        }}
                      >
                        مسح الفلاتر
                      </Button>
                    </div>
                  )}

                  <FacebookLookupWorkspace
                    query={facebookLookupQuery}
                    onQueryChange={(value) => {
                      setFacebookLookupQuery(value);
                      setFacebookLookupError("");
                      if (!value.trim()) {
                        setFacebookLookupResults([]);
                        setFacebookLookupSearched(false);
                      }
                    }}
                    onSearch={handleSearchFacebookPages}
                    onClear={handleResetFacebookLookup}
                    loading={facebookLookupLoading}
                    error={facebookLookupError}
                    searched={facebookLookupSearched}
                    results={facebookLookupResults}
                  />
                </div>

                {selectedIds.length > 0 ? (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">
                          تم تحديد {selectedIds.length} شركة
                        </p>
                        <p className="text-xs text-muted-foreground">
                          نفذ الأكشن الجماعي المناسب بسرعة.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 md:flex">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800/70 dark:hover:bg-emerald-950/30"
                          onClick={() => void handleBulkStatus(true)}
                        >
                          <CheckCircle2 className="size-4" />
                          تفعيل
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800/70 dark:hover:bg-amber-950/30"
                          onClick={() => void handleBulkStatus(false)}
                        >
                          <CircleOff className="size-4" />
                          تعطيل
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          className="rounded-2xl"
                          onClick={() =>
                            openDeleteDialog({
                              mode: "bulk",
                              ids: selectedIds,
                              companyName: "",
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                          حذف
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-2xl"
                          onClick={() => setSelectedIds([])}
                        >
                          مسح التحديد
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {loading ? (
                  <div className="space-y-3">
                    {[...Array(isMobile ? 4 : 6)].map((_, index) => (
                      <div
                        key={index}
                        className="rounded-[28px] border border-border/70 bg-white/85 p-4 dark:bg-slate-950/70"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Skeleton className="size-12 rounded-2xl" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-40" />
                              <Skeleton className="h-3 w-28" />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <Skeleton className="h-16 rounded-2xl" />
                            <Skeleton className="h-16 rounded-2xl" />
                            <Skeleton className="h-16 rounded-2xl" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : sortedCompanies.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed border-border/90 bg-muted/30 px-6 py-12 text-center">
                    <div className="mx-auto flex size-18 items-center justify-center rounded-[28px] bg-primary/8 text-primary">
                      <Building2 className="size-8" />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-foreground">
                      لا توجد شركات مطابقة
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      جرّب تعديل الفلاتر أو أضف شركة جديدة من الزر الرئيسي.
                    </p>
                    {(searchTerm || filterCount > 0) && (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4 rounded-2xl"
                        onClick={() => {
                          setSearchTerm("");
                          setSavedView("ALL");
                          setFilterStatus("ALL");
                          setFilterPlan("ALL");
                          setFilterFunnelStage("ALL");
                        }}
                      >
                        إعادة الضبط
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {isMobile ? (
                      <div className="space-y-3">
                        {paginatedCompanies.map((company) => (
                          <CompanyCard
                            key={company.id}
                            company={company}
                            selected={selectedIds.includes(company.id)}
                            onToggleSelect={handleToggleSelect}
                            onOpenDetails={handleOpenDetails}
                            onOpenActions={(nextCompany) => {
                              setActiveCompany(nextCompany);
                              setActionsSheetOpen(true);
                            }}
                            onOpenIntervention={(nextCompany) => {
                              void handleOpenIntervention(nextCompany);
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-border/70 bg-white dark:bg-slate-950/70">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader className="bg-muted/45">
                              <TableRow className="border-border/70">
                                <TableHead className="w-14 text-right">
                                  <Checkbox
                                    checked={isAllVisibleSelected}
                                    indeterminate={isSomeVisibleSelected}
                                    onCheckedChange={(checked) =>
                                      handleToggleSelectAllVisible(Boolean(checked))
                                    }
                                  />
                                </TableHead>
                                <TableHead className="text-right">الشركة</TableHead>
                                <TableHead className="text-right">الخطة</TableHead>
                                <TableHead className="text-right">الحالة</TableHead>
                                <TableHead className="text-right">الرحلة</TableHead>
                                <TableHead className="text-right">آخر نشاط</TableHead>
                                <TableHead className="text-right">المستخدمين</TableHead>
                                <TableHead className="text-right">العملاء</TableHead>
                                <TableHead className="text-right">فيسبوك</TableHead>
                                <TableHead className="text-right">الإنشاء</TableHead>
                                <TableHead className="text-right">الإجراءات</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginatedCompanies.map((company) => {
                                const planMeta = getPlanMeta(company.plan);
                                const funnelSummary =
                                  company.funnelSummary || getCompanyFunnelSummary(company);
                                const funnelLastActivity =
                                  company.funnelLastActivity ||
                                  getCompanyFunnelLastActivity(company);
                                const funnelStaleStatus =
                                  company.funnelStaleStatus ||
                                  getCompanyFunnelStaleStatus(company);
                                const followUp =
                                  company.followUp || getCompanyFollowUpState(company);
                                const followUpReminder =
                                  company.followUpReminder ||
                                  getCompanyFollowUpReminderState(company);
                                const followUpAutomation =
                                  company.followUpAutomation ||
                                  getCompanyFollowUpAutomationState(company);
                                const interventionAction =
                                  company.funnelIntervention ||
                                  getCompanyInterventionAction(company);
                                const interventionUsesDetails =
                                  interventionAction.mode === "details";

                                return (
                                  <TableRow
                                    key={company.id}
                                    className="border-border/60 hover:bg-muted/20"
                                  >
                                    <TableCell>
                                      <Checkbox
                                        checked={selectedIds.includes(company.id)}
                                        onCheckedChange={() =>
                                          handleToggleSelect(company.id)
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <div className="space-y-1">
                                        <button
                                          type="button"
                                          className="text-right text-sm font-semibold text-foreground hover:text-primary"
                                          onClick={() => void handleOpenDetails(company)}
                                        >
                                          {company.name}
                                        </button>
                                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Mail className="size-3.5" />
                                          {company.email}
                                        </p>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "rounded-full px-2.5 py-1 text-[11px] font-bold",
                                          planMeta.className,
                                        )}
                                      >
                                        {planMeta.label}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <StatusBadge isActive={company.isActive} />
                                    </TableCell>
                                    <TableCell className="min-w-[220px]">
                                      <div className="space-y-2">
                                        <FunnelStageBadge
                                          summary={funnelSummary}
                                          className="min-w-[210px] bg-background/80"
                                        />
                                        <div className="flex flex-wrap items-center gap-2">
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "rounded-full px-2.5 py-1 text-[10px] font-bold",
                                              followUp.statusMeta.className,
                                            )}
                                          >
                                            {followUp.statusMeta.label}
                                          </Badge>
                                          <Badge
                                            variant="outline"
                                            className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                                          >
                                            {followUp.assignedOwner.label || "بدون مسؤول"}
                                          </Badge>
                                          {followUpReminder.isActionable ? (
                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                "rounded-full px-2.5 py-1 text-[10px] font-bold",
                                                followUpReminder.badgeClassName,
                                              )}
                                            >
                                              {followUpReminder.nextActionLabel}
                                            </Badge>
                                          ) : null}
                                          {followUpAutomation.level !== "idle" ? (
                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                "rounded-full px-2.5 py-1 text-[10px] font-bold",
                                                followUpAutomation.badgeClassName,
                                              )}
                                            >
                                              {followUpAutomation.label}
                                            </Badge>
                                          ) : null}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="min-w-[180px]">
                                      <div className="space-y-1">
                                        <p className="text-xs font-semibold text-foreground">
                                          {funnelLastActivity.relativeLabel}
                                        </p>
                                        <p className="text-[11px] leading-5 text-muted-foreground">
                                          {funnelLastActivity.label}
                                        </p>
                                        {funnelStaleStatus.isPending ? (
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "rounded-full px-2.5 py-1 text-[10px] font-bold",
                                              funnelStaleStatus.badgeClassName,
                                            )}
                                          >
                                            {funnelStaleStatus.label}
                                          </Badge>
                                        ) : null}
                                      </div>
                                    </TableCell>
                                    <TableCell className="font-bold">
                                      {getCount(company, "users")}
                                    </TableCell>
                                    <TableCell className="font-bold">
                                      {getCount(company, "customers")}
                                    </TableCell>
                                    <TableCell>
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-muted/35 px-2.5 py-1 text-xs font-semibold text-foreground hover:border-primary/30 hover:text-primary"
                                        onClick={() => void openFacebookPagesModal(company)}
                                      >
                                        <Facebook className="size-3.5" />
                                        {getCount(company, "facebookPages")}
                                      </button>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {formatDate(company.createdAt)}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant={
                                                interventionUsesDetails
                                                  ? "outline"
                                                  : "default"
                                              }
                                              className="rounded-full whitespace-nowrap"
                                              onClick={() =>
                                                void handleOpenIntervention(company)
                                              }
                                            >
                                              {interventionUsesDetails ? (
                                                <Eye className="size-4" />
                                              ) : (
                                                <LogIn className="size-4" />
                                              )}
                                              {interventionAction.label}
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent side="top">
                                            {interventionAction.hint}
                                          </TooltipContent>
                                        </Tooltip>
                                        {renderCompanyActions(company)}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-white p-3 dark:bg-slate-950/70 md:flex-row md:items-center md:justify-between">
                      <div
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                        dir="rtl"
                      >
                        <span>
                          صفحة {safeCurrentPage} من {totalPages}
                        </span>
                        <Separator orientation="vertical" className="hidden h-4 md:block" />
                        <span>
                          عرض {(safeCurrentPage - 1) * pageSize + 1} -{" "}
                          {Math.min(safeCurrentPage * pageSize, sortedCompanies.length)} من{" "}
                          {sortedCompanies.length}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 md:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-2xl"
                          onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                          disabled={safeCurrentPage === 1}
                        >
                          <ChevronRight className="size-4" />
                          السابق
                        </Button>

                        <div className="flex items-center gap-1">
                          {[...Array(Math.min(totalPages, 5))].map((_, index) => {
                            let pageNumber = index + 1;

                            if (totalPages > 5) {
                              const start = Math.max(
                                1,
                                Math.min(safeCurrentPage - 2, totalPages - 4),
                              );
                              pageNumber = start + index;
                            }

                            return (
                              <Button
                                key={pageNumber}
                                type="button"
                                variant={
                                  pageNumber === safeCurrentPage ? "default" : "outline"
                                }
                                size="icon-sm"
                                className="rounded-2xl"
                                onClick={() => setCurrentPage(pageNumber)}
                              >
                                {pageNumber}
                              </Button>
                            );
                          })}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-2xl"
                          onClick={() =>
                            setCurrentPage((current) => Math.min(totalPages, current + 1))
                          }
                          disabled={safeCurrentPage === totalPages}
                        >
                          التالي
                          <ChevronLeft className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {showLegacyFacebookPanel ? (
            <Card className="rounded-2xl border-border/70 bg-white shadow-sm dark:bg-slate-950/90">
              <CardHeader className="pb-1">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-[22px] bg-[#1877F2]/12 text-[#1877F2]">
                    <Facebook className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold">
                      فحص صفحة فيسبوك
                    </CardTitle>
                    <CardDescription>
                      اعرف هل الصفحة مربوطة بشركة عندك أم لا.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-3 rounded-[26px] border border-border/70 bg-muted/35 p-4">
                  <div className="relative">
                    <Facebook className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#1877F2]" />
                    <Input
                      value={facebookLookupQuery}
                      onChange={(event) => {
                        setFacebookLookupQuery(event.target.value);
                        setFacebookLookupError("");
                        if (!event.target.value.trim()) {
                          setFacebookLookupResults([]);
                          setFacebookLookupSearched(false);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleSearchFacebookPages();
                        }
                      }}
                      placeholder="اسم الصفحة أو الـ ID..."
                      className="h-12 rounded-[22px] bg-white/85 pr-11 dark:bg-slate-950/50"
                    />
                  </div>

                  <Button
                    type="button"
                    className="h-11 w-full rounded-[22px]"
                    onClick={() => void handleSearchFacebookPages()}
                    disabled={facebookLookupLoading}
                  >
                    {facebookLookupLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                    {facebookLookupLoading ? "جاري البحث..." : "ابحث الآن"}
                  </Button>
                </div>

                {facebookLookupError ? (
                  <Alert variant="destructive" className="rounded-[22px]">
                    <AlertTriangle className="size-4" />
                    <AlertTitle>تعذر تنفيذ البحث</AlertTitle>
                    <AlertDescription>{facebookLookupError}</AlertDescription>
                  </Alert>
                ) : null}

                {facebookLookupLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, index) => (
                      <div
                        key={index}
                        className="rounded-[24px] border border-border/70 bg-white/85 p-4 dark:bg-slate-950/60"
                      >
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="mt-3 h-3 w-40" />
                        <Skeleton className="mt-2 h-3 w-32" />
                      </div>
                    ))}
                  </div>
                ) : facebookLookupSearched && facebookLookupResults.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-border/90 bg-muted/20 px-4 py-10 text-center">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-[22px] bg-muted/80 text-muted-foreground">
                      <Search className="size-5" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-foreground">
                      لا توجد نتائج مطابقة
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      غالبًا الصفحة غير مربوطة حاليًا بأي شركة.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {facebookLookupResults.map((page) => (
                      <div
                        key={page.id}
                        className="rounded-[24px] border border-border/70 bg-white/82 p-4 shadow-[0_20px_60px_-42px_rgba(15,27,45,0.55)] dark:bg-slate-950/65"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold text-foreground">
                                {page.pageName}
                              </h3>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-[11px] font-bold",
                                  page.isRegistered
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300",
                                )}
                              >
                                {page.isRegistered ? "مسجلة" : "غير مسجلة"}
                              </Badge>
                            </div>

                            <p className="text-xs text-muted-foreground">
                              معرف الصفحة: {page.pageId}
                            </p>

                            {page.company ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px]">
                                  <Building2 className="size-3.5" />
                                  {page.company.name}
                                </Badge>
                                {page.company.plan ? (
                                  <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px]">
                                    {getPlanMeta(page.company.plan).label}
                                  </Badge>
                                ) : null}
                              </div>
                            ) : (
                              <p className="text-xs font-semibold text-muted-foreground">
                                غير مرتبطة بأي شركة
                              </p>
                            )}
                          </div>

                          <div className="flex size-11 items-center justify-center rounded-[20px] bg-[#1877F2]/10 text-[#1877F2]">
                            {page.isRegistered ? (
                              <BadgeCheck className="size-5" />
                            ) : (
                              <AlertTriangle className="size-5" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              </Card>
            ) : null}
          </section>
        </div>

        <Button
          type="button"
          size="icon-lg"
          className="fixed bottom-6 right-4 z-40 rounded-2xl shadow-lg md:hidden"
          onClick={openCreateCompany}
        >
          <Plus className="size-5" />
        </Button>

        <Sheet open={actionsSheetOpen} onOpenChange={setActionsSheetOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl border-t border-border/60 bg-white px-0 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-0 dark:border-white/10 dark:bg-slate-950"
            dir="rtl"
          >
            <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-muted" />
            <SheetHeader className="px-4 pb-3 pt-4 text-right">
              <SheetTitle className="text-right text-lg font-black">
                {activeCompany?.name || "إجراءات الشركة"}
              </SheetTitle>
              <SheetDescription className="text-right">
                اختصارات سريعة بنفس أسلوب تطبيقات الموبايل.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4">
              {activeCompany ? renderCompanyActions(activeCompany, true) : null}
            </div>
          </SheetContent>
        </Sheet>

        <ResponsiveOverlay
          mobile={isMobile}
          open={companyModal.open}
          onOpenChange={(open) =>
            setCompanyModal((current) => ({ ...current, open }))
          }
          title={
            companyModal.mode === "create" ? "إضافة شركة جديدة" : "تعديل الشركة"
          }
          description={
            companyModal.mode === "create"
              ? "أنشئ الشركة وحساب المدير الرئيسي من خطوة واحدة."
              : "حدّث بيانات الشركة الأساسية من نفس الواجهة."
          }
          bodyClassName="space-y-4"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl"
                onClick={() =>
                  setCompanyModal((current) => ({ ...current, open: false }))
                }
              >
                إلغاء
              </Button>
              <Button
                type="button"
                className="h-11 rounded-2xl"
                onClick={() => void handleSaveCompany()}
                disabled={savingCompany}
              >
                {savingCompany ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                {companyModal.mode === "create" ? "إنشاء الشركة" : "حفظ التعديلات"}
              </Button>
            </>
          }
        >
          <CompanyFormFields
            mode={companyModal.mode}
            formData={companyForm}
            formErrors={companyFormErrors}
            setFormData={setCompanyForm}
          />
        </ResponsiveOverlay>

        <ResponsiveOverlay
          mobile={isMobile}
          open={facebookPagesOpen}
          onOpenChange={setFacebookPagesOpen}
          title={`صفحات فيسبوك ${activeCompany?.name ? `- ${activeCompany.name}` : ""}`}
          description="كل الصفحات المرتبطة بهذه الشركة."
          bodyClassName="space-y-3"
          footer={
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl"
              onClick={() => setFacebookPagesOpen(false)}
            >
              إغلاق
            </Button>
          }
        >
          {loadingPages ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-[24px]" />
              ))}
            </div>
          ) : selectedCompanyPages.length ? (
            selectedCompanyPages.map((page) => (
              <div
                key={page.id}
                className="rounded-[24px] border border-border/70 bg-white/80 p-4 dark:bg-slate-950/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground">
                        {page.pageName}
                      </h4>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-bold",
                          page.status === "connected" || page.status === "active"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300",
                        )}
                      >
                        {page.status === "connected" || page.status === "active"
                          ? "متصل"
                          : "غير متصل"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      معرف الصفحة: {page.pageId}
                    </p>
                    {page.connectedAt ? (
                      <p className="text-xs text-muted-foreground">
                        تاريخ الربط: {formatDate(page.connectedAt)}
                      </p>
                    ) : null}
                    {page.updatedAt ? (
                      <p className="text-xs text-muted-foreground">
                        آخر نشاط: {formatDate(page.updatedAt)}
                      </p>
                    ) : null}
                    {page.messageCount !== undefined ? (
                      <p className="text-xs text-muted-foreground">
                        الرسائل: {page.messageCount}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex size-11 items-center justify-center rounded-[20px] bg-[#1877F2]/10 text-[#1877F2]">
                    <Facebook className="size-5" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-border/80 px-4 py-10 text-center text-sm text-muted-foreground">
              لا توجد صفحات فيسبوك مربوطة بهذه الشركة.
            </div>
          )}
        </ResponsiveOverlay>

        <ResponsiveOverlay
          mobile={isMobile}
          open={followUpOpen}
          onOpenChange={setFollowUpOpen}
          title={`متابعة ${activeCompany?.name || "الشركة"}`}
          description="عيّن مسؤولًا للحالة وسجل آخر نتيجة متابعة من نفس الشاشة."
          bodyClassName="space-y-4"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl"
                onClick={() => setFollowUpOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                className="h-11 rounded-2xl"
                onClick={() => void handleSaveFollowUp()}
                disabled={savingFollowUp}
              >
                {savingFollowUp ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                حفظ المتابعة
              </Button>
            </>
          }
        >
          {activeCompanyFollowUp ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-[22px] border border-border/70 bg-muted/25 p-4">
                <p className="text-[11px] font-bold text-muted-foreground">
                  الحالة الحالية
                </p>
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-2 rounded-full px-2.5 py-1 text-[11px] font-bold",
                    activeCompanyFollowUp.statusMeta.className,
                  )}
                >
                  {activeCompanyFollowUp.statusMeta.label}
                </Badge>
              </div>
              <div className="rounded-[22px] border border-border/70 bg-muted/25 p-4">
                <p className="text-[11px] font-bold text-muted-foreground">
                  المسؤول الحالي
                </p>
                <p className="mt-2 text-sm font-bold text-foreground">
                  {activeCompanyFollowUp.assignedOwner.label || "بدون مسؤول"}
                </p>
              </div>
              <div className="rounded-[22px] border border-border/70 bg-muted/25 p-4">
                <p className="text-[11px] font-bold text-muted-foreground">
                  آخر تحديث
                </p>
                <p className="mt-2 text-sm font-bold text-foreground">
                  {formatDateTime(activeCompanyFollowUp.updatedAt)}
                </p>
              </div>
              <div className="rounded-[22px] border border-border/70 bg-muted/25 p-4">
                <p className="text-[11px] font-bold text-muted-foreground">
                  المتابعة القادمة
                </p>
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-2 rounded-full px-2.5 py-1 text-[11px] font-bold",
                    activeCompanyReminder?.badgeClassName,
                  )}
                >
                  {activeCompanyReminder?.nextActionLabel || "لا يوجد موعد"}
                </Badge>
              </div>
              <div className="rounded-[22px] border border-border/70 bg-muted/25 p-4">
                <p className="text-[11px] font-bold text-muted-foreground">
                  الأتمتة الحالية
                </p>
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-2 rounded-full px-2.5 py-1 text-[11px] font-bold",
                    activeCompanyAutomation?.badgeClassName,
                  )}
                >
                  {activeCompanyAutomation?.label || "لا توجد أتمتة مطلوبة"}
                </Badge>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="مسؤول المتابعة">
              <div className="space-y-2">
                <Select
                  value={followUpForm.assignedOwnerId || "__none"}
                  onValueChange={(value) =>
                    setFollowUpForm((current) => ({
                      ...current,
                      assignedOwnerId: value === "__none" ? "" : value,
                      status:
                        value === "__none"
                          ? "pending"
                          : current.status === "unassigned"
                            ? "pending"
                            : current.status,
                      nextActionAt:
                        value === "__none"
                          ? ""
                          : current.nextActionAt ||
                            getDefaultFollowUpScheduleValue(current.status),
                    }))
                  }
                >
                  <SelectTrigger className="h-12 min-w-0 rounded-[22px]">
                    <SelectValue placeholder="اختر مسؤول المتابعة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">بدون مسؤول</SelectItem>
                    {followUpOwners.length ? (
                      followUpOwners.map((owner) => (
                        <SelectItem key={owner.id} value={owner.id}>
                          {owner.firstName} {owner.lastName} - {owner.role}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__empty" disabled>
                        {loadingFollowUpOwners ? "جاري التحميل..." : "لا يوجد أعضاء متاحون"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {currentAdmin?.id ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={assignFollowUpToCurrentAdmin}
                  >
                    اسندها لي
                  </Button>
                ) : null}
              </div>
            </FormField>

            <FormField label="حالة المتابعة">
              <Select
                value={
                  followUpForm.assignedOwnerId ? followUpForm.status : "unassigned"
                }
                onValueChange={(value) =>
                  setFollowUpForm((current) => ({
                    ...current,
                    status: value,
                    nextActionAt:
                      value === "resolved"
                        ? ""
                        : current.nextActionAt ||
                          getDefaultFollowUpScheduleValue(value),
                  }))
                }
                disabled={!followUpForm.assignedOwnerId}
              >
                <SelectTrigger className="h-12 min-w-0 rounded-[22px]">
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  {!followUpForm.assignedOwnerId ? (
                    <SelectItem value="unassigned">بدون مسؤول</SelectItem>
                  ) : (
                    FOLLOW_UP_STATUS_OPTIONS.filter(
                      (option) => option.value !== "unassigned",
                    ).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="ملاحظة المتابعة">
            <Textarea
              value={followUpForm.note}
              onChange={(event) =>
                setFollowUpForm((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
              placeholder="مثال: تواصلنا مع العميل وسيضيف أول منتج اليوم."
              className="min-h-[120px] rounded-[22px]"
            />
          </FormField>

          <FormField label="موعد المتابعة القادم">
            <div className="space-y-3">
              <Input
                type="datetime-local"
                value={followUpForm.nextActionAt}
                onChange={(event) =>
                  setFollowUpForm((current) => ({
                    ...current,
                    nextActionAt: event.target.value,
                  }))
                }
                disabled={
                  !followUpForm.assignedOwnerId || followUpForm.status === "resolved"
                }
                className="h-12 rounded-[22px]"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={!followUpForm.assignedOwnerId}
                  onClick={() =>
                    setFollowUpForm((current) => ({
                      ...current,
                      nextActionAt: addHoursToLocalDateTimeValue(24),
                    }))
                  }
                >
                  بعد 24 ساعة
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={!followUpForm.assignedOwnerId}
                  onClick={() =>
                    setFollowUpForm((current) => ({
                      ...current,
                      nextActionAt: addHoursToLocalDateTimeValue(72),
                    }))
                  }
                >
                  بعد 72 ساعة
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={!followUpForm.nextActionAt}
                  onClick={() =>
                    setFollowUpForm((current) => ({
                      ...current,
                      nextActionAt: "",
                    }))
                  }
                >
                  مسح الموعد
                </Button>
              </div>
            </div>
          </FormField>

          {activeCompanyAutomation &&
          activeCompanyFollowUp?.assignedOwner?.id &&
          activeCompanyFollowUp.status !== "resolved" ? (
            <div className="space-y-3 rounded-[24px] border border-border/70 bg-muted/20 p-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">أتمتة المتابعة</h4>
                <p className="text-xs leading-5 text-muted-foreground">
                  {activeCompanyAutomation.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={
                    savingFollowUp ||
                    !activeCompanyAutomation.needsReminder
                  }
                  onClick={() => void handleLogFollowUpReminder()}
                >
                  <RefreshCw className="size-4" />
                  تسجيل التذكير
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    activeCompanyAutomation.needsUrgentEscalation
                      ? "default"
                      : "outline"
                  }
                  className={cn(
                    "rounded-full",
                    activeCompanyAutomation.needsUrgentEscalation
                      ? "bg-rose-600 text-white hover:bg-rose-700"
                      : "",
                  )}
                  disabled={
                    savingFollowUp ||
                    (!activeCompanyAutomation.needsEscalation &&
                      !activeCompanyAutomation.needsUrgentEscalation)
                  }
                  onClick={() => void handleLogFollowUpEscalation()}
                >
                  <AlertTriangle className="size-4" />
                  تسجيل التصعيد
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div                 className="rounded-xl border border-border/60 bg-background/70 p-3">
                  <p className="text-[11px] font-bold text-muted-foreground">
                    آخر تذكير مسجل
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {formatDateTime(activeCompanyFollowUp.lastReminderSentAt)}
                  </p>
                </div>
                <div                 className="rounded-xl border border-border/60 bg-background/70 p-3">
                  <p className="text-[11px] font-bold text-muted-foreground">
                    آخر تصعيد مسجل
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {formatDateTime(activeCompanyFollowUp.lastEscalatedAt)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {activeCompanyFollowUp?.history?.length ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-foreground">آخر نشاطات المتابعة</h4>
                <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px]">
                  {activeCompanyFollowUp.history.length} سجل
                </Badge>
              </div>
              <div className="space-y-2">
                {activeCompanyFollowUp.history.slice(0, 4).map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-border/70 bg-white/70 p-3 dark:bg-slate-950/55"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-bold",
                          getCompanyFollowUpState({ status: entry.status }).statusMeta
                            .className,
                        )}
                      >
                        {FOLLOW_UP_STATUS_OPTIONS.find(
                          (option) => option.value === entry.status,
                        )?.label || entry.status}
                      </Badge>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDateTime(entry.occurredAt)}
                      </p>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-foreground">
                      {entry.actor?.label || "عضو الفريق"}
                    </p>
                    {entry.assignedOwner?.label ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        المسؤول: {entry.assignedOwner.label}
                      </p>
                    ) : null}
                    {entry.nextActionAt ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        المتابعة القادمة: {formatDateTime(entry.nextActionAt)}
                      </p>
                    ) : null}
                    {entry.note ? (
                      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                        {entry.note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </ResponsiveOverlay>

        <ResponsiveOverlay
          mobile={isMobile}
          open={changeOwnerOpen}
          onOpenChange={setChangeOwnerOpen}
          title={`نقل ملكية ${activeCompany?.name || "الشركة"}`}
          description="سيتم تحويل المالك الحالي إلى مدير شركة بعد تنفيذ العملية."
          bodyClassName="space-y-4"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl"
                onClick={() => setChangeOwnerOpen(false)}
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
              اختَر المستخدم الذي هيستلم صلاحيات المالك بالكامل.
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
                    {loadingUsers ? "جاري التحميل..." : "لا يوجد أعضاء مؤهلون"}
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
          title={`إضافة موظف إلى ${activeCompany?.name || "الشركة"}`}
          description="أضف عضو جديد بدون مغادرة الصفحة."
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
                إضافة الموظف
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
          open={usersOpen}
          onOpenChange={setUsersOpen}
          title={`أعضاء ${activeCompany?.name || "الشركة"}`}
          description="كل أعضاء الشركة مع الدور والحالة."
          bodyClassName="space-y-3"
          footer={
            activeCompany ? (
              <Button
                type="button"
                className="h-11 rounded-2xl"
                onClick={() => openAddEmployeeModal(activeCompany)}
              >
                <UserPlus className="size-4" />
                إضافة عضو جديد
              </Button>
            ) : null
          }
        >
          {loadingUsers ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-[24px]" />
              ))}
            </div>
          ) : companyUsers.length ? (
            companyUsers.map((user) => (
              <div
                key={user.id}
                className="rounded-[24px] border border-border/70 bg-white/80 p-4 dark:bg-slate-950/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground">
                        {user.firstName} {user.lastName}
                      </h4>
                      <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px]">
                        {getRoleLabel(user.role)}
                      </Badge>
                      <StatusBadge isActive={user.isActive} />
                    </div>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      أضيف في {formatDate(user.createdAt)}
                    </p>
                    {user.lastLoginAt ? (
                      <p className="text-xs text-muted-foreground">
                        آخر دخول {formatDate(user.lastLoginAt)}
                      </p>
                    ) : null}
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        className="rounded-2xl"
                        disabled={user.role === "OWNER"}
                        onClick={() => setUserDeleteTarget(user)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {user.role === "OWNER" ? "لا يمكن حذف المالك" : "حذف العضو"}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-border/80 px-4 py-10 text-center text-sm text-muted-foreground">
              لا يوجد أعضاء مسجلون لهذه الشركة.
            </div>
          )}
        </ResponsiveOverlay>

        <ResponsiveOverlay
          mobile={isMobile}
          open={deleteState.open}
          onOpenChange={(open) =>
            setDeleteState((current) => ({ ...current, open }))
          }
          title="تأكيد الحذف"
          description={
            deleteState.mode === "single"
              ? `سيتم حذف ${deleteState.companyName || "الشركة"} نهائيًا.`
              : `سيتم حذف ${deleteState.ids.length} شركة نهائيًا.`
          }
          bodyClassName="space-y-4"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl"
                onClick={() =>
                  setDeleteState({
                    open: false,
                    mode: "single",
                    ids: [],
                    companyName: "",
                  })
                }
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-11 rounded-2xl"
                onClick={() => void handleDeleteConfirm()}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                حذف نهائي
              </Button>
            </>
          }
        >
          <Alert variant="destructive" className="rounded-[22px] border-destructive/30">
            <AlertTriangle className="size-4" />
            <AlertTitle>راجع القرار قبل التنفيذ</AlertTitle>
            <AlertDescription>
              لا يمكن التراجع عن هذه العملية، وقد يتم حذف بيانات مرتبطة بالشركة أيضًا.
            </AlertDescription>
          </Alert>
        </ResponsiveOverlay>

        <ResponsiveOverlay
          mobile={isMobile}
          open={Boolean(userDeleteTarget)}
          onOpenChange={(open) => {
            if (!open) setUserDeleteTarget(null);
          }}
          title="حذف عضو"
          description={
            userDeleteTarget
              ? `سيتم حذف ${userDeleteTarget.firstName} ${userDeleteTarget.lastName} من الشركة الحالية.`
              : ""
          }
          bodyClassName="space-y-4"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl"
                onClick={() => setUserDeleteTarget(null)}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-11 rounded-2xl"
                onClick={() => void handleDeleteUser()}
                disabled={deletingUser}
              >
                {deletingUser ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                حذف العضو
              </Button>
            </>
          }
        >
          <Alert variant="destructive" className="rounded-[22px] border-destructive/30">
            <AlertTriangle className="size-4" />
            <AlertTitle>تأكيد الحذف</AlertTitle>
            <AlertDescription>
              العضو لن يقدر على الوصول للشركة بعد تنفيذ هذه الخطوة.
            </AlertDescription>
          </Alert>
        </ResponsiveOverlay>

        {selectedIds.length > 0 && isMobile ? (
          <div className="fixed inset-x-3 bottom-6 z-30 rounded-2xl border border-primary/20 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-slate-950/95">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">
                  {selectedIds.length} شركة محددة
                </p>
                <p className="text-[11px] text-muted-foreground">
                  أكشن جماعي سريع
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-2xl border-emerald-200 text-emerald-700"
                  onClick={() => void handleBulkStatus(true)}
                >
                  <CheckCircle2 className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-2xl border-amber-200 text-amber-700"
                  onClick={() => void handleBulkStatus(false)}
                >
                  <CircleOff className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  className="rounded-2xl"
                  onClick={() =>
                    openDeleteDialog({
                      mode: "bulk",
                      ids: selectedIds,
                      companyName: "",
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
};

export default SuperAdminCompanies;
