import type { StorefrontTemplateBlueprint } from "../types";

export const shopOrbitBlueprint: StorefrontTemplateBlueprint = {
  id: "shop-orbit",
  name: "Shop Orbit",
  description:
    "Blueprint تجاري مستلهم من مشروع Stitch الخاص بصفحة متجر عربية desktop-first مع hero واضح، filtering rail، وتجربة product discovery أكثر قوة.",
  baseThemeId: "modern-minimal",
  source: {
    kind: "stitch",
    project: "Max P storefront",
    descriptor: "shop-stitch-orbit",
    promptPath: ".stitch/next-prompt.md",
    designPath: ".stitch/DESIGN.md",
  },
  tags: ["stitch", "shop", "rtl", "desktop-first", "commerce"],
  tokens: {
    colors: {
      primary: "226 100% 58%",
      primaryForeground: "0 0% 100%",
      secondary: "210 38% 96%",
      secondaryForeground: "219 48% 10%",
      accent: "171 78% 40%",
      accentForeground: "0 0% 100%",
      background: "210 33% 96%",
      foreground: "219 48% 10%",
      muted: "210 24% 92%",
      mutedForeground: "216 16% 42%",
      border: "211 28% 88%",
      card: "0 0% 100%",
      cardForeground: "219 48% 10%",
      ring: "226 100% 58%",
    },
    typography: {
      headingFont: "\"IBM Plex Sans Arabic\", \"Geist\", sans-serif",
      bodyFont: "\"IBM Plex Sans Arabic\", sans-serif",
      baseSize: "16px",
      direction: "rtl",
    },
    shape: {
      borderRadius: "1.5rem",
      buttonRadius: "999px",
    },
  },
  seo: {
    titleTemplate: "%s | Shop Orbit",
    description:
      "واجهة متجر عربية حديثة تركز على product discovery، سرعة التصفح، وإشارات الثقة والتحويل.",
  },
  header: {
    showSearch: true,
    navigation: [
      { label: "الرئيسية", to: "/" },
      { label: "المتجر", to: "/shop" },
      { label: "التصنيفات", to: "/collections" },
      { label: "العروض", to: "/sale" },
    ],
  },
  footer: {
    description:
      "قالب متجر عربي واضح ومباشر يوازن بين الاستكشاف السريع والقرار الشرائي السهل.",
    copyrightText: "© 2026 Shop Orbit",
    socialLinks: {
      instagram: "https://instagram.com",
      facebook: "https://facebook.com",
    },
    navigation: [
      {
        title: "التسوق",
        links: [
          { label: "كل المنتجات", to: "/shop" },
          { label: "التصنيفات", to: "/collections" },
          { label: "العروض", to: "/sale" },
        ],
      },
      {
        title: "الدعم",
        links: [
          { label: "الشحن والاستبدال", to: "/shipping" },
          { label: "اتصل بنا", to: "/contact" },
        ],
      },
    ],
  },
  pages: {
    home: {
      pageGoal: "conversion",
      compositionPolicy: {
        pageGoal: "conversion",
        enforceTrustSignals: true,
      },
      sections: [
        {
          type: "promo-strip",
          settings: {
            badge: "Orbit Picks",
            message: "تخفيضات أسبوعية وشحن سريع داخل مصر على التشكيلات الأكثر طلبًا.",
            saleLabel: "حتى 25% خصم",
            shippingLabel: "شحن خلال 48 ساعة",
            returnLabel: "استبدال سريع",
            ctaText: "ابدئي من المتجر",
            ctaLink: "/shop",
          },
        },
        {
          type: "hero-banner",
          variant: "split-panel",
          settings: {
            title: "تجربة تسوق أوضح وأسرع للعميل العربي",
            subtitle:
              "واجهة متجر desktop-first تركز على البحث والتصفية وسرعة الوصول للمنتج المناسب.",
            ctaText: "تسوق الآن",
            ctaLink: "/shop",
            secondaryCtaText: "شاهدي العروض",
            secondaryCtaLink: "/sale",
          },
        },
        {
          type: "featured-collections",
          settings: {
            title: "ابدأ من التصنيف المناسب",
            subtitle:
              "هيكل واضح يساعد العميل أن يصل للمنتج الأنسب بدل التشتت بين العناصر.",
            limit: 4,
            ctaText: "كل التصنيفات",
            ctaLink: "/collections",
          },
        },
        {
          type: "featured-products",
          variant: "overlay-card",
          settings: {
            title: "أفضل اختيارات هذا الأسبوع",
            limit: 8,
          },
        },
        {
          type: "newsletter",
          variant: "split-panel",
          settings: {
            title: "العروض قبل الجميع",
            subtitle: "اشترك لتصلك التخفيضات والإصدارات الجديدة قبل نفاد المقاسات.",
            buttonText: "اشترك الآن",
            placeholder: "اكتبي بريدك الإلكتروني",
          },
        },
      ],
    },
    shop: {
      pageGoal: "discovery",
      compositionPolicy: {
        pageGoal: "discovery",
        enforceTrustSignals: true,
      },
      layoutHint: "commerce-3col",
      sections: [
        {
          type: "shop-command-bar",
          settings: {
            title: "رحلة اكتشاف أسرع داخل المتجر",
            subtitle:
              "ابدأ بالبحث أو التصنيف أو الترتيب، ثم انتقل مباشرة إلى المنتج المناسب.",
            searchPlaceholder: "ابحث عن المنتج أو الفئة",
            resultsLabel: "نتيجة متاحة",
            clearButtonText: "تصفير الفلاتر",
            stickyLabel: "Orbit Controls",
            chipLimit: 7,
          },
        },
        "filters-sidebar",
        {
          type: "product-grid",
          variant: "overlay-card",
          settings: {
            title: "منتجات مختارة بعناية",
            limit: 12,
          },
        },
        {
          type: "shop-promo-rail",
          settings: {
            badge: "Orbit Trust",
            title: "مساحة جانبية تخدم القرار الشرائي",
            subtitle:
              "بطاقات ثقة ورسائل سريعة وعرض موسمي في مكان ثابت أثناء التصفح.",
            spotlightTitle: "خصومات محدودة على اختيارات هذا الأسبوع",
            spotlightText:
              "حوّل المساحة الجانبية إلى أداة بيع حقيقية بدل فراغ بصري بجانب الشبكة.",
            ctaText: "اذهب إلى العروض",
            ctaLink: "/sale",
            trustItems:
              "شحن سريع|داخل مصر خلال 48 ساعة على المنتجات الجاهزة.\nاستبدال أوضح|رسائل ثقة تقلل تردد العميل قبل الطلب.\nتجربة عربية|واجهة RTL منظمة للبحث والتصفية والشراء.",
            highlights:
              "Product Discovery|Stronger\nTrust Signals|Always Visible\nDesktop Flow|Optimized",
          },
        },
        {
          type: "newsletter",
          variant: "minimal",
          settings: {
            title: "تابع الجديد أولًا",
            subtitle: "تنبيهات سريعة بأحدث المنتجات والعروض.",
          },
        },
      ],
    },
    collections: {
      pageGoal: "discovery",
      compositionPolicy: {
        pageGoal: "discovery",
      },
      sections: [
        {
          type: "featured-collections",
          settings: {
            title: "مجموعات منظمة للقرار الأسرع",
            subtitle:
              "تقسيمات واضحة تجعل المتجر أكثر قابلية للاستكشاف بدل العرض العشوائي.",
            limit: 6,
          },
        },
        {
          type: "product-grid",
          variant: "standard",
          settings: {
            title: "ابدأ من الأكثر مبيعًا",
            limit: 12,
          },
        },
      ],
    },
    pdp: {
      pageGoal: "trust",
      compositionPolicy: {
        pageGoal: "trust",
        enforceTrustSignals: true,
      },
      layoutHint: "product-detail",
      sections: [
        {
          type: "product-gallery",
          variant: "standard",
        },
        {
          type: "product-info",
          variant: "accordion",
        },
        {
          type: "reviews",
          variant: "compact",
        },
        {
          type: "related-products",
          variant: "standard",
          settings: {
            title: "قد يعجبك أيضًا",
            limit: 4,
          },
        },
      ],
    },
    sale: {
      pageGoal: "conversion",
      compositionPolicy: {
        pageGoal: "conversion",
      },
      sections: [
        {
          type: "promo-strip",
          settings: {
            badge: "Flash Offers",
            message: "منتجات وعروض سريعة لمدة محدودة مع شحن واستبدال واضح.",
            saleLabel: "خصومات محدودة",
            shippingLabel: "شحن سريع",
            returnLabel: "شراء آمن",
            ctaText: "ارجع للمتجر",
            ctaLink: "/shop",
          },
        },
        {
          type: "product-grid",
          variant: "overlay-card",
          settings: {
            title: "العروض الحالية",
            limit: 12,
            saleOnly: true,
          },
        },
      ],
    },
  },
  metadata: {
    intendedNextSections: ["shop-orbit-hero"],
    notes: [
      "الـ blueprint يستخدم command bar وpromo rail جديدين لتجربة shop أوضح.",
      "layoutHint=commerce-3col يوزع shop page إلى filter rail + main canvas + promo rail.",
    ],
  },
};
