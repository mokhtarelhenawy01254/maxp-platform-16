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
  media?: Array<{
    type: "image" | "video";
    url: string;
    poster?: string;
    alt?: string;
  }>;
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

const buildUnsplashImage = (photoId: string) =>
  `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=1200&q=80`;

const perfumeCategories = {
  fresh: { id: "fresh", name: "منعش وحمضي", slug: "fresh" },
  floral: { id: "floral", name: "زهري ناعم", slug: "floral" },
  amber: { id: "amber", name: "عنبر ودفء", slug: "amber" },
  woody: { id: "woody", name: "خشبي ومسك", slug: "woody" },
  gifts: { id: "gift-sets", name: "هدايا ومجموعات", slug: "gift-sets" },
};

const PERFUME_EG_GALLERIES = {
  "amber-veil-elixir": [
    buildUnsplashImage("1541643600914-78b084683601"),
    buildUnsplashImage("1523293182086-7651a899d37f"),
    buildUnsplashImage("1594035910387-fea47794261f"),
    buildUnsplashImage("1588405748880-12d1d2a59f75"),
  ],
  "citrus-dawn-edp": [
    buildUnsplashImage("1523293182086-7651a899d37f"),
    buildUnsplashImage("1594035910387-fea47794261f"),
    buildUnsplashImage("1541643600914-78b084683601"),
    buildUnsplashImage("1588405748880-12d1d2a59f75"),
  ],
  "velvet-rose-noir": [
    buildUnsplashImage("1594035910387-fea47794261f"),
    buildUnsplashImage("1541643600914-78b084683601"),
    buildUnsplashImage("1588405748880-12d1d2a59f75"),
    buildUnsplashImage("1523293182086-7651a899d37f"),
  ],
  "cedar-smoke-intense": [
    buildUnsplashImage("1588405748880-12d1d2a59f75"),
    buildUnsplashImage("1541643600914-78b084683601"),
    buildUnsplashImage("1594035910387-fea47794261f"),
    buildUnsplashImage("1523293182086-7651a899d37f"),
  ],
  "iris-musk-veil": [
    buildUnsplashImage("1523293182086-7651a899d37f"),
    buildUnsplashImage("1594035910387-fea47794261f"),
    buildUnsplashImage("1541643600914-78b084683601"),
    buildUnsplashImage("1588405748880-12d1d2a59f75"),
  ],
  "oud-nuit-reserve": [
    buildUnsplashImage("1588405748880-12d1d2a59f75"),
    buildUnsplashImage("1541643600914-78b084683601"),
    buildUnsplashImage("1523293182086-7651a899d37f"),
    buildUnsplashImage("1594035910387-fea47794261f"),
  ],
  "signature-discovery-set": [
    buildUnsplashImage("1615634260167-c8cdede054de"),
    buildUnsplashImage("1541643600914-78b084683601"),
    buildUnsplashImage("1594035910387-fea47794261f"),
    buildUnsplashImage("1588405748880-12d1d2a59f75"),
  ],
  "velvet-gift-box": [
    buildUnsplashImage("1615634260167-c8cdede054de"),
    buildUnsplashImage("1523293182086-7651a899d37f"),
    buildUnsplashImage("1594035910387-fea47794261f"),
    buildUnsplashImage("1588405748880-12d1d2a59f75"),
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
      "الحجم": size.label,
    },
    attributeValues: {
      "الحجم": size.label,
    },
  }));

const buildPerfumeProduct = ({
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
}: {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryKey: keyof typeof perfumeCategories;
  price: number;
  comparePrice?: number;
  tags?: string[];
  relatedProductIds?: string[];
  bundleProductIds?: string[];
  variants?: Array<Record<string, unknown>>;
  stock?: number;
}): Product => {
  const category = perfumeCategories[categoryKey];
  const images = PERFUME_EG_GALLERIES[id as keyof typeof PERFUME_EG_GALLERIES] || [];

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
    productVariants: variants,
    variants,
    createdAt: "2026-04-26T09:00:00.000Z",
  };
};

const AMBER_VEIL_VARIANTS = buildSizeVariants("amber-veil-elixir", "AT-AMBER", [
  {
    code: "50ml",
    label: "50 مل",
    price: 2350,
    comparePrice: 2690,
    image: PERFUME_EG_GALLERIES["amber-veil-elixir"][0],
    stock: 8,
  },
  {
    code: "100ml",
    label: "100 مل",
    price: 3490,
    comparePrice: 3890,
    image: PERFUME_EG_GALLERIES["amber-veil-elixir"][1],
    stock: 5,
  },
]);

const CITRUS_DAWN_VARIANTS = buildSizeVariants("citrus-dawn-edp", "AT-CITRUS", [
  {
    code: "50ml",
    label: "50 مل",
    price: 2190,
    comparePrice: 2490,
    image: PERFUME_EG_GALLERIES["citrus-dawn-edp"][0],
    stock: 9,
  },
  {
    code: "100ml",
    label: "100 مل",
    price: 3250,
    comparePrice: 3590,
    image: PERFUME_EG_GALLERIES["citrus-dawn-edp"][1],
    stock: 6,
  },
]);

const VELVET_ROSE_VARIANTS = buildSizeVariants("velvet-rose-noir", "AT-ROSE", [
  {
    code: "50ml",
    label: "50 مل",
    price: 2450,
    comparePrice: 2790,
    image: PERFUME_EG_GALLERIES["velvet-rose-noir"][0],
    stock: 7,
  },
  {
    code: "90ml",
    label: "90 مل",
    price: 3590,
    comparePrice: 3990,
    image: PERFUME_EG_GALLERIES["velvet-rose-noir"][1],
    stock: 4,
  },
]);

const CEDAR_SMOKE_VARIANTS = buildSizeVariants("cedar-smoke-intense", "AT-CEDAR", [
  {
    code: "75ml",
    label: "75 مل",
    price: 2790,
    comparePrice: 3090,
    image: PERFUME_EG_GALLERIES["cedar-smoke-intense"][0],
    stock: 6,
  },
  {
    code: "120ml",
    label: "120 مل",
    price: 3890,
    comparePrice: 4250,
    image: PERFUME_EG_GALLERIES["cedar-smoke-intense"][1],
    stock: 3,
  },
]);

const IRIS_MUSK_VARIANTS = buildSizeVariants("iris-musk-veil", "AT-IRIS", [
  {
    code: "50ml",
    label: "50 مل",
    price: 2290,
    comparePrice: 2550,
    image: PERFUME_EG_GALLERIES["iris-musk-veil"][0],
    stock: 9,
  },
  {
    code: "100ml",
    label: "100 مل",
    price: 3390,
    comparePrice: 3690,
    image: PERFUME_EG_GALLERIES["iris-musk-veil"][1],
    stock: 5,
  },
]);

const OUD_NUIT_VARIANTS = buildSizeVariants("oud-nuit-reserve", "AT-OUD", [
  {
    code: "60ml",
    label: "60 مل",
    price: 3190,
    comparePrice: 3550,
    image: PERFUME_EG_GALLERIES["oud-nuit-reserve"][0],
    stock: 5,
  },
  {
    code: "100ml",
    label: "100 مل",
    price: 4350,
    comparePrice: 4790,
    image: PERFUME_EG_GALLERIES["oud-nuit-reserve"][1],
    stock: 2,
  },
]);

const DISCOVERY_SET_VARIANTS = buildSizeVariants(
  "signature-discovery-set",
  "AT-DISCOVERY",
  [
    {
      code: "4x10",
      label: "4 × 10 مل",
      price: 1690,
      comparePrice: 1890,
      image: PERFUME_EG_GALLERIES["signature-discovery-set"][0],
      stock: 7,
    },
    {
      code: "8x2",
      label: "8 × 2 مل",
      price: 1290,
      comparePrice: 1490,
      image: PERFUME_EG_GALLERIES["signature-discovery-set"][1],
      stock: 8,
    },
  ],
);

const GIFT_BOX_VARIANTS = buildSizeVariants("velvet-gift-box", "AT-GIFT", [
  {
    code: "classic",
    label: "تغليف كلاسيك",
    price: 290,
    comparePrice: 350,
    image: PERFUME_EG_GALLERIES["velvet-gift-box"][0],
    stock: 20,
  },
  {
    code: "premium",
    label: "تغليف بريميوم",
    price: 420,
    comparePrice: 490,
    image: PERFUME_EG_GALLERIES["velvet-gift-box"][1],
    stock: 12,
  },
]);

export const PERFUME_EG_PRODUCTS: Product[] = [
  buildPerfumeProduct({
    id: "amber-veil-elixir",
    slug: "amber-veil-elixir",
    name: "Amber Veil Elixir",
    description:
      "عنبر دافي مع فانيلا خفيفة ولمسة زهر برتقال. اختيار مضمون لو عايزة عطر باين وثابت من غير ما يبقى تقيل.",
    categoryKey: "amber",
    price: 2350,
    comparePrice: 2690,
    tags: ["عنبر", "فانيلا", "أصلي", "نسائي"],
    relatedProductIds: ["oud-nuit-reserve", "iris-musk-veil", "velvet-rose-noir"],
    bundleProductIds: ["signature-discovery-set", "velvet-gift-box"],
    variants: AMBER_VEIL_VARIANTS,
    stock: 8,
  }),
  buildPerfumeProduct({
    id: "citrus-dawn-edp",
    slug: "citrus-dawn-edp",
    name: "Citrus Dawn EDP",
    description:
      "افتتاحية حمضية نضيفة مع زهر خفيف ومسك هادي. مناسب للصباح والشغل ولأي يوم عايزة فيه عطر منعش سهل يتكرر.",
    categoryKey: "fresh",
    price: 2190,
    comparePrice: 2490,
    tags: ["حمضي", "منعش", "صباحي"],
    relatedProductIds: ["iris-musk-veil", "amber-veil-elixir", "signature-discovery-set"],
    bundleProductIds: ["velvet-gift-box"],
    variants: CITRUS_DAWN_VARIANTS,
    stock: 9,
  }),
  buildPerfumeProduct({
    id: "velvet-rose-noir",
    slug: "velvet-rose-noir",
    name: "Velvet Rose Noir",
    description:
      "ورد أغمق مع فواكه حمرا ولمسة باتشولي. يدي إحساس شيك وأنثوي للسهرة والخروجات اللي عايزة حضور أوضح.",
    categoryKey: "floral",
    price: 2450,
    comparePrice: 2790,
    tags: ["وردي", "مسائي", "زهري"],
    relatedProductIds: ["amber-veil-elixir", "oud-nuit-reserve", "velvet-gift-box"],
    bundleProductIds: ["signature-discovery-set", "velvet-gift-box"],
    variants: VELVET_ROSE_VARIANTS,
    stock: 7,
  }),
  buildPerfumeProduct({
    id: "cedar-smoke-intense",
    slug: "cedar-smoke-intense",
    name: "Cedar Smoke Intense",
    description:
      "خشب أرز مع مسك وجلد ناعم. مناسب لو بتدوري على عطر مسائي بفخامة واضحة من أول رشة.",
    categoryKey: "woody",
    price: 2790,
    comparePrice: 3090,
    tags: ["خشبي", "مكثف", "مسائي"],
    relatedProductIds: ["oud-nuit-reserve", "amber-veil-elixir", "signature-discovery-set"],
    bundleProductIds: ["velvet-gift-box"],
    variants: CEDAR_SMOKE_VARIANTS,
    stock: 6,
  }),
  buildPerfumeProduct({
    id: "iris-musk-veil",
    slug: "iris-musk-veil",
    name: "Iris Musk Veil",
    description:
      "أيرس ومسك بلمسة بودر نضيفة. اختيار آمن لو عايزة عطر هادي شيك وسهل يتكرر كل يوم.",
    categoryKey: "floral",
    price: 2290,
    comparePrice: 2550,
    tags: ["مسك", "بودري", "ناعم"],
    relatedProductIds: ["citrus-dawn-edp", "amber-veil-elixir", "velvet-gift-box"],
    bundleProductIds: ["signature-discovery-set"],
    variants: IRIS_MUSK_VARIANTS,
    stock: 9,
  }),
  buildPerfumeProduct({
    id: "oud-nuit-reserve",
    slug: "oud-nuit-reserve",
    name: "Oud Nuit Reserve",
    description:
      "عود ناعم مع عنبر وتوابل خفيفة. قطعة فخمة للهدايا أو للسهرات لما تكوني عايزة ريحة ثابتة وشخصية.",
    categoryKey: "woody",
    price: 3190,
    comparePrice: 3550,
    tags: ["عود", "هدية", "مسائي"],
    relatedProductIds: ["cedar-smoke-intense", "amber-veil-elixir", "velvet-gift-box"],
    bundleProductIds: ["signature-discovery-set", "velvet-gift-box"],
    variants: OUD_NUIT_VARIANTS,
    stock: 5,
  }),
  buildPerfumeProduct({
    id: "signature-discovery-set",
    slug: "signature-discovery-set",
    name: "Signature Discovery Set",
    description:
      "مجموعة تجربة تسهّل عليكِ تختاري ريحتك المفضلة قبل الزجاجة الكاملة، ومناسبة جدًا كهدية أولى شيك.",
    categoryKey: "gifts",
    price: 1290,
    comparePrice: 1490,
    tags: ["مجموعة", "تجربة", "هدايا"],
    relatedProductIds: ["amber-veil-elixir", "citrus-dawn-edp", "velvet-rose-noir"],
    bundleProductIds: ["velvet-gift-box"],
    variants: DISCOVERY_SET_VARIANTS,
    stock: 8,
  }),
  buildPerfumeProduct({
    id: "velvet-gift-box",
    slug: "velvet-gift-box",
    name: "Velvet Gift Box",
    description:
      "تغليف هدايا شيك يرفع شكل الطلب من أول لحظة، مناسب للزجاجات أو المجموعات من غير تجهيز إضافي.",
    categoryKey: "gifts",
    price: 290,
    comparePrice: 350,
    tags: ["تغليف", "هدايا"],
    relatedProductIds: ["amber-veil-elixir", "velvet-rose-noir", "oud-nuit-reserve"],
    variants: GIFT_BOX_VARIANTS,
    stock: 20,
  }),
];

export const PERFUME_EG_RECOMMENDATIONS = {
  related: {
    "amber-veil-elixir": ["oud-nuit-reserve", "iris-musk-veil", "velvet-rose-noir"],
    "citrus-dawn-edp": ["iris-musk-veil", "amber-veil-elixir", "signature-discovery-set"],
    "velvet-rose-noir": ["amber-veil-elixir", "oud-nuit-reserve", "velvet-gift-box"],
    "cedar-smoke-intense": ["oud-nuit-reserve", "amber-veil-elixir", "signature-discovery-set"],
    "iris-musk-veil": ["citrus-dawn-edp", "amber-veil-elixir", "velvet-gift-box"],
    "oud-nuit-reserve": ["cedar-smoke-intense", "amber-veil-elixir", "velvet-gift-box"],
    "signature-discovery-set": ["amber-veil-elixir", "citrus-dawn-edp", "velvet-rose-noir"],
  },
  boughtTogether: {
    "amber-veil-elixir": ["velvet-gift-box", "signature-discovery-set"],
    "velvet-rose-noir": ["velvet-gift-box", "signature-discovery-set"],
    "oud-nuit-reserve": ["velvet-gift-box", "signature-discovery-set"],
    "signature-discovery-set": ["velvet-gift-box"],
  },
} as const;

export const PERFUME_EG_REVIEWS = {
  "iris-musk-veil": buildMarketplacePreviewReviewsResponse([
    {
      id: "iris-musk-veil-review-1",
      author: "مها عادل",
      date: "2026-04-13",
      createdAt: "2026-04-13",
      rating: 5,
      title: "ناعم وواضح من غير إزعاج",
      comment:
        "ريحته هادئة فعلًا وقريبة، والـ 50 مل كانت اختيار ممتاز للتجربة اليومية. الصور طابقت الزجاجة في الحقيقة.",
      verified: true,
      helpfulCount: 10,
    },
    {
      id: "iris-musk-veil-review-2",
      author: "رنا شريف",
      date: "2026-04-21",
      createdAt: "2026-04-21",
      rating: 4,
      title: "حجم 100 مل يستحق الفرق",
      comment:
        "الثبات جيد جدًا على الملابس، والانتقال من 50 مل إلى 100 مل كان واضح في السعر والحجم بدون لخبطة.",
      verified: true,
      helpfulCount: 6,
    },
  ]),
  "amber-veil-elixir": buildMarketplacePreviewReviewsResponse([
    {
      id: "amber-veil-elixir-review-1",
      author: "هنا عمرو",
      date: "2026-04-14",
      createdAt: "2026-04-14",
      rating: 5,
      title: "ثابت وريحته دافئة فعلًا",
      comment:
        "العطر دافئ وواضح من أول رشة، و50 مل كانت مناسبة جدًا للتجربة قبل ما أرجع للحجم الأكبر.",
      verified: true,
      helpfulCount: 12,
    },
    {
      id: "amber-veil-elixir-review-2",
      author: "نور إيهاب",
      date: "2026-04-20",
      createdAt: "2026-04-20",
      rating: 4,
      title: "الصور ساعدتني أفهم الزجاجة",
      comment:
        "الصور كانت صادقة، والحجم 100 مل فرق السعر فيه واضح. ريحته أنيقة ومناسبة للهدية أيضًا.",
      verified: true,
      helpfulCount: 7,
    },
  ]),
  "velvet-rose-noir": buildMarketplacePreviewReviewsResponse([
    {
      id: "velvet-rose-noir-review-1",
      author: "مي شاهين",
      date: "2026-04-16",
      createdAt: "2026-04-16",
      rating: 5,
      title: "أنثوي وشيك للمساء",
      comment:
        "الورد ظاهر لكن مش قديم، وفيه لمسة أغمق فعلًا خلت العطر مناسب للخروجات والمساء.",
      verified: true,
      helpfulCount: 9,
    },
    {
      id: "velvet-rose-noir-review-2",
      author: "سلمى خالد",
      date: "2026-04-22",
      createdAt: "2026-04-22",
      rating: 4,
      title: "التغليف والهديّة طالعين ممتاز",
      comment:
        "طلبته مع علبة الهدايا ووصل شكله مرتب جدًا. الثبات جيد والـ 90 مل تستحق فرق السعر.",
      verified: true,
      helpfulCount: 5,
    },
  ]),
  "signature-discovery-set": buildMarketplacePreviewReviewsResponse([
    {
      id: "signature-discovery-set-review-1",
      author: "ياسمين فؤاد",
      date: "2026-04-15",
      createdAt: "2026-04-15",
      rating: 5,
      title: "فكرة ممتازة قبل اختيار الزجاجة",
      comment:
        "مفيدة جدًا لو محتارة بين أكثر من طابع. جرّبت منها أكثر من شخصية وبعدها طلبت الحجم الكامل بسهولة.",
      verified: true,
      helpfulCount: 11,
    },
    {
      id: "signature-discovery-set-review-2",
      author: "دعاء فوزي",
      date: "2026-04-23",
      createdAt: "2026-04-23",
      rating: 4,
      title: "تنفع هدية أولى",
      comment:
        "شكلها مرتب جدًا ومناسبة كهدية بسيطة لكن شيك، خصوصًا مع تغليف الهدايا.",
      verified: true,
      helpfulCount: 4,
    },
  ]),
  "citrus-dawn-edp": buildMarketplacePreviewReviewsResponse([
    {
      id: "citrus-dawn-edp-review-1",
      author: "دينا سامح",
      date: "2026-04-12",
      createdAt: "2026-04-12",
      rating: 5,
      title: "منعش فعلًا للصباح",
      comment:
        "ريحته نظيفة ومريحة جدًا للشغل والصباح، والـ 50 مل كانت مناسبة كتجربة أولى قبل الحجم الكبير.",
      verified: true,
      helpfulCount: 8,
    },
    {
      id: "citrus-dawn-edp-review-2",
      author: "سارة عمر",
      date: "2026-04-24",
      createdAt: "2026-04-24",
      rating: 4,
      title: "واضح ومش مزعج",
      comment:
        "الحمضيات واضحة لكن مش حادة، والسعر مقابل الحجم 100 مل كان مفهوم جدًا من الصفحة.",
      verified: true,
      helpfulCount: 5,
    },
  ]),
  "oud-nuit-reserve": buildMarketplacePreviewReviewsResponse([
    {
      id: "oud-nuit-reserve-review-1",
      author: "نهى ربيع",
      date: "2026-04-18",
      createdAt: "2026-04-18",
      rating: 5,
      title: "ثابت ومناسب للهدايا",
      comment:
        "ريحة أهدأ من العود الثقيل المعتاد، ومناسبة جدًا لو عايزة هدية شكلها راقٍ ومضمونة.",
      verified: true,
      helpfulCount: 7,
    },
    {
      id: "oud-nuit-reserve-review-2",
      author: "هدير أشرف",
      date: "2026-04-25",
      createdAt: "2026-04-25",
      rating: 4,
      title: "أنيق للمساء",
      comment:
        "أكثر عطر حسيته مناسب للمساء والطلعات. الحجم 100 مل واضح وسهل المقارنة مع الحجم الأصغر.",
      verified: true,
      helpfulCount: 4,
    },
  ]),
} as const;
