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

const buildFashionImage = (photoId: string) =>
  `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=1200&q=80`;

const boutiqueCategories = {
  dresses: { id: "dresses", name: "فساتين", slug: "dresses" },
  tops: { id: "tops", name: "بلوزات وقمصان", slug: "tops" },
  layers: { id: "layers", name: "جاكيتات وتريكو", slug: "layers" },
  accessories: { id: "accessories", name: "إكسسوارات", slug: "accessories" },
};

const BOUTIQUE_GALLERIES = {
  "rose-midi-dress": [
    buildFashionImage("1496747611176-843222e1e57c"),
    buildFashionImage("1487412720507-e7ab37603c6f"),
    buildFashionImage("1483985988355-763728e1935b"),
    buildFashionImage("1515886657613-9f3515b0c78f"),
  ],
  "ivory-pleat-dress": [
    buildFashionImage("1483985988355-763728e1935b"),
    buildFashionImage("1496747611176-843222e1e57c"),
    buildFashionImage("1529139574466-a303027c1d8b"),
    buildFashionImage("1487412720507-e7ab37603c6f"),
  ],
  "blush-knit-top": [
    buildFashionImage("1529139574466-a303027c1d8b"),
    buildFashionImage("1515886657613-9f3515b0c78f"),
    buildFashionImage("1487412720507-e7ab37603c6f"),
    buildFashionImage("1496747611176-843222e1e57c"),
  ],
  "pearl-straight-shirt": [
    buildFashionImage("1487412720507-e7ab37603c6f"),
    buildFashionImage("1515886657613-9f3515b0c78f"),
    buildFashionImage("1529139574466-a303027c1d8b"),
    buildFashionImage("1483985988355-763728e1935b"),
  ],
  "softline-cardigan": [
    buildFashionImage("1529139574466-a303027c1d8b"),
    buildFashionImage("1487412720507-e7ab37603c6f"),
    buildFashionImage("1496747611176-843222e1e57c"),
    buildFashionImage("1483985988355-763728e1935b"),
  ],
  "tailored-cream-blazer": [
    buildFashionImage("1515886657613-9f3515b0c78f"),
    buildFashionImage("1529139574466-a303027c1d8b"),
    buildFashionImage("1496747611176-843222e1e57c"),
    buildFashionImage("1487412720507-e7ab37603c6f"),
  ],
  "arc-mini-bag": [
    buildFashionImage("1551232864-3f0890e580d9"),
    buildFashionImage("1496747611176-843222e1e57c"),
    buildFashionImage("1487412720507-e7ab37603c6f"),
    buildFashionImage("1515886657613-9f3515b0c78f"),
  ],
  "silk-ribbon-scarf": [
    buildFashionImage("1483985988355-763728e1935b"),
    buildFashionImage("1551232864-3f0890e580d9"),
    buildFashionImage("1496747611176-843222e1e57c"),
    buildFashionImage("1487412720507-e7ab37603c6f"),
  ],
} as const;

const buildSizeVariants = (
  productId: string,
  skuPrefix: string,
  sizes: Array<{
    code: string;
    label: string;
    price: number;
    comparePrice: number;
    image: string;
    stock: number;
  }>,
) =>
  sizes.map((size) => ({
    id: `${productId}-${size.code}`,
    name: size.label,
    price: size.price,
    comparePrice: size.comparePrice,
    sku: `${skuPrefix}-${size.code.toUpperCase()}`,
    image: size.image,
    stock: size.stock,
    attributes: {
      "المقاس": size.label,
    },
    attributeValues: {
      "المقاس": size.label,
    },
  }));

const buildColorVariants = (
  productId: string,
  skuPrefix: string,
  colors: Array<{
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
  colors.map((color) => ({
    id: `${productId}-${color.code}`,
    name: color.label,
    price: color.price ?? basePrice,
    comparePrice: color.comparePrice ?? baseComparePrice,
    sku: `${skuPrefix}-${color.code.toUpperCase()}`,
    image: color.image,
    stock: color.stock,
    attributes: {
      "اللون": color.label,
    },
    attributeValues: {
      "اللون": color.label,
    },
  }));

const buildColorSizeVariants = (
  productId: string,
  skuPrefix: string,
  colors: Array<{
    code: string;
    label: string;
    image: string;
    price?: number;
    comparePrice?: number;
  }>,
  basePrice: number,
  baseComparePrice: number,
  sizes: string[],
) =>
  colors.flatMap((color, colorIndex) =>
    sizes.map((size, sizeIndex) => ({
      id: `${productId}-${color.code}-size-${size}`,
      name: `${color.label} / ${size}`,
      price: color.price ?? basePrice,
      comparePrice: color.comparePrice ?? baseComparePrice,
      sku: `${skuPrefix}-${color.code.toUpperCase()}-${size}`,
      image: color.image,
      stock: Math.max(2, 10 - colorIndex * 2 - sizeIndex),
      attributes: {
        "اللون": color.label,
        "المقاس": size,
      },
      attributeValues: {
        "اللون": color.label,
        "المقاس": size,
      },
    })),
  );

const buildBoutiqueProduct = ({
  id,
  slug,
  name,
  description,
  categoryKey,
  price,
  comparePrice,
  tags = [],
  relatedProductIds = [],
  bundleProductIds = [],
  variants = [],
  stock,
  volumeDiscounts,
  editorialBadge,
  editorialNote,
  fitNote,
  stylingNote,
  careNote,
  styleWith = [],
  boutiqueFacts = [],
  boutiqueProofs = [],
}: {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryKey: keyof typeof boutiqueCategories;
  price: number;
  comparePrice?: number;
  tags?: string[];
  relatedProductIds?: string[];
  bundleProductIds?: string[];
  variants?: Array<Record<string, unknown>>;
  stock?: number;
  volumeDiscounts?: Array<Record<string, unknown>>;
  editorialBadge?: string;
  editorialNote?: string;
  fitNote?: string;
  stylingNote?: string;
  careNote?: string;
  styleWith?: string[];
  boutiqueFacts?: Array<{ label: string; value: string }>;
  boutiqueProofs?: Array<{
    label: string;
    title: string;
    description: string;
  }>;
}): Product => {
  const category = boutiqueCategories[categoryKey];
  const images = BOUTIQUE_GALLERIES[id as keyof typeof BOUTIQUE_GALLERIES] || [];

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
    category: {
      id: category.id,
      name: category.name,
    },
    tags,
    stock: stock ?? 10,
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
    volumeDiscounts,
    createdAt: "2026-04-26T12:00:00.000Z",
  };
};

const ROSE_MIDI_VARIANTS = buildColorSizeVariants(
  "rose-midi-dress",
  "RB-ROSE-DRESS",
  [
    {
      code: "rose-smoke",
      label: "وردي دخاني",
      image: BOUTIQUE_GALLERIES["rose-midi-dress"][0],
    },
    {
      code: "dusty-cream",
      label: "كريمي هادئ",
      image: BOUTIQUE_GALLERIES["rose-midi-dress"][1],
    },
  ],
  2190,
  2590,
  ["S", "M", "L", "XL"],
);

const IVORY_PLEAT_VARIANTS = buildSizeVariants(
  "ivory-pleat-dress",
  "RB-IVORY-DRESS",
  [
    {
      code: "s",
      label: "S",
      price: 2390,
      comparePrice: 2790,
      image: BOUTIQUE_GALLERIES["ivory-pleat-dress"][0],
      stock: 5,
    },
    {
      code: "m",
      label: "M",
      price: 2390,
      comparePrice: 2790,
      image: BOUTIQUE_GALLERIES["ivory-pleat-dress"][1],
      stock: 6,
    },
    {
      code: "l",
      label: "L",
      price: 2390,
      comparePrice: 2790,
      image: BOUTIQUE_GALLERIES["ivory-pleat-dress"][2],
      stock: 4,
    },
  ],
);

const BLUSH_KNIT_VARIANTS = buildColorSizeVariants(
  "blush-knit-top",
  "RB-KNIT",
  [
    {
      code: "blush",
      label: "بلوش هادئ",
      image: BOUTIQUE_GALLERIES["blush-knit-top"][0],
    },
    {
      code: "cream",
      label: "كريمي",
      image: BOUTIQUE_GALLERIES["blush-knit-top"][1],
    },
  ],
  1090,
  1390,
  ["S", "M", "L"],
);

const PEARL_SHIRT_VARIANTS = buildColorSizeVariants(
  "pearl-straight-shirt",
  "RB-SHIRT",
  [
    {
      code: "pearl",
      label: "أوف وايت",
      image: BOUTIQUE_GALLERIES["pearl-straight-shirt"][0],
    },
    {
      code: "powder-blue",
      label: "أزرق باودر",
      image: BOUTIQUE_GALLERIES["pearl-straight-shirt"][1],
    },
  ],
  1240,
  1490,
  ["S", "M", "L"],
);

const SOFTLINE_CARDIGAN_VARIANTS = buildColorSizeVariants(
  "softline-cardigan",
  "RB-CARDI",
  [
    {
      code: "sand",
      label: "بيج رملي",
      image: BOUTIQUE_GALLERIES["softline-cardigan"][0],
    },
    {
      code: "stone",
      label: "رمادي حجري",
      image: BOUTIQUE_GALLERIES["softline-cardigan"][1],
    },
  ],
  1460,
  1750,
  ["M", "L", "XL"],
);

const TAILORED_BLAZER_VARIANTS = buildColorSizeVariants(
  "tailored-cream-blazer",
  "RB-BLAZER",
  [
    {
      code: "cream",
      label: "أوف وايت",
      image: BOUTIQUE_GALLERIES["tailored-cream-blazer"][0],
    },
    {
      code: "taupe",
      label: "تاوب هادئ",
      image: BOUTIQUE_GALLERIES["tailored-cream-blazer"][1],
    },
  ],
  2790,
  3290,
  ["M", "L", "XL"],
);

const ARC_BAG_VARIANTS = buildColorVariants(
  "arc-mini-bag",
  "RB-BAG",
  [
    {
      code: "berry",
      label: "عنابي",
      image: BOUTIQUE_GALLERIES["arc-mini-bag"][0],
      stock: 6,
    },
    {
      code: "cream",
      label: "كريمي",
      image: BOUTIQUE_GALLERIES["arc-mini-bag"][1],
      stock: 5,
    },
    {
      code: "mocha",
      label: "موكا",
      image: BOUTIQUE_GALLERIES["arc-mini-bag"][2],
      stock: 4,
    },
  ],
  1680,
  1990,
);

const SILK_SCARF_VARIANTS = buildColorVariants(
  "silk-ribbon-scarf",
  "RB-SCARF",
  [
    {
      code: "rose-print",
      label: "وردي مطبوع",
      image: BOUTIQUE_GALLERIES["silk-ribbon-scarf"][0],
      stock: 8,
    },
    {
      code: "ivory-print",
      label: "أوف وايت مطبوع",
      image: BOUTIQUE_GALLERIES["silk-ribbon-scarf"][1],
      stock: 7,
    },
  ],
  540,
  690,
);

export const ROSE_BOUTIQUE_EG_PRODUCTS: Product[] = [
  buildBoutiqueProduct({
    id: "rose-midi-dress",
    slug: "rose-midi-dress",
    name: "فستان ميدي وردي ناعم",
    description:
      "فستان خفيف بخط مستقيم ولمسة أنثوية هادئة يناسب النهار والخروجات الهادئة واللوك الكلاسيكي السهل.",
    categoryKey: "dresses",
    price: 2190,
    comparePrice: 2590,
    tags: ["فستان", "وردي", "ميدي"],
    relatedProductIds: ["ivory-pleat-dress", "arc-mini-bag", "silk-ribbon-scarf"],
    bundleProductIds: ["arc-mini-bag", "silk-ribbon-scarf"],
    variants: ROSE_MIDI_VARIANTS,
    stock: 8,
    editorialBadge: "اختيار الموسم",
    editorialNote: "فستان ناعم يفتح الصفحة ويظل مرتبًا من الصباح حتى الخروج الهادئ.",
    fitNote: "قصة مستقيمة بانسياب أخف على الجسم.",
    stylingNote: "يكمل مع شنطة صغيرة أو سكارف مطبوع من غير طبقات كثيرة.",
    careNote: "خامة خفيفة يناسبها الغسيل البارد والتجفيف الهادئ.",
    styleWith: ["شنطة آرك ميني", "سكارف حريري", "طبقة كريمية خفيفة"],
    boutiqueFacts: [
      { label: "القصّة", value: "ميدي مستقيمة بحركة ناعمة" },
      { label: "الإحساس", value: "نهاري، أنثوي، وسهل للتكرار" },
      { label: "التنسيق", value: "يشتغل مع حقيبة صغيرة أو شال خفيف" },
      { label: "المقاس", value: "مقاسات S إلى XL مع ألوان هادئة" },
    ],
    boutiqueProofs: [
      {
        label: "مناسب لـ",
        title: "نهار هادئ وخروج خفيف",
        description: "درجة الوردي أهدأ من المعتاد، لذلك تبقى القطعة أنثوية من غير صخب.",
      },
      {
        label: "تفصيلة مهمة",
        title: "صور أقرب للواقع",
        description: "لقطات الحركة والقرب تساعد على رؤية الانسياب الحقيقي قبل الحسم.",
      },
      {
        label: "تنسيق أسرع",
        title: "يكمل مع إكسسوارات قليلة",
        description: "لا يحتاج إلى تنسيق معقد، فقط قطعة ناعمة إضافية أو حقيبة صغيرة تكفي.",
      },
    ],
    volumeDiscounts: [
      { minQuantity: 2, discountType: "percentage", value: 10 },
      { minQuantity: 3, discountType: "percentage", value: 15 },
    ],
  }),
  buildBoutiqueProduct({
    id: "ivory-pleat-dress",
    slug: "ivory-pleat-dress",
    name: "فستان بليسيه أوف وايت",
    description:
      "قماش أكثر انسيابًا مع درجة أوف وايت ناعمة ولمسة أهدأ تناسب المناسبات الخفيفة والسهرات البسيطة.",
    categoryKey: "dresses",
    price: 2390,
    comparePrice: 2790,
    tags: ["بليسيه", "أوف وايت", "سهرة"],
    relatedProductIds: ["rose-midi-dress", "tailored-cream-blazer", "arc-mini-bag"],
    bundleProductIds: ["tailored-cream-blazer", "arc-mini-bag"],
    variants: IVORY_PLEAT_VARIANTS,
    stock: 7,
    editorialBadge: "مساء أخف",
    editorialNote: "درجة أوف وايت أنعم مع بليسيه خفيف للمناسبات البسيطة والطلعات المسائية.",
    fitNote: "انسياب واضح عند الحركة مع خصر أقل حدة.",
    stylingNote: "يميل أكثر للمساء مع بليزر خفيف أو شنطة صغيرة مطفية.",
    careNote: "يُفضّل تعليقه بعد الغسيل للحفاظ على البليسيه.",
    styleWith: ["بليزر كريمي مفصل", "شنطة آرك ميني", "حذاء بسيط بلون هادئ"],
    boutiqueFacts: [
      { label: "اللون", value: "أوف وايت مطفي يقرأ كقطعة أهدأ" },
      { label: "الملمس", value: "بليسيه خفيف بانسياب أوضح" },
      { label: "الوقت", value: "مناسب للمساء والمناسبات الخفيفة" },
      { label: "التنسيق", value: "يتوازن مع طبقة كريمية أو حقيبة صغيرة" },
    ],
    boutiqueProofs: [
      {
        label: "لمسة القطعة",
        title: "أهدأ من فساتين السهرة التقليدية",
        description: "تأخذ من القطع المسائية رقتها، لكن من دون لمعة أو ثقل بصري زائد.",
      },
      {
        label: "شكل الحركة",
        title: "البليسيه يبان بوضوح في الصور",
        description: "اللقطات القريبة والحركة تعطي فكرة أفضل عن شكل القماش وقت اللبس.",
      },
      {
        label: "اختيار مرافق",
        title: "جاهز مع بليزر أو حقيبة صغيرة",
        description: "اقتراحات القطع القريبة منه تبقى في نفس الجو العام من غير تضارب.",
      },
    ],
  }),
  buildBoutiqueProduct({
    id: "blush-knit-top",
    slug: "blush-knit-top",
    name: "بلوزة تريكو ناعمة",
    description:
      "بلوزة خفيفة بملمس أهدأ ودرجة بليدة ناعمة، مناسبة للطبقات السريعة داخل البوتيك اليومي.",
    categoryKey: "tops",
    price: 1090,
    comparePrice: 1390,
    tags: ["تريكو", "بلوش", "نهاري"],
    relatedProductIds: ["softline-cardigan", "pearl-straight-shirt", "silk-ribbon-scarf"],
    bundleProductIds: ["softline-cardigan"],
    variants: BLUSH_KNIT_VARIANTS,
    stock: 10,
    editorialBadge: "طبقة أولى",
    editorialNote: "بلوزة خفيفة تبني اللوك من البداية، وتكمل جيدًا مع الكارديجان أو البليزر.",
    fitNote: "قصة أقرب للجسم بدون ضيق مزعج.",
    stylingNote: "تظهر أفضل كقاعدة هادئة تحت طبقة خفيفة أو مع تنورة بسيطة.",
    careNote: "تُحفظ مطوية للحفاظ على نعومة الخامة.",
    styleWith: ["كارديجان سوفت لاين", "سكارف حريري", "تنورة أوف وايت"],
    boutiqueFacts: [
      { label: "اللون", value: "بلوش هادئ وكريمي" },
      { label: "الوظيفة", value: "أساس يومي للطبقات الخفيفة" },
      { label: "المقاس", value: "S إلى L مع ألوان محدودة وواضحة" },
      { label: "الإيقاع", value: "قطعة ناعمة لا تحتاج تفاصيل كثيرة" },
    ],
    boutiqueProofs: [
      {
        label: "اختيار يومي",
        title: "أسرع قطعة للطبقات الخفيفة",
        description: "تشتغل وحدها أو تحت الكارديجان من غير ما تشغل الصفحة بتفاصيل زائدة.",
      },
      {
        label: "الميزة",
        title: "لون أهدأ من الوردي المعتاد",
        description: "الدرجة أقرب للبلوش الناعم، لذلك يسهل تكرارها مع أكثر من قطعة.",
      },
      {
        label: "تنسيق مقترح",
        title: "مع كارديجان أو سكارف",
        description: "الاقتراحات المجاورة تساعد على بناء لوك ناعم من قطعتين أو ثلاث فقط.",
      },
    ],
  }),
  buildBoutiqueProduct({
    id: "pearl-straight-shirt",
    slug: "pearl-straight-shirt",
    name: "قميص مستقيم أوف وايت",
    description:
      "قميص مستقيم بنظافة أعلى ودرجات أسهل للتنسيق مع الجاكت أو التنورة أو البنطال الهادئ.",
    categoryKey: "tops",
    price: 1240,
    comparePrice: 1490,
    tags: ["قميص", "كلاسيك", "أوف وايت"],
    relatedProductIds: ["tailored-cream-blazer", "softline-cardigan", "arc-mini-bag"],
    bundleProductIds: ["tailored-cream-blazer"],
    variants: PEARL_SHIRT_VARIANTS,
    stock: 9,
    editorialBadge: "كلاسيك يومي",
    editorialNote: "قميص مستقيم ونظيف، مناسب للشغل والنهار والطبقات الرسمية الخفيفة.",
    fitNote: "قصة مستقيمة تعطي مساحة أنظف حول الجسم.",
    stylingNote: "ينجح مع بليزر كريمي أو كارديجان وحقيبة صغيرة من غير ازدحام.",
    careNote: "يعطي نتيجة أفضل مع كي خفيف أو بخار سريع.",
    styleWith: ["بليزر كريمي مفصل", "كارديجان سوفت لاين", "شنطة آرك ميني"],
    boutiqueFacts: [
      { label: "القصّة", value: "مستقيمة ونظيفة للنهار والشغل" },
      { label: "اللون", value: "أوف وايت وأزرق باودر" },
      { label: "التنسيق", value: "يشتغل مع جاكيت أو تنورة أو بنطال هادئ" },
      { label: "المقاس", value: "خيارات S إلى L" },
    ],
    boutiqueProofs: [
      {
        label: "ميزة أساسية",
        title: "قطعة كلاسيكية تعيش أكثر",
        description: "الخط المستقيم والدرجات الهادئة يجعلانها أسهل قطعة للتكرار داخل الخزانة.",
      },
      {
        label: "لمن يناسب",
        title: "شغل ونهار وخروج بسيط",
        description: "قابلية التنسيق العالية هي أهم سبب يجعله أقرب لقطعة أساسية لا موسمية.",
      },
      {
        label: "اقتراح روزا",
        title: "ابدئي به ثم أضيفي طبقة واحدة فقط",
        description: "القميص يظهر بأفضل صورة مع بليزر خفيف أو كارديجان، لا أكثر.",
      },
    ],
  }),
  buildBoutiqueProduct({
    id: "softline-cardigan",
    slug: "softline-cardigan",
    name: "كارديجان سوفت لاين",
    description:
      "طبقة أهدأ لليوم الطويل، بخامة مريحة ولونين سهلين ينسجمان مع الدرجات الكريمية والوردية.",
    categoryKey: "layers",
    price: 1460,
    comparePrice: 1750,
    tags: ["كارديجان", "طبقات", "هادئ"],
    relatedProductIds: ["blush-knit-top", "pearl-straight-shirt", "silk-ribbon-scarf"],
    bundleProductIds: ["blush-knit-top"],
    variants: SOFTLINE_CARDIGAN_VARIANTS,
    stock: 8,
    editorialBadge: "طبقة هادئة",
    editorialNote: "كارديجان يهدّي الإطلالة ويضيف راحة أكثر لليوم الطويل من دون ثقل بصري.",
    fitNote: "خامة مريحة مع سقوط أنعم على الكتف.",
    stylingNote: "يشتغل فوق التريكو أو القميص ويغلق اللوك بسرعة.",
    careNote: "يفضّل غسيله برفق ليحافظ على نعومة الخامة.",
    styleWith: ["بلوزة تريكو ناعمة", "قميص أوف وايت", "سكارف مطبوع"],
    boutiqueFacts: [
      { label: "الخامة", value: "طرية ومريحة للاستخدام اليومي" },
      { label: "الدرجات", value: "بيج رملي أو رمادي حجري" },
      { label: "الدور", value: "طبقة خفيفة بدل الجاكيت الثقيل" },
      { label: "الإحساس", value: "يكمّل الإطلالة بدل أن يفرض نفسه" },
    ],
    boutiqueProofs: [
      {
        label: "تجربة اللبس",
        title: "أهدأ من الجاكيت التقليدي",
        description: "يضيف دفئًا خفيفًا من دون أن يحوّل اللوك إلى شيء ثقيل أو رسمي أكثر من اللازم.",
      },
      {
        label: "اللون",
        title: "درجات سهلة للبلوش والكريمي",
        description: "لهذا ينسجم بسرعة مع القطع الأساسية في البوتيك من غير مجهود كبير.",
      },
      {
        label: "اقتراح تنسيق",
        title: "طبقة تكمل التريكو أو القميص",
        description: "إذا كنتِ تريدين إغلاق الإطلالة بسرعة، فهذه هي القطعة الأقرب لذلك.",
      },
    ],
  }),
  buildBoutiqueProduct({
    id: "tailored-cream-blazer",
    slug: "tailored-cream-blazer",
    name: "بليزر كريمي مفصل",
    description:
      "بليزر أنظف للنهار والعمل والخروجات الرسمية الخفيفة، مع خامة أخف من البليزرات الشتوية الثقيلة.",
    categoryKey: "layers",
    price: 2790,
    comparePrice: 3290,
    tags: ["بليزر", "رسمي", "كريمي"],
    relatedProductIds: ["pearl-straight-shirt", "ivory-pleat-dress", "arc-mini-bag"],
    bundleProductIds: ["pearl-straight-shirt", "arc-mini-bag"],
    variants: TAILORED_BLAZER_VARIANTS,
    stock: 6,
    editorialBadge: "تفصيل أنظف",
    editorialNote: "بليزر كريمي يرفع اللوك اليومي أو العملي من غير ثقل البليزرات الشتوية الثقيلة.",
    fitNote: "تفصيلة أوضح على الكتف مع سقوط أخف على الجسم.",
    stylingNote: "أفضل رفيق للقميص المستقيم أو الفستان الأوف وايت أو حقيبة صغيرة مطفية.",
    careNote: "تعليقه بعد الاستخدام يحافظ على التفصيل والشكل.",
    styleWith: ["قميص مستقيم أوف وايت", "فستان بليسيه أوف وايت", "شنطة آرك ميني"],
    boutiqueFacts: [
      { label: "التفصيل", value: "أنظف من البليزرات الكاجوال الثقيلة" },
      { label: "اللون", value: "كريمي يشتغل مع النهار والعمل" },
      { label: "الدور", value: "يربط اللوك ويعطيه شكلًا أشيك بسرعة" },
      { label: "المقاس", value: "M إلى XL مع خيارين لونيين" },
    ],
    boutiqueProofs: [
      {
        label: "ميزة واضحة",
        title: "قطعة تعيش أكثر من مناسبة",
        description: "يمكن أن تذهب إلى الشغل أو مناسبة أخف من غير أن تبدو رسمية أكثر من اللازم.",
      },
      {
        label: "وزن القطعة",
        title: "أخف من البليزرات الشتوية",
        description: "لذلك يظل عمليًا في أغلب فترات السنة داخل السوق المصري.",
      },
      {
        label: "اقتراح تنسيق",
        title: "قميص مستقيم أو حقيبة مطفية يكفون",
        description: "هو القطعة الأقوى في اللوك، فلا يحتاج إلى عناصر كثيرة حوله.",
      },
    ],
  }),
  buildBoutiqueProduct({
    id: "arc-mini-bag",
    slug: "arc-mini-bag",
    name: "شنطة آرك ميني",
    description:
      "شنطة صغيرة بخط مقوس ناعم تكمل الفساتين والقمصان اليومية من غير أن تسرق الانتباه من الإطلالة.",
    categoryKey: "accessories",
    price: 1680,
    comparePrice: 1990,
    tags: ["شنطة", "ميني", "إكسسوار"],
    relatedProductIds: ["rose-midi-dress", "ivory-pleat-dress", "tailored-cream-blazer"],
    bundleProductIds: ["silk-ribbon-scarf"],
    variants: ARC_BAG_VARIANTS,
    stock: 7,
    editorialBadge: "إكسسوار التكميل",
    editorialNote: "حقيبة صغيرة بخط ناعم، تضيف لمسة مكتملة من غير ما تنافس القطعة الأساسية.",
    fitNote: "حجم صغير مناسب للخروج اليومي والمناسبات الخفيفة.",
    stylingNote: "أقرب اختيار لإغلاق اللوك مع الفساتين أو القمصان الهادئة.",
    careNote: "تُحفظ محشوة بخفة للحفاظ على شكلها المقوس.",
    styleWith: ["فستان ميدي وردي", "فستان بليسيه أوف وايت", "بليزر كريمي مفصل"],
    boutiqueFacts: [
      { label: "الحجم", value: "Mini بخط مقوس واضح" },
      { label: "الدرجات", value: "عنابي، كريمي، أو موكا" },
      { label: "الوظيفة", value: "تكمل الإطلالة من غير سرقة الانتباه" },
      { label: "المناسبات", value: "الخروج اليومي والمساء الخفيف" },
    ],
    boutiqueProofs: [
      {
        label: "فائدة مباشرة",
        title: "أسرع إكسسوار يكمل اللوك",
        description: "إذا كانت القطعة الأساسية جاهزة، فهذه الحقيبة عادة تكفي لإغلاق الشكل كله.",
      },
      {
        label: "إيقاع القطعة",
        title: "خط مقوس أخف بصريًا",
        description: "الانحناءة الهادئة تجعلها أقرب للبوتيك الكلاسيكي من الحقائب الحادة أو الصاخبة.",
      },
      {
        label: "توصية روزا",
        title: "انسجامها أقوى مع درجات الأوف وايت والوردي",
        description: "لذلك وضعناها ضمن الشراء معًا بجوار القطع الأقرب لها في الروح.",
      },
    ],
  }),
  buildBoutiqueProduct({
    id: "silk-ribbon-scarf",
    slug: "silk-ribbon-scarf",
    name: "سكارف حريري مطبوع",
    description:
      "إضافة ناعمة تزيد البوتيك رقة، وتشتغل على الرقبة أو الحقيبة أو مع القميص والبليزر بسهولة.",
    categoryKey: "accessories",
    price: 540,
    comparePrice: 690,
    tags: ["سكارف", "حرير", "مطبوع"],
    relatedProductIds: ["arc-mini-bag", "rose-midi-dress", "softline-cardigan"],
    bundleProductIds: ["arc-mini-bag"],
    variants: SILK_SCARF_VARIANTS,
    stock: 12,
    editorialBadge: "لمسة أخيرة",
    editorialNote: "سكارف مطبوع يضيف رقة سريعة على الرقبة أو الحقيبة أو فوق القميص.",
    fitNote: "خامة خفيفة وسهلة الربط من غير حجم زائد.",
    stylingNote: "يكفي وحده مع الحقيبة أو كطبقة ناعمة حول الرقبة.",
    careNote: "يُحفظ مطويًا أو ملفوفًا بخفة للحفاظ على الطباعة.",
    styleWith: ["شنطة آرك ميني", "قميص مستقيم أوف وايت", "كارديجان سوفت لاين"],
    boutiqueFacts: [
      { label: "الخامة", value: "حريري خفيف مع طباعة ناعمة" },
      { label: "الدور", value: "لمسة أخيرة بدل إكسسوار ثقيل" },
      { label: "الاستخدام", value: "على الرقبة أو الحقيبة أو مع القميص" },
      { label: "الدرجات", value: "وردي مطبوع أو أوف وايت مطبوع" },
    ],
    boutiqueProofs: [
      {
        label: "متى يفيد",
        title: "عندما تحتاج الإطلالة شيئًا صغيرًا فقط",
        description: "يضيف حضورًا لطيفًا من دون ما يحوّل القطعة الأساسية إلى شيء مزخرف أكثر من اللازم.",
      },
      {
        label: "ميزة الشكل",
        title: "يرفع الحقيبة أو القميص بسرعة",
        description: "لهذا يظهر كثيرًا في الاقتراحات المكملة مع الحقائب والقمصان داخل الثيم.",
      },
      {
        label: "اختيار آمن",
        title: "أخف من الإكسسوارات الكبيرة",
        description: "إذا كنتِ تريدين لمسة بوتيك رقيقة فقط، فهو أقرب خيار لذلك.",
      },
    ],
  }),
];

export const ROSE_BOUTIQUE_EG_RECOMMENDATIONS = {
  related: {
    "rose-midi-dress": ["ivory-pleat-dress", "arc-mini-bag", "silk-ribbon-scarf"],
    "ivory-pleat-dress": ["rose-midi-dress", "tailored-cream-blazer", "arc-mini-bag"],
    "blush-knit-top": ["softline-cardigan", "pearl-straight-shirt", "silk-ribbon-scarf"],
    "pearl-straight-shirt": ["tailored-cream-blazer", "softline-cardigan", "arc-mini-bag"],
    "softline-cardigan": ["blush-knit-top", "pearl-straight-shirt", "silk-ribbon-scarf"],
    "tailored-cream-blazer": ["pearl-straight-shirt", "ivory-pleat-dress", "arc-mini-bag"],
    "arc-mini-bag": ["rose-midi-dress", "ivory-pleat-dress", "tailored-cream-blazer"],
    "silk-ribbon-scarf": ["arc-mini-bag", "rose-midi-dress", "softline-cardigan"],
  },
  boughtTogether: {
    "rose-midi-dress": ["arc-mini-bag", "silk-ribbon-scarf"],
    "ivory-pleat-dress": ["tailored-cream-blazer", "arc-mini-bag"],
    "blush-knit-top": ["softline-cardigan", "silk-ribbon-scarf"],
    "pearl-straight-shirt": ["tailored-cream-blazer", "arc-mini-bag"],
  },
} as const;

export const ROSE_BOUTIQUE_EG_REVIEWS = {
  "rose-midi-dress": buildMarketplacePreviewReviewsResponse([
    {
      id: "rose-midi-dress-review-1",
      author: "هبة سامح",
      date: "2026-04-18",
      createdAt: "2026-04-18",
      rating: 5,
      title: "أنثوي جدًا وهادي",
      comment:
        "اللون كان ناعم فعلًا والقصّة طلعت مرتبة جدًا على الجسم من غير ما تكون متكلفة. مناسب للخروج والنهار.",
      verified: true,
      helpfulCount: 11,
    },
    {
      id: "rose-midi-dress-review-2",
      author: "مريم خالد",
      date: "2026-04-22",
      createdAt: "2026-04-22",
      rating: 4,
      title: "القماش مريح والصور صادقة",
      comment:
        "أكثر شيء عجبني إن الصور فعلًا قريبة من الواقع، والمقاس كان واضح، ودرجة الوردي طلعت أهدأ من المتوقع.",
      verified: true,
      helpfulCount: 7,
    },
  ]),
  "tailored-cream-blazer": buildMarketplacePreviewReviewsResponse([
    {
      id: "tailored-cream-blazer-review-1",
      author: "نوران شريف",
      date: "2026-04-17",
      createdAt: "2026-04-17",
      rating: 5,
      title: "قطعة شيك جدًا للشغل",
      comment:
        "اشتغل معي على قميص وعلى فستان، واللون الكريمي أنيق جدًا. مناسب لو عايزة قطعة تعيش أكثر من مناسبة.",
      verified: true,
      helpfulCount: 8,
    },
    {
      id: "tailored-cream-blazer-review-2",
      author: "ياسمين عمرو",
      date: "2026-04-24",
      createdAt: "2026-04-24",
      rating: 4,
      title: "خفيف ومش تقيل",
      comment:
        "خامته أخف من البليزرات الثقيلة وده كان ممتاز بالنسبة لي. المقاس L طلع مضبوط جدًا.",
      verified: true,
      helpfulCount: 5,
    },
  ]),
  "arc-mini-bag": buildMarketplacePreviewReviewsResponse([
    {
      id: "arc-mini-bag-review-1",
      author: "سارة علي",
      date: "2026-04-20",
      createdAt: "2026-04-20",
      rating: 5,
      title: "شكلها أنيق جدًا",
      comment:
        "الشنطة حجمها فعليًا مناسب للخروج والخامة طلعت شيك. اللون العنابي كان أجمل في الحقيقة من الصور.",
      verified: true,
      helpfulCount: 6,
    },
    {
      id: "arc-mini-bag-review-2",
      author: "روان فؤاد",
      date: "2026-04-25",
      createdAt: "2026-04-25",
      rating: 4,
      title: "تكمّل الفستان بسرعة",
      comment:
        "أخذتها مع فستان وردي وطلعت الإطلالة متماسكة جدًا. أحببت إن الصفحة اقترحتها ضمن الشراء معًا.",
      verified: true,
      helpfulCount: 4,
    },
  ]),
} as const;
