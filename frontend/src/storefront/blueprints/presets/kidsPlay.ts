import type { StorefrontTemplateBlueprint } from "../types";

export const kidsPlayBlueprint: StorefrontTemplateBlueprint = {
  id: "kids-play",
  name: "Kids Play",
  description: "عالم من الألوان والمرح؛ تصميم مبهج مصمم خصيصاً لمتاجر لعب الأطفال ليجذب الصغار ويطمئن الكبار.",
  thumbnailUrl: "/assets/themes/kids-play/preview.png",
  source: {
    kind: "manual",
  },
  tokens: {
    colors: {
      primary: "195 80% 50%", // Bright Sky Blue
      secondary: "45 100% 50%", // Vibrant Yellow
      accent: "340 80% 60%", // Playful Pink
      background: "45 20% 98%", // Very light, warm background
    },
    typography: {
      headingFont: "'Outfit', 'Tajawal', sans-serif", // Playful, rounded font 
      bodyFont: "'Inter', 'Tajawal', sans-serif",
    },
    shape: {
      borderRadius: "1.5rem", // Highly rounded for friendly, safe feel
      buttonRadius: "1rem",
    },
  },
  pages: {
    home: {
      pageGoal: "discovery",
      compositionPolicy: {
        preserveManualOrder: true,
      },
      sections: [
        {
          type: "promo-strip",
          settings: {
            badge: "شحن مجاني",
            message: "استمتع بشحن مجاني على جميع الطلبات الأكثر من 50 ريال!",
            saleLabel: "عروض الألعاب",
            ctaText: "اكتشف المزيد",
            ctaLink: "/shop",
          },
        },
        {
          type: "hero-banner",
          variant: "layered-parallax-sky",
          settings: {
            title: "عالم من المرح الخيالي",
            subtitle: "اكتشف ألعاباً تعليمية وترفهية آمنة ومصممة لتنمية مهارات طفلك وإسعاده.",
            primaryCtaText: "تسوق الألعاب الآن",
            primaryCtaLink: "/shop",
          },
        },
        {
          type: "features-bar",
          variant: "kids-guarantee",
          settings: {
            title: "لماذا يثق الآباء بمتجرنا؟",
            items: [
              { icon: "shield", title: "أمان تام", description: "مواد غير سامة وآمنة تماماً للأطفال." },
              { icon: "leaf", title: "صديق للبيئة", description: "ألعاب خشبية ومن مواد مستدامة." },
              { icon: "target", title: "تنمية المهارات", description: "مصممة لتطوير الذكاء والحركة." },
              { icon: "search", title: "جودة مضمونة", description: "فحص دقيق لكل لعبة قبل الشحن." },
            ],
          },
        },
        {
          type: "featured-collections",
          variant: "floating-bubbles",
          settings: {
            title: "تسوق حسب العمر",
            layout: "grid",
          },
        },
        {
          type: "product-grid",
          variant: "playful-toybox",
          settings: {
            title: "ألعاب جديدة مذهلة",
            limit: 8,
          },
        },
        {
          type: "newsletter",
          variant: "standard",
          settings: {
            title: "نشرة المرح",
            subtitle: "احصل على أحدث عروض الألعاب ونصائح التربية لمستقبل مشرق.",
          },
        },
      ],
    },
    shop: {
      pageGoal: "discovery",
      layoutHint: "commerce-3col",
      compositionPolicy: {
        preserveManualOrder: true,
      },
      sections: [
        {
          type: "shop-command-bar",
        },
        {
          type: "filters-sidebar",
        },
        {
          type: "product-grid",
          variant: "playful-toybox",
        },
      ],
    },
    pdp: {
      pageGoal: "conversion",
      compositionPolicy: {
        preserveManualOrder: true,
      },
      sections: [
        {
          type: "product-gallery",
          variant: "standard",
        },
        {
          type: "product-info",
          variant: "playful-story", 
        },
        {
          type: "conversion-stack",
          variant: "balanced",
          settings: {
            showStockWarning: true,
            showDeliveryEstimate: true,
            trustedBadgeTitle: "تسوق بكل ثقة",
            trustedBadgeItems: "دفع آمن، توصيل سريع، ألعاب أصلية 100%، استبدال سهل",
            trustedBadgeStyle: "grid",
          },
        },
        {
          type: "reviews",
        },
        {
          type: "product-grid",
          variant: "compact",
          settings: {
            title: "ألعاب أخرى قد تعجبك",
            limit: 4,
          },
        },
      ],
    },
    cart: {
      pageGoal: "conversion",
      compositionPolicy: {
        preserveManualOrder: true,
      },
      sections: [
        {
          type: "cart-items",
          variant: "playful-basket",
        },
        {
          type: "order-summary",
        },
      ],
    },
    checkout: {
      pageGoal: "conversion",
      compositionPolicy: {
        preserveManualOrder: true,
      },
      sections: [
        {
          type: "cart-items",
          variant: "playful-basket",
        },
        {
          type: "checkout-form",
          variant: "safe-adventure",
        },
        {
          type: "payment",
        },
        {
          type: "order-summary",
        },
      ],
    },
  },
};
