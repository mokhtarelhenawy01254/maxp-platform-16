import { apiClient } from "./apiClient";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface TikTokShopOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface TikTokShopOrder {
  orderId: string;
  status: string;
  buyerUsername: string;
  buyerName: string;
  totalAmount: number;
  currency: string;
  createTime: string | null;
  items: TikTokShopOrderItem[];
}

export interface TikTokShopProduct {
  productId: string;
  title: string;
  status: string;
  createTime: string | null;
  skuCount: number;
}

export interface TikTokShopAccountStatus {
  connected: boolean;
  shopId?: string | null;
  shopName?: string | null;
  region?: string | null;
  status?: string | null;
  lastSyncedAt?: string | null;
}

export interface TikTokShopSaveAccountPayload {
  shopId: string;
  appKey: string;
  appSecret: string;
  accessToken: string;
  shopName?: string;
  region?: string;
}

export interface TikTokShopSyncResult<T> {
  data: T[];
  count: number;
}

export const getAccountStatus = async (): Promise<TikTokShopAccountStatus> => {
  const response = await apiClient.get<ApiEnvelope<TikTokShopAccountStatus>>(
    "/tiktok/shop/account",
  );
  return response.data.data;
};

export const saveAccount = async (
  payload: TikTokShopSaveAccountPayload,
): Promise<TikTokShopAccountStatus> => {
  const response = await apiClient.post<ApiEnvelope<TikTokShopAccountStatus>>(
    "/tiktok/shop/account",
    payload,
  );
  return response.data.data;
};

export const syncOrders = async (): Promise<TikTokShopSyncResult<TikTokShopOrder>> => {
  const response = await apiClient.post<
    ApiEnvelope<TikTokShopSyncResult<TikTokShopOrder>>
  >("/tiktok/shop/orders/sync");
  return response.data.data;
};

export const syncProducts = async (): Promise<TikTokShopSyncResult<TikTokShopProduct>> => {
  const response = await apiClient.post<
    ApiEnvelope<TikTokShopSyncResult<TikTokShopProduct>>
  >("/tiktok/shop/products/sync");
  return response.data.data;
};
