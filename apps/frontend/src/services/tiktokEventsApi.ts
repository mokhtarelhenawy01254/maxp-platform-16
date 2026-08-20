import { apiClient } from "./apiClient";

export interface TikTokPixelConfig {
  id: string;
  companyId: string;
  pixelId: string;
  pixelName: string | null;
  accessToken: string | null;
  apiEndpoint: string | null;
  testEventCode: string | null;
  isActive: boolean;
  trackPageView: boolean;
  trackViewContent: boolean;
  trackAddToCart: boolean;
  trackInitiateCheckout: boolean;
  trackPurchase: boolean;
  trackSearch: boolean;
  lastTestAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTiktokConfigPayload {
  pixelId: string;
  pixelName?: string;
  accessToken?: string;
  apiEndpoint?: string;
  testEventCode?: string;
  isActive?: boolean;
}

export type UpdateTiktokConfigPayload = Partial<CreateTiktokConfigPayload>;

export interface TikTokEventResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  data?: unknown;
}

export interface TrackTiktokEventPayload {
  eventName: string;
  userData?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  eventId?: string;
}

interface TestTiktokConfigResult {
  result: TikTokEventResult;
  config: TikTokPixelConfig;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const unwrap = <T>(response: { data: ApiEnvelope<T> }, fallback: T): T =>
  response.data?.data ?? fallback;

export async function listTiktokConfigs(): Promise<TikTokPixelConfig[]> {
  const response = await apiClient.get<ApiEnvelope<TikTokPixelConfig[]>>(
    "/tiktok/events/configs",
  );
  return unwrap(response, []);
}

export async function createTiktokConfig(
  payload: CreateTiktokConfigPayload,
): Promise<TikTokPixelConfig> {
  const response = await apiClient.post<ApiEnvelope<TikTokPixelConfig>>(
    "/tiktok/events/configs",
    payload,
  );
  return unwrap(response, {} as TikTokPixelConfig);
}

export async function updateTiktokConfig(
  id: string,
  payload: UpdateTiktokConfigPayload,
): Promise<TikTokPixelConfig> {
  const response = await apiClient.patch<ApiEnvelope<TikTokPixelConfig>>(
    `/tiktok/events/configs/${id}`,
    payload,
  );
  return unwrap(response, {} as TikTokPixelConfig);
}

export async function deleteTiktokConfig(id: string): Promise<TikTokPixelConfig> {
  const response = await apiClient.delete<ApiEnvelope<TikTokPixelConfig>>(
    `/tiktok/events/configs/${id}`,
  );
  return unwrap(response, {} as TikTokPixelConfig);
}

export async function testTiktokConfig(id: string): Promise<TestTiktokConfigResult> {
  const response = await apiClient.post<ApiEnvelope<TestTiktokConfigResult>>(
    `/tiktok/events/configs/${id}/test`,
  );
  return unwrap(response, {
    result: { success: false },
    config: {} as TikTokPixelConfig,
  });
}

export async function trackTiktokEvent(
  payload: TrackTiktokEventPayload,
): Promise<TikTokEventResult> {
  const response = await apiClient.post<ApiEnvelope<TikTokEventResult>>(
    "/tiktok/events/track",
    payload,
  );
  return unwrap(response, { success: false });
}
