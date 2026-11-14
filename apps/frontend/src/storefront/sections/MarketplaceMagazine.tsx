import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { buildStorefrontPath } from '../utils/paths';
import { getPrimaryProductImage, isStorefrontDemoImage } from '../utils/productImages';
import { useProductGridController } from './product-grid/useProductGridController';
import type { ProductGridProps } from './product-grid/gridTypes';

/**
 * Marketplace magazine block: the department-store demo's middle composition.
 *
 * Two columns in three aligned rows —
 *   narrow rail : cover banner / article list / mini product rail
 *   wide rail   : tabbed product grid / dark promo banner / appliance grid
 * — which is what makes the source page as short as it is. Product tabs and rails reuse the
 * product-grid controller, so prices, images and cart actions stay live.
 */
type MagTab = 'featured' | 'discount' | 'lowest';

interface MagazineArticle {
  title?: string;
  date?: string;
  meta?: string;
  image?: string;
  link?: string;
}

interface MagazineProps extends ProductGridProps {
  settings?: ProductGridProps['settings'] & {
    bannerEyebrow?: string;
    bannerTitle?: string;
    bannerImage?: string;
    bannerLink?: string;
    articles?: MagazineArticle[];
    articlesTitle?: string;
    tabsTitle?: string;
    promoTitle?: string;
    promoText?: string;
    promoImage?: string;
    promoLink?: string;
    promoBadge?: string;
    appliancesTitle?: string;
    appliancesCategorySlug?: string;
    latestTitle?: string;
    tabFeaturedLabel?: string;
    tabDiscountLabel?: string;
    tabLowestLabel?: string;
  };
}

const compareValue = (product: unknown): number => {
  const record = product as Record<string, unknown>;
  const raw = record?.['comparePrice'] ?? record?.['compareAtPrice'];
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : 0;
};

const priceValue = (product: unknown): number => {
  const numeric = Number((product as Record<string, unknown>)?.['price']);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const MarketplaceMagazine: React.FC<MagazineProps> = ({ section, settings }) => {
  const location = useLocation();
  const controller = useProductGridController({ section, settings });
  const [activeTab, setActiveTab] = useState<MagTab>('featured');
  const isRtl =
    typeof document !== 'undefined'
      ? document.documentElement.dir === 'rtl'
      : false;

  const tabs: Array<{ key: MagTab; label: string }> = [
    { key: 'featured', label: (settings?.tabFeaturedLabel as string) || (isRtl ? 'منتجات مميزة' : 'Featured') },
    { key: 'discount', label: (settings?.tabDiscountLabel as string) || (isRtl ? 'الأكثر شعبية' : 'Popular / Deals') },
    { key: 'lowest', label: (settings?.tabLowestLabel as string) || (isRtl ? 'الأقل سعرًا' : 'Lowest Price') },
  ];

  const products = useMemo(() => {
    const list = [...(controller.filteredProducts || [])];
    if (activeTab === 'lowest') return list.sort((a, b) => priceValue(a) - priceValue(b));
    if (activeTab === 'discount') {
      return list.sort((a, b) => {
        const compA = compareValue(a);
        const prA = priceValue(a);
        const discA = compA > prA && prA > 0 ? (compA - prA) / compA : 0;
        const compB = compareValue(b);
        const prB = priceValue(b);
        const discB = compB > prB && prB > 0 ? (compB - prB) / compB : 0;
        if (discB !== discA) return discB - discA;
        return prB - prA;
      });
    }
    return list;
  }, [controller.filteredProducts, activeTab]);

  const appliancesCategoryTarget = String(
    settings?.appliancesCategorySlug || (settings as Record<string, unknown>)?.['appliancesCategoryId'] || ''
  ).trim().toLowerCase();

  const applianceProducts = useMemo(() => {
    const all = controller.filteredProducts || [];
    if (appliancesCategoryTarget) {
      const filtered = all.filter((p) => {
        const cat = (p as any)?.category;
        const catStr = String(
          (p as any)?.categorySlug ||
          cat?.slug ||
          cat?.name ||
          (p as any)?.categoryName ||
          (typeof cat === 'string' ? cat : '')
        ).toLowerCase();
        return catStr.includes(appliancesCategoryTarget);
      });
      if (filtered.length > 0) return filtered;
    }
    if (all.length > 10) {
      return all.slice(5, 13);
    }
    return all.slice(0, 8);
  }, [controller.filteredProducts, appliancesCategoryTarget]);

  const latestProducts = useMemo(() => {
    const all = controller.filteredProducts || [];
    if (all.length > 6) {
      return all.slice(-3);
    }
    return all.slice(0, 3);
  }, [controller.filteredProducts]);

  const scoped = (href?: string) =>
    href ? buildStorefrontPath(location.pathname, href.startsWith('/') ? href : `/${href}`, location.search) : '#';

  const featuredBannerProduct = useMemo(() => {
    const list = controller.filteredProducts || [];
    return list.find((p: any) => p.isFeatured) || list[0];
  }, [controller.filteredProducts]);

  const rawBannerImage = settings?.bannerImage || '';
  const hasCustomBanner = rawBannerImage && !isStorefrontDemoImage(rawBannerImage);

  const banner = {
    eyebrow: hasCustomBanner
      ? (settings?.bannerEyebrow || 'Urbanears')
      : ((featuredBannerProduct as any)?.category?.name || (isRtl ? 'منتج مميز' : 'Featured Product')),
    title: hasCustomBanner
      ? (settings?.bannerTitle || (isRtl ? 'جاهز لصوت يبهرك' : 'Ready for immersive sound'))
      : (featuredBannerProduct?.name || settings?.bannerTitle || (isRtl ? 'جاهز لصوت يبهرك' : 'Ready for immersive sound')),
    image: hasCustomBanner
      ? rawBannerImage
      : (featuredBannerProduct ? getPrimaryProductImage(featuredBannerProduct) : '') || rawBannerImage,
    link: hasCustomBanner
      ? (settings?.bannerLink || '/shop')
      : (featuredBannerProduct ? `/product/${(featuredBannerProduct as any).slug || (featuredBannerProduct as any).id}` : (settings?.bannerLink || '/shop')),
  };

  const promoProduct = useMemo(() => {
    const list = controller.filteredProducts || [];
    const nonBannerProducts = featuredBannerProduct
      ? list.filter((p: any) => p.id !== (featuredBannerProduct as any).id)
      : list;

    // 1. Prefer featured product with discount
    const discountedFeatured = nonBannerProducts.find((p: any) => {
      const comp = compareValue(p);
      const pr = priceValue(p);
      return p.isFeatured && comp > pr && pr > 0;
    });
    if (discountedFeatured) return discountedFeatured;

    // 2. Prefer any other featured product
    const anyFeatured = nonBannerProducts.find((p: any) => p.isFeatured);
    if (anyFeatured) return anyFeatured;

    // 3. Prefer product with highest discount
    const sortedByDiscount = [...nonBannerProducts].sort((a, b) => {
      const compA = compareValue(a);
      const prA = priceValue(a);
      const discA = compA > prA && prA > 0 ? (compA - prA) / compA : 0;
      const compB = compareValue(b);
      const prB = priceValue(b);
      const discB = compB > prB && prB > 0 ? (compB - prB) / compB : 0;
      if (discB !== discA) return discB - discA;
      return prB - prA;
    });
    if (sortedByDiscount.length > 0 && compareValue(sortedByDiscount[0]) > priceValue(sortedByDiscount[0])) {
      return sortedByDiscount[0];
    }

    return nonBannerProducts[0] || list[0] || null;
  }, [controller.filteredProducts, featuredBannerProduct]);

  const rawPromoImage = settings?.promoImage || '';
  const hasCustomPromo = rawPromoImage && !isStorefrontDemoImage(rawPromoImage);

  const promoDiscountPercent = useMemo(() => {
    if (!promoProduct) return 0;
    const comp = compareValue(promoProduct);
    const pr = priceValue(promoProduct);
    return comp > pr && pr > 0 ? Math.round(((comp - pr) / comp) * 100) : 0;
  }, [promoProduct]);

  const promo = {
    badge: hasCustomPromo
      ? (settings?.promoBadge || (isRtl ? 'لفترة محدودة' : 'Limited Time'))
      : (promoDiscountPercent > 0
          ? (isRtl ? `وفر ${promoDiscountPercent}% لفترة محدودة` : `Save ${promoDiscountPercent}% Limited Time`)
          : (settings?.promoBadge || (isRtl ? 'عرض خاص' : 'Special Offer'))),
    title: hasCustomPromo
      ? (settings?.promoTitle || (isRtl ? 'خصومات وعروض مميزة' : 'Special Deals & Offers'))
      : (promoProduct?.name || settings?.promoTitle || (isRtl ? 'أقوى العروض الحصرية' : 'Exclusive Deal')),
    text: hasCustomPromo
      ? settings?.promoText
      : (promoProduct
          ? (isRtl
              ? `منتج أصلي مع ضمان معتمد، شحن سريع لكل المحافظات والدفع عند الاستلام. اطلب الآن!`
              : `Original verified product with full warranty, fast shipping and cash on delivery. Order now!`)
          : settings?.promoText),
    image: hasCustomPromo
      ? rawPromoImage
      : (promoProduct ? getPrimaryProductImage(promoProduct) : '') || rawPromoImage,
    link: hasCustomPromo
      ? (settings?.promoLink || '/sale')
      : (promoProduct ? `/product/${(promoProduct as any).slug || (promoProduct as any).id}` : (settings?.promoLink || '/sale')),
  };

  const resolvedArticles = useMemo(() => {
    const rawArticles = (settings?.articles || []).slice(0, 3);
    const hasCustomArticles = rawArticles.some((a) => a.image && !isStorefrontDemoImage(a.image));
    if (hasCustomArticles && rawArticles.length > 0) {
      return rawArticles;
    }

    // Dynamic fallback using merchant's real products that have live uploaded imagery
    const all = controller.filteredProducts || [];
    const validProducts = all.filter((p: any) => {
      const img = getPrimaryProductImage(p);
      return img && !isStorefrontDemoImage(img);
    });

    if (validProducts.length === 0) {
      return rawArticles;
    }

    const articlePresetsAr = [
      {
        titleTemplate: (name: string) => `دليل ومواصفات: ${name}`,
        fallbackTitle: 'دليل اختيار سعة ومواصفات حلة الضغط المناسبة',
        meta: 'أجهزة المطبخ · مواصفات وجودة',
      },
      {
        titleTemplate: (name: string) => `كل ما تحتاج معرفته عن: ${name}`,
        fallbackTitle: 'كيف تختار الدفاية الكهربائية الأكثر كفاءة وأماناً',
        meta: 'تدفئة المنزل · إرشادات الأمان',
      },
      {
        titleTemplate: (name: string) => `نصائح الاستخدام والعناية: ${name}`,
        fallbackTitle: 'نصائح الحفاظ على الأجهزة المنزلية لتدوم طويلاً',
        meta: 'البيت والمطبخ · نصائح وضمان',
      },
    ];

    const articlePresetsEn = [
      {
        titleTemplate: (name: string) => `Buyer's Guide & Specs: ${name}`,
        fallbackTitle: 'How to Choose the Right Pressure Cooker Size & Specs',
        meta: 'Kitchen Appliances · Specifications',
      },
      {
        titleTemplate: (name: string) => `Everything You Need to Know: ${name}`,
        fallbackTitle: 'How to Choose the Most Efficient & Safe Electric Heater',
        meta: 'Home Heating · Safety & Care',
      },
      {
        titleTemplate: (name: string) => `Usage & Longevity Tips: ${name}`,
        fallbackTitle: 'Essential Maintenance Tips for Home & Kitchen Essentials',
        meta: 'Home & Kitchen · Quality & Warranty',
      },
    ];

    const presets = isRtl ? articlePresetsAr : articlePresetsEn;
    const nowMonth = new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });

    const step = Math.max(1, Math.floor(validProducts.length / 3));
    const pickedProducts = [
      validProducts[0],
      validProducts[Math.min(1 * step, validProducts.length - 1)],
      validProducts[Math.min(2 * step, validProducts.length - 1)],
    ];

    return pickedProducts.map((p, idx) => {
      const preset = presets[idx] || presets[0];
      const pName = p?.name ? (p.name.length > 50 ? `${p.name.slice(0, 47)}...` : p.name) : '';
      const catName = (p as any)?.category?.name;
      return {
        title: pName ? preset.titleTemplate(pName) : preset.fallbackTitle,
        date: nowMonth,
        meta: catName ? `${catName} · ${isRtl ? 'دليل الشراء' : "Buyer's Guide"}` : preset.meta,
        image: getPrimaryProductImage(p),
        link: p ? `/product/${(p as any).slug || (p as any).id}` : '/shop',
      };
    });
  }, [settings?.articles, controller.filteredProducts, isRtl]);

  const tabsTitle = settings?.tabsTitle || (isRtl ? 'منتجات مميزة' : 'Featured Products');
  const cartProps = {
    styleOverrides: controller.shopProductCardStyleOverrides,
    quickViewLabel: settings?.['quickViewLabel'] as string,
    addToWishlistLabel: settings?.['addToWishlistLabel'] as string,
  };

  return (
    <section className="w-full bg-white py-6 md:py-8">
      <div className="mx-auto w-full max-w-[1235px] px-4 md:px-6">
        <div className="grid gap-4 lg:grid-cols-[229fr_960fr]">
          {/* narrow rail */}
          <div className="flex flex-col gap-4">
            <a
              href={scoped(banner.link)}
              className="group relative block h-[240px] overflow-hidden rounded-[20px] bg-[#f2efec] lg:h-[610px]"
            >
              {banner.image ? (
                <img
                  src={banner.image}
                  alt={banner.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : null}
              <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05)_40%,rgba(0,0,0,0.55)_100%)]" />
              <span className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-1 p-5 text-start">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85">
                  {banner.eyebrow}
                </span>
                <span className="font-heading text-[20px] font-semibold leading-tight text-white lg:text-[26px]">
                  {banner.title}
                </span>
                <span className="mt-2 inline-flex h-[36px] items-center justify-center rounded-[35px] bg-white px-5 text-[12px] font-semibold text-[#333333] transition-colors hover:bg-[#333333] hover:text-white">
                  {isRtl ? 'تسوّق الآن' : 'Shop Now'}
                </span>
              </span>
            </a>

            {resolvedArticles.length > 0 ? (
              <div className="border-t border-[#e7e7e7] pt-4">
                <h2 className="mb-3 font-heading text-[16px] font-semibold text-[#333333]">
                  {settings?.articlesTitle || (isRtl ? 'أحدث المقالات والنصائح' : 'Latest Guides & Articles')}
                </h2>
                <div className="flex flex-col">
                  {resolvedArticles.map((article, index) => (
                    <a
                      key={`${article.title}-${index}`}
                      href={scoped(article.link || '/shop')}
                      className={`group flex items-start gap-3 py-4 ${index > 0 ? 'border-t border-[#ececec]' : 'pt-0'}`}
                    >
                      <span className="block h-[65px] w-[75px] shrink-0 overflow-hidden bg-[#f4f4f4]">
                        {article.image ? (
                          <img
                            src={article.image}
                            alt={article.title || ''}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-2 block text-[15px] font-semibold leading-[1.45] text-[#333333] group-hover:text-[#e14a5c]">
                          {article.title}
                        </span>
                        {article.date ? (
                          <span className="mt-1 block text-[11px] font-medium text-[#9a9a9a]">{article.date}</span>
                        ) : null}
                        {article.meta ? (
                          <span className="block text-[11px] font-medium text-[#b5b5b5]">{article.meta}</span>
                        ) : null}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            {latestProducts.length > 0 ? (
              <div className="border-t border-[#e7e7e7] pt-4">
                <h2 className="mb-2 font-heading text-[16px] font-semibold text-[#333333]">
                  {settings?.latestTitle || (isRtl ? 'أحدث المنتجات' : 'Latest Products')}
                </h2>
                <div className="flex flex-col gap-1">
                  {latestProducts.map((product, index) => (
                    <ProductCard
                      key={`mini-${product.id}`}
                      product={product}
                      variant="marketplace-row"
                      {...cartProps}
                      imageLoading={controller.resolveGridCardImageLoading(index)}
                      imageFetchPriority={controller.resolveGridCardImageFetchPriority(index)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* wide rail */}
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#e7e7e7] pb-3">
                <h2 className="font-heading text-[18px] font-semibold text-[#333333] md:text-[22px]">{tabsTitle}</h2>
                <div className="flex items-center gap-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-3 py-1 text-[12px] font-semibold transition-colors ${
                        activeTab === tab.key
                          ? 'text-[#e14a5c] underline decoration-2 underline-offset-8'
                          : 'text-[#8a8a8a] hover:text-[#333333]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              {products.length > 0 ? (
                <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
                  {products.slice(0, 10).map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variant="marketplace-tile"
                      {...cartProps}
                      imageLoading={controller.resolveGridCardImageLoading(index)}
                      imageFetchPriority={controller.resolveGridCardImageFetchPriority(index)}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-[#8a8a8a]">
                  {isRtl ? 'لا توجد منتجات متوفرة حالياً.' : 'No products available at the moment.'}
                </p>
              )}
            </div>

            <a
              href={scoped(promo.link)}
              className="group relative flex min-h-[220px] items-center overflow-hidden rounded-[20px] bg-[#1f1f1f] px-6 py-6 text-white lg:min-h-[260px]"
            >
              {promo.image ? (
                <img
                  src={promo.image}
                  alt={promo.title || ''}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-700 group-hover:scale-105"
                />
              ) : null}
              <span className="relative flex flex-col items-start gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
                  {promo.badge}
                </span>
                <span className="font-heading text-[24px] font-semibold leading-tight lg:text-[32px]">
                  {promo.title}
                </span>
                {promo.text ? (
                  <span className="max-w-md text-[12px] leading-6 text-white/75">{promo.text}</span>
                ) : null}
                <span className="mt-2 inline-flex h-[36px] items-center justify-center rounded-[35px] bg-white px-5 text-[12px] font-semibold text-[#333333] transition-colors hover:bg-[#333333] hover:text-white">
                  {isRtl ? 'اشترِ الآن' : 'Buy Now'}
                </span>
              </span>
            </a>

            <div>
              <div className="mb-3 flex items-center justify-between border-b border-[#e7e7e7] pb-3">
                <h2 className="font-heading text-[18px] font-semibold text-[#333333] md:text-[22px]">
                  {settings?.appliancesTitle || (isRtl ? 'أفضل الأجهزة المنزلية' : 'Top Home Appliances')}
                </h2>
                <a href={scoped('/shop')} className="text-[12px] font-semibold text-[#e14a5c] hover:underline">
                  {isRtl ? 'تسوّق المزيد' : 'Shop More'}
                </a>
              </div>
              {applianceProducts.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {applianceProducts.slice(0, 8).map((product, index) => (
                    <ProductCard
                      key={`app-${product.id}`}
                      product={product}
                      variant="marketplace-tile"
                      {...cartProps}
                      imageLoading={controller.resolveGridCardImageLoading(index)}
                      imageFetchPriority={controller.resolveGridCardImageFetchPriority(index)}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-[#8a8a8a]">
                  {isRtl ? 'لا توجد منتجات في هذا القسم حالياً.' : 'No products available in this section.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MarketplaceMagazine;
