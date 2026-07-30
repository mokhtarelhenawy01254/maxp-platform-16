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

const storefrontAsset = (themeId: string, file: string) =>
  `/assets/themes/${themeId}/${file}`;
const styleStoreAsset = (file: string) => storefrontAsset("style-store-eg", file);
const cutlineAsset = (file: string) => storefrontAsset("cutline-club", file);
const closetOsAsset = (file: string) => storefrontAsset("closet-os", file);

const legacyCategories = {
  watches: { id: "watches", name: "Watches", slug: "watches" },
  sneakers: { id: "sneakers", name: "Shoes", slug: "sneakers" },
  "sports-clothes": {
    id: "sports-clothes",
    name: "Clothes",
    slug: "sports-clothes",
  },
  bags: { id: "bags", name: "Bags", slug: "bags" },
  accessories: { id: "accessories", name: "Accessories", slug: "accessories" },
} as const;

const ART_DECO_WATCH_IMAGES = [
  styleStoreAsset("products/velvet-link-watch-1.jpg"),
  styleStoreAsset("products/velvet-link-watch-2.jpg"),
  styleStoreAsset("products/velvet-link-watch-3.png"),
];
const MINI_EDDY_WATCH_IMAGES = [
  styleStoreAsset("products/mono-sport-watch-1.jpg"),
  styleStoreAsset("products/mono-sport-watch-2.jpg"),
  styleStoreAsset("products/mono-sport-watch-3.png"),
];
const ECHO_COURT_IMAGES = [
  styleStoreAsset("products/urban-runner-1.jpg"),
  styleStoreAsset("products/urban-runner-2.jpg"),
  styleStoreAsset("products/urban-runner-3.png"),
];
const RUSH_LINE_IMAGES = [
  styleStoreAsset("products/street-line-1.jpg"),
  styleStoreAsset("products/street-line-2.png"),
  styleStoreAsset("products/street-line-3.jpg"),
];
const MOTION_TRACK_IMAGES = [
  cutlineAsset("products/set-midnight.jpg"),
  cutlineAsset("products/hoodie-rust.jpg"),
  cutlineAsset("products/overshirt-ink.jpg"),
];
const ZIP_LAYER_IMAGES = [
  closetOsAsset("products/weekend-capsule-ink.jpg"),
  closetOsAsset("products/slot-overshirt-graphite.jpg"),
  closetOsAsset("products/relay-tee-sand.jpg"),
];
const CITY_BUCKLE_IMAGES = [
  styleStoreAsset("products/amber-crossbody-1.jpg"),
  styleStoreAsset("products/amber-crossbody-2.jpg"),
  styleStoreAsset("products/mini-chain-bag-1.jpg"),
];
const SCULPT_MINI_IMAGES = [
  styleStoreAsset("products/mini-chain-bag-1.jpg"),
  styleStoreAsset("products/mini-chain-bag-2.jpg"),
  styleStoreAsset("products/amber-crossbody-2.jpg"),
];
const GIFT_STRAP_IMAGES = [
  styleStoreAsset("products/bracelet-gift-set-1.jpg"),
  styleStoreAsset("products/silk-print-scarf-1.jpg"),
  styleStoreAsset("products/silk-print-scarf-2.jpg"),
];

const rotateGallery = (gallery: string[], rotation = 0) =>
  gallery.map((_, index) => gallery[(index + rotation) % gallery.length]);

const buildProduct = ({
  id,
  slug,
  name,
  description,
  categoryKey,
  price,
  comparePrice,
  stock = 10,
  tags = [],
  images,
  variants = [],
  metadata,
  relatedProductIds = [],
  bundleProductIds = [],
}: {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryKey: keyof typeof legacyCategories;
  price: number;
  comparePrice?: number;
  stock?: number;
  tags?: string[];
  images: string[];
  variants?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
  relatedProductIds?: string[];
  bundleProductIds?: string[];
}): Product => {
  const category = legacyCategories[categoryKey];

  return {
    id,
    slug,
    name,
    description,
    price,
    comparePrice,
    images,
    imageUrl: images[0],
    mainImage: images[0],
    categoryId: category.id,
    category: {
      id: category.id,
      name: category.name,
    },
    stock,
    tags,
    relatedProductIds,
    bundleProductIds,
    productVariants: variants,
    variants,
    metadata,
    createdAt: "2026-04-26T18:00:00.000Z",
  };
};

const buildColorSizeVariants = (
  productId: string,
  skuPrefix: string,
  galleries: Record<string, string[]>,
  colors: Array<{ code: string; label: string }>,
  sizes: string[],
  price: number,
  comparePrice: number,
) =>
  colors.flatMap((color, colorIndex) =>
    sizes.map((size, sizeIndex) => {
      const gallery = galleries[color.code] || Object.values(galleries)[0] || [];

      return {
        id: `${productId}-${color.code}-${size}`,
        name: `${color.label} / ${size}`,
        price,
        comparePrice,
        sku: `${skuPrefix}-${color.code.toUpperCase()}-${size}`,
        image: gallery[0],
        images: gallery,
        stock: Math.max(2, 10 - colorIndex - sizeIndex),
        attributes: {
          Size: size,
          Color: color.label,
        },
        attributeValues: {
          Size: size,
          Color: color.label,
        },
      };
    }),
  );

const buildButtonColorPictureVariants = ({
  productId,
  skuPrefix,
  colors,
  sizes,
  styles,
  basePrice,
  baseComparePrice,
}: {
  productId: string;
  skuPrefix: string;
  colors: Array<{
    code: string;
    label: string;
    gallery: string[];
  }>;
  sizes: string[];
  styles: Array<{
    code: string;
    label: string;
    rotation: number;
  }>;
  basePrice: number;
  baseComparePrice: number;
}) =>
  sizes.flatMap((size, sizeIndex) =>
    colors.flatMap((color, colorIndex) =>
      styles.map((style, styleIndex) => {
        const gallery = rotateGallery(color.gallery, style.rotation);

        return {
          id: `${productId}-${size}-${color.code}-${style.code}`,
          name: `${size} / ${color.label} / ${style.label}`,
          price: basePrice + (sizeIndex === 1 ? 90 : 0),
          comparePrice: baseComparePrice + (sizeIndex === 1 ? 90 : 0),
          sku: `${skuPrefix}-${size.replace(/\s+/g, "")}-${color.code.toUpperCase()}-${style.code.toUpperCase()}`,
          image: gallery[0],
          images: gallery,
          stock: Math.max(2, 12 - sizeIndex - colorIndex - styleIndex),
          attributes: {
            Size: size,
            Color: color.label,
            Style: style.label,
          },
          attributeValues: {
            Size: size,
            Color: color.label,
            Style: style.label,
          },
        };
      }),
    ),
  );

const buildStrapColorVariants = (
  productId: string,
  skuPrefix: string,
  options: Array<{
    strap: string;
    colorCode: string;
    colorLabel: string;
    gallery: string[];
    price: number;
    comparePrice: number;
  }>,
) =>
  options.map((option, index) => ({
    id: `${productId}-${option.colorCode}-${option.strap.replace(/\s+/g, "-").toLowerCase()}`,
    name: `${option.strap} / ${option.colorLabel}`,
    price: option.price,
    comparePrice: option.comparePrice,
    sku: `${skuPrefix}-${option.colorCode.toUpperCase()}-${index + 1}`,
    image: option.gallery[0],
    images: option.gallery,
    stock: Math.max(2, 9 - index),
    attributes: {
      Strap: option.strap,
      Color: option.colorLabel,
    },
    attributeValues: {
      Strap: option.strap,
      Color: option.colorLabel,
    },
  }));

const ART_DECO_VARIANTS = buildButtonColorPictureVariants({
  productId: "art-deco-chrono",
  skuPrefix: "LDO-ART",
  colors: [
    { code: "gold", label: "Gold", gallery: ART_DECO_WATCH_IMAGES },
    { code: "silver", label: "Silver", gallery: rotateGallery(ART_DECO_WATCH_IMAGES, 1) },
    { code: "black", label: "Black", gallery: rotateGallery(ART_DECO_WATCH_IMAGES, 2) },
  ],
  sizes: ["36 MM", "40 MM"],
  styles: [
    { code: "sunburst", label: "Sunburst Dial", rotation: 0 },
    { code: "bracelet", label: "Bracelet Close-up", rotation: 1 },
    { code: "midnight", label: "Night Frame", rotation: 2 },
  ],
  basePrice: 1490,
  baseComparePrice: 1690,
});

const MINI_EDDY_VARIANTS = buildColorSizeVariants(
  "mini-eddy-track",
  "LDO-MINI",
  {
    black: MINI_EDDY_WATCH_IMAGES,
    olive: rotateGallery(MINI_EDDY_WATCH_IMAGES, 1),
    silver: rotateGallery(MINI_EDDY_WATCH_IMAGES, 2),
  },
  [
    { code: "black", label: "Black" },
    { code: "olive", label: "Olive" },
    { code: "silver", label: "Silver" },
  ],
  ["39 MM", "43 MM"],
  1280,
  1490,
);

const ECHO_COURT_VARIANTS = buildColorSizeVariants(
  "echo-court-runner",
  "LDO-ECHO",
  {
    ivory: ECHO_COURT_IMAGES,
    sand: rotateGallery(ECHO_COURT_IMAGES, 1),
    black: rotateGallery(ECHO_COURT_IMAGES, 2),
  },
  [
    { code: "ivory", label: "Ivory" },
    { code: "sand", label: "Sand" },
    { code: "black", label: "Black / Wine" },
  ],
  ["37", "38", "39", "40"],
  1990,
  2290,
);

const RUSH_LINE_VARIANTS = buildColorSizeVariants(
  "rush-line-sneaker",
  "LDO-RUSH",
  {
    white: RUSH_LINE_IMAGES,
    mocha: rotateGallery(RUSH_LINE_IMAGES, 1),
    stone: rotateGallery(RUSH_LINE_IMAGES, 2),
  },
  [
    { code: "white", label: "White Nude" },
    { code: "mocha", label: "Mocha" },
    { code: "stone", label: "Stone" },
  ],
  ["37", "38", "39", "40"],
  2140,
  2450,
);

const MOTION_TRACK_VARIANTS = buildButtonColorPictureVariants({
  productId: "motion-track-set",
  skuPrefix: "LDO-MOTION",
  colors: [
    { code: "midnight", label: "Midnight", gallery: MOTION_TRACK_IMAGES },
    { code: "sand", label: "Sand", gallery: rotateGallery(MOTION_TRACK_IMAGES, 1) },
  ],
  sizes: ["M", "L", "XL"],
  styles: [
    { code: "set", label: "Full Set", rotation: 0 },
    { code: "hoodie", label: "Hoodie Focus", rotation: 1 },
    { code: "texture", label: "Fabric Detail", rotation: 2 },
  ],
  basePrice: 1840,
  baseComparePrice: 2190,
});

const ZIP_LAYER_VARIANTS = buildColorSizeVariants(
  "zip-layer-set",
  "LDO-ZIP",
  {
    clay: ZIP_LAYER_IMAGES,
    ink: rotateGallery(ZIP_LAYER_IMAGES, 1),
    graphite: rotateGallery(ZIP_LAYER_IMAGES, 2),
  },
  [
    { code: "clay", label: "Clay" },
    { code: "ink", label: "Ink" },
    { code: "graphite", label: "Graphite" },
  ],
  ["M", "L", "XL"],
  1690,
  1980,
);

const CITY_BUCKLE_VARIANTS = buildStrapColorVariants("city-buckle-bag", "LDO-CITY", [
  {
    strap: "Crossbody",
    colorCode: "tan",
    colorLabel: "Tan",
    gallery: CITY_BUCKLE_IMAGES,
    price: 1320,
    comparePrice: 1550,
  },
  {
    strap: "Crossbody",
    colorCode: "black",
    colorLabel: "Black Gold",
    gallery: rotateGallery(CITY_BUCKLE_IMAGES, 1),
    price: 1320,
    comparePrice: 1550,
  },
  {
    strap: "Top Handle",
    colorCode: "cream",
    colorLabel: "Cream",
    gallery: rotateGallery(CITY_BUCKLE_IMAGES, 2),
    price: 1380,
    comparePrice: 1590,
  },
]);

const SCULPT_MINI_VARIANTS = buildStrapColorVariants("sculpt-mini-bag", "LDO-SCULPT", [
  {
    strap: "Chain",
    colorCode: "cream",
    colorLabel: "Cream",
    gallery: SCULPT_MINI_IMAGES,
    price: 1190,
    comparePrice: 1390,
  },
  {
    strap: "Chain",
    colorCode: "burgundy",
    colorLabel: "Burgundy",
    gallery: rotateGallery(SCULPT_MINI_IMAGES, 1),
    price: 1190,
    comparePrice: 1390,
  },
  {
    strap: "Wrist",
    colorCode: "black",
    colorLabel: "Black",
    gallery: rotateGallery(SCULPT_MINI_IMAGES, 2),
    price: 1240,
    comparePrice: 1450,
  },
]);

const GIFT_STRAP_VARIANTS = [
  {
    id: "gift-strap-set-gold",
    name: "Gold Set",
    price: 390,
    comparePrice: 490,
    sku: "LDO-GIFT-GOLD",
    image: GIFT_STRAP_IMAGES[0],
    images: GIFT_STRAP_IMAGES,
    stock: 9,
    attributes: {
      Color: "Gold",
    },
    attributeValues: {
      Color: "Gold",
    },
  },
  {
    id: "gift-strap-set-silver",
    name: "Silver Set",
    price: 390,
    comparePrice: 490,
    sku: "LDO-GIFT-SILVER",
    image: GIFT_STRAP_IMAGES[1],
    images: rotateGallery(GIFT_STRAP_IMAGES, 1),
    stock: 8,
    attributes: {
      Color: "Silver",
    },
    attributeValues: {
      Color: "Silver",
    },
  },
];

export const LEGACY_DEFAULT_OLD_PRODUCTS: Product[] = [
  buildProduct({
    id: "art-deco-chrono",
    slug: "art-deco-chrono",
    name: "Art Deco Chrono",
    description: [
      "<p>A dress watch direction built for direct product pages and quick decisions, with color-linked galleries instead of a single static image.</p>",
      "<h2>Materials</h2><p>Stainless steel case, polished links, mineral crystal, and a quick-release clasp for daily wear.</p>",
      "<h2>Dimensions</h2><p>36 MM or 40 MM case. Slim profile that fits both stacked looks and clean formal styling.</p>",
      "<h2>Care Instructions</h2><p>Wipe with a soft microfiber cloth and keep away from perfume or harsh cleaners.</p>",
    ].join(""),
    categoryKey: "watches",
    price: 1490,
    comparePrice: 1690,
    stock: 12,
    tags: ["New Arrival", "Watch", "Color gallery"],
    images: ART_DECO_WATCH_IMAGES,
    variants: ART_DECO_VARIANTS,
    metadata: {
      variantSettings: {
        styles: {
          Size: "buttons",
          Color: "circles",
          Style: "thumbnails",
        },
        attributeImages: {
          Style: {
            "Sunburst Dial": ART_DECO_WATCH_IMAGES[0],
            "Bracelet Close-up": ART_DECO_WATCH_IMAGES[1],
            "Night Frame": ART_DECO_WATCH_IMAGES[2],
          },
        },
      },
    },
    relatedProductIds: ["mini-eddy-track", "city-buckle-bag", "gift-strap-set"],
    bundleProductIds: ["gift-strap-set"],
  }),
  buildProduct({
    id: "mini-eddy-track",
    slug: "mini-eddy-track",
    name: "Mini Eddy Track",
    description: [
      "<p>A sportier watch option with a lighter presence and color-specific galleries for each finish.</p>",
      "<h2>Materials</h2><p>Soft-touch strap, durable case shell, and an easy-read face for daily rotation.</p>",
      "<h2>Dimensions</h2><p>39 MM or 43 MM size options with a lighter wrist feel.</p>",
      "<h2>Care Instructions</h2><p>Use a dry soft cloth after wear and avoid leaving the strap folded while stored.</p>",
    ].join(""),
    categoryKey: "watches",
    price: 1280,
    comparePrice: 1490,
    stock: 10,
    tags: ["Highest Rate", "Sport", "Gift"],
    images: MINI_EDDY_WATCH_IMAGES,
    variants: MINI_EDDY_VARIANTS,
    metadata: {
      variantSettings: {
        styles: {
          Size: "buttons",
          Color: "circles",
        },
      },
    },
    relatedProductIds: ["art-deco-chrono", "echo-court-runner", "gift-strap-set"],
    bundleProductIds: ["gift-strap-set"],
  }),
  buildProduct({
    id: "echo-court-runner",
    slug: "echo-court-runner",
    name: "Echo Court Runner",
    description:
      "<p>Clean sneaker styling with multiple photos for every colorway, so the product page changes as the shopper picks a finish.</p><h2>Materials</h2><p>Mixed upper with a cushioned sole and soft inner collar.</p><h2>Dimensions</h2><p>Standard women's fit across sizes 37 to 40.</p><h2>Care Instructions</h2><p>Spot clean with a damp cloth and air dry away from direct heat.</p>",
    categoryKey: "sneakers",
    price: 1990,
    comparePrice: 2290,
    stock: 8,
    tags: ["Shoes", "Street", "Most wanted"],
    images: ECHO_COURT_IMAGES,
    variants: ECHO_COURT_VARIANTS,
    metadata: {
      variantSettings: {
        styles: {
          Size: "buttons",
          Color: "circles",
        },
      },
    },
    relatedProductIds: ["rush-line-sneaker", "motion-track-set", "city-buckle-bag"],
    bundleProductIds: ["sculpt-mini-bag"],
  }),
  buildProduct({
    id: "rush-line-sneaker",
    slug: "rush-line-sneaker",
    name: "Rush Line Sneaker",
    description:
      "<p>A slightly dressier sneaker with enough gallery coverage to show the upper texture, side panel, and outsole look by color.</p><h2>Materials</h2><p>Layered synthetic upper, padded ankle, and flexible sole.</p><h2>Dimensions</h2><p>True-to-size profile across 37 to 40.</p><h2>Care Instructions</h2><p>Brush lightly after wear and store with paper filling to preserve the shape.</p>",
    categoryKey: "sneakers",
    price: 2140,
    comparePrice: 2450,
    stock: 7,
    tags: ["Shoes", "Clean look", "Quick buy"],
    images: RUSH_LINE_IMAGES,
    variants: RUSH_LINE_VARIANTS,
    metadata: {
      variantSettings: {
        styles: {
          Size: "buttons",
          Color: "circles",
        },
      },
    },
    relatedProductIds: ["echo-court-runner", "zip-layer-set", "sculpt-mini-bag"],
    bundleProductIds: ["city-buckle-bag"],
  }),
  buildProduct({
    id: "motion-track-set",
    slug: "motion-track-set",
    name: "Motion Track Set",
    description:
      "<p>A direct sports-clothes option built around matching sets, with thumbnails used for the specific look while size stays in buttons and color stays in swatches.</p><h2>Materials</h2><p>Soft brushed fleece with a structured outer face and a relaxed athletic cut.</p><h2>Dimensions</h2><p>M to XL fit with room for layering.</p><h2>Care Instructions</h2><p>Wash cold and hang dry to preserve the fleece finish.</p>",
    categoryKey: "sports-clothes",
    price: 1840,
    comparePrice: 2190,
    stock: 8,
    tags: ["Clothes", "Set", "Picture selector"],
    images: MOTION_TRACK_IMAGES,
    variants: MOTION_TRACK_VARIANTS,
    metadata: {
      variantSettings: {
        styles: {
          Size: "buttons",
          Color: "circles",
          Style: "thumbnails",
        },
        attributeImages: {
          Style: {
            "Full Set": MOTION_TRACK_IMAGES[0],
            "Hoodie Focus": MOTION_TRACK_IMAGES[1],
            "Fabric Detail": MOTION_TRACK_IMAGES[2],
          },
        },
      },
    },
    relatedProductIds: ["zip-layer-set", "echo-court-runner", "city-buckle-bag"],
    bundleProductIds: ["gift-strap-set"],
  }),
  buildProduct({
    id: "zip-layer-set",
    slug: "zip-layer-set",
    name: "Zip Layer Set",
    description:
      "<p>Easy layering pieces for the clothes collection with multiple photos tied to each colorway and size combination.</p><h2>Materials</h2><p>Mid-weight outer fabric with a cleaner structured handfeel.</p><h2>Dimensions</h2><p>Regular fit from M to XL.</p><h2>Care Instructions</h2><p>Steam lightly and store flat after wash for a cleaner front shape.</p>",
    categoryKey: "sports-clothes",
    price: 1690,
    comparePrice: 1980,
    stock: 7,
    tags: ["Clothes", "Layering", "Best seller"],
    images: ZIP_LAYER_IMAGES,
    variants: ZIP_LAYER_VARIANTS,
    metadata: {
      variantSettings: {
        styles: {
          Size: "buttons",
          Color: "circles",
        },
      },
    },
    relatedProductIds: ["motion-track-set", "rush-line-sneaker", "sculpt-mini-bag"],
    bundleProductIds: ["city-buckle-bag"],
  }),
  buildProduct({
    id: "city-buckle-bag",
    slug: "city-buckle-bag",
    name: "City Buckle Bag",
    description:
      "<p>A compact day bag with different galleries for each strap and color setup, giving the PDP a clearer bag view without repeating the original reference images.</p><h2>Materials</h2><p>Structured shell, smooth finish, and light metallic hardware.</p><h2>Dimensions</h2><p>Fits phone, mini wallet, and everyday essentials.</p><h2>Care Instructions</h2><p>Keep inside the dust bag and avoid rough surfaces on the front panel.</p>",
    categoryKey: "bags",
    price: 1320,
    comparePrice: 1550,
    stock: 6,
    tags: ["Bag", "Crossbody", "Daily"],
    images: CITY_BUCKLE_IMAGES,
    variants: CITY_BUCKLE_VARIANTS,
    metadata: {
      variantSettings: {
        styles: {
          Strap: "buttons",
          Color: "circles",
        },
      },
    },
    relatedProductIds: ["sculpt-mini-bag", "art-deco-chrono", "motion-track-set"],
    bundleProductIds: ["gift-strap-set"],
  }),
  buildProduct({
    id: "sculpt-mini-bag",
    slug: "sculpt-mini-bag",
    name: "Sculpt Mini Bag",
    description:
      "<p>A smaller bag option with chain and wrist carry directions, mapped to new local images so the last theme no longer reads as a direct copy.</p><h2>Materials</h2><p>Smooth finish outer shell, light structure, and compact inner space.</p><h2>Dimensions</h2><p>Fits essentials for short outings and quick styling edits.</p><h2>Care Instructions</h2><p>Store upright and avoid overfilling to preserve the side shape.</p>",
    categoryKey: "bags",
    price: 1190,
    comparePrice: 1390,
    stock: 6,
    tags: ["Bag", "Mini", "Night out"],
    images: SCULPT_MINI_IMAGES,
    variants: SCULPT_MINI_VARIANTS,
    metadata: {
      variantSettings: {
        styles: {
          Strap: "buttons",
          Color: "circles",
        },
      },
    },
    relatedProductIds: ["city-buckle-bag", "rush-line-sneaker", "art-deco-chrono"],
    bundleProductIds: ["gift-strap-set"],
  }),
  buildProduct({
    id: "gift-strap-set",
    slug: "gift-strap-set",
    name: "Gift Strap Set",
    description:
      "<p>A small add-on that works as a bundle with watches and bags, useful for keeping the legacy theme's related-products flow busy.</p><h2>Materials</h2><p>Mixed metal and woven accents with a light card-ready pack.</p><h2>Dimensions</h2><p>Compact add-on size built for gifting or bundle attachment.</p><h2>Care Instructions</h2><p>Store in a dry pouch and avoid moisture between wears.</p>",
    categoryKey: "accessories",
    price: 390,
    comparePrice: 490,
    stock: 9,
    tags: ["Gift", "Accessory", "Bundle"],
    images: GIFT_STRAP_IMAGES,
    variants: GIFT_STRAP_VARIANTS,
    metadata: {
      variantSettings: {
        styles: {
          Color: "circles",
        },
      },
    },
    relatedProductIds: ["art-deco-chrono", "mini-eddy-track", "city-buckle-bag"],
    bundleProductIds: [],
  }),
];

export const LEGACY_DEFAULT_OLD_RECOMMENDATIONS = {
  related: {
    "art-deco-chrono": ["mini-eddy-track", "city-buckle-bag", "gift-strap-set"],
    "mini-eddy-track": ["art-deco-chrono", "echo-court-runner", "gift-strap-set"],
    "echo-court-runner": ["rush-line-sneaker", "motion-track-set", "city-buckle-bag"],
    "rush-line-sneaker": ["echo-court-runner", "zip-layer-set", "sculpt-mini-bag"],
    "motion-track-set": ["zip-layer-set", "echo-court-runner", "city-buckle-bag"],
    "zip-layer-set": ["motion-track-set", "rush-line-sneaker", "sculpt-mini-bag"],
    "city-buckle-bag": ["sculpt-mini-bag", "art-deco-chrono", "motion-track-set"],
    "sculpt-mini-bag": ["city-buckle-bag", "art-deco-chrono", "rush-line-sneaker"],
    "gift-strap-set": ["art-deco-chrono", "mini-eddy-track", "city-buckle-bag"],
  },
  boughtTogether: {
    "art-deco-chrono": ["gift-strap-set", "city-buckle-bag"],
    "mini-eddy-track": ["gift-strap-set", "sculpt-mini-bag"],
    "echo-court-runner": ["motion-track-set", "city-buckle-bag"],
    "rush-line-sneaker": ["zip-layer-set", "sculpt-mini-bag"],
    "motion-track-set": ["echo-court-runner", "city-buckle-bag"],
    "zip-layer-set": ["rush-line-sneaker", "sculpt-mini-bag"],
    "city-buckle-bag": ["gift-strap-set", "art-deco-chrono"],
    "sculpt-mini-bag": ["gift-strap-set", "rush-line-sneaker"],
    "gift-strap-set": ["art-deco-chrono", "city-buckle-bag"],
  },
} as const;

const reviewMedia = (url: string, alt: string) => [
  {
    type: "image" as const,
    url,
    alt,
  },
];

export const LEGACY_DEFAULT_OLD_REVIEWS: Record<
  string,
  MarketplacePreviewProductReviewsResponse
> = {
  "art-deco-chrono": buildMarketplacePreviewReviewsResponse([
    {
      id: "art-deco-review-1",
      author: "Mariam Adel",
      date: "2026-04-24",
      createdAt: "2026-04-24T11:10:00.000Z",
      rating: 5,
      title: "Looks sharper in hand",
      comment:
        "Picked the gold color and the gallery really helped. The watch looked cleaner in person and the 36 MM size sat perfectly.",
      verified: true,
      helpfulCount: 18,
      media: reviewMedia(ART_DECO_WATCH_IMAGES[0], "Art Deco gold review"),
    },
    {
      id: "art-deco-review-2",
      author: "Nour Yasser",
      date: "2026-04-23",
      createdAt: "2026-04-23T15:45:00.000Z",
      rating: 5,
      comment:
        "I switched between black and silver before ordering. Seeing different photos for each color made the choice easier.",
      verified: true,
      helpfulCount: 12,
    },
    {
      id: "art-deco-review-3",
      author: "Aya Mostafa",
      date: "2026-04-20",
      createdAt: "2026-04-20T09:35:00.000Z",
      rating: 4,
      comment:
        "Good finish and nice weight. I went with the 40 MM because I like a stronger wrist presence.",
      verified: true,
      helpfulCount: 9,
    },
    {
      id: "art-deco-review-4",
      author: "Salma Tarek",
      date: "2026-04-18",
      createdAt: "2026-04-18T17:40:00.000Z",
      rating: 5,
      comment:
        "The bracelet close-up option was exactly what convinced me. Packaging was neat and delivery was smooth.",
      verified: true,
      helpfulCount: 11,
    },
    {
      id: "art-deco-review-5",
      author: "Farah Hatem",
      date: "2026-04-15",
      createdAt: "2026-04-15T13:20:00.000Z",
      rating: 4,
      comment:
        "Very elegant for gifting. I only wish the clasp had a slightly firmer snap, but overall I'm happy.",
      verified: true,
      helpfulCount: 7,
    },
    {
      id: "art-deco-review-6",
      author: "Lina Mohamed",
      date: "2026-04-12",
      createdAt: "2026-04-12T10:05:00.000Z",
      rating: 5,
      comment:
        "The Sunburst Dial and the gold finish together looked premium. The review photos matched the product well.",
      verified: true,
      helpfulCount: 10,
    },
  ]),
  "mini-eddy-track": buildMarketplacePreviewReviewsResponse([
    {
      id: "mini-eddy-review-1",
      author: "Sara Wael",
      date: "2026-04-24",
      createdAt: "2026-04-24T09:20:00.000Z",
      rating: 5,
      comment: "Very easy to wear daily and the olive tone looked exactly like the page.",
      verified: true,
      helpfulCount: 14,
    },
    {
      id: "mini-eddy-review-2",
      author: "Dina Saad",
      date: "2026-04-21",
      createdAt: "2026-04-21T18:00:00.000Z",
      rating: 4,
      comment: "Light on the wrist and good for everyday outfits. The extra photos helped with the strap feel.",
      verified: true,
      helpfulCount: 8,
    },
    {
      id: "mini-eddy-review-3",
      author: "Heba Khaled",
      date: "2026-04-20",
      createdAt: "2026-04-20T08:55:00.000Z",
      rating: 5,
      comment: "Black finish is the safest pick. Good value for the price point.",
      verified: true,
      helpfulCount: 6,
    },
    {
      id: "mini-eddy-review-4",
      author: "Ghada Ali",
      date: "2026-04-17",
      createdAt: "2026-04-17T12:30:00.000Z",
      rating: 4,
      comment: "Delivery was on time and the face was clear enough in daylight.",
      verified: true,
      helpfulCount: 5,
    },
    {
      id: "mini-eddy-review-5",
      author: "Rana Samir",
      date: "2026-04-14",
      createdAt: "2026-04-14T16:10:00.000Z",
      rating: 5,
      comment: "Silver looked better than expected and didn't feel too bright on hand.",
      verified: true,
      helpfulCount: 7,
    },
  ]),
  "echo-court-runner": buildMarketplacePreviewReviewsResponse([
    {
      id: "echo-court-review-1",
      author: "Maha Fawzy",
      date: "2026-04-23",
      createdAt: "2026-04-23T14:15:00.000Z",
      rating: 5,
      comment: "Comfortable from the first wear and the Ivory color looked clean without being too bright.",
      verified: true,
      helpfulCount: 13,
      media: reviewMedia(ECHO_COURT_IMAGES[0], "Echo Court review"),
    },
    {
      id: "echo-court-review-2",
      author: "Basma Nabil",
      date: "2026-04-22",
      createdAt: "2026-04-22T11:45:00.000Z",
      rating: 4,
      comment: "The Sand version was the right call. I liked that the gallery changed with the color instantly.",
      verified: true,
      helpfulCount: 9,
    },
    {
      id: "echo-court-review-3",
      author: "Reem Fouad",
      date: "2026-04-19",
      createdAt: "2026-04-19T09:05:00.000Z",
      rating: 5,
      comment: "True to size and the sole feels stable for long outings.",
      verified: true,
      helpfulCount: 8,
    },
    {
      id: "echo-court-review-4",
      author: "Yomna Hassan",
      date: "2026-04-16",
      createdAt: "2026-04-16T18:25:00.000Z",
      rating: 4,
      comment: "Black / Wine looked slightly darker than I expected, but the finish is very wearable.",
      verified: true,
      helpfulCount: 6,
    },
    {
      id: "echo-court-review-5",
      author: "Doaa Adel",
      date: "2026-04-13",
      createdAt: "2026-04-13T12:10:00.000Z",
      rating: 5,
      comment: "One of the easier online sneaker buys because the page gave enough angles before checkout.",
      verified: true,
      helpfulCount: 11,
    },
  ]),
  "rush-line-sneaker": buildMarketplacePreviewReviewsResponse([
    {
      id: "rush-line-review-1",
      author: "Rasha Omar",
      date: "2026-04-24",
      createdAt: "2026-04-24T13:10:00.000Z",
      rating: 5,
      comment: "The Mocha color is strong and the side profile looked exactly like the listing.",
      verified: true,
      helpfulCount: 9,
    },
    {
      id: "rush-line-review-2",
      author: "Hagar Ahmed",
      date: "2026-04-20",
      createdAt: "2026-04-20T10:45:00.000Z",
      rating: 4,
      comment: "Looks a little elevated compared to regular sneakers, which is why I picked it.",
      verified: true,
      helpfulCount: 7,
    },
    {
      id: "rush-line-review-3",
      author: "Nadine Emad",
      date: "2026-04-18",
      createdAt: "2026-04-18T15:05:00.000Z",
      rating: 5,
      comment: "White Nude turned out versatile and easy to style.",
      verified: true,
      helpfulCount: 5,
    },
    {
      id: "rush-line-review-4",
      author: "Nesma Reda",
      date: "2026-04-14",
      createdAt: "2026-04-14T08:30:00.000Z",
      rating: 4,
      comment: "Good shape and finish. I would buy again in another color.",
      verified: true,
      helpfulCount: 4,
    },
  ]),
  "motion-track-set": buildMarketplacePreviewReviewsResponse([
    {
      id: "motion-track-review-1",
      author: "Habiba Salah",
      date: "2026-04-24",
      createdAt: "2026-04-24T12:00:00.000Z",
      rating: 5,
      comment: "The picture selector made sense here. I could compare the full set with the hoodie close-up before ordering.",
      verified: true,
      helpfulCount: 10,
      media: reviewMedia(MOTION_TRACK_IMAGES[0], "Motion Track review"),
    },
    {
      id: "motion-track-review-2",
      author: "Rim Abdullah",
      date: "2026-04-21",
      createdAt: "2026-04-21T17:50:00.000Z",
      rating: 5,
      comment: "Midnight color looked premium and the XL still kept a clean silhouette.",
      verified: true,
      helpfulCount: 7,
    },
    {
      id: "motion-track-review-3",
      author: "Noha Ibrahim",
      date: "2026-04-17",
      createdAt: "2026-04-17T14:20:00.000Z",
      rating: 4,
      comment: "Warm enough for evening outings and easy to layer.",
      verified: true,
      helpfulCount: 5,
    },
    {
      id: "motion-track-review-4",
      author: "Amal Safwat",
      date: "2026-04-13",
      createdAt: "2026-04-13T11:35:00.000Z",
      rating: 4,
      comment: "I liked the fabric detail image because it showed the texture honestly.",
      verified: true,
      helpfulCount: 6,
    },
  ]),
  "zip-layer-set": buildMarketplacePreviewReviewsResponse([
    {
      id: "zip-layer-review-1",
      author: "Jana Fathy",
      date: "2026-04-22",
      createdAt: "2026-04-22T13:05:00.000Z",
      rating: 5,
      comment: "Graphite color was the most practical and the gallery helped confirm the finish.",
      verified: true,
      helpfulCount: 8,
    },
    {
      id: "zip-layer-review-2",
      author: "Mayar Mahmoud",
      date: "2026-04-18",
      createdAt: "2026-04-18T09:50:00.000Z",
      rating: 4,
      comment: "Looks structured without feeling heavy.",
      verified: true,
      helpfulCount: 5,
    },
    {
      id: "zip-layer-review-3",
      author: "Asmaa Hossam",
      date: "2026-04-15",
      createdAt: "2026-04-15T16:40:00.000Z",
      rating: 5,
      comment: "Ink worked best for me and the size buttons were easy to use.",
      verified: true,
      helpfulCount: 6,
    },
    {
      id: "zip-layer-review-4",
      author: "Rania Saleh",
      date: "2026-04-12",
      createdAt: "2026-04-12T10:20:00.000Z",
      rating: 4,
      comment: "Solid value and good outfit option for casual days.",
      verified: true,
      helpfulCount: 3,
    },
  ]),
  "city-buckle-bag": buildMarketplacePreviewReviewsResponse([
    {
      id: "city-buckle-review-1",
      author: "Yara Saeed",
      date: "2026-04-24",
      createdAt: "2026-04-24T18:10:00.000Z",
      rating: 5,
      comment: "Tan looked very close to the page and the extra bag angles made me trust the order more.",
      verified: true,
      helpfulCount: 9,
      media: reviewMedia(CITY_BUCKLE_IMAGES[0], "City Buckle review"),
    },
    {
      id: "city-buckle-review-2",
      author: "Laila Fares",
      date: "2026-04-20",
      createdAt: "2026-04-20T12:15:00.000Z",
      rating: 4,
      comment: "Practical size and the strap selector made sense on mobile too.",
      verified: true,
      helpfulCount: 5,
    },
    {
      id: "city-buckle-review-3",
      author: "Rita George",
      date: "2026-04-17",
      createdAt: "2026-04-17T08:30:00.000Z",
      rating: 5,
      comment: "Cream looked softer than expected in a good way.",
      verified: true,
      helpfulCount: 4,
    },
    {
      id: "city-buckle-review-4",
      author: "Hind Gamal",
      date: "2026-04-14",
      createdAt: "2026-04-14T14:40:00.000Z",
      rating: 4,
      comment: "A good everyday bag. I liked that the hardware was visible in one of the images.",
      verified: true,
      helpfulCount: 4,
    },
  ]),
  "sculpt-mini-bag": buildMarketplacePreviewReviewsResponse([
    {
      id: "sculpt-mini-review-1",
      author: "Mona Helmy",
      date: "2026-04-23",
      createdAt: "2026-04-23T17:00:00.000Z",
      rating: 5,
      comment: "Burgundy felt richer than expected and the chain version looked great at night.",
      verified: true,
      helpfulCount: 8,
    },
    {
      id: "sculpt-mini-review-2",
      author: "Nardine Ashraf",
      date: "2026-04-19",
      createdAt: "2026-04-19T11:10:00.000Z",
      rating: 4,
      comment: "Small but enough for the basics. The wrist option is the reason I picked this one.",
      verified: true,
      helpfulCount: 5,
    },
    {
      id: "sculpt-mini-review-3",
      author: "Malak Sabry",
      date: "2026-04-16",
      createdAt: "2026-04-16T10:25:00.000Z",
      rating: 5,
      comment: "Cream is the easiest to style and the second image showed the size well.",
      verified: true,
      helpfulCount: 4,
    },
    {
      id: "sculpt-mini-review-4",
      author: "Lujain Adel",
      date: "2026-04-13",
      createdAt: "2026-04-13T09:15:00.000Z",
      rating: 4,
      comment: "Good little event bag and the black option looked sharper in person.",
      verified: true,
      helpfulCount: 3,
    },
  ]),
  "gift-strap-set": buildMarketplacePreviewReviewsResponse([
    {
      id: "gift-strap-review-1",
      author: "Mervat Sami",
      date: "2026-04-22",
      createdAt: "2026-04-22T18:00:00.000Z",
      rating: 5,
      comment: "Useful add-on with watches and surprisingly neat packaging.",
      verified: true,
      helpfulCount: 4,
    },
    {
      id: "gift-strap-review-2",
      author: "Wesam Fathy",
      date: "2026-04-17",
      createdAt: "2026-04-17T13:10:00.000Z",
      rating: 4,
      comment: "Simple but adds value to the order, especially for gifting.",
      verified: true,
      helpfulCount: 3,
    },
  ]),
};
