import type { Category } from "../hooks/useCategories";
import type { Product, ProductsParams } from "../hooks/useProducts";
import {
  ELESSI_PACK_MARKETPLACE_THEME_IDS,
  ELESSI_PACK_PRODUCTS,
  ELESSI_PACK_RECOMMENDATIONS,
  ELESSI_PACK_REVIEWS,
} from "./elessiPackMarketplaceData";
import {
  ATELIER_NOVA_PRODUCTS,
  ATELIER_NOVA_RECOMMENDATIONS,
  ATELIER_NOVA_REVIEWS,
} from "./atelierNovaMarketplaceData";
import {
  ELEGANT_LUXE_PRODUCTS,
  ELEGANT_LUXE_RECOMMENDATIONS,
  ELEGANT_LUXE_REVIEWS,
} from "./elegantLuxeMarketplaceData";
import {
  KIDS_PLAY_PRODUCTS,
  KIDS_PLAY_RECOMMENDATIONS,
  KIDS_PLAY_REVIEWS,
} from "./kidsPlayMarketplaceData";
import {
  KHEMET_LUXE_PRODUCTS,
  KHEMET_LUXE_RECOMMENDATIONS,
  KHEMET_LUXE_REVIEWS,
} from "./khemetLuxeMarketplaceData";
import {
  PERFUME_EG_PRODUCTS,
  PERFUME_EG_RECOMMENDATIONS,
  PERFUME_EG_REVIEWS,
} from "./perfumeEgMarketplaceData";
import {
  ROSE_BOUTIQUE_EG_PRODUCTS,
  ROSE_BOUTIQUE_EG_RECOMMENDATIONS,
  ROSE_BOUTIQUE_EG_REVIEWS,
} from "./roseBoutiqueEgMarketplaceData";
import {
  VELA_FASHION_EG_PRODUCTS,
  VELA_FASHION_EG_RECOMMENDATIONS,
  VELA_FASHION_EG_REVIEWS,
} from "./velaFashionEgMarketplaceData";
import {
  FASTLY_EG_PRODUCTS,
  FASTLY_EG_RECOMMENDATIONS,
  FASTLY_EG_REVIEWS,
} from "./fastlyEgMarketplaceData";
import {
  LEGACY_DEFAULT_OLD_PRODUCTS,
  LEGACY_DEFAULT_OLD_RECOMMENDATIONS,
  LEGACY_DEFAULT_OLD_REVIEWS,
} from "./legacyDefaultOldMarketplaceData";
import { STOREFRONT_THEME_PRESETS } from "../themes";
import { buildStorefrontThemePresetCatalog } from "../themes/catalog";

const MARKETPLACE_PREVIEW_SOURCE = "marketplace";

interface MarketplacePreviewProductReviewRecord {
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
}

interface MarketplacePreviewProductReviewsResponse {
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
}

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
  `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=900&q=80`;

const buildSizeVariants = (
  productId: string,
  skuPrefix: string,
  price: number,
  comparePrice: number,
  image: string,
  sizes: string[] = ["41", "42", "43", "44"],
) =>
  sizes.map((size, sizeIndex) => ({
    id: `${productId}-size-${size}`,
    name: `مقاس ${size}`,
    price,
    comparePrice,
    sku: `${skuPrefix}-${size}`,
    image,
    stock: Math.max(2, 10 - sizeIndex),
    attributes: { المقاس: size },
    attributeValues: { المقاس: size },
  }));

const buildColorSizeVariants = (
  productId: string,
  skuPrefix: string,
  colorways: Array<{
    code: string;
    label: string;
    image: string;
    price?: number;
    comparePrice?: number;
  }>,
  basePrice: number,
  baseComparePrice: number,
  sizes: string[] = ["41", "42", "43", "44"],
) =>
  colorways.flatMap((colorway, colorIndex) =>
    sizes.map((size, sizeIndex) => ({
      id: `${productId}-${colorway.code}-size-${size}`,
      name: `${colorway.label} / مقاس ${size}`,
      price: colorway.price ?? basePrice,
      comparePrice: colorway.comparePrice ?? baseComparePrice,
      sku: `${skuPrefix}-${colorway.code.toUpperCase()}-${size}`,
      image: colorway.image,
      stock: Math.max(2, 9 - colorIndex * 2 - sizeIndex),
      attributes: {
        اللون: colorway.label,
        المقاس: size,
      },
      attributeValues: {
        اللون: colorway.label,
        المقاس: size,
      },
    })),
  );

const buildColorVariants = (
  productId: string,
  skuPrefix: string,
  colorways: Array<{
    code: string;
    label: string;
    image: string;
    price?: number;
    comparePrice?: number;
  }>,
  basePrice: number,
  baseComparePrice: number,
) =>
  colorways.map((colorway, colorIndex) => ({
    id: `${productId}-${colorway.code}`,
    name: colorway.label,
    price: colorway.price ?? basePrice,
    comparePrice: colorway.comparePrice ?? baseComparePrice,
    sku: `${skuPrefix}-${colorway.code.toUpperCase()}`,
    image: colorway.image,
    stock: Math.max(2, 9 - colorIndex * 2),
    attributes: {
      اللون: colorway.label,
    },
    attributeValues: {
      اللون: colorway.label,
    },
  }));

const buildConfigVariants = (
  productId: string,
  skuPrefix: string,
  image: string,
  configs: Array<{
    code: string;
    label: string;
    price: number;
    comparePrice: number;
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
    attributes: config.attributes,
    attributeValues: config.attributes,
  }));

const buildFittingRoomVariants = (
  productId: string,
  skuPrefix: string,
  colorways: Array<{
    code: string;
    label: string;
    image: string;
    price?: number;
    comparePrice?: number;
  }>,
  basePrice: number,
  baseComparePrice: number,
  sizes: string[] = ["S", "M", "L"],
) =>
  colorways.flatMap((colorway, colorIndex) =>
    sizes.map((size, sizeIndex) => ({
      id: `${productId}-${colorway.code}-size-${size}`,
      name: `${colorway.label} / ${size}`,
      price: colorway.price ?? basePrice,
      comparePrice: colorway.comparePrice ?? baseComparePrice,
      sku: `${skuPrefix}-${colorway.code.toUpperCase()}-${size}`,
      image: colorway.image,
      stock: Math.max(2, 9 - colorIndex * 2 - sizeIndex),
      attributes: {
        Color: colorway.label,
        Size: size,
      },
      attributeValues: {
        Color: colorway.label,
        Size: size,
      },
    })),
  );

const FITTING_ROOM_STUDIO_GALLERIES = {
  "fr-fitting-dress": [
    buildUnsplashImage("1496747611176-843222e1e57c"),
    buildUnsplashImage("1483985988355-763728e1935b"),
    buildUnsplashImage("1529139574466-a303027c1d8b"),
  ],
  "fr-cotton-t-shirt": [
    buildUnsplashImage("1503342217505-b0a15ec3261c"),
    buildUnsplashImage("1523381294911-8d3cead13475"),
    buildUnsplashImage("1551232864-3f0890e580d9"),
  ],
  "fr-jean-jacket": [
    buildUnsplashImage("1515886657613-9f3515b0c78f"),
    buildUnsplashImage("1548883354-7622d03aca27"),
    buildUnsplashImage("1529139574466-a303027c1d8b"),
  ],
  "fr-denim-short": [
    buildUnsplashImage("1548883354-7622d03aca27"),
    buildUnsplashImage("1515886657613-9f3515b0c78f"),
    buildUnsplashImage("1483985988355-763728e1935b"),
  ],
  "fr-soft-cardigan": [
    buildUnsplashImage("1496747611176-843222e1e57c"),
    buildUnsplashImage("1509631179647-0177331693ae"),
    buildUnsplashImage("1487412720507-e7ab37603c6f"),
  ],
  "fr-canvas-tote": [
    buildUnsplashImage("1551232864-3f0890e580d9"),
    buildUnsplashImage("1512436991641-6745cdb1723f"),
    buildUnsplashImage("1544441893-675973e31985"),
  ],
} as const;

const FITTING_ROOM_STUDIO_VARIANTS = {
  "fr-fitting-dress": buildFittingRoomVariants(
    "fr-fitting-dress",
    "FR-DRESS",
    [
      {
        code: "sky",
        label: "Powder Blue",
        image: FITTING_ROOM_STUDIO_GALLERIES["fr-fitting-dress"][0],
      },
      {
        code: "ivory",
        label: "Soft Ivory",
        image: FITTING_ROOM_STUDIO_GALLERIES["fr-fitting-dress"][1],
      },
    ],
    199,
    229,
  ),
  "fr-cotton-t-shirt": buildFittingRoomVariants(
    "fr-cotton-t-shirt",
    "FR-TEE",
    [
      {
        code: "cream",
        label: "Cream",
        image: FITTING_ROOM_STUDIO_GALLERIES["fr-cotton-t-shirt"][0],
      },
      {
        code: "mint",
        label: "Mint",
        image: FITTING_ROOM_STUDIO_GALLERIES["fr-cotton-t-shirt"][1],
      },
    ],
    59,
    72,
  ),
  "fr-jean-jacket": buildFittingRoomVariants(
    "fr-jean-jacket",
    "FR-JACKET",
    [
      {
        code: "light-blue",
        label: "Light Blue",
        image: FITTING_ROOM_STUDIO_GALLERIES["fr-jean-jacket"][0],
      },
      {
        code: "washed",
        label: "Washed Denim",
        image: FITTING_ROOM_STUDIO_GALLERIES["fr-jean-jacket"][1],
      },
    ],
    109,
    139,
  ),
  "fr-denim-short": buildFittingRoomVariants(
    "fr-denim-short",
    "FR-SHORT",
    [
      {
        code: "pale-denim",
        label: "Pale Denim",
        image: FITTING_ROOM_STUDIO_GALLERIES["fr-denim-short"][0],
      },
      {
        code: "stone",
        label: "Stone",
        image: FITTING_ROOM_STUDIO_GALLERIES["fr-denim-short"][1],
      },
    ],
    79,
    96,
  ),
  "fr-soft-cardigan": buildFittingRoomVariants(
    "fr-soft-cardigan",
    "FR-CARDI",
    [
      {
        code: "oat",
        label: "Oat",
        image: FITTING_ROOM_STUDIO_GALLERIES["fr-soft-cardigan"][0],
      },
      {
        code: "rose",
        label: "Dusty Rose",
        image: FITTING_ROOM_STUDIO_GALLERIES["fr-soft-cardigan"][1],
      },
    ],
    89,
    108,
  ),
  "fr-canvas-tote": buildFittingRoomVariants(
    "fr-canvas-tote",
    "FR-TOTE",
    [
      {
        code: "sage",
        label: "Sage",
        image: FITTING_ROOM_STUDIO_GALLERIES["fr-canvas-tote"][0],
      },
      {
        code: "sand",
        label: "Sand",
        image: FITTING_ROOM_STUDIO_GALLERIES["fr-canvas-tote"][1],
      },
    ],
    49,
    64,
    ["One Size"],
  ),
} as const;

const WOMEN_FASHION_GALLERIES = {
  "luna-city-sneaker": [
    buildUnsplashImage("1600185365483-26d7a4cc7519"),
    buildUnsplashImage("1608231387042-66d1773070a5"),
    buildUnsplashImage("1608384177866-0bca0d225435"),
    buildUnsplashImage("1542291026-7eec264c27ff"),
  ],
  "soft-stride-runner": [
    buildUnsplashImage("1491553895911-0055eca6402d"),
    buildUnsplashImage("1621315271772-28b1f3a5df87"),
    buildUnsplashImage("1549298916-b41d501d3772"),
    buildUnsplashImage("1552346154-21d32810aba3"),
  ],
  "marina-ballet-flat": [
    buildUnsplashImage("1551779245-692374a8efe2"),
    buildUnsplashImage("1556004583-d2aaffbba592"),
    buildUnsplashImage("1616406432452-07bc5938759d"),
    buildUnsplashImage("1662541089338-c7d53b88be70"),
  ],
  "dusk-block-heel": [
    buildUnsplashImage("1515347619252-60a4bf4fff4f"),
    buildUnsplashImage("1543163521-1bf539c55dd2"),
    buildUnsplashImage("1559334418-672d5a48531b"),
    buildUnsplashImage("1554062097-69c634085c6d"),
  ],
  "linen-coord-set": [
    buildUnsplashImage("1483985988355-763728e1935b"),
    buildUnsplashImage("1496747611176-843222e1e57c"),
    buildUnsplashImage("1515886657613-9f3515b0c78f"),
    buildUnsplashImage("1487412720507-e7ab37603c6f"),
  ],
  "flow-midi-dress": [
    buildUnsplashImage("1496747611176-843222e1e57c"),
    buildUnsplashImage("1487412720507-e7ab37603c6f"),
    buildUnsplashImage("1483985988355-763728e1935b"),
    buildUnsplashImage("1515886657613-9f3515b0c78f"),
  ],
  "berry-crossbody-bag": [
    buildUnsplashImage("1542291026-7eec264c27ff"),
    buildUnsplashImage("1512436991641-6745cdb1723f"),
    buildUnsplashImage("1544441893-675973e31985"),
    buildUnsplashImage("1523381210434-271e8be1f52b"),
  ],
  "silk-print-scarf": [
    buildUnsplashImage("1521572267360-ee0c2909d518"),
    buildUnsplashImage("1509631179647-0177331693ae"),
    buildUnsplashImage("1551232864-3f0890e580d9"),
    buildUnsplashImage("1483985988355-763728e1935b"),
  ],
} as const;

const WOMEN_FASHION_VARIANTS = {
  "luna-city-sneaker": buildColorSizeVariants(
    "luna-city-sneaker",
    "WF-LUNA",
    [
      {
        code: "pearl-white",
        label: "أبيض لؤلؤي",
        image: WOMEN_FASHION_GALLERIES["luna-city-sneaker"][0],
      },
      {
        code: "blush-rose",
        label: "وردي هادئ",
        image: WOMEN_FASHION_GALLERIES["luna-city-sneaker"][1],
      },
      {
        code: "sand-beige",
        label: "بيج رملي",
        image: WOMEN_FASHION_GALLERIES["luna-city-sneaker"][2],
      },
    ],
    2280,
    2590,
    ["37", "38", "39", "40"],
  ),
  "soft-stride-runner": buildColorSizeVariants(
    "soft-stride-runner",
    "WF-SOFT",
    [
      {
        code: "cloud-ivory",
        label: "أوف وايت",
        image: WOMEN_FASHION_GALLERIES["soft-stride-runner"][0],
      },
      {
        code: "berry-plum",
        label: "موف توتي",
        image: WOMEN_FASHION_GALLERIES["soft-stride-runner"][1],
      },
      {
        code: "soft-grey",
        label: "رمادي ناعم",
        image: WOMEN_FASHION_GALLERIES["soft-stride-runner"][2],
      },
    ],
    2140,
    2450,
    ["37", "38", "39", "40"],
  ),
  "marina-ballet-flat": buildColorSizeVariants(
    "marina-ballet-flat",
    "WF-MARINA",
    [
      {
        code: "navy-midnight",
        label: "كحلي داكن",
        image: WOMEN_FASHION_GALLERIES["marina-ballet-flat"][0],
      },
      {
        code: "caramel-sand",
        label: "كاراميل فاتح",
        image: WOMEN_FASHION_GALLERIES["marina-ballet-flat"][1],
      },
      {
        code: "blush-cream",
        label: "كريمي وردي",
        image: WOMEN_FASHION_GALLERIES["marina-ballet-flat"][2],
      },
    ],
    1960,
    2290,
    ["37", "38", "39", "40"],
  ),
  "dusk-block-heel": buildColorSizeVariants(
    "dusk-block-heel",
    "WF-DUSK",
    [
      {
        code: "wine-berry",
        label: "عنابي",
        image: WOMEN_FASHION_GALLERIES["dusk-block-heel"][0],
      },
      {
        code: "almond",
        label: "بيج لوزي",
        image: WOMEN_FASHION_GALLERIES["dusk-block-heel"][1],
      },
      {
        code: "black-onyx",
        label: "أسود كلاسيك",
        image: WOMEN_FASHION_GALLERIES["dusk-block-heel"][2],
      },
    ],
    2450,
    2790,
    ["37", "38", "39", "40"],
  ),
  "linen-coord-set": buildColorSizeVariants(
    "linen-coord-set",
    "WF-LINEN",
    [
      {
        code: "oat-beige",
        label: "بيج شوفان",
        image: WOMEN_FASHION_GALLERIES["linen-coord-set"][0],
      },
      {
        code: "rose-smoke",
        label: "وردي غباري",
        image: WOMEN_FASHION_GALLERIES["linen-coord-set"][1],
      },
      {
        code: "sage-soft",
        label: "سيج هادئ",
        image: WOMEN_FASHION_GALLERIES["linen-coord-set"][2],
      },
    ],
    1890,
    2190,
    ["S", "M", "L", "XL"],
  ),
  "flow-midi-dress": buildColorSizeVariants(
    "flow-midi-dress",
    "WF-FLOW",
    [
      {
        code: "terracotta-bloom",
        label: "طوبي ناعم",
        image: WOMEN_FASHION_GALLERIES["flow-midi-dress"][0],
      },
      {
        code: "ink-floral",
        label: "كحلي مزهر",
        image: WOMEN_FASHION_GALLERIES["flow-midi-dress"][1],
      },
      {
        code: "olive-mist",
        label: "زيتوني هادئ",
        image: WOMEN_FASHION_GALLERIES["flow-midi-dress"][2],
      },
    ],
    1680,
    1980,
    ["S", "M", "L", "XL"],
  ),
  "berry-crossbody-bag": buildColorVariants(
    "berry-crossbody-bag",
    "WF-BAG",
    [
      {
        code: "berry",
        label: "عنابي",
        image: WOMEN_FASHION_GALLERIES["berry-crossbody-bag"][0],
      },
      {
        code: "bone",
        label: "أوف وايت",
        image: WOMEN_FASHION_GALLERIES["berry-crossbody-bag"][1],
      },
      {
        code: "charcoal",
        label: "رمادي داكن",
        image: WOMEN_FASHION_GALLERIES["berry-crossbody-bag"][2],
      },
    ],
    980,
    1180,
  ),
  "silk-print-scarf": buildColorVariants(
    "silk-print-scarf",
    "WF-SCARF",
    [
      {
        code: "ivory-floral",
        label: "أبيض مزهر",
        image: WOMEN_FASHION_GALLERIES["silk-print-scarf"][0],
      },
      {
        code: "blush-print",
        label: "وردي هادئ",
        image: WOMEN_FASHION_GALLERIES["silk-print-scarf"][1],
      },
      {
        code: "navy-print",
        label: "كحلي مطبوع",
        image: WOMEN_FASHION_GALLERIES["silk-print-scarf"][2],
      },
    ],
    420,
    520,
  ),
} as const;

const WOMEN_FASHION_VOLUME_DISCOUNTS = [
  {
    id: "women-fashion-duo-save",
    minQuantity: 2,
    maxQuantity: 2,
    discountType: "percentage" as const,
    discountValue: 5,
  },
  {
    id: "women-fashion-trio-save",
    minQuantity: 3,
    maxQuantity: null,
    discountType: "percentage" as const,
    discountValue: 9,
  },
] as const;

const MEN_SHOES_GALLERIES = {
  "stride-core-runner": [
    buildUnsplashImage("1542291026-7eec264c27ff"),
    buildUnsplashImage("1600185365483-26d7a4cc7519"),
    buildUnsplashImage("1608231387042-66d1773070a5"),
    buildUnsplashImage("1491553895911-0055eca6402d"),
  ],
  "city-white-court": [
    buildUnsplashImage("1525966222134-fcfa99b8ae77"),
    buildUnsplashImage("1600185365926-3a2ce3cdb9eb"),
    buildUnsplashImage("1608230164697-c791326d284c"),
    buildUnsplashImage("1608384177866-0bca0d225435"),
  ],
  "flex-knit-runner": [
    buildUnsplashImage("1600185365483-26d7a4cc7519"),
    buildUnsplashImage("1621315271772-28b1f3a5df87"),
    buildUnsplashImage("1608231387042-66d1773070a5"),
    buildUnsplashImage("1552346154-21d32810aba3"),
  ],
  "brown-casual-leather": [
    buildUnsplashImage("1549298916-b41d501d3772"),
    buildUnsplashImage("1543508282-6319a3e2621f"),
    buildUnsplashImage("1615979474401-8a6a344de5bd"),
    buildUnsplashImage("1662541089338-c7d53b88be70"),
  ],
  "weekend-suede-low": [
    buildUnsplashImage("1515955656352-a1fa3ffcd111"),
    buildUnsplashImage("1556004583-d2aaffbba592"),
    buildUnsplashImage("1676121270762-47c8d3a7b9d5"),
    buildUnsplashImage("1576792741377-eb0f4f6d1a47"),
  ],
  "office-slip-loafer": [
    buildUnsplashImage("1614252235316-8c857d38b5f4"),
    buildUnsplashImage("1616406432452-07bc5938759d"),
    buildUnsplashImage("1556004583-d2aaffbba592"),
    buildUnsplashImage("1676121270762-47c8d3a7b9d5"),
  ],
  "derby-clean-cut": [
    buildUnsplashImage("1608667508764-33cf0726b13a"),
    buildUnsplashImage("1615979474401-8a6a344de5bd"),
    buildUnsplashImage("1662541089338-c7d53b88be70"),
    buildUnsplashImage("1616406432452-07bc5938759d"),
  ],
  "clean-step-kit": [
    buildUnsplashImage("1577467013301-3cfafe7079a3"),
    buildUnsplashImage("1577466803092-390dead202bf"),
    buildUnsplashImage("1681718631486-c2246ffce63e"),
    buildUnsplashImage("1681718639869-280de027108f"),
  ],
} as const;

const MEN_SHOES_VARIANTS = {
  "stride-core-runner": buildColorSizeVariants(
    "stride-core-runner",
    "MEN-STRIDE",
    [
      {
        code: "race-red",
        label: "أحمر سباق",
        image: MEN_SHOES_GALLERIES["stride-core-runner"][0],
      },
      {
        code: "graphite",
        label: "رمادي جرافيت",
        image: MEN_SHOES_GALLERIES["stride-core-runner"][1],
      },
      {
        code: "ice-white",
        label: "أبيض ثلجي",
        image: MEN_SHOES_GALLERIES["stride-core-runner"][2],
      },
    ],
    1890,
    2290,
  ),
  "city-white-court": buildColorSizeVariants(
    "city-white-court",
    "MEN-COURT",
    [
      {
        code: "court-white",
        label: "أبيض ملعب",
        image: MEN_SHOES_GALLERIES["city-white-court"][0],
      },
      {
        code: "sand-beige",
        label: "بيج رملي",
        image: MEN_SHOES_GALLERIES["city-white-court"][1],
      },
      {
        code: "navy-trim",
        label: "كحلي هادئ",
        image: MEN_SHOES_GALLERIES["city-white-court"][2],
      },
    ],
    1740,
    2090,
  ),
  "flex-knit-runner": buildColorSizeVariants(
    "flex-knit-runner",
    "MEN-FLEX",
    [
      {
        code: "charcoal",
        label: "فحمي داكن",
        image: MEN_SHOES_GALLERIES["flex-knit-runner"][0],
      },
      {
        code: "olive",
        label: "زيتي عملي",
        image: MEN_SHOES_GALLERIES["flex-knit-runner"][1],
      },
      {
        code: "ash-blue",
        label: "أزرق رمادي",
        image: MEN_SHOES_GALLERIES["flex-knit-runner"][2],
      },
    ],
    1590,
    1920,
  ),
  "brown-casual-leather": buildSizeVariants(
    "brown-casual-leather",
    "MEN-BROWN",
    2190,
    2590,
    MEN_SHOES_GALLERIES["brown-casual-leather"][0],
  ),
  "weekend-suede-low": buildSizeVariants(
    "weekend-suede-low",
    "MEN-SUEDE",
    2050,
    2390,
    MEN_SHOES_GALLERIES["weekend-suede-low"][0],
  ),
  "office-slip-loafer": buildSizeVariants(
    "office-slip-loafer",
    "MEN-LOAFER",
    2290,
    2690,
    MEN_SHOES_GALLERIES["office-slip-loafer"][0],
  ),
  "derby-clean-cut": buildSizeVariants(
    "derby-clean-cut",
    "MEN-DERBY",
    2390,
    2790,
    MEN_SHOES_GALLERIES["derby-clean-cut"][0],
  ),
} as const;

const MEN_SHOES_VOLUME_DISCOUNTS = [
  {
    id: "men-shoes-duo-save",
    minQuantity: 2,
    maxQuantity: 2,
    discountType: "percentage" as const,
    discountValue: 6,
  },
  {
    id: "men-shoes-team-save",
    minQuantity: 3,
    maxQuantity: null,
    discountType: "percentage" as const,
    discountValue: 10,
  },
] as const;

const PC_HUB_GALLERIES = {
  "workbook-14-air": [
    "/assets/themes/pc-hub-eg/workbook-14-air.jpg",
    "/assets/themes/pc-hub-eg/hero-photo.jpg",
    "/assets/themes/pc-hub-eg/workbook-14-air.jpg",
    "/assets/themes/pc-hub-eg/hero-photo.jpg",
  ],
  "creator-pro-16": [
    "/assets/themes/pc-hub-eg/creator-pro-16.jpg",
    "/assets/themes/pc-hub-eg/workbook-14-air.jpg",
    "/assets/themes/pc-hub-eg/creator-pro-16.jpg",
    "/assets/themes/pc-hub-eg/creator-pro-16.jpg",
  ],
  "battlebox-r7": [
    "/assets/themes/pc-hub-eg/battlebox-r7.jpg",
    "/assets/themes/pc-hub-eg/quadview-27-qhd.jpg",
    "/assets/themes/pc-hub-eg/battlebox-r7.jpg",
    "/assets/themes/pc-hub-eg/mini-station-i5.jpg",
  ],
  "mini-station-i5": [
    "/assets/themes/pc-hub-eg/mini-station-i5.jpg",
    "/assets/themes/pc-hub-eg/quadview-27-qhd.jpg",
    "/assets/themes/pc-hub-eg/mini-station-i5.jpg",
    "/assets/themes/pc-hub-eg/mini-station-i5.jpg",
  ],
  "quadview-27-qhd": [
    "/assets/themes/pc-hub-eg/quadview-27-qhd.jpg",
    "/assets/themes/pc-hub-eg/mini-station-i5.jpg",
    "/assets/themes/pc-hub-eg/quadview-27-qhd.jpg",
    "/assets/themes/pc-hub-eg/quadview-27-qhd.jpg",
  ],
  "mechboard-pro": [
    "/assets/themes/pc-hub-eg/mechboard-pro.jpg",
    "/assets/themes/pc-hub-eg/mechboard-pro.jpg",
    "/assets/themes/pc-hub-eg/mechboard-pro.jpg",
    "/assets/themes/pc-hub-eg/mechboard-pro.jpg",
  ],
  "precision-mouse-lite": [
    "/assets/themes/pc-hub-eg/precision-mouse-lite.jpg",
    "/assets/themes/pc-hub-eg/precision-mouse-lite.jpg",
    "/assets/themes/pc-hub-eg/precision-mouse-lite.jpg",
    "/assets/themes/pc-hub-eg/precision-mouse-lite.jpg",
  ],
  "dockstation-9in1": [
    "/assets/themes/pc-hub-eg/dockstation-9in1.jpg",
    "/assets/themes/pc-hub-eg/dockstation-9in1.jpg",
    "/assets/themes/pc-hub-eg/dockstation-9in1.jpg",
    "/assets/themes/pc-hub-eg/dockstation-9in1.jpg",
  ],
} as const;

const PC_HUB_VARIANTS = {
  "workbook-14-air": buildConfigVariants(
    "workbook-14-air",
    "PCH-WB14",
    PC_HUB_GALLERIES["workbook-14-air"][0],
    [
      {
        code: "16-512-silver",
        label: "16GB / 512GB / فضي",
        price: 38990,
        comparePrice: 42990,
        attributes: {
          الرام: "16GB",
          التخزين: "512GB SSD",
          اللون: "فضي",
        },
      },
      {
        code: "16-1tb-silver",
        label: "16GB / 1TB / فضي",
        price: 41990,
        comparePrice: 45990,
        attributes: {
          الرام: "16GB",
          التخزين: "1TB SSD",
          اللون: "فضي",
        },
      },
      {
        code: "24-1tb-grey",
        label: "24GB / 1TB / جرافيت",
        price: 44990,
        comparePrice: 48990,
        attributes: {
          الرام: "24GB",
          التخزين: "1TB SSD",
          اللون: "جرافيت",
        },
      },
    ],
  ),
  "creator-pro-16": buildConfigVariants(
    "creator-pro-16",
    "PCH-CR16",
    PC_HUB_GALLERIES["creator-pro-16"][0],
    [
      {
        code: "16-1tb-4050",
        label: "16GB / 1TB / RTX 4050",
        price: 57990,
        comparePrice: 63990,
        attributes: {
          الرام: "16GB",
          التخزين: "1TB SSD",
          الجرافيك: "RTX 4050",
        },
      },
      {
        code: "32-1tb-4060",
        label: "32GB / 1TB / RTX 4060",
        price: 64990,
        comparePrice: 70990,
        attributes: {
          الرام: "32GB",
          التخزين: "1TB SSD",
          الجرافيك: "RTX 4060",
        },
      },
    ],
  ),
  "battlebox-r7": buildConfigVariants(
    "battlebox-r7",
    "PCH-BB7",
    PC_HUB_GALLERIES["battlebox-r7"][0],
    [
      {
        code: "4060-16-1tb",
        label: "RTX 4060 / 16GB / 1TB",
        price: 46990,
        comparePrice: 51990,
        attributes: {
          الجرافيك: "RTX 4060",
          الرام: "16GB",
          التخزين: "1TB SSD",
        },
      },
      {
        code: "4070-32-1tb",
        label: "RTX 4070 / 32GB / 1TB",
        price: 55990,
        comparePrice: 60990,
        attributes: {
          الجرافيك: "RTX 4070",
          الرام: "32GB",
          التخزين: "1TB SSD",
        },
      },
    ],
  ),
  "mini-station-i5": buildConfigVariants(
    "mini-station-i5",
    "PCH-MINI5",
    PC_HUB_GALLERIES["mini-station-i5"][0],
    [
      {
        code: "16-512",
        label: "16GB / 512GB",
        price: 24990,
        comparePrice: 27990,
        attributes: {
          الرام: "16GB",
          التخزين: "512GB SSD",
        },
      },
      {
        code: "16-1tb",
        label: "16GB / 1TB",
        price: 26990,
        comparePrice: 29990,
        attributes: {
          الرام: "16GB",
          التخزين: "1TB SSD",
        },
      },
    ],
  ),
  "quadview-27-qhd": buildConfigVariants(
    "quadview-27-qhd",
    "PCH-QV27",
    PC_HUB_GALLERIES["quadview-27-qhd"][0],
    [
      {
        code: "100hz",
        label: "QHD / 100Hz",
        price: 11290,
        comparePrice: 12990,
        attributes: {
          المقاس: "27 بوصة",
          الدقة: "QHD",
          الانتعاش: "100Hz",
        },
      },
      {
        code: "165hz",
        label: "QHD / 165Hz",
        price: 13490,
        comparePrice: 14990,
        attributes: {
          المقاس: "27 بوصة",
          الدقة: "QHD",
          الانتعاش: "165Hz",
        },
      },
    ],
  ),
  "mechboard-pro": buildConfigVariants(
    "mechboard-pro",
    "PCH-MECH",
    PC_HUB_GALLERIES["mechboard-pro"][0],
    [
      {
        code: "linear-black",
        label: "لينير / أسود",
        price: 3490,
        comparePrice: 3990,
        attributes: {
          السويتش: "لينير",
          اللون: "أسود",
        },
      },
      {
        code: "tactile-white",
        label: "تاكتايل / أبيض",
        price: 3590,
        comparePrice: 4090,
        attributes: {
          السويتش: "تاكتايل",
          اللون: "أبيض",
        },
      },
    ],
  ),
  "precision-mouse-lite": buildColorVariants(
    "precision-mouse-lite",
    "PCH-MOUSE",
    [
      {
        code: "graphite",
        label: "جرافيت",
        image: PC_HUB_GALLERIES["precision-mouse-lite"][0],
      },
      {
        code: "white",
        label: "أبيض",
        image: PC_HUB_GALLERIES["precision-mouse-lite"][1],
      },
      {
        code: "midnight-blue",
        label: "أزرق داكن",
        image: PC_HUB_GALLERIES["precision-mouse-lite"][2],
      },
    ],
    1290,
    1490,
  ),
} as const;

const PC_HUB_PRODUCT_ENRICHMENTS = {
  "workbook-14-air": {
    tags: ["شغل يومي", "دراسة ومحاضرات", "تنقل خفيف"],
    modelLabel: "سلسلة Air 2024",
    decisionBadge: "جهاز يومي خفيف",
    decisionTitle: "قرار أوضح قبل الحسم",
    decisionDescription:
      "لابتوب خفيف للعمل والدراسة والتنقل اليومي مع بطارية تدوم لفترة أطول وتصميم مناسب للمكتب أو الجامعة.",
    decisionProofs: [
      {
        label: "تنقل أسهل",
        title: "خفيف للمشاوير اليومية",
        description:
          "وزن مناسب للحقيبة والتنقل بين الجامعة والشغل من غير إحساس بجهاز تقيل.",
      },
      {
        label: "وقت أطول",
        title: "بطارية تساعدك تكمل",
        description:
          "موجه للشغل والاجتماعات والدراسة من غير قلق مبالغ فيه من الشحن.",
      },
      {
        label: "شراء أوضح",
        title: "رام وتخزين بدون دوخة",
        description:
          "الاختيارات الأساسية واضحة وسهلة المقارنة لو تريد قرار سريع ومريح.",
      },
    ],
    bundleTitle: "جهّز مكتبك الخفيف",
    bundleSubtitle:
      "إكسسوارات وشاشة خارجية تكمل شغل اللابتوب اليومي بدون ما تثقل الطلب أو الاختيار.",
    trustedBadgeTitle: "للشغل اليومي بدون توتر",
    trustedBadgeSubtitle:
      "رسائل قصيرة تهم من يدور على جهاز عملي واضح الضمان والتوصيل من أول خطوة.",
    trustedBadgeItems: [
      "ضمان مكتوب",
      "شحن محمي للإلكترونيات",
      "دعم توافق قبل الشراء",
    ],
    commandFacts: [
      { label: "الأفضل لـ", value: "شغل يومي / جامعة" },
      { label: "البطارية", value: "حتى 14 ساعة" },
      { label: "الوزن", value: "1.35 كجم" },
      { label: "الذاكرة", value: "حتى 24GB / 1TB" },
    ],
    specs: [
      { label: "المعالج", value: "Intel Core Ultra 5" },
      { label: "الشاشة", value: "14 بوصة FHD+ IPS" },
      { label: "البطارية", value: "حتى 14 ساعة" },
      { label: "الوزن", value: "1.35 كجم" },
      { label: "المنافذ", value: "USB-C + HDMI + قارئ بطاقات" },
      { label: "الاستخدام الأنسب", value: "شغل يومي / جامعة / اجتماعات" },
    ],
  },
  "creator-pro-16": {
    tags: ["مونتاج وتصميم", "شغل ثقيل", "تعدد مهام"],
    modelLabel: "Creator Series 16",
    decisionBadge: "محطة عمل للمبدعين",
    decisionTitle: "جاهز للمشاريع الثقيلة من أول نظرة",
    decisionDescription:
      "شاشة أكبر، جرافيك أقوى، ومساحة عمل مناسبة للتصميم والمونتاج وتعدد المهام من غير ما تغرق في مواصفات مبعثرة.",
    decisionProofs: [
      {
        label: "ألوان ومساحة",
        title: "Timeline أوسع للشغل",
        description:
          "شاشة 16 بوصة QHD تعطي مساحة أنسب للتايملاين وواجهات التصميم ومراجعة التفاصيل.",
      },
      {
        label: "ثبات الجلسات",
        title: "جاهز للرندر الطويل",
        description:
          "تبريد مناسب وخيارات RTX أقوى لجلسات المونتاج والتصدير الممتدة بدون ارتباك.",
      },
      {
        label: "Headroom",
        title: "يكبر مع المشروع",
        description:
          "نسخة 32GB مع RTX 4060 تعطي مساحة أفضل للملفات الكبيرة وتعدد التطبيقات الثقيلة.",
      },
    ],
    bundleTitle: "ابنِ استوديو الشغل",
    bundleSubtitle:
      "شاشة وإكسسوارات تضبط جلسة التصميم والمونتاج من نفس الطلب بدل ما تجمعها على مرات.",
    trustedBadgeTitle: "لشغل التسليمات بثقة",
    trustedBadgeSubtitle:
      "رسائل قصيرة تهم من يشتري جهاز عمل فعلي وليس مجرد مواصفات على ورق.",
    trustedBadgeItems: [
      "ضمان رسمي للأجهزة",
      "شحن محمي للإلكترونيات",
      "مساعدة توافق قبل الشراء",
    ],
    commandFacts: [
      { label: "الأفضل لـ", value: "تصميم / مونتاج / شغل ثقيل" },
      { label: "الشاشة", value: "16 بوصة QHD" },
      { label: "الجرافيك", value: "RTX 4050 أو 4060" },
      { label: "التخزين", value: "1TB SSD" },
    ],
    specs: [
      { label: "المعالج", value: "Intel Core i7 H-series" },
      { label: "الشاشة", value: "16 بوصة QHD" },
      { label: "الجرافيك", value: "RTX 4050 أو RTX 4060" },
      { label: "التبريد", value: "مناسب لجلسات العمل الطويلة" },
      { label: "التخزين", value: "1TB SSD" },
      { label: "الاستخدام الأنسب", value: "تصميم / مونتاج / شغل ثقيل" },
    ],
  },
  "battlebox-r7": {
    tags: ["ألعاب", "شغل ثقيل", "ترقيات لاحقة"],
    modelLabel: "Gaming Build 2024",
    decisionBadge: "تجميعة جاهزة للأداء",
    decisionTitle: "جاهزة للعب والشغل الثقيل من أول يوم",
    decisionDescription:
      "لو تريد تجميعة قوية بدون دوخة شراء قطع منفصلة، فهذه النسخة تضع الجرافيك والرام والتخزين في قرار واحد واضح وقابل للترقية لاحقًا.",
    decisionProofs: [
      {
        label: "جاهزة من البداية",
        title: "لا تحتاج تجميع قطع",
        description:
          "القرار هنا أوضح من شراء كل قطعة وحدها، خصوصًا لو تريد تشغيل الجهاز فور وصوله.",
      },
      {
        label: "أداء حقيقي",
        title: "لعب وبث وشغل ثقيل",
        description:
          "خيارات RTX 4060 و4070 مع Ryzen 7 تعطي مساحة أقوى للجيمينج والبث وبعض أعمال الإنتاج.",
      },
      {
        label: "ترقية لاحقًا",
        title: "يبقى قابل للتوسعة",
        description:
          "واضح من البداية كيف تنتقل من 16GB إلى 32GB أو تجهز الجهاز لاستخدامات أقوى لاحقًا.",
      },
    ],
    bundleTitle: "كمّل محطة اللعب",
    bundleSubtitle:
      "شاشة سريعة وإكسسوارات عملية تكمل التجميعة من أول تشغيل بدل ما تدور عليها لاحقًا.",
    trustedBadgeTitle: "لتجميعة تشتغل من أول يوم",
    trustedBadgeSubtitle:
      "إشارات مختصرة تهم من يشتري جهازًا كاملًا للأداء والترقية وليس مجرد قطعة منفصلة.",
    trustedBadgeItems: [
      "توافق القطع موضح",
      "اختبار قبل الشحن",
      "دعم ترقية لاحقًا",
    ],
    commandFacts: [
      { label: "الأفضل لـ", value: "جيمينج / بث / شغل ثقيل" },
      { label: "الجرافيك", value: "RTX 4060 أو 4070" },
      { label: "الرام", value: "16GB أو 32GB" },
      { label: "الترقية", value: "جاهزة للترقيات لاحقًا" },
    ],
    specs: [
      { label: "المعالج", value: "Ryzen 7" },
      { label: "الجرافيك", value: "RTX 4060 أو RTX 4070" },
      { label: "الرام", value: "16GB أو 32GB" },
      { label: "التخزين", value: "1TB SSD" },
      { label: "التبريد", value: "هوائي مضبوط للفئة" },
      { label: "الاستخدام الأنسب", value: "جيمينج / شغل ثقيل / بث" },
    ],
  },
  "mini-station-i5": {
    tags: ["مكاتب", "نقاط بيع", "مساحات صغيرة"],
    modelLabel: "Business Mini 2024",
    decisionBadge: "وحدة مكتبية مدمجة",
    decisionTitle: "مناسبة للمكتب والمساحات الصغيرة",
    decisionDescription:
      "حل مكتبي صغير ومرتب للمكاتب ونقاط البيع، مع أداء ثابت وتوصيل سهل من غير حجم مزعج على المكتب.",
    commandFacts: [
      { label: "الأفضل لـ", value: "مكتب / كاشير / إدارة" },
      { label: "الحجم", value: "مدمج للمساحات الصغيرة" },
      { label: "التوصيل", value: "HDMI + USB-A + USB-C" },
      { label: "التخزين", value: "حتى 1TB SSD" },
    ],
    specs: [
      { label: "المعالج", value: "Intel Core i5" },
      { label: "الرام", value: "16GB" },
      { label: "التخزين", value: "512GB أو 1TB SSD" },
      { label: "الحجم", value: "وحدة مدمجة للمكاتب" },
      { label: "التوصيل", value: "HDMI + USB-A + USB-C" },
      { label: "الاستخدام الأنسب", value: "مكتب / كاشير / إدارة يومية" },
    ],
  },
  "quadview-27-qhd": {
    tags: ["شغل مكتبي", "تصميم", "تعدد نوافذ"],
    modelLabel: "Display Line 27",
    decisionBadge: "شاشة للعمل والتركيز",
    decisionTitle: "ألوان أوضح ومساحة أنسب للشغل",
    decisionDescription:
      "شاشة QHD بمساحة مرتبة للمكتب والتصميم وتعدد النوافذ، مع فرق واضح بين نسخ التحديث العالي والعادي.",
    commandFacts: [
      { label: "الأفضل لـ", value: "مكتب / تصميم / نوافذ أكثر" },
      { label: "الدقة", value: "QHD" },
      { label: "التحديث", value: "100Hz أو 165Hz" },
      { label: "التوصيل", value: "HDMI + DisplayPort" },
    ],
    specs: [
      { label: "المقاس", value: "27 بوصة" },
      { label: "الدقة", value: "QHD" },
      { label: "معدل التحديث", value: "100Hz أو 165Hz" },
      { label: "اللوحة", value: "ألوان متوازنة للعمل اليومي" },
      { label: "التوصيل", value: "HDMI + DisplayPort" },
      { label: "الاستخدام الأنسب", value: "مكتب / تصميم / جيمينج خفيف" },
    ],
  },
  "mechboard-pro": {
    tags: ["كتابة مريحة", "ألعاب خفيفة", "مكتب مرتب"],
    modelLabel: "Desk Gear Pro",
    decisionBadge: "إكسسوار عملي يومي",
    decisionTitle: "اختيار أوضح لمكتبك أو جلسة اللعب",
    decisionDescription:
      "كيبورد ميكانيكي بخيارات واضحة للسويتش، مناسب للكتابة الطويلة والعمل والألعاب الخفيفة من غير تعقيد.",
    commandFacts: [
      { label: "الأفضل لـ", value: "كتابة / شغل / لعب خفيف" },
      { label: "السويتش", value: "لينير أو تاكتايل" },
      { label: "التوصيل", value: "USB سلكي" },
      { label: "الخامة", value: "قاعدة ثابتة ومفاتيح واضحة" },
    ],
    specs: [
      { label: "النوع", value: "كيبورد ميكانيكي" },
      { label: "السويتش", value: "لينير أو تاكتايل" },
      { label: "التوصيل", value: "USB سلكي" },
      { label: "التخطيط", value: "Full-size عربي / إنجليزي" },
      { label: "الخامة", value: "قاعدة ثابتة ومفاتيح واضحة" },
      { label: "الاستخدام الأنسب", value: "كتابة / شغل / لعب خفيف" },
    ],
  },
  "precision-mouse-lite": {
    tags: ["تنقل يومي", "شغل مكتبي", "راحة أفضل"],
    modelLabel: "Lite Mobility",
    decisionBadge: "إكسسوار أساسي",
    decisionTitle: "خفيف وعملي للاستخدام اليومي",
    decisionDescription:
      "ماوس لاسلكي خفيف وسهل الحمل، مناسب للشغل اليومي والتنقل بين الأجهزة من غير حجم مبالغ فيه.",
    commandFacts: [
      { label: "الأفضل لـ", value: "مكتب / لابتوب / تنقل" },
      { label: "النوع", value: "لاسلكي" },
      { label: "الوزن", value: "خفيف للاستخدام اليومي" },
      { label: "الألوان", value: "جرافيت / أبيض / أزرق داكن" },
    ],
    specs: [
      { label: "النوع", value: "ماوس لاسلكي" },
      { label: "الدقة", value: "مناسبة للشغل اليومي" },
      { label: "البطارية", value: "تشغيل ممتد" },
      { label: "الوزن", value: "خفيف وسهل الحمل" },
      { label: "التوصيل", value: "USB Receiver" },
      { label: "الاستخدام الأنسب", value: "مكتب / لابتوب / تنقل" },
    ],
  },
  "dockstation-9in1": {
    tags: ["يكمل اللابتوب", "توصيل أسرع", "مكتب أنظف"],
    modelLabel: "Connectivity Hub",
    decisionBadge: "مكمّل أساسي للابتوب",
    decisionTitle: "يوصل مكتبك أسرع وبشكل أرتب",
    decisionDescription:
      "إذا كنت تعمل على لابتوب وتحتاج شاشة وملحقات ومنافذ أكثر، فهذه الوحدة تجمعها لك في قرار واحد بسيط.",
    commandFacts: [
      { label: "الأفضل لـ", value: "مكتب / شاشة خارجية / ملحقات" },
      { label: "المنافذ", value: "9 منافذ عملية" },
      { label: "الاستخدام", value: "توسيع منافذ اللابتوب" },
      { label: "التوافق", value: "أجهزة USB-C الشائعة" },
    ],
    specs: [
      { label: "النوع", value: "وحدة توصيل 9 في 1" },
      { label: "المنافذ", value: "HDMI + USB-C + USB-A + قارئ بطاقات" },
      { label: "الاستخدام", value: "توسيع منافذ اللابتوب" },
      { label: "الخامة", value: "هيكل عملي للاستخدام المكتبي" },
      { label: "التوافق", value: "أجهزة USB-C الشائعة" },
      { label: "الاستخدام الأنسب", value: "مكتب / شاشة خارجية / ملحقات" },
    ],
  },
} as const;

const CUTLINE_CLUB_GALLERIES = {
  "cutline-transit-set": [
    "/assets/themes/cutline-club/products/set-midnight.jpg",
    "/assets/themes/cutline-club/products/set-sand.jpg",
  ],
  "cutline-frame-overshirt": [
    "/assets/themes/cutline-club/products/overshirt-ink.jpg",
    "/assets/themes/cutline-club/products/overshirt-clay.jpg",
  ],
  "cutline-line-tee": ["/assets/themes/cutline-club/products/tee-ivory.jpg"],
  "cutline-grid-hoodie": [
    "/assets/themes/cutline-club/products/hoodie-rust.jpg",
  ],
  "cutline-carve-cargo": ["/assets/themes/cutline-club/products/cargo-ink.jpg"],
  "cutline-pleat-trouser": [
    "/assets/themes/cutline-club/products/trouser-stone.jpg",
  ],
  "cutline-wrap-bag": ["/assets/themes/cutline-club/products/wrap-bag.jpg"],
} as const;

const CUTLINE_CLUB_VARIANTS = {
  "cutline-transit-set": buildColorSizeVariants(
    "cutline-transit-set",
    "CUTLINE-SET",
    [
      {
        code: "midnight",
        label: "كحلي ليلي",
        image: CUTLINE_CLUB_GALLERIES["cutline-transit-set"][0],
      },
      {
        code: "sand",
        label: "رملي دافئ",
        image: CUTLINE_CLUB_GALLERIES["cutline-transit-set"][1],
      },
    ],
    2490,
    2890,
    ["S", "M", "L", "XL"],
  ),
  "cutline-frame-overshirt": buildColorSizeVariants(
    "cutline-frame-overshirt",
    "CUTLINE-OVER",
    [
      {
        code: "ink",
        label: "حبر داكن",
        image: CUTLINE_CLUB_GALLERIES["cutline-frame-overshirt"][0],
      },
      {
        code: "clay",
        label: "طيني هادئ",
        image: CUTLINE_CLUB_GALLERIES["cutline-frame-overshirt"][1],
      },
    ],
    1690,
    1990,
    ["S", "M", "L", "XL"],
  ),
  "cutline-line-tee": buildSizeVariants(
    "cutline-line-tee",
    "CUTLINE-TEE",
    890,
    1090,
    CUTLINE_CLUB_GALLERIES["cutline-line-tee"][0],
    ["S", "M", "L", "XL"],
  ),
  "cutline-grid-hoodie": buildSizeVariants(
    "cutline-grid-hoodie",
    "CUTLINE-HOOD",
    1490,
    1730,
    CUTLINE_CLUB_GALLERIES["cutline-grid-hoodie"][0],
    ["S", "M", "L", "XL"],
  ),
  "cutline-carve-cargo": buildSizeVariants(
    "cutline-carve-cargo",
    "CUTLINE-CARGO",
    1590,
    1890,
    CUTLINE_CLUB_GALLERIES["cutline-carve-cargo"][0],
    ["30", "32", "34", "36"],
  ),
  "cutline-pleat-trouser": buildSizeVariants(
    "cutline-pleat-trouser",
    "CUTLINE-PLEAT",
    1490,
    1790,
    CUTLINE_CLUB_GALLERIES["cutline-pleat-trouser"][0],
    ["30", "32", "34", "36"],
  ),
} as const;

const CUTLINE_CLUB_VOLUME_DISCOUNTS = [
  {
    id: "cutline-look-duo",
    minQuantity: 2,
    maxQuantity: 2,
    discountType: "percentage" as const,
    discountValue: 8,
  },
  {
    id: "cutline-look-trio",
    minQuantity: 3,
    maxQuantity: null,
    discountType: "percentage" as const,
    discountValue: 12,
  },
] as const;

const CLOSET_OS_GALLERIES = {
  "closet-weekday-poplin": [
    "/assets/themes/closet-os/products/weekday-poplin-cloud.jpg",
    "/assets/themes/closet-os/products/weekday-poplin-slate.jpg",
  ],
  "closet-relay-tee": ["/assets/themes/closet-os/products/relay-tee-sand.jpg"],
  "closet-commute-trouser": [
    "/assets/themes/closet-os/products/commute-trouser-ink.jpg",
  ],
  "closet-soft-cardigan": [
    "/assets/themes/closet-os/products/soft-cardigan-oat.jpg",
  ],
  "closet-weekend-capsule": [
    "/assets/themes/closet-os/products/weekend-capsule-stone.jpg",
    "/assets/themes/closet-os/products/weekend-capsule-ink.jpg",
  ],
  "closet-slot-overshirt": [
    "/assets/themes/closet-os/products/slot-overshirt-sage.jpg",
    "/assets/themes/closet-os/products/slot-overshirt-graphite.jpg",
  ],
  "closet-laundry-tote": [
    "/assets/themes/closet-os/products/laundry-tote-sage.jpg",
  ],
} as const;

const CLOSET_OS_VARIANTS = {
  "closet-weekday-poplin": buildColorSizeVariants(
    "closet-weekday-poplin",
    "CLOSET-SHIRT",
    [
      {
        code: "cloud",
        label: "أبيض سحابي",
        image: CLOSET_OS_GALLERIES["closet-weekday-poplin"][0],
      },
      {
        code: "slate",
        label: "رمادي سلايت",
        image: CLOSET_OS_GALLERIES["closet-weekday-poplin"][1],
      },
    ],
    1650,
    1890,
    ["S", "M", "L", "XL"],
  ),
  "closet-relay-tee": buildSizeVariants(
    "closet-relay-tee",
    "CLOSET-TEE",
    840,
    980,
    CLOSET_OS_GALLERIES["closet-relay-tee"][0],
    ["S", "M", "L", "XL"],
  ),
  "closet-commute-trouser": buildSizeVariants(
    "closet-commute-trouser",
    "CLOSET-PANT",
    1580,
    1790,
    CLOSET_OS_GALLERIES["closet-commute-trouser"][0],
    ["30", "32", "34", "36"],
  ),
  "closet-soft-cardigan": buildSizeVariants(
    "closet-soft-cardigan",
    "CLOSET-CARDI",
    1440,
    1640,
    CLOSET_OS_GALLERIES["closet-soft-cardigan"][0],
    ["S", "M", "L", "XL"],
  ),
  "closet-weekend-capsule": buildColorSizeVariants(
    "closet-weekend-capsule",
    "CLOSET-SET",
    [
      {
        code: "stone",
        label: "ستون دافئ",
        image: CLOSET_OS_GALLERIES["closet-weekend-capsule"][0],
      },
      {
        code: "ink",
        label: "إنك داكن",
        image: CLOSET_OS_GALLERIES["closet-weekend-capsule"][1],
      },
    ],
    2390,
    2680,
    ["S", "M", "L", "XL"],
  ),
  "closet-slot-overshirt": buildColorSizeVariants(
    "closet-slot-overshirt",
    "CLOSET-OVER",
    [
      {
        code: "sage",
        label: "سيج هادئ",
        image: CLOSET_OS_GALLERIES["closet-slot-overshirt"][0],
      },
      {
        code: "graphite",
        label: "جرافيت",
        image: CLOSET_OS_GALLERIES["closet-slot-overshirt"][1],
      },
    ],
    1740,
    1980,
    ["S", "M", "L", "XL"],
  ),
} as const;

const CLOSET_OS_VOLUME_DISCOUNTS = [
  {
    id: "closet-os-duo-save",
    minQuantity: 2,
    maxQuantity: 2,
    discountType: "percentage" as const,
    discountValue: 7,
  },
  {
    id: "closet-os-week-save",
    minQuantity: 3,
    maxQuantity: null,
    discountType: "percentage" as const,
    discountValue: 10,
  },
] as const;

const previewProductsByTheme: Record<string, Product[]> = {
  "fitting-room-studio": [
    {
      id: "fr-fitting-dress",
      slug: "fr-fitting-dress",
      name: "Fitting dress",
      description:
        "A soft first-look dress with a simple fit line, made for shoppers who want to compare size and color before opening the bag.",
      price: 199,
      comparePrice: 229,
      stock: 6,
      images: FITTING_ROOM_STUDIO_GALLERIES["fr-fitting-dress"],
      categoryId: "dresses",
      category: { id: "dresses", name: "Dresses" },
      productVariants: FITTING_ROOM_STUDIO_VARIANTS["fr-fitting-dress"],
      variants: FITTING_ROOM_STUDIO_VARIANTS["fr-fitting-dress"],
    },
    {
      id: "fr-cotton-t-shirt",
      slug: "fr-cotton-t-shirt",
      name: "Cotton T-shirt",
      description:
        "A clean cotton layer for the first basket: light, easy to style, and clear enough to pair with denim from the same screen.",
      price: 59,
      comparePrice: 72,
      stock: 10,
      images: FITTING_ROOM_STUDIO_GALLERIES["fr-cotton-t-shirt"],
      categoryId: "tops",
      category: { id: "tops", name: "Tops" },
      productVariants: FITTING_ROOM_STUDIO_VARIANTS["fr-cotton-t-shirt"],
      variants: FITTING_ROOM_STUDIO_VARIANTS["fr-cotton-t-shirt"],
    },
    {
      id: "fr-jean-jacket",
      slug: "fr-jean-jacket",
      name: "Jean jacket",
      description:
        "The hero denim piece for the theme, with visible color and size choices and a compact app-style path into the shopping bag.",
      price: 109,
      comparePrice: 139,
      stock: 8,
      images: FITTING_ROOM_STUDIO_GALLERIES["fr-jean-jacket"],
      categoryId: "denim",
      category: { id: "denim", name: "Denim" },
      productVariants: FITTING_ROOM_STUDIO_VARIANTS["fr-jean-jacket"],
      variants: FITTING_ROOM_STUDIO_VARIANTS["fr-jean-jacket"],
    },
    {
      id: "fr-denim-short",
      slug: "fr-denim-short",
      name: "Denim short",
      description:
        "Light denim shorts that complete the reference outfit and keep the product grid focused on fast outfit building.",
      price: 79,
      comparePrice: 96,
      stock: 7,
      images: FITTING_ROOM_STUDIO_GALLERIES["fr-denim-short"],
      categoryId: "denim",
      category: { id: "denim", name: "Denim" },
      productVariants: FITTING_ROOM_STUDIO_VARIANTS["fr-denim-short"],
      variants: FITTING_ROOM_STUDIO_VARIANTS["fr-denim-short"],
    },
    {
      id: "fr-soft-cardigan",
      slug: "fr-soft-cardigan",
      name: "Soft cardigan",
      description:
        "A light layer for shoppers who want one more calm item in the bag without changing the outfit direction.",
      price: 89,
      comparePrice: 108,
      stock: 5,
      images: FITTING_ROOM_STUDIO_GALLERIES["fr-soft-cardigan"],
      categoryId: "layers",
      category: { id: "layers", name: "Layers" },
      productVariants: FITTING_ROOM_STUDIO_VARIANTS["fr-soft-cardigan"],
      variants: FITTING_ROOM_STUDIO_VARIANTS["fr-soft-cardigan"],
    },
    {
      id: "fr-canvas-tote",
      slug: "fr-canvas-tote",
      name: "Canvas tote",
      description:
        "A soft accessory add-on for the compact checkout flow, sized as an easy one-tap basket builder.",
      price: 49,
      comparePrice: 64,
      stock: 12,
      images: FITTING_ROOM_STUDIO_GALLERIES["fr-canvas-tote"],
      categoryId: "accessories",
      category: { id: "accessories", name: "Accessories" },
      productVariants: FITTING_ROOM_STUDIO_VARIANTS["fr-canvas-tote"],
      variants: FITTING_ROOM_STUDIO_VARIANTS["fr-canvas-tote"],
    },
  ],
  "cafe-demo": [
    {
      id: "house-blend-beans",
      slug: "house-blend-beans",
      name: "حبوب هاوس بليند",
      description:
        "مزيج البيت اليومي بنفحات شوكولاتة وبندق وتحميص متوسط، يطلع بطعم ثابت في الإسبريسو والفلتر ويخليك ترجع له كل مرة.",
      price: 310,
      comparePrice: 345,
      images: [buildUnsplashImage("1495474472287-4d71bcdd2085")],
      categoryId: "beans",
      category: { id: "beans", name: "حبوب القهوة" },
      productVariants: [],
      variants: [],
    },
    {
      id: "ethiopian-filter",
      slug: "ethiopian-filter",
      name: "إثيوبي فلتر 250 جم",
      description:
        "بن فلتر بطابع فاكهي ولمسة ياسمين خفيفة، مناسب للي يحب كوب نضيف وريحة تطول في المزاج.",
      price: 355,
      comparePrice: 390,
      images: [buildUnsplashImage("1447933601403-0c6688de566e")],
      categoryId: "beans",
      category: { id: "beans", name: "حبوب القهوة" },
      productVariants: [],
      variants: [],
    },
    {
      id: "oat-latte-bottle",
      slug: "oat-latte-bottle",
      name: "أوت لاتيه بارد",
      description:
        "لاتيه بارد بالشوفان بحلاوة خفيفة وطعم متوازن، حل سريع للمكتب أو المشوار لما تبقى عايز قهوة جاهزة ومضمونة.",
      price: 125,
      comparePrice: 145,
      images: [buildUnsplashImage("1517701604599-bb29b565090c")],
      categoryId: "cold-brews",
      category: { id: "cold-brews", name: "المشروبات الباردة" },
      productVariants: [],
      variants: [],
    },
    {
      id: "vanilla-cold-brew",
      slug: "vanilla-cold-brew",
      name: "كولد برو فانيلا",
      description:
        "استخلاص بارد مركز بطعم سلس ولمسة فانيلا هادية، يشرب لوحده أو على تلج وحليب ويطلع مضبوط في الحالتين.",
      price: 165,
      comparePrice: 185,
      images: [buildUnsplashImage("1461023058943-07fcbe16d735")],
      categoryId: "cold-brews",
      category: { id: "cold-brews", name: "المشروبات الباردة" },
      productVariants: [],
      variants: [],
    },
    {
      id: "pistachio-croissant",
      slug: "pistachio-croissant",
      name: "كرواسون فستق طازج",
      description:
        "كرواسون مورق بحشوة فستق خفيفة يكمّل قهوة الصبح ويخلي الطلبة متظبطة من أولها.",
      price: 88,
      comparePrice: 98,
      images: [buildUnsplashImage("1509440159596-0249088772ff")],
      categoryId: "pastries",
      category: { id: "pastries", name: "المخبوزات" },
      productVariants: [],
      variants: [],
    },
    {
      id: "caramel-roll",
      slug: "caramel-roll",
      name: "رول قرفة كراميل",
      description:
        "رول قرفة دافئ بطبقة كراميل خفيفة ولمسة قهوة، اختيار سهل للي عايز حلو يظبط مع اللاتيه.",
      price: 92,
      comparePrice: 105,
      images: [buildUnsplashImage("1509365465985-25d11c17e812")],
      categoryId: "pastries",
      category: { id: "pastries", name: "المخبوزات" },
      productVariants: [],
      variants: [],
    },
    {
      id: "ceramic-v60-kit",
      slug: "ceramic-v60-kit",
      name: "طقم V60 سيراميك",
      description:
        "طقم تحضير عملي فيه الدريبر والفلاتر وكوب التقديم، مناسب للي عايز يبدأ ركنة قهوة البيت من غير لف كتير.",
      price: 540,
      comparePrice: 610,
      images: [buildUnsplashImage("1517668808822-9ebb02f2a0e6")],
      categoryId: "brew-tools",
      category: { id: "brew-tools", name: "أدوات التحضير" },
      productVariants: [],
      variants: [],
    },
    {
      id: "milk-frother",
      slug: "milk-frother",
      name: "خفّاق حليب يدوي",
      description:
        "خفّاق صغير وسريع يطلع رغوة ناعمة للاتيه والكابتشينو في البيت من غير معدات كبيرة.",
      price: 245,
      comparePrice: 285,
      images: [buildUnsplashImage("1517701550927-30cf4ba1f864")],
      categoryId: "brew-tools",
      category: { id: "brew-tools", name: "أدوات التحضير" },
      productVariants: [],
      variants: [],
    },
  ],
  "restaurant-demo": [
    {
      id: "rush-combo",
      slug: "rush-combo",
      name: "راش كومبو",
      description:
        "دبل سماش برجر مع بطاطس ومشروب بارد، وجبة تشبع من أول لقمة وتطلعك من حيرة الطلب بسرعة.",
      price: 235,
      comparePrice: 275,
      images: [
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "combos",
      category: { id: "combos", name: "الكومبوهات" },
      productVariants: [],
      variants: [],
    },
    {
      id: "firebird",
      slug: "firebird",
      name: "فايربيرد تشيكن",
      description:
        "برجر دجاج مقرمش بصوص مدخن ومخلل وثوم، طعمه واضح ويشبع من غير ما تحتاج تضيف كتير.",
      price: 185,
      comparePrice: 210,
      images: [
        "https://images.unsplash.com/photo-1610614819513-58e34989848b?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "burgers",
      category: { id: "burgers", name: "البرجر" },
      productVariants: [],
      variants: [],
    },
    {
      id: "volcano-fries",
      slug: "volcano-fries",
      name: "فولكانو فرايز",
      description:
        "بطاطس عليها جبنة ذايبة وهالبينو وبصل مقرمش، الإضافة اللي ترفع أي أوردر وتخلّيه أمتع.",
      price: 95,
      comparePrice: 115,
      images: [
        "https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "sides",
      category: { id: "sides", name: "الإضافات" },
      productVariants: [],
      variants: [],
    },
    {
      id: "citrus-fizz",
      slug: "citrus-fizz",
      name: "سيتروس فيز",
      description:
        "مشروب لايم منعش بالنعناع يبرد الوجبة ويكمل مع البرجر من أول رشفة.",
      price: 55,
      images: [
        "https://images.unsplash.com/photo-1499638673689-79a0b5115d87?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "drinks",
      category: { id: "drinks", name: "المشروبات" },
      productVariants: [],
      variants: [],
    },
    {
      id: "cookie-bomb",
      slug: "cookie-bomb",
      name: "كوكي بومب",
      description:
        "كوكي دافئ مع فانيلا وكراميل، ختمة حلوة تخلي الأوردر كامل للآخر.",
      price: 88,
      images: [
        "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "desserts",
      category: { id: "desserts", name: "الحلو" },
      productVariants: [],
      variants: [],
    },
    {
      id: "family-rush",
      slug: "family-rush",
      name: "فاميلي راش ميل",
      description:
        "أربع برجرات مع بطاطس ومشروبات، اختيار عملي للشلة أو البيت عشان تطلب مرة واحدة وخلاص.",
      price: 540,
      comparePrice: 610,
      images: [
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "combos",
      category: { id: "combos", name: "الكومبوهات" },
      productVariants: [],
      variants: [],
    },
  ],
  "butcher-counter-eg": [
    {
      id: "baladi-beef-cubes",
      slug: "baladi-beef-cubes",
      name: "Prime Beef Cubes",
      description:
        "مكعبات premium للتسوية البطيئة والطواجن، تتجهز بالحجم المطلوب ويؤكد الوزن قبل دخول غرفة التقطيع.",
      price: 385,
      comparePrice: 420,
      images: [
        "https://images.unsplash.com/photo-1690983323544-026a23725551?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "beef-cuts",
      category: {
        id: "beef-cuts",
        name: "Prime Beef",
        slug: "beef-cuts",
        image:
          "https://images.unsplash.com/photo-1690983323544-026a23725551?auto=format&fit=crop&w=900&q=80",
      },
      productVariants: [
        {
          id: "baladi-beef-cubes-half",
          name: "نصف كيلو / مكعبات صغيرة",
          price: 195,
          comparePrice: 215,
          sku: "BUT-BEEF-CUBES-500",
          image:
            "https://images.unsplash.com/photo-1690983323544-026a23725551?auto=format&fit=crop&w=900&q=80",
          stock: 12,
          attributes: { الوزن: "نصف كيلو", التقطيع: "مكعبات صغيرة" },
          attributeValues: { الوزن: "نصف كيلو", التقطيع: "مكعبات صغيرة" },
        },
        {
          id: "baladi-beef-cubes-one",
          name: "كيلو / مكعبات طبخ",
          price: 385,
          comparePrice: 420,
          sku: "BUT-BEEF-CUBES-1000",
          image:
            "https://images.unsplash.com/photo-1690983323544-026a23725551?auto=format&fit=crop&w=900&q=80",
          stock: 18,
          attributes: { الوزن: "كيلو", التقطيع: "مكعبات طبخ" },
          attributeValues: { الوزن: "كيلو", التقطيع: "مكعبات طبخ" },
        },
      ],
      variants: [],
    },
    {
      id: "ribeye-steak-cut",
      slug: "ribeye-steak-cut",
      name: "Black Label Ribeye",
      description:
        "ريب آي بسمك grill-house، مناسب للتسوية السريعة والتغليف المنفصل حسب عدد القطع.",
      price: 620,
      comparePrice: 690,
      images: [
        "https://images.unsplash.com/photo-1768203627849-a6c5cb9adb3d?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "beef-cuts",
      category: { id: "beef-cuts", name: "Prime Beef", slug: "beef-cuts" },
      productVariants: [
        {
          id: "ribeye-steak-cut-2",
          name: "قطعتين / سميك",
          price: 620,
          comparePrice: 690,
          sku: "BUT-RIBEYE-2",
          image:
            "https://images.unsplash.com/photo-1768203627849-a6c5cb9adb3d?auto=format&fit=crop&w=900&q=80",
          stock: 7,
          attributes: { الكمية: "قطعتين", التقطيع: "سميك" },
          attributeValues: { الكمية: "قطعتين", التقطيع: "سميك" },
        },
        {
          id: "ribeye-steak-cut-4",
          name: "أربع قطع / عزومة صغيرة",
          price: 1180,
          comparePrice: 1320,
          sku: "BUT-RIBEYE-4",
          image:
            "https://images.unsplash.com/photo-1768203627849-a6c5cb9adb3d?auto=format&fit=crop&w=900&q=80",
          stock: 5,
          attributes: { الكمية: "أربع قطع", التقطيع: "سميك" },
          attributeValues: { الكمية: "أربع قطع", التقطيع: "سميك" },
        },
      ],
      variants: [],
    },
    {
      id: "lamb-ribs-grill",
      slug: "lamb-ribs-grill",
      name: "Aged Lamb Ribs",
      description:
        "ريش ضاني بعرض متوازن للعزومات، تتجهز للشوي مع مساحة واضحة لملاحظات التتبيلة.",
      price: 540,
      comparePrice: 590,
      images: [
        "https://images.unsplash.com/photo-1777962822456-62a3fde3c39e?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "lamb-grill",
      category: {
        id: "lamb-grill",
        name: "Aged Grill",
        slug: "lamb-grill",
        image:
          "https://images.unsplash.com/photo-1777962822456-62a3fde3c39e?auto=format&fit=crop&w=900&q=80",
      },
      productVariants: [
        {
          id: "lamb-ribs-grill-half",
          name: "نصف كيلو / جاهز للشوي",
          price: 275,
          comparePrice: 300,
          sku: "BUT-LAMB-RIBS-500",
          image:
            "https://images.unsplash.com/photo-1777962822456-62a3fde3c39e?auto=format&fit=crop&w=900&q=80",
          stock: 8,
          attributes: { الوزن: "نصف كيلو", التجهيز: "جاهز للشوي" },
          attributeValues: { الوزن: "نصف كيلو", التجهيز: "جاهز للشوي" },
        },
        {
          id: "lamb-ribs-grill-one",
          name: "كيلو / عزومة",
          price: 540,
          comparePrice: 590,
          sku: "BUT-LAMB-RIBS-1000",
          image:
            "https://images.unsplash.com/photo-1777962822456-62a3fde3c39e?auto=format&fit=crop&w=900&q=80",
          stock: 10,
          attributes: { الوزن: "كيلو", التجهيز: "عزومة" },
          attributeValues: { الوزن: "كيلو", التجهيز: "عزومة" },
        },
      ],
      variants: [],
    },
    {
      id: "kofta-grill-mix",
      slug: "kofta-grill-mix",
      name: "Signature Kofta Blend",
      description:
        "خلطة كفتة signature للشوي أو الصينية، بنسبة دهن واضحة وتجهيز premium قبل التغليف.",
      price: 310,
      comparePrice: 345,
      images: [
        "https://images.unsplash.com/photo-1759803430575-2929b70c5d42?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "minced-sausage",
      category: {
        id: "minced-sausage",
        name: "Mince Atelier",
        slug: "minced-sausage",
        image:
          "https://images.unsplash.com/photo-1759803430575-2929b70c5d42?auto=format&fit=crop&w=900&q=80",
      },
      productVariants: [
        {
          id: "kofta-grill-mix-half",
          name: "نصف كيلو / متبل",
          price: 165,
          comparePrice: 185,
          sku: "BUT-KOFTA-500",
          image:
            "https://images.unsplash.com/photo-1759803430575-2929b70c5d42?auto=format&fit=crop&w=900&q=80",
          stock: 15,
          attributes: { الوزن: "نصف كيلو", التجهيز: "متبل" },
          attributeValues: { الوزن: "نصف كيلو", التجهيز: "متبل" },
        },
        {
          id: "kofta-grill-mix-one",
          name: "كيلو / متبل",
          price: 310,
          comparePrice: 345,
          sku: "BUT-KOFTA-1000",
          image:
            "https://images.unsplash.com/photo-1759803430575-2929b70c5d42?auto=format&fit=crop&w=900&q=80",
          stock: 16,
          attributes: { الوزن: "كيلو", التجهيز: "متبل" },
          attributeValues: { الوزن: "كيلو", التجهيز: "متبل" },
        },
      ],
      variants: [],
    },
    {
      id: "baladi-sausage",
      slug: "baladi-sausage",
      name: "Smoked House Sausage",
      description:
        "سجق house-style بطعم قوي للساندوتشات والصواني، يتغلف حسب الكمية ويتجهز للتسوية السريعة.",
      price: 285,
      comparePrice: 320,
      images: [
        "https://images.unsplash.com/photo-1759803430575-2929b70c5d42?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "minced-sausage",
      category: { id: "minced-sausage", name: "Mince Atelier", slug: "minced-sausage" },
      productVariants: [
        {
          id: "baladi-sausage-half",
          name: "نصف كيلو",
          price: 150,
          comparePrice: 170,
          sku: "BUT-SAUSAGE-500",
          image:
            "https://images.unsplash.com/photo-1759803430575-2929b70c5d42?auto=format&fit=crop&w=900&q=80",
          stock: 11,
          attributes: { الوزن: "نصف كيلو" },
          attributeValues: { الوزن: "نصف كيلو" },
        },
        {
          id: "baladi-sausage-one",
          name: "كيلو",
          price: 285,
          comparePrice: 320,
          sku: "BUT-SAUSAGE-1000",
          image:
            "https://images.unsplash.com/photo-1759803430575-2929b70c5d42?auto=format&fit=crop&w=900&q=80",
          stock: 13,
          attributes: { الوزن: "كيلو" },
          attributeValues: { الوزن: "كيلو" },
        },
      ],
      variants: [],
    },
    {
      id: "daily-minced-beef",
      slug: "daily-minced-beef",
      name: "Prime Daily Mince",
      description:
        "مفروم prime للمحاشي والمكرونة والكفتة السريعة، يفرم بعد تأكيد الطلب والوزن.",
      price: 360,
      comparePrice: 395,
      images: [
        "https://images.unsplash.com/photo-1768203627849-a6c5cb9adb3d?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "daily-cooking",
      category: {
        id: "daily-cooking",
        name: "Daily Cuts",
        slug: "daily-cooking",
        image:
          "https://images.unsplash.com/photo-1768203627849-a6c5cb9adb3d?auto=format&fit=crop&w=900&q=80",
      },
      productVariants: [
        {
          id: "daily-minced-beef-half",
          name: "نصف كيلو / ناعم",
          price: 185,
          comparePrice: 205,
          sku: "BUT-MINCE-500",
          image:
            "https://images.unsplash.com/photo-1768203627849-a6c5cb9adb3d?auto=format&fit=crop&w=900&q=80",
          stock: 18,
          attributes: { الوزن: "نصف كيلو", الفرم: "ناعم" },
          attributeValues: { الوزن: "نصف كيلو", الفرم: "ناعم" },
        },
        {
          id: "daily-minced-beef-one",
          name: "كيلو / وسط",
          price: 360,
          comparePrice: 395,
          sku: "BUT-MINCE-1000",
          image:
            "https://images.unsplash.com/photo-1768203627849-a6c5cb9adb3d?auto=format&fit=crop&w=900&q=80",
          stock: 20,
          attributes: { الوزن: "كيلو", الفرم: "وسط" },
          attributeValues: { الوزن: "كيلو", الفرم: "وسط" },
        },
      ],
      variants: [],
    },
    {
      id: "grill-weekend-pack",
      slug: "grill-weekend-pack",
      name: "Weekend Grill Edit",
      description:
        "باقة grill edit لعزومة صغيرة: ريش وكفتة وستيك مع اقتراح وزن واضح لكل فرد.",
      price: 1280,
      comparePrice: 1460,
      images: [
        "https://images.unsplash.com/photo-1777962822456-62a3fde3c39e?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "lamb-grill",
      category: { id: "lamb-grill", name: "Aged Grill", slug: "lamb-grill" },
      productVariants: [],
      variants: [],
    },
    {
      id: "soup-bones-pack",
      slug: "soup-bones-pack",
      name: "Bone & Broth Pack",
      description:
        "إضافة black-kitchen تكمل طلب الطبخ اليومي وتجهز شوربة أو مرقة بطعم أغنى.",
      price: 75,
      comparePrice: 95,
      images: [
        "https://images.unsplash.com/photo-1690983323544-026a23725551?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "add-ons",
      category: {
        id: "add-ons",
        name: "Bone & Broth",
        slug: "add-ons",
        image:
          "https://images.unsplash.com/photo-1690983323544-026a23725551?auto=format&fit=crop&w=900&q=80",
      },
      productVariants: [],
      variants: [],
    },
  ],
  "max-care-go": [
    {
      id: "omega-3-plus",
      slug: "omega-3-plus",
      name: "أوميجا 3 بلس",
      description:
        "مكمّل يومي بتركيبة نقية واستخدام واضح، مناسب للي يحب يطلب احتياجه الشهري بشكل مرتب وسريع.",
      price: 320,
      comparePrice: 360,
      images: [
        "https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "vitamins",
      category: { id: "vitamins", name: "الفيتامينات" },
      productVariants: [],
      variants: [],
    },
    {
      id: "immune-support",
      slug: "immune-support",
      name: "إيميون سابورت",
      description:
        "فيتامين سي مع زنك في عبوة واضحة وسهلة لإعادة الطلب وقت المواسم المتقلبة.",
      price: 285,
      comparePrice: 325,
      images: [
        "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "vitamins",
      category: { id: "vitamins", name: "الفيتامينات" },
      productVariants: [],
      variants: [],
    },
    {
      id: "digital-thermometer",
      slug: "digital-thermometer",
      name: "ترمومتر رقمي سريع",
      description:
        "قياس سريع وواضح خلال ثواني، قطعة أساسية مطلوبة في البيت وسهلة الاستخدام لأي حد.",
      price: 410,
      comparePrice: 460,
      images: [
        "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "medical-devices",
      category: { id: "medical-devices", name: "الأجهزة الطبية" },
      productVariants: [],
      variants: [],
    },
    {
      id: "blood-pressure-monitor",
      slug: "blood-pressure-monitor",
      name: "جهاز قياس ضغط ذكي",
      description:
        "شاشة رقمية واضحة مع حفظ آخر القراءات، مناسب للمتابعة المنزلية بشكل مرتب ومن غير لخبطة.",
      price: 1280,
      comparePrice: 1450,
      images: [buildUnsplashImage("1584362917165-526a968579e8")],
      categoryId: "medical-devices",
      category: { id: "medical-devices", name: "الأجهزة الطبية" },
      productVariants: [],
      variants: [],
    },
    {
      id: "baby-gentle-wash",
      slug: "baby-gentle-wash",
      name: "غسول أطفال لطيف",
      description:
        "تنظيف يومي ناعم للبشرة الحساسة بتركيبة هادية تخلي المنتج سهل كاختيار متكرر للأهل.",
      price: 190,
      comparePrice: 225,
      images: [buildUnsplashImage("1556228578-0d85b1a4d571")],
      categoryId: "baby",
      category: { id: "baby", name: "العناية بالأطفال" },
      productVariants: [],
      variants: [],
    },
    {
      id: "sensitive-sunscreen",
      slug: "sensitive-sunscreen",
      name: "واقي شمس للبشرة الحساسة",
      description:
        "حماية عالية بعامل +50 بملمس خفيف، مناسب للاستعمال اليومي ومنتج سهل يتكرر في الروتين.",
      price: 265,
      comparePrice: 310,
      images: [
        "https://images.unsplash.com/photo-1522338140262-f46f5913618a?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "personal-care",
      category: { id: "personal-care", name: "العناية الشخصية" },
      productVariants: [],
      variants: [],
    },
    {
      id: "first-aid-kit",
      slug: "first-aid-kit",
      name: "شنطة إسعافات أولية",
      description:
        "أساسيات الطوارئ مرتبة في شنطة خفيفة، اختيار مهم للبيت أو العربية أو السفر.",
      price: 540,
      comparePrice: 620,
      images: [
        "https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "first-aid",
      category: { id: "first-aid", name: "الإسعافات الأولية" },
      productVariants: [],
      variants: [],
    },
    {
      id: "cough-relief-syrup",
      slug: "cough-relief-syrup",
      name: "شراب كحة مهدئ",
      description: "شراب لطيف بطعم أسهل، مناسب يبقى جاهز في البيت وقت الحاجة.",
      price: 145,
      comparePrice: 170,
      images: [
        "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=900&q=80",
      ],
      categoryId: "personal-care",
      category: { id: "personal-care", name: "العناية الشخصية" },
      productVariants: [],
      variants: [],
    },
  ],
  "district-market": [
    {
      id: "dm-clip-lid-set",
      slug: "dm-clip-lid-set",
      name: "طقم علب تخزين محكمة",
      description:
        "علب متدرجة بأغطية محكمة تناسب المطبخ والثلاجة وتحافظ على التنظيم اليومي بشكل أوضح.",
      price: 329,
      comparePrice: 395,
      images: ["/assets/themes/district-market/products/storage-set.webp"],
      volumeDiscounts: [
        {
          id: "dm-clip-lid-set-bulk-2",
          minQuantity: 2,
          maxQuantity: 3,
          discountType: "percentage",
          discountValue: 8,
        },
        {
          id: "dm-clip-lid-set-bulk-4",
          minQuantity: 4,
          maxQuantity: null,
          discountType: "percentage",
          discountValue: 12,
        },
      ],
      categoryId: "daily-essentials",
      category: { id: "daily-essentials", name: "أساسيات يومية" },
      productVariants: [],
      variants: [],
    },
    {
      id: "dm-drawer-organizer",
      slug: "dm-drawer-organizer",
      name: "منظم أدراج مرن",
      description:
        "وحدات قابلة للتعديل لترتيب أدوات المطبخ أو المكتب بسرعة ومن غير تعقيد في التقسيم.",
      price: 219,
      comparePrice: 275,
      images: [
        "/assets/themes/district-market/products/drawer-organizer-card.webp",
      ],
      volumeDiscounts: [
        {
          id: "dm-drawer-organizer-bulk-2",
          minQuantity: 2,
          maxQuantity: 3,
          discountType: "percentage",
          discountValue: 6,
        },
        {
          id: "dm-drawer-organizer-bulk-4",
          minQuantity: 4,
          maxQuantity: null,
          discountType: "percentage",
          discountValue: 10,
        },
      ],
      categoryId: "home-kitchen",
      category: { id: "home-kitchen", name: "البيت والمطبخ" },
      productVariants: [],
      variants: [],
    },
    {
      id: "dm-laundry-basket",
      slug: "dm-laundry-basket",
      name: "سلة غسيل قابلة للطي",
      description:
        "سلة خفيفة ومقاومة للماء تناسب الحمام والزوايا الصغيرة وتختفي بسهولة بعد الاستخدام.",
      price: 285,
      comparePrice: 340,
      images: ["/assets/themes/district-market/products/laundry-basket.webp"],
      categoryId: "home-kitchen",
      category: { id: "home-kitchen", name: "البيت والمطبخ" },
      productVariants: [],
      variants: [],
    },
    {
      id: "dm-led-desk-lamp",
      slug: "dm-led-desk-lamp",
      name: "مصباح مكتب LED قابل للشحن",
      description:
        "إضاءة هادئة بثلاث درجات مع قاعدة ثابتة ولمسة أنظف لركنة الشغل أو الدراسة.",
      price: 499,
      comparePrice: 575,
      images: ["/assets/themes/district-market/products/desk-lamp.webp"],
      categoryId: "home-kitchen",
      category: { id: "home-kitchen", name: "البيت والمطبخ" },
      productVariants: [],
      variants: [],
    },
    {
      id: "dm-travel-cubes",
      slug: "dm-travel-cubes",
      name: "طقم أكياس تنظيم سفر",
      description:
        "طقم packing cubes خفيف لترتيب الملابس والإكسسوارات داخل الشنطة بسرعة وبدون فوضى.",
      price: 259,
      comparePrice: 310,
      images: [
        "/assets/themes/district-market/products/travel-cubes-card.webp",
      ],
      categoryId: "travel-ready",
      category: { id: "travel-ready", name: "سفر وخروج" },
      productVariants: [],
      variants: [],
    },
    {
      id: "dm-thermal-bottle",
      slug: "dm-thermal-bottle",
      name: "زجاجة حرارية يومية",
      description:
        "زجاجة أنيقة تحفظ الحرارة لساعات وتناسب المكتب، السيارة، أو روتين اليوم السريع.",
      price: 189,
      comparePrice: 230,
      images: ["/assets/themes/district-market/products/thermal-bottle.webp"],
      volumeDiscounts: [
        {
          id: "dm-thermal-bottle-bulk-2",
          minQuantity: 2,
          maxQuantity: 3,
          discountType: "percentage",
          discountValue: 5,
        },
        {
          id: "dm-thermal-bottle-bulk-4",
          minQuantity: 4,
          maxQuantity: null,
          discountType: "percentage",
          discountValue: 9,
        },
      ],
      categoryId: "daily-essentials",
      category: { id: "daily-essentials", name: "أساسيات يومية" },
      productVariants: [],
      variants: [],
    },
    {
      id: "dm-serving-tray-set",
      slug: "dm-serving-tray-set",
      name: "طقم صواني تقديم خفيفة",
      description:
        "ثلاث صواني بلمسة عملية تناسب التقديم اليومي أو الضيافة السريعة داخل البيت.",
      price: 379,
      comparePrice: 445,
      images: ["/assets/themes/district-market/products/serving-tray.webp"],
      categoryId: "seasonal-picks",
      category: { id: "seasonal-picks", name: "اختيارات موسمية" },
      productVariants: [],
      variants: [],
    },
    {
      id: "dm-aroma-diffuser",
      slug: "dm-aroma-diffuser",
      name: "ناشر عطور منزلي صغير",
      description:
        "جهاز صغير برذاذ ناعم يضيف إحساسًا مرتبًا للغرفة مع تشغيل هادئ وتصميم بسيط.",
      price: 459,
      comparePrice: 520,
      images: ["/assets/themes/district-market/products/aroma-diffuser.webp"],
      categoryId: "seasonal-picks",
      category: { id: "seasonal-picks", name: "اختيارات موسمية" },
      productVariants: [],
      variants: [],
    },
  ],
  "men-shoes-eg": [
    {
      id: "stride-core-runner",
      slug: "stride-core-runner",
      name: "سنيكر كور اليومي",
      description:
        "خفيف للحركة اليومية والشغل والمشاوير، ويطلع شكل رجالي مرتب من أول لبسة.",
      price: 1890,
      comparePrice: 2290,
      stock: 6,
      images: MEN_SHOES_GALLERIES["stride-core-runner"],
      categoryId: "sneakers",
      category: { id: "sneakers", name: "سنيكرز" },
      volumeDiscounts: MEN_SHOES_VOLUME_DISCOUNTS,
      productVariants: MEN_SHOES_VARIANTS["stride-core-runner"],
      variants: MEN_SHOES_VARIANTS["stride-core-runner"],
    },
    {
      id: "city-white-court",
      slug: "city-white-court",
      name: "سنيكر أبيض نظيف",
      description:
        "موديل أبيض يركب على معظم اللبس اليومي ويعطي شكل مرتب من غير أي تكلف.",
      price: 1740,
      comparePrice: 2090,
      stock: 9,
      images: MEN_SHOES_GALLERIES["city-white-court"],
      categoryId: "sneakers",
      category: { id: "sneakers", name: "سنيكرز" },
      volumeDiscounts: MEN_SHOES_VOLUME_DISCOUNTS,
      productVariants: MEN_SHOES_VARIANTS["city-white-court"],
      variants: MEN_SHOES_VARIANTS["city-white-court"],
    },
    {
      id: "flex-knit-runner",
      slug: "flex-knit-runner",
      name: "رانر شبك خفيف",
      description:
        "شبك خفيف ونعل مرن للمشاوير الكتير واليوم الطويل، ويريّح الرجل من غير ما يبان ضخم.",
      price: 1590,
      comparePrice: 1920,
      stock: 7,
      images: MEN_SHOES_GALLERIES["flex-knit-runner"],
      categoryId: "running-daily",
      category: { id: "running-daily", name: "جري يومي" },
      volumeDiscounts: MEN_SHOES_VOLUME_DISCOUNTS,
      productVariants: MEN_SHOES_VARIANTS["flex-knit-runner"],
      variants: MEN_SHOES_VARIANTS["flex-knit-runner"],
    },
    {
      id: "brown-casual-leather",
      slug: "brown-casual-leather",
      name: "كاجوال جلد بني",
      description:
        "موديل جلد عملي للمشاوير والشغل بإحساس أهدى من السنيكرز لكن بدون رسمية زائدة.",
      price: 2190,
      comparePrice: 2590,
      stock: 5,
      images: MEN_SHOES_GALLERIES["brown-casual-leather"],
      categoryId: "casual-leather",
      category: { id: "casual-leather", name: "كاجوال جلد" },
      volumeDiscounts: MEN_SHOES_VOLUME_DISCOUNTS,
      productVariants: MEN_SHOES_VARIANTS["brown-casual-leather"],
      variants: MEN_SHOES_VARIANTS["brown-casual-leather"],
    },
    {
      id: "weekend-suede-low",
      slug: "weekend-suede-low",
      name: "كاجوال شمواه خفيف",
      description:
        "اختيار هادي للخروج والمشاوير السريعة بخامة ناعمة وشكل شيك من غير رسمية زيادة.",
      price: 2050,
      comparePrice: 2390,
      stock: 8,
      images: MEN_SHOES_GALLERIES["weekend-suede-low"],
      categoryId: "casual-leather",
      category: { id: "casual-leather", name: "كاجوال جلد" },
      volumeDiscounts: MEN_SHOES_VOLUME_DISCOUNTS,
      productVariants: MEN_SHOES_VARIANTS["weekend-suede-low"],
      variants: MEN_SHOES_VARIANTS["weekend-suede-low"],
    },
    {
      id: "office-slip-loafer",
      slug: "office-slip-loafer",
      name: "لوفر عملي سهل اللبس",
      description:
        "يتلبس بسرعة ويليق على أيام المكتب والمشاوير الرسمية من غير ما يتعبك في التنسيق.",
      price: 2290,
      comparePrice: 2690,
      stock: 4,
      images: MEN_SHOES_GALLERIES["office-slip-loafer"],
      categoryId: "loafers",
      category: { id: "loafers", name: "لوفر وشغل" },
      volumeDiscounts: MEN_SHOES_VOLUME_DISCOUNTS,
      productVariants: MEN_SHOES_VARIANTS["office-slip-loafer"],
      variants: MEN_SHOES_VARIANTS["office-slip-loafer"],
    },
    {
      id: "derby-clean-cut",
      slug: "derby-clean-cut",
      name: "حذاء ديربي أسود",
      description:
        "شكل أنضف للمكتب والمشاوير الرسمية، بواجهة بسيطة تتنسق بسهولة مع أي لبس شيك.",
      price: 2390,
      comparePrice: 2790,
      stock: 3,
      images: MEN_SHOES_GALLERIES["derby-clean-cut"],
      categoryId: "loafers",
      category: { id: "loafers", name: "لوفر وشغل" },
      volumeDiscounts: MEN_SHOES_VOLUME_DISCOUNTS,
      productVariants: MEN_SHOES_VARIANTS["derby-clean-cut"],
      variants: MEN_SHOES_VARIANTS["derby-clean-cut"],
    },
    {
      id: "clean-step-kit",
      slug: "clean-step-kit",
      name: "طقم عناية وتنظيف",
      description:
        "فرشة ومواد أساسية للحفاظ على الجلد والسنيكرز بشكل أنظف بين لبسة والتانية.",
      price: 390,
      comparePrice: 470,
      images: MEN_SHOES_GALLERIES["clean-step-kit"],
      categoryId: "care-accessories",
      category: { id: "care-accessories", name: "عناية وإكسسوارات" },
      productVariants: [],
      variants: [],
    },
  ],
  "women-fashion-eg": [
    {
      id: "luna-city-sneaker",
      slug: "luna-city-sneaker",
      name: "سنيكر لونا اليومي",
      description:
        "سنيكر خفيف للمشاوير واليوم الطويل، بشياكة حريمي واضحة واختيار سهل للون والمقاس.",
      price: 2280,
      comparePrice: 2590,
      stock: 6,
      images: WOMEN_FASHION_GALLERIES["luna-city-sneaker"],
      categoryId: "sneakers",
      category: { id: "sneakers", name: "سنيكرز" },
      volumeDiscounts: WOMEN_FASHION_VOLUME_DISCOUNTS,
      productVariants: WOMEN_FASHION_VARIANTS["luna-city-sneaker"],
      variants: WOMEN_FASHION_VARIANTS["luna-city-sneaker"],
    },
    {
      id: "soft-stride-runner",
      slug: "soft-stride-runner",
      name: "رانر خطوة ناعمة",
      description:
        "موديل مريح للحركة واليوم الطويل بألوان هادية تمشي مع اللبس اليومي والكاجوال بسهولة.",
      price: 2140,
      comparePrice: 2450,
      stock: 8,
      images: WOMEN_FASHION_GALLERIES["soft-stride-runner"],
      categoryId: "sneakers",
      category: { id: "sneakers", name: "سنيكرز" },
      volumeDiscounts: WOMEN_FASHION_VOLUME_DISCOUNTS,
      productVariants: WOMEN_FASHION_VARIANTS["soft-stride-runner"],
      variants: WOMEN_FASHION_VARIANTS["soft-stride-runner"],
    },
    {
      id: "marina-ballet-flat",
      slug: "marina-ballet-flat",
      name: "فلات مارينا",
      description:
        "فلات خفيفة للكاجوال والشغل الخفيف، قطعة مريحة تتكرر كتير مع الفساتين واللبس اليومي.",
      price: 1960,
      comparePrice: 2290,
      stock: 7,
      images: WOMEN_FASHION_GALLERIES["marina-ballet-flat"],
      categoryId: "flats",
      category: { id: "flats", name: "فلات وكاجوال" },
      volumeDiscounts: WOMEN_FASHION_VOLUME_DISCOUNTS,
      productVariants: WOMEN_FASHION_VARIANTS["marina-ballet-flat"],
      variants: WOMEN_FASHION_VARIANTS["marina-ballet-flat"],
    },
    {
      id: "dusk-block-heel",
      slug: "dusk-block-heel",
      name: "كعب بلوك للمساء",
      description:
        "كعب ثابت بخطوة مريحة، يديك شكل أنيق للخروجات من غير ما يضحي بالراحة.",
      price: 2450,
      comparePrice: 2790,
      stock: 5,
      images: WOMEN_FASHION_GALLERIES["dusk-block-heel"],
      categoryId: "heels",
      category: { id: "heels", name: "كعب وخروجات" },
      productVariants: WOMEN_FASHION_VARIANTS["dusk-block-heel"],
      variants: WOMEN_FASHION_VARIANTS["dusk-block-heel"],
    },
    {
      id: "linen-coord-set",
      slug: "linen-coord-set",
      name: "طقم كتان يومي",
      description:
        "طقم خفيف وجاهز يختصر عليكي تنسيق اللبس، مناسب للنهار والشغل الخفيف من أول تجربة.",
      price: 1890,
      comparePrice: 2190,
      stock: 9,
      images: WOMEN_FASHION_GALLERIES["linen-coord-set"],
      categoryId: "sets",
      category: { id: "sets", name: "أطقم" },
      volumeDiscounts: WOMEN_FASHION_VOLUME_DISCOUNTS,
      productVariants: WOMEN_FASHION_VARIANTS["linen-coord-set"],
      variants: WOMEN_FASHION_VARIANTS["linen-coord-set"],
    },
    {
      id: "flow-midi-dress",
      slug: "flow-midi-dress",
      name: "فستان ميدي بانسياب",
      description:
        "فستان ميدي بانسياب مريح وطبعة هادية، يطلع شيك في النهار والخروجات الخفيفة.",
      price: 1680,
      comparePrice: 1980,
      stock: 10,
      images: WOMEN_FASHION_GALLERIES["flow-midi-dress"],
      categoryId: "dresses",
      category: { id: "dresses", name: "فساتين" },
      volumeDiscounts: WOMEN_FASHION_VOLUME_DISCOUNTS,
      productVariants: WOMEN_FASHION_VARIANTS["flow-midi-dress"],
      variants: WOMEN_FASHION_VARIANTS["flow-midi-dress"],
    },
    {
      id: "berry-crossbody-bag",
      slug: "berry-crossbody-bag",
      name: "شنطة كروس عنابي",
      description:
        "شنطة صغيرة تكمل اللوك اليومي بسرعة وتزوّد الطلبة بلمسة شيك من غير تعقيد.",
      price: 980,
      comparePrice: 1180,
      stock: 12,
      images: WOMEN_FASHION_GALLERIES["berry-crossbody-bag"],
      categoryId: "bags",
      category: { id: "bags", name: "شنط وإكسسوارات" },
      productVariants: WOMEN_FASHION_VARIANTS["berry-crossbody-bag"],
      variants: WOMEN_FASHION_VARIANTS["berry-crossbody-bag"],
    },
    {
      id: "silk-print-scarf",
      slug: "silk-print-scarf",
      name: "سكارف مطبوع ناعم",
      description:
        "إضافة خفيفة تكمل الإطلالة في ثانية وتشتغل مع الفساتين والشنط وحتى السنيكرز.",
      price: 420,
      comparePrice: 520,
      stock: 14,
      images: WOMEN_FASHION_GALLERIES["silk-print-scarf"],
      categoryId: "bags",
      category: { id: "bags", name: "شنط وإكسسوارات" },
      productVariants: WOMEN_FASHION_VARIANTS["silk-print-scarf"],
      variants: WOMEN_FASHION_VARIANTS["silk-print-scarf"],
    },
  ],
  "pc-hub-eg": [
    {
      id: "workbook-14-air",
      slug: "workbook-14-air",
      name: "لابتوب WorkBook 14 Air",
      ...PC_HUB_PRODUCT_ENRICHMENTS["workbook-14-air"],
      description:
        "لابتوب خفيف للشغل والدراسة والتنقل اليومي، بطاريته مريحة ويطلع اختيار مضمون للمكتب أو الجامعة.",
      price: 38990,
      comparePrice: 42990,
      rating: 4.8,
      reviewCount: 124,
      stock: 6,
      images: PC_HUB_GALLERIES["workbook-14-air"],
      categoryId: "laptops",
      category: { id: "laptops", name: "لابتوبات" },
      productVariants: PC_HUB_VARIANTS["workbook-14-air"],
      variants: PC_HUB_VARIANTS["workbook-14-air"],
    },
    {
      id: "creator-pro-16",
      slug: "creator-pro-16",
      name: "لابتوب Creator Pro 16",
      ...PC_HUB_PRODUCT_ENRICHMENTS["creator-pro-16"],
      description:
        "مناسب للتصميم والمونتاج والشغل التقيل، شاشة أكبر وأداء أوضح يخلي قرار الشراء أسهل.",
      price: 57990,
      comparePrice: 63990,
      rating: 4.7,
      reviewCount: 86,
      stock: 4,
      images: PC_HUB_GALLERIES["creator-pro-16"],
      categoryId: "laptops",
      category: { id: "laptops", name: "لابتوبات" },
      productVariants: PC_HUB_VARIANTS["creator-pro-16"],
      variants: PC_HUB_VARIANTS["creator-pro-16"],
    },
    {
      id: "battlebox-r7",
      slug: "battlebox-r7",
      name: "تجميعة BattleBox R7",
      ...PC_HUB_PRODUCT_ENRICHMENTS["battlebox-r7"],
      description:
        "تجميعة جاهزة للجيمينج والشغل التقيل من غير وجع دماغ تجميع القطع واحدة واحدة.",
      price: 46990,
      comparePrice: 51990,
      rating: 4.8,
      reviewCount: 63,
      stock: 3,
      images: PC_HUB_GALLERIES["battlebox-r7"],
      categoryId: "desktop-pcs",
      category: { id: "desktop-pcs", name: "تجميعات جاهزة" },
      productVariants: PC_HUB_VARIANTS["battlebox-r7"],
      variants: PC_HUB_VARIANTS["battlebox-r7"],
    },
    {
      id: "mini-station-i5",
      slug: "mini-station-i5",
      name: "كمبيوتر Mini Station i5",
      ...PC_HUB_PRODUCT_ENRICHMENTS["mini-station-i5"],
      description:
        "وحدة مكتبية صغيرة للمكاتب ونقاط البيع، أداء ثابت وحجم موفر للمكان مع توصيل سهل.",
      price: 24990,
      comparePrice: 27990,
      rating: 4.6,
      reviewCount: 58,
      stock: 5,
      images: PC_HUB_GALLERIES["mini-station-i5"],
      categoryId: "desktop-pcs",
      category: { id: "desktop-pcs", name: "تجميعات جاهزة" },
      productVariants: PC_HUB_VARIANTS["mini-station-i5"],
      variants: PC_HUB_VARIANTS["mini-station-i5"],
    },
    {
      id: "quadview-27-qhd",
      slug: "quadview-27-qhd",
      name: "شاشة QuadView 27 QHD",
      ...PC_HUB_PRODUCT_ENRICHMENTS["quadview-27-qhd"],
      description:
        "شاشة 27 بوصة بدقة QHD تدي مساحة مريحة للشغل والتصميم والاستخدام اليومي مع ألوان متوازنة.",
      price: 11290,
      comparePrice: 12990,
      rating: 4.7,
      reviewCount: 94,
      stock: 7,
      images: PC_HUB_GALLERIES["quadview-27-qhd"],
      categoryId: "monitors",
      category: { id: "monitors", name: "شاشات" },
      productVariants: PC_HUB_VARIANTS["quadview-27-qhd"],
      variants: PC_HUB_VARIANTS["quadview-27-qhd"],
    },
    {
      id: "mechboard-pro",
      slug: "mechboard-pro",
      name: "كيبورد MechBoard Pro",
      ...PC_HUB_PRODUCT_ENRICHMENTS["mechboard-pro"],
      description:
        "كيبورد ميكانيكي للكتابة والشغل والجيمينج الخفيف، استجابته سريعة وخياراته واضحة من غير لخبطة.",
      price: 3490,
      comparePrice: 3990,
      rating: 4.6,
      reviewCount: 77,
      stock: 12,
      images: PC_HUB_GALLERIES["mechboard-pro"],
      categoryId: "accessories",
      category: { id: "accessories", name: "إكسسوارات" },
      productVariants: PC_HUB_VARIANTS["mechboard-pro"],
      variants: PC_HUB_VARIANTS["mechboard-pro"],
    },
    {
      id: "precision-mouse-lite",
      slug: "precision-mouse-lite",
      name: "ماوس Precision Lite",
      ...PC_HUB_PRODUCT_ENRICHMENTS["precision-mouse-lite"],
      description:
        "ماوس لاسلكي خفيف للشغل اليومي والتنقل بين الأجهزة، قبضته مريحة وسهل تضيفه مع أي أوردر.",
      price: 1290,
      comparePrice: 1490,
      rating: 4.5,
      reviewCount: 71,
      stock: 15,
      images: PC_HUB_GALLERIES["precision-mouse-lite"],
      categoryId: "accessories",
      category: { id: "accessories", name: "إكسسوارات" },
      productVariants: PC_HUB_VARIANTS["precision-mouse-lite"],
      variants: PC_HUB_VARIANTS["precision-mouse-lite"],
    },
    {
      id: "dockstation-9in1",
      slug: "dockstation-9in1",
      name: "هاب DockStation 9 في 1",
      ...PC_HUB_PRODUCT_ENRICHMENTS["dockstation-9in1"],
      description:
        "هاب متعدد المنافذ يضيف HDMI وUSB-C وUSB-A وقارئ كارتات في قطعة واحدة سهلة ومفيدة.",
      price: 2790,
      comparePrice: 3190,
      rating: 4.7,
      reviewCount: 68,
      stock: 10,
      images: PC_HUB_GALLERIES["dockstation-9in1"],
      categoryId: "accessories",
      category: { id: "accessories", name: "إكسسوارات" },
      productVariants: [],
      variants: [],
    },
  ],
  "closet-os": [
    {
      id: "closet-weekday-poplin",
      slug: "closet-weekday-poplin",
      name: "قميص بوبلين يومي",
      description:
        "قميص قطني مرتب بخط نضيف يشتغل للشغل والجامعة والخروجات السريعة، ويتكرر بسهولة طول الأسبوع.",
      price: 1650,
      comparePrice: 1890,
      stock: 6,
      images: CLOSET_OS_GALLERIES["closet-weekday-poplin"],
      categoryId: "workday-shirts",
      category: { id: "workday-shirts", name: "قمصان يومية" },
      volumeDiscounts: CLOSET_OS_VOLUME_DISCOUNTS,
      productVariants: CLOSET_OS_VARIANTS["closet-weekday-poplin"],
      variants: CLOSET_OS_VARIANTS["closet-weekday-poplin"],
    },
    {
      id: "closet-relay-tee",
      slug: "closet-relay-tee",
      name: "تيشيرت قاعدة يومية",
      description:
        "تيشيرت أساسي برقبة مرتبة وقماش مريح، يشتغل لوحده أو تحت الطبقات ويخلّي اللبس جاهز بسرعة.",
      price: 840,
      comparePrice: 980,
      stock: 12,
      images: CLOSET_OS_GALLERIES["closet-relay-tee"],
      categoryId: "base-layers",
      category: { id: "base-layers", name: "طبقات أساسية" },
      volumeDiscounts: CLOSET_OS_VOLUME_DISCOUNTS,
      productVariants: CLOSET_OS_VARIANTS["closet-relay-tee"],
      variants: CLOSET_OS_VARIANTS["closet-relay-tee"],
    },
    {
      id: "closet-commute-trouser",
      slug: "closet-commute-trouser",
      name: "بنطلون مشاوير مرتب",
      description:
        "بنطلون عملي للحركة اليومية بقصّة نضيفة يليق على القميص أو التيشيرت وتحب تكرره أكتر من مرة.",
      price: 1580,
      comparePrice: 1790,
      stock: 8,
      images: CLOSET_OS_GALLERIES["closet-commute-trouser"],
      categoryId: "trousers",
      category: { id: "trousers", name: "بناطيل" },
      volumeDiscounts: CLOSET_OS_VOLUME_DISCOUNTS,
      productVariants: CLOSET_OS_VARIANTS["closet-commute-trouser"],
      variants: CLOSET_OS_VARIANTS["closet-commute-trouser"],
    },
    {
      id: "closet-soft-cardigan",
      slug: "closet-soft-cardigan",
      name: "كارديجان طبقة ناعمة",
      description:
        "كارديجان خفيف يزوّد طبقة دافية ومرتبة فوق اللبس الأساسي من غير ما يحسسك إنه تقيل أو رسمي.",
      price: 1440,
      comparePrice: 1640,
      stock: 7,
      images: CLOSET_OS_GALLERIES["closet-soft-cardigan"],
      categoryId: "layers",
      category: { id: "layers", name: "طبقات" },
      volumeDiscounts: CLOSET_OS_VOLUME_DISCOUNTS,
      productVariants: CLOSET_OS_VARIANTS["closet-soft-cardigan"],
      variants: CLOSET_OS_VARIANTS["closet-soft-cardigan"],
    },
    {
      id: "closet-weekend-capsule",
      slug: "closet-weekend-capsule",
      name: "طقم آخر الأسبوع",
      description:
        "طقم جاهز للسفر الخفيف أو خروجات آخر الأسبوع، قرار سريع يطلعك بلبسة كاملة من غير تفكير كتير.",
      price: 2390,
      comparePrice: 2680,
      stock: 5,
      images: CLOSET_OS_GALLERIES["closet-weekend-capsule"],
      categoryId: "capsule-sets",
      category: { id: "capsule-sets", name: "كابسولات جاهزة" },
      volumeDiscounts: CLOSET_OS_VOLUME_DISCOUNTS,
      productVariants: CLOSET_OS_VARIANTS["closet-weekend-capsule"],
      variants: CLOSET_OS_VARIANTS["closet-weekend-capsule"],
    },
    {
      id: "closet-slot-overshirt",
      slug: "closet-slot-overshirt",
      name: "أوفرشيرت طبقة سريعة",
      description:
        "طبقة خفيفة ترفع شكل اللبسة بسرعة لما تحتاج حضور أكتر فوق التيشيرت أو القميص.",
      price: 1740,
      comparePrice: 1980,
      stock: 6,
      images: CLOSET_OS_GALLERIES["closet-slot-overshirt"],
      categoryId: "layers",
      category: { id: "layers", name: "طبقات" },
      volumeDiscounts: CLOSET_OS_VOLUME_DISCOUNTS,
      productVariants: CLOSET_OS_VARIANTS["closet-slot-overshirt"],
      variants: CLOSET_OS_VARIANTS["closet-slot-overshirt"],
    },
    {
      id: "closet-laundry-tote",
      slug: "closet-laundry-tote",
      name: "شنطة قماش يومية",
      description:
        "شنطة قماش خفيفة للمشاوير وحمل الأساسيات، وتكمّل اللبسة من غير أي مجهود.",
      price: 620,
      comparePrice: 760,
      stock: 10,
      images: CLOSET_OS_GALLERIES["closet-laundry-tote"],
      categoryId: "accessories",
      category: { id: "accessories", name: "إكسسوارات" },
      productVariants: [],
      variants: [],
    },
  ],
};

const previewRecommendationIdsByTheme: Record<
  string,
  {
    related: Record<string, string[]>;
    boughtTogether: Record<string, string[]>;
  }
> = {
  "fitting-room-studio": {
    related: {
      "fr-fitting-dress": [
        "fr-cotton-t-shirt",
        "fr-jean-jacket",
        "fr-canvas-tote",
      ],
      "fr-cotton-t-shirt": [
        "fr-jean-jacket",
        "fr-denim-short",
        "fr-soft-cardigan",
      ],
      "fr-jean-jacket": [
        "fr-cotton-t-shirt",
        "fr-denim-short",
        "fr-canvas-tote",
      ],
      "fr-denim-short": [
        "fr-jean-jacket",
        "fr-cotton-t-shirt",
        "fr-soft-cardigan",
      ],
      "fr-soft-cardigan": [
        "fr-fitting-dress",
        "fr-canvas-tote",
        "fr-cotton-t-shirt",
      ],
      "fr-canvas-tote": [
        "fr-jean-jacket",
        "fr-soft-cardigan",
        "fr-fitting-dress",
      ],
    },
    boughtTogether: {
      "fr-fitting-dress": [
        "fr-canvas-tote",
        "fr-soft-cardigan",
        "fr-cotton-t-shirt",
      ],
      "fr-cotton-t-shirt": [
        "fr-jean-jacket",
        "fr-denim-short",
        "fr-canvas-tote",
      ],
      "fr-jean-jacket": [
        "fr-cotton-t-shirt",
        "fr-denim-short",
        "fr-canvas-tote",
      ],
      "fr-denim-short": [
        "fr-jean-jacket",
        "fr-cotton-t-shirt",
        "fr-canvas-tote",
      ],
      "fr-soft-cardigan": [
        "fr-fitting-dress",
        "fr-canvas-tote",
        "fr-cotton-t-shirt",
      ],
      "fr-canvas-tote": [
        "fr-fitting-dress",
        "fr-soft-cardigan",
        "fr-jean-jacket",
      ],
    },
  },
  "cafe-demo": {
    related: {
      "house-blend-beans": [
        "pistachio-croissant",
        "ceramic-v60-kit",
        "oat-latte-bottle",
      ],
      "ethiopian-filter": ["ceramic-v60-kit", "milk-frother", "caramel-roll"],
      "oat-latte-bottle": [
        "pistachio-croissant",
        "caramel-roll",
        "house-blend-beans",
      ],
      "vanilla-cold-brew": [
        "caramel-roll",
        "pistachio-croissant",
        "house-blend-beans",
      ],
      "pistachio-croissant": [
        "oat-latte-bottle",
        "vanilla-cold-brew",
        "house-blend-beans",
      ],
      "caramel-roll": ["vanilla-cold-brew", "ethiopian-filter", "milk-frother"],
      "ceramic-v60-kit": [
        "ethiopian-filter",
        "house-blend-beans",
        "milk-frother",
      ],
      "milk-frother": ["house-blend-beans", "oat-latte-bottle", "caramel-roll"],
    },
    boughtTogether: {
      "house-blend-beans": [
        "ceramic-v60-kit",
        "pistachio-croissant",
        "milk-frother",
      ],
      "ethiopian-filter": ["ceramic-v60-kit", "caramel-roll", "milk-frother"],
      "oat-latte-bottle": [
        "pistachio-croissant",
        "caramel-roll",
        "vanilla-cold-brew",
      ],
      "vanilla-cold-brew": [
        "caramel-roll",
        "pistachio-croissant",
        "oat-latte-bottle",
      ],
      "pistachio-croissant": [
        "oat-latte-bottle",
        "vanilla-cold-brew",
        "house-blend-beans",
      ],
      "caramel-roll": ["vanilla-cold-brew", "ethiopian-filter", "milk-frother"],
      "ceramic-v60-kit": [
        "ethiopian-filter",
        "house-blend-beans",
        "milk-frother",
      ],
      "milk-frother": ["house-blend-beans", "ethiopian-filter", "caramel-roll"],
    },
  },
  "restaurant-demo": {
    related: {
      "rush-combo": ["volcano-fries", "citrus-fizz", "cookie-bomb"],
      firebird: ["volcano-fries", "citrus-fizz", "rush-combo"],
      "volcano-fries": ["rush-combo", "firebird", "citrus-fizz"],
      "citrus-fizz": ["rush-combo", "firebird", "cookie-bomb"],
      "cookie-bomb": ["citrus-fizz", "rush-combo", "family-rush"],
      "family-rush": ["volcano-fries", "citrus-fizz", "cookie-bomb"],
    },
    boughtTogether: {
      "rush-combo": ["firebird", "volcano-fries", "citrus-fizz"],
      firebird: ["volcano-fries", "citrus-fizz", "cookie-bomb"],
      "volcano-fries": ["rush-combo", "citrus-fizz", "cookie-bomb"],
      "citrus-fizz": ["rush-combo", "volcano-fries", "cookie-bomb"],
      "cookie-bomb": ["citrus-fizz", "family-rush", "rush-combo"],
      "family-rush": ["volcano-fries", "citrus-fizz", "cookie-bomb"],
    },
  },
  "butcher-counter-eg": {
    related: {
      "baladi-beef-cubes": ["daily-minced-beef", "soup-bones-pack", "ribeye-steak-cut"],
      "ribeye-steak-cut": ["lamb-ribs-grill", "grill-weekend-pack", "kofta-grill-mix"],
      "lamb-ribs-grill": ["grill-weekend-pack", "kofta-grill-mix", "ribeye-steak-cut"],
      "kofta-grill-mix": ["baladi-sausage", "grill-weekend-pack", "daily-minced-beef"],
      "baladi-sausage": ["kofta-grill-mix", "daily-minced-beef", "soup-bones-pack"],
      "daily-minced-beef": ["baladi-beef-cubes", "soup-bones-pack", "kofta-grill-mix"],
      "grill-weekend-pack": ["lamb-ribs-grill", "ribeye-steak-cut", "kofta-grill-mix"],
      "soup-bones-pack": ["baladi-beef-cubes", "daily-minced-beef", "baladi-sausage"],
    },
    boughtTogether: {
      "baladi-beef-cubes": ["soup-bones-pack", "daily-minced-beef", "baladi-sausage"],
      "ribeye-steak-cut": ["lamb-ribs-grill", "kofta-grill-mix", "grill-weekend-pack"],
      "lamb-ribs-grill": ["kofta-grill-mix", "ribeye-steak-cut", "grill-weekend-pack"],
      "kofta-grill-mix": ["baladi-sausage", "lamb-ribs-grill", "soup-bones-pack"],
      "baladi-sausage": ["kofta-grill-mix", "daily-minced-beef", "soup-bones-pack"],
      "daily-minced-beef": ["baladi-beef-cubes", "soup-bones-pack", "baladi-sausage"],
      "grill-weekend-pack": ["lamb-ribs-grill", "ribeye-steak-cut", "kofta-grill-mix"],
      "soup-bones-pack": ["baladi-beef-cubes", "daily-minced-beef", "kofta-grill-mix"],
    },
  },
  "max-care-go": {
    related: {
      "omega-3-plus": [
        "immune-support",
        "digital-thermometer",
        "sensitive-sunscreen",
      ],
      "immune-support": [
        "omega-3-plus",
        "cough-relief-syrup",
        "baby-gentle-wash",
      ],
      "digital-thermometer": [
        "first-aid-kit",
        "blood-pressure-monitor",
        "immune-support",
      ],
      "blood-pressure-monitor": [
        "digital-thermometer",
        "omega-3-plus",
        "first-aid-kit",
      ],
      "baby-gentle-wash": [
        "sensitive-sunscreen",
        "first-aid-kit",
        "immune-support",
      ],
      "sensitive-sunscreen": [
        "baby-gentle-wash",
        "omega-3-plus",
        "cough-relief-syrup",
      ],
      "first-aid-kit": [
        "digital-thermometer",
        "cough-relief-syrup",
        "immune-support",
      ],
      "cough-relief-syrup": [
        "immune-support",
        "first-aid-kit",
        "sensitive-sunscreen",
      ],
    },
    boughtTogether: {
      "omega-3-plus": [
        "immune-support",
        "sensitive-sunscreen",
        "digital-thermometer",
      ],
      "immune-support": ["omega-3-plus", "cough-relief-syrup", "first-aid-kit"],
      "digital-thermometer": [
        "first-aid-kit",
        "cough-relief-syrup",
        "immune-support",
      ],
      "blood-pressure-monitor": [
        "omega-3-plus",
        "digital-thermometer",
        "first-aid-kit",
      ],
      "baby-gentle-wash": [
        "sensitive-sunscreen",
        "first-aid-kit",
        "immune-support",
      ],
      "sensitive-sunscreen": [
        "baby-gentle-wash",
        "omega-3-plus",
        "cough-relief-syrup",
      ],
      "first-aid-kit": [
        "digital-thermometer",
        "cough-relief-syrup",
        "immune-support",
      ],
      "cough-relief-syrup": ["immune-support", "first-aid-kit", "omega-3-plus"],
    },
  },
  "district-market": {
    related: {
      "dm-clip-lid-set": [
        "dm-drawer-organizer",
        "dm-laundry-basket",
        "dm-thermal-bottle",
      ],
      "dm-drawer-organizer": [
        "dm-clip-lid-set",
        "dm-led-desk-lamp",
        "dm-serving-tray-set",
      ],
      "dm-laundry-basket": [
        "dm-drawer-organizer",
        "dm-clip-lid-set",
        "dm-aroma-diffuser",
      ],
      "dm-led-desk-lamp": [
        "dm-drawer-organizer",
        "dm-thermal-bottle",
        "dm-aroma-diffuser",
      ],
      "dm-travel-cubes": [
        "dm-thermal-bottle",
        "dm-clip-lid-set",
        "dm-serving-tray-set",
      ],
      "dm-thermal-bottle": [
        "dm-travel-cubes",
        "dm-led-desk-lamp",
        "dm-clip-lid-set",
      ],
      "dm-serving-tray-set": [
        "dm-aroma-diffuser",
        "dm-drawer-organizer",
        "dm-clip-lid-set",
      ],
      "dm-aroma-diffuser": [
        "dm-serving-tray-set",
        "dm-led-desk-lamp",
        "dm-laundry-basket",
      ],
    },
    boughtTogether: {
      "dm-clip-lid-set": [
        "dm-drawer-organizer",
        "dm-laundry-basket",
        "dm-serving-tray-set",
      ],
      "dm-drawer-organizer": [
        "dm-clip-lid-set",
        "dm-led-desk-lamp",
        "dm-thermal-bottle",
      ],
      "dm-laundry-basket": [
        "dm-clip-lid-set",
        "dm-drawer-organizer",
        "dm-aroma-diffuser",
      ],
      "dm-led-desk-lamp": [
        "dm-drawer-organizer",
        "dm-thermal-bottle",
        "dm-aroma-diffuser",
      ],
      "dm-travel-cubes": [
        "dm-thermal-bottle",
        "dm-clip-lid-set",
        "dm-serving-tray-set",
      ],
      "dm-thermal-bottle": [
        "dm-travel-cubes",
        "dm-led-desk-lamp",
        "dm-clip-lid-set",
      ],
      "dm-serving-tray-set": [
        "dm-aroma-diffuser",
        "dm-clip-lid-set",
        "dm-drawer-organizer",
      ],
      "dm-aroma-diffuser": [
        "dm-serving-tray-set",
        "dm-led-desk-lamp",
        "dm-laundry-basket",
      ],
    },
  },
  "men-shoes-eg": {
    related: {
      "stride-core-runner": [
        "city-white-court",
        "flex-knit-runner",
        "brown-casual-leather",
      ],
      "city-white-court": [
        "stride-core-runner",
        "flex-knit-runner",
        "weekend-suede-low",
      ],
      "flex-knit-runner": [
        "stride-core-runner",
        "city-white-court",
        "brown-casual-leather",
      ],
      "brown-casual-leather": [
        "weekend-suede-low",
        "office-slip-loafer",
        "derby-clean-cut",
      ],
      "weekend-suede-low": [
        "brown-casual-leather",
        "city-white-court",
        "clean-step-kit",
      ],
      "office-slip-loafer": [
        "derby-clean-cut",
        "brown-casual-leather",
        "clean-step-kit",
      ],
      "derby-clean-cut": [
        "office-slip-loafer",
        "brown-casual-leather",
        "clean-step-kit",
      ],
      "clean-step-kit": [
        "brown-casual-leather",
        "office-slip-loafer",
        "derby-clean-cut",
      ],
    },
    boughtTogether: {
      "stride-core-runner": [
        "city-white-court",
        "flex-knit-runner",
        "clean-step-kit",
      ],
      "city-white-court": [
        "stride-core-runner",
        "flex-knit-runner",
        "clean-step-kit",
      ],
      "flex-knit-runner": [
        "stride-core-runner",
        "city-white-court",
        "clean-step-kit",
      ],
      "brown-casual-leather": [
        "clean-step-kit",
        "weekend-suede-low",
        "office-slip-loafer",
      ],
      "weekend-suede-low": [
        "clean-step-kit",
        "brown-casual-leather",
        "office-slip-loafer",
      ],
      "office-slip-loafer": [
        "clean-step-kit",
        "derby-clean-cut",
        "brown-casual-leather",
      ],
      "derby-clean-cut": [
        "clean-step-kit",
        "office-slip-loafer",
        "brown-casual-leather",
      ],
      "clean-step-kit": [
        "brown-casual-leather",
        "office-slip-loafer",
        "city-white-court",
      ],
    },
  },
  "women-fashion-eg": {
    related: {
      "luna-city-sneaker": [
        "soft-stride-runner",
        "marina-ballet-flat",
        "linen-coord-set",
      ],
      "soft-stride-runner": [
        "luna-city-sneaker",
        "marina-ballet-flat",
        "berry-crossbody-bag",
      ],
      "marina-ballet-flat": [
        "dusk-block-heel",
        "luna-city-sneaker",
        "flow-midi-dress",
      ],
      "dusk-block-heel": [
        "marina-ballet-flat",
        "flow-midi-dress",
        "berry-crossbody-bag",
      ],
      "linen-coord-set": [
        "flow-midi-dress",
        "luna-city-sneaker",
        "berry-crossbody-bag",
      ],
      "flow-midi-dress": [
        "linen-coord-set",
        "dusk-block-heel",
        "silk-print-scarf",
      ],
      "berry-crossbody-bag": [
        "silk-print-scarf",
        "flow-midi-dress",
        "luna-city-sneaker",
      ],
      "silk-print-scarf": [
        "berry-crossbody-bag",
        "flow-midi-dress",
        "dusk-block-heel",
      ],
    },
    boughtTogether: {
      "luna-city-sneaker": [
        "berry-crossbody-bag",
        "silk-print-scarf",
        "linen-coord-set",
      ],
      "soft-stride-runner": [
        "berry-crossbody-bag",
        "flow-midi-dress",
        "silk-print-scarf",
      ],
      "marina-ballet-flat": [
        "berry-crossbody-bag",
        "silk-print-scarf",
        "flow-midi-dress",
      ],
      "dusk-block-heel": [
        "berry-crossbody-bag",
        "flow-midi-dress",
        "silk-print-scarf",
      ],
      "linen-coord-set": [
        "berry-crossbody-bag",
        "silk-print-scarf",
        "luna-city-sneaker",
      ],
      "flow-midi-dress": [
        "berry-crossbody-bag",
        "silk-print-scarf",
        "dusk-block-heel",
      ],
      "berry-crossbody-bag": [
        "silk-print-scarf",
        "flow-midi-dress",
        "luna-city-sneaker",
      ],
      "silk-print-scarf": [
        "berry-crossbody-bag",
        "flow-midi-dress",
        "marina-ballet-flat",
      ],
    },
  },
  "pc-hub-eg": {
    related: {
      "workbook-14-air": [
        "creator-pro-16",
        "quadview-27-qhd",
        "dockstation-9in1",
      ],
      "creator-pro-16": ["workbook-14-air", "battlebox-r7", "quadview-27-qhd"],
      "battlebox-r7": ["creator-pro-16", "quadview-27-qhd", "mechboard-pro"],
      "mini-station-i5": [
        "workbook-14-air",
        "quadview-27-qhd",
        "dockstation-9in1",
      ],
      "quadview-27-qhd": [
        "workbook-14-air",
        "creator-pro-16",
        "dockstation-9in1",
      ],
      "mechboard-pro": [
        "precision-mouse-lite",
        "dockstation-9in1",
        "quadview-27-qhd",
      ],
      "precision-mouse-lite": [
        "mechboard-pro",
        "dockstation-9in1",
        "workbook-14-air",
      ],
      "dockstation-9in1": [
        "workbook-14-air",
        "quadview-27-qhd",
        "precision-mouse-lite",
      ],
    },
    boughtTogether: {
      "workbook-14-air": [
        "precision-mouse-lite",
        "dockstation-9in1",
        "quadview-27-qhd",
      ],
      "creator-pro-16": [
        "quadview-27-qhd",
        "mechboard-pro",
        "precision-mouse-lite",
      ],
      "battlebox-r7": [
        "quadview-27-qhd",
        "mechboard-pro",
        "precision-mouse-lite",
      ],
      "mini-station-i5": [
        "quadview-27-qhd",
        "dockstation-9in1",
        "precision-mouse-lite",
      ],
      "quadview-27-qhd": [
        "dockstation-9in1",
        "precision-mouse-lite",
        "mechboard-pro",
      ],
      "mechboard-pro": [
        "precision-mouse-lite",
        "quadview-27-qhd",
        "dockstation-9in1",
      ],
      "precision-mouse-lite": [
        "mechboard-pro",
        "dockstation-9in1",
        "workbook-14-air",
      ],
      "dockstation-9in1": [
        "workbook-14-air",
        "quadview-27-qhd",
        "precision-mouse-lite",
      ],
    },
  },
  "closet-os": {
    related: {
      "closet-weekday-poplin": [
        "closet-commute-trouser",
        "closet-slot-overshirt",
        "closet-laundry-tote",
      ],
      "closet-relay-tee": [
        "closet-commute-trouser",
        "closet-soft-cardigan",
        "closet-slot-overshirt",
      ],
      "closet-commute-trouser": [
        "closet-weekday-poplin",
        "closet-relay-tee",
        "closet-slot-overshirt",
      ],
      "closet-soft-cardigan": [
        "closet-relay-tee",
        "closet-commute-trouser",
        "closet-laundry-tote",
      ],
      "closet-weekend-capsule": [
        "closet-laundry-tote",
        "closet-slot-overshirt",
        "closet-relay-tee",
      ],
      "closet-slot-overshirt": [
        "closet-weekday-poplin",
        "closet-commute-trouser",
        "closet-relay-tee",
      ],
      "closet-laundry-tote": [
        "closet-weekend-capsule",
        "closet-soft-cardigan",
        "closet-relay-tee",
      ],
    },
    boughtTogether: {
      "closet-weekday-poplin": [
        "closet-commute-trouser",
        "closet-slot-overshirt",
        "closet-laundry-tote",
      ],
      "closet-relay-tee": [
        "closet-commute-trouser",
        "closet-soft-cardigan",
        "closet-laundry-tote",
      ],
      "closet-commute-trouser": [
        "closet-relay-tee",
        "closet-weekday-poplin",
        "closet-slot-overshirt",
      ],
      "closet-soft-cardigan": [
        "closet-relay-tee",
        "closet-commute-trouser",
        "closet-laundry-tote",
      ],
      "closet-weekend-capsule": [
        "closet-laundry-tote",
        "closet-relay-tee",
        "closet-slot-overshirt",
      ],
      "closet-slot-overshirt": [
        "closet-weekday-poplin",
        "closet-commute-trouser",
        "closet-relay-tee",
      ],
      "closet-laundry-tote": [
        "closet-weekend-capsule",
        "closet-relay-tee",
        "closet-soft-cardigan",
      ],
    },
  },
};

const previewProductReviewsByTheme: Record<
  string,
  Record<string, MarketplacePreviewProductReviewsResponse>
> = {
  "fitting-room-studio": {
    "fr-fitting-dress": buildMarketplacePreviewReviewsResponse([
      {
        id: "fr-fitting-dress-review-1",
        author: "Maya Adel",
        date: "2026-04-14",
        createdAt: "2026-04-14",
        rating: 5,
        title: "Easy to compare before checkout",
        comment:
          "The fit notes and photos made the dress feel clear before adding it to the bag.",
        verified: true,
        helpfulCount: 9,
      },
      {
        id: "fr-fitting-dress-review-2",
        author: "Nour Samir",
        date: "2026-04-20",
        createdAt: "2026-04-20",
        rating: 4,
        comment:
          "Soft fabric and the color was close to the preview. I liked how fast the checkout felt.",
        verified: true,
        helpfulCount: 5,
      },
    ]),
    "fr-jean-jacket": buildMarketplacePreviewReviewsResponse([
      {
        id: "fr-jean-jacket-review-1",
        author: "Lina Farouk",
        date: "2026-04-12",
        createdAt: "2026-04-12",
        rating: 5,
        title: "The bag flow is very smooth",
        comment:
          "I could check size, color, and the bag total without losing the product view.",
        verified: true,
        helpfulCount: 11,
      },
      {
        id: "fr-jean-jacket-review-2",
        author: "Hana Youssef",
        date: "2026-04-18",
        createdAt: "2026-04-18",
        rating: 4,
        comment:
          "The denim color is soft and the compact quantity controls made the cart easy to scan.",
        verified: true,
        helpfulCount: 6,
      },
    ]),
  },
  "district-market": {
    "dm-clip-lid-set": buildMarketplacePreviewReviewsResponse([
      {
        id: "dm-clip-lid-set-review-1",
        author: "سارة خالد",
        date: "2026-04-06",
        createdAt: "2026-04-06",
        rating: 5,
        title: "خامتها مرتبة فعلًا",
        comment:
          "العلب محكمة وسهلة في الترتيب داخل الثلاجة، والمقاسات مناسبة للاستخدام اليومي.",
        verified: true,
        helpfulCount: 12,
      },
      {
        id: "dm-clip-lid-set-review-2",
        author: "ندى عادل",
        date: "2026-04-11",
        createdAt: "2026-04-11",
        rating: 4,
        title: "شكلها نظيف في المطبخ",
        comment:
          "أحببت إن الطقم واضح وعملي، وكان أفضل لو فيه قطعة أصغر إضافية لكن الجودة جيدة جدًا.",
        verified: true,
        helpfulCount: 6,
      },
    ]),
    "dm-drawer-organizer": buildMarketplacePreviewReviewsResponse([
      {
        id: "dm-drawer-organizer-review-1",
        author: "مها طارق",
        date: "2026-04-08",
        createdAt: "2026-04-08",
        rating: 5,
        title: "فرّق معي في ترتيب الأدراج",
        comment:
          "الوحدات مرنة وخلّت درج المطبخ أوضح وأسهل في الوصول لكل الأدوات.",
        verified: true,
        helpfulCount: 8,
      },
      {
        id: "dm-drawer-organizer-review-2",
        author: "ريم نبيل",
        date: "2026-04-14",
        createdAt: "2026-04-14",
        rating: 4,
        comment:
          "بسيط ومفيد فعلًا. الخامة شكلها نضيف والتقسيمات عملية جدًا للاستخدام اليومي.",
        verified: true,
        helpfulCount: 3,
      },
    ]),
    "dm-laundry-basket": buildMarketplacePreviewReviewsResponse([
      {
        id: "dm-laundry-basket-review-1",
        author: "ياسمين سمير",
        date: "2026-04-10",
        createdAt: "2026-04-10",
        rating: 4,
        title: "خفيفة وسهلة",
        comment:
          "مناسبة للمساحات الصغيرة وسهلة في الفتح والقفل، وكان اللون مطابقًا للصور.",
        verified: true,
        helpfulCount: 4,
      },
      {
        id: "dm-laundry-basket-review-2",
        author: "هبة أشرف",
        date: "2026-04-15",
        createdAt: "2026-04-15",
        rating: 5,
        comment:
          "تدي إحساس مرتب في الحمام وما بتاخدش مساحة كبيرة بعد الاستخدام.",
        verified: true,
        helpfulCount: 5,
      },
    ]),
    "dm-led-desk-lamp": buildMarketplacePreviewReviewsResponse([
      {
        id: "dm-led-desk-lamp-review-1",
        author: "Omar A.",
        date: "2026-04-09",
        createdAt: "2026-04-09",
        rating: 5,
        title: "Clean look on the desk",
        comment:
          "Balanced light and a neat footprint. It works well for focused evening work.",
        verified: true,
        helpfulCount: 10,
      },
      {
        id: "dm-led-desk-lamp-review-2",
        author: "آية محسن",
        date: "2026-04-18",
        createdAt: "2026-04-18",
        rating: 4,
        comment:
          "الإضاءة هادئة والشكل بسيط، ومناسب لركنة الدراسة بدون زحمة بصرية.",
        verified: true,
        helpfulCount: 4,
      },
    ]),
    "dm-travel-cubes": buildMarketplacePreviewReviewsResponse([
      {
        id: "dm-travel-cubes-review-1",
        author: "Lina H.",
        date: "2026-04-07",
        createdAt: "2026-04-07",
        rating: 5,
        title: "Makes packing much easier",
        comment:
          "The sizes are practical and the set helps separate daily outfits without the bag feeling messy.",
        verified: true,
        helpfulCount: 7,
      },
      {
        id: "dm-travel-cubes-review-2",
        author: "دينا رامي",
        date: "2026-04-16",
        createdAt: "2026-04-16",
        rating: 4,
        comment:
          "الخامة جيدة والتنظيم داخل الشنطة أوضح، خصوصًا في السفرات القصيرة.",
        verified: true,
        helpfulCount: 2,
      },
    ]),
    "dm-thermal-bottle": buildMarketplacePreviewReviewsResponse([
      {
        id: "dm-thermal-bottle-review-1",
        author: "رانيا وجدي",
        date: "2026-04-05",
        createdAt: "2026-04-05",
        rating: 5,
        title: "عملية وشيك",
        comment:
          "احتفظت بحرارة المشروب فترة جيدة وشكلها مناسب للشغل أو العربية.",
        verified: true,
        helpfulCount: 11,
      },
      {
        id: "dm-thermal-bottle-review-2",
        author: "Mostafa K.",
        date: "2026-04-12",
        createdAt: "2026-04-12",
        rating: 4,
        comment:
          "Minimal look and comfortable size. Good for everyday carry without feeling bulky.",
        verified: true,
        helpfulCount: 5,
      },
    ]),
    "dm-serving-tray-set": buildMarketplacePreviewReviewsResponse([
      {
        id: "dm-serving-tray-set-review-1",
        author: "بسمة حاتم",
        date: "2026-04-13",
        createdAt: "2026-04-13",
        rating: 4,
        title: "شكلها هادي ومرتب",
        comment: "عملية للتقديم اليومي واللون الخشبي مريح بصريًا مع الديكور.",
        verified: true,
        helpfulCount: 3,
      },
      {
        id: "dm-serving-tray-set-review-2",
        author: "Nour F.",
        date: "2026-04-19",
        createdAt: "2026-04-19",
        rating: 5,
        comment:
          "Useful sizes and the finish feels more premium than typical quick-buy trays.",
        verified: true,
        helpfulCount: 4,
      },
    ]),
    "dm-aroma-diffuser": buildMarketplacePreviewReviewsResponse([
      {
        id: "dm-aroma-diffuser-review-1",
        author: "جنى حسام",
        date: "2026-04-09",
        createdAt: "2026-04-09",
        rating: 5,
        title: "هادئ وشكله جميل",
        comment:
          "التشغيل هادئ فعلًا ويضيف لمسة مرتبة للغرفة بدون تفاصيل مزعجة.",
        verified: true,
        helpfulCount: 9,
      },
      {
        id: "dm-aroma-diffuser-review-2",
        author: "Salma T.",
        date: "2026-04-17",
        createdAt: "2026-04-17",
        rating: 4,
        comment:
          "Soft vapor and a clean silhouette. It works best as a small room accent.",
        verified: true,
        helpfulCount: 3,
      },
    ]),
  },
  "men-shoes-eg": {
    "stride-core-runner": buildMarketplacePreviewReviewsResponse([
      {
        id: "stride-core-runner-review-1",
        author: "أحمد مراد",
        date: "2026-04-12",
        createdAt: "2026-04-12",
        rating: 5,
        title: "مريح فعلًا طول اليوم",
        comment:
          "الحذاء خفيف وشكله مضبوط مع الجينز واللبس اليومي، والمقاس كان قريب جدًا من المتوقع.",
        verified: true,
        helpfulCount: 14,
      },
      {
        id: "stride-core-runner-review-2",
        author: "محمود ياسر",
        date: "2026-04-18",
        createdAt: "2026-04-18",
        rating: 4,
        comment:
          "شكل رجالي واضح والخامة جيدة، وكان نفسي النعل يبقى أطرى سنة بسيطة لكن الأداء جيد جدًا.",
        verified: true,
        helpfulCount: 6,
      },
    ]),
    "brown-casual-leather": buildMarketplacePreviewReviewsResponse([
      {
        id: "brown-casual-leather-review-1",
        author: "عمر طارق",
        date: "2026-04-09",
        createdAt: "2026-04-09",
        rating: 5,
        title: "مرتب جدًا مع لبس الشغل",
        comment:
          "أشيك من السنيكر وفي نفس الوقت مريح للاستخدام اليومي، واشتغل مع لبس الشغل لساعات طويلة من غير ما يضايقني.",
        verified: true,
        helpfulCount: 9,
      },
      {
        id: "brown-casual-leather-review-2",
        author: "خالد ربيع",
        date: "2026-04-16",
        createdAt: "2026-04-16",
        rating: 4,
        comment:
          "اللون البني طالع مرتب جدًا، والموديل مناسب للشغل والمشاوير بدون ما يبقى رسمي زيادة.",
        verified: true,
        helpfulCount: 5,
      },
    ]),
    "office-slip-loafer": buildMarketplacePreviewReviewsResponse([
      {
        id: "office-slip-loafer-review-1",
        author: "يوسف علاء",
        date: "2026-04-10",
        createdAt: "2026-04-10",
        rating: 5,
        title: "يتلبس بسرعة ويتنسق بسهولة",
        comment:
          "سهل جدًا في اللبس السريع ومناسب لأيام المكتب لما تكون عايز شكل أرتب من السنيكر من غير تعقيد.",
        verified: true,
        helpfulCount: 7,
      },
      {
        id: "office-slip-loafer-review-2",
        author: "طارق سامي",
        date: "2026-04-19",
        createdAt: "2026-04-19",
        rating: 4,
        comment:
          "سهل جدًا في اللبس السريع وشكله مرتب، وموضوع الاستبدال كان واضح قبل الطلب.",
        verified: true,
        helpfulCount: 4,
      },
    ]),
    "clean-step-kit": buildMarketplacePreviewReviewsResponse([
      {
        id: "clean-step-kit-review-1",
        author: "عمرو حسن",
        date: "2026-04-13",
        createdAt: "2026-04-13",
        rating: 5,
        title: "مفيد فعلًا مع الأحذية الجلد",
        comment:
          "الفرشة والخامات الأساسية كفاية جدًا للعناية السريعة، وحلو إنه ظاهر كاقتراح مع الأحذية الرسمية.",
        verified: true,
        helpfulCount: 5,
      },
      {
        id: "clean-step-kit-review-2",
        author: "كريم فتحي",
        date: "2026-04-20",
        createdAt: "2026-04-20",
        rating: 4,
        comment:
          "إضافة مفيدة لو عايز تحافظ على الأحذية الجلد بشكل أنضف من غير ما تشتري طقم عناية كبير.",
        verified: true,
        helpfulCount: 2,
      },
    ]),
  },
  "women-fashion-eg": {
    "luna-city-sneaker": buildMarketplacePreviewReviewsResponse([
      {
        id: "luna-city-sneaker-review-1",
        author: "نورهان علي",
        date: "2026-04-12",
        createdAt: "2026-04-12",
        rating: 5,
        title: "مريح ولونه قريب جدًا من الصور",
        comment:
          "جربته في المشاوير اليومية وكان مريح، واللون الأبيض اللؤلؤي طالع بنفس إحساس الصور تقريبًا.",
        verified: true,
        helpfulCount: 11,
      },
      {
        id: "luna-city-sneaker-review-2",
        author: "مريم سامح",
        date: "2026-04-18",
        createdAt: "2026-04-18",
        rating: 4,
        title: "المقاس مضبوط وشكلها عملي",
        comment:
          "المقاس طلع مضبوط، واشتغلت بسهولة مع الجينز واللبس اليومي من غير ما تبان ثقيلة في الرجل.",
        verified: true,
        helpfulCount: 5,
      },
    ]),
    "dusk-block-heel": buildMarketplacePreviewReviewsResponse([
      {
        id: "dusk-block-heel-review-1",
        author: "سارة وائل",
        date: "2026-04-13",
        createdAt: "2026-04-13",
        rating: 5,
        title: "ثابتة ومريحة أكثر من المتوقع",
        comment:
          "الكعب ثابت فعلًا والخطوة مريحة، واللون العنابي طالع شيك جدًا مع الفساتين والطلعات الليلية.",
        verified: true,
        helpfulCount: 8,
      },
      {
        id: "dusk-block-heel-review-2",
        author: "ياسمين عمرو",
        date: "2026-04-21",
        createdAt: "2026-04-21",
        rating: 4,
        title: "المقاس واضح والشكل أنيق",
        comment:
          "اخترت المقاس من أول مرة وكان مضبوط، والصور الحقيقية ساعدتني أفهم ارتفاع الكعب وشكله على الرجل.",
        verified: true,
        helpfulCount: 4,
      },
    ]),
    "flow-midi-dress": buildMarketplacePreviewReviewsResponse([
      {
        id: "flow-midi-dress-review-1",
        author: "هبة عماد",
        date: "2026-04-14",
        createdAt: "2026-04-14",
        rating: 5,
        title: "القصة مريحة وشكله شيك",
        comment:
          "الصور الحقيقية ساعدتني جدًا، والقماش والقصة طالعين مناسبين للخروج واليوم الطويل.",
        verified: true,
        helpfulCount: 9,
      },
      {
        id: "flow-midi-dress-review-2",
        author: "سلمى نبيل",
        date: "2026-04-20",
        createdAt: "2026-04-20",
        rating: 4,
        title: "المقاس واضح والطبعة هادئة",
        comment:
          "المقاس كان واضح، والطبعة أهدأ قليلًا من الصور لكنها ما زالت طالعة شيك ومريحة في اللبس.",
        verified: true,
        helpfulCount: 4,
      },
    ]),
    "berry-crossbody-bag": buildMarketplacePreviewReviewsResponse([
      {
        id: "berry-crossbody-bag-review-1",
        author: "يارا سامح",
        date: "2026-04-11",
        createdAt: "2026-04-11",
        rating: 5,
        title: "حجمها عملي ولونها مرتب",
        comment:
          "الشنطة حجمها مناسب للمشاوير اليومية، واللون البيري طالع شيك جدًا مع الملابس الفاتحة والغامقة.",
        verified: true,
        helpfulCount: 7,
      },
      {
        id: "berry-crossbody-bag-review-2",
        author: "دينا فاروق",
        date: "2026-04-21",
        createdAt: "2026-04-21",
        rating: 4,
        title: "خامة مرتبة وحجم مناسب",
        comment:
          "الخامة مرتبة وطول الحزام مناسب، واشتغلت كإضافة مع الباندل بشكل شيك من غير ما تحس إنها رخيصة.",
        verified: true,
        helpfulCount: 3,
      },
    ]),
  },
  "pc-hub-eg": {
    "workbook-14-air": buildMarketplacePreviewReviewsResponse([
      {
        id: "workbook-14-air-review-1",
        author: "أحمد وائل",
        date: "2026-04-14",
        createdAt: "2026-04-14",
        rating: 5,
        title: "خفيف فعلًا للشغل والجامعة",
        comment:
          "استخدمته في الشغل والتنقل اليومي، والوزن والبطارية فرقوا جدًا. عرض المواصفات كان واضح قبل الطلب.",
        verified: true,
        helpfulCount: 12,
      },
      {
        id: "workbook-14-air-review-2",
        author: "مريم سامح",
        date: "2026-04-20",
        createdAt: "2026-04-20",
        rating: 4,
        title: "مرتب للشغل اليومي فعلًا",
        comment:
          "مناسب للشغل والاجتماعات والتنقل. أكثر شيء أعجبني أن مقارنة الرام والتخزين كانت واضحة وسريعة.",
        verified: true,
        helpfulCount: 5,
      },
    ]),
    "creator-pro-16": buildMarketplacePreviewReviewsResponse([
      {
        id: "creator-pro-16-review-1",
        author: "يوسف خالد",
        date: "2026-04-11",
        createdAt: "2026-04-11",
        rating: 5,
        title: "الشاشة ممتازة والمواصفات واضحة",
        comment:
          "كنت محتاج جهاز للشغل الثقيل، وفرق معي جدًا إن خيارات الرام والجرافيك كانت واضحة بدل ما أسأل كثير.",
        verified: true,
        helpfulCount: 9,
      },
      {
        id: "creator-pro-16-review-2",
        author: "حسن طارق",
        date: "2026-04-18",
        createdAt: "2026-04-18",
        rating: 4,
        title: "أداؤه قوي والشاشة مريحة",
        comment:
          "الأداء قوي للمونتاج والتصميم، والشاشة QHD واضحة فعلًا. كمان متابعة الشحن كانت مرتبة وواضحة.",
        verified: true,
        helpfulCount: 4,
      },
    ]),
    "battlebox-r7": buildMarketplacePreviewReviewsResponse([
      {
        id: "battlebox-r7-review-1",
        author: "محمد هشام",
        date: "2026-04-12",
        createdAt: "2026-04-12",
        rating: 5,
        title: "جاهزة للعب من أول يوم",
        comment:
          "أكثر شيء ريحني إن الفروقات بين RTX 4060 و4070 واضحة، فاخترت النسخة المناسبة من غير لف كثير على القطع.",
        verified: true,
        helpfulCount: 11,
      },
      {
        id: "battlebox-r7-review-2",
        author: "علي بهجت",
        date: "2026-04-21",
        createdAt: "2026-04-21",
        rating: 4,
        title: "مناسبة للجيمنج والشغل الثقيل",
        comment:
          "التجميعة مريحة لو تريد أداء قوي جاهز. أعجبني إن الرام والتخزين والترقية المستقبلية موضحة بشكل مباشر في الصفحة.",
        verified: true,
        helpfulCount: 6,
      },
    ]),
    "quadview-27-qhd": buildMarketplacePreviewReviewsResponse([
      {
        id: "quadview-27-qhd-review-1",
        author: "سارة مجدي",
        date: "2026-04-10",
        createdAt: "2026-04-10",
        rating: 5,
        title: "ألوان مرتبة جدًا للمكتب",
        comment:
          "الشاشة مناسبة جدًا للشغل والمونتاج الخفيف، وحلو إن فرق السعر بين النسختين كان ظاهر بوضوح.",
        verified: true,
        helpfulCount: 8,
      },
      {
        id: "quadview-27-qhd-review-2",
        author: "عمر فتحي",
        date: "2026-04-22",
        createdAt: "2026-04-22",
        rating: 4,
        title: "ثابتة ومناسبة بعد الشغل",
        comment:
          "القاعدة ثابتة، ونسخة التحديث الأعلى تستحق لو بتلعب بعد الشغل أو تحتاج حركة أنعم في الاستخدام.",
        verified: true,
        helpfulCount: 3,
      },
    ]),
    "mechboard-pro": buildMarketplacePreviewReviewsResponse([
      {
        id: "mechboard-pro-review-1",
        author: "كريم سامح",
        date: "2026-04-13",
        createdAt: "2026-04-13",
        rating: 5,
        title: "الكتابة عليه مريحة",
        comment:
          "حبيت فكرة اختيار السويتش من غير تعقيد، والكيبورد نفسه ثابت وصوته مضبوط للشغل والجيمينج الخفيف.",
        verified: true,
        helpfulCount: 6,
      },
      {
        id: "mechboard-pro-review-2",
        author: "نور أحمد",
        date: "2026-04-19",
        createdAt: "2026-04-19",
        rating: 4,
        title: "قيمة جيدة واختيار مفيد",
        comment:
          "قيمته جيدة، وحلو إن اختيار السويتش ظاهر وواضح بدل ما يكون مخفي وسط التفاصيل.",
        verified: true,
        helpfulCount: 2,
      },
    ]),
  },
  "closet-os": {
    related: {
      "closet-weekday-poplin": [
        "closet-commute-trouser",
        "closet-slot-overshirt",
        "closet-laundry-tote",
      ],
      "closet-relay-tee": [
        "closet-commute-trouser",
        "closet-soft-cardigan",
        "closet-slot-overshirt",
      ],
      "closet-commute-trouser": [
        "closet-weekday-poplin",
        "closet-relay-tee",
        "closet-slot-overshirt",
      ],
      "closet-soft-cardigan": [
        "closet-relay-tee",
        "closet-commute-trouser",
        "closet-laundry-tote",
      ],
      "closet-weekend-capsule": [
        "closet-laundry-tote",
        "closet-slot-overshirt",
        "closet-relay-tee",
      ],
      "closet-slot-overshirt": [
        "closet-weekday-poplin",
        "closet-commute-trouser",
        "closet-relay-tee",
      ],
      "closet-laundry-tote": [
        "closet-weekend-capsule",
        "closet-soft-cardigan",
        "closet-relay-tee",
      ],
    },
    boughtTogether: {
      "closet-weekday-poplin": [
        "closet-commute-trouser",
        "closet-slot-overshirt",
        "closet-laundry-tote",
      ],
      "closet-relay-tee": [
        "closet-commute-trouser",
        "closet-soft-cardigan",
        "closet-laundry-tote",
      ],
      "closet-commute-trouser": [
        "closet-relay-tee",
        "closet-weekday-poplin",
        "closet-slot-overshirt",
      ],
      "closet-soft-cardigan": [
        "closet-relay-tee",
        "closet-commute-trouser",
        "closet-laundry-tote",
      ],
      "closet-weekend-capsule": [
        "closet-laundry-tote",
        "closet-relay-tee",
        "closet-slot-overshirt",
      ],
      "closet-slot-overshirt": [
        "closet-weekday-poplin",
        "closet-commute-trouser",
        "closet-relay-tee",
      ],
      "closet-laundry-tote": [
        "closet-weekend-capsule",
        "closet-relay-tee",
        "closet-soft-cardigan",
      ],
    },
  },
};

previewProductsByTheme["perfume-eg"] = PERFUME_EG_PRODUCTS;
previewRecommendationIdsByTheme["perfume-eg"] = {
  related: { ...PERFUME_EG_RECOMMENDATIONS.related },
  boughtTogether: { ...PERFUME_EG_RECOMMENDATIONS.boughtTogether },
};
previewProductReviewsByTheme["perfume-eg"] = { ...PERFUME_EG_REVIEWS };
previewProductsByTheme["atelier-nova"] = ATELIER_NOVA_PRODUCTS;
previewRecommendationIdsByTheme["atelier-nova"] = {
  related: { ...ATELIER_NOVA_RECOMMENDATIONS.related },
  boughtTogether: { ...ATELIER_NOVA_RECOMMENDATIONS.boughtTogether },
};
previewProductReviewsByTheme["atelier-nova"] = { ...ATELIER_NOVA_REVIEWS };
previewProductsByTheme["elegant-luxe"] = ELEGANT_LUXE_PRODUCTS;
previewRecommendationIdsByTheme["elegant-luxe"] = {
  related: { ...ELEGANT_LUXE_RECOMMENDATIONS.related },
  boughtTogether: { ...ELEGANT_LUXE_RECOMMENDATIONS.boughtTogether },
};
previewProductReviewsByTheme["elegant-luxe"] = { ...ELEGANT_LUXE_REVIEWS };
previewProductsByTheme["kids-play"] = KIDS_PLAY_PRODUCTS;
previewRecommendationIdsByTheme["kids-play"] = {
  related: { ...KIDS_PLAY_RECOMMENDATIONS.related },
  boughtTogether: { ...KIDS_PLAY_RECOMMENDATIONS.boughtTogether },
};
previewProductReviewsByTheme["kids-play"] = { ...KIDS_PLAY_REVIEWS };
previewProductsByTheme["khemet-luxe-eg"] = KHEMET_LUXE_PRODUCTS;
previewRecommendationIdsByTheme["khemet-luxe-eg"] = {
  related: { ...KHEMET_LUXE_RECOMMENDATIONS.related },
  boughtTogether: { ...KHEMET_LUXE_RECOMMENDATIONS.boughtTogether },
};
previewProductReviewsByTheme["khemet-luxe-eg"] = { ...KHEMET_LUXE_REVIEWS };
previewProductsByTheme["legacy-default-old"] = LEGACY_DEFAULT_OLD_PRODUCTS;
previewRecommendationIdsByTheme["legacy-default-old"] = {
  related: { ...LEGACY_DEFAULT_OLD_RECOMMENDATIONS.related },
  boughtTogether: { ...LEGACY_DEFAULT_OLD_RECOMMENDATIONS.boughtTogether },
};
previewProductReviewsByTheme["legacy-default-old"] = {
  ...LEGACY_DEFAULT_OLD_REVIEWS,
};
previewProductsByTheme["rose-boutique-eg"] = ROSE_BOUTIQUE_EG_PRODUCTS;
previewRecommendationIdsByTheme["rose-boutique-eg"] = {
  related: { ...ROSE_BOUTIQUE_EG_RECOMMENDATIONS.related },
  boughtTogether: { ...ROSE_BOUTIQUE_EG_RECOMMENDATIONS.boughtTogether },
};
previewProductReviewsByTheme["rose-boutique-eg"] = {
  ...ROSE_BOUTIQUE_EG_REVIEWS,
};
previewProductsByTheme["vela-fashion-eg"] = VELA_FASHION_EG_PRODUCTS;
previewRecommendationIdsByTheme["vela-fashion-eg"] = {
  related: { ...VELA_FASHION_EG_RECOMMENDATIONS.related },
  boughtTogether: { ...VELA_FASHION_EG_RECOMMENDATIONS.boughtTogether },
};
previewProductReviewsByTheme["vela-fashion-eg"] = { ...VELA_FASHION_EG_REVIEWS };
previewProductsByTheme["fastly-eg"] = FASTLY_EG_PRODUCTS;
previewRecommendationIdsByTheme["fastly-eg"] = {
  related: { ...FASTLY_EG_RECOMMENDATIONS.related },
  boughtTogether: { ...FASTLY_EG_RECOMMENDATIONS.boughtTogether },
};
previewProductReviewsByTheme["fastly-eg"] = { ...FASTLY_EG_REVIEWS };
ELESSI_PACK_MARKETPLACE_THEME_IDS.forEach((themeId) => {
  previewProductsByTheme[themeId] = ELESSI_PACK_PRODUCTS[themeId] || [];
  previewRecommendationIdsByTheme[themeId] = {
    related: { ...(ELESSI_PACK_RECOMMENDATIONS[themeId]?.related || {}) },
    boughtTogether: {
      ...(ELESSI_PACK_RECOMMENDATIONS[themeId]?.boughtTogether || {}),
    },
  };
  previewProductReviewsByTheme[themeId] = {
    ...(ELESSI_PACK_REVIEWS[themeId] || {}),
  };
});

type GeneratedPreviewVariantKind =
  | "none"
  | "womenShoe"
  | "menShoe"
  | "womenApparel"
  | "mensApparel"
  | "sizeGeneric"
  | "color"
  | "accessoryColor"
  | "beautySize"
  | "techConfig"
  | "mobileConfig"
  | "digitalLicense";

type GeneratedPreviewProductBlueprint = {
  key: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  price: number;
  comparePrice?: number;
  tags?: string[];
  variantKind?: GeneratedPreviewVariantKind;
};

type GeneratedPreviewFamily =
  | "menShoes"
  | "womenShoes"
  | "fashionMixed"
  | "luxuryFashion"
  | "womenFashion"
  | "accessories"
  | "menswear"
  | "modestFashion"
  | "resortFashion"
  | "occasionFashion"
  | "generalStore"
  | "premiumBrand"
  | "naturalProducts"
  | "restaurant"
  | "mobileStore"
  | "techStore"
  | "kidsStore"
  | "babyStore"
  | "furnitureStore"
  | "petStore"
  | "beautyStore"
  | "bookStore"
  | "floristStore"
  | "fitnessStore"
  | "luxuryStore"
  | "carParts"
  | "craftsStore"
  | "groceryStore"
  | "digitalCourses"
  | "web3Store"
  | "travelStore"
  | "plantsStore";

const GENERATED_PREVIEW_AUTHORS = [
  "سارة خالد",
  "مريم سامح",
  "محمد هشام",
  "نهى عادل",
  "عمر طارق",
] as const;

const GENERATED_PREVIEW_THEME_CATALOG = buildStorefrontThemePresetCatalog();
const GENERATED_PREVIEW_THEME_CATALOG_BY_ID =
  GENERATED_PREVIEW_THEME_CATALOG.reduce<
    Record<string, (typeof GENERATED_PREVIEW_THEME_CATALOG)[number]>
  >((accumulator, item) => {
    accumulator[item.themeId] = item;
    return accumulator;
  }, {});

const GENERATED_PREVIEW_IMAGE_POOLS: Record<string, string[]> = {
  general: [
    buildUnsplashImage("1513694203232-719a280e022f"),
    buildUnsplashImage("1505693416388-ac5ce068fe85"),
    buildUnsplashImage("1517705008128-361805f42e86"),
    buildUnsplashImage("1503602642458-232111445657"),
  ],
  fashion: [
    buildUnsplashImage("1483985988355-763728e1935b"),
    buildUnsplashImage("1496747611176-843222e1e57c"),
    buildUnsplashImage("1515886657613-9f3515b0c78f"),
    buildUnsplashImage("1542291026-7eec264c27ff"),
  ],
  "womens-shoes": [
    buildUnsplashImage("1600185365483-26d7a4cc7519"),
    buildUnsplashImage("1551779245-692374a8efe2"),
    buildUnsplashImage("1515347619252-60a4bf4fff4f"),
    buildUnsplashImage("1603487742131-4160ec999306"),
  ],
  menShoes: [
    buildUnsplashImage("1491553895911-0055eca6402d"),
    buildUnsplashImage("1543508282-6319a3e2621f"),
    buildUnsplashImage("1616406432452-07bc5938759d"),
    buildUnsplashImage("1621315271772-28b1f3a5df87"),
    buildUnsplashImage("1608231387042-66d1773070a5"),
  ],
  "mens-shoes": [
    buildUnsplashImage("1491553895911-0055eca6402d"),
    buildUnsplashImage("1543508282-6319a3e2621f"),
    buildUnsplashImage("1616406432452-07bc5938759d"),
    buildUnsplashImage("1621315271772-28b1f3a5df87"),
    buildUnsplashImage("1608231387042-66d1773070a5"),
  ],
  sneakers: [
    buildUnsplashImage("1608231387042-66d1773070a5"),
    buildUnsplashImage("1600185365483-26d7a4cc7519"),
    buildUnsplashImage("1542291026-7eec264c27ff"),
    buildUnsplashImage("1608384177866-0bca0d225435"),
    buildUnsplashImage("1491553895911-0055eca6402d"),
  ],
  "running-daily": [
    buildUnsplashImage("1621315271772-28b1f3a5df87"),
    buildUnsplashImage("1491553895911-0055eca6402d"),
    buildUnsplashImage("1542291026-7eec264c27ff"),
    buildUnsplashImage("1552346154-21d32810aba3"),
    buildUnsplashImage("1600185365483-26d7a4cc7519"),
  ],
  "casual-leather": [
    buildUnsplashImage("1543508282-6319a3e2621f"),
    buildUnsplashImage("1515955656352-a1fa3ffcd111"),
    buildUnsplashImage("1549298916-b41d501d3772"),
    buildUnsplashImage("1676121270762-47c8d3a7b9d5"),
    buildUnsplashImage("1615979474401-8a6a344de5bd"),
  ],
  loafers: [
    buildUnsplashImage("1616406432452-07bc5938759d"),
    buildUnsplashImage("1614252235316-8c857d38b5f4"),
    buildUnsplashImage("1608667508764-33cf0726b13a"),
    buildUnsplashImage("1662541089338-c7d53b88be70"),
    buildUnsplashImage("1576792741377-eb0f4f6d1a47"),
  ],
  "care-accessories": [
    buildUnsplashImage("1543508282-6319a3e2621f"),
    buildUnsplashImage("1616406432452-07bc5938759d"),
    buildUnsplashImage("1515955656352-a1fa3ffcd111"),
    buildUnsplashImage("1676121270762-47c8d3a7b9d5"),
    buildUnsplashImage("1576792741377-eb0f4f6d1a47"),
  ],
  shirts: ["/assets/themes/closet-os/products/weekday-poplin-cloud.jpg"],
  outerwear: ["/assets/themes/cutline-club/products/overshirt-ink.jpg"],
  trousers: ["/assets/themes/cutline-club/products/trouser-stone.jpg"],
  tees: ["/assets/themes/cutline-club/products/tee-ivory.jpg"],
  bags: ["/assets/themes/cutline-club/products/wrap-bag.jpg"],
  abayas: [buildUnsplashImage("1515886657613-9f3515b0c78f")],
  sets: [buildUnsplashImage("1483985988355-763728e1935b")],
  dresses: [buildUnsplashImage("1496747611176-843222e1e57c")],
  hijabs: [buildUnsplashImage("1521572267360-ee0c2909d518")],
  "travel-shirts": [buildUnsplashImage("1500530855697-b586d89ba3ee")],
  "resort-dresses": [buildUnsplashImage("1496747611176-843222e1e57c")],
  "travel-shoes": [buildUnsplashImage("1577999499505-a4b64aaa9066")],
  "travel-bags": [buildUnsplashImage("1473116763249-2faaef81ccda")],
  coverups: [buildUnsplashImage("1529139574466-a303027c1d8b")],
  gowns: [buildUnsplashImage("1515886657613-9f3515b0c78f")],
  "occasion-layers": [buildUnsplashImage("1483985988355-763728e1935b")],
  "occasion-bags": [buildUnsplashImage("1512436991641-6745cdb1723f")],
  "occasion-heels": [buildUnsplashImage("1515347619252-60a4bf4fff4f")],
  "occasion-jewelry": [buildUnsplashImage("1521572267360-ee0c2909d518")],
  combos: [buildUnsplashImage("1513104890138-7c749659a591")],
  sandwiches: [buildUnsplashImage("1550547660-d9450f859349")],
  sides: [buildUnsplashImage("1541014741259-de529411b96a")],
  drinks: [buildUnsplashImage("1504674900247-0877df9cc836")],
  desserts: [buildUnsplashImage("1551024601-bec78aea704b")],
  "daily-sneakers": [
    buildUnsplashImage("1621315271772-28b1f3a5df87"),
    buildUnsplashImage("1542291026-7eec264c27ff"),
    buildUnsplashImage("1608231387042-66d1773070a5"),
    buildUnsplashImage("1608384177866-0bca0d225435"),
  ],
  "soft-flats": [
    buildUnsplashImage("1556004583-d2aaffbba592"),
    buildUnsplashImage("1551779245-692374a8efe2"),
    buildUnsplashImage("1616406432452-07bc5938759d"),
    buildUnsplashImage("1662541089338-c7d53b88be70"),
  ],
  "evening-heels": [
    buildUnsplashImage("1559334418-672d5a48531b"),
    buildUnsplashImage("1515347619252-60a4bf4fff4f"),
    buildUnsplashImage("1543163521-1bf539c55dd2"),
    buildUnsplashImage("1554062097-69c634085c6d"),
  ],
  "open-sandals": [
    buildUnsplashImage("1577999499505-a4b64aaa9066"),
    buildUnsplashImage("1603487742131-4160ec999306"),
    buildUnsplashImage("1559334418-672d5a48531b"),
    buildUnsplashImage("1554062097-69c634085c6d"),
  ],
  food: [
    buildUnsplashImage("1565299624946-b28f40a0ae38"),
    buildUnsplashImage("1504674900247-0877df9cc836"),
    buildUnsplashImage("1515003197210-e0cd71810b5f"),
    buildUnsplashImage("1512621776951-a57141f2eefd"),
  ],
  electronics: [
    buildUnsplashImage("1517336714739-489689fd1ca8"),
    buildUnsplashImage("1518770660439-4636190af475"),
    buildUnsplashImage("1519389950473-47ba0277781c"),
    buildUnsplashImage("1498049794561-7780e7231661"),
  ],
  kids: [
    buildUnsplashImage("1516627145497-ae6968895b74"),
    buildUnsplashImage("1515488042361-ee00e0ddd4e4"),
    buildUnsplashImage("1503454537195-1dcabb73ffb9"),
    buildUnsplashImage("1511389026070-a14ae610a1be"),
  ],
  digital: [
    buildUnsplashImage("1516321318423-f06f85e504b3"),
    buildUnsplashImage("1515879218367-8466d910aaa4"),
    buildUnsplashImage("1516321497487-e288fb19713f"),
    buildUnsplashImage("1526374965328-7f61d4dc18c5"),
  ],
  services: [
    buildUnsplashImage("1500530855697-b586d89ba3ee"),
    buildUnsplashImage("1469854523086-cc02fe5d8800"),
    buildUnsplashImage("1507525428034-b723cf961d3e"),
    buildUnsplashImage("1500530855697-b586d89ba3ee"),
  ],
  pets: [
    buildUnsplashImage("1517849845537-4d257902454a"),
    buildUnsplashImage("1548199973-03cce0bbc87b"),
    buildUnsplashImage("1518717758536-85ae29035b6d"),
    buildUnsplashImage("1518715308788-3005759c95cf"),
  ],
  beauty: [
    buildUnsplashImage("1522335789203-aabd1fc54bc9"),
    buildUnsplashImage("1522338242992-e1a54906a8da"),
    buildUnsplashImage("1512496015851-a90fb38ba796"),
    buildUnsplashImage("1515377905703-c4788e51af15"),
  ],
  books: [
    buildUnsplashImage("1512820790803-83ca734da794"),
    buildUnsplashImage("1507842217343-583bb7270b66"),
    buildUnsplashImage("1516979187457-637abb4f9353"),
    buildUnsplashImage("1512820790803-83ca734da794"),
  ],
  gifts: [
    buildUnsplashImage("1518895949257-7621c3c786d7"),
    buildUnsplashImage("1519378058457-4c29a0a2efac"),
    buildUnsplashImage("1524504388940-b1c1722653e1"),
    buildUnsplashImage("1518895949257-7621c3c786d7"),
  ],
  sports: [
    buildUnsplashImage("1517836357463-d25dfeac3438"),
    buildUnsplashImage("1517838277536-f5f99be501cd"),
    buildUnsplashImage("1518611012118-696072aa579a"),
    buildUnsplashImage("1517836357463-d25dfeac3438"),
  ],
  luxury: [
    buildUnsplashImage("1523170335258-f5ed11844a49"),
    buildUnsplashImage("1521572267360-ee0c2909d518"),
    buildUnsplashImage("1515562141207-7a88fb7ce338"),
    buildUnsplashImage("1523170335258-f5ed11844a49"),
  ],
  automotive: [
    buildUnsplashImage("1487754180451-c456f719a1fc"),
    buildUnsplashImage("1492144534655-ae79c964c9d7"),
    buildUnsplashImage("1503376780353-7e6692767b70"),
    buildUnsplashImage("1487754180451-c456f719a1fc"),
  ],
  handmade: [
    buildUnsplashImage("1517705008128-361805f42e86"),
    buildUnsplashImage("1473448912268-2022ce9509d8"),
    buildUnsplashImage("1515377905703-c4788e51af15"),
    buildUnsplashImage("1473448912268-2022ce9509d8"),
  ],
  grocery: [
    buildUnsplashImage("1542838132-92c53300491e"),
    buildUnsplashImage("1547592180-85f173990554"),
    buildUnsplashImage("1516594915697-87eb3b1c14ea"),
    buildUnsplashImage("1488459716781-31db52582fe9"),
  ],
  "plants-garden": [
    buildUnsplashImage("1466692476868-aef1dfb1e735"),
    buildUnsplashImage("1485955900006-10f4d324d411"),
    buildUnsplashImage("1466692476868-aef1dfb1e735"),
    buildUnsplashImage("1485955900006-10f4d324d411"),
  ],
  "baby-kids": [
    buildUnsplashImage("1515488042361-ee00e0ddd4e4"),
    buildUnsplashImage("1516627145497-ae6968895b74"),
    buildUnsplashImage("1515488042361-ee00e0ddd4e4"),
    buildUnsplashImage("1516627145497-ae6968895b74"),
  ],
};

const GENERATED_PREVIEW_BLUEPRINTS: Record<
  GeneratedPreviewFamily,
  GeneratedPreviewProductBlueprint[]
> = {
  menShoes: [
    {
      key: "stride-core-runner",
      name: "سنيكر سترايد",
      description: "سنيكر يومي خفيف بثبات أفضل للمشاوير الطويلة والتنقل السريع.",
      categoryId: "sneakers",
      categoryName: "سنيكرز",
      price: 2490,
      variantKind: "menShoe",
      tags: ["سنيكر", "يومي"],
    },
    {
      key: "brown-casual-leather",
      name: "كاجوال جلد",
      description:
        "حذاء جلد مرن يشتغل مع الشغل اليومي والخروجات من غير رسمية زائدة.",
      categoryId: "casual-leather",
      categoryName: "كاجوال جلد",
      price: 2890,
      variantKind: "menShoe",
      tags: ["كاجوال", "جلد"],
    },
    {
      key: "office-slip-loafer",
      name: "لوفر سهل",
      description:
        "لوفر مرتب للمكتب والزيارات، سريع في اللبس ويحافظ على شكل أهدأ.",
      categoryId: "loafers",
      categoryName: "لوفر وشغل",
      price: 2690,
      variantKind: "menShoe",
      tags: ["لوفر", "مكتب"],
    },
    {
      key: "clean-step-kit",
      name: "عدة عناية",
      description:
        "منتج مساعد يحافظ على الجلد والنعل ويكمل قرار الشراء للزوج الأساسي.",
      categoryId: "care-accessories",
      categoryName: "عناية وإكسسوارات",
      price: 790,
      comparePrice: 940,
      variantKind: "none",
      tags: ["عناية", "إكسسوار"],
    },
    {
      key: "pace-run-daily",
      name: "جري يومي",
      description:
        "موديل أنعم للراحة اليومية والجري الخفيف مع تهوية أوضح في الجزء العلوي.",
      categoryId: "running-daily",
      categoryName: "جري يومي",
      price: 2590,
      variantKind: "menShoe",
      tags: ["جري", "راحة"],
    },
  ],
  womenShoes: [
    {
      key: "cloud-sneaker",
      name: "سنيكر كلاود",
      description: "سنيكر يومي بخفة واضحة ونعل مريح للحركة من الصباح للمساء.",
      categoryId: "daily-sneakers",
      categoryName: "سنيكرز يومي",
      price: 2590,
      variantKind: "womenShoe",
      tags: ["سنيكر", "يومي"],
    },
    {
      key: "city-ballerina",
      name: "باليرينا سيتي",
      description: "باليرينا ناعمة للمشاوير الخفيفة والمكتب مع شكل مرتب وسريع.",
      categoryId: "soft-flats",
      categoryName: "فلات ناعمة",
      price: 2150,
      variantKind: "womenShoe",
      tags: ["فلات", "مكتب"],
    },
    {
      key: "brace-heel",
      name: "هيل سوار",
      description: "كعب مريح بارتفاع متوسط يشتغل للمساء والطلعات الرسمية.",
      categoryId: "evening-heels",
      categoryName: "كعب ومساء",
      price: 2890,
      variantKind: "womenShoe",
      tags: ["كعب", "مساء"],
    },
    {
      key: "summer-sandal",
      name: "صندل سمر",
      description: "صندل خفيف بتثبيت جيد وراحة أعلى للمشاوير الطويلة.",
      categoryId: "open-sandals",
      categoryName: "صنادل",
      price: 1790,
      variantKind: "womenShoe",
      tags: ["صندل", "صيف"],
    },
    {
      key: "weekend-court",
      name: "كورت ويك إند",
      description:
        "سنيكر أنظف للويك إند والخروجات السريعة مع إحساس أخف من الموديلات الرياضية.",
      categoryId: "daily-sneakers",
      categoryName: "سنيكرز يومي",
      price: 2390,
      variantKind: "womenShoe",
      tags: ["سنيكر", "ويك إند"],
    },
  ],
  fashionMixed: [
    {
      key: "mauve-flow-dress",
      name: "فستان فلو",
      description: "فستان خفيف بوقفة ناعمة مناسب للزيارات واليوم الطويل.",
      categoryId: "dresses",
      categoryName: "فساتين",
      price: 2490,
      variantKind: "womenApparel",
      tags: ["فستان", "ناعم"],
    },
    {
      key: "linen-day-set",
      name: "طقم لينن داي",
      description: "طقم قطعتين بخامة مريحة يسرّع قرار الشراء للوك جاهز.",
      categoryId: "sets",
      categoryName: "أطقم",
      price: 2290,
      variantKind: "womenApparel",
      tags: ["طقم", "لينن"],
    },
    {
      key: "soft-tailor-blazer",
      name: "بليزر سوفت تايلور",
      description: "بليزر بسيط يرفع الإطلالة اليومية بدون تعقيد في التنسيق.",
      categoryId: "outerwear",
      categoryName: "جاكيتات وبليزر",
      price: 2790,
      variantKind: "womenApparel",
      tags: ["بليزر", "خارجي"],
    },
    {
      key: "crossbody-lite",
      name: "كروس بودي ليت",
      description: "شنطة يومية خفيفة مع جيوب مرتبة وسهلة الدمج مع أكثر من لوك.",
      categoryId: "bags",
      categoryName: "شنط",
      price: 1590,
      variantKind: "accessoryColor",
      tags: ["شنطة", "يومي"],
    },
    {
      key: "silk-lab-scarf",
      name: "سكارف سيلك",
      description: "وشاح مطبوع بلمسة ناعمة يضيف حركة أسرع لرف الإكسسوارات.",
      categoryId: "scarves",
      categoryName: "أوشحة",
      price: 690,
      variantKind: "color",
      tags: ["سكارف", "مطبوع"],
    },
  ],
  luxuryFashion: [
    {
      key: "satin-signature-dress",
      name: "فستان ساتان سيجنتشر",
      description:
        "فستان مناسب للسهرات بطبقات هادئة ولمعة راقية غير مبالغ فيها.",
      categoryId: "luxury-dresses",
      categoryName: "فساتين فاخرة",
      price: 3990,
      variantKind: "womenApparel",
      tags: ["ساتان", "سهرة"],
    },
    {
      key: "lumi-evening-set",
      name: "طقم لومي",
      description: "طقم سهرة متوازن بين الفخامة والمرونة في الحركة واللبس.",
      categoryId: "luxury-sets",
      categoryName: "أطقم فاخرة",
      price: 4290,
      variantKind: "womenApparel",
      tags: ["طقم", "فاخر"],
    },
    {
      key: "crystal-line-heel",
      name: "كعب كريستال لاين",
      description: "كعب لافت بنعل ثابت وتفاصيل مرصعة تخدم الحفلات والمناسبات.",
      categoryId: "luxury-heels",
      categoryName: "أحذية السهرة",
      price: 3190,
      variantKind: "womenShoe",
      tags: ["كعب", "كريستال"],
    },
    {
      key: "structured-class-bag",
      name: "حقيبة ستراكشر",
      description: "حقيبة منظمة بحجم متوسط تناسب المناسبات واللوك الرسمي.",
      categoryId: "luxury-bags",
      categoryName: "حقائب فاخرة",
      price: 2890,
      variantKind: "accessoryColor",
      tags: ["حقيبة", "رسمي"],
    },
    {
      key: "night-silk-wrap",
      name: "وشاح حرير",
      description: "وشاح ناعم بإحساس فاخر يكمل الإطلالة ويعمل كهدية مناسبة.",
      categoryId: "luxury-scarves",
      categoryName: "أوشحة فاخرة",
      price: 980,
      variantKind: "color",
      tags: ["حرير", "هدية"],
    },
  ],
  womenFashion: [
    {
      key: "midi-flow-dress",
      name: "فستان ميدي",
      description: "فستان يومي عملي مع حركة خفيفة وشكل مرتب في الصور والواقع.",
      categoryId: "dresses",
      categoryName: "فساتين",
      price: 2290,
      variantKind: "womenApparel",
      tags: ["فستان", "ميدي"],
    },
    {
      key: "drape-blouse",
      name: "بلوزة دريب",
      description: "بلوزة سهلة التنسيق مع خامة مريحة للمشاوير والدوام.",
      categoryId: "tops",
      categoryName: "بلوزات وتوبات",
      price: 1590,
      variantKind: "womenApparel",
      tags: ["بلوزة", "خفيف"],
    },
    {
      key: "city-coord-set",
      name: "طقم سيتي",
      description: "طقم منسق جاهز يقلل التردد ويعطي إطلالة كاملة بسرعة.",
      categoryId: "sets",
      categoryName: "أطقم",
      price: 2490,
      variantKind: "womenApparel",
      tags: ["طقم", "منسق"],
    },
    {
      key: "block-heel",
      name: "بلوك هيل",
      description: "حذاء بكعب ثابت يوازن بين الراحة والشكل المناسب للخروج.",
      categoryId: "heels",
      categoryName: "أحذية",
      price: 2390,
      variantKind: "womenShoe",
      tags: ["كعب", "ثابت"],
    },
    {
      key: "shadow-pouch",
      name: "شنطة باوتش",
      description: "شنطة صغيرة منظمة للمشاوير والطلعات اليومية مع سعة ذكية.",
      categoryId: "bags",
      categoryName: "شنط",
      price: 1390,
      variantKind: "accessoryColor",
      tags: ["شنطة", "باوتش"],
    },
  ],
  accessories: [
    {
      key: "crossbody-bag",
      name: "شنطة كروس بودي",
      description: "شنطة عملية للاستخدام اليومي مع تقسيم داخلي بسيط وواضح.",
      categoryId: "bags",
      categoryName: "شنط",
      price: 1490,
      variantKind: "accessoryColor",
      tags: ["شنطة", "يومي"],
    },
    {
      key: "shoulder-rose-bag",
      name: "شنطة شولدر",
      description: "حقيبة كتف بخطوط نظيفة تناسب المكتب والخروجات السريعة.",
      categoryId: "bags",
      categoryName: "شنط",
      price: 1690,
      variantKind: "accessoryColor",
      tags: ["كتف", "شنطة"],
    },
    {
      key: "printed-scarf",
      name: "سكارف مطبوع",
      description: "سكارف خفيف يزيد تنوع العرض ويخدم الهدية الخفيفة.",
      categoryId: "scarves",
      categoryName: "أوشحة",
      price: 590,
      variantKind: "color",
      tags: ["سكارف", "مطبوع"],
    },
    {
      key: "slim-belt",
      name: "حزام سليم",
      description: "حزام بسيط بلمسة معدنية أنظف للوك اليومي.",
      categoryId: "belts",
      categoryName: "أحزمة",
      price: 490,
      variantKind: "color",
      tags: ["حزام", "إكسسوار"],
    },
    {
      key: "snap-wallet",
      name: "محفظة سنيب",
      description: "محفظة صغيرة مرتبة للبطاقات والنقد وتشتغل مع الهدية.",
      categoryId: "wallets",
      categoryName: "محافظ",
      price: 620,
      variantKind: "color",
      tags: ["محفظة", "هدية"],
    },
  ],
  menswear: [
    {
      key: "poplin-day-shirt",
      name: "قميص بوبلين",
      description: "قميص يومي مرتب يشتغل للمكتب والخروج بدون مجهود.",
      categoryId: "shirts",
      categoryName: "قمصان",
      price: 1690,
      variantKind: "mensApparel",
      tags: ["قميص", "بوبلين"],
    },
    {
      key: "street-overshirt",
      name: "أوفرشيرت عملي",
      description: "أوفرشيرت عملي للطبقات السريعة ويزوّد اللبسة حضور مرتب.",
      categoryId: "outerwear",
      categoryName: "طبقات خفيفة",
      price: 2190,
      variantKind: "mensApparel",
      tags: ["أوفرشيرت", "طبقات"],
    },
    {
      key: "commute-trouser",
      name: "بنطلون مشاوير",
      description:
        "بنطلون مريح بقصة واضحة للحركة اليومية والدوام من غير تعقيد.",
      categoryId: "trousers",
      categoryName: "بناطيل",
      price: 1890,
      variantKind: "sizeGeneric",
      tags: ["بنطلون", "يومي"],
    },
    {
      key: "relay-tee",
      name: "تي شيرت أساسي",
      description: "تي شيرت أساسي بخامة مرتبة يصلح كقاعدة لعدة لوكات.",
      categoryId: "tees",
      categoryName: "تي شيرت",
      price: 990,
      variantKind: "sizeGeneric",
      tags: ["تي شيرت", "أساسي"],
    },
    {
      key: "weekend-duffel",
      name: "شنطة دفل",
      description: "شنطة سفر قصيرة أو جيم بسعة كافية وشكل عملي.",
      categoryId: "bags",
      categoryName: "حقائب",
      price: 1890,
      variantKind: "color",
      tags: ["شنطة", "دفل"],
    },
  ],
  modestFashion: [
    {
      key: "layered-abaya",
      name: "عباية لايرد",
      description: "عباية يومية بخطوط مريحة وتفاصيل تناسب اللبس المتكرر.",
      categoryId: "abayas",
      categoryName: "عبايات",
      price: 2590,
      variantKind: "womenApparel",
      tags: ["عباية", "يومي"],
    },
    {
      key: "sand-kimono-set",
      name: "طقم كيمونو",
      description: "طقم منسق يسهّل قرار الشراء للوك محتشم ومريح.",
      categoryId: "sets",
      categoryName: "أطقم محتشمة",
      price: 2490,
      variantKind: "womenApparel",
      tags: ["كيمونو", "طقم"],
    },
    {
      key: "inner-drape-dress",
      name: "فستان اندر",
      description: "فستان أساسي يمكن بناؤه تحت الطبقات أو ارتداؤه منفردًا.",
      categoryId: "dresses",
      categoryName: "فساتين أساسية",
      price: 1890,
      variantKind: "womenApparel",
      tags: ["أساسي", "فساتين"],
    },
    {
      key: "modal-hijab",
      name: "حجاب مودال",
      description: "حجاب ناعم ومريح طوال اليوم مع ألوان سهلة الدمج.",
      categoryId: "hijabs",
      categoryName: "حجاب وأوشحة",
      price: 520,
      variantKind: "color",
      tags: ["حجاب", "مودال"],
    },
    {
      key: "daily-tote",
      name: "شنطة ديلي",
      description: "شنطة واسعة تكمل الروتين اليومي والجامعة والعمل.",
      categoryId: "bags",
      categoryName: "شنط",
      price: 1490,
      variantKind: "accessoryColor",
      tags: ["شنطة", "واسعة"],
    },
  ],
  resortFashion: [
    {
      key: "linen-breeze-shirt",
      name: "قميص لينن",
      description: "قميص خفيف للحر والسفر مع خامة مناسبة للبحر والمشاوير.",
      categoryId: "travel-shirts",
      categoryName: "قمصان سفر",
      price: 1590,
      variantKind: "womenApparel",
      tags: ["لينن", "سفر"],
    },
    {
      key: "beach-drop-dress",
      name: "فستان بيتش",
      description: "فستان خفيف للرحلات الصيفية واللوك السريع بعد البحر.",
      categoryId: "resort-dresses",
      categoryName: "فساتين مصايف",
      price: 2390,
      variantKind: "womenApparel",
      tags: ["مصايف", "فستان"],
    },
    {
      key: "resort-sandal",
      name: "صندل ريزورت",
      description: "صندل مريح للمشي الطويل والتنقل بين البحر والكافيه.",
      categoryId: "travel-shoes",
      categoryName: "أحذية سفر",
      price: 1690,
      variantKind: "womenShoe",
      tags: ["صندل", "سفر"],
    },
    {
      key: "straw-tote",
      name: "شنطة سترو",
      description: "شنطة واسعة تجمع الضروريات وتزيد إحساس الرحلة في العرض.",
      categoryId: "travel-bags",
      categoryName: "شنط سفر",
      price: 1490,
      variantKind: "accessoryColor",
      tags: ["سترو", "شنطة"],
    },
    {
      key: "coverup-lite",
      name: "كاڤر أب",
      description: "قطعة خفيفة للبحر والمسبح وسهلة الطي داخل الحقيبة.",
      categoryId: "coverups",
      categoryName: "تغطيات خفيفة",
      price: 1290,
      variantKind: "womenApparel",
      tags: ["بيتش", "تغطية"],
    },
  ],
  occasionFashion: [
    {
      key: "night-shimmer-gown",
      name: "فستان شيمر",
      description: "فستان مناسبات بلمعة خفيفة وتفصيل يبرز في الصور والواقع.",
      categoryId: "gowns",
      categoryName: "فساتين سهرة",
      price: 4690,
      variantKind: "womenApparel",
      tags: ["سهرة", "فستان"],
    },
    {
      key: "embroidered-cape",
      name: "كاب مطرز",
      description: "قطعة مميزة ترفع الإطلالة وتسمح بعرض layered styling أوضح.",
      categoryId: "occasion-layers",
      categoryName: "طبقات المناسبات",
      price: 2290,
      variantKind: "womenApparel",
      tags: ["كاب", "مطرز"],
    },
    {
      key: "stone-clutch",
      name: "كلاتش ستون",
      description: "كلاتش صغيرة منظمة تناسب المناسبات والحفلات بسرعة.",
      categoryId: "occasion-bags",
      categoryName: "شنط سهرة",
      price: 1890,
      variantKind: "accessoryColor",
      tags: ["كلاتش", "سهرة"],
    },
    {
      key: "satin-heel",
      name: "كعب ساتان",
      description: "كعب بسيط بكسوة ساتان يكمّل رف المناسبات بأقل تشويش.",
      categoryId: "occasion-heels",
      categoryName: "أحذية المناسبات",
      price: 2890,
      variantKind: "womenShoe",
      tags: ["كعب", "ساتان"],
    },
    {
      key: "evening-earrings",
      name: "أقراط إيڤنينج",
      description: "إكسسوار سهل البيع لإتمام الطلب مع الفساتين والشنط.",
      categoryId: "occasion-jewelry",
      categoryName: "إكسسوارات مناسبات",
      price: 990,
      variantKind: "color",
      tags: ["أقراط", "إكسسوار"],
    },
  ],
  generalStore: [
    {
      key: "drawer-organizer",
      name: "منظم أدراج",
      description: "منظم عملي للبيت أو المكتب يزيد وضوح قيمة الشراء السريع.",
      categoryId: "home-utility",
      categoryName: "تنظيم يومي",
      price: 690,
      variantKind: "color",
      tags: ["منظم", "بيت"],
    },
    {
      key: "thermal-bottle",
      name: "زجاجة حرارية",
      description: "زجاجة حرارية متينة للسفر والمكتب مع ألوان سهلة الاختيار.",
      categoryId: "daily-essentials",
      categoryName: "أساسيات يومية",
      price: 790,
      variantKind: "color",
      tags: ["زجاجة", "سفر"],
    },
    {
      key: "portable-lamp",
      name: "لمبة مكتبية",
      description: "لمبة شحن صغيرة للمكتب والسرير مع استخدام واضح على الكارت.",
      categoryId: "home-utility",
      categoryName: "تنظيم يومي",
      price: 1290,
      variantKind: "color",
      tags: ["لمبة", "مكتب"],
    },
    {
      key: "aroma-diffuser",
      name: "دفيوزر",
      description: "قطعة منزلية خفيفة ترفع perception الهدية والبيت العصري.",
      categoryId: "home-comfort",
      categoryName: "راحة المنزل",
      price: 1590,
      variantKind: "color",
      tags: ["دفيوزر", "بيت"],
    },
    {
      key: "serving-tray",
      name: "طقم صواني",
      description: "طقم تقديم عملي يناسب الاستخدام اليومي والهدايا البسيطة.",
      categoryId: "home-comfort",
      categoryName: "راحة المنزل",
      price: 1190,
      variantKind: "color",
      tags: ["صواني", "هدية"],
    },
  ],
  premiumBrand: [
    {
      key: "leather-tray",
      name: "صينية جلد",
      description: "قطعة ديكور عملية بنظافة بصرية أعلى للبيوت والمكاتب.",
      categoryId: "signature-objects",
      categoryName: "قطع توقيع",
      price: 1890,
      variantKind: "color",
      tags: ["جلد", "ديكور"],
    },
    {
      key: "signature-candle",
      name: "شمعة سيجنتشر",
      description: "شمعة مع تغليف أنظف ومناسبة للهدية أو الرف المميز.",
      categoryId: "signature-objects",
      categoryName: "قطع توقيع",
      price: 1290,
      variantKind: "beautySize",
      tags: ["شمعة", "هدية"],
    },
    {
      key: "travel-organizer",
      name: "منظم سفر",
      description: "منظم فاخر للمستندات والإكسسوارات الصغيرة في التنقل.",
      categoryId: "travel-living",
      categoryName: "سفر ومعيشة",
      price: 1790,
      variantKind: "color",
      tags: ["منظم", "سفر"],
    },
    {
      key: "cashmere-throw",
      name: "بطانية خفيفة",
      description: "قطعة منزلية دافئة ترفع الطابع الفاخر للقسم المنزلي.",
      categoryId: "travel-living",
      categoryName: "سفر ومعيشة",
      price: 2390,
      variantKind: "color",
      tags: ["بطانية", "منزل"],
    },
    {
      key: "desk-object-set",
      name: "طقم مكتب",
      description:
        "مجموعة إكسسوارات مكتب مرتبة تشتغل كهدية corporate أو شخصية.",
      categoryId: "signature-objects",
      categoryName: "قطع توقيع",
      price: 2190,
      variantKind: "color",
      tags: ["مكتب", "هدية"],
    },
  ],
  naturalProducts: [
    {
      key: "herbal-tea",
      name: "شاي عشبي",
      description: "خلطة يومية بطابع طبيعي واضح وتغليف مناسب للهدية.",
      categoryId: "wellness-pantry",
      categoryName: "رف العافية",
      price: 310,
      variantKind: "none",
      tags: ["شاي", "طبيعي"],
    },
    {
      key: "botanical-mist",
      name: "مِست نباتي",
      description: "رذاذ منعش للاستخدام اليومي مع أحجام سهلة التجربة.",
      categoryId: "natural-care",
      categoryName: "عناية طبيعية",
      price: 540,
      variantKind: "beautySize",
      tags: ["مست", "بشرة"],
    },
    {
      key: "cold-pressed-oil",
      name: "زيت معصور",
      description:
        "زيت طبيعي متعدد الاستخدامات للشعر والبشرة والعناية اليومية.",
      categoryId: "natural-care",
      categoryName: "عناية طبيعية",
      price: 620,
      variantKind: "beautySize",
      tags: ["زيت", "عناية"],
    },
    {
      key: "granola-jar",
      name: "جرانولا",
      description: "خلطة فطور طبيعية سهلة البيع مع صورة شهية وواضحة.",
      categoryId: "wellness-pantry",
      categoryName: "رف العافية",
      price: 280,
      variantKind: "none",
      tags: ["فطور", "طبيعي"],
    },
    {
      key: "bath-salt",
      name: "ملح استحمام",
      description: "منتج استرخاء بسيط يرفع متوسط السلة بسهولة.",
      categoryId: "natural-care",
      categoryName: "عناية طبيعية",
      price: 450,
      variantKind: "beautySize",
      tags: ["استرخاء", "عناية"],
    },
  ],
  restaurant: [
    {
      key: "signature-combo",
      name: "كومبو سيجنتشر",
      description: "وجبة متكاملة سريعة القرار مناسبة لأول منتج في العرض.",
      categoryId: "combos",
      categoryName: "كومبوهات",
      price: 245,
      variantKind: "none",
      tags: ["كومبو", "وجبة"],
    },
    {
      key: "grill-wrap",
      name: "راب مشوي",
      description: "ساندوتش سريع مع مكونات واضحة وصورة appetizing على الكارت.",
      categoryId: "sandwiches",
      categoryName: "ساندوتشات",
      price: 155,
      variantKind: "none",
      tags: ["راب", "مشوي"],
    },
    {
      key: "loaded-fries",
      name: "بطاطس لودد",
      description: "صنف جانبي قوي للـ upsell ومناسب للعروض الثنائية.",
      categoryId: "sides",
      categoryName: "إضافات",
      price: 110,
      variantKind: "none",
      tags: ["بطاطس", "إضافات"],
    },
    {
      key: "citrus-soda",
      name: "مشروب حمضي",
      description: "مشروب بارد خفيف يكمّل الكومبو ويرفع متوسط الطلب.",
      categoryId: "drinks",
      categoryName: "مشروبات",
      price: 68,
      variantKind: "none",
      tags: ["مشروب", "بارد"],
    },
    {
      key: "cookie-bomb",
      name: "كوكي بومب",
      description: "تحلية صغيرة وسهلة الإضافة عند نهاية الطلب.",
      categoryId: "desserts",
      categoryName: "تحلية",
      price: 82,
      variantKind: "none",
      tags: ["تحلية", "كوكي"],
    },
  ],
  mobileStore: [
    {
      key: "nova-x7",
      name: "Nova X7 5G",
      description:
        "موبايل متوسط قوي للعرض الرئيسي مع فروق نسخ واضحة وسهلة المقارنة.",
      categoryId: "phones",
      categoryName: "هواتف",
      price: 18990,
      variantKind: "mobileConfig",
      tags: ["موبايل", "5G"],
    },
    {
      key: "buds-air-lite",
      name: "Buds Air Lite",
      description: "سماعات خفيفة للطلب السريع والبيع المكمل مع الهاتف.",
      categoryId: "audio",
      categoryName: "صوتيات",
      price: 2490,
      variantKind: "color",
      tags: ["سماعات", "بلوتوث"],
    },
    {
      key: "gan-65w",
      name: "شاحن 65W",
      description: "شاحن سريع يخدم الهاتف واللابتوب الخفيف داخل المتجر.",
      categoryId: "charging",
      categoryName: "شحن",
      price: 1390,
      variantKind: "none",
      tags: ["شاحن", "سريع"],
    },
    {
      key: "slim-powerbank",
      name: "باور بانك سليم",
      description: "بطارية محمولة بسعة كافية ومظهر أنظف على الكارت.",
      categoryId: "charging",
      categoryName: "شحن",
      price: 1890,
      variantKind: "color",
      tags: ["باور بانك", "سفر"],
    },
    {
      key: "armor-case",
      name: "كفر أرمور",
      description: "جراب حماية يومي مع ألوان متعددة وقرار شراء سريع.",
      categoryId: "cases",
      categoryName: "جرابات",
      price: 620,
      variantKind: "color",
      tags: ["كفر", "حماية"],
    },
  ],
  techStore: [
    {
      key: "creator-14",
      name: "Creator 14",
      description: "لابتوب خفيف بمواصفات أوضح للعمل والدراسة وصناعة المحتوى.",
      categoryId: "laptops",
      categoryName: "لابتوبات",
      price: 28990,
      variantKind: "techConfig",
      tags: ["لابتوب", "عمل"],
    },
    {
      key: "qhd-monitor",
      name: "شاشة QHD 27",
      description: "شاشة بتفاصيل أعلى وتجربة أوضح للمونتاج والجيمينج الخفيف.",
      categoryId: "monitors",
      categoryName: "شاشات",
      price: 10990,
      variantKind: "techConfig",
      tags: ["شاشة", "QHD"],
    },
    {
      key: "mech-keyboard",
      name: "كيبورد ميكانيكال",
      description: "كيبورد منظم للتجميعات والمكاتب مع ألوان جاهزة للعرض.",
      categoryId: "accessories",
      categoryName: "إكسسوارات",
      price: 2390,
      variantKind: "color",
      tags: ["كيبورد", "مكتب"],
    },
    {
      key: "precision-mouse",
      name: "ماوس بريسيجن",
      description:
        "ماوس مريح ودقيق يشتغل كإضافة طبيعية مع الشاشات واللابتوبات.",
      categoryId: "accessories",
      categoryName: "إكسسوارات",
      price: 1490,
      variantKind: "color",
      tags: ["ماوس", "دقة"],
    },
    {
      key: "dock-9in1",
      name: "Dock 9-in-1",
      description: "محطة توصيل عملية تسهّل القرار للمستخدم المكتبي.",
      categoryId: "accessories",
      categoryName: "إكسسوارات",
      price: 3290,
      variantKind: "none",
      tags: ["Dock", "مكتب"],
    },
  ],
  kidsStore: [
    {
      key: "rocket-blocks",
      name: "روكيت بلوكس",
      description: "مكعبات بناء ممتعة بألوان واضحة وسهلة العرض على الأهالي.",
      categoryId: "creative-toys",
      categoryName: "ألعاب تركيب",
      price: 790,
      variantKind: "color",
      tags: ["مكعبات", "أطفال"],
    },
    {
      key: "junior-scooter",
      name: "سكوتر جونيور",
      description: "سكوتر للأطفال مع ألوان متعددة ورسالة شراء مباشرة.",
      categoryId: "active-play",
      categoryName: "لعب حركي",
      price: 1890,
      variantKind: "color",
      tags: ["سكوتر", "حركي"],
    },
    {
      key: "adventure-tent",
      name: "خيمة مغامرة",
      description: "خيمة لعب منزلية ترفع impression القسم من أول نظرة.",
      categoryId: "active-play",
      categoryName: "لعب حركي",
      price: 1490,
      variantKind: "none",
      tags: ["خيمة", "لعب"],
    },
    {
      key: "art-kit",
      name: "طقم ألوان",
      description: "طقم إبداعي للهدايا والأنشطة اليومية داخل البيت.",
      categoryId: "creative-toys",
      categoryName: "ألعاب تركيب",
      price: 520,
      variantKind: "none",
      tags: ["ألوان", "نشاط"],
    },
    {
      key: "magnet-puzzle",
      name: "بازل ماغنت",
      description: "لعبة هادئة للتركيز والتعلم مع قرار شراء سهل.",
      categoryId: "learning-toys",
      categoryName: "تعليم وتسلية",
      price: 460,
      variantKind: "none",
      tags: ["بازل", "تعليم"],
    },
  ],
  babyStore: [
    {
      key: "muslin-swaddle",
      name: "بطانية موسلين",
      description: "بطانية خفيفة ولطيفة بخيارات لون هادئة للأمهات.",
      categoryId: "nursery-basics",
      categoryName: "أساسيات البيبي",
      price: 620,
      variantKind: "color",
      tags: ["بطانية", "بيبي"],
    },
    {
      key: "silicone-feeding-set",
      name: "طقم رضاعة",
      description: "طقم عملي للرضاعة والفطام المبكر مع صورة أوضح للفائدة.",
      categoryId: "feeding",
      categoryName: "إطعام",
      price: 790,
      variantKind: "color",
      tags: ["رضاعة", "فطام"],
    },
    {
      key: "stroller-organizer",
      name: "منظم سترولر",
      description: "منظم خارجي للستروالر يرفع قيمة الاستخدام اليومي.",
      categoryId: "travel-baby",
      categoryName: "خروج وتنقل",
      price: 540,
      variantKind: "color",
      tags: ["سترولر", "تنظيم"],
    },
    {
      key: "cloud-plush",
      name: "دبدوب سحابة",
      description: "لعبة ناعمة مناسبة للهدية وصور القسم الرئيسية.",
      categoryId: "nursery-basics",
      categoryName: "أساسيات البيبي",
      price: 390,
      variantKind: "none",
      tags: ["دبدوب", "هدية"],
    },
    {
      key: "night-light",
      name: "إضاءة ليلية",
      description: "إضاءة هادئة لغرفة الطفل مع شكل لطيف ومساحة بيع إضافية.",
      categoryId: "nursery-basics",
      categoryName: "أساسيات البيبي",
      price: 480,
      variantKind: "color",
      tags: ["إضاءة", "غرفة"],
    },
  ],
  furnitureStore: [
    {
      key: "curve-sofa",
      name: "كنبة كيرف",
      description: "كنبة رئيسية مريحة بخطوط نظيفة وصورة hero مناسبة.",
      categoryId: "living-room",
      categoryName: "غرفة المعيشة",
      price: 22990,
      variantKind: "color",
      tags: ["كنبة", "صالون"],
    },
    {
      key: "oak-armchair",
      name: "كرسي أوك",
      description: "كرسي جانبي يضيف عمقًا بصريًا لقسم الجلوس.",
      categoryId: "living-room",
      categoryName: "غرفة المعيشة",
      price: 8990,
      variantKind: "color",
      tags: ["كرسي", "خشب"],
    },
    {
      key: "stone-coffee-table",
      name: "ترابيزة قهوة",
      description: "طاولة مركزية بسيطة تلائم أكثر من ستايل داخلي.",
      categoryId: "tables",
      categoryName: "طاولات",
      price: 7490,
      variantKind: "color",
      tags: ["طاولة", "ديكور"],
    },
    {
      key: "floor-lamp",
      name: "أباجورة أرضية",
      description: "إضاءة ديكور ترفع تصور الجاهزية للبيت كاملًا.",
      categoryId: "lighting",
      categoryName: "إضاءة",
      price: 3890,
      variantKind: "color",
      tags: ["أباجورة", "إضاءة"],
    },
    {
      key: "arched-mirror",
      name: "مراية آرتش",
      description: "مرآة طويلة للتجهيز والغرف مع حضور واضح في الصور.",
      categoryId: "decor",
      categoryName: "ديكور",
      price: 6290,
      variantKind: "color",
      tags: ["مراية", "ديكور"],
    },
  ],
  petStore: [
    {
      key: "daily-food",
      name: "أكل جاف يومي",
      description: "طعام متوازن للحيوانات الأليفة بوضوح أعلى في الجرعة والفئة.",
      categoryId: "food",
      categoryName: "أكل ومكافآت",
      price: 540,
      variantKind: "beautySize",
      tags: ["أكل", "كلاب"],
    },
    {
      key: "walk-leash",
      name: "طقم ممشى",
      description: "ليد وحزام بسهولة اختيار وألوان مناسبة للمقاسات الشائعة.",
      categoryId: "walk",
      categoryName: "مشاوير",
      price: 490,
      variantKind: "color",
      tags: ["ليد", "ممشى"],
    },
    {
      key: "soft-bed",
      name: "سرير سوفت",
      description: "سرير مريح يرفع إحساس العناية والجودة في القسم.",
      categoryId: "beds",
      categoryName: "أسرة وراحة",
      price: 890,
      variantKind: "color",
      tags: ["سرير", "راحة"],
    },
    {
      key: "groom-brush",
      name: "فرشة جرووم",
      description: "أداة عناية سهلة وسريعة الإضافة للسلة.",
      categoryId: "care",
      categoryName: "عناية",
      price: 260,
      variantKind: "none",
      tags: ["فرشة", "عناية"],
    },
    {
      key: "rope-toy",
      name: "لعبة حبل",
      description: "لعبة نشاط يومي تسهّل الـ add-on وتناسب أكثر من حجم.",
      categoryId: "toys",
      categoryName: "لعب",
      price: 210,
      variantKind: "none",
      tags: ["لعبة", "نشاط"],
    },
  ],
  beautyStore: [
    {
      key: "soft-cleanser",
      name: "غسول ناعم",
      description: "غسول يومي بتركيبة مريحة يشرح الفائدة بسرعة من أول كارت.",
      categoryId: "cleansers",
      categoryName: "غسول وتنظيف",
      price: 420,
      variantKind: "beautySize",
      tags: ["غسول", "بشرة"],
    },
    {
      key: "glass-skin-serum",
      name: "سيرم جلو",
      description: "سيرم أساسي للترطيب واللمعة مع أحجام واضحة للتجربة.",
      categoryId: "serums",
      categoryName: "سيرومات",
      price: 690,
      variantKind: "beautySize",
      tags: ["سيرم", "جلو"],
    },
    {
      key: "velvet-lipstick",
      name: "روج فيلفت",
      description: "روج يومي بدرجات ناعمة يرفع تنوع العرض في قسم المكياج.",
      categoryId: "makeup",
      categoryName: "مكياج",
      price: 360,
      variantKind: "color",
      tags: ["روج", "مكياج"],
    },
    {
      key: "daily-sunscreen",
      name: "واقي شمس",
      description: "واقي شمس خفيف للاستخدام اليومي دون إحساس دهني ثقيل.",
      categoryId: "care",
      categoryName: "عناية يومية",
      price: 510,
      variantKind: "beautySize",
      tags: ["واقي شمس", "عناية"],
    },
    {
      key: "discovery-beauty-set",
      name: "طقم تجربة",
      description: "مجموعة صغيرة تصلح للهدية أو أول تجربة داخل المتجر.",
      categoryId: "sets",
      categoryName: "مجموعات وهدايا",
      price: 890,
      variantKind: "beautySize",
      tags: ["طقم", "هدية"],
    },
  ],
  bookStore: [
    {
      key: "daily-notebook",
      name: "دفتر يومي",
      description: "دفتر مرتب بجودة تغليف ترفع الإحساس المكتبي من أول نظرة.",
      categoryId: "stationery",
      categoryName: "قرطاسية",
      price: 180,
      variantKind: "color",
      tags: ["دفتر", "قرطاسية"],
    },
    {
      key: "reading-novel",
      name: "رواية مسائية",
      description: "رواية مميزة تعطي حضورًا أقوى لقسم الكتب الموصى بها.",
      categoryId: "books",
      categoryName: "كتب وروايات",
      price: 240,
      variantKind: "none",
      tags: ["رواية", "قراءة"],
    },
    {
      key: "weekly-planner",
      name: "بلانر أسبوعي",
      description: "منظم أسبوعي يناسب الطلاب والعمل ويزيد تكرار الشراء.",
      categoryId: "stationery",
      categoryName: "قرطاسية",
      price: 210,
      variantKind: "color",
      tags: ["بلانر", "تنظيم"],
    },
    {
      key: "pen-set",
      name: "طقم أقلام",
      description: "طقم أقلام مناسب كإضافة سريعة مع الدفاتر والهدايا.",
      categoryId: "stationery",
      categoryName: "قرطاسية",
      price: 120,
      variantKind: "color",
      tags: ["أقلام", "هدية"],
    },
    {
      key: "reading-lamp",
      name: "لمبة قراءة",
      description: "إكسسوار مكتبي بسيط يوسع متوسط السلة بسهولة.",
      categoryId: "desk-accessories",
      categoryName: "إكسسوارات مكتب",
      price: 340,
      variantKind: "color",
      tags: ["إضاءة", "مكتب"],
    },
  ],
  floristStore: [
    {
      key: "signature-bouquet",
      name: "بوكيه سيجنتشر",
      description: "بوكيه رئيسي للمناسبات السريعة مع صورة أقوى على أول رف.",
      categoryId: "bouquets",
      categoryName: "بوكيهات",
      price: 950,
      variantKind: "color",
      tags: ["ورد", "بوكيه"],
    },
    {
      key: "ceramic-vase",
      name: "فازة سيراميك",
      description: "فازة منظمة تكمل الطلب أو تشتغل منفردة كقطعة منزلية.",
      categoryId: "vases",
      categoryName: "فازات",
      price: 620,
      variantKind: "color",
      tags: ["فازة", "ديكور"],
    },
    {
      key: "gift-flower-box",
      name: "بوكس هدية",
      description: "تنسيق ورد داخل بوكس جاهز للهدية السريعة والمناسبات.",
      categoryId: "gift-boxes",
      categoryName: "هدايا",
      price: 1190,
      variantKind: "color",
      tags: ["هدية", "ورد"],
    },
    {
      key: "preserved-rose",
      name: "وردة محفوظة",
      description: "قطعة رمزية صغيرة بأسعار أسهل للشراء الفوري.",
      categoryId: "gift-boxes",
      categoryName: "هدايا",
      price: 390,
      variantKind: "color",
      tags: ["وردة", "هدية"],
    },
    {
      key: "occasion-card",
      name: "كارت مناسبة",
      description: "إضافة بسيطة ترفع فرصة الإكمال أثناء الدفع.",
      categoryId: "addons",
      categoryName: "إضافات",
      price: 65,
      variantKind: "none",
      tags: ["كارت", "إضافة"],
    },
  ],
  fitnessStore: [
    {
      key: "dumbbell-set",
      name: "طقم دمبل",
      description: "طقم أوزان منزلي واضح القيمة ومناسب لأول رف رياضي.",
      categoryId: "strength",
      categoryName: "قوة وتمارين",
      price: 3490,
      variantKind: "techConfig",
      tags: ["دمبل", "قوة"],
    },
    {
      key: "resistance-bands",
      name: "مقاومات",
      description: "مجموعة مرنة للبيت أو الجيم مع استخدام مباشر ومفهوم.",
      categoryId: "strength",
      categoryName: "قوة وتمارين",
      price: 690,
      variantKind: "color",
      tags: ["مقاومات", "تمرين"],
    },
    {
      key: "yoga-mat",
      name: "يوجا مات",
      description: "بساط تمرين بتدرج ألوان واضح وسهل الاختيار.",
      categoryId: "recovery",
      categoryName: "تعافي ولياقة",
      price: 890,
      variantKind: "color",
      tags: ["مات", "يوجا"],
    },
    {
      key: "shaker-pro",
      name: "شيكر برو",
      description: "إضافة بسيطة مناسبة للباندلز والطلبات السريعة.",
      categoryId: "accessories",
      categoryName: "إكسسوارات",
      price: 260,
      variantKind: "color",
      tags: ["شيكر", "إكسسوار"],
    },
    {
      key: "gym-bag",
      name: "شنطة جيم",
      description: "شنطة عملية تكمل عرض القسم الرياضي وتزيد متوسط الطلب.",
      categoryId: "accessories",
      categoryName: "إكسسوارات",
      price: 890,
      variantKind: "color",
      tags: ["شنطة", "جيم"],
    },
  ],
  luxuryStore: [
    {
      key: "diamond-ring",
      name: "خاتم سيجنتشر",
      description: "خاتم عرض رئيسي بتغليف أنظف وإحساس فاخر على البطاقة.",
      categoryId: "rings",
      categoryName: "خواتم",
      price: 6290,
      variantKind: "color",
      tags: ["خاتم", "فخامة"],
    },
    {
      key: "heart-necklace",
      name: "سلسلة ناعمة",
      description: "سلسلة مناسبة للهدايا مع صور أقرب للرفاهية والهدوء.",
      categoryId: "necklaces",
      categoryName: "سلاسل",
      price: 4890,
      variantKind: "color",
      tags: ["سلسلة", "هدية"],
    },
    {
      key: "turquoise-bracelet",
      name: "أسوارة كلاسيك",
      description: "أسوارة يومية فاخرة تزيد تنوع العرض في قسم المجوهرات.",
      categoryId: "bracelets",
      categoryName: "أساور",
      price: 3590,
      variantKind: "color",
      tags: ["أسوارة", "مجوهرات"],
    },
    {
      key: "midnight-watch",
      name: "ساعة ميدنايت",
      description: "ساعة عرض واضحة تخدم المقارنة والهدايا الفاخرة.",
      categoryId: "watches",
      categoryName: "ساعات",
      price: 7590,
      variantKind: "color",
      tags: ["ساعة", "هدية"],
    },
    {
      key: "gift-jewel-box",
      name: "بوكس مجوهرات",
      description: "بوكس جاهز للهدية يرفع perception الرف الفاخر داخل المتجر.",
      categoryId: "gift-sets",
      categoryName: "هدايا",
      price: 2190,
      variantKind: "color",
      tags: ["بوكس", "هدية"],
    },
  ],
  carParts: [
    {
      key: "engine-oil",
      name: "زيت محرك",
      description: "زيت أساسي للطلبات المتكررة مع لزوجات واضحة للقرار السريع.",
      categoryId: "maintenance",
      categoryName: "صيانة",
      price: 780,
      variantKind: "techConfig",
      tags: ["زيت", "صيانة"],
    },
    {
      key: "air-filter",
      name: "فلتر هواء",
      description: "فلتر عملي للسيارات الشائعة مع رسالة توافق أوضح.",
      categoryId: "maintenance",
      categoryName: "صيانة",
      price: 420,
      variantKind: "none",
      tags: ["فلتر", "محرك"],
    },
    {
      key: "led-bulb",
      name: "لمبة LED",
      description: "حل إضاءة أسرع للواجهة مع upsell سهل أثناء التصفح.",
      categoryId: "lighting",
      categoryName: "إضاءة",
      price: 560,
      variantKind: "color",
      tags: ["LED", "إضاءة"],
    },
    {
      key: "detail-spray",
      name: "سبراي تنظيف",
      description: "منتج عناية بسيط للمقصورة أو الطلاء مع استخدام واضح.",
      categoryId: "detailing",
      categoryName: "تنظيف وتلميع",
      price: 320,
      variantKind: "none",
      tags: ["تنظيف", "لمعان"],
    },
    {
      key: "tire-inflator",
      name: "منفاخ إطارات",
      description: "إكسسوار عملي يضيف قيمة أعلى لرف السيارات والرحلات.",
      categoryId: "accessories",
      categoryName: "إكسسوارات",
      price: 1290,
      variantKind: "none",
      tags: ["إطارات", "رحلات"],
    },
  ],
  craftsStore: [
    {
      key: "ceramic-mug",
      name: "مج سيراميك",
      description: "قطعة يدوية بسيطة للهدية أو الاستخدام اليومي.",
      categoryId: "tableware",
      categoryName: "أدوات تقديم",
      price: 280,
      variantKind: "color",
      tags: ["مج", "يدوي"],
    },
    {
      key: "woven-basket",
      name: "سلة منسوجة",
      description: "سلة تخزين أو ديكور تضيف ملمسًا يدويًا للمتجر.",
      categoryId: "decor",
      categoryName: "ديكور وحرف",
      price: 420,
      variantKind: "color",
      tags: ["سلة", "منسوج"],
    },
    {
      key: "scented-candle",
      name: "شمعة حرفية",
      description: "شمعة يدوية برائحة هادئة ومناسبة للهدايا.",
      categoryId: "decor",
      categoryName: "ديكور وحرف",
      price: 350,
      variantKind: "beautySize",
      tags: ["شمعة", "هدية"],
    },
    {
      key: "serving-board",
      name: "لوح تقديم",
      description: "لوح خشبي بتفاصيل طبيعية يخدم المطبخ والهدية.",
      categoryId: "tableware",
      categoryName: "أدوات تقديم",
      price: 390,
      variantKind: "color",
      tags: ["لوح", "خشب"],
    },
    {
      key: "wall-hanging",
      name: "تعليقة حائط",
      description: "قطعة ديكور خفيفة ترفع الإحساس الفني داخل الصفحة.",
      categoryId: "decor",
      categoryName: "ديكور وحرف",
      price: 520,
      variantKind: "color",
      tags: ["ديكور", "حائط"],
    },
  ],
  groceryStore: [
    {
      key: "pantry-basket",
      name: "سلة بانتري",
      description: "مجموعة مختارة للبيت توفر قرار شراء جاهز وسريع.",
      categoryId: "pantry",
      categoryName: "بانتري",
      price: 540,
      variantKind: "none",
      tags: ["سلة", "بانتري"],
    },
    {
      key: "fruit-crate",
      name: "صندوق فاكهة",
      description: "تجميعة فواكه يومية بصورة طازجة وواضحة في القسم.",
      categoryId: "fresh",
      categoryName: "خضار وفاكهة",
      price: 310,
      variantKind: "none",
      tags: ["فاكهة", "طازج"],
    },
    {
      key: "cleaning-duo",
      name: "طقم تنظيف",
      description: "منتجان أساسيان للبيت يرفعان متوسط السلة بسهولة.",
      categoryId: "home-care",
      categoryName: "عناية منزلية",
      price: 260,
      variantKind: "none",
      tags: ["تنظيف", "منزل"],
    },
    {
      key: "spice-blend",
      name: "خلطة بهارات",
      description: "خلطة مطبخ جاهزة بطابع شرقي أو منزلي واضح.",
      categoryId: "pantry",
      categoryName: "بانتري",
      price: 95,
      variantKind: "none",
      tags: ["بهارات", "مطبخ"],
    },
    {
      key: "dairy-pack",
      name: "باك ألبان",
      description: "مجموعة أساسية للثلاجة والطلبات السريعة خلال الأسبوع.",
      categoryId: "refrigerated",
      categoryName: "تبريد وألبان",
      price: 185,
      variantKind: "none",
      tags: ["ألبان", "ثلاجة"],
    },
  ],
  digitalCourses: [
    {
      key: "automation-starter-course",
      name: "كورس Automation Starter",
      description: "مسار مبسط للمبتدئين مع نتائج عملية سريعة وواضحة.",
      categoryId: "courses",
      categoryName: "كورسات",
      price: 1490,
      variantKind: "digitalLicense",
      tags: ["Automation", "كورس"],
    },
    {
      key: "content-template-pack",
      name: "باك قوالب محتوى",
      description: "قوالب جاهزة تسرّع التنفيذ للفرق أو الـ creators.",
      categoryId: "templates",
      categoryName: "قوالب رقمية",
      price: 690,
      variantKind: "digitalLicense",
      tags: ["قوالب", "محتوى"],
    },
    {
      key: "live-workshop",
      name: "ورشة لايف",
      description: "تذكرة ورشة عملية مع وصول للمادة المسجلة بعد الحدث.",
      categoryId: "courses",
      categoryName: "كورسات",
      price: 890,
      variantKind: "digitalLicense",
      tags: ["ورشة", "تعلم"],
    },
    {
      key: "prompt-pack",
      name: "حزمة برومبتات",
      description: "مكتبة prompts مرتبة حسب الاستخدام وتوفر وقت التجارب.",
      categoryId: "templates",
      categoryName: "قوالب رقمية",
      price: 540,
      variantKind: "digitalLicense",
      tags: ["Templates", "Automation"],
    },
    {
      key: "pro-membership",
      name: "عضوية Pro",
      description: "وصول دوري للمحتوى الجديد والدعم والمواد التكميلية.",
      categoryId: "memberships",
      categoryName: "عضويات",
      price: 1290,
      variantKind: "digitalLicense",
      tags: ["عضوية", "Pro"],
    },
  ],
  web3Store: [
    {
      key: "genesis-pass",
      name: "Genesis Pass",
      description: "وصول مبكر وإسقاطات خاصة داخل المشروع أو المجتمع الرقمي.",
      categoryId: "access-passes",
      categoryName: "Passes",
      price: 2990,
      variantKind: "digitalLicense",
      tags: ["Web3", "Pass"],
    },
    {
      key: "avatar-pack",
      name: "Avatar Pack",
      description: "حزمة أفاتار رقمية بتدرجات وأساليب جاهزة للعرض.",
      categoryId: "collectibles",
      categoryName: "Collectibles",
      price: 1490,
      variantKind: "digitalLicense",
      tags: ["NFT", "Avatar"],
    },
    {
      key: "vault-key",
      name: "Vault Key",
      description: "مفتاح وصول لمحتوى أو مجتمع خاص مع tiers واضحة.",
      categoryId: "access-passes",
      categoryName: "Passes",
      price: 1990,
      variantKind: "digitalLicense",
      tags: ["Access", "Key"],
    },
    {
      key: "drop-badge",
      name: "Drop Badge",
      description: "شارة collectible خفيفة مناسبة للشراء الأول أو الهدية.",
      categoryId: "collectibles",
      categoryName: "Collectibles",
      price: 780,
      variantKind: "digitalLicense",
      tags: ["Badge", "Collectible"],
    },
    {
      key: "access-ticket",
      name: "Access Ticket",
      description: "تذكرة رقمية لحدث أو إسقاط خاص مع تفعيل مباشر.",
      categoryId: "access-passes",
      categoryName: "Passes",
      price: 990,
      variantKind: "digitalLicense",
      tags: ["Ticket", "Access"],
    },
  ],
  travelStore: [
    {
      key: "city-escape",
      name: "رحلة City Escape",
      description: "باقة قصيرة للهرب السريع مع تفاصيل حجز واضحة ومباشرة.",
      categoryId: "city-breaks",
      categoryName: "رحلات قصيرة",
      price: 5490,
      variantKind: "digitalLicense",
      tags: ["رحلة", "مدن"],
    },
    {
      key: "red-sea-weekend",
      name: "ويك إند بحر",
      description: "باقة شاطئية مختصرة مناسبة للأزواج أو الأصدقاء.",
      categoryId: "beach-trips",
      categoryName: "بحر ومصايف",
      price: 7290,
      variantKind: "digitalLicense",
      tags: ["بحر", "ويك إند"],
    },
    {
      key: "airport-transfer",
      name: "Airport Transfer",
      description: "خدمة تنقل مرتبة من وإلى المطار مع تسعير أوضح.",
      categoryId: "services",
      categoryName: "خدمات سفر",
      price: 890,
      variantKind: "digitalLicense",
      tags: ["مطار", "نقل"],
    },
    {
      key: "hotel-credit",
      name: "Hotel Credit",
      description: "رصيد حجز مرن للفنادق يسهّل قرار الحجز داخل الصفحة.",
      categoryId: "services",
      categoryName: "خدمات سفر",
      price: 1990,
      variantKind: "digitalLicense",
      tags: ["فندق", "رصيد"],
    },
    {
      key: "travel-itinerary",
      name: "Travel Itinerary",
      description: "خطة سفر مخصصة حسب الأيام والميزانية والاهتمامات.",
      categoryId: "planning",
      categoryName: "تخطيط",
      price: 690,
      variantKind: "digitalLicense",
      tags: ["Planning", "Travel"],
    },
  ],
  plantsStore: [
    {
      key: "monstera-home",
      name: "مونستيرا هوم",
      description: "نبتة داخلية واضحة الحضور تشتغل كمنتج بطل في الواجهة.",
      categoryId: "indoor-plants",
      categoryName: "نباتات داخلية",
      price: 690,
      variantKind: "none",
      tags: ["مونستيرا", "منزل"],
    },
    {
      key: "ceramic-planter",
      name: "أصيص سيراميك",
      description: "أصيص مرتب يرفع قيمة المنتجات النباتية ويضيف upsell طبيعي.",
      categoryId: "planters",
      categoryName: "أصص وإكسسوارات",
      price: 320,
      variantKind: "color",
      tags: ["أصيص", "ديكور"],
    },
    {
      key: "succulent-trio",
      name: "ثلاثي صبارات",
      description: "مجموعة صغيرة للهدايا والمكاتب والرفوف الخفيفة.",
      categoryId: "indoor-plants",
      categoryName: "نباتات داخلية",
      price: 540,
      variantKind: "none",
      tags: ["صبارات", "هدية"],
    },
    {
      key: "watering-can",
      name: "إبريق ري",
      description: "إكسسوار عملي يحسن تكوين السلة داخل فئة النبات.",
      categoryId: "tools",
      categoryName: "أدوات عناية",
      price: 260,
      variantKind: "color",
      tags: ["ري", "أداة"],
    },
    {
      key: "soil-care-kit",
      name: "طقم عناية تربة",
      description: "مجموعة أساسية للزراعة المنزلية والتبديل الدوري.",
      categoryId: "tools",
      categoryName: "أدوات عناية",
      price: 390,
      variantKind: "none",
      tags: ["تربة", "عناية"],
    },
  ],
};

const GENERATED_PREVIEW_FAMILY_BY_SECONDARY: Record<
  string,
  GeneratedPreviewFamily
> = {
  "mens-shoes": "menShoes",
  "womens-shoes": "womenShoes",
  "fashion-store": "fashionMixed",
  "luxury-fashion": "luxuryFashion",
  "womens-fashion": "womenFashion",
  accessories: "accessories",
  "mens-clothing": "menswear",
  "modest-fashion": "modestFashion",
  "resort-travelwear": "resortFashion",
  "occasion-eveningwear": "occasionFashion",
  "general-store": "generalStore",
  "multi-category": "generalStore",
  "premium-brand": "premiumBrand",
  "natural-products": "naturalProducts",
  restaurants: "restaurant",
  "mobile-store": "mobileStore",
  "tech-store": "techStore",
  electronics: "techStore",
  toys: "kidsStore",
  furniture: "furnitureStore",
  "pet-store": "petStore",
  "skincare-cosmetics": "beautyStore",
  bookstore: "bookStore",
  florist: "floristStore",
  "fitness-gear": "fitnessStore",
  "jewelry-watches": "luxuryStore",
  "jewelry-gifts": "luxuryStore",
  "car-parts": "carParts",
  "artisan-crafts": "craftsStore",
  "online-supermarket": "groceryStore",
  supermarket: "groceryStore",
  "courses-digital": "digitalCourses",
  web3: "web3Store",
  "travel-services": "travelStore",
  "home-garden": "plantsStore",
  "kids-toys": "babyStore",
};

const GENERATED_PREVIEW_FAMILY_BY_PRIMARY: Record<
  string,
  GeneratedPreviewFamily
> = {
  general: "generalStore",
  fashion: "fashionMixed",
  food: "restaurant",
  electronics: "techStore",
  kids: "kidsStore",
  digital: "digitalCourses",
  services: "travelStore",
  pets: "petStore",
  beauty: "beautyStore",
  books: "bookStore",
  gifts: "floristStore",
  sports: "fitnessStore",
  gaming: "techStore",
  luxury: "luxuryStore",
  automotive: "carParts",
  handmade: "craftsStore",
  grocery: "groceryStore",
  "plants-garden": "plantsStore",
  "baby-kids": "babyStore",
};

const GENERATED_PHYSICAL_REVIEW_COPY: Record<string, string[]> = {
  fashion: [
    "الخامة مرتبة جدًا والصورة مطابقة، والتفصيل طلع أنظف من المتوقع.",
    "المقاس كان واضح وسهل الاختيار، والتشطيب النهائي مريح في اللبس.",
  ],
  electronics: [
    "المواصفات موضحة بشكل ممتاز والمنتج وصل مطابق للصورة.",
    "التغليف مرتب وسهلت المقارنة بين النسخ قبل الشراء.",
  ],
  food: [
    "الطعم ممتاز والتقديم منظم فعلًا زي المعاينة.",
    "الخيار واضح على المنيو وسهل الإضافة مع الطلب الرئيسي.",
  ],
  beauty: [
    "القوام مريح والنتيجة سريعة، والوصف كان دقيق جدًا.",
    "التغليف شيك والمنتج مناسب كهدية أو استخدام يومي.",
  ],
  digital: [
    "الملف/الوصول كان مباشر والتنظيم واضح من أول خطوة.",
    "التجربة مرتبة والقيمة مقابل السعر واضحة جدًا.",
  ],
  services: [
    "تفاصيل الخدمة كانت واضحة وسهلة الحجز بدون لف.",
    "الخيارات مرتبة ووصلتني كل البيانات المطلوبة بسرعة.",
  ],
  default: [
    "الجودة ممتازة والوصف كان واضح جدًا قبل الشراء.",
    "التفاصيل مطابقة والصور ساعدت في اتخاذ القرار بسهولة.",
  ],
};

const THEME_IMAGE_VALUE_PATTERN = /\.(?:png|jpe?g|webp|svg)(?:\?.*)?$/i;
const GENERATED_PREVIEW_IMAGE_PLACEHOLDER_PATTERN =
  /\/preview\.(?:svg|png|jpe?g|webp)(?:\?.*)?$/i;

const GENERATED_WOMEN_SHOE_SIZES = ["37", "38", "39", "40"];
const GENERATED_MEN_SHOE_SIZES = ["41", "42", "43", "44"];
const GENERATED_APPAREL_SIZES = ["S", "M", "L", "XL"];

const GENERATED_FALLBACK_IMAGE = "/assets/themes/modern-minimal/preview.svg";

const GENERATED_THEME_IMAGE_KEYWORDS_BY_POOL_KEY: Record<string, string[]> = {
  menShoes: ["shoe", "sneaker", "loafer", "runner", "leather", "oxford"],
  "mens-shoes": ["shoe", "sneaker", "loafer", "runner", "leather", "oxford"],
  sneakers: ["sneaker", "trainer", "runner"],
  "running-daily": ["runner", "running", "trainer", "sneaker"],
  "casual-leather": ["shoe", "leather", "casual", "oxford", "loafer"],
  loafers: ["loafer", "shoe", "leather", "oxford"],
  "care-accessories": ["shoe", "leather", "loafer", "sneaker"],
  womenShoes: ["shoe", "sneaker", "heel", "pump", "sandal", "flat", "loafer"],
  "womens-shoes": [
    "shoe",
    "sneaker",
    "heel",
    "pump",
    "sandal",
    "flat",
    "loafer",
  ],
  "daily-sneakers": ["sneaker", "court", "trainer", "runner"],
  "soft-flats": ["flat", "ballerina", "ballet", "loafer"],
  "evening-heels": ["heel", "pump", "sling", "stiletto"],
  "open-sandals": ["sandal", "slide"],
};

const generatedPreviewImagePoolCache = new Map<string, string[]>();

const getMarketplacePreviewThemeDisplayNameInternal = (
  themeId: string,
): string =>
  GENERATED_PREVIEW_THEME_CATALOG_BY_ID[themeId]?.name ||
  STOREFRONT_THEME_PRESETS[themeId]?.name ||
  themeId;

const buildGeneratedPreviewGallery = (
  pool: string[],
  startIndex: number,
  size = 4,
): string[] => {
  const normalizedPool = pool.length > 0 ? pool : [GENERATED_FALLBACK_IMAGE];

  return Array.from(
    { length: size },
    (_, offset) =>
      normalizedPool[(startIndex + offset) % normalizedPool.length] ||
      normalizedPool[0]!,
  );
};

const buildGeneratedPreviewProductGallery = (
  pool: string[],
  startIndex: number,
  size = 4,
): string[] => {
  const normalizedPool = pool.length > 0 ? pool : [GENERATED_FALLBACK_IMAGE];

  if (size <= 1) {
    return [
      normalizedPool[startIndex % normalizedPool.length] ||
        GENERATED_FALLBACK_IMAGE,
    ];
  }

  return buildGeneratedPreviewGallery(normalizedPool, startIndex, size);
};

const rotateGeneratedPreviewGalleryAwayFromUsedCovers = (
  gallery: string[],
  usedCoverImages: Set<string>,
): string[] => {
  const normalizedGallery = normalizeGeneratedPreviewImageKeys(gallery);

  if (normalizedGallery.length <= 1) {
    return gallery;
  }

  const preferredStartIndex = normalizedGallery.findIndex(
    (image) => !usedCoverImages.has(image),
  );

  if (preferredStartIndex <= 0) {
    return gallery;
  }

  return buildGeneratedPreviewGallery(
    normalizedGallery,
    preferredStartIndex,
    gallery.length,
  );
};

const buildGeneratedVolumeDiscounts = (productId: string) => [
  {
    id: `${productId}-2plus`,
    minQuantity: 2,
    discountType: "percentage",
    discountValue: 5,
    label: "2+ قطع خصم 5%",
  },
  {
    id: `${productId}-3plus`,
    minQuantity: 3,
    discountType: "percentage",
    discountValue: 8,
    label: "3+ قطع خصم 8%",
  },
];

const normalizeGeneratedPreviewImageKeys = (
  values: Array<string | undefined>,
): string[] => {
  const seen = new Set<string>();

  return values
    .filter((value): value is string => Boolean(value))
    .filter((value) => {
      if (seen.has(value)) {
        return false;
      }

      seen.add(value);
      return true;
    });
};

const isWeakGeneratedPreviewImageCandidate = (value: string): boolean =>
  value.startsWith("/placeholders/") ||
  GENERATED_PREVIEW_IMAGE_PLACEHOLDER_PATTERN.test(value);

const resolveGeneratedPreviewImageKeys = (
  themeId: string,
  family: GeneratedPreviewFamily,
  product: GeneratedPreviewProductBlueprint,
): string[] => {
  const category = GENERATED_PREVIEW_THEME_CATALOG_BY_ID[themeId]?.category;

  return normalizeGeneratedPreviewImageKeys([
    product.categoryId,
    category?.secondary.id,
    family,
    category?.primary.id,
    "general",
  ]);
};

const resolveGeneratedPreviewProductImageKeys = (
  themeId: string,
  family: GeneratedPreviewFamily,
  product: GeneratedPreviewProductBlueprint,
): string[] => {
  const category = GENERATED_PREVIEW_THEME_CATALOG_BY_ID[themeId]?.category;
  const specificKeys = normalizeGeneratedPreviewImageKeys([
    product.categoryId,
    category?.secondary.id,
    family,
  ]);
  const specificPool = normalizeGeneratedPreviewImageKeys(
    specificKeys.flatMap((key) => GENERATED_PREVIEW_IMAGE_POOLS[key] || []),
  );

  if (specificPool.length >= 4) {
    return specificKeys;
  }

  return resolveGeneratedPreviewImageKeys(themeId, family, product);
};

const resolveGeneratedPreviewThemeKeywords = (imageKeys: string[]): string[] =>
  normalizeGeneratedPreviewImageKeys(
    imageKeys.flatMap(
      (key) => GENERATED_THEME_IMAGE_KEYWORDS_BY_POOL_KEY[key] || [],
    ),
  );

const collectThemePreviewImagePool = (
  themeId: string,
  options?: {
    preferredKeys?: string[];
    themeKeywords?: string[];
  },
): string[] => {
  const preferredKeys = normalizeGeneratedPreviewImageKeys(
    options?.preferredKeys || [],
  );
  const themeKeywords = normalizeGeneratedPreviewImageKeys(
    options?.themeKeywords || [],
  ).map((keyword) => keyword.toLowerCase());
  const cacheKey = `${themeId}::${preferredKeys.join(",")}::${themeKeywords.join(",")}`;
  const cached = generatedPreviewImagePoolCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const seen = new Set<string>();
  const themeMatches: string[] = [];
  const themeFallbacks: string[] = [];
  const fallbackPool = normalizeGeneratedPreviewImageKeys(
    preferredKeys.flatMap((key) => GENERATED_PREVIEW_IMAGE_POOLS[key] || []),
  );

  const addImage = (candidate: unknown) => {
    if (typeof candidate !== "string") {
      return;
    }

      const trimmed = candidate.trim();
      if (!trimmed) {
        return;
      }

      if (isWeakGeneratedPreviewImageCandidate(trimmed)) {
        return;
      }

      if (
        THEME_IMAGE_VALUE_PATTERN.test(trimmed) ||
      trimmed.startsWith("/assets/") ||
      trimmed.startsWith("/placeholders/") ||
      trimmed.startsWith("https://images.unsplash.com/")
    ) {
      if (seen.has(trimmed)) {
        return;
      }

      seen.add(trimmed);
      const normalizedCandidate = trimmed.toLowerCase();
      const matchesKeyword =
        themeKeywords.length === 0 ||
        themeKeywords.some((keyword) => normalizedCandidate.includes(keyword));

      if (matchesKeyword) {
        themeMatches.push(trimmed);
        return;
      }

      themeFallbacks.push(trimmed);
    }
  };

  const walk = (value: unknown) => {
    if (typeof value === "string") {
      addImage(value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }

    if (value && typeof value === "object") {
      Object.values(value as Record<string, unknown>).forEach(walk);
    }
  };

  walk(STOREFRONT_THEME_PRESETS[themeId]);
  addImage(GENERATED_PREVIEW_THEME_CATALOG_BY_ID[themeId]?.preview.imageUrl);

  const resolvedPool = normalizeGeneratedPreviewImageKeys(
    [
      ...fallbackPool,
      ...themeMatches,
      ...themeFallbacks,
      GENERATED_FALLBACK_IMAGE,
    ],
  );

  generatedPreviewImagePoolCache.set(cacheKey, resolvedPool);
  return resolvedPool;
};

const buildGeneratedPreviewVariants = (
  variantKind: GeneratedPreviewVariantKind,
  productId: string,
  skuPrefix: string,
  price: number,
  comparePrice: number,
  gallery: string[],
) => {
  switch (variantKind) {
    case "womenShoe":
      return buildColorSizeVariants(
        productId,
        skuPrefix,
        [
          { code: "pearl", label: "أبيض لؤلؤي", image: gallery[0]! },
          {
            code: "rose",
            label: "وردي هادئ",
            image: gallery[1] || gallery[0]!,
          },
          { code: "sand", label: "بيج رملي", image: gallery[2] || gallery[0]! },
        ],
        price,
        comparePrice,
        GENERATED_WOMEN_SHOE_SIZES,
      );
    case "menShoe":
      return buildColorSizeVariants(
        productId,
        skuPrefix,
        [
          { code: "graphite", label: "رمادي جرافيت", image: gallery[0]! },
          {
            code: "coal",
            label: "أسود فحمي",
            image: gallery[1] || gallery[0]!,
          },
          { code: "tan", label: "بني عسلي", image: gallery[2] || gallery[0]! },
        ],
        price,
        comparePrice,
        GENERATED_MEN_SHOE_SIZES,
      );
    case "womenApparel":
      return buildColorSizeVariants(
        productId,
        skuPrefix,
        [
          { code: "ivory", label: "أوف وايت", image: gallery[0]! },
          {
            code: "blush",
            label: "وردي هادئ",
            image: gallery[1] || gallery[0]!,
          },
          {
            code: "sage",
            label: "زيتي فاتح",
            image: gallery[2] || gallery[0]!,
          },
        ],
        price,
        comparePrice,
        GENERATED_APPAREL_SIZES,
      );
    case "mensApparel":
      return buildColorSizeVariants(
        productId,
        skuPrefix,
        [
          { code: "navy", label: "كحلي", image: gallery[0]! },
          { code: "stone", label: "رملي", image: gallery[1] || gallery[0]! },
        ],
        price,
        comparePrice,
        GENERATED_APPAREL_SIZES,
      );
    case "sizeGeneric":
      return buildSizeVariants(
        productId,
        skuPrefix,
        price,
        comparePrice,
        gallery[0]!,
        GENERATED_APPAREL_SIZES,
      );
    case "color":
      return buildColorVariants(
        productId,
        skuPrefix,
        [
          { code: "soft", label: "لون ناعم", image: gallery[0]! },
          { code: "deep", label: "لون داكن", image: gallery[1] || gallery[0]! },
          { code: "sand", label: "لون رملي", image: gallery[2] || gallery[0]! },
        ],
        price,
        comparePrice,
      );
    case "accessoryColor":
      return buildColorVariants(
        productId,
        skuPrefix,
        [
          { code: "taupe", label: "تاوب", image: gallery[0]! },
          { code: "berry", label: "عنابي", image: gallery[1] || gallery[0]! },
          { code: "black", label: "أسود", image: gallery[2] || gallery[0]! },
        ],
        price,
        comparePrice,
      );
    case "beautySize":
      return buildConfigVariants(productId, skuPrefix, gallery[0]!, [
        {
          code: "mini",
          label: "ميني",
          price: Math.max(60, Math.round(price * 0.65)),
          comparePrice: Math.max(75, Math.round(comparePrice * 0.7)),
          attributes: { الحجم: "ميني" },
        },
        {
          code: "std",
          label: "قياسي",
          price,
          comparePrice,
          attributes: { الحجم: "قياسي" },
        },
        {
          code: "set",
          label: "طقم",
          price: Math.round(price * 1.45),
          comparePrice: Math.round(comparePrice * 1.5),
          attributes: { الحجم: "طقم" },
        },
      ]);
    case "techConfig":
      return buildConfigVariants(productId, skuPrefix, gallery[0]!, [
        {
          code: "base",
          label: "Base",
          price,
          comparePrice,
          attributes: {
            الإصدار: "Base",
          },
        },
        {
          code: "plus",
          label: "Plus",
          price: Math.round(price * 1.12),
          comparePrice: Math.round(comparePrice * 1.1),
          attributes: {
            الإصدار: "Plus",
          },
        },
        {
          code: "pro",
          label: "Pro",
          price: Math.round(price * 1.24),
          comparePrice: Math.round(comparePrice * 1.18),
          attributes: {
            الإصدار: "Pro",
          },
        },
      ]);
    case "mobileConfig":
      return buildConfigVariants(productId, skuPrefix, gallery[0]!, [
        {
          code: "128",
          label: "128GB",
          price,
          comparePrice,
          attributes: {
            السعة: "128GB",
            اللون: "أسود",
          },
        },
        {
          code: "256",
          label: "256GB",
          price: Math.round(price * 1.1),
          comparePrice: Math.round(comparePrice * 1.08),
          attributes: {
            السعة: "256GB",
            اللون: "فضي",
          },
        },
      ]);
    case "digitalLicense":
      return buildConfigVariants(productId, skuPrefix, gallery[0]!, [
        {
          code: "starter",
          label: "Starter",
          price,
          comparePrice,
          attributes: {
            الوصول: "Starter",
          },
        },
        {
          code: "pro",
          label: "Pro",
          price: Math.round(price * 1.2),
          comparePrice: Math.round(comparePrice * 1.15),
          attributes: {
            الوصول: "Pro",
          },
        },
      ]);
    default:
      return [];
  }
};

const shouldUseGeneratedVolumeDiscounts = (
  variantKind: GeneratedPreviewVariantKind,
): boolean =>
  !["digitalLicense", "mobileConfig", "techConfig"].includes(variantKind);

const resolveGeneratedPreviewFamily = (
  themeId: string,
): GeneratedPreviewFamily => {
  const category = GENERATED_PREVIEW_THEME_CATALOG_BY_ID[themeId]?.category;
  const secondaryId = category?.secondary.id || "";
  const primaryId = category?.primary.id || "general";

  return (
    GENERATED_PREVIEW_FAMILY_BY_SECONDARY[secondaryId] ||
    GENERATED_PREVIEW_FAMILY_BY_PRIMARY[primaryId] ||
    "generalStore"
  );
};

const buildGeneratedPreviewProducts = (themeId: string): Product[] => {
  if (previewProductsByTheme[themeId]?.length) {
    return previewProductsByTheme[themeId];
  }

  const family = resolveGeneratedPreviewFamily(themeId);
  const blueprints = GENERATED_PREVIEW_BLUEPRINTS[family] || [];
  const usedCoverImages = new Set<string>();

  return blueprints.map((product, index) => {
    const productId = `${themeId}-${product.key}`;
    const comparePrice =
      product.comparePrice ?? Math.round(product.price * 1.15);
    const imageKeys = resolveGeneratedPreviewProductImageKeys(
      themeId,
      family,
      product,
    );
      const imagePool = collectThemePreviewImagePool(themeId, {
        preferredKeys: imageKeys,
        themeKeywords: resolveGeneratedPreviewThemeKeywords(imageKeys),
      });
      const gallery = rotateGeneratedPreviewGalleryAwayFromUsedCovers(
        buildGeneratedPreviewProductGallery(imagePool, 0),
        usedCoverImages,
      );
    const variantKind = product.variantKind || "none";
    const variants = buildGeneratedPreviewVariants(
      variantKind,
      productId,
      productId,
      product.price,
      comparePrice,
      gallery,
    );
    const mainImage = gallery[0];

    if (mainImage) {
      usedCoverImages.add(mainImage);
    }

    return {
      id: productId,
      slug: productId,
      name: product.name,
      description: product.description,
      price: product.price,
      comparePrice,
      images: gallery,
      mainImage,
      categoryId: product.categoryId,
      category: {
        id: product.categoryId,
        name: product.categoryName,
      },
      productVariants: variants,
      variants,
      stock: Math.max(3, 16 - index * 2),
      tags: product.tags || [],
      volumeDiscounts: shouldUseGeneratedVolumeDiscounts(variantKind)
        ? buildGeneratedVolumeDiscounts(productId)
        : [],
    } satisfies Product;
  });
};

const buildGeneratedPreviewRecommendations = (products: Product[]) => {
  const related: Record<string, string[]> = {};
  const boughtTogether: Record<string, string[]> = {};

  products.forEach((product) => {
    const sameCategory = products
      .filter(
        (candidate) =>
          candidate.id !== product.id &&
          candidate.categoryId === product.categoryId,
      )
      .map((candidate) => candidate.id);
    const differentCategory = products
      .filter(
        (candidate) =>
          candidate.id !== product.id &&
          candidate.categoryId !== product.categoryId,
      )
      .map((candidate) => candidate.id);

    related[product.id] = [...sameCategory, ...differentCategory].slice(0, 3);
    boughtTogether[product.id] = [...differentCategory, ...sameCategory].slice(
      0,
      3,
    );
  });

  return { related, boughtTogether };
};

const buildGeneratedPreviewReviewResponse = (
  themeId: string,
  product: Product,
  productIndex: number,
): MarketplacePreviewProductReviewsResponse => {
  const primaryId =
    GENERATED_PREVIEW_THEME_CATALOG_BY_ID[themeId]?.category.primary.id ||
    "general";
  const commentPool =
    GENERATED_PHYSICAL_REVIEW_COPY[primaryId] ||
    GENERATED_PHYSICAL_REVIEW_COPY.default;

  return buildMarketplacePreviewReviewsResponse([
    {
      id: `${product.id}-review-1`,
      author:
        GENERATED_PREVIEW_AUTHORS[
          productIndex % GENERATED_PREVIEW_AUTHORS.length
        ]!,
      date: "2026-04-24",
      createdAt: "2026-04-24T10:00:00.000Z",
      rating: 5,
      title: "تجربة ممتازة",
      comment: commentPool[0]!,
      verified: true,
      helpfulCount: 8,
    },
    {
      id: `${product.id}-review-2`,
      author:
        GENERATED_PREVIEW_AUTHORS[
          (productIndex + 1) % GENERATED_PREVIEW_AUTHORS.length
        ]!,
      date: "2026-04-19",
      createdAt: "2026-04-19T13:30:00.000Z",
      rating: 4,
      title: `راجعته قبل شراء ${getMarketplacePreviewThemeDisplayNameInternal(
        themeId,
      )}`,
      comment: commentPool[1]!,
      verified: true,
      helpfulCount: 4,
    },
  ]);
};

const buildGeneratedPreviewReviewMap = (themeId: string, products: Product[]) =>
  products.reduce<Record<string, MarketplacePreviewProductReviewsResponse>>(
    (accumulator, product, index) => {
      accumulator[product.id] = buildGeneratedPreviewReviewResponse(
        themeId,
        product,
        index,
      );
      return accumulator;
    },
    {},
  );

Object.keys(STOREFRONT_THEME_PRESETS).forEach((themeId) => {
  if (previewProductsByTheme[themeId]?.length) {
    return;
  }

  const generatedProducts = buildGeneratedPreviewProducts(themeId);
  if (generatedProducts.length === 0) {
    return;
  }

  const generatedRecommendations =
    buildGeneratedPreviewRecommendations(generatedProducts);

  previewProductsByTheme[themeId] = generatedProducts;
  previewRecommendationIdsByTheme[themeId] = generatedRecommendations;
  previewProductReviewsByTheme[themeId] = buildGeneratedPreviewReviewMap(
    themeId,
    generatedProducts,
  );
});

const normalizeSearch = (value: unknown): string =>
  String(value || "")
    .trim()
    .toLowerCase();

const getPreviewSearchParams = (): URLSearchParams | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search);
};

export const resolveMarketplacePreviewThemeId = (): string | null => {
  const params = getPreviewSearchParams();
  if (!params) {
    return null;
  }

  const previewSource = params.get("previewSource")?.trim();
  const previewTheme = params.get("previewTheme")?.trim();

  if (previewSource !== MARKETPLACE_PREVIEW_SOURCE || !previewTheme) {
    return null;
  }

  return previewProductsByTheme[previewTheme] ? previewTheme : null;
};

export const hasMarketplacePreviewDataset = (
  previewThemeId = resolveMarketplacePreviewThemeId(),
): boolean => Boolean(previewThemeId && previewProductsByTheme[previewThemeId]);

export const getMarketplacePreviewThemeDisplayName = (
  previewThemeId = resolveMarketplacePreviewThemeId(),
): string =>
  previewThemeId
    ? getMarketplacePreviewThemeDisplayNameInternal(previewThemeId)
    : "المتجر";

export const getMarketplacePreviewProducts = (
  params: ProductsParams = {},
  previewThemeId = resolveMarketplacePreviewThemeId(),
): {
  data: Product[];
  pagination: { total: number; page: number; limit: number; pages: number };
} | null => {
  if (!previewThemeId) {
    return null;
  }

  const baseProducts = previewProductsByTheme[previewThemeId] || [];
  const category = normalizeSearch(params.category);
  const search = normalizeSearch(params.search);
  const limit = Number(params.limit) > 0 ? Number(params.limit) : 12;
  const page = Number(params.page) > 0 ? Number(params.page) : 1;

  let filteredProducts = baseProducts.filter((product) => {
    if (category) {
      const categoryId = normalizeSearch(
        product.category?.id || product.categoryId,
      );
      const categoryName = normalizeSearch(product.category?.name);
      if (category !== categoryId && category !== categoryName) {
        return false;
      }
    }

    if (search) {
      const haystack = [
        product.name,
        product.description,
        product.category?.name,
      ]
        .map((value) => normalizeSearch(value))
        .join(" ");
      if (!haystack.includes(search)) {
        return false;
      }
    }

    return true;
  });

  const sortBy = normalizeSearch(params.sortBy);
  const sortOrder =
    normalizeSearch(params.sortOrder) === "desc" ? "desc" : "asc";

  if (sortBy === "price") {
    filteredProducts = [...filteredProducts].sort((left, right) =>
      sortOrder === "desc"
        ? right.price - left.price
        : left.price - right.price,
    );
  }

  const total = filteredProducts.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const pagedProducts = filteredProducts.slice(start, start + limit);

  return {
    data: pagedProducts,
    pagination: {
      total,
      page,
      limit,
      pages,
    },
  };
};

export const getMarketplacePreviewProduct = (
  idOrSlug: string,
  previewThemeId = resolveMarketplacePreviewThemeId(),
): Product | null => {
  if (!previewThemeId || !idOrSlug) {
    return null;
  }

  const needle = normalizeSearch(idOrSlug);
  return (
    previewProductsByTheme[previewThemeId]?.find(
      (product) =>
        normalizeSearch(product.id) === needle ||
        normalizeSearch(product.slug) === needle,
    ) || null
  );
};

export const getMarketplacePreviewCategories = (
  previewThemeId = resolveMarketplacePreviewThemeId(),
): Category[] | null => {
  if (!previewThemeId) {
    return null;
  }

  const products = previewProductsByTheme[previewThemeId] || [];
  const seen = new Map<string, Category>();

  products.forEach((product) => {
    const categoryId = product.category?.id || product.categoryId;
    const categoryName = product.category?.name;
    if (!categoryId || !categoryName || seen.has(categoryId)) {
      return;
    }

    seen.set(categoryId, {
      id: categoryId,
      name: categoryName,
      slug:
        typeof product.category?.slug === "string" &&
        product.category.slug.trim()
          ? product.category.slug.trim()
          : categoryId,
      description:
        typeof product.category?.description === "string" &&
        product.category.description.trim()
          ? product.category.description.trim()
          : `تصنيف معاينة ${categoryName}`,
      image:
        product.category?.image ||
        product.mainImage ||
        (Array.isArray(product.images) ? product.images[0] : undefined),
    });
  });

  return Array.from(seen.values());
};

export const getMarketplacePreviewRecommendations = (
  sourceIdOrSlug: string,
  kind: "related" | "boughtTogether",
  previewThemeId = resolveMarketplacePreviewThemeId(),
): Product[] | null => {
  if (!previewThemeId || !sourceIdOrSlug) {
    return null;
  }

  const products = previewProductsByTheme[previewThemeId] || [];
  const sourceProduct = getMarketplacePreviewProduct(
    sourceIdOrSlug,
    previewThemeId,
  );

  if (!sourceProduct) {
    return null;
  }

  const recommendationMap =
    previewRecommendationIdsByTheme[previewThemeId]?.[kind] || {};
  const recommendationIds =
    recommendationMap[sourceProduct.id] ||
    recommendationMap[sourceProduct.slug || ""] ||
    [];

  if (recommendationIds.length > 0) {
    return recommendationIds
      .map((candidateId) =>
        getMarketplacePreviewProduct(candidateId, previewThemeId),
      )
      .filter((candidate): candidate is Product =>
        Boolean(candidate && candidate.id !== sourceProduct.id),
      );
  }

  const sourceCategory = normalizeSearch(
    sourceProduct.category?.id || sourceProduct.categoryId,
  );
  const fallbackProducts = products.filter((product) => {
    if (product.id === sourceProduct.id) {
      return false;
    }

    const candidateCategory = normalizeSearch(
      product.category?.id || product.categoryId,
    );
    if (kind === "related") {
      return candidateCategory !== sourceCategory;
    }

    return true;
  });

  return fallbackProducts.slice(0, 3);
};

export const getMarketplacePreviewProductReviews = (
  productIdOrSlug: string,
  previewThemeId = resolveMarketplacePreviewThemeId(),
): MarketplacePreviewProductReviewsResponse | null => {
  if (!previewThemeId || !productIdOrSlug) {
    return null;
  }

  const sourceProduct = getMarketplacePreviewProduct(
    productIdOrSlug,
    previewThemeId,
  );
  if (!sourceProduct) {
    return null;
  }

  const themeReviews = previewProductReviewsByTheme[previewThemeId];
  if (!themeReviews) {
    return null;
  }

  return (
    themeReviews[sourceProduct.id] ||
    themeReviews[sourceProduct.slug || ""] ||
    null
  );
};
