const {
  resolveRouteSeo,
  injectSeoTags,
  ROUTE_SEO_MAP,
  handlePlatformSeo,
  clearPlatformSeoHtmlCache,
} = require("../../middleware/platformSeoMiddleware");

describe("platformSeoMiddleware", () => {
  describe("resolveRouteSeo", () => {
    test("resolves homepage '/' with SoftwareApplication Schema.org JSON-LD", () => {
      const seo = resolveRouteSeo("/");
      expect(seo).toBeDefined();
      expect(seo.title).toContain("MaxP");
      expect(seo.jsonLd).toBeDefined();
      expect(seo.jsonLd["@type"]).toBe("SoftwareApplication");
      expect(seo.jsonLd.name).toBe("MaxP");
    });

    test("resolves landing pages for both /lp/* and /landing/*", () => {
      const lpAi = resolveRouteSeo("/lp/ai-inbox");
      const landingAi = resolveRouteSeo("/landing/ai-inbox");
      expect(lpAi).toBeDefined();
      expect(landingAi).toBeDefined();
      expect(lpAi.title).toBe(landingAi.title);
      expect(lpAi.title).toContain("AI + Inbox");

      const lpMedical = resolveRouteSeo("/lp/medical");
      expect(lpMedical).toBeDefined();
      expect(lpMedical.title).toContain("الباقة الطبية");

      const forMerchants = resolveRouteSeo("/for-merchants");
      expect(forMerchants).toBeDefined();
      expect(forMerchants.title).toContain("للتجار");
    });

    test("resolves dashboard routes with noIndex: true", () => {
      const orders = resolveRouteSeo("/orders");
      expect(orders).toBeDefined();
      expect(orders.noIndex).toBe(true);

      const products = resolveRouteSeo("/products");
      expect(products).toBeDefined();
      expect(products.noIndex).toBe(true);

      const nestedOrder = resolveRouteSeo("/orders/12345");
      expect(nestedOrder).toBeDefined();
      expect(nestedOrder.noIndex).toBe(true);

      const dashboard = resolveRouteSeo("/dashboard");
      expect(dashboard).toBeDefined();
      expect(dashboard.noIndex).toBe(true);
    });

    test("returns null for unknown arbitrary routes", () => {
      expect(resolveRouteSeo("/random-unmatched-route-xyz")).toBeNull();
    });
  });

  describe("injectSeoTags", () => {
    const mockHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>MaxP — منصة إدارة التواصل والتجارة الإلكترونية</title>
  <meta name="description" content="منصة متكاملة" />
  <meta property="og:title" content="MaxP" />
  <meta property="og:description" content="منصة متكاملة" />
  <meta property="og:image" content="https://maxp.online/og-cover.png" />
  <meta property="og:url" content="https://maxp.online" />
  <meta name="twitter:title" content="MaxP" />
  <meta name="twitter:description" content="منصة متكاملة" />
  <meta name="twitter:image" content="https://maxp.online/og-cover.png" />
</head>
<body>
  <div id="root"></div>
</body>
</html>`;

    test("replaces title, meta description, and OpenGraph tags correctly", () => {
      const result = injectSeoTags(mockHtml, {
        title: "صفحة الهبوط الخاصة بي | MaxP",
        description: "وصف مخصص لصفحة الهبوط التجريبية",
        image: "https://maxp.online/custom-image.png",
        url: "https://maxp.online/lp/custom",
        noIndex: false,
      });

      expect(result).toContain("<title>صفحة الهبوط الخاصة بي | MaxP</title>");
      expect(result).toContain('content="وصف مخصص لصفحة الهبوط التجريبية"');
      expect(result).toContain('property="og:title" content="صفحة الهبوط الخاصة بي | MaxP"');
      expect(result).toContain('property="og:image" content="https://maxp.online/custom-image.png"');
      expect(result).toContain('property="og:url" content="https://maxp.online/lp/custom"');
      expect(result).toContain('name="twitter:title" content="صفحة الهبوط الخاصة بي | MaxP"');
      expect(result).toContain('name="twitter:image" content="https://maxp.online/custom-image.png"');
      expect(result).not.toContain('name="robots" content="noindex, nofollow"');
    });

    test("injects noindex, nofollow when noIndex is true", () => {
      const result = injectSeoTags(mockHtml, {
        title: "الطلبات والمبيعات | MaxP",
        description: "لوحة تحكم الطلبات",
        noIndex: true,
      });

      expect(result).toContain('<meta name="robots" content="noindex, nofollow" />');
    });

    test("injects product price and currency meta tags when provided", () => {
      const result = injectSeoTags(mockHtml, {
        title: "حذاء رياضي كاجوال",
        description: "أفضل حذاء رياضي أصلي",
        price: 499,
        currency: "EGP",
        type: "product",
      });

      expect(result).toContain('<meta property="og:type" content="product" />');
      expect(result).toContain('<meta property="product:price:amount" content="499" />');
      expect(result).toContain('<meta property="product:price:currency" content="EGP" />');
    });

    test("injects Schema.org JSON-LD script tag when jsonLd object is provided", () => {
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "MaxP Suite",
      };

      const result = injectSeoTags(mockHtml, {
        title: "MaxP Suite",
        description: "Enterprise software",
        jsonLd,
      });

      expect(result).toContain('<script type="application/ld+json">');
      expect(result).toContain('"@type":"SoftwareApplication"');
      expect(result).toContain('"name":"MaxP Suite"');
    });
  });

  describe("handlePlatformSeo middleware", () => {
    beforeEach(() => {
      clearPlatformSeoHtmlCache();
    });

    test("bypasses (calls next) for API requests", async () => {
      const req = {
        path: "/api/v1/orders",
        method: "GET",
        headers: {},
        protocol: "https",
        get: () => "maxp.online",
        originalUrl: "/api/v1/orders",
      };
      const res = {
        set: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      const next = jest.fn();

      await handlePlatformSeo(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.send).not.toHaveBeenCalled();
    });

    test("bypasses for static assets like .js, .css, .png", async () => {
      const req = {
        path: "/assets/index-abc.js",
        method: "GET",
        headers: {},
        protocol: "https",
        get: () => "maxp.online",
        originalUrl: "/assets/index-abc.js",
      };
      const res = {
        set: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      const next = jest.fn();

      await handlePlatformSeo(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.send).not.toHaveBeenCalled();
    });
  });
});
