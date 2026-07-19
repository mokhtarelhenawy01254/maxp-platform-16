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

const buildKidsPlayImage = (photoId: string) =>
  `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=1200&q=80`;

const kidsPlayCategories = {
  building: { id: "building-toys", name: "تركيب وبناء", slug: "building-toys" },
  active: { id: "active-play", name: "لعب حركي", slug: "active-play" },
  learning: { id: "learning-games", name: "تعلم وتركيز", slug: "learning-games" },
  crafts: { id: "arts-crafts", name: "رسم وأنشطة", slug: "arts-crafts" },
  pretend: { id: "pretend-play", name: "لعب تمثيلي", slug: "pretend-play" },
};

const KIDS_PLAY_GALLERIES = {
  "rocket-blocks-lab": [
    buildKidsPlayImage("1596461404969-9ae70f2830c1"),
    buildKidsPlayImage("1618842676088-c4d48a6a7c9d"),
    buildKidsPlayImage("1587654780291-39c9404d746b"),
    buildKidsPlayImage("1618842675842-5a0c25444149"),
  ],
  "woodland-train-blocks": [
    buildKidsPlayImage("1618842675842-5a0c25444149"),
    buildKidsPlayImage("1618842676088-c4d48a6a7c9d"),
    buildKidsPlayImage("1596461404969-9ae70f2830c1"),
    buildKidsPlayImage("1587654780291-39c9404d746b"),
  ],
  "junior-scooter-lite": [
    buildKidsPlayImage("1736994706335-22e1ea8a115b"),
    buildKidsPlayImage("1736994706330-01e672f56689"),
    buildKidsPlayImage("1571210764848-96a1d81aa2a5"),
    buildKidsPlayImage("1740986692427-e6084bf684cf"),
  ],
  "dream-play-tent": [
    buildKidsPlayImage("1633104319071-4fa6fa12a613"),
    buildKidsPlayImage("1552139684-9393e55cb7d6"),
    buildKidsPlayImage("1532330393533-443990a51d10"),
    buildKidsPlayImage("1574492909706-09f2b2f0d909"),
  ],
  "alphabet-puzzle-board": [
    buildKidsPlayImage("1759678444821-565ff103465c"),
    buildKidsPlayImage("1574492909706-09f2b2f0d909"),
    buildKidsPlayImage("1618842676088-c4d48a6a7c9d"),
    buildKidsPlayImage("1587654780291-39c9404d746b"),
  ],
  "memory-match-board": [
    buildKidsPlayImage("1574492909706-09f2b2f0d909"),
    buildKidsPlayImage("1759678444821-565ff103465c"),
    buildKidsPlayImage("1618842676088-c4d48a6a7c9d"),
    buildKidsPlayImage("1532330393533-443990a51d10"),
  ],
  "splash-art-kit": [
    buildKidsPlayImage("1554343594-1c9d305bd51f"),
    buildKidsPlayImage("1637195141546-2469a5312504"),
    buildKidsPlayImage("1552139684-9393e55cb7d6"),
    buildKidsPlayImage("1633104319071-4fa6fa12a613"),
  ],
  "doctor-bear-kit": [
    buildKidsPlayImage("1763294905876-2c1a41ddfd64"),
    buildKidsPlayImage("1552139684-9393e55cb7d6"),
    buildKidsPlayImage("1633104319071-4fa6fa12a613"),
    buildKidsPlayImage("1574492909706-09f2b2f0d909"),
  ],
} as const;

const buildConfigVariants = (
  productId: string,
  skuPrefix: string,
  image: string,
  configs: Array<{
    code: string;
    label: string;
    price: number;
    comparePrice: number;
    stock: number;
    attributes: Record<string, string>;
  }>,
) =>
  configs.map((config) => ({
    id: `${productId}-${config.code}`,
    name: config.label,
    price: config.price,
    comparePrice: config.comparePrice,
    sku: `${skuPrefix}-${config.code.toUpperCase()}`,
    image,
    stock: config.stock,
    attributes: config.attributes,
    attributeValues: config.attributes,
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

const buildToyVolumeDiscounts = (productId: string) => [
  {
    id: `${productId}-duo`,
    minQuantity: 2,
    maxQuantity: 2,
    discountType: "percentage" as const,
    discountValue: 6,
    label: "2 قطع خصم 6%",
  },
  {
    id: `${productId}-family-pack`,
    minQuantity: 3,
    maxQuantity: null,
    discountType: "percentage" as const,
    discountValue: 10,
    label: "3 قطع خصم 10%",
  },
];

const buildKidsPlayProduct = ({
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
  volumeDiscounts = [],
}: {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryKey: keyof typeof kidsPlayCategories;
  price: number;
  comparePrice?: number;
  tags?: string[];
  relatedProductIds?: string[];
  bundleProductIds?: string[];
  variants?: Array<Record<string, unknown>>;
  stock?: number;
  volumeDiscounts?: Array<Record<string, unknown>>;
}): Product => {
  const category = kidsPlayCategories[categoryKey];
  const images = KIDS_PLAY_GALLERIES[id as keyof typeof KIDS_PLAY_GALLERIES] || [];

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
    stock: stock ?? 12,
    relatedProductIds,
    bundleProductIds,
    volumeDiscounts,
    productVariants: variants,
    variants,
    createdAt: "2026-04-27T10:00:00.000Z",
  };
};

const ROCKET_BLOCKS_VARIANTS = buildConfigVariants(
  "rocket-blocks-lab",
  "KP-BLOCKS",
  KIDS_PLAY_GALLERIES["rocket-blocks-lab"][0],
  [
    {
      code: "builder-80",
      label: "80 قطعة",
      price: 790,
      comparePrice: 930,
      stock: 9,
      attributes: {
        "عدد القطع": "80 قطعة",
        "النسخة": "أساسي",
      },
    },
    {
      code: "builder-120",
      label: "120 قطعة",
      price: 890,
      comparePrice: 1040,
      stock: 7,
      attributes: {
        "عدد القطع": "120 قطعة",
        "النسخة": "موسعة",
      },
    },
    {
      code: "space-city",
      label: "مدينة فضائية / 140 قطعة",
      price: 990,
      comparePrice: 1160,
      stock: 5,
      attributes: {
        "عدد القطع": "140 قطعة",
        "النسخة": "مدينة فضائية",
      },
    },
  ],
);

const WOODLAND_TRAIN_VARIANTS = buildConfigVariants(
  "woodland-train-blocks",
  "KP-TRAIN",
  KIDS_PLAY_GALLERIES["woodland-train-blocks"][0],
  [
    {
      code: "starter",
      label: "قطار البداية",
      price: 690,
      comparePrice: 830,
      stock: 8,
      attributes: {
        "المسار": "أساسي",
        "الإضافات": "عربة + سكة",
      },
    },
    {
      code: "station",
      label: "محطة كاملة",
      price: 840,
      comparePrice: 980,
      stock: 6,
      attributes: {
        "المسار": "موسع",
        "الإضافات": "محطة + إشارات",
      },
    },
    {
      code: "mega",
      label: "مسار عائلي كبير",
      price: 990,
      comparePrice: 1140,
      stock: 4,
      attributes: {
        "المسار": "كبير",
        "الإضافات": "جسر + محطتان",
      },
    },
  ],
);

const JUNIOR_SCOOTER_VARIANTS = buildColorVariants(
  "junior-scooter-lite",
  "KP-SCOOTER",
  [
    {
      code: "aqua",
      label: "أزرق سماوي",
      image: KIDS_PLAY_GALLERIES["junior-scooter-lite"][0],
      stock: 5,
    },
    {
      code: "coral",
      label: "كورال مرح",
      image: KIDS_PLAY_GALLERIES["junior-scooter-lite"][1],
      stock: 4,
    },
    {
      code: "lime",
      label: "أخضر ليموني",
      image: KIDS_PLAY_GALLERIES["junior-scooter-lite"][2],
      stock: 3,
    },
  ],
  1690,
  1890,
);

const DREAM_TENT_VARIANTS = buildColorVariants(
  "dream-play-tent",
  "KP-TENT",
  [
    {
      code: "rainbow",
      label: "قوس قزح",
      image: KIDS_PLAY_GALLERIES["dream-play-tent"][0],
      stock: 6,
    },
    {
      code: "safari",
      label: "سفاري هادئ",
      image: KIDS_PLAY_GALLERIES["dream-play-tent"][1],
      stock: 5,
    },
  ],
  1490,
  1690,
);

const ALPHABET_PUZZLE_VARIANTS = buildConfigVariants(
  "alphabet-puzzle-board",
  "KP-ALPHA",
  KIDS_PLAY_GALLERIES["alphabet-puzzle-board"][0],
  [
    {
      code: "arabic",
      label: "حروف عربية",
      price: 520,
      comparePrice: 620,
      stock: 9,
      attributes: {
        "اللغة": "العربية",
        "المستوى": "3+ سنوات",
      },
    },
    {
      code: "english",
      label: "حروف إنجليزية",
      price: 520,
      comparePrice: 620,
      stock: 8,
      attributes: {
        "اللغة": "الإنجليزية",
        "المستوى": "3+ سنوات",
      },
    },
    {
      code: "dual",
      label: "ثنائي اللغة",
      price: 610,
      comparePrice: 720,
      stock: 6,
      attributes: {
        "اللغة": "عربي + إنجليزي",
        "المستوى": "4+ سنوات",
      },
    },
  ],
);

const MEMORY_MATCH_VARIANTS = buildConfigVariants(
  "memory-match-board",
  "KP-MEMORY",
  KIDS_PLAY_GALLERIES["memory-match-board"][0],
  [
    {
      code: "animals",
      label: "حيوانات / 24 بطاقة",
      price: 430,
      comparePrice: 520,
      stock: 10,
      attributes: {
        "المجموعة": "حيوانات",
        "عدد البطاقات": "24 بطاقة",
      },
    },
    {
      code: "vehicles",
      label: "مركبات / 24 بطاقة",
      price: 430,
      comparePrice: 520,
      stock: 9,
      attributes: {
        "المجموعة": "مركبات",
        "عدد البطاقات": "24 بطاقة",
      },
    },
    {
      code: "mega",
      label: "ميجا / 48 بطاقة",
      price: 540,
      comparePrice: 640,
      stock: 6,
      attributes: {
        "المجموعة": "مختلطة",
        "عدد البطاقات": "48 بطاقة",
      },
    },
  ],
);

const SPLASH_ART_VARIANTS = buildConfigVariants(
  "splash-art-kit",
  "KP-ART",
  KIDS_PLAY_GALLERIES["splash-art-kit"][0],
  [
    {
      code: "starter",
      label: "بداية قابلة للغسل",
      price: 470,
      comparePrice: 560,
      stock: 11,
      attributes: {
        "النسخة": "بداية",
        "المحتوى": "12 لون قابلة للغسل",
      },
    },
    {
      code: "deluxe",
      label: "ديلوكس مع مريلة",
      price: 690,
      comparePrice: 790,
      stock: 8,
      attributes: {
        "النسخة": "ديلوكس",
        "المحتوى": "مريلة + 24 لون",
      },
    },
    {
      code: "travel",
      label: "علبة سفر",
      price: 540,
      comparePrice: 640,
      stock: 7,
      attributes: {
        "النسخة": "سفر",
        "المحتوى": "علبة معدنية + أدوات رسم",
      },
    },
  ],
);

const DOCTOR_BEAR_VARIANTS = buildConfigVariants(
  "doctor-bear-kit",
  "KP-DOCTOR",
  KIDS_PLAY_GALLERIES["doctor-bear-kit"][0],
  [
    {
      code: "pink-clinic",
      label: "عيادة وردية",
      price: 620,
      comparePrice: 720,
      stock: 7,
      attributes: {
        "الحقيبة": "وردية",
        "الأدوات": "9 قطع",
      },
    },
    {
      code: "mint-clinic",
      label: "عيادة مينت",
      price: 620,
      comparePrice: 720,
      stock: 6,
      attributes: {
        "الحقيبة": "مينت",
        "الأدوات": "9 قطع",
      },
    },
    {
      code: "backpack-deluxe",
      label: "حقيبة ظهر ديلوكس",
      price: 760,
      comparePrice: 880,
      stock: 4,
      attributes: {
        "الحقيبة": "ظهر",
        "الأدوات": "12 قطعة",
      },
    },
  ],
);

export const KIDS_PLAY_PRODUCTS: Product[] = [
  buildKidsPlayProduct({
    id: "rocket-blocks-lab",
    slug: "rocket-blocks-lab",
    name: "مكعبات روكيت",
    description:
      "مكعبات تركيب كبيرة ومريحة لليد تفتح لعب طويل من غير زهق، وتساعد الطفل يبني ويجرب كل مرة بشكل جديد.",
    categoryKey: "building",
    price: 790,
    comparePrice: 930,
    tags: ["تركيب", "خشبي", "3+ سنوات"],
    relatedProductIds: [
      "woodland-train-blocks",
      "alphabet-puzzle-board",
      "splash-art-kit",
    ],
    bundleProductIds: ["alphabet-puzzle-board", "splash-art-kit"],
    variants: ROCKET_BLOCKS_VARIANTS,
    stock: 9,
    volumeDiscounts: buildToyVolumeDiscounts("rocket-blocks-lab"),
  }),
  buildKidsPlayProduct({
    id: "woodland-train-blocks",
    slug: "woodland-train-blocks",
    name: "قطار وودلاند الخشبي",
    description:
      "مسار قطار خشبي سهل التركيب يخلّي وقت اللعب أهدى ويشجع الطفل على التخيل والحكي خطوة بخطوة.",
    categoryKey: "building",
    price: 690,
    comparePrice: 830,
    tags: ["قطار", "خشبي", "خيال"],
    relatedProductIds: [
      "rocket-blocks-lab",
      "memory-match-board",
      "doctor-bear-kit",
    ],
    bundleProductIds: ["rocket-blocks-lab"],
    variants: WOODLAND_TRAIN_VARIANTS,
    stock: 8,
  }),
  buildKidsPlayProduct({
    id: "junior-scooter-lite",
    slug: "junior-scooter-lite",
    name: "سكوتر جونيور",
    description:
      "سكوتر ثابت بعجلات مريحة يطلع طاقة الأطفال بشكل ممتع، وينفع للعب اليومي جوه البيت أو بره.",
    categoryKey: "active",
    price: 1690,
    comparePrice: 1890,
    tags: ["سكوتر", "حركة", "4+ سنوات"],
    relatedProductIds: [
      "dream-play-tent",
      "rocket-blocks-lab",
      "splash-art-kit",
    ],
    bundleProductIds: ["dream-play-tent"],
    variants: JUNIOR_SCOOTER_VARIANTS,
    stock: 5,
  }),
  buildKidsPlayProduct({
    id: "dream-play-tent",
    slug: "dream-play-tent",
    name: "خيمة مغامرة منزلية",
    description:
      "ركن لعب سريع يتحول لخيمة حكي أو قراءة أو هدوء، ويدي الطفل مساحة يحب يرجعلها كل يوم.",
    categoryKey: "active",
    price: 1490,
    comparePrice: 1690,
    tags: ["خيمة", "غرفة أطفال", "ركن لعب"],
    relatedProductIds: [
      "junior-scooter-lite",
      "doctor-bear-kit",
      "memory-match-board",
    ],
    bundleProductIds: ["doctor-bear-kit"],
    variants: DREAM_TENT_VARIANTS,
    stock: 6,
  }),
  buildKidsPlayProduct({
    id: "alphabet-puzzle-board",
    slug: "alphabet-puzzle-board",
    name: "لوح حروف بازل",
    description:
      "لوح حروف سهل للمراجعة اليومية يربط الحرف بالشكل والصوت، ويدي الأهل هدية تعليمية مفيدة وجاهزة.",
    categoryKey: "learning",
    price: 520,
    comparePrice: 620,
    tags: ["حروف", "تعليم", "بازل"],
    relatedProductIds: [
      "memory-match-board",
      "rocket-blocks-lab",
      "splash-art-kit",
    ],
    bundleProductIds: ["memory-match-board", "splash-art-kit"],
    variants: ALPHABET_PUZZLE_VARIANTS,
    stock: 9,
    volumeDiscounts: buildToyVolumeDiscounts("alphabet-puzzle-board"),
  }),
  buildKidsPlayProduct({
    id: "memory-match-board",
    slug: "memory-match-board",
    name: "بطاقات ميموري ماتش",
    description:
      "بطاقات مطابقة سريعة تعلي التركيز والذاكرة، وتناسب اللعب القصير بين الإخوات من غير تجهيز.",
    categoryKey: "learning",
    price: 430,
    comparePrice: 520,
    tags: ["ذاكرة", "تركيز", "بطاقات"],
    relatedProductIds: [
      "alphabet-puzzle-board",
      "doctor-bear-kit",
      "dream-play-tent",
    ],
    bundleProductIds: ["alphabet-puzzle-board"],
    variants: MEMORY_MATCH_VARIANTS,
    stock: 10,
    volumeDiscounts: buildToyVolumeDiscounts("memory-match-board"),
  }),
  buildKidsPlayProduct({
    id: "splash-art-kit",
    slug: "splash-art-kit",
    name: "شنطة ألوان قابلة للغسل",
    description:
      "شنطة رسم عملية للبيت والزيارات، تخلّي النشاط جاهز في أي وقت وتساعد الأهل يختاروا النسخة المناسبة بسرعة.",
    categoryKey: "crafts",
    price: 470,
    comparePrice: 560,
    tags: ["رسم", "ألوان", "نشاط منزلي"],
    relatedProductIds: [
      "rocket-blocks-lab",
      "alphabet-puzzle-board",
      "doctor-bear-kit",
    ],
    bundleProductIds: ["alphabet-puzzle-board", "doctor-bear-kit"],
    variants: SPLASH_ART_VARIANTS,
    stock: 11,
    volumeDiscounts: buildToyVolumeDiscounts("splash-art-kit"),
  }),
  buildKidsPlayProduct({
    id: "doctor-bear-kit",
    slug: "doctor-bear-kit",
    name: "حقيبة الطبيب الدبدوب",
    description:
      "لعبة تمثيل محببة تشجع الطفل يحكي ويطمن على الكشف البسيط، وبتطلع هدية مضمونة للبنات والأولاد.",
    categoryKey: "pretend",
    price: 620,
    comparePrice: 720,
    tags: ["طبيب", "تمثيل", "هدية"],
    relatedProductIds: [
      "dream-play-tent",
      "memory-match-board",
      "splash-art-kit",
    ],
    bundleProductIds: ["dream-play-tent", "splash-art-kit"],
    variants: DOCTOR_BEAR_VARIANTS,
    stock: 7,
  }),
];

export const KIDS_PLAY_RECOMMENDATIONS = {
  related: {
    "rocket-blocks-lab": [
      "woodland-train-blocks",
      "alphabet-puzzle-board",
      "splash-art-kit",
    ],
    "woodland-train-blocks": [
      "rocket-blocks-lab",
      "memory-match-board",
      "doctor-bear-kit",
    ],
    "junior-scooter-lite": [
      "dream-play-tent",
      "rocket-blocks-lab",
      "splash-art-kit",
    ],
    "dream-play-tent": [
      "junior-scooter-lite",
      "doctor-bear-kit",
      "memory-match-board",
    ],
    "alphabet-puzzle-board": [
      "memory-match-board",
      "rocket-blocks-lab",
      "splash-art-kit",
    ],
    "memory-match-board": [
      "alphabet-puzzle-board",
      "doctor-bear-kit",
      "dream-play-tent",
    ],
    "splash-art-kit": [
      "rocket-blocks-lab",
      "alphabet-puzzle-board",
      "doctor-bear-kit",
    ],
    "doctor-bear-kit": [
      "dream-play-tent",
      "memory-match-board",
      "splash-art-kit",
    ],
  },
  boughtTogether: {
    "rocket-blocks-lab": ["alphabet-puzzle-board", "splash-art-kit"],
    "junior-scooter-lite": ["dream-play-tent", "splash-art-kit"],
    "alphabet-puzzle-board": ["memory-match-board", "splash-art-kit"],
    "doctor-bear-kit": ["dream-play-tent", "splash-art-kit"],
  },
} as const;

export const KIDS_PLAY_REVIEWS = {
  "rocket-blocks-lab": buildMarketplacePreviewReviewsResponse([
    {
      id: "rocket-blocks-lab-review-1",
      author: "منة شريف",
      date: "2026-04-18",
      createdAt: "2026-04-18",
      rating: 5,
      title: "الحجم واضح والقطع مريحة لليد",
      comment:
        "الصور كانت صادقة جدًا والقطع طلعت كبيرة ومناسبة لعمر 4 سنوات. أكثر شيء أعجبني أن النسخ موضحة بعدد القطع بوضوح.",
      verified: true,
      helpfulCount: 12,
    },
    {
      id: "rocket-blocks-lab-review-2",
      author: "إسراء عماد",
      date: "2026-04-24",
      createdAt: "2026-04-24",
      rating: 4,
      title: "نسخة 120 قطعة مناسبة للهديّة",
      comment:
        "اشترينا النسخة الموسعة وكانت كافية جدًا لبداية قوية. الصفحة ساعدتني أفهم الفرق بين الأساسي والموسع قبل الطلب.",
      verified: true,
      helpfulCount: 7,
    },
  ]),
  "junior-scooter-lite": buildMarketplacePreviewReviewsResponse([
    {
      id: "junior-scooter-lite-review-1",
      author: "سارة فؤاد",
      date: "2026-04-19",
      createdAt: "2026-04-19",
      rating: 5,
      title: "ثابت فعلًا ولونه مطابق",
      comment:
        "اخترنا الأزرق السماوي ووصل مطابق تقريبًا للصورة. الطفل ارتاح له من أول استخدام والعجلات كانت ثابتة.",
      verified: true,
      helpfulCount: 10,
    },
    {
      id: "junior-scooter-lite-review-2",
      author: "نورا عادل",
      date: "2026-04-25",
      createdAt: "2026-04-25",
      rating: 4,
      title: "مفيد للحركة اليومية",
      comment:
        "الخيار اللوني واضح، والوصف ساعدنا نختار المنتج المناسب لعمر 5 سنوات بدل شراء سكوتر أكبر من اللازم.",
      verified: true,
      helpfulCount: 5,
    },
  ]),
  "alphabet-puzzle-board": buildMarketplacePreviewReviewsResponse([
    {
      id: "alphabet-puzzle-board-review-1",
      author: "رنا سامح",
      date: "2026-04-17",
      createdAt: "2026-04-17",
      rating: 5,
      title: "النسخة الثنائية كانت الأوضح",
      comment:
        "كنت محتارة بين العربي والإنجليزي، والنسخة الثنائية وفرت عليا المقارنة. المنتج نفسه شكله مطمّن واللوح واضح.",
      verified: true,
      helpfulCount: 9,
    },
    {
      id: "alphabet-puzzle-board-review-2",
      author: "ياسمين رأفت",
      date: "2026-04-23",
      createdAt: "2026-04-23",
      rating: 4,
      title: "مفيد للتكرار اليومي",
      comment:
        "نستخدمه كل يوم 10 دقائق تقريبًا، والطفلة بدأت تحفظ شكل الحروف أسرع. أحببت أن العمر المقترح مكتوب بوضوح.",
      verified: true,
      helpfulCount: 6,
    },
  ]),
  "splash-art-kit": buildMarketplacePreviewReviewsResponse([
    {
      id: "splash-art-kit-review-1",
      author: "هدى فوزي",
      date: "2026-04-20",
      createdAt: "2026-04-20",
      rating: 5,
      title: "الألوان القابلة للغسل كانت فارقة",
      comment:
        "دي أول مرة أشتري طقم رسم وأنا مطمنة من وصف النسخة القابلة للغسل. الصور ادتني إحساس حقيقي بالنشاط ومش مجرد لقطة مصطنعة.",
      verified: true,
      helpfulCount: 11,
    },
    {
      id: "splash-art-kit-review-2",
      author: "بسمة صبري",
      date: "2026-04-26",
      createdAt: "2026-04-26",
      rating: 4,
      title: "نسخة الديلوكس تستحق فرق السعر",
      comment:
        "المريلة وعدد الألوان الأكبر كانوا مفيدين جدًا. تفاصيل النسخ واضحة، فمحتجتش أبعت أسأل قبل الشراء.",
      verified: true,
      helpfulCount: 5,
    },
  ]),
  "doctor-bear-kit": buildMarketplacePreviewReviewsResponse([
    {
      id: "doctor-bear-kit-review-1",
      author: "مريم إيهاب",
      date: "2026-04-16",
      createdAt: "2026-04-16",
      rating: 5,
      title: "هدية لطيفة ومفهومة من الصور",
      comment:
        "الطفلة فرحت بها جدًا، وميزة الحقيبة والأدوات كانت واضحة قبل الطلب. أحببت أنها لعبة تمثيلية هادئة وليست مزعجة.",
      verified: true,
      helpfulCount: 8,
    },
    {
      id: "doctor-bear-kit-review-2",
      author: "شيماء خالد",
      date: "2026-04-22",
      createdAt: "2026-04-22",
      rating: 4,
      title: "النسخ مذكورة بوضوح",
      comment:
        "اخترنا حقيبة الظهر لأن الأدوات أكثر. كان مهمًا بالنسبة لي أن الصفحة توضح عدد القطع حتى لا أطلب نسخة أقل من المتوقع.",
      verified: true,
      helpfulCount: 4,
    },
  ]),
} as const;
