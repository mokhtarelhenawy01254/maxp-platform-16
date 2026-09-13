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

export type SectionType =
  | "MEDIA"
  | "TEXT"
  | "HTML"
  | "FORM"
  | "FAQ"
  | "FEATURES"
  | "REVIEWS"
  | "BANNERS"
  | "COUNTDOWN"
  | "COMPARISON"
  | "BREAKDOWN"
  | "GALLERY"
  | "LIVE_PROOF";

export interface LandingSection {
  id: string;
  type: SectionType;
  variant?: string;
  title: string;
  enabled: boolean;
  content: {
    images?: string[];
    mainImage?: string;
    heading?: string;
    subheading?: string;
    bodyText?: string;
    htmlCode?: string;
    orderKicker?: string;
    orderTitle?: string;
    orderCopy?: string;
    buttonLabel?: string;
    faqs?: Array<{ question: string; answer: string }>;
    features?: Array<{ title: string; desc: string; icon: string }>;
    reviews?: Array<{ name: string; text: string; rating: number; avatar?: string }>;
    bannerText?: string;
    bannerBg?: string;
    text?: string;
    timerEndsMinutes?: number;
    lowStockCount?: number;
    comparisonTitle?: string;
    comparisonUsLabel?: string;
    comparisonThemLabel?: string;
    comparisonItems?: Array<{ feature: string; us: string; them: string }>;
    breakdownTitle?: string;
    breakdownItems?: Array<{ title: string; desc: string; icon?: string; tag?: string }>;
    galleryTitle?: string;
    galleryImages?: Array<{ url: string; caption?: string }>;
    recentOrders?: Array<{ buyer: string; city: string; timeAgo: string; item?: string }>;
    satisfactionRate?: string;
  };
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
  sections?: LandingSection[];
  formConfig?: {
    orderKicker?: string;
    orderTitle?: string;
    orderCopy?: string;
    buttonLabel?: string;
    sections?: LandingSection[];
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
  sections?: LandingSection[];
  status?: ProductLandingStatus;
  formConfig?: ProductLandingPage["formConfig"];
}

export interface ProductLandingUpdatePayload {
  title?: string;
  slug?: string;
  status?: ProductLandingStatus;
  designNotes?: string;
  slices?: ProductLandingSlice[];
  sections?: LandingSection[];
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

  async generateAiContent(id: string) {
    const response = await apiClient.post(`/product-landings/${id}/ai-content`);
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

  async delete(id: string) {
    const response = await apiClient.delete(`/product-landings/${id}`);
    return response.data;
  },
};
