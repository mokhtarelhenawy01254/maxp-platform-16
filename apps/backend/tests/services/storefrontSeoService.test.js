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

  test("injects product JSON-LD schema and hero image preload for product routes", () => {
    const metadata = buildStorefrontSeoMetadata({
      pathname: "/product/swan-motion",
      currentUrl: "https://swan.maxp.online/product/swan-motion",
      company: { name: "Swan", currency: "EGP" },
      product: {
        name: "Swan Motion",
        price: 499,
        currency: "EGP",
        mainImage: "/uploads/products/swan-motion.jpg",
      },
    });

    expect(metadata.jsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Swan Motion",
      offers: {
        "@type": "Offer",
        price: 499,
        priceCurrency: "EGP",
        availability: "https://schema.org/InStock",
      },
    });

    const html = `<!DOCTYPE html><html><head><title>Old</title></head><body></body></html>`;
    const updated = injectStorefrontSeoTags(html, metadata);

    expect(updated).toContain('rel="preload" as="image"');
    expect(updated).toContain('fetchpriority="high"');
    expect(updated).toContain('application/ld+json');
    expect(updated).toContain('"@type":"Product"');
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

  test("cleans tracking parameters from canonical URL", () => {
    const metadata = buildStorefrontSeoMetadata({
      pathname: "/shop",
      currentUrl: "https://swan.maxp.online/shop?utm_source=facebook&fbclid=123456&gclid=789",
      company: { name: "Swan" },
    });

    expect(metadata.url).toBe("https://swan.maxp.online/shop");
    const html = `<!DOCTYPE html><html><head><title>Old</title></head><body></body></html>`;
    const updated = injectStorefrontSeoTags(html, metadata);
    expect(updated).toContain('<link rel="canonical" href="https://swan.maxp.online/shop" />');
    expect(updated).not.toContain("fbclid");
    expect(updated).not.toContain("utm_source");
  });

  test("builds category SEO metadata and CollectionPage schema", () => {
    const metadata = buildStorefrontSeoMetadata({
      pathname: "/collections/summer-shoes",
      currentUrl: "https://swan.maxp.online/collections/summer-shoes",
      company: { name: "Swan" },
      category: {
        name: "Summer Shoes",
        slug: "summer-shoes",
        metaTitle: "أحذية صيفية مريحة | Swan",
        metaDescription: "تسوق أفضل الأحذية الصيفية المريحة بأفضل الأسعار.",
        image: "/uploads/categories/shoes.jpg",
      },
    });

    expect(metadata.title).toBe("أحذية صيفية مريحة | Swan");
    expect(metadata.description).toBe("تسوق أفضل الأحذية الصيفية المريحة بأفضل الأسعار.");
    expect(metadata.jsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "أحذية صيفية مريحة | Swan",
    });
    expect(metadata.breadcrumbsJsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
    });
  });

  test("includes reviews aggregate rating in product schema and commerce meta tags", () => {
    const metadata = buildStorefrontSeoMetadata({
      pathname: "/product/swan-pro",
      currentUrl: "https://swan.maxp.online/product/swan-pro",
      company: { name: "Swan", currency: "EGP" },
      product: {
        name: "Swan Pro",
        price: 750,
        currency: "EGP",
        sku: "SWAN-PRO-01",
        trackInventory: true,
        stock: 15,
      },
      reviews: {
        avgRating: 4.8,
        count: 24,
      },
    });

    expect(metadata.jsonLd.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: 24,
      bestRating: "5",
      worstRating: "1",
    });
    expect(metadata.jsonLd.offers.availability).toBe("https://schema.org/InStock");
    expect(metadata.jsonLd.sku).toBe("SWAN-PRO-01");

    const html = `<!DOCTYPE html><html><head><title>Old</title></head><body></body></html>`;
    const updated = injectStorefrontSeoTags(html, metadata);
    expect(updated).toContain('<meta property="product:price:amount" content="750" />');
    expect(updated).toContain('<meta property="product:price:currency" content="EGP" />');
    expect(updated).toContain('<meta property="product:availability" content="https://schema.org/InStock" />');
    expect(updated).toContain('<meta property="product:retailer_item_id" content="SWAN-PRO-01" />');
  });

  test("detects out-of-stock product and reflects OutOfStock in schema and meta", () => {
    const metadata = buildStorefrontSeoMetadata({
      pathname: "/product/swan-zero",
      currentUrl: "https://swan.maxp.online/product/swan-zero",
      company: { name: "Swan", currency: "EGP" },
      product: {
        name: "Swan Zero",
        price: 300,
        trackInventory: true,
        stock: 0,
      },
    });

    expect(metadata.jsonLd.offers.availability).toBe("https://schema.org/OutOfStock");
    expect(metadata.availability).toBe("https://schema.org/OutOfStock");
  });

  test("injects Google and Facebook site verification meta tags", () => {
    const metadata = buildStorefrontSeoMetadata({
      pathname: "/",
      currentUrl: "https://swan.maxp.online/",
      company: {
        name: "Swan",
        settings: JSON.stringify({
          googleSiteVerification: "google-xyz-12345",
          facebookDomainVerification: "fb-domain-67890",
        }),
      },
    });

    expect(metadata.googleSiteVerification).toBe("google-xyz-12345");
    expect(metadata.facebookDomainVerification).toBe("fb-domain-67890");

    const html = `<!DOCTYPE html><html><head><title>Old</title></head><body></body></html>`;
    const updated = injectStorefrontSeoTags(html, metadata);
    expect(updated).toContain('<meta name="google-site-verification" content="google-xyz-12345" />');
    expect(updated).toContain('<meta name="facebook-domain-verification" content="fb-domain-67890" />');
  });

  test("builds OnlineStore JSON-LD schema with social links and contact info for homepage", () => {
    const metadata = buildStorefrontSeoMetadata({
      pathname: "/",
      currentUrl: "https://swan.maxp.online/",
      company: {
        name: "Swan",
        phone: "+201000000000",
        email: "support@swan.com",
        settings: JSON.stringify({
          facebook: "https://facebook.com/swanstore",
          instagram: "https://instagram.com/swanstore",
          tiktok: "https://tiktok.com/@swanstore",
        }),
      },
    });

    expect(metadata.secondaryJsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      name: "Swan",
      url: "https://swan.maxp.online/",
      telephone: "+201000000000",
      email: "support@swan.com",
      priceRange: "$$",
      sameAs: [
        "https://facebook.com/swanstore",
        "https://instagram.com/swanstore",
        "https://tiktok.com/@swanstore",
      ],
    });
  });

  test("injects preconnect and dns-prefetch resource hints for external CDN image origins", () => {
    const metadata = {
      title: "Test Store",
      description: "Test description",
      url: "https://mystore.com/",
      image: "https://cdn.images.net/products/item1.jpg",
      siteName: "Test Store",
      direction: "rtl",
    };

    const html = `<!DOCTYPE html><html lang="ar"><head><title>Old</title></head><body></body></html>`;
    const updated = injectStorefrontSeoTags(html, metadata);

    expect(updated).toContain('<link rel="preconnect" href="https://cdn.images.net" crossorigin />');
    expect(updated).toContain('<link rel="dns-prefetch" href="https://cdn.images.net" />');
    expect(updated).toContain('<link rel="preload" href="/api/v1/public/storefront/settings" as="fetch" crossorigin="use-credentials" />');
  });

  test("injects dynamic html lang and dir matching theme direction (LTR/RTL)", () => {
    const metadataLtr = {
      title: "English Store",
      description: "English desc",
      url: "https://en.mystore.com/",
      siteName: "English Store",
      direction: "ltr",
    };

    const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><title>Old</title></head><body></body></html>`;
    const updatedLtr = injectStorefrontSeoTags(html, metadataLtr);
    expect(updatedLtr).toContain('<html lang="en" dir="ltr">');

    const metadataRtl = {
      title: "Arabic Store",
      description: "Arabic desc",
      url: "https://ar.mystore.com/",
      siteName: "Arabic Store",
      direction: "rtl",
    };
    const updatedRtl = injectStorefrontSeoTags(html, metadataRtl);
    expect(updatedRtl).toContain('<html lang="ar" dir="rtl">');
  });

  test("builds tailored SEO descriptions for store pages /shop, /collections, and /sale", () => {
    const shopMeta = buildStorefrontSeoMetadata({
      pathname: "/shop",
      currentUrl: "https://swan.maxp.online/shop",
      company: { name: "Swan" },
    });
    expect(shopMeta.title).toBe("المتجر | Swan");
    expect(shopMeta.description).toContain("Swan");
    expect(shopMeta.description).not.toContain("تعطيل JavaScript");

    const collMeta = buildStorefrontSeoMetadata({
      pathname: "/collections",
      currentUrl: "https://swan.maxp.online/collections",
      company: { name: "Swan" },
    });
    expect(collMeta.title).toBe("التصنيفات | Swan");
    expect(collMeta.description).toContain("Swan");

    const saleMeta = buildStorefrontSeoMetadata({
      pathname: "/sale",
      currentUrl: "https://swan.maxp.online/sale?page=2",
      company: { name: "Swan" },
    });
    expect(saleMeta.title).toBe("التخفيضات | Swan");
    expect(saleMeta.description).toContain("Swan");
  });

  test("uses product slug or category fallback instead of generic 'المنتج' title", () => {
    // When product is null on /product/three-line route
    const fallbackMeta = buildStorefrontSeoMetadata({
      pathname: "/product/three-line",
      currentUrl: "https://swan.maxp.online/product/three-line",
      company: { name: "Swan" },
    });
    expect(fallbackMeta.title).toBe("three line | Swan");
    expect(fallbackMeta.description).toContain("three line");

    // When product exists but has no name or metaTitle
    const productWithCategory = buildStorefrontSeoMetadata({
      pathname: "/product/prod-123",
      currentUrl: "https://swan.maxp.online/product/prod-123",
      company: { name: "Swan" },
      product: {
        category: { name: "أحذية رياضية" },
      },
    });
    expect(productWithCategory.title).toBe("منتج أحذية رياضية | Swan");
  });

  test("uses custom storePage title, metaTitle, and metaDescription when provided", () => {
    // When custom storePage has metaTitle and metaDescription
    const customPageMeta = buildStorefrontSeoMetadata({
      pathname: "/vip-club",
      currentUrl: "https://swan.maxp.online/vip-club",
      company: { name: "Swan" },
      storePage: {
        title: "نادي كبار العملاء",
        metaTitle: "انضم إلى نادي كبار العملاء في سوان",
        metaDescription: "برنامج ولاء خاص ومكافآت حصرية لعملاء سوان.",
        slug: "vip-club",
      },
    });
    expect(customPageMeta.title).toBe("انضم إلى نادي كبار العملاء في سوان");
    expect(customPageMeta.description).toBe("برنامج ولاء خاص ومكافآت حصرية لعملاء سوان.");

    // When custom storePage has title only (no metaTitle or metaDescription)
    const titleOnlyMeta = buildStorefrontSeoMetadata({
      pathname: "/custom-warranty",
      currentUrl: "https://swan.maxp.online/custom-warranty",
      company: {
        name: "Swan",
        settings: JSON.stringify({ description: "احذية فاخرة" }),
      },
      storePage: {
        title: "سياسة الضمان المعتمد",
        slug: "custom-warranty",
      },
    });
    expect(titleOnlyMeta.title).toBe("سياسة الضمان المعتمد | Swan");
    expect(titleOnlyMeta.description).toBe("سياسة الضمان المعتمد — Swan. احذية فاخرة");
  });

  test("translates common English policy and store page slugs to Arabic and starts description with page title", () => {
    // /terms with store description
    const termsMeta = buildStorefrontSeoMetadata({
      pathname: "/terms",
      currentUrl: "https://swan.maxp.online/terms",
      company: {
        name: "Swan",
        settings: JSON.stringify({ description: "احذية فاخرة" }),
      },
    });
    expect(termsMeta.title).toBe("الشروط والأحكام | Swan");
    expect(termsMeta.description).toBe("الشروط والأحكام — Swan. احذية فاخرة");
    expect(termsMeta.description.startsWith("الشروط والأحكام")).toBe(true);

    // /about-us without store description
    const aboutMeta = buildStorefrontSeoMetadata({
      pathname: "/about-us",
      currentUrl: "https://tato.maxp.online/about-us",
      company: { name: "TATO" },
    });
    expect(aboutMeta.title).toBe("من نحن | TATO");
    expect(aboutMeta.description.startsWith("من نحن")).toBe(true);
    expect(aboutMeta.description).toContain("TATO");

    // /privacy, /contact, /shipping-policy, /return-policy, /refund-policy
    const privacyMeta = buildStorefrontSeoMetadata({
      pathname: "/privacy",
      currentUrl: "https://swan.maxp.online/privacy",
      company: { name: "Swan" },
    });
    expect(privacyMeta.title).toBe("سياسة الخصوصية | Swan");
    expect(privacyMeta.description.startsWith("سياسة الخصوصية")).toBe(true);

    const contactMeta = buildStorefrontSeoMetadata({
      pathname: "/contact",
      currentUrl: "https://swan.maxp.online/contact",
      company: { name: "Swan" },
    });
    expect(contactMeta.title).toBe("اتصل بنا | Swan");

    const shippingMeta = buildStorefrontSeoMetadata({
      pathname: "/shipping-policy",
      currentUrl: "https://swan.maxp.online/shipping-policy",
      company: { name: "Swan" },
    });
    expect(shippingMeta.title).toBe("سياسة الشحن والتوصيل | Swan");

    const returnMeta = buildStorefrontSeoMetadata({
      pathname: "/return-policy",
      currentUrl: "https://swan.maxp.online/return-policy",
      company: { name: "Swan" },
    });
    expect(returnMeta.title).toBe("سياسة الاستبدال والاسترجاع | Swan");

    const refundMeta = buildStorefrontSeoMetadata({
      pathname: "/refund-policy",
      currentUrl: "https://swan.maxp.online/refund-policy",
      company: { name: "Swan" },
    });
    expect(refundMeta.title).toBe("سياسة الاسترداد | Swan");
  });

  test("normalizes product canonical URL when product slug contains spaces or special characters", () => {
    const metadata = buildStorefrontSeoMetadata({
      pathname: "/product/%C5%9E%C4%B1k-Sole",
      currentUrl: "https://swan.maxp.online/product/%C5%9E%C4%B1k-Sole",
      company: { name: "Swan" },
      product: {
        id: "prod_123",
        name: "Şık Sole",
        slug: "Şık Sole", // Raw slug with spaces in DB
        price: 1200,
      },
    });

    expect(metadata.url).toBe("https://swan.maxp.online/product/%C5%9E%C4%B1k-Sole");
    expect(metadata.jsonLd.offers.url).toBe("https://swan.maxp.online/product/%C5%9E%C4%B1k-Sole");

    const html = `<!DOCTYPE html><html><head><title>Old</title></head><body></body></html>`;
    const updated = injectStorefrontSeoTags(html, metadata);

    expect(updated).toContain('rel="canonical" href="https://swan.maxp.online/product/%C5%9E%C4%B1k-Sole"');
    expect(updated).toContain('property="og:url" content="https://swan.maxp.online/product/%C5%9E%C4%B1k-Sole"');
    expect(updated).toContain('"url":"https://swan.maxp.online/product/%C5%9E%C4%B1k-Sole"');
  });
});

