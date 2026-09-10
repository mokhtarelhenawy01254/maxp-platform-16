import React from "react";
import type { MetaGeoLocation } from "../../../services/facebookAdsService";
import type {
  AttributionWindowOption,
  TargetingOptionSelection,
  WizardTargetingFormData,
  WizardTargetingSelections,
} from "../CreateAdWizard.helpers";

interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface CarouselCard {
  id: string;
  imageUrl: string;
  headline: string;
  description: string;
  linkUrl: string;
}

interface TextVariation {
  id: string;
  text: string;
}

interface HeadlineVariation {
  id: string;
  text: string;
}

interface CreatedFullAdSummary {
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

const getResultEntityId = (entity: unknown) =>
  entity && typeof entity === "object" && "id" in entity
    ? String((entity as Record<string, unknown>)["id"])
    : undefined;

interface FormData {
  // Step 1: Campaign
  campaignName: string;
  adSetName: string;
  adName: string;
  objective: string;
  specialAdCategories: string[];

  // Step 2: Ad Set Level
  performanceGoal: string;
  conversionEvent: string;
  conversionLocation: string;
  attributionWindow: string;
  dynamicCreative: boolean;
  pixelId: string;
  budgetOptimization: boolean;
  budgetType: "DAILY" | "LIFETIME";
  budgetAmount: number;
  bidStrategy: string;
  bidValue?: number;
  startTime: string;
  endTime: string;
  frequencyCap?: number;
  frequencyCapInterval?: "DAY" | "WEEK" | "MONTH";

  // Step 3: Targeting
  ageMin: number;
  ageMax: number;
  genders: string[];
  locations: string[];
  regions: MetaGeoLocation[];
  cities: MetaGeoLocation[];
  locationTypes: Array<"home" | "recent">;
  interests: string[];
  advantageAudience: boolean;

  // Step 4: Placements
  placementType: "AUTOMATIC" | "MANUAL";
  placements: string[];

  // Step 5: Ad Creative
  pageId: string;
  creativeType: "SINGLE_IMAGE" | "SINGLE_VIDEO" | "CAROUSEL" | "FLEXIBLE";
  primaryText: string;
  headline: string;
  description: string;
  callToAction: string;
  linkUrl: string;
  productId: string;
  displayLink: string;
  urlParameters: string;
  imageUrl: string;
  videoUrl: string;
  carouselCards: CarouselCard[];
  flexibleAssets: { id: string; type: "IMAGE" | "VIDEO"; url: string }[];
  textVariations: TextVariation[];
  headlineVariations: HeadlineVariation[];
  useLeadForm: boolean;
  leadFormId?: string;

  // Advantage+ Creative
  advantageCreative: boolean;
  textGeneration: boolean;
  imageEnhancement: boolean;

  // Status
  status: "ACTIVE" | "PAUSED";
}


interface TargetingOption {
  id: string;
  name: string;
  audience_size?: number;
}

interface CreateAdWizardErrors {
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
