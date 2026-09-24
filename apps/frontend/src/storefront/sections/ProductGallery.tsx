import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Heart } from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useParams } from "react-router-dom";
import { useProduct } from "../hooks/useProduct";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import { useStorefrontSettings } from "../hooks/useStorefrontSettings";
import { resolveSectionVariant } from "../variants";
import StorefrontProductImage from "../components/StorefrontProductImage";
import { usePdpSelectionStore } from "../store/usePdpSelectionStore";
import { useWishlistStore } from "../store/useWishlistStore";
import { buildStorefrontImageCandidates } from "../utils/productImages";
import { getVariantAttributes } from "../utils/variants";
import { formatStorefrontCurrency } from "../utils/currency";
import { STOREFRONT_BUYBOX_ID } from "../utils/pdpCheckout";
import {
  getStorefrontMarketplaceAppSettings,
  isStorefrontMarketplaceAppEnabled,
} from "../utils/marketplaceApps";
interface ProductGalleryProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const prefersArabic = (value?: boolean) => {
  if (typeof value === "boolean") {
    return value;
  }

  return typeof document !== "undefined" && document.documentElement.dir === "rtl";
};

const getFallbackInitials = (productName?: string) => {
  const normalized = productName?.trim();
  if (!normalized) {
    return "CG";
  }

  const initials = normalized
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || normalized.charAt(0).toUpperCase() || "CG";
};

const GalleryImageFallback: React.FC<{
  productName?: string;
  prefersArabicCopy?: boolean;
}> = ({ productName, prefersArabicCopy }) => (
  <div className="flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(241,245,249,0.98))] px-4 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background/90 text-sm font-black text-foreground/70">
      {(productName?.trim().charAt(0) || "P").toUpperCase()}
    </div>
    <p className="mt-3 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground">
      {prefersArabic(prefersArabicCopy)
        ? "المعاينة غير متاحة"
        : "Preview unavailable"}
    </p>
  </div>
);

const CyberGalleryImageFallback: React.FC<{
  productName?: string;
  categoryLabel?: string;
  prefersArabicCopy?: boolean;
}> = ({ productName, categoryLabel, prefersArabicCopy }) => {
  const isArabic = prefersArabic(prefersArabicCopy);
  const initials = getFallbackInitials(productName);

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),rgba(7,10,19,0.98)_58%)] px-5 py-6 text-start text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),transparent_34%,transparent_66%,rgba(59,130,246,0.16))]" />
      <div className="pointer-events-none absolute inset-x-6 top-6 h-px bg-gradient-to-r from-cyan-300/0 via-cyan-300/70 to-cyan-300/0" />
      <div className="pointer-events-none absolute inset-y-10 start-7 w-px bg-gradient-to-b from-cyan-300/0 via-cyan-300/55 to-cyan-300/0" />
      <div className="pointer-events-none absolute -top-8 end-10 h-24 w-24 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 start-8 h-28 w-28 rounded-full bg-primary/25 blur-3xl" />

      <div className="relative z-10 flex h-full w-full flex-col justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-full border border-cyan-300/30 bg-slate-950/75 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100 backdrop-blur-md">
            {isArabic ? "Cyber Gear" : "Cyber Gear"}
          </div>
          <div className="inline-flex items-center rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/75 backdrop-blur-md">
            {categoryLabel || (isArabic ? "مختارات المتجر" : "Store Select")}
          </div>
        </div>

        <div className="flex flex-col items-start gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-[1.6rem] border border-cyan-300/25 bg-white/6 text-2xl font-black uppercase tracking-[0.18em] text-cyan-100 shadow-[0_0_40px_rgba(34,211,238,0.16)] backdrop-blur-md">
            {initials}
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200/75">
              {isArabic ? "قطعة مميزة" : "Featured Item"}
            </p>
            <h3 className="max-w-[16rem] text-lg font-black leading-tight text-white sm:text-xl">
              {productName?.trim() || (isArabic ? "قطعة Cyber Gear" : "Cyber Gear Item")}
            </h3>
            <p className="max-w-[18rem] text-sm leading-6 text-slate-200/82">
              {isArabic
                ? "السعر والتفاصيل والإضافات المرتبطة أمامك بوضوح داخل صفحة واحدة حتى تحسم اختيارك بسرعة."
                : "Price, key details, and related add-ons stay clear in one focused product view."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/72 sm:max-w-[18rem]">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-md">
            {isArabic ? "تفاصيل واضحة" : "Key Details"}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-md">
            {isArabic ? "شراء أسرع" : "Quick Order"}
          </div>
        </div>
      </div>
    </div>
  );
};

const useSwipe = (
  imagesLength: number,
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>,
) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0]?.clientX ?? null);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0]?.clientX ?? null);
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setActiveIndex((p: number) => (p === imagesLength - 1 ? 0 : p + 1));
    }
    if (isRightSwipe) {
      setActiveIndex((p: number) => (p === 0 ? imagesLength - 1 : p - 1));
    }
  };

  return { onTouchStart, onTouchMove, onTouchEnd: onTouchEndHandler };
};

interface OptimizedGalleryImageProps extends Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src"
> {
  source?: string | null;
  mode?: "hero" | "detail" | "thumb";
  responsiveSizes?: string;
  fetchpriority?: "high" | "low" | "auto";
  productName?: string;
  categoryLabel?: string;
  fallbackVariant?: "default" | "cyber";
  prefersArabicCopy?: boolean;
  fitMode?: "cover" | "contain";
}

const resolveGalleryResponsiveSizes = (
  mode: "hero" | "detail" | "thumb",
  responsiveSizes: string | undefined,
) => {
  if (mode === "thumb") {
    return undefined;
  }

  const fallbackSizes = responsiveSizes || "100vw";

  if (mode !== "hero" || /max-width:\s*767px/i.test(fallbackSizes)) {
    return fallbackSizes;
  }

  return `(max-width: 767px) 82vw, ${fallbackSizes}`;
};

const OptimizedGalleryImage: React.FC<OptimizedGalleryImageProps> = ({
  source,
  mode = "detail",
  responsiveSizes,
  productName,
  categoryLabel,
  fallbackVariant = "default",
  prefersArabicCopy,
  fitMode,
  ...imgProps
}) => {
  return (
    <StorefrontProductImage
      candidates={[source]}
      requestedWidth={mode === "thumb" ? 160 : mode === "hero" ? 1280 : 960}
      responsiveWidths={
        mode === "thumb"
          ? undefined
          : mode === "hero"
            ? [520, 720, 960, 1280]
            : [320, 480, 640, 800, 1200]
      }
      responsiveSizes={resolveGalleryResponsiveSizes(mode, responsiveSizes)}
      imageQuality={mode === "thumb" ? 72 : mode === "hero" ? 78 : 80}
      fitMode={fitMode || (mode === "hero" ? "contain" : undefined)}
      fallback={
        fallbackVariant === "cyber" ? (
          <CyberGalleryImageFallback
            productName={productName}
            categoryLabel={categoryLabel}
            prefersArabicCopy={prefersArabicCopy}
          />
        ) : (
          <GalleryImageFallback
            productName={productName}
            prefersArabicCopy={prefersArabicCopy}
          />
        )
      }
      {...imgProps}
    />
  );
};

const StandardGallery = ({
  images,
  product,
  activeIndex,
  setActiveIndex,
  swipeHandlers,
  prefersArabicCopy,
  compactMobile = false,
  flushMobile = false,
  overlayActions = null,
  showMobileImageCount = true,
  overlayMobileDots = false,
  onOpenZoom,
}: any) => {
  const hasMultipleImages = images.length > 1;
  const mobileDotButtons = images.map((_: string, i: number) => (
    <button
      key={i}
      onClick={() => setActiveIndex(i)}
      className="inline-flex h-8 w-8 items-center justify-center"
      aria-label={
        prefersArabicCopy
          ? `الانتقال إلى الصورة ${i + 1}`
          : `Go to image ${i + 1}`
      }
    >
      <span
        className={`h-2 rounded-full transition-all duration-200 ${
          activeIndex === i
            ? "w-5 bg-primary shadow-[0_1px_5px_rgba(0,0,0,0.24)]"
            : "w-2 bg-white/82 shadow-[0_1px_5px_rgba(0,0,0,0.22)]"
        }`}
      />
    </button>
  ));

  return (
    <div
        className={
          hasMultipleImages
            ? compactMobile
              ? flushMobile
                ? "flex flex-col gap-2 lg:flex-row"
                : "flex flex-col gap-3 lg:flex-row"
              : "flex flex-col-reverse gap-4 lg:flex-row"
            : "block"
        }
    >
    {/* Thumbnails */}
    {hasMultipleImages ? (
      <div
        className={
          compactMobile
            ? "hidden gap-2 overflow-x-auto pb-2 lg:flex lg:flex-col lg:overflow-visible lg:pb-0"
            : "flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0"
        }
      >
        {images.map((img: string, i: number) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`
              h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius)] border-2 transition-all duration-200 lg:h-20 lg:w-20
              ${
                activeIndex === i
                  ? "border-ring ring-1 ring-ring"
                  : "border-border hover:border-muted-foreground"
              }
            `}
            aria-label={
              prefersArabicCopy ? `عرض الصورة ${i + 1}` : `View image ${i + 1}`
            }
          >
            <OptimizedGalleryImage
              source={img}
              alt={`${product?.name} thumbnail ${i + 1}`}
              loading="lazy"
              fetchpriority="low"
              decoding="async"
              width="80"
              height="80"
              mode="thumb"
              className="h-full w-full object-cover"
              productName={product?.name}
            />
          </button>
        ))}
      </div>
    ) : null}

    {/* Main Image */}
    <div
      className={`relative flex-1 overflow-hidden group touch-pan-y ${
        compactMobile
          ? flushMobile
            ? "aspect-[1/1.04] rounded-none bg-transparent sm:aspect-[4/5] sm:rounded-[1.25rem] sm:bg-white lg:aspect-[4/5] lg:rounded-[var(--radius)]"
            : "aspect-[5/4] rounded-[1.4rem] bg-white sm:aspect-[4/5] lg:aspect-[4/5] lg:rounded-[var(--radius)]"
          : "aspect-square rounded-[var(--radius)] bg-muted lg:aspect-[4/5]"
      }`}
      onClick={(event) => {
        if (typeof onOpenZoom !== "function") {
          return;
        }

        const target = event.target as HTMLElement | null;
        if (target?.closest("button")) {
          return;
        }

        onOpenZoom();
      }}
      onKeyDown={(event) => {
        if (typeof onOpenZoom !== "function") {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenZoom();
        }
      }}
      role={typeof onOpenZoom === "function" ? "button" : undefined}
      tabIndex={typeof onOpenZoom === "function" ? 0 : undefined}
      aria-label={
        typeof onOpenZoom === "function"
          ? prefersArabicCopy
            ? "افتحي تكبير الصورة"
            : "Open image zoom"
          : undefined
      }
      {...swipeHandlers}
    >
      <OptimizedGalleryImage
        source={images[activeIndex]}
        alt={`${product?.name} main view`}
        fetchpriority="high"
        loading="eager"
        decoding="sync"
        mode="hero"
        responsiveSizes="(min-width: 1024px) 50vw, 100vw"
        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
          typeof onOpenZoom === "function" ? "cursor-zoom-in" : ""
        }`}
        productName={product?.name}
      />

      {overlayActions ? (
        <div className="absolute end-3 top-[4.6rem] z-10 flex flex-col gap-2 sm:top-3">
          {overlayActions}
        </div>
      ) : null}

      {compactMobile && showMobileImageCount && images.length > 1 ? (
        <div className="absolute start-3 top-3 inline-flex items-center rounded-full border border-white/35 bg-black/45 px-3 py-1 text-[11px] font-black tracking-[0.14em] text-white backdrop-blur-md">
          {activeIndex + 1}/{images.length}
        </div>
      ) : null}

      {/* Prev/Next Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={() =>
              setActiveIndex((p: number) =>
                p === 0 ? images.length - 1 : p - 1,
              )
            }
            className="absolute start-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground opacity-100 shadow backdrop-blur-sm transition-opacity hover:bg-background md:h-9 md:w-9 md:opacity-0 md:group-hover:opacity-100"
            aria-label={prefersArabicCopy ? "الصورة السابقة" : "Previous image"}
          >
            <svg
              className="rtl:rotate-180"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() =>
              setActiveIndex((p: number) =>
                p === images.length - 1 ? 0 : p + 1,
              )
            }
            className="absolute end-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground opacity-100 shadow backdrop-blur-sm transition-opacity hover:bg-background md:h-9 md:w-9 md:opacity-0 md:group-hover:opacity-100"
            aria-label={prefersArabicCopy ? "الصورة التالية" : "Next image"}
          >
            <svg
              className="rtl:rotate-180"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {overlayMobileDots && images.length > 1 ? (
        <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center md:hidden">
          {mobileDotButtons}
        </div>
      ) : null}
    </div>

    {/* Mobile dot indicators */}
    {images.length > 1 && !overlayMobileDots && (
      <div className={`flex justify-center md:hidden ${flushMobile ? "pt-1" : "pt-2"}`}>
        {images.map((_: string, i: number) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted/45"
            aria-label={
              prefersArabicCopy
                ? `الانتقال إلى الصورة ${i + 1}`
                : `Go to image ${i + 1}`
            }
          >
            <span
              className={`h-2 rounded-full transition-all duration-200 ${
                activeIndex === i ? "w-5 bg-primary" : "w-2 bg-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </div>
    )}
    </div>
  );
};

const MirrorCarouselGallery = ({
  images,
  product,
  activeIndex,
  setActiveIndex,
  swipeHandlers,
  prefersArabicCopy,
  onOpenZoom,
  showWomenQuickBuyOverlay,
  womenQuickBuyPrice,
  womenQuickBuyOriginalPrice,
  womenQuickBuyDiscount,
  womenQuickBuyRating,
  womenQuickBuyReviews,
  onJumpToBuybox,
}: any) => (
  <div className="space-y-3">
    <div
      className="group relative overflow-hidden rounded-[1.65rem] bg-[#fff8f4] ring-1 ring-[#ead8cf] shadow-[0_28px_90px_-72px_rgba(76,42,44,0.38)] touch-pan-y"
      {...swipeHandlers}
    >
      <OptimizedGalleryImage
        source={images[activeIndex]}
        alt={`${product?.name} mirror view`}
        fetchpriority="high"
        loading="eager"
        decoding="sync"
        mode="hero"
        responsiveSizes="(min-width: 1024px) 50vw, 100vw"
        className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
        productName={product?.name}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#2f232d]/30 via-[#2f232d]/6 to-transparent" />
      <button
        type="button"
        onClick={onOpenZoom}
        className={`absolute inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-black text-[#4f3b42] shadow-[0_18px_34px_-24px_rgba(79,59,66,0.45)] backdrop-blur transition-colors hover:bg-white ${
          showWomenQuickBuyOverlay ? "start-4 top-4 sm:bottom-4 sm:start-4 sm:top-auto" : "bottom-4 start-4"
        }`}
        aria-label={prefersArabicCopy ? "تكبير الصورة" : "Zoom image"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
          <path d="M11 8v6" />
          <path d="M8 11h6" />
        </svg>
        <span>{prefersArabicCopy ? "تكبير" : "Zoom"}</span>
      </button>
      {showWomenQuickBuyOverlay ? (
        <div className="absolute inset-x-3 bottom-3 z-10 sm:hidden">
          <div className="rounded-[1.3rem] border border-white/45 bg-white/88 p-3 shadow-[0_22px_50px_-28px_rgba(63,36,50,0.45)] backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-[13px] font-black text-[#3f2432]">
                  {product?.name}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-black leading-none text-[#3f2432]">
                    {womenQuickBuyPrice}
                  </span>
                  {womenQuickBuyOriginalPrice ? (
                    <span className="text-[12px] font-bold text-[#8d6a66] line-through decoration-[#d7b9bf]">
                      {womenQuickBuyOriginalPrice}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-black">
                  {womenQuickBuyDiscount ? (
                    <span className="rounded-full bg-[#3f2432] px-2.5 py-1 text-white">
                      {prefersArabicCopy ? `وفر ${womenQuickBuyDiscount}%` : `Save ${womenQuickBuyDiscount}%`}
                    </span>
                  ) : null}
                  {womenQuickBuyRating ? (
                    <span className="rounded-full border border-[#ead8cf] bg-white px-2.5 py-1 text-[#6f5a50]">
                      ★ {womenQuickBuyRating.toFixed(1)}
                      {womenQuickBuyReviews ? ` · ${womenQuickBuyReviews}` : ""}
                    </span>
                  ) : (
                    <span className="rounded-full border border-[#ead8cf] bg-white px-2.5 py-1 text-[#6f5a50]">
                      {prefersArabicCopy ? "صور حقيقية + طلب سريع" : "Real photos + quick order"}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onJumpToBuybox}
                className="shrink-0 rounded-[1rem] bg-[#3f2432] px-4 py-3 text-[12px] font-black text-white shadow-[0_18px_34px_-24px_rgba(63,36,50,0.55)] transition-transform active:scale-[0.98]"
              >
                {prefersArabicCopy ? "اختاري العرض" : "Choose offer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {images.length > 1 ? (
        <div className="absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 items-center justify-between px-3">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setActiveIndex((p: number) => (p === 0 ? images.length - 1 : p - 1));
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/88 text-[#4f3b42] shadow-[0_14px_28px_-18px_rgba(79,59,66,0.5)] backdrop-blur transition-colors hover:bg-white hover:text-[#d86b55]"
            aria-label={prefersArabicCopy ? "الصورة السابقة" : "Previous image"}
          >
            <svg className="rtl:rotate-180" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setActiveIndex((p: number) => (p === images.length - 1 ? 0 : p + 1));
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/88 text-[#4f3b42] shadow-[0_14px_28px_-18px_rgba(79,59,66,0.5)] backdrop-blur transition-colors hover:bg-white hover:text-[#d86b55]"
            aria-label={prefersArabicCopy ? "الصورة التالية" : "Next image"}
          >
            <svg className="rtl:rotate-180" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>

    {images.length > 1 ? (
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {images.map((img: string, i: number) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`shrink-0 overflow-hidden rounded-[1rem] ring-1 transition-all duration-300 ${
              activeIndex === i
                ? 'ring-[#d86b55] shadow-[0_12px_34px_-26px_rgba(216,107,85,0.75)]'
                : 'ring-[#ead8cf] hover:ring-[#d86b55]/55'
            }`}
            aria-label={
              prefersArabicCopy
                ? `الانتقال إلى الصورة ${i + 1}`
                : `Go to image ${i + 1}`
            }
          >
            <div className="aspect-[4/5] w-[4.8rem] bg-white sm:w-[5.4rem]">
              <OptimizedGalleryImage
                source={img}
                alt=""
                loading="lazy"
                fetchpriority="low"
                decoding="async"
                mode="thumb"
                className="h-full w-full object-cover"
                productName={product?.name}
              />
            </div>
          </button>
        ))}
      </div>
    ) : null}
  </div>
);

const PcHubCommandGallery = ({
  images,
  product,
  activeIndex,
  setActiveIndex,
  swipeHandlers,
  prefersArabicCopy,
  onOpenZoom,
}: any) => {
  const hasMultipleImages = images.length > 1;
  const proofCards = Array.isArray(product?.decisionProofs)
    ? product.decisionProofs.slice(0, 3)
    : [];
  const factCards = Array.isArray(product?.commandFacts)
    ? product.commandFacts.slice(0, 4)
    : [];
  const tags = Array.isArray(product?.tags) ? product.tags.slice(0, 3) : [];
  const stageBadge =
    product?.decisionBadge ||
    (prefersArabicCopy ? "اختيار تقني أوضح" : "Clearer tech pick");
  const stageTitle =
    product?.decisionTitle ||
    product?.modelLabel ||
    (prefersArabicCopy ? "لقطة أقرب للمنتج" : "Closer product view");
  const stageDescription =
    product?.decisionDescription ||
    (prefersArabicCopy
      ? "صور المنتج الأساسية مع نقاط مختصرة تساعدك تفهم استخدامه المناسب قبل النزول لباقي التفاصيل."
      : "Core product imagery with concise decision cues before you scan the rest of the page.");
  const modelLabel =
    product?.modelLabel ||
    product?.category?.name ||
    (prefersArabicCopy ? "موديل معتمد" : "Verified model");
  const zoomLabel = prefersArabicCopy ? "تكبير الصورة" : "Zoom image";
  const previousLabel = prefersArabicCopy ? "الصورة السابقة" : "Previous image";
  const nextLabel = prefersArabicCopy ? "الصورة التالية" : "Next image";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_14rem]">
        <div
          className="group relative overflow-hidden rounded-[1.9rem] border border-[#dce4ef] bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fb_100%)] shadow-[0_30px_90px_-72px_rgba(15,23,42,0.34)] touch-pan-y"
          {...swipeHandlers}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,194,23,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.1),transparent_32%)]" />
          <div className="pointer-events-none absolute inset-x-4 top-4 h-px bg-gradient-to-r from-transparent via-[#111827]/16 to-transparent" />
          <div className="pointer-events-none absolute inset-y-6 end-5 w-px bg-gradient-to-b from-transparent via-[#f7b500]/30 to-transparent" />

          <OptimizedGalleryImage
            source={images[activeIndex]}
            alt={`${product?.name} command view`}
            fetchpriority="high"
            loading="eager"
            decoding="sync"
            mode="hero"
            responsiveSizes="(min-width: 1280px) 42vw, (min-width: 1024px) 48vw, 100vw"
            className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"
            productName={product?.name}
          />

          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#f4d067] bg-[#101828] px-3 py-1 text-[10px] font-black tracking-[0.22em] text-[#fff3bf] shadow-[0_10px_24px_-18px_rgba(15,23,42,0.7)]">
                {stageBadge}
              </span>
              <span className="inline-flex items-center rounded-full border border-white/70 bg-white/88 px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-[#334155] backdrop-blur-md">
                {modelLabel}
              </span>
            </div>
            {hasMultipleImages ? (
              <span className="inline-flex items-center rounded-full border border-white/70 bg-white/88 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-[#0f172a] backdrop-blur-md">
                {prefersArabicCopy
                  ? `${activeIndex + 1} / ${images.length} صور`
                  : `${activeIndex + 1} / ${images.length} views`}
              </span>
            ) : null}
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.06)_24%,rgba(15,23,42,0.78)_100%)] px-4 pb-4 pt-16 text-white sm:px-5 sm:pb-5">
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag: string) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full border border-white/16 bg-white/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] text-white/78 backdrop-blur-md"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h3 className="mt-3 max-w-[22rem] text-xl font-black leading-tight sm:text-[1.55rem]">
              {stageTitle}
            </h3>
            <p className="mt-2 max-w-[26rem] text-sm leading-6 text-white/84 sm:text-[0.95rem]">
              {stageDescription}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenZoom}
                className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-3.5 py-2 text-xs font-black text-white backdrop-blur-md transition-colors hover:bg-white/16"
                aria-label={zoomLabel}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" />
                  <path d="M11 8v6" />
                  <path d="M8 11h6" />
                </svg>
                <span>{prefersArabicCopy ? "شاهد أقرب" : "Zoom in"}</span>
              </button>
              {factCards[0] ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-[#f4d067]/40 bg-[#f7b500]/16 px-3.5 py-2 text-xs font-bold text-white">
                  <span className="text-white/62">{factCards[0].label}</span>
                  <span>{factCards[0].value}</span>
                </div>
              ) : null}
            </div>
          </div>

          {hasMultipleImages ? (
            <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-3">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveIndex((previous: number) =>
                    previous === 0 ? images.length - 1 : previous - 1,
                  );
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/86 text-[#0f172a] shadow-[0_18px_32px_-24px_rgba(15,23,42,0.65)] backdrop-blur-md transition-colors hover:bg-white"
                aria-label={previousLabel}
              >
                <svg
                  className="rtl:rotate-180"
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveIndex((previous: number) =>
                    previous === images.length - 1 ? 0 : previous + 1,
                  );
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/86 text-[#0f172a] shadow-[0_18px_32px_-24px_rgba(15,23,42,0.65)] backdrop-blur-md transition-colors hover:bg-white"
                aria-label={nextLabel}
              >
                <svg
                  className="rtl:rotate-180"
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>

        {proofCards.length ? (
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {proofCards.map((proof: any, proofIndex: number) => (
              <div
                key={`${proof?.title || "proof"}-${proofIndex}`}
                className="rounded-[1.45rem] border border-[#dce4ef] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fd_100%)] p-4 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.35)]"
              >
                <p className="text-[10px] font-black tracking-[0.24em] text-[#b57900]">
                  {proof?.label || (prefersArabicCopy ? "ميزة مهمة" : "Key proof")}
                </p>
                <h4 className="mt-2 text-sm font-black leading-6 text-[#0f172a]">
                  {proof?.title ||
                    (prefersArabicCopy
                      ? "تفصيلة تدعم قرار الشراء"
                      : "A detail that supports the buying decision")}
                </h4>
                <p className="mt-2 text-[13px] leading-6 text-[#475569]">
                  {proof?.description ||
                    (prefersArabicCopy
                      ? "رسالة مختصرة تربط الصورة بالاستخدام الحقيقي."
                      : "A short cue that connects the imagery to a real use case.")}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {factCards.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {factCards.map((fact: any, factIndex: number) => (
            <div
              key={`${fact?.label || "fact"}-${factIndex}`}
              className="rounded-[1.35rem] border border-[#dce4ef] bg-white px-4 py-3.5 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.34)]"
            >
              <p className="text-[10px] font-black tracking-[0.22em] text-[#64748b]">
                {fact?.label || (prefersArabicCopy ? "تفصيلة" : "Detail")}
              </p>
              <p className="mt-2 text-sm font-black leading-6 text-[#0f172a]">
                {fact?.value ||
                  (prefersArabicCopy ? "قيمة موضحة" : "Clear value")}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {hasMultipleImages ? (
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {images.map((img: string, index: number) => (
            <button
              key={index}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`group shrink-0 overflow-hidden rounded-[1.15rem] border bg-white transition-all duration-300 ${
                activeIndex === index
                  ? "border-[#f4d067] shadow-[0_18px_36px_-26px_rgba(245,181,0,0.52)]"
                  : "border-[#dce4ef] hover:border-[#f4d067]/70"
              }`}
              aria-label={
                prefersArabicCopy
                  ? `الانتقال إلى الصورة ${index + 1}`
                  : `Go to image ${index + 1}`
              }
            >
              <div className="flex items-center gap-3 p-2.5 pe-3">
                <div className="aspect-[4/5] w-[4.4rem] overflow-hidden rounded-[0.95rem] bg-[#f4f7fb]">
                  <OptimizedGalleryImage
                    source={img}
                    alt=""
                    loading="lazy"
                    fetchpriority="low"
                    decoding="async"
                    mode="thumb"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    productName={product?.name}
                  />
                </div>
                <div className="min-w-0 text-start">
                  <p className="text-[10px] font-black tracking-[0.22em] text-[#94a3b8]">
                    {prefersArabicCopy ? `لقطة ${index + 1}` : `View ${index + 1}`}
                  </p>
                  <p className="mt-1 max-w-[9rem] truncate text-sm font-bold text-[#0f172a]">
                    {index === activeIndex
                      ? prefersArabicCopy
                        ? "الزاوية المعروضة الآن"
                        : "Current angle"
                      : prefersArabicCopy
                        ? "بدّل إلى هذه الزاوية"
                        : "Switch to this angle"}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const GalleryZoomDialog = ({
  open,
  onOpenChange,
  images,
  product,
  activeIndex,
  setActiveIndex,
  prefersArabicCopy,
}: any) => {
  if (!images?.length) {
    return null;
  }

  const closeLabel = prefersArabicCopy ? "\u0625\u063a\u0644\u0627\u0642" : "Close";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-[#3f2f35]/35 backdrop-blur-sm data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0" />
        <DialogPrimitive.Popup
          className="fixed left-0 top-0 z-50 h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-0 bg-[linear-gradient(180deg,#fffdfa_0%,#f8efe8_100%)] p-0 text-[#3f2f35] shadow-none sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[94vh] sm:w-full sm:max-w-[min(96vw,76rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.5rem] sm:border sm:border-[#ead8cf] sm:shadow-[0_40px_120px_-50px_rgba(79,59,66,0.45)]"
          dir={prefersArabicCopy ? "rtl" : "ltr"}
        >
          <DialogPrimitive.Title className="sr-only">
            {prefersArabicCopy ? "تكبير صور المنتج" : "Product image zoom"}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            className="absolute end-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ead8cf] bg-white/92 text-[#4f3b42] shadow-[0_18px_28px_-18px_rgba(79,59,66,0.5)] transition-colors hover:bg-white hover:text-[#d86b55]"
            aria-label={closeLabel}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </DialogPrimitive.Close>

        <div className="flex h-full flex-col gap-0 sm:grid sm:h-auto sm:gap-4 sm:p-4">
          <div className="flex items-center justify-between gap-3 px-4 pt-5 pb-3 pe-14 sm:px-0 sm:pt-0 sm:pb-0 sm:pe-10">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[#3f2f35]">
                {product?.name}
              </p>
              <p className="text-xs font-semibold text-[#8b6b69]">
                {prefersArabicCopy
                  ? `الصورة ${activeIndex + 1} من ${images.length}`
                  : `Image ${activeIndex + 1} of ${images.length}`}
              </p>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden bg-[#fffaf7] sm:rounded-[1.45rem] sm:ring-1 sm:ring-[#ead8cf]">
            <OptimizedGalleryImage
              source={images[activeIndex]}
              alt={`${product?.name} zoomed view`}
              loading="eager"
              fetchpriority="high"
              decoding="sync"
              mode="hero"
              responsiveSizes="100vw"
              className="h-full max-h-none w-full object-contain sm:max-h-[72vh]"
              productName={product?.name}
            />

            {images.length > 1 ? (
              <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-3">
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((p: number) =>
                      p === 0 ? images.length - 1 : p - 1,
                    )
                  }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/92 text-[#4f3b42] shadow-[0_18px_28px_-18px_rgba(79,59,66,0.5)] transition-colors hover:bg-white hover:text-[#d86b55] sm:h-10 sm:w-10"
                  aria-label={prefersArabicCopy ? "الصورة السابقة" : "Previous image"}
                >
                  <svg className="rtl:rotate-180" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((p: number) =>
                      p === images.length - 1 ? 0 : p + 1,
                    )
                  }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/92 text-[#4f3b42] shadow-[0_18px_28px_-18px_rgba(79,59,66,0.5)] transition-colors hover:bg-white hover:text-[#d86b55] sm:h-10 sm:w-10"
                  aria-label={prefersArabicCopy ? "الصورة التالية" : "Next image"}
                >
                  <svg className="rtl:rotate-180" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
            ) : null}
          </div>

          {images.length > 1 ? (
            <div className="border-t border-[#ead8cf] px-4 py-3 sm:border-t-0 sm:px-0 sm:py-0">
              <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img: string, i: number) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={`shrink-0 overflow-hidden rounded-[0.95rem] ring-1 transition-all duration-300 ${
                    activeIndex === i
                      ? "ring-[#d86b55] shadow-[0_12px_24px_-18px_rgba(216,107,85,0.55)]"
                      : "ring-[#ead8cf] hover:ring-[#d86b55]/55"
                  }`}
                  aria-label={
                    prefersArabicCopy
                      ? `الانتقال إلى الصورة ${i + 1}`
                      : `Go to image ${i + 1}`
                  }
                >
                  <div className="aspect-[4/5] w-[4.5rem] bg-white sm:w-[5rem]">
                    <OptimizedGalleryImage
                      source={img}
                      alt=""
                      loading="lazy"
                      fetchpriority="low"
                      decoding="async"
                      mode="thumb"
                      className="h-full w-full object-cover"
                      productName={product?.name}
                    />
                  </div>
                </button>
              ))}
              </div>
            </div>
          ) : null}
        </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

const GridGallery = ({ images, product }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {images.map((img: string, i: number) => (
      <div
        key={i}
        className={`rounded-[var(--radius)] overflow-hidden bg-muted group ${i === 0 && images.length > 1 ? "md:col-span-2 aspect-square md:aspect-[21/9]" : "aspect-square lg:aspect-[4/5]"}`}
      >
        <OptimizedGalleryImage
          source={img}
          alt={`${product?.name} view ${i + 1}`}
          loading={i === 0 ? "eager" : "lazy"}
          fetchpriority={i === 0 ? "high" : "auto"}
          decoding={i === 0 ? "sync" : "async"}
          width="600"
          height="600"
          mode={i === 0 ? "hero" : "detail"}
          responsiveSizes={i === 0 ? "100vw" : "(min-width: 768px) 50vw, 100vw"}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          productName={product?.name}
        />
      </div>
    ))}
  </div>
);

const MasonryGallery = ({ images, product }: any) => (
  <div className="columns-2 gap-4 space-y-4">
    {images.map((img: string, i: number) => (
      <div
        key={i}
        className={`break-inside-avoid rounded-[var(--radius)] overflow-hidden bg-muted group ${
          i % 3 === 0
            ? "aspect-[3/4]"
            : i % 3 === 1
              ? "aspect-square"
              : "aspect-[4/5]"
        }`}
      >
        <OptimizedGalleryImage
          source={img}
          alt={`${product?.name} view ${i + 1}`}
          loading={i === 0 ? "eager" : "lazy"}
          fetchpriority={i === 0 ? "high" : "auto"}
          decoding={i === 0 ? "sync" : "async"}
          width="600"
          height="750"
          mode={i === 0 ? "hero" : "detail"}
          responsiveSizes="(min-width: 768px) 50vw, 100vw"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          productName={product?.name}
        />
      </div>
    ))}
  </div>
);

const StackedGallery = ({ images, product }: any) => (
  <div className="grid gap-4">
    {images.map((img: string, i: number) => (
      <div
        key={i}
        className="aspect-square lg:aspect-[5/4] overflow-hidden rounded-[var(--radius)] bg-muted group"
      >
        <OptimizedGalleryImage
          source={img}
          alt={`${product?.name} view ${i + 1}`}
          loading={i === 0 ? "eager" : "lazy"}
          fetchpriority={i === 0 ? "high" : "auto"}
          decoding={i === 0 ? "sync" : "async"}
          width="600"
          height="480"
          mode={i === 0 ? "hero" : "detail"}
          responsiveSizes="100vw"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          productName={product?.name}
        />
      </div>
    ))}
  </div>
);

const NeonGallery = ({
  images,
  product,
  activeIndex,
  setActiveIndex,
  swipeHandlers,
  prefersArabicCopy,
}: any) => (
  <div className="space-y-6">
    {/* Main Viewport with Cyber Borders */}
    <div
      className="relative aspect-square lg:aspect-[4/5] rounded-3xl overflow-hidden group bg-black/40 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] touch-pan-y"
      {...swipeHandlers}
    >
      {/* Animated Border Glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

      <OptimizedGalleryImage
        source={images[activeIndex]}
        alt={`${product?.name} main view`}
        loading="eager"
        fetchpriority="high"
        decoding="sync"
        mode="hero"
        responsiveSizes="(min-width: 1024px) 50vw, 100vw"
        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
        productName={product?.name}
      />

      {/* Floating Navigation Overlay */}
      <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2 px-6 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex gap-4 pointer-events-auto">
          <button
            onClick={() =>
              setActiveIndex((p: number) =>
                p === 0 ? images.length - 1 : p - 1,
              )
            }
            className="text-white hover:text-primary transition-colors"
            aria-label={prefersArabicCopy ? "السابق" : "Previous"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <span className="text-white/40 text-xs font-black self-center tracking-widest">
            {activeIndex + 1} / {images.length}
          </span>
          <button
            onClick={() =>
              setActiveIndex((p: number) =>
                p === images.length - 1 ? 0 : p + 1,
              )
            }
            className="text-white hover:text-primary transition-colors"
            aria-label={prefersArabicCopy ? "التالي" : "Next"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* NFT Badge */}
      <div className="absolute top-6 right-6">
        <div className="bg-primary/90 text-primary-foreground px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_hsl(var(--primary)/0.5)]">
          Rare Edition
        </div>
      </div>
    </div>

    {/* Thumbnails with Neon Focus */}
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
      {images.map((img: string, i: number) => (
        <button
          key={i}
          onClick={() => setActiveIndex(i)}
          className={`
            w-20 h-20 lg:w-24 lg:h-24 shrink-0 rounded-2xl overflow-hidden
            border-2 transition-all duration-300 relative
            ${
              activeIndex === i
                ? "border-primary ring-4 ring-primary/20 scale-105"
                : "border-white/5 hover:border-primary/40"
            }
          `}
        >
          <OptimizedGalleryImage
            source={img}
            alt=""
            loading="lazy"
            fetchpriority="low"
            decoding="async"
            mode="thumb"
            className="w-full h-full object-cover"
            productName={product?.name}
          />
          {activeIndex !== i && (
            <div className="absolute inset-0 bg-black/40" />
          )}
        </button>
      ))}
    </div>
  </div>
);

const CyberShowcaseGallery = ({
  images,
  product,
  activeIndex,
  setActiveIndex,
  swipeHandlers,
  prefersArabicCopy,
}: any) => {
  const previewBadge = prefersArabicCopy ? "اختيار Cyber" : "Cyber Select";
  const categoryLabel =
    product?.category?.name ||
    (prefersArabicCopy ? "تجميعة سايبر" : "Cyber Loadout");
  const frameLabel = prefersArabicCopy
    ? `لقطة ${activeIndex + 1} من ${images.length}`
    : `Frame ${activeIndex + 1} / ${images.length}`;
  const mediaLabel = prefersArabicCopy ? "معرض المنتج" : "Product Media";
  const previousLabel = prefersArabicCopy ? "السابق" : "Previous";
  const nextLabel = prefersArabicCopy ? "التالي" : "Next";

  return (
    <div className="space-y-5">
      <div
        className="group relative isolate aspect-square overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.22),rgba(5,8,16,0.98)_58%)] shadow-[0_40px_130px_-90px_rgba(34,211,238,0.7)] touch-pan-y lg:aspect-[4/5]"
        {...swipeHandlers}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),transparent_34%,transparent_66%,rgba(59,130,246,0.16))]" />
        <div className="pointer-events-none absolute -top-10 start-8 h-28 w-28 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 end-6 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />

        <OptimizedGalleryImage
          source={images[activeIndex]}
          alt={`${product?.name} main view`}
          loading="eager"
          fetchpriority="high"
          decoding="sync"
          mode="hero"
          responsiveSizes="(min-width: 1024px) 50vw, 100vw"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          productName={product?.name}
          categoryLabel={categoryLabel}
          fallbackVariant="cyber"
          prefersArabicCopy={prefersArabicCopy}
        />

        <div className="absolute start-5 top-5 flex flex-wrap gap-2">
          <div className="inline-flex items-center rounded-full border border-cyan-300/30 bg-slate-950/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.18)] backdrop-blur-md">
            {previewBadge}
          </div>
          <div className="inline-flex items-center rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/75 backdrop-blur-md">
            {categoryLabel}
          </div>
        </div>

        {images.length > 1 ? (
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-[linear-gradient(180deg,transparent,rgba(3,7,18,0.86))] p-5">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200/75">
                {mediaLabel}
              </p>
              <p className="text-sm font-semibold text-white/90">{frameLabel}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setActiveIndex((p: number) => (p === 0 ? images.length - 1 : p - 1))
                }
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition-colors hover:border-cyan-300/45 hover:text-cyan-100"
                aria-label={previousLabel}
              >
                <svg
                  className="rtl:rotate-180"
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                onClick={() =>
                  setActiveIndex((p: number) =>
                    p === images.length - 1 ? 0 : p + 1,
                  )
                }
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition-colors hover:border-cyan-300/45 hover:text-cyan-100"
                aria-label={nextLabel}
              >
                <svg
                  className="rtl:rotate-180"
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-3 md:grid-cols-5">
          {images.map((img: string, i: number) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`group relative overflow-hidden rounded-[1.2rem] border transition-all duration-300 ${
                activeIndex === i
                  ? "border-cyan-300/60 shadow-[0_0_40px_rgba(34,211,238,0.22)]"
                  : "border-white/10 hover:border-cyan-300/30"
              }`}
              aria-label={
                prefersArabicCopy
                  ? `الانتقال إلى الصورة ${i + 1}`
                  : `Go to image ${i + 1}`
              }
            >
              <div className="absolute start-2 top-2 z-10 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full border border-white/10 bg-slate-950/75 px-1.5 text-[10px] font-black text-white/80 backdrop-blur-md">
                {i + 1}
              </div>
              <div className="aspect-square bg-black/50">
                <OptimizedGalleryImage
                  source={img}
                  alt=""
                  loading="lazy"
                  fetchpriority="low"
                  decoding="async"
                  mode="thumb"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  productName={product?.name}
                  categoryLabel={categoryLabel}
                  fallbackVariant="cyber"
                  prefersArabicCopy={prefersArabicCopy}
                />
              </div>
              {activeIndex !== i ? (
                <div className="absolute inset-0 bg-slate-950/35 transition-colors group-hover:bg-slate-950/15" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const ZenGallery = ({
  images,
  product,
  activeIndex,
  setActiveIndex,
  swipeHandlers,
}: any) => (
  <div className="space-y-4">
    {/* Main Image */}
    <div
      className="relative aspect-square lg:aspect-[4/5] rounded-[var(--radius)] overflow-hidden bg-[#f1f3ee] group touch-pan-y"
      {...swipeHandlers}
    >
      <OptimizedGalleryImage
        source={images[activeIndex]}
        alt={`${product?.name} main view`}
        loading="eager"
        fetchpriority="high"
        decoding="sync"
        mode="hero"
        responsiveSizes="(min-width: 1024px) 50vw, 100vw"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        productName={product?.name}
      />
      {/* Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={() =>
              setActiveIndex((p: number) =>
                p === 0 ? images.length - 1 : p - 1,
              )
            }
            className="absolute start-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#1a3328] shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-[#88a876] hover:text-white"
          >
            <svg
              className="rtl:rotate-180"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() =>
              setActiveIndex((p: number) =>
                p === images.length - 1 ? 0 : p + 1,
              )
            }
            className="absolute end-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#1a3328] shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-[#88a876] hover:text-white"
          >
            <svg
              className="rtl:rotate-180"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </>
      )}
    </div>

    {/* Thumbnails Below */}
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
      {images.map((img: string, i: number) => (
        <button
          key={i}
          onClick={() => setActiveIndex(i)}
          className={`
            w-20 h-20 lg:w-24 lg:h-24 shrink-0 rounded-xl overflow-hidden
            border-2 transition-all duration-300
            ${
              activeIndex === i
                ? "border-[#88a876] ring-2 ring-[#88a876]/20"
                : "border-[#e9ebe5] hover:border-[#88a876]/50"
            }
          `}
        >
          <OptimizedGalleryImage
            source={img}
            alt=""
            loading="lazy"
            fetchpriority="low"
            decoding="async"
            mode="thumb"
            className="w-full h-full object-cover"
            productName={product?.name}
          />
        </button>
      ))}
    </div>
  </div>
);

const BoutiquePortraitStageGallery = ({
  images,
  product,
  activeIndex,
  setActiveIndex,
  swipeHandlers,
  prefersArabicCopy,
  onOpenZoom,
}: any) => {
  const categoryLabel =
    typeof product?.category?.name === "string" && product.category.name.trim()
      ? product.category.name.trim()
      : prefersArabicCopy
        ? "مختارات البوتيك"
        : "Boutique edit";
  const editorialBadge =
    typeof product?.editorialBadge === "string" && product.editorialBadge.trim()
      ? product.editorialBadge.trim()
      : prefersArabicCopy
        ? "اختيار روزا"
        : "Roza select";
  const editorialNote =
    typeof product?.editorialNote === "string" && product.editorialNote.trim()
      ? product.editorialNote.trim()
      : prefersArabicCopy
        ? "لقطة أقرب للقماش والحركة حتى يبقى القرار هادئًا وواضحًا قبل الشراء."
        : "A calmer portrait stage that keeps fabric and movement visible before checkout.";

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#ead9d2] bg-[radial-gradient(circle_at_74%_22%,rgba(220,178,191,0.32),transparent_18%),linear-gradient(180deg,#fffdfb_0%,#fff7f2_100%)] p-4 shadow-[0_34px_96px_-72px_rgba(86,58,58,0.18)] md:p-5">
        <div className="pointer-events-none absolute -right-10 top-10 h-28 w-28 rounded-full bg-[#efc9d4]/45 blur-3xl" />
        <div className="pointer-events-none absolute bottom-4 left-10 h-24 w-24 rounded-full bg-[#f5e6de] blur-3xl" />
        <div className="pointer-events-none absolute right-6 top-6 h-3 w-3 rounded-full border border-[#d7b5bf]/70 bg-white/70" />
        <div className="pointer-events-none absolute right-16 top-14 h-2.5 w-2.5 rounded-full border border-[#e7cdd2]/70 bg-white/80" />

        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[5.25rem_minmax(0,1fr)] lg:gap-5">
          {images.length > 1 ? (
            <div className="order-2 flex gap-2 overflow-x-auto pb-1 lg:order-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {images.map((img: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`group relative h-20 min-w-[4.8rem] overflow-hidden rounded-[1.15rem] border transition-all duration-300 lg:h-[5.4rem] lg:min-w-0 ${
                    activeIndex === i
                      ? "border-[#c891a0] bg-white shadow-[0_18px_36px_-24px_rgba(122,77,89,0.22)]"
                      : "border-[#eadad4] bg-white/74 hover:border-[#d7b0bb]"
                  }`}
                  aria-label={
                    prefersArabicCopy
                      ? `الانتقال إلى الصورة ${i + 1}`
                      : `Go to image ${i + 1}`
                  }
                >
                  <OptimizedGalleryImage
                    source={img}
                    alt=""
                    loading="lazy"
                    fetchpriority="low"
                    decoding="async"
                    mode="thumb"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    productName={product?.name}
                  />
                  {activeIndex !== i ? (
                    <div className="absolute inset-0 bg-white/22 transition-colors group-hover:bg-white/10" />
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}

          <div className="order-1 space-y-3 lg:order-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-[#e6c7d0] bg-white/90 px-3 py-1 text-[10px] font-black tracking-[0.22em] text-[#9c6274] shadow-[0_14px_28px_-24px_rgba(122,77,89,0.3)]">
                  {editorialBadge}
                </span>
                <span className="inline-flex rounded-full border border-[#efe1da] bg-[#fffaf7] px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-[#8e6d68]">
                  {categoryLabel}
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenZoom}
                className="inline-flex items-center gap-2 rounded-full border border-[#ead9d2] bg-white/90 px-4 py-2 text-xs font-black text-[#6d4b4b] shadow-[0_18px_34px_-26px_rgba(109,75,75,0.25)] transition-colors hover:border-[#d7b0bb] hover:bg-white"
                aria-label={prefersArabicCopy ? "تكبير الصور" : "Zoom gallery"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" />
                  <path d="M11 8v6" />
                  <path d="M8 11h6" />
                </svg>
                <span>{prefersArabicCopy ? "عرض أقرب" : "Zoom"}</span>
              </button>
            </div>

            <div
              className="group relative overflow-hidden rounded-[1.8rem] border border-white/80 bg-white/78 shadow-[0_30px_82px_-62px_rgba(86,58,58,0.34)] touch-pan-y"
              {...swipeHandlers}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.82),rgba(255,248,244,0.38)_38%,transparent_62%)]" />
              <OptimizedGalleryImage
                source={images[activeIndex]}
                alt={`${product?.name} portrait view`}
                fetchpriority="high"
                loading="eager"
                decoding="sync"
                mode="hero"
                responsiveSizes="(min-width: 1024px) 50vw, 100vw"
                className="aspect-[4/5] w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
                productName={product?.name}
              />
              <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-[1.3rem] border border-white/80 bg-white/86 px-4 py-3 backdrop-blur-md shadow-[0_18px_36px_-28px_rgba(86,58,58,0.22)]">
                <p className="text-[10px] font-black tracking-[0.2em] text-[#aa6e7e]">
                  {prefersArabicCopy ? "لقطة الواجهة" : "Front portrait"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#654c4c]">
                  {editorialNote}
                </p>
              </div>

              {images.length > 1 ? (
                <div className="absolute inset-x-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-between md:flex">
                  <button
                    onClick={() =>
                      setActiveIndex((p: number) =>
                        p === 0 ? images.length - 1 : p - 1,
                      )
                    }
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#efe4df] bg-white/94 text-[#6e5757] shadow-[0_16px_34px_-24px_rgba(86,58,58,0.28)] transition-all hover:-translate-y-0.5 hover:border-[#9c6274] hover:text-[#3f2f33]"
                    aria-label={prefersArabicCopy ? "الصورة السابقة" : "Previous image"}
                  >
                    <svg
                      className="rtl:rotate-180"
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={() =>
                      setActiveIndex((p: number) =>
                        p === images.length - 1 ? 0 : p + 1,
                      )
                    }
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#efe4df] bg-white/94 text-[#6e5757] shadow-[0_16px_34px_-24px_rgba(86,58,58,0.28)] transition-all hover:-translate-y-0.5 hover:border-[#9c6274] hover:text-[#3f2f33]"
                    aria-label={prefersArabicCopy ? "الصورة التالية" : "Next image"}
                  >
                    <svg
                      className="rtl:rotate-180"
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AtelierEditorialStageGallery = ({
  images,
  product,
  activeIndex,
  setActiveIndex,
  swipeHandlers,
  prefersArabicCopy,
  onOpenZoom,
  summaryPrice,
  summaryOriginalPrice,
  summaryDiscount,
  summaryRating,
  summaryReviews,
  onJumpToBuybox,
}: any) => {
  const categoryLabel =
    typeof product?.category?.name === "string" && product.category.name.trim()
      ? product.category.name.trim()
      : prefersArabicCopy
        ? "تحرير هادئ"
        : "Editorial selection";
  const editorialBadge =
    typeof product?.editorialBadge === "string" && product.editorialBadge.trim()
      ? product.editorialBadge.trim()
      : prefersArabicCopy
        ? "تحرير روزا"
        : "Roza editorial";
  const editorialNote =
    typeof product?.editorialNote === "string" && product.editorialNote.trim()
      ? product.editorialNote.trim()
      : prefersArabicCopy
        ? "الصورة تبقى في الواجهة، والتفاصيل تنسحب للخلف حتى يبقى قرار الشراء متعلقًا بالقماش والقصّة."
        : "The image stays in front while the details step back so the decision stays focused on fabric and cut.";
  const frameLabel = prefersArabicCopy
    ? `لقطة ${activeIndex + 1} من ${images.length}`
    : `Frame ${activeIndex + 1} of ${images.length}`;

  return (
    <div className="space-y-5">
      <div className="space-y-4 border-b border-[#eadfd9] pb-5 lg:hidden">
        <div className="space-y-1.5">
          <p className="text-[10px] font-black tracking-[0.28em] text-[#9c6274]">
            {editorialBadge}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-[#8a706b]">
            <span>{categoryLabel}</span>
            {summaryRating ? (
              <>
                <span className="text-[#d6c2bc]">/</span>
                <span>
                  {prefersArabicCopy
                    ? `★ ${summaryRating.toFixed(1)} من ${summaryReviews} تقييم`
                    : `★ ${summaryRating.toFixed(1)} from ${summaryReviews} reviews`}
                </span>
              </>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="font-heading text-[2rem] font-black leading-[1.02] tracking-tight text-[#3f2f33]">
            {product?.name}
          </h1>
          <div className="flex flex-wrap items-end gap-3">
            <span className="text-[2rem] font-black text-[#3f2f33]">
              {summaryPrice}
            </span>
            {summaryOriginalPrice ? (
              <span className="text-sm font-bold text-[#9d857f] line-through decoration-[#dfc4bd]">
                {summaryOriginalPrice}
              </span>
            ) : null}
            {summaryDiscount && summaryDiscount > 0 ? (
              <span className="text-[11px] font-black tracking-[0.18em] text-[#9c6274]">
                {prefersArabicCopy ? `خصم ${summaryDiscount}%` : `${summaryDiscount}% off`}
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-7 text-[#6d5653]">{editorialNote}</p>
        </div>

        <button
          type="button"
          onClick={onJumpToBuybox}
          className="inline-flex items-center gap-2 self-start text-xs font-black tracking-[0.16em] text-[#6e5757] transition-colors hover:text-[#3f2f33]"
        >
          <span>{prefersArabicCopy ? "شاهدي المقاس وخيارات الشراء" : "View size & buying options"}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="rtl:rotate-180"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eadfd9] pb-4 lg:hidden">
        <div className="space-y-1.5">
          <p className="text-[10px] font-black tracking-[0.28em] text-[#9c6274]">
            {editorialBadge}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#8a706b]">
            <span>{categoryLabel}</span>
            {images.length > 1 ? (
              <>
                <span className="text-[#d6c2bc]">/</span>
                <span>{frameLabel}</span>
              </>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenZoom}
          className="inline-flex items-center gap-2 font-sans text-[0.8rem] font-black tracking-[0.04em] text-[#5c4747] transition-colors hover:text-[#3f2f33]"
          aria-label={prefersArabicCopy ? "تكبير الصور" : "Zoom gallery"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
            <path d="M11 8v6" />
            <path d="M8 11h6" />
          </svg>
          <span>{prefersArabicCopy ? "عرض أقرب" : "Closer view"}</span>
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_4.8rem] lg:items-start">
        <div className="space-y-4">
          <div className="relative" {...swipeHandlers}>
            <div className="pointer-events-none absolute inset-x-[8%] top-8 bottom-8 bg-[radial-gradient(circle_at_44%_24%,rgba(234,198,208,0.4),transparent_42%),radial-gradient(circle_at_72%_68%,rgba(249,233,224,0.95),transparent_52%)] blur-3xl" />
            <div className="pointer-events-none absolute inset-y-6 left-0 w-px bg-[#eadfd9]" />
            <div className="pointer-events-none absolute inset-y-6 right-0 w-px bg-[#eadfd9]" />
            <button
              type="button"
              onClick={onOpenZoom}
              className="absolute left-4 top-4 z-10 hidden items-center gap-2 rounded-full border border-[#dbc5be] bg-white/96 px-3.5 py-2 text-[0.8rem] font-black tracking-[0.04em] text-[#5c4747] shadow-[0_16px_34px_-24px_rgba(86,58,58,0.28)] transition-all hover:-translate-y-0.5 hover:border-[#9c6274] hover:bg-[#fff8f5] hover:text-[#3f2f33] lg:inline-flex"
              aria-label={prefersArabicCopy ? "تكبير الصور" : "Zoom gallery"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
                <path d="M11 8v6" />
                <path d="M8 11h6" />
              </svg>
              <span>{prefersArabicCopy ? "عرض أقرب" : "Closer view"}</span>
            </button>
            <OptimizedGalleryImage
              source={images[activeIndex]}
              alt={`${product?.name} editorial frame`}
              fetchpriority="high"
              loading="eager"
              decoding="sync"
              mode="hero"
              responsiveSizes="(min-width: 1024px) 54vw, 100vw"
              className="relative aspect-[4/5] w-full object-cover object-center"
              productName={product?.name}
            />
          </div>

        </div>

        {images.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {images.map((img: string, i: number) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`group relative h-20 min-w-[4.75rem] overflow-hidden border-b-2 transition-all duration-300 lg:h-[5.25rem] lg:min-w-0 ${
                  activeIndex === i
                    ? "border-[#b57a89] opacity-100"
                    : "border-transparent opacity-65 hover:opacity-100"
                }`}
                aria-label={
                  prefersArabicCopy
                    ? `الانتقال إلى الصورة ${i + 1}`
                    : `Go to image ${i + 1}`
                }
              >
                <OptimizedGalleryImage
                  source={img}
                  alt=""
                  loading="lazy"
                  fetchpriority="low"
                  decoding="async"
                  mode="thumb"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  productName={product?.name}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const FashionCounterStageGallery = ({
  images,
  product,
  activeIndex,
  setActiveIndex,
  swipeHandlers,
  prefersArabicCopy,
  onOpenZoom,
}: any) => (
  <div className="space-y-3">
    <div
      className="group relative overflow-hidden rounded-[1.55rem] border border-[#eddcd4] bg-[linear-gradient(180deg,#fffefd,#fff4ee)] shadow-[0_24px_72px_-58px_rgba(90,54,57,0.18)] touch-pan-y"
      {...swipeHandlers}
    >
      <OptimizedGalleryImage
        source={images[activeIndex]}
        alt={`${product?.name} fashion counter view`}
        fetchpriority="high"
        loading="eager"
        decoding="sync"
        mode="hero"
        responsiveSizes="(min-width: 1024px) 50vw, 100vw"
        className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
        productName={product?.name}
      />
      <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3">
        <span className="inline-flex rounded-full border border-white/45 bg-white/88 px-3 py-1 text-[10px] font-black tracking-[0.2em] text-[#b86b5b] backdrop-blur">
          {prefersArabicCopy ? 'صورة المنتج' : 'Product shot'}
        </span>
        <button
          type="button"
          onClick={onOpenZoom}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/45 bg-white/88 text-[#5a3641] shadow-[0_16px_34px_-24px_rgba(90,54,65,0.28)] backdrop-blur transition-colors hover:bg-white"
          aria-label={prefersArabicCopy ? 'تكبير الصورة' : 'Zoom image'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
            <path d="M11 8v6" />
            <path d="M8 11h6" />
          </svg>
        </button>
      </div>
      {images.length > 1 ? (
        <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-full border border-white/45 bg-white/92 px-4 py-2 text-xs font-black text-[#4c2d39] shadow-[0_18px_34px_-22px_rgba(76,45,57,0.24)] backdrop-blur">
          <span>{prefersArabicCopy ? `صورة ${activeIndex + 1} من ${images.length}` : `${activeIndex + 1}/${images.length}`}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setActiveIndex((p: number) => (p === 0 ? images.length - 1 : p - 1));
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#f1ddd4] bg-white text-[#5a3641] transition-colors hover:border-[#d86b55] hover:text-[#d86b55]"
              aria-label={prefersArabicCopy ? 'الصورة السابقة' : 'Previous image'}
            >
              <svg className="rtl:rotate-180" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setActiveIndex((p: number) => (p === images.length - 1 ? 0 : p + 1));
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#f1ddd4] bg-white text-[#5a3641] transition-colors hover:border-[#d86b55] hover:text-[#d86b55]"
              aria-label={prefersArabicCopy ? 'الصورة التالية' : 'Next image'}
            >
              <svg className="rtl:rotate-180" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}
    </div>

    {images.length > 1 ? (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((img: string, i: number) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`shrink-0 overflow-hidden rounded-[0.95rem] border transition-all duration-300 ${
              activeIndex === i
                ? 'border-[#d86b55] shadow-[0_14px_30px_-22px_rgba(216,107,85,0.4)]'
                : 'border-[#eddcd4] hover:border-[#dcaea5]'
            }`}
            aria-label={
              prefersArabicCopy
                ? `الانتقال إلى الصورة ${i + 1}`
                : `Go to image ${i + 1}`
            }
          >
            <div className="aspect-[4/5] w-[4.8rem] bg-white sm:w-[5.3rem]">
              <OptimizedGalleryImage
                source={img}
                alt=""
                loading="lazy"
                fetchpriority="low"
                decoding="async"
                mode="thumb"
                className="h-full w-full object-cover"
                productName={product?.name}
              />
            </div>
          </button>
        ))}
      </div>
    ) : null}
  </div>
);

type ProductGalleryVariant =
  | "standard"
  | "grid"
  | "stacked"
  | "masonry"
  | "neon-showcase"
  | "mirror-carousel"
  | "fashion-counter-stage"
  | "atelier-editorial-stage"
  | "boutique-portrait-stage"
  | "command-stage"
  | "elessi-bag-gallery"
  | "elessi-showroom"
  | "elessi-organic-gallery"
  | "elessi-mosaic-stage"
  | "elessi-detail-column"
  | "elessi-digital-gallery"
  | "elessi-plant-gallery"
  | "elessi-bike-gallery";

const ElessiGalleryFrame: React.FC<{
  children: React.ReactNode;
  zoomLabel?: string;
  onZoom?: () => void;
  shellClassName?: string;
  toolbarClassName?: string;
  buttonClassName?: string;
  overlayToolbarOnMobile?: boolean;
}> = ({
  children,
  zoomLabel,
  onZoom,
  shellClassName = "bg-white p-0",
  toolbarClassName = "mb-3 flex items-center justify-end",
  buttonClassName = "inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-black text-foreground transition-colors hover:border-primary/35 hover:text-primary",
  overlayToolbarOnMobile = false,
}) => (
  <div className={`${overlayToolbarOnMobile ? "relative" : ""} ${shellClassName}`}>
    {onZoom && zoomLabel ? (
      <div
        className={
          overlayToolbarOnMobile
            ? `pointer-events-none absolute inset-x-3 top-3 z-10 flex justify-end sm:pointer-events-auto sm:static sm:inset-auto ${toolbarClassName}`
            : toolbarClassName
        }
      >
        <button type="button" onClick={onZoom} className={buttonClassName}>
          {zoomLabel}
        </button>
      </div>
    ) : null}
    {children}
  </div>
);

const PRODUCT_GALLERY_SECTION_FAMILY = "ProductGallery";

const normalizeProductGalleryVariant = (
  rawVariant: unknown,
): ProductGalleryVariant => {
  return resolveSectionVariant<ProductGalleryVariant>(
    PRODUCT_GALLERY_SECTION_FAMILY,
    rawVariant,
    "standard",
  );
};

const ProductGallery: React.FC<ProductGalleryProps> = ({ section }) => {
  const { id } = useParams<{ id: string }>();
  const { theme } = useStorefrontTheme();
  const { settings: storefrontSettings } = useStorefrontSettings();
  const selectionProductId = usePdpSelectionStore((state) => state.selection?.productId);
  const selectedVariantId = usePdpSelectionStore((state) => state.selection?.variantId);
  const selectionAttributes = usePdpSelectionStore(
    (state) => state.selection?.attributes,
    (a, b) => {
      if (a === b) return true;
      if (!a || !b) return false;
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);
      if (aKeys.length !== bKeys.length) return false;
      return aKeys.every((k) => a[k] === b[k]);
    },
  );
  const isZenOrganic = theme.id === "zen-organic";
  const isMenShoesEg = theme.id === "men-shoes-eg";
  const isWomenFashionEg = theme.id === "women-fashion-eg";
  const prefersArabicCopy = theme.direction === "rtl";
  const variant = normalizeProductGalleryVariant(section?.variant);
  const isGracefulGallery = theme.id === "soft-graceful";
  const { product, isLoading } = useProduct(id);
  const galleryDiscountPct =
    product &&
    typeof product.comparePrice === "number" &&
    typeof product.price === "number" &&
    product.comparePrice > product.price
      ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
      : 0;
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);
  const hasWishlistItem = useWishlistStore((state) => state.hasItem);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCompared, setIsCompared] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const selectedVariant = useMemo(() => {
    if (!product?.productVariants?.length || selectionProductId !== product.id) {
      return null;
    }

    if (selectedVariantId) {
      return (
        product.productVariants.find((variantOption) => variantOption.id === selectedVariantId) ||
        null
      );
    }

    const selectionEntries = Object.entries(selectionAttributes || {});
    if (!selectionEntries.length) {
      return null;
    }

    return (
      product.productVariants.find((variantOption) => {
        const variantAttributes = getVariantAttributes(variantOption);
        return selectionEntries.every(
          ([key, value]) => variantAttributes[key] === value,
        );
      }) || null
    );
  }, [product?.id, product?.productVariants, selectionProductId, selectedVariantId, selectionAttributes]);

  const prevImagesRef = useRef<string[]>([]);
  const images = useMemo(() => {
    const selectedVariantImages = selectedVariant
      ? buildStorefrontImageCandidates(
          (selectedVariant as { images?: unknown }).images,
          (selectedVariant as { galleryImages?: unknown }).galleryImages,
          selectedVariant.imageUrl,
          selectedVariant.image,
        )
      : [];

    const nextImages = buildStorefrontImageCandidates(
      selectedVariantImages,
      product?.images || [],
    );

    const prev = prevImagesRef.current;
    if (
      prev.length === nextImages.length &&
      prev.every((url, idx) => url === nextImages[idx])
    ) {
      return prev;
    }

    prevImagesRef.current = nextImages;
    return nextImages;
  }, [product?.images, selectedVariant]);

  const currency =
    storefrontSettings?.storefront?.settings?.currency ||
    storefrontSettings?.company?.currency ||
    "EGP";
  const activePrice =
    typeof selectedVariant?.price === "number" && Number.isFinite(selectedVariant.price)
      ? selectedVariant.price
      : typeof product?.price === "number"
        ? product.price
        : 0;
  const activeComparePrice =
    typeof selectedVariant?.comparePrice === "number" && Number.isFinite(selectedVariant.comparePrice)
      ? selectedVariant.comparePrice
      : typeof product?.comparePrice === "number"
        ? product.comparePrice
        : null;
  const womenQuickBuyDiscount =
    activeComparePrice && activeComparePrice > activePrice
      ? Math.round(((activeComparePrice - activePrice) / activeComparePrice) * 100)
      : null;
  const womenQuickBuyRating =
    typeof product?.rating === "number"
      ? product.rating
      : typeof product?.reviewSummary?.averageRating === "number"
        ? product.reviewSummary.averageRating
        : typeof product?.reviewAverage === "number"
          ? product.reviewAverage
          : null;
  const womenQuickBuyReviews =
    typeof product?.reviewCount === "number"
      ? product.reviewCount
      : typeof product?.reviewsCount === "number"
        ? product.reviewsCount
        : typeof product?.ratingCount === "number"
          ? product.ratingCount
          : typeof product?.reviewSummary?.totalReviews === "number"
            ? product.reviewSummary.totalReviews
            : 0;
  const shouldShowWomenQuickBuyOverlay =
    isWomenFashionEg && variant === "mirror-carousel";
  const swipeHandlers = useSwipe(images.length, setActiveIndex);
  const isWishlisted = product?.id ? hasWishlistItem(product.id) : false;

  const handleWishlistToggle = () => {
    if (!product?.id) {
      return;
    }

    toggleWishlist(product.id);
    toast.success(
      prefersArabicCopy
        ? isWishlisted
          ? "تمت إزالة المنتج من المفضلة"
          : "تمت إضافة المنتج للمفضلة"
        : isWishlisted
          ? "Removed from wishlist"
          : "Added to wishlist",
    );
  };

  const handleCompareToggle = () => {
    const next = !isCompared;
    setIsCompared(next);
    toast.success(
      prefersArabicCopy
        ? next
          ? "تمت إضافة المنتج للمقارنة"
          : "تمت إزالة المنتج من المقارنة"
        : next
          ? "Added to compare"
          : "Removed from compare",
    );
  };

  if (isGracefulGallery) {
    if (isLoading) {
      return (
        <div className="aspect-[4/5] w-full animate-pulse rounded-[10px] bg-[#f0f0f0]" />
      );
    }

    if (!product || images.length === 0) {
      return (
        <div className="flex aspect-[4/5] w-full items-center justify-center rounded-[10px] bg-[#f5f5f5]">
          <GalleryImageFallback productName={product?.name} prefersArabicCopy={prefersArabicCopy} />
        </div>
      );
    }

    if (images.length === 1) {
      return (
        <div className="w-full">
          <div className="relative overflow-hidden rounded-[10px] bg-[#f5f5f5]">
            <StorefrontProductImage
              candidates={[images[0]!]}
              alt={product.name}
              loading="eager"
              fetchpriority="high"
              requestedWidth={1200}
              responsiveWidths={[640, 960, 1280, 1600]}
              responsiveSizes="(min-width: 1024px) 46vw, 92vw"
              imageQuality={82}
              className="aspect-[4/5] w-full object-cover"
              fallback={<div className="aspect-[4/5] w-full bg-[#eee]" />}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="grid w-full gap-3 md:grid-cols-2">
        {images.map((imageSrc, imageIdx) => (
          <div
            key={`${imageSrc}-${imageIdx}`}
            className="relative overflow-hidden rounded-[10px] bg-[#f5f5f5]"
          >
            <StorefrontProductImage
              candidates={[imageSrc]}
              alt={`${product.name} — image ${imageIdx + 1}`}
              loading={imageIdx === 0 ? "eager" : "lazy"}
              fetchpriority={imageIdx === 0 ? "high" : undefined}
              requestedWidth={900}
              responsiveWidths={[480, 720, 960]}
              responsiveSizes="(min-width: 1024px) 23vw, 46vw"
              imageQuality={80}
              className="aspect-[4/5] w-full object-cover"
              fallback={<div className="aspect-[4/5] w-full bg-[#eee]" />}
            />
          </div>
        ))}
      </div>
    );
  }

  const conversionEnabled = isStorefrontMarketplaceAppEnabled(
    storefrontSettings,
    "conversion-suite",
  );
  const conversionSettings = getStorefrontMarketplaceAppSettings(
    storefrontSettings,
    "conversion-suite",
  );

  const isWishlistEnabled =
    storefrontSettings?.storefront?.storefrontFeatures?.wishlistEnabled !== false &&
    storefrontSettings?.storefrontSettings?.wishlistEnabled !== false &&
    (!conversionEnabled ||
      (conversionSettings?.modules as Record<string, unknown> | undefined)?.productWishlist !== false);

  const isComparisonEnabled =
    storefrontSettings?.storefront?.storefrontFeatures?.comparisonEnabled !== false &&
    storefrontSettings?.storefrontSettings?.comparisonEnabled !== false &&
    (!conversionEnabled ||
      (conversionSettings?.modules as Record<string, unknown> | undefined)?.productComparison !== false);

  const hasOverlayContent =
    galleryDiscountPct > 0 || isWishlistEnabled || isComparisonEnabled;

  const elessiOverlayActions =
    variant === "elessi-showroom" && hasOverlayContent ? (
      <>
        {galleryDiscountPct > 0 ? (
          <span className="pointer-events-auto inline-flex items-center rounded-full bg-red-600 px-3 py-1.5 text-xs font-black text-white shadow-[0_12px_26px_-18px_rgba(185,28,28,0.5)]">
            {prefersArabicCopy ? `خصم ${galleryDiscountPct}%` : `${galleryDiscountPct}% OFF`}
          </span>
        ) : null}
        {isWishlistEnabled ? (
          <button
            type="button"
            onClick={handleWishlistToggle}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_12px_26px_-18px_rgba(76,44,34,0.42)] backdrop-blur transition-colors ${
              isWishlisted
                ? "border-[#d7b2a0] bg-[#fff2ec] text-[#b3533b]"
                : "border-[#ead8ca] bg-white/92 text-[#6b4a3c] hover:border-[#c79f8b]"
            }`}
            aria-label={prefersArabicCopy ? "إضافة إلى المفضلة" : "Add to wishlist"}
          >
            <Heart className={`h-[18px] w-[18px] ${isWishlisted ? "fill-current" : ""}`} />
          </button>
        ) : null}
        {isComparisonEnabled ? (
          <button
            type="button"
            onClick={handleCompareToggle}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_12px_26px_-18px_rgba(76,44,34,0.42)] backdrop-blur transition-colors ${
              isCompared
                ? "border-[#d4beae] bg-[#fff5ec] text-[#8f5c44]"
                : "border-[#ead8ca] bg-white/92 text-[#6b4a3c] hover:border-[#c79f8b]"
            }`}
            aria-label={prefersArabicCopy ? "إضافة إلى المقارنة" : "Add to compare"}
          >
            <ArrowRightLeft className="h-[18px] w-[18px]" />
          </button>
        ) : null}
      </>
    ) : null;

  const handleJumpToBuybox = () => {
    document.getElementById(STOREFRONT_BUYBOX_ID)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    setActiveIndex(0);
  }, [selectedVariant?.id, selectedVariant?.image, images]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("storefront:pdp-gallery-zoom-open", {
        detail: { open: isZoomOpen },
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("storefront:pdp-gallery-zoom-open", {
          detail: { open: false },
        }),
      );
    };
  }, [isZoomOpen]);

  if (isLoading) {
    return (
      <div className="flex flex-col-reverse lg:flex-row gap-4 animate-pulse">
        <div className="flex lg:flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-16 h-16 lg:w-20 lg:h-20 bg-muted rounded-[var(--radius)]"
            />
          ))}
        </div>
        <div className="flex-1 aspect-square lg:aspect-[4/5] bg-muted rounded-[var(--radius)]" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex-1 aspect-square lg:aspect-[4/5] rounded-[var(--radius)] bg-muted flex items-center justify-center text-muted-foreground italic">
        {prefersArabicCopy ? "لا توجد صور متاحة" : "No images available"}
      </div>
    );
  }

  return (
    <section className="w-full bg-background">
      {isZenOrganic ? (
        <ZenGallery
          images={images}
          product={product}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          swipeHandlers={swipeHandlers}
        />
      ) : variant === "neon-showcase" ? (
        <CyberShowcaseGallery
          images={images}
          product={product}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          swipeHandlers={swipeHandlers}
          prefersArabicCopy={prefersArabicCopy}
        />
      ) : variant === "mirror-carousel" ? (
        <MirrorCarouselGallery
          images={images}
          product={product}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          swipeHandlers={swipeHandlers}
          prefersArabicCopy={prefersArabicCopy}
          onOpenZoom={() => setIsZoomOpen(true)}
          showWomenQuickBuyOverlay={shouldShowWomenQuickBuyOverlay}
          womenQuickBuyPrice={formatStorefrontCurrency(activePrice, currency)}
          womenQuickBuyOriginalPrice={
            activeComparePrice ? formatStorefrontCurrency(activeComparePrice, currency) : null
          }
          womenQuickBuyDiscount={womenQuickBuyDiscount}
          womenQuickBuyRating={womenQuickBuyRating}
          womenQuickBuyReviews={womenQuickBuyReviews}
          onJumpToBuybox={handleJumpToBuybox}
        />
      ) : variant === "fashion-counter-stage" ? (
        <FashionCounterStageGallery
          images={images}
          product={product}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          swipeHandlers={swipeHandlers}
          prefersArabicCopy={prefersArabicCopy}
          onOpenZoom={() => setIsZoomOpen(true)}
        />
      ) : variant === "atelier-editorial-stage" ? (
        <AtelierEditorialStageGallery
          images={images}
          product={product}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          swipeHandlers={swipeHandlers}
          prefersArabicCopy={prefersArabicCopy}
          onOpenZoom={() => setIsZoomOpen(true)}
          summaryPrice={formatStorefrontCurrency(activePrice, currency)}
          summaryOriginalPrice={
            activeComparePrice ? formatStorefrontCurrency(activeComparePrice, currency) : null
          }
          summaryDiscount={womenQuickBuyDiscount}
          summaryRating={womenQuickBuyRating}
          summaryReviews={womenQuickBuyReviews}
          onJumpToBuybox={handleJumpToBuybox}
        />
      ) : variant === "boutique-portrait-stage" ? (
        <BoutiquePortraitStageGallery
          images={images}
          product={product}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          swipeHandlers={swipeHandlers}
          prefersArabicCopy={prefersArabicCopy}
          onOpenZoom={() => setIsZoomOpen(true)}
        />
      ) : variant === "command-stage" ? (
        <PcHubCommandGallery
          images={images}
          product={product}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          swipeHandlers={swipeHandlers}
          prefersArabicCopy={prefersArabicCopy}
          onOpenZoom={() => setIsZoomOpen(true)}
        />
      ) : variant === "elessi-bag-gallery" ? (
        <ElessiGalleryFrame
          zoomLabel={prefersArabicCopy ? "تكبير الصور" : "Zoom gallery"}
          onZoom={() => setIsZoomOpen(true)}
          overlayToolbarOnMobile
          toolbarClassName="mb-0 flex items-center justify-end sm:mb-3 sm:border-b sm:border-[#efe2d7] sm:pb-3"
          buttonClassName="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#eadfd4] bg-white/92 px-3 py-2 text-[11px] font-black text-[#6f5a50] shadow-[0_14px_30px_-24px_rgba(36,24,21,0.22)] backdrop-blur transition-colors hover:border-[#c9ab95] hover:text-[#241815] sm:px-4 sm:text-xs"
        >
          <StandardGallery
            images={images}
            product={product}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            swipeHandlers={swipeHandlers}
            prefersArabicCopy={prefersArabicCopy}
            compactMobile
          />
        </ElessiGalleryFrame>
      ) : variant === "elessi-showroom" ? (
        <ElessiGalleryFrame
          overlayToolbarOnMobile
          shellClassName="-mx-4 border-b border-[#ead8ca] bg-transparent pb-0 sm:mx-0 sm:pb-5"
          toolbarClassName="mb-2 flex items-center justify-start sm:mb-3"
          buttonClassName="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#ead8ca] bg-[#fffaf6] px-3 py-2 text-[11px] font-black text-[#6b4a3c] transition-colors hover:border-[#c79f8b] sm:px-4 sm:text-xs"
        >
          <StandardGallery
            images={images}
            product={product}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            swipeHandlers={swipeHandlers}
            prefersArabicCopy={prefersArabicCopy}
            compactMobile
            flushMobile
            overlayActions={elessiOverlayActions}
            showMobileImageCount
            overlayMobileDots
            onOpenZoom={() => setIsZoomOpen(true)}
          />
        </ElessiGalleryFrame>
      ) : variant === "elessi-organic-gallery" ? (
        <ElessiGalleryFrame
          zoomLabel={prefersArabicCopy ? "عرض كل الصور" : "View gallery"}
          onZoom={() => setIsZoomOpen(true)}
          overlayToolbarOnMobile
          toolbarClassName="mb-0 flex items-center justify-end sm:mb-3 sm:border-b sm:border-[#eadfcd] sm:pb-3"
          buttonClassName="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#eadfcd] bg-white/92 px-3 py-2 text-[11px] font-black text-[#6c5b49] shadow-[0_14px_30px_-24px_rgba(46,33,21,0.16)] backdrop-blur transition-colors hover:border-[#d39c4d] hover:text-[#8c5d1e] sm:px-4 sm:text-xs"
        >
          <StandardGallery
            images={images}
            product={product}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            swipeHandlers={swipeHandlers}
            prefersArabicCopy={prefersArabicCopy}
            compactMobile
          />
        </ElessiGalleryFrame>
      ) : variant === "elessi-digital-gallery" ? (
        <ElessiGalleryFrame
          zoomLabel={prefersArabicCopy ? "عرض كل الصور" : "View gallery"}
          onZoom={() => setIsZoomOpen(true)}
          overlayToolbarOnMobile
          toolbarClassName="mb-0 flex items-center justify-end sm:mb-3 sm:border-b sm:border-[#e4e9f0] sm:pb-3"
          buttonClassName="pointer-events-auto inline-flex items-center gap-2 border border-[#dce3ec] bg-white/92 px-3 py-2 text-[11px] font-black text-[#516170] shadow-[0_14px_30px_-24px_rgba(15,23,42,0.16)] backdrop-blur transition-colors hover:border-[#f59e0b] hover:text-[#b45309] sm:px-4 sm:text-xs"
        >
          <StandardGallery
            images={images}
            product={product}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            swipeHandlers={swipeHandlers}
            prefersArabicCopy={prefersArabicCopy}
            compactMobile
          />
        </ElessiGalleryFrame>
      ) : variant === "elessi-mosaic-stage" ? (
        <ElessiGalleryFrame
          shellClassName="rounded-[2rem] border border-[#ead8ca] bg-[linear-gradient(180deg,#fffefb_0%,#f8efe6_100%)] p-4 shadow-[0_34px_96px_-68px_rgba(91,57,40,0.18)]"
          zoomLabel={prefersArabicCopy ? "فتح الصور" : "Open gallery"}
          onZoom={() => setIsZoomOpen(true)}
          overlayToolbarOnMobile
          toolbarClassName="mb-0 flex items-center justify-end sm:mb-3"
          buttonClassName="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#ead8ca] bg-white/92 px-3 py-2 text-[11px] font-black text-[#6b4a3c] shadow-[0_14px_30px_-24px_rgba(91,57,40,0.14)] backdrop-blur transition-colors hover:border-[#c79f8b] sm:px-4 sm:text-xs"
        >
          <div className="md:hidden">
            <StandardGallery
              images={images}
              product={product}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
              swipeHandlers={swipeHandlers}
              prefersArabicCopy={prefersArabicCopy}
              compactMobile
            />
          </div>
          <div className="hidden md:block">
            <MasonryGallery images={images} product={product} />
          </div>
        </ElessiGalleryFrame>
      ) : variant === "elessi-bike-gallery" ? (
        <ElessiGalleryFrame
          zoomLabel={prefersArabicCopy ? "عرض كل الصور" : "View gallery"}
          onZoom={() => setIsZoomOpen(true)}
          overlayToolbarOnMobile
          toolbarClassName="mb-0 flex items-center justify-end sm:mb-3 sm:border-b sm:border-[#e3e7eb] sm:pb-3"
          buttonClassName="pointer-events-auto inline-flex items-center gap-2 border border-[#d9dee4] bg-white/92 px-3 py-2 text-[11px] font-black text-[#516170] shadow-[0_14px_30px_-24px_rgba(15,23,42,0.16)] backdrop-blur transition-colors hover:border-[#d97706] hover:text-[#b45309] sm:px-4 sm:text-xs"
        >
          <StandardGallery
            images={images}
            product={product}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            swipeHandlers={swipeHandlers}
            prefersArabicCopy={prefersArabicCopy}
            compactMobile
          />
        </ElessiGalleryFrame>
      ) : variant === "elessi-detail-column" ? (
        <div className="rounded-[2rem] border border-[#ead8ca] bg-[linear-gradient(180deg,#fffefb_0%,#f9f1e8_100%)] p-4 shadow-[0_34px_96px_-68px_rgba(91,57,40,0.18)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <span className="inline-flex rounded-full border border-[#ead8ca] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#8f5c44]">
                Elessi detail
              </span>
              <p className="text-sm font-bold text-[#6f5a54]">
                {prefersArabicCopy
                  ? "عمود صور أقرب لتجربة التفاصيل الطويلة داخل صفحات المنتج الغنية."
                  : "A detail-led column for richer product pages with longer image storytelling."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsZoomOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[#ead8ca] bg-white px-4 py-2 text-xs font-black text-[#6b4a3c] shadow-[0_18px_44px_-30px_rgba(91,57,40,0.16)] transition-colors hover:border-[#c79f8b]"
            >
              {prefersArabicCopy ? "فتح المعرض" : "Open gallery"}
            </button>
          </div>
          <StackedGallery images={images} product={product} />
        </div>
      ) : variant === "elessi-plant-gallery" ? (
        <ElessiGalleryFrame
          zoomLabel={prefersArabicCopy ? "تكبير الصور" : "Zoom gallery"}
          onZoom={() => setIsZoomOpen(true)}
          overlayToolbarOnMobile
          toolbarClassName="mb-0 flex items-center justify-end sm:mb-3 sm:border-b sm:border-[#e7efe4] sm:pb-3"
          buttonClassName="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#d8e6d8] bg-white/92 px-3 py-2 text-[11px] font-black text-[#43604b] shadow-[0_14px_30px_-24px_rgba(32,53,40,0.16)] backdrop-blur transition-colors hover:border-[#7fa178] sm:px-4 sm:text-xs"
        >
          <StandardGallery
            images={images}
            product={product}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            swipeHandlers={swipeHandlers}
            prefersArabicCopy={prefersArabicCopy}
            compactMobile
          />
        </ElessiGalleryFrame>
      ) : variant === "grid" ? (
        <GridGallery images={images} product={product} />
      ) : variant === "masonry" ? (
        <MasonryGallery images={images} product={product} />
      ) : variant === "stacked" ? (
        <StackedGallery images={images} product={product} />
      ) : (
        <StandardGallery
          images={images}
          product={product}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          swipeHandlers={swipeHandlers}
          prefersArabicCopy={prefersArabicCopy}
          compactMobile={isMenShoesEg}
        />
      )}
      {variant === "mirror-carousel" ||
      variant === "fashion-counter-stage" ||
      variant === "atelier-editorial-stage" ||
      variant === "boutique-portrait-stage" ||
      variant === "command-stage" ||
      variant === "elessi-bag-gallery" ||
      variant === "elessi-showroom" ||
      variant === "elessi-organic-gallery" ||
      variant === "elessi-digital-gallery" ||
      variant === "elessi-mosaic-stage" ||
      variant === "elessi-bike-gallery" ||
      variant === "elessi-detail-column" ||
      variant === "elessi-plant-gallery" ? (
        <GalleryZoomDialog
          open={isZoomOpen}
          onOpenChange={setIsZoomOpen}
          images={images}
          product={product}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          prefersArabicCopy={prefersArabicCopy}
        />
      ) : null}
    </section>
  );
};

export default ProductGallery;
