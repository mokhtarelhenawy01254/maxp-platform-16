import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import type { Product } from '../../../hooks/useProducts';
import type { StorefrontTheme } from '../../../types/theme.types';
import { formatStorefrontCurrency } from '../../../utils/currency';
import VariantSelector from '../../../components/VariantSelector';
import QuantitySelector from '../../../components/QuantitySelector';
import Button from '../../../components/Button';
import StorefrontProductImage from '../../../components/StorefrontProductImage';
import ProductDescription from '../components/ProductDescription';
import ConfigurableTrustBadges from '../components/ConfigurableTrustBadges';

export interface ZenOrganicBuyboxProps {
  product: Product;
  theme: StorefrontTheme;
  homePath: string;
  shopPath: string;
  breadcrumbHomeLabel: string;
  breadcrumbShopLabel: string;
  selectedPrimaryImage?: string;
  ratingAverage: number;
  ratingCount: number;
  activePrice: number;
  activeComparePrice: number | null;
  currency: string;
  discount: number | null;
  selectedVariant: any;
  selectedAttributes: Record<string, string>;
  setSelectedAttributes: (attrs: Record<string, string>) => void;
  variantSettings: any;
  quantity: number;
  setQuantity: (val: number | ((prev: number) => number)) => void;
  isAddingToCart: boolean;
  handleAddToCart: () => Promise<void>;
  prefersArabicCopy: boolean;
  safeDescription: string;
  descriptionPreviewText: string;
  guaranteesTitle?: string;
  guaranteesSubtitle?: string;
  guaranteeItems: string[];
  guaranteeStyle?: any;
}

export const ZenOrganicBuybox: React.FC<ZenOrganicBuyboxProps> = ({
  product,
  theme,
  homePath,
  shopPath,
  breadcrumbHomeLabel,
  breadcrumbShopLabel,
  selectedPrimaryImage,
  ratingAverage,
  ratingCount,
  activePrice,
  activeComparePrice,
  currency,
  discount,
  selectedVariant,
  selectedAttributes,
  setSelectedAttributes,
  variantSettings,
  quantity,
  setQuantity,
  isAddingToCart,
  handleAddToCart,
  prefersArabicCopy,
  safeDescription,
  descriptionPreviewText,
  guaranteesTitle,
  guaranteesSubtitle,
  guaranteeItems,
  guaranteeStyle,
}) => {
  return (
      <section className="w-full bg-background scroll-mt-20">
        <div className="space-y-6">
          <nav className="flex w-fit items-center gap-2 rounded-full border border-[#d9e1d2] bg-white/88 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#6f7d66] shadow-sm">
            <Link to={homePath} className="transition-colors hover:text-[#1a3328]">
              {breadcrumbHomeLabel}
            </Link>
            <span>/</span>
            <Link to={shopPath} className="transition-colors hover:text-[#1a3328]">
              {breadcrumbShopLabel}
            </Link>
            <span>/</span>
            <span className="max-w-[18rem] truncate text-[#1a3328]">{product.name}</span>
          </nav>

          <div className="rounded-[2rem] border border-[#dbe3d3] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,243,238,0.94))] p-5 shadow-[0_30px_90px_-62px_rgba(26,51,40,0.3)] md:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-[#d5ddca] bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#688059] shadow-sm">
                {zenCategoryLabel}
              </span>
              {discount ? (
                <span className="inline-flex rounded-full bg-[#88a876] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-sm">
                  وفر {discount}%
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-[#f1f3ee] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#688059]">
                  اختيار يومي هادئ
                </span>
              )}
            </div>

            <div className="mt-4 space-y-4">
              <h1 className="font-heading text-3xl font-black leading-tight text-[#1a3328] md:text-4xl">
                {product.name}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[#4f5f4c] md:text-lg">
                {shortDescription || 'سيظهر وصف هذا المنتج هنا بمجرد إضافة محتوى أوضح من لوحة الإدارة.'}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-end gap-4">
              <div dir="ltr" className="space-y-1 font-sans">
                <p className="text-3xl font-black text-[#1a3328]">{displayPrice}</p>
                {originalPrice ? (
                  <p className="text-sm text-[#708269] line-through decoration-[#aab6a4]">
                    {originalPrice}
                  </p>
                ) : null}
              </div>

              <div className="grid flex-1 gap-3 md:grid-cols-3">
                {zenQuickFacts.map((fact) => (
                  <div
                    key={fact.label}
                    className="rounded-[1.35rem] border border-[#dde5d7] bg-white/90 px-4 py-3 shadow-sm"
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8a9684]">
                      {fact.label}
                    </p>
                    <p className="mt-2 text-sm font-bold leading-6 text-[#1a3328]">
                      {fact.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {sizeGuideHref || fitNote ? (
            <div className="rounded-[1.75rem] border border-[#dbe3d3] bg-white/86 p-5 shadow-[0_22px_60px_-54px_rgba(26,51,40,0.32)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-black text-[#1a3328]">
                    دليل الأحجام والاختيار
                  </p>
                  <p className="text-sm leading-7 text-[#5a6956]">
                    {fitNote || 'راجع الأحجام أو الأبعاد أو سعة المنتج قبل الإضافة للسلة للحصول على اختيار أنسب.'}
                  </p>
                </div>

                {sizeGuideHref ? (
                  isExternalHref(sizeGuideHref) ? (
                    <a
                      href={sizeGuideHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-full border border-[#cfd8c7] bg-[#f6f7f2] px-5 py-2.5 text-sm font-black text-[#1a3328] transition-all hover:-translate-y-0.5 hover:border-[#88a876] hover:text-[#688059]"
                    >
                      {sizeGuideText || 'دليل الأحجام'}
                    </a>
                  ) : (
                    <Link
                      to={sizeGuideHref}
                      className="inline-flex items-center justify-center rounded-full border border-[#cfd8c7] bg-[#f6f7f2] px-5 py-2.5 text-sm font-black text-[#1a3328] transition-all hover:-translate-y-0.5 hover:border-[#88a876] hover:text-[#688059]"
                    >
                      {sizeGuideText || 'دليل الأحجام'}
                    </Link>
                  )
                ) : null}
              </div>
            </div>
          ) : null}

          {product.productVariants && product.productVariants.length > 0 && (
            <div
              id={hasEmbeddedPdpCheckout ? STOREFRONT_BUYBOX_ID : undefined}
              className="rounded-[1.75rem] border border-[#dbe3d3] bg-white/90 p-5 shadow-[0_20px_56px_-52px_rgba(26,51,40,0.28)]"
            >
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#8a9684]">
                الخيارات المتاحة
              </p>
              <VariantSelector
                variants={product.productVariants}
                selectedAttributes={selectedAttributes}
                onChange={setSelectedAttributes}
                variantSettings={variantSettings}
              />
            </div>
          )}

          {externalOnlyProduct ? (
            <div id={STOREFRONT_BUYBOX_ID} className="rounded-[1.75rem] border border-[#dbe3d3] bg-white/92 p-5 shadow-[0_22px_60px_-52px_rgba(26,51,40,0.28)]">
              {renderExternalPurchaseCta('card')}
            </div>
          ) : shouldRenderPrimaryBuyBox ? (
            <div className="space-y-3">
              <div
                id={STOREFRONT_BUYBOX_ID}
                className="flex flex-col gap-4 rounded-[1.75rem] border border-[#dbe3d3] bg-white/92 p-4 shadow-[0_22px_60px_-52px_rgba(26,51,40,0.28)] sm:flex-row sm:items-center"
              >
                <QuantitySelector value={quantity} onChange={setQuantity} />
                <Button
                  size="lg"
                  fullWidth
                  onClick={handleAddToCart}
                  className="h-12 rounded-full border-none bg-[linear-gradient(135deg,#1a3328_0%,#476343_100%)] text-base font-black text-white shadow-[0_20px_50px_-24px_rgba(26,51,40,0.55)] transition-all hover:opacity-95"
                >
                  {addToCartText}
                </Button>
              </div>
              {showExternalAffiliateCta ? renderExternalPurchaseCta('inline') : null}
            </div>
          ) : showExternalAffiliateCta ? renderExternalPurchaseCta('inline') : null}

          <div className="grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="rounded-[1.85rem] border border-[#dbe3d3] bg-white/90 p-5 shadow-[0_24px_70px_-54px_rgba(26,51,40,0.24)] md:p-6">
              {inlinePdpQuickOrderBeforeDescription ? (
                <div className="mb-6">
                  {inlinePdpQuickOrderBeforeDescription}
                </div>
              ) : null}
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8a9684]">
                    {descriptionTitle}
                  </p>
                  <div className="mt-4">
                    {safeDescription ? (
                      <ProductDescription
                        safeDescription={safeDescription}
                        emptyText={
                          prefersArabicCopy
                            ? 'لا يوجد وصف متاح لهذا المنتج حتى الآن.'
                            : 'No description is available for this product yet.'
                        }
                      />
                    ) : (
                      <p className="max-w-2xl text-base leading-8 text-[#4f5f4c]">
                        لا يوجد وصف مفصل لهذا المنتج بعد. أضف وصفًا أوضح من لوحة الإدارة ليظهر هنا بشكل احترافي.
                      </p>
                    )}
                  </div>
                </div>
                {inlinePdpQuickOrderAfterDescription ? (
                  <div>
                    {inlinePdpQuickOrderAfterDescription}
                  </div>
                ) : null}

                <div className="border-t border-[#e4eadf] pt-6">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8a9684]">
                    {shippingTitle}
                  </p>
                  <p className="mt-4 max-w-2xl text-sm leading-8 text-[#4f5f4c]">
                    {shippingText}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.85rem] border border-[#dbe3d3] bg-[linear-gradient(180deg,rgba(246,247,242,0.96),rgba(255,255,255,0.96))] p-5 shadow-[0_24px_70px_-54px_rgba(26,51,40,0.22)]">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8a9684]">
                  ملاحظات سريعة
                </p>
                <div className="mt-4 grid gap-3">
                  {[
                    'اختيار المقاس أو الوعاء المناسب يقلل الحاجة للاستبدال بعد الشراء.',
                    'الشحن يحسب حسب المحافظة داخل صفحة الدفع ليبقى السعر النهائي واضحًا.',
                    'عند التردد بين خيارين، ابدأ بما يناسب المساحة الفعلية لا الصورة فقط.',
                  ].map((note) => (
                    <div
                      key={note}
                      className="rounded-[1.2rem] border border-[#e2e9dd] bg-white/90 px-4 py-3 text-sm leading-7 text-[#3f4f3d]"
                    >
                      {note}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.85rem] border border-[#dbe3d3] bg-white/92 p-5 shadow-[0_24px_70px_-54px_rgba(26,51,40,0.22)]">
                <ConfigurableTrustBadges
                  title={guaranteesTitle}
                  subtitle={guaranteesSubtitle}
                  items={guaranteeItems.length ? guaranteeItems : undefined}
                  variant={guaranteeStyle}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
};

export default ZenOrganicBuybox;