import type { StorefrontSettings } from "../hooks/useStorefrontSettings";
import { resolvePreviewThemeId } from "../preview/previewContext";

export interface StorefrontMarketplaceAppConfig {
  enabled: boolean;
  status?: string;
  settings?: Record<string, unknown>;
}

type JsonRecord = Record<string, unknown>;

const STYLE_STORE_PREVIEW_IDS = new Set([
  "modern-minimal",
  "solea-femme",
  "cairo-stride",
  "closet-os",
  "hayah-modest-eg",
  "layali-edit-eg",
  "khemet-luxe-eg",
  "khemet-luxe-v2",
  "khemet-general-eg",
  "khemet-fashion-eg",
  "legacy-default-old",
  "rihla-resort-eg",
]);
const KHEMET_PREVIEW_IDS = new Set([
  "khemet-luxe-eg",
  "khemet-luxe-v2",
  "khemet-general-eg",
  "khemet-fashion-eg",
]);
const RUNTIME_PHARMACY_PREVIEW_IDS = new Set(["max-care-go", "pharmacy-demo"]);

const isRuntimePharmacyThemeId = (themeId?: string | null): boolean =>
  Boolean(themeId && RUNTIME_PHARMACY_PREVIEW_IDS.has(themeId));

const isRuntimeMaxCareGoThemeId = (themeId?: string | null): boolean =>
  themeId === "max-care-go";

interface MarketplacePreviewFlags {
  previewThemeId: string | null;
  isAtelierNovaPreview: boolean;
  isElegantLuxePreview: boolean;
  isElessiPreviewTheme: boolean;
  isCafePreview: boolean;
  isBiteRushPreview: boolean;
  isDistrictMarketPreview: boolean;
  isMenShoesPreview: boolean;
  isSoleaFemmePreview: boolean;
  isWomenFashionPreview: boolean;
  isPerfumePreview: boolean;
  isVelaFashionPreview: boolean;
  isPcHubPreview: boolean;
  isRoseBoutiquePreview: boolean;
  isKhemetPreview: boolean;
  isStyleStorePreview: boolean;
  isPharmacyPreview: boolean;
  isMaxCareGoPreview: boolean;
}

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toPositiveNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveMarketplacePreviewFlags = (): MarketplacePreviewFlags => {
  const previewThemeId = resolvePreviewThemeId() || null;

  return {
    previewThemeId,
    isAtelierNovaPreview: previewThemeId === "atelier-nova",
    isElegantLuxePreview: previewThemeId === "elegant-luxe",
    isElessiPreviewTheme: previewThemeId?.startsWith("elessi-") === true,
    isCafePreview: previewThemeId === "cafe-demo",
    isBiteRushPreview: previewThemeId === "restaurant-demo",
    isDistrictMarketPreview: previewThemeId === "district-market",
    isMenShoesPreview: previewThemeId === "men-shoes-eg",
    isSoleaFemmePreview: previewThemeId === "solea-femme",
    isWomenFashionPreview: previewThemeId === "women-fashion-eg",
    isPerfumePreview: previewThemeId === "perfume-eg",
    isVelaFashionPreview: previewThemeId === "vela-fashion-eg",
    isPcHubPreview: previewThemeId === "pc-hub-eg",
    isRoseBoutiquePreview: previewThemeId === "rose-boutique-eg",
    isKhemetPreview: previewThemeId
      ? KHEMET_PREVIEW_IDS.has(previewThemeId)
      : false,
    isStyleStorePreview: previewThemeId
      ? STYLE_STORE_PREVIEW_IDS.has(previewThemeId)
      : false,
    isPharmacyPreview: isRuntimePharmacyThemeId(previewThemeId),
    isMaxCareGoPreview: isRuntimeMaxCareGoThemeId(previewThemeId),
  };
};

export const getStorefrontMarketplaceApps = (
  storefrontSettings: StorefrontSettings | null | undefined,
): Record<string, StorefrontMarketplaceAppConfig> => {
  const apps = storefrontSettings?.storefront?.apps;
  return isRecord(apps)
    ? (apps as Record<string, StorefrontMarketplaceAppConfig>)
    : {};
};

export const getStorefrontMarketplaceApp = (
  storefrontSettings: StorefrontSettings | null | undefined,
  slug: string,
): StorefrontMarketplaceAppConfig | null => {
  const apps = getStorefrontMarketplaceApps(storefrontSettings);
  return apps[slug] || null;
};

export const isStorefrontMarketplaceAppEnabled = (
  settings: StorefrontSettings | null | undefined,
  slug: string,
): boolean => {
  const appConfig = getStorefrontMarketplaceApp(settings, slug);
  const isPreview = Boolean(
    settings?.["storefront"]?.["isPreview"] ||
    settings?.["storefront"]?.["settings"]?.["isPreview"],
  );
  const { isElessiPreviewTheme } = resolveMarketplacePreviewFlags();

  if (isPreview && slug === "conversion-suite" && isElessiPreviewTheme) {
    return false;
  }

  if (isPreview) {
    const previewForceSuites = [
      "conversion-suite",
      "commerce-advanced",
      "ugc-reviews-pro",
      "quantity-offers-pro",
    ];
    if (previewForceSuites.includes(slug)) {
      return true;
    }
  }

  if (appConfig) {
    return appConfig.enabled !== false;
  }

  const apps = Array.isArray(settings?.["storefront"]?.["marketplaceApps"])
    ? (settings?.["storefront"]?.["marketplaceApps"] as JsonRecord[])
    : [];
  return apps.some((app) => app["slug"] === slug && Boolean(app["enabled"]));
};

export const getStorefrontMarketplaceAppSettings = (
  settings: StorefrontSettings | null | undefined,
  slug: string,
): Record<string, unknown> => {
  const isPreview = Boolean(
    settings?.["storefront"]?.["isPreview"] ||
    settings?.["storefront"]?.["settings"]?.["isPreview"],
  );
  const appConfig = getStorefrontMarketplaceApp(settings, slug);
  const apps = Array.isArray(settings?.["storefront"]?.["marketplaceApps"])
    ? (settings?.["storefront"]?.["marketplaceApps"] as JsonRecord[])
    : [];
  const app = apps.find((entry) => entry["slug"] === slug);
  const baseSettings =
    (appConfig?.settings as Record<string, unknown>) ||
    (app?.["settings"] as Record<string, unknown>) ||
    {};

  if (isPreview) {
    if (slug === "conversion-suite") {
      const {
        isAtelierNovaPreview,
        isElegantLuxePreview,
        isCafePreview,
        isBiteRushPreview,
        isDistrictMarketPreview,
        isMenShoesPreview,
        isSoleaFemmePreview,
        isWomenFashionPreview,
        isPerfumePreview,
        isVelaFashionPreview,
        isPcHubPreview,
        isRoseBoutiquePreview,
        isKhemetPreview,
        isStyleStorePreview,
        isPharmacyPreview,
        isMaxCareGoPreview,
      } = resolveMarketplacePreviewFlags();
      const baseCopy = (baseSettings["copy"] as Record<string, unknown>) || {};
      const isCalmEditorialPreview =
        isRoseBoutiquePreview || isAtelierNovaPreview;

      return {
        ...baseSettings,
        modules: {
          saleCountdown:
            !isDistrictMarketPreview &&
            !isMenShoesPreview &&
            !isWomenFashionPreview &&
            !isPerfumePreview &&
            !isVelaFashionPreview &&
            !isCalmEditorialPreview &&
            !isPcHubPreview,
          exitIntentPopup:
            !isDistrictMarketPreview &&
            !isMenShoesPreview &&
            !isWomenFashionPreview &&
            !isPerfumePreview &&
            !isVelaFashionPreview &&
            !isCalmEditorialPreview &&
            !isPcHubPreview,
          lowStockNotice: !isCalmEditorialPreview,
          bulkSavings: !isCalmEditorialPreview,
          fakeVisitorCounter: !isCalmEditorialPreview,
          fakeSalePopup:
            !isDistrictMarketPreview &&
            !isMenShoesPreview &&
            !isWomenFashionPreview &&
            !isPerfumePreview &&
            !isVelaFashionPreview &&
            !isCalmEditorialPreview &&
            !isPcHubPreview,
          soldCounter: !isCalmEditorialPreview,
          estimatedDelivery: !isCalmEditorialPreview,
          freeShippingBar:
            !isMenShoesPreview &&
            !isWomenFashionPreview &&
            !isPerfumePreview &&
            !isVelaFashionPreview &&
            !isCalmEditorialPreview &&
            !isPcHubPreview,
          stickyAddToCart: true,
          backInStock: !isCalmEditorialPreview,
          trustedBadges: !isCalmEditorialPreview,
          purchaseFomo:
            !isDistrictMarketPreview &&
            !isMenShoesPreview &&
            !isWomenFashionPreview &&
            !isPerfumePreview &&
            !isVelaFashionPreview &&
            !isCalmEditorialPreview &&
            !isPcHubPreview,
          inactiveTab:
            !isDistrictMarketPreview &&
            !isMenShoesPreview &&
            !isWomenFashionPreview &&
            !isPerfumePreview &&
            !isVelaFashionPreview &&
            !isCalmEditorialPreview &&
            !isPcHubPreview,
          crossSell:
            isBiteRushPreview ||
            isPharmacyPreview ||
            isCafePreview ||
            isMenShoesPreview ||
            isSoleaFemmePreview ||
            isWomenFashionPreview ||
            isPerfumePreview ||
            isRoseBoutiquePreview ||
            isAtelierNovaPreview ||
            isPcHubPreview,
          boughtTogether:
            isBiteRushPreview ||
            isPharmacyPreview ||
            isCafePreview ||
            isMenShoesPreview ||
            isSoleaFemmePreview ||
            isWomenFashionPreview ||
            isPerfumePreview ||
            isRoseBoutiquePreview ||
            isAtelierNovaPreview ||
            isPcHubPreview,
        },
        general: {
          renderInTemplates: true,
          attachToThemeShell: true,
        },
        ui: {
          barPosition: "top",
          countdownStyle: "split",
          lowStockStyle: "meter",
          estimatedDeliveryStyle: "timeline",
          fakeVisitorStyle: "pulse",
          soldCounterStyle: "spotlight",
          purchaseFomoStyle: "timeline",
          popupStyle: "promo",
          stickyStyle: "balanced",
          trustedBadgeStyle: "grid",
          backInStockStyle: "accent",
          cartUpsellStyle: isBiteRushPreview
            ? "editorial"
            : isMenShoesPreview
              ? "editorial"
              : isCafePreview
                ? "stacked"
                : "stacked",
        },
        thresholds: {
          freeShippingAmount: isCafePreview ? 350 : 500,
          lowStockLimit: 12,
          fakeVisitorMin: 8,
          fakeVisitorMax: 24,
          purchaseFomoCartWindowHours: 24,
          purchaseFomoRecentPurchaseWindowHours: 48,
        },
        copy: {
          freeShippingMessage: "Add {{remaining}} to unlock free shipping!",
          freeShippingReachedMessage: "You unlocked free shipping",
          countdownLabel: "Limited time offer ends in",
          exitIntentTitle: "Wait! Don't Miss Out",
          exitIntentDescription:
            "Get an extra 10% off your order if you complete your purchase now.",
          exitIntentCouponCode: "SAVE10NOW",
          fakeVisitorMessage: "{{count}} people are viewing this right now",
          soldCounterMessage: "Sold {{count}} times in the last 24 hours",
          cartUpsellBadge: "Upsell",
          cartUpsellTitle: "Continue building your order",
          cartUpsellDescription: "Add a few extra picks before checkout.",
          crossSellTitle: "Cross Sell",
          crossSellDescription: "Add complementary picks",
          boughtTogetherTitle: "Bought Together",
          boughtTogetherDescription: "Popular pairings for this product",
          quickAddLabel: "Quick add",
          chooseOptionsLabel: "Choose options",
          ...baseCopy,
          ...(isKhemetPreview
            ? {
                freeShippingMessage:
                  "ضيفي {{remaining}} ووصلي للشحن المجاني",
                freeShippingReachedMessage:
                  "تم تفعيل الشحن المجاني للطلب ده",
                cartUpsellBadge: "يكمل الطلب",
                cartUpsellTitle: "اختيارات مع نفس الستايل",
                cartUpsellDescription:
                  "موديلات قريبة تزوّد قيمة السلة وتخلي الشحن المجاني أقرب.",
                crossSellTitle: "اختيارات قريبة",
                crossSellDescription:
                  "موديلات أو ألوان قريبة من نفس روح الاختيار الحالي",
                boughtTogetherTitle: "يليق معه أيضاً",
                boughtTogetherDescription:
                  "ترشيحات سريعة تكمل نفس اللوك قبل تأكيد الطلب",
                quickAddLabel: "أضيفي مباشرة",
                chooseOptionsLabel: "اختاري اللون أو المقاس",
              }
            : isBiteRushPreview
            ? {
                freeShippingMessage: "أضف {{remaining}} وخلي التوصيل علينا",
                freeShippingReachedMessage: "التوصيل علينا في الطلب ده",
                countdownLabel: "عرض الجوع السريع ينتهي خلال",
                exitIntentTitle: "لسه في وجبة ناقصة",
                exitIntentDescription:
                  "كمّل الطلب الآن وخد خصم إضافي على الوجبات السريعة اللي في السلة.",
                exitIntentCouponCode: "RUSH10",
                exitIntentCouponHint: "انسخ الكود وفعّله قبل تأكيد الطلب.",
                exitIntentPrimaryLabel: "كمّل الطلب",
                exitIntentSecondaryLabel: "يمكن لاحقًا",
                exitIntentBadge: "عرض أخير",
                inactiveTabTitle: "ارجع، طلبك ما زال ساخن",
                cartUpsellBadge: "يزبط الطلب",
                cartUpsellTitle: "زود الطلب بحاجة تكمله",
                cartUpsellDescription:
                  "إضافة خفيفة أو مشروب ترفع قيمة الطلب من غير ما تعطل القرار.",
                crossSellTitle: "أصناف تكمل الوجبة",
                crossSellDescription: "اختيارات سريعة مع نفس الطلب",
                boughtTogetherTitle: "يُطلب معاه كثير",
                boughtTogetherDescription: "توليفات BiteRush الأكثر طلبًا",
                quickAddLabel: "أضف بسرعة",
                chooseOptionsLabel: "اختر الإضافات",
                fakeVisitorMessage: "{{count}} شخص يشاهد الطلب الآن",
                soldCounterMessage: "انطلب {{count}} مرة خلال آخر 24 ساعة",
              }
            : isCafePreview
              ? {
                  freeShippingMessage:
                    "أضف {{remaining}} وخلي التوصيل على المقهى",
                  freeShippingReachedMessage: "التوصيل علينا في الطلب الحالي",
                  countdownLabel: "عرض الباريستا ينتهي خلال",
                  exitIntentTitle: "لسه في فنجان ناقص",
                  exitIntentDescription:
                    "كمّل الطلب الآن وخد خصم إضافي على القهوة أو المخبوزات قبل ما يخلص عرض اليوم.",
                  exitIntentCouponCode: "BREW10",
                  exitIntentCouponHint: "انسخ الكود وفعّله قبل تأكيد الطلب.",
                  exitIntentPrimaryLabel: "كمّل الطلب",
                  exitIntentSecondaryLabel: "أراجع لاحقًا",
                  exitIntentBadge: "عرض الكافيه",
                  inactiveTabTitle: "طلب القهوة ما زال ينتظرك في السلة",
                  cartUpsellBadge: "تكملة الطلب",
                  cartUpsellTitle: "اختيارات تكمل القهوة",
                  cartUpsellDescription:
                    "مخبوزات، أكواب باردة، أو أدوات تحضير ترفع قيمة الطلب وتحافظ على نفس المزاج.",
                  crossSellTitle: "يكمل طلبك الآن",
                  crossSellDescription: "اختيارات مناسبة مع نفس الطلب",
                  boughtTogetherTitle: "يطلب معًا كثيرًا",
                  boughtTogetherDescription: "ترشيحات Müt Coffee الأكثر طلبًا",
                  quickAddLabel: "أضف بسرعة",
                  chooseOptionsLabel: "اختر الحجم",
                  fakeVisitorMessage: "{{count}} عميل يتصفح هذا المنتج الآن",
                  soldCounterMessage: "طُلب {{count}} مرة خلال آخر 24 ساعة",
                }
              : isMenShoesPreview
                ? {
                    cartUpsellBadge: "تكملة الطلب",
                    cartUpsellTitle: "منتجات تكمّل الطلب قبل الدفع",
                    cartUpsellDescription:
                      "موديلات قريبة أو إضافات صغيرة ترفع قيمة الطلب من غير لف كثير.",
                    crossSellTitle: "موديلات قريبة",
                    crossSellDescription: "بدائل سريعة لنفس الاستخدام",
                    boughtTogetherTitle: "يكمل الحذاء",
                    boughtTogetherDescription:
                      "إضافات أو موديلات ثانية تناسب نفس الطلب",
                    quickAddLabel: "أضف مباشرة",
                    chooseOptionsLabel: "اختر المقاس",
                  }
                : isSoleaFemmePreview
                  ? {
                      cartUpsellBadge: "يكمل الخطوة",
                      cartUpsellTitle: "موديلات تكمل قرارك",
                      cartUpsellDescription:
                        "موديلات قريبة من نفس الارتفاع أو الراحة حتى تكملي السلة من غير تشويش.",
                      crossSellTitle: "موديلات قريبة من اختيارك",
                      crossSellDescription:
                        "بدائل أو درجات قريبة من نفس الإحساس قبل تأكيد الطلب.",
                      boughtTogetherTitle: "توليفة تكمل الحذاء",
                      boughtTogetherDescription:
                        "موديلات ثانية لنفس المناسبة أو لاستخدام مختلف بنفس الإيقاع.",
                      quickAddLabel: "أضيفي بسرعة",
                      chooseOptionsLabel: "اختاري المقاس أو اللون",
                      postPurchaseUpsellTitle: "خطوة أخيرة لنفس اللوك",
                      postPurchaseUpsellDescription:
                        "موديلات قريبة أو إضافة خفيفة لنفس المناسبة لو حبيتي تكملي الطلب.",
                      postPurchaseUpsellBadge: "بعد تأكيد الطلب",
                    }
                  : isWomenFashionPreview
                    ? {
                        cartUpsellBadge: "يكمل الطلب",
                        cartUpsellTitle: "يكمل طلبك",
                        cartUpsellDescription:
                          "اختيارات صغيرة تكمل الطلب وتزود قيمة السلة بشكل طبيعي.",
                        crossSellTitle: "قطع قريبة من اختيارك",
                        crossSellDescription:
                          "بدائل سريعة أو إضافات خفيفة لنفس اللوك",
                        boughtTogetherTitle: "كمّلي الإطلالة",
                        boughtTogetherDescription:
                          "إضافات من نفس الجو العام بدون الخروج من مسار الشراء",
                        quickAddLabel: "أضيفي مباشرة",
                        chooseOptionsLabel: "اختاري اللون والمقاس",
                      }
                    : isStyleStorePreview
                      ? {
                          cartUpsellBadge: "يكمل الطلب",
                          cartUpsellTitle: "اختيارات مع نفس الجو",
                          cartUpsellDescription:
                            "منتجات بسيطة تكمل الطلب بدون لف كثير.",
                          crossSellTitle: "اختيارات قريبة",
                          crossSellDescription:
                            "بدائل وإضافات من نفس أسلوب المنتج الحالي",
                          boughtTogetherTitle: "يليق معه أيضًا",
                          boughtTogetherDescription:
                            "ترشيحات سريعة من نفس روح اللوك",
                          quickAddLabel: "أضف مباشرة",
                          chooseOptionsLabel: "اختاري اللون أو المقاس",
                        }
                      : isAtelierNovaPreview
                        ? {
                            cartUpsellBadge: "يكمل اللوك",
                            cartUpsellTitle: "قطع تكمل نفس الإيقاع",
                            cartUpsellDescription:
                              "إضافات هادئة من نفس الدفعة تحافظ على مزاج اللوك من غير ما تزاحمه.",
                            crossSellTitle: "قطع قريبة من هذه القطعة",
                            crossSellDescription:
                              "بدائل أو إضافات داخل نفس الدفعة التحريرية",
                            boughtTogetherTitle: "يكتمل معها",
                            boughtTogetherDescription:
                              "اقتراحات صغيرة تحافظ على نفس الهدوء البصري",
                            quickAddLabel: "أضيفي بسرعة",
                            chooseOptionsLabel: "اختاري اللون أو المقاس",
                          }
                        : isRoseBoutiquePreview
                          ? {
                              cartUpsellBadge: "يكمل اللوك",
                              cartUpsellTitle: "اختيارات تكمل اللوك",
                              cartUpsellDescription:
                                "إضافات هادئة وقطع قريبة من نفس الروح قبل تأكيد الطلب.",
                              crossSellTitle: "قطع قريبة من اختيارك",
                              crossSellDescription:
                                "بدائل ناعمة أو إضافات من نفس المجموعة",
                              boughtTogetherTitle: "يلائم القطعة",
                              boughtTogetherDescription:
                                "ترشيحات تحافظ على نفس الإيقاع واللوك",
                              quickAddLabel: "أضيفي بسرعة",
                              chooseOptionsLabel: "اختاري المقاس أو اللون",
                            }
                          : isPharmacyPreview
                            ? {
                                freeShippingMessage:
                                  "أضف {{remaining}} للحصول على توصيل مجاني للطلب الطبي",
                                freeShippingReachedMessage:
                                  "تم تفعيل التوصيل المجاني لهذا الطلب",
                                countdownLabel:
                                  "عروض الرعاية اليومية تنتهي خلال",
                                exitIntentTitle: "قبل ما تخرج",
                                exitIntentDescription:
                                  "أضف احتياجاتك الأساسية الآن واستفد من العرض قبل انتهاء وقت التوصيل السريع.",
                                exitIntentCouponCode: isMaxCareGoPreview
                                  ? "GO10"
                                  : "CARE10",
                                exitIntentCouponHint:
                                  "فعّل الكود قبل تأكيد الطلب لتوفير إضافي.",
                                exitIntentPrimaryLabel: "كمّل الطلب",
                                exitIntentSecondaryLabel: "أراجع لاحقًا",
                                exitIntentBadge: "عرض اليوم",
                                inactiveTabTitle: isMaxCareGoPreview
                                  ? "طلبك السريع ما زال جاهزًا في السلة"
                                  : "احتياجاتك الصحية ما زالت في السلة",
                                cartUpsellBadge: "احتياج إضافي",
                                cartUpsellTitle: isMaxCareGoPreview
                                  ? "منتجات تكمل الطلب السريع"
                                  : "منتجات تكمل الطلب",
                                cartUpsellDescription: isMaxCareGoPreview
                                  ? "إضافات سريعة للاستخدام اليومي أو الطوارئ قبل ما تغلق الطلب."
                                  : "اختيارات مناسبة للاستخدام اليومي أو للطوارئ بجانب المنتجات الحالية.",
                                crossSellTitle: "مناسب مع طلبك",
                                crossSellDescription:
                                  "منتجات مكملة لنفس الاستخدام",
                                boughtTogetherTitle: "يطلب معًا كثيرًا",
                                boughtTogetherDescription: isMaxCareGoPreview
                                  ? "ترشيحات شائعة لطلبات Max Care Go"
                                  : "ترشيحات شائعة لطلبات Max Care",
                                quickAddLabel: "أضف بسرعة",
                                chooseOptionsLabel: "اختر العبوة",
                                fakeVisitorMessage:
                                  "{{count}} عميل يشاهد هذا المنتج الآن",
                                soldCounterMessage:
                                  "تم طلبه {{count}} مرة خلال آخر 24 ساعة",
                              }
                            : {}),
        },
        countdown: {
          endsAt: new Date(Date.now() + 86400000 * 2).toISOString(),
        },
        estimatedDelivery: {
          minDays: isPharmacyPreview ? 1 : isCafePreview ? 1 : 2,
          maxDays: isPharmacyPreview ? 2 : isCafePreview ? 2 : 5,
          label: isBiteRushPreview
            ? "وقت الوصول المتوقع"
            : isCafePreview
              ? "وقت التحضير المتوقع"
              : isPharmacyPreview
                ? "وقت التوصيل المتوقع"
                : isElegantLuxePreview
                  ? "موعد الوصول المتوقع"
                : "Estimated Arrival",
        },
      };
    }

    if (slug === "commerce-advanced") {
      return {
        ...baseSettings,
        modules: {
          preOrder: true,
          externalAffiliate: true,
        },
        ui: {
          preOrderStyle: "card",
          externalLinkStyle: "card",
        },
        copy: {
          preOrderLabel: "Pre-order now for priority delivery",
          affiliateLabel: "Buy from official partner",
        },
      };
    }

    if (slug === "ugc-reviews-pro") {
      return {
        ...baseSettings,
        modules: {
          photoReviews: true,
          videoReviews: true,
          verifiedBadge: true,
          helpfulCounter: true,
        },
        ui: {
          galleryStyle: "mosaic",
          cardStyle: "editorial",
        },
      };
    }

    if (slug === "quantity-offers-pro") {
      return {
        ...baseSettings,
        general: {
          enabled: true,
        },
        modules: {
          renderOnProductPage: true,
          mixAndMatch: true,
        },
        ui: {
          layout: "cards",
          selectorMode: "expanded",
        },
        copy: {
          title: "عروض الكميات",
          subtitle:
            "اختر العرض المناسب، ثم حدّد اللون أو المقاس لكل قطعة من نفس المكان.",
          addOfferLabel: "أضف العرض إلى السلة",
          copyFirstSelectionLabel: "نسخ اختيار القطعة الأولى",
          freeShippingLabel: "شحن مجاني",
          bestValueLabel: "الأكثر توفيرًا",
          ...((baseSettings["copy"] as Record<string, unknown>) || {}),
        },
      };
    }
  }

  return baseSettings;
};

export interface StorefrontFreeShippingPromotion {
  enabled: boolean;
  eligible: boolean;
  threshold: number;
  remaining: number;
}

export const getStorefrontFreeShippingPromotion = (
  settings: StorefrontSettings | null | undefined,
  subtotal: number,
): StorefrontFreeShippingPromotion => {
  const conversionEnabled = isStorefrontMarketplaceAppEnabled(
    settings,
    "conversion-suite",
  );
  const conversionSettings = getStorefrontMarketplaceAppSettings(
    settings,
    "conversion-suite",
  );
  const modules = isRecord(conversionSettings["modules"])
    ? conversionSettings["modules"]
    : {};
  const thresholds = isRecord(conversionSettings["thresholds"])
    ? conversionSettings["thresholds"]
    : {};
  const threshold = toPositiveNumber(thresholds["freeShippingAmount"], 0);
  const normalizedSubtotal = Math.max(0, Number(subtotal) || 0);
  const enabled =
    conversionEnabled &&
    modules["freeShippingBar"] !== false &&
    threshold > 0;

  return {
    enabled,
    eligible: enabled && normalizedSubtotal >= threshold,
    threshold,
    remaining: enabled ? Math.max(threshold - normalizedSubtotal, 0) : 0,
  };
};
