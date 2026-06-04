import type { Product } from "../hooks/useProducts";
import { ELESSI_PACK_THEME_IDS } from "../themes/elessiPack";

export type ElessiPreviewCartSeed = {
  productIdOrSlug: string;
  quantity: number;
  variantId?: string;
  attributes?: Record<string, string>;
};

export type ElessiPreviewOrderProfileSeed = {
  orderNumber: string;
  phone: string;
  customerName: string;
  paymentMethod: "cod" | "card" | "wallet";
  status: string;
  shippingAddress: {
    governorate: string;
    city: string;
    street: string;
    address: string;
    addressLine1: string;
  };
};

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

type CategorySeed = {
  id: string;
  name: string;
  slug: string;
};

type VariantSeed =
  | {
      kind: "none";
    }
  | {
      kind: "color";
      skuPrefix: string;
      options: Array<{
        code: string;
        label: string;
        price?: number;
        comparePrice?: number;
      }>;
    }
  | {
      kind: "size";
      skuPrefix: string;
      options: Array<{
        code: string;
        label: string;
        price?: number;
        comparePrice?: number;
      }>;
    }
  | {
      kind: "config";
      skuPrefix: string;
      options: Array<{
        code: string;
        label: string;
        price?: number;
        comparePrice?: number;
        attributes: Record<string, string>;
      }>;
    };

type ProductSeed = {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryKey: string;
  price: number;
  comparePrice?: number;
  stock?: number;
  tags?: string[];
  variantSeed?: VariantSeed;
  [key: string]: any;
};

type ThemePreviewSeed = {
  themeId: string;
  galleryPool: string[];
  reviewFrame: {
    firstTitle: string;
    firstLead: string;
    secondTitle: string;
    secondLead: string;
  };
  orderProfile: ElessiPreviewOrderProfileSeed;
  cartSeeds: ElessiPreviewCartSeed[];
  categories: Record<string, CategorySeed>;
  products: ProductSeed[];
};

type ThemePreviewBundle = {
  products: Product[];
  recommendations: {
    related: Record<string, string[]>;
    boughtTogether: Record<string, string[]>;
  };
  reviews: Record<string, MarketplacePreviewProductReviewsResponse>;
  cartSeeds: ElessiPreviewCartSeed[];
  orderProfile: ElessiPreviewOrderProfileSeed;
};

const REVIEW_AUTHORS = [
  "سارة خالد",
  "مريم سامح",
  "محمد هشام",
  "نهى عادل",
  "عمر طارق",
  "ياسمين فؤاد",
  "ندى وائل",
  "أحمد بهجت",
] as const;

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

const buildUnsplashImage = (photoId: string, width = 1200) =>
  `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&q=80`;

const buildGallery = (pool: string[], startIndex: number) =>
  [0, 1, 2, 3].map((offset) => pool[(startIndex + offset) % pool.length]!);

const buildColorVariants = (
  productId: string,
  skuPrefix: string,
  basePrice: number,
  baseComparePrice: number,
  gallery: string[],
  options: Array<{
    code: string;
    label: string;
    price?: number;
    comparePrice?: number;
  }>,
) =>
  options.map((option, optionIndex) => ({
    id: `${productId}-${option.code}`,
    name: option.label,
    price: option.price ?? basePrice,
    comparePrice: option.comparePrice ?? baseComparePrice,
    sku: `${skuPrefix}-${option.code.toUpperCase()}`,
    image: gallery[optionIndex % gallery.length],
    stock: Math.max(2, 9 - optionIndex),
    attributes: {
      "اللون": option.label,
    },
    attributeValues: {
      "اللون": option.label,
    },
  }));

const buildSizeVariants = (
  productId: string,
  skuPrefix: string,
  basePrice: number,
  baseComparePrice: number,
  gallery: string[],
  options: Array<{
    code: string;
    label: string;
    price?: number;
    comparePrice?: number;
  }>,
) =>
  options.map((option, optionIndex) => ({
    id: `${productId}-${option.code}`,
    name: option.label,
    price: option.price ?? basePrice,
    comparePrice: option.comparePrice ?? baseComparePrice,
    sku: `${skuPrefix}-${option.code.toUpperCase()}`,
    image: gallery[optionIndex % gallery.length],
    stock: Math.max(2, 10 - optionIndex),
    attributes: {
      "الحجم": option.label,
    },
    attributeValues: {
      "الحجم": option.label,
    },
  }));

const buildConfigVariants = (
  productId: string,
  skuPrefix: string,
  basePrice: number,
  baseComparePrice: number,
  gallery: string[],
  options: Array<{
    code: string;
    label: string;
    price?: number;
    comparePrice?: number;
    attributes: Record<string, string>;
  }>,
) =>
  options.map((option, optionIndex) => ({
    id: `${productId}-${option.code}`,
    name: option.label,
    price: option.price ?? basePrice,
    comparePrice: option.comparePrice ?? baseComparePrice,
    sku: `${skuPrefix}-${option.code.toUpperCase()}`,
    image: gallery[optionIndex % gallery.length],
    stock: Math.max(2, 8 - optionIndex),
    attributes: option.attributes,
    attributeValues: option.attributes,
  }));

const buildVolumeDiscounts = (productId: string) => [
  {
    id: `${productId}-duo-save`,
    minQuantity: 2,
    maxQuantity: 2,
    discountType: "percentage" as const,
    discountValue: 5,
  },
  {
    id: `${productId}-stack-save`,
    minQuantity: 3,
    maxQuantity: null,
    discountType: "percentage" as const,
    discountValue: 8,
  },
];

const buildVariantPayload = (
  productId: string,
  basePrice: number,
  comparePrice: number,
  gallery: string[],
  variantSeed?: VariantSeed,
) => {
  if (!variantSeed || variantSeed.kind === "none") {
    return [];
  }

  if (variantSeed.kind === "color") {
    return buildColorVariants(
      productId,
      variantSeed.skuPrefix,
      basePrice,
      comparePrice,
      gallery,
      variantSeed.options,
    );
  }

  if (variantSeed.kind === "size") {
    return buildSizeVariants(
      productId,
      variantSeed.skuPrefix,
      basePrice,
      comparePrice,
      gallery,
      variantSeed.options,
    );
  }

  return buildConfigVariants(
    productId,
    variantSeed.skuPrefix,
    basePrice,
    comparePrice,
    gallery,
    variantSeed.options,
  );
};

const buildReviewPair = (
  theme: ThemePreviewSeed,
  product: ProductSeed,
  productIndex: number,
) =>
  buildMarketplacePreviewReviewsResponse([
    {
      id: `${product.id}-review-1`,
      author: REVIEW_AUTHORS[productIndex % REVIEW_AUTHORS.length]!,
      date: `2026-04-${String(10 + productIndex).padStart(2, "0")}`,
      createdAt: `2026-04-${String(10 + productIndex).padStart(2, "0")}`,
      rating: 5,
      title: theme.reviewFrame.firstTitle,
      comment: `${theme.reviewFrame.firstLead} ${product.name} وكان وصف المقاس أو المواصفة واضحًا من أول نظرة.`,
      verified: true,
      helpfulCount: 6 + productIndex,
    },
    {
      id: `${product.id}-review-2`,
      author:
        REVIEW_AUTHORS[(productIndex + 3) % REVIEW_AUTHORS.length] ||
        REVIEW_AUTHORS[0],
      date: `2026-04-${String(18 + productIndex).padStart(2, "0")}`,
      createdAt: `2026-04-${String(18 + productIndex).padStart(2, "0")}`,
      rating: 4,
      title: theme.reviewFrame.secondTitle,
      comment: `${theme.reviewFrame.secondLead} ${product.name} وخلّت قرار الشراء أسرع داخل صفحة المنتج.`,
      verified: true,
      helpfulCount: 3 + productIndex,
    },
  ]);

const buildThemePreviewBundle = (theme: ThemePreviewSeed): ThemePreviewBundle => {
  const baseProducts = theme.products.map((product, productIndex) => {
    const {
      id,
      slug,
      name,
      description,
      categoryKey,
      price,
      comparePrice: seededComparePrice,
      stock,
      tags,
      variantSeed,
      images: seededImages,
      mainImage: seededMainImage,
      ...productMetadata
    } = product;
    const category = theme.categories[product.categoryKey];
    const images =
      Array.isArray(seededImages) && seededImages.length > 0
        ? seededImages
        : buildGallery(theme.galleryPool, productIndex);
    const mainImage =
      typeof seededMainImage === "string" && seededMainImage.trim()
        ? seededMainImage
        : images[0];
    const comparePrice = seededComparePrice ?? price;
    const variants = buildVariantPayload(
      id,
      price,
      comparePrice,
      images,
      variantSeed,
    );

    return {
      id,
      slug,
      name,
      description,
      price,
      comparePrice,
      images,
      imageUrl: mainImage,
      mainImage,
      categoryId: category?.id || categoryKey,
      category: {
        id: category?.id || categoryKey,
        name: category?.name || categoryKey,
      },
      stock: stock ?? 9,
      tags: tags || [],
      productVariants: variants,
      variants,
      volumeDiscounts: buildVolumeDiscounts(product.id),
      createdAt: "2026-04-26T12:00:00.000Z",
      ...productMetadata,
    } satisfies Product;
  });

  const related: Record<string, string[]> = {};
  const boughtTogether: Record<string, string[]> = {};

  baseProducts.forEach((product, productIndex) => {
    const relatedIds = [1, 2, 3]
      .map((offset) => baseProducts[(productIndex + offset) % baseProducts.length]!.id)
      .filter((candidateId) => candidateId !== product.id)
      .slice(0, 3);
    const boughtTogetherIds = [2, 4]
      .map((offset) => baseProducts[(productIndex + offset) % baseProducts.length]!.id)
      .filter((candidateId) => candidateId !== product.id)
      .slice(0, 2);

    related[product.id] = relatedIds;
    boughtTogether[product.id] = boughtTogetherIds;
  });

  const products = baseProducts.map((product) => ({
    ...product,
    relatedProductIds: related[product.id] || [],
    bundleProductIds: boughtTogether[product.id] || [],
  }));

  const reviews = Object.fromEntries(
    theme.products.map((product, productIndex) => [
      product.id,
      buildReviewPair(theme, product, productIndex),
    ]),
  );

  return {
    products,
    recommendations: {
      related,
      boughtTogether,
    },
    reviews,
    cartSeeds: theme.cartSeeds,
    orderProfile: theme.orderProfile,
  };
};

const SIGNAL_DECK_GALLERIES = {
  "signal-slate-14": [
    "/assets/themes/pc-hub-eg/workbook-14-air.jpg",
    "/assets/themes/pc-hub-eg/hero-photo.jpg",
    "/assets/themes/pc-hub-eg/quadview-27-qhd.jpg",
    buildUnsplashImage("1496181133206-80ce9b88a853"),
  ],
  "signal-creator-pad": [
    "/assets/themes/pc-hub-eg/creator-pro-16.jpg",
    buildUnsplashImage("1496181133206-80ce9b88a853"),
    "/assets/themes/pc-hub-eg/creator-pro-16.jpg",
    buildUnsplashImage("1516321318423-f06f85e504b3"),
  ],
  "signal-mech-board": [
    "/assets/themes/pc-hub-eg/mechboard-pro.jpg",
    "/assets/themes/pc-hub-eg/mechboard-pro.jpg",
    buildUnsplashImage("1516321318423-f06f85e504b3"),
    "/assets/themes/pc-hub-eg/mechboard-pro.jpg",
  ],
  "signal-gan-hub": [
    "/assets/themes/pc-hub-eg/dockstation-9in1.jpg",
    "/assets/themes/pc-hub-eg/dockstation-9in1.jpg",
    buildUnsplashImage("1511467687858-23d96c32e4ae"),
    "/assets/themes/pc-hub-eg/hero-photo.jpg",
  ],
  "signal-stand-pro": [
    buildUnsplashImage("1516321318423-f06f85e504b3"),
    "/assets/themes/pc-hub-eg/quadview-27-qhd.jpg",
    buildUnsplashImage("1496181133206-80ce9b88a853"),
    "/assets/themes/pc-hub-eg/hero-photo.jpg",
  ],
  "signal-wireless-mouse": [
    "/assets/themes/pc-hub-eg/precision-mouse-lite.jpg",
    "/assets/themes/pc-hub-eg/precision-mouse-lite.jpg",
    buildUnsplashImage("1516321318423-f06f85e504b3"),
    "/assets/themes/pc-hub-eg/precision-mouse-lite.jpg",
  ],
} as const;

const ELESSI_BAG_MEDIA = {
  tote: "/assets/themes/elessi-carry-lane/tote.jpg",
  toteAlt: "/assets/themes/elessi-carry-lane/tote-alt.jpg",
  sylvie: "/assets/themes/elessi-carry-lane/sylvie.jpg",
  sylvieAlt: "/assets/themes/elessi-carry-lane/sylvie-alt.jpg",
  marmont: "/assets/themes/elessi-carry-lane/marmont.jpg",
  marmontAlt: "/assets/themes/elessi-carry-lane/marmont-alt.jpg",
  ophidia: "/assets/themes/elessi-carry-lane/ophidia.jpg",
  ophidiaAlt: "/assets/themes/elessi-carry-lane/ophidia-alt.jpg",
  dionysus: "/assets/themes/elessi-carry-lane/dionysus.jpg",
  dionysusAlt: "/assets/themes/elessi-carry-lane/dionysus-alt.jpg",
  greenlandZip: "/assets/themes/elessi-carry-lane/greenland-zip.jpg",
  greenlandZipAlt: "/assets/themes/elessi-carry-lane/greenland-zip-alt.jpg",
  highCoast: "/assets/themes/elessi-carry-lane/high-coast.jpg",
  highCoastAlt: "/assets/themes/elessi-carry-lane/high-coast-alt.jpg",
  rucksack: "/assets/themes/elessi-carry-lane/rucksack.jpg",
  rucksackAlt: "/assets/themes/elessi-carry-lane/rucksack-alt.jpg",
  coastTrail: "/assets/themes/elessi-carry-lane/coast-trail.jpg",
  coastTrailAlt: "/assets/themes/elessi-carry-lane/coast-trail-alt.jpg",
} as const;

const ELESSI_COSMETIC_MEDIA = {
  mascara: "/assets/themes/elessi-glow-routine/mascara.jpg",
  lipstickYouth: "/assets/themes/elessi-glow-routine/lipstick-youth.jpg",
  lipstickSeductive: "/assets/themes/elessi-glow-routine/lipstick-seductive.jpg",
  lipstickRomantic: "/assets/themes/elessi-glow-routine/lipstick-romantic.jpg",
  brush: "/assets/themes/elessi-glow-routine/brush-chalk.jpg",
  lipstickNoble: "/assets/themes/elessi-glow-routine/lipstick-noble.jpg",
  lipstickNobleAlt: "/assets/themes/elessi-glow-routine/lipstick-noble-alt.jpg",
  beautyFlatlayA: "/assets/themes/elessi-glow-routine/flatlay-a.jpg",
  beautyFlatlayB: "/assets/themes/elessi-glow-routine/flatlay-b.jpg",
  beautyFlatlayC: "/assets/themes/elessi-glow-routine/flatlay-c.jpg",
  beautyWorkA: "/assets/themes/elessi-glow-routine/work-a.jpg",
  beautyWorkB: "/assets/themes/elessi-glow-routine/work-b.jpg",
} as const;

const ELESSI_HARVEST_MEDIA = {
  heroMarket: "/assets/themes/elessi-harvest-fold/hero-market.jpg",
  crateDetail: "/assets/themes/elessi-harvest-fold/crate-detail.jpg",
  fruitCrate: "/assets/themes/elessi-harvest-fold/fruit-crate.jpg",
  breakfastJar: "/assets/themes/elessi-harvest-fold/breakfast-jar.jpg",
  herbBundle: "/assets/themes/elessi-harvest-fold/herb-bundle.jpg",
  dateSyrup: "/assets/themes/elessi-harvest-fold/date-syrup.jpg",
  pantryCloseup: "/assets/themes/elessi-harvest-fold/pantry-closeup.jpg",
} as const;

const ELESSI_SPROUT_MEDIA = {
  heroAloeStage: "/assets/themes/elessi-sprout-room/hero-aloe-stage.jpg",
  monsteraStage: "/assets/themes/elessi-sprout-room/monstera-stage.jpg",
  deskBonsai: "/assets/themes/elessi-sprout-room/desk-bonsai.jpg",
  giftBonsaiCard: "/assets/themes/elessi-sprout-room/gift-bonsai-card.jpg",
  succulentLedge: "/assets/themes/elessi-sprout-room/succulent-ledge.jpg",
  succulentMacro: "/assets/themes/elessi-sprout-room/succulent-macro.jpg",
} as const;

const ELESSI_PEDAL_MEDIA = {
  heroCityStage: "/assets/themes/elessi-pedal-lab/hero-city-stage.jpg",
  cityBikePortrait: "/assets/themes/elessi-pedal-lab/city-bike-portrait.jpg",
  cityWheelDetail: "/assets/themes/elessi-pedal-lab/city-wheel-detail.jpg",
  pelotonStage: "/assets/themes/elessi-pedal-lab/peloton-stage.jpg",
  pelotonPortrait: "/assets/themes/elessi-pedal-lab/peloton-portrait.jpg",
  helmetCrop: "/assets/themes/elessi-pedal-lab/helmet-crop.jpg",
  blackBikePortrait: "/assets/themes/elessi-pedal-lab/black-bike-portrait.jpg",
  blackBikeDetail: "/assets/themes/elessi-pedal-lab/black-bike-detail.jpg",
  trailForestStage: "/assets/themes/elessi-pedal-lab/trail-forest-stage.jpg",
  trailForestPortrait: "/assets/themes/elessi-pedal-lab/trail-forest-portrait.jpg",
} as const;

const ELESSI_CHRONO_MEDIA = {
  heroWatchCloseup: "/assets/themes/elessi-chrono-gallery/hero-watch-closeup.jpg",
  giftSuitWatch: "/assets/themes/elessi-chrono-gallery/gift-suit-watch.jpg",
  watchDialBlue: "/assets/themes/elessi-chrono-gallery/watch-dial-blue.jpg",
  watchStrapBrown: "/assets/themes/elessi-chrono-gallery/watch-strap-brown.jpg",
  strapCloseupWatch: "/assets/themes/elessi-chrono-gallery/strap-closeup-watch.jpg",
  giftBraceletSet: "/assets/themes/elessi-chrono-gallery/gift-bracelet-set.jpg",
  watchProductFront: "/assets/themes/elessi-chrono-gallery/watch-product-front.png",
  watchWristGold: "/assets/themes/elessi-chrono-gallery/watch-wrist-gold.jpg",
} as const;

const ELESSI_GARAGE_MEDIA = {
  oilBottles: "/assets/themes/elessi-garage-fit/oil-bottles.jpg",
  airFilterCloseup: "/assets/themes/elessi-garage-fit/air-filter-closeup.jpg",
  headlightBulb: "/assets/themes/elessi-garage-fit/headlight-bulb.jpg",
  seatInterior: "/assets/themes/elessi-garage-fit/seat-interior.jpg",
  engineBay: "/assets/themes/elessi-garage-fit/engine-bay.jpg",
} as const;

const ELESSI_GEM_MEDIA = {
  jewelryBoxAssortment: "/assets/themes/elessi-gem-atelier/jewelry-box-assortment.jpg",
  ringBoxMinimal: "/assets/themes/elessi-gem-atelier/ring-box-minimal.jpg",
  diamondRingOpenBox: "/assets/themes/elessi-gem-atelier/diamond-ring-open-box.jpg",
  heartNecklaceBox: "/assets/themes/elessi-gem-atelier/heart-necklace-box.jpg",
  pearlNecklaceBox: "/assets/themes/elessi-gem-atelier/pearl-necklace-box.jpg",
  braceletBoxTurquoise: "/assets/themes/elessi-gem-atelier/bracelet-box-turquoise.jpg",
  signatureHoops: "/assets/themes/elessi-gem-atelier/signet-ring.jpg",
  earringsTable: "/assets/themes/elessi-gem-atelier/earrings-table.jpg",
} as const;

const ELESSI_TAIL_MEDIA = {
  playDog: "/assets/themes/elessi-tail-supply/play-dog.jpg",
  carePet: "/assets/themes/elessi-tail-supply/care-pet.jpg",
  dogFoodBowl: "/assets/themes/elessi-tail-supply/dog-food-bowl.jpg",
  dogFoodTray: "/assets/themes/elessi-tail-supply/dog-food-tray.jpg",
  softBedReal: "/assets/themes/elessi-tail-supply/soft-bed-real.jpg",
  walkLeashReal: "/assets/themes/elessi-tail-supply/walk-leash-real.jpg",
  walkDog: "/assets/themes/elessi-tail-supply/walk-dog.jpg",
} as const;

const THEME_PREVIEW_SEEDS: ThemePreviewSeed[] = [
  {
    themeId: "elessi-carry-lane",
    galleryPool: [
      ELESSI_BAG_MEDIA.tote,
      ELESSI_BAG_MEDIA.sylvie,
      ELESSI_BAG_MEDIA.marmont,
      ELESSI_BAG_MEDIA.ophidia,
      ELESSI_BAG_MEDIA.greenlandZip,
      ELESSI_BAG_MEDIA.highCoast,
    ],
    reviewFrame: {
      firstTitle: "الشكل طلع عملي فعلًا",
      firstLead: "الواجهة سهلت عليا اختيار",
      secondTitle: "الخامات واضحة في الصور",
      secondLead: "تفاصيل الشنطة أو الإضافة كانت مفهومة في",
    },
    orderProfile: {
      orderNumber: "CLN-2048",
      phone: "01071000001",
      customerName: "عميلة Carry Lane",
      paymentMethod: "card",
      status: "PROCESSING",
      shippingAddress: {
        governorate: "القاهرة",
        city: "مصر الجديدة",
        street: "شارع بغداد 18",
        address: "شارع بغداد 18، مصر الجديدة، القاهرة",
        addressLine1: "شارع بغداد 18",
      },
    },
    cartSeeds: [
      {
        productIdOrSlug: "carry-commute-tote",
        quantity: 1,
        variantId: "carry-commute-tote-sand",
        attributes: {
          "اللون": "بيج رملي",
        },
      },
      {
        productIdOrSlug: "carry-weekend-duffel",
        quantity: 1,
        variantId: "carry-weekend-duffel-olive",
        attributes: {
          "اللون": "زيتي هادئ",
        },
      },
      {
        productIdOrSlug: "carry-signature-belt",
        quantity: 1,
        variantId: "carry-signature-belt-90",
        attributes: {
          "الحجم": "90 سم",
        },
      },
    ],
    categories: {
      daily: { id: "daily-bags", name: "حقائب يومية", slug: "daily-bags" },
      travel: { id: "travel-bags", name: "سفر وتنقل", slug: "travel-bags" },
      gifts: { id: "gift-picks", name: "هدايا راقية", slug: "gift-picks" },
      addons: { id: "wallets-belts", name: "محافظ وأحزمة", slug: "wallets-belts" },
    },
    products: [
      {
        id: "carry-commute-tote",
        slug: "carry-commute-tote",
        name: "Carry Totepack Daily",
        description: "توْت يومي يقرأ كواجهة حقائب حقيقية: صورة نظيفة، مقاس واضح، ومسار أسرع للاستخدام اليومي.",
        categoryKey: "daily",
        price: 1890,
        comparePrice: 2190,
        tags: ["الأكثر طلبًا", "حقيبة يومية"],
        mainImage: ELESSI_BAG_MEDIA.tote,
        images: [
          ELESSI_BAG_MEDIA.tote,
          ELESSI_BAG_MEDIA.toteAlt,
          ELESSI_BAG_MEDIA.sylvie,
          ELESSI_BAG_MEDIA.greenlandZip,
        ],
        variantSeed: {
          kind: "color",
          skuPrefix: "CL-TOTE",
          options: [
            { code: "sand", label: "بيج رملي" },
            { code: "espresso", label: "بني إسبريسو" },
            { code: "ivory", label: "أوف وايت" },
          ],
        },
      },
      {
        id: "carry-weekend-duffel",
        slug: "carry-weekend-duffel",
        name: "Carry Marmont Weekend",
        description: "موديل سفر أوضح في الصورة والحجم، يعرض المنتج من أول لقطة بدون زحام إضافي.",
        categoryKey: "travel",
        price: 2460,
        comparePrice: 2790,
        tags: ["سفر", "دَفّل"],
        mainImage: ELESSI_BAG_MEDIA.marmont,
        images: [
          ELESSI_BAG_MEDIA.marmont,
          ELESSI_BAG_MEDIA.marmontAlt,
          ELESSI_BAG_MEDIA.highCoast,
          ELESSI_BAG_MEDIA.coastTrail,
        ],
        variantSeed: {
          kind: "color",
          skuPrefix: "CL-DUFFEL",
          options: [
            { code: "olive", label: "زيتي هادئ" },
            { code: "stone", label: "رمادي ستوني" },
            { code: "noir", label: "أسود ناعم" },
          ],
        },
      },
      {
        id: "carry-mini-gift-bag",
        slug: "carry-mini-gift-bag",
        name: "Carry Sylvie Mini",
        description: "قطعة هدية أصغر لكنها أوضح بصريًا، لتخدم مسار الإهداء بدون الصور المتعارضة التي كانت موجودة قبلًا.",
        categoryKey: "gifts",
        price: 1320,
        comparePrice: 1540,
        tags: ["هدايا", "ميني"],
        mainImage: ELESSI_BAG_MEDIA.sylvie,
        images: [
          ELESSI_BAG_MEDIA.sylvie,
          ELESSI_BAG_MEDIA.sylvieAlt,
          ELESSI_BAG_MEDIA.ophidia,
          ELESSI_BAG_MEDIA.ophidiaAlt,
        ],
        variantSeed: {
          kind: "color",
          skuPrefix: "CL-MINI",
          options: [
            { code: "rose", label: "وردي هادئ" },
            { code: "cream", label: "كريمي" },
            { code: "black", label: "أسود لامع" },
          ],
        },
      },
      {
        id: "carry-slim-wallet",
        slug: "carry-slim-wallet",
        name: "Carry Dionysus Wallet",
        description: "إضافة جلدية أوضح من السابق، تعمل كقطعة مكملة للسلة بدل صورة خارجة عن روح الثيم.",
        categoryKey: "addons",
        price: 590,
        comparePrice: 720,
        tags: ["محفظة", "إضافة"],
        mainImage: ELESSI_BAG_MEDIA.dionysus,
        images: [
          ELESSI_BAG_MEDIA.dionysus,
          ELESSI_BAG_MEDIA.dionysusAlt,
          ELESSI_BAG_MEDIA.sylvie,
          ELESSI_BAG_MEDIA.toteAlt,
        ],
        variantSeed: {
          kind: "color",
          skuPrefix: "CL-WALLET",
          options: [
            { code: "tan", label: "جملي" },
            { code: "black", label: "أسود" },
          ],
        },
      },
      {
        id: "carry-luggage-cubes",
        slug: "carry-luggage-cubes",
        name: "Carry Greenland Zip",
        description: "مسار سفر أخف وشخصية أوضح للقسم، بدل تدوير نفس الصور بين السفر والإضافات.",
        categoryKey: "travel",
        price: 780,
        comparePrice: 930,
        tags: ["تنظيم", "سفر"],
        mainImage: ELESSI_BAG_MEDIA.greenlandZip,
        images: [
          ELESSI_BAG_MEDIA.greenlandZip,
          ELESSI_BAG_MEDIA.greenlandZipAlt,
          ELESSI_BAG_MEDIA.rucksack,
          ELESSI_BAG_MEDIA.tote,
        ],
        variantSeed: {
          kind: "size",
          skuPrefix: "CL-CUBES",
          options: [
            { code: "set-3", label: "طقم 3 قطع" },
            { code: "set-5", label: "طقم 5 قطع", price: 960, comparePrice: 1120 },
          ],
        },
      },
      {
        id: "carry-signature-belt",
        slug: "carry-signature-belt",
        name: "Carry High Coast Pack",
        description: "قطعة خفيفة تكمل اليومي والسفر، وتحافظ على عائلة صور واحدة بدل اختلافات غير مقصودة داخل نفس الثيم.",
        categoryKey: "addons",
        price: 710,
        comparePrice: 860,
        tags: ["حزام", "جلد"],
        mainImage: ELESSI_BAG_MEDIA.highCoast,
        images: [
          ELESSI_BAG_MEDIA.highCoast,
          ELESSI_BAG_MEDIA.highCoastAlt,
          ELESSI_BAG_MEDIA.rucksack,
          ELESSI_BAG_MEDIA.rucksackAlt,
        ],
        variantSeed: {
          kind: "size",
          skuPrefix: "CL-BELT",
          options: [
            { code: "85", label: "85 سم" },
            { code: "90", label: "90 سم" },
            { code: "95", label: "95 سم" },
          ],
        },
      },
    ],
  },
  {
    themeId: "elessi-pedal-lab",
    galleryPool: [
      ELESSI_PEDAL_MEDIA.heroCityStage,
      ELESSI_PEDAL_MEDIA.pelotonStage,
      ELESSI_PEDAL_MEDIA.blackBikePortrait,
      ELESSI_PEDAL_MEDIA.trailForestStage,
      ELESSI_PEDAL_MEDIA.cityWheelDetail,
      ELESSI_PEDAL_MEDIA.helmetCrop,
    ],
    reviewFrame: {
      firstTitle: "المواصفات كانت واضحة",
      firstLead: "اختيار",
      secondTitle: "مناسب للاستخدام اليومي",
      secondLead: "سهلت صفحة المنتج مقارنة",
    },
    orderProfile: {
      orderNumber: "PDL-2048",
      phone: "01071000002",
      customerName: "عميل Pedal Lab",
      paymentMethod: "card",
      status: "PROCESSING",
      shippingAddress: {
        governorate: "الجيزة",
        city: "الدقي",
        street: "شارع التحرير 42",
        address: "شارع التحرير 42، الدقي، الجيزة",
        addressLine1: "شارع التحرير 42",
      },
    },
    cartSeeds: [
      {
        productIdOrSlug: "pedal-city-glide",
        quantity: 1,
        variantId: "pedal-city-glide-8-speed",
        attributes: {
          "النظام": "8 سرعات",
          "المقاس": "متوسط",
        },
      },
      {
        productIdOrSlug: "pedal-carbon-helmet",
        quantity: 1,
        variantId: "pedal-carbon-helmet-m",
        attributes: {
          "الحجم": "M",
        },
      },
      {
        productIdOrSlug: "pedal-floor-pump",
        quantity: 1,
        variantId: "pedal-floor-pump-steel",
        attributes: {
          "الخامة": "هيكل معدني",
        },
      },
    ],
    categories: {
      city: { id: "city-bikes", name: "دراجات مدينة", slug: "city-bikes" },
      trail: { id: "mountain-bikes", name: "جبال ومغامرة", slug: "mountain-bikes" },
      safety: { id: "helmets-safety", name: "خوذات وأمان", slug: "helmets-safety" },
      service: { id: "service-upgrades", name: "صيانة وترقيات", slug: "service-upgrades" },
    },
    products: [
      {
        id: "pedal-city-glide",
        slug: "pedal-city-glide",
        name: "Pedal City Glide",
        mainImage: ELESSI_PEDAL_MEDIA.cityBikePortrait,
        images: [
          ELESSI_PEDAL_MEDIA.cityBikePortrait,
          ELESSI_PEDAL_MEDIA.heroCityStage,
          ELESSI_PEDAL_MEDIA.cityWheelDetail,
          ELESSI_PEDAL_MEDIA.blackBikeDetail,
        ],
        description: "دراجة مدينة مريحة بخيارات سرعة أوضح ومقاس مباشر للتنقل اليومي.",
        categoryKey: "city",
        price: 14890,
        comparePrice: 16290,
        tags: ["مدينة", "تنقل"],
        variantSeed: {
          kind: "config",
          skuPrefix: "PD-CITY",
          options: [
            {
              code: "8-speed",
              label: "8 سرعات / مقاس متوسط",
              attributes: {
                "النظام": "8 سرعات",
                "المقاس": "متوسط",
              },
            },
            {
              code: "21-speed",
              label: "21 سرعة / مقاس كبير",
              price: 16390,
              comparePrice: 17790,
              attributes: {
                "النظام": "21 سرعة",
                "المقاس": "كبير",
              },
            },
          ],
        },
      },
      {
        id: "pedal-gravel-core",
        slug: "pedal-gravel-core",
        name: "Pedal Gravel Core",
        mainImage: ELESSI_PEDAL_MEDIA.blackBikePortrait,
        images: [
          ELESSI_PEDAL_MEDIA.blackBikePortrait,
          ELESSI_PEDAL_MEDIA.trailForestStage,
          ELESSI_PEDAL_MEDIA.pelotonPortrait,
          ELESSI_PEDAL_MEDIA.blackBikeDetail,
        ],
        description: "دراجة مغامرات بتجهيز أوضح للطرق المختلطة وملحقات الصيانة المرتبطة.",
        categoryKey: "trail",
        price: 21900,
        comparePrice: 23600,
        tags: ["جرافل", "مغامرة"],
        variantSeed: {
          kind: "config",
          skuPrefix: "PD-GRAVEL",
          options: [
            {
              code: "alloy",
              label: "هيكل ألمنيوم / إطارات 700c",
              attributes: {
                "الهيكل": "ألمنيوم",
                "الإطار": "700c",
              },
            },
            {
              code: "carbon-fork",
              label: "شوكة كربون / إطارات 700c",
              price: 23450,
              comparePrice: 24990,
              attributes: {
                "الهيكل": "ألمنيوم + شوكة كربون",
                "الإطار": "700c",
              },
            },
          ],
        },
      },
      {
        id: "pedal-carbon-helmet",
        slug: "pedal-carbon-helmet",
        name: "Pedal Carbon Helmet",
        mainImage: ELESSI_PEDAL_MEDIA.helmetCrop,
        images: [
          ELESSI_PEDAL_MEDIA.helmetCrop,
          ELESSI_PEDAL_MEDIA.pelotonPortrait,
          ELESSI_PEDAL_MEDIA.pelotonStage,
          ELESSI_PEDAL_MEDIA.blackBikeDetail,
        ],
        description: "خوذة خفيفة بتهوية أوضح ونظام مقاسات مباشر يسرّع الحسم.",
        categoryKey: "safety",
        price: 1690,
        comparePrice: 1940,
        tags: ["أمان", "خوذة"],
        variantSeed: {
          kind: "size",
          skuPrefix: "PD-HELMET",
          options: [
            { code: "s", label: "S" },
            { code: "m", label: "M" },
            { code: "l", label: "L" },
          ],
        },
      },
      {
        id: "pedal-tube-kit",
        slug: "pedal-tube-kit",
        name: "Pedal Tube Kit",
        mainImage: ELESSI_PEDAL_MEDIA.cityWheelDetail,
        images: [
          ELESSI_PEDAL_MEDIA.cityWheelDetail,
          ELESSI_PEDAL_MEDIA.blackBikeDetail,
          ELESSI_PEDAL_MEDIA.trailForestPortrait,
          ELESSI_PEDAL_MEDIA.heroCityStage,
        ],
        description: "طقم داخلي وإصلاح سريع يرفع الطلب ويعمل كإضافة منطقية مع الدراجات والرحلات.",
        categoryKey: "service",
        price: 420,
        comparePrice: 520,
        tags: ["صيانة", "طقم سريع"],
        variantSeed: {
          kind: "size",
          skuPrefix: "PD-TUBE",
          options: [
            { code: "27-5", label: '27.5"' },
            { code: "29", label: '29"' },
          ],
        },
      },
      {
        id: "pedal-urban-light-set",
        slug: "pedal-urban-light-set",
        name: "Pedal Urban Light Set",
        mainImage: ELESSI_PEDAL_MEDIA.blackBikeDetail,
        images: [
          ELESSI_PEDAL_MEDIA.blackBikeDetail,
          ELESSI_PEDAL_MEDIA.cityWheelDetail,
          ELESSI_PEDAL_MEDIA.blackBikePortrait,
          ELESSI_PEDAL_MEDIA.heroCityStage,
        ],
        description: "إضاءة أمامية وخلفية واضحة تساعد على البيع مع عناصر الأمان والاستخدام الليلي.",
        categoryKey: "safety",
        price: 640,
        comparePrice: 760,
        tags: ["إضاءة", "مدينة"],
        variantSeed: {
          kind: "config",
          skuPrefix: "PD-LIGHT",
          options: [
            {
              code: "usb",
              label: "USB قابل للشحن",
              attributes: {
                "التغذية": "USB",
              },
            },
            {
              code: "pro",
              label: "نسخة Pro بسطوع أعلى",
              price: 790,
              comparePrice: 920,
              attributes: {
                "التغذية": "USB",
                "السطوع": "مرتفع",
              },
            },
          ],
        },
      },
      {
        id: "pedal-floor-pump",
        slug: "pedal-floor-pump",
        name: "Pedal Floor Pump",
        mainImage: ELESSI_PEDAL_MEDIA.trailForestPortrait,
        images: [
          ELESSI_PEDAL_MEDIA.trailForestPortrait,
          ELESSI_PEDAL_MEDIA.cityWheelDetail,
          ELESSI_PEDAL_MEDIA.blackBikeDetail,
          ELESSI_PEDAL_MEDIA.blackBikePortrait,
        ],
        description: "مضخة أرضية مستقرة توضح فائدة الترقية ومفهوم تجهيز الدراجة قبل الخروج.",
        categoryKey: "service",
        price: 880,
        comparePrice: 1020,
        tags: ["مضخة", "ترقية"],
        variantSeed: {
          kind: "config",
          skuPrefix: "PD-PUMP",
          options: [
            {
              code: "steel",
              label: "هيكل معدني",
              attributes: {
                "الخامة": "هيكل معدني",
              },
            },
            {
              code: "alloy-gauge",
              label: "ألمنيوم + عداد",
              price: 1040,
              comparePrice: 1180,
              attributes: {
                "الخامة": "ألمنيوم",
                "العداد": "موجود",
              },
            },
          ],
        },
      },
    ],
  },
  {
    themeId: "elessi-harvest-fold",
    galleryPool: [
      ELESSI_HARVEST_MEDIA.heroMarket,
      ELESSI_HARVEST_MEDIA.crateDetail,
      ELESSI_HARVEST_MEDIA.fruitCrate,
      ELESSI_HARVEST_MEDIA.herbBundle,
      ELESSI_HARVEST_MEDIA.breakfastJar,
      ELESSI_HARVEST_MEDIA.dateSyrup,
    ],
    reviewFrame: {
      firstTitle: "الطلبة وصلت مرتبة",
      firstLead: "حبيت طريقة عرض",
      secondTitle: "الحجم كان واضح قبل الطلب",
      secondLead: "وصف العبوة أو الصندوق في",
    },
    orderProfile: {
      orderNumber: "HFD-2048",
      phone: "01071000003",
      customerName: "عميلة Harvest Fold",
      paymentMethod: "wallet",
      status: "PROCESSING",
      shippingAddress: {
        governorate: "القاهرة",
        city: "المعادي",
        street: "شارع 9 المعادي 14",
        address: "شارع 9 المعادي 14، المعادي، القاهرة",
        addressLine1: "شارع 9 المعادي 14",
      },
    },
    cartSeeds: [
      {
        productIdOrSlug: "harvest-green-box",
        quantity: 1,
        variantId: "harvest-green-box-medium",
        attributes: {
          "الحجم": "صندوق متوسط",
        },
      },
      {
        productIdOrSlug: "harvest-breakfast-jar",
        quantity: 1,
        variantId: "harvest-breakfast-jar-750g",
        attributes: {
          "الحجم": "750 جم",
        },
      },
      {
        productIdOrSlug: "harvest-family-veg-crate",
        quantity: 1,
        variantId: "harvest-family-veg-crate-weekly",
        attributes: {
          "الحجم": "صندوق أسبوعي",
        },
      },
    ],
    categories: {
      greens: { id: "leafy-greens", name: "خضار ورقي", slug: "leafy-greens" },
      fruit: { id: "fruit-boxes", name: "صناديق فاكهة", slug: "fruit-boxes" },
      pantry: { id: "pantry-basics", name: "أساسيات المطبخ", slug: "pantry-basics" },
      family: { id: "family-crates", name: "صناديق عائلية", slug: "family-crates" },
    },
    products: [
      {
        id: "harvest-green-box",
        slug: "harvest-green-box",
        name: "Harvest Green Box",
        description: "صندوق خضار ورقي مرتب للطلب اليومي السريع مع أحجام أوضح للعائلة الصغيرة.",
        categoryKey: "greens",
        price: 210,
        comparePrice: 255,
        tags: ["خضار يومي", "طازج"],
        mainImage: ELESSI_HARVEST_MEDIA.crateDetail,
        images: [
          ELESSI_HARVEST_MEDIA.crateDetail,
          ELESSI_HARVEST_MEDIA.heroMarket,
          ELESSI_HARVEST_MEDIA.herbBundle,
          ELESSI_HARVEST_MEDIA.fruitCrate,
        ],
        variantSeed: {
          kind: "size",
          skuPrefix: "HF-GREEN",
          options: [
            { code: "small", label: "صندوق صغير" },
            { code: "medium", label: "صندوق متوسط", price: 260, comparePrice: 305 },
            { code: "family", label: "صندوق عائلي", price: 340, comparePrice: 390 },
          ],
        },
      },
      {
        id: "harvest-citrus-crate",
        slug: "harvest-citrus-crate",
        name: "Harvest Citrus Crate",
        description: "صندوق حمضيات مرتب يسهّل شراء الفاكهة الموسمية والمجموعات المنزلية.",
        categoryKey: "fruit",
        price: 240,
        comparePrice: 290,
        tags: ["فاكهة", "موسمي"],
        mainImage: ELESSI_HARVEST_MEDIA.fruitCrate,
        images: [
          ELESSI_HARVEST_MEDIA.fruitCrate,
          ELESSI_HARVEST_MEDIA.heroMarket,
          ELESSI_HARVEST_MEDIA.crateDetail,
          ELESSI_HARVEST_MEDIA.breakfastJar,
        ],
        variantSeed: {
          kind: "size",
          skuPrefix: "HF-CITRUS",
          options: [
            { code: "3kg", label: "3 كجم" },
            { code: "5kg", label: "5 كجم", price: 360, comparePrice: 410 },
          ],
        },
      },
      {
        id: "harvest-herb-bundle",
        slug: "harvest-herb-bundle",
        name: "Harvest Herb Bundle",
        description: "ربطة أعشاب مطبخ جاهزة للطلبات الصغيرة وتكرار الشراء الأسبوعي.",
        categoryKey: "greens",
        price: 95,
        comparePrice: 120,
        tags: ["أعشاب", "مطبخ"],
        mainImage: ELESSI_HARVEST_MEDIA.herbBundle,
        images: [
          ELESSI_HARVEST_MEDIA.herbBundle,
          ELESSI_HARVEST_MEDIA.crateDetail,
          ELESSI_HARVEST_MEDIA.heroMarket,
          ELESSI_HARVEST_MEDIA.pantryCloseup,
        ],
        variantSeed: {
          kind: "config",
          skuPrefix: "HF-HERBS",
          options: [
            {
              code: "kitchen",
              label: "نعناع + بقدونس + شبت",
              attributes: {
                "التجميعة": "مطبخ يومي",
              },
            },
            {
              code: "tea",
              label: "نعناع + ليمون جراس",
              attributes: {
                "التجميعة": "مشروبات دافئة",
              },
            },
          ],
        },
      },
      {
        id: "harvest-breakfast-jar",
        slug: "harvest-breakfast-jar",
        name: "Harvest Breakfast Jar",
        description: "وعاء جرانولا وعسل طبيعي يربط أقسام الطلب اليومي بالبانتري والاشتراكات.",
        categoryKey: "pantry",
        price: 160,
        comparePrice: 195,
        tags: ["جرانولا", "فطار"],
        mainImage: ELESSI_HARVEST_MEDIA.breakfastJar,
        images: [
          ELESSI_HARVEST_MEDIA.breakfastJar,
          ELESSI_HARVEST_MEDIA.pantryCloseup,
          ELESSI_HARVEST_MEDIA.dateSyrup,
          ELESSI_HARVEST_MEDIA.heroMarket,
        ],
        variantSeed: {
          kind: "size",
          skuPrefix: "HF-JAR",
          options: [
            { code: "450g", label: "450 جم" },
            { code: "750g", label: "750 جم", price: 220, comparePrice: 255 },
          ],
        },
      },
      {
        id: "harvest-family-veg-crate",
        slug: "harvest-family-veg-crate",
        name: "Harvest Family Veg Crate",
        description: "صندوق أسبوعي أكبر للعائلة يختصر قرار الطلب المتكرر ويزيد قيمة السلة.",
        categoryKey: "family",
        price: 390,
        comparePrice: 450,
        tags: ["عائلي", "أسبوعي"],
        mainImage: ELESSI_HARVEST_MEDIA.heroMarket,
        images: [
          ELESSI_HARVEST_MEDIA.heroMarket,
          ELESSI_HARVEST_MEDIA.crateDetail,
          ELESSI_HARVEST_MEDIA.fruitCrate,
          ELESSI_HARVEST_MEDIA.herbBundle,
        ],
        variantSeed: {
          kind: "size",
          skuPrefix: "HF-FAMILY",
          options: [
            { code: "weekly", label: "صندوق أسبوعي" },
            { code: "plus", label: "صندوق Plus", price: 470, comparePrice: 540 },
          ],
        },
      },
      {
        id: "harvest-date-syrup",
        slug: "harvest-date-syrup",
        name: "Harvest Date Syrup",
        description: "دبس تمر يضيف طبقة pantry واضحة ويخدم البيع مع الفطار والوصفات المنزلية.",
        categoryKey: "pantry",
        price: 120,
        comparePrice: 150,
        tags: ["تمر", "مطبخ"],
        mainImage: ELESSI_HARVEST_MEDIA.dateSyrup,
        images: [
          ELESSI_HARVEST_MEDIA.dateSyrup,
          ELESSI_HARVEST_MEDIA.pantryCloseup,
          ELESSI_HARVEST_MEDIA.breakfastJar,
          ELESSI_HARVEST_MEDIA.fruitCrate,
        ],
        variantSeed: {
          kind: "size",
          skuPrefix: "HF-SYRUP",
          options: [
            { code: "350ml", label: "350 مل" },
            { code: "700ml", label: "700 مل", price: 175, comparePrice: 210 },
          ],
        },
      },
    ],
  },
  {
    themeId: "elessi-signal-deck",
    galleryPool: [
      "/assets/themes/pc-hub-eg/hero-photo.jpg",
      "/assets/themes/pc-hub-eg/workbook-14-air.jpg",
      "/assets/themes/pc-hub-eg/creator-pro-16.jpg",
      "/assets/themes/pc-hub-eg/mechboard-pro.jpg",
      "/assets/themes/pc-hub-eg/dockstation-9in1.jpg",
      "/assets/themes/pc-hub-eg/precision-mouse-lite.jpg",
    ],
    reviewFrame: {
      firstTitle: "التجهيزات كانت مباشرة",
      firstLead: "تفاصيل",
      secondTitle: "المقارنة كانت أسرع من المتوقع",
      secondLead: "النسخ المختلفة من",
    },
    orderProfile: {
      orderNumber: "SGD-2048",
      phone: "01071000004",
      customerName: "عميل Signal Deck",
      paymentMethod: "card",
      status: "PROCESSING",
      shippingAddress: {
        governorate: "القاهرة",
        city: "مدينة نصر",
        street: "شارع مكرم عبيد 21",
        address: "شارع مكرم عبيد 21، مدينة نصر، القاهرة",
        addressLine1: "شارع مكرم عبيد 21",
      },
    },
    cartSeeds: [
      {
        productIdOrSlug: "signal-slate-14",
        quantity: 1,
        variantId: "signal-slate-14-16-512",
        attributes: {
          "الرام": "16GB",
          "التخزين": "512GB SSD",
        },
      },
      {
        productIdOrSlug: "signal-mech-board",
        quantity: 1,
        variantId: "signal-mech-board-tactile",
        attributes: {
          "السويتش": "Tactile",
        },
      },
      {
        productIdOrSlug: "signal-wireless-mouse",
        quantity: 1,
        variantId: "signal-wireless-mouse-graphite",
        attributes: {
          "اللون": "جرافيت",
        },
      },
    ],
    categories: {
      laptops: { id: "ultrabooks", name: "أجهزة خفيفة", slug: "ultrabooks" },
      creator: { id: "creator-labs", name: "صناعة ومحتوى", slug: "creator-labs" },
      desk: { id: "desk-gear", name: "معدات مكتب", slug: "desk-gear" },
      carry: { id: "carry-power", name: "تنقل وطاقة", slug: "carry-power" },
    },
    products: [
      {
        id: "signal-slate-14",
        slug: "signal-slate-14",
        name: "Signal Slate 14",
        images: SIGNAL_DECK_GALLERIES["signal-slate-14"],
        description: "لابتوب خفيف للشغل والتنقل مع اختيارات ذاكرة وتخزين أوضح للحسم السريع.",
        categoryKey: "laptops",
        price: 32990,
        comparePrice: 35990,
        tags: ["لابتوب", "خفة"],
        rating: 4.8,
        reviewCount: 126,
        commandFacts: [
          { label: "المعالج", value: "Core Ultra 7" },
          { label: "الرام", value: "16GB LPDDR5x" },
          { label: "البطارية", value: "حتى 13 ساعة" },
          { label: "الوزن", value: "1.28 كجم" },
        ],
        specs: [
          { label: "الشاشة", value: "14 بوصة 2.8K" },
          { label: "التخزين", value: "512GB SSD" },
          { label: "المنافذ", value: "USB-C + HDMI" },
          { label: "الضمان", value: "سنتان" },
        ],
        variantSeed: {
          kind: "config",
          skuPrefix: "SG-SLATE",
          options: [
            {
              code: "16-512",
              label: "16GB / 512GB SSD",
              attributes: {
                "الرام": "16GB",
                "التخزين": "512GB SSD",
              },
            },
            {
              code: "24-1tb",
              label: "24GB / 1TB SSD",
              price: 36990,
              comparePrice: 39990,
              attributes: {
                "الرام": "24GB",
                "التخزين": "1TB SSD",
              },
            },
          ],
        },
      },
      {
        id: "signal-creator-pad",
        slug: "signal-creator-pad",
        name: "Signal Creator Pad",
        images: SIGNAL_DECK_GALLERIES["signal-creator-pad"],
        description: "تابلت رسم ومحتوى بحجم واضح وتجهيز مباشر لصناع المحتوى والاستوديوهات الصغيرة.",
        categoryKey: "creator",
        price: 8790,
        comparePrice: 9590,
        tags: ["رسم", "إبداع"],
        rating: 4.7,
        reviewCount: 58,
        commandFacts: [
          { label: "منطقة العمل", value: "10x6 بوصة" },
          { label: "القلم", value: "8192 مستوى ضغط" },
          { label: "الاتصال", value: "USB-C" },
          { label: "النظام", value: "Win / macOS" },
        ],
        specs: [
          { label: "الاختصار", value: "8 أزرار قابلة للبرمجة" },
          { label: "السمك", value: "8.4 مم" },
          { label: "التجهيز", value: "جاهز للرسم مباشرة" },
          { label: "الضمان", value: "12 شهر" },
        ],
        variantSeed: {
          kind: "config",
          skuPrefix: "SG-CREATOR",
          options: [
            {
              code: "m",
              label: "مقاس متوسط",
              attributes: {
                "المقاس": "متوسط",
              },
            },
            {
              code: "l",
              label: "مقاس كبير",
              price: 10390,
              comparePrice: 11190,
              attributes: {
                "المقاس": "كبير",
              },
            },
          ],
        },
      },
      {
        id: "signal-mech-board",
        slug: "signal-mech-board",
        name: "Signal Mech Board",
        images: SIGNAL_DECK_GALLERIES["signal-mech-board"],
        description: "كيبورد ميكانيكال يوضح خيار السويتش بسرعة ويخدم المقارنة داخل المتجر التقني.",
        categoryKey: "desk",
        price: 2890,
        comparePrice: 3290,
        tags: ["كيبورد", "مكتب"],
        rating: 4.9,
        reviewCount: 214,
        commandFacts: [
          { label: "السويتش", value: "Tactile / Linear" },
          { label: "الحجم", value: "75%" },
          { label: "الإضاءة", value: "RGB" },
          { label: "الخامة", value: "ألمنيوم" },
        ],
        specs: [
          { label: "الاتصال", value: "USB-C قابل للفصل" },
          { label: "التخطيط", value: "عربي / إنجليزي" },
          { label: "التوافق", value: "Windows / macOS" },
          { label: "الضمان", value: "18 شهر" },
        ],
        variantSeed: {
          kind: "config",
          skuPrefix: "SG-BOARD",
          options: [
            {
              code: "tactile",
              label: "Tactile",
              attributes: {
                "السويتش": "Tactile",
              },
            },
            {
              code: "linear",
              label: "Linear",
              attributes: {
                "السويتش": "Linear",
              },
            },
          ],
        },
      },
      {
        id: "signal-gan-hub",
        slug: "signal-gan-hub",
        name: "Signal GaN Hub",
        images: SIGNAL_DECK_GALLERIES["signal-gan-hub"],
        description: "شاحن ومحور منافذ يربط فئة التنقل بالطاقة والملحقات اليومية الخفيفة.",
        categoryKey: "carry",
        price: 1640,
        comparePrice: 1890,
        tags: ["شحن", "USB-C"],
        rating: 4.6,
        reviewCount: 73,
        commandFacts: [
          { label: "الطاقة", value: "65W / 100W" },
          { label: "المنافذ", value: "6 إلى 8" },
          { label: "الخروج", value: "USB-C PD" },
          { label: "الاستخدام", value: "سفر ومكتب" },
        ],
        specs: [
          { label: "الحماية", value: "حماية حرارة وشحن زائد" },
          { label: "الخامة", value: "هيكل مقاوم للخدش" },
          { label: "التوافق", value: "Laptop / Tablet / Phone" },
          { label: "الضمان", value: "12 شهر" },
        ],
        variantSeed: {
          kind: "config",
          skuPrefix: "SG-HUB",
          options: [
            {
              code: "65w",
              label: "65W / 6 منافذ",
              attributes: {
                "الطاقة": "65W",
                "المنافذ": "6",
              },
            },
            {
              code: "100w",
              label: "100W / 8 منافذ",
              price: 2140,
              comparePrice: 2440,
              attributes: {
                "الطاقة": "100W",
                "المنافذ": "8",
              },
            },
          ],
        },
      },
      {
        id: "signal-stand-pro",
        slug: "signal-stand-pro",
        name: "Signal Stand Pro",
        images: SIGNAL_DECK_GALLERIES["signal-stand-pro"],
        description: "ستاند ألمنيوم يساعد على بيع accessories المكتبية بمسار هادئ وواضح.",
        categoryKey: "desk",
        price: 760,
        comparePrice: 890,
        tags: ["ستاند", "ألمنيوم"],
        rating: 4.5,
        reviewCount: 41,
        commandFacts: [
          { label: "الخامة", value: "ألمنيوم CNC" },
          { label: "الارتفاع", value: "قابل للتعديل" },
          { label: "التوافق", value: "حتى 16 بوصة" },
          { label: "القاعدة", value: "مانعة للانزلاق" },
        ],
        specs: [
          { label: "الوزن", value: "420 جم" },
          { label: "اللون", value: "فضي / رمادي فلكي" },
          { label: "التركيب", value: "جاهز من العلبة" },
          { label: "الضمان", value: "12 شهر" },
        ],
        variantSeed: {
          kind: "config",
          skuPrefix: "SG-STAND",
          options: [
            {
              code: "silver",
              label: "فضي",
              attributes: {
                "اللون": "فضي",
              },
            },
            {
              code: "space-gray",
              label: "رمادي فلكي",
              attributes: {
                "اللون": "رمادي فلكي",
              },
            },
          ],
        },
      },
      {
        id: "signal-wireless-mouse",
        slug: "signal-wireless-mouse",
        name: "Signal Wireless Mouse",
        images: SIGNAL_DECK_GALLERIES["signal-wireless-mouse"],
        description: "ماوس لاسلكي خفيف يرفع السلة بجانب الأجهزة الأساسية وملحقات المكتب.",
        categoryKey: "desk",
        price: 980,
        comparePrice: 1140,
        tags: ["ماوس", "لاسلكي"],
        rating: 4.7,
        reviewCount: 92,
        commandFacts: [
          { label: "الحساسية", value: "1600 DPI" },
          { label: "الاتصال", value: "2.4G + BT" },
          { label: "البطارية", value: "حتى 60 يوم" },
          { label: "الوزن", value: "78 جم" },
        ],
        specs: [
          { label: "الشحن", value: "USB-C" },
          { label: "الاستخدام", value: "مكتب وتنقل" },
          { label: "اللون", value: "جرافيت / رمادي ضبابي" },
          { label: "الضمان", value: "12 شهر" },
        ],
        variantSeed: {
          kind: "color",
          skuPrefix: "SG-MOUSE",
          options: [
            { code: "graphite", label: "جرافيت" },
            { code: "mist", label: "رمادي ضبابي" },
          ],
        },
      },
    ],
  },
  {
    themeId: "elessi-glow-routine",
    galleryPool: [
      ELESSI_COSMETIC_MEDIA.lipstickNoble,
      ELESSI_COSMETIC_MEDIA.beautyFlatlayA,
      ELESSI_COSMETIC_MEDIA.lipstickYouth,
      ELESSI_COSMETIC_MEDIA.beautyFlatlayB,
      ELESSI_COSMETIC_MEDIA.mascara,
      ELESSI_COSMETIC_MEDIA.brush,
    ],
    reviewFrame: {
      firstTitle: "الروتين بقى أوضح",
      firstLead: "أعجبني ترتيب",
      secondTitle: "الحجم المناسب كان ظاهر",
      secondLead: "تفاصيل الروتين في",
    },
    orderProfile: {
      orderNumber: "GLR-2048",
      phone: "01071000005",
      customerName: "عميلة Glow Routine",
      paymentMethod: "cod",
      status: "PROCESSING",
      shippingAddress: {
        governorate: "القاهرة",
        city: "التجمع",
        street: "محور التسعين 16",
        address: "محور التسعين 16، التجمع، القاهرة",
        addressLine1: "محور التسعين 16",
      },
    },
    cartSeeds: [
      {
        productIdOrSlug: "glow-cloud-cleanser",
        quantity: 1,
        variantId: "glow-cloud-cleanser-classic-black",
        attributes: {
          "الدرجة": "أسود كلاسيكي",
        },
      },
      {
        productIdOrSlug: "glow-niacin-serum",
        quantity: 1,
        variantId: "glow-niacin-serum-rose-nude",
        attributes: {
          "الدرجة": "Rose Nude",
        },
      },
      {
        productIdOrSlug: "glow-routine-kit",
        quantity: 1,
        variantId: "glow-routine-kit-full",
        attributes: {
          "التنسيق": "مجموعة كاملة",
        },
      },
    ],
    categories: {
      cleanse: { id: "eye-makeup", name: "عيون", slug: "eye-makeup" },
      serum: { id: "lip-color", name: "شفاه", slug: "lip-color" },
      gifts: { id: "gift-sets", name: "هدايا ومجموعات", slug: "gift-sets" },
      body: { id: "brushes-tools", name: "فرش وأدوات", slug: "brushes-tools" },
    },
    products: [
      {
        id: "glow-cloud-cleanser",
        slug: "glow-cloud-cleanser",
        name: "Glow Lash Mascara",
        description: "ماسكارا يومية تعرض المنتج بشكل مباشر ونظيف، مع اختيار أسرع للدرجة من أول نظرة.",
        categoryKey: "cleanse",
        price: 520,
        comparePrice: 640,
        tags: ["عيون", "يومي"],
        mainImage: ELESSI_COSMETIC_MEDIA.mascara,
        images: [
          ELESSI_COSMETIC_MEDIA.mascara,
          ELESSI_COSMETIC_MEDIA.beautyFlatlayA,
          ELESSI_COSMETIC_MEDIA.lipstickYouth,
          ELESSI_COSMETIC_MEDIA.beautyWorkA,
        ],
        variantSeed: {
          kind: "config",
          skuPrefix: "GR-CLEAN",
          options: [
            {
              code: "classic-black",
              label: "أسود كلاسيكي",
              attributes: {
                "الدرجة": "أسود كلاسيكي",
              },
            },
            {
              code: "soft-brown",
              label: "بني ناعم",
              price: 620,
              comparePrice: 740,
              attributes: {
                "الدرجة": "بني ناعم",
              },
            },
          ],
        },
      },
      {
        id: "glow-niacin-serum",
        slug: "glow-niacin-serum",
        name: "Glow Youth Lipstick",
        description: "لون يومي بسيط يفتح رحلة الشفاه داخل الواجهة بإيقاع أخف وأسهل للحسم.",
        categoryKey: "serum",
        price: 790,
        comparePrice: 930,
        tags: ["شفاه", "لون يومي"],
        mainImage: ELESSI_COSMETIC_MEDIA.lipstickYouth,
        images: [
          ELESSI_COSMETIC_MEDIA.lipstickYouth,
          ELESSI_COSMETIC_MEDIA.lipstickRomantic,
          ELESSI_COSMETIC_MEDIA.lipstickNoble,
          ELESSI_COSMETIC_MEDIA.beautyFlatlayB,
        ],
        variantSeed: {
          kind: "color",
          skuPrefix: "GR-SERUM",
          options: [
            { code: "rose-nude", label: "Rose Nude" },
            { code: "warm-coral", label: "Warm Coral", price: 890, comparePrice: 1040 },
          ],
        },
      },
      {
        id: "glow-night-cream",
        slug: "glow-night-cream",
        name: "Glow Seductive Lip Color",
        description: "درجة أجرأ قليلًا تخدم الواجهة مثل رف شفاه واضح بدل تكرار منطق منتجات العناية.",
        categoryKey: "serum",
        price: 860,
        comparePrice: 990,
        tags: ["شفاه", "أجرأ"],
        mainImage: ELESSI_COSMETIC_MEDIA.lipstickSeductive,
        images: [
          ELESSI_COSMETIC_MEDIA.lipstickSeductive,
          ELESSI_COSMETIC_MEDIA.lipstickRomantic,
          ELESSI_COSMETIC_MEDIA.lipstickNobleAlt,
          ELESSI_COSMETIC_MEDIA.beautyFlatlayC,
        ],
        variantSeed: {
          kind: "color",
          skuPrefix: "GR-NIGHT",
          options: [
            { code: "berry-night", label: "Berry Night" },
            { code: "ruby-soft", label: "Ruby Soft", price: 990, comparePrice: 1140 },
          ],
        },
      },
      {
        id: "glow-routine-kit",
        slug: "glow-routine-kit",
        name: "Glow Ritual Gift Set",
        description: "مجموعة هدية جاهزة تجمع بداية سهلة وهدية مرتبة في نفس الوقت.",
        categoryKey: "gifts",
        price: 1590,
        comparePrice: 1840,
        tags: ["مجموعة", "هدية"],
        mainImage: ELESSI_COSMETIC_MEDIA.lipstickNoble,
        images: [
          ELESSI_COSMETIC_MEDIA.lipstickNoble,
          ELESSI_COSMETIC_MEDIA.beautyFlatlayA,
          ELESSI_COSMETIC_MEDIA.beautyFlatlayC,
          ELESSI_COSMETIC_MEDIA.lipstickYouth,
        ],
        variantSeed: {
          kind: "size",
          skuPrefix: "GR-KIT",
          options: [
            { code: "mini", label: "مجموعة Mini" },
            { code: "full", label: "مجموعة كاملة", price: 1980, comparePrice: 2280 },
          ],
        },
      },
      {
        id: "glow-body-mist",
        slug: "glow-body-mist",
        name: "Glow Brush Chalk",
        description: "فرشاة أساسية تضيف للقالب قسم أدوات واضح بدل تكرار منتجات متشابهة بنفس المنطق.",
        categoryKey: "body",
        price: 470,
        comparePrice: 560,
        tags: ["فرش", "أدوات"],
        mainImage: ELESSI_COSMETIC_MEDIA.brush,
        images: [
          ELESSI_COSMETIC_MEDIA.brush,
          ELESSI_COSMETIC_MEDIA.beautyFlatlayB,
          ELESSI_COSMETIC_MEDIA.beautyWorkB,
          ELESSI_COSMETIC_MEDIA.mascara,
        ],
        variantSeed: {
          kind: "config",
          skuPrefix: "GR-MIST",
          options: [
            {
              code: "angled",
              label: "زاوية ناعمة",
              attributes: {
                "النوع": "زاوية ناعمة",
              },
            },
            {
              code: "soft-blend",
              label: "دمج ناعم",
              attributes: {
                "النوع": "دمج ناعم",
              },
            },
          ],
        },
      },
      {
        id: "glow-gift-pouch",
        slug: "glow-gift-pouch",
        name: "Glow Noble Lip Duo",
        description: "ثنائي ألوان صغير يكمّل الهدية أو السلة السريعة من غير ما يخرج عن روح الرف.",
        categoryKey: "gifts",
        price: 210,
        comparePrice: 260,
        tags: ["هدية", "ثنائي"],
        mainImage: ELESSI_COSMETIC_MEDIA.lipstickNobleAlt,
        images: [
          ELESSI_COSMETIC_MEDIA.lipstickNobleAlt,
          ELESSI_COSMETIC_MEDIA.lipstickNoble,
          ELESSI_COSMETIC_MEDIA.beautyFlatlayA,
          ELESSI_COSMETIC_MEDIA.lipstickRomantic,
        ],
        variantSeed: {
          kind: "config",
          skuPrefix: "GR-POUCH",
          options: [
            {
              code: "rose-pair",
              label: "Rose Pair",
              attributes: {
                "التنسيق": "Rose Pair",
              },
            },
            {
              code: "gift-ready",
              label: "جاهز للإهداء",
              price: 260,
              comparePrice: 310,
              attributes: {
                "التنسيق": "هدية جاهزة",
              },
            },
          ],
        },
      },
    ],
  },
  {
    themeId: "elessi-gem-atelier",
    galleryPool: [
      ELESSI_GEM_MEDIA.jewelryBoxAssortment,
      ELESSI_GEM_MEDIA.diamondRingOpenBox,
      ELESSI_GEM_MEDIA.heartNecklaceBox,
      ELESSI_GEM_MEDIA.pearlNecklaceBox,
      ELESSI_GEM_MEDIA.braceletBoxTurquoise,
      ELESSI_GEM_MEDIA.signatureHoops,
    ],
    reviewFrame: {
      firstTitle: "شكل القطعة راقٍ فعلًا",
      firstLead: "اختيار",
      secondTitle: "الهدية وصلت مرتبة",
      secondLead: "تفاصيل المعدن والمقاس في",
    },
    orderProfile: {
      orderNumber: "GEM-2048",
      phone: "01071000006",
      customerName: "عميلة Gem Atelier",
      paymentMethod: "card",
      status: "PROCESSING",
      shippingAddress: {
        governorate: "القاهرة",
        city: "الزمالك",
        street: "شارع البرازيل 10",
        address: "شارع البرازيل 10، الزمالك، القاهرة",
        addressLine1: "شارع البرازيل 10",
      },
    },
    cartSeeds: [
      {
        productIdOrSlug: "gem-signet-ring",
        quantity: 1,
        variantId: "gem-signet-ring-gold-7",
        attributes: {
          "اللون": "ذهبي",
          "المقاس": "7",
        },
      },
      {
        productIdOrSlug: "gem-pearl-bracelet",
        quantity: 1,
        variantId: "gem-pearl-bracelet-silver",
        attributes: {
          "اللون": "فضي",
        },
      },
      {
        productIdOrSlug: "gem-gift-card",
        quantity: 1,
        variantId: "gem-gift-card-3000",
        attributes: {
          "القيمة": "3000 جنيه",
        },
      },
    ],
    categories: {
      rings: { id: "daily-rings", name: "خواتم يومية", slug: "daily-rings" },
      gifts: { id: "gift-jewelry", name: "هدايا راقية", slug: "gift-jewelry" },
      sets: { id: "chains-sets", name: "سلاسل وأطقم", slug: "chains-sets" },
      signature: { id: "signature-pieces", name: "قطع توقيع", slug: "signature-pieces" },
    },
    products: [
      {
        id: "gem-signet-ring",
        slug: "gem-signet-ring",
        name: "Gem Signet Ring",
        description: "خاتم واضح الحضور بحجم مباشر واختيار أسرع للمقاس والمعدن.",
        categoryKey: "rings",
        price: 2790,
        comparePrice: 3150,
        tags: ["خاتم", "توقيع"],
        mainImage: ELESSI_GEM_MEDIA.diamondRingOpenBox,
        images: [
          ELESSI_GEM_MEDIA.diamondRingOpenBox,
          ELESSI_GEM_MEDIA.ringBoxMinimal,
          ELESSI_GEM_MEDIA.jewelryBoxAssortment,
          ELESSI_GEM_MEDIA.signatureHoops,
        ],
        variantSeed: {
          kind: "config",
          skuPrefix: "GE-RING",
          options: [
            {
              code: "gold-7",
              label: "ذهبي / مقاس 7",
              attributes: {
                "اللون": "ذهبي",
                "المقاس": "7",
              },
            },
            {
              code: "silver-8",
              label: "فضي / مقاس 8",
              attributes: {
                "اللون": "فضي",
                "المقاس": "8",
              },
            },
          ],
        },
      },
      {
        id: "gem-petal-necklace",
        slug: "gem-petal-necklace",
        name: "Gem Petal Necklace",
        description: "سلسلة ناعمة مناسبة للهدايا مع طريقة عرض أقرب للبوتيك لا للمخزن.",
        categoryKey: "gifts",
        price: 2380,
        comparePrice: 2710,
        tags: ["سلسلة", "هدية"],
        mainImage: ELESSI_GEM_MEDIA.heartNecklaceBox,
        images: [
          ELESSI_GEM_MEDIA.heartNecklaceBox,
          ELESSI_GEM_MEDIA.pearlNecklaceBox,
          ELESSI_GEM_MEDIA.jewelryBoxAssortment,
          ELESSI_GEM_MEDIA.braceletBoxTurquoise,
        ],
        variantSeed: {
          kind: "color",
          skuPrefix: "GE-NECK",
          options: [
            { code: "gold", label: "ذهبي" },
            { code: "rose", label: "روز جولد" },
          ],
        },
      },
      {
        id: "gem-starlight-set",
        slug: "gem-starlight-set",
        name: "Gem Starlight Set",
        description: "طقم جاهز يساعد على رفع السلة ويجعل البيع بالهدايا أكثر وضوحًا.",
        categoryKey: "sets",
        price: 4120,
        comparePrice: 4550,
        tags: ["طقم", "هدية"],
        mainImage: ELESSI_GEM_MEDIA.pearlNecklaceBox,
        images: [
          ELESSI_GEM_MEDIA.pearlNecklaceBox,
          ELESSI_GEM_MEDIA.jewelryBoxAssortment,
          ELESSI_GEM_MEDIA.heartNecklaceBox,
          ELESSI_GEM_MEDIA.braceletBoxTurquoise,
        ],
        variantSeed: {
          kind: "color",
          skuPrefix: "GE-SET",
          options: [
            { code: "gold", label: "ذهبي" },
            { code: "silver", label: "فضي" },
          ],
        },
      },
      {
        id: "gem-gift-card",
        slug: "gem-gift-card",
        name: "Gem Gift Card",
        description: "بطاقة هدية تسهّل قرار الشراء حين تكون المناسبة أسرع من اختيار القطعة.",
        categoryKey: "gifts",
        price: 1500,
        comparePrice: 1500,
        tags: ["بطاقة هدية"],
        mainImage: ELESSI_GEM_MEDIA.jewelryBoxAssortment,
        images: [
          ELESSI_GEM_MEDIA.jewelryBoxAssortment,
          ELESSI_GEM_MEDIA.heartNecklaceBox,
          ELESSI_GEM_MEDIA.pearlNecklaceBox,
          ELESSI_GEM_MEDIA.ringBoxMinimal,
        ],
        variantSeed: {
          kind: "config",
          skuPrefix: "GE-CARD",
          options: [
            {
              code: "1500",
              label: "1500 جنيه",
              attributes: {
                "القيمة": "1500 جنيه",
              },
            },
            {
              code: "3000",
              label: "3000 جنيه",
              price: 3000,
              comparePrice: 3000,
              attributes: {
                "القيمة": "3000 جنيه",
              },
            },
          ],
        },
      },
      {
        id: "gem-pearl-bracelet",
        slug: "gem-pearl-bracelet",
        name: "Gem Pearl Bracelet",
        description: "إضافة هادئة تكمّل السلسلة أو الطقم وتخدم البيع البيني داخل الصفحة.",
        categoryKey: "signature",
        price: 1840,
        comparePrice: 2120,
        tags: ["أسورة", "لؤلؤ"],
        mainImage: ELESSI_GEM_MEDIA.braceletBoxTurquoise,
        images: [
          ELESSI_GEM_MEDIA.braceletBoxTurquoise,
          ELESSI_GEM_MEDIA.pearlNecklaceBox,
          ELESSI_GEM_MEDIA.jewelryBoxAssortment,
          ELESSI_GEM_MEDIA.heartNecklaceBox,
        ],
        variantSeed: {
          kind: "color",
          skuPrefix: "GE-BRACE",
          options: [
            { code: "silver", label: "فضي" },
            { code: "gold", label: "ذهبي" },
          ],
        },
      },
      {
        id: "gem-signature-hoops",
        slug: "gem-signature-hoops",
        name: "Gem Signature Hoops",
        description: "حلق دائري بحجم يومي يوضح كيف تشتغل additions الصغيرة في متجر المجوهرات.",
        categoryKey: "signature",
        price: 1680,
        comparePrice: 1940,
        tags: ["حلق", "يومي"],
        mainImage: ELESSI_GEM_MEDIA.signatureHoops,
        images: [
          ELESSI_GEM_MEDIA.signatureHoops,
          ELESSI_GEM_MEDIA.earringsTable,
          ELESSI_GEM_MEDIA.jewelryBoxAssortment,
          ELESSI_GEM_MEDIA.ringBoxMinimal,
        ],
        variantSeed: {
          kind: "color",
          skuPrefix: "GE-HOOPS",
          options: [
            { code: "gold", label: "ذهبي" },
            { code: "silver", label: "فضي" },
          ],
        },
      },
    ],
  },
  {
    themeId: "elessi-tail-supply",
    galleryPool: [
      ELESSI_TAIL_MEDIA.playDog,
      ELESSI_TAIL_MEDIA.dogFoodBowl,
      ELESSI_TAIL_MEDIA.carePet,
      ELESSI_TAIL_MEDIA.walkLeashReal,
      ELESSI_TAIL_MEDIA.softBedReal,
      ELESSI_TAIL_MEDIA.walkDog,
    ],
    reviewFrame: {
      firstTitle: "المنتج مناسب فعلًا للحيوان",
      firstLead: "اختيار",
      secondTitle: "التفاصيل كانت مطمئنة",
      secondLead: "طريقة عرض الاستخدام في",
    },
    orderProfile: {
      orderNumber: "TSL-2048",
      phone: "01071000007",
      customerName: "عميل Tail Supply",
      paymentMethod: "cod",
      status: "PROCESSING",
      shippingAddress: {
        governorate: "القاهرة",
        city: "الشروق",
        street: "الحي السابع 12",
        address: "الحي السابع 12، الشروق، القاهرة",
        addressLine1: "الحي السابع 12",
      },
    },
    cartSeeds: [
      {
        productIdOrSlug: "tail-salmon-bites",
        quantity: 1,
        variantId: "tail-salmon-bites-2kg",
        attributes: {
          "الحجم": "2 كجم",
        },
      },
      {
        productIdOrSlug: "tail-soft-bed",
        quantity: 1,
        variantId: "tail-soft-bed-l",
        attributes: {
          "الحجم": "L",
        },
      },
      {
        productIdOrSlug: "tail-walk-leash",
        quantity: 1,
        variantId: "tail-walk-leash-green",
        attributes: {
          "اللون": "أخضر غامق",
        },
      },
    ],
    categories: {
      food: { id: "pet-food", name: "طعام يومي", slug: "pet-food" },
      play: { id: "pet-play", name: "لعب ونشاط", slug: "pet-play" },
      care: { id: "pet-care", name: "عناية وتنظيف", slug: "pet-care" },
      walk: { id: "walk-travel", name: "نزهة وخروج", slug: "walk-travel" },
    },
    products: [
      {
        id: "tail-salmon-bites",
        slug: "tail-salmon-bites",
        name: "Tail Salmon Bites",
        description: "طعام جاف يومي بطبقة ثقة أوضح للمربي مع أحجام مباشرة للطلب المتكرر.",
        categoryKey: "food",
        price: 690,
        comparePrice: 830,
        tags: ["أكل", "متكرر"],
        mainImage: ELESSI_TAIL_MEDIA.dogFoodBowl,
        images: [
          ELESSI_TAIL_MEDIA.dogFoodBowl,
          ELESSI_TAIL_MEDIA.dogFoodTray,
          ELESSI_TAIL_MEDIA.playDog,
          ELESSI_TAIL_MEDIA.walkDog,
        ],
        variantSeed: {
          kind: "size",
          skuPrefix: "TS-FOOD",
          options: [
            { code: "1kg", label: "1 كجم" },
            { code: "2kg", label: "2 كجم", price: 1040, comparePrice: 1210 },
          ],
        },
      },
      {
        id: "tail-rope-toy",
        slug: "tail-rope-toy",
        name: "Tail Rope Toy",
        description: "لعبة حركة تساعد على رفع السلة بسرعة داخل ركن اللعب والأنشطة.",
        categoryKey: "play",
        price: 220,
        comparePrice: 280,
        tags: ["لعبة", "نشاط"],
        mainImage: ELESSI_TAIL_MEDIA.playDog,
        images: [
          ELESSI_TAIL_MEDIA.playDog,
          ELESSI_TAIL_MEDIA.walkDog,
          ELESSI_TAIL_MEDIA.walkLeashReal,
          ELESSI_TAIL_MEDIA.carePet,
        ],
        variantSeed: {
          kind: "color",
          skuPrefix: "TS-ROPE",
          options: [
            { code: "blue", label: "أزرق" },
            { code: "orange", label: "برتقالي" },
          ],
        },
      },
      {
        id: "tail-groom-brush",
        slug: "tail-groom-brush",
        name: "Tail Groom Brush",
        description: "فرشاة عناية يومية تجعل قسم care أقرب للقرار وأقل تشتيتًا.",
        categoryKey: "care",
        price: 340,
        comparePrice: 410,
        tags: ["عناية", "فرشاة"],
        mainImage: ELESSI_TAIL_MEDIA.carePet,
        images: [
          ELESSI_TAIL_MEDIA.carePet,
          ELESSI_TAIL_MEDIA.playDog,
          ELESSI_TAIL_MEDIA.walkLeashReal,
          ELESSI_TAIL_MEDIA.dogFoodBowl,
        ],
        variantSeed: {
          kind: "config",
          skuPrefix: "TS-BRUSH",
          options: [
            {
              code: "short",
              label: "شعر قصير",
              attributes: {
                "الاستخدام": "شعر قصير",
              },
            },
            {
              code: "long",
              label: "شعر طويل",
              attributes: {
                "الاستخدام": "شعر طويل",
              },
            },
          ],
        },
      },
      {
        id: "tail-travel-bowl",
        slug: "tail-travel-bowl",
        name: "Tail Travel Bowl",
        description: "وعاء سيليكون قابل للطي يدعم الطلبات الخفيفة مع ركن الخروج والسفر.",
        categoryKey: "walk",
        price: 180,
        comparePrice: 230,
        tags: ["سفر", "وعاء"],
        mainImage: ELESSI_TAIL_MEDIA.dogFoodBowl,
        images: [
          ELESSI_TAIL_MEDIA.dogFoodBowl,
          ELESSI_TAIL_MEDIA.walkLeashReal,
          ELESSI_TAIL_MEDIA.walkDog,
          ELESSI_TAIL_MEDIA.dogFoodTray,
        ],
        variantSeed: {
          kind: "color",
          skuPrefix: "TS-BOWL",
          options: [
            { code: "teal", label: "تركواز" },
            { code: "sand", label: "بيج رملي" },
          ],
        },
      },
      {
        id: "tail-soft-bed",
        slug: "tail-soft-bed",
        name: "Tail Soft Bed",
        description: "سرير ناعم بمقاسات أوضح يخدم الشراء السريع والراحة اليومية.",
        categoryKey: "care",
        price: 950,
        comparePrice: 1120,
        tags: ["سرير", "راحة"],
        mainImage: ELESSI_TAIL_MEDIA.softBedReal,
        images: [
          ELESSI_TAIL_MEDIA.softBedReal,
          ELESSI_TAIL_MEDIA.playDog,
          ELESSI_TAIL_MEDIA.walkDog,
          ELESSI_TAIL_MEDIA.carePet,
        ],
        variantSeed: {
          kind: "size",
          skuPrefix: "TS-BED",
          options: [
            { code: "m", label: "M" },
            { code: "l", label: "L", price: 1120, comparePrice: 1290 },
          ],
        },
      },
      {
        id: "tail-walk-leash",
        slug: "tail-walk-leash",
        name: "Tail Walk Leash",
        description: "حزام خروج واضح وعملي يرفع قيمة الطلب مع أقسام النزهة واللعب.",
        categoryKey: "walk",
        price: 310,
        comparePrice: 380,
        tags: ["حزام", "خروج"],
        mainImage: ELESSI_TAIL_MEDIA.walkLeashReal,
        images: [
          ELESSI_TAIL_MEDIA.walkLeashReal,
          ELESSI_TAIL_MEDIA.walkDog,
          ELESSI_TAIL_MEDIA.playDog,
          ELESSI_TAIL_MEDIA.carePet,
        ],
        variantSeed: {
          kind: "color",
          skuPrefix: "TS-LEASH",
          options: [
            { code: "green", label: "أخضر غامق" },
            { code: "black", label: "أسود" },
          ],
        },
      },
    ],
  },
  {
    themeId: "elessi-chrono-gallery",
    galleryPool: [
      ELESSI_CHRONO_MEDIA.heroWatchCloseup,
      ELESSI_CHRONO_MEDIA.watchProductFront,
      ELESSI_CHRONO_MEDIA.giftSuitWatch,
      ELESSI_CHRONO_MEDIA.watchDialBlue,
      ELESSI_CHRONO_MEDIA.watchStrapBrown,
      ELESSI_CHRONO_MEDIA.watchWristGold,
      ELESSI_CHRONO_MEDIA.strapCloseupWatch,
    ],
    reviewFrame: {
      firstTitle: "الساعة طالعة أنيقة",
      firstLead: "مقارنة",
      secondTitle: "التفاصيل أوضحت القرار",
      secondLead: "اختلاف النسخ في",
    },
    orderProfile: {
      orderNumber: "CHR-2048",
      phone: "01071000008",
      customerName: "عميل Chrono Gallery",
      paymentMethod: "card",
      status: "PROCESSING",
      shippingAddress: {
        governorate: "القاهرة",
        city: "المهندسين",
        street: "شارع سوريا 15",
        address: "شارع سوريا 15، المهندسين، الجيزة",
        addressLine1: "شارع سوريا 15",
      },
    },
    cartSeeds: [
      {
        productIdOrSlug: "chrono-classic-40",
        quantity: 1,
        variantId: "chrono-classic-40-silver",
        attributes: {
          "اللون": "فضي",
        },
      },
      {
        productIdOrSlug: "chrono-saddle-strap",
        quantity: 1,
        variantId: "chrono-saddle-strap-brown",
        attributes: {
          "اللون": "بني كلاسيك",
        },
      },
      {
        productIdOrSlug: "chrono-gift-box",
        quantity: 1,
        variantId: "chrono-gift-box-deluxe",
        attributes: {
          "الحجم": "Deluxe",
        },
      },
    ],
    categories: {
      classic: { id: "classic-everyday", name: "كلاسيك يومي", slug: "classic-everyday" },
      sport: { id: "sport-performance", name: "رياضي وأداء", slug: "sport-performance" },
      gifts: { id: "gift-watches", name: "هدايا رجالية", slug: "gift-watches" },
      straps: { id: "straps-service", name: "أحزمة وصيانة", slug: "straps-service" },
    },
    products: [
      {
        id: "chrono-classic-40",
        slug: "chrono-classic-40",
        name: "Chrono Classic 40",
        description: "ساعة كلاسيكية بحجم أوضح وإيقاع شراء يوازن بين الاسم والصورة والمواصفة.",
        categoryKey: "classic",
        price: 3290,
        comparePrice: 3720,
        tags: ["كلاسيك", "أكثر طلبًا"],
        mainImage: ELESSI_CHRONO_MEDIA.heroWatchCloseup,
        images: [
          ELESSI_CHRONO_MEDIA.heroWatchCloseup,
          ELESSI_CHRONO_MEDIA.watchProductFront,
          ELESSI_CHRONO_MEDIA.giftSuitWatch,
          ELESSI_CHRONO_MEDIA.watchWristGold,
        ],
        variantSeed: {
          kind: "color",
          skuPrefix: "CH-CLASSIC",
          options: [
            { code: "silver", label: "فضي" },
            { code: "gold", label: "ذهبي" },
          ],
        },
      },
      {
        id: "chrono-race-44",
        slug: "chrono-race-44",
        name: "Chrono Race 44",
        description: "ساعة رياضية بوجه أوضح للمقارنة وتفاصيل أسرع لمحبي الأداء اليومي.",
        categoryKey: "sport",
        price: 3590,
        comparePrice: 3990,
        tags: ["رياضي", "أداء"],
        mainImage: ELESSI_CHRONO_MEDIA.watchDialBlue,
        images: [
          ELESSI_CHRONO_MEDIA.watchDialBlue,
          ELESSI_CHRONO_MEDIA.watchProductFront,
          ELESSI_CHRONO_MEDIA.heroWatchCloseup,
          ELESSI_CHRONO_MEDIA.giftSuitWatch,
        ],
        variantSeed: {
          kind: "color",
          skuPrefix: "CH-RACE",
          options: [
            { code: "black", label: "أسود" },
            { code: "olive", label: "زيتي" },
          ],
        },
      },
      {
        id: "chrono-gift-box",
        slug: "chrono-gift-box",
        name: "Chrono Gift Box",
        description: "علبة هدايا مرتبة ترفع السلة مع الساعات والقطع الرجالية بسرعة أوضح.",
        categoryKey: "gifts",
        price: 290,
        comparePrice: 350,
        tags: ["هدية", "تغليف"],
        mainImage: ELESSI_CHRONO_MEDIA.giftBraceletSet,
        images: [
          ELESSI_CHRONO_MEDIA.giftBraceletSet,
          ELESSI_CHRONO_MEDIA.giftSuitWatch,
          ELESSI_CHRONO_MEDIA.heroWatchCloseup,
          ELESSI_CHRONO_MEDIA.watchWristGold,
        ],
        variantSeed: {
          kind: "size",
          skuPrefix: "CH-BOX",
          options: [
            { code: "classic", label: "Classic" },
            { code: "deluxe", label: "Deluxe", price: 420, comparePrice: 510 },
          ],
        },
      },
      {
        id: "chrono-saddle-strap",
        slug: "chrono-saddle-strap",
        name: "Chrono Saddle Strap",
        description: "حزام جلد يضيف منطق بيع أوضح لخدمة الصيانة والتجديد بعد الشراء.",
        categoryKey: "straps",
        price: 610,
        comparePrice: 720,
        tags: ["حزام", "جلد"],
        mainImage: ELESSI_CHRONO_MEDIA.watchStrapBrown,
        images: [
          ELESSI_CHRONO_MEDIA.watchStrapBrown,
          ELESSI_CHRONO_MEDIA.strapCloseupWatch,
          ELESSI_CHRONO_MEDIA.heroWatchCloseup,
          ELESSI_CHRONO_MEDIA.watchDialBlue,
        ],
        variantSeed: {
          kind: "color",
          skuPrefix: "CH-STRAP",
          options: [
            { code: "brown", label: "بني كلاسيك" },
            { code: "black", label: "أسود" },
          ],
        },
      },
      {
        id: "chrono-mesh-steel",
        slug: "chrono-mesh-steel",
        name: "Chrono Mesh Steel",
        description: "نسخة mesh أخف توازن بين الهدايا والاستخدام اليومي مع صور أقرب للحقيقة.",
        categoryKey: "classic",
        price: 3010,
        comparePrice: 3390,
        tags: ["Mesh", "يومي"],
        mainImage: ELESSI_CHRONO_MEDIA.watchProductFront,
        images: [
          ELESSI_CHRONO_MEDIA.watchProductFront,
          ELESSI_CHRONO_MEDIA.heroWatchCloseup,
          ELESSI_CHRONO_MEDIA.giftSuitWatch,
          ELESSI_CHRONO_MEDIA.watchDialBlue,
        ],
        variantSeed: {
          kind: "color",
          skuPrefix: "CH-MESH",
          options: [
            { code: "steel", label: "ستيل" },
            { code: "graphite", label: "جرافيت" },
          ],
        },
      },
      {
        id: "chrono-service-kit",
        slug: "chrono-service-kit",
        name: "Chrono Service Kit",
        description: "طقم صيانة خفيف يكمّل فكرة aftercare ويعمل كإضافة سهلة داخل المتجر.",
        categoryKey: "straps",
        price: 260,
        comparePrice: 320,
        tags: ["صيانة", "إضافة"],
        mainImage: ELESSI_CHRONO_MEDIA.strapCloseupWatch,
        images: [
          ELESSI_CHRONO_MEDIA.strapCloseupWatch,
          ELESSI_CHRONO_MEDIA.watchStrapBrown,
          ELESSI_CHRONO_MEDIA.giftSuitWatch,
          ELESSI_CHRONO_MEDIA.heroWatchCloseup,
        ],
        variantSeed: {
          kind: "config",
          skuPrefix: "CH-SERVICE",
          options: [
            {
              code: "basic",
              label: "Basic",
              attributes: {
                "المحتوى": "أداة + قماشة",
              },
            },
            {
              code: "plus",
              label: "Plus",
              price: 360,
              comparePrice: 430,
              attributes: {
                "المحتوى": "أداة + قماشة + رابطات",
              },
            },
          ],
        },
      },
    ],
  },
  {
    themeId: "elessi-garage-fit",
    galleryPool: [
      ELESSI_GARAGE_MEDIA.engineBay,
      ELESSI_GARAGE_MEDIA.oilBottles,
      ELESSI_GARAGE_MEDIA.airFilterCloseup,
      ELESSI_GARAGE_MEDIA.headlightBulb,
      ELESSI_GARAGE_MEDIA.seatInterior,
      ELESSI_GARAGE_MEDIA.oilBottles,
    ],
    reviewFrame: {
      firstTitle: "القطعة كانت واضحة ومناسبة",
      firstLead: "تفاصيل",
      secondTitle: "فرق المواصفات كان ظاهر",
      secondLead: "الاختيارات المختلفة في",
    },
    orderProfile: {
      orderNumber: "GRF-2048",
      phone: "01071000009",
      customerName: "عميل Garage Fit",
      paymentMethod: "cod",
      status: "PROCESSING",
      shippingAddress: {
        governorate: "القاهرة",
        city: "مدينة نصر",
        street: "شارع مصطفى النحاس 36",
        address: "شارع مصطفى النحاس 36، مدينة نصر، القاهرة",
        addressLine1: "شارع مصطفى النحاس 36",
      },
    },
    cartSeeds: [
      {
        productIdOrSlug: "garage-synthetic-oil",
        quantity: 1,
        variantId: "garage-synthetic-oil-5w30-4l",
        attributes: {
          "اللزوجة": "5W30",
          "الحجم": "4 لتر",
        },
      },
      {
        productIdOrSlug: "garage-led-kit",
        quantity: 1,
        variantId: "garage-led-kit-h11",
        attributes: {
          "المقاس": "H11",
        },
      },
      {
        productIdOrSlug: "garage-seat-cover",
        quantity: 1,
        variantId: "garage-seat-cover-front-pair",
        attributes: {
          "الحجم": "طقم أمامي",
        },
      },
    ],
    categories: {
      oils: { id: "oils-fluids", name: "زيوت وسوائل", slug: "oils-fluids" },
      filters: { id: "filters-service", name: "فلاتر وصيانة", slug: "filters-service" },
      electric: { id: "lighting-electric", name: "إضاءة وكهرباء", slug: "lighting-electric" },
      interior: { id: "interior-accessories", name: "إكسسوارات داخلية", slug: "interior-accessories" },
    },
    products: [
      {
        id: "garage-synthetic-oil",
        slug: "garage-synthetic-oil",
        name: "Garage Synthetic Oil",
        description: "زيت محرك يوضح اللزوجة والحجم بسرعة ويخدم قرار الشراء المتكرر.",
        categoryKey: "oils",
        price: 820,
        comparePrice: 970,
        tags: ["زيت", "صيانة"],
        mainImage: ELESSI_GARAGE_MEDIA.oilBottles,
        images: [
          ELESSI_GARAGE_MEDIA.oilBottles,
          ELESSI_GARAGE_MEDIA.engineBay,
          ELESSI_GARAGE_MEDIA.airFilterCloseup,
          ELESSI_GARAGE_MEDIA.headlightBulb,
        ],
        variantSeed: {
          kind: "config",
          skuPrefix: "GF-OIL",
          options: [
            {
              code: "5w30-4l",
              label: "5W30 / 4 لتر",
              attributes: {
                "اللزوجة": "5W30",
                "الحجم": "4 لتر",
              },
            },
            {
              code: "5w40-5l",
              label: "5W40 / 5 لتر",
              price: 1120,
              comparePrice: 1280,
              attributes: {
                "اللزوجة": "5W40",
                "الحجم": "5 لتر",
              },
            },
          ],
        },
      },
      {
        id: "garage-air-filter",
        slug: "garage-air-filter",
        name: "Garage Air Filter",
        description: "فلتر هواء بسطح قرار أوضح للسيارات الشائعة والصيانة الدورية.",
        categoryKey: "filters",
        price: 340,
        comparePrice: 410,
        tags: ["فلتر", "محرك"],
        mainImage: ELESSI_GARAGE_MEDIA.airFilterCloseup,
        images: [
          ELESSI_GARAGE_MEDIA.airFilterCloseup,
          ELESSI_GARAGE_MEDIA.engineBay,
          ELESSI_GARAGE_MEDIA.oilBottles,
          ELESSI_GARAGE_MEDIA.headlightBulb,
        ],
        variantSeed: {
          kind: "config",
          skuPrefix: "GF-FILTER",
          options: [
            {
              code: "compact",
              label: "Compact Cars",
              attributes: {
                "الفئة": "Compact Cars",
              },
            },
            {
              code: "suv",
              label: "SUV",
              attributes: {
                "الفئة": "SUV",
              },
            },
          ],
        },
      },
      {
        id: "garage-led-kit",
        slug: "garage-led-kit",
        name: "Garage LED Kit",
        description: "طقم إضاءة أوضح للمقارنة بين المقاسات ويربط الإكسسوار بالشراء التقني السريع.",
        categoryKey: "electric",
        price: 960,
        comparePrice: 1120,
        tags: ["LED", "إضاءة"],
        mainImage: ELESSI_GARAGE_MEDIA.headlightBulb,
        images: [
          ELESSI_GARAGE_MEDIA.headlightBulb,
          ELESSI_GARAGE_MEDIA.engineBay,
          ELESSI_GARAGE_MEDIA.oilBottles,
          ELESSI_GARAGE_MEDIA.seatInterior,
        ],
        variantSeed: {
          kind: "size",
          skuPrefix: "GF-LED",
          options: [
            { code: "h4", label: "H4" },
            { code: "h11", label: "H11" },
            { code: "9005", label: "9005" },
          ],
        },
      },
      {
        id: "garage-battery-pack",
        slug: "garage-battery-pack",
        name: "Garage Battery Pack",
        description: "باور باك للطوارئ يرفع السلة مع خطوط قرار أقرب للحاجة الفعلية للسيارة.",
        categoryKey: "electric",
        price: 2390,
        comparePrice: 2690,
        tags: ["طوارئ", "بطارية"],
        mainImage: ELESSI_GARAGE_MEDIA.engineBay,
        images: [
          ELESSI_GARAGE_MEDIA.engineBay,
          ELESSI_GARAGE_MEDIA.headlightBulb,
          ELESSI_GARAGE_MEDIA.oilBottles,
          ELESSI_GARAGE_MEDIA.airFilterCloseup,
        ],
        variantSeed: {
          kind: "config",
          skuPrefix: "GF-BOOST",
          options: [
            {
              code: "basic",
              label: "12V Basic",
              attributes: {
                "الجهد": "12V",
              },
            },
            {
              code: "pro",
              label: "12V Pro",
              price: 2890,
              comparePrice: 3190,
              attributes: {
                "الجهد": "12V",
                "القدرة": "Pro",
              },
            },
          ],
        },
      },
      {
        id: "garage-seat-cover",
        slug: "garage-seat-cover",
        name: "Garage Seat Cover",
        description: "غطاء مقاعد يربط مسار الشراء الداخلي بالإضافات العملية سريعة البيع.",
        categoryKey: "interior",
        price: 1450,
        comparePrice: 1670,
        tags: ["مقاعد", "داخلي"],
        mainImage: ELESSI_GARAGE_MEDIA.seatInterior,
        images: [
          ELESSI_GARAGE_MEDIA.seatInterior,
          ELESSI_GARAGE_MEDIA.engineBay,
          ELESSI_GARAGE_MEDIA.headlightBulb,
          ELESSI_GARAGE_MEDIA.oilBottles,
        ],
        variantSeed: {
          kind: "size",
          skuPrefix: "GF-SEAT",
          options: [
            { code: "front-pair", label: "طقم أمامي" },
            { code: "full-set", label: "طقم كامل", price: 1980, comparePrice: 2260 },
          ],
        },
      },
      {
        id: "garage-detail-spray",
        slug: "garage-detail-spray",
        name: "Garage Detail Spray",
        description: "بخاخ تنظيف سريع يكمّل سلة الصيانة والعناية من غير تعقيد زائد.",
        categoryKey: "interior",
        price: 260,
        comparePrice: 320,
        tags: ["تنظيف", "سبراي"],
        mainImage: ELESSI_GARAGE_MEDIA.seatInterior,
        images: [
          ELESSI_GARAGE_MEDIA.seatInterior,
          ELESSI_GARAGE_MEDIA.engineBay,
          ELESSI_GARAGE_MEDIA.airFilterCloseup,
          ELESSI_GARAGE_MEDIA.oilBottles,
        ],
        variantSeed: {
          kind: "size",
          skuPrefix: "GF-SPRAY",
          options: [
            { code: "300ml", label: "300 مل" },
            { code: "500ml", label: "500 مل", price: 330, comparePrice: 390 },
          ],
        },
      },
    ],
  },
  {
    themeId: "elessi-sprout-room",
    galleryPool: [
      ELESSI_SPROUT_MEDIA.heroAloeStage,
      ELESSI_SPROUT_MEDIA.deskBonsai,
      ELESSI_SPROUT_MEDIA.succulentLedge,
      ELESSI_SPROUT_MEDIA.giftBonsaiCard,
      ELESSI_SPROUT_MEDIA.monsteraStage,
      ELESSI_SPROUT_MEDIA.succulentMacro,
    ],
    reviewFrame: {
      firstTitle: "النبات وصل بحالة ممتازة",
      firstLead: "وصف",
      secondTitle: "المقاس كان مطابقًا",
      secondLead: "صور",
    },
    orderProfile: {
      orderNumber: "SRT-2048",
      phone: "01071000010",
      customerName: "عميلة Sprout Room",
      paymentMethod: "wallet",
      status: "PROCESSING",
      shippingAddress: {
        governorate: "القاهرة",
        city: "المقطم",
        street: "الهضبة الوسطى 11",
        address: "الهضبة الوسطى 11، المقطم، القاهرة",
        addressLine1: "الهضبة الوسطى 11",
      },
    },
    cartSeeds: [
      {
        productIdOrSlug: "sprout-monstera-pot",
        quantity: 1,
        variantId: "sprout-monstera-pot-medium",
        attributes: {
          "الحجم": "أصيص متوسط",
        },
      },
      {
        productIdOrSlug: "sprout-ceramic-planter",
        quantity: 1,
        variantId: "sprout-ceramic-planter-sand-28",
        attributes: {
          "اللون": "رملي",
          "الحجم": "28 سم",
        },
      },
      {
        productIdOrSlug: "sprout-gift-bundle",
        quantity: 1,
        variantId: "sprout-gift-bundle-classic",
        attributes: {
          "الحجم": "Classic",
        },
      },
    ],
    categories: {
      home: { id: "home-plants", name: "نباتات منزلية", slug: "home-plants" },
      desk: { id: "desk-plants", name: "نباتات مكتب", slug: "desk-plants" },
      gifts: { id: "green-gifts", name: "هدايا خضراء", slug: "green-gifts" },
      pots: { id: "pots-addons", name: "أصص وإضافات", slug: "pots-addons" },
    },
    products: [
      {
        id: "sprout-monstera-pot",
        slug: "sprout-monstera-pot",
        name: "Sprout Monstera Pot",
        mainImage: ELESSI_SPROUT_MEDIA.monsteraStage,
        images: [
          ELESSI_SPROUT_MEDIA.monsteraStage,
          ELESSI_SPROUT_MEDIA.heroAloeStage,
          ELESSI_SPROUT_MEDIA.deskBonsai,
          ELESSI_SPROUT_MEDIA.succulentMacro,
        ],
        description: "مونستيرا منزلية بحجم واضح وصور أقرب للحقيقة مع مسار شراء أبسط.",
        categoryKey: "home",
        price: 780,
        comparePrice: 920,
        tags: ["منزل", "مونستيرا"],
        variantSeed: {
          kind: "size",
          skuPrefix: "SR-MONSTERA",
          options: [
            { code: "small", label: "أصيص صغير" },
            { code: "medium", label: "أصيص متوسط", price: 940, comparePrice: 1080 },
          ],
        },
      },
      {
        id: "sprout-zz-desk",
        slug: "sprout-zz-desk",
        name: "Sprout ZZ Desk",
        mainImage: ELESSI_SPROUT_MEDIA.deskBonsai,
        images: [
          ELESSI_SPROUT_MEDIA.deskBonsai,
          ELESSI_SPROUT_MEDIA.giftBonsaiCard,
          ELESSI_SPROUT_MEDIA.succulentMacro,
        ],
        description: "نبات مكتب صغير يسهّل الحسم ويخدم الطلبات الخفيفة والهدايا اليومية.",
        categoryKey: "desk",
        price: 390,
        comparePrice: 470,
        tags: ["مكتب", "صغير"],
        variantSeed: {
          kind: "size",
          skuPrefix: "SR-ZZ",
          options: [
            { code: "12cm", label: "12 سم" },
            { code: "18cm", label: "18 سم", price: 520, comparePrice: 610 },
          ],
        },
      },
      {
        id: "sprout-gift-bundle",
        slug: "sprout-gift-bundle",
        name: "Sprout Gift Bundle",
        mainImage: ELESSI_SPROUT_MEDIA.giftBonsaiCard,
        images: [
          ELESSI_SPROUT_MEDIA.giftBonsaiCard,
          ELESSI_SPROUT_MEDIA.deskBonsai,
          ELESSI_SPROUT_MEDIA.succulentLedge,
        ],
        description: "هدية نباتية جاهزة تجمع نباتًا مع أصيص وتغليف أخف على القرار.",
        categoryKey: "gifts",
        price: 990,
        comparePrice: 1180,
        tags: ["هدية", "Bundle"],
        variantSeed: {
          kind: "size",
          skuPrefix: "SR-GIFT",
          options: [
            { code: "classic", label: "Classic" },
            { code: "plus", label: "Plus", price: 1260, comparePrice: 1450 },
          ],
        },
      },
      {
        id: "sprout-ceramic-planter",
        slug: "sprout-ceramic-planter",
        name: "Sprout Ceramic Planter",
        mainImage: ELESSI_SPROUT_MEDIA.succulentMacro,
        images: [
          ELESSI_SPROUT_MEDIA.succulentMacro,
          ELESSI_SPROUT_MEDIA.monsteraStage,
          ELESSI_SPROUT_MEDIA.heroAloeStage,
        ],
        description: "أصيص سيراميك يرفع السلة مع النباتات ويجعل قسم الإضافات أوضح.",
        categoryKey: "pots",
        price: 460,
        comparePrice: 560,
        tags: ["أصيص", "سيراميك"],
        variantSeed: {
          kind: "config",
          skuPrefix: "SR-POT",
          options: [
            {
              code: "sand-28",
              label: "رملي / 28 سم",
              attributes: {
                "اللون": "رملي",
                "الحجم": "28 سم",
              },
            },
            {
              code: "olive-32",
              label: "زيتي / 32 سم",
              price: 620,
              comparePrice: 730,
              attributes: {
                "اللون": "زيتي",
                "الحجم": "32 سم",
              },
            },
          ],
        },
      },
      {
        id: "sprout-mist-spray",
        slug: "sprout-mist-spray",
        name: "Sprout Mist Spray",
        mainImage: ELESSI_SPROUT_MEDIA.succulentLedge,
        images: [
          ELESSI_SPROUT_MEDIA.succulentLedge,
          ELESSI_SPROUT_MEDIA.succulentMacro,
          ELESSI_SPROUT_MEDIA.heroAloeStage,
        ],
        description: "بخاخ رذاذ بسيط يشتغل كإضافة عملية للنباتات المنزلية والمكتبية.",
        categoryKey: "pots",
        price: 170,
        comparePrice: 220,
        tags: ["رذاذ", "عناية"],
        variantSeed: {
          kind: "color",
          skuPrefix: "SR-MIST",
          options: [
            { code: "clear", label: "شفاف" },
            { code: "amber", label: "عنبر" },
          ],
        },
      },
      {
        id: "sprout-hanging-vine",
        slug: "sprout-hanging-vine",
        name: "Sprout Hanging Vine",
        mainImage: ELESSI_SPROUT_MEDIA.heroAloeStage,
        images: [
          ELESSI_SPROUT_MEDIA.heroAloeStage,
          ELESSI_SPROUT_MEDIA.succulentLedge,
          ELESSI_SPROUT_MEDIA.deskBonsai,
        ],
        description: "نبات متدلٍ مناسب للزوايا والديكور ويكمل لغة الاكتشاف في هذا المتجر.",
        categoryKey: "home",
        price: 620,
        comparePrice: 740,
        tags: ["متدلٍ", "ديكور"],
        variantSeed: {
          kind: "size",
          skuPrefix: "SR-VINE",
          options: [
            { code: "basket", label: "سلة تعليق" },
            { code: "pot", label: "أصيص تعليق", price: 710, comparePrice: 830 },
          ],
        },
      },
    ],
  },
];

const previewSeedIds = THEME_PREVIEW_SEEDS.map((seed) => seed.themeId);
if (
  previewSeedIds.length !== ELESSI_PACK_THEME_IDS.length ||
  previewSeedIds.some((themeId, index) => themeId !== ELESSI_PACK_THEME_IDS[index])
) {
  throw new Error("Elessi preview dataset is out of sync with the registered Elessi theme pack.");
}

const ELESSI_PACK_THEME_BUNDLES = Object.fromEntries(
  THEME_PREVIEW_SEEDS.map((seed) => [seed.themeId, buildThemePreviewBundle(seed)]),
) as Record<string, ThemePreviewBundle>;

export const ELESSI_PACK_MARKETPLACE_THEME_IDS = [...ELESSI_PACK_THEME_IDS];

export const ELESSI_PACK_PRODUCTS: Record<string, Product[]> = Object.fromEntries(
  Object.entries(ELESSI_PACK_THEME_BUNDLES).map(([themeId, bundle]) => [
    themeId,
    bundle.products,
  ]),
);

export const ELESSI_PACK_RECOMMENDATIONS: Record<
  string,
  {
    related: Record<string, string[]>;
    boughtTogether: Record<string, string[]>;
  }
> = Object.fromEntries(
  Object.entries(ELESSI_PACK_THEME_BUNDLES).map(([themeId, bundle]) => [
    themeId,
    bundle.recommendations,
  ]),
);

export const ELESSI_PACK_REVIEWS: Record<
  string,
  Record<string, MarketplacePreviewProductReviewsResponse>
> = Object.fromEntries(
  Object.entries(ELESSI_PACK_THEME_BUNDLES).map(([themeId, bundle]) => [
    themeId,
    bundle.reviews,
  ]),
);

export const ELESSI_PACK_CART_SEEDS: Record<string, ElessiPreviewCartSeed[]> =
  Object.fromEntries(
    Object.entries(ELESSI_PACK_THEME_BUNDLES).map(([themeId, bundle]) => [
      themeId,
      bundle.cartSeeds,
    ]),
  );

export const ELESSI_PACK_ORDER_PROFILES: Record<
  string,
  ElessiPreviewOrderProfileSeed
> = Object.fromEntries(
  Object.entries(ELESSI_PACK_THEME_BUNDLES).map(([themeId, bundle]) => [
    themeId,
    bundle.orderProfile,
  ]),
);
