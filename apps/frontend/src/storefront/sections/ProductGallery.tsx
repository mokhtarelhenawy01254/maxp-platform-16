import React from 'react';
import { ProductGalleryProps } from './product-gallery/galleryTypes';
import { useProductGalleryController } from './product-gallery/useProductGalleryController';
import { GalleryZoomDialog } from './product-gallery/GalleryZoomDialog';
import {
  GridGallery,
  MasonryGallery,
  StackedGallery,
  StandardGallery,
} from './product-gallery/StandardAndGridGalleries';
import {
  AtelierEditorialStageGallery,
  BoutiquePortraitStageGallery,
  ElessiGalleryFrame,
  FashionCounterStageGallery,
  GracefulGallery,
} from './product-gallery/EditorialAndFashionGalleries';
import {
  CyberShowcaseGallery,
  MirrorCarouselGallery,
  PcHubCommandGallery,
  ZenGallery,
} from './product-gallery/TechAndNicheGalleries';
import { formatStorefrontCurrency } from '../utils/currency';

export * from './product-gallery';

export const ProductGallery: React.FC<ProductGalleryProps> = ({ section }) => {
  const ctrl = useProductGalleryController(section);

  if (ctrl.isGracefulGallery) {
    return (
      <GracefulGallery
        images={ctrl.images}
        product={ctrl.product}
        isLoading={ctrl.isLoading}
        prefersArabicCopy={ctrl.prefersArabicCopy}
      />
    );
  }

  if (ctrl.isLoading) {
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

  if (ctrl.images.length === 0) {
    return (
      <div className="flex-1 aspect-square lg:aspect-[4/5] rounded-[var(--radius)] bg-muted flex items-center justify-center text-muted-foreground italic">
        {ctrl.prefersArabicCopy ? 'لا توجد صور متاحة' : 'No images available'}
      </div>
    );
  }

  return (
    <section className="w-full bg-background">
      {ctrl.isZenOrganic ? (
        <ZenGallery
          images={ctrl.images}
          product={ctrl.product}
          activeIndex={ctrl.activeIndex}
          setActiveIndex={ctrl.setActiveIndex}
          swipeHandlers={ctrl.swipeHandlers}
        />
      ) : ctrl.variant === 'neon-showcase' ? (
        <CyberShowcaseGallery
          images={ctrl.images}
          product={ctrl.product}
          activeIndex={ctrl.activeIndex}
          setActiveIndex={ctrl.setActiveIndex}
          swipeHandlers={ctrl.swipeHandlers}
          prefersArabicCopy={ctrl.prefersArabicCopy}
        />
      ) : ctrl.variant === 'mirror-carousel' ? (
        <MirrorCarouselGallery
          images={ctrl.images}
          product={ctrl.product}
          activeIndex={ctrl.activeIndex}
          setActiveIndex={ctrl.setActiveIndex}
          swipeHandlers={ctrl.swipeHandlers}
          prefersArabicCopy={ctrl.prefersArabicCopy}
          onOpenZoom={() => ctrl.setIsZoomOpen(true)}
          showWomenQuickBuyOverlay={ctrl.shouldShowWomenQuickBuyOverlay}
          womenQuickBuyPrice={formatStorefrontCurrency(ctrl.activePrice, ctrl.currency)}
          womenQuickBuyOriginalPrice={
            ctrl.activeComparePrice
              ? formatStorefrontCurrency(ctrl.activeComparePrice, ctrl.currency)
              : null
          }
          womenQuickBuyDiscount={ctrl.womenQuickBuyDiscount}
          womenQuickBuyRating={ctrl.womenQuickBuyRating}
          womenQuickBuyReviews={ctrl.womenQuickBuyReviews}
          onJumpToBuybox={ctrl.handleJumpToBuybox}
        />
      ) : ctrl.variant === 'fashion-counter-stage' ? (
        <FashionCounterStageGallery
          images={ctrl.images}
          product={ctrl.product}
          activeIndex={ctrl.activeIndex}
          setActiveIndex={ctrl.setActiveIndex}
          swipeHandlers={ctrl.swipeHandlers}
          prefersArabicCopy={ctrl.prefersArabicCopy}
          onOpenZoom={() => ctrl.setIsZoomOpen(true)}
        />
      ) : ctrl.variant === 'atelier-editorial-stage' ? (
        <AtelierEditorialStageGallery
          images={ctrl.images}
          product={ctrl.product}
          activeIndex={ctrl.activeIndex}
          setActiveIndex={ctrl.setActiveIndex}
          swipeHandlers={ctrl.swipeHandlers}
          prefersArabicCopy={ctrl.prefersArabicCopy}
          onOpenZoom={() => ctrl.setIsZoomOpen(true)}
          summaryPrice={formatStorefrontCurrency(ctrl.activePrice, ctrl.currency)}
          summaryOriginalPrice={
            ctrl.activeComparePrice
              ? formatStorefrontCurrency(ctrl.activeComparePrice, ctrl.currency)
              : null
          }
          summaryDiscount={ctrl.womenQuickBuyDiscount}
          summaryRating={ctrl.womenQuickBuyRating}
          summaryReviews={ctrl.womenQuickBuyReviews}
          onJumpToBuybox={ctrl.handleJumpToBuybox}
        />
      ) : ctrl.variant === 'boutique-portrait-stage' ? (
        <BoutiquePortraitStageGallery
          images={ctrl.images}
          product={ctrl.product}
          activeIndex={ctrl.activeIndex}
          setActiveIndex={ctrl.setActiveIndex}
          swipeHandlers={ctrl.swipeHandlers}
          prefersArabicCopy={ctrl.prefersArabicCopy}
          onOpenZoom={() => ctrl.setIsZoomOpen(true)}
        />
      ) : ctrl.variant === 'command-stage' ? (
        <PcHubCommandGallery
          images={ctrl.images}
          product={ctrl.product}
          activeIndex={ctrl.activeIndex}
          setActiveIndex={ctrl.setActiveIndex}
          swipeHandlers={ctrl.swipeHandlers}
          prefersArabicCopy={ctrl.prefersArabicCopy}
          onOpenZoom={() => ctrl.setIsZoomOpen(true)}
        />
      ) : ctrl.variant === 'elessi-bag-gallery' ? (
        <ElessiGalleryFrame
          zoomLabel={ctrl.prefersArabicCopy ? 'تكبير الصور' : 'Zoom gallery'}
          onZoom={() => ctrl.setIsZoomOpen(true)}
          overlayToolbarOnMobile
          toolbarClassName="mb-0 flex items-center justify-end sm:mb-3 sm:border-b sm:border-[#efe2d7] sm:pb-3"
          buttonClassName="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#eadfd4] bg-white/92 px-3 py-2 text-[11px] font-black text-[#6f5a50] shadow-[0_14px_30px_-24px_rgba(36,24,21,0.22)] backdrop-blur transition-colors hover:border-[#c9ab95] hover:text-[#241815] sm:px-4 sm:text-xs"
        >
          <StandardGallery
            images={ctrl.images}
            product={ctrl.product}
            activeIndex={ctrl.activeIndex}
            setActiveIndex={ctrl.setActiveIndex}
            swipeHandlers={ctrl.swipeHandlers}
            prefersArabicCopy={ctrl.prefersArabicCopy}
            compactMobile
          />
        </ElessiGalleryFrame>
      ) : ctrl.variant === 'elessi-showroom' ? (
        <ElessiGalleryFrame
          overlayToolbarOnMobile
          shellClassName="-mx-4 border-b border-[#ead8ca] bg-transparent pb-0 sm:mx-0 sm:pb-5"
          toolbarClassName="mb-2 flex items-center justify-start sm:mb-3"
          buttonClassName="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#ead8ca] bg-[#fffaf6] px-3 py-2 text-[11px] font-black text-[#6b4a3c] transition-colors hover:border-[#c79f8b] sm:px-4 sm:text-xs"
        >
          <StandardGallery
            images={ctrl.images}
            product={ctrl.product}
            activeIndex={ctrl.activeIndex}
            setActiveIndex={ctrl.setActiveIndex}
            swipeHandlers={ctrl.swipeHandlers}
            prefersArabicCopy={ctrl.prefersArabicCopy}
            compactMobile
            flushMobile
            overlayActions={ctrl.elessiOverlayActions}
            showMobileImageCount
            overlayMobileDots
            onOpenZoom={() => ctrl.setIsZoomOpen(true)}
          />
        </ElessiGalleryFrame>
      ) : ctrl.variant === 'elessi-organic-gallery' ? (
        <ElessiGalleryFrame
          zoomLabel={ctrl.prefersArabicCopy ? 'عرض كل الصور' : 'View gallery'}
          onZoom={() => ctrl.setIsZoomOpen(true)}
          overlayToolbarOnMobile
          toolbarClassName="mb-0 flex items-center justify-end sm:mb-3 sm:border-b sm:border-[#eadfcd] sm:pb-3"
          buttonClassName="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#eadfcd] bg-white/92 px-3 py-2 text-[11px] font-black text-[#6c5b49] shadow-[0_14px_30px_-24px_rgba(46,33,21,0.16)] backdrop-blur transition-colors hover:border-[#d39c4d] hover:text-[#8c5d1e] sm:px-4 sm:text-xs"
        >
          <StandardGallery
            images={ctrl.images}
            product={ctrl.product}
            activeIndex={ctrl.activeIndex}
            setActiveIndex={ctrl.setActiveIndex}
            swipeHandlers={ctrl.swipeHandlers}
            prefersArabicCopy={ctrl.prefersArabicCopy}
            compactMobile
          />
        </ElessiGalleryFrame>
      ) : ctrl.variant === 'elessi-digital-gallery' ? (
        <ElessiGalleryFrame
          zoomLabel={ctrl.prefersArabicCopy ? 'عرض كل الصور' : 'View gallery'}
          onZoom={() => ctrl.setIsZoomOpen(true)}
          overlayToolbarOnMobile
          toolbarClassName="mb-0 flex items-center justify-end sm:mb-3 sm:border-b sm:border-[#e4e9f0] sm:pb-3"
          buttonClassName="pointer-events-auto inline-flex items-center gap-2 border border-[#dce3ec] bg-white/92 px-3 py-2 text-[11px] font-black text-[#516170] shadow-[0_14px_30px_-24px_rgba(15,23,42,0.16)] backdrop-blur transition-colors hover:border-[#f59e0b] hover:text-[#b45309] sm:px-4 sm:text-xs"
        >
          <StandardGallery
            images={ctrl.images}
            product={ctrl.product}
            activeIndex={ctrl.activeIndex}
            setActiveIndex={ctrl.setActiveIndex}
            swipeHandlers={ctrl.swipeHandlers}
            prefersArabicCopy={ctrl.prefersArabicCopy}
            compactMobile
          />
        </ElessiGalleryFrame>
      ) : ctrl.variant === 'elessi-mosaic-stage' ? (
        <ElessiGalleryFrame
          shellClassName="rounded-[2rem] border border-[#ead8ca] bg-[linear-gradient(180deg,#fffefb_0%,#f8efe6_100%)] p-4 shadow-[0_34px_96px_-68px_rgba(91,57,40,0.18)]"
          zoomLabel={ctrl.prefersArabicCopy ? 'فتح الصور' : 'Open gallery'}
          onZoom={() => ctrl.setIsZoomOpen(true)}
          overlayToolbarOnMobile
          toolbarClassName="mb-0 flex items-center justify-end sm:mb-3"
          buttonClassName="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#ead8ca] bg-white/92 px-3 py-2 text-[11px] font-black text-[#6b4a3c] shadow-[0_14px_30px_-24px_rgba(91,57,40,0.14)] backdrop-blur transition-colors hover:border-[#c79f8b] sm:px-4 sm:text-xs"
        >
          <div className="md:hidden">
            <StandardGallery
              images={ctrl.images}
              product={ctrl.product}
              activeIndex={ctrl.activeIndex}
              setActiveIndex={ctrl.setActiveIndex}
              swipeHandlers={ctrl.swipeHandlers}
              prefersArabicCopy={ctrl.prefersArabicCopy}
              compactMobile
            />
          </div>
          <div className="hidden md:block">
            <MasonryGallery images={ctrl.images} product={ctrl.product} />
          </div>
        </ElessiGalleryFrame>
      ) : ctrl.variant === 'elessi-bike-gallery' ? (
        <ElessiGalleryFrame
          zoomLabel={ctrl.prefersArabicCopy ? 'عرض كل الصور' : 'View gallery'}
          onZoom={() => ctrl.setIsZoomOpen(true)}
          overlayToolbarOnMobile
          toolbarClassName="mb-0 flex items-center justify-end sm:mb-3 sm:border-b sm:border-[#e3e7eb] sm:pb-3"
          buttonClassName="pointer-events-auto inline-flex items-center gap-2 border border-[#d9dee4] bg-white/92 px-3 py-2 text-[11px] font-black text-[#516170] shadow-[0_14px_30px_-24px_rgba(15,23,42,0.16)] backdrop-blur transition-colors hover:border-[#d97706] hover:text-[#b45309] sm:px-4 sm:text-xs"
        >
          <StandardGallery
            images={ctrl.images}
            product={ctrl.product}
            activeIndex={ctrl.activeIndex}
            setActiveIndex={ctrl.setActiveIndex}
            swipeHandlers={ctrl.swipeHandlers}
            prefersArabicCopy={ctrl.prefersArabicCopy}
            compactMobile
          />
        </ElessiGalleryFrame>
      ) : ctrl.variant === 'elessi-detail-column' ? (
        <div className="rounded-[2rem] border border-[#ead8ca] bg-[linear-gradient(180deg,#fffefb_0%,#f9f1e8_100%)] p-4 shadow-[0_34px_96px_-68px_rgba(91,57,40,0.18)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <span className="inline-flex rounded-full border border-[#ead8ca] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#8f5c44]">
                Elessi detail
              </span>
              <p className="text-sm font-bold text-[#6f5a54]">
                {ctrl.prefersArabicCopy
                  ? 'عمود صور أقرب لتجربة التفاصيل الطويلة داخل صفحات المنتج الغنية.'
                  : 'A detail-led column for richer product pages with longer image storytelling.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => ctrl.setIsZoomOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[#ead8ca] bg-white px-4 py-2 text-xs font-black text-[#6b4a3c] shadow-[0_18px_44px_-30px_rgba(91,57,40,0.16)] transition-colors hover:border-[#c79f8b]"
            >
              {ctrl.prefersArabicCopy ? 'فتح المعرض' : 'Open gallery'}
            </button>
          </div>
          <StackedGallery images={ctrl.images} product={ctrl.product} />
        </div>
      ) : ctrl.variant === 'elessi-plant-gallery' ? (
        <ElessiGalleryFrame
          zoomLabel={ctrl.prefersArabicCopy ? 'تكبير الصور' : 'Zoom gallery'}
          onZoom={() => ctrl.setIsZoomOpen(true)}
          overlayToolbarOnMobile
          toolbarClassName="mb-0 flex items-center justify-end sm:mb-3 sm:border-b sm:border-[#e7efe4] sm:pb-3"
          buttonClassName="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#d8e6d8] bg-white/92 px-3 py-2 text-[11px] font-black text-[#43604b] shadow-[0_14px_30px_-24px_rgba(32,53,40,0.16)] backdrop-blur transition-colors hover:border-[#7fa178] sm:px-4 sm:text-xs"
        >
          <StandardGallery
            images={ctrl.images}
            product={ctrl.product}
            activeIndex={ctrl.activeIndex}
            setActiveIndex={ctrl.setActiveIndex}
            swipeHandlers={ctrl.swipeHandlers}
            prefersArabicCopy={ctrl.prefersArabicCopy}
            compactMobile
          />
        </ElessiGalleryFrame>
      ) : ctrl.variant === 'grid' ? (
        <GridGallery images={ctrl.images} product={ctrl.product} />
      ) : ctrl.variant === 'masonry' ? (
        <MasonryGallery images={ctrl.images} product={ctrl.product} />
      ) : ctrl.variant === 'stacked' ? (
        <StackedGallery images={ctrl.images} product={ctrl.product} />
      ) : (
        <StandardGallery
          images={ctrl.images}
          product={ctrl.product}
          activeIndex={ctrl.activeIndex}
          setActiveIndex={ctrl.setActiveIndex}
          swipeHandlers={ctrl.swipeHandlers}
          prefersArabicCopy={ctrl.prefersArabicCopy}
          compactMobile={ctrl.isMenShoesEg}
          discountPct={ctrl.galleryDiscountPct}
        />
      )}
      {ctrl.variant === 'mirror-carousel' ||
      ctrl.variant === 'fashion-counter-stage' ||
      ctrl.variant === 'atelier-editorial-stage' ||
      ctrl.variant === 'boutique-portrait-stage' ||
      ctrl.variant === 'command-stage' ||
      ctrl.variant === 'elessi-bag-gallery' ||
      ctrl.variant === 'elessi-showroom' ||
      ctrl.variant === 'elessi-organic-gallery' ||
      ctrl.variant === 'elessi-digital-gallery' ||
      ctrl.variant === 'elessi-mosaic-stage' ||
      ctrl.variant === 'elessi-bike-gallery' ||
      ctrl.variant === 'elessi-detail-column' ||
      ctrl.variant === 'elessi-plant-gallery' ? (
        <GalleryZoomDialog
          open={ctrl.isZoomOpen}
          onOpenChange={ctrl.setIsZoomOpen}
          images={ctrl.images}
          product={ctrl.product}
          activeIndex={ctrl.activeIndex}
          setActiveIndex={ctrl.setActiveIndex}
          prefersArabicCopy={ctrl.prefersArabicCopy}
        />
      ) : null}
    </section>
  );
};

export default ProductGallery;
