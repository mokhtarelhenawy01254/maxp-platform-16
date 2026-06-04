import React from "react";
import type { ReviewMediaItem } from "../hooks/useProductReviews";
import { useStorefrontTheme } from "../engine/ThemeProvider";

interface ReviewMediaGalleryProps {
  media: ReviewMediaItem[];
  galleryStyle?: string;
  className?: string;
}

const ReviewMediaGallery: React.FC<ReviewMediaGalleryProps> = ({
  media,
  galleryStyle = "mosaic",
  className = "",
}) => {
  const { theme } = useStorefrontTheme();
  const prefersArabicCopy = theme.direction === "rtl";
  const items = media.filter((item) => item?.url);

  if (items.length === 0) {
    return null;
  }

  const wrapperClassName =
    galleryStyle === "carousel"
      ? "flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
      : galleryStyle === "stack"
        ? "grid gap-3 sm:grid-cols-2"
        : "grid auto-rows-[118px] gap-3 sm:grid-cols-3";

  return (
    <div className={`${wrapperClassName} ${className}`.trim()}>
      {items.map((item, index) => {
        const cardClassName =
          galleryStyle === "carousel"
            ? "relative min-w-[148px] max-w-[188px] overflow-hidden rounded-2xl border border-border bg-card snap-start"
            : galleryStyle === "stack"
              ? "relative overflow-hidden rounded-2xl border border-border bg-card"
              : index === 0 && items.length > 1
                ? "relative overflow-hidden rounded-2xl border border-border bg-card sm:col-span-2 sm:row-span-2"
                : "relative overflow-hidden rounded-2xl border border-border bg-card";

        return (
          <div key={`${item.url}-${index}`} className={cardClassName}>
            {item.type === "video" ? (
              <video
                className="h-full w-full object-cover"
                controls
                preload="none"
                playsInline
                poster={item.poster || undefined}
              >
                <source src={item.url} />
              </video>
            ) : (
              <img
                src={item.url}
                alt={item.alt || (prefersArabicCopy ? "وسائط من مراجعات العملاء" : "Customer review media")}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            )}
            <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
              {item.type === "video"
                ? (prefersArabicCopy ? "فيديو" : "Video")
                : (prefersArabicCopy ? "صورة" : "Photo")}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default ReviewMediaGallery;
