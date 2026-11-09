import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeroSlide, HeroVariantProps } from './heroTypes';
import { renderHeroAction } from './heroActions';

const pad = (value: number) => String(Math.max(0, value)).padStart(2, '0');

const useCountdown = (target?: string) => {
  const targetTime = useMemo(() => {
    const parsed = target ? Date.parse(target) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : Date.now() + 1000 * 60 * 60 * 49;
  }, [target]);
  const [remaining, setRemaining] = useState(() => Math.max(0, targetTime - Date.now()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining(Math.max(0, targetTime - Date.now()));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [targetTime]);

  const totalSeconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
};

const CountdownRow: React.FC<{ target?: string }> = ({ target }) => {
  const { days, hours, minutes, seconds } = useCountdown(target);
  const cells = [
    { value: pad(days), label: 'يوم' },
    { value: pad(hours), label: 'ساعة' },
    { value: pad(minutes), label: 'دقيقة' },
    { value: pad(seconds), label: 'ثانية' },
  ];

  return (
    <div className="flex items-center gap-2" dir="rtl">
      {cells.map((cell) => (
        <span
          key={cell.label}
          className="flex h-[46px] min-w-[46px] flex-col items-center justify-center bg-white/95 px-2 text-[#333333]"
        >
          <span className="text-[15px] font-bold leading-none tabular-nums">{cell.value}</span>
          <span className="mt-1 text-[9px] font-semibold uppercase leading-none tracking-[0.12em] text-[#9a9a9a]">
            {cell.label}
          </span>
        </span>
      ))}
    </div>
  );
};

const ratingStars = (rating?: string) => {
  const numeric = Number.parseFloat(String(rating || '').replace(',', '.'));
  const safe = Number.isFinite(numeric) ? Math.max(0, Math.min(5, numeric)) : 0;
  return Array.from({ length: 5 }).map((_, index) => (
    <span
      key={index}
      className={`text-[11px] leading-none ${index < Math.round(safe) ? 'text-[#ad7d61]' : 'text-[#d8d8d8]'}`}
    >
      ★
    </span>
  ));
};

export const MarketplaceSliderHero: React.FC<HeroVariantProps> = (props) => {
  const slides: HeroSlide[] = (props.slides || []).filter(
    (slide) => slide && (slide.image || slide.title),
  );
  const resolvedSlides: HeroSlide[] = slides.length
    ? slides
    : [{ image: props.backgroundImage, title: props.title, subtitle: props.subtitle, eyebrow: props.eyebrow }];

  const [active, setActive] = useState(0);
  const total = resolvedSlides.length;

  useEffect(() => {
    if (total < 2) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % total);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [total]);

  const goTo = (index: number) => setActive(((index % total) + total) % total);
  const offer = props.offerCard;
  const minis = props.miniCategories;
  const miniItems = (minis?.items || []).slice(0, 8);
  const best = props.bestPicks;
  const bestItems = (best?.items || []).slice(0, 4);

  const currentSlide = resolvedSlides[active] || {};
  const slideCta = currentSlide.ctaText || props.ctaText;
  const slideHref = currentSlide.ctaLink || props.primaryHref;

  return (
    <section className="w-full bg-[#f6f5f8] pb-2 pt-4 md:pt-6">
      <div className="mx-auto w-full max-w-[1235px] px-4 md:px-6">
        <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_1.51fr]">
          <div className="relative h-[380px] overflow-hidden rounded-[20px] bg-[#f6f4f1] sm:h-[460px] lg:h-[575px]">
            {resolvedSlides.map((slide, index) => (
              <div
                key={`${slide.title || 'slide'}-${index}`}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  index === active ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
              >
                {slide.image ? (
                  <img
                    src={slide.image}
                    alt={slide.alt || slide.title || ''}
                    className="h-full w-full object-cover"
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                ) : null}
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.34),rgba(255,255,255,0)_62%)]" />
                <div className="absolute inset-x-0 top-0 flex flex-col items-start gap-3 p-5 text-start sm:p-8 lg:p-10">
                  {slide.eyebrow ? (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5f5f5f] sm:text-[12px]">
                      {slide.eyebrow}
                    </span>
                  ) : null}
                  {slide.title ? (
                    <h2 className="max-w-[22rem] font-heading text-[28px] font-bold leading-[1.15] text-[#ad7d61] sm:text-[34px] lg:text-[36px]">
                      {slide.title}
                    </h2>
                  ) : null}
                  {slide.subtitle ? (
                    <p className="max-w-[24rem] text-[13px] leading-6 text-[#4a4a4a]">{slide.subtitle}</p>
                  ) : null}
                  {slide.countdownEndAt ? <CountdownRow target={slide.countdownEndAt} /> : null}
                  {slideCta && index === active
                    ? renderHeroAction(
                        slideHref,
                        slideCta,
                        'inline-flex h-[42px] items-center justify-center rounded-[35px] bg-white px-5 text-[13px] font-semibold capitalize text-[#333333] shadow-[0_10px_30px_-18px_rgba(0,0,0,0.5)] transition-colors hover:bg-[#333333] hover:text-white',
                      )
                    : null}
                </div>
              </div>
            ))}

            {total > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="الشريحة السابقة"
                  onClick={() => goTo(active - 1)}
                  className="absolute end-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[15px] text-[#333333] transition-colors hover:bg-white lg:flex"
                >
                  ›
                </button>
                <button
                  type="button"
                  aria-label="الشريحة التالية"
                  onClick={() => goTo(active + 1)}
                  className="absolute start-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[15px] text-[#333333] transition-colors hover:bg-white lg:flex"
                >
                  ‹
                </button>
                <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-2">
                  {resolvedSlides.map((slide, index) => (
                    <button
                      key={`dot-${index}`}
                      type="button"
                      aria-label={slide.title || `شريحة ${index + 1}`}
                      onClick={() => goTo(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === active ? 'w-6 bg-[#ad7d61]' : 'w-2 bg-[#333333]/30 hover:bg-[#333333]/60'
                      }`}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_1.52fr]">
              {offer ? (
                <Link
                  to={offer.link || props.primaryHref || '/shop'}
                  className="group relative block h-[260px] overflow-hidden rounded-[20px] bg-[#efefef] sm:h-[280px] lg:h-[392px]"
                >
                  {offer.image ? (
                    <img
                      src={offer.image}
                      alt={offer.title || ''}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_35%,rgba(0,0,0,0.42)_100%)]" />
                  <div className="absolute inset-x-0 top-0 flex flex-col items-start gap-1 p-6 text-start lg:p-7">
                    {offer.eyebrow ? (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white drop-shadow">
                        {offer.eyebrow}
                      </span>
                    ) : null}
                    {offer.title ? (
                      <span className="max-w-[12rem] font-heading text-[24px] font-semibold leading-tight text-white drop-shadow lg:text-[28px]">
                        {offer.title}
                      </span>
                    ) : null}
                    {offer.price ? (
                      <span className="mt-2 inline-flex items-center gap-1 text-[15px] font-bold text-white drop-shadow">
                        {offer.price}
                        {offer.note ? (
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/85">
                            {offer.note}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                </Link>
              ) : null}

              <div className="bg-[#f6f5f8] px-3 py-4 sm:px-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="font-heading text-[18px] font-semibold text-[#333333] lg:text-[24px]">
                    {minis?.title || 'الأقسام الأكثر طلبًا'}
                  </h2>
                  {minis?.link ? (
                    <Link to={minis.link} className="text-[12px] font-semibold text-[#ad7d61] hover:underline">
                      كل الأقسام
                    </Link>
                  ) : null}
                </div>

                <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                  {miniItems.map((item) => (
                    <Link key={item.label} to={item.link || '/collections'} className="group flex flex-col items-center gap-2 text-center">
                      <span className="block h-[68px] w-[68px] overflow-hidden bg-[#f5f5f5] lg:h-[94px] lg:w-[94px]">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.label}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : null}
                      </span>
                      <span className="text-[12px] font-semibold text-[#333333] group-hover:text-[#ad7d61] lg:text-[15px]">
                        {item.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[20px] bg-white px-5 py-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="font-heading text-[16px] font-semibold text-[#333333] lg:text-[18px]">
                  {best?.title || 'أفضل اختيارات الأسبوع'}
                </h2>
                {best?.link ? (
                  <Link
                    to={best.link}
                    className="text-[12px] font-semibold text-[#ad7d61] underline-offset-4 hover:underline"
                  >
                    {best.linkLabel || 'تسوّق المزيد'}
                  </Link>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {bestItems.map((item) => (
                  <Link key={item.title} to={item.link || '/shop'} className="group flex items-center gap-3 bg-white p-2">
                    <span className="block h-[66px] w-[60px] shrink-0 overflow-hidden bg-[#f4f4f4]">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : null}
                    </span>
                    <span className="flex min-w-0 flex-col gap-1 text-start">
                      <span className="truncate text-[13px] font-semibold text-[#333333] group-hover:text-[#ad7d61]">
                        {item.title}
                      </span>
                      {item.rating ? <span className="flex items-center gap-[1px]">{ratingStars(item.rating)}</span> : null}
                      <span className="flex items-center gap-2 text-[13px] font-semibold">
                        {item.comparePrice ? (
                          <span className="text-[#a3a3a3] line-through">{item.comparePrice}</span>
                        ) : null}
                        <span className="text-[#e14a5c]">{item.price}</span>
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MarketplaceSliderHero;
