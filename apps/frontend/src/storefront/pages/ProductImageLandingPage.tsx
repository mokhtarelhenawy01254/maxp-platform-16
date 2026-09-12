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
        const response = isLandingPreview
          ? await storefrontApi.getProductLandingPreview(landingKey)
          : await storefrontApi.getProductLanding(landingKey);

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
        price: activePrice,
        basePrice: Number(activeProduct.price || activePrice),
        quantity: 1,
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
            activeLanding?.id ? `Landing Page ID: ${activeLanding.id}` : "",
            activeLanding?.slug ? `Landing Slug: ${activeLanding.slug}` : "",
            selectedColor ? `اللون: ${selectedColor}` : "",
            selectedSize ? `المقاس: ${selectedSize}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          paymentMethod: "cod",
          shippingCost: 0,
          subtotal: activePrice,
          total: activePrice,
        },
        [item],
        activePrice,
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

  return (
    <article className="product-image-landing" dir="rtl">
      {bannerSection?.content?.bannerText || bannerSection?.content?.text ? (
        <div
          className="pil-announcement-banner"
          style={{
            backgroundColor:
              bannerSection.content.bannerBg ||
              bannerSection.content.backgroundColor ||
              "#0284c7",
            color: bannerSection.content.textColor || "#ffffff",
            padding: "10px 16px",
            textAlign: "center",
            fontWeight: 600,
            fontSize: "0.9rem",
            position: "sticky",
            top: 0,
            zIndex: 40,
          }}
        >
          {bannerSection.content.bannerText || bannerSection.content.text}
        </div>
      ) : null}
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

      <section className="pil-benefits" aria-label="أسباب الشراء">
        {landingBenefitCards.map((card) => (
          <div className="pil-benefit" key={card.title}>
            <strong>{card.title}</strong>
            <span>{card.text}</span>
          </div>
        ))}
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

      <section className="pil-order-intro" aria-label="ملخص المنتج">
        <div className="pil-section-heading">
          <span>{activeConfig.orderKicker}</span>
          <h2>{activeConfig.orderTitle}</h2>
        </div>
        <p>{activeConfig.orderCopy}</p>
      </section>

      <section id="order" className="pil-order" aria-labelledby="pil-order-title">
        <span className="pil-order-kicker">بيانات الطلب</span>
        <h1 id="pil-order-title">{activeConfig.orderTitle}</h1>
        <p>{activeConfig.orderCopy}</p>

        <div className="pil-summary" aria-label="ملخص المنتج">
          <div className="pil-summary-cell">
            <b>{formatPrice(activePrice, currency)}</b>
            <span>السعر الحالي</span>
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

        {countdownSection ? (
          <div
            className="pil-countdown-banner"
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: "#dc2626",
              fontWeight: 700,
              fontSize: "0.95rem",
            }}
          >
            <span>⏳</span>
            <span>
              {countdownSection.content?.text ||
                "عرض لفترة محدودة - اطلب الآن قبل انتهاء الكمية!"}
            </span>
          </div>
        ) : null}

        <form className="pil-form" onSubmit={handleSubmit}>
          <div className="pil-field">
            <label htmlFor="pil-customer-name">الاسم</label>
            <input
              id="pil-customer-name"
              name="customerName"
              value={formState.customerName}
              onChange={updateFormField("customerName")}
              autoComplete="name"
              placeholder="اكتب اسمك"
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
            <div className="pil-two-cols">
              {sizeOptions.length > 0 ? (
                <div className="pil-field">
                  <label htmlFor="pil-size">المقاس</label>
                  <select
                    id="pil-size"
                    name="size"
                    value={selectedSize}
                    onChange={(event) => setSelectedSize(event.target.value)}
                    required
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

              {colorOptions.length > 0 ? (
                <div className="pil-field">
                  <label htmlFor="pil-color">اللون</label>
                  <select
                    id="pil-color"
                    name="color"
                    value={selectedColor}
                    onChange={(event) => setSelectedColor(event.target.value)}
                    required
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
            {isSubmitting ? "جاري إرسال الطلب" : activeConfig.buttonLabel}
          </button>
        </form>
      </section>

      {reviewsSection?.content?.reviews?.length ? (
        <section
          className="pil-reviews"
          aria-label="آراء العملاء"
          style={{ padding: "32px 16px", maxWidth: 760, margin: "0 auto" }}
        >
          <div className="pil-section-heading">
            <span>تجارب حقيقية</span>
            <h2>{reviewsSection.content.title || "آراء وتقييمات العملاء"}</h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
              marginTop: 16,
            }}
          >
            {reviewsSection.content.reviews.map((rev: any, idx: number) => (
              <div
                key={idx}
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
      ) : null}

      {faqSection?.content?.faqs?.length ? (
        <section
          className="pil-faq"
          aria-label="الأسئلة الشائعة"
          style={{ padding: "32px 16px", maxWidth: 760, margin: "0 auto" }}
        >
          <div className="pil-section-heading">
            <span>إجابات واضحة</span>
            <h2>{faqSection.content.title || "الأسئلة الشائعة"}</h2>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 16,
            }}
          >
            {faqSection.content.faqs.map((faq: any, idx: number) => (
              <details
                key={idx}
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
      ) : null}

      <a
        className={`pil-sticky-cta ${isStickyReady ? "is-ready" : ""}`}
        href="#order"
        aria-label="اذهب إلى نموذج الطلب"
      >
        <strong>
          {activeProduct.name}
          <span>{formatPrice(activePrice, currency)}</span>
        </strong>
        <em>اطلب</em>
      </a>
    </article>
  );
};

export default ProductImageLandingPage;
