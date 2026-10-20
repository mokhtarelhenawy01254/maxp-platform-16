import React from "react";

export type TabId =
  | "sessions"
  | "general"
  | "window-policy"
  | "quick-replies"
  | "business"
  | "privacy"
  | "labels";

export type WhatsAppProvider = "BAILEYS" | "META_CLOUD";

export interface TabDefinition {
  id: TabId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface Session {
  id: string;
  name: string;
  phoneNumber: string | null;
  status: string;
  liveStatus: string;
  qrCode: string | null;
  pairingCode?: string | null;
  autoReply: boolean;
  welcomeMessage: string | null;
  awayMessage: string | null;
  workingHoursEnabled: boolean;
  workingHours: unknown;
  isDefault: boolean;
  loadBalanceWeight?: number;
  createdAt: string;
  provider?: WhatsAppProvider;
  metaPhoneNumberId?: string | null;
  metaWabaId?: string | null;
  metaBusinessId?: string | null;
  metaAccessToken?: string | null;
  metaTokenExpiresAt?: string | null;
  metaWebhookVerifyToken?: string | null;
  metaWebhookSecret?: string | null;
  metaDisplayPhoneNumber?: string | null;
  metaQualityRating?: string | null;
  metaMessagingLimit?: number | null;
  metaApiVersion?: string | null;
  metadata?: string | null;
  callShieldEnabled?: boolean;
  callShieldMessage?: string | null;
  _count: {
    messages: number;
    contacts: number;
  };
  historyImport?: {
    status: string;
    lastProgress?: number | null;
    importedMessages?: number;
    lastError?: string | null;
  } | null;
}

export interface WorkspaceSettings {
  id: string;
  isEnabled: boolean;
  maxSessions: number;
  notificationSound: boolean;
  browserNotifications: boolean;
  maxImageSize: number;
  maxVideoSize: number;
  maxDocumentSize: number;
  autoCompressImages: boolean;
  autoArchiveDays: number | null;
}

export interface QuickReply {
  id: string;
  title: string;
  shortcut: string | null;
  content: string;
  category: string;
  usageCount: number;
  isActive: boolean;
}

export interface BusinessProfileState {
  description: string;
  email: string;
  websites: string[];
  address: string;
  category: string;
}

export interface PrivacySettingsState {
  readReceipts: string;
  profilePhoto: string;
  status: string;
  online: string;
  lastSeen: string;
  groupAdd: string;
}

export interface LabelItem {
  id: string;
  name: string;
  color: string;
  chatCount?: number;
}

export interface DeleteState {
  kind: "session" | "quickReply" | "label";
  id: string;
}

export interface ApiErrorShape {
  response?: {
    data?: {
      error?: string;
    };
  };
}

export interface QuickReplyFormData {
  title: string;
  shortcut: string;
  content: string;
  category: string;
}

export interface LabelFormData {
  name: string;
  color: string;
}

export interface WhatsAppSettingsProps {
  companyId?: string;
  companyName?: string;
  superAdminMode?: boolean;
}

export const providerLabels: Record<WhatsAppProvider, string> = {
  BAILEYS: "ربط الهاتف المباشر (QR)",
  META_CLOUD: "ميتا كلاود الرسمي",
};

export const statusBadgeClasses: Record<string, string> = {
  CONNECTED:
    "border-emerald-300/70 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-200",
  QR_PENDING:
    "border-amber-300/70 bg-amber-500/10 text-amber-800 dark:border-amber-500/40 dark:text-amber-200",
  PAIRING_CODE_PENDING:
    "border-amber-300/70 bg-amber-500/10 text-amber-800 dark:border-amber-500/40 dark:text-amber-200",
  CONNECTING:
    "border-sky-300/70 bg-sky-500/10 text-sky-800 dark:border-sky-500/40 dark:text-sky-200",
  AUTHENTICATING:
    "border-purple-300/70 bg-purple-500/10 text-purple-800 dark:border-purple-500/40 dark:text-purple-200",
  RECONNECTING:
    "border-violet-300/70 bg-violet-500/10 text-violet-800 dark:border-violet-500/40 dark:text-violet-200",
  DISCONNECTED:
    "border-slate-300/70 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:text-slate-200",
};

export const quickReplyCategoryKeys = [
  "general",
  "welcome",
  "thanks",
  "apology",
  "info",
  "order",
] as const;

export const privacyOptionKeys = [
  "all",
  "contacts",
  "contact_blacklist",
  "none",
] as const;

export const businessCategoryKeys = [
  "RETAIL",
  "RESTAURANT",
  "HEALTH",
  "EDUCATION",
  "FINANCE",
  "PROFESSIONAL_SERVICES",
  "OTHER",
] as const;

export const labelPalette = [
  "#25D366",
  "#128C7E",
  "#075E54",
  "#34B7F1",
  "#00A884",
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
];

export const tabsRequiringScopedSession = new Set<TabId>([
  "business",
  "privacy",
  "labels",
]);
