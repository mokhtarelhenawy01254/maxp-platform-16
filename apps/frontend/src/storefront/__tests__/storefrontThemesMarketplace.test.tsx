// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import i18n from "../../i18n";

const mockGetCompanyCatalog = vi.fn();
const mockGetPurchaseHistory = vi.fn();
const mockPurchaseTheme = vi.fn();
const mockApplyTheme = vi.fn();
const mockApiGet = vi.fn();
const mockGetStorefrontSettings = vi.fn();
let mockPreviewLocationReplace = vi.fn();

const installMockStorage = () => {
  let store: Record<string, string> = {};
  const storage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
};

vi.mock("../../services/storefrontThemeCatalogService", () => ({
  storefrontThemeCatalogService: {
    getCompanyCatalog: (...args: unknown[]) => mockGetCompanyCatalog(...args),
    getPurchaseHistory: (...args: unknown[]) => mockGetPurchaseHistory(...args),
    purchaseTheme: (...args: unknown[]) => mockPurchaseTheme(...args),
    applyTheme: (...args: unknown[]) => mockApplyTheme(...args),
  },
}));

vi.mock("../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}));

vi.mock("../../services/storefrontSettingsService", () => ({
  storefrontSettingsService: {
    getSettings: (...args: unknown[]) => mockGetStorefrontSettings(...args),
  },
}));

import StorefrontThemes from "../../pages/marketplace/StorefrontThemes";

const paidTheme = {
  id: "bold-fashion",
  themeId: "bold-fashion",
  slug: "bold-fashion",
  name: "Bold Fashion",
  description: "Fashion storefront",
  pricingModel: "ONE_TIME" as const,
  monthlyPrice: 299,
  yearlyPrice: 0,
  currency: "EGP",
  isActive: true,
  isPublic: true,
  isFeatured: true,
  isOwned: false,
  isCurrentTheme: false,
  canSelect: false,
  canActivate: false,
  canPurchase: true,
  requiresPurchase: true,
  requiresActivation: false,
  trialDays: 0,
  installationId: null,
  installationStatus: null,
  activePricingModel: null,
  trialEndsAt: null,
  validUntil: null,
  nextBillingAt: null,
  preview: {
    colors: ["25 90% 52%", "220 30% 10%", "48 100% 60%"],
    imageUrl: "/assets/themes/smart-bazaar/preview.png",
  },
  pageStats: {
    homeSections: 4,
    shopSections: 2,
    checkoutSections: 2,
    pdpSections: 2,
    cartSections: 1,
    totalSections: 11,
  },
  features: {},
  category: {
    primary: {
      id: "fashion",
      label: "أزياء",
    },
    secondary: {
      id: "fashion-store",
      label: "متجر أزياء",
    },
  },
};

const shoesTheme = {
  ...paidTheme,
  id: "solea-femme",
  themeId: "solea-femme",
  slug: "solea-femme",
  name: "Solea Femme",
  description: "Women's shoes storefront",
  isFeatured: false,
  category: {
    primary: {
      id: "fashion",
      label: "أزياء",
    },
    secondary: {
      id: "womens-shoes",
      label: "أحذية حريمي",
    },
  },
};

const restaurantTheme = {
  ...paidTheme,
  id: "nile-bistro",
  themeId: "nile-bistro",
  slug: "nile-bistro",
  name: "Nile Bistro",
  description: "Restaurant storefront",
  isFeatured: false,
  category: {
    primary: {
      id: "food",
      label: "مطاعم وأغذية",
    },
    secondary: {
      id: "restaurants",
      label: "مطاعم",
    },
  },
};

const biteRushTheme = {
  ...restaurantTheme,
  id: "restaurant-demo",
  themeId: "restaurant-demo",
  slug: "restaurant-demo",
  name: "BiteRush",
  description: "Restaurant storefront demo",
};

const cafeTheme = {
  ...restaurantTheme,
  id: "cafe-demo",
  themeId: "cafe-demo",
  slug: "cafe-demo",
  name: "Müt Coffee",
  description: "Cafe storefront demo",
};

const maxCareGoTheme = {
  ...paidTheme,
  id: "max-care-go",
  themeId: "max-care-go",
  slug: "max-care-go",
  name: "Max Care Go",
  description: "Fast pharmacy storefront demo",
  isFeatured: true,
  category: {
    primary: {
      id: "general",
      label: "عام",
    },
    secondary: {
      id: "medical-fast",
      label: "صيدلية سريعة",
    },
  },
};

describe("StorefrontThemes marketplace page", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    installMockStorage();
    void i18n.changeLanguage("ar");
    vi.clearAllMocks();
    mockPreviewLocationReplace = vi.fn();
    vi.stubGlobal(
      "open",
      vi.fn(() => ({
        opener: window,
        location: {
          replace: mockPreviewLocationReplace,
        },
      })),
    );
    localStorage.setItem("companyId", "cmp_1");
    mockGetCompanyCatalog.mockResolvedValue({
      data: [paidTheme, shoesTheme, restaurantTheme, biteRushTheme, cafeTheme, maxCareGoTheme],
    });
    mockGetPurchaseHistory.mockResolvedValue({
      data: [],
    });
    mockPurchaseTheme.mockResolvedValue({
      theme: {
        ...paidTheme,
        isOwned: true,
        canSelect: true,
        canActivate: true,
        canPurchase: false,
        requiresPurchase: false,
      },
      catalog: [
        {
          ...paidTheme,
          isOwned: true,
          canSelect: true,
          canActivate: true,
          canPurchase: false,
          requiresPurchase: false,
        },
      ],
      installation: { id: "install_1" },
      settings: null,
      wallet: {
        balance: 701,
        currency: "EGP",
      },
    });
    mockApplyTheme.mockResolvedValue({
      theme: {
        ...paidTheme,
        isOwned: true,
        isCurrentTheme: true,
        canSelect: true,
        canPurchase: false,
      },
      catalog: [],
      installation: { id: "install_1" },
      settings: null,
      wallet: null,
    });
    mockApiGet.mockResolvedValue({
      data: {
        data: {
          balance: 1000,
          currency: "EGP",
        },
      },
    });
    mockGetStorefrontSettings.mockResolvedValue({
      data: {
        companyId: "cmp_1",
        companySlug: "merchant-preview",
        customDomain: null,
      },
    });
  });

  it("loads wallet data and purchases a theme from the marketplace", async () => {
    render(
      <MemoryRouter initialEntries={["/marketplace/themes"]}>
        <StorefrontThemes />
      </MemoryRouter>,
    );

    expect(await screen.findByText("متجر قوالب المتجر")).toBeTruthy();
    expect(mockGetCompanyCatalog).toHaveBeenCalledWith("", {
      companyId: "cmp_1",
    });
    expect(await screen.findByText("1000.00 EGP")).toBeTruthy();
    const boldFashionImage = screen.getByRole("img", { name: "Bold Fashion" });
    const boldFashionCard = boldFashionImage.closest(".group") as HTMLElement;
    expect(boldFashionCard).toBeTruthy();
    expect(
      within(boldFashionCard).getByRole("button", { name: "شراء القالب" }),
    ).toBeTruthy();

    fireEvent.click(
      within(boldFashionCard).getByRole("button", { name: "شراء القالب" }),
    );

    await waitFor(() => {
      expect(mockPurchaseTheme).toHaveBeenCalledWith("bold-fashion", {
        companyId: "cmp_1",
      });
    });

    expect(await screen.findByText("تطبيق على المتجر")).toBeTruthy();
    expect(await screen.findByText("701.00 EGP")).toBeTruthy();
  });

  it("opens preview mode in a new tab for the selected theme", async () => {
    render(
      <MemoryRouter initialEntries={["/marketplace/themes"]}>
        <StorefrontThemes />
      </MemoryRouter>,
    );

    const boldFashionImage = await screen.findByRole("img", {
      name: "Bold Fashion",
    });
    const boldFashionCard = boldFashionImage.closest(".group") as HTMLElement;
    fireEvent.click(
      within(boldFashionCard).getByRole("button", { name: "معاينة القالب" }),
    );

    const [, target] =
      vi.mocked(window.open).mock.calls[0] || [];
    const openedUrl = mockPreviewLocationReplace.mock.calls[0]?.[0];
    const parsed = new URL(String(openedUrl));

    expect(target).toBe("_blank");
    expect(vi.mocked(window.open).mock.calls[0]?.[0]).toBe("");
    expect(parsed.origin).toBe(window.location.origin);
    expect(parsed.pathname).toBe("/store");
    expect(parsed.searchParams.get("companyId")).toBe("cmp_1");
    expect(parsed.searchParams.get("previewTheme")).toBe("bold-fashion");
    expect(parsed.searchParams.get("previewSource")).toBe("marketplace");
  });

  it("opens BiteRush through the storefront preview instead of the standalone demo route", async () => {
    render(
      <MemoryRouter initialEntries={["/marketplace/themes"]}>
        <StorefrontThemes />
      </MemoryRouter>,
    );

    const biteRushImage = await screen.findByRole("img", {
      name: "BiteRush",
    });
    const biteRushCard = biteRushImage.closest(".group") as HTMLElement;
    fireEvent.click(
      within(biteRushCard).getByRole("button", { name: "معاينة القالب" }),
    );

    const [, target] =
      vi.mocked(window.open).mock.calls.at(-1) || [];
    const openedUrl = mockPreviewLocationReplace.mock.calls.at(-1)?.[0];
    const parsed = new URL(String(openedUrl));

    expect(target).toBe("_blank");
    expect(vi.mocked(window.open).mock.calls.at(-1)?.[0]).toBe("");
    expect(parsed.origin).toBe(window.location.origin);
    expect(parsed.pathname).toBe("/store");
    expect(parsed.searchParams.get("companyId")).toBe("cmp_1");
    expect(parsed.searchParams.get("previewTheme")).toBe("restaurant-demo");
    expect(String(openedUrl)).not.toContain("/theme-demo/restaurant");
  });

  it("opens Müt Coffee through the storefront preview instead of the standalone cafe demo", async () => {
    render(
      <MemoryRouter initialEntries={["/marketplace/themes"]}>
        <StorefrontThemes />
      </MemoryRouter>,
    );

    const cafeImage = await screen.findByRole("img", {
      name: "Müt Coffee",
    });
    const cafeCard = cafeImage.closest(".group") as HTMLElement;
    fireEvent.click(
      within(cafeCard).getByRole("button", { name: "معاينة القالب" }),
    );

    const [, target] =
      vi.mocked(window.open).mock.calls.at(-1) || [];
    const openedUrl = mockPreviewLocationReplace.mock.calls.at(-1)?.[0];
    const parsed = new URL(String(openedUrl));

    expect(target).toBe("_blank");
    expect(vi.mocked(window.open).mock.calls.at(-1)?.[0]).toBe("");
    expect(parsed.origin).toBe(window.location.origin);
    expect(parsed.pathname).toBe("/store");
    expect(parsed.searchParams.get("companyId")).toBe("cmp_1");
    expect(parsed.searchParams.get("previewTheme")).toBe("cafe-demo");
    expect(String(openedUrl)).not.toContain("/cafe-demo");
  });

  it("renders Max Care Go as the surviving pharmacy preview and opens it through the storefront", async () => {
    render(
      <MemoryRouter initialEntries={["/marketplace/themes"]}>
        <StorefrontThemes />
      </MemoryRouter>,
    );

    const aliasImage = await screen.findByRole("img", {
      name: "Max Care Go",
    });
    const aliasCard = aliasImage.closest(".group") as HTMLElement;

    expect(aliasCard).toBeTruthy();
    expect(within(aliasCard).getAllByText("Max Care Go").length).toBeGreaterThan(0);

    fireEvent.click(
      within(aliasCard).getByRole("button", { name: "معاينة القالب" }),
    );

    const openedUrl = mockPreviewLocationReplace.mock.calls.at(-1)?.[0];
    const parsed = new URL(String(openedUrl));

    expect(parsed.origin).toBe(window.location.origin);
    expect(parsed.pathname).toBe("/store");
    expect(parsed.searchParams.get("companyId")).toBe("cmp_1");
    expect(parsed.searchParams.get("previewTheme")).toBe("max-care-go");
    expect(String(openedUrl)).not.toContain("/theme-demo/pharmacy");
  });

  it("finds Max Care Go when searching by the full theme name", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/marketplace/themes"]}>
        <StorefrontThemes />
      </MemoryRouter>,
    );

    const searchInput = await screen.findByPlaceholderText(
      "ابحث عن اسم قالب أو ميزة أو نوع النشاط...",
    );

    await user.clear(searchInput);
    await user.type(searchInput, "Max Care Go");

    expect(await screen.findByRole("img", { name: "Max Care Go" })).toBeTruthy();
    expect(screen.queryByText("لم يتم العثور على قوالب ضمن التصنيف الحالي")).toBeNull();
  });

  it("restores category filters from the URL query string", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/marketplace/themes?category=fashion&subcategory=womens-shoes",
        ]}
      >
        <StorefrontThemes />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("img", { name: "Solea Femme" }),
    ).toBeTruthy();
    expect(screen.queryByRole("img", { name: "Bold Fashion" })).toBeNull();
    expect(screen.queryByRole("img", { name: "Nile Bistro" })).toBeNull();
    expect(screen.getByText("عرض 1 قالب من أصل 6")).toBeTruthy();
  });
});
