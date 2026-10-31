import React, { useEffect, useState } from "react";

export interface CarouselImageItem {
  url: string;
  mobileUrl?: string;
  caption?: string;
  linkUrl?: string;
}

export interface LandingCarouselProps {
  images: CarouselImageItem[];
  autoplay?: boolean;
  interval?: number;
}

export const LandingCarousel: React.FC<LandingCarouselProps> = ({
  images,
  autoplay = true,
  interval = 3,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!autoplay || images.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, Math.max(1500, interval * 1000));
    return () => clearInterval(timer);
  }, [autoplay, interval, images.length]);

  const current = images[activeIndex] || images[0];
  if (!current) return null;

  const slideImg = (
    <picture>
      {current.mobileUrl && (
        <source media="(max-width: 640px)" srcSet={current.mobileUrl} />
      )}
      <img
        src={current.url}
        alt={current.caption || `شريحة ${activeIndex + 1}`}
        className="pil-carousel-img"
      />
    </picture>
  );

  return (
    <div className="pil-carousel-container" dir="rtl">
      <div className="pil-carousel-stage">
        {current.linkUrl ? (
          <a href={current.linkUrl} style={{ display: "block" }}>
            {slideImg}
          </a>
        ) : (
          slideImg
        )}
        {current.caption && (
          <div className="pil-carousel-caption">
            <span>{current.caption}</span>
          </div>
        )}
        {images.length > 1 && (
          <>
            <button
              type="button"
              className="pil-carousel-arrow pil-carousel-prev"
              onClick={() => setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
              aria-label="السابق"
            >
              ›
            </button>
            <button
              type="button"
              className="pil-carousel-arrow pil-carousel-next"
              onClick={() => setActiveIndex((prev) => (prev + 1) % images.length)}
              aria-label="التالي"
            >
              ‹
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="pil-carousel-dots">
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`pil-carousel-dot ${idx === activeIndex ? "is-active" : ""}`}
              onClick={() => setActiveIndex(idx)}
              aria-label={`انتقال للشريحة ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LandingCarousel;
