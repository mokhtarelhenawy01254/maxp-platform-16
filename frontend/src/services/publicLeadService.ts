import type { AxiosRequestConfig } from "axios";
import { apiClient } from "./apiClient";

export interface PublicLeadPayload {
  companyId?: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  service?: string;
  budgetRange?: string;
  notes?: string;
  source?: string;
  pageSlug?: string;
  landingPath?: string;
  referrer?: string;
  nickname?: string;
  utm?: Record<string, string>;
}

export interface PublicLeadResponse {
  success: boolean;
  message: string;
  data?: {
    customer?: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string | null;
      phone?: string | null;
      companyId: string;
    };
  };
}

export const submitPublicLead = async (
  payload: PublicLeadPayload,
): Promise<PublicLeadResponse> => {
  const silentConfig =
    { _skipErrorToast: true } as unknown as AxiosRequestConfig;

  const response = await apiClient.post<PublicLeadResponse>(
    "public/customers/lead-capture",
    payload,
    silentConfig,
  );

  return response.data;
};
