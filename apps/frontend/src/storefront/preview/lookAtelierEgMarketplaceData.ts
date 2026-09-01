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
  ratingDistribution: Array<{ rating: number; count: number }>;
  summary: {
    averageRating: number;
    ratingDistribution: Array<{ rating: number; count: number }>;
  };
};

type CategoryKey =
  | "work"
  | "going-out"
  | "casual"
  | "evening"
  | "loungewear"
  | "weekend";

type RawProductColor = { name: string; file: string };

type RawProduct = {
  id: string;
  slug: string;
  name: string;
  categoryKey: CategoryKey;
  thumb: string;
  price: number;
  comparePrice: number;
  sizes: string[];
  colors: RawProductColor[];
};

const U = (id: string, w = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=${w}`;

// passthrough — our thumbs/colors are already full URLs
const asset = (file: string) => file;

const buildMarketplacePreviewReviewsResponse = (
  reviews: MarketplacePreviewProductReviewRecord[],
): MarketplacePreviewProductReviewsResponse => {
  const totalCount = reviews.length;
  const averageRating =
    totalCount > 0
      ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) /
        totalCount
      : 0;
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => Math.round(Number(r.rating) || 0) === rating)
      .length,
  }));
  return {
    reviews,
    totalCount,
    averageRating,
    ratingDistribution,
    summary: { averageRating, ratingDistribution },
  };
};

const atelierCategories = {
  work: { id: "work", name: "الشغل", slug: "work" },
  "going-out": { id: "going-out", name: "الخروجة", slug: "going-out" },
  casual: { id: "casual", name: "كاجوال", slug: "casual" },
  evening: { id: "evening", name: "العزومة", slug: "evening" },
  loungewear: { id: "loungewear", name: "البيت", slug: "loungewear" },
  weekend: { id: "weekend", name: "الويكند", slug: "weekend" },
} as const;

const RAW_PRODUCTS: RawProduct[] = [
  {
    id: "midi-flow-dress",
    slug: "midi-flow-dress",
    name: "فستان ميدي ساتان",
    categoryKey: "going-out",
    thumb: U("photo-1496747611176-843222e1e57c", 900),
    price: 1290,
    comparePrice: 1550,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "أوف وايت", file: U("photo-1496747611176-843222e1e57c", 700) },
      { name: "أخضر زيتي", file: U("photo-1509631179647-0177331693ae", 700) },
    ],
  },
  {
    id: "evening-gown",
    slug: "evening-gown",
    name: "فستان سهرة منسدل",
    categoryKey: "evening",
    thumb: U("photo-1509631179647-0177331693ae", 900),
    price: 1890,
    comparePrice: 2290,
    sizes: ["S", "M", "L"],
    colors: [
      { name: "تركواز", file: U("photo-1509631179647-0177331693ae", 700) },
      { name: "وردي", file: U("photo-1515886657613-9f3515b0c78f", 700) },
    ],
  },
  {
    id: "trench-coat",
    slug: "trench-coat",
    name: "ترنش طويل كلاسيك",
    categoryKey: "work",
    thumb: U("photo-1539109136881-3be0616acf4b", 900),
    price: 1450,
    comparePrice: 1700,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "بيج", file: U("photo-1539109136881-3be0616acf4b", 700) },
      { name: "كحلي", file: U("photo-1529139574466-a303027c1d8b", 700) },
    ],
  },
  {
    id: "high-waist-jeans",
    slug: "high-waist-jeans",
    name: "جينز عالي الخصر",
    categoryKey: "casual",
    thumb: U("photo-1541099649105-f69ad21f3246", 900),
    price: 780,
    comparePrice: 950,
    sizes: ["28", "30", "32", "34", "36"],
    colors: [
      { name: "أزرق غامق", file: U("photo-1541099649105-f69ad21f3246", 700) },
      { name: "أسود", file: U("photo-1469334031218-e382a71b716b", 700) },
    ],
  },
  {
    id: "silk-blouse",
    slug: "silk-blouse",
    name: "بلوزة حرير ناعمة",
    categoryKey: "work",
    thumb: U("photo-1529139574466-a303027c1d8b", 900),
    price: 640,
    comparePrice: 780,
    sizes: ["S", "M", "L"],
    colors: [
      { name: "أبيض", file: U("photo-1529139574466-a303027c1d8b", 700) },
      { name: "بيج", file: U("photo-1524504388940-b1c1722653e1", 700) },
    ],
  },
  {
    id: "lounge-set",
    slug: "lounge-set",
    name: "طقم ريلاكس قطني",
    categoryKey: "loungewear",
    thumb: U("photo-1485968579580-b6d095142e6e", 900),
    price: 520,
    comparePrice: 650,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "رمادي", file: U("photo-1485968579580-b6d095142e6e", 700) },
      { name: "بيج", file: U("photo-1490481651871-ab68de25d43d", 700) },
    ],
  },
  {
    id: "weekend-top",
    slug: "weekend-top",
    name: "توب كاجوال واسع",
    categoryKey: "weekend",
    thumb: U("photo-1469334031218-e382a71b716b", 900),
    price: 420,
    comparePrice: 540,
    sizes: ["S", "M", "L"],
    colors: [
      { name: "أبيض", file: U("photo-1469334031218-e382a71b716b", 700) },
      { name: "أسود", file: U("photo-1524504388940-b1c1722653e1", 700) },
    ],
  },
  {
    id: "oversized-blazer",
    slug: "oversized-blazer",
    name: "بليزر أوفرسايز",
    categoryKey: "work",
    thumb: U("photo-1524504388940-b1c1722653e1", 900),
    price: 980,
    comparePrice: 1180,
    sizes: ["S", "M", "L"],
    colors: [
      { name: "بيج", file: U("photo-1524504388940-b1c1722653e1", 700) },
      { name: "أسود", file: U("photo-1515886657613-9f3515b0c78f", 700) },
    ],
  },
];

const buildColorSizeVariants = (
  product: RawProduct,
): Array<Record<string, unknown>> =>
  product.colors.flatMap((color, colorIndex) =>
    product.sizes.map((size, sizeIndex) => ({
      id: `${product.id}-${color.name}-${size}`,
      name: `${color.name} / ${size}`,
      price: product.price,
      comparePrice: product.comparePrice,
      sku: `${product.id.toUpperCase()}-${color.name.toUpperCase()}-${size}`,
      image: asset(color.file),
      stock: Math.max(2, 12 - colorIndex - sizeIndex),
      attributes: { color: color.name, size },
      attributeValues: { color: color.name, size },
    })),
  );

const buildDescription = (product: RawProduct): string => {
  const category = atelierCategories[product.categoryKey];
  return `${product.name} — قطعة مختارة ضمن لوك ${category.name} في أتيليه. خامة مريحة ومقاسات واضحة، وقطع اللوك المكمّلة معروضة في نفس الصفحة.`;
};

const buildProduct = (product: RawProduct, index: number): Product => {
  const category = atelierCategories[product.categoryKey];
  const variantImages = product.colors.map((color) => asset(color.file));
  const images = Array.from(new Set([asset(product.thumb), ...variantImages]));
  const variants = buildColorSizeVariants(product);
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: buildDescription(product),
    price: product.price,
    comparePrice: product.comparePrice,
    images,
    imageUrl: images[0],
    mainImage: images[0],
    categoryId: category.id,
    category: { id: category.id, name: category.name, slug: category.slug },
    stock: Math.max(4, 18 - (index % 5)),
    tags: [category.name, "look-atelier", "look-based"],
    productVariants: variants,
    variants,
    rating: 4.6 + ((index % 4) * 0.1),
    reviewCount: 14 + index * 2,
    createdAt: "2026-08-30T09:00:00.000Z",
  };
};

export const LOOK_ATELIER_EG_PRODUCTS: Product[] = RAW_PRODUCTS.map(buildProduct);

const groupByCategory = RAW_PRODUCTS.reduce<Record<CategoryKey, string[]>>(
  (acc, p) => {
    acc[p.categoryKey].push(p.id);
    return acc;
  },
  { work: [], "going-out": [], casual: [], evening: [], loungewear: [], weekend: [] },
);

const buildRecommendationIds = (
  product: RawProduct,
  kind: "related" | "boughtTogether",
): string[] => {
  const sameCategory = groupByCategory[product.categoryKey].filter(
    (id) => id !== product.id,
  );
  const others = RAW_PRODUCTS.filter((p) => p.id !== product.id).map((p) => p.id);
  const pool =
    kind === "related"
      ? [...sameCategory, ...others]
      : [...others, ...sameCategory];
  return Array.from(new Set(pool)).slice(0, 3);
};

export const LOOK_ATELIER_EG_RECOMMENDATIONS = {
  related: Object.fromEntries(
    RAW_PRODUCTS.map((p) => [p.id, buildRecommendationIds(p, "related")]),
  ) as Record<string, string[]>,
  boughtTogether: Object.fromEntries(
    RAW_PRODUCTS.map((p) => [p.id, buildRecommendationIds(p, "boughtTogether")]),
  ) as Record<string, string[]>,
};

const REVIEW_AUTHORS = ["منى", "سارة", "هبة", "دينا", "ياسمين", "نورهان"] as const;

const REVIEW_COPY = [
  "المقاس جالي مظبوط والخامة أحلى من الصور، واللوك كامل وصلني زي ما كان متنسّق.",
  "أجمل حاجة إن قطع اللوك كانت معروضة جنب بعضها، ضفت الحذاء والشنطة في نفس الطلب ووفّرت.",
  "جودة ممتازة وسعر عادل، والتوصيل وصل في 48 ساعة زي ما قالوا بالظبط.",
  "كنت خايفة من المقاس، بس جدول المقاسات ساعدني وطلع مظبوط من أول مرة.",
  "التغليف فخم والقطعة شكلها أغلى من سعرها، هطلب تاني أكيد.",
] as const;

export const LOOK_ATELIER_EG_REVIEWS: Record<
  string,
  MarketplacePreviewProductReviewsResponse
> = Object.fromEntries(
  RAW_PRODUCTS.map((product, index) => {
    const firstAuthor = REVIEW_AUTHORS[index % REVIEW_AUTHORS.length];
    const secondAuthor = REVIEW_AUTHORS[(index + 2) % REVIEW_AUTHORS.length];
    return [
      product.id,
      buildMarketplacePreviewReviewsResponse([
        {
          id: `${product.id}-review-1`,
          author: firstAuthor,
          date: "2026-08-28",
          createdAt: "2026-08-28T10:00:00.000Z",
          rating: 5,
          title: "تجربة شراء ممتازة",
          comment: REVIEW_COPY[index % REVIEW_COPY.length],
          verified: true,
          helpfulCount: 4 + index,
        },
        {
          id: `${product.id}-review-2`,
          author: secondAuthor,
          date: "2026-08-25",
          createdAt: "2026-08-25T10:00:00.000Z",
          rating: 4,
          title: "جودة حلوة",
          comment:
            "القطعة وصلت في وقتها والمقاس مظبوط، والصور مطابقة للحقيقة.",
          verified: true,
          helpfulCount: 2 + (index % 5),
        },
      ]),
    ];
  }),
) as Record<string, MarketplacePreviewProductReviewsResponse>;
