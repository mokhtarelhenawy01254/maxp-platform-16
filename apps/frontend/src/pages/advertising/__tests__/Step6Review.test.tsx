import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Step6Review } from "../wizard/components/Step6Review";
import type { FormData } from "../wizard/types";

const baseFormData: FormData = {
  campaignName: "Test Campaign",
  adSetName: "Test AdSet",
  adName: "Test Ad",
  objective: "OUTCOME_SALES",
  specialAdCategories: [],
  isSplitTest: false,
  splitTestVariable: "CREATIVE",
  spendLimit: undefined,

  // Step 2
  performanceGoal: "MAXIMIZE_CONVERSIONS",
  conversionEvent: "PURCHASE",
  conversionLocation: "WEBSITE",
  attributionWindow: "7d_click_1d_view",
  dynamicCreative: false,
  pixelId: "123456",
  budgetOptimization: true,
  budgetType: "DAILY",
  budgetAmount: 250,
  bidStrategy: "LOWEST_COST",
  bidValue: undefined,
  startTime: "",
  endTime: "",
  frequencyCap: undefined,
  frequencyCapInterval: undefined,
  adSchedulingEnabled: false,
  adScheduleStartHour: 0,
  adScheduleEndHour: 24,
  adScheduleDays: [1, 2, 3, 4, 5, 6, 7],
  adSetSpendLimitsEnabled: false,
  adSetMinDailySpend: undefined,
  adSetMaxDailySpend: undefined,

  // Step 3
  locations: ["EG"],
  regions: [],
  cities: [],
  locationTypes: ["home", "recent"],
  ageMin: 18,
  ageMax: 65,
  genders: [1, 2],
  interests: [],
  behaviors: [],
  demographics: [],
  languages: [],
  devicePlatforms: [],
  relationshipStatuses: [],
  educationStatuses: [],
  customAudiences: [],
  lookalikeAudiences: [],
  excludedCustomAudiences: [],
  advantageAudience: true,

  // Step 4
  placementType: "AUTOMATIC",
  placements: [],
  publisherPlatforms: ["facebook", "instagram"],
  facebookPositions: [],
  instagramPositions: [],
  deviceTypes: ["mobile", "desktop"],

  // Step 5
  pageId: "page_123",
  creativeType: "SINGLE_IMAGE",
  primaryText: "Great product",
  headline: "Buy now",
  description: "Best deal",
  callToAction: "SHOP_NOW",
  imageUrl: "https://example.com/image.jpg",
  videoUrl: "",
  carouselCards: [],
  linkUrl: "https://example.com",
  displayUrl: "",
  urlParameters: "",
  flexibleAssets: [],
  textVariations: [],
  headlineVariations: [],
  whatsappGreeting: "Hello",
  whatsappQuickFaqs: [],
  useLeadForm: false,
  leadFormId: undefined,
  instagramActorId: "",
  multiAdvertiserAds: true,
  advantageCreative: false,
  textGeneration: false,
  imageEnhancement: false,

  // Status
  status: "PAUSED",
};

describe("Step6Review Component Edge Cases", () => {
  it("handles null / undefined optional props and arrays safely", () => {
    render(
      <MemoryRouter>
        <Step6Review
          createdFullAd={null}
          formData={baseFormData}
          handleChange={jest.fn()}
          selectedBusinessName="Test Business"
          selectedAdAccountName="Test Ad Account"
          selectedAdAccountId="act_123"
          selectedFacebookPage={undefined}
          selectedFacebookPixel={undefined}
          selectedAdAccountCurrency=""
          selectedInterests={undefined as any}
          selectedCustomAudiences={undefined as any}
          customAudiences={undefined as any}
          selectedLookalikeAudiences={undefined as any}
          lookalikeAudiences={undefined as any}
        />
      </MemoryRouter>
    );
  });

  it("handles invalid currencies like LE or spaces without throwing RangeError", () => {
    render(
      <MemoryRouter>
        <Step6Review
          createdFullAd={null}
          formData={baseFormData}
          handleChange={jest.fn()}
          selectedBusinessName="Test Business"
          selectedAdAccountName="Test Ad Account"
          selectedAdAccountId="act_123"
          selectedFacebookPage={undefined}
          selectedFacebookPixel={undefined}
          selectedAdAccountCurrency="LE"
          selectedInterests={[]}
          selectedCustomAudiences={[]}
          customAudiences={[]}
          selectedLookalikeAudiences={[]}
          lookalikeAudiences={[]}
        />
      </MemoryRouter>
    );
  });

  it("handles regions and cities with missing names or undefined", () => {
    const formDataWithRegions: FormData = {
      ...baseFormData,
      regions: [
        { name: "Cairo" },
        { name: undefined as any },
        null as any,
      ],
      cities: [
        { name: "Nasr City" },
        null as any,
      ],
    };

    render(
      <MemoryRouter>
        <Step6Review
          createdFullAd={null}
          formData={formDataWithRegions}
          handleChange={jest.fn()}
          selectedBusinessName="Test Business"
          selectedAdAccountName="Test Ad Account"
          selectedAdAccountId="act_123"
          selectedFacebookPage={undefined}
          selectedFacebookPixel={undefined}
          selectedAdAccountCurrency="EGP"
          selectedInterests={[]}
          selectedCustomAudiences={[]}
          customAudiences={[]}
          selectedLookalikeAudiences={[]}
          lookalikeAudiences={[]}
        />
      </MemoryRouter>
    );
  });

  it("handles creativeType = FLEXIBLE when flexibleAssets is undefined", () => {
    const formDataFlexible: FormData = {
      ...baseFormData,
      creativeType: "FLEXIBLE",
      flexibleAssets: undefined as any,
    };

    render(
      <MemoryRouter>
        <Step6Review
          createdFullAd={null}
          formData={formDataFlexible}
          handleChange={jest.fn()}
          selectedBusinessName="Test Business"
          selectedAdAccountName="Test Ad Account"
          selectedAdAccountId="act_123"
          selectedFacebookPage={undefined}
          selectedFacebookPixel={undefined}
          selectedAdAccountCurrency="EGP"
          selectedInterests={[]}
          selectedCustomAudiences={[]}
          customAudiences={[]}
          selectedLookalikeAudiences={[]}
          lookalikeAudiences={[]}
        />
      </MemoryRouter>
    );
  });

  it("handles creativeType = EXISTING_POST safely", () => {
    const formDataPost: FormData = {
      ...baseFormData,
      creativeType: "EXISTING_POST",
      postId: "123_456",
    };

    render(
      <MemoryRouter>
        <Step6Review
          createdFullAd={null}
          formData={formDataPost}
          handleChange={jest.fn()}
          selectedBusinessName="Test Business"
          selectedAdAccountName="Test Ad Account"
          selectedAdAccountId="act_123"
          selectedFacebookPage={undefined}
          selectedFacebookPixel={undefined}
          selectedAdAccountCurrency="EGP"
          selectedInterests={[]}
          selectedCustomAudiences={[]}
          customAudiences={[]}
          selectedLookalikeAudiences={[]}
          lookalikeAudiences={[]}
        />
      </MemoryRouter>
    );
  });
});
