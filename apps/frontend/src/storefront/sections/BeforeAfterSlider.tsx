import React, { useState } from 'react';
import { buildResponsiveStorefrontImage } from '../utils/productImages';

interface BeforeAfterSliderProps {
  section?: { variant?: string; [key: string]: unknown };
  settings?: {
    title?: string;
    subtitle?: string;
    beforeImage?: string;
    afterImage?: string;
    beforeLabel?: string;
    afterLabel?: string;
    [key: string]: unknown;
  };
}

const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({ section, settings }) => {
  const [pos, setPos] = useState(50);
  const title = settings?.title || 'قبل وبعد';
  const subtitle = settings?.subtitle || 'اسحبي المقبض لمقارنة التفاصيل.';
  const beforeImage =
    settings?.beforeImage ||
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=1600';
  const afterImage =
    settings?.afterImage ||
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=1600';
  const beforeLabel = settings?.beforeLabel || 'قبل';
  const afterLabel = settings?.afterLabel || 'بعد';
  const variant = section?.variant || 'default';

  return (
    <section
      className="mx-auto w-full max-w-4xl px-4 py-10"
      data-section="before-after"
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
      <div className="relative aspect-[16/10] w-full select-none overflow-hidden rounded-2xl border border-border bg-card">
        <img
          src={buildResponsiveStorefrontImage(afterImage, { widths: [360, 720, 1080, 1600] })}
          alt={afterLabel}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
          loading="lazy"
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${pos}%` }}
        >
          <img
            src={buildResponsiveStorefrontImage(beforeImage, { widths: [360, 720, 1080, 1600] })}
            alt={beforeLabel}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ width: '100vw', maxWidth: 'none' }}
            draggable={false}
            loading="lazy"
          />
        </div>
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
          {beforeLabel}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
          {afterLabel}
        </span>
        <div
          className="absolute inset-y-0 z-10 w-1 cursor-ew-resize bg-white shadow"
          style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sm font-bold text-black shadow-lg">
            ⇄
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
          aria-label="مقبض المقارنة"
        />
      </div>
    </section>
  );
};

export default BeforeAfterSlider;
