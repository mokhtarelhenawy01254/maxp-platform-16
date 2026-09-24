import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { useStorefrontSettings } from "../hooks/useStorefrontSettings";
import {
  getVariantAttributes,
  canonicalizeAttributeKey,
  getVariantAttributeLabel,
} from "../utils/variants";
import {
  ensureLandingStyleFontLoaded,
  resolveLandingStyle,
} from "../utils/landingStyles";
import { captureStorefrontAttribution } from "../utils/orderAttribution";
import useStorefrontFacebookTracking from "../hooks/useStorefrontFacebookTracking";
import "./ProductImageLandingPage.css";

interface LandingSeoMeta {
  title?: string;
  description?: string;
  ogImage?: string;
}

/** The seo column arrives as a JSON string (or object) — normalize it. */
const parseLandingSeo = (value: unknown): LandingSeoMeta => {
  let parsed: unknown = value;
  if (typeof parsed === "string" && parsed.trim()) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== "object") return {};
  const record = parsed as Record<string, unknown>;
  const str = (key: string) =>
    typeof record[key] === "string" && record[key].trim()
      ? (record[key] as string).trim()
      : undefined;
  return {
    title: str("title"),
    description: str("description"),
    ogImage: str("ogImage"),
  };
};

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
  sections?: any[];
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
  notes?: string;
};

type BundleItemSelection = {
  color: string;
  size: string;
};

type AttributeMap = Record<string, string>;

const getColorSwatch = (name: string): string | null => {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  if (n.includes("أبيض") || n.includes("ابيض") || n === "white") return "#ffffff";
  if (n.includes("أسود") || n.includes("اسود") || n === "black") return "#111827";
  if (n.includes("بيج") || n.includes("كافيه") || n === "beige") return "#d4b996";
  if (n.includes("أحمر") || n.includes("احمر") || n === "red") return "#dc2626";
  if (n.includes("كحلي") || n.includes("أزرق") || n.includes("ازرق") || n === "navy" || n === "blue") return "#1e3a8a";
  if (n.includes("رمادي") || n.includes("رصاصي") || n === "gray") return "#64748b";
  if (n.includes("زيتي") || n.includes("أخضر") || n.includes("اخضر") || n === "green") return "#15803d";
  if (n.includes("هافان") || n.includes("بني") || n === "brown") return "#78350f";
  return null;
};

const LiveCountdownClock: React.FC<{ initialHours?: number }> = ({ initialHours = 4 }) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: initialHours,
    minutes: 42,
    seconds: 18,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 0, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="pil-live-clock" aria-label="الوقت المتبقي لانتهاء العرض">
      <div className="pil-clock-box">
        <span className="pil-clock-num">{pad(timeLeft.hours)}</span>
        <span className="pil-clock-unit">ساعة</span>
      </div>
      <span className="pil-clock-colon">:</span>
      <div className="pil-clock-box">
        <span className="pil-clock-num">{pad(timeLeft.minutes)}</span>
        <span className="pil-clock-unit">دقيقة</span>
      </div>
      <span className="pil-clock-colon">:</span>
      <div className="pil-clock-box">
        <span className="pil-clock-num">{pad(timeLeft.seconds)}</span>
        <span className="pil-clock-unit">ثانية</span>
      </div>
    </div>
  );
};

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

const DEFAULT_FORM_STATE: LandingFormState = {
  customerName: "",
  phone: "",
  governorate: "",
  area: "",
  address: "",
  notes: "",
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

const readVariantAttribute = (
  variant: ProductVariant,
  keys: string[],
): string => {
  const attributes = getVariantAttributes(variant);
  const normalizedKeys = keys.map((key) => canonicalizeAttributeKey(key).toLowerCase());
  const entry = Object.entries(attributes).find(([key]) => {
    const canonicalKey = canonicalizeAttributeKey(key).toLowerCase();
    return (
      normalizedKeys.includes(canonicalKey) ||
      normalizedKeys.includes(key.trim().toLowerCase())
    );
  });

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

const BeforeAfterSlider: React.FC<{
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
}> = ({ beforeImage, afterImage, beforeLabel = "قبل (بدائل السوق)", afterLabel = "بعد (المنتج الأصلي)" }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const stageRef = React.useRef<HTMLDivElement | null>(null);

  const updatePosition = (clientX: number) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const offsetX = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
    setSliderPos(Math.round(pct));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div className="pil-before-after-container">
      <div
        ref={stageRef}
        className="pil-ba-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: "none" }}
      >
        {/* After / Our Product image (Base) */}
        {afterImage && <img src={afterImage} alt={afterLabel} className="pil-ba-img pil-ba-after" draggable={false} />}

        {/* Before / Competitor image (Clipped) */}
        <div
          className="pil-ba-clipped"
          style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
        >
          {beforeImage && <img src={beforeImage} alt={beforeLabel} className="pil-ba-img pil-ba-before" draggable={false} />}
        </div>

        {/* Corner Badges: permanently visible on opposite corners, never clipped */}
        <span className="pil-ba-badge pil-ba-badge-before">{beforeLabel}</span>
        <span className="pil-ba-badge pil-ba-badge-after">{afterLabel}</span>

        {/* Divider Line & Handle */}
        <div className="pil-ba-divider" style={{ left: `${sliderPos}%` }}>
          <div className="pil-ba-handle">
            <span>⇄</span>
          </div>
        </div>

        {/* Accessible range input for keyboard / screen readers */}
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="pil-ba-range"
          aria-label="مقارنة الصورة قبل وبعد"
        />
      </div>
      <p className="pil-ba-hint">مرر السلايدر يميناً ويساراً للمقارنة المباشرة باللمس</p>
    </div>
  );
};

const VideoReelPlayer: React.FC<{
  videoUrl?: string;
  thumbnail?: string;
  caption?: string;
}> = ({ videoUrl, thumbnail, caption }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  if (!videoUrl) {
    return (
      <div className="pil-reel-card pil-reel-placeholder">
        {thumbnail && <img src={thumbnail} alt="" className="pil-reel-thumb" />}
        <div className="pil-reel-overlay">
          <span className="pil-reel-play-icon">▶</span>
          <p>{caption || "فيديو المنتج على الطبيعة"}</p>
        </div>
      </div>
    );
  }

  const isEmbed =
    videoUrl.includes("youtube.com") ||
    videoUrl.includes("youtu.be") ||
    videoUrl.includes("vimeo");

  if (isEmbed) {
    return (
      <div className="pil-reel-card">
        <iframe
          src={videoUrl}
          title="فيديو تجربة المنتج"
          className="pil-reel-iframe"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        {caption && <p className="pil-reel-caption">{caption}</p>}
      </div>
    );
  }

  return (
    <div className="pil-reel-card">
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnail}
        playsInline
        muted={isMuted}
        autoPlay
        loop
        className="pil-reel-video"
        onClick={togglePlay}
      />
      <div className="pil-reel-controls">
        <button
          type="button"
          onClick={togglePlay}
          className="pil-reel-btn"
          aria-label={isPlaying ? "إيقاف" : "تشغيل"}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
        <button
          type="button"
          onClick={toggleMute}
          className="pil-reel-btn"
          aria-label={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
      </div>
      {caption && <p className="pil-reel-caption">{caption}</p>}
    </div>
  );
};

const LandingCarousel: React.FC<{
  images: Array<{ url: string; caption?: string; linkUrl?: string }>;
  autoplay?: boolean;
  interval?: number;
}> = ({ images, autoplay = true, interval = 3 }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!autoplay || images.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, Math.max(1500, interval * 1000));
    return () => clearInterval(timer);
  }, [autoplay, interval, images.length]);

  const current = images[activeIndex] || images[0];

  const slideImg = (
    <picture>
      {current.mobileUrl && (
        <source media="(max-width: 640px)" srcSet={current.mobileUrl} />
      )}
      <img
        src={current.url}
        alt={current.caption || `شريحة ${activeIndex + 1}`}
        className="pil-carousel-img"
      />
    </picture>
  );

  return (
    <div className="pil-carousel-container" dir="rtl">
      <div className="pil-carousel-stage">
        {current.linkUrl ? (
          <a href={current.linkUrl} style={{ display: "block" }}>
            {slideImg}
          </a>
        ) : (
          slideImg
        )}
        {current.caption && (
          <div className="pil-carousel-caption">
            <span>{current.caption}</span>
          </div>
        )}
        {images.length > 1 && (
          <>
            <button
              type="button"
              className="pil-carousel-arrow pil-carousel-prev"
              onClick={() => setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
              aria-label="السابق"
            >
              ›
            </button>
            <button
              type="button"
              className="pil-carousel-arrow pil-carousel-next"
              onClick={() => setActiveIndex((prev) => (prev + 1) % images.length)}
              aria-label="التالي"
            >
              ‹
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="pil-carousel-dots">
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`pil-carousel-dot ${idx === activeIndex ? "is-active" : ""}`}
              onClick={() => setActiveIndex(idx)}
              aria-label={`انتقال للشريحة ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
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

interface PureMediaStageProps {
  images: string[];
  activeIndex: number;
  onIndexChange: (idx: number) => void;
  productName: string;
}

const PureMediaStage: React.FC<PureMediaStageProps> = ({
  images,
  activeIndex,
  onIndexChange,
  productName,
}) => {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const mouseStartX = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);

  const total = images.length;
  const currentImg = images[activeIndex] || images[0];

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (total <= 1) return;
    onIndexChange((activeIndex - 1 + total) % total);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (total <= 1) return;
    onIndexChange((activeIndex + 1) % total);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? null;
    const endY = e.changedTouches[0]?.clientY ?? null;
    if (endX === null) return;

    const diffX = touchStartX.current - endX;
    const diffY =
      touchStartY.current !== null && endY !== null
        ? Math.abs(touchStartY.current - endY)
        : 0;

    // Dominant horizontal swipe (> 35px and more horizontal than vertical)
    if (Math.abs(diffX) > 35 && Math.abs(diffX) > diffY) {
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const onMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    isDragging.current = true;
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current || mouseStartX.current === null) return;
    const diffX = mouseStartX.current - e.clientX;
    if (Math.abs(diffX) > 40) {
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    mouseStartX.current = null;
    isDragging.current = false;
  };

  return (
    <div
      className="pil-pure-media-stage"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      role="region"
      aria-label="معرض صور المنتج القابل للتمرير"
    >
      {currentImg ? (
        <img
          src={currentImg}
          alt={productName}
          loading="eager"
          className="pil-pure-media-img"
          draggable={false}
        />
      ) : null}

      {total > 1 && (
        <>
          <div className="pil-pure-media-counter" aria-hidden="true">
            {activeIndex + 1} / {total}
          </div>

          <button
            type="button"
            className="pil-pure-media-nav-btn pil-pure-media-nav-prev"
            onClick={handlePrev}
            aria-label="الصورة السابقة"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            type="button"
            className="pil-pure-media-nav-btn pil-pure-media-nav-next"
            onClick={handleNext}
            aria-label="الصورة التالية"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
};

const ProductImageLandingPage: React.FC = () => {
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

  const activeLanding = landingData?.landing || null;
  const activeProduct =
    landingData?.product || fallbackConfig?.fallbackProduct || null;

  // Style preset + merchant overrides (--pil-* variables on the page root).
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

  // Client-side SEO fallback (the backend shell injects the canonical tags;
  // this keeps the title/OG correct for SPA navigation and preview modes).
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeLanding?.id,
    activeLanding?.title,
    activeProduct?.id,
    activeProduct?.name,
    activeProduct?.price,
    activeProduct?.mainImage,
  ]);

  // Ad-campaign measurement: capture UTMs/click-ids at landing entry so the
  // order attribution snapshot survives navigation before checkout.
  useEffect(() => {
    captureStorefrontAttribution(storefrontSettings?.companyId);
  }, [storefrontSettings?.companyId]);

  // Meta pixel funnel events (ViewContent on load, InitiateCheckout on the
  // first form interaction). Purchase fires via the thank-you page using the
  // persisted pixelEventId for CAPI dedup.
  const {
    trackViewContentEvent,
    trackInitiateCheckoutEvent,
  } = useStorefrontFacebookTracking();
  const hasTrackedViewContentRef = React.useRef<string | null>(null);
  const hasTrackedInitiateCheckoutRef = React.useRef(false);

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
  const currency = landingData?.company?.currency || "EGP";
  const activePrice = Number(selectedVariant?.price ?? activeProduct?.price ?? 0);

  const bundleTiers = useMemo(
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
  }, [visibleCampaignSliceKey]);

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
      // Ready from first paint so the price + CTA bar covers the mobile
      // above-the-fold gap (MOB-052); it hides once the form is in view.
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

      const postPurchaseOffer = (storefrontSettings as any)?.designTokens?.postPurchaseOffer;
      const isOfferActive = Boolean(
        postPurchaseOffer?.enabled &&
        postPurchaseOffer?.productId
      );
      const targetRoute = isOfferActive ? "/order-offer" : "/thank-you";
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
      const sectionImages =
        Array.isArray(content.images) && content.images.length > 0
          ? content.images
          : allProductImages;

      return (
        <React.Fragment key={section.id || idx}>
          <section
            className="pil-pure-media-section"
            aria-label="معرض صور المنتج"
            style={{
              backgroundColor: content.bgColor || "transparent",
              backgroundImage: content.bgImage ? `url(${content.bgImage})` : undefined,
            }}
          >
            {/* Pure Clean Image Stage with Touch Swipe Gestures & Arrows */}
            <PureMediaStage
              images={sectionImages}
              activeIndex={activeHeroImageIndex}
              onIndexChange={setActiveHeroImageIndex}
              productName={activeProduct.name}
            />

            {/* Thumbnail Navigation Strip */}
            {sectionImages.length > 1 && (
              <div
                className="pil-hero-gallery-bar"
                role="region"
                aria-label="معرض زوايا وصور المنتج"
                style={{ marginTop: 12 }}
              >
                <div className="pil-hero-thumbs-strip" role="tablist">
                  {sectionImages.map((img: string, tIdx: number) => (
                    <button
                      key={tIdx}
                      type="button"
                      className={`pil-hero-thumb ${activeHeroImageIndex === tIdx ? "is-active" : ""}`}
                      onClick={() => setActiveHeroImageIndex(tIdx)}
                      aria-label={`عرض الصورة ${tIdx + 1}`}
                    >
                      <img src={img} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
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
            <div className="pil-liveproof-header-row">
              <div className="pil-liveproof-badge">
                <span className="pil-live-dot" />
                <strong>طلب مباشر نشط الآن</strong>
              </div>
              <div className="pil-liveproof-rating">
                <svg
                  className="pil-star-svg"
                  viewBox="0 0 20 20"
                  width="13"
                  height="13"
                  fill="#f59e0b"
                  aria-hidden="true"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="pil-liveproof-rating-val">{satisfaction}</span>
              </div>
            </div>
            <div className="pil-liveproof-ticker">
              <span>
                طلب مؤكد: {recent[0]?.buyer ? `${recent[0].buyer} · ` : ""}{recent[0]?.city} — {recent[0]?.item} (
                {recent[0]?.timeAgo})
              </span>
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

      const customFeatures = Array.isArray(content.features) && content.features.length > 0
        ? content.features
        : null;

      if (customFeatures) {
        return (
          <section
            key={section.id || idx}
            className="pil-features-bento-section"
            aria-label={section.title || "مميزات المنتج"}
          >
            {section.title || content.kicker ? (
              <div className="pil-section-heading">
                {content.kicker ? <span>{content.kicker}</span> : null}
                <h2>{section.title || "مميزات هندسية صُنعت لتدوم"}</h2>
              </div>
            ) : null}
            <div className="pil-features-bento-grid">
              {customFeatures.map((feat: any, fIdx: number) => (
                <div className="pil-bento-feature-card" key={fIdx}>
                  <div className="pil-bento-card-num">
                    0{fIdx + 1}
                  </div>
                  <div className="pil-bento-card-text">
                    <strong>{feat.title}</strong>
                    <p>{feat.desc || feat.text}</p>
                  </div>
                </div>
              ))}
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
        "عرض خاص لفترة محدودة — اطلب الآن قبل انتهاء الكمية المخصصة لهذا العرض";
      const lowStock =
        content.lowStockCount || countdownSection?.content?.lowStockCount || 7;

      return (
        <section
          key={section.id || idx}
          className="pil-countdown-card"
          aria-label="العد التنازلي للعرض المتبقي"
        >
          <div className="pil-countdown-inner">
            <div className="pil-countdown-header">
              <span className="pil-countdown-badge">
                <span className="pil-live-dot" />
                متبقي {lowStock} قطع فقط بهذا السعر
              </span>
              <p className="pil-countdown-title">{text}</p>
            </div>
            <LiveCountdownClock />
          </div>
        </section>
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
                    : "معاينة قبل الدفع"}
                </b>
                <span>{sizeOptions.length ? "المقاسات المتاحة" : "شحن مجاني اليوم"}</span>
              </div>
            </div>

            {/* Auto Urgency Countdown Card if no standalone COUNTDOWN section */}
            {!activeSections.some((s) => s?.type === "COUNTDOWN") && (
              <div className="pil-countdown-card" aria-label="العد التنازلي للعرض">
                <div className="pil-countdown-inner">
                  <div className="pil-countdown-header">
                    <span className="pil-countdown-badge">
                      <span className="pil-live-dot" />
                      متبقي 7 قطع فقط بهذا السعر
                    </span>
                    <p className="pil-countdown-title">
                      عرض خاص لفترة محدودة — اطلب الآن واستفد من الشحن المجاني والمعاينة قبل الدفع
                    </p>
                  </div>
                  <LiveCountdownClock />
                </div>
              </div>
            )}

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
                      <div className="pil-bundle-main-info">
                        <div
                          className={`pil-bundle-radio ${isSelected ? "is-checked" : ""}`}
                          aria-hidden="true"
                        >
                          {isSelected ? "✓" : ""}
                        </div>
                        <div className="pil-bundle-qty-label">{tier.label}</div>
                      </div>
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
                    </button>
                  );
                })}
              </div>
            </div>

            <form
              className="pil-form"
              onSubmit={handleSubmit}
              onInputCapture={handleFormFirstInteraction}
            >
              {activeBundle.qty > 1 && (sizeOptions.length > 0 || colorOptions.length > 0) ? (
                <div className="pil-bundle-items-customizer" aria-label="تحديد تفاصيل كل قطعة في الباقة">
                  <div className="pil-bundle-customizer-header">
                    <span className="pil-bundle-customizer-title">
                      تحديد المقاس واللون لكل قطعة في الباقة ({activeBundle.qty} قطع):
                    </span>
                    <span className="pil-bundle-customizer-hint">اختر المواصفات لكل قطعة على حدة</span>
                  </div>
                  <div className="pil-bundle-items-list">
                    {bundleItems.slice(0, activeBundle.qty).map((item, bIdx) => {
                      const curColor = item.color || (bIdx === 0 ? selectedColor : colorOptions[bIdx % colorOptions.length] || colorOptions[0] || "");
                      const curSize = item.size || (bIdx === 0 ? selectedSize : sizeOptions[0] || "");

                      return (
                        <div key={bIdx} className="pil-bundle-item-card">
                          <div className="pil-bundle-item-header">
                            <span className="pil-bundle-item-tag">القطعة {bIdx + 1}</span>
                            <span className="pil-bundle-item-summary">
                              {curColor ? `اللون: ${curColor}` : ""}
                              {curColor && curSize ? " | " : ""}
                              {curSize ? `المقاس: ${curSize}` : ""}
                            </span>
                          </div>

                          {colorOptions.length > 0 ? (
                            <div className="pil-bundle-item-field">
                              <label className="pil-bundle-item-field-label">اللون:</label>
                              <div className="pil-chips-group pil-chips-group-compact" role="radiogroup" aria-label={`لون القطعة ${bIdx + 1}`}>
                                {colorOptions.map((color) => {
                                  const isSelected = curColor === color;
                                  return (
                                    <button
                                      key={color}
                                      type="button"
                                      className={`pil-chip pil-chip-radio pil-chip-compact ${isSelected ? "is-selected" : ""}`}
                                      onClick={() => {
                                        updateBundleItem(bIdx, "color", color);
                                        if (bIdx === 0) setSelectedColor(color);
                                      }}
                                    >
                                      <span className="pil-radio-dot" aria-hidden="true">
                                        {isSelected ? "●" : "○"}
                                      </span>
                                      {color}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}

                          {sizeOptions.length > 0 ? (
                            <div className="pil-bundle-item-field">
                              <label className="pil-bundle-item-field-label">المقاس:</label>
                              <div className="pil-chips-group pil-chips-group--sizes pil-chips-group-compact" role="radiogroup" aria-label={`مقاس القطعة ${bIdx + 1}`}>
                                {sizeOptions.map((size) => {
                                  const isSelected = curSize === size;
                                  return (
                                    <button
                                      key={size}
                                      type="button"
                                      className={`pil-chip pil-chip-size pil-chip-compact ${isSelected ? "is-selected" : ""}`}
                                      onClick={() => {
                                        updateBundleItem(bIdx, "size", size);
                                        if (bIdx === 0) setSelectedSize(size);
                                      }}
                                    >
                                      {size}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : sizeOptions.length > 0 || colorOptions.length > 0 || customAttributeGroups.length > 0 ? (
                <div className="pil-variants-block">
                  {colorOptions.length > 0 ? (
                    <div className="pil-field">
                      <label htmlFor="pil-color">اللون</label>
                      <div
                        className="pil-chips-group"
                        role="radiogroup"
                        aria-label="اختيار اللون"
                      >
                        {colorOptions.map((color) => {
                          const isSelected = selectedColor === color;
                          return (
                            <button
                              key={color}
                              type="button"
                              className={`pil-chip pil-chip-radio ${isSelected ? "is-selected" : ""}`}
                              onClick={() => {
                                setSelectedColor(color);
                                updateBundleItem(0, "color", color);
                              }}
                            >
                              <span className="pil-radio-dot" aria-hidden="true">
                                {isSelected ? "●" : "○"}
                              </span>
                              {color}
                            </button>
                          );
                        })}
                      </div>
                      <select
                        id="pil-color"
                        name="color"
                        value={selectedColor}
                        onChange={(event) => {
                          setSelectedColor(event.target.value);
                          updateBundleItem(0, "color", event.target.value);
                        }}
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
                        className="pil-chips-group pil-chips-group--sizes"
                        role="radiogroup"
                        aria-label="اختيار المقاس"
                      >
                        {sizeOptions.map((size) => (
                          <button
                            key={size}
                            type="button"
                            className={`pil-chip pil-chip-size ${selectedSize === size ? "is-selected" : ""}`}
                            onClick={() => {
                              setSelectedSize(size);
                              updateBundleItem(0, "size", size);
                            }}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                      <select
                        id="pil-size"
                        name="size"
                        value={selectedSize}
                        onChange={(event) => {
                          setSelectedSize(event.target.value);
                          updateBundleItem(0, "size", event.target.value);
                        }}
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

                  {customAttributeGroups.map((group) => (
                    <div key={group.key} className="pil-field">
                      <label>{group.label}</label>
                      <div
                        className="pil-chips-group"
                        role="radiogroup"
                        aria-label={`اختيار ${group.label}`}
                      >
                        {group.options.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            className={`pil-chip ${selectedCustomAttributes[group.key] === opt ? "is-selected" : ""}`}
                            onClick={() =>
                              setSelectedCustomAttributes((prev) => ({
                                ...prev,
                                [group.key]: opt,
                              }))
                            }
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

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

              <div className="pil-field">
                <label htmlFor="pil-notes">ملاحظات إضافية للتوصيل (اختياري)</label>
                <input
                  id="pil-notes"
                  name="notes"
                  value={formState.notes || ""}
                  onChange={updateFormField("notes")}
                  placeholder="مثال: موعد مفضل للتسليم، أو الاتصال قبل الوصول"
                />
              </div>

              {formError ? (
                <div className="pil-error" role="alert">
                  {formError}
                </div>
              ) : null}

              {/* Live Price Breakdown */}
              <div className="pil-price-breakdown" aria-label="تفاصيل الحساب النهائي">
                <div className="pil-breakdown-row">
                  <span>سعر المنتجات ({activeBundle.qty} {activeBundle.qty > 1 ? "قطع" : "قطعة"}):</span>
                  <span>{formatPrice(activePrice * activeBundle.qty, currency)}</span>
                </div>
                {activeBundle.discountPercent > 0 && (
                  <div className="pil-breakdown-row pil-breakdown-discount">
                    <span>خصم الباقة التوفيرية ({activeBundle.discountPercent}%):</span>
                    <span>- {formatPrice((activePrice * activeBundle.qty) - orderFinalTotal, currency)}</span>
                  </div>
                )}
                <div className="pil-breakdown-row">
                  <span>الشحن والتوصيل:</span>
                  <span className="pil-breakdown-free">مجاناً اليوم (معاينة قبل الدفع)</span>
                </div>
                {activeBundle.freeGift && (
                  <div className="pil-breakdown-row pil-breakdown-gift">
                    <span>هدية العرض الخاصة:</span>
                    <span>🎁 {activeBundle.freeGift}</span>
                  </div>
                )}
                <div className="pil-breakdown-row pil-breakdown-total">
                  <strong>الإجمالي الصافي عند الاستلام:</strong>
                  <strong>{formatPrice(orderFinalTotal, currency)}</strong>
                </div>
              </div>

              <button className="pil-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "جاري إرسال الطلب..."
                  : `${activeConfig.buttonLabel} — ${formatPrice(orderFinalTotal, currency)}`}
              </button>

              {whatsappPhone ? (
                <div className="pil-direct-wa-wrap">
                  <a
                    href={(() => {
                      const cleanPhone = whatsappPhone.replace(/\D/g, "");
                      const targetPhone = cleanPhone.startsWith("0")
                        ? `2${cleanPhone}`
                        : cleanPhone.startsWith("2")
                          ? cleanPhone
                          : `20${cleanPhone}`;
                      const msgLines = [
                        `مرحباً، أريد طلب: ${activeProduct.name}`,
                        `الباقة: ${activeBundle.label} (${activeBundle.qty} قطع)`,
                        `الإجمالي: ${formatPrice(orderFinalTotal, currency)} (شحن مجاني + معاينة قبل الدفع)`,
                      ];
                      if (activeBundle.qty > 1) {
                        bundleItems.slice(0, activeBundle.qty).forEach((p, idx) => {
                          const c = p.color || (idx === 0 ? selectedColor : "") || colorOptions[0] || "";
                          const s = p.size || (idx === 0 ? selectedSize : "") || sizeOptions[0] || "";
                          msgLines.push(`- قطعة ${idx + 1}: ${c ? `لون ${c}` : ""}${s ? ` / مقاس ${s}` : ""}`);
                        });
                      } else {
                        if (selectedColor) msgLines.push(`اللون: ${selectedColor}`);
                        if (selectedSize) msgLines.push(`المقاس: ${selectedSize}`);
                      }
                      if (formState.customerName) msgLines.push(`الاسم: ${formState.customerName}`);
                      if (formState.phone) msgLines.push(`الموبايل: ${formState.phone}`);
                      if (formState.governorate) msgLines.push(`المحافظة: ${formState.governorate}`);
                      if (formState.area) msgLines.push(`المنطقة: ${formState.area}`);
                      return `https://wa.me/${targetPhone}?text=${encodeURIComponent(msgLines.join("\n"))}`;
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pil-direct-wa-btn"
                    aria-label="الطلب السريع عبر واتساب"
                  >
                    <span className="pil-wa-icon" aria-hidden="true">💬</span>
                    <span>أو اطلب فوراً عبر واتساب بنقرة واحدة</span>
                  </a>
                </div>
              ) : null}
            </form>

            {/* Trust Badges Strip */}
            <div className="pil-trust-badges-strip" aria-label="ضمانات الشراء">
              <div className="pil-trust-item">
                <div className="pil-trust-icon-box" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div className="pil-trust-text">
                  <strong>معاينة قبل الدفع</strong>
                  <small>افتح الشحنة وتأكد منها براحتك</small>
                </div>
              </div>
              <div className="pil-trust-item">
                <div className="pil-trust-icon-box" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>
                <div className="pil-trust-text">
                  <strong>الدفع نقدياً عند الاستلام</strong>
                  <small>لا تدفع أي مبلغ إلا بعد فحص شحنتك</small>
                </div>
              </div>
              <div className="pil-trust-item">
                <div className="pil-trust-icon-box" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                </div>
                <div className="pil-trust-text">
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
            <div className="pil-section-heading pil-section-heading--wa">
              <span>تجارب حقيقية موثقة</span>
              <h2>محادثات ورسائل العملاء على واتساب</h2>
            </div>
            <div className="pil-wa-container">
              <div className="pil-wa-header">
                <div className="pil-wa-header-profile">
                  <div className="pil-wa-avatar" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#ffffff">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.074-2.029-.482-1.636-.684-2.697-2.348-2.778-2.457-.081-.109-.658-.876-.658-1.671 0-.796.417-1.189.566-1.35.149-.161.326-.201.435-.201.109 0 .217.001.312.006.101.005.236-.038.37.284.14.335.478 1.168.52 1.254.042.086.07.186.012.3-.058.114-.087.186-.174.288-.087.102-.183.228-.261.306-.089.089-.182.186-.078.365.104.179.462.763.992 1.236.683.61 1.26.799 1.44.888.179.089.284.075.39-.047.105-.122.454-.529.576-.71.121-.182.242-.152.406-.091.164.06 1.039.49 1.218.579.179.089.298.134.341.209.043.075.043.435-.101.84zM12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.66 1.438 5.176L2 22l4.974-1.398A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
                    </svg>
                  </div>
                  <div className="pil-wa-info">
                    <div className="pil-wa-name-row">
                      <strong>فريق خدمة عملاء المتجر</strong>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="#25d366" aria-hidden="true">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                    </div>
                    <span className="pil-wa-status-text">
                      <span className="pil-wa-status-dot" />
                      متصل الآن (محادثات استلام حقيقية)
                    </span>
                  </div>
                </div>
              </div>
              <div className="pil-wa-chat">
                {reviews.map((rev: any, rIdx: number) => (
                  <React.Fragment key={rIdx}>
                    <div className="pil-wa-bubble pil-wa-bubble--incoming">
                      <div className="pil-wa-bubble-head">
                        <strong className="pil-wa-author">{rev.name}</strong>
                        <span className="pil-wa-buyer-tag">مشتري مؤكد ✓</span>
                      </div>
                      <p className="pil-wa-text">{rev.comment || rev.text}</p>
                      <div className="pil-wa-meta">
                        <span className="pil-wa-time">
                          {10 + (rIdx % 12)}:{15 + ((rIdx * 7) % 45)} م
                        </span>
                        <span className="pil-wa-checks" aria-label="تمت القراءة">
                          <svg viewBox="0 0 16 11" width="14" height="10" fill="#53bdeb">
                            <path d="M11.55 1.45a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06L4.52 7.41l5.97-5.96a.75.75 0 0 1 1.06 0zm3.5 0a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-.71-.71a.75.75 0 1 1 1.06-1.06l.18.18 5.97-5.97a.75.75 0 0 1 1.06 0z" />
                          </svg>
                        </span>
                      </div>
                    </div>

                    {/* Authentic Store Reply for realistic dialogue */}
                    {rIdx === 0 && (
                      <div className="pil-wa-bubble pil-wa-bubble--outgoing">
                        <div className="pil-wa-bubble-head">
                          <strong className="pil-wa-author-store">فريق الدعم</strong>
                        </div>
                        <p className="pil-wa-text">
                          أهلاً بحضرتك يا فندم! سعداء جداً بتجربتك وراحتك مع المنتج، ونتشرف بخدمتك دائماً 🙏
                        </p>
                        <div className="pil-wa-meta">
                          <span className="pil-wa-time">
                            {10 + (rIdx % 12)}:{17 + ((rIdx * 7) % 45)} م
                          </span>
                          <span className="pil-wa-checks" aria-label="تمت القراءة">
                            <svg viewBox="0 0 16 11" width="14" height="10" fill="#53bdeb">
                              <path d="M11.55 1.45a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06L4.52 7.41l5.97-5.96a.75.75 0 0 1 1.06 0zm3.5 0a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-.71-.71a.75.75 0 1 1 1.06-1.06l.18.18 5.97-5.97a.75.75 0 0 1 1.06 0z" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
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
        >
          <div className="pil-section-heading">
            <span>إجابات واضحة</span>
            <h2>
              {content.title || faqSection?.content?.title || "الأسئلة الشائعة"}
            </h2>
          </div>
          <div className="pil-faq-list">
            {faqs.map((faq: any, fIdx: number) => (
              <details key={fIdx} className="pil-faq-item">
                <summary className="pil-faq-summary">
                  <span>{faq.q || faq.question}</span>
                  <span className="pil-faq-chevron" aria-hidden="true">
                    ▾
                  </span>
                </summary>
                <p className="pil-faq-answer">{faq.a || faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      );
    }

    if (type === "BEFORE_AFTER") {
      const beforeImg = content.beforeImage || activeProduct.mainImage || "";
      const afterImg =
        content.afterImage ||
        (Array.isArray(activeProduct.images)
          ? activeProduct.images[0]
          : activeProduct.mainImage) ||
        "";
      const beforeLabel =
        content.beforeLabel || "أحذية السوق العادية (إجهاد وألم)";
      const afterLabel =
        content.afterLabel || `${activeProduct.name} (راحة وأصالة)`;

      return (
        <section
          key={section.id || idx}
          className="pil-before-after-section"
          aria-label="مقارنة قبل وبعد"
        >
          <div className="pil-section-heading">
            <span>فرق واضح وملموس</span>
            <h2>{section.title || "شاهد الفرق بنفسك قبل وبعد الاستخدام"}</h2>
          </div>
          <BeforeAfterSlider
            beforeImage={beforeImg}
            afterImage={afterImg}
            beforeLabel={beforeLabel}
            afterLabel={afterLabel}
          />
        </section>
      );
    }

    if (type === "VIDEO_REEL") {
      const videoUrl = content.videoUrl;
      const thumbnail =
        content.videoThumbnail || activeProduct.mainImage || "";
      const caption =
        content.videoCaption ||
        "شاهد تجربة المنتج والأنبوكسينغ على الطبيعة بدون فلاتر";

      return (
        <section
          key={section.id || idx}
          className="pil-video-reel-section"
          aria-label="فيديو المنتج"
        >
          <div className="pil-section-heading">
            <span>تجربة واقعية 100%</span>
            <h2>{section.title || "المنتج على الطبيعة بحركة حقيقية"}</h2>
          </div>
          <VideoReelPlayer
            videoUrl={videoUrl}
            thumbnail={thumbnail}
            caption={caption}
          />
        </section>
      );
    }

    if (type === "HTML") {
      const code = content.htmlCode || content.htmlContent;
      if (!code) return null;
      return (
        <section
          key={section.id || idx}
          className="pil-html-block"
          style={{ maxWidth: 760, margin: "24px auto", padding: "0 16px" }}
          dangerouslySetInnerHTML={{ __html: code }}
        />
      );
    }

    if (type === "IMAGE_ONLY") {
      const imgUrl = content.imageUrl || content.mainImage || getPrimaryProductImage(activeProduct);
      if (!imgUrl) return null;
      const isFull = content.variant === "full" || content.isFullWidth;
      const isCircle = Boolean(content.isCircle);
      const borderRadius = isCircle ? "50%" : isFull ? 0 : (content.borderRadius ?? 12);
      const link = content.linkUrl;

      const imgEl = (
        <picture>
          {content.mobileImage && (
            <source media="(max-width: 640px)" srcSet={content.mobileImage} />
          )}
          <img
            src={imgUrl}
            alt={content.altText || content.caption || activeProduct.name}
            className="pil-img-only-el"
            style={{
              width: isCircle ? 220 : "100%",
              height: isCircle ? 220 : "auto",
              aspectRatio: isCircle ? "1/1" : undefined,
              margin: isCircle ? "0 auto" : undefined,
              display: "block",
              borderRadius,
              objectFit: "cover",
              maxHeight: content.maxHeight || "none",
            }}
            loading="lazy"
          />
        </picture>
      );

      return (
        <section
          key={section.id || idx}
          className={`pil-image-only-section ${isFull ? "is-fullwidth" : "is-contained"}`}
          style={{
            backgroundColor: content.bgColor || "transparent",
            backgroundImage: content.bgImage ? `url(${content.bgImage})` : undefined,
            padding: isFull ? "0" : "16px",
            maxWidth: isFull ? "100%" : 760,
            margin: "0 auto",
          }}
        >
          {link ? (
            <a
              href={link}
              onClick={(e) => {
                if (link.startsWith("#")) {
                  e.preventDefault();
                  const target = document.querySelector(link);
                  if (target) target.scrollIntoView({ behavior: "smooth" });
                }
              }}
              style={{ display: "block" }}
            >
              {imgEl}
            </a>
          ) : (
            imgEl
          )}
          {content.caption && (
            <p className="pil-img-only-caption" style={{ textAlign: "center", color: "#64748b", fontSize: "0.85rem", marginTop: 8 }}>
              {content.caption}
            </p>
          )}
        </section>
      );
    }

    if (type === "CAROUSEL") {
      const carouselImages = content.carouselImages || (content.images ? content.images.map((u: string) => ({ url: u })) : []) || [];
      if (!carouselImages.length && !activeProduct.mainImage) return null;
      const list = carouselImages.length > 0 ? carouselImages : [{ url: activeProduct.mainImage }];

      return (
        <section
          key={section.id || idx}
          className="pil-carousel-section"
          style={{
            backgroundColor: content.bgColor || "transparent",
            backgroundImage: content.bgImage ? `url(${content.bgImage})` : undefined,
            padding: "16px",
            maxWidth: 760,
            margin: "0 auto",
          }}
        >
          <LandingCarousel
            images={list}
            autoplay={content.autoplay !== false}
            interval={content.slideInterval || 3}
          />
        </section>
      );
    }

    if (type === "HOW_IT_WORKS") {
      const steps = content.steps || [];
      if (!steps.length) return null;
      const title = content.title || content.heading || "طريقة الاستخدام وخطوات العمل";
      const subtitle = content.subtitle || content.subheading || "خطوات بسيطة تضمن لك أقصى استفادة وسهولة من أول يوم";

      return (
        <section
          key={section.id || idx}
          className="pil-how-it-works-section"
          style={{
            backgroundColor: content.bgColor || "#ffffff",
            backgroundImage: content.bgImage ? `url(${content.bgImage})` : undefined,
            padding: "32px 16px",
            maxWidth: 760,
            margin: "0 auto",
          }}
        >
          <div className="pil-section-heading">
            <span>خطوات سهلة وواضحة</span>
            <h2>{title}</h2>
            {subtitle && <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: 4 }}>{subtitle}</p>}
          </div>

          <div className="pil-steps-list" style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {steps.map((st: any, sIdx: number) => (
              <div
                key={sIdx}
                className="pil-step-card"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  padding: "16px",
                  background: "#f8fafc",
                  borderRadius: 14,
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  className="pil-step-number"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: "#0f172a",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "1rem",
                    flexShrink: 0,
                  }}
                >
                  {st.stepNumber || st.number || sIdx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                    {st.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "#475569", lineHeight: 1.5 }}>
                    {st.desc}
                  </p>
                  {st.image && (
                    <img
                      src={st.image}
                      alt={st.title}
                      style={{ marginTop: 10, maxHeight: 180, borderRadius: 8, maxWidth: "100%", objectFit: "cover" }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (type === "FEATURED_PRODUCT") {
      const featImg = content.imageUrl || content.mainImage || getPrimaryProductImage(activeProduct);
      const featTitle = content.productName || activeProduct.name;
      const featPrice = content.price != null ? Number(content.price) : activePrice;
      const featOldPrice = content.oldPrice != null ? Number(content.oldPrice) : (activeProduct.comparePrice ? Number(activeProduct.comparePrice) : Math.round(featPrice * 1.35));
      const featBadge = content.featuredBadge || content.badge || "عرض خاص ومميز 🔥";
      const bullets = content.featuredBullets || content.bullets || [
        "خامات أصلية عالية الجودة تدوم لسنوات",
        "تصميم عصري وأداء فائق الراحة طوال اليوم",
        "معاينة كاملة للشحنة قبل دفع أي مبلغ للمندوب",
      ];
      const cta = content.ctaText || "اطلب الآن واستفد من الخصم 🚚";

      return (
        <section
          key={section.id || idx}
          className="pil-featured-product-section"
          style={{
            backgroundColor: content.bgColor || "#ffffff",
            backgroundImage: content.bgImage ? `url(${content.bgImage})` : undefined,
            padding: "24px 16px",
            maxWidth: 760,
            margin: "16px auto",
          }}
        >
          <div
            className="pil-featured-card"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
              border: "2px solid #86efac",
              borderRadius: 18,
              padding: "24px 20px",
              boxShadow: "0 10px 25px -5px rgba(22, 163, 74, 0.12)",
              position: "relative",
            }}
          >
            {featBadge && (
              <span
                style={{
                  position: "absolute",
                  top: -12,
                  right: 20,
                  background: "#16a34a",
                  color: "#ffffff",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  padding: "4px 14px",
                  borderRadius: 20,
                  boxShadow: "0 4px 10px rgba(22, 163, 74, 0.3)",
                }}
              >
                {featBadge}
              </span>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 20, alignItems: "center" }}>
              {featImg && (
                <img
                  src={featImg}
                  alt={featTitle}
                  style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 12 }}
                />
              )}
              <div>
                <h3 style={{ margin: "0 0 10px", fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
                  {featTitle}
                </h3>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
                  <strong style={{ fontSize: "1.4rem", color: "#16a34a", fontWeight: 800 }}>
                    {formatPrice(featPrice, currency)}
                  </strong>
                  {featOldPrice > featPrice && (
                    <del style={{ fontSize: "0.95rem", color: "#94a3b8" }}>
                      {formatPrice(featOldPrice, currency)}
                    </del>
                  )}
                  {featOldPrice > featPrice && (
                    <span style={{ fontSize: "0.78rem", background: "#fee2e2", color: "#ef4444", fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>
                      وفر {Math.round(((featOldPrice - featPrice) / featOldPrice) * 100)}%
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {bullets.map((b: string, bIdx: number) => (
                    <div key={bIdx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.88rem", color: "#334155" }}>
                      <span style={{ color: "#16a34a", fontWeight: 800 }}>✓</span>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("order");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                width: "100%",
                marginTop: 20,
                padding: "14px 20px",
                background: "#16a34a",
                color: "#ffffff",
                fontSize: "1.05rem",
                fontWeight: 800,
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
                boxShadow: "0 6px 16px rgba(22, 163, 74, 0.35)",
              }}
            >
              {cta}
            </button>
          </div>
        </section>
      );
    }

    if (type === "YOUTUBE_VIDEO") {
      const rawUrl = content.videoUrl || content.youtubeUrl || "";
      let ytId = content.videoId || "";
      if (!ytId && rawUrl) {
        const match = rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        ytId = match ? match[1] : "";
      }
      if (!ytId) return null;

      const title = content.title || content.heading;
      const isShorts = content.aspectRatio === "9/16";

      return (
        <section
          key={section.id || idx}
          className="pil-youtube-section"
          style={{
            backgroundColor: content.bgColor || "transparent",
            padding: "24px 16px",
            maxWidth: isShorts ? 400 : 760,
            margin: "0 auto",
          }}
        >
          {title && (
            <div className="pil-section-heading" style={{ marginBottom: 14 }}>
              <h2>{title}</h2>
            </div>
          )}
          <div
            style={{
              position: "relative",
              paddingBottom: isShorts ? "177.77%" : "56.25%",
              height: 0,
              overflow: "hidden",
              borderRadius: 14,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              background: "#000",
            }}
          >
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1`}
              title={title || "فيديو توضيحي"}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {content.videoCaption && (
            <p style={{ textAlign: "center", color: "#64748b", fontSize: "0.85rem", marginTop: 8 }}>
              {content.videoCaption}
            </p>
          )}
        </section>
      );
    }

    if (type === "BUY_BUTTON") {
      const text = content.text || content.buyButtonText || content.title || "اطلب الآن واستلم خلال 48 ساعة — الدفع عند الاستلام 🚚";
      const sub = content.subtitle || content.subtext || "معاينة مجانية للشحنة قبل الدفع + ضمان 14 يوماً للاسترجاع";
      const btnBg = content.btnColor || content.buyButtonBg || "#16a34a";
      const btnColor = content.btnTextColor || content.buyButtonTextColor || "#ffffff";
      const isScroll = !content.targetAction || content.targetAction === "scroll_to_form";

      return (
        <section
          key={section.id || idx}
          className="pil-buy-button-section"
          style={{
            backgroundColor: content.bgColor || "transparent",
            padding: "20px 16px",
            maxWidth: 760,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <button
            type="button"
            className={`pil-standalone-buy-btn ${content.animation === "bounce" ? "pil-anim-bounce" : "pil-anim-pulse"}`}
            style={{
              width: "100%",
              maxWidth: 580,
              padding: "16px 24px",
              background: btnBg,
              color: btnColor,
              fontSize: "1.12rem",
              fontWeight: 800,
              borderRadius: 14,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(22, 163, 74, 0.35)",
              display: "inline-block",
            }}
            onClick={() => {
              if (isScroll) {
                const el = document.getElementById("order");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              } else if (content.targetAction === "open_whatsapp" && whatsappPhone) {
                const cleanPhone = whatsappPhone.replace(/\D/g, "");
                window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`مرحباً، أريد طلب: ${activeProduct.name}`)}`, "_blank");
              } else if (content.targetUrl) {
                window.location.href = content.targetUrl;
              }
            }}
          >
            {text}
          </button>
          {sub && (
            <p style={{ margin: "8px 0 0", fontSize: "0.82rem", color: "#64748b", fontWeight: 500 }}>
              {sub}
            </p>
          )}
        </section>
      );
    }

    if (type === "HEADING") {
      const title = content.title || content.heading || activeProduct.name;
      const subtitle = content.subtitle || content.subheading;
      const align = content.alignment || content.titleAlign || "center";
      const HeadingTag = content.headingLevel === "h1" ? "h1" : content.headingLevel === "h3" ? "h3" : "h2";

      return (
        <section
          key={section.id || idx}
          className="pil-heading-section"
          style={{
            backgroundColor: content.bgColor || "transparent",
            backgroundImage: content.bgImage ? `url(${content.bgImage})` : undefined,
            padding: "24px 16px 12px",
            maxWidth: 760,
            margin: "0 auto",
            textAlign: align as any,
          }}
        >
          {content.badge && (
            <span
              style={{
                display: "inline-block",
                background: "#eff6ff",
                color: "#2563eb",
                border: "1px solid #bfdbfe",
                padding: "3px 12px",
                borderRadius: 20,
                fontSize: "0.8rem",
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              {content.badge}
            </span>
          )}
          <HeadingTag
            style={{
              margin: 0,
              fontSize: HeadingTag === "h1" ? "1.65rem" : HeadingTag === "h3" ? "1.2rem" : "1.45rem",
              fontWeight: 800,
              color: content.textColor || "#0f172a",
              lineHeight: 1.35,
            }}
          >
            {title}
          </HeadingTag>
          {subtitle && (
            <p style={{ margin: "8px 0 0", fontSize: "0.95rem", color: "#475569", lineHeight: 1.5 }}>
              {subtitle}
            </p>
          )}
        </section>
      );
    }

    return null;
  };

  return (
    <article
      className="product-image-landing"
      dir="rtl"
      style={landingStyle.cssVars as React.CSSProperties}
    >
      {sectionsToRender.map((section, idx) => renderDynamicSection(section, idx))}

      {/* Sticky Bottom CTA Bar */}
      <div
        className={`pil-sticky-cta ${isStickyReady && !isFormInView ? "is-ready" : ""}`}
        role="region"
        aria-label="شريط الشراء السريع"
      >
        <div className="pil-sticky-cta-inner">
          <div className="pil-sticky-price-block">
            <span className="pil-sticky-price-label">السعر:</span>
            <strong className="pil-sticky-price-val">
              {formatPrice(orderFinalTotal, currency)}
            </strong>
            <span className="pil-sticky-shipping-badge">شحن سريع · معاينة قبل الدفع</span>
          </div>
          <button
            type="button"
            className="pil-sticky-btn"
            onClick={() => {
              const el = document.getElementById("order");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            اطلب الآن — دفع عند الاستلام 🚚
          </button>
        </div>
      </div>

      {/* Floating Instant WhatsApp Help Button */}
      {whatsappPhone && !isFormInView && (
        <a
          href={`https://wa.me/${whatsappPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
            `السلام عليكم، بستفسر عن تفاصيل ومقاسات ${activeProduct.name} المتاح في العرض`,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pil-floating-whatsapp"
          aria-label="تواصل عبر واتساب للمساعدة السريعة"
        >
          <span className="pil-wa-fab-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.074-2.029-.482-1.636-.684-2.697-2.348-2.778-2.457-.081-.109-.658-.876-.658-1.671 0-.796.417-1.189.566-1.35.149-.161.326-.201.435-.201.109 0 .217.001.312.006.101.005.236-.038.37.284.14.335.478 1.168.52 1.254.042.086.07.186.012.3-.058.114-.087.186-.174.288-.087.102-.183.228-.261.306-.089.089-.182.186-.078.365.104.179.462.763.992 1.236.683.61 1.26.799 1.44.888.179.089.284.075.39-.047.105-.122.454-.529.576-.71.121-.182.242-.152.406-.091.164.06 1.039.49 1.218.579.179.089.298.134.341.209.043.075.043.435-.101.84zM12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.66 1.438 5.176L2 22l4.974-1.398A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
            </svg>
          </span>
          <span className="pil-wa-fab-text">مساعدة سريعة؟</span>
        </a>
      )}
    </article>
  );
};

export default ProductImageLandingPage;
