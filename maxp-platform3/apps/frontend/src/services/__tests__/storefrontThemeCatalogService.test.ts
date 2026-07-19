// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("../apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { storefrontThemeCatalogService } from "../storefrontThemeCatalogService";

describe("storefrontThemeCatalogService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty catalog when the API payload is empty", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: [],
      },
    });

    const result = await storefrontThemeCatalogService.getCompanyCatalog(
      "bold-fashion",
    );

    expect(result.data).toEqual([]);
  });

  it("does not append locally registered presets to partial API catalogs", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: [
          {
            themeId: "atelier-nova",
            name: "Atelier Nova",
            description: "Custom API theme entry",
          },
        ],
      },
    });

    const result = await storefrontThemeCatalogService.getCompanyCatalog(
      "atelier-nova",
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.themeId).toBe("atelier-nova");
    expect(result.data.some((item) => item.themeId === "airlume-ai")).toBe(
      false,
    );
  });

  it("throws API failures instead of returning a local fallback catalog", async () => {
    mockGet.mockRejectedValue(new Error("catalog request failed"));

    await expect(
      storefrontThemeCatalogService.getCompanyCatalog("bold-fashion"),
    ).rejects.toThrow("catalog request failed");
  });

  it("passes an explicit company id when loading the marketplace catalog", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: [],
      },
    });

    await storefrontThemeCatalogService.getCompanyCatalog("bold-fashion", {
      companyId: "cmp_explicit",
    });

    expect(mockGet).toHaveBeenCalledWith("/marketplace/themes", {
      _companyId: "cmp_explicit",
    });
  });

  it("passes an explicit company id when applying a theme", async () => {
    mockPost.mockResolvedValue({
      data: {
        data: {
          catalog: [],
          settings: {},
        },
      },
    });

    await storefrontThemeCatalogService.applyTheme("women-fashion-eg", {
      companyId: "cmp_explicit",
    });

    expect(mockPost).toHaveBeenCalledWith(
      "/marketplace/themes/women-fashion-eg/apply",
      {},
      {
        _companyId: "cmp_explicit",
      },
    );
  });
});
