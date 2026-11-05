export interface ProposalAuditItem {
  id: string;
  title: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  finding: string;
  impact: string;
  solution: string;
}

export interface ProposalSolutionModule {
  id: string;
  category: string;
  title: string;
  description: string;
}

export interface ProposalFunnelConfig {
  defaultBudget: number;
  minBudget: number;
  maxBudget: number;
  stepBudget: number;
  costPerClick: number;
  leadConversionRate: number;
  showUpRate: number;
  enrollmentRate: number;
  averageCoursePrice: number;
  studentLtvMonths: number;
  monthlyRetentionRate: number;
}

export interface ProposalTimelinePhase {
  phase: string;
  days: string;
  tasks: string[];
  /** What the client holds in hand when this phase ends. */
  handover?: string;
}

/** A concrete stream of work: what we do, exactly what is delivered, and the result. */
export interface ProposalWorkstream {
  id: string;
  /** Ordinal shown in the editorial layout (01, 02…). */
  number?: string;
  category?: string;
  title: string;
  /** Short body copy used by the editorial layout. */
  description?: string;
  summary?: string;
  deliverables: string[];
  tools?: string[];
  outcome?: string;
}

/** One row of the monthly commitment ladder (new vs active students). */
export interface ProposalTargetRow {
  month: string;
  newStudents: number;
  activeStudents: number;
  media: number;
  revenue: number;
}

export interface ProposalTargetEngine {
  name: string;
  detail: string;
  perMonth: number;
}

export interface ProposalTargets {
  headline: string;
  subline?: string;
  note?: string;
  rows: ProposalTargetRow[];
  engines?: ProposalTargetEngine[];
}

/** A paid or organic acquisition channel and its slice of the media budget. */
export interface ProposalChannel {
  name: string;
  role: string;
  share: number;
  budget: number;
  kpi: string;
}

export interface ProposalContentPlan {
  pillars: string[];
  monthly: { label: string; value: string }[];
  production?: string;
}

/** An automated agent: what it does step by step, and what it replaces. */
export interface ProposalAgent {
  name: string;
  job: string;
  steps: string[];
  kpi?: string;
}

export interface ProposalTool {
  name: string;
  purpose: string;
  owner?: string;
}

export interface ProposalPackage {
  id: string;
  name: string;
  tagline: string;
  price: number;
  period: string;
  isPopular?: boolean;
  features: string[];
}

export interface AgencyProposal {
  id: string;
  shareToken: string;
  slug: string;
  clientName: string;
  clientBrand?: string;
  /** Client mark shown on the cover plate (falls back to the client name in type). */
  clientLogo?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  website?: string;
  facebookUrl?: string;
  industry: string;
  title: string;
  executiveSummary: string;
  status: "DRAFT" | "READY" | "SENT" | "VIEWED" | "ACCEPTED";
  currency: string;
  createdAt: string;
  updatedAt: string;
  viewsCount?: number;
  lastViewedAt?: string | null;
  acceptedAt?: string | null;
  acceptedPackageId?: string | null;
  acceptanceNotes?: string;
  acceptorContact?: {
    name: string;
    phone: string;
  };
  auditItems: ProposalAuditItem[];
  solutionModules: ProposalSolutionModule[];
  /** Optional rich scope of work. When absent the page derives it from solutionModules. */
  workstreams?: ProposalWorkstream[];
  /** What the client must provide for the plan to run on time. */
  clientNeeds?: string[];
  /** Target ladder, channels, content plan, agents and tooling — the operating plan. */
  targets?: ProposalTargets;
  channels?: ProposalChannel[];
  contentPlan?: ProposalContentPlan;
  agents?: ProposalAgent[];
  tools?: ProposalTool[];
  /** The ROI simulator is opt-in: only meaningful once real CPC/CPL data exists. */
  showCalculator?: boolean;
  /** One line next to the packages: total outlay, validity, what is not included. */
  commercialNote?: string;
  funnelConfig: ProposalFunnelConfig;
  timeline: ProposalTimelinePhase[];
  packages: ProposalPackage[];
}

export interface PublicProposalData {
  proposal: AgencyProposal;
  agencyInfo: {
    name: string;
    logo?: string | null;
    phone?: string | null;
    subdomain?: string;
    customDomain?: string | null;
  };
}
