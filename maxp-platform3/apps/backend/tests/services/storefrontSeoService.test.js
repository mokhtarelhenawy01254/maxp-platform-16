const {
  buildStorefrontSeoMetadata,
  injectStorefrontSeoTags,
  isHtmlRouteRequest,
  resolveProductSeoOverrides,
} = require("../../services/storefrontSeoService");

describe("storefrontSeoService", () => {
  test("uses company-specific metadata for storefront homepage", () => {
    const metadata = buildStorefrontSeoMetadata({
      pathname: "/",
      currentUrl: "https://swan.maxp.online/",
      company: {
        name: "Swan",
        logo: "/uploads/brands/swan-logo.png",
        settings: JSON.stringify({
          description: "أحذية عصرية بتصميمات مريحة للحياة اليومية.",
        }),
      },
      storefrontSettings: {
        designTokens: {
          storeName: "Swan Store",
        },
      },
      templateContent: {
        settings: {
          seo: {
            titleTemplate: "%s | {{store}}",
          },
        },
      },
    });

    expect(metadata.title).toBe("Swan Store");
    expect(metadata.description).toBe("أحذية عصرية بتصميمات مريحة للحياة اليومية.");
    expect(metadata.image).toBe("https://swan.maxp.online/uploads/brands/swan-logo.png");
    expect(metadata.faviconUrl).toBe("https://swan.maxp.online/uploads/brands/swan-logo.png");
  });

  test("prefers product metadata for product routes", () => {
    const metadata = buildStorefrontSeoMetadata({
      pathname: "/product/swan-motion",
      currentUrl: "https://swan.maxp.online/product/swan-motion",
      company: {
        name: "Swan",
        logo: "/uploads/brands/swan-logo.png",
        settings: "{}",
      },
      storefrontSettings: {
        designTokens: {},
      },
      templateContent: {
        settings: {
          seo: {
            titleTemplate: "%s | {{store}}",
            description: "وصف افتراضي للمتجر",
          },
        },
      },
      product: {
        name: "Swan Motion",
        description: "<p>حذاء خفيف بوسادة مريحة.</p>",
        metaTitle: "Swan Motion | Swan",
        metaDescription: "حذاء نسائي خفيف بوسادة مريحة للارتداء اليومي.",
        mainImage: "/uploads/products/swan-motion-main.jpg",
        images: JSON.stringify(["/uploads/products/swan-motion-2.jpg"]),
      },
    });

    expect(metadata.title).toBe("Swan Motion | Swan");
    expect(metadata.description).toBe("حذاء نسائي خفيف بوسادة مريحة للارتداء اليومي.");
    expect(metadata.image).toBe(
      "https://swan.maxp.online/uploads/products/swan-motion-main.jpg",
    );
    expect(metadata.type).toBe("product");
  });

  test("reads product seo overrides from product metadata payloads", () => {
    const product = resolveProductSeoOverrides({
      name: "Boot Swan",
      description: "Fallback description",
      metadata: JSON.stringify({
        metaTitle: "Boot Swan SEO",
        seo: {
          metaDescription: "وصف SEO محفوظ داخل metadata",
        },
      }),
    });

    expect(product.metaTitle).toBe("Boot Swan SEO");
    expect(product.metaDescription).toBe("وصف SEO محفوظ داخل metadata");
  });

  test("injects updated seo tags into the storefront shell", () => {
    const html = `<!DOCTYPE html>
<html lang="ar">
<head>
  <meta name="description" content="old description" />
  <meta property="og:title" content="old title" />
  <meta property="og:description" content="old og description" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://example.com" />
  <meta property="og:image" content="/old.png" />
  <meta name="twitter:title" content="old twitter title" />
  <meta name="twitter:description" content="old twitter description" />
  <link rel="icon" href="/vite.svg" />
  <title>Old Title</title>
</head>
<body></body>
</html>`;

    const updated = injectStorefrontSeoTags(html, {
      title: "Swan Store",
      description: "وصف خاص بمتجر Swan",
      image: "https://swan.maxp.online/uploads/swan-og.jpg",
      faviconUrl: "https://swan.maxp.online/uploads/swan-icon.png",
      siteName: "Swan Store",
      url: "https://swan.maxp.online/",
      type: "website",
    });

    expect(updated).toContain("<title>Swan Store</title>");
    expect(updated).toContain('property="og:title" content="Swan Store"');
    expect(updated).toContain('name="description" content="وصف خاص بمتجر Swan"');
    expect(updated).toContain('name="twitter:image" content="https://swan.maxp.online/uploads/swan-og.jpg"');
    expect(updated).toContain('rel="icon" href="https://swan.maxp.online/uploads/swan-icon.png"');
    expect(updated).toContain('rel="canonical" href="https://swan.maxp.online/"');
  });

  test("treats HEAD storefront shell probes as HTML route requests", () => {
    expect(
      isHtmlRouteRequest({
        method: "HEAD",
        path: "/shop",
        headers: {
          accept: "text/html,application/xhtml+xml",
        },
      }),
    ).toBe(true);
  });
});
