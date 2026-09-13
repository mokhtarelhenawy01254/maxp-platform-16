import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Step2BudgetSchedule } from "../wizard/components/Step2BudgetSchedule";
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
  placementType: "ADVANTAGE",
  placements: [],
  deviceTypes: ["mobile", "desktop"],

  // Step 5
  pageId: "page_123",
  creativeType: "SINGLE_IMAGE",
  primaryText: "Great offer!",
  headline: "Buy Now",
  description: "Best quality",
  callToAction: "SHOP_NOW",
  linkUrl: "https://example.com/product",
  imageUrl: "https://example.com/image.jpg",
  videoUrl: "",
  carouselCards: [],
  flexibleAssets: [],
  textVariations: [],
  headlineVariations: [],
  status: "PAUSED",
};

describe("Step2BudgetSchedule Component Edge Cases", () => {
  it("renders safely with invalid currency code 'LE' without throwing RangeError", () => {
    render(
      <MemoryRouter>
        <Step2BudgetSchedule
          formData={baseFormData}
          setFormData={jest.fn()}
          handleChange={jest.fn()}
          getError={jest.fn(() => "")}
          selectedAdAccountIsActive={true}
          loadingAdAccounts={false}
          adAccounts={[]}
          selectedAdAccountId="12345"
          setSelectedAdAccountId={jest.fn()}
          setPublishAccountConfirmed={jest.fn()}
          setFacebookPixels={jest.fn()}
          loadPagesAndPixels={jest.fn().mockResolvedValue(undefined)}
          savedAdAccounts={[]}
          syncingAdAccount={false}
          handleActivateSelectedAdAccount={jest.fn().mockResolvedValue(undefined)}
          loadingPixels={false}
          facebookPixels={[]}
          selectedAdAccountCurrency="LE"
          compatibleAttributionWindows={[]}
        />
      </MemoryRouter>
    );

    // Assert that the component rendered without crashing
    expect(screen.getByText(/حساب Facebook Ads|Facebook Ads Account/i)).toBeInTheDocument();
  });

  it("handles null / undefined optional props and arrays safely", () => {
    render(
      <MemoryRouter>
        <Step2BudgetSchedule
          formData={baseFormData}
          setFormData={jest.fn()}
          handleChange={jest.fn()}
          getError={jest.fn(() => "")}
          selectedAdAccountIsActive={false}
          loadingAdAccounts={false}
          adAccounts={undefined as any}
          selectedAdAccountId=""
          setSelectedAdAccountId={jest.fn()}
          setPublishAccountConfirmed={jest.fn()}
          setFacebookPixels={jest.fn()}
          loadPagesAndPixels={jest.fn().mockResolvedValue(undefined)}
          savedAdAccounts={undefined as any}
          syncingAdAccount={false}
          handleActivateSelectedAdAccount={jest.fn().mockResolvedValue(undefined)}
          loadingPixels={false}
          facebookPixels={undefined as any}
          selectedAdAccountCurrency="   "
          compatibleAttributionWindows={undefined as any}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/حساب Facebook Ads|Facebook Ads Account/i)).toBeInTheDocument();
  });

  it("renders ad accounts and pixels correctly when provided", () => {
    const mockAccounts = [
      {
        id: "act_12345",
        account_id: "12345",
        name: "MaxP Production Account",
        currency: "EGP",
        account_status: 1,
        business: { id: "biz_1", name: "MaxP Corp" },
      },
    ] as any;

    const mockPixels = [
      {
        id: "pix_999",
        name: "Main Store Pixel",
        is_unavailable: false,
      },
    ] as any;

    render(
      <MemoryRouter>
        <Step2BudgetSchedule
          formData={baseFormData}
          setFormData={jest.fn()}
          handleChange={jest.fn()}
          getError={jest.fn(() => "")}
          selectedAdAccountIsActive={true}
          loadingAdAccounts={false}
          adAccounts={mockAccounts}
          selectedAdAccountId="12345"
          setSelectedAdAccountId={jest.fn()}
          setPublishAccountConfirmed={jest.fn()}
          setFacebookPixels={jest.fn()}
          loadPagesAndPixels={jest.fn().mockResolvedValue(undefined)}
          savedAdAccounts={[]}
          syncingAdAccount={false}
          handleActivateSelectedAdAccount={jest.fn().mockResolvedValue(undefined)}
          loadingPixels={false}
          facebookPixels={mockPixels}
          selectedAdAccountCurrency="EGP"
          compatibleAttributionWindows={[
            {
              value: "7d_click_1d_view",
              label: "7 Days Click, 1 Day View",
              description: "Standard attribution",
            },
          ]}
        />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/MaxP Production Account/i).length).toBeGreaterThan(0);
  });
});
