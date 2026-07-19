import type { Product } from "../hooks/useProducts";

type MarketplacePreviewProductReviewRecord = {
  id: string;
  author: string;
  date: string;
  createdAt: string;
  rating: number;
  title?: string;
  comment: string;
  verified: boolean;
  helpfulCount: number;
};

type MarketplacePreviewProductReviewsResponse = {
  reviews: MarketplacePreviewProductReviewRecord[];
  totalCount: number;
  averageRating: number;
  ratingDistribution: Array<{
    rating: number;
    count: number;
  }>;
  summary: {
    averageRating: number;
    ratingDistribution: Array<{
      rating: number;
      count: number;
    }>;
  };
};

const buildMarketplacePreviewReviewsResponse = (
  reviews: MarketplacePreviewProductReviewRecord[],
): MarketplacePreviewProductReviewsResponse => {
  const totalCount = reviews.length;
  const averageRating =
    totalCount > 0
      ? reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) /
        totalCount
      : 0;
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter(
      (review) => Math.round(Number(review.rating) || 0) === rating,
    ).length,
  }));

  return {
    reviews,
    totalCount,
    averageRating,
    ratingDistribution,
    summary: {
      averageRating,
      ratingDistribution,
    },
  };
};

const buildLuxuryImage = (photoId: string, width = 1200) =>
  `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&q=80`;

const elegantLuxeImages = {
  dressHero: buildLuxuryImage("1496747611176-843222e1e57c"),
  editorialHero: buildLuxuryImage("1483985988355-763728e1935b"),
  heelHero: buildLuxuryImage("1515347619252-60a4bf4fff4f"),
  bagHero: buildLuxuryImage("1745284300322-1789f1718463"),
  bagStreet: buildLuxuryImage("1758817863246-8b7e43b1daea"),
  scarfHero: buildLuxuryImage("1771695873003-198db44671bd"),
  scarfStudio: buildLuxuryImage("1760975979242-dcdaafdb8f49"),
  scarfPortrait: buildLuxuryImage("1771978537603-1a8283bdab89"),
  satinDetail: buildLuxuryImage("1606259458027-54d2a728b6ab"),
} as const;

const elegantLuxeCategories = {
  dresses: {
    id: "luxury-dresses",
    name: "فساتين فاخرة",
    slug: "luxury-dresses",
    image: buildLuxuryImage("1496747611176-843222e1e57c", 1400),
    description: "فساتين افتتاحية للمساءات الخاصة والظهور الأول الواثق.",
  },
  sets: {
    id: "luxury-sets",
    name: "أطقم فاخرة",
    slug: "luxury-sets",
    image: buildLuxuryImage("1483985988355-763728e1935b", 1400),
    description: "أطقم متكاملة تختصر قرار التنسيق من أول نظرة.",
  },
  heels: {
    id: "luxury-heels",
    name: "أحذية السهرة",
    slug: "luxury-heels",
    image: buildLuxuryImage("1515347619252-60a4bf4fff4f", 1400),
    description: "كعوب مناسبات ثابتة تختم الإطلالة قبل أن تسرقها.",
  },
  bags: {
    id: "luxury-bags",
    name: "حقائب فاخرة",
    slug: "luxury-bags",
    image: buildLuxuryImage("1745284300322-1789f1718463", 1400),
    description: "حقائب منظمة تحمل الشكل النهائي للوك وتبقيه حادًا.",
  },
  scarves: {
    id: "luxury-scarves",
    name: "أوشحة فاخرة",
    slug: "luxury-scarves",
    image: buildLuxuryImage("1771695873003-198db44671bd", 1400),
    description: "أوشحة خفيفة تعمل كهدية ولمسة ختام لا تزاحم القطعة الأساسية.",
  },
} as const;

const ELEGANT_LUXE_GALLERIES = {
  "elegant-luxe-satin-signature-dress": [
    elegantLuxeImages.dressHero,
    elegantLuxeImages.satinDetail,
    elegantLuxeImages.editorialHero,
    elegantLuxeImages.scarfStudio,
  ],
  "elegant-luxe-lumi-evening-set": [
    elegantLuxeImages.editorialHero,
    elegantLuxeImages.dressHero,
    elegantLuxeImages.satinDetail,
    elegantLuxeImages.bagHero,
  ],
  "elegant-luxe-crystal-line-heel": [
    elegantLuxeImages.heelHero,
    buildLuxuryImage("1543163521-1bf539c55dd2"),
    buildLuxuryImage("1559334418-672d5a48531b"),
    buildLuxuryImage("1554062097-69c634085c6d"),
  ],
  "elegant-luxe-structured-class-bag": [
    elegantLuxeImages.bagHero,
    elegantLuxeImages.bagStreet,
    elegantLuxeImages.editorialHero,
    elegantLuxeImages.satinDetail,
  ],
  "elegant-luxe-night-silk-wrap": [
    elegantLuxeImages.scarfHero,
    elegantLuxeImages.scarfStudio,
    elegantLuxeImages.scarfPortrait,
    elegantLuxeImages.satinDetail,
  ],
} as const;

const buildColorVariants = (
  productId: string,
  skuPrefix: string,
  options: Array<{
    code: string;
    label: string;
    image: string;
    price?: number;
    comparePrice?: number;
    stock: number;
  }>,
  basePrice: number,
  baseComparePrice: number,
) =>
  options.map((option) => ({
    id: `${productId}-${option.code}`,
    name: option.label,
    price: option.price ?? basePrice,
    comparePrice: option.comparePrice ?? baseComparePrice,
    sku: `${skuPrefix}-${option.code.toUpperCase()}`,
    image: option.image,
    stock: option.stock,
    attributes: {
      اللون: option.label,
    },
    attributeValues: {
      اللون: option.label,
    },
  }));

const buildColorSizeVariants = (
  productId: string,
  skuPrefix: string,
  options: Array<{
    code: string;
    label: string;
    image: string;
    stockBase: number;
    price?: number;
    comparePrice?: number;
  }>,
  sizes: string[],
  basePrice: number,
  baseComparePrice: number,
) =>
  options.flatMap((option, optionIndex) =>
    sizes.map((size, sizeIndex) => ({
      id: `${productId}-${option.code}-size-${size}`,
      name: `${option.label} / ${size}`,
      price: option.price ?? basePrice,
      comparePrice: option.comparePrice ?? baseComparePrice,
      sku: `${skuPrefix}-${option.code.toUpperCase()}-${size}`,
      image: option.image,
      stock: Math.max(2, option.stockBase - sizeIndex - optionIndex),
      attributes: {
        اللون: option.label,
        المقاس: size,
      },
      attributeValues: {
        اللون: option.label,
        المقاس: size,
      },
    })),
  );

const buildElegantLuxeProduct = ({
  id,
  slug,
  name,
  description,
  categoryKey,
  price,
  comparePrice,
  stock,
  tags = [],
  variants = [],
  rating,
  reviewCount,
  relatedProductIds = [],
  bundleProductIds = [],
  editorialBadge,
  editorialNote,
  fitNote,
  stylingNote,
  careNote,
  styleWith = [],
  boutiqueFacts = [],
  boutiqueProofs = [],
}: {
  id: keyof typeof ELEGANT_LUXE_GALLERIES;
  slug: string;
  name: string;
  description: string;
  categoryKey: keyof typeof elegantLuxeCategories;
  price: number;
  comparePrice: number;
  stock: number;
  tags?: string[];
  variants?: Array<Record<string, unknown>>;
  rating: number;
  reviewCount: number;
  relatedProductIds?: string[];
  bundleProductIds?: string[];
  editorialBadge: string;
  editorialNote: string;
  fitNote: string;
  stylingNote: string;
  careNote: string;
  styleWith?: string[];
  boutiqueFacts?: Array<{ label: string; value: string }>;
  boutiqueProofs?: Array<{
    label: string;
    title: string;
    description: string;
  }>;
}): Product => {
  const category = elegantLuxeCategories[categoryKey];
  const images = ELEGANT_LUXE_GALLERIES[id];

  return {
    id,
    slug,
    name,
    description,
    price,
    comparePrice,
    images,
    mainImage: images[0],
    categoryId: category.id,
    category: category as Product["category"],
    tags,
    stock,
    rating,
    reviewCount,
    editorialBadge,
    editorialNote,
    fitNote,
    stylingNote,
    careNote,
    styleWith,
    boutiqueFacts,
    boutiqueProofs,
    relatedProductIds,
    bundleProductIds,
    productVariants: variants,
    variants,
    createdAt: "2026-04-27T12:00:00.000Z",
  };
};

const SATIN_SIGNATURE_VARIANTS = buildColorSizeVariants(
  "elegant-luxe-satin-signature-dress",
  "EL-SATIN-SIGNATURE",
  [
    {
      code: "ivory",
      label: "أوف وايت",
      image: ELEGANT_LUXE_GALLERIES["elegant-luxe-satin-signature-dress"][0],
      stockBase: 8,
    },
    {
      code: "plum",
      label: "برقوقي داكن",
      image: ELEGANT_LUXE_GALLERIES["elegant-luxe-satin-signature-dress"][2],
      stockBase: 6,
    },
  ],
  ["S", "M", "L"],
  3990,
  4589,
);

const LUMI_EVENING_SET_VARIANTS = buildColorSizeVariants(
  "elegant-luxe-lumi-evening-set",
  "EL-LUMI-SET",
  [
    {
      code: "pearl",
      label: "أوف وايت",
      image: ELEGANT_LUXE_GALLERIES["elegant-luxe-lumi-evening-set"][0],
      stockBase: 7,
    },
    {
      code: "smoke",
      label: "رمادي لؤلؤي",
      image: ELEGANT_LUXE_GALLERIES["elegant-luxe-lumi-evening-set"][1],
      stockBase: 5,
    },
  ],
  ["S", "M", "L"],
  4290,
  4934,
);

const CRYSTAL_LINE_HEEL_VARIANTS = buildColorSizeVariants(
  "elegant-luxe-crystal-line-heel",
  "EL-CRYSTAL-HEEL",
  [
    {
      code: "pearl",
      label: "أبيض لؤلؤي",
      image: ELEGANT_LUXE_GALLERIES["elegant-luxe-crystal-line-heel"][0],
      stockBase: 7,
    },
    {
      code: "onyx",
      label: "أسود لامع",
      image: ELEGANT_LUXE_GALLERIES["elegant-luxe-crystal-line-heel"][1],
      stockBase: 5,
      price: 3290,
      comparePrice: 3779,
    },
  ],
  ["37", "38", "39"],
  3190,
  3668,
);

const STRUCTURED_CLASS_BAG_VARIANTS = buildColorVariants(
  "elegant-luxe-structured-class-bag",
  "EL-STRUCTURED-BAG",
  [
    {
      code: "cream",
      label: "كريمي مطفي",
      image: ELEGANT_LUXE_GALLERIES["elegant-luxe-structured-class-bag"][0],
      stock: 5,
    },
    {
      code: "espresso",
      label: "بني إسبريسو",
      image: ELEGANT_LUXE_GALLERIES["elegant-luxe-structured-class-bag"][1],
      stock: 4,
      price: 2990,
      comparePrice: 3439,
    },
  ],
  2890,
  3323,
);

const NIGHT_SILK_WRAP_VARIANTS = buildColorVariants(
  "elegant-luxe-night-silk-wrap",
  "EL-SILK-WRAP",
  [
    {
      code: "pearl-print",
      label: "عاجي هادئ",
      image: ELEGANT_LUXE_GALLERIES["elegant-luxe-night-silk-wrap"][0],
      stock: 9,
    },
    {
      code: "plum-print",
      label: "برقوقي مطبوع",
      image: ELEGANT_LUXE_GALLERIES["elegant-luxe-night-silk-wrap"][1],
      stock: 7,
      price: 1040,
      comparePrice: 1196,
    },
  ],
  980,
  1127,
);

export const ELEGANT_LUXE_PRODUCTS: Product[] = [
  buildElegantLuxeProduct({
    id: "elegant-luxe-satin-signature-dress",
    slug: "elegant-luxe-satin-signature-dress",
    name: "فستان ساتان سيجنتشر",
    description:
      "فستان افتتاحي بخط طويل ولمعة هادئة ينجح مع السهرات الخاصة وصور الدعوات من غير صخب بصري زائد.",
    categoryKey: "dresses",
    price: 3990,
    comparePrice: 4589,
    stock: 7,
    tags: ["ساتان", "مناسبة", "سهرة"],
    variants: SATIN_SIGNATURE_VARIANTS,
    rating: 4.9,
    reviewCount: 18,
    relatedProductIds: [
      "elegant-luxe-lumi-evening-set",
      "elegant-luxe-structured-class-bag",
      "elegant-luxe-night-silk-wrap",
    ],
    bundleProductIds: [
      "elegant-luxe-structured-class-bag",
      "elegant-luxe-night-silk-wrap",
    ],
    editorialBadge: "افتتاح الجلسة",
    editorialNote: "قطعة تفتح اللوك من أول نظرة وتبقي القرار سهلًا حولها.",
    fitNote: "سقوط مستقيم مع خصر هادئ وقماش لا يلتصق بالجسم.",
    stylingNote: "يُحسم سريعًا مع حقيبة منظمة وكعب خفيف ووشاح مطوي.",
    careNote: "تنظيف لطيف أو غسيل بارد مع تعليق مباشر للحفاظ على لمعته.",
    styleWith: ["حقيبة ستراكشر", "وشاح حرير", "كعب كريستال لاين"],
    boutiqueFacts: [
      { label: "القصّة", value: "خط طويل بانسياب هادئ" },
      { label: "اللمعة", value: "ساتان مطفي غير مبالغ فيه" },
      { label: "الاستخدام", value: "عشاء خاص ومناسبات مسائية" },
      { label: "القرار", value: "قطعة تقود اللوك بدل أن تنتظر تنسيقه" },
    ],
    boutiqueProofs: [
      {
        label: "لماذا ينجح",
        title: "يفتح اللوك من دون حاجة إلى طبقات كثيرة",
        description: "يكفيه كعب واضح وحقيبة منظمة حتى يبقى المشهد مرتبًا ومقنعًا.",
      },
      {
        label: "في الصور",
        title: "القماش يقرأ بوضوح في اللقطات القريبة",
        description: "النسيج اللامع الهادئ يعطي حضورًا أغنى من الفساتين المسطحة بصريًا.",
      },
    ],
  }),
  buildElegantLuxeProduct({
    id: "elegant-luxe-lumi-evening-set",
    slug: "elegant-luxe-lumi-evening-set",
    name: "طقم لومي",
    description:
      "طقم مسائي متماسك يختصر قرار التنسيق لمن تريد حضورًا واضحًا من دون بناء لوك من الصفر.",
    categoryKey: "sets",
    price: 4290,
    comparePrice: 4934,
    stock: 6,
    tags: ["طقم", "مناسبات", "جلسات"],
    variants: LUMI_EVENING_SET_VARIANTS,
    rating: 4.8,
    reviewCount: 14,
    relatedProductIds: [
      "elegant-luxe-satin-signature-dress",
      "elegant-luxe-crystal-line-heel",
      "elegant-luxe-structured-class-bag",
    ],
    bundleProductIds: [
      "elegant-luxe-crystal-line-heel",
      "elegant-luxe-structured-class-bag",
    ],
    editorialBadge: "إطلالة مكتملة",
    editorialNote: "حل سريع حين تكونين بحاجة إلى لوك كامل لا إلى قطعة منفردة.",
    fitNote: "توازن مريح بين الجزء العلوي والحركة في الأسفل.",
    stylingNote: "الأفضل تركه يقود المشهد مع حقيبة صلبة وإكسسوار خفيف فقط.",
    careNote: "غسيل بارد للقطعتين معًا للحفاظ على التجانس اللوني والملمس.",
    styleWith: ["كعب كريستال لاين", "حقيبة ستراكشر"],
    boutiqueFacts: [
      { label: "الفكرة", value: "طقم كامل للحسم السريع" },
      { label: "الملمس", value: "نعومة واضحة مع وزن متوسط" },
      { label: "الوقت", value: "مساء ودعوات خاصة" },
      { label: "التنسيق", value: "يحتاج فقط حقيبة وكعبًا خفيفًا" },
    ],
    boutiqueProofs: [
      {
        label: "ميزة مهمة",
        title: "يخفض تردد الحسم قبل المناسبة",
        description: "بدل البحث عن قطعة عليا وسفلية منفصلتين، يأتي الطقم كقرار جاهز.",
      },
      {
        label: "في اللبس",
        title: "الصورة متوازنة حتى مع إكسسوارات قليلة",
        description: "لا يحتاج إلى بناء طويل أو طبقات دفاعية حتى يظهر مرتبًا.",
      },
    ],
  }),
  buildElegantLuxeProduct({
    id: "elegant-luxe-crystal-line-heel",
    slug: "elegant-luxe-crystal-line-heel",
    name: "كعب كريستال لاين",
    description:
      "كعب سهرة ثابت نسبيًا مع خط مرصع خفيف يرفع القطعة الأساسية بدل أن ينافسها.",
    categoryKey: "heels",
    price: 3190,
    comparePrice: 3668,
    stock: 8,
    tags: ["كعب", "كريستال", "سهرة"],
    variants: CRYSTAL_LINE_HEEL_VARIANTS,
    rating: 4.7,
    reviewCount: 11,
    relatedProductIds: [
      "elegant-luxe-satin-signature-dress",
      "elegant-luxe-lumi-evening-set",
      "elegant-luxe-night-silk-wrap",
    ],
    bundleProductIds: [
      "elegant-luxe-satin-signature-dress",
      "elegant-luxe-structured-class-bag",
    ],
    editorialBadge: "الخطوة اللامعة",
    editorialNote: "كعب يكمّل الحضور ولا يحوله إلى استعراض مبالغ فيه.",
    fitNote: "مقدمة ثابتة نسبيًا وارتفاع مناسب للجلوس والحركة القصيرة.",
    stylingNote: "يتماسك أفضل مع فستان صافٍ أو طقم مسائي وخط إكسسوار واحد.",
    careNote: "يحفظ داخل كيسه ويُنظف الكريستال بقطعة جافة ناعمة.",
    styleWith: ["فستان ساتان سيجنتشر", "طقم لومي", "حقيبة ستراكشر"],
    boutiqueFacts: [
      { label: "الارتفاع", value: "ملائم للمناسبات لا للعرض فقط" },
      { label: "التفصيلة", value: "خط مرصع خفيف على المقدمة" },
      { label: "الدور", value: "ختم الإطلالة قبل الحقيبة" },
      { label: "الاختيار", value: "أفضل مع القطع طويلة الخط" },
    ],
    boutiqueProofs: [
      {
        label: "قرار عملي",
        title: "لا يحتاج إلى لوك صاخب ليظهر",
        description: "يلتقط الضوء من غير أن يسرق كل المشهد من القطعة الأساسية.",
      },
      {
        label: "في الاستخدام",
        title: "أهدأ من الكعوب شديدة الزخرفة",
        description: "يحافظ على الفخامة من غير أن يدخل اللوك في منطقة المبالغة.",
      },
    ],
  }),
  buildElegantLuxeProduct({
    id: "elegant-luxe-structured-class-bag",
    slug: "elegant-luxe-structured-class-bag",
    name: "حقيبة ستراكشر",
    description:
      "حقيبة منظمة بحجم متوسط تحفظ شكل الإطلالة وتغلق الفراغ بين القطعة الأساسية والحذاء.",
    categoryKey: "bags",
    price: 2890,
    comparePrice: 3323,
    stock: 5,
    tags: ["حقيبة", "منظمة", "رسمي"],
    variants: STRUCTURED_CLASS_BAG_VARIANTS,
    rating: 4.8,
    reviewCount: 9,
    relatedProductIds: [
      "elegant-luxe-satin-signature-dress",
      "elegant-luxe-lumi-evening-set",
      "elegant-luxe-night-silk-wrap",
    ],
    bundleProductIds: [
      "elegant-luxe-satin-signature-dress",
      "elegant-luxe-crystal-line-heel",
    ],
    editorialBadge: "ختم اللوك",
    editorialNote: "الحقيبة التي تحفظ صرامة الصورة عندما تكون القطعة الرئيسية ناعمة جدًا.",
    fitNote: "حجم متوسط لا يبتلع اللوك ولا يضيع داخل اليد.",
    stylingNote: "الأفضل مع فساتين ناعمة أو أطقم ذات خطوط نظيفة.",
    careNote: "تمسح بقطعة قطنية جافة وتحفظ محشوة للحفاظ على بنية الحقيبة.",
    styleWith: ["فستان ساتان سيجنتشر", "كعب كريستال لاين"],
    boutiqueFacts: [
      { label: "الحجم", value: "متوسط ومناسب للمناسبات" },
      { label: "البنية", value: "صلبة نسبيًا وتحفظ الشكل" },
      { label: "الدور", value: "تربط بين الفستان والكعب" },
      { label: "الاختيار", value: "بديل أقوى من الحقائب المترهلة مع السهرة" },
    ],
    boutiqueProofs: [
      {
        label: "في الصورة",
        title: "الحواف الواضحة تشد الإطلالة للأعلى",
        description: "مفيدة خصوصًا مع القطع الساتان أو القماش المنساب الذي يحتاج نقطة صلبة.",
      },
      {
        label: "في الاستخدام",
        title: "تحمل الضروري من دون أن تبدو يومية",
        description: "تكفي للموبايل والبطاقة والأحمر الأساسي من دون تضخيم بصري.",
      },
    ],
  }),
  buildElegantLuxeProduct({
    id: "elegant-luxe-night-silk-wrap",
    slug: "elegant-luxe-night-silk-wrap",
    name: "وشاح حرير",
    description:
      "وشاح حريري خفيف يضيف حركة صغيرة إلى القطعة الأساسية ويعمل كهدية فاخرة سهلة الحسم.",
    categoryKey: "scarves",
    price: 980,
    comparePrice: 1127,
    stock: 9,
    tags: ["وشاح", "حرير", "هدية"],
    variants: NIGHT_SILK_WRAP_VARIANTS,
    rating: 4.9,
    reviewCount: 12,
    relatedProductIds: [
      "elegant-luxe-structured-class-bag",
      "elegant-luxe-satin-signature-dress",
      "elegant-luxe-lumi-evening-set",
    ],
    bundleProductIds: [
      "elegant-luxe-structured-class-bag",
      "elegant-luxe-satin-signature-dress",
    ],
    editorialBadge: "لمسة الختام",
    editorialNote: "تفصيلة صغيرة تنقذ الإطلالة حين تحتاج حركة لا قطعة جديدة كاملة.",
    fitNote: "وزن خفيف يسمح بربطه على الرقبة أو اليد أو مقبض الحقيبة.",
    stylingNote: "الأفضل كلمسة أخيرة مع حقيبة صلبة أو فستان هادئ اللون.",
    careNote: "غسيل يدوي بارد وتجفيف مسطح للحفاظ على نعومة الحواف.",
    styleWith: ["حقيبة ستراكشر", "فستان ساتان سيجنتشر"],
    boutiqueFacts: [
      { label: "الاستخدام", value: "إكسسوار أو هدية" },
      { label: "الإحساس", value: "حرير خفيف بحركة واضحة" },
      { label: "الدور", value: "إغلاق اللوك أو إحياءه" },
      { label: "الحسم", value: "قطعة منخفضة التردد قبل الدفع" },
    ],
    boutiqueProofs: [
      {
        label: "هدية مناسبة",
        title: "سهل الإهداء لأن المقاس غير معقد",
        description: "يعطي حضورًا فاخرًا من دون حاجة إلى تخمين مقاسات أو قصّات.",
      },
      {
        label: "في التنسيق",
        title: "يزيد الحركة من غير أن يضيف ثقلًا",
        description: "يفيد عندما يكون اللوك هادئًا ويحتاج فقط نقطة حياة أخف.",
      },
    ],
  }),
];

export const ELEGANT_LUXE_RECOMMENDATIONS = {
  related: {
    "elegant-luxe-satin-signature-dress": [
      "elegant-luxe-lumi-evening-set",
      "elegant-luxe-structured-class-bag",
      "elegant-luxe-night-silk-wrap",
    ],
    "elegant-luxe-lumi-evening-set": [
      "elegant-luxe-satin-signature-dress",
      "elegant-luxe-crystal-line-heel",
      "elegant-luxe-structured-class-bag",
    ],
    "elegant-luxe-crystal-line-heel": [
      "elegant-luxe-satin-signature-dress",
      "elegant-luxe-lumi-evening-set",
      "elegant-luxe-night-silk-wrap",
    ],
    "elegant-luxe-structured-class-bag": [
      "elegant-luxe-satin-signature-dress",
      "elegant-luxe-lumi-evening-set",
      "elegant-luxe-night-silk-wrap",
    ],
    "elegant-luxe-night-silk-wrap": [
      "elegant-luxe-structured-class-bag",
      "elegant-luxe-satin-signature-dress",
      "elegant-luxe-lumi-evening-set",
    ],
  },
  boughtTogether: {
    "elegant-luxe-satin-signature-dress": [
      "elegant-luxe-structured-class-bag",
      "elegant-luxe-night-silk-wrap",
      "elegant-luxe-crystal-line-heel",
    ],
    "elegant-luxe-lumi-evening-set": [
      "elegant-luxe-crystal-line-heel",
      "elegant-luxe-structured-class-bag",
      "elegant-luxe-night-silk-wrap",
    ],
    "elegant-luxe-crystal-line-heel": [
      "elegant-luxe-satin-signature-dress",
      "elegant-luxe-structured-class-bag",
    ],
    "elegant-luxe-structured-class-bag": [
      "elegant-luxe-satin-signature-dress",
      "elegant-luxe-night-silk-wrap",
    ],
  },
} as const;

export const ELEGANT_LUXE_REVIEWS: Record<
  string,
  MarketplacePreviewProductReviewsResponse
> = {
  "elegant-luxe-satin-signature-dress": buildMarketplacePreviewReviewsResponse([
    {
      id: "elegant-luxe-satin-signature-dress-review-1",
      author: "داليا سامح",
      date: "2026-04-18",
      createdAt: "2026-04-18",
      rating: 5,
      title: "الفستان حضوره راقٍ فعلًا",
      comment:
        "اللمعة كانت هادئة جدًا والقصة طلعت مرتبة على الجسم، وفي الصور شكله أفخم من كثير من القطع المشابهة.",
      verified: true,
      helpfulCount: 11,
    },
    {
      id: "elegant-luxe-satin-signature-dress-review-2",
      author: "نادين عاطف",
      date: "2026-04-23",
      createdAt: "2026-04-23",
      rating: 4,
      title: "المقاس واضح والخامة مريحة",
      comment:
        "أحببت أن التفاصيل لم تكن مبالغًا فيها، والمقاس جاء دقيقًا مع انسياب جيد في الحركة.",
      verified: true,
      helpfulCount: 6,
    },
  ]),
  "elegant-luxe-lumi-evening-set": buildMarketplacePreviewReviewsResponse([
    {
      id: "elegant-luxe-lumi-evening-set-review-1",
      author: "ملك إيهاب",
      date: "2026-04-17",
      createdAt: "2026-04-17",
      rating: 5,
      title: "حل جاهز للمناسبة",
      comment:
        "اشتريته لأنني لم أرد تنسيق اللوك من الصفر، والنتيجة كانت أسهل وأرقى من المتوقع.",
      verified: true,
      helpfulCount: 8,
    },
    {
      id: "elegant-luxe-lumi-evening-set-review-2",
      author: "سلمى حاتم",
      date: "2026-04-22",
      createdAt: "2026-04-22",
      rating: 4,
      title: "متوازن ومريح",
      comment:
        "الطقم فعليًا متماسك جدًا، ولم أحتج إلا حقيبة وكعب بسيطين حتى اكتمل المشهد.",
      verified: true,
      helpfulCount: 5,
    },
  ]),
  "elegant-luxe-crystal-line-heel": buildMarketplacePreviewReviewsResponse([
    {
      id: "elegant-luxe-crystal-line-heel-review-1",
      author: "جنى شريف",
      date: "2026-04-16",
      createdAt: "2026-04-16",
      rating: 5,
      title: "أنيق من غير مبالغة",
      comment:
        "التفصيلة اللامعة كانت كافية جدًا، ولم أشعر أنه يسرق الإطلالة من الفستان.",
      verified: true,
      helpfulCount: 7,
    },
    {
      id: "elegant-luxe-crystal-line-heel-review-2",
      author: "ياسمين خالد",
      date: "2026-04-21",
      createdAt: "2026-04-21",
      rating: 4,
      title: "مريح أكثر مما توقعت",
      comment:
        "مناسب للحركة القصيرة والحفل، وثباته أفضل من كثير من كعوب السهرة الخفيفة.",
      verified: true,
      helpfulCount: 4,
    },
  ]),
  "elegant-luxe-structured-class-bag": buildMarketplacePreviewReviewsResponse([
    {
      id: "elegant-luxe-structured-class-bag-review-1",
      author: "رنا نبيل",
      date: "2026-04-20",
      createdAt: "2026-04-20",
      rating: 5,
      title: "أغلقت اللوك فعلًا",
      comment:
        "الحقيبة رتبت شكل الإطلالة جدًا، وحجمها مناسب من غير أن تتحول إلى حقيبة يومية عادية.",
      verified: true,
      helpfulCount: 6,
    },
    {
      id: "elegant-luxe-structured-class-bag-review-2",
      author: "مها فؤاد",
      date: "2026-04-24",
      createdAt: "2026-04-24",
      rating: 4,
      title: "الخامة شكلها نظيف",
      comment:
        "استفدت جدًا من الصور القريبة لأنها بينت الحواف والبنية الصلبة بوضوح قبل الشراء.",
      verified: true,
      helpfulCount: 3,
    },
  ]),
  "elegant-luxe-night-silk-wrap": buildMarketplacePreviewReviewsResponse([
    {
      id: "elegant-luxe-night-silk-wrap-review-1",
      author: "بسمة هشام",
      date: "2026-04-15",
      createdAt: "2026-04-15",
      rating: 5,
      title: "هدية موفقة جدًا",
      comment:
        "قطعة سهلة في الإهداء لأن المقاس ليس مشكلة، والخامة فعليًا ناعمة وتعطي انطباعًا فاخرًا.",
      verified: true,
      helpfulCount: 5,
    },
    {
      id: "elegant-luxe-night-silk-wrap-review-2",
      author: "ليلى أسامة",
      date: "2026-04-19",
      createdAt: "2026-04-19",
      rating: 4,
      title: "تفصيلة تكمل اللوك",
      comment:
        "استعملته مع الحقيبة بدل الرقبة وفعليًا أعطى حركة لطيفة جدًا من غير ما يثقل الإطلالة.",
      verified: true,
      helpfulCount: 2,
    },
  ]),
};
