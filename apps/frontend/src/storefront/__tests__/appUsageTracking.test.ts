// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStorefrontFetch = vi.fn();

vi.mock("../../utils/storefrontApi", () => ({
  storefrontFetch: (...args: unknown[]) => mockStorefrontFetch(...args),
}));

import { trackStorefrontAppUsage } from "../utils/appUsageTracking";

describe("trackStorefrontAppUsage", () => {
  beforeEach(() => {
    mockStorefrontFetch.mockReset();
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/store");
  });

  it("skips marketplace preview tracking", async () => {
    window.history.replaceState(
      null,
      "",
      "/store?previewTheme=khemet-luxe-eg&previewSource=marketplace",
    );

    const tracked = await trackStorefrontAppUsage({
      slug: "conversion-suite",
      feature: "free_shipping_progress_milestone",
    });

    expect(tracked).toBe(false);
    expect(mockStorefrontFetch).not.toHaveBeenCalled();
  });

  it("tracks usage outside marketplace preview", async () => {
    mockStorefrontFetch.mockResolvedValue({ tracked: true });

    const tracked = await trackStorefrontAppUsage({
      slug: "conversion-suite",
      feature: "free_shipping_progress_milestone",
    });

    expect(tracked).toBe(true);
    expect(mockStorefrontFetch).toHaveBeenCalledWith(
      "/storefront/apps/conversion-suite/track",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
