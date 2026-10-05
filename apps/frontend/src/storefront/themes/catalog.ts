import {
  DEFAULT_STOREFRONT_THEME_ID,
  getStorefrontThemePreset,
  getStorefrontThemePresetIds,
  STOREFRONT_THEME_PRESETS,
} from "./index";

export interface StorefrontThemeCatalogItem {
  id: string;
  themeId: string;
  slug: string;
  appId?: string | null;
  name: string;
  description: string;
  category: StorefrontThemeCategoryMeta;
  pricingModel: "FREE" | "ONE_TIME";
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  isActive: boolean;
  isPublic: boolean;
  isFeatured: boolean;
  isDefaultTheme?: boolean;
  isOwned: boolean;
  isCurrentTheme?: boolean;
  canSelect: boolean;
  canActivate: boolean;
  canPurchase: boolean;
  requiresPurchase: boolean;
  requiresActivation: boolean;
  trialDays: number;
  installationId?: string | null;
  installationStatus?: string | null;
  activePricingModel?: "FREE" | "ONE_TIME" | null;
  trialEndsAt?: string | null;
  validUntil?: string | null;
  nextBillingAt?: string | null;
  preview: {
    colors: string[];
    imageUrl?: string;
  };
  pageStats: {
    homeSections: number;
    shopSections: number;
    checkoutSections: number;
    pdpSections: number;
    cartSections: number;
    totalSections: number;
  };
  usageStats?: {
    installations: number;
    activeInstallations: number;
    purchases: number;
    currentCompanies: number;
    installCount: number;
  };
  features?: Record<string, unknown>;
}

export type StorefrontThemeCategoryMeta = {
  primary: {
    id: string;
    label: string;
  };
  secondary: {
    id: string;
    label: string;
  };
};

const createThemeCategoryMeta = (
  primaryId: string,
  primaryLabel: string,
  secondaryId: string,
  secondaryLabel: string,
): StorefrontThemeCategoryMeta => ({
  primary: {
    id: primaryId,
    label: primaryLabel,
  },
  secondary: {
    id: secondaryId,
    label: secondaryLabel,
  },
});

const DEFAULT_STOREFRONT_THEME_CATEGORY = createThemeCategoryMeta(
  "general",
  "عام",
  "general-store",
  "متجر عام",
);

const STOREFRONT_THEME_CATEGORY_PRESETS: Record<
  string,
  StorefrontThemeCategoryMeta
> = {
  "modern-minimal": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "womens-shoes",
    "أحذية حريمي",
  ),
  "district-market": createThemeCategoryMeta(
    "general",
    "عام",
    "general-store",
    "متجر عام",
  ),
  "shop-orbit": createThemeCategoryMeta(
    "general",
    "عام",
    "multi-category",
    "متجر متعدد الأقسام",
  ),
  "vanguard-premium": createThemeCategoryMeta(
    "general",
    "عام",
    "premium-brand",
    "براند فاخر",
  ),
  "zen-organic": createThemeCategoryMeta(
    "general",
    "عام",
    "natural-products",
    "منتجات طبيعية",
  ),
  "bold-fashion": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "fashion-store",
    "متجر أزياء",
  ),
  "elegant-luxe": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "luxury-fashion",
    "أزياء فاخرة",
  ),
  "atelier-nova": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "womens-fashion",
    "ملابس نسائية",
  ),
  "aura-chic": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "accessories",
    "إكسسوارات",
  ),
  "solea-femme": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "womens-shoes",
    "أحذية حريمي",
  ),
  "elessi-carry-lane": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "bags-accessories",
    "حقائب وإكسسوارات",
  ),
  "elessi-pedal-lab": createThemeCategoryMeta(
    "sports",
    "رياضة وفيتنس",
    "bikes-outdoor",
    "دراجات وملحقات",
  ),
  "elessi-harvest-fold": createThemeCategoryMeta(
    "grocery",
    "بقالة",
    "organic-food",
    "منتجات عضوية",
  ),
  "elessi-signal-deck": createThemeCategoryMeta(
    "electronics",
    "إلكترونيات",
    "gadgets-workstations",
    "أجهزة وملحقات عمل",
  ),
  "elessi-glow-routine": createThemeCategoryMeta(
    "beauty",
    "جمال وعناية",
    "skincare-cosmetics",
    "عناية وبشرة",
  ),
  "elessi-gem-atelier": createThemeCategoryMeta(
    "luxury",
    "فخامة",
    "jewelry-gifts",
    "مجوهرات وهدايا",
  ),
  "elessi-tail-supply": createThemeCategoryMeta(
    "pets",
    "حيوانات أليفة",
    "pet-store",
    "مستلزمات حيوانات",
  ),
  "elessi-chrono-gallery": createThemeCategoryMeta(
    "luxury",
    "فخامة",
    "watches-accessories",
    "ساعات وإكسسوارات",
  ),
  "elessi-garage-fit": createThemeCategoryMeta(
    "automotive",
    "سيارات",
    "car-parts",
    "قطع غيار وسيارات",
  ),
  "elessi-sprout-room": createThemeCategoryMeta(
    "plants-garden",
    "نباتات وزراعة",
    "home-garden",
    "نباتات وديكور",
  ),
  "fakhama-elite": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "luxury-fashion",
    "أزياء فاخرة",
  ),
  "mystic-desert": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "heritage-fashion",
    "أزياء تراثية",
  ),
  "menswear-prime": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "mens-clothing",
    "ملابس رجالي",
  ),
  "cairo-stride": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "mens-shoes",
    "أحذية رجالي",
  ),
  "closet-os": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "capsule-wardrobe",
    "خزانة أسبوعية",
  ),
  "cutline-club": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "ready-to-wear",
    "ملابس جاهزة",
  ),
  "hayah-modest-eg": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "modest-fashion",
    "أزياء محتشمة",
  ),
  "anjella-boutique": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "modest-fashion",
    "بوتيك أزياء وعبايات محتشمة",
  ),
  "rihla-resort-eg": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "resort-travelwear",
    "ملابس سفر ومصايف",
  ),
  "layali-edit-eg": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "occasion-eveningwear",
    "سهرة ومناسبات",
  ),
  "legacy-default-old": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "watches-accessories",
    "ساعات وإكسسوارات",
  ),
  "style-store-eg": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "watches-accessories",
    "ساعات وإكسسوارات",
  ),
  "men-shoes-eg": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "mens-shoes",
    "أحذية رجالي",
  ),
  "women-fashion-eg": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "womens-fashion",
    "ملابس وأحذية حريمي",
  ),
  "look-atelier-eg": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "womens-fashion",
    "ملابس حريمي",
  ),
  "khemet-luxe-eg": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "womens-shoes",
    "أحذية حريمي",
  ),
  "khemet-luxe-v2": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "womens-shoes",
    "أحذية حريمي بريميم",
  ),
  "khemet-general-eg": createThemeCategoryMeta(
    "general",
    "متاجر عامة",
    "general-store",
    "متجر عام متنوع",
  ),
  "khemet-fashion-eg": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "womens-fashion",
    "ملابس حريمي",
  ),
  "perfume-eg": createThemeCategoryMeta(
    "beauty",
    "جمال وعناية",
    "perfume-store",
    "متجر برفنات",
  ),
  "pc-hub-eg": createThemeCategoryMeta(
    "electronics",
    "إلكترونيات",
    "computer-store",
    "كمبيوتر ولابتوب",
  ),
  "rose-boutique-eg": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "womens-fashion",
    "بوتيك حريمي",
  ),
  "vela-fashion-eg": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "fashion-store",
    "متجر أزياء تحريري",
  ),
  "fitting-room-studio": createThemeCategoryMeta(
    "fashion",
    "Fashion",
    "mobile-fashion",
    "Mobile-first fashion store",
  ),
  "fastly-eg": createThemeCategoryMeta(
    "general",
    "عام",
    "offers-store",
    "متجر عروض مباشر",
  ),
  "nile-bistro": createThemeCategoryMeta(
    "food",
    "مطاعم وأغذية",
    "restaurants",
    "مطاعم",
  ),
  "nova-mobile": createThemeCategoryMeta(
    "electronics",
    "إلكترونيات",
    "mobile-store",
    "موبايلات",
  ),
  "kids-play": createThemeCategoryMeta("kids", "أطفال", "toys", "ألعاب أطفال"),
  "airlume-ai": createThemeCategoryMeta(
    "services",
    "خدمات",
    "travel-services",
    "سفر وحجوزات",
  ),
  "max-care-go": createThemeCategoryMeta(
    "general",
    "عام",
    "medical-fast",
    "صيدلية سريعة",
  ),
  "pharmacy-demo": createThemeCategoryMeta(
    "general",
    "عام",
    "pharmacy-care",
    "صيدلية وعناية",
  ),
  "butcher-counter-eg": createThemeCategoryMeta(
    "food",
    "مطاعم وأغذية",
    "butcher-shop",
    "جزارة Premium ولحوم Black Label",
  ),
  pawsome: createThemeCategoryMeta(
    "pets",
    "حيوانات أليفة",
    "pet-store",
    "مستلزمات حيوانات",
  ),
  "velvet-glow": createThemeCategoryMeta(
    "beauty",
    "جمال وعناية",
    "skincare-cosmetics",
    "مستحضرات تجميل",
  ),
  "ink-paper": createThemeCategoryMeta(
    "books",
    "كتب وقرطاسية",
    "bookstore",
    "مكتبة",
  ),
  "bloom-studio": createThemeCategoryMeta(
    "gifts",
    "ورد وهدايا",
    "florist",
    "ورد وتغليف",
  ),
  "iron-forge": createThemeCategoryMeta(
    "sports",
    "رياضة وفيتنس",
    "fitness-gear",
    "معدات رياضية",
  ),
  opulence: createThemeCategoryMeta(
    "luxury",
    "فخامة",
    "jewelry-watches",
    "مجوهرات وساعات",
  ),
  "turbo-parts": createThemeCategoryMeta(
    "automotive",
    "سيارات",
    "car-parts",
    "قطع غيار",
  ),
  crafted: createThemeCategoryMeta(
    "handmade",
    "حرف يدوية",
    "artisan-crafts",
    "صناعات يدوية",
  ),
  "fresh-cart": createThemeCategoryMeta(
    "grocery",
    "بقالة",
    "online-supermarket",
    "سوبرماركت أونلاين",
  ),
  "skill-lab": createThemeCategoryMeta(
    "digital",
    "رقمي وإبداعي",
    "courses-digital",
    "كورسات ومنتجات رقمية",
  ),
  "baladi-market-eg": createThemeCategoryMeta(
    "general",
    "عام",
    "direct-market",
    "متجر مباشر بدون رئيسية",
  ),
  "nile-elegance-eg": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "luxury-fashion",
    "أزياء فاخرة",
  ),
  "butcher-shop-eg": createThemeCategoryMeta(
    "food",
    "مطاعم وأغذية",
    "meat-shop",
    "جزارة ولحوم",
  ),
  "soft-graceful": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "curated-fashion",
    "أزياء منسقة ومواسم",
  ),
  "allure": createThemeCategoryMeta(
    "fashion",
    "أزياء",
    "fashion-store",
    "متجر أزياء",
  ),
  "creative-portfolio": createThemeCategoryMeta(
    "creative",
    "إبداعي وبورتفوليو",
    "portfolio-showcase",
    "معرض أعمال وخدمات",
  ),
  "dental-lab-elite": createThemeCategoryMeta(
    "medical",
    "طبي وصحي",
    "dental-lab",
    "معمل ومختبر أسنان رقمي 3D",
  ),
  "redline-auto": createThemeCategoryMeta(
    "automotive",
    "سيارات",
    "car-accessories",
    "ستائر وإكسسوارات سيارات",
  ),
};

const getStorefrontThemeCategoryMeta = (
  themeId: string,
): StorefrontThemeCategoryMeta =>
  STOREFRONT_THEME_CATEGORY_PRESETS[themeId] ||
  DEFAULT_STOREFRONT_THEME_CATEGORY;

export const STOREFRONT_THEME_DESCRIPTIONS: Record<string, string> = {
  "redline-auto":
    "Red Line Auto — قالب مخصص وفائق التحويل لستائر وإكسسوارات السيارات: تفصيل بالمللي، عزل حراري 98%، معاينة وتجربة قبل الدفع وشراء مباشر سريع.",
  "dental-lab-elite":
    "Dental Lab Elite — قالب بريميوم فائق التطور لمعامل ومختبرات الأسنان الرقمية: سرد تفاعلي ثلاثي الأبعاد 3D لمراحل CAD/CAM، ومحاكي درجات الألوان VITA، وسلايدر قبل وبعد، ومهيأ لتصدر بحث جوجل والظهور المحلي لجذب عيادات وأطباء الأسنان.",
  "creative-portfolio":
    "قالب بورتفوليو واستوديو إبداعي متكامل للمصممين، الوكالات، المستقلين، والشركات الخدمية: عرض مشاريع احترافي، مقارنة قبل وبعد، شبكة خدمات، وطلب تسعير مباشر بدون تعقيدات المتاجر التقليدية.",
  "soft-graceful":
    "Soft Graceful — قالب أزياء تحريري للعلامات العصرية بلمسة MaxP: مجموعات منسّقة، لوكات موسمية، اكتشاف ذكي بالـ Hotspot، سلّة منزلقة وQuick View، بألوان الرصيف الأصلي وأدوات Graceful.",
  "allure":
    "نسخة من ثيم Allure / Allura (ألورا) (Shopify): أناقة تلتقي بالبساطة، عرض بصري قوي وعلامة تجارية فاخرة. يدعم mega menu، تصفية بالألوان (swatch filters)، quick buy، سلة منزلقة، دليل مقاسات، lookbook، عدّاد نقص المخزون، عدّ تنازلي، تنبيهات عودة المخزون، cross-sell/بُعِد-معًا، ومراجعات العملاء.",
  "modern-minimal":
    "بوتيك أحذية حريمي هادئ يوازن بين إبراز المقاسات، وضوح المقارنة، ومسارات شراء أسرع للسنيكرز والكعب والصنادل.",
  "bold-fashion":
    "واجهة أزياء جريئة تبرز العروض السريعة والمنتجات الرائجة بإيقاع بصري أعلى ورسائل شراء أوضح.",
  "elegant-luxe":
    "دار أزياء فاخرة بطابع صالون تحريري: تشكيلات أوضح، دفتر إلهام قابل للتسوّق، وخدمة ما بعد الطلب لا تقل رقيًا عن العرض.",
  "atelier-nova":
    "بوتيك نسائي أقرب إلى غاليري هادئ: دفعات صغيرة، قطع منسقة، ومسارات شراء تحافظ على الإيقاع بدل الرفوف العامة.",
  "aura-chic":
    "قالب إكسسوارات أنثوي يركز على الحقائب والقطع اليومية والهدايا الخفيفة داخل تجربة بوتيك ناعمة.",
  "solea-femme":
    "قالب أحذية حريمي يجمع بين الإحساس الراقي، وضوح المقاسات، والعروض السريعة للمكتب والمساء.",
  "elessi-carry-lane":
    "قالب حقائب وإكسسوارات مستوحى من روح Elessi الغنية، لكن مع merchandising أوضح ومسار أسرع بين الحقائب اليومية والسفر والهدايا.",
  "elessi-pedal-lab":
    "واجهة دراجات وملحقات تستخدم كثافة Elessi في الأقسام والاختيارات، مع toolbar أوضح للمواصفات والصيانة والترقيات.",
  "elessi-harvest-fold":
    "قالب منتجات عضوية وطلبات منزلية يترجم روح Elessi إلى صناديق خضار وفاكهة وبانتري وروتين شراء أسري أخف وأوضح.",
  "elessi-signal-deck":
    "واجهة أجهزة وملحقات عمل تستفيد من منطق Elessi في discovery والبيع، مع spec surfaces أوضح للأجهزة والإكسسوارات المكتبية.",
  "elessi-glow-routine":
    "قالب beauty وعناية يعيد استخدام روح Elessi في الروتينات والمجموعات والهدايا بدل مجرد عرض منتجات عشوائي.",
  "elessi-gem-atelier":
    "بوتيك مجوهرات وهدايا يلتقط ثراء Elessi في العرض، لكن يقدمه داخل لغة أكثر رقيًا لقطع التوقيع والهدايا المناسبة.",
  "elessi-tail-supply":
    "متجر مستلزمات حيوانات غني بالاكتشاف والتصنيفات، يعيد ترتيب كثافة Elessi لخدمة الأكل واللعب والعناية والروتين اليومي.",
  "elessi-chrono-gallery":
    "واجهة ساعات وإضافات رجالية تستخدم merchandising كثيف وقوائم أوضح للحسم والمقارنة والهدايا السريعة.",
  "elessi-garage-fit":
    "قالب قطع غيار وسيارات يحول روح Elessi إلى شريط مواصفات أوضح وبنية بيع أقرب للمقارنة والشراء العملي.",
  "elessi-sprout-room":
    "واجهة نباتات وديكور مستوحاة من Elessi، تجمع بين أقسام غنية واختيار أخف للهدايا المنزلية والأصص والنباتات اليومية.",
  "fakhama-elite":
    "واجهة أحذية نسائية فاخرة تركز على الحرفية والخامات الراقية ورسائل الثقة قبل الشراء.",
  "mystic-desert":
    "واجهة دافئة مستوحاة من الصحراء مناسبة للأزياء التراثية والقطع ذات الهوية الشرقية الواضحة.",
  "airlume-ai":
    "واجهة سفر حديثة مع Hero عائم وبطاقات مزايا غير منتظمة لعرض تجربة حجز أكثر وضوحًا.",
  "district-market":
    "قالب متجر عام عربي بإيقاع أسرع وترتيب أوضح للأقسام والعروض والمنتجات الأكثر حركة داخل المتجر.",
  "shop-orbit":
    "قالب متجر عربي عام يسهّل الوصول للمنتج بسرعة: بحث أوضح، تصفية مرتبة، وعروض جانبية تدعم القرار الشرائي.",
  "menswear-prime":
    "قالب مخصص للملابس الرجالية الكلاسيكية يركز على الثقة والقصات الرسمية وتجربة شراء أكثر فخامة.",
  "cairo-stride":
    "قالب أحذية رجالية جاهز للبيع من أول يوم: المقاس واضح، العروض قريبة، والعميل يحسم بسرعة من غير لف كتير.",
  "closet-os":
    "قالب خزانة أسبوعية يبيع بروتين لبس جاهز: قمصان، طبقات خفيفة، وكابسولات يومية تقلل الحيرة وتشجع التكرار.",
  "cutline-club":
    "قالب streetwear حضري يبيع بالدروب والأطقم الجاهزة والطبقات العملية، مع قرار أسرع للوك الكامل.",
  "hayah-modest-eg":
    "قالب أزياء محتشمة يبيع باللوك الجاهز: طبقات متناسقة، مقاسات أوضح، وقطع تكمل بعض فترفع قرار الشراء أسرع.",
  "rihla-resort-eg":
    "قالب سفر ومصايف يبيع من سيناريو الرحلة: البحر والخروجة وعشا الغروب، مع كبسولات جاهزة للحقيبة والطلب السريع.",
  "layali-edit-eg":
    "قالب مناسبات يختصر الحيرة: ابدئي من نوع المناسبة وشوفي لوكات جاهزة بعروض وإكسسوارات تكمل الطلب.",
  "legacy-default-old":
    "نسخة كلاسيكية مستلهمة من متجر EasyOrders القديم: هيدر أبيض مباشر، سلايدر صور كبير، وتصنيفات دائرية تقود الزائر إلى ساعات وإكسسوارات بشكل أسرع.",
  "style-store-eg":
    "قالب ساعات وشنط وسنيكرز يبيع من القطعة المكملة: إكسسوارات يومية، هدايا جاهزة، ورف أوضح من المتجر العام.",
  "men-shoes-eg":
    "قالب أحذية رجالي جاهز للتطبيق فورًا: موديلات واضحة، دليل مقاس ظاهر، ورسائل ثقة تشجع الشراء من أول زيارة.",
  "women-fashion-eg":
    "قالب حريمي بيّاع من أول شاشة: لوكات جاهزة، عروض كمية، وطلب سريع يخلي العميلة تحسم من غير تردد.",
  "khemet-luxe-eg":
    "بوتيك أحذية حريمي فاخر للسوق المصري بطابع تحريري واضح: صور أكبر، قصة قاهرة يدوية، ومسارات شراء أنيقة بدون زحمة كروت.",
  "khemet-luxe-v2":
    "نسخة بريميم 2026 من KHEMET LUXE: دليل إيجاد الحذاء المناسب، إثبات اجتماعي حي (عدد مبيعات + توصيل متوقع)، تكملات إطلالة (look-builder + bought-together)، back-in-stock و pre-order للكبسولات المحدودة، هيرو بفيديو، لوكبوك، تيك جريد، نوايا تسوق، وجورنال قصة الحرفة. أهداف الصفحة تحويل بدل ثقة.",
  "khemet-general-eg":
    "نسخة متجر عام من عائلة KHEMET: مسارات تسوق سريعة من أول شاشة (وصل جديد، عروض الأسبوع، الأكثر مبيعًا)، عروض واضحة بمدة مصرّحة، وثقة ظاهرة — من غير زحمة كروت.",
  "khemet-fashion-eg":
    "نسخة ملابس حريمي من عائلة KHEMET: لوك بوك أولًا، فئات حسب الإطلالة، تقييمات بصور من العميلات على الرئيسية، وPDP بعدّاد مبيعات وتوصيل متوقع وتبديل مقاس — هوية تحريرية أخضر ودهبي.",
  "pc-hub-eg":
    "قالب كمبيوتر وإلكترونيات مصري جاهز للبيع: السعر والمواصفات والضمان ظاهرين، مع عروض وتقسيط يقرّبوا قرار الشراء.",
  "rose-boutique-eg":
    "بوتيك حريمي ناعم لكن بيّاع: قطع متنسقة، عروض خفيفة، وكلام يركز على الطلب والحسم مش مجرد شكل هادي.",
  "vela-fashion-eg":
    "قالب أزياء LTR بنَفَس تحريري: صور موسمية، أقسام واضحة، شبكة منتجات quick view، وفوتر غني بالمعلومات وروابط الدعم.",
  "fitting-room-studio":
    "Mobile-first fashion template with fitting-app energy: quick discovery, soft imagery, and a native-style bag/checkout card with a dark CTA.",
  "fastly-eg":
    "قالب عروض عربي سريع: بانرات مباشرة، بطاقات أقسام مرتبطة بالعروض، وشبكة منتجات واضحة تدفع للحسم السريع.",
  "nile-bistro":
    "قالب مطعم مصري يفتح النفس ويقفل الطلب: منيو واضح، كومبوهات جاهزة، وعروض توصيل تشجع الإضافة للسلة.",
  "nova-mobile":
    "قالب موبايلات وإكسسوارات جاهز للسوق المصري: مواصفات واضحة، تقسيط، وضمان ورسائل بيع تقرّب القرار.",
  "kids-play":
    "قالب ألعاب أطفال يسهّل على الأهل الشراء: حسب السن، حسب نوع اللعب، وعروض واضحة على الهدايا والنشاطات.",
  "max-care-go":
    "قالب صيدلية موبايل-أول للطلبات السريعة: رفع روشتة، إعادة طلب، وعروض يومية تشجع العميل يكمل الطلب.",
  "pharmacy-demo":
    "قالب صيدلية هادئ للأسرة والاحتياجات اليومية، يركز على الوضوح والبدائل والدعم قبل تأكيد الطلب.",
  "butcher-counter-eg":
    "قالب جزارة Premium فاخر بتقطيعات حسب الطلب، وزن مؤكد قبل التجهيز، وتوصيل مبرد يحافظ على الطزاجة.",
  pawsome:
    "ثيم مبهج ودافئ لمتاجر الحيوانات الأليفة، بألوان مرحة وتصنيف سهل حسب نوع الحيوان.",
  "velvet-glow":
    "قالب جمال وعناية بإحساس فاخر يبيع الروتينات والهدايا الجاهزة بلغة أنعم وقرار شراء أسرع.",
  "ink-paper":
    "ثيم كلاسيكي بطابع أدبي لمتاجر الكتب والقرطاسية مع ترشيحات قراءة وعرض قائمة مميز.",
  "bloom-studio":
    "ثيم ربيعي طازج لمحلات الورد والهدايا مع تصنيف حسب المناسبة وتوصيل في نفس اليوم.",
  "iron-forge":
    "قالب رياضي جريء يبيع القوة والتحفيز: أجهزة، ملابس، ومكملات بعروض تدفع العميل يكمل التجهيزة.",
  opulence:
    "ثيم فائق الفخامة بالأسود والذهبي لمتاجر المجوهرات والساعات مع شهادات أصالة.",
  "turbo-parts":
    "قالب قطع غيار يختصر القرار: بحث بالموديل، باقات صيانة، وضمان واضح يطمن العميل قبل الشراء.",
  crafted:
    "ثيم دافئ بألوان أرضية لمنصات الحرف اليدوية مع قصص الحرفيين وقطع محدودة الإنتاج.",
  "fresh-cart":
    "قالب سوبرماركت أونلاين يسرّع الطلبات اليومية: أقسام مفهومة، باقات جاهزة، وعروض تتحرك بسرعة.",
  "skill-lab":
    "قالب كورسات ومنتجات رقمية يبيع المسارات الجاهزة والشهادات والعروض من أول شاشة وبأسلوب واضح ومباشر.",
  "baladi-market-eg":
    "متجر مصري مباشر بدون صفحة رئيسية — الزائر يدخل على المنتجات من أول ثانية مع ألوان مصرية دافئة ورسائل بيع محلية تشجع الحسم السريع.",
  "nile-elegance-eg":
    "قالب أزياء فاخرة بروح مصرية معاصرة: ألوان دافئة مستوحاة من النيل والذهب، تشكيلات واضحة، ومسار شراء يبث الثقة والأناقة للجمهور المصري.",
  "butcher-shop-eg":
    "ثيم جزارة مصري يبيع اللحوم الطازجة بوضوح: ألوان حمراء دافئة، صور لحم طازج، وقطع مختارة جاهزة للطلب السريع.",
};

const STOREFRONT_THEME_PREVIEW_IMAGES: Record<string, string> = {
  "creative-portfolio":
    "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=80&w=1600",
  "atelier-nova":
    "/assets/themes/atelier-nova/preview.png",
  "elegant-luxe":
    "/assets/themes/elegant-luxe/preview.png",
  "butcher-counter-eg":
    "https://images.unsplash.com/photo-1777799095908-978e9f70a872?auto=format&fit=crop&w=1600&q=80",
  "max-care-go":
    "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=1200&q=80",
  "menswear-prime":
    "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?q=80&w=2000&auto=format&fit=crop",
  "mystic-desert": "/products/mystic/hero.png",
  "modern-minimal": "/assets/themes/modern-minimal/preview.svg",
  "district-market": "/assets/themes/district-market/preview.svg",
  "vanguard-premium": "/assets/themes/style-store-eg/hero-banner.jpg",
  "solea-femme":
    "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=1400",
  "shop-orbit": "/assets/themes/district-market/hero-scene.webp",
  "closet-os": "/assets/themes/closet-os/preview.jpg",
  "cutline-club": "/assets/themes/cutline-club/preview.jpg",
  "hayah-modest-eg": "/assets/themes/hayah-modest-eg/preview.svg",
  "anjella-boutique": "/assets/themes/anjella-boutique/preview.svg",
  "rihla-resort-eg": "/assets/themes/rihla-resort-eg/preview.svg",
  "layali-edit-eg": "/assets/themes/layali-edit-eg/preview.svg",
  "legacy-default-old": "/assets/themes/legacy-default-old/preview.jpg",
  "style-store-eg": "/assets/themes/style-store-eg/hero-banner.jpg",
  "men-shoes-eg": "/assets/themes/men-shoes-eg/preview.png",
  "khemet-luxe-eg":
    "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=1400",
  "khemet-luxe-v2":
    "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=1400",
  "khemet-general-eg":
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1400",
  "khemet-fashion-eg":
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=1400",
  "pc-hub-eg": "/assets/themes/pc-hub-eg/preview.svg",
  "rose-boutique-eg": "/assets/themes/rose-boutique-eg/preview.svg",
  "vela-fashion-eg": "/assets/themes/vela-fashion-eg/preview.png",
  "fitting-room-studio":
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=1600",
  "fastly-eg": "/assets/themes/fastly-eg/preview.png",
  "airlume-ai": "/assets/themes/airlume-ai/preview.png",
  "elessi-carry-lane": "/assets/themes/elessi-carry-lane/preview.svg",
  "elessi-pedal-lab": "/assets/themes/elessi-pedal-lab/preview.svg",
  "elessi-harvest-fold": "/assets/themes/elessi-harvest-fold/preview.svg",
  "elessi-signal-deck": "/assets/themes/elessi-signal-deck/preview.svg",
  "elessi-glow-routine": "/assets/themes/elessi-glow-routine/preview.svg",
  "elessi-gem-atelier": "/assets/themes/elessi-gem-atelier/preview.svg",
  "elessi-tail-supply": "/assets/themes/elessi-tail-supply/preview.svg",
  "elessi-chrono-gallery": "/assets/themes/elessi-chrono-gallery/preview.svg",
  "elessi-garage-fit": "/assets/themes/elessi-garage-fit/preview.svg",
  "elessi-sprout-room": "/assets/themes/elessi-sprout-room/preview.svg",
  "nova-mobile": "/images/storefront-previews/nova-mobile.png",
  "pharmacy-demo":
    "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=1200&q=80",
  pawsome: "/assets/themes/elessi-tail-supply/play-dog.jpg",
  "velvet-glow": "/assets/themes/elessi-glow-routine/flatlay-b.jpg",
  "ink-paper":
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1400&q=80",
  "bloom-studio":
    "https://images.unsplash.com/photo-1468327768560-75b778cbb551?auto=format&fit=crop&w=1400&q=80",
  "iron-forge":
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80",
  opulence: "/assets/themes/elessi-gem-atelier/jewelry-box-assortment.jpg",
  "turbo-parts": "/assets/themes/elessi-garage-fit/engine-bay.jpg",
  crafted: "/assets/themes/aura-chic/artisan.png",
  "fresh-cart": "/assets/themes/elessi-harvest-fold/hero-market.jpg",
  "skill-lab": "/assets/themes/pc-hub-eg/workbook-14-air.jpg",
  "nile-elegance-eg":
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&q=80&w=1600",
  "zen-organic":
    "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&q=80&w=1400",
  "baladi-market-eg":
    "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&q=80&w=1600&q=80",
  "butcher-shop-eg":
    "https://images.unsplash.com/photo-1603048297172-c92544798d5e?auto=format&fit=crop&w=1600&q=80",
  "soft-graceful":
    "https://cdn.shopify.com/theme-store/kgt7iqquyknadz55jw25b59gbxc6.jpg",
  "allure":
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=1600",
  "redline-auto":
    "https://cdn.shopify.com/s/files/1/0721/6640/8252/files/80_2437ebe3-f884-4c9b-911f-7e65d195688f.png?v=1787709797",
};

const RASTER_THEME_PREVIEW_PATTERN =
  /\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i;
const VECTOR_THEME_PREVIEW_PATTERN = /\.svg(?:[?#].*)?$/i;
const LOCAL_THEME_PREVIEW_PATTERN = /\/assets\/themes\//i;
const PLACEHOLDER_THEME_PREVIEW_PATTERN = /\/placeholders\//i;
const KNOWN_REMOTE_THEME_PREVIEW_HOSTS = [
  "images.unsplash.com",
  "cdn.shopify.com",
];

const hasTextValue = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isKnownRemoteThemePreview = (value: string): boolean =>
  KNOWN_REMOTE_THEME_PREVIEW_HOSTS.some((host) => value.includes(host));

const isThemeImageReference = (value: unknown): value is string => {
  if (!hasTextValue(value)) {
    return false;
  }

  const normalized = value.trim();
  return (
    RASTER_THEME_PREVIEW_PATTERN.test(normalized) ||
    VECTOR_THEME_PREVIEW_PATTERN.test(normalized) ||
    isKnownRemoteThemePreview(normalized)
  );
};

const isRasterThemePreviewImage = (value: unknown): value is string => {
  if (!hasTextValue(value)) {
    return false;
  }

  const normalized = value.trim();
  return (
    RASTER_THEME_PREVIEW_PATTERN.test(normalized) ||
    isKnownRemoteThemePreview(normalized)
  );
};

const isVectorThemePreviewImage = (value: unknown): value is string =>
  hasTextValue(value) && VECTOR_THEME_PREVIEW_PATTERN.test(value.trim());

const isPlaceholderThemePreviewImage = (value: unknown): value is string =>
  hasTextValue(value) && PLACEHOLDER_THEME_PREVIEW_PATTERN.test(value.trim());

const isManagedLocalThemePreviewImage = (value: unknown): value is string =>
  hasTextValue(value) && LOCAL_THEME_PREVIEW_PATTERN.test(value.trim());

const appendThemePreviewCandidate = (
  bucket: string[],
  value: unknown,
): void => {
  if (!isThemeImageReference(value)) {
    return;
  }

  const candidate = value.trim();
  if (!bucket.includes(candidate)) {
    bucket.push(candidate);
  }
};

const collectThemePreviewCandidates = (
  value: unknown,
  bucket: string[],
  visited = new Set<unknown>(),
): void => {
  if (Array.isArray(value)) {
    value.forEach((item) =>
      collectThemePreviewCandidates(item, bucket, visited),
    );
    return;
  }

  if (!value || typeof value !== "object" || visited.has(value)) {
    return;
  }

  visited.add(value);

  const record = value as Record<string, unknown>;
  const prioritizedImageKeys = [
    "backgroundImage",
    "panelImage",
    "heroImage",
    "coverImage",
    "imageUrl",
    "image",
    "src",
    "thumbnail",
    "poster",
  ];
  const prioritizedNestedKeys = [
    "slides",
    "collections",
    "cards",
    "items",
    "products",
    "categories",
    "gallery",
    "images",
    "media",
    "banners",
    "tiles",
  ];

  prioritizedImageKeys.forEach((key) =>
    appendThemePreviewCandidate(bucket, record[key]),
  );
  prioritizedNestedKeys.forEach((key) =>
    collectThemePreviewCandidates(record[key], bucket, visited),
  );

  Object.entries(record).forEach(([key, nestedValue]) => {
    if (
      prioritizedImageKeys.includes(key) ||
      prioritizedNestedKeys.includes(key)
    ) {
      return;
    }

    if (typeof nestedValue === "string") {
      appendThemePreviewCandidate(bucket, nestedValue);
      return;
    }

    collectThemePreviewCandidates(nestedValue, bucket, visited);
  });
};

const resolveStorefrontThemePreviewImage = (
  themeId: string,
  theme:
    | {
        preview?: { imageUrl?: unknown } | null;
        pages?: Record<string, { sections?: unknown[] } | undefined>;
      }
    | null
    | undefined,
): string | undefined => {
  const curatedPreviewImage: unknown = STOREFRONT_THEME_PREVIEW_IMAGES[themeId];
  const themePreviewImage = theme?.preview?.imageUrl;
  if (isRasterThemePreviewImage(curatedPreviewImage)) {
    return curatedPreviewImage.trim();
  }

  const derivedCandidates: string[] = [];
  if (theme?.pages && typeof theme.pages === "object") {
    Object.values(theme.pages).forEach((page) =>
      collectThemePreviewCandidates(page?.sections, derivedCandidates),
    );
  }

  const derivedRasterImage = derivedCandidates.find((candidate) =>
    isRasterThemePreviewImage(candidate),
  );
  if (derivedRasterImage) {
    return derivedRasterImage.trim();
  }

  if (isRasterThemePreviewImage(themePreviewImage)) {
    return themePreviewImage.trim();
  }

  if (isThemeImageReference(curatedPreviewImage)) {
    return curatedPreviewImage.trim();
  }

  if (isThemeImageReference(themePreviewImage)) {
    return themePreviewImage.trim();
  }

  return undefined;
};

const getThemeSectionCount = (
  theme:
    | { pages?: Record<string, { sections?: unknown[] } | undefined> }
    | null
    | undefined,
  pageKey: string,
): number => {
  const sections = theme?.pages?.[pageKey]?.sections;
  return Array.isArray(sections) ? sections.length : 0;
};

const DEFAULT_STOREFRONT_THEME_CATALOG_CATEGORY: StorefrontThemeCategoryMeta = {
  primary: {
    id: "general",
    label: "عام",
  },
  secondary: {
    id: "general-store",
    label: "متجر عام",
  },
};

const buildStorefrontThemePresetCatalogItem = (
  themeId: string,
  currentThemeId = DEFAULT_STOREFRONT_THEME_ID,
): StorefrontThemeCatalogItem | null => {
  if (!STOREFRONT_THEME_PRESETS[themeId]) {
    return null;
  }

  const theme = getStorefrontThemePreset(themeId);

  return {
    id: theme.id,
    themeId: theme.id,
    slug: theme.id,
    appId: null,
    name: theme.name,
    description:
      STOREFRONT_THEME_DESCRIPTIONS[theme.id] ||
      "Preset رسمي للـ storefront.",
    category: getStorefrontThemeCategoryMeta(theme.id),
    pricingModel: "FREE",
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: "EGP",
    isActive: true,
    isPublic: true,
    isFeatured: theme.id === DEFAULT_STOREFRONT_THEME_ID,
    isDefaultTheme: theme.id === DEFAULT_STOREFRONT_THEME_ID,
    isOwned: currentThemeId === theme.id,
    isCurrentTheme: currentThemeId === theme.id,
    canSelect: currentThemeId === theme.id,
    canActivate: currentThemeId !== theme.id,
    canPurchase: false,
    requiresPurchase: false,
    requiresActivation: currentThemeId !== theme.id,
    trialDays: 0,
    installationId: null,
    installationStatus: currentThemeId === theme.id ? "ACTIVE" : null,
    activePricingModel: currentThemeId === theme.id ? "FREE" : null,
    trialEndsAt: null,
    validUntil: null,
    nextBillingAt: null,
    preview: {
      colors: [
        theme?.tokens?.colors?.primary,
        theme?.tokens?.colors?.secondary,
        theme?.tokens?.colors?.accent,
      ].filter(Boolean),
      imageUrl: resolveStorefrontThemePreviewImage(theme.id, theme),
    },
    pageStats: {
      homeSections: getThemeSectionCount(theme, "home"),
      shopSections: getThemeSectionCount(theme, "shop"),
      checkoutSections: getThemeSectionCount(theme, "checkout"),
      pdpSections: getThemeSectionCount(theme, "pdp"),
      cartSections: getThemeSectionCount(theme, "cart"),
      totalSections:
        getThemeSectionCount(theme, "home") +
        getThemeSectionCount(theme, "shop") +
        getThemeSectionCount(theme, "checkout") +
        getThemeSectionCount(theme, "pdp") +
        getThemeSectionCount(theme, "cart"),
    },
    usageStats: {
      installations: 0,
      activeInstallations: 0,
      purchases: 0,
      currentCompanies: 0,
      installCount: 0,
    },
    features: {},
  };
};

const buildUnknownStorefrontThemeCatalogItem = (
  themeId: string,
  currentThemeId = "",
): StorefrontThemeCatalogItem => {
  const resolvedThemeId = themeId || "unknown-theme";
  const isCurrentTheme = currentThemeId === resolvedThemeId;

  return {
    id: resolvedThemeId,
    themeId: resolvedThemeId,
    slug: resolvedThemeId,
    appId: null,
    name: resolvedThemeId,
    description: "قالب متجر غير مسجل محليًا.",
    category: DEFAULT_STOREFRONT_THEME_CATALOG_CATEGORY,
    pricingModel: "FREE",
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: "EGP",
    isActive: true,
    isPublic: true,
    isFeatured: false,
    isDefaultTheme: false,
    isOwned: isCurrentTheme,
    isCurrentTheme,
    canSelect: isCurrentTheme,
    canActivate: !isCurrentTheme,
    canPurchase: false,
    requiresPurchase: false,
    requiresActivation: !isCurrentTheme,
    trialDays: 0,
    installationId: null,
    installationStatus: isCurrentTheme ? "ACTIVE" : null,
    activePricingModel: isCurrentTheme ? "FREE" : null,
    trialEndsAt: null,
    validUntil: null,
    nextBillingAt: null,
    preview: {
      colors: [],
      imageUrl: "",
    },
    pageStats: {
      homeSections: 0,
      shopSections: 0,
      checkoutSections: 0,
      pdpSections: 0,
      cartSections: 0,
      totalSections: 0,
    },
    usageStats: {
      installations: 0,
      activeInstallations: 0,
      purchases: 0,
      currentCompanies: 0,
      installCount: 0,
    },
    features: {},
  };
};

const resolveStorefrontThemeCatalogDefaults = (
  themeId: string,
  currentThemeId = "",
): StorefrontThemeCatalogItem =>
  buildStorefrontThemePresetCatalogItem(themeId, currentThemeId) ||
  buildUnknownStorefrontThemeCatalogItem(themeId, currentThemeId);

export const buildStorefrontThemePresetCatalog = (
  currentThemeId = DEFAULT_STOREFRONT_THEME_ID,
): StorefrontThemeCatalogItem[] =>
  getStorefrontThemePresetIds()
    .map((themeId) =>
      buildStorefrontThemePresetCatalogItem(themeId, currentThemeId),
    )
    .filter((item): item is StorefrontThemeCatalogItem => Boolean(item));

const toSafeNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeStorefrontThemeCategory = (
  payload: unknown,
  fallback: StorefrontThemeCategoryMeta,
): StorefrontThemeCategoryMeta => {
  if (!isRecord(payload)) {
    return fallback;
  }

  const primary = isRecord(payload["primary"]) ? payload["primary"] : {};
  const secondary = isRecord(payload["secondary"]) ? payload["secondary"] : {};

  return {
    primary: {
      id:
        typeof primary["id"] === "string" && primary["id"].trim()
          ? primary["id"].trim()
          : fallback.primary.id,
      label:
        typeof primary["label"] === "string" && primary["label"].trim()
          ? primary["label"].trim()
          : fallback.primary.label,
    },
    secondary: {
      id:
        typeof secondary["id"] === "string" && secondary["id"].trim()
          ? secondary["id"].trim()
          : fallback.secondary.id,
      label:
        typeof secondary["label"] === "string" && secondary["label"].trim()
          ? secondary["label"].trim()
          : fallback.secondary.label,
    },
  };
};

export const normalizeStorefrontThemeCatalogItem = (
  payload: Partial<StorefrontThemeCatalogItem> & Record<string, unknown>,
  currentThemeId = "",
): StorefrontThemeCatalogItem => {
  const requestedThemeId = String(
    payload.themeId || payload.id || payload.slug || "",
  ).trim();
  const defaults = resolveStorefrontThemeCatalogDefaults(
    requestedThemeId,
    currentThemeId,
  );
  const preview = isRecord(payload.preview) ? payload.preview : null;
  const pageStats = isRecord(payload.pageStats) ? payload.pageStats : null;
  const usageStats = isRecord(payload.usageStats) ? payload.usageStats : null;
  const previewColors = preview?.["colors"];
  const previewImageUrl = preview?.["imageUrl"];
  const themeId = requestedThemeId || defaults.themeId;
  const normalizedPreviewImageUrl = hasTextValue(previewImageUrl)
    ? previewImageUrl.trim()
    : "";
  const shouldUsePresetPreviewImage =
    isRasterThemePreviewImage(defaults.preview.imageUrl) &&
    ((isVectorThemePreviewImage(normalizedPreviewImageUrl) &&
      (isManagedLocalThemePreviewImage(normalizedPreviewImageUrl) ||
        isPlaceholderThemePreviewImage(normalizedPreviewImageUrl))) ||
      (isPlaceholderThemePreviewImage(normalizedPreviewImageUrl) &&
        normalizedPreviewImageUrl !== defaults.preview.imageUrl));

  return {
    ...defaults,
    ...payload,
    id: themeId || defaults.id,
    themeId: themeId || defaults.themeId,
    slug:
      String(payload.slug || themeId || defaults.slug).trim() || defaults.slug,
    name: String(payload.name || defaults.name).trim() || defaults.name,
    description:
      String(payload.description || defaults.description).trim() ||
      defaults.description,
    category: normalizeStorefrontThemeCategory(
      payload.category,
      defaults.category,
    ),
    pricingModel:
      String(payload.pricingModel || defaults.pricingModel).toUpperCase() ===
      "ONE_TIME"
        ? "ONE_TIME"
        : String(
              payload.pricingModel || defaults.pricingModel,
            ).toUpperCase() === "SUBSCRIPTION"
          ? "ONE_TIME"
          : "FREE",
    monthlyPrice: toSafeNumber(payload.monthlyPrice, defaults.monthlyPrice),
    yearlyPrice: toSafeNumber(payload.yearlyPrice, defaults.yearlyPrice),
    currency: String(payload.currency || defaults.currency).trim() || "EGP",
    isActive:
      typeof payload.isActive === "boolean"
        ? payload.isActive
        : defaults.isActive,
    isPublic:
      typeof payload.isPublic === "boolean"
        ? payload.isPublic
        : defaults.isPublic,
    isFeatured:
      typeof payload.isFeatured === "boolean"
        ? payload.isFeatured
        : defaults.isFeatured,
    isDefaultTheme:
      typeof payload.isDefaultTheme === "boolean"
        ? payload.isDefaultTheme
        : defaults.isDefaultTheme || false,
    isOwned:
      typeof payload.isOwned === "boolean" ? payload.isOwned : defaults.isOwned,
    isCurrentTheme:
      typeof payload.isCurrentTheme === "boolean"
        ? payload.isCurrentTheme
        : currentThemeId === themeId,
    canSelect:
      typeof payload.canSelect === "boolean"
        ? payload.canSelect
        : defaults.canSelect,
    canActivate:
      typeof payload.canActivate === "boolean"
        ? payload.canActivate
        : defaults.canActivate,
    canPurchase:
      typeof payload.canPurchase === "boolean"
        ? payload.canPurchase
        : defaults.canPurchase,
    requiresPurchase:
      typeof payload.requiresPurchase === "boolean"
        ? payload.requiresPurchase
        : defaults.requiresPurchase,
    requiresActivation:
      typeof payload.requiresActivation === "boolean"
        ? payload.requiresActivation
        : defaults.requiresActivation,
    trialDays: Math.max(0, toSafeNumber(payload.trialDays, defaults.trialDays)),
    installationId:
      typeof payload.installationId === "string" &&
      payload.installationId.trim()
        ? payload.installationId.trim()
        : defaults.installationId,
    installationStatus:
      typeof payload.installationStatus === "string" &&
      payload.installationStatus.trim()
        ? payload.installationStatus.trim().toUpperCase()
        : defaults.installationStatus,
    activePricingModel:
      String(
        payload.activePricingModel || defaults.activePricingModel,
      ).toUpperCase() === "ONE_TIME"
        ? "ONE_TIME"
        : String(
              payload.activePricingModel || defaults.activePricingModel,
            ).toUpperCase() === "SUBSCRIPTION"
          ? "ONE_TIME"
          : String(
                payload.activePricingModel || defaults.activePricingModel,
              ).toUpperCase() === "FREE"
            ? "FREE"
            : null,
    trialEndsAt:
      typeof payload.trialEndsAt === "string" && payload.trialEndsAt.trim()
        ? payload.trialEndsAt
        : defaults.trialEndsAt,
    validUntil:
      typeof payload.validUntil === "string" && payload.validUntil.trim()
        ? payload.validUntil
        : defaults.validUntil,
    nextBillingAt:
      typeof payload.nextBillingAt === "string" && payload.nextBillingAt.trim()
        ? payload.nextBillingAt
        : defaults.nextBillingAt,
    preview: {
      colors: Array.isArray(previewColors)
        ? previewColors
            .map((value: string) => String(value || "").trim())
            .filter(Boolean)
        : defaults.preview.colors,
      imageUrl: shouldUsePresetPreviewImage
        ? defaults.preview.imageUrl
        : isRasterThemePreviewImage(normalizedPreviewImageUrl)
          ? normalizedPreviewImageUrl
          : normalizedPreviewImageUrl || defaults.preview.imageUrl,
    },
    pageStats: {
      homeSections: toSafeNumber(
        pageStats?.["homeSections"],
        defaults.pageStats.homeSections,
      ),
      shopSections: toSafeNumber(
        pageStats?.["shopSections"],
        defaults.pageStats.shopSections,
      ),
      checkoutSections: toSafeNumber(
        pageStats?.["checkoutSections"],
        defaults.pageStats.checkoutSections,
      ),
      pdpSections: toSafeNumber(
        pageStats?.["pdpSections"],
        defaults.pageStats.pdpSections,
      ),
      cartSections: toSafeNumber(
        pageStats?.["cartSections"],
        defaults.pageStats.cartSections,
      ),
      totalSections: toSafeNumber(
        pageStats?.["totalSections"],
        defaults.pageStats.totalSections,
      ),
    },
    usageStats: {
      installations: toSafeNumber(
        usageStats?.["installations"],
        defaults.usageStats?.installations || 0,
      ),
      activeInstallations: toSafeNumber(
        usageStats?.["activeInstallations"],
        defaults.usageStats?.activeInstallations || 0,
      ),
      purchases: toSafeNumber(
        usageStats?.["purchases"],
        defaults.usageStats?.purchases || 0,
      ),
      currentCompanies: toSafeNumber(
        usageStats?.["currentCompanies"],
        defaults.usageStats?.currentCompanies || 0,
      ),
      installCount: toSafeNumber(
        usageStats?.["installCount"],
        defaults.usageStats?.installCount || 0,
      ),
    },
    features: isRecord(payload.features)
      ? (payload.features as Record<string, unknown>)
      : defaults.features,
  };
};

export const normalizeStorefrontThemeCatalogItems = (
  payload: Array<Partial<StorefrontThemeCatalogItem> & Record<string, unknown>>,
  currentThemeId = "",
): StorefrontThemeCatalogItem[] =>
  payload.map((item) =>
    normalizeStorefrontThemeCatalogItem(item, currentThemeId),
  );
