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

const buildThemeAssetImage = (file: string) => `/assets/themes/fastly-eg/${file}`;

const fastlyCategories = {
  featuredDeals: {
    id: "featured-deals",
    name: "عروض المتجر",
    slug: "featured-deals",
  },
} as const;

const FASTLY_GALLERIES = {
  "moon-prayer-rug-speaker": [
    buildThemeAssetImage("products/offer-prayer-rug-moon-speaker.png"),
  ],
  "bubble-maker-double-pack": [
    buildThemeAssetImage("products/offer-bubble-maker.jpg"),
  ],
  "flex-tape-triple-pack": [
    buildThemeAssetImage("products/offer-flex-tape.jpg"),
  ],
  "orange-cutter-qatayef-set": [
    buildThemeAssetImage("products/offer-orange-cutter-qatayef.png"),
  ],
  "crystal-lamp-party-curtain-set": [
    buildThemeAssetImage("products/offer-crystal-lamp-curtain.jpg"),
  ],
  "double-prayer-rug-set": [
    buildThemeAssetImage("products/offer-two-prayer-rugs.jpg"),
  ],
  "twelve-prayer-rugs-offer": [
    buildThemeAssetImage("products/offer-twelve-prayer-rugs.png"),
  ],
  "espresso-machine-grinder-set": [
    buildThemeAssetImage("products/offer-espresso-mill.jpg"),
  ],
  "cooling-towels-set": [
    buildThemeAssetImage("products/offer-cooling-towels.jpg"),
  ],
  "solar-garden-lights-triple-pack": [
    buildThemeAssetImage("products/offer-solar-lights.png"),
  ],
} as const;

const buildProduct = ({
  id,
  slug,
  name,
  description,
  price,
  stock = 20,
  relatedProductIds = [],
}: {
  id: keyof typeof FASTLY_GALLERIES;
  slug: string;
  name: string;
  description: string;
  price: number;
  stock?: number;
  relatedProductIds?: string[];
}): Product => {
  const category = fastlyCategories.featuredDeals;
  const images = FASTLY_GALLERIES[id] || [];

  return {
    id,
    slug,
    name,
    description,
    price,
    images,
    imageUrl: images[0],
    mainImage: images[0],
    categoryId: category.id,
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
    },
    stock,
    tags: ["Fastly", "عروض", "جاهز للطلب"],
    relatedProductIds,
    createdAt: "2026-04-27T10:00:00.000Z",
  };
};

export const FASTLY_EG_PRODUCTS: Product[] = [
  buildProduct({
    id: "moon-prayer-rug-speaker",
    slug: "ardh-sjadh-slah-btkayh-mkbr-swt-ltlawh-alqraan-wmsbah-ala-hyeh-qmr",
    name: "عرض سجادة صلاة بتكاية + مكبر صوت لتلاوة القرآن ومصباح على هيئة قمر",
    description:
      "عرض منزلي جاهز يجمع بين سجادة الصلاة، سماعة التلاوة، ومصباح القمر في باقة واحدة.",
    price: 180,
    relatedProductIds: [
      "double-prayer-rug-set",
      "twelve-prayer-rugs-offer",
      "crystal-lamp-party-curtain-set",
    ],
  }),
  buildProduct({
    id: "bubble-maker-double-pack",
    slug: "ardh-hbtyn-sana-fqaaat-alalaab-alnaryh-12-fthh",
    name: "• عرض حبتين صانع فقاعات الألعاب النارية 12 فتحة",
    description:
      "عرض ترفيهي للأطفال بحبتين من صانع الفقاعات لتجربة لعب أسرع وتجهيز هدية جاهزة.",
    price: 90,
    relatedProductIds: [
      "solar-garden-lights-triple-pack",
      "cooling-towels-set",
      "orange-cutter-qatayef-set",
    ],
  }),
  buildProduct({
    id: "flex-tape-triple-pack",
    slug: "ardh-thlath-hbat-shryt-lasq-mtaty-mqawm-llmaa-mn-flyks-tyb",
    name: "عرض ثلاث حبات شريط لاصق مطاطي مقاوم للماء من فليكس تيب",
    description:
      "ثلاث قطع من الشريط المقاوم للماء لأعمال الإصلاح السريعة داخل البيت أو الحديقة.",
    price: 100,
    relatedProductIds: [
      "solar-garden-lights-triple-pack",
      "espresso-machine-grinder-set",
      "crystal-lamp-party-curtain-set",
    ],
  }),
  buildProduct({
    id: "orange-cutter-qatayef-set",
    slug: "ardh-asarh-w-qtaah-brtqal-sanah-qtayf-rmdhan-shlh-alastkhdam",
    name: "عرض عصارة و قطاعة برتقال + صانعة قطايف رمضان سهلة الاستخدام",
    description:
      "عدة مطبخ عملية تجمع بين العصارة والقطاعة وصانعة القطايف للاستخدام اليومي السريع.",
    price: 225,
    relatedProductIds: [
      "espresso-machine-grinder-set",
      "cooling-towels-set",
      "flex-tape-triple-pack",
    ],
  }),
  buildProduct({
    id: "crystal-lamp-party-curtain-set",
    slug: "ardh-abjwrh-krystal-brymwt-starh-alhflat-bdhman-2-aam",
    name: "عرض ابجورة كريستال بريموت + ستارة الحفلات بضمان 2 عام",
    description:
      "إضاءة ديكورية منزلية مع ريموت وستارة حفلات لتجهيز الزينة بسرعة ولمسة أوضح.",
    price: 130,
    relatedProductIds: [
      "moon-prayer-rug-speaker",
      "solar-garden-lights-triple-pack",
      "double-prayer-rug-set",
    ],
  }),
  buildProduct({
    id: "double-prayer-rug-set",
    slug: "ardh-hbtyn-sjadh-slah-btkayh",
    name: "عرض حبتين سجادة صلاة بتكاية",
    description:
      "حبتان من سجادة الصلاة بتكاية في عرض مباشر مناسب للهدايا أو تجهيزات المنزل.",
    price: 130,
    relatedProductIds: [
      "moon-prayer-rug-speaker",
      "twelve-prayer-rugs-offer",
      "crystal-lamp-party-curtain-set",
    ],
  }),
  buildProduct({
    id: "twelve-prayer-rugs-offer",
    slug: "ardh-12-sjadh-slah",
    name: "• عرض 12 سجادة صلاة",
    description:
      "عرض كمية أكبر من سجاجيد الصلاة مناسب للتجهيزات الجماعية والهدايا الموسمية.",
    price: 240,
    relatedProductIds: [
      "double-prayer-rug-set",
      "moon-prayer-rug-speaker",
      "crystal-lamp-party-curtain-set",
    ],
  }),
  buildProduct({
    id: "espresso-machine-grinder-set",
    slug: "ardh-makynh-sna-alasbrysw-mthnh-albn-alyabanyh-bdhman-aam",
    name: "عرض  ماكينة صنع الاسبريسو +مطحنة البن اليابانية بضمان عام",
    description:
      "عرض مطبخ متكامل لعشاق القهوة يجمع ماكينة الاسبريسو مع مطحنة البن في طلب واحد.",
    price: 500,
    relatedProductIds: [
      "orange-cutter-qatayef-set",
      "flex-tape-triple-pack",
      "solar-garden-lights-triple-pack",
    ],
  }),
  buildProduct({
    id: "cooling-towels-set",
    slug: "ardh-3-qta-almnshfh-althljyh",
    name: "عرض 3 قطع المنشفة الثلجية",
    description:
      "ثلاث قطع من المنشفة الثلجية للاستخدام الرياضي أو اليومي مع طلب سريع وسعر مباشر.",
    price: 100,
    relatedProductIds: [
      "bubble-maker-double-pack",
      "orange-cutter-qatayef-set",
      "solar-garden-lights-triple-pack",
    ],
  }),
  buildProduct({
    id: "solar-garden-lights-triple-pack",
    slug: "ardh-thlath-hbat-kshaf-taqh-shmsyh-llhdaeq",
    name: "عرض ثلاث حبات كشاف طاقة شمسية للحدائق",
    description:
      "إضاءة حديقة عملية بثلاث وحدات طاقة شمسية لسهولة التركيب واستخدام يومي مباشر.",
    price: 100,
    relatedProductIds: [
      "crystal-lamp-party-curtain-set",
      "flex-tape-triple-pack",
      "bubble-maker-double-pack",
    ],
  }),
];

export const FASTLY_EG_RECOMMENDATIONS = {
  related: Object.fromEntries(
    FASTLY_EG_PRODUCTS.map((product) => [product.id, product.relatedProductIds || []]),
  ) as Record<string, string[]>,
  boughtTogether: {
    "moon-prayer-rug-speaker": [
      "double-prayer-rug-set",
      "twelve-prayer-rugs-offer",
    ],
    "bubble-maker-double-pack": [
      "cooling-towels-set",
      "solar-garden-lights-triple-pack",
    ],
    "flex-tape-triple-pack": [
      "solar-garden-lights-triple-pack",
      "crystal-lamp-party-curtain-set",
    ],
    "orange-cutter-qatayef-set": [
      "espresso-machine-grinder-set",
      "cooling-towels-set",
    ],
    "crystal-lamp-party-curtain-set": [
      "solar-garden-lights-triple-pack",
      "moon-prayer-rug-speaker",
    ],
    "double-prayer-rug-set": [
      "moon-prayer-rug-speaker",
      "twelve-prayer-rugs-offer",
    ],
    "twelve-prayer-rugs-offer": [
      "double-prayer-rug-set",
      "moon-prayer-rug-speaker",
    ],
    "espresso-machine-grinder-set": [
      "orange-cutter-qatayef-set",
      "flex-tape-triple-pack",
    ],
    "cooling-towels-set": [
      "bubble-maker-double-pack",
      "orange-cutter-qatayef-set",
    ],
    "solar-garden-lights-triple-pack": [
      "crystal-lamp-party-curtain-set",
      "flex-tape-triple-pack",
    ],
  } as Record<string, string[]>,
};

const FASTLY_REVIEW_COPY = [
  {
    author: "أحمد خالد",
    comment: "الطلب وصل بسرعة والمنتج مطابق للصورة، والتجربة كانت مباشرة جدًا.",
  },
  {
    author: "سارة عماد",
    comment: "الكارت واضح والسعر ظاهر من أول نظرة، وده خلاني أطلب بدون لف كثير.",
  },
  {
    author: "محمد طارق",
    comment: "التجربة سريعة والمنتج كويس بالنسبة للسعر، خصوصًا في العروض الجاهزة.",
  },
] as const;

export const FASTLY_EG_REVIEWS: Record<
  string,
  MarketplacePreviewProductReviewsResponse
> = Object.fromEntries(
  FASTLY_EG_PRODUCTS.map((product, index) => {
    const copy = FASTLY_REVIEW_COPY[index % FASTLY_REVIEW_COPY.length];

    return [
      product.id,
      buildMarketplacePreviewReviewsResponse([
        {
          id: `${product.id}-review-1`,
          author: copy.author,
          date: "2026-04-24",
          createdAt: "2026-04-24T12:00:00.000Z",
          rating: 5 - (index % 2),
          title: "تجربة سريعة",
          comment: copy.comment,
          verified: true,
          helpfulCount: 3 + index,
        },
      ]),
    ];
  }),
) as Record<string, MarketplacePreviewProductReviewsResponse>;
