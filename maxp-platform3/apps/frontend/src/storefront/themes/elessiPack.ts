import type { StorefrontTheme } from "../types/theme.types";

type ElessiCollectionSeed = {
  title: string;
  subtitle: string;
  image: string;
  slug: string;
};

type ElessiThemeSeed = {
  id: string;
  name: string;
  brandName: string;
  previewImageUrl: string;
  palette: {
    primary: string;
    primaryForeground?: string;
    secondary: string;
    secondaryForeground?: string;
    accent: string;
    accentForeground?: string;
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    card: string;
    cardForeground: string;
    ring?: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  shape?: {
    borderRadius?: string;
    buttonRadius?: string;
  };
  productCard?: {
    borderRadius?: string;
    boxShadow?: string;
    hoverShadow?: string;
    badgeRadius?: string;
    buttonRadius?: string;
    surfaceOpacity?: string;
  };
  headerVariant?: "default" | "floating-dark" | "editorial-soft" | "utility-frame" | "digital-command";
  footerVariant?: "default" | "editorial-soft" | "utility-frame" | "signature-panel" | "digital-command";
  headerNavigation?: Array<{ label: string; to: string }>;
  headerActions?: Array<{
    label: string;
    to: string;
    style?: "link" | "outline" | "primary";
  }>;
  footerNavigation?: Array<{
    title: string;
    links: Array<{ label: string; to: string }>;
  }>;
  footerLegalLinks?: Array<{ label: string; to: string }>;
  heroVariant:
    | "elessi-spotlight"
    | "elessi-jewel-salon"
    | "elessi-dual-merch"
    | "elessi-promo-cascade"
    | "elessi-pet-sunroom"
    | "elessi-garage-command"
    | "elessi-utility-stage"
    | "elessi-soft-departments"
    | "elessi-organic-harvest"
    | "elessi-digital-launch"
    | "elessi-bag-hero"
    | "elessi-beauty-ritual"
    | "elessi-plant-slider"
    | "elessi-bike-hero";
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    backgroundImage: string;
    panelImage: string;
    panelTitle: string;
    panelSubtitle: string;
    panelEyebrow?: string;
    panelMetricLabel?: string;
    panelMetricValue?: string;
  };
  heroHighlights?: Array<{
    label: string;
    value: string;
  }>;
  collectionsVariant:
    | "elessi-merch-panels"
    | "elessi-pill-shelf"
    | "elessi-story-cards"
    | "elessi-utility-cards"
    | "elessi-organic-routes"
    | "elessi-digital-departments"
    | "elessi-bag-categories"
    | "elessi-plant-categories"
    | "elessi-bike-panels";
  collectionsTitle: string;
  collectionsSubtitle: string;
  collections: ElessiCollectionSeed[];
  homeGridVariant:
    | "elessi-spotlight-grid"
    | "elessi-listing-grid"
    | "elessi-compact-shelf"
    | "elessi-editorial-stack"
    | "elessi-organic-market-grid"
    | "elessi-digital-launch-grid"
    | "elessi-bag-grid"
    | "elessi-plant-favorites"
    | "elessi-bike-grid";
  homeGridTitle: string;
  homeGridSubtitle: string;
  shopBarVariant:
    | "elessi-filter-deck"
    | "elessi-category-ribbon"
    | "elessi-spec-toolbar"
    | "elessi-gift-toolbar"
    | "elessi-organic-toolbar"
    | "elessi-digital-toolbar"
    | "elessi-bag-toolbar"
    | "elessi-plant-toolbar"
    | "elessi-bike-toolbar";
  shopTitle: string;
  shopSubtitle: string;
  shopSearchPlaceholder: string;
  shopGridVariant:
    | "elessi-spotlight-grid"
    | "elessi-listing-grid"
    | "elessi-compact-shelf"
    | "elessi-editorial-stack"
    | "elessi-organic-shop-grid"
    | "elessi-digital-catalog-grid"
    | "elessi-bag-shop-grid"
    | "elessi-plant-nursery-grid"
    | "elessi-bike-shop-grid";
  shopGridTitle: string;
  shopGridSubtitle: string;
  galleryVariant:
    | "elessi-showroom"
    | "elessi-mosaic-stage"
    | "elessi-detail-column"
    | "elessi-organic-gallery"
    | "elessi-digital-gallery"
    | "elessi-bag-gallery"
    | "elessi-plant-gallery"
    | "elessi-bike-gallery";
  infoVariant:
    | "elessi-buybox"
    | "elessi-spec-buybox"
    | "elessi-garage-buybox"
    | "elessi-gift-buybox"
    | "elessi-pet-buybox"
    | "elessi-watch-buybox"
    | "elessi-care-buybox"
    | "elessi-organic-buybox"
    | "elessi-digital-buybox"
    | "elessi-bag-buybox"
    | "elessi-plant-buybox"
    | "elessi-bike-buybox";
  relatedVariant:
    | "elessi-merch-rail"
    | "elessi-complete-set"
    | "elessi-discovery-strip"
    | "elessi-organic-related"
    | "elessi-digital-related"
    | "elessi-plant-related"
    | "elessi-bike-related";
  reviewsVariant:
    | "elessi-proof-wall"
    | "elessi-story-grid"
    | "elessi-trust-pile"
    | "elessi-plant-reviews";
  pdpSettings?: Record<string, unknown>;
  productInfoSettings?: Record<string, unknown>;
  footerDescription: string;
};

const buildCollectionLink = (slug: string) => `/shop?category=${encodeURIComponent(slug)}`;

const createTheme = (seed: ElessiThemeSeed): StorefrontTheme => ({
  id: seed.id,
  name: seed.name,
  direction: "rtl",
  tokens: {
    colors: {
      primary: seed.palette.primary,
      primaryForeground: seed.palette.primaryForeground || "38 60% 97%",
      secondary: seed.palette.secondary,
      secondaryForeground: seed.palette.secondaryForeground || seed.palette.foreground,
      accent: seed.palette.accent,
      accentForeground: seed.palette.accentForeground || "38 60% 97%",
      background: seed.palette.background,
      foreground: seed.palette.foreground,
      muted: seed.palette.muted,
      mutedForeground: seed.palette.mutedForeground,
      border: seed.palette.border,
      card: seed.palette.card,
      cardForeground: seed.palette.cardForeground,
      ring: seed.palette.ring || seed.palette.accent,
    },
    typography: {
      headingFont: seed.typography.headingFont,
      bodyFont: seed.typography.bodyFont,
      baseSize: "16px",
      direction: "rtl",
    },
    shape: {
      borderRadius: seed.shape?.borderRadius || "1.8rem",
      buttonRadius: seed.shape?.buttonRadius || "999px",
    },
    productCard: {
      borderRadius: seed.productCard?.borderRadius || "1.45rem",
      boxShadow:
        seed.productCard?.boxShadow ||
        "0 26px 76px -52px rgba(61,41,44,0.18)",
      hoverShadow:
        seed.productCard?.hoverShadow ||
        "0 34px 88px -48px rgba(61,41,44,0.24)",
      badgeRadius: seed.productCard?.badgeRadius || "999px",
      buttonRadius: seed.productCard?.buttonRadius || "999px",
      surfaceOpacity: seed.productCard?.surfaceOpacity || "1",
    },
    layout: {
      contentAlign: "start",
    },
  },
  preview: {
    imageUrl: seed.previewImageUrl,
    colors: [seed.palette.primary, seed.palette.secondary, seed.palette.accent],
  },
  header: {
    variant: seed.headerVariant || "utility-frame",
    transparentOnHome: true,
    brandName: seed.brandName,
    showSearch: true,
    showCart: true,
    actions: seed.headerActions || [],
    navigation:
      seed.headerNavigation || [
        { label: "الرئيسية", to: "/" },
        { label: "المتجر", to: "/shop" },
        { label: "الأقسام", to: "/collections" },
        { label: "الأكثر طلبًا", to: "/sale" },
      ],
  },
  footer: {
    variant: seed.footerVariant || "utility-frame",
    description: seed.footerDescription,
    copyrightText: `© 2026 ${seed.brandName}. جميع الحقوق محفوظة.`,
    socialLinks: {
      instagram: "https://instagram.com",
      facebook: "https://facebook.com",
      whatsapp: "https://wa.me/201000000000",
    },
    navigation:
      seed.footerNavigation || [
        {
          title: "التسوق",
          links: [
            { label: "كل المنتجات", to: "/shop" },
            { label: "الأقسام", to: "/collections" },
            { label: "العروض", to: "/sale" },
          ],
        },
        {
          title: "الخدمة",
          links: [
            { label: "الشحن والتوصيل", to: "/shipping" },
            { label: "الاستبدال والاسترجاع", to: "/returns" },
            { label: "الأسئلة الشائعة", to: "/faq" },
          ],
        },
      ],
  },
  pages: {
    home: {
      sections: [
        {
          type: "hero-banner",
          variant: seed.heroVariant,
          settings: {
            eyebrow: seed.hero.eyebrow,
            title: seed.hero.title,
            subtitle: seed.hero.subtitle,
            ctaText: "ابدأ التسوق",
            ctaLink: "/shop",
            secondaryCtaText: "تصفح الأقسام",
            secondaryCtaLink: "/collections",
            backgroundImage: seed.hero.backgroundImage,
            panelImage: seed.hero.panelImage,
            panelTitle: seed.hero.panelTitle,
            panelSubtitle: seed.hero.panelSubtitle,
            panelEyebrow: seed.hero.panelEyebrow || "مختارات المتجر",
            panelMetricLabel: seed.hero.panelMetricLabel || "التوصيل",
            panelMetricValue: seed.hero.panelMetricValue || "48 ساعة",
            highlights:
              seed.heroHighlights || [
                { label: "أقسام", value: `${seed.collections.length}` },
                { label: "الشحن", value: "سريع" },
                { label: "الاسترجاع", value: "14 يوم" },
              ],
          },
        },
        {
          type: "featured-collections",
          variant: seed.collectionsVariant,
          settings: {
            title: seed.collectionsTitle,
            subtitle: seed.collectionsSubtitle,
            limit: seed.collections.length,
            ctaText: "كل الأقسام",
            ctaLink: "/collections",
            collections: seed.collections.map((collection) => ({
              title: collection.title,
              subtitle: collection.subtitle,
              image: collection.image,
              link: buildCollectionLink(collection.slug),
            })),
          },
        },
        {
          type: "featured-products",
          variant: seed.homeGridVariant,
          settings: {
            title: seed.homeGridTitle,
            subtitle: seed.homeGridSubtitle,
            limit: 6,
          },
        },
      ],
      pageGoal: "conversion",
      compositionPolicy: {
        pageGoal: "conversion",
        preserveManualOrder: true,
        enforceTrustSignals: true,
      },
    },
    shop: {
      layoutHint: "stack",
      sections: [
        {
          type: "shop-command-bar",
          variant: seed.shopBarVariant,
          settings: {
            title: seed.shopTitle,
            subtitle: seed.shopSubtitle,
            searchPlaceholder: seed.shopSearchPlaceholder,
            resultsLabel: "منتج",
            clearButtonText: "مسح الفلاتر",
          },
        },
        {
          type: "product-grid",
          variant: seed.shopGridVariant,
          settings: {
            title: seed.shopGridTitle,
            subtitle: seed.shopGridSubtitle,
            limit: 12,
          },
        },
      ],
      pageGoal: "discovery",
      compositionPolicy: {
        pageGoal: "discovery",
        preserveManualOrder: true,
        enforceTrustSignals: true,
      },
    },
    pdp: {
      layoutHint: "product-detail",
      settings: seed.pdpSettings,
      sections: [
        { type: "product-gallery", variant: seed.galleryVariant },
        {
          type: "product-info",
          variant: seed.infoVariant,
          settings: {
            addToCartText: "أضف للسلة",
            shippingTitle: "الشحن والاستبدال",
            shippingText:
              "تظهر تكلفة الشحن وخيارات الاستبدال بوضوح داخل المسار قبل تأكيد الطلب، مع دعم واضح بعد الشراء.",
            guaranteesTitle: "ثقة المتجر",
            guaranteesSubtitle: "تفاصيل قصيرة تبقي القرار واضحًا ومطمئنًا.",
            ...(seed.productInfoSettings || {}),
          },
        },
        {
          type: "related-products",
          variant: seed.relatedVariant,
          settings: {
            title: "اختيارات تكمل القرار",
            subtitle: "منتجات تكمل الطلب الحالي أو تضيف خيارًا مناسبًا قبل الإضافة إلى السلة.",
            limit: 4,
          },
        },
        {
          type: "reviews",
          variant: seed.reviewsVariant,
          settings: {
            title: "آراء العملاء",
            subtitle: "تجارب حقيقية وصور سريعة تساعدك على الشراء بثقة.",
            reviewLimit: 4,
            mobileReviewLimit: 2,
          },
        },
      ],
      pageGoal: "conversion",
      compositionPolicy: {
        pageGoal: "conversion",
        preserveManualOrder: true,
        enforceTrustSignals: true,
      },
    },
    cart: {
      layoutHint: "sidebar-right",
      sections: ["cart-items", "order-summary"],
    },
    checkout: {
      layoutHint: "sidebar-right",
      sections: ["cart-items", "checkout-form", "payment", "order-summary"],
    },
  },
});

const THEME_SEEDS: ElessiThemeSeed[] = [
  {
    id: "elessi-carry-lane",
    name: "ممر الحقائب",
    brandName: "Carry Lane",
    previewImageUrl: "/assets/themes/elessi-carry-lane/preview.svg",
    headerVariant: "default",
    footerVariant: "default",
    headerNavigation: [
      { label: "الرئيسية", to: "/" },
      { label: "الحقائب اليومية", to: "/shop?category=daily-bags" },
      { label: "السفر", to: "/shop?category=travel-bags" },
      { label: "الهدايا", to: "/shop?category=gift-picks" },
      { label: "الأكثر طلبًا", to: "/sale" },
    ],
    palette: {
      primary: "22 14% 13%",
      secondary: "210 24% 95%",
      accent: "33 52% 54%",
      background: "36 18% 98%",
      foreground: "22 12% 12%",
      muted: "210 14% 92%",
      mutedForeground: "22 8% 38%",
      border: "210 12% 84%",
      card: "0 0% 100%",
      cardForeground: "22 12% 12%",
    },
    typography: {
      headingFont: "\"Bodoni Moda\", Cairo, serif",
      bodyFont: "\"IBM Plex Sans Arabic\", Cairo, sans-serif",
    },
    shape: {
      borderRadius: "0.9rem",
      buttonRadius: "0.55rem",
    },
    productCard: {
      borderRadius: "0.95rem",
      boxShadow: "0 22px 64px -50px rgba(28,22,18,0.16)",
      hoverShadow: "0 28px 72px -44px rgba(28,22,18,0.22)",
      badgeRadius: "0.55rem",
      buttonRadius: "0.55rem",
    },
    heroVariant: "elessi-bag-hero",
    hero: {
      eyebrow: "حقائب وإكسسوارات",
      title: "حقائب يومية وسفر تبدأ منها السلة بسهولة",
      subtitle: "اختاري التوت العملي أو حقيبة السفر أو الهدية الصغيرة، مع صور أقرب للمنتج ومقاسات أوضح قبل الإضافة.",
      backgroundImage: "/assets/themes/elessi-carry-lane/tote-cutout.png",
      panelImage: "/assets/themes/elessi-carry-lane/sylvie-cutout.png",
      panelTitle: "ابدئي من اليومي أو السفر أو هدية جاهزة",
      panelSubtitle: "ألوان حيادية، مساحات داخلية مدروسة، وإرجاع أسهل لو احتجت تبديل الاستخدام أو المقاس.",
      panelEyebrow: "حقائب هذا الأسبوع",
      panelMetricLabel: "إرجاع",
      panelMetricValue: "14 يوم",
    },
    heroHighlights: [
      { label: "الاستخدام", value: "يومي / سفر / هدية" },
      { label: "الخامات", value: "جلد / قماش / أحزمة" },
      { label: "الإرجاع", value: "14 يوم" },
    ],
    collectionsVariant: "elessi-bag-categories",
    collectionsTitle: "اختَر الطريق الأسرع لشنطتك",
    collectionsSubtitle: "تقسيمات تساعدك تختاري حسب الاستخدام والمقاس وما يدخل مع السلة بدون لف طويل.",
    collections: [
      { title: "حقائب يومية", subtitle: "كتفيات وتوت للحركة اليومية والعمل.", image: "/assets/themes/elessi-carry-lane/tote.jpg", slug: "daily-bags" },
      { title: "سفر وتنقل", subtitle: "موديلات أخف للتنقل والرحلات القصيرة.", image: "/assets/themes/elessi-carry-lane/marmont.jpg", slug: "travel-bags" },
      { title: "هدايا راقية", subtitle: "قطع أصغر مناسبة للإهداء السريع.", image: "/assets/themes/elessi-carry-lane/sylvie.jpg", slug: "gift-picks" },
      { title: "إضافات وأحزمة", subtitle: "محافظ وأحزمة تكمل الطلب بدون تشتيت.", image: "/assets/themes/elessi-carry-lane/dionysus.jpg", slug: "wallets-belts" },
    ],
    homeGridVariant: "elessi-bag-grid",
    homeGridTitle: "الحقائب الأكثر طلبًا هذا الأسبوع",
    homeGridSubtitle: "موديلات يومية، هدايا، وإكسسوارات تكمل الطلب في نفس الزيارة.",
    shopBarVariant: "elessi-bag-toolbar",
    shopTitle: "متجر Carry Lane",
    shopSubtitle: "فلتر حسب الاستخدام أو المقاس أو نوع الحزام، ثم قارن بين الصور والألوان قبل الإضافة.",
    shopSearchPlaceholder: "ابحث عن Tote أو Duffel أو Wallet",
    shopGridVariant: "elessi-bag-shop-grid",
    shopGridTitle: "كل الحقائب والإكسسوارات",
    shopGridSubtitle: "سعر مباشر، صور واضحة، ومسار أسرع لاختيار اللون أو المقاس أو الإضافة المكملة.",
    galleryVariant: "elessi-bag-gallery",
    infoVariant: "elessi-bag-buybox",
    relatedVariant: "elessi-complete-set",
    reviewsVariant: "elessi-story-grid",
    pdpSettings: {
      detailColumnsDirection: "ltr",
    },
    footerDescription: "حقائب يومية، سفر، هدايا، ومحافظ جلدية مع تجربة تصفح أخف وأقرب للحسم من أول شاشة.",
  },
  {
    id: "elessi-pedal-lab",
    name: "مختبر الدراجات",
    brandName: "Pedal Lab",
    previewImageUrl: "/assets/themes/elessi-pedal-lab/preview.svg",
    palette: {
      primary: "205 36% 17%",
      secondary: "38 54% 92%",
      accent: "24 88% 56%",
      background: "38 28% 96%",
      foreground: "205 18% 17%",
      muted: "39 18% 88%",
      mutedForeground: "205 10% 37%",
      border: "39 16% 81%",
      card: "0 0% 100%",
      cardForeground: "205 18% 17%",
    },
    typography: {
      headingFont: "\"Sora\", Cairo, sans-serif",
      bodyFont: "\"IBM Plex Sans Arabic\", Cairo, sans-serif",
    },
    shape: {
      borderRadius: "0.75rem",
      buttonRadius: "0.5rem",
    },
    productCard: {
      borderRadius: "0.85rem",
      boxShadow: "0 22px 62px -52px rgba(24,36,47,0.24)",
      hoverShadow: "0 28px 74px -48px rgba(24,36,47,0.28)",
      badgeRadius: "0.45rem",
      buttonRadius: "0.45rem",
    },
    headerVariant: "default",
    footerVariant: "default",
    heroVariant: "elessi-bike-hero",
    hero: {
      eyebrow: "Ride further",
      title: "دراجات، ترقية، وصيانة تبدأ من أول نظرة",
      subtitle: "موديلات المدينة والطرق والملحقات الأساسية في واجهة خفيفة تساعد العميل يختار أسرع من أول زيارة.",
      backgroundImage: "/assets/themes/elessi-pedal-lab/hero-city-stage.jpg",
      panelImage: "/assets/themes/elessi-pedal-lab/peloton-stage.jpg",
      panelTitle: "ابدأ من المدينة أو الطريق أو قطع الصيانة السريعة",
      panelSubtitle: "صور أوضح، اختيارات مقاس أسهل، وملحقات جاهزة للشحن قرب قرار الشراء.",
      panelEyebrow: "Ready to ride",
      panelMetricValue: "24h",
      panelMetricLabel: "شحن سريع",
    },
    heroHighlights: [
      { label: "City", value: "تنقل يومي" },
      { label: "Road", value: "سرعة وخفة" },
      { label: "Gear", value: "خوذات وأضواء" },
    ],
    collectionsVariant: "elessi-bike-panels",
    collectionsTitle: "ابدأ من نوع الرحلة",
    collectionsSubtitle: "مدخل واضح للدراجات والملحقات والصيانة بدل شبكة مزدحمة من أول شاشة.",
    collections: [
      { title: "دراجات مدينة", subtitle: "موديلات مريحة للتنقل اليومي والشوارع السريعة.", image: "/assets/themes/elessi-pedal-lab/hero-city-stage.jpg", slug: "city-bikes" },
      { title: "Road & fitness", subtitle: "هياكل أخف للسرعة، اللياقة، والطريق الطويل.", image: "/assets/themes/elessi-pedal-lab/peloton-stage.jpg", slug: "road-fitness" },
      { title: "خوذات وإضاءة", subtitle: "الأمان، الرؤية، وكل ما يكمل الرحلة من أول طلب.", image: "/assets/themes/elessi-pedal-lab/black-bike-portrait.jpg", slug: "helmets-lighting" },
      { title: "قطع وصيانة", subtitle: "مضخات، إطارات، وأجزاء تحتاجها بسرعة قبل النزول.", image: "/assets/themes/elessi-pedal-lab/trail-forest-stage.jpg", slug: "service-upgrades" },
    ],
    homeGridVariant: "elessi-bike-grid",
    homeGridTitle: "الأكثر طلبًا هذا الأسبوع",
    homeGridSubtitle: "دراجات، خوذات، وصيانة في عرض أخف وصور أكبر تساعد على القرار من أول Scroll.",
    shopBarVariant: "elessi-bike-toolbar",
    shopTitle: "الدراجات والملحقات",
    shopSubtitle: "ابحث بالمقاس أو الفئة أو القطعة، ثم بدّل الترتيب والفئة بدون مغادرة الشبكة.",
    shopSearchPlaceholder: "ابحث عن City Bike أو Helmet أو Pump",
    shopGridVariant: "elessi-bike-shop-grid",
    shopGridTitle: "كل الدراجات والملحقات",
    shopGridSubtitle: "شبكة بيضاء أخف تضع الصورة، السعر، وقرار الإضافة في الواجهة مباشرة.",
    galleryVariant: "elessi-bike-gallery",
    infoVariant: "elessi-bike-buybox",
    relatedVariant: "elessi-bike-related",
    reviewsVariant: "elessi-proof-wall",
    footerDescription: "متجر دراجات وملحقات وصيانة في تجربة خفيفة تساعد العميل يختار الموديل والقطع بسرعة من أول زيارة.",
  },
  {
    id: "elessi-harvest-fold",
    name: "حصاد مرتب",
    brandName: "Harvest Fold",
    previewImageUrl: "/assets/themes/elessi-harvest-fold/preview.svg",
    headerVariant: "default",
    footerVariant: "default",
    palette: {
      primary: "112 28% 19%",
      secondary: "49 56% 92%",
      accent: "24 83% 56%",
      background: "45 34% 97%",
      foreground: "112 18% 18%",
      muted: "45 22% 90%",
      mutedForeground: "112 8% 36%",
      border: "43 20% 80%",
      card: "44 46% 98%",
      cardForeground: "112 18% 18%",
    },
    typography: {
      headingFont: "\"Fraunces\", Cairo, serif",
      bodyFont: "\"IBM Plex Sans Arabic\", Cairo, sans-serif",
    },
    shape: {
      borderRadius: "0.8rem",
      buttonRadius: "0.55rem",
    },
    productCard: {
      borderRadius: "0.95rem",
      boxShadow: "0 22px 58px -48px rgba(48,61,32,0.24)",
      hoverShadow: "0 28px 68px -42px rgba(48,61,32,0.28)",
      badgeRadius: "0.5rem",
      buttonRadius: "0.55rem",
    },
    heroVariant: "elessi-organic-harvest",
    hero: {
      eyebrow: "من المزرعة للبيت",
      title: "خضارك الأسبوعي وصناديق البيت من أول نظرة",
      subtitle: "ورقيات، فاكهة، ومونة فطور مرتبة لتبدأ بالصندوق المناسب ثم تكمل السلة بدون بحث طويل.",
      backgroundImage: "/assets/themes/elessi-harvest-fold/hero-market.jpg",
      panelImage: "/assets/themes/elessi-harvest-fold/crate-detail.jpg",
      panelTitle: "صندوق اليوم أو صندوق العائلة",
      panelSubtitle: "اختر الاحتياج أولًا، ثم أضف الفاكهة أو المونة من نفس المسار.",
      panelEyebrow: "حصاد جاهز",
      panelMetricLabel: "أسرع توصيل",
      panelMetricValue: "اليوم التالي",
    },
    heroHighlights: [
      { label: "الفئات", value: "ورقيات • صناديق • بانتري" },
      { label: "التوصيل", value: "توصيل اليوم التالي" },
      { label: "السلال", value: "عبوات عائلية" },
    ],
    collectionsVariant: "elessi-organic-routes",
    collectionsTitle: "ابدأ من نوع الطلب",
    collectionsSubtitle: "قسّمنا السوق إلى خضار يومي، فاكهة، مونة، وصناديق عائلية حتى تقفز مباشرة للمدخل الصحيح.",
    collections: [
      { title: "ورقيات ومطبخ", subtitle: "خضار يومي وأعشاب الطبخ في رف واحد سريع.", image: "/assets/themes/elessi-harvest-fold/hero-market.jpg", slug: "leafy-greens" },
      { title: "فاكهة الموسم", subtitle: "صناديق حمضيات وفاكهة مرتبة للبيت والضيافة.", image: "/assets/themes/elessi-harvest-fold/fruit-crate.jpg", slug: "fruit-boxes" },
      { title: "مونة وفطور", subtitle: "جرانولا، دبس، وإضافات تكمّل طلب الصباح.", image: "/assets/themes/elessi-harvest-fold/breakfast-jar.jpg", slug: "pantry-basics" },
      { title: "صناديق أسبوعية", subtitle: "حل أسرع للطلبات العائلية المتكررة وقيمة سلة أعلى.", image: "/assets/themes/elessi-harvest-fold/crate-detail.jpg", slug: "family-crates" },
    ],
    homeGridVariant: "elessi-organic-market-grid",
    homeGridTitle: "مختارات اليوم",
    homeGridSubtitle: "الأكثر طلبًا من الخضار، الصناديق، والمونة في رف واحد سريع القرار.",
    shopBarVariant: "elessi-organic-toolbar",
    shopTitle: "سوق البيت اليومي",
    shopSubtitle: "ابدأ من نوع الطلب أو الموسم أو الصندوق المناسب، ثم صفِّ النتائج بسرعة داخل رف أقرب لسلوك السوق.",
    shopSearchPlaceholder: "ابحث عن Tomato أو Box أو Herbs",
    shopGridVariant: "elessi-organic-shop-grid",
    shopGridTitle: "رفوف اليوم",
    shopGridSubtitle: "بطاقات أخف توضّح الحجم والسعر والتجميعة قبل الدخول لصفحة المنتج.",
    galleryVariant: "elessi-organic-gallery",
    infoVariant: "elessi-organic-buybox",
    relatedVariant: "elessi-organic-related",
    reviewsVariant: "elessi-story-grid",
    footerDescription: "خضار يومي، صناديق أسبوعية، ومونة بيتية مرتبة لطلبات البيت المتكررة والسلال العائلية.",
  },
  {
    id: "elessi-signal-deck",
    name: "لوحة الإشارات",
    brandName: "Signal Deck",
    previewImageUrl: "/assets/themes/elessi-signal-deck/preview.svg",
    palette: {
      primary: "215 25% 16%",
      secondary: "41 44% 90%",
      accent: "34 84% 55%",
      background: "42 28% 96%",
      foreground: "215 18% 17%",
      muted: "42 16% 88%",
      mutedForeground: "215 10% 40%",
      border: "40 18% 81%",
      card: "0 0% 100%",
      cardForeground: "215 18% 17%",
    },
    typography: {
      headingFont: "\"Space Grotesk\", Cairo, sans-serif",
      bodyFont: "\"IBM Plex Sans Arabic\", Cairo, sans-serif",
    },
    headerVariant: "digital-command",
    footerVariant: "digital-command",
    headerNavigation: [
      { label: "الرئيسية", to: "/" },
      { label: "لابتوبات", to: "/shop?category=ultrabooks" },
      { label: "معدات المكتب", to: "/shop?category=desk-gear" },
      { label: "تنقل وطاقة", to: "/shop?category=carry-power" },
      { label: "العروض", to: "/sale" },
    ],
    footerNavigation: [
      {
        title: "الأقسام",
        links: [
          { label: "أجهزة خفيفة", to: "/shop?category=ultrabooks" },
          { label: "صناعة ومحتوى", to: "/shop?category=creator-labs" },
          { label: "معدات المكتب", to: "/shop?category=desk-gear" },
        ],
      },
      {
        title: "الشراء",
        links: [
          { label: "كل الأجهزة", to: "/shop" },
          { label: "عروض اليوم", to: "/sale" },
          { label: "السلة", to: "/cart" },
        ],
      },
      {
        title: "الثقة",
        links: [
          { label: "إتمام الشراء", to: "/checkout" },
          { label: "الصفحة الرئيسية", to: "/" },
          { label: "ترقيات سريعة", to: "/shop?category=carry-power" },
        ],
      },
    ],

    heroVariant: "elessi-digital-launch",
    hero: {
      eyebrow: "إلكترونيات ومكتب",
      title: "التقنية اليومية بشكل أوضح وأقرب لقرار الشراء",
      subtitle: "لابتوبات، تجهيزات مكتب، وملحقات سريعة داخل واجهة مرتبة تساعد العميل على المقارنة والشراء من أول زيارة.",
      backgroundImage: "/assets/themes/pc-hub-eg/hero-photo.jpg",
      panelImage: "/assets/themes/pc-hub-eg/creator-pro-16.jpg",
      panelTitle: "ابدأ من الجهاز أو الترقية الصغيرة",
      panelSubtitle: "مقارنات أسرع، صور أوضح، ومسارات شراء أخف للأجهزة والملحقات.",
      panelEyebrow: "ترشيحات اليوم",
      panelMetricLabel: "جاهزية الطلب",
      panelMetricValue: "24-48 ساعة",
    },
    heroHighlights: [
      { label: "الفئات", value: "4 أقسام" },
      { label: "الشحن", value: "24-48 ساعة" },
      { label: "الاستبدال", value: "14 يوم" },
      { label: "الضمان", value: "موثق" },
    ],
    collectionsVariant: "elessi-digital-departments",
    collectionsTitle: "ابدأ من الاستخدام ثم ادخل للمنتج المناسب",
    collectionsSubtitle: "أجهزة رئيسية، تجهيزات محتوى، مكتب ذكي، وترقيات سريعة تساعدك تبني الطلب بشكل أوضح.",
    collections: [
      { title: "أجهزة خفيفة", subtitle: "لابتوبات للشغل والدراسة والتنقل اليومي.", image: "/assets/themes/pc-hub-eg/workbook-14-air.jpg", slug: "ultrabooks" },
      { title: "صناعة ومحتوى", subtitle: "تابلتات وأدوات تسهّل الرسم والمونتاج.", image: "/assets/themes/pc-hub-eg/creator-pro-16.jpg", slug: "creator-labs" },
      { title: "معدات مكتب", subtitle: "كيبوردات، ماوسات، وحوامل مكتبية أوضح.", image: "/assets/themes/pc-hub-eg/mechboard-pro.jpg", slug: "desk-gear" },
      { title: "تنقل وطاقة", subtitle: "محاور، شواحن، وإضافات سريعة للسفر والشغل.", image: "/assets/themes/pc-hub-eg/dockstation-9in1.jpg", slug: "carry-power" },
    ],
    homeGridVariant: "elessi-digital-launch-grid",
    homeGridTitle: "أجهزة وملحقات جاهزة للقرار",
    homeGridSubtitle: "بطاقات تقنية تعرض أهم المواصفات والسعر من أول نظرة حتى يصير الحسم أسرع داخل الصفحة نفسها.",
    shopBarVariant: "elessi-digital-toolbar",
    shopTitle: "متجر Signal Deck",
    shopSubtitle: "ابدأ من الفئة أو ابحث بالمواصفة، ثم صف النتائج بسرعة حتى تصل للجهاز أو الملحق المناسب بدون تشتت.",
    shopSearchPlaceholder: "ابحث عن Laptop أو Keyboard أو Hub",
    shopGridVariant: "elessi-digital-catalog-grid",
    shopGridTitle: "كل الأجهزة والملحقات",
    shopGridSubtitle: "كتالوج رقمي واضح يعرض السعر والمواصفات الأساسية مع دخول أسرع نحو صفحة المنتج.",
    galleryVariant: "elessi-digital-gallery",
    infoVariant: "elessi-digital-buybox",
    productInfoSettings: {
      shippingTitle: "الشحن والدعم",
      shippingText:
        "الشحن السريع، الاستبدال، وخيارات الضمان تظهر بوضوح قبل إنهاء الطلب حتى يبقى القرار التقني مطمئنًا من أول صفحة.",
      guaranteesTitle: "إشارات الثقة",
      guaranteesSubtitle: "تجهيزات موثقة، دعم واضح، ومواصفات أقرب لقرار الشراء.",
      guaranteeItems: JSON.stringify([
        {
          title: "ضمان موثق",
          description: "كل منتج يظهر مدة الضمان والدعم الفني بوضوح داخل الصفحة.",
        },
        {
          title: "شحن سريع",
          description: "خيارات التوصيل للأجهزة والملحقات تظهر قبل الإغلاق النهائي للسلة.",
        },
        {
          title: "اختيار أسهل",
          description: "المواصفات الأساسية وخيارات النسخ تبقى قريبة من زر الإضافة طوال الوقت.",
        },
      ]),
    },
    relatedVariant: "elessi-digital-related",
    reviewsVariant: "elessi-proof-wall",
    footerDescription: "متجر تقني يرتب الأجهزة والملحقات داخل مسارات أوضح، ويقرّب المواصفات والدعم من قرار الشراء.",
  },
  {
    id: "elessi-glow-routine",
    name: "روتين متوهج",
    brandName: "Glow Routine",
    previewImageUrl: "/assets/themes/elessi-glow-routine/preview.svg",
    headerVariant: "default",
    footerVariant: "default",
    headerNavigation: [
      { label: "الرئيسية", to: "/" },
      { label: "العيون", to: "/shop?category=eye-makeup" },
      { label: "الشفاه", to: "/shop?category=lip-color" },
      { label: "الهدايا", to: "/shop?category=gift-sets" },
      { label: "الأكثر طلبًا", to: "/sale" },
    ],
    palette: {
      primary: "332 34% 19%",
      secondary: "340 48% 95%",
      accent: "332 72% 59%",
      background: "336 30% 98%",
      foreground: "332 18% 16%",
      muted: "338 20% 91%",
      mutedForeground: "332 10% 39%",
      border: "338 24% 85%",
      card: "0 0% 100%",
      cardForeground: "332 18% 16%",
    },
    typography: {
      headingFont: "\"Prata\", Cairo, serif",
      bodyFont: "\"IBM Plex Sans Arabic\", Cairo, sans-serif",
    },
    shape: {
      borderRadius: "1.55rem",
      buttonRadius: "999px",
    },
    productCard: {
      borderRadius: "1.65rem",
      boxShadow: "0 24px 72px -54px rgba(91,40,64,0.18)",
      hoverShadow: "0 30px 82px -46px rgba(91,40,64,0.24)",
      badgeRadius: "999px",
      buttonRadius: "999px",
    },
    heroVariant: "elessi-beauty-ritual",
    hero: {
      eyebrow: "جمال وعناية",
      title: "ألوان يومية وهدايا جاهزة من أول نظرة",
      subtitle: "ابدئي بالماسكارا أو لون الشفاه أو المجموعة الجاهزة، وشوفي الدرجة والسعر والكمية قبل الإضافة من غير لف طويل.",
      backgroundImage: "/assets/themes/elessi-glow-routine/flatlay-b.jpg",
      panelImage: "/assets/themes/elessi-glow-routine/lipstick-noble-cutout.png",
      panelTitle: "درجة اليوم أو الهدية على رف واحد",
      panelSubtitle: "ألوان يومية، مجموعات صغيرة، وأدوات تكمل الطلب من غير تشتيت.",
      panelEyebrow: "Glow picks",
      panelMetricLabel: "مختارات",
      panelMetricValue: "6 درجات",
    },
    heroHighlights: [
      { label: "الفئات", value: "عيون / شفاه / هدايا" },
      { label: "الدرجات", value: "يومي / جريء" },
      { label: "الإضافة", value: "فرش ومجموعات" },
    ],
    collectionsVariant: "elessi-pill-shelf",
    collectionsTitle: "ابدئي من الفئة",
    collectionsSubtitle: "عيون، شفاه، هدايا، وأدوات مرتبة مثل رف beauty حقيقي يساعد على الشراء السريع.",
    collections: [
      { title: "عيون يومية", subtitle: "ماسكارا وخيارات سريعة لأول خطوة.", image: "/assets/themes/elessi-glow-routine/mascara.jpg", slug: "daily-eyes" },
      { title: "ألوان الشفاه", subtitle: "درجات يومية وأجرأ داخل نفس الرف.", image: "/assets/themes/elessi-glow-routine/lipstick-youth.jpg", slug: "lip-color" },
      { title: "هدايا وتجارب", subtitle: "مجموعات جاهزة للإهداء والبداية.", image: "/assets/themes/elessi-glow-routine/lipstick-noble.jpg", slug: "gift-sets" },
      { title: "فرش وأدوات", subtitle: "أدوات تكمل السلة بدون تشتيت.", image: "/assets/themes/elessi-glow-routine/brush-chalk.jpg", slug: "beauty-tools" },
    ],
    homeGridVariant: "elessi-compact-shelf",
    homeGridTitle: "الأكثر طلبًا من رف الجمال",
    homeGridSubtitle: "ألوان يومية، مجموعات هدية، وأدوات أساسية داخل رف beauty أسرع للحسم.",
    shopBarVariant: "elessi-filter-deck",
    shopTitle: "كل منتجات Glow Routine",
    shopSubtitle: "ابحثي عن ماسكارا أو لون شفاه أو مجموعة هدية، ثم بدّلي القسم والفرز من نفس الشاشة.",
    shopSearchPlaceholder: "ابحثي عن Mascara أو Lipstick أو Gift",
    shopGridVariant: "elessi-listing-grid",
    shopGridTitle: "كل رف الجمال في مكان واحد",
    shopGridSubtitle: "شبكة أسرع للعيون والشفاه والمجموعات، مع درجات أوضح وصور أقرب للمنتج.",
    galleryVariant: "elessi-showroom",
    infoVariant: "elessi-care-buybox",
    relatedVariant: "elessi-complete-set",
    reviewsVariant: "elessi-story-grid",
    footerDescription: "رف beauty غني بالألوان والهدية والأدوات، مع صور أقرب للمنتج ومسار شراء أسرع.",
  },
  {
    id: "elessi-gem-atelier",
    name: "أتيليه المجوهرات",
    brandName: "Gem Atelier",
    previewImageUrl: "/assets/themes/elessi-gem-atelier/preview.svg",
    headerVariant: "default",
    footerVariant: "default",
    headerNavigation: [
      { label: "الرئيسية", to: "/" },
      { label: "الخواتم", to: "/shop?category=daily-rings" },
      { label: "الهدايا", to: "/shop?category=gift-jewelry" },
      { label: "الأطقم", to: "/shop?category=chains-sets" },
      { label: "الأكثر طلبًا", to: "/sale" },
    ],
    palette: {
      primary: "348 18% 18%",
      secondary: "34 42% 91%",
      accent: "39 72% 58%",
      background: "36 34% 97%",
      foreground: "348 16% 16%",
      muted: "34 16% 89%",
      mutedForeground: "348 8% 39%",
      border: "34 22% 82%",
      card: "0 0% 100%",
      cardForeground: "348 16% 16%",
    },
    typography: {
      headingFont: "\"Cormorant Garamond\", Cairo, serif",
      bodyFont: "\"Manrope\", Cairo, sans-serif",
    },
    heroVariant: "elessi-jewel-salon",
    hero: {
      eyebrow: "مجوهرات وهدايا",
      title: "فخامة أقرب للشراء لا للعرض فقط",
      subtitle: "ابدئي من خاتم التوقيع أو هدية جاهزة أو طقم يومي، وشوفي القطعة والمقاس والسعر بإيقاع أهدأ وأوضح.",
      backgroundImage: "/assets/themes/elessi-gem-atelier/jewelry-box-assortment.jpg",
      panelImage: "/assets/themes/elessi-gem-atelier/diamond-ring-open-box.jpg",
      panelTitle: "ابدئي من خاتم أو هدية أو قطعة توقيع",
      panelSubtitle: "أقسام أكثر أناقة لكنها لا تبعدك عن القرار.",
      panelEyebrow: "مختارات التوقيع",
      panelMetricLabel: "الإهداء",
      panelMetricValue: "48 ساعة",
    },
    heroHighlights: [
      { label: "الأقسام", value: "4" },
      { label: "السعر", value: "أوضح" },
      { label: "الإهداء", value: "سريع" },
    ],
    collectionsVariant: "elessi-merch-panels",
    collectionsTitle: "اختيارات التوقيع",
    collectionsSubtitle: "هدايا، خواتم، سلاسل، وقطع مناسبة للمناسبات اليومية والخاصة.",
    collections: [
      { title: "خواتم يومية", subtitle: "قطع خفيفة للبس المتكرر والشراء السريع.", image: "/assets/themes/elessi-gem-atelier/ring-box-minimal.jpg", slug: "daily-rings" },
      { title: "هدايا راقية", subtitle: "مجموعات جاهزة للإهداء والمناسبات.", image: "/assets/themes/elessi-gem-atelier/heart-necklace-box.jpg", slug: "gift-jewelry" },
      { title: "سلاسل وأطقم", subtitle: "تنسيقات ترفع السلة بصورة طبيعية.", image: "/assets/themes/elessi-gem-atelier/pearl-necklace-box.jpg", slug: "chains-sets" },
      { title: "قطع توقيع", subtitle: "منتجات بروز أعلى وصفحات عرض أغنى.", image: "/assets/themes/elessi-gem-atelier/signet-ring.jpg", slug: "signature-pieces" },
    ],
    homeGridVariant: "elessi-editorial-stack",
    homeGridTitle: "منتجات التوقيع",
    homeGridSubtitle: "عرض تحريري أقرب لواجهة بوتيك غني لكنه ما زال بيع-أول.",
    shopBarVariant: "elessi-gift-toolbar",
    shopTitle: "متجر Gem Atelier",
    shopSubtitle: "ابحثي عن الهدية أو القطعة أو المناسبة، ثم ادخلي إلى الشبكة بنفس الإيقاع.",
    shopSearchPlaceholder: "ابحثي عن Ring أو Gift أو Chain",
    shopGridVariant: "elessi-listing-grid",
    shopGridTitle: "كل المجوهرات",
    shopGridSubtitle: "شبكة أوضح للقطع اللامعة، الهدايا، والأطقم مع اسم وسعر ومعدن ظاهرين من أول نظرة.",
    galleryVariant: "elessi-mosaic-stage",
    infoVariant: "elessi-gift-buybox",
    relatedVariant: "elessi-discovery-strip",
    reviewsVariant: "elessi-trust-pile",
    footerDescription: "واجهة مجوهرات تجمع القطع اللامعة، الهدايا، وخيارات المعدن داخل مسار أنظف وأسهل للحسم.",
  },
  {
    id: "elessi-tail-supply",
    name: "ركن الحيوانات",
    brandName: "Tail Supply",
    previewImageUrl: "/assets/themes/elessi-tail-supply/preview.svg",
    headerVariant: "default",
    footerVariant: "default",
    headerNavigation: [
      { label: "الرئيسية", to: "/" },
      { label: "الطعام", to: "/shop?category=pet-food" },
      { label: "اللعب", to: "/shop?category=pet-play" },
      { label: "العناية", to: "/shop?category=pet-care" },
      { label: "الأكثر طلبًا", to: "/sale" },
    ],
    palette: {
      primary: "152 28% 22%",
      secondary: "42 42% 91%",
      accent: "24 86% 58%",
      background: "42 34% 97%",
      foreground: "152 18% 18%",
      muted: "42 18% 88%",
      mutedForeground: "152 8% 38%",
      border: "40 20% 81%",
      card: "0 0% 100%",
      cardForeground: "152 18% 18%",
    },
    typography: {
      headingFont: "\"Baloo Bhaijaan 2\", Cairo, cursive",
      bodyFont: "\"Manrope\", Cairo, sans-serif",
    },
    shape: {
      borderRadius: "1.35rem",
      buttonRadius: "0.85rem",
    },
    productCard: {
      borderRadius: "1.4rem",
      boxShadow: "0 24px 64px -52px rgba(34,61,48,0.18)",
      hoverShadow: "0 30px 78px -48px rgba(34,61,48,0.24)",
      badgeRadius: "0.9rem",
      buttonRadius: "0.8rem",
    },
    heroVariant: "elessi-pet-sunroom",
    hero: {
      eyebrow: "مستلزمات حيوانات",
      title: "متجر غني بالاكتشاف لكن أسهل للمربي",
      subtitle: "ابدأ من الطعام اليومي أو اللعب أو العناية، ثم ادخل إلى شبكة أوضح للطلبات المتكررة والاحتياجات السريعة.",
      backgroundImage: "/assets/themes/elessi-tail-supply/play-dog.jpg",
      panelImage: "/assets/themes/elessi-tail-supply/dog-food-bowl.jpg",
      panelTitle: "ابدأ من الأكل أو العناية أو اللعب",
      panelSubtitle: "تقسيمات أقرب لقرار الشراء المتكرر والاحتياجات اليومية.",
      panelEyebrow: "طلبات تتكرر",
      panelMetricLabel: "الشحن",
      panelMetricValue: "48 ساعة",
    },
    heroHighlights: [
      { label: "الفئات", value: "4" },
      { label: "الإعادة", value: "أسهل" },
      { label: "الأكثر طلبًا", value: "يومي" },
    ],
    collectionsVariant: "elessi-utility-cards",
    collectionsTitle: "فئات المتجر الأساسية",
    collectionsSubtitle: "طعام، لعب، عناية، ونزهات مرتبة بنفس روح المتجر الغني متعدد الأقسام.",
    collections: [
      { title: "طعام يومي", subtitle: "طلبات متكررة وأسهل في إعادة الشراء.", image: "/assets/themes/elessi-tail-supply/dog-food-bowl.jpg", slug: "pet-food" },
      { title: "لعب ونشاط", subtitle: "منتجات حركة ترفع السلة بسرعة.", image: "/assets/themes/elessi-tail-supply/play-dog.jpg", slug: "pet-play" },
      { title: "عناية وتنظيف", subtitle: "شامبو وأدوات ومنتجات ثقة.", image: "/assets/themes/elessi-tail-supply/care-pet.jpg", slug: "pet-care" },
      { title: "نزهة وخروج", subtitle: "أطواق وأحزمة وإضافات خارجية.", image: "/assets/themes/elessi-tail-supply/walk-leash-real.jpg", slug: "walk-travel" },
    ],
    homeGridVariant: "elessi-listing-grid",
    homeGridTitle: "أكثر المنتجات حركة",
    homeGridSubtitle: "رف كثيف يبرز الأساسيات المتكررة مع اكتشاف أسرع للملحقات.",
    shopBarVariant: "elessi-filter-deck",
    shopTitle: "متجر Tail Supply",
    shopSubtitle: "ابحث حسب النوع أو الاستخدام أو الوجبة ثم ادخل مباشرة إلى الشبكة.",
    shopSearchPlaceholder: "ابحث عن Food أو Toy أو Collar",
    shopGridVariant: "elessi-compact-shelf",
    shopGridTitle: "كل مستلزمات الحيوانات",
    shopGridSubtitle: "شبكة سريعة للطلبات المتكررة ومنتجات العناية واللعب.",
    galleryVariant: "elessi-showroom",
    infoVariant: "elessi-pet-buybox",
    relatedVariant: "elessi-complete-set",
    reviewsVariant: "elessi-proof-wall",
    footerDescription: "متجر حيوانات أليفة يجمع الطعام، اللعب، والعناية داخل مسار شراء أنظف وأسهل للمربي.",
  },
  {
    id: "elessi-chrono-gallery",
    name: "معرض الساعات",
    brandName: "Chrono Gallery",
    previewImageUrl: "/assets/themes/elessi-chrono-gallery/preview.svg",
    headerVariant: "default",
    footerVariant: "default",
    headerNavigation: [
      { label: "الرئيسية", to: "/" },
      { label: "الساعات", to: "/shop?category=classic-everyday" },
      { label: "الهدايا", to: "/shop?category=gift-watches" },
      { label: "الأحزمة", to: "/shop?category=straps-service" },
      { label: "الأكثر طلبًا", to: "/sale" },
    ],
    palette: {
      primary: "213 19% 17%",
      secondary: "36 36% 90%",
      accent: "30 70% 56%",
      background: "36 28% 97%",
      foreground: "213 16% 15%",
      muted: "36 14% 88%",
      mutedForeground: "213 8% 39%",
      border: "34 18% 81%",
      card: "0 0% 100%",
      cardForeground: "213 16% 15%",
    },
    typography: {
      headingFont: "\"EB Garamond\", Cairo, serif",
      bodyFont: "\"Space Grotesk\", Cairo, sans-serif",
    },
    shape: {
      borderRadius: "0.8rem",
      buttonRadius: "0.45rem",
    },
    productCard: {
      borderRadius: "0.82rem",
      boxShadow: "0 20px 58px -46px rgba(26,34,45,0.18)",
      hoverShadow: "0 26px 68px -42px rgba(26,34,45,0.24)",
      badgeRadius: "0.45rem",
      buttonRadius: "0.45rem",
    },
    heroVariant: "elessi-dual-merch",
    hero: {
      eyebrow: "ساعات وإكسسوارات",
      title: "واجهة ساعات غنية لكن أكثر وضوحًا للحسم",
      subtitle: "ابدأ من الساعة الكلاسيكية أو النسخة الرياضية أو الهدية الجاهزة، ثم راجع الاسم والحجم والصورة بإيقاع أنظف وأوضح.",
      backgroundImage: "/assets/themes/elessi-chrono-gallery/hero-watch-closeup.jpg",
      panelImage: "/assets/themes/elessi-chrono-gallery/watch-product-front.png",
      panelTitle: "ابدأ من الكلاسيك أو الرياضي أو الهدية",
      panelSubtitle: "اختيارات تدعم الشراء والتمييز بين الاستعمالات بسرعة.",
    },
    collectionsVariant: "elessi-merch-panels",
    collectionsTitle: "حسب الشخصية",
    collectionsSubtitle: "ساعات كلاسيك، رياضية، هدايا، وإكسسوارات مرتبطة بنفس روح المتجر الغني.",
    collections: [
      { title: "كلاسيك يومي", subtitle: "قطع هادئة وسهلة الحسم.", image: "/assets/themes/elessi-chrono-gallery/hero-watch-closeup.jpg", slug: "classic-everyday" },
      { title: "رياضي وأداء", subtitle: "موديلات أوضح للتمرين والحركة.", image: "/assets/themes/elessi-chrono-gallery/watch-dial-blue.jpg", slug: "sport-performance" },
      { title: "هدايا رجالية", subtitle: "اختيارات مناسبة للإهداء السريع.", image: "/assets/themes/elessi-chrono-gallery/gift-suit-watch.jpg", slug: "gift-watches" },
      { title: "أحزمة وصيانة", subtitle: "إضافات تكمل السلة بصورة طبيعية.", image: "/assets/themes/elessi-chrono-gallery/watch-strap-brown.jpg", slug: "straps-service" },
    ],
    homeGridVariant: "elessi-listing-grid",
    homeGridTitle: "الأقرب للطلب الآن",
    homeGridSubtitle: "قوائم وكتل أوضح للمنتجات التي تحتاج اسمًا وصورة وحجمًا ظاهرين بسرعة.",
    shopBarVariant: "elessi-category-ribbon",
    shopTitle: "متجر Chrono Gallery",
    shopSubtitle: "ابحث عن الموديل أو المناسبة أو نوع الساعة ثم راجع الشبكة بنفس الإيقاع.",
    shopSearchPlaceholder: "ابحث عن Chronograph أو Gift أو Strap",
    shopGridVariant: "elessi-listing-grid",
    shopGridTitle: "كل الساعات والإضافات",
    shopGridSubtitle: "شبكة أقرب للقوائم والشراء المقارن دون فقدان روح العرض الغني.",
    galleryVariant: "elessi-mosaic-stage",
    infoVariant: "elessi-watch-buybox",
    relatedVariant: "elessi-discovery-strip",
    reviewsVariant: "elessi-proof-wall",
    footerDescription: "متجر ساعات يجمع الكلاسيك، الهدايا، والأحزمة داخل مسار شراء أوضح وأسهل للحسم.",
  },
  {
    id: "elessi-garage-fit",
    name: "جراج فيت",
    brandName: "Garage Fit",
    previewImageUrl: "/assets/themes/elessi-garage-fit/preview.svg",
    headerVariant: "default",
    footerVariant: "default",
    headerNavigation: [
      { label: "الرئيسية", to: "/" },
      { label: "الزيوت", to: "/shop?category=oils-fluids" },
      { label: "الصيانة", to: "/shop?category=filters-service" },
      { label: "الإضاءة", to: "/shop?category=lighting-electric" },
      { label: "الأكثر طلبًا", to: "/sale" },
    ],
    palette: {
      primary: "6 30% 18%",
      secondary: "38 34% 89%",
      accent: "18 88% 54%",
      background: "36 24% 96%",
      foreground: "12 18% 16%",
      muted: "34 14% 86%",
      mutedForeground: "12 8% 38%",
      border: "32 16% 79%",
      card: "0 0% 100%",
      cardForeground: "12 18% 16%",
    },
    typography: {
      headingFont: "\"Chakra Petch\", Cairo, sans-serif",
      bodyFont: "\"IBM Plex Sans Arabic\", Cairo, sans-serif",
    },
    heroVariant: "elessi-garage-command",
    hero: {
      eyebrow: "قطع غيار وسيارات",
      title: "اختصر طريق القطعة المناسبة لسيارتك",
      subtitle: "ابدأ من الزيت أو الفلتر أو الإضاءة ثم راجع المقاس والتوافق والسعر قبل الإضافة مباشرة.",
      backgroundImage: "/assets/themes/elessi-garage-fit/engine-bay.jpg",
      panelImage: "/assets/themes/elessi-garage-fit/oil-bottles.jpg",
      panelTitle: "ابدأ من الزيت أو الفلاتر أو الإضاءة",
      panelSubtitle: "خطوط قرار عملية تقرب القطعة المناسبة وتدفع السلة للخدمات المرافقة.",
    },
    collectionsVariant: "elessi-merch-panels",
    collectionsTitle: "ابحث حسب القطعة",
    collectionsSubtitle: "زيوت، فلاتر، بطاريات، وإكسسوارات سيارات مرتبة مثل متجر قطع غيار حقيقي.",
    collections: [
      { title: "زيوت وسوائل", subtitle: "منتجات متكررة تحتاج طريقًا قصيرًا.", image: "/assets/themes/elessi-garage-fit/oil-bottles.jpg", slug: "oils-fluids" },
      { title: "فلاتر وصيانة", subtitle: "عناصر صيانة أساسية وسريعة البيع.", image: "/assets/themes/elessi-garage-fit/air-filter-closeup.jpg", slug: "filters-service" },
      { title: "إضاءة وكهرباء", subtitle: "بطاريات وكشافات وقطع أقرب للمقارنة.", image: "/assets/themes/elessi-garage-fit/headlight-bulb.jpg", slug: "lighting-electric" },
      { title: "إكسسوارات داخلية", subtitle: "إضافات ترفع متوسط السلة بسهولة.", image: "/assets/themes/elessi-garage-fit/seat-interior.jpg", slug: "interior-accessories" },
    ],
    homeGridVariant: "elessi-listing-grid",
    homeGridTitle: "المنتجات الأوضح للحسم",
    homeGridSubtitle: "قوائم أقرب للمقارنة بين القطع ذات المواصفات المتشابهة.",
    shopBarVariant: "elessi-filter-deck",
    shopTitle: "متجر Garage Fit",
    shopSubtitle: "ابحث برقم القطعة أو نوع الاستخدام ثم راجع التوافق والسعر قبل ما تضيف للسلة.",
    shopSearchPlaceholder: "ابحث عن Oil أو Filter أو Battery",
    shopGridVariant: "elessi-listing-grid",
    shopGridTitle: "كل قطع الغيار والإضافات",
    shopGridSubtitle: "شبكة قرار أسرع للقطع المتشابهة والمقارنة المباشرة.",
    galleryVariant: "elessi-showroom",
    infoVariant: "elessi-garage-buybox",
    relatedVariant: "elessi-discovery-strip",
    reviewsVariant: "elessi-trust-pile",
    footerDescription: "متجر قطع غيار وإكسسوارات يسهّل المقارنة بين التوافق والسعر والخدمة قبل الشراء.",
  },
  {
    id: "elessi-sprout-room",
    name: "غرفة النباتات",
    brandName: "Sprout Room",
    previewImageUrl: "/assets/themes/elessi-sprout-room/preview.svg",
    headerVariant: "default",
    footerVariant: "default",
    palette: {
      primary: "150 28% 19%",
      secondary: "154 28% 92%",
      accent: "90 62% 41%",
      background: "48 24% 97%",
      foreground: "150 18% 18%",
      muted: "145 14% 89%",
      mutedForeground: "150 8% 39%",
      border: "146 16% 82%",
      card: "0 0% 100%",
      cardForeground: "150 18% 18%",
    },
    typography: {
      headingFont: "\"Cormorant Garamond\", Cairo, serif",
      bodyFont: "\"Manrope\", Cairo, sans-serif",
    },
    shape: {
      borderRadius: "1.25rem",
      buttonRadius: "0.85rem",
    },
    productCard: {
      borderRadius: "1.35rem",
      boxShadow: "0 28px 72px -58px rgba(33,59,45,0.22)",
      hoverShadow: "0 34px 84px -52px rgba(33,59,45,0.26)",
      badgeRadius: "0.8rem",
      buttonRadius: "0.85rem",
    },
    heroVariant: "elessi-plant-slider",
    hero: {
      eyebrow: "بيت أخضر وهدية أهدأ",
      title: "نباتات البيت والأصص الهادئة في واجهة أخف وأسهل",
      subtitle: "ابدأ من نبات الركنة أو نبات المكتب، ثم أكمِل بالأصيص أو الهدية من نفس المسار بدون بحث طويل.",
      backgroundImage: "/assets/themes/elessi-sprout-room/hero-aloe-stage.jpg",
      panelImage: "/assets/themes/elessi-sprout-room/desk-bonsai.jpg",
      panelTitle: "ابدأ بركنة البيت ثم أضف الأصيص أو الهدية",
      panelSubtitle: "مسار أخف للنباتات المنزلية والمكتبية مع صور أقرب للحقيقة وتدرج أهدأ في الشراء.",
      panelEyebrow: "Ready to green",
      panelMetricLabel: "عناية",
      panelMetricValue: "سهلة",
    },
    heroHighlights: [
      { label: "الفئات", value: "منزل • مكتب • هدايا" },
      { label: "التوصيل", value: "نباتات تصل جاهزة" },
      { label: "العناية", value: "خيارات سهلة" },
    ],
    collectionsVariant: "elessi-plant-categories",
    collectionsTitle: "ابدأ من الركنة أو الهدية",
    collectionsSubtitle: "قسمنا المتجر إلى نباتات منزلية ومكتبية، هدايا خضراء، وأصص تكمل الشكل بدون تزاحم.",
    collections: [
      { title: "نباتات منزلية", subtitle: "ركنات خضراء واضحة وصور تساعد على الحسم.", image: "/assets/themes/elessi-sprout-room/monstera-stage.jpg", slug: "home-plants" },
      { title: "نباتات مكتب", subtitle: "أحجام أصغر ومقاس أسهل للاختيار السريع.", image: "/assets/themes/elessi-sprout-room/desk-bonsai.jpg", slug: "desk-plants" },
      { title: "هدايا خضراء", subtitle: "تنسيقات جاهزة للإهداء أو البداية الهادئة.", image: "/assets/themes/elessi-sprout-room/gift-bonsai-card.jpg", slug: "green-gifts" },
      { title: "أصص وإضافات", subtitle: "أصص وعناية ترفع السلة بدون تشتيت.", image: "/assets/themes/elessi-sprout-room/succulent-macro.jpg", slug: "pots-addons" },
    ],
    homeGridVariant: "elessi-plant-favorites",
    homeGridTitle: "الأقرب لركنة البيت",
    homeGridSubtitle: "نباتات منزلية ومكتبية وأصص أوضح في الصورة والسعر قبل الدخول لصفحة المنتج.",
    shopBarVariant: "elessi-plant-toolbar",
    shopTitle: "متجر الركنة الخضراء",
    shopSubtitle: "ابدأ من نوع النبات أو حجم الركنة، ثم صفِّ النتائج بسرعة بين المنزل والمكتب والهدايا.",
    shopSearchPlaceholder: "ابحث عن مونستيرا أو أصيص أو هدية خضراء",
    shopGridVariant: "elessi-plant-nursery-grid",
    shopGridTitle: "كل النباتات والإضافات",
    shopGridSubtitle: "شبكة أخف توضّح المقاس، الأصيص، والعناية قبل ما تفتح صفحة المنتج.",
    galleryVariant: "elessi-plant-gallery",
    infoVariant: "elessi-plant-buybox",
    relatedVariant: "elessi-plant-related",
    reviewsVariant: "elessi-plant-reviews",
    pdpSettings: {
      detailColumnsDirection: "ltr",
    },
    footerDescription: "نباتات منزلية ومكتبية، أصص هادئة، وهدايا خضراء مرتبة لتجعل الاختيار أسرع والبيت أهدأ.",
  },
];

export const ELESSI_PACK_THEME_IDS = THEME_SEEDS.map((seed) => seed.id);

export const ELESSI_PACK_THEMES: StorefrontTheme[] = THEME_SEEDS.map(createTheme);

export const ELESSI_PACK_THEME_PRESETS: Record<string, StorefrontTheme> =
  Object.fromEntries(ELESSI_PACK_THEMES.map((theme) => [theme.id, theme]));
