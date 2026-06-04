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

const buildFashionImage = (photoId: string, width = 1200) =>
  `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&q=80`;

const KHEMET_PLACEHOLDER_BASE = "/placeholders/luxury-shoes";
const buildKhemetPlaceholderImage = (asset: string) =>
  `${KHEMET_PLACEHOLDER_BASE}/${asset}`;
const buildKhemetRollingSaleEndDate = () => {
  const saleEndDate = new Date();
  saleEndDate.setDate(saleEndDate.getDate() + 7);
  saleEndDate.setHours(23, 59, 59, 999);
  return saleEndDate.toISOString();
};

const reviewImage = (url: string, alt: string) => [{ type: "image" as const, url, alt }];
const reviewVideo = (url: string, poster: string, alt: string) => [
  { type: "video" as const, url, poster, alt },
];

const khemetCategories = {
  sneakers: {
    id: "sneakers",
    name: "سنيكرز حريمي",
    slug: "sneakers",
  },
  flats: {
    id: "flats",
    name: "فلات ولوفر",
    slug: "flats",
  },
  heels: {
    id: "heels",
    name: "كعب ومساء",
    slug: "heels",
  },
  sandals: {
    id: "sandals",
    name: "صنادل",
    slug: "sandals",
  },
} as const;

const KHEMET_GALLERIES = {
  "khemet-luxe-eg-cloud-sneaker": [
    buildKhemetPlaceholderImage("sneaker-white.png"),
    buildFashionImage("1600185365483-26d7a4cc7519"),
    buildFashionImage("1543163521-1bf539c55dd2"),
    buildFashionImage("1556906781-9a412961c28c"),
  ],
  "khemet-pearl-runner": [
    buildKhemetPlaceholderImage("sneaker-white.png"),
    buildFashionImage("1542291026-7eec264c27ff"),
    buildFashionImage("1554062097-69c634085c6d"),
    buildFashionImage("1621315271772-28b1f3a5df87"),
  ],
  "khemet-sand-ballet": [
    buildKhemetPlaceholderImage("flats.png"),
    buildFashionImage("1556004583-d2aaffbba592"),
    buildFashionImage("1616406432452-07bc5938759d"),
    buildFashionImage("1662541089338-c7d53b88be70"),
  ],
  "khemet-cairo-loafer": [
    buildKhemetPlaceholderImage("flats.png"),
    buildFashionImage("1487412720507-e7ab37603c6f"),
    buildFashionImage("1496747611176-843222e1e57c"),
    buildFashionImage("1515886657613-9f3515b0c78f"),
  ],
  "khemet-sunset-heel": [
    buildKhemetPlaceholderImage("pump-black.png"),
    buildFashionImage("1559334418-672d5a48531b"),
    buildFashionImage("1554062097-69c634085c6d"),
    buildFashionImage("1543163521-1bf539c55dd2"),
  ],
  "khemet-nile-slide": [
    buildKhemetPlaceholderImage("sneakers.png"),
    buildFashionImage("1600185365483-26d7a4cc7519"),
    buildFashionImage("1552346154-21d32810aba3"),
    buildFashionImage("1543163521-1bf539c55dd2"),
  ],
  "khemet-ivory-court": [
    buildKhemetPlaceholderImage("sneaker-white.png"),
    buildFashionImage("1542291026-7eec264c27ff"),
    buildFashionImage("1600185365483-26d7a4cc7519"),
    buildFashionImage("1621315271772-28b1f3a5df87"),
  ],
  "khemet-desert-strap": [
    buildKhemetPlaceholderImage("sneakers.png"),
    buildFashionImage("1552346154-21d32810aba3"),
    buildFashionImage("1616406432452-07bc5938759d"),
    buildFashionImage("1662541089338-c7d53b88be70"),
  ],
  "khemet-mocha-slingback": [
    buildKhemetPlaceholderImage("pump-black.png"),
    buildFashionImage("1559334418-672d5a48531b"),
    buildFashionImage("1554062097-69c634085c6d"),
    buildFashionImage("1543163521-1bf539c55dd2"),
  ],
  "khemet-dune-mule": [
    buildKhemetPlaceholderImage("flats.png"),
    buildFashionImage("1556004583-d2aaffbba592"),
    buildFashionImage("1487412720507-e7ab37603c6f"),
    buildFashionImage("1496747611176-843222e1e57c"),
  ],
  "khemet-midnight-runner": [
    buildKhemetPlaceholderImage("sneaker-white.png"),
    buildFashionImage("1554062097-69c634085c6d"),
    buildFashionImage("1600185365483-26d7a4cc7519"),
    buildFashionImage("1543163521-1bf539c55dd2"),
  ],
  "khemet-onyx-pump": [
    buildKhemetPlaceholderImage("pump-black.png"),
    buildFashionImage("1559334418-672d5a48531b"),
    buildFashionImage("1543163521-1bf539c55dd2"),
    buildFashionImage("1621315271772-28b1f3a5df87"),
  ],
} as const;

type VariantStyleOption = {
  code: string;
  label: string;
  image: string;
  price?: number;
  comparePrice?: number;
};

type VariantColorOption = {
  code: string;
  label: string;
  swatchImage: string;
  price?: number;
  comparePrice?: number;
};

const buildStyleColorSizeVariants = (
  productId: string,
  skuPrefix: string,
  styles: VariantStyleOption[],
  colors: VariantColorOption[],
  sizes: string[],
  basePrice: number,
  baseComparePrice: number,
) =>
  styles.flatMap((style, styleIndex) =>
    colors.flatMap((color, colorIndex) =>
      sizes.map((size, sizeIndex) => ({
        id: `${productId}-${style.code}-${color.code}-${size}`,
        name: `${style.label} / ${color.label} / ${size}`,
        price: style.price ?? color.price ?? basePrice,
        comparePrice: style.comparePrice ?? color.comparePrice ?? baseComparePrice,
        sku: `${skuPrefix}-${style.code.toUpperCase()}-${color.code.toUpperCase()}-${size}`,
        image: style.image,
        images: [style.image, color.swatchImage],
        stock: Math.max(2, 16 - styleIndex * 3 - colorIndex * 2 - sizeIndex),
        attributes: {
          الطراز: style.label,
          اللون: color.label,
          المقاس: size,
        },
        attributeValues: {
          الطراز: style.label,
          اللون: color.label,
          المقاس: size,
        },
      })),
    ),
  );

const CLOUD_STYLE_OPTIONS: VariantStyleOption[] = [
  {
    code: "run-luxe",
    label: "Run-Luxe",
    image: KHEMET_GALLERIES["khemet-luxe-eg-cloud-sneaker"][0],
  },
  {
    code: "heritage-low",
    label: "Heritage Low",
    image: KHEMET_GALLERIES["khemet-luxe-eg-cloud-sneaker"][1],
    price: 2590,
    comparePrice: 3250,
  },
  {
    code: "casual-edit",
    label: "Casual Edit",
    image: KHEMET_GALLERIES["khemet-luxe-eg-cloud-sneaker"][2],
    price: 2390,
    comparePrice: 2990,
  },
];

const CLOUD_COLOR_OPTIONS: VariantColorOption[] = [
  {
    code: "ivory",
    label: "Ivory Pearl",
    swatchImage: KHEMET_GALLERIES["khemet-luxe-eg-cloud-sneaker"][0],
  },
  {
    code: "gold",
    label: "Soft Gold",
    swatchImage: KHEMET_GALLERIES["khemet-luxe-eg-cloud-sneaker"][2],
    price: 2520,
    comparePrice: 3180,
  },
  {
    code: "stone",
    label: "Stone Beige",
    swatchImage: KHEMET_GALLERIES["khemet-luxe-eg-cloud-sneaker"][3],
  },
];

const CLOUD_VARIANTS = buildStyleColorSizeVariants(
  "khemet-luxe-eg-cloud-sneaker",
  "KHE-CLOUD",
  CLOUD_STYLE_OPTIONS,
  CLOUD_COLOR_OPTIONS,
  ["37", "38", "39", "40"],
  2450,
  3100,
);

const buildSimpleProduct = ({
  id,
  slug,
  name,
  description,
  categoryKey,
  price,
  comparePrice,
  tags = [],
  rating = 4.7,
  reviewCount = 4,
  soldCount = 4,
  activeCartCount = 6,
  viewerCount = activeCartCount,
  recentOrderCount = 3,
  variants = [],
  stock = 8,
}: {
  id: keyof typeof KHEMET_GALLERIES;
  slug: string;
  name: string;
  description: string;
  categoryKey: keyof typeof khemetCategories;
  price: number;
  comparePrice?: number;
  tags?: string[];
  rating?: number;
  reviewCount?: number;
  soldCount?: number;
  activeCartCount?: number;
  viewerCount?: number;
  recentOrderCount?: number;
  variants?: Array<Record<string, unknown>>;
  stock?: number;
}): Product => {
  const category = khemetCategories[categoryKey];
  const images = KHEMET_GALLERIES[id];

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
    category,
    tags,
    stock,
    rating,
    reviewCount,
    soldCount,
    activeCartCount,
    viewerCount,
    recentOrderCount,
    socialProof: {
      soldCount,
      activeCartCount,
      viewerCount,
      recentOrderCount,
      orderCount: soldCount,
    },
    productVariants: variants,
    variants,
  };
};

export const KHEMET_LUXE_PRODUCTS: Product[] = [
  {
    ...buildSimpleProduct({
      id: "khemet-luxe-eg-cloud-sneaker",
      slug: "khemet-luxe-eg-cloud-sneaker",
      name: "KHEMET Cloud Sneaker",
      description: `
        <p>سنيكرز نسائي جلدي بخطوط هادئة ومزج واضح بين الراحة اليومية والحضور الفاخر. استوحينا صفحة هذا المنتج من تدفق Elessi الكامل: اختيار الطراز واللون والمقاس، تخصيص بسيط، ثم عناصر خدمة واضحة قبل الحسم.</p>
        <p>الهيكل الخارجي من جلد طبيعي مصري، والبطانة مريحة للاستخدام الطويل، مع نعل مرن يناسب الحركة داخل المدينة. هذا الموديل معمول لليوم الممتد: شغل، مشاوير، وخروجة ليلية خفيفة بنفس الزوج.</p>
        <p>لو تحبين التفاصيل التي تشعرك أن الصفحة مكتملة قبل الشراء، ستجدي هنا المقاس، التوصيل، الاستبدال، المراجعات، الضمان، واقتراحات من نفس الدار كلها مجمّعة حول قرار الشراء نفسه.</p>
      `,
      categoryKey: "sneakers",
      price: 2450,
      comparePrice: 3100,
      tags: ["جلد طبيعي", "Best Seller", "Limited"],
      rating: 4.75,
      reviewCount: 8,
      soldCount: 6,
      activeCartCount: 11,
      viewerCount: 55,
      recentOrderCount: 6,
      variants: CLOUD_VARIANTS,
      stock: 14,
    }),
    sku: "KHE-CLOUD-02",
    brandName: "KHEMET Atelier",
    brandSubtitle: "دار أحذية صنعت في القاهرة",
    brandUrl: "/collections",
    personalizationEnabled: true,
    metadata: {
      sku: "KHE-CLOUD-02",
      variantSettings: {
        styles: {
          الطراز: "thumbnails",
          اللون: "circles",
          المقاس: "radio",
        },
        attributeImages: {
          الطراز: {
            "Run-Luxe": KHEMET_GALLERIES["khemet-luxe-eg-cloud-sneaker"][0],
            "Heritage Low": KHEMET_GALLERIES["khemet-luxe-eg-cloud-sneaker"][1],
            "Casual Edit": KHEMET_GALLERIES["khemet-luxe-eg-cloud-sneaker"][2],
          },
        },
      },
      specs: [
        { label: "الخامة", value: "جلد طبيعي مع بطانة ناعمة قابلة للتنفس" },
        { label: "الارتفاع", value: "قاعدة 3.2 سم مريحة للمشي اليومي" },
        { label: "اللون", value: "درجات هادئة مهيأة للنهار والمساء" },
        { label: "التجهيز", value: "إنتاج محدود مع تشطيب يدوي نهائي" },
      ],
      commandFacts: [
        { label: "الطراز", value: "ثلاث قراءات لنفس الموديل داخل الصفحة" },
        { label: "الخدمة", value: "استبدال مقاس ودعم واضح قبل الطلب" },
        { label: "التخصيص", value: "نقش أحرف بسيط على الكعب الخلفي" },
        { label: "الاستلام", value: "تأكيد المقاس ثم تجهيز سريع داخل مصر" },
      ],
      decisionProofs: [
        {
          label: "راحة اللبس",
          title: "نعل مرن ووزن أخف",
          description:
            "التصميم مهيأ للحركة اليومية بدون الإحساس بثقل السنيكرز الكبير أو القاعدة الجامدة.",
        },
        {
          label: "مظهر القطعة",
          title: "حضور فاخر لكن هادئ",
          description:
            "الجلد والخياطة الهادئة يعطون الإحساس المرتب نفسه سواء لبسته مع بنطلون واسع أو فستان كاجوال.",
        },
        {
          label: "قرار الشراء",
          title: "تفاصيل ما بعد الطلب ظاهرة مبكرًا",
          description:
            "المقاس، الشحن، الاستبدال، والضمان ظاهرون حول زر الشراء بدل أن يكونوا مخفيين في صفحات أخرى.",
        },
      ],
      supportSections: [
        {
          label: "الضمان",
          title: "365 يوم ضد العيوب الصناعية",
          description:
            "إذا ظهر عيب صناعة في الهيكل أو الخياطة أو التثبيت خلال سنة من الشراء، نراجع الحالة ونتعامل معها كضمان تصنيع حقيقي.",
        },
        {
          label: "الخدمة",
          title: "إصلاح وتشطيب بعد الاستخدام",
          description:
            "لدينا خدمة صيانة خفيفة وتغيير أربطة أو إعادة تشطيب عند الحاجة حتى يظل الزوج محتفظًا بحضوره لأطول فترة.",
        },
        {
          label: "الاستبدال",
          title: "استبدال مقاس خلال 14 يومًا",
          description:
            "إذا كان المقاس غير مناسب يمكنك طلب الاستبدال طالما المنتج غير مستخدم خارج التجربة المنزلية.",
        },
      ],
      featureHighlights: [
        {
          title: "بطانة جلدية ناعمة",
          description: "أريح في اللبس الطويل ولا يسبب إحساسًا خشنًا حول الكاحل.",
        },
        {
          title: "قاعدة تمتص الحركة",
          description: "توازن بين الثبات اليومي وإحساس أخف أثناء المشي.",
        },
        {
          title: "تشطيب يدوي نهائي",
          description: "كل زوج يمر على لمسة تشطيب أخيرة قبل التغليف والشحن.",
        },
      ],
      safeCheckoutItems: [
        "دفع آمن ومشفّر",
        "دفع عند الاستلام متاح",
        "تأكيد المقاس واللون قبل التجهيز",
      ],
      saleEndDate: buildKhemetRollingSaleEndDate(),
      brandSpotlight: {
        title: "KHEMET Pearl Runner",
        href: "/store/product/khemet-pearl-runner",
        image: KHEMET_GALLERIES["khemet-pearl-runner"][0],
        price: 2650,
      },
      personalization: {
        title: "تخصيص بسيط على القطعة؟",
        subtitle:
          "أضيفي أحرفًا قصيرة أو اسمًا مختصرًا على الكعب الخلفي مع اختيار نوع الخط ولون النقش.",
        textLabel: "أضيفي النص أو الأحرف",
        textPlaceholder: "مثال: SA أو NOUR",
        maxLength: 12,
        fields: [
          {
            key: "fontType",
            label: "نوع الخط",
            options: ["Noto Serif", "Tahoma", "IBM Plex Sans Arabic", "Manrope"],
          },
          {
            key: "fontColor",
            label: "لون النقش",
            options: ["ذهبي", "فضي", "أبيض", "أسود"],
          },
          {
            key: "orientation",
            label: "اتجاه النقش",
            options: ["طولي", "عرضي"],
          },
        ],
      },
    },
    trustedBadgeItems: [
      "شحن داخل مصر خلال 48 ساعة",
      "جلد طبيعي 100%",
      "استبدال مقاس واضح",
    ],
  },
  buildSimpleProduct({
    id: "khemet-pearl-runner",
    slug: "khemet-pearl-runner",
    name: "KHEMET Pearl Runner",
    description:
      "سنيكرز يومي بدرجة لؤلؤية أوضح، مناسب للمشاوير والعمل واللبس المتكرر.",
    categoryKey: "sneakers",
    price: 2280,
    comparePrice: 2790,
    tags: ["Pearl", "Everyday"],
    rating: 4.7,
    reviewCount: 5,
    soldCount: 4,
    activeCartCount: 7,
    recentOrderCount: 3,
    stock: 9,
  }),
  buildSimpleProduct({
    id: "khemet-sand-ballet",
    slug: "khemet-sand-ballet",
    name: "KHEMET Sand Ballet",
    description:
      "فلات جلدي بدرجة بيج رملي لتوازن أسهل بين الراحة والهدوء البصري داخل اللبس اليومي.",
    categoryKey: "flats",
    price: 1890,
    comparePrice: 2290,
    tags: ["Flats", "Daywear"],
    rating: 4.6,
    reviewCount: 4,
    soldCount: 3,
    activeCartCount: 5,
    recentOrderCount: 2,
    stock: 7,
  }),
  buildSimpleProduct({
    id: "khemet-cairo-loafer",
    slug: "khemet-cairo-loafer",
    name: "KHEMET Cairo Loafer",
    description:
      "لوفر هادئ للجامعة والعمل والمشاوير اليومية بخط أنظف ولمعة أقل.",
    categoryKey: "flats",
    price: 2140,
    comparePrice: 2590,
    tags: ["Loafer", "Office"],
    rating: 4.8,
    reviewCount: 6,
    soldCount: 5,
    activeCartCount: 8,
    recentOrderCount: 4,
    stock: 10,
  }),
  buildSimpleProduct({
    id: "khemet-sunset-heel",
    slug: "khemet-sunset-heel",
    name: "KHEMET Sunset Heel",
    description:
      "كعب متوسط للمساء والمناسبات الخفيفة مع خط أنيق وخامة أكثر هدوءًا من الكعب اللامع المعتاد.",
    categoryKey: "heels",
    price: 2720,
    comparePrice: 3350,
    tags: ["Evening", "Heel"],
    rating: 4.7,
    reviewCount: 5,
    soldCount: 4,
    activeCartCount: 6,
    recentOrderCount: 3,
    stock: 6,
  }),
  buildSimpleProduct({
    id: "khemet-nile-slide",
    slug: "khemet-nile-slide",
    name: "KHEMET Nile Slide",
    description:
      "صندل خفيف بنعل مريح للمشاوير الصيفية والرحلات القصيرة مع جلد أهدأ ولمسة دار أوضح.",
    categoryKey: "sandals",
    price: 1640,
    comparePrice: 1990,
    tags: ["Slide", "Summer"],
    rating: 4.5,
    reviewCount: 3,
    soldCount: 2,
    activeCartCount: 4,
    recentOrderCount: 2,
    stock: 12,
  }),
  buildSimpleProduct({
    id: "khemet-ivory-court",
    slug: "khemet-ivory-court",
    name: "KHEMET Ivory Court",
    description:
      "سنيكرز أبيض أنظف بخط أكثر هدوءًا للجامعة والعمل والمشاوير اليومية مع حضور مرتب وسهل التنسيق.",
    categoryKey: "sneakers",
    price: 2360,
    comparePrice: 2890,
    tags: ["Court", "Everyday"],
    rating: 4.7,
    reviewCount: 5,
    soldCount: 4,
    activeCartCount: 6,
    recentOrderCount: 3,
    stock: 11,
  }),
  buildSimpleProduct({
    id: "khemet-desert-strap",
    slug: "khemet-desert-strap",
    name: "KHEMET Desert Strap",
    description:
      "صندل سيور بلون رملي للمشاوير الصيفية والسفر الخفيف، بنعل أكثر راحة ولمسة دار أوضح من الصنادل العامة.",
    categoryKey: "sandals",
    price: 1780,
    comparePrice: 2190,
    tags: ["Strap", "Summer"],
    rating: 4.6,
    reviewCount: 4,
    soldCount: 3,
    activeCartCount: 5,
    recentOrderCount: 2,
    stock: 9,
  }),
  buildSimpleProduct({
    id: "khemet-mocha-slingback",
    slug: "khemet-mocha-slingback",
    name: "KHEMET Mocha Slingback",
    description:
      "كعب Slingback بدرجة موكا للمساء الخفيف والمناسبات الهادئة مع خط أنيق أسهل في التنسيق.",
    categoryKey: "heels",
    price: 2840,
    comparePrice: 3490,
    tags: ["Slingback", "Evening"],
    rating: 4.8,
    reviewCount: 5,
    soldCount: 4,
    activeCartCount: 6,
    recentOrderCount: 3,
    stock: 7,
  }),
  buildSimpleProduct({
    id: "khemet-dune-mule",
    slug: "khemet-dune-mule",
    name: "KHEMET Dune Mule",
    description:
      "مول جلدي مفتوح من الخلف بإحساس خفيف ومرتب، مناسب للنهار الطويل والطلعات السريعة.",
    categoryKey: "flats",
    price: 1980,
    comparePrice: 2430,
    tags: ["Mule", "Daywear"],
    rating: 4.6,
    reviewCount: 4,
    soldCount: 3,
    activeCartCount: 5,
    recentOrderCount: 2,
    stock: 8,
  }),
  buildSimpleProduct({
    id: "khemet-midnight-runner",
    slug: "khemet-midnight-runner",
    name: "KHEMET Midnight Runner",
    description:
      "سنيكرز بخط أغمق قليلًا ولمسة أكثر حضورا، مناسب للبس اليومي حين تريدين قطعة أوضح لكن بدون مبالغة.",
    categoryKey: "sneakers",
    price: 2420,
    comparePrice: 2960,
    tags: ["Runner", "Limited"],
    rating: 4.7,
    reviewCount: 5,
    soldCount: 4,
    activeCartCount: 7,
    recentOrderCount: 3,
    stock: 10,
  }),
  buildSimpleProduct({
    id: "khemet-onyx-pump",
    slug: "khemet-onyx-pump",
    name: "KHEMET Onyx Pump",
    description:
      "Pump أسود بخط أنحف ولمعة أقل، مناسب للمساء الرسمي وللإطلالات التي تحتاج حضورًا أنيقًا وواضحًا.",
    categoryKey: "heels",
    price: 2890,
    comparePrice: 3540,
    tags: ["Pump", "Night Edit"],
    rating: 4.8,
    reviewCount: 6,
    soldCount: 4,
    activeCartCount: 6,
    recentOrderCount: 3,
    stock: 8,
  }),
];

export const KHEMET_LUXE_RECOMMENDATIONS = {
  related: {
    "khemet-luxe-eg-cloud-sneaker": [
      "khemet-pearl-runner",
      "khemet-cairo-loafer",
      "khemet-sand-ballet",
      "khemet-sunset-heel",
    ],
  },
  boughtTogether: {
    "khemet-luxe-eg-cloud-sneaker": [
      "khemet-cairo-loafer",
      "khemet-nile-slide",
    ],
  },
} as const;

export const KHEMET_LUXE_REVIEWS = {
  "khemet-luxe-eg-cloud-sneaker": buildMarketplacePreviewReviewsResponse([
    {
      id: "khemet-cloud-review-1",
      author: "سارة خالد",
      date: "2026-04-15",
      createdAt: "2026-04-15",
      rating: 5,
      title: "المقاس والشكل مطابقين",
      comment:
        "أكثر شيء فرق معي إن الصفحة أوضحت المقاس والخامة والخدمة في نفس المكان. الحذاء نفسه مريح جدًا والشكل أنيق فعلًا.",
      verified: true,
      helpfulCount: 298,
      media: reviewImage(
        KHEMET_GALLERIES["khemet-luxe-eg-cloud-sneaker"][0],
        "تفصيلة أمامية من العميلة",
      ),
    },
    {
      id: "khemet-cloud-review-2",
      author: "مريم سامح",
      date: "2026-04-18",
      createdAt: "2026-04-18",
      rating: 5,
      title: "التخصيص طلع مرتب جدًا",
      comment:
        "جربت إضافة الأحرف على الكعب الخلفي وده خلّى القطعة أحلى بكتير. الصور كانت صادقة والخامة واضحة من أول مرة.",
      verified: true,
      helpfulCount: 82,
      media: reviewVideo(
        "https://elessi.nasatheme.com/wp-content/uploads/2024/09/video_review.mp4",
        KHEMET_GALLERIES["khemet-luxe-eg-cloud-sneaker"][1],
        "فيديو مراجعة سريع",
      ),
    },
    {
      id: "khemet-cloud-review-3",
      author: "نورا عادل",
      date: "2026-04-20",
      createdAt: "2026-04-20",
      rating: 5,
      title: "مريح من أول لبسة",
      comment:
        "كنت متخوفة من السنيكرز الجلد، لكن البطانة كانت مريحة جدًا والمقاس true to size. فعليًا لبسته يوم طويل من غير تعب.",
      verified: true,
      helpfulCount: 172,
      media: reviewImage(
        KHEMET_GALLERIES["khemet-luxe-eg-cloud-sneaker"][2],
        "القطعة في الاستخدام اليومي",
      ),
    },
    {
      id: "khemet-cloud-review-4",
      author: "ياسمين فؤاد",
      date: "2026-04-22",
      createdAt: "2026-04-22",
      rating: 5,
      title: "الخدمة قبل وبعد الشراء ممتازة",
      comment:
        "احتجت أستفسر عن المقاس وجاوبوني بسرعة، وبعد الاستلام حسيت فعلًا إن سياسة الاستبدال واضحة ومطمئنة.",
      verified: true,
      helpfulCount: 84,
      media: reviewImage(
        KHEMET_GALLERIES["khemet-luxe-eg-cloud-sneaker"][3],
        "تفصيلة جانبية من العميلة",
      ),
    },
    {
      id: "khemet-cloud-review-5",
      author: "هبة شريف",
      date: "2026-04-23",
      createdAt: "2026-04-23",
      rating: 5,
      title: "صور المنتج حسمت القرار",
      comment:
        "الطرازات الثلاثة في الاختيار المصور ساعدتني أفهم الفرق فعلًا وأختار النسخة المناسبة بدل ما أشتري وأنا مترددة.",
      verified: true,
      helpfulCount: 56,
    },
    {
      id: "khemet-cloud-review-6",
      author: "ندى وائل",
      date: "2026-04-24",
      createdAt: "2026-04-24",
      rating: 5,
      title: "ينفع للشغل والخروج",
      comment:
        "لبسته على بنطلون واسع وعلى فستان كاجوال، وفي الحالتين الشكل طلع مرتب جدًا ومش رياضي زيادة عن اللزوم.",
      verified: true,
      helpfulCount: 41,
    },
    {
      id: "khemet-cloud-review-7",
      author: "رحاب عمرو",
      date: "2026-04-25",
      createdAt: "2026-04-25",
      rating: 4,
      title: "احتجت المقاس الأكبر",
      comment:
        "أنا بين مقاسين فاختيار المقاس الأكبر كان أنسب كما هو مكتوب في الصفحة. غير كده التجربة ممتازة والشكل فعليًا راقٍ.",
      verified: true,
      helpfulCount: 37,
    },
    {
      id: "khemet-cloud-review-8",
      author: "ملك فؤاد",
      date: "2026-04-26",
      createdAt: "2026-04-26",
      rating: 4,
      title: "أنصح به لو تحبين الهدوء",
      comment:
        "مش صاخب بصريًا زي موديلات كثيرة، وده كان السبب الأساسي في اختياري له. تمنيت فقط ألوان أكثر لكن النسخة الحالية ممتازة.",
      verified: true,
      helpfulCount: 22,
    },
  ]),
} as const;
