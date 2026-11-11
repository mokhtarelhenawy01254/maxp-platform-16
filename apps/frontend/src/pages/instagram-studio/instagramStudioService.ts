/**
 * Instagram Studio Service
 *
 * عميل واجهة واحد لكل نداءات /instagram/* — التوكن يُرفق تلقائياً عبر apiClient
 * بنفس سلوك services/facebookAdsService.ts.
 */

import type { AxiosError } from "axios";
import { apiClient } from "../../services/apiClient";

// ============================================
// Types
// ============================================

export interface InstagramTarget {
  igId: string;
  igUsername: string | null;
  pageName: string;
  pageId: string;
}

export interface InstagramMediaItem {
  id: string;
  caption?: string | null;
  media_type?: string | null;
  media_url?: string | null;
  thumbnail_url?: string | null;
  permalink?: string | null;
  timestamp?: string | null;
  like_count?: number | null;
  comments_count?: number | null;
}

export interface InstagramInsightMetrics {
  impressions?: number;
  reach?: number;
  engagement?: number;
  saved?: number;
  [key: string]: number | undefined;
}

export interface InstagramCommentReply {
  id: string;
  text?: string | null;
  username?: string | null;
  timestamp?: string | null;
  like_count?: number | null;
}

export interface InstagramComment {
  id: string;
  text?: string | null;
  username?: string | null;
  timestamp?: string | null;
  like_count?: number | null;
  replies?: { data?: InstagramCommentReply[] } | null;
  hidden?: boolean;
  pendingReply?: boolean;
}

export type InstagramMediaType = "IMAGE" | "REELS" | "VIDEO" | "CAROUSEL";

export interface CarouselItemInput {
  imageUrl?: string;
  videoUrl?: string;
}

export interface PublishPayload {
  igAccountId?: string;
  mediaType: InstagramMediaType;
  imageUrl?: string;
  videoUrl?: string;
  caption?: string;
  isReel?: boolean;
  carouselItems?: CarouselItemInput[];
  timeoutMs?: number;
  intervalMs?: number;
}

export interface PublishResult {
  containerId: string;
  mediaId: string | null;
  permalink: string | null;
}

export interface PublishNowPayload extends Partial<PublishPayload> {
  /** حاوية أُنشئت مسبقاً عبر /publish/container — تُنشر بدون إنشاء حاوية جديدة */
  containerId?: string;
}

export interface ContainerStatus {
  containerId: string;
  status_code: string;
  status: string | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
}

// ============================================
// Helpers
// ============================================

export const extractInstagramError = (error: unknown): string => {
  const axiosError = error as AxiosError<{ error?: string }> | undefined;
  const serverError = axiosError?.response?.data?.error;
  if (typeof serverError === "string" && serverError.trim()) return serverError;
  if (axiosError?.message) return axiosError.message;
  return "تعذر إكمال طلب Instagram";
};

const unwrap = <T>(envelope: ApiEnvelope<T>): T => {
  if (!envelope?.success) throw new Error(envelope?.error || "طلب غير ناجح");
  return envelope.data;
};

// ============================================
// instagram_basic
// ============================================

export const getTargets = async (): Promise<{
  targets: InstagramTarget[];
  noAccountMessage: string | null;
}> => {
  const res = await apiClient.get<
    ApiEnvelope<{ targets: InstagramTarget[]; noAccountMessage: string | null }>
  >("/instagram/targets");
  return unwrap(res.data);
};

export const getMedia = async (params: {
  igAccountId?: string;
  limit?: number;
}): Promise<{
  account: { igId: string; igUsername: string | null; pageName: string };
  media: InstagramMediaItem[];
}> => {
  const res = await apiClient.get<
    ApiEnvelope<{
      account: { igId: string; igUsername: string | null; pageName: string };
      media: InstagramMediaItem[];
      paging: unknown;
    }>
  >("/instagram/media", { params });
  return unwrap(res.data);
};

export const getMediaInsights = async (
  mediaId: string,
  igAccountId?: string,
): Promise<{ mediaId: string; metrics: InstagramInsightMetrics }> => {
  const res = await apiClient.get<
    ApiEnvelope<{ mediaId: string; metrics: InstagramInsightMetrics }>
  >(`/instagram/media/${encodeURIComponent(mediaId)}/insights`, {
    params: { igAccountId },
  });
  return unwrap(res.data);
};

// ============================================
// instagram_manage_comments
// ============================================

export const getComments = async (
  mediaId: string,
  igAccountId?: string,
): Promise<{ mediaId: string; comments: InstagramComment[] }> => {
  const res = await apiClient.get<
    ApiEnvelope<{ mediaId: string; comments: InstagramComment[] }>
  >(`/instagram/media/${encodeURIComponent(mediaId)}/comments`, {
    params: { igAccountId },
  });
  return unwrap(res.data);
};

export const replyToComment = async (
  commentId: string,
  message: string,
  igAccountId?: string,
): Promise<{ id: string | null; text: string }> => {
  const res = await apiClient.post<ApiEnvelope<{ id: string | null; text: string }>>(
    `/instagram/comments/${encodeURIComponent(commentId)}/reply`,
    { message, igAccountId },
  );
  return unwrap(res.data);
};

export const hideComment = async (
  commentId: string,
  hide: boolean,
  igAccountId?: string,
): Promise<{ id: string; hidden: boolean }> => {
  const res = await apiClient.post<ApiEnvelope<{ id: string; hidden: boolean }>>(
    `/instagram/comments/${encodeURIComponent(commentId)}/hide`,
    { hide, igAccountId },
  );
  return unwrap(res.data);
};

export const deleteComment = async (
  commentId: string,
  igAccountId?: string,
): Promise<{ id: string; deleted: boolean }> => {
  const res = await apiClient.delete<ApiEnvelope<{ id: string; deleted: boolean }>>(
    `/instagram/comments/${encodeURIComponent(commentId)}`,
    { params: { igAccountId } },
  );
  return unwrap(res.data);
};

// ============================================
// instagram_content_publish
// ============================================

export const createContainer = async (
  payload: PublishPayload,
): Promise<{ containerId: string; childIds?: string[] }> => {
  const res = await apiClient.post<
    ApiEnvelope<{ containerId: string; childIds?: string[] }>
  >("/instagram/publish/container", payload);
  return unwrap(res.data);
};

export const getContainerStatus = async (
  containerId: string,
  igAccountId?: string,
): Promise<ContainerStatus> => {
  const res = await apiClient.get<ApiEnvelope<ContainerStatus>>(
    `/instagram/publish/${encodeURIComponent(containerId)}/status`,
    { params: { igAccountId } },
  );
  return unwrap(res.data);
};

export const publishNow = async (payload: PublishNowPayload): Promise<PublishResult> => {
  const res = await apiClient.post<ApiEnvelope<PublishResult>>(
    "/instagram/publish/now",
    payload,
  );
  return unwrap(res.data);
};
