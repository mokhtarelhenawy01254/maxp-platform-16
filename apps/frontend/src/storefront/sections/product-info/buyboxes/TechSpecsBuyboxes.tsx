import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, RotateCcw, Share2, Sparkles, ChevronDown } from 'lucide-react';
import type { Product } from '../../../hooks/useProducts';
import type { StorefrontTheme } from '../../../types/theme.types';
import { formatStorefrontCurrency } from '../../../utils/currency';
import VariantSelector from '../../../components/VariantSelector';
import QuantitySelector from '../../../components/QuantitySelector';
import Button from '../../../components/Button';
import StorefrontProductImage from '../../../components/StorefrontProductImage';
import ProductDescription from '../components/ProductDescription';
import ConfigurableTrustBadges from '../components/ConfigurableTrustBadges';
import { SpecsGrid, BentoSpecs } from './SpecsBuyboxes';

export interface TechSpecsBuyboxesProps {
  variant: string;
  product: Product;
  theme: StorefrontTheme;
  isPcHubCommandSpecs: boolean;
  commandFacts: Array<{ label: string; value: string }>;
  specs: Array<{ label: string; value: string }>;
  prefersArabicCopy: boolean;
  displayPrice: string;
  originalPrice: string | null;
  pcHubDecisionBadge?: string;
  pcHubDecisionTitle?: string;
  pcHubDecisionDescription?: string;
  pcHubUseCases: string[];
  shortDescription?: string;
  commandSpecsDescriptionFallback: string;
  commandSpecsActions: React.ReactNode;
  commonVariantSelector: React.ReactNode;
  commandSpecsTrustBadges: React.ReactNode;
  inlinePdpQuickOrderBeforeDescription?: React.ReactNode;
  inlinePdpQuickOrderAfterDescription?: React.ReactNode;
  safeDescription: string;
  commandSpecsReviewCount: number;
  commandSpecsRating: number | null;
  commandSpecsReviewSummaryLabel?: string;
  specGridEmptyText?: string;
  bentoEmptyText?: string;
  gearTagValues: string[];
  gearCategoryLabel: string;
  gearShareActions: React.ReactNode;
  gearVariantSelector: React.ReactNode;
  gearActions: React.ReactNode;
  gearDecisionProofs: Array<{ title: string; description: string }>;
  guaranteesTitle?: string;
  guaranteesSubtitle?: string;
  guaranteeItems: string[];
  guaranteeStyle?: any;
}

export const TechSpecsBuyboxes: React.FC<TechSpecsBuyboxesProps> = ({
  variant,
  product,
  theme,
  isPcHubCommandSpecs,
  commandFacts,
  specs,
  prefersArabicCopy,
  displayPrice,
  originalPrice,
  pcHubDecisionBadge,
  pcHubDecisionTitle,
  pcHubDecisionDescription,
  pcHubUseCases,
  shortDescription,
  commandSpecsDescriptionFallback,
  commandSpecsActions,
  commonVariantSelector,
  commandSpecsTrustBadges,
  inlinePdpQuickOrderBeforeDescription,
  inlinePdpQuickOrderAfterDescription,
  safeDescription,
  commandSpecsReviewCount,
  commandSpecsRating,
  commandSpecsReviewSummaryLabel,
  specGridEmptyText,
  bentoEmptyText,
  gearTagValues,
  gearCategoryLabel,
  gearShareActions,
  gearVariantSelector,
  gearActions,
  gearDecisionProofs,
  guaranteesTitle,
  guaranteesSubtitle,
  guaranteeItems,
  guaranteeStyle,
}) => {
  if (variant === 'command-specs') {
    const commandSpecsFacts =
      ((isPcHubCommandSpecs && commandFacts.length > 0
        ? commandFacts
        : specs.length > 0
        ? specs
        : [
            {
              label: prefersArabicCopy ? 'السعر الحالي' : 'Current price',
              value: displayPrice,
            },
            {
              label: prefersArabicCopy ? 'الضمان' : 'Warranty',
              value: prefersArabicCopy ? 'موضح قبل الطلب' : 'Shown before checkout',
            },
            {
              label: prefersArabicCopy ? 'الشحن' : 'Shipping',
              value: prefersArabicCopy ? '24-48 ساعة' : '24-48 hours',
            },
            {
              label: prefersArabicCopy ? 'الدعم' : 'Support',
              value: prefersArabicCopy ? 'قبل وبعد الطلب' : 'Before and after purchase',
            },
          ])).slice(0, 4);

    return (
      <section className="w-full overflow-hidden px-1 py-4">
        <div className="overflow-hidden rounded-[2rem] border border-[#1f242c]/10 bg-[linear-gradient(180deg,#fffef8,#f4ecd8)] shadow-[0_34px_96px_-70px_rgba(31,36,44,0.28)]">
          <div className="grid gap-4 border-b border-[#1f242c]/10 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-end">
            <div className="space-y-3">
              <span className="inline-flex rounded-full border border-[#1f242c]/10 bg-[#1f242c] px-3 py-1 text-[11px] font-black tracking-[0.14em] text-[#fff1b8]">
                {isPcHubCommandSpecs ? pcHubDecisionBadge : prefersArabicCopy ? 'المواصفات أولًا' : 'Spec-first retail'}
              </span>
              <h2 className="max-w-[16ch] font-heading text-3xl font-black tracking-tight text-[#1f242c] md:text-[2.2rem]">
                {isPcHubCommandSpecs ? pcHubDecisionTitle : prefersArabicCopy ? 'قرار أوضح قبل الحسم' : 'A clearer decision before checkout'}
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-[#4c5563] md:text-base">
                {isPcHubCommandSpecs
                  ? pcHubDecisionDescription
                  : shortDescription || commandSpecsDescriptionFallback}
              </p>
              {isPcHubCommandSpecs ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {pcHubUseCases.slice(0, 3).map((tag, index) => (
                    <span
                      key={`${tag}-${index}`}
                      className="rounded-full border border-[#1f242c]/10 bg-white/76 px-3 py-1.5 text-xs font-bold text-[#4c5563]"
                    >
                      {prefersArabicCopy
                        ? index === 0
                          ? `مناسب لـ ${tag}`
                          : `يناسب أيضًا ${tag}`
                        : index === 0
                          ? `Best for ${tag}`
                          : `Also fits ${tag}`}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {commandSpecsFacts.map((fact, index) => (
                <div
                  key={`${String(fact.label)}-${index}`}
                  className="rounded-[1.1rem] border border-[#1f242c]/8 bg-white/86 px-4 py-3 shadow-[0_18px_40px_-34px_rgba(31,36,44,0.22)]"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7c818b]">
                    {fact.label}
                  </p>
                  <p className="mt-2 text-sm font-black leading-6 text-[#1f242c]">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {isPcHubCommandSpecs && pcHubDecisionProofs.length > 0 ? (
            <div className="grid gap-3 border-b border-[#1f242c]/10 px-5 py-4 md:grid-cols-3">
              {pcHubDecisionProofs.map((proof, index) => (
                <div
                  key={`${proof.label}-${index}`}
                  className="rounded-[1.15rem] border border-[#1f242c]/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,248,230,0.9))] px-4 py-4 shadow-[0_18px_36px_-32px_rgba(31,36,44,0.18)]"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b58b17]">
                    {proof.label}
                  </p>
                  <h3 className="mt-2 text-base font-black leading-6 text-[#1f242c]">
                    {proof.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#5a6270]">
                    {proof.description}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="p-2 md:p-3">
              <SpecsGrid
                specs={specs}
                header={commandSpecsHeader}
                price={commandSpecsPrice}
                actions={commonActionsWithRef}
                variantSelector={commonVariantSelector}
                emptyStateText={
                prefersArabicCopy
                  ? 'لا توجد مواصفات تقنية مضافة لهذا المنتج حتى الآن.'
                  : 'No technical specifications available for this model yet.'
              }
            />
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'specs-grid') {
    return (
      <section className="w-full bg-background overflow-hidden py-4 px-1">
        <SpecsGrid
          specs={specs}
          header={commonHeader}
          price={commonPrice}
          actions={commonActionsWithRef}
          variantSelector={commonVariantSelector}
          emptyStateText={
            prefersArabicCopy
              ? 'لا توجد مواصفات تقنية مضافة لهذا المنتج حتى الآن.'
              : 'No technical specifications available for this model yet.'
          }
        />
      </section>
    );
  }

  if (variant === 'bento-specs') {
    return (
      <section className="w-full bg-background overflow-hidden py-4 px-1">
        <BentoSpecs
          specs={specs}
          header={commonHeader}
          price={commonPrice}
          actions={commonActionsWithRef}
          variantSelector={commonVariantSelector}
          emptyStateText={
            prefersArabicCopy
              ? 'لا توجد مواصفات تقنية مضافة لهذا المنتج حتى الآن.'
              : 'Technical bento visualization requires product specification metadata.'
          }
        />
      </section>
    );
  }

  if (variant === 'gear-loadout') {
    return (
      <section className="w-full overflow-hidden px-1 py-4">
        <div className="relative isolate overflow-hidden rounded-[2.15rem] border border-cyan-400/15 bg-[linear-gradient(180deg,rgba(3,7,18,0.98),rgba(10,14,29,0.94))] p-5 text-slate-50 shadow-[0_42px_140px_-88px_rgba(34,211,238,0.72)] md:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.14),transparent_28%)]" />
          <div className="pointer-events-none absolute -left-12 top-8 h-32 w-32 rounded-full bg-cyan-400/14 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 bottom-10 h-40 w-40 rounded-full bg-primary/12 blur-3xl" />

          <div className="relative z-10 space-y-6">
            <nav className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              <Link to={homePath} className="transition-colors hover:text-cyan-100">
                {breadcrumbHomeLabel}
              </Link>
              <span>/</span>
              <Link to={shopPath} className="transition-colors hover:text-cyan-100">
                {breadcrumbShopLabel}
              </Link>
              <span>/</span>
              <span className="max-w-[18rem] truncate text-slate-200">{product.name}</span>
            </nav>

            <div className="flex flex-wrap gap-2">
              {gearStatusChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/85"
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
              <div className="space-y-3">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200/70">
                  {gearCategoryLabel}
                </p>
                <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl md:leading-[0.95]">
                  {product.name}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-300 md:text-base md:leading-8">
                  {gearSummaryText}
                </p>
              </div>

              <div className="rounded-[1.6rem] border border-cyan-400/20 bg-white/[0.05] px-5 py-4 shadow-[0_28px_80px_-60px_rgba(34,211,238,0.65)]">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">
                  {prefersArabicCopy ? 'السعر الحالي' : 'Live Price'}
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <span className="text-4xl font-black text-white">{displayPrice}</span>
                  {originalPrice ? (
                    <span className="text-base font-semibold text-slate-400 line-through">
                      {originalPrice}
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 inline-flex rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-200/80">
                  {discount && discount > 0
                    ? prefersArabicCopy
                      ? `وفر ${discount}%`
                      : `Save ${discount}%`
                    : prefersArabicCopy
                      ? 'الشحن واضح عند الدفع'
                      : 'Shipping stays visible at checkout'}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {gearQuickFacts.map((fact) => (
                <div
                  key={`${fact.label}:${fact.value}`}
                  className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4 shadow-[0_20px_50px_-45px_rgba(15,23,42,0.95)]"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/65">
                    {fact.label}
                  </p>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-100">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
              <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_32px_90px_-70px_rgba(15,23,42,0.88)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">
                      {prefersArabicCopy ? 'اختيار الجير' : 'Gear Setup'}
                    </p>
                    <p className="text-sm leading-6 text-slate-300/80">
                      {prefersArabicCopy
                        ? 'ابدأ من النسخة المناسبة ثم أغلق الطلب أو أضف الإكسسوارات في نفس المسار.'
                        : 'Configure the main item first, then complete the order or add matching accessories in the same flow.'}
                    </p>
                  </div>
                  <span className="inline-flex rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-200/75">
                    {product.productVariants && product.productVariants.length > 0
                      ? prefersArabicCopy
                        ? `${product.productVariants.length} خيارات`
                        : `${product.productVariants.length} options`
                      : prefersArabicCopy
                        ? 'قطعة واحدة'
                        : 'Single setup'}
                  </span>
                </div>

                <div className="mt-5">
                  {gearVariantSelector ? (
                    gearVariantSelector
                  ) : (
                    <div className="rounded-[1.35rem] border border-dashed border-white/12 bg-black/20 p-4 text-sm leading-7 text-slate-300/78">
                      {prefersArabicCopy
                        ? 'هذا المنتج جاهز للإضافة المباشرة بدون إعدادات إضافية. لو تريد مقارنة بدائل قريبة ستجدها أسفل الصفحة.'
                        : 'This product is ready for direct checkout without extra configuration. Close alternatives are available lower on the page.'}
                    </div>
                  )}
                </div>
              </div>

              <div ref={buyActionsRef} className="space-y-4">
                {gearMobileQuickNav}

                <div className="rounded-[1.7rem] border border-cyan-400/18 bg-white/[0.05] p-5 shadow-[0_32px_90px_-68px_rgba(34,211,238,0.5)]">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">
                      {prefersArabicCopy ? 'قفل الطلب' : 'Lock The Order'}
                    </p>
                    <p className="text-sm leading-6 text-slate-300/80">
                      {prefersArabicCopy
                        ? 'خذ قرار الشراء من نفس اللوحة مع كمية واضحة ورسائل دعم قبل ما تغلق السلة.'
                        : 'Complete the purchase from the same panel with clear quantity and support cues before checkout.'}
                    </p>
                  </div>

                  <div className="mt-5 space-y-4">
                    {externalOnlyProduct ? (
                      renderExternalPurchaseCta('card')
                    ) : shouldRenderPrimaryBuyBox ? (
                      <>
                        <div
                          id={hasEmbeddedPdpCheckout ? undefined : STOREFRONT_BUYBOX_ID}
                          className="flex flex-col gap-3"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <QuantitySelector value={quantity} onChange={setQuantity} />
                            <button
                              type="button"
                              onClick={handleAddToCart}
                              className="h-14 flex-1 rounded-[1.2rem] border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(6,182,212,0.95),rgba(59,130,246,0.95))] px-5 text-sm font-black uppercase tracking-[0.2em] text-white shadow-[0_24px_70px_-34px_rgba(34,211,238,0.55)] transition-all hover:brightness-105 active:scale-[0.98]"
                            >
                              {addToCartText}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={handleBuyNow}
                            className="h-12 rounded-[1rem] border border-white/12 bg-black/28 text-sm font-black uppercase tracking-[0.18em] text-slate-100 transition-colors hover:border-cyan-300/35 hover:text-cyan-100"
                          >
                            {buyNowText}
                          </button>
                        </div>
                        {showExternalAffiliateCta ? (
                          <div className="pt-1">{renderExternalPurchaseCta('inline')}</div>
                        ) : null}
                      </>
                    ) : showExternalAffiliateCta ? (
                      renderExternalPurchaseCta('block')
                    ) : null}

                    {fallbackPdpQuickOrderInBuyFlow}
                  </div>

                  {gearShareActions}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
              <div
                id={STOREFRONT_PRODUCT_DESCRIPTION_ID}
                className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_32px_96px_-74px_rgba(15,23,42,0.9)] md:p-6"
              >
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">
                    {descriptionTitle}
                  </p>
                  <p className="text-sm leading-6 text-slate-300/78">
                    {prefersArabicCopy
                      ? 'رسالة أوضح عن الاستخدام والميزة الأساسية حتى لا تعتمد الصفحة على الصور وحدها.'
                      : 'A clearer usage and value story so the page does not rely on imagery alone.'}
                  </p>
                </div>

                {inlinePdpQuickOrderBeforeDescription ? (
                  <div className="mt-5">{inlinePdpQuickOrderBeforeDescription}</div>
                ) : null}

                <div className="mt-5">
                  {safeDescription ? (
                    <div
                      className="prose prose-sm max-w-none text-slate-100 prose-headings:text-white prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white prose-a:text-cyan-200"
                      dangerouslySetInnerHTML={{ __html: safeDescription }}
                    />
                  ) : (
                    <p className="text-sm leading-8 text-slate-300/82">
                      {prefersArabicCopy
                        ? 'لا يوجد وصف تفصيلي لهذا المنتج بعد، لكن الصفحة الحالية أبقت المواصفات والشراء والثقة في مسار واحد أوضح.'
                        : 'Detailed copy is not available for this product yet, but the page now keeps specifications, purchase actions, and trust cues in one clearer flow.'}
                    </p>
                  )}
                </div>

                {inlinePdpQuickOrderAfterDescription ? (
                  <div className="mt-5">{inlinePdpQuickOrderAfterDescription}</div>
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_32px_96px_-74px_rgba(15,23,42,0.9)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">
                    {shippingTitle}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-slate-300/82">
                    {shippingText}
                  </p>

                  <div className="mt-5 grid gap-3">
                    {gearSupportItems.map((item, index) => (
                      <div
                        key={`${item.title || 'support'}-${index}`}
                        className="rounded-[1.2rem] border border-white/10 bg-black/22 px-4 py-3"
                      >
                        <p className="text-sm font-black text-white">
                          {item.title || (prefersArabicCopy ? 'ميزة إضافية' : 'Support signal')}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-300/78">
                          {item.description ||
                            (prefersArabicCopy
                              ? 'رسالة ثقة إضافية تساعدك تحسم قبل إغلاق الطلب.'
                              : 'An extra reassurance message that helps close the purchase faster.')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_32px_96px_-74px_rgba(15,23,42,0.9)]">
                  <ConfigurableTrustBadges
                    title={guaranteesTitle}
                    subtitle={guaranteesSubtitle}
                    items={guaranteeItems.length ? guaranteeItems : undefined}
                    variant={guaranteeStyle === 'grid' ? 'minimal' : guaranteeStyle}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }
  return null;
};

export default TechSpecsBuyboxes;