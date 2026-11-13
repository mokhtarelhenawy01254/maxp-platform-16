import React from "react";
import { tokenManager } from "../../../utils/tokenManager";

export interface UsageStat {
  usage: number;
  limit: number;
  percentage: number;
  unlimited: boolean;
  warning: boolean;
  exceeded: boolean;
}

export type CompanySettingsMap = Record<string, unknown>;

export type SidebarLayout =
  | "classic"
  | "three-tier"
  | "horizontal"
  | "floating"
  | "minimal"
  | "app-dashboard";

export interface SidebarLayoutOption {
  id: SidebarLayout;
  nameKey: string;
  descriptionKey: string;
}

export const SIDEBAR_LAYOUT_OPTIONS: SidebarLayoutOption[] = [
  {
    id: "classic",
    nameKey: "appDashboard.layoutOptions.classic.name",
    descriptionKey: "appDashboard.layoutOptions.classic.description",
  },
  {
    id: "three-tier",
    nameKey: "appDashboard.layoutOptions.threeTier.name",
    descriptionKey: "appDashboard.layoutOptions.threeTier.description",
  },
  {
    id: "horizontal",
    nameKey: "appDashboard.layoutOptions.horizontal.name",
    descriptionKey: "appDashboard.layoutOptions.horizontal.description",
  },
  {
    id: "floating",
    nameKey: "appDashboard.layoutOptions.floating.name",
    descriptionKey: "appDashboard.layoutOptions.floating.description",
  },
  {
    id: "minimal",
    nameKey: "appDashboard.layoutOptions.minimal.name",
    descriptionKey: "appDashboard.layoutOptions.minimal.description",
  },
  {
    id: "app-dashboard",
    nameKey: "appDashboard.layoutOptions.appDashboard.name",
    descriptionKey: "appDashboard.layoutOptions.appDashboard.description",
  },
];

export const normalizeSidebarLayout = (value: unknown): SidebarLayout =>
  SIDEBAR_LAYOUT_OPTIONS.some((option) => option.id === value)
    ? (value as SidebarLayout)
    : "three-tier";

export type CompanyTab = "general" | "appearance" | "usage" | "ownership";

export interface CompanyRecord {
  id?: string;
  name?: string;
  publicCode?: string | null;
  settings?: CompanySettingsMap | string | null;
  slug?: string;
  currency?: string;
  sidebarLayout?: SidebarLayout | string;
  customDomain?: string | null;
  timezone?: string;
  logo?: string;
  businessSpecialtyId?: string | null;
  businessSpecialty?: {
    id: string;
    slug: string;
    nameAr: string;
    nameEn?: string;
    icon?: string;
  } | null;
}

export interface CompanyUser {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

export interface TabConfig {
  id: CompanyTab;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export const getAccessToken = (): string | null => tokenManager.getAccessToken();

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const parseCompanySettings = (value: unknown): CompanySettingsMap => {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    if (isRecord(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.warn("Failed to parse company settings:", error);
  }

  return {};
};

export const resourceNames: Record<string, string> = {
  users: "المستخدمين",
  customers: "العملاء",
  conversations: "المحادثات",
  products: "المنتجات",
  orders: "الطلبات",
  storage: "التخزين (MB)",
  aiRequests: "طلبات الردود التلقائية",
  emailNotifications: "إشعارات البريد الإلكتروني",
  smsNotifications: "الرسائل النصية",
};
