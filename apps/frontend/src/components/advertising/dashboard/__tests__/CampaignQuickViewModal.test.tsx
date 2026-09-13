import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CampaignQuickViewModal from "../CampaignQuickViewModal";
import type { FacebookCampaign } from "../../../../services/facebookAdsService";

jest.mock("../../../../services/facebookAdsService", () => ({
  facebookAdsService: {
    getCampaign: jest.fn().mockResolvedValue({}),
    getCampaignInsights: jest.fn().mockResolvedValue({}),
    updateCampaign: jest.fn().mockResolvedValue({}),
    pauseCampaign: jest.fn().mockResolvedValue({}),
    resumeCampaign: jest.fn().mockResolvedValue({}),
  },
  CAMPAIGN_OBJECTIVES: [
    { value: "OUTCOME_SALES", label: "المبيعات والتحويلات" },
    { value: "OUTCOME_TRAFFIC", label: "زيارات الموقع" },
  ],
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const mockCampaign: FacebookCampaign = {
  id: "camp-123",
  companyId: "comp-1",
  name: "حملة الصيف للملابس",
  objective: "OUTCOME_SALES",
  status: "ACTIVE",
  effectiveStatus: "ACTIVE",
  budgetType: "DAILY",
  budgetAmount: 500,
  facebookCampaignId: "meta-camp-999",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  deliveryReadiness: {
    isDeliverable: true,
    status: "DELIVERING",
    label: "يسلم فعلياً",
    reasons: [],
    counts: {
      adSetsTotal: 2,
      adSetsActive: 2,
      adsTotal: 4,
      adsActive: 3,
      adsActiveInActiveAdSets: 3,
      adSetStatuses: {},
      adStatuses: {},
    },
  },
  adSets: [
    {
      id: "adset-1",
      campaignId: "camp-123",
      name: "مجموعة القاهرة والجيزة",
      status: "ACTIVE",
      budgetType: "DAILY",
      budgetAmount: 250,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
      ads: [
        {
          id: "ad-1",
          adSetId: "adset-1",
          companyId: "comp-1",
          name: "إعلان فيديو رئيسي",
          status: "ACTIVE",
          creativeType: "SINGLE_VIDEO",
          primaryText: "عروض الصيف",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
    },
  ],
};

describe("CampaignQuickViewModal", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <MemoryRouter>
        <CampaignQuickViewModal
          isOpen={false}
          campaign={mockCampaign}
          selectedCurrency="EGP"
          selectedAdAccountId="act_123"
          onClose={jest.fn()}
        />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders campaign summary, telemetry and tabs when open", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <CampaignQuickViewModal
            isOpen={true}
            campaign={mockCampaign}
            performance={{
              spend: 250,
              impressions: 12000,
              clicks: 340,
              ctr: 2.83,
              cpc: 0.73,
              cpa: 50,
              roas: 3.2,
              purchases: 5,
              purchaseValue: 800,
              frequency: 1.2,
            }}
            selectedCurrency="EGP"
            selectedAdAccountId="act_123"
            onClose={jest.fn()}
          />
        </MemoryRouter>,
      );
    });

    // Verify campaign name and ID are visible
    expect(screen.getByDisplayValue("حملة الصيف للملابس")).toBeInTheDocument();
    expect(screen.getByText(/ID: meta-camp-999/)).toBeInTheDocument();

    // Verify telemetry metrics
    expect(screen.getByText(/3.2x/)).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("diagnoses weaknesses such as budget bleed when spend is high with 0 purchases", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <CampaignQuickViewModal
            isOpen={true}
            campaign={mockCampaign}
            performance={{
              spend: 300,
              impressions: 10000,
              clicks: 120,
              ctr: 0.6,
              cpc: 2.5,
              cpa: 0,
              roas: 0,
              purchases: 0,
              purchaseValue: 0,
              frequency: 3.2,
            }}
            selectedCurrency="EGP"
            selectedAdAccountId="act_123"
            onClose={jest.fn()}
          />
        </MemoryRouter>,
      );
    });

    // Click on weaknesses tab
    const weaknessesTab = screen.getByText(/نقاط الضعف والتشخيص/);
    fireEvent.click(weaknessesTab);

    // Verify critical bleed weakness is diagnosed
    expect(screen.getByText(/نزيف ميزانية حرج/)).toBeInTheDocument();
    // Verify weak hook weakness is diagnosed (CTR 0.6% < 1%)
    expect(screen.getByText(/ضعف الـ Hook/)).toBeInTheDocument();
    // Verify audience fatigue is diagnosed (Frequency 3.2 >= 2.8)
    expect(screen.getByText(/إرهاق الجمهور/)).toBeInTheDocument();
  });
});
