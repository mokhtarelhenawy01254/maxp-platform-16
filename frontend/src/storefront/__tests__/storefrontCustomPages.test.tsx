// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { cleanup, render, screen } from "@testing-library/react";

import StorefrontShell from "../StorefrontShell";

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

const discountedProduct = {
  id: "sale-heel",
  name: "Crystal Heel",
  description: "<p>Discounted heel.</p>",
  price: 1200,
  comparePrice: 1600,
  images: ["https://example.com/heel.jpg"],
  slug: "crystal-heel",
  categoryId: "heels",
  category: { id: "heels", name: "Heels" },
  productVariants: [],
};

const regularProduct = {
  id: "daily-flat",
  name: "Everyday Flat",
  description: "<p>Regular price flat.</p>",
  price: 950,
  images: ["https://example.com/flat.jpg"],
  slug: "everyday-flat",
  categoryId: "flats",
  category: { id: "flats", name: "Flats" },
  productVariants: [],
};

describe("Storefront custom pages", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("storefront_companyId", "company123");
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(requestUrl, window.location.origin);

      const jsonResponse = (payload: unknown, status = 200) =>
        Promise.resolve(
          new Response(JSON.stringify(payload), {
            status,
            headers: {
              "Content-Type": "application/json",
            },
          }),
        );

      if (url.pathname.endsWith("/public/storefront/settings")) {
        return jsonResponse({
          success: true,
          data: {
            company: {
              id: "company123",
              name: "Solea Demo",
              slug: "solea-demo",
              logo: null,
              currency: "EGP",
              settings: {},
            },
            storefront: {
              themeId: "solea-femme",
              settings: {
                storeName: "Solea Demo",
                currency: "EGP",
              },
              storefrontFeatures: {
                quickViewEnabled: true,
                comparisonEnabled: false,
                wishlistEnabled: false,
                recentlyViewedEnabled: false,
                advancedFiltersEnabled: true,
                productCardStyle: "default",
                gridAddToCartIcon: false,
                gridDiscountBanner: true,
              },
            },
            templateId: null,
            lastUpdated: "2026-03-26T00:00:00.000Z",
          },
        });
      }

      if (
        url.pathname.endsWith("/public/categories") ||
        url.pathname.endsWith("/public/products/categories")
      ) {
        return jsonResponse({
          success: true,
          data: [
            { id: "heels", name: "Heels", slug: "heels" },
            { id: "sandals", name: "Sandals", slug: "sandals" },
          ],
        });
      }

      if (url.pathname.includes("/public/products/")) {
        const requestedId = decodeURIComponent(url.pathname.split("/").pop() || "");
        const product = [discountedProduct, regularProduct].find(
          (item) => item.id === requestedId || item.slug === requestedId,
        );

        return product
          ? jsonResponse({ success: true, data: product })
          : jsonResponse({ success: false, message: "Not found" }, 404);
      }

      if (url.pathname.endsWith("/public/products")) {
        return jsonResponse({
          success: true,
          data: [discountedProduct, regularProduct],
          pagination: {
            total: 2,
            page: 1,
            limit: Number(url.searchParams.get("limit") || 12),
            pages: 1,
          },
        });
      }

      return jsonResponse(
        { success: false, message: `Unhandled request: ${url.pathname}` },
        404,
      );
    }) as typeof fetch;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("renders the sale page through the shared storefront shell and keeps only discounted products", async () => {
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/store/sale?companyId=company123"]}>
          <Routes>
            <Route path="/store/*" element={<StorefrontShell />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText("تخفيضات تستحق النظرة الثانية"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Crystal Heel")).toBeInTheDocument();
    expect(screen.queryByText("Everyday Flat")).not.toBeInTheDocument();
  });

  it("renders the collections page through the dynamic page route", async () => {
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/store/collections?companyId=company123"]}>
          <Routes>
            <Route path="/store/*" element={<StorefrontShell />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText("مجموعات مصممة لكل مناسبة"),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Heels" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Sandals" }),
    ).toBeInTheDocument();
  });

  it("renders the lookbook page through the dynamic page route", async () => {
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/store/lookbook?companyId=company123"]}>
          <Routes>
            <Route path="/store/*" element={<StorefrontShell />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText("اللوك بوك الخاص بـ Solea Femme"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("موديلات مختارة لكل إيقاع يومي"),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: /من المكتب إلى العشاء/i }),
    ).toHaveAttribute("href", "/store/shop?category=heels&companyId=company123");
  });

  it("renders the size guide page through the dynamic page route", async () => {
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/store/size-guide?companyId=company123"]}>
          <Routes>
            <Route path="/store/*" element={<StorefrontShell />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "دليل المقاسات الكامل", level: 2 }),
    ).toBeInTheDocument();
    expect(await screen.findByText("نصائح قبل اختيار المقاس")).toBeInTheDocument();
  });

  it("shows the size guide shortcut on the product page", async () => {
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/store/product/sale-heel?companyId=company123"]}>
          <Routes>
            <Route path="/store/*" element={<StorefrontShell />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Crystal Heel", level: 1 }),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("link", { name: "راجعي دليل المقاسات" }),
    ).toHaveAttribute("href", "/store/size-guide?companyId=company123");
  });
});
