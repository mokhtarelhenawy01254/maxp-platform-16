import modernMinimalData from "./modern-minimal.json";
import boldFashionData from "./bold-fashion.json";
import elegantLuxeData from "./elegant-luxe.json";
import vanguardPremiumData from "./vanguard-premium.json";
import atelierNovaData from "./atelier-nova.json";
import auraChicData from "./aura-chic.json";
import soleaFemmeData from "./solea-femme.json";
import zenOrganicData from "./zen-organic.json";
import fakhamaEliteData from "./fakhama-elite.json";
import mysticDesertData from "./mystic-desert.json";
import airlumeAiData from "./airlume-ai.json";
import shopOrbitData from "./shop-orbit.json";
import districtMarketData from "./district-market.json";
import menswearPrimeData from "./menswear-prime.json";
import cairoStrideData from "./cairo-stride.json";
import closetOsData from "./closet-os.json";
import hayahModestEgData from "./hayah-modest-eg.json";
import rihlaResortEgData from "./rihla-resort-eg.json";
import layaliEditEgData from "./layali-edit-eg.json";
import legacyDefaultOldData from "./legacy-default-old.json";
import menShoesEgData from "./men-shoes-eg.json";
import womenFashionEgData from "./women-fashion-eg.json";
import lookAtelierEgData from "./look-atelier-eg.json";
import khemetLuxeEgData from "./khemet-luxe-eg.json";
import khemetLuxeV2Data from "./khemet-luxe-v2.json";
import khemetGeneralEgData from "./khemet-general-eg.json";
import khemetFashionEgData from "./khemet-fashion-eg.json";
import perfumeEgData from "./perfume-eg.json";
import pcHubEgData from "./pc-hub-eg.json";
import roseBoutiqueEgData from "./rose-boutique-eg.json";
import velaFashionEgData from "./vela-fashion-eg.json";
import fittingRoomStudioData from "./fitting-room-studio.json";
import nileBistroData from "./nile-bistro.json";
import novaMobileData from "./nova-mobile.json";
import kidsPlayData from "./kids-play.json";
import maxCareGoData from "./max-care-go.json";
import butcherCounterEgData from "./butcher-counter-eg.json";
import pawsomeData from "./pawsome.json";
import velvetGlowData from "./velvet-glow.json";
import inkPaperData from "./ink-paper.json";
import bloomStudioData from "./bloom-studio.json";
import ironForgeData from "./iron-forge.json";
import opulenceData from "./opulence.json";
import turboPartsData from "./turbo-parts.json";
import craftedData from "./crafted.json";
import freshCartData from "./fresh-cart.json";
import skillLabData from "./skill-lab.json";
import baladiMarketEgData from "./baladi-market-eg.json";
import nileEleganceEgData from "./nile-elegance-eg.json";
import primeButcherLuxeData from "./prime-butcher-luxe.json";
import butcherShopEgData from "./butcher-shop-eg.json";
import mensGroomingProData from "./mens-grooming-pro.json";
import softGracefulData from "./soft-graceful.json";
import allureData from "./allure.json";
import anjellaBoutiqueData from "./anjella-boutique.json";
import creativePortfolioData from "./creative-portfolio.json";
import dentalLabEliteData from "./dental-lab-elite.json";
import redlineAutoData from "./redline-auto.json";
import { ELESSI_PACK_THEME_PRESETS } from "./elessiPack";
import {
  StorefrontPageConfig,
  StorefrontSectionConfig,
  StorefrontTheme,
} from "../types/theme.types";
import { applyStorefrontThemeExperienceOverrides } from "./experienceOverrides";
import { shouldInjectCheckoutCartItems } from "./checkoutPageSettings";

export const DEFAULT_STOREFRONT_THEME_ID = "modern-minimal";
const PHARMACY_THEME_PRESET_IDS = new Set(["max-care-go", "pharmacy-demo"]);

const isPharmacyThemePresetId = (themeId?: string | null): boolean =>
  Boolean(themeId && PHARMACY_THEME_PRESET_IDS.has(themeId));

const asStorefrontTheme = (value: unknown): StorefrontTheme =>
  value as StorefrontTheme;

const cloneThemePresetData = <T,>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const createAliasPreset = (
  baseData: unknown,
  overrides: Partial<StorefrontTheme> & Pick<StorefrontTheme, "id" | "name">,
): StorefrontTheme => {
  const baseTheme = cloneThemePresetData(baseData as StorefrontTheme);

  return asStorefrontTheme({
    ...baseTheme,
    ...overrides,
    tokens: overrides.tokens ?? baseTheme.tokens,
    header: overrides.header ?? baseTheme.header,
    footer: overrides.footer ?? baseTheme.footer,
    seo: overrides.seo ?? baseTheme.seo,
    preview: overrides.preview ?? baseTheme.preview,
    pages: overrides.pages ?? baseTheme.pages,
  });
};

const createUnregisteredThemePreset = (themeId: string): StorefrontTheme => {
  const normalizedThemeId = themeId.trim();
  const registryMessage = `المعرّف "${normalizedThemeId}" غير مسجل في مكتبة الثيمات بعد.`;

  return asStorefrontTheme({
    id: normalizedThemeId,
    name: `Unregistered Storefront Theme (${normalizedThemeId})`,
    direction: "rtl",
    tokens: {
      colors: {
        primary: "22 92% 52%",
        primaryForeground: "36 100% 98%",
        secondary: "34 62% 94%",
        secondaryForeground: "24 36% 20%",
        accent: "16 88% 57%",
        accentForeground: "30 100% 98%",
        background: "36 100% 98%",
        foreground: "26 31% 16%",
        muted: "32 42% 92%",
        mutedForeground: "24 16% 38%",
        border: "30 38% 83%",
        card: "0 0% 100%",
        cardForeground: "26 31% 16%",
        ring: "22 92% 52%",
      },
      typography: {
        headingFont: '"IBM Plex Sans Arabic", sans-serif',
        bodyFont: '"IBM Plex Sans Arabic", sans-serif',
        baseSize: "16px",
        direction: "rtl",
      },
      shape: {
        borderRadius: "24px",
        buttonRadius: "999px",
      },
      productCard: {
        borderRadius: "24px",
        boxShadow: "0 24px 64px -40px rgba(120, 53, 15, 0.28)",
        hoverShadow: "0 28px 72px -40px rgba(120, 53, 15, 0.34)",
        badgeRadius: "999px",
        buttonRadius: "999px",
        surfaceOpacity: "1",
      },
      layout: {
        contentAlign: "start",
      },
    },
    header: {
      variant: "default",
      brandName: "Theme Registry Check",
      showSearch: true,
      showCart: true,
      navigation: [
        { label: "تشخيص الثيم", to: "/" },
        { label: "الواجهة الحالية", to: "/shop" },
        { label: "ماذا نصلح؟", to: "/contact" },
      ],
      actions: [
        {
          label: "راجع الـ themeId",
          to: "/contact",
          style: "outline",
        },
        {
          label: "أضف preset جديد",
          to: "/lookbook",
          style: "primary",
        },
      ],
    },
    footer: {
      variant: "default",
      description:
        "هذه واجهة تشخيصية مقصودة تظهر عندما يصل storefront إلى themeId غير معروف بدل الرجوع الصامت إلى preset آخر.",
      copyrightText: "© 2026 Theme Registry Check. All rights reserved.",
      socialLinks: {},
      navigation: [
        {
          title: "الإجراء التالي",
          links: [
            { label: "صحّح themeId في الإعدادات", to: "/contact" },
            { label: "سجّل الثيم في الـ registry", to: "/lookbook" },
          ],
        },
      ],

    },
    seo: {
      titleTemplate: "%s | Theme Registry Check",
      description: registryMessage,
    },
    preview: {
      colors: ["hsl(22 92% 52%)", "hsl(34 62% 94%)", "hsl(36 100% 98%)"],
    },
    pages: {
      home: {
        pageGoal: "trust",
        sections: [
          {
            type: "promo-strip",
            settings: {
              badge: "Theme Registry",
              message: registryMessage,
              saleLabel: "لا يوجد fallback صامت",
              shippingLabel: "راجِع themeId",
              returnLabel: "سجّل preset صريح",
              ctaText: "افتح التوثيق الداخلي",
              ctaLink: "/contact",
            },
          },
          {
            type: "hero-banner",
            variant: "centered",
            settings: {
              eyebrow: "تشخيص واجهة المتجر",
              title: `الثيم "${normalizedThemeId}" غير مسجل بعد`,
              subtitle:
                "بدل الرجوع إلى modern-minimal، يعرض النظام هذه الواجهة التشخيصية حتى يظهر الخطأ بوضوح ويتصلح من المصدر.",
              ctaText: "صحّح المعرف",
              ctaLink: "/contact",
              secondaryCtaText: "أضف preset جديد",
              secondaryCtaLink: "/lookbook",
            },
          },
          {
            type: "info-content",
            settings: {
              badge: "الخطوات المقترحة",
              title: "ما المطلوب لإرجاع تجربة المتجر الصحيحة؟",
              subtitle: "ثبّت سبب المشكلة بدل ما نخفيها.",
              body: [
                `تأكد أن قيمة themeId الحالية هي "${normalizedThemeId}" فعلًا وليست alias قديمًا أو typo.`,
                "إذا كان المعرف صحيحًا، أضف preset مسجلًا في registry مع pages وvariants مناسبة بدل الاعتماد على preset افتراضي.",
                "بعد التسجيل، اختبر home وshop وPDP وcheckout للتأكد أن الهوية والرحلة متسقتان.",
              ],
              detailsTitle: "ملخص الحالة",
              details: [
                `Theme ID|${normalizedThemeId}`,
                "Fallback|Disabled",
                "Status|Needs preset registration",
              ],
              ctaText: "افتح صفحة المعالجة",
              ctaLink: "/contact",
            },
          },
        ],
      },
      shop: {
        layoutHint: "commerce-3col",
        pageGoal: "discovery",
        sections: [
          {
            type: "shop-command-bar",
            variant: "default-discovery",
          },
          {
            type: "filters-sidebar",
            settings: {
              badge: "Theme Check",
              title: "المتجر يعمل بوضع تشخيصي",
              subtitle:
                "هذه الصفحة تؤكد أن themeId الحالي غير معروف ويحتاج preset صريح قبل النشر.",
            },
          },
          {
            type: "product-grid",
            variant: "standard",
            settings: {
              title: "قائمة فحص الثيم",
              limit: 8,
            },
          },
        ],
      },
      pdp: {
        layoutHint: "product-detail",
        pageGoal: "trust",
        sections: [
          {
            type: "product-gallery",
            variant: "standard",
          },
          {
            type: "product-info",
            variant: "standard",
            settings: {
              title: "ثيم غير مسجل",
              subtitle:
                "صفحة المنتج تستخدم scaffold تشخيصي مؤقت حتى يتم ربط هذا الـ themeId بـ preset حقيقي.",
            },
          },
          {
            type: "conversion-stack",
            variant: "minimal",
            settings: {
              title: "أوقف النشر قبل المتابعة",
              subtitle:
                "سجّل الثيم داخل registry أو صحّح themeId بدل الاعتماد على fallback صامت.",
            },
          },
          {
            type: "reviews",
            variant: "compact",
            settings: {
              title: "حالة التسجيل",
              emptyStateText:
                "أول خطوة ليست جمع مراجعات، بل تثبيت preset صالح لهذا الثيم حتى تستقر تجربة صفحة المنتج.",
            },
          },
        ],
      },
      cart: {
        pageGoal: "trust",
        sections: [
          {
            type: "promo-strip",
            settings: {
              badge: "فحص السلة",
              message: "لا تكمّل رحلة الشراء على ثيم غير مسجل. أصلح المصدر أولًا.",
              saleLabel: "Theme missing",
              shippingLabel: "Registry required",
              returnLabel: "Silent fallback off",
            },
          },
          {
            type: "cart-items",
            variant: "standard",
            settings: {
              title: "السلة في وضع تشخيصي",
              subtitle:
                "المكوّنات هنا موجودة لتوضيح الحالة، لا لإخفاء أن المتجر وصل إلى themeId غير معروف.",
            },
          },
          {
            type: "order-summary",
            variant: "highlighted",
            settings: {
              title: "ملخص المعالجة",
              subtitle: "صحّح themeId أو أضف preset مسجل قبل اعتماد هذا المسار.",
            },
          },
        ],
      },
      checkout: {
        pageGoal: "trust",
        sections: [
          {
            type: "promo-strip",
            settings: {
              badge: "Theme Registry",
              message: "إتمام الطلب متوقف منطقيًا على تعريف ثيم صالح لهذا المتجر.",
              saleLabel: "Unknown preset",
              shippingLabel: normalizedThemeId,
              returnLabel: "Needs registration",
            },
          },
          {
            type: "cart-items",
            variant: "standard",
            settings: {
              title: "راجع الثيم قبل الإطلاق",
              subtitle:
                "الرحلة الحالية لم تعد ترث modern-minimal تلقائيًا عند غياب preset معروف.",
            },
          },
          {
            type: "checkout-form",
            variant: "standard",
            settings: {
              title: "الخطوة المطلوبة",
              subtitle:
                "أضف preset جديد أو عدّل قيمة themeId الحالية ثم أعد التحقق من الصفحات الأساسية.",
            },
          },
          {
            type: "payment",
            variant: "minimal",
            settings: {
              title: "قرار قبل الدفع",
              subtitle:
                "وجود هذا البلوك يعني أن النظام كشف themeId غير معروف ورفض إخفاء المشكلة داخل fallback عام.",
            },
          },
          {
            type: "order-summary",
            variant: "highlighted",
            settings: {
              title: "Theme Registry Status",
              subtitle: `Unknown themeId: ${normalizedThemeId}`,
            },
          },
        ],
      },
    },
  });
};

const pharmacyDemoData = createAliasPreset(maxCareGoData, {
  id: "pharmacy-demo",
  name: "Pharmacy Demo",
  seo: {
    titleTemplate: "%s | Pharmacy Demo",
    description:
      "نسخة صيدلية أوضح للأسرة: رفع روشتة، رعاية يومية، ومتابعة هادئة من أول البحث حتى تأكيد الطلب.",
  },
  header: {
    brandName: "صيدلية الأسرة",
    showSearch: true,
    showCart: true,
    navigation: [
      { label: "الرئيسية", to: "/" },
      { label: "كل المنتجات", to: "/shop" },
      { label: "رفع الروشتة", to: "/prescription" },
      { label: "العناية اليومية", to: "/shop?category=personal-care" },
      { label: "الأجهزة الطبية", to: "/shop?category=medical-devices" },
    ],
    actions: [
      {
        label: "ارفع الروشتة",
        to: "/prescription",
        style: "link",
      },
      {
        label: "استشيري الصيدلي",
        to: "/contact",
        style: "primary",
      },
    ],
  },
  footer: {
    description:
      "واجهة صيدلية تركز على الوضوح والاطمئنان، مع دعم أسرع لرفع الروشتة ومراجعة الاحتياجات اليومية.",
    copyrightText: "© 2026 Pharmacy Demo. جميع الحقوق محفوظة.",
    socialLinks: {
      instagram: "https://instagram.com",
      facebook: "https://facebook.com",
      whatsapp: "https://wa.me/201000000000",
    },
    navigation: [
      {
        title: "التسوق",
        links: [
          { label: "كل المنتجات", to: "/shop" },
          { label: "الفيتامينات", to: "/shop?category=vitamins" },
          { label: "العناية اليومية", to: "/shop?category=personal-care" },
          { label: "الأجهزة الطبية", to: "/shop?category=medical-devices" },
        ],
      },
      {
        title: "الخدمة",
        links: [
          { label: "رفع الروشتة", to: "/prescription" },
          { label: "تواصل معنا", to: "/contact" },
          { label: "الشحن والتوصيل", to: "/shipping" },
          { label: "الاستبدال والاسترجاع", to: "/returns" },
        ],
      },
    ],
  },
  preview: {
    imageUrl:
      "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=1200&q=80",
    colors: ["164 53% 33%", "190 35% 97%", "204 75% 45%"],
  },
});

const cutlineClubData = createAliasPreset(legacyDefaultOldData, {
  id: "cutline-club",
  name: "Cutline Club",
  direction: "rtl",
  description:
    "دروبات يومية وطبقات حضرية بإيقاع أسرع، مع أطقم جاهزة وروح streetwear أوضح من أول شاشة.",
  tokens: {
    colors: {
      primary: "24 16% 14%",
      primaryForeground: "36 26% 95%",
      secondary: "32 22% 90%",
      secondaryForeground: "24 16% 14%",
      accent: "14 66% 54%",
      accentForeground: "36 26% 95%",
      background: "34 20% 96%",
      foreground: "24 16% 14%",
      muted: "34 12% 84%",
      mutedForeground: "24 8% 34%",
      border: "28 12% 72%",
      card: "40 22% 98%",
      cardForeground: "24 16% 14%",
      ring: "14 66% 54%",
    },
    typography: {
      headingFont: "\"IBM Plex Sans Arabic\", \"Cairo\", sans-serif",
      bodyFont: "\"IBM Plex Sans Arabic\", \"Cairo\", sans-serif",
      baseSize: "15px",
      direction: "rtl",
    },
    shape: {
      borderRadius: "0.95rem",
      buttonRadius: "0.85rem",
    },
    productCard: {
      borderRadius: "1rem",
      boxShadow: "0 22px 52px -40px rgba(41, 32, 28, 0.28)",
      hoverShadow: "0 28px 64px -36px rgba(41, 32, 28, 0.34)",
      badgeRadius: "999px",
      buttonRadius: "0.85rem",
      surfaceOpacity: "1",
    },
    layout: {
      contentAlign: "start",
    },
  },
  seo: {
    titleTemplate: "%s | Cutline Club",
    description:
      "أطقم وطبقات streetwear أوضح، مع drops جاهزة وقطع تتقفل على نفس اللوك بسرعة.",
  },
  header: {
    brandName: "Cutline Club",
    showSearch: true,
    showCart: true,
    announcementText: "دروب الأسبوع شغال على القطع الأسرع حركة.",
    navigation: [
      { label: "الرئيسية", to: "/" },
      { label: "الرف", to: "/shop" },
      { label: "الأطقم", to: "/shop?category=sets" },
      { label: "الطبقات", to: "/shop?category=outerwear" },
      { label: "الدروب", to: "/sale" },
    ],
    actions: [{ label: "افتح الدروب", to: "/sale", style: "primary" }],
  },
  footer: {
    description:
      "قطع حضرية عملية تتقفل على look أوضح: أطقم، طبقات، وهوديز وبناطيل بروح النادي.",
    copyrightText: "© 2026 Cutline Club. جميع الحقوق محفوظة.",
    socialLinks: {
      instagram: "https://instagram.com",
      tiktok: "https://tiktok.com",
      whatsapp: "https://wa.me/201000000000",
    },
    navigation: [
      {
        title: "التسوق",
        links: [
          { label: "كل القطع", to: "/shop" },
          { label: "الأطقم", to: "/shop?category=sets" },
          { label: "الهوديز والطبقات", to: "/shop?category=outerwear" },
          { label: "العروض", to: "/sale" },
        ],
      },
      {
        title: "الخدمة",
        links: [
          { label: "الشحن والتوصيل", to: "/shipping" },
          { label: "الاستبدال والاسترجاع", to: "/returns" },
          { label: "تواصل معنا", to: "/contact" },
        ],
      },
    ],
  },
  preview: {
    imageUrl: "/assets/themes/cutline-club/preview.jpg",
    colors: ["24 16% 14%", "34 20% 96%", "14 66% 54%"],
  },
});

const styleStoreEgData = createAliasPreset(legacyDefaultOldData, {
  id: "style-store-eg",
  name: "Style Store EG",
  direction: "rtl",
  description:
    "رف ساعات وشنط وسنيكرز وإكسسوارات يرفع اللوك من غير زحمة، مع هدايا جاهزة واختيار أوضح.",
  tokens: {
    colors: {
      primary: "221 17% 16%",
      primaryForeground: "42 35% 96%",
      secondary: "34 30% 93%",
      secondaryForeground: "221 17% 16%",
      accent: "28 63% 53%",
      accentForeground: "42 35% 96%",
      background: "34 28% 97%",
      foreground: "221 17% 16%",
      muted: "34 18% 88%",
      mutedForeground: "220 10% 35%",
      border: "30 16% 78%",
      card: "40 36% 98%",
      cardForeground: "221 17% 16%",
      ring: "28 63% 53%",
    },
    typography: {
      headingFont: "\"IBM Plex Sans Arabic\", \"Cairo\", sans-serif",
      bodyFont: "\"IBM Plex Sans Arabic\", \"Cairo\", sans-serif",
      baseSize: "15px",
      direction: "rtl",
    },
    shape: {
      borderRadius: "1rem",
      buttonRadius: "999px",
    },
    productCard: {
      borderRadius: "1.05rem",
      boxShadow: "0 20px 48px -38px rgba(34, 37, 48, 0.24)",
      hoverShadow: "0 28px 62px -34px rgba(34, 37, 48, 0.3)",
      badgeRadius: "999px",
      buttonRadius: "999px",
      surfaceOpacity: "1",
    },
    layout: {
      contentAlign: "start",
    },
  },
  seo: {
    titleTemplate: "%s | Style Store EG",
    description:
      "ساعات وشنط وسنيكرز وإكسسوارات مختارة بعرض أوضح، تساعد العميل يحسم من القطعة الصغيرة قبل الكبيرة.",
  },
  header: {
    brandName: "Style Store EG",
    showSearch: true,
    showCart: true,
    announcementText: "رف الإكسسوارات اليومي متجدد ومعاه هدايا جاهزة للإرسال.",
    navigation: [
      { label: "الرئيسية", to: "/" },
      { label: "المتجر", to: "/shop" },
      { label: "الساعات", to: "/shop?category=watches" },
      { label: "الشنط", to: "/shop?category=bags" },
      { label: "الهدايا", to: "/sale" },
    ],
    actions: [{ label: "ابدأ من الهدية", to: "/sale", style: "primary" }],
  },
  footer: {
    description:
      "واجهة إكسسوارات يومية تبيع بالاختيار الواضح: ساعة، شنطة، سنيكرز، أو هدية تكمل اللوك.",
    copyrightText: "© 2026 Style Store EG. جميع الحقوق محفوظة.",
    socialLinks: {
      instagram: "https://instagram.com",
      facebook: "https://facebook.com",
      whatsapp: "https://wa.me/201000000000",
    },
    navigation: [
      {
        title: "التسوق",
        links: [
          { label: "كل القطع", to: "/shop" },
          { label: "الساعات", to: "/shop?category=watches" },
          { label: "الشنط", to: "/shop?category=bags" },
          { label: "السنيكرز", to: "/shop?category=sneakers" },
        ],
      },
      {
        title: "الخدمة",
        links: [
          { label: "الهدايا والتغليف", to: "/shipping" },
          { label: "الاستبدال والاسترجاع", to: "/returns" },
          { label: "تواصل معنا", to: "/contact" },
        ],
      },
    ],
  },
  preview: {
    imageUrl: "/assets/themes/style-store-eg/hero-banner.jpg",
    colors: ["221 17% 16%", "34 28% 97%", "28 63% 53%"],
  },
});

export const STOREFRONT_THEME_PRESETS: Record<string, StorefrontTheme> = {
  "modern-minimal": asStorefrontTheme(modernMinimalData),
  "bold-fashion": asStorefrontTheme(boldFashionData),
  "elegant-luxe": asStorefrontTheme(elegantLuxeData),
  "vanguard-premium": asStorefrontTheme(vanguardPremiumData),
  "atelier-nova": asStorefrontTheme(atelierNovaData),
  "aura-chic": asStorefrontTheme(auraChicData),
  "solea-femme": asStorefrontTheme(soleaFemmeData),
  "zen-organic": asStorefrontTheme(zenOrganicData),
  "fakhama-elite": asStorefrontTheme(fakhamaEliteData),
  "mystic-desert": asStorefrontTheme(mysticDesertData),
  "airlume-ai": asStorefrontTheme(airlumeAiData),
  "shop-orbit": asStorefrontTheme(shopOrbitData),
  "district-market": asStorefrontTheme(districtMarketData),
  "menswear-prime": asStorefrontTheme(menswearPrimeData),
  "cairo-stride": asStorefrontTheme(cairoStrideData),
  "closet-os": asStorefrontTheme(closetOsData),
  "hayah-modest-eg": asStorefrontTheme(hayahModestEgData),
  "rihla-resort-eg": asStorefrontTheme(rihlaResortEgData),
  "layali-edit-eg": asStorefrontTheme(layaliEditEgData),
  "legacy-default-old": asStorefrontTheme(legacyDefaultOldData),
  "men-shoes-eg": asStorefrontTheme(menShoesEgData),
  "women-fashion-eg": asStorefrontTheme(womenFashionEgData),
  "look-atelier-eg": asStorefrontTheme(lookAtelierEgData),
  "khemet-luxe-eg": asStorefrontTheme(khemetLuxeEgData),
  "khemet-luxe-v2": asStorefrontTheme(khemetLuxeV2Data),
  "khemet-general-eg": asStorefrontTheme(khemetGeneralEgData),
  "khemet-fashion-eg": asStorefrontTheme(khemetFashionEgData),
  "perfume-eg": asStorefrontTheme(perfumeEgData),
  "pc-hub-eg": asStorefrontTheme(pcHubEgData),
  "rose-boutique-eg": asStorefrontTheme(roseBoutiqueEgData),
  "vela-fashion-eg": asStorefrontTheme(velaFashionEgData),
  "fitting-room-studio": asStorefrontTheme(fittingRoomStudioData),
  "nile-bistro": asStorefrontTheme(nileBistroData),
  "nova-mobile": asStorefrontTheme(novaMobileData),
  "kids-play": asStorefrontTheme(kidsPlayData),
  "max-care-go": asStorefrontTheme(maxCareGoData),
  "butcher-counter-eg": asStorefrontTheme(butcherCounterEgData),
  "pharmacy-demo": pharmacyDemoData,
  "cutline-club": cutlineClubData,
  "style-store-eg": styleStoreEgData,
  pawsome: asStorefrontTheme(pawsomeData),
  "velvet-glow": asStorefrontTheme(velvetGlowData),
  "ink-paper": asStorefrontTheme(inkPaperData),
  "bloom-studio": asStorefrontTheme(bloomStudioData),
  "iron-forge": asStorefrontTheme(ironForgeData),
  opulence: asStorefrontTheme(opulenceData),
  "turbo-parts": asStorefrontTheme(turboPartsData),
  crafted: asStorefrontTheme(craftedData),
  "fresh-cart": asStorefrontTheme(freshCartData),
  "skill-lab": asStorefrontTheme(skillLabData),
  "baladi-market-eg": asStorefrontTheme(baladiMarketEgData),
  "nile-elegance-eg": asStorefrontTheme(nileEleganceEgData),
  "prime-butcher-luxe": asStorefrontTheme(primeButcherLuxeData),
  "butcher-shop-eg": asStorefrontTheme(butcherShopEgData),
  "mens-grooming-pro": asStorefrontTheme(mensGroomingProData),
  "soft-graceful": asStorefrontTheme(softGracefulData),
  "allure": asStorefrontTheme(allureData),
  "anjella-boutique": asStorefrontTheme(anjellaBoutiqueData),
  "creative-portfolio": asStorefrontTheme(creativePortfolioData),
  "dental-lab-elite": asStorefrontTheme(dentalLabEliteData),
  "redline-auto": asStorefrontTheme(redlineAutoData),
  ...ELESSI_PACK_THEME_PRESETS,
};

export const STOREFRONT_THEME_ID_ALIASES: Record<string, string> = {
  allura: "allure",
};

export const resolveStorefrontThemeId = (themeId: string): string => {
  const normalized = typeof themeId === "string" ? themeId.trim().toLowerCase() : "";
  return STOREFRONT_THEME_ID_ALIASES[normalized] || normalized;
};

export const getStorefrontThemePresetIds = (): string[] =>
  Object.keys(STOREFRONT_THEME_PRESETS);

export const hasStorefrontThemePreset = (themeId: string): boolean => {
  const resolved = resolveStorefrontThemeId(themeId);
  return Boolean(STOREFRONT_THEME_PRESETS[resolved] || STOREFRONT_THEME_PRESETS[themeId]);
};

export const cloneStorefrontTheme = (theme: StorefrontTheme): StorefrontTheme =>
  theme ? (JSON.parse(JSON.stringify(theme)) as StorefrontTheme) : ({} as StorefrontTheme);

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
  if (slug === "collections") {
    return buildGeneratedCollectionsPageConfig(theme, label);
  }

  if (slug === "sale") {
    return buildGeneratedSalePageConfig(theme, label);
  }

  if (slug === "thank-you") {
    return buildGeneratedThankYouPageConfig(theme, label);
  }

  return buildGeneratedInfoPageConfig(theme, slug, label);
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

  if (!hasChanges) {
    return theme;
  }

  return {
    ...theme,
    pages: nextPages,
  };
};

export const getStorefrontThemePreset = (
  themeId = DEFAULT_STOREFRONT_THEME_ID,
): StorefrontTheme => {
  const normalizedThemeId =
    typeof themeId === "string" && themeId.trim().length > 0
      ? themeId.trim()
      : DEFAULT_STOREFRONT_THEME_ID;
  const resolvedThemeId = resolveStorefrontThemeId(normalizedThemeId);
  const preset =
    STOREFRONT_THEME_PRESETS[resolvedThemeId] ||
    STOREFRONT_THEME_PRESETS[normalizedThemeId] ||
    createUnregisteredThemePreset(normalizedThemeId);

  return normalizeStorefrontThemeCommercePages(
    applyStorefrontThemeExperienceOverrides(cloneStorefrontTheme(preset)),
  );
};

export type ThemeLoaderFn = (themeId: string) => Promise<StorefrontTheme>;

export const loadStorefrontThemeAsync: ThemeLoaderFn = async (
  themeId: string,
): Promise<StorefrontTheme> => {
  return getStorefrontThemePreset(themeId);
};

export const preloadStorefrontTheme = (themeId: string): void => {
  getStorefrontThemePreset(themeId);
};


