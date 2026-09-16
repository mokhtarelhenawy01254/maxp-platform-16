import React, { useState } from 'react';
import { buildResponsiveStorefrontImage } from '../utils/productImages';

interface BeforeAfterSliderProps {
  section?: { variant?: string; [key: string]: unknown };
  settings?: {
    badge?: string;
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
  const [isDragging, setIsDragging] = useState(false);
  const stageRef = React.useRef<HTMLDivElement | null>(null);

  const updatePosition = (clientX: number) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const offsetX = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
    setPos(Math.round(pct));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const badge = settings?.badge;
  const title = settings?.title || 'قبل وبعد';
  const subtitle = settings?.subtitle || 'اسحب المقبض لمقارنة التفاصيل والتحول.';
  const beforeImage =
    settings?.beforeImage ||
    'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=80&w=1600';
  const afterImage =
    settings?.afterImage ||
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1600';
  const beforeLabel = settings?.beforeLabel || 'قبل التطوير';
  const afterLabel = settings?.afterLabel || 'بعد الإطلاق';
  const variant = section?.variant || 'default';

  const beforeImg = buildResponsiveStorefrontImage(beforeImage, { widths: [360, 720, 1080, 1600] });
  const afterImg = buildResponsiveStorefrontImage(afterImage, { widths: [360, 720, 1080, 1600] });
  const beforeSrc = beforeImage.startsWith('http') ? beforeImage : beforeImg.src;
  const afterSrc = afterImage.startsWith('http') ? afterImage : afterImg.src;

  return (
    <section
      className="mx-auto w-full max-w-5xl px-4 py-12 md:py-20"
      data-section="before-after"
      data-variant={variant}
    >
      {(badge || title || subtitle) && (
        <div className="mb-8 text-center space-y-2">
          {badge && (
            <span className="inline-flex rounded-full border border-border bg-background/80 px-3.5 py-1 text-xs font-black uppercase tracking-[0.18em] text-primary backdrop-blur">
              {badge}
            </span>
          )}
          {title && <h2 className="text-2xl md:text-3xl font-heading font-black tracking-tight text-foreground">{title}</h2>}
          {subtitle && (
            <p className="mx-auto max-w-2xl text-sm md:text-base text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}
      <div
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ direction: 'ltr', touchAction: 'none' }}
        className="relative aspect-[16/10] w-full select-none overflow-hidden rounded-2xl border border-border bg-card shadow-2xl cursor-ew-resize"
      >
        {/* Background Image (After) */}
        <img
          src={afterSrc}
          alt={afterLabel}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
          loading="eager"
        />

        {/* Clipped Top Image (Before) */}
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          draggable={false}
          loading="eager"
        />

        {/* Labels */}
        <span className="absolute left-4 top-4 z-10 rounded-full bg-black/75 px-3.5 py-1 text-xs font-bold text-white shadow backdrop-blur-sm" style={{ direction: 'rtl' }}>
          {beforeLabel}
        </span>
        <span className="absolute right-4 top-4 z-10 rounded-full bg-primary/90 px-3.5 py-1 text-xs font-bold text-primary-foreground shadow backdrop-blur-sm" style={{ direction: 'rtl' }}>
          {afterLabel}
        </span>

        {/* Divider Handle */}
        <div
          className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.8)]"
          style={{ left: `${pos}%` }}
        >
          <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xs font-bold text-black shadow-2xl ring-4 ring-black/20">
            <span className="select-none">⇄</span>
          </div>
        </div>

        {/* Range Slider for Accessible Interaction */}
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          className="absolute inset-0 z-10 h-full w-full opacity-0 pointer-events-none"
          style={{ direction: 'ltr' }}
          aria-label="مقبض المقارنة"
        />
      </div>
    </section>
  );
};

export default BeforeAfterSlider;
