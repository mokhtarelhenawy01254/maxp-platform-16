export interface CompanyCount {
  users: number;
  customers: number;
  facebookPages: number;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  website: string | null;
  plan: "BASIC" | "PRO" | "ENTERPRISE";
  currency: "EGP" | "USD" | "EUR";
  isActive: boolean;
  createdAt: string;
  _count?: CompanyCount;
  funnelSummary?: FunnelSummary;
  funnelLastActivity?: LastActivity;
  funnelStaleStatus?: StaleStatus;
  funnelAttentionScore?: number;
  funnelIntervention?: InterventionAction;
  followUp?: FollowUpState;
  followUpReminder?: FollowUpReminder;
  followUpAutomation?: FollowUpAutomation;
}

export interface FunnelSummary {
  stageKey: string;
  label: string;
  progressLabel: string;
  hint: string;
  badgeClassName: string;
}

export interface LastActivity {
  label: string;
  relativeLabel: string;
  sortValue: string;
}

export interface StaleStatus {
  label: string;
  badgeClassName: string;
  isPending: boolean;
  needsFollowUpNow: boolean;
  isStale72h: boolean;
}

export interface InterventionAction {
  mode: "details" | "redirect";
  path: string | null;
  label: string;
  hint: string;
}

export interface FollowUpState {
  status: string;
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
  company: { name: string; plan: string } | null;
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
  enterpriseCompanies: number;
  connectedFacebookPages: number;
  activated: number;
  trackedCompanies: number;
  untrackedCompanies: number;
  registeredNoStart: number;
  onboardingInProgress: number;
  activationInProgress: number;
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
  plan: string;
  funnelStage: string;
  sort: string;
}

export interface CompanyFormData {
  name: string;
  email: string;
  phone: string;
  website: string;
  plan: string;
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
  nextActionAt: string;
  note: string;
}

export type CompanyModalMode = "create" | "edit";
