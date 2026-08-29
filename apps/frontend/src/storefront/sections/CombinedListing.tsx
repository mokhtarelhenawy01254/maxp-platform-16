import React from 'react';
import { buildResponsiveStorefrontImage } from '../utils/productImages';

interface ListingPart {
  id: string;
  title: string;
  price?: string;
  image?: string;
  link?: string;
}

interface CombinedListingProps {
  section?: { variant?: string; [key: string]: unknown };
  settings?: {
    title?: string;
    subtitle?: string;
    mainImage?: string;
    mainTitle?: string;
    mainPrice?: string;
    mainLink?: string;
    parts?: string; // "title|price|image|link" per line
    [key: string]: unknown;
  };
}

const parseParts = (raw?: string): ListingPart[] => {
  if (!raw) return [];
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      const [title, price, image, link] = line.split('|');
      return {
        id: `part-${idx}`,
        title: title || 'قطعة',
        price: price || '',
        image: image || '',
        link: link || '',
      };
    });
};

const CombinedListing: React.FC<CombinedListingProps> = ({ section, settings }) => {
  const title = settings?.title || 'عرض مدمج';
  const subtitle = settings?.subtitle || 'القطعة الرئيسية مع الأجزاء المكملة في عرض واحد.';
  const mainImage =
    settings?.mainImage ||
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=1600';
  const mainTitle = settings?.mainTitle || 'القطعة الرئيسية';
  const mainPrice = settings?.mainPrice || '';
  const mainLink = settings?.mainLink || '#';
  const parts = parseParts(settings?.parts);
  const variant = section?.variant || 'default';

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-10"
      data-section="combined-listing"
      data-variant={variant}
    >
      {(title || subtitle) && (
        <div className="mb-6 text-center">
          {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
          {subtitle && (
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <a
          href={mainLink}
          className="group relative overflow-hidden rounded-2xl border border-border bg-card"
        >
          <img
            src={buildResponsiveStorefrontImage(mainImage, { widths: [360, 720, 1080] })}
            alt={mainTitle}
            className="aspect-[4/5] h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
            <p className="font-semibold">{mainTitle}</p>
            {mainPrice && <p className="text-sm">{mainPrice}</p>}
          </div>
        </a>
        <div className="grid grid-cols-2 gap-4">
          {parts.length > 0 &&
            parts.map((p) => (
              <a
                key={p.id}
                href={p.link || '#'}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card"
              >
                {p.image && (
                  <img
                    src={buildResponsiveStorefrontImage(p.image, { widths: [200, 400] })}
                    alt={p.title}
                    className="aspect-square w-full object-cover transition group-hover:scale-105"
                    loading="lazy"
                  />
                )}
                <div className="p-2 text-center">
                  <p className="text-xs font-medium">{p.title}</p>
                  {p.price && (
                    <p className="text-xs text-muted-foreground">{p.price}</p>
                  )}
                </div>
              </a>
            ))}
        </div>
      </div>
    </section>
  );
};

export default CombinedListing;
