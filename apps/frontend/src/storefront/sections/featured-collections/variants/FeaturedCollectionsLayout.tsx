import React from 'react';
import { Link } from 'react-router-dom';
import { FeaturedCollectionsController } from '../useFeaturedCollectionsController';
import { ElessiCategoryVariants } from './ElessiCategoryVariants';
import { SpecializedLanesVariants } from './SpecializedLanesVariants';
import { StandardGridVariant } from './StandardGridVariant';

const isSpecializedVariant = (
  variant: string,
  isDistrictMarket?: boolean,
): boolean => {
  return (
    variant === 'fragrance-ledger' ||
    variant === 'catalog-pills' ||
    variant === 'pastel-category-lane' ||
    variant === 'retail-category-tiles' ||
    variant === 'tech-decision-lanes' ||
    variant === 'legacy-circle-categories' ||
    variant === 'gallery-columns' ||
    variant === 'travel-postcards' ||
    variant === 'occasion-ribbon' ||
    (Boolean(isDistrictMarket) && variant === 'fast-nav-grid')
  );
};

export const FeaturedCollectionsLayout: React.FC<{
  ctrl: FeaturedCollectionsController;
}> = ({ ctrl }) => {
  const {
    variant,
    isElessiVariant,
    isDistrictMarket,
    compactCatalogPills,
    isSoleaFemme,
    isBiteRush,
    isCafeDemo,
    isSmartBazaar,
    isKidsPlay,
    isNovaMobile,
    isVelaFashion,
    hideBadge,
    hideSubtitle,
    hideSectionCta,
    theme,
    isWomenFashion,
    isPerfumeEg,
    isFakhama,
    title,
    subtitle,
    ctaHref,
    ctaText,
    isLoading,
    categories,
    limit,
  } = ctrl;

  return (
    <section
      className={`w-full ${compactCatalogPills ? 'py-5 md:py-6' : 'py-10 md:py-14'} ${
        isSoleaFemme
          ? 'bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.72)_42%,hsl(var(--background))_100%)]'
          : isBiteRush
            ? 'bg-[linear-gradient(180deg,#fffdfb_0%,#fff3ea_44%,#fffaf6_100%)]'
            : isCafeDemo
              ? 'bg-[linear-gradient(180deg,#fffdfa_0%,#f6ede4_46%,#fdf8f3_100%)]'
              : isSmartBazaar
                ? 'bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.55)_40%,hsl(var(--background))_100%)]'
                : isElessiVariant
                  ? 'bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe6_32%,#fff9f2_64%,#fffdf9_100%)]'
                  : variant === 'fragrance-ledger'
                    ? 'bg-[linear-gradient(180deg,#fffdf9_0%,#f8efe6_36%,#fffdf9_100%)]'
                    : variant === 'catalog-pills'
                      ? 'bg-[#f4f6f8]'
                      : variant === 'retail-category-tiles'
                        ? 'bg-background'
                        : variant === 'tech-decision-lanes'
                          ? 'bg-[linear-gradient(180deg,#fffdf8_0%,#f7efd9_42%,#fffdf8_100%)]'
                          : variant === 'gallery-columns'
                            ? 'bg-[linear-gradient(180deg,#fcf7f1_0%,#f6efe8_34%,#fdfaf6_100%)]'
                          : variant === 'travel-postcards'
                            ? 'bg-[linear-gradient(180deg,#fffaf2_0%,#f4ece1_36%,#fffaf6_100%)]'
                            : variant === 'legacy-circle-categories'
                              ? 'bg-white'
                              : isKidsPlay || variant === 'floating-bubbles' || variant === 'playful-bubbles'
                                ? 'bg-[radial-gradient(circle_at_top_right,hsl(var(--secondary)/0.15),transparent_40%),radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.15),transparent_40%),radial-gradient(circle_at_center,hsl(var(--primary)/0.1),transparent_60%)]'
                                : isNovaMobile
                                  ? 'bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_40%),radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.08),transparent_50%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.38)_48%,hsl(var(--background))_100%)]'
                                  : 'bg-background'
      }`}
    >
      <div className="container px-4 md:px-6">
        <div
          className={`${compactCatalogPills ? 'hidden ' : ''}mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between ${
            variant === 'editorial-categories'
              ? 'md:mb-10'
              : variant === 'catalog-pills'
                ? 'md:mb-6'
                : ''
          }`}
        >
          <div className="space-y-2">
            {!(isVelaFashion && variant === 'pastel-category-lane') && !hideBadge ? (
              <span
                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
                  isSoleaFemme
                    ? 'border border-primary/10 bg-background/90 tracking-[0.24em] text-primary uppercase'
                    : isBiteRush
                      ? 'bg-white text-[#dc2626] shadow-md'
                      : isCafeDemo
                        ? 'bg-[#4b2e1f] text-[#f8eadf] shadow-md'
                        : isSmartBazaar
                          ? 'border border-primary/12 bg-primary/5 tracking-[0.22em] text-primary uppercase'
                          : isElessiVariant
                            ? 'border border-[#ead9cc] bg-white/92 tracking-[0.24em] text-[#8f5c44]'
                            : variant === 'fragrance-ledger'
                              ? 'border border-[#eadfd6] bg-white/92 tracking-[0.22em] text-[#7c4b33]'
                              : variant === 'catalog-pills'
                                ? 'border border-[#e5e7eb] bg-white tracking-[0.16em] text-[#6b7280]'
                                : variant === 'retail-category-tiles'
                                  ? 'border border-[#111111]/12 bg-[#fff7ed] tracking-[0.16em] text-[#8d5f3c]'
                                  : variant === 'tech-decision-lanes'
                                    ? 'border border-[#1f242c]/12 bg-[#1f242c] tracking-[0.22em] text-[#fff1b8] uppercase'
                                    : variant === 'gallery-columns'
                                      ? 'border-b border-[#d7ba86] bg-transparent px-0 tracking-[0.32em] text-[#7e694a] uppercase'
                                    : variant === 'travel-postcards'
                                      ? 'border border-[#decfbe] bg-white/92 tracking-[0.22em] text-[#87644c]'
                                      : variant === 'legacy-circle-categories'
                                        ? 'border border-[#111111]/12 bg-white tracking-[0.22em] text-[#111111]'
                                        : isFakhama
                                          ? 'border border-primary/20 bg-primary/5 tracking-wider text-primary'
                                          : isKidsPlay
                                            ? 'bg-accent/15 text-accent-foreground font-black'
                                            : isNovaMobile
                                              ? 'border border-primary/20 bg-primary/8 tracking-[0.24em] text-primary uppercase'
                                              : 'bg-secondary text-muted-foreground'
                }`}
              >
                {isSoleaFemme
                  ? variant === 'occasion-ribbon'
                    ? 'مسارات الستايل'
                    : 'اختيارات الأحذية'
                  : isWomenFashion
                    ? variant === 'occasion-ribbon'
                      ? 'مسارات جاهزة'
                      : 'اختيارات حريمي'
                    : variant === 'gallery-columns'
                      ? theme?.direction === 'rtl'
                        ? 'مجموعات التوقيع'
                        : 'Signature edits'
                    : isPerfumeEg && variant === 'fragrance-ledger'
                      ? 'خريطة الروائح'
                      : isBiteRush
                        ? 'مسارات سريعة'
                        : isCafeDemo
                          ? 'ركنة اليوم'
                          : isSmartBazaar
                            ? 'مسارات ذكية'
                            : variant === 'elessi-digital-departments'
                              ? 'أقسام الأجهزة'
                              : variant === 'elessi-bag-categories'
                                ? 'أقسام حسب الاستخدام'
                                : variant === 'elessi-organic-routes'
                                  ? 'مسارات الحصاد'
                                  : variant === 'elessi-plant-categories'
                                    ? 'مسارات النباتات'
                                    : variant === 'elessi-bike-panels'
                                      ? 'مسارات الركوب'
                                      : isElessiVariant
                                        ? 'مسارات التسوق'
                                        : variant === 'fragrance-ledger'
                                          ? 'Fragrance routes'
                                          : variant === 'catalog-pills'
                                            ? 'Quick Departments'
                                            : variant ===
                                                'retail-category-tiles'
                                              ? 'Retail Direct'
                                              : variant ===
                                                  'pastel-category-lane'
                                                ? 'Pastel Routes'
                                                : variant ===
                                                    'tech-decision-lanes'
                                                  ? 'Tech Lanes'
                                              : variant ===
                                                  'travel-postcards'
                                                ? 'بطاقات الرحلة'
                                                    : variant ===
                                                        'legacy-circle-categories'
                                                      ? 'Categories'
                                                      : isFakhama
                                                        ? 'المجموعات الفاخرة'
                                                        : isKidsPlay
                                                          ? '✦ وقت المرح'
                                                          : isNovaMobile
                                                            ? 'Techno Curation'
                                                            : theme?.direction === 'rtl'
                                                              ? 'مجموعات مختارة'
                                                              : 'Curated Collections'}
              </span>
            ) : null}
            <h2
              className={`text-2xl tracking-tight text-foreground md:text-3xl font-heading ${
                variant === 'catalog-pills' ||
                variant === 'retail-category-tiles'
                  ? 'font-semibold'
                  : 'font-black'
              }`}
            >
              {title}
            </h2>
            {!hideSubtitle ? (
              <p
                className={`max-w-2xl text-sm leading-7 md:text-base ${
                  variant === 'catalog-pills' ||
                  variant === 'retail-category-tiles'
                    ? 'text-[#6b7280]'
                    : 'text-muted-foreground'
                }`}
              >
                {subtitle}
              </p>
            ) : null}
          </div>

          {ctaHref && !hideSectionCta ? (
            <Link
              to={ctaHref}
              className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${
                isSoleaFemme
                  ? 'border border-primary/12 bg-background/92 text-foreground shadow-sm hover:bg-primary hover:text-primary-foreground'
                  : isBiteRush
                    ? 'bg-[#171717] text-white shadow-[0_18px_44px_-26px_rgba(17,17,17,0.6)] hover:bg-[#dc2626]'
                    : isCafeDemo
                      ? 'bg-[#4b2e1f] text-[#f8eadf] shadow-[0_18px_44px_-26px_rgba(75,46,31,0.42)] hover:bg-[#6f4a33]'
                      : isSmartBazaar
                        ? 'bg-primary text-primary-foreground shadow-[0_18px_48px_-30px_hsl(var(--primary)/0.6)] hover:brightness-110'
                        : isElessiVariant
                          ? 'border border-[#e7d8cb] bg-white text-[#6b4a3c] shadow-[0_18px_48px_-34px_rgba(91,57,40,0.18)] hover:border-[#c79f8b] hover:bg-[#fdf5ee]'
                          : variant === 'catalog-pills'
                            ? 'border border-[#e5e7eb] bg-white text-[#111827] shadow-[0_10px_24px_-22px_rgba(15,23,42,0.12)] hover:border-[#d1d5db] hover:bg-[#f8fafc]'
                            : variant === 'retail-category-tiles'
                              ? 'border border-[#111111] bg-white text-[#111111] shadow-[0_14px_26px_-20px_rgba(17,17,17,0.14)] hover:border-[#f59e0b] hover:bg-[#fff7ed]'
                              : variant === 'tech-decision-lanes'
                                ? 'bg-[#1f242c] text-[#fff4d1] shadow-[0_22px_56px_-34px_rgba(31,36,44,0.48)] hover:bg-[#10151d]'
                                : variant === 'gallery-columns'
                                  ? 'border-b border-[#1f1916] rounded-none bg-transparent px-0 py-0 text-[#1f1916] shadow-none hover:border-[#8a6a3c] hover:text-[#8a6a3c]'
                                : variant === 'travel-postcards'
                                  ? 'border border-[#decebf] bg-white text-[#4f3a2d] shadow-[0_18px_48px_-36px_rgba(96,72,52,0.24)] hover:border-[#bea489] hover:bg-[#fff8f0]'
                                  : variant === 'legacy-circle-categories'
                                    ? 'border border-[#111111] bg-white text-[#111111] hover:bg-[#111111] hover:text-white'
                                    : isFakhama
                                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105'
                                      : isKidsPlay
                                        ? 'bg-secondary text-secondary-foreground shadow-[0_8px_20px_-6px_hsl(var(--secondary)/0.6)] hover:scale-105 active:scale-95'
                                        : 'border border-border bg-background text-foreground hover:bg-muted'
              }`}
            >
              {ctaText}
            </Link>
          ) : null}
        </div>

        {isLoading && categories.length === 0 ? (
          <div
            className={`grid grid-cols-1 ${
              variant === 'catalog-pills'
                ? 'gap-3 sm:grid-cols-3 xl:grid-cols-6'
                : variant === 'gallery-columns'
                  ? 'gap-5 md:grid-cols-3'
                : variant === 'fast-nav-grid'
                  ? 'gap-4 sm:grid-cols-2 xl:grid-cols-4'
                  : variant === 'tech-decision-lanes'
                    ? 'gap-4 xl:grid-cols-2'
                    : 'gap-5 sm:grid-cols-2 xl:grid-cols-3'
            }`}
          >
            {Array.from({ length: limit }).map((_, index) => (
              <div
                key={`collection-skeleton-${index}`}
                className="overflow-hidden rounded-[var(--radius)] border border-border bg-card animate-pulse"
              >
                <div className="aspect-[4/3] bg-muted" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-2/3 rounded bg-muted" />
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-4 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : isElessiVariant ? (
          <ElessiCategoryVariants ctrl={ctrl} />
        ) : isSpecializedVariant(variant, isDistrictMarket) ? (
          <SpecializedLanesVariants ctrl={ctrl} />
        ) : (
          <StandardGridVariant ctrl={ctrl} />
        )}
      </div>
    </section>
  );
};
