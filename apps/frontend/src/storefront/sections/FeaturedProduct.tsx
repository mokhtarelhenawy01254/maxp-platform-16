import React, { useState } from 'react';
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
    colors?: string[] | string;
    sizes?: string[] | string;
    payments?: string[] | string;
    taxesNote?: string;
  };
}

const FEATURED_VARIANTS = new Set(['standard', 'split', 'spotlight']);

const normalizeVariant = (value: unknown): string => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  return FEATURED_VARIANTS.has(normalizedValue) ? normalizedValue : 'standard';
};

const parseList = (value: string[] | string | undefined): string[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return [];
  }
  if (value.includes('\n')) {
    return value
      .split('\n')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
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

const SWATCH_COLOR_MAP: Record<string, string> = {
  white: '#ffffff', black: '#111111', blue: '#2b2ba0', gray: '#8a8a8a', grey: '#8a8a8a',
  beige: '#d6c6b2', navy: '#24303e', cream: '#f2ebdf', pink: '#e7a9b8', red: '#b02a33',
  green: '#2e5b42', brown: '#6b4a35', yellow: '#d9a33b', purple: '#6b3fa0',
};

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
  const taxesNote = settings?.taxesNote ?? 'Taxes included. Shipping calculated at checkout.';

  const colorEntries = parseList(settings?.colors).map((entry) => {
    const [name = '', hex = ''] = entry.split('|').map((part) => part.trim());
    return { name, hex: hex || SWATCH_COLOR_MAP[name.toLowerCase()] || '#cccccc' };
  });
  const sizes = parseList(settings?.sizes);
  const payments = parseList(settings?.payments);

  const [activeColor, setActiveColor] = useState(0);
  const [activeSize, setActiveSize] = useState(0);
  const [quantity, setQuantity] = useState(1);

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
        <div className={`items-center gap-10 ${variant === 'spotlight' ? 'md:grid md:grid-cols-2' : 'md:grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]'}`}>
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

          <div className="mt-8 rounded-[18px] border border-black/[0.05] bg-[#fafafa] p-6 md:mt-0 md:p-9">
            <span className="inline-block border-b border-[#e16244] pb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#e16244]">
              {subtitle}
            </span>
            <h2 className="mt-4 font-heading text-[1.9rem] font-semibold leading-tight text-[#171717] md:text-[2.6rem]">
              {title}
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-[#575757] md:text-base">{description}</p>

            <div className="mt-5 flex items-baseline gap-3">
              <span className="font-heading text-2xl font-semibold text-[#171717]">{price}</span>
              {comparePrice && <span className="text-lg text-[#8a8a8a] line-through">{comparePrice}</span>}
            </div>
            {taxesNote ? (
              <p className="mt-1.5 text-xs text-[#8a8a8a]">{taxesNote}</p>
            ) : null}

            {colorEntries.length > 0 ? (
              <div className="mt-6">
                <p className="text-sm font-semibold text-[#171717]">
                  Color: <span className="font-normal text-[#575757]">{colorEntries[Math.min(activeColor, colorEntries.length - 1)]?.name}</span>
                </p>
                <div className="mt-2.5 flex items-center gap-2.5">
                  {colorEntries.map((color, index) => (
                    <button
                      key={`${color.name}-${index}`}
                      type="button"
                      aria-label={color.name}
                      title={color.name}
                      onClick={() => setActiveColor(index)}
                      className={`h-8 w-8 rounded-md border transition-all duration-200 ${
                        index === activeColor
                          ? 'border-[#171717] shadow-[0_0_0_2px_#fff_inset,0_0_0_1.5px_#171717]'
                          : 'border-black/15 hover:border-black/40'
                      }`}
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {sizes.length > 0 ? (
              <div className="mt-5">
                <p className="text-sm font-semibold text-[#171717]">
                  Size: <span className="font-normal text-[#575757]">{sizes[Math.min(activeSize, sizes.length - 1)] ?? ''}</span>
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {sizes.map((size, index) => (
                    <button
                      key={`${size}-${index}`}
                      type="button"
                      onClick={() => setActiveSize(index)}
                      className={`min-w-[52px] rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                        index === activeSize
                          ? 'border-[#e16244] bg-[#e16244] text-white'
                          : 'border-black/10 bg-white text-[#171717] hover:border-[#171717]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6">
              <p className="text-sm font-semibold text-[#171717]">Quantity:</p>
              <div className="mt-2.5 inline-flex items-center rounded-lg border border-black/10 bg-white">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  className="px-4 py-2.5 text-lg text-[#575757] transition-colors hover:text-[#171717]"
                >
                  −
                </button>
                <span className="min-w-[56px] text-center text-sm font-semibold text-[#171717]">{quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((prev) => Math.min(99, prev + 1))}
                  className="px-4 py-2.5 text-lg text-[#575757] transition-colors hover:text-[#171717]"
                >
                  +
                </button>
              </div>
            </div>

            {renderGallery()}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to={isExternalHref(ctaLink) ? ctaLink : ctaResolved}
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-[#171717] px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-black"
              >
                {ctaText}
              </Link>
              <Link
                to={isExternalHref(ctaLink) ? ctaLink : ctaResolved}
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-[#1e9de7] px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#0f8ad2]"
              >
                Buy It Now
              </Link>
            </div>

            {payments.length > 0 ? (
              <div className="mt-6">
                <p className="text-sm font-semibold text-[#171717]">Payments Methods:</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {payments.map((label) => (
                    <span
                      key={label}
                      className="inline-flex h-7 min-w-[46px] items-center justify-center rounded-[5px] border border-black/[0.08] bg-white px-2 text-[9px] font-black uppercase italic tracking-tight text-[#1a1a6e]"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProduct;
