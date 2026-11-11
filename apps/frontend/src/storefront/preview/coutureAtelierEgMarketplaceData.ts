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

export const COUTURE_ATELIER_EG_PRODUCTS: Product[] = [
  {
    id: "couture-bordeaux-blazer",
    name: "بليزر كتان مصري معالج — بوردو كلاسيكي",
    slug: "couture-bordeaux-blazer",
    description: "بليزر تحريري بقصة انسيابية معالجة ضد التجعد السريع، منسوج من أنقى خيوط الكتان المصري المعمر ببطانة حريرية خفيفة وأزرار خشب زيتون طبيعية منحوتة يدوياً.",
    price: 2450,
    comparePrice: 2950,
    compareAtPrice: 2950,
    images: [
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1000&auto=format&fit=crop&q=80",
    ],
    category: {
      id: "blazers",
      name: "بليزرات وتفصيل راقٍ",
      slug: "blazers",
    },
    inventory: 14,
    tags: ["كتان مصري", "بوردو", "كوتور", "تفصيل يدوي"],
    rating: 4.95,
    reviewsCount: 38,
    isFeatured: true,
    editorialBadge: "كوتور أتيليه مصر",
    editorialNote: "نسيج كتان نقي بلون بوردو كلاسيكي معالج ضد التجعد وبطانة حريرية خفيفة تسمح بحرية الحركة طوال اليوم.",
    fitNote: "قصة مريحة مستقيمة تعطي حضوراً واثقاً ومقاس دقيق مطابق لجدول المقاسات المصري.",
    stylingNote: "ينسق بأناقة مع بنطال ستريت تراكوتا وحقيبة سادل جلد طبيعي لإطلالة متكاملة للمناسبات والعمل.",
    careNote: "تنظيف جاف أو غسيل يدوي بماء بارد ومكواة بخار خفيفة للحفاظ على رونق الألياف الطبيعية.",
    boutiqueFacts: [
      { label: "الخامة", value: "كتان مصري نقي 100% مع بطانة حريرية" },
      { label: "المنشأ", value: "ورش الأتيليه التراثية بالقاهرة" },
      { label: "المعاينة", value: "متاحة مع المندوب قبل الدفع النهائي" },
      { label: "الاستبدال", value: "فوري خلال 24 ساعة لباب بيتك" },
    ],
    attributes: {
      "الخامة": "كتان مصري نقي 100% مع بطانة حرير",
      "المنشأ": "ورش الأتيليه بالقاهرة",
      "المقاسات المتاحة": "38 (S), 40 (M), 42 (L), 44 (XL)",
    },
    productVariants: [
      { id: "var-bordeaux-s", name: "38 (S)", price: 2450, comparePrice: 2950, attributes: { "المقاس": "38 (S)" } },
      { id: "var-bordeaux-m", name: "40 (M)", price: 2450, comparePrice: 2950, attributes: { "المقاس": "40 (M)" } },
      { id: "var-bordeaux-l", name: "42 (L)", price: 2450, comparePrice: 2950, attributes: { "المقاس": "42 (L)" } },
      { id: "var-bordeaux-xl", name: "44 (XL)", price: 2450, comparePrice: 2950, attributes: { "المقاس": "44 (XL)" } },
    ],
  },
  {
    id: "couture-silk-slip-dress",
    name: "فستان الحرير الطبيعي الميدي — عاجي لؤلؤي",
    slug: "couture-silk-slip-dress",
    description: "فستان ماكسي انسيابي منسوج من الحرير التوتي الطبيعي مع خياطة مائلة تمنح انسيابية استثنائية مع حركة الجسم، مناسب للمناسبات والسهرات الهادئة.",
    price: 1950,
    comparePrice: 2400,
    compareAtPrice: 2400,
    images: [
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1000&auto=format&fit=crop&q=80",
    ],
    category: {
      id: "dresses",
      name: "فساتين وسهرات",
      slug: "dresses",
    },
    inventory: 9,
    tags: ["حرير طبيعي", "عاجي", "سهرات", "ميدي"],
    rating: 4.9,
    reviewsCount: 26,
    isFeatured: true,
    editorialBadge: "كوتور أتيليه مصر",
    editorialNote: "حرير توتي ناعم بلمعة هادئة غير مبتذلة، ينساب بخفة ونعومة فائقة.",
    fitNote: "قصة انسيابية مائلة تحتضن القوام بدون ضيق، مناسبة لجميع الأوقات.",
    stylingNote: "ينسق مع شال الكشمير المطرز وسوار النحاس المنحوت لإطلالة مسائية فاخرة.",
    careNote: "تنظيف جاف فقط للحفاظ على لمعة الحرير الطبيعي ونعومته.",
    boutiqueFacts: [
      { label: "الخامة", value: "حرير توتي طبيعي 100%" },
      { label: "القصة", value: "ميدي مائل انسيابي" },
      { label: "المعاينة", value: "تجربة المقاس مع المندوب متاحة" },
      { label: "التوصيل", value: "خلال 24-48 ساعة لجميع المحافظات" },
    ],
    productVariants: [
      { id: "var-silk-s", name: "38 (S)", price: 1950, comparePrice: 2400, attributes: { "المقاس": "38 (S)" } },
      { id: "var-silk-m", name: "40 (M)", price: 1950, comparePrice: 2400, attributes: { "المقاس": "40 (M)" } },
      { id: "var-silk-l", name: "42 (L)", price: 1950, comparePrice: 2400, attributes: { "المقاس": "42 (L)" } },
    ],
  },
  {
    id: "couture-sahara-leather-bag",
    name: "حقيبة سادل جلد عجل طبيعي — هافان دافئ",
    slug: "couture-sahara-leather-bag",
    description: "حقيبة يد كلاسيكية بتصميم السادل المنحوت، مصنوعة يدوياً من جلد العجل الطبيعي المدبوغ نباتياً مع حواف مصقولة بشمع العسل وإبزيم نحاسي مطفي.",
    price: 1850,
    comparePrice: 2250,
    compareAtPrice: 2250,
    images: [
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=1000&auto=format&fit=crop&q=80",
    ],
    category: {
      id: "leather",
      name: "جلود طبيعية",
      slug: "leather",
    },
    inventory: 11,
    tags: ["جلد طبيعي", "هافان", "نحاس يدوي", "حقائب"],
    rating: 4.88,
    reviewsCount: 42,
    isFeatured: true,
    editorialBadge: "صياغة يدوية",
    editorialNote: "جلد عجل طبيعي مدبوغ بخلاصات نباتية يكتسب جمالاً ورونقاً أعمق مع مرور السنين.",
    fitNote: "حجم عملي يستوعب الهاتف والمحفظة والمقتنيات اليومية مع حزام قابل للتعديل.",
    stylingNote: "تتناغم مع ألوان البوردو والتراكوتا والكتان العاجي بكل سلاسة.",
    careNote: "مسح بقطعة قماش ناعمة وبلسم جلود طبيعي مرة كل عدة أشهر.",
    boutiqueFacts: [
      { label: "الخامة", value: "جلد عجل طبيعي 100%" },
      { label: "الإبزيم", value: "نحاس أصفر مصقول يدوي" },
      { label: "الضمان", value: "ضمان جودة الخامات مدى الحياة" },
      { label: "المعاينة", value: "معاينة الجلد قبل الاستلام" },
    ],
  },
  {
    id: "couture-terracotta-trousers",
    name: "بنطال ستريت خصر عالي — تراكوتا دافئ",
    slug: "couture-terracotta-trousers",
    description: "قصة مستقيمة مريحة بأزرار صدفية طبيعية، مصنوعة من كتان مفرود ثقيل الوزن يمنح استقامة انسيابية أنيقة وثباتاً طوال اليوم.",
    price: 1350,
    comparePrice: 1650,
    compareAtPrice: 1650,
    images: [
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1000&auto=format&fit=crop&q=80",
    ],
    category: {
      id: "bottoms",
      name: "بنطلونات وتنانير",
      slug: "bottoms",
    },
    inventory: 20,
    tags: ["تراكوتا", "كتان", "خصر عالي"],
    rating: 4.85,
    reviewsCount: 31,
    isFeatured: true,
    editorialBadge: "كتان مصري",
    editorialNote: "كتان ثقيل الوزن منسوج بدقة ليحافظ على استقامة القصة دون تجعد مفرط.",
    fitNote: "خصر عالي مريح مع جيوب جانبية مخفية وحلقات حزام كلاسيكية.",
    stylingNote: "القطعة التكميلية المثالية لبليزر البوردو وقميص الكتان الأبيض.",
    careNote: "غسيل على البارد ومكواة بخار على حرارة متوسطة.",
    boutiqueFacts: [
      { label: "الخامة", value: "كتان طبيعي 100%" },
      { label: "الأزرار", value: "صدف طبيعي معالج" },
      { label: "المعاينة", value: "قياس متاح عند باب بيتك" },
      { label: "الاستبدال", value: "استبدال مقاس خلال 24 ساعة" },
    ],
    productVariants: [
      { id: "var-trouser-38", name: "38 (S)", price: 1350, comparePrice: 1650, attributes: { "المقاس": "38 (S)" } },
      { id: "var-trouser-40", name: "40 (M)", price: 1350, comparePrice: 1650, attributes: { "المقاس": "40 (M)" } },
      { id: "var-trouser-42", name: "42 (L)", price: 1350, comparePrice: 1650, attributes: { "المقاس": "42 (L)" } },
    ],
  },
  {
    id: "couture-cashmere-embroidered-shawl",
    name: "شال صوف كشميري مطرز يدوياً — أسود ليلي",
    slug: "couture-cashmere-embroidered-shawl",
    description: "شال واسع فاخر ناعم الملمس، مزين بتطريزات خيوط حريرية دقيقة على الحواف مستوحاة من التراث الهندسي المصري العريق.",
    price: 1650,
    comparePrice: 2100,
    compareAtPrice: 2100,
    images: [
      "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=1000&auto=format&fit=crop&q=80",
    ],
    category: {
      id: "accessories",
      name: "إكسسوارات وشيلان",
      slug: "accessories",
    },
    inventory: 8,
    tags: ["كشمير", "تطريز يدوي", "شال"],
    rating: 4.96,
    reviewsCount: 19,
    isFeatured: true,
    editorialBadge: "تطريز تراثي",
    editorialNote: "خيوط صوف كشميري دافئ وخفيف الوزن مع حواشٍ مطرزة بالحرير المصري الخالص.",
    fitNote: "أبعاد رحبة (200 × 75 سم) تسمح بلفه بعدة طرق كلاسيكية وعصرية.",
    stylingNote: "يضفي لمسة وقار فورية على فستان الحرير العاجي أو المعاطف المسائية.",
    careNote: "تنظيف جاف خفيف.",
    boutiqueFacts: [
      { label: "الخامة", value: "صوف كشميري وحرير طبيعي" },
      { label: "الأبعاد", value: "200 سم × 75 سم" },
      { label: "التغليف", value: "صندوق حفظ هدايا فاخر" },
      { label: "الشحن", value: "شحن مجاني لجميع المحافظات" },
    ],
  },
  {
    id: "couture-minimalist-leather-mule",
    name: "حذاء ميول جلد طبيعي مبطن — بيج رملي",
    slug: "couture-minimalist-leather-mule",
    description: "حذاء ميول بدون كعب مصنوع من جلد ناعم ومبطن بطبقة ميموري فوم توفر راحة تامة طوال اليوم، مع نعل خارجي متين من الجلد الطبيعي.",
    price: 1450,
    comparePrice: 1800,
    compareAtPrice: 1800,
    images: [
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=1000&auto=format&fit=crop&q=80",
    ],
    category: {
      id: "footwear",
      name: "أحذية وصنادل",
      slug: "footwear",
    },
    inventory: 15,
    tags: ["جلد طبيعي", "ميول", "راحة"],
    rating: 4.8,
    reviewsCount: 22,
    isFeatured: false,
    editorialBadge: "راحة يدوي",
    editorialNote: "جلد بقري طبيعي ناعم ومبطن يوفر خفة غير مسبوقة أثناء المشي.",
    fitNote: "مقاس مضبوط. إذا كنتِ بين مقاسين، ننصح باختيار المقاس الأكبر.",
    stylingNote: "يتماشى مع البنطلونات الكتان والفساتين الصيفية بأسلوب هادئ وراقٍ.",
    careNote: "تنظيف بإسفنجة رطبة ومستحلب جلد ناعم.",
    boutiqueFacts: [
      { label: "الخامة", value: "جلد طبيعي مدبوغ نباتياً" },
      { label: "النعل", value: "جلد طبيعي مع كعب مطاطي مانع للانزلاق" },
      { label: "المعاينة", value: "تجربة المقاس مع المندوب متاحة" },
      { label: "الاستبدال", value: "استبدال فوري للمقاس" },
    ],
  },
  {
    id: "couture-monochrome-wrap-trench",
    name: "ترنش كوت ربيعي بقصة لف — زيتوني مطفي",
    slug: "couture-monochrome-wrap-trench",
    description: "معطف كلاسيكي خفيف بقصة انسيابية عريضة وحزام خصر متناسق، منسوج من مزيج القطن والكتان المقاوم للرياح الخفيفة مع جيوب داخلية مخفية.",
    price: 2850,
    comparePrice: 3400,
    compareAtPrice: 3400,
    images: [
      "https://images.unsplash.com/photo-1525450824786-227cbef70703?w=1000&auto=format&fit=crop&q=80",
    ],
    category: {
      id: "outwear",
      name: "معاطف وترنش",
      slug: "outwear",
    },
    inventory: 7,
    tags: ["ترنش", "زيتوني", "قصة لف"],
    rating: 4.92,
    reviewsCount: 15,
    isFeatured: true,
    editorialBadge: "إصدار محدود",
    editorialNote: "معطف كلاسيكي عابر للمواسم يجمع بين خفة الكتان وهيكل القطن المتين.",
    fitNote: "قصة واسعة مريحة تتيح ارتداء طبقات أسفله بكل سهولة.",
    stylingNote: "يرتدى مفتوحاً أو ملفوفاً بالحزام لإبراز الخصر.",
    careNote: "تنظيف جاف.",
    boutiqueFacts: [
      { label: "الخامة", value: "كتان وقطن مصري معالج" },
      { label: "البطانة", value: "حريرية جزئية خفيفة" },
      { label: "المعاينة", value: "معاينة منزلية متاحة قبل الدفع" },
      { label: "الشحن", value: "توصيل خلال 24 ساعة" },
    ],
  },
  {
    id: "couture-sculpted-brass-cuff",
    name: "سوار نحاسي منحوت يدوياً — تشطيب عتيق",
    slug: "couture-sculpted-brass-cuff",
    description: "قطعة فنية يدوية مصوغة من النحاس الأصفر المعالج، مصممة بحواف غير متماثلة تمنح معصمك لمسة أثرية معاصرة.",
    price: 850,
    comparePrice: 1100,
    compareAtPrice: 1100,
    images: [
      "https://images.unsplash.com/photo-1537832816519-689ad163238b?w=1000&auto=format&fit=crop&q=80",
    ],
    category: {
      id: "accessories",
      name: "إكسسوارات وشيلان",
      slug: "accessories",
    },
    inventory: 25,
    tags: ["نحاس يدوي", "إكسسوارات", "حرفية"],
    rating: 4.87,
    reviewsCount: 18,
    isFeatured: false,
    editorialBadge: "صياغة تراثية",
    editorialNote: "صياغة نحاسية يدوية بأيدي أمهر حرفيي القاهرة القديمة بتشطيب مطفي مقاوم لتغير اللون.",
    fitNote: "مرن بلطف ليتكيف بدقة مع حجم معصمك.",
    stylingNote: "قطعة بيان مميزة ترتدى منفردة لتسليط الضوء على فخامتها.",
    careNote: "حفظ في الكيس المخملي المرفق وتجنب رشه المباشر بالعطور.",
    boutiqueFacts: [
      { label: "المعدن", value: "نحاس أصفر خالص معالج" },
      { label: "التشطيب", value: "يدوي عتيق غير لامع" },
      { label: "العلبة", value: "مرفق بكيس مخمل وصندوق هدايا" },
      { label: "الضمان", value: "ضمان ثبات اللون 3 سنوات" },
    ],
  },
];

export const COUTURE_ATELIER_EG_RECOMMENDATIONS = {
  related: {
    "couture-bordeaux-blazer": ["couture-terracotta-trousers", "couture-sahara-leather-bag"],
    "couture-silk-slip-dress": ["couture-cashmere-embroidered-shawl", "couture-sculpted-brass-cuff"],
    "couture-sahara-leather-bag": ["couture-bordeaux-blazer", "couture-minimalist-leather-mule"],
    "couture-terracotta-trousers": ["couture-bordeaux-blazer", "couture-minimalist-leather-mule"],
  },
  boughtTogether: {
    "couture-bordeaux-blazer": ["couture-terracotta-trousers", "couture-sahara-leather-bag"],
    "couture-silk-slip-dress": ["couture-cashmere-embroidered-shawl"],
  },
};

export const COUTURE_ATELIER_EG_REVIEWS: Record<
  string,
  MarketplacePreviewProductReviewsResponse
> = {
  "couture-bordeaux-blazer": buildMarketplacePreviewReviewsResponse([
    {
      id: "rev-c1",
      author: "نوران الشريف (الشيخ زايد)",
      date: "منذ أسبوعين",
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      rating: 5,
      title: "تفصيل وخامة فوق الوصف",
      comment: "الكتان وزنه محترم ومش بيتكسر بسرعة زي الأنواع التجارية. البطانة الحريرية مريحة جداً والمقاس مظبوط بالمللي. الاستبدال السريع عجبني جداً.",
      verified: true,
      helpfulCount: 16,
    },
    {
      id: "rev-c2",
      author: "د. هبة عبد المنعم (مصر الجديدة)",
      date: "منذ شهر",
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      rating: 5,
      title: "أناقة وقيمة تستحق السعر",
      comment: "حرفياً قطعة تعيش في الدولاب سنين. اللون البوردو عميق وفخم وكل الناس في شغلي سألتني عليه.",
      verified: true,
      helpfulCount: 9,
    },
  ]),
  "couture-silk-slip-dress": buildMarketplacePreviewReviewsResponse([
    {
      id: "rev-c3",
      author: "فريدة منصور (المعادي)",
      date: "منذ 10 أيام",
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      rating: 5,
      title: "الحرير لمعته راقية وهادية",
      comment: "مش لامع بطريقة مبتذلة، لمعة مطفية راقية جداً وناعم على البشرة في الصيف. تجربة الشراء كانت سلسة جداً.",
      verified: true,
      helpfulCount: 12,
    },
  ]),
};
