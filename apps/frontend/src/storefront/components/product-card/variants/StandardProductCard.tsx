import React from 'react';
import { ShoppingCart, Plus, Eye, Star } from 'lucide-react';
import StorefrontProductImage from '../../StorefrontProductImage';
import { ProductCardController } from '../productCardTypes';

export const StandardProductCard: React.FC<{ ctrl: ProductCardController }> = ({ ctrl }) => {
  const {
    variant,
    CardShell,
    isAirlume,
    isSoleaFemme,
    isFakhama,
    isZenOrganic,
    imageCandidates,
    name,
    resolvedImageLoading,
    resolvedImageFetchPriority,
    renderImageFallback,
    features,
    discountPercentage,
    FloatingIcons,
    DiscountBadge,
    UrgencyBadge,
    categoryLabel,
    formattedPrice,
    formattedComparePrice,
    handleAddToCart,
    actionLabel,
    handleQuickView,
    detailLabel,
    isHovered,
    hasDiscount,
    hasVariantChoices,
    ratingValue,
    reviewCount,
    isRtl,
  } = ctrl;

  if (variant === 'overlay') {
    return (
      <CardShell
        className={`group relative flex h-full flex-col overflow-hidden aspect-[4/5] ${
          isAirlume
            ? 'rounded-[1.9rem] border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,246,255,0.6))] shadow-[0_34px_95px_-58px_hsl(var(--primary)/0.62)]'
            : isSoleaFemme
            ? 'rounded-[1.7rem] border border-primary/10 bg-card shadow-[0_32px_95px_-55px_hsl(var(--primary)/0.85)]'
            : 'rounded-[var(--radius)] border border-border bg-card'
        }`}
      >
        <StorefrontProductImage
          candidates={imageCandidates}
          alt={name}
          loading="lazy"
          width="400"
          height="500"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          fallback={renderImageFallback('absolute inset-0')}
        />
        {features.gridDiscountBanner && discountPercentage ? (
          <span className="absolute start-4 top-4 z-10 inline-flex rounded-full bg-accent px-3 py-1 text-xs font-black text-accent-foreground shadow-sm">
            -{discountPercentage}%
          </span>
        ) : null}

        <FloatingIcons />

        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            isAirlume
              ? 'bg-[linear-gradient(180deg,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0.2)_44%,rgba(15,23,42,0.88)_100%)] opacity-100'
              : isSoleaFemme
              ? 'bg-[linear-gradient(180deg,rgba(24,20,16,0.08)_10%,rgba(24,20,16,0.75)_100%)] opacity-100'
              : 'bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100'
          }`}
        />

        <div
          className={`absolute bottom-0 start-0 end-0 flex flex-col items-start gap-2 p-6 text-white transition-all duration-300 ${
            isAirlume || isSoleaFemme
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
          }`}
        >
          {isSoleaFemme || isAirlume ? (
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black tracking-[0.2em] uppercase backdrop-blur ${
                isAirlume
                  ? 'border-white/30 bg-white/92 text-slate-950 shadow-sm'
                  : 'border-white/20 bg-white/10 text-white/85'
              }`}
            >
              {categoryLabel}
            </span>
          ) : null}
          <h3 className="font-heading text-xl font-semibold leading-tight text-white drop-shadow-md">
            {name}
          </h3>
          <div dir="ltr" className="flex items-center gap-2 font-sans">
            <p className="font-medium text-white/95">{formattedPrice}</p>
            {formattedComparePrice ? (
              <p className="text-sm text-white/70 line-through">{formattedComparePrice}</p>
            ) : null}
          </div>
          <button
            onClick={handleAddToCart}
            className={`mt-2 flex w-full items-center justify-center gap-2 rounded-[var(--button-radius,0.375rem)] py-2.5 text-sm font-semibold transition-colors ${
              isAirlume
                ? 'rounded-full bg-[linear-gradient(135deg,#0f172a_0%,hsl(var(--primary))_60%,#60a5fa_100%)] text-white shadow-[0_24px_70px_-34px_hsl(var(--primary)/0.65)] hover:opacity-95'
                : isSoleaFemme
                ? 'bg-white text-black shadow-lg hover:bg-white/92'
                : 'bg-white text-black hover:bg-white/90'
            }`}
          >
            <ShoppingCart size={16} />
            {actionLabel}
          </button>
        </div>
      </CardShell>
    );
  }

  // Default / Standard Card
  return (
    <CardShell
      className={`group relative flex flex-col overflow-hidden text-card-foreground transition-all duration-300 ${
        isAirlume
          ? 'rounded-[1.7rem] border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.86))] shadow-[0_30px_90px_-56px_hsl(var(--primary)/0.58)] hover:-translate-y-1 hover:shadow-[0_38px_110px_-54px_hsl(var(--primary)/0.62)]'
          : isSoleaFemme
          ? 'rounded-[1.6rem] border border-primary/10 bg-card shadow-[0_28px_90px_-58px_hsl(var(--primary)/0.88)] hover:-translate-y-1 hover:shadow-[0_34px_95px_-52px_hsl(var(--primary)/0.92)]'
          : isFakhama
            ? 'rounded-[var(--radius)] border border-border bg-card shadow-md transition-all duration-500 hover:border-accent hover:shadow-2xl hover:shadow-primary/5 group-hover:-translate-y-1.5'
            : 'rounded-[var(--radius)] border border-border bg-card hover:shadow-lg'
      }`}
    >
      <div
        className={`relative overflow-hidden ${
          isAirlume
            ? 'aspect-[4/5] bg-[linear-gradient(180deg,hsl(var(--secondary)),hsl(var(--muted)))]'
            : isSoleaFemme
              ? 'aspect-[4/5] bg-[linear-gradient(180deg,hsl(var(--secondary)),hsl(var(--muted)))]'
              : 'aspect-square bg-muted'
        }`}
      >
        <StorefrontProductImage
          candidates={imageCandidates}
          alt={name}
          loading={resolvedImageLoading}
          fetchpriority={resolvedImageFetchPriority}
          width="400"
          height="400"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          fallback={renderImageFallback()}
        />
        <div className="absolute start-3 top-3 z-10 flex flex-wrap gap-1.5">
          <DiscountBadge />
          <UrgencyBadge />
          {isZenOrganic && !discountPercentage ? (
            <span className="inline-flex rounded-full bg-[#1a3328] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              جديد
            </span>
          ) : null}
        </div>
        {isZenOrganic && (
          <div
            className={`absolute inset-0 flex items-center justify-center gap-3 bg-black/5 opacity-0 transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : ''
            }`}
          >
            <button
              onClick={handleAddToCart}
              className="h-11 w-11 rounded-full bg-white text-[#1a3328] shadow-xl transition-all hover:scale-110 hover:bg-[#88a876] hover:text-white"
              title={actionLabel}
            >
              <ShoppingCart size={18} className="mx-auto" />
            </button>
            <button
              onClick={handleQuickView}
              className="h-11 w-11 rounded-full bg-white text-[#1a3328] shadow-xl transition-all hover:scale-110 hover:bg-[#1a3328] hover:text-white"
              title="عرض سريع"
            >
              <Eye size={18} className="mx-auto" />
            </button>
          </div>
        )}
        {isAirlume || isSoleaFemme || isFakhama ? (
          <>
            <div
              className={`absolute inset-x-0 bottom-0 h-28 ${
                isAirlume
                  ? 'bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.24))]'
                  : isFakhama
                    ? 'bg-gradient-to-t from-black/20 via-black/5 to-transparent'
                    : 'bg-[linear-gradient(180deg,transparent,rgba(24,20,16,0.18))]'
              }`}
            />
            <span
              className={`absolute bottom-3 start-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-bold backdrop-blur transition-transform duration-500 group-hover:scale-110 ${
                isAirlume
                  ? 'border-white/60 bg-white/90 text-slate-950 shadow-sm'
                  : isFakhama
                    ? 'border-white/30 bg-primary text-primary-foreground'
                    : 'border-white/30 bg-background/88 text-foreground'
              }`}
            >
              {categoryLabel}
            </span>
          </>
        ) : null}
        <FloatingIcons />
      </div>

      <div className={`flex flex-grow flex-col space-y-2 p-4 ${isAirlume || isSoleaFemme ? 'md:p-5' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <h3
            className={`font-heading text-base leading-tight ${
              isAirlume || isSoleaFemme ? 'line-clamp-2 font-black' : 'truncate font-semibold'
            }`}
          >
            {name}
          </h3>
          {isAirlume && hasDiscount ? (
            <span className="shrink-0 rounded-full border border-primary/10 bg-white px-2.5 py-1 text-[11px] font-black text-primary shadow-sm">
              Sale
            </span>
          ) : isSoleaFemme && hasDiscount ? (
            <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
              Edit
            </span>
          ) : null}
          {isZenOrganic && (
            <span className="mt-1 inline-flex rounded-full bg-[#f1f3ee] px-2.5 py-1 text-[11px] font-bold text-[#688059]">
              {hasVariantChoices ? 'أكثر من خيار' : 'اختيار يومي هادئ'}
            </span>
          )}
        </div>

        {(ratingValue || reviewCount) ? (
          <div className="flex items-center gap-1 text-[#f59e0b]">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={`std-star-${index}`}
                  size={11}
                  fill={ratingValue && index < Math.round(ratingValue) ? 'currentColor' : 'none'}
                />
              ))}
            </div>
            {reviewCount ? (
              <span className="font-sans text-[11px] text-muted-foreground">
                ({reviewCount})
              </span>
            ) : null}
          </div>
        ) : null}

        {isAirlume ? (
          <p className="text-xs leading-6 text-muted-foreground">
            {hasDiscount
              ? `توفير ${discountPercentage}% على القطعة مع عرض بصري أقوى وقرار أسرع.`
              : 'عرض أنظف للمنتجات الأساسية داخل واجهات البيع الحديثة.'}
          </p>
        ) : isSoleaFemme ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {hasDiscount
              ? `توفير ${discountPercentage}% على هذا الموديل لفترة محدودة.`
              : 'اختيار ناعم يناسب الشغل والخروجات اليومية.'}
          </p>
        ) : isZenOrganic ? (
          <span className="pt-1 text-xs font-bold uppercase tracking-[0.2em] text-[#688059]">
            {detailLabel}
          </span>
        ) : null}

        <div className="mt-auto pt-2">
          {features.gridAddToCartIcon ? (
            <div className="flex items-center justify-between gap-2">
              <div dir="ltr" className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-sans min-w-0">
                <p className={`text-sm font-bold ${isZenOrganic ? 'text-[#1a3328]' : 'text-primary'}`}>
                  {formattedPrice}
                </p>
                {formattedComparePrice ? (
                  <p className="text-xs text-muted-foreground line-through decoration-1">
                    {formattedComparePrice}
                  </p>
                ) : null}
              </div>
              <button
                onClick={handleAddToCart}
                className="z-10 rounded-full bg-primary p-2.5 sm:p-3 text-primary-foreground shadow-md transition-all duration-300 hover:scale-105 active:scale-95 shrink-0"
                title={actionLabel}
                aria-label={actionLabel}
              >
                <Plus size={18} />
              </button>
            </div>
          ) : (
            <>
              <div dir="ltr" className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-sans mb-2 ${isRtl ? 'justify-end' : ''}`}>
                <p className={`text-sm font-bold ${isZenOrganic ? 'text-[#1a3328]' : 'text-primary'}`}>
                  {formattedPrice}
                </p>
                {formattedComparePrice ? (
                  <p className="text-xs text-muted-foreground line-through decoration-1">
                    {formattedComparePrice}
                  </p>
                ) : null}
              </div>
              <div className="relative z-10 flex items-center w-full mt-1">
                <button
                  onClick={handleAddToCart}
                  className="flex flex-1 w-full items-center justify-center gap-1.5 rounded-[var(--button-radius,0.375rem)] py-2 px-3 text-xs font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-95"
                  title={actionLabel}
                  aria-label={actionLabel}
                >
                  <ShoppingCart size={14} />
                  <span>
                    {hasVariantChoices
                      ? isRtl
                        ? 'اختيار المقاس والطلب'
                        : 'Select Size & Order'
                      : isRtl
                      ? 'أضف للسلة'
                      : 'Add to Cart'}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </CardShell>
  );
};
