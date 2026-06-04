// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("storefrontApi product landing helpers", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let storefrontApi: typeof import("../storefrontApi").storefrontApi;

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(
      {},
      "",
      "/store/lp/swan-sneaker-7?companyId=company-test",
    );

    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    ({ storefrontApi } = await import("../storefrontApi"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads public product landing pages from the product-landings API", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            landing: {
              slug: "swan-sneaker-7",
              title: "Swan Sneaker",
            },
            product: {
              id: "prod-1",
              name: "Swan Sneaker",
            },
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const response = await storefrontApi.getProductLanding("swan-sneaker-7");
    const [, requestOptions] = fetchMock.mock.calls[0];

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/product-landings/public/swan-sneaker-7?companyId=company-test",
      ),
      expect.objectContaining({
        credentials: "include",
      }),
    );
    expect((requestOptions.headers as Headers).get("x-company-id")).toBe(
      "company-test",
    );
    expect(response.data.landing.slug).toBe("swan-sneaker-7");
  });

  it("throws the public landing API message when the page is not published", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          message: "صفحة الهبوط غير موجودة أو غير منشورة",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    await expect(
      storefrontApi.getProductLanding("draft-page"),
    ).rejects.toMatchObject({
      message: "صفحة الهبوط غير موجودة أو غير منشورة",
      status: 404,
    });
  });

  it("loads authenticated draft previews with the stored admin token", async () => {
    localStorage.setItem("accessToken", "admin-token");
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            landing: {
              slug: "swan-sneaker-7",
              status: "DRAFT",
            },
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    await storefrontApi.getProductLandingPreview("swan-sneaker-7");
    const [, requestOptions] = fetchMock.mock.calls[0];

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/product-landings/preview/swan-sneaker-7?companyId=company-test",
      ),
      expect.objectContaining({
        credentials: "include",
      }),
    );
    expect((requestOptions.headers as Headers).get("Authorization")).toBe(
      "Bearer admin-token",
    );
  });

  it("tracks landing page orders against the matching public landing endpoint", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: "landing-1",
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    await storefrontApi.trackProductLandingOrder("swan-sneaker-7", {
      orderId: "ORD-123",
    });
    const [, requestOptions] = fetchMock.mock.calls[0];

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/product-landings/public/swan-sneaker-7/order?companyId=company-test",
      ),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
    expect(JSON.parse(requestOptions.body as string)).toEqual({
      orderId: "ORD-123",
    });
  });
});
