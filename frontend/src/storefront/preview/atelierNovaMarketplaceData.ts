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

const atelierCategories = {
  dresses: { id: "dresses", name: "فساتين", slug: "dresses" },
  separates: { id: "separates", name: "قطع منفصلة", slug: "separates" },
  sets: { id: "sets", name: "أطقم", slug: "sets" },
  layers: { id: "layers", name: "طبقات", slug: "layers" },
  accessories: {
    id: "accessories",
    name: "إكسسوارات",
    slug: "accessories",
  },
};

const ATELIER_GALLERIES = {
  "atelier-nova-midi-flow-dress": [
    buildFashionImage("1496747611176-843222e1e57c"),
    buildFashionImage("1483985988355-763728e1935b"),
    buildFashionImage("1529139574466-a303027c1d8b"),
    buildFashionImage("1515886657613-9f3515b0c78f"),
  ],
  "atelier-nova-ink-shift-dress": [
    buildFashionImage("1487412720507-e7ab37603c6f"),
    buildFashionImage("1515886657613-9f3515b0c78f"),
    buildFashionImage("1496747611176-843222e1e57c"),
    buildFashionImage("1529139574466-a303027c1d8b"),
  ],
  "atelier-nova-drape-blouse": [
    buildFashionImage("1529139574466-a303027c1d8b"),
    buildFashionImage("1487412720507-e7ab37603c6f"),
    buildFashionImage("1496747611176-843222e1e57c"),
    buildFashionImage("1483985988355-763728e1935b"),
  ],
  "atelier-nova-gallery-trouser": [
    buildFashionImage("1483985988355-763728e1935b"),
    buildFashionImage("1521572267360-ee0c2909d518"),
    buildFashionImage("1529139574466-a303027c1d8b"),
    buildFashionImage("1487412720507-e7ab37603c6f"),
  ],
  "atelier-nova-courtyard-set": [
    buildFashionImage("1515886657613-9f3515b0c78f"),
    buildFashionImage("1496747611176-843222e1e57c"),
    buildFashionImage("1483985988355-763728e1935b"),
    buildFashionImage("1529139574466-a303027c1d8b"),
  ],
  "atelier-nova-cropped-jacket": [
    buildFashionImage("1487412720507-e7ab37603c6f"),
    buildFashionImage("1515886657613-9f3515b0c78f"),
    buildFashionImage("1521572267360-ee0c2909d518"),
    buildFashionImage("1496747611176-843222e1e57c"),
  ],
  "atelier-nova-arc-hobo-bag": [
    buildFashionImage("1551232864-3f0890e580d9"),
    buildFashionImage("1496747611176-843222e1e57c"),
    buildFashionImage("1487412720507-e7ab37603c6f"),
    buildFashionImage("1515886657613-9f3515b0c78f"),
  ],
  "atelier-nova-silk-scene-scarf": [
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
      المقاس: size.label,
    },
    attributeValues: {
      المقاس: size.label,
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
      اللون: color.label,
    },
    attributeValues: {
      اللون: color.label,
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
        اللون: color.label,
        المقاس: size,
      },
      attributeValues: {
        اللون: color.label,
        المقاس: size,
      },
    })),
  );

const buildAtelierProduct = ({
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
  categoryKey: keyof typeof atelierCategories;
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
  const category = atelierCategories[categoryKey];
  const images = ATELIER_GALLERIES[id as keyof typeof ATELIER_GALLERIES] || [];

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
    createdAt: "2026-04-27T09:00:00.000Z",
  };
};

const MIDI_FLOW_VARIANTS = buildColorSizeVariants(
  "atelier-nova-midi-flow-dress",
  "AN-MIDI",
  [
    {
      code: "stone",
      label: "حجري دافئ",
      image: ATELIER_GALLERIES["atelier-nova-midi-flow-dress"][0],
    },
    {
      code: "clay",
      label: "طيني هادئ",
      image: ATELIER_GALLERIES["atelier-nova-midi-flow-dress"][1],
    },
  ],
  2890,
  3290,
  ["S", "M", "L", "XL"],
);

const INK_SHIFT_VARIANTS = buildSizeVariants(
  "atelier-nova-ink-shift-dress",
  "AN-INK",
  [
    {
      code: "s",
      label: "S",
      price: 3120,
      comparePrice: 3590,
      image: ATELIER_GALLERIES["atelier-nova-ink-shift-dress"][0],
      stock: 4,
    },
    {
      code: "m",
      label: "M",
      price: 3120,
      comparePrice: 3590,
      image: ATELIER_GALLERIES["atelier-nova-ink-shift-dress"][1],
      stock: 5,
    },
    {
      code: "l",
      label: "L",
      price: 3120,
      comparePrice: 3590,
      image: ATELIER_GALLERIES["atelier-nova-ink-shift-dress"][2],
      stock: 3,
    },
  ],
);

const DRAPE_BLOUSE_VARIANTS = buildColorSizeVariants(
  "atelier-nova-drape-blouse",
  "AN-DRAPE",
  [
    {
      code: "porcelain",
      label: "بورسلين",
      image: ATELIER_GALLERIES["atelier-nova-drape-blouse"][0],
    },
    {
      code: "smoke-olive",
      label: "زيتوني دخاني",
      image: ATELIER_GALLERIES["atelier-nova-drape-blouse"][1],
    },
  ],
  1460,
  1790,
  ["S", "M", "L"],
);

const GALLERY_TROUSER_VARIANTS = buildColorSizeVariants(
  "atelier-nova-gallery-trouser",
  "AN-GAL",
  [
    {
      code: "ink",
      label: "حبر مطفي",
      image: ATELIER_GALLERIES["atelier-nova-gallery-trouser"][0],
    },
    {
      code: "sand",
      label: "رملي ناعم",
      image: ATELIER_GALLERIES["atelier-nova-gallery-trouser"][1],
    },
  ],
  1680,
  1990,
  ["S", "M", "L"],
);

const COURTYARD_SET_VARIANTS = buildColorSizeVariants(
  "atelier-nova-courtyard-set",
  "AN-SET",
  [
    {
      code: "mushroom",
      label: "فطر دافئ",
      image: ATELIER_GALLERIES["atelier-nova-courtyard-set"][0],
    },
    {
      code: "oat",
      label: "شوفان هادئ",
      image: ATELIER_GALLERIES["atelier-nova-courtyard-set"][1],
    },
  ],
  3640,
  4190,
  ["S", "M", "L"],
);

const CROPPED_JACKET_VARIANTS = buildColorSizeVariants(
  "atelier-nova-cropped-jacket",
  "AN-CROP",
  [
    {
      code: "espresso",
      label: "إسبريسو ناعم",
      image: ATELIER_GALLERIES["atelier-nova-cropped-jacket"][0],
    },
    {
      code: "chalk",
      label: "شالك مطفي",
      image: ATELIER_GALLERIES["atelier-nova-cropped-jacket"][1],
    },
  ],
  2140,
  2490,
  ["S", "M", "L"],
);

const ARC_HOBO_VARIANTS = buildColorVariants(
  "atelier-nova-arc-hobo-bag",
  "AN-ARC",
  [
    {
      code: "oxblood",
      label: "عنابي عميق",
      image: ATELIER_GALLERIES["atelier-nova-arc-hobo-bag"][0],
      stock: 6,
    },
    {
      code: "taupe",
      label: "تاوب هادئ",
      image: ATELIER_GALLERIES["atelier-nova-arc-hobo-bag"][1],
      stock: 5,
    },
    {
      code: "ink",
      label: "حبر مطفي",
      image: ATELIER_GALLERIES["atelier-nova-arc-hobo-bag"][2],
      stock: 4,
    },
  ],
  1890,
  2240,
);

const SILK_SCENE_VARIANTS = buildColorVariants(
  "atelier-nova-silk-scene-scarf",
  "AN-SCARF",
  [
    {
      code: "gallery-print",
      label: "طباعة الغاليري",
      image: ATELIER_GALLERIES["atelier-nova-silk-scene-scarf"][0],
      stock: 7,
    },
    {
      code: "ink-border",
      label: "إطار حبري",
      image: ATELIER_GALLERIES["atelier-nova-silk-scene-scarf"][1],
      stock: 6,
    },
  ],
  620,
  790,
);

export const ATELIER_NOVA_PRODUCTS: Product[] = [
  buildAtelierProduct({
    id: "atelier-nova-midi-flow-dress",
    slug: "atelier-nova-midi-flow-dress",
    name: "فستان Midi Flow هادئ",
    description:
      "فستان ميدي بخط عمودي وقماش مرن بصريًا، يناسب النهار المرتب أو العشاء الخفيف ويترك مساحة للإكسسوار من دون مبالغة.",
    categoryKey: "dresses",
    price: 2890,
    comparePrice: 3290,
    tags: ["فستان", "ميدي", "دفعة محدودة"],
    relatedProductIds: [
      "atelier-nova-ink-shift-dress",
      "atelier-nova-arc-hobo-bag",
      "atelier-nova-silk-scene-scarf",
    ],
    bundleProductIds: [
      "atelier-nova-arc-hobo-bag",
      "atelier-nova-silk-scene-scarf",
    ],
    variants: MIDI_FLOW_VARIANTS,
    stock: 8,
    editorialBadge: "افتتاح الدفعة",
    editorialNote:
      "القطعة التي تشرح الثيم كله: حضور هادئ، خط نظيف، ومساحة واضحة لما يكملها بعد ذلك.",
    fitNote:
      "القصة مستقيمة بانسياب متوسط؛ إذا كنتِ بين مقاسين فاختاري الأكبر لسقوط أهدأ.",
    stylingNote:
      "يكمل بسهولة مع جاكيت قصير أو حقيبة منحنية وسكارف صغير بدل طبقات كثيرة.",
    careNote: "غسيل بارد وتعليق مباشر للحفاظ على انسياب القماش وخط الكتف.",
    styleWith: ["شنطة Arc Hobo", "سكارف Silk Scene", "جاكيت Cropped Atelier"],
    boutiqueFacts: [
      { label: "القصة", value: "ميدي مستقيم مع حركة هادئة" },
      { label: "الإحساس", value: "مرتب من غير صرامة" },
      { label: "المقاسات", value: "S إلى XL بألوان محدودة" },
      { label: "أفضل استعمال", value: "نهار مرتب أو عشاء خفيف" },
    ],
    boutiqueProofs: [
      {
        label: "لماذا يعمل",
        title: "الخط العمودي يهدئ المشهد",
        description:
          "القصة لا تحتاج زينة إضافية كثيرة، لذلك تصبح القطعة نفسها محور القرار من أول نظرة.",
      },
      {
        label: "قراءة أسرع",
        title: "أربع زوايا تكفي للحسم",
        description:
          "الصور تكشف الحركة والقرب واللون الحقيقي بشكل يساعد على التقدير السريع من غير تخمين.",
      },
      {
        label: "بعد الإضافة",
        title: "يكمل مع إكسسوارين فقط",
        description:
          "الحقيبة والسكارف المقترحان يبقيان داخل نفس الإيقاع ولا يحولان القطعة إلى لوك مختلف بالكامل.",
      },
    ],
    volumeDiscounts: [
      { minQuantity: 2, discountType: "percentage", value: 8 },
      { minQuantity: 3, discountType: "percentage", value: 12 },
    ],
  }),
  buildAtelierProduct({
    id: "atelier-nova-ink-shift-dress",
    slug: "atelier-nova-ink-shift-dress",
    name: "فستان Ink Shift الداكن",
    description:
      "فستان أغمق بدرجة حبرية مطفية وقصة أهدأ من القطع المسائية المعتادة، مناسب لمن تريد حضورًا رصينًا من دون لمعان مبالغ.",
    categoryKey: "dresses",
    price: 3120,
    comparePrice: 3590,
    tags: ["فستان", "داكن", "مسائي هادئ"],
    relatedProductIds: [
      "atelier-nova-midi-flow-dress",
      "atelier-nova-cropped-jacket",
      "atelier-nova-arc-hobo-bag",
    ],
    bundleProductIds: [
      "atelier-nova-cropped-jacket",
      "atelier-nova-arc-hobo-bag",
    ],
    variants: INK_SHIFT_VARIANTS,
    stock: 6,
    editorialBadge: "مساء صامت",
    editorialNote:
      "درجة داكنة محسوبة لمن تريد قطعة أكثر حضورًا من دون الخروج من هدوء الثيم.",
    fitNote:
      "الكتف أوضح والخصر أقل تحديدًا من الفستان الأول، ما يجعله مناسبًا للّبس المسائي الطويل.",
    stylingNote:
      "يستفيد من حقيبة أصغر أو من جاكيت قصير إذا احتجتِ طبقة إضافية عند الانتقال من النهار إلى المساء.",
    careNote:
      "يفضل تعليقه بعد الغسيل وحفظه بعيدًا عن الضوء المباشر لحماية الدرجة الداكنة.",
    styleWith: ["جاكيت Cropped Atelier", "شنطة Arc Hobo", "سكارف Silk Scene"],
    boutiqueFacts: [
      { label: "اللون", value: "حبري مطفي أقرب للغاليري" },
      { label: "المزاج", value: "مساء هادئ لا سهرة صاخبة" },
      { label: "التنسيق", value: "مع طبقة قصيرة أو حقيبة صغيرة" },
    ],
    boutiqueProofs: [
      {
        label: "تفصيلة مهمة",
        title: "اللون لا يبتلع تفاصيل القصة",
        description:
          "الدرجة الداكنة هنا تبقى نظيفة، لذلك تحتفظ القطعة بخفتها بدل أن تصبح صلبة بصريًا.",
      },
      {
        label: "اختيار ذكي",
        title: "بديل أهدأ من القطع المسائية اللامعة",
        description:
          "مناسب لمن تريد حضورًا مرتّبًا دون تفاصيل احتفالية زائدة أو خامات لامعة.",
      },
    ],
  }),
  buildAtelierProduct({
    id: "atelier-nova-drape-blouse",
    slug: "atelier-nova-drape-blouse",
    name: "بلوزة Drape انسيابية",
    description:
      "بلوزة خفيفة تنسدل بهدوء وتعمل كقطعة افتتاحية للوك من قطعتين أو ثلاث، مع مساحة جيدة للطبقات القصيرة.",
    categoryKey: "separates",
    price: 1460,
    comparePrice: 1790,
    tags: ["بلوزة", "قطع منفصلة", "خامة ناعمة"],
    relatedProductIds: [
      "atelier-nova-gallery-trouser",
      "atelier-nova-cropped-jacket",
      "atelier-nova-silk-scene-scarf",
    ],
    bundleProductIds: [
      "atelier-nova-gallery-trouser",
      "atelier-nova-cropped-jacket",
    ],
    variants: DRAPE_BLOUSE_VARIANTS,
    stock: 9,
    editorialBadge: "بداية اللوك",
    editorialNote:
      "قطعة أولى تبني مسارًا كاملًا من دون أن تحتاج إلى الكثير حولها.",
    fitNote: "سقوط مريح عند الوسط والكتف، مناسب للطبقات فوقه أو للّبس المنفرد.",
    stylingNote:
      "تُقرأ أفضل عندما تدخل مع بنطال مستقيم أو جاكيت قصير بدل تنورة مزدحمة التفاصيل.",
    careNote: "تحفظ مطوية أو معلقة بخفة لتجنب أي شد زائد على الخامة.",
    styleWith: ["بنطال Gallery", "جاكيت Cropped Atelier", "سكارف Silk Scene"],
    boutiqueFacts: [
      { label: "الدور", value: "القطعة الأولى في اللوك المنفصل" },
      { label: "المقاسات", value: "S إلى L بدرجتين أساسيتين" },
      { label: "الملمس", value: "خامة ناعمة مع انسياب واضح" },
    ],
    boutiqueProofs: [
      {
        label: "سهولة البناء",
        title: "تعمل وحدها أو تحت طبقة",
        description:
          "يمكن أن تبدأ بها اللوك مباشرة ثم تضيفي البنطال أو الجاكيت من نفس المسار من دون ازدحام.",
      },
      {
        label: "اختيار مرافق",
        title: "تحب البنطال المستقيم أكثر من التنسيق المزدحم",
        description:
          "قصة البلوزة تصبح أوضح عندما تدخل مع قاعدة نظيفة بدل قطع كثيرة متنافسة.",
      },
    ],
    volumeDiscounts: [
      { minQuantity: 2, discountType: "percentage", value: 7 },
      { minQuantity: 3, discountType: "percentage", value: 10 },
    ],
  }),
  buildAtelierProduct({
    id: "atelier-nova-gallery-trouser",
    slug: "atelier-nova-gallery-trouser",
    name: "بنطال Gallery مستقيم",
    description:
      "بنطال بخط مستقيم وخصر نظيف يعمل كقاعدة للبلوزات والجاكيتات القصيرة، ويعيد التوازن إلى اللوك كله.",
    categoryKey: "separates",
    price: 1680,
    comparePrice: 1990,
    tags: ["بنطال", "مستقيم", "أساسيات راقية"],
    relatedProductIds: [
      "atelier-nova-drape-blouse",
      "atelier-nova-cropped-jacket",
      "atelier-nova-arc-hobo-bag",
    ],
    bundleProductIds: [
      "atelier-nova-drape-blouse",
      "atelier-nova-cropped-jacket",
    ],
    variants: GALLERY_TROUSER_VARIANTS,
    stock: 8,
    editorialBadge: "قاعدة الرف",
    editorialNote:
      "يمنح القطع العلوية مساحة أكبر ويجعل اللوك أكثر قابلية للتكرار من مرة داخل الدفعة نفسها.",
    fitNote:
      "قصة مستقيمة من الأعلى إلى الأسفل مع راحة أوضح حول الحركة والجلوس.",
    stylingNote:
      "يعطي أفضل نتيجة مع بلوزة ناعمة أو جاكيت قصير بدل القطع الطويلة جدًا.",
    careNote: "كيّ خفيف من الداخل أو تعليق بعد الغسيل لحفظ الخط المستقيم.",
    styleWith: ["بلوزة Drape", "جاكيت Cropped Atelier", "شنطة Arc Hobo"],
    boutiqueFacts: [
      { label: "الشكل", value: "قاعدة مستقيمة غير حادة" },
      { label: "التكرار", value: "يناسب أكثر من بلوزة داخل الدفعة نفسها" },
      { label: "اللون", value: "حبري أو رملي بدرجتين محايدتين" },
    ],
    boutiqueProofs: [
      {
        label: "دور القطعة",
        title: "يربط اللوك بدل أن يجذب الانتباه وحده",
        description:
          "هذا ما يجعله مناسبًا لفلسفة Atelier Nova: قاعدة واضحة تخدم بقية القطع لا تنافسها.",
      },
      {
        label: "ميزة عملية",
        title: "سهل لإعادة التنسيق",
        description:
          "يمكن تكراره مع أكثر من بلوزة أو طبقة من نفس المجموعة بدون أن يبدو مكررًا بصريًا.",
      },
    ],
  }),
  buildAtelierProduct({
    id: "atelier-nova-courtyard-set",
    slug: "atelier-nova-courtyard-set",
    name: "طقم Courtyard المحدود",
    description:
      "طقم قصير اللسان البصري: جاهز للحسم السريع لكنه لا يبدو كحل تجاري متسرع، بل كاختيار مرتب من الدفعة نفسها.",
    categoryKey: "sets",
    price: 3640,
    comparePrice: 4190,
    tags: ["طقم", "دفعة محدودة", "حل جاهز"],
    relatedProductIds: [
      "atelier-nova-midi-flow-dress",
      "atelier-nova-arc-hobo-bag",
      "atelier-nova-silk-scene-scarf",
    ],
    bundleProductIds: [
      "atelier-nova-arc-hobo-bag",
      "atelier-nova-silk-scene-scarf",
    ],
    variants: COURTYARD_SET_VARIANTS,
    stock: 5,
    editorialBadge: "حل مكتمل",
    editorialNote:
      "لمن تريد قرارًا أسرع لكنه ما زال يحترم مزاج الثيم وصوره الهادئة.",
    fitNote:
      "التوازن بين القطعتين مقصود، لذلك يُنصح باختيار المقاس المعتاد إذا كنتِ تحبين هيئة أكثر ترتيبًا.",
    stylingNote:
      "يحتاج عادة إلى حقيبة أو سكارف فقط، ولا يحتاج إلى إضافة طبقة جديدة إلا عند الرغبة في هيكل أوضح.",
    careNote: "الأفضل غسل القطعتين معًا بدرجة باردة للحفاظ على التجانس اللوني.",
    styleWith: ["شنطة Arc Hobo", "سكارف Silk Scene", "جاكيت Cropped Atelier"],
    boutiqueFacts: [
      { label: "الغرض", value: "قرار أسرع مع إحساس راقٍ" },
      { label: "التكوين", value: "قطعتان متوازنتان بصريًا" },
      { label: "الدرجات", value: "فطر دافئ أو شوفان هادئ" },
    ],
    boutiqueProofs: [
      {
        label: "متى تختارينه",
        title: "عندما تريدين لوكًا كاملًا من أول مرة",
        description:
          "الطقم يختصر القرار لكنه يظل قريبًا من روح الغاليري بدل أسلوب العروض المباشرة.",
      },
      {
        label: "كيف يكمل",
        title: "إكسسوار صغير يكفي",
        description:
          "لا يحتاج إلى كثير من الإضافات، فقط حقيبة أو سكارف ليُغلق المشهد بهدوء.",
      },
    ],
    volumeDiscounts: [
      { minQuantity: 2, discountType: "percentage", value: 9 },
      { minQuantity: 3, discountType: "percentage", value: 13 },
    ],
  }),
  buildAtelierProduct({
    id: "atelier-nova-cropped-jacket",
    slug: "atelier-nova-cropped-jacket",
    name: "جاكيت Cropped Atelier",
    description:
      "طبقة قصيرة تحافظ على صمت القطعة الأساسية وتضيف هيكلًا خفيفًا للوك من دون ثقل بصري أو طول يسرق الانتباه.",
    categoryKey: "layers",
    price: 2140,
    comparePrice: 2490,
    tags: ["جاكيت", "طبقة قصيرة", "هيكل خفيف"],
    relatedProductIds: [
      "atelier-nova-midi-flow-dress",
      "atelier-nova-gallery-trouser",
      "atelier-nova-drape-blouse",
    ],
    bundleProductIds: [
      "atelier-nova-gallery-trouser",
      "atelier-nova-drape-blouse",
    ],
    variants: CROPPED_JACKET_VARIANTS,
    stock: 6,
    editorialBadge: "طبقة الإغلاق",
    editorialNote:
      "جاكيت لا يهيمن على اللوك، لكنه يعطيه حدًا أوضح عندما يحتاج إلى ذلك.",
    fitNote:
      "طول أقصر مقصود عند الخصر، لذلك يناسب الفساتين والبناطيل العالية أكثر من القطع الطويلة.",
    stylingNote:
      "يظهر أثره الحقيقي فوق الفستان المستقيم أو مع البلوزة والبنطال من نفس الدفعة.",
    careNote:
      "كيّ خفيف بالبخار أو تعليق بعد الاستخدام للحفاظ على شكل الكتف والطول.",
    styleWith: ["فستان Midi Flow", "بلوزة Drape", "بنطال Gallery"],
    boutiqueFacts: [
      { label: "الطول", value: "قصير ومقصود" },
      { label: "الدور", value: "يغلق المشهد ولا يغيره" },
      { label: "الاستعمال", value: "مع الفساتين والقطع المنفصلة" },
    ],
    boutiqueProofs: [
      {
        label: "ميزة الطبقة",
        title: "توازن بدل ثقل",
        description:
          "عندما تحتاج القطعة الأساسية إلى هيكل أوضح، يقوم الجاكيت بهذا الدور بدون أن يسحب العين إليه بالكامل.",
      },
      {
        label: "مع من يعمل",
        title: "أفضل مع الخطوط النظيفة",
        description:
          "القصة القصيرة تحب الفساتين المستقيمة والبلوزات الهادئة أكثر من القطع المزدحمة بالتفاصيل.",
      },
    ],
  }),
  buildAtelierProduct({
    id: "atelier-nova-arc-hobo-bag",
    slug: "atelier-nova-arc-hobo-bag",
    name: "شنطة Arc Hobo ناعمة",
    description:
      "حقيبة بانحناءة واضحة لكنها هادئة، مصممة لتكون إضافة أخيرة محسوبة بدل عنصر لافت يزاحم بقية القطع.",
    categoryKey: "accessories",
    price: 1890,
    comparePrice: 2240,
    tags: ["شنطة", "إكسسوار", "لمسة أخيرة"],
    relatedProductIds: [
      "atelier-nova-midi-flow-dress",
      "atelier-nova-cropped-jacket",
      "atelier-nova-silk-scene-scarf",
    ],
    bundleProductIds: [
      "atelier-nova-midi-flow-dress",
      "atelier-nova-silk-scene-scarf",
    ],
    variants: ARC_HOBO_VARIANTS,
    stock: 7,
    editorialBadge: "اللمسة الأخيرة",
    editorialNote:
      "تضيف شكلًا نهائيًا للوك مع بقاء الأولوية للقطعة الأساسية والصورة العامة.",
    fitNote:
      "حجم متوسط يناسب الاستخدام اليومي والمساء الخفيف من غير تضخم بصري.",
    stylingNote:
      "تشتغل بوضوح مع الفساتين المستقيمة أو الأطقم المحدودة أو مع الجاكيت القصير.",
    careNote:
      "تمسح بقطعة ناعمة وتُحفظ مع حشو خفيف حتى يبقى القوس محافظًا على شكله.",
    styleWith: ["فستان Midi Flow", "طقم Courtyard", "سكارف Silk Scene"],
    boutiqueFacts: [
      { label: "الشكل", value: "منحنى واضح لكن غير صارخ" },
      { label: "الألوان", value: "عنابي عميق، تاوب، أو حبر مطفي" },
      { label: "الدور", value: "تغلق اللوك بدل أن تبدأه" },
    ],
    boutiqueProofs: [
      {
        label: "السبب",
        title: "إكسسوار يكمّل لا يصرخ",
        description:
          "حجمها وخطها يجعلانها مناسبة لفلسفة الثيم: حضور واضح لكن مضبوط حتى آخر لحظة.",
      },
      {
        label: "أفضل رفقة",
        title: "مع فستان أو طقم أو سكارف",
        description:
          "تحب القطع النظيفة وتكسب أكثر عندما تدخل كخطوة أخيرة في اللوك.",
      },
    ],
  }),
  buildAtelierProduct({
    id: "atelier-nova-silk-scene-scarf",
    slug: "atelier-nova-silk-scene-scarf",
    name: "سكارف Silk Scene المطبوع",
    description:
      "سكارف صغير بطباعة هادئة وحدود مرتبة، يضيف حركة خفيفة قرب الوجه أو على الحقيبة من دون أن يسرق المشهد.",
    categoryKey: "accessories",
    price: 620,
    comparePrice: 790,
    tags: ["سكارف", "مطبوع", "تفصيلة هادئة"],
    relatedProductIds: [
      "atelier-nova-midi-flow-dress",
      "atelier-nova-drape-blouse",
      "atelier-nova-arc-hobo-bag",
    ],
    bundleProductIds: [
      "atelier-nova-arc-hobo-bag",
      "atelier-nova-midi-flow-dress",
    ],
    variants: SILK_SCENE_VARIANTS,
    stock: 8,
    editorialBadge: "تفصيلة صغيرة",
    editorialNote:
      "السكارف هنا ليس زينة فقط، بل طريقة لربط الحقيبة أو الفستان ببقية هوية الدفعة.",
    fitNote: "حجم خفيف يلتف حول الرقبة أو المقبض من دون كتلة إضافية.",
    stylingNote:
      "أفضل استعمال له مع حقيبة Arc Hobo أو فوق بلوزة ناعمة تحتاج حركة بسيطة قرب الوجه.",
    careNote: "غسيل يدوي بارد أو تنظيف لطيف وتجفيف مسطح.",
    styleWith: ["شنطة Arc Hobo", "فستان Midi Flow", "بلوزة Drape"],
    boutiqueFacts: [
      { label: "الطباعة", value: "هادئة ومركزة" },
      { label: "الاستخدام", value: "حول الرقبة أو على الحقيبة" },
      { label: "الدور", value: "لمسة تربط الدفعة بصريًا" },
    ],
    boutiqueProofs: [
      {
        label: "كيف يعمل",
        title: "حركة خفيفة في المكان الصحيح",
        description:
          "بدل إضافة طبقة جديدة، يمكن لهذه اللمسة الصغيرة أن تكفي لربط القطعة الحالية بالهوية كاملة.",
      },
      {
        label: "أفضل موقع",
        title: "مع الحقيبة أو قرب الوجه",
        description:
          "عندما يكون اللوك نظيفًا أصلًا، تصبح هذه اللمسة كافية لإضافة عمق من دون مبالغة.",
      },
    ],
  }),
];

export const ATELIER_NOVA_RECOMMENDATIONS = {
  related: {
    "atelier-nova-midi-flow-dress": [
      "atelier-nova-ink-shift-dress",
      "atelier-nova-arc-hobo-bag",
      "atelier-nova-silk-scene-scarf",
    ],
    "atelier-nova-ink-shift-dress": [
      "atelier-nova-midi-flow-dress",
      "atelier-nova-cropped-jacket",
      "atelier-nova-arc-hobo-bag",
    ],
    "atelier-nova-drape-blouse": [
      "atelier-nova-gallery-trouser",
      "atelier-nova-cropped-jacket",
      "atelier-nova-silk-scene-scarf",
    ],
    "atelier-nova-gallery-trouser": [
      "atelier-nova-drape-blouse",
      "atelier-nova-cropped-jacket",
      "atelier-nova-arc-hobo-bag",
    ],
    "atelier-nova-courtyard-set": [
      "atelier-nova-arc-hobo-bag",
      "atelier-nova-silk-scene-scarf",
      "atelier-nova-cropped-jacket",
    ],
    "atelier-nova-cropped-jacket": [
      "atelier-nova-midi-flow-dress",
      "atelier-nova-drape-blouse",
      "atelier-nova-gallery-trouser",
    ],
    "atelier-nova-arc-hobo-bag": [
      "atelier-nova-midi-flow-dress",
      "atelier-nova-courtyard-set",
      "atelier-nova-silk-scene-scarf",
    ],
    "atelier-nova-silk-scene-scarf": [
      "atelier-nova-midi-flow-dress",
      "atelier-nova-drape-blouse",
      "atelier-nova-arc-hobo-bag",
    ],
  },
  boughtTogether: {
    "atelier-nova-midi-flow-dress": [
      "atelier-nova-arc-hobo-bag",
      "atelier-nova-silk-scene-scarf",
      "atelier-nova-cropped-jacket",
    ],
    "atelier-nova-ink-shift-dress": [
      "atelier-nova-cropped-jacket",
      "atelier-nova-arc-hobo-bag",
      "atelier-nova-silk-scene-scarf",
    ],
    "atelier-nova-drape-blouse": [
      "atelier-nova-gallery-trouser",
      "atelier-nova-cropped-jacket",
      "atelier-nova-arc-hobo-bag",
    ],
    "atelier-nova-gallery-trouser": [
      "atelier-nova-drape-blouse",
      "atelier-nova-cropped-jacket",
      "atelier-nova-silk-scene-scarf",
    ],
    "atelier-nova-courtyard-set": [
      "atelier-nova-arc-hobo-bag",
      "atelier-nova-silk-scene-scarf",
      "atelier-nova-cropped-jacket",
    ],
    "atelier-nova-cropped-jacket": [
      "atelier-nova-drape-blouse",
      "atelier-nova-gallery-trouser",
      "atelier-nova-arc-hobo-bag",
    ],
    "atelier-nova-arc-hobo-bag": [
      "atelier-nova-midi-flow-dress",
      "atelier-nova-silk-scene-scarf",
      "atelier-nova-courtyard-set",
    ],
    "atelier-nova-silk-scene-scarf": [
      "atelier-nova-midi-flow-dress",
      "atelier-nova-arc-hobo-bag",
      "atelier-nova-drape-blouse",
    ],
  },
} as const;

export const ATELIER_NOVA_REVIEWS: Record<
  string,
  MarketplacePreviewProductReviewsResponse
> = {
  "atelier-nova-midi-flow-dress": buildMarketplacePreviewReviewsResponse([
    {
      id: "atelier-midi-review-1",
      author: "ناردين",
      date: "21 أبريل 2026",
      createdAt: "2026-04-21T11:00:00.000Z",
      rating: 5,
      title: "هادئ فعلًا كما في الصور",
      comment:
        "أكثر شيء أحببته أن الفستان لم يحتج إلا الشنطة نفسها تقريبًا. الصور كانت صادقة جدًا مع درجة اللون.",
      verified: true,
      helpfulCount: 7,
    },
    {
      id: "atelier-midi-review-2",
      author: "سلمى",
      date: "24 أبريل 2026",
      createdAt: "2026-04-24T16:15:00.000Z",
      rating: 4,
      title: "قصة مريحة وسهلة",
      comment:
        "اخترت المقاس الأكبر لأنني بين مقاسين وكان السقوط أهدأ فعلًا. القطعة تقفل اللوك بسرعة.",
      verified: true,
      helpfulCount: 4,
    },
  ]),
  "atelier-nova-ink-shift-dress": buildMarketplacePreviewReviewsResponse([
    {
      id: "atelier-ink-review-1",
      author: "ريم",
      date: "19 أبريل 2026",
      createdAt: "2026-04-19T19:40:00.000Z",
      rating: 5,
      title: "بديل راقٍ للقطع المسائية اللامعة",
      comment:
        "الدرجة الحبرية هادئة جدًا وتعطي حضورًا مرتبًا من غير أي مبالغة. ممتاز مع الجاكيت القصير.",
      verified: true,
      helpfulCount: 5,
    },
    {
      id: "atelier-ink-review-2",
      author: "مي",
      date: "25 أبريل 2026",
      createdAt: "2026-04-25T13:05:00.000Z",
      rating: 4,
      title: "الخامة أوضح من المتوقع",
      comment:
        "أعجبتني لقطات القرب لأنها أوضحت ملمس القماش قبل الشراء. كنت أود فقط مقاسًا إضافيًا.",
      verified: true,
      helpfulCount: 3,
    },
  ]),
  "atelier-nova-courtyard-set": buildMarketplacePreviewReviewsResponse([
    {
      id: "atelier-set-review-1",
      author: "سارة",
      date: "18 أبريل 2026",
      createdAt: "2026-04-18T10:20:00.000Z",
      rating: 5,
      title: "حل سريع لكن شكله راقٍ",
      comment:
        "اشتريته لأنني أردت لوكًا كاملًا بسرعة، ومع ذلك لم أشعر أنه طقم تجاري مباشر. الحقيبة معه كانت كافية.",
      verified: true,
      helpfulCount: 6,
    },
    {
      id: "atelier-set-review-2",
      author: "هدى",
      date: "23 أبريل 2026",
      createdAt: "2026-04-23T12:30:00.000Z",
      rating: 4,
      title: "متوازن ومريح",
      comment:
        "أحببت التوازن بين القطعتين وأن المقاس جاء كما توقعت تقريبًا. مناسب جدًا للنهار المرتب.",
      verified: true,
      helpfulCount: 2,
    },
  ]),
  "atelier-nova-cropped-jacket": buildMarketplacePreviewReviewsResponse([
    {
      id: "atelier-jacket-review-1",
      author: "ياسمين",
      date: "20 أبريل 2026",
      createdAt: "2026-04-20T14:10:00.000Z",
      rating: 5,
      title: "أغلق اللوك بالضبط كما أردت",
      comment:
        "أحببت أنه يضيف هيكلًا خفيفًا فوق الفستان من غير ما يصبح هو بطل الإطلالة. هذه كانت نقطة الحسم بالنسبة لي.",
      verified: true,
      helpfulCount: 8,
    },
    {
      id: "atelier-jacket-review-2",
      author: "نورا",
      date: "26 أبريل 2026",
      createdAt: "2026-04-26T09:35:00.000Z",
      rating: 4,
      title: "طول موفق جدًا",
      comment:
        "الطول القصير مناسب فعلًا مع الخصر العالي ومع الفساتين المستقيمة. كنت أفضّل لونًا ثالثًا فقط.",
      verified: true,
      helpfulCount: 3,
    },
  ]),
};
