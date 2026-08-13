import { config } from "../config";
import { apiClient } from "./apiClient";

export interface TikTokCustomerProfile {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  tiktokId: string | null;
  email: string | null;
  phone: string | null;
}

const API_BASE = config.apiUrl.replace(/\/api\/v1\/?$/, "");

export function getTiktokLoginUrl(
  companyId: string,
  redirectPath?: string,
): string {
  const params = new URLSearchParams({ companyId });
  if (redirectPath && redirectPath.startsWith("/")) {
    params.set("redirect", redirectPath);
  }
  return `${API_BASE}/api/v1/tiktok/auth/login?${params.toString()}`;
}

export async function fetchTiktokProfile(): Promise<TikTokCustomerProfile> {
  const response = await apiClient.get<{
    success: boolean;
    data: TikTokCustomerProfile;
  }>("/api/v1/tiktok/auth/me");
  return response.data.data;
}
