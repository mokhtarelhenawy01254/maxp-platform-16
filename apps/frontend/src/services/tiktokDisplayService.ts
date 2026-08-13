import { apiClient } from "./apiClient";

export interface TikTokVideo {
  id: string;
  title?: string | null;
  coverImageUrl?: string | null;
  duration?: number | null;
  createTime?: string | null;
  embedHtml?: string | null;
}

export interface TikTokDisplaySettings {
  storefrontUsername?: string | null;
  storefrontEnabled: boolean;
}

export interface TikTokDisplayAccountInfo {
  connected: boolean;
  openId?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface TikTokVideoListResult {
  videos: TikTokVideo[];
  cursor?: string | null;
  hasMore: boolean;
}

export async function listVideos(cursor?: string): Promise<TikTokVideoListResult> {
  const response = await apiClient.get<{
    success: boolean;
    data: TikTokVideoListResult;
  }>("/tiktok/display/videos", {
    params: cursor ? { cursor } : undefined,
  });
  const data = response?.data?.data;
  return {
    videos: data?.videos || [],
    cursor: data?.cursor ?? null,
    hasMore: Boolean(data?.hasMore),
  };
}

export async function getEmbedUrl(videoId: string): Promise<string> {
  const response = await apiClient.get<{
    success: boolean;
    data: { videoId: string; embedUrl: string };
  }>(`/tiktok/display/embed/${encodeURIComponent(videoId)}`);
  return response?.data?.data?.embedUrl || "";
}

export async function getDisplaySettings(): Promise<TikTokDisplaySettings> {
  const response = await apiClient.get<{
    success: boolean;
    data: TikTokDisplaySettings;
  }>("/tiktok/display/settings");
  const data = response?.data?.data;
  return {
    storefrontUsername: data?.storefrontUsername ?? null,
    storefrontEnabled: Boolean(data?.storefrontEnabled),
  };
}

export async function saveDisplaySettings(
  payload: Partial<TikTokDisplaySettings>,
): Promise<TikTokDisplaySettings> {
  const response = await apiClient.put<{
    success: boolean;
    data: TikTokDisplaySettings;
  }>("/tiktok/display/settings", payload);
  const data = response?.data?.data;
  return {
    storefrontUsername: data?.storefrontUsername ?? null,
    storefrontEnabled: Boolean(data?.storefrontEnabled),
  };
}

export async function getDisplayAccountInfo(): Promise<TikTokDisplayAccountInfo> {
  const response = await apiClient.get<{
    success: boolean;
    data: TikTokDisplayAccountInfo;
  }>("/tiktok/display/account");
  return (
    response?.data?.data || {
      connected: false,
      openId: null,
      displayName: null,
      avatarUrl: null,
    }
  );
}
