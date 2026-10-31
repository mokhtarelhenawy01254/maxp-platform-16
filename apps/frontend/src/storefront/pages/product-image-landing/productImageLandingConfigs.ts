import type {
  LandingFormState,
  ProductLandingConfig,
} from "./productImageLandingTypes";

export const PRODUCT_IMAGE_LANDING_CONFIGS: Record<string, ProductLandingConfig> = {
  "swan-high-skotch": {
    fallbackProduct: {
      id: "cmnhn780v2ox7jupujeqof30t",
      companyId: "cmleybpf70028juo2wwpmp8rt",
      name: "Swan High Skotch",
      slug: "swan-high-skotch",
      description:
        "Swan High Skotch حذاء رياضي حريمي بفيلكرو، نعل منصة سميك، جلد صناعي ناعم، وألوان متعددة للبس اليومي.",
      price: 499,
      images: [
        "https://swan.maxp.online/uploads/products/product-fbd3d1f7-2d8d-4653-a313-0be09dc968a6.JPG",
      ],
      productVariants: [
        "أسود x أبيض",
        "أسود x رمادي",
        "أبيض",
        "أسود",
        "بيج",
      ].flatMap((color, colorIndex) =>
        ["37", "38", "39", "40", "41"].map((size, sizeIndex) => ({
          id: `swan-high-skotch-${colorIndex}-${sizeIndex}`,
          productId: "cmnhn780v2ox7jupujeqof30t",
          name: `${color} - ${size}`,
          price: 499,
          attributes: {
            Color: color,
            Size: size,
          },
          attributeValues: {
            Color: color,
            Size: size,
          },
          isActive: true,
        })),
      ),
    },
    orderKicker: "نموذج الطلب",
    orderTitle: "اطلبي Swan High Skotch",
    orderCopy:
      "املئي البيانات الأساسية، واختاري المقاس واللون المناسبين. فريق الطلبات يراجع البيانات ويتواصل للتأكيد.",
    slices: [
      {
        src: "/landing-pages/swan-high-skotch/slice-01.png",
        alt: "Swan High Skotch بسعر 499 جنيه، سنيكر منصة بفيلكرو وطلب سريع",
      },
      {
        src: "/landing-pages/swan-high-skotch/slice-02.png",
        alt: "مميزات Swan High Skotch: نعل منصة ثابت، فيلكرو سريع، جلد صناعي ناعم",
      },
      {
        src: "/landing-pages/swan-high-skotch/slice-03.png",
        alt: "ألوان Swan High Skotch المتاحة: أسود وأبيض، أبيض، بيج، أسود، أسود ورمادي",
      },
      {
        src: "/landing-pages/swan-high-skotch/slice-04.png",
        alt: "Swan High Skotch مناسب للمشاوير والشغل والخروج اليومي",
      },
      {
        src: "/landing-pages/swan-high-skotch/slice-05.png",
        alt: "مقاسات Swan High Skotch من 37 إلى 41 مع اختيار اللون والمقاس في الفورم",
      },
      {
        src: "/landing-pages/swan-high-skotch/slice-06.png",
        alt: "دعوة لطلب Swan High Skotch وملء الفورم في آخر الصفحة",
      },
    ],
  },
  "test-faq-landing": {
    fallbackProduct: {
      id: "prod-test-faq",
      companyId: "cmteva12p00lrjuwxpufr4k8w",
      name: "بيجامة الفيونكة الأجمل والأكثر راحة",
      slug: "test-faq-landing",
      description: "بيجامة الفيونكة الأجمل والأكثر راحة، خامات قطنية ناعمة",
      price: 300,
      images: [
        "/landing-pages/swan-high-skotch/slice-01.png",
        "/landing-pages/swan-high-skotch/slice-02.png",
      ],
      productVariants: [],
    },
    orderKicker: "نموذج الطلب المباشر",
    orderTitle: "أدخل بياناتك لتأكيد الشحن والتوصيل",
    orderCopy: "املأ بياناتك وسيتم التواصل معك هاتفياً لتأكيد الشحن فوراً.",
    slices: [],
    sections: [
      {
        id: "sec-media-test",
        type: "MEDIA",
        title: "الصور والميديا",
        enabled: true,
        content: {
          images: [
            "/landing-pages/swan-high-skotch/slice-01.png",
            "/landing-pages/swan-high-skotch/slice-02.png",
          ],
        },
      },
      {
        id: "sec-form-test",
        type: "FORM",
        title: "نموذج الشراء والدفع عند الاستلام",
        enabled: true,
        content: {
          orderKicker: "نموذج الطلب المباشر",
          orderTitle: "أدخل بياناتك لتأكيد الشحن والتوصيل الفوري",
          orderCopy: "املأ بيانات التوصيل وسيتم التواصل معك هاتفياً لتأكيد الشحن فوراً.",
          buttonLabel: "تأكيد الطلب الآن — دفع عند الاستلام 🚚",
        },
      },
      {
        id: "sec-reviews-test",
        type: "REVIEWS",
        title: "آراء وتقييمات العملاء",
        enabled: true,
        content: {
          reviews: [
            { name: "أحمد إبراهيم", text: "المنتج ممتاز جداً والتوصيل كان سريع في يومين والمعاينة تمت قبل الدفع.", rating: 5 },
            { name: "سارة محمود", text: "الجودة فاقت توقعاتي وخدمة العملاء متعاونين جداً. أنصح به بشدة!", rating: 5 },
            { name: "محمود حسن", text: "تجربة شراء محترمة ومطابق تماماً للصور والمواصفات المعروضة.", rating: 5 },
          ],
        },
      },
      {
        id: "sec-faq-test",
        type: "FAQ",
        title: "الأسئلة الشائعة",
        enabled: true,
        content: {
          faqs: [
            { question: "هل يمكنني معاينة المنتج قبل الدفع؟", answer: "نعم بالتأكيد! مندوب الشحن ينتظرك لفتح الشحنة ومعاينتها والتأكد منها قبل الاستلام." },
            { question: "كم يستغرق وقت التوصيل؟", answer: "التوصيل يستغرق من 24 إلى 48 ساعة لجميع محافظات مصر." },
            { question: "ما هي سياسة الاستبدال والاسترجاع؟", answer: "لديك 14 يوماً من تاريخ الاستلام لاستبدال أو إرجاع المنتج بسهولة في حالة عيوب الصناعة." },
          ],
        },
      },
    ],
  },
};

export const DEFAULT_FORM_STATE: LandingFormState = {
  customerName: "",
  phone: "",
  governorate: "",
  area: "",
  address: "",
  notes: "",
};
