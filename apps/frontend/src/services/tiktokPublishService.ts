import { apiClient } from "./apiClient";

export type TikTokPostStatus =
  | "PENDING"
  | "PROCESSING"
  | "PUBLISHED"
  | "FAILED";

export type TikTokPrivacyLevel =
  | "PUBLIC_TO_EVERYONE"
  | "MUTUAL_FOLLOW_FRIENDS"
  | "FOLLOWERS"
  | "SELF_ONLY"
  | "PRIVATE_TO_EVERYONE";

export interface TikTokAccountStatus {
  connected: boolean;
  openId?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  status?: string;
  tokenExpiresAt?: string | null;
}

export interface TikTokPost {
  id: string;
  companyId: string;
  accountId: string;
  videoUrl: string | null;
  caption: string | null;
  publishId: string | null;
  status: TikTokPostStatus;
  errorMessage: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
  account?: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface TikTokPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface TikTokApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  pagination?: TikTokPagination;
}

export interface TikTokPublishPayload {
  videoUrl: string;
  caption?: string;
  privacyLevel?: TikTokPrivacyLevel;
}

export interface TikTokListParams {
  page?: number;
  limit?: number;
  status?: string;
}

export interface TikTokListResult {
  data: TikTokPost[];
  pagination: TikTokPagination;
}

export const getAccountStatus = async (): Promise<TikTokAccountStatus> => {
  const res = await apiClient.get<TikTokApiResponse<TikTokAccountStatus>>(
    "/tiktok/publish/account",
  );
  return res.data.data;
};

export const createPublish = async (
  payload: TikTokPublishPayload,
): Promise<TikTokPost> => {
  const res = await apiClient.post<TikTokApiResponse<TikTokPost>>(
    "/tiktok/publish",
    payload,
  );
  return res.data.data;
};

export const listPosts = async (
  params: TikTokListParams = {},
): Promise<TikTokListResult> => {
  const res = await apiClient.get<TikTokApiResponse<TikTokPost[]>>(
    "/tiktok/publish",
    { params },
  );
  return {
    data: res.data.data,
    pagination: res.data.pagination || {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    },
  };
};

export const getPost = async (id: string): Promise<TikTokPost> => {
  const res = await apiClient.get<TikTokApiResponse<TikTokPost>>(
    `/tiktok/publish/${id}`,
  );
  return res.data.data;
};

export const refreshPost = async (id: string): Promise<TikTokPost> => {
  const res = await apiClient.post<TikTokApiResponse<TikTokPost>>(
    `/tiktok/publish/${id}/refresh`,
  );
  return res.data.data;
};
