import React from 'react';
import { OptimizedGalleryImage } from './galleryHelpers';
import { GallerySwipeHandlers } from './galleryTypes';

export interface StandardGalleryProps {
  images: string[];
  product?: any;
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  swipeHandlers?: GallerySwipeHandlers;
  prefersArabicCopy?: boolean;
  compactMobile?: boolean;
  flushMobile?: boolean;
  overlayActions?: React.ReactNode;
  showMobileImageCount?: boolean;
  overlayMobileDots?: boolean;
  onOpenZoom?: () => void;
  discountPct?: number;
}

export const StandardGallery: React.FC<StandardGalleryProps> = ({
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
  discountPct = 0,
}) => {
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
            ? 'w-5 bg-primary shadow-[0_1px_5px_rgba(0,0,0,0.24)]'
            : 'w-2 bg-white/82 shadow-[0_1px_5px_rgba(0,0,0,0.22)]'
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
              ? 'flex flex-col gap-2 lg:flex-row'
              : 'flex flex-col gap-3 lg:flex-row'
            : 'flex flex-col-reverse gap-4 lg:flex-row'
          : 'block'
      }
    >
      {/* Thumbnails */}
      {hasMultipleImages ? (
        <div
          className={
            compactMobile
              ? 'hidden gap-2 overflow-x-auto pb-2 lg:flex lg:flex-col lg:overflow-visible lg:pb-0'
              : 'flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0'
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
                    ? 'border-ring ring-1 ring-ring'
                    : 'border-border hover:border-muted-foreground'
                }
              `}
              aria-label={
                prefersArabicCopy
                  ? `عرض الصورة ${i + 1}`
                  : `View image ${i + 1}`
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
              ? 'aspect-[1/1.04] rounded-none bg-transparent sm:aspect-[4/5] sm:rounded-[1.25rem] sm:bg-white lg:aspect-[4/5] lg:rounded-[var(--radius)]'
              : 'aspect-[5/4] rounded-[1.4rem] bg-white sm:aspect-[4/5] lg:aspect-[4/5] lg:rounded-[var(--radius)]'
            : 'aspect-square rounded-[var(--radius)] bg-muted lg:aspect-[4/5]'
        }`}
        onClick={(event) => {
          if (typeof onOpenZoom !== 'function') {
            return;
          }

          const target = event.target as HTMLElement | null;
          if (target?.closest('button')) {
            return;
          }

          onOpenZoom();
        }}
        onKeyDown={(event) => {
          if (typeof onOpenZoom !== 'function') {
            return;
          }

          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpenZoom();
          }
        }}
        role={typeof onOpenZoom === 'function' ? 'button' : undefined}
        tabIndex={typeof onOpenZoom === 'function' ? 0 : undefined}
        aria-label={
          typeof onOpenZoom === 'function'
            ? prefersArabicCopy
              ? 'افتحي تكبير الصورة'
              : 'Open image zoom'
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
            typeof onOpenZoom === 'function' ? 'cursor-zoom-in' : ''
          }`}
          productName={product?.name}
        />

        {discountPct > 0 ? (
          <span className="absolute start-3 top-3 z-10 inline-flex items-center rounded-full bg-[#4caf50] px-2.5 py-1 text-xs font-bold text-white shadow-sm">
            -{discountPct}%
          </span>
        ) : null}

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
              aria-label={
                prefersArabicCopy ? 'الصورة السابقة' : 'Previous image'
              }
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
              aria-label={prefersArabicCopy ? 'الصورة التالية' : 'Next image'}
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
        <div
          className={`flex justify-center md:hidden ${flushMobile ? 'pt-1' : 'pt-2'}`}
        >
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
                  activeIndex === i
                    ? 'w-5 bg-primary'
                    : 'w-2 bg-muted-foreground/30'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const GridGallery: React.FC<{ images: string[]; product?: any }> = ({
  images,
  product,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {images.map((img: string, i: number) => (
      <div
        key={i}
        className={`rounded-[var(--radius)] overflow-hidden bg-muted group ${
          i === 0 && images.length > 1
            ? 'md:col-span-2 aspect-square md:aspect-[21/9]'
            : 'aspect-square lg:aspect-[4/5]'
        }`}
      >
        <OptimizedGalleryImage
          source={img}
          alt={`${product?.name} view ${i + 1}`}
          loading={i === 0 ? 'eager' : 'lazy'}
          fetchpriority={i === 0 ? 'high' : 'auto'}
          decoding={i === 0 ? 'sync' : 'async'}
          width="600"
          height="600"
          mode={i === 0 ? 'hero' : 'detail'}
          responsiveSizes={
            i === 0 ? '100vw' : '(min-width: 768px) 50vw, 100vw'
          }
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          productName={product?.name}
        />
      </div>
    ))}
  </div>
);

export const MasonryGallery: React.FC<{ images: string[]; product?: any }> = ({
  images,
  product,
}) => (
  <div className="columns-2 gap-4 space-y-4">
    {images.map((img: string, i: number) => (
      <div
        key={i}
        className={`break-inside-avoid rounded-[var(--radius)] overflow-hidden bg-muted group ${
          i % 3 === 0
            ? 'aspect-[3/4]'
            : i % 3 === 1
              ? 'aspect-square'
              : 'aspect-[4/5]'
        }`}
      >
        <OptimizedGalleryImage
          source={img}
          alt={`${product?.name} view ${i + 1}`}
          loading={i === 0 ? 'eager' : 'lazy'}
          fetchpriority={i === 0 ? 'high' : 'auto'}
          decoding={i === 0 ? 'sync' : 'async'}
          width="600"
          height="750"
          mode={i === 0 ? 'hero' : 'detail'}
          responsiveSizes="(min-width: 768px) 50vw, 100vw"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          productName={product?.name}
        />
      </div>
    ))}
  </div>
);

export const StackedGallery: React.FC<{ images: string[]; product?: any }> = ({
  images,
  product,
}) => (
  <div className="grid gap-4">
    {images.map((img: string, i: number) => (
      <div
        key={i}
        className="aspect-square lg:aspect-[5/4] overflow-hidden rounded-[var(--radius)] bg-muted group"
      >
        <OptimizedGalleryImage
          source={img}
          alt={`${product?.name} view ${i + 1}`}
          loading={i === 0 ? 'eager' : 'lazy'}
          fetchpriority={i === 0 ? 'high' : 'auto'}
          decoding={i === 0 ? 'sync' : 'async'}
          width="600"
          height="480"
          mode={i === 0 ? 'hero' : 'detail'}
          responsiveSizes="100vw"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          productName={product?.name}
        />
      </div>
    ))}
  </div>
);
