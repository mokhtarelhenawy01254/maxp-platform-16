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
  title: string;
  summary: string;
  deliverables: string[];
  outcome?: string;
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
  funnelConfig: ProposalFunnelConfig;
  timeline: ProposalTimelinePhase[];
  packages: ProposalPackage[];
}

export interface PublicProposalData {
  proposal: AgencyProposal;
  agencyInfo: {
    name: string;
    logo?: string | null;
    subdomain?: string;
    customDomain?: string | null;
  };
}
