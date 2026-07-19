import type { DeliveryFilter } from "./facebookAdsHelpers";
import type { FacebookAdsDatePreset } from "./facebookAdsReportFilters";

export type CampaignSortKey =
  | "delivery"
  | "spend"
  | "roas"
  | "budget"
  | "name"
  | "lastSync";

export interface DashboardFilters {
  searchTerm: string;
  statusFilter: DeliveryFilter;
  objectiveFilter: string;
  sourceFilter: "ALL" | "META" | "LOCAL";
  sortBy: CampaignSortKey;
  datePreset: FacebookAdsDatePreset;
  startDate?: string;
  endDate?: string;
}
