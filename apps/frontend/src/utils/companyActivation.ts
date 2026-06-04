import type { CompanyOnboardingState } from "./companyOnboarding";

export type CompanyActivationStepId =
  | "catalog"
  | "storefront"
  | "channel"
  | "orders";

export interface CompanyActivationStepState {
  id: CompanyActivationStepId;
  done: boolean;
}

export interface CompanyActivationState {
  status: "blocked" | "in_progress" | "activated";
  totalSteps: number;
  completedCount: number;
  completionPct: number;
  needsAttention: boolean;
  nextStepId: CompanyActivationStepId | null;
  steps: CompanyActivationStepState[];
  hasStorefront: boolean;
  hasChannelDecision: boolean;
  hasProducts: boolean;
  hasOrders: boolean;
}

type CompanyLike = {
  slug?: string | null;
  onboarding?: CompanyOnboardingState | null;
};

type CountsLike = {
  products?: number | null;
  orders?: number | null;
};

const ACTIVATION_STEP_ORDER: CompanyActivationStepId[] = [
  "catalog",
  "storefront",
  "channel",
  "orders",
];

export const getCompanyActivationState = (
  company?: CompanyLike | null,
  counts?: CountsLike | null,
): CompanyActivationState => {
  const onboarding = company?.onboarding;
  const onboardingComplete = !onboarding?.needsAttention;
  const hasStorefront = Boolean(company?.slug);
  const completedSteps = onboarding?.completedSteps ?? [];
  const whatsappNumber = onboarding?.profile?.whatsappNumber?.trim() ?? "";
  const hasChannelDecision = Boolean(
    completedSteps.includes("integrations") ||
      onboarding?.channelsDeferred ||
      whatsappNumber,
  );
  const hasProducts = Number(counts?.products ?? 0) > 0;
  const hasOrders = Number(counts?.orders ?? 0) > 0;

  const steps: CompanyActivationStepState[] = [
    { id: "catalog", done: hasProducts },
    { id: "storefront", done: hasStorefront },
    { id: "channel", done: hasChannelDecision },
    { id: "orders", done: hasOrders },
  ];

  const completedCount = steps.filter((step) => step.done).length;
  const totalSteps = steps.length;
  const nextStepId = onboardingComplete
    ? ACTIVATION_STEP_ORDER.find((stepId) =>
        steps.some((step) => step.id === stepId && !step.done),
      ) || null
    : null;
  const status = !onboardingComplete
    ? "blocked"
    : completedCount === totalSteps
      ? "activated"
      : "in_progress";

  return {
    status,
    totalSteps,
    completedCount,
    completionPct: Math.round((completedCount / totalSteps) * 100),
    needsAttention: status === "in_progress",
    nextStepId,
    steps,
    hasStorefront,
    hasChannelDecision,
    hasProducts,
    hasOrders,
  };
};
