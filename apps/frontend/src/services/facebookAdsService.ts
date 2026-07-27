/**
 * Facebook Ads Service
 *
 * Service للتعامل مع Facebook Ads Management API
 */

import type { AxiosError } from "axios";
import { apiClient } from "./apiClient";

const getAxiosStatus = (error: unknown) =>
  (error as AxiosError | undefined)?.response?.status;
const isNotFoundError = (error: unknown) => getAxiosStatus(error) === 404;
const isBenignAdsSetupError = (error: unknown) =>
  [400, 404].includes(getAxiosStatus(error) || 0);

// ============================================
// Types & Interfaces
// ============================================

export interface FacebookCampaign {
  id: string;
  companyId: string;
  adAccountId?: string;
  name: string;
  objective: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
  configuredStatus?: string;
  effectiveStatus?: string;
  metaAccountId?: string;
  metaAccountName?: string | null;
  facebookCampaignId?: string;
  facebookCreatedTime?: string | null;
  facebookUpdatedTime?: string | null;
  facebookStartTime?: string | null;
  facebookStopTime?: string | null;
  deliveryReadiness?: FacebookCampaignDeliveryReadiness;
  budgetType: "DAILY" | "LIFETIME";
  budgetAmount: number;
  startDate?: string;
  endDate?: string;
  pixelId?: string;
  settings?: unknown;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
  adSets?: FacebookAdSet[];
}

export interface FacebookAdSet {
  id: string;
  campaignId: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
  configuredStatus?: string;
  effectiveStatus?: string;
  facebookAdSetId?: string;
  targeting?: TargetingData;
  ageMin?: number;
  ageMax?: number;
  genders?: string[];
  locations?: string[];
  interests?: string[];
  behaviors?: string[];
  customAudiences?: string[];
  lookalikeAudiences?: string[];
  budgetType: "DAILY" | "LIFETIME";
  budgetAmount: number;
  optimizationGoal?: string;
  billingEvent?: string;
  settings?: unknown;
  createdAt: string;
  updatedAt: string;
  ads?: FacebookAd[];
}

export interface FacebookAd {
  id: string;
  adSetId: string;
  companyId: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
  configuredStatus?: string;
  effectiveStatus?: string;
  facebookAdId?: string;
  creativeType:
    | "SINGLE_IMAGE"
    | "SINGLE_VIDEO"
    | "CAROUSEL"
    | "COLLECTION"
    | "SYNCED_META";
  primaryText: string;
  headline?: string;
  description?: string;
  callToAction?: string;
  imageUrl?: string;
  videoUrl?: string;
  imageHash?: string;
  videoId?: string;
  linkUrl?: string;
  productId?: string;
  creative?: unknown;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
  insights?: FacebookAdInsight[];
}

export interface FacebookCampaignDeliveryReason {
  code: string;
  label: string;
  severity?: "info" | "warning" | "error";
}

export interface FacebookCampaignDeliveryReadiness {
  isDeliverable: boolean;
  status:
    | "DELIVERING"
    | "ACTIVE_NOT_DELIVERING"
    | "WITH_ISSUES"
    | "ACTIVE"
    | "PAUSED"
    | "ARCHIVED"
    | "DELETED"
    | string;
  label: string;
  reasonText?: string;
  reasons: FacebookCampaignDeliveryReason[];
  counts: {
    adSetsTotal: number;
    adSetsActive: number;
    adsTotal: number;
    adsActive: number;
    adsActiveInActiveAdSets: number;
    adSetStatuses: Record<string, number>;
    adStatuses: Record<string, number>;
  };
}

export interface FacebookAdInsight {
  id: string;
  adId: string;
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  spend: number;
  conversions: number;
  cpa: number;
  reach: number;
  frequency: number;
  linkClicks: number;
  costPerLinkClick: number;
  landingPageViews: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
  breakdown?: unknown;
}

export interface FacebookAdsPerformanceTotals {
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  conversions: number;
  purchases: number;
  purchaseValue: number;
  linkClicks: number;
  landingPageViews: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  frequency: number;
}

export interface FacebookAdsPerformanceRecommendation {
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  message: string;
}

export interface FacebookAdsPerformanceSummary {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  adAccount?: FacebookSavedAdAccount | null;
  totals: FacebookAdsPerformanceTotals;
  campaigns: Array<{
    id: string;
    facebookCampaignId?: string;
    name: string;
    objective: string;
    status: string;
    configuredStatus?: string;
    effectiveStatus?: string;
    metaAccountId?: string;
    pixelId?: string;
    adSetsCount: number;
    adsCount: number;
    performanceSource?: "META" | "LOCAL";
    performance: FacebookAdsPerformanceTotals;
  }>;
  recommendations: FacebookAdsPerformanceRecommendation[];
}

export type FacebookGeoPerformanceBreakdown = "country" | "region";
export type FacebookPerformanceBreakdown =
  | "age_gender"
  | "placement"
  | "platform"
  | "device"
  | "country"
  | "region";

export interface FacebookGeoPerformanceRow {
  breakdown: FacebookGeoPerformanceBreakdown;
  key: string;
  label: string;
  metrics: FacebookAdsPerformanceTotals;
  campaignsCount: number;
  campaigns: string[];
}

export interface FacebookGeoPerformanceReport {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  adAccount?: FacebookSavedAdAccount | null;
  breakdown: FacebookGeoPerformanceBreakdown;
  rows: FacebookGeoPerformanceRow[];
  totals: FacebookAdsPerformanceTotals;
  recommendations: FacebookAdsPerformanceRecommendation[];
  meta?: {
    source?: "META";
    rawRows?: number;
    adAccountId?: string;
  };
}

export interface FacebookPerformanceBreakdownRow {
  breakdown: FacebookPerformanceBreakdown;
  key: string;
  label: string;
  metrics: FacebookAdsPerformanceTotals;
  campaignsCount?: number;
  campaigns?: string[];
}

export interface FacebookCampaignPerformanceBreakdown {
  campaignId: string;
  campaignName: string;
  metrics: FacebookAdsPerformanceTotals;
  rows: FacebookPerformanceBreakdownRow[];
}

export interface FacebookPerformanceBreakdownReport {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  adAccount?: FacebookSavedAdAccount | null;
  breakdown: FacebookPerformanceBreakdown;
  dimensions?: string[];
  rows: FacebookPerformanceBreakdownRow[];
  campaigns: FacebookCampaignPerformanceBreakdown[];
  totals: FacebookAdsPerformanceTotals;
  recommendations: FacebookAdsPerformanceRecommendation[];
  meta?: {
    source?: "META";
    rawRows?: number;
    adAccountId?: string;
  };
}

export interface FacebookAdDetailVerdict {
  status: "NO_DATA" | "SCALE" | "FIX" | "WATCH" | "MONITOR" | string;
  label: string;
  tone: "green" | "red" | "amber" | "blue" | "slate" | string;
  reason: string;
}

export interface FacebookAdDecision {
  status:
    | "NO_DATA"
    | "LEARNING"
    | "SCALE"
    | "KILL"
    | "WATCH"
    | "FIX_CREATIVE"
    | "FIX_LANDING"
    | "FIX_TRACKING"
    | "FIX_OFFER"
    | string;
  label: string;
  tone: "green" | "red" | "amber" | "blue" | "slate" | string;
  priority: "HIGH" | "MEDIUM" | "LOW" | string;
  reason: string;
  nextAction: string;
  confidence: {
    score: number;
    level: "HIGH" | "MEDIUM" | "LOW" | string;
  };
  metrics: Partial<FacebookAdsPerformanceTotals> & {
    estimatedCogs?: number;
    estimatedShipping?: number;
    estimatedProfit?: number;
  };
  economics: {
    productId?: string | null;
    productName?: string | null;
    price: number;
    unitCost: number;
    avgShipping: number;
    grossProfitPerPurchase: number;
    breakEvenCpa: number;
    targetCpa: number;
    breakEvenRoas: number;
    targetRoas: number;
    costSource: string;
  };
  attribution: {
    exactOrders: number;
    exactDeliveredOrders: number;
    relatedOrders: number;
    relatedDeliveredOrders: number;
    cancelledOrders: number;
    returnedOrders: number;
  };
  tracking: {
    pixelId?: string | null;
    hasPixel: boolean;
    productLinked: boolean;
    costSource: string;
  };
}

export interface FacebookAdsDecisionSummary {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totals: {
    ads: number;
    statusCounts: Record<string, number>;
  };
  rows: Array<{
    ad: FacebookAd;
    adSet: FacebookAdSet;
    campaign: FacebookCampaign;
    summary: FacebookAdsPerformanceTotals;
    decision: FacebookAdDecision;
  }>;
}

export interface FacebookAdFunnelStep {
  key: string;
  label: string;
  value: number;
  rate: number;
}

export interface FacebookAdFunnelDiagnosis {
  key: string;
  title: string;
  message: string;
  severity: "HIGH" | "MEDIUM" | "LOW" | string;
}

export interface FacebookAdDetailResponse {
  ad: FacebookAd;
  adSet: FacebookAdSet;
  campaign: FacebookCampaign;
  adAccount?: FacebookSavedAdAccount | null;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  previousDateRange: {
    startDate: string;
    endDate: string;
  };
  insights: FacebookAdInsight[];
  summary: FacebookAdsPerformanceTotals;
  previousSummary: FacebookAdsPerformanceTotals;
  adSetSummary: FacebookAdsPerformanceTotals;
  campaignSummary: FacebookAdsPerformanceTotals;
  comparisons: {
    previousPeriod: Record<string, number>;
    adSetAverage: Record<string, number>;
    campaignAverage: Record<string, number>;
  };
  funnel: {
    steps: FacebookAdFunnelStep[];
    diagnosis: FacebookAdFunnelDiagnosis;
  };
  verdict: FacebookAdDetailVerdict;
  decision?: FacebookAdDecision;
  recommendations: FacebookAdsPerformanceRecommendation[];
  siblingAds: Array<{
    id: string;
    name: string;
    status: string;
    effectiveStatus?: string;
    facebookAdId?: string;
    metrics: FacebookAdsPerformanceTotals;
  }>;
  quality: {
    available: boolean;
    source: "META" | "LOCAL" | string;
    metrics?: {
      qualityRanking?: string;
      engagementRateRanking?: string;
      conversionRateRanking?: string;
      qualityScore?: number;
    } | null;
    error?: string | null;
  };
  meta?: {
    performanceSource?: "META" | "LOCAL";
    insightsCount?: number;
    siblingAdsCount?: number;
    fallbackSource?: "LOCAL" | string | null;
    metaInsightError?: string | null;
  };
}

export interface FacebookAdPerformanceBreakdownReport {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  breakdown: FacebookPerformanceBreakdown;
  dimensions?: string[];
  rows: FacebookPerformanceBreakdownRow[];
  totals: FacebookAdsPerformanceTotals;
  recommendations: FacebookAdsPerformanceRecommendation[];
  meta?: {
    source?: "META" | "LOCAL";
    rawRows?: number;
    facebookAdId?: string;
    reason?: string;
  };
}

export interface FacebookCampaignInsightsResponse {
  success: boolean;
  data: FacebookAdsPerformanceTotals;
  performanceSource: "META" | "LOCAL";
  dateRange: {
    startDate: string;
    endDate: string;
  };
  campaign: {
    id: string;
    name: string;
    status: string;
    facebookCampaignId?: string;
    metaAccountId?: string | null;
    adSetsCount: number;
    adsCount: number;
  };
}

export interface FacebookAdsSyncResult {
  data: FacebookCampaign[];
  meta?: {
    structureSyncSkipped?: boolean;
    skippedCampaigns?: Array<{
      id: string;
      name?: string;
      accountId?: string;
    }>;
    syncedAdSets?: number;
    syncedAds?: number;
    structureSyncWarnings?: Array<{
      level: string;
      error?: unknown;
    }>;
  };
  message?: string;
}

export interface FacebookAdsSyncOptions {
  includeStructure?: boolean;
}

export interface TargetingData {
  ageMin?: number;
  ageMax?: number;
  genders?: string[];
  locations?: string[];
  cities?: MetaGeoLocation[];
  regions?: MetaGeoLocation[];
  locationTypes?: Array<"home" | "recent">;
  interests?: string[];
  behaviors?: string[];
  customAudiences?: string[];
  lookalikeAudiences?: string[];
}

export interface MetaGeoLocation {
  key: string;
  name: string;
  type: "country" | "region" | "city" | "subcity" | "neighborhood" | string;
  country_code?: string;
  country_name?: string;
  region?: string;
  region_id?: string | number;
  supports_region?: boolean;
  supports_city?: boolean;
  geo_hierarchy_level?: string;
  geo_hierarchy_name?: string;
  radius?: number;
  distance_unit?: "kilometer" | "mile";
}

export interface SearchGeoLocationsOptions {
  countryCode?: string;
  regionId?: string | number;
  locationTypes?: Array<"region" | "city">;
  limit?: number;
}

export interface FacebookAdAccount {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  timezone_name?: string;
  account_status?: string | number;
  business?: {
    id?: string | null;
    name?: string | null;
  } | null;
  billingHealth?: FacebookAdAccountBillingHealth;
  isSaved?: boolean;
  isActive?: boolean;
}

export interface FacebookAdAccountBillingHealth {
  currency?: string | null;
  business?: {
    id?: string | null;
    name?: string | null;
  } | null;
  accountStatusCode?: string | null;
  accountStatusLabel?: string;
  isAccountUsable?: boolean;
  disableReason?: string | null;
  hasFundingSource?: boolean;
  fundingSourceType?: string | null;
  fundingSourceDisplay?: string | null;
  amountSpent?: number | null;
  amountSpentRaw?: number | null;
  balance?: number | null;
  balanceRaw?: number | null;
  spendCap?: number | null;
  spendCapRaw?: number | null;
  adTrustDsl?: number | null;
  adTrustDslRaw?: number | null;
  warnings?: Array<{
    code: string;
    message: string;
  }>;
}

export interface FacebookSavedAdAccount {
  id: string;
  companyId: string;
  accountId: string;
  name: string;
  currency: string;
  timezone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FacebookAdsBudgetAlertScope = "AD_ACCOUNT" | "CAMPAIGN";
export type FacebookAdsBudgetAlertMetric =
  | "ACCOUNT_BALANCE"
  | "SPEND_CAP_REMAINING"
  | "CAMPAIGN_BUDGET_REMAINING"
  | "CAMPAIGN_FINISHED";

export interface FacebookAdsBudgetAlertObservation {
  available: boolean;
  reason?: string;
  error?: unknown;
  observedValue?: number | null;
  currency?: string;
  targetName?: string;
  targetKind?: string;
  metricLabel?: string;
  isFinished?: boolean;
  metadata?: Record<string, unknown>;
}

export interface FacebookAdsBudgetAlertRule {
  id: string;
  companyId: string;
  adAccountId?: string | null;
  campaignId?: string | null;
  scope: FacebookAdsBudgetAlertScope;
  metric: FacebookAdsBudgetAlertMetric;
  thresholdAmount: number;
  currency: string;
  recipientPhones: string[];
  isEnabled: boolean;
  cooldownMinutes: number;
  lastState: "OK" | "TRIGGERED" | string;
  lastCheckedAt?: string | null;
  lastTriggeredAt?: string | null;
  lastObservedValue?: number | null;
  lastObservedLabel?: string | null;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  adAccount?: Pick<FacebookSavedAdAccount, "id" | "accountId" | "name" | "currency"> | null;
  campaign?: Pick<
    FacebookCampaign,
    "id" | "name" | "budgetType" | "budgetAmount" | "status" | "facebookCampaignId"
  > | null;
  logs?: FacebookAdsBudgetAlertLog[];
}

export interface FacebookAdsBudgetAlertLog {
  id: string;
  ruleId?: string | null;
  companyId: string;
  adAccountId?: string | null;
  campaignId?: string | null;
  metric: FacebookAdsBudgetAlertMetric | string;
  thresholdAmount: number;
  observedValue?: number | null;
  currency: string;
  recipientPhone: string;
  whatsappNotificationLogId?: string | null;
  status: "SENT" | "FAILED" | "PENDING" | "SKIPPED" | string;
  message?: string | null;
  failureReason?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  adAccount?: Pick<FacebookSavedAdAccount, "id" | "accountId" | "name" | "currency"> | null;
  campaign?: Pick<FacebookCampaign, "id" | "name" | "budgetType" | "budgetAmount"> | null;
}

export interface FacebookAdsBudgetAlertPayload {
  adAccountId?: string | null;
  campaignId?: string | null;
  scope: FacebookAdsBudgetAlertScope;
  metric: FacebookAdsBudgetAlertMetric;
  thresholdAmount: number;
  currency?: string;
  recipientPhones: string[];
  isEnabled?: boolean;
  cooldownMinutes?: number;
  settings?: Record<string, unknown>;
}

export interface FacebookPage {
  id: string;
  name: string;
  category?: string;
  access_token?: string;
  source?:
    | "ads_token+company"
    | "ads_token_only"
    | "company_connection_only";
  isAccessibleByAdsToken?: boolean;
  isConnectedToCompany?: boolean;
  isSelectable?: boolean;
  status?:
    | "READY"
    | "ACCESSIBLE_BUT_NOT_CONNECTED"
    | "CONNECTED_BUT_NOT_ACCESSIBLE";
  warning?: string | null;
}

export interface FacebookPixel {
  id: string;
  name: string;
  code?: string;
}

export interface FacebookPagesMeta {
  company?: {
    id: string;
    name: string | null;
  } | null;
  counts?: {
    total: number;
    ready: number;
    accessibleButNotConnected: number;
    connectedButNotAccessible: number;
  };
  permissions?: {
    granted: string[];
    missingRecommended: string[];
  };
  remoteFetchOk?: boolean;
  remoteError?: string | null;
  primaryWarning?: string | null;
}

export interface FacebookPagesResponse {
  data: FacebookPage[];
  meta?: FacebookPagesMeta | null;
}

export interface CreateCampaignData {
  name: string;
  objective: string;
  status?: "ACTIVE" | "PAUSED";
  budgetType: "DAILY" | "LIFETIME";
  budgetAmount: number;
  startDate?: string;
  endDate?: string;
  pixelId?: string;
  adAccountId?: string;
  // الحقول الجديدة
  description?: string;
  specialAdCategories?: string[];
  budgetOptimization?: boolean;
  spendLimit?: number;
  timezone?: string;
  buyingType?: string;
  bidStrategy?: string;
}

export interface CreateAdSetData {
  name: string;
  status?: "ACTIVE" | "PAUSED";
  targeting?: TargetingData;
  ageMin?: number;
  ageMax?: number;
  genders?: string[];
  locations?: string[];
  interests?: string[];
  behaviors?: string[];
  budgetType: "DAILY" | "LIFETIME";
  budgetAmount: number;
  optimizationGoal?: string;
  billingEvent?: string;
}

export interface CreateAdData {
  adSetId: string;
  name: string;
  status?: "ACTIVE" | "PAUSED";
  creativeType: "SINGLE_IMAGE" | "SINGLE_VIDEO" | "CAROUSEL" | "COLLECTION";
  primaryText: string;
  headline?: string;
  description?: string;
  callToAction?: string;
  imageUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
  productId?: string;
}

/**
 * 🚀 Full Ad Creation Data
 * بيانات إنشاء إعلان كامل (Campaign + AdSet + Ad)
 */
export interface CreateFullAdData {
  adAccountId?: string;
  clientRequestId?: string;
  idempotencyKey?: string;
  allowActivePublish?: boolean;
  activePublishConfirmationToken?: string;

  // Campaign Data
  campaignName: string;
  objective: string;
  specialAdCategories?: string[];
  buyingType?: "AUCTION" | "RESERVED";

  // Ad Set Level
  performanceGoal?: string;
  conversionEvent?: string;
  conversionLocation?: string;
  attributionWindow?: string;
  dynamicCreative?: boolean;
  pixelId?: string;

  // Budget Data
  budgetOptimization?: boolean; // CBO
  budgetType?: "DAILY" | "LIFETIME";
  budgetAmount: number;
  bidStrategy?: string;
  bidValue?: number;
  frequencyCap?: number;
  frequencyCapInterval?: string;
  spendLimit?: number;

  // Schedule Data
  startTime?: string;
  endTime?: string;

  // AdSet Data
  adSetName?: string;
  optimizationGoal?: string;
  billingEvent?: string;

  // Targeting Data
  targeting?: {
    ageMin?: number;
    ageMax?: number;
    genders?: string[];
    locations?: string[];
    cities?: MetaGeoLocation[];
    regions?: MetaGeoLocation[];
    locationTypes?: Array<"home" | "recent">;
    interests?: unknown[];
    behaviors?: unknown[];
    relationshipStatuses?: number[];
    locales?: number[];
    devices?: {
      platforms?: string[];
      deviceTypes?: string[];
    };
    customAudiences?: string[];
    lookalikeAudiences?: string[];
    excludedAudiences?: string[];
    education?: {
      statuses?: number[];
    };
    advantageAudience?: boolean;
    targetingExpansion?: boolean;
  };

  // Placements Data
  placementType?: "AUTOMATIC" | "MANUAL";
  placements?: string[];

  // Ad Creative Data
  adName?: string;
  pageId: string;
  creativeType?: "SINGLE_IMAGE" | "SINGLE_VIDEO" | "CAROUSEL" | "FLEXIBLE";
  primaryText: string;
  headline?: string;
  description?: string;
  callToAction?: string;
  linkUrl: string;
  productId?: string;
  displayLink?: string;
  urlParameters?: string;
  imageUrl?: string;
  imageHash?: string;
  videoUrl?: string;
  videoId?: string;
  carouselCards?: Array<{
    id: string;
    imageUrl?: string;
    imageHash?: string;
    headline: string;
    description?: string;
    linkUrl: string;
  }>;
  flexibleAssets?: Array<{ id: string; type: "IMAGE" | "VIDEO"; url: string }>;
  textVariations?: Array<{ id: string; text: string }>;
  headlineVariations?: Array<{ id: string; text: string }>;
  useLeadForm?: boolean;
  leadFormId?: string;

  // Advantage+ Creative Enhancements (v22.0)
  advantageCreative?: boolean;
  textGeneration?: boolean;
  imageEnhancement?: boolean;
  musicEnhancement?: boolean;
  imageTemplates?: boolean;
  videoHighlight?: boolean;
  textOptimizations?: boolean;

  // Status
  status?: "ACTIVE" | "PAUSED";
}

export interface FullAdResult {
  success: boolean;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  creativeId?: string;
  error?: string;
  errorCode?: string;
  step?: string;
  partialSuccess?: boolean;
  warning?: string;
  facebookIds?: {
    campaignId: string;
    adSetId: string;
    adId: string;
    creativeId: string;
  };
  idempotency?: {
    clientRequestId?: string;
    reused?: boolean;
    status?: string;
  };
  data?: {
    campaign: unknown;
    adSet: unknown;
    ad: unknown;
    facebookIds: {
      campaignId: string;
      adSetId: string;
      adId: string;
      creativeId: string;
    };
  };
}

export interface ProductLaunchMetadata {
  sourceUrl: string;
  productApiUrl: string;
  storeSlug?: string | null;
  productSlug: string;
  id?: string;
  name: string;
  description?: string;
  sku?: string | null;
  price?: number | null;
  comparePrice?: number | null;
  category?: string | null;
  isActive: boolean;
  isHidden: boolean;
  stock?: number | null;
  trackInventory?: boolean;
  mainImage?: string | null;
  imageUrls: string[];
  imageCount: number;
  carouselCardLimit: number;
}

// ============================================
// Service Functions
// ============================================

/**
 * 🚀 إنشاء إعلان كامل (Campaign + AdSet + Ad)
 * هذه الدالة الرئيسية لإنشاء إعلان من الـ Wizard
 */
export const createFullAd = async (
  data: CreateFullAdData,
): Promise<FullAdResult> => {
  try {
    const response = await apiClient.post<FullAdResult>("/facebook-ads/full-ad", data, {
      timeout: 90000,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("❌ Error creating full ad:", error);
    throw error;
  }
};

export const getProductLaunchMetadata = async (
  productUrl: string,
): Promise<ProductLaunchMetadata> => {
  try {
    const response = await apiClient.get<{ data: ProductLaunchMetadata }>("/facebook-ads/product-launch/metadata", {
      params: { url: productUrl },
    });
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error loading product launch metadata:", error);
    throw error;
  }
};

/**
 * جلب جميع الحملات
 */
export const getCampaigns = async (
  adAccountId?: string,
): Promise<FacebookCampaign[]> => {
  try {
    const response = await apiClient.get("/facebook-ads/campaigns", {
      params: adAccountId ? { adAccountId } : undefined,
    });
    return response.data.data || [];
  } catch (error: unknown) {
    console.error("❌ Error fetching campaigns:", error);
    throw error;
  }
};

/**
 * جلب حملة واحدة
 */
export const getCampaign = async (id: string): Promise<FacebookCampaign> => {
  try {
    const response = await apiClient.get(`/facebook-ads/campaigns/${id}`);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error fetching campaign:", error);
    throw error;
  }
};

/**
 * إنشاء حملة جديدة
 */
export const createCampaign = async (
  data: CreateCampaignData,
): Promise<FacebookCampaign> => {
  try {
    const response = await apiClient.post("/facebook-ads/campaigns", data);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating campaign:", error);
    throw error;
  }
};

/**
 * تحديث حملة
 */
export const updateCampaign = async (
  id: string,
  data: Partial<CreateCampaignData>,
): Promise<FacebookCampaign> => {
  try {
    const response = await apiClient.put(`/facebook-ads/campaigns/${id}`, data);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error updating campaign:", error);
    throw error;
  }
};

/**
 * حذف حملة
 */
export const deleteCampaign = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/facebook-ads/campaigns/${id}`);
  } catch (error: unknown) {
    console.error("❌ Error deleting campaign:", error);
    throw error;
  }
};

/**
 * إيقاف حملة
 */
export const pauseCampaign = async (id: string): Promise<FacebookCampaign> => {
  try {
    const response = await apiClient.post(
      `/facebook-ads/campaigns/${id}/pause`,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error pausing campaign:", error);
    throw error;
  }
};

/**
 * استئناف حملة
 */
export const resumeCampaign = async (id: string): Promise<FacebookCampaign> => {
  try {
    const response = await apiClient.post(
      `/facebook-ads/campaigns/${id}/resume`,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error resuming campaign:", error);
    throw error;
  }
};

/**
 * جلب Ad Accounts المتاحة
 */
export const getAdAccounts = async (): Promise<FacebookAdAccount[]> => {
  try {
    const response = await apiClient.get("/facebook-ads/ad-accounts");
    return response.data.data || [];
  } catch (error: unknown) {
    if (isBenignAdsSetupError(error)) {
      return [];
    }
    throw error;
  }
};

// ============================================
// Campaign Objectives (v22.0 Simplified)
// ============================================

export const CAMPAIGN_OBJECTIVES = [
  {
    value: "OUTCOME_AWARENESS",
    label: "الوعي",
    description: "زيادة الوعي بعلامتك التجارية والوصول لأكبر عدد",
    icon: "👁️",
  },
  {
    value: "OUTCOME_TRAFFIC",
    label: "الزيارات",
    description: "زيادة عدد الزوار لموقعك أو تطبيقك",
    icon: "🔗",
  },
  {
    value: "OUTCOME_ENGAGEMENT",
    label: "التفاعل",
    description: "زيادة التفاعل مع المحتوى والرسائل",
    icon: "💬",
  },
  {
    value: "OUTCOME_LEADS",
    label: "العملاء المحتملين",
    description: "جمع معلومات العملاء المحتملين",
    icon: "📋",
  },
  {
    value: "OUTCOME_APP_PROMOTION",
    label: "ترويج التطبيق",
    description: "زيادة تثبيت واستخدام التطبيق",
    icon: "📱",
  },
  {
    value: "OUTCOME_SALES",
    label: "المبيعات",
    description: "زيادة المبيعات والتحويلات على موقعك",
    icon: "🛒",
  },
] as const;

// v22.0: Objective Mapping (Legacy -> Simplified)
export const OBJECTIVE_MAPPING: Record<string, string> = {
  LINK_CLICKS: "OUTCOME_TRAFFIC",
  CONVERSIONS: "OUTCOME_SALES",
  LEAD_GENERATION: "OUTCOME_LEADS",
  BRAND_AWARENESS: "OUTCOME_AWARENESS",
  REACH: "OUTCOME_AWARENESS",
  VIDEO_VIEWS: "OUTCOME_ENGAGEMENT",
  POST_ENGAGEMENT: "OUTCOME_ENGAGEMENT",
  PAGE_LIKES: "OUTCOME_ENGAGEMENT",
  APP_INSTALLS: "OUTCOME_APP_PROMOTION",
  MESSAGES: "OUTCOME_ENGAGEMENT",
  CATALOG_SALES: "OUTCOME_SALES",
  STORE_VISITS: "OUTCOME_TRAFFIC",
};

// ============================================
// Call to Action Types (v22.0)
// ============================================

export const CALL_TO_ACTION_TYPES = [
  { value: "LEARN_MORE", label: "اعرف المزيد" },
  { value: "SHOP_NOW", label: "تسوق الآن" },
  { value: "SIGN_UP", label: "سجل الآن" },
  { value: "DOWNLOAD", label: "تحميل" },
  { value: "BOOK_TRAVEL", label: "احجز الآن" },
  { value: "CONTACT_US", label: "اتصل بنا" },
  { value: "GET_QUOTE", label: "احصل على عرض سعر" },
  { value: "SUBSCRIBE", label: "اشترك" },
  { value: "GET_OFFER", label: "احصل على العرض" },
  { value: "SEND_MESSAGE", label: "أرسل رسالة" },
  { value: "WHATSAPP_MESSAGE", label: "راسلنا على واتساب" },
  { value: "CALL_NOW", label: "اتصل الآن" },
  { value: "APPLY_NOW", label: "قدم الآن" },
  { value: "BUY_NOW", label: "اشتري الآن" },
  { value: "ORDER_NOW", label: "اطلب الآن" },
  { value: "WATCH_MORE", label: "شاهد المزيد" },
] as const;

// ============================================
// v22.0: Advantage+ Creative Enhancements
// ============================================

export const ADVANTAGE_CREATIVE_ENHANCEMENTS = [
  {
    value: "text_generation",
    label: "توليد النصوص",
    description: "إنشاء نسخ إعلانية متنوعة تلقائياً",
  },
  {
    value: "text_optimizations",
    label: "تحسين النصوص",
    description: "تحسين النصوص الحالية تلقائياً",
  },
  {
    value: "image_enhancement",
    label: "تحسين الصور",
    description: "قص وتعديل الصور تلقائياً",
  },
  {
    value: "image_templates",
    label: "قوالب الصور",
    description: "إضافة إطارات وتأثيرات",
  },
  {
    value: "video_highlight",
    label: "مقاطع الفيديو",
    description: "قص أفضل اللحظات تلقائياً",
  },
  {
    value: "music",
    label: "الموسيقى",
    description: "إضافة موسيقى خلفية للفيديو",
  },
] as const;

// ============================================
// v22.0: Optimization Goals
// ============================================

export const OPTIMIZATION_GOALS = [
  {
    value: "LINK_CLICKS",
    label: "نقرات الرابط",
    objectives: ["OUTCOME_TRAFFIC"],
  },
  {
    value: "LANDING_PAGE_VIEWS",
    label: "مشاهدات صفحة الهبوط",
    objectives: ["OUTCOME_TRAFFIC"],
  },
  {
    value: "IMPRESSIONS",
    label: "مرات الظهور",
    objectives: ["OUTCOME_AWARENESS"],
  },
  { value: "REACH", label: "الوصول", objectives: ["OUTCOME_AWARENESS"] },
  {
    value: "THRUPLAY",
    label: "مشاهدات الفيديو",
    objectives: ["OUTCOME_ENGAGEMENT"],
  },
  {
    value: "POST_ENGAGEMENT",
    label: "التفاعل مع المنشور",
    objectives: ["OUTCOME_ENGAGEMENT"],
  },
  {
    value: "LEAD_GENERATION",
    label: "توليد العملاء",
    objectives: ["OUTCOME_LEADS"],
  },
  {
    value: "QUALITY_LEAD",
    label: "عملاء محتملين جودة",
    objectives: ["OUTCOME_LEADS"],
  },
  {
    value: "OFFSITE_CONVERSIONS",
    label: "التحويلات",
    objectives: ["OUTCOME_SALES"],
  },
  { value: "VALUE", label: "قيمة التحويلات", objectives: ["OUTCOME_SALES"] },
  {
    value: "APP_INSTALLS",
    label: "تثبيت التطبيق",
    objectives: ["OUTCOME_APP_PROMOTION"],
  },
] as const;

/**
 * ============================================
 * AdSet Functions
 * ============================================
 */

/**
 * جلب AdSets في حملة
 */
export const getAdSets = async (
  campaignId: string,
): Promise<FacebookAdSet[]> => {
  try {
    const response = await apiClient.get(
      `/facebook-ads/campaigns/${campaignId}/adsets`,
    );
    return response.data.data || [];
  } catch (error: unknown) {
    console.error("❌ Error fetching AdSets:", error);
    throw error;
  }
};

/**
 * إنشاء AdSet جديد
 */
export const createAdSet = async (
  campaignId: string,
  data: CreateAdSetData,
): Promise<FacebookAdSet> => {
  try {
    const response = await apiClient.post(
      `/facebook-ads/campaigns/${campaignId}/adsets`,
      data,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating AdSet:", error);
    throw error;
  }
};

/**
 * حذف AdSet
 */
export const deleteAdSet = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/facebook-ads/adsets/${id}`);
  } catch (error: unknown) {
    console.error("❌ Error deleting AdSet:", error);
    throw error;
  }
};

/**
 * ============================================
 * Ads Functions
 * ============================================
 */

/**
 * جلب الإعلانات في AdSet
 */
export const getAds = async (adSetId: string): Promise<FacebookAd[]> => {
  try {
    const response = await apiClient.get(`/facebook-ads/adsets/${adSetId}/ads`);
    return response.data.data || [];
  } catch (error: unknown) {
    console.error("❌ Error fetching Ads:", error);
    throw error;
  }
};

/**
 * إنشاء إعلان جديد
 */
export const createAd = async (
  adSetId: string,
  data: CreateAdData,
): Promise<FacebookAd> => {
  try {
    const response = await apiClient.post(
      `/facebook-ads/adsets/${adSetId}/ads`,
      data,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating Ad:", error);
    throw error;
  }
};

/**
 * تحديث إعلان
 */
export const updateAd = async (
  id: string,
  data: Partial<CreateAdData>,
): Promise<FacebookAd> => {
  try {
    const response = await apiClient.put(`/facebook-ads/ads/${id}`, data);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error updating Ad:", error);
    throw error;
  }
};

/**
 * حذف إعلان
 */
export const deleteAd = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/facebook-ads/ads/${id}`);
  } catch (error: unknown) {
    console.error("❌ Error deleting Ad:", error);
    throw error;
  }
};

/**
 * ============================================
 * Insights Functions
 * ============================================
 */

/**
 * جلب إحصائيات إعلان
 */
export const getAdInsights = async (
  adId: string,
  startDate?: string,
  endDate?: string,
): Promise<FacebookAdInsight[]> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await apiClient.get(
      `/facebook-ads/ads/${adId}/insights?${params.toString()}`,
    );
    return response.data.data || [];
  } catch (error: unknown) {
    console.error("❌ Error fetching Ad insights:", error);
    throw error;
  }
};

/**
 * جلب تفاصيل وتشخيص إعلان فردي
 */
export const getAdDetails = async (
  adId: string,
  startDate?: string,
  endDate?: string,
): Promise<FacebookAdDetailResponse> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const query = params.toString();
    const response = await apiClient.get(
      `/facebook-ads/ads/${adId}/details${query ? `?${query}` : ""}`,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error fetching Ad details:", error);
    throw error;
  }
};

/**
 * جلب breakdowns تفصيلية لإعلان فردي
 */
export const getAdPerformanceBreakdown = async ({
  adId,
  startDate,
  endDate,
  breakdown = "age_gender",
}: {
  adId: string;
  startDate?: string;
  endDate?: string;
  breakdown?: FacebookPerformanceBreakdown;
}): Promise<FacebookAdPerformanceBreakdownReport> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    params.append("breakdown", breakdown);

    const response = await apiClient.get(
      `/facebook-ads/ads/${adId}/performance-breakdown?${params.toString()}`,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error fetching Ad performance breakdown:", error);
    throw error;
  }
};

/**
 * مزامنة إحصائيات إعلان من Facebook
 */
export const syncAdInsights = async (
  adId: string,
  startDate?: string,
  endDate?: string,
): Promise<FacebookAdInsight[]> => {
  try {
    const response = await apiClient.post(
      `/facebook-ads/ads/${adId}/sync-insights`,
      { startDate, endDate },
    );
    return response.data.data || [];
  } catch (error: unknown) {
    console.error("❌ Error syncing Ad insights:", error);
    throw error;
  }
};

/**
 * جلب إحصائيات حملة (مجمعة)
 */
export const getCampaignInsights = async (
  campaignId: string,
  startDate?: string,
  endDate?: string,
): Promise<FacebookCampaignInsightsResponse> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await apiClient.get(
      `/facebook-ads/campaigns/${campaignId}/insights${
        params.toString() ? `?${params.toString()}` : ""
      }`,
    );
    return response.data;
  } catch (error: unknown) {
    console.error("❌ Error fetching campaign insights:", error);
    throw error;
  }
};

/**
 * جلب ملخص أداء الحملات مع توصيات تحسين
 */
const LONG_TIMEOUT = 55000;

export const getAdsPerformanceSummary = async (
  startDate?: string,
  endDate?: string,
  adAccountId?: string,
): Promise<FacebookAdsPerformanceSummary> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (adAccountId) params.append("adAccountId", adAccountId);

    const query = params.toString();
    const response = await apiClient.get(
      `/facebook-ads/reports/performance-summary${query ? `?${query}` : ""}`,
      { timeout: LONG_TIMEOUT },
    );

    return (response.data as any).data;
  } catch (error: unknown) {
    console.error("❌ Error fetching Ads performance summary:", error);
    throw error;
  }
};

export const getAdsDecisionSummary = async (
  startDate?: string,
  endDate?: string,
  adAccountId?: string,
): Promise<FacebookAdsDecisionSummary> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (adAccountId) params.append("adAccountId", adAccountId);

    const query = params.toString();
    const response = await apiClient.get(
      `/facebook-ads/reports/decision-summary${query ? `?${query}` : ""}`,
      { timeout: LONG_TIMEOUT },
    );

    return (response.data as any).data;
  } catch (error: unknown) {
    console.error("❌ Error fetching Ads decision summary:", error);
    throw error;
  }
};

export const getGeoPerformanceReport = async ({
  startDate,
  endDate,
  adAccountId,
  breakdown = "region",
}: {
  startDate?: string;
  endDate?: string;
  adAccountId?: string;
  breakdown?: FacebookGeoPerformanceBreakdown;
}): Promise<FacebookGeoPerformanceReport> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (adAccountId) params.append("adAccountId", adAccountId);
    params.append("breakdown", breakdown);

    const response = (await apiClient.get(
      `/facebook-ads/reports/geo-performance?${params.toString()}`,
    )) as { data: { data: FacebookGeoPerformanceReport } };

    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error fetching geo performance report:", error);
    throw error;
  }
};

export const getPerformanceBreakdownReport = async ({
  startDate,
  endDate,
  adAccountId,
  breakdown = "age_gender",
}: {
  startDate?: string;
  endDate?: string;
  adAccountId?: string;
  breakdown?: FacebookPerformanceBreakdown;
}): Promise<FacebookPerformanceBreakdownReport> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (adAccountId) params.append("adAccountId", adAccountId);
    params.append("breakdown", breakdown);

    const response = (await apiClient.get(
      `/facebook-ads/reports/performance-breakdown?${params.toString()}`,
    )) as { data: { data: FacebookPerformanceBreakdownReport } };

    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error fetching performance breakdown report:", error);
    throw error;
  }
};

/**
 * ============================================
 * Sync Functions
 * ============================================
 */

/**
 * مزامنة الحملات من Facebook
 */
export const syncFromFacebook = async (
  adAccountId?: string,
  options: FacebookAdsSyncOptions = {},
): Promise<FacebookAdsSyncResult> => {
  try {
    const response = await apiClient.post(
      "/facebook-ads/sync",
      {
        adAccountId,
        includeStructure: options.includeStructure ?? true,
      },
      {
        timeout: options.includeStructure === false ? 60000 : 120000,
      },
    );
    return {
      data: response.data.data || [],
      meta: response.data.meta,
      message: response.data.message,
    };
  } catch (error: unknown) {
    console.error("❌ Error syncing from Facebook:", error);
    throw error;
  }
};

/**
 * حفظ Ad Account
 */
export const saveAdAccount = async (data: {
  accountId: string;
  name: string;
  currency?: string;
  timezone?: string;
}): Promise<FacebookSavedAdAccount> => {
  try {
    const response = await apiClient.post(
      "/facebook-ads/ad-accounts/save",
      data,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error saving Ad Account:", error);
    throw error;
  }
};

/**
 * جلب Ad Accounts المحفوظة
 */
export const getSavedAdAccounts = async (): Promise<FacebookSavedAdAccount[]> => {
  try {
    const response = await apiClient.get("/facebook-ads/saved-ad-accounts");
    return response.data.data || [];
  } catch (error: unknown) {
    console.error("❌ Error fetching saved Ad Accounts:", error);
    throw error;
  }
};

export const getBudgetAlertRules = async (): Promise<FacebookAdsBudgetAlertRule[]> => {
  const response = await apiClient.get("/facebook-ads/budget-alert-rules");
  return response.data.data || [];
};

export const createBudgetAlertRule = async (
  payload: FacebookAdsBudgetAlertPayload,
): Promise<FacebookAdsBudgetAlertRule> => {
  const response = await apiClient.post("/facebook-ads/budget-alert-rules", payload);
  return response.data.data;
};

export const updateBudgetAlertRule = async (
  id: string,
  payload: FacebookAdsBudgetAlertPayload,
): Promise<FacebookAdsBudgetAlertRule> => {
  const response = await apiClient.put(`/facebook-ads/budget-alert-rules/${id}`, payload);
  return response.data.data;
};

export const deleteBudgetAlertRule = async (id: string): Promise<void> => {
  await apiClient.delete(`/facebook-ads/budget-alert-rules/${id}`);
};

export const testBudgetAlertRule = async (id: string) => {
  const response = await apiClient.post(`/facebook-ads/budget-alert-rules/${id}/test`);
  return response.data.data;
};

export const previewBudgetAlertRule = async (payload: FacebookAdsBudgetAlertPayload) => {
  const response = await apiClient.post("/facebook-ads/budget-alert-rules/preview", payload);
  return response.data.data as {
    observation: FacebookAdsBudgetAlertObservation;
    wouldTrigger: boolean;
    message?: string | null;
  };
};

export const runBudgetAlertRulesNow = async () => {
  const response = await apiClient.post("/facebook-ads/budget-alert-rules/run");
  return response.data.data;
};

export const getBudgetAlertLogs = async (
  limit = 30,
): Promise<FacebookAdsBudgetAlertLog[]> => {
  const response = await apiClient.get("/facebook-ads/budget-alert-logs", {
    params: { limit },
  });
  return response.data.data || [];
};

// ============================================
// Audiences Types
// ============================================

export interface FacebookCustomAudience {
  id: string;
  companyId: string;
  adAccountId?: string;
  name: string;
  description?: string;
  audienceType:
    | "CUSTOMER_LIST"
    | "WEBSITE"
    | "ENGAGEMENT"
    | "APP_ACTIVITY"
    | "VIDEO_VIEW";
  facebookAudienceId?: string;
  customerListId?: string;
  matchRate?: number;
  pixelId?: string;
  eventType?: string;
  retentionDays?: number;
  engagementType?: string;
  videoId?: string;
  videoViewDuration?: number;
  status: "ACTIVE" | "DELETED";
  audienceSize?: number;
  createdAt: string;
  updatedAt: string;
  lookalikeAudiences?: FacebookLookalikeAudience[];
}

export interface FacebookLookalikeAudience {
  id: string;
  companyId: string;
  adAccountId?: string;
  sourceAudienceId: string;
  sourceAudience?: FacebookCustomAudience;
  name: string;
  description?: string;
  facebookAudienceId?: string;
  country: string;
  ratio: number; // 1-10
  status: "ACTIVE" | "DELETED";
  audienceSize?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomAudienceData {
  name: string;
  description?: string;
  audienceType: "CUSTOMER_LIST" | "WEBSITE" | "ENGAGEMENT";
  adAccountId?: string;
  // Customer List
  customerList?: Array<{
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  }>;
  customerListId?: string;
  // Website
  pixelId?: string;
  eventType?: string;
  retentionDays?: number;
  // Engagement
  engagementType?: string;
}

export interface CreateLookalikeAudienceData {
  name: string;
  description?: string;
  sourceAudienceId: string;
  country: string;
  ratio: number; // 1-10
  adAccountId?: string;
}

// ============================================
// Audiences Functions
// ============================================

/**
 * جلب جميع Custom Audiences
 */
export const getCustomAudiences = async (): Promise<
  FacebookCustomAudience[]
> => {
  try {
    const response = await apiClient.get("/facebook-ads/audiences/custom");
    return response.data.data || [];
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return [];
    }
    throw error;
  }
};

/**
 * إنشاء Custom Audience
 */
export const createCustomAudience = async (
  data: CreateCustomAudienceData,
): Promise<FacebookCustomAudience> => {
  try {
    const response = await apiClient.post(
      "/facebook-ads/audiences/custom",
      data,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating custom audience:", error);
    throw error;
  }
};

/**
 * جلب معلومات Custom Audience
 */
export const getCustomAudience = async (
  id: string,
): Promise<FacebookCustomAudience> => {
  try {
    const response = await apiClient.get(
      `/facebook-ads/audiences/custom/${id}`,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error fetching custom audience:", error);
    throw error;
  }
};

/**
 * حذف Custom Audience
 */
export const deleteCustomAudience = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/facebook-ads/audiences/custom/${id}`);
  } catch (error: unknown) {
    console.error("❌ Error deleting custom audience:", error);
    throw error;
  }
};

/**
 * جلب جميع Lookalike Audiences
 */
export const getLookalikeAudiences = async (): Promise<
  FacebookLookalikeAudience[]
> => {
  try {
    const response = await apiClient.get("/facebook-ads/audiences/lookalike");
    return response.data.data || [];
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return [];
    }
    throw error;
  }
};

/**
 * إنشاء Lookalike Audience
 */
export const createLookalikeAudience = async (
  data: CreateLookalikeAudienceData,
): Promise<FacebookLookalikeAudience> => {
  try {
    const response = await apiClient.post(
      "/facebook-ads/audiences/lookalike",
      data,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating lookalike audience:", error);
    throw error;
  }
};

// ============================================
// Product Catalog Types
// ============================================

export interface FacebookProductCatalog {
  id: string;
  companyId: string;
  adAccountId?: string;
  name: string;
  description?: string;
  facebookCatalogId?: string;
  catalogType: string;
  isActive: boolean;
  status: "ACTIVE" | "PAUSED" | "DELETED";
  lastSyncAt?: string;
  lastSyncStatus?: "SUCCESS" | "FAILED" | "IN_PROGRESS";
  totalProducts: number;
  syncedProducts: number;
  createdAt: string;
  updatedAt: string;
  products?: FacebookCatalogProduct[];
  feeds?: FacebookProductFeed[];
  dynamicAds?: FacebookDynamicAd[];
}

export interface FacebookCatalogProduct {
  id: string;
  catalogId: string;
  productId?: string;
  name: string;
  description?: string;
  brand?: string;
  category?: string;
  sku?: string;
  price?: number;
  currency?: string;
  availability: string;
  inventory?: number;
  imageUrl?: string;
  facebookProductId?: string;
  syncStatus: "PENDING" | "SYNCED" | "FAILED" | "UPDATED";
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
  product?: unknown;
}

export interface FacebookProductFeed {
  id: string;
  catalogId: string;
  name: string;
  feedType: string;
  format: string;
  fileUrl?: string;
  facebookFeedId?: string;
  feedUrl?: string;
  schedule?: string;
  status: "ACTIVE" | "PAUSED" | "DELETED";
  createdAt: string;
  updatedAt: string;
}

export interface FacebookDynamicAd {
  id: string;
  companyId: string;
  catalogId: string;
  adSetId?: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
  facebookAdId?: string;
  productSetId?: string;
  templateUrl?: string;
  templateId?: string;
  headline?: string;
  description?: string;
  callToAction?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCatalogData {
  name: string;
  description?: string;
  businessId: string;
  catalogType?: string;
  adAccountId?: string;
}

export interface SyncProductsData {
  productIds?: string[];
  syncAll?: boolean;
}

// ============================================
// Product Catalog Functions
// ============================================

/**
 * جلب جميع Catalogs
 */
export const getCatalogs = async (
  businessId?: string,
): Promise<FacebookProductCatalog[]> => {
  try {
    if (!businessId) {
      return [];
    }
    const params = businessId ? `?businessId=${businessId}` : "";
    const response = await apiClient.get(`/facebook-ads/catalogs${params}`);
    return response.data.data || [];
  } catch (error: unknown) {
    if (isBenignAdsSetupError(error)) {
      return [];
    }
    throw error;
  }
};

/**
 * إنشاء Catalog جديد
 */
export const createCatalog = async (
  data: CreateCatalogData,
): Promise<FacebookProductCatalog> => {
  try {
    const response = await apiClient.post("/facebook-ads/catalogs", data);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating catalog:", error);
    throw error;
  }
};

/**
 * جلب Catalog واحد
 */
export const getCatalog = async (
  id: string,
): Promise<FacebookProductCatalog> => {
  try {
    const response = await apiClient.get(`/facebook-ads/catalogs/${id}`);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error fetching catalog:", error);
    throw error;
  }
};

/**
 * حذف Catalog
 */
export const deleteCatalog = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/facebook-ads/catalogs/${id}`);
  } catch (error: unknown) {
    console.error("❌ Error deleting catalog:", error);
    throw error;
  }
};

/**
 * Sync Products مع Catalog
 */
export const syncProducts = async (
  catalogId: string,
  data: SyncProductsData,
): Promise<unknown> => {
  try {
    const response = await apiClient.post(
      `/facebook-ads/catalogs/${catalogId}/sync-products`,
      data,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error syncing products:", error);
    throw error;
  }
};

/**
 * جلب المنتجات في Catalog
 */
export const getCatalogProducts = async (
  catalogId: string,
  page: number = 1,
  limit: number = 50,
): Promise<{
  data: FacebookCatalogProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> => {
  try {
    const response = await apiClient.get(
      `/facebook-ads/catalogs/${catalogId}/products?page=${page}&limit=${limit}`,
    );
    return response.data;
  } catch (error: unknown) {
    console.error("❌ Error fetching catalog products:", error);
    throw error;
  }
};

export interface CreateDynamicAdData {
  name: string;
  catalogId: string;
  productSetId: string;
  templateUrl?: string;
  status?: "ACTIVE" | "PAUSED";
  headline?: string;
  description?: string;
  callToAction?: string;
}

// ============================================
// A/B Testing Types
// ============================================

export interface FacebookAdTest {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  testType: "CREATIVE" | "TARGETING" | "BUDGET" | "PLACEMENT";
  status: "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  campaignId?: string;
  campaign?: FacebookCampaign;
  variants: string; // JSON string
  winnerVariantId?: string;
  confidenceLevel?: number;
  testDuration?: number;
  startDate?: string;
  endDate?: string;
  trafficSplit: number;
  minimumResults: number;
  autoPromote: boolean;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  createdAt: string;
  updatedAt: string;
  variantsList?: FacebookAdTestVariant[];
}

export interface FacebookAdTestVariant {
  id: string;
  testId: string;
  name: string;
  variantType: "VARIANT_A" | "VARIANT_B" | "CONTROL";
  variantData: string; // JSON string
  adSetId?: string;
  adSet?: FacebookAdSet;
  adId?: string;
  ad?: FacebookAd;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  isWinner: boolean;
  pValue?: number;
  confidenceLevel?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdTestData {
  name: string;
  description?: string;
  testType: "CREATIVE" | "TARGETING" | "BUDGET" | "PLACEMENT";
  campaignId?: string;
  variants: Array<{
    name: string;
    creative?: unknown;
    targeting?: unknown;
    budgetType?: "DAILY" | "LIFETIME";
    budgetAmount?: number;
  }>;
  trafficSplit?: number;
  minimumResults?: number;
  autoPromote?: boolean;
}

/**
 * جلب Product Sets للـ Catalog
 */
export const getProductSets = async (catalogId: string): Promise<unknown[]> => {
  try {
    const response = await apiClient.get(
      `/facebook-ads/catalogs/${catalogId}/product-sets`,
    );
    return response.data.data || [];
  } catch (error: unknown) {
    console.error("❌ Error fetching product sets:", error);
    throw error;
  }
};

/**
 * إنشاء Product Set
 */
export const createProductSet = async (
  catalogId: string,
  data: {
    name: string;
    productIds?: string[];
    filter?: unknown;
  },
): Promise<unknown> => {
  try {
    const response = await apiClient.post(
      `/facebook-ads/catalogs/${catalogId}/product-sets`,
      data,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating product set:", error);
    throw error;
  }
};

/**
 * إنشاء Dynamic Product Ad
 */
export const createDynamicAd = async (
  adSetId: string,
  data: CreateDynamicAdData,
): Promise<FacebookDynamicAd> => {
  try {
    const response = await apiClient.post(
      `/facebook-ads/adsets/${adSetId}/dynamic-ads`,
      data,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating dynamic ad:", error);
    throw error;
  }
};

/**
 * ============================================
 * A/B Testing Functions
 * ============================================
 */

/**
 * جلب جميع A/B Tests
 */
export const getAdTests = async (
  status?: string,
  testType?: string,
): Promise<FacebookAdTest[]> => {
  try {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (testType) params.append("testType", testType);

    const response = await apiClient.get(
      `/facebook-ads/tests?${params.toString()}`,
    );
    return response.data.data || [];
  } catch (error: unknown) {
    console.error("❌ Error fetching ad tests:", error);
    throw error;
  }
};

/**
 * جلب Test واحد
 */
export const getAdTest = async (id: string): Promise<FacebookAdTest> => {
  try {
    const response = await apiClient.get(`/facebook-ads/tests/${id}`);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error fetching ad test:", error);
    throw error;
  }
};

/**
 * إنشاء A/B Test جديد
 */
export const createAdTest = async (
  data: CreateAdTestData,
): Promise<FacebookAdTest> => {
  try {
    const response = await apiClient.post("/facebook-ads/tests", data);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating ad test:", error);
    throw error;
  }
};

/**
 * تحديث A/B Test
 */
export const updateAdTest = async (
  id: string,
  data: Partial<CreateAdTestData>,
): Promise<FacebookAdTest> => {
  try {
    const response = await apiClient.put(`/facebook-ads/tests/${id}`, data);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error updating ad test:", error);
    throw error;
  }
};

/**
 * حذف A/B Test
 */
export const deleteAdTest = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/facebook-ads/tests/${id}`);
  } catch (error: unknown) {
    console.error("❌ Error deleting ad test:", error);
    throw error;
  }
};

/**
 * بدء A/B Test
 */
export const startAdTest = async (id: string): Promise<FacebookAdTest> => {
  try {
    const response = await apiClient.post(`/facebook-ads/tests/${id}/start`);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error starting ad test:", error);
    throw error;
  }
};

/**
 * إيقاف A/B Test
 */
export const pauseAdTest = async (id: string): Promise<FacebookAdTest> => {
  try {
    const response = await apiClient.post(`/facebook-ads/tests/${id}/pause`);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error pausing ad test:", error);
    throw error;
  }
};

/**
 * تحليل نتائج A/B Test
 */
export const analyzeAdTest = async (
  id: string,
): Promise<{
  test: FacebookAdTest;
  analysis: unknown;
}> => {
  try {
    const response = await apiClient.post(`/facebook-ads/tests/${id}/analyze`);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error analyzing ad test:", error);
    throw error;
  }
};

/**
 * تعزيز الفائز (Promote Winner)
 */
export const promoteWinner = async (id: string): Promise<FacebookAdTest> => {
  try {
    const response = await apiClient.post(
      `/facebook-ads/tests/${id}/promote-winner`,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error promoting winner:", error);
    throw error;
  }
};

/**
 * جلب نتائج A/B Test
 */
export const getAdTestResults = async (
  id: string,
): Promise<{
  test: FacebookAdTest;
  results: FacebookAdTestVariant[];
}> => {
  try {
    const response = await apiClient.get(`/facebook-ads/tests/${id}/results`);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error fetching ad test results:", error);
    throw error;
  }
};

/**
 * ============================================
 * v22.0 New Features Functions
 * ============================================
 */

// --- Conversion API (CAPI) ---
export interface ConversionEventData {
  pixelId: string;
  eventName:
    | "Purchase"
    | "Lead"
    | "AddToCart"
    | "ViewContent"
    | "InitiateCheckout"
    | "CompleteRegistration"
    | "Contact"
    | "Subscribe"
    | string;
  eventId?: string;
  testEventCode?: string;
  eventTime?: number;
  eventSourceUrl?: string;
  userData?: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    externalId?: string;
    ipAddress?: string;
    userAgent?: string;
    fbc?: string;
    fbp?: string;
  };
  customData?: {
    value?: number;
    currency?: string;
    contentIds?: string[];
    contentType?: string;
    contentName?: string;
    contentCategory?: string;
    numItems?: number;
    orderId?: string;
  };
  actionSource?:
    | "website"
    | "app"
    | "phone_call"
    | "chat"
    | "email"
    | "physical_store";
}

export interface ConversionApiSendResponse {
  success?: boolean;
  data?: {
    events_received?: number;
    eventsReceived?: number;
    fbtrace_id?: string | null;
    fbtraceId?: string | null;
    messages?: Array<string | Record<string, unknown>>;
  };
  events_received?: number;
  eventsReceived?: number;
  fbtrace_id?: string | null;
  fbtraceId?: string | null;
  messages?: Array<string | Record<string, unknown>>;
  error?: string;
}

/**
 * إرسال Conversion Event عبر CAPI
 */
export const sendConversionEvent = async (
  data: ConversionEventData,
): Promise<ConversionApiSendResponse> => {
  try {
    const response = await apiClient.post("/facebook-ads/conversions", data);
    return response.data;
  } catch (error: unknown) {
    console.error("❌ Error sending conversion event:", error);
    throw error;
  }
};

// --- Lead Generation ---
export interface LeadFormQuestion {
  type:
    | "EMAIL"
    | "PHONE"
    | "FULL_NAME"
    | "FIRST_NAME"
    | "LAST_NAME"
    | "CITY"
    | "STATE"
    | "ZIP"
    | "COUNTRY"
    | "CUSTOM";
  key: string;
  label: string;
}

export interface CreateLeadFormData {
  pageId: string;
  name: string;
  questions: LeadFormQuestion[];
  privacyPolicyUrl: string;
  thankYouPage?: {
    title?: string;
    body?: string;
    buttonText?: string;
    buttonType?: string;
    websiteUrl?: string;
  };
}

/**
 * إنشاء Lead Form
 */
export const createLeadForm = async (
  data: CreateLeadFormData,
): Promise<unknown> => {
  try {
    const response = await apiClient.post("/facebook-ads/lead-forms", data);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating lead form:", error);
    throw error;
  }
};

/**
 * جلب Leads من Form
 */
export const getLeads = async (formId: string): Promise<unknown[]> => {
  try {
    const response = await apiClient.get(
      `/facebook-ads/lead-forms/${formId}/leads`,
    );
    return response.data.data || [];
  } catch (error: unknown) {
    console.error("❌ Error fetching leads:", error);
    throw error;
  }
};

// --- Ad Scheduling ---
export interface AdSchedule {
  days: number[]; // 0 = Sunday, 6 = Saturday
  startMinute: number; // 0-1440
  endMinute: number; // 0-1440
  timezoneType?: "USER" | "ADVERTISER";
}

/**
 * تحديث جدولة Ad Set
 */
export const updateAdSetSchedule = async (
  adSetId: string,
  schedule: AdSchedule[],
): Promise<unknown> => {
  try {
    const response = await apiClient.put(
      `/facebook-ads/adsets/${adSetId}/schedule`,
      { schedule },
    );
    return response.data;
  } catch (error: unknown) {
    console.error("❌ Error updating ad set schedule:", error);
    throw error;
  }
};

// --- A/B Testing (v22.0 API) ---
export interface CreateABTestData {
  name: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  cells: Array<{
    name: string;
    campaignId?: string;
    adSetId?: string;
    percentage?: number;
  }>;
}

/**
 * إنشاء A/B Test عبر Facebook API
 */
export const createFacebookABTest = async (
  data: CreateABTestData,
): Promise<unknown> => {
  try {
    const response = await apiClient.post("/facebook-ads/ab-tests", data);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating A/B test:", error);
    throw error;
  }
};

/**
 * جلب نتائج A/B Test من Facebook
 */
export const getFacebookABTestResults = async (
  studyId: string,
): Promise<unknown> => {
  try {
    const response = await apiClient.get(`/facebook-ads/ab-tests/${studyId}`);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error fetching A/B test results:", error);
    throw error;
  }
};

// --- Audiences (v22.0 API) ---
/**
 * جلب Audiences من Facebook API مباشرة
 */
export const getFacebookAudiences = async (): Promise<unknown[]> => {
  try {
    const response = await apiClient.get("/facebook-ads/audiences");
    return response.data.data || [];
  } catch (error: unknown) {
    console.error("❌ Error fetching audiences:", error);
    throw error;
  }
};

/**
 * إنشاء Custom Audience عبر Facebook API
 */
export const createFacebookCustomAudience = async (data: {
  name: string;
  description?: string;
  subtype?: string;
}): Promise<unknown> => {
  try {
    const response = await apiClient.post("/facebook-ads/audiences", data);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating custom audience:", error);
    throw error;
  }
};

/**
 * إضافة مستخدمين لـ Custom Audience
 */
export const addUsersToAudience = async (
  audienceId: string,
  users: Array<{
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  }>,
): Promise<unknown> => {
  try {
    const response = await apiClient.post(
      `/facebook-ads/audiences/${audienceId}/users`,
      { users },
    );
    return response.data;
  } catch (error: unknown) {
    console.error("❌ Error adding users to audience:", error);
    throw error;
  }
};

/**
 * إنشاء Lookalike Audience عبر Facebook API
 */
export const createFacebookLookalikeAudience = async (data: {
  name: string;
  sourceAudienceId: string;
  country: string;
  ratio?: number;
}): Promise<unknown> => {
  try {
    const response = await apiClient.post(
      "/facebook-ads/audiences/lookalike",
      data,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating lookalike audience:", error);
    throw error;
  }
};

// ============================================
// v22.0: Dynamic Creative Optimization
// ============================================
export interface DynamicCreativeData {
  pageId: string;
  name?: string;
  images?: string[];
  videos?: string[];
  titles?: string[];
  bodies?: string[];
  descriptions?: string[];
  callToActions?: string[];
  linkUrls?: string[];
}

export const createDynamicCreative = async (
  data: DynamicCreativeData,
): Promise<unknown> => {
  try {
    const response = await apiClient.post(
      "/facebook-ads/creatives/dynamic",
      data,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating dynamic creative:", error);
    throw error;
  }
};

// ============================================
// v22.0: Advantage+ Shopping
// ============================================
export interface AdvantagePlusShoppingData {
  name: string;
  status?: string;
  budgetType?: "DAILY" | "LIFETIME";
  budgetAmount: number;
  catalogId?: string;
  pixelId: string;
  countryTargeting?: string[];
}

export const createAdvantagePlusShoppingCampaign = async (
  data: AdvantagePlusShoppingData,
): Promise<unknown> => {
  try {
    const response = await apiClient.post(
      "/facebook-ads/campaigns/advantage-plus-shopping",
      data,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating Advantage+ Shopping campaign:", error);
    throw error;
  }
};

// ============================================
// v22.0: Async Reports
// ============================================
export interface AsyncReportData {
  adAccountId?: string;
  level?: "account" | "campaign" | "adset" | "ad";
  fields?: string[];
  datePreset?: string;
  timeRange?: { since: string; until: string };
  breakdowns?: string[];
  filtering?: unknown[];
  sorting?: unknown[];
}

export const createAsyncReport = async (
  data: AsyncReportData,
): Promise<unknown> => {
  try {
    const response = await apiClient.post("/facebook-ads/reports/async", data);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating async report:", error);
    throw error;
  }
};

export const getAsyncReportStatus = async (
  reportRunId: string,
  adAccountId?: string,
): Promise<unknown> => {
  try {
    const response = await apiClient.get(
      `/facebook-ads/reports/async/${reportRunId}/status`,
      {
        params: adAccountId ? { adAccountId } : undefined,
      },
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error getting async report status:", error);
    throw error;
  }
};

export const getAsyncReportResults = async (
  reportRunId: string,
  adAccountId?: string,
): Promise<unknown> => {
  try {
    const response = await apiClient.get(
      `/facebook-ads/reports/async/${reportRunId}/results`,
      {
        params: adAccountId ? { adAccountId } : undefined,
      },
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error getting async report results:", error);
    throw error;
  }
};

// ============================================
// v22.0: Creative Formats
// ============================================
export interface CollectionCreativeData {
  pageId: string;
  name?: string;
  instantExperienceId?: string;
  coverImageHash?: string;
  coverVideoId?: string;
  headline?: string;
  primaryText?: string;
  products?: string[];
  catalogId?: string;
  linkUrl?: string;
}

export const createCollectionCreative = async (
  data: CollectionCreativeData,
): Promise<unknown> => {
  try {
    const response = await apiClient.post(
      "/facebook-ads/creatives/collection",
      data,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating collection creative:", error);
    throw error;
  }
};

export interface StoriesReelsCreativeData {
  pageId: string;
  instagramAccountId?: string;
  name?: string;
  videoId: string;
  primaryText?: string;
  linkUrl?: string;
  callToAction?: string;
  format?: "STORIES" | "REELS";
}

export const createStoriesReelsCreative = async (
  data: StoriesReelsCreativeData,
): Promise<unknown> => {
  try {
    const response = await apiClient.post(
      "/facebook-ads/creatives/stories-reels",
      data,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating stories/reels creative:", error);
    throw error;
  }
};

export const createInstantExperience = async (data: {
  pageId: string;
  name?: string;
  components?: unknown[];
}): Promise<unknown> => {
  try {
    const response = await apiClient.post(
      "/facebook-ads/instant-experience",
      data,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating instant experience:", error);
    throw error;
  }
};

// ============================================
// v22.0: Automation Rules
// ============================================
export interface AutomatedRuleData {
  name: string;
  entityType?: "CAMPAIGN" | "ADSET" | "AD";
  filterField: string;
  filterOperator: string;
  filterValue: unknown;
  actionType:
    | "PAUSE"
    | "UNPAUSE"
    | "CHANGE_BUDGET"
    | "CHANGE_BID"
    | "SEND_NOTIFICATION";
  actionValue?: unknown;
  evaluationSpec?: unknown;
  scheduleSpec?: unknown;
}

export const getAutomatedRules = async (): Promise<unknown[]> => {
  try {
    const response = await apiClient.get("/facebook-ads/rules");
    return response.data.data || [];
  } catch (error: unknown) {
    if (isBenignAdsSetupError(error)) {
      return [];
    }
    throw error;
  }
};

export const createAutomatedRule = async (
  data: AutomatedRuleData,
): Promise<unknown> => {
  try {
    const response = await apiClient.post("/facebook-ads/rules", data);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating automated rule:", error);
    throw error;
  }
};

export const updateAutomatedRule = async (
  ruleId: string,
  data: Partial<AutomatedRuleData>,
): Promise<unknown> => {
  try {
    const response = await apiClient.put(`/facebook-ads/rules/${ruleId}`, data);
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error updating automated rule:", error);
    throw error;
  }
};

export const deleteAutomatedRule = async (ruleId: string): Promise<void> => {
  try {
    await apiClient.delete(`/facebook-ads/rules/${ruleId}`);
  } catch (error: unknown) {
    console.error("❌ Error deleting automated rule:", error);
    throw error;
  }
};

// ============================================
// v22.0: Attribution Settings
// ============================================
export interface AttributionSettings {
  attributionWindow?: "1d_click" | "7d_click" | "1d_view" | "7d_click_1d_view";
  useUnifiedAttributionSetting?: boolean;
}

export const updateAttributionSettings = async (
  adSetId: string,
  settings: AttributionSettings,
): Promise<unknown> => {
  try {
    const response = await apiClient.put(
      `/facebook-ads/adsets/${adSetId}/attribution`,
      settings,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error updating attribution settings:", error);
    throw error;
  }
};

// ============================================
// v22.0: Ad Set Management
// ============================================
export interface UpdateAdSetData {
  name?: string;
  status?: string;
  budgetType?: "DAILY" | "LIFETIME";
  budgetAmount?: number;
  optimizationGoal?: string;
  bidAmount?: number;
  targeting?: unknown;
  startTime?: string;
  endTime?: string;
}

export const updateAdSet = async (
  adSetId: string,
  data: UpdateAdSetData,
): Promise<unknown> => {
  try {
    const response = await apiClient.put(
      `/facebook-ads/adsets/${adSetId}`,
      data,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error updating ad set:", error);
    throw error;
  }
};

export const updateFrequencyCap = async (
  adSetId: string,
  data: { maxFrequency?: number; intervalDays?: number },
): Promise<unknown> => {
  try {
    const response = await apiClient.put(
      `/facebook-ads/adsets/${adSetId}/frequency-cap`,
      data,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error updating frequency cap:", error);
    throw error;
  }
};

// ============================================
// v22.0: Advanced Targeting
// ============================================
export const searchTargetingOptions = async (
  query: string,
  type?: string,
  options?: {
    countryCode?: string;
    regionId?: string | number;
    locationTypes?: string[];
    limit?: number;
  },
): Promise<unknown[]> => {
  try {
    const response = await apiClient.get("/facebook-ads/targeting/search", {
      params: {
        query,
        type,
        countryCode: options?.countryCode,
        regionId: options?.regionId,
        locationTypes: options?.locationTypes?.join(","),
        limit: options?.limit,
      },
    });
    return response.data.data || [];
  } catch (error: unknown) {
    console.error("❌ Error searching targeting options:", error);
    throw error;
  }
};

export const searchGeoLocations = async (
  query: string,
  options: SearchGeoLocationsOptions = {},
): Promise<MetaGeoLocation[]> => {
  const results = await searchTargetingOptions(query, "adgeolocation", {
    countryCode: options.countryCode,
    regionId: options.regionId,
    locationTypes: options.locationTypes,
    limit: options.limit,
  });

  return results as MetaGeoLocation[];
};

export const getTargetingSuggestions = async (
  targetingList: unknown[],
): Promise<unknown[]> => {
  try {
    const response = await apiClient.post(
      "/facebook-ads/targeting/suggestions",
      { targetingList },
    );
    return response.data.data || [];
  } catch (error: unknown) {
    console.error("❌ Error getting targeting suggestions:", error);
    throw error;
  }
};

export const getReachEstimate = async (
  targeting: unknown,
): Promise<unknown> => {
  try {
    const response = await apiClient.post(
      "/facebook-ads/targeting/reach-estimate",
      { targeting },
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error getting reach estimate:", error);
    throw error;
  }
};

// ============================================
// v22.0: Ad Preview
// ============================================
export const getAdPreview = async (
  adId: string,
  format?: string,
): Promise<unknown[]> => {
  try {
    const response = await apiClient.get(`/facebook-ads/ads/${adId}/preview`, {
      params: { format },
    });
    return response.data.data || [];
  } catch (error: unknown) {
    console.error("❌ Error getting ad preview:", error);
    throw error;
  }
};

export const getCreativePreview = async (
  creativeId: string,
  format?: string,
): Promise<unknown[]> => {
  try {
    const response = await apiClient.get(
      `/facebook-ads/creatives/${creativeId}/preview`,
      { params: { format } },
    );
    return response.data.data || [];
  } catch (error: unknown) {
    console.error("❌ Error getting creative preview:", error);
    throw error;
  }
};

// ============================================
// v22.0: Saved Audiences
// ============================================
export interface SavedAudienceData {
  name: string;
  description?: string;
  targeting: unknown;
}

export const getSavedAudiences = async (): Promise<unknown[]> => {
  try {
    const response = await apiClient.get("/facebook-ads/saved-audiences");
    return response.data.data || [];
  } catch (error: unknown) {
    console.error("❌ Error getting saved audiences:", error);
    throw error;
  }
};

export const createSavedAudience = async (
  data: SavedAudienceData,
): Promise<unknown> => {
  try {
    const response = await apiClient.post(
      "/facebook-ads/saved-audiences",
      data,
    );
    return response.data.data;
  } catch (error: unknown) {
    console.error("❌ Error creating saved audience:", error);
    throw error;
  }
};

export const deleteSavedAudience = async (
  audienceId: string,
): Promise<void> => {
  try {
    await apiClient.delete(`/facebook-ads/saved-audiences/${audienceId}`);
  } catch (error: unknown) {
    console.error("❌ Error deleting saved audience:", error);
    throw error;
  }
};

// ============================================
// v25.0: Meta Ad Library / Ads Archive
// ============================================
export interface FacebookAdLibrarySearchParams {
  searchTerms?: string;
  pageIds?: string[];
  countries?: string[];
  adActiveStatus?: "ACTIVE" | "INACTIVE" | "ALL";
  adType?: "ALL" | "POLITICAL_AND_ISSUE_ADS";
  mediaType?: "ALL" | "IMAGE" | "MEME" | "VIDEO" | "NONE";
  publisherPlatforms?: string[];
  deliveryDateMin?: string;
  deliveryDateMax?: string;
  limit?: number;
}

export interface FacebookAdLibraryAd {
  id: string;
  page_id?: string;
  page_name?: string;
  ad_creation_time?: string;
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_creative_link_descriptions?: string[];
  ad_creative_link_captions?: string[];
  ad_snapshot_url?: string;
  publisher_platforms?: string[];
  spend?: { lower_bound?: string; upper_bound?: string };
  impressions?: { lower_bound?: string; upper_bound?: string };
  demographic_distribution?: unknown[];
  region_distribution?: unknown[];
  currency?: string;
}

export interface FacebookAdLibrarySearchResponse {
  success: boolean;
  apiVersion?: string;
  data: FacebookAdLibraryAd[];
  paging?: unknown;
  request?: unknown;
  error?: string;
}

const joinParam = (value?: string[]) =>
  value && value.length > 0 ? value.join(",") : undefined;

export const searchAdLibrary = async (
  params: FacebookAdLibrarySearchParams,
): Promise<FacebookAdLibrarySearchResponse> => {
  try {
    const response = await apiClient.get("/facebook-ads/ad-library/search", {
      params: {
        searchTerms: params.searchTerms || undefined,
        pageIds: joinParam(params.pageIds),
        countries: joinParam(params.countries),
        adActiveStatus: params.adActiveStatus,
        adType: params.adType,
        mediaType: params.mediaType,
        publisherPlatforms: joinParam(params.publisherPlatforms),
        deliveryDateMin: params.deliveryDateMin || undefined,
        deliveryDateMax: params.deliveryDateMax || undefined,
        limit: params.limit,
      },
    });

    return response.data;
  } catch (error: unknown) {
    console.error("❌ Error searching Meta Ad Library:", error);
    throw error;
  }
};

export const facebookAdsService = {
  // 🚀 Full Ad Creation (Campaign + AdSet + Ad)
  createFullAd,
  getProductLaunchMetadata,

  // Campaigns
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  pauseCampaign,
  resumeCampaign,

  // AdSets
  getAdSets,
  createAdSet,
  deleteAdSet,

  // Ads
  getAds,
  createAd,
  updateAd,
  deleteAd,

  // Insights
  getAdInsights,
  getAdDetails,
  getAdPerformanceBreakdown,
  syncAdInsights,
  getCampaignInsights,
  getAdsPerformanceSummary,
  getAdsDecisionSummary,
  getGeoPerformanceReport,
  getPerformanceBreakdownReport,

  // Audiences
  getCustomAudiences,
  createCustomAudience,
  getCustomAudience,
  deleteCustomAudience,
  getLookalikeAudiences,
  createLookalikeAudience,
  getFacebookPages,
  getFacebookPageOptions,
  getFacebookPixels,

  // Catalogs
  getCatalogs,
  createCatalog,
  getCatalog,
  deleteCatalog,
  syncProducts,
  getCatalogProducts,

  // Dynamic Ads
  getProductSets,
  createProductSet,
  createDynamicAd,

  // A/B Testing
  getAdTests,
  getAdTest,
  createAdTest,
  updateAdTest,
  deleteAdTest,
  startAdTest,
  pauseAdTest,
  analyzeAdTest,
  promoteWinner,
  getAdTestResults,

  // Sync
  syncFromFacebook,

  // Ad Accounts
  getAdAccounts,
  saveAdAccount,
  getSavedAdAccounts,
  getBudgetAlertRules,
  createBudgetAlertRule,
  updateBudgetAlertRule,
  deleteBudgetAlertRule,
  testBudgetAlertRule,
  previewBudgetAlertRule,
  runBudgetAlertRulesNow,
  getBudgetAlertLogs,

  // v22.0: Conversion API
  sendConversionEvent,

  // v22.0: Lead Generation
  createLeadForm,
  getLeads,

  // v22.0: Ad Scheduling
  updateAdSetSchedule,

  // v22.0: A/B Testing (Facebook API)
  createFacebookABTest,
  getFacebookABTestResults,

  // v22.0: Audiences (Facebook API)
  getFacebookAudiences,
  createFacebookCustomAudience,
  addUsersToAudience,
  createFacebookLookalikeAudience,

  // v22.0: Dynamic Creative Optimization
  createDynamicCreative,

  // v22.0: Advantage+ Shopping
  createAdvantagePlusShoppingCampaign,

  // v22.0: Async Reports
  createAsyncReport,
  getAsyncReportStatus,
  getAsyncReportResults,

  // v22.0: Creative Formats
  createCollectionCreative,
  createStoriesReelsCreative,
  createInstantExperience,

  // v22.0: Automation Rules
  getAutomatedRules,
  createAutomatedRule,
  updateAutomatedRule,
  deleteAutomatedRule,

  // v22.0: Attribution
  updateAttributionSettings,

  // v22.0: Ad Set Management
  updateAdSet,
  updateFrequencyCap,

  // v22.0: Advanced Targeting
  searchTargetingOptions,
  searchGeoLocations,
  getTargetingSuggestions,
  getReachEstimate,

  // v22.0: Ad Preview
  getAdPreview,
  getCreativePreview,

  // v22.0: Saved Audiences
  getSavedAudiences,
  createSavedAudience,
  deleteSavedAudience,

  // v25.0: Meta Ad Library / Ads Archive
  searchAdLibrary,

  // Constants
  CAMPAIGN_OBJECTIVES,
  CALL_TO_ACTION_TYPES,
  OBJECTIVE_MAPPING,
  ADVANTAGE_CREATIVE_ENHANCEMENTS,
  OPTIMIZATION_GOALS,
};

/**
 * جلب Facebook Pages المتاحة
 */
export async function getFacebookPages(): Promise<FacebookPage[]> {
  try {
    const response = await apiClient.get<{ data: FacebookPage[] }>(
      "/facebook-ads/pages",
    );
    return response.data.data || [];
  } catch (error: unknown) {
    if (isNotFoundError(error) || getAxiosStatus(error) === 400) {
      return [];
    }
    throw error;
  }
}

/**
 * جلب Facebook Pages مع بيانات تشخيصية عن الربط والصلاحيات
 */
export async function getFacebookPageOptions(): Promise<FacebookPagesResponse> {
  try {
    const response = await apiClient.get<FacebookPagesResponse>(
      "/facebook-ads/pages",
    );
    return {
      data: response.data.data || [],
      meta: response.data.meta || null,
    };
  } catch (error: unknown) {
    if (isNotFoundError(error) || getAxiosStatus(error) === 400) {
      return {
        data: [],
        meta: null,
      };
    }
    throw error;
  }
}

/**
 * جلب Facebook Pixels المتاحة
 */
export async function getFacebookPixels(
  adAccountId?: string,
): Promise<FacebookPixel[]> {
  try {
    const response = await apiClient.get<{ data: FacebookPixel[] }>(
      "/facebook-ads/pixels",
      {
        params: adAccountId ? { adAccountId } : undefined,
      },
    );
    return response.data.data || [];
  } catch (error: unknown) {
    if (isNotFoundError(error) || getAxiosStatus(error) === 400) {
      return [];
    }
    throw error;
  }
}

export default facebookAdsService;
