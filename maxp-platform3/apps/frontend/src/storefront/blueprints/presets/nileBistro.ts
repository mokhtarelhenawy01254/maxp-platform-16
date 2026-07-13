import type { StorefrontTemplateBlueprint } from '../types';

export const nileBistroBlueprint: StorefrontTemplateBlueprint = {
  id: 'nile-bistro',
  name: 'Nile Bistro',
  description:
    'قالب مطعم عربي RTL مناسب للسوق المصري، يوازن بين إبراز الأطباق، سرعة استكشاف المنيو، وتشجيع الطلب المباشر والعروض اليومية.',
  baseThemeId: 'modern-minimal',
  thumbnailUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=800',
  source: {
    kind: 'manual',
    project: 'Max P storefront',
    descriptor: 'restaurant-egypt-nile-bistro',
  },
  tags: ['restaurant', 'food', 'rtl', 'egypt', 'delivery'],
  tokens: {
    colors: {
      primary: '10 58% 18%',
      primaryForeground: '0 0% 100%',
      secondary: '35 72% 94%',
      secondaryForeground: '16 28% 16%',
      accent: '16 88% 52%',
      accentForeground: '0 0% 100%',
      background: '34 45% 97%',
      foreground: '16 20% 12%',
      muted: '34 28% 91%',
      mutedForeground: '20 9% 36%',
      border: '28 22% 84%',
      card: '0 0% 100%',
      cardForeground: '16 20% 12%',
      ring: '16 88% 52%'
    },
    typography: {
      headingFont: '"Cairo", "IBM Plex Sans Arabic", sans-serif',
      bodyFont: '"Tajawal", "IBM Plex Sans Arabic", sans-serif',
      baseSize: '16px',
      direction: 'rtl'
    },
    shape: {
      borderRadius: '1.15rem',
      buttonRadius: '999px'
    }
  },
  seo: {
    titleTemplate: '%s | Nile Bistro',
    description:
      'قالب مطعم عربي يبرز الوجبات والعروض اليومية والمنيو بشكل أسرع، مع تجربة طلب أوضح تناسب المطاعم في السوق المصري.'
  },
  header: {
    showSearch: true,
    navigation: [
      { label: 'الرئيسية', to: '/' },
      { label: 'المنيو', to: '/shop' },
      { label: 'التصنيفات', to: '/collections' },
      { label: 'العروض', to: '/sale' },
      { label: 'اتصل بنا', to: '/contact' }
    ]
  },
  footer: {
    description:
      'منيو عربي واضح للمطاعم مع إبراز الوجبات الأساسية والعروض اليومية وتجربة طلب أنظف وأسرع.',
    copyrightText: '© 2026 Nile Bistro',
    socialLinks: {
      instagram: 'https://instagram.com',
      facebook: 'https://facebook.com',
      whatsapp: 'https://wa.me/201000000000'
    },
    navigation: [
      {
        title: 'المنيو',
        links: [
          { label: 'كل الأصناف', to: '/shop' },
          { label: 'الوجبات', to: '/shop?category=meals' },
          { label: 'السندوتشات', to: '/shop?category=sandwiches' },
          { label: 'المقبلات', to: '/shop?category=starters' }
        ]
      },
      {
        title: 'الدعم',
        links: [
          { label: 'التوصيل', to: '/shipping' },
          { label: 'الفروع', to: '/contact' },
          { label: 'العروض', to: '/sale' }
        ]
      }
    ]
  },
  pages: {
    home: {
      pageGoal: 'conversion',
      compositionPolicy: {
        pageGoal: 'conversion',
        enforceTrustSignals: true,
        preserveManualOrder: true
      },
      sections: [
        {
          type: 'promo-strip',
          settings: {
            badge: 'Nile Offers',
            message: 'عروض اليوم والوجبات الأكثر طلبًا مع توصيل أسرع داخل القاهرة والجيزة.',
            saleLabel: 'عروض يومية',
            shippingLabel: 'توصيل سريع',
            returnLabel: 'طلب أوضح',
            ctaText: 'اطلب الآن',
            ctaLink: '/shop'
          }
        },
        {
          type: 'hero-banner',
          variant: 'split-panel',
          settings: {
            eyebrow: 'Nile Bistro',
            title: 'أكل يشهي من أول نظرة',
            subtitle:
              'منيو عربي سريع وواضح، يبرز الوجبات والعروض والكومبوهات بشكل يساعد العميل يطلب أسرع بدون لخبطة.',
            ctaText: 'افتح المنيو',
            ctaLink: '/shop',
            secondaryCtaText: 'شاهد العروض',
            secondaryCtaLink: '/sale',
            backgroundImage:
              'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1400',
            panelImage:
              'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=1000',
            highlights: [
              { label: 'أكثر طلبًا', value: 'وجبات وكومبوهات' },
              { label: 'توصيل أسرع', value: 'داخل مناطق التغطية' },
              { label: 'منيو أوضح', value: 'اختيار أسرع' }
            ],
            floatingCards: [
              {
                eyebrow: 'وجبة اليوم',
                title: 'كومبوهات جاهزة',
                description: 'اختيارات سريعة للغدا والعشا تقلل الحيرة وتسرّع الطلب.',
                tone: 'accent',
                position: 'top-left'
              },
              {
                eyebrow: 'Hot Picks',
                title: 'عروض يومية',
                description: 'خصومات خفيفة ومركزة من غير ما نغرق الصفحة في زحمة.',
                tone: 'primary',
                position: 'bottom-left'
              }
            ],
            profileChip: {
              label: 'مطعم عربي',
              value: 'منيو أوضح + طلب أسرع'
            }
          }
        },
        {
          type: 'featured-collections',
          settings: {
            title: 'ابدأ من النوع اللي تشتهيه',
            subtitle: 'ادخل مباشرة على الوجبات أو السندوتشات أو المقبلات أو الحلويات بدل ما تفضل تلف كثير.',
            limit: 4,
            ctaText: 'كل التصنيفات',
            ctaLink: '/collections',
            collections:
              'الوجبات|أطباق رئيسية وكومبوهات مشبعة مناسبة للغدا والعشا.|https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=900|/shop?category=meals\nالسندوتشات|اختيارات سريعة للشغل والجامعة والخروجات الخفيفة.|https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=900|/shop?category=sandwiches\nالمقبلات|بطاطس، صوصات، وأطباق جانبية تكمل الطلب.|https://images.unsplash.com/photo-1541014741259-de529411b96a?auto=format&fit=crop&q=80&w=900|/shop?category=starters\nالحلويات والمشروبات|اختيارات تختم الطلب أو تكمل الكومبو بشكل أخف.|https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&q=80&w=900|/shop?category=desserts'
          }
        },
        {
          type: 'offer-bento',
          settings: {
            badge: 'اختيارات اليوم',
            title: '3 مداخل سريعة للطلب',
            subtitle: 'وجبات جاهزة للكومبو، أصناف الأكثر طلبًا، وعروض يومية تساعد العميل يقرر أسرع.',
            cards: [
              {
                label: 'الأكثر طلبًا',
                title: 'وجبات عليها إقبال أعلى',
                subtitle: 'ابدأ بالأصناف اللي الناس بترجع تطلبها كثيرًا.',
                ctaText: 'شاهد الأكثر طلبًا',
                link: '/shop?sortBy=popularity',
                tone: 'primary',
                stat: 'Top Picks'
              },
              {
                label: 'كومبوهات',
                title: 'وجبة + مشروب + إضافة',
                subtitle: 'اختيارات مرتبة بشكل يساعد على طلب أسرع وقيمة أوضح.',
                ctaText: 'شاهد الكومبوهات',
                link: '/shop?category=combos',
                tone: 'accent',
                stat: 'Value Meal'
              },
              {
                label: 'عروض اليوم',
                title: 'خصومات خفيفة على أصناف مختارة',
                subtitle: 'بلوك سريع للعروض اليومية بدون ما يغرق الصفحة في ضوضاء.',
                ctaText: 'اذهب للعروض',
                link: '/sale',
                tone: 'slate',
                stat: 'Today Only'
              }
            ]
          }
        },
        {
          type: 'features-bar',
          variant: 'delivery-clarity',
          settings: {
            title: 'ليه Nile Bistro أسهل في الطلب؟',
            subtitle: 'بنوضح نوع الوجبة والسعر والإضافات والعرض بدل ما العميل يحتار قبل ما يكمّل.',
            items: [
              {
                icon: 'truck',
                title: 'توصيل واضح',
                description: 'رسائل مباشرة عن التوصيل ومناطق الخدمة.'
              },
              {
                icon: 'target',
                title: 'منيو أسرع',
                description: 'تصنيفات واضحة للوصول للأكلة المطلوبة بسرعة.'
              },
              {
                icon: 'shield',
                title: 'عروض مفهومة',
                description: 'العرض ظاهر بدل ما يستخبى وسط المنيو.'
              },
              {
                icon: 'refresh-cw',
                title: 'طلب أسهل',
                description: 'مسار شراء أنضف من أول المنيو لحد إتمام الطلب.'
              }
            ]
          }
        },
        {
          type: 'product-grid',
          variant: 'overlay-card',
          settings: {
            title: 'أطباق مميزة هذا الأسبوع',
            subtitle: 'شبكة منتجات أقرب لستايل المنيو مع إبراز بصري أفضل للأكل.',
            limit: 8
          }
        },
        {
          type: 'newsletter',
          variant: 'dark',
          settings: {
            title: 'خليك أول واحد يعرف العرض',
            subtitle: 'اشترك لتوصلك الوجبات الجديدة والعروض اليومية قبل الزحمة.',
            buttonText: 'اشترك الآن',
            placeholder: 'اكتب بريدك الإلكتروني'
          }
        }
      ]
    },
    shop: {
      pageGoal: 'discovery',
      layoutHint: 'commerce-3col',
      compositionPolicy: {
        pageGoal: 'discovery',
        enforceTrustSignals: true,
        preserveManualOrder: true
      },
      sections: [
        {
          type: 'shop-command-bar',
          variant: 'menu-quick-order',
          settings: {
            title: 'لف في المنيو بسرعة',
            subtitle: 'فلتر حسب نوع الأكلة أو السعر أو الأكثر طلبًا قبل ما تختار.',
            searchPlaceholder: 'ابحث عن وجبة أو صنف',
            resultsLabel: 'صنف متاح',
            clearButtonText: 'مسح التصفية',
            stickyLabel: 'Menu Controls',
            chipLimit: 6
          }
        },
        'filters-sidebar',
        {
          type: 'product-grid',
          variant: 'list-card',
          settings: {
            title: 'كل أصناف المنيو',
            subtitle: 'عرض أقرب لفكرة المنيو يساعد على المقارنة الأسرع بين الأصناف والسعر والإضافة.',
            limit: 12
          }
        },
        {
          type: 'shop-promo-rail',
          variant: 'trust-rail',
          settings: {
            badge: 'Menu Guide',
            title: 'إرشاد أسرع داخل المنيو',
            subtitle: 'رسائل خفيفة تساعد العميل يطلب أسرع بدون ما نحمّل الصفحة عروض زيادة.',
            spotlightTitle: 'ابدأ بالأكثر طلبًا',
            spotlightText: 'لو أول مرة تطلب، ابدأ من الوجبات والكومبوهات الأعلى طلبًا ثم كمّل الإضافات.',
            ctaText: 'اذهب للعروض',
            ctaLink: '/sale',
            trustItems:
              'توصيل واضح|مناطق الخدمة ووقت التوصيل ظاهرين بشكل أوضح.\nاختيار أسرع|تصنيفات تساعدك توصل بسرعة للصنف المناسب.\nعروض مفهومة|الكومبو والعروض متظبطين في مسار واضح.',
            highlights: 'Top Picks|Clear\nFast Order|Cleaner\nCombo Flow|Simpler'
          }
        },
        {
          type: 'newsletter',
          variant: 'minimal',
          settings: {
            title: 'خليك قريب من العروض',
            subtitle: 'تنبيهات خفيفة بالوجبات الجديدة والخصومات.'
          }
        }
      ]
    },
    collections: {
      pageGoal: 'discovery',
      compositionPolicy: {
        pageGoal: 'discovery',
        preserveManualOrder: true
      },
      sections: [
        {
          type: 'featured-collections',
          settings: {
            title: 'تصنيفات المنيو',
            subtitle: 'ابدأ من القسم الأقرب لمزاجك أو لوقتك الآن.',
            limit: 6,
            ctaText: 'ارجع للمنيو',
            ctaLink: '/shop'
          }
        },
        {
          type: 'product-grid',
          variant: 'standard',
          settings: {
            title: 'الأقرب لذوقك',
            limit: 12
          }
        }
      ]
    },
    pdp: {
      pageGoal: 'trust',
      layoutHint: 'product-detail',
      compositionPolicy: {
        pageGoal: 'trust',
        enforceTrustSignals: true,
        preserveManualOrder: true
      },
      sections: [
        {
          type: 'product-gallery',
          variant: 'grid'
        },
        {
          type: 'product-info',
          variant: 'accordion',
          settings: {
            addToCartText: 'أضف للطلب',
            descriptionTitle: 'مكونات الوجبة',
            shippingTitle: 'التوصيل',
            shippingText: 'معلومات أوضح عن وقت التوصيل ورسومه داخل مناطق الخدمة.',
            guaranteesTitle: 'ليه تطلب الطبق ده؟',
            fitNote: 'مناسب كوجبة رئيسية، ولو عايز الطلب يبقى أكمل أضف بطاطس أو مشروب أو حلو خفيف.'
          }
        },
        {
          type: 'conversion-stack',
          variant: 'balanced'
        },
        {
          type: 'bought-together',
          variant: 'compact',
          settings: {
            title: 'كمل طلبك',
            subtitle: 'إضافات ومشروبات أو أصناف جانبية تناسب الوجبة دي.',
            limit: 3
          }
        },
        {
          type: 'related-products',
          variant: 'compact',
          settings: {
            title: 'أصناف مشابهة',
            subtitle: 'بدائل أو وجبات قريبة لو عايز تقارن قبل ما تطلب.',
            limit: 4
          }
        },
        {
          type: 'reviews',
          variant: 'compact',
          settings: {
            title: 'آراء العملاء',
            subtitle: 'تقييمات تساعد العميل يحسم بسرعة.'
          }
        }
      ]
    },
    sale: {
      pageGoal: 'conversion',
      compositionPolicy: {
        pageGoal: 'conversion',
        preserveManualOrder: true
      },
      sections: [
        {
          type: 'offer-bento',
          settings: {
            badge: 'Offers',
            title: 'عروض اليوم',
            subtitle: 'أصناف وكومبوهات وعروض يومية بشكل أوضح وأسرع للطلب.',
            cards: [
              {
                label: 'وجبات',
                title: 'كومبوهات جاهزة بسعر أوضح',
                subtitle: 'اختيارات مناسبة للغدا أو العشا مع قيمة أعلى.',
                ctaText: 'شاهد الوجبات',
                link: '/sale?category=meals',
                tone: 'accent',
                stat: 'Today'
              },
              {
                label: 'سندوتشات',
                title: 'عروض سريعة للطلب السريع',
                subtitle: 'اختيارات مناسبة للشغل والجامعة والخروجات السريعة.',
                ctaText: 'شاهد السندوتشات',
                link: '/sale?category=sandwiches',
                tone: 'primary',
                stat: 'Hot'
              },
              {
                label: 'إضافات',
                title: 'بطاطس ومقبلات ومشروبات بعروض أخف',
                subtitle: 'خلي الطلب متكامل من غير ما تلف كثير.',
                ctaText: 'شاهد الإضافات',
                link: '/sale?category=starters',
                tone: 'slate',
                stat: 'Combo'
              }
            ]
          }
        },
        {
          type: 'product-grid',
          variant: 'standard',
          settings: {
            title: 'كل العروض الحالية',
            limit: 12,
            saleOnly: true
          }
        }
      ]
    },
    cart: {
      sections: [
        {
          type: 'cart-items',
          settings: {
            title: 'طلبك الحالي',
            emptyText: 'لسه ما اخترتش أصناف.',
            continueShoppingText: 'ارجع للمنيو'
          }
        },
        {
          type: 'order-summary',
          settings: {
            title: 'ملخص الطلب'
          }
        }
      ]
    },
    checkout: {
      sections: [
        { type: 'checkout-form' },
        { type: 'payment' },
        { type: 'order-summary' }
      ]
    },
    'thank-you': {
      sections: [
        {
          type: 'order-confirmation',
          settings: {
            title: 'تم تأكيد طلبك',
            description: 'شكرًا لطلبك من Nile Bistro. بنجهزه الآن وهنوافيك بتفاصيل التوصيل.',
            continueShoppingText: 'ارجع للمنيو',
            orderNumberPrefix: 'رقم الطلب:',
            supportText: 'لو محتاج مساعدة تواصل معنا عبر'
          }
        }
      ]
    },
    registration: {
      sections: ['member-registration']
    }
  },
  metadata: {
    notes: [
      'قالب مطعم عربي RTL يركز على سرعة استكشاف المنيو والعروض اليومية.',
      'FeaturedCollections و OfferBento و ShopCommandBar مستخدمة بvariants مناسبة لسيناريو المطاعم.',
      'PDP تعاملت هنا كصفحة طبق/وجبة مع تركيز على الطلب والإضافات والتقييمات.'
    ]
  }
};
