import type { StorefrontTemplateBlueprint } from "../types";

export const novaMobileBlueprint: StorefrontTemplateBlueprint = {
  id: "nova-mobile",
  name: "Nova Mobile",
  source: {
    kind: "manual",
  },
  tokens: {
    colors: {
      primary: "230 75% 55%", // Electric Indigo
      secondary: "240 10% 10%", // Midnight Obsidian
      accent: "190 90% 50%", // Cyan Spark
      background: "210 20% 98%",
    },
    typography: {
      headingFont: "'Inter', 'Tajawal', sans-serif",
      bodyFont: "'Inter', 'Tajawal', sans-serif",
    },
    shape: {
      borderRadius: "1rem",
      buttonRadius: "0.75rem",
    },
  },
  metadata: {
    previewImage: "/images/storefront-previews/nova-mobile.png",
  },
  pages: {
    home: {
      pageGoal: "conversion",
      compositionPolicy: {
        preserveManualOrder: true,
      },
      sections: [
        {
          type: "hero-banner",
          variant: "centered",
          settings: {
            title: "أحدث الهواتف الذكية",
            subtitle: "اكتشف الجيل الجديد من الأجهزة المبتكرة مع أقوى العروض الحصرية.",
            primaryCtaText: "تصفح الأجهزة مجدداً",
            primaryCtaLink: "/shop",
          },
        },
        {
          type: "promo-strip",
          settings: {
            messages: [
              "دعم فني 24/7",
              "ضمان وكيل معتمد",
              "توصيل مجاني لأكثر من 500 ريال",
            ],
          },
        },
        {
          type: "featured-collections",
          settings: {
            title: "تسوق حسب الماركة",
            limit: 6,
            ctaText: "عرض جميع التصنيفات",
            ctaLink: "/collections",
          },
        },
        {
          type: "product-grid",
          variant: "compact",
          settings: {
            title: "الأجهزة الأكثر مبيعاً",
            limit: 8,
          },
        },
        {
          type: "newsletter",
          variant: "standard",
          settings: {
            title: "اشترك للحصول على أحدث إصدارات الهواتف",
            subtitle: "كن أول من يحصل على إشعارات بالأجهزة الجديدة كلياً.",
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
          variant: "compact",
        },
      ],
    },
    collections: {
      pageGoal: "discovery",
      compositionPolicy: {
        preserveManualOrder: true,
      },
      sections: [
        {
          type: "featured-collections",
        },
        {
          type: "product-grid",
          variant: "compact",
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
          variant: "specs-grid",
        },
        {
          type: "conversion-stack",
          variant: "balanced",
          settings: {
            showCountdown: true,
            showStockWarning: true,
            showDeliveryEstimate: true,
          },
        },
        {
          type: "bought-together",
          settings: {
            title: "إكسسوارات ننصح بها",
          },
        },
        {
          type: "reviews",
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
        },
        {
          type: "order-summary",
        },
        {
          type: "promo-strip",
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
          type: "checkout-form",
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
