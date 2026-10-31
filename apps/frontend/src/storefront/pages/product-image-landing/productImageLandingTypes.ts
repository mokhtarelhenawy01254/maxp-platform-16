import type { Product } from "../../hooks/useProducts";

export interface LandingSeoMeta {
  title?: string;
  description?: string;
  ogImage?: string;
}

export type LandingSlice = {
  id?: string;
  src: string;
  alt: string;
  prompt?: string;
  width?: number;
  height?: number;
  sortOrder?: number;
};

export type ProductLandingConfig = {
  fallbackProduct?: Product;
  slices: LandingSlice[];
  orderKicker: string;
  orderTitle: string;
  orderCopy: string;
  sections?: any[];
};

export type PublicLandingPage = {
  id: string;
  companyId: string;
  productId: string;
  slug: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "PAUSED";
  generationMode: string;
  generationStatus: string;
  designNotes?: string;
  slices: LandingSlice[];
  sections?: any[];
  formConfig?: {
    orderKicker?: string;
    orderTitle?: string;
    orderCopy?: string;
    buttonLabel?: string;
    sections?: any[];
    bundles?: BundleTier[];
    whatsappSupportPhone?: string;
  };
  visits?: number;
  orders?: number;
  style?: unknown;
  seo?: unknown;
};

export type ProductLandingResponse = {
  landing: PublicLandingPage;
  product: Product;
  company: {
    id: string;
    name?: string;
    slug?: string;
    logo?: string | null;
    currency?: string | null;
    phone?: string | null;
    customDomain?: string | null;
  };
};

export type LandingFormState = {
  customerName: string;
  phone: string;
  governorate: string;
  area: string;
  address: string;
  notes?: string;
  bundleQty?: number;
};

export type BundleItemSelection = {
  color: string;
  size: string;
};

export type AttributeMap = Record<string, string>;

export interface BundleTier {
  qty: number;
  label: string;
  discountPercent: number;
  badge?: string;
  freeGift?: string;
}
