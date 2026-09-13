import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreateAdWizard from "../CreateAdWizard";
import { facebookAdsService } from "../../../services/facebookAdsService";

jest.mock("../../../services/facebookAdsService", () => ({
  facebookAdsService: {
    getAdAccounts: jest.fn(),
    getSavedAdAccounts: jest.fn(),
    getFacebookPageOptions: jest.fn(),
    getFacebookPixels: jest.fn(),
    getPages: jest.fn(),
    getPixels: jest.fn(),
    searchTargetingOptions: jest.fn(),
    getCustomAudiences: jest.fn(),
    getLookalikeAudiences: jest.fn(),
    activateAdAccount: jest.fn(),
  },
}));

jest.mock("../../../utils/i18n-toast", () => ({
  tToast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("../../../services/uploadService", () => ({
  uploadMedia: jest.fn(),
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

jest.mock("../../../components/advertising/ad/StoreProductPickerModal", () => ({
  StoreProductPickerModal: () => null,
}));

jest.mock("../../../components/ErrorBoundary", () => ({
  __esModule: true,
  default: ({ children }: any) => <>{children}</>,
}));

describe("CreateAdWizard End-to-End Step Progression", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (facebookAdsService.getAdAccounts as jest.Mock).mockResolvedValue({
      success: true,
      data: [
        {
          id: "act_1001",
          account_id: "1001",
          name: "Swan Cairo Account",
          currency: "LE", // Currency that previously triggered RangeError
          account_status: 1,
          business: { id: "biz_1", name: "Swan Egypt" },
        },
      ],
    });

    (facebookAdsService.getSavedAdAccounts as jest.Mock).mockResolvedValue({
      success: true,
      data: [
        {
          accountId: "1001",
          name: "Swan Cairo Account",
          currency: "LE",
          isActive: true,
        },
      ],
    });

    (facebookAdsService.getFacebookPageOptions as jest.Mock).mockResolvedValue({
      data: [
        {
          id: "page_100",
          name: "Swan Store Page",
          category: "Shopping & Retail",
          tasks: ["ADVERTISE"],
        },
      ],
      meta: null,
    });

    (facebookAdsService.getFacebookPixels as jest.Mock).mockResolvedValue([
      {
        id: "pix_200",
        name: "Swan Main Pixel",
        is_unavailable: false,
      },
    ]);

    (facebookAdsService.getPages as jest.Mock).mockResolvedValue({
      success: true,
      data: [
        {
          id: "page_100",
          name: "Swan Store Page",
          status: "READY",
        },
      ],
    });

    (facebookAdsService.getPixels as jest.Mock).mockResolvedValue({
      success: true,
      data: [
        {
          id: "pix_200",
          name: "Swan Main Pixel",
        },
      ],
    });

    (facebookAdsService.searchTargetingOptions as jest.Mock).mockResolvedValue([]);
    (facebookAdsService.getCustomAudiences as jest.Mock).mockResolvedValue({ success: true, data: [] });
    (facebookAdsService.getLookalikeAudiences as jest.Mock).mockResolvedValue({ success: true, data: [] });
  });

  it("advances from Step 1 to Step 2 without crashing despite 'LE' currency", async () => {
    render(
      <MemoryRouter initialEntries={["/advertising/facebook-ads/create-ad"]}>
        <CreateAdWizard />
      </MemoryRouter>
    );

    // Verify Step 1 is visible
    expect(screen.getByText(/اسم الحملة|Campaign Name/i)).toBeInTheDocument();

    // Fill Campaign Name
    const nameInputs = screen.getAllByPlaceholderText(/مثال: حملة رمضان|Ramadan Campaign/i);
    fireEvent.change(nameInputs[0], { target: { value: "Live Verification Campaign" } });

    // Select Objective (e.g. Sales)
    const salesBtn = screen.getAllByText(/المبيعات|Sales/i)[0];
    fireEvent.click(salesBtn);

    // Click Next button to transition to Step 2
    const nextBtn = screen.getByRole("button", { name: /التالي|Next/i });
    fireEvent.click(nextBtn);

    // Step 2 should render successfully without throwing "حدث خطأ غير متوقع"
    await waitFor(() => {
      expect(screen.getByText(/حساب Facebook Ads|Facebook Ads Account/i)).toBeInTheDocument();
    });

    // Ensure currency label did not crash and displays safely formatted currency
    expect(screen.getByText(/الحد الأدنى لميتا|Meta Minimum/i)).toBeInTheDocument();
  });
});
