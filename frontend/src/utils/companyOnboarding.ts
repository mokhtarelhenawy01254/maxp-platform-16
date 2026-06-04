export type CompanyOnboardingStepId =
  | "welcome"
  | "operations"
  | "identity"
  | "integrations";

export interface CompanyOnboardingProfile {
  workspaceName: string;
  industry: string;
  currency: string;
  tone: string;
  whatsappNumber: string;
  phone: string;
}

export interface CompanyOnboardingState {
  version: number;
  status: "in_progress" | "completed";
  currentStep: number;
  nextStepId: CompanyOnboardingStepId | null;
  nextStepNumber: number;
  totalSteps: number;
  completedCount: number;
  completionPct: number;
  needsAttention: boolean;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  completedSteps: CompanyOnboardingStepId[];
  channelsDeferred: boolean;
  profile: CompanyOnboardingProfile;
}

type CompanyLike = {
  onboarding?: CompanyOnboardingState | null;
  sidebarLayout?: string | null;
};

type UserLike = {
  role?: string | null;
  lastLoginAt?: string | null;
  company?: CompanyLike | null;
};

const SYSTEM_ROLES = new Set([
  "SUPER_ADMIN",
  "Project Manager",
  "Team Lead",
  "Developer",
  "Tester",
]);

export const companyNeedsOnboarding = (
  company?: CompanyLike | null,
): boolean => Boolean(company?.onboarding?.needsAttention);

export const isSystemUserRole = (role?: string | null): boolean =>
  Boolean(role && SYSTEM_ROLES.has(role));

export const isFirstLoginCompanyOwner = (user?: UserLike | null): boolean =>
  user?.role === "OWNER" &&
  user?.lastLoginAt === null &&
  Boolean(user?.company);

export const getPostAuthDestination = (user?: UserLike | null): string => {
  if (user?.role === "MERCHANT") {
    return "/merchant-portal";
  }

  if (user?.role === "AFFILIATE") {
    return "/affiliates/dashboard";
  }

  if (isSystemUserRole(user?.role)) {
    return "/super-admin/dev-dashboard";
  }

  if (user?.company?.sidebarLayout === "app-dashboard") {
    return "/apps";
  }

  if (isFirstLoginCompanyOwner(user)) {
    return "/marketplace";
  }

  return companyNeedsOnboarding(user?.company)
    ? "/onboarding"
    : "/company-dashboard";
};
