import type {
  StorefrontPageConfig,
  StorefrontSectionConfig,
  StorefrontTheme,
} from '../types/theme.types';
import { shouldInjectCheckoutCartItems } from './checkoutPageSettings';

export const TARGET_THEME_EXPERIENCE_IDS = [
  'electronics-demo',
  'cafe-demo',
  'furniture-demo',
  'max-care-go',
  'elessi-carry-lane',
  'elessi-pedal-lab',
  'elessi-harvest-fold',
  'elessi-signal-deck',
  'elessi-tail-supply',
  'pawsome',
  'velvet-glow',
  'ink-paper',
  'bloom-studio',
  'iron-forge',
  'opulence',
  'turbo-parts',
  'crafted',
  'fresh-cart',
  'skill-lab',
] as const;

type TargetThemeExperienceId = (typeof TARGET_THEME_EXPERIENCE_IDS)[number];

type ThemePageOverrides = Partial<StorefrontTheme['pages']>;

const section = (
  type: string,
  settings?: Record<string, unknown>,
  variant?: string,
): StorefrontSectionConfig => ({
  type,
  ...(variant ? { variant } : {}),
  ...(settings ? { settings } : {}),
});

const hero = (variant: string, settings: Record<string, unknown>) =>
  section('hero-banner', settings, variant);

const commandBar = (
  settings: Record<string, unknown>,
  variant = 'default-discovery',
) => section('shop-command-bar', settings, variant);

const grid = (
  title: string,
  variant: string,
  settings: Record<string, unknown> = {},
) =>
  section(
    'product-grid',
    {
      title,
      limit: 12,
      ...settings,
    },
    variant,
  );

const promoRail = (
  settings: Record<string, unknown>,
  variant = 'trust-rail',
) => section('shop-promo-rail', settings, variant);

const promoStrip = (settings: Record<string, unknown>) =>
  section('promo-strip', settings);

const collectionsSection = (
  title: string,
  variant: string,
  settings: Record<string, unknown> = {},
) =>
  section(
    'featured-collections',
    {
      title,
      limit: 6,
      ...settings,
    },
    variant,
  );

const offerBento = (
  settings: Record<string, unknown>,
  variant = 'campaign-stack',
) => section('offer-bento', settings, variant);

const shoppingIntents = (settings: Record<string, unknown>) =>
  section('shopping-intents', settings);

const featuresBar = (
  settings: Record<string, unknown>,
  variant = 'service-clarity',
) => section('features-bar', settings, variant);

const newsletter = (settings: Record<string, unknown>, variant = 'minimal') =>
  section('newsletter', settings, variant);

const infoContent = (settings: Record<string, unknown>) =>
  section('info-content', settings);

const productGallery = (variant = 'standard') =>
  section('product-gallery', undefined, variant);

const productInfoSection = (
  settings: Record<string, unknown>,
  variant = 'standard',
) => section('product-info', settings, variant);

const conversionStackSection = (
  settings: Record<string, unknown>,
  variant = 'balanced',
) => section('conversion-stack', settings, variant);

const boughtTogetherSection = (
  settings: Record<string, unknown>,
  variant = 'stacked',
) => section('bought-together', settings, variant);

const relatedProductsSection = (
  settings: Record<string, unknown>,
  variant = 'standard',
) => section('related-products', settings, variant);

const reviewsSection = (
  settings: Record<string, unknown>,
  variant = 'standard',
) => section('reviews', settings, variant);

const cartItems = (
  settings: Record<string, unknown>,
  variant = 'standard',
) => section('cart-items', settings, variant);

const orderSummarySection = (
  settings: Record<string, unknown>,
  variant = 'standard',
) => section('order-summary', settings, variant);

const checkoutForm = (
  settings: Record<string, unknown>,
  variant = 'standard',
) => section('checkout-form', settings, variant);

const payment = (settings: Record<string, unknown>, variant = 'cards') =>
  section('payment', settings, variant);

const orderConfirmation = (
  settings: Record<string, unknown>,
  variant?: string,
) => section('order-confirmation', settings, variant);

const conversionPage = (
  sections: StorefrontPageConfig['sections'],
  overrides: Partial<StorefrontPageConfig> = {},
): StorefrontPageConfig => ({
  sections,
  pageGoal: 'conversion',
  compositionPolicy: {
    pageGoal: 'conversion',
    preserveManualOrder: true,
    enforceTrustSignals: true,
  },
  ...overrides,
});

const discoveryPage = (
  sections: StorefrontPageConfig['sections'],
  overrides: Partial<StorefrontPageConfig> = {},
): StorefrontPageConfig => ({
  sections,
  pageGoal: 'discovery',
  compositionPolicy: {
    pageGoal: 'discovery',
    preserveManualOrder: true,
    enforceTrustSignals: true,
  },
  ...overrides,
});

const trustPage = (
  sections: StorefrontPageConfig['sections'],
  overrides: Partial<StorefrontPageConfig> = {},
): StorefrontPageConfig => ({
  sections,
  pageGoal: 'trust',
  compositionPolicy: {
    pageGoal: 'trust',
    preserveManualOrder: true,
    enforceTrustSignals: true,
  },
  ...overrides,
});

const CYBER_GEAR_PREVIEW_COLLECTIONS = [
  {
    id: 'battlestation-core',
    title: 'باقات Battlestation',
    subtitle: 'شاشات وكيبورد وماوس وتركيبات أسرع لبداية setup كامل.',
    image: '/placeholders/cyber-gear/battlestation-core.svg',
    link: '/collections',
  },
  {
    id: 'streaming-rig',
    title: 'ركنة Streaming',
    subtitle: 'ميكروفونات وكاميرات وإضاءة أسرع للبث وصناعة المحتوى.',
    image: '/placeholders/cyber-gear/streaming-rig.svg',
    link: '/shop?sort=popular',
  },
  {
    id: 'desk-command',
    title: 'تنظيم المكتب',
    subtitle: 'ستاندات وماتات وقواعد ترفع العملية والشكل معًا.',
    image: '/placeholders/cyber-gear/desk-command.svg',
    link: '/shop',
  },
  {
    id: 'rgb-upgrades',
    title: 'ترقيات RGB',
    subtitle: 'إضاءة وخامات ولمسات بصرية ترفع الجو العام للركنة بسرعة.',
    image: '/placeholders/cyber-gear/rgb-upgrades.svg',
    link: '/sale',
  },
] as const;

const ELECTRONICS_DEMO_PREVIEW_COLLECTIONS = [
  {
    id: 'creator-laptops',
    title: 'لابتوبات الإنتاجية',
    subtitle: 'أجهزة أخف للكتابة والتصميم والعمل اليومي بسكة أوضح.',
    image: '/placeholders/cyber-gear/battlestation-core.svg',
    link: '/shop?category=laptops',
  },
  {
    id: 'pro-displays',
    title: 'شاشات ومكاتب',
    subtitle: 'شاشات ودُكّات وملحقات ترفع تجربة المكتب والـ desk setup.',
    image: '/placeholders/cyber-gear/streaming-rig.svg',
    link: '/shop?category=monitors',
  },
  {
    id: 'creator-audio',
    title: 'صوت واجتماعات',
    subtitle: 'سماعات ومايكات وإكسسوارات اتصال أوضح للاجتماعات والبث.',
    image: '/placeholders/cyber-gear/desk-command.svg',
    link: '/shop?sort=popular',
  },
  {
    id: 'upgrade-deals',
    title: 'عروض الترقية',
    subtitle: 'صفقات أسرع على الملحقات والترقيات التي تُشترى معًا باستمرار.',
    image: '/placeholders/cyber-gear/rgb-upgrades.svg',
    link: '/sale',
  },
] as const;

const CAFE_DEMO_PREVIEW_COLLECTIONS = [
  {
    id: 'coffee-beans',
    title: 'حبوب القهوة',
    subtitle: 'تحميصات يومية للإسبريسو والفلتر بطعم أوضح من أول طلب.',
    image:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
    link: '/shop?category=beans',
  },
  {
    id: 'cold-brews',
    title: 'المشروبات الباردة',
    subtitle: 'حلول سريعة للمكتب والمشاوير بطابع أخف وتجربة أكثر ثباتًا.',
    image:
      'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1200&q=80',
    link: '/shop?category=cold-brews',
  },
  {
    id: 'pastries',
    title: 'المخبوزات',
    subtitle: 'إضافات طازجة تكمل الطلب بدل أن تبقى اقتراحًا عامًا بعيدًا.',
    image:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
    link: '/shop?category=pastries',
  },
  {
    id: 'brew-tools',
    title: 'أدوات التحضير',
    subtitle: 'طقم البداية والإضافات العملية لركنة القهوة في البيت.',
    image:
      'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=1200&q=80',
    link: '/shop?category=brew-tools',
  },
] as const;

const FURNITURE_DEMO_PREVIEW_COLLECTIONS = [
  {
    id: 'living-room',
    title: 'غرفة المعيشة',
    subtitle: 'كنب وكراسي أساسية تبني إحساس الركنة من أول قطعة.',
    image:
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80',
    link: '/shop?category=living-room',
  },
  {
    id: 'tables',
    title: 'طاولات',
    subtitle: 'طاولات قهوة وسفرة تكمل المشهد وتختصر قرار التنسيق.',
    image:
      'https://images.unsplash.com/photo-1617806118233-f8e137453f9c?auto=format&fit=crop&w=1200&q=80',
    link: '/shop?category=tables',
  },
  {
    id: 'lighting',
    title: 'إضاءة',
    subtitle: 'أباجورات ولمسات ضوئية ترفع حضور القطعة داخل البيت.',
    image:
      'https://images.unsplash.com/photo-1534073828943-f801091bb18c?auto=format&fit=crop&w=1200&q=80',
    link: '/shop?category=lighting',
  },
  {
    id: 'decor',
    title: 'ديكور',
    subtitle: 'مرايات وإكسسوارات تساعد العميل يتخيل البيت جاهزًا.',
    image:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
    link: '/shop?category=decor',
  },
] as const;

const styleStoreAsset = (file: string) => `/assets/themes/style-store-eg/${file}`;
const cutlineThemeAsset = (file: string) => `/assets/themes/cutline-club/${file}`;
const cutlineProductAsset = (file: string) =>
  `/assets/themes/cutline-club/products/${file}`;

const PHARMACY_DEMO_PREVIEW_COLLECTIONS = [
  {
    id: 'family-care',
    title: 'العناية اليومية',
    subtitle: 'أساسيات البيت اليومية من العناية والوقاية والاحتياجات السريعة.',
    image:
      'https://images.unsplash.com/photo-1522338140262-f46f5913618a?auto=format&fit=crop&w=800&q=80',
    link: '/shop?category=personal-care',
  },
  {
    id: 'rx-support',
    title: 'رفع الروشتة',
    subtitle: 'لو الطلب مرتبط بوصفة أو بديل، ابدأ من مسار أوضح وأسرع للمراجعة.',
    image:
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
    link: '/prescription',
  },
  {
    id: 'supplements',
    title: 'فيتامينات ومكملات',
    subtitle: 'احتياجات الدعم اليومي والطاقة والمناعة بتجميع أبسط للفئات.',
    image:
      'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=800&q=80',
    link: '/shop?category=vitamins',
  },
  {
    id: 'medical-devices',
    title: 'أجهزة ومتابعة منزلية',
    subtitle: 'قياس ضغط وسكر وحرارة وأدوات صغيرة تحتاج شرحًا أوضح قبل الطلب.',
    image:
      'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=800&q=80',
    link: '/shop?category=medical-devices',
  },
] as const;

const MAX_CARE_GO_PREVIEW_COLLECTIONS = [
  {
    id: 'vitamins',
    title: 'الفيتامينات اليومية',
    subtitle:
      'مكملات للطاقة والمناعة في رف واضح يعيد قرار الشراء المتكرر بسرعة.',
    image:
      'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=1200&q=80',
    link: '/shop?category=vitamins',
  },
  {
    id: 'personal-care',
    title: 'العناية الشخصية',
    subtitle: 'غسول، واقي، وروتين يومي بمنتجات سريعة الوصول من أول Scroll.',
    image:
      'https://images.unsplash.com/photo-1522338140262-f46f5913618a?auto=format&fit=crop&w=1200&q=80',
    link: '/shop?category=personal-care',
  },
  {
    id: 'medical-devices',
    title: 'الأجهزة المنزلية',
    subtitle: 'أجهزة قياس ومتابعة تحتاج وصفًا أوضح قبل الإضافة والدفع.',
    image:
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80',
    link: '/shop?category=medical-devices',
  },
  {
    id: 'first-aid',
    title: 'الإسعافات الأولية',
    subtitle: 'أساسيات الطوارئ المنزلية والسفر في مدخل سريع ومنظم.',
    image:
      'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=1200&q=80',
    link: '/shop?category=first-aid',
  },
] as const;

const ELESSI_CARRY_LANE_PREVIEW_COLLECTIONS = [
  {
    id: 'daily-bags',
    title: 'الشنط اليومية',
    subtitle: 'توت وكتفيات للحركة اليومية والاجتماعات والمشاوير.',
    image: '/assets/themes/elessi-carry-lane/tote.jpg',
    link: '/shop?category=bags',
  },
  {
    id: 'travel-bags',
    title: 'شنط السفر والتنقل',
    subtitle: 'موديلات أخف للرحلات القصيرة والتنقل بين اليوم الطويل والسفر.',
    image: '/assets/themes/elessi-carry-lane/marmont.jpg',
    link: '/shop?category=travel-bags',
  },
  {
    id: 'gift-picks',
    title: 'هدايا ولمسات صغيرة',
    subtitle: 'سكارف ومحافظ وإضافات خفيفة تكمل الهدية أو الطلب السريع.',
    image: '/assets/themes/elessi-carry-lane/sylvie.jpg',
    link: '/shop?category=scarves',
  },
  {
    id: 'wallets-belts',
    title: 'محافظ وأحزمة',
    subtitle: 'إضافات عملية ترفع قيمة السلة من غير تشتيت أو ازدحام.',
    image: '/assets/themes/elessi-carry-lane/dionysus.jpg',
    link: '/shop?category=wallets',
  },
] as const;

const ELESSI_PEDAL_LAB_PREVIEW_COLLECTIONS = [
  {
    id: 'city-bikes',
    title: 'دراجات المدينة',
    subtitle: 'موديلات مريحة للتنقل اليومي والشوارع السريعة.',
    image: '/assets/themes/elessi-pedal-lab/hero-city-stage.jpg',
    link: '/shop?category=city-bikes',
  },
  {
    id: 'road-fitness',
    title: 'Road & fitness',
    subtitle: 'هياكل أخف للسرعة واللياقة والطريق الطويل.',
    image: '/assets/themes/elessi-pedal-lab/peloton-stage.jpg',
    link: '/shop?category=road-fitness',
  },
  {
    id: 'helmets-lighting',
    title: 'خوذات وإضاءة',
    subtitle: 'الأمان والرؤية وكل ما يكمل الرحلة من أول طلب.',
    image: '/assets/themes/elessi-pedal-lab/helmet-crop.jpg',
    link: '/shop?category=helmets-lighting',
  },
  {
    id: 'service-upgrades',
    title: 'قطع وصيانة',
    subtitle: 'مضخات وإطارات وترقيات تحتاجها بسرعة قبل النزول.',
    image: '/assets/themes/elessi-pedal-lab/trail-forest-stage.jpg',
    link: '/shop?category=service-upgrades',
  },
] as const;

const ELESSI_HARVEST_FOLD_PREVIEW_COLLECTIONS = [
  {
    id: 'leafy-greens',
    title: 'ورقيات ومطبخ',
    subtitle: 'خضار يومي وأعشاب الطبخ في رف سريع وواضح.',
    image: '/assets/themes/elessi-harvest-fold/hero-market.jpg',
    link: '/shop?category=leafy-greens',
  },
  {
    id: 'fruit-boxes',
    title: 'صناديق فاكهة',
    subtitle: 'حمضيات وفاكهة مرتبة للبيت والضيافة.',
    image: '/assets/themes/elessi-harvest-fold/fruit-crate.jpg',
    link: '/shop?category=fruit-boxes',
  },
  {
    id: 'pantry-basics',
    title: 'مونة وفطور',
    subtitle: 'جرانولا ودبس وإضافات تقفل سلة الصباح بسرعة.',
    image: '/assets/themes/elessi-harvest-fold/breakfast-jar.jpg',
    link: '/shop?category=pantry-basics',
  },
  {
    id: 'family-crates',
    title: 'صناديق أسبوعية',
    subtitle: 'حل أسرع للطلبات العائلية المتكررة وقيمة سلة أعلى.',
    image: '/assets/themes/elessi-harvest-fold/crate-detail.jpg',
    link: '/shop?category=family-crates',
  },
] as const;

const ELESSI_SIGNAL_DECK_PREVIEW_COLLECTIONS = [
  {
    id: 'ultrabooks',
    title: 'أجهزة خفيفة',
    subtitle: 'لابتوبات للشغل والدراسة والتنقل اليومي.',
    image: '/assets/themes/pc-hub-eg/workbook-14-air.jpg',
    link: '/shop?category=ultrabooks',
  },
  {
    id: 'creator-labs',
    title: 'صناعة ومحتوى',
    subtitle: 'تابلتات وأدوات تسهّل الرسم والمونتاج وصناعة المحتوى.',
    image: '/assets/themes/pc-hub-eg/creator-pro-16.jpg',
    link: '/shop?category=creator-labs',
  },
  {
    id: 'desk-gear',
    title: 'معدات مكتب',
    subtitle: 'كيبوردات، ماوسات، وحوامل مكتبية أوضح للمكتب اليومي.',
    image: '/assets/themes/pc-hub-eg/mechboard-pro.jpg',
    link: '/shop?category=desk-gear',
  },
  {
    id: 'carry-power',
    title: 'تنقل وطاقة',
    subtitle: 'شواحن ومحاور وإضافات سريعة للسفر والشغل المتحرك.',
    image: '/assets/themes/pc-hub-eg/dockstation-9in1.jpg',
    link: '/shop?category=carry-power',
  },
] as const;

const ELESSI_TAIL_SUPPLY_PREVIEW_COLLECTIONS = [
  {
    id: 'pet-food',
    title: 'طعام يومي',
    subtitle: 'طلبات متكررة أسهل في الإعادة وأوضح في الحجم والنوع.',
    image: '/assets/themes/elessi-tail-supply/dog-food-bowl.jpg',
    link: '/shop?category=pet-food',
  },
  {
    id: 'pet-play',
    title: 'لعب ونشاط',
    subtitle: 'منتجات حركة ترفع السلة بسرعة وتخدم الروتين اليومي للحيوان.',
    image: '/assets/themes/elessi-tail-supply/play-dog.jpg',
    link: '/shop?category=pet-play',
  },
  {
    id: 'pet-care',
    title: 'عناية وتنظيف',
    subtitle: 'شامبو وفرش وأدوات ثقة للاستخدام المتكرر في البيت.',
    image: '/assets/themes/elessi-tail-supply/care-pet.jpg',
    link: '/shop?category=pet-care',
  },
  {
    id: 'walk-travel',
    title: 'نزهة وخروج',
    subtitle: 'أطواق وأحزمة وإضافات تجعل الخروج أسهل وأوضح في الاختيار.',
    image: '/assets/themes/elessi-tail-supply/walk-leash-real.jpg',
    link: '/shop?category=walk-travel',
  },
] as const;

const CUTLINE_CLUB_PREVIEW_COLLECTIONS = [
  {
    id: 'club-sets',
    title: 'الأطقم',
    subtitle: 'لوكات جاهزة تخلّص القرار من أول كارت.',
    image: cutlineProductAsset('set-midnight.jpg'),
    link: '/shop?category=sets',
  },
  {
    id: 'club-layers',
    title: 'الطبقات',
    subtitle: 'أوفرشيرتس وجاكيتات خفيفة تقفل اللوك بسهولة.',
    image: cutlineProductAsset('overshirt-ink.jpg'),
    link: '/shop?category=outerwear',
  },
  {
    id: 'club-hoodies',
    title: 'الهوديز',
    subtitle: 'قطع مريحة بروح drop أوضح للمشاوير واليوم الطويل.',
    image: cutlineProductAsset('hoodie-rust.jpg'),
    link: '/shop?category=hoodies',
  },
  {
    id: 'club-bottoms',
    title: 'البناطيل',
    subtitle: 'كارجو وتراوزرز تبني نفس الإيقاع مع الطبقات الأساسية.',
    image: cutlineProductAsset('cargo-ink.jpg'),
    link: '/shop?category=bottoms',
  },
] as const;

const STYLE_STORE_PREVIEW_COLLECTIONS = [
  {
    id: 'watch-edit',
    title: 'الساعات',
    subtitle: 'قطعة صغيرة تغيّر شكل اللوك بسرعة ومن غير مجهود كبير.',
    image: styleStoreAsset('category-watches.jpg'),
    link: '/shop?category=watches',
  },
  {
    id: 'sneaker-edit',
    title: 'السنيكرز',
    subtitle: 'اختيارات هادئة للحركة اليومية والخروجات السريعة.',
    image: styleStoreAsset('products/urban-runner-1.jpg'),
    link: '/shop?category=sneakers',
  },
  {
    id: 'bag-edit',
    title: 'الشنط',
    subtitle: 'شنط صغيرة وعملية تكمل اللبس وتضيف وظيفة واضحة.',
    image: styleStoreAsset('products/amber-crossbody-1.jpg'),
    link: '/shop?category=bags',
  },
  {
    id: 'gift-edit',
    title: 'هدايا جاهزة',
    subtitle: 'بوكسات وإكسسوارات خفيفة مناسبة للإهداء السريع.',
    image: styleStoreAsset('products/bracelet-gift-set-1.jpg'),
    link: '/sale',
  },
] as const;

const THEME_PAGE_EXPERIENCE_OVERRIDES: Partial<
  Record<string, ThemePageOverrides>
> &
  Record<TargetThemeExperienceId, ThemePageOverrides> = {
  'pharmacy-demo': {
    home: discoveryPage([
      promoStrip({
        badge: 'رعاية الأسرة',
        message:
          'ابدأ من الروشتة أو الاحتياج اليومي، ثم أكمل الطلب بهدوء مع بدائل أوضح ومتابعة أسرع.',
        saleLabel: 'روشتة',
        shippingLabel: 'دعم صيدلي',
        returnLabel: 'تغليف مناسب',
        ctaText: 'ابدأ من الصيدلية',
        ctaLink: '/shop',
      }),
      hero('split-panel', {
        eyebrow: 'صيدلية أوضح للأسرة',
        title: 'الاحتياج الصحي اليومي مرتب من أول بحث حتى تأكيد الطلب',
        subtitle:
          'نسخة صيدلية هادئة تشرح الاحتياج، تدعم رفع الروشتة، وتقلل التردد قبل الإرسال.',
        ctaText: 'ابدأ من الاحتياجات اليومية',
        ctaLink: '/shop',
        secondaryCtaText: 'ارفع الروشتة',
        secondaryCtaLink: '/prescription',
        backgroundImage:
          'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=1200&q=80',
        panelImage:
          'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80',
        panelEyebrow: 'Care Guide',
        panelTitle: 'قرار هادئ قبل الإرسال',
        panelSubtitle:
          'راجع الاستخدام، التوافر، وخطوة المتابعة التالية بدل ما تدخل في رحلة طلب ملخبطة.',
        panelMetricLabel: 'استشارة',
        panelMetricValue: 'متاحة',
      }),
      shoppingIntents({
        badge: 'ابدأ من الاستخدام',
        title: 'اختاري المسار الأقرب لاحتياج البيت',
        subtitle:
          'روشتة، عناية يومية، دعم بالمكملات، أو جهاز متابعة منزلي يحتاج شرحًا أوضح.',
        items: [
          {
            eyebrow: 'Prescription',
            title: 'رفع الروشتة',
            subtitle: 'ابدئي من الوصفة أو اسألي عن البدائل قبل إغلاق الطلب.',
            link: '/prescription',
            tone: 'primary',
            chip: 'Rx',
          },
          {
            eyebrow: 'Daily Care',
            title: 'العناية اليومية',
            subtitle: 'منتجات البيت الأساسية والعناية والوقاية بسرعة أكبر.',
            link: '/shop?category=personal-care',
            tone: 'accent',
            chip: 'Care',
          },
          {
            eyebrow: 'Supplements',
            title: 'فيتامينات ومكملات',
            subtitle: 'احتياجات الطاقة والمناعة والدعم اليومي في رف أوضح.',
            link: '/shop?category=vitamins',
            tone: 'emerald',
            chip: 'Daily',
          },
          {
            eyebrow: 'Devices',
            title: 'أجهزة منزلية',
            subtitle: 'قياس سكر وضغط وحرارة مع وصف أوضح قبل الشراء.',
            link: '/shop?category=medical-devices',
            tone: 'slate',
            chip: 'Home',
          },
        ],
      }),
      collectionsSection('تسوّقي حسب نوع الاحتياج', 'fast-nav-grid', {
        subtitle:
          'مداخل أقصر للروشتة والعناية اليومية والمكملات والأجهزة التي تحتاج طمأنة أوضح.',
        ctaText: 'كل الأقسام',
        ctaLink: '/collections',
        limit: PHARMACY_DEMO_PREVIEW_COLLECTIONS.length,
        collections: PHARMACY_DEMO_PREVIEW_COLLECTIONS,
      }),
      grid('ترشيحات جاهزة للطلب اليومي', 'standard', {
        limit: 8,
        subtitle:
          'منتجات متكررة الشراء مع معلومة أوضح وسعر ظاهر حتى يبقى القرار أسهل من أول نظرة.',
      }),
      featuresBar(
        {
          title: 'طمأنة قبل الضغط على التأكيد',
          subtitle:
            'نقلنا الرسائل المهمة داخل نفس الصفحة حتى لا تبقى مخفية بعد فتح المنتج أو أثناء الدفع.',
          items: [
            {
              icon: 'shield',
              title: 'منتجات أوضح',
              description:
                'وصف أبسط للاستخدام والتغليف وما إذا كان المنتج يحتاج مراجعة قبل التنفيذ.',
            },
            {
              icon: 'clipboard',
              title: 'بدائل عند الحاجة',
              description:
                'نوضح مسار البديل أو التواصل قبل التأكيد بدل اكتشافه متأخرًا.',
            },
            {
              icon: 'truck',
              title: 'شحن مناسب',
              description:
                'رسائل أوضح حول التوصيل والتغليف للمنتجات الحساسة أو الأجهزة المنزلية.',
            },
          ],
        },
        'service-clarity',
      ),
    ]),
    shop: conversionPage(
      [
        commandBar({
          title: 'ابحثي داخل الصيدلية',
          subtitle:
            'ابحثي باسم الاحتياج أو الفئة أو نوع الاستخدام اليومي بدل التصفح العشوائي.',
          searchPlaceholder: 'ابحثي عن فيتامين أو عناية يومية أو جهاز متابعة',
          allCategoriesLabel: 'كل الأقسام',
          resultsLabel: 'منتج',
          clearButtonText: 'مسح',
          stickyLabel: 'ابدأ من الاحتياج',
        }),
        section('filters-sidebar'),
        grid('كل المنتجات الصحية', 'standard', {
          subtitle:
            'شبكة أوضح للعناية والفيتامينات والأجهزة، مع فلترة أسهل حسب نوع الاحتياج.',
        }),
        promoRail(
          {
            badge: 'Care Notes',
            title: 'رسائل الثقة أصبحت أقرب للعميل من أول صفحة',
            subtitle:
              'التغليف، التوافر، ورفع الروشتة أو سؤال الصيدلي يظهرون أثناء التصفح بدل ما يكونوا بعيدين عن قرار الشراء.',
            spotlightLabel: 'Prescription',
            spotlightTitle: 'ابدئي من الروشتة لو الاحتياج معتمد عليها',
            spotlightText:
              'لو المنتج يحتاج مراجعة أو بديل، اختصرنا الطريق بمسار واضح قبل إغلاق الطلب.',
            ctaText: 'ارفع الروشتة',
            ctaLink: '/prescription',
            trustItems:
              'بدائل أوضح|ندلّك على الخطوة التالية لو المنتج غير متاح.\nتغليف مناسب|للمنتجات الحساسة والأجهزة الصغيرة.\nتأكيد هادئ|مراجعة أوضح للعناوين والملاحظات قبل التنفيذ.',
            highlights:
              'روشتة|مدعوم\nعناية|يومية\nمتابعة|واضحة',
          },
          'trust-rail',
        ),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    pdp: conversionPage(
      [
        productGallery('stacked'),
        productInfoSection(
          {
            addToCartText: 'أضف الطلب',
            descriptionTitle: 'تفاصيل المنتج والاستخدام',
            shippingTitle: 'التوصيل والمراجعة',
            shippingText:
              'نراجع التوافر والتوصيل ونوضح إذا كان المنتج يحتاج متابعة أو استشارة قبل تنفيذ الطلب.',
            guaranteesTitle: 'قبل تأكيد الطلب',
            guaranteesSubtitle:
              'معلومات الاستخدام والتغليف والدعم الصيدلي تظهر في نفس الصفحة حتى تقل الحيرة ويزيد الاطمئنان.',
            guaranteeStyle: 'minimal',
          },
          'accordion',
        ),
        conversionStackSection(
          {
            title: 'أكملي الطلب براحة أكبر',
            subtitle:
              'اختاري الكمية ثم راجعي الشحن والطريقة المناسبة مع رسائل أوضح عن الخطوة التالية.',
          },
          'seamless',
        ),
        boughtTogetherSection(
          {
            title: 'منتجات قد تحتاجينها معه',
            subtitle: 'إضافات عملية تُطلب كثيرًا مع نفس الاحتياج الصحي أو المنزلي.',
          },
          'compact',
        ),
        relatedProductsSection(
          {
            title: 'بدائل أو منتجات قريبة',
            subtitle:
              'اقتراحات من نفس الفئة أو نفس الاستخدام تساعدك تقفلي القرار بدون خروج من الصفحة.',
          },
          'compact',
        ),
        reviewsSection(
          {
            title: 'تجارب العملاء',
            mediaTitle: 'صور من الاستخدام عند الحاجة',
            listTitle: 'مراجعات بعد الاستلام',
          },
          'compact',
        ),
      ],
      {
        layoutHint: 'product-detail',
      },
    ),
    cart: conversionPage(
      [
        cartItems(
          {
            title: 'سلة الرعاية',
            subtitle:
              'راجعي المنتجات والكميات قبل تأكيد التنفيذ، خصوصًا لو الطلب فيه احتياج متكرر أو جهاز منزلي.',
            continueShoppingText: 'أضيفي احتياجًا آخر',
            headerBadge: 'مراجعة هادئة',
            serviceHighlights: ['روشتة عند الحاجة', 'تغليف مناسب', 'متابعة واضحة'],
          },
          'nature-cart',
        ),
        orderSummarySection(
          {
            title: 'خلاصة الطلب',
            headerBadge: 'خلاصة هادئة',
            assuranceItems: [
              'مراجعة العنوان والملاحظات قبل التنفيذ',
              'توضيح الشحن والخطوة التالية بهدوء',
              'متابعة بعد الاستلام عند الحاجة',
            ],
            nextSteps: [
              'نراجع التوافر والكمية',
              'نؤكد العنوان والملاحظات',
              'نشاركك حالة التنفيذ والتوصيل',
            ],
          },
          'nature-summary',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'طلب هادئ وواضح',
          message:
            'اكتبي العنوان والملاحظات بوضوح لنجهز الطلب بشكل مناسب ونشاركك التحديثات من غير مفاجآت.',
          saleLabel: 'روشتة',
          shippingLabel: 'متابعة',
          returnLabel: 'تغليف',
          ctaText: 'العودة للصيدلية',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'مراجعة المنتجات',
            subtitle: 'تأكدي من الكميات والمنتجات قبل اعتماد الطلب النهائي.',
            continueShoppingText: 'أضيفي منتجًا آخر',
            headerBadge: 'مراجعة هادئة',
          },
          'nature-cart',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'رقم الهاتف الصحيح يساعدنا نؤكد الطلب أو نراجع أي ملاحظة قبل التنفيذ.',
            shippingTitle: 'عنوان التوصيل',
            shippingDescription:
              'اكتبي عنوانًا واضحًا لتسهيل تسليم المنتجات أو الأجهزة المنزلية بدون تأخير.',
            notesTitle: 'ملاحظات صحية أو توصيل',
            notesDescription:
              'مثل وقت مناسب للاستلام أو طلب مراجعة الروشتة أو سؤال حول بديل.',
            notesPlaceholder: 'مثال: يرجى الاتصال قبل الوصول أو مراجعة بديل متاح',
            assuranceBadge: 'إتمام هادئ',
          },
          'nature-checkout',
        ),
        payment(
          {
            title: 'اعتماد الطلب',
            subtitle:
              'الملخص النهائي واضح ويركّز على الإجمالي وطريقة الدفع ورسالة المتابعة بعد التنفيذ.',
            confirmOrderText: 'تأكيد الطلب',
            securityText: 'بياناتك محمية أثناء إتمام الطلب',
            assuranceBadge: 'مراجعة أخيرة',
            showSummaryCard: false,
          },
          'nature-payment',
        ),
        orderSummarySection(
          {
            title: 'ملخص نهائي',
            headerBadge: 'خلاصة هادئة',
          },
          'nature-summary',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Daily Care Deals',
        message:
          'عروض على الاحتياجات اليومية والمكملات والعناية والمنتجات التي تُعاد طلبها باستمرار.',
        saleLabel: 'يومي',
        shippingLabel: 'Clear',
        returnLabel: 'Bundle',
        ctaText: 'العودة للصيدلية',
        ctaLink: '/shop',
      }),
      offerBento(
        {
          badge: 'ابدئي من شكل الاحتياج',
          title: 'رتبنا الخصومات حسب سيناريو الشراء',
          subtitle:
            'روشتة، عناية يومية، دعم مناعي، أو أجهزة منزلية تحتاج قرارًا أوضح.',
          cards: [
            {
              label: 'Daily',
              title: 'عروض العناية اليومية',
              subtitle: 'منتجات متكررة الشراء بسعر أوضح وسكة أقصر.',
              ctaText: 'شاهدي العناية',
              link: '/sale?category=personal-care',
              tone: 'primary',
              stat: 'Daily',
            },
            {
              label: 'Supplements',
              title: 'خصومات المكملات',
              subtitle: 'اختيارات المناعة والطاقة والدعم اليومي في رف واحد.',
              ctaText: 'ابدئي من المكملات',
              link: '/shop?category=vitamins',
              tone: 'accent',
              stat: 'Care',
            },
            {
              label: 'Devices',
              title: 'أجهزة المنزل',
              subtitle: 'أسعار أوضح للأجهزة الصغيرة التي تحتاج مقارنة سريعة.',
              ctaText: 'شاهدي الأجهزة',
              link: '/shop?category=medical-devices',
              tone: 'slate',
              stat: 'Home',
            },
          ],
        },
        'campaign-stack',
      ),
      grid('العروض الحالية داخل الصيدلية', 'standard', { saleOnly: true }),
    ]),
    collections: discoveryPage([
      collectionsSection('ابدئي من نوع الاحتياج', 'fast-nav-grid', {
        subtitle:
          'من الروشتة والمنتجات اليومية حتى الأجهزة المنزلية، كل فئة لها مدخل أوضح وأقصر.',
        ctaText: 'كل الأقسام',
        ctaLink: '/collections',
        limit: PHARMACY_DEMO_PREVIEW_COLLECTIONS.length,
        collections: PHARMACY_DEMO_PREVIEW_COLLECTIONS,
      }),
      grid('اختيارات مميزة من الأقسام', 'standard', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation(
        {
          title: 'تم تثبيت طلبك بنجاح',
          description:
            'سنراجع التوافر ونجهز الطلب بهدوء، ثم نشاركك حالة التنفيذ والتوصيل بشكل واضح.',
          continueShoppingText: 'العودة للصيدلية',
          orderNumberPrefix: 'رقم الطلب:',
          supportText: 'لو احتجت تعديلًا سريعًا أو استشارة إضافية تواصلي معنا عبر',
          statusLabel: 'تحت المراجعة',
          whatsappSupportLabel: 'واتساب الصيدلية',
          showTimeline: true,
          showTrackOrder: true,
          showReorder: true,
          showRecommended: true,
          recommendedTitle: 'قد تحتاجين أيضًا',
          recommendedSubtitle:
            'إضافات شائعة مع نفس الاحتياج اليومي أو نفس روتين الرعاية.',
          recommendedVariant: 'standard',
        },
        'nature-aftercare',
      ),
    ]),
  },
  'max-care-go': {
    shop: conversionPage(
      [
        hero('split-panel', {
          eyebrow: 'Quick Care Catalog',
          title: 'اطلب احتياجك الصحي من شاشة واحدة أوضح وأسرع',
          subtitle:
            'حوّلنا المتجر من رف عام خفيف إلى رحلة صيدلية mobile-first تبدأ من الحاجة ثم تنتهي بطلب أوضح وأسرع.',
          ctaText: 'ابدأ من الفيتامينات',
          ctaLink: '/shop?category=vitamins',
          secondaryCtaText: 'ارفع الروشتة',
          secondaryCtaLink: '/prescription',
          backgroundImage:
            'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=1200&q=80',
          panelImage:
            'https://images.unsplash.com/photo-1550831107-1553da8c8464?auto=format&fit=crop&w=900&q=80',
          panelEyebrow: 'Mobile First',
          panelTitle: 'مداخل أقصر للطلبات اليومية',
          panelSubtitle:
            'العناية، الإسعافات، والأجهزة الصغيرة الآن أقرب للعميل من أول شاشة إلى آخر مراجعة.',
          panelMetricLabel: 'تأكيد',
          panelMetricValue: 'أسرع',
        }),
        shoppingIntents({
          badge: 'ابدأ من الحاجة',
          title: 'ما الاحتياج الذي تريد حسمه اليوم؟',
          subtitle:
            'قسّمنا الرحلة بين الطلبات اليومية والمنتجات التي تحتاج مراجعة أو طمأنة أوضح قبل الشراء.',
          items: [
            {
              eyebrow: 'Rx',
              title: 'رفع الروشتة',
              subtitle: 'لو الطلب يعتمد على وصفة أو بديل، ابدأ من مسار واضح قبل السلة.',
              link: '/prescription',
              tone: 'primary',
              chip: 'Rx',
            },
            {
              eyebrow: 'Daily',
              title: 'الفيتامينات والمكملات',
              subtitle: 'طلبات الطاقة والمناعة والدعم اليومي في رف أقرب للحسم.',
              link: '/shop?category=vitamins',
              tone: 'accent',
              chip: 'Daily',
            },
            {
              eyebrow: 'Devices',
              title: 'الأجهزة المنزلية',
              subtitle: 'قياس ومتابعة منزلية مع وصف أوضح قبل الإضافة.',
              link: '/shop?category=medical-devices',
              tone: 'emerald',
              chip: 'Devices',
            },
            {
              eyebrow: 'First Aid',
              title: 'الإسعافات الأساسية',
              subtitle: 'أساسيات الطوارئ المنزلية والسفر في مدخل واحد سريع.',
              link: '/shop?category=first-aid',
              tone: 'slate',
              chip: 'First Aid',
            },
          ],
        }),
        commandBar(
          {
            title: 'ابحث داخل Max Care Go',
            subtitle:
              'ابحث باسم المنتج أو الاستخدام أو الفئة بدل لف طويل بين رفوف عامة.',
            searchPlaceholder: 'ابحث عن فيتامين أو جهاز ضغط أو إسعافات أو واقي شمس',
            allCategoriesLabel: 'كل الاحتياجات',
            resultsLabel: 'منتج',
            clearButtonText: 'مسح',
            stickyLabel: 'طلب سريع',
          },
          'minimal-toolbar',
        ),
        section('filters-sidebar'),
        grid('كل احتياجات Max Care Go', 'standard', {
          subtitle:
            'شبكة أوضح للطلبات السريعة، مع مساحة أكبر للسعر والاستخدام والتقييم قبل الإضافة.',
        }),
        promoRail({
          badge: 'Care Fast Lane',
          title: 'الطريق الأسرع يبدأ من الاحتياج لا من التشتيت',
          subtitle:
            'رفع الروشتة، التكرار السريع، ورسائل التوصيل الواضحة أصبحت داخل نفس المسار بدل صفحات جانبية منفصلة.',
          spotlightLabel: 'Rx Ready',
          spotlightTitle: 'ابدأ من الروشتة لو الطلب يحتاج مراجعة',
          spotlightText:
            'لو عندك وصفة أو احتمال لبديل، جهّزنا صفحة أقرب للخطوة التالية بدل انتظار مفاجآت بعد السلة.',
          ctaText: 'صفحة الروشتة',
          ctaLink: '/prescription',
          trustItems:
            'تأكيد أسرع|العنوان والهاتف يظهران بوضوح قبل الإرسال.\nبدائل عند الحاجة|نوضح خطوة المراجعة قبل تثبيت الطلب.\nإعادة طلب أسرع|المنتجات اليومية ترجع إلى السلة في ضغطة واحدة.',
          highlights: 'Rx|مدعوم\nDaily|متكرر\nMobile|سريع',
        }),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    pdp: conversionPage(
      [
        productGallery('grid'),
        productInfoSection(
          {
            addToCartText: 'أضف للطلب',
            descriptionTitle: 'تفاصيل الاستخدام والعبوة',
            shippingTitle: 'التوصيل والمراجعة',
            shippingText:
              'نوضح التوصيل والتغليف وإذا كان المنتج يحتاج مراجعة أو بديل قبل تثبيت الطلب النهائي.',
            guaranteesTitle: 'قبل ما تثبت الطلب',
            guaranteesSubtitle:
              'الصورة والسعر ورسائل التوصيل والدعم تظهر في مسار واحد بدل الانتقال بين صفحات منفصلة.',
            guaranteeStyle: 'minimal',
          },
          'standard',
        ),
        conversionStackSection(
          {
            title: 'أكمّل القرار من نفس الصفحة',
            subtitle:
              'اختر الكمية والعبوة ثم راجع الرسالة المناسبة للشحن أو الدعم قبل الإرسال.',
          },
          'balanced',
        ),
        boughtTogetherSection(
          {
            title: 'منتجات تكمل نفس الاحتياج',
            subtitle:
              'إضافات شائعة مع نفس الروتين اليومي أو نفس حقيبة الإسعافات المنزلية.',
          },
          'stacked',
        ),
        relatedProductsSection(
          {
            title: 'بدائل من نفس الفئة',
            subtitle:
              'اختيارات قريبة تساعدك تقفل القرار إذا كنت تقارن بين عبوات أو أجهزة مشابهة.',
          },
          'standard',
        ),
        reviewsSection(
          {
            title: 'مراجعات بعد الاستخدام',
            mediaTitle: 'صور أو لقطات عند الحاجة',
            listTitle: 'ملاحظات المشترين على التوصيل والاستعمال',
          },
          'compact',
        ),
      ],
      {
        layoutHint: 'product-detail',
      },
    ),
    cart: conversionPage(
      [
        cartItems(
          {
            title: 'سلة Max Care Go',
            subtitle:
              'راجعي الاحتياجات اليومية أو الأجهزة الصغيرة بسرعة قبل تثبيت الطلب.',
            continueShoppingText: 'أضف احتياجًا آخر',
            headerBadge: 'Fast Care',
            serviceHighlights: ['تأكيد قبل التنفيذ', 'رسوم شحن واضحة', 'متابعة واتساب سريعة'],
          },
          'market-basket',
        ),
        orderSummarySection(
          {
            title: 'ملخص الطلب السريع',
            headerBadge: 'مراجعة واضحة',
            assuranceItems: [
              'نراجع التوافر قبل التنفيذ',
              'تكلفة الشحن تظهر قبل التأكيد',
              'التواصل السريع متاح لو احتجت تعديلًا',
            ],
            nextSteps: [
              'ثبّت الكمية أو العبوة المناسبة',
              'اكتب العنوان بشكل واضح',
              'أرسل الطلب وسنتابعك حتى الاستلام',
            ],
          },
          'market-summary',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Fast Care Checkout',
          message:
            'راجع الطلب ثم أدخل بيانات الاستلام الأساسية فقط لنغلق رحلة الصيدلية بسرعة ووضوح.',
          saleLabel: 'Daily',
          shippingLabel: 'Clear',
          returnLabel: 'Support',
          ctaText: 'العودة للصيدلية',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'مراجعة الاحتياجات',
            subtitle: 'تأكد من الكميات والعبوات قبل إرسال الطلب النهائي.',
            continueShoppingText: 'أضف منتجًا آخر',
            headerBadge: 'Fast Care',
          },
          'market-basket',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'رقم الهاتف الصحيح يسرّع تأكيد الطلب أو أي مراجعة على الروشتة أو البديل.',
            shippingTitle: 'عنوان الاستلام',
            shippingDescription:
              'اكتب العنوان والمحافظة بوضوح لتحديد التوصيل من أول مرة.',
            notesTitle: 'ملاحظات الطلب',
            notesDescription:
              'مثل قبول بديل، توقيت مناسب للتسليم، أو طلب مراجعة وصفة.',
            notesPlaceholder:
              'مثال: أوافق على بديل بنفس المادة الفعالة بعد التأكيد',
            assuranceBadge: 'مراجعة أخيرة',
          },
          'market-checkout',
        ),
        payment(
          {
            title: 'اعتماد الطلب',
            subtitle:
              'كل ما يهمك الآن: الإجمالي، الدفع، وخطوة المتابعة التالية بعد إرسال الطلب.',
            confirmOrderText: 'تأكيد الطلب',
            securityText: 'تأكيد سريع ومشفّر من الموبايل أو الويب',
            assuranceBadge: 'آخر مراجعة',
            showSummaryCard: false,
          },
          'market-payment',
        ),
        orderSummarySection(
          {
            title: 'الملخص النهائي',
            headerBadge: 'Clear total',
          },
          'market-summary',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Care Deals',
        message:
          'خصومات على الاحتياجات اليومية والمكملات والإسعافات التي يعاد طلبها باستمرار.',
        saleLabel: 'Daily',
        shippingLabel: 'Fast',
        returnLabel: 'Bundle',
        ctaText: 'العودة للصيدلية',
        ctaLink: '/shop',
      }),
      offerBento(
        {
          badge: 'ابدأ من شكل الاحتياج',
          title: 'العروض مقسمة حسب نوع القرار لا حسب التكديس',
          subtitle:
            'عناية يومية، مكملات، أجهزة، أو إسعافات تحتاج دخولًا أسرع من واجهة سوق عامة.',
          cards: [
            {
              label: 'Daily',
              title: 'عروض العناية اليومية',
              subtitle: 'منتجات متكررة الشراء بسعر أوضح وسكة أقصر.',
              ctaText: 'شاهد العناية',
              link: '/sale?category=personal-care',
              tone: 'primary',
              stat: 'Daily',
            },
            {
              label: 'Supplements',
              title: 'خصومات الفيتامينات',
              subtitle: 'رف أبسط للمناعة والطاقة والدعم اليومي.',
              ctaText: 'ابدأ من الفيتامينات',
              link: '/shop?category=vitamins',
              tone: 'accent',
              stat: 'Supplements',
            },
            {
              label: 'First Aid',
              title: 'إسعافات البيت',
              subtitle: 'أسعار أوضح للحاجات التي تريد إضافتها قبل إغلاق الرحلة.',
              ctaText: 'شاهد الإسعافات',
              link: '/shop?category=first-aid',
              tone: 'slate',
              stat: 'First Aid',
            },
          ],
        },
        'campaign-stack',
      ),
      grid('العروض الحالية داخل Max Care Go', 'standard', {
        saleOnly: true,
      }),
    ]),
    collections: discoveryPage([
      collectionsSection('ابدأ من نوع الاحتياج', 'fast-nav-grid', {
        subtitle:
          'من الفيتامينات والعناية حتى الأجهزة والإسعافات، كل مدخل هنا أقصر من رف عام متكرر.',
        ctaText: 'كل الأقسام',
        ctaLink: '/collections',
        limit: MAX_CARE_GO_PREVIEW_COLLECTIONS.length,
        collections: MAX_CARE_GO_PREVIEW_COLLECTIONS,
      }),
      grid('اختيارات مميزة من الأقسام', 'standard', { limit: 8 }),
    ]),
    prescription: trustPage([
      promoStrip({
        badge: 'Prescription Support',
        message:
          'لو الطلب يعتمد على روشتة، جهّز صورة واضحة أو أسماء الأدوية قبل التواصل لتسريع المراجعة.',
        saleLabel: 'Rx',
        shippingLabel: 'Clear',
        returnLabel: 'Private',
        ctaText: 'العودة للتسوق',
        ctaLink: '/shop',
      }),
      infoContent({
        badge: 'رفع الروشتة',
        title: 'ابدأ من الوصفة بدل ما تضيع بين صفحات الدعم والمتجر',
        subtitle:
          'هذه الصفحة تقرّب الخطوة التالية لطلبات الروشتة داخل Max Care Go حتى تبقى رحلة العميل واضحة من أول مرة.',
        body:
          'إذا كان المنتج يحتاج وصفة أو مراجعة، جهّز صورة واضحة أو قائمة الأدوية المطلوبة قبل التواصل.\n\nكلما كانت التفاصيل أوضح، صارت مراجعة البديل أو التوافر أو طريقة التنفيذ أسرع.',
        detailsTitle: 'قبل التواصل جهّز هذه النقاط',
        details: [
          'صورة واضحة|تأكد أن اسم الدواء والتركيز ظاهرين بالكامل.',
          'بديل مقبول|اذكر إذا كنت تقبل بديلًا بنفس المادة الفعالة.',
          'رقم الهاتف|حتى نؤكد التوافر أو أي سؤال قبل التنفيذ.',
          'ملاحظات طبية|مثل حساسية أو عبوة مفضلة أو توقيت مناسب للتسليم.',
        ],
        ctaText: 'اذهب إلى الدعم',
        ctaLink: '/contact',
        contentAlign: 'start',
      }),
    ]),
    rx: trustPage([
      promoStrip({
        badge: 'Rx Follow-up',
        message:
          'لإعادة طلب وصفة أو مراجعة بديل، استخدم هذا المسار المختصر بدل تكرار الشرح بعد الدخول للسلة.',
        saleLabel: 'Refill',
        shippingLabel: 'Support',
        returnLabel: 'Private',
        ctaText: 'العودة للصيدلية',
        ctaLink: '/shop',
      }),
      infoContent({
        badge: 'Rx سريع',
        title: 'لو الوصفة متكررة، اجعل إعادة الطلب أسهل',
        subtitle:
          'خصصنا صفحة مختصرة لطلبات إعادة الشراء التي تحتاج نفس الوصفة أو مراجعة بديل قريب.',
        body:
          'اكتب أسماء الأدوية أو العبوات التي تريد تكرارها، واذكر إذا كنت تحتاج نفس الطلب السابق أو أي تعديل بسيط.\n\nالهدف هنا أن يبدأ فريق الدعم من نفس السياق بدل أن تعيد الرحلة من الصفر.',
        detailsTitle: 'أهم ما يساعدنا نبدأ بسرعة',
        details: [
          'اسم المنتج|أو التركيز أو العبوة التي تريدها.',
          'الطلب السابق|اذكر إذا كان نفس الطلب السابق بدون تغيير.',
          'البديل المقبول|في حال عدم التوافر.',
          'موعد التواصل|لو تفضّل مكالمة أو رسالة في وقت محدد.',
        ],
        ctaText: 'ابدأ من الدعم',
        ctaLink: '/contact',
        contentAlign: 'start',
      }),
    ]),
    'thank-you': trustPage([
      orderConfirmation(
        {
          title: 'تم تثبيت طلب Max Care Go',
          description:
            'دخل الطلب الآن في مسار التجهيز السريع، وسنراجع التوافر أو أي بديل ثم نشاركك الحالة بخطوات واضحة.',
          continueShoppingText: 'العودة للصيدلية',
          orderNumberPrefix: 'رقم الطلب:',
          supportText: 'لو احتجت تعديلًا سريعًا أو مراجعة بديل تواصل معنا عبر',
          statusLabel: 'قيد التجهيز السريع',
          whatsappSupportLabel: 'واتساب Max Care Go',
          showTimeline: true,
          showTrackOrder: true,
          showReorder: true,
          showRecommended: true,
          trackOrderTitle: 'تابع حالة التجهيز',
          trackOrderDescription:
            'أدخل نفس رقم الهاتف المستخدم وقت الطلب لمعرفة الحالة أو الموعد المتوقع للتسليم.',
          reorderTitle: 'أعد نفس الطلب بسرعة',
          reorderDescription:
            'أضف نفس المنتجات إلى السلة دفعة واحدة إذا كان هذا من طلباتك اليومية المتكررة.',
          recommendedTitle: 'قد تحتاج أيضًا',
          recommendedSubtitle:
            'إضافات شائعة تكمل نفس الروتين اليومي أو نفس الطلب الصحي الذي أرسلته الآن.',
        },
        'nature-aftercare',
      ),
    ]),
  },
  'cutline-club': {
    home: discoveryPage([
      promoStrip({
        badge: 'Club Drop',
        message:
          'الدروب الأسبوعي يجمّع الأطقم والطبقات والهوديز في مسار أسرع من التصفح العشوائي.',
        saleLabel: 'Drop جديد',
        shippingLabel: 'مقاسات أوضح',
        returnLabel: 'Bundle وفر',
        ctaText: 'ادخل الدروب',
        ctaLink: '/sale',
      }),
      hero('split-panel', {
        eyebrow: 'Cutline Drop',
        title: 'أطقم وطبقات streetwear بإيقاع أسرع من الدروب للطلب',
        subtitle:
          'رف حضري يبيع باللوك الجاهز: طقم كامل، أوفرشيرت، هودي، أو بنطلون يقفل نفس المزاج من أول نظرة.',
        ctaText: 'شاهدي الدروب',
        ctaLink: '/sale',
        secondaryCtaText: 'افتحي الرف',
        secondaryCtaLink: '/shop',
        backgroundImage: cutlineThemeAsset('preview.jpg'),
        panelImage: cutlineProductAsset('overshirt-ink.jpg'),
        panelEyebrow: 'Club Uniform',
        panelTitle: 'ابدئي من اللوك الكامل',
        panelSubtitle:
          'قسّمنا القطع حسب الطقم أو الطبقة أو البنطلون حتى يقفل القرار أسرع من واجهة أزياء عامة.',
        panelMetricLabel: 'Bundle وفر',
        panelMetricValue: 'حتى 12%',
      }),
      shoppingIntents({
        badge: 'ابدئي من اللوك',
        title: 'أي مسار أقرب لمودك اليوم؟',
        subtitle:
          'طقم جاهز، طبقة إضافية، هودي يومي، أو بنطلون يكمل نفس الإيقاع من غير حيرة.',
        items: [
          {
            eyebrow: 'Sets',
            title: 'الأطقم الجاهزة',
            subtitle: 'حل أسرع لطلب لوك كامل من نفس الصفحة.',
            link: '/shop?category=sets',
            tone: 'primary',
            chip: 'Sets',
          },
          {
            eyebrow: 'Layers',
            title: 'الطبقات',
            subtitle: 'أوفرشيرتس وجاكيتات خفيفة تبني الحضور بسهولة.',
            link: '/shop?category=outerwear',
            tone: 'accent',
            chip: 'Layers',
          },
          {
            eyebrow: 'Hoodies',
            title: 'الهوديز',
            subtitle: 'مقاسات يومية وروح street ready في قطعة واحدة.',
            link: '/shop?category=hoodies',
            tone: 'emerald',
            chip: 'Hoodies',
          },
          {
            eyebrow: 'Bottoms',
            title: 'البناطيل',
            subtitle: 'كارجو وتراوزرز تقفل نفس اللوك بشكل عملي.',
            link: '/shop?category=bottoms',
            tone: 'slate',
            chip: 'Bottoms',
          },
        ],
      }),
      offerBento(
        {
          badge: 'Club Edits',
          title: 'نفس المكتبة لكن مقفولة على مسارات أوضح',
          subtitle:
            'اختيارات جاهزة حسب نوع القطعة أو شكل اللوك بدل شبكة مكررة تحط كل شيء جنب بعض.',
          cards: [
            {
              label: 'Drop',
              title: 'ابدأ من الدروب',
              subtitle: 'العروض والقطع الأسرع حركة في نقطة دخول واحدة.',
              ctaText: 'ادخل الدروب',
              link: '/sale',
              tone: 'primary',
              stat: 'Drop',
            },
            {
              label: 'Look',
              title: 'طقم يقفل القرار',
              subtitle: 'اختيارات تباع غالبًا معًا وتوفّر وقت التنسيق.',
              ctaText: 'شاهد الأطقم',
              link: '/shop?category=sets',
              tone: 'accent',
              stat: 'Look',
            },
            {
              label: 'Layer',
              title: 'طبقة تضيف حضور',
              subtitle: 'أوفرشيرت أو هودي يرفع الإيقاع من غير تعقيد.',
              ctaText: 'ابدأ من الطبقات',
              link: '/shop?category=outerwear',
              tone: 'slate',
              stat: 'Layer',
            },
          ],
        },
        'campaign-stack',
      ),
      grid('القطع الأسرع داخل النادي', 'editorial-card', {
        limit: 8,
        subtitle:
          'شبكة أقرب للرف التحريري للقطع الأساسية والدروبات بدل نفس شبكة أزياء عامة متكررة.',
      }),
      newsletter(
        {
          title: 'اعرفي الدروب قبل ما يخلص',
          subtitle: 'اشتركي لو عايزة تعرفي أول ما ينزل drop جديد أو خصم على look كامل.',
          buttonText: 'اشترك',
          placeholder: 'بريدك الإلكتروني',
        },
        'minimal',
      ),
    ]),
    shop: conversionPage(
      [
        commandBar(
          {
            title: 'دوّري على القطعة أو اللوك بسرعة',
            subtitle:
              'ابحثي بالطقم أو الطبقة أو نوع القطعة بدل ما تلفي بين رفوف عامة متشابهة.',
            searchPlaceholder: 'ابحثي عن طقم أو هودي أو أوفرشيرت أو كارجو',
            allCategoriesLabel: 'كل القطع',
            resultsLabel: 'قطعة',
            clearButtonText: 'مسح',
            stickyLabel: 'ابدأ من اللوك',
          },
          'minimal-toolbar',
        ),
        section('filters-sidebar'),
        grid('رف Cutline Club', 'editorial-card', {
          subtitle:
            'أساسيات حضرية، طبقات، وقطع تبني نفس اللوك بسرعة بدل شبكة عامة مكررة.',
        }),
        promoRail(
          {
            badge: 'Club Notes',
            title: 'الصفحة تقودك للّوك، لا للقطعة فقط',
            subtitle:
              'الترشيحات والعروض ورسائل المقاس صارت أقرب للعميل داخل نفس الرف بدل التكرار بين ثيمات أزياء متشابهة.',
            spotlightLabel: 'Look Builder',
            spotlightTitle: 'ابدئي من الطقم أو الطبقة',
            spotlightText:
              'ابدئي من المدخل الأقرب لمودك ثم اكملي القطع المكملة من نفس المسار بدل القفز بين صفحات متطابقة.',
            ctaText: 'شاهد التشكيلات',
            ctaLink: '/collections',
            trustItems:
              'مقاس أوضح|التركيز على الخامة والـ fit قبل الإرسال.\nDrops أسرع|العروض والتنسيقات الأقرب للقطعة واضحة داخل الرف.\nقرار أسرع|القطع المكملة تظهر بجانب السياق نفسه.',
            highlights:
              'Sets|جاهز\nLayers|متاح\nDrop|سريع',
          },
          'campaign-rail',
        ),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    pdp: conversionPage(
      [
        productGallery('grid'),
        productInfoSection(
          {
            addToCartText: 'أضف القطعة',
            descriptionTitle: 'الخامة والبناء',
            shippingTitle: 'الشحن والاستبدال',
            shippingText:
              'راجعي المقاس والخامة والشحن ثم أغلقي الطلب بإيقاع أسرع يناسب القطع اليومية والدروبات.',
            guaranteesTitle: 'قبل ما تقفلي اللوك',
            guaranteesSubtitle:
              'المقاس، الخامة، والقطع المكملة تظهر بصياغة أسرع من صفحة أزياء ناعمة تقليدية.',
            guaranteeStyle: 'minimal',
            fitNote: 'لو القطعة جزء من طقم، راجعي الـ fit أولًا قبل تثبيت الطلب.',
          },
          'standard',
        ),
        conversionStackSection(
          {
            title: 'كمّلي اللوك من نفس الصفحة',
            subtitle:
              'اختاري المقاس والكمية ثم راجعي العرض أو القطعة المكملة قبل الإرسال.',
          },
          'balanced',
        ),
        boughtTogetherSection(
          {
            title: 'قطع تقفل نفس اللوك',
            subtitle: 'إضافات تتباع كثيرًا مع نفس الطقم أو الطبقة أو البنطلون.',
          },
          'stacked',
        ),
        relatedProductsSection(
          {
            title: 'بدائل داخل نفس الدروب',
            subtitle: 'قطع قريبة في المزاج أو الـ fit تساعدك تكمل القرار بسرعة.',
          },
          'compact',
        ),
        reviewsSection(
          {
            title: 'تجارب اللبس بعد الاستلام',
            mediaTitle: 'صور من اللبس الفعلي',
            listTitle: 'آراء عن المقاس والخامة',
          },
          'compact',
        ),
      ],
      {
        layoutHint: 'product-detail',
      },
    ),
    cart: conversionPage(
      [
        cartItems(
          {
            title: 'سلة Cutline Club',
            subtitle:
              'راجعي القطع المقفولة على نفس اللوك قبل الإرسال، ثم قرري إذا كنتِ محتاجة تضيفي طبقة أو قطعة ثانية.',
            continueShoppingText: 'أضيفي قطعة أخرى',
          },
          'editorial',
        ),
        orderSummarySection(
          {
            title: 'ملخص اللوك',
            checkoutButtonText: 'كمّلي للطلب',
            secureCheckoutText: 'مراجعة أسرع قبل التأكيد',
            showTrustRow: true,
          },
          'highlighted',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Club Checkout',
          message:
            'ثبتي المقاسات والكمية والعنوان بسرعة لنقفل الطلب بنفس إيقاع الدروب من غير لف إضافي.',
          saleLabel: 'Drop',
          shippingLabel: 'Fast',
          returnLabel: 'Fit',
          ctaText: 'العودة للرف',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'مراجعة القطع',
            subtitle: 'تأكدي من المقاسات والكميات قبل اعتماد الطلب.',
            continueShoppingText: 'أضيفي قطعة ثانية',
          },
          'editorial',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'سنستخدمها لتأكيد الطلب أو أي ملاحظة تخص المقاس أو الاستبدال.',
            shippingTitle: 'عنوان التوصيل',
            shippingDescription:
              'اكتبي عنوانًا واضحًا لأن القطع سريعة الحركة ونحب نقفل التجربة من أول مرة.',
            notesTitle: 'ملاحظات المقاس أو اللبس',
            notesDescription:
              'مثل طلب تبديل مقاس أو ملاحظة حول الـ fit أو وقت مناسب للاستلام.',
            notesPlaceholder: 'مثال: لو المقاس tighter قليلاً بلغوني قبل التنفيذ',
          },
          'split',
        ),
        payment(
          {
            title: 'اعتماد الطلب',
            subtitle:
              'الملخص النهائي واضح ويركز على الإجمالي وطريقة الدفع ورسالة الاستبدال عند الحاجة.',
            confirmOrderText: 'تأكيد الطلب',
            securityText: 'بياناتك محمية أثناء إتمام الطلب',
            showSummaryCard: false,
          },
          'cards',
        ),
        orderSummarySection(
          {
            title: 'ملخص نهائي',
            checkoutButtonText: 'إرسال الطلب',
            secureCheckoutText: 'طلب مراجع وواضح',
            showTrustRow: true,
          },
          'highlighted',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Club Offers',
        message:
          'دروبات وخصومات على الأطقم والطبقات والقطع التي تقفل اللوك بأقل وقت تفكير.',
        saleLabel: 'Drop',
        shippingLabel: 'Look',
        returnLabel: 'Bundle',
        ctaText: 'العودة للرف',
        ctaLink: '/shop',
      }),
      offerBento(
        {
          badge: 'ابدئي من نوع القطعة',
          title: 'العروض مقسمة حسب سلوك الشراء لا حسب تكديس القطع',
          subtitle:
            'الطقم، الطبقة، أو البنطلون، كل مسار يقفله لك بشكل أسرع من أي متجر أزياء عام.',
          cards: [
            {
              label: 'Sets',
              title: 'خصومات الأطقم',
              subtitle: 'لوكات جاهزة تقلل وقت التنسيق من أول قرار.',
              ctaText: 'شاهدي الأطقم',
              link: '/sale?category=sets',
              tone: 'primary',
              stat: 'Sets',
            },
            {
              label: 'Layers',
              title: 'الطبقات والحضور',
              subtitle: 'أوفرشيرت وهودي يرفعان الإيقاع بسرعة.',
              ctaText: 'ابدئي من الطبقات',
              link: '/shop?category=outerwear',
              tone: 'accent',
              stat: 'Layers',
            },
            {
              label: 'Bottoms',
              title: 'البناطيل العملية',
              subtitle: 'قطع تقفل اللوك وتدخل في أكثر من تنسيق.',
              ctaText: 'شاهدي البناطيل',
              link: '/shop?category=bottoms',
              tone: 'slate',
              stat: 'Bottoms',
            },
          ],
        },
        'campaign-stack',
      ),
      grid('الدروبات والعروض الحالية', 'editorial-card', { saleOnly: true }),
    ]),
    collections: discoveryPage([
      collectionsSection('ابدئي من نوع القطعة', 'fast-nav-grid', {
        subtitle:
          'الأطقم والطبقات والهوديز والبناطيل في أبواب أوضح من رف أزياء مكرر.',
        ctaText: 'كل الأقسام',
        ctaLink: '/collections',
        limit: CUTLINE_CLUB_PREVIEW_COLLECTIONS.length,
        collections: CUTLINE_CLUB_PREVIEW_COLLECTIONS,
      }),
      grid('اختيارات من كل Drop', 'editorial-card', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation({
        title: 'تم تثبيت طلب Cutline Club',
        description:
          'سنراجع القطع والمقاسات ثم نشاركك تحديث التجهيز والتوصيل بشكل واضح وسريع.',
        continueShoppingText: 'العودة للرف',
        orderNumberPrefix: 'كود الطلب:',
        supportText: 'لو احتجت تعديلًا سريعًا أو تغيير مقاس تواصلي معنا عبر',
        statusLabel: 'قيد التجهيز',
        whatsappSupportLabel: 'واتساب النادي',
        showTimeline: true,
        showTrackOrder: true,
        showReorder: true,
        showRecommended: true,
        recommendedTitle: 'قطع قد تكمل نفس الطلب',
        recommendedSubtitle:
          'إضافات من نفس الدروب أو من نفس مزاج اللبس لو حبيتي تغلقي اللوك أكثر.',
      }),
    ]),
  },
  'style-store-eg': {
    home: discoveryPage([
      promoStrip({
        badge: 'Style Accessories',
        message:
          'رف ساعات وشنط وسنيكرز وإكسسوارات يختصر الطريق للقطعة التي تكمل اللوك قبل ما تبدئي من الصفر.',
        saleLabel: 'Gifts',
        shippingLabel: 'Daily Picks',
        returnLabel: 'Looks Ready',
        ctaText: 'ابدئي من الهدية',
        ctaLink: '/sale',
      }),
      hero('centered', {
        contentAlign: 'center',
        eyebrow: 'رف الساعة والشنطة',
        title: 'إكسسوارات يومية ترفع اللوك من غير ما تزاحم القطعة الأساسية',
        subtitle:
          'ساعات، شنط، وسنيكرز وإكسسوارات مختارة بعرض أوضح للاستخدام والستايل والهدايا السريعة.',
        ctaText: 'ادخلي الرف',
        ctaLink: '/shop',
        secondaryCtaText: 'شاهدي الهدايا',
        secondaryCtaLink: '/sale',
        backgroundImage: styleStoreAsset('hero-banner.jpg'),
        panelImage: styleStoreAsset('products/velvet-link-watch-1.jpg'),
        panelEyebrow: 'Everyday Accent',
        panelTitle: 'ابدئي من القطعة التي تغيّر الإيقاع',
        panelSubtitle:
          'ساعة أو شنطة أو سنيكرز واحد قد يقفل اللوك أسرع من تغيير القطعة الرئيسية كلها.',
        panelMetricLabel: 'Gift Ready',
        panelMetricValue: 'متاح',
      }),
      collectionsSection('اختاري نوع القطعة', 'fast-nav-grid', {
        subtitle:
          'الساعات، الشنط، السنيكرز، والهدايا الجاهزة في أبواب أقرب لدور منسقة المظهر.',
        ctaText: 'كل الأقسام',
        ctaLink: '/collections',
        limit: STYLE_STORE_PREVIEW_COLLECTIONS.length,
        collections: STYLE_STORE_PREVIEW_COLLECTIONS,
      }),
      grid('اختيارات ترفع اللوك', 'editorial-card', {
        limit: 8,
        subtitle:
          'شبكة أقرب للعرض التحريري للأكسسوار والقطع المكملة بدل نفس رف المنتجات التقليدي.',
      }),
      offerBento(
        {
          badge: 'Style Notes',
          title: 'أربع طرق سهلة للدخول على الرف',
          subtitle:
            'ابدئي من الساعة اليومية أو الشنطة أو السنيكرز أو الهدية الجاهزة بدل التصفح العشوائي.',
          cards: [
            {
              label: 'Watch',
              title: 'ساعة يومية',
              subtitle: 'قطعة تضيف حضورًا سريعًا من غير زحمة.',
              ctaText: 'شاهدي الساعات',
              link: '/shop?category=watches',
              tone: 'primary',
              stat: 'Watch',
            },
            {
              label: 'Bag',
              title: 'شنطة حركة',
              subtitle: 'عملية وتكمل اللبس بسهولة في المشاوير اليومية.',
              ctaText: 'ابدئي من الشنط',
              link: '/shop?category=bags',
              tone: 'accent',
              stat: 'Bag',
            },
            {
              label: 'Gift',
              title: 'هدية جاهزة',
              subtitle: 'بوكسات وإكسسوارات سهلة للإهداء السريع.',
              ctaText: 'شاهدي الهدايا',
              link: '/sale',
              tone: 'slate',
              stat: 'Gift',
            },
          ],
        },
        'boutique-duo',
      ),
    ]),
    shop: conversionPage(
      [
        commandBar(
          {
            title: 'دوّري على القطعة التي تكمل اللوك',
            subtitle:
              'ابحثي بالساعة أو الشنطة أو السنيكرز بدل لف طويل داخل رف عام متكرر.',
            searchPlaceholder: 'ابحثي عن ساعة أو شنطة أو سنيكرز أو هدية',
            allCategoriesLabel: 'كل القطع',
            resultsLabel: 'قطعة',
            clearButtonText: 'مسح',
            stickyLabel: 'ابدئي من النوع',
          },
          'minimal-toolbar',
        ),
        section('filters-sidebar'),
        grid('كل القطع المختارة', 'editorial-card', {
          subtitle:
            'ساعات وشنط وسنيكرز وإكسسوارات تظهر في رف أقرب للعرض التحريري لا للشبكة العامة.',
        }),
        promoRail(
          {
            badge: 'Stylist Edit',
            title: 'الترشيح هنا أقرب لدور منسقة مظهر',
            subtitle:
              'الرف يوضح لك أي القطع تكمل بعضها بدل تكرار نفس grammar الأزياء العامة مع عنوان مختلف فقط.',
            spotlightLabel: 'Daily Accent',
            spotlightTitle: 'ابدئي من القطعة الصغيرة',
            spotlightText:
              'ساعة أو شنطة أو سنيكرز واحد قد يغلق اللوك أسرع من تغيير القطعة الأساسية كلها.',
            ctaText: 'شاهد التشكيلات',
            ctaLink: '/collections',
            trustItems:
              'هدية جاهزة|قطع صغيرة مناسبة للإهداء السريع.\nاختيار أسهل|بدء من النوع بدل البحث العشوائي.\nشحن واضح|خطوات أقل حتى الإتمام.',
            highlights:
              'Watches|متاح\nBags|جاهز\nGifts|سريع',
          },
          'stylist-rail',
        ),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    pdp: conversionPage(
      [
        productGallery('fashion-counter-stage'),
        productInfoSection(
          {
            descriptionTitle: 'الخامة والاستخدام',
            shippingTitle: 'الشحن والمتابعة',
            shippingText:
              'نوضح الشحن والمتابعة والقطع المكملة حتى يبقى القرار مرتبطًا بالدور الذي ستلعبه القطعة داخل اللوك.',
            guaranteesTitle: 'قبل ما تقفلي الاختيار',
            guaranteesSubtitle:
              'القطعة الصغيرة هنا لها وظيفة واضحة، لذلك نظهر الخدمة والمقاس والخامة والاقتراحات جنب بعض.',
            guaranteeStyle: 'minimal',
          },
          'utility-rail',
        ),
        conversionStackSection(
          {
            title: 'أكملي الاختيار من نفس اللحظة',
            subtitle:
              'حددي الكمية ثم راجعي الإضافة أو الهدية أو القطعة المكملة من نفس الصفحة.',
          },
          'couture-minimal',
        ),
        boughtTogetherSection(
          {
            title: 'قطع تكمل نفس اللوك',
            subtitle: 'إضافات تُشترى كثيرًا مع نفس الساعة أو الشنطة أو الحذاء.',
          },
          'pairing-rail',
        ),
        relatedProductsSection(
          {
            title: 'اقتراحات من نفس المزاج',
            subtitle: 'منتجات قريبة في الإيقاع أو الوظيفة لتسهيل القرار النهائي.',
          },
          'editorial',
        ),
        reviewsSection(
          {
            title: 'ملاحظات المشترين',
            listTitle: 'تجارب بعد الاستلام',
          },
          'voice-notes',
        ),
      ],
      {
        layoutHint: 'product-detail',
      },
    ),
    cart: conversionPage(
      [
        cartItems(
          {
            title: 'سلة Style Store',
            subtitle:
              'راجعي القطع التي تكمل اللوك قبل الإرسال، ثم قرري إذا كان ينقصك هدية أو إضافة خفيفة.',
            continueShoppingText: 'أضيفي قطعة أخرى',
          },
          'wardrobe-cart',
        ),
        orderSummarySection(
          {
            title: 'ملخص الاختيار',
            secureCheckoutText: 'مراجعة هادئة قبل التأكيد',
          },
          'boutique-summary',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Style Checkout',
          message:
            'اكتبي العنوان وراجعي القطع بهدوء لنغلق الطلب بنفس النبرة الأنيقة للرف من غير خطوات كثيرة.',
          saleLabel: 'Gift',
          shippingLabel: 'Clear',
          returnLabel: 'Style',
          ctaText: 'العودة للمتجر',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'مراجعة القطع',
            subtitle: 'تأكدي من القطع والكميات قبل اعتماد الطلب النهائي.',
            continueShoppingText: 'أضيفي قطعة ثانية',
          },
          'wardrobe-cart',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'سنستخدمها لتأكيد الطلب أو أي ملاحظة تخص الهدية أو التغليف أو الاستبدال.',
            shippingTitle: 'عنوان التوصيل',
            shippingDescription:
              'اكتبي عنوانًا واضحًا لنصل بالقطعة أو الهدية من أول محاولة.',
            notesTitle: 'ملاحظات التغليف أو الهدية',
            notesDescription:
              'مثل طلب تغليف بسيط أو رسالة هدية أو وقت مناسب للاستلام.',
            notesPlaceholder: 'مثال: يرجى تغليف القطعة كهدية بسيطة',
          },
          'soft-flow',
        ),
        payment(
          {
            title: 'اعتماد الطلب',
            subtitle:
              'الملخص النهائي واضح ويقفل الاختيار بطريقة ناعمة، مع رسالة أمان وخطوة متابعة مباشرة.',
            confirmOrderText: 'تأكيد الطلب',
            securityText: 'بياناتك محمية أثناء إتمام الطلب',
            showSummaryCard: false,
          },
          'boutique-payment',
        ),
        orderSummarySection(
          {
            title: 'ملخص نهائي',
            secureCheckoutText: 'طلب هادئ ومراجع',
          },
          'boutique-summary',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Accessory Sale',
        message:
          'خصومات على الساعات والشنط والسنيكرز والقطع الجاهزة للإهداء في رف أوضح وأخف من المتجر العام.',
        saleLabel: 'Watch',
        shippingLabel: 'Gift',
        returnLabel: 'Edit',
        ctaText: 'العودة للمتجر',
        ctaLink: '/shop',
      }),
      offerBento(
        {
          badge: 'ابدئي من دور القطعة',
          title: 'العروض مقسّمة حسب الوظيفة داخل اللوك',
          subtitle:
            'ساعة يومية، شنطة حركة، سنيكرز هادئ، أو هدية جاهزة بدل التكرار بين قوالب متشابهة.',
          cards: [
            {
              label: 'Watch',
              title: 'عروض الساعات',
              subtitle: 'اختيارات ترفع الحضور من أول نظرة.',
              ctaText: 'شاهدي الساعات',
              link: '/sale?category=watches',
              tone: 'primary',
              stat: 'Watch',
            },
            {
              label: 'Bag',
              title: 'شنط الحركة',
              subtitle: 'قطع عملية ومختارة بعين styling أوضح.',
              ctaText: 'شاهدي الشنط',
              link: '/shop?category=bags',
              tone: 'accent',
              stat: 'Bag',
            },
            {
              label: 'Gift',
              title: 'هدايا جاهزة',
              subtitle: 'إضافات بسيطة تقفل الطلب بسرعة للإهداء.',
              ctaText: 'ابدئي من الهدايا',
              link: '/sale',
              tone: 'slate',
              stat: 'Gift',
            },
          ],
        },
        'boutique-duo',
      ),
      grid('العروض الحالية على الإكسسوارات', 'editorial-card', { saleOnly: true }),
    ]),
    collections: discoveryPage([
      collectionsSection('اختاري نوع القطعة', 'fast-nav-grid', {
        subtitle:
          'كل ركن هنا له وظيفة واضحة داخل اللوك، من الساعة حتى الهدية الجاهزة.',
        ctaText: 'كل الأقسام',
        ctaLink: '/collections',
        limit: STYLE_STORE_PREVIEW_COLLECTIONS.length,
        collections: STYLE_STORE_PREVIEW_COLLECTIONS,
      }),
      grid('اختيارات من كل ركن', 'editorial-card', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation(
        {
          title: 'تم تثبيت طلبك بنجاح',
          description:
            'سنراجع القطع والتغليف ثم نشاركك تحديث التجهيز والتوصيل بخطوات واضحة ومختصرة.',
          continueShoppingText: 'العودة للمتجر',
          orderNumberPrefix: 'رقم الطلب:',
          supportText: 'لو احتجت تعديلًا سريعًا أو ملاحظة تخص الهدية تواصلي معنا عبر',
          statusLabel: 'قيد التجهيز',
          whatsappSupportLabel: 'واتساب المتجر',
          showTimeline: true,
          showTrackOrder: true,
          showReorder: true,
          showRecommended: true,
          recommendedTitle: 'قد تكمل طلبك أيضًا',
          recommendedSubtitle:
            'إضافات خفيفة من نفس المزاج أو من نفس الرف لو حبيتي توسعي الطلب.',
          recommendedVariant: 'standard',
        },
        'soft-thanks',
      ),
    ]),
  },
  'elessi-carry-lane': {
    shop: conversionPage(
      [
        shoppingIntents({
          badge: 'ابدئي من الاستخدام',
          title: 'أي حقيبة تقفل يومك أو رحلتك أسرع؟',
          subtitle:
            'رتبنا الصفحة حول الوظيفة: يومي، سفر، هدية، أو إضافة صغيرة تكمل السلة من غير لف طويل.',
          items: [
            {
              eyebrow: 'Daily',
              title: 'شنط يومية',
              subtitle: 'توت وكتفيات للحركة اليومية والاجتماعات والمشاوير.',
              link: '/shop?category=bags',
              tone: 'primary',
              chip: 'Daily',
            },
            {
              eyebrow: 'Travel',
              title: 'شنط السفر',
              subtitle: 'موديلات أخف للرحلات القصيرة والتنقل الطويل.',
              link: '/shop?category=travel-bags',
              tone: 'accent',
              chip: 'Travel',
            },
            {
              eyebrow: 'Gift',
              title: 'هدايا وإكسسوارات',
              subtitle: 'سكارف ومحافظ ولمسات صغيرة للإهداء السريع.',
              link: '/shop?category=scarves',
              tone: 'emerald',
              chip: 'Gift',
            },
            {
              eyebrow: 'Finish',
              title: 'محافظ وأحزمة',
              subtitle: 'إضافات عملية ترفع قيمة الطلب من غير تشتيت.',
              link: '/shop?category=wallets',
              tone: 'slate',
              chip: 'Finish',
            },
          ],
        }),
        commandBar(
          {
            title: 'دوّري على التوت أو السفر أو المحفظة',
            subtitle:
              'فلتر حسب الاستخدام أو القطعة المكملة بدل البحث داخل رف عام متشابه.',
            searchPlaceholder: 'ابحثي عن Tote أو Travel Bag أو Wallet',
            allCategoriesLabel: 'كل الحقائب',
            resultsLabel: 'قطعة',
            clearButtonText: 'مسح',
            stickyLabel: 'Carry Lane',
          },
          'elessi-bag-toolbar',
        ),
        section('filters-sidebar'),
        grid('كل حقائب Carry Lane', 'elessi-bag-shop-grid', {
          subtitle:
            'الصور واللون والاستخدام اليومي أو السفر ظاهرون بشكل أوضح قبل الإضافة.',
        }),
        promoRail({
          badge: 'Bag Edit',
          title: 'القرار هنا يبدأ من الاستخدام الحقيقي',
          subtitle:
            'رتبنا الرحلة بين اليومي والسفر والهدايا والإضافات حتى لا يتوه العميل بين صور متشابهة فقط.',
          spotlightLabel: 'Set Builder',
          spotlightTitle: 'ابدئي بالحقيبة ثم أضيفي اللمسة المكملة',
          spotlightText:
            'المحفظة أو السكارف أو الحزام يظهرون كسياق منطقي للطلب لا كاقتراح عشوائي بعيد عن الاستخدام.',
          ctaText: 'شاهدي كل الأقسام',
          ctaLink: '/collections',
          trustItems:
            'مقاسات أوضح|الطول والاتساع والسعة أقرب للقرار.\nإرجاع أسهل|14 يومًا للرجوع أو التبديل.\nتنسيق أسرع|القطع المكملة تظهر في نفس الرحلة.',
          highlights: 'Daily|جاهز\nTravel|متاح\nGift|مرتب',
        }),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    cart: conversionPage(
      [
        cartItems(
          {
            title: 'سلة Carry Lane',
            subtitle:
              'راجعي الحقيبة والإضافات المكملة قبل الإرسال، ثم قرري إذا كنت تحتاجين قطعة صغيرة تغلق الطلب.',
            continueShoppingText: 'أضيفي قطعة أخرى',
          },
          'wardrobe-cart',
        ),
        orderSummarySection(
          {
            title: 'ملخص الاختيار',
            secureCheckoutText: 'مراجعة هادئة قبل التأكيد',
            showTrustRow: true,
          },
          'boutique-summary',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Carry Lane Checkout',
          message:
            'راجعي المقاس واللون والعنوان بهدوء لنقفل الطلب بنفس النبرة الأنيقة والسريعة للقالب.',
          saleLabel: 'Daily',
          shippingLabel: 'Clear',
          returnLabel: '14 Day',
          ctaText: 'العودة للمتجر',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'مراجعة الحقائب',
            subtitle: 'تأكدي من اللون والكمية والإضافات قبل اعتماد الطلب.',
            continueShoppingText: 'أضيفي قطعة ثانية',
          },
          'wardrobe-cart',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'سنستخدمها لتأكيد الطلب أو أي ملاحظة تخص اللون أو التغليف أو الاستبدال.',
            shippingTitle: 'عنوان التوصيل',
            shippingDescription:
              'اكتبي عنوانًا واضحًا لنصل بالحقيبة أو الهدية من أول محاولة.',
            notesTitle: 'ملاحظات اللون أو الهدية',
            notesDescription:
              'مثل طلب تغليف بسيط أو ملاحظة حول لون بديل أو وقت مناسب للاستلام.',
            notesPlaceholder: 'مثال: لو اللون غير متاح تواصلوا معي قبل التنفيذ',
          },
          'soft-flow',
        ),
        payment(
          {
            title: 'اعتماد الطلب',
            subtitle:
              'الملخص النهائي واضح ويغلق الاختيار بطريقة أنيقة مع رسالة أمان وخطوة متابعة مباشرة.',
            confirmOrderText: 'تأكيد الطلب',
            securityText: 'بياناتك محمية أثناء إتمام الطلب',
            showSummaryCard: false,
          },
          'boutique-payment',
        ),
        orderSummarySection(
          {
            title: 'ملخص نهائي',
            secureCheckoutText: 'طلب هادئ ومراجع',
            showTrustRow: true,
          },
          'boutique-summary',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Carry Lane Offers',
        message:
          'عروض على الحقائب اليومية والسفر والإضافات التي تكمل الهدية أو ترفع قيمة الطلب بسرعة.',
        saleLabel: 'Daily',
        shippingLabel: 'Travel',
        returnLabel: 'Gift',
        ctaText: 'العودة للمتجر',
        ctaLink: '/shop',
      }),
      offerBento(
        {
          badge: 'ابدئي من شكل الاستخدام',
          title: 'العروض مقسمة حسب وظيفة الحقيبة داخل اليوم أو الرحلة',
          subtitle:
            'شنطة يومية، قطعة سفر، أو هدية صغيرة تقفل القرار بدل تكديس منتجات متشابهة.',
          cards: [
            {
              label: 'Daily',
              title: 'شنط يومية',
              subtitle: 'موديلات عملية تتحرك بسرعة داخل السلة اليومية.',
              ctaText: 'شاهدي اليومي',
              link: '/shop?category=bags',
              tone: 'primary',
              stat: 'Daily',
            },
            {
              label: 'Travel',
              title: 'قطع سفر وتنقل',
              subtitle: 'شنط أخف وموديلات أوسع للرحلات القصيرة والتنقل.',
              ctaText: 'ابدئي من السفر',
              link: '/shop?category=travel-bags',
              tone: 'accent',
              stat: 'Travel',
            },
            {
              label: 'Finish',
              title: 'إضافات تكمل الطلب',
              subtitle: 'محافظ أو سكارف أو حزام يرفع قيمة الهدية أو الطلب.',
              ctaText: 'شاهدي الإضافات',
              link: '/shop?category=wallets',
              tone: 'slate',
              stat: 'Finish',
            },
          ],
        },
        'campaign-stack',
      ),
      grid('العروض الحالية داخل Carry Lane', 'elessi-bag-shop-grid', {
        saleOnly: true,
      }),
    ]),
    collections: discoveryPage([
      collectionsSection('ابدئي من نوع الحقيبة أو القطعة المكملة', 'elessi-bag-categories', {
        subtitle:
          'شنط يومية، سفر، هدايا، ومحافظ أو أحزمة في أبواب أوضح من رف أكسسوارات عام.',
        ctaText: 'كل الأقسام',
        ctaLink: '/collections',
        limit: ELESSI_CARRY_LANE_PREVIEW_COLLECTIONS.length,
        collections: ELESSI_CARRY_LANE_PREVIEW_COLLECTIONS,
      }),
      grid('اختيارات من عالم Carry Lane', 'elessi-bag-grid', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation(
        {
          title: 'تم تسجيل طلب Carry Lane',
          description:
            'سنراجع اللون أو التوافر والتغليف ثم نشاركك تحديث التجهيز والتوصيل بشكل واضح ومختصر.',
          continueShoppingText: 'العودة للمتجر',
          orderNumberPrefix: 'رقم الطلب:',
          supportText: 'لو احتجت تعديلًا سريعًا أو ملاحظة تخص اللون أو الهدية تواصلي معنا عبر',
          statusLabel: 'قيد التجهيز',
          whatsappSupportLabel: 'واتساب Carry Lane',
          showTimeline: true,
          showTrackOrder: true,
          showReorder: true,
          showRecommended: true,
          reorderTitle: 'أعيدي نفس التنسيق بسرعة',
          reorderDescription:
            'أضيفي نفس الحقيبة والإضافات إلى السلة مرة واحدة لو حبيتي تكرار الطلب أو شراء هدية مشابهة.',
          recommendedTitle: 'قطع قد تكمل نفس الطلب',
          recommendedSubtitle:
            'محافظ وسكارف وأحزمة من نفس المزاج لو حبيتي توسعي الطلب في نفس اللحظة.',
        },
        'soft-thanks',
      ),
    ]),
  },
  'elessi-pedal-lab': {
    shop: conversionPage(
      [
        shoppingIntents({
          badge: 'ابدأ من نوع الرحلة',
          title: 'أي رحلة أو ترقية تريد حسمها أولًا؟',
          subtitle:
            'قسّمنا الصفحة إلى مدينة، طريق، أمان، وصيانة حتى لا يضيع العميل بين دراجات وقطع متداخلة في رف واحد.',
          items: [
            {
              eyebrow: 'City',
              title: 'دراجات المدينة',
              subtitle: 'موديلات أخف للتنقل اليومي والشوارع السريعة.',
              link: '/shop?category=city-bikes',
              tone: 'primary',
              chip: 'City',
            },
            {
              eyebrow: 'Road',
              title: 'Road & fitness',
              subtitle: 'خيارات أسرع للسرعة واللياقة والطريق الطويل.',
              link: '/shop?category=road-fitness',
              tone: 'accent',
              chip: 'Road',
            },
            {
              eyebrow: 'Safety',
              title: 'خوذات وإضاءة',
              subtitle: 'أمان ورؤية أفضل قبل الخروج أو الرحلة المسائية.',
              link: '/shop?category=helmets-lighting',
              tone: 'emerald',
              chip: 'Safety',
            },
            {
              eyebrow: 'Service',
              title: 'قطع وصيانة',
              subtitle: 'مضخات وإطارات وترقيات تحل المشكلة بسرعة.',
              link: '/shop?category=service-upgrades',
              tone: 'slate',
              chip: 'Service',
            },
          ],
        }),
        commandBar(
          {
            title: 'ابحث عن City Bike أو Helmet أو Pump',
            subtitle:
              'فلتر حسب نوع الدراجة أو القطعة الناقصة بدل البحث داخل شبكة عامة مزدحمة.',
            searchPlaceholder: 'ابحث عن City Bike أو Helmet أو Pump',
            allCategoriesLabel: 'كل الدراجات',
            resultsLabel: 'منتج',
            clearButtonText: 'مسح',
            stickyLabel: 'Pedal Lab',
          },
          'elessi-bike-toolbar',
        ),
        section('filters-sidebar'),
        grid('كل الدراجات والملحقات في Pedal Lab', 'elessi-bike-shop-grid', {
          subtitle:
            'المقاس، السرعات، ونوع الاستخدام ظاهرون بشكل أوضح قبل الدخول لصفحة المنتج.',
        }),
        promoRail({
          badge: 'Ride Ready',
          title: 'القرار هنا يبدأ من الرحلة لا من الكارت فقط',
          subtitle:
            'رتبنا التصفح بين التنقل اليومي، السرعة، الأمان، والصيانة حتى يبقى قرار الشراء عمليًا ومباشرًا.',
          spotlightLabel: 'Setup Builder',
          spotlightTitle: 'ابدأ بالدراجة ثم أضف الأمان والترقية',
          spotlightText:
            'الخوذة أو الإضاءة أو المضخة تظهر كسياق منطقي لنفس الرحلة، لا كاقتراح منفصل بعيد عن نية الشراء.',
          ctaText: 'شاهد كل الأقسام',
          ctaLink: '/collections',
          trustItems:
            'مقاسات أوضح|السرعات والمقاس ونوع الهيكل أقرب للقرار.\nشحن وتجهيز|خطوات أوضح للتجميع والتوصيل.\nترقيات منطقية|الملحقات تظهر ضمن نفس الرحلة.',
          highlights: 'City|جاهز\nRoad|متاح\nService|سريع',
        }),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    pdp: conversionPage(
      [
        productGallery('elessi-bike-gallery'),
        productInfoSection(
          {
            descriptionTitle: 'تفاصيل الدراجة أو القطعة',
            shippingTitle: 'الشحن والتجهيز',
            shippingText:
              'نوضح المقاس، التجميع، وخيارات التوصيل أو الاستلام قبل تثبيت الطلب حتى تقل الحيرة في قرار الشراء.',
            guaranteesTitle: 'قبل ما تعتمد الطلب',
            guaranteesSubtitle:
              'المواصفات، الاستخدام، والملحقات المكملة تظهر في نفس المسار بدل التنقل بين كروت متفرقة.',
            fitNote: 'راجع المقاس أو نوع الاستخدام المناسب قبل الإضافة النهائية.',
          },
          'elessi-bike-buybox',
        ),
        conversionStackSection({}, 'balanced'),
        boughtTogetherSection(
          {
            title: 'إضافات تكمل الرحلة',
            subtitle: 'خوذات، إضاءة، ومضخات تُشترى مع نفس الدراجة أو الترقية باستمرار.',
          },
          'compact',
        ),
        relatedProductsSection(
          {
            title: 'بدائل من نفس الرحلة',
            subtitle: 'موديلات أو قطع قريبة في المقاس أو الاستخدام تساعدك تقفل القرار أسرع.',
          },
          'elessi-bike-related',
        ),
        reviewsSection(
          {
            title: 'تجارب بعد الشراء',
            listTitle: 'آراء الركاب والعملاء',
          },
          'elessi-proof-wall',
        ),
      ],
      {
        layoutHint: 'product-detail',
      },
    ),
    cart: conversionPage(
      [
        cartItems(
          {
            title: 'سلة Pedal Lab',
            subtitle:
              'راجع الدراجة أو الملحقات قبل الإرسال، ثم احسم إذا كنت تحتاج إضافة أمان أو صيانة تكمل نفس الرحلة.',
            continueShoppingText: 'أضف قطعة أخرى',
          },
          'command-cart',
        ),
        orderSummarySection(
          {
            title: 'ملخص التجهيز',
            secureCheckoutText: 'مراجعة واضحة قبل اعتماد الطلب',
            showTrustRow: true,
          },
          'command-summary',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Pedal Lab Checkout',
          message:
            'راجع المقاس أو نوع القطعة والعنوان بهدوء لنقفل الطلب بنفس النبرة الواضحة والعملية للقالب.',
          saleLabel: 'City',
          shippingLabel: 'Setup',
          returnLabel: 'Safety',
          ctaText: 'العودة للمتجر',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'مراجعة الدراجة والملحقات',
            subtitle: 'تأكد من المقاس والكمية والقطع المكملة قبل اعتماد الطلب.',
            continueShoppingText: 'أضف ترقية أخرى',
          },
          'command-cart',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'سنستخدمها لتأكيد الطلب أو مراجعة أي ملاحظة تخص المقاس أو القطعة أو التوافر.',
            shippingTitle: 'عنوان التوصيل',
            shippingDescription:
              'اكتب عنوانًا واضحًا إذا كنت تحتاج شحن الدراجة أو القطع من أول محاولة وبخطوات أقل.',
            notesTitle: 'ملاحظات المقاس أو التجهيز',
            notesDescription:
              'مثل تفضيل مقاس، تنبيه حول التجميع، أو وقت مناسب للاستلام أو التوصيل.',
            notesPlaceholder: 'مثال: أتواصلوا معي لو المقاس المتوسط غير متاح',
          },
          'command-checkout',
        ),
        payment(
          {
            title: 'اعتماد الطلب',
            subtitle:
              'الملخص النهائي واضح ويغلق قرار الدراجة أو الترقية مع رسالة أمان وخطوة متابعة مباشرة.',
            confirmOrderText: 'اعتماد الطلب',
            securityText: 'بياناتك محمية أثناء إتمام الطلب',
            showSummaryCard: false,
          },
          'command-payment',
        ),
        orderSummarySection(
          {
            title: 'ملخص نهائي',
            secureCheckoutText: 'طلب واضح ومراجع',
            showTrustRow: true,
          },
          'command-summary',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Pedal Lab Offers',
        message:
          'عروض على الدراجات اليومية والملحقات الأساسية والترقيات التي تقفل الرحلة بسرعة.',
        saleLabel: 'City',
        shippingLabel: 'Road',
        returnLabel: 'Service',
        ctaText: 'العودة للمتجر',
        ctaLink: '/shop',
      }),
      offerBento(
        {
          badge: 'ابدأ من نوع الطلب',
          title: 'العروض مقسمة حسب الرحلة أو الترقية الأقرب للاستخدام',
          subtitle:
            'دراجة مدينة، موديل طريق، أمان، أو قطع صيانة بدل تكديس عروض تقنية متشابهة.',
          cards: [
            {
              label: 'City',
              title: 'دراجات المدينة',
              subtitle: 'موديلات عملية للتنقل اليومي والشارع السريع.',
              ctaText: 'ابدأ من المدينة',
              link: '/shop?category=city-bikes',
              tone: 'primary',
              stat: 'City',
            },
            {
              label: 'Road',
              title: 'Road & fitness',
              subtitle: 'دراجات أخف للسرعة والتمرين والطريق الطويل.',
              ctaText: 'شاهد الطريق',
              link: '/shop?category=road-fitness',
              tone: 'accent',
              stat: 'Road',
            },
            {
              label: 'Service',
              title: 'صيانة وترقيات',
              subtitle: 'مضخات وإطارات وإضافات تكمل نفس الرحلة أو التجهيز.',
              ctaText: 'ابدأ من القطع',
              link: '/shop?category=service-upgrades',
              tone: 'slate',
              stat: 'Service',
            },
          ],
        },
        'campaign-stack',
      ),
      grid('العروض الحالية داخل Pedal Lab', 'elessi-bike-shop-grid', {
        saleOnly: true,
      }),
    ]),
    collections: discoveryPage([
      collectionsSection('ابدأ من نوع الرحلة أو القطعة الناقصة', 'elessi-bike-panels', {
        subtitle:
          'مدينة، طريق، أمان، وصيانة في مداخل أوضح من رف عام يخلط بين الدراجات والملحقات.',
        ctaText: 'كل الأقسام',
        ctaLink: '/collections',
        limit: ELESSI_PEDAL_LAB_PREVIEW_COLLECTIONS.length,
        collections: ELESSI_PEDAL_LAB_PREVIEW_COLLECTIONS,
      }),
      grid('اختيارات من عالم Pedal Lab', 'elessi-bike-grid', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation(
        {
          title: 'تم تثبيت طلب Pedal Lab',
          description:
            'سنراجع المقاس أو التوافر والتجهيز ثم نشاركك تحديثات الشحن أو الاستلام بشكل واضح ومختصر.',
          continueShoppingText: 'العودة للمتجر',
          orderNumberPrefix: 'رقم الطلب:',
          supportText: 'لو احتجت تعديلًا سريعًا أو ملاحظة تخص المقاس أو التجهيز تواصل معنا عبر',
          statusLabel: 'قيد التجهيز',
          whatsappSupportLabel: 'واتساب Pedal Lab',
          showTimeline: true,
          showTrackOrder: true,
          showReorder: true,
          showRecommended: true,
          reorderTitle: 'أعد نفس التجهيز بسرعة',
          reorderDescription:
            'أضف نفس الدراجة أو القطع المكملة إلى السلة مرة واحدة لو كنت تعيد نفس الرحلة أو تشتري تجهيزًا مشابهًا.',
          recommendedTitle: 'قطع قد تكمل نفس الرحلة',
          recommendedSubtitle:
            'خوذات وإضاءة ومضخات أو بدائل قريبة تظهر لك بعد الطلب بدل أن تبقى اقتراحات معزولة.',
          recommendedVariant: 'standard',
        },
        'command-aftercare',
      ),
    ]),
  },
  'elessi-harvest-fold': {
    shop: conversionPage(
      [
        shoppingIntents({
          badge: 'ابدأ من نوع الطلب',
          title: 'أي رف أو صندوق يقفل طلب البيت أسرع؟',
          subtitle:
            'قسّمنا الصفحة إلى خضار يومي، فاكهة، مونة، وصناديق عائلية حتى لا يضيع العميل بين منتجات متفرقة داخل سوق عام.',
          items: [
            {
              eyebrow: 'Daily',
              title: 'خضار يومي',
              subtitle: 'ورقيات وأعشاب واحتياجات المطبخ السريعة.',
              link: '/shop?category=leafy-greens',
              tone: 'primary',
              chip: 'Daily',
            },
            {
              eyebrow: 'Fruit',
              title: 'صناديق فاكهة',
              subtitle: 'حمضيات وفاكهة مرتبة للبيت والضيافة.',
              link: '/shop?category=fruit-boxes',
              tone: 'accent',
              chip: 'Fruit',
            },
            {
              eyebrow: 'Pantry',
              title: 'مونة وفطور',
              subtitle: 'جرانولا ودبس وإضافات تكمّل سلة الصباح.',
              link: '/shop?category=pantry-basics',
              tone: 'emerald',
              chip: 'Pantry',
            },
            {
              eyebrow: 'Family',
              title: 'صناديق أسبوعية',
              subtitle: 'حل أسرع للطلبات العائلية المتكررة وقيمة سلة أعلى.',
              link: '/shop?category=family-crates',
              tone: 'slate',
              chip: 'Family',
            },
          ],
        }),
        commandBar(
          {
            title: 'ابحث عن Herbs أو Box أو Tomato',
            subtitle:
              'فلتر حسب نوع الطلب أو الموسم أو الصندوق المناسب بدل التنقل داخل رف كثيف ومتكرر.',
            searchPlaceholder: 'ابحث عن Herbs أو Box أو Tomato',
            allCategoriesLabel: 'كل الأقسام',
            resultsLabel: 'منتج',
            clearButtonText: 'مسح',
            stickyLabel: 'Harvest Fold',
          },
          'elessi-organic-toolbar',
        ),
        section('filters-sidebar'),
        grid('رفوف اليوم في Harvest Fold', 'elessi-organic-shop-grid', {
          subtitle:
            'الحجم والسعر ونوع العبوة ظاهرون بشكل أوضح قبل الدخول لصفحة المنتج أو إضافة الصندوق.',
        }),
        promoRail({
          badge: 'Fresh Basket',
          title: 'القرار هنا يبدأ من نوع السلة أو الصندوق',
          subtitle:
            'رتبنا الرحلة بين الخضار اليومي والفاكهة والمونة والصناديق العائلية حتى يبقى الطلب أقرب لسلوك السوق الحقيقي.',
          spotlightLabel: 'Weekly Box',
          spotlightTitle: 'ابدأ بصندوق البيت ثم أضف الفطور أو الأعشاب',
          spotlightText:
            'المونة أو الأعشاب تظهر كسياق منطقي لنفس السلة، لا كاقتراح عام بعيد عن احتياج الطلب المتكرر.',
          ctaText: 'شاهد كل الأقسام',
          ctaLink: '/collections',
          trustItems:
            'حجم أوضح|الوزن والعبوة والصندوق أقرب للقرار.\nتوصيل واضح|موعد الوصول ومتابعة السلة مرئيان.\nإعادة طلب أسرع|الصندوق أو السلة المتكررة تبقى أسهل في التكرار.',
          highlights: 'Daily|جاهز\nFamily|أسبوعي\nPantry|مكمل',
        }),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    pdp: conversionPage(
      [
        productGallery('elessi-organic-gallery'),
        productInfoSection(
          {
            descriptionTitle: 'تفاصيل العبوة أو الصندوق',
            shippingTitle: 'التوصيل والتجهيز',
            shippingText:
              'نوضح الوزن أو الحجم وموعد التوصيل وملاحظات التجهيز قبل تثبيت الطلب حتى يكون القرار أسرع وأهدأ.',
            guaranteesTitle: 'قبل ما تعتمدي السلة',
            guaranteesSubtitle:
              'الوزن، نوع العبوة، والإضافات المكملة تظهر في نفس المسار بدل توزيعها بين بطاقات متفرقة.',
            fitNote: 'راجعي حجم العبوة أو الصندوق المناسب لعدد الأفراد أو وتيرة الطلب.',
          },
          'elessi-organic-buybox',
        ),
        conversionStackSection({}, 'seamless'),
        boughtTogetherSection(
          {
            title: 'إضافات تكمل نفس السلة',
            subtitle: 'أعشاب ومونة وفطور أو صناديق أكبر تُطلب مع نفس الاحتياج باستمرار.',
          },
          'compact',
        ),
        relatedProductsSection(
          {
            title: 'اختيارات من نفس الرف',
            subtitle: 'بدائل أو صناديق قريبة من نفس الاحتياج اليومي أو العائلي.',
          },
          'elessi-organic-related',
        ),
        reviewsSection(
          {
            title: 'تجارب بعد الطلب',
            listTitle: 'آراء البيت والسلة الأسبوعية',
          },
          'elessi-story-grid',
        ),
      ],
      {
        layoutHint: 'product-detail',
      },
    ),
    cart: conversionPage(
      [
        cartItems(
          {
            title: 'سلة Harvest Fold',
            subtitle:
              'راجعي الصندوق أو الرفوف المختارة قبل الإرسال، ثم أضيفي ما يكمل طلب البيت من غير تشتيت.',
            continueShoppingText: 'أضيفي منتجًا آخر',
          },
          'nature-cart',
        ),
        orderSummarySection(
          {
            title: 'ملخص السلة',
            secureCheckoutText: 'مراجعة هادئة قبل الاعتماد',
            showTrustRow: true,
          },
          'nature-summary',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Harvest Fold Checkout',
          message:
            'راجعي الصندوق أو العبوة والعنوان بهدوء لنقفل طلب البيت بنفس النبرة الواضحة والمرتبة للقالب.',
          saleLabel: 'Daily',
          shippingLabel: 'Fresh',
          returnLabel: 'Family',
          ctaText: 'العودة للمتجر',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'مراجعة سلة البيت',
            subtitle: 'تأكدي من الحجم أو الصندوق والكميات قبل اعتماد الطلب.',
            continueShoppingText: 'أضيفي احتياجًا آخر',
          },
          'nature-cart',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'سنستخدمها لتأكيد الطلب أو مراجعة أي ملاحظة تخص العبوة أو التوافر أو التوصيل.',
            shippingTitle: 'عنوان التوصيل',
            shippingDescription:
              'اكتبي عنوانًا واضحًا لنصل بالسلة أو الصندوق من أول محاولة وبموعد أوضح.',
            notesTitle: 'ملاحظات السلة أو التوصيل',
            notesDescription:
              'مثل وقت مناسب للاستلام أو بديل لو العبوة غير متاحة أو تفضيل بخصوص الصندوق.',
            notesPlaceholder: 'مثال: لو الصندوق العائلي غير متاح تواصلوا معي قبل التنفيذ',
          },
          'nature-checkout',
        ),
        payment(
          {
            title: 'اعتماد الطلب',
            subtitle:
              'الملخص النهائي واضح ويغلق قرار السلة أو الصندوق مع رسالة أمان وخطوة متابعة مباشرة.',
            confirmOrderText: 'تأكيد الطلب',
            securityText: 'بياناتك محمية أثناء إتمام الطلب',
            showSummaryCard: false,
          },
          'nature-payment',
        ),
        orderSummarySection(
          {
            title: 'ملخص نهائي',
            secureCheckoutText: 'طلب هادئ ومراجع',
            showTrustRow: true,
          },
          'nature-summary',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Harvest Fold Offers',
        message:
          'عروض على خضار اليوم والفاكهة والمونة والصناديق التي تكمل طلب البيت بسرعة ووضوح.',
        saleLabel: 'Daily',
        shippingLabel: 'Fruit',
        returnLabel: 'Family',
        ctaText: 'العودة للمتجر',
        ctaLink: '/shop',
      }),
      offerBento(
        {
          badge: 'ابدأ من نوع السلة',
          title: 'العروض مقسمة حسب الرف أو الصندوق الأقرب لاستخدام البيت',
          subtitle:
            'خضار يومي، فاكهة، مونة، أو صناديق أسبوعية بدل تكديس عروض لا تساعد على القرار السريع.',
          cards: [
            {
              label: 'Daily',
              title: 'خضار يومي',
              subtitle: 'ورقيات وأعشاب واحتياجات مطبخ سريعة الدوران.',
              ctaText: 'ابدأ من الخضار',
              link: '/shop?category=leafy-greens',
              tone: 'primary',
              stat: 'Daily',
            },
            {
              label: 'Fruit',
              title: 'صناديق فاكهة',
              subtitle: 'حمضيات وفاكهة مرتبة للبيت أو الضيافة.',
              ctaText: 'شاهدي الفاكهة',
              link: '/shop?category=fruit-boxes',
              tone: 'accent',
              stat: 'Fruit',
            },
            {
              label: 'Family',
              title: 'صناديق أسبوعية',
              subtitle: 'حل أسرع للطلبات العائلية المتكررة وقيمة سلة أعلى.',
              ctaText: 'ابدئي من الصندوق',
              link: '/shop?category=family-crates',
              tone: 'slate',
              stat: 'Family',
            },
          ],
        },
        'campaign-stack',
      ),
      grid('العروض الحالية داخل Harvest Fold', 'elessi-organic-shop-grid', {
        saleOnly: true,
      }),
    ]),
    collections: discoveryPage([
      collectionsSection('ابدئي من نوع السلة أو الصندوق', 'elessi-organic-routes', {
        subtitle:
          'خضار يومي، فاكهة، مونة، وصناديق أسبوعية في مداخل أوضح من رف سوق عام مزدحم.',
        ctaText: 'كل الأقسام',
        ctaLink: '/collections',
        limit: ELESSI_HARVEST_FOLD_PREVIEW_COLLECTIONS.length,
        collections: ELESSI_HARVEST_FOLD_PREVIEW_COLLECTIONS,
      }),
      grid('اختيارات من عالم Harvest Fold', 'elessi-organic-market-grid', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation(
        {
          title: 'تم تثبيت طلب Harvest Fold',
          description:
            'سنراجع التوافر أو بدائل الصندوق ثم نشاركك تحديثات التوصيل والمتابعة بشكل واضح ومختصر.',
          continueShoppingText: 'العودة للمتجر',
          orderNumberPrefix: 'رقم الطلب:',
          supportText: 'لو احتجت تعديلًا سريعًا أو ملاحظة تخص الصندوق أو التوصيل تواصلي معنا عبر',
          statusLabel: 'قيد التجهيز',
          whatsappSupportLabel: 'واتساب Harvest Fold',
          showTimeline: true,
          showTrackOrder: true,
          showReorder: true,
          showRecommended: true,
          reorderTitle: 'أعيدي نفس سلة البيت بسرعة',
          reorderDescription:
            'أضيفي نفس الصندوق أو الرفوف إلى السلة مرة واحدة لو كنت تكررين طلب البيت الأسبوعي أو تجهزين زيارة جديدة.',
          recommendedTitle: 'إضافات قد تكمل نفس السلة',
          recommendedSubtitle:
            'مونة الفطور أو الأعشاب أو صناديق أكبر تظهر بعد الطلب كامتداد طبيعي لنفس الاحتياج.',
          recommendedVariant: 'standard',
        },
        'nature-aftercare',
      ),
    ]),
  },
  'elessi-signal-deck': {
    shop: conversionPage(
      [
        shoppingIntents({
          badge: 'ابدأ من الاستخدام',
          title: 'أي تجهيز تقني تريد حسمه أولًا؟',
          subtitle:
            'قسّمنا الصفحة إلى أجهزة خفيفة، صناعة محتوى، مكتب، وتنقل وطاقة حتى يصل العميل للتركيبة المناسبة بدل رف أجهزة عام.',
          items: [
            {
              eyebrow: 'Laptop',
              title: 'أجهزة خفيفة',
              subtitle: 'لابتوبات للشغل والدراسة والتنقل اليومي.',
              link: '/shop?category=ultrabooks',
              tone: 'primary',
              chip: 'Laptop',
            },
            {
              eyebrow: 'Creator',
              title: 'صناعة ومحتوى',
              subtitle: 'أدوات إنتاجية ومحتوى بمواصفات أقرب للقرار.',
              link: '/shop?category=creator-labs',
              tone: 'accent',
              chip: 'Creator',
            },
            {
              eyebrow: 'Desk',
              title: 'معدات مكتب',
              subtitle: 'كيبوردات وماوسات وحوامل تكمّل المكتب بسرعة.',
              link: '/shop?category=desk-gear',
              tone: 'emerald',
              chip: 'Desk',
            },
            {
              eyebrow: 'Travel',
              title: 'تنقل وطاقة',
              subtitle: 'شواحن ومحاور وإضافات سريعة للسفر والعمل المتحرك.',
              link: '/shop?category=carry-power',
              tone: 'slate',
              chip: 'Travel',
            },
          ],
        }),
        commandBar(
          {
            title: 'ابحث عن Laptop أو Keyboard أو Hub',
            subtitle:
              'ابدأ من الفئة أو ابحث بالمواصفة، ثم صفِّ النتائج بسرعة حتى تصل للجهاز أو الملحق المناسب بدون تشتت.',
            searchPlaceholder: 'ابحث عن Laptop أو Keyboard أو Hub',
            allCategoriesLabel: 'كل المنتجات',
            resultsLabel: 'منتج',
            clearButtonText: 'مسح',
            stickyLabel: 'Signal Deck',
          },
          'elessi-digital-toolbar',
        ),
        section('filters-sidebar'),
        grid('كل الأجهزة والملحقات في Signal Deck', 'elessi-digital-catalog-grid', {
          subtitle:
            'السعر والمواصفات الأساسية والنسخة المناسبة تظهر بشكل أوضح قبل الدخول لصفحة المنتج.',
        }),
        promoRail({
          badge: 'Decision Deck',
          title: 'القرار هنا يبدأ من الاحتياج لا من قائمة المواصفات فقط',
          subtitle:
            'رتبنا الرحلة بين الجهاز الأساسي، أدوات المكتب، والترقيات السريعة حتى لا يضيع العميل بين موديلات متشابهة.',
          spotlightLabel: 'Setup Builder',
          spotlightTitle: 'ابدأ بالجهاز ثم أضف المكتب أو الطاقة',
          spotlightText:
            'الكيبورد أو الماوس أو الـ hub يظهرون كامتداد منطقي لنفس قرار الشراء لا كاقتراح منفصل بعيد عن السياق.',
          ctaText: 'شاهد كل الأقسام',
          ctaLink: '/collections',
          trustItems:
            'مواصفات أوضح|الرام والتخزين والطاقة أقرب للقرار.\nدعم موثق|الشحن والضمان ظاهرون بوضوح.\nترقيات منطقية|الملحقات تظهر داخل نفس الرحلة.',
          highlights: 'Laptop|جاهز\nDesk|مرتب\nTravel|سريع',
        }),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    pdp: conversionPage(
      [
        productGallery('elessi-digital-gallery'),
        productInfoSection(
          {
            descriptionTitle: 'تفاصيل الجهاز أو الملحق',
            shippingTitle: 'الشحن والدعم',
            shippingText:
              'الشحن السريع، الاستبدال، وخيارات الضمان تظهر بوضوح قبل إنهاء الطلب حتى يبقى القرار التقني مطمئنًا من أول صفحة.',
            guaranteesTitle: 'إشارات الثقة',
            guaranteesSubtitle:
              'تجهيزات موثقة، دعم واضح، ومواصفات أقرب لقرار الشراء داخل نفس المسار.',
            fitNote: 'راجع المواصفات الأساسية والنسخة الأنسب لاستخدامك قبل الإضافة النهائية.',
          },
          'elessi-digital-buybox',
        ),
        conversionStackSection({}, 'balanced'),
        boughtTogetherSection(
          {
            title: 'إضافات تكمل نفس التجهيز',
            subtitle: 'محاور وماوسات وملحقات مكتب تُشترى مع نفس الجهاز أو نفس السيناريو باستمرار.',
          },
          'compact',
        ),
        relatedProductsSection(
          {
            title: 'بدائل من نفس الفئة',
            subtitle: 'أجهزة أو ملحقات قريبة في الاستخدام تساعدك تقارن أو تغلق القرار أسرع.',
          },
          'elessi-digital-related',
        ),
        reviewsSection(
          {
            title: 'تجارب بعد الشراء',
            listTitle: 'آراء الاستخدام الفعلي',
          },
          'elessi-proof-wall',
        ),
      ],
      {
        layoutHint: 'product-detail',
      },
    ),
    cart: conversionPage(
      [
        cartItems(
          {
            title: 'سلة Signal Deck',
            subtitle:
              'راجع الجهاز أو الملحقات قبل الإرسال، ثم أضف ما يكمل نفس التجهيز من غير الرجوع إلى رف عام.',
            continueShoppingText: 'أضف ترقية أخرى',
          },
          'command-cart',
        ),
        orderSummarySection(
          {
            title: 'ملخص التجهيز',
            secureCheckoutText: 'مراجعة واضحة قبل اعتماد الطلب',
            showTrustRow: true,
          },
          'command-summary',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Signal Deck Checkout',
          message:
            'راجع المواصفات أو النسخة والعنوان بهدوء لنقفل الطلب بنفس النبرة الواضحة والعملية للقالب.',
          saleLabel: 'Laptop',
          shippingLabel: 'Desk',
          returnLabel: 'Travel',
          ctaText: 'العودة للمتجر',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'مراجعة الأجهزة والملحقات',
            subtitle: 'تأكد من النسخة والمواصفات والقطع المكملة قبل اعتماد الطلب.',
            continueShoppingText: 'أضف ملحقًا آخر',
          },
          'command-cart',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'سنستخدمها لتأكيد الطلب أو مراجعة أي ملاحظة تخص النسخة أو المواصفة أو التوافر.',
            shippingTitle: 'عنوان التوصيل',
            shippingDescription:
              'اكتب عنوانًا واضحًا إذا كنت تحتاج شحن الجهاز أو الملحقات من أول محاولة وبخطوات أقل.',
            notesTitle: 'ملاحظات النسخة أو الدعم',
            notesDescription:
              'مثل تفضيل حول الرام أو التخزين أو سؤال سريع عن الضمان أو وقت مناسب للاستلام.',
            notesPlaceholder: 'مثال: تواصلوا معي لو نسخة 16GB غير متاحة',
          },
          'command-checkout',
        ),
        payment(
          {
            title: 'اعتماد الطلب',
            subtitle:
              'الملخص النهائي واضح ويغلق قرار الجهاز أو الترقية مع رسالة أمان وخطوة متابعة مباشرة.',
            confirmOrderText: 'اعتماد الطلب',
            securityText: 'بياناتك محمية أثناء إتمام الطلب',
            showSummaryCard: false,
          },
          'command-payment',
        ),
        orderSummarySection(
          {
            title: 'ملخص نهائي',
            secureCheckoutText: 'طلب واضح ومراجع',
            showTrustRow: true,
          },
          'command-summary',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Signal Deck Offers',
        message:
          'عروض على الأجهزة اليومية وملحقات المكتب والتنقل التي تقفل التجهيز بسرعة ووضوح.',
        saleLabel: 'Laptop',
        shippingLabel: 'Desk',
        returnLabel: 'Travel',
        ctaText: 'العودة للمتجر',
        ctaLink: '/shop',
      }),
      offerBento(
        {
          badge: 'ابدأ من نوع التجهيز',
          title: 'العروض مقسمة حسب الاستخدام أو الترقية الأقرب لقرار الشراء',
          subtitle:
            'أجهزة خفيفة، أدوات مكتب، أو تنقل وطاقة بدل تكديس عروض تقنية متشابهة في رف واحد.',
          cards: [
            {
              label: 'Laptop',
              title: 'أجهزة خفيفة',
              subtitle: 'موديلات للشغل والدراسة والتنقل اليومي بمقارنة أسرع.',
              ctaText: 'ابدأ من الأجهزة',
              link: '/shop?category=ultrabooks',
              tone: 'primary',
              stat: 'Laptop',
            },
            {
              label: 'Desk',
              title: 'معدات مكتب',
              subtitle: 'ملحقات تكمل المكتب اليومي والإنتاجية داخل نفس الرحلة.',
              ctaText: 'شاهد المكتب',
              link: '/shop?category=desk-gear',
              tone: 'accent',
              stat: 'Desk',
            },
            {
              label: 'Travel',
              title: 'تنقل وطاقة',
              subtitle: 'محاور وشواحن وإضافات تقلل وقت القرار في الترقية السريعة.',
              ctaText: 'ابدأ من التنقل',
              link: '/shop?category=carry-power',
              tone: 'slate',
              stat: 'Travel',
            },
          ],
        },
        'campaign-stack',
      ),
      grid('العروض الحالية داخل Signal Deck', 'elessi-digital-catalog-grid', {
        saleOnly: true,
      }),
    ]),
    collections: discoveryPage([
      collectionsSection('ابدأ من نوع الجهاز أو الملحق', 'elessi-digital-departments', {
        subtitle:
          'أجهزة خفيفة، صناعة ومحتوى، مكتب، وتنقل وطاقة في مداخل أوضح من كتالوج أجهزة عام.',
        ctaText: 'كل الأقسام',
        ctaLink: '/collections',
        limit: ELESSI_SIGNAL_DECK_PREVIEW_COLLECTIONS.length,
        collections: ELESSI_SIGNAL_DECK_PREVIEW_COLLECTIONS,
      }),
      grid('اختيارات من عالم Signal Deck', 'elessi-digital-launch-grid', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation(
        {
          title: 'تم تسجيل طلب Signal Deck',
          description:
            'سنراجع المواصفات أو التوافر ثم نشاركك تحديثات الشحن أو الاستلام بشكل واضح ومختصر.',
          continueShoppingText: 'العودة للمتجر',
          orderNumberPrefix: 'رقم الطلب:',
          supportText: 'لو احتجت تعديلًا سريعًا أو ملاحظة تخص النسخة أو الدعم تواصل معنا عبر',
          statusLabel: 'قيد التجهيز',
          whatsappSupportLabel: 'واتساب Signal Deck',
          showTimeline: true,
          showTrackOrder: true,
          showReorder: true,
          showRecommended: true,
          reorderTitle: 'أعد نفس التجهيز بسرعة',
          reorderDescription:
            'أضف نفس الجهاز أو الملحقات إلى السلة مرة واحدة لو كنت تعيد نفس setup أو تجهز طلبًا مشابهًا.',
          recommendedTitle: 'ملحقات قد تكمل نفس الطلب',
          recommendedSubtitle:
            'محاور وماوسات وحوامل أو بدائل قريبة تظهر لك بعد الطلب بدل أن تبقى اقتراحات معزولة.',
          recommendedVariant: 'standard',
        },
        'command-aftercare',
      ),
    ]),
  },
  'elessi-tail-supply': {
    shop: conversionPage(
      [
        shoppingIntents({
          badge: 'ابدأ من الروتين',
          title: 'أي روتين يقفل احتياج الحيوان أسرع؟',
          subtitle:
            'قسّمنا الصفحة إلى طعام يومي، لعب، عناية، وخروج حتى لا يضيع المربي بين منتجات كثيرة داخل رف عام.',
          items: [
            {
              eyebrow: 'Food',
              title: 'طعام يومي',
              subtitle: 'طلبات متكررة أسهل في الإعادة والحجم والنوع.',
              link: '/shop?category=pet-food',
              tone: 'primary',
              chip: 'Food',
            },
            {
              eyebrow: 'Play',
              title: 'لعب ونشاط',
              subtitle: 'منتجات حركة ترفع السلة بسرعة وتخدم اليوم الطويل.',
              link: '/shop?category=pet-play',
              tone: 'accent',
              chip: 'Play',
            },
            {
              eyebrow: 'Care',
              title: 'عناية وتنظيف',
              subtitle: 'شامبو وفرش وأدوات ثقة للاستخدام المتكرر في البيت.',
              link: '/shop?category=pet-care',
              tone: 'emerald',
              chip: 'Care',
            },
            {
              eyebrow: 'Walk',
              title: 'نزهة وخروج',
              subtitle: 'أطواق وأحزمة وإضافات تجعل الخروج أسهل وأوضح في الاختيار.',
              link: '/shop?category=walk-travel',
              tone: 'slate',
              chip: 'Walk',
            },
          ],
        }),
        commandBar(
          {
            title: 'ابحث عن Food أو Toy أو Collar',
            subtitle:
              'ابحث حسب النوع أو الاستخدام أو الوجبة ثم ادخل مباشرة إلى الشبكة المناسبة بدل التنقل داخل رف مزدحم.',
            searchPlaceholder: 'ابحث عن Food أو Toy أو Collar',
            allCategoriesLabel: 'كل المنتجات',
            resultsLabel: 'منتج',
            clearButtonText: 'مسح',
            stickyLabel: 'Tail Supply',
          },
          'elessi-filter-deck',
        ),
        section('filters-sidebar'),
        grid('كل مستلزمات الحيوانات في Tail Supply', 'elessi-compact-shelf', {
          subtitle:
            'الحجم والنوع وسياق الاستخدام ظاهرون بشكل أوضح قبل الإضافة، خصوصًا للطلبات المتكررة.',
        }),
        promoRail({
          badge: 'Pet Routine',
          title: 'القرار هنا يبدأ من روتين الحيوان لا من الرف العام',
          subtitle:
            'رتبنا الرحلة بين الأكل واللعب والعناية والخروج حتى يبقى الشراء أسرع وأهدأ للمربي.',
          spotlightLabel: 'Repeat Basket',
          spotlightTitle: 'ابدأ بالطعام ثم أضف العناية أو الخروج',
          spotlightText:
            'الأطواق أو الفرش أو الأسرة تظهر كسياق منطقي لنفس الروتين، لا كاقتراح منفصل بعيد عن الحاجة اليومية.',
          ctaText: 'شاهد كل الأقسام',
          ctaLink: '/collections',
          trustItems:
            'أحجام أوضح|الحجم والنوع والاستخدام أقرب للقرار.\nإعادة أسرع|الطلبات المتكررة تبقى أسهل في التكرار.\nاختيارات مطمئنة|العناية والخروج يظهران ضمن نفس الرحلة.',
          highlights: 'Food|متكرر\nCare|مرتب\nWalk|جاهز',
        }),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    pdp: conversionPage(
      [
        productGallery('elessi-showroom'),
        productInfoSection(
          {
            descriptionTitle: 'تفاصيل المنتج والاستخدام',
            shippingTitle: 'التوصيل والعناية',
            shippingText:
              'نوضح الحجم أو النوع وطريقة التوصيل وما يناسب الحيوان قبل تثبيت الطلب حتى يبقى القرار مطمئنًا من أول صفحة.',
            guaranteesTitle: 'قبل ما تعتمدي الطلب',
            guaranteesSubtitle:
              'الاستخدام، الحجم، والإضافات المكملة تظهر داخل نفس المسار بدل توزيعها على رفوف متباعدة.',
            fitNote: 'راجعي الحجم أو نوع الاستخدام المناسب قبل الإضافة النهائية.',
          },
          'elessi-pet-buybox',
        ),
        conversionStackSection({}, 'seamless'),
        boughtTogetherSection(
          {
            title: 'إضافات تكمل نفس الروتين',
            subtitle: 'لعب وعناية وخروج تُشترى مع نفس الاحتياج باستمرار.',
          },
          'compact',
        ),
        relatedProductsSection(
          {
            title: 'اختيارات من نفس الروتين',
            subtitle: 'بدائل أو إضافات قريبة من نفس الاستخدام اليومي للحيوان.',
          },
          'elessi-complete-set',
        ),
        reviewsSection(
          {
            title: 'تجارب المربين',
            listTitle: 'آراء بعد الاستخدام',
          },
          'elessi-proof-wall',
        ),
      ],
      {
        layoutHint: 'product-detail',
      },
    ),
    cart: conversionPage(
      [
        cartItems(
          {
            title: 'سلة Tail Supply',
            subtitle:
              'راجعي الطلبات المتكررة أو مستلزمات الروتين قبل الإرسال، ثم أضيفي ما يكمل نفس الاحتياج من غير لف طويل.',
            continueShoppingText: 'أضيفي منتجًا آخر',
          },
          'nature-cart',
        ),
        orderSummarySection(
          {
            title: 'ملخص السلة',
            secureCheckoutText: 'مراجعة هادئة قبل الاعتماد',
            showTrustRow: true,
          },
          'nature-summary',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Tail Supply Checkout',
          message:
            'راجعي الحجم أو النوع والعنوان بهدوء لنقفل طلب الروتين بنفس النبرة الواضحة والمرتبة للقالب.',
          saleLabel: 'Food',
          shippingLabel: 'Care',
          returnLabel: 'Walk',
          ctaText: 'العودة للمتجر',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'مراجعة مستلزمات الحيوان',
            subtitle: 'تأكدي من الحجم أو النوع والكميات قبل اعتماد الطلب.',
            continueShoppingText: 'أضيفي منتجًا آخر',
          },
          'nature-cart',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'سنستخدمها لتأكيد الطلب أو مراجعة أي ملاحظة تخص الحجم أو النوع أو التوافر.',
            shippingTitle: 'عنوان التوصيل',
            shippingDescription:
              'اكتبي عنوانًا واضحًا لنصل بالطلب من أول محاولة وبخطوات أقل، خصوصًا للطلبات المتكررة.',
            notesTitle: 'ملاحظات الروتين أو التوصيل',
            notesDescription:
              'مثل تفضيل حجم بديل أو وقت مناسب للاستلام أو تنبيه يخص الحيوان أو المنزل.',
            notesPlaceholder: 'مثال: تواصلوا معي لو حجم 2 كجم غير متاح',
          },
          'nature-checkout',
        ),
        payment(
          {
            title: 'اعتماد الطلب',
            subtitle:
              'الملخص النهائي واضح ويغلق قرار الروتين أو الإضافة مع رسالة أمان وخطوة متابعة مباشرة.',
            confirmOrderText: 'تأكيد الطلب',
            securityText: 'بياناتك محمية أثناء إتمام الطلب',
            showSummaryCard: false,
          },
          'nature-payment',
        ),
        orderSummarySection(
          {
            title: 'ملخص نهائي',
            secureCheckoutText: 'طلب هادئ ومراجع',
            showTrustRow: true,
          },
          'nature-summary',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Tail Supply Offers',
        message:
          'عروض على الطعام اليومي واللعب والعناية وإضافات الخروج التي تقفل روتين الحيوان بسرعة.',
        saleLabel: 'Food',
        shippingLabel: 'Play',
        returnLabel: 'Care',
        ctaText: 'العودة للمتجر',
        ctaLink: '/shop',
      }),
      offerBento(
        {
          badge: 'ابدأ من الروتين',
          title: 'العروض مقسمة حسب نوع الاحتياج اليومي للحيوان',
          subtitle:
            'طعام، لعب، عناية، أو خروج بدل تكديس عروض كثيرة لا تختصر قرار المربي بسرعة.',
          cards: [
            {
              label: 'Food',
              title: 'طعام يومي',
              subtitle: 'طلبات متكررة بأحجام أوضح وإعادة أسرع.',
              ctaText: 'ابدأ من الطعام',
              link: '/shop?category=pet-food',
              tone: 'primary',
              stat: 'Food',
            },
            {
              label: 'Care',
              title: 'عناية وتنظيف',
              subtitle: 'فرش وشامبو وأدوات تساعد على روتين مطمئن داخل البيت.',
              ctaText: 'شاهدي العناية',
              link: '/shop?category=pet-care',
              tone: 'accent',
              stat: 'Care',
            },
            {
              label: 'Walk',
              title: 'نزهة وخروج',
              subtitle: 'أطواق وأحزمة وإضافات تكمل الخروج أو السفر القصير.',
              ctaText: 'ابدئي من الخروج',
              link: '/shop?category=walk-travel',
              tone: 'slate',
              stat: 'Walk',
            },
          ],
        },
        'campaign-stack',
      ),
      grid('العروض الحالية داخل Tail Supply', 'elessi-compact-shelf', {
        saleOnly: true,
      }),
    ]),
    collections: discoveryPage([
      collectionsSection('ابدئي من روتين الحيوان أو نوع الطلب', 'elessi-utility-cards', {
        subtitle:
          'طعام يومي، لعب، عناية، وخروج في مداخل أوضح من رف كبير لا يفرّق بين احتياجات الروتين.',
        ctaText: 'كل الأقسام',
        ctaLink: '/collections',
        limit: ELESSI_TAIL_SUPPLY_PREVIEW_COLLECTIONS.length,
        collections: ELESSI_TAIL_SUPPLY_PREVIEW_COLLECTIONS,
      }),
      grid('اختيارات من عالم Tail Supply', 'elessi-listing-grid', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation(
        {
          title: 'تم تثبيت طلب Tail Supply',
          description:
            'سنراجع التوافر أو الحجم ثم نشاركك تحديثات التوصيل والمتابعة بشكل واضح ومختصر.',
          continueShoppingText: 'العودة للمتجر',
          orderNumberPrefix: 'رقم الطلب:',
          supportText: 'لو احتجت تعديلًا سريعًا أو ملاحظة تخص الروتين أو الحجم تواصلي معنا عبر',
          statusLabel: 'قيد التجهيز',
          whatsappSupportLabel: 'واتساب Tail Supply',
          showTimeline: true,
          showTrackOrder: true,
          showReorder: true,
          showRecommended: true,
          reorderTitle: 'أعيدي نفس الروتين بسرعة',
          reorderDescription:
            'أضيفي نفس المنتجات إلى السلة مرة واحدة لو كان هذا جزءًا من طلب متكرر أو روتين يومي ثابت.',
          recommendedTitle: 'منتجات قد تكمل نفس الروتين',
          recommendedSubtitle:
            'عناية أو لعب أو إضافات خروج تظهر بعد الطلب كامتداد طبيعي لنفس الاحتياج.',
          recommendedVariant: 'standard',
        },
        'nature-aftercare',
      ),
    ]),
  },
  'electronics-demo': {
    shop: conversionPage(
      [
        hero('cyber-glitch', {
          eyebrow: 'Electronics Command',
          title: 'كتالوج تقني أوضح من أول بحث حتى آخر مقارنة',
          subtitle:
            'حوّلنا صفحة المتجر من رف عام خفيف إلى مسار شراء أوضح للأجهزة والملحقات والعروض.',
          ctaText: 'ابدأ من اللابتوبات',
          ctaLink: '/shop?category=laptops',
          secondaryCtaText: 'شاهد العروض',
          secondaryCtaLink: '/sale',
        }),
        shoppingIntents({
          badge: 'ابدأ من الاستخدام',
          title: 'اختر المسار الأقرب لاحتياجك',
          subtitle:
            'لابتوبات للعمل، شاشات للمكتب، إكسسوارات للإنتاجية، أو عروض تقلل وقت القرار.',
          items: [
            {
              eyebrow: 'Laptop',
              title: 'لابتوبات الإنتاجية',
              subtitle: 'اختيارات أوضح للعمل، الدراسة، والتنقل اليومي.',
              link: '/shop?category=laptops',
              tone: 'primary',
              chip: 'Laptop',
            },
            {
              eyebrow: 'Display',
              title: 'شاشات وترقيات المكتب',
              subtitle: 'ابدأ من العرض أو التوصيل أو مساحة المكتب المناسبة.',
              link: '/shop?category=monitors',
              tone: 'accent',
              chip: 'Display',
            },
            {
              eyebrow: 'Accessories',
              title: 'ملحقات تكمل التجهيز',
              subtitle: 'كيبورد، ماوس، docks، وصوتيات تُشترى معًا باستمرار.',
              link: '/collections',
              tone: 'emerald',
              chip: 'Accessories',
            },
            {
              eyebrow: 'Deals',
              title: 'عروض الترقية',
              subtitle: 'خصومات وباقات تساعدك تغلق القرار بسرعة ومن غير تشتيت.',
              link: '/sale',
              tone: 'slate',
              chip: 'Deals',
            },
          ],
        }),
        commandBar(
          {
            title: 'ابحث بالجهاز أو الملحق أو الاستخدام',
            subtitle:
              'مثال: لابتوب، شاشة، dock، كيبورد، أو سماعة للعمل والبث.',
            searchPlaceholder: 'ابحث (مثال: شاشة QHD أو dock)',
            allCategoriesLabel: 'كل الأجهزة',
            resultsLabel: 'منتج',
            clearButtonText: 'إعادة الضبط',
            stickyLabel: 'Tech Finder',
          },
          'marketplace-dense',
        ),
        section('filters-sidebar'),
        grid('كل الأجهزة والإكسسوارات', 'glass-card'),
        promoRail(
          {
            badge: 'Buying Notes',
            title: 'رسائل قرار الشراء أصبحت داخل نفس الصفحة',
            subtitle:
              'التوافق، الشحن، والمنتجات التي تُشترى معًا تظهر أثناء التصفح بدل أن تبقى مدفونة بعد الدخول للمنتج.',
            spotlightLabel: 'Upgrade Path',
            spotlightTitle: 'مسار ترقية أسرع',
            spotlightText:
              'ابدأ من اللابتوب أو الشاشة ثم أكمل مباشرة بالملحقات والمنظمات ذات العلاقة في نفس الرحلة.',
            ctaText: 'شاهد التصنيفات',
            ctaLink: '/collections',
            trustItems:
              'فلترة حقيقية|تصغير أسرع لعدد الخيارات في رف الإلكترونيات.\nمقارنة أوضح|ابحث ورتب وغيّر المسار من نفس الصفحة.\nعروض قابلة للفهم|الخصومات والملحقات المتوافقة أقرب للعميل.',
            highlights:
              'Laptops|جاهزة\nDesk Setup|متاح\nShipping|سريع',
          },
          'campaign-rail',
        ),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    pdp: conversionPage(
      [
        section('product-gallery', undefined, 'neon-showcase'),
        section(
          'product-info',
          {
            addToCartText: 'أضف الجهاز للسلة',
            descriptionTitle: 'تفاصيل المنتج',
            shippingTitle: 'الشحن والتجهيز',
            shippingText:
              'رسوم الشحن تظهر بوضوح قبل تأكيد الطلب، مع تجهيز أسرع للأجهزة والملحقات ورسالة متابعة أوضح بعد الشراء.',
            guaranteesTitle: 'لماذا TECHZONE؟',
            guaranteesSubtitle:
              'جمعنا المواصفات والرسائل العملية والاقتراحات المرتبطة في نفس الصفحة حتى لا تنتهي رحلة القرار مبكرًا.',
            guaranteeStyle: 'minimal',
            guaranteeItems: [
              {
                title: 'مواصفات أوضح',
                description: 'المعلومات الأساسية والاختيار المناسب يظهران قبل ما تخرج من الصفحة.',
                icon: 'Settings2',
              },
              {
                title: 'ملحقات مرتبطة',
                description: 'الاقتراحات بعد المنتج تبني setup أوضح بدل سكة توصيات عامة.',
                icon: 'PackagePlus',
              },
              {
                title: 'شحن مرئي',
                description: 'مراجعة التكلفة والمتابعة تظل واضحة قبل وبعد تأكيد الطلب.',
                icon: 'Truck',
              },
            ],
          },
          'gear-loadout',
        ),
        section(
          'bought-together',
          {
            title: 'منتجات تكمل التجهيز',
            subtitle:
              'ملحقات أو إضافات منطقية مثل docks أو لوحات مفاتيح أو صوتيات لإغلاق الرحلة من نفس الصفحة.',
            limit: 3,
            addBundleText: 'أضف الاختيارات المحددة',
          },
          'compact',
        ),
        section(
          'reviews',
          {
            title: 'تقييمات وتجارب الاستخدام',
            mediaTitle: 'صور ومقاطع من الاستخدام',
            subtitle:
              'المراجعات هنا تساعد العميل يقارن بين الجهاز الحالي والبدائل قبل تأكيد الشراء.',
            reviewLimit: 6,
            showMediaFeed: true,
          },
          'editorial',
        ),
        section(
          'related-products',
          {
            title: 'بدائل وإضافات قريبة من نفس الفئة',
            subtitle:
              'منتجات مشابهة أو مكملة تحافظ على السياق التقني بدل اقتراحات عامة غير مرتبطة.',
            limit: 4,
          },
          'glass',
        ),
      ],
      {
        layoutHint: 'product-detail',
      },
    ),
    cart: conversionPage(
      [
        cartItems(
          {
            title: 'الأجهزة المختارة',
            subtitle:
              'راجع المنتجات والكميات قبل الانتقال إلى الدفع، ثم أضف ما يلزم من نفس الصفحة.',
            continueShoppingText: 'أضف جهازًا آخر',
          },
          'command-cart',
        ),
        orderSummarySection(
          {
            title: 'ملخص الطلب',
            subtitle:
              'الإجمالي المعروض يراجع قيمة الأجهزة والملحقات قبل حساب الشحن النهائي.',
            checkoutButtonText: 'المتابعة إلى الدفع',
            secureCheckoutText: 'مراجعة آمنة قبل الإرسال',
            showTrustRow: true,
            showFreeShippingProgress: true,
          },
          'highlighted',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Tech Checkout',
          message:
            'راجع الأجهزة أولًا ثم أكمل العنوان والدفع في مسار أوضح يناسب الطلبات الأعلى قيمة.',
          saleLabel: 'مراجعة أوضح',
          shippingLabel: 'توصيل أسرع',
          returnLabel: 'دعم بعد الشراء',
          ctaText: 'العودة للمتجر',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'مراجعة الأجهزة المختارة',
            subtitle: 'تحقق من القطع والكميات قبل اعتماد الطلب النهائي.',
            continueShoppingText: 'أضف قطعة أخرى',
          },
          'compact',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'سنستخدمها لتأكيد الطلب أو التواصل إذا احتجت فاتورة أو تنسيقًا خاصًا للتسليم.',
            shippingTitle: 'عنوان الاستلام',
            shippingDescription:
              'اكتب عنوانًا واضحًا لتسهيل تسليم الأجهزة والملحقات بدون تأخير.',
            notesTitle: 'ملاحظات التوافق أو الفاتورة',
            notesDescription:
              'مثل موديل الجهاز المقصود أو طلب فاتورة أو وقت مناسب للاستلام.',
            notesPlaceholder: 'مثال: أحتاج فاتورة ضريبية أو يرجى الاتصال قبل الوصول',
          },
          'split',
        ),
        payment(
          {
            title: 'اعتماد الطلب',
            subtitle:
              'الملخص النهائي واضح ويركّز على الإجمالي وطريقة الدفع ورسالة الأمان.',
            confirmOrderText: 'تأكيد الطلب',
            securityText: 'الدفع آمن وبياناتك محمية بالكامل',
            showSummaryCard: false,
          },
          'cards',
        ),
        orderSummarySection(
          {
            title: 'ملخص نهائي',
            checkoutButtonText: 'إرسال الطلب',
            secureCheckoutText: 'طلب آمن ومراجع',
            showTrustRow: true,
          },
          'highlighted',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Tech Sale',
        message:
          'خصومات أوضح على الأجهزة والملحقات والترقيات التي تُشترى معًا باستمرار.',
        saleLabel: 'Upgrades',
        shippingLabel: 'Fast',
        returnLabel: 'Bundles',
        ctaText: 'العودة للمتجر',
        ctaLink: '/shop',
      }),
      offerBento(
        {
          badge: 'ابدأ من نوع الترقية',
          title: 'قسّمنا العروض حسب شكل الاستخدام',
          subtitle:
            'لابتوبات، شاشات، ملحقات مكتب، أو باقات تقلل وقت القرار من الموبايل والديسكتوب.',
          cards: [
            {
              label: 'Laptop',
              title: 'عروض اللابتوبات',
              subtitle: 'خصومات أوضح على الأجهزة الأساسية للعمل والإبداع.',
              ctaText: 'شاهد اللابتوبات',
              link: '/sale?category=laptops',
              tone: 'primary',
              stat: 'Laptop',
            },
            {
              label: 'Desk',
              title: 'ترقيات المكتب والشاشات',
              subtitle: 'منتجات تُشترى معًا باستمرار لبناء setup أكثر راحة.',
              ctaText: 'شاهد المكتب',
              link: '/collections',
              tone: 'accent',
              stat: 'Desk',
            },
            {
              label: 'Bundle',
              title: 'ملحقات تكمل الشراء',
              subtitle: 'ابدأ من الباقات أو الإضافات المرتبطة بدل البحث اليدوي.',
              ctaText: 'ابدأ الآن',
              link: '/shop?sort=popular',
              tone: 'slate',
              stat: 'Bundle',
            },
          ],
        },
        'campaign-stack',
      ),
      grid('العروض الحالية على الإلكترونيات', 'glass-card', { saleOnly: true }),
    ]),
    collections: discoveryPage([
      collectionsSection('ابدأ من نوع الجهاز أو الاستخدام', 'fast-nav-grid', {
        subtitle:
          'لابتوبات، شاشات، صوتيات، وتجهيزات مكتب أو ترقية بحسب سيناريو الشراء.',
        ctaText: 'كل الفئات',
        ctaLink: '/collections',
        limit: ELECTRONICS_DEMO_PREVIEW_COLLECTIONS.length,
        collections: ELECTRONICS_DEMO_PREVIEW_COLLECTIONS,
      }),
      grid('منتجات مختارة حسب الفئة', 'glass-card', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation(
        {
          title: 'تم تأكيد طلبك لدى TECHZONE',
          description:
            'سنراجع الأجهزة والملحقات ونجهز الشحنة ثم نشاركك خطوات المتابعة والتوصيل بشكل واضح.',
          continueShoppingText: 'العودة إلى الأجهزة',
          orderNumberPrefix: 'مرجع الطلب:',
          supportText: 'لو احتجت تعديلًا أو استفسارًا عن التوافق تواصل معنا عبر',
          statusLabel: 'قيد التجهيز',
          whatsappSupportLabel: 'واتساب TECHZONE',
          showTimeline: true,
          showTrackOrder: true,
          showReorder: true,
          showRecommended: true,
          recommendedTitle: 'إضافات تكمل التجهيز',
          recommendedSubtitle:
            'منتجات شائعة تضيف قيمة مباشرة بعد إنهاء الطلب الأساسي.',
        },
        'command-aftercare',
      ),
    ]),
  },
  'cafe-demo': {
    shop: conversionPage(
      [
        hero('split-panel', {
          eyebrow: 'Müt Roastery',
          title: 'منيو قهوة مرتب حسب المزاج وطريقة التحضير',
          subtitle:
            'حوّلنا المنيو إلى مسار شراء أوضح للحبوب والمشروبات والمخبوزات وأدوات البيت بدل شبكة خفيفة فقط.',
          ctaText: 'ابدأ من الحبوب',
          ctaLink: '/shop?category=beans',
          secondaryCtaText: 'شاهد العروض',
          secondaryCtaLink: '/sale',
        }),
        shoppingIntents({
          badge: 'ابدأ من طلبك',
          title: 'كل لحظة لها مدخل أوضح',
          subtitle:
            'طلبات الصباح، المكتب، الضيافة، أو تجهيز ركنة القهوة صارت أقسامًا عملية من أول شاشة.',
          items: [
            {
              eyebrow: 'Beans',
              title: 'حبوب القهوة',
              subtitle: 'تحميصات يومية للإسبريسو والفلتر مع قرار أسرع من أول رف.',
              link: '/shop?category=beans',
              tone: 'primary',
              chip: 'Roast',
            },
            {
              eyebrow: 'Cold Brew',
              title: 'مشروبات باردة',
              subtitle: 'اختيارات جاهزة للمكتب والمشاوير بأخف مجهود في التصفح.',
              link: '/shop?category=cold-brews',
              tone: 'accent',
              chip: 'Cold',
            },
            {
              eyebrow: 'Pastries',
              title: 'مخبوزات تكمل الكوب',
              subtitle: 'كرواسون ورولات وحلو خفيف يرفع متوسط الطلب بشكل طبيعي.',
              link: '/shop?category=pastries',
              tone: 'emerald',
              chip: 'Fresh',
            },
            {
              eyebrow: 'Brew Tools',
              title: 'أدوات التحضير',
              subtitle: 'طقم V60 وخفاقات وإضافات تبني ركنة البيت بدون لف كثير.',
              link: '/shop?category=brew-tools',
              tone: 'slate',
              chip: 'Home Brew',
            },
          ],
        }),
        commandBar(
          {
            title: 'ابحث باسم القهوة أو شكل الكوب أو أداة التحضير',
            subtitle: 'حبوب، كولد برو، كرواسون، V60، أو إضافات تكمل الطلب.',
            searchPlaceholder: 'ابحث (مثال: بن فلتر أو V60)',
            allCategoriesLabel: 'كل المنيو',
            resultsLabel: 'منتج',
            clearButtonText: 'مسح الاختيارات',
            stickyLabel: 'Coffee Finder',
            chipLimit: 6,
          },
          'minimal-toolbar',
        ),
        section('filters-sidebar'),
        grid('كل منيو Müt Coffee', 'standard'),
        promoRail(
          {
            badge: 'Brew Notes',
            title: 'مسار شراء يشبه الكافيه أكثر من كتالوج عام',
            subtitle:
              'التحميص، الإضافات المناسبة، ورسائل الاستلام أو التوصيل ظهرت أثناء التصفح لا بعد الحسم.',
            spotlightLabel: 'Morning Ritual',
            spotlightTitle: 'ابدأ من روتينك الأقرب',
            spotlightText:
              'ابدأ من البن أو المشروب الجاهز ثم أكمل الطلب بمخبوزة أو أداة تجعل إعادة الشراء أسهل.',
            ctaText: 'شاهد الأقسام',
            ctaLink: '/collections',
            trustItems:
              'تحميص أوضح|الحبوب مرتبة حسب الاستخدام لا حسب الرف العام فقط.\nإضافات منطقية|المخبوزات والأدوات الأقرب تظهر في نفس الرحلة.\nاستلام أسرع|رسائل التوصيل والاستلام أقرب للقرار على الموبايل.',
            highlights:
              'Roasted Today|متحرك\nCold Brew|جاهز\nBrew Kits|متوفر',
          },
          'trust-rail',
        ),
        featuresBar(
          {
            title: 'لماذا أصبحت المنيو أقوى؟',
            subtitle:
              'رفعنا وضوح القرار والطلب السريع من غير ما نفقد روح الكافيه أو إحساسه.',
            items: [
              {
                icon: 'grid',
                title: 'أقسام مرتبطة بالمزاج',
                description: 'العميل يدخل من نوع الكوب أو المناسبة بدل فلترة عامة فقط.',
              },
              {
                icon: 'target',
                title: 'إضافات أقرب',
                description: 'المخبوزات وأدوات التحضير تظهر في السياق الصحيح أثناء التصفح.',
              },
              {
                icon: 'clipboard',
                title: 'تفاصيل عملية',
                description: 'التحميص والاستلام وطبيعة الطلب أوضح قبل الإتمام.',
              },
              {
                icon: 'shield',
                title: 'ثقة أعلى على الموبايل',
                description: 'الطريق من الاكتشاف إلى السلة أقصر وأنظف في الشاشات الصغيرة.',
              },
            ],
          },
          'service-clarity',
        ),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    pdp: conversionPage(
      [
        productGallery('grid'),
        productInfoSection(
          {
            addToCartText: 'أضف للطلب',
            descriptionTitle: 'تفاصيل القهوة',
            shippingTitle: 'التحضير والاستلام',
            shippingText:
              'نوضح هل الطلب يحتاج تحضيرًا فوريًا أو شحنًا أو استلامًا، مع متابعة أبسط بعد الإتمام.',
            guaranteesTitle: 'لماذا الحسم أسهل هنا؟',
            guaranteesSubtitle:
              'نوع التحميص وطريقة التحضير والإضافات المناسبة أصبحت كلها في نفس صفحة القرار.',
            guaranteeStyle: 'minimal',
          },
          'standard',
        ),
        boughtTogetherSection(
          {
            title: 'كمّل الطلب مع إضافات مناسبة',
            subtitle:
              'مخبوزات أو أدوات تحضير أو مشروب يشتغل طبيعي مع نفس الاختيار.',
            limit: 3,
            addBundleText: 'أضف الاختيارات المقترحة',
          },
          'stacked',
        ),
        reviewsSection(
          {
            title: 'تجارب الكوب الأول',
            mediaTitle: 'صور من الطلبات والتحضير',
            subtitle:
              'المراجعات تساعد العميل يقرر حسب الطعم والاستخدام لا حسب الاسم فقط.',
            reviewLimit: 6,
            showMediaFeed: true,
          },
          'compact',
        ),
        relatedProductsSection(
          {
            title: 'اختيارات بنفس المزاج',
            subtitle: 'حبوب أو مشروبات أو أدوات قريبة من نفس الإيقاع.',
            limit: 4,
          },
          'editorial',
        ),
      ],
      {
        layoutHint: 'product-detail',
      },
    ),
    cart: conversionPage(
      [
        cartItems(
          {
            title: 'طلباتك الحالية',
            subtitle:
              'راجع القهوة والمخبوزات والأدوات قبل تثبيت الطلب أو أضف شيئًا يكمل الكوب.',
            continueShoppingText: 'العودة للمنيو',
          },
          'compact',
        ),
        orderSummarySection(
          {
            title: 'ملخص الطلب',
            subtitle:
              'الإجمالي يوضح قيمة القهوة والإضافات قبل احتساب التوصيل أو الاستلام.',
            checkoutButtonText: 'المتابعة لإتمام الطلب',
            secureCheckoutText: 'طلب آمن وتأكيد واضح',
            showTrustRow: true,
            showFreeShippingProgress: true,
          },
          'highlighted',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Fresh Brew Checkout',
          message:
            'راجع الطلب أولًا ثم أكمل الاستلام أو التوصيل والدفع في مسار أوضح يناسب الطلبات السريعة.',
          saleLabel: 'تحميص أوضح',
          shippingLabel: 'استلام أسرع',
          returnLabel: 'متابعة مباشرة',
          ctaText: 'العودة للمنيو',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'راجع الطلب قبل التحضير',
            subtitle: 'تأكد من الحبوب أو المشروبات أو المخبوزات قبل الإرسال النهائي.',
            continueShoppingText: 'أضف من المنيو',
          },
          'compact',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'سنستخدم الهاتف لتأكيد الطلب أو ترتيب التوصيل أو الاستلام إذا احتجنا.',
            shippingTitle: 'عنوان التوصيل أو نقطة الاستلام',
            shippingDescription:
              'اكتب عنوانًا أوضح أو اختر تفاصيل الاستلام حتى يصل الطلب في الوقت المناسب.',
            notesTitle: 'ملاحظات على الطلب',
            notesDescription:
              'مثل درجة الطحن، وقت مناسب للاستلام، أو أي تنبيه خاص بالتحضير.',
            notesPlaceholder:
              'مثال: طحن V60 أو يرجى الاتصال قبل الوصول أو الاستلام بعد 6 مساءً',
          },
          'split',
        ),
        payment(
          {
            title: 'اعتماد الطلب',
            subtitle:
              'اختر طريقة الدفع مع ملخص واضح للطلب ورسالة أمان مختصرة ومباشرة.',
            confirmOrderText: 'تأكيد الطلب',
            securityText: 'الدفع مؤمّن وبياناتك محفوظة',
            showSummaryCard: false,
          },
          'cards',
        ),
        orderSummarySection(
          {
            title: 'الملخص النهائي',
            checkoutButtonText: 'إرسال الطلب',
            secureCheckoutText: 'طلب واضح ومراجع',
            showTrustRow: true,
          },
          'highlighted',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Roastery Offers',
        message:
          'عروض أوضح على الحبوب والمخبوزات وأدوات التحضير التي تتحرك بسرعة داخل الطلبات اليومية.',
        saleLabel: 'Fresh Roast',
        shippingLabel: 'Bundles',
        returnLabel: 'Daily Picks',
        ctaText: 'العودة للمنيو',
        ctaLink: '/shop',
      }),
      offerBento(
        {
          badge: 'ابدأ من نوع العرض',
          title: 'رتبنا العروض حسب شكل الطلب لا مجرد التخفيض',
          subtitle:
            'حبوب أساسية، مشروبات باردة، أو أطقم تحضير تجعل قرار الشراء من الموبايل أسرع وأوضح.',
          cards: [
            {
              label: 'Beans',
              title: 'عروض الحبوب',
              subtitle: 'تحميصات يومية بخصومات أوضح للطلب المتكرر.',
              ctaText: 'شاهد الحبوب',
              link: '/sale?category=beans',
              tone: 'primary',
              stat: 'Roast',
            },
            {
              label: 'Cold Brew',
              title: 'مشروبات جاهزة',
              subtitle: 'خيارات باردة أسرع للحسم والمكتب والمشاوير.',
              ctaText: 'شاهد المشروبات',
              link: '/sale?category=cold-brews',
              tone: 'accent',
              stat: 'Cold',
            },
            {
              label: 'Tools',
              title: 'أطقم التحضير',
              subtitle: 'عروض على الأدوات التي تبني ركنة البيت من أول مرة.',
              ctaText: 'ابدأ التحضير',
              link: '/sale?category=brew-tools',
              tone: 'slate',
              stat: 'Home Brew',
            },
          ],
        },
        'combo-deals',
      ),
      grid('العروض الحالية في Müt Coffee', 'standard', { saleOnly: true }),
    ]),
    collections: discoveryPage([
      collectionsSection('ابدأ من نوع الكوب أو شكل الطلب', 'menu-categories', {
        subtitle:
          'حبوب، مشروبات باردة، مخبوزات، وأدوات تحضير تربط الاكتشاف بالطلب أسرع.',
        ctaText: 'كل المنيو',
        ctaLink: '/shop',
        limit: CAFE_DEMO_PREVIEW_COLLECTIONS.length,
        collections: CAFE_DEMO_PREVIEW_COLLECTIONS,
      }),
      grid('مختارات من كل قسم', 'standard', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation(
        {
          title: 'طلب القهوة اتثبت',
          description:
            'فريقنا يراجع التحضير أو التوصيل الآن، وسنشارك معك الخطوة التالية بوضوح حتى الاستلام.',
          continueShoppingText: 'العودة للمنيو',
          orderNumberPrefix: 'رقم الطلب:',
          supportText: 'لو حبيت تعديل الطحن أو وقت الاستلام تواصل معنا عبر',
          supportEmail: 'hello@mutcoffee.demo',
          statusLabel: 'قيد التحضير',
          whatsappSupportLabel: 'واتساب Müt Coffee',
          showTimeline: true,
          showTrackOrder: true,
          showReorder: true,
          showRecommended: true,
          recommendedTitle: 'إضافات لطلبك الجاي',
          recommendedSubtitle:
            'مخبوزات وأدوات أو مشروبات سريعة يضيفها العملاء بعد أول تجربة.',
          trackOrderTitle: 'تابع حالة الطلب',
          trackOrderDescription:
            'ادخل نفس رقم الهاتف المستخدم أثناء الإتمام لمعرفة أحدث حالة للطلب أو التوصيل.',
          reorderTitle: 'أعد نفس الطلب سريعًا',
          reorderDescription:
            'أضف نفس المنتجات إلى السلة مرة واحدة واستكمل الطلب خلال ثوانٍ.',
        },
        'market-aftercare',
      ),
    ]),
  },
  'furniture-demo': {
    shop: conversionPage(
      [
        hero('luxury-minimal', {
          eyebrow: 'LUXURE Selection',
          title: 'كتالوج أثاث يشرح القطعة قبل ما يطلبها العميل',
          subtitle:
            'رتبنا الركنات والخامات والعروض في مسار أوضح للأثاث والديكور بدل رف ساكت يعتمد على الصورة وحدها.',
          ctaText: 'ابدأ من غرفة المعيشة',
          ctaLink: '/shop?category=living-room',
          secondaryCtaText: 'شاهد العروض',
          secondaryCtaLink: '/sale',
        }),
        shoppingIntents({
          badge: 'ابدأ من الركنة',
          title: 'كل غرفة لها مدخل أوضح',
          subtitle:
            'غرفة المعيشة، الطاولات، الإضاءة، والديكور صارت مسارات قرار واضحة على الموبايل والديسكتوب.',
          items: [
            {
              eyebrow: 'Living',
              title: 'غرفة المعيشة',
              subtitle: 'ابدأ من الكنبة أو الكرسي الأساسي ثم أكمل الركنة بثقة أعلى.',
              link: '/shop?category=living-room',
              tone: 'primary',
              chip: 'Room',
            },
            {
              eyebrow: 'Tables',
              title: 'الطاولات',
              subtitle: 'طاولات قهوة وسفرة تنقل العميل مباشرة للقرار المناسب للمساحة.',
              link: '/shop?category=tables',
              tone: 'accent',
              chip: 'Tables',
            },
            {
              eyebrow: 'Lighting',
              title: 'الإضاءة',
              subtitle: 'أباجورات ولمسات ضوئية ترفع تصور الجاهزية داخل البيت.',
              link: '/shop?category=lighting',
              tone: 'emerald',
              chip: 'Lighting',
            },
            {
              eyebrow: 'Decor',
              title: 'ديكور يكمل المشهد',
              subtitle: 'مرايات وإكسسوارات تعطي القطعة الرئيسية سياقًا أوضح.',
              link: '/shop?category=decor',
              tone: 'slate',
              chip: 'Decor',
            },
          ],
        }),
        commandBar(
          {
            title: 'ابحث بالركنة أو نوع القطعة أو الاستخدام',
            subtitle: 'كنبة، ترابيزة، أباجورة، مراية، أو تفاصيل تكمل نفس الغرفة.',
            searchPlaceholder: 'ابحث (مثال: كنبة أو أباجورة أو مراية)',
            allCategoriesLabel: 'كل المجموعات',
            resultsLabel: 'قطعة',
            clearButtonText: 'إعادة الترتيب',
            stickyLabel: 'Room Finder',
          },
          'minimal-toolbar',
        ),
        section('filters-sidebar'),
        grid('كل مجموعات LUXURE', 'luxury-card', { limit: 24 }),
        promoRail(
          {
            badge: 'Design Notes',
            title: 'رسائل القرار المهمة أصبحت داخل نفس الصفحة',
            subtitle:
              'المقاسات والخامات والتوصيل والتركيب لم تعد مخفية خلف خطوات إضافية أو صفحات منفصلة.',
            spotlightLabel: 'Room Story',
            spotlightTitle: 'ابدأ من القطعة المحورية',
            spotlightText:
              'اختر القطعة الأساسية للغرفة ثم أكمل الطاولة أو الإضاءة أو الديكور من نفس الرحلة.',
            ctaText: 'شاهد الأقسام',
            ctaLink: '/collections',
            trustItems:
              'مقاسات أوضح|وصف أقرب لحضور القطعة داخل البيت قبل فتح PDP.\nتنسيق أسرع|اقتراحات تكمل نفس الركنة بدل توصيات عامة.\nتوصيل مفهوم|خطوات الاستلام والتركيب أقرب لقرار الشراء.',
            highlights:
              'Living Room|جاهز\nMade to Style|نعم\nDelivery|منظم',
          },
          'campaign-rail',
        ),
        featuresBar(
          {
            title: 'ما الذي تغير في تجربة LUXURE؟',
            subtitle:
              'رفعنا الثقة والوضوح بدل الاعتماد على الصور وحدها داخل رحلة التصفح.',
            items: [
              {
                icon: 'grid',
                title: 'مداخل حسب الغرفة',
                description: 'العميل يصل بسرعة إلى الركنة الأقرب بدل شبكة واحدة طويلة.',
              },
              {
                icon: 'target',
                title: 'تنسيق أقرب للواقع',
                description: 'القطع المرتبطة تظهر معًا لتوضيح شكل الغرفة بعد الشراء.',
              },
              {
                icon: 'clipboard',
                title: 'معلومات قبل الحسم',
                description: 'المقاسات والخامات ورسائل التوصيل أقرب إلى القرار النهائي.',
              },
              {
                icon: 'shield',
                title: 'ثقة أعلى للطلبات الكبيرة',
                description: 'الطلب والدفع والمتابعة أوضح لمسارات الأثاث الأعلى قيمة.',
              },
            ],
          },
          'service-clarity',
        ),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    pdp: conversionPage(
      [
        productGallery('grid'),
        productInfoSection(
          {
            addToCartText: 'أضف القطعة للسلة',
            shippingTitle: 'التوصيل والتركيب',
            shippingText:
              'نوضح مواعيد التوصيل وخطوات الوصول والتركيب حتى يقل القلق قبل تثبيت الطلب.',
            guaranteesTitle: 'قبل ما تعتمد القطعة',
            guaranteesSubtitle:
              'الأبعاد والخامة وصور الركنة والإضافات المرتبطة صارت كلها أقرب لقرار الشراء.',
            fitNote: 'راجع المقاسات ومساحة الغرفة قبل تثبيت الطلب النهائي.',
            guaranteeStyle: 'minimal',
          },
          'accordion',
        ),
        boughtTogetherSection(
          {
            title: 'كمّل نفس الركنة',
            subtitle: 'طاولات جانبية أو إضاءة أو ديكور يشتغل طبيعي مع نفس القطعة.',
            limit: 3,
            addBundleText: 'أضف التنسيق المقترح',
          },
          'stacked',
        ),
        reviewsSection(
          {
            title: 'صور من البيوت',
            mediaTitle: 'صور التركيب والاستخدام',
            subtitle:
              'المراجعات تساعد العميل يتخيل المقاس والحضور داخل المكان قبل الحسم.',
            reviewLimit: 6,
            showMediaFeed: true,
          },
          'editorial',
        ),
        relatedProductsSection(
          {
            title: 'قطع تكمل نفس الإيقاع',
            subtitle: 'اختيارات منسقة لنفس الغرفة أو الخامة أو مستوى الفخامة.',
            limit: 4,
          },
          'luxury',
        ),
      ],
      {
        layoutHint: 'product-detail',
      },
    ),
    cart: conversionPage(
      [
        cartItems(
          {
            title: 'القطع المختارة للبيت',
            subtitle:
              'راجع الأثاث والديكور قبل تثبيت الطلب أو أضف قطعة تكمل نفس الركنة.',
            continueShoppingText: 'العودة للمجموعات',
          },
          'editorial',
        ),
        orderSummarySection(
          {
            title: 'ملخص الطلب',
            subtitle:
              'المجموع يوضح قيمة القطع الحالية قبل رسوم التوصيل أو خدمات التركيب.',
            checkoutButtonText: 'المتابعة لإتمام الطلب',
            secureCheckoutText: 'طلب آمن ومراجعة واضحة',
            showTrustRow: true,
          },
          'highlighted',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'LUXURE Checkout',
          message:
            'راجع القطع أولًا ثم أكمل العنوان والدفع في مسار أوضح يناسب طلبات الأثاث الأعلى قيمة.',
          saleLabel: 'مقاسات أوضح',
          shippingLabel: 'توصيل منظم',
          returnLabel: 'تركيب مرتب',
          ctaText: 'العودة للمجموعات',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'مراجعة القطع المختارة',
            subtitle: 'تأكد من الأثاث أو الديكور قبل اعتماد الطلب وخطوة التوصيل.',
            continueShoppingText: 'أضف قطعة أخرى',
          },
          'editorial',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'سنستخدمها لتأكيد الطلب أو تنسيق موعد التوصيل أو التركيب إذا احتجنا.',
            shippingTitle: 'عنوان التوصيل',
            shippingDescription:
              'اكتب عنوانًا واضحًا مع الدور أو تفاصيل الوصول لتقليل أي احتكاك أثناء التسليم.',
            notesTitle: 'ملاحظات عن الوصول أو التركيب',
            notesDescription:
              'مثل تفضيل الدور، المصعد، وقت مناسب للوصول، أو ملاحظات خاصة بالمدخل.',
            notesPlaceholder:
              'مثال: التسليم بعد 5 مساءً أو القطعة تمر من المصعد الخلفي',
          },
          'split',
        ),
        payment(
          {
            title: 'اعتماد الطلب',
            subtitle:
              'ملخص واضح للسعر النهائي والدفع مع رسالة مختصرة حول الأمان والمتابعة.',
            confirmOrderText: 'تأكيد الطلب',
            securityText: 'معاملة آمنة وبياناتك محمية بالكامل',
            showSummaryCard: false,
          },
          'cards',
        ),
        orderSummarySection(
          {
            title: 'الملخص النهائي',
            checkoutButtonText: 'إرسال الطلب',
            secureCheckoutText: 'طلب واضح ومراجع',
            showTrustRow: true,
          },
          'highlighted',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'LUXURE Offers',
        message:
          'عروض أوضح على القطع التي تحسم الغرفة بسرعة من غير ما تفقد الإحساس الفاخر للمتجر.',
        saleLabel: 'Room Edit',
        shippingLabel: 'Delivery',
        returnLabel: 'Ready Pieces',
        ctaText: 'العودة للمجموعات',
        ctaLink: '/shop',
      }),
      offerBento(
        {
          badge: 'ابدأ من نوع القطعة',
          title: 'رتبنا العروض حسب الغرفة لا حسب التخفيض فقط',
          subtitle:
            'غرف الجلوس، الطاولات، والإضاءة صارت مداخل أوضح لاتخاذ القرار من الهاتف بسرعة أكبر.',
          cards: [
            {
              label: 'Living',
              title: 'قطع غرفة المعيشة',
              subtitle: 'كنب وكراسي رئيسية بعروض تساعد على بدء الركنة سريعًا.',
              ctaText: 'شاهد الجلوس',
              link: '/sale?category=living-room',
              tone: 'primary',
              stat: 'Room',
            },
            {
              label: 'Tables',
              title: 'طاولات تكمل المشهد',
              subtitle: 'خصومات على الطاولات التي تكمل القطع الأساسية بنفس الإيقاع.',
              ctaText: 'شاهد الطاولات',
              link: '/sale?category=tables',
              tone: 'accent',
              stat: 'Edit',
            },
            {
              label: 'Decor',
              title: 'إضاءة وديكور',
              subtitle: 'إضافات ترفع تصور الجاهزية النهائي للبيت قبل الحسم.',
              ctaText: 'ابدأ من هنا',
              link: '/sale?category=decor',
              tone: 'slate',
              stat: 'Finish',
            },
          ],
        },
        'campaign-stack',
      ),
      grid('العروض الحالية على قطع LUXURE', 'luxury-card', {
        saleOnly: true,
      }),
    ]),
    collections: discoveryPage([
      collectionsSection('ابدأ من الركنة الأقرب لبيتك', 'fast-nav-grid', {
        subtitle:
          'غرفة المعيشة والطاولات والإضاءة والديكور صارت مداخل واضحة بدل شبكة واحدة طويلة.',
        ctaText: 'كل المجموعات',
        ctaLink: '/shop',
        limit: FURNITURE_DEMO_PREVIEW_COLLECTIONS.length,
        collections: FURNITURE_DEMO_PREVIEW_COLLECTIONS,
      }),
      grid('مختارات تنسق البيت أسرع', 'luxury-card', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation(
        {
          title: 'تم تسجيل طلب LUXURE',
          description:
            'فريقنا يراجع المقاسات والتوصيل الآن، وسنشارك معك خطوات المتابعة والترتيب بوضوح حتى الاستلام.',
          continueShoppingText: 'العودة للمجموعات',
          orderNumberPrefix: 'مرجع الطلب:',
          supportText: 'لو حبيت تعديل تفاصيل الوصول أو التركيب تواصل معنا عبر',
          statusLabel: 'قيد التنسيق',
          showTimeline: true,
          showTrackOrder: true,
          showReorder: true,
          showRecommended: true,
          recommendedTitle: 'قطع تكمل نفس الركنة',
          recommendedSubtitle:
            'إضاءة وطاولات وديكور يضيفها العملاء بعد اختيار القطعة الأساسية.',
        },
        'boutique-aftercare',
      ),
    ]),
  },
  pawsome: {
    shop: conversionPage(
      [
        hero('warm-cozy', {
          eyebrow: 'Pet Care Edit',
          title: 'مستلزمات مرتبة حسب نوع الحيوان وروتينه',
          subtitle:
            'ابدأ من الأكل أو الألعاب أو العناية اليومية بدون لف طويل داخل الكتالوج.',
          ctaText: 'ابدأ من الكلاب',
          ctaLink: '/shop?category=dogs',
          secondaryCtaText: 'شاهد العروض',
          secondaryCtaLink: '/sale',
        }),
        shoppingIntents({
          badge: 'اختصر الطريق',
          title: 'اختر المسار الأقرب لاحتياج صاحبك الصغير',
          subtitle:
            'كل نية شراء لها مدخل واضح: تغذية، لعب، نظافة، أو مستلزمات الخروج.',
          items: [
            {
              eyebrow: 'Dogs',
              title: 'احتياجات الكلاب',
              subtitle: 'أكل جاف، ليش، ألعاب، وسراير بتصفية أسرع.',
              link: '/shop?category=dogs',
              tone: 'primary',
              chip: 'Dogs',
            },
            {
              eyebrow: 'Cats',
              title: 'ركن القطط',
              subtitle: 'رمل، ليتر بوكس، سكراتشر، ومكافآت يومية.',
              link: '/shop?category=cats',
              tone: 'accent',
              chip: 'Cats',
            },
            {
              eyebrow: 'Care',
              title: 'النظافة والعناية',
              subtitle: 'شامبو، فرش، ومعقمات لروتين أسهل في البيت.',
              link: '/collections',
              tone: 'emerald',
              chip: 'Care',
            },
            {
              eyebrow: 'Deals',
              title: 'باقات موفرة',
              subtitle: 'اختيارات مجمعة للبيت الجديد أو إعادة الشراء الشهرية.',
              link: '/sale',
              tone: 'slate',
              chip: 'وفر',
            },
          ],
        }),
        commandBar(
          {
            title: 'فلترة سريعة حسب الحيوان أو المنتج',
            subtitle: 'ابحث بالمقاس أو النوع أو الاستخدام اليومي.',
            searchPlaceholder: 'ابحث (مثال: ليش كلاب أو رمل قطط)',
            allCategoriesLabel: 'كل الحيوانات',
            resultsLabel: 'منتج',
            clearButtonText: 'مسح الفلاتر',
            stickyLabel: 'Pet Finder',
            chipLimit: 5,
          },
          'minimal-toolbar',
        ),
        section('filters-sidebar'),
        grid('كل مستلزمات الحيوانات', 'standard'),
        featuresBar(
          {
            title: 'شراء مطمئن لأصحاب الحيوانات',
            subtitle:
              'رسائل الخدمة الأهم تظهر داخل المتجر بدل ما تبقى مدفونة في الأسئلة الشائعة.',
            items: [
              {
                icon: 'shield',
                title: 'منتجات موثوقة',
                description: 'أكل وإكسسوارات من موردين معروفين وواضحين.',
              },
              {
                icon: 'search',
                title: 'فلترة حسب الحيوان',
                description: 'تصل للرف الصح بسرعة حسب كلب أو قط أو طائر.',
              },
              {
                icon: 'clipboard',
                title: 'إعادة شراء أسهل',
                description: 'شبكة واضحة تسهّل الرجوع لنفس الروتين الشهري.',
              },
              {
                icon: 'target',
                title: 'دعم قبل الطلب',
                description: 'مساعدة في المقاس أو النوع المناسب قبل ما تؤكد السلة.',
              },
            ],
          },
          'service-clarity',
        ),
        newsletter({
          title: 'وصل جديد للحيوانات الأليفة',
          subtitle:
            'اشترك ليصلك أولًا أي باقات جديدة أو خصومات على الأكل والمكافآت.',
          buttonText: 'اشترك الآن',
          placeholder: 'بريدك الإلكتروني',
        }),
      ],
      {
        layoutHint: 'sidebar-left',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'طلب آمن ومريح',
          message:
            'راجع السلة بسرعة وحدد عنوانك لنجهز طلب صاحبك الصغير بدون تعقيد.',
          saleLabel: 'منتجات أصلية',
          shippingLabel: 'تجهيز سريع',
          returnLabel: 'دعم واتساب',
          ctaText: 'العودة للمتجر',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'سلة صاحبك الصغير',
            subtitle: 'راجع الأكل واللعب والعناية قبل تأكيد الشحن.',
            continueShoppingText: 'أضف منتجات أخرى',
          },
          'playful-basket',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'أدخل رقم الهاتف الصحيح حتى نؤكد الطلب ومواعيد التوصيل.',
            shippingTitle: 'عنوان التوصيل',
            shippingDescription:
              'حدد أقرب عنوان واضح لأن بعض الطلبات تحتوي على أكل أو منتجات حساسة.',
            notesTitle: 'ملاحظات عن الحيوان أو الطلب',
            notesDescription:
              'مثل حساسية غذائية أو وقت مناسب للاستلام أو ملاحظة للحارس.',
            notesPlaceholder: 'مثال: يرجى الاتصال قبل الوصول بـ 15 دقيقة',
          },
          'safe-adventure',
        ),
        payment(
          {
            title: 'اختر طريقة الدفع',
            subtitle:
              'ملخص واضح للطلب مع متابعة سهلة عبر واتساب بعد التأكيد.',
            confirmOrderText: 'تأكيد الطلب',
            securityText: 'بياناتك محمية أثناء إتمام الطلب',
          },
          'cards',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Pet Deals',
        message:
          'خصومات سريعة على الأكل والمكافآت ولوازم الخروج لفترة محدودة.',
        saleLabel: 'Bundles موفرة',
        shippingLabel: 'شحن سريع',
        returnLabel: 'مراجعة أسهل',
        ctaText: 'ارجع للمتجر',
        ctaLink: '/shop',
      }),
      offerBento(
        {
          badge: 'أفضل ما في الخصومات',
          title: 'ابدأ من الرُكن الأنسب لطبيعة الشراء',
          subtitle:
            'قسمنا العروض حسب السلوك الشرائي الأكثر تكرارًا عند أصحاب الحيوانات.',
          cards: [
            {
              label: 'Monthly',
              title: 'إعادة الشراء الشهرية',
              subtitle: 'أكل ومكافآت وباقات مجمعة تقلل تكلفة الطلب المتكرر.',
              ctaText: 'شاهد الباقات',
              link: '/sale?category=food',
              tone: 'primary',
              stat: 'مكرر شهريًا',
            },
            {
              label: 'Care',
              title: 'عروض النظافة والعناية',
              subtitle: 'شامبو وفرش ومعقمات بخصومات أوضح.',
              ctaText: 'تصفح العناية',
              link: '/collections',
              tone: 'accent',
              stat: 'وفر أكثر',
            },
            {
              label: 'Starter',
              title: 'تجهيزات أول مرة',
              subtitle: 'سلال جاهزة للحيوان الجديد في البيت.',
              ctaText: 'ابدأ من هنا',
              link: '/shop?sort=popular',
              tone: 'slate',
              stat: 'جاهزة',
            },
          ],
        },
        'combo-deals',
      ),
      grid('العروض الحالية للحيوانات الأليفة', 'standard', { saleOnly: true }),
    ]),
    collections: discoveryPage([
      collectionsSection('استكشف الأقسام حسب الحيوان والاستخدام', 'playful-bubbles', {
        subtitle:
          'من الأكل اليومي حتى أدوات المشي والعناية، كل فئة لها نقطة دخول واضحة.',
        ctaText: 'كل الأقسام',
        ctaLink: '/collections',
      }),
      grid('ابدأ من أكثر المنتجات طلبًا', 'standard', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation({
        title: 'تم تسجيل طلب صاحبك الصغير',
        description:
          'سنراجع تفاصيل الطلب ثم نتواصل معك سريعًا لتأكيد التوصيل وأي ملاحظات خاصة بالحيوان.',
        continueShoppingText: 'العودة لمتجر الحيوانات',
        orderNumberPrefix: 'رقم الطلب:',
        supportText: 'لو احتجت تعديلًا سريعًا تواصل معنا عبر',
        statusLabel: 'تحت المراجعة',
        whatsappSupportLabel: 'واتساب الدعم',
        showTimeline: true,
        showTrackOrder: true,
        showReorder: true,
        showRecommended: true,
        recommendedTitle: 'قد تحتاج أيضًا',
        recommendedSubtitle:
          'إضافات مناسبة بعد إنهاء الطلب مثل المكافآت أو منتجات العناية.',
      }),
    ]),
  },
  'velvet-glow': {
    shop: conversionPage(
      [
        hero('split-panel', {
          eyebrow: 'Velvet Edit',
          title: 'تسوّقي الروتين المناسب لبشرتك عبر تجربة أهدأ وأكثر فخامة',
          subtitle:
            'جمعنا مسارات الشراء الواضحة مع التصفية الذكية وبطاقات أقرب للمجلة حتى تصلي للمنتج المناسب بسرعة وراحة.',
          ctaText: 'ابدئي من النتيجة',
          ctaLink: '/collections',
          secondaryCtaText: 'شاهدي عروض الموسم',
          secondaryCtaLink: '/sale',
        }),
        shoppingIntents({
          badge: 'Shop by intent',
          title: 'كيف تريدين أن تبدو رحلة التسوق اليوم؟',
          subtitle:
            'ابدئي من النتيجة أو المناسبة بدل التصفح العشوائي بين المنتجات.',
          items: [
            {
              eyebrow: 'Glow',
              title: 'توهج يومي',
              subtitle: 'غسول وسيروم ومرطب لروتين صباحي خفيف ومنعش.',
              link: '/collections',
              tone: 'primary',
              chip: 'Glow',
            },
            {
              eyebrow: 'Repair',
              title: 'إصلاح ليلي',
              subtitle: 'منتجات تهدئة وتجديد تبدو مثالية لروتين المساء.',
              link: '/shop?sort=popular',
              tone: 'accent',
              chip: 'Night',
            },
            {
              eyebrow: 'Gift',
              title: 'هدايا جاهزة',
              subtitle: 'بوكسات منسقة بتغليف أنيق وقرار شراء أسرع.',
              link: '/sale',
              tone: 'emerald',
              chip: 'Gift',
            },
            {
              eyebrow: 'Travel',
              title: 'Travel Edit',
              subtitle: 'أحجام عملية وروتينات مختصرة مناسبة للتنقل.',
              link: '/shop?sort=newest',
              tone: 'slate',
              chip: 'Mini',
            },
          ],
        }),
        commandBar(
          {
            title: 'ابحثي حسب المشكلة أو المكوّن أو نوع الهدية',
            subtitle:
              'مثل glow، niacinamide، routine set، أو travel size.',
            searchPlaceholder: 'ابحثي (مثال: سيروم تفتيح أو هدية)',
            allCategoriesLabel: 'كل الروتينات',
            resultsLabel: 'منتج',
            clearButtonText: 'مسح الفلاتر',
            stickyLabel: 'Velvet Finder',
            chipLimit: 6,
          },
          'minimal-toolbar',
        ),
        section('filters-sidebar'),
        grid('اختيارات Velvet Glow', 'editorial-card'),
        promoRail(
          {
            badge: 'Beauty Concierge',
            title: 'تجربة أقرب إلى boutique من صفحة متجر تقليدية',
            subtitle:
              'أظهرنا الثقة والعروض وطرق الاختيار السريعة بجوار الشبكة حتى تبقى القرارات أسهل بصريًا.',
            spotlightLabel: 'Edit of the week',
            spotlightTitle: 'Night Repair Ritual',
            spotlightText:
              'ثلاث خطوات متناغمة لسيروم وتجديد ليلي مع رسالة أوضح لما يمكن أن يكمّل نفس الروتين.',
            ctaText: 'شاهدي روتين الأسبوع',
            ctaLink: '/sale',
            trustItems:
              'اختيار حسب النتيجة|ابدئي من glow أو repair بدل أسماء منتجات كثيرة.\nأصالة موثوقة|مصادر واضحة ومنتجات أصلية.\nتغليف أنيق|مناسب للهدايا والطلبات الشخصية.',
            highlights:
              'العرض الحالي|حتى 25%\nشحن مجاني|900+ ج.م\nعينات هدية|طلبات مختارة',
          },
          'campaign-rail',
        ),
        featuresBar(
          {
            title: 'تصميم يخدم القرار لا يشتته',
            subtitle:
              'كل section داخل الصفحة الآن له وظيفة واضحة: تسريع الاختيار، تقليل التردد، ورفع الإحساس premium.',
            items: [
              {
                icon: 'search',
                title: 'بدء أسرع',
                description: 'مسارات بحسب النتيجة والمناسبة بدل شبكة طويلة متشابهة.',
              },
              {
                icon: 'shield',
                title: 'ثقة أوضح',
                description: 'الأصالة والتغليف والشحن تظهر داخل رحلة التسوق نفسها.',
              },
              {
                icon: 'target',
                title: 'هدايا أقوى',
                description: 'اقتراحات جاهزة للهدايا بدون مجهود إضافي في التنسيق.',
              },
              {
                icon: 'clipboard',
                title: 'إعادة شراء أسهل',
                description: 'الرجوع لروتين مألوف أو العثور على بديل مشابه صار أسرع.',
              },
            ],
          },
          'service-clarity',
        ),
        newsletter(
          {
            title: 'انضمي إلى Velvet Circle',
            subtitle:
              'ترشيحات أسبوعية، وصول مبكر، وكوبونات أجمل من رسائل الخصم المعتادة.',
            buttonText: 'اشتركي الآن',
            placeholder: 'بريدك الإلكتروني',
          },
          'dark',
        ),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Velvet Checkout',
          message:
            'صممنا رحلة الدفع لتكون أنظف بصريًا وأكثر راحة: مراجعة واضحة، فورم منظم، وملخص مباشر للإجمالي.',
          saleLabel: 'أصالة موثقة',
          shippingLabel: 'تغليف فاخر',
          returnLabel: 'شحن محمي',
          ctaText: 'العودة للمتجر',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'راجعي الروتين أو الهدية قبل التأكيد',
            subtitle:
              'تجربة مراجعة أنيقة تساعدك على تعديل السلة بدون تشتيت قبل الانتقال للعنوان والدفع.',
            continueShoppingText: 'أضيفي منتجًا مكملًا',
          },
          'editorial',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'سنستخدمها لتأكيد الطلب وإرسال أي تحديثات مرتبطة بالشحن أو التوصيل.',
            shippingTitle: 'عنوان الاستلام',
            shippingDescription:
              'كلما كان العنوان أدق، كانت حماية العبوات الزجاجية والمنتجات الحساسة أفضل أثناء التوصيل.',
            notesTitle: 'ملاحظات عن البشرة أو الهدية',
            notesDescription:
              'أضيفي طلب تغليف هدية أو وقت مناسب للاستلام أو أي ملاحظة يحتاجها فريق التجهيز.',
            fullNamePlaceholder: 'مثال: سارة أحمد',
            addressPlaceholder: 'الشارع، المنطقة، ورقم العمارة بالتفصيل',
            notesPlaceholder: 'مثال: تغليف هدية مع كارت بسيط أو الاتصال قبل الوصول',
            autoDetectHint: 'سنقترح المحافظة تلقائيًا من العنوان أو المدينة إن أمكن.',
            autoDetectSuccessText: 'تم اقتراح المحافظة ويمكنك تعديلها يدويًا بسهولة.',
          },
          'split',
        ),
        payment(
          {
            title: 'اختاري طريقة الدفع',
            subtitle:
              'ملخص واضح يظهر المجموع والشحن والخصومات قبل التأكيد النهائي.',
            summaryTitle: 'ملخص Velvet Glow',
            summaryDescription:
              'الإجمالي النهائي أمامك بوضوح مع الشحن والخصومات وطريقة الدفع المختارة.',
            confirmOrderText: 'تأكيد الطلب',
            securityText: 'Checkout مشفّر مع حماية كاملة للبيانات والطلب',
            codDesc: 'لمن تفضلين الدفع عند الاستلام بعد مراجعة الطلب.',
            cardDesc: 'دفع أسرع باستخدام بطاقتك البنكية في تجربة أكثر انسيابية.',
            walletDesc: 'مناسب للعميلات اللاتي يفضلن المحافظ الرقمية والدفع السريع.',
          },
          'cards',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Velvet Sale',
        message:
          'خصومات منتقاة على روتينات كاملة ومنتجات عناية موسمية بتقديم أقرب للتشكيلات من صفحة عروض تقليدية.',
        saleLabel: 'Glow Sets',
        shippingLabel: 'هدايا جاهزة',
        returnLabel: 'عينات مختارة',
        ctaText: 'العودة للمتجر',
        ctaLink: '/shop',
      }),
      offerBento(
        {
          badge: 'Best Beauty Deals',
          title: 'اختاري العرض بحسب طريقة الشراء التي تفضّلينها',
          subtitle:
            'هنا روتينات جاهزة، هدايا مرتبة، وإعادة شراء أوفر بدون ازدحام بصري.',
          cards: [
            {
              label: 'Routine',
              title: 'روتين كامل بسعر أفضل',
              subtitle:
                'اختيارات صباحية ومسائية مجمعة بدل شراء كل منتج منفصلًا.',
              ctaText: 'شاهدي الروتين',
              link: '/sale?category=skincare',
              tone: 'primary',
              stat: 'Combo',
            },
            {
              label: 'Gift',
              title: 'هدايا جاهزة للتغليف',
              subtitle:
                'باقات مناسبة للإهداء مع شكل أنيق وقرار شراء أسرع.',
              ctaText: 'اكتشفي الهدايا',
              link: '/collections',
              tone: 'accent',
              stat: 'Gift Ready',
            },
            {
              label: 'Restock',
              title: 'إعادة شراء أوفر',
              subtitle:
                'خصومات على المنتجات التي تكررين طلبها كل شهر.',
              ctaText: 'اطلبي الآن',
              link: '/shop?sort=popular',
              tone: 'slate',
              stat: 'Restock',
            },
          ],
        },
        'campaign-stack',
      ),
      grid('منتجات العروض الحالية', 'editorial-card', { saleOnly: true }),
      newsletter(
        {
          title: 'تنبيهات Velvet Sale',
          subtitle:
            'اشتركي ليصلك أولًا أي drop جديد أو خصومات على الروتينات الجاهزة.',
          buttonText: 'اشتركي الآن',
          placeholder: 'بريدك الإلكتروني',
        },
        'dark',
      ),
    ]),
    collections: discoveryPage([
      collectionsSection('روتينات مجمعة حسب النتيجة المطلوبة', 'editorial-categories', {
        subtitle:
          'اختاري بحسب الترطيب أو التوهج أو العناية الليلية أو الهدايا المنسقة.',
        ctaText: 'كل المجموعات',
        ctaLink: '/collections',
      }),
      shoppingIntents({
        badge: 'Collection routes',
        title: 'ابدئي من النية الأقرب لك بدل قائمة طويلة من الأقسام',
        subtitle:
          'قسّمنا صفحة المجموعات إلى مداخل أكثر وضوحًا للنتيجة أو المناسبة.',
        items: [
          {
            eyebrow: 'Hydrate',
            title: 'ترطيب وراحة',
            subtitle: 'روتينات تهدئة وترطيب تبدو مناسبة للاستخدام اليومي.',
            link: '/collections',
            tone: 'primary',
            chip: 'Hydrate',
          },
          {
            eyebrow: 'Glow',
            title: 'إشراقة وتوهج',
            subtitle: 'منتجات تمنح اللمعة الصحية من أول اختيار.',
            link: '/shop?sort=popular',
            tone: 'accent',
            chip: 'Glow',
          },
          {
            eyebrow: 'Gift',
            title: 'مجموعات هدايا',
            subtitle: 'تجهيزات أنيقة للهدايا والطلبات الشخصية.',
            link: '/sale',
            tone: 'emerald',
            chip: 'Gift',
          },
          {
            eyebrow: 'Mini',
            title: 'Travel Minis',
            subtitle: 'أحجام أصغر وروتينات مختصرة أثناء السفر أو التجربة الأولى.',
            link: '/shop?sort=newest',
            tone: 'slate',
            chip: 'Mini',
          },
        ],
      }),
      grid('ابدئي من الأكثر أناقة وطلبًا', 'editorial-card', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation({
        title: 'تم اعتماد طلبك من Velvet Glow',
        description:
          'بدأنا تجهيز الطلب بعناية، وسيصلك تأكيد الشحن والتغليف فور الانتهاء من المراجعة حتى تبقى التجربة متماسكة حتى آخر خطوة.',
        continueShoppingText: 'العودة إلى الروتينات',
        orderNumberPrefix: 'مرجع الطلب:',
        supportText: 'لأي تعديل سريع أو استفسار تواصلي معنا عبر',
        statusLabel: 'قيد التجهيز',
        whatsappSupportLabel: 'واتساب العناية',
        trackOrderTitle: 'تتبعي الطلب بسهولة',
        trackOrderDescription:
          'أدخلي نفس رقم الهاتف المستخدم في الشراء لمراجعة آخر حالة للطلب.',
        reorderTitle: 'إعادة شراء سريعة',
        reorderDescription:
          'لو كان هذا الروتين مناسبًا لك، يمكنك إعادة إضافته للسلة بخطوات أقل.',
        showTimeline: true,
        showTrackOrder: true,
        showReorder: true,
        showRecommended: true,
        recommendedTitle: 'إضافات مناسبة لروتينك',
        recommendedSubtitle:
          'منتجات مكملة بنفس المزاج والنتيجة لتبقى التجربة منسقة حتى ما بعد الشراء.',
      }),
    ]),
  },
  'ink-paper': {
    shop: conversionPage(
      [
        hero('warm-cozy', {
          eyebrow: 'Reading Room',
          title: 'كتالوج مرتب حسب مزاج القراءة أو نوع القرطاسية',
          subtitle:
            'واجهة هادئة تساعدك على الوصول للكتب والمفكرات واللوازم المكتبية بسرعة أكبر.',
          ctaText: 'ابدأ القراءة',
          ctaLink: '/collections',
          secondaryCtaText: 'شاهِد العروض',
          secondaryCtaLink: '/sale',
        }),
        commandBar(
          {
            title: 'ابحث باسم الكتاب أو نوع الأداة',
            subtitle:
              'مثال: رواية عربية، مفكرة جلد، أو قلم جيل للدراسة.',
            searchPlaceholder: 'ابحث (مثال: رواية أو مفكرة)',
            allCategoriesLabel: 'كل الرفوف',
            resultsLabel: 'منتج',
            clearButtonText: 'إعادة الترتيب',
            stickyLabel: 'Shelf Search',
          },
          'minimal-toolbar',
        ),
        section('filters-sidebar'),
        grid('كل الكتب والقرطاسية', 'list-card'),
        promoRail(
          {
            badge: 'قرارات أسرع',
            title: 'لماذا هذا الرف منظم بهذه الطريقة؟',
            subtitle:
              'أبرزنا الرسائل التي تهم القارئ أو الطالب أثناء التصفح: التوفر، الباقات، وسهولة الإهداء.',
            spotlightLabel: 'اختيار الأسبوع',
            spotlightTitle: 'باقات القراءة والكتابة',
            spotlightText:
              'اختيارات مجمعة للقراءة الهادئة أو للدراسة والعودة للجامعة.',
            ctaText: 'شاهد العروض',
            ctaLink: '/sale',
            trustItems:
              'تصنيفات أوضح|الوصول للكتب والمفكرات أسهل.\nهدايا جاهزة|مجموعات تصلح للإهداء مباشرة.\nمتابعة سريعة|تأكيد الطلب والشحن برسائل واضحة.',
            highlights:
              'عروض الكتب|حتى 15%\nباقات دراسة|جاهزة\nهدايا مكتبية|موسمية',
          },
          'trust-rail',
        ),
        newsletter({
          title: 'وصل جديد للقراءة والكتابة',
          subtitle:
            'اشترك ليصلك أي كتب جديدة أو باقات دراسية أو عروض موسمية.',
          buttonText: 'تابع الجديد',
          placeholder: 'بريدك الإلكتروني',
        }),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Shelf Checkout',
          message:
            'راجع الكتب والمفكرات قبل تأكيد العنوان ثم أكمل الطلب في خطوات هادئة وواضحة.',
          saleLabel: 'باقات موفرة',
          shippingLabel: 'شحن منظم',
          returnLabel: 'دعم سريع',
          ctaText: 'العودة للرفوف',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'محتويات الرف الحالي',
            subtitle: 'تأكد من الكتب والأدوات والكميات قبل إنهاء الطلب.',
            continueShoppingText: 'أضف كتابًا آخر',
          },
          'editorial',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'رقم الهاتف يساعدنا في تأكيد الطلب ومشاركة تحديثات الشحن.',
            shippingTitle: 'عنوان الشحن',
            shippingDescription:
              'اكتب العنوان واضحًا خاصةً إذا كان الطلب هدية أو يحتاج توقيتًا مناسبًا.',
            notesTitle: 'ملاحظات إضافية',
            notesDescription:
              'مثل تغليف هدية، اسم على الإهداء، أو توقيت مناسب للتوصيل.',
          },
          'compact',
        ),
        payment(
          {
            title: 'مراجعة الدفع',
            subtitle:
              'ملخص بسيط يركز على الإجمالي وطريقة الدفع من دون تشتيت.',
            confirmOrderText: 'تأكيد الطلب',
            securityText: 'الدفع مؤمّن ومراجعة الطلب واضحة',
          },
          'minimal',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Shelf Sale',
        message:
          'عروض مختارة على الكتب والمفكرات والباقات الدراسية حتى نفاد الكمية.',
        saleLabel: 'رفوف مخفضة',
        shippingLabel: 'باقات جاهزة',
        returnLabel: 'إهداء أسهل',
        ctaText: 'العودة للمتجر',
        ctaLink: '/shop',
      }),
      offerBento(
        {
          badge: 'خصومات مرتبة',
          title: 'ابدأ من نوع الطلب الذي تنوي بناءه',
          subtitle:
            'سواء كنت تبحث عن قراءة خفيفة أو تجهيز دراسي أو هدية جاهزة.',
          cards: [
            {
              label: 'Reading',
              title: 'روايات وقراءات خفيفة',
              subtitle: 'اختيارات سهلة للدخول في مود القراءة سريعًا.',
              ctaText: 'شاهد الروايات',
              link: '/sale?category=books',
              tone: 'primary',
              stat: 'قراءة',
            },
            {
              label: 'Study',
              title: 'باقات دراسة ومذاكرة',
              subtitle: 'مفكرات وأقلام وأدوات مكتبية بتسعير أوضح.',
              ctaText: 'ابدأ الدراسة',
              link: '/collections',
              tone: 'accent',
              stat: 'عودة للجامعة',
            },
            {
              label: 'Gift',
              title: 'هدايا للقرّاء والكتّاب',
              subtitle: 'كتب وأدوات تصلح للإهداء من دون تعقيد.',
              ctaText: 'شاهد الهدية',
              link: '/shop?sort=popular',
              tone: 'slate',
              stat: 'Gift',
            },
          ],
        },
        'daily-picks',
      ),
      grid('عروض الكتب والقرطاسية', 'list-card', { saleOnly: true }),
    ]),
    collections: discoveryPage([
      collectionsSection('اربط بين الرفوف حسب مزاج القراءة أو الاستخدام', 'standard-showcase', {
        subtitle:
          'انتقل بين رف الروايات والدراسة والمفكرات والأدوات اليومية بسهولة.',
        ctaText: 'كل الرفوف',
        ctaLink: '/collections',
      }),
      grid('ابدأ من أكثر الرفوف حركة', 'list-card', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation({
        title: 'تم حفظ طلبك في Ink & Paper',
        description:
          'نعمل الآن على تجهيز الكتب والقرطاسية، وسيصلك تحديث الشحن فور اعتماد الطلب.',
        continueShoppingText: 'العودة إلى الرفوف',
        orderNumberPrefix: 'رقم الطلب:',
        supportText: 'إذا رغبت بإضافة كتاب أو تعديل العنوان تواصل معنا عبر',
        statusLabel: 'قيد المراجعة',
        whatsappSupportLabel: 'واتساب المتجر',
        showTimeline: true,
        showTrackOrder: true,
        showReorder: true,
        showRecommended: true,
        recommendedTitle: 'اقتراحات من نفس الجو',
        recommendedSubtitle:
          'اختيارات إضافية مناسبة بعد إنهاء طلبك الحالي.',
      }),
    ]),
  },
  'bloom-studio': {
    shop: conversionPage(
      [
        hero('organic-bloom', {
          eyebrow: 'Bloom Catalog',
          title: 'تسوق الباقات حسب المناسبة أو اللون أو الميزانية',
          subtitle:
            'مسارات أوضح لعروض الورد والهدايا مع مساحة أكبر لاختيارات التوصيل السريع.',
          ctaText: 'ابدأ من المناسبات',
          ctaLink: '/collections',
          secondaryCtaText: 'شاهد العروض',
          secondaryCtaLink: '/sale',
        }),
        shoppingIntents({
          badge: 'اختصر القرار',
          title: 'ابدأ من المناسبة بدل التصفح العشوائي',
          subtitle:
            'العروض الآن مرتبة حسب عيد ميلاد، هدية رومانسية، مفاجأة سريعة، أو باقات موفرة.',
          items: [
            {
              eyebrow: 'Birthday',
              title: 'باقات أعياد الميلاد',
              subtitle: 'ألوان مبهجة مع كروت ورسائل جاهزة.',
              link: '/collections',
              tone: 'primary',
              chip: 'Birthday',
            },
            {
              eyebrow: 'Love',
              title: 'هدايا رومانسية',
              subtitle: 'ورد أحمر، شوكولاتة، وتغليف راقٍ.',
              link: '/shop?sort=popular',
              tone: 'accent',
              chip: 'Love',
            },
            {
              eyebrow: 'Today',
              title: 'توصيل اليوم نفسه',
              subtitle: 'اختيارات سريعة للطلبات العاجلة داخل نفس اليوم.',
              link: '/sale',
              tone: 'emerald',
              chip: 'Same Day',
            },
            {
              eyebrow: 'Budget',
              title: 'باقات موفرة',
              subtitle: 'اختيارات جميلة تناسب الميزانية بدون التضحية بالشكل.',
              link: '/shop',
              tone: 'slate',
              chip: 'وفر',
            },
          ],
        }),
        commandBar(
          {
            title: 'فلترة حسب المناسبة أو اللون',
            subtitle: 'ابحث عن ورد أحمر أو هدايا أو بوكسات مفاجأة.',
            searchPlaceholder: 'ابحث (مثال: ورد أحمر أو بوكس هدية)',
            allCategoriesLabel: 'كل الباقات',
            resultsLabel: 'باقة',
            clearButtonText: 'مسح',
            stickyLabel: 'Bloom Finder',
            chipLimit: 5,
          },
          'minimal-toolbar',
        ),
        section('filters-sidebar'),
        grid('كل الباقات والهدايا', 'overlay-card'),
        featuresBar(
          {
            title: 'نقاط الثقة الأهم في تجربة Bloom',
            subtitle:
              'توصيل اليوم نفسه، بطاقة مرفقة، وتغليف مؤمّن تظهر مباشرة أثناء التصفح.',
            items: [
              {
                icon: 'target',
                title: 'توصيل في نفس اليوم',
                description: 'للطلبات قبل الموعد المحدد داخل المناطق المتاحة.',
              },
              {
                icon: 'clipboard',
                title: 'بطاقة مرفقة',
                description: 'اكتب الرسالة وسنضيفها على كارت أنيق مع الباقة.',
              },
              {
                icon: 'leaf',
                title: 'ورد طازج',
                description: 'اختيارات اليوم من موردين موثوقين وجودة ثابتة.',
              },
              {
                icon: 'shield',
                title: 'تغليف آمن',
                description: 'حماية كاملة للباقة أثناء النقل والتوصيل.',
              },
            ],
          },
          'delivery-clarity',
        ),
      ],
      {
        layoutHint: 'sidebar-left',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Bloom Checkout',
          message:
            'راجع الباقات والعنوان ورسالة الكارت قبل إتمام الطلب لتصل المفاجأة بالشكل المطلوب.',
          saleLabel: 'ورد طازج',
          shippingLabel: 'توصيل سريع',
          returnLabel: 'تأكيد واضح',
          ctaText: 'العودة للباقات',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'سلة الباقات',
            subtitle: 'تحقق من عدد الباقات والإضافات قبل الإرسال.',
            continueShoppingText: 'أضف باقة أخرى',
          },
          'compact',
        ),
        checkoutForm(
          {
            contactTitle: 'بياناتك',
            contactDescription:
              'لنؤكد الطلب والتوصيل إذا احتجنا الوصول إليك سريعًا.',
            shippingTitle: 'عنوان المستلم',
            shippingDescription:
              'أدخل عنوان المستلم بوضوح خاصةً إذا كانت الهدية ستصل لشخص آخر.',
            notesTitle: 'رسالة على الكارت',
            notesDescription:
              'اكتب الرسالة التي تريد إضافتها مع الباقة أو أي تعليمات للتوصيل.',
            notesPlaceholder: 'مثال: كل سنة وأنت طيب يا ماما',
          },
          'standard',
        ),
        payment(
          {
            title: 'إنهاء الطلب',
            subtitle:
              'ملخص واضح للسلة وطريقة الدفع قبل اعتماد الطلب النهائي.',
            confirmOrderText: 'أرسل طلب الورد',
            securityText: 'الدفع مؤمّن والطلب محفوظ',
          },
          'cards',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Bloom Sale',
        message:
          'عروض موسمية على باقات مختارة وهدايا مرافقة لفترة محدودة.',
        saleLabel: 'خصومات موسمية',
        shippingLabel: 'Same Day',
        returnLabel: 'تغليف هدية',
        ctaText: 'العودة للمتجر',
        ctaLink: '/shop',
      }),
      offerBento({
        badge: 'ابدأ من المناسبة',
        title: 'نظمنا العروض حسب سبب الشراء نفسه',
        subtitle:
          'حتى تصل للباقة المناسبة سريعًا سواء كانت عيد ميلاد أو هدية رومانسية أو طلبًا عاجلًا.',
        cards: [
          {
            label: 'Birthday',
            title: 'باقات عيد الميلاد',
            subtitle: 'ألوان مرحة مع أسعار أوضح وتجهيز أسرع.',
            ctaText: 'شاهد الباقات',
            link: '/sale?category=birthday',
            tone: 'primary',
            stat: 'Birthday',
          },
          {
            label: 'Love',
            title: 'هدايا رومانسية',
            subtitle: 'ورد وشوكولاتة وتغليف جاهز للمفاجآت.',
            ctaText: 'ابدأ الآن',
            link: '/collections',
            tone: 'accent',
            stat: 'Gift Ready',
          },
          {
            label: 'Urgent',
            title: 'طلبات اليوم نفسه',
            subtitle: 'اختيارات جاهزة للطلبات السريعة والمفاجآت الأخيرة.',
            ctaText: 'تصفح السريع',
            link: '/shop?sort=popular',
            tone: 'slate',
            stat: 'Same Day',
          },
        ],
      }),
      grid('عروض الورد والهدايا', 'overlay-card', { saleOnly: true }),
    ]),
    collections: discoveryPage([
      collectionsSection('تصفحي الباقات حسب المناسبة', 'editorial-categories', {
        subtitle:
          'رتبنا الواجهة لتبدأ من المناسبة أو اللون أو نوع الهدية بدل شبكة عامة فقط.',
        ctaText: 'كل المناسبات',
        ctaLink: '/collections',
      }),
      grid('باقات مميزة للمناسبات', 'overlay-card', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation({
        title: 'تم استلام طلب الورد بنجاح',
        description:
          'سنبدأ تجهيز الباقة والتواصل معك إذا احتجنا أي تأكيد إضافي قبل التوصيل.',
        continueShoppingText: 'العودة للباقات',
        orderNumberPrefix: 'رقم الطلب:',
        supportText: 'إذا أردت تعديل الرسالة أو الموعد تواصل معنا عبر',
        statusLabel: 'قيد التجهيز',
        whatsappSupportLabel: 'واتساب Bloom',
        showTimeline: true,
        showTrackOrder: true,
        showReorder: true,
        showRecommended: true,
        recommendedTitle: 'إضافات تكمل الهدية',
        recommendedSubtitle:
          'اختيارات لاحقة مثل شوكولاتة أو كروت أو مزهريات مناسبة للطلب.',
      }),
    ]),
  },
  'iron-forge': {
    shop: conversionPage(
      [
        hero('neon-dark', {
          eyebrow: 'Forge Catalog',
          title: 'ابنِ روتينك التدريبي من واجهة أقوى وأوضح',
          subtitle:
            'فلترة أسرع للمعدات المنزلية والأوزان والإكسسوارات مع رسائل ثقة أثناء التصفح.',
          ctaText: 'ابدأ من الأكثر طلبًا',
          ctaLink: '/shop?sort=popular',
          secondaryCtaText: 'عروض الجيم',
          secondaryCtaLink: '/sale',
        }),
        commandBar(
          {
            title: 'ابحث بالمعدة أو الهدف التدريبي',
            subtitle: 'مثال: دمبلز، مطاط مقاومة، أو أدوات كارديو.',
            searchPlaceholder: 'ابحث (مثال: دمبلز أو بنش)',
            allCategoriesLabel: 'كل المعدات',
            resultsLabel: 'منتج',
            clearButtonText: 'إعادة الضبط',
            stickyLabel: 'Forge Finder',
          },
          'marketplace-dense',
        ),
        section('filters-sidebar'),
        grid('معدات اللياقة والفيتنس', 'compact'),
        promoRail(
          {
            badge: 'Gym Proof',
            title: 'ثقة أعلى أثناء التصفح',
            subtitle:
              'أضفنا سكة جانبية لرسائل التحمل والشحن والأوزان الأكثر حركة.',
            spotlightLabel: 'Setup of the Week',
            spotlightTitle: 'ركنة تدريب منزلية موفرة',
            spotlightText:
              'ابدأ من الأدوات الأساسية ثم زد الشدة تدريجيًا مع عروض أوضح.',
            ctaText: 'شاهد العروض',
            ctaLink: '/sale',
            trustItems:
              'تحمّل ووضوح|معلومات أوضح عن نوع الاستخدام.\nشحن سريع|ترتيب واضح للتوصيل داخل مصر.\nمجموعات جاهزة|تبدأ من الحد الأدنى ثم تتوسع.',
            highlights:
              'Starter Kits|متاحة\nشحن مجاني|1500+ ج.م\nخصومات|حتى 18%',
          },
          'trust-rail',
        ),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Forge Checkout',
          message:
            'راجع المعدات والكميات قبل اعتماد الطلب وحدد العنوان المناسب للشحن الثقيل.',
          saleLabel: 'مخزون موثوق',
          shippingLabel: 'توصيل محسوب',
          returnLabel: 'تأكيد واضح',
          ctaText: 'العودة للمعدات',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'معداتك المختارة',
            subtitle: 'تأكد من العدد والنوع قبل الانتقال للدفع والعنوان.',
            continueShoppingText: 'أضف معدة أخرى',
          },
          'compact',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'سنستخدم الهاتف لتأكيد الشحنة خاصةً إذا كان الطلب كبير الحجم.',
            shippingTitle: 'عنوان الاستلام',
            shippingDescription:
              'أدخل عنوانًا واضحًا لتسهيل توصيل المعدات أو الأوزان الثقيلة.',
            notesTitle: 'ملاحظات عن الشحنة',
            notesDescription:
              'مثل الدور، المصعد، أو توقيت مناسب لوصول الشحنة.',
          },
          'split',
        ),
        payment(
          {
            title: 'مراجعة الدفع',
            subtitle:
              'الإجمالي وطريقة الدفع يظهران بوضوح مع رسالة أمان مباشرة.',
            confirmOrderText: 'تأكيد الطلب',
            securityText: 'الدفع مؤمن وجاهز لاعتماد الطلب',
          },
          'cards',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Forge Sale',
        message:
          'خصومات سريعة على الأدوات الأساسية والباقات التدريبية المجمعة.',
        saleLabel: 'Starter Kits',
        shippingLabel: 'شحن سريع',
        returnLabel: 'عروض محدودة',
        ctaText: 'العودة للمعدات',
        ctaLink: '/shop',
      }),
      offerBento({
        badge: 'ابدأ من هدفك',
        title: 'اختر العرض حسب شكل الجيم الذي تبنيه',
        subtitle:
          'من الكارديو إلى الأوزان الحرة وحتى الركنة المنزلية الكاملة.',
        cards: [
          {
            label: 'Cardio',
            title: 'معدات الحركة والكارديو',
            subtitle: 'اختيارات أخف للتجهيز السريع في البيت.',
            ctaText: 'شاهد الكارديو',
            link: '/sale?category=cardio',
            tone: 'primary',
            stat: 'Cardio',
          },
          {
            label: 'Strength',
            title: 'أوزان ومقاومة',
            subtitle: 'باقات أوضح لمن يبدأ تدريبات القوة.',
            ctaText: 'ابدأ القوة',
            link: '/collections',
            tone: 'accent',
            stat: 'Strength',
          },
          {
            label: 'Home Gym',
            title: 'ركنة جيم منزلية',
            subtitle: 'مجموعات توفر وقت الاختيار وتسرع قرار الشراء.',
            ctaText: 'شاهد الباقات',
            link: '/shop?sort=popular',
            tone: 'slate',
            stat: 'Bundle',
          },
        ],
      }),
      grid('العروض الحالية لمعدات اللياقة', 'compact', { saleOnly: true }),
    ]),
    collections: discoveryPage([
      collectionsSection('ابدأ من نوع التدريب الذي تريده', 'fast-nav-grid', {
        subtitle:
          'قسّمنا المتجر حسب القوة، الكارديو، الإكسسوارات، والباقات المنزلية.',
        ctaText: 'كل الفئات',
        ctaLink: '/collections',
      }),
      grid('معدات مفضلة حسب نوع الاستخدام', 'compact', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation({
        title: 'تم تثبيت طلبك في Iron Forge',
        description:
          'سيقوم الفريق بمراجعة تفاصيل الشحنة وتجهيز المعدات ثم مشاركة التحديثات معك فورًا.',
        continueShoppingText: 'العودة للمعدات',
        orderNumberPrefix: 'مرجع الطلب:',
        supportText: 'لأي تعديل على الشحنة أو الاستلام تواصل معنا عبر',
        statusLabel: 'قيد التجهيز',
        whatsappSupportLabel: 'واتساب Iron Forge',
        showTimeline: true,
        showTrackOrder: true,
        showReorder: true,
        showRecommended: true,
        recommendedTitle: 'إضافات تقوي الجلسة',
        recommendedSubtitle:
          'أدوات صغيرة أو مقاومات أو إكسسوارات تكمل إعدادك التدريبي.',
      }),
    ]),
  },
  opulence: {
    shop: conversionPage(
      [
        hero('luxury-minimal', {
          eyebrow: 'Opulence Edit',
          title: 'اختيارات مرتبة بين المجوهرات والساعات والهدايا الفاخرة',
          subtitle:
            'واجهة أكثر هدوءًا تمنح كل قطعة مساحة عرض أوضح ورسائل ثقة أعلى.',
          ctaText: 'ابدأ من القطع الأيقونية',
          ctaLink: '/shop?sort=popular',
          secondaryCtaText: 'اكتشف الأرشيف',
          secondaryCtaLink: '/sale',
        }),
        commandBar(
          {
            title: 'ابحث باسم القطعة أو نوع الهدية',
            subtitle:
              'من خواتم يومية حتى ساعات مناسبة للهدايا والمناسبات الراقية.',
            searchPlaceholder: 'ابحث (مثال: ساعة ذهبية أو خاتم)',
            allCategoriesLabel: 'كل القطع',
            resultsLabel: 'قطعة',
            clearButtonText: 'مسح',
            stickyLabel: 'Concierge Search',
          },
          'minimal-toolbar',
        ),
        section('filters-sidebar'),
        grid('كل القطع الفاخرة', 'luxury-card'),
        promoRail(
          {
            badge: 'Concierge Notes',
            title: 'مسار ثقة يناسب المقتنيات الفاخرة',
            subtitle:
              'إشارات الأصالة والتغليف والاستلام تظهر أثناء التصفح بدل صفحة مستقلة.',
            spotlightLabel: 'Opulence Pick',
            spotlightTitle: 'قطع محدودة للإهداء',
            spotlightText:
              'اختر من القطع ذات الإيقاع الهادئ والرسالة الأقوى في الهدية.',
            ctaText: 'شاهد العروض',
            ctaLink: '/sale',
            trustItems:
              'شهادات أصالة|رسائل ثقة أوضح داخل المتجر.\nتغليف فاخر|مناسب للإهداء المباشر.\nاختيارات محدودة|مقتنيات بعدد قطع أقل.',
            highlights:
              'Limited Pieces|متاحة\nGift Ready|نعم\nشحن مؤمن|داخل مصر',
          },
          'campaign-rail',
        ),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Concierge Checkout',
          message:
            'إنهاء الطلب صار أكثر أناقة: مراجعة القطع أولًا ثم بيانات التوصيل والدفع في مسار واضح.',
          saleLabel: 'أصالة موثقة',
          shippingLabel: 'تغليف فاخر',
          returnLabel: 'متابعة شخصية',
          ctaText: 'العودة للمتجر',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'مراجعة القطع المختارة',
            subtitle: 'تأكد من القطع أو الهدية قبل الانتقال إلى بيانات الاستلام.',
            continueShoppingText: 'أضف قطعة أخرى',
          },
          'editorial',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'سنستخدمها للتأكيد ومشاركة أي تفاصيل متعلقة بالتغليف أو الاستلام.',
            shippingTitle: 'عنوان الاستلام',
            shippingDescription:
              'يُفضّل عنوان واضح لضمان وصول القطع المؤمنة بالشكل المطلوب.',
            notesTitle: 'ملاحظات خاصة بالهدية',
            notesDescription:
              'يمكنك كتابة تنبيه عن الإهداء أو توقيت التوصيل أو أي تعليمات إضافية.',
          },
          'split',
        ),
        payment(
          {
            title: 'اعتماد الطلب',
            subtitle:
              'ملخص واضح للسعر النهائي وطريقة الدفع مع رسالة أمان مختصرة.',
            confirmOrderText: 'اعتماد الطلب',
            securityText: 'معاملة آمنة ومشفرة بالكامل',
          },
          'cards',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Archive Selection',
        message:
          'قطع أرشيفية وعروض محدودة على مقتنيات مختارة دون الإخلال بطابع الفخامة.',
        saleLabel: 'Archive',
        shippingLabel: 'Gift Ready',
        returnLabel: 'Limited',
        ctaText: 'العودة للمتجر',
        ctaLink: '/shop',
      }),
      offerBento({
        badge: 'عروض منتقاة',
        title: 'ابدأ من شكل القطعة أو مناسبة الهدية',
        subtitle:
          'تجربة تصفح أوضح للقطع المخفضة دون فقدان الإحساس الراقي للمتجر.',
        cards: [
          {
            label: 'Jewelry',
            title: 'مجوهرات يومية فاخرة',
            subtitle: 'قطع أخف وأسهل للدخول أو الإهداء.',
            ctaText: 'شاهد المجوهرات',
            link: '/sale?category=jewelry',
            tone: 'primary',
            stat: 'Daily Luxe',
          },
          {
            label: 'Watches',
            title: 'ساعات مختارة من الأرشيف',
            subtitle: 'تصاميم أنيقة بأسعار أوضح لفترة محدودة.',
            ctaText: 'اكتشف الساعات',
            link: '/collections',
            tone: 'accent',
            stat: 'Archive',
          },
          {
            label: 'Gift',
            title: 'هدايا راقية جاهزة',
            subtitle: 'اختيارات مناسبة للمناسبات المهمة.',
            ctaText: 'ابدأ من هنا',
            link: '/shop?sort=popular',
            tone: 'slate',
            stat: 'Gift',
          },
        ],
      }),
      grid('القطع المخفضة حاليًا', 'luxury-card', { saleOnly: true }),
    ]),
    collections: discoveryPage([
      collectionsSection('استكشف المقتنيات حسب الفئة أو المناسبة', 'editorial-categories', {
        subtitle:
          'مجوهرات وساعات وهدايا جاهزة ضمن تقسيمات أبسط للقرار الأسرع.',
        ctaText: 'كل المجموعات',
        ctaLink: '/collections',
      }),
      grid('ابدأ من القطع الأيقونية', 'luxury-card', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation({
        title: 'تم اعتماد طلبك لدى Opulence',
        description:
          'سيقوم فريقنا بتجهيز القطعة والتغليف ومتابعة التوصيل ثم مشاركة آخر التحديثات معك.',
        continueShoppingText: 'العودة إلى المقتنيات',
        orderNumberPrefix: 'مرجع الطلب:',
        supportText: 'للاستفسار أو تعديل تفاصيل الهدية تواصل معنا عبر',
        statusLabel: 'قيد التجهيز',
        whatsappSupportLabel: 'واتساب Opulence',
        showTimeline: true,
        showTrackOrder: true,
        showReorder: true,
        showRecommended: true,
        recommendedTitle: 'قطع تكمل الاختيار',
        recommendedSubtitle:
          'اقتراحات راقية يمكن إضافتها إلى تجربة الشراء أو الهدية.',
      }),
    ]),
  },
  'turbo-parts': {
    shop: conversionPage(
      [
        hero('speed-banner', {
          eyebrow: 'Fitment First',
          title: 'وصل للقطعة المناسبة أسرع من خلال صفحة مصممة للبحث العملي',
          subtitle:
            'أضفنا فلترة أكثف ورسائل ثقة أوضح حتى لا تضيع بين موديلات كثيرة متشابهة.',
          ctaText: 'ابدأ من الأكثر طلبًا',
          ctaLink: '/shop?sort=popular',
          secondaryCtaText: 'عروض القطع',
          secondaryCtaLink: '/sale',
        }),
        commandBar(
          {
            title: 'ابحث بالموديل أو نوع القطعة',
            subtitle:
              'مثال: فلاتر، فوانيس، بطاريات، أو قطع صيانة أساسية.',
            searchPlaceholder: 'ابحث (مثال: فلتر زيت أو تيل فرامل)',
            allCategoriesLabel: 'كل القطع',
            resultsLabel: 'قطعة',
            clearButtonText: 'مسح',
            stickyLabel: 'Fitment Search',
          },
          'marketplace-dense',
        ),
        section('filters-sidebar'),
        grid('كل قطع الغيار والإكسسوارات', 'list-card'),
        promoRail(
          {
            badge: 'Workshop Notes',
            title: 'رسائل مساعدة للشراء الصحيح',
            subtitle:
              'قسم جانبي يوضح الشحن والضمان والقطع الأكثر طلبًا أثناء تصفح الشبكة.',
            spotlightLabel: 'Top Bundle',
            spotlightTitle: 'أساسيات الصيانة السريعة',
            spotlightText:
              'ابدأ من القطع الاستهلاكية التي يعاد طلبها باستمرار ثم وسّع السلة حسب الحاجة.',
            ctaText: 'شاهد العروض',
            ctaLink: '/sale',
            trustItems:
              'بحث أوضح|الوصول للقطعة أسرع من عرض عام مسطح.\nسياسات خدمة|رسائل الثقة في نفس الصفحة.\nشحن محسوب|مراجعة أفضل للطلبات الكبيرة.',
            highlights:
              'Top Categories|صيانة\nشحن مجاني|2000+ ج.م\nضمان|على المختار',
          },
          'trust-rail',
        ),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Turbo Checkout',
          message:
            'راجع القطع والكميات ثم أكمل بيانات الاستلام لتسريع اعتماد الطلب.',
          saleLabel: 'بحث أدق',
          shippingLabel: 'توصيل محسوب',
          returnLabel: 'تأكيد واضح',
          ctaText: 'العودة للقطع',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'مراجعة القطع المختارة',
            subtitle:
              'تحقق من النوع والكمية قبل إرسال عنوان الشحن أو ملاحظات الورشة.',
            continueShoppingText: 'أضف قطعة أخرى',
          },
          'compact',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'رقم الهاتف يساعدنا في التأكيد خاصةً للطلبات التي تحتاج مراجعة قبل الشحن.',
            shippingTitle: 'عنوان الورشة أو المنزل',
            shippingDescription:
              'كلما كان العنوان أوضح، كان تسليم القطع أسهل وأسرع.',
            notesTitle: 'ملاحظات فنية',
            notesDescription:
              'يمكنك إضافة موديل السيارة أو أي ملاحظة مختصرة مهمة للطلب.',
            notesPlaceholder: 'مثال: تويوتا كورولا 2018',
          },
          'compact',
        ),
        payment(
          {
            title: 'اعتماد الطلب',
            subtitle:
              'ملخص الدفع والإجمالي يظهران بوضوح قبل التأكيد النهائي.',
            confirmOrderText: 'إرسال الطلب',
            securityText: 'بيانات الطلب والدفع مؤمنة',
          },
          'cards',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Turbo Sale',
        message:
          'عروض على قطع الصيانة والاستهلاك والإكسسوارات الأكثر طلبًا.',
        saleLabel: 'خصومات أوضح',
        shippingLabel: 'تجهيز سريع',
        returnLabel: 'مخزون محدود',
        ctaText: 'العودة للمتجر',
        ctaLink: '/shop',
      }),
      offerBento({
        badge: 'ابدأ من نوع الاستخدام',
        title: 'قسّمنا العروض حسب سيناريو الشراء نفسه',
        subtitle:
          'صيانة دورية، إضاءة، أو تجهيزات عملية بدل شبكة واحدة مزدحمة.',
        cards: [
          {
            label: 'Service',
            title: 'أساسيات الصيانة',
            subtitle: 'فلاتر وزيوت وإكسسوارات متكررة الطلب.',
            ctaText: 'شاهد الصيانة',
            link: '/sale?category=maintenance',
            tone: 'primary',
            stat: 'Service',
          },
          {
            label: 'Lighting',
            title: 'إضاءة وكماليات',
            subtitle: 'ترقيات واضحة للسيارة بسعر أفضل.',
            ctaText: 'شاهد الإضاءة',
            link: '/collections',
            tone: 'accent',
            stat: 'Upgrade',
          },
          {
            label: 'Workshop',
            title: 'طلبات ورش وتجهيز سريع',
            subtitle: 'باقات أقرب للشراء العملي السريع.',
            ctaText: 'ابدأ الآن',
            link: '/shop?sort=popular',
            tone: 'slate',
            stat: 'Fast',
          },
        ],
      }),
      grid('عروض قطع الغيار الحالية', 'list-card', { saleOnly: true }),
    ]),
    collections: discoveryPage([
      collectionsSection('تصفح القطع حسب نوع الاستخدام', 'fast-nav-grid', {
        subtitle:
          'ابدأ من الصيانة أو الإضاءة أو الإكسسوارات أو القطع الأكثر تكرارًا.',
        ctaText: 'كل الفئات',
        ctaLink: '/collections',
      }),
      grid('ابدأ من أكثر القطع حركة', 'list-card', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation({
        title: 'تم تسجيل طلب القطع بنجاح',
        description:
          'سيتم مراجعة تفاصيل الطلب وتجهيز القطع المناسبة ثم التواصل معك لتأكيد الشحن.',
        continueShoppingText: 'العودة إلى قطع الغيار',
        orderNumberPrefix: 'رقم الطلب:',
        supportText: 'إذا احتجت تعديلًا أو إضافة موديل السيارة تواصل معنا عبر',
        statusLabel: 'قيد المراجعة',
        whatsappSupportLabel: 'واتساب Turbo Parts',
        showTimeline: true,
        showTrackOrder: true,
        showReorder: true,
        showRecommended: true,
        recommendedTitle: 'قطع مكملة للطلب',
        recommendedSubtitle:
          'منتجات شائعة الإضافة بعد شراء قطعة الصيانة الأساسية.',
      }),
    ]),
  },
  crafted: {
    shop: conversionPage(
      [
        hero('organic-bloom', {
          eyebrow: 'Handmade Catalog',
          title: 'استكشف القطع حسب الحرفة أو المادة أو قصة الصانع',
          subtitle:
            'واجهة أكثر دفئًا للمنتجات اليدوية مع مسارات أسرع للقطع المحدودة والهدايا.',
          ctaText: 'ابدأ من الحرف',
          ctaLink: '/collections',
          secondaryCtaText: 'شاهد العروض',
          secondaryCtaLink: '/sale',
        }),
        shoppingIntents({
          badge: 'ابدأ من الحرفة',
          title: 'اختر نوع القطعة التي تبحث عنها',
          subtitle:
            'خشب، سيراميك، شموع، أو هدايا يدوية جاهزة، كلها الآن بمداخل أوضح.',
          items: [
            {
              eyebrow: 'Clay',
              title: 'سيراميك وفخار',
              subtitle: 'أكواب وأطباق وديكور مصنوع يدويًا.',
              link: '/collections',
              tone: 'primary',
              chip: 'Clay',
            },
            {
              eyebrow: 'Wood',
              title: 'خشب وحفر',
              subtitle: 'قطع منزلية ودعائم وصناديق مميزة.',
              link: '/shop?sort=popular',
              tone: 'accent',
              chip: 'Wood',
            },
            {
              eyebrow: 'Gift',
              title: 'هدايا يدوية',
              subtitle: 'اختيارات مناسبة للإهداء وتغليف بسيط وجميل.',
              link: '/sale',
              tone: 'emerald',
              chip: 'Gift',
            },
            {
              eyebrow: 'Limited',
              title: 'قطع محدودة',
              subtitle: 'اكتشف الأعمال الأقل تكرارًا والأسرع نفادًا.',
              link: '/shop?sort=newest',
              tone: 'slate',
              chip: 'Limited',
            },
          ],
        }),
        commandBar(
          {
            title: 'ابحث بالحرفة أو القطعة',
            subtitle:
              'مثال: كوب سيراميك أو شمعة أو صندوق خشب للهدايا.',
            searchPlaceholder: 'ابحث (مثال: كوب سيراميك)',
            allCategoriesLabel: 'كل الحرف',
            resultsLabel: 'قطعة',
            clearButtonText: 'مسح',
            stickyLabel: 'Craft Finder',
          },
          'minimal-toolbar',
        ),
        section('filters-sidebar'),
        grid('كل القطع اليدوية', 'editorial-card'),
        featuresBar(
          {
            title: 'ما الذي يميز تجربة Crafted؟',
            subtitle:
              'أظهرنا القصة والقيمة والثقة أثناء التصفح بدل الاعتماد على بطاقة المنتج فقط.',
            items: [
              {
                icon: 'leaf',
                title: 'قطع لها روح',
                description: 'كل قطعة تحمل اختلافًا حقيقيًا لا مجرد نسخة مكررة.',
              },
              {
                icon: 'clipboard',
                title: 'شرح أوضح للحرفة',
                description: 'تصل للمادة أو الحرفة التي تهمك أسرع.',
              },
              {
                icon: 'shield',
                title: 'تغليف آمن',
                description: 'حماية أفضل للقطع الهشة أثناء الشحن.',
              },
              {
                icon: 'target',
                title: 'هدايا محسوبة',
                description: 'مجموعات أوضح للهدايا والطلبات الخاصة.',
              },
            ],
          },
          'service-clarity',
        ),
        newsletter({
          title: 'وصل جديد من الحرفيين',
          subtitle:
            'اشترك ليصلك أولًا أي قطع محدودة أو قصص حرفيين أو عروض موسمية.',
          buttonText: 'تابع الجديد',
          placeholder: 'بريدك الإلكتروني',
        }),
      ],
      {
        layoutHint: 'sidebar-left',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Crafted Checkout',
          message:
            'نظّمنا نهاية الرحلة لتراجع القطع أولًا ثم بيانات الشحن والملاحظات الخاصة.',
          saleLabel: 'صنع يدوي',
          shippingLabel: 'تغليف آمن',
          returnLabel: 'دعم واضح',
          ctaText: 'العودة للمتجر',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'القطع المختارة',
            subtitle: 'راجع القطع والكميات قبل اعتماد الطلب النهائي.',
            continueShoppingText: 'أضف قطعة أخرى',
          },
          'editorial',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'حتى نؤكد الطلب أو نراجع أي تفاصيل خاصة بالتصنيع أو التوصيل.',
            shippingTitle: 'عنوان التوصيل',
            shippingDescription:
              'العنوان الواضح مهم خاصةً للقطع الزجاجية أو الهشة.',
            notesTitle: 'ملاحظات خاصة',
            notesDescription:
              'اكتب أي تخصيص مطلوب أو تنبيه عن توقيت الاستلام أو الإهداء.',
          },
          'standard',
        ),
        payment(
          {
            title: 'اعتماد الطلب',
            subtitle:
              'ملخص هادئ وواضح يركز على الإجمالي وطريقة الدفع فقط.',
            confirmOrderText: 'تأكيد الطلب',
            securityText: 'الدفع آمن وتجربة الطلب موثوقة',
          },
          'minimal',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Crafted Sale',
        message:
          'عروض محدودة على القطع الجاهزة والمنتجات التي تنفد سريعًا.',
        saleLabel: 'Limited',
        shippingLabel: 'تغليف آمن',
        returnLabel: 'هدايا جاهزة',
        ctaText: 'العودة للمتجر',
        ctaLink: '/shop',
      }),
      offerBento({
        badge: 'قطع مختارة',
        title: 'ابدأ من المادة أو نوع الهدية',
        subtitle:
          'العروض الآن أوضح لمن يبحث عن قطعة يدوية محددة أو هدية مميزة.',
        cards: [
          {
            label: 'Clay',
            title: 'خصومات السيراميك والفخار',
            subtitle: 'قطع منزلية فريدة بأسعار أوضح لفترة محدودة.',
            ctaText: 'شاهد السيراميك',
            link: '/sale?category=ceramics',
            tone: 'primary',
            stat: 'Clay',
          },
          {
            label: 'Gift',
            title: 'هدايا يدوية جاهزة',
            subtitle: 'اختيارات جميلة وسهلة للإهداء.',
            ctaText: 'ابدأ من الهدية',
            link: '/collections',
            tone: 'accent',
            stat: 'Gift Ready',
          },
          {
            label: 'Limited',
            title: 'قطع بعدد محدود',
            subtitle: 'تجربة أقرب للالتقاط السريع قبل نفاد القطعة.',
            ctaText: 'تصفح المحدود',
            link: '/shop?sort=newest',
            tone: 'slate',
            stat: 'Rare',
          },
        ],
      }),
      grid('العروض الحالية على القطع اليدوية', 'editorial-card', {
        saleOnly: true,
      }),
    ]),
    collections: discoveryPage([
      collectionsSection('ابدأ من الحرفة أو المادة', 'standard-showcase', {
        subtitle:
          'قسّمنا التجربة حسب السيراميك والخشب والشموع والهدايا اليدوية.',
        ctaText: 'كل الحرف',
        ctaLink: '/collections',
      }),
      grid('قطع مميزة حسب الحرفة', 'editorial-card', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation({
        title: 'تم استلام طلبك اليدوي بنجاح',
        description:
          'سنراجع تفاصيل القطع والتغليف ثم نشارك معك خطوات التجهيز والتوصيل.',
        continueShoppingText: 'العودة للقطع',
        orderNumberPrefix: 'رقم الطلب:',
        supportText: 'لأي تخصيص أو تعديل تواصل معنا عبر',
        statusLabel: 'قيد التجهيز',
        whatsappSupportLabel: 'واتساب Crafted',
        showTimeline: true,
        showTrackOrder: true,
        showReorder: true,
        showRecommended: true,
        recommendedTitle: 'قطع تكمل الطلب',
        recommendedSubtitle:
          'اختيارات إضافية قريبة من نفس الحرفة أو نفس مزاج الهدية.',
      }),
    ]),
  },
  'fresh-cart': {
    shop: conversionPage(
      [
        hero('speed-banner', {
          eyebrow: 'Smart Grocery',
          title: 'تسوق احتياجات البيت عبر كتالوج أسرع وأكثر عملية',
          subtitle:
            'أضفنا Hero واضحًا، أدوات بحث كثيفة، وسكة ثقة للعروض والتوصيل السريع.',
          ctaText: 'ابدأ من الأكثر شراءً',
          ctaLink: '/shop?sort=popular',
          secondaryCtaText: 'شاهد العروض',
          secondaryCtaLink: '/sale',
        }),
        commandBar(
          {
            title: 'ابحث بالمنتج أو القسم أو الاستخدام اليومي',
            subtitle: 'مثل خضار، منظفات، سناكس، أو منتجات أساسية للبيت.',
            searchPlaceholder: 'ابحث (مثال: حليب أو منظف أو أرز)',
            allCategoriesLabel: 'كل الأقسام',
            resultsLabel: 'منتج',
            clearButtonText: 'إعادة الترتيب',
            stickyLabel: 'Quick Basket',
            chipLimit: 6,
          },
          'marketplace-dense',
        ),
        section('filters-sidebar'),
        grid('كل احتياجات البيت والسوبرماركت', 'compact'),
        promoRail(
          {
            badge: 'Fast Delivery',
            title: 'رسائل الثقة الأهم أثناء شراء السوبرماركت',
            subtitle:
              'التوصيل السريع والحد الأدنى للشحن والعروض اليومية أصبحت كلها مرئية أثناء التصفح.',
            spotlightLabel: 'سلة اليوم',
            spotlightTitle: 'احتياجات الأسبوع بسعر أوضح',
            spotlightText:
              'ابدأ من السلة المتكررة بدل البحث المتفرق داخل الشبكة الكثيفة.',
            ctaText: 'شاهد العروض',
            ctaLink: '/sale',
            trustItems:
              'توصيل سريع|خطوات أقل للوصول للمنتجات المتكررة.\nعروض يومية|رسائل السعر في نفس الصفحة.\nبحث عملي|أقسام أوضح للشراء السريع.',
            highlights:
              'توصيل|خلال ساعتين\nشحن مجاني|1200+ ج.م\nخصومات|يومية',
          },
          'trust-rail',
        ),
        featuresBar(
          {
            title: 'لماذا أصبحت تجربة Fresh Cart أوضح؟',
            subtitle:
              'أبرزنا عناصر التوصيل والخدمة والسرعة بشكل صريح داخل الصفحة.',
            items: [
              {
                icon: 'grid',
                title: 'شبكة كثيفة وعملية',
                description: 'عرض مناسب للشراء المتكرر والسلال الكبيرة.',
              },
              {
                icon: 'target',
                title: 'رحلة أسرع للشراء',
                description: 'الوصول للأقسام الأساسية بخطوات أقل.',
              },
              {
                icon: 'clipboard',
                title: 'عروض يومية واضحة',
                description: 'مكان ثابت لرسائل الخصومات والباقات.',
              },
              {
                icon: 'shield',
                title: 'متابعة أوضح',
                description: 'العميل يعرف الحد الأدنى والشحن قبل الإنهاء.',
              },
            ],
          },
          'delivery-clarity',
        ),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Fresh Checkout',
          message:
            'راجع السلة أولًا ثم أكمل بيانات الشحن لتصل احتياجات البيت في أسرع وقت ممكن.',
          saleLabel: 'عروض يومية',
          shippingLabel: 'توصيل سريع',
          returnLabel: 'تأكيد واضح',
          ctaText: 'العودة للسوبرماركت',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'مراجعة سلة البيت',
            subtitle: 'تحقق من الكميات والمنتجات المتكررة قبل الإرسال.',
            continueShoppingText: 'أضف منتجات أخرى',
          },
          'compact',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'الهاتف مهم لتأكيد الطلب أو الترتيب في حال وجود بدائل للمنتج.',
            shippingTitle: 'عنوان التوصيل',
            shippingDescription:
              'أدخل أقرب عنوان واضح لتسهيل التوصيل السريع.',
            notesTitle: 'ملاحظات على الطلب',
            notesDescription:
              'يمكنك إضافة بدائل أو وقت مفضل للتسليم أو تنبيه خاص بالبواب.',
          },
          'compact',
        ),
        payment(
          {
            title: 'تأكيد الدفع',
            subtitle:
              'ملخص واضح للسلة مع التأكيد النهائي على الإجمالي والشحن.',
            confirmOrderText: 'إرسال الطلب',
            securityText: 'الطلب محفوظ والدفع مؤمّن',
          },
          'cards',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Daily Deals',
        message:
          'خصومات يومية على المنتجات المتكررة وسلال البيت الأساسية.',
        saleLabel: 'Fresh Picks',
        shippingLabel: 'سريع',
        returnLabel: 'يومي',
        ctaText: 'العودة للمتجر',
        ctaLink: '/shop',
      }),
      offerBento(
        {
          badge: 'ابدأ من نوع السلة',
          title: 'نظمنا العروض حسب سلوك الشراء المتكرر',
          subtitle:
            'من احتياجات الفطور حتى المنظفات والسناك، القرار صار أسرع.',
          cards: [
            {
              label: 'Breakfast',
              title: 'أساسيات الفطور',
              subtitle: 'حليب وجبن ومخبوزات ومنتجات متكررة الطلب.',
              ctaText: 'شاهد الفطور',
              link: '/sale?category=breakfast',
              tone: 'primary',
              stat: 'Daily',
            },
            {
              label: 'Cleaning',
              title: 'منظفات البيت',
              subtitle: 'خصومات على المنتجات التي تُشترى باستمرار.',
              ctaText: 'ابدأ التنظيف',
              link: '/collections',
              tone: 'accent',
              stat: 'Household',
            },
            {
              label: 'Restock',
              title: 'إعادة شراء أوفر',
              subtitle: 'سلال جاهزة للطلبات المتكررة كل أسبوع.',
              ctaText: 'شاهد السلال',
              link: '/shop?sort=popular',
              tone: 'slate',
              stat: 'Restock',
            },
          ],
        },
        'combo-deals',
      ),
      grid('العروض الحالية لاحتياجات البيت', 'compact', { saleOnly: true }),
    ]),
    collections: discoveryPage([
      collectionsSection('ابدأ من القسم أو نوع السلة', 'fast-nav-grid', {
        subtitle:
          'خضار وفاكهة، سناكس، منظفات، ومنتجات أساسية لرحلة شراء أسرع.',
        ctaText: 'كل الأقسام',
        ctaLink: '/collections',
      }),
      grid('ابدأ من أكثر الأقسام طلبًا', 'compact', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation({
        title: 'تم إرسال طلب Fresh Cart',
        description:
          'نراجع السلة الآن وسنشاركك تحديث التوصيل أو أي بدائل محتملة قبل التحضير النهائي.',
        continueShoppingText: 'العودة إلى المتجر',
        orderNumberPrefix: 'رقم الطلب:',
        supportText: 'لأي تعديل على السلة أو العنوان تواصل معنا عبر',
        statusLabel: 'تحت المراجعة',
        whatsappSupportLabel: 'واتساب Fresh Cart',
        showTimeline: true,
        showTrackOrder: true,
        showReorder: true,
        showRecommended: true,
        recommendedTitle: 'منتجات تكمل سلتك',
        recommendedSubtitle:
          'إضافات شائعة ترفع قيمة الطلب وتختصر عليك إعادة الشراء.',
      }),
    ]),
  },
  'skill-lab': {
    shop: conversionPage(
      [
        hero('neon-dark', {
          eyebrow: 'Skill Finder',
          title: 'اختيارات أوضح للكورسات والمنتجات الرقمية',
          subtitle:
            'أضفنا بنية متجر أكثر وضوحًا لمسارات التعلم والعروض والمنتجات سريعة البدء.',
          ctaText: 'ابدأ من المسارات',
          ctaLink: '/collections',
          secondaryCtaText: 'شاهد العروض',
          secondaryCtaLink: '/sale',
        }),
        commandBar(
          {
            title: 'ابحث بالمهارة أو نوع المنتج',
            subtitle:
              'مثل تصميم، برمجة، تحليل بيانات، أو ملفات وقوالب جاهزة.',
            searchPlaceholder: 'ابحث (مثال: كورس تصميم أو قالب)',
            allCategoriesLabel: 'كل المسارات',
            resultsLabel: 'منتج',
            clearButtonText: 'مسح',
            stickyLabel: 'Path Finder',
          },
          'minimal-toolbar',
        ),
        section('filters-sidebar'),
        grid('كل المسارات والمنتجات الرقمية', 'glass-card'),
        promoRail(
          {
            badge: 'Learning Signals',
            title: 'رسائل قرار الشراء داخل نفس الصفحة',
            subtitle:
              'نوضح مسار التعلم، العروض، والقيمة العملية أثناء الاستكشاف.',
            spotlightLabel: 'Launch Pack',
            spotlightTitle: 'ابدأ مهارة جديدة بدون تشتيت',
            spotlightText:
              'تصفح الكورسات والباقات والأدوات من واجهة أكثر تركيزًا وحسمًا.',
            ctaText: 'شاهد العروض',
            ctaLink: '/sale',
            trustItems:
              'مسارات أوضح|ابدأ من النتيجة أو المهارة المطلوبة.\nقيمة عملية|صفحات منظمة للمنتجات الرقمية والقوالب.\nشراء أسرع|واجهة أقل تشتيتًا للقرار.',
            highlights:
              'باقات|متاحة\nخصومات|حتى 25%\nوصول|فوري',
          },
          'campaign-rail',
        ),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Digital Checkout',
          message:
            'راجع المنتجات الرقمية أو الكورس قبل اعتماد الطلب والحصول على الوصول.',
          saleLabel: 'وصول فوري',
          shippingLabel: 'بدون انتظار',
          returnLabel: 'تأكيد واضح',
          ctaText: 'العودة للمتجر',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'مراجعة المحتوى المختار',
            subtitle:
              'تحقق من الكورسات أو الملفات قبل تأكيد الطلب النهائي.',
            continueShoppingText: 'أضف منتجًا آخر',
          },
          'editorial',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات الحساب',
            contactDescription:
              'البريد والهاتف يساعداننا في إرسال الوصول والدعم بعد الشراء.',
            shippingTitle: 'بيانات الفاتورة',
            shippingDescription:
              'حتى مع المنتجات الرقمية نحتاج بيانات واضحة لمتابعة الطلب والدعم.',
            notesTitle: 'ملاحظات إضافية',
            notesDescription:
              'مثل طلب فاتورة أو استفسار مرتبط بالوصول أو الشهادة.',
          },
          'split',
        ),
        payment(
          {
            title: 'تأكيد الدفع',
            subtitle:
              'الملخص هنا يركز على الوصول الفوري وقيمة الطلب النهائية.',
            confirmOrderText: 'احصل على الوصول',
            securityText: 'الدفع مشفر والوصول للمنتج مؤكد بعد الاعتماد',
          },
          'cards',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Launch Deals',
        message:
          'خصومات على الكورسات والباقات والمنتجات الرقمية الجاهزة للتنزيل.',
        saleLabel: 'Fast Start',
        shippingLabel: 'Instant Access',
        returnLabel: 'وقت محدود',
        ctaText: 'العودة للمتجر',
        ctaLink: '/shop',
      }),
      offerBento({
        badge: 'ابدأ من نوع التعلم',
        title: 'قسّمنا العروض حسب شكل الرحلة التعليمية',
        subtitle:
          'كورسات كاملة، أدوات جاهزة، أو باقات إطلاق للمبتدئين.',
        cards: [
          {
            label: 'Courses',
            title: 'مسارات تعليمية كاملة',
            subtitle: 'ابدأ من كورسات منظمة بخطوات أوضح.',
            ctaText: 'شاهد المسارات',
            link: '/sale?category=courses',
            tone: 'primary',
            stat: 'Courses',
          },
          {
            label: 'Templates',
            title: 'قوالب وأدوات جاهزة',
            subtitle: 'منتجات رقمية سريعة التنفيذ والاستخدام.',
            ctaText: 'شاهد الأدوات',
            link: '/collections',
            tone: 'accent',
            stat: 'Templates',
          },
          {
            label: 'Bundles',
            title: 'باقات إطلاق أوفر',
            subtitle: 'حزم تجمع التعلم مع الملفات الداعمة.',
            ctaText: 'ابدأ الآن',
            link: '/shop?sort=popular',
            tone: 'slate',
            stat: 'Bundle',
          },
        ],
      }),
      grid('العروض الحالية على المنتجات الرقمية', 'glass-card', {
        saleOnly: true,
      }),
    ]),
    collections: discoveryPage([
      collectionsSection('ابدأ من المهارة أو شكل المنتج', 'standard-showcase', {
        subtitle:
          'تصميم، برمجة، أعمال، أو منتجات جاهزة للتنزيل ضمن أقسام أوضح.',
        ctaText: 'كل المسارات',
        ctaLink: '/collections',
      }),
      grid('ابدأ من أشهر المسارات', 'glass-card', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation({
        title: 'تم تفعيل طلبك في Skill Lab',
        description:
          'نراجع الآن تفاصيل الطلب ثم نشارك معك الوصول وأي معلومات دعم مرتبطة بالمنتج.',
        continueShoppingText: 'العودة إلى المسارات',
        orderNumberPrefix: 'مرجع الطلب:',
        supportText: 'للدعم أو المساعدة في الوصول تواصل معنا عبر',
        statusLabel: 'قيد المعالجة',
        whatsappSupportLabel: 'واتساب Skill Lab',
        showTimeline: true,
        showTrackOrder: true,
        showReorder: true,
        showRecommended: true,
        recommendedTitle: 'منتجات تكمل مسارك',
        recommendedSubtitle:
          'اختيارات إضافية من نفس المهارة أو منتجات تساعدك على التطبيق أسرع.',
      }),
    ]),
  },
  'green-haven': {
    home: discoveryPage([
      hero('nature-breeze', {
        eyebrow: 'Plant Mood',
        title: 'جدد مساحتك بطاقة خضراء',
        subtitle:
          'واجهة أكثر دفئًا لعشاق النباتات مع دخول أسرع للنباتات الداخلية والهدايا وأدوات العناية.',
        ctaText: 'ابدأ من النباتات الداخلية',
        ctaLink: '/collections',
        secondaryCtaText: 'عروض النباتات',
        secondaryCtaLink: '/sale',
      }),
      collectionsSection('ابدأ من نوع المساحة أو مستوى العناية', 'standard-showcase', {
        subtitle:
          'قسمنا الصفحة حسب نباتات داخلية، هدايا، شتلات، وأدوات عناية.',
        ctaText: 'كل الأقسام',
        ctaLink: '/collections',
      }),
      shoppingIntents({
        badge: 'ابدأ من احتياجك',
        title: 'من أي مدخل تريد أن تبدأ؟',
        subtitle:
          'نباتات للمكتب، زينة للبيت، هدايا، أو مستلزمات عناية يومية.',
        items: [
          {
            eyebrow: 'Indoor',
            title: 'نباتات داخلية',
            subtitle: 'اختيارات مناسبة للبيت والمكتب بضوء متوسط.',
            link: '/collections',
            tone: 'primary',
            chip: 'Indoor',
          },
          {
            eyebrow: 'Care',
            title: 'عناية يومية',
            subtitle: 'تربة وأصص وري ومستلزمات للروتين الأخضر.',
            link: '/shop',
            tone: 'emerald',
            chip: 'Care',
          },
          {
            eyebrow: 'Gift',
            title: 'هدايا نباتية',
            subtitle: 'بوكسات وتغليف مناسب للهدايا الهادئة.',
            link: '/sale',
            tone: 'accent',
            chip: 'Gift',
          },
          {
            eyebrow: 'Easy',
            title: 'نباتات سهلة العناية',
            subtitle: 'ابدأ من اختيارات لا تحتاج خبرة كبيرة.',
            link: '/shop?sort=popular',
            tone: 'slate',
            chip: 'Easy',
          },
        ],
      }),
      featuresBar(
        {
          title: 'لماذا تجربة Green Haven أوضح الآن؟',
          subtitle:
            'أضفنا أقسامًا تشرح الخدمة والثقة قبل أن يصل العميل إلى السلة.',
          items: [
            {
              icon: 'leaf',
              title: 'اختيارات مناسبة للبيت',
              description: 'تنظيم أوضح بين نباتات داخلية وخارجية وهدايا.',
            },
            {
              icon: 'search',
              title: 'وصول أسرع',
              description: 'ابدأ من نوع النبات أو مستوى العناية بدل شبكة عامة.',
            },
            {
              icon: 'shield',
              title: 'إرشادات واضحة',
              description: 'معلومات مبسطة عن التوصيل والعناية بعد الشراء.',
            },
            {
              icon: 'clipboard',
              title: 'مستلزمات مكملة',
              description: 'الأصص والتربة والأدوات أقرب للقرار داخل المتجر.',
            },
          ],
        },
        'service-clarity',
      ),
      grid('منتجات مختارة لبداية منعشة', 'standard', { limit: 8 }),
      newsletter({
        title: 'وصل جديد لعشاق النباتات',
        subtitle:
          'اشترك ليصلك أي وصول جديد أو باقات هدايا أو عروض على النباتات.',
        buttonText: 'تابع الجديد',
        placeholder: 'بريدك الإلكتروني',
      }),
    ]),
    shop: conversionPage(
      [
        hero('nature-breeze', {
          eyebrow: 'Green Catalog',
          title: 'تسوّق النباتات حسب المساحة أو مستوى العناية',
          subtitle:
            'صفحة متجر أوضح لعشاق النباتات مع مسارات للبيت والمكتب والهدايا.',
          ctaText: 'ابدأ من النباتات الداخلية',
          ctaLink: '/collections',
          secondaryCtaText: 'شاهد العروض',
          secondaryCtaLink: '/sale',
        }),
        shoppingIntents({
          badge: 'اختر المسار الأقرب لك',
          title: 'هل تبحث عن نبات أم هدية أم أدوات عناية؟',
          subtitle:
            'رتبنا الرحلة حسب الاستخدام الفعلي بدل تصفح كل الأصناف معًا.',
          items: [
            {
              eyebrow: 'Indoor',
              title: 'نباتات داخلية',
              subtitle: 'اختيارات للمكاتب والبيوت بإضاءة متوسطة.',
              link: '/collections',
              tone: 'primary',
              chip: 'Indoor',
            },
            {
              eyebrow: 'Outdoor',
              title: 'زراعة وشُرفات',
              subtitle: 'شتلات وأدوات تناسب المساحات الخارجية الصغيرة.',
              link: '/shop',
              tone: 'emerald',
              chip: 'Outdoor',
            },
            {
              eyebrow: 'Gift',
              title: 'هدايا نباتية',
              subtitle: 'بوكسات وتغليف أنيق للمناسبات الهادئة.',
              link: '/sale',
              tone: 'accent',
              chip: 'Gift',
            },
            {
              eyebrow: 'Care',
              title: 'مستلزمات العناية',
              subtitle: 'أصص وتربة وأدوات ري وسماد.',
              link: '/shop?sort=popular',
              tone: 'slate',
              chip: 'Care',
            },
          ],
        }),
        commandBar(
          {
            title: 'ابحث بالنوع أو بالمكان',
            subtitle: 'مثال: نبات داخلي أو أصيص أو تربة أو هدية خضراء.',
            searchPlaceholder: 'ابحث (مثال: نبات ظل أو أصيص)',
            allCategoriesLabel: 'كل النباتات',
            resultsLabel: 'منتج',
            clearButtonText: 'مسح',
            stickyLabel: 'Green Finder',
          },
          'minimal-toolbar',
        ),
        section('filters-sidebar'),
        grid('كل النباتات والمستلزمات', 'standard'),
        featuresBar(
          {
            title: 'الخدمة التي تحتاجها قبل الشراء',
            subtitle:
              'رسائل التوصيل والعناية والمجموعة المناسبة للمساحة أصبحت أقرب للعميل.',
            items: [
              {
                icon: 'leaf',
                title: 'اختيار حسب المساحة',
                description: 'بدء أسرع من البيت أو المكتب أو البلكونة.',
              },
              {
                icon: 'grid',
                title: 'عناية أوضح',
                description: 'الوصول لمستلزمات العناية صار جزءًا من الرحلة نفسها.',
              },
              {
                icon: 'shield',
                title: 'توصيل محسوب',
                description: 'تعليمات أوضح للنباتات الحساسة أو الأكبر حجمًا.',
              },
              {
                icon: 'target',
                title: 'هدايا خضراء',
                description: 'باقات جاهزة للمناسبات أو الزيارات الهادئة.',
              },
            ],
          },
          'delivery-clarity',
        ),
        newsletter({
          title: 'لا تفوّت وصولات Green Haven الجديدة',
          subtitle:
            'اشترك لتصلك النباتات الجديدة وعروض الأصص والمستلزمات أولًا.',
          buttonText: 'اشترك',
          placeholder: 'بريدك الإلكتروني',
        }),
      ],
      {
        layoutHint: 'sidebar-left',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Green Checkout',
          message:
            'راجع النباتات والأصص قبل اعتماد الطلب وحدد عنوانًا مناسبًا للتوصيل الآمن.',
          saleLabel: 'عناية أوضح',
          shippingLabel: 'توصيل محسوب',
          returnLabel: 'متابعة سريعة',
          ctaText: 'العودة للمتجر',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'مراجعة السلة الخضراء',
            subtitle: 'تحقق من النباتات والمستلزمات والكميات قبل التأكيد.',
            continueShoppingText: 'أضف نباتًا آخر',
          },
          'standard',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'حتى نؤكد الطلب ونرتب التوصيل خاصةً للنباتات الكبيرة أو الحساسة.',
            shippingTitle: 'عنوان التوصيل',
            shippingDescription:
              'أدخل عنوانًا واضحًا لتسهيل تسليم النباتات دون ضرر.',
            notesTitle: 'ملاحظات إضافية',
            notesDescription:
              'مثل وقت مناسب للاستلام أو تعليمات عن المدخل أو الشرفة.',
          },
          'split',
        ),
        payment(
          {
            title: 'تأكيد الطلب',
            subtitle:
              'ملخص مختصر وواضح للسلة مع طريقة الدفع قبل الإرسال النهائي.',
            confirmOrderText: 'إرسال الطلب',
            securityText: 'الطلب محفوظ والدفع مؤمن',
          },
          'minimal',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Green Sale',
        message:
          'عروض على نباتات مختارة وأصص ومستلزمات عناية لفترة محدودة.',
        saleLabel: 'Plant Deals',
        shippingLabel: 'هدايا خضراء',
        returnLabel: 'وقت محدود',
        ctaText: 'العودة للمتجر',
        ctaLink: '/shop',
      }),
      offerBento({
        badge: 'ابدأ من نوع الطلب',
        title: 'رتبنا العروض حسب شكل الاستخدام',
        subtitle:
          'نباتات داخلية، هدايا، أو مستلزمات عناية حسب نية الشراء نفسها.',
        cards: [
          {
            label: 'Indoor',
            title: 'نباتات داخلية موفرة',
            subtitle: 'اختيارات مناسبة للبيت والمكتب بأسعار أوضح.',
            ctaText: 'شاهد النباتات',
            link: '/sale?category=indoor',
            tone: 'primary',
            stat: 'Indoor',
          },
          {
            label: 'Care',
            title: 'مستلزمات العناية',
            subtitle: 'أصص وتربة وأدوات مع خصومات موسمية.',
            ctaText: 'ابدأ العناية',
            link: '/collections',
            tone: 'accent',
            stat: 'Care',
          },
          {
            label: 'Gift',
            title: 'هدايا نباتية',
            subtitle: 'اختيارات هادئة ومناسبة للمناسبات اللطيفة.',
            ctaText: 'شاهد الهدايا',
            link: '/shop?sort=popular',
            tone: 'slate',
            stat: 'Gift',
          },
        ],
      }),
      grid('عروض النباتات والمستلزمات', 'standard', { saleOnly: true }),
    ]),
    collections: discoveryPage([
      collectionsSection('ابدأ من المساحة أو مستوى العناية', 'standard-showcase', {
        subtitle:
          'نباتات للمكتب والبيت والبلكونة مع أقسام أوضح للأدوات والهدايا.',
        ctaText: 'كل الأقسام',
        ctaLink: '/collections',
      }),
      grid('اختيارات خضراء جاهزة للبدء', 'standard', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation({
        title: 'تم اعتماد طلب Green Haven',
        description:
          'سنراجع تفاصيل الطلب ونجهز النباتات أو المستلزمات ثم نشارك معك خطوات التوصيل.',
        continueShoppingText: 'العودة إلى النباتات',
        orderNumberPrefix: 'رقم الطلب:',
        supportText: 'إذا احتجت تعديل العنوان أو وقت التسليم تواصل معنا عبر',
        statusLabel: 'قيد المراجعة',
        whatsappSupportLabel: 'واتساب Green Haven',
        showTimeline: true,
        showTrackOrder: true,
        showReorder: true,
        showRecommended: true,
        recommendedTitle: 'إضافات تكمل الزاوية الخضراء',
        recommendedSubtitle:
          'منتجات قريبة من الطلب الحالي مثل أصص أو أدوات ري أو نباتات مكملة.',
      }),
    ]),
  },
  'cyber-gear': {
    home: discoveryPage([
      hero('cyber-glitch', {
        eyebrow: 'Gear Drop',
        title: 'جهز مقاتلتك',
        subtitle:
          'واجهة أقوى لمعدات الجيمينج والإكسسوارات مع مدخل أوضح للعروض والباقات.',
        ctaText: 'ابدأ من الـ setups',
        ctaLink: '/collections',
        secondaryCtaText: 'شاهد التخفيضات',
        secondaryCtaLink: '/sale',
      }),
      shoppingIntents({
        badge: 'ابدأ من الـ setup',
        title: 'اختر الطريق الأسرع لتجهيزك القادم',
        subtitle:
          'شاشات، إضاءة، إكسسوارات، أو باقات كاملة للاعبين وصانعي المحتوى.',
        items: [
          {
            eyebrow: 'Setup',
            title: 'باقات التجهيز الكامل',
            subtitle: 'ابدأ من مجموعات جاهزة بدل جمع القطع قطعة قطعة.',
            link: '/collections',
            tone: 'primary',
            chip: 'Setup',
          },
          {
            eyebrow: 'Audio',
            title: 'سماعات وميكروفونات',
            subtitle: 'اختيارات للبث أو اللعب أو المكالمات الواضحة.',
            link: '/shop?sort=popular',
            tone: 'accent',
            chip: 'Audio',
          },
          {
            eyebrow: 'Desk',
            title: 'إكسسوارات المكتب',
            subtitle: 'إضاءة، قواعد، ماتات، وتنظيم أقوى للركنة.',
            link: '/shop',
            tone: 'emerald',
            chip: 'Desk',
          },
          {
            eyebrow: 'Deals',
            title: 'عروض اليوم',
            subtitle: 'منتجات عليها حركة أعلى وتسعير أوضح لفترة محدودة.',
            link: '/sale',
            tone: 'slate',
            chip: 'Deals',
          },
        ],
      }),
      offerBento(
        {
          badge: 'Gear Drops',
          title: 'حملات أوضح للقطع الأكثر تأثيرًا',
          subtitle:
            'ابدأ من الصوت أو الإضاءة أو باقة setup كاملة حسب شكل الاستخدام.',
          cards: [
            {
              label: 'Audio Pick',
              title: 'سماعات ومايكات للبث واللعب',
              subtitle: 'اختيارات مطلوبة للصوت الواضح أثناء اللعب أو الستريم.',
              ctaText: 'شاهد الصوت',
              link: '/shop?sort=popular',
              tone: 'primary',
              stat: 'الأكثر طلبًا',
            },
            {
              label: 'RGB Setup',
              title: 'إضاءة وترقيات شكلية',
              subtitle: 'إكسسوارات وإضاءة ترفع شكل الركنة بسرعة ومن دون تعقيد.',
              ctaText: 'شاهد الإضاءة',
              link: '/sale',
              tone: 'accent',
              stat: 'عروض اليوم',
            },
            {
              label: 'Bundle Ready',
              title: 'باقات setup جاهزة',
              subtitle: 'ابدأ من تجميعة كاملة بدل شراء كل قطعة بشكل منفصل.',
              ctaText: 'ابدأ بالباقات',
              link: '/collections',
              tone: 'slate',
              stat: 'قرار أسرع',
            },
          ],
        },
        'campaign-stack',
      ),
      collectionsSection('استكشف التجهيزات حسب الاستخدام', 'fast-nav-grid', {
        subtitle:
          'جلسات لعب، بث مباشر، تنظيم مكتب، أو إضاءة وتجهيزات إضافية.',
        ctaText: 'كل الفئات',
        ctaLink: '/collections',
        limit: CYBER_GEAR_PREVIEW_COLLECTIONS.length,
        collections: CYBER_GEAR_PREVIEW_COLLECTIONS,
      }),
      grid('منتجات مختارة للجيمينج والـ setup', 'glass-card', { limit: 8 }),
      newsletter({
        title: 'تابع الـ drops الجديدة',
        subtitle:
          'اشترك ليصلك أي معدات جديدة أو باقات setups أو عروض محدودة.',
        buttonText: 'تابع الآن',
        placeholder: 'بريدك الإلكتروني',
      }),
    ]),
    shop: conversionPage(
      [
        hero('cyber-glitch', {
          eyebrow: 'Cyber Catalog',
          title: 'كتالوج أوضح لمعدات الجيمينج والـ setup',
          subtitle:
            'تجربة تصفح أكثف مع شريط أوامر أفضل وسكة حملات جانبية للخصومات والباقات.',
          ctaText: 'ابدأ من الباقات',
          ctaLink: '/collections',
          secondaryCtaText: 'شاهد العروض',
          secondaryCtaLink: '/sale',
        }),
        commandBar(
          {
            title: 'ابحث بالجهاز أو القطعة أو الاستخدام',
            subtitle:
              'مثال: سماعة، إضاءة RGB، مايك، أو معدات الـ setup.',
            searchPlaceholder: 'ابحث (مثال: كيبورد أو مايك)',
            allCategoriesLabel: 'كل الجير',
            resultsLabel: 'منتج',
            clearButtonText: 'إعادة الضبط',
            stickyLabel: 'Gear Search',
          },
          'marketplace-dense',
        ),
        section('filters-sidebar'),
        grid('كل معدات الجيمينج والإكسسوارات', 'glass-card'),
        promoRail(
          {
            badge: 'عروض وتجهيزات',
            title: 'عروض وباقات تسرّع قرار الشراء',
            subtitle:
              'خصومات على القطع الأساسية وباقات كاملة تساعدك تبدأ من الأنسب لركنتك.',
            spotlightLabel: 'عرض الأسبوع',
            spotlightTitle: 'باقات setup جاهزة',
            spotlightText:
              'ابدأ من مجموعات أوضح للاعبين والبث والـ desk setup بدل تجميع القطع يدويًا.',
            ctaText: 'شاهد العروض',
            ctaLink: '/sale',
            trustItems:
              'باقات جاهزة|مدخل أسرع لتجهيز الركنة من أول زيارة.\nشحن أوضح|رسائل خدمة وثقة أثناء التصفح وحتى الدفع.\nمقارنة أسهل|رتبنا المسارات حسب الصوت والإضاءة وتنظيم المكتب.',
            highlights:
              'RGB Deals|مستمرة\nBundles|متاحة\nخصومات|حتى 22%',
          },
          'campaign-rail',
        ),
      ],
      {
        layoutHint: 'commerce-3col',
      },
    ),
    pdp: conversionPage(
      [
        section('product-gallery', undefined, 'neon-showcase'),
        section(
          'product-info',
          {
            addToCartText: 'أضف الجير للسلة',
            descriptionTitle: 'تفاصيل القطعة',
            shippingTitle: 'الشحن والتجهيز',
            shippingText:
              'نوضح رسوم الشحن داخل صفحة الدفع قبل الاعتماد النهائي، ونجهز الطلب بسرعة مع رسالة متابعة أوضح للقطع والإكسسوارات.',
            guaranteesTitle: 'ليه Cyber Gear؟',
            guaranteesSubtitle:
              'المواصفات والتهيئة ورسائل الثقة تجتمع في نفس المسار لتقليل التردد قبل غلق الطلب.',
            guaranteeStyle: 'minimal',
            guaranteeItems: [
              {
                title: 'تهيئة أوضح',
                description: 'ابدأ من النسخة المناسبة ثم أكمل الطلب أو الباندل في نفس الصفحة.',
                icon: 'Settings2',
              },
              {
                title: 'شحن مرئي',
                description: 'رسوم التوصيل والتأكيد تبقى واضحة قبل الانتقال للدفع.',
                icon: 'Truck',
              },
              {
                title: 'إضافات منطقية',
                description: 'الاقتراحات بعد المنتج تخدم setup كامل بدل ترك الصفحة تنتهي مبكرًا.',
                icon: 'PackagePlus',
              },
            ],
          },
          'gear-loadout',
        ),
        section(
          'bought-together',
          {
            title: 'كمّل الـ setup',
            subtitle:
              'إضافات منطقية مثل الصوت أو الإضاءة أو تنظيم المكتب حتى تقفل الركنة في نفس المسار.',
            limit: 3,
            addBundleText: 'أضف الباندل المحدد',
          },
          'compact',
        ),
        section(
          'reviews',
          {
            title: 'تقييمات اللاعبين وصناع المحتوى',
            mediaTitle: 'صور ومقاطع من الاستخدام',
            subtitle:
              'المراجعات تساعدك تقارن بين القطعة الحالية والبدائل قبل ما تعتمد الطلب.',
            reviewLimit: 6,
            showMediaFeed: true,
          },
          'editorial',
        ),
        section(
          'related-products',
          {
            title: 'قطع قريبة من نفس الـ vibe',
            subtitle:
              'بدائل أو إضافات قريبة لو تريد نفس الإحساس البصري لكن بسعر أو تكوين مختلف.',
            limit: 4,
          },
          'glass',
        ),
      ],
      {
        layoutHint: 'product-detail',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Cyber Checkout',
          message:
            'راجِع الـ gear والـ setup قبل تأكيد الطلب ثم أكمل العنوان والدفع في مسار أوضح.',
          saleLabel: 'باقات جاهزة',
          shippingLabel: 'توصيل سريع',
          returnLabel: 'تأكيد واضح',
          ctaText: 'العودة للمتجر',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'مراجعة الجير المختار',
            subtitle: 'تحقق من القطع والكميات قبل الانتقال للدفع.',
            continueShoppingText: 'أضف قطعة أخرى',
          },
          'compact',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'سنستخدمها لتأكيد الطلب أو أي تنبيه مرتبط بالشحنة.',
            shippingTitle: 'عنوان الاستلام',
            shippingDescription:
              'أدخل عنوانًا واضحًا لتسهيل توصيل المعدات التقنية.',
            notesTitle: 'ملاحظات إضافية',
            notesDescription:
              'مثل وقت مناسب للاستلام أو تفاصيل خاصة بالدور أو المكتب.',
          },
          'split',
        ),
        payment(
          {
            title: 'اعتماد الطلب',
            subtitle:
              'الملخص النهائي واضح ومركّز على القيمة وطريقة الدفع فقط.',
            confirmOrderText: 'تأكيد الطلب',
            securityText: 'الدفع آمن وبياناتك مشفرة',
          },
          'cards',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Cyber Sale',
        message:
          'خصومات على الجير والباقات والـ desk setup لفترة محدودة.',
        saleLabel: 'Drops',
        shippingLabel: 'Fast',
        returnLabel: 'Limited',
        ctaText: 'العودة للمتجر',
        ctaLink: '/shop',
      }),
      offerBento(
        {
          badge: 'ابدأ من نوع الـ setup',
          title: 'قسّمنا العروض حسب شكل الاستخدام',
          subtitle:
            'صوت، إضاءة، desk setup، أو باقات كاملة للاعبين وصناع المحتوى.',
          cards: [
            {
              label: 'Audio',
              title: 'سماعات وميكروفونات',
              subtitle: 'خصومات أوضح على الأدوات الأساسية للبث واللعب.',
              ctaText: 'شاهد الصوت',
              link: '/sale?category=audio',
              tone: 'primary',
              stat: 'Audio',
            },
            {
              label: 'Desk',
              title: 'إضاءة وتجهيز المكتب',
              subtitle: 'اختيارات عملية لمظهر أقوى وتنظيم أفضل.',
              ctaText: 'شاهد المكتب',
              link: '/collections',
              tone: 'accent',
              stat: 'Desk',
            },
            {
              label: 'Bundle',
              title: 'باقات setup جاهزة',
              subtitle: 'مجموعات تقلل وقت الاختيار وتسرع القرار.',
              ctaText: 'ابدأ الآن',
              link: '/shop?sort=popular',
              tone: 'slate',
              stat: 'Bundle',
            },
          ],
        },
        'campaign-stack',
      ),
      grid('العروض الحالية على الجير', 'glass-card', { saleOnly: true }),
    ]),
    collections: discoveryPage([
      collectionsSection('ابدأ من نوع الـ setup أو الاستخدام', 'fast-nav-grid', {
        subtitle:
          'جيمينج، بث مباشر، تنظيم مكتب، أو إضاءة وتجهيزات إضافية.',
        ctaText: 'كل الفئات',
        ctaLink: '/collections',
        limit: CYBER_GEAR_PREVIEW_COLLECTIONS.length,
        collections: CYBER_GEAR_PREVIEW_COLLECTIONS,
      }),
      grid('منتجات مختارة حسب الفئة', 'glass-card', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation({
        title: 'تم قفل طلب Cyber Gear',
        description:
          'سيتم تجهيز الـ gear ومراجعة الشحنة ثم نشاركك خطوات المتابعة والتوصيل.',
        continueShoppingText: 'العودة إلى الجير',
        orderNumberPrefix: 'مرجع الطلب:',
        supportText: 'لأي تعديل أو إضافة على الطلب تواصل معنا عبر',
        statusLabel: 'قيد المعالجة',
        whatsappSupportLabel: 'واتساب Cyber Gear',
        showTimeline: true,
        showTrackOrder: true,
        showReorder: true,
        showRecommended: true,
        recommendedTitle: 'إضافات تقوي الـ setup',
        recommendedSubtitle:
          'منتجات شائعة تضيف قيمة مباشرة بعد إنهاء الطلب الأساسي.',
      }),
    ]),
  },
  'baby-cloud': {
    home: discoveryPage([
      hero('warm-cozy', {
        eyebrow: 'Baby Essentials',
        title: 'كل الحب لطفلك المدلل',
        subtitle:
          'واجهة ألطف وأكثر اكتمالًا لمستلزمات الأطفال مع مسارات أوضح للأمهات والهدايا.',
        ctaText: 'ابدأ من الاحتياجات الأساسية',
        ctaLink: '/collections',
        secondaryCtaText: 'عروض الأطفال',
        secondaryCtaLink: '/sale',
      }),
      collectionsSection('ابدأ من الفئة الأقرب لرحلتك', 'playful-bubbles', {
        subtitle:
          'ملابس، عناية، رضاعة، لعب، وهدايا للمولود الجديد في شبكة أكثر دفئًا.',
        ctaText: 'كل الأقسام',
        ctaLink: '/collections',
      }),
      shoppingIntents({
        badge: 'ابدأ من احتياج الطفل',
        title: 'اختصر القرار من أول دخول',
        subtitle:
          'قسّمنا الرحلة حسب الملابس والعناية والرضاعة والهدايا وباقات البداية.',
        items: [
          {
            eyebrow: 'Wardrobe',
            title: 'ملابس يومية',
            subtitle: 'اختيارات ناعمة ومريحة للاستخدام المتكرر.',
            link: '/collections',
            tone: 'primary',
            chip: 'Wardrobe',
          },
          {
            eyebrow: 'Care',
            title: 'عناية ولطافة',
            subtitle: 'منتجات للعناية اليومية والتنظيف اللطيف.',
            link: '/shop',
            tone: 'accent',
            chip: 'Care',
          },
          {
            eyebrow: 'Gift',
            title: 'هدايا للمولود',
            subtitle: 'بوكسات جاهزة وتنسيقات هادئة للإهداء.',
            link: '/sale',
            tone: 'emerald',
            chip: 'Gift',
          },
          {
            eyebrow: 'Starter',
            title: 'باقات البداية',
            subtitle: 'مجموعات تجمع الأساسيات معًا لتسهيل أول شراء.',
            link: '/shop?sort=popular',
            tone: 'slate',
            chip: 'Starter',
          },
        ],
      }),
      featuresBar(
        {
          title: 'ما الذي أصبح أوضح في Baby Cloud؟',
          subtitle:
            'أضفنا أقسامًا تخفف التردد وتجمع الاحتياجات الأساسية في مسارات ألطف.',
          items: [
            {
              icon: 'shield',
              title: 'عناية مطمئنة',
              description: 'رسائل أوضح عن العناية والراحة والشراء الآمن.',
            },
            {
              icon: 'grid',
              title: 'باقات بداية',
              description: 'الوصول للأساسيات أسرع بدل تجميعها يدويًا.',
            },
            {
              icon: 'target',
              title: 'هدايا جاهزة',
              description: 'اقتراحات ألطف للمولود والزيارات العائلية.',
            },
            {
              icon: 'clipboard',
              title: 'تصفح أسهل',
              description: 'فئات أوضح للملابس والعناية والرضاعة.',
            },
          ],
        },
        'kids-guarantee',
      ),
      grid('منتجات مختارة للأطفال', 'playful-toybox', { limit: 8 }),
      newsletter({
        title: 'وصل جديد للأطفال والأمهات',
        subtitle:
          'اشترك ليصلك أي وصول جديد أو عروض على الباقات والهدايا.',
        buttonText: 'اشترك',
        placeholder: 'بريدك الإلكتروني',
      }),
    ]),
    shop: conversionPage(
      [
        hero('warm-cozy', {
          eyebrow: 'Baby Catalog',
          title: 'تسوق الاحتياجات اليومية والهدايا عبر صفحة ألطف وأكثر اكتمالًا',
          subtitle:
            'أضفنا مسارات أقرب للأم أو الهدية أو الباقة الأساسية مع بحث أسهل.',
          ctaText: 'ابدأ من الباقات',
          ctaLink: '/collections',
          secondaryCtaText: 'شاهد العروض',
          secondaryCtaLink: '/sale',
        }),
        shoppingIntents({
          badge: 'ابدأ من الرحلة',
          title: 'من أول يوم حتى الهدايا',
          subtitle:
            'ملابس، عناية، رضاعة، أو هدايا للمولود الجديد بمداخل أكثر وضوحًا.',
          items: [
            {
              eyebrow: 'Clothes',
              title: 'ملابس يومية',
              subtitle: 'قطع أساسية ناعمة ومريحة للبيت والخروج.',
              link: '/collections',
              tone: 'primary',
              chip: 'Daily',
            },
            {
              eyebrow: 'Care',
              title: 'عناية ولطافة',
              subtitle: 'منتجات تنظيف وترطيب وروتين ألطف.',
              link: '/shop',
              tone: 'accent',
              chip: 'Care',
            },
            {
              eyebrow: 'Gift',
              title: 'هدايا المولود',
              subtitle: 'صناديق وتنسيقات جاهزة للزيارات والمناسبات.',
              link: '/sale',
              tone: 'emerald',
              chip: 'Gift',
            },
            {
              eyebrow: 'Starter',
              title: 'أساسيات أول شراء',
              subtitle: 'ابدأ من مجموعات تقلل وقت الاختيار على الأسرة.',
              link: '/shop?sort=popular',
              tone: 'slate',
              chip: 'Starter',
            },
          ],
        }),
        commandBar(
          {
            title: 'ابحث بالاحتياج أو الفئة',
            subtitle: 'مثال: رضاعات، ملابس قطن، كريم، أو هدية مولود.',
            searchPlaceholder: 'ابحث (مثال: بطانية أو رضّاعة)',
            allCategoriesLabel: 'كل منتجات الأطفال',
            resultsLabel: 'منتج',
            clearButtonText: 'مسح',
            stickyLabel: 'Baby Finder',
          },
          'minimal-toolbar',
        ),
        section('filters-sidebar'),
        grid('كل مستلزمات الأطفال', 'playful-toybox'),
        featuresBar(
          {
            title: 'رحلة أوضح وأكثر راحة',
            subtitle:
              'رسائل الثقة والهدايا والباقات الأساسية أصبحت أقرب للعميل.',
            items: [
              {
                icon: 'shield',
                title: 'اختيارات مطمئنة',
                description: 'تركيز أكبر على الراحة والاحتياجات اليومية الأساسية.',
              },
              {
                icon: 'target',
                title: 'باقات أول شراء',
                description: 'مسار أسرع للعائلة التي تبدأ من الصفر.',
              },
              {
                icon: 'clipboard',
                title: 'هدايا جاهزة',
                description: 'تنسيقات ألطف للهدايا والزيارات العائلية.',
              },
              {
                icon: 'grid',
                title: 'تصفح أسهل',
                description: 'تقسيمات أوضح بين العناية والملابس والأدوات.',
              },
            ],
          },
          'kids-guarantee',
        ),
        newsletter({
          title: 'كل جديد للعناية والملابس والهدايا',
          subtitle:
            'اشترك لتصلك الوصولات الجديدة والخصومات الخاصة بعالم الأطفال.',
          buttonText: 'اشترك الآن',
          placeholder: 'بريدك الإلكتروني',
        }),
      ],
      {
        layoutHint: 'sidebar-left',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Baby Checkout',
          message:
            'راجع المنتجات والهدية أو الباقة أولًا ثم أكمل بيانات التوصيل في صفحة ألطف وأوضح.',
          saleLabel: 'أساسيات واضحة',
          shippingLabel: 'توصيل مريح',
          returnLabel: 'دعم سريع',
          ctaText: 'العودة للمتجر',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'مراجعة سلة الطفل',
            subtitle: 'تحقق من المنتجات والكميات قبل إرسال الطلب.',
            continueShoppingText: 'أضف منتجًا آخر',
          },
          'playful-basket',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'سنستخدمها لتأكيد الطلب أو أي تفاصيل خاصة بالتوصيل للعائلة.',
            shippingTitle: 'عنوان التوصيل',
            shippingDescription:
              'العنوان الواضح يساعدنا في إيصال الطلب بأمان وهدوء.',
            notesTitle: 'ملاحظات إضافية',
            notesDescription:
              'مثل وقت مناسب للتوصيل أو طلب تغليف هدية أو تعليمات للمبنى.',
          },
          'safe-adventure',
        ),
        payment(
          {
            title: 'تأكيد الطلب',
            subtitle:
              'ملخص واضح وهادئ للسلة وطريقة الدفع قبل الإرسال النهائي.',
            confirmOrderText: 'إرسال الطلب',
            securityText: 'بياناتك محمية أثناء إتمام الطلب',
          },
          'cards',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Baby Sale',
        message:
          'عروض على أساسيات الأطفال والهدايا والباقات المجمعة لفترة محدودة.',
        saleLabel: 'Baby Bundles',
        shippingLabel: 'Gift Ready',
        returnLabel: 'Limited',
        ctaText: 'العودة للمتجر',
        ctaLink: '/shop',
      }),
      offerBento(
        {
          badge: 'ابدأ من نوع الاحتياج',
          title: 'قسّمنا العروض حسب رحلة الطفل أو الهدية',
          subtitle:
            'أول شراء، ملابس، عناية، أو هدايا للمولود الجديد.',
          cards: [
            {
              label: 'Starter',
              title: 'باقات أول شراء',
              subtitle: 'أساسيات واضحة للعائلة الجديدة.',
              ctaText: 'ابدأ الآن',
              link: '/sale?category=starter',
              tone: 'primary',
              stat: 'Starter',
            },
            {
              label: 'Gift',
              title: 'هدايا للمولود',
              subtitle: 'اختيارات ألطف للزيارات والمناسبات العائلية.',
              ctaText: 'شاهد الهدايا',
              link: '/collections',
              tone: 'accent',
              stat: 'Gift',
            },
            {
              label: 'Care',
              title: 'عناية وراحة',
              subtitle: 'منتجات للعناية اليومية بأسعار أوضح.',
              ctaText: 'ابدأ العناية',
              link: '/shop?sort=popular',
              tone: 'slate',
              stat: 'Care',
            },
          ],
        },
        'daily-picks',
      ),
      grid('عروض مستلزمات الأطفال الحالية', 'playful-toybox', {
        saleOnly: true,
      }),
    ]),
    collections: discoveryPage([
      collectionsSection('استكشف الاحتياجات حسب العمر أو الاستخدام', 'playful-bubbles', {
        subtitle:
          'ملابس، عناية، رضاعة، لعب، وباقات هدايا للمولود الجديد.',
        ctaText: 'كل الأقسام',
        ctaLink: '/collections',
      }),
      grid('منتجات مختارة للأطفال والهدايا', 'playful-toybox', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation({
        title: 'تم استقبال طلب Baby Cloud',
        description:
          'سنراجع الطلب ونتابع معك تفاصيل الشحن أو الهدية ثم نشاركك الخطوات التالية.',
        continueShoppingText: 'العودة إلى المتجر',
        orderNumberPrefix: 'رقم الطلب:',
        supportText: 'إذا احتجت تعديلًا سريعًا أو إضافة ملاحظة تواصل معنا عبر',
        statusLabel: 'تحت المراجعة',
        whatsappSupportLabel: 'واتساب Baby Cloud',
        showTimeline: true,
        showTrackOrder: true,
        showReorder: true,
        showRecommended: true,
        recommendedTitle: 'إضافات قد تحتاجينها',
        recommendedSubtitle:
          'منتجات شائعة تكمل طلب العناية أو الملابس أو الهدية.',
      }),
    ]),
  },
  'spice-route': {
    home: discoveryPage([
      promoStrip({
        badge: 'Spice Route',
        message:
          'بهارات مختارة وتغليف موثوق وروح شرقية واضحة من أول زيارة.',
        saleLabel: 'خلطات خاصة',
        shippingLabel: 'توصيل سريع',
        returnLabel: 'هدايا جاهزة',
        ctaText: 'ابدأ التصفح',
        ctaLink: '/shop',
      }),
      hero('split-panel', {
        eyebrow: 'Oriental Pantry',
        title: 'أضف سحرًا لأطباقك',
        subtitle:
          'واجهة أوضح للبهارات والتوابل والخلطات مع مسارات حسب الطبق أو الاستخدام أو الهدية.',
        ctaText: 'ابدأ من الخلطات',
        ctaLink: '/collections',
        secondaryCtaText: 'شاهد العروض',
        secondaryCtaLink: '/sale',
      }),
      collectionsSection('ابدأ من نوع الاستخدام أو المطبخ', 'menu-categories', {
        subtitle:
          'بهارات للطبخ اليومي، خلطات للشوي، توابل شرقية، وهدايا مطبخية.',
        ctaText: 'كل الأقسام',
        ctaLink: '/collections',
      }),
      offerBento(
        {
          badge: 'خلطات مميزة',
          title: 'عروض وخيارات تساعدك تبدأ من الحاجة الفعلية',
          subtitle:
            'قسم بصري أقوى للخلطات والباقات والهدايا الجاهزة للمطبخ.',
        },
        'combo-deals',
      ),
      featuresBar(
        {
          title: 'لماذا تجربة Spice Route أوضح؟',
          subtitle:
            'أصبح الفرق بين الخلطات والاستخدامات اليومية والهدايا أكثر وضوحًا.',
          items: [
            {
              icon: 'leaf',
              title: 'روح شرقية أوضح',
              description: 'هوية أغنى للخلطات والبهارات بدل شبكة عامة جدًا.',
            },
            {
              icon: 'grid',
              title: 'تقسيمات أسهل',
              description: 'حسب نوع الطبق أو الاستخدام أو قيمة الهدية.',
            },
            {
              icon: 'shield',
              title: 'تغليف موثوق',
              description: 'رسائل الخدمة والحفظ والشحن أوضح داخل المتجر.',
            },
            {
              icon: 'target',
              title: 'خلطات جاهزة',
              description: 'ابدأ من المزيج المناسب بدل اختيار عشوائي متعدد.',
            },
          ],
        },
        'delivery-clarity',
      ),
      grid('اختيارات مميزة من التوابل والخلطات', 'standard', { limit: 8 }),
      newsletter({
        title: 'وصلات جديدة من عالم التوابل',
        subtitle:
          'اشترك ليصلك أي خلطات جديدة أو عروض على الباقات والهدايا.',
        buttonText: 'اشترك',
        placeholder: 'بريدك الإلكتروني',
      }),
    ]),
    shop: conversionPage(
      [
        hero('split-panel', {
          eyebrow: 'Spice Catalog',
          title: 'تسوق حسب الطبق أو الخلطة أو شكل الهدية',
          subtitle:
            'أضفنا صفحة متجر أوضح للوصول للتوابل والخلطات والباقات بأقل عدد من الخطوات.',
          ctaText: 'ابدأ من الخلطات',
          ctaLink: '/collections',
          secondaryCtaText: 'شاهد العروض',
          secondaryCtaLink: '/sale',
        }),
        shoppingIntents({
          badge: 'اختر مدخل التصفح',
          title: 'هل تبدأ من الطبخ اليومي أم من الخلطات الخاصة؟',
          subtitle:
            'رتبنا الرحلة حسب الاستخدام الحقيقي: يومي، شوي، هدية، أو باقة منزلية.',
          items: [
            {
              eyebrow: 'Daily',
              title: 'بهارات يومية',
              subtitle: 'اختيارات أساسية للمطبخ اليومي والطبخ السريع.',
              link: '/collections',
              tone: 'primary',
              chip: 'Daily',
            },
            {
              eyebrow: 'Mixes',
              title: 'خلطات خاصة',
              subtitle: 'مزائج جاهزة للشوي أو الكبسة أو الأطباق الشرقية.',
              link: '/shop',
              tone: 'accent',
              chip: 'Mixes',
            },
            {
              eyebrow: 'Gift',
              title: 'هدايا مطبخية',
              subtitle: 'تغليف جاهز وباقات مناسبة للإهداء.',
              link: '/sale',
              tone: 'emerald',
              chip: 'Gift',
            },
            {
              eyebrow: 'Bundle',
              title: 'باقات أوفر',
              subtitle: 'مجموعات مجمعة تقلل وقت الاختيار وتزيد القيمة.',
              link: '/shop?sort=popular',
              tone: 'slate',
              chip: 'Bundle',
            },
          ],
        }),
        commandBar(
          {
            title: 'ابحث بالتوابل أو الطبق',
            subtitle:
              'مثال: كبسة، شاورما، قرفة، أو خلطة شواء.',
            searchPlaceholder: 'ابحث (مثال: خلطة كبسة أو بابريكا)',
            allCategoriesLabel: 'كل التوابل',
            resultsLabel: 'منتج',
            clearButtonText: 'مسح',
            stickyLabel: 'Spice Search',
          },
          'minimal-toolbar',
        ),
        section('filters-sidebar'),
        grid('كل التوابل والخلطات', 'standard'),
        featuresBar(
          {
            title: 'كيف حسّنّا رحلة الشراء داخل Spice Route؟',
            subtitle:
              'رسائل الثقة والتغليف والخلطات الجاهزة أصبحت أقرب للعميل أثناء التصفح.',
            items: [
              {
                icon: 'leaf',
                title: 'خلطات جاهزة',
                description: 'الدخول للخلطة المناسبة أسرع من الشبكة العامة.',
              },
              {
                icon: 'target',
                title: 'هدايا مطبخية',
                description: 'اقتراحات أوضح للهدايا والبوكسات.',
              },
              {
                icon: 'clipboard',
                title: 'تقسيمات حسب الطبخ',
                description: 'ابدأ من الطبق أو الاستخدام اليومي بسهولة.',
              },
              {
                icon: 'shield',
                title: 'تغليف وشحن أوضح',
                description: 'الخدمة وثقة التوصيل أصبحت جزءًا من الصفحة.',
              },
            ],
          },
          'service-clarity',
        ),
        newsletter({
          title: 'وصل جديد من الخلطات والتوابل',
          subtitle:
            'اشترك ليصلك أي خلطات جديدة أو عروض على الباقات والهدايا.',
          buttonText: 'اشترك',
          placeholder: 'بريدك الإلكتروني',
        }),
      ],
      {
        layoutHint: 'sidebar-left',
      },
    ),
    checkout: conversionPage(
      [
        promoStrip({
          badge: 'Spice Checkout',
          message:
            'راجع الخلطات والبهارات قبل إتمام الطلب ثم أكمل بيانات الشحن بسهولة.',
          saleLabel: 'خلطات أوضح',
          shippingLabel: 'تغليف موثوق',
          returnLabel: 'متابعة سريعة',
          ctaText: 'العودة للمتجر',
          ctaLink: '/shop',
        }),
        cartItems(
          {
            title: 'مراجعة سلة التوابل',
            subtitle: 'تحقق من الكميات والخلطات قبل إرسال الطلب.',
            continueShoppingText: 'أضف منتجًا آخر',
          },
          'standard',
        ),
        checkoutForm(
          {
            contactTitle: 'بيانات التواصل',
            contactDescription:
              'سنستخدمها لتأكيد الطلب أو أي تفاصيل خاصة بالتوصيل.',
            shippingTitle: 'عنوان التوصيل',
            shippingDescription:
              'العنوان الواضح يساعدنا في توصيل الطلب بسرعة ودقة.',
            notesTitle: 'ملاحظات إضافية',
            notesDescription:
              'مثل طلب تغليف هدية أو أي تعليمات خاصة بالتوصيل.',
          },
          'split',
        ),
        payment(
          {
            title: 'تأكيد الطلب',
            subtitle:
              'ملخص بسيط وواضح للإجمالي وطريقة الدفع قبل الإرسال النهائي.',
            confirmOrderText: 'إرسال الطلب',
            securityText: 'الدفع مؤمن والطلب محفوظ',
          },
          'cards',
        ),
      ],
      {
        layoutHint: 'sidebar-right',
      },
    ),
    sale: conversionPage([
      promoStrip({
        badge: 'Spice Sale',
        message:
          'عروض موسمية على الخلطات والتوابل والباقات المطبخية الجاهزة.',
        saleLabel: 'Mixes',
        shippingLabel: 'Gift Ready',
        returnLabel: 'Limited',
        ctaText: 'العودة للمتجر',
        ctaLink: '/shop',
      }),
      offerBento(
        {
          badge: 'ابدأ من الطبق',
          title: 'رتبنا العروض بحسب طريقة الاستخدام',
          subtitle:
            'توابل يومية، خلطات خاصة، هدايا، أو باقات موفرة للمطبخ.',
          cards: [
            {
              label: 'Daily',
              title: 'بهارات يومية',
              subtitle: 'أساسيات للمطبخ اليومي بوضوح أكبر في السعر.',
              ctaText: 'شاهد اليومي',
              link: '/sale?category=daily',
              tone: 'primary',
              stat: 'Daily',
            },
            {
              label: 'Mixes',
              title: 'خلطات خاصة',
              subtitle: 'اختيارات جاهزة للشوي والكبسة والأطباق الشرقية.',
              ctaText: 'ابدأ من الخلطات',
              link: '/collections',
              tone: 'accent',
              stat: 'Mixes',
            },
            {
              label: 'Gift',
              title: 'هدايا للمطبخ',
              subtitle: 'بوكسات لطيفة وتغليف مناسب للإهداء.',
              ctaText: 'شاهد الهدايا',
              link: '/shop?sort=popular',
              tone: 'slate',
              stat: 'Gift',
            },
          ],
        },
        'combo-deals',
      ),
      grid('العروض الحالية على التوابل والخلطات', 'standard', {
        saleOnly: true,
      }),
    ]),
    collections: discoveryPage([
      collectionsSection('ابدأ من نوع الطبق أو شكل الاستخدام', 'menu-categories', {
        subtitle:
          'قسّمنا التجربة بين اليومي والخلطات الخاصة والهدايا والباقات المنزلية.',
        ctaText: 'كل الأقسام',
        ctaLink: '/collections',
      }),
      grid('اختيارات مميزة من الأقسام', 'standard', { limit: 8 }),
    ]),
    'thank-you': trustPage([
      orderConfirmation({
        title: 'تم اعتماد طلب Spice Route',
        description:
          'سنراجع تفاصيل الطلب ونجهز الخلطات أو الباقات ثم نشارك معك خطوات المتابعة.',
        continueShoppingText: 'العودة إلى التوابل',
        orderNumberPrefix: 'رقم الطلب:',
        supportText: 'إذا رغبت بتعديل سريع أو إضافة ملاحظة تواصل معنا عبر',
        statusLabel: 'قيد المراجعة',
        whatsappSupportLabel: 'واتساب Spice Route',
        showTimeline: true,
        showTrackOrder: true,
        showReorder: true,
        showRecommended: true,
        recommendedTitle: 'إضافات تكمل الطلب',
        recommendedSubtitle:
          'منتجات شائعة الإضافة بعد اختيار الخلطات أو التوابل الأساسية.',
      }),
    ]),
    'butcher-counter-eg': {
      home: discoveryPage([
        promoStrip({
          badge: 'جودة متميزة',
          message: 'قطعيات فاخرة يتم تجهيزها فور طلبك لضمان أعلى مستويات الطزاجة والجودة.',
          saleLabel: 'طازج يوميًا',
          shippingLabel: 'شحن مبرد',
          ctaText: 'اكتشف القطعيات',
          ctaLink: '/shop',
        }),
        hero('butcher-atelier', {
          title: 'أتيليه اللحوم الفاخرة',
          subtitle: 'خبرة تمتد لعقود في اختيار وتجهيز أفضل أنواع اللحوم البلدي والمستوردة.',
          ctaText: 'اطلب الآن',
          primaryHref: '/shop',
          eyebrow: 'منذ عام 1983',
        }),
        collectionsSection('اختر حسب نوع القطعية', 'butcher-cut-map', {
          subtitle: 'تشكيلة واسعة من القطعيات المختارة بعناية لتناسب كافة الأذواق وطرق الطهي.',
        }),
        grid('أحدث القطعيات المتاحة اليوم', 'butcher-atelier-grid', {
          limit: 8,
          subtitle: 'قطعيات طازجة يتم ذبحها وتجهيزها يوميًا لتصلكم بأفضل جودة.',
        }),
      ]),
      checkout: conversionPage([
        cartItems(
          {
            headerBadge: 'سلة الأتيليه',
            serviceHighlights: ['تجهيز مخصص', 'شحن مبرد', 'تغليف فاخر'],
          },
          'market-basket',
        ),
        checkoutForm(
          {
            isButcherCheckout: true,
            deliverySlotLabel: 'موعد التوصيل المبرد',
          },
          'market-checkout',
        ),
      ]),
    },
  },
};

type CommerceFlowFamily =
  | 'market'
  | 'nature'
  | 'command'
  | 'boutique'
  | 'playful';

type ThankYouFamily =
  | 'market'
  | 'nature'
  | 'command'
  | 'boutique'
  | 'soft'
  | 'playful';

type PdpFamily =
  | 'market'
  | 'nature'
  | 'command'
  | 'boutique'
  | 'playful';

const MARKET_FLOW_THEME_IDS = new Set([
  'smart-bazaar',
  'shop-orbit',
  'district-market',
  'nile-bistro',
  'restaurant-demo',
  'fresh-cart',
  'butcher-counter-eg',
]);

const NATURE_FLOW_THEME_IDS = new Set([
  'zen-organic',
  'pawsome',
  'bloom-studio',
  'crafted',
  'elessi-tail-supply',
  'elessi-sprout-room',
]);

const COMMAND_FLOW_THEME_IDS = new Set([
  'pc-hub-eg',
  'nova-mobile',
  'electronics-demo',
  'airlume-ai',
  'iron-forge',
  'turbo-parts',
  'skill-lab',
  'elessi-signal-deck',
  'elessi-garage-fit',
]);

const PLAYFUL_FLOW_THEME_IDS = new Set(['kids-play']);

const BOUTIQUE_FLOW_THEME_IDS = new Set([
  'modern-minimal',
  'bold-fashion',
  'elegant-luxe',
  'vanguard-premium',
  'atelier-nova',
  'aura-chic',
  'solea-femme',
  'fakhama-elite',
  'mystic-desert',
  'menswear-prime',
  'cairo-stride',
  'closet-os',
  'hayah-modest-eg',
  'rihla-resort-eg',
  'layali-edit-eg',
  'legacy-default-old',
  'men-shoes-eg',
  'women-fashion-eg',
  'khemet-luxe-eg',
  'perfume-eg',
  'rose-boutique-eg',
  'vela-fashion-eg',
  'opulence',
  'ink-paper',
  'elessi-glow-routine',
  'elessi-gem-atelier',
  'elessi-chrono-gallery',
]);

const SOFT_AFTERCARE_THEME_IDS = new Set([
  'women-fashion-eg',
  'khemet-luxe-eg',
  'vela-fashion-eg',
  'hayah-modest-eg',
  'rihla-resort-eg',
  'layali-edit-eg',
]);

const MARKET_PDP_THEME_IDS = new Set([
  'smart-bazaar',
  'shop-orbit',
  'district-market',
  'nile-bistro',
  'restaurant-demo',
  'fresh-cart',
  'butcher-counter-eg',
]);

const NATURE_PDP_THEME_IDS = new Set([
  'zen-organic',
  'pawsome',
  'bloom-studio',
  'crafted',
]);

const COMMAND_PDP_THEME_IDS = new Set([
  'airlume-ai',
  'nova-mobile',
  'iron-forge',
  'turbo-parts',
  'skill-lab',
]);

const BOUTIQUE_PDP_THEME_IDS = new Set([
  'modern-minimal',
  'closet-os',
  'hayah-modest-eg',
  'menswear-prime',
  'fakhama-elite',
]);

const PLAYFUL_PDP_THEME_IDS = new Set(['kids-play']);

const getThemeSectionType = (section: string | StorefrontSectionConfig) =>
  typeof section === 'string' ? section : section.type;

const pickExistingReplacements = (
  page: StorefrontPageConfig | undefined,
  replacements: Record<string, StorefrontSectionConfig>,
) => {
  const existingTypes = new Set((page?.sections || []).map(getThemeSectionType));

  return Object.fromEntries(
    Object.entries(replacements).filter(([type]) => existingTypes.has(type)),
  );
};

const mergePatchedSection = (
  current: string | StorefrontSectionConfig,
  replacement: StorefrontSectionConfig,
): StorefrontSectionConfig => {
  if (typeof current === 'string') {
    return replacement;
  }

  return {
    ...current,
    ...replacement,
    settings: {
      ...((current.settings as Record<string, unknown> | undefined) || {}),
      ...((replacement.settings as Record<string, unknown> | undefined) || {}),
    },
  };
};

const patchPageSections = (
  page: StorefrontPageConfig | undefined,
  replacements: Record<string, StorefrontSectionConfig>,
  appendOrder: string[],
): StorefrontPageConfig | undefined => {
  if (!page && appendOrder.length === 0) {
    return page;
  }

  const existingSections = page?.sections || [];
  const consumed = new Set<string>();
  const nextSections = existingSections.map((sectionConfig) => {
    const type = getThemeSectionType(sectionConfig);
    const replacement = replacements[type];
    if (!replacement) {
      return sectionConfig;
    }
    consumed.add(type);
    return mergePatchedSection(sectionConfig, replacement);
  });

  appendOrder.forEach((type) => {
    if (type === 'cart-items' && !shouldInjectCheckoutCartItems(page)) {
      return;
    }

    const replacement = replacements[type];
    if (!replacement || consumed.has(type)) {
      return;
    }
    nextSections.push(replacement);
  });

  return {
    ...(page || { sections: [] }),
    sections: nextSections,
  } as StorefrontPageConfig;
};

const resolveCommerceFlowFamily = (themeId: string): CommerceFlowFamily | null => {
  if (PLAYFUL_FLOW_THEME_IDS.has(themeId)) {
    return 'playful';
  }
  if (MARKET_FLOW_THEME_IDS.has(themeId)) {
    return 'market';
  }
  if (NATURE_FLOW_THEME_IDS.has(themeId)) {
    return 'nature';
  }
  if (COMMAND_FLOW_THEME_IDS.has(themeId)) {
    return 'command';
  }
  if (BOUTIQUE_FLOW_THEME_IDS.has(themeId)) {
    return 'boutique';
  }

  return null;
};

const resolveThankYouFamily = (themeId: string): ThankYouFamily | null => {
  if (PLAYFUL_FLOW_THEME_IDS.has(themeId)) {
    return 'playful';
  }
  if (SOFT_AFTERCARE_THEME_IDS.has(themeId)) {
    return 'soft';
  }
  if (MARKET_FLOW_THEME_IDS.has(themeId)) {
    return 'market';
  }
  if (NATURE_FLOW_THEME_IDS.has(themeId)) {
    return 'nature';
  }
  if (COMMAND_FLOW_THEME_IDS.has(themeId)) {
    return 'command';
  }
  if (BOUTIQUE_FLOW_THEME_IDS.has(themeId)) {
    return 'boutique';
  }

  return null;
};

const resolvePdpFamily = (themeId: string): PdpFamily | null => {
  if (PLAYFUL_PDP_THEME_IDS.has(themeId)) {
    return 'playful';
  }
  if (MARKET_PDP_THEME_IDS.has(themeId)) {
    return 'market';
  }
  if (NATURE_PDP_THEME_IDS.has(themeId)) {
    return 'nature';
  }
  if (COMMAND_PDP_THEME_IDS.has(themeId)) {
    return 'command';
  }
  if (BOUTIQUE_PDP_THEME_IDS.has(themeId)) {
    return 'boutique';
  }

  return null;
};

const buildCommerceFlowOverrides = (theme: StorefrontTheme): ThemePageOverrides => {
  const flowFamily = resolveCommerceFlowFamily(theme.id);
  const thankYouFamily = resolveThankYouFamily(theme.id);
  const pdpFamily = resolvePdpFamily(theme.id);
  const overrides: ThemePageOverrides = {};

  if (flowFamily === 'market') {
    overrides.cart = patchPageSections(
      theme.pages.cart,
      {
        'cart-items': cartItems(
          {
            headerBadge: 'سلة المراجعة',
            serviceHighlights: ['تأكيد قبل التنفيذ', 'شحن واضح', 'دعم سريع'],
          },
          'market-basket',
        ),
        'order-summary': orderSummarySection(
          {
            headerBadge: 'ملخص واضح',
            assuranceItems: [
              'تأكيد واضح للعنوان ورقم الهاتف',
              'تثبيت تكلفة الشحن حسب المحافظة',
              'متابعة سريعة حتى الاستلام',
            ],
            nextSteps: [
              'نراجع العنوان قبل التنفيذ',
              'نثبت الشحن حسب المحافظة',
              'نرسل تحديثًا واضحًا حتى الاستلام',
            ],
          },
          'market-summary',
        ),
      },
      ['cart-items', 'order-summary'],
    );
    overrides.checkout = patchPageSections(
      theme.pages.checkout,
      {
        'cart-items': cartItems(
          {
            headerBadge: 'سلة المراجعة',
            serviceHighlights: ['تأكيد قبل التنفيذ', 'شحن واضح', 'دعم سريع'],
          },
          'market-basket',
        ),
        'order-summary': orderSummarySection(
          {
            headerBadge: 'ملخص واضح',
          },
          'market-summary',
        ),
        'checkout-form': checkoutForm(
          {
            assuranceBadge: 'إتمام واضح',
          },
          'market-checkout',
        ),
        'payment': payment(
          {
            assuranceBadge: 'آخر مراجعة',
            showSummaryCard: false,
          },
          'market-payment',
        ),
      },
      ['cart-items', 'checkout-form', 'order-summary', 'payment'],
    );
  } else if (flowFamily === 'nature') {
    overrides.cart = patchPageSections(
      theme.pages.cart,
      {
        'cart-items': cartItems(
          {
            headerBadge: 'مراجعة هادئة',
            serviceHighlights: ['تغليف مناسب', 'مراجعة هادئة', 'متابعة حتى الاستلام'],
          },
          'nature-cart',
        ),
        'order-summary': orderSummarySection(
          {
            headerBadge: 'خلاصة هادئة',
            assuranceItems: [
              'تغليف مناسب للمنتجات الحساسة',
              'تأكيد هادئ للعناوين والملاحظات',
              'متابعة واضحة بعد الاستلام عند الحاجة',
            ],
          },
          'nature-summary',
        ),
      },
      ['cart-items', 'order-summary'],
    );
    overrides.checkout = patchPageSections(
      theme.pages.checkout,
      {
        'cart-items': cartItems(
          {
            headerBadge: 'مراجعة هادئة',
            serviceHighlights: ['تغليف مناسب', 'مراجعة هادئة', 'متابعة حتى الاستلام'],
          },
          'nature-cart',
        ),
        'order-summary': orderSummarySection(
          {
            headerBadge: 'خلاصة هادئة',
          },
          'nature-summary',
        ),
        'checkout-form': checkoutForm(
          {
            assuranceBadge: 'إتمام هادئ',
          },
          'nature-checkout',
        ),
        'payment': payment(
          {
            assuranceBadge: 'مراجعة أخيرة',
            showSummaryCard: false,
          },
          'nature-payment',
        ),
      },
      ['cart-items', 'checkout-form', 'order-summary', 'payment'],
    );
  } else if (flowFamily === 'command') {
    overrides.cart = patchPageSections(
      theme.pages.cart,
      {
        'cart-items': cartItems({}, 'command-cart'),
        'order-summary': orderSummarySection({}, 'command-summary'),
      },
      ['cart-items', 'order-summary'],
    );
    overrides.checkout = patchPageSections(
      theme.pages.checkout,
      {
        'cart-items': cartItems({}, 'command-cart'),
        'order-summary': orderSummarySection({}, 'command-summary'),
        'checkout-form': checkoutForm({}, 'command-checkout'),
        'payment': payment({ showSummaryCard: false }, 'command-payment'),
      },
      ['cart-items', 'checkout-form', 'order-summary', 'payment'],
    );
  } else if (flowFamily === 'boutique') {
    overrides.cart = patchPageSections(
      theme.pages.cart,
      {
        'cart-items': cartItems({}, 'wardrobe-cart'),
        'order-summary': orderSummarySection({}, 'boutique-summary'),
      },
      ['cart-items', 'order-summary'],
    );
    overrides.checkout = patchPageSections(
      theme.pages.checkout,
      {
        'cart-items': cartItems({}, 'wardrobe-cart'),
        'order-summary': orderSummarySection({}, 'boutique-summary'),
        'checkout-form': checkoutForm({}, 'soft-flow'),
        'payment': payment({ showSummaryCard: false }, 'boutique-payment'),
      },
      ['cart-items', 'checkout-form', 'order-summary', 'payment'],
    );
  } else if (flowFamily === 'playful') {
    overrides.cart = patchPageSections(
      theme.pages.cart,
      {
        'cart-items': cartItems({}, 'playful-basket'),
        'order-summary': orderSummarySection({}, 'highlighted'),
      },
      ['cart-items', 'order-summary'],
    );
    overrides.checkout = patchPageSections(
      theme.pages.checkout,
      {
        'cart-items': cartItems({}, 'playful-basket'),
        'order-summary': orderSummarySection({}, 'highlighted'),
        'checkout-form': checkoutForm({}, 'safe-adventure'),
        'payment': payment({ showSummaryCard: false }, 'cards'),
      },
      ['cart-items', 'checkout-form', 'order-summary', 'payment'],
    );
  }

  if (pdpFamily === 'market') {
    const pdpReplacements = pickExistingReplacements(theme.pages.pdp, {
      'product-gallery': productGallery('grid'),
      'product-info': productInfoSection(
        {
          descriptionTitle: 'تفاصيل الطلب والمنتج',
          shippingTitle: 'التوصيل وتأكيد التنفيذ',
          shippingText:
            'نوضح العنوان ورسوم الشحن وخطوة المتابعة قبل تأكيد الطلب حتى يكون القرار أسرع وأوضح.',
          guaranteesTitle: 'ليه الطلب هنا أوضح؟',
          guaranteesSubtitle:
            'الصور، السعر، والمتابعة بعد الطلب تظهر في نفس المسار بدون تشتيت أو خطوات زائدة.',
          guaranteeStyle: 'minimal',
        },
        'standard',
      ),
      'conversion-stack': conversionStackSection({}, 'balanced'),
      'bought-together': boughtTogetherSection(
        {
          title: 'إضافات تكمل الطلب',
          subtitle: 'منتجات عملية تُضاف كثيرًا مع نفس الاختيار.',
        },
        'stacked',
      ),
      'related-products': relatedProductsSection(
        {
          title: 'منتجات من نفس القسم',
          subtitle: 'اختيارات قريبة تساعدك تكمل الطلب من نفس المزاج التجاري.',
        },
        'standard',
      ),
      reviews: reviewsSection(
        {
          title: 'آراء المشترين',
          listTitle: 'مراجعات الشراء الأخيرة',
        },
        'compact',
      ),
    });

    if (Object.keys(pdpReplacements).length > 0) {
      overrides.pdp = patchPageSections(theme.pages.pdp, pdpReplacements, []);
    }
  } else if (pdpFamily === 'nature') {
    const pdpReplacements = pickExistingReplacements(theme.pages.pdp, {
      'product-gallery': productGallery('stacked'),
      'product-info': productInfoSection(
        {
          descriptionTitle: 'تفاصيل المنتج والعناية',
          shippingTitle: 'التوصيل والعناية',
          shippingText:
            'نراجع العنوان والتغليف بطريقة أوضح، خصوصًا عندما يحتاج المنتج تعاملًا أهدأ أو تغليفًا مناسبًا.',
          guaranteesTitle: 'ملاحظات قبل الإتمام',
          guaranteesSubtitle:
            'المسار هنا أهدأ، مع رسائل أوضح عن التغليف، الاستلام، وطبيعة المنتج قبل اتخاذ القرار.',
          guaranteeStyle: 'minimal',
        },
        'accordion',
      ),
      'conversion-stack': conversionStackSection({}, 'seamless'),
      'bought-together': boughtTogetherSection(
        {
          title: 'اختيارات مكملة',
          subtitle: 'منتجات قريبة من نفس الروح أو روتين الاستخدام.',
        },
        'compact',
      ),
      'related-products': relatedProductsSection(
        {
          title: 'اقتراحات قريبة من نفس الروح',
          subtitle: 'اختيارات هادئة من نفس الفئة أو نفس روتين الاستخدام.',
        },
        'compact',
      ),
      reviews: reviewsSection(
        {
          title: 'تجارب العملاء',
          mediaTitle: 'صور من الاستخدام',
          listTitle: 'مراجعات وتجارب حقيقية',
        },
        'compact',
      ),
    });

    if (Object.keys(pdpReplacements).length > 0) {
      overrides.pdp = patchPageSections(theme.pages.pdp, pdpReplacements, []);
    }
  } else if (pdpFamily === 'command') {
    const pdpReplacements = pickExistingReplacements(theme.pages.pdp, {
      'product-gallery': productGallery('command-stage'),
      'product-info': productInfoSection(
        {
          shippingTitle: 'الشحن والحماية',
          shippingText:
            'نوضح التوافق، الشحن، وخطوة المراجعة الأخيرة قبل اعتماد الطلب حتى تقل المخاطرة في قرار الشراء.',
          guaranteesTitle: 'لماذا القرار هنا أوضح؟',
          guaranteesSubtitle:
            'جمعنا المواصفات، بدائل القطع، ورسائل الثقة العملية في نفس مسار القرار بدل توزيعها على صفحات متفرقة.',
          guaranteeStyle: 'minimal',
        },
        'command-specs',
      ),
      'conversion-stack': conversionStackSection({}, 'balanced'),
      'bought-together': boughtTogetherSection(
        {
          title: 'قطع تكمّل نفس التجهيز',
          subtitle: 'إضافات مرتبطة بالتوافق أو الاستخدام العملي لنفس المنتج.',
        },
        'compact',
      ),
      'related-products': relatedProductsSection(
        {
          title: 'بدائل ومكملات القرار',
          subtitle: 'موديلات أو قطع قريبة تساعدك تقارن أو تكمل نفس التجميعة.',
        },
        'command-alternatives',
      ),
      reviews: reviewsSection(
        {
          title: 'ثقة ما بعد الشراء',
          listTitle: 'آراء بعد الاستخدام الفعلي',
        },
        'command-proof',
      ),
    });

    if (Object.keys(pdpReplacements).length > 0) {
      overrides.pdp = patchPageSections(theme.pages.pdp, pdpReplacements, []);
    }
  } else if (pdpFamily === 'boutique') {
    const pdpReplacements = pickExistingReplacements(theme.pages.pdp, {
      'product-gallery': productGallery('boutique-portrait-stage'),
      'product-info': productInfoSection(
        {
          shippingTitle: 'الشحن والمتابعة',
          shippingText:
            'نوضح الشحن والمتابعة والبدائل المناسبة بهدوء حتى يظل القرار مرتبطًا بالخامة والمقاس والإطلالة.',
          guaranteesTitle: 'قبل ما تكملي الطلب',
          guaranteesSubtitle:
            'المقاس، الصور، وإشارات الثقة تظهر بصياغة أهدأ حتى يبقى القرار أقرب للتجربة الحقيقية.',
          fitNote: 'راجعي الصور والمقاس ونبرة الخامة قبل تثبيت الطلب النهائي.',
        },
        'boutique-ledger',
      ),
      'conversion-stack': conversionStackSection({}, 'editorial'),
      'bought-together': boughtTogetherSection(
        {
          title: 'قطع تكمل الإطلالة',
          subtitle: 'تنسيقات إضافية تُستخدم كثيرًا مع نفس الاختيار.',
        },
        'pairing-rail',
      ),
      'related-products': relatedProductsSection(
        {
          title: 'اقتراحات من نفس المزاج',
          subtitle: 'منتجات قريبة من نفس الإيقاع البصري لتسهيل التنسيق.',
        },
        'editorial',
      ),
      reviews: reviewsSection(
        {
          title: 'ملاحظات المشترين',
          listTitle: 'تجارب بعد الاستلام',
        },
        'voice-notes',
      ),
    });

    if (Object.keys(pdpReplacements).length > 0) {
      overrides.pdp = patchPageSections(theme.pages.pdp, pdpReplacements, []);
    }
  } else if (pdpFamily === 'playful') {
    const pdpReplacements = pickExistingReplacements(theme.pages.pdp, {
      'product-gallery': productGallery('grid'),
      reviews: reviewsSection(
        {
          title: 'آراء الأهل والأطفال',
          listTitle: 'تجارب اللعب والاستخدام',
        },
        'compact',
      ),
    });

    if (Object.keys(pdpReplacements).length > 0) {
      overrides.pdp = patchPageSections(theme.pages.pdp, pdpReplacements, []);
    }
  }

  if (thankYouFamily === 'market') {
    overrides['thank-you'] = patchPageSections(
      theme.pages['thank-you'],
      {
        'order-confirmation': orderConfirmation(
          {
            title: 'تم تأكيد طلبك بنجاح',
            description:
              'استلمنا الطلب وسنراجع الشحن والعنوان ثم نشارك معك الخطوة التالية بوضوح.',
            recommendedVariant: 'standard',
          },
          'market-aftercare',
        ),
      },
      ['order-confirmation'],
    );
  } else if (thankYouFamily === 'nature') {
    overrides['thank-you'] = patchPageSections(
      theme.pages['thank-you'],
      {
        'order-confirmation': orderConfirmation(
          {
            title: 'تم تثبيت طلبك بنجاح',
            description:
              'استلمنا الطلب وسنراجع التجهيز والشحن بهدوء ثم نشارك معك تحديثات واضحة حتى الاستلام.',
            recommendedVariant: 'standard',
          },
          'nature-aftercare',
        ),
      },
      ['order-confirmation'],
    );
  } else if (thankYouFamily === 'command') {
    overrides['thank-you'] = patchPageSections(
      theme.pages['thank-you'],
      {
        'order-confirmation': orderConfirmation(
          {
            recommendedVariant: 'standard',
          },
          'command-aftercare',
        ),
      },
      ['order-confirmation'],
    );
  } else if (thankYouFamily === 'boutique') {
    overrides['thank-you'] = patchPageSections(
      theme.pages['thank-you'],
      {
        'order-confirmation': orderConfirmation(
          {
            recommendedVariant: 'boutique-afterglow',
          },
          'boutique-aftercare',
        ),
      },
      ['order-confirmation'],
    );
    } else if (thankYouFamily === 'soft') {
      overrides['thank-you'] = patchPageSections(
        theme.pages['thank-you'],
        {
          'order-confirmation': orderConfirmation(
            {
              recommendedVariant:
                theme.id === 'khemet-luxe-eg' ? 'boutique-afterglow' : 'standard',
            },
            'soft-thanks',
          ),
        },
      ['order-confirmation'],
    );
  }

  return overrides;
};

export const applyStorefrontThemeExperienceOverrides = (
  theme: StorefrontTheme,
): StorefrontTheme => {
  const genericOverrides = buildCommerceFlowOverrides(theme);
  const overrides = THEME_PAGE_EXPERIENCE_OVERRIDES[theme.id];

  if (!overrides && Object.keys(genericOverrides).length === 0) {
    return theme;
  }

  return {
    ...theme,
    pages: {
      ...theme.pages,
      ...genericOverrides,
      ...overrides,
    },
  };
};
