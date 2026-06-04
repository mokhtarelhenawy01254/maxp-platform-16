import { apiClient } from "./apiClient";
import { CompanyOnboardingState } from "../utils/companyOnboarding";

type CompanyOnboardingResponse = {
  success: boolean;
  message?: string;
  data: {
    onboarding: CompanyOnboardingState;
    company: {
      id: string;
      name: string;
      slug?: string | null;
      phone?: string | null;
      currency?: string | null;
    };
  };
};

type SlugAvailabilityResponse = {
  success: boolean;
  available: boolean;
  slug?: string;
  suggestion?: string;
  url?: string;
  error?: string;
};

type UpdateSlugResponse = {
  success: boolean;
  message?: string;
  data: {
    company: {
      id: string;
      name: string;
      slug: string;
    };
    url: string;
  };
};

type SaveOnboardingPayload = {
  currentStep?: number;
  markStepCompleted?: string;
  completedSteps?: string[];
  channelsDeferred?: boolean;
  saveMode?: "advance" | "pause";
  profile?: Partial<CompanyOnboardingState["profile"]>;
};

export type CompanyFunnelEventType =
  | "onboarding_started"
  | "onboarding_step_viewed"
  | "activation_viewed"
  | "activation_completed";

type CompanyFunnelEventPayload = {
  type: CompanyFunnelEventType;
  stepId?: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

class CompanyOnboardingService {
  async getOnboarding(): Promise<CompanyOnboardingResponse["data"]> {
    const response =
      await apiClient.get<CompanyOnboardingResponse>("company-dashboard/onboarding");
    return response.data.data;
  }

  async saveProgress(
    payload: SaveOnboardingPayload,
  ): Promise<CompanyOnboardingResponse["data"]> {
    const response = await apiClient.put<CompanyOnboardingResponse>(
      "company-dashboard/onboarding",
      payload,
    );
    return response.data.data;
  }

  async complete(
    payload: SaveOnboardingPayload,
  ): Promise<CompanyOnboardingResponse["data"]> {
    const response = await apiClient.post<CompanyOnboardingResponse>(
      "company-dashboard/onboarding/complete",
      payload,
    );
    return response.data.data;
  }

  async checkSlugAvailability(
    slug: string,
    companyId?: string,
  ): Promise<SlugAvailabilityResponse> {
    const response = await apiClient.get<SlugAvailabilityResponse>(
      "companies/slug/check-availability",
      {
        params: {
          slug,
          ...(companyId ? { companyId } : {}),
        },
        _skipErrorToast: true,
      },
    );

    return response.data;
  }

  async updateCompanySlug(
    companyId: string,
    slug: string,
  ): Promise<UpdateSlugResponse["data"]> {
    const response = await apiClient.put<UpdateSlugResponse>(
      `companies/${companyId}/slug`,
      { slug },
    );

    return response.data.data;
  }

  async trackFunnelEvent(
    payload: CompanyFunnelEventPayload,
  ): Promise<void> {
    await apiClient.post("company-dashboard/funnel-events", payload, {
      headers: {
        "X-Funnel-Event-Type": payload.type,
      },
      _skipErrorToast: true,
    });
  }
}

export const companyOnboardingService = new CompanyOnboardingService();
