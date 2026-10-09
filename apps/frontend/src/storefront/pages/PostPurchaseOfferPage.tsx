import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  Truck,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Zap,
  PackageCheck,
  AlertCircle
} from "lucide-react";
import { storefrontApi } from "../../utils/storefrontApi";
import { useStorefrontSettings } from "../hooks/useStorefrontSettings";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import { buildStorefrontPath } from "../utils/paths";
import { formatStorefrontCurrency } from "../utils/currency";
import type {
  PostPurchaseOfferConfig,
  PostPurchaseOfferProductVariant
} from "../../types/postPurchaseOffer";
import { DEFAULT_POST_PURCHASE_OFFER } from "../../types/postPurchaseOffer";
import { getPostPurchaseOfferConfig } from "../utils/postPurchaseOffer";

interface ParsedVariantInfo {
  variant: PostPurchaseOfferProductVariant;
  colorLabel: string;
  sizeLabel: string;
}

const VARIANT_NAME_REGEX = /^(.*?)\s*-\s*(\d{1,3})$/;

function parseVariantOptions(
  variant: PostPurchaseOfferProductVariant
): { colorLabel: string; sizeLabel: string } | null {
  // 1. Prefer options/metadata if non-empty
  const rawOptions =
    variant.options ||
    (variant as any).metadata?.attributeValues ||
    (variant as any).attributes ||
    {};
  if (
    rawOptions &&
    typeof rawOptions === "object" &&
    Object.keys(rawOptions).length > 0
  ) {
    let color: string | undefined;
    let size: string | undefined;
    for (const [k, v] of Object.entries(rawOptions)) {
      if (/لون|color|colour/i.test(k) && v) color = String(v).trim();
      else if (/مقاس|size/i.test(k) && v) size = String(v).trim();
    }
    if (color && size) {
      return { colorLabel: color, sizeLabel: size };
    }
  }

  // 2. Fallback to name regex ^(.*?)\s*-\s*(\d{1,3})$
  if (variant.name) {
    const match = variant.name.match(VARIANT_NAME_REGEX);
    if (match) {
      const colorLabel = match[1].trim();
      const sizeLabel = match[2].trim();
      if (colorLabel && sizeLabel) {
        return { colorLabel, sizeLabel };
      }
    }
  }

  return null;
}

export default function PostPurchaseOfferPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { settings: storefrontSettings } = useStorefrontSettings();
  const { theme } = useStorefrontTheme();

  const orderId = searchParams.get("orderId") || "";
  const currency =
    storefrontSettings?.storefront?.settings?.currency ||
    storefrontSettings?.company?.currency ||
    "EGP";

  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState<PostPurchaseOfferConfig | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<PostPurchaseOfferProductVariant | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [accepting, setAccepting] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(300); // 5 min default

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const variantPickerRef = useRef<HTMLDivElement | null>(null);
  const isRtl = theme?.direction !== "ltr";

  // Build safe thank-you path
  const thankYouPath = useMemo(() => {
    const query = new URLSearchParams(location.search);
    if (orderId) query.set("orderId", orderId);
    return buildStorefrontPath(
      location.pathname,
      `/thank-you?${query.toString()}`,
      location.search
    );
  }, [location.pathname, location.search, orderId]);

  // Load offer from API or storefrontSettings
  useEffect(() => {
    let isCancelled = false;

    const loadOffer = async () => {
      try {
        setLoading(true);
        // First check if designTokens already has the offer
        const tokens = getPostPurchaseOfferConfig(storefrontSettings) as any;
        if (tokens?.enabled && tokens?.productId) {
          setOffer(tokens);
          setSecondsRemaining((tokens.timerMinutes || 5) * 60);
        }

        // Fetch authoritative public offer from backend
        const response = await storefrontApi.getPostPurchaseOffer();
        if (isCancelled) return;

        if (response?.data?.enabled && response?.data?.product) {
          const fetchedOffer = response.data;
          setOffer(fetchedOffer);
          setSecondsRemaining((fetchedOffer.timerMinutes || 5) * 60);

          // No default variant selection - customer chooses color & size manually
        } else if (!tokens?.enabled) {
          // No active offer, seamlessly continue to thank-you page
          navigate(thankYouPath, { replace: true });
        }
      } catch (err) {
        console.warn("Could not load post-purchase offer:", err);
        // Fallback or continue to thank-you
        if (!offer) {
          navigate(thankYouPath, { replace: true });
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    void loadOffer();

    return () => {
      isCancelled = true;
    };
  }, [storefrontSettings, thankYouPath, navigate]);

  // Countdown timer effect
  useEffect(() => {
    if (secondsRemaining <= 0) {
      // Timer expired, gracefully proceed to thank you
      navigate(thankYouPath, { replace: true });
      return;
    }

    timerRef.current = setTimeout(() => {
      setSecondsRemaining((prev) => prev - 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [secondsRemaining, navigate, thankYouPath]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Product images calculation
  const productImages = useMemo(() => {
    if (!offer?.product) {
      return offer?.productImage ? [offer.productImage] : [];
    }
    const imgs: string[] = [];
    if (offer.product.imageUrl) imgs.push(offer.product.imageUrl);
    if (offer.product.mainImage && !imgs.includes(offer.product.mainImage)) {
      imgs.push(offer.product.mainImage);
    }
    if (Array.isArray(offer.product.images)) {
      offer.product.images.forEach((im) => {
        const url = typeof im === "string" ? im : (im as any)?.url;
        if (url && !imgs.includes(url)) imgs.push(url);
      });
    } else if (typeof offer.product.images === "string") {
      try {
        const parsed = JSON.parse(offer.product.images);
        if (Array.isArray(parsed)) {
          parsed.forEach((im: any) => {
            const url = typeof im === "string" ? im : im?.url;
            if (url && !imgs.includes(url)) imgs.push(url);
          });
        }
      } catch {}
    }
    return imgs.length > 0 ? imgs : [offer.productImage || ""];
  }, [offer]);

  const activeImage = productImages[selectedImageIndex] || offer?.productImage || "";

  // Effective price calculations
  const originalPrice = Number(
    selectedVariant?.comparePrice ||
    selectedVariant?.price ||
    offer?.originalPrice ||
    offer?.product?.comparePrice ||
    offer?.product?.price ||
    0
  );

  const offerPrice = useMemo(() => {
    if (!offer) return 0;
    if (offer.discountType === "percentage") {
      const base = originalPrice > 0 ? originalPrice : Number(offer.product?.price || 0);
      const discountPct = Number(offer.discountValue) || 30;
      return Number((base * (1 - discountPct / 100)).toFixed(2));
    }
    return Number((offer.offerPrice || offer.discountValue || 0).toFixed(2));
  }, [offer, originalPrice]);

  const savingsAmount = originalPrice > offerPrice ? originalPrice - offerPrice : 0;
  const savingsPercent =
    originalPrice > 0 ? Math.round((savingsAmount / originalPrice) * 100) : 0;

  // Grouped variants parsing
  const parsedVariants = useMemo<ParsedVariantInfo[] | null>(() => {
    const rawVariants = offer?.product?.variants;
    if (!rawVariants || rawVariants.length <= 1) return null;

    const parsedList: ParsedVariantInfo[] = [];
    for (const v of rawVariants) {
      const parsed = parseVariantOptions(v);
      if (!parsed) {
        // Fallback completely to flat list if ANY variant cannot be parsed
        return null;
      }
      parsedList.push({
        variant: v,
        colorLabel: parsed.colorLabel,
        sizeLabel: parsed.sizeLabel
      });
    }
    return parsedList;
  }, [offer?.product?.variants]);

  const groupedData = useMemo(() => {
    if (!parsedVariants || parsedVariants.length === 0) return null;

    // Unique colors in appearance order
    const colors: string[] = [];
    const allSizesSet = new Set<string>();

    for (const item of parsedVariants) {
      if (!colors.includes(item.colorLabel)) {
        colors.push(item.colorLabel);
      }
      allSizesSet.add(item.sizeLabel);
    }

    // Sort sizes ascending numerically
    const allSizes = Array.from(allSizesSet).sort((a, b) => {
      const numA = Number(a);
      const numB = Number(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b, undefined, { numeric: true });
    });

    return {
      colors,
      allSizes,
      parsedVariants
    };
  }, [parsedVariants]);

  // Color selection: if current size exists in new color -> keep it, else clear size
  const handleSelectColor = (color: string) => {
    setSelectedColor(color);

    if (selectedSize) {
      const matching = groupedData?.parsedVariants.find(
        (p) => p.colorLabel === color && p.sizeLabel === selectedSize
      );
      const isAvailable =
        matching?.variant &&
        (typeof matching.variant.stock !== "number" || matching.variant.stock > 0);

      if (matching && isAvailable) {
        setSelectedVariant(matching.variant);
      } else {
        setSelectedSize(null);
        setSelectedVariant(null);
      }
    } else {
      setSelectedVariant(null);
    }
  };

  // Size selection
  const handleSelectSize = (size: string) => {
    setSelectedSize(size);

    if (selectedColor) {
      const matching = groupedData?.parsedVariants.find(
        (p) => p.colorLabel === selectedColor && p.sizeLabel === size
      );
      if (matching) {
        setSelectedVariant(matching.variant);
      }
    }
  };

  // Handle Offer Acceptance
  const handleAcceptOffer = async () => {
    // Fortified variant check: If product has variants, require valid in-stock variant selection
    if (offer?.product?.variants && offer.product.variants.length > 0) {
      if (!selectedVariant) {
        toast.error(
          groupedData
            ? "اختاري اللون والمقاس الأول 🙏"
            : "اختاري الخيار المناسب أولاً 🙏"
        );
        if (typeof variantPickerRef.current?.scrollIntoView === "function") {
          variantPickerRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        }
        return;
      }

      if (typeof selectedVariant.stock === "number" && selectedVariant.stock <= 0) {
        toast.error("عذراً، هذا المقاس غير متوفر بالمخزون حالياً 🙏");
        return;
      }
    }

    if (!orderId) {
      toast.error("رقم الطلب غير متاح، جارٍ نقلك إلى صفحة التأكيد...");
      navigate(thankYouPath);
      return;
    }

    try {
      setAccepting(true);
      const payload = {
        productId: offer?.productId,
        variantId: selectedVariant?.id || null,
        name: offer?.productName || offer?.product?.name || "عرض خاص بعد الطلب",
        price: offerPrice,
        originalPrice,
        quantity: 1,
        imageUrl: activeImage
      };

      const res = await storefrontApi.acceptPostPurchaseOffer(orderId, payload);

      if (res?.success) {
        toast.success("تمت إضافة العرض الخاص إلى طلبك بنجاح!");
        const query = new URLSearchParams(location.search);
        query.set("orderId", orderId);
        query.set("offerAccepted", "1");
        const nextUrl = buildStorefrontPath(
          location.pathname,
          `/thank-you?${query.toString()}`,
          location.search
        );
        navigate(nextUrl, {
          state: {
            offerAccepted: true,
            addedItem: payload
          }
        });
      } else {
        throw new Error(res?.message || "فشلت إضافة العرض");
      }
    } catch (err: any) {
      console.error("Failed to accept offer:", err);
      toast.error(err?.message || "حدث خطأ أثناء إضافة العرض، تم تحويلك لصفحة طلبك");
      navigate(thankYouPath);
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineOffer = () => {
    navigate(thankYouPath);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center" dir={isRtl ? "rtl" : "ltr"}>
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-600 animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          جارٍ فحص العروض الحصرية لطلبك...
        </p>
      </div>
    );
  }

  if (!offer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-zinc-950 py-6 sm:py-10 px-3 sm:px-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">

        {/* 1. Step Indicator & Order Safeguard Notification */}
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-500/10 p-4 sm:p-5 text-emerald-950 dark:text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm sm:text-base leading-snug">
                تم استلام طلبك المبدئي بنجاح! {orderId ? `(طلب #${orderId})` : ""}
              </p>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                طلبك الأصلي محفوظ ومؤكد. لا تغلق الصفحة — إليك فرصة حصرية لإضافة هذا المنتج لشحنتك قبل إغلاقها.
              </p>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-1.5 self-end sm:self-center text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-600/15 text-emerald-800 dark:text-emerald-300">
            <span>الخطوة 2 من 3: العرض الحصري</span>
          </div>
        </div>

        {/* 2. Urgency Countdown Bar */}
        <div className="rounded-xl border border-amber-300/80 bg-amber-50 dark:bg-amber-950/30 p-3 sm:p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-xs sm:text-sm">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
            <span>ينتهي هذا العرض الحصري لطلبك خلال:</span>
          </div>
          <div className="px-3 py-1 bg-amber-600 text-white rounded-lg font-mono font-black text-sm sm:text-base tracking-widest shadow-inner tabular-nums">
            {formattedTime}
          </div>
        </div>

        {/* 3. Main Offer Card - Single Unified Surface */}
        <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-8 shadow-xl shadow-black/5 space-y-6">

          {/* Header Hooks */}
          <div className="text-center space-y-2 max-w-xl mx-auto">
            {offer.badgeText && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                <Sparkles className="w-3.5 h-3.5" />
                {offer.badgeText}
              </span>
            )}
            <h1 className="text-xl sm:text-3xl font-black text-foreground tracking-tight text-balance leading-tight">
              {offer.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed text-pretty">
              {offer.subtitle}
            </p>
          </div>

          {/* Product Showcase Bento Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">

            {/* Left: Product Images */}
            <div className="space-y-3">
              <div className="relative aspect-square rounded-2xl overflow-hidden border border-border/60 bg-muted/20 shadow-inner group">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={offer.productName || "منتج العرض"}
                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    لا توجد صورة
                  </div>
                )}
                {savingsPercent > 0 && (
                  <div className="absolute top-3 start-3 px-2.5 py-1 rounded-xl bg-rose-600 text-white font-black text-xs shadow-md">
                    وفر {savingsPercent}%
                  </div>
                )}
              </div>

              {productImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {productImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                        selectedImageIndex === idx
                          ? "border-emerald-600 scale-105 shadow-sm"
                          : "border-border/60 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Pricing, Variants, and Highlights */}
            <div className="space-y-5">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">
                  {offer.productName || offer.product?.name}
                </h2>
                {offer.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {offer.description}
                  </p>
                )}
              </div>

              {/* Variant Picker (Color -> Size Grouped, or Flat Fallback) */}
              {offer.product?.variants && offer.product.variants.length > 1 && (
                <div ref={variantPickerRef} className="space-y-3.5 pt-3 border-t border-border/60">
                  {groupedData ? (
                    <>
                      {/* 1. Color Selection Row */}
                      <div className="space-y-1.5">
                        <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                          <span>اختاري اللون</span>
                          {selectedColor && (
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              : {selectedColor}
                            </span>
                          )}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {groupedData.colors.map((color) => {
                            const isSelected = selectedColor === color;
                            return (
                              <button
                                key={color}
                                type="button"
                                onClick={() => handleSelectColor(color)}
                                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                                  isSelected
                                    ? "border-emerald-600 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 shadow-sm ring-1 ring-emerald-600/30"
                                    : "border-border hover:border-emerald-500/40 hover:bg-muted/40 text-foreground"
                                }`}
                              >
                                {isSelected && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                )}
                                <span>{color}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. Size Selection Row */}
                      <div className="space-y-1.5">
                        <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                          <span>اختاري المقاس</span>
                          {selectedSize && (
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              : {selectedSize}
                            </span>
                          )}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {groupedData.allSizes.map((size) => {
                            const isSelected = selectedSize === size;
                            const matchingVariant = selectedColor
                              ? groupedData.parsedVariants.find(
                                  (p) =>
                                    p.colorLabel === selectedColor &&
                                    p.sizeLabel === size
                                )?.variant
                              : null;

                            // If color is chosen, check if variant exists for this color & has stock > 0
                            const isUnavailable = selectedColor
                              ? !matchingVariant ||
                                (typeof matchingVariant.stock === "number" &&
                                  matchingVariant.stock <= 0)
                              : false;

                            return (
                              <button
                                key={size}
                                type="button"
                                disabled={isUnavailable}
                                onClick={() => handleSelectSize(size)}
                                className={`min-w-[44px] h-10 px-3 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center tabular-nums active:scale-[0.98] ${
                                  isUnavailable
                                    ? "border-border/40 bg-muted/20 text-muted-foreground/50 opacity-40 cursor-not-allowed line-through"
                                    : isSelected
                                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30"
                                    : "border-border/80 bg-background hover:border-emerald-500/50 hover:bg-muted/40 text-foreground cursor-pointer"
                                }`}
                              >
                                {size}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Fallback Flat Chips View (Safe Failover if any variant is unparseable) */
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-foreground block">
                        اختاري الخيار المناسب:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {offer.product.variants.map((v) => {
                          const isSelected = selectedVariant?.id === v.id;
                          const isUnavailable =
                            typeof v.stock === "number" && v.stock <= 0;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              disabled={isUnavailable}
                              onClick={() => setSelectedVariant(v)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                isUnavailable
                                  ? "border-border/40 bg-muted/20 text-muted-foreground/50 opacity-40 cursor-not-allowed line-through"
                                  : isSelected
                                  ? "border-emerald-600 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 shadow-sm ring-1 ring-emerald-600/30"
                                  : "border-border hover:bg-muted/40 text-foreground cursor-pointer"
                              }`}
                            >
                              {v.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Price Panel */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-1">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatStorefrontCurrency(offerPrice, currency)}
                  </span>
                  {originalPrice > offerPrice && (
                    <span className="text-sm sm:text-base line-through text-muted-foreground tabular-nums">
                      {formatStorefrontCurrency(originalPrice, currency)}
                    </span>
                  )}
                </div>

                {savingsAmount > 0 && (
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    🎉 توفير إجمالي: {formatStorefrontCurrency(savingsAmount, currency)} ({savingsPercent}% خصم خاص)
                  </p>
                )}

                {offer.freeShipping && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1.5 border-t border-border/40 mt-2">
                    <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>شحن مجاني بالكامل — يُرسل في نفس طرد طلبك بدون أي رسوم إضافية</span>
                  </div>
                )}
              </div>

              {/* Feature Highlights */}
              {offer.features && offer.features.length > 0 && (
                <ul className="space-y-2 text-xs text-foreground/90">
                  {offer.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              )}

            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-4 border-t border-border/70">
            <button
              type="button"
              disabled={accepting}
              onClick={handleAcceptOffer}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-base sm:text-lg shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {accepting ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>جارٍ إضافة العرض إلى شحنتك...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-white text-white" />
                  <span>{offer.acceptButtonText || "نعم! أضف هذا العرض إلى طلبي الآن"}</span>
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                disabled={accepting}
                onClick={handleDeclineOffer}
                className="text-xs sm:text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors cursor-pointer py-1 disabled:opacity-50"
              >
                {offer.declineButtonText || "لا شكراً، اكتفِ بطلبي الأصلي فقط وانتقل لصفحة التأكيد"}
              </button>
            </div>
          </div>

          {/* Trust Guarantees Footer Strip */}
          <div className="pt-2 border-t border-border/40 grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
            <div className="flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>ضمان أصالة وجودة</span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              <span>توصيل مع نفس الشحنة</span>
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5">
              <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>دفع عند الاستلام</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
