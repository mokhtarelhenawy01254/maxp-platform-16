export interface CompanyCount {
  users: number;
  customers: number;
  facebookPages: number;
  installedApps: number;
}

export interface CompanyInstalledApp {
  id: string;
  appName: string;
  appSlug: string;
  category: string;
  status: string;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  website: string | null;
  currency: "EGP" | "USD" | "EUR";
  isActive: boolean;
  createdAt: string;
  _count?: CompanyCount;
  followUp?: FollowUpState;
  followUpReminder?: FollowUpReminder;
  followUpAutomation?: FollowUpAutomation;
  installedApps?: CompanyInstalledApp[];
  installedAppsCount?: number;
}

export interface FollowUpState {
  status: string;
  callStatus: string | null;
  callDuration: number | null;
  lastCallAt: string | null;
  statusMeta: { label: string; className: string };
  assignedOwner: { id: string | null; label: string };
  updatedAt: string | null;
  nextActionAt: string | null;
  lastReminderSentAt: string | null;
  lastEscalatedAt: string | null;
  history: FollowUpHistoryEntry[];
}

export interface FollowUpHistoryEntry {
  id: string;
  status: string;
  occurredAt: string;
  actor: { label: string } | null;
  assignedOwner: { label: string } | null;
  nextActionAt: string | null;
  note: string | null;
}

export interface FollowUpReminder {
  isActionable: boolean;
  badgeClassName: string;
  nextActionLabel: string;
  isMine: boolean;
  needsFollowUpToday: boolean;
}

export interface FollowUpAutomation {
  level: "idle" | "reminder" | "escalation" | "urgent";
  label: string;
  badgeClassName: string;
  description: string;
  needsReminder: boolean;
  needsEscalation: boolean;
  needsUrgentEscalation: boolean;
}

export interface FollowUpOwner {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface FacebookPageResult {
  id: string;
  pageId: string;
  pageName: string;
  isRegistered: boolean;
  company: { name: string } | null;
}

export interface CompanyUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface QuickStats {
  totalCompanies: number;
  activeCompanies: number;
  connectedFacebookPages: number;
  followUpNow: number;
  escalationDue: number;
  urgentEscalationDue: number;
  stale72h: number;
  myDueToday: number;
}

export interface FilterState {
  search: string;
  savedView: string;
  status: string;
  sort: string;
}

export interface CompanyFormData {
  name: string;
  email: string;
  phone: string;
  website: string;
  currency: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
}

export interface FollowUpFormData {
  assignedOwnerId: string;
  status: string;
  callStatus: string;
  callDuration: string;
  nextActionAt: string;
  note: string;
}

export type CompanyModalMode = "create" | "edit";
