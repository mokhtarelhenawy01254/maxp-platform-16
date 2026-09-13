import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { EGYPT_GOVERNORATES } from "../../constants/egyptGovernorates";
import { getCompanyId, storefrontApi } from "../../utils/storefrontApi";
import { buildCheckoutOrderPayload } from "../hooks/useCheckout";
import type { Product, ProductVariant } from "../hooks/useProducts";
import type { CartItem } from "../store/useCartStore";
import { formatStorefrontCurrency } from "../utils/currency";
import { getPrimaryProductImage } from "../utils/productImages";
import { buildStorefrontPath } from "../utils/paths";
import { persistPurchaseTracking } from "../utils/purchaseTrackingStorage";
import { isValidStorefrontPhone } from "../utils/phoneValidation";
import "./ProductImageLandingPage.css";

type LandingSlice = {
  id?: string;
  src: string;
  alt: string;
  prompt?: string;
  width?: number;
  height?: number;
  sortOrder?: number;
};

type ProductLandingConfig = {
  fallbackProduct?: Product;
  slices: LandingSlice[];
  orderKicker: string;
  orderTitle: string;
  orderCopy: string;
};

type PublicLandingPage = {
  id: string;
  companyId: string;
  productId: string;
  slug: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "PAUSED";
  generationMode: string;
  generationStatus: string;
  designNotes?: string;
  slices: LandingSlice[];
  sections?: any[];
  formConfig?: {
    orderKicker?: string;
    orderTitle?: string;
    orderCopy?: string;
    buttonLabel?: string;
    sections?: any[];
  };
  visits?: number;
  orders?: number;
};

type ProductLandingResponse = {
  landing: PublicLandingPage;
  product: Product;
  company: {
    id: string;
    name?: string;
    slug?: string;
    logo?: string | null;
    currency?: string | null;
  };
};

type LandingFormState = {
  customerName: string;
  phone: string;
  governorate: string;
  area: string;
  address: string;
};

type AttributeMap = Record<string, string>;

const PRODUCT_IMAGE_LANDING_CONFIGS: Record<string, ProductLandingConfig> = {
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
};

const DEFAULT_FORM_STATE: LandingFormState = {
  customerName: "",
  phone: "",
  governorate: "",
  area: "",
  address: "",
};

const normalizeLandingKey = (value?: string | null): string => {
  const decodedValue = (() => {
    try {
      return decodeURIComponent(value || "");
    } catch {
      return value || "";
    }
  })();

  return decodedValue.trim().toLowerCase();
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getVariantAttributes = (variant?: ProductVariant | null): AttributeMap => {
  const rawAttributes = variant?.attributes || variant?.attributeValues || null;

  if (!rawAttributes) {
    return {};
  }

  if (typeof rawAttributes === "string") {
    try {
      const parsed = JSON.parse(rawAttributes);
      return isRecord(parsed)
        ? Object.fromEntries(
            Object.entries(parsed).map(([key, value]) => [key, String(value)]),
          )
        : {};
    } catch {
      return {};
    }
  }

  if (isRecord(rawAttributes)) {
    return Object.fromEntries(
      Object.entries(rawAttributes).map(([key, value]) => [key, String(value)]),
    );
  }

  return {};
};

const readVariantAttribute = (
  variant: ProductVariant,
  keys: string[],
): string => {
  const attributes = getVariantAttributes(variant);
  const normalizedKeys = keys.map((key) => key.trim().toLowerCase());
  const entry = Object.entries(attributes).find(([key]) =>
    normalizedKeys.includes(key.trim().toLowerCase()),
  );

  return entry?.[1]?.trim() || "";
};

const getActiveVariants = (product?: Product | null): ProductVariant[] => {
  const variants = product?.productVariants || product?.variants || [];

  return Array.isArray(variants)
    ? variants.filter((variant) => variant?.["isActive"] !== false)
    : [];
};

const uniqueValues = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const sortVariantValues = (values: string[]) =>
  [...values].sort((a, b) => {
    const left = Number(a);
    const right = Number(b);

    if (Number.isFinite(left) && Number.isFinite(right)) {
      return left - right;
    }

    return a.localeCompare(b, "ar");
  });

const isValidEgyptianPhone = (value: string) =>
  isValidStorefrontPhone(value);

const formatPrice = (value: number, currency: string): string =>
  formatStorefrontCurrency(value, currency).replace("EGP", "جنيه");

const cleanProductDescription = (value?: string | null, maxLength = 150): string => {
  const text = String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > maxLength
    ? `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`
    : text;
};

const isVisuallyBlankCampaignSlice = (src: string): Promise<boolean> => {
  if (typeof window === "undefined" || !src.trim()) {
    return Promise.resolve(false);
  }

  const imageUrl = /^https?:\/\//i.test(src)
    ? src
    : new URL(src, window.location.origin).toString();

  return new Promise((resolve) => {
    const image = new window.Image();
    let isSettled = false;
    const finish = (value: boolean) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      window.clearTimeout(timeoutId);
      resolve(value);
    };
    const timeoutId = window.setTimeout(() => finish(false), 1200);

    image.crossOrigin = "anonymous";
    image.decoding = "async";

    image.onload = () => {
      try {
        const sampleWidth = Math.max(1, Math.min(48, image.naturalWidth || 48));
        const sampleHeight = Math.max(1, Math.min(48, image.naturalHeight || 48));
        const canvas = document.createElement("canvas");
        canvas.width = sampleWidth;
        canvas.height = sampleHeight;

        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          finish(false);
          return;
        }

        context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
        const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);

        let visiblePixelCount = 0;
        let brightnessSum = 0;
        let minBrightness = 255;
        let maxBrightness = 0;

        for (let index = 0; index < data.length; index += 4) {
          const alpha = data[index + 3] || 0;
          if (alpha < 16) {
            continue;
          }

          const red = data[index] || 0;
          const green = data[index + 1] || 0;
          const blue = data[index + 2] || 0;
          const brightness = red * 0.2126 + green * 0.7152 + blue * 0.0722;

          visiblePixelCount += 1;
          brightnessSum += brightness;
          minBrightness = Math.min(minBrightness, brightness);
          maxBrightness = Math.max(maxBrightness, brightness);
        }

        if (visiblePixelCount === 0) {
          finish(true);
          return;
        }

        const averageBrightness = brightnessSum / visiblePixelCount;
        const brightnessRange = maxBrightness - minBrightness;
        finish(averageBrightness < 8 && brightnessRange < 8);
      } catch {
        finish(false);
      }
    };

    image.onerror = () => finish(true);
    image.src = imageUrl;
  });
};

const getLandingBenefitCards = (
  product: Product | null,
  sizeOptions: string[],
  colorOptions: string[],
) => {
  const description = cleanProductDescription(product?.description);
  const cards = [
    description
      ? {
          title: "تفاصيل واضحة",
          text: description,
        }
      : null,
    sizeOptions.length > 1
      ? {
          title: "مقاسات متاحة",
          text: `من ${sizeOptions[0]} إلى ${sizeOptions[sizeOptions.length - 1]}`,
        }
      : null,
    colorOptions.length > 0
      ? {
          title: "ألوان للاختيار",
          text: colorOptions.slice(0, 3).join("، "),
        }
      : null,
    {
      title: "طلب سريع",
      text: "املأ البيانات وسيتم التواصل معك لتأكيد الطلب قبل الشحن.",
    },
  ].filter(Boolean) as Array<{ title: string; text: string }>;

  return cards.slice(0, 4);
};

const ProductImageLandingPage: React.FC = () => {
  const { id: routeId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
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
  const [selectedBundleQty, setSelectedBundleQty] = useState<number>(1);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStickyReady, setIsStickyReady] = useState(false);
  const [visibleCampaignSlices, setVisibleCampaignSlices] = useState<LandingSlice[]>([]);

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

  const activeLanding = landingData?.landing || null;
  const activeProduct =
    landingData?.product || fallbackConfig?.fallbackProduct || null;
  const activeSections: any[] = useMemo(
    () =>
      (Array.isArray(activeLanding?.sections) && activeLanding!.sections!.length > 0
        ? activeLanding!.sections
        : Array.isArray(activeLanding?.formConfig?.sections)
          ? activeLanding!.formConfig!.sections
          : []) || [],
    [activeLanding],
  );

  const formSection = activeSections.find((s) => s?.type === "FORM");
  const textSection = activeSections.find((s) => s?.type === "TEXT");
  const featuresSection = activeSections.find((s) => s?.type === "FEATURES");
  const reviewsSection = activeSections.find((s) => s?.type === "REVIEWS");
  const faqSection = activeSections.find((s) => s?.type === "FAQ");
  const countdownSection = activeSections.find((s) => s?.type === "COUNTDOWN");
  const bannerSection = activeSections.find((s) => s?.type === "BANNERS");

  const activeConfig = {
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
  };

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
    () =>
      sortVariantValues(
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
      ),
    [variants],
  );
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
          (!selectedSize || size === selectedSize)
        );
      }) || null
    );
  }, [selectedColor, selectedSize, variants]);
  const currency = landingData?.company?.currency || "EGP";
  const activePrice = Number(selectedVariant?.price ?? activeProduct?.price ?? 0);

  const bundleTiers = useMemo(
    () => [
      { qty: 1, label: "قطعة واحدة", discountPercent: 0, badge: "" },
      { qty: 2, label: "قطعتين (وفر 15%)", discountPercent: 15, badge: "الأكثر طلباً 🔥" },
      { qty: 3, label: "3 قطع (وفر 25% + شحن مجاني)", discountPercent: 25, badge: "أفضل قيمة 💰" },
    ],
    [],
  );

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
  }, [visibleCampaignSliceKey]);

  useEffect(() => {
    if (colorOptions.length > 0 && (!selectedColor || !colorOptions.includes(selectedColor))) {
      setSelectedColor(colorOptions[0]);
    }

    if (sizeOptions.length > 0 && (!selectedSize || !sizeOptions.includes(selectedSize))) {
      setSelectedSize(sizeOptions[0]);
    }
  }, [colorOptions, selectedColor, selectedSize, sizeOptions]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const updateSticky = () => {
      setIsStickyReady(window.scrollY > window.innerHeight * 0.65);
    };

    updateSticky();
    window.addEventListener("scroll", updateSticky, { passive: true });
    return () => window.removeEventListener("scroll", updateSticky);
  }, []);

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
      return "اكتبي الاسم.";
    }

    if (!isValidEgyptianPhone(formState.phone)) {
      return "اكتبي رقم موبايل مصري صحيح.";
    }

    if (colorOptions.length > 0 && !selectedColor) {
      return "اختاري اللون.";
    }

    if (sizeOptions.length > 0 && !selectedSize) {
      return "اختاري المقاس.";
    }

    if (variants.length > 0 && !selectedVariant) {
      return "الاختيارات المحددة غير متاحة مع بعض.";
    }

    if (!formState.governorate.trim()) {
      return "اختاري المحافظة.";
    }

    if (!formState.area.trim()) {
      return "اكتبي المنطقة.";
    }

    if (!formState.address.trim()) {
      return "اكتبي العنوان بالتفصيل.";
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
      const attributes = {
        ...(selectedColor ? { Color: selectedColor } : {}),
        ...(selectedSize ? { Size: selectedSize } : {}),
      };
      const landingAttribution = {
        source: "image_stack_landing",
        landingPageId: activeLanding?.id || null,
        landingPageSlug: activeLanding?.slug || landingKey,
        generationMode: activeLanding?.generationMode || "IMAGE_STACK",
      };
      const item: CartItem = {
        id: selectedVariant?.id
          ? `${activeProduct.id}-${selectedVariant.id}`
          : `${activeProduct.id}-landing`,
        productId: activeProduct.id,
        variantId: selectedVariant?.id || undefined,
        name: activeProduct.name,
        price: discountedUnitPrice,
        basePrice: Number(activeProduct.price || activePrice),
        quantity: activeBundle.qty,
        imageUrl: productImage,
        attributes,
      };
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
            "Image-stack landing page",
            activeBundle.qty > 1
              ? `عرض الباقة: ${activeBundle.label} (${activeBundle.qty} قطع)`
              : "",
            activeLanding?.id ? `Landing Page ID: ${activeLanding.id}` : "",
            activeLanding?.slug ? `Landing Slug: ${activeLanding.slug}` : "",
            selectedColor ? `اللون: ${selectedColor}` : "",
            selectedSize ? `المقاس: ${selectedSize}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          paymentMethod: "cod",
          shippingCost: 0,
          subtotal: orderFinalTotal,
          total: orderFinalTotal,
        },
        [item],
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

      const thankYouPath = buildStorefrontPath(
        location.pathname,
        `/thank-you?orderId=${encodeURIComponent(String(orderId))}`,
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
        items: [
          {
            id: item.id,
            productId: item.productId,
            variantId: item.variantId || undefined,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            imageUrl: item.imageUrl,
            attributes: item.attributes || {},
          },
        ],
      };
      persistPurchaseTracking(purchaseTracking);

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

  if (isLandingLoading) {
    return (
      <section className="product-image-landing product-image-landing--empty" dir="rtl">
        <div className="pil-empty-panel">
          <p>جاري تجهيز صفحة الهبوط...</p>
        </div>
      </section>
    );
  }

  if (!activeProduct || (!heroImage && campaignSlices.length === 0) || landingError) {
    return (
      <section className="product-image-landing product-image-landing--empty" dir="rtl">
        <div className="pil-empty-panel">
          <p>{landingError || "فشل تحميل المنتج"}</p>
          <Link to={buildStorefrontPath(location.pathname, `/product/${id || ""}`, location.search)}>
            العودة لصفحة المنتج
          </Link>
        </div>
      </section>
    );
  }

  const renderDynamicSection = (section: any, idx: number) => {
    if (!section || section.enabled === false) return null;
    const type = section.type;
    const content = section.content || {};

    if (type === "BANNERS") {
      const bannerText = content.bannerText || content.text || bannerSection?.content?.bannerText || bannerSection?.content?.text;
      if (!bannerText) return null;

      return (
        <div
          key={section.id || idx}
          className="pil-announcement-banner"
          style={{
            backgroundColor:
              content.bannerBg ||
              content.backgroundColor ||
              bannerSection?.content?.bannerBg ||
              "#0284c7",
            color: content.textColor || bannerSection?.content?.textColor || "#ffffff",
            padding: "10px 16px",
            textAlign: "center",
            fontWeight: 600,
            fontSize: "0.9rem",
            position: "sticky",
            top: 0,
            zIndex: 40,
          }}
        >
          {bannerText}
        </div>
      );
    }

    if (type === "MEDIA") {
      return (
        <React.Fragment key={section.id || idx}>
          <section className="pil-hero" aria-labelledby="pil-hero-title">
            <div className="pil-hero-media" aria-hidden="true">
              {heroImage ? (
                <img src={heroImage} alt="" loading="eager" />
              ) : null}
            </div>
            <div className="pil-hero-shade" />
            <div className="pil-hero-content">
              <span className="pil-hero-kicker">
                {landingData?.company?.name || "المتجر"} · طلب سريع
              </span>
              <h1 id="pil-hero-title">{activeProduct.name}</h1>
              <p>
                {productDescription ||
                  activeConfig.orderCopy ||
                  "اختار المقاس واللون وسيتم التواصل معك لتأكيد الطلب."}
              </p>
              <div className="pil-hero-actions">
                <a className="pil-hero-cta" href="#order">
                  اطلب الآن
                </a>
                <div className="pil-hero-price" aria-label="السعر الحالي">
                  <strong>{formatPrice(activePrice, currency)}</strong>
                  {hasComparePrice ? (
                    <span>{formatPrice(comparePrice, currency)}</span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="pil-hero-bottom" aria-label="مميزات الطلب">
              <span>دفع عند الاستلام</span>
              <span>تأكيد هاتفي</span>
              <span>اختيار المقاس واللون</span>
            </div>
          </section>

          {visibleCampaignSlices.length > 0 ? (
            <section className="pil-campaign" aria-label="صور الحملة">
              <div className="pil-section-heading">
                <span>تصميم صفحة المنتج</span>
                <h2>لقطات تساعدك تتخيل المنتج</h2>
              </div>
              <div className="pil-campaign-grid">
                {visibleCampaignSlices.slice(0, 3).map((slice, index) => (
                  <figure className="pil-campaign-shot" key={`${slice.src}-${index}`}>
                    <img
                      src={slice.src}
                      width={slice.width || 1024}
                      height={slice.height || 1024}
                      alt={slice.alt}
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                  </figure>
                ))}
              </div>
            </section>
          ) : null}
        </React.Fragment>
      );
    }

    if (type === "TEXT") {
      const heading = content.heading || activeLanding?.title || activeProduct.name;
      const subheading = content.subheading;
      const bodyText = content.bodyText;

      if (!heading && !bodyText) return null;

      return (
        <section key={section.id || idx} className="pil-text-story" aria-label="تفاصيل المنتج">
          <div className="pil-section-heading">
            <span>مواصفات وتفاصيل</span>
            <h2>{heading}</h2>
          </div>
          {subheading ? <p className="pil-text-subheading">{subheading}</p> : null}
          {bodyText ? (
            <div className="pil-text-body">
              {bodyText.split("\n").map((paragraph: string, pIdx: number) =>
                paragraph.trim() ? <p key={pIdx}>{paragraph}</p> : null,
              )}
            </div>
          ) : null}
        </section>
      );
    }

    if (type === "BREAKDOWN") {
      const items = content.breakdownItems || [
        {
          title: "نعل طبي ماص للصدمات",
          desc: "مرونة كاملة لراحة الكعب والركبة طوال اليوم",
          icon: "👟",
          tag: "طبي 100%",
        },
        {
          title: "فرش هوائي مانع للتعرق",
          desc: "مسامات تهوية نشطة لمنع الروائح والحفاظ على انتعاش القدمين",
          icon: "💨",
          tag: "انتعاش",
        },
        {
          title: "خياطة يدوية مدعمة",
          desc: "غرز متينة ومقاومة للتمزق والفك للمشاوير الشاقة",
          icon: "🧵",
          tag: "متانة",
        },
        {
          title: "خفة وزن استثنائية",
          desc: "وزن فائق الخفة يمنحك سرعة وراحة في الحركة",
          icon: "🪶",
          tag: "خفيف جداً",
        },
      ];
      const title =
        content.breakdownTitle || `تشريح ومواصفات تصنيع ${activeProduct.name}`;
      const isChecklist = section.variant === "CHECKLIST";

      return (
        <section
          key={section.id || idx}
          className={`pil-breakdown-section ${isChecklist ? "is-checklist-mode" : ""}`}
          aria-label="مواصفات التصنيع"
        >
          <div className="pil-section-heading">
            <span>{isChecklist ? "معايير الجودة والمطابقة" : "الهندسة وجودة التصنيع"}</span>
            <h2>{title}</h2>
          </div>
          {isChecklist ? (
            <div className="pil-checklist-container">
              {items.map((item: any, bIdx: number) => (
                <div key={bIdx} className="pil-checklist-item">
                  <div className="pil-checklist-check">✓</div>
                  <div className="pil-checklist-content">
                    <div className="pil-checklist-top">
                      <strong>{item.title}</strong>
                      {item.tag && <span className="pil-checklist-tag">{item.tag}</span>}
                    </div>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="pil-breakdown-grid">
              {items.map((item: any, bIdx: number) => (
                <div key={bIdx} className="pil-breakdown-card">
                  <div className="pil-breakdown-top">
                    <span className="pil-breakdown-icon">
                      {item.icon || "✨"}
                    </span>
                    {item.tag && (
                      <span className="pil-breakdown-tag">{item.tag}</span>
                    )}
                  </div>
                  <h3 className="pil-breakdown-card-title">{item.title}</h3>
                  <p className="pil-breakdown-card-desc">{item.desc}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (type === "COMPARISON") {
      const title =
        content.comparisonTitle ||
        `لماذا تختار ${activeProduct.name} الأصلي بدلاً من البدائل؟`;
      const usLabel =
        content.comparisonUsLabel || `${activeProduct.name} الأصلي`;
      const themLabel =
        content.comparisonThemLabel || "المنتجات المقلدة في السوق";
      const items = content.comparisonItems || [
        {
          feature: "جودة الخامات",
          us: "خامات نخب أول مقاومة للاهتراء والتقشير",
          them: "خامات بلاستيكية تتشقق سريعاً",
        },
        {
          feature: "راحة المشي والاستخدام",
          us: "نعل طبي يوزع ثقل الجسم بدون إجهاد",
          them: "نعل ناشف يسبب آلام القدم والظهر",
        },
        {
          feature: "حق الفحص والمعاينة",
          us: "افتح الشحنة وقيس المنتج قبل دفع قرش",
          them: "ممنوع فتح الشحنة إلا بعد الدفع",
        },
        {
          feature: "الضمان والاسترجاع",
          us: "ضمان 14 يوم استبدال واسترجاع سهل",
          them: "لا يوجد أي ضمان أو استرجاع بعد البيع",
        },
      ];
      const isDualCards = section.variant === "DUAL_CARDS";

      return (
        <section
          key={section.id || idx}
          className={`pil-comparison-section ${isDualCards ? "is-dual-cards-mode" : ""}`}
          aria-label="مقارنة التميز"
        >
          <div className="pil-section-heading">
            <span>{isDualCards ? "المقارنة الثنائية المباشرة" : "مقارنة التميز"}</span>
            <h2>{title}</h2>
          </div>

          {isDualCards ? (
            <div className="pil-dual-cards-grid">
              <div className="pil-dual-card pil-dual-us">
                <div className="pil-dual-badge">منتجنا الأصلي ✓</div>
                <h3>{usLabel}</h3>
                <ul className="pil-dual-list">
                  {items.map((row: any, rIdx: number) => (
                    <li key={rIdx}>
                      <span className="pil-dual-icon pil-icon-check">✓</span>
                      <div>
                        <strong>{row.feature}:</strong>
                        <span>{row.us}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pil-dual-card pil-dual-them">
                <div className="pil-dual-badge pil-dual-warning">احذر من التقليد ✕</div>
                <h3>{themLabel}</h3>
                <ul className="pil-dual-list">
                  {items.map((row: any, rIdx: number) => (
                    <li key={rIdx}>
                      <span className="pil-dual-icon pil-icon-cross">✕</span>
                      <div>
                        <strong>{row.feature}:</strong>
                        <span>{row.them}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="pil-comparison-card">
              <div className="pil-comparison-header">
                <div className="pil-comp-col pil-comp-feat">وجه المقارنة</div>
                <div className="pil-comp-col pil-comp-us">
                  <span className="pil-comp-badge">الأصلي</span>
                  <strong>{usLabel}</strong>
                </div>
                <div className="pil-comp-col pil-comp-them">
                  <strong>{themLabel}</strong>
                </div>
              </div>
              <div className="pil-comparison-body">
                {items.map((row: any, rIdx: number) => (
                  <div key={rIdx} className="pil-comparison-row">
                    <div className="pil-comp-col pil-comp-feat">
                      <strong>{row.feature}</strong>
                    </div>
                    <div className="pil-comp-col pil-comp-us">
                      <span className="pil-comp-check">✓</span>
                      <span>{row.us}</span>
                    </div>
                    <div className="pil-comp-col pil-comp-them">
                      <span className="pil-comp-cross">✕</span>
                      <span>{row.them}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      );
    }

    if (type === "GALLERY") {
      const title = content.galleryTitle || "لقطات حية للمنتج على الطبيعة";
      const images =
        content.galleryImages && content.galleryImages.length > 0
          ? content.galleryImages
          : activeProduct.images &&
              Array.isArray(activeProduct.images) &&
              activeProduct.images.length > 0
            ? activeProduct.images.map((src: string) => ({
                url: src,
                caption: activeProduct.name,
              }))
            : [];

      if (!images.length) return null;

      return (
        <section
          key={section.id || idx}
          className="pil-gallery-section"
          aria-label="معرض الصور الحية"
        >
          <div className="pil-section-heading">
            <span>على الطبيعة</span>
            <h2>{title}</h2>
          </div>
          <div className="pil-gallery-grid">
            {images.map((img: any, gIdx: number) => (
              <div key={gIdx} className="pil-gallery-card">
                <img
                  src={img.url}
                  alt={img.caption || activeProduct.name}
                  loading="lazy"
                />
                {img.caption && (
                  <span className="pil-gallery-caption">{img.caption}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (type === "LIVE_PROOF") {
      const satisfaction =
        content.satisfactionRate || "4.9 / 5 (أكثر من 1,420 تقييم)";
      const recent = content.recentOrders || [
        {
          buyer: "أميرة م.",
          city: "مدينة نصر، القاهرة",
          timeAgo: "منذ 4 دقائق",
          item: activeProduct.name,
        },
        {
          buyer: "محمود ع.",
          city: "سموحة، الإسكندرية",
          timeAgo: "منذ 11 دقيقة",
          item: `${activeProduct.name} (باقة قطعتين)`,
        },
        {
          buyer: "نورهان س.",
          city: "المنصورة، الدقهلية",
          timeAgo: "منذ 19 دقيقة",
          item: activeProduct.name,
        },
      ];

      return (
        <div
          key={section.id || idx}
          className="pil-liveproof-strip"
          aria-label="الإثبات الاجتماعي"
        >
          <div className="pil-liveproof-inner">
            <div className="pil-liveproof-badge">
              <span className="pil-live-dot" />
              <strong>طلب مباشر نشط الآن</strong>
            </div>
            <div className="pil-liveproof-ticker">
              <span>
                {recent[0]?.buyer} من {recent[0]?.city} طلب {recent[0]?.item} (
                {recent[0]?.timeAgo})
              </span>
            </div>
            <div className="pil-liveproof-rating">
              <span className="pil-stars">★★★★★</span>
              <small>{satisfaction}</small>
            </div>
          </div>
        </div>
      );
    }

    if (type === "FEATURES") {
      const isOfficialSeal = section.variant === "OFFICIAL_SEAL";

      if (isOfficialSeal) {
        return (
          <section
            key={section.id || idx}
            className="pil-official-seal-section"
            aria-label="وثيقة الضمان والمعاينة"
          >
            <div className="pil-seal-card">
              <div className="pil-seal-stamp">
                <div className="pil-seal-stamp-inner">
                  <span>ضمان</span>
                  <strong>100%</strong>
                  <span>معتمد</span>
                </div>
              </div>
              <div className="pil-seal-details">
                <span className="pil-seal-kicker">وثيقة الضمان الذهبية المعتمدة</span>
                <h3>حق الفحص الكامل واسترجاع الأموال</h3>
                <p>
                  نلتزم بمنحك حق فتح الشحنة ومعاينة المنتج وتجربته قبل سداد أي مبلغ للمندوب، مع ضمان استبدال فوري أو استرجاع كامل خلال 14 يوماً من الاستلام.
                </p>
                <div className="pil-seal-pills">
                  <span>✓ شحن مؤمّن وسريع</span>
                  <span>✓ فحص ومعاينة قبل الدفع</span>
                  <span>✓ استبدال فوري بدون مصاريف</span>
                </div>
              </div>
            </div>
          </section>
        );
      }

      return (
        <section
          key={section.id || idx}
          className="pil-trust-grid"
          aria-label="أسباب الشراء والضمانات"
        >
          {landingBenefitCards.map((card, cIdx) => {
            const icons = ["🚚", "🔍", "💵", "🛡️"];
            return (
              <div className="pil-trust-card" key={card.title}>
                <span className="pil-trust-card-icon">
                  {icons[cIdx % icons.length]}
                </span>
                <div className="pil-trust-card-content">
                  <strong>{card.title}</strong>
                  <span>{card.text}</span>
                </div>
              </div>
            );
          })}
        </section>
      );
    }

    if (type === "COUNTDOWN") {
      const text =
        content.text ||
        content.bannerText ||
        countdownSection?.content?.text ||
        "عرض لفترة محدودة — اطلب الآن قبل انتهاء الكمية!";
      const lowStock =
        content.lowStockCount || countdownSection?.content?.lowStockCount;

      return (
        <div
          key={section.id || idx}
          className="pil-countdown-banner"
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: "12px 16px",
            margin: "20px auto",
            maxWidth: 760,
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 8,
            color: "#dc2626",
            fontWeight: 700,
            fontSize: "0.95rem",
          }}
        >
          <span>⏳</span>
          <span>{text}</span>
          {lowStock ? (
            <span
              style={{
                background: "#dc2626",
                color: "#ffffff",
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: "0.8rem",
              }}
            >
              متبقي {lowStock} قطع فقط!
            </span>
          ) : null}
        </div>
      );
    }

    if (type === "FORM") {
      return (
        <React.Fragment key={section.id || idx}>
          <section
            id="order"
            className="pil-order"
            aria-labelledby="pil-order-title"
          >
            <div className="pil-section-heading">
              <span className="pil-order-kicker">
                {activeConfig.orderKicker}
              </span>
              <h2 id="pil-order-title">{activeConfig.orderTitle}</h2>
              <p className="pil-order-copy">{activeConfig.orderCopy}</p>
            </div>

            <div className="pil-summary" aria-label="ملخص المنتج">
              <div className="pil-summary-cell">
                <b>{formatPrice(orderFinalTotal, currency)}</b>
                <span>
                  السعر ({activeBundle.qty} {activeBundle.qty > 1 ? "قطع" : "قطعة"})
                </span>
              </div>
              <div className="pil-summary-cell">
                <b>
                  {sizeOptions.length
                    ? `${sizeOptions[0]}-${sizeOptions[sizeOptions.length - 1]}`
                    : "متاح"}
                </b>
                <span>{sizeOptions.length ? "المقاسات" : "التوفر"}</span>
              </div>
            </div>

            <p className="pil-sr-copy">
              {cleanProductDescription(activeProduct.description, 600) || activeProduct.name}
            </p>

            {/* Quantity Bundles Selector */}
            <div className="pil-bundles-wrapper">
              <label className="pil-bundles-label">اختر الكمية والعرض التوفيري:</label>
              <div className="pil-bundles-grid">
                {bundleTiers.map((tier) => {
                  const tierUnitPrice =
                    tier.discountPercent > 0
                      ? Math.round(activePrice * (1 - tier.discountPercent / 100))
                      : activePrice;
                  const tierTotal = tierUnitPrice * tier.qty;
                  const isSelected = selectedBundleQty === tier.qty;

                  return (
                    <button
                      key={tier.qty}
                      type="button"
                      className={`pil-bundle-card ${isSelected ? "is-selected" : ""}`}
                      onClick={() => setSelectedBundleQty(tier.qty)}
                    >
                      {tier.badge ? (
                        <span className="pil-bundle-badge">{tier.badge}</span>
                      ) : null}
                      <div className="pil-bundle-qty-label">{tier.label}</div>
                      <div className="pil-bundle-pricing">
                        <strong className="pil-bundle-total">
                          {formatPrice(tierTotal, currency)}
                        </strong>
                        {tier.qty > 1 && (
                          <small className="pil-bundle-unit">
                            ({formatPrice(tierUnitPrice, currency)} للقطعة)
                          </small>
                        )}
                      </div>
                      <div
                        className={`pil-bundle-radio ${isSelected ? "is-checked" : ""}`}
                      >
                        {isSelected ? "✓" : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <form className="pil-form" onSubmit={handleSubmit}>
              <div className="pil-field">
                <label htmlFor="pil-customer-name">الاسم</label>
                <input
                  id="pil-customer-name"
                  name="customerName"
                  value={formState.customerName}
                  onChange={updateFormField("customerName")}
                  autoComplete="name"
                  placeholder="اكتب اسمك بالكامل"
                  required
                />
              </div>

              <div className="pil-field">
                <label htmlFor="pil-phone">رقم الموبايل</label>
                <input
                  id="pil-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  value={formState.phone}
                  onChange={updateFormField("phone")}
                  autoComplete="tel"
                  placeholder="01xxxxxxxxx"
                  required
                />
              </div>

              {sizeOptions.length > 0 || colorOptions.length > 0 ? (
                <div className="pil-variants-block">
                  {colorOptions.length > 0 ? (
                    <div className="pil-field">
                      <label htmlFor="pil-color">اللون</label>
                      <div
                        className="pil-chips-group"
                        role="radiogroup"
                        aria-label="اختيار اللون"
                      >
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`pil-chip ${selectedColor === color ? "is-selected" : ""}`}
                            onClick={() => setSelectedColor(color)}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                      <select
                        id="pil-color"
                        name="color"
                        value={selectedColor}
                        onChange={(event) => setSelectedColor(event.target.value)}
                        required
                        className="pil-native-select"
                      >
                        <option value="">اختار</option>
                        {colorOptions.map((color) => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {sizeOptions.length > 0 ? (
                    <div className="pil-field">
                      <label htmlFor="pil-size">المقاس</label>
                      <div
                        className="pil-chips-group"
                        role="radiogroup"
                        aria-label="اختيار المقاس"
                      >
                        {sizeOptions.map((size) => (
                          <button
                            key={size}
                            type="button"
                            className={`pil-chip ${selectedSize === size ? "is-selected" : ""}`}
                            onClick={() => setSelectedSize(size)}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                      <select
                        id="pil-size"
                        name="size"
                        value={selectedSize}
                        onChange={(event) => setSelectedSize(event.target.value)}
                        required
                        className="pil-native-select"
                      >
                        <option value="">اختار</option>
                        {sizeOptions.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="pil-two-cols">
                <div className="pil-field">
                  <label htmlFor="pil-governorate">المحافظة</label>
                  <select
                    id="pil-governorate"
                    name="governorate"
                    value={formState.governorate}
                    onChange={updateFormField("governorate")}
                    required
                  >
                    <option value="">اختار</option>
                    {EGYPT_GOVERNORATES.map((governorate) => (
                      <option key={governorate.id} value={governorate.nameAr}>
                        {governorate.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pil-field">
                  <label htmlFor="pil-area">المنطقة</label>
                  <input
                    id="pil-area"
                    name="area"
                    value={formState.area}
                    onChange={updateFormField("area")}
                    autoComplete="address-level2"
                    placeholder="مثال: مدينة نصر"
                    required
                  />
                </div>
              </div>

              <div className="pil-field">
                <label htmlFor="pil-address">العنوان بالتفصيل</label>
                <textarea
                  id="pil-address"
                  name="address"
                  value={formState.address}
                  onChange={updateFormField("address")}
                  autoComplete="street-address"
                  placeholder="الشارع، العمارة، الدور، علامة مميزة"
                  required
                />
              </div>

              {formError ? (
                <div className="pil-error" role="alert">
                  {formError}
                </div>
              ) : null}

              {isLocalLandingTest ? (
                <div className="pil-test-note" role="status">
                  وضع الاختبار المحلي مفعل، لن يتم إنشاء طلب حقيقي.
                </div>
              ) : null}

              <button className="pil-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "جاري إرسال الطلب..."
                  : `${activeConfig.buttonLabel} — ${formatPrice(orderFinalTotal, currency)} 🚚`}
              </button>
            </form>

            {/* Trust Badges Strip */}
            <div className="pil-trust-badges-strip" aria-label="ضمانات الشراء">
              <div className="pil-trust-item">
                <span className="pil-trust-icon">🛡️</span>
                <div>
                  <strong>معاينة قبل الدفع</strong>
                  <small>افتح الشحنة وتأكد منها براحتك</small>
                </div>
              </div>
              <div className="pil-trust-item">
                <span className="pil-trust-icon">🚚</span>
                <div>
                  <strong>الدفع نقدياً عند الاستلام</strong>
                  <small>لا تدفع أي مبلغ إلا بعد فحص شحنتك</small>
                </div>
              </div>
              <div className="pil-trust-item">
                <span className="pil-trust-icon">🔄</span>
                <div>
                  <strong>استبدال واسترجاع سهل</strong>
                  <small>خلال 14 يوم بكل مرونة</small>
                </div>
              </div>
            </div>
          </section>
        </React.Fragment>
      );
    }

    if (type === "REVIEWS") {
      const reviews =
        content.reviews || reviewsSection?.content?.reviews || [];
      if (!reviews.length) return null;

      const isWhatsApp = section.variant === "WHATSAPP";

      if (isWhatsApp) {
        return (
          <section
            key={section.id || idx}
            className="pil-whatsapp-section"
            aria-label="آراء وتجارب العملاء على واتساب"
          >
            <div className="pil-section-heading">
              <span>تجارب حقيقية موثقة</span>
              <h2>محادثات ورسائل العملاء على واتساب</h2>
            </div>
            <div className="pil-wa-container">
              <div className="pil-wa-header">
                <div className="pil-wa-avatar">💬</div>
                <div className="pil-wa-info">
                  <strong>فريق خدمة عملاء المتجر</strong>
                  <span>متصل الآن (محادثات استلام حقيقية)</span>
                </div>
              </div>
              <div className="pil-wa-chat">
                {reviews.map((rev: any, rIdx: number) => (
                  <div key={rIdx} className="pil-wa-bubble">
                    <div className="pil-wa-bubble-head">
                      <strong>{rev.name}</strong>
                      <span className="pil-wa-buyer-tag">مشتري مؤكد ✓</span>
                    </div>
                    <p className="pil-wa-text">{rev.comment || rev.text}</p>
                    <div className="pil-wa-meta">
                      <span className="pil-wa-time">
                        {10 + (rIdx % 12)}:{15 + ((rIdx * 7) % 45)} م
                      </span>
                      <span className="pil-wa-checks">✓✓</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      }

      return (
        <section
          key={section.id || idx}
          className="pil-reviews"
          aria-label="آراء العملاء"
          style={{ padding: "32px 16px", maxWidth: 760, margin: "0 auto" }}
        >
          <div className="pil-section-heading">
            <span>تجارب حقيقية</span>
            <h2>
              {content.title ||
                reviewsSection?.content?.title ||
                "آراء وتقييمات العملاء"}
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
              marginTop: 16,
            }}
          >
            {reviews.map((rev: any, rIdx: number) => (
              <div
                key={rIdx}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <strong style={{ fontSize: "0.95rem", color: "#1e293b" }}>
                    {rev.name}
                  </strong>
                  <span style={{ color: "#f59e0b", fontSize: "1rem" }}>
                    {"★".repeat(Number(rev.rating) || 5)}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.88rem",
                    color: "#475569",
                    lineHeight: 1.5,
                  }}
                >
                  {rev.comment || rev.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (type === "FAQ") {
      const faqs = content.faqs || faqSection?.content?.faqs || [];
      if (!faqs.length) return null;

      return (
        <section
          key={section.id || idx}
          className="pil-faq"
          aria-label="الأسئلة الشائعة"
          style={{ padding: "32px 16px", maxWidth: 760, margin: "0 auto" }}
        >
          <div className="pil-section-heading">
            <span>إجابات واضحة</span>
            <h2>
              {content.title || faqSection?.content?.title || "الأسئلة الشائعة"}
            </h2>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 16,
            }}
          >
            {faqs.map((faq: any, fIdx: number) => (
              <details
                key={fIdx}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "14px 18px",
                  cursor: "pointer",
                }}
              >
                <summary
                  style={{
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    color: "#1e293b",
                  }}
                >
                  {faq.q || faq.question}
                </summary>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: "0.88rem",
                    color: "#64748b",
                    lineHeight: 1.6,
                  }}
                >
                  {faq.a || faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      );
    }

    if (type === "HTML") {
      if (!content.htmlCode) return null;
      return (
        <section
          key={section.id || idx}
          className="pil-html-block"
          style={{ maxWidth: 760, margin: "24px auto", padding: "0 16px" }}
          dangerouslySetInnerHTML={{ __html: content.htmlCode }}
        />
      );
    }

    return null;
  };

  return (
    <article className="product-image-landing" dir="rtl">
      {sectionsToRender.map((section, idx) => renderDynamicSection(section, idx))}

      <a
        className={`pil-sticky-cta ${isStickyReady ? "is-ready" : ""}`}
        href="#order"
        aria-label="اذهب إلى نموذج الطلب"
      >
        <strong>
          {activeProduct.name}
          <span>{formatPrice(orderFinalTotal, currency)}</span>
        </strong>
        <span className="pil-sticky-cta-btn">
          اطلب الآن ({activeBundle.qty} {activeBundle.qty > 1 ? "قطع" : "قطعة"})
        </span>
      </a>
    </article>
  );
};

export default ProductImageLandingPage;
