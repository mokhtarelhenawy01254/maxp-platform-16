import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useCategories, type Category } from "../hooks/useCategories";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import { resolvePreviewThemeId } from "../preview/previewContext";
import { resolveActiveThemePreviewDataset } from "../preview/themePreviewData";
import { buildStorefrontPath } from "../utils/paths";
import { isKhemetLuxeTheme } from "../utils/navigationGuards";
import {
  getDefaultRegisteredVariantId,
  hasRegisteredVariant,
} from "../variants";
import {
  SmartBazaarCategoryScene,
  isSmartBazaarThemeAssetImage,
  resolveSmartBazaarSceneKey,
} from "../components/SmartBazaarMockups";
import {
  buildOptimizedStorefrontImageUrl,
  buildResponsiveStorefrontImage,
  buildVersionedStorefrontStaticAssetUrl,
} from "../utils/productImages";

interface FeaturedCollectionsProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    title?: string;
    subtitle?: string;
    limit?: number;
    ctaText?: string;
    ctaLink?: string;
    preferRuntimeCategories?: boolean;
    [key: string]: unknown;
  };
}

type CollectionFallback = Category & {
  description: string;
};

type ManualCollectionInput = {
  id?: string;
  title?: string;
  name?: string;
  slug?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  link?: string;
};

type CollectionCard = {
  id: string;
  name: string;
  slug?: string;
  description: string;
  image: string;
  href: string;
};

type CollectionCardSeed = Omit<CollectionCard, "image"> & {
  image?: string;
};

type PreviewProductImageSource = {
  id?: string;
  slug?: string;
  name?: string;
  description?: string;
  categoryId?: string;
  category?: {
    id?: string;
    slug?: string;
    name?: string;
  };
  mainImage?: string;
  images?: string[];
};

const getCollectionImageAttributes = (
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

const prepareCollectionCardImage = (imageUrl: string): string =>
  buildOptimizedStorefrontImageUrl(
    buildVersionedStorefrontStaticAssetUrl(imageUrl),
    {
      width: 900,
      quality: 72,
    },
  );

const FALLBACK_COLLECTIONS: CollectionFallback[] = [
  {
    id: "heels",
    name: "كعب أنيق",
    slug: "heels",
    description: "موديلات سهرة ولمسات كلاسيك يومية.",
  },
  {
    id: "sneakers",
    name: "سنيكرز يومي",
    slug: "sneakers",
    description: "راحة يومية بتفاصيل أنثوية ناعمة.",
  },
  {
    id: "sandals",
    name: "صنادل خفيفة",
    slug: "sandals",
    description: "خيارات صيفية سريعة ومريحة.",
  },
  {
    id: "flats",
    name: "فلات عملي",
    slug: "flats",
    description: "ستايل عملي مناسب للشغل والخروجات.",
  },
  {
    id: "evening",
    name: "لوك سهرة",
    slug: "evening",
    description: "قطع مختارة للمناسبات والسهرات.",
  },
  {
    id: "work",
    name: "شغل وكاجوال",
    slug: "work",
    description: "خيارات متوازنة للمكتب والتحرك اليومي.",
  },
];

const SMART_BAZAAR_FALLBACK_COLLECTIONS: CollectionFallback[] = [
  {
    id: "daily-essentials",
    name: "أساسيات يومية",
    slug: "daily-essentials",
    description: "منتجات تتكرر يوميًا وتحتاج وصولًا أسرع وقرارًا أبسط.",
  },
  {
    id: "home-organization",
    name: "البيت والتنظيم",
    slug: "home-organization",
    description: "اختيارات عملية للبيت والعمل والحركة اليومية داخل قسم أوضح.",
  },
  {
    id: "quick-deals",
    name: "عروض سريعة",
    slug: "quick-deals",
    description: "منتجات حساسة للسعر وعروض تساعد العميل على الحسم بسرعة.",
  },
  {
    id: "gift-ready",
    name: "هدايا جاهزة",
    slug: "gift-ready",
    description: "هدايا واختيارات موسمية مرتبة لا تحتاج بحثًا طويلًا.",
  },
  {
    id: "family-needs",
    name: "احتياجات العائلة",
    slug: "family-needs",
    description: "مسار عملي للطلبات المتكررة والمنتجات اليومية للعائلة.",
  },
  {
    id: "mobile-favorites",
    name: "الأسرع على الموبايل",
    slug: "mobile-favorites",
    description: "منتجات مهيأة للتصفح السريع والشراء المباشر من أول زيارة.",
  },
];

const IMAGE_FALLBACKS = [
  "/placeholders/luxury-shoes/pump-black.png",
  "/placeholders/luxury-shoes/sneaker-white.png",
  "/placeholders/luxury-shoes/sneakers.png",
  "/placeholders/luxury-shoes/flats.png",
  "/placeholders/luxury-shoes/boots.png",
  "/placeholders/luxury-shoes/hero.png",
];

const SMART_BAZAAR_IMAGE_FALLBACKS = [
  "/assets/themes/smart-bazaar/daily.png",
  "/assets/themes/smart-bazaar/home.png",
  "/assets/themes/smart-bazaar/deals.png",
  "/assets/themes/smart-bazaar/gifts.png",
];

const normalizeText = (value: string): string => value.trim().toLowerCase();

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
    isKhemetLuxeTheme(themeId) &&
    (variant === "gallery-columns" || variant === "legacy-circle-categories"));

const normalizeMatchText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const hasStrongSignalOverlap = (left: string, right: string): boolean => {
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
  if (typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "";
  }

  try {
    const parsedUrl = new URL(
      trimmedValue.startsWith("http")
        ? trimmedValue
        : `https://storefront.local${
            trimmedValue.startsWith("/") ? trimmedValue : `/${trimmedValue}`
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

const hasStrongManualCollectionImage = (value?: string): boolean => {
  const normalizedValue = canonicalizeCollectionImageCandidate(value);

  if (!normalizedValue) {
    return false;
  }

  if (normalizedValue.startsWith("/placeholders/")) {
    return false;
  }

  return !/\/preview\.(png|svg|jpe?g|webp)$/i.test(normalizedValue);
};

const rotateList = <T,>(items: T[], offset: number): T[] => {
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

const extractCollectionLinkSignals = (href?: string): string[] => {
  if (typeof href !== "string" || !href.trim()) {
    return [];
  }

  try {
    const parsedUrl = new URL(
      href.startsWith("http")
        ? href
        : `https://storefront.local${href.startsWith("/") ? href : `/${href}`}`,
    );
    const categoryParam = parsedUrl.searchParams.get("category");
    const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
    const collectionsSlug =
      pathSegments[0] === "collections" && pathSegments[1]
        ? pathSegments[1]
        : undefined;

    return [categoryParam, collectionsSlug]
      .filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      )
      .map(normalizeMatchText);
  } catch {
    return [];
  }
};

const buildCollectionSignals = (collection: CollectionCardSeed): string[] =>
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
            typeof value === "string" && value.trim().length > 0,
        )
        .map(normalizeMatchText)
        .filter(Boolean),
    ),
  );

const matchesCollectionToCategory = (
  collectionSignals: string[],
  category: Pick<Category, "id" | "slug" | "name">,
): boolean => {
  const categorySignals = [category.id, category.slug, category.name]
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    .map(normalizeMatchText);

  return collectionSignals.some((collectionSignal) =>
    categorySignals.some((categorySignal) =>
      hasStrongSignalOverlap(collectionSignal, categorySignal),
    ),
  );
};

const matchesCollectionToProduct = (
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
        typeof value === "string" && value.trim().length > 0,
    )
    .map(normalizeMatchText);

  return collectionSignals.some((collectionSignal) =>
    productSignals.some((productSignal) =>
      hasStrongSignalOverlap(collectionSignal, productSignal),
    ),
  );
};

const pushCandidateImage = (
  target: string[],
  value: string | undefined,
  seenKeys: Set<string>,
) => {
  if (typeof value !== "string" || !value.trim()) {
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

const buildPreviewCollectionImageCandidates = (
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

const chooseUniqueCollectionImage = (
  candidates: string[],
  usedImageKeys: Set<string>,
): string | null => {
  const normalizedCandidates = candidates.filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
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
          seed.image || "",
          ...previewCandidates,
          imageFallbacks[index % imageFallbacks.length] || "",
        ]
      : preferPreviewProductImagery
        ? [
            ...previewCandidates,
            seed.image || "",
            imageFallbacks[index % imageFallbacks.length] || "",
          ]
        : [
            seed.image || "",
            ...previewCandidates,
            imageFallbacks[index % imageFallbacks.length] || "",
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

const resolveCollectionImage = (
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

  const name = normalizeText(`${collection.name} ${collection.slug || ""}`);
  if (name.includes("heel") || name.includes("كعب")) {
    return "/placeholders/luxury-shoes/pump-black.png";
  }
  if (name.includes("sneaker") || name.includes("سنيكر")) {
    return "/placeholders/luxury-shoes/sneaker-white.png";
  }
  if (name.includes("sandal") || name.includes("صندل")) {
    return "/placeholders/luxury-shoes/sneakers.png";
  }
  if (name.includes("flat") || name.includes("فلات") || name.includes("مسطح")) {
    return "/placeholders/luxury-shoes/flats.png";
  }
  if (name.includes("boot") || name.includes("بوت")) {
    return "/placeholders/luxury-shoes/boots.png";
  }

  return IMAGE_FALLBACKS[index % IMAGE_FALLBACKS.length]!;
};

const resolveCollectionDescription = (
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

const isManualCollectionInput = (
  value: unknown,
): value is ManualCollectionInput =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseManualCollections = (value: unknown): ManualCollectionInput[] => {
  if (Array.isArray(value)) {
    return value.filter(isManualCollectionInput);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\r?\n/)
      .map((line) => line.split("|").map((part) => part.trim()))
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

type TechDecisionLaneMeta = {
  eyebrow: string;
  routeLabel: string;
  bullets: string[];
  footer: string;
};

type TravelPostcardMeta = {
  stamp: string;
  routeLabel: string;
  packingNote: string;
  bullets: string[];
  footer: string;
};

const resolveTechDecisionLaneMeta = (
  collection: CollectionCard,
  index: number,
): TechDecisionLaneMeta => {
  const content = normalizeText(
    `${collection.name} ${collection.slug || ""} ${collection.description}`,
  );

  if (
    content.includes("laptop") ||
    content.includes("لابتوب") ||
    content.includes("study") ||
    content.includes("دراسة") ||
    content.includes("work")
  ) {
    return {
      eyebrow: "Work / Study",
      routeLabel: "Office / Campus",
      bullets: ["بطارية وعمر تشغيل", "وزن وحركة يومية", "شاشة مناسبة للشغل"],
      footer: "أجهزة أسهل للحسم لو أهم شيء عندك الحركة والاعتمادية.",
    };
  }

  if (
    content.includes("desktop") ||
    content.includes("gaming") ||
    content.includes("creator") ||
    content.includes("جيمنج") ||
    content.includes("تجميع")
  ) {
    return {
      eyebrow: "Creator / Gaming",
      routeLabel: "High Load",
      bullets: ["معالج وكرت أوضح", "تبريد وتوسعة", "جاهز للشغل الثقيل"],
      footer: "مسار أقوى لو القرار مبني على الأداء والتحميل الطويل.",
    };
  }

  if (
    content.includes("monitor") ||
    content.includes("display") ||
    content.includes("screen") ||
    content.includes("شاشة") ||
    content.includes("عرض")
  ) {
    return {
      eyebrow: "Vision / Display",
      routeLabel: "Color / Motion",
      bullets: ["QHD و4K", "معدل تحديث أوضح", "مقاس مناسب للمكتب"],
      footer: "ابدأ من الدقة والحجم قبل ما تدخل في تفاصيل مشتتة.",
    };
  }

  if (
    content.includes("accessories") ||
    content.includes("dock") ||
    content.includes("keyboard") ||
    content.includes("mouse") ||
    content.includes("إكسسوارات")
  ) {
    return {
      eyebrow: "Desk Upgrade",
      routeLabel: "Fast Add-ons",
      bullets: ["Dock وHub", "Keyboard / Mouse", "إضافات تكمل الجهاز"],
      footer: "ترقيات صغيرة لكن تأثيرها واضح على المكتب أو اللابتوب.",
    };
  }

  return [
    {
      eyebrow: "Quick Compare",
      routeLabel: "Ready Now",
      bullets: ["سعر واضح", "مواصفة أساسية", "اختيار أسرع"],
      footer: "ابدأ من المسار الأقرب لاستخدامك بدل شبكة عامة مزدحمة.",
    },
    {
      eyebrow: "Use Case",
      routeLabel: "Focused",
      bullets: ["فئة مرتبة", "دخول مباشر", "قرار أسهل"],
      footer: "تقسيم أنظف للمنتجات حتى لا تضيع بين منتجات متشابهة.",
    },
  ][index % 2]!;
};

const TRAVEL_POSTCARD_META: TravelPostcardMeta[] = [
  {
    stamp: "COASTLINE 03",
    routeLabel: "3 night edit",
    packingNote: "حقيبة يد + طبقة واحدة",
    bullets: [
      "فستان خفيف لا يحتاج كيًا معقدًا",
      "طبقة مسائية للعشاء أو الطائرة",
      "صندل واحد يتحمل النهار والمساء",
    ],
    footer:
      "ابدئي من شكل الرحلة نفسها بدل الدوران بين أقسام منفصلة لا تقول لك ماذا يدخل الحقيبة أولًا.",
  },
  {
    stamp: "CITY ESCAPE",
    routeLabel: "walk + dinner",
    packingNote: "خفيف في النهار",
    bullets: [
      "راحة للحركة الطويلة",
      "قماش لا يثقل في الشمس",
      "ينتقل من المشوار للعشاء بسرعة",
    ],
    footer:
      "هذا المسار مناسب للمدن الساحلية والخرجات التي تبدأ مبكرًا وتنتهي على مائدة أو ممشى.",
  },
  {
    stamp: "SUNSET TABLE",
    routeLabel: "evening resort",
    packingNote: "قطعتان تكفيان",
    bullets: [
      "ألوان أهدأ للغروب والصور",
      "تفاصيل أنعم بدون مبالغة",
      "حذاء أو حقيبة يرفعان الإطلالة فورًا",
    ],
    footer:
      "اختيارات العشاء لا تحتاج حقيبة كاملة إذا بدأت من القطعة الصحيحة وإضافة واحدة ذكية.",
  },
  {
    stamp: "MORNING POOL",
    routeLabel: "sunlight ready",
    packingNote: "تهوية أعلى",
    bullets: [
      "قماش أسرع جفافًا",
      "طبقة تغطية خفيفة للمشاوير",
      "انتقال سهل من البحر للكافيه",
    ],
    footer:
      "مثالي للصباحات المفتوحة حين تحتاجين شيئًا خفيفًا لكنه لا يبدو عشوائيًا في الصور أو الخروجات القصيرة.",
  },
];

const resolveTravelPostcardMeta = (index: number): TravelPostcardMeta =>
  TRAVEL_POSTCARD_META[index % TRAVEL_POSTCARD_META.length]!;

const resolveDistrictMarketLaneNote = (
  collection: CollectionCard,
  index: number,
): string => {
  const content = normalizeText(
    `${collection.name} ${collection.slug || ""} ${collection.description}`,
  );

  if (
    content.includes("أساسيات") ||
    content.includes("daily") ||
    content.includes("روتين")
  ) {
    return "علب، زجاجات، وإضافات صغيرة تتحرك بسرعة داخل السلة.";
  }

  if (
    content.includes("بيت") ||
    content.includes("مطبخ") ||
    content.includes("home") ||
    content.includes("kitchen") ||
    content.includes("تنظيم")
  ) {
    return "حلول تجهيز وتنظيم تساعد على بناء سلة أكبر بشكل طبيعي.";
  }

  if (
    content.includes("عرض") ||
    content.includes("deal") ||
    content.includes("خصم")
  ) {
    return "ركن سريع للمنتجات الحساسة للسعر والعروض التي تساعد على الحسم.";
  }

  if (
    content.includes("سفر") ||
    content.includes("خروج") ||
    content.includes("travel")
  ) {
    return "منتجات خفيفة للمكتب، السيارة، والتنقل اليومي بدون تشتيت.";
  }

  if (
    content.includes("موسمي") ||
    content.includes("season") ||
    content.includes("جديد")
  ) {
    return "تجديدات تبقي المتجر حيًا بدل الإحساس بالأرشيف.";
  }

  return index === 0
    ? "ابدأ من الركن الأكثر زيارة داخل المتجر العام."
    : "مسار أوضح لتصفح أسرع داخل المتجر.";
};

const resolveDistrictMarketCellClass = (
  index: number,
  total: number,
): string => {
  const classes = [
    "group grid grid-cols-[7.25rem_minmax(0,1fr)] gap-5 px-4 py-4 transition-colors duration-300 hover:bg-secondary/52 sm:grid-cols-[8.75rem_minmax(0,1fr)] md:grid-cols-[9.35rem_minmax(0,1fr)] sm:px-5 sm:py-5",
  ];

  if (index < total - 1) {
    classes.push("border-b border-primary/10");
  }

  const isLeftColumn = index % 2 === 0;
  const hasNeighborOnRight = index + 1 < total;
  const rowIndex = Math.floor(index / 2);
  const totalRows = Math.ceil(total / 2);
  const isNotLastRow = rowIndex < totalRows - 1;

  if (isLeftColumn && hasNeighborOnRight) {
    classes.push("xl:border-s xl:border-primary/10");
  }

  if (isNotLastRow) {
    classes.push("xl:border-b xl:border-primary/10");
  }

  return classes.join(" ");
};

type FeaturedCollectionsVariant =
  | "standard-showcase"
  | "editorial-categories"
  | "gallery-columns"
  | "fast-nav-grid"
  | "tech-decision-lanes"
  | "catalog-pills"
  | "retail-category-tiles"
  | "pastel-category-lane"
  | "fragrance-ledger"
  | "butcher-cut-map"
  | "elessi-bag-categories"
  | "elessi-merch-panels"
  | "elessi-pill-shelf"
  | "elessi-story-cards"
  | "elessi-utility-cards"
  | "elessi-organic-routes"
  | "elessi-digital-departments"
  | "elessi-plant-categories"
  | "elessi-bike-panels"
  | "menu-categories"
  | "floating-bubbles"
  | "occasion-ribbon"
  | "travel-postcards"
  | "legacy-circle-categories";

const FEATURED_COLLECTIONS_FAMILY = "FeaturedCollections";
const FEATURED_COLLECTIONS_DEFAULT =
  (getDefaultRegisteredVariantId(FEATURED_COLLECTIONS_FAMILY) as
    | FeaturedCollectionsVariant
    | undefined) || "standard-showcase";

const normalizeFeaturedCollectionsVariant = (
  rawVariant: unknown,
): FeaturedCollectionsVariant => {
  const value = String(rawVariant || "")
    .trim()
    .toLowerCase();
  if (
    (value === "standard-showcase" ||
      value === "editorial-categories" ||
      value === "gallery-columns" ||
      value === "fast-nav-grid" ||
      value === "tech-decision-lanes" ||
      value === "catalog-pills" ||
      value === "retail-category-tiles" ||
      value === "pastel-category-lane" ||
      value === "fragrance-ledger" ||
      value === "butcher-cut-map" ||
      value === "elessi-bag-categories" ||
      value === "elessi-merch-panels" ||
      value === "elessi-pill-shelf" ||
      value === "elessi-story-cards" ||
      value === "elessi-plant-categories" ||
      value === "elessi-utility-cards" ||
      value === "elessi-organic-routes" ||
      value === "elessi-digital-departments" ||
      value === "elessi-bike-panels" ||
      value === "menu-categories" ||
      value === "floating-bubbles" ||
      value === "occasion-ribbon" ||
      value === "travel-postcards" ||
      value === "legacy-circle-categories") &&
    hasRegisteredVariant(FEATURED_COLLECTIONS_FAMILY, value)
  ) {
    return value as FeaturedCollectionsVariant;
  }
  return FEATURED_COLLECTIONS_DEFAULT;
};

const FeaturedCollections: React.FC<FeaturedCollectionsProps> = ({
  section,
  settings,
}) => {
  const { theme } = useStorefrontTheme();
  const { categories, isLoading } = useCategories();
  const location = useLocation();
  const previewDataset = React.useMemo(
    () => resolveActiveThemePreviewDataset(location.search),
    [location.search],
  );
  const previewThemeId = React.useMemo(
    () => resolvePreviewThemeId(location.search),
    [location.search],
  );
  const [marketplacePreviewProducts, setMarketplacePreviewProducts] =
    React.useState<PreviewProductImageSource[]>([]);

  React.useEffect(() => {
    if (previewDataset?.products?.length || !previewThemeId) {
      setMarketplacePreviewProducts([]);
      return;
    }

    let cancelled = false;

    void import("../preview/marketplaceSampleData").then(
      ({ getMarketplacePreviewProducts }) => {
        if (cancelled) {
          return;
        }

        setMarketplacePreviewProducts(
          getMarketplacePreviewProducts({ limit: 120 }, previewThemeId)?.data ||
            [],
        );
      },
    );

    return () => {
      cancelled = true;
    };
  }, [previewDataset, previewThemeId]);

  const previewProducts = React.useMemo<PreviewProductImageSource[]>(() => {
    if (previewDataset?.products?.length) {
      return previewDataset.products;
    }

    return marketplacePreviewProducts;
  }, [marketplacePreviewProducts, previewDataset]);
  const isWomenFashion = theme.id === "women-fashion-eg";
  const isSoleaFemme = theme.id === "solea-femme";
  const isFakhama = theme.id === "fakhama-elite";
  const isSmartBazaar = theme.id === "smart-bazaar";
  const isDistrictMarket = theme.id === "district-market";
  const isPerfumeEg = theme.id === "perfume-eg";
  const isKidsPlay = theme.id === "kids-play";
  const isNovaMobile = theme.id === "nova-mobile";
  const isBiteRush = theme.id === "restaurant-demo";
  const isCafeDemo = theme.id === "cafe-demo";
  const isVelaFashion = theme.id === "vela-fashion-eg";
  const isAtelierNova = theme.id === "atelier-nova";
  const variant = normalizeFeaturedCollectionsVariant(settings?.variant || section?.variant);
  const isElessiVariant =
    variant === "elessi-bag-categories" ||
    variant === "elessi-merch-panels" ||
    variant === "elessi-pill-shelf" ||
    variant === "elessi-story-cards" ||
    variant === "elessi-plant-categories" ||
    variant === "elessi-utility-cards" ||
    variant === "elessi-organic-routes" ||
    variant === "elessi-digital-departments" ||
    variant === "elessi-bike-panels";
  const fallbackCollections = isSmartBazaar
    ? SMART_BAZAAR_FALLBACK_COLLECTIONS
    : FALLBACK_COLLECTIONS;
  const imageFallbacks = isSmartBazaar
    ? SMART_BAZAAR_IMAGE_FALLBACKS
    : IMAGE_FALLBACKS;
  const title =
    settings?.title ||
    (isCafeDemo
      ? "تسوق حسب المزاج"
      : isSmartBazaar
        ? "أقسام مرتبة مثل المتجر الحقيقي"
        : "تسوقي حسب التصنيف");
  const subtitle =
    settings?.subtitle ||
    (isCafeDemo
      ? "ابدأ من الحبوب أو المشروبات الباردة أو أدوات التحضير عشان توصل للركنة المناسبة بسرعة."
      : isKidsPlay || variant === "floating-bubbles"
        ? "ابدأ من نوع اللعب أو المرحلة العمرية لتصل للعبة المناسبة بسرعة ووضوح."
        : isSmartBazaar
          ? "كل قسم يجمع منتجات متقاربة وأسعار أوضح حتى يشعر الزائر أنه يتصفح متجرًا فعليًا لا مجرد تقسيمات عامة."
          : "اختيارات سريعة تساعدك على الوصول لنوع الحذاء المناسب أسرع.");
  const hideBadge = settings?.["hideBadge"] === true;
  const hideSubtitle = settings?.["hideSubtitle"] === true;
  const hideSectionCta = settings?.["hideCta"] === true;
  const hideCardDescriptions = settings?.["hideCardDescriptions"] === true;
  const hideCardCtas = settings?.["hideCardCtas"] === true;
  const limit =
    typeof settings?.limit === "number" && settings.limit > 0
      ? settings.limit
      : 6;
  const ctaText =
    settings?.ctaText || (isSmartBazaar ? "كل الأقسام" : "عرض كل التصنيفات");
  const ctaLink =
    typeof settings?.ctaLink === "string" ? settings.ctaLink.trim() : "";
  const collections =
    categories.length > 0
      ? categories.slice(0, limit)
      : fallbackCollections.slice(0, limit);
  const manualCollections = parseManualCollections(settings?.["collections"]);
  const preferRuntimeCategories = shouldPreferRuntimeFeaturedCollections({
    themeId: theme.id,
    variant,
    settingsPreferRuntimeCategories: settings?.preferRuntimeCategories,
  });
  const shouldUseManualCollections =
    manualCollections.length > 0 &&
    !(preferRuntimeCategories && categories.length > 0);
  const preferPreviewProductImagery = previewProducts.length > 0;
  const ctaHref = ctaLink
    ? buildStorefrontPath(
        location.pathname,
        ctaLink.startsWith("/") ? ctaLink : `/${ctaLink}`,
        location.search,
      )
    : "";

  const buildCategoryHref = (categoryId: string) => {
    const baseHref = buildStorefrontPath(
      location.pathname,
      "/shop",
      location.search,
    );

    if (typeof window === "undefined") {
      return `${baseHref}${baseHref.includes("?") ? "&" : "?"}category=${encodeURIComponent(categoryId)}`;
    }

    const target = new URL(baseHref, window.location.origin);
    target.searchParams.set("category", categoryId);
    return `${target.pathname}${target.search}${target.hash}`;
  };

  const collectionSeeds: CollectionCardSeed[] =
    shouldUseManualCollections
      ? manualCollections.slice(0, limit).map((collection, index) => ({
          id:
            collection.id?.trim() ||
            collection.slug?.trim() ||
            `manual-${index}`,
          name:
            collection.title?.trim() ||
            collection.name?.trim() ||
            fallbackCollections[index % fallbackCollections.length]!.name,
          slug: collection.slug?.trim() || collection.id?.trim() || undefined,
          description:
            collection.subtitle?.trim() ||
            collection.description?.trim() ||
            fallbackCollections[index % fallbackCollections.length]!
              .description,
          image: collection.image?.trim() || undefined,
          href: buildStorefrontPath(
            location.pathname,
            collection.link?.trim()
              ? collection.link.trim().startsWith("/")
                ? collection.link.trim()
                : `/${collection.link.trim()}`
              : "/collections",
            location.search,
          ),
        }))
      : collections.map((collection, index) => ({
          id: collection.id,
          name: collection.name,
          slug: collection.slug,
          description: resolveCollectionDescription(
            collection,
            index,
            fallbackCollections,
            shouldUseManualCollections ? manualCollections : undefined,
          ),
          image: resolveCollectionImage(collection, index, { isSmartBazaar }),
          href: buildCategoryHref(collection.id),
        }));
  const collectionCards = resolveFeaturedCollectionCards({
    seeds: collectionSeeds,
    categories,
    previewProducts,
    imageFallbacks,
    preferPreviewProductImagery,
  }).map((collection) => ({
    ...collection,
    image: prepareCollectionCardImage(collection.image),
  }));
  const compactCatalogPills =
    variant === "catalog-pills" && settings?.["hideHeader"] === true;

  if (variant === "butcher-cut-map") {
    const leadCollection = collectionCards[0];
    const sideCollections = collectionCards.slice(1, 4);

    return (
      <section className="relative overflow-hidden bg-[#0b0908] py-12 text-[#f4ead8] md:py-16">
        <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(135deg,rgba(255,255,255,0.06)_0_1px,transparent_1px_22px)]" />
        <div className="container relative z-10 px-4 md:px-6">
          <div className="mb-8 grid gap-5 border-y border-[#37312c] py-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-end">
            <div>
              <span className="inline-flex border border-[#8b6b3e] bg-[#15110f] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-[#d7b674]">
                CUT MAP
              </span>
              <h2 className="mt-4 font-heading text-[2rem] font-black leading-tight text-[#fff7e8] md:text-[3.25rem]">
                {title}
              </h2>
            </div>
            {!hideSubtitle ? (
              <p className="max-w-2xl text-sm leading-7 text-[#b7ab9c] md:text-base">
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)]">
            {leadCollection ? (
              <Link
                to={leadCollection.href}
                className="group relative min-h-[30rem] overflow-hidden border border-[#37312c] bg-[#15110f]"
              >
                <img
                  src={leadCollection.image}
                  alt={leadCollection.name}
                  loading="eager"
                  width="900"
                  height="760"
                  className="absolute inset-0 h-full w-full object-cover opacity-[0.88] transition duration-700 group-hover:scale-[1.035]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,7,6,0.86),rgba(8,7,6,0.28)_58%,rgba(8,7,6,0.72))]" />
                <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(90deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_120px)]" />
                <div className="relative z-10 flex min-h-[30rem] flex-col justify-end p-6 md:p-8">
                  <span className="mb-5 w-fit border border-[#8b6b3e] bg-[#080706]/76 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-[#d7b674]">
                    Master cut 01
                  </span>
                  <h3 className="max-w-[11ch] font-heading text-[3rem] font-black leading-[0.98] text-[#fff7e8] md:text-[4.8rem]">
                    {leadCollection.name}
                  </h3>
                  {!hideCardDescriptions ? (
                    <p className="mt-5 max-w-xl text-sm leading-7 text-[#d6cbbb] md:text-base">
                      {leadCollection.description}
                    </p>
                  ) : null}
                  {!hideCardCtas ? (
                    <span className="mt-6 w-fit border border-[#8f1d2b] bg-[#7a131d] px-5 py-3 text-sm font-black text-[#fff4dc] transition-colors group-hover:bg-[#9a1d2a]">
                      {ctaText || "ادخل القسم"}
                    </span>
                  ) : null}
                </div>
              </Link>
            ) : null}

            <div className="grid gap-4">
              {sideCollections.map((collection, index) => (
                <Link
                  key={collection.id}
                  to={collection.href}
                  className="group grid min-h-[10rem] grid-cols-[8rem_minmax(0,1fr)] overflow-hidden border border-[#37312c] bg-[#0f0d0c] transition-colors hover:border-[#8b6b3e] sm:grid-cols-[11rem_minmax(0,1fr)]"
                >
                  <div className="relative overflow-hidden border-e border-[#37312c] bg-[#15110f]">
                    <img
                      src={collection.image}
                      alt={collection.name}
                      loading="eager"
                      width="360"
                      height="320"
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(8,7,6,0.38))]" />
                  </div>
                  <div className="flex flex-col justify-between p-4 md:p-5">
                    <span className="text-[10px] font-black uppercase tracking-[0.26em] text-[#8b6b3e]">
                      CUT 0{index + 2}
                    </span>
                    <div>
                      <h3 className="font-heading text-xl font-black text-[#fff7e8] md:text-2xl">
                        {collection.name}
                      </h3>
                      {!hideCardDescriptions ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#b7ab9c]">
                          {collection.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`w-full ${compactCatalogPills ? "py-5 md:py-6" : "py-10 md:py-14"} ${
        isSoleaFemme
          ? "bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.72)_42%,hsl(var(--background))_100%)]"
          : isBiteRush
            ? "bg-[linear-gradient(180deg,#fffdfb_0%,#fff3ea_44%,#fffaf6_100%)]"
            : isCafeDemo
              ? "bg-[linear-gradient(180deg,#fffdfa_0%,#f6ede4_46%,#fdf8f3_100%)]"
              : isSmartBazaar
                ? "bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.55)_40%,hsl(var(--background))_100%)]"
                : isElessiVariant
                  ? "bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe6_32%,#fff9f2_64%,#fffdf9_100%)]"
                  : variant === "fragrance-ledger"
                    ? "bg-[linear-gradient(180deg,#fffdf9_0%,#f8efe6_36%,#fffdf9_100%)]"
                    : variant === "catalog-pills"
                      ? "bg-[#f4f6f8]"
                      : variant === "retail-category-tiles"
                        ? "bg-background"
                        : variant === "tech-decision-lanes"
                          ? "bg-[linear-gradient(180deg,#fffdf8_0%,#f7efd9_42%,#fffdf8_100%)]"
                          : variant === "gallery-columns"
                            ? "bg-[linear-gradient(180deg,#fcf7f1_0%,#f6efe8_34%,#fdfaf6_100%)]"
                          : variant === "travel-postcards"
                            ? "bg-[linear-gradient(180deg,#fffaf2_0%,#f4ece1_36%,#fffaf6_100%)]"
                            : variant === "legacy-circle-categories"
                              ? "bg-white"
                              : isKidsPlay || variant === "floating-bubbles"
                                ? "bg-[radial-gradient(circle_at_top_right,hsl(var(--secondary)/0.15),transparent_40%),radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.15),transparent_40%),radial-gradient(circle_at_center,hsl(var(--primary)/0.1),transparent_60%)]"
                                : isNovaMobile
                                  ? "bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_40%),radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.08),transparent_50%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.38)_48%,hsl(var(--background))_100%)]"
                                  : "bg-background"
      }`}
    >
      <div className="container px-4 md:px-6">
        <div
          className={`${compactCatalogPills ? "hidden " : ""}mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between ${variant === "editorial-categories" ? "md:mb-10" : variant === "catalog-pills" ? "md:mb-6" : ""}`}
        >
          <div className="space-y-2">
            {!(isVelaFashion && variant === "pastel-category-lane") && !hideBadge ? (
              <span
                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
                  isSoleaFemme
                    ? "border border-primary/10 bg-background/90 tracking-[0.24em] text-primary uppercase"
                    : isBiteRush
                      ? "bg-white text-[#dc2626] shadow-md"
                      : isCafeDemo
                        ? "bg-[#4b2e1f] text-[#f8eadf] shadow-md"
                        : isSmartBazaar
                          ? "border border-primary/12 bg-primary/5 tracking-[0.22em] text-primary uppercase"
                          : isElessiVariant
                            ? "border border-[#ead9cc] bg-white/92 tracking-[0.24em] text-[#8f5c44]"
                            : variant === "fragrance-ledger"
                              ? "border border-[#eadfd6] bg-white/92 tracking-[0.22em] text-[#7c4b33]"
                              : variant === "catalog-pills"
                                ? "border border-[#e5e7eb] bg-white tracking-[0.16em] text-[#6b7280]"
                                : variant === "retail-category-tiles"
                                  ? "border border-[#111111]/12 bg-[#fff7ed] tracking-[0.16em] text-[#8d5f3c]"
                                  : variant === "tech-decision-lanes"
                                    ? "border border-[#1f242c]/12 bg-[#1f242c] tracking-[0.22em] text-[#fff1b8] uppercase"
                                    : variant === "gallery-columns"
                                      ? "border-b border-[#d7ba86] bg-transparent px-0 tracking-[0.32em] text-[#7e694a] uppercase"
                                    : variant === "travel-postcards"
                                      ? "border border-[#decfbe] bg-white/92 tracking-[0.22em] text-[#87644c]"
                                      : variant === "legacy-circle-categories"
                                        ? "border border-[#111111]/12 bg-white tracking-[0.22em] text-[#111111]"
                                        : isFakhama
                                          ? "border border-primary/20 bg-primary/5 tracking-wider text-primary"
                                          : isKidsPlay
                                            ? "bg-accent/15 text-accent-foreground font-black"
                                            : isNovaMobile
                                              ? "border border-primary/20 bg-primary/8 tracking-[0.24em] text-primary uppercase"
                                              : "bg-secondary text-muted-foreground"
                }`}
              >
                {isSoleaFemme
                  ? variant === "occasion-ribbon"
                    ? "مسارات الستايل"
                    : "اختيارات الأحذية"
                  : isWomenFashion
                    ? variant === "occasion-ribbon"
                      ? "مسارات جاهزة"
                      : "اختيارات حريمي"
                    : variant === "gallery-columns"
                      ? theme.direction === "rtl"
                        ? "مجموعات التوقيع"
                        : "Signature edits"
                    : isPerfumeEg && variant === "fragrance-ledger"
                      ? "خريطة الروائح"
                      : isBiteRush
                        ? "مسارات سريعة"
                        : isCafeDemo
                          ? "ركنة اليوم"
                          : isSmartBazaar
                            ? "مسارات ذكية"
                            : variant === "elessi-digital-departments"
                              ? "أقسام الأجهزة"
                              : variant === "elessi-bag-categories"
                                ? "أقسام حسب الاستخدام"
                                : variant === "elessi-organic-routes"
                                  ? "مسارات الحصاد"
                                  : variant === "elessi-plant-categories"
                                    ? "مسارات النباتات"
                                    : variant === "elessi-bike-panels"
                                      ? "مسارات الركوب"
                                      : isElessiVariant
                                        ? "مسارات التسوق"
                                        : variant === "fragrance-ledger"
                                          ? "Fragrance routes"
                                          : variant === "catalog-pills"
                                            ? "Quick Departments"
                                            : variant ===
                                                "retail-category-tiles"
                                              ? "Retail Direct"
                                              : variant ===
                                                  "pastel-category-lane"
                                                ? "Pastel Routes"
                                                : variant ===
                                                    "tech-decision-lanes"
                                                  ? "Tech Lanes"
                                              : variant ===
                                                  "travel-postcards"
                                                ? "بطاقات الرحلة"
                                                    : variant ===
                                                        "legacy-circle-categories"
                                                      ? "Categories"
                                                      : isFakhama
                                                        ? "المجموعات الفاخرة"
                                                        : isKidsPlay
                                                          ? "✦ وقت المرح"
                                                          : isNovaMobile
                                                            ? "Techno Curation"
                                                            : theme.direction === "rtl"
                                                              ? "مجموعات مختارة"
                                                              : "Curated Collections"}
              </span>
            ) : null}
            <h2
              className={`text-2xl tracking-tight text-foreground md:text-3xl font-heading ${
                variant === "catalog-pills" ||
                variant === "retail-category-tiles"
                  ? "font-semibold"
                  : "font-black"
              }`}
            >
              {title}
            </h2>
            {!hideSubtitle ? (
              <p
                className={`max-w-2xl text-sm leading-7 md:text-base ${
                  variant === "catalog-pills" ||
                  variant === "retail-category-tiles"
                    ? "text-[#6b7280]"
                    : "text-muted-foreground"
                }`}
              >
                {subtitle}
              </p>
            ) : null}
          </div>

          {ctaHref && !hideSectionCta ? (
            <Link
              to={ctaHref}
              className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${
                isSoleaFemme
                  ? "border border-primary/12 bg-background/92 text-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                  : isBiteRush
                    ? "bg-[#171717] text-white shadow-[0_18px_44px_-26px_rgba(17,17,17,0.6)] hover:bg-[#dc2626]"
                    : isCafeDemo
                      ? "bg-[#4b2e1f] text-[#f8eadf] shadow-[0_18px_44px_-26px_rgba(75,46,31,0.42)] hover:bg-[#6f4a33]"
                      : isSmartBazaar
                        ? "bg-primary text-primary-foreground shadow-[0_18px_48px_-30px_hsl(var(--primary)/0.6)] hover:brightness-110"
                        : isElessiVariant
                          ? "border border-[#e7d8cb] bg-white text-[#6b4a3c] shadow-[0_18px_48px_-34px_rgba(91,57,40,0.18)] hover:border-[#c79f8b] hover:bg-[#fdf5ee]"
                          : variant === "catalog-pills"
                            ? "border border-[#e5e7eb] bg-white text-[#111827] shadow-[0_10px_24px_-22px_rgba(15,23,42,0.12)] hover:border-[#d1d5db] hover:bg-[#f8fafc]"
                            : variant === "retail-category-tiles"
                              ? "border border-[#111111] bg-white text-[#111111] shadow-[0_14px_26px_-20px_rgba(17,17,17,0.14)] hover:border-[#f59e0b] hover:bg-[#fff7ed]"
                              : variant === "tech-decision-lanes"
                                ? "bg-[#1f242c] text-[#fff4d1] shadow-[0_22px_56px_-34px_rgba(31,36,44,0.48)] hover:bg-[#10151d]"
                                : variant === "gallery-columns"
                                  ? "border-b border-[#1f1916] rounded-none bg-transparent px-0 py-0 text-[#1f1916] shadow-none hover:border-[#8a6a3c] hover:text-[#8a6a3c]"
                                : variant === "travel-postcards"
                                  ? "border border-[#decebf] bg-white text-[#4f3a2d] shadow-[0_18px_48px_-36px_rgba(96,72,52,0.24)] hover:border-[#bea489] hover:bg-[#fff8f0]"
                                  : variant === "legacy-circle-categories"
                                    ? "border border-[#111111] bg-white text-[#111111] hover:bg-[#111111] hover:text-white"
                                    : isFakhama
                                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105"
                                      : isKidsPlay
                                        ? "bg-secondary text-secondary-foreground shadow-[0_8px_20px_-6px_hsl(var(--secondary)/0.6)] hover:scale-105 active:scale-95"
                                        : "border border-border bg-background text-foreground hover:bg-muted"
              }`}
            >
              {ctaText}
            </Link>
          ) : null}
        </div>

        {isLoading && categories.length === 0 ? (
          <div
            className={`grid grid-cols-1 ${
              variant === "catalog-pills"
                ? "gap-3 sm:grid-cols-3 xl:grid-cols-6"
                : variant === "gallery-columns"
                  ? "gap-5 md:grid-cols-3"
                : variant === "fast-nav-grid"
                  ? "gap-4 sm:grid-cols-2 xl:grid-cols-4"
                  : variant === "tech-decision-lanes"
                    ? "gap-4 xl:grid-cols-2"
                    : "gap-5 sm:grid-cols-2 xl:grid-cols-3"
            }`}
          >
            {Array.from({ length: limit }).map((_, index) => (
              <div
                key={`collection-skeleton-${index}`}
                className="overflow-hidden rounded-[var(--radius)] border border-border bg-card animate-pulse"
              >
                <div className="aspect-[4/3] bg-muted" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-2/3 rounded bg-muted" />
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-4 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : variant === "elessi-bag-categories" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {collectionCards.map((collection, index) => (
              <Link
                key={collection.id}
                to={collection.href}
                className="group overflow-hidden border border-[#eadfd3] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#d6b79f] hover:shadow-[0_28px_62px_-48px_rgba(61,41,29,0.2)]"
              >
                <div className="relative aspect-[4/4.6] overflow-hidden bg-[linear-gradient(180deg,#f7ede3_0%,#fffaf5_100%)]">
                  <img
                    src={collection.image}
                    alt={collection.name}
                    loading="lazy"
                    width="420"
                    height="480"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,25,21,0.05)_0%,rgba(35,25,21,0.16)_100%)]" />
                  <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3">
                    <span className="inline-flex rounded-full bg-white/92 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#9a6d51] shadow-[0_12px_26px_-18px_rgba(61,41,29,0.18)]">
                      {index === 0
                        ? "يومي"
                        : index === 1
                          ? "سفر"
                          : index === 2
                            ? "هدايا"
                            : "إضافات"}
                    </span>
                  </div>
                </div>
                <div className="space-y-3 px-4 py-4 text-start md:px-5 md:py-5">
                  <h3 className="font-heading text-[1.45rem] font-semibold leading-tight text-[#231915]">
                    {collection.name}
                  </h3>
                  <p className="text-sm leading-7 text-[#6f5c53]">
                    {collection.description}
                  </p>
                  <div className="inline-flex items-center gap-2 text-sm font-bold text-[#a1623b]">
                    <span>
                      {theme.direction === "rtl"
                        ? "تصفح القسم"
                        : "Shop category"}
                    </span>
                    <span className="rtl:rotate-180">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : variant === "elessi-organic-routes" ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
            {collectionCards[0] ? (
              <Link
                to={collectionCards[0].href}
                className="group overflow-hidden border border-[#eadfcd] bg-[linear-gradient(180deg,#fffefb,#f8f2e9)] shadow-[0_28px_88px_-62px_rgba(45,59,39,0.18)]"
              >
                <div className="grid gap-0 md:grid-cols-[1.08fr_0.92fr]">
                  <div className="relative min-h-[18rem] overflow-hidden md:min-h-[24rem]">
                    <img
                      src={collectionCards[0].image}
                      alt={collectionCards[0].name}
                      loading="lazy"
                      width="760"
                      height="840"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(45,59,39,0.06)_0%,rgba(45,59,39,0.68)_100%)]" />
                    <div className="absolute inset-x-5 bottom-5 space-y-3 text-white">
                      <span className="inline-flex rounded-full border border-white/18 bg-white/10 px-3 py-1 text-[10px] font-black tracking-[0.22em] backdrop-blur">
                        البداية اليومية
                      </span>
                      <h3 className="font-heading text-[1.9rem] font-black leading-tight">
                        {collectionCards[0].name}
                      </h3>
                      <p className="max-w-md text-sm leading-7 text-white/84">
                        {collectionCards[0].description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-5 p-5 sm:p-6">
                    <div className="space-y-3">
                      <span className="inline-flex w-fit rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[10px] font-black tracking-[0.22em] text-[#8a6546]">
                        produce route
                      </span>
                      <h3 className="font-heading text-[1.75rem] font-black leading-tight text-[#2d3b27]">
                        ابدأ من الورقيات، الفاكهة، أو الصندوق الجاهز
                      </h3>
                      <p className="text-sm leading-7 text-[#67705e]">
                        دخول أقرب لروح السوق العضوي: صورة كبيرة، عنوان مباشر،
                        ومؤشرات واضحة تقود الطلب اليومي قبل الدخول إلى الشبكة
                        الكاملة.
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        "طلب أسبوعي",
                        "فاكهة الموسم",
                        "إضافات مطبخ",
                        "سلة أسرع",
                      ].map((item) => (
                        <div
                          key={item}
                          className="rounded-[1rem] border border-[#ebdfd0] bg-white/90 px-3 py-3 text-sm font-bold text-[#5c5348]"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {collectionCards.slice(1, 5).map((collection, index) => (
                <Link
                  key={collection.id}
                  to={collection.href}
                  className="group overflow-hidden border border-[#eadfcd] bg-white/96 shadow-[0_22px_64px_-54px_rgba(45,59,39,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_76px_-52px_rgba(45,59,39,0.18)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={collection.image}
                      alt={collection.name}
                      loading="lazy"
                      width="420"
                      height="320"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(45,59,39,0.04)_0%,rgba(45,59,39,0.56)_100%)]" />
                    <span className="absolute start-3 top-3 inline-flex rounded-full border border-white/18 bg-white/12 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-white backdrop-blur">
                      {index === 0
                        ? "fresh fruit"
                        : index === 1
                          ? "pantry"
                          : "family crates"}
                    </span>
                  </div>
                  <div className="space-y-2 p-4">
                    <h3 className="font-heading text-lg font-black text-[#2d3b27]">
                      {collection.name}
                    </h3>
                    <p className="line-clamp-2 text-sm leading-6 text-[#67705e]">
                      {collection.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : variant === "elessi-plant-categories" ? (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-3">
              {collectionCards.slice(0, 3).map((collection, index) => (
                <Link
                  key={collection.id}
                  to={collection.href}
                  className="group grid min-h-[15rem] overflow-hidden border border-[#eef2ec] bg-white transition-colors hover:border-[#cbd8c7]"
                >
                  <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-center gap-4 p-5">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#99a392]">
                        {index === 0
                          ? "Shop now"
                          : index === 1
                            ? "Plant route"
                            : "Discover"}
                      </p>
                      <h3 className="font-heading text-[1.5rem] font-black leading-tight text-[#203528]">
                        {collection.name}
                      </h3>
                      <p className="text-sm leading-7 text-[#5f7565]">
                        {collection.description}
                      </p>
                      <span className="inline-flex border-b border-[#203528] text-sm font-bold text-[#203528]">
                        Shop now
                      </span>
                    </div>
                    <div className="flex h-full items-center justify-center">
                      <img
                        src={collection.image}
                        alt={collection.name}
                        loading="lazy"
                        width="620"
                        height="520"
                        className="max-h-[13rem] w-full object-contain transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {collectionCards[3] ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7efe4] pt-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#99a392]">
                    Accessory route
                  </p>
                  <p className="text-sm font-bold text-[#203528]">
                    {collectionCards[3].name}
                  </p>
                </div>
                <Link
                  to={collectionCards[3].href}
                  className="inline-flex items-center rounded-full border border-[#d8e6d8] bg-white px-4 py-2 text-sm font-bold text-[#43604b] transition-colors hover:border-[#76b20d] hover:text-[#203528]"
                >
                  {collectionCards[3].description ||
                    "اكتشف الإضافات والأصص القريبة"}
                </Link>
              </div>
            ) : null}
          </div>
        ) : variant === "fragrance-ledger" ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            {collectionCards[0] ? (
              <Link
                to={collectionCards[0].href}
                className="group overflow-hidden rounded-[1.9rem] border border-[#eadfd6] bg-[linear-gradient(180deg,#fffefb,#f8f1ea)] shadow-[0_30px_90px_-68px_rgba(61,41,44,0.24)]"
              >
                <div className="relative min-h-[18rem] overflow-hidden">
                  <img
                    src={collectionCards[0].image}
                    alt={collectionCards[0].name}
                    loading="lazy"
                    width="760"
                    height="860"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(49,33,38,0.08)_0%,rgba(49,33,38,0.62)_100%)]" />
                  <div className="absolute inset-x-5 bottom-5 space-y-3 text-white">
                    <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black tracking-[0.22em] backdrop-blur">
                      البداية الأقرب
                    </span>
                    <h3 className="font-heading text-[1.85rem] font-black leading-tight">
                      {collectionCards[0].name}
                    </h3>
                    <p className="max-w-md text-sm leading-7 text-white/82">
                      {collectionCards[0].description}
                    </p>
                  </div>
                </div>
              </Link>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {collectionCards.slice(1).map((collection, index) => (
                <Link
                  key={collection.id}
                  to={collection.href}
                  className="group rounded-[1.5rem] border border-[#eadfd6] bg-white/95 p-4 shadow-[0_22px_70px_-58px_rgba(61,41,44,0.18)] transition-all hover:-translate-y-1 hover:shadow-[0_28px_84px_-56px_rgba(61,41,44,0.24)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex rounded-full border border-[#efe2d7] bg-[#fff8f3] px-3 py-1 text-[10px] font-black tracking-[0.2em] text-[#8a5b48]">
                      {`المسار ${index + 2}`}
                    </span>
                    <span className="text-sm font-black text-[#312126]">←</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <h3 className="font-heading text-xl font-black text-[#312126]">
                      {collection.name}
                    </h3>
                    <p className="text-sm leading-7 text-[#6e5a57]">
                      {collection.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : variant === "catalog-pills" ? (
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
            {collectionCards.map((collection) => (
              <Link
                key={collection.id}
                to={collection.href}
                className="inline-flex shrink-0 snap-start items-center rounded-full border border-[#e5e7eb] bg-white px-4 py-2.5 text-[13px] font-medium text-[#374151] shadow-[0_12px_28px_-24px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5 hover:border-[#111827] hover:bg-[#111827] hover:text-white sm:px-5 sm:py-3 sm:text-sm"
              >
                {collection.name}
              </Link>
            ))}
          </div>
        ) : variant === "pastel-category-lane" ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {collectionCards.map((collection) => (
              <Link
                key={collection.id}
                to={collection.href}
                className="group overflow-hidden rounded-[1rem] border border-[#ead8d0] bg-white shadow-[0_18px_40px_-34px_rgba(90,54,57,0.14)] transition-transform duration-300 hover:-translate-y-0.5"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-[#f8ede8]">
                  <img
                    {...getCollectionImageAttributes(collection.image, {
                      widths: [320, 480, 640, 800],
                      fallbackWidth: 640,
                      sizes: "(max-width: 767px) 92vw, (max-width: 1279px) 31vw, 24vw",
                      quality: 72,
                    })}
                    alt={collection.name}
                    loading="lazy"
                    width="720"
                    height="900"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(44,31,35,0.22))]" />
                </div>
                <div className="border-t border-[#ead8d0] bg-[#fff8f4] px-3 py-2.5 text-center">
                  <h3 className="text-sm font-black text-[#2c2426]">
                    {collection.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        ) : variant === "retail-category-tiles" ? (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {collectionCards.map((collection) => (
              <Link
                key={collection.id}
                to={collection.href}
                className="overflow-hidden rounded-[1.15rem] border-2 border-[#111111] bg-white shadow-[0_16px_38px_-28px_rgba(17,17,17,0.14)] transition-transform hover:-translate-y-0.5"
              >
                <div className="aspect-square overflow-hidden bg-[#f8f1e5]">
                  <img
                    src={collection.image}
                    alt={collection.name}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <div className="border-t border-[#111111] bg-[#fff1c7] px-3 py-2.5 text-center">
                  <p className="text-sm font-black text-[#111111]">
                    {collection.name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : variant === "elessi-merch-panels" ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            {collectionCards[0] ? (
              <Link
                to={collectionCards[0].href}
                className="group overflow-hidden rounded-[2rem] border border-[#ead8ca] bg-[linear-gradient(180deg,#fffefb,#f8eee4)] shadow-[0_34px_96px_-72px_rgba(91,57,40,0.28)]"
              >
                <div className="grid gap-0 md:grid-cols-[1.02fr_0.98fr]">
                  <div className="relative min-h-[18rem] overflow-hidden md:min-h-[24rem]">
                    <img
                      src={collectionCards[0].image}
                      alt={collectionCards[0].name}
                      loading="lazy"
                      width="760"
                      height="840"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(47,29,24,0.08)_0%,rgba(47,29,24,0.68)_100%)]" />
                    <div className="absolute inset-x-5 bottom-5 space-y-3 text-white">
                      <span className="inline-flex rounded-full border border-white/16 bg-white/10 px-3 py-1 text-[10px] font-black tracking-[0.22em] backdrop-blur">
                        البيع الأقرب
                      </span>
                      <h3 className="font-heading text-[1.9rem] font-black leading-tight">
                        {collectionCards[0].name}
                      </h3>
                      <p className="max-w-md text-sm leading-7 text-white/82">
                        {collectionCards[0].description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-5 p-5 sm:p-6">
                    <div className="space-y-3">
                      <span className="inline-flex w-fit rounded-full border border-[#ead8ca] bg-white px-3 py-1 text-[10px] font-black tracking-[0.22em] text-[#8f5c44]">
                        department 01
                      </span>
                      <h3 className="font-heading text-[1.75rem] font-black leading-tight text-[#2d211e]">
                        ابدئي من المسار الذي يبيع أسرع
                      </h3>
                      <p className="text-sm leading-7 text-[#6f5a54]">
                        صورة كبيرة، عنوان مباشر، وتلميحات واضحة تقود الزائر إلى
                        القسم قبل أن يغرق في الشبكة.
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        "اكتشاف أسرع",
                        "عروض أوضح",
                        "فئات جاهزة",
                        "سلة أكبر",
                      ].map((item) => (
                        <div
                          key={item}
                          className="rounded-[1rem] border border-[#ebddcf] bg-white/86 px-3 py-3 text-sm font-bold text-[#5e463f]"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {collectionCards.slice(1, 5).map((collection, index) => (
                <Link
                  key={collection.id}
                  to={collection.href}
                  className="group overflow-hidden rounded-[1.45rem] border border-[#ead8ca] bg-white/95 shadow-[0_22px_64px_-56px_rgba(91,57,40,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_76px_-54px_rgba(91,57,40,0.22)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={collection.image}
                      alt={collection.name}
                      loading="lazy"
                      width="420"
                      height="320"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(47,29,24,0.04)_0%,rgba(47,29,24,0.56)_100%)]" />
                    <span className="absolute start-3 top-3 inline-flex rounded-full border border-white/18 bg-white/14 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-white backdrop-blur">
                      {`0${index + 2}`}
                    </span>
                  </div>
                  <div className="space-y-2 p-4">
                    <h3 className="font-heading text-lg font-black text-[#2d211e]">
                      {collection.name}
                    </h3>
                    <p className="line-clamp-2 text-sm leading-6 text-[#6f5a54]">
                      {collection.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : variant === "elessi-pill-shelf" ? (
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 xl:grid-cols-4">
            {collectionCards.map((collection, index) => (
              <Link
                key={collection.id}
                to={collection.href}
                className="group inline-flex min-w-[16rem] shrink-0 items-center gap-3 rounded-[1.35rem] border border-[#ead8ca] bg-white/96 p-3 shadow-[0_20px_58px_-48px_rgba(91,57,40,0.16)] transition-all hover:-translate-y-0.5 hover:shadow-[0_28px_72px_-48px_rgba(91,57,40,0.22)] md:min-w-0"
              >
                <div className="relative h-16 w-16 overflow-hidden rounded-[1rem] border border-[#efe0d4] bg-[#f9f0e8]">
                  <img
                    src={collection.image}
                    alt={collection.name}
                    loading="lazy"
                    width="160"
                    height="160"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full bg-[#fff3eb] px-2.5 py-1 text-[10px] font-black tracking-[0.18em] text-[#9b6248]">
                      {`0${index + 1}`}
                    </span>
                    <h3 className="truncate text-sm font-black text-[#2d211e]">
                      {collection.name}
                    </h3>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#6f5a54]">
                    {collection.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
                ) : variant === "retail-category-tiles" ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:gap-6">
            {collectionCards.map((collection, index) => (
              <Link
                key={collection.id}
                to={collection.href}
                className="group relative flex flex-col overflow-hidden rounded-[1.25rem] border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_14px_34px_-24px_rgba(217,93,31,0.14)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-28px_rgba(217,93,31,0.22)]"
              >
                <div className="relative aspect-[4/4.2] overflow-hidden bg-[hsl(var(--muted)/0.4)]">
                  <img
                    src={collection.image}
                    alt={collection.name}
                    loading="lazy"
                    width="400"
                    height="420"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Decorative Gradient Overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,hsl(var(--card))_0%,transparent_100%)] p-4 pt-10" />
                  
                  {/* Badge */}
                  <div className="absolute start-4 bottom-4 z-10">
                    <span className="inline-flex rounded-full bg-[hsl(var(--primary))] px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-[hsl(var(--primary-foreground))] shadow-lg">
                      {index === 0 ? "الأكثر طلبًا" : `فئة 0${index + 1}`}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-5 text-right">
                  <h3 className="font-heading text-lg font-black text-[hsl(var(--foreground))]">
                    {collection.name}
                  </h3>
                  <p className="line-clamp-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                    {collection.description}
                  </p>
                  <div className="mt-4 flex items-center justify-end gap-2 text-[hsl(var(--primary))] opacity-0 transition-all duration-300 group-hover:opacity-100">
                    <span className="text-[11px] font-black uppercase tracking-wider">تصفح الآن</span>
                    <div className="h-1 w-4 rounded-full bg-[hsl(var(--primary))]" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : variant === "elessi-story-cards" ? (

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {collectionCards.map((collection, index) => (
              <Link
                key={collection.id}
                to={collection.href}
                className={`group overflow-hidden rounded-[1.75rem] border border-[#ead8ca] bg-[linear-gradient(180deg,#fffefb,#fbf3ec)] shadow-[0_28px_78px_-60px_rgba(91,57,40,0.18)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_34px_92px_-58px_rgba(91,57,40,0.24)] ${
                  index === 0 ? "md:col-span-2 xl:col-span-1" : ""
                }`}
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={collection.image}
                    alt={collection.name}
                    loading="lazy"
                    width="420"
                    height="320"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(47,29,24,0.08)_0%,rgba(47,29,24,0.6)_100%)]" />
                  <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3 text-white">
                    <span className="inline-flex rounded-full border border-white/18 bg-white/12 px-3 py-1 text-[10px] font-black tracking-[0.22em] backdrop-blur">
                      قصة اليوم
                    </span>
                    <span className="text-xs font-black">{`0${index + 1}`}</span>
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  <h3 className="font-heading text-xl font-black text-[#2d211e]">
                    {collection.name}
                  </h3>
                  <p className="text-sm leading-7 text-[#6f5a54]">
                    {collection.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      index === 0 ? "مدخل قوي" : "قرار أسرع",
                      index % 2 === 0 ? "صورة واضحة" : "عرض مرتب",
                    ].map((tag) => (
                      <span
                        key={`${collection.id}-${tag}`}
                        className="inline-flex rounded-full border border-[#eadccf] bg-white px-3 py-1.5 text-xs font-bold text-[#70574d]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : variant === "elessi-digital-departments" ? (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
              {collectionCards[0] ? (
                <Link
                  to={collectionCards[0].href}
                  className="group overflow-hidden border border-[#e4e9f0] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] shadow-[0_24px_74px_-58px_rgba(15,23,42,0.18)]"
                >
                  <div className="grid min-h-[18rem] gap-0 md:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
                    <div className="flex flex-col justify-center gap-4 px-5 py-5 md:px-6">
                      <span className="inline-flex w-fit border border-[#dce4ef] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#7a8595]">
                        Launch lane
                      </span>
                      <div className="space-y-2">
                        <h3 className="font-heading text-[1.55rem] font-black leading-tight text-[#161c26] md:text-[1.9rem]">
                          {collectionCards[0].name}
                        </h3>
                        <p className="text-sm leading-7 text-[#536172]">
                          {collectionCards[0].description}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {["Best value", "Top rated", "Work-ready"].map(
                          (item) => (
                            <span
                              key={item}
                              className="inline-flex items-center gap-2 border border-[#e4e9f0] bg-[#fbfcfe] px-3 py-1.5 text-[11px] font-bold text-[#516170]"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                              {item}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                    <div className="relative min-h-[16rem] overflow-hidden border-t border-[#e4e9f0] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(241,245,249,0.9)_58%,rgba(226,232,240,0.84))] md:min-h-full md:border-s md:border-t-0">
                      <img
                        src={collectionCards[0].image}
                        alt={collectionCards[0].name}
                        loading="lazy"
                        width="760"
                        height="680"
                        className="absolute inset-0 h-full w-full object-cover opacity-[0.18] transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-x-[16%] top-[12%] h-[58%] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.96),rgba(255,255,255,0.72)_52%,rgba(255,255,255,0)_80%)]" />
                      <div className="relative z-10 flex h-full items-end justify-center px-5 py-5">
                        <img
                          src={collectionCards[0].image}
                          alt=""
                          loading="lazy"
                          width="520"
                          height="520"
                          className="max-h-[14rem] w-full max-w-[18rem] object-contain drop-shadow-[0_24px_48px_rgba(15,23,42,0.16)] md:max-h-[18rem] md:max-w-[20rem]"
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              ) : null}

              <div className="grid gap-3">
                {collectionCards.slice(1, 3).map((collection, index) => (
                  <Link
                    key={collection.id}
                    to={collection.href}
                    className="group grid min-h-[11rem] overflow-hidden border border-[#e4e9f0] bg-white transition-colors hover:border-[#cbd5e1]"
                  >
                    <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-center gap-3 p-4">
                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7a8595]">
                          {index === 0 ? "Creator route" : "Desk setup"}
                        </p>
                        <h3 className="font-heading text-[1.3rem] font-black leading-tight text-[#161c26]">
                          {collection.name}
                        </h3>
                        <p className="text-sm leading-6 text-[#536172]">
                          {collection.description}
                        </p>
                      </div>
                      <div className="flex h-full items-center justify-center bg-[#f7f9fc] p-4">
                        <img
                          src={collection.image}
                          alt={collection.name}
                          loading="lazy"
                          width="420"
                          height="320"
                          className="max-h-[8.5rem] w-full object-contain transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[#e4e9f0] pt-4">
              {collectionCards.slice(0, 4).map((collection, index) => (
                <Link
                  key={`${collection.id}-chip`}
                  to={collection.href}
                  className="inline-flex items-center gap-2 border border-[#dce4ef] bg-white px-4 py-2 text-sm font-bold text-[#243042] transition-colors hover:border-[#f59e0b] hover:text-[#b45309]"
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7a8595]">
                    {`0${index + 1}`}
                  </span>
                  <span>{collection.name}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : variant === "elessi-bike-panels" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {collectionCards.slice(0, 4).map((collection, index) => (
              <Link
                key={collection.id}
                to={collection.href}
                className="group overflow-hidden border border-[#e3e7eb] bg-white transition-colors hover:border-[#c8d0d8]"
              >
                <div className="grid min-h-[16rem] gap-0 md:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
                  <div className="flex flex-col justify-center gap-4 px-5 py-5 md:px-6">
                    <span className="inline-flex w-fit rounded-full border border-[#e3e7eb] bg-[#f8fafb] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#687784]">
                      {index === 0
                        ? "City ride"
                        : index === 1
                          ? "Road lane"
                          : index === 2
                            ? "Gear up"
                            : "Workshop"}
                    </span>
                    <div className="space-y-2">
                      <h3 className="font-heading text-[1.45rem] font-bold leading-tight text-[#1d2a33]">
                        {collection.name}
                      </h3>
                      <p className="text-sm leading-7 text-[#60717f]">
                        {collection.description}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-[#1d2a33]">
                      <span>
                        {theme.direction === "rtl"
                          ? "تصفح القسم"
                          : "Shop category"}
                      </span>
                      <span className="rtl:rotate-180">→</span>
                    </span>
                  </div>
                  <div className="relative min-h-[14rem] overflow-hidden border-t border-[#e3e7eb] bg-[#f7f9fb] md:min-h-full md:border-s md:border-t-0">
                    <img
                      src={collection.image}
                      alt={collection.name}
                      loading="lazy"
                      width="620"
                      height="520"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : variant === "elessi-utility-cards" ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {collectionCards.map((collection, index) => (
              <Link
                key={collection.id}
                to={collection.href}
                className="group grid grid-cols-[6.2rem_minmax(0,1fr)] gap-4 rounded-[1.45rem] border border-[#ead8ca] bg-white/96 p-3 shadow-[0_20px_62px_-54px_rgba(91,57,40,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_80px_-52px_rgba(91,57,40,0.24)] sm:grid-cols-[6.8rem_minmax(0,1fr)]"
              >
                <div className="relative aspect-square overflow-hidden rounded-[1rem] border border-[#efe0d4] bg-[#f9f0e8]">
                  <img
                    src={collection.image}
                    alt={collection.name}
                    loading="lazy"
                    width="220"
                    height="220"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-[#fff3eb] px-2.5 py-1 text-[10px] font-black tracking-[0.18em] text-[#9b6248]">
                      {index === 0 ? "TOP" : `0${index + 1}`}
                    </span>
                    <h3 className="truncate font-heading text-lg font-black text-[#2d211e]">
                      {collection.name}
                    </h3>
                  </div>
                  <p className="line-clamp-2 text-sm leading-6 text-[#6f5a54]">
                    {collection.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["فلترة أسرع", "دخول مباشر"].map((item) => (
                      <span
                        key={`${collection.id}-${item}`}
                        className="inline-flex rounded-full border border-[#eadccf] bg-[#fffaf6] px-2.5 py-1 text-[11px] font-bold text-[#70574d]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : variant === "occasion-ribbon" && isWomenFashion ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
            {collectionCards[0] ? (
              <Link
                to={collectionCards[0].href}
                className="group relative overflow-hidden rounded-[1.9rem] border border-[#eadcd4] bg-[linear-gradient(180deg,#fffdfb,#fff7f1)] shadow-[0_30px_90px_-66px_rgba(76,42,44,0.26)]"
              >
                <div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
                  <div className="relative min-h-[17rem] overflow-hidden md:min-h-[22rem]">
                    <img
                      src={collectionCards[0].image}
                      alt={collectionCards[0].name}
                      loading="lazy"
                      width="720"
                      height="820"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(21,16,23,0.04)_0%,rgba(21,16,23,0.58)_100%)]" />
                    <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
                      <span className="inline-flex rounded-full bg-white/16 px-3 py-1 text-[10px] font-black tracking-[0.22em] text-white backdrop-blur-md">
                        المسار الأوضح
                      </span>
                      <span className="inline-flex rounded-full border border-white/18 bg-white/10 px-3 py-1 text-[10px] font-black text-white/88 backdrop-blur-md">
                        ابدئي من هنا
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-4 p-5 sm:p-6">
                    <div className="space-y-3">
                      <span className="inline-flex w-fit rounded-full border border-[#ecd8d3] bg-white px-3 py-1 text-[10px] font-black tracking-[0.22em] text-[#8b3d33]">
                        المسار 01
                      </span>
                      <h3 className="font-heading text-[1.8rem] font-black leading-tight text-foreground">
                        {collectionCards[0].name}
                      </h3>
                      <p className="text-sm leading-7 text-[#6c5860] md:text-base">
                        {collectionCards[0].description}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex rounded-full border border-[#eadcd4] bg-white px-3 py-1.5 text-xs font-bold text-[#5d4a52]">
                        صور حقيقية
                      </span>
                      <span className="inline-flex rounded-full border border-[#eadcd4] bg-white px-3 py-1.5 text-xs font-bold text-[#5d4a52]">
                        قرار أسرع
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-2 text-sm font-black text-primary">
                      افتحي هذا المسار
                      <span className="transition-transform duration-300 group-hover:-translate-x-1">
                        ←
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            ) : null}

              <div className="grid gap-3">
                {collectionCards.slice(1).map((collection, index) => (
                  <Link
                    key={collection.id}
                    to={collection.href}
                    className="group grid grid-cols-[6.25rem_minmax(0,1fr)] items-center gap-3 rounded-[1.45rem] border border-[#eadcd4] bg-white/92 p-3 shadow-[0_22px_58px_-52px_rgba(76,42,44,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_66px_-50px_rgba(76,42,44,0.2)] sm:grid-cols-[7rem_minmax(0,1fr)]"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-[1.1rem] border border-[#f0dfd6] bg-[#f9efe8]">
                      <img
                        src={collection.image}
                        alt={collection.name}
                        loading="lazy"
                        width="220"
                        height="220"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                    </div>

                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-[#fff1ec] px-2.5 py-1 text-[10px] font-black tracking-[0.18em] text-[#8b3d33]">
                          {`0${index + 2}`}
                        </span>
                        <span className="text-[10px] font-black tracking-[0.2em] text-[#8b3d33]">
                          {index === 0 ? 'لوك جاهز' : index === 1 ? 'حذاء مناسب' : 'خروجات أسهل'}
                        </span>
                      </div>
                      <h3 className="truncate font-heading text-lg font-black text-foreground">
                        {collection.name}
                      </h3>
                      <p className="line-clamp-2 text-sm leading-6 text-[#6c5860]">
                        {collection.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : variant === 'tech-decision-lanes' ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {collectionCards.map((collection, index) => {
                const laneMeta = resolveTechDecisionLaneMeta(collection, index);

                return (
                  <Link
                    key={collection.id}
                    to={collection.href}
                    className={`group overflow-hidden rounded-[1.95rem] border border-[#d9cba8] bg-[linear-gradient(180deg,#fffef9,#f6eddc)] p-4 shadow-[0_28px_90px_-64px_rgba(31,36,44,0.24)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_40px_110px_-68px_rgba(31,36,44,0.32)] ${
                      index === 0 ? 'xl:col-span-2' : ''
                    }`}
                  >
                    <div
                      className={`grid gap-4 ${
                        index === 0
                          ? 'lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-center'
                          : 'lg:grid-cols-[minmax(0,1fr)_15rem]'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full border border-[#1f242c]/10 bg-white/88 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-[#1f242c]">
                            {laneMeta.eyebrow}
                          </span>
                          <span className="inline-flex rounded-full bg-[#ffd400] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#1f242c]">
                            {laneMeta.routeLabel}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <h3 className="max-w-[16ch] font-heading text-[1.8rem] font-black tracking-tight text-[#1f242c] sm:text-[2rem]">
                            {collection.name}
                          </h3>
                          <p className="max-w-2xl text-sm leading-7 text-[#4c5563] md:text-base">
                            {collection.description}
                          </p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3">
                          {laneMeta.bullets.map((bullet) => (
                            <div
                              key={`${collection.id}-${bullet}`}
                              className="rounded-[1.1rem] border border-[#1f242c]/8 bg-white/78 px-3 py-3 shadow-[0_18px_36px_-34px_rgba(31,36,44,0.24)]"
                            >
                              <p className="text-[11px] font-black leading-5 text-[#1f242c]">
                                {bullet}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.3rem] border border-[#1f242c]/10 bg-[#1f242c] px-4 py-3 text-[#fff4d1] shadow-[0_24px_70px_-52px_rgba(31,36,44,0.82)]">
                          <p className="max-w-xl text-sm leading-6 text-[#fff4d1]/82">
                            {laneMeta.footer}
                          </p>
                          <span className="inline-flex items-center gap-2 text-sm font-black">
                            ادخل هذا المسار
                            <span className="transition-transform duration-300 group-hover:-translate-x-1">
                              ←
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="relative overflow-hidden rounded-[1.55rem] border border-[#1f242c]/12 bg-[#1f242c] shadow-[0_32px_80px_-58px_rgba(31,36,44,0.82)]">
                        <img
                          src={collection.image}
                          alt={collection.name}
                          loading="lazy"
                          width="520"
                          height="420"
                          className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05] ${
                            index === 0 ? 'aspect-[16/10]' : 'aspect-[4/5] lg:aspect-[5/6]'
                          }`}
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(31,36,44,0.04),rgba(31,36,44,0.74))]" />
                        <div className="absolute inset-x-4 bottom-4 rounded-[1.2rem] border border-white/10 bg-black/28 px-4 py-3 text-white backdrop-blur-md">
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ffd400]">
                            {index === 0 ? 'decision lane' : `lane 0${index + 1}`}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-white/76">
                            {laneMeta.bullets[0]}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : variant === 'legacy-circle-categories' ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4 md:gap-x-8">
              {collectionCards.slice(0, 4).map((collection, index) => (
                <Link
                  key={collection.id}
                  to={collection.href}
                  className="group flex flex-col items-center text-center"
                >
                  <div className="relative w-full max-w-[11rem] overflow-hidden rounded-full border border-[#111111]/10 bg-[#f6f6f6] shadow-[0_18px_46px_-36px_rgba(17,17,17,0.22)]">
                    <img
                      src={collection.image}
                      alt={collection.name}
                      loading="lazy"
                      width="360"
                      height="360"
                      className="aspect-square h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                    />
                  </div>
                  <div className="mt-4 space-y-1">
                    <h3 className="text-[0.98rem] font-semibold tracking-tight text-[#111111] md:text-[1.08rem]">
                      {collection.name}
                    </h3>
                    {!hideCardDescriptions ? (
                      <p className="mx-auto max-w-[14rem] text-xs leading-6 text-[#6a6a6a] md:text-sm">
                        {collection.description}
                      </p>
                    ) : null}
                  </div>
                  {!hideCardCtas ? (
                    <span className="mt-3 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#111111]">
                      {index === 0 ? 'Shop now' : 'View more'}
                      <span className="transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
        ) : variant === "gallery-columns" ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-7">
            {collectionCards.slice(0, 3).map((collection, index) => (
              <Link
                key={collection.id}
                to={collection.href}
                className="group block"
              >
                <div className="relative overflow-hidden bg-[#ebe2d8] shadow-[0_26px_60px_-52px_rgba(63,42,29,0.32)]">
                  <img
                    {...getCollectionImageAttributes(collection.image, {
                      widths: [320, 480, 640, 800],
                      fallbackWidth: 640,
                      sizes: "(max-width: 767px) 92vw, (max-width: 1279px) 31vw, 24vw",
                      quality: 72,
                    })}
                    alt={collection.name}
                    loading="lazy"
                    width="720"
                    height="960"
                    className="aspect-[3/4] h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(19,20,19,0.02),rgba(19,20,19,0.14))]" />
                </div>

                <div className="space-y-3 px-1 pb-1 pt-5 text-center">
                  <span className="inline-flex border-b border-[#d7ba86] pb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8b7452]">
                    {index === 0
                      ? "Runway"
                      : index === 1
                        ? "Everyday"
                        : "Craft"}
                  </span>
                  <h3 className="font-heading text-[1.45rem] font-semibold tracking-tight text-[#1f1916]">
                    {collection.name}
                  </h3>
                  <p className="mx-auto max-w-[18rem] text-sm leading-7 text-[#6c5e54]">
                    {collection.description}
                  </p>
                  <span className="inline-flex items-center gap-2 border-b border-[#1f1916] pb-1 text-sm font-semibold text-[#1f1916] transition-colors group-hover:border-[#8a6a3c] group-hover:text-[#8a6a3c]">
                    {theme.direction === "rtl" ? "ادخلي المجموعة" : "Enter collection"}
                    <span aria-hidden="true">←</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : variant === "gallery-columns" ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-7">
            {collectionCards.slice(0, 3).map((collection, index) => (
              <Link
                key={collection.id}
                to={collection.href}
                className="group block"
              >
                <div className="relative overflow-hidden bg-[#ebe2d8] shadow-[0_26px_60px_-52px_rgba(63,42,29,0.32)]">
                  <img
                    src={collection.image}
                    alt={collection.name}
                    loading="lazy"
                    width="720"
                    height="960"
                    className="aspect-[3/4] h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(19,20,19,0.02),rgba(19,20,19,0.14))]" />
                </div>

                <div className="space-y-3 px-1 pb-1 pt-5 text-center">
                  <span className="inline-flex border-b border-[#d7ba86] pb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8b7452]">
                    {index === 0
                      ? "Runway"
                      : index === 1
                        ? "Everyday"
                        : "Craft"}
                  </span>
                  <h3 className="font-heading text-[1.45rem] font-semibold tracking-tight text-[#1f1916]">
                    {collection.name}
                  </h3>
                  <p className="mx-auto max-w-[18rem] text-sm leading-7 text-[#6c5e54]">
                    {collection.description}
                  </p>
                  <span className="inline-flex items-center gap-2 border-b border-[#1f1916] pb-1 text-sm font-semibold text-[#1f1916] transition-colors group-hover:border-[#8a6a3c] group-hover:text-[#8a6a3c]">
                    {theme.direction === "rtl" ? "ادخلي المجموعة" : "Enter collection"}
                    <span aria-hidden="true">←</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : variant === "travel-postcards" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {collectionCards.map((collection, index) => {
              const travelMeta = resolveTravelPostcardMeta(index);

              return (
                <Link
                  key={collection.id}
                  to={collection.href}
                  className={`group overflow-hidden rounded-[1.75rem] border border-[#dfcfbf] bg-[linear-gradient(135deg,#fffdfb_0%,#f7efe5_100%)] p-4 shadow-[0_28px_86px_-64px_rgba(96,72,52,0.26)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_36px_102px_-60px_rgba(96,72,52,0.3)] ${
                    index === 0 ? "xl:col-span-2" : ""
                  }`}
                >
                  <div
                    className={`grid gap-4 ${
                      index === 0
                        ? "lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-center"
                        : "sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center"
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full border border-[#e6d7c8] bg-white/94 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#8b654d]">
                          {travelMeta.stamp}
                        </span>
                        <span className="inline-flex rounded-full bg-[#1f3a36] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#f6ead9]">
                          {travelMeta.routeLabel}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <h3 className="font-heading text-[1.7rem] font-black tracking-tight text-[#2f251f] sm:text-[1.9rem]">
                          {collection.name}
                        </h3>
                        <p className="max-w-2xl text-sm leading-7 text-[#6e5a4c] md:text-base">
                          {collection.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full border border-[#e6d7c8] bg-[#fffaf4] px-3 py-1 text-xs font-bold text-[#5b4638]">
                          {travelMeta.packingNote}
                        </span>
                        <span className="inline-flex rounded-full border border-[#d7cabd] bg-white px-3 py-1 text-xs font-bold text-[#8b654d]">
                          {index === 0 ? "ابدئي من هذا الخط" : "مسار جاهز"}
                        </span>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        {travelMeta.bullets.map((bullet) => (
                          <div
                            key={`${collection.id}-${bullet}`}
                            className="rounded-[1.1rem] border border-[#eadccf] bg-white/88 px-3 py-3 shadow-[0_14px_34px_-30px_rgba(96,72,52,0.18)]"
                          >
                            <p className="text-[11px] font-black leading-5 text-[#3f3128]">
                              {bullet}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-[1.25rem] border border-[#d9cabd] bg-[#fff9f2] px-4 py-3">
                        <p className="text-sm leading-6 text-[#5f4a3d]">
                          {travelMeta.footer}
                        </p>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-[1.45rem] border border-white/70 bg-[#eadfd3] shadow-[0_22px_60px_-46px_rgba(96,72,52,0.26)]">
                      <img
                        src={collection.image}
                        alt={collection.name}
                        loading="lazy"
                        width="620"
                        height="720"
                        className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] ${
                          index === 0 ? "aspect-[16/11]" : "aspect-[4/5]"
                        }`}
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,20,20,0.02),rgba(18,20,20,0.52))]" />
                      <div className="absolute inset-x-4 bottom-4 rounded-[1.15rem] border border-white/18 bg-black/28 px-4 py-3 text-white backdrop-blur-md">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f6ddba]">
                          {index === 0
                            ? "travel postcard"
                            : `route 0${index + 1}`}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white/78">
                          {travelMeta.bullets[0]}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : variant === "occasion-ribbon" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {collectionCards.map((collection, index) => (
              <Link
                key={collection.id}
                to={collection.href}
                className={`group overflow-hidden rounded-[1.65rem] border border-[#eadcd4] bg-[linear-gradient(180deg,#fffdfb,#fff7f1)] p-4 shadow-[0_28px_90px_-66px_rgba(76,42,44,0.26)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_36px_100px_-62px_rgba(76,42,44,0.3)] ${
                  index === 0 ? "xl:col-span-2" : ""
                }`}
              >
                <div
                  className={`grid gap-4 ${
                    index === 0
                      ? "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center"
                      : "sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full border border-[#eed9ce] bg-white/92 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#8f4d41]">
                        {index === 0 ? "الأقرب للطلب" : `مسار ${index + 1}`}
                      </span>
                      <span className="inline-flex rounded-full bg-[#241d24] px-3 py-1 text-[11px] font-black text-white">
                        {index === 0
                          ? "من أول نظرة"
                          : index % 2 === 0
                            ? "مقاسات أوضح"
                            : "لون ولوك"}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-heading text-[1.55rem] font-black tracking-tight text-foreground sm:text-[1.7rem]">
                        {collection.name}
                      </h3>
                      <p className="max-w-2xl text-sm leading-7 text-[#6c5860] md:text-base">
                        {collection.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex rounded-full border border-[#eadcd4] bg-white px-3 py-1.5 text-xs font-bold text-[#5d4a52]">
                        {index === 0 ? "صور حقيقية" : "ترشيح سريع"}
                      </span>
                      <span className="inline-flex rounded-full border border-[#eadcd4] bg-white px-3 py-1.5 text-xs font-bold text-[#5d4a52]">
                        {index === 0 ? "سعر أوضح" : "اختيار أنعم"}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-2 text-sm font-black text-primary">
                      افتحي هذا المسار
                      <span className="transition-transform duration-300 group-hover:-translate-x-1">
                        ←
                      </span>
                    </span>
                  </div>

                  <div className="relative overflow-hidden rounded-[1.4rem] border border-[#f0dfd6] bg-[#f9efe8] shadow-[0_20px_50px_-38px_rgba(76,42,44,0.24)]">
                    <img
                      src={collection.image}
                      alt={collection.name}
                      loading="lazy"
                      width="520"
                      height="420"
                      className={`w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] ${
                        index === 0
                          ? "aspect-[16/10]"
                          : "aspect-[4/5] sm:aspect-[5/4]"
                      }`}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(23,17,23,0.76))] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-white/88">
                          {theme.direction === "rtl"
                            ? index === 0
                              ? "حسب المناسبة"
                              : "جاهزة للتصفح"
                            : index === 0
                              ? "Shop by occasion"
                              : "Ready to browse"}
                        </span>
                        <span className="rounded-full bg-white/16 px-3 py-1 text-[11px] font-black text-white backdrop-blur-md">
                          {index === 0 ? "أسرع طريق" : "دخول مباشر"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : isDistrictMarket && variant === "fast-nav-grid" ? (
          <div className="grid grid-cols-1 overflow-hidden rounded-[1.8rem] border border-primary/10 bg-card shadow-[0_24px_72px_-58px_hsl(var(--primary)/0.28)] xl:grid-cols-2">
            {collectionCards.map((collection, index) => (
              <Link
                key={collection.id}
                to={collection.href}
                className={resolveDistrictMarketCellClass(
                  index,
                  collectionCards.length,
                )}
              >
                <div className="relative min-h-[8.75rem] overflow-hidden rounded-[1.35rem] border border-[#ead8cb] bg-[linear-gradient(180deg,#fffbf6,#f3e6d9)] shadow-[0_18px_40px_-30px_rgba(61,37,25,0.22)] sm:min-h-[10.5rem]">
                  <img
                    src={collection.image}
                    alt={collection.name}
                    loading="lazy"
                    width="280"
                    height="220"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                  />
                </div>
                <div className="min-w-0 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex text-[11px] font-black uppercase tracking-[0.22em] text-primary">
                      {`المسار 0${index + 1}`}
                    </span>
                    <span className="text-[11px] font-black text-foreground/62">
                      {index === 0
                        ? "ابدأ من هنا"
                        : index === 1
                          ? "للاحتياج اليومي"
                          : index === 2
                            ? "حسم أسرع"
                            : "تجديد خفيف"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-heading text-[1.35rem] font-black tracking-tight text-foreground sm:text-[1.5rem]">
                      {collection.name}
                    </h3>
                    <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                      {collection.description}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm leading-6 text-foreground/76">
                    <div className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/70" />
                      <span>
                        {resolveDistrictMarketLaneNote(collection, index)}
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-2 text-sm font-black text-primary">
                    ادخل هذا المسار
                    <span className="text-base transition-transform duration-300 group-hover:-translate-x-1">
                      ←
                    </span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div
            className={`grid grid-cols-1 ${variant === "fast-nav-grid" ? "gap-4 sm:grid-cols-2 xl:grid-cols-4" : "gap-5 sm:grid-cols-2 xl:grid-cols-3"}`}
          >
            {collectionCards.map((collection, index) => (
              <Link
                key={collection.id}
                to={collection.href}
                className={`group overflow-hidden rounded-[var(--radius)] transition-all duration-300 hover:-translate-y-1 ${
                  isSoleaFemme
                    ? `border border-primary/10 bg-card/90 shadow-[0_28px_80px_-50px_hsl(var(--primary)/0.7)] ${
                        index === 0 ? "xl:col-span-2" : ""
                      }`
                    : isBiteRush
                      ? `border-2 border-white bg-white shadow-[0_26px_70px_-34px_rgba(17,17,17,0.14)] hover:shadow-[0_34px_90px_-42px_rgba(17,17,17,0.18)] ${
                          index === 0 ? "xl:col-span-2" : ""
                        }`
                      : isCafeDemo
                        ? `border border-[#e7d6c5] bg-[linear-gradient(180deg,#fffdfa_0%,#fff5ea_100%)] shadow-[0_26px_72px_-40px_rgba(75,46,31,0.18)] hover:shadow-[0_36px_92px_-46px_rgba(75,46,31,0.24)] ${
                            index === 0 ? "xl:col-span-2" : ""
                          }`
                        : isKidsPlay || variant === "floating-bubbles"
                          ? `border-0 bg-transparent shadow-none hover:translate-y-0 ${
                              variant === "floating-bubbles"
                                ? "flex flex-col items-center"
                                : ""
                            }`
                          : isSmartBazaar
                            ? `border border-primary/10 bg-card shadow-[0_24px_80px_-58px_hsl(var(--primary)/0.45)] hover:shadow-[0_30px_90px_-54px_hsl(var(--primary)/0.55)] ${
                                variant === "fast-nav-grid"
                                  ? ""
                                  : index === 0
                                    ? "xl:col-span-2"
                                    : ""
                              }`
                            : isFakhama
                              ? "border border-primary/10 bg-card/60 backdrop-blur-md shadow-sm hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/20"
                              : isKidsPlay
                                ? "border-2 border-secondary/20 bg-card shadow-[0_20px_40px_-20px_rgba(0,0,0,0.1)] hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.15)] hover:border-secondary/40"
                                : "border border-border bg-card hover:shadow-xl hover:shadow-primary/10"
                }`}
              >
                {variant === "floating-bubbles" ? (
                  <div className="flex flex-col items-center gap-6 py-6 transition-all duration-500 group-hover:scale-105">
                    <div className="relative">
                      {/* Main Bubble */}
                      <div className="relative z-10 h-52 w-52 overflow-hidden rounded-full border-[8px] border-white bg-secondary/20 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] group-hover:shadow-[0_45px_100px_-20px_rgba(0,0,0,0.3)] dark:border-slate-700 transition-all duration-500 group-hover:border-primary">
                        <img
                          src={collection.image}
                          alt={collection.name}
                          className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-125"
                        />
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      </div>

                      {/* Floating Accessory Bubbles - Enhanced with animations */}
                      <div className="absolute -end-4 -top-4 z-20 flex h-16 w-16 animate-bounce-subtle items-center justify-center rounded-full border-4 border-white bg-primary text-primary-foreground shadow-2xl dark:border-slate-800 transition-transform duration-500 group-hover:scale-110">
                        <span className="text-2xl">✨</span>
                      </div>
                      <div
                        className="absolute -bottom-3 -start-3 z-20 flex h-14 w-14 animate-bounce-subtle items-center justify-center rounded-full border-4 border-white bg-accent text-accent-foreground shadow-2xl dark:border-slate-800 transition-transform duration-500 group-hover:scale-110"
                        style={{ animationDelay: "0.3s" }}
                      >
                        <span className="text-base font-black">
                          0{index + 1}
                        </span>
                      </div>

                      {/* Orbiting dots */}
                      <div className="absolute inset-[-20%] animate-spin-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div className="absolute top-0 left-1/2 h-4 w-4 rounded-full bg-secondary shadow-lg blur-[1px]" />
                        <div className="absolute bottom-0 left-1/2 h-3 w-3 rounded-full bg-accent shadow-lg blur-[1px]" />
                      </div>
                    </div>

                    <div className="space-y-2 text-center px-4">
                      <h3 className="text-xl font-black text-foreground font-heading">
                        {collection.name}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
                        {collection.description}
                      </p>
                      <div className="pt-2">
                        <span className="inline-flex rounded-full bg-secondary/50 px-4 py-1.5 text-xs font-black text-secondary-foreground shadow-inner group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          اكتشف الآن
                        </span>
                      </div>
                    </div>
                  </div>
                ) : isSmartBazaar &&
                  isSmartBazaarThemeAssetImage(collection.image) ? (
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <SmartBazaarCategoryScene
                      sceneKey={resolveSmartBazaarSceneKey(
                        `${collection.slug || ""} ${collection.name}`,
                        index,
                      )}
                    />
                  </div>
                ) : (
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={collection.image}
                      alt={collection.name}
                      loading="lazy"
                      width="400"
                      height="300"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div
                      className={`absolute inset-0 ${
                        isSoleaFemme
                          ? "bg-[linear-gradient(180deg,transparent_5%,rgba(20,14,11,0.12)_40%,rgba(20,14,11,0.72)_100%)]"
                          : isBiteRush
                            ? "bg-[linear-gradient(180deg,rgba(23,23,23,0.02),rgba(23,23,23,0.18)_40%,rgba(23,23,23,0.78)_100%)]"
                            : isCafeDemo
                              ? "bg-[linear-gradient(180deg,rgba(34,24,18,0.02),rgba(34,24,18,0.16)_42%,rgba(34,24,18,0.74)_100%)]"
                              : isSmartBazaar
                                ? "bg-[linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.12)_36%,rgba(15,23,42,0.72)_100%)]"
                                : "bg-gradient-to-t from-black/45 via-black/10 to-transparent"
                      }`}
                    />
                    <div
                      className={`absolute start-4 top-4 inline-flex rounded-full px-3 py-1 text-[11px] font-black tracking-[0.22em] uppercase backdrop-blur ${
                        isBiteRush
                          ? "border border-white/20 bg-[#171717]/78 text-orange-200"
                          : isSmartBazaar
                            ? "border border-white/15 bg-foreground/80 text-background"
                            : "border border-white/25 bg-background/88 text-primary"
                      }`}
                    >
                      {isBiteRush
                        ? index === 0
                          ? "المسار الساخن"
                          : `مسار 0${index + 1}`
                        : isCafeDemo
                          ? index === 0
                            ? "ترشيح الباريستا"
                            : `تحضير 0${index + 1}`
                          : isSmartBazaar
                            ? index === 0
                              ? "الأكثر طلبًا"
                              : `قسم 0${index + 1}`
                            : index === 0
                              ? theme.direction === "rtl"
                                ? "الأقرب لاحتياجك"
                                : "Best Match"
                              : `0${index + 1}`}
                    </div>
                    {!isAtelierNova ? (
                      <div
                        className={`absolute bottom-4 start-4 inline-flex rounded-full px-3 py-1 text-xs font-bold text-foreground backdrop-blur ${
                          isBiteRush
                            ? "bg-white/95 text-[#171717]"
                            : isSmartBazaar
                              ? "bg-background/92"
                              : "bg-background/90"
                        }`}
                      >
                        {collection.name}
                      </div>
                    ) : null}
                  </div>
                )}
                {variant !== "floating-bubbles" && (
                  <div
                    className={`space-y-2 p-5 ${isSoleaFemme ? "md:p-6" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-black text-foreground font-heading">
                        {collection.name}
                      </h3>
                      {isSoleaFemme ? (
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                          {collection.slug || collection.id}
                        </span>
                      ) : isBiteRush ? (
                        <span className="rounded-full bg-[#fff1ea] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#dc2626]">
                          اختيار سريع
                        </span>
                      ) : isCafeDemo ? (
                        <span className="rounded-full bg-[#f4e4d6] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#6f4a33]">
                          توصية الباريستا
                        </span>
                      ) : isSmartBazaar ? (
                        <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-accent-foreground">
                          طلبات مرتبة
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {collection.description}
                    </p>
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <span
                        className={`inline-flex text-sm font-bold ${
                          isBiteRush
                            ? "text-[#dc2626]"
                            : isCafeDemo
                              ? "text-[#6f4a33]"
                              : "text-primary"
                        }`}
                      >
                        {isBiteRush
                          ? "افتح القسم"
                          : isCafeDemo
                            ? "تسوق القسم"
                            : theme.direction === "rtl"
                              ? "شاهد منتجات القسم"
                              : "Shop the collection"}
                      </span>
                      {isSoleaFemme ? (
                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                          تنسيق Solea
                        </span>
                      ) : isBiteRush ? (
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-[#171717]/55">
                          0{index + 1}
                        </span>
                      ) : isCafeDemo ? (
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-[#6f4a33]/70">
                          دفعة اليوم
                        </span>
                      ) : isSmartBazaar ? (
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                          مقارنة أسهل
                        </span>
                      ) : null}
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedCollections;
