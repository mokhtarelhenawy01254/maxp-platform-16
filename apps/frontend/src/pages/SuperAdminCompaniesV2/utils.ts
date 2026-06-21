import type { Company, QuickStats, FunnelSummary, LastActivity, StaleStatus, InterventionAction, FollowUpState, FollowUpReminder, FollowUpAutomation } from "./types";

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

export function getCount(company: Company, key: "users" | "customers" | "facebookPages"): number {
  return company._count?.[key] || 0;
}

export function getPlanMeta(plan: string): { label: string; className: string } {
  switch (plan) {
    case "ENTERPRISE":
      return { label: "مؤسسي", className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300" };
    case "PRO":
      return { label: "احترافي", className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300" };
    case "BASIC":
    default:
      return { label: "أساسي", className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-300" };
  }
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
      case "attention":
        return compareValues(
          a.funnelAttentionScore ?? 0,
          b.funnelAttentionScore ?? 0,
          sortDirection,
        );
      case "lastActivity":
        return compareValues(
          a.funnelLastActivity?.sortValue ?? "",
          b.funnelLastActivity?.sortValue ?? "",
          sortDirection,
        );
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
  getCompaniesFunnelStats,
  getCompaniesFunnelFollowUpStats,
  getCompanyFunnelAttentionScore,
  getCompanyFunnelLastActivity,
  getCompanyFunnelSummary,
  getCompanyFunnelStaleStatus,
  getCompanyInterventionAction,
} from "../../utils/companyFunnelAnalytics";
import {
  getCompaniesFollowUpAutomationStats,
  getCompanyFollowUpState,
  getCompanyFollowUpAutomationState,
  getCompanyFollowUpReminderState,
  getCompaniesFollowUpReminderStats,
} from "../../utils/companyFollowUp";

export function enrichCompanies(companies: Company[], currentAdminId: string | null): Company[] {
  return companies.map((company) => {
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
        currentAdminId: currentAdminId || null,
        staleStatus: funnelStaleStatus,
      }),
      followUpAutomation: getCompanyFollowUpAutomationState(followUp, {
        staleStatus: funnelStaleStatus,
      }),
    };
  });
}

export function computeQuickStats(companies: Company[], currentAdminId: string | null): QuickStats {
  const activeCompanies = companies.filter((c) => c.isActive).length;
  const enterpriseCompanies = companies.filter((c) => c.plan === "ENTERPRISE").length;
  const connectedFacebookPages = companies.reduce((s, c) => s + getCount(c, "facebookPages"), 0);
  const funnelStats = getCompaniesFunnelStats(companies);
  const followUpStats = getCompaniesFunnelFollowUpStats(companies);
  const reminderStats = getCompaniesFollowUpReminderStats(companies, currentAdminId || null);
  const automationStats = getCompaniesFollowUpAutomationStats(companies);

  return {
    ...funnelStats,
    ...followUpStats,
    ...reminderStats,
    ...automationStats,
    totalCompanies: companies.length,
    activeCompanies,
    enterpriseCompanies,
    connectedFacebookPages,
  };
}
