import type { Company, QuickStats } from "./types";

export function extractErrorMessage(error: unknown, fallback: string): string {
  const err = error as Record<string, unknown>;
  const resp = err?.response as Record<string, unknown> | undefined;
  return (typeof resp?.data === "string" ? resp.data : undefined)
    || ((resp?.data as Record<string, unknown> | undefined)?.message as string)
    || err?.message as string
    || fallback;
}

export function formatDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "غير متوفر";
  try {
    return new Date(dateValue).toLocaleDateString("ar-EG", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return "غير متوفر"; }
}

export function formatDateTime(dateValue: string | null | undefined): string {
  if (!dateValue) return "غير متوفر";
  try {
    return new Date(dateValue).toLocaleString("ar-EG", {
      year: "numeric", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch { return "غير متوفر"; }
}

export function toDateTimeLocalValue(dateValue: string | null | undefined): string {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function addHoursToDateTimeLocal(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return toDateTimeLocalValue(d.toISOString());
}

export function fromDateTimeLocalValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function normalizeWebsite(website: string | null): string | null {
  if (!website) return null;
  if (/^https?:\/\//i.test(website)) return website;
  return `https://${website}`;
}

export function getCount(company: Company, key: "users" | "customers" | "facebookPages" | "installedApps"): number {
  return company._count?.[key] || 0;
}

export function getRoleLabel(role: string): string {
  switch (role) {
    case "OWNER": return "مالك";
    case "COMPANY_ADMIN": return "مدير شركة";
    case "MANAGER": return "مدير";
    default: return "موظف";
  }
}

function compareValues(aValue: unknown, bValue: unknown, direction: string): number {
  if (aValue == null && bValue == null) return 0;
  if (aValue == null) return 1;
  if (bValue == null) return -1;
  let left = aValue as string | number;
  let right = bValue as string | number;
  if (typeof left === "string" && typeof right === "string") {
    left = left.toLowerCase();
    right = right.toLowerCase();
  }
  if (left > right) return direction === "asc" ? 1 : -1;
  if (left < right) return direction === "asc" ? -1 : 1;
  return 0;
}

export function sortCompanies(companies: Company[], sortValue: string): Company[] {
  const [sortKey, sortDirection = "asc"] = sortValue.split(":");
  return [...companies].sort((a, b) => {
    switch (sortKey) {
      case "name":
        return compareValues(a.name, b.name, sortDirection);
      case "users":
        return compareValues(getCount(a, "users"), getCount(b, "users"), sortDirection);
      case "facebookPages":
        return compareValues(getCount(a, "facebookPages"), getCount(b, "facebookPages"), sortDirection);
      case "createdAt":
      default:
        return compareValues(new Date(a.createdAt || 0).getTime(), new Date(b.createdAt || 0).getTime(), sortDirection);
    }
  });
}

export function getDefaultFollowUpScheduleValue(status: string): string {
  return addHoursToDateTimeLocal(status === "waiting" ? 72 : 24);
}

import {
  getCompanyFollowUpState,
  getCompanyFollowUpAutomationState,
  getCompanyFollowUpReminderState,
} from "../../utils/companyFollowUp";

const FOLLOW_UP_ACTIONABLE_STATUSES = new Set(["pending", "contacted", "waiting"]);

function computeFollowUpNow(followUp: ReturnType<typeof getCompanyFollowUpState>): boolean {
  const isActionable = !!followUp.assignedOwner.id && FOLLOW_UP_ACTIONABLE_STATUSES.has(followUp.status);
  if (!isActionable) return false;
  const nextActionAt = followUp.nextActionAt ? new Date(followUp.nextActionAt) : null;
  return !nextActionAt || nextActionAt.getTime() <= Date.now();
}

export function enrichCompanies(companies: Company[], currentAdminId: string | null): Company[] {
  return companies.map((company) => {
    const followUp = getCompanyFollowUpState(company);
    const needsFollowUpNow = computeFollowUpNow(followUp);
    const createdAt = company.createdAt ? new Date(company.createdAt) : null;
    const isStale72h = !followUp.assignedOwner.id && !!createdAt && (Date.now() - createdAt.getTime()) > 72 * 60 * 60 * 1000;
    const staleStatus = { needsFollowUpNow, isStale72h };
    return {
      ...company,
      followUp,
      followUpReminder: getCompanyFollowUpReminderState(followUp, { currentAdminId, staleStatus } as any),
      followUpAutomation: getCompanyFollowUpAutomationState(followUp, { staleStatus } as any),
    };
  });
}

export function getStorefrontUrl(company: Company): string | null {
  if (company.customDomain) return `https://${company.customDomain}`;
  if (company.slug) return `https://${company.slug}.maxp.online`;
  return null;
}

export function getStorefrontDisplay(company: Company): string | null {
  if (company.customDomain) return company.customDomain;
  if (company.slug) return `${company.slug}.maxp.online`;
  return null;
}

export function getSubscriptionBadge(company: Company): { label: string; tone: string; sub?: string } {
  if (company.trialModeEnabled || company.platformSubscription?.status === "trialing") {
    if (company.trialEndsAt) {
      const remainingMs = new Date(company.trialEndsAt).getTime() - Date.now();
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
      if (remainingDays <= 0) {
        return { label: "تجربة منتهية", tone: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300", sub: "يحتاج اشتراك" };
      }
      return {
        label: `تجريبي (${remainingDays} يوم)`,
        tone: remainingDays <= 2
          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          : "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/50 dark:bg-purple-950/30 dark:text-purple-300",
        sub: "فترة تجريبية",
      };
    }
    return { label: "تجريبي", tone: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/50 dark:bg-purple-950/30 dark:text-purple-300" };
  }

  if (company.platformSubscription?.status === "active") {
    return {
      label: company.platformSubscription.plan || "اشتراك نشط",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
      sub: "مدفوع",
    };
  }

  return { label: "غير مشترك", tone: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400" };
}

export function computeQuickStats(companies: Company[], serverStats?: QuickStats | null): QuickStats {
  // Prefer server-provided stats when available — the API already counts against
  // the full database, not just the currently paginated slice.
  if (serverStats) {
    return {
      totalCompanies: serverStats.totalCompanies,
      activeCompanies: serverStats.activeCompanies,
      connectedFacebookPages: serverStats.connectedFacebookPages ?? companies.reduce((s, c) => s + getCount(c, "facebookPages"), 0),
      followUpNow: serverStats.followUpNow,
      escalationDue: serverStats.escalationDue,
      urgentEscalationDue: serverStats.urgentEscalationDue,
      stale72h: serverStats.stale72h,
      myDueToday: serverStats.myDueToday,
      trialCompanies: serverStats.trialCompanies,
      onboardingStuck: serverStats.onboardingStuck,
      activeStores: serverStats.activeStores,
    };
  }
  const activeCompanies = companies.filter((c) => c.isActive).length;
  const connectedFacebookPages = companies.reduce((s, c) => s + getCount(c, "facebookPages"), 0);
  let followUpNow = 0, stale72h = 0;
  for (const c of companies) {
    const fu = c.followUp;
    if (!fu) continue;
    if (computeFollowUpNow(fu)) followUpNow++;
    const isActionable = !!fu.assignedOwner?.id && FOLLOW_UP_ACTIONABLE_STATUSES.has(fu.status);
    if (!isActionable && c.createdAt) {
      const ct = new Date(c.createdAt);
      if (Date.now() - ct.getTime() > 72 * 60 * 60 * 1000) stale72h++;
    }
  }
  let escalationDue = 0, urgentEscalationDue = 0, myDueToday = 0;
  for (const c of companies) {
    if (c.followUpAutomation?.needsEscalation) escalationDue++;
    if (c.followUpAutomation?.needsUrgentEscalation) urgentEscalationDue++;
    if (c.followUpReminder?.isMine && c.followUpReminder?.needsFollowUpToday) myDueToday++;
  }

  return {
    totalCompanies: companies.length,
    activeCompanies,
    connectedFacebookPages,
    followUpNow,
    escalationDue,
    urgentEscalationDue,
    stale72h,
    myDueToday,
  };
}
