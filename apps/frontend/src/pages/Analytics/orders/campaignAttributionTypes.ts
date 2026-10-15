export interface CampaignAttributionSummary {
  totalOrders: number;
  storefrontOrders?: number;
  inboxOrders?: number;
  storefrontRevenue?: number;
  inboxRevenue?: number;
  trackedOrders: number;
  campaignTaggedOrders: number;
  directOrders: number;
  unattributedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  totalRevenue: number;
  deliveredRevenue: number;
  averageOrderValue: number;
  trackingCoverage: number;
  deliveryRate: number;
}

export interface CampaignAttributionRow {
  key: string;
  channel?: string;
  trackingType: string;
  platform: string;
  source: string;
  medium: string;
  campaignId: string | null;
  campaignName: string;
  adSetId: string | null;
  adId: string | null;
  adRef?: string | null;
  postId?: string | null;
  pageId?: string | null;
  content: string | null;
  term: string | null;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  totalRevenue: number;
  deliveredRevenue: number;
  averageOrderValue: number;
  deliveredRate: number;
}

export interface BreakdownRow {
  source?: string;
  platform?: string;
  orders: number;
  revenue: number;
  share: number;
}

export interface TrendRow {
  date: string;
  totalOrders: number;
  trackedOrders: number;
  campaignOrders: number;
  revenue: number;
  deliveredRevenue: number;
}

export interface CampaignAttributionAnalyticsData {
  summary: CampaignAttributionSummary;
  rows: CampaignAttributionRow[];
  sourceBreakdown: BreakdownRow[];
  platformBreakdown: BreakdownRow[];
  trend: TrendRow[];
  availableFilters: {
    channels?: string[];
    sources: string[];
    platforms: string[];
    trackingTypes: string[];
  };
  appliedFilters: {
    channel?: string;
    source: string;
    platform: string;
    trackingType: string;
    search: string;
  };
}
