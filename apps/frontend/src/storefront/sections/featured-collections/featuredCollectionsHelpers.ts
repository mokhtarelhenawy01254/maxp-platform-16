import { Category } from '../../hooks/useCategories';
import { isKhemetLuxeTheme } from '../../utils/navigationGuards';
import {
  buildOptimizedStorefrontImageUrl,
  buildResponsiveStorefrontImage,
  buildVersionedStorefrontStaticAssetUrl,
} from '../../utils/productImages';
import {
  CollectionCard,
  CollectionCardSeed,
  CollectionFallback,
  ManualCollectionInput,
  PreviewProductImageSource,
  TechDecisionLaneMeta,
  TravelPostcardMeta,
} from './types';

export const getCollectionImageAttributes = (
  imageUrl: string,
  options: {
    widths?: number[];
    fallbackWidth?: number;
    sizes?: string;
    quality?: number;
  } = {},
) =>
  buildResponsiveStorefrontImage(imageUrl, {
    widths: options.widths || [320, 480, 640, 800],
    fallbackWidth: options.fallbackWidth || 640,
    sizes: options.sizes,
    quality: options.quality || 72,
  });

export const prepareCollectionCardImage = (imageUrl: string): string =>
  buildOptimizedStorefrontImageUrl(
    buildVersionedStorefrontStaticAssetUrl(imageUrl),
    {
      width: 900,
      quality: 72,
    },
  );

export const FALLBACK_COLLECTIONS: CollectionFallback[] = [
  {
    id: 'heels',
    name: 'كعب أنيق',
    slug: 'heels',
    description: 'موديلات سهرة ولمسات كلاسيك يومية.',
  },
  {
    id: 'sneakers',
    name: 'سنيكرز يومي',
    slug: 'sneakers',
    description: 'راحة يومية بتفاصيل أنثوية ناعمة.',
  },
  {
    id: 'sandals',
    name: 'صنادل خفيفة',
    slug: 'sandals',
    description: 'خيارات صيفية سريعة ومريحة.',
  },
  {
    id: 'flats',
    name: 'فلات عملي',
    slug: 'flats',
    description: 'ستايل عملي مناسب للشغل والخروجات.',
  },
  {
    id: 'evening',
    name: 'لوك سهرة',
    slug: 'evening',
    description: 'قطع مختارة للمناسبات والسهرات.',
  },
  {
    id: 'work',
    name: 'شغل وكاجوال',
    slug: 'work',
    description: 'خيارات متوازنة للمكتب والتحرك اليومي.',
  },
];

export const SMART_BAZAAR_FALLBACK_COLLECTIONS: CollectionFallback[] = [
  {
    id: 'daily-essentials',
    name: 'أساسيات يومية',
    slug: 'daily-essentials',
    description: 'منتجات تتكرر يوميًا وتحتاج وصولًا أسرع وقرارًا أبسط.',
  },
  {
    id: 'home-organization',
    name: 'البيت والتنظيم',
    slug: 'home-organization',
    description: 'اختيارات عملية للبيت والعمل والحركة اليومية داخل قسم أوضح.',
  },
  {
    id: 'quick-deals',
    name: 'عروض سريعة',
    slug: 'quick-deals',
    description: 'منتجات حساسة للسعر وعروض تساعد العميل على الحسم بسرعة.',
  },
  {
    id: 'gift-ready',
    name: 'هدايا جاهزة',
    slug: 'gift-ready',
    description: 'هدايا واختيارات موسمية مرتبة لا تحتاج بحثًا طويلًا.',
  },
  {
    id: 'family-needs',
    name: 'احتياجات العائلة',
    slug: 'family-needs',
    description: 'مسار عملي للطلبات المتكررة والمنتجات اليومية للعائلة.',
  },
  {
    id: 'mobile-favorites',
    name: 'الأسرع على الموبايل',
    slug: 'mobile-favorites',
    description: 'منتجات مهيأة للتصفح السريع والشراء المباشر من أول زيارة.',
  },
];

export const IMAGE_FALLBACKS = [
  '/placeholders/luxury-shoes/pump-black.png',
  '/placeholders/luxury-shoes/sneaker-white.png',
  '/placeholders/luxury-shoes/sneakers.png',
  '/placeholders/luxury-shoes/flats.png',
  '/placeholders/luxury-shoes/boots.png',
  '/placeholders/luxury-shoes/hero.png',
];

export const SMART_BAZAAR_IMAGE_FALLBACKS = [
  '/assets/themes/smart-bazaar/daily.png',
  '/assets/themes/smart-bazaar/home.png',
  '/assets/themes/smart-bazaar/deals.png',
  '/assets/themes/smart-bazaar/gifts.png',
];

export const normalizeText = (value: string): string => value.trim().toLowerCase();

export const shouldPreferRuntimeFeaturedCollections = ({
  themeId,
  variant,
  settingsPreferRuntimeCategories,
}: {
  themeId?: string;
  variant?: string;
  settingsPreferRuntimeCategories?: boolean;
}): boolean =>
  settingsPreferRuntimeCategories === true ||
  (settingsPreferRuntimeCategories !== false &&
    (variant === 'marketplace-tiles' ||
      (isKhemetLuxeTheme(themeId) &&
        (variant === 'gallery-columns' || variant === 'legacy-circle-categories'))));

export const normalizeMatchText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const hasStrongSignalOverlap = (left: string, right: string): boolean => {
  const normalizedLeft = normalizeMatchText(left);
  const normalizedRight = normalizeMatchText(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return (
    normalizedLeft === normalizedRight ||
    (normalizedLeft.length >= 3 && normalizedRight.includes(normalizedLeft)) ||
    (normalizedRight.length >= 3 && normalizedLeft.includes(normalizedRight))
  );
};

export const canonicalizeCollectionImageCandidate = (
  value?: string,
): string => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return '';
  }

  try {
    const parsedUrl = new URL(
      trimmedValue.startsWith('http')
        ? trimmedValue
        : `https://storefront.local${
            trimmedValue.startsWith('/') ? trimmedValue : `/${trimmedValue}`
          }`,
    );
    const unsplashMatch = parsedUrl.pathname.match(/photo-([a-z0-9-]+)/i);

    if (unsplashMatch?.[1]) {
      return `unsplash:${unsplashMatch[1].toLowerCase()}`;
    }

    return parsedUrl.pathname.toLowerCase();
  } catch {
    return trimmedValue.split(/[?#]/)[0]!.toLowerCase();
  }
};

export const hasStrongManualCollectionImage = (value?: string): boolean => {
  const normalizedValue = canonicalizeCollectionImageCandidate(value);

  if (!normalizedValue) {
    return false;
  }

  if (normalizedValue.startsWith('/placeholders/')) {
    return false;
  }

  return !/\/preview\.(png|svg|jpe?g|webp)$/i.test(normalizedValue);
};

export const rotateList = <T,>(items: T[], offset: number): T[] => {
  if (!items.length) {
    return [];
  }

  const normalizedOffset =
    ((offset % items.length) + items.length) % items.length;
  return [
    ...items.slice(normalizedOffset),
    ...items.slice(0, normalizedOffset),
  ];
};

export const extractCollectionLinkSignals = (href?: string): string[] => {
  if (typeof href !== 'string' || !href.trim()) {
    return [];
  }

  try {
    const parsedUrl = new URL(
      href.startsWith('http')
        ? href
        : `https://storefront.local${href.startsWith('/') ? href : `/${href}`}`,
    );
    const categoryParam = parsedUrl.searchParams.get('category');
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    const collectionsSlug =
      pathSegments[0] === 'collections' && pathSegments[1]
        ? pathSegments[1]
        : undefined;

    return [categoryParam, collectionsSlug]
      .filter(
        (value): value is string =>
          typeof value === 'string' && value.trim().length > 0,
      )
      .map(normalizeMatchText);
  } catch {
    return [];
  }
};

export const buildCollectionSignals = (collection: CollectionCardSeed): string[] =>
  Array.from(
    new Set(
      [
        collection.id,
        collection.slug,
        collection.name,
        collection.description,
        ...extractCollectionLinkSignals(collection.href),
      ]
        .filter(
          (value): value is string =>
            typeof value === 'string' && value.trim().length > 0,
        )
        .map(normalizeMatchText)
        .filter(Boolean),
    ),
  );

export const matchesCollectionToCategory = (
  collectionSignals: string[],
  category: Pick<Category, 'id' | 'slug' | 'name'>,
): boolean => {
  const categorySignals = [category.id, category.slug, category.name]
    .filter(
      (value): value is string =>
        typeof value === 'string' && value.trim().length > 0,
    )
    .map(normalizeMatchText);

  return collectionSignals.some((collectionSignal) =>
    categorySignals.some((categorySignal) =>
      hasStrongSignalOverlap(collectionSignal, categorySignal),
    ),
  );
};

export const matchesCollectionToProduct = (
  collectionSignals: string[],
  product: PreviewProductImageSource,
): boolean => {
  const productSignals = [
    product.id,
    product.slug,
    product.name,
    product.description,
    product.categoryId,
    product.category?.id,
    product.category?.slug,
    product.category?.name,
  ]
    .filter(
      (value): value is string =>
        typeof value === 'string' && value.trim().length > 0,
    )
    .map(normalizeMatchText);

  return collectionSignals.some((collectionSignal) =>
    productSignals.some((productSignal) =>
      hasStrongSignalOverlap(collectionSignal, productSignal),
    ),
  );
};

export const pushCandidateImage = (
  target: string[],
  value: string | undefined,
  seenKeys: Set<string>,
) => {
  if (typeof value !== 'string' || !value.trim()) {
    return;
  }

  const trimmedValue = value.trim();
  const imageKey = canonicalizeCollectionImageCandidate(trimmedValue);
  if (!imageKey || seenKeys.has(imageKey)) {
    return;
  }

  seenKeys.add(imageKey);
  target.push(trimmedValue);
};

export const buildPreviewCollectionImageCandidates = (
  collection: CollectionCardSeed,
  categories: Category[],
  previewProducts: PreviewProductImageSource[],
  index: number,
): string[] => {
  if (!previewProducts.length && !categories.length) {
    return [];
  }

  const collectionSignals = buildCollectionSignals(collection);
  const matchedCategories = categories.filter((category) =>
    matchesCollectionToCategory(collectionSignals, category),
  );
  const matchedProducts = previewProducts.filter((product) =>
    matchesCollectionToProduct(collectionSignals, product),
  );
  const rotatedPreviewProducts = rotateList(previewProducts, index);
  const rotatedCategories = rotateList(categories, index);
  const candidates: string[] = [];
  const seenKeys = new Set<string>();

  matchedProducts.forEach((product) => {
    pushCandidateImage(candidates, product.mainImage, seenKeys);
  });

  matchedCategories.forEach((category) => {
    pushCandidateImage(candidates, category.image, seenKeys);
  });

  matchedProducts.forEach((product) => {
    product.images?.forEach((image) =>
      pushCandidateImage(candidates, image, seenKeys),
    );
  });

  rotatedPreviewProducts.forEach((product) => {
    pushCandidateImage(candidates, product.mainImage, seenKeys);
  });

  rotatedPreviewProducts.forEach((product) => {
    product.images?.forEach((image) =>
      pushCandidateImage(candidates, image, seenKeys),
    );
  });

  rotatedCategories.forEach((category) => {
    pushCandidateImage(candidates, category.image, seenKeys);
  });

  return candidates;
};

export const chooseUniqueCollectionImage = (
  candidates: string[],
  usedImageKeys: Set<string>,
): string | null => {
  const normalizedCandidates = candidates.filter(
    (value): value is string =>
      typeof value === 'string' && value.trim().length > 0,
  );

  for (const candidate of normalizedCandidates) {
    const imageKey = canonicalizeCollectionImageCandidate(candidate);
    if (!imageKey || usedImageKeys.has(imageKey)) {
      continue;
    }

    usedImageKeys.add(imageKey);
    return candidate;
  }

  const fallbackCandidate = normalizedCandidates[0];
  if (!fallbackCandidate) {
    return null;
  }

  const fallbackKey = canonicalizeCollectionImageCandidate(fallbackCandidate);
  if (fallbackKey) {
    usedImageKeys.add(fallbackKey);
  }

  return fallbackCandidate;
};

export const resolveFeaturedCollectionCards = ({
  seeds,
  categories,
  previewProducts,
  imageFallbacks,
  preferPreviewProductImagery,
}: {
  seeds: CollectionCardSeed[];
  categories: Category[];
  previewProducts: PreviewProductImageSource[];
  imageFallbacks: string[];
  preferPreviewProductImagery: boolean;
}): CollectionCard[] => {
  const usedImageKeys = new Set<string>();

  return seeds.map((seed, index) => {
    const previewCandidates = buildPreviewCollectionImageCandidates(
      seed,
      categories,
      previewProducts,
      index,
    );
    const orderedCandidates = hasStrongManualCollectionImage(seed.image)
      ? [
          seed.image || '',
          ...previewCandidates,
          imageFallbacks[index % imageFallbacks.length] || '',
        ]
      : preferPreviewProductImagery
        ? [
            ...previewCandidates,
            seed.image || '',
            imageFallbacks[index % imageFallbacks.length] || '',
          ]
        : [
            seed.image || '',
            ...previewCandidates,
            imageFallbacks[index % imageFallbacks.length] || '',
          ];
    const image =
      chooseUniqueCollectionImage(orderedCandidates, usedImageKeys) ||
      imageFallbacks[index % imageFallbacks.length]!;

    return {
      ...seed,
      image,
    };
  });
};

export const resolveCollectionImage = (
  collection: Category,
  index: number,
  options?: {
    isSmartBazaar?: boolean;
  },
): string => {
  if (collection.image?.trim()) {
    return collection.image.trim();
  }

  if (options?.isSmartBazaar) {
    return SMART_BAZAAR_IMAGE_FALLBACKS[
      index % SMART_BAZAAR_IMAGE_FALLBACKS.length
    ]!;
  }

  const name = normalizeText(`${collection.name} ${collection.slug || ''}`);
  if (name.includes('heel') || name.includes('كعب')) {
    return '/placeholders/luxury-shoes/pump-black.png';
  }
  if (name.includes('sneaker') || name.includes('سنيكر')) {
    return '/placeholders/luxury-shoes/sneaker-white.png';
  }
  if (name.includes('sandal') || name.includes('صندل')) {
    return '/placeholders/luxury-shoes/sneakers.png';
  }
  if (name.includes('flat') || name.includes('فلات') || name.includes('مسطح')) {
    return '/placeholders/luxury-shoes/flats.png';
  }
  if (name.includes('boot') || name.includes('بوت')) {
    return '/placeholders/luxury-shoes/boots.png';
  }

  return IMAGE_FALLBACKS[index % IMAGE_FALLBACKS.length]!;
};

export const resolveCollectionDescription = (
  collection: any,
  index: number,
  fallbackCollections: CollectionFallback[],
  manualCollections?: ManualCollectionInput[],
): string => {
  const manualSubtitle = manualCollections?.[index]?.subtitle;
  if (manualSubtitle) {
    return manualSubtitle;
  }
  return (
    collection.description?.trim() ||
    fallbackCollections[index % fallbackCollections.length]!.description
  );
};

export const isManualCollectionInput = (
  value: unknown,
): value is ManualCollectionInput =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const parseManualCollections = (value: unknown): ManualCollectionInput[] => {
  if (Array.isArray(value)) {
    return value.filter(isManualCollectionInput);
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\r?\n/)
      .map((line) => line.split('|').map((part) => part.trim()))
      .filter((parts) => parts.some(Boolean))
      .map(([title, subtitle, image, link]) => ({
        title: title || undefined,
        subtitle: subtitle || undefined,
        image: image || undefined,
        link: link || undefined,
      }))
      .filter((collection) =>
        Boolean(
          collection.title ||
          collection.subtitle ||
          collection.image ||
          collection.link,
        ),
      );
  }

  return [];
};

export const resolveTechDecisionLaneMeta = (
  collection: CollectionCard,
  index: number,
): TechDecisionLaneMeta => {
  const content = normalizeText(
    `${collection.name} ${collection.slug || ''} ${collection.description}`,
  );

  if (
    content.includes('laptop') ||
    content.includes('لابتوب') ||
    content.includes('study') ||
    content.includes('دراسة') ||
    content.includes('work')
  ) {
    return {
      eyebrow: 'Work / Study',
      routeLabel: 'Office / Campus',
      bullets: ['بطارية وعمر تشغيل', 'وزن وحركة يومية', 'شاشة مناسبة للشغل'],
      footer: 'أجهزة أسهل للحسم لو أهم شيء عندك الحركة والاعتمادية.',
    };
  }

  if (
    content.includes('desktop') ||
    content.includes('gaming') ||
    content.includes('creator') ||
    content.includes('جيمنج') ||
    content.includes('تجميع')
  ) {
    return {
      eyebrow: 'Creator / Gaming',
      routeLabel: 'High Load',
      bullets: ['معالج وكرت أوضح', 'تبريد وتوسعة', 'جاهز للشغل الثقيل'],
      footer: 'مسار أقوى لو القرار مبني على الأداء والتحميل الطويل.',
    };
  }

  if (
    content.includes('monitor') ||
    content.includes('display') ||
    content.includes('screen') ||
    content.includes('شاشة') ||
    content.includes('عرض')
  ) {
    return {
      eyebrow: 'Vision / Display',
      routeLabel: 'Color / Motion',
      bullets: ['QHD و4K', 'معدل تحديث أوضح', 'مقاس مناسب للمكتب'],
      footer: 'ابدأ من الدقة والحجم قبل ما تدخل في تفاصيل مشتتة.',
    };
  }

  if (
    content.includes('accessories') ||
    content.includes('dock') ||
    content.includes('keyboard') ||
    content.includes('mouse') ||
    content.includes('إكسسوارات')
  ) {
    return {
      eyebrow: 'Desk Upgrade',
      routeLabel: 'Fast Add-ons',
      bullets: ['Dock وHub', 'Keyboard / Mouse', 'إضافات تكمل الجهاز'],
      footer: 'ترقيات صغيرة لكن تأثيرها واضح على المكتب أو اللابتوب.',
    };
  }

  return [
    {
      eyebrow: 'Quick Compare',
      routeLabel: 'Ready Now',
      bullets: ['سعر واضح', 'مواصفة أساسية', 'اختيار أسرع'],
      footer: 'ابدأ من المسار الأقرب لاستخدامك بدل شبكة عامة مزدحمة.',
    },
    {
      eyebrow: 'Use Case',
      routeLabel: 'Focused',
      bullets: ['فئة مرتبة', 'دخول مباشر', 'قرار أسهل'],
      footer: 'تقسيم أنظف للمنتجات حتى لا تضيع بين منتجات متشابهة.',
    },
  ][index % 2]!;
};

export const TRAVEL_POSTCARD_META: TravelPostcardMeta[] = [
  {
    stamp: 'COASTLINE 03',
    routeLabel: '3 night edit',
    packingNote: 'حقيبة يد + طبقة واحدة',
    bullets: [
      'فستان خفيف لا يحتاج كيًا معقدًا',
      'طبقة مسائية للعشاء أو الطائرة',
      'صندل واحد يتحمل النهار والمساء',
    ],
    footer:
      'ابدئي من شكل الرحلة نفسها بدل الدوران بين أقسام منفصلة لا تقول لك ماذا يدخل الحقيبة أولًا.',
  },
  {
    stamp: 'CITY ESCAPE',
    routeLabel: 'walk + dinner',
    packingNote: 'خفيف في النهار',
    bullets: [
      'راحة للحركة الطويلة',
      'قماش لا يثقل في الشمس',
      'ينتقل من المشوار للعشاء بسرعة',
    ],
    footer:
      'هذا المسار مناسب للمدن الساحلية والخرجات التي تبدأ مبكرًا وتنتهي على مائدة أو ممشى.',
  },
  {
    stamp: 'SUNSET TABLE',
    routeLabel: 'evening resort',
    packingNote: 'قطعتان تكفيان',
    bullets: [
      'ألوان أهدأ للغروب والصور',
      'تفاصيل أنعم بدون مبالغة',
      'حذاء أو حقيبة يرفعان الإطلالة فورًا',
    ],
    footer:
      'اختيارات العشاء لا تحتاج حقيبة كاملة إذا بدأت من القطعة الصحيحة وإضافة واحدة ذكية.',
  },
  {
    stamp: 'MORNING POOL',
    routeLabel: 'sunlight ready',
    packingNote: 'تهوية أعلى',
    bullets: [
      'قماش أسرع جفافًا',
      'طبقة تغطية خفيفة للمشاوير',
      'انتقال سهل من البحر للكافيه',
    ],
    footer:
      'مثالي للصباحات المفتوحة حين تحتاجين شيئًا خفيفًا لكنه لا يبدو عشوائيًا في الصور أو الخروجات القصيرة.',
  },
];

export const resolveTravelPostcardMeta = (index: number): TravelPostcardMeta =>
  TRAVEL_POSTCARD_META[index % TRAVEL_POSTCARD_META.length]!;

export const resolveDistrictMarketLaneNote = (
  collection: CollectionCard,
  index: number,
): string => {
  const content = normalizeText(
    `${collection.name} ${collection.slug || ''} ${collection.description}`,
  );

  if (
    content.includes('أساسيات') ||
    content.includes('daily') ||
    content.includes('روتين')
  ) {
    return 'علب، زجاجات، وإضافات صغيرة تتحرك بسرعة داخل السلة.';
  }

  if (
    content.includes('بيت') ||
    content.includes('مطبخ') ||
    content.includes('home') ||
    content.includes('kitchen') ||
    content.includes('تنظيم')
  ) {
    return 'حلول تجهيز وتنظيم تساعد على بناء سلة أكبر بشكل طبيعي.';
  }

  if (
    content.includes('عرض') ||
    content.includes('deal') ||
    content.includes('خصم')
  ) {
    return 'ركن سريع للمنتجات الحساسة للسعر والعروض التي تساعد على الحسم.';
  }

  if (
    content.includes('سفر') ||
    content.includes('خروج') ||
    content.includes('travel')
  ) {
    return 'منتجات خفيفة للمكتب، السيارة، والتنقل اليومي بدون تشتيت.';
  }

  if (
    content.includes('موسمي') ||
    content.includes('season') ||
    content.includes('جديد')
  ) {
    return 'تجديدات تبقي المتجر حيًا بدل الإحساس بالأرشيف.';
  }

  return index === 0
    ? 'ابدأ من الركن الأكثر زيارة داخل المتجر العام.'
    : 'مسار أوضح لتصفح أسرع داخل المتجر.';
};

export const resolveDistrictMarketCellClass = (
  index: number,
  total: number,
): string => {
  const classes = [
    'group grid grid-cols-[7.25rem_minmax(0,1fr)] gap-5 px-4 py-4 transition-colors duration-300 hover:bg-secondary/52 sm:grid-cols-[8.75rem_minmax(0,1fr)] md:grid-cols-[9.35rem_minmax(0,1fr)] sm:px-5 sm:py-5',
  ];

  if (index < total - 1) {
    classes.push('border-b border-primary/10');
  }

  const isLeftColumn = index % 2 === 0;
  const hasNeighborOnRight = index + 1 < total;
  const rowIndex = Math.floor(index / 2);
  const totalRows = Math.ceil(total / 2);
  const isNotLastRow = rowIndex < totalRows - 1;

  if (isLeftColumn && hasNeighborOnRight) {
    classes.push('xl:border-s xl:border-primary/10');
  }

  if (isNotLastRow) {
    classes.push('xl:border-b xl:border-primary/10');
  }

  return classes.join(' ');
};
