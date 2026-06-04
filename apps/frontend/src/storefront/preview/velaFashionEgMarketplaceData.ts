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

type CategoryKey = "accessories" | "outwear" | "tops" | "bottoms";

type RawProductColor = {
  name: string;
  file: string;
};

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

const asset = (file: string) => `/assets/themes/vela-fashion-eg/media/${file}`;

const velaFashionCategories = {
  accessories: { id: "accessories", name: "Accessories", slug: "Accessories" },
  outwear: { id: "outwear", name: "Out Wear", slug: "Outwear" },
  tops: { id: "tops", name: "Tops", slug: "tops" },
  bottoms: { id: "bottoms", name: "Bottoms", slug: "bottoms" },
} as const;

const RAW_PRODUCTS: RawProduct[] = [
  {
    id: "drift-socks-3-pack",
    slug: "drift-socks-3-pack",
    name: "Drift Socks 3 Pack",
    categoryKey: "outwear",
    thumb: "1759777553069275097.avif",
    price: 350,
    comparePrice: 400,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "blue", file: "1764530521433758819.webp" },
      { name: "red", file: "1764537437824303061.webp" },
    ],
  },
  {
    id: "petal-slip-dress",
    slug: "petal-slip-dress",
    name: "Petal Slip Dress",
    categoryKey: "outwear",
    thumb: "1759777308303463568.avif",
    price: 350,
    comparePrice: 400,
    sizes: ["XL", "S", "M", "L"],
    colors: [
      { name: "green", file: "1764531095092274320.avif" },
      { name: "red", file: "1764537591540893294.webp" },
    ],
  },
  {
    id: "splash-bucket-hat",
    slug: "splash-bucket-hat",
    name: "Splash Bucket Hat",
    categoryKey: "outwear",
    thumb: "1759777635157577999.avif",
    price: 400,
    comparePrice: 550,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "blue", file: "1764530165864541030.avif" },
      { name: "red", file: "1764537390320139079.webp" },
    ],
  },
  {
    id: "chalk-knit-vest",
    slug: "chalk-knit-vest",
    name: "Chalk Knit Vest",
    categoryKey: "bottoms",
    thumb: "1759779193240589470.avif",
    price: 400,
    comparePrice: 650,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "blue", file: "1764528351051010854.avif" },
      { name: "red", file: "1764536960469929816.webp" },
    ],
  },
  {
    id: "blush-chain-earrings",
    slug: "blush-chain-earrings",
    name: "Blush Chain Earrings",
    categoryKey: "bottoms",
    thumb: "1759779953500263926.avif",
    price: 400,
    comparePrice: 500,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "green", file: "1764536600285228114.webp" },
      { name: "red", file: "1764536612705408973.webp" },
    ],
  },
  {
    id: "midnight-hoodie",
    slug: "midnight-hoodie",
    name: "Midnight Hoodie",
    categoryKey: "bottoms",
    thumb: "1759779388469268342.avif",
    price: 450,
    comparePrice: 600,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "brown", file: "1764528216343956640.webp" },
      { name: "red", file: "1764536679767703317.webp" },
    ],
  },
  {
    id: "melt-tote-bag",
    slug: "melt-tote-bag",
    name: "Melt Tote Bag",
    categoryKey: "bottoms",
    thumb: "1759779312051365104.avif",
    price: 450,
    comparePrice: 600,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "black", file: "1764528296580300155.webp" },
      { name: "white", file: "1764528305650958405.avif" },
    ],
  },
  {
    id: "dune-button-shirt",
    slug: "dune-button-shirt",
    name: "Dune Button Shirt",
    categoryKey: "bottoms",
    thumb: "1759779809302794276.avif",
    price: 497,
    comparePrice: 600,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "green", file: "1764527576509535676.webp" },
      { name: "light-green", file: "1764527579969126187.avif" },
    ],
  },
  {
    id: "azure-canvas-cap",
    slug: "azure-canvas-cap",
    name: "Azure Canvas Cap",
    categoryKey: "tops",
    thumb: "1759778642493806652.avif",
    price: 450,
    comparePrice: 650,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "white", file: "1764529434627978444.webp" },
      { name: "blue", file: "1764529438254239622.webp" },
    ],
  },
  {
    id: "storm-cargo-shorts",
    slug: "storm-cargo-shorts",
    name: "Storm Cargo Shorts",
    categoryKey: "tops",
    thumb: "1759778498146926104.avif",
    price: 396,
    comparePrice: 600,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "green", file: "1764529718896791568.webp" },
      { name: "red", file: "1764537245571771044.webp" },
    ],
  },
  {
    id: "terra-twill-pants",
    slug: "terra-twill-pants",
    name: "Terra Twill Pants",
    categoryKey: "tops",
    thumb: "1759778715502959119.avif",
    price: 400,
    comparePrice: 600,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "white", file: "1764529391189107073.avif" },
      { name: "green", file: "1764529397547081291.webp" },
    ],
  },
  {
    id: "hazel-bangle",
    slug: "hazel-bangle",
    name: "Hazel Bangle",
    categoryKey: "accessories",
    thumb: "1759781430926463085.avif",
    price: 399,
    comparePrice: 650,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "green", file: "1764521677064840917.webp" },
      { name: "blue", file: "1764521688540686251.avif" },
      { name: "pink", file: "1764521699871770761.webp" },
    ],
  },
  {
    id: "ridge-canvas-bag",
    slug: "ridge-canvas-bag",
    name: "Ridge Canvas Bag",
    categoryKey: "accessories",
    thumb: "1759780170399008063.avif",
    price: 349,
    comparePrice: 650,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "black", file: "1764536524461687920.webp" },
      { name: "green", file: "1764536526535652527.webp" },
      { name: "red", file: "1764536529773386807.webp" },
    ],
  },
  {
    id: "haze-shorts",
    slug: "haze-shorts",
    name: "Haze Shorts",
    categoryKey: "accessories",
    thumb: "1759780106310620098.avif",
    price: 400,
    comparePrice: 650,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "white", file: "1764526609975800179.webp" },
      { name: "green", file: "1764526613519432673.webp" },
      { name: "beige", file: "1764526617116415047.avif" },
    ],
  },
  {
    id: "mirage-hoodie",
    slug: "mirage-hoodie",
    name: "Mirage Hoodie",
    categoryKey: "accessories",
    thumb: "1759781006744605426.avif",
    price: 400,
    comparePrice: 650,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "green", file: "1764536277913088299.webp" },
      { name: "red", file: "1764536290482539688.webp" },
    ],
  },
  {
    id: "coastline-shorts",
    slug: "coastline-shorts",
    name: "Coastline Shorts",
    categoryKey: "accessories",
    thumb: "1759781359081823878.webp",
    price: 395,
    comparePrice: 650,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "brown", file: "1764521989028473649.webp" },
      { name: "beige", file: "1764522000085671622.avif" },
      { name: "tan", file: "1764522012526585366.webp" },
    ],
  },
  {
    id: "coral-curve-skirt",
    slug: "coral-curve-skirt",
    name: "Coral Curve Skirt",
    categoryKey: "accessories",
    thumb: "1759780945451204689.avif",
    price: 299,
    comparePrice: 450,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "pink", file: "1764525769826852211.avif" },
      { name: "rose", file: "1764525773749142902.avif" },
      { name: "blush", file: "1764525778173898534.avif" },
    ],
  },
  {
    id: "wavey-trousers",
    slug: "wavey-trousers",
    name: "Wavey Trousers",
    categoryKey: "accessories",
    thumb: "1759781257146953628.webp",
    price: 500,
    comparePrice: 650,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "black", file: "1764536044338139226.webp" },
      { name: "green", file: "1764536046178578727.webp" },
      { name: "red", file: "1764536048274980812.webp" },
    ],
  },
];

const SECTION_PRIORITY = [
  "drift-socks-3-pack",
  "petal-slip-dress",
  "splash-bucket-hat",
  "chalk-knit-vest",
  "blush-chain-earrings",
  "midnight-hoodie",
  "melt-tote-bag",
  "dune-button-shirt",
  "azure-canvas-cap",
  "storm-cargo-shorts",
  "terra-twill-pants",
  "hazel-bangle",
  "ridge-canvas-bag",
  "haze-shorts",
  "mirage-hoodie",
  "coastline-shorts",
  "coral-curve-skirt",
  "wavey-trousers",
] as const;

const buildDescription = (product: RawProduct): string => {
  const category = velaFashionCategories[product.categoryKey];
  return `${product.name} from the ${category.name} rail in the Vela Fashion reference preview.`;
};

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
      attributes: {
        color: color.name,
        size,
      },
      attributeValues: {
        color: color.name,
        size,
      },
    })),
  );

const buildProduct = (product: RawProduct, index: number): Product => {
  const category = velaFashionCategories[product.categoryKey];
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
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
    },
    stock: Math.max(4, 18 - (index % 5)),
    tags: [category.name, "vela-fashion", "reference-copy"],
    productVariants: variants,
    variants,
    rating: 4.6 + ((index % 4) * 0.1),
    reviewCount: 12 + index * 2,
    createdAt: "2026-04-27T09:00:00.000Z",
  };
};

export const VELA_FASHION_EG_PRODUCTS: Product[] = RAW_PRODUCTS.map(buildProduct);

const groupByCategory = RAW_PRODUCTS.reduce<Record<CategoryKey, string[]>>(
  (accumulator, product) => {
    accumulator[product.categoryKey].push(product.id);
    return accumulator;
  },
  {
    accessories: [],
    outwear: [],
    tops: [],
    bottoms: [],
  },
);

const buildRecommendationIds = (
  product: RawProduct,
  kind: "related" | "boughtTogether",
): string[] => {
  const categoryItems = groupByCategory[product.categoryKey].filter(
    (candidateId) => candidateId !== product.id,
  );
  const crossCategoryItems = SECTION_PRIORITY.filter(
    (candidateId) =>
      candidateId !== product.id && !categoryItems.includes(candidateId),
  );

  if (kind === "related") {
    return [...categoryItems.slice(0, 2), ...crossCategoryItems.slice(0, 1)];
  }

  return [...crossCategoryItems.slice(0, 2), ...categoryItems.slice(0, 1)];
};

export const VELA_FASHION_EG_RECOMMENDATIONS = {
  related: Object.fromEntries(
    RAW_PRODUCTS.map((product) => [
      product.id,
      buildRecommendationIds(product, "related"),
    ]),
  ) as Record<string, string[]>,
  boughtTogether: Object.fromEntries(
    RAW_PRODUCTS.map((product) => [
      product.id,
      buildRecommendationIds(product, "boughtTogether"),
    ]),
  ) as Record<string, string[]>,
};

const REVIEW_AUTHORS = [
  "Adam",
  "Michael",
  "Daniel",
  "James",
  "Layla",
  "Noah",
] as const;

const REVIEW_COPY = [
  "Looks exactly like the reference set and the color choices are easy to compare before ordering.",
  "The product card feels clear, the size chips are useful, and the discount is visible right away.",
  "Quick to scan, easy to add, and the imagery matches what I expected from the live storefront.",
  "Strong visual presentation and a very straightforward buying flow from the same product page.",
] as const;

export const VELA_FASHION_EG_REVIEWS: Record<
  string,
  MarketplacePreviewProductReviewsResponse
> = Object.fromEntries(
  RAW_PRODUCTS.map((product, index) => {
    const firstAuthor = REVIEW_AUTHORS[index % REVIEW_AUTHORS.length];
    const secondAuthor =
      REVIEW_AUTHORS[(index + 2) % REVIEW_AUTHORS.length];

    return [
      product.id,
      buildMarketplacePreviewReviewsResponse([
        {
          id: `${product.id}-review-1`,
          author: firstAuthor,
          date: "2026-04-26",
          createdAt: "2026-04-26T10:00:00.000Z",
          rating: 5,
          title: "Reference-like product card",
          comment: REVIEW_COPY[index % REVIEW_COPY.length],
          verified: true,
          helpfulCount: 4 + index,
        },
        {
          id: `${product.id}-review-2`,
          author: secondAuthor,
          date: "2026-04-24",
          createdAt: "2026-04-24T10:00:00.000Z",
          rating: 4,
          title: "Clear sizing and imagery",
          comment:
            "Sizing, swatches, and sale pricing stay readable without opening extra panels.",
          verified: true,
          helpfulCount: 2 + (index % 5),
        },
      ]),
    ];
  }),
) as Record<string, MarketplacePreviewProductReviewsResponse>;
