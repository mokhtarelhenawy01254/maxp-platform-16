import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildStorefrontPath } from '../utils/paths';
import { buildResponsiveStorefrontImage } from '../utils/productImages';

interface FeaturedProductProps {
  section?: { variant?: string };
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    image?: string;
    gallery?: string[] | string;
    price?: string;
    comparePrice?: string;
    ctaText?: string;
    ctaLink?: string;
    description?: string;
  };
}

const FEATURED_VARIANTS = new Set(['standard', 'split', 'spotlight']);

const normalizeVariant = (value: unknown): string => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  return FEATURED_VARIANTS.has(normalizedValue) ? normalizedValue : 'standard';
};

const parseGallery = (value: FeaturedProductProps['settings'] extends undefined ? never : unknown): string[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
};

const isExternalHref = (href: string) => /^(https?:\/\/|mailto:|tel:)/i.test(href);

const FeaturedProduct: React.FC<FeaturedProductProps> = ({ section, settings }) => {
  const location = useLocation();
  const variant = normalizeVariant(section?.variant);
  const badge = settings?.badge || 'Featured Piece';
  const title = settings?.title || 'Classic White Belted Shirt Dress';
  const subtitle = settings?.subtitle || 'Women in Style';
  const description =
    settings?.description ||
    'Crafted with care and attention to detail — a refined piece designed to move from everyday looks to special occasions.';
  const image = settings?.image || 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/white-pinstripe-blazer-dress.png?v=1787655842&width=800';
  const gallery = parseGallery(settings?.gallery);
  const price = settings?.price || '$491.00';
  const comparePrice = settings?.comparePrice || '';
  const ctaText = settings?.ctaText || 'Add to Bag';
  const ctaLink = settings?.ctaLink || '/shop';

  const ctaResolved = buildStorefrontPath(
    location.pathname,
    ctaLink.startsWith('/') ? ctaLink : `/${ctaLink}`,
    location.search,
  );

  const responsive = buildResponsiveStorefrontImage(image, {
    widths: [480, 800, 1200],
    fallbackWidth: 800,
    sizes: '(min-width: 768px) 46vw, 90vw',
  });

  const renderGallery = () => {
    if (gallery.length === 0) {
      return null;
    }
    return (
      <div className="flex gap-3">
        {gallery.map((src) => (
          <div key={src} className="h-16 w-16 overflow-hidden rounded-lg border border-black/5">
            <img src={buildResponsiveStorefrontImage(src, { widths: [120], fallbackWidth: 120, sizes: '64px' }).src} alt="" loading="lazy" className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
    );
  };

  return (
    <section className="w-full bg-white py-14 md:py-20">
      <div className="container mx-auto max-w-[176rem] px-5 md:px-10">
        <div className={`grid items-center gap-10 ${variant === 'spotlight' ? 'md:grid-cols-2' : 'md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]'}`}>
          <div className="relative overflow-hidden rounded-[15px]">
            <img
              src={responsive.src}
              srcSet={responsive.srcSet}
              sizes={responsive.sizes}
              alt={title}
              loading="lazy"
              className="aspect-[4/5] w-full object-cover"
            />
            <span className="absolute left-4 top-4 rounded-md bg-[#e16244] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
              {badge}
            </span>
          </div>

          <div className="space-y-5">
            <span className="inline-block border-b border-[#e16244] pb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#e16244]">
              {subtitle}
            </span>
            <h2 className="font-heading text-[2.2rem] font-semibold leading-tight text-[#171717] md:text-[3rem]">
              {title}
            </h2>
            <p className="max-w-md text-base leading-7 text-[#575757] md:text-lg">{description}</p>

            <div className="flex items-baseline gap-3">
              <span className="font-heading text-2xl font-semibold text-[#171717]">{price}</span>
              {comparePrice && <span className="text-lg text-[#8a8a8a] line-through">{comparePrice}</span>}
            </div>

            {renderGallery()}

            <div className="flex flex-col items-start gap-4">
              <Link
                to={isExternalHref(ctaLink) ? ctaLink : ctaResolved}
                className="inline-flex rounded-lg bg-[#171717] px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#e16244]"
              >
                {ctaText}
              </Link>
              <Link
                to={isExternalHref(ctaLink) ? ctaLink : ctaResolved}
                className="inline-flex rounded-lg border border-[#171717] px-7 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#171717] transition-colors hover:bg-[#171717] hover:text-white"
              >
                View Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProduct;
