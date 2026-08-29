import React, { useState } from 'react';
import { buildResponsiveStorefrontImage } from '../utils/productImages';

interface Hotspot {
  id: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  label: string;
  text?: string;
  link?: string;
}

interface ImageHotspotProps {
  section?: { variant?: string; [key: string]: unknown };
  settings?: {
    title?: string;
    subtitle?: string;
    image?: string;
    imageAlt?: string;
    hotspots?: string; // "x|y|label|text|link" per line
    [key: string]: unknown;
  };
}

const parseHotspots = (raw?: string): Hotspot[] => {
  if (!raw) return [];
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      const parts = line.split('|');
      const x = parseFloat(parts[0] || '50');
      const y = parseFloat(parts[1] || '50');
      return {
        id: `hs-${idx}`,
        x: Number.isFinite(x) ? x : 50,
        y: Number.isFinite(y) ? y : 50,
        label: parts[2] || 'تفاصيل',
        text: parts[3] || '',
        link: parts[4] || '',
      };
    });
};

const ImageHotspot: React.FC<ImageHotspotProps> = ({ section, settings }) => {
  const [active, setActive] = useState<string | null>(null);
  const title = settings?.title || 'استكشفي التفاصيل';
  const subtitle = settings?.subtitle || 'مرري فوق النقاط لاكتشاف خامات وتفاصيل القطعة.';
  const image =
    settings?.image ||
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1600';
  const imageAlt = settings?.imageAlt || title;
  const hotspots = parseHotspots(settings?.hotspots);
  const variant = section?.variant || 'default';

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-10"
      data-section="image-hotspot"
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
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <img
          src={buildResponsiveStorefrontImage(image, { widths: [360, 720, 1080, 1600] })}
          alt={imageAlt}
          className="block h-full w-full object-cover"
          loading="lazy"
        />
        {hotspots.map((hs) => (
          <div
            key={hs.id}
            className="absolute"
            style={{ left: `${hs.x}%`, top: `${hs.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            <button
              type="button"
              aria-label={hs.label}
              onClick={() => setActive(active === hs.id ? null : hs.id)}
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-black/70 text-xs font-bold text-white shadow-lg transition hover:scale-110"
            >
              +
            </button>
            {active === hs.id && (hs.text || hs.link) && (
              <div className="absolute left-1/2 top-8 z-10 w-48 -translate-x-1/2 rounded-xl border border-border bg-card p-3 text-center text-xs shadow-xl">
                <p className="font-semibold">{hs.label}</p>
                {hs.text && <p className="mt-1 text-muted-foreground">{hs.text}</p>}
                {hs.link && (
                  <a
                    href={hs.link}
                    className="mt-2 inline-block text-accent underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    شاهدي المزيد
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default ImageHotspot;
