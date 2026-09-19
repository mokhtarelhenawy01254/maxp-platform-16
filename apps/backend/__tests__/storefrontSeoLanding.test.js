/**
 * SEO shell tests for product landing pages (/store/lp/:slug).
 *
 * The storefront HTML shell used to serve generic company meta for landing
 * pages — shared links showed "lp | Store" with no og:image. The landing
 * branch builds title/description/og-image from the landing's own seo field
 * with product-derived fallbacks and a landing canonical URL.
 */

const {
  resolveRouteContext,
  buildStorefrontSeoMetadata,
} = require("../services/storefrontSeoService");

const COMPANY = {
  id: "company_1",
  name: "Swan",
  slug: "swan",
  logo: "https://cdn.example.com/logo.png",
  currency: "EGP",
};

const LANDING = {
  slug: "dash-sneakers",
  title: "كوتشي Dash — عرض حصري",
  seo: { title: "عنوان مخصص للمشاركة", description: "وصف مخصص للصفحة" },
  productDescription: "<p>كوتشي حريمي مريح للمشاوير</p>",
  productImage: "/uploads/products/dash.png",
  productPrice: 620,
  currency: "EGP",
};

const buildMeta = (overrides = {}) =>
  buildStorefrontSeoMetadata({
    pathname: "/store/lp/dash-sneakers",
    currentUrl: "https://swan.maxp.online/store/lp/dash-sneakers",
    company: COMPANY,
    storefrontSettings: null,
    templateContent: {},
    landing: LANDING,
    ...overrides,
  });

describe("resolveRouteContext — landing slugs", () => {
  it("detects /store/lp/:slug as a landing route", () => {
    const ctx = resolveRouteContext("/store/lp/dash-sneakers");
    expect(ctx.landingSlug).toBe("dash-sneakers");
  });

  it("detects /lp/:slug at the platform root", () => {
    const ctx = resolveRouteContext("/lp/dash-sneakers");
    expect(ctx.landingSlug).toBe("dash-sneakers");
  });

  it("does not treat normal pages as landings", () => {
    expect(resolveRouteContext("/store/product/abc").landingSlug).toBeNull();
    expect(resolveRouteContext("/store/shop").landingSlug).toBeNull();
    expect(resolveRouteContext("/store/lp").landingSlug).toBeNull();
  });
});

describe("buildStorefrontSeoMetadata — landing branch", () => {
  it("uses the landing seo title/description when present", () => {
    const meta = buildMeta();

    expect(meta.title).toBe("عنوان مخصص للمشاركة");
    expect(meta.description).toBe("وصف مخصص للصفحة");
    expect(meta.noIndex).toBe(false);
  });

  it("builds the canonical URL from the landing slug", () => {
    const meta = buildMeta();
    expect(meta.url).toBe("https://swan.maxp.online/store/lp/dash-sneakers");
  });

  it("falls back to the landing title and product description when seo is empty", () => {
    const meta = buildMeta({
      landing: { ...LANDING, seo: {} },
    });

    expect(meta.title).toContain("كوتشي Dash");
    expect(meta.description).toContain("كوتشي حريمي مريح");
  });

  it("resolves og image from seo.ogImage, else product image", () => {
    const fromProduct = buildMeta({ landing: { ...LANDING, seo: {} } });
    expect(fromProduct.image).toContain("dash.png");

    const fromSeo = buildMeta({
      landing: { ...LANDING, seo: { ogImage: "https://cdn.example.com/share.png" } },
    });
    expect(fromSeo.image).toBe("https://cdn.example.com/share.png");
  });

  it("exposes the product price for the product schema", () => {
    const meta = buildMeta();
    expect(meta.price).toBe(620);
    expect(meta.type).toBe("product");
    expect(meta.jsonLd["@type"]).toBe("Product");
    expect(meta.jsonLd.offers.price).toBe(620);
  });
});
