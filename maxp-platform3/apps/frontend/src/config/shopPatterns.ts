import type { ShopCompositionConfig } from "../types/ShopComposition";

export interface ShopPatternDefinition extends ShopCompositionConfig {
  name: string;
  goal: "branding" | "conversion" | "browsing";
  reasoning: string;
  experienceType: string;
}

/**
 * 🏗️ 15 Refined Composition Patterns for Shop Pages
 * Leverages advanced section types for maximum impact.
 */
export const SHOP_COMPOSITION_PATTERNS: ShopPatternDefinition[] = [
  {
    name: "Editorial Lookbook",
    goal: "branding",
    layoutFamily: "editorial",
    reasoning: "يبدأ بالفيديو والمحتوى النصي لغمر الزائر في عالم العلامة التجارية قبل عرض المنتجات.",
    experienceType: "تجربة غامرة، بطيئة الإيقاع، تشبه تصفح مجلة فاخرة.",
    sections: [
      {
        id: "hero-video",
        type: "shop-hero",
        settings: {
          style: "full-bleed",
          title: "The Art of Living",
          description: "A journey through our latest collection",
        },
      },
      {
        id: "lookbook-main",
        type: "commerce-shoppable-lookbook",
        settings: {
          title: "Season Highlights",
          layout: "asymmetric",
        },
      },
      {
        id: "story-split",
        type: "content-split-story",
        settings: {
          title: "Craftsmanship",
          text: "Every piece is handcrafted with passion and precision.",
          imagePosition: "left",
        },
      },
      {
        id: "products-curated",
        type: "shop-product-grid",
        settings: {
          columns: 3,
          productCardVariant: "creative",
        },
      },
    ],
  },
  {
    name: "Conversion Sniper",
    goal: "conversion",
    layoutFamily: "default",
    reasoning: "وضع العرض المباشر في البداية مع مؤقت تنازلي (Urgency) يليه مباشرة المنتجات الأكثر مبيعاً.",
    experienceType: "سريعة، مباشرة، تركز على اتخاذ قرار الشراء فوراً.",
    sections: [
      {
        id: "urgency-timer",
        type: "conversion-urgency-timer-banner",
        settings: {
          title: "FLASH SALE ENDS SOON",
          endTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          style: "urgent",
        },
      },
      {
        id: "hero-offer",
        type: "shop-hero",
        settings: {
          style: "default",
          title: "50% OFF EVERYTHING",
        },
      },
      {
        id: "top-sellers",
        type: "shop-product-grid",
        settings: {
          columns: 4,
          productCardVariant: "default",
        },
      },
      {
        id: "bundle-builder",
        type: "commerce-bundle-builder",
        settings: {
          title: "Build Your Own Set & Save 20%",
          maxItems: 3,
        },
      },
      {
        id: "newsletter",
        type: "shop-newsletter",
        settings: {
          title: "Get Exclusive Deals",
        },
      },
    ],
  },
  {
    name: "Category Navigator",
    goal: "browsing",
    layoutFamily: "classic",
    reasoning: "يسهل الوصول للأقسام المختلفة في أول ثانية لتسهيل العثور على ما يبحث عنه المستخدم.",
    experienceType: "منظمة، فعالة، مثالية للمتاجر التي تحتوي على كتالوج ضخم.",
    sections: [
      {
        id: "trending-searches",
        type: "nav-trending-searches",
        settings: {
          title: "Popular Right Now",
        },
      },
      {
        id: "categories-nav",
        type: "shop-category-nav",
        settings: {
          layout: "grid",
          showAll: true,
        },
      },
      {
        id: "seasonal-promo",
        type: "shop-promo-banner",
        settings: {
          message: "Explore our New Spring Collection",
          style: "minimal",
        },
      },
      {
        id: "new-arrivals",
        type: "shop-product-grid",
        settings: {
          columns: 4,
          productCardVariant: "default",
        },
      },
    ],
  },
  {
    name: "The Minimalist",
    goal: "branding",
    layoutFamily: "aura-zen",
    reasoning: "تقليل التشتت عبر التركيز على منتج واحد بطل (Hero) ثم شبكة منتجات محدودة جداً.",
    experienceType: "راقية، هادئة، تمنح شعوراً بالثقة والجودة العالية.",
    sections: [
      {
        id: "hero-minimal",
        type: "shop-hero",
        settings: {
          style: "minimal",
          title: "Pure Essence",
        },
      },
      {
        id: "single-focus-story",
        type: "content-split-story",
        settings: {
          title: "The Signature Piece",
          text: "A masterpiece of minimalism and comfort.",
          imagePosition: "right",
        },
      },
      {
        id: "grid-limited",
        type: "shop-product-grid",
        settings: {
          columns: 2,
          productCardVariant: "creative",
        },
      },
      {
        id: "newsletter-min",
        type: "shop-newsletter",
        settings: {
          style: "minimal",
        },
      },
    ],
  },
  {
    name: "Social Proof Powerhouse",
    goal: "conversion",
    layoutFamily: "default",
    reasoning: "يبني الثقة أولاً من خلال شهادات العملاء والخبراء قبل طلب الشراء.",
    experienceType: "مطمئنة، تعليمية، تكسر كل حواجز الشك لدى العميل.",
    sections: [
      {
        id: "hero-trust",
        type: "shop-hero",
        settings: {
          title: "Trusted by 10k+ Customers",
          style: "default",
        },
      },
      {
        id: "lookbook-ugc",
        type: "commerce-shoppable-lookbook",
        settings: {
          title: "Our Community",
          source: "ugc",
        },
      },
      {
        id: "video-testimonials",
        type: "shop-featured-carousel",
        settings: {
          title: "Customer Stories",
          limit: 4,
        },
      },
      {
        id: "top-rated",
        type: "shop-product-grid",
        settings: {
          columns: 4,
          productCardVariant: "default",
        },
      },
    ],
  },
  {
    name: "Flash Sale Urgency",
    goal: "conversion",
    layoutFamily: "default",
    reasoning: "خلق ضغط زمني (FOMO) من البداية وحتى نهاية الصفحة لزيادة سرعة الشراء.",
    experienceType: "مليئة بالطاقة، سريعة، محفزة للأدرينالين.",
    sections: [
      {
        id: "timer-sticky",
        type: "conversion-urgency-timer-banner",
        settings: {
          title: "OFFER ENDS IN",
          endTime: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
          style: "urgent",
        },
      },
      {
        id: "hero-discount",
        type: "shop-hero",
        settings: {
          title: "FINAL CLEARANCE",
          description: "Up to 80% OFF. No restocks.",
          style: "default",
        },
      },
      {
        id: "flash-grid",
        type: "shop-product-grid",
        settings: {
          columns: 4,
          productCardVariant: "default",
        },
      },
      {
        id: "bundle-deals",
        type: "commerce-bundle-builder",
        settings: {
          title: "Grab the Set & Save More",
          maxItems: 2,
        },
      },
    ],
  },
  {
    name: "Lifestyle Story",
    goal: "branding",
    layoutFamily: "femme-chic",
    reasoning: "يعتمد على المحتوى الذي يصنعه المستخدمون (UGC) لإظهار المنتج في مواقف حقيقية.",
    experienceType: "واقعية، اجتماعية، تشبه تصفح إنستجرام.",
    sections: [
      {
        id: "hero-lifestyle",
        type: "shop-hero",
        settings: {
          style: "editorial",
          title: "Live in Style",
        },
      },
      {
        id: "split-story-lifestyle",
        type: "content-split-story",
        settings: {
          title: "Morning Routine",
          text: "Start your day with comfort and elegance.",
          imagePosition: "left",
        },
      },
      {
        id: "lookbook-lifestyle",
        type: "commerce-shoppable-lookbook",
        settings: {
          title: "Shop the Look",
          layout: "masonry",
        },
      },
      {
        id: "insta-grid",
        type: "shop-product-grid",
        settings: {
          columns: 3,
          productCardVariant: "creative",
        },
      },
    ],
  },
  {
    name: "Technical Explorer",
    goal: "browsing",
    layoutFamily: "classic",
    reasoning: "مخصص للمنتجات المعقدة التي تحتاج لشرح تفصيلي ومواصفات تقنية قبل الشراء.",
    experienceType: "تحليلية، عميقة، معلوماتية.",
    sections: [
      {
        id: "hero-tech",
        type: "shop-hero",
        settings: {
          style: "default",
          title: "Engineered for Performance",
        },
      },
      {
        id: "tech-split-1",
        type: "content-split-story",
        settings: {
          title: "Precision Engineering",
          text: "Built with carbon fiber for maximum durability.",
          imagePosition: "right",
        },
      },
      {
        id: "trending-specs",
        type: "nav-trending-searches",
        settings: {
          title: "Explore Features",
        },
      },
      {
        id: "parts-grid",
        type: "shop-product-grid",
        settings: {
          columns: 4,
          productCardVariant: "default",
        },
      },
    ],
  },
  {
    name: "Personalized Feed",
    goal: "conversion",
    layoutFamily: "default",
    reasoning: "يعتمد على بيانات المستخدم لعرض ما يهمه فقط، مما يزيد من احتمالية الشراء.",
    experienceType: "حميمية، مريحة، تجعل المستخدم يشعر بالاهتمام.",
    sections: [
      {
        id: "welcome-hero",
        type: "shop-hero",
        settings: {
          style: "minimal",
          title: "Welcome Back",
          description: "We've picked these just for you.",
        },
      },
      {
        id: "trending-for-you",
        type: "nav-trending-searches",
        settings: {
          title: "Your Trending Favorites",
        },
      },
      {
        id: "recommended-grid",
        type: "shop-product-grid",
        settings: {
          columns: 4,
          productCardVariant: "default",
        },
      },
      {
        id: "personalized-lookbook",
        type: "commerce-shoppable-lookbook",
        settings: {
          title: "Curated Styles for You",
        },
      },
    ],
  },
  {
    name: "The Launchpad",
    goal: "branding",
    layoutFamily: "luxury-shoes",
    reasoning: "يبني التشويق حول منتج واحد جديد فقط ويركز كل الطاقة عليه.",
    experienceType: "حماسية، حصرية، تشبه فعاليات أبل.",
    sections: [
      {
        id: "timer-launch",
        type: "conversion-urgency-timer-banner",
        settings: {
          title: "COUNTDOWN TO LAUNCH",
          endTime: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
          style: "elegant",
        },
      },
      {
        id: "reveal-story",
        type: "content-split-story",
        settings: {
          title: "Introducing: The X1",
          text: "The future of footwear is here.",
          imagePosition: "center",
        },
      },
      {
        id: "lookbook-reveal",
        type: "commerce-shoppable-lookbook",
        settings: {
          title: "Details in Focus",
        },
      },
      {
        id: "pre-order-grid",
        type: "shop-product-grid",
        settings: {
          columns: 1,
          productCardVariant: "creative",
        },
      },
    ],
  },
  {
    name: "Value-Driven Journey",
    goal: "conversion",
    layoutFamily: "default",
    reasoning: "يبدأ بطرح المشكلة التي يعاني منها العميل ثم يقدم المنتج كحل سحري.",
    experienceType: "منطقية، مقنعة، عاطفية.",
    sections: [
      {
        id: "problem-split",
        type: "content-split-story",
        settings: {
          title: "Tired of slow shipping?",
          text: "We solved it with our global network.",
          imagePosition: "left",
        },
      },
      {
        id: "solution-bundle",
        type: "commerce-bundle-builder",
        settings: {
          title: "The Ultimate Shipping Starter Kit",
          maxItems: 3,
        },
      },
      {
        id: "products-solution",
        type: "shop-product-grid",
        settings: {
          columns: 4,
          productCardVariant: "default",
        },
      },
    ],
  },
  {
    name: "The Curator",
    goal: "browsing",
    layoutFamily: "rose-atelier",
    reasoning: "يعتمد على شخصية الخبير أو المنسق الذي يختار المنتجات للعميل.",
    experienceType: "موجهة، حصرية، تشبه الحصول على نصيحة من صديق خبير.",
    sections: [
      {
        id: "curator-hero",
        type: "shop-hero",
        settings: {
          style: "editorial",
          title: "Jane's Monthly Picks",
        },
      },
      {
        id: "curator-lookbook",
        type: "commerce-shoppable-lookbook",
        settings: {
          title: "My Favorite Looks",
        },
      },
      {
        id: "picks-grid",
        type: "shop-product-grid",
        settings: {
          columns: 3,
          productCardVariant: "creative",
        },
      },
      {
        id: "trending-picks",
        type: "nav-trending-searches",
        settings: {
          title: "What people are asking about",
        },
      },
    ],
  },
  {
    name: "Inventory Clearout",
    goal: "conversion",
    layoutFamily: "default",
    reasoning: "يركز على السعر والتوافر وسهولة العثور على القياسات المناسبة بسرعة.",
    experienceType: "صيد صفقات (Bargain hunting)، عالية الكثافة.",
    sections: [
      {
        id: "clearance-timer",
        type: "conversion-urgency-timer-banner",
        settings: {
          title: "LAST CHANCE: STOCK CLEARING",
          style: "urgent",
        },
      },
      {
        id: "toolbar-filters",
        type: "shop-toolbar",
        settings: {
          showSearch: true,
          showSort: true,
        },
      },
      {
        id: "dense-grid",
        type: "shop-product-grid",
        settings: {
          columns: 5,
          productCardVariant: "default",
        },
      },
      {
        id: "bundle-clearance",
        type: "commerce-bundle-builder",
        settings: {
          title: "Buy More, Save More",
          maxItems: 5,
        },
      },
    ],
  },
  {
    name: "Hybrid Magazine",
    goal: "branding",
    layoutFamily: "editorial",
    reasoning: "يدمج المنتجات داخل مقالات ومقابلات، بحيث يكون البيع ناعماً وغير مباشر.",
    experienceType: "ثقافية، غنية بالمعلومات، غير ضاغطة للبيع.",
    sections: [
      {
        id: "article-split",
        type: "content-split-story",
        settings: {
          title: "Sustainable Fashion Future",
          text: "An in-depth look at our new materials.",
          imagePosition: "center",
        },
      },
      {
        id: "lookbook-magazine",
        type: "commerce-shoppable-lookbook",
        settings: {
          title: "Visual Essay",
        },
      },
      {
        id: "contextual-grid",
        type: "shop-product-grid",
        settings: {
          columns: 2,
          productCardVariant: "creative",
        },
      },
      {
        id: "trending-topics",
        type: "nav-trending-searches",
        settings: {
          title: "Related Articles",
        },
      },
    ],
  },
  {
    name: "The Mega-Store",
    goal: "browsing",
    layoutFamily: "classic",
    reasoning: "يوفر نقاط دخول متعددة لجمهور متنوع جداً في صفحة واحدة طويلة.",
    experienceType: "شاملة، مزدحمة (بشكل منظم)، توفر خيارات لا نهائية.",
    sections: [
      {
        id: "trending-mega",
        type: "nav-trending-searches",
        settings: {
          title: "Top Searches Across Store",
        },
      },
      {
        id: "hero-carousel",
        type: "shop-hero",
        settings: {
          style: "default",
          title: "One Stop Shop",
        },
      },
      {
        id: "tabbed-sections",
        type: "shop-product-grid",
        settings: {
          columns: 4,
          productCardVariant: "default",
        },
      },
      {
        id: "bundle-mega",
        type: "commerce-bundle-builder",
        settings: {
          title: "Frequently Bought Together",
        },
      },
      {
        id: "lookbook-mega",
        type: "commerce-shoppable-lookbook",
        settings: {
          title: "Our Best Sellers in Action",
        },
      },
    ],
  },
];
