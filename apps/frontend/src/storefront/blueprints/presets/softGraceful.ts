import type { StorefrontTemplateBlueprint } from "../types";

export const softGracefulBlueprint: StorefrontTemplateBlueprint = {
  id: "soft-graceful",
  name: "Graceful",
  description:
    "نسخة MaxP من Soft Graceful — تحرير أزياء منسق: Women/Men/Kids + مواسم + مناسبات + hotspot و quick view وسلة منزلقة.",
  baseThemeId: "soft-graceful",
  source: {
    kind: "manual",
    project: "MaxP storefront",
    descriptor: "soft-graceful-fashion-curated",
  },
  tags: ["fashion", "curated", "seasonal", "occasion", "hotspot", "graceful"],
  tokens: {
    colors: {
      primary: "24 14% 14%",
      primaryForeground: "0 0% 100%",
      secondary: "34 28% 94%",
      secondaryForeground: "24 14% 14%",
      accent: "350 32% 62%",
      accentForeground: "0 0% 100%",
      background: "33 33% 97%",
      foreground: "24 14% 14%",
      muted: "32 18% 90%",
      mutedForeground: "24 10% 36%",
      border: "30 16% 85%",
      card: "0 0% 100%",
      cardForeground: "24 14% 14%",
      ring: "350 32% 62%",
    },
    typography: {
      headingFont: '"Cormorant Garamond", "Cairo", serif',
      bodyFont: '"Tajawal", "IBM Plex Sans Arabic", sans-serif',
      baseSize: "16px",
      direction: "rtl",
    },
    shape: {
      borderRadius: "1.4rem",
      buttonRadius: "999px",
    },
    productCard: {
      borderRadius: "1.2rem",
      boxShadow: "0 22px 54px -36px rgba(42, 28, 32, 0.16)",
      hoverShadow: "0 32px 72px -38px rgba(42, 28, 32, 0.22)",
      badgeRadius: "999px",
      buttonRadius: "999px",
      surfaceOpacity: "1",
    },
  },
  seo: {
    titleTemplate: "%s | Graceful",
    description:
      "اكتشاف ذكي بنقاط hotspot، تشكيلات موسمية ومناسباتية، سلة منزلقة، quick view، وتصفية swatches.",
  },
  header: {
    showSearch: true,
    navigation: [
      { label: "الرئيسية", to: "/" },
      { label: "حسب الفئة", to: "/collections" },
      { label: "حسب الموسم", to: "/shop?season=winter" },
      { label: "حسب المناسبة", to: "/collections" },
      { label: "المتجر", to: "/shop" },
      { label: "العروض", to: "/sale" },
    ],
  },
  footer: {
    description:
      "تحرير أزياء منسق مع hotspot تفاعلي، سلة منزلقة، وتجربة اكتشاف موسمية.",
    copyrightText: "© 2026 Graceful",
    socialLinks: {
      instagram: "https://instagram.com",
      facebook: "https://facebook.com",
      whatsapp: "https://wa.me/201000000000",
    },
    navigation: [
      {
        title: "التسوق",
        links: [
          { label: "كل المنتجات", to: "/shop" },
          { label: "حريمي", to: "/shop?category=womens" },
          { label: "رجالي", to: "/shop?category=mens" },
          { label: "أطفال", to: "/shop?category=kids" },
        ],
      },
      {
        title: "المساعدة",
        links: [
          { label: "دليل المقاسات", to: "/size-guide" },
          { label: "الشحن", to: "/shipping" },
          { label: "تواصل معنا", to: "/contact" },
        ],
      },
    ],
  },
  pages: {
    home: {
      pageGoal: "conversion",
      compositionPolicy: { pageGoal: "conversion", enforceTrustSignals: true, preserveManualOrder: true },
      sections: [
        { type: "promo-strip", settings: { badge: "Graceful Picks", message: "شحن مجاني فوق $500 + تشكيلة موسمية جديدة.", saleLabel: "تشكيلات منسقة", shippingLabel: "شحن سريع", returnLabel: "استبدال 14 يوم", ctaText: "استكشف الآن", ctaLink: "/shop" } },
        { type: "hero-banner", variant: "style-ledger", settings: { eyebrow: "Style Made for Every You", title: "أزياء لكل لحظة", subtitle: "حريمي ورجالي وأطفال بإيقاع تحريري هادئ.", ctaText: "تسوقي الآن", ctaLink: "/shop", secondaryCtaText: "التشكيلات", secondaryCtaLink: "/collections", backgroundImage: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&q=80&w=1600", panelImage: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=900" } },
        { type: "featured-collections", settings: { title: "Style Made for Every You", subtitle: "Women / Men / Kids", limit: 3, ctaText: "كل التشكيلات", ctaLink: "/collections" } },
        { type: "featured-products", variant: "quick-view-fashion-grid", settings: { title: "Trending This Week", limit: 8 } },
        { type: "story-parallax", settings: { badge: "New Season Layers", title: "طبقات الموسم الجديد", content: "جاكيتات وطبقات عملية لكل يوم.", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=1600" } },
        { type: "featured-collections", variant: "occasion-ribbon", settings: { title: "Dress for Every Occasion", limit: 4 } },
        { type: "lookbook-showcase", settings: { badge: "Shop The Look", title: "تسوقي اللوك", limit: 4, ctaText: "اكتشفي", ctaLink: "/lookbook" } },
        { type: "newsletter", variant: "editorial-strip", settings: { title: "انضمي لقائمة Graceful", subtitle: "تشكيلات جديدة أولاً.", buttonText: "اشتركي" } },
      ],
    },
    shop: {
      pageGoal: "discovery",
      layoutHint: "commerce-3col",
      compositionPolicy: { pageGoal: "discovery", enforceTrustSignals: true, preserveManualOrder: true },
      sections: [{ type: "shop-command-bar", settings: { title: "اكتشاف أذكى", subtitle: "بحث وتصفية وترتيب محسّن.", searchPlaceholder: "ابحثي عن فستان أو جاكيت", resultsLabel: "منتج", clearButtonText: "مسح", stickyLabel: "تصفية", chipLimit: 7 } }, "filters-sidebar", { type: "product-grid", variant: "quick-view-fashion-grid", settings: { title: "كل المنتجات", limit: 12 } }],
    },
    pdp: {
      pageGoal: "trust",
      layoutHint: "product-detail",
      compositionPolicy: { pageGoal: "trust", enforceTrustSignals: true, preserveManualOrder: true },
      sections: [{ type: "product-gallery", variant: "masonry" }, { type: "product-info", variant: "bento-specs", settings: { descriptionTitle: "تفاصيل القطعة", shippingTitle: "الشحن والاستبدال", shippingText: "خامات موضحة وزووم وفيديو وجدول مقاسات.", sizeGuideLink: "/size-guide" } }, { type: "conversion-stack", variant: "couture-minimal" }, { type: "bought-together", variant: "pairing-rail", settings: { title: "كمّلي اللوك", limit: 3 } }, { type: "related-products", variant: "luxury-card", settings: { title: "قد يعجبك أيضاً", limit: 4 } }, { type: "reviews", variant: "voice-notes", settings: { title: "آراء العملاء", reviewLimit: 4 } }],
    },
    cart: { sections: [{ type: "cart-items", settings: { title: "سلة التسوق" } }, { type: "order-summary", settings: { title: "ملخص الطلب" } }] },
    checkout: { sections: [{ type: "checkout-form" }, { type: "payment" }, { type: "order-summary" }] },
    "thank-you": { sections: [{ type: "order-confirmation", settings: { title: "تم تأكيد طلبك", description: "شكراً لطلبك من Graceful.", continueShoppingText: "تابعي التسوق" } }] },
  },
  metadata: { notes: ["مستوحى من Soft Graceful Shopify — curated collections + seasonal + occasion + hotspot + slide-out cart"] },
};
