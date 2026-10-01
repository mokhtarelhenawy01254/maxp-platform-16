import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { toast } from "sonner";

import MarketplaceAppsManagement from "../MarketplaceAppsManagement";

jest.mock("axios");
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock("../../../utils/urlHelper", () => ({
  buildApiUrl: (endpoint: string) => endpoint,
}));
jest.mock("../../subscription/AppPricingSheet", () => ({
  __esModule: true,
  default: () => null,
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedToast = toast as unknown as {
  success: jest.Mock;
  error: jest.Mock;
};

const originalPointerEvent = globalThis.PointerEvent;

const storefrontThemesPayload = [
  {
    id: "bold-fashion",
    themeId: "bold-fashion",
    slug: "bold-fashion",
    appId: "app_theme_bold",
    name: "Bold Fashion",
    description: "قالب أزياء قوي.",
    pricingModel: "FREE",
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: "EGP",
    isActive: false,
    isPublic: false,
    isFeatured: false,
    isOwned: false,
    isCurrentTheme: false,
    canSelect: false,
    canActivate: false,
    canPurchase: false,
    requiresPurchase: false,
    requiresActivation: true,
    trialDays: 0,
    installationId: null,
    installationStatus: null,
    activePricingModel: null,
    trialEndsAt: null,
    validUntil: null,
    nextBillingAt: null,
    preview: {
      colors: ["340 82% 52%"],
    },
    pageStats: {
      homeSections: 4,
      shopSections: 3,
      checkoutSections: 1,
      pdpSections: 2,
      cartSections: 1,
      totalSections: 11,
    },
    usageStats: {
      installations: 3,
      activeInstallations: 2,
      purchases: 1,
      currentCompanies: 1,
      installCount: 3,
    },
    features: {},
  },
  {
    id: "smart-bazaar",
    themeId: "smart-bazaar",
    slug: "smart-bazaar",
    appId: "app_theme_smart",
    name: "Smart Bazaar",
    description: "قالب متجر عام.",
    pricingModel: "FREE",
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: "EGP",
    isActive: true,
    isPublic: false,
    isFeatured: false,
    isOwned: false,
    isCurrentTheme: false,
    canSelect: false,
    canActivate: false,
    canPurchase: false,
    requiresPurchase: false,
    requiresActivation: true,
    trialDays: 0,
    installationId: null,
    installationStatus: null,
    activePricingModel: null,
    trialEndsAt: null,
    validUntil: null,
    nextBillingAt: null,
    preview: {
      colors: ["210 90% 50%"],
    },
    pageStats: {
      homeSections: 5,
      shopSections: 4,
      checkoutSections: 1,
      pdpSections: 2,
      cartSections: 1,
      totalSections: 13,
    },
    usageStats: {
      installations: 0,
      activeInstallations: 0,
      purchases: 0,
      currentCompanies: 0,
      installCount: 0,
    },
    features: {},
  },
];

describe("MarketplaceAppsManagement storefront themes bulk actions", () => {
  beforeAll(() => {
    if (!globalThis.PointerEvent) {
      Object.defineProperty(globalThis, "PointerEvent", {
        configurable: true,
        writable: true,
        value: MouseEvent,
      });
    }
  });

  afterAll(() => {
    Object.defineProperty(globalThis, "PointerEvent", {
      configurable: true,
      writable: true,
      value: originalPointerEvent,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (global.localStorage.getItem as jest.Mock).mockReturnValue("test-token");
    mockedAxios.get.mockImplementation((url: string) => {
      if (String(url).includes("super-admin/storefront-theme-catalog")) {
        return Promise.resolve({
          data: {
            success: true,
            data: storefrontThemesPayload,
          },
        });
      }

      return Promise.reject(new Error(`Unexpected GET URL: ${url}`));
    });
    mockedAxios.put.mockResolvedValue({
      data: { success: true },
    });
    mockedAxios.post.mockResolvedValue({
      data: { success: true },
    });
  });

  test("bulk action enables and shows every storefront theme", async () => {
    render(
      <MarketplaceAppsManagement
        storefrontThemesOnly
        pageTitle="إدارة القوالب"
        pageDescription="اختبار"
      />,
    );

    expect(await screen.findByText("كتالوج قوالب المتجر")).toBeInTheDocument();
    expect(
      screen.getByText(/يوجد 2 قالب غير ظاهر للشركات أو غير متاح للتفعيل/i),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /إظهار وتفعيل كل القوالب/i }),
    );

    await waitFor(() => expect(mockedAxios.put).toHaveBeenCalledTimes(2));

    expect(mockedAxios.put).toHaveBeenCalledWith(
      "super-admin/storefront-theme-catalog/bold-fashion",
      expect.objectContaining({
        isActive: true,
        isPublic: true,
      }),
      expect.any(Object),
    );
    expect(mockedAxios.put).toHaveBeenCalledWith(
      "super-admin/storefront-theme-catalog/smart-bazaar",
      expect.objectContaining({
        isActive: true,
        isPublic: true,
      }),
      expect.any(Object),
    );

    await waitFor(() =>
      expect(mockedToast.success).toHaveBeenCalledWith(
        "تم إظهار وتفعيل كل القوالب",
      ),
    );
  });

  test("filters storefront themes by search query", async () => {
    render(
      <MarketplaceAppsManagement
        storefrontThemesOnly
        pageTitle="إدارة القوالب"
        pageDescription="اختبار"
      />,
    );

    expect(await screen.findByText("Bold Fashion")).toBeInTheDocument();
    expect(screen.getByText("Smart Bazaar")).toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText(/ابحث بالاسم أو الوصف أو themeId/i),
      {
        target: { value: "bold" },
      },
    );

    expect(screen.getByText("Bold Fashion")).toBeInTheDocument();
    expect(screen.queryByText("Smart Bazaar")).not.toBeInTheDocument();
  });

  test("archives selected storefront themes without deleting them", async () => {
    render(
      <MarketplaceAppsManagement
        storefrontThemesOnly
        pageTitle="إدارة القوالب"
        pageDescription="اختبار"
      />,
    );

    expect(await screen.findByText("كتالوج قوالب المتجر")).toBeInTheDocument();

    const selectDisplayedCheckbox = screen.getAllByLabelText("تحديد المعروض")[0];
    if (!selectDisplayedCheckbox) {
      throw new Error("Select displayed themes checkbox was not rendered");
    }
    fireEvent.click(selectDisplayedCheckbox);
    expect(await screen.findByText(/2 قالب محدد/i)).toBeInTheDocument();
    expect(screen.getByText(/مستخدم حاليًا لدى 1 شركة/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /أرشفة المحدد/i }));

    fireEvent.click(screen.getByRole("button", { name: /^أرشفة$/i }));
    await waitFor(() => expect(mockedAxios.put).toHaveBeenCalledTimes(2));

    expect(mockedAxios.put).toHaveBeenCalledWith(
      "super-admin/storefront-theme-catalog/bold-fashion",
      expect.objectContaining({
        isActive: false,
        isPublic: false,
      }),
      expect.any(Object),
    );
    expect(mockedToast.success).toHaveBeenCalledWith(
      "تمت أرشفة القوالب المحددة",
    );
  });


  test("sets a storefront theme as the default for new stores", async () => {
    render(
      <MarketplaceAppsManagement
        storefrontThemesOnly
        pageTitle="إدارة القوالب"
        pageDescription="اختبار"
      />,
    );

    expect(await screen.findByText("Bold Fashion")).toBeInTheDocument();

    fireEvent.click(
      screen.getAllByRole("button", { name: /تعيين كافتراضي/i })[0],
    );

    fireEvent.click(screen.getByRole("button", { name: /^تعيين$/i }));

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledTimes(1));
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "super-admin/storefront-theme-catalog/bold-fashion/default",
      {},
      expect.any(Object),
    );
    expect(mockedToast.success).toHaveBeenCalledWith(
      "تم تعيين القالب الافتراضي للمتاجر الجديدة",
    );
  });

});
