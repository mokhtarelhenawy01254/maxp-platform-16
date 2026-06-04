// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConversionStack from "../sections/ConversionStack";

const {
  mockUseProduct,
  mockUseStorefrontSettings,
  mockGetMarketplaceSettings,
  mockIsMarketplaceEnabled,
  mockTrackUsage,
} = vi.hoisted(() => ({
  mockUseProduct: vi.fn(),
  mockUseStorefrontSettings: vi.fn(),
  mockGetMarketplaceSettings: vi.fn(),
  mockIsMarketplaceEnabled: vi.fn(),
  mockTrackUsage: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "product-1" }),
}));

vi.mock("../hooks/useProduct", () => ({
  useProduct: mockUseProduct,
}));

vi.mock("../hooks/useStorefrontSettings", () => ({
  useStorefrontSettings: mockUseStorefrontSettings,
}));

vi.mock("../utils/marketplaceApps", () => ({
  getStorefrontMarketplaceAppSettings: (...args: unknown[]) =>
    mockGetMarketplaceSettings(...args),
  isStorefrontMarketplaceAppEnabled: (...args: unknown[]) =>
    mockIsMarketplaceEnabled(...args),
}));

vi.mock("../utils/appUsageTracking", () => ({
  trackStorefrontAppUsage: (...args: unknown[]) => mockTrackUsage(...args),
}));

vi.mock("../engine/ThemeProvider", () => ({
  useStorefrontTheme: () => ({
    theme: {
      id: "modern-minimal",
      direction: "ltr",
    },
  }),
}));

vi.mock("../../components/VolumeDiscountBadge", () => ({
  default: ({ productId }: { productId: string }) => (
    <div data-testid="volume-discount">bulk:{productId}</div>
  ),
}));

vi.mock("../components/BackInStockSignupCard", () => ({
  default: ({ title }: { title?: string }) => (
    <div data-testid="back-in-stock-card">{title || "back-in-stock"}</div>
  ),
}));

vi.mock("../components/TrustedBadgePanel", () => ({
  default: ({ title, items }: { title?: string; items?: string[] }) => (
    <div data-testid="trusted-badge-panel">
      {title || "Trusted checkout"}::{items?.join("|") || ""}
    </div>
  ),
}));

const createAppSettings = (overrides?: {
  conversionModules?: Record<string, unknown>;
  conversionUi?: Record<string, unknown>;
  conversionCopy?: Record<string, unknown>;
  conversionCountdown?: Record<string, unknown>;
  conversionEstimatedDelivery?: Record<string, unknown>;
  conversionThresholds?: Record<string, unknown>;
  commerceModules?: Record<string, unknown>;
  commerceCopy?: Record<string, unknown>;
  commerceUi?: Record<string, unknown>;
}) => ({
  "conversion-suite": {
    modules: {
      saleCountdown: true,
      lowStockNotice: true,
      estimatedDelivery: true,
      fakeVisitorCounter: true,
      soldCounter: true,
      purchaseFomo: true,
      backInStock: true,
      trustedBadges: true,
      bulkSavings: true,
      ...(overrides?.conversionModules || {}),
    },
    general: {},
    ui: {
      ...(overrides?.conversionUi || {}),
    },
    copy: {
      trustedBadgeItems: "Secure checkout,Fast support",
      ...(overrides?.conversionCopy || {}),
    },
    thresholds: {
      lowStockLimit: 5,
      fakeVisitorMin: 4,
      fakeVisitorMax: 12,
      ...(overrides?.conversionThresholds || {}),
    },
    countdown: {
      endsAt: "2026-04-06T10:00:00.000Z",
      ...(overrides?.conversionCountdown || {}),
    },
    estimatedDelivery: {
      minDays: 2,
      maxDays: 4,
      ...(overrides?.conversionEstimatedDelivery || {}),
    },
  },
  "commerce-advanced": {
    modules: {
      preOrder: true,
      ...(overrides?.commerceModules || {}),
    },
    copy: {
      ...(overrides?.commerceCopy || {}),
    },
    ui: {
      ...(overrides?.commerceUi || {}),
    },
  },
});

const configureApps = (appSettings: ReturnType<typeof createAppSettings>) => {
  mockUseStorefrontSettings.mockReturnValue({ settings: {} });
  mockIsMarketplaceEnabled.mockImplementation(
    (_settings: unknown, slug: string) => Boolean(appSettings[slug as keyof typeof appSettings]),
  );
  mockGetMarketplaceSettings.mockImplementation(
    (_settings: unknown, slug: string) => appSettings[slug as keyof typeof appSettings] || {},
  );
  mockTrackUsage.mockResolvedValue(undefined);
};

describe("ConversionStack", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T10:00:00.000Z"));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("groups reassurance, dominant urgency, and secondary proof without dropping modules", () => {
    configureApps(createAppSettings());
    mockUseProduct.mockReturnValue({
      isLoading: false,
      product: {
        id: "product-1",
        name: "Atlas Lamp",
        stock: 3,
        soldCount: 24,
        activeCartCount: 5,
        isPreOrder: true,
        preOrderDate: "2026-04-20T00:00:00.000Z",
        socialProof: {
          soldCount: 24,
          activeCartCount: 5,
          recentOrderCount: 3,
          orderCount: 24,
          backInStockRequests: 2,
        },
        metadata: {},
      },
    });

    render(
      <ConversionStack
        section={{ variant: "balanced" }}
        settings={{ showPulseRow: true }}
      />,
    );

    const primary = screen.getByTestId("conversion-confidence-grid");
    const urgency = screen.getByTestId("conversion-urgency-ticker");
    const secondary = screen.getByTestId("conversion-pulse-row");
    const footer = screen.getByTestId("conversion-footer");

    expect(within(primary).getByText("Estimated delivery")).toBeInTheDocument();
    expect(within(primary).getByText("Available for pre-order")).toBeInTheDocument();
    expect(within(primary).getByTestId("trusted-badge-panel")).toBeInTheDocument();

    expect(within(urgency).getByText("Offer ends in")).toBeInTheDocument();
    expect(within(secondary).getByText(/3 left/i)).toBeInTheDocument();
    expect(within(secondary).getByText("Sold 24 times")).toBeInTheDocument();
    expect(
      within(secondary).getByText("5 shoppers currently have this in their cart"),
    ).toBeInTheDocument();
    expect(
      within(secondary).getByText(/people are viewing this right now/i),
    ).toBeInTheDocument();
    expect(within(footer).getByTestId("volume-discount")).toHaveTextContent(
      "bulk:product-1",
    );

    expect(screen.queryByText("Product Conversion")).not.toBeInTheDocument();
    expect(screen.queryByText("Conversion Stack")).not.toBeInTheDocument();
  });

  it("keeps back-in-stock in primary reassurance when sold counter becomes the dominant urgency", () => {
    configureApps(
      createAppSettings({
        conversionModules: {
          saleCountdown: false,
          estimatedDelivery: false,
          fakeVisitorCounter: false,
          purchaseFomo: false,
          trustedBadges: false,
          bulkSavings: false,
        },
        commerceModules: {
          preOrder: false,
        },
      }),
    );
    mockUseProduct.mockReturnValue({
      isLoading: false,
      product: {
        id: "product-1",
        name: "Atlas Lamp",
        stock: 0,
        soldCount: 12,
        socialProof: {
          soldCount: 12,
          activeCartCount: 0,
          recentOrderCount: 0,
          orderCount: 12,
          backInStockRequests: 8,
        },
        metadata: {},
      },
    });

    render(<ConversionStack section={{ variant: "minimal" }} />);

    expect(
      within(screen.getByTestId("conversion-confidence-grid")).getByTestId(
        "back-in-stock-card",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("conversion-urgency-ticker")).getByText("Sold 12 times"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("conversion-pulse-row")).not.toBeInTheDocument();
    expect(screen.queryByTestId("conversion-footer")).not.toBeInTheDocument();
  });
});
