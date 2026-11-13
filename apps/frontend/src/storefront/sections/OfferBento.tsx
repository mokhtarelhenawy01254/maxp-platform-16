import React from 'react';
import {
  BoutiqueDuoView,
  BundleMatrixView,
  CampaignStackView,
  DistrictMarketView,
  EditorialColumnsView,
  StandardBentoView,
  useOfferBentoController,
  VelaFashionMosaicView,
  type OfferBentoProps,
} from './offer-bento';

export type { OfferBentoProps };

export const OfferBento: React.FC<OfferBentoProps> = (props) => {
  const ctrl = useOfferBentoController(props);

  return (
    <section
      className={`relative w-full overflow-hidden py-10 md:py-14 ${
        ctrl.isBiteRush ? 'bg-[#fff7f1]' : 'bg-background'
      }`}
    >
      <div className="container px-4 md:px-6">
        {ctrl.variant !== 'boutique-duo' || ctrl.badge || ctrl.title || ctrl.subtitle ? (
          <div
            className={`mb-8 ${
              ctrl.variant === 'boutique-duo'
                ? 'max-w-2xl text-center mx-auto'
                : 'max-w-3xl text-start'
            } space-y-3`}
          >
            {ctrl.badge ? (
              <span
                className={`inline-flex w-fit ${
                  ctrl.isVelaFashionMosaic
                    ? 'font-heading text-[17px] font-normal text-[#0abb45]'
                    : ctrl.isBiteRush
                      ? 'bg-white text-[#dc2626] shadow-md'
                      : ctrl.variant === 'boutique-duo'
                        ? 'rounded-full border border-[#ead8d2] bg-white px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#b06767]'
                        : 'rounded-full border border-primary/12 bg-primary/5 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-primary'
                }`}
              >
                {ctrl.badge}
              </span>
            ) : null}
            {ctrl.title ? (
              <h2
                className={`font-heading font-black md:text-4xl ${
                  ctrl.isVelaFashionMosaic
                    ? 'text-2xl font-bold text-[#131316]'
                    : ctrl.isBiteRush
                      ? 'text-4xl uppercase italic text-[#171717]'
                      : ctrl.variant === 'boutique-duo'
                        ? 'text-[2rem] font-semibold text-[#201915]'
                        : 'text-3xl text-foreground'
                }`}
              >
                {ctrl.title}
              </h2>
            ) : null}
            {ctrl.subtitle && !ctrl.hideSubtitle ? (
              <p
                className={`text-sm leading-7 md:text-base ${
                  ctrl.isBiteRush
                    ? 'text-[#5f5f5f]'
                    : ctrl.variant === 'boutique-duo'
                      ? 'text-[#7b6d68]'
                      : 'text-muted-foreground'
                }`}
              >
                {ctrl.subtitle}
              </p>
            ) : null}
          </div>
        ) : null}

        {ctrl.variant === 'vela-fashion-mosaic' ? (
          <VelaFashionMosaicView cards={ctrl.cards} location={ctrl.location} />
        ) : ctrl.isDistrictMarket ? (
          <DistrictMarketView
            cards={ctrl.cards}
            location={ctrl.location}
            themeId={ctrl.theme.id}
          />
        ) : ctrl.variant === 'editorial-columns' || ctrl.variant === 'category-promo' ? (
          <EditorialColumnsView
            cards={ctrl.cards}
            location={ctrl.location}
            themeId={ctrl.theme.id}
          />
        ) : ctrl.variant === 'bundle-matrix' || ctrl.variant === 'combo-deals' ? (
          <BundleMatrixView cards={ctrl.cards} location={ctrl.location} />
        ) : ctrl.variant === 'boutique-duo' ? (
          <BoutiqueDuoView
            cards={ctrl.cards}
            location={ctrl.location}
            themeId={ctrl.theme.id}
          />
        ) : ctrl.variant === 'campaign-stack' || ctrl.variant === 'daily-picks' ? (
          <CampaignStackView
            cards={ctrl.cards}
            location={ctrl.location}
            themeId={ctrl.theme.id}
          />
        ) : (
          <StandardBentoView
            cards={ctrl.cards}
            location={ctrl.location}
            variant={ctrl.variant}
            themeId={ctrl.theme.id}
            isBiteRush={ctrl.isBiteRush}
          />
        )}
      </div>
    </section>
  );
};

export default OfferBento;
