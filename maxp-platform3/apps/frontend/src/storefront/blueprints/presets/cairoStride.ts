import type { StorefrontTemplateBlueprint } from "../types";

export const cairoStrideBlueprint: StorefrontTemplateBlueprint = {
  id: "cairo-stride",
  name: "Cairo Stride",
  description:
    "قالب أحذية رجالي موجه للجمهور المصري، يمزج بين الشكل الرجولي العملي، سرعة الاكتشاف، وثقة أعلى قبل الشراء.",
  baseThemeId: "modern-minimal",
  source: {
    kind: "manual",
    project: "Max P storefront",
    descriptor: "mens-shoes-egypt-cairo-stride",
  },
  tags: ["mens-shoes", "rtl", "egypt", "fashion", "commerce"],
  tokens: {
    colors: {
      primary: "24 26% 16%",
      primaryForeground: "0 0% 100%",
      secondary: "35 30% 93%",
      secondaryForeground: "24 20% 14%",
      accent: "31 86% 50%",
      accentForeground: "0 0% 100%",
      background: "34 30% 97%",
      foreground: "24 16% 11%",
      muted: "32 18% 90%",
      mutedForeground: "24 10% 36%",
      border: "30 16% 82%",
      card: "0 0% 100%",
      cardForeground: "24 16% 11%",
      ring: "31 86% 50%"
    },
    typography: {
      headingFont: '"IBM Plex Sans Arabic", "Cairo", sans-serif',
      bodyFont: '"IBM Plex Sans Arabic", "Tajawal", sans-serif',
      baseSize: "16px",
      direction: "rtl"
    },
    shape: {
      borderRadius: "1rem",
      buttonRadius: "999px"
    },
    productCard: {
      borderRadius: "1rem",
      boxShadow: "0 18px 42px -28px rgba(31, 24, 18, 0.18)",
      hoverShadow: "0 28px 56px -24px rgba(31, 24, 18, 0.26)",
      badgeRadius: "999px",
      buttonRadius: "0.85rem",
      surfaceOpacity: "1"
    }
  },
  seo: {
    titleTemplate: "%s | Cairo Stride",
    description:
      "واجهة أحذية رجالي موجهة للجمهور المصري مع اكتشاف أسرع للموديلات، مقاسات أوضح، وشحن واستبدال ظاهرين من أول نظرة."
  },
  header: {
    showSearch: true,
    navigation: [
      { label: "الرئيسية", to: "/" },
      { label: "المتجر", to: "/shop" },
      { label: "التصنيفات", to: "/collections" },
      { label: "العروض", to: "/sale" },
      { label: "دليل المقاسات", to: "/size-guide" }
    ]
  },
  footer: {
    description:
      "أحذية رجالي يومية وكلاسيك وسنيكرز بتجربة شراء أوضح تناسب ذوق العميل المصري وتقلل التردد قبل الطلب.",
    copyrightText: "© 2026 Cairo Stride",
    socialLinks: {
      instagram: "https://instagram.com",
      facebook: "https://facebook.com",
      whatsapp: "https://wa.me/201000000000"
    },
    navigation: [
      {
        title: "التسوق",
        links: [
          { label: "كل المنتجات", to: "/shop" },
          { label: "السنيكرز", to: "/shop?category=sneakers" },
          { label: "الكاجوال", to: "/shop?category=casual" },
          { label: "الكلاسيك", to: "/shop?category=formal" }
        ]
      },
      {
        title: "الدعم",
        links: [
          { label: "الشحن", to: "/shipping" },
          { label: "الاستبدال والاسترجاع", to: "/returns" },
          { label: "دليل المقاسات", to: "/size-guide" }
        ]
      }
    ]
  },
  pages: {
    home: {
      pageGoal: "conversion",
      compositionPolicy: {
        pageGoal: "conversion",
        enforceTrustSignals: true,
        preserveManualOrder: true
      },
      sections: [
        {
          type: "promo-strip",
          settings: {
            badge: "Stride Picks",
            message: "خصومات أسبوعية على السنيكرز والكاجوال مع شحن سريع واستبدال أوضح داخل مصر.",
            saleLabel: "حتى 20% خصم",
            shippingLabel: "شحن خلال 48 ساعة",
            returnLabel: "استبدال سهل",
            ctaText: "ادخل المتجر",
            ctaLink: "/shop"
          }
        },
        {
          type: "hero-banner",
          variant: "split-panel",
          settings: {
            eyebrow: "Cairo Stride",
            title: "خطوة ثابتة لكل يوم",
            subtitle: "أحذية رجالي بسِمت واضح للسوق المصري: موديلات يومية وكاجوال وكلاسيك مع تجربة شراء أسرع وثقة أكبر قبل الطلب.",
            ctaText: "تسوق الآن",
            ctaLink: "/shop",
            secondaryCtaText: "شاهد العروض",
            secondaryCtaLink: "/sale",
            backgroundImage: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=1400",
            panelImage: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=900",
            highlights: [
              { label: "شحن داخل مصر", value: "سريع وواضح" },
              { label: "مقاسات أقرب", value: "حيرة أقل" },
              { label: "ستايل رجالي", value: "عملي ونضيف" }
            ],
            floatingCards: [
              {
                eyebrow: "Stride Picks",
                title: "سنيكرز يومي",
                description: "موديلات مريحة للحركة والشغل والخروج اليومي.",
                tone: "primary",
                position: "top-left"
              },
              {
                eyebrow: "Egypt Fit",
                title: "مقاسات أوضح",
                description: "دليل سريع يقلل التردد قبل ما تضيف للسلة.",
                tone: "accent",
                position: "bottom-left"
              }
            ],
            profileChip: {
              label: "ستايل رجالي مصري",
              value: "عملي + واضح + مريح"
            },
            panelEyebrow: "منتج اليوم",
            panelTitle: "ستايل رجالي عملي بدون مبالغة",
            panelSubtitle: "كاجوال وكلاسيك وسنيكرز بتوازن بين الشكل والراحة وسهولة الاختيار.",
            panelMetricLabel: "الأكثر طلبًا",
            panelMetricValue: "موديلات يومية",
            panelNote: "شحن سريع داخل مصر + استبدال أوضح",
            panelCtaText: "استكشف التشكيلة",
            panelCtaLink: "/collections"
          }
        },
        {
          type: "featured-collections",
          settings: {
            title: "اختار حسب استخدامك",
            subtitle: "قسم الموديلات حسب الشغل والخروجات واليومي عشان القرار يبقى أسرع.",
            limit: 4,
            ctaText: "كل التصنيفات",
            ctaLink: "/collections",
            collections: "سنيكرز يومي|موديلات مريحة للحركة والجامعة والشغل الخفيف.|https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=900|/shop?category=sneakers\nكاجوال عملي|اختيارات مناسبة للمشاوير اليومية والخروجات السريعة.|https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=900|/shop?category=casual\nكلاسيك هادي|موديلات أرتب للمكتب والمناسبات والشغل الرسمي.|https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&q=80&w=900|/shop?category=formal\nراحة طوال اليوم|اختيارات تركّز على الراحة والثبات وسهولة اللبس.|https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&q=80&w=900|/shop?sortBy=createdAt&sortOrder=desc"
          }
        },
        {
          type: "features-bar",
          settings: {
            title: "ليه Cairo Stride مناسب للعميل المصري؟",
            subtitle: "نخلي قرار الشراء أسهل بمعلومات واضحة ومهمة فعلًا بدل بلوكات شكلية مالهاش لازمة.",
            items: [
              {
                icon: "shield",
                title: "ثقة قبل الدفع",
                description: "استبدال أوضح ومعلومات عملية قبل ما العميل يحسم الطلب."
              },
              {
                icon: "truck",
                title: "شحن واضح",
                description: "رسائل مباشرة عن التوصيل داخل مصر والمدة المتوقعة."
              },
              {
                icon: "grid",
                title: "مقاسات أقرب",
                description: "دليل سريع يساعد على تقليل الحيرة واختيار المقاس المناسب."
              },
              {
                icon: "target",
                title: "تصفح أسرع",
                description: "تقسيم عملي بين السنيكرز والكاجوال والكلاسيك عشان القرار يبقى أسهل."
              }
            ]
          }
        },
        {
          type: "offer-bento",
          settings: {
            badge: "Stride Edits",
            title: "3 مداخل سريعة للشراء",
            subtitle: "بلوك بصري أقوى يوجّه العميل لأسرع طريقة يناسبه يكتشف بها المنتج.",
            cards: [
              {
                label: "اليومي",
                title: "موديلات تمشي مع الشغل والخروجات",
                subtitle: "اختيارات عملية مريحة تناسب الحركة اليومية بدون تعقيد.",
                ctaText: "اذهب لليومي",
                link: "/shop?category=casual",
                tone: "primary",
                stat: "راحة أسرع"
              },
              {
                label: "السنيكرز",
                title: "ستايل أخف بإحساس شبابي أنضف",
                subtitle: "موديلات مناسبة للجامعة والخروج والحركة الكتير طوال اليوم.",
                ctaText: "شاهد السنيكرز",
                link: "/shop?category=sneakers",
                tone: "accent",
                stat: "الأكثر طلبًا"
              },
              {
                label: "الكلاسيك",
                title: "اختيارات أهدى للمناسبات والشغل",
                subtitle: "تشكيلة محسوبة للعميل اللي عايز شكل أرتب بدون مبالغة.",
                ctaText: "اذهب للكلاسيك",
                link: "/shop?category=formal",
                tone: "slate",
                stat: "شكل أشيك"
              }
            ]
          }
        },
        {
          type: "featured-products",
          variant: "overlay-card",
          settings: {
            title: "الأكثر طلبًا هذا الأسبوع",
            subtitle: "منتجات عليها إقبال أعلى وتناسب ذوق الشراء السريع.",
            limit: 8
          }
        },
        {
          type: "newsletter",
          variant: "split-panel",
          settings: {
            title: "وصلات جديدة أول بأول",
            subtitle: "اشترك عشان توصلك العروض والموديلات الجديدة قبل نفاد المقاسات الشعبية.",
            buttonText: "اشترك الآن",
            placeholder: "اكتب بريدك الإلكتروني"
          }
        }
      ]
    },
    shop: {
      pageGoal: "discovery",
      layoutHint: "commerce-3col",
      compositionPolicy: {
        pageGoal: "discovery",
        enforceTrustSignals: true,
        preserveManualOrder: true
      },
      sections: [
        {
          type: "shop-command-bar",
          settings: {
            title: "دور أسرع على الموديل المناسب",
            subtitle: "ابحث أو فلتر أو رتب حسب السعر والأحدث قبل ما تدخل على المنتج.",
            searchPlaceholder: "ابحث عن موديل أو نوع الحذاء",
            resultsLabel: "منتج متاح",
            clearButtonText: "مسح التصفية",
            stickyLabel: "Stride Controls",
            chipLimit: 6
          }
        },
        "filters-sidebar",
        {
          type: "product-grid",
          variant: "standard",
          settings: {
            title: "كل الأحذية الرجالي",
            subtitle: "شبكة أوضح للمقارنة بين الموديلات والمقاسات والاستخدام اليومي.",
            limit: 12
          }
        },
        {
          type: "shop-promo-rail",
          settings: {
            badge: "Stride Trust",
            title: "معلومات تريحك قبل القرار",
            subtitle: "رسائل سريعة عن المقاسات والشحن والاستبدال بدون ما نعطل تصفح المنتجات.",
            spotlightTitle: "موديلات مناسبة للشغل والخروجات اليومية",
            spotlightText: "بدل التشتت، ركز على الاستخدام الأقرب لك: يومي، كاجوال، أو كلاسيك.",
            ctaText: "اذهب للعروض",
            ctaLink: "/sale",
            trustItems: "شحن واضح|توصيل سريع داخل مصر على أغلب الموديلات الجاهزة.\nاستبدال أسهل|رسالة ثقة تقلل الحيرة قبل تأكيد الطلب.\nمقاس أقرب|دليل بسيط يساعدك تختار رقمك بسرعة.",
            highlights: "Casual Picks|Daily\nFormal Line|Sharper\nEgypt Fit|Clearer"
          }
        },
        {
          type: "newsletter",
          variant: "minimal",
          settings: {
            title: "وصلك الجديد؟",
            subtitle: "تنبيهات سريعة بالموديلات والعروض الجديدة."
          }
        }
      ]
    },
    collections: {
      pageGoal: "discovery",
      compositionPolicy: {
        pageGoal: "discovery",
        preserveManualOrder: true
      },
      sections: [
        {
          type: "featured-collections",
          settings: {
            title: "تسوق حسب نوع الحذاء",
            subtitle: "ابدأ من السنيكرز أو الكاجوال أو الكلاسيك عشان توصل للموديل الأقرب لاحتياجك.",
            limit: 6
          }
        },
        {
          type: "product-grid",
          variant: "compact",
          settings: {
            title: "الأقرب لذوقك",
            limit: 12
          }
        }
      ]
    },
    pdp: {
      pageGoal: "trust",
      layoutHint: "product-detail",
      compositionPolicy: {
        pageGoal: "trust",
        enforceTrustSignals: true,
        preserveManualOrder: true
      },
      sections: [
        {
          type: "product-gallery",
          variant: "grid"
        },
        {
          type: "product-info",
          variant: "accordion",
          settings: {
            addToCartText: "أضف للسلة",
            descriptionTitle: "تفاصيل المنتج",
            shippingTitle: "الشحن والاستبدال",
            shippingText: "شحن سريع داخل مصر مع توضيح أسهل لسياسة الاستبدال قبل الدفع.",
            guaranteesTitle: "ليه تختار Cairo Stride؟",
            sizeGuideText: "افتح دليل المقاسات",
            sizeGuideLink: "/size-guide",
            fitNote: "لو بتلبس مقاسين أو بتحب راحة أوسع في الموديلات اليومية، اختار المقاس الأكبر غالبًا."
          }
        },
        {
          type: "size-guide",
          variant: "compact",
          settings: {
            badge: "Fit Helper",
            title: "اختار المقاس بثقة",
            subtitle: "جدول سريع ونصيحة مباشرة قبل إتمام الطلب.",
            note: "لو القدم عريضة أو بين مقاسين، اختار الأكبر غالبًا.",
            guideRows: "default|40|7|8|25.5\ndefault|41|8|9|26.2\ndefault|42|9|10|26.9\ndefault|43|10|11|27.6\ndefault|44|11|12|28.3\ndefault|45|12|13|29.0\ncategory:formal|40|7|8|25.3\ncategory:formal|41|8|9|26.0\ncategory:formal|42|9|10|26.7\ncategory:formal|43|10|11|27.4\ncategory:formal|44|11|12|28.1\ncategory:formal|45|12|13|28.8",
            guideOverrides: "default|دليل المقاسات السريع|اختيار واضح قبل ما تضيف المنتج للسلة.|لو بين مقاسين اختار الأكبر.\ncategory:formal|مقاسات الكلاسيك|الموديلات الكلاسيك غالبًا تكون أضيق قليلًا من الأمام.|لو بتحب راحة أكثر اختار الأكبر."
          }
        },
        {
          type: "conversion-stack",
          variant: "editorial"
        },
        {
          type: "bought-together",
          variant: "stacked",
          settings: {
            title: "يُشترى معه كثيرًا",
            subtitle: "اختيارات تساعدك تكمل الطلب بشكل عملي.",
            limit: 3
          }
        },
        {
          type: "related-products",
          variant: "standard",
          settings: {
            title: "موديلات مشابهة",
            subtitle: "بدائل قريبة لو عايز نفس الإحساس بس ستايل مختلف.",
            limit: 4
          }
        },
        {
          type: "reviews",
          variant: "compact",
          settings: {
            title: "آراء العملاء",
            subtitle: "تقييمات تساعدك تحسم قبل الطلب."
          }
        }
      ]
    },
    sale: {
      pageGoal: "conversion",
      compositionPolicy: {
        pageGoal: "conversion",
        preserveManualOrder: true
      },
      sections: [
        {
          type: "promo-strip",
          settings: {
            badge: "Stride Sale",
            message: "عروض محدودة على موديلات مختارة مع شحن أسرع داخل مصر.",
            saleLabel: "خصومات واضحة",
            shippingLabel: "توصيل سريع",
            returnLabel: "استبدال أسهل",
            ctaText: "ارجع للمتجر",
            ctaLink: "/shop"
          }
        },
        {
          type: "offer-bento",
          settings: {
            badge: "Stride Sale",
            title: "عروض محسوبة للحسم الأسرع",
            subtitle: "رتبنا التخفيضات حول نوع الاستخدام والقيمة بدل عرضها بشكل مسطح.",
            cards: [
              {
                label: "يومي",
                title: "موديلات سريعة الحركة بسعر أوفر",
                subtitle: "اختيارات عملية للبس اليومي والخروجات الخفيفة.",
                ctaText: "شاهد اليومي",
                link: "/sale?category=casual",
                tone: "accent",
                stat: "خصم واضح"
              },
              {
                label: "شغل",
                title: "كلاسيك مناسب للمكتب والمشاوير الرسمية",
                subtitle: "موديلات أهدى بإحساس مرتب وسعر أحسن من المعتاد.",
                ctaText: "شاهد الكلاسيك",
                link: "/sale?category=formal",
                tone: "primary",
                stat: "وفر الآن"
              },
              {
                label: "سنيكرز",
                title: "موديلات شبابية عليها طلب أعلى",
                subtitle: "اختيارات أقرب لذوق الشباب بسعر منافس لفترة محدودة.",
                ctaText: "شاهد السنيكرز",
                link: "/sale?category=sneakers",
                tone: "slate",
                stat: "لفترة محدودة"
              }
            ]
          }
        },
        {
          type: "product-grid",
          variant: "compact",
          settings: {
            title: "العروض الحالية",
            limit: 12,
            saleOnly: true
          }
        }
      ]
    },
    cart: {
      sections: [
        {
          type: "cart-items",
          settings: {
            title: "سلة التسوق",
            emptyText: "لسه ما اخترتش منتجات.",
            continueShoppingText: "كمل التسوق"
          }
        },
        {
          type: "order-summary",
          settings: {
            title: "ملخص الطلب"
          }
        }
      ]
    },
    checkout: {
      sections: [
        {
          type: "checkout-form"
        },
        {
          type: "payment"
        },
        {
          type: "order-summary"
        }
      ]
    },
    "thank-you": {
      sections: [
        {
          type: "order-confirmation",
          settings: {
            title: "تم تأكيد طلبك",
            description: "شكرًا لطلبك من Cairo Stride. بنجهزه الآن وهنوافيك بتحديثات الشحن.",
            continueShoppingText: "ارجع للمتجر",
            orderNumberPrefix: "رقم الطلب:",
            supportText: "لو محتاج مساعدة تواصل معنا عبر"
          }
        }
      ]
    },
    registration: {
      sections: ["member-registration"]
    },
    "size-guide": {
      sections: [
        {
          type: "size-guide",
          variant: "detailed",
          settings: {
            badge: "Stride Sizing",
            title: "دليل مقاسات الأحذية الرجالي",
            subtitle: "مرجع واضح لاختيار المقاس الأنسب قبل الشراء.",
            note: "لو القدم عريضة أو بين مقاسين، اختار الأكبر غالبًا.",
            guideRows: "default|40|7|8|25.5\ndefault|41|8|9|26.2\ndefault|42|9|10|26.9\ndefault|43|10|11|27.6\ndefault|44|11|12|28.3\ndefault|45|12|13|29.0"
          }
        }
      ]
    }
  },
  metadata: {
    notes: [
      "القالب موجه لأحذية رجالي مناسبة للسوق المصري بطابع رجولي عملي.",
      "shop page تحفظ الاكتشاف أولاً مع command bar + filters + grid + trust rail.",
      "PDP تعطي المقاس والشحن والاستبدال دورًا أوضح لتقليل التردد قبل الطلب."
    ]
  }
};
