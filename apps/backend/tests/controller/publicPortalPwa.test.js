"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "portal-pwa-test-"));
const tempIconDir = path.join(tempDir, "icons");
const tempIndexHtml = path.join(tempDir, "index.html");

fs.writeFileSync(
  tempIndexHtml,
  `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <meta name="description" content="Default Desc" />
  <meta property="og:title" content="Default OG" />
  <meta property="og:description" content="Default OG Desc" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://maxp.online" />
  <meta property="og:site_name" content="MaxP" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="MaxP" />
  <meta name="twitter:description" content="MaxP" />
  <meta name="theme-color" content="#2F6BFF" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#071120" media="(prefers-color-scheme: dark)" />
  <link rel="canonical" href="https://maxp.online" />
  <title>MaxP</title>
</head>
<body><div id="root"></div></body>
</html>`,
  "utf8",
);

process.env.PORTAL_ICONS_CACHE_DIR = tempIconDir;
process.env.STOREFRONT_INDEX_HTML = tempIndexHtml;

const mockPrisma = {
  company: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  storefrontSettings: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  homepageTemplate: {
    findFirst: jest.fn(),
  },
  storePage: {
    findFirst: jest.fn(),
  },
  product: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  productLandingPage: {
    findFirst: jest.fn(),
  },
  academyCourse: {
    findFirst: jest.fn(),
  },
};

const mockRedisStore = new Map();
const mockRedisCacheService = {
  get: jest.fn(async (key) =>
    mockRedisStore.has(key) ? mockRedisStore.get(key) : null,
  ),
  set: jest.fn(async (key, val) => {
    mockRedisStore.set(key, val);
    return true;
  }),
  del: jest.fn(async (key) => {
    mockRedisStore.delete(key);
    return true;
  }),
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClientAsync: jest.fn(async () => mockPrisma),
  safeQuery: jest.fn((fn, fallback = null) =>
    Promise.resolve()
      .then(fn)
      .catch(() => fallback),
  ),
}));

jest.mock("../../services/redisCacheService", () => mockRedisCacheService);

const {
  PORTAL_MANIFEST_CONFIG,
  getAndroidAssetLinks,
  getPortalBranding,
  getPortalIcon,
  getPortalManifest,
  invalidatePortalIconCache,
  isSafeRemoteLogoUrl,
  lookupPortalCompanies,
  normalizeHex,
  resolvePortalCompany,
  resolveSafeLocalUploadPath,
} = require("../../controller/publicPortalPwaController");

const {
  buildStorefrontSeoMetadata,
  injectStorefrontSeoTags,
} = require("../../services/storefrontSeoService");

const {
  clearStorefrontHtmlCache,
  handleStorefrontShell,
  resolvePortalSsrContext,
} = require("../../controller/storefrontHtmlController");

function createMockRes() {
  const headers = {};
  return {
    statusCode: 200,
    body: null,
    headers,
    set: jest.fn((k, v) => {
      headers[String(k).toLowerCase()] = v;
    }),
    setHeader: jest.fn((k, v) => {
      headers[String(k).toLowerCase()] = v;
    }),
    getHeader: jest.fn((k) => headers[String(k).toLowerCase()] || null),
    removeHeader: jest.fn((k) => {
      delete headers[String(k).toLowerCase()];
    }),
    status: jest.fn(function status(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function json(payload) {
      this.body = payload;
      return this;
    }),
    send: jest.fn(function send(payload) {
      this.body = payload;
      return this;
    }),
    redirect: jest.fn(),
  };
}

function createReq(overrides = {}) {
  const headers = {
    host: "swan.maxp.online",
    accept: "text/html,application/xhtml+xml",
    ...(overrides.headers || {}),
  };
  return {
    method: "GET",
    path: "/",
    url: "/",
    originalUrl: "/",
    protocol: "https",
    query: {},
    params: {},
    ...overrides,
    headers,
    get: jest.fn((name) => headers[String(name).toLowerCase()] || null),
  };
}

describe("Public Portal PWA Controller, SSR & Security", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisStore.clear();
    clearStorefrontHtmlCache();
    invalidatePortalIconCache("comp_swan");
    invalidatePortalIconCache("default");

    mockPrisma.company.findFirst.mockReset();
    mockPrisma.company.findUnique.mockReset();
    mockPrisma.company.findMany.mockReset();
    mockPrisma.company.findMany.mockResolvedValue([]);
    mockPrisma.storefrontSettings.findUnique.mockResolvedValue(null);
    mockPrisma.storefrontSettings.findFirst.mockResolvedValue(null);
    mockPrisma.storefrontSettings.findMany.mockReset();
    mockPrisma.storefrontSettings.findMany.mockResolvedValue([]);
    mockPrisma.homepageTemplate.findFirst.mockResolvedValue(null);
    mockPrisma.storePage.findFirst.mockResolvedValue(null);
    mockPrisma.product.findFirst.mockResolvedValue(null);
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.productLandingPage.findFirst.mockResolvedValue(null);
    mockPrisma.academyCourse.findFirst.mockResolvedValue(null);
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  });

  describe("getPortalBranding & resolvePortalCompany", () => {
    const sampleCompany = {
      id: "comp_swan",
      name: "Swan Academy",
      slug: "swan",
      publicCode: "SWAN01",
      customDomain: "portal.swan.eg",
      logo: null,
      phone: "+201001112233",
      isActive: true,
    };

    test("resolves via req.company and extracts primary/secondary hex colors & themeMode", async () => {
      mockPrisma.company.findUnique.mockResolvedValue(sampleCompany);
      mockPrisma.storefrontSettings.findUnique.mockResolvedValue({
        designTokens: {
          themeMode: "dark",
          colors: {
            primary: "#e11",
            secondary: "#1e293b",
          },
        },
      });

      const req = createReq({
        company: { id: "comp_swan", name: "Swan Academy", slug: "swan", isActive: true },
      });
      const res = createMockRes();

      await getPortalBranding(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.headers["cache-control"]).toBe(
        "public, max-age=60, stale-while-revalidate=300",
      );
      expect(res.body).toEqual({
        success: true,
        data: {
          companyId: "comp_swan",
          name: "Swan Academy",
          slug: "swan",
          publicCode: "SWAN01",
          customDomain: "portal.swan.eg",
          logo: null,
          primaryColor: "#ee1111",
          secondaryColor: "#1e293b",
          themeMode: "dark",
          supportPhone: "+201001112233",
        },
      });
      expect(mockPrisma.homepageTemplate.findFirst).not.toHaveBeenCalled();
    });

    test("resolves tenant by ?slug, ?companyId, and ?code", async () => {
      mockPrisma.company.findFirst.mockResolvedValue(sampleCompany);
      mockPrisma.company.findUnique.mockResolvedValue(sampleCompany);
      mockPrisma.storefrontSettings.findUnique.mockResolvedValue({
        designTokens: { colors: { primaryColor: "#0ea5e9", secondaryColor: "#0f172a" } },
      });

      for (const query of [
        { slug: "swan" },
        { companyId: "comp_swan" },
        { code: "SWAN01" },
      ]) {
        mockRedisStore.clear();
        const req = createReq({ headers: { host: "maxp.online" }, query });
        const resolved = await resolvePortalCompany(req);
        expect(resolved?.id).toBe("comp_swan");

        const res = createMockRes();
        await getPortalBranding(req, res);
        expect(res.statusCode).toBe(200);
        expect(res.body.data.companyId).toBe("comp_swan");
        expect(res.body.data.primaryColor).toBe("#0ea5e9");
      }
    });

    test("sanitizes unsafe designTokens colors back to defaults", async () => {
      expect(normalizeHex("javascript:alert(1)")).toBeNull();
      expect(normalizeHex("#fff")).toBe("#ffffff");

      mockPrisma.company.findUnique.mockResolvedValue(sampleCompany);
      mockPrisma.storefrontSettings.findUnique.mockResolvedValue({
        designTokens: {
          colors: {
            primary: "expression(alert(1))",
            secondary: "url(https://evil.test)",
          },
        },
      });

      const req = createReq({
        company: { id: "comp_swan", name: "Swan Academy", isActive: true },
      });
      const res = createMockRes();

      await getPortalBranding(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.primaryColor).toBe("#4f46e5");
      expect(res.body.data.secondaryColor).toBe("#0f172a");
      expect(res.body.data.themeMode).toBe("light");
    });

    test("returns 404 when tenant is missing or inactive", async () => {
      mockPrisma.company.findFirst.mockResolvedValue(null);
      mockPrisma.company.findUnique.mockResolvedValue(null);

      const reqMissing = createReq({
        headers: { host: "maxp.online" },
        query: { slug: "unknown-org" },
      });
      const resMissing = createMockRes();
      await getPortalBranding(reqMissing, resMissing);
      expect(resMissing.statusCode).toBe(404);
      expect(resMissing.body).toEqual({
        success: false,
        message: "لم يتم تحديد المؤسسة",
      });

      const reqInactive = createReq({
        company: { id: "comp_off", name: "Closed Org", isActive: false },
      });
      const resInactive = createMockRes();
      await getPortalBranding(reqInactive, resInactive);
      expect(resInactive.statusCode).toBe(404);
    });
  });

  describe("getPortalManifest", () => {
    test("returns application/manifest+json with RTL Arabic portal name, scoped root, and clean start_url on subdomain", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: "comp_swan",
        name: "مؤسسة المستقبل التعليمية المتميزة جداً في مصر",
        slug: "swan",
        isActive: true,
      });
      mockPrisma.storefrontSettings.findUnique.mockResolvedValue({
        designTokens: { colors: { primary: "#10b981" } },
      });

      const req = createReq({
        headers: { host: "swan.maxp.online" },
        company: { id: "comp_swan", slug: "swan", isActive: true },
        query: { portal: "parent", slug: "swan" },
      });
      const res = createMockRes();

      await getPortalManifest(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toBe(
        "application/manifest+json; charset=utf-8",
      );
      expect(res.headers["cache-control"]).toBe("public, max-age=300");

      const manifest = JSON.parse(res.body);
      expect(manifest.name).toContain("بوابة ولي الأمر");
      expect(manifest.short_name.length).toBeLessThanOrEqual(24);
      expect(manifest.start_url).toBe("/parent/dashboard");
      expect(manifest.scope).toBe("/parent/");
      expect(manifest.dir).toBe("rtl");
      expect(manifest.lang).toBe("ar");
      expect(manifest.display).toBe("standalone");
      expect(manifest.orientation).toBe("portrait");
      expect(manifest.theme_color).toBe("#10b981");
      expect(manifest.background_color).toBe("#ffffff");
      expect(manifest.icons).toEqual([
        {
          src: "/api/v1/public/portal/icon-192.png?slug=swan",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: "/api/v1/public/portal/icon-512.png?slug=swan",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ]);
    });

    test("preserves tenant query on start_url when resolved via apex query param without subdomain", async () => {
      mockPrisma.company.findFirst.mockResolvedValue({
        id: "comp_swan",
        name: "Swan",
        slug: "swan",
        isActive: true,
      });
      mockPrisma.company.findUnique.mockResolvedValue({
        id: "comp_swan",
        name: "Swan",
        slug: "swan",
        isActive: true,
      });

      const req = createReq({
        headers: { host: "maxp.online" },
        query: { portal: "dental", slug: "swan" },
      });
      const res = createMockRes();

      await getPortalManifest(req, res);

      const manifest = JSON.parse(res.body);
      expect(manifest.start_url).toBe("/dental-portal/dashboard?slug=swan");
      expect(manifest.scope).toBe("/dental-portal/");
      expect(manifest.icons[0].src).toBe(
        "/api/v1/public/portal/icon-192.png?slug=swan",
      );
    });

    test("supports all 10 portal scopes including customer start_url within scope, and apex fallback without tenant", async () => {
      for (const portalKey of [
        "parent",
        "teacher",
        "student",
        "doctor",
        "patient",
        "dental",
        "courier",
        "wholesale",
        "client",
        "customer",
      ]) {
        expect(PORTAL_MANIFEST_CONFIG[portalKey]).toBeDefined();
        const req = createReq({
          headers: { host: "maxp.online" },
          query: { portal: portalKey },
        });
        const res = createMockRes();
        await getPortalManifest(req, res);
        expect(res.statusCode).toBe(200);
        const manifest = JSON.parse(res.body);
        expect(manifest.start_url.startsWith(manifest.scope)).toBe(true);
        expect(manifest.name).toContain("MaxP");
      }
    });
  });

  describe("getPortalIcon & Security", () => {
    test("generates real PNG bytes (89 50 4e 47) for sizes 180, 192, and 512 via sharp SVG monogram fallback", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: "comp_swan",
        name: "Swan",
        slug: "swan",
        logo: null,
        isActive: true,
      });
      mockPrisma.storefrontSettings.findUnique.mockResolvedValue({
        designTokens: { colors: { primary: "#2563eb" } },
      });

      for (const size of ["180", "192", "512"]) {
        const req = createReq({
          params: { size },
          company: { id: "comp_swan", name: "Swan", isActive: true },
        });
        const res = createMockRes();

        await getPortalIcon(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.headers["content-type"]).toBe("image/png");
        expect(res.headers["cache-control"]).toBe("public, max-age=86400");
        expect(Buffer.isBuffer(res.body)).toBe(true);
        expect(res.body[0]).toBe(0x89);
        expect(res.body[1]).toBe(0x50);
        expect(res.body[2]).toBe(0x4e);
        expect(res.body[3]).toBe(0x47);
      }

      const cachedFile = path.join(tempIconDir, "comp_swan-180.png");
      expect(fs.existsSync(cachedFile)).toBe(true);
      invalidatePortalIconCache("comp_swan");
      expect(fs.existsSync(cachedFile)).toBe(false);
    });

    test("rejects invalid icon size with 400", async () => {
      const req = createReq({ params: { size: "256" } });
      const res = createMockRes();
      await getPortalIcon(req, res);
      expect(res.statusCode).toBe(400);
    });

    test("blocks SSRF private/loopback/link-local URLs and falls back safely without fetching", async () => {
      const blockedUrls = [
        "http://localhost/logo.png",
        "http://127.0.0.1/logo.png",
        "http://10.0.0.5/logo.png",
        "http://192.168.1.1/logo.png",
        "http://169.254.169.254/latest/meta-data/",
        "http://172.16.10.2/logo.png",
        "http://172.31.255.254/logo.png",
        "http://[::1]/logo.png",
        "http://[fc00::1]/logo.png",
        "http://[fe80::1]/logo.png",
        "http://[::ffff:127.0.0.1]/logo.png",
        "http://redis/secret.png",
        "file:///etc/passwd",
        "javascript:alert(1)",
      ];

      for (const badUrl of blockedUrls) {
        expect(isSafeRemoteLogoUrl(badUrl)).toBe(false);
      }

      expect(isSafeRemoteLogoUrl("https://cdn.example.com/logo.png")).toBe(true);

      const originalFetch = global.fetch;
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy;

      try {
        mockPrisma.company.findUnique.mockResolvedValue({
          id: "comp_ssrf",
          name: "SSRF Test",
          slug: "ssrf",
          logo: "http://169.254.169.254/latest/meta-data",
          isActive: true,
        });

        const req = createReq({
          params: { size: "192" },
          company: {
            id: "comp_ssrf",
            name: "SSRF Test",
            logo: "http://169.254.169.254/latest/meta-data",
            isActive: true,
          },
        });
        const res = createMockRes();

        await getPortalIcon(req, res);

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(200);
        expect(res.body[0]).toBe(0x89);
        expect(res.body[1]).toBe(0x50);
      } finally {
        global.fetch = originalFetch;
        invalidatePortalIconCache("comp_ssrf");
      }
    });

    test("blocks path traversal in local upload paths", () => {
      expect(resolveSafeLocalUploadPath("/uploads/../../package.json")).toBeNull();
      expect(resolveSafeLocalUploadPath("/uploads/%2e%2e/%2e%2e/server.js")).toBeNull();
      expect(resolveSafeLocalUploadPath("/uploads/..\\..\\server.js")).toBeNull();
      expect(resolveSafeLocalUploadPath("/etc/passwd")).toBeNull();
      expect(resolveSafeLocalUploadPath("/uploads/a\0.png")).toBeNull();
      expect(resolveSafeLocalUploadPath("/uploads/portal-icons/self.png")).toBeNull();
    });
  });

  describe("SSR Portal SEO Injection & Route Resolution", () => {
    test("injectStorefrontSeoTags injects portal PWA tags when supplied while keeping storefront HTML unchanged when omitted", () => {
      const baseHtml = fs.readFileSync(tempIndexHtml, "utf8");

      const storefrontMeta = buildStorefrontSeoMetadata({
        pathname: "/shop",
        currentUrl: "https://swan.maxp.online/shop",
        company: { name: "Swan" },
      });
      const storefrontHtml = injectStorefrontSeoTags(baseHtml, storefrontMeta);
      expect(storefrontHtml).not.toContain('rel="manifest"');
      expect(storefrontHtml).not.toContain('rel="apple-touch-icon"');
      expect(storefrontHtml).not.toContain('name="apple-mobile-web-app-title"');
      expect(storefrontHtml).toContain('media="(prefers-color-scheme: dark)"');

      const portalMeta = buildStorefrontSeoMetadata({
        pathname: "/parent/dashboard",
        currentUrl: "https://swan.maxp.online/parent/dashboard",
        company: { name: "Swan", slug: "swan" },
        noIndex: true,
        robots: "noindex, follow",
        portalTitle: "بوابة ولي الأمر",
        manifestUrl: "/api/v1/public/portal/manifest.webmanifest?portal=parent&slug=swan",
        appleTouchIconUrl: "/api/v1/public/portal/icon-180.png?slug=swan",
        themeColor: "#e11d48",
        appTitle: "Swan",
      });
      const portalHtml = injectStorefrontSeoTags(baseHtml, portalMeta);

      expect(portalHtml).toContain("<title>بوابة ولي الأمر | Swan</title>");
      expect(portalHtml).toContain('<meta name="robots" content="noindex, follow" />');
      expect(portalHtml).toContain(
        '<link rel="manifest" href="/api/v1/public/portal/manifest.webmanifest?portal=parent&amp;slug=swan" />',
      );
      expect(portalHtml).toContain(
        '<link rel="apple-touch-icon" href="/api/v1/public/portal/icon-180.png?slug=swan" />',
      );
      expect(portalHtml).toContain('<meta name="theme-color" content="#e11d48" />');
      expect(portalHtml).toContain('<meta name="apple-mobile-web-app-title" content="Swan" />');
      expect(portalHtml).not.toContain('media="(prefers-color-scheme: dark)"');
    });

    test("resolvePortalSsrContext detects all 12 portal prefixes, excludes /portal/production, and avoids /accounting collision", () => {
      const expectedMatches = [
        ["/parent", "parent"],
        ["/parent/dashboard", "parent"],
        ["/teacher/schedule", "teacher"],
        ["/doctor/dashboard", "doctor"],
        ["/patient/appointments", "patient"],
        ["/dental-portal", "dental"],
        ["/courier-portal/custody", "courier"],
        ["/wholesale-portal/orders", "wholesale"],
        ["/account", "customer"],
        ["/account/cashback", "customer"],
        ["/client-portal", "client"],
        ["/agency/client-portal/dashboard", "client"],
        ["/portal/my-courses", "student"],
        ["/academy/portal", "student"],
      ];

      for (const [routePath, expectedType] of expectedMatches) {
        const ctx = resolvePortalSsrContext(routePath);
        expect(ctx.isPortalRoute).toBe(true);
        expect(ctx.portalType).toBe(expectedType);
      }

      expect(resolvePortalSsrContext("/portal/production/order-123").isPortalRoute).toBe(false);
      expect(resolvePortalSsrContext("/client-portal/shipping").isPortalRoute).toBe(false);
      expect(resolvePortalSsrContext("/academy").isPortalRoute).toBe(false);
      expect(resolvePortalSsrContext("/academy/dashboard").isPortalRoute).toBe(false);
      expect(resolvePortalSsrContext("/academy/courses").isPortalRoute).toBe(false);
      expect(resolvePortalSsrContext("/academy/courses/course-123").isPortalRoute).toBe(true);
      expect(resolvePortalSsrContext("/academy/my-courses").isPortalRoute).toBe(true);
      expect(resolvePortalSsrContext("/accounting/invoices").isPortalRoute).toBe(false);
      expect(resolvePortalSsrContext("/shop").isPortalRoute).toBe(false);
    });

    test("handleStorefrontShell serves HTTP 200 with dynamic manifest & noindex for portal root /parent without 404 or storePage lookup", async () => {
      mockPrisma.storefrontSettings.findUnique.mockResolvedValue({
        designTokens: { colors: { primary: "#059669" } },
      });

      const req = createReq({
        path: "/parent",
        url: "/parent",
        originalUrl: "/parent",
        companyId: "comp_swan",
        company: { id: "comp_swan", name: "Swan", slug: "swan", isActive: true },
      });
      const res = createMockRes();
      const next = jest.fn();

      await handleStorefrontShell(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(mockPrisma.storePage.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.product.findFirst).not.toHaveBeenCalled();
      expect(res.body).toContain("<title>بوابة ولي الأمر | Swan</title>");
      expect(res.body).toContain('<meta name="robots" content="noindex, follow" />');
      expect(res.body).toContain(
        'href="/api/v1/public/portal/manifest.webmanifest?portal=parent&amp;slug=swan"',
      );
      expect(res.body).toContain(
        'href="/api/v1/public/portal/icon-180.png?slug=swan"',
      );
      expect(res.body).toContain('<meta name="theme-color" content="#059669" />');
    });

    test("handleStorefrontShell serves HTTP 200 with noindex for /i/:slug and /portal-connect without 404 or storefront lookup", async () => {
      mockPrisma.storefrontSettings.findUnique.mockResolvedValue({
        designTokens: { colors: { primary: "#4f46e5" } },
      });

      for (const routePath of ["/i", "/i/swan", "/portal-connect"]) {
        const req = createReq({
          path: routePath,
          url: routePath,
          originalUrl: routePath,
          companyId: "comp_swan",
          company: { id: "comp_swan", name: "Swan", slug: "swan", isActive: true },
        });
        const res = createMockRes();
        const next = jest.fn();

        await handleStorefrontShell(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(200);
        expect(mockPrisma.storePage.findFirst).not.toHaveBeenCalled();
        expect(mockPrisma.product.findFirst).not.toHaveBeenCalled();
        expect(res.body).toContain('<meta name="robots" content="noindex, follow" />');
      }
    });

    test("renders remote CDN logo onto 192x192 PNG via sharp after DNS public IP check", async () => {
      const dns = require("dns");
      const sharp = require("sharp");
      const tinyPng = await sharp({
        create: {
          width: 32,
          height: 32,
          channels: 4,
          background: { r: 220, g: 38, b: 38, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const lookupSpy = jest
        .spyOn(dns.promises, "lookup")
        .mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
      const originalFetch = global.fetch;
      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        headers: { get: (h) => (String(h).toLowerCase() === "content-length" ? String(tinyPng.length) : null) },
        arrayBuffer: async () =>
          tinyPng.buffer.slice(tinyPng.byteOffset, tinyPng.byteOffset + tinyPng.byteLength),
      }));

      try {
        mockPrisma.company.findUnique.mockResolvedValue({
          id: "comp_remote_logo",
          name: "Remote Brand",
          slug: "remotebrand",
          logo: "https://cdn.example.com/logo.png",
          isActive: true,
        });

        const req = createReq({
          params: { size: "192" },
          company: {
            id: "comp_remote_logo",
            name: "Remote Brand",
            slug: "remotebrand",
            logo: "https://cdn.example.com/logo.png",
            isActive: true,
          },
        });
        const res = createMockRes();

        await getPortalIcon(req, res);

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(res.statusCode).toBe(200);
        expect(res.headers["content-type"]).toBe("image/png");
        const meta = await sharp(res.body).metadata();
        expect(meta.format).toBe("png");
        expect(meta.width).toBe(192);
        expect(meta.height).toBe(192);
      } finally {
        lookupSpy.mockRestore();
        global.fetch = originalFetch;
        invalidatePortalIconCache("comp_remote_logo");
      }
    });

    test("publicPortalRoutes registers /lookup, /branding, /manifest.webmanifest, /manifest.json, and /icon-:size.png and server mounts it before globalSecurity", () => {
      const portalRouter = require("../../routes/publicPortalRoutes");
      const routePaths = portalRouter.stack
        .filter((layer) => layer.route)
        .flatMap((layer) =>
          Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path],
        );

      expect(routePaths).toEqual(
        expect.arrayContaining([
          "/lookup",
          "/branding",
          "/manifest.webmanifest",
          "/manifest.json",
          "/icon-:size.png",
        ]),
      );

      const serverSrc = fs.readFileSync(
        path.resolve(__dirname, "../../server.js"),
        "utf8",
      );
      const storefrontMountIdx = serverSrc.indexOf('"/api/v1/public/storefront"');
      const portalMountIdx = serverSrc.indexOf('"/api/v1/public/portal"');
      const globalSecurityIdx = serverSrc.indexOf("app.use(globalSecurity)");
      const assetLinksIdx = serverSrc.indexOf('"/.well-known/assetlinks.json"');
      const catchAllIdx = serverSrc.indexOf('app.get(\n  "*"');
      expect(storefrontMountIdx).toBeGreaterThan(-1);
      expect(portalMountIdx).toBeGreaterThan(storefrontMountIdx);
      expect(globalSecurityIdx).toBeGreaterThan(portalMountIdx);
      expect(assetLinksIdx).toBeGreaterThan(-1);
      expect(catchAllIdx).toBeGreaterThan(assetLinksIdx);

      const { isPublicRoute } = require("../../middleware/globalSecurity");
      expect(isPublicRoute("GET", "/.well-known/assetlinks.json")).toBe(true);
      expect(isPublicRoute("HEAD", "/.well-known/assetlinks.json")).toBe(true);
    });
  });

  describe("lookupPortalCompanies & getAndroidAssetLinks", () => {
    afterEach(() => {
      delete process.env.ANDROID_APP_SHA256_FINGERPRINTS;
      delete process.env.ANDROID_PORTAL_SHA256_FINGERPRINTS;
    });

    test("returns empty list when q is missing or shorter than 2 characters", async () => {
      for (const query of [{}, { q: "" }, { q: "a" }, { q: "  x  " }]) {
        const req = createReq({ query });
        const res = createMockRes();
        await lookupPortalCompanies(req, res);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ success: true, data: [] });
      }
      expect(mockPrisma.company.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.company.findMany).not.toHaveBeenCalled();
    });

    test("resolves exact match by publicCode or slug with primaryColor and strips PII", async () => {
      mockPrisma.company.findFirst.mockResolvedValue({
        id: "comp_swan",
        name: "Swan Academy",
        slug: "swan",
        publicCode: "SWAN01",
        customDomain: "portal.swan.eg",
        logo: "/uploads/swan.png",
        phone: "+201001112233",
        email: "secret@swan.eg",
      });
      mockPrisma.storefrontSettings.findMany.mockResolvedValue([
        {
          companyId: "comp_swan",
          designTokens: { colors: { primary: "#10b981" } },
        },
      ]);

      const req = createReq({ query: { q: "swan01" } });
      const res = createMockRes();
      await lookupPortalCompanies(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: [
          {
            id: "comp_swan",
            name: "Swan Academy",
            slug: "swan",
            publicCode: "SWAN01",
            customDomain: "portal.swan.eg",
            logo: "/uploads/swan.png",
            primaryColor: "#10b981",
          },
        ],
      });
      expect(res.body.data[0].phone).toBeUndefined();
      expect(res.body.data[0].email).toBeUndefined();
      expect(mockPrisma.company.findMany).not.toHaveBeenCalled();
    });

    test("searches active companies via findMany (max 8) and returns only public branding fields", async () => {
      mockPrisma.company.findFirst.mockResolvedValue(null);
      mockPrisma.company.findMany.mockResolvedValue([
        {
          id: "comp_1",
          name: "CodeTreps Academy",
          slug: "codetreps",
          publicCode: "CT01",
          customDomain: null,
          logo: null,
          phone: "+201234567890",
        },
        {
          id: "comp_2",
          name: "CodeLab",
          slug: "codelab",
          publicCode: "CL02",
          customDomain: "codelab.eg",
          logo: "https://cdn.example.com/cl.png",
        },
      ]);
      mockPrisma.storefrontSettings.findMany.mockResolvedValue([
        {
          companyId: "comp_2",
          designTokens: { colors: { primary: "#f59e0b" } },
        },
      ]);

      const req = createReq({ query: { q: "code" } });
      const res = createMockRes();
      await lookupPortalCompanies(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 8,
          select: {
            id: true,
            name: true,
            slug: true,
            publicCode: true,
            customDomain: true,
            logo: true,
          },
        }),
      );
      expect(res.body.data).toEqual([
        {
          id: "comp_1",
          name: "CodeTreps Academy",
          slug: "codetreps",
          publicCode: "CT01",
          customDomain: null,
          logo: null,
          primaryColor: "#4f46e5",
        },
        {
          id: "comp_2",
          name: "CodeLab",
          slug: "codelab",
          publicCode: "CL02",
          customDomain: "codelab.eg",
          logo: "https://cdn.example.com/cl.png",
          primaryColor: "#f59e0b",
        },
      ]);
      expect(res.body.data[0].phone).toBeUndefined();
    });

    test("getAndroidAssetLinks returns 200 valid empty JSON array when no fingerprints are configured", () => {
      delete process.env.ANDROID_APP_SHA256_FINGERPRINTS;
      delete process.env.ANDROID_PORTAL_SHA256_FINGERPRINTS;

      const req = createReq({ path: "/.well-known/assetlinks.json" });
      const res = createMockRes();
      getAndroidAssetLinks(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("application/json");
      expect(res.headers["cache-control"]).toBe("public, max-age=3600");
      expect(res.body).toEqual([]);
    });

    test("getAndroidAssetLinks returns Digital Asset Links statements for all 5 Android packages", () => {
      process.env.ANDROID_APP_SHA256_FINGERPRINTS = "AA:BB:CC:11, DD:EE:FF:22";
      process.env.ANDROID_PORTAL_SHA256_FINGERPRINTS = "DD:EE:FF:22, 33:44:55:66";

      const req = createReq({ path: "/.well-known/assetlinks.json" });
      const res = createMockRes();
      getAndroidAssetLinks(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("application/json");
      expect(res.headers["cache-control"]).toBe("public, max-age=3600");
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.map((s) => s.target.package_name)).toEqual([
        "online.maxp.parent",
        "online.maxp.portal",
        "online.maxp.courier",
        "online.maxp.customer",
        "online.maxp.app",
      ]);
      for (const stmt of res.body) {
        expect(stmt.relation).toEqual(["delegate_permission/common.handle_all_urls"]);
        expect(stmt.target.namespace).toBe("android_app");
        expect(stmt.target.sha256_cert_fingerprints).toEqual([
          "AA:BB:CC:11",
          "DD:EE:FF:22",
          "33:44:55:66",
        ]);
      }
    });
  });
});
