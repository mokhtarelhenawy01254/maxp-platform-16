import React, { useRef } from "react";

export interface PureMediaStageProps {
  images: string[];
  activeIndex: number;
  onIndexChange: (idx: number) => void;
  productName: string;
}

export const PureMediaStage: React.FC<PureMediaStageProps> = ({
  images,
  activeIndex,
  onIndexChange,
  productName,
}) => {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const mouseStartX = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);

  const total = images.length;
  const currentImg = images[activeIndex] || images[0];

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (total <= 1) return;
    onIndexChange((activeIndex - 1 + total) % total);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (total <= 1) return;
    onIndexChange((activeIndex + 1) % total);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? null;
    const endY = e.changedTouches[0]?.clientY ?? null;
    if (endX === null) return;

    const diffX = touchStartX.current - endX;
    const diffY =
      touchStartY.current !== null && endY !== null
        ? Math.abs(touchStartY.current - endY)
        : 0;

    // Dominant horizontal swipe (> 35px and more horizontal than vertical)
    if (Math.abs(diffX) > 35 && Math.abs(diffX) > diffY) {
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const onMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    isDragging.current = true;
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current || mouseStartX.current === null) return;
    const diffX = mouseStartX.current - e.clientX;
    if (Math.abs(diffX) > 40) {
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    mouseStartX.current = null;
    isDragging.current = false;
  };

  return (
    <div
      className="pil-pure-media-stage"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      role="region"
      aria-label="معرض صور المنتج القابل للتمرير"
    >
      {currentImg ? (
        <img
          src={currentImg}
          alt={productName}
          loading="eager"
          className="pil-pure-media-img"
          draggable={false}
        />
      ) : null}

      {total > 1 && (
        <>
          <div className="pil-pure-media-counter" aria-hidden="true">
            {activeIndex + 1} / {total}
          </div>

          <button
            type="button"
            className="pil-pure-media-nav-btn pil-pure-media-nav-prev"
            onClick={handlePrev}
            aria-label="الصورة السابقة"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            type="button"
            className="pil-pure-media-nav-btn pil-pure-media-nav-next"
            onClick={handleNext}
            aria-label="الصورة التالية"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
};

export default PureMediaStage;
