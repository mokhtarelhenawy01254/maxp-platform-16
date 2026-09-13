import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Step5Creative } from "../wizard/components/Step5Creative";
import uploadService from "../../../services/uploadService";
import type { FormData } from "../wizard/types";

// Mock uploadService & apiClient
jest.mock("../../../services/uploadService", () => ({
  uploadMedia: jest.fn(),
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock("../../../components/advertising/ad/StoreProductPickerModal", () => ({
  StoreProductPickerModal: () => null,
}));

const mockFormData: FormData = {
  campaignName: "Test Campaign",
  adSetName: "Test AdSet",
  adName: "Test Ad",
  objective: "OUTCOME_SALES",
  specialAdCategories: [],
  pageId: "page-123",
  instagramActorId: "",
  creativeType: "SINGLE_IMAGE",
  headline: "Ad Headline",
  primaryText: "Ad Primary Text",
  description: "Ad Description",
  callToAction: "SHOP_NOW",
  linkUrl: "https://example.com/shop",
  productId: "",
  displayLink: "",
  urlParameters: "",
  imageUrl: "",
  videoUrl: "",
  carouselCards: [
    {
      id: "card-1",
      imageUrl: "",
      headline: "Card 1",
      description: "Desc 1",
      linkUrl: "https://example.com/1",
    },
    {
      id: "card-2",
      imageUrl: "",
      headline: "Card 2",
      description: "Desc 2",
      linkUrl: "https://example.com/2",
    },
  ],
  flexibleAssets: [],
  textVariations: [],
  headlineVariations: [],
  useLeadForm: false,
  advantageCreative: true,
  textGeneration: true,
  imageEnhancement: true,
  performanceGoal: "MAXIMIZE_CONVERSIONS",
  conversionEvent: "PURCHASE",
  conversionLocation: "WEBSITE",
  attributionWindow: "7d_click_1d_view",
  dynamicCreative: false,
  budgetOptimization: true,
  budgetType: "DAILY",
  budgetAmount: 100,
  bidStrategy: "LOWEST_COST",
  locations: ["EG"],
  locationTypes: ["home"],
  ageMin: 18,
  ageMax: 65,
  genders: [1, 2],
  interests: [],
  behaviors: [],
  demographics: [],
  languages: [],
  customAudiences: [],
  excludedCustomAudiences: [],
  advantageAudience: true,
  placementType: "AUTOMATIC",
  publisherPlatforms: ["facebook", "instagram"],
  facebookPositions: ["feed"],
  instagramPositions: ["stream"],
  messengerPositions: [],
  audienceNetworkPositions: [],
  devicePlatforms: ["mobile", "desktop"],
};

describe("Step5Creative Media Upload Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders upload area and triggers file selection when clicked", () => {
    const handleChange = jest.fn();
    const setFormData = jest.fn();

    render(
      <MemoryRouter>
        <Step5Creative
          formData={mockFormData}
          setFormData={setFormData}
          handleChange={handleChange}
          getError={() => ""}
          facebookPages={[{ id: "page-123", name: "My Store Page", access_token: "token" }]}
        />
      </MemoryRouter>
    );

    const fileInput = document.querySelector("#media-upload") as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    expect(fileInput.disabled).toBe(false);
  });

  it("uploads image successfully and updates formData.imageUrl", async () => {
    const handleChange = jest.fn();
    const setFormData = jest.fn();
    (uploadService.uploadMedia as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        url: "/uploads/media/test-creative.png",
        fullUrl: "https://maxp.online/uploads/media/test-creative.png",
      },
    });

    render(
      <MemoryRouter>
        <Step5Creative
          formData={mockFormData}
          setFormData={setFormData}
          handleChange={handleChange}
          getError={() => ""}
          facebookPages={[{ id: "page-123", name: "My Store Page", access_token: "token" }]}
        />
      </MemoryRouter>
    );

    const fileInput = document.querySelector("#media-upload") as HTMLInputElement;
    const testFile = new File(["fake-image"], "product.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(uploadService.uploadMedia).toHaveBeenCalledWith(testFile, expect.any(Function));
      expect(handleChange).toHaveBeenCalledWith("imageUrl", "https://maxp.online/uploads/media/test-creative.png");
    });
  });

  it("renders preview with remove and change buttons when imageUrl is present", () => {
    const handleChange = jest.fn();
    const setFormData = jest.fn();

    const dataWithImage = {
      ...mockFormData,
      imageUrl: "https://maxp.online/uploads/media/test-creative.png",
    };

    render(
      <MemoryRouter>
        <Step5Creative
          formData={dataWithImage}
          setFormData={setFormData}
          handleChange={handleChange}
          getError={() => ""}
          facebookPages={[{ id: "page-123", name: "My Store Page", access_token: "token" }]}
        />
      </MemoryRouter>
    );

    const previewImg = screen.getByAltText("Ad Creative");
    expect(previewImg).toBeInTheDocument();
    expect(previewImg).toHaveAttribute("src", "https://maxp.online/uploads/media/test-creative.png");

    const removeBtn = screen.getByRole("button", { name: /حذف|Remove/i });
    fireEvent.click(removeBtn);
    expect(handleChange).toHaveBeenCalledWith("imageUrl", "");
  });

  it("handles video upload for SINGLE_VIDEO creative format", async () => {
    const handleChange = jest.fn();
    const setFormData = jest.fn();
    (uploadService.uploadMedia as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        url: "/uploads/media/reel.mp4",
        fullUrl: "https://maxp.online/uploads/media/reel.mp4",
      },
    });

    const videoFormData = {
      ...mockFormData,
      creativeType: "SINGLE_VIDEO" as const,
    };

    render(
      <MemoryRouter>
        <Step5Creative
          formData={videoFormData}
          setFormData={setFormData}
          handleChange={handleChange}
          getError={() => ""}
          facebookPages={[{ id: "page-123", name: "My Store Page", access_token: "token" }]}
        />
      </MemoryRouter>
    );

    const fileInput = document.querySelector("#media-upload") as HTMLInputElement;
    const testVideo = new File(["fake-video"], "ad.mp4", { type: "video/mp4" });

    fireEvent.change(fileInput, { target: { files: [testVideo] } });

    await waitFor(() => {
      expect(uploadService.uploadMedia).toHaveBeenCalledWith(testVideo, expect.any(Function));
      expect(handleChange).toHaveBeenCalledWith("videoUrl", "https://maxp.online/uploads/media/reel.mp4");
    });
  });
});
