import React from "react";
import type { MetaGeoLocation } from "../../../services/facebookAdsService";
import type {
  AttributionWindowOption,
  TargetingOptionSelection,
  WizardTargetingFormData,
  WizardTargetingSelections,
} from "../CreateAdWizard.helpers";

export interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export interface CarouselCard {
  id: string;
  imageUrl: string;
  headline: string;
  description: string;
  linkUrl: string;
}

export interface TextVariation {
  id: string;
  text: string;
}

export interface HeadlineVariation {
  id: string;
  text: string;
}

export interface CreatedFullAdSummary {
  localCampaignId?: string;
  localAdSetId?: string;
  localAdId?: string;
  facebookCampaignId?: string;
  facebookAdSetId?: string;
  facebookAdId?: string;
  creativeId?: string;
  status: "ACTIVE" | "PAUSED";
  adAccountId: string;
}

export const getResultEntityId = (entity: unknown) =>
  entity && typeof entity === "object" && "id" in entity
    ? String((entity as Record<string, unknown>)["id"])
    : undefined;

export interface FormData {
  // Step 1: Campaign
  campaignName: string;
  adSetName: string;
  adName: string;
  objective: string;
  specialAdCategories: string[];
  isSplitTest?: boolean;
  splitTestVariable?: "CREATIVE" | "AUDIENCE" | "PLACEMENT";
  spendLimit?: number;

  // Step 2: Ad Set Level
  budgetType: "DAILY" | "LIFETIME";
  budgetAmount: number;
  bidStrategy: string;
  bidAmount?: number;
  billingEvent: string;
  optimizationGoal: string;
  startTime: string;
  endTime: string;
  attributionWindow: string;
  existingCustomerBudgetPercentage?: number;
  adSchedulingEnabled?: boolean;
  adScheduleStartHour?: number;
  adScheduleEndHour?: number;
  adScheduleDays?: number[];
  adSetSpendLimitsEnabled?: boolean;
  adSetMinDailySpend?: number;
  adSetMaxDailySpend?: number;

  // Step 3: Audience & Placements
  locations: string[];
  geoLocations?: MetaGeoLocation[];
  excludedGeoLocations?: MetaGeoLocation[];
  locationSearchQuery?: string;
  ageMin: number;
  ageMax: number;
  genders: number[];
  languages: string[];
  interests: string[];
  narrowInterests?: TargetingOption[];
  behaviors: string[];
  demographics: string[];
  customAudiences: string[];
  excludedCustomAudiences: string[];
  excludedInterests?: TargetingOption[];
  advantageAudience: boolean;
  placementType: "AUTOMATIC" | "MANUAL";
  publisherPlatforms: string[];
  facebookPositions: string[];
  instagramPositions: string[];
  messengerPositions: string[];
  audienceNetworkPositions: string[];
  devicePlatforms: string[];
  onlyWifi?: boolean;
  inventoryFilter?: "STANDARD" | "FULL" | "LIMITED";

  // Step 4: Ad Creative
  pageId: string;
  instagramActorId: string;
  creativeSource?: "NEW_AD" | "EXISTING_POST";
  creativeType: "SINGLE_IMAGE" | "SINGLE_VIDEO" | "CAROUSEL" | "COLLECTION" | "FLEXIBLE" | "EXISTING_POST";
  postId?: string;
  headline: string;
  primaryText: string;
  description: string;
  callToAction: string;
  linkUrl: string;
  productId: string;
  displayLink: string;
  urlParameters: string;
  imageUrl: string;
  videoUrl: string;
  customStoriesMedia?: boolean;
  storyImageUrl?: string;
  storyVideoUrl?: string;
  carouselCards: CarouselCard[];
  flexibleAssets: { id: string; type: "IMAGE" | "VIDEO"; url: string }[];
  textVariations: TextVariation[];
  headlineVariations: HeadlineVariation[];
  whatsappGreeting?: string;
  whatsappQuickFaqs?: string[];
  useLeadForm: boolean;
  leadFormId?: string;

  // Advantage+ Creative (v26.0)
  advantageCreative: boolean;
  textGeneration: boolean;
  imageEnhancement: boolean;
  expandImage?: boolean;
  visualTouchups?: boolean;
  relevantComments?: boolean;
  priceOverlay?: boolean;
  multiAdvertiserAds?: boolean;

  // Status
  status: "ACTIVE" | "PAUSED";
}


export interface TargetingOption {
  id: string;
  name: string;
  audience_size?: number;
}

export interface CreateAdWizardErrors {
  adAccountId?: string;
  budgetAmount?: string;
  campaignName?: string;
  carouselCards?: string;
  creativeType?: string;
  imageUrl?: string;
  linkUrl?: string;
  locations?: string;
  objective?: string;
  pageId?: string;
  pixelId?: string;
  placements?: string;
  primaryText?: string;
  videoUrl?: string;
  [key: string]: string | undefined;
}

export type {
  AttributionWindowOption,
  TargetingOptionSelection,
  WizardTargetingFormData,
  WizardTargetingSelections,
};
