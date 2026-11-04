import type {
  StorefrontPageConfig,
  StorefrontSectionConfig,
  StorefrontTheme,
} from '../types/theme.types';
import { shouldInjectCheckoutCartItems } from "./checkoutPageSettings";

const PHARMACY_THEME_PRESET_IDS = new Set(["max-care-go", "pharmacy-demo"]);

export const isPharmacyThemePresetId = (themeId?: string | null): boolean =>
  Boolean(themeId && PHARMACY_THEME_PRESET_IDS.has(themeId));

export const STOREFRONT_THEME_ID_ALIASES: Record<string, string> = {
  allura: "allure",
};

export const resolveStorefrontThemeId = (themeId: string): string => {
  const normalized = typeof themeId === "string" ? themeId.trim().toLowerCase() : "";
  return STOREFRONT_THEME_ID_ALIASES[normalized] || normalized;
};

const getSectionType = (section: string | StorefrontSectionConfig): string =>
  typeof section === "string" ? section : section.type;

const getSectionVariant = (
  section: string | StorefrontSectionConfig,
): string | undefined => {
  if (typeof section === "string") {
    return undefined;
  }

  return typeof section.variant === "string" && section.variant.trim()
    ? section.variant.trim()
    : undefined;
};

export interface StorefrontLinkedPageReference {
  slug: string;
  label: string;
  to: string;
  source: string;
  supportedByDynamicPage: boolean;
}

type StorefrontInfoPageTemplate = {
  badge: string;
  title: string;
  subtitle: string;
  body: string[];
  detailsTitle: string;
  details: Array<{ label: string; value: string }>;
  ctaText: string;
  ctaLink: string;
  pageGoal: "trust" | "discovery";
};

type StorefrontGeneratedThemeTone =
  | "general"
  | "boutique"
  | "digital"
  | "nature"
  | "pharmacy";

const STOREFRONT_ALWAYS_GENERATED_PAGE_KEYS = [
  "collections",
  "sale",
  "thank-you",
] as const;

const STOREFRONT_RESERVED_ROUTE_SLUGS = new Set([
  "home",
  "shop",
  "pdp",
  "cart",
  "checkout",
  "thank-you",
  "registration",
  "product",
  "products",
]);

const CHECKOUT_TRANSACTION_SECTION_TYPES = new Set([
  "checkout-form",
  "payment",
  "order-summary",
]);

const resolveThemeBrandName = (theme: StorefrontTheme): string =>
  theme.header?.brandName?.trim() || theme.name;

const resolveDefaultGeneratedPageLabel = (
  slug: string,
  direction: StorefrontTheme["direction"],
): string => {
  const isRtl = direction === "rtl";

  switch (slug) {
    case "collections":
      return isRtl ? "الأقسام" : "Collections";
    case "sale":
      return isRtl ? "العروض الحالية" : "Current Offers";
    case "shipping":
    case "shipping-policy":
      return isRtl ? "الشحن والتوصيل" : "Shipping & Delivery";
    case "returns":
    case "refund-policy":
      return isRtl ? "الاستبدال والاسترجاع" : "Returns & Exchanges";
    case "privacy":
    case "privacy-policy":
      return isRtl ? "سياسة الخصوصية" : "Privacy Policy";
    case "terms":
    case "terms-and-conditions":
      return isRtl ? "الشروط والأحكام" : "Terms & Conditions";
    case "contact":
      return isRtl ? "تواصل معنا" : "Contact Us";
    case "support":
      return isRtl ? "خدمة العملاء" : "Customer Support";
    case "faq":
      return isRtl ? "الأسئلة الشائعة" : "FAQ";
    case "size-guide":
      return isRtl ? "دليل المقاسات" : "Size Guide";
    case "lookbook":
      return isRtl ? "اللوك بوك" : "Lookbook";
    case "about":
      return isRtl ? "من نحن" : "About Us";
    case "authenticity":
      return isRtl ? "الأصالة والتغليف" : "Authenticity";
    case "warranty":
      return isRtl ? "الضمان" : "Warranty";
    case "prescription":
    case "rx":
      return isRtl ? "رفع الروشتة" : "Prescription Upload";
    case "thank-you":
      return isRtl ? "تأكيد الطلب" : "Order Confirmation";
    default:
      return slug
        .split("-")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
};

const resolveInternalLinkedPageReference = (
  to: string | undefined,
  label: string | undefined,
  source: string,
): StorefrontLinkedPageReference | null => {
  if (typeof to !== "string") {
    return null;
  }

  const trimmedTo = to.trim();
  if (!trimmedTo.startsWith("/") || trimmedTo.startsWith("//")) {
    return null;
  }

  const routeTarget = new URL(trimmedTo, "https://storefront.local");
  const pathSegments = routeTarget.pathname.split("/").filter(Boolean);

  if (pathSegments.length === 0) {
    return null;
  }

  const routeRoot = pathSegments[0]!;
  if (STOREFRONT_RESERVED_ROUTE_SLUGS.has(routeRoot)) {
    return null;
  }

  const pageKey =
    routeRoot === "collections" ? "collections" : pathSegments.join("/");

  return {
    slug: pageKey,
    label: typeof label === "string" ? label.trim() : "",
    to: trimmedTo,
    source,
    supportedByDynamicPage: true,
  };
};

export const collectStorefrontThemeLinkedPageReferences = (
  theme: StorefrontTheme,
): StorefrontLinkedPageReference[] => {
  const references: StorefrontLinkedPageReference[] = [];
  const pushReference = (
    to: string | undefined,
    label: string | undefined,
    source: string,
  ) => {
    const reference = resolveInternalLinkedPageReference(to, label, source);
    if (reference) {
      references.push(reference);
    }
  };

  theme.header?.navigation?.forEach((item) =>
    pushReference(item.to, item.label, "header.navigation"),
  );
  theme.header?.actions?.forEach((item) =>
    pushReference(item.to, item.label, "header.actions"),
  );

  if (theme.header?.announcementLinkTo) {
    pushReference(
      theme.header.announcementLinkTo,
      theme.header.announcementLinkText,
      "header.announcement",
    );
  }

  theme.footer?.navigation?.forEach((group) =>
    group.links.forEach((item) =>
      pushReference(item.to, item.label, `footer.${group.title}`),
    ),
  );
  theme.footer?.legalLinks?.forEach((item) =>
    pushReference(item.to, item.label, "footer.legal"),
  );

  return references;
};

const findThemeSectionVariant = (
  theme: StorefrontTheme,
  sectionTypes: string[],
): string | undefined => {
  for (const page of Object.values(theme?.pages || {})) {
    if (!page?.sections) {
      continue;
    }

    for (const section of page.sections) {
      if (!sectionTypes.includes(getSectionType(section))) {
        continue;
      }

      const variant = getSectionVariant(section);
      if (variant) {
        return variant;
      }
    }
  }

  return undefined;
};

const collectThemeSectionVariants = (theme: StorefrontTheme): string[] => {
  const variants: string[] = [];

  Object.values(theme.pages || {}).forEach((page) => {
    page?.sections?.forEach((section) => {
      const variant = getSectionVariant(section);
      if (variant) {
        variants.push(variant.toLowerCase());
      }
    });
  });

  return variants;
};

const resolveGeneratedThemeTone = (
  theme: StorefrontTheme,
): StorefrontGeneratedThemeTone => {
  if (isPharmacyThemePresetId(theme.id)) {
    return "pharmacy";
  }

  const signals = [
    theme.id,
    theme.name,
    resolveThemeBrandName(theme),
    ...collectThemeSectionVariants(theme),
  ]
    .join(" ")
    .toLowerCase();

  if (
    /digital|spec|command|tech|electronics|mobile|garage|bike|signal/.test(
      signals,
    )
  ) {
    return "digital";
  }

  if (/organic|plant|harvest|nature|fresh|sprout/.test(signals)) {
    return "nature";
  }

  if (
    /fashion|boutique|luxe|chic|femme|velvet|bloom|bag|jewel|beauty|gift|resort|modest|edit|atelier/.test(
      signals,
    )
  ) {
    return "boutique";
  }

  return "general";
};

const resolveGeneratedCollectionsVariant = (
  theme: StorefrontTheme,
  tone: StorefrontGeneratedThemeTone,
): string | undefined =>
  findThemeSectionVariant(theme, ["featured-collections"]) ||
  (tone === "digital"
    ? "tech-decision-lanes"
    : tone === "boutique"
      ? "editorial-categories"
      : tone === "nature"
        ? "catalog-pills"
        : tone === "pharmacy"
          ? "retail-category-tiles"
          : "fast-nav-grid");

const buildGeneratedPromoStripSection = (
  theme: StorefrontTheme,
  pageKind: "collections" | "sale" | "info",
  label: string,
  tone: StorefrontGeneratedThemeTone,
): StorefrontSectionConfig => {
  const isRtl = theme.direction === "rtl";
  const baseSettings =
    pageKind === "sale"
      ? tone === "digital"
        ? {
            badge: isRtl ? "Hot Tech" : "Hot Tech",
            message: isRtl
              ? `مسار عروض ${resolveThemeBrandName(theme)} منظم ليظهر الخصومات والصفقات التقنية بسرعة من أول شاشة.`
              : `${resolveThemeBrandName(theme)} keeps current tech offers easy to scan from the first screen.`,
            saleLabel: isRtl ? "خصومات واضحة" : "Visible discounts",
            shippingLabel: isRtl ? "مقارنة أسرع" : "Faster comparison",
            returnLabel: isRtl ? "قرار أسرع" : "Faster decisions",
          }
        : tone === "pharmacy"
          ? {
              badge: isRtl ? "عروض سريعة" : "Quick Offers",
              message: isRtl
                ? `صفحة العروض داخل ${resolveThemeBrandName(theme)} مصممة لتُظهر الاحتياجات اليومية والخصومات الحالية بسرعة من الموبايل.`
                : `${resolveThemeBrandName(theme)} highlights daily pharmacy offers in a faster mobile-first layout.`,
              saleLabel: isRtl ? "احتياج يومي" : "Daily needs",
              shippingLabel: isRtl ? "طلب أسرع" : "Faster ordering",
              returnLabel: isRtl ? "أسعار أوضح" : "Clearer pricing",
            }
          : tone === "nature"
            ? {
                badge: isRtl ? "مختارات موسمية" : "Seasonal Picks",
                message: isRtl
                  ? `جمعنا عروض ${resolveThemeBrandName(theme)} في صفحة واحدة أخف وأوضح حتى يختار العميل أسرع بدون تشتيت.`
                  : `${resolveThemeBrandName(theme)} keeps current offers in one calmer destination so shoppers can decide faster.`,
                saleLabel: isRtl ? "اختيارات هادئة" : "Curated picks",
                shippingLabel: isRtl ? "ثقة أكبر" : "More trust",
                returnLabel: isRtl ? "قيمة أوضح" : "Clearer value",
              }
            : tone === "boutique"
              ? {
                  badge: isRtl ? "Season Edit" : "Season Edit",
                  message: isRtl
                    ? `صفحة ${label} داخل ${resolveThemeBrandName(theme)} تعطي مدخلًا أوضح للعروض والتنويعات الأقرب للشراء السريع.`
                    : `${resolveThemeBrandName(theme)} uses this ${label.toLowerCase()} page to make promotional edits easier to browse.`,
                  saleLabel: isRtl ? "تنسيقات أوضح" : "Clearer edits",
                  shippingLabel: isRtl ? "هدايا أسرع" : "Gift-ready",
                  returnLabel: isRtl ? "اختيار أسهل" : "Faster picks",
                }
              : {
                  badge: isRtl ? "عروض المتجر" : "Store Offers",
                  message: isRtl
                    ? `هذه الصفحة تجمع ${label} داخل ${resolveThemeBrandName(theme)} في مسار أوضح من الرابط المباشر إلى قرار الشراء.`
                    : `This page gathers ${label.toLowerCase()} inside ${resolveThemeBrandName(theme)} into a clearer path from click to purchase.`,
                  saleLabel: isRtl ? "عروض أوضح" : "Clearer offers",
                  shippingLabel: isRtl ? "قيمة أسرع" : "Faster value",
                  returnLabel: isRtl ? "اختيار أسهل" : "Easier choices",
                }
      : pageKind === "collections"
        ? tone === "digital"
          ? {
              badge: isRtl ? "Decision Paths" : "Decision Paths",
              message: isRtl
                ? `رتّبنا ${label} داخل ${resolveThemeBrandName(theme)} كمداخل واضحة للمقارنة والوصول السريع للمنتج المناسب.`
                : `${resolveThemeBrandName(theme)} organizes ${label.toLowerCase()} into cleaner decision paths for faster browsing.`,
              saleLabel: isRtl ? "أقسام أوضح" : "Clearer categories",
              shippingLabel: isRtl ? "مقارنة أسرع" : "Faster comparison",
              returnLabel: isRtl ? "شراء أذكى" : "Smarter buying",
            }
          : tone === "pharmacy"
            ? {
                badge: isRtl ? "استخدامات سريعة" : "Fast Uses",
                message: isRtl
                  ? `قسّمنا ${label} داخل ${resolveThemeBrandName(theme)} حسب الاحتياج اليومي حتى يعمل المتجر أسرع من شاشة الموبايل.`
                  : `${resolveThemeBrandName(theme)} maps ${label.toLowerCase()} to faster daily-use paths, especially on mobile.`,
                saleLabel: isRtl ? "احتياج يومي" : "Daily need",
                shippingLabel: isRtl ? "طلب أسرع" : "Faster order",
                returnLabel: isRtl ? "مسار أوضح" : "Clearer path",
              }
            : tone === "nature"
              ? {
                  badge: isRtl ? "تسوّق بهدوء" : "Browse Calmly",
                  message: isRtl
                    ? `هذه الصفحة ترتّب ${label} داخل ${resolveThemeBrandName(theme)} بشكل يساعد العميل على الدخول للقسم المناسب بدون زحام.`
                    : `${resolveThemeBrandName(theme)} presents ${label.toLowerCase()} in a calmer structure that shortens discovery time.`,
                  saleLabel: isRtl ? "أقسام منتقاة" : "Curated categories",
                  shippingLabel: isRtl ? "مسار مريح" : "Calmer route",
                  returnLabel: isRtl ? "ثقة أوضح" : "Clearer trust",
                }
              : tone === "boutique"
                ? {
                    badge: isRtl ? "Editorial Routes" : "Editorial Routes",
                    message: isRtl
                      ? `أعدنا ترتيب ${label} داخل ${resolveThemeBrandName(theme)} ليبدو كدخول تحريري أوضح من مجرد شبكة عامة.`
                      : `${resolveThemeBrandName(theme)} turns ${label.toLowerCase()} into a more editorial set of entry points instead of a plain grid.`,
                    saleLabel: isRtl ? "تنسيقات أوضح" : "Clearer edits",
                    shippingLabel: isRtl ? "مدخل أسرع" : "Faster entry",
                    returnLabel: isRtl ? "قرار أسهل" : "Easier decisions",
                  }
                : {
                    badge: isRtl ? "ابدأ من هنا" : "Start Here",
                    message: isRtl
                      ? `صفحة ${label} هنا تساعد العميل على اختيار القسم أو المدخل الأقرب للشراء بدل التصفح العشوائي.`
                      : `This ${label.toLowerCase()} page helps shoppers enter the catalog through the most useful path instead of browsing randomly.`,
                    saleLabel: isRtl ? "تنقل أوضح" : "Clearer navigation",
                    shippingLabel: isRtl ? "مدخل أسرع" : "Faster entry",
                    returnLabel: isRtl ? "اكتشاف أسهل" : "Easier discovery",
                  }
        : tone === "pharmacy"
          ? {
              badge: isRtl ? "معلومة قبل الطلب" : "Before Ordering",
              message: isRtl
                ? `نضع ${label} داخل ${resolveThemeBrandName(theme)} بشكل أوضح حتى يجد العميل المعلومة الأساسية قبل المتابعة أو التواصل.`
                : `${resolveThemeBrandName(theme)} surfaces ${label.toLowerCase()} clearly so shoppers can find the next step before contacting support.`,
              saleLabel: isRtl ? "خطوة أوضح" : "Clearer next step",
              shippingLabel: isRtl ? "ثقة أعلى" : "More trust",
              returnLabel: isRtl ? "متابعة أسرع" : "Faster follow-up",
            }
          : {
              badge: isRtl ? "معلومة مهمة" : "Important Info",
              message: isRtl
                ? `هذه الصفحة تحفظ وضوح ${label} داخل ${resolveThemeBrandName(theme)} بدل أن يتحول الرابط إلى نهاية غير مفيدة للعميل.`
                : `This page keeps ${label.toLowerCase()} useful inside ${resolveThemeBrandName(theme)} instead of letting the link end in a dead stop.`,
              saleLabel: isRtl ? "وضوح" : "Clarity",
              shippingLabel: isRtl ? "ثقة" : "Trust",
              returnLabel: isRtl ? "متابعة" : "Follow-up",
            };

  return {
    type: "promo-strip",
    variant:
      pageKind === "sale"
        ? tone === "boutique"
          ? "benefit-ribbon"
          : "sale-signal"
        : tone === "boutique"
          ? "benefit-ribbon"
          : "standard",
    settings: {
      ...baseSettings,
      ctaText: isRtl ? "الذهاب للمتجر" : "Go to Store",
      ctaLink: "/shop",
    },
  };
};

const buildGeneratedSaleOfferSection = (
  theme: StorefrontTheme,
  tone: StorefrontGeneratedThemeTone,
): StorefrontSectionConfig => {
  const isRtl = theme.direction === "rtl";

  if (tone === "digital") {
    return {
      type: "offer-bento",
      variant: "bundle-matrix",
      settings: {
        badge: isRtl ? "ابدأ من نوع القرار" : "Pick a Decision Path",
        title: isRtl
          ? "قسّمنا العروض بين ترقية، باقة، وشراء سريع"
          : "Offers split into upgrades, bundles, and quick wins",
        subtitle: isRtl
          ? "هذا يختصر المقارنة خصوصًا على الموبايل ويجعل صفحة العروض أكثر عملية من مجرد شبكة عامة."
          : "That shortens comparison work on mobile and makes the sale page more actionable than a plain product grid.",
        cards: [
          {
            label: isRtl ? "Upgrade" : "Upgrade",
            title: isRtl ? "ترقيات الأداء" : "Performance upgrades",
            subtitle: isRtl
              ? "ملحقات أو مواصفات تكمل قرار شراء تقني سريع."
              : "Specs and accessories that fit a faster performance decision.",
            ctaText: isRtl ? "ابدأ منها" : "Start here",
            link: "/sale",
            tone: "primary",
            stat: isRtl ? "مقارنة أسرع" : "Faster compare",
          },
          {
            label: isRtl ? "Bundle" : "Bundle",
            title: isRtl ? "باقات جاهزة" : "Ready bundles",
            subtitle: isRtl
              ? "شاشات وملحقات أو مجموعات أوفر في مسار واحد."
              : "Displays, accessories, and bundle offers in one route.",
            ctaText: isRtl ? "شاهد الباقات" : "View bundles",
            link: "/collections",
            tone: "accent",
            stat: isRtl ? "قيمة أوضح" : "Clearer value",
          },
          {
            label: isRtl ? "Fast Pick" : "Fast Pick",
            title: isRtl ? "الأكثر طلبًا" : "Fast-moving picks",
            subtitle: isRtl
              ? "اختيارات جاهزة للشراء من أول نظرة."
              : "Quick-pick offers that convert faster from the first glance.",
            ctaText: isRtl ? "ابدأ الآن" : "Shop now",
            link: "/shop?sort=popular",
            tone: "slate",
            stat: isRtl ? "جاهز للطلب" : "Ready to buy",
          },
        ],
      },
    };
  }

  if (tone === "pharmacy") {
    return {
      type: "offer-bento",
      variant: "daily-picks",
      settings: {
        badge: isRtl ? "ابدأ من نوع الاحتياج" : "Start from Need Type",
        title: isRtl
          ? "قسّمنا العروض اليومية حسب استخدام فعلي"
          : "Offers grouped by real daily-use scenarios",
        subtitle: isRtl
          ? "حتى يصل العميل للعرض المناسب أسرع من شاشة الموبايل، لا بمجرد فرز عام."
          : "So shoppers reach the right pharmacy offer faster on mobile, not through broad sorting alone.",
        cards: [
          {
            label: isRtl ? "Daily" : "Daily",
            title: isRtl ? "احتياجات يومية" : "Daily essentials",
            subtitle: isRtl
              ? "منتجات تتكرر باستمرار داخل البيت أو الحقيبة."
              : "Products that repeat often at home or in the go-bag.",
            ctaText: isRtl ? "شاهد الاحتياجات" : "View essentials",
            link: "/sale",
            tone: "primary",
            stat: isRtl ? "سريع" : "Fast",
          },
          {
            label: isRtl ? "Care" : "Care",
            title: isRtl ? "عناية ومتابعة" : "Care and monitoring",
            subtitle: isRtl
              ? "فئات واضحة للعناية الشخصية والأجهزة الطبية."
              : "Clearer routes for personal care and medical devices.",
            ctaText: isRtl ? "ابدأ منها" : "Start here",
            link: "/collections",
            tone: "accent",
            stat: isRtl ? "أوضح" : "Clearer",
          },
          {
            label: isRtl ? "Quick Refill" : "Quick Refill",
            title: isRtl ? "إعادة تعبئة سريعة" : "Fast refill picks",
            subtitle: isRtl
              ? "عروض مناسبة للطلبات المتكررة أو العاجلة."
              : "Offer routes suited for repeated or urgent orders.",
            ctaText: isRtl ? "أعد الطلب" : "Restock now",
            link: "/shop?sort=popular",
            tone: "slate",
            stat: isRtl ? "يومي" : "Daily",
          },
        ],
      },
    };
  }

  if (tone === "boutique") {
    return {
      type: "offer-bento",
      variant: "boutique-duo",
      settings: {
        badge: isRtl ? "ابدئي من التنسيق" : "Start from the Edit",
        title: isRtl
          ? "العروض هنا أقرب لتنسيقات جاهزة لا مجرد خصومات"
          : "This sale page works like a ready-made edit, not just a discount shelf",
        subtitle: isRtl
          ? "المقصود أن يبدو الانتقال من الاكتشاف إلى الشراء أخف على الموبايل وأكثر تماسكًا بصريًا."
          : "The goal is a lighter mobile path from discovery to purchase with stronger visual cohesion.",
        cards: [
          {
            label: isRtl ? "Edit" : "Edit",
            title: isRtl ? "تنسيقات اليوم" : "Today's edit",
            subtitle: isRtl
              ? "منتجات متقاربة المزاج تسهّل الاختيار من أول نظرة."
              : "Mood-aligned picks that shorten the decision from the first glance.",
            ctaText: isRtl ? "شاهديها" : "View edit",
            link: "/sale",
            tone: "primary",
            stat: isRtl ? "جاهزة" : "Ready",
          },
          {
            label: isRtl ? "Gift" : "Gift",
            title: isRtl ? "هدايا مختارة" : "Gift-ready picks",
            subtitle: isRtl
              ? "مدخل أسرع للهدايا والباقات والاختيارات الجاهزة."
              : "A faster route for gifts, bundles, and ready-made combinations.",
            ctaText: isRtl ? "شاهد الهدايا" : "View gifts",
            link: "/collections",
            tone: "accent",
            stat: isRtl ? "أسرع" : "Faster",
          },
          {
            label: isRtl ? "Favorite" : "Favorite",
            title: isRtl ? "الأكثر طلبًا" : "Fast favorites",
            subtitle: isRtl
              ? "اختيارات مضمونة للعودة السريعة إلى السلة."
              : "Fast-moving favorites that return to cart more easily.",
            ctaText: isRtl ? "ابدئي الآن" : "Shop now",
            link: "/shop?sort=popular",
            tone: "slate",
            stat: isRtl ? "محبوب" : "Favorite",
          },
        ],
      },
    };
  }

  return {
    type: "offer-bento",
    variant: tone === "nature" ? "daily-picks" : "campaign-stack",
    settings: {
      badge: isRtl ? "ابدأ من المسار الأقرب" : "Choose the Right Path",
      title: isRtl
        ? "صفحة العروض الآن تشرح ماذا تشتري قبل أن تطلبه"
        : "The sale page now clarifies what to buy before the shopper commits",
      subtitle: isRtl
        ? "هذا يجعل التجربة أقرب لمعيار Shopify: اكتشاف أوضح، عروض مفهومة، وطريق أقصر للسلة."
        : "That moves the experience closer to the Shopify bar: clearer discovery, more readable offers, and a shorter path to cart.",
      cards: [
        {
          label: isRtl ? "Hot" : "Hot",
          title: isRtl ? "عروض اليوم" : "Today's offers",
          subtitle: isRtl
            ? "مدخل مباشر للخصومات الحالية داخل القالب."
            : "A direct path into the theme's current discounts.",
          ctaText: isRtl ? "شاهدها" : "View offers",
          link: "/sale",
          tone: "primary",
          stat: isRtl ? "مباشر" : "Direct",
        },
        {
          label: isRtl ? "Browse" : "Browse",
          title: isRtl ? "ابدأ من الأقسام" : "Start from collections",
          subtitle: isRtl
            ? "لو كان القرار أسهل من القسم لا من الفرز العام."
            : "For shoppers who make decisions faster through category entry points.",
          ctaText: isRtl ? "الأقسام" : "Collections",
          link: "/collections",
          tone: "accent",
          stat: isRtl ? "أوضح" : "Clearer",
        },
        {
          label: isRtl ? "Popular" : "Popular",
          title: isRtl ? "الأكثر طلبًا" : "Popular picks",
          subtitle: isRtl
            ? "اختيارات سريعة للعودة إلى الشراء من أول شاشة."
            : "Popular picks that move faster from first screen to purchase.",
          ctaText: isRtl ? "ابدأ الآن" : "Shop now",
          link: "/shop?sort=popular",
          tone: "slate",
          stat: isRtl ? "سريع" : "Fast",
        },
      ],
    },
  };
};

const buildGeneratedInfoPageTemplate = (
  theme: StorefrontTheme,
  slug: string,
  label: string,
): StorefrontInfoPageTemplate => {
  const isRtl = theme.direction === "rtl";
  const brandName = resolveThemeBrandName(theme);

  switch (slug) {
    case "shipping":
    case "shipping-policy":
      return {
        badge: isRtl ? "الشحن" : "Shipping",
        title: label,
        subtitle: isRtl
          ? `تفاصيل التوصيل داخل ${brandName} موضوعة هنا بشكل مختصر وواضح قبل تأكيد الطلب.`
          : `${brandName} keeps the delivery flow simple and visible before checkout is confirmed.`,
        body: isRtl
          ? [
              "نشارك العميل مدة التجهيز المتوقعة، وآلية متابعة الشحنة، وأي نقاط تؤثر على التوصيل قبل إتمام الشراء.",
              "إذا احتاج الطلب مراجعة إضافية للعنوان أو الهاتف، يتم التواصل بنفس لهجة المتجر وبخطوات واضحة.",
            ]
          : [
              "We outline prep windows, delivery expectations, and shipment follow-up in one place before the order is finalized.",
              "If the address or phone needs a confirmation step, the store follows up with clear instructions instead of leaving the customer guessing.",
            ],
        detailsTitle: isRtl ? "نقاط سريعة" : "Quick Notes",
        details: isRtl
          ? [
              { label: "التجهيز", value: "تأكيد المخزون ثم بدء التحضير خلال فترة قصيرة." },
              { label: "المتابعة", value: "تحديثات أوضح عند انتقال الطلب إلى الشحن." },
              { label: "الدعم", value: "فريق خدمة العملاء متاح لو احتجت تعديلًا قبل الإرسال." },
            ]
          : [
              { label: "Prep", value: "Stock is confirmed first, then the order moves into fulfillment." },
              { label: "Updates", value: "Tracking and status updates stay easy to read." },
              { label: "Support", value: "Customer support can help before the shipment is dispatched." },
            ],
        ctaText: isRtl ? "تسوّق الآن" : "Continue Shopping",
        ctaLink: "/shop",
        pageGoal: "trust",
      };
    case "returns":
    case "refund-policy":
      return {
        badge: isRtl ? "الاستبدال" : "Returns",
        title: label,
        subtitle: isRtl
          ? "صفحة سريعة تشرح متى يمكن بدء طلب الاستبدال أو الاسترجاع وما الذي نحتاجه لإتمامه بسلاسة."
          : "A simple guide to when a return or exchange can start, and what the store needs to process it smoothly.",
        body: isRtl
          ? [
              "الهدف هنا أن يفهم العميل السياسة بدون فقرات قانونية ثقيلة: حالة المنتج، المدة المقبولة، وخطوة التواصل الأولى.",
              `نحافظ داخل ${brandName} على الرسالة نفسها: قرار واضح، شروط مرئية، ومسار دعم مباشر عند الحاجة.`,
            ]
          : [
              "Customers should understand the product condition, timing, and first support step without wading through legal noise.",
              `${brandName} uses this page to keep the exchange and refund promise readable, visible, and easy to trust.`,
            ],
        detailsTitle: isRtl ? "قبل تقديم الطلب" : "Before You Start",
        details: isRtl
          ? [
              { label: "المدة", value: "قدّم الطلب خلال النافذة الموضحة في سياسة المتجر." },
              { label: "الحالة", value: "يُفضّل أن يصل المنتج كما استلمته مع الملحقات الأساسية." },
              { label: "البدء", value: "ابدأ عبر خدمة العملاء مع رقم الطلب ومشكلتك باختصار." },
            ]
          : [
              { label: "Timing", value: "Submit the request within the store's stated return window." },
              { label: "Condition", value: "Items should arrive back in their original usable state when possible." },
              { label: "Start", value: "Reach support with the order number and a quick summary of the issue." },
            ],
        ctaText: isRtl ? "العودة للمتجر" : "Back to the Store",
        ctaLink: "/shop",
        pageGoal: "trust",
      };
    case "contact":
    case "support":
      return {
        badge: isRtl ? "الدعم" : "Support",
        title: label,
        subtitle: isRtl
          ? "مكان واحد للوصول إلى فريق المتجر عندما يحتاج الطلب توضيحًا أو متابعة."
          : "A single place to reach the store team when an order needs clarification or follow-up.",
        body: isRtl
          ? [
              "نستخدم هذه الصفحة لتوضيح متى تتواصل مع الدعم، وما المعلومات المفيدة التي تختصر الوقت مثل رقم الطلب أو اسم المنتج.",
              "الصفحة ليست بديلًا عن التجربة، لكنها تمنع العميل من الوصول إلى طريق مسدود إذا احتاج مساعدة سريعة.",
            ]
          : [
              "This page explains when to contact support and what details help the team respond faster, such as the order number or product name.",
              "It keeps the experience from hitting a dead end when a customer needs fast help after browsing or purchasing.",
            ],
        detailsTitle: isRtl ? "كيف نسرّع المتابعة" : "How to Speed Up Support",
        details: isRtl
          ? [
              { label: "رقم الطلب", value: "أضفه إن كانت المشكلة مرتبطة بطلب مؤكد." },
              { label: "وصف واضح", value: "اذكر المطلوب أو المشكلة في سطرين مباشرَين." },
              { label: "وقت مناسب", value: "يساعدنا ذلك على توجيه الرد بسرعة أكبر." },
            ]
          : [
              { label: "Order Number", value: "Include it if the issue is tied to a confirmed purchase." },
              { label: "Short Summary", value: "A concise explanation helps the team route the case faster." },
              { label: "Context", value: "Relevant details make the next step easier for everyone." },
            ],
        ctaText: isRtl ? "عودة للتسوق" : "Back to Shopping",
        ctaLink: "/shop",
        pageGoal: "trust",
      };
    case "faq":
      return {
        badge: isRtl ? "مساعدة سريعة" : "Quick Help",
        title: label,
        subtitle: isRtl
          ? "إجابات مختصرة على الأسئلة الأكثر تكرارًا قبل وبعد الطلب."
          : "Short answers to the questions shoppers ask most before and after ordering.",
        body: isRtl
          ? [
              "وجود صفحة FAQ قوية يقلل الضغط على الدعم ويعطي العميل ثقة أكبر لأنه يجد الإجابة في اللحظة المناسبة.",
              "يمكن لاحقًا توسيع هذه الصفحة بأسئلة خاصة بكل فئة من فئات المتجر أو بسياسات تشغيل أكثر دقة.",
            ]
          : [
              "A solid FAQ reduces support friction and gives shoppers faster confidence when they need an answer mid-journey.",
              "This page can later expand with category-specific answers or more detailed store policies as the theme matures.",
            ],
        detailsTitle: isRtl ? "تشمل عادة" : "Usually Covers",
        details: isRtl
          ? [
              { label: "الشحن", value: "متى يصل الطلب وكيف تتم المتابعة." },
              { label: "الاستبدال", value: "خطوات البدء وما الشروط الأساسية." },
              { label: "الدفع", value: "وسائل الدفع المتاحة وما يحدث عند التأكيد." },
            ]
          : [
              { label: "Shipping", value: "When orders ship and how follow-up works." },
              { label: "Returns", value: "How to start and what the core rules are." },
              { label: "Payment", value: "What methods are available and when confirmation happens." },
            ],
        ctaText: isRtl ? "تصفح المنتجات" : "Browse Products",
        ctaLink: "/shop",
        pageGoal: "trust",
      };
    case "size-guide":
      return {
        badge: isRtl ? "المقاسات" : "Sizing",
        title: label,
        subtitle: isRtl
          ? "مرجع سريع يساعد العميل على اتخاذ قرار أوضح قبل إضافة المنتج إلى السلة."
          : "A quick reference that helps shoppers choose more confidently before adding to cart.",
        body: isRtl
          ? [
              "هذه الصفحة تقلل التردد وتمنع جزءًا من المرتجعات الناتجة عن اختيار غير واضح للمقاس أو المقارنة بين القياسات.",
              "يمكن لاحقًا ربطها بجداول خاصة بكل فئة أو منتج، لكن وجود نسخة أولية واضحة أفضل من ترك الرابط معطلاً.",
            ]
          : [
              "A visible size guide reduces hesitation and cuts down returns caused by unclear fit expectations.",
              "It can later evolve into product-specific sizing tables, but a clear starter page is still better than a dead route.",
            ],
        detailsTitle: isRtl ? "ننصحك قبل الشراء" : "Before You Buy",
        details: isRtl
          ? [
              { label: "قارن القياسات", value: "ابدأ بالمقاس الذي تستخدمه غالبًا وقارنه بالمنتج." },
              { label: "اقرأ الملاحظات", value: "بعض المنتجات قد تميل لوسع أو ضيق إضافي." },
              { label: "اسأل عند الحاجة", value: "الدعم يساعد إذا ظل المقاس غير واضح." },
            ]
          : [
              { label: "Compare", value: "Start with the size you normally wear and compare from there." },
              { label: "Check Notes", value: "Some products may fit a little looser or slimmer than expected." },
              { label: "Ask Support", value: "Support can help if the fit is still unclear." },
            ],
        ctaText: isRtl ? "اذهب للمتجر" : "Go to the Store",
        ctaLink: "/shop",
        pageGoal: "trust",
      };
    case "lookbook":
      return {
        badge: isRtl ? "إلهام" : "Inspiration",
        title: label,
        subtitle: isRtl
          ? "صفحة تحريرية تمهّد لاحقًا لعرض تنسيقات وصور وأفكار شراء مرتبطة بهوية القالب."
          : "An editorial starter page that can later grow into styled sets, imagery, and curated purchase ideas.",
        body: isRtl
          ? [
              "حتى قبل بناء نسخة lookbook كاملة، وجود صفحة إلهام مرتبطة بالمتجر أفضل من رابط فارغ أو 404.",
              "يمكن ربطها لاحقًا بمنتجات مختارة أو قصص استخدام أو تنسيقات جاهزة حسب نوع القالب.",
            ]
          : [
              "Even before a full editorial lookbook is built, a cohesive inspiration page is better than a blank or broken route.",
              "It can later connect to curated products, visual stories, or ready-made edits based on the theme category.",
            ],
        detailsTitle: isRtl ? "كيف تتوسع لاحقًا" : "How It Can Grow",
        details: isRtl
          ? [
              { label: "تنسيقات", value: "إضافات بصرية أو مجموعات شراء جاهزة." },
              { label: "قصص", value: "استخدامات يومية أو مناسبات أو حالات استخدام." },
              { label: "ربط مباشر", value: "انتقال سريع من الإلهام إلى المنتج." },
            ]
          : [
              { label: "Curated Sets", value: "Visual edits or ready-to-shop combinations." },
              { label: "Stories", value: "Daily use cases, occasions, or category narratives." },
              { label: "Direct Path", value: "A faster jump from inspiration to product pages." },
            ],
        ctaText: isRtl ? "شاهد المنتجات" : "View Products",
        ctaLink: "/shop",
        pageGoal: "discovery",
      };
    case "about":
      return {
        badge: isRtl ? "القصة" : "About",
        title: label,
        subtitle: isRtl
          ? `لماذا يبدو ${brandName} بهذه اللهجة البصرية والشرائية، وما الذي يميّز التجربة التي يعد بها العميل.`
          : `Why ${brandName} looks and sells the way it does, and what promise it makes to shoppers.`,
        body: isRtl
          ? [
              "صفحة من نحن يجب أن تمنح الزائر سياقًا سريعًا وهوية واضحة بدون أن تبالغ في السرد أو تبطئ قرار الشراء.",
              "هي مساحة مناسبة لشرح ما يقدّمه المتجر ولماذا تبدو فئاته ومنتجاته واختيارته بهذه الطريقة.",
            ]
          : [
              "An about page should give visitors context and identity without slowing down the decision to browse or buy.",
              "It is the right place to explain what the store offers and why its assortment feels curated in a specific way.",
            ],
        detailsTitle: isRtl ? "ما يجب أن توضحه" : "What It Should Explain",
        details: isRtl
          ? [
              { label: "التوجه", value: "ما نوع التجربة التي يبنيها المتجر." },
              { label: "الاختيار", value: "كيف نختار الفئات أو المنتجات أو العروض." },
              { label: "الوعد", value: "ما الذي يجب أن يتوقعه العميل من الخدمة والجودة." },
            ]
          : [
              { label: "Direction", value: "What kind of experience the store is designed to deliver." },
              { label: "Selection", value: "How categories, products, or edits are curated." },
              { label: "Promise", value: "What shoppers should expect from service and quality." },
            ],
        ctaText: isRtl ? "تسوّق الآن" : "Shop Now",
        ctaLink: "/shop",
        pageGoal: "discovery",
      };
    case "authenticity":
      return {
        badge: isRtl ? "الثقة" : "Authenticity",
        title: label,
        subtitle: isRtl
          ? "صفحة تبني الثقة حول الأصالة، التغليف، وماذا يتوقع العميل عند الاستلام."
          : "A trust-building page around authenticity, packaging, and what the customer should expect on delivery.",
        body: isRtl
          ? [
              "هذه الصفحة مفيدة خصوصًا في الفئات الحساسة مثل العطور أو الإكسسوارات أو السلع التي تحتاج طمأنة إضافية قبل الشراء.",
              "كلما كانت الرسالة واضحة، قلّ التردد وزاد شعور العميل أن المتجر يشرح ما يبيعه بصدق.",
            ]
          : [
              "This matters most for categories where shoppers need extra reassurance before ordering.",
              "The clearer the promise, the less hesitation shoppers carry into checkout.",
            ],
        detailsTitle: isRtl ? "محاور الثقة" : "Trust Signals",
        details: isRtl
          ? [
              { label: "الأصالة", value: "توضيح مصدر المنتج أو معايير الجودة." },
              { label: "التغليف", value: "ما الحالة التي يصل بها المنتج إلى العميل." },
              { label: "الدعم", value: "كيف نتصرف إذا احتاج الطلب مراجعة بعد الاستلام." },
            ]
          : [
              { label: "Authenticity", value: "How the product source or quality standard is described." },
              { label: "Packaging", value: "What condition and presentation to expect on arrival." },
              { label: "Support", value: "How the store handles questions after delivery." },
            ],
        ctaText: isRtl ? "شاهد المنتجات" : "View Products",
        ctaLink: "/shop",
        pageGoal: "trust",
      };
    case "warranty":
      return {
        badge: isRtl ? "الضمان" : "Warranty",
        title: label,
        subtitle: isRtl
          ? "ملخص مباشر لما يغطيه الضمان وكيف يبدأ العميل المتابعة إذا ظهرت مشكلة."
          : "A direct summary of what the warranty covers and how customers can start a support follow-up.",
        body: isRtl
          ? [
              "وجود صفحة ضمان واضحة يقلل التوتر بعد الشراء ويقوّي الثقة قبل الدفع، خصوصًا في الفئات الأعلى سعرًا أو التقنية.",
              "يمكن لاحقًا تخصيص التفاصيل أكثر حسب الفئة أو نوع المنتج، لكن الأساس هنا هو الوضوح وعدم ترك الرابط فارغًا.",
            ]
          : [
              "A visible warranty page reduces anxiety after purchase and strengthens confidence before payment, especially in higher-ticket categories.",
              "This can later evolve into category-specific warranty rules, but the core goal now is clarity instead of a dead route.",
            ],
        detailsTitle: isRtl ? "غالبًا يشمل" : "Usually Covers",
        details: isRtl
          ? [
              { label: "الفترة", value: "مدة الحماية الأساسية أو المرجع الخاص بها." },
              { label: "المشكلة", value: "ما الحالات التي تستحق متابعة أو فحصًا." },
              { label: "البدء", value: "رقم الطلب وتفاصيل الحالة يسرّعان المعالجة." },
            ]
          : [
              { label: "Term", value: "The baseline coverage window or where to find it." },
              { label: "Issue Type", value: "What kinds of problems are typically reviewed." },
              { label: "Start", value: "Order details and a short issue summary help support respond faster." },
            ],
        ctaText: isRtl ? "تسوّق الآن" : "Continue Shopping",
        ctaLink: "/shop",
        pageGoal: "trust",
      };
    case "prescription":
    case "rx":
      return {
        badge: isRtl ? "وصفة طبية" : "Prescription",
        title: label,
        subtitle: isRtl
          ? "هذه الصفحة تمهّد لتجربة رفع الروشتة أو مراجعتها داخل القالب الدوائي بدل ترك المسار مكسورًا."
          : "This page gives the pharmacy theme a visible prescription handoff instead of leaving the route broken.",
        body: isRtl
          ? [
              "يمكن هنا شرح ما يحتاجه العميل قبل رفع الوصفة: صورة واضحة، اسم الدواء أو الجرعة، ورقم الهاتف للمتابعة.",
              "حتى قبل ربط التدفق الكامل، وجود صفحة توجيهية واضحة يحافظ على ثقة العميل في مسار الشراء والرعاية.",
            ]
          : [
              "Use this page to explain what the customer should prepare before submitting a prescription: a clear photo, product details, and a reachable phone number.",
              "Even before a full upload workflow is connected, a guided page keeps the care journey intact instead of broken.",
            ],
        detailsTitle: isRtl ? "قبل المتابعة" : "Before You Continue",
        details: isRtl
          ? [
              { label: "الصورة", value: "صورة واضحة أو نسخة مفهومة من الروشتة." },
              { label: "التواصل", value: "رقم هاتف متاح لتأكيد البيانات أو البدائل." },
              { label: "المراجعة", value: "قد يتواصل الفريق لتوضيح الجرعة أو التوفر." },
            ]
          : [
              { label: "Image", value: "Prepare a clear photo or readable copy of the prescription." },
              { label: "Contact", value: "Keep a phone number available for confirmation or alternatives." },
              { label: "Review", value: "The team may follow up to clarify dosage or availability." },
            ],
        ctaText: isRtl ? "ابدأ التسوق" : "Browse the Store",
        ctaLink: "/shop",
        pageGoal: "trust",
      };
    default:
      return {
        badge: isRtl ? "معلومات" : "Information",
        title: label,
        subtitle: isRtl
          ? `هذه الصفحة أُضيفت لتكتمل تجربة ${brandName} وتمنع الروابط الداخلية من الوصول إلى صفحة غير موجودة.`
          : `This page was added to complete the ${brandName} journey and keep internal links from landing on a missing route.`,
        body: isRtl
          ? [
              "النسخة الحالية تعمل كصفحة دعم أولية يمكن تخصيصها لاحقًا بمحتوى أكثر عمقًا حسب هوية القالب.",
              "الأهم الآن أن يبقى مسار العميل متماسكًا وأن يجد نقطة متابعة واضحة بدل صفحة 404.",
            ]
          : [
              "This starter page can later expand into theme-specific content as the experience gets deeper.",
              "For now, the priority is preserving a coherent shopper path instead of dropping to a 404 page.",
            ],
        detailsTitle: isRtl ? "ما الذي نثبّته هنا" : "What This Stabilizes",
        details: isRtl
          ? [
              { label: "المسار", value: "الروابط الداخلية تبقى قابلة للاستخدام." },
              { label: "الثقة", value: "العميل لا يصطدم بصفحات مكسورة." },
              { label: "التطوير", value: "الصفحة قابلة للتخصيص لاحقًا بمحتوى أدق." },
            ]
          : [
              { label: "Route Health", value: "Internal links stay usable." },
              { label: "Trust", value: "Customers avoid dead-end pages." },
              { label: "Future Depth", value: "The page can be tailored later with richer content." },
            ],
        ctaText: isRtl ? "تصفح المنتجات" : "Browse Products",
        ctaLink: "/shop",
        pageGoal: "trust",
      };
  }
};

const buildGeneratedInfoPageConfig = (
  theme: StorefrontTheme,
  slug: string,
  label: string,
): StorefrontPageConfig => {
  const template = buildGeneratedInfoPageTemplate(theme, slug, label);
  const tone = resolveGeneratedThemeTone(theme);

  return {
    isSystemFallback: true,
    layoutHint: "stack",
    pageGoal: template.pageGoal,
    sections: [
      buildGeneratedPromoStripSection(theme, "info", label, tone),
      {
        type: "info-content",
        settings: {
          badge: template.badge,
          title: template.title,
          subtitle: template.subtitle,
          body: template.body,
          detailsTitle: template.detailsTitle,
          details: template.details,
          ctaText: template.ctaText,
          ctaLink: template.ctaLink,
          contentAlign: "center",
        },
      },
    ],
  };
};

const buildGeneratedCollectionsPageConfig = (
  theme: StorefrontTheme,
  label: string,
): StorefrontPageConfig => {
  const isRtl = theme.direction === "rtl";
  const tone = resolveGeneratedThemeTone(theme);
  const collectionsVariant = resolveGeneratedCollectionsVariant(theme, tone);
  const gridVariant = findThemeSectionVariant(theme, [
    "product-grid",
    "featured-products",
  ]);

  return {
    isSystemFallback: true,
    layoutHint: "stack",
    pageGoal: "discovery",
    sections: [
      buildGeneratedPromoStripSection(theme, "collections", label, tone),
      {
        type: "featured-collections",
        ...(collectionsVariant ? { variant: collectionsVariant } : {}),
        settings: {
          title: label,
          subtitle: isRtl
            ? tone === "pharmacy"
              ? "ابدأ من نوع الاحتياج أو الاستخدام اليومي، ثم انتقل مباشرة إلى المنتجات الأقرب لسرعة القرار من الموبايل."
              : tone === "digital"
                ? "ابدأ من المسار الأنسب للمقارنة أو الترقية أو الاستخدام، ثم انتقل مباشرة إلى المنتجات الأقرب لقرار الشراء."
                : "ابدأ من القسم المناسب ثم انتقل مباشرة إلى المنتجات الأقرب لاحتياجك."
            : tone === "pharmacy"
              ? "Start from the daily-use route that fits the need, then jump straight into products that support faster mobile ordering."
              : tone === "digital"
                ? "Start from the right decision lane for comparison, upgrades, or use-case browsing."
                : "Start from the right collection, then move straight into the products that fit the shopper's intent.",
          limit: 6,
          ctaText: isRtl ? "كل المنتجات" : "All Products",
          ctaLink: "/shop",
        },
      },
      {
        type: "product-grid",
        ...(gridVariant ? { variant: gridVariant } : {}),
        settings: {
          title:
            tone === "digital"
              ? isRtl
                ? "منتجات للمقارنة الأسرع"
                : "Products for faster comparison"
              : tone === "pharmacy"
                ? isRtl
                  ? "منتجات تقود للطلب الأسرع"
                  : "Products that speed up ordering"
                : isRtl
                  ? "منتجات تقودك للقرار"
                  : "Products to Start With",
          subtitle: isRtl
            ? tone === "digital"
              ? "بطاقات أوضح وصور أسرع ومداخل أفضل للمقارنة من نفس الصفحة."
              : tone === "pharmacy"
                ? "اختيارات أساسية جاهزة للطلب السريع قبل التعمق في الفلاتر."
                : "اختيارات مرتبة لتسهيل أول خطوة داخل المتجر قبل الدخول في فلاتر أعمق."
            : tone === "digital"
              ? "Clearer cards, faster visuals, and better comparison entry points from the same page."
              : tone === "pharmacy"
                ? "Core picks that support quicker ordering before the shopper dives into deeper filters."
                : "A curated starting grid that makes discovery easier before the shopper dives into deeper filters.",
          limit: 8,
          ctaText: isRtl ? "جميع المنتجات" : "All Products",
          ctaLink: "/shop",
        },
      },
    ],
  };
};

const buildGeneratedSalePageConfig = (
  theme: StorefrontTheme,
  label: string,
): StorefrontPageConfig => {
  const isRtl = theme.direction === "rtl";
  const tone = resolveGeneratedThemeTone(theme);
  const gridVariant = findThemeSectionVariant(theme, [
    "product-grid",
    "featured-products",
  ]);

  return {
    isSystemFallback: true,
    layoutHint: "stack",
    pageGoal: "conversion",
    sections: [
      buildGeneratedPromoStripSection(theme, "sale", label, tone),
      buildGeneratedSaleOfferSection(theme, tone),
      {
        type: "product-grid",
        ...(gridVariant ? { variant: gridVariant } : {}),
        settings: {
          title: label,
          subtitle: isRtl
            ? tone === "digital"
              ? "صفحة عرض أقرب للمقارنة السريعة بين التخفيضات والصفقات التقنية."
              : tone === "pharmacy"
                ? "صفحة عرض أوضح للاحتياجات اليومية والتخفيضات الحالية من غير زحام."
                : "نرشّح هنا المنتجات التي تحمل خصومات أو compare-at واضحة داخل المعاينة."
            : tone === "digital"
              ? "A sale grid tuned for faster comparison between current tech offers."
              : tone === "pharmacy"
                ? "A cleaner sale shelf for daily-use products and current pharmacy offers."
                : "This grid highlights products with visible promotional pricing in the preview catalog.",
          saleOnly: true,
          limit: 12,
          ctaText: isRtl ? "كل المنتجات" : "All Products",
          ctaLink: "/shop",
          clearButtonText: isRtl ? "عرض كل المنتجات" : "View All Products",
        },
      },
    ],
  };
};

const buildGeneratedThankYouPageConfig = (
  theme: StorefrontTheme,
  label: string,
): StorefrontPageConfig => {
  const isRtl = theme.direction === "rtl";
  const tone = resolveGeneratedThemeTone(theme);

  return {
    isSystemFallback: true,
    layoutHint: "stack",
    pageGoal: "trust",
    sections: [
      {
        type: "order-confirmation",
        variant:
          tone === "digital"
            ? "command-aftercare"
            : tone === "nature"
              ? "nature-aftercare"
              : tone === "pharmacy"
                ? "market-aftercare"
                : tone === "boutique"
                  ? "boutique-aftercare"
                  : "standard",
        settings: {
          title: label,
          description: isRtl
            ? tone === "digital"
              ? "رسالة ما بعد الطلب هنا أوضح للمراجعة والمتابعة وإعادة الشراء، خصوصًا حين تكون المقارنة التقنية جزءًا من القرار."
              : tone === "pharmacy"
                ? "رسالة ما بعد الطلب هنا تحافظ على الثقة وتوضح الخطوة التالية بسرعة، خاصة للطلبات اليومية أو السريعة من الموبايل."
                : "رسالة ما بعد الطلب يجب أن تحافظ على ثقة العميل، وتوضح الخطوة التالية، وتفتح له باب المتابعة إذا احتاجها."
            : tone === "digital"
              ? "This aftercare page keeps the technical buying journey clear after the order is placed."
              : tone === "pharmacy"
                ? "This aftercare page preserves trust and clarifies the next step for faster mobile pharmacy orders."
                : "The post-purchase page should keep trust high, explain the next step, and give customers a clear follow-up path.",
          continueShoppingText: isRtl ? "العودة للمتجر" : "Back to the Store",
          supportText: isRtl
            ? "لو احتجت تعديلًا أو متابعة إضافية فهذه الصفحة تبقى نقطة الرجوع الأولى."
            : "If the order needs a quick update or a follow-up, this page remains the first checkpoint.",
          showTimeline: true,
          showRecommended: true,
          showTrackOrder: true,
          showReorder: true,
          recommendedTitle:
            tone === "digital"
              ? isRtl
                ? "قد تحتاج أيضًا"
                : "You may also need"
              : tone === "pharmacy"
                ? isRtl
                  ? "احتياجات تكمل الطلب"
                  : "Useful follow-up items"
                : isRtl
                  ? "ترشيحات بعد الطلب"
                  : "Post-purchase picks",
          recommendedSubtitle:
            tone === "digital"
              ? isRtl
                ? "إضافات أو ملحقات مرتبطة بنفس قرار الشراء لتقليل رحلة البحث التالية."
                : "Add-ons tied to the same decision so the next search is shorter."
              : tone === "pharmacy"
                ? isRtl
                  ? "منتجات يومية أو خفيفة قد يحتاجها العميل في نفس الرحلة."
                  : "Daily-use items that often fit the same pharmacy trip."
                : isRtl
                  ? "اختيارات مناسبة لما بعد تأكيد الطلب."
                  : "Relevant picks that fit the order that was just placed.",
          trackOrderTitle:
            tone === "pharmacy"
              ? isRtl
                ? "تابع حالة الطلب السريع"
                : "Track the quick order"
              : undefined,
          reorderTitle:
            tone === "pharmacy"
              ? isRtl
                ? "كرر نفس الاحتياج بسرعة"
                : "Reorder the same essentials"
              : tone === "digital"
                ? isRtl
                  ? "أعد نفس التجميعة بسرعة"
                  : "Rebuild the same setup"
                : undefined,
        },
      },
    ],
  };
};

const buildGeneratedStorefrontPageConfig = (
  theme: StorefrontTheme,
  slug: string,
  label: string,
): StorefrontPageConfig => {
  let config: StorefrontPageConfig;
  if (slug === "collections") {
    config = buildGeneratedCollectionsPageConfig(theme, label);
  } else if (slug === "sale") {
    config = buildGeneratedSalePageConfig(theme, label);
  } else if (slug === "thank-you") {
    config = buildGeneratedThankYouPageConfig(theme, label);
  } else {
    config = buildGeneratedInfoPageConfig(theme, slug, label);
  }

  return {
    ...config,
    isSystemFallback: true,
  };
};

export const getGeneratedStorefrontThemePages = (
  theme: StorefrontTheme,
): Partial<StorefrontTheme["pages"]> => {
  const existingPages = new Set(Object.keys(theme?.pages || {}));
  const labelsBySlug = new Map<string, string>();

  collectStorefrontThemeLinkedPageReferences(theme).forEach((reference) => {
    if (
      !reference.supportedByDynamicPage ||
      existingPages.has(reference.slug) ||
      labelsBySlug.has(reference.slug)
    ) {
      return;
    }

    labelsBySlug.set(
      reference.slug,
      reference.label || resolveDefaultGeneratedPageLabel(reference.slug, theme.direction),
    );
  });

  STOREFRONT_ALWAYS_GENERATED_PAGE_KEYS.forEach((slug) => {
    if (!existingPages.has(slug) && !labelsBySlug.has(slug)) {
      labelsBySlug.set(
        slug,
        resolveDefaultGeneratedPageLabel(slug, theme.direction),
      );
    }
  });

  return Array.from(labelsBySlug.entries()).reduce<
    Partial<StorefrontTheme["pages"]>
  >((generatedPages, [slug, label]) => {
    generatedPages[slug] = buildGeneratedStorefrontPageConfig(theme, slug, label);
    return generatedPages;
  }, {});
};

export const normalizeStorefrontThemeCommercePages = (
  theme: StorefrontTheme,
): StorefrontTheme => {
  const nextPages = { ...theme.pages };
  let hasChanges = false;
  const checkoutSections = theme.pages.checkout?.sections;
  const shouldInjectCartItems = shouldInjectCheckoutCartItems(
    theme.pages.checkout,
  );

  if (
    shouldInjectCartItems &&
    Array.isArray(checkoutSections) &&
    checkoutSections.length > 0
  ) {
    const hasCartItems = checkoutSections.some(
      (section) => getSectionType(section) === "cart-items",
    );

    if (!hasCartItems) {
      const insertionIndex = checkoutSections.findIndex((section) =>
        CHECKOUT_TRANSACTION_SECTION_TYPES.has(getSectionType(section)),
      );
      const nextCheckoutSections = [...checkoutSections];
      const targetIndex =
        insertionIndex >= 0 ? insertionIndex : nextCheckoutSections.length;

      nextCheckoutSections.splice(targetIndex, 0, "cart-items");
      nextPages.checkout = {
        ...theme.pages.checkout,
        sections: nextCheckoutSections,
      };
      hasChanges = true;
    }
  }

  const generatedPages = getGeneratedStorefrontThemePages({
    ...theme,
    pages: nextPages,
  });
  const generatedPageEntries = Object.entries(generatedPages);

  if (generatedPageEntries.length > 0) {
    generatedPageEntries.forEach(([pageKey, pageConfig]) => {
      if (pageConfig) {
        nextPages[pageKey] = pageConfig;
      }
    });
    hasChanges = true;
  }

  const DEFAULT_BOILERPLATE_INFO_SLUGS = [
    "shipping",
    "returns",
    "privacy",
    "terms",
    "contact",
  ];

  DEFAULT_BOILERPLATE_INFO_SLUGS.forEach((slug) => {
    const existing = nextPages[slug];
    if (existing && existing.isSystemFallback === undefined) {
      nextPages[slug] = {
        ...existing,
        isSystemFallback: true,
      };
      hasChanges = true;
    }
  });

  if (!hasChanges) {
    return theme;
  }

  return {
    ...theme,
    pages: nextPages,
  };
};
