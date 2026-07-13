import { apiClient } from "./apiClient";

export type ProductLandingStatus = "DRAFT" | "PUBLISHED" | "PAUSED";

export interface ProductLandingSlice {
  id?: string;
  src: string;
  alt: string;
  prompt?: string;
  historyId?: string;
  width?: number;
  height?: number;
  sortOrder?: number;
}

export interface ProductLandingProduct {
  id: string;
  companyId?: string;
  name: string;
  slug?: string | null;
  price?: number | string | null;
  mainImage?: string | null;
  images?: string[] | string | null;
}

export interface ProductLandingPage {
  id: string;
  companyId: string;
  productId: string;
  slug: string;
  title: string;
  status: ProductLandingStatus;
  generationMode: string;
  generationStatus: string;
  designNotes?: string;
  slices: ProductLandingSlice[];
  formConfig?: {
    orderKicker?: string;
    orderTitle?: string;
    orderCopy?: string;
    buttonLabel?: string;
  };
  visits?: number;
  orders?: number;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  publicPath?: string;
  product?: ProductLandingProduct | null;
}

export interface ProductLandingCreatePayload {
  productId: string;
  title?: string;
  slug?: string;
  designNotes?: string;
  slices?: ProductLandingSlice[];
  status?: ProductLandingStatus;
}

export interface ProductLandingUpdatePayload {
  title?: string;
  slug?: string;
  status?: ProductLandingStatus;
  designNotes?: string;
  slices?: ProductLandingSlice[];
  formConfig?: ProductLandingPage["formConfig"];
}

const getResponseData = <T>(response: unknown, fallback: T): T => {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    response.data &&
    typeof response.data === "object"
  ) {
    const responseData = response.data as { data?: T };
    return responseData.data ?? fallback;
  }

  return fallback;
};

const normalizeArrayPayload = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items as T[];
    if (Array.isArray(record.products)) return record.products as T[];
    if (Array.isArray(record.data)) return record.data as T[];
  }

  return [];
};

export const productLandingPagesService = {
  async list(params: { search?: string; status?: string; productId?: string } = {}) {
    const response = await apiClient.get("/product-landings", { params });
    return getResponseData<ProductLandingPage[]>(response, []);
  },

  async create(payload: ProductLandingCreatePayload) {
    const response = await apiClient.post("/product-landings", payload);
    return getResponseData<ProductLandingPage | null>(response, null);
  },

  async update(id: string, payload: ProductLandingUpdatePayload) {
    const response = await apiClient.put(`/product-landings/${id}`, payload);
    return getResponseData<ProductLandingPage | null>(response, null);
  },

  async updateStatus(id: string, status: ProductLandingStatus) {
    const response = await apiClient.patch(`/product-landings/${id}/status`, {
      status,
    });
    return getResponseData<ProductLandingPage | null>(response, null);
  },

  async listProducts(params: { search?: string; limit?: number } = {}) {
    const response = await apiClient.get("/products", {
      params: {
        search: params.search,
        limit: params.limit || 30,
      },
    });
    const payload = getResponseData<unknown>(response, []);
    return normalizeArrayPayload<ProductLandingProduct>(payload);
  },

};
