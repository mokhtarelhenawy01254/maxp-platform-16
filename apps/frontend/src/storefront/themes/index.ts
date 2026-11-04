import modernMinimalData from "./modern-minimal.json";
import boldFashionData from "./bold-fashion.json";
import womenFashionLumiereData from "./women-fashion-lumiere.json";
import womenFashionBazaarData from "./women-fashion-bazaar.json";
import womenFashionNoorData from "./women-fashion-noor.json";
import womenFashionMaisonData from "./women-fashion-maison.json";
// PREVIEW-1 — marketplace demo themes that merchants preview from the gallery.
// They ship as JSON presets in this folder but were never in
// `STOREFRONT_THEME_PRESETS`, so `getStorefrontThemePreset()` fell back to the
// "unregistered theme" diagnostic preset whenever the runtime JSON asset
// request was unavailable (blocked asset host, offline preview, tests). The
// preview-only map below keeps the preview identical to the marketplace card
// without adding these demo themes to the merchant-facing preset gallery.
import cafeDemoData from "./cafe-demo.json";
import restaurantDemoData from "./restaurant-demo.json";
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
  "women-fashion-lumiere": asStorefrontTheme(womenFashionLumiereData),
  "women-fashion-bazaar": asStorefrontTheme(womenFashionBazaarData),
  "women-fashion-noor": asStorefrontTheme(womenFashionNoorData),
  "women-fashion-maison": asStorefrontTheme(womenFashionMaisonData),
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

export * from "./themeNormalization";
import { resolveStorefrontThemeId, normalizeStorefrontThemeCommercePages } from "./themeNormalization";

const STOREFRONT_PREVIEW_ONLY_THEME_PRESETS: Record<string, StorefrontTheme> = {
  "cafe-demo": asStorefrontTheme(cafeDemoData),
  "restaurant-demo": asStorefrontTheme(restaurantDemoData),
};

const getStorefrontThemePresetEntry = (
  themeId: string,
): StorefrontTheme | undefined =>
  STOREFRONT_THEME_PRESETS[themeId] ||
  STOREFRONT_PREVIEW_ONLY_THEME_PRESETS[themeId];


export const getStorefrontThemePresetIds = (): string[] =>
  Object.keys(STOREFRONT_THEME_PRESETS);

export const hasStorefrontThemePreset = (themeId: string): boolean => {
  const resolved = resolveStorefrontThemeId(themeId);
  return Boolean(
    getStorefrontThemePresetEntry(resolved) ||
      getStorefrontThemePresetEntry(String(themeId || "")),
  );
};

export const cloneStorefrontTheme = (theme: StorefrontTheme): StorefrontTheme =>
  theme ? (JSON.parse(JSON.stringify(theme)) as StorefrontTheme) : ({} as StorefrontTheme);

export const getStorefrontThemePreset = (
  themeId = DEFAULT_STOREFRONT_THEME_ID,
): StorefrontTheme => {
  const normalizedThemeId =
    typeof themeId === "string" && themeId.trim().length > 0
      ? themeId.trim()
      : DEFAULT_STOREFRONT_THEME_ID;
  const resolvedThemeId = resolveStorefrontThemeId(normalizedThemeId);
  const preset =
    getStorefrontThemePresetEntry(resolvedThemeId) ||
    getStorefrontThemePresetEntry(normalizedThemeId) ||
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


