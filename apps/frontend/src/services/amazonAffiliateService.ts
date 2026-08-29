import { apiClient } from "./apiClient";

export interface AmazonMarketplaceOption {
  code: string;
  domain: string;
  label: string;
  labelEn: string;
}

export interface AmazonAffiliateSettings {
  id?: string;
  companyId?: string;
  associateTag?: string;
  marketplace?: string;
  enableBuyButton?: boolean;
  autoSyncEnabled?: boolean;
  dataSource?: string;
  credentialId?: string;
  credentialVersion?: string;
  hasCredentials?: boolean;
  disclosureEnabled?: boolean;
  isEnabled?: boolean;
  marketplaces?: AmazonMarketplaceOption[];
}

export interface AmazonAffiliateProductRow {
  id: string;
  productId: string;
  asin: string;
  amazonUrl?: string | null;
  marketplace: string;
  lastPrice?: number | null;
  lastPriceCurrency: string;
  inStock: boolean;
  lastSyncAt?: string | null;
  status: string;
  syncError?: string | null;
  createdAt?: string;
  product?: {
    id: string;
    name: string;
    price: string | number;
    mainImage?: string | null;
    images?: string | null;
    stock: number;
  } | null;
}

export interface AmazonImportResult {
  ok?: boolean;
  jobId?: string;
  succeeded: number;
  failed: number;
  status: string;
  errors?: string[];
}

export interface AmazonResolvePreview {
  asin: string;
  marketplace: string;
  amazonUrl?: string | null;
  data?: {
    name?: string | null;
    price?: number | null;
    imageUrl?: string | null;
    dataSource?: string | null;
    inStock?: boolean;
  } | null;
}

export async function getAmazonAffiliateSettings(): Promise<AmazonAffiliateSettings | null> {
  const response = await apiClient.get("/amazon-affiliate/settings");
  return response.data?.data ?? null;
}

export async function saveAmazonAffiliateSettings(
  payload: Partial<AmazonAffiliateSettings>
): Promise<AmazonAffiliateSettings> {
  const response = await apiClient.put("/amazon-affiliate/settings", payload);
  return response.data?.data;
}

export async function importAmazonProducts(inputs: string[]): Promise<AmazonImportResult> {
  const response = await apiClient.post("/amazon-affiliate/import", { inputs });
  return response.data?.data;
}

export async function listAmazonProducts(): Promise<AmazonAffiliateProductRow[]> {
  const response = await apiClient.get("/amazon-affiliate/products");
  return response.data?.data || [];
}

export async function syncAmazonProducts(): Promise<AmazonImportResult> {
  const response = await apiClient.post("/amazon-affiliate/sync");
  return response.data?.data;
}

export async function deleteAmazonProduct(id: string): Promise<void> {
  await apiClient.delete(`/amazon-affiliate/products/${id}`);
}

export async function resolveAmazonProduct(
  input: string,
  country?: string
): Promise<AmazonResolvePreview> {
  const response = await apiClient.get("/amazon-affiliate/resolve", {
    params: { input, country },
  });
  return response.data?.data;
}