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
    summary: { averageRating, ratingDistribution },
  };
};

const cdn = (file: string, width = 900) =>
  `https://texture-a2xirfpg.myshopify.com/cdn/shop/files/${file}?v=1787655842&width=${width}`;

type CategoryKey =
  | "womens"
  | "mens"
  | "kids"
  | "casual-look"
  | "office-wear"
  | "party-night"
  | "vacation-style";

const categories: Record<CategoryKey, { id: string; name: string; slug: string; image: string }> = {
  womens: { id: "womens", name: "Women in Style", slug: "womens", image: cdn("fashion-portrait-young-elegant-woman_1_3.png") },
  mens: { id: "mens", name: "Men in Style", slug: "mens", image: cdn("fashion-portrait-young-elegant-woman_1_2.png") },
  kids: { id: "kids", name: "Little Style", slug: "kids", image: cdn("fashion-portrait-young-elegant-woman_6.png") },
  "casual-look": { id: "casual-look", name: "Casual Look", slug: "casual-look", image: cdn("Rectangle_45421_1.png", 700) },
  "office-wear": { id: "office-wear", name: "Workwear Edit", slug: "office-wear", image: cdn("Rectangle_45422.png", 700) },
  "party-night": { id: "party-night", name: "Party & Evening", slug: "party-night", image: cdn("Rectangle_45423.png", 700) },
  "vacation-style": { id: "vacation-style", name: "Holiday & Resort", slug: "vacation-style", image: cdn("Rectangle_45424.png", 700) },
};

type RawProduct = {
  id: string;
  name: string;
  categoryKey: CategoryKey;
  thumb: string;
  price: number;
  comparePrice?: number;
  variantColors: string[];
  sizes: string[];
  gallery?: string[];
};

const SIZES = ["XS", "S", "M", "L", "XL", "2XL"];

const RAW_PRODUCTS: RawProduct[] = [
  {
    id: "classic-white-belted-shirt-dress",
    name: "Classic White Belted Shirt Dress",
    categoryKey: "womens",
    thumb: "white-pinstripe-blazer-dress.png",
    price: 491,
    comparePrice: 565,
    variantColors: ["ofw", "black", "navy", "beige", "gray"],
    sizes: ["S", "M", "L", "XL", "2XL"],
    gallery: ["white-pinstripe-blazer-dress.png", "Rectangle96_5.png", "Rectangle93_3.png", "Rectangle96_4.png"],
  },
  {
    id: "mens-mustard-casual-jacket",
    name: "Men's Mustard Casual Jacket",
    categoryKey: "mens",
    thumb: "Rectangle45497.png",
    price: 348,
    variantColors: ["yellow", "navy", "black", "wine"],
    sizes: ["XS", "S", "M", "L", "XL"],
    gallery: ["Rectangle45497.png", "Rectangle45493_4.png", "Rectangle45458.png"],
  },
  {
    id: "chic-twist-crop-top",
    name: "Chic Twist Crop Top",
    categoryKey: "womens",
    thumb: "Rectangle_45453.png",
    price: 274,
    comparePrice: 321,
    variantColors: ["black", "beige", "pink", "gray"],
    sizes: ["S", "M", "L", "XL", "2XL"],
    gallery: ["Rectangle_45453.png", "Rectangle_45486.png", "Rectangle_45472.png"],
  },
  {
    id: "tropical-summer-cami-top",
    name: "Tropical Summer Cami Top",
    categoryKey: "womens",
    thumb: "Rectangle_45456.png",
    price: 327,
    variantColors: ["blue", "yellow", "pink"],
    sizes: ["XS", "S", "M", "L", "XL"],
    gallery: ["Rectangle_45456.png", "Rectangle_45485.png", "Rectangle_45487.png"],
  },
  {
    id: "urban-rider-leather-jacket",
    name: "Urban Rider Leather Jacket",
    categoryKey: "mens",
    thumb: "Rectangle_33_12.png",
    price: 380,
    variantColors: ["brown", "black", "bronze", "navy"],
    sizes: ["M", "L", "XL"],
    gallery: ["Rectangle_33_12.png", "Rectangle_45443.png", "Rectangle_45445.png"],
  },
  {
    id: "garden-day-white-maxi-dress",
    name: "Garden Day White Maxi Dress",
    categoryKey: "womens",
    thumb: "Rectangle45524_1.png",
    price: 381,
    variantColors: ["white", "cream"],
    sizes: ["XS", "S", "M", "L", "XL"],
    gallery: ["Rectangle45524_1.png", "Rectangle45525_1.png", "Rectangle45526_1.png"],
  },
  {
    id: "meadow-dot-wrap-midi-dress",
    name: "Meadow Dot Wrap Midi Dress",
    categoryKey: "womens",
    thumb: "Rectangle45530_1.png",
    price: 263,
    variantColors: ["white", "mint"],
    sizes: ["XS", "S", "M", "L", "XL"],
    gallery: ["Rectangle45530_1.png", "Rectangle45531_1.png"],
  },
  {
    id: "printed-halter-neck-dress",
    name: "Printed Halter Neck Dress",
    categoryKey: "womens",
    thumb: "Rectangle45447_38d712c4-04e8-4294-b8be-c52c853228fa.png",
    price: 263,
    variantColors: ["floral", "pink"],
    sizes: ["S", "M", "L", "XL"],
    gallery: ["Rectangle45447_38d712c4-04e8-4294-b8be-c52c853228fa.png", "Rectangle45465_c5da856a-3f40-4483-98a8-b49a89f2bad7.png"],
  },
  {
    id: "elara-satin-evening-gown",
    name: "Elara Satin Evening Gown",
    categoryKey: "party-night",
    thumb: "red-satin-mermaid-gown.png",
    price: 252,
    comparePrice: 300,
    variantColors: ["red", "black", "green", "wine"],
    sizes: ["XS", "S", "M", "L"],
    gallery: ["red-satin-mermaid-gown.png", "black-satin-mermaid-gown.png", "bottle-green-satin-mermaid-gown.png"],
  },
  {
    id: "lace-overlay-mermaid-gown",
    name: "Lace Overlay Mermaid Gown",
    categoryKey: "party-night",
    thumb: "navy-lace-evening-gown.png",
    price: 385,
    variantColors: ["navy", "blush", "burgundy", "emerald"],
    sizes: ["XS", "S", "M", "L"],
    gallery: ["navy-lace-evening-gown.png", "blush-pink-lace-mermaid-gown.png", "burgundy-lace-mermaid-gown.png"],
  },
  {
    id: "tailored-brown-formal-suit",
    name: "Tailored Brown Formal Suit",
    categoryKey: "office-wear",
    thumb: "Rectangle_45451.png",
    price: 348,
    comparePrice: 460,
    variantColors: ["brown", "navy", "white", "gray"],
    sizes: ["S", "M", "L", "XL"],
    gallery: ["Rectangle_45451.png", "Rectangle_45470.png", "Rectangle_45488.png"],
  },
  {
    id: "modern-wool-overcoat",
    name: "Modern Wool Overcoat",
    categoryKey: "mens",
    thumb: "Rectangle_45454.png",
    price: 487,
    variantColors: ["brown", "gray", "white"],
    sizes: ["M", "L", "XL"],
    gallery: ["Rectangle_45454.png", "Rectangle_45473.png"],
  },
  {
    id: "unisex-casual-pullover-hoodie",
    name: "Unisex Casual Pullover Hoodie",
    categoryKey: "casual-look",
    thumb: "hoodie-royal-blue-1000x1000.png",
    price: 65,
    variantColors: ["blue", "maroon", "black", "pink"],
    sizes: ["XS", "S", "M", "L", "XL"],
    gallery: ["hoodie-royal-blue-1000x1000.png", "hoodie-black-1000x1000.png", "hoodie-pastel-pink-female-model.png"],
  },
  {
    id: "classic-belted-trench-coat-set",
    name: "Classic Belted Trench Coat Set",
    categoryKey: "casual-look",
    thumb: "camel-trench-coat-outfit.png",
    price: 252,
    comparePrice: 296,
    variantColors: ["camel", "black", "olive"],
    sizes: ["S", "M", "L", "XL"],
    gallery: ["camel-trench-coat-outfit.png", "black-trench-coat-outfit.png", "olive-green-trench-coat-outfit.png"],
  },
  {
    id: "little-sunshine-ruffle-dress",
    name: "Little Sunshine Ruffle Dress",
    categoryKey: "kids",
    thumb: "Rectangle45542.png",
    price: 168,
    variantColors: ["yellow", "pink"],
    sizes: ["3-4y", "5-6y", "8-9y"],
    gallery: ["Rectangle45542.png"],
  },
  {
    id: "casual-autumn-girls-outfit",
    name: "Casual Autumn Girls Outfit",
    categoryKey: "kids",
    thumb: "graphic-shirt-trendy-design-mockup8.png",
    price: 118,
    variantColors: ["camel", "gray"],
    sizes: ["4-5y", "5-6y", "8-9y"],
    gallery: ["graphic-shirt-trendy-design-mockup8.png"],
  },
  {
    id: "little-gentleman-suspender-set",
    name: "Little Gentleman Suspender Set",
    categoryKey: "kids",
    thumb: "graphic-shirt-trendy-design-mockup7.png",
    price: 121,
    variantColors: ["gray", "navy"],
    sizes: ["3-4y", "4-5y", "5-6y"],
    gallery: ["graphic-shirt-trendy-design-mockup7.png"],
  },
  {
    id: "classic-kids-summer-hat",
    name: "Classic Kids Summer Hat",
    categoryKey: "kids",
    thumb: "graphic-shirt-trendy-design-mockup11_03ec01d7-7d2d-497c-b857-7f40b4e2b784.png",
    price: 161,
    variantColors: ["natural", "beige"],
    sizes: ["3-4y", "5-6y"],
    gallery: ["graphic-shirt-trendy-design-mockup11_03ec01d7-7d2d-497c-b857-7f40b4e2b784.png"],
  },
  {
    id: "vacation-look-dress",
    name: "Summer Vacation Girls Dress",
    categoryKey: "vacation-style",
    thumb: "graphic-shirt-trendy-design-mockup14.png",
    price: 202,
    comparePrice: 240,
    variantColors: ["floral", "turquoise"],
    sizes: ["3-4y", "5-6y", "8-9y"],
    gallery: ["graphic-shirt-trendy-design-mockup14.png"],
  },
  {
    id: "autumn-bloom-rust-dress",
    name: "Autumn Bloom Rust Dress",
    categoryKey: "casual-look",
    thumb: "Rectangle45534_3.png",
    price: 491,
    variantColors: ["rust", "terracotta"],
    sizes: ["S", "M", "L"],
    gallery: ["Rectangle45534_3.png", "Rectangle45533_2.png", "Rectangle45532_2.png"],
  },
  {
    id: "ruby-lane-red-cardigan",
    name: "Ruby Lane Red Cardigan",
    categoryKey: "womens",
    thumb: "Rectangle45535.png",
    price: 391,
    variantColors: ["red", "burgundy"],
    sizes: ["S", "M", "L"],
    gallery: ["Rectangle45535.png", "Rectangle45536_1.png", "Rectangle45537_1.png"],
  },
  {
    id: "autumn-harvest-layered-dress",
    name: "Autumn Harvest Layered Dress",
    categoryKey: "womens",
    thumb: "Rectangle45538_1.png",
    price: 609,
    variantColors: ["olive", "terracotta"],
    sizes: ["S", "M", "L"],
    gallery: ["Rectangle45538_1.png", "Rectangle45539_1.png", "Rectangle45540_1.png"],
  },
  {
    id: "mens-classic-heritage-blazer",
    name: "Men's Classic Heritage Blazer",
    categoryKey: "office-wear",
    thumb: "Rectangle45541_1.png",
    price: 310,
    variantColors: ["camel", "navy"],
    sizes: ["S", "M", "L", "XL"],
    gallery: ["Rectangle45541_1.png"],
  },
  {
    id: "burgundy-check-casual-shirt",
    name: "Burgundy Check Casual Shirt",
    categoryKey: "mens",
    thumb: "Rectangle45459.png",
    price: 203,
    variantColors: ["burgundy", "white", "gray"],
    sizes: ["S", "M", "L", "XL"],
    gallery: ["Rectangle45459.png", "Rectangle45494.png", "Rectangle45496.png"],
  },
];

const PALETTE: Record<string, string> = {
  ofw: "#F5F1EC", black: "#171412", navy: "#24303E", beige: "#D6C6B2", gray: "#8A8A8A",
  yellow: "#D9A33B", wine: "#6E2438", pink: "#E7A9B8", blue: "#4A69A2", brown: "#6B4A35",
  bronze: "#9A6B45", white: "#FFFFFF", cream: "#F2EBDF", mint: "#CFE0D6", floral: "#C9A9B0",
  red: "#B02A33", green: "#2E5B42", blush: "#EBC4CB", burgundy: "#7A2236", emerald: "#1F6B5A",
  rust: "#B4513A", terracotta: "#C46A4A", olive: "#5C6642", camel: "#B98E5F", maroon: "#6E2438",
  natural: "#D9C9A8", turquoise: "#6FBFC0",
};

const buildVariants = (product: RawProduct) =>
  product.variantColors.flatMap((color, ci) =>
    product.sizes.map((size, si) => ({
      id: `${product.id}-${color}-${size}`,
      name: `${color} / ${size}`,
      price: product.price,
      comparePrice: product.comparePrice,
      sku: `${product.id.toUpperCase()}-${color.toUpperCase()}-${size}`,
      image: product.gallery?.[ci % product.gallery.length] ? cdn(product.gallery[ci % product.gallery.length]) : cdn(product.thumb),
      stock: Math.max(2, 12 - ci - si),
      attributes: { color, size },
      attributeValues: { color, size },
    })),
  );

const buildProduct = (product: RawProduct, index: number): Product => {
  const category = categories[product.categoryKey];
  const gallery = product.gallery?.map((file) => cdn(file)) || [cdn(product.thumb)];
  const images = Array.from(new Set([cdn(product.thumb), ...gallery]));
  const variants = buildVariants(product);

  return {
    id: product.id,
    slug: product.id,
    name: product.name,
    description: `${product.name} — ${category.name} from the Graceful reference store. Thoughtfully curated with ${product.variantColors.length} color choices and ${product.sizes.join(" / ")} sizing.`,
    price: product.price,
    comparePrice: product.comparePrice,
    images,
    imageUrl: images[0],
    mainImage: images[0],
    categoryId: category.id,
    category: { id: category.id, name: category.name, slug: category.slug, image: category.image },
    stock: Math.max(4, 18 - (index % 6)),
    tags: [category.name, "graceful", "fashion"],
    productVariants: variants,
    variants,
    rating: 4.6 + ((index % 4) * 0.1),
    reviewCount: 12 + index * 2,
    createdAt: "2026-08-19T09:00:00.000Z",
  };
};

export const SOFT_GRACEFUL_PRODUCTS: Product[] = RAW_PRODUCTS.map(buildProduct);

const groupByCategory = RAW_PRODUCTS.reduce<Record<CategoryKey, string[]>>(
  (acc, product) => {
    acc[product.categoryKey].push(product.id);
    return acc;
  },
  {
    womens: [], mens: [], kids: [], "casual-look": [], "office-wear": [], "party-night": [], "vacation-style": [],
  },
);

const PRIORITY = RAW_PRODUCTS.map((p) => p.id);

const buildRecommendationIds = (product: RawProduct, kind: "related" | "boughtTogether") => {
  const categoryItems = groupByCategory[product.categoryKey].filter((id) => id !== product.id);
  const crossCategoryItems = PRIORITY.filter((id) => id !== product.id && !categoryItems.includes(id));
  return kind === "related"
    ? [...categoryItems.slice(0, 2), ...crossCategoryItems.slice(0, 1)]
    : [...crossCategoryItems.slice(0, 2), ...categoryItems.slice(0, 1)];
};

export const SOFT_GRACEFUL_RECOMMENDATIONS = {
  related: Object.fromEntries(RAW_PRODUCTS.map((p) => [p.id, buildRecommendationIds(p, "related")])) as Record<string, string[]>,
  boughtTogether: Object.fromEntries(RAW_PRODUCTS.map((p) => [p.id, buildRecommendationIds(p, "boughtTogether")])) as Record<string, string[]>,
};

const REVIEW_AUTHORS = ["Sarah", "Mariam", "Nour", "Layla", "Sophia", "Amira"] as const;
const REVIEW_COPY = [
  "The fabric feels premium and the color choices are exactly like the live storefront. Easy to compare before ordering.",
  "Size guide was spot on and the quick-view swatches made it fast to pick my shade without leaving the page.",
  "The discount was clear and the styling really reads like a curated edit, not a generic product shelf.",
  "Came exactly as pictured with beautiful finishing — the layered look is worth it.",
] as const;

export const SOFT_GRACEFUL_REVIEWS: Record<string, MarketplacePreviewProductReviewsResponse> = Object.fromEntries(
  RAW_PRODUCTS.map((product, index) => {
    const a1 = REVIEW_AUTHORS[index % REVIEW_AUTHORS.length];
    const a2 = REVIEW_AUTHORS[(index + 2) % REVIEW_AUTHORS.length];
    return [
      product.id,
      buildMarketplacePreviewReviewsResponse([
        { id: `${product.id}-r1`, author: a1, date: "2026-08-18", createdAt: "2026-08-18T10:00:00.000Z", rating: 5, title: "Curated and clear", comment: REVIEW_COPY[index % REVIEW_COPY.length], verified: true, helpfulCount: 4 + index },
        { id: `${product.id}-r2`, author: a2, date: "2026-08-16", createdAt: "2026-08-16T10:00:00.000Z", rating: 4, title: "Easy size + swatches", comment: "Sizing, swatch colors, and the discount all stayed readable without opening extra panels.", verified: true, helpfulCount: 2 + (index % 5) },
      ]),
    ];
  }),
) as Record<string, MarketplacePreviewProductReviewsResponse>;
