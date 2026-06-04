// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useStorefrontVisitTracking } from "../hooks/useStorefrontVisitTracking";
import type { StorefrontSettings } from "../hooks/useStorefrontSettings";

const { trackStoreVisitMock } = vi.hoisted(() => ({
  trackStoreVisitMock: vi.fn(),
}));

vi.mock("../services/storefrontAnalytics", () => ({
  default: {
    trackStoreVisit: trackStoreVisitMock,
  },
}));

const buildSettings = (
  overrides: Partial<StorefrontSettings> = {},
): StorefrontSettings => ({
  company: {
    id: "company-swan",
    name: "Swan",
    slug: "swan",
    logo: null,
    currency: "EGP",
    settings: {},
    ...(overrides.company ?? {}),
  },
  storefront: {
    storefrontFeatures: {
      quickViewEnabled: true,
      comparisonEnabled: false,
      wishlistEnabled: true,
      recentlyViewedEnabled: true,
      advancedFiltersEnabled: true,
      productCardStyle: "default",
      gridAddToCartIcon: "bag",
      gridDiscountBanner: true,
    },
    settings: {
      storeName: "Swan",
      currency: "EGP",
      ...((overrides.storefront?.settings as Record<string, unknown>) ?? {}),
    },
    ...(overrides.storefront ?? {}),
  },
  storefrontSettings: undefined,
  templateId: null,
  lastUpdated: "2026-04-27T00:00:00.000Z",
  ...overrides,
});

const TrackingHarness = ({
  settings,
}: {
  settings: StorefrontSettings | null;
}) => {
  useStorefrontVisitTracking(settings);
  return <div>tracking-ready</div>;
};

describe("useStorefrontVisitTracking", () => {
  beforeEach(() => {
    trackStoreVisitMock.mockReset();
    window.localStorage.clear();
  });

  it("tracks the first live storefront page and persists the company id", async () => {
    render(
      <MemoryRouter initialEntries={["/product/swan-lush?utm_source=meta"]}>
        <Routes>
          <Route
            path="*"
            element={<TrackingHarness settings={buildSettings()} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(trackStoreVisitMock).toHaveBeenCalledWith("/product/swan-lush");
    });

    expect(window.localStorage.getItem("storefront_companyId")).toBe(
      "company-swan",
    );
  });

  it("skips tracking while the storefront is in preview mode", async () => {
    render(
      <MemoryRouter initialEntries={["/store?previewTheme=elessi-pack"]}>
        <Routes>
          <Route
            path="*"
            element={
              <TrackingHarness
                settings={buildSettings({
                  storefront: {
                    isPreview: true,
                  },
                })}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(trackStoreVisitMock).not.toHaveBeenCalled();
    });
  });

  it("skips tracking for product preview routes", async () => {
    render(
      <MemoryRouter
        initialEntries={["/product/swan-lush?productPreview=1&previewProductId=42"]}
      >
        <Routes>
          <Route
            path="*"
            element={<TrackingHarness settings={buildSettings()} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(trackStoreVisitMock).not.toHaveBeenCalled();
    });
  });
});
