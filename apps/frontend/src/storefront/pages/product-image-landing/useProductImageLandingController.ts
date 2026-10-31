import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { getCompanyId, storefrontApi } from "../../../utils/storefrontApi";
import { buildCheckoutOrderPayload } from "../../hooks/useCheckout";
import type { Product, ProductVariant } from "../../hooks/useProducts";
import type { CartItem } from "../../store/useCartStore";
import { formatStorefrontCurrency } from "../../utils/currency";
import { getPrimaryProductImage } from "../../utils/productImages";
import { buildStorefrontPath } from "../../utils/paths";
import { resolvePostPurchaseTarget } from "../../utils/postPurchaseOffer";
import { persistPurchaseTracking } from "../../utils/purchaseTrackingStorage";
import { useStorefrontSettings } from "../../hooks/useStorefrontSettings";
import {
  canonicalizeAttributeKey,
  getVariantAttributeLabel,
  getVariantAttributes,
} from "../../utils/variants";
import {
  ensureLandingStyleFontLoaded,
  resolveLandingStyle,
} from "../../utils/landingStyles";
import { captureStorefrontAttribution } from "../../utils/orderAttribution";
import useStorefrontFacebookTracking from "../../hooks/useStorefrontFacebookTracking";
import {
  DEFAULT_FORM_STATE,
  PRODUCT_IMAGE_LANDING_CONFIGS,
} from "./productImageLandingConfigs";
import {
  cleanProductDescription,
  getActiveVariants,
  getLandingBenefitCards,
  isRecord,
  isValidEgyptianPhone,
  isVisuallyBlankCampaignSlice,
  normalizeLandingKey,
  parseLandingSeo,
  readVariantAttribute,
  sortVariantValues,
  uniqueValues,
} from "./productImageLandingHelpers";
import type {
  BundleItemSelection,
  BundleTier,
  LandingFormState,
  LandingSlice,
  ProductLandingResponse,
  PublicLandingPage,
} from "./productImageLandingTypes";

export const useProductImageLandingController = () => {
  const { id: routeId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { settings: storefrontSettings } = useStorefrontSettings();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const id = useMemo(() => {
    if (routeId) {
      return routeId;
    }

    const segments = location.pathname.split("/").filter(Boolean);
    const landingSegmentIndex = segments.findIndex(
      (segment) => segment === "lp" || segment === "landing",
    );
    const pathId =
      landingSegmentIndex >= 0 ? segments[landingSegmentIndex + 1] : "";

    return pathId || "";
  }, [location.pathname, routeId]);

  const landingKey = normalizeLandingKey(id);
  const fallbackConfig = PRODUCT_IMAGE_LANDING_CONFIGS[landingKey];
  const isLocalLandingTest = searchParams.get("landingTest") === "1";
  const isLandingPreview =
    searchParams.get("preview") === "1" ||
    searchParams.get("draftPreview") === "1";

  const [landingData, setLandingData] =
    useState<ProductLandingResponse | null>(null);
  const [isLandingLoading, setIsLandingLoading] = useState(true);
  const [landingError, setLandingError] = useState("");
  const [formState, setFormState] =
    useState<LandingFormState>(DEFAULT_FORM_STATE);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedCustomAttributes, setSelectedCustomAttributes] = useState<Record<string, string>>({});
  const [selectedBundleQty, setSelectedBundleQty] = useState<number>(1);
  const [bundleItems, setBundleItems] = useState<BundleItemSelection[]>([
    { color: "", size: "" },
    { color: "", size: "" },
    { color: "", size: "" },
  ]);
  const [activeHeroImageIndex, setActiveHeroImageIndex] = useState<number>(0);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStickyReady, setIsStickyReady] = useState(false);
  const [isFormInView, setIsFormInView] = useState(false);
  const [visibleCampaignSlices, setVisibleCampaignSlices] = useState<LandingSlice[]>([]);

  const updateBundleItem = (index: number, field: "color" | "size", value: string) => {
    setBundleItems((prev) => {
      const next = [...prev];
      while (next.length <= index) {
        next.push({ color: "", size: "" });
      }
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  useEffect(() => {
    let isCancelled = false;

    const loadLanding = async () => {
      if (!landingKey) {
        setIsLandingLoading(false);
        setLandingError("رابط صفحة الهبوط غير صحيح.");
        return;
      }

      try {
        setIsLandingLoading(true);
        setLandingError("");
        let response;
        try {
          response = isLandingPreview
            ? await storefrontApi.getProductLandingPreview(landingKey)
            : await storefrontApi.getProductLanding(landingKey);
        } catch (previewErr) {
          if (isLandingPreview) {
            response = await storefrontApi.getProductLanding(landingKey);
          } else {
            throw previewErr;
          }
        }

        if (isCancelled) {
          return;
        }

        setLandingData(response?.data || null);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setLandingData(null);
        const canUseLocalFallback = Boolean(isLocalLandingTest && fallbackConfig);
        setLandingError(
          canUseLocalFallback
            ? ""
            : error instanceof Error
              ? error.message
              : "تعذر تحميل صفحة الهبوط.",
        );
      } finally {
        if (!isCancelled) {
          setIsLandingLoading(false);
        }
      }
    };

    loadLanding();

    return () => {
      isCancelled = true;
    };
  }, [fallbackConfig, isLandingPreview, isLocalLandingTest, landingKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !landingData) return;
    const hostname = window.location.hostname.toLowerCase();
    const company = landingData.company;
    if (hostname === "maxp.online" || hostname === "www.maxp.online") {
      const targetDomain =
        company?.customDomain ||
        (company?.slug ? `${company.slug}.maxp.online` : null);
      if (targetDomain) {
        const targetUrl = `https://${targetDomain}${location.pathname}${location.search}`;
        window.location.replace(targetUrl);
      }
    }
  }, [landingData, location.pathname, location.search]);

  const activeLanding: PublicLandingPage | null = landingData?.landing || null;
  const activeProduct: Product | null =
    landingData?.product || fallbackConfig?.fallbackProduct || null;

  const landingStyle = useMemo(
    () =>
      resolveLandingStyle(
        (activeLanding as { style?: unknown } | null)?.style ?? null,
      ),
    [activeLanding],
  );

  useEffect(() => {
    ensureLandingStyleFontLoaded(landingStyle.fontKey);
  }, [landingStyle.fontKey]);

  const currency = landingData?.company?.currency || "EGP";

  useEffect(() => {
    if (typeof document === "undefined") return;
    const landingSeo = parseLandingSeo(
      (activeLanding as { seo?: unknown } | null)?.seo,
    );
    const priceText =
      Number(activeProduct?.price) > 0
        ? ` — ${formatStorefrontCurrency(Number(activeProduct.price), currency || "EGP")}`
        : "";
    const title =
      landingSeo.title ||
      activeLanding?.title ||
      activeProduct?.name ||
      document.title;
    const description =
      landingSeo.description ||
      (activeProduct?.description
        ? activeProduct.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160)
        : "");
    const ogImage = landingSeo.ogImage || activeProduct?.mainImage || "";

    const previousTitle = document.title;
    document.title = `${title}${priceText}`;

    const setMeta = (attr: string, key: string, content: string) => {
      if (!content) return;
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      if (!el.dataset.pilPrevious) el.dataset.pilPrevious = el.content || "";
      el.content = content;
    };

    setMeta("name", "description", description);
    setMeta("property", "og:title", `${title}${priceText}`);
    setMeta("property", "og:description", description);
    setMeta("property", "og:image", ogImage);
    setMeta("property", "og:type", "product");

    return () => {
      document.title = previousTitle;
    };
  }, [
    activeLanding?.id,
    activeLanding?.title,
    activeProduct?.id,
    activeProduct?.name,
    activeProduct?.price,
    activeProduct?.mainImage,
    currency,
  ]);

  useEffect(() => {
    captureStorefrontAttribution(storefrontSettings?.companyId);
  }, [storefrontSettings?.companyId]);

  const {
    trackViewContentEvent,
    trackInitiateCheckoutEvent,
  } = useStorefrontFacebookTracking();
  const hasTrackedViewContentRef = useRef<string | null>(null);
  const hasTrackedInitiateCheckoutRef = useRef(false);

  useEffect(() => {
    if (!activeLanding?.id || !activeProduct?.id || !activeProduct?.name) return;
    if (hasTrackedViewContentRef.current === activeLanding.id) return;
    hasTrackedViewContentRef.current = activeLanding.id;
    trackViewContentEvent({
      id: activeProduct.id,
      name: activeProduct.name,
      price: Number(activeProduct.price) || 0,
      category: activeProduct.category?.name || undefined,
      quantity: 1,
    });
  }, [activeLanding?.id, activeProduct, trackViewContentEvent]);

  const activeSections: any[] = useMemo(
    () =>
      (Array.isArray(activeLanding?.sections) && activeLanding!.sections!.length > 0
        ? activeLanding!.sections
        : Array.isArray(activeLanding?.formConfig?.sections)
          ? activeLanding!.formConfig!.sections
          : Array.isArray(fallbackConfig?.sections)
            ? fallbackConfig!.sections!
            : []) || [],
    [activeLanding, fallbackConfig],
  );

  const formSection = activeSections.find((s) => s?.type === "FORM");
  const textSection = activeSections.find((s) => s?.type === "TEXT");
  const featuresSection = activeSections.find((s) => s?.type === "FEATURES");
  const reviewsSection = activeSections.find((s) => s?.type === "REVIEWS");
  const faqSection = activeSections.find((s) => s?.type === "FAQ");
  const countdownSection = activeSections.find((s) => s?.type === "COUNTDOWN");
  const bannerSection = activeSections.find((s) => s?.type === "BANNERS");

  const activeConfig = useMemo(
    () => ({
      orderKicker:
        formSection?.content?.orderKicker ||
        activeLanding?.formConfig?.orderKicker ||
        fallbackConfig?.orderKicker ||
        "نموذج الطلب",
      orderTitle:
        formSection?.content?.orderTitle ||
        activeLanding?.formConfig?.orderTitle ||
        fallbackConfig?.orderTitle ||
        (activeProduct ? `اطلب ${activeProduct.name}` : "اطلب المنتج"),
      orderCopy:
        formSection?.content?.orderCopy ||
        activeLanding?.formConfig?.orderCopy ||
        fallbackConfig?.orderCopy ||
        "املأ بياناتك وسيتم التواصل معك لتأكيد الطلب.",
      buttonLabel:
        formSection?.content?.buttonLabel ||
        activeLanding?.formConfig?.buttonLabel ||
        "تأكيد الطلب",
      slices:
        activeLanding?.slices?.length
          ? activeLanding.slices
          : fallbackConfig?.slices || [],
    }),
    [formSection, activeLanding, fallbackConfig, activeProduct],
  );

  const variants = useMemo(
    () => getActiveVariants(activeProduct),
    [activeProduct],
  );

  const colorOptions = useMemo(
    () =>
      uniqueValues(
        variants.map((variant) =>
          readVariantAttribute(variant, ["Color", "Colour", "اللون"]),
        ),
      ),
    [variants],
  );

  const sizeOptions = useMemo(
    () => {
      const parsed = sortVariantValues(
        uniqueValues(
          variants.map((variant) =>
            readVariantAttribute(variant, [
              "Size",
              "Shoe Size",
              "EU Size",
              "المقاس",
            ]),
          ),
        ),
      );
      if (parsed.length > 0) return parsed;
      const isFootwear =
        /كوتشي|حذاء|سنيكر|شوز|جزمة|أحذية|boot|sneaker|shoe/i.test(activeProduct?.name || "") ||
        /كوتشي|حذاء|سنيكر|شوز/i.test(activeProduct?.description || "") ||
        /كوتشي|حذاء|سنيكر|شوز|جزمة|أحذية/i.test(activeLanding?.title || "") ||
        /كوتشي|حذاء|سنيكر|شوز|جزمة|أحذية/i.test(activeConfig?.orderTitle || "");
      if (isFootwear) {
        return ["37", "38", "39", "40", "41"];
      }
      return [];
    },
    [variants, activeProduct, activeLanding, activeConfig],
  );

  const customAttributeGroups = useMemo(() => {
    const groups: { key: string; label: string; options: string[] }[] = [];
    const keysSeen = new Set<string>();

    variants.forEach((v) => {
      const attrs = getVariantAttributes(v);
      Object.keys(attrs).forEach((rawKey) => {
        const canonical = canonicalizeAttributeKey(rawKey);
        if (canonical === "Color" || canonical === "Size" || keysSeen.has(canonical)) return;
        keysSeen.add(canonical);

        const label = getVariantAttributeLabel(rawKey, true) || rawKey;
        const options = uniqueValues(
          variants
            .map((item) => {
              const a = getVariantAttributes(item);
              return a[canonical] || a[rawKey] || "";
            })
            .filter(Boolean),
        );

        if (options.length > 0) {
          groups.push({ key: canonical, label, options });
        }
      });
    });

    return groups;
  }, [variants]);

  const selectedVariant = useMemo(() => {
    if (!variants.length) {
      return null;
    }

    return (
      variants.find((variant) => {
        const color = readVariantAttribute(variant, ["Color", "Colour", "اللون"]);
        const size = readVariantAttribute(variant, [
          "Size",
          "Shoe Size",
          "EU Size",
          "المقاس",
        ]);

        return (
          (!selectedColor || color === selectedColor) &&
          (!size || !selectedSize || size === selectedSize)
        );
      }) ||
      variants.find((variant) => {
        const color = readVariantAttribute(variant, ["Color", "Colour", "اللون"]);
        return !selectedColor || color === selectedColor;
      }) ||
      variants[0] ||
      null
    );
  }, [selectedColor, selectedSize, variants]);

  const activePrice = Number(selectedVariant?.price ?? activeProduct?.price ?? 0);

  const bundleTiers: BundleTier[] = useMemo(
    () => {
      const custom = formSection?.content?.bundles || (activeLanding?.formConfig as any)?.bundles;
      if (Array.isArray(custom) && custom.length > 0) {
        return custom;
      }
      return [
        { qty: 1, label: "قطعة واحدة", discountPercent: 0, badge: "", freeGift: "" },
        { qty: 2, label: "قطعتين (وفر 15%)", discountPercent: 15, badge: "الأكثر طلباً 🔥", freeGift: "" },
        { qty: 3, label: "3 قطع (وفر 25% + شحن مجاني)", discountPercent: 25, badge: "أفضل قيمة 💰", freeGift: "شحن مجاني + هدية" },
      ];
    },
    [formSection, activeLanding],
  );

  const whatsappPhone = useMemo(() => {
    return (
      formSection?.content?.whatsappSupportPhone ||
      (activeLanding?.formConfig as any)?.whatsappSupportPhone ||
      landingData?.company?.phone ||
      "01096781290"
    );
  }, [formSection, activeLanding, landingData]);

  const activeBundle = useMemo(
    () => bundleTiers.find((b) => b.qty === selectedBundleQty) || bundleTiers[0],
    [bundleTiers, selectedBundleQty],
  );

  const discountedUnitPrice = useMemo(() => {
    if (activeBundle.discountPercent <= 0) return activePrice;
    return Math.round(activePrice * (1 - activeBundle.discountPercent / 100));
  }, [activePrice, activeBundle]);

  const orderFinalTotal = useMemo(
    () => discountedUnitPrice * activeBundle.qty,
    [discountedUnitPrice, activeBundle],
  );

  const handleFormFirstInteraction = () => {
    if (hasTrackedInitiateCheckoutRef.current || !activeProduct?.id) return;
    hasTrackedInitiateCheckoutRef.current = true;
    const bundleCount = Math.max(1, Number(activeBundle?.qty || formState.bundleQty || 1));
    trackInitiateCheckoutEvent({
      items: [
        {
          id: activeProduct.id,
          quantity: bundleCount,
          price: Number(activePrice) || 0,
        },
      ],
      total: (Number(activePrice) || 0) * bundleCount,
    });
  };

  const sectionsToRender = useMemo(() => {
    if (activeSections.length === 0) {
      return [
        ...(bannerSection ? [bannerSection] : []),
        { id: "sec-media-default", type: "MEDIA", enabled: true, content: {} },
        { id: "sec-features-default", type: "FEATURES", enabled: true, content: {} },
        { id: "sec-form-default", type: "FORM", enabled: true, content: {} },
        ...(reviewsSection ? [reviewsSection] : []),
        ...(faqSection ? [faqSection] : []),
      ];
    }
    const hasForm = activeSections.some((s) => s?.type === "FORM" && s.enabled !== false);
    if (!hasForm) {
      return [...activeSections, { id: "sec-form-auto", type: "FORM", enabled: true, content: {} }];
    }
    return activeSections;
  }, [activeSections, bannerSection, reviewsSection, faqSection]);

  const productImage = getPrimaryProductImage(activeProduct);
  const campaignSlices = activeConfig.slices;
  const visibleCampaignSliceKey = useMemo(
    () => campaignSlices.map((slice) => slice.src).join("|"),
    [campaignSlices],
  );
  const heroImage = productImage || visibleCampaignSlices[0]?.src || campaignSlices[0]?.src || "";
  const allProductImages = useMemo(() => {
    const list: string[] = [];
    if (activeProduct?.mainImage) list.push(activeProduct.mainImage);
    if (Array.isArray(activeProduct?.images)) {
      activeProduct.images.forEach((img) => {
        if (img && typeof img === "string" && !list.includes(img)) list.push(img);
      });
    }
    if (heroImage && !list.includes(heroImage)) list.push(heroImage);
    return list;
  }, [activeProduct, heroImage]);

  const currentHeroImage = allProductImages[activeHeroImageIndex] || heroImage;
  const productDescription = cleanProductDescription(activeProduct?.description, 118);
  const customFeatures = useMemo(() => {
    if (
      Array.isArray(featuresSection?.content?.features) &&
      featuresSection.content.features.length > 0
    ) {
      return featuresSection.content.features.map((f: any) => ({
        title: f.title || "ميزة",
        text: f.desc || "",
      }));
    }
    return null;
  }, [featuresSection]);

  const landingBenefitCards =
    customFeatures ||
    getLandingBenefitCards(
      activeProduct,
      sizeOptions,
      colorOptions,
    );
  const comparePrice = Number(activeProduct?.comparePrice || 0);
  const hasComparePrice = comparePrice > activePrice;
  const companyId =
    landingData?.company?.id ||
    getCompanyId() ||
    (typeof activeProduct?.["companyId"] === "string"
      ? activeProduct["companyId"]
      : null);

  useEffect(() => {
    let isCancelled = false;

    const filterCampaignSlices = async () => {
      if (campaignSlices.length === 0) {
        setVisibleCampaignSlices([]);
        return;
      }

      const visibilityChecks = await Promise.all(
        campaignSlices.map(async (slice) => ({
          slice,
          isBlank: await isVisuallyBlankCampaignSlice(slice.src),
        })),
      );

      if (isCancelled) {
        return;
      }

      setVisibleCampaignSlices(
        visibilityChecks
          .filter((candidate) => !candidate.isBlank)
          .map((candidate) => candidate.slice),
      );
    };

    filterCampaignSlices();

    return () => {
      isCancelled = true;
    };
  }, [visibleCampaignSliceKey, campaignSlices]);

  useEffect(() => {
    const firstColor = colorOptions[0] || "";
    const firstSize = sizeOptions[0] || "";

    if (colorOptions.length > 0 && (!selectedColor || !colorOptions.includes(selectedColor))) {
      setSelectedColor(firstColor);
    }

    if (sizeOptions.length > 0 && (!selectedSize || !sizeOptions.includes(selectedSize))) {
      setSelectedSize(firstSize);
    }

    if (customAttributeGroups.length > 0) {
      setSelectedCustomAttributes((prev) => {
        let hasChange = false;
        const next = { ...prev };
        customAttributeGroups.forEach((g) => {
          if (!next[g.key] || !g.options.includes(next[g.key])) {
            next[g.key] = g.options[0];
            hasChange = true;
          }
        });
        return hasChange ? next : prev;
      });
    }

    setBundleItems((prev) => {
      const defColor = selectedColor || firstColor;
      const defSize = selectedSize || firstSize;
      const c0 = prev[0]?.color || defColor;
      const s0 = prev[0]?.size || defSize;
      const c1 = prev[1]?.color || defColor;
      const s1 = prev[1]?.size || defSize;
      const c2 = prev[2]?.color || defColor;
      const s2 = prev[2]?.size || defSize;
      if (
        prev[0]?.color === c0 &&
        prev[0]?.size === s0 &&
        prev[1]?.color === c1 &&
        prev[1]?.size === s1 &&
        prev[2]?.color === c2 &&
        prev[2]?.size === s2
      ) {
        return prev;
      }
      return [
        { color: c0, size: s0 },
        { color: c1, size: s1 },
        { color: c2, size: s2 },
      ];
    });
  }, [colorOptions, selectedColor, selectedSize, sizeOptions, customAttributeGroups]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const updateSticky = () => {
      setIsStickyReady(true);
      const orderEl = document.getElementById("order");
      if (orderEl) {
        const rect = orderEl.getBoundingClientRect();
        const inView = rect.top < window.innerHeight && rect.bottom > 80;
        setIsFormInView(inView);
      }
    };

    updateSticky();
    window.addEventListener("scroll", updateSticky, { passive: true });

    const formEl = document.getElementById("order");
    let observer: IntersectionObserver | null = null;
    if (formEl && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        ([entry]) => {
          setIsFormInView(entry.isIntersecting);
        },
        { threshold: 0.05 },
      );
      observer.observe(formEl);
    }

    return () => {
      window.removeEventListener("scroll", updateSticky);
      if (observer) observer.disconnect();
    };
  }, [activeLanding?.id, sectionsToRender.length]);

  const updateFormField =
    (field: keyof LandingFormState) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      setFormState((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const validateForm = (): string | null => {
    if (!activeProduct) {
      return "بيانات المنتج لم تجهز بعد.";
    }

    if (!formState.customerName.trim()) {
      return "يرجى كتابة الاسم بالكامل.";
    }

    if (!isValidEgyptianPhone(formState.phone)) {
      return "يرجى كتابة رقم موبايل مصري صحيح (01xxxxxxxxx).";
    }

    if (activeBundle.qty > 1) {
      for (let i = 0; i < activeBundle.qty; i++) {
        const item = bundleItems[i];
        if (colorOptions.length > 0 && (!item || !item.color)) {
          return `يرجى تحديد لون القطعة رقم ${i + 1}.`;
        }
        if (sizeOptions.length > 0 && (!item || !item.size)) {
          return `يرجى تحديد مقاس القطعة رقم ${i + 1}.`;
        }
      }
    } else {
      if (colorOptions.length > 0 && !selectedColor) {
        return "يرجى اختيار اللون.";
      }
      if (sizeOptions.length > 0 && !selectedSize) {
        return "يرجى اختيار المقاس.";
      }
      if (variants.length > 0 && !selectedVariant) {
        return "المقاس واللون المحددان غير متاحين معاً حالياً.";
      }
    }

    if (!formState.governorate.trim()) {
      return "يرجى اختيار المحافظة.";
    }

    if (!formState.area.trim()) {
      return "يرجى كتابة المنطقة أو المركز.";
    }

    if (!formState.address.trim()) {
      return "يرجى كتابة العنوان بالتفصيل.";
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationMessage = validateForm();

    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    if (!activeProduct) {
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    try {
      const landingAttribution = {
        source: "image_stack_landing",
        landingPageId: activeLanding?.id || null,
        landingPageSlug: activeLanding?.slug || landingKey,
        generationMode: activeLanding?.generationMode || "IMAGE_STACK",
      };

      let itemsToOrder: CartItem[] = [];
      let itemsSummaryNotes = "";

      if (activeBundle.qty > 1) {
        const activePieces = bundleItems.slice(0, activeBundle.qty).map((b, i) => ({
          color: b.color || selectedColor || colorOptions[0] || "",
          size: b.size || selectedSize || sizeOptions[0] || "",
        }));

        itemsSummaryNotes = activePieces
          .map(
            (p, i) =>
              `• القطعة ${i + 1}: ${p.color ? `لون ${p.color}` : ""}${p.size ? ` / مقاس ${p.size}` : ""}`.trim(),
          )
          .join("\n");

        itemsToOrder = activePieces.map((piece, pIdx) => {
          const matchedVariant = variants.find((v) => {
            const attrs = getVariantAttributes(v);
            const cMatch =
              !piece.color ||
              Object.values(attrs).some(
                (val) => String(val).trim() === piece.color.trim(),
              );
            const sMatch =
              !piece.size ||
              Object.values(attrs).some(
                (val) => String(val).trim() === piece.size.trim(),
              );
            return cMatch && sMatch;
          });
          return {
            id: matchedVariant?.id
              ? `${activeProduct.id}-${matchedVariant.id}-${pIdx}`
              : `${activeProduct.id}-landing-${pIdx}`,
            productId: activeProduct.id,
            variantId: matchedVariant?.id || undefined,
            name: `${activeProduct.name} (قطعة ${pIdx + 1})`,
            price: discountedUnitPrice,
            basePrice: Number(activeProduct.price || activePrice),
            quantity: 1,
            imageUrl: productImage,
            attributes: {
              ...(piece.color ? { Color: piece.color } : {}),
              ...(piece.size ? { Size: piece.size } : {}),
            },
          };
        });
      } else {
        const attributes = {
          ...(selectedColor ? { Color: selectedColor } : {}),
          ...(selectedSize ? { Size: selectedSize } : {}),
          ...selectedCustomAttributes,
        };
        const customSummary = Object.entries(selectedCustomAttributes)
          .map(([k, v]) => `${k}: ${v}`)
          .join(" | ");
        itemsSummaryNotes = [
          selectedColor ? `اللون: ${selectedColor}` : "",
          selectedSize ? `المقاس: ${selectedSize}` : "",
          customSummary,
        ]
          .filter(Boolean)
          .join(" | ");

        itemsToOrder = [
          {
            id: selectedVariant?.id
              ? `${activeProduct.id}-${selectedVariant.id}`
              : `${activeProduct.id}-landing`,
            productId: activeProduct.id,
            variantId: selectedVariant?.id || undefined,
            name: activeProduct.name,
            price: discountedUnitPrice,
            basePrice: Number(activeProduct.price || activePrice),
            quantity: 1,
            imageUrl: productImage,
            attributes,
          },
        ];
      }

      const pixelEventId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const payload = buildCheckoutOrderPayload(
        {
          customerName: formState.customerName.trim(),
          email: "",
          phone: formState.phone.replace(/\s+/g, ""),
          address: formState.address.trim(),
          city: formState.area.trim(),
          governorate: formState.governorate.trim(),
          notes: [
            formState.notes?.trim() ? `ملاحظات العميل: ${formState.notes.trim()}` : "",
            activeBundle.qty > 1 ? `عرض الباقة: ${activeBundle.label} (${activeBundle.qty} قطع)` : "",
            itemsSummaryNotes ? `تفاصيل ومواصفات القطع:\n${itemsSummaryNotes}` : "",
            activeLanding?.id ? `Landing Page ID: ${activeLanding.id}` : "",
            activeLanding?.slug ? `Landing Slug: ${activeLanding.slug}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
          paymentMethod: "cod",
          shippingCost: 0,
          subtotal: orderFinalTotal,
          total: orderFinalTotal,
        },
        itemsToOrder,
        orderFinalTotal,
        companyId,
        pixelEventId,
      ) as Record<string, unknown>;

      const payloadItems = Array.isArray(payload.items) ? payload.items : [];
      payload.items = payloadItems.map((payloadItem) =>
        isRecord(payloadItem)
          ? {
              ...payloadItem,
              metadata: {
                ...(isRecord(payloadItem.metadata) ? payloadItem.metadata : {}),
                landingPage: landingAttribution,
              },
            }
          : payloadItem,
      );
      payload.attribution = {
        ...(isRecord(payload.attribution) ? payload.attribution : {}),
        landingPage: landingAttribution,
      };

      const response = isLocalLandingTest
        ? {
            success: true,
            data: {
              id: `landing-test-${Date.now()}`,
              orderNumber: `LP-TEST-${Date.now()}`,
              total: activePrice,
              finalTotal: activePrice,
            },
          }
        : await storefrontApi.createOrder(payload);

      if (!response?.success) {
        throw new Error(response?.message || "تعذر إرسال الطلب الآن.");
      }

      const orderId =
        response?.data?.orderNumber || response?.data?.id || "success";

      if (!isLocalLandingTest && activeLanding?.slug) {
        storefrontApi
          .trackProductLandingOrder(activeLanding.slug, { orderId })
          .catch((trackError: unknown) => {
            console.warn("Failed to track product landing order", trackError);
          });
      }

      const targetRoute = resolvePostPurchaseTarget(
        storefrontSettings,
        itemsToOrder.map((it) => ({ productId: it.productId }))
      );
      const thankYouPath = buildStorefrontPath(
        location.pathname,
        `${targetRoute}?orderId=${encodeURIComponent(String(orderId))}`,
        location.search,
      );

      toast.success("تم إرسال طلبك بنجاح!");
      const purchaseTracking = {
        eventId: pixelEventId,
        orderNumber: String(orderId),
        total: Number(response?.data?.finalTotal ?? response?.data?.total ?? activePrice),
        phone: formState.phone,
        customerName: formState.customerName,
        paymentMethod: "cod",
        items: itemsToOrder.map((it) => ({
          id: it.id,
          productId: it.productId,
          variantId: it.variantId || undefined,
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          imageUrl: it.imageUrl,
          attributes: it.attributes || {},
        })),
      };
      persistPurchaseTracking(purchaseTracking, storefrontSettings?.companyId);

      navigate(thankYouPath, {
        state: {
          purchaseTracking,
        },
      });
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "حدث خطأ أثناء إرسال الطلب.";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    id,
    location,
    isLandingLoading,
    landingError,
    activeLanding,
    activeProduct,
    heroImage,
    campaignSlices,
    landingStyle,
    sectionsToRender,
    orderFinalTotal,
    currency,
    isStickyReady,
    isFormInView,
    whatsappPhone,
    activePrice,
    discountedUnitPrice,
    comparePrice,
    hasComparePrice,
    colorOptions,
    sizeOptions,
    customAttributeGroups,
    selectedColor,
    setSelectedColor,
    selectedSize,
    setSelectedSize,
    selectedCustomAttributes,
    setSelectedCustomAttributes,
    selectedBundleQty,
    setSelectedBundleQty,
    bundleTiers,
    activeBundle,
    bundleItems,
    updateBundleItem,
    activeHeroImageIndex,
    setActiveHeroImageIndex,
    currentHeroImage,
    allProductImages,
    visibleCampaignSlices,
    landingBenefitCards,
    productDescription,
    formState,
    updateFormField,
    formError,
    isSubmitting,
    handleSubmit,
    handleFormFirstInteraction,
    activeConfig,
    bannerSection,
    textSection,
    featuresSection,
    reviewsSection,
    faqSection,
    countdownSection,
  };
};

export default useProductImageLandingController;
